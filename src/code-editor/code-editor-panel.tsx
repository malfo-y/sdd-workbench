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
import { createGitMarkersExtension, setGitMarkers } from './cm6-git-gutter'
import type { GitMarkerKind } from './cm6-git-gutter'
import { createCommentGutterExtension, setCommentMarkers } from './cm6-comment-gutter'
import type { CommentGutterEntry } from './cm6-comment-gutter'
import { CommentHoverPopover } from '../code-comments/comment-hover-popover'

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

type CommentHoverState = {
  x: number
  y: number
  lineNumber: number
  comments: readonly CodeComment[]
}

const HOVER_POPOVER_CLOSE_DELAY_MS = 120

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
  onCommentHoverRef: MutableRefObject<((lineNumber: number, rect: DOMRect) => void) | undefined>
  onCommentLeaveRef: MutableRefObject<(() => void) | undefined>
}

function buildExtensions(
  params: ExtensionBuilderParams,
  langSupport?: Awaited<ReturnType<typeof getCM6Language>>,
) {
  const {
    readOnlyCompartment,
    editable,
    onSaveRef,
    onSelectRangeRef,
    onDirtyChangeRef,
    onCommentHoverRef,
    onCommentLeaveRef,
  } = params
  const exts = [
    ...darkTheme,
    ...createGitMarkersExtension(),
    ...createCommentGutterExtension(
      (lineNum, rect) => onCommentHoverRef.current?.(lineNum, rect),
      () => onCommentLeaveRef.current?.(),
    ),
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
// Comment markers map builder
// ---------------------------------------------------------------------------

function buildCommentMarkersMap(
  counts: ReadonlyMap<number, number> | undefined,
  entries: ReadonlyMap<number, readonly CodeComment[]> | undefined,
): Map<number, CommentGutterEntry> {
  const result = new Map<number, CommentGutterEntry>()
  counts?.forEach((count, line) => {
    result.set(line, { count, entries: entries?.get(line) ?? [] })
  })
  return result
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
  commentLineCounts,
  commentLineEntries,
  gitLineMarkers,
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

  // Gutter data refs (for dispatching after async setState)
  const gitLineMarkersRef = useRef(gitLineMarkers)
  const commentLineEntriesRef = useRef(commentLineEntries)
  const commentLineCountsRef = useRef(commentLineCounts)

  // Comment hover refs
  const onCommentHoverRef = useRef<((lineNumber: number, rect: DOMRect) => void) | undefined>(
    undefined,
  )
  const onCommentLeaveRef = useRef<(() => void) | undefined>(undefined)
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Comment hover state
  const [commentHoverState, setCommentHoverState] = useState<CommentHoverState | null>(null)

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

  // Keep gutter data refs up to date
  useEffect(() => {
    gitLineMarkersRef.current = gitLineMarkers
  }, [gitLineMarkers])

  useEffect(() => {
    commentLineEntriesRef.current = commentLineEntries
  }, [commentLineEntries])

  useEffect(() => {
    commentLineCountsRef.current = commentLineCounts
  }, [commentLineCounts])

  // ---- Hover timer utilities -------------------------------------------
  const clearHoverCloseTimer = useCallback(() => {
    if (!hoverCloseTimerRef.current) return
    clearTimeout(hoverCloseTimerRef.current)
    hoverCloseTimerRef.current = null
  }, [])

  const closeCommentHover = useCallback(() => {
    clearHoverCloseTimer()
    setCommentHoverState(null)
  }, [clearHoverCloseTimer])

  const scheduleCommentHoverClose = useCallback(() => {
    clearHoverCloseTimer()
    hoverCloseTimerRef.current = setTimeout(() => {
      setCommentHoverState(null)
      hoverCloseTimerRef.current = null
    }, HOVER_POPOVER_CLOSE_DELAY_MS)
  }, [clearHoverCloseTimer])

  // Bind comment hover refs each render so they always capture latest closures
  onCommentHoverRef.current = (lineNumber: number, rect: DOMRect) => {
    const entries = commentLineEntriesRef.current?.get(lineNumber) ?? []
    if (entries.length === 0) return
    clearHoverCloseTimer()
    setCommentHoverState({ x: rect.right, y: rect.top, lineNumber, comments: entries })
  }
  onCommentLeaveRef.current = scheduleCommentHoverClose

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
          onCommentHoverRef,
          onCommentLeaveRef,
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
          onCommentHoverRef,
          onCommentLeaveRef,
        },
        langSupport ?? undefined,
      )

      const newState = EditorState.create({
        doc: newContent,
        extensions,
      })
      view.setState(newState)

      // Dispatch gutter markers after setState so the new state includes the fields
      const gitMap: Map<number, GitMarkerKind> = new Map()
      gitLineMarkersRef.current?.forEach((kind, line) => gitMap.set(line, kind))
      view.dispatch({ effects: setGitMarkers.of(gitMap) })

      view.dispatch({
        effects: setCommentMarkers.of(
          buildCommentMarkersMap(commentLineCountsRef.current, commentLineEntriesRef.current),
        ),
      })
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

  // ---- Sync git gutter markers when prop changes -------------------------
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const gitMap: Map<number, GitMarkerKind> = new Map()
    gitLineMarkers?.forEach((kind, line) => gitMap.set(line, kind))
    view.dispatch({ effects: setGitMarkers.of(gitMap) })
  }, [gitLineMarkers])

  // ---- Sync comment gutter markers when props change ---------------------
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: setCommentMarkers.of(buildCommentMarkersMap(commentLineCounts, commentLineEntries)),
    })
  }, [commentLineCounts, commentLineEntries])

  // ---- Reset context menu on file change ---------------------------------
  useEffect(() => {
    setContextMenuState(null)
    setCommentHoverState(null)
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
      {commentHoverState && !isImagePreviewMode && (
        <CommentHoverPopover
          comments={commentHoverState.comments}
          lineNumber={commentHoverState.lineNumber}
          onClose={closeCommentHover}
          onMouseEnter={clearHoverCloseTimer}
          onMouseLeave={scheduleCommentHoverClose}
          x={commentHoverState.x}
          y={commentHoverState.y}
        />
      )}
    </section>
  )
}
