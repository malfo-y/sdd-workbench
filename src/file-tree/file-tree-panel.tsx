import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { CopyActionPopover } from '../context-menu/copy-action-popover'
import type { GitFileStatusKind } from '../workspace/workspace-model'

const INITIAL_RENDER_NODE_LIMIT = 10_000

const FILE_ICON_MAP: Record<string, string> = {
  '.py': '🐍',
  '.md': '📝',
  '.ts': '🔷',
  '.tsx': '🔷',
  '.js': '🟡',
  '.jsx': '🟡',
  '.json': '📋',
  '.css': '🎨',
  '.html': '🌐',
  '.yml': '⚙️',
  '.yaml': '⚙️',
  '.toml': '⚙️',
  '.sh': '📜',
  '.bash': '📜',
  '.zsh': '📜',
  '.png': '🖼️',
  '.jpg': '🖼️',
  '.jpeg': '🖼️',
  '.gif': '🖼️',
  '.svg': '🖼️',
}

function getFileIcon(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex < 0) return '📄'
  const ext = fileName.slice(dotIndex).toLowerCase()
  return FILE_ICON_MAP[ext] ?? '📄'
}

function getParentPath(relativePath: string): string {
  const lastSlash = relativePath.lastIndexOf('/')
  return lastSlash < 0 ? '' : relativePath.slice(0, lastSlash)
}

type FileTreePanelProps = {
  rootPath: string | null
  fileTree: WorkspaceFileNode[]
  changedFiles: string[]
  gitFileStatuses: Record<string, GitFileStatusKind>
  activeFile: string | null
  expandedDirectories: string[]
  loadingDirectories: string[]
  isIndexing: boolean
  onSelectFile: (relativePath: string) => void
  onRequestCopyRelativePath: (relativePath: string) => void
  onExpandedDirectoriesChange: (expandedDirectories: string[]) => void
  onRequestLoadDirectory: (
    relativePath: string,
    options?: { append?: boolean },
  ) => void
  onRequestCreateFile?: (relativePath: string) => void
  onRequestCreateDirectory?: (relativePath: string) => void
  onRequestDeleteFile?: (relativePath: string) => void
  onRequestDeleteDirectory?: (relativePath: string) => void
  onRequestRename?: (oldRelativePath: string, newRelativePath: string) => void
  onRequestCopyToClipboard?: (entries: { relativePath: string; kind: 'file' | 'directory' }[]) => void
  onRequestPasteFromClipboard?: (destDir: string) => void
  onSearchFiles?: (query: string) => Promise<WorkspaceSearchFilesResult>
}

