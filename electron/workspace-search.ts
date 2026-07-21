import type { Dirent } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

export type WorkspaceSearchIndexedEntry = {
  name: string
  absolutePath: string
  kind: 'file' | 'directory'
  isSymbolicLink: boolean
}

export type WorkspaceSearchClassificationErrorReporter = (
  error: unknown,
) => void

export type WorkspaceSearchFileMatch = {
  relativePath: string
  fileName: string
  parentRelativePath: string
}

export type WorkspaceSearchFilesInternalResult = {
  results: WorkspaceSearchFileMatch[]
  truncated: boolean
  skippedLargeDirectoryCount: number
  skippedUnreadablePathCount: number
  depthLimitHit: boolean
  timedOut: boolean
}

export type WorkspaceSearchTextMatch = {
  relativePath: string
  lineNumber: number
  snippet: string
}

export type WorkspaceSearchTextInternalResult = {
  results: WorkspaceSearchTextMatch[]
  truncated: boolean
  skippedLargeDirectoryCount: number
  skippedLargeFileCount: number
  skippedBinaryFileCount: number
  skippedUnreadablePathCount: number
  depthLimitHit: boolean
  timedOut: boolean
}

type SearchWorkspaceFilesByNameParams = {
  rootPath: string
  query: string
  maxDepth?: number
  maxResults?: number
  maxDirectoryChildren?: number
  timeBudgetMs?: number
  now?: () => number
  collectEntries: (
    directoryPath: string,
    reportClassificationError?: WorkspaceSearchClassificationErrorReporter,
  ) => Promise<WorkspaceSearchIndexedEntry[]>
  normalizeRelativePath: (
    absolutePath: string,
    rootPath: string,
  ) => string | null
}

type SearchWorkspaceTextParams = {
  rootPath: string
  query: string
  maxDepth?: number
  maxResults?: number
  maxDirectoryChildren?: number
  timeBudgetMs?: number
  maxFileBytes?: number
  now?: () => number
  collectEntries?: (
    directoryPath: string,
    reportClassificationError?: WorkspaceSearchClassificationErrorReporter,
  ) => Promise<WorkspaceSearchIndexedEntry[]>
  normalizeRelativePath?: (
    absolutePath: string,
    rootPath: string,
  ) => string | null
  getFileSize?: (absolutePath: string) => Promise<number>
  readFileBuffer?: (absolutePath: string) => Promise<Buffer>
}

const WORKSPACE_TEXT_SEARCH_IGNORE_DIRECTORY_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
])

const DEFAULT_TEXT_SEARCH_MAX_FILE_BYTES = 1024 * 1024
const SKIPPABLE_SEARCH_ERROR_CODES = new Set([
  'EACCES',
  'EPERM',
  'ENOENT',
  'ENOTDIR',
])

function isSkippableSearchError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    SKIPPABLE_SEARCH_ERROR_CODES.has(error.code)
  )
}

function getParentRelativePath(relativePath: string) {
  const lastSlash = relativePath.lastIndexOf('/')
  return lastSlash < 0 ? '' : relativePath.slice(0, lastSlash)
}

function buildOrderedSearchTokens(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\*+/)
    .filter((token) => token.length > 0)
}

function matchesOrderedSearchTokens(candidate: string, tokens: readonly string[]) {
  if (tokens.length === 0) {
    return false
  }

  const normalizedCandidate = candidate.toLowerCase()
  let searchStartIndex = 0

  for (const token of tokens) {
    const matchedIndex = normalizedCandidate.indexOf(token, searchStartIndex)
    if (matchedIndex < 0) {
      return false
    }
    searchStartIndex = matchedIndex + token.length
  }

  return true
}

async function resolveSearchEntryKind(
  absolutePath: string,
  entry: Dirent,
  reportClassificationError?: WorkspaceSearchClassificationErrorReporter,
): Promise<Omit<WorkspaceSearchIndexedEntry, 'name' | 'absolutePath'> | null> {
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
  } catch (error) {
    reportClassificationError?.(error)
    return null
  }

  return null
}

async function collectSearchEntries(
  directoryPath: string,
  reportClassificationError?: WorkspaceSearchClassificationErrorReporter,
): Promise<WorkspaceSearchIndexedEntry[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const indexedEntries: WorkspaceSearchIndexedEntry[] = []

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name)
    const entryKind = await resolveSearchEntryKind(
      absolutePath,
      entry,
      reportClassificationError,
    )
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

