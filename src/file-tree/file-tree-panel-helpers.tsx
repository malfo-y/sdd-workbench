import type { MouseEvent, ReactNode } from 'react'
import { GitStatusBadge } from './git-status-badge'
import type { GitFileStatusKind } from '../workspace/workspace-model'

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

export type RenderBudget = {
  remaining: number
  truncated: boolean
}

export type FileTreeContextMenuState = {
  x: number
  y: number
  relativePath: string
  nodeKind: 'file' | 'directory'
}

type FileTreeContextMenuAction = {
  label: string
  onSelect: () => void
}

type FileTreeNodeContextMenuHandler = (
  event: MouseEvent<HTMLButtonElement>,
  relativePath: string,
  nodeKind: 'file' | 'directory',
) => void

type RenderFileTreeNodesParams = {
  nodes: WorkspaceFileNode[]
  depth: number
  budget: RenderBudget
  activeFile: string | null
  changedFileSet: Set<string>
  changedSubtreeSet: Set<string>
  gitStatusSubtreeMap: Map<string, GitFileStatusKind>
  expandedDirectories: Set<string>
  loadingDirectoriesSet: Set<string>
  onSelectFile: (relativePath: string) => void
  onNodeContextMenu: FileTreeNodeContextMenuHandler
  onToggleDirectory: (relativePath: string) => void
  onRequestLoadDirectory: (
    relativePath: string,
    options?: { append?: boolean },
  ) => void
}

type BuildContextMenuActionsParams = {
  contextMenuState: FileTreeContextMenuState | null
  closeContextMenu: () => void
  onRequestCopyRelativePath: (relativePath: string) => void
  onRequestCopyFullPath?: (relativePath: string) => void
  onRequestCopyToClipboard?: (
    entries: { relativePath: string; kind: 'file' | 'directory' }[],
  ) => void
  onRequestPasteFromClipboard?: (destDir: string) => void
  onStartInlineInput: (
    parentRelativePath: string,
    type: 'file' | 'directory',
  ) => void
  onStartRename: (relativePath: string) => void
  onRequestConfirmedDeleteFile?: (relativePath: string) => void
  onRequestConfirmedDeleteDirectory?: (relativePath: string) => void
}

export function getFileIcon(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex < 0) return '📄'
  const ext = fileName.slice(dotIndex).toLowerCase()
  return FILE_ICON_MAP[ext] ?? '📄'
}

export function getParentPath(relativePath: string): string {
  const lastSlash = relativePath.lastIndexOf('/')
  return lastSlash < 0 ? '' : relativePath.slice(0, lastSlash)
}

export function renderFileTreeNodes({
  nodes,
  depth,
  budget,
  activeFile,
  changedFileSet,
  changedSubtreeSet,
  gitStatusSubtreeMap,
  expandedDirectories,
  loadingDirectoriesSet,
  onSelectFile,
  onNodeContextMenu,
  onToggleDirectory,
  onRequestLoadDirectory,
}: RenderFileTreeNodesParams): ReactNode {
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
            data-tree-kind="directory"
            data-tree-relative-path={node.relativePath}
            onContextMenu={(event) =>
              onNodeContextMenu(event, node.relativePath, 'directory')
            }
            onClick={() => onToggleDirectory(node.relativePath)}
            type="button"
          >
            <span aria-hidden className="tree-directory-chevron">
              {isExpanded ? '▾' : '▸'}
            </span>
            <span className="tree-node-label">{node.name}</span>
            {shouldShowGitBadge && (
              <GitStatusBadge
                status={dirGitStatus}
                testId={`tree-git-badge-${node.relativePath}`}
              />
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
          {isExpanded && node.childrenStatus === 'not-loaded' ? (
            <div
              className="tree-node tree-node-placeholder"
              key={`${node.relativePath}--placeholder`}
              style={{ paddingLeft: `${(depth + 1) * 12}px` }}
            >
              <span className="tree-placeholder-text">
                {loadingDirectoriesSet.has(node.relativePath) ? 'Loading...' : ''}
              </span>
            </div>
          ) : isExpanded ? (
            <>
              {renderFileTreeNodes({
                nodes: node.children ?? [],
                depth: depth + 1,
                budget,
                activeFile,
                changedFileSet,
                changedSubtreeSet,
                gitStatusSubtreeMap,
                expandedDirectories,
                loadingDirectoriesSet,
                onSelectFile,
                onNodeContextMenu,
                onToggleDirectory,
                onRequestLoadDirectory,
              })}
              {node.childrenStatus === 'partial' &&
                node.totalChildCount !== undefined && (
                  <div
                    className="tree-node tree-node-cap"
                    key={`${node.relativePath}--cap`}
                    style={{ paddingLeft: `${(depth + 1) * 12}px` }}
                  >
                    <span className="tree-cap-text">
                      Showing {loadedChildCount} of {node.totalChildCount} items
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
          data-tree-kind="file"
          data-tree-relative-path={node.relativePath}
          onContextMenu={(event) =>
            onNodeContextMenu(event, node.relativePath, 'file')
          }
          onClick={() => onSelectFile(node.relativePath)}
          type="button"
        >
          <span aria-hidden className="tree-file-icon">
            {getFileIcon(node.name)}
          </span>
          <span className="tree-file-name">{node.name}</span>
          {fileGitStatus && (
            <GitStatusBadge
              status={fileGitStatus}
              testId={`tree-git-badge-${node.relativePath}`}
            />
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

export function buildFileTreeContextMenuActions({
  contextMenuState,
  closeContextMenu,
  onRequestCopyRelativePath,
  onRequestCopyFullPath,
  onRequestCopyToClipboard,
  onRequestPasteFromClipboard,
  onStartInlineInput,
  onStartRename,
  onRequestConfirmedDeleteFile,
  onRequestConfirmedDeleteDirectory,
}: BuildContextMenuActionsParams): FileTreeContextMenuAction[] {
  if (!contextMenuState) {
    return []
  }

  const parentPath =
    contextMenuState.nodeKind === 'file'
      ? getParentPath(contextMenuState.relativePath)
      : contextMenuState.relativePath

  const actions: FileTreeContextMenuAction[] = []

  if (contextMenuState.relativePath !== '') {
    actions.push({
      label: 'Copy Relative Path',
      onSelect: () => {
        onRequestCopyRelativePath(contextMenuState.relativePath)
      },
    })

    if (onRequestCopyFullPath) {
      actions.push({
        label: 'Copy Full Path',
        onSelect: () => {
          onRequestCopyFullPath(contextMenuState.relativePath)
        },
      })
    }

    actions.push({
      label: 'Copy',
      onSelect: () => {
        onRequestCopyToClipboard?.([
          {
            relativePath: contextMenuState.relativePath,
            kind: contextMenuState.nodeKind,
          },
        ])
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
      onStartInlineInput(parentPath, 'file')
    },
  })

  actions.push({
    label: 'New Directory here',
    onSelect: () => {
      onStartInlineInput(parentPath, 'directory')
    },
  })

  if (contextMenuState.relativePath !== '') {
    actions.push({
      label: 'Rename',
      onSelect: () => {
        closeContextMenu()
        onStartRename(contextMenuState.relativePath)
      },
    })

    actions.push({
      label: 'Delete',
      onSelect: () => {
        closeContextMenu()
        if (contextMenuState.nodeKind === 'file') {
          onRequestConfirmedDeleteFile?.(contextMenuState.relativePath)
        } else {
          onRequestConfirmedDeleteDirectory?.(contextMenuState.relativePath)
        }
      },
    })
  }

  return actions
}
