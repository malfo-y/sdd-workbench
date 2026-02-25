import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeEditorPanel } from './code-editor-panel'

// ---------------------------------------------------------------------------
// Default props factory
// ---------------------------------------------------------------------------

function makeDefaultProps() {
  return {
    activeFile: null as string | null,
    activeFileContent: null as string | null,
    activeFileImagePreview: null as WorkspaceImagePreview | null,
    isReadingFile: false,
    readFileError: null as string | null,
    previewUnavailableReason: null as WorkspacePreviewUnavailableReason | null,
    selectionRange: null,
    jumpRequest: null,
    onSelectRange: vi.fn(),
    onRequestCopyRelativePath: vi.fn(),
    onRequestCopySelectedContent: vi.fn(),
    onRequestCopyBoth: vi.fn(),
    onRequestAddComment: vi.fn(),
    commentLineCounts: new Map<number, number>(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CodeEditorPanel', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // ---- Fallback UI states ------------------------------------------------

  it('shows empty state when no active file', () => {
    render(<CodeEditorPanel {...makeDefaultProps()} />)
    expect(screen.getByTestId('code-viewer-empty')).toHaveTextContent(
      'Select a file to preview its content.',
    )
  })

  it('shows loading state when reading file', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        isReadingFile={true}
      />,
    )
    expect(screen.getByTestId('code-viewer-loading')).toHaveTextContent(
      'Loading file preview...',
    )
  })

  it('shows error state when file read fails', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        readFileError="Failed to read file"
      />,
    )
    expect(screen.getByTestId('code-viewer-error')).toHaveTextContent(
      'Failed to read file',
    )
  })

  it('shows preview unavailable for binary file', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="assets/binary.bin"
        previewUnavailableReason="binary_file"
      />,
    )
    expect(screen.getByTestId('code-viewer-preview-unavailable')).toHaveTextContent(
      'Preview unavailable: binary file detected.',
    )
  })

  it('shows preview unavailable for too large file', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="assets/large.bin"
        previewUnavailableReason="file_too_large"
      />,
    )
    expect(screen.getByTestId('code-viewer-preview-unavailable')).toHaveTextContent(
      'Preview unavailable: file exceeds 2MB limit.',
    )
  })

  it('shows preview unavailable for blocked resource', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="assets/blocked.svg"
        previewUnavailableReason="blocked_resource"
      />,
    )
    expect(screen.getByTestId('code-viewer-preview-unavailable')).toHaveTextContent(
      'Preview unavailable: blocked resource by policy.',
    )
  })

  it('shows image preview when image data is provided', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="images/photo.png"
        activeFileImagePreview={{
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,AAAA',
        }}
      />,
    )
    expect(screen.getByTestId('code-viewer-image-preview')).toBeInTheDocument()
    const image = screen.getByRole('img', {
      name: 'Image preview for images/photo.png',
    })
    expect(image).toHaveAttribute('src', 'data:image/png;base64,AAAA')
  })

  // ---- Header display ----------------------------------------------------

  it('shows "No active file" when no file is selected', () => {
    render(<CodeEditorPanel {...makeDefaultProps()} />)
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
      'No active file',
    )
  })

  it('displays active file path in the header', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/main.ts"
        activeFileContent="const x = 1"
      />,
    )
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
      'src/main.ts',
    )
  })

  it('shows selection range in header', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/main.ts"
        activeFileContent="line1\nline2\nline3"
        selectionRange={{ startLine: 2, endLine: 3 }}
      />,
    )
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L2-L3',
    )
  })

  it('shows "Selection: none" when there is no selection', () => {
    render(<CodeEditorPanel {...makeDefaultProps()} />)
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: none',
    )
  })

  it('shows language display for image preview mode', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="images/photo.png"
        activeFileImagePreview={{
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,AAAA',
        }}
      />,
    )
    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: image',
    )
  })

  // ---- Copy path button --------------------------------------------------

  it('copies active file path from header copy button', () => {
    const props = makeDefaultProps()
    render(
      <CodeEditorPanel
        {...props}
        activeFile="src/example.ts"
        activeFileContent="line1"
      />,
    )
    const button = screen.getByRole('button', { name: 'Copy active file path' })
    button.click()
    expect(props.onRequestCopyRelativePath).toHaveBeenCalledWith('src/example.ts')
  })

  it('disables header copy button without active file', () => {
    render(<CodeEditorPanel {...makeDefaultProps()} />)
    expect(
      screen.getByRole('button', { name: 'Copy active file path' }),
    ).toBeDisabled()
  })

  // ---- CM6 container rendering -------------------------------------------

  it('renders CM6 editor container when text content is available', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent="const x = 1"
      />,
    )
    expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
  })

  it('does not render CM6 editor container when no content', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent={null}
        isReadingFile={true}
      />,
    )
    expect(screen.queryByTestId('code-viewer-content')).not.toBeInTheDocument()
  })

  it('does not render CM6 editor container in image preview mode', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="images/photo.png"
        activeFileImagePreview={{
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,AAAA',
        }}
      />,
    )
    expect(screen.queryByTestId('code-viewer-content')).not.toBeInTheDocument()
  })

  // ---- data-testid for panel wrapper ------------------------------------

  it('renders section with data-testid="code-viewer-panel"', () => {
    render(<CodeEditorPanel {...makeDefaultProps()} />)
    expect(screen.getByTestId('code-viewer-panel')).toBeInTheDocument()
  })
})
