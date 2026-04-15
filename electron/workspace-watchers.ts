/**
 * Workspace file-system watching logic extracted from main.ts.
 * Handles native (chokidar) and polling-based file watchers,
 * event debouncing, and fallback transitions.
 */

import type { BrowserWindow } from 'electron'
import chokidar, { type FSWatcher } from 'chokidar'
import { readdir, stat } from 'node:fs/promises'
import type { IpcMainInvokeEvent } from 'electron'
import path from 'node:path'
import {
  resolveWorkspaceWatchMode,
  type WorkspaceWatchMode,
} from './workspace-watch-mode'
import {
  isPathInsideWorkspace,
} from './workspace-path'
import type {
  WorkspaceHistoryNavigationEventPayload,
  WorkspaceWatchControlResult,
  WorkspaceWatchEventPayload,
  WorkspaceWatchFallbackEvent,
  WorkspaceWatchStartRequest,
  WorkspaceWatchStopRequest,
} from './ipc-types'
import {
  MAX_WORKSPACE_POLL_FILES,
  normalizeToWorkspaceRelativePath,
  shouldIgnoreWatchPath,
  WATCH_EVENT_DEBOUNCE_MS,
  WATCHABLE_FILE_EVENTS,
  WATCHABLE_STRUCTURE_EVENTS,
  WORKSPACE_INDEX_DIRECTORY_CHILD_CAP,
  WORKSPACE_WATCH_POLL_INTERVAL_MS,
} from './workspace-utils'

// ---------------------------------------------------------------------------
// BrowserWindow injection (same pattern as workspace-ipc-handlers)
// ---------------------------------------------------------------------------

let _getWin: (() => BrowserWindow | null) = () => null

