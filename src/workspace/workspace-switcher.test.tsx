import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceSwitcher } from './workspace-switcher'

const workspaceA = {
  id: '/workspace-a',
  rootPath: '/workspace-a',
}
const workspaceB = {
  id: '/workspace-b',
  rootPath: '/workspace-b',
}

describe('WorkspaceSwitcher', () => {
  afterEach(() => {
    cleanup()
  })

  it('prevents duplicate close requests while an async close is pending', async () => {
    let resolveClose!: () => void
    const closePromise = new Promise<void>((resolve) => {
      resolveClose = resolve
    })
    const onCloseWorkspace = vi.fn(() => closePromise)

    render(
      <WorkspaceSwitcher
        activeWorkspaceId={workspaceA.id}
        onCloseWorkspace={onCloseWorkspace}
        onSelectWorkspace={() => undefined}
        workspaces={[workspaceA, workspaceB]}
      />,
    )

    fireEvent.click(screen.getByTestId('workspace-switcher-button'))
    const closeButton = screen.getByRole('button', {
      name: 'Close workspace /workspace-a',
    })

    fireEvent.click(closeButton)
    fireEvent.click(closeButton)

    expect(onCloseWorkspace).toHaveBeenCalledTimes(1)
    expect(closeButton).toBeDisabled()

    await act(async () => {
      resolveClose()
      await closePromise
    })

    expect(closeButton).toBeEnabled()
  })

  it('resets the open state after the last workspace is removed', () => {
    const onCloseWorkspace = vi.fn()
    const { rerender } = render(
      <WorkspaceSwitcher
        activeWorkspaceId={workspaceA.id}
        onCloseWorkspace={onCloseWorkspace}
        onSelectWorkspace={() => undefined}
        workspaces={[workspaceA]}
      />,
    )

    fireEvent.click(screen.getByTestId('workspace-switcher-button'))
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close workspace /workspace-a',
      }),
    )
    expect(onCloseWorkspace).toHaveBeenCalledWith(workspaceA.id)

    rerender(
      <WorkspaceSwitcher
        activeWorkspaceId={null}
        onCloseWorkspace={onCloseWorkspace}
        onSelectWorkspace={() => undefined}
        workspaces={[]}
      />,
    )
    rerender(
      <WorkspaceSwitcher
        activeWorkspaceId={workspaceB.id}
        onCloseWorkspace={onCloseWorkspace}
        onSelectWorkspace={() => undefined}
        workspaces={[workspaceB]}
      />,
    )

    expect(screen.getByTestId('workspace-switcher-button')).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(
      screen.queryByRole('menu', { name: 'Open workspaces' }),
    ).not.toBeInTheDocument()
  })
})
