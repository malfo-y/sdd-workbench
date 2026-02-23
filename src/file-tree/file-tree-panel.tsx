import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { CopyActionPopover } from '../context-menu/copy-action-popover'

const INITIAL_RENDER_NODE_LIMIT = 500

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

type FileTreePanelProps = {
  rootPath: string | null
  fileTree: WorkspaceFileNode[]
  changedFiles: string[]
  activeFile: string | null
  expandedDirectories: string[]
  loadingDirectories: string[]
  isIndexing: boolean
  onSelectFile: (relativePath: string) => void
  onRequestCopyRelativePath: (relativePath: string) => void
  onExpandedDirectoriesChange: (expandedDirectories: string[]) => void
  onRequestLoadDirectory: (relativePath: string) => void
}

type RenderBudget = {
  remaining: number
  truncated: boolean
}

function buildChangedSubtreeSet(
  nodes: WorkspaceFileNode[],
  changedFileSet: Set<string>,
): Set<string> {
  const changedSubtreeSet = new Set<string>()

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

    const subtreeChanged = nodeChanged || childChanged
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
  onSelectFile: (relativePath: string) => void,
  onNodeContextMenu: (
    event: MouseEvent<HTMLButtonElement>,
    relativePath: string,
  ) => void,
  expandedDirectories: Set<string>,
  onToggleDirectory: (relativePath: string) => void,
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
      const shouldShowChangedIndicator =
        isChanged || (!isExpanded && hasChangedInSubtree)
      rendered.push(
        <li
          className="tree-node tree-node-directory"
          key={node.relativePath}
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <button
            aria-expanded={isExpanded}
            className="tree-directory-button"
            onContextMenu={(event) => onNodeContextMenu(event, node.relativePath)}
            onClick={() => onToggleDirectory(node.relativePath)}
            type="button"
          >
            <span aria-hidden className="tree-directory-chevron">
              {isExpanded ? '▾' : '▸'}
            </span>
            <span className="tree-node-label">{node.name}</span>
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
                <li
                  className="tree-node tree-node-placeholder"
                  key={`${node.relativePath}--placeholder`}
                  style={{ paddingLeft: `${(depth + 1) * 12}px` }}
                >
                  <span className="tree-placeholder-text">
                    {loadingDirectoriesSet.has(node.relativePath)
                      ? 'Loading...'
                      : ''}
                  </span>
                </li>
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
                  onSelectFile,
                  onNodeContextMenu,
                  expandedDirectories,
                  onToggleDirectory,
                  loadingDirectoriesSet,
                )}
                {node.childrenStatus === 'partial' &&
                  node.totalChildCount !== undefined && (
                    <li
                      className="tree-node tree-node-cap"
                      key={`${node.relativePath}--cap`}
                      style={{ paddingLeft: `${(depth + 1) * 12}px` }}
                    >
                      <span className="tree-cap-text">
                        Showing {(node.children ?? []).length} of{' '}
                        {node.totalChildCount} items
                      </span>
                    </li>
                  )}
              </>
            ) : null}
        </li>,
      )
      continue
    }

    const isActive = activeFile === node.relativePath
    const isChanged = changedFileSet.has(node.relativePath)
    rendered.push(
      <li
        className={`tree-node tree-node-file ${isActive ? 'is-active' : ''}`}
        key={node.relativePath}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          className="tree-file-button"
          onContextMenu={(event) => onNodeContextMenu(event, node.relativePath)}
          onClick={() => onSelectFile(node.relativePath)}
          type="button"
        >
          <span aria-hidden className="tree-file-icon">{getFileIcon(node.name)}</span>
          <span className="tree-file-name">{node.name}</span>
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

export function FileTreePanel({
  rootPath,
  fileTree,
  changedFiles,
  activeFile,
  expandedDirectories,
  loadingDirectories,
  isIndexing,
  onSelectFile,
  onRequestCopyRelativePath,
  onExpandedDirectoriesChange,
  onRequestLoadDirectory,
}: FileTreePanelProps) {
  const [contextMenuState, setContextMenuState] = useState<{
    x: number
    y: number
    relativePath: string
  } | null>(null)
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

  useEffect(() => {
    setContextMenuState(null)
  }, [rootPath])

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null)
  }, [])

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
    (event: MouseEvent<HTMLButtonElement>, relativePath: string) => {
      event.preventDefault()
      setContextMenuState({
        x: event.clientX,
        y: event.clientY,
        relativePath,
      })
    },
    [],
  )

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
        <p className="tree-empty">Indexing workspace files...</p>
      </section>
    )
  }

  if (fileTree.length === 0) {
    return (
      <section className="file-tree-panel" data-testid="file-tree-panel">
        <p className="tree-empty">No files found.</p>
      </section>
    )
  }

  const renderBudget: RenderBudget = {
    remaining: INITIAL_RENDER_NODE_LIMIT,
    truncated: false,
  }

  return (
    <section className="file-tree-panel" data-testid="file-tree-panel">
      {renderFileTreeNodes(
        fileTree,
        0,
        renderBudget,
        activeFile,
        changedFilesSet,
        changedSubtreeSet,
        onSelectFile,
        handleNodeContextMenu,
        expandedDirectoriesSet,
        toggleDirectory,
        loadingDirectoriesSet,
      )}
      {renderBudget.truncated && (
        <p className="tree-cap-message" data-testid="file-tree-cap-message">
          Showing first {INITIAL_RENDER_NODE_LIMIT} nodes.
        </p>
      )}
      {contextMenuState && (
        <CopyActionPopover
          actions={[
            {
              label: 'Copy Relative Path',
              onSelect: () => {
                onRequestCopyRelativePath(contextMenuState.relativePath)
              },
            },
          ]}
          ariaLabel="Copy actions"
          description={contextMenuState.relativePath}
          onClose={closeContextMenu}
          title="Copy Action"
          x={contextMenuState.x}
          y={contextMenuState.y}
        />
      )}
    </section>
  )
}
