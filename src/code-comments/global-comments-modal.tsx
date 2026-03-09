import { useEffect, useState } from 'react'
import { useModalBackgroundWheelPassthrough } from '../modal-wheel-passthrough'

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
  const { backdropRef, dialogRef, handleWheelCapture } =
    useModalBackgroundWheelPassthrough<HTMLFormElement>()

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
    <div
      className="comment-modal-backdrop"
      onWheelCapture={handleWheelCapture}
      ref={backdropRef}
      role="presentation"
    >
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
        ref={dialogRef}
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
