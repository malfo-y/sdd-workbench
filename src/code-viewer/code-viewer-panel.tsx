import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import {
  computeSelectionRange,
  normalizeLineSelectionRange,
  splitPreviewLines,
  type LineSelectionRange,
} from './line-selection'
import { CopyActionPopover } from '../context-menu/copy-action-popover'
import { getHighlightLanguage } from './language-map'
import { escapeHtml, highlightPreviewLines } from './syntax-highlight'
import { CommentHoverPopover } from '../code-comments/comment-hover-popover'
import type { CodeComment } from '../code-comments/comment-types'
import type { WorkspaceGitLineMarkerKind } from '../workspace/workspace-model'

export type CodeViewerJumpRequest = {
  targetRelativePath: string
  lineNumber: number
  token: number
}

type CodeViewerPanelProps = {
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

export function CodeViewerPanel({
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
  commentLineEntries = EMPTY_COMMENT_LINE_ENTRIES,
  gitLineMarkers = EMPTY_GIT_LINE_MARKERS,
}: CodeViewerPanelProps) {
  const [anchorLine, setAnchorLine] = useState<number | null>(null)
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(
    null,
  )
  const [commentHoverState, setCommentHoverState] =
    useState<CommentHoverState | null>(null)
  const dragSelectionRef = useRef<{
    anchorLine: number
    hasMoved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)
  const lineButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const lastHandledJumpTokenRef = useRef<number | null>(null)
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewLines = useMemo(
    () => splitPreviewLines(activeFileContent ?? ''),
    [activeFileContent],
  )
  const highlightLanguage = useMemo(
    () => getHighlightLanguage(activeFile),
    [activeFile],
  )
  const imagePreview = isRenderableImagePreview(activeFileImagePreview)
    ? activeFileImagePreview
    : null
  const isImagePreviewMode = Boolean(imagePreview)
  const displayLanguage = isImagePreviewMode ? 'image' : highlightLanguage
  const plaintextLines = useMemo(
    () => previewLines.map((line) => (line.length > 0 ? escapeHtml(line) : ' ')),
    [previewLines],
  )
  const [highlightedLines, setHighlightedLines] = useState<string[]>(plaintextLines)

  useEffect(() => {
    setHighlightedLines(plaintextLines)

    if (highlightLanguage === 'plaintext' || previewLines.length === 0) {
      return
    }

    let cancelled = false
    highlightPreviewLines(previewLines, highlightLanguage).then((result) => {
      if (!cancelled) {
        setHighlightedLines(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [previewLines, highlightLanguage, plaintextLines])

  useEffect(() => {
    setAnchorLine(null)
    setContextMenuState(null)
    setCommentHoverState(null)
    dragSelectionRef.current = null
    suppressClickRef.current = false
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }
  }, [activeFile, activeFileImagePreview, previewUnavailableReason])

  useEffect(
    () => () => {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current)
        hoverCloseTimerRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    if (!selectionRange) {
      setAnchorLine(null)
    }
  }, [selectionRange])

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null)
  }, [])

  const clearHoverCloseTimer = useCallback(() => {
    if (!hoverCloseTimerRef.current) {
      return
    }
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

  const handleCommentBadgeMouseEnter = useCallback(
    (
      event: MouseEvent<HTMLElement>,
      lineNumber: number,
      comments: readonly CodeComment[],
    ) => {
      if (comments.length === 0) {
        closeCommentHover()
        return
      }
      clearHoverCloseTimer()
      setCommentHoverState({
        x: event.clientX,
        y: event.clientY,
        lineNumber,
        comments,
      })
    },
    [clearHoverCloseTimer, closeCommentHover],
  )

  useEffect(() => {
    const handleWindowMouseUp = () => {
      const dragSelectionState = dragSelectionRef.current
      if (!dragSelectionState) {
        return
      }

      if (dragSelectionState.hasMoved) {
        suppressClickRef.current = true
      }

      dragSelectionRef.current = null
    }

    window.addEventListener('mouseup', handleWindowMouseUp)
    window.addEventListener('blur', handleWindowMouseUp)

    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp)
      window.removeEventListener('blur', handleWindowMouseUp)
    }
  }, [])

  useEffect(() => {
    if (!jumpRequest || !activeFileContent || !activeFile) {
      return
    }

    if (lastHandledJumpTokenRef.current === jumpRequest.token) {
      return
    }

    if (activeFile !== jumpRequest.targetRelativePath) {
      return
    }

    const lineCount = previewLines.length
    if (lineCount === 0) {
      return
    }

    const normalizedLineNumber = Math.min(
      Math.max(1, jumpRequest.lineNumber),
      lineCount,
    )

    const targetLineButton = lineButtonRefs.current[normalizedLineNumber]
    if (!targetLineButton) {
      return
    }

    if (typeof targetLineButton.scrollIntoView === 'function') {
      targetLineButton.scrollIntoView({ block: 'center' })
    }
    lastHandledJumpTokenRef.current = jumpRequest.token
  }, [activeFile, activeFileContent, jumpRequest, previewLines])

  const handleLineClick = (lineNumber: number, extendSelection: boolean) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    const nextSelection = computeSelectionRange(
      anchorLine,
      lineNumber,
      extendSelection,
    )
    setAnchorLine(nextSelection.anchorLine)
    onSelectRange(nextSelection.range)
  }

  const handleLineMouseDown = (
    event: MouseEvent<HTMLButtonElement>,
    lineNumber: number,
  ) => {
    if (event.button !== 0 || event.shiftKey) {
      return
    }

    event.preventDefault()
    dragSelectionRef.current = {
      anchorLine: lineNumber,
      hasMoved: false,
    }
    setAnchorLine(lineNumber)
    onSelectRange({
      startLine: lineNumber,
      endLine: lineNumber,
    })
  }

  const handleLineMouseEnter = (
    event: MouseEvent<HTMLButtonElement>,
    lineNumber: number,
  ) => {
    const dragSelectionState = dragSelectionRef.current
    if (!dragSelectionState) {
      return
    }

    if ((event.buttons & 1) !== 1) {
      dragSelectionRef.current = null
      return
    }

    const nextRange = normalizeLineSelectionRange(
      dragSelectionState.anchorLine,
      lineNumber,
    )
    onSelectRange(nextRange)
    if (lineNumber !== dragSelectionState.anchorLine) {
      dragSelectionState.hasMoved = true
    }
  }

  const isLineSelected = (lineNumber: number) => {
    if (!selectionRange) {
      return false
    }

    return (
      lineNumber >= selectionRange.startLine && lineNumber <= selectionRange.endLine
    )
  }

  const isSelectionRangeIncludingLine = (
    range: LineSelectionRange,
    lineNumber: number,
  ) => lineNumber >= range.startLine && lineNumber <= range.endLine

  const handleLineContextMenu = (
    event: MouseEvent<HTMLButtonElement>,
    lineNumber: number,
  ) => {
    if (!activeFile) {
      return
    }

    event.preventDefault()
    dragSelectionRef.current = null
    suppressClickRef.current = false
    closeCommentHover()

    const shouldKeepSelection =
      selectionRange !== null &&
      isSelectionRangeIncludingLine(selectionRange, lineNumber)

    const nextSelectionRange = shouldKeepSelection
      ? selectionRange
      : {
          startLine: lineNumber,
          endLine: lineNumber,
        }

    if (!nextSelectionRange) {
      return
    }

    if (!shouldKeepSelection) {
      setAnchorLine(lineNumber)
      onSelectRange(nextSelectionRange)
    }

    setContextMenuState({
      x: event.clientX,
      y: event.clientY,
      relativePath: activeFile,
      selectionRange: nextSelectionRange,
    })
  }

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
        <p className="path" data-testid="code-viewer-active-file" title={activeFile ?? ''}>
          {activeFile ?? 'No active file'}
        </p>
        <p className="code-viewer-selection" data-testid="code-viewer-selection-range">
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
        <p className="code-viewer-error" data-testid="code-viewer-error" role="alert">
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
          <div className="code-viewer-image-preview" data-testid="code-viewer-image-preview">
            <img
              alt={`Image preview for ${activeFile}`}
              src={imagePreview.dataUrl}
            />
          </div>
        )}

      {activeFile &&
        !isReadingFile &&
        !readFileError &&
        !previewUnavailableReason &&
        !imagePreview && (
          <ol
            className="code-line-list"
            data-highlight-language={highlightLanguage}
            data-testid="code-viewer-content"
          >
            {previewLines.map((_, lineIndex) => {
              const lineNumber = lineIndex + 1
              const isSelected = isLineSelected(lineNumber)
              const highlightedLine = highlightedLines[lineIndex] ?? ' '
              const commentCount = commentLineCounts.get(lineNumber) ?? 0
              const gitLineMarkerKind = gitLineMarkers.get(lineNumber) ?? null

              return (
                <li
                  className={`code-line-row ${isSelected ? 'is-selected' : ''}`}
                  key={lineNumber}
                >
                  <button
                    className="code-line-button"
                    data-testid={`code-line-${lineNumber}`}
                    ref={(element) => {
                      lineButtonRefs.current[lineNumber] = element
                    }}
                    onClick={(event) =>
                      handleLineClick(lineNumber, event.shiftKey)
                    }
                    onMouseDown={(event) => {
                      handleLineMouseDown(event, lineNumber)
                    }}
                    onMouseEnter={(event) => {
                      handleLineMouseEnter(event, lineNumber)
                    }}
                    onContextMenu={(event) => {
                      handleLineContextMenu(event, lineNumber)
                    }}
                    type="button"
                  >
                    <span className="code-line-number-wrap">
                      {gitLineMarkerKind && (
                        <span
                          aria-label={`Git ${gitLineMarkerKind} marker`}
                          className={`code-line-git-marker code-line-git-marker-${gitLineMarkerKind}`}
                          data-kind={gitLineMarkerKind}
                          data-testid={`code-line-git-marker-${lineNumber}`}
                          title={`Git: ${gitLineMarkerKind}`}
                        />
                      )}
                      <span className="code-line-number">{lineNumber}</span>
                      {commentCount > 0 && (
                        <span
                          className="code-line-comment-badge"
                          data-testid={`code-line-comment-badge-${lineNumber}`}
                          onMouseEnter={(event) => {
                            handleCommentBadgeMouseEnter(
                              event,
                              lineNumber,
                              commentLineEntries.get(lineNumber) ?? [],
                            )
                          }}
                          onMouseLeave={() => {
                            scheduleCommentHoverClose()
                          }}
                          title={`${commentCount} comment(s)`}
                        >
                          {commentCount}
                        </span>
                      )}
                    </span>
                    <span
                      className="code-line-content"
                      dangerouslySetInnerHTML={{
                        __html: highlightedLine,
                      }}
                    />
                  </button>
                </li>
              )
            })}
          </ol>
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
      {commentHoverState && (
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

const EMPTY_COMMENT_LINE_ENTRIES: ReadonlyMap<number, readonly CodeComment[]> = new Map()
const EMPTY_GIT_LINE_MARKERS: ReadonlyMap<number, WorkspaceGitLineMarkerKind> =
  new Map()
