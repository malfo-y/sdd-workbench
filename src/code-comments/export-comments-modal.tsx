import { useEffect, useMemo, useState } from 'react'

export type ExportCommentsModalInput = {
  instruction: string
  copyToClipboard: boolean
  writeCommentsFile: boolean
  writeBundleFile: boolean
}

type ExportCommentsModalProps = {
  isOpen: boolean
  isExporting: boolean
  commentCount: number
  pendingCommentCount: number
  hasGlobalComments: boolean
  allowExportWithoutPendingComments: boolean
  maxClipboardChars: number
  estimateBundleLength: (instruction: string) => number
  onCancel: () => void
  onConfirm: (input: ExportCommentsModalInput) => void | Promise<void>
}

export function ExportCommentsModal({
  isOpen,
  isExporting,
  commentCount,
  pendingCommentCount,
  hasGlobalComments,
  allowExportWithoutPendingComments,
  maxClipboardChars,
  estimateBundleLength,
  onCancel,
  onConfirm,
}: ExportCommentsModalProps) {
  const [instruction, setInstruction] = useState('')
  const [copyToClipboard, setCopyToClipboard] = useState(true)
  const [writeCommentsFile, setWriteCommentsFile] = useState(true)
  const [writeBundleFile, setWriteBundleFile] = useState(true)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setInstruction('')
    setCopyToClipboard(true)
    setWriteCommentsFile(true)
    setWriteBundleFile(true)
  }, [isOpen])

  const estimatedBundleLength = useMemo(
    () => estimateBundleLength(instruction),
    [estimateBundleLength, instruction],
  )
  const clipboardDisabled = estimatedBundleLength > maxClipboardChars

  useEffect(() => {
    if (!clipboardDisabled) {
      return
    }
    setCopyToClipboard(false)
  }, [clipboardDisabled])

  if (!isOpen) {
    return null
  }

  const hasExportableComments =
    pendingCommentCount > 0 || allowExportWithoutPendingComments
  const hasAnyTarget =
    (copyToClipboard && !clipboardDisabled) || writeCommentsFile || writeBundleFile
  const canSubmit = hasAnyTarget && hasExportableComments

  return (
    <div className="comment-modal-backdrop" role="presentation">
      <form
        aria-label="Export comments"
        className="comment-modal export-comments-modal"
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
          })
        }}
        role="dialog"
      >
        <h2>Export Comments</h2>
        <p className="comment-modal-meta">
          {commentCount} comment(s){hasGlobalComments ? ' + global comments' : ''} included
        </p>
        <p className="comment-modal-meta">{pendingCommentCount} pending comment(s)</p>
        <p className="comment-modal-meta">
          Global comments: {hasGlobalComments ? 'included' : 'not included'}
        </p>
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
