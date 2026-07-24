import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
} from 'react'
import { CopyActionPopover } from '../context-menu/copy-action-popover'
import type { GitFileStatusKind } from '../workspace/workspace-model'
import {
  buildFileTreeContextMenuActions,
  getFileIcon,
  getParentPath,
  renderFileTreeNodes,
  type FileTreeContextMenuState,
  type RenderBudget,
} from './file-tree-panel-helpers'

const INITIAL_RENDER_NODE_LIMIT = 10_000

type FileTreePanelProps = {
  rootPath: string | null
  fileTree: WorkspaceFileNode[]
  changedFiles: string[]
  gitFileStatuses: Record<string, GitFileStatusKind>
  activeFile: string | null
  expandedDirectories: string[]
  loadingDirectories: string[]
  isIndexing: boolean
  onRequestCopyFullPath?: (relativePath: string) => void
  onSelectFile: (relativePath: string) => void
  onRequestCopyRelativePath: (relativePath: string) => void
  onExpandedDirectoriesChange: (expandedDirectories: string[]) => void
  onRequestLoadDirectory: (
    relativePath: string,
    options?: { append?: boolean },
  ) => void
  onRequestCreateFile?: (relativePath: string) => void
  onRequestCreateDirectory?: (relativePath: string) => void
  onRequestConfirmedDeleteFile?: (relativePath: string) => void
  onRequestConfirmedDeleteDirectory?: (relativePath: string) => void
  onRequestRename?: (oldRelativePath: string, newRelativePath: string) => void
  onRequestCopyToClipboard?: (entries: { relativePath: string; kind: 'file' | 'directory' }[]) => void
  onRequestPasteFromClipboard?: (destDir: string) => void
  onSearchFiles?: (query: string) => Promise<WorkspaceSearchFilesResult>
  onRequestRefresh?: () => void
}

type InlineInputState = {
  parentRelativePath: string
  type: 'file' | 'directory'
} | {
  parentRelativePath: string
  type: 'rename'
  originalRelativePath: string
  originalName: string
} | null

type FocusRestoreTarget =
  | { kind: 'panel' }
  | { kind: 'search' }
  | {
      kind: 'node'
      nodeKind: 'file' | 'directory'
      relativePath: string
    };

function buildChangedSubtreeSet(
  nodes: WorkspaceFileNode[],
  changedFileSet: Set<string>,
): Set<string> {
  const changedSubtreeSet = new Set<string>()
  const changedDirectoryHintSet = new Set<string>()

  for (const changedRelativePath of changedFileSet) {
    let currentPath = changedRelativePath
    let parentPath = getParentPath(currentPath)
    while (parentPath) {
      changedDirectoryHintSet.add(parentPath)
      currentPath = parentPath
      parentPath = getParentPath(currentPath)
    }
  }

  const visitNode = (node: WorkspaceFileNode): boolean => {
    const nodeChanged = changedFileSet.has(node.relativePath)
    if (node.kind === 'file') {
      if (nodeChanged) {
        changedSubtreeSet.add(node.relativePath)
      }
      return nodeChanged
    }

    let childChanged = false
    for (const childNode of node.children ?? []) {
      if (visitNode(childNode)) {
        childChanged = true
      }
    }

    const subtreeChanged =
      nodeChanged ||
      childChanged ||
      changedDirectoryHintSet.has(node.relativePath)
    if (subtreeChanged) {
      changedSubtreeSet.add(node.relativePath)
    }
    return subtreeChanged
  }

  for (const node of nodes) {
    visitNode(node)
  }

  return changedSubtreeSet
}

function gitStatusPriority(kind: GitFileStatusKind): number {
  switch (kind) {
    case 'modified': return 2
    case 'added': return 1
    case 'untracked': return 1
  }
}

function buildGitStatusSubtreeMap(
  nodes: WorkspaceFileNode[],
  gitFileStatuses: Record<string, GitFileStatusKind>,
): Map<string, GitFileStatusKind> {
  const subtreeMap = new Map<string, GitFileStatusKind>()

  const visitNode = (node: WorkspaceFileNode): GitFileStatusKind | null => {
    const nodeStatus = gitFileStatuses[node.relativePath] ?? null
    if (node.kind === 'file') {
      if (nodeStatus) {
        subtreeMap.set(node.relativePath, nodeStatus)
      }
      return nodeStatus
    }

    let highestChildStatus: GitFileStatusKind | null = null
    for (const childNode of node.children ?? []) {
      const childStatus = visitNode(childNode)
      if (childStatus) {
        if (!highestChildStatus || gitStatusPriority(childStatus) > gitStatusPriority(highestChildStatus)) {
          highestChildStatus = childStatus
        }
      }
    }

    const effectiveStatus = nodeStatus ?? highestChildStatus
    if (effectiveStatus) {
      subtreeMap.set(node.relativePath, effectiveStatus)
    }
    return effectiveStatus
  }

  for (const node of nodes) {
    visitNode(node)
  }

  return subtreeMap
}

