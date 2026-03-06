import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import chokidar, { type FSWatcher } from 'chokidar'
import { execFile } from 'node:child_process'
import type { Dirent } from 'node:fs'
import { appendFile, mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  resolveWorkspaceWatchMode,
  type WorkspaceWatchMode,
  type WorkspaceWatchModePreference,
} from './workspace-watch-mode'
import {
  parseGitDiffLineMarkers,
  type WorkspaceGitLineMarker,
} from './git-line-markers'
import {
  parseGitStatusPorcelain,
  type GitFileStatusMap,
} from './git-file-statuses'
import { RemoteConnectionService } from './remote-agent/connection-service'
import {
  browseRemoteDirectories,
  type RemoteDirectoryBrowseEntry,
  type RemoteDirectoryBrowseRequest,
} from './remote-agent/directory-browser'
import { toRemoteAgentError } from './remote-agent/protocol'
import { loadRemoteReliabilityPolicy } from './remote-agent/reliability-policy'
import { redactRemoteErrorMessage } from './remote-agent/security'
import type {
  RemoteConnectResult,
  RemoteConnectionEvent,
  RemoteConnectionProfile,
  RemoteDisconnectResult,
} from './remote-agent/types'
import { createLocalWorkspaceBackend } from './workspace-backend/local-workspace-backend'
import { createRemoteWorkspaceBackend } from './workspace-backend/remote-workspace-backend'
import { WorkspaceBackendRouter } from './workspace-backend/backend-router'
import { searchWorkspaceFilesByName } from './workspace-search'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

type WorkspaceOpenDialogResult = {
  canceled: boolean
  selectedPath: string | null
  error?: string
}

type WorkspaceFileNode = {
  name: string
  relativePath: string
  kind: 'file' | 'directory'
  children?: WorkspaceFileNode[]
  childrenStatus?: 'complete' | 'not-loaded' | 'partial'
  totalChildCount?: number
}

type WorkspaceIndexRequest = {
  rootPath: string
}

type WorkspaceIndexResult = {
  ok: boolean
  fileTree: WorkspaceFileNode[]
  truncated?: boolean
  error?: string
}

type WorkspaceSearchFilesRequest = {
  rootPath: string
  query: string
  maxDepth?: number
  maxResults?: number
  maxDirectoryChildren?: number
  timeBudgetMs?: number
}

type WorkspaceSearchFileMatch = {
  relativePath: string
  fileName: string
  parentRelativePath: string
}

type WorkspaceSearchFilesResult = {
  ok: boolean
  results: WorkspaceSearchFileMatch[]
  truncated: boolean
  skippedLargeDirectoryCount: number
  depthLimitHit: boolean
  timedOut: boolean
  error?: string
}

type WorkspacePreviewUnavailableReason =
  | 'file_too_large'
  | 'binary_file'
  | 'blocked_resource'

type WorkspaceImagePreview = {
  mimeType: string
  dataUrl: string
}

type WorkspaceReadFileRequest = {
  rootPath: string
  relativePath: string
}

type WorkspaceReadFileResult = {
  ok: boolean
  content: string | null
  imagePreview?: WorkspaceImagePreview
  error?: string
  previewUnavailableReason?: WorkspacePreviewUnavailableReason
}

type WorkspaceWriteFileRequest = {
  rootPath: string
  relativePath: string
  content: string
}

type WorkspaceWriteFileResult = {
  ok: boolean
  error?: string
}

type WorkspaceCreateFileRequest = {
  rootPath: string
  relativePath: string
}

type WorkspaceCreateFileResult = {
  ok: boolean
  error?: string
}

type WorkspaceCreateDirectoryRequest = {
  rootPath: string
  relativePath: string
}

type WorkspaceCreateDirectoryResult = {
  ok: boolean
  error?: string
}

type WorkspaceDeleteFileRequest = {
  rootPath: string
  relativePath: string
}

type WorkspaceDeleteFileResult = {
  ok: boolean
  error?: string
}

type WorkspaceDeleteDirectoryRequest = {
  rootPath: string
  relativePath: string
}

type WorkspaceDeleteDirectoryResult = {
  ok: boolean
  error?: string
}

type WorkspaceRenameRequest = {
  rootPath: string
  oldRelativePath: string
  newRelativePath: string
}

type WorkspaceRenameResult = {
  ok: boolean
  error?: string
}

type WorkspaceGetGitLineMarkersRequest = {
  rootPath: string
  relativePath: string
}

type WorkspaceGetGitLineMarkersResult = {
  ok: boolean
  markers: WorkspaceGitLineMarker[]
  error?: string
}

type WorkspaceGetGitFileStatusesRequest = {
  rootPath: string
}

type WorkspaceGetGitFileStatusesResult = {
  ok: boolean
  statuses: GitFileStatusMap
  error?: string
}

type CodeCommentRecord = {
  id: string
  relativePath: string
  startLine: number
  endLine: number
  body: string
  anchor: {
    snippet: string
    hash: string
    before?: string
    after?: string
  }
  createdAt: string
  exportedAt?: string
}

type WorkspaceReadCommentsRequest = {
  rootPath: string
}

type WorkspaceReadCommentsResult = {
  ok: boolean
  comments: CodeCommentRecord[]
  error?: string
}

type WorkspaceWriteCommentsRequest = {
  rootPath: string
  comments: CodeCommentRecord[]
}

type WorkspaceWriteCommentsResult = {
  ok: boolean
  error?: string
}

type WorkspaceReadGlobalCommentsRequest = {
  rootPath: string
}

type WorkspaceReadGlobalCommentsResult = {
  ok: boolean
  body: string
  error?: string
}

type WorkspaceWriteGlobalCommentsRequest = {
  rootPath: string
  body: string
}

type WorkspaceWriteGlobalCommentsResult = {
  ok: boolean
  error?: string
}

type WorkspaceExportCommentsBundleRequest = {
  rootPath: string
  commentsMarkdown?: string
  bundleMarkdown?: string
  writeCommentsFile: boolean
  writeBundleFile: boolean
}

type WorkspaceExportCommentsBundleResult = {
  ok: boolean
  commentsPath?: string
  bundlePath?: string
  error?: string
}

type WorkspaceIndexDirectoryRequest = {
  rootPath: string
  relativePath: string
  offset?: number
  limit?: number
}

type WorkspaceIndexDirectoryResult = {
  ok: boolean
  children: WorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
  error?: string
}

type WorkspaceWatchStartRequest = {
  workspaceId: string
  rootPath: string
  watchModePreference?: WorkspaceWatchModePreference
}

type WorkspaceWatchStopRequest = {
  workspaceId: string
}

type WorkspaceConnectRemoteRequest = {
  profile: RemoteConnectionProfile
}

type WorkspaceBrowseRemoteDirectoriesRequest = {
  request: RemoteDirectoryBrowseRequest
}

type WorkspaceBrowseRemoteDirectoriesResult = {
  ok: boolean
  currentPath: string
  entries: RemoteDirectoryBrowseEntry[]
  truncated: boolean
  errorCode?: string
  error?: string
}

type WorkspaceDisconnectRemoteRequest = {
  workspaceId: string
}

type WorkspaceWatchControlResult = {
  ok: boolean
  watchMode?: WorkspaceWatchMode
  isRemoteMounted?: boolean
  fallbackApplied?: boolean
  error?: string
}

type WorkspaceWatchEventPayload = {
  workspaceId: string
  changedRelativePaths: string[]
  hasStructureChanges: boolean
}

type WorkspaceWatchFallbackEvent = {
  workspaceId: string
  watchMode: WorkspaceWatchMode
}

type WorkspaceHistoryNavigationDirection = 'back' | 'forward'

type WorkspaceHistoryNavigationSource = 'app-command' | 'swipe'

type WorkspaceHistoryNavigationEventPayload = {
  direction: WorkspaceHistoryNavigationDirection
  source: WorkspaceHistoryNavigationSource
}

type SystemOpenInRequest = {
  rootPath: string
}

type SystemOpenInResult = {
  ok: boolean
  error?: string
}

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

const WORKSPACE_INDEX_IGNORE_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
])
const WORKSPACE_WATCH_IGNORE_NAMES = new Set([
  ...Array.from(WORKSPACE_INDEX_IGNORE_NAMES),
  '.venv',
  'venv',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.tox',
  '.sdd-workbench',
])

const WORKSPACE_INDEX_DIRECTORY_CHILD_CAP = 500

