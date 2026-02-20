import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import App from './App'
import { WorkspaceProvider } from './workspace/workspace-context'

describe('F01/F02/F03 workspace flow', () => {
  const openDialogMock = vi.fn<() => Promise<WorkspaceOpenDialogResult>>()
  const indexWorkspaceMock =
    vi.fn<(rootPath: string) => Promise<WorkspaceIndexResult>>()
  const readFileMock =
    vi.fn<
      (rootPath: string, relativePath: string) => Promise<WorkspaceReadFileResult>
    >()

  beforeEach(() => {
    openDialogMock.mockReset()
    indexWorkspaceMock.mockReset()
    readFileMock.mockReset()
    window.workspace = {
      openDialog: openDialogMock,
      index: indexWorkspaceMock,
      readFile: readFileMock,
    }
  })

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

    expect(screen.getByTestId('active-file-path')).toHaveTextContent(
      'No active file',
    )

    fireEvent.click(screen.getByRole('button', { name: 'src' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'auth.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'auth.ts' }))

    expect(screen.getByTestId('active-file-path')).toHaveTextContent('src/auth.ts')
    expect(screen.getByTestId('active-file-path')).toHaveAttribute(
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
