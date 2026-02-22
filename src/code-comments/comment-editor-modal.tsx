import { useEffect, useState } from 'react'
import type { LineSelectionRange } from '../workspace/workspace-model'

type CommentEditorModalProps = {
  isOpen: boolean
  isSaving: boolean
  relativePath: string | null
  selectionRange: LineSelectionRange | null
  onCancel: () => void
  onSave: (body: string) => void | Promise<void>
}

export function CommentEditorModal({
  isOpen,
  isSaving,
  relativePath,
  selectionRange,
  onCancel,
  onSave,
}: CommentEditorModalProps) {
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setBody('')
  }, [isOpen, relativePath, selectionRange])

  if (!isOpen || !relativePath || !selectionRange) {
    return null
  }

  const trimmedBody = body.trim()
  const canSave = trimmedBody.length > 0 && !isSaving

  return (
    <div className="comment-modal-backdrop" role="presentation">
      <form
        aria-label="Add comment"
        className="comment-modal"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSave) {
            return
          }
          void onSave(trimmedBody)
        }}
        role="dialog"
      >
        <h2>Add Comment</h2>
        <p className="comment-modal-target" title={relativePath}>
          {relativePath}:L{selectionRange.startLine}-L{selectionRange.endLine}
        </p>
        <label className="comment-modal-label" htmlFor="comment-editor-body">
          Comment
        </label>
        <textarea
          autoFocus
          className="comment-modal-textarea"
          id="comment-editor-body"
          onChange={(event) => {
            setBody(event.target.value)
          }}
          placeholder="What should be changed here?"
          rows={6}
          value={body}
        />
        <div className="comment-modal-actions">
          <button disabled={isSaving} onClick={onCancel} type="button">
            Cancel
          </button>
          <button disabled={!canSave} type="submit">
            {isSaving ? 'Saving...' : 'Save Comment'}
          </button>
        </div>
      </form>
    </div>
  )
}
