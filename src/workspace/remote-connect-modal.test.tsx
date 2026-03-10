import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteConnectModal } from './remote-connect-modal'

function createTestStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key) ?? null : null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, String(value))
    },
  }
}

describe('workspace/remote-connect-modal', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createTestStorage(),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('restores the latest draft when remounted', () => {
    const onClose = vi.fn()
    const onSubmit = vi.fn()
    const onBrowse = vi.fn().mockResolvedValue({
      ok: true,
      currentPath: '/data',
      entries: [],
      truncated: false,
    })

    const firstRender = render(
      <RemoteConnectModal
        isOpen
        isSubmitting={false}
        onBrowse={onBrowse}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'instance-private.cloud.kakaobrain.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-user-input'), {
      target: { value: 'bc-user' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-port-input'), {
      target: { value: '20590' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/data' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-agent-path-input'), {
      target: { value: '~/.sdd-workbench/bin/sdd-remote-agent' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-identity-file-input'), {
      target: { value: '~/.ssh/id_rsa' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-ssh-alias-input'), {
      target: { value: 'kakao-devbox' },
    })

    firstRender.unmount()

    render(
      <RemoteConnectModal
        isOpen
        isSubmitting={false}
        onBrowse={onBrowse}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('remote-connect-host-input')).toHaveValue(
      'instance-private.cloud.kakaobrain.com',
    )
    expect(screen.getByTestId('remote-connect-user-input')).toHaveValue(
      'bc-user',
    )
    expect(screen.getByTestId('remote-connect-port-input')).toHaveValue(20590)
    expect(screen.getByTestId('remote-connect-root-input')).toHaveValue('/data')
    expect(screen.getByTestId('remote-connect-agent-path-input')).toHaveValue(
      '~/.sdd-workbench/bin/sdd-remote-agent',
    )
    expect(screen.getByTestId('remote-connect-identity-file-input')).toHaveValue(
      '~/.ssh/id_rsa',
    )
    expect(screen.getByTestId('remote-connect-ssh-alias-input')).toHaveValue(
      'kakao-devbox',
    )
  })

  it('ignores malformed draft payload in localStorage', () => {
    window.localStorage.setItem(
      'sdd-workbench.remote-connect-draft.v1',
      '{malformed-json',
    )

    render(
      <RemoteConnectModal
        isOpen
        isSubmitting={false}
        onBrowse={() =>
          Promise.resolve({
            ok: true,
            currentPath: '/tmp',
            entries: [],
            truncated: false,
          })
        }
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    )

    expect(screen.getByTestId('remote-connect-host-input')).toHaveValue('')
    expect(screen.getByTestId('remote-connect-root-input')).toHaveValue('')
  })

  it('keeps browse errors visible and clears them after successful browse', async () => {
    const onBrowse = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        currentPath: '',
        entries: [],
        truncated: false,
        errorCode: 'AUTH_FAILED',
        error: 'Permission denied',
      })
      .mockResolvedValueOnce({
        ok: true,
        currentPath: '/data',
        entries: [],
        truncated: false,
      })

    render(
      <RemoteConnectModal
        isOpen
        isSubmitting={false}
        onBrowse={onBrowse}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    )

    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'example.com' },
    })
    fireEvent.click(screen.getByTestId('remote-connect-browse-button'))

    expect(await screen.findByTestId('remote-connect-browse-error')).toHaveTextContent(
      'AUTH_FAILED',
    )

    fireEvent.click(screen.getByTestId('remote-connect-browse-button'))

    expect(
      await screen.findByTestId('remote-connect-current-path'),
    ).toHaveTextContent('/data')
    expect(screen.queryByTestId('remote-connect-browse-error')).not.toBeInTheDocument()
  })

  it('closes on Escape when idle', () => {
    const onClose = vi.fn()

    render(
      <RemoteConnectModal
        isOpen
        isSubmitting={false}
        onBrowse={() =>
          Promise.resolve({
            ok: true,
            currentPath: '/tmp',
            entries: [],
            truncated: false,
          })
        }
        onClose={onClose}
        onSubmit={() => undefined}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape while submitting', () => {
    const onClose = vi.fn()

    render(
      <RemoteConnectModal
        isOpen
        isSubmitting
        onBrowse={() =>
          Promise.resolve({
            ok: true,
            currentPath: '/tmp',
            entries: [],
            truncated: false,
          })
        }
        onClose={onClose}
        onSubmit={() => undefined}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('includes sshAlias in the submitted remote profile when provided', () => {
    const onSubmit = vi.fn()

    render(
      <RemoteConnectModal
        isOpen
        isSubmitting={false}
        onBrowse={() =>
          Promise.resolve({
            ok: true,
            currentPath: '/tmp',
            entries: [],
            truncated: false,
          })
        }
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/project-a' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-ssh-alias-input'), {
      target: { value: 'devbox-a' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'example.com',
        remoteRoot: '/srv/project-a',
        sshAlias: 'devbox-a',
      }),
    )
  })

  it('shows VSCode SSH guidance for alias override and identity file behavior', () => {
    render(
      <RemoteConnectModal
        isOpen
        isSubmitting={false}
        onBrowse={() =>
          Promise.resolve({
            ok: true,
            currentPath: '/tmp',
            entries: [],
            truncated: false,
          })
        }
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    )

    expect(
      screen.getByText(
        /VSCode Remote-SSH opens a separate SSH session and reads your local SSH config/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Must match a local `~\/\.ssh\/config` `Host` entry/i),
    ).toBeInTheDocument()
    expect(screen.getByTestId('remote-connect-ssh-alias-input')).toHaveAttribute(
      'placeholder',
      'Required for VSCode: ~/.ssh/config Host entry',
    )
  })

  it('requires sshAlias when VSCode SSH config sync is enabled', async () => {
    const onSubmit = vi.fn()
    const onSyncVsCodeSshConfig = vi.fn()

    render(
      <RemoteConnectModal
        isOpen
        isSubmitting={false}
        onBrowse={() =>
          Promise.resolve({
            ok: true,
            currentPath: '/tmp',
            entries: [],
            truncated: false,
          })
        }
        onClose={() => undefined}
        onSubmit={onSubmit}
        onSyncVsCodeSshConfig={onSyncVsCodeSshConfig}
      />,
    )

    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/project-a' },
    })
    fireEvent.click(screen.getByTestId('remote-connect-sync-vscode-ssh-checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    expect(await screen.findByText(/SSH Host Alias for VSCode is required/i)).toBeVisible()
    expect(onSyncVsCodeSshConfig).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('syncs VSCode SSH config before submitting when enabled', async () => {
    const onSubmit = vi.fn()
    const onSyncVsCodeSshConfig = vi.fn().mockResolvedValue({
      ok: true,
      configPath: '/Users/tester/.ssh/config',
      managedConfigPath: '/Users/tester/.ssh/sdd-workbench.config',
      includeInserted: true,
      entryUpdated: true,
    })

    render(
      <RemoteConnectModal
        isOpen
        isSubmitting={false}
        onBrowse={() =>
          Promise.resolve({
            ok: true,
            currentPath: '/tmp',
            entries: [],
            truncated: false,
          })
        }
        onClose={() => undefined}
        onSubmit={onSubmit}
        onSyncVsCodeSshConfig={onSyncVsCodeSshConfig}
      />,
    )

    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-user-input'), {
      target: { value: 'bc-user' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-port-input'), {
      target: { value: '2222' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/project-a' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-identity-file-input'), {
      target: { value: '~/.ssh/id_rsa' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-ssh-alias-input'), {
      target: { value: 'summer-test' },
    })
    fireEvent.click(screen.getByTestId('remote-connect-sync-vscode-ssh-checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    expect(await screen.findByTestId('remote-connect-sync-vscode-ssh-checkbox')).toBeChecked()
    expect(onSyncVsCodeSshConfig).toHaveBeenCalledWith({
      sshAlias: 'summer-test',
      host: 'example.com',
      user: 'bc-user',
      port: 2222,
      identityFile: '~/.ssh/id_rsa',
    })
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'example.com',
        user: 'bc-user',
        port: 2222,
        remoteRoot: '/srv/project-a',
        sshAlias: 'summer-test',
        identityFile: '~/.ssh/id_rsa',
      }),
    )
  })
})
