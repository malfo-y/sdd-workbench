import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { abbreviateWorkspacePath } from './path-format'
import type { WorkspaceId } from './workspace-model'

type WorkspaceSwitcherProps = {
  workspaces: Array<{ id: WorkspaceId; rootPath: string }>
  activeWorkspaceId: WorkspaceId | null
  onSelectWorkspace: (workspaceId: WorkspaceId) => void
  onCloseWorkspace?: (workspaceId: WorkspaceId) => void | Promise<void>
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCloseWorkspace,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const switcherRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const activeWorkspace = useMemo(
    () =>
      workspaces.find(({ id }) => id === activeWorkspaceId) ?? workspaces[0] ?? null,
    [activeWorkspaceId, workspaces],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (!switcherRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) {
      return
    }

    const updateMenuPosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect()
      if (!triggerRect) {
        return
      }

      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth || 1024
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 768
      const availableWidth = Math.max(260, viewportWidth - triggerRect.left - 12)
      const maxHeight = Math.max(160, viewportHeight - triggerRect.bottom - 12)

      setMenuStyle({
        left: Math.round(triggerRect.left),
        maxHeight: Math.round(maxHeight),
        maxWidth: Math.round(availableWidth),
        minWidth: Math.round(Math.min(triggerRect.width, availableWidth)),
        top: Math.round(triggerRect.bottom + 4),
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen])

  if (workspaces.length === 0) {
    return (
      <div className="workspace-switcher" ref={switcherRef}>
        <label className="workspace-switcher-label" htmlFor="workspace-switcher-button">
          Workspace
        </label>
        <button
          className="workspace-switcher-trigger"
          data-testid="workspace-switcher-button"
          disabled
          id="workspace-switcher-button"
          type="button"
        >
          No workspace
        </button>
        <select
          aria-hidden="true"
          className="workspace-switcher-select workspace-switcher-select-compat"
          data-testid="workspace-switcher-select"
          disabled
          tabIndex={-1}
          value=""
        >
          <option value="">No workspace</option>
        </select>
      </div>
    )
  }

  const activeWorkspaceLabel = activeWorkspace
    ? abbreviateWorkspacePath(activeWorkspace.rootPath)
    : 'No workspace'

  return (
    <div className="workspace-switcher" ref={switcherRef}>
      <label className="workspace-switcher-label" htmlFor="workspace-switcher-button">
        Workspace
      </label>
      <div className="workspace-switcher-control">
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="workspace-switcher-trigger"
          data-testid="workspace-switcher-button"
          id="workspace-switcher-button"
          onClick={() => {
            setIsOpen((previous) => !previous)
          }}
          ref={triggerRef}
          title={activeWorkspace?.rootPath ?? activeWorkspaceLabel}
          type="button"
        >
          <span className="workspace-switcher-trigger-label">
            {activeWorkspaceLabel}
          </span>
          <span aria-hidden="true" className="workspace-switcher-trigger-icon">
            ▾
          </span>
        </button>
        {isOpen && (
          <div
            aria-label="Open workspaces"
            className="workspace-switcher-menu"
            role="menu"
            style={menuStyle}
          >
            {workspaces.map(({ id, rootPath }) => {
              const label = abbreviateWorkspacePath(rootPath)
              const isActive = id === activeWorkspace?.id
              return (
                <div className="workspace-switcher-option" key={id}>
                  <button
                    className="workspace-switcher-option-select"
                    onClick={() => {
                      onSelectWorkspace(id)
                      setIsOpen(false)
                    }}
                    role="menuitem"
                    title={rootPath}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="workspace-switcher-option-check"
                    >
                      {isActive ? '✓' : ''}
                    </span>
                    <span className="workspace-switcher-option-label">
                      {label}
                    </span>
                  </button>
                  {onCloseWorkspace && (
                    <button
                      aria-label={`Close workspace ${label}`}
                      className="workspace-switcher-option-close"
                      onClick={(event) => {
                        event.stopPropagation()
                        void onCloseWorkspace(id)
                      }}
                      title="Close workspace"
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <select
        aria-hidden="true"
        className="workspace-switcher-select workspace-switcher-select-compat"
        data-testid="workspace-switcher-select"
        onChange={(event) => onSelectWorkspace(event.target.value)}
        tabIndex={-1}
        value={activeWorkspaceId ?? workspaces[0].id}
      >
        {workspaces.map(({ id, rootPath }) => (
          <option key={id} value={id}>
            {abbreviateWorkspacePath(rootPath)}
          </option>
        ))}
      </select>
    </div>
  )
}
