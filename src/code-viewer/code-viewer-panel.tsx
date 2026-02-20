import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computeSelectionRange,
  splitPreviewLines,
  type LineSelectionRange,
} from './line-selection'
import { getHighlightLanguage } from './language-map'
import { highlightLineContent } from './syntax-highlight'

export type CodeViewerJumpRequest = {
  targetRelativePath: string
  lineNumber: number
  token: number
}

type CodeViewerPanelProps = {
  activeFile: string | null
  activeFileContent: string | null
  isReadingFile: boolean
  readFileError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  jumpRequest: CodeViewerJumpRequest | null
  onSelectRange: (range: LineSelectionRange | null) => void
}

function getPreviewUnavailableMessage(
  reason: WorkspacePreviewUnavailableReason,
): string {
  if (reason === 'file_too_large') {
    return 'Preview unavailable: file exceeds 2MB limit.'
  }

  return 'Preview unavailable: binary file detected.'
}

export function CodeViewerPanel({
  activeFile,
  activeFileContent,
  isReadingFile,
  readFileError,
  previewUnavailableReason,
  selectionRange,
  jumpRequest,
  onSelectRange,
}: CodeViewerPanelProps) {
  const [anchorLine, setAnchorLine] = useState<number | null>(null)
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

  useEffect(() => {
    setAnchorLine(null)
  }, [activeFile])

  useEffect(() => {
    if (!selectionRange) {
      setAnchorLine(null)
    }
  }, [selectionRange])

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
    const nextSelection = computeSelectionRange(
      anchorLine,
      lineNumber,
      extendSelection,
    )
    setAnchorLine(nextSelection.anchorLine)
    onSelectRange(nextSelection.range)
  }

  const isLineSelected = (lineNumber: number) => {
    if (!selectionRange) {
      return false
    }

    return (
      lineNumber >= selectionRange.startLine && lineNumber <= selectionRange.endLine
    )
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
          Language: {highlightLanguage}
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
        !previewUnavailableReason && (
          <ol
            className="code-line-list"
            data-highlight-language={highlightLanguage}
            data-testid="code-viewer-content"
          >
            {previewLines.map((lineContent, lineIndex) => {
              const lineNumber = lineIndex + 1
              const isSelected = isLineSelected(lineNumber)
              const highlightedLine = highlightLineContent(
                lineContent,
                highlightLanguage,
              )

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
                    type="button"
                  >
                    <span className="code-line-number">{lineNumber}</span>
                    <span
                      className="code-line-content"
                      dangerouslySetInnerHTML={{
                        __html: lineContent.length > 0 ? highlightedLine : ' ',
                      }}
                    />
                  </button>
                </li>
              )
            })}
          </ol>
        )}
    </section>
  )
}
