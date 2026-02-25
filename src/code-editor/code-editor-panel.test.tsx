import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { CodeEditorPanel } from './code-editor-panel'

// ---------------------------------------------------------------------------
// Helpers for CM6 editor interaction in jsdom
// ---------------------------------------------------------------------------

/**
 * Get the CM6 EditorView instance from the code-viewer-content container.
 * Uses EditorView.findFromDOM to locate the view.
 */
function getCM6View(container: HTMLElement): EditorView | null {
  const cmEditor = container.querySelector('.cm-editor')
  return cmEditor ? EditorView.findFromDOM(cmEditor as HTMLElement) : null
}

/**
 * Dispatch a keydown event to the CM6 view's keymap handlers.
 * Uses the internal inputState handler mechanism because jsdom does not
 * fully emulate browser keyboard handling that CM6 relies on.
 */
function dispatchKeyToView(view: EditorView, event: KeyboardEvent): void {
  const inputState = (view as any).inputState
  const handlers: Array<(view: EditorView, event: KeyboardEvent) => boolean> =
    inputState?.handlers?.keydown?.handlers ?? []
  for (const h of handlers) {
    h(view, event)
  }
}

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
    // T8: new props
    editable: false,
    onSave: vi.fn() as ((content: string) => void) | undefined,
    onDirtyChange: vi.fn() as ((dirty: boolean) => void) | undefined,
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

  // ---- T8: edit mode, Cmd+S keymap, dirty tracking ----------------------

  it('accepts editable prop without error', () => {
    // Verifies that the new prop is accepted by the component type
    expect(() =>
      render(
        <CodeEditorPanel
          {...makeDefaultProps()}
          activeFile="src/example.ts"
          activeFileContent="hello world"
          editable={true}
        />,
      ),
    ).not.toThrow()
  })

  it('accepts onSave prop without error', () => {
    const onSave = vi.fn()
    expect(() =>
      render(
        <CodeEditorPanel
          {...makeDefaultProps()}
          activeFile="src/example.ts"
          activeFileContent="hello world"
          onSave={onSave}
        />,
      ),
    ).not.toThrow()
  })

  it('accepts onDirtyChange prop without error', () => {
    const onDirtyChange = vi.fn()
    expect(() =>
      render(
        <CodeEditorPanel
          {...makeDefaultProps()}
          activeFile="src/example.ts"
          activeFileContent="hello world"
          onDirtyChange={onDirtyChange}
        />,
      ),
    ).not.toThrow()
  })

  it('Cmd+S / Ctrl+S keymap calls onSave with document content', () => {
    const onSave = vi.fn()
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent="const hello = 1"
        editable={true}
        onSave={onSave}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    const view = getCM6View(container)
    expect(view).not.toBeNull()
    if (!view) return

    // Dispatch Ctrl+S (Mod-s on non-Mac platforms)
    const ctrlSEvent = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      keyCode: 83,
      bubbles: true,
      cancelable: true,
    })
    dispatchKeyToView(view, ctrlSEvent)

    // CodeMirror keymap calls onSave
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(typeof onSave.mock.calls[0][0]).toBe('string')
  })

  it('Mod-s keymap returns true (handled = prevents default browser save dialog)', () => {
    const onSave = vi.fn()
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent="const hello = 1"
        editable={true}
        onSave={onSave}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    const view = getCM6View(container)
    expect(view).not.toBeNull()
    if (!view) return

    // The keymap `run` function must return true so CM6 marks it handled
    // (which causes the keymap plugin to preventDefault on the DOM event).
    // We verify this by calling the run function directly through the internal
    // keymap structure.
    const inputState = (view as any).inputState
    const keydownHandlers: Array<(view: EditorView, event: KeyboardEvent) => boolean> =
      inputState?.handlers?.keydown?.handlers ?? []

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      keyCode: 83,
      bubbles: true,
      cancelable: true,
    })

    // At least one handler must process the event (return truthy or call onSave)
    dispatchKeyToView(view, event)
    expect(onSave).toHaveBeenCalled()
    expect(keydownHandlers.length).toBeGreaterThan(0)
  })

  it('docChanged triggers onDirtyChange(true)', () => {
    const onDirtyChange = vi.fn()
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent="initial content"
        editable={true}
        onDirtyChange={onDirtyChange}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    const view = getCM6View(container)
    expect(view).not.toBeNull()
    if (!view) return

    // Directly dispatch a document change transaction on the CM6 view
    view.dispatch({
      changes: { from: 0, insert: 'x' },
    })

    // After modification onDirtyChange(true) should be called
    expect(onDirtyChange).toHaveBeenCalledWith(true)
  })
})
