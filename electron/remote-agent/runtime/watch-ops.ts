import { readdir, realpath, stat } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import path from 'node:path'
import { RemoteAgentError } from '../protocol'
import {
  normalizeToWorkspaceRelativePath,
  resolveWorkspaceRelativePath,
} from './path-guard'
import type {
  RuntimeWatchEventPayload,
  RuntimeWatchFallbackPayload,
  RuntimeWatchMode,
} from './runtime-types'

type EmitRuntimeEvent = (
  eventName: string,
  payload: RuntimeWatchEventPayload | RuntimeWatchFallbackPayload,
) => void

type RuntimePollingSnapshot = {
  fileMetadataByRelativePath: Map<string, string>
  directoryPaths: Set<string>
}

const WORKSPACE_WATCH_IGNORE_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
  '.venv',
  'venv',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.tox',
  '.sdd-workbench',
])

const MAX_WORKSPACE_POLL_FILES = 100_000
const DEFAULT_POLL_INTERVAL_MS = 1500
export const FOCUSED_WATCH_FAST_LANE_INTERVAL_MS = 400

type WatchEntryKind = {
  kind: 'file' | 'directory'
}

async function resolveWatchEntryKind(
  absolutePath: string,
  entry: Dirent,
): Promise<WatchEntryKind | null> {
  if (entry.isFile()) {
    return { kind: 'file' }
  }

  if (entry.isDirectory()) {
    return { kind: 'directory' }
  }

  if (!entry.isSymbolicLink()) {
    return null
  }

  try {
    const targetStats = await stat(absolutePath)
    if (targetStats.isDirectory()) {
      return { kind: 'directory' }
    }
    if (targetStats.isFile()) {
      return { kind: 'file' }
    }
  } catch {
    return null
  }

  return null
}

function hasIgnoredWorkspaceSegment(relativePath: string): boolean {
  return relativePath
    .split(path.sep)
    .some((segment) => WORKSPACE_WATCH_IGNORE_NAMES.has(segment))
}

function shouldIgnoreWatchPath(rootPath: string, candidatePath: string): boolean {
  const resolvedCandidatePath = path.resolve(candidatePath)
  const relativePath = path.relative(rootPath, resolvedCandidatePath)

  if (relativePath === '') {
    return false
  }

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return true
  }

  return hasIgnoredWorkspaceSegment(relativePath)
}

async function buildWorkspacePollingSnapshot(
  rootPath: string,
): Promise<RuntimePollingSnapshot> {
  const fileMetadataByRelativePath = new Map<string, string>()
  const directoryPaths = new Set<string>()
  const visitedDirectoryRealPaths = new Set<string>()
  let fileCount = 0

  async function walkDirectory(currentDirectory: string): Promise<void> {
    if (fileCount >= MAX_WORKSPACE_POLL_FILES) {
      return
    }

    try {
      const currentDirectoryRealPath = await realpath(currentDirectory)
      if (visitedDirectoryRealPaths.has(currentDirectoryRealPath)) {
        return
      }
      visitedDirectoryRealPaths.add(currentDirectoryRealPath)
    } catch {
      // Skip realpath de-duplication for unreadable/transient paths.
    }

    let entries: Dirent[]
    try {
      entries = await readdir(currentDirectory, { withFileTypes: true })
    } catch (error) {
      if (currentDirectory === rootPath) {
        throw error
      }
      return
    }

    for (const entry of entries) {
      if (fileCount >= MAX_WORKSPACE_POLL_FILES) {
        return
      }

      const absolutePath = path.join(currentDirectory, entry.name)
      if (shouldIgnoreWatchPath(rootPath, absolutePath)) {
        continue
      }

      const entryKind = await resolveWatchEntryKind(absolutePath, entry)
      if (!entryKind) {
        continue
      }

      const relativePath = normalizeToWorkspaceRelativePath(absolutePath, rootPath)
      if (!relativePath || relativePath.startsWith('..')) {
        continue
      }

      if (entryKind.kind === 'directory') {
        directoryPaths.add(relativePath)
        await walkDirectory(absolutePath)
        continue
      }

      try {
        const fileStats = await stat(absolutePath)
        fileMetadataByRelativePath.set(relativePath, buildFileMetadata(fileStats))
        fileCount += 1
      } catch {
        // Files may disappear while scanning. Skip transient entries.
      }
    }
  }

  await walkDirectory(rootPath)
  return {
    fileMetadataByRelativePath,
    directoryPaths,
  }
}