const MAX_FILE_PREVIEW_BYTES = 2 * 1024 * 1024
const MAX_WORKSPACE_INDEX_NODES = 100_000
const MAX_WORKSPACE_POLL_FILES = 10_000
const WATCH_EVENT_DEBOUNCE_MS = 300
const WORKSPACE_WATCH_POLL_INTERVAL_MS = 1500
const WATCHABLE_FILE_EVENTS = new Set(['add', 'change', 'unlink'])
const WATCHABLE_STRUCTURE_EVENTS = new Set(['add', 'unlink', 'addDir', 'unlinkDir'])
const REMOTE_AGENT_LOG_DIRECTORY_NAME = 'logs'
const REMOTE_AGENT_LOG_FILE_NAME = 'remote-agent.log'
const ALLOWED_IMAGE_PREVIEW_MIME_PREFIX = 'data:image/'
const BLOCKED_IMAGE_EXTENSIONS = new Set(['.svg'])
const SDD_WORKBENCH_DIRECTORY = '.sdd-workbench'
const COMMENTS_FILE_NAME = 'comments.json'
const GLOBAL_COMMENTS_FILE_NAME = 'global-comments.md'
const COMMENTS_BUNDLE_EXPORT_DIRECTORY = 'exports'
const COMMENTS_MARKDOWN_FILE_NAME = '_COMMENTS.md'
const IMAGE_PREVIEW_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

const workspaceWatchers = new Map<string, WorkspaceWatcherEntry>()
const workspacesInFallbackTransition = new Set<string>()
let stopAllWorkspaceWatchersPromise: Promise<void> | null = null
let remoteAgentLogWriteQueue: Promise<void> = Promise.resolve()
const remoteReliabilityPolicy = loadRemoteReliabilityPolicy()
const remoteConnectionService = new RemoteConnectionService({
  emitEvent: sendWorkspaceRemoteConnectionEvent,
  policy: remoteReliabilityPolicy,
})
let hasRequestedQuitWatcherShutdown = false
let workspaceWriteOperationsInFlight = 0
const QUIT_WRITE_SETTLE_TIMEOUT_MS = 5000
const QUIT_WATCHER_SHUTDOWN_TIMEOUT_MS = 1500

function normalizeToWorkspaceRelativePath(absolutePath: string, rootPath: string) {
  return path.relative(rootPath, absolutePath).split(path.sep).join('/')
}

function hasIgnoredWorkspaceSegment(
  relativePath: string,
  ignoreNames: Set<string> = WORKSPACE_INDEX_IGNORE_NAMES,
) {
  const normalizedPath = relativePath.split(path.sep).join('/')
  return normalizedPath
    .split('/')
    .filter((segment) => segment.length > 0)
    .some((segment) => ignoreNames.has(segment))
}

function isPathInsideWorkspace(rootPath: string, targetPath: string) {
  const relativePath = path.relative(rootPath, targetPath)
  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  )
}

function getWorkspaceCommentPaths(rootPath: string) {
  const metadataDirectoryPath = path.join(rootPath, SDD_WORKBENCH_DIRECTORY)
  const commentsJsonPath = path.join(metadataDirectoryPath, COMMENTS_FILE_NAME)
  const globalCommentsPath = path.join(
    metadataDirectoryPath,
    GLOBAL_COMMENTS_FILE_NAME,
  )
  const bundleExportsDirectoryPath = path.join(
    metadataDirectoryPath,
    COMMENTS_BUNDLE_EXPORT_DIRECTORY,
  )
  const commentsMarkdownPath = path.join(rootPath, COMMENTS_MARKDOWN_FILE_NAME)

  return {
    metadataDirectoryPath,
    commentsJsonPath,
    globalCommentsPath,
    bundleExportsDirectoryPath,
    commentsMarkdownPath,
  }
}

function toBundleTimestamp(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

function runBackgroundTask(task: Promise<unknown>, label: string): void {
  void task.catch((error) => {
    console.warn(`${label} failed.`, error)
  })
}

async function writeFileAtomic(targetPath: string, content: string) {
  const temporaryPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temporaryPath, content, 'utf8')
  await rename(temporaryPath, targetPath)
}

function beginWorkspaceWriteOperation() {
  workspaceWriteOperationsInFlight += 1
}

function endWorkspaceWriteOperation() {
  workspaceWriteOperationsInFlight = Math.max(
    0,
    workspaceWriteOperationsInFlight - 1,
  )
}

function runGitCommand(rootPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      ['-C', rootPath, ...args],
      {
        encoding: 'utf8',
        maxBuffer: 2 * 1024 * 1024,
      },
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        resolve(stdout ?? '')
      },
    )
  })
}

function waitForWorkspaceWritesToSettle(maxWaitMs: number): Promise<boolean> {
  if (workspaceWriteOperationsInFlight === 0) {
    return Promise.resolve(true)
  }

  const startedAt = Date.now()
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (workspaceWriteOperationsInFlight === 0) {
        clearInterval(timer)
        resolve(true)
        return
      }
      if (Date.now() - startedAt >= maxWaitMs) {
        clearInterval(timer)
        resolve(false)
      }
    }, 40)
  })
}

function ensurePathWithinWorkspace(rootPath: string, targetPath: string): boolean {
  const resolvedRootPath = path.resolve(rootPath)
  const resolvedTargetPath = path.resolve(targetPath)
  return isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)
}

function isLikelyBinaryContent(contentBuffer: Buffer) {
  return contentBuffer.includes(0)
}

function hasImageSignature(mimeType: string, contentBuffer: Buffer): boolean {
  if (mimeType === 'image/png') {
    return (
      contentBuffer.length >= 8 &&
      contentBuffer[0] === 0x89 &&
      contentBuffer[1] === 0x50 &&
      contentBuffer[2] === 0x4e &&
      contentBuffer[3] === 0x47 &&
      contentBuffer[4] === 0x0d &&
      contentBuffer[5] === 0x0a &&
      contentBuffer[6] === 0x1a &&
      contentBuffer[7] === 0x0a
    )
  }

  if (mimeType === 'image/jpeg') {
    return (
      contentBuffer.length >= 3 &&
      contentBuffer[0] === 0xff &&
      contentBuffer[1] === 0xd8 &&
      contentBuffer[2] === 0xff
    )
  }

  if (mimeType === 'image/gif') {
    const gif87a = Buffer.from('GIF87a', 'ascii')
    const gif89a = Buffer.from('GIF89a', 'ascii')
    return (
      contentBuffer.length >= 6 &&
      (contentBuffer.subarray(0, 6).equals(gif87a) ||
        contentBuffer.subarray(0, 6).equals(gif89a))
    )
  }

  if (mimeType === 'image/webp') {
    const riff = Buffer.from('RIFF', 'ascii')
    const webp = Buffer.from('WEBP', 'ascii')
    return (
      contentBuffer.length >= 12 &&
      contentBuffer.subarray(0, 4).equals(riff) &&
      contentBuffer.subarray(8, 12).equals(webp)
    )
  }

  return false
}

function buildImagePreview(
  relativePath: string,
  contentBuffer: Buffer,
): WorkspaceImagePreview | null {
  const extension = path.extname(relativePath).toLowerCase()
  const mimeType = IMAGE_PREVIEW_BY_EXTENSION[extension]
  if (!mimeType) {
    return null
  }

  if (!hasImageSignature(mimeType, contentBuffer)) {
    return null
  }

  const dataUrl = `data:${mimeType};base64,${contentBuffer.toString('base64')}`
  if (!dataUrl.startsWith(ALLOWED_IMAGE_PREVIEW_MIME_PREFIX)) {
    return null
  }

  return {
    mimeType,
    dataUrl,
  }
}

function shouldIgnoreWatchPath(rootPath: string, candidatePath: string) {
  const resolvedCandidatePath = path.resolve(candidatePath)
  const relativePath = path.relative(rootPath, resolvedCandidatePath)

  if (relativePath === '') {
    return false
  }

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return true
  }

  return hasIgnoredWorkspaceSegment(relativePath, WORKSPACE_WATCH_IGNORE_NAMES)
}

function sortWorkspaceTree(nodes: WorkspaceFileNode[]): WorkspaceFileNode[] {
  const sorted: WorkspaceFileNode[] = [...nodes].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'directory' ? -1 : 1
    }
    return fileNameCollator.compare(left.name, right.name)
  })

  return sorted.map((node): WorkspaceFileNode => {
    if (node.kind === 'directory' && node.children) {
      return {
        ...node,
        children: sortWorkspaceTree(node.children),
      }
    }
    return node
  })
}

type BuildWorkspaceTreeResult = {
  nodes: WorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
}

type IndexedWorkspaceEntry = {
  name: string
  absolutePath: string
  kind: 'file' | 'directory'
  isSymbolicLink: boolean
}

