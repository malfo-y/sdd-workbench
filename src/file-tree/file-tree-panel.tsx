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

type FileTreePanelProps = {
  rootPath: string | null
  fileTree: WorkspaceFileNode[]
  changedFiles: string[]
  activeFile: string | null
  expandedDirectories: string[]
  isIndexing: boolean
  onSelectFile: (relativePath: string) => void
  onRequestCopyRelativePath: (relativePath: string) => void
  onExpandedDirectoriesChange: (expandedDirectories: string[]) => void
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
            renderFileTreeNodes(
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
            )}
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
  isIndexing,
  onSelectFile,
  onRequestCopyRelativePath,
  onExpandedDirectoriesChange,
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
    if (nextExpandedDirectories.has(relativePath)) {
      nextExpandedDirectories.delete(relativePath)
    } else {
      nextExpandedDirectories.add(relativePath)
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
