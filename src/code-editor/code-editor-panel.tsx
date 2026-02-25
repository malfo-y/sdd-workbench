import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { EditorView, lineNumbers, drawSelection, keymap } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { search, searchKeymap } from '@codemirror/search'
import { defaultKeymap } from '@codemirror/commands'
import type { LineSelectionRange } from '../workspace/workspace-model'
import type { WorkspaceGitLineMarkerKind } from '../workspace/workspace-model'
import type { CodeComment } from '../code-comments/comment-types'
import { darkTheme } from './cm6-dark-theme'
import { getCM6Language } from './cm6-language-map'
import { selectionToLineRange } from './cm6-selection-bridge'
import { CopyActionPopover } from '../context-menu/copy-action-popover'

export type CodeViewerJumpRequest = {
  targetRelativePath: string
  lineNumber: number
  token: number
}

type CodeEditorPanelProps = {
  activeFile: string | null
  activeFileContent: string | null
  activeFileImagePreview: WorkspaceImagePreview | null
  isReadingFile: boolean
  readFileError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  jumpRequest: CodeViewerJumpRequest | null
  onSelectRange: (range: LineSelectionRange | null) => void
  onRequestCopyRelativePath: (relativePath: string) => void
  onRequestCopySelectedContent: (input: {
    relativePath: string
    content: string
    selectionRange: LineSelectionRange
  }) => void
  onRequestCopyBoth: (input: {
    relativePath: string
    content: string
    selectionRange: LineSelectionRange
  }) => void
  onRequestAddComment: (input: {
    relativePath: string
    content: string
    selectionRange: LineSelectionRange
  }) => void
  commentLineCounts: ReadonlyMap<number, number>
  commentLineEntries?: ReadonlyMap<number, readonly CodeComment[]>
  gitLineMarkers?: ReadonlyMap<number, WorkspaceGitLineMarkerKind>
  /** Whether the editor is editable (default: false / read-only) */
  editable?: boolean
  /** Called with the full document string when Cmd+S / Ctrl+S is pressed */
  onSave?: (content: string) => void
  /** Called with true when the document is first modified */
  onDirtyChange?: (dirty: boolean) => void
}

type ContextMenuState = {
  x: number
  y: number
  relativePath: string
  selectionRange: LineSelectionRange
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRenderableImagePreview(
  imagePreview: WorkspaceImagePreview | null,
): imagePreview is WorkspaceImagePreview {
  if (!imagePreview) {
    return false
  }
  return (
    imagePreview.mimeType.startsWith('image/') &&
    imagePreview.dataUrl.startsWith('data:image/')
  )
}

function getPreviewUnavailableMessage(
  reason: WorkspacePreviewUnavailableReason,
): string {
  if (reason === 'file_too_large') {
    return 'Preview unavailable: file exceeds 2MB limit.'
  }
  if (reason === 'blocked_resource') {
    return 'Preview unavailable: blocked resource by policy.'
  }
  return 'Preview unavailable: binary file detected.'
}

function getDisplayLanguage(filePath: string | null): string {
  if (!filePath) {
    return 'plaintext'
  }
  const extension = filePath.split('.').at(-1)?.toLowerCase() ?? ''
  if (!extension || extension === filePath.toLowerCase()) {
    return 'plaintext'
  }
  const DISPLAY_MAP: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    md: 'markdown',
    py: 'python',
    html: 'html',
    htm: 'html',
    xml: 'xml',
    svg: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    rs: 'rust',
    go: 'go',
    java: 'java',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    sql: 'sql',
    sh: 'shellscript',
    bash: 'shellscript',
    zsh: 'shellscript',
  }
  return DISPLAY_MAP[extension] ?? 'plaintext'
}

function CopyPathIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect
        fill="none"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="10"
        x="10"
        y="7"
      />
      <rect
        fill="none"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="10"
        x="4"
        y="3"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Extension builder (shared between initial create and setState rebuilds)
// ---------------------------------------------------------------------------

type ExtensionBuilderParams = {
  readOnlyCompartment: Compartment
  editable: boolean
  onSaveRef: MutableRefObject<((content: string) => void) | undefined>
  onSelectRangeRef: MutableRefObject<(range: LineSelectionRange | null) => void>
  onDirtyChangeRef: MutableRefObject<((dirty: boolean) => void) | undefined>
}

