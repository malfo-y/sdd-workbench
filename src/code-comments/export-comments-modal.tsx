import { useEffect, useMemo, useState } from 'react'
import { useModalDragPosition } from '../modal-drag-position'
import { useModalBackgroundWheelPassthrough } from '../modal-wheel-passthrough'
import { useEscapeDismiss } from './use-escape-dismiss'

export type ExportCommentsModalInput = {
  instruction: string
  copyToClipboard: boolean
  writeCommentsFile: boolean
  writeBundleFile: boolean
  deleteExportedComments: boolean
  includePreviouslyExportedComments: boolean
}

type ExportCommentsModalProps = {
  isOpen: boolean
  isExporting: boolean
  commentCount: number
  pendingCommentCount: number
  exportedCommentCount: number
  hasGlobalComments: boolean
  allowExportWithoutPendingComments: boolean
  maxClipboardChars: number
  estimateBundleLength: (
    instruction: string,
    options?: {
      includePreviouslyExportedComments?: boolean
    },
  ) => number
  onCancel: () => void
  onConfirm: (input: ExportCommentsModalInput) => void | Promise<void>
  onResetExportedComments?: () => void | Promise<void>
}

export function ExportCommentsModal({
  isOpen,
  isExporting,
  commentCount,
  pendingCommentCount,
  exportedCommentCount,
  hasGlobalComments,
  allowExportWithoutPendingComments,
  maxClipboardChars,
  estimateBundleLength,
  onCancel,
  onConfirm,
  onResetExportedComments,
}: ExportCommentsModalProps) {
  const [instruction, setInstruction] = useState('')
  const [copyToClipboard, setCopyToClipboard] = useState(true)
  const [writeCommentsFile, setWriteCommentsFile] = useState(true)
  const [writeBundleFile, setWriteBundleFile] = useState(true)
  const [deleteExportedComments, setDeleteExportedComments] = useState(true)
  const [includePreviouslyExportedComments, setIncludePreviouslyExportedComments] =
    useState(false)
  const { backdropRef, dialogRef, handleWheelCapture } =
    useModalBackgroundWheelPassthrough<HTMLFormElement>()
  const { dialogStyle, isDragging, dragHandleProps } = useModalDragPosition({
    dialogRef,
    isOpen,
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setInstruction('')
    setCopyToClipboard(true)
    setWriteCommentsFile(true)
    setWriteBundleFile(true)
    setDeleteExportedComments(true)
    setIncludePreviouslyExportedComments(false)
  }, [isOpen])

  const estimatedBundleLength = useMemo(
    () =>
      estimateBundleLength(instruction, {
        includePreviouslyExportedComments,
      }),
    [estimateBundleLength, includePreviouslyExportedComments, instruction],
  )
  const clipboardDisabled = estimatedBundleLength > maxClipboardChars

  useEffect(() => {
    if (!clipboardDisabled) {
      return
    }
    setCopyToClipboard(false)
  }, [clipboardDisabled])

  useEscapeDismiss({
    isEnabled: isOpen,
    canDismiss: !isExporting,
    onDismiss: onCancel,
  })

  if (!isOpen) {
    return null
  }

  const hasExportableComments =
    pendingCommentCount > 0 ||
    (includePreviouslyExportedComments && exportedCommentCount > 0) ||
    allowExportWithoutPendingComments
  const hasAnyTarget =
    (copyToClipboard && !clipboardDisabled) || writeCommentsFile || writeBundleFile
  const canSubmit = hasAnyTarget && hasExportableComments

  return (
    <div
      className="comment-modal-backdrop"
      onWheelCapture={handleWheelCapture}
      ref={backdropRef}
      role="presentation"
    >
      <form
        aria-label="Export comments"
        className={`comment-modal export-comments-modal is-draggable${isDragging ? ' is-dragging' : ''}`}
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit || isExporting) {
            return
          }
          void onConfirm({
            instruction,
            copyToClipboard: copyToClipboard && !clipboardDisabled,
            writeCommentsFile,
            writeBundleFile,
            deleteExportedComments,
            includePreviouslyExportedComments,
          })
        }}
        ref={dialogRef}
        role="dialog"
        style={dialogStyle}
      >
        <div
          className="comment-modal-header"
          data-testid="comment-modal-drag-handle"
          {...dragHandleProps}
        >
          <div className="comment-modal-header-main">
            <h2>Export Comments</h2>
            <p className="comment-modal-meta">
              {commentCount} comment(s){hasGlobalComments ? ' + global comments' : ''} included
            </p>
            <p className="comment-modal-meta">{pendingCommentCount} pending comment(s)</p>
            <p className="comment-modal-meta">{exportedCommentCount} exported comment(s)</p>
            <p className="comment-modal-meta">
              Global comments: {hasGlobalComments ? 'included' : 'not included'}
            </p>
          </div>
          <span className="comment-modal-drag-label">Drag to move</span>
        </div>
        <label className="comment-modal-label" htmlFor="export-instruction">
          Instruction for LLM
        </label>
        <textarea
          autoFocus
          className="comment-modal-textarea"
          id="export-instruction"
          onChange={(event) => {
            setInstruction(event.target.value)
          }}
          placeholder="Describe what the model should do with these comments."
          rows={6}
          value={instruction}
        />

        <fieldset className="export-comments-options">
          <legend>Export targets</legend>
          {exportedCommentCount > 0 && (
            <label>
              <input
                checked={includePreviouslyExportedComments}
                disabled={isExporting}
                onChange={(event) => {
                  setIncludePreviouslyExportedComments(event.target.checked)
                }}
                type="checkbox"
              />
              Include already-exported comments
            </label>
          )}
          <label>
            <input
              checked={copyToClipboard && !clipboardDisabled}
              disabled={clipboardDisabled || isExporting}
              onChange={(event) => {
                setCopyToClipboard(event.target.checked)
              }}
              type="checkbox"
            />
            Copy bundle to clipboard
          </label>
          <label>
            <input
              checked={writeCommentsFile}
              disabled={isExporting}
              onChange={(event) => {
                setWriteCommentsFile(event.target.checked)
              }}
              type="checkbox"
            />
            Write `_COMMENTS.md`
          </label>
          <label>
            <input
              checked={writeBundleFile}
              disabled={isExporting}
              onChange={(event) => {
                setWriteBundleFile(event.target.checked)
              }}
              type="checkbox"
            />
            Write bundle file (`.sdd-workbench/exports`)
          </label>
          <label>
            <input
              checked={deleteExportedComments}
              disabled={isExporting}
              onChange={(event) => {
                setDeleteExportedComments(event.target.checked)
              }}
              type="checkbox"
            />
            Delete exported comments
          </label>
        </fieldset>

        <p className="comment-modal-meta">
          Estimated bundle length: {estimatedBundleLength.toLocaleString()} chars
        </p>
        {clipboardDisabled && (
          <p className="comment-modal-warning" role="status">
            Clipboard copy is disabled when bundle exceeds {maxClipboardChars.toLocaleString()} chars.
          </p>
        )}
        {!hasAnyTarget && (
          <p className="comment-modal-warning" role="status">
            Select at least one export target.
          </p>
        )}
        {!hasExportableComments && (
          <p className="comment-modal-warning" role="status">
            No pending comments to export.
          </p>
        )}
        {exportedCommentCount > 0 && onResetExportedComments && (
          <div className="export-comments-secondary-actions">
            <button
              disabled={isExporting}
              onClick={() => {
                void onResetExportedComments()
              }}
              type="button"
            >
              Reset exported comments to pending
            </button>
          </div>
        )}

        <div className="comment-modal-actions">
          <button disabled={isExporting} onClick={onCancel} type="button">
            Cancel
          </button>
          <button disabled={!canSubmit || isExporting} type="submit">
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </form>
    </div>
  )
}
