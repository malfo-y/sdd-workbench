import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppearanceTheme } from '../appearance-theme'
import type { LineSelectionRange } from '../workspace/workspace-model'
import type { WorkspaceGitLineMarkerKind } from '../workspace/workspace-model'
import { findMostRecentCommentInSelectionRange } from '../code-comments/comment-line-index'
import type { CodeComment } from '../code-comments/comment-types'
import { CopyActionPopover } from '../context-menu/copy-action-popover'
import { getCodeLanguageInfo } from '../code-viewer/language-map'
import { CommentHoverPopover } from '../code-comments/comment-hover-popover'
import { CommentMarkerDetailPanel } from '../code-comments/comment-marker-detail-panel'
import {
  CodeEditorJumpRequest,
  type CodeViewerJumpRequest,
  useCodeEditorView,
} from './use-code-editor-view'
import { selectionToLineRange } from './cm6-selection-bridge'

type CodeEditorPanelProps = {
  activeFile: string | null
  activeFileContent: string | null
  activeFileImagePreview: WorkspaceImagePreview | null
  appearanceTheme?: AppearanceTheme
  isActive?: boolean
  isReadingFile: boolean
  readFileError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  jumpRequest: CodeEditorJumpRequest | null
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
  onRequestEditComment: (comment: CodeComment) => void
  onRequestDeleteComment: (comment: CodeComment) => void
  onRequestGoToSpec: (input: { relativePath: string; lineNumber: number }) => void
  onRequestEditInVsCode?: (relativePath: string) => void
  commentLineCounts: ReadonlyMap<number, number>
  commentLineEntries?: ReadonlyMap<number, readonly CodeComment[]>
  gitLineMarkers?: ReadonlyMap<number, WorkspaceGitLineMarkerKind>
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

export type { CodeEditorJumpRequest, CodeViewerJumpRequest }

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
    return 'Preview unavailable: file exceeds 10MB limit.'
  }
  if (reason === 'blocked_resource') {
    return 'Preview unavailable: blocked resource by policy.'
  }
  return 'Preview unavailable: binary file detected.'
}

function isMarkdownFile(filePath: string | null): boolean {
  return typeof filePath === 'string' && filePath.toLowerCase().endsWith('.md')
}

function isEditableElement(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  )
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

function EditInVsCodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4 17.25V20h2.75L17.8 8.94l-2.75-2.75L4 17.25Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13.96 5.44 16.7 8.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Product surface is a viewer; CM6 stays underneath as the read-only engine
// because search, selection, jump/highlight, and gutter interactions all depend on it.
export function CodeEditorPanel({
  activeFile,
  activeFileContent,
  activeFileImagePreview,
  appearanceTheme = 'dark-gray',
  isActive = true,
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
  onRequestEditComment,
  onRequestDeleteComment,
  onRequestGoToSpec,
  onRequestEditInVsCode,
  commentLineCounts,
  commentLineEntries,
  gitLineMarkers,
  onScrollChange,
  restoredScrollTop = null,
}: CodeEditorPanelProps) {
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(
    null,
  )
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didInitializeSurfaceRef = useRef(false)
  const [commentHoverState, setCommentHoverState] = useState<CommentHoverState | null>(null)
  const [commentDetailState, setCommentDetailState] = useState<CommentHoverState | null>(
    null,
  )

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

  const closeCommentDetail = useCallback(() => {
    setCommentDetailState(null)
  }, [])

  const scheduleCommentHoverClose = useCallback(() => {
    clearHoverCloseTimer()
    hoverCloseTimerRef.current = setTimeout(() => {
      setCommentHoverState(null)
      hoverCloseTimerRef.current = null
    }, HOVER_POPOVER_CLOSE_DELAY_MS)
  }, [clearHoverCloseTimer])

  useEffect(() => {
    setCommentHoverState(null)
    setCommentDetailState(null)
  }, [activeFile])

  const handleCommentHover = useCallback((lineNumber: number, rect: DOMRect) => {
    const entries = commentLineEntries?.get(lineNumber) ?? []
    if (entries.length === 0) return
    clearHoverCloseTimer()
    setCommentHoverState({ x: rect.right, y: rect.top, lineNumber, comments: entries })
  }, [clearHoverCloseTimer, commentLineEntries])

  const imagePreview = isRenderableImagePreview(activeFileImagePreview)
    ? activeFileImagePreview
    : null
  const isImagePreviewMode = Boolean(imagePreview)
  const isMarkdownSourceFile = isMarkdownFile(activeFile)
  const displayLanguage = isImagePreviewMode
    ? 'image'
    : getCodeLanguageInfo(activeFile).displayLanguage
  const editableComment =
    contextMenuState && commentLineEntries
      ? findMostRecentCommentInSelectionRange(
          commentLineEntries,
          contextMenuState.selectionRange,
        )
      : null

  const shouldMountEditor = activeFile !== null && !isImagePreviewMode
  const showEditor =
    shouldMountEditor &&
    !readFileError &&
    !previewUnavailableReason &&
    activeFileContent !== null

  const {
    containerRef,
    isLineWrapEnabled,
    requestSearchPanelOpen,
    setIsLineWrapEnabled,
    viewRef,
  } = useCodeEditorView({
    activeFile,
    activeFileContent,
    appearanceTheme,
    commentLineCounts,
    commentLineEntries,
    gitLineMarkers,
    jumpRequest,
    onCommentHover: handleCommentHover,
    onCommentLeave: scheduleCommentHoverClose,
    onScrollChange,
    onSelectRange,
    restoredScrollTop,
    shouldMountEditor,
  })

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
  }, [activeFile, containerRef, shouldMountEditor, viewRef])

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      const isFindShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'f'
      if (!isFindShortcut || !isActive || !showEditor) {
        return
      }

      const container = containerRef.current
      if (
        isEditableElement(event.target) &&
        (!container || !container.contains(event.target))
      ) {
        return
      }

      const view = viewRef.current
      if (!view) {
        return
      }

      event.preventDefault()
      requestSearchPanelOpen()
    }

    window.addEventListener('keydown', handleWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown)
    }
  }, [containerRef, isActive, requestSearchPanelOpen, showEditor, viewRef])

  useEffect(() => {
    if (!showEditor) {
      return
    }
    const view = viewRef.current
    if (!view) {
      return
    }
    const frame = requestAnimationFrame(() => {
      view.requestMeasure()
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [showEditor, viewRef])

  // ---- Reset context menu on file change ---------------------------------
  useEffect(() => {
    if (!didInitializeSurfaceRef.current) {
      didInitializeSurfaceRef.current = true
      return
    }
    setContextMenuState(null)
    setCommentHoverState(null)
  }, [
    activeFile,
    activeFileImagePreview,
    previewUnavailableReason,
  ])

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null)
  }, [])

  return (
    <section
      className="code-editor-panel code-viewer-panel"
      data-appearance-theme={appearanceTheme}
      data-testid="code-viewer-panel"
    >
      <header className="code-editor-header code-viewer-header">
        <div className="code-editor-title-row code-viewer-title-row">
          <p className="label">Code Viewer</p>
          <div className="code-editor-header-actions code-viewer-header-actions">
            <button
              aria-label="Edit in VSCode"
              className="code-editor-edit-button code-viewer-edit-button"
              data-testid="code-viewer-edit-in-vscode-button"
              disabled={!activeFile || !onRequestEditInVsCode}
              onClick={() => {
                if (!activeFile || !onRequestEditInVsCode) {
                  return
                }
                onRequestEditInVsCode(activeFile)
              }}
              title="Edit in VSCode"
              type="button"
            >
              <EditInVsCodeIcon />
              <span>Edit</span>
            </button>
            <button
              aria-label="Toggle code wrap"
              aria-pressed={isLineWrapEnabled}
              className="code-editor-wrap-toggle-button code-viewer-wrap-toggle-button"
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
              className="code-editor-copy-path-button code-viewer-copy-path-button"
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

      {shouldMountEditor && (
        <div
          className="code-editor-cm6-container"
          data-testid="code-viewer-content"
          hidden={!showEditor}
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
            ...(editableComment
              ? [
                  {
                    label: 'Edit Comment',
                    onSelect: () => {
                      onRequestEditComment(editableComment)
                    },
                  },
                  {
                    label: 'Delete Comment',
                    onSelect: () => {
                      onRequestDeleteComment(editableComment)
                    },
                  },
                ]
              : []),
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
          onOpenDetails={() => {
            setCommentDetailState(commentHoverState)
            closeCommentHover()
          }}
          onMouseEnter={clearHoverCloseTimer}
          onMouseLeave={scheduleCommentHoverClose}
          x={commentHoverState.x}
          y={commentHoverState.y}
        />
      )}
      {commentDetailState && !isImagePreviewMode && (
        <CommentMarkerDetailPanel
          comments={commentDetailState.comments}
          lineNumber={commentDetailState.lineNumber}
          onClose={closeCommentDetail}
          onRequestDeleteComment={onRequestDeleteComment}
          onRequestEditComment={onRequestEditComment}
          x={commentDetailState.x}
          y={commentDetailState.y}
        />
      )}
    </section>
  )
}
