/**
 * Direct IPC handler functions for workspace operations extracted from main.ts.
 * These handle file CRUD, comments, git operations, and system open commands.
 */

import { BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron'
import { mkdir, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseGitDiffLineMarkers } from './git-line-markers'
import { parseGitStatusPorcelain } from './git-file-statuses'
import { searchWorkspaceFilesByName, searchWorkspaceText } from './workspace-search'
import { openWorkspaceInExternalTool } from './system-open'
import { writeFileAtomic } from './atomic-write'
import {
  parseStoredCodeCommentsJson,
  serializeStoredCodeComments,
} from './comment-storage'
import {
  isPathInsideWorkspace,
  isPathInsideWorkspaceOrRoot,
} from './workspace-path'
import type {
  CodeCommentRecord,
  SystemOpenInRequest,
  SystemOpenInResult,
  WorkspaceCreateDirectoryRequest,
  WorkspaceCreateDirectoryResult,
  WorkspaceCreateFileRequest,
  WorkspaceCreateFileResult,
  WorkspaceDeleteDirectoryRequest,
  WorkspaceDeleteDirectoryResult,
  WorkspaceDeleteFileRequest,
  WorkspaceDeleteFileResult,
  WorkspaceExportCommentsBundleRequest,
  WorkspaceExportCommentsBundleResult,
  WorkspaceGetGitFileStatusesRequest,
  WorkspaceGetGitFileStatusesResult,
  WorkspaceGetGitLineMarkersRequest,
  WorkspaceGetGitLineMarkersResult,
  WorkspaceIndexDirectoryRequest,
  WorkspaceIndexDirectoryResult,
  WorkspaceIndexRequest,
  WorkspaceIndexResult,
  WorkspaceOpenDialogResult,
  WorkspaceReadCommentsRequest,
  WorkspaceReadCommentsResult,
  WorkspaceReadFileRequest,
  WorkspaceReadFileResult,
  WorkspaceReadGlobalCommentsRequest,
  WorkspaceReadGlobalCommentsResult,
  WorkspaceRenameRequest,
  WorkspaceRenameResult,
  WorkspaceSearchFilesRequest,
  WorkspaceSearchFilesResult,
  WorkspaceSearchTextRequest,
  WorkspaceSearchTextResult,
  WorkspaceWriteCommentsRequest,
  WorkspaceWriteCommentsResult,
  WorkspaceWriteFileRequest,
  WorkspaceWriteFileResult,
  WorkspaceWriteGlobalCommentsRequest,
  WorkspaceWriteGlobalCommentsResult,
} from './ipc-types'
import {
  beginWorkspaceWriteOperation,
  BLOCKED_IMAGE_EXTENSIONS,
  buildImagePreview,
  endWorkspaceWriteOperation,
  ensurePathWithinWorkspace,
  getWorkspaceCommentPaths,
  IMAGE_PREVIEW_BY_EXTENSION,
  isLikelyBinaryContent,
  MAX_FILE_PREVIEW_BYTES,
  MAX_WORKSPACE_INDEX_NODES,
  MAX_WRITE_FILE_BYTES,
  normalizeToWorkspaceRelativePath,
  runGitCommand,
  toBundleTimestamp,
} from './workspace-utils'
import {
  buildDirectoryChildren,
  buildWorkspaceTree,
  collectIndexedWorkspaceEntries,
} from './workspace-indexing'

// ---------------------------------------------------------------------------
// The `win` reference is injected from main.ts via initHandlersWin().
// handleWorkspaceOpenDialog needs it for the parent window of the dialog.
// ---------------------------------------------------------------------------

let _getWin: (() => BrowserWindow | null) = () => null

export function initHandlersWin(getWin: () => BrowserWindow | null): void {
  _getWin = getWin
}

// ---------------------------------------------------------------------------
// Index / search
// ---------------------------------------------------------------------------

export async function handleWorkspaceIndexDirectory(
  _event: IpcMainInvokeEvent,
  request: WorkspaceIndexDirectoryRequest,
): Promise<WorkspaceIndexDirectoryResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath =
      typeof request?.relativePath === 'string' ? request.relativePath : ''
    if (!rootPath) {
      return {
        ok: false,
        children: [],
        childrenStatus: 'complete',
        totalChildCount: 0,
        error: 'rootPath is required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath =
      relativePath.trim().length > 0
        ? path.resolve(resolvedRootPath, relativePath)
        : resolvedRootPath
    if (!isPathInsideWorkspaceOrRoot(resolvedRootPath, resolvedTargetPath)) {
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

export async function handleWorkspaceSearchFiles(
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
        skippedUnreadablePathCount: 0,
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
        skippedUnreadablePathCount: 0,
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
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to search files.',
    }
  }
}

function createWorkspaceSearchTextErrorResult(
  error: string,
): WorkspaceSearchTextResult {
  return {
    ok: false,
    results: [],
    truncated: false,
    skippedLargeDirectoryCount: 0,
    skippedLargeFileCount: 0,
    skippedBinaryFileCount: 0,
    skippedUnreadablePathCount: 0,
    depthLimitHit: false,
    timedOut: false,
    error,
  }
}

export async function handleWorkspaceSearchText(
  _event: IpcMainInvokeEvent,
  request: WorkspaceSearchTextRequest,
): Promise<WorkspaceSearchTextResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return createWorkspaceSearchTextErrorResult('rootPath is required.')
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return createWorkspaceSearchTextErrorResult(
        'Selected workspace root is not a directory.',
      )
    }

    const searchResult = await searchWorkspaceText({
      rootPath: resolvedRootPath,
      query: request?.query ?? '',
    })

    return {
      ok: true,
      ...searchResult,
    }
  } catch (error) {
    return createWorkspaceSearchTextErrorResult(
      error instanceof Error ? error.message : 'Failed to search text.',
    )
  }
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export async function handleWorkspaceOpenDialog(): Promise<WorkspaceOpenDialogResult> {
  try {
    const targetWindow = _getWin() ?? BrowserWindow.getFocusedWindow() ?? null
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
      canceled: false,
      selectedPath: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ---------------------------------------------------------------------------
// Index (full tree)
// ---------------------------------------------------------------------------

export async function handleWorkspaceIndex(
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

// ---------------------------------------------------------------------------
// File read / write / CRUD
// ---------------------------------------------------------------------------

export async function handleWorkspaceReadFile(
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

export async function handleWorkspaceWriteFile(
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

export async function handleWorkspaceCreateFile(
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

export async function handleWorkspaceCreateDirectory(
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

export async function handleWorkspaceDeleteFile(
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

export async function handleWorkspaceDeleteDirectory(
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

export async function handleWorkspaceRename(
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

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

export async function handleWorkspaceGetGitLineMarkers(
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

export async function handleWorkspaceGetGitFileStatuses(
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

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function handleWorkspaceReadComments(
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

    const parsedCommentsResult = parseStoredCodeCommentsJson(rawJson)
    if (parsedCommentsResult.isFatal) {
      return {
        ok: false,
        comments: [],
        error: parsedCommentsResult.error ?? 'Invalid comments file format.',
      }
    }

    return {
      ok: true,
      comments: parsedCommentsResult.comments as CodeCommentRecord[],
      ...(parsedCommentsResult.error
        ? { error: parsedCommentsResult.error }
        : {}),
    }
  } catch (error) {
    return {
      ok: false,
      comments: [],
      error: error instanceof Error ? error.message : 'Failed to read comments.',
    }
  }
}

export async function handleWorkspaceWriteComments(
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
      const serializedComments = serializeStoredCodeComments(request.comments)
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

export async function handleWorkspaceReadGlobalComments(
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

export async function handleWorkspaceWriteGlobalComments(
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

export async function handleWorkspaceExportCommentsBundle(
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

// ---------------------------------------------------------------------------
// System open
// ---------------------------------------------------------------------------

export async function handleSystemOpenInIterm(
  _event: IpcMainInvokeEvent,
  request: SystemOpenInRequest,
): Promise<SystemOpenInResult> {
  return openWorkspaceInExternalTool(request, 'iterm')
}

export async function handleSystemOpenInVsCode(
  _event: IpcMainInvokeEvent,
  request: SystemOpenInRequest,
): Promise<SystemOpenInResult> {
  return openWorkspaceInExternalTool(request, 'vscode')
}

export async function handleSystemOpenInFinder(
  _event: IpcMainInvokeEvent,
  request: SystemOpenInRequest,
): Promise<SystemOpenInResult> {
  return openWorkspaceInExternalTool(request, 'finder')
}
