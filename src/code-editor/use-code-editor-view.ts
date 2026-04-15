import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react'
import { Compartment, EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { openSearchPanel, search, searchKeymap } from '@codemirror/search'
import { drawSelection, EditorView, keymap, lineNumbers } from '@codemirror/view'
import type { AppearanceTheme } from '../appearance-theme'
import type { CodeComment } from '../code-comments/comment-types'
import type { WorkspaceGitLineMarkerKind } from '../workspace/workspace-model'
import { darkGrayTheme } from './cm6-dark-theme'
import { lightTheme } from './cm6-light-theme'
import { createCommentGutterExtension, setCommentMarkers, type CommentGutterEntry } from './cm6-comment-gutter'
import { createGitMarkersExtension, setGitMarkers, type GitMarkerKind } from './cm6-git-gutter'
import { getCM6Language } from './cm6-language-map'
import {
  createNavigationHighlightExtension,
  setNavigationLineHighlight,
} from './cm6-navigation-highlight'
import { selectionToLineRange } from './cm6-selection-bridge'
import {
  normalizeSourceOffsetRange,
  type SourceOffsetRange,
} from '../source-selection'
import type { LineSelectionRange } from '../workspace/workspace-model'

const NAVIGATION_HIGHLIGHT_DURATION_MS = 1600

export type CodeEditorJumpRequest = {
  targetRelativePath: string
  lineNumber: number
  sourceOffsetRange?: SourceOffsetRange
  shouldHighlight?: boolean
  token: number
}

/** @deprecated Prefer `CodeEditorJumpRequest`. */
export type CodeViewerJumpRequest = CodeEditorJumpRequest

type UseCodeEditorViewInput = {
  activeFile: string | null
  activeFileContent: string | null
  appearanceTheme: AppearanceTheme
  commentLineCounts: ReadonlyMap<number, number>
  commentLineEntries?: ReadonlyMap<number, readonly CodeComment[]>
  gitLineMarkers?: ReadonlyMap<number, WorkspaceGitLineMarkerKind>
  jumpRequest: CodeEditorJumpRequest | null
  onCommentHover?: (lineNumber: number, rect: DOMRect) => void
  onCommentLeave?: () => void
  onScrollChange?: (scrollTop: number) => void
  onSelectRange: (range: LineSelectionRange | null) => void
  restoredScrollTop?: number | null
  shouldMountEditor: boolean
}

type UseCodeEditorViewResult = {
  clearNavigationHighlight: () => void
  containerRef: RefObject<HTMLDivElement>
  isLineWrapEnabled: boolean
  requestSearchPanelOpen: () => void
  setIsLineWrapEnabled: React.Dispatch<React.SetStateAction<boolean>>
  viewRef: MutableRefObject<EditorView | null>
}

type ExtensionBuilderParams = {
  appearanceTheme: AppearanceTheme
  isLineWrapEnabled: boolean
  languageCompartment: Compartment
  onCommentHoverRef: MutableRefObject<((lineNumber: number, rect: DOMRect) => void) | undefined>
  onCommentLeaveRef: MutableRefObject<(() => void) | undefined>
  onSelectRangeRef: MutableRefObject<(range: LineSelectionRange | null) => void>
  suppressSelectionSyncRef: MutableRefObject<boolean>
  themeCompartment: Compartment
  wrapCompartment: Compartment
}

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

function clampSelectionPosition(position: number, docLength: number): number {
  if (!Number.isFinite(position)) {
    return 0
  }
  return Math.max(0, Math.min(position, docLength))
}

function applyJumpRequestToView(
  view: EditorView,
  jumpRequest: CodeEditorJumpRequest | null,
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

function buildCodeEditorExtensions({
  appearanceTheme,
  isLineWrapEnabled,
  languageCompartment,
  onCommentHoverRef,
  onCommentLeaveRef,
  onSelectRangeRef,
  suppressSelectionSyncRef,
  themeCompartment,
  wrapCompartment,
}: ExtensionBuilderParams) {
  return [
    themeCompartment.of(
      appearanceTheme === 'light' ? lightTheme : darkGrayTheme,
    ),
    wrapCompartment.of(isLineWrapEnabled ? EditorView.lineWrapping : []),
    languageCompartment.of([]),
    ...createGitMarkersExtension(),
    ...createCommentGutterExtension(
      (lineNumber, rect) => onCommentHoverRef.current?.(lineNumber, rect),
      () => onCommentLeaveRef.current?.(),
    ),
    ...createNavigationHighlightExtension(),
    history(),
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    lineNumbers(),
    drawSelection(),
    search(),
    keymap.of([
      ...historyKeymap,
      ...searchKeymap,
      ...defaultKeymap,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        if (suppressSelectionSyncRef.current) {
          return
        }
        onSelectRangeRef.current(selectionToLineRange(update.state))
      }
    }),
  ]
}

export function useCodeEditorView({
  activeFile,
  activeFileContent,
  appearanceTheme,
  commentLineCounts,
  commentLineEntries,
  gitLineMarkers,
  jumpRequest,
  onCommentHover,
  onCommentLeave,
  onScrollChange,
  onSelectRange,
  restoredScrollTop = null,
  shouldMountEditor,
}: UseCodeEditorViewInput): UseCodeEditorViewResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const lastHandledJumpTokenRef = useRef<number | null>(null)
  const lastRenderedFileRef = useRef<string | null>(null)
  const themeCompartmentRef = useRef(new Compartment())
  const wrapCompartmentRef = useRef(new Compartment())
  const languageCompartmentRef = useRef(new Compartment())
  const navigationHighlightApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const navigationHighlightClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const languageRequestVersionRef = useRef(0)
  const suppressSelectionSyncRef = useRef(false)

  const onSelectRangeRef = useRef(onSelectRange)
  const onScrollChangeRef = useRef(onScrollChange)
  const onCommentHoverRef = useRef(onCommentHover)
  const onCommentLeaveRef = useRef(onCommentLeave)
  const jumpRequestRef = useRef(jumpRequest)
  const restoredScrollTopRef = useRef(restoredScrollTop)
  const commentLineCountsRef = useRef(commentLineCounts)
  const commentLineEntriesRef = useRef(commentLineEntries)
  const gitLineMarkersRef = useRef(gitLineMarkers)
  const appearanceThemeRef = useRef(appearanceTheme)

  const [isLineWrapEnabled, setIsLineWrapEnabled] = useState(true)
  const isLineWrapEnabledRef = useRef(isLineWrapEnabled)

  useLayoutEffect(() => {
    onSelectRangeRef.current = onSelectRange
  }, [onSelectRange])

  useLayoutEffect(() => {
    onScrollChangeRef.current = onScrollChange
  }, [onScrollChange])

  useLayoutEffect(() => {
    onCommentHoverRef.current = onCommentHover
  }, [onCommentHover])

  useLayoutEffect(() => {
    onCommentLeaveRef.current = onCommentLeave
  }, [onCommentLeave])

  useEffect(() => {
    jumpRequestRef.current = jumpRequest
  }, [jumpRequest])

  useEffect(() => {
    restoredScrollTopRef.current = restoredScrollTop ?? null
  }, [restoredScrollTop])

  useEffect(() => {
    isLineWrapEnabledRef.current = isLineWrapEnabled
  }, [isLineWrapEnabled])

  useEffect(() => {
    appearanceThemeRef.current = appearanceTheme
  }, [appearanceTheme])

  useEffect(() => {
    commentLineCountsRef.current = commentLineCounts
  }, [commentLineCounts])

  useEffect(() => {
    commentLineEntriesRef.current = commentLineEntries
  }, [commentLineEntries])

  useEffect(() => {
    gitLineMarkersRef.current = gitLineMarkers
  }, [gitLineMarkers])

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

  // Keep the EditorView stable after mount. Theme and wrapping changes are
  // applied through compartment reconfigure effects below so content and
  // viewport state survive cosmetic toggles.
  useEffect(() => {
    if (!containerRef.current || !shouldMountEditor) {
      return
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: buildCodeEditorExtensions({
          appearanceTheme: appearanceThemeRef.current,
          isLineWrapEnabled: isLineWrapEnabledRef.current,
          languageCompartment: languageCompartmentRef.current,
          onCommentHoverRef,
          onCommentLeaveRef,
          onSelectRangeRef,
          suppressSelectionSyncRef,
          themeCompartment: themeCompartmentRef.current,
          wrapCompartment: wrapCompartmentRef.current,
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
      lastRenderedFileRef.current = null
      lastHandledJumpTokenRef.current = null
    }
  }, [shouldMountEditor])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }
    view.dispatch({
      effects: wrapCompartmentRef.current.reconfigure(
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
      effects: themeCompartmentRef.current.reconfigure(
        appearanceTheme === 'light' ? lightTheme : darkGrayTheme,
      ),
    })
  }, [appearanceTheme])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !shouldMountEditor) {
      return
    }

    const requestVersion = ++languageRequestVersionRef.current
    let cancelled = false

    const syncLanguage = async () => {
      let languageExtension: Awaited<ReturnType<typeof getCM6Language>> | undefined
      try {
        languageExtension = (await getCM6Language(activeFile)) ?? undefined
      } catch {
        languageExtension = undefined
      }

      if (
        cancelled ||
        viewRef.current !== view ||
        languageRequestVersionRef.current !== requestVersion
      ) {
        return
      }

      view.dispatch({
        effects: languageCompartmentRef.current.reconfigure(languageExtension ?? []),
      })
    }

    void syncLanguage()

    return () => {
      cancelled = true
    }
  }, [activeFile, shouldMountEditor])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const newContent = activeFileContent ?? ''
    if (
      activeFile !== null &&
      lastRenderedFileRef.current === activeFile &&
      view.state.doc.toString() === newContent
    ) {
      return
    }

    const previousSelection = view.state.selection.main
    const previousScrollTop = view.scrollDOM.scrollTop
    const shouldPreserveViewportState =
      activeFile !== null &&
      lastRenderedFileRef.current !== null &&
      lastRenderedFileRef.current === activeFile
    const shouldRestoreFocus = shouldPreserveViewportState && view.hasFocus

    let restoreViewportFrame: number | undefined
    let restoreScrollFrame: number | undefined

    clearNavigationHighlight()
    suppressSelectionSyncRef.current = true
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: newContent,
      },
    })
    suppressSelectionSyncRef.current = false

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
    } else if (shouldPreserveViewportState) {
      const docLength = view.state.doc.length
      suppressSelectionSyncRef.current = true
      view.dispatch({
        selection: {
          anchor: clampSelectionPosition(previousSelection.anchor, docLength),
          head: clampSelectionPosition(previousSelection.head, docLength),
        },
      })
      suppressSelectionSyncRef.current = false
      restoreViewportFrame = requestAnimationFrame(() => {
        view.scrollDOM.scrollTop = Math.max(0, Math.trunc(previousScrollTop))
        if (shouldRestoreFocus) {
          view.focus()
        }
      })
    } else {
      const targetScrollTop = restoredScrollTopRef.current
      if (
        typeof targetScrollTop === 'number' &&
        Number.isFinite(targetScrollTop) &&
        targetScrollTop > 0
      ) {
        restoreScrollFrame = requestAnimationFrame(() => {
          view.scrollDOM.scrollTop = Math.trunc(targetScrollTop)
        })
      }
    }

    lastRenderedFileRef.current = activeFile

    return () => {
      if (restoreViewportFrame !== undefined) {
        cancelAnimationFrame(restoreViewportFrame)
      }
      if (restoreScrollFrame !== undefined) {
        cancelAnimationFrame(restoreScrollFrame)
      }
    }
  }, [
    activeFile,
    activeFileContent,
    clearNavigationHighlight,
    scheduleNavigationLineHighlight,
  ])

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

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const gitMap: Map<number, GitMarkerKind> = new Map()
    gitLineMarkersRef.current?.forEach((kind, line) => gitMap.set(line, kind))
    view.dispatch({
      effects: setGitMarkers.of(gitMap),
    })
  }, [gitLineMarkers])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    view.dispatch({
      effects: setCommentMarkers.of(
        buildCommentMarkersMap(
          commentLineCountsRef.current,
          commentLineEntriesRef.current,
        ),
      ),
    })
  }, [commentLineCounts, commentLineEntries])

  const requestSearchPanelOpen = useCallback(() => {
    const view = viewRef.current
    if (!view) {
      return
    }
    openSearchPanel(view)
    view.focus()
  }, [])

  return {
    clearNavigationHighlight,
    containerRef,
    isLineWrapEnabled,
    requestSearchPanelOpen,
    setIsLineWrapEnabled,
    viewRef,
  }
}
