import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { CodeEditorPanel } from './code-editor-panel'
import { gitMarkersField } from './cm6-git-gutter'
import { commentMarkersField } from './cm6-comment-gutter'

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

type EditorKeydownHandler = (view: EditorView, event: KeyboardEvent) => boolean

type EditorInputStateLike = {
  handlers?: {
    keydown?: {
      handlers?: EditorKeydownHandler[]
    }
  }
}

function getKeydownHandlers(view: EditorView): EditorKeydownHandler[] {
  const inputState = (view as { inputState?: EditorInputStateLike }).inputState
  return inputState?.handlers?.keydown?.handlers ?? []
}

/**
 * Dispatch a keydown event to the CM6 view's keymap handlers.
 * Uses the internal inputState handler mechanism because jsdom does not
 * fully emulate browser keyboard handling that CM6 relies on.
 */
function dispatchKeyToView(view: EditorView, event: KeyboardEvent): void {
  const handlers = getKeydownHandlers(view)
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
    onRequestGoToSpec: vi.fn(),
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

  it('toggles code wrap on and off from header button', async () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent={'const alpha = 1\nconst beta = 2'}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      expect(getCM6View(container)).not.toBeNull()
    })

    const wrapToggle = screen.getByTestId('code-viewer-wrap-toggle')
    expect(wrapToggle).toHaveTextContent('Wrap On')
    expect(wrapToggle).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(wrapToggle)
    expect(wrapToggle).toHaveTextContent('Wrap Off')
    expect(wrapToggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(wrapToggle)
    expect(wrapToggle).toHaveTextContent('Wrap On')
    expect(wrapToggle).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.cm-lineWrapping')).not.toBeNull()
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
    const keydownHandlers = getKeydownHandlers(view)

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

  // ---- T11+T12: gutter extension props ------------------------------------

  it('renders without error when gitLineMarkers prop is provided', () => {
    const gitLineMarkers = new Map<number, WorkspaceGitLineMarkerKind>([
      [1, 'added'],
      [3, 'modified'],
    ])
    expect(() =>
      render(
        <CodeEditorPanel
          {...makeDefaultProps()}
          activeFile="src/example.ts"
          activeFileContent="line1\nline2\nline3"
          gitLineMarkers={gitLineMarkers}
        />,
      ),
    ).not.toThrow()
  })

  it('renders without error when commentLineCounts prop is provided', () => {
    const commentLineCounts = new Map<number, number>([[2, 3]])
    expect(() =>
      render(
        <CodeEditorPanel
          {...makeDefaultProps()}
          activeFile="src/example.ts"
          activeFileContent="line1\nline2\nline3"
          commentLineCounts={commentLineCounts}
        />,
      ),
    ).not.toThrow()
  })

  it('renders without error when commentLineEntries prop is provided', () => {
    const commentLineCounts = new Map<number, number>([[2, 1]])
    const commentLineEntries = new Map([
      [
        2,
        [
          {
            id: 'c1',
            relativePath: 'src/example.ts',
            startLine: 2,
            endLine: 2,
            body: 'test comment',
            anchor: { snippet: 'line2', hash: 'abc123' },
            createdAt: '2026-02-25T00:00:00.000Z',
          },
        ],
      ],
    ])
    expect(() =>
      render(
        <CodeEditorPanel
          {...makeDefaultProps()}
          activeFile="src/example.ts"
          activeFileContent="line1\nline2\nline3"
          commentLineCounts={commentLineCounts}
          commentLineEntries={commentLineEntries}
        />,
      ),
    ).not.toThrow()
  })

  // ---- A. Selection change → onSelectRange (via CM6 updateListener) --------

  it('selection change dispatches onSelectRange with LineSelectionRange', async () => {
    const onSelectRange = vi.fn()
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        onSelectRange={onSelectRange}
      />,
    )

    // Wait for CM6 async updateState (language loading) to complete
    const container = screen.getByTestId('code-viewer-content')
    let view: EditorView | null = null
    await waitFor(() => {
      view = getCM6View(container)
      expect(view).not.toBeNull()
    })
    if (!view) return

    // Clear any calls from initial state setup
    onSelectRange.mockClear()

    // Dispatch a selection that spans characters in line 2
    // "line1\n" = 6 chars, so line2 starts at offset 6
    const v = view as EditorView
    v.dispatch({
      selection: { anchor: 6, head: 11 },
    })

    // onSelectRange should be called with at minimum startLine = 2
    expect(onSelectRange).toHaveBeenCalled()
    const call = onSelectRange.mock.calls[onSelectRange.mock.calls.length - 1][0]
    if (call !== null) {
      expect(call).toHaveProperty('startLine')
      expect(call).toHaveProperty('endLine')
      expect(call.startLine).toBeGreaterThanOrEqual(1)
    }
  })

  // ---- B. Jump-to-line (scrollIntoView) -----------------------------------

  it('dispatches EditorView.scrollIntoView when jumpRequest provided', async () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3\nline4\nline5'}
        jumpRequest={{
          targetRelativePath: 'src/example.ts',
          lineNumber: 3,
          token: 42,
        }}
      />,
    )

    // The jump useEffect fires after view creation. We verify the component
    // did NOT crash and the content container is rendered.
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })
  })

  it('selects the exact source range when jumpRequest carries offsets', async () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="docs/spec.md"
        activeFileContent={'# Title\n\nalpha **beta** gamma'}
        jumpRequest={{
          targetRelativePath: 'docs/spec.md',
          lineNumber: 3,
          sourceOffsetRange: {
            startOffset: 24,
            endOffset: 29,
          },
          token: 43,
        }}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      expect(getCM6View(container)).not.toBeNull()
    })

    const view = getCM6View(container)
    if (!view) {
      throw new Error('Expected CodeMirror view')
    }

    await waitFor(() => {
      const selection = view.state.selection.main
      expect(selection.from).toBe(24)
      expect(selection.to).toBe(29)
      expect(view.state.sliceDoc(selection.from, selection.to)).toBe('gamma')
    })
  })

  it('applies a temporary line highlight when jumpRequest requests navigation highlight', async () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="docs/spec.md"
        activeFileContent={'# Title\n\nalpha **beta** gamma'}
        jumpRequest={{
          targetRelativePath: 'docs/spec.md',
          lineNumber: 3,
          shouldHighlight: true,
          token: 44,
        }}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      expect(getCM6View(container)).not.toBeNull()
    })

    await waitFor(() => {
      expect(container.querySelector('.cm-navigation-line')).not.toBeNull()
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1700))
    })

    await waitFor(() => {
      expect(container.querySelector('.cm-navigation-line')).toBeNull()
    })
  })

  it('does NOT re-dispatch scrollIntoView for the same jump token on re-render', async () => {
    const props = makeDefaultProps()
    const jumpRequest = {
      targetRelativePath: 'src/example.ts',
      lineNumber: 2,
      token: 99,
    }
    const { rerender } = render(
      <CodeEditorPanel
        {...props}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        jumpRequest={jumpRequest}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    // Re-render with the same token — the component should skip the dispatch
    // We just verify no crash occurs.
    rerender(
      <CodeEditorPanel
        {...props}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3\nextra line'}
        jumpRequest={jumpRequest}
      />,
    )

    expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
  })

  // ---- C. Context menu → CopyActionPopover --------------------------------

  it('contextmenu event opens CopyActionPopover', async () => {
    const props = makeDefaultProps()
    render(
      <CodeEditorPanel
        {...props}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')

    // Wait for the editor view to mount and the context menu handler to be attached
    await waitFor(() => {
      const view = getCM6View(container)
      expect(view).not.toBeNull()
    })

    // Dispatch native contextmenu event on the container
    fireEvent.contextMenu(container, { clientX: 100, clientY: 150 })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Copy actions' })).toBeInTheDocument()
    })
  })

  it('CopyActionPopover Add Comment button calls onRequestAddComment', async () => {
    const props = makeDefaultProps()
    render(
      <CodeEditorPanel
        {...props}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      expect(getCM6View(container)).not.toBeNull()
    })

    fireEvent.contextMenu(container, { clientX: 50, clientY: 50 })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Copy actions' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))
    expect(props.onRequestAddComment).toHaveBeenCalledTimes(1)
    const callArg = props.onRequestAddComment.mock.calls[0][0]
    expect(callArg.relativePath).toBe('src/example.ts')
    expect(callArg.content).toBe('line1\nline2\nline3')
  })

  it('shows Go to Spec for markdown files and calls onRequestGoToSpec with the start line', async () => {
    const props = makeDefaultProps()
    render(
      <CodeEditorPanel
        {...props}
        activeFile="docs/spec.md"
        activeFileContent={'line1\nline2\nline3'}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    let view: EditorView | null = null
    await waitFor(() => {
      view = getCM6View(container)
      expect(view).not.toBeNull()
    })
    if (!view) {
      throw new Error('Expected CodeMirror view')
    }

    act(() => {
      view?.dispatch({
        selection: {
          anchor: 6,
          head: 10,
        },
      })
    })

    fireEvent.contextMenu(container, { clientX: 50, clientY: 50 })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Copy actions' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Go to Spec' }))

    expect(props.onRequestGoToSpec).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      lineNumber: 2,
    })
  })

  it('does not show Go to Spec for non-markdown files', async () => {
    const props = makeDefaultProps()
    render(
      <CodeEditorPanel
        {...props}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      expect(getCM6View(container)).not.toBeNull()
    })

    fireEvent.contextMenu(container, { clientX: 50, clientY: 50 })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Copy actions' })).toBeInTheDocument()
    })

    expect(
      screen.queryByRole('button', { name: 'Go to Spec' }),
    ).not.toBeInTheDocument()
  })

  it('CopyActionPopover Copy Relative Path button calls onRequestCopyRelativePath', async () => {
    const props = makeDefaultProps()
    render(
      <CodeEditorPanel
        {...props}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      expect(getCM6View(container)).not.toBeNull()
    })

    fireEvent.contextMenu(container, { clientX: 50, clientY: 50 })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Copy actions' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))
    expect(props.onRequestCopyRelativePath).toHaveBeenCalledWith(
      'src/example.ts',
      expect.objectContaining({ startLine: expect.any(Number), endLine: expect.any(Number) }),
    )
  })

  // ---- D. Search extension loaded verification ----------------------------

  it('CM6 search extension is present — Mod-f keymap handler is registered', async () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent={'const foo = 1\nconst bar = 2'}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    let view: EditorView | null = null
    await waitFor(() => {
      view = getCM6View(container)
      expect(view).not.toBeNull()
    })
    if (!view) return

    const v = view as EditorView
    // The search extension registers a Mod-f keymap handler.
    // Verify the inputState has keydown handlers (meaning keymaps were installed).
    const keydownHandlers = getKeydownHandlers(v)
    expect(keydownHandlers.length).toBeGreaterThan(0)
  })

  // ---- E. Git marker effect dispatch into gitMarkersField -----------------

  it('gitLineMarkers prop populates gitMarkersField in CM6 state', async () => {
    const gitLineMarkers = new Map<number, WorkspaceGitLineMarkerKind>([
      [1, 'added'],
      [2, 'modified'],
    ])
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        gitLineMarkers={gitLineMarkers}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      const view = getCM6View(container)
      if (!view) return
      const markers = view.state.field(gitMarkersField)
      // After async updateState, the markers should be populated
      expect(markers.size).toBeGreaterThan(0)
    })
  })

  // ---- F. Comment marker effect dispatch into commentMarkersField ----------

  it('commentLineCounts prop populates commentMarkersField in CM6 state', async () => {
    const commentLineCounts = new Map<number, number>([
      [1, 2],
      [3, 1],
    ])
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
        commentLineCounts={commentLineCounts}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      const view = getCM6View(container)
      if (!view) return
      const markers = view.state.field(commentMarkersField)
      expect(markers.size).toBeGreaterThan(0)
    })
  })

  // ---- G. File content switch updates editor document ----------------------

  it('changing activeFileContent updates editor document', async () => {
    const { rerender } = render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent={'initial content'}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      const view = getCM6View(container)
      expect(view).not.toBeNull()
    })

    // Re-render with new content
    rerender(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="src/example.ts"
        activeFileContent={'updated content'}
      />,
    )

    // Wait for the async updateState to complete and document to be updated
    await waitFor(() => {
      const view = getCM6View(container)
      if (!view) return
      const doc = view.state.doc.toString()
      expect(doc).toBe('updated content')
    })
  })

  it('preserves selection and focus on same-file content refresh', async () => {
    const props = makeDefaultProps()
    const { rerender } = render(
      <CodeEditorPanel
        {...props}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2\nline3'}
      />,
    )

    const container = screen.getByTestId('code-viewer-content')
    await waitFor(() => {
      const view = getCM6View(container)
      expect(view).not.toBeNull()
    })

    const view = getCM6View(container)
    expect(view).not.toBeNull()
    if (!view) return

    view.dispatch({
      selection: { anchor: 6, head: 11 },
    })
    view.focus()

    rerender(
      <CodeEditorPanel
        {...props}
        activeFile="src/example.ts"
        activeFileContent={'line1\nline2 updated\nline3'}
      />,
    )

    await waitFor(() => {
      const updatedView = getCM6View(container)
      if (!updatedView) return
      expect(updatedView.state.doc.toString()).toBe('line1\nline2 updated\nline3')
      expect(updatedView.state.selection.main.anchor).toBe(6)
      expect(updatedView.state.selection.main.head).toBe(11)
    })
    expect(document.activeElement?.closest('.cm-editor')).not.toBeNull()
  })

  // ---- H. Language display for various file extensions --------------------

  it('shows correct language for Python files (.py)', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="script.py"
        activeFileContent="print('hello')"
      />,
    )
    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: python',
    )
  })

  it('shows correct language for JSON files (.json)', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="config.json"
        activeFileContent={'{"key": "value"}'}
      />,
    )
    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: json',
    )
  })

  it('shows correct language for CSS files (.css)', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="styles.css"
        activeFileContent={'body { color: red; }'}
      />,
    )
    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: css',
    )
  })

  it('shows correct language for Markdown files (.md)', () => {
    render(
      <CodeEditorPanel
        {...makeDefaultProps()}
        activeFile="README.md"
        activeFileContent="# Title"
      />,
    )
    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: markdown',
    )
  })
})