async function resolveWorkspaceEntryKind(
  absolutePath: string,
  entry: Dirent,
): Promise<Omit<IndexedWorkspaceEntry, 'name' | 'absolutePath'> | null> {
  if (entry.isFile()) {
    return {
      kind: 'file',
      isSymbolicLink: false,
    }
  }

  if (entry.isDirectory()) {
    return {
      kind: 'directory',
      isSymbolicLink: false,
    }
  }

  if (!entry.isSymbolicLink()) {
    return null
  }

  try {
    const targetStats = await stat(absolutePath)
    if (targetStats.isDirectory()) {
      return {
        kind: 'directory',
        isSymbolicLink: true,
      }
    }
    if (targetStats.isFile()) {
      return {
        kind: 'file',
        isSymbolicLink: true,
      }
    }
  } catch {
    return null
  }

  return null
}

async function collectIndexedWorkspaceEntries(
  directoryPath: string,
): Promise<IndexedWorkspaceEntry[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const indexedEntries: IndexedWorkspaceEntry[] = []

  for (const entry of entries) {
    if (WORKSPACE_INDEX_IGNORE_NAMES.has(entry.name)) {
      continue
    }

    const absolutePath = path.join(directoryPath, entry.name)
    const entryKind = await resolveWorkspaceEntryKind(absolutePath, entry)
    if (!entryKind) {
      continue
    }

    indexedEntries.push({
      name: entry.name,
      absolutePath,
      ...entryKind,
    })
  }

  return indexedEntries
}

async function buildWorkspaceTree(
  rootPath: string,
  currentDirectory: string,
  indexBudget: { remainingNodes: number; truncated: boolean },
  options?: { maxDepth?: number; currentDepth?: number },
): Promise<BuildWorkspaceTreeResult> {
  if (indexBudget.remainingNodes <= 0) {
    indexBudget.truncated = true
    return { nodes: [], childrenStatus: 'complete', totalChildCount: 0 }
  }

  const maxDepth = options?.maxDepth
  const currentDepth = options?.currentDepth ?? 0

  const eligibleEntries = await collectIndexedWorkspaceEntries(currentDirectory)

  const totalChildCount = eligibleEntries.length
  const isCapped = totalChildCount > WORKSPACE_INDEX_DIRECTORY_CHILD_CAP
  const cappedEntries = isCapped
    ? eligibleEntries.slice(0, WORKSPACE_INDEX_DIRECTORY_CHILD_CAP)
    : eligibleEntries
  const atDepthLimit = maxDepth !== undefined && currentDepth >= maxDepth
  const skipRecurse = isCapped || atDepthLimit

  const nodes: WorkspaceFileNode[] = []

  for (const entry of cappedEntries) {
    if (indexBudget.remainingNodes <= 0) {
      indexBudget.truncated = true
      break
    }

    const relativePath = normalizeToWorkspaceRelativePath(
      entry.absolutePath,
      rootPath,
    )

    if (!relativePath || relativePath.startsWith('..')) {
      continue
    }

    if (entry.kind === 'directory') {
      indexBudget.remainingNodes -= 1

      if (skipRecurse || entry.isSymbolicLink) {
        nodes.push({
          name: entry.name,
          relativePath,
          kind: 'directory',
          children: [],
          childrenStatus: 'not-loaded',
        })
        continue
      }

      const childResult = await buildWorkspaceTree(
        rootPath,
        entry.absolutePath,
        indexBudget,
        { maxDepth, currentDepth: currentDepth + 1 },
      )
      nodes.push({
        name: entry.name,
        relativePath,
        kind: 'directory',
        children: childResult.nodes,
        ...(childResult.childrenStatus === 'partial'
          ? {
              childrenStatus: childResult.childrenStatus,
              totalChildCount: childResult.totalChildCount,
            }
          : {}),
      })
      continue
    }

    if (entry.kind === 'file') {
      indexBudget.remainingNodes -= 1
      nodes.push({
        name: entry.name,
        relativePath,
        kind: 'file',
      })
    }
  }

  return {
    nodes: sortWorkspaceTree(nodes),
    childrenStatus: isCapped ? 'partial' : 'complete',
    totalChildCount,
  }
}

async function buildDirectoryChildren(
  rootPath: string,
  directoryPath: string,
  options?: { offset?: number; limit?: number },
): Promise<{
  children: WorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
}> {
  const eligibleEntries = await collectIndexedWorkspaceEntries(directoryPath)

  const nodes: WorkspaceFileNode[] = []
  for (const entry of eligibleEntries) {
    const relativePath = normalizeToWorkspaceRelativePath(
      entry.absolutePath,
      rootPath,
    )
    if (!relativePath || relativePath.startsWith('..')) {
      continue
    }

    if (entry.kind === 'directory') {
      nodes.push({
        name: entry.name,
        relativePath,
        kind: 'directory',
        children: [],
        childrenStatus: 'not-loaded',
      })
      continue
    }

    nodes.push({
      name: entry.name,
      relativePath,
      kind: 'file',
    })
  }

  const sortedNodes = sortWorkspaceTree(nodes)
  const totalChildCount = sortedNodes.length
  const rawOffset = options?.offset
  const parsedOffset =
    typeof rawOffset === 'number' && Number.isFinite(rawOffset)
      ? Math.max(0, Math.floor(rawOffset))
      : 0
  const rawLimit = options?.limit
  const parsedLimit =
    typeof rawLimit === 'number' && Number.isFinite(rawLimit)
      ? Math.max(1, Math.floor(rawLimit))
      : WORKSPACE_INDEX_DIRECTORY_CHILD_CAP
  const effectiveLimit = Math.min(parsedLimit, WORKSPACE_INDEX_DIRECTORY_CHILD_CAP)
  const pagedChildren = sortedNodes.slice(parsedOffset, parsedOffset + effectiveLimit)
  const hasMore = parsedOffset + pagedChildren.length < totalChildCount

  return {
    children: pagedChildren,
    childrenStatus: hasMore ? 'partial' : 'complete',
    totalChildCount,
  }
}

async function handleWorkspaceIndexDirectory(
  _event: IpcMainInvokeEvent,
  request: WorkspaceIndexDirectoryRequest,
): Promise<WorkspaceIndexDirectoryResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath = request?.relativePath
    if (!rootPath || !relativePath) {
      return {
        ok: false,
        children: [],
        childrenStatus: 'complete',
        totalChildCount: 0,
        error: 'rootPath and relativePath are required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath = path.resolve(resolvedRootPath, relativePath)
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
      return {
        ok: false,
        children: [],
        childrenStatus: 'complete',
        totalChildCount: 0,
        error: 'Cannot index directories outside the workspace root.',
      }
    }

    const targetStats = await stat(resolvedTargetPath)
    if (!targetStats.isDirectory()) {
      return {
        ok: false,
        children: [],
        childrenStatus: 'complete',
        totalChildCount: 0,
        error: 'Target path is not a directory.',
      }
    }

    const result = await buildDirectoryChildren(resolvedRootPath, resolvedTargetPath, {
      offset: request.offset,
      limit: request.limit,
    })
    return {
      ok: true,
      children: result.children,
      childrenStatus: result.childrenStatus,
      totalChildCount: result.totalChildCount,
    }
  } catch (error) {
    return {
      ok: false,
      children: [],
      childrenStatus: 'complete',
      totalChildCount: 0,
      error: error instanceof Error ? error.message : 'Failed to index directory',
    }
  }
}

async function handleWorkspaceSearchFiles(
  _event: IpcMainInvokeEvent,
  request: WorkspaceSearchFilesRequest,
): Promise<WorkspaceSearchFilesResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        results: [],
        truncated: false,
        skippedLargeDirectoryCount: 0,
        depthLimitHit: false,
        timedOut: false,
        error: 'rootPath is required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        results: [],
        truncated: false,
        skippedLargeDirectoryCount: 0,
        depthLimitHit: false,
        timedOut: false,
        error: 'Selected workspace root is not a directory.',
      }
    }

    const searchResult = await searchWorkspaceFilesByName({
      rootPath: resolvedRootPath,
      query: request?.query ?? '',
      maxDepth: request?.maxDepth,
      maxResults: request?.maxResults,
      maxDirectoryChildren: request?.maxDirectoryChildren,
      timeBudgetMs: request?.timeBudgetMs,
      collectEntries: collectIndexedWorkspaceEntries,
      normalizeRelativePath: normalizeToWorkspaceRelativePath,
    })

    return {
      ok: true,
      ...searchResult,
    }
  } catch (error) {
    return {
      ok: false,
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      depthLimitHit: false,
      timedOut: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to search files.',
    }
  }
}

