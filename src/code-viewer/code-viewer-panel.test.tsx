import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeViewerPanel } from './code-viewer-panel'
import * as syntaxHighlight from './syntax-highlight'

describe('CodeViewerPanel highlighting', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('uses python highlighting for .py files and keeps line selection', () => {
    const onSelectRange = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="tools/example.py"
        activeFileContent={'def hello():\n    return 1'}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
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
    expect(firstLine?.innerHTML).toContain('token keyword')

    fireEvent.click(screen.getByTestId('code-line-2'))
    expect(onSelectRange).toHaveBeenCalledWith({
      startLine: 2,
      endLine: 2,
    })
  })

  it('falls back to plaintext highlighting for unknown extensions', () => {
    render(
      <CodeViewerPanel
        activeFile="logs/runtime.log"
        activeFileContent={'plain text line'}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
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
          isReadingFile={false}
          jumpRequest={{
            targetRelativePath: 'src/example.ts',
            lineNumber: 4,
            token: 1,
          }}
          onRequestCopyBoth={() => undefined}
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
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
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
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={onRequestCopyBoth}
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

  it('switches to single-line selection when context-menu opens outside selection and requests relative path copy', () => {
    const onSelectRange = vi.fn()
    const onRequestCopyRelativePath = vi.fn()
    const onRequestCopySelectedContent = vi.fn()
    const onRequestCopyBoth = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={onRequestCopyBoth}
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

  it('does not recompute highlighted lines when only selection changes', () => {
    const highlightPreviewLinesSpy = vi.spyOn(
      syntaxHighlight,
      'highlightPreviewLines',
    )

    const { rerender } = render(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
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

    expect(highlightPreviewLinesSpy).toHaveBeenCalledTimes(1)

    rerender(
      <CodeViewerPanel
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        isReadingFile={false}
        jumpRequest={null}
        onRequestCopyBoth={() => undefined}
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
})