function normalizeWorkspaceRelativePath(absolutePath: string, rootPath: string) {
  return path.relative(rootPath, absolutePath).split(path.sep).join('/')
}

function isLikelyBinaryBuffer(contentBuffer: Buffer) {
  return contentBuffer.includes(0)
}

export async function searchWorkspaceFilesByName(
  params: SearchWorkspaceFilesByNameParams,
): Promise<WorkspaceSearchFilesInternalResult> {
  const orderedTokens = buildOrderedSearchTokens(params.query)
  if (orderedTokens.length === 0) {
    return {
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    }
  }

  const maxDepth = params.maxDepth ?? 20
  const maxResults = params.maxResults ?? 200
  const maxDirectoryChildren = params.maxDirectoryChildren ?? 10_000
  const timeBudgetMs = params.timeBudgetMs ?? 2_000
  const now = params.now ?? (() => Date.now())
  const startedAt = now()

  const results: WorkspaceSearchFileMatch[] = []
  let truncated = false
  let skippedLargeDirectoryCount = 0
  let skippedUnreadablePathCount = 0
  let depthLimitHit = false
  let timedOut = false
  const reportClassificationError: WorkspaceSearchClassificationErrorReporter =
    (error) => {
      if (isSkippableSearchError(error)) {
        skippedUnreadablePathCount += 1
        return
      }
      throw error
    }

  const stack: Array<{ directoryPath: string; depth: number }> = [
    { directoryPath: params.rootPath, depth: 0 },
  ]

  while (stack.length > 0) {
    if (now() - startedAt >= timeBudgetMs) {
      truncated = true
      timedOut = true
      break
    }

    const current = stack.pop()
    if (!current) {
      break
    }

    let entries: WorkspaceSearchIndexedEntry[]
    try {
      entries = await params.collectEntries(
        current.directoryPath,
        reportClassificationError,
      )
    } catch (error) {
      if (current.depth > 0 && isSkippableSearchError(error)) {
        skippedUnreadablePathCount += 1
        continue
      }
      throw error
    }
    if (entries.length > maxDirectoryChildren) {
      skippedLargeDirectoryCount += 1
      continue
    }

    const sortedEntries = [...entries].sort((left, right) =>
      left.absolutePath.localeCompare(right.absolutePath),
    )

    for (const entry of sortedEntries) {
      if (now() - startedAt >= timeBudgetMs) {
        truncated = true
        timedOut = true
        break
      }

      if (entry.kind === 'file') {
        if (!matchesOrderedSearchTokens(entry.name, orderedTokens)) {
          continue
        }

        const relativePath = params.normalizeRelativePath(
          entry.absolutePath,
          params.rootPath,
        )
        if (!relativePath) {
          continue
        }

        results.push({
          relativePath,
          fileName: entry.name,
          parentRelativePath: getParentRelativePath(relativePath),
        })

        if (results.length >= maxResults) {
          truncated = true
          break
        }

        continue
      }

      if (entry.isSymbolicLink) {
        continue
      }

      if (current.depth >= maxDepth) {
        depthLimitHit = true
        continue
      }

      stack.push({
        directoryPath: entry.absolutePath,
        depth: current.depth + 1,
      })
    }

    if (truncated) {
      break
    }
  }

  return {
    results: results.sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath),
    ),
    truncated,
    skippedLargeDirectoryCount,
    skippedUnreadablePathCount,
    depthLimitHit,
    timedOut,
  }
}

