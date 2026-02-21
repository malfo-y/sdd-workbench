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
import * as syntaxHighlight from './syntax-highlight'

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
}

type ContextMenuState = {
  x: number
  y: number
  relativePath: string
  selectionRange: LineSelectionRange
}

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
}: CodeViewerPanelProps) {
  const [anchorLine, setAnchorLine] = useState<number | null>(null)
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(
    null,
  )
  const dragSelectionRef = useRef<{
    anchorLine: number
    hasMoved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)
  const lineButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const lastHandledJumpTokenRef = useRef<number | null>(null)
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
  const highlightedPreviewLines = useMemo(
    () => syntaxHighlight.highlightPreviewLines(previewLines, highlightLanguage),
    [previewLines, highlightLanguage],
  )

  useEffect(() => {
    setAnchorLine(null)
    setContextMenuState(null)
    dragSelectionRef.current = null
    suppressClickRef.current = false
  }, [activeFile, activeFileImagePreview, previewUnavailableReason])

  useEffect(() => {
    if (!selectionRange) {
      setAnchorLine(null)
    }
  }, [selectionRange])

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null)
  }, [])

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
        <p className="label">Code Preview</p>
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
              const highlightedLine = highlightedPreviewLines[lineIndex] ?? ' '

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
                    <span className="code-line-number">{lineNumber}</span>
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