function findDirectoryNode(
  nodes: WorkspaceFileNode[],
  relativePath: string,
): WorkspaceFileNode | null {
  for (const node of nodes) {
    if (node.kind === 'directory' && node.relativePath === relativePath) {
      return node
    }

    if (
      node.kind === 'directory' &&
      node.children &&
      relativePath.startsWith(node.relativePath + '/')
    ) {
      const found = findDirectoryNode(node.children, relativePath)
      if (found) {
        return found
      }
    }
  }

  return null
}

function validateInlineInputName(name: string): string | null {
  if (!name.trim()) return 'Name cannot be empty.'
  if (name.includes('/')) return 'Name cannot contain "/".'
  if (name.includes('\\')) return 'Name cannot contain "\\".'
  if (name === '.' || name === '..') return 'Name cannot be "." or "..".'
  // Block NUL byte and ASCII control characters (0x00-0x1F)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(name)) return 'Name cannot contain control characters.'
  return null
}

function getFocusRestoreTargetFromElement(
  element: HTMLElement | null,
): FocusRestoreTarget | null {
  if (!element) {
    return null
  }

  if (element instanceof HTMLInputElement) {
    if (element.dataset.treeFocusTarget === 'search') {
      return { kind: 'search' }
    }
    return null
  }

  if (!(element instanceof HTMLButtonElement)) {
    return null
  }

  const relativePath = element.dataset.treeRelativePath
  const nodeKind = element.dataset.treeKind
  if (
    relativePath &&
    (nodeKind === 'file' || nodeKind === 'directory')
  ) {
    return {
      kind: 'node',
      nodeKind,
      relativePath,
    }
  }

  return { kind: 'panel' }
}

function findFocusRestoreElement(
  panel: HTMLElement,
  target: FocusRestoreTarget,
): {
  exactMatch: HTMLElement | null
  fallbackMatch: HTMLElement | null
} {
  if (target.kind === 'search') {
    const searchTarget = panel.querySelector<HTMLElement>(
      '[data-tree-focus-target="search"]',
    )
    return {
      exactMatch: searchTarget,
      fallbackMatch: searchTarget,
    }
  }

  if (target.kind === 'panel') {
    return {
      exactMatch: panel,
      fallbackMatch: panel,
    }
  }

  const nodeButtons = Array.from(
    panel.querySelectorAll<HTMLButtonElement>('[data-tree-relative-path]'),
  )
  const findMatchingButton = (
    relativePath: string,
    nodeKind: 'file' | 'directory',
  ): HTMLButtonElement | null =>
    nodeButtons.find(
      (button) =>
        button.dataset.treeRelativePath === relativePath &&
        button.dataset.treeKind === nodeKind,
    ) ?? null

  const exactMatch = findMatchingButton(target.relativePath, target.nodeKind)

  let fallbackPath = getParentPath(target.relativePath)
  while (fallbackPath) {
    const parentMatch = findMatchingButton(fallbackPath, 'directory')
    if (parentMatch) {
      return {
        exactMatch,
        fallbackMatch: parentMatch,
      }
    }
    fallbackPath = getParentPath(fallbackPath)
  }

  return {
    exactMatch,
    fallbackMatch:
      panel.querySelector<HTMLElement>('[data-tree-focus-target="search"]') ??
      panel,
  }
}

