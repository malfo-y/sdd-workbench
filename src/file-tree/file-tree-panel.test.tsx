import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileTreePanel } from './file-tree-panel'

const defaultLazyProps = {
  loadingDirectories: [] as string[],
  onRequestLoadDirectory: () => undefined,
  gitFileStatuses: {} as Record<string, 'added' | 'modified' | 'untracked'>,
}

describe('FileTreePanel context copy', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows copy popover on file context-menu and requests relative-path copy', () => {
    const onRequestCopyRelativePath = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={['src/auth.ts']}
        expandedDirectories={['src']}
        fileTree={[
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
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={onRequestCopyRelativePath}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultLazyProps}
      />,
    )

    expect(
      screen.getByTestId('tree-changed-indicator-src/auth.ts'),
    ).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: 'auth.ts' }), {
      clientX: 120,
      clientY: 160,
    })

    expect(screen.getByRole('dialog', { name: 'Copy actions' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))

    expect(onRequestCopyRelativePath).toHaveBeenCalledWith('src/auth.ts')
    expect(
      screen.queryByRole('dialog', { name: 'Copy actions' }),
    ).not.toBeInTheDocument()
  })

  it('shows copy popover on directory context-menu and preserves toggle behavior', () => {
    const onRequestCopyRelativePath = vi.fn()
    const onExpandedDirectoriesChange = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [],
          },
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={onExpandedDirectoriesChange}
        onRequestCopyRelativePath={onRequestCopyRelativePath}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultLazyProps}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'src' }), {
      clientX: 80,
      clientY: 90,
    })

    expect(screen.getByRole('dialog', { name: 'Copy actions' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))
    expect(onRequestCopyRelativePath).toHaveBeenCalledWith('src')

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    expect(onExpandedDirectoriesChange).toHaveBeenCalledWith(['src'])
  })

  it('shows root-level files even when root directories exist', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [],
          },
          {
            name: 'README.md',
            relativePath: 'README.md',
            kind: 'file',
          },
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultLazyProps}
      />,
    )

    expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
  })

  it('bubbles changed marker to nearest visible collapsed directory', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={['src/utils/math.ts']}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'utils',
                relativePath: 'src/utils',
                kind: 'directory',
                children: [
                  {
                    name: 'math.ts',
                    relativePath: 'src/utils/math.ts',
                    kind: 'file',
                  },
                ],
              },
            ],
          },
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultLazyProps}
      />,
    )

    expect(screen.getByTestId('tree-changed-indicator-src')).toBeInTheDocument()
    expect(
      screen.queryByTestId('tree-changed-indicator-src/utils'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('tree-changed-indicator-src/utils/math.ts'),
    ).not.toBeInTheDocument()
  })

  it('bubbles changed marker for lazy subtree based on changed path hints', () => {
    const onExpandedDirectoriesChange = vi.fn()

    const { rerender } = render(
      <FileTreePanel
        activeFile={null}
        changedFiles={['src/utils/math.ts']}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'utils',
                relativePath: 'src/utils',
                kind: 'directory',
                children: [],
                childrenStatus: 'not-loaded',
              },
            ],
          },
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={onExpandedDirectoriesChange}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
        loadingDirectories={[]}
      />,
    )

    expect(screen.getByTestId('tree-changed-indicator-src')).toBeInTheDocument()
    expect(
      screen.queryByTestId('tree-changed-indicator-src/utils'),
    ).not.toBeInTheDocument()

    rerender(
      <FileTreePanel
        activeFile={null}
        changedFiles={['src/utils/math.ts']}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'utils',
                relativePath: 'src/utils',
                kind: 'directory',
                children: [],
                childrenStatus: 'not-loaded',
              },
            ],
          },
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={onExpandedDirectoriesChange}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
        loadingDirectories={[]}
      />,
    )

    expect(screen.queryByTestId('tree-changed-indicator-src')).not.toBeInTheDocument()
    expect(screen.getByTestId('tree-changed-indicator-src/utils')).toBeInTheDocument()
  })

  it('bubbles changed marker for partial directories even when file is not currently loaded', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={['src/missing.ts']}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'visible.ts',
                relativePath: 'src/visible.ts',
                kind: 'file',
              },
            ],
            childrenStatus: 'partial',
            totalChildCount: 2000,
          },
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
        loadingDirectories={[]}
      />,
    )

    expect(screen.getByTestId('tree-changed-indicator-src')).toBeInTheDocument()
  })

  it('moves changed marker deeper as directories are expanded', () => {
    const onExpandedDirectoriesChange = vi.fn()

    const { rerender } = render(
      <FileTreePanel
        activeFile={null}
        changedFiles={['src/utils/math.ts']}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'utils',
                relativePath: 'src/utils',
                kind: 'directory',
                children: [
                  {
                    name: 'math.ts',
                    relativePath: 'src/utils/math.ts',
                    kind: 'file',
                  },
                ],
              },
            ],
          },
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={onExpandedDirectoriesChange}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultLazyProps}
      />,
    )

    expect(screen.getByTestId('tree-changed-indicator-src')).toBeInTheDocument()
    expect(
      screen.queryByTestId('tree-changed-indicator-src/utils'),
    ).not.toBeInTheDocument()

    rerender(
      <FileTreePanel
        activeFile={null}
        changedFiles={['src/utils/math.ts']}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'utils',
                relativePath: 'src/utils',
                kind: 'directory',
                children: [
                  {
                    name: 'math.ts',
                    relativePath: 'src/utils/math.ts',
                    kind: 'file',
                  },
                ],
              },
            ],
          },
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={onExpandedDirectoriesChange}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultLazyProps}
      />,
    )

    expect(screen.queryByTestId('tree-changed-indicator-src')).not.toBeInTheDocument()
    expect(screen.getByTestId('tree-changed-indicator-src/utils')).toBeInTheDocument()
    expect(
      screen.queryByTestId('tree-changed-indicator-src/utils/math.ts'),
    ).not.toBeInTheDocument()

    rerender(
      <FileTreePanel
        activeFile={null}
        changedFiles={['src/utils/math.ts']}
        expandedDirectories={['src', 'src/utils']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'utils',
                relativePath: 'src/utils',
                kind: 'directory',
                children: [
                  {
                    name: 'math.ts',
                    relativePath: 'src/utils/math.ts',
                    kind: 'file',
                  },
                ],
              },
            ],
          },
        ]}
        isIndexing={false}
        onExpandedDirectoriesChange={onExpandedDirectoriesChange}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultLazyProps}
      />,
    )

    expect(
      screen.queryByTestId('tree-changed-indicator-src/utils'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('tree-changed-indicator-src/utils/math.ts'),
    ).toBeInTheDocument()
  })
})