function buildExtensions(
  params: ExtensionBuilderParams,
  langSupport?: Awaited<ReturnType<typeof getCM6Language>>,
) {
  const { readOnlyCompartment, editable, onSaveRef, onSelectRangeRef, onDirtyChangeRef } =
    params
  const exts = [
    ...darkTheme,
    readOnlyCompartment.of(EditorState.readOnly.of(!editable)),
    lineNumbers(),
    drawSelection(),
    search(),
    keymap.of([
      {
        key: 'Mod-s',
        run: (v) => {
          onSaveRef.current?.(v.state.doc.toString())
          return true
        },
      },
      ...searchKeymap,
      ...defaultKeymap,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        const range = selectionToLineRange(update.state)
        onSelectRangeRef.current?.(range)
      }
      if (update.docChanged) {
        onDirtyChangeRef.current?.(true)
      }
    }),
  ]
  if (langSupport) {
    exts.push(langSupport)
  }
  return exts
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CodeEditorPanel({
  activeFile,
  activeFileContent,
  activeFileImagePreview,
  isReadingFile,
  readFileError,
  previewUnavailableReason,
  selectionRange,
  jumpRequest,
  onSelectRange,
  onRequestCopyRelativePath,
  onRequestCopySelectedContent,
  onRequestCopyBoth,
  onRequestAddComment,
  commentLineCounts: _commentLineCounts,
  commentLineEntries: _commentLineEntries,
  gitLineMarkers: _gitLineMarkers,
  editable = false,
  onSave,
  onDirtyChange,
}: CodeEditorPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const lastHandledJumpTokenRef = useRef<number | null>(null)
  const onSelectRangeRef = useRef(onSelectRange)
  const onSaveRef = useRef(onSave)
  const onDirtyChangeRef = useRef(onDirtyChange)
  const readOnlyCompartment = useRef(new Compartment())
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(
    null,
  )

  // Keep callback refs up to date
  useEffect(() => {
    onSelectRangeRef.current = onSelectRange
  }, [onSelectRange])

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange
  }, [onDirtyChange])

  const imagePreview = isRenderableImagePreview(activeFileImagePreview)
    ? activeFileImagePreview
    : null
  const isImagePreviewMode = Boolean(imagePreview)
  const displayLanguage = isImagePreviewMode
    ? 'image'
    : getDisplayLanguage(activeFile)

  const showEditor =
    activeFile !== null &&
    !isReadingFile &&
    !readFileError &&
    !previewUnavailableReason &&
    !imagePreview &&
    activeFileContent !== null

  // ---- Create / destroy EditorView when container becomes available ------
  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: buildExtensions({
          readOnlyCompartment: readOnlyCompartment.current,
          editable,
          onSaveRef,
          onSelectRangeRef,
          onDirtyChangeRef,
        }),
      }),
      parent: containerRef.current,
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Re-run when showEditor changes so we create the view after container mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditor])

  // ---- Reconfigure readOnly compartment when editable prop changes --------
  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(
        EditorState.readOnly.of(!editable),
      ),
    })
  }, [editable])

  // ---- Update document when file content or file changes -----------------
  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const newContent = activeFileContent ?? ''

    // Build extensions including async language support
    let cancelled = false
    const updateState = async () => {
      const langSupport = await getCM6Language(activeFile)
      if (cancelled) {
        return
      }

      const extensions = buildExtensions(
        {
          readOnlyCompartment: readOnlyCompartment.current,
          editable,
          onSaveRef,
          onSelectRangeRef,
          onDirtyChangeRef,
        },
        langSupport ?? undefined,
      )

      const newState = EditorState.create({
        doc: newContent,
        extensions,
      })
      view.setState(newState)
    }

    updateState()

    return () => {
      cancelled = true
    }
  }, [activeFileContent, activeFile])

  // ---- Jump to line ------------------------------------------------------
  useEffect(() => {
    if (!jumpRequest || !viewRef.current || !activeFile) {
      return
    }
    if (lastHandledJumpTokenRef.current === jumpRequest.token) {
      return
    }
    if (activeFile !== jumpRequest.targetRelativePath) {
      return
    }

    const view = viewRef.current
    const lineCount = view.state.doc.lines
    if (lineCount === 0) {
      return
    }

    const lineNumber = Math.min(Math.max(1, jumpRequest.lineNumber), lineCount)
    const line = view.state.doc.line(lineNumber)

    view.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
    })
    lastHandledJumpTokenRef.current = jumpRequest.token
  }, [jumpRequest, activeFile])

  // ---- Context menu handler on container (bubbles from EditorView) --------
  useEffect(() => {
    const container = containerRef.current
    const view = viewRef.current
    if (!container || !view || !activeFile) {
      return
    }

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()

      const currentRange = selectionToLineRange(view.state)
      setContextMenuState({
        x: event.clientX,
        y: event.clientY,
        relativePath: activeFile,
        selectionRange: currentRange,
      })
    }

    container.addEventListener('contextmenu', handleContextMenu)
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [activeFile, showEditor])

  // ---- Reset context menu on file change ---------------------------------
  useEffect(() => {
    setContextMenuState(null)
    lastHandledJumpTokenRef.current = null
  }, [activeFile, activeFileImagePreview, previewUnavailableReason])

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null)
  }, [])

  return (
    <section className="code-viewer-panel" data-testid="code-viewer-panel">
      <header className="code-viewer-header">
        <div className="code-viewer-title-row">
          <p className="label">Code Preview</p>
          <button
            aria-label="Copy active file path"
            className="code-viewer-copy-path-button"
            data-testid="code-viewer-copy-path-button"
            disabled={!activeFile}
            onClick={() => {
              if (!activeFile) {
                return
              }
              onRequestCopyRelativePath(activeFile)
            }}
            title="Copy active file path"
            type="button"
          >
            <CopyPathIcon />
          </button>
        </div>
        <p
          className="path"
          data-testid="code-viewer-active-file"
          title={activeFile ?? ''}
        >
          {activeFile ?? 'No active file'}
        </p>
        <p
          className="code-viewer-selection"
          data-testid="code-viewer-selection-range"
        >
          {selectionRange
            ? `Selection: L${selectionRange.startLine}-L${selectionRange.endLine}`
            : 'Selection: none'}
        </p>
        <p className="code-viewer-language" data-testid="code-viewer-language">
          Language: {displayLanguage}
        </p>
      </header>

      {!activeFile && (
        <p className="code-viewer-empty" data-testid="code-viewer-empty">
          Select a file to preview its content.
        </p>
      )}

      {activeFile && isReadingFile && (
        <p className="code-viewer-loading" data-testid="code-viewer-loading">
          Loading file preview...
        </p>
      )}

      {activeFile && !isReadingFile && readFileError && (
        <p
          className="code-viewer-error"
          data-testid="code-viewer-error"
          role="alert"
        >
          {readFileError}
        </p>
      )}

      {activeFile &&
        !isReadingFile &&
        !readFileError &&
        previewUnavailableReason && (
          <p
            className="code-viewer-preview-unavailable"
            data-testid="code-viewer-preview-unavailable"
          >
            {getPreviewUnavailableMessage(previewUnavailableReason)}
          </p>
        )}

      {activeFile &&
        !isReadingFile &&
        !readFileError &&
        !previewUnavailableReason &&
        imagePreview && (
          <div
            className="code-viewer-image-preview"
            data-testid="code-viewer-image-preview"
          >
            <img
              alt={`Image preview for ${activeFile}`}
              src={imagePreview.dataUrl}
            />
          </div>
        )}

      {showEditor && (
        <div
          className="code-editor-cm6-container"
          data-testid="code-viewer-content"
          ref={containerRef}
        />
      )}

      {contextMenuState && !isImagePreviewMode && (
        <CopyActionPopover
          actions={[
            {
              label: 'Add Comment',
              onSelect: () => {
                onRequestAddComment({
                  relativePath: contextMenuState.relativePath,
                  content: activeFileContent ?? '',
                  selectionRange: contextMenuState.selectionRange,
                })
              },
            },
            {
              label: 'Copy Selected Content',
              onSelect: () => {
                onRequestCopySelectedContent({
                  relativePath: contextMenuState.relativePath,
                  content: activeFileContent ?? '',
                  selectionRange: contextMenuState.selectionRange,
                })
              },
            },
            {
              label: 'Copy Both',
              onSelect: () => {
                onRequestCopyBoth({
                  relativePath: contextMenuState.relativePath,
                  content: activeFileContent ?? '',
                  selectionRange: contextMenuState.selectionRange,
                })
              },
            },
            {
              label: 'Copy Relative Path',
              onSelect: () => {
                onRequestCopyRelativePath(contextMenuState.relativePath)
              },
            },
          ]}
          ariaLabel="Copy actions"
          description={contextMenuState.relativePath}
          onClose={closeContextMenu}
          title="Copy Action"
          x={contextMenuState.x}
          y={contextMenuState.y}
        />
      )}
    </section>
  )
}
