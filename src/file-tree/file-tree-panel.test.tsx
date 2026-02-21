import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileTreePanel } from './file-tree-panel'

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
      />,
    )

    expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
  })
})
