import { useEffect, useState } from 'react'
import type { WorkspaceRemoteProfile } from './workspace-model'

type RemoteConnectStep = 'profile' | 'directory'

type RemoteConnectModalProps = {
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onBrowse: (
    request: WorkspaceRemoteDirectoryBrowseRequest,
  ) => Promise<WorkspaceRemoteDirectoryBrowseResult>
  onSubmit: (profile: WorkspaceRemoteProfile) => Promise<void> | void
}

type RemoteConnectDraft = {
  workspaceIdInput: string
  host: string
  user: string
  portInput: string
  remoteRoot: string
  agentPath: string
  identityFile: string
  lastBrowsePath: string
  activeStep: RemoteConnectStep
}

const REMOTE_CONNECT_DRAFT_STORAGE_KEY = 'sdd-workbench.remote-connect-draft.v1'

const EMPTY_REMOTE_CONNECT_DRAFT: RemoteConnectDraft = {
  workspaceIdInput: '',
  host: '',
  user: '',
  portInput: '',
  remoteRoot: '',
  agentPath: '',
  identityFile: '',
  lastBrowsePath: '',
  activeStep: 'profile',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toDraftStringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toRemoteConnectStep(value: unknown): RemoteConnectStep {
  return value === 'directory' ? 'directory' : 'profile'
}

function loadRemoteConnectDraft(): RemoteConnectDraft {
  try {
    const raw = window.localStorage.getItem(REMOTE_CONNECT_DRAFT_STORAGE_KEY)
    if (!raw) {
      return EMPTY_REMOTE_CONNECT_DRAFT
    }

    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return EMPTY_REMOTE_CONNECT_DRAFT
    }

    return {
      workspaceIdInput: toDraftStringField(parsed.workspaceIdInput),
      host: toDraftStringField(parsed.host),
      user: toDraftStringField(parsed.user),
      portInput: toDraftStringField(parsed.portInput),
      remoteRoot: toDraftStringField(parsed.remoteRoot),
      agentPath: toDraftStringField(parsed.agentPath),
      identityFile: toDraftStringField(parsed.identityFile),
      lastBrowsePath: toDraftStringField(parsed.lastBrowsePath),
      activeStep: toRemoteConnectStep(parsed.activeStep),
    }
  } catch {
    return EMPTY_REMOTE_CONNECT_DRAFT
  }
}

function saveRemoteConnectDraft(draft: RemoteConnectDraft): void {
  try {
    window.localStorage.setItem(
      REMOTE_CONNECT_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    )
  } catch {
    // Ignore localStorage persistence failures.
  }
}

function buildDefaultWorkspaceId(host: string, remoteRoot: string): string {
  const base = `${host}-${remoteRoot}`
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base.length > 0 ? base : `remote-${Date.now()}`
}

function parseOptionalPort(
  portInput: string,
): { ok: true; port: number | null } | { ok: false; error: string } {
  const normalizedPort = portInput.trim()
  if (!normalizedPort) {
    return {
      ok: true,
      port: null,
    }
  }

  const parsedPort = Number(normalizedPort)
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    return {
      ok: false,
      error: 'Port must be an integer between 1 and 65535.',
    }
  }

  return {
    ok: true,
    port: parsedPort,
  }
}

function getParentPath(currentPath: string): string {
  const normalized = currentPath.trim()
  if (!normalized || normalized === '/') {
    return '/'
  }

  const withoutTrailingSlash =
    normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
  const lastSlashIndex = withoutTrailingSlash.lastIndexOf('/')
  if (lastSlashIndex <= 0) {
    return '/'
  }

  return withoutTrailingSlash.slice(0, lastSlashIndex)
}

function getBrowseErrorMessage(result: WorkspaceRemoteDirectoryBrowseResult): string {
  const message = result.error?.trim()
  if (message) {
    if (result.errorCode) {
      return `${result.errorCode}: ${message}`
    }
    return message
  }

  if (result.errorCode) {
    return `Remote directory browse failed (${result.errorCode}).`
  }

  return 'Failed to browse remote directories.'
}