export async function searchWorkspaceText(
  params: SearchWorkspaceTextParams,
): Promise<WorkspaceSearchTextInternalResult> {
  const normalizedQuery = params.query.trim().toLowerCase()
  if (normalizedQuery.length === 0) {
    return {
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    }
  }

  const maxDepth = params.maxDepth ?? 20
  const maxResults = params.maxResults ?? 200
  const maxDirectoryChildren = params.maxDirectoryChildren ?? 10_000
  const timeBudgetMs = params.timeBudgetMs ?? 2_000
  const maxFileBytes = params.maxFileBytes ?? DEFAULT_TEXT_SEARCH_MAX_FILE_BYTES
  const now = params.now ?? (() => Date.now())
  const collectEntries = params.collectEntries ?? collectSearchEntries
  const normalizeRelativePath =
    params.normalizeRelativePath ?? normalizeWorkspaceRelativePath
  const getFileSize =
    params.getFileSize ??
    (async (absolutePath: string) => (await stat(absolutePath)).size)
  const readFileBuffer = params.readFileBuffer ?? readFile
  const startedAt = now()

  const results: WorkspaceSearchTextMatch[] = []
  let truncated = false
  let skippedLargeDirectoryCount = 0
  let skippedLargeFileCount = 0
  let skippedBinaryFileCount = 0
  let skippedUnreadablePathCount = 0
  let depthLimitHit = false
  let timedOut = false
  const reportClassificationError: WorkspaceSearchClassificationErrorReporter =
    (error) => {
      if (isSkippableSearchError(error)) {
        skippedUnreadablePathCount += 1
        return
      }
      throw error
    }

  const stack: Array<{ directoryPath: string; depth: number }> = [
    { directoryPath: params.rootPath, depth: 0 },
  ]

  while (stack.length > 0) {
    if (now() - startedAt >= timeBudgetMs) {
      truncated = true
      timedOut = true
      break
    }

    const current = stack.pop()
    if (!current) {
      break
    }

    let entries: WorkspaceSearchIndexedEntry[]
    try {
      entries = await collectEntries(
        current.directoryPath,
        reportClassificationError,
      )
    } catch (error) {
      if (current.depth > 0 && isSkippableSearchError(error)) {
        skippedUnreadablePathCount += 1
        continue
      }
      throw error
    }
    if (entries.length > maxDirectoryChildren) {
      skippedLargeDirectoryCount += 1
      continue
    }

    const sortedEntries = [...entries].sort((left, right) =>
      left.absolutePath.localeCompare(right.absolutePath),
    )

    for (const entry of sortedEntries) {
      if (now() - startedAt >= timeBudgetMs) {
        truncated = true
        timedOut = true
        break
      }

      if (entry.kind === 'directory') {
        if (WORKSPACE_TEXT_SEARCH_IGNORE_DIRECTORY_NAMES.has(entry.name)) {
          continue
        }

        if (entry.isSymbolicLink) {
          continue
        }

        if (current.depth >= maxDepth) {
          depthLimitHit = true
          continue
        }

        stack.push({
          directoryPath: entry.absolutePath,
          depth: current.depth + 1,
        })
        continue
      }

      const relativePath = normalizeRelativePath(
        entry.absolutePath,
        params.rootPath,
      )
      if (!relativePath) {
        continue
      }

      let fileSize: number
      try {
        fileSize = await getFileSize(entry.absolutePath)
      } catch (error) {
        if (isSkippableSearchError(error)) {
          skippedUnreadablePathCount += 1
          continue
        }
        throw error
      }
      if (fileSize > maxFileBytes) {
        skippedLargeFileCount += 1
        continue
      }

      let contentBuffer: Buffer
      try {
        contentBuffer = await readFileBuffer(entry.absolutePath)
      } catch (error) {
        if (isSkippableSearchError(error)) {
          skippedUnreadablePathCount += 1
          continue
        }
        throw error
      }
      if (isLikelyBinaryBuffer(contentBuffer)) {
        skippedBinaryFileCount += 1
        continue
      }

      const lines = contentBuffer.toString('utf8').split(/\r?\n/)
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        if (now() - startedAt >= timeBudgetMs) {
          truncated = true
          timedOut = true
          break
        }

        const line = lines[lineIndex]
        if (!line.toLowerCase().includes(normalizedQuery)) {
          continue
        }

        results.push({
          relativePath,
          lineNumber: lineIndex + 1,
          snippet: line.trim(),
        })

        if (results.length >= maxResults) {
          truncated = true
          break
        }
      }

      if (truncated) {
        break
      }
    }

    if (truncated) {
      break
    }
  }

  return {
    results: results.sort((left, right) => {
      const pathCompare = left.relativePath.localeCompare(right.relativePath)
      return pathCompare === 0 ? left.lineNumber - right.lineNumber : pathCompare
    }),
    truncated,
    skippedLargeDirectoryCount,
    skippedLargeFileCount,
    skippedBinaryFileCount,
    skippedUnreadablePathCount,
    depthLimitHit,
    timedOut,
  }
}