export function initWatchersWin(getWin: () => BrowserWindow | null): void {
  _getWin = getWin
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkspaceWatcherEntry = {
  workspaceId: string
  rootPath: string
  watchMode: WorkspaceWatchMode
  pendingRelativePaths: Set<string>
  hasPendingStructureChanges: boolean
  debounceTimer: ReturnType<typeof setTimeout> | null
} & (
  | {
      watchMode: 'native'
      watcher: FSWatcher
    }
  | {
      watchMode: 'polling'
      pollTimer: ReturnType<typeof setTimeout> | null
      pollIntervalMs: number
      fileMetadataByRelativePath: Map<string, string>
      directoryPaths: Set<string>
      pollingInProgress: boolean
    }
)

type WorkspacePollingSnapshot = {
  fileMetadataByRelativePath: Map<string, string>
  directoryPaths: Set<string>
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const workspaceWatchers = new Map<string, WorkspaceWatcherEntry>()
const workspacesInFallbackTransition = new Set<string>()
let stopAllWorkspaceWatchersPromise: Promise<void> | null = null

// ---------------------------------------------------------------------------
// Event senders
// ---------------------------------------------------------------------------

export function sendWorkspaceWatchEvent(payload: WorkspaceWatchEventPayload) {
  const win = _getWin()
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:watchEvent', payload)
}

export function sendWorkspaceWatchFallbackEvent(payload: WorkspaceWatchFallbackEvent) {
  const win = _getWin()
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:watchFallback', payload)
}

export function sendWorkspaceHistoryNavigationEvent(
  payload: WorkspaceHistoryNavigationEventPayload,
) {
  const win = _getWin()
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:historyNavigate', payload)
}

// ---------------------------------------------------------------------------
// Event debouncing
// ---------------------------------------------------------------------------

function flushWorkspaceWatchEvent(workspaceId: string) {
  const watchEntry = workspaceWatchers.get(workspaceId)
  if (!watchEntry) {
    return
  }

  watchEntry.debounceTimer = null
  if (
    watchEntry.pendingRelativePaths.size === 0 &&
    !watchEntry.hasPendingStructureChanges
  ) {
    return
  }

  const changedRelativePaths = Array.from(watchEntry.pendingRelativePaths).sort()
  const hasStructureChanges = watchEntry.hasPendingStructureChanges
  watchEntry.pendingRelativePaths.clear()
  watchEntry.hasPendingStructureChanges = false
  sendWorkspaceWatchEvent({
    workspaceId,
    changedRelativePaths,
    hasStructureChanges,
  })
}

function queueWorkspaceWatchEvent(
  workspaceId: string,
  eventName: string,
  targetPath: string,
) {
  const watchEntry = workspaceWatchers.get(workspaceId)
  if (!watchEntry) {
    return
  }

  const resolvedTargetPath = path.resolve(targetPath)
  if (!isPathInsideWorkspace(watchEntry.rootPath, resolvedTargetPath)) {
    return
  }

  if (shouldIgnoreWatchPath(watchEntry.rootPath, resolvedTargetPath)) {
    return
  }

  const relativePath = normalizeToWorkspaceRelativePath(
    resolvedTargetPath,
    watchEntry.rootPath,
  )
  if (!relativePath || relativePath.startsWith('..')) {
    return
  }

  if (WATCHABLE_FILE_EVENTS.has(eventName)) {
    watchEntry.pendingRelativePaths.add(relativePath)
  }
  if (WATCHABLE_STRUCTURE_EVENTS.has(eventName)) {
    watchEntry.pendingRelativePaths.add(relativePath)
    watchEntry.hasPendingStructureChanges = true
  }
  if (watchEntry.debounceTimer !== null) {
    return
  }

  watchEntry.debounceTimer = setTimeout(() => {
    flushWorkspaceWatchEvent(workspaceId)
  }, WATCH_EVENT_DEBOUNCE_MS)
}

function queueWorkspaceWatchBatchEvent(
  workspaceId: string,
  changedRelativePaths: string[],
  hasStructureChanges: boolean,
) {
  const watchEntry = workspaceWatchers.get(workspaceId)
  if (!watchEntry) {
    return
  }

  for (const relativePath of changedRelativePaths) {
    if (!relativePath || relativePath.startsWith('..')) {
      continue
    }
    watchEntry.pendingRelativePaths.add(relativePath)
  }
  if (hasStructureChanges) {
    watchEntry.hasPendingStructureChanges = true
  }

  if (watchEntry.debounceTimer !== null) {
    return
  }

  watchEntry.debounceTimer = setTimeout(() => {
    flushWorkspaceWatchEvent(workspaceId)
  }, WATCH_EVENT_DEBOUNCE_MS)
}

// ---------------------------------------------------------------------------
// Polling snapshot
// ---------------------------------------------------------------------------

async function buildWorkspacePollingSnapshot(
  rootPath: string,
): Promise<WorkspacePollingSnapshot> {
  const fileMetadataByRelativePath = new Map<string, string>()
  const directoryPaths = new Set<string>()
  let fileCount = 0

  async function walkDirectory(currentDirectory: string): Promise<void> {
    if (fileCount >= MAX_WORKSPACE_POLL_FILES) {
      return
    }

    const entries = await readdir(currentDirectory, { withFileTypes: true })

    const eligibleCount = entries.filter(
      (entry) =>
        !entry.isSymbolicLink() &&
        (entry.isFile() || entry.isDirectory()) &&
        !shouldIgnoreWatchPath(rootPath, path.join(currentDirectory, entry.name)),
    ).length
    if (eligibleCount > WORKSPACE_INDEX_DIRECTORY_CHILD_CAP) {
      return
    }

    for (const entry of entries) {
      if (fileCount >= MAX_WORKSPACE_POLL_FILES) {
        return
      }

      if (entry.isSymbolicLink()) {
        continue
      }

      const absolutePath = path.join(currentDirectory, entry.name)
      const relativePath = normalizeToWorkspaceRelativePath(absolutePath, rootPath)
      if (!relativePath || relativePath.startsWith('..')) {
        continue
      }

      if (shouldIgnoreWatchPath(rootPath, absolutePath)) {
        continue
      }

      if (entry.isDirectory()) {
        directoryPaths.add(relativePath)
        await walkDirectory(absolutePath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      try {
        const fileStats = await stat(absolutePath)
        fileMetadataByRelativePath.set(
          relativePath,
          `${fileStats.mtimeMs}:${fileStats.size}`,
        )
        fileCount += 1
      } catch {
        // Files may disappear while scanning. Skip those transient entries.
      }
    }
  }

  await walkDirectory(rootPath)
  return {
    fileMetadataByRelativePath,
    directoryPaths,
  }
}

function diffWorkspacePollingSnapshot(
  previousSnapshot: WorkspacePollingSnapshot,
  nextSnapshot: WorkspacePollingSnapshot,
) {
  const changedRelativePaths = new Set<string>()
  let hasStructureChanges = false

  for (const [relativePath, nextMetadata] of nextSnapshot.fileMetadataByRelativePath) {
    const previousMetadata =
      previousSnapshot.fileMetadataByRelativePath.get(relativePath)
    if (!previousMetadata) {
      changedRelativePaths.add(relativePath)
      hasStructureChanges = true
      continue
    }
    if (previousMetadata !== nextMetadata) {
      changedRelativePaths.add(relativePath)
    }
  }

  for (const relativePath of previousSnapshot.fileMetadataByRelativePath.keys()) {
    if (nextSnapshot.fileMetadataByRelativePath.has(relativePath)) {
      continue
    }
    changedRelativePaths.add(relativePath)
    hasStructureChanges = true
  }

  for (const directoryPath of nextSnapshot.directoryPaths) {
    if (!previousSnapshot.directoryPaths.has(directoryPath)) {
      changedRelativePaths.add(directoryPath)
      hasStructureChanges = true
    }
  }
  for (const directoryPath of previousSnapshot.directoryPaths) {
    if (!nextSnapshot.directoryPaths.has(directoryPath)) {
      changedRelativePaths.add(directoryPath)
      hasStructureChanges = true
    }
  }

  return {
    changedRelativePaths: Array.from(changedRelativePaths).sort(),
    hasStructureChanges,
  }
}

// ---------------------------------------------------------------------------
// Polling tick scheduler
// ---------------------------------------------------------------------------

function scheduleWorkspacePollingTick(workspaceId: string) {
  const watchEntry = workspaceWatchers.get(workspaceId)
  if (!watchEntry || watchEntry.watchMode !== 'polling') {
    return
  }

  if (watchEntry.pollTimer !== null) {
    return
  }

  watchEntry.pollTimer = setTimeout(() => {
    const currentWatchEntry = workspaceWatchers.get(workspaceId)
    if (!currentWatchEntry || currentWatchEntry.watchMode !== 'polling') {
      return
    }
    currentWatchEntry.pollTimer = null
    if (currentWatchEntry.pollingInProgress) {
      scheduleWorkspacePollingTick(workspaceId)
      return
    }

    currentWatchEntry.pollingInProgress = true
    void (async () => {
      try {
        const nextSnapshot = await buildWorkspacePollingSnapshot(
          currentWatchEntry.rootPath,
        )
        const liveWatchEntry = workspaceWatchers.get(workspaceId)
        if (
          !liveWatchEntry ||
          liveWatchEntry.watchMode !== 'polling' ||
          liveWatchEntry !== currentWatchEntry
        ) {
          return
        }

        const diff = diffWorkspacePollingSnapshot(
          {
            fileMetadataByRelativePath:
              currentWatchEntry.fileMetadataByRelativePath,
            directoryPaths: currentWatchEntry.directoryPaths,
          },
          nextSnapshot,
        )

        currentWatchEntry.fileMetadataByRelativePath =
          nextSnapshot.fileMetadataByRelativePath
        currentWatchEntry.directoryPaths = nextSnapshot.directoryPaths

        if (
          diff.changedRelativePaths.length > 0 ||
          diff.hasStructureChanges
        ) {
          queueWorkspaceWatchBatchEvent(
            workspaceId,
            diff.changedRelativePaths,
            diff.hasStructureChanges,
          )
        }
      } catch (error) {
        console.error(
          `Workspace polling watcher error (${workspaceId}).`,
          error,
        )
      } finally {
        const liveWatchEntry = workspaceWatchers.get(workspaceId)
        if (
          liveWatchEntry &&
          liveWatchEntry.watchMode === 'polling' &&
          liveWatchEntry === currentWatchEntry
        ) {
          liveWatchEntry.pollingInProgress = false
          scheduleWorkspacePollingTick(workspaceId)
        }
      }
    })()
  }, watchEntry.pollIntervalMs)
}

// ---------------------------------------------------------------------------
// Watcher entry creation
// ---------------------------------------------------------------------------

async function createNativeWorkspaceWatcherEntry(
  workspaceId: string,
  resolvedRootPath: string,
  pollIntervalMs: number,
): Promise<WorkspaceWatcherEntry> {
  const watcher = chokidar.watch(resolvedRootPath, {
    ignored: (candidatePath) =>
      shouldIgnoreWatchPath(resolvedRootPath, candidatePath),
    ignoreInitial: true,
    persistent: true,
    followSymlinks: false,
  })

  const watchEntry: WorkspaceWatcherEntry = {
    workspaceId,
    rootPath: resolvedRootPath,
    watchMode: 'native',
    watcher,
    pendingRelativePaths: new Set(),
    hasPendingStructureChanges: false,
    debounceTimer: null,
  }

  watcher.on('all', (eventName, candidatePath) => {
    if (
      !WATCHABLE_FILE_EVENTS.has(eventName) &&
      !WATCHABLE_STRUCTURE_EVENTS.has(eventName)
    ) {
      return
    }
    queueWorkspaceWatchEvent(workspaceId, eventName, candidatePath)
  })

  watcher.on('error', (error) => {
    const errorCode = (error as NodeJS.ErrnoException).code
    if (errorCode === 'EPERM' || errorCode === 'ENOSYS' || errorCode === 'ENOTSUP') {
      void switchToPollingFallback(workspaceId, resolvedRootPath, pollIntervalMs)
      return
    }
    console.error(`Workspace watcher error (${workspaceId}).`, error)
  })

  return watchEntry
}

async function createPollingWorkspaceWatcherEntry(
  workspaceId: string,
  resolvedRootPath: string,
  pollIntervalMs = WORKSPACE_WATCH_POLL_INTERVAL_MS,
): Promise<WorkspaceWatcherEntry> {
  const initialSnapshot = await buildWorkspacePollingSnapshot(resolvedRootPath)

  return {
    workspaceId,
    rootPath: resolvedRootPath,
    watchMode: 'polling',
    pollTimer: null,
    pollIntervalMs,
    fileMetadataByRelativePath: initialSnapshot.fileMetadataByRelativePath,
    directoryPaths: initialSnapshot.directoryPaths,
    pollingInProgress: false,
    pendingRelativePaths: new Set(),
    hasPendingStructureChanges: false,
    debounceTimer: null,
  }
}

// ---------------------------------------------------------------------------
// Fallback transition
// ---------------------------------------------------------------------------

async function switchToPollingFallback(
  workspaceId: string,
  resolvedRootPath: string,
  pollIntervalMs: number,
) {
  if (workspacesInFallbackTransition.has(workspaceId)) {
    return
  }
  const existingEntry = workspaceWatchers.get(workspaceId)
  if (!existingEntry || existingEntry.watchMode !== 'native') {
    return
  }

  workspacesInFallbackTransition.add(workspaceId)
  try {
    console.warn(
      `Native watcher unavailable for workspace "${workspaceId}". Switching to polling.`,
    )
    await stopWorkspaceWatcher(workspaceId)
    const pollEntry = await createPollingWorkspaceWatcherEntry(
      workspaceId,
      resolvedRootPath,
      pollIntervalMs,
    )
    workspaceWatchers.set(workspaceId, pollEntry)
    scheduleWorkspacePollingTick(workspaceId)

    sendWorkspaceWatchFallbackEvent({
      workspaceId,
      watchMode: 'polling',
    })
  } catch (error) {
    console.error(
      `Failed to switch workspace "${workspaceId}" to polling fallback.`,
      error,
    )
  } finally {
    workspacesInFallbackTransition.delete(workspaceId)
  }
}

// ---------------------------------------------------------------------------
// Watcher lifecycle
// ---------------------------------------------------------------------------

async function stopWorkspaceWatcher(workspaceId: string) {
  const watchEntry = workspaceWatchers.get(workspaceId)
  if (!watchEntry) {
    return
  }

  workspaceWatchers.delete(workspaceId)
  if (watchEntry.debounceTimer !== null) {
    clearTimeout(watchEntry.debounceTimer)
    watchEntry.debounceTimer = null
  }
  watchEntry.pendingRelativePaths.clear()
  watchEntry.hasPendingStructureChanges = false
  if (watchEntry.watchMode === 'native') {
    await watchEntry.watcher.close()
    return
  }

  if (watchEntry.pollTimer !== null) {
    clearTimeout(watchEntry.pollTimer)
    watchEntry.pollTimer = null
  }
  watchEntry.pollingInProgress = false
  watchEntry.fileMetadataByRelativePath.clear()
  watchEntry.directoryPaths.clear()
}

export async function stopAllWorkspaceWatchers() {
  if (stopAllWorkspaceWatchersPromise) {
    return stopAllWorkspaceWatchersPromise
  }

  const workspaceIds = Array.from(workspaceWatchers.keys())
  stopAllWorkspaceWatchersPromise = Promise.all(
    workspaceIds.map(async (workspaceId) => {
      try {
        await stopWorkspaceWatcher(workspaceId)
      } catch (error) {
        console.error(`Failed to stop watcher for workspace "${workspaceId}".`, error)
      }
    }),
  )
    .then(() => undefined)
    .finally(() => {
      stopAllWorkspaceWatchersPromise = null
    })

  return stopAllWorkspaceWatchersPromise
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

export async function handleWorkspaceWatchStart(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWatchStartRequest,
): Promise<WorkspaceWatchControlResult> {
  try {
    const workspaceId = request?.workspaceId?.trim()
    const rootPath = request?.rootPath
    if (!workspaceId || !rootPath) {
      return {
        ok: false,
        error: 'workspaceId and rootPath are required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        error: 'Selected workspace root is not a directory.',
      }
    }

    const watchModeResolution = resolveWorkspaceWatchMode({
      rootPath: resolvedRootPath,
      watchModePreference: request.watchModePreference,
      isRemoteMountedHint: false,
    })
    const existingWatchEntry = workspaceWatchers.get(workspaceId)
    if (
      existingWatchEntry?.rootPath === resolvedRootPath &&
      existingWatchEntry.watchMode === watchModeResolution.watchMode
    ) {
      return {
        ok: true,
        watchMode: existingWatchEntry.watchMode,
        isRemoteMounted: watchModeResolution.isRemoteMounted,
        fallbackApplied: false,
      }
    }

    if (existingWatchEntry) {
      await stopWorkspaceWatcher(workspaceId)
    }

    let fallbackApplied = false
    let resolvedWatchMode = watchModeResolution.watchMode
    let watchEntry: WorkspaceWatcherEntry
    try {
      watchEntry =
        resolvedWatchMode === 'native'
          ? await createNativeWorkspaceWatcherEntry(
              workspaceId,
              resolvedRootPath,
              watchModeResolution.pollIntervalMs,
            )
          : await createPollingWorkspaceWatcherEntry(
              workspaceId,
              resolvedRootPath,
              watchModeResolution.pollIntervalMs,
            )
    } catch (error) {
      if (resolvedWatchMode !== 'native') {
        throw error
      }
      console.error(
        `Failed to start native workspace watcher (${workspaceId}). Falling back to polling.`,
        error,
      )
      watchEntry = await createPollingWorkspaceWatcherEntry(
        workspaceId,
        resolvedRootPath,
        watchModeResolution.pollIntervalMs,
      )
      resolvedWatchMode = 'polling'
      fallbackApplied = true
    }

    workspaceWatchers.set(workspaceId, watchEntry)
    if (watchEntry.watchMode === 'polling') {
      scheduleWorkspacePollingTick(workspaceId)
    }

    return {
      ok: true,
      watchMode: watchEntry.watchMode,
      isRemoteMounted: watchModeResolution.isRemoteMounted,
      fallbackApplied,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to start workspace watcher.',
    }
  }
}

export async function handleWorkspaceWatchStop(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWatchStopRequest,
): Promise<WorkspaceWatchControlResult> {
  try {
    const workspaceId = request?.workspaceId?.trim()
    if (!workspaceId) {
      return {
        ok: false,
        error: 'workspaceId is required.',
      }
    }

    await stopWorkspaceWatcher(workspaceId)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to stop workspace watcher.',
    }
  }
}
