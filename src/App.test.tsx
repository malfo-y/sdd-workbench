import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { StrictMode } from 'react'
import App from './App'
import { WorkspaceProvider } from './workspace/workspace-context'
import {
  WORKSPACE_SESSION_SCHEMA_VERSION,
  WORKSPACE_SESSION_STORAGE_KEY,
} from './workspace/workspace-persistence'

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

function setWorkspaceSessionStorage(rawValue: unknown) {
  window.localStorage.setItem(
    WORKSPACE_SESSION_STORAGE_KEY,
    JSON.stringify(rawValue),
  )
}

function clearWorkspaceSessionStorage() {
  window.localStorage.removeItem(WORKSPACE_SESSION_STORAGE_KEY)
}

describe('F01/F02/F03/F04 workspace flow', () => {
  const openDialogMock = vi.fn<() => Promise<WorkspaceOpenDialogResult>>()
  const indexWorkspaceMock =
    vi.fn<(rootPath: string) => Promise<WorkspaceIndexResult>>()
  const readFileMock =
    vi.fn<
      (rootPath: string, relativePath: string) => Promise<WorkspaceReadFileResult>
    >()
  const readCommentsMock =
    vi.fn<(rootPath: string) => Promise<WorkspaceReadCommentsResult>>()
  const writeCommentsMock =
    vi.fn<
      (
        rootPath: string,
        comments: CodeCommentRecord[],
      ) => Promise<WorkspaceWriteCommentsResult>
    >()
  const exportCommentsBundleMock =
    vi.fn<
      (
        request: WorkspaceExportCommentsBundleRequest,
      ) => Promise<WorkspaceExportCommentsBundleResult>
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
  const openInItermMock = vi.fn<(rootPath: string) => Promise<SystemOpenInResult>>()
  const openInVsCodeMock =
    vi.fn<(rootPath: string) => Promise<SystemOpenInResult>>()
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
    readCommentsMock.mockReset()
    writeCommentsMock.mockReset()
    exportCommentsBundleMock.mockReset()
    watchStartMock.mockReset()
    watchStopMock.mockReset()
    openInItermMock.mockReset()
    openInVsCodeMock.mockReset()
    onWatchEventMock.mockReset()
    onHistoryNavigateMock.mockReset()
    watchListeners.clear()
    historyNavigateListeners.clear()
    watchStartMock.mockResolvedValue({ ok: true })
    watchStopMock.mockResolvedValue({ ok: true })
    readCommentsMock.mockResolvedValue({
      ok: true,
      comments: [],
    })
    writeCommentsMock.mockResolvedValue({ ok: true })
    exportCommentsBundleMock.mockResolvedValue({ ok: true })
    openInItermMock.mockResolvedValue({ ok: true })
    openInVsCodeMock.mockResolvedValue({ ok: true })
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
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createTestStorage(),
    })
    clearWorkspaceSessionStorage()
    window.workspace = {
      openDialog: openDialogMock,
      index: indexWorkspaceMock,
      readFile: readFileMock,
      readComments: readCommentsMock,
      writeComments: writeCommentsMock,
      exportCommentsBundle: exportCommentsBundleMock,
      watchStart: watchStartMock,
      watchStop: watchStopMock,
      onWatchEvent: onWatchEventMock,
      onHistoryNavigate: onHistoryNavigateMock,
      openInIterm: openInItermMock,
      openInVsCode: openInVsCodeMock,
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

  it('renders Open In buttons as disabled when no active workspace exists', () => {
    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    expect(screen.getByRole('button', { name: 'Open in iTerm' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open in VSCode' })).toBeDisabled()
  })

  it('opens active workspace in iTerm and VSCode', async () => {
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
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
      expect(screen.getByTestId('workspace-path')).toHaveTextContent(
        '~/projects/sdd-workbench',
      )
    })

    const openInItermButton = screen.getByRole('button', { name: 'Open in iTerm' })
    const openInVsCodeButton = screen.getByRole('button', { name: 'Open in VSCode' })
    expect(openInItermButton).toBeEnabled()
    expect(openInVsCodeButton).toBeEnabled()

    fireEvent.click(openInItermButton)
    fireEvent.click(openInVsCodeButton)

    await waitFor(() => {
      expect(openInItermMock).toHaveBeenCalledWith(
        '/Users/tester/projects/sdd-workbench',
      )
      expect(openInVsCodeMock).toHaveBeenCalledWith(
        '/Users/tester/projects/sdd-workbench',
      )
    })
  })

  it('shows error banner when open in app request fails', async () => {
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    openInVsCodeMock.mockResolvedValueOnce({
      ok: false,
      error: 'Failed to launch VSCode.',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open in VSCode' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open in VSCode' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to launch VSCode.')
    })
  })

  it('shows truncation banner when workspace index result is truncated', async () => {
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/huge-workspace',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
      truncated: true,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Workspace index truncated at 10,000 nodes.',
      )
    })
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
    expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()

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

  it('restores workspace sessions and active file line on app mount', async () => {
    const projectARoot = '/Users/tester/restore-a'
    const projectBRoot = '/Users/tester/restore-b'
    const projectAId = projectARoot
    const projectBId = projectBRoot

    setWorkspaceSessionStorage({
        schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
        activeWorkspaceId: projectBId,
        workspaceOrder: [projectAId, projectBId],
        workspacesById: {
          [projectAId]: {
            rootPath: projectARoot,
            activeFile: 'a.ts',
            expandedDirectories: ['src'],
            fileLastLineByPath: {
              'a.ts': 3,
            },
          },
          [projectBId]: {
            rootPath: projectBRoot,
            activeFile: 'b.ts',
            expandedDirectories: ['src'],
            fileLastLineByPath: {
              'b.ts': 2,
            },
          },
        },
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [{ name: 'a.ts', relativePath: 'a.ts', kind: 'file' }],
        }
      }
      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [{ name: 'b.ts', relativePath: 'b.ts', kind: 'file' }],
        }
      }
      return {
        ok: false,
        fileTree: [],
      }
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content:
        relativePath === 'a.ts'
          ? 'line1\nline2\nline3\nline4'
          : 'line1\nline2\nline3',
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(watchStartMock).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L2-L2',
    )
    expect(
      (screen.getByTestId('workspace-switcher-select') as HTMLSelectElement).options,
    ).toHaveLength(2)
  })

  it('restores image active file and expanded directories on app mount', async () => {
    const projectRoot = '/Users/tester/restore-image'
    const projectId = projectRoot

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: projectId,
      workspaceOrder: [projectId],
      workspacesById: {
        [projectId]: {
          rootPath: projectRoot,
          activeFile: 'assets/diagram.png',
          expandedDirectories: ['assets'],
          fileLastLineByPath: {},
        },
      },
    })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [
        {
          name: 'assets',
          relativePath: 'assets',
          kind: 'directory',
          children: [
            {
              name: 'diagram.png',
              relativePath: 'assets/diagram.png',
              kind: 'file',
            },
          ],
        },
      ],
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: null,
      imagePreview: {
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,AA==',
      },
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectRoot,
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'assets/diagram.png',
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-image-preview')).toBeInTheDocument()
    })

    expect(screen.getByRole('img', { name: 'Image preview for assets/diagram.png' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AA==',
    )
    expect(screen.getByRole('button', { name: 'diagram.png' })).toBeInTheDocument()
  })

  it('restores active file even when initial restore index result becomes stale', async () => {
    const projectRoot = '/Users/tester/restore-stale-image'
    const projectId = projectRoot

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: projectId,
      workspaceOrder: [projectId],
      workspacesById: {
        [projectId]: {
          rootPath: projectRoot,
          activeFile: 'examples/family.png',
          expandedDirectories: ['examples'],
          fileLastLineByPath: {},
        },
      },
    })

    let indexCallCount = 0
    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath !== projectRoot) {
        return {
          ok: false,
          fileTree: [],
        }
      }

      indexCallCount += 1
      if (indexCallCount === 1) {
        emitWatchEvent({
          workspaceId: projectId,
          changedRelativePaths: [],
          hasStructureChanges: true,
        })
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 12)
        })
      }

      return {
        ok: true,
        fileTree: [
          {
            name: 'examples',
            relativePath: 'examples',
            kind: 'directory',
            children: [
              {
                name: 'family.png',
                relativePath: 'examples/family.png',
                kind: 'file',
              },
            ],
          },
        ],
      }
    })

    readFileMock.mockResolvedValue({
      ok: true,
      content: null,
      imagePreview: {
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,AA==',
      },
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectRoot,
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'examples/family.png',
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-image-preview')).toBeInTheDocument()
    })
  })

  it('skips failed workspace restores and keeps remaining workspaces active', async () => {
    const validRoot = '/Users/tester/restore-valid'
    const invalidRoot = '/Users/tester/restore-invalid'
    const validId = validRoot
    const invalidId = invalidRoot

    setWorkspaceSessionStorage({
        schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
        activeWorkspaceId: invalidId,
        workspaceOrder: [validId, invalidId],
        workspacesById: {
          [validId]: {
            rootPath: validRoot,
            activeFile: 'ok.ts',
            expandedDirectories: [],
            fileLastLineByPath: { 'ok.ts': 2 },
          },
          [invalidId]: {
            rootPath: invalidRoot,
            activeFile: 'broken.ts',
            expandedDirectories: [],
            fileLastLineByPath: { 'broken.ts': 4 },
          },
        },
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === validRoot) {
        return {
          ok: true,
          fileTree: [{ name: 'ok.ts', relativePath: 'ok.ts', kind: 'file' }],
        }
      }
      if (rootPath === invalidRoot) {
        return {
          ok: false,
          fileTree: [],
          error: 'permission denied',
        }
      }
      return {
        ok: false,
        fileTree: [],
      }
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: 'line1\nline2',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Some workspaces could not be restored (1).',
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        validRoot,
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'ok.ts',
      )
    })
    expect(watchStopMock).toHaveBeenCalledWith(invalidId)
    expect(
      (screen.getByTestId('workspace-switcher-select') as HTMLSelectElement).options,
    ).toHaveLength(1)
  })

  it('restores active markdown spec independently from active code file on app mount', async () => {
    const projectRoot = '/Users/tester/restore-spec'
    const projectId = projectRoot

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: projectId,
      workspaceOrder: [projectId],
      workspacesById: {
        [projectId]: {
          rootPath: projectRoot,
          activeFile: 'src/app.ts',
          activeSpec: '_sdd/spec/main.md',
          expandedDirectories: ['src', '_sdd', '_sdd/spec'],
          fileLastLineByPath: {
            'src/app.ts': 4,
          },
        },
      },
    })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [
        {
          name: '_sdd',
          relativePath: '_sdd',
          kind: 'directory',
          children: [
            {
              name: 'spec',
              relativePath: '_sdd/spec',
              kind: 'directory',
              children: [
                {
                  name: 'main.md',
                  relativePath: '_sdd/spec/main.md',
                  kind: 'file',
                },
              ],
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
      ],
    })

    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'src/app.ts') {
        return {
          ok: true,
          content: 'const ready = true\nconsole.log(ready)\nexport {}\n',
        }
      }

      if (relativePath === '_sdd/spec/main.md') {
        return {
          ok: true,
          content: '# Restored Spec\n\n- persisted',
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

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectRoot,
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'src/app.ts',
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        '_sdd/spec/main.md',
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'Restored Spec',
      )
    })
  })

  it('restores snapshot under StrictMode without clearing persisted session', async () => {
    const projectRoot = '/Users/tester/strict-restore'
    const projectId = projectRoot

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: projectId,
      workspaceOrder: [projectId],
      workspacesById: {
        [projectId]: {
          rootPath: projectRoot,
          activeFile: 'main.md',
          expandedDirectories: [],
          fileLastLineByPath: { 'main.md': 2 },
        },
      },
    })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [{ name: 'main.md', relativePath: 'main.md', kind: 'file' }],
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: '# hello\n\nsession restore',
    })

    render(
      <StrictMode>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </StrictMode>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectRoot,
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'main.md',
      )
    })
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

  it('refreshes file tree when watcher reports structure-only changes', async () => {
    const workspaceRoot = '/Users/tester/watch-structure-refresh'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [],
      })
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [
          {
            name: 'docs',
            relativePath: 'docs',
            kind: 'directory',
            children: [
              {
                name: 'new.ts',
                relativePath: 'docs/new.ts',
                kind: 'file',
              },
            ],
          },
        ],
      })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'new.ts' })).not.toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: [],
      hasStructureChanges: true,
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'new.ts' })).toBeInTheDocument()
    })
    expect(indexWorkspaceMock).toHaveBeenCalledTimes(2)
  })

  it('clears active file when watcher structure refresh removes it from tree', async () => {
    const workspaceRoot = '/Users/tester/watch-structure-remove'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [{ name: 'gone.ts', relativePath: 'gone.ts', kind: 'file' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [],
      })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'const gone = true',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'gone.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'gone.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('gone.ts')
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['gone.ts'],
      hasStructureChanges: true,
    })

    await waitFor(() => {
      expect(
        screen.getByTestId('code-viewer-active-file'),
      ).toHaveTextContent('No active file')
    })
    expect(screen.queryByRole('button', { name: 'gone.ts' })).not.toBeInTheDocument()
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

  it('renders image preview in code viewer for supported image files', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'diagram.png',
        relativePath: 'diagram.png',
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
      imagePreview: {
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,AA==',
      },
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'diagram.png' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'diagram.png' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-image-preview')).toBeInTheDocument()
    })

    expect(screen.getByRole('img', { name: 'Image preview for diagram.png' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AA==',
    )
    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: image',
    )
    expect(screen.queryByTestId('code-viewer-content')).not.toBeInTheDocument()
  })

  it('shows preview unavailable state for blocked resources', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'vector.svg',
        relativePath: 'vector.svg',
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
      previewUnavailableReason: 'blocked_resource',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'vector.svg' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'vector.svg' }))

    await waitFor(() => {
      expect(
        screen.getByTestId('code-viewer-preview-unavailable'),
      ).toHaveTextContent('Preview unavailable: blocked resource by policy.')
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

  it('goes to active spec source line from rendered markdown selection context action', async () => {
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
          content: '# Title\n\nsource jump paragraph',
        }
      }

      if (relativePath === 'src/app.ts') {
        return {
          ok: true,
          content: 'const app = true',
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
        'source jump paragraph',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'app.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'app.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/app.ts')
    })
    expect(readFileMock).toHaveBeenCalledTimes(2)

    const paragraph = screen.getByText('source jump paragraph')
    const selectedNode = paragraph.firstChild
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: selectedNode,
      focusNode: selectedNode,
      toString: () => 'source jump',
    } as unknown as Selection)

    fireEvent.contextMenu(paragraph, {
      clientX: 220,
      clientY: 260,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'docs/README.md',
      )
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L3-L3',
    )
    expect(readFileMock).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
      'source jump paragraph',
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

  it('adds a code comment from context menu and persists it', async () => {
    const workspaceRoot = '/Users/tester/projects/comments-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'main.ts',
          relativePath: 'main.ts',
          kind: 'file',
        },
      ],
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'const alpha = 1\nconst beta = 2',
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'main.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'main.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-line-1')).toBeInTheDocument()
    })

    fireEvent.contextMenu(screen.getByTestId('code-line-1'), {
      clientX: 100,
      clientY: 120,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Add comment' })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Comment'), {
      target: {
        value: 'Handle null input before assignment',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Comment' }))

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })

    const [writtenRootPath, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenRootPath).toBe(workspaceRoot)
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      relativePath: 'main.ts',
      startLine: 1,
      endLine: 1,
      body: 'Handle null input before assignment',
    })
  })

  it('opens View Comments modal and shows comment metadata', async () => {
    const workspaceRoot = '/Users/tester/projects/view-comments-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'docs/spec.md:4-6:aaaa1111:2026-02-22T14:00:00.000Z',
          relativePath: 'docs/spec.md',
          startLine: 4,
          endLine: 6,
          body: 'Need to refine this section',
          anchor: {
            snippet: 'Section title',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T14:00:00.000Z',
        },
      ],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    expect(screen.getByText('docs/spec.md:L4-L6')).toBeInTheDocument()
    expect(screen.getByText('2026-02-22T14:00:00.000Z')).toBeInTheDocument()
    expect(screen.getByText('Need to refine this section')).toBeInTheDocument()
  })

  it('updates a comment body from View Comments modal', async () => {
    const workspaceRoot = '/Users/tester/projects/edit-comments-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:2-2:aaaa1111:2026-02-22T14:10:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 2,
          endLine: 2,
          body: 'old body',
          anchor: {
            snippet: 'const value = 1',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T14:10:00.000Z',
        },
      ],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Edit comment body'), {
      target: { value: '  updated body  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    const [writtenRootPath, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenRootPath).toBe(workspaceRoot)
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      id: 'src/a.ts:2-2:aaaa1111:2026-02-22T14:10:00.000Z',
      body: 'updated body',
    })
  })

  it('deletes exported comments only from View Comments modal', async () => {
    const workspaceRoot = '/Users/tester/projects/delete-exported-comments-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:1-1:aaaa1111:2026-02-22T10:00:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 1,
          endLine: 1,
          body: 'pending comment',
          anchor: {
            snippet: 'pending',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T10:00:00.000Z',
        },
        {
          id: 'src/b.ts:3-3:bbbb2222:2026-02-22T11:00:00.000Z',
          relativePath: 'src/b.ts',
          startLine: 3,
          endLine: 3,
          body: 'already exported comment',
          anchor: {
            snippet: 'exported',
            hash: 'bbbb2222',
          },
          createdAt: '2026-02-22T11:00:00.000Z',
          exportedAt: '2026-02-22T12:00:00.000Z',
        },
      ],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Exported' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete Exported' }))

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    const [writtenRootPath, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenRootPath).toBe(workspaceRoot)
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      id: 'src/a.ts:1-1:aaaa1111:2026-02-22T10:00:00.000Z',
    })
    expect(writtenComments[0]).not.toHaveProperty('exportedAt')
  })

  it('disables clipboard export when bundle exceeds max length and exports files only', async () => {
    const workspaceRoot = '/Users/tester/projects/export-comments-workspace'
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValue({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:1-1:aaaa1111:2026-02-22T12:00:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 1,
          endLine: 1,
          body: 'x'.repeat(31_000),
          anchor: {
            snippet: 'const a = 1',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T12:00:00.000Z',
        },
      ],
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: true,
      commentsPath: `${workspaceRoot}/_COMMENTS.md`,
      bundlePath: `${workspaceRoot}/.sdd-workbench/exports/20260222-comments-bundle.md`,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Export Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export Comments' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })

    const clipboardCheckbox = screen.getByLabelText('Copy bundle to clipboard')
    expect(clipboardCheckbox).toBeDisabled()
    expect(clipboardCheckbox).not.toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => {
      expect(exportCommentsBundleMock).toHaveBeenCalledTimes(1)
    })
    expect(clipboardWriteText).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })

    expect(exportCommentsBundleMock).toHaveBeenCalledWith({
      rootPath: workspaceRoot,
      commentsMarkdown: expect.any(String),
      bundleMarkdown: expect.any(String),
      writeCommentsFile: true,
      writeBundleFile: true,
    })

    const [, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      relativePath: 'src/a.ts',
      exportedAt: expect.any(String),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export Comments' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })
    expect(screen.getByText('0 pending comment(s)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
  })

  it('keeps file export success when clipboard copy fails during mixed export', async () => {
    const workspaceRoot = '/Users/tester/projects/mixed-export-workspace'
    const clipboardWriteText = vi
      .fn()
      .mockRejectedValue(new Error('clipboard unavailable'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'docs/spec.md:3-3:aaaa1111:2026-02-22T12:00:00.000Z',
          relativePath: 'docs/spec.md',
          startLine: 3,
          endLine: 3,
          body: 'Need clarification for this requirement.',
          anchor: {
            snippet: 'Requirement heading',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T12:00:00.000Z',
        },
      ],
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: true,
      commentsPath: `${workspaceRoot}/_COMMENTS.md`,
      bundlePath: `${workspaceRoot}/.sdd-workbench/exports/20260222_120000-comments-bundle.md`,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Export Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export Comments' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => {
      expect(exportCommentsBundleMock).toHaveBeenCalledTimes(1)
    })
    expect(clipboardWriteText).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    const [, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      relativePath: 'docs/spec.md',
      exportedAt: expect.any(String),
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Comments exported: _COMMENTS.md, bundle file. Failed: clipboard.',
      )
    })
  })

  it('keeps clipboard export success when file export fails during mixed export', async () => {
    const workspaceRoot = '/Users/tester/projects/mixed-export-file-fail-workspace'
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'docs/spec.md:5-5:bbbb2222:2026-02-22T13:00:00.000Z',
          relativePath: 'docs/spec.md',
          startLine: 5,
          endLine: 5,
          body: 'Clipboard success should still mark export state.',
          anchor: {
            snippet: 'Another heading',
            hash: 'bbbb2222',
          },
          createdAt: '2026-02-22T13:00:00.000Z',
        },
      ],
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: false,
      error: 'disk full',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Export Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export Comments' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(exportCommentsBundleMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    const [, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      relativePath: 'docs/spec.md',
      exportedAt: expect.any(String),
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Comments exported: clipboard. Failed: _COMMENTS.md, bundle file.',
      )
    })
  })
})
