import { useEffect, useState } from 'react'

type GlobalCommentsModalProps = {
  isOpen: boolean
  isSaving: boolean
  initialValue: string
  onCancel: () => void
  onSave: (body: string) => void | Promise<void>
}

export function GlobalCommentsModal({
  isOpen,
  isSaving,
  initialValue,
  onCancel,
  onSave,
}: GlobalCommentsModalProps) {
  const [body, setBody] = useState(initialValue)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setBody(initialValue)
  }, [initialValue, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSaving) {
        return
      }
      event.preventDefault()
      onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSaving, onCancel])

  if (!isOpen) {
    return null
  }

  return (
    <div className="comment-modal-backdrop" role="presentation">
      <form
        aria-label="Add global comments"
        className="comment-modal global-comments-modal"
        onSubmit={(event) => {
          event.preventDefault()
          if (isSaving) {
            return
          }
          void onSave(body)
        }}
        role="dialog"
      >
        <h2>Add Global Comments</h2>
        <p className="comment-modal-meta">
          These notes are exported before line comments.
        </p>
        <label className="comment-modal-label" htmlFor="global-comments-body">
          Global comments (Markdown)
        </label>
        <textarea
          autoFocus
          className="comment-modal-textarea"
          id="global-comments-body"
          onChange={(event) => {
            setBody(event.target.value)
          }}
          placeholder="Add global instructions, constraints, or context."
          rows={10}
          value={body}
        />
        <div className="comment-modal-actions">
          <button disabled={isSaving} onClick={onCancel} type="button">
            Cancel
          </button>
          <button disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : 'Save Global Comments'}
          </button>
        </div>
      </form>
    </div>
  )
}