type RenderBudget = {
  remaining: number
  truncated: boolean
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

function renderFileTreeNodes(
  nodes: WorkspaceFileNode[],
  depth: number,
  budget: RenderBudget,
  activeFile: string | null,
  changedFileSet: Set<string>,
  changedSubtreeSet: Set<string>,
  gitStatusSubtreeMap: Map<string, GitFileStatusKind>,
  onSelectFile: (relativePath: string) => void,
  onNodeContextMenu: (
    event: MouseEvent<HTMLButtonElement>,
    relativePath: string,
    nodeKind: 'file' | 'directory',
  ) => void,
  expandedDirectories: Set<string>,
  onToggleDirectory: (relativePath: string) => void,
  onRequestLoadDirectory: (
    relativePath: string,
    options?: { append?: boolean },
  ) => void,
  loadingDirectoriesSet: Set<string>,
): ReactNode {
  if (nodes.length === 0) {
    return null
  }

  const rendered: ReactNode[] = []

  for (const node of nodes) {
    if (budget.remaining <= 0) {
      budget.truncated = true
      break
    }

    budget.remaining -= 1

    if (node.kind === 'directory') {
      const isExpanded = expandedDirectories.has(node.relativePath)
      const hasChangedInSubtree = changedSubtreeSet.has(node.relativePath)
      const isChanged = changedFileSet.has(node.relativePath)
      const hasHiddenChildren =
        node.childrenStatus === 'not-loaded' || node.childrenStatus === 'partial'
      const shouldShowChangedIndicator =
        isChanged ||
        (!isExpanded && hasChangedInSubtree) ||
        (isExpanded && hasChangedInSubtree && hasHiddenChildren)
      const dirGitStatus = gitStatusSubtreeMap.get(node.relativePath) ?? null
      const shouldShowGitBadge = dirGitStatus !== null && !isExpanded
      const loadedChildCount = (node.children ?? []).length
      const hasMoreChildren =
        node.childrenStatus === 'partial' &&
        node.totalChildCount !== undefined &&
        loadedChildCount < node.totalChildCount
      rendered.push(
        <li
          className="tree-node tree-node-directory"
          key={node.relativePath}
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <button
            aria-expanded={isExpanded}
            className="tree-directory-button"
            onContextMenu={(event) => onNodeContextMenu(event, node.relativePath, 'directory')}
            onClick={() => onToggleDirectory(node.relativePath)}
            type="button"
          >
            <span aria-hidden className="tree-directory-chevron">
              {isExpanded ? '▾' : '▸'}
            </span>
            <span className="tree-node-label">{node.name}</span>
            {shouldShowGitBadge && (
              <span
                aria-hidden
                className={`tree-git-status-badge tree-git-status-badge--${dirGitStatus}`}
                data-testid={`tree-git-badge-${node.relativePath}`}
                title={dirGitStatus === 'modified' ? 'Modified' : dirGitStatus === 'untracked' ? 'Untracked' : 'Added'}
              >
                {dirGitStatus === 'modified' ? 'M' : 'U'}
              </span>
            )}
            {shouldShowChangedIndicator && (
              <span
                aria-hidden
                className="tree-file-changed-indicator"
                data-testid={`tree-changed-indicator-${node.relativePath}`}
                title="Changed"
              >
                ●
              </span>
            )}
          </button>
          {isExpanded &&
            node.childrenStatus === 'not-loaded' ? (
              isExpanded && (
                <div
                  className="tree-node tree-node-placeholder"
                  key={`${node.relativePath}--placeholder`}
                  style={{ paddingLeft: `${(depth + 1) * 12}px` }}
                >
                  <span className="tree-placeholder-text">
                    {loadingDirectoriesSet.has(node.relativePath)
                      ? 'Loading...'
                      : ''}
                  </span>
                </div>
              )
            ) : isExpanded ? (
              <>
                {renderFileTreeNodes(
                  node.children ?? [],
                  depth + 1,
                  budget,
                  activeFile,
                  changedFileSet,
                  changedSubtreeSet,
                  gitStatusSubtreeMap,
                  onSelectFile,
                  onNodeContextMenu,
                  expandedDirectories,
                  onToggleDirectory,
                  onRequestLoadDirectory,
                  loadingDirectoriesSet,
                )}
                {node.childrenStatus === 'partial' &&
                  node.totalChildCount !== undefined && (
                    <div
                      className="tree-node tree-node-cap"
                      key={`${node.relativePath}--cap`}
                      style={{ paddingLeft: `${(depth + 1) * 12}px` }}
                    >
                      <span className="tree-cap-text">
                        Showing {loadedChildCount} of{' '}
                        {node.totalChildCount} items
                      </span>
                      {hasMoreChildren && (
                        <button
                          className="tree-load-more-button"
                          disabled={loadingDirectoriesSet.has(node.relativePath)}
                          onClick={() =>
                            onRequestLoadDirectory(node.relativePath, {
                              append: true,
                            })}
                          type="button"
                        >
                          {loadingDirectoriesSet.has(node.relativePath)
                            ? 'Loading...'
                            : 'Load more'}
                        </button>
                      )}
                    </div>
                  )}
              </>
            ) : null}
        </li>,
      )
      continue
    }

    const isActive = activeFile === node.relativePath
    const isChanged = changedFileSet.has(node.relativePath)
    const fileGitStatus = gitStatusSubtreeMap.get(node.relativePath) ?? null
    rendered.push(
      <li
        className={`tree-node tree-node-file ${isActive ? 'is-active' : ''}`}
        key={node.relativePath}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          className="tree-file-button"
          onContextMenu={(event) => onNodeContextMenu(event, node.relativePath, 'file')}
          onClick={() => onSelectFile(node.relativePath)}
          type="button"
        >
          <span aria-hidden className="tree-file-icon">{getFileIcon(node.name)}</span>
          <span className="tree-file-name">{node.name}</span>
          {fileGitStatus && (
            <span
              aria-hidden
              className={`tree-git-status-badge tree-git-status-badge--${fileGitStatus}`}
              data-testid={`tree-git-badge-${node.relativePath}`}
              title={fileGitStatus === 'modified' ? 'Modified' : fileGitStatus === 'untracked' ? 'Untracked' : 'Added'}
            >
              {fileGitStatus === 'modified' ? 'M' : 'U'}
            </span>
          )}
          {isChanged && (
            <span
              aria-hidden
              className="tree-file-changed-indicator"
              data-testid={`tree-changed-indicator-${node.relativePath}`}
              title="Changed"
            >
              ●
            </span>
          )}
        </button>
      </li>,
    )
  }

  return <ul className="tree-list">{rendered}</ul>
}

function validateInlineInputName(name: string): string | null {
  if (!name.trim()) return 'Name cannot be empty.'
  if (name.includes('/')) return 'Name cannot contain "/".'
  if (name === '.' || name === '..') return 'Name cannot be "." or "..".'
  return null
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
  onSelectFile,
  onRequestCopyRelativePath,
  onExpandedDirectoriesChange,
  onRequestLoadDirectory,
  onRequestCreateFile,
  onRequestCreateDirectory,
  onRequestDeleteFile,
  onRequestDeleteDirectory,
  onRequestRename,
  onRequestCopyToClipboard,
  onRequestPasteFromClipboard,
  onSearchFiles,
}: FileTreePanelProps) {
  const [contextMenuState, setContextMenuState] = useState<{
    x: number
    y: number
    relativePath: string
    nodeKind: 'file' | 'directory'
  } | null>(null)
  const [inlineInput, setInlineInput] = useState<InlineInputState>(null)
  const [inlineInputValue, setInlineInputValue] = useState('')
  const [inlineInputError, setInlineInputError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchState, setSearchState] = useState<{
    loading: boolean
    results: WorkspaceSearchFileMatch[]
    truncated: boolean
    skippedLargeDirectoryCount: number
    depthLimitHit: boolean
    timedOut: boolean
  }>({
    loading: false,
    results: [],
    truncated: false,
    skippedLargeDirectoryCount: 0,
    depthLimitHit: false,
    timedOut: false,
  })
  const searchRequestTokenRef = useRef(0)

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
    setContextMenuState(null)
    setSearchQuery('')
    setSearchState({
      loading: false,
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
  }, [rootPath])

  useEffect(() => {
    const trimmedQuery = searchQuery.trim()
    if (!rootPath || !onSearchFiles || trimmedQuery.length === 0) {
      setSearchState((previous) =>
        previous.loading ||
        previous.results.length > 0 ||
        previous.truncated ||
        previous.skippedLargeDirectoryCount > 0 ||
        previous.depthLimitHit ||
        previous.timedOut
          ? {
              loading: false,
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
    }))

    const timeoutId = window.setTimeout(() => {
      void onSearchFiles(trimmedQuery)
        .then((result) => {
          if (searchRequestTokenRef.current !== requestToken) {
            return
          }

          setSearchState({
            loading: false,
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

    if (inlineInput.type === 'rename') {
      if (name !== inlineInput.originalName) {
        onRequestRename?.(inlineInput.originalRelativePath, fullRelativePath)
      }
    } else if (inlineInput.type === 'file') {
      onRequestCreateFile?.(fullRelativePath)
    } else {
      onRequestCreateDirectory?.(fullRelativePath)
    }
    setInlineInput(null)
    setInlineInputValue('')
    setInlineInputError(null)
  }, [inlineInput, inlineInputValue, onRequestCreateFile, onRequestCreateDirectory, onRequestRename])

  const toggleDirectory = (relativePath: string) => {
    const nextExpandedDirectories = new Set(expandedDirectoriesSet)
    const isExpanding = !nextExpandedDirectories.has(relativePath)
    if (isExpanding) {
      nextExpandedDirectories.add(relativePath)
      const directoryNode = findDirectoryNode(fileTree, relativePath)
      if (directoryNode?.childrenStatus === 'not-loaded') {
        onRequestLoadDirectory(relativePath)
      }
    } else {
      nextExpandedDirectories.delete(relativePath)
    }

    onExpandedDirectoriesChange([...nextExpandedDirectories])
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
        </div>
        <p className="tree-empty">Indexing workspace files...</p>
      </section>
    )
  }

  const renderBudget: RenderBudget = {
    remaining: INITIAL_RENDER_NODE_LIMIT,
    truncated: false,
  }

  const contextMenuActions = contextMenuState
    ? (() => {
        const parentPath = contextMenuState.nodeKind === 'file'
          ? getParentPath(contextMenuState.relativePath)
          : contextMenuState.relativePath

        const actions: Array<{ label: string; onSelect: () => void }> = []

        if (contextMenuState.relativePath !== '') {
          actions.push({
            label: 'Copy Relative Path',
            onSelect: () => {
              onRequestCopyRelativePath(contextMenuState.relativePath)
            },
          })

          actions.push({
            label: 'Copy',
            onSelect: () => {
              onRequestCopyToClipboard?.([{
                relativePath: contextMenuState.relativePath,
                kind: contextMenuState.nodeKind,
              }])
            },
          })
        }

        actions.push({
          label: 'Paste',
          onSelect: () => {
            onRequestPasteFromClipboard?.(parentPath)
          },
        })

        actions.push({
          label: 'New File here',
          onSelect: () => {
            startInlineInput(parentPath, 'file')
          },
        })

        actions.push({
          label: 'New Directory here',
          onSelect: () => {
            startInlineInput(parentPath, 'directory')
          },
        })

        if (contextMenuState.relativePath !== '') {
          actions.push({
            label: 'Rename',
            onSelect: () => {
              closeContextMenu()
              const relPath = contextMenuState.relativePath
              const lastSlash = relPath.lastIndexOf('/')
              const parentPath = lastSlash >= 0 ? relPath.slice(0, lastSlash) : ''
              const originalName = lastSlash >= 0 ? relPath.slice(lastSlash + 1) : relPath
              setInlineInput({
                parentRelativePath: parentPath,
                type: 'rename',
                originalRelativePath: relPath,
                originalName,
              })
              setInlineInputValue(originalName)
              setInlineInputError(null)
            },
          })

          actions.push({
            label: 'Delete',
            onSelect: () => {
              closeContextMenu()
              if (contextMenuState.nodeKind === 'file') {
                onRequestDeleteFile?.(contextMenuState.relativePath)
              } else {
                onRequestDeleteDirectory?.(contextMenuState.relativePath)
              }
            },
          })
        }

        return actions
      })()
    : []

  return (
    <section
      className="file-tree-panel"
      data-testid="file-tree-panel"
      onContextMenu={handlePanelContextMenu}
      onKeyDown={handlePanelKeyDown}
      tabIndex={-1}
    >
      <div className="tree-search-bar">
        <input
          className="tree-search-input"
          data-testid="file-tree-search-input"
          onChange={(event) => {
            setSearchQuery(event.target.value)
          }}
          placeholder="Search files (* supported)"
          type="search"
          value={searchQuery}
        />
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
          {renderFileTreeNodes(
            fileTree,
            0,
            renderBudget,
            activeFile,
            changedFilesSet,
            changedSubtreeSet,
            gitStatusSubtreeMap,
            onSelectFile,
            handleNodeContextMenu,
            expandedDirectoriesSet,
            toggleDirectory,
            onRequestLoadDirectory,
            loadingDirectoriesSet,
          )}
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
