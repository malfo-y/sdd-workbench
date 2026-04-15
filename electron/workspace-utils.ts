/**
 * Shared workspace utility functions and constants extracted from main.ts.
 * Used by workspace-indexing, workspace-ipc-handlers, workspace-watchers, etc.
 */

import { execFile } from 'node:child_process'
import path from 'node:path'
import { isPathInsideWorkspace } from './workspace-path'
import type { WorkspaceFileNode, WorkspaceImagePreview } from './ipc-types'

// ---------------------------------------------------------------------------
// Ignore-list constants
// ---------------------------------------------------------------------------

export const WORKSPACE_INDEX_IGNORE_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
])

export const WORKSPACE_WATCH_IGNORE_NAMES = new Set([
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

// ---------------------------------------------------------------------------
// Size / limit constants
// ---------------------------------------------------------------------------

export const WORKSPACE_INDEX_DIRECTORY_CHILD_CAP = 500
export const MAX_FILE_PREVIEW_BYTES = 10 * 1024 * 1024
export const MAX_WORKSPACE_INDEX_NODES = 100_000
export const MAX_WORKSPACE_POLL_FILES = 10_000
export const MAX_WRITE_FILE_BYTES = 2 * 1024 * 1024

// ---------------------------------------------------------------------------
// Watch constants
// ---------------------------------------------------------------------------

export const WATCH_EVENT_DEBOUNCE_MS = 300
export const WORKSPACE_WATCH_POLL_INTERVAL_MS = 1500
export const WATCHABLE_FILE_EVENTS = new Set(['add', 'change', 'unlink'])
export const WATCHABLE_STRUCTURE_EVENTS = new Set(['add', 'unlink', 'addDir', 'unlinkDir'])

// ---------------------------------------------------------------------------
// Remote agent log constants
// ---------------------------------------------------------------------------

export const REMOTE_AGENT_LOG_DIRECTORY_NAME = 'logs'
export const REMOTE_AGENT_LOG_FILE_NAME = 'remote-agent.log'

// ---------------------------------------------------------------------------
// Image / preview constants
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_PREVIEW_MIME_PREFIX = 'data:image/'
export const BLOCKED_IMAGE_EXTENSIONS = new Set(['.svg'])
export const IMAGE_PREVIEW_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

// ---------------------------------------------------------------------------
// Comments constants
// ---------------------------------------------------------------------------

export const SDD_WORKBENCH_DIRECTORY = '.sdd-workbench'
export const COMMENTS_FILE_NAME = 'comments.json'
export const GLOBAL_COMMENTS_FILE_NAME = 'global-comments.md'
export const COMMENTS_BUNDLE_EXPORT_DIRECTORY = 'exports'
export const COMMENTS_MARKDOWN_FILE_NAME = '_COMMENTS.md'

// ---------------------------------------------------------------------------
// Collator
// ---------------------------------------------------------------------------

export const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

// ---------------------------------------------------------------------------
// Path utility functions
// ---------------------------------------------------------------------------

export function normalizeToWorkspaceRelativePath(absolutePath: string, rootPath: string) {
  return path.relative(rootPath, absolutePath).split(path.sep).join('/')
}

export function hasIgnoredWorkspaceSegment(
  relativePath: string,
  ignoreNames: Set<string> = WORKSPACE_INDEX_IGNORE_NAMES,
) {
  const normalizedPath = relativePath.split(path.sep).join('/')
  return normalizedPath
    .split('/')
    .filter((segment) => segment.length > 0)
    .some((segment) => ignoreNames.has(segment))
}

export function isPathWithinWorkspace(rootPath: string, targetPath: string): boolean {
  const resolvedRootPath = path.resolve(rootPath)
  const resolvedTargetPath = path.resolve(targetPath)
  return isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)
}

// Compatibility alias retained for existing callers that still use the older name.
export const ensurePathWithinWorkspace = isPathWithinWorkspace

export function shouldIgnoreWatchPath(rootPath: string, candidatePath: string) {
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

// ---------------------------------------------------------------------------
// File sorting
// ---------------------------------------------------------------------------

export function sortWorkspaceTree(nodes: WorkspaceFileNode[]): WorkspaceFileNode[] {
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

// ---------------------------------------------------------------------------
// Comment paths
// ---------------------------------------------------------------------------

export function getWorkspaceCommentPaths(rootPath: string) {
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

export function toBundleTimestamp(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

// ---------------------------------------------------------------------------
// Misc utility functions
// ---------------------------------------------------------------------------

export function runBackgroundTask(task: Promise<unknown>, label: string): void {
  void task.catch((error) => {
    console.warn(`${label} failed.`, error)
  })
}

export function runGitCommand(rootPath: string, args: string[]): Promise<string> {
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

// ---------------------------------------------------------------------------
// Binary / image detection
// ---------------------------------------------------------------------------

export function isLikelyBinaryContent(contentBuffer: Buffer) {
  return contentBuffer.includes(0)
}

export function hasImageSignature(mimeType: string, contentBuffer: Buffer): boolean {
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

export function buildImagePreview(
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

// ---------------------------------------------------------------------------
// Write operation tracking
// ---------------------------------------------------------------------------

let workspaceWriteOperationsInFlight = 0

export function beginWorkspaceWriteOperation() {
  workspaceWriteOperationsInFlight += 1
}

export function endWorkspaceWriteOperation() {
  workspaceWriteOperationsInFlight = Math.max(
    0,
    workspaceWriteOperationsInFlight - 1,
  )
}

export function waitForWorkspaceWritesToSettle(maxWaitMs: number): Promise<boolean> {
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