async function handleWorkspaceOpenDialog(): Promise<WorkspaceOpenDialogResult> {
  try {
    const targetWindow = win ?? BrowserWindow.getFocusedWindow() ?? null
    const dialogResult = targetWindow
      ? await dialog.showOpenDialog(targetWindow, {
          properties: ['openDirectory'],
        })
      : await dialog.showOpenDialog({
        properties: ['openDirectory'],
        })

    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return {
        canceled: true,
        selectedPath: null,
      }
    }

    return {
      canceled: false,
      selectedPath: dialogResult.filePaths[0],
    }
  } catch (error) {
    return {
      canceled: true,
      selectedPath: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function handleWorkspaceIndex(
  _event: IpcMainInvokeEvent,
  request: WorkspaceIndexRequest,
): Promise<WorkspaceIndexResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        fileTree: [],
        error: 'rootPath is required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        fileTree: [],
        truncated: false,
        error: 'Selected workspace root is not a directory.',
      }
    }

    const indexBudget = {
      remainingNodes: MAX_WORKSPACE_INDEX_NODES,
      truncated: false,
    }
    const treeResult = await buildWorkspaceTree(
      resolvedRootPath,
      resolvedRootPath,
      indexBudget,
    )
    return {
      ok: true,
      fileTree: treeResult.nodes,
      truncated: indexBudget.truncated,
    }
  } catch (error) {
    return {
      ok: false,
      fileTree: [],
      truncated: false,
      error: error instanceof Error ? error.message : 'Failed to index workspace',
    }
  }
}

async function handleWorkspaceReadFile(
  _event: IpcMainInvokeEvent,
  request: WorkspaceReadFileRequest,
): Promise<WorkspaceReadFileResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath = request?.relativePath
    if (!rootPath || !relativePath) {
      return {
        ok: false,
        content: null,
        error: 'rootPath and relativePath are required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath = path.resolve(resolvedRootPath, relativePath)
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
      return {
        ok: false,
        content: null,
        error: 'Cannot read files outside the workspace root.',
      }
    }

    const targetStats = await stat(resolvedTargetPath)
    if (!targetStats.isFile()) {
      return {
        ok: false,
        content: null,
        error: 'Selected path is not a file.',
      }
    }

    if (targetStats.size > MAX_FILE_PREVIEW_BYTES) {
      return {
        ok: true,
        content: null,
        previewUnavailableReason: 'file_too_large',
      }
    }

    const contentBuffer = await readFile(resolvedTargetPath)
    const extension = path.extname(relativePath).toLowerCase()
    if (BLOCKED_IMAGE_EXTENSIONS.has(extension)) {
      return {
        ok: true,
        content: null,
        previewUnavailableReason: 'blocked_resource',
      }
    }

    const imagePreview = buildImagePreview(relativePath, contentBuffer)
    if (imagePreview) {
      return {
        ok: true,
        content: null,
        imagePreview,
      }
    }
    if (IMAGE_PREVIEW_BY_EXTENSION[extension]) {
      return {
        ok: true,
        content: null,
        previewUnavailableReason: 'blocked_resource',
      }
    }

    if (isLikelyBinaryContent(contentBuffer)) {
      return {
        ok: true,
        content: null,
        previewUnavailableReason: 'binary_file',
      }
    }

    return {
      ok: true,
      content: contentBuffer.toString('utf8'),
    }
  } catch (error) {
    return {
      ok: false,
      content: null,
      error: error instanceof Error ? error.message : 'Failed to read file',
    }
  }
}

const MAX_WRITE_FILE_BYTES = 2 * 1024 * 1024

async function handleWorkspaceWriteFile(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWriteFileRequest,
): Promise<WorkspaceWriteFileResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath = request?.relativePath
    const content = request?.content
    if (!rootPath || !relativePath || typeof content !== 'string') {
      return {
        ok: false,
        error: 'rootPath, relativePath, and content are required.',
      }
    }

    if (Buffer.byteLength(content, 'utf8') > MAX_WRITE_FILE_BYTES) {
      return {
        ok: false,
        error: 'File too large',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath = path.resolve(resolvedRootPath, relativePath)
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
      return {
        ok: false,
        error: 'Cannot write files outside the workspace root.',
      }
    }

    beginWorkspaceWriteOperation()
    try {
      const targetDir = path.dirname(resolvedTargetPath)
      await mkdir(targetDir, { recursive: true })
      await writeFileAtomic(resolvedTargetPath, content)
      return { ok: true }
    } finally {
      endWorkspaceWriteOperation()
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to write file.',
    }
  }
}

async function handleWorkspaceCreateFile(
  _event: IpcMainInvokeEvent,
  request: WorkspaceCreateFileRequest,
): Promise<WorkspaceCreateFileResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath = request?.relativePath
    if (!rootPath || !relativePath) {
      return { ok: false, error: 'rootPath and relativePath are required.' }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath = path.resolve(resolvedRootPath, relativePath)
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
      return { ok: false, error: 'Cannot create files outside the workspace root.' }
    }

    try {
      await stat(resolvedTargetPath)
      return { ok: false, error: 'File already exists.' }
    } catch (statError) {
      if ((statError as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw statError
      }
    }

    beginWorkspaceWriteOperation()
    try {
      const targetDir = path.dirname(resolvedTargetPath)
      await mkdir(targetDir, { recursive: true })
      await writeFile(resolvedTargetPath, '')
      return { ok: true }
    } finally {
      endWorkspaceWriteOperation()
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to create file.',
    }
  }
}

async function handleWorkspaceCreateDirectory(
  _event: IpcMainInvokeEvent,
  request: WorkspaceCreateDirectoryRequest,
): Promise<WorkspaceCreateDirectoryResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath = request?.relativePath
    if (!rootPath || !relativePath) {
      return { ok: false, error: 'rootPath and relativePath are required.' }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath = path.resolve(resolvedRootPath, relativePath)
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
      return { ok: false, error: 'Cannot create directories outside the workspace root.' }
    }

    try {
      await stat(resolvedTargetPath)
      return { ok: false, error: 'Directory already exists.' }
    } catch (statError) {
      if ((statError as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw statError
      }
    }

    beginWorkspaceWriteOperation()
    try {
      await mkdir(resolvedTargetPath, { recursive: true })
      return { ok: true }
    } finally {
      endWorkspaceWriteOperation()
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to create directory.',
    }
  }
}

async function handleWorkspaceDeleteFile(
  _event: IpcMainInvokeEvent,
  request: WorkspaceDeleteFileRequest,
): Promise<WorkspaceDeleteFileResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath = request?.relativePath
    if (!rootPath || !relativePath) {
      return { ok: false, error: 'rootPath and relativePath are required.' }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath = path.resolve(resolvedRootPath, relativePath)
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
      return { ok: false, error: 'Cannot delete files outside the workspace root.' }
    }

    let targetStats
    try {
      targetStats = await stat(resolvedTargetPath)
    } catch (statError) {
      if ((statError as NodeJS.ErrnoException).code === 'ENOENT') {
        return { ok: false, error: 'File not found.' }
      }
      throw statError
    }

    if (!targetStats.isFile()) {
      return { ok: false, error: 'Target path is not a file.' }
    }

    beginWorkspaceWriteOperation()
    try {
      await unlink(resolvedTargetPath)
      return { ok: true }
    } finally {
      endWorkspaceWriteOperation()
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete file.',
    }
  }
}

async function handleWorkspaceDeleteDirectory(
  _event: IpcMainInvokeEvent,
  request: WorkspaceDeleteDirectoryRequest,
): Promise<WorkspaceDeleteDirectoryResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath = request?.relativePath
    if (!rootPath || !relativePath) {
      return { ok: false, error: 'rootPath and relativePath are required.' }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath = path.resolve(resolvedRootPath, relativePath)
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
      return { ok: false, error: 'Cannot delete directories outside the workspace root.' }
    }

    let targetStats
    try {
      targetStats = await stat(resolvedTargetPath)
    } catch (statError) {
      if ((statError as NodeJS.ErrnoException).code === 'ENOENT') {
        return { ok: false, error: 'Directory not found.' }
      }
      throw statError
    }

    if (!targetStats.isDirectory()) {
      return { ok: false, error: 'Target path is not a directory.' }
    }

    beginWorkspaceWriteOperation()
    try {
      await rm(resolvedTargetPath, { recursive: true, force: true })
      return { ok: true }
    } finally {
      endWorkspaceWriteOperation()
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete directory.',
    }
  }
}

