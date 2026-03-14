import { useEffect, useState } from 'react'
import { useModalDragPosition } from '../modal-drag-position'
import { useModalBackgroundWheelPassthrough } from '../modal-wheel-passthrough'
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
    setBody('')
  }, [isOpen, relativePath, selectionRange])

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

  if (!isOpen || !relativePath || !selectionRange) {
    return null
  }

  const trimmedBody = body.trim()
  const canSave = trimmedBody.length > 0 && !isSaving

  return (
    <div
      className="comment-modal-backdrop"
      onWheelCapture={handleWheelCapture}
      ref={backdropRef}
      role="presentation"
    >
      <form
        aria-label="Add comment"
        className={`comment-modal is-draggable${isDragging ? ' is-dragging' : ''}`}
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSave) {
            return
          }
          void onSave(trimmedBody)
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
            <h2>Add Comment</h2>
            <p className="comment-modal-target" title={relativePath}>
              {relativePath}:L{selectionRange.startLine}-L{selectionRange.endLine}
            </p>
          </div>
          <span className="comment-modal-drag-label">Drag to move</span>
        </div>
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
