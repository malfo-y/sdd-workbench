import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import App from './App'
import { WorkspaceProvider } from './workspace/workspace-context'

describe('F01/F02/F03/F04 workspace flow', () => {
  const openDialogMock = vi.fn<() => Promise<WorkspaceOpenDialogResult>>()
  const indexWorkspaceMock =
    vi.fn<(rootPath: string) => Promise<WorkspaceIndexResult>>()
  const readFileMock =
    vi.fn<
      (rootPath: string, relativePath: string) => Promise<WorkspaceReadFileResult>
    >()
  const watchStartMock =
    vi.fn<
      (
        workspaceId: string,
        rootPath: string,
      ) => Promise<WorkspaceWatchControlResult>
    >()
  const watchStopMock =
    vi.fn<(workspaceId: string) => Promise<WorkspaceWatchControlResult>>()
  const watchListeners = new Set<(event: WorkspaceWatchEvent) => void>()
  const onWatchEventMock =
    vi.fn<(listener: (event: WorkspaceWatchEvent) => void) => () => void>()
  const historyNavigateListeners = new Set<
    (event: WorkspaceHistoryNavigationEvent) => void
  >()
  const onHistoryNavigateMock =
    vi.fn<
      (
        listener: (event: WorkspaceHistoryNavigationEvent) => void,
      ) => () => void
    >()

  beforeEach(() => {
    openDialogMock.mockReset()
    indexWorkspaceMock.mockReset()
    readFileMock.mockReset()
    watchStartMock.mockReset()
    watchStopMock.mockReset()
    onWatchEventMock.mockReset()
    onHistoryNavigateMock.mockReset()
    watchListeners.clear()
    historyNavigateListeners.clear()
    watchStartMock.mockResolvedValue({ ok: true })
    watchStopMock.mockResolvedValue({ ok: true })
    onWatchEventMock.mockImplementation((listener) => {
      watchListeners.add(listener)
      return () => {
        watchListeners.delete(listener)
      }
    })
    onHistoryNavigateMock.mockImplementation((listener) => {
      historyNavigateListeners.add(listener)
      return () => {
        historyNavigateListeners.delete(listener)
      }
    })
    window.workspace = {
      openDialog: openDialogMock,
      index: indexWorkspaceMock,
      readFile: readFileMock,
      watchStart: watchStartMock,
      watchStop: watchStopMock,
      onWatchEvent: onWatchEventMock,
      onHistoryNavigate: onHistoryNavigateMock,
    }
  })

  const emitWatchEvent = (event: WorkspaceWatchEvent) => {
    for (const listener of watchListeners) {
      listener(event)
    }
  }

  const emitHistoryNavigateEvent = (event: WorkspaceHistoryNavigationEvent) => {
    for (const listener of historyNavigateListeners) {
      listener(event)
    }
  }

  afterEach(() => {
    cleanup()
  })

  it('updates workspace path and keeps previous path when selection is canceled', async () => {
    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: '/Users/tester/projects/sdd-workbench',
      })
      .mockResolvedValueOnce({
        canceled: true,
        selectedPath: null,
      })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    expect(screen.getByTestId('workspace-path')).toHaveTextContent(
      'No workspace selected',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveTextContent(
        '~/projects/sdd-workbench',
      )
    })
    expect(screen.getByTestId('workspace-path')).toHaveAttribute(
      'title',
      '/Users/tester/projects/sdd-workbench',
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(indexWorkspaceMock).toHaveBeenCalledWith(
      '/Users/tester/projects/sdd-workbench',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('canceled')
    })

    expect(screen.getByTestId('workspace-path')).toHaveTextContent(
      '~/projects/sdd-workbench',
    )
    expect(indexWorkspaceMock).toHaveBeenCalledTimes(1)
  })

  it('shows error banner when open dialog returns error', async () => {
    openDialogMock.mockResolvedValueOnce({
      canceled: true,
      selectedPath: null,
      error: 'permission denied',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('permission denied')
    })

    expect(screen.getByTestId('workspace-path')).toHaveTextContent(
      'No workspace selected',
    )
    expect(indexWorkspaceMock).not.toHaveBeenCalled()
  })

  it('renders indexed file tree and updates active file when clicked', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'api.ts',
            relativePath: 'src/api.ts',
            kind: 'file',
          },
          {
            name: 'auth.ts',
            relativePath: 'src/auth.ts',
            kind: 'file',
          },
        ],
      },
      {
        name: 'README.md',
        relativePath: 'README.md',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: 'export const auth = true',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'auth.ts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'README.md' })).not.toBeInTheDocument()

    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
      'No active file',
    )

    fireEvent.click(screen.getByRole('button', { name: 'src' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'auth.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'auth.ts' }))

    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/auth.ts')
    expect(screen.getByTestId('code-viewer-active-file')).toHaveAttribute(
      'title',
      'src/auth.ts',
    )

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    expect(readFileMock).toHaveBeenCalledWith(
      '/Users/tester/projects/sdd-workbench',
      'src/auth.ts',
    )
  })

  it('shows a cap message when indexed nodes exceed initial render limit', async () => {
    const hugeTree: WorkspaceFileNode[] = Array.from({ length: 520 }, (_, index) => ({
      name: `dir-${index}`,
      relativePath: `dir-${index}`,
      kind: 'directory',
      children: [],
    }))

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: hugeTree,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByTestId('file-tree-cap-message')).toHaveTextContent(
        'Showing first 500 nodes.',
      )
    })
  })

  it('renders file content and tracks selected line range', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'README.md',
        relativePath: 'README.md',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'alpha\nbeta\ngamma',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('code-line-2'))
    fireEvent.click(screen.getByTestId('code-line-3'), { shiftKey: true })

    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L2-L3',
    )
  })

  it('supports multi-workspace switch, duplicate focus, close, and selection reset', async () => {
    const projectARoot = '/Users/tester/project-a'
    const projectBRoot = '/Users/tester/project-b'
    const projectATree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'app.ts',
            relativePath: 'src/app.ts',
            kind: 'file',
          },
        ],
      },
    ]
    const projectBTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'note.md',
            relativePath: 'docs/note.md',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: projectATree,
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: projectBTree,
        }
      }

      return {
        ok: false,
        fileTree: [],
        error: 'unknown workspace',
      }
    })

    readFileMock.mockImplementation(async (rootPath, relativePath) => {
      if (rootPath === projectARoot && relativePath === 'src/app.ts') {
        return {
          ok: true,
          content: 'export const name = "project-a"\nconsole.log(name)',
        }
      }

      if (rootPath === projectBRoot && relativePath === 'docs/note.md') {
        return {
          ok: true,
          content: '# project-b',
        }
      }

      return {
        ok: false,
        content: null,
        error: 'missing file',
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'app.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'app.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('code-line-2'))
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L2-L2',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'note.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'note.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement
    expect(workspaceSelect.options).toHaveLength(2)

    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    expect(screen.getByRole('button', { name: 'app.ts' })).toBeInTheDocument()
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: none',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    expect(indexWorkspaceMock).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Close Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })

    expect(
      (screen.getByTestId('workspace-switcher-select') as HTMLSelectElement)
        .options,
    ).toHaveLength(1)
  })

  it('navigates file history with Back/Forward and truncates forward after branching', async () => {
    const workspaceRoot = '/Users/tester/history-single'
    const indexedTree: WorkspaceFileNode[] = [
      { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
      { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
      { name: 'c.ts', relativePath: 'c.ts', kind: 'file' },
      { name: 'd.ts', relativePath: 'd.ts', kind: 'file' },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    const backButton = screen.getByRole('button', { name: 'Back' })
    const forwardButton = screen.getByRole('button', { name: 'Forward' })
    expect(backButton).toBeDisabled()
    expect(forwardButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
        'content:a.ts',
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    expect(backButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
        'content:b.ts',
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'c.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
        'content:c.ts',
      )
    })

    expect(backButton).toBeEnabled()
    expect(forwardButton).toBeDisabled()

    fireEvent.click(backButton)
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
    expect(forwardButton).toBeEnabled()

    fireEvent.click(forwardButton)
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('c.ts')
    })

    fireEvent.click(backButton)
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    fireEvent.click(screen.getByRole('button', { name: 'd.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('d.ts')
    })

    expect(forwardButton).toBeDisabled()
  })

  it('keeps file history independent per workspace for Back/Forward navigation', async () => {
    const projectARoot = '/Users/tester/history-a'
    const projectBRoot = '/Users/tester/history-b'

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [
            { name: 'a1.ts', relativePath: 'a1.ts', kind: 'file' },
            { name: 'a2.ts', relativePath: 'a2.ts', kind: 'file' },
          ],
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [
            { name: 'b1.ts', relativePath: 'b1.ts', kind: 'file' },
            { name: 'b2.ts', relativePath: 'b2.ts', kind: 'file' },
          ],
        }
      }

      return {
        ok: false,
        fileTree: [],
      }
    })

    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a1.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'a1.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
        'content:a1.ts',
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'a2.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
        'content:a2.ts',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'b1.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
        'content:b1.ts',
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'b2.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
        'content:b2.ts',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b1.ts')
    })

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement
    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a2.ts')

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a1.ts')
    })
  })

  it('navigates history via mouse back/forward special buttons', async () => {
    const workspaceRoot = '/Users/tester/history-mouse-buttons'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
        { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    fireEvent.mouseUp(window, { button: 3 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })

    fireEvent.mouseUp(window, { button: 4 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
  })

  it('navigates history via horizontal wheel fallback', async () => {
    const workspaceRoot = '/Users/tester/history-wheel-fallback'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
        { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    fireEvent.wheel(window, { deltaX: -140, deltaY: 0 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })

    fireEvent.wheel(window, { deltaX: 140, deltaY: 0 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
  })

  it('navigates history via ipc history commands from app-command/swipe bridge', async () => {
    const workspaceRoot = '/Users/tester/history-ipc-bridge'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
        { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    emitHistoryNavigateEvent({
      direction: 'back',
      source: 'swipe',
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })

    emitHistoryNavigateEvent({
      direction: 'forward',
      source: 'app-command',
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
  })

  it('applies watcher changed indicators per workspace', async () => {
    const projectARoot = '/Users/tester/watch-a'
    const projectBRoot = '/Users/tester/watch-b'

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'a.ts',
              relativePath: 'a.ts',
              kind: 'file',
            },
          ],
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'b.ts',
              relativePath: 'b.ts',
              kind: 'file',
            },
          ],
        }
      }

      return {
        ok: false,
        fileTree: [],
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'b.ts' })).toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: projectARoot,
      changedRelativePaths: ['a.ts'],
    })

    expect(
      screen.queryByTestId('tree-changed-indicator-a.ts'),
    ).not.toBeInTheDocument()

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement
    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })
    expect(screen.getByTestId('tree-changed-indicator-a.ts')).toBeInTheDocument()
    expect(
      screen.queryByTestId('tree-changed-indicator-b.ts'),
    ).not.toBeInTheDocument()
  })

  it('keeps changed indicator while opened and clears it after leaving file', async () => {
    const workspaceRoot = '/Users/tester/watch-clear-on-open'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'a.ts',
          relativePath: 'a.ts',
          kind: 'file',
        },
        {
          name: 'b.ts',
          relativePath: 'b.ts',
          kind: 'file',
        },
      ],
    })
    readFileMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'const a = 1',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'const b = 2',
      })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['a.ts'],
    })

    await waitFor(() => {
      expect(screen.getByTestId('tree-changed-indicator-a.ts')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent('const a = 1')
    })
    expect(screen.getByTestId('tree-changed-indicator-a.ts')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent('const b = 2')
    })
    expect(screen.queryByTestId('tree-changed-indicator-a.ts')).not.toBeInTheDocument()
  })

  it('auto-refreshes opened file content on watcher event and keeps marker until leaving', async () => {
    const workspaceRoot = '/Users/tester/watch-auto-refresh'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'a.ts',
          relativePath: 'a.ts',
          kind: 'file',
        },
      ],
    })
    readFileMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'const value = 1',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'const value = 2',
      })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
        'const value = 1',
      )
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['a.ts'],
    })

    await waitFor(() => {
      expect(readFileMock).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
        'const value = 2',
      )
    })
    expect(screen.getByTestId('tree-changed-indicator-a.ts')).toBeInTheDocument()
  })

  it('stops watcher when active workspace is closed', async () => {
    const workspaceRoot = '/Users/tester/watch-close'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(watchStartMock).toHaveBeenCalledWith(workspaceRoot, workspaceRoot)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Close Workspace' }))

    await waitFor(() => {
      expect(watchStopMock).toHaveBeenCalledWith(workspaceRoot)
    })
  })

  it('shows read error message when workspace.readFile returns failure', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'denied.ts',
        relativePath: 'denied.ts',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: false,
      content: null,
      error: 'permission denied',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'denied.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'denied.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-error')).toHaveTextContent(
        'Failed to read file: permission denied',
      )
    })
  })

  it('shows preview unavailable state for files larger than 2MB', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'large.txt',
        relativePath: 'large.txt',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: null,
      previewUnavailableReason: 'file_too_large',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'large.txt' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'large.txt' }))

    await waitFor(() => {
      expect(
        screen.getByTestId('code-viewer-preview-unavailable'),
      ).toHaveTextContent('Preview unavailable: file exceeds 2MB limit.')
    })
  })

  it('applies python syntax highlighting for .py files in integrated flow', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'tool.py',
        relativePath: 'tool.py',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'def run():\n    return 1',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'tool.py' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'tool.py' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toHaveAttribute(
        'data-highlight-language',
        'python',
      )
    })
    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: python',
    )
  })

  it('does not render removed toolbar copy buttons and copies both from code-viewer context menu', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'auth.ts',
            relativePath: 'src/auth.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'alpha\nbeta\ngamma',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    expect(
      screen.queryByRole('button', { name: 'Copy Active File Path' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copy Selected Lines' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'auth.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'auth.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('code-line-2'))
    fireEvent.click(screen.getByTestId('code-line-3'), { shiftKey: true })

    fireEvent.contextMenu(screen.getByTestId('code-line-3'), {
      clientX: 120,
      clientY: 160,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Both' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        'src/auth.ts:L2-L3\nbeta\ngamma',
      )
    })
  })

  it('shows banner when code-viewer Copy Both fails', async () => {
    const clipboardWriteText = vi
      .fn()
      .mockRejectedValue(new Error('permission denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'single.ts',
        relativePath: 'single.ts',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'const value = 1',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'single.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'single.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    fireEvent.contextMenu(screen.getByTestId('code-line-1'), {
      clientX: 80,
      clientY: 110,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Both' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to copy selected lines.',
      )
    })
  })

  it('copies relative path based on active workspace after switching', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const projectARoot = '/Users/tester/project-a'
    const projectBRoot = '/Users/tester/project-b'

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'src',
              relativePath: 'src',
              kind: 'directory',
              children: [
                {
                  name: 'a.ts',
                  relativePath: 'src/a.ts',
                  kind: 'file',
                },
              ],
            },
          ],
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'src',
              relativePath: 'src',
              kind: 'directory',
              children: [
                {
                  name: 'b.ts',
                  relativePath: 'src/b.ts',
                  kind: 'file',
                },
              ],
            },
          ],
        }
      }

      return {
        ok: false,
        fileTree: [],
      }
    })

    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'src/a.ts') {
        return {
          ok: true,
          content: 'const a = 1',
        }
      }

      if (relativePath === 'src/b.ts') {
        return {
          ok: true,
          content: 'const b = 2',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/a.ts')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'b.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/b.ts')
    })

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement

    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    fireEvent.contextMenu(screen.getByTestId('code-line-1'), {
      clientX: 100,
      clientY: 110,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))
    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('src/a.ts')
    })

    fireEvent.change(workspaceSelect, { target: { value: projectBRoot } })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    fireEvent.contextMenu(screen.getByTestId('code-line-1'), {
      clientX: 120,
      clientY: 130,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))
    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('src/b.ts')
    })
  })

  it('copies selected content/copy both from code-viewer context menu and applies right-click selection policy', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'auth.ts',
            relativePath: 'src/auth.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'alpha\nbeta\ngamma',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'auth.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'auth.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('code-line-2'))
    fireEvent.click(screen.getByTestId('code-line-3'), { shiftKey: true })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L2-L3',
    )

    fireEvent.contextMenu(screen.getByTestId('code-line-3'), {
      clientX: 120,
      clientY: 160,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Selected Content' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('beta\ngamma')
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L2-L3',
    )

    fireEvent.contextMenu(screen.getByTestId('code-line-1'), {
      clientX: 140,
      clientY: 190,
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L1-L1',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy Both' }))
    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('src/auth.ts:L1-L1\nalpha')
    })
  })

  it('copies relative path from file-tree file/directory context menu without changing active file', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'note.md',
            relativePath: 'docs/note.md',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'note.md' })).toBeInTheDocument()
    })

    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
      'No active file',
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'docs' }), {
      clientX: 70,
      clientY: 90,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('docs')
    })

    fireEvent.contextMenu(screen.getByRole('button', { name: 'note.md' }), {
      clientX: 90,
      clientY: 110,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('docs/note.md')
    })
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
      'No active file',
    )
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it('renders markdown in right spec panel when .md file is selected', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'README.md',
        relativePath: 'README.md',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: '# Title\n\n## Intro\nbody',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toBeInTheDocument()
    })

    expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
      'README.md',
    )
    expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent('Title')
    expect(screen.getByTestId('spec-viewer-toc')).toBeInTheDocument()
  })

  it('keeps rendered spec visible while selecting a code file', async () => {
    const workspaceRoot = '/Users/tester/projects/sdd-workbench'
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'app.ts',
            relativePath: 'src/app.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Title\n\nspec body',
        }
      }

      if (relativePath === 'src/app.ts') {
        return {
          ok: true,
          content: 'const value = 1',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent('Title')
    })
    expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
      'docs/README.md',
    )

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'app.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'app.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/app.ts')
    })
    expect(screen.getByTestId('code-viewer-content')).toHaveTextContent(
      'const value = 1',
    )
    expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
      'docs/README.md',
    )
    expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent('spec body')
  })

  it('opens line-range markdown links from rendered spec content and applies selection', async () => {
    const workspaceRoot = '/Users/tester/projects/sdd-workbench'
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'overview.ts',
            relativePath: 'src/overview.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Main\n\n[Open Overview](../src/overview.ts#L2-L3)',
        }
      }

      if (relativePath === 'src/overview.ts') {
        return {
          ok: true,
          content: 'line1\nline2\nline3\nline4',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('link', { name: 'Open Overview' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'src/overview.ts',
      )
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L2-L3',
    )
    expect(readFileMock).toHaveBeenCalledWith(workspaceRoot, 'src/overview.ts')
    expect(screen.getByTestId('workspace-path')).toHaveAttribute(
      'title',
      workspaceRoot,
    )
  })

  it('opens markdown links without line hash and keeps selection empty', async () => {
    const workspaceRoot = '/Users/tester/projects/sdd-workbench'
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'plain.ts',
            relativePath: 'src/plain.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Main\n\n[Open Plain](../src/plain.ts)',
        }
      }

      if (relativePath === 'src/plain.ts') {
        return {
          ok: true,
          content: 'const value = 1',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('link', { name: 'Open Plain' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'src/plain.ts',
      )
    })

    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: none',
    )
  })

  it('opens line links using the currently active workspace after switching', async () => {
    const projectARoot = '/Users/tester/projects/workspace-a'
    const projectBRoot = '/Users/tester/projects/workspace-b'
    const workspaceTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'shared.ts',
            relativePath: 'src/shared.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: workspaceTree,
    })

    readFileMock.mockImplementation(async (rootPath, relativePath) => {
      if (rootPath === projectARoot && relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Workspace A\n\n[Open Shared](../src/shared.ts#L3-L4)',
        }
      }

      if (rootPath === projectBRoot && relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Workspace B\n\n[Open Shared](../src/shared.ts#L5-L6)',
        }
      }

      if (rootPath === projectARoot && relativePath === 'src/shared.ts') {
        return {
          ok: true,
          content: 'a1\na2\na3\na4\na5',
        }
      }

      if (rootPath === projectBRoot && relativePath === 'src/shared.ts') {
        return {
          ok: true,
          content: 'b1\nb2\nb3\nb4\nb5\nb6',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'Workspace A',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'Workspace B',
      )
    })

    fireEvent.change(screen.getByTestId('workspace-switcher-select'), {
      target: { value: projectARoot },
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
      'Workspace A',
    )

    fireEvent.click(screen.getByRole('link', { name: 'Open Shared' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'src/shared.ts',
      )
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L3-L4',
    )
    expect(readFileMock).toHaveBeenLastCalledWith(projectARoot, 'src/shared.ts')
  })

  it('shows copy popover for external markdown links without resetting workspace', async () => {
    const workspaceRoot = '/Users/tester/projects/sdd-workbench'
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: '# Main\n\n[External Link](https://example.com/docs)',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('link', { name: 'External Link' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Link actions' })).toHaveTextContent(
        'https://example.com/docs',
      )
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('workspace-path')).toHaveAttribute(
      'title',
      workspaceRoot,
    )
  })

  it('restores activeSpec per workspace when switching', async () => {
    const projectARoot = '/Users/tester/spec-project-a'
    const projectBRoot = '/Users/tester/spec-project-b'

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'SPEC_A.md',
              relativePath: 'SPEC_A.md',
              kind: 'file',
            },
          ],
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'SPEC_B.md',
              relativePath: 'SPEC_B.md',
              kind: 'file',
            },
          ],
        }
      }

      return {
        ok: false,
        fileTree: [],
      }
    })

    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'SPEC_A.md') {
        return {
          ok: true,
          content: '# Workspace A',
        }
      }

      if (relativePath === 'SPEC_B.md') {
        return {
          ok: true,
          content: '# Workspace B',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SPEC_A.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'SPEC_A.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        'SPEC_A.md',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SPEC_B.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'SPEC_B.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        'SPEC_B.md',
      )
    })

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement

    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        'SPEC_A.md',
      )
    })

    fireEvent.change(workspaceSelect, { target: { value: projectBRoot } })
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        'SPEC_B.md',
      )
    })
  })

  it('shows preview unavailable state for binary files', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'binary.dat',
        relativePath: 'binary.dat',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: null,
      previewUnavailableReason: 'binary_file',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'binary.dat' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'binary.dat' }))

    await waitFor(() => {
      expect(
        screen.getByTestId('code-viewer-preview-unavailable'),
      ).toHaveTextContent('Preview unavailable: binary file detected.')
    })
  })
})
