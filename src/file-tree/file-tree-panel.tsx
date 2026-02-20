import { useEffect, useState, type ReactNode } from 'react'

const INITIAL_RENDER_NODE_LIMIT = 500

type FileTreePanelProps = {
  rootPath: string | null
  fileTree: WorkspaceFileNode[]
  activeFile: string | null
  isIndexing: boolean
  onSelectFile: (relativePath: string) => void
}

type RenderBudget = {
  remaining: number
  truncated: boolean
}

function renderFileTreeNodes(
  nodes: WorkspaceFileNode[],
  depth: number,
  budget: RenderBudget,
  activeFile: string | null,
  onSelectFile: (relativePath: string) => void,
  expandedDirectories: Set<string>,
  onToggleDirectory: (relativePath: string) => void,
  showFilesAtCurrentLevel: boolean,
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
      rendered.push(
        <li
          className="tree-node tree-node-directory"
          key={node.relativePath}
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <button
            aria-expanded={isExpanded}
            className="tree-directory-button"
            onClick={() => onToggleDirectory(node.relativePath)}
            type="button"
          >
            <span aria-hidden className="tree-directory-chevron">
              {isExpanded ? '▾' : '▸'}
            </span>
            <span className="tree-node-label">{node.name}</span>
          </button>
          {isExpanded &&
            renderFileTreeNodes(
              node.children ?? [],
              depth + 1,
              budget,
              activeFile,
              onSelectFile,
              expandedDirectories,
              onToggleDirectory,
              true,
            )}
        </li>,
      )
      continue
    }

    if (!showFilesAtCurrentLevel) {
      continue
    }

    const isActive = activeFile === node.relativePath
    rendered.push(
      <li
        className={`tree-node tree-node-file ${isActive ? 'is-active' : ''}`}
        key={node.relativePath}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          className="tree-file-button"
          onClick={() => onSelectFile(node.relativePath)}
          type="button"
        >
          {node.name}
        </button>
      </li>,
    )
  }

  return <ul className="tree-list">{rendered}</ul>
}

export function FileTreePanel({
  rootPath,
  fileTree,
  activeFile,
  isIndexing,
  onSelectFile,
}: FileTreePanelProps) {
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(
    () => new Set(),
  )

  useEffect(() => {
    setExpandedDirectories(new Set())
  }, [rootPath])

  const toggleDirectory = (relativePath: string) => {
    setExpandedDirectories((previous) => {
      const next = new Set(previous)
      if (next.has(relativePath)) {
        next.delete(relativePath)
      } else {
        next.add(relativePath)
      }
      return next
    })
  }

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
  const hasRootDirectory = fileTree.some((node) => node.kind === 'directory')
  const showRootFiles = !hasRootDirectory

  return (
    <section className="file-tree-panel" data-testid="file-tree-panel">
      {renderFileTreeNodes(
        fileTree,
        0,
        renderBudget,
        activeFile,
        onSelectFile,
        expandedDirectories,
        toggleDirectory,
        showRootFiles,
      )}
      {renderBudget.truncated && (
        <p className="tree-cap-message" data-testid="file-tree-cap-message">
          Showing first {INITIAL_RENDER_NODE_LIMIT} nodes.
        </p>
      )}
    </section>
  )
}