async function handleWorkspaceRename(
  _event: IpcMainInvokeEvent,
  request: WorkspaceRenameRequest,
): Promise<WorkspaceRenameResult> {
  try {
    const rootPath = request?.rootPath
    const oldRelativePath = request?.oldRelativePath
    const newRelativePath = request?.newRelativePath
    if (!rootPath || !oldRelativePath || !newRelativePath) {
      return { ok: false, error: 'rootPath, oldRelativePath, and newRelativePath are required.' }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedOldPath = path.resolve(resolvedRootPath, oldRelativePath)
    const resolvedNewPath = path.resolve(resolvedRootPath, newRelativePath)

    if (!isPathInsideWorkspace(resolvedRootPath, resolvedOldPath)) {
      return { ok: false, error: 'Cannot rename paths outside the workspace root.' }
    }
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedNewPath)) {
      return { ok: false, error: 'Cannot rename to a path outside the workspace root.' }
    }

    try {
      await stat(resolvedOldPath)
    } catch (statError) {
      if ((statError as NodeJS.ErrnoException).code === 'ENOENT') {
        return { ok: false, error: 'Source path not found.' }
      }
      throw statError
    }

    try {
      await stat(resolvedNewPath)
      return { ok: false, error: 'A file or directory already exists at the target path.' }
    } catch (statError) {
      if ((statError as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw statError
      }
    }

    const targetDir = path.dirname(resolvedNewPath)
    await mkdir(targetDir, { recursive: true })

    beginWorkspaceWriteOperation()
    try {
      await rename(resolvedOldPath, resolvedNewPath)
      return { ok: true }
    } finally {
      endWorkspaceWriteOperation()
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to rename.',
    }
  }
}

async function handleWorkspaceGetGitLineMarkers(
  _event: IpcMainInvokeEvent,
  request: WorkspaceGetGitLineMarkersRequest,
): Promise<WorkspaceGetGitLineMarkersResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath = request?.relativePath
    if (!rootPath || !relativePath) {
      return {
        ok: false,
        markers: [],
        error: 'rootPath and relativePath are required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        markers: [],
        error: 'Selected workspace root is not a directory.',
      }
    }

    const resolvedTargetPath = path.resolve(resolvedRootPath, relativePath)
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
      return {
        ok: false,
        markers: [],
        error: 'Cannot read files outside the workspace root.',
      }
    }

    try {
      const targetStats = await stat(resolvedTargetPath)
      if (!targetStats.isFile()) {
        return {
          ok: true,
          markers: [],
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          ok: true,
          markers: [],
        }
      }
      throw error
    }

    await runGitCommand(resolvedRootPath, ['rev-parse', '--is-inside-work-tree'])
    await runGitCommand(resolvedRootPath, ['rev-parse', '--verify', 'HEAD'])
    const diffText = await runGitCommand(resolvedRootPath, [
      'diff',
      '--no-color',
      '--unified=0',
      'HEAD',
      '--',
      relativePath,
    ])

    return {
      ok: true,
      markers: parseGitDiffLineMarkers(diffText),
    }
  } catch (error) {
    return {
      ok: false,
      markers: [],
      error:
        error instanceof Error
          ? error.message
          : 'Failed to read git line markers.',
    }
  }
}

async function handleWorkspaceGetGitFileStatuses(
  _event: IpcMainInvokeEvent,
  request: WorkspaceGetGitFileStatusesRequest,
): Promise<WorkspaceGetGitFileStatusesResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        statuses: {},
        error: 'rootPath is required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        statuses: {},
        error: 'Selected workspace root is not a directory.',
      }
    }

    await runGitCommand(resolvedRootPath, ['rev-parse', '--is-inside-work-tree'])
    const statusOutput = await runGitCommand(resolvedRootPath, [
      'status',
      '--porcelain',
    ])

    return {
      ok: true,
      statuses: parseGitStatusPorcelain(statusOutput),
    }
  } catch (error) {
    return {
      ok: false,
      statuses: {},
      error:
        error instanceof Error
          ? error.message
          : 'Failed to read git file statuses.',
    }
  }
}

async function handleWorkspaceReadComments(
  _event: IpcMainInvokeEvent,
  request: WorkspaceReadCommentsRequest,
): Promise<WorkspaceReadCommentsResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        comments: [],
        error: 'rootPath is required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        comments: [],
        error: 'Selected workspace root is not a directory.',
      }
    }

    const { commentsJsonPath } = getWorkspaceCommentPaths(resolvedRootPath)
    if (!ensurePathWithinWorkspace(resolvedRootPath, commentsJsonPath)) {
      return {
        ok: false,
        comments: [],
        error: 'Cannot read comments outside the workspace root.',
      }
    }

    let rawJson = ''
    try {
      rawJson = await readFile(commentsJsonPath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          ok: true,
          comments: [],
        }
      }
      throw error
    }

    const parsedComments = JSON.parse(rawJson)
    if (!Array.isArray(parsedComments)) {
      return {
        ok: false,
        comments: [],
        error: 'Invalid comments file format: expected an array.',
      }
    }

    return {
      ok: true,
      comments: parsedComments as CodeCommentRecord[],
    }
  } catch (error) {
    return {
      ok: false,
      comments: [],
      error: error instanceof Error ? error.message : 'Failed to read comments.',
    }
  }
}

async function handleWorkspaceWriteComments(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWriteCommentsRequest,
): Promise<WorkspaceWriteCommentsResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        error: 'rootPath is required.',
      }
    }

    if (!Array.isArray(request.comments)) {
      return {
        ok: false,
        error: 'comments must be an array.',
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

    const { metadataDirectoryPath, commentsJsonPath } =
      getWorkspaceCommentPaths(resolvedRootPath)
    if (
      !ensurePathWithinWorkspace(resolvedRootPath, metadataDirectoryPath) ||
      !ensurePathWithinWorkspace(resolvedRootPath, commentsJsonPath)
    ) {
      return {
        ok: false,
        error: 'Cannot write comments outside the workspace root.',
      }
    }

    beginWorkspaceWriteOperation()
    try {
      await mkdir(metadataDirectoryPath, { recursive: true })
      const serializedComments = `${JSON.stringify(request.comments, null, 2)}\n`
      await writeFileAtomic(commentsJsonPath, serializedComments)
      return { ok: true }
    } finally {
      endWorkspaceWriteOperation()
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to write comments.',
    }
  }
}

async function handleWorkspaceReadGlobalComments(
  _event: IpcMainInvokeEvent,
  request: WorkspaceReadGlobalCommentsRequest,
): Promise<WorkspaceReadGlobalCommentsResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        body: '',
        error: 'rootPath is required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        body: '',
        error: 'Selected workspace root is not a directory.',
      }
    }

    const { globalCommentsPath } = getWorkspaceCommentPaths(resolvedRootPath)
    if (!ensurePathWithinWorkspace(resolvedRootPath, globalCommentsPath)) {
      return {
        ok: false,
        body: '',
        error: 'Cannot read global comments outside the workspace root.',
      }
    }

    try {
      const body = await readFile(globalCommentsPath, 'utf8')
      return {
        ok: true,
        body,
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          ok: true,
          body: '',
        }
      }
      throw error
    }
  } catch (error) {
    return {
      ok: false,
      body: '',
      error:
        error instanceof Error
          ? error.message
          : 'Failed to read global comments.',
    }
  }
}

async function handleWorkspaceWriteGlobalComments(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWriteGlobalCommentsRequest,
): Promise<WorkspaceWriteGlobalCommentsResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        error: 'rootPath is required.',
      }
    }

    if (typeof request.body !== 'string') {
      return {
        ok: false,
        error: 'body must be a string.',
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

    const { metadataDirectoryPath, globalCommentsPath } =
      getWorkspaceCommentPaths(resolvedRootPath)
    if (
      !ensurePathWithinWorkspace(resolvedRootPath, metadataDirectoryPath) ||
      !ensurePathWithinWorkspace(resolvedRootPath, globalCommentsPath)
    ) {
      return {
        ok: false,
        error: 'Cannot write global comments outside the workspace root.',
      }
    }

    beginWorkspaceWriteOperation()
    try {
      await mkdir(metadataDirectoryPath, { recursive: true })
      await writeFileAtomic(globalCommentsPath, request.body)
      return { ok: true }
    } finally {
      endWorkspaceWriteOperation()
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to write global comments.',
    }
  }
}

