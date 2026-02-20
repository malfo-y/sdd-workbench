import { abbreviateWorkspacePath } from './path-format'
import type { WorkspaceId } from './workspace-model'

type WorkspaceSwitcherProps = {
  workspaces: Array<{ id: WorkspaceId; rootPath: string }>
  activeWorkspaceId: WorkspaceId | null
  onSelectWorkspace: (workspaceId: WorkspaceId) => void
  onCloseWorkspace: (workspaceId: WorkspaceId) => void
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCloseWorkspace,
}: WorkspaceSwitcherProps) {
  const canCloseWorkspace =
    activeWorkspaceId !== null && workspaces.some(({ id }) => id === activeWorkspaceId)

  if (workspaces.length === 0) {
    return (
      <div className="workspace-switcher">
        <label className="workspace-switcher-label" htmlFor="workspace-switcher-select">
          Workspace
        </label>
        <select
          className="workspace-switcher-select"
          data-testid="workspace-switcher-select"
          disabled
          id="workspace-switcher-select"
          value=""
        >
          <option value="">No workspace</option>
        </select>
        <button disabled type="button">
          Close Workspace
        </button>
      </div>
    )
  }

  return (
    <div className="workspace-switcher">
      <label className="workspace-switcher-label" htmlFor="workspace-switcher-select">
        Workspace
      </label>
      <select
        className="workspace-switcher-select"
        data-testid="workspace-switcher-select"
        id="workspace-switcher-select"
        onChange={(event) => onSelectWorkspace(event.target.value)}
        value={activeWorkspaceId ?? workspaces[0].id}
      >
        {workspaces.map(({ id, rootPath }) => (
          <option key={id} value={id}>
            {abbreviateWorkspacePath(rootPath)}
          </option>
        ))}
      </select>
      <button
        disabled={!canCloseWorkspace}
        onClick={() => {
          if (!activeWorkspaceId) {
            return
          }

          onCloseWorkspace(activeWorkspaceId)
        }}
        type="button"
      >
        Close Workspace
      </button>
    </div>
  )
}
