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
})
