import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeViewerPanel } from './code-viewer-panel'

describe('CodeViewerPanel highlighting', () => {
  afterEach(() => {
    cleanup()
  })

  it('uses python highlighting for .py files and keeps line selection', () => {
    const onSelectRange = vi.fn()

    render(
      <CodeViewerPanel
        activeFile="tools/example.py"
        activeFileContent={'def hello():\n    return 1'}
        isReadingFile={false}
        jumpRequest={null}
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
})