async function handleWorkspaceExportCommentsBundle(
  _event: IpcMainInvokeEvent,
  request: WorkspaceExportCommentsBundleRequest,
): Promise<WorkspaceExportCommentsBundleResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        error: 'rootPath is required.',
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

    if (!request.writeCommentsFile && !request.writeBundleFile) {
      return {
        ok: false,
        error: 'At least one export target must be selected.',
      }
    }

    const {
      metadataDirectoryPath,
      bundleExportsDirectoryPath,
      commentsMarkdownPath,
    } = getWorkspaceCommentPaths(resolvedRootPath)
    if (
      !ensurePathWithinWorkspace(resolvedRootPath, metadataDirectoryPath) ||
      !ensurePathWithinWorkspace(resolvedRootPath, bundleExportsDirectoryPath) ||
      !ensurePathWithinWorkspace(resolvedRootPath, commentsMarkdownPath)
    ) {
      return {
        ok: false,
        error: 'Cannot export comments outside the workspace root.',
      }
    }

    beginWorkspaceWriteOperation()
    try {
      let exportedCommentsPath: string | undefined
      let exportedBundlePath: string | undefined

      if (request.writeCommentsFile) {
        if (typeof request.commentsMarkdown !== 'string') {
          return {
            ok: false,
            error: 'commentsMarkdown is required when writeCommentsFile is enabled.',
          }
        }
        await writeFileAtomic(commentsMarkdownPath, request.commentsMarkdown)
        exportedCommentsPath = commentsMarkdownPath
      }

      if (request.writeBundleFile) {
        if (typeof request.bundleMarkdown !== 'string') {
          return {
            ok: false,
            error: 'bundleMarkdown is required when writeBundleFile is enabled.',
          }
        }
        await mkdir(bundleExportsDirectoryPath, { recursive: true })
        const fileName = `${toBundleTimestamp()}-comments-bundle.md`
        const bundlePath = path.join(bundleExportsDirectoryPath, fileName)
        if (!ensurePathWithinWorkspace(resolvedRootPath, bundlePath)) {
          return {
            ok: false,
            error: 'Cannot export bundle outside the workspace root.',
          }
        }
        await writeFileAtomic(bundlePath, request.bundleMarkdown)
        exportedBundlePath = bundlePath
      }

      return {
        ok: true,
        commentsPath: exportedCommentsPath,
        bundlePath: exportedBundlePath,
      }
    } finally {
      endWorkspaceWriteOperation()
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to export comments bundle.',
    }
  }
}

function openDirectoryWithApplication(
  applicationName: string,
  directoryPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'open',
      ['-a', applicationName, directoryPath],
      (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      },
    )
  })
}

async function handleSystemOpenInApplication(
  request: SystemOpenInRequest,
  applicationName: string,
): Promise<SystemOpenInResult> {
  try {
    if (process.platform !== 'darwin') {
      return {
        ok: false,
        error: 'Open in app is only supported on macOS.',
      }
    }

    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        error: 'rootPath is required.',
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

    await openDirectoryWithApplication(applicationName, resolvedRootPath)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : `Failed to open workspace in ${applicationName}.`,
    }
  }
}

async function handleSystemOpenInIterm(
  _event: IpcMainInvokeEvent,
  request: SystemOpenInRequest,
): Promise<SystemOpenInResult> {
  return handleSystemOpenInApplication(request, 'iTerm')
}

async function handleSystemOpenInVsCode(
  _event: IpcMainInvokeEvent,
  request: SystemOpenInRequest,
): Promise<SystemOpenInResult> {
  return handleSystemOpenInApplication(request, 'Visual Studio Code')
}

async function handleSystemOpenInFinder(
  _event: IpcMainInvokeEvent,
  request: SystemOpenInRequest,
): Promise<SystemOpenInResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        error: 'rootPath is required.',
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

    const errorMessage = await shell.openPath(resolvedRootPath)
    if (errorMessage) {
      return {
        ok: false,
        error: errorMessage,
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to open workspace in Finder.',
    }
  }
}

function sendWorkspaceWatchEvent(payload: WorkspaceWatchEventPayload) {
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:watchEvent', payload)
}

function sendWorkspaceWatchFallbackEvent(payload: WorkspaceWatchFallbackEvent) {
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:watchFallback', payload)
}

function sendWorkspaceRemoteConnectionEvent(payload: RemoteConnectionEvent) {
  queueRemoteAgentLog({
    at: new Date().toISOString(),
    source: 'remoteConnectionEvent',
    workspaceId: payload.workspaceId,
    sessionId: payload.sessionId ?? null,
    state: payload.state,
    errorCode: payload.errorCode ?? null,
    message: sanitizeRemoteLogMessage(payload.message),
    occurredAt: payload.occurredAt,
  })
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:remoteConnectionEvent', payload)
}

function sendWorkspaceHistoryNavigationEvent(
  payload: WorkspaceHistoryNavigationEventPayload,
) {
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:historyNavigate', payload)
}

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

type WorkspacePollingSnapshot = {
  fileMetadataByRelativePath: Map<string, string>
  directoryPaths: Set<string>
}

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

async function createNativeWorkspaceWatcherEntry(
  workspaceId: string,
  resolvedRootPath: string,
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
      void switchToPollingFallback(workspaceId, resolvedRootPath)
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

async function switchToPollingFallback(
  workspaceId: string,
  resolvedRootPath: string,
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
      WORKSPACE_WATCH_POLL_INTERVAL_MS,
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

async function stopAllWorkspaceWatchers() {
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

async function handleWorkspaceWatchStart(
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
          ? await createNativeWorkspaceWatcherEntry(workspaceId, resolvedRootPath)
          : await createPollingWorkspaceWatcherEntry(
            workspaceId,
            resolvedRootPath,
            WORKSPACE_WATCH_POLL_INTERVAL_MS,
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
        WORKSPACE_WATCH_POLL_INTERVAL_MS,
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

async function handleWorkspaceWatchStop(
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

const DUMMY_IPC_EVENT = {} as IpcMainInvokeEvent

const localWorkspaceBackend = createLocalWorkspaceBackend({
  index: async (request) => handleWorkspaceIndex(DUMMY_IPC_EVENT, request),
  indexDirectory: async (request) =>
    handleWorkspaceIndexDirectory(DUMMY_IPC_EVENT, request),
  searchFiles: async (request) =>
    handleWorkspaceSearchFiles(DUMMY_IPC_EVENT, request),
  readFile: async (request) => handleWorkspaceReadFile(DUMMY_IPC_EVENT, request),
  writeFile: async (request) =>
    handleWorkspaceWriteFile(DUMMY_IPC_EVENT, request),
  createFile: async (request) =>
    handleWorkspaceCreateFile(DUMMY_IPC_EVENT, request),
  createDirectory: async (request) =>
    handleWorkspaceCreateDirectory(DUMMY_IPC_EVENT, request),
  deleteFile: async (request) =>
    handleWorkspaceDeleteFile(DUMMY_IPC_EVENT, request),
  deleteDirectory: async (request) =>
    handleWorkspaceDeleteDirectory(DUMMY_IPC_EVENT, request),
  rename: async (request) => handleWorkspaceRename(DUMMY_IPC_EVENT, request),
  getGitLineMarkers: async (request) =>
    handleWorkspaceGetGitLineMarkers(DUMMY_IPC_EVENT, request),
  getGitFileStatuses: async (request) =>
    handleWorkspaceGetGitFileStatuses(DUMMY_IPC_EVENT, request),
  readComments: async (request) =>
    handleWorkspaceReadComments(DUMMY_IPC_EVENT, request),
  writeComments: async (request) =>
    handleWorkspaceWriteComments(DUMMY_IPC_EVENT, request),
  readGlobalComments: async (request) =>
    handleWorkspaceReadGlobalComments(DUMMY_IPC_EVENT, request),
  writeGlobalComments: async (request) =>
    handleWorkspaceWriteGlobalComments(DUMMY_IPC_EVENT, request),
  exportCommentsBundle: async (request) =>
    handleWorkspaceExportCommentsBundle(DUMMY_IPC_EVENT, request),
  watchStart: async (request) =>
    handleWorkspaceWatchStart(DUMMY_IPC_EVENT, request),
  watchStop: async (request) =>
    handleWorkspaceWatchStop(DUMMY_IPC_EVENT, request),
})

const workspaceBackendRouter = new WorkspaceBackendRouter(localWorkspaceBackend)

function toBackendErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  try {
    const normalized = toRemoteAgentError(error)
    return redactRemoteErrorMessage(normalized.message, fallbackMessage)
  } catch {
    if (error instanceof Error) {
      return redactRemoteErrorMessage(error.message, fallbackMessage)
    }
    return fallbackMessage
  }
}

async function handleWorkspaceIndexRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceIndexRequest,
): Promise<WorkspaceIndexResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.index(request)) as WorkspaceIndexResult
  } catch (error) {
    return {
      ok: false,
      fileTree: [],
      error: toBackendErrorMessage(error, 'Failed to index workspace'),
    }
  }
}

async function handleWorkspaceIndexDirectoryRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceIndexDirectoryRequest,
): Promise<WorkspaceIndexDirectoryResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.indexDirectory(request)) as WorkspaceIndexDirectoryResult
  } catch (error) {
    return {
      ok: false,
      children: [],
      childrenStatus: 'complete',
      totalChildCount: 0,
      error: toBackendErrorMessage(error, 'Failed to index directory'),
    }
  }
}

async function handleWorkspaceSearchFilesRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceSearchFilesRequest,
): Promise<WorkspaceSearchFilesResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.searchFiles(request)) as WorkspaceSearchFilesResult
  } catch (error) {
    return {
      ok: false,
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      depthLimitHit: false,
      timedOut: false,
      error: toBackendErrorMessage(error, 'Failed to search files'),
    }
  }
}

async function handleWorkspaceReadFileRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceReadFileRequest,
): Promise<WorkspaceReadFileResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.readFile(request)) as WorkspaceReadFileResult
  } catch (error) {
    return {
      ok: false,
      content: null,
      error: toBackendErrorMessage(error, 'Failed to read file'),
    }
  }
}

async function handleWorkspaceWriteFileRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWriteFileRequest,
): Promise<WorkspaceWriteFileResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.writeFile(request)) as WorkspaceWriteFileResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to write file.'),
    }
  }
}

async function handleWorkspaceCreateFileRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceCreateFileRequest,
): Promise<WorkspaceCreateFileResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.createFile(request)) as WorkspaceCreateFileResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to create file.'),
    }
  }
}

async function handleWorkspaceCreateDirectoryRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceCreateDirectoryRequest,
): Promise<WorkspaceCreateDirectoryResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.createDirectory(request)) as WorkspaceCreateDirectoryResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to create directory.'),
    }
  }
}

async function handleWorkspaceDeleteFileRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceDeleteFileRequest,
): Promise<WorkspaceDeleteFileResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.deleteFile(request)) as WorkspaceDeleteFileResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to delete file.'),
    }
  }
}

async function handleWorkspaceDeleteDirectoryRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceDeleteDirectoryRequest,
): Promise<WorkspaceDeleteDirectoryResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.deleteDirectory(request)) as WorkspaceDeleteDirectoryResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to delete directory.'),
    }
  }
}

async function handleWorkspaceRenameRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceRenameRequest,
): Promise<WorkspaceRenameResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.rename(request)) as WorkspaceRenameResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to rename.'),
    }
  }
}

async function handleWorkspaceGetGitLineMarkersRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceGetGitLineMarkersRequest,
): Promise<WorkspaceGetGitLineMarkersResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.getGitLineMarkers(request)) as WorkspaceGetGitLineMarkersResult
  } catch (error) {
    return {
      ok: false,
      markers: [],
      error: toBackendErrorMessage(error, 'Failed to read git line markers.'),
    }
  }
}

async function handleWorkspaceGetGitFileStatusesRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceGetGitFileStatusesRequest,
): Promise<WorkspaceGetGitFileStatusesResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.getGitFileStatuses(request)) as WorkspaceGetGitFileStatusesResult
  } catch (error) {
    return {
      ok: false,
      statuses: {},
      error: toBackendErrorMessage(error, 'Failed to read git file statuses.'),
    }
  }
}

async function handleWorkspaceReadCommentsRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceReadCommentsRequest,
): Promise<WorkspaceReadCommentsResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.readComments(request)) as WorkspaceReadCommentsResult
  } catch (error) {
    return {
      ok: false,
      comments: [],
      error: toBackendErrorMessage(error, 'Failed to read comments.'),
    }
  }
}

async function handleWorkspaceWriteCommentsRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWriteCommentsRequest,
): Promise<WorkspaceWriteCommentsResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.writeComments(request)) as WorkspaceWriteCommentsResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to write comments.'),
    }
  }
}

async function handleWorkspaceReadGlobalCommentsRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceReadGlobalCommentsRequest,
): Promise<WorkspaceReadGlobalCommentsResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.readGlobalComments(request)) as WorkspaceReadGlobalCommentsResult
  } catch (error) {
    return {
      ok: false,
      body: '',
      error: toBackendErrorMessage(error, 'Failed to read global comments.'),
    }
  }
}

async function handleWorkspaceWriteGlobalCommentsRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWriteGlobalCommentsRequest,
): Promise<WorkspaceWriteGlobalCommentsResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.writeGlobalComments(request)) as WorkspaceWriteGlobalCommentsResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to write global comments.'),
    }
  }
}

async function handleWorkspaceExportCommentsBundleRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceExportCommentsBundleRequest,
): Promise<WorkspaceExportCommentsBundleResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.exportCommentsBundle(request)) as WorkspaceExportCommentsBundleResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to export comments bundle.'),
    }
  }
}

async function handleWorkspaceWatchStartRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWatchStartRequest,
): Promise<WorkspaceWatchControlResult> {
  try {
    const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
    return (await backend.watchStart(request)) as WorkspaceWatchControlResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to start workspace watcher.'),
    }
  }
}

async function handleWorkspaceWatchStopRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWatchStopRequest,
): Promise<WorkspaceWatchControlResult> {
  try {
    const workspaceId = request?.workspaceId
    if (!workspaceId) {
      return {
        ok: false,
        error: 'workspaceId is required.',
      }
    }

    const remoteRootPath = workspaceBackendRouter.getRemoteRootPath(workspaceId)
    if (remoteRootPath) {
      const backend = workspaceBackendRouter.resolveByRootPath(remoteRootPath)
      return (await backend.watchStop(request)) as WorkspaceWatchControlResult
    }

    return (await localWorkspaceBackend.watchStop(
      request,
    )) as WorkspaceWatchControlResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to stop workspace watcher.'),
    }
  }
}

async function handleWorkspaceConnectRemote(
  _event: IpcMainInvokeEvent,
  request: WorkspaceConnectRemoteRequest,
): Promise<RemoteConnectResult> {
  const profile = request?.profile
  if (!profile) {
    return {
      ok: false,
      workspaceId: '',
      errorCode: 'UNKNOWN',
      error: 'profile is required.',
    }
  }

  queueRemoteAgentLog({
    at: new Date().toISOString(),
    source: 'connectRemote.request',
    workspaceId: profile.workspaceId ?? null,
    host: profile.host ?? null,
    user: profile.user ?? null,
    port: profile.port ?? null,
    remoteRoot: profile.remoteRoot ?? null,
    agentPath: profile.agentPath ?? null,
    hasIdentityFile:
      typeof profile.identityFile === 'string' && profile.identityFile.trim().length > 0,
  })

  const connectResult = await remoteConnectionService.connect(profile)
  if (!connectResult.ok) {
    queueRemoteAgentLog({
      at: new Date().toISOString(),
      source: 'connectRemote.result',
      ok: false,
      workspaceId: connectResult.workspaceId,
      errorCode: connectResult.errorCode,
      error: sanitizeRemoteLogMessage(connectResult.error),
    })
    return connectResult
  }

  queueRemoteAgentLog({
    at: new Date().toISOString(),
    source: 'connectRemote.result',
    ok: true,
    workspaceId: connectResult.workspaceId,
    sessionId: connectResult.sessionId,
    rootPath: connectResult.rootPath,
    remoteConnectionState: connectResult.remoteConnectionState,
  })

  const remoteBackend = createRemoteWorkspaceBackend({
    workspaceId: connectResult.workspaceId,
    rootPath: connectResult.rootPath,
    requestRemote: async (workspaceId, method, params) =>
      remoteConnectionService.request(workspaceId, method, params),
    subscribeAgentEvents: (workspaceId, listener) =>
      remoteConnectionService.onAgentEvent(workspaceId, listener),
    sendWatchEvent: sendWorkspaceWatchEvent,
    sendWatchFallback: sendWorkspaceWatchFallbackEvent,
  })

  workspaceBackendRouter.registerRemoteWorkspace({
    workspaceId: connectResult.workspaceId,
    rootPath: connectResult.rootPath,
    backend: remoteBackend,
  })

  return connectResult
}

async function handleWorkspaceBrowseRemoteDirectories(
  _event: IpcMainInvokeEvent,
  payload: WorkspaceBrowseRemoteDirectoriesRequest,
): Promise<WorkspaceBrowseRemoteDirectoriesResult> {
  const request = payload?.request
  if (!request) {
    return {
      ok: false,
      currentPath: '',
      entries: [],
      truncated: false,
      errorCode: 'UNKNOWN',
      error: 'request is required.',
    }
  }

  queueRemoteAgentLog({
    at: new Date().toISOString(),
    source: 'remoteBrowse.request',
    host: request.host ?? null,
    user: request.user ?? null,
    port: request.port ?? null,
    targetPath: request.targetPath ?? null,
    hasIdentityFile:
      typeof request.identityFile === 'string' && request.identityFile.trim().length > 0,
    limit: request.limit ?? null,
  })

  try {
    const result = await browseRemoteDirectories(request)
    queueRemoteAgentLog({
      at: new Date().toISOString(),
      source: 'remoteBrowse.result',
      ok: true,
      currentPath: result.currentPath,
      entryCount: result.entries.length,
      truncated: result.truncated,
    })

    return {
      ok: true,
      currentPath: result.currentPath,
      entries: result.entries,
      truncated: result.truncated,
    }
  } catch (error) {
    const normalized = toRemoteAgentError(error, 'UNKNOWN')
    const sanitizedError = redactRemoteErrorMessage(
      normalized.message,
      'Failed to browse remote directories.',
    )

    queueRemoteAgentLog({
      at: new Date().toISOString(),
      source: 'remoteBrowse.result',
      ok: false,
      errorCode: normalized.code,
      error: sanitizedError,
    })

    return {
      ok: false,
      currentPath: request.targetPath?.trim() ?? '',
      entries: [],
      truncated: false,
      errorCode: normalized.code,
      error: sanitizedError,
    }
  }
}

