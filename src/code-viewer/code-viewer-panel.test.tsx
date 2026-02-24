import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeViewerPanel } from './code-viewer-panel'
import * as syntaxHighlight from './syntax-highlight'
import type { CodeComment } from '../code-comments/comment-types'

describe('CodeViewerPanel highlighting', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('uses python highlighting for .py files and keeps line selection', async () => {
    vi.spyOn(syntaxHighlight, 'highlightPreviewLines').mockResolvedValue([
      '<span style="color:#f97583">def</span> <span style="color:#b392f0">hello</span>():',
      '    <span style="color:#79b8ff">return</span> 1',
    ])

    const onSelectRange = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="tools/example.py"
        activeFileContent={'def hello():\n    return 1'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={onSelectRange}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: python',
    )
    expect(screen.getByTestId('code-viewer-content')).toHaveAttribute(
      'data-highlight-language',
      'python',
    )

    const firstLine = screen.getByTestId('code-line-1').querySelector('.code-line-content')
    await waitFor(() => {
      expect(firstLine?.innerHTML).toContain('<span style="color:')
    })

    fireEvent.click(screen.getByTestId('code-line-2'))
    expect(onSelectRange).toHaveBeenCalledWith({
      startLine: 2,
      endLine: 2,
    })
  })

  it('shows plaintext initially and updates after async highlighting completes', async () => {
    let resolveHighlight!: (lines: string[]) => void
    vi.spyOn(syntaxHighlight, 'highlightPreviewLines').mockReturnValue(
      new Promise<string[]>((resolve) => {
        resolveHighlight = resolve
      }),
    )

    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'const x = 1\nconst y = 2'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    const firstLineContent = screen
      .getByTestId('code-line-1')
      .querySelector('.code-line-content')
    expect(firstLineContent?.innerHTML).not.toContain('<span style="color:')
    expect(firstLineContent?.innerHTML).toContain('const')

    await act(async () => {
      resolveHighlight([
        '<span style="color:#79b8ff">const</span> x = 1',
        '<span style="color:#79b8ff">const</span> y = 2',
      ])
    })

    await waitFor(() => {
      expect(firstLineContent?.innerHTML).toContain('<span style="color:')
    })
  })

  it('falls back to plaintext highlighting for unknown extensions', () => {
    render(
      <CodeViewerPanel
        activeFile="logs/runtime.log"
        activeFileContent={'plain text line'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: plaintext',
    )
    expect(screen.getByTestId('code-viewer-content')).toHaveAttribute(
      'data-highlight-language',
      'plaintext',
    )

    const firstLine = screen.getByTestId('code-line-1').querySelector('.code-line-content')
    expect(firstLine?.innerHTML).toBe('plain text line')
  })

  it('renders git line markers with added and modified kinds', () => {
    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        gitLineMarkers={
          new Map([
            [1, 'added'],
            [2, 'modified'],
          ])
        }
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    expect(screen.getByTestId('code-line-git-marker-1')).toHaveAttribute(
      'data-kind',
      'added',
    )
    expect(screen.getByTestId('code-line-git-marker-2')).toHaveAttribute(
      'data-kind',
      'modified',
    )
    expect(screen.queryByTestId('code-line-git-marker-3')).not.toBeInTheDocument()
  })

  it('does not render git line markers in image preview mode', () => {
    render(
      <CodeViewerPanel
        activeFile="images/sample.png"
        activeFileContent={null}
        activeFileImagePreview={{
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,AAAA',
        }}
        commentLineCounts={new Map()}
        gitLineMarkers={new Map([[1, 'added']])}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    expect(screen.getByTestId('code-viewer-image-preview')).toBeInTheDocument()
    expect(screen.queryByTestId('code-line-git-marker-1')).not.toBeInTheDocument()
  })

  it('copies active file path from header copy button', () => {
    const onRequestCopyRelativePath = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={onRequestCopyRelativePath}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Copy active file path',
      }),
    )

    expect(onRequestCopyRelativePath).toHaveBeenCalledWith('src/example.ts')
  })

  it('disables header copy button without active file', () => {
    render(
      <CodeViewerPanel
        activeFile={null}
        activeFileContent={null}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Copy active file path',
      }),
    ).toBeDisabled()
  })

  it('shows hover popover on comment badge and closes on escape', () => {
    const commentsForLine: readonly CodeComment[] = [
      {
        id: 'c1',
        relativePath: 'src/example.ts',
        startLine: 2,
        endLine: 2,
        body: 'First comment body',
        anchor: { snippet: 'line2', hash: 'a1' },
        createdAt: '2026-02-22T00:00:00.000Z',
      },
      {
        id: 'c2',
        relativePath: 'src/example.ts',
        startLine: 2,
        endLine: 2,
        body: 'Second comment body',
        anchor: { snippet: 'line2', hash: 'a2' },
        createdAt: '2026-02-22T00:01:00.000Z',
      },
      {
        id: 'c3',
        relativePath: 'src/example.ts',
        startLine: 2,
        endLine: 2,
        body: 'Third comment body',
        anchor: { snippet: 'line2', hash: 'a3' },
        createdAt: '2026-02-22T00:02:00.000Z',
      },
      {
        id: 'c4',
        relativePath: 'src/example.ts',
        startLine: 2,
        endLine: 2,
        body: 'Fourth comment body',
        anchor: { snippet: 'line2', hash: 'a4' },
        createdAt: '2026-02-22T00:03:00.000Z',
      },
    ]

    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        activeFileImagePreview={null}
        commentLineCounts={new Map([[2, 4]])}
        commentLineEntries={new Map([[2, commentsForLine]])}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    fireEvent.mouseEnter(screen.getByTestId('code-line-comment-badge-2'))

    expect(screen.getByRole('dialog', { name: 'Comment previews' })).toHaveTextContent(
      'Comments on line 2',
    )
    expect(screen.getByText('First comment body')).toBeInTheDocument()
    expect(screen.getByText('+1 more')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(
      screen.queryByRole('dialog', { name: 'Comment previews' }),
    ).not.toBeInTheDocument()
  })

  it('closes hover popover after leaving hover popover area', () => {
    vi.useFakeTimers()
    try {
      const commentsForLine: readonly CodeComment[] = [
        {
          id: 'c1',
          relativePath: 'src/example.ts',
          startLine: 2,
          endLine: 2,
          body: 'Comment for leave test',
          anchor: { snippet: 'line2', hash: 'a1' },
          createdAt: '2026-02-22T00:00:00.000Z',
        },
      ]

      render(
        <CodeViewerPanel
          activeFile="src/example.ts"
          activeFileContent={'line1\nline2\nline3'}
          activeFileImagePreview={null}
          commentLineCounts={new Map([[2, 1]])}
          commentLineEntries={new Map([[2, commentsForLine]])}
          isReadingFile={false}
          jumpRequest={null}
          onRequestCopyBoth={() => undefined}
          onRequestAddComment={() => undefined}
          onRequestCopyRelativePath={() => undefined}
          onRequestCopySelectedContent={() => undefined}
          onSelectRange={() => undefined}
          previewUnavailableReason={null}
          readFileError={null}
          selectionRange={null}
        />,
      )

      fireEvent.mouseEnter(screen.getByTestId('code-line-comment-badge-2'))
      const hoverPopover = screen.getByRole('dialog', { name: 'Comment previews' })
      expect(hoverPopover).toBeInTheDocument()

      fireEvent.mouseOut(hoverPopover)
      act(() => {
        vi.advanceTimersByTime(140)
      })
      expect(
        screen.queryByRole('dialog', { name: 'Comment previews' }),
      ).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('scrolls to requested line when jump request is provided', () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
    const scrollIntoViewMock = vi.fn()
    try {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: scrollIntoViewMock,
      })

      render(
        <CodeViewerPanel
          activeFile="src/example.ts"
          activeFileContent={'line1\nline2\nline3\nline4\nline5'}
          activeFileImagePreview={null}
          commentLineCounts={new Map()}
          isReadingFile={false}
          jumpRequest={{
            targetRelativePath: 'src/example.ts',
            lineNumber: 4,
            token: 1,
          }}
          onRequestCopyBoth={() => undefined}
          onRequestAddComment={() => undefined}
          onRequestCopyRelativePath={() => undefined}
          onRequestCopySelectedContent={() => undefined}
          onSelectRange={() => undefined}
          previewUnavailableReason={null}
          readFileError={null}
          selectionRange={{
            startLine: 4,
            endLine: 4,
          }}
        />,
      )

      expect(scrollIntoViewMock).toHaveBeenCalled()
      expect(screen.getByTestId('code-line-4').closest('li')).toHaveClass(
        'is-selected',
      )
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView,
      })
    }
  })

  it('supports drag selection across lines and keeps shift-click selection behavior', () => {
    const onSelectRange = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={onSelectRange}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    fireEvent.mouseDown(screen.getByTestId('code-line-1'), { button: 0 })
    fireEvent.mouseEnter(screen.getByTestId('code-line-3'), { buttons: 1 })
    fireEvent.mouseUp(window)

    expect(onSelectRange).toHaveBeenCalledWith({
      startLine: 1,
      endLine: 3,
    })

    fireEvent.click(screen.getByTestId('code-line-1'))
    fireEvent.click(screen.getByTestId('code-line-3'), { shiftKey: true })

    expect(onSelectRange).toHaveBeenCalledWith({
      startLine: 1,
      endLine: 1,
    })
    expect(onSelectRange).toHaveBeenCalledWith({
      startLine: 1,
      endLine: 3,
    })
  })

  it('keeps selection when context-menu opens inside selected range and supports Copy Selected Content / Copy Both', () => {
    const onSelectRange = vi.fn()
    const onRequestCopyRelativePath = vi.fn()
    const onRequestCopySelectedContent = vi.fn()
    const onRequestCopyBoth = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={onRequestCopyBoth}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={onRequestCopyRelativePath}
        onRequestCopySelectedContent={onRequestCopySelectedContent}
        onSelectRange={onSelectRange}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={{
          startLine: 2,
          endLine: 3,
        }}
      />,
    )

    fireEvent.contextMenu(screen.getByTestId('code-line-3'), {
      clientX: 120,
      clientY: 160,
    })

    expect(screen.getByRole('dialog', { name: 'Copy actions' })).toBeInTheDocument()
    expect(onSelectRange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Copy Selected Content' }))

    expect(onRequestCopySelectedContent).toHaveBeenCalledWith({
      relativePath: 'src/example.ts',
      content: 'line1\nline2\nline3',
      selectionRange: {
        startLine: 2,
        endLine: 3,
      },
    })

    fireEvent.contextMenu(screen.getByTestId('code-line-3'), {
      clientX: 120,
      clientY: 160,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Both' }))

    expect(onRequestCopyBoth).toHaveBeenCalledWith({
      relativePath: 'src/example.ts',
      content: 'line1\nline2\nline3',
      selectionRange: {
        startLine: 2,
        endLine: 3,
      },
    })
    expect(onRequestCopyRelativePath).not.toHaveBeenCalled()
  })

  it('opens Add Comment action from context menu with selected range', () => {
    const onRequestAddComment = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestAddComment={onRequestAddComment}
        onRequestCopyBoth={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={{
          startLine: 2,
          endLine: 3,
        }}
      />,
    )

    fireEvent.contextMenu(screen.getByTestId('code-line-3'), {
      clientX: 100,
      clientY: 120,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'src/example.ts',
      content: 'line1\nline2\nline3',
      selectionRange: {
        startLine: 2,
        endLine: 3,
      },
    })
  })

  it('renders count badges for commented lines', () => {
    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        activeFileImagePreview={null}
        commentLineCounts={
          new Map<number, number>([
            [1, 2],
            [3, 1],
          ])
        }
        isReadingFile={false}
        jumpRequest={null}
        onRequestAddComment={() => undefined}
        onRequestCopyBoth={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    expect(screen.getByTestId('code-line-comment-badge-1')).toHaveTextContent('2')
    expect(screen.getByTestId('code-line-comment-badge-3')).toHaveTextContent('1')
    expect(
      screen.queryByTestId('code-line-comment-badge-2'),
    ).not.toBeInTheDocument()
  })

  it('switches to single-line selection when context-menu opens outside selection and requests relative path copy', () => {
    const onSelectRange = vi.fn()
    const onRequestCopyRelativePath = vi.fn()
    const onRequestCopySelectedContent = vi.fn()
    const onRequestCopyBoth = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={onRequestCopyBoth}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={onRequestCopyRelativePath}
        onRequestCopySelectedContent={onRequestCopySelectedContent}
        onSelectRange={onSelectRange}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={{
          startLine: 2,
          endLine: 3,
        }}
      />,
    )

    fireEvent.contextMenu(screen.getByTestId('code-line-1'), {
      clientX: 80,
      clientY: 110,
    })

    expect(onSelectRange).toHaveBeenCalledWith({
      startLine: 1,
      endLine: 1,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))

    expect(onRequestCopyRelativePath).toHaveBeenCalledWith('src/example.ts')
    expect(onRequestCopySelectedContent).not.toHaveBeenCalled()
    expect(onRequestCopyBoth).not.toHaveBeenCalled()
  })

  it('does not recompute highlighted lines when only selection changes', async () => {
    const highlightPreviewLinesSpy = vi
      .spyOn(syntaxHighlight, 'highlightPreviewLines')
      .mockResolvedValue(['line1', 'line2', 'line3'])

    const { rerender } = render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={{
          startLine: 1,
          endLine: 1,
        }}
      />,
    )

    await waitFor(() => {
      expect(highlightPreviewLinesSpy).toHaveBeenCalledTimes(1)
    })

    rerender(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={{
          startLine: 1,
          endLine: 3,
        }}
      />,
    )

    expect(highlightPreviewLinesSpy).toHaveBeenCalledTimes(1)
  })

  it('renders image preview mode and hides text line interactions', () => {
    const onRequestCopyRelativePath = vi.fn()
    const onRequestCopySelectedContent = vi.fn()
    const onRequestCopyBoth = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="assets/demo.png"
        activeFileContent={null}
        activeFileImagePreview={{
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,AA==',
        }}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={onRequestCopyBoth}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={onRequestCopyRelativePath}
        onRequestCopySelectedContent={onRequestCopySelectedContent}
        onSelectRange={() => undefined}
        previewUnavailableReason={null}
        readFileError={null}
        selectionRange={null}
      />,
    )

    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: image',
    )
    const image = screen.getByRole('img', {
      name: 'Image preview for assets/demo.png',
    })
    expect(image).toHaveAttribute('src', 'data:image/png;base64,AA==')
    expect(screen.queryByTestId('code-viewer-content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('code-line-1')).not.toBeInTheDocument()
  })

  it('shows blocked preview unavailable state', () => {
    render(
      <CodeViewerPanel
        activeFile="assets/vector.svg"
        activeFileContent={null}
        activeFileImagePreview={null}
        commentLineCounts={new Map()}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
        onRequestAddComment={() => undefined}
        onRequestCopyRelativePath={() => undefined}
        onRequestCopySelectedContent={() => undefined}
        onSelectRange={() => undefined}
        previewUnavailableReason="blocked_resource"
        readFileError={null}
        selectionRange={null}
      />,
    )

    expect(screen.getByTestId('code-viewer-preview-unavailable')).toHaveTextContent(
      'Preview unavailable: blocked resource by policy.',
    )
  })
})

