export type WorkspaceSearchIndexedEntry = {
  name: string
  absolutePath: string
  kind: 'file' | 'directory'
  isSymbolicLink: boolean
}

export type WorkspaceSearchFileMatch = {
  relativePath: string
  fileName: string
  parentRelativePath: string
}

export type WorkspaceSearchFilesInternalResult = {
  results: WorkspaceSearchFileMatch[]
  truncated: boolean
  skippedLargeDirectoryCount: number
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
  ) => Promise<WorkspaceSearchIndexedEntry[]>
  normalizeRelativePath: (
    absolutePath: string,
    rootPath: string,
  ) => string | null
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

export async function searchWorkspaceFilesByName(
  params: SearchWorkspaceFilesByNameParams,
): Promise<WorkspaceSearchFilesInternalResult> {
  const orderedTokens = buildOrderedSearchTokens(params.query)
  if (orderedTokens.length === 0) {
    return {
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
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
  let depthLimitHit = false
  let timedOut = false

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

    const entries = await params.collectEntries(current.directoryPath)
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
    depthLimitHit,
    timedOut,
  }
}
