import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { EditorView, lineNumbers, drawSelection, keymap } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { search, searchKeymap } from '@codemirror/search'
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import type { AppearanceTheme } from '../appearance-theme'
import type { LineSelectionRange } from '../workspace/workspace-model'
import type { WorkspaceGitLineMarkerKind } from '../workspace/workspace-model'
import type { CodeComment } from '../code-comments/comment-types'
import {
  normalizeSourceOffsetRange,
  type SourceOffsetRange,
} from '../source-selection'
import { darkGrayTheme } from './cm6-dark-theme'
import { lightTheme } from './cm6-light-theme'
import { getCM6Language } from './cm6-language-map'
import { selectionToLineRange } from './cm6-selection-bridge'
import { CopyActionPopover } from '../context-menu/copy-action-popover'
import { createGitMarkersExtension, setGitMarkers } from './cm6-git-gutter'
import type { GitMarkerKind } from './cm6-git-gutter'
import { createCommentGutterExtension, setCommentMarkers } from './cm6-comment-gutter'
import type { CommentGutterEntry } from './cm6-comment-gutter'
import { CommentHoverPopover } from '../code-comments/comment-hover-popover'
import {
  createNavigationHighlightExtension,
  setNavigationLineHighlight,
} from './cm6-navigation-highlight'

export type CodeViewerJumpRequest = {
  targetRelativePath: string
  lineNumber: number
  sourceOffsetRange?: SourceOffsetRange
  shouldHighlight?: boolean
  token: number
}