// ---------------------------------------------------------------------------
// F21: 텍스트 검색
// ---------------------------------------------------------------------------

const defaultSearchProps = {
  activeFile: 'src/example.ts',
  activeFileContent: 'const foo = 1\nconst bar = 2\nfoo.call(bar)\nconst baz = 3',
  activeFileImagePreview: null,
  commentLineCounts: new Map(),
  isReadingFile: false,
  jumpRequest: null,
  onRequestCopyBoth: () => undefined,
  onRequestAddComment: () => undefined,
  onRequestCopyRelativePath: () => undefined,
  onRequestCopySelectedContent: () => undefined,
  onSelectRange: () => undefined,
  previewUnavailableReason: null,
  readFileError: null,
  selectionRange: null,
} as const

describe('CodeViewerPanel search', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('does not show search bar by default', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    expect(screen.queryByTestId('code-viewer-search-bar')).not.toBeInTheDocument()
  })

  it('opens search bar on Ctrl+F', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    expect(screen.getByTestId('code-viewer-search-bar')).toBeInTheDocument()
  })

  it('opens search bar on Meta+F (Cmd+F)', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', metaKey: true })
    expect(screen.getByTestId('code-viewer-search-bar')).toBeInTheDocument()
  })

  it('highlights matching lines on query input', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    // lines 1 and 3 contain 'foo'
    expect(screen.getByTestId('code-line-1').closest('.code-line-row')).toHaveClass(
      'is-search-match',
    )
    expect(screen.getByTestId('code-line-3').closest('.code-line-row')).toHaveClass(
      'is-search-match',
    )
    expect(screen.getByTestId('code-line-2').closest('.code-line-row')).not.toHaveClass(
      'is-search-match',
    )
  })

  it('shows match count in N / M format', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    // 'foo' matches lines 1 and 3
    expect(screen.getByTestId('code-viewer-search-count')).toHaveTextContent('1 / 2')
  })

  it('shows No results when there are no matches', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'zzznomatch' },
    })
    expect(screen.getByTestId('code-viewer-search-count')).toHaveTextContent('No results')
  })

  it('applies is-search-focus to the current focus match line', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    // first match (line 1) should be focused
    expect(screen.getByTestId('code-line-1').closest('.code-line-row')).toHaveClass(
      'is-search-focus',
    )
    expect(screen.getByTestId('code-line-3').closest('.code-line-row')).not.toHaveClass(
      'is-search-focus',
    )
  })

  it('moves to next match on next button click', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    // initially focused on line 1 (index 0)
    fireEvent.click(screen.getByTestId('code-viewer-search-next'))
    // now focused on line 3 (index 1, the 2nd match)
    expect(screen.getByTestId('code-viewer-search-count')).toHaveTextContent('2 / 2')
    expect(screen.getByTestId('code-line-3').closest('.code-line-row')).toHaveClass(
      'is-search-focus',
    )
  })

  it('moves to prev match on prev button click', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    // advance to second match first
    fireEvent.click(screen.getByTestId('code-viewer-search-next'))
    // then go back
    fireEvent.click(screen.getByTestId('code-viewer-search-prev'))
    expect(screen.getByTestId('code-viewer-search-count')).toHaveTextContent('1 / 2')
    expect(screen.getByTestId('code-line-1').closest('.code-line-row')).toHaveClass(
      'is-search-focus',
    )
  })

  it('wraps around to first match after last on next click', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    // advance to last match (line 3)
    fireEvent.click(screen.getByTestId('code-viewer-search-next'))
    // wrap: next from last → first
    fireEvent.click(screen.getByTestId('code-viewer-search-next'))
    expect(screen.getByTestId('code-viewer-search-count')).toHaveTextContent('1 / 2')
  })

  it('wraps around to last match before first on prev click', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    // at first match, go prev → should wrap to last
    fireEvent.click(screen.getByTestId('code-viewer-search-prev'))
    expect(screen.getByTestId('code-viewer-search-count')).toHaveTextContent('2 / 2')
  })

  it('moves to next match on Enter in search input', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    fireEvent.keyDown(screen.getByTestId('code-viewer-search-input'), { key: 'Enter' })
    expect(screen.getByTestId('code-viewer-search-count')).toHaveTextContent('2 / 2')
  })

  it('moves to prev match on Shift+Enter in search input', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    fireEvent.keyDown(screen.getByTestId('code-viewer-search-input'), {
      key: 'Enter',
      shiftKey: true,
    })
    expect(screen.getByTestId('code-viewer-search-count')).toHaveTextContent('2 / 2')
  })

  it('closes search bar on Escape in search input', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    expect(screen.getByTestId('code-viewer-search-bar')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByTestId('code-viewer-search-input'), { key: 'Escape' })
    expect(screen.queryByTestId('code-viewer-search-bar')).not.toBeInTheDocument()
  })

  it('closes search bar on close button click', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.click(screen.getByTestId('code-viewer-search-close'))
    expect(screen.queryByTestId('code-viewer-search-bar')).not.toBeInTheDocument()
  })

  it('clears search highlights after closing the search bar', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    fireEvent.click(screen.getByTestId('code-viewer-search-close'))
    expect(screen.getByTestId('code-line-1').closest('.code-line-row')).not.toHaveClass(
      'is-search-match',
    )
  })

  it('resets search state when activeFile changes', () => {
    const { rerender } = render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'foo' },
    })
    expect(screen.getByTestId('code-viewer-search-bar')).toBeInTheDocument()
    rerender(
      <CodeViewerPanel
        {...defaultSearchProps}
        activeFile="src/other.ts"
        activeFileContent="other content"
      />,
    )
    expect(screen.queryByTestId('code-viewer-search-bar')).not.toBeInTheDocument()
  })

  it('does not show search bar in image preview mode', () => {
    render(
      <CodeViewerPanel
        {...defaultSearchProps}
        activeFile="images/photo.png"
        activeFileContent={null}
        activeFileImagePreview={{
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,AAAA',
        }}
      />,
    )
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    expect(screen.queryByTestId('code-viewer-search-bar')).not.toBeInTheDocument()
  })

  it('is case-insensitive when searching', () => {
    render(<CodeViewerPanel {...defaultSearchProps} />)
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    fireEvent.change(screen.getByTestId('code-viewer-search-input'), {
      target: { value: 'FOO' },
    })
    expect(screen.getByTestId('code-line-1').closest('.code-line-row')).toHaveClass(
      'is-search-match',
    )
  })
})