function buildFileMetadata(fileStats: {
  mtimeMs: number
  ctimeMs: number
  size: number
}): string {
  return `${fileStats.mtimeMs}:${fileStats.ctimeMs}:${fileStats.size}`
}

async function readFileMetadata(absolutePath: string): Promise<string | null> {
  try {
    const fileStats = await stat(absolutePath)
    if (!fileStats.isFile()) {
      return null
    }
    return buildFileMetadata(fileStats)
  } catch {
    return null
  }
}

function diffWorkspacePollingSnapshot(
  previousSnapshot: RuntimePollingSnapshot,
  nextSnapshot: RuntimePollingSnapshot,
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

export class RuntimeWatchService {
  private readonly rootPath: string
  private readonly emitEvent: EmitRuntimeEvent
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
  private pollingInProgress = false
  private snapshot: RuntimePollingSnapshot | null = null
  private focusedPollTimer: ReturnType<typeof setTimeout> | null = null
  private focusedPollingInProgress = false
  private readonly focusedRelativePaths = new Set<string>()
  private readonly focusedMetadataByRelativePath = new Map<string, string>()

  constructor(rootPath: string, emitEvent: EmitRuntimeEvent) {
    this.rootPath = rootPath
    this.emitEvent = emitEvent
  }

  async start(watchModePreference?: string): Promise<{
    ok: boolean
    watchMode: RuntimeWatchMode
    isRemoteMounted: boolean
    fallbackApplied: boolean
    error?: string
  }> {
    this.pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
    this.snapshot = await buildWorkspacePollingSnapshot(this.rootPath)

    if (this.pollTimer === null) {
      this.scheduleNextTick()
      this.scheduleNextFocusedTick()
      this.emitEvent('workspace.watchFallback', {
        watchMode: 'polling',
      })
    }

    return {
      ok: true,
      watchMode: 'polling',
      isRemoteMounted: true,
      fallbackApplied: watchModePreference === 'native',
    }
  }

  async stop(): Promise<{ ok: true }> {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.focusedPollTimer !== null) {
      clearTimeout(this.focusedPollTimer)
      this.focusedPollTimer = null
    }
    this.pollingInProgress = false
    this.focusedPollingInProgress = false
    this.snapshot = null
    this.focusedRelativePaths.clear()
    this.focusedMetadataByRelativePath.clear()
    return { ok: true }
  }

  async setFocusedPaths(focusedRelativePaths: string[]): Promise<{ ok: true }> {
    const nextFocusedRelativePaths = focusedRelativePaths.map((relativePath) =>
      this.normalizeFocusedRelativePath(relativePath),
    )

    this.focusedRelativePaths.clear()
    this.focusedMetadataByRelativePath.clear()

    for (const relativePath of nextFocusedRelativePaths) {
      this.focusedRelativePaths.add(relativePath)
      const metadata = await this.readFocusedFileMetadata(relativePath)
      if (metadata) {
        this.focusedMetadataByRelativePath.set(relativePath, metadata)
      }
    }

    this.scheduleNextFocusedTick()
    return { ok: true }
  }

  async dispose(): Promise<void> {
    await this.stop()
  }

  private scheduleNextTick(): void {
    if (this.pollTimer !== null) {
      return
    }

    this.pollTimer = setTimeout(() => {
      this.pollTimer = null
      if (this.pollingInProgress) {
        this.scheduleNextTick()
        return
      }

      this.pollingInProgress = true
      void this.runTick()
    }, this.pollIntervalMs)
  }

  private scheduleNextFocusedTick(): void {
    if (
      this.focusedPollTimer !== null ||
      this.focusedRelativePaths.size === 0 ||
      this.snapshot === null
    ) {
      return
    }

    this.focusedPollTimer = setTimeout(() => {
      this.focusedPollTimer = null
      if (this.focusedPollingInProgress) {
        this.scheduleNextFocusedTick()
        return
      }

      this.focusedPollingInProgress = true
      void this.runFocusedTick()
    }, FOCUSED_WATCH_FAST_LANE_INTERVAL_MS)
  }

  private async runTick(): Promise<void> {
    try {
      const previousSnapshot = this.snapshot
      if (!previousSnapshot) {
        return
      }

      const nextSnapshot = await buildWorkspacePollingSnapshot(this.rootPath)
      const diff = diffWorkspacePollingSnapshot(previousSnapshot, nextSnapshot)
      this.snapshot = nextSnapshot

      if (diff.changedRelativePaths.length > 0 || diff.hasStructureChanges) {
        this.emitEvent('workspace.watchEvent', {
          changedRelativePaths: diff.changedRelativePaths,
          hasStructureChanges: diff.hasStructureChanges,
        })
      }
    } catch (error) {
      // Never let a tick throw unhandled — that silently freezes the polling
      // loop because the snapshot stops updating. Log and let the next tick retry.
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`Runtime polling tick failed: ${message}\n`)
    } finally {
      this.pollingInProgress = false
      this.scheduleNextTick()
    }
  }

  private async runFocusedTick(): Promise<void> {
    try {
      const changedRelativePaths: string[] = []

      for (const relativePath of this.focusedRelativePaths) {
        const previousMetadata =
          this.focusedMetadataByRelativePath.get(relativePath)
        const nextMetadata = await this.readFocusedFileMetadata(relativePath)

        if (!nextMetadata) {
          this.focusedMetadataByRelativePath.delete(relativePath)
          continue
        }

        if (!previousMetadata) {
          this.focusedMetadataByRelativePath.set(relativePath, nextMetadata)
          continue
        }

        if (previousMetadata !== nextMetadata) {
          changedRelativePaths.push(relativePath)
          this.focusedMetadataByRelativePath.set(relativePath, nextMetadata)
          this.snapshot?.fileMetadataByRelativePath.set(relativePath, nextMetadata)
        }
      }

      if (changedRelativePaths.length > 0) {
        this.emitEvent('workspace.watchEvent', {
          changedRelativePaths: changedRelativePaths.sort(),
          hasStructureChanges: false,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`Runtime focused polling tick failed: ${message}\n`)
    } finally {
      this.focusedPollingInProgress = false
      this.scheduleNextFocusedTick()
    }
  }

  private normalizeFocusedRelativePath(relativePath: string): string {
    if (
      typeof relativePath !== 'string' ||
      relativePath.trim().length === 0 ||
      path.isAbsolute(relativePath) ||
      path.win32.isAbsolute(relativePath)
    ) {
      throw new RemoteAgentError('PATH_DENIED', 'focusedRelativePath is invalid.')
    }

    const absolutePath = resolveWorkspaceRelativePath(this.rootPath, relativePath)
    const normalizedRelativePath = normalizeToWorkspaceRelativePath(
      absolutePath,
      path.resolve(this.rootPath),
    )
    if (!normalizedRelativePath) {
      throw new RemoteAgentError('PATH_DENIED', 'focusedRelativePath is invalid.')
    }
    return normalizedRelativePath
  }

  private async readFocusedFileMetadata(
    relativePath: string,
  ): Promise<string | null> {
    const absolutePath = resolveWorkspaceRelativePath(this.rootPath, relativePath)
    if (shouldIgnoreWatchPath(this.rootPath, absolutePath)) {
      return null
    }
    return readFileMetadata(absolutePath)
  }
}