export function FileTreePanel({
  rootPath,
  fileTree,
  changedFiles,
  gitFileStatuses,
  activeFile,
  expandedDirectories,
  loadingDirectories,
  isIndexing,
  onRequestCopyFullPath,
  onSelectFile,
  onRequestCopyRelativePath,
  onExpandedDirectoriesChange,
  onRequestLoadDirectory,
  onRequestCreateFile,
  onRequestCreateDirectory,
  onRequestConfirmedDeleteFile,
  onRequestConfirmedDeleteDirectory,
  onRequestRename,
  onRequestCopyToClipboard,
  onRequestPasteFromClipboard,
  onSearchFiles,
  onRequestRefresh,
}: FileTreePanelProps) {
  const [contextMenuState, setContextMenuState] =
    useState<FileTreeContextMenuState | null>(null)
  const [inlineInput, setInlineInput] = useState<InlineInputState>(null)
  const [inlineInputValue, setInlineInputValue] = useState('')
  const [inlineInputError, setInlineInputError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchState, setSearchState] = useState<{
    loading: boolean
    error: string | null
    results: WorkspaceSearchFileMatch[]
    truncated: boolean
    skippedLargeDirectoryCount: number
    depthLimitHit: boolean
    timedOut: boolean
  }>({
    loading: false,
    error: null,
    results: [],
    truncated: false,
    skippedLargeDirectoryCount: 0,
    depthLimitHit: false,
    timedOut: false,
  })
  const searchRequestTokenRef = useRef(0)
  const panelRef = useRef<HTMLElement | null>(null)
  const lastFocusedTargetRef = useRef<FocusRestoreTarget | null>(null)
  const lastScrollTopRef = useRef(0)

  const expandedDirectoriesSet = useMemo(
    () => new Set(expandedDirectories),
    [expandedDirectories],
  )
  const changedFilesSet = useMemo(() => new Set(changedFiles), [changedFiles])
  const loadingDirectoriesSet = useMemo(
    () => new Set(loadingDirectories),
    [loadingDirectories],
  )
  const changedSubtreeSet = useMemo(
    () => buildChangedSubtreeSet(fileTree, changedFilesSet),
    [fileTree, changedFilesSet],
  )
  const gitStatusSubtreeMap = useMemo(
    () => buildGitStatusSubtreeMap(fileTree, gitFileStatuses),
    [fileTree, gitFileStatuses],
  )

  useEffect(() => {
    searchRequestTokenRef.current += 1
    setContextMenuState(null)
    setSearchQuery('')
    lastFocusedTargetRef.current = null
    lastScrollTopRef.current = 0
    setSearchState({
      loading: false,
      error: null,
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
  }, [rootPath])

  useLayoutEffect(() => {
    if (inlineInput !== null) {
      lastFocusedTargetRef.current = null
      return
    }

    const panel = panelRef.current
    const target = lastFocusedTargetRef.current
    if (!panel || !target) {
      return
    }

    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    if (activeElement && panel.contains(activeElement)) {
      return
    }

    if (
      activeElement &&
      activeElement !== document.body &&
      document.contains(activeElement)
    ) {
      return
    }

    const nextFocusTarget = findFocusRestoreElement(panel, target)
    if (nextFocusTarget.exactMatch) {
      nextFocusTarget.exactMatch.focus()
      return
    }

    if (
      target.kind === 'node' &&
      target.nodeKind === 'file' &&
      activeFile === target.relativePath
    ) {
      return
    }

    nextFocusTarget.fallbackMatch?.focus()
  }, [activeFile, expandedDirectories, fileTree, inlineInput, isIndexing, loadingDirectories, rootPath])

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) {
      return
    }

    const targetScrollTop = Math.max(0, Math.trunc(lastScrollTopRef.current))
    if (panel.scrollTop !== targetScrollTop) {
      panel.scrollTop = targetScrollTop
    }
  }, [expandedDirectories, fileTree, isIndexing, loadingDirectories, rootPath, searchQuery])

  useEffect(() => {
    const trimmedQuery = searchQuery.trim()
    if (!rootPath || !onSearchFiles || trimmedQuery.length === 0) {
      searchRequestTokenRef.current += 1
      setSearchState((previous) =>
        previous.loading ||
        previous.error !== null ||
        previous.results.length > 0 ||
        previous.truncated ||
        previous.skippedLargeDirectoryCount > 0 ||
        previous.depthLimitHit ||
        previous.timedOut
          ? {
              loading: false,
              error: null,
              results: [],
              truncated: false,
              skippedLargeDirectoryCount: 0,
              depthLimitHit: false,
              timedOut: false,
            }
          : previous,
      )
      return
    }

    const requestToken = searchRequestTokenRef.current + 1
    searchRequestTokenRef.current = requestToken
    setSearchState((previous) => ({
      ...previous,
      loading: true,
      error: null,
    }))

    const timeoutId = window.setTimeout(() => {
      void onSearchFiles(trimmedQuery)
        .then((result) => {
          if (searchRequestTokenRef.current !== requestToken) {
            return
          }

          setSearchState({
            loading: false,
            error: result.ok
              ? null
              : result.error ?? 'Search failed. Please try again.',
            results: result.ok ? result.results : [],
            truncated: result.ok ? result.truncated : false,
            skippedLargeDirectoryCount: result.ok
              ? result.skippedLargeDirectoryCount
              : 0,
            depthLimitHit: result.ok ? result.depthLimitHit : false,
            timedOut: result.ok ? result.timedOut : false,
          })
        })
        .catch(() => {
          if (searchRequestTokenRef.current !== requestToken) {
            return
          }
          setSearchState({
            loading: false,
            error: 'Search failed. Please try again.',
            results: [],
            truncated: false,
            skippedLargeDirectoryCount: 0,
            depthLimitHit: false,
            timedOut: false,
          })
        })
    }, 200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [onSearchFiles, rootPath, searchQuery])

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null)
  }, [])

  const startInlineInput = useCallback(
    (parentRelativePath: string, type: 'file' | 'directory') => {
      if (parentRelativePath && !expandedDirectoriesSet.has(parentRelativePath)) {
        const nextExpanded = new Set(expandedDirectoriesSet)
        nextExpanded.add(parentRelativePath)
        onExpandedDirectoriesChange([...nextExpanded])
      }
      setInlineInput({ parentRelativePath, type })
      setInlineInputValue('')
      setInlineInputError(null)
    },
    [expandedDirectoriesSet, onExpandedDirectoriesChange],
  )

  const cancelInlineInput = useCallback(() => {
    setInlineInput(null)
    setInlineInputValue('')
    setInlineInputError(null)
  }, [])

  const startRenameInlineInput = useCallback((relativePath: string) => {
    const lastSlash = relativePath.lastIndexOf('/')
    const parentPath = lastSlash >= 0 ? relativePath.slice(0, lastSlash) : ''
    const originalName =
      lastSlash >= 0 ? relativePath.slice(lastSlash + 1) : relativePath

    setInlineInput({
      parentRelativePath: parentPath,
      type: 'rename',
      originalRelativePath: relativePath,
      originalName,
    })
    setInlineInputValue(originalName)
    setInlineInputError(null)
  }, [])

  const submitInlineInput = useCallback(() => {
    if (!inlineInput) return
    const name = inlineInputValue.trim()
    const error = validateInlineInputName(name)
    if (error) {
      setInlineInputError(error)
      return
    }
    const fullRelativePath = inlineInput.parentRelativePath
      ? `${inlineInput.parentRelativePath}/${name}`
      : name

    const handleError = (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Operation failed.'
      setInlineInputError(message)
    }
    const guardPromise = (value: unknown) => {
      if (value && typeof (value as Promise<void>).catch === 'function') {
        (value as Promise<void>).catch(handleError)
      }
    }

    try {
      if (inlineInput.type === 'rename') {
        if (name !== inlineInput.originalName) {
          guardPromise(onRequestRename?.(inlineInput.originalRelativePath, fullRelativePath))
        }
      } else if (inlineInput.type === 'file') {
        guardPromise(onRequestCreateFile?.(fullRelativePath))
      } else {
        guardPromise(onRequestCreateDirectory?.(fullRelativePath))
      }
    } catch (err) {
      handleError(err)
      return
    }
    setInlineInput(null)
    setInlineInputValue('')
    setInlineInputError(null)
  }, [inlineInput, inlineInputValue, onRequestCreateFile, onRequestCreateDirectory, onRequestRename])

  const toggleDirectory = (relativePath: string) => {
    const nextExpandedDirectories = new Set(expandedDirectoriesSet)
    const isExpanding = !nextExpandedDirectories.has(relativePath)
    let shouldLoadDirectory = false
    if (isExpanding) {
      nextExpandedDirectories.add(relativePath)
      const directoryNode = findDirectoryNode(fileTree, relativePath)
      shouldLoadDirectory = directoryNode?.childrenStatus === 'not-loaded'
    } else {
      nextExpandedDirectories.delete(relativePath)
    }

    onExpandedDirectoriesChange([...nextExpandedDirectories])
    if (shouldLoadDirectory) {
      onRequestLoadDirectory(relativePath)
    }
  }

  const handleNodeContextMenu = useCallback(
    (event: MouseEvent<HTMLButtonElement>, relativePath: string, nodeKind: 'file' | 'directory') => {
      event.preventDefault()
      setContextMenuState({
        x: event.clientX,
        y: event.clientY,
        relativePath,
        nodeKind,
      })
    },
    [],
  )

  const handlePanelContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest('button')) {
        return
      }
      event.preventDefault()
      setContextMenuState({
        x: event.clientX,
        y: event.clientY,
        relativePath: '',
        nodeKind: 'directory',
      })
    },
    [],
  )

  const handleSearchResultSelect = useCallback(
    (relativePath: string) => {
      const segments = relativePath.split('/').slice(0, -1)
      if (segments.length > 0) {
        const nextExpandedDirectories = new Set(expandedDirectoriesSet)
        let currentPath = ''
        for (const segment of segments) {
          currentPath = currentPath ? `${currentPath}/${segment}` : segment
          nextExpandedDirectories.add(currentPath)
        }
        onExpandedDirectoriesChange([...nextExpandedDirectories])
      }
      onSelectFile(relativePath)
    },
    [expandedDirectoriesSet, onExpandedDirectoriesChange, onSelectFile],
  )

  const findNodeKind = useCallback(
    (relativePath: string): 'file' | 'directory' => {
      const search = (nodes: WorkspaceFileNode[]): 'file' | 'directory' | null => {
        for (const node of nodes) {
          if (node.relativePath === relativePath) return node.kind
          if (node.kind === 'directory' && node.children && relativePath.startsWith(node.relativePath + '/')) {
            const found = search(node.children)
            if (found) return found
          }
        }
        return null
      }
      return search(fileTree) ?? 'file'
    },
    [fileTree],
  )

  const handlePanelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!event.metaKey && !event.ctrlKey) return
      if (event.key === 'c') {
        if (!activeFile) return
        event.preventDefault()
        const kind = findNodeKind(activeFile)
        onRequestCopyToClipboard?.([{ relativePath: activeFile, kind }])
      } else if (event.key === 'v') {
        event.preventDefault()
        const destDir = activeFile ? getParentPath(activeFile) : ''
        onRequestPasteFromClipboard?.(destDir)
      }
    },
    [activeFile, findNodeKind, onRequestCopyToClipboard, onRequestPasteFromClipboard],
  )

  const handlePanelFocusCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      lastFocusedTargetRef.current = getFocusRestoreTargetFromElement(
        event.target instanceof HTMLElement ? event.target : null,
      )
    },
    [],
  )

  const handlePanelScroll = useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      lastScrollTopRef.current = event.currentTarget.scrollTop
    },
    [],
  )

  const hasActiveSearch = searchQuery.trim().length > 0
  const shouldShowSearchHint =
    searchState.truncated ||
    searchState.skippedLargeDirectoryCount > 0 ||
    searchState.depthLimitHit ||
    searchState.timedOut

  if (!rootPath) {
    return (
      <section className="file-tree-panel" data-testid="file-tree-panel">
        <p className="tree-empty">Select a workspace to view files.</p>
      </section>
    )
  }

  if (isIndexing) {
    return (
      <section className="file-tree-panel" data-testid="file-tree-panel">
        <div className="tree-search-bar">
          <input
            className="tree-search-input"
            data-testid="file-tree-search-input"
            disabled
            placeholder="Search files (* supported)"
            type="search"
            value={searchQuery}
          />
          <button
            className="tree-refresh-button"
            data-testid="file-tree-refresh-button"
            disabled
            type="button"
          >
            Refresh
          </button>
        </div>
        <p className="tree-empty">Indexing workspace files...</p>
      </section>
    )
  }

  const renderBudget: RenderBudget = {
    remaining: INITIAL_RENDER_NODE_LIMIT,
    truncated: false,
  }

  const contextMenuActions = buildFileTreeContextMenuActions({
    contextMenuState,
    closeContextMenu,
    onRequestCopyRelativePath,
    onRequestCopyFullPath,
    onRequestCopyToClipboard,
    onRequestPasteFromClipboard,
    onStartInlineInput: startInlineInput,
    onStartRename: startRenameInlineInput,
    onRequestConfirmedDeleteFile,
    onRequestConfirmedDeleteDirectory,
  })

  return (
    <section
      className="file-tree-panel"
      data-testid="file-tree-panel"
      onFocusCapture={handlePanelFocusCapture}
      onContextMenu={handlePanelContextMenu}
      onKeyDown={handlePanelKeyDown}
      onScroll={handlePanelScroll}
      ref={panelRef}
      tabIndex={-1}
    >
      <div className="tree-search-bar">
        <input
          className="tree-search-input"
          data-tree-focus-target="search"
          data-testid="file-tree-search-input"
          onChange={(event) => {
            setSearchQuery(event.target.value)
          }}
          placeholder="Search files (* supported)"
          type="search"
          value={searchQuery}
        />
        <button
          className="tree-refresh-button"
          data-testid="file-tree-refresh-button"
          disabled={!onRequestRefresh}
          onClick={() => {
            onRequestRefresh?.()
          }}
          type="button"
        >
          Refresh
        </button>
        {searchQuery.length > 0 && (
          <button
            className="tree-search-clear-button"
            onClick={() => {
              setSearchQuery('')
            }}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
      {hasActiveSearch ? (
        <>
          {searchState.loading ? (
            <p className="tree-empty">Searching files...</p>
          ) : searchState.error ? (
            <p
              className="tree-empty"
              data-testid="file-tree-search-error"
            >
              {searchState.error}
            </p>
          ) : searchState.results.length > 0 ? (
            <div
              className="tree-search-results"
              data-testid="file-tree-search-results"
            >
              <ul className="tree-list">
                {searchState.results.map((result) => (
                  <li
                    className="tree-node tree-node-file"
                    key={result.relativePath}
                  >
                    <button
                      className="tree-file-button"
                      onClick={() => handleSearchResultSelect(result.relativePath)}
                      type="button"
                    >
                      <span aria-hidden className="tree-file-icon">
                        {getFileIcon(result.fileName)}
                      </span>
                      <span className="tree-file-name">{result.fileName}</span>
                      <span className="tree-search-result-path">
                        {result.relativePath}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p
              className="tree-empty"
              data-testid="file-tree-search-empty"
            >
              No files found.
            </p>
          )}
          {shouldShowSearchHint && (
            <p
              className="tree-search-hint"
              data-testid="file-tree-search-hint"
            >
              Search results may be incomplete.
            </p>
          )}
        </>
      ) : fileTree.length === 0 ? (
        <p className="tree-empty">No files found.</p>
      ) : (
        <>
          {renderFileTreeNodes({
            nodes: fileTree,
            depth: 0,
            budget: renderBudget,
            activeFile,
            changedFileSet: changedFilesSet,
            changedSubtreeSet,
            gitStatusSubtreeMap,
            expandedDirectories: expandedDirectoriesSet,
            loadingDirectoriesSet,
            onSelectFile,
            onNodeContextMenu: handleNodeContextMenu,
            onToggleDirectory: toggleDirectory,
            onRequestLoadDirectory,
          })}
          {renderBudget.truncated && (
            <p className="tree-cap-message" data-testid="file-tree-cap-message">
              Showing first {INITIAL_RENDER_NODE_LIMIT.toLocaleString()} nodes.
            </p>
          )}
        </>
      )}
      {inlineInput !== null && (
        <div className="tree-inline-input-wrapper">
          <span className="tree-inline-input-label">
            {inlineInput.type === 'rename' ? '✏️' : inlineInput.type === 'file' ? '📄' : '📁'}{' '}
            {inlineInput.parentRelativePath ? inlineInput.parentRelativePath + '/' : ''}
          </span>
          <input
            autoFocus
            className={`tree-inline-input${inlineInputError ? ' is-error' : ''}`}
            data-testid="tree-inline-input"
            onBlur={cancelInlineInput}
            onChange={(e) => {
              setInlineInputValue(e.target.value)
              setInlineInputError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitInlineInput()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelInlineInput()
              }
            }}
            placeholder={inlineInput.type === 'rename' ? 'new-name' : inlineInput.type === 'file' ? 'filename.ext' : 'directory-name'}
            type="text"
            value={inlineInputValue}
          />
          {inlineInputError && (
            <span className="tree-inline-input-error" role="alert">
              {inlineInputError}
            </span>
          )}
        </div>
      )}
      {contextMenuState && (
        <CopyActionPopover
          actions={contextMenuActions}
          ariaLabel="Copy actions"
          description={contextMenuState.relativePath || 'workspace root'}
          onClose={closeContextMenu}
          title="Copy Action"
          x={contextMenuState.x}
          y={contextMenuState.y}
        />
      )}
    </section>
  )
}