describe('FileTreePanel lazy directory loading', () => {
  afterEach(() => {
    cleanup()
  })

  it('calls onRequestLoadDirectory when expanding a not-loaded directory', () => {
    const onRequestLoadDirectory = vi.fn()
    const onExpandedDirectoriesChange = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'deep',
            relativePath: 'deep',
            kind: 'directory',
            children: [],
            childrenStatus: 'not-loaded',
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={onExpandedDirectoriesChange}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={onRequestLoadDirectory}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'deep' }))
    expect(onRequestLoadDirectory).toHaveBeenCalledWith('deep')
    expect(onExpandedDirectoriesChange).toHaveBeenCalledWith(['deep'])
  })

  it('shows loading placeholder when directory is in loadingDirectories', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['deep']}
        fileTree={[
          {
            name: 'deep',
            relativePath: 'deep',
            kind: 'directory',
            children: [],
            childrenStatus: 'not-loaded',
          },
        ]}
        isIndexing={false}
        loadingDirectories={['deep']}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
      />,
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders partial directory cap message', () => {
    const onRequestLoadDirectory = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['big']}
        fileTree={[
          {
            name: 'big',
            relativePath: 'big',
            kind: 'directory',
            children: [
              {
                name: 'a.ts',
                relativePath: 'big/a.ts',
                kind: 'file',
              },
            ],
            childrenStatus: 'partial',
            totalChildCount: 750,
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={onRequestLoadDirectory}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
      />,
    )

    expect(screen.getByText('Showing 1 of 750 items')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(onRequestLoadDirectory).toHaveBeenCalledWith('big', {
      append: true,
    })
  })

  it('does not call onRequestLoadDirectory for already-loaded directory', () => {
    const onRequestLoadDirectory = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'loaded',
            relativePath: 'loaded',
            kind: 'directory',
            children: [
              {
                name: 'file.ts',
                relativePath: 'loaded/file.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={onRequestLoadDirectory}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'loaded' }))
    expect(onRequestLoadDirectory).not.toHaveBeenCalled()
  })
})

describe('FileTreePanel CRUD context menu', () => {
  afterEach(() => {
    cleanup()
  })

  const defaultCrudProps = {
    onRequestCreateFile: vi.fn(),
    onRequestCreateDirectory: vi.fn(),
    onRequestDeleteFile: vi.fn(),
    onRequestDeleteDirectory: vi.fn(),
    onRequestRename: vi.fn(),
    gitFileStatuses: {} as Record<string, 'added' | 'modified' | 'untracked'>,
  }

  it('shows New File here, New Directory here, Rename, and Delete on file node right-click', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'index.ts',
                relativePath: 'src/index.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultCrudProps}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'index.ts' }), {
      clientX: 100,
      clientY: 100,
    })

    expect(screen.getByRole('button', { name: 'Copy Relative Path' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New File here' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Directory here' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows New File here, New Directory here, Rename, and Delete on directory node right-click', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultCrudProps}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'src' }), {
      clientX: 100,
      clientY: 100,
    })

    expect(screen.getByRole('button', { name: 'Copy Relative Path' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New File here' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Directory here' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows inline input when New File here is clicked from file context menu', async () => {
    const onExpandedDirectoriesChange = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'index.ts',
                relativePath: 'src/index.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={onExpandedDirectoriesChange}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultCrudProps}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'index.ts' }), {
      clientX: 100,
      clientY: 100,
    })

    fireEvent.click(screen.getByRole('button', { name: 'New File here' }))

    expect(screen.getByTestId('tree-inline-input')).toBeInTheDocument()
  })

  it('calls onRequestCreateFile when Enter is pressed in inline input', () => {
    const onRequestCreateFile = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'index.ts',
                relativePath: 'src/index.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
        onRequestCreateFile={onRequestCreateFile}
        onRequestCreateDirectory={vi.fn()}
        onRequestDeleteFile={vi.fn()}
        onRequestDeleteDirectory={vi.fn()}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'index.ts' }), {
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(screen.getByRole('button', { name: 'New File here' }))

    const input = screen.getByTestId('tree-inline-input')
    fireEvent.change(input, { target: { value: 'newfile.ts' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onRequestCreateFile).toHaveBeenCalledWith('src/newfile.ts')
    expect(screen.queryByTestId('tree-inline-input')).not.toBeInTheDocument()
  })

  it('cancels inline input when Escape is pressed', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'index.ts',
                relativePath: 'src/index.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultCrudProps}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'index.ts' }), {
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(screen.getByRole('button', { name: 'New File here' }))

    expect(screen.getByTestId('tree-inline-input')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByTestId('tree-inline-input'), { key: 'Escape' })

    expect(screen.queryByTestId('tree-inline-input')).not.toBeInTheDocument()
  })

  it('shows error message when Enter is pressed with empty name in inline input', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'index.ts',
                relativePath: 'src/index.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultCrudProps}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'index.ts' }), {
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(screen.getByRole('button', { name: 'New File here' }))

    const input = screen.getByTestId('tree-inline-input')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByRole('alert')).toHaveTextContent('Name cannot be empty.')
    expect(screen.getByTestId('tree-inline-input')).toBeInTheDocument()
  })

  it('calls onRequestDeleteFile when Delete is clicked on a file node', () => {
    const onRequestDeleteFile = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'index.ts',
                relativePath: 'src/index.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
        onRequestCreateFile={vi.fn()}
        onRequestCreateDirectory={vi.fn()}
        onRequestDeleteFile={onRequestDeleteFile}
        onRequestDeleteDirectory={vi.fn()}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'index.ts' }), {
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onRequestDeleteFile).toHaveBeenCalledWith('src/index.ts')
  })

  it('calls onRequestDeleteDirectory when Delete is clicked on a directory node', () => {
    const onRequestDeleteDirectory = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
        onRequestCreateFile={vi.fn()}
        onRequestCreateDirectory={vi.fn()}
        onRequestDeleteFile={vi.fn()}
        onRequestDeleteDirectory={onRequestDeleteDirectory}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'src' }), {
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onRequestDeleteDirectory).toHaveBeenCalledWith('src')
  })

  it('shows inline input with pre-filled name when Rename is clicked', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'index.ts',
                relativePath: 'src/index.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultCrudProps}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'index.ts' }), {
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

    const input = screen.getByTestId('tree-inline-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('index.ts')
  })

  it('calls onRequestRename with old and new paths when name is changed', () => {
    const onRequestRename = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'index.ts',
                relativePath: 'src/index.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
        onRequestCreateFile={vi.fn()}
        onRequestCreateDirectory={vi.fn()}
        onRequestDeleteFile={vi.fn()}
        onRequestDeleteDirectory={vi.fn()}
        onRequestRename={onRequestRename}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'index.ts' }), {
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

    const input = screen.getByTestId('tree-inline-input')
    fireEvent.change(input, { target: { value: 'app.ts' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onRequestRename).toHaveBeenCalledWith('src/index.ts', 'src/app.ts')
    expect(screen.queryByTestId('tree-inline-input')).not.toBeInTheDocument()
  })

  it('does not call onRequestRename when same name is entered', () => {
    const onRequestRename = vi.fn()

    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'index.ts',
                relativePath: 'src/index.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        gitFileStatuses={{}}
        onRequestCreateFile={vi.fn()}
        onRequestCreateDirectory={vi.fn()}
        onRequestDeleteFile={vi.fn()}
        onRequestDeleteDirectory={vi.fn()}
        onRequestRename={onRequestRename}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'index.ts' }), {
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

    const input = screen.getByTestId('tree-inline-input')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onRequestRename).not.toHaveBeenCalled()
    expect(screen.queryByTestId('tree-inline-input')).not.toBeInTheDocument()
  })

  it('does not show Rename on empty area right-click', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [],
          },
        ]}
        isIndexing={false}
        loadingDirectories={[]}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestLoadDirectory={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        {...defaultCrudProps}
      />,
    )

    const panel = screen.getByTestId('file-tree-panel')
    fireEvent.contextMenu(panel, {
      clientX: 100,
      clientY: 500,
    })

    expect(screen.getByRole('button', { name: 'New File here' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Directory here' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})

describe('FileTreePanel git status badges', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows M badge for modified files', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
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
        ]}
        gitFileStatuses={{ 'src/app.ts': 'modified' }}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        loadingDirectories={[]}
        onRequestLoadDirectory={() => undefined}
      />,
    )

    const badge = screen.getByTestId('tree-git-badge-src/app.ts')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('M')
    expect(badge).toHaveAttribute('title', 'Modified')
  })

  it('shows U badge for untracked files', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'new.ts',
                relativePath: 'src/new.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        gitFileStatuses={{ 'src/new.ts': 'untracked' }}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        loadingDirectories={[]}
        onRequestLoadDirectory={() => undefined}
      />,
    )

    const badge = screen.getByTestId('tree-git-badge-src/new.ts')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('U')
    expect(badge).toHaveAttribute('title', 'Untracked')
  })

  it('shows U badge for added files', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'staged.ts',
                relativePath: 'src/staged.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        gitFileStatuses={{ 'src/staged.ts': 'added' }}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        loadingDirectories={[]}
        onRequestLoadDirectory={() => undefined}
      />,
    )

    const badge = screen.getByTestId('tree-git-badge-src/staged.ts')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('U')
    expect(badge).toHaveAttribute('title', 'Added')
  })

  it('does not show badge when gitFileStatuses is empty', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'clean.ts',
                relativePath: 'src/clean.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        gitFileStatuses={{}}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        loadingDirectories={[]}
        onRequestLoadDirectory={() => undefined}
      />,
    )

    expect(screen.queryByTestId('tree-git-badge-src/clean.ts')).not.toBeInTheDocument()
  })

  it('bubbles git status badge to collapsed directory', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={[]}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'deep.ts',
                relativePath: 'src/deep.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        gitFileStatuses={{ 'src/deep.ts': 'modified' }}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        loadingDirectories={[]}
        onRequestLoadDirectory={() => undefined}
      />,
    )

    const dirBadge = screen.getByTestId('tree-git-badge-src')
    expect(dirBadge).toBeInTheDocument()
    expect(dirBadge).toHaveTextContent('M')
  })

  it('does not show directory badge when expanded', () => {
    render(
      <FileTreePanel
        activeFile={null}
        changedFiles={[]}
        expandedDirectories={['src']}
        fileTree={[
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'deep.ts',
                relativePath: 'src/deep.ts',
                kind: 'file',
              },
            ],
          },
        ]}
        gitFileStatuses={{ 'src/deep.ts': 'modified' }}
        isIndexing={false}
        onExpandedDirectoriesChange={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onSelectFile={() => undefined}
        rootPath="/Users/tester/project"
        loadingDirectories={[]}
        onRequestLoadDirectory={() => undefined}
      />,
    )

    expect(screen.queryByTestId('tree-git-badge-src')).not.toBeInTheDocument()
    expect(screen.getByTestId('tree-git-badge-src/deep.ts')).toBeInTheDocument()
  })
})
