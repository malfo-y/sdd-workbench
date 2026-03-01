import { useEffect, useState } from 'react'
import type { WorkspaceRemoteProfile } from './workspace-model'

type RemoteConnectModalProps = {
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toDraftStringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
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

export function RemoteConnectModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: RemoteConnectModalProps) {
  const [draft, setDraft] = useState<RemoteConnectDraft>(loadRemoteConnectDraft)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setValidationError(null)
  }, [isOpen])

  useEffect(() => {
    saveRemoteConnectDraft(draft)
  }, [draft])

  if (!isOpen) {
    return null
  }

  return (
    <div className="comment-modal-backdrop" role="presentation">
      <form
        aria-label="Connect Remote Workspace"
        className="comment-modal remote-connect-modal"
        onSubmit={(event) => {
          event.preventDefault()
          if (isSubmitting) {
            return
          }

          const normalizedHost = draft.host.trim()
          const normalizedRemoteRoot = draft.remoteRoot.trim()
          if (!normalizedHost || !normalizedRemoteRoot) {
            setValidationError('Host and remote root are required.')
            return
          }

          const normalizedPort = draft.portInput.trim()
          const parsedPort = normalizedPort.length > 0 ? Number(normalizedPort) : null
          if (
            parsedPort !== null &&
            (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535)
          ) {
            setValidationError('Port must be an integer between 1 and 65535.')
            return
          }

          setValidationError(null)
          const effectiveWorkspaceId =
            draft.workspaceIdInput.trim() ||
            buildDefaultWorkspaceId(normalizedHost, normalizedRemoteRoot)
          void onSubmit({
            workspaceId: effectiveWorkspaceId,
            host: normalizedHost,
            remoteRoot: normalizedRemoteRoot,
            ...(draft.user.trim() ? { user: draft.user.trim() } : {}),
            ...(parsedPort !== null ? { port: parsedPort } : {}),
            ...(draft.agentPath.trim() ? { agentPath: draft.agentPath.trim() } : {}),
            ...(draft.identityFile.trim() ? { identityFile: draft.identityFile.trim() } : {}),
          })
        }}
        role="dialog"
      >
        <h2>Connect Remote Workspace</h2>
        <p className="comment-modal-meta">
          MVP connection profile. Secrets are not stored, but SSH key path may be saved for reconnect.
        </p>
        <label className="comment-modal-label" htmlFor="remote-connect-host">
          Host
        </label>
        <input
          autoFocus
          className="remote-connect-input"
          data-testid="remote-connect-host-input"
          id="remote-connect-host"
          onChange={(event) => {
            setDraft((previous) => ({
              ...previous,
              host: event.target.value,
            }))
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
            setDraft((previous) => ({
              ...previous,
              user: event.target.value,
            }))
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
            setDraft((previous) => ({
              ...previous,
              portInput: event.target.value,
            }))
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
            setDraft((previous) => ({
              ...previous,
              remoteRoot: event.target.value,
            }))
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
            setDraft((previous) => ({
              ...previous,
              workspaceIdInput: event.target.value,
            }))
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
            setDraft((previous) => ({
              ...previous,
              agentPath: event.target.value,
            }))
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
            setDraft((previous) => ({
              ...previous,
              identityFile: event.target.value,
            }))
          }}
          placeholder="~/.ssh/id_ed25519"
          type="text"
          value={draft.identityFile}
        />
        {validationError && <p className="comment-modal-warning">{validationError}</p>}
        <div className="comment-modal-actions">
          <button disabled={isSubmitting} onClick={onClose} type="button">
            Cancel
          </button>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </form>
    </div>
  )
}