type CodeEditorPanelProps = {
  activeFile: string | null
  activeFileContent: string | null
  activeFileImagePreview: WorkspaceImagePreview | null
  appearanceTheme?: AppearanceTheme
  isReadingFile: boolean
  readFileError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  jumpRequest: CodeViewerJumpRequest | null
  onSelectRange: (range: LineSelectionRange | null) => void
  onRequestCopyRelativePath: (relativePath: string, selectionRange?: LineSelectionRange) => void
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
  onRequestGoToSpec: (input: { relativePath: string; lineNumber: number }) => void
  commentLineCounts: ReadonlyMap<number, number>
  commentLineEntries?: ReadonlyMap<number, readonly CodeComment[]>
  gitLineMarkers?: ReadonlyMap<number, WorkspaceGitLineMarkerKind>
  /** Whether the editor is editable (default: false / read-only) */
  editable?: boolean
  /** Called with the full document string when Cmd+S / Ctrl+S is pressed */
  onSave?: (content: string) => void
  /** Called with true when the document is first modified */
  onDirtyChange?: (dirty: boolean) => void
  /** Called with the scroll top pixel offset when the editor is scrolled */
  onScrollChange?: (scrollTop: number) => void
  /** Pixel scroll offset to restore when the file content is loaded */
  restoredScrollTop?: number | null
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
const NAVIGATION_HIGHLIGHT_DURATION_MS = 1600

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

function isMarkdownFile(filePath: string | null): boolean {
  return typeof filePath === 'string' && filePath.toLowerCase().endsWith('.md')
}

function clampSelectionPosition(position: number, docLength: number): number {
  if (!Number.isFinite(position)) {
    return 0
  }
  return Math.max(0, Math.min(position, docLength))
}

function applyJumpRequestToView(
  view: EditorView,
  jumpRequest: CodeViewerJumpRequest | null,
): boolean {
  if (!jumpRequest) {
    return false
  }

  const lineCount = view.state.doc.lines
  if (lineCount === 0) {
    return false
  }

  const lineNumber = Math.min(Math.max(1, jumpRequest.lineNumber), lineCount)
  const line = view.state.doc.line(lineNumber)
  const exactRange = normalizeSourceOffsetRange(
    jumpRequest.sourceOffsetRange,
    view.state.doc.length,
  )

  if (exactRange) {
    view.dispatch({
      selection: {
        anchor: exactRange.startOffset,
        head: exactRange.endOffset,
      },
      effects: EditorView.scrollIntoView(exactRange.startOffset, { y: 'center' }),
    })
    return true
  }

  view.dispatch({
    effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
  })
  return true
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
  themeCompartment: Compartment
  wrapCompartment: Compartment
  appearanceTheme: AppearanceTheme
  editable: boolean
  isLineWrapEnabled: boolean
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
    themeCompartment,
    wrapCompartment,
    appearanceTheme,
    editable,
    isLineWrapEnabled,
    onSaveRef,
    onSelectRangeRef,
    onDirtyChangeRef,
    onCommentHoverRef,
    onCommentLeaveRef,
  } = params
  const exts = [
    themeCompartment.of(
      appearanceTheme === 'light' ? lightTheme : darkGrayTheme,
    ),
    ...createGitMarkersExtension(),
    ...createCommentGutterExtension(
      (lineNum, rect) => onCommentHoverRef.current?.(lineNum, rect),
      () => onCommentLeaveRef.current?.(),
    ),
    ...createNavigationHighlightExtension(),
    history(),
    readOnlyCompartment.of(EditorState.readOnly.of(!editable)),
    wrapCompartment.of(isLineWrapEnabled ? EditorView.lineWrapping : []),
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
      ...historyKeymap,
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
  appearanceTheme = 'dark-gray',
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
  onRequestGoToSpec,
  commentLineCounts,
  commentLineEntries,
  gitLineMarkers,
  editable = false,
  onSave,
  onDirtyChange,
  onScrollChange,
  restoredScrollTop = null,
}: CodeEditorPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const lastHandledJumpTokenRef = useRef<number | null>(null)
  const jumpRequestRef = useRef(jumpRequest)
  const onSelectRangeRef = useRef(onSelectRange)
  const onSaveRef = useRef(onSave)
  const onDirtyChangeRef = useRef(onDirtyChange)
  const onScrollChangeRef = useRef(onScrollChange)
  const restoredScrollTopRef = useRef<number | null>(restoredScrollTop ?? null)
  const lastRenderedFileRef = useRef<string | null>(null)
  const readOnlyCompartment = useRef(new Compartment())
  const themeCompartment = useRef(new Compartment())
  const wrapCompartment = useRef(new Compartment())
  const [isLineWrapEnabled, setIsLineWrapEnabled] = useState(true)
  const isLineWrapEnabledRef = useRef(isLineWrapEnabled)
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
  const navigationHighlightApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const navigationHighlightClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

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

  useEffect(() => {
    onScrollChangeRef.current = onScrollChange
  }, [onScrollChange])

  useEffect(() => {
    jumpRequestRef.current = jumpRequest
  }, [jumpRequest])

  useEffect(() => {
    restoredScrollTopRef.current = restoredScrollTop ?? null
  }, [restoredScrollTop])

  useEffect(() => {
    isLineWrapEnabledRef.current = isLineWrapEnabled
  }, [isLineWrapEnabled])

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

  const clearNavigationHighlightTimers = useCallback(() => {
    if (navigationHighlightApplyTimerRef.current) {
      clearTimeout(navigationHighlightApplyTimerRef.current)
      navigationHighlightApplyTimerRef.current = null
    }
    if (navigationHighlightClearTimerRef.current) {
      clearTimeout(navigationHighlightClearTimerRef.current)
      navigationHighlightClearTimerRef.current = null
    }
  }, [])

  const clearNavigationHighlight = useCallback(() => {
    clearNavigationHighlightTimers()
    viewRef.current?.dispatch({
      effects: setNavigationLineHighlight.of(null),
    })
  }, [clearNavigationHighlightTimers])

  const scheduleNavigationLineHighlight = useCallback(
    (view: EditorView, lineNumber: number) => {
      const normalizedLineNumber = Math.min(
        Math.max(1, lineNumber),
        view.state.doc.lines,
      )

      clearNavigationHighlight()
      navigationHighlightApplyTimerRef.current = setTimeout(() => {
        if (viewRef.current !== view) {
          return
        }
        view.dispatch({
          effects: setNavigationLineHighlight.of(normalizedLineNumber),
        })
        navigationHighlightApplyTimerRef.current = null
        navigationHighlightClearTimerRef.current = setTimeout(() => {
          if (viewRef.current === view) {
            view.dispatch({
              effects: setNavigationLineHighlight.of(null),
            })
          }
          navigationHighlightClearTimerRef.current = null
        }, NAVIGATION_HIGHLIGHT_DURATION_MS)
      }, 0)
    },
    [clearNavigationHighlight],
  )

  useEffect(
    () => () => {
      clearNavigationHighlightTimers()
    },
    [clearNavigationHighlightTimers],
  )

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
  const isMarkdownSourceFile = isMarkdownFile(activeFile)
  const displayLanguage = isImagePreviewMode
    ? 'image'
    : getDisplayLanguage(activeFile)

  const showEditor =
    activeFile !== null &&
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
          themeCompartment: themeCompartment.current,
          wrapCompartment: wrapCompartment.current,
          appearanceTheme,
          editable,
          isLineWrapEnabled,
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

    const handleScroll = () => {
      onScrollChangeRef.current?.(view.scrollDOM.scrollTop)
    }
    view.scrollDOM.addEventListener('scroll', handleScroll)

    return () => {
      view.scrollDOM.removeEventListener('scroll', handleScroll)
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

  // ---- Reconfigure line wrap compartment when wrap toggle changes ---------
  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }
    view.dispatch({
      effects: wrapCompartment.current.reconfigure(
        isLineWrapEnabled ? EditorView.lineWrapping : [],
      ),
    })
  }, [isLineWrapEnabled])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }
    view.dispatch({
      effects: themeCompartment.current.reconfigure(
        appearanceTheme === 'light' ? lightTheme : darkGrayTheme,
      ),
    })
  }, [appearanceTheme])

  // ---- Update document when file content or file changes -----------------
  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const newContent = activeFileContent ?? ''
    const previousSelection = view.state.selection.main
    const previousScrollTop = view.scrollDOM.scrollTop
    const shouldPreserveViewportState =
      activeFile !== null &&
      lastRenderedFileRef.current !== null &&
      lastRenderedFileRef.current === activeFile
    const shouldRestoreFocus = shouldPreserveViewportState && view.hasFocus

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
          themeCompartment: themeCompartment.current,
          wrapCompartment: wrapCompartment.current,
          appearanceTheme,
          editable,
          isLineWrapEnabled: isLineWrapEnabledRef.current,
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

      const pendingJumpRequest = jumpRequestRef.current
      const shouldApplyPendingJump =
        pendingJumpRequest !== null &&
        activeFile !== null &&
        pendingJumpRequest.targetRelativePath === activeFile &&
        lastHandledJumpTokenRef.current !== pendingJumpRequest.token
      const appliedPendingJump = shouldApplyPendingJump
        ? applyJumpRequestToView(view, pendingJumpRequest)
        : false
      if (appliedPendingJump && pendingJumpRequest) {
        lastHandledJumpTokenRef.current = pendingJumpRequest.token
        if (pendingJumpRequest.shouldHighlight) {
          scheduleNavigationLineHighlight(view, pendingJumpRequest.lineNumber)
        }
      }

      if (appliedPendingJump) {
        // Jump requests intentionally override previous viewport restoration.
      } else if (shouldPreserveViewportState) {
        const docLength = view.state.doc.length
        const nextAnchor = clampSelectionPosition(previousSelection.anchor, docLength)
        const nextHead = clampSelectionPosition(previousSelection.head, docLength)
        view.dispatch({
          selection: {
            anchor: nextAnchor,
            head: nextHead,
          },
        })
        requestAnimationFrame(() => {
          if (!cancelled) {
            view.scrollDOM.scrollTop = Math.max(0, Math.trunc(previousScrollTop))
            if (shouldRestoreFocus) {
              view.focus()
            }
          }
        })
      } else {
        // Restore scroll position after content is set
        const targetScrollTop = restoredScrollTopRef.current
        if (
          typeof targetScrollTop === 'number' &&
          Number.isFinite(targetScrollTop) &&
          targetScrollTop > 0
        ) {
          const scrollTop = Math.trunc(targetScrollTop)
          requestAnimationFrame(() => {
            if (!cancelled) {
              view.scrollDOM.scrollTop = scrollTop
            }
          })
        }
      }
      lastRenderedFileRef.current = activeFile

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
  }, [activeFileContent, activeFile, appearanceTheme, editable])

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
    if (!applyJumpRequestToView(view, jumpRequest)) {
      return
    }

    if (jumpRequest.shouldHighlight) {
      scheduleNavigationLineHighlight(view, jumpRequest.lineNumber)
    }

    lastHandledJumpTokenRef.current = jumpRequest.token
  }, [activeFile, jumpRequest, scheduleNavigationLineHighlight])

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
    clearNavigationHighlight()
    setContextMenuState(null)
    setCommentHoverState(null)
    lastHandledJumpTokenRef.current = null
  }, [
    activeFile,
    activeFileImagePreview,
    clearNavigationHighlight,
    previewUnavailableReason,
  ])

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null)
  }, [])

  return (
    <section
      className="code-viewer-panel"
      data-appearance-theme={appearanceTheme}
      data-testid="code-viewer-panel"
    >
      <header className="code-viewer-header">
        <div className="code-viewer-title-row">
          <p className="label">Code Preview</p>
          <div className="code-viewer-header-actions">
            <button
              aria-label="Toggle code wrap"
              aria-pressed={isLineWrapEnabled}
              className="code-viewer-wrap-toggle-button"
              data-testid="code-viewer-wrap-toggle"
              onClick={() => {
                setIsLineWrapEnabled((previous) => !previous)
              }}
              title={isLineWrapEnabled ? 'Disable line wrap' : 'Enable line wrap'}
              type="button"
            >
              Wrap {isLineWrapEnabled ? 'On' : 'Off'}
            </button>
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

      {activeFile && isReadingFile && activeFileContent === null && (
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
            ...(isMarkdownSourceFile
              ? [
                  {
                    label: 'Go to Spec',
                    onSelect: () => {
                      onRequestGoToSpec({
                        relativePath: contextMenuState.relativePath,
                        lineNumber: contextMenuState.selectionRange.startLine,
                      })
                    },
                  },
                ]
              : []),
            {
              label: 'Copy Line Contents',
              onSelect: () => {
                onRequestCopySelectedContent({
                  relativePath: contextMenuState.relativePath,
                  content: activeFileContent ?? '',
                  selectionRange: contextMenuState.selectionRange,
                })
              },
            },
            {
              label: 'Copy Contents and Path',
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
                onRequestCopyRelativePath(
                  contextMenuState.relativePath,
                  contextMenuState.selectionRange,
                )
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