export function RemoteConnectModal({
  isOpen,
  isSubmitting,
  onClose,
  onBrowse,
  onSubmit,
}: RemoteConnectModalProps) {
  const [draft, setDraft] = useState<RemoteConnectDraft>(loadRemoteConnectDraft)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [browseCurrentPath, setBrowseCurrentPath] = useState(
    draft.lastBrowsePath,
  )
  const [browseEntries, setBrowseEntries] = useState<WorkspaceRemoteDirectoryEntry[]>(
    [],
  )
  const [browseTruncated, setBrowseTruncated] = useState(false)
  const [browseError, setBrowseError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setValidationError(null)
  }, [isOpen])

  useEffect(() => {
    saveRemoteConnectDraft(draft)
  }, [draft])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSubmitting || isBrowsing) {
        return
      }
      event.preventDefault()
      onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isBrowsing, isOpen, isSubmitting, onClose])

  if (!isOpen) {
    return null
  }

  const browseDisabled = isBrowsing || isSubmitting

  const updateDraft = (nextDraft: Partial<RemoteConnectDraft>) => {
    setDraft((previous) => ({
      ...previous,
      ...nextDraft,
    }))
  }

  const runBrowse = async (targetPath?: string) => {
    if (browseDisabled) {
      return
    }

    const normalizedHost = draft.host.trim()
    if (!normalizedHost) {
      setValidationError('Host is required.')
      return
    }

    const portResult = parseOptionalPort(draft.portInput)
    if (!portResult.ok) {
      setValidationError(portResult.error)
      return
    }

    setValidationError(null)
    setBrowseError(null)
    setIsBrowsing(true)

    try {
      const browseResult = await onBrowse({
        host: normalizedHost,
        ...(draft.user.trim() ? { user: draft.user.trim() } : {}),
        ...(portResult.port !== null ? { port: portResult.port } : {}),
        ...(draft.identityFile.trim() ? { identityFile: draft.identityFile.trim() } : {}),
        ...(targetPath?.trim() ? { targetPath: targetPath.trim() } : {}),
      })

      if (!browseResult.ok) {
        setBrowseError(getBrowseErrorMessage(browseResult))
        return
      }

      setBrowseCurrentPath(browseResult.currentPath)
      setBrowseEntries(browseResult.entries)
      setBrowseTruncated(browseResult.truncated)
      updateDraft({
        activeStep: 'directory',
        lastBrowsePath: browseResult.currentPath,
        remoteRoot: browseResult.currentPath,
      })
    } catch (error) {
      setBrowseError(
        error instanceof Error
          ? error.message
          : 'Failed to browse remote directories.',
      )
    } finally {
      setIsBrowsing(false)
    }
  }

  const handleBrowseParent = () => {
    const currentPath = browseCurrentPath || draft.lastBrowsePath || '/'
    void runBrowse(getParentPath(currentPath))
  }

  const handleSubmit = () => {
    if (isSubmitting) {
      return
    }

    const normalizedHost = draft.host.trim()
    const effectiveRemoteRoot =
      draft.remoteRoot.trim() || browseCurrentPath.trim() || draft.lastBrowsePath.trim()

    if (!normalizedHost || !effectiveRemoteRoot) {
      setValidationError('Host and remote root are required.')
      return
    }

    const portResult = parseOptionalPort(draft.portInput)
    if (!portResult.ok) {
      setValidationError(portResult.error)
      return
    }

    setValidationError(null)
    const effectiveWorkspaceId =
      draft.workspaceIdInput.trim() ||
      buildDefaultWorkspaceId(normalizedHost, effectiveRemoteRoot)

    updateDraft({
      remoteRoot: effectiveRemoteRoot,
      lastBrowsePath: effectiveRemoteRoot,
    })

    void onSubmit({
      workspaceId: effectiveWorkspaceId,
      host: normalizedHost,
      remoteRoot: effectiveRemoteRoot,
      ...(draft.user.trim() ? { user: draft.user.trim() } : {}),
      ...(portResult.port !== null ? { port: portResult.port } : {}),
      ...(draft.agentPath.trim() ? { agentPath: draft.agentPath.trim() } : {}),
      ...(draft.identityFile.trim() ? { identityFile: draft.identityFile.trim() } : {}),
    })
  }

  const hasBrowsePath = (browseCurrentPath || draft.lastBrowsePath).trim().length > 0
  const canEnterDirectoryStep = hasBrowsePath

  return (
    <div className="comment-modal-backdrop" role="presentation">
      <form
        aria-label="Connect Remote Workspace"
        className="comment-modal remote-connect-modal"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit()
        }}
        role="dialog"
      >
        <h2>Connect Remote Workspace</h2>
        <p className="comment-modal-meta">
          Step 1: verify SSH profile. Step 2: browse and choose remote root.
        </p>

        <div className="remote-connect-step-tabs" role="tablist">
          <button
            className={`remote-connect-step-tab${draft.activeStep === 'profile' ? ' is-active' : ''}`}
            data-testid="remote-connect-step-profile"
            onClick={() => {
              updateDraft({ activeStep: 'profile' })
            }}
            type="button"
          >
            1. Profile
          </button>
          <button
            className={`remote-connect-step-tab${draft.activeStep === 'directory' ? ' is-active' : ''}`}
            data-testid="remote-connect-step-directory"
            disabled={!canEnterDirectoryStep && draft.activeStep !== 'directory'}
            onClick={() => {
              if (!canEnterDirectoryStep && draft.activeStep !== 'directory') {
                return
              }
              updateDraft({ activeStep: 'directory' })
            }}
            type="button"
          >
            2. Directory
          </button>
        </div>

        <label className="comment-modal-label" htmlFor="remote-connect-host">
          Host
        </label>
        <input
          autoFocus
          className="remote-connect-input"
          data-testid="remote-connect-host-input"
          id="remote-connect-host"
          onChange={(event) => {
            updateDraft({
              host: event.target.value,
            })
          }}
          placeholder="example.com"
          type="text"
          value={draft.host}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-user">
          User (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-user-input"
          id="remote-connect-user"
          onChange={(event) => {
            updateDraft({
              user: event.target.value,
            })
          }}
          placeholder="ubuntu"
          type="text"
          value={draft.user}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-port">
          Port (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-port-input"
          id="remote-connect-port"
          onChange={(event) => {
            updateDraft({
              portInput: event.target.value,
            })
          }}
          placeholder="22"
          type="number"
          value={draft.portInput}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-root">
          Remote Root
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-root-input"
          id="remote-connect-root"
          onChange={(event) => {
            updateDraft({
              remoteRoot: event.target.value,
            })
          }}
          placeholder="/home/user/project"
          type="text"
          value={draft.remoteRoot}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-workspace-id">
          Workspace ID (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-workspace-id-input"
          id="remote-connect-workspace-id"
          onChange={(event) => {
            updateDraft({
              workspaceIdInput: event.target.value,
            })
          }}
          placeholder="generated if empty"
          type="text"
          value={draft.workspaceIdInput}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-agent-path">
          Agent Path (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-agent-path-input"
          id="remote-connect-agent-path"
          onChange={(event) => {
            updateDraft({
              agentPath: event.target.value,
            })
          }}
          placeholder="~/.sdd-workbench/bin/sdd-remote-agent"
          type="text"
          value={draft.agentPath}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-identity-file">
          Identity File (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-identity-file-input"
          id="remote-connect-identity-file"
          onChange={(event) => {
            updateDraft({
              identityFile: event.target.value,
            })
          }}
          placeholder="~/.ssh/id_ed25519"
          type="text"
          value={draft.identityFile}
        />

        <div className="remote-connect-browse-actions">
          <button
            data-testid="remote-connect-browse-button"
            disabled={browseDisabled}
            onClick={() => {
              const browseTarget =
                draft.remoteRoot.trim() || draft.lastBrowsePath.trim() || undefined
              void runBrowse(browseTarget)
            }}
            type="button"
          >
            {isBrowsing ? 'Browsing...' : 'Browse Directories'}
          </button>
        </div>

        {draft.activeStep === 'directory' && (
          <section className="remote-connect-browser" data-testid="remote-connect-browser">
            <div className="remote-connect-browser-toolbar">
              <button
                data-testid="remote-connect-browse-up"
                disabled={browseDisabled}
                onClick={handleBrowseParent}
                type="button"
              >
                Up
              </button>
              <button
                data-testid="remote-connect-browse-refresh"
                disabled={browseDisabled}
                onClick={() => {
                  const currentPath =
                    browseCurrentPath || draft.lastBrowsePath || draft.remoteRoot || '/'
                  void runBrowse(currentPath)
                }}
                type="button"
              >
                Refresh
              </button>
            </div>
            <p
              className="comment-modal-meta"
              data-testid="remote-connect-current-path"
            >
              {browseCurrentPath || draft.lastBrowsePath || '(not loaded)'}
            </p>
            {browseTruncated && (
              <p
                className="comment-modal-warning"
                data-testid="remote-connect-truncated-warning"
              >
                Directory list was truncated. Navigate deeper to narrow results.
              </p>
            )}
            <div className="remote-connect-browser-list">
              {browseEntries.length === 0 ? (
                <p className="comment-modal-meta">No subdirectories found.</p>
              ) : (
                browseEntries.map((entry) => (
                  <button
                    className="remote-connect-browser-entry"
                    data-testid={`remote-connect-entry-${entry.name}`}
                    key={entry.path}
                    onClick={() => {
                      void runBrowse(entry.path)
                    }}
                    type="button"
                  >
                    <span className="remote-connect-browser-entry-name">{entry.name}</span>
                    <span className="remote-connect-browser-entry-kind">
                      {entry.kind === 'symlink' ? 'SYMLINK' : 'DIR'}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="remote-connect-browser-actions">
              <button
                data-testid="remote-connect-use-current-path"
                disabled={!browseCurrentPath}
                onClick={() => {
                  if (!browseCurrentPath) {
                    return
                  }
                  updateDraft({
                    remoteRoot: browseCurrentPath,
                    lastBrowsePath: browseCurrentPath,
                  })
                }}
                type="button"
              >
                Use Current Directory
              </button>
            </div>
          </section>
        )}

        {browseError && (
          <p className="comment-modal-warning" data-testid="remote-connect-browse-error">
            {browseError}
          </p>
        )}
        {validationError && <p className="comment-modal-warning">{validationError}</p>}

        <div className="comment-modal-actions">
          <button disabled={isSubmitting || isBrowsing} onClick={onClose} type="button">
            Cancel
          </button>
          <button disabled={isSubmitting || isBrowsing} type="submit">
            {isSubmitting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </form>
    </div>
  )
}