function sanitizeRemoteLogMessage(message: string | undefined): string | null {
  if (!message || message.trim().length === 0) {
    return null
  }

  const sanitized = redactRemoteErrorMessage(message, '')
  return sanitized.length > 0 ? sanitized : null
}

function queueRemoteAgentLog(payload: Record<string, unknown>): void {
  remoteAgentLogWriteQueue = remoteAgentLogWriteQueue
    .then(async () => {
      const userDataDirectoryPath = app.getPath('userData')
      const logDirectoryPath = path.join(
        userDataDirectoryPath,
        REMOTE_AGENT_LOG_DIRECTORY_NAME,
      )
      const logFilePath = path.join(logDirectoryPath, REMOTE_AGENT_LOG_FILE_NAME)
      await mkdir(logDirectoryPath, { recursive: true })
      await appendFile(logFilePath, `${JSON.stringify(payload)}\n`, 'utf8')
    })
    .catch(() => undefined)
}

async function handleWorkspaceDisconnectRemote(
  _event: IpcMainInvokeEvent,
  request: WorkspaceDisconnectRemoteRequest,
): Promise<RemoteDisconnectResult> {
  const workspaceId = request?.workspaceId
  if (!workspaceId) {
    return {
      ok: false,
      workspaceId: '',
      error: 'workspaceId is required.',
    }
  }

  const disconnectResult = await remoteConnectionService.disconnect(workspaceId)
  await workspaceBackendRouter.unregisterRemoteWorkspaceByWorkspaceId(
    workspaceId.trim(),
  )
  return disconnectResult
}

function registerIpcHandlers() {
  ipcMain.removeHandler('workspace:openDialog')
  ipcMain.removeHandler('workspace:index')
  ipcMain.removeHandler('workspace:indexDirectory')
  ipcMain.removeHandler('workspace:searchFiles')
  ipcMain.removeHandler('workspace:readFile')
  ipcMain.removeHandler('workspace:writeFile')
  ipcMain.removeHandler('workspace:createFile')
  ipcMain.removeHandler('workspace:createDirectory')
  ipcMain.removeHandler('workspace:deleteFile')
  ipcMain.removeHandler('workspace:deleteDirectory')
  ipcMain.removeHandler('workspace:rename')
  ipcMain.removeHandler('workspace:getGitLineMarkers')
  ipcMain.removeHandler('workspace:getGitFileStatuses')
  ipcMain.removeHandler('workspace:readComments')
  ipcMain.removeHandler('workspace:writeComments')
  ipcMain.removeHandler('workspace:readGlobalComments')
  ipcMain.removeHandler('workspace:writeGlobalComments')
  ipcMain.removeHandler('workspace:exportCommentsBundle')
  ipcMain.removeHandler('workspace:watchStart')
  ipcMain.removeHandler('workspace:watchStop')
  ipcMain.removeHandler('workspace:connectRemote')
  ipcMain.removeHandler('workspace:browseRemoteDirectories')
  ipcMain.removeHandler('workspace:disconnectRemote')
  ipcMain.removeHandler('system:openInIterm')
  ipcMain.removeHandler('system:openInVsCode')
  ipcMain.removeHandler('system:openInFinder')
  ipcMain.handle('workspace:openDialog', handleWorkspaceOpenDialog)
  ipcMain.handle('workspace:index', handleWorkspaceIndexRouted)
  ipcMain.handle('workspace:indexDirectory', handleWorkspaceIndexDirectoryRouted)
  ipcMain.handle('workspace:searchFiles', handleWorkspaceSearchFilesRouted)
  ipcMain.handle('workspace:readFile', handleWorkspaceReadFileRouted)
  ipcMain.handle('workspace:writeFile', handleWorkspaceWriteFileRouted)
  ipcMain.handle('workspace:createFile', handleWorkspaceCreateFileRouted)
  ipcMain.handle('workspace:createDirectory', handleWorkspaceCreateDirectoryRouted)
  ipcMain.handle('workspace:deleteFile', handleWorkspaceDeleteFileRouted)
  ipcMain.handle('workspace:deleteDirectory', handleWorkspaceDeleteDirectoryRouted)
  ipcMain.handle('workspace:rename', handleWorkspaceRenameRouted)
  ipcMain.handle('workspace:getGitLineMarkers', handleWorkspaceGetGitLineMarkersRouted)
  ipcMain.handle('workspace:getGitFileStatuses', handleWorkspaceGetGitFileStatusesRouted)
  ipcMain.handle('workspace:readComments', handleWorkspaceReadCommentsRouted)
  ipcMain.handle('workspace:writeComments', handleWorkspaceWriteCommentsRouted)
  ipcMain.handle('workspace:readGlobalComments', handleWorkspaceReadGlobalCommentsRouted)
  ipcMain.handle(
    'workspace:writeGlobalComments',
    handleWorkspaceWriteGlobalCommentsRouted,
  )
  ipcMain.handle(
    'workspace:exportCommentsBundle',
    handleWorkspaceExportCommentsBundleRouted,
  )
  ipcMain.handle('workspace:watchStart', handleWorkspaceWatchStartRouted)
  ipcMain.handle('workspace:watchStop', handleWorkspaceWatchStopRouted)
  ipcMain.handle('workspace:connectRemote', handleWorkspaceConnectRemote)
  ipcMain.handle(
    'workspace:browseRemoteDirectories',
    handleWorkspaceBrowseRemoteDirectories,
  )
  ipcMain.handle('workspace:disconnectRemote', handleWorkspaceDisconnectRemote)
  ipcMain.handle('system:openInIterm', handleSystemOpenInIterm)
  ipcMain.handle('system:openInVsCode', handleSystemOpenInVsCode)
  ipcMain.handle('system:openInFinder', handleSystemOpenInFinder)
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'sdd_icon.png'),
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.on('closed', () => {
    win = null
  })

  win.on('app-command', (event, command) => {
    if (command === 'browser-backward') {
      event.preventDefault()
      sendWorkspaceHistoryNavigationEvent({
        direction: 'back',
        source: 'app-command',
      })
      return
    }

    if (command === 'browser-forward') {
      event.preventDefault()
      sendWorkspaceHistoryNavigationEvent({
        direction: 'forward',
        source: 'app-command',
      })
    }
  })

  win.on('swipe', (event, direction) => {
    if (direction === 'right') {
      event.preventDefault()
      sendWorkspaceHistoryNavigationEvent({
        direction: 'back',
        source: 'swipe',
      })
      return
    }

    if (direction === 'left') {
      event.preventDefault()
      sendWorkspaceHistoryNavigationEvent({
        direction: 'forward',
        source: 'swipe',
      })
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  runBackgroundTask(stopAllWorkspaceWatchers(), 'stopAllWorkspaceWatchers')
  runBackgroundTask(
    workspaceBackendRouter.clearRemoteWorkspaces(),
    'clearRemoteWorkspaces',
  )
  runBackgroundTask(remoteConnectionService.shutdown(), 'remoteConnectionService.shutdown')
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('before-quit', (event) => {
  if (hasRequestedQuitWatcherShutdown) {
    return
  }

  hasRequestedQuitWatcherShutdown = true
  event.preventDefault()
  void (async () => {
    const writesSettled = await waitForWorkspaceWritesToSettle(
      QUIT_WRITE_SETTLE_TIMEOUT_MS,
    )
    if (!writesSettled) {
      console.warn(
        `Timed out waiting for workspace writes to settle (${QUIT_WRITE_SETTLE_TIMEOUT_MS}ms).`,
      )
    }

    await Promise.race([
      Promise.all([
        stopAllWorkspaceWatchers(),
        workspaceBackendRouter.clearRemoteWorkspaces(),
        remoteConnectionService.shutdown(),
      ]).then(() => undefined),
      new Promise<void>((resolve) => {
        setTimeout(resolve, QUIT_WATCHER_SHUTDOWN_TIMEOUT_MS)
      }),
    ])

    app.exit(0)
  })().catch((error) => {
    console.warn('before-quit cleanup failed.', error)
    app.exit(0)
  })
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})
