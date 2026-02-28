import { execFile } from 'node:child_process'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseGitStatusPorcelain } from '../../git-file-statuses'
import { parseGitDiffLineMarkers } from '../../git-line-markers'
import { RemoteAgentError } from '../protocol'
import {
  ensurePathWithinWorkspace,
  normalizeToWorkspaceRelativePath,
  resolveWorkspaceRelativePath,
} from './path-guard'
import type { RuntimeWorkspaceFileNode } from './runtime-types'

const WORKSPACE_INDEX_IGNORE_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
])

const WORKSPACE_INDEX_DIRECTORY_CHILD_CAP = 500
const MAX_WORKSPACE_INDEX_NODES = 10_000
const MAX_FILE_PREVIEW_BYTES = 2 * 1024 * 1024
const MAX_WRITE_FILE_BYTES = 2 * 1024 * 1024

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

const BLOCKED_IMAGE_EXTENSIONS = new Set(['.svg'])
const ALLOWED_IMAGE_PREVIEW_MIME_PREFIX = 'data:image/'

type BuildWorkspaceTreeResult = {
  nodes: RuntimeWorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
}

export type WorkspaceOpsContext = {
  rootPath: string
}

function sortWorkspaceTree(nodes: RuntimeWorkspaceFileNode[]): RuntimeWorkspaceFileNode[] {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  })

  const sorted: RuntimeWorkspaceFileNode[] = [...nodes].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'directory' ? -1 : 1
    }
    return collator.compare(left.name, right.name)
  })

  return sorted.map((node): RuntimeWorkspaceFileNode => {
    if (node.kind === 'directory') {
      return {
        ...node,
        children: sortWorkspaceTree(node.children),
      }
    }
    return node
  })
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

  const entries = await readdir(currentDirectory, { withFileTypes: true })
  const eligibleEntries = entries.filter((entry) => {
    if (entry.isSymbolicLink()) {
      return false
    }
    if (WORKSPACE_INDEX_IGNORE_NAMES.has(entry.name)) {
      return false
    }
    return entry.isFile() || entry.isDirectory()
  })

  const totalChildCount = eligibleEntries.length
  const isCapped = totalChildCount > WORKSPACE_INDEX_DIRECTORY_CHILD_CAP
  const cappedEntries = isCapped
    ? eligibleEntries.slice(0, WORKSPACE_INDEX_DIRECTORY_CHILD_CAP)
    : eligibleEntries

  const atDepthLimit = maxDepth !== undefined && currentDepth >= maxDepth
  const skipRecurse = isCapped || atDepthLimit

  const nodes: RuntimeWorkspaceFileNode[] = []

  for (const entry of cappedEntries) {
    if (indexBudget.remainingNodes <= 0) {
      indexBudget.truncated = true
      break
    }

    const absolutePath = path.join(currentDirectory, entry.name)
    const relativePath = normalizeToWorkspaceRelativePath(absolutePath, rootPath)
    if (!relativePath || relativePath.startsWith('..')) {
      continue
    }

    if (entry.isDirectory()) {
      indexBudget.remainingNodes -= 1

      if (skipRecurse) {
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
        absolutePath,
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

    indexBudget.remainingNodes -= 1
    nodes.push({
      name: entry.name,
      relativePath,
      kind: 'file',
    })
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
): Promise<{
  children: RuntimeWorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
}> {
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const eligibleEntries = entries.filter((entry) => {
    if (entry.isSymbolicLink()) {
      return false
    }
    if (WORKSPACE_INDEX_IGNORE_NAMES.has(entry.name)) {
      return false
    }
    return entry.isFile() || entry.isDirectory()
  })

  const totalChildCount = eligibleEntries.length
  const isCapped = totalChildCount > WORKSPACE_INDEX_DIRECTORY_CHILD_CAP
  const cappedEntries = isCapped
    ? eligibleEntries.slice(0, WORKSPACE_INDEX_DIRECTORY_CHILD_CAP)
    : eligibleEntries

  const nodes: RuntimeWorkspaceFileNode[] = []
  for (const entry of cappedEntries) {
    const absolutePath = path.join(directoryPath, entry.name)
    const relativePath = normalizeToWorkspaceRelativePath(absolutePath, rootPath)
    if (!relativePath || relativePath.startsWith('..')) {
      continue
    }

    if (entry.isDirectory()) {
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

  return {
    children: sortWorkspaceTree(nodes),
    childrenStatus: isCapped ? 'partial' : 'complete',
    totalChildCount,
  }
}

function isLikelyBinaryContent(contentBuffer: Buffer): boolean {
  if (contentBuffer.length === 0) {
    return false
  }

  const sampleSize = Math.min(contentBuffer.length, 1024)
  let binaryLike = 0
  for (let index = 0; index < sampleSize; index += 1) {
    const byte = contentBuffer[index]
    if (byte === 0) {
      return true
    }
    if (byte < 7 || (byte > 14 && byte < 32)) {
      binaryLike += 1
    }
  }

  return binaryLike / sampleSize > 0.3
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

function buildImagePreview(relativePath: string, contentBuffer: Buffer):
  | { mimeType: string; dataUrl: string }
  | null {
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

async function writeFileAtomic(targetPath: string, content: string): Promise<void> {
  const tempPath = `${targetPath}.${randomUUID()}.tmp`
  await writeFile(tempPath, content, 'utf8')
  await rename(tempPath, targetPath)
}

function runGitCommand(rootPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: rootPath }, (error, stdout, stderr) => {
      if (error) {
        const trimmedStderr = stderr.trim()
        reject(
          new Error(
            trimmedStderr.length > 0
              ? trimmedStderr
              : `git ${args.join(' ')} failed.`,
          ),
        )
        return
      }
      resolve(stdout)
    })
  })
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

function toBundleTimestamp(date = new Date()): string {
  const dateParts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'UTC',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const byType = Object.fromEntries(dateParts.map((part) => [part.type, part.value]))
  return `${byType.year}${byType.month}${byType.day}_${byType.hour}${byType.minute}${byType.second}`
}

export async function workspaceIndex(
  context: WorkspaceOpsContext,
): Promise<{
  ok: true
  fileTree: RuntimeWorkspaceFileNode[]
  truncated: boolean
}> {
  const resolvedRootPath = path.resolve(context.rootPath)
  const rootStats = await stat(resolvedRootPath)
  if (!rootStats.isDirectory()) {
    throw new RemoteAgentError('UNKNOWN', 'Selected workspace root is not a directory.')
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
}

export async function workspaceIndexDirectory(
  context: WorkspaceOpsContext,
  params: { relativePath?: unknown },
): Promise<{
  ok: true
  children: RuntimeWorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
}> {
  const relativePath = typeof params.relativePath === 'string'
    ? params.relativePath
    : ''
  const resolvedDirectoryPath = resolveWorkspaceRelativePath(
    context.rootPath,
    relativePath,
  )
  const targetStats = await stat(resolvedDirectoryPath)
  if (!targetStats.isDirectory()) {
    throw new RemoteAgentError('UNKNOWN', 'Target path is not a directory.')
  }

  const result = await buildDirectoryChildren(context.rootPath, resolvedDirectoryPath)
  return {
    ok: true,
    children: result.children,
    childrenStatus: result.childrenStatus,
    totalChildCount: result.totalChildCount,
  }
}

export async function workspaceReadFile(
  context: WorkspaceOpsContext,
  params: { relativePath?: unknown },
): Promise<
  | { ok: true; content: string | null; previewUnavailableReason?: string; imagePreview?: { mimeType: string; dataUrl: string } }
> {
  const relativePath = typeof params.relativePath === 'string'
    ? params.relativePath
    : ''
  const resolvedFilePath = resolveWorkspaceRelativePath(context.rootPath, relativePath)

  const fileStats = await stat(resolvedFilePath)
  if (!fileStats.isFile()) {
    throw new RemoteAgentError('UNKNOWN', 'Selected path is not a file.')
  }

  if (fileStats.size > MAX_FILE_PREVIEW_BYTES) {
    return {
      ok: true,
      content: null,
      previewUnavailableReason: 'file_too_large',
    }
  }

  const contentBuffer = await readFile(resolvedFilePath)
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
}

export async function workspaceWriteFile(
  context: WorkspaceOpsContext,
  params: { relativePath?: unknown; content?: unknown },
): Promise<{ ok: true }> {
  const relativePath = typeof params.relativePath === 'string'
    ? params.relativePath
    : ''
  const content = typeof params.content === 'string' ? params.content : null
  if (content === null) {
    throw new RemoteAgentError('UNKNOWN', 'content must be a string.')
  }

  if (Buffer.byteLength(content, 'utf8') > MAX_WRITE_FILE_BYTES) {
    throw new RemoteAgentError('UNKNOWN', 'File too large')
  }

  const resolvedFilePath = resolveWorkspaceRelativePath(context.rootPath, relativePath)
  await mkdir(path.dirname(resolvedFilePath), { recursive: true })
  await writeFileAtomic(resolvedFilePath, content)
  return { ok: true }
}

export async function workspaceCreateFile(
  context: WorkspaceOpsContext,
  params: { relativePath?: unknown },
): Promise<{ ok: true }> {
  const relativePath = typeof params.relativePath === 'string'
    ? params.relativePath
    : ''
  const resolvedFilePath = resolveWorkspaceRelativePath(context.rootPath, relativePath)

  try {
    await stat(resolvedFilePath)
    throw new RemoteAgentError('UNKNOWN', 'File already exists.')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  await mkdir(path.dirname(resolvedFilePath), { recursive: true })
  await writeFile(resolvedFilePath, '')
  return { ok: true }
}

export async function workspaceCreateDirectory(
  context: WorkspaceOpsContext,
  params: { relativePath?: unknown },
): Promise<{ ok: true }> {
  const relativePath = typeof params.relativePath === 'string'
    ? params.relativePath
    : ''
  const resolvedDirectoryPath = resolveWorkspaceRelativePath(
    context.rootPath,
    relativePath,
  )

  try {
    await stat(resolvedDirectoryPath)
    throw new RemoteAgentError('UNKNOWN', 'Directory already exists.')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  await mkdir(resolvedDirectoryPath, { recursive: true })
  return { ok: true }
}

export async function workspaceDeleteFile(
  context: WorkspaceOpsContext,
  params: { relativePath?: unknown },
): Promise<{ ok: true }> {
  const relativePath = typeof params.relativePath === 'string'
    ? params.relativePath
    : ''
  const resolvedFilePath = resolveWorkspaceRelativePath(context.rootPath, relativePath)

  const fileStats = await stat(resolvedFilePath)
  if (!fileStats.isFile()) {
    throw new RemoteAgentError('UNKNOWN', 'Target path is not a file.')
  }

  await unlink(resolvedFilePath)
  return { ok: true }
}

export async function workspaceDeleteDirectory(
  context: WorkspaceOpsContext,
  params: { relativePath?: unknown },
): Promise<{ ok: true }> {
  const relativePath = typeof params.relativePath === 'string'
    ? params.relativePath
    : ''
  const resolvedDirectoryPath = resolveWorkspaceRelativePath(
    context.rootPath,
    relativePath,
  )

  const dirStats = await stat(resolvedDirectoryPath)
  if (!dirStats.isDirectory()) {
    throw new RemoteAgentError('UNKNOWN', 'Target path is not a directory.')
  }

  await rm(resolvedDirectoryPath, { recursive: true, force: true })
  return { ok: true }
}

export async function workspaceRename(
  context: WorkspaceOpsContext,
  params: { oldRelativePath?: unknown; newRelativePath?: unknown },
): Promise<{ ok: true }> {
  const oldRelativePath = typeof params.oldRelativePath === 'string'
    ? params.oldRelativePath
    : ''
  const newRelativePath = typeof params.newRelativePath === 'string'
    ? params.newRelativePath
    : ''

  const oldPath = resolveWorkspaceRelativePath(context.rootPath, oldRelativePath)
  const newPath = resolveWorkspaceRelativePath(context.rootPath, newRelativePath)

  await stat(oldPath)
  try {
    await stat(newPath)
    throw new RemoteAgentError(
      'UNKNOWN',
      'A file or directory already exists at the target path.',
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  await mkdir(path.dirname(newPath), { recursive: true })
  await rename(oldPath, newPath)
  return { ok: true }
}

export async function workspaceGetGitLineMarkers(
  context: WorkspaceOpsContext,
  params: { relativePath?: unknown },
): Promise<{ ok: true; markers: Array<{ line: number; kind: 'added' | 'modified' }> }> {
  const relativePath = typeof params.relativePath === 'string'
    ? params.relativePath
    : ''

  const resolvedFilePath = resolveWorkspaceRelativePath(context.rootPath, relativePath)
  try {
    const targetStats = await stat(resolvedFilePath)
    if (!targetStats.isFile()) {
      return { ok: true, markers: [] }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ok: true, markers: [] }
    }
    throw error
  }

  await runGitCommand(context.rootPath, ['rev-parse', '--is-inside-work-tree'])
  await runGitCommand(context.rootPath, ['rev-parse', '--verify', 'HEAD'])
  const diffText = await runGitCommand(context.rootPath, [
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
}

export async function workspaceGetGitFileStatuses(
  context: WorkspaceOpsContext,
): Promise<{ ok: true; statuses: Record<string, 'added' | 'modified' | 'untracked'> }> {
  await runGitCommand(context.rootPath, ['rev-parse', '--is-inside-work-tree'])
  const statusOutput = await runGitCommand(context.rootPath, [
    'status',
    '--porcelain',
  ])

  return {
    ok: true,
    statuses: parseGitStatusPorcelain(statusOutput),
  }
}

export async function workspaceReadComments(
  context: WorkspaceOpsContext,
): Promise<{ ok: true; comments: unknown[] }> {
  const { commentsJsonPath } = getWorkspaceCommentPaths(context.rootPath)
  ensurePathWithinWorkspace(context.rootPath, commentsJsonPath)

  try {
    const rawJson = await readFile(commentsJsonPath, 'utf8')
    const parsedComments = JSON.parse(rawJson)
    if (!Array.isArray(parsedComments)) {
      throw new RemoteAgentError('UNKNOWN', 'Invalid comments file format: expected an array.')
    }

    return {
      ok: true,
      comments: parsedComments,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        ok: true,
        comments: [],
      }
    }
    throw error
  }
}

export async function workspaceWriteComments(
  context: WorkspaceOpsContext,
  params: { comments?: unknown },
): Promise<{ ok: true }> {
  if (!Array.isArray(params.comments)) {
    throw new RemoteAgentError('UNKNOWN', 'comments must be an array.')
  }

  const { metadataDirectoryPath, commentsJsonPath } =
    getWorkspaceCommentPaths(context.rootPath)

  ensurePathWithinWorkspace(context.rootPath, metadataDirectoryPath)
  ensurePathWithinWorkspace(context.rootPath, commentsJsonPath)

  await mkdir(metadataDirectoryPath, { recursive: true })
  const serializedComments = `${JSON.stringify(params.comments, null, 2)}\n`
  await writeFileAtomic(commentsJsonPath, serializedComments)
  return { ok: true }
}

export async function workspaceReadGlobalComments(
  context: WorkspaceOpsContext,
): Promise<{ ok: true; body: string }> {
  const { globalCommentsPath } = getWorkspaceCommentPaths(context.rootPath)
  ensurePathWithinWorkspace(context.rootPath, globalCommentsPath)

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
}

export async function workspaceWriteGlobalComments(
  context: WorkspaceOpsContext,
  params: { body?: unknown },
): Promise<{ ok: true }> {
  if (typeof params.body !== 'string') {
    throw new RemoteAgentError('UNKNOWN', 'body must be a string.')
  }

  const { metadataDirectoryPath, globalCommentsPath } =
    getWorkspaceCommentPaths(context.rootPath)

  ensurePathWithinWorkspace(context.rootPath, metadataDirectoryPath)
  ensurePathWithinWorkspace(context.rootPath, globalCommentsPath)

  await mkdir(metadataDirectoryPath, { recursive: true })
  await writeFileAtomic(globalCommentsPath, params.body)
  return { ok: true }
}

export async function workspaceExportCommentsBundle(
  context: WorkspaceOpsContext,
  params: {
    commentsMarkdown?: unknown
    bundleMarkdown?: unknown
    writeCommentsFile?: unknown
    writeBundleFile?: unknown
  },
): Promise<{ ok: true; commentsPath?: string; bundlePath?: string }> {
  const writeCommentsFile = params.writeCommentsFile === true
  const writeBundleFile = params.writeBundleFile === true
  if (!writeCommentsFile && !writeBundleFile) {
    throw new RemoteAgentError('UNKNOWN', 'At least one export target must be selected.')
  }

  const {
    metadataDirectoryPath,
    bundleExportsDirectoryPath,
    commentsMarkdownPath,
  } = getWorkspaceCommentPaths(context.rootPath)

  ensurePathWithinWorkspace(context.rootPath, metadataDirectoryPath)
  ensurePathWithinWorkspace(context.rootPath, bundleExportsDirectoryPath)
  ensurePathWithinWorkspace(context.rootPath, commentsMarkdownPath)

  let exportedCommentsPath: string | undefined
  let exportedBundlePath: string | undefined

  if (writeCommentsFile) {
    if (typeof params.commentsMarkdown !== 'string') {
      throw new RemoteAgentError(
        'UNKNOWN',
        'commentsMarkdown is required when writeCommentsFile is enabled.',
      )
    }

    await writeFileAtomic(commentsMarkdownPath, params.commentsMarkdown)
    exportedCommentsPath = commentsMarkdownPath
  }

  if (writeBundleFile) {
    if (typeof params.bundleMarkdown !== 'string') {
      throw new RemoteAgentError(
        'UNKNOWN',
        'bundleMarkdown is required when writeBundleFile is enabled.',
      )
    }

    await mkdir(bundleExportsDirectoryPath, { recursive: true })
    const fileName = `${toBundleTimestamp()}-comments-bundle.md`
    const bundlePath = path.join(bundleExportsDirectoryPath, fileName)
    ensurePathWithinWorkspace(context.rootPath, bundlePath)
    await writeFileAtomic(bundlePath, params.bundleMarkdown)
    exportedBundlePath = bundlePath
  }

  return {
    ok: true,
    commentsPath: exportedCommentsPath,
    bundlePath: exportedBundlePath,
  }
}

export function toUserFacingPath(absolutePath: string): string {
  const homeDirectory = os.homedir()
  if (absolutePath.startsWith(homeDirectory)) {
    return `~${absolutePath.slice(homeDirectory.length)}`
  }
  return absolutePath
}
