import { useEffect, useMemo, useRef, useState } from 'react'

type SearchResultTarget = {
  relativePath: string
  lineNumber: number
}

export type ProjectSearchPanelProps = {
  workspaceKey: string | null
  onSearchText: (query: string) => Promise<WorkspaceSearchTextResult>
  onOpenSearchResult: (target: SearchResultTarget) => void
}

type SearchState = {
  loading: boolean
  error: string | null
  results: WorkspaceSearchTextMatch[]
  truncated: boolean
  skippedLargeDirectoryCount: number
  skippedLargeFileCount: number
  skippedBinaryFileCount: number
  skippedUnreadablePathCount: number
  depthLimitHit: boolean
  timedOut: boolean
}

const SEARCH_DEBOUNCE_MS = 250

const emptySearchState: SearchState = {
  loading: false,
  error: null,
  results: [],
  truncated: false,
  skippedLargeDirectoryCount: 0,
  skippedLargeFileCount: 0,
  skippedBinaryFileCount: 0,
  skippedUnreadablePathCount: 0,
  depthLimitHit: false,
  timedOut: false,
}

function shouldShowIncompleteHint(state: SearchState) {
  return (
    state.truncated ||
    state.timedOut ||
    state.depthLimitHit ||
    state.skippedLargeDirectoryCount > 0 ||
    state.skippedLargeFileCount > 0 ||
    state.skippedBinaryFileCount > 0 ||
    state.skippedUnreadablePathCount > 0
  )
}

export function ProjectSearchPanel({
  workspaceKey,
  onSearchText,
  onOpenSearchResult,
}: ProjectSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [searchState, setSearchState] = useState<SearchState>(emptySearchState)
  const requestTokenRef = useRef(0)

  useEffect(() => {
    requestTokenRef.current += 1
    setQuery('')
    setSearchState(emptySearchState)
  }, [workspaceKey])

  useEffect(() => {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length === 0) {
      requestTokenRef.current += 1
      setSearchState(emptySearchState)
      return
    }

    const requestToken = requestTokenRef.current + 1
    requestTokenRef.current = requestToken
    setSearchState((previous) => ({
      ...previous,
      loading: true,
      error: null,
    }))

    const timeoutId = window.setTimeout(() => {
      void onSearchText(trimmedQuery)
        .then((result) => {
          if (requestTokenRef.current !== requestToken) {
            return
          }

          setSearchState({
            loading: false,
            error: result.ok ? null : result.error ?? 'Search failed. Please try again.',
            results: result.ok ? result.results : [],
            truncated: result.ok ? result.truncated : false,
            skippedLargeDirectoryCount: result.ok
              ? result.skippedLargeDirectoryCount
              : 0,
            skippedLargeFileCount: result.ok ? result.skippedLargeFileCount : 0,
            skippedBinaryFileCount: result.ok ? result.skippedBinaryFileCount : 0,
            skippedUnreadablePathCount: result.ok
              ? result.skippedUnreadablePathCount
              : 0,
            depthLimitHit: result.ok ? result.depthLimitHit : false,
            timedOut: result.ok ? result.timedOut : false,
          })
        })
        .catch(() => {
          if (requestTokenRef.current !== requestToken) {
            return
          }

          setSearchState({
            ...emptySearchState,
            error: 'Search failed. Please try again.',
          })
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [onSearchText, query])

  const groupedResults = useMemo(() => {
    const groups: Array<{ relativePath: string; matches: WorkspaceSearchTextMatch[] }> = []
    const groupByPath = new Map<string, WorkspaceSearchTextMatch[]>()

    for (const result of searchState.results) {
      const existingMatches = groupByPath.get(result.relativePath)
      if (existingMatches) {
        existingMatches.push(result)
        continue
      }

      const matches = [result]
      groupByPath.set(result.relativePath, matches)
      groups.push({ relativePath: result.relativePath, matches })
    }

    return groups
  }, [searchState.results])

  const hasQuery = query.trim().length > 0
  const incomplete = shouldShowIncompleteHint(searchState)

  return (
    <section className="project-search-panel" data-testid="project-search-panel">
      <label className="project-search-label" htmlFor="project-search-input">
        Search text
      </label>
      <input
        className="project-search-input"
        data-testid="project-search-input"
        id="project-search-input"
        onChange={(event) => {
          setQuery(event.target.value)
        }}
        placeholder="Search text"
        type="search"
        value={query}
      />

      {searchState.loading ? (
        <p className="project-search-empty">Searching text...</p>
      ) : searchState.error ? (
        <p className="project-search-error" role="alert">
          {searchState.error}
        </p>
      ) : groupedResults.length > 0 ? (
        <div className="project-search-results" data-testid="project-search-results">
          {groupedResults.map((group) => (
            <section
              className="project-search-result-group"
              data-testid={`project-search-group-${group.relativePath}`}
              key={group.relativePath}
            >
              <h3 className="project-search-result-path">{group.relativePath}</h3>
              <ul className="project-search-match-list">
                {group.matches.map((match) => (
                  <li
                    className="project-search-match-item"
                    key={`${match.relativePath}:${match.lineNumber}:${match.snippet}`}
                  >
                    <button
                      aria-label={`${match.relativePath} line ${match.lineNumber}`}
                      className="project-search-match-button"
                      onClick={() => {
                        onOpenSearchResult({
                          relativePath: match.relativePath,
                          lineNumber: match.lineNumber,
                        })
                      }}
                      type="button"
                    >
                      <span className="project-search-match-line">
                        Line {match.lineNumber}
                      </span>
                      <span className="project-search-match-snippet">
                        {match.snippet}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="project-search-empty" data-testid="project-search-empty">
          {hasQuery ? 'No text matches found.' : 'Enter a search query.'}
        </p>
      )}

      {incomplete && (
        <p
          className="project-search-incomplete"
          data-testid="project-search-incomplete"
        >
          {searchState.skippedUnreadablePathCount > 0
            ? `${searchState.skippedUnreadablePathCount} unreadable ${
                searchState.skippedUnreadablePathCount === 1 ? 'path' : 'paths'
              } skipped. Search results may be incomplete.`
            : 'Search results may be incomplete.'}
        </p>
      )}
    </section>
  )
}
