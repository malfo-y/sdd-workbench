import { readdir, realpath, stat } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import path from 'node:path'
import { normalizeToWorkspaceRelativePath } from './path-guard'
import type { RuntimeWatchEventPayload, RuntimeWatchFallbackPayload, RuntimeWatchMode } from './runtime-types'

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

    const entries = await readdir(currentDirectory, { withFileTypes: true })

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
        fileMetadataByRelativePath.set(
          relativePath,
          `${fileStats.mtimeMs}:${fileStats.size}`,
        )
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
      hasStructureChanges = true
    }
  }

  for (const directoryPath of previousSnapshot.directoryPaths) {
    if (!nextSnapshot.directoryPaths.has(directoryPath)) {
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
    const pollIntervalOverride =
      watchModePreference === 'native' || watchModePreference === 'polling'
        ? DEFAULT_POLL_INTERVAL_MS
        : DEFAULT_POLL_INTERVAL_MS

    this.pollIntervalMs = pollIntervalOverride
    this.snapshot = await buildWorkspacePollingSnapshot(this.rootPath)

    if (this.pollTimer === null) {
      this.scheduleNextTick()
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
    this.pollingInProgress = false
    this.snapshot = null
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
    } finally {
      this.pollingInProgress = false
      this.scheduleNextTick()
    }
  }
}
