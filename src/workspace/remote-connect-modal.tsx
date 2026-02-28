import { useEffect, useState } from 'react'
import type { WorkspaceRemoteProfile } from './workspace-model'

type RemoteConnectModalProps = {
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (profile: WorkspaceRemoteProfile) => Promise<void> | void
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
  const [workspaceIdInput, setWorkspaceIdInput] = useState('')
  const [host, setHost] = useState('')
  const [user, setUser] = useState('')
  const [portInput, setPortInput] = useState('')
  const [remoteRoot, setRemoteRoot] = useState('')
  const [agentPath, setAgentPath] = useState('')
  const [identityFile, setIdentityFile] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setWorkspaceIdInput('')
    setHost('')
    setUser('')
    setPortInput('')
    setRemoteRoot('')
    setAgentPath('')
    setIdentityFile('')
    setValidationError(null)
  }, [isOpen])

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

          const normalizedHost = host.trim()
          const normalizedRemoteRoot = remoteRoot.trim()
          if (!normalizedHost || !normalizedRemoteRoot) {
            setValidationError('Host and remote root are required.')
            return
          }

          const normalizedPort = portInput.trim()
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
            workspaceIdInput.trim() ||
            buildDefaultWorkspaceId(normalizedHost, normalizedRemoteRoot)
          void onSubmit({
            workspaceId: effectiveWorkspaceId,
            host: normalizedHost,
            remoteRoot: normalizedRemoteRoot,
            ...(user.trim() ? { user: user.trim() } : {}),
            ...(parsedPort !== null ? { port: parsedPort } : {}),
            ...(agentPath.trim() ? { agentPath: agentPath.trim() } : {}),
            ...(identityFile.trim() ? { identityFile: identityFile.trim() } : {}),
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
            setHost(event.target.value)
          }}
          placeholder="example.com"
          type="text"
          value={host}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-user">
          User (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-user-input"
          id="remote-connect-user"
          onChange={(event) => {
            setUser(event.target.value)
          }}
          placeholder="ubuntu"
          type="text"
          value={user}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-port">
          Port (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-port-input"
          id="remote-connect-port"
          onChange={(event) => {
            setPortInput(event.target.value)
          }}
          placeholder="22"
          type="number"
          value={portInput}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-root">
          Remote Root
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-root-input"
          id="remote-connect-root"
          onChange={(event) => {
            setRemoteRoot(event.target.value)
          }}
          placeholder="/home/user/project"
          type="text"
          value={remoteRoot}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-workspace-id">
          Workspace ID (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-workspace-id-input"
          id="remote-connect-workspace-id"
          onChange={(event) => {
            setWorkspaceIdInput(event.target.value)
          }}
          placeholder="generated if empty"
          type="text"
          value={workspaceIdInput}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-agent-path">
          Agent Path (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-agent-path-input"
          id="remote-connect-agent-path"
          onChange={(event) => {
            setAgentPath(event.target.value)
          }}
          placeholder="~/.sdd-workbench/remote-agent.sh"
          type="text"
          value={agentPath}
        />
        <label className="comment-modal-label" htmlFor="remote-connect-identity-file">
          Identity File (optional)
        </label>
        <input
          className="remote-connect-input"
          data-testid="remote-connect-identity-file-input"
          id="remote-connect-identity-file"
          onChange={(event) => {
            setIdentityFile(event.target.value)
          }}
          placeholder="~/.ssh/id_ed25519"
          type="text"
          value={identityFile}
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
