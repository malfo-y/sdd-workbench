import { useEffect, useMemo, useState } from 'react'
import {
  sanitizeCommentBody,
  sortCodeComments,
  type CodeComment,
} from './comment-types'

type CommentListModalProps = {
  isOpen: boolean
  isSaving: boolean
  comments: readonly CodeComment[]
  onClose: () => void
  onUpdateComment: (
    commentId: string,
    body: string,
  ) => boolean | Promise<boolean>
  onDeleteComment: (commentId: string) => boolean | Promise<boolean>
  onDeleteExportedComments: () => boolean | Promise<boolean>
}

const COLLAPSED_BODY_MAX_CHARS = 180

function formatLineRange(startLine: number, endLine: number) {
  if (startLine === endLine) {
    return `L${startLine}`
  }
  return `L${startLine}-L${endLine}`
}

function summarizeCommentBody(body: string) {
  const normalized = body.replace(/\s+/g, ' ').trim()
  if (normalized.length <= COLLAPSED_BODY_MAX_CHARS) {
    return normalized
  }
  return `${normalized.slice(0, COLLAPSED_BODY_MAX_CHARS - 1)}…`
}

function isLongCommentBody(body: string) {
  return body.includes('\n') || body.trim().length > COLLAPSED_BODY_MAX_CHARS
}

export function CommentListModal({
  isOpen,
  isSaving,
  comments,
  onClose,
  onUpdateComment,
  onDeleteComment,
  onDeleteExportedComments,
}: CommentListModalProps) {
  const sortedComments = useMemo(() => sortCodeComments([...comments]), [comments])
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<string | null>(
    null,
  )
  const [isDeleteExportedConfirmOpen, setIsDeleteExportedConfirmOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setExpandedCommentIds(new Set())
    setEditingCommentId(null)
    setEditingBody('')
    setPendingDeleteCommentId(null)
    setIsDeleteExportedConfirmOpen(false)
  }, [isOpen])

  useEffect(() => {
    if (!editingCommentId) {
      return
    }
    const stillExists = sortedComments.some((comment) => comment.id === editingCommentId)
    if (!stillExists) {
      setEditingCommentId(null)
      setEditingBody('')
    }
  }, [editingCommentId, sortedComments])

  const exportedCommentCount = sortedComments.filter(
    (comment) => Boolean(comment.exportedAt),
  ).length

  if (!isOpen) {
    return null
  }

  const handleToggleExpanded = (commentId: string) => {
    setExpandedCommentIds((previous) => {
      const next = new Set(previous)
      if (next.has(commentId)) {
        next.delete(commentId)
      } else {
        next.add(commentId)
      }
      return next
    })
  }

  const editingTargetComment = editingCommentId
    ? sortedComments.find((comment) => comment.id === editingCommentId) ?? null
    : null
  const sanitizedEditingBody = sanitizeCommentBody(editingBody)
  const canSaveEdit = Boolean(
    !isSaving &&
      editingTargetComment &&
      sanitizedEditingBody.length > 0 &&
      sanitizedEditingBody !== editingTargetComment.body,
  )

  const handleSaveEditedComment = async () => {
    if (!editingCommentId || !canSaveEdit) {
      return
    }

    const didSave = await onUpdateComment(editingCommentId, sanitizedEditingBody)
    if (!didSave) {
      return
    }

    setEditingCommentId(null)
    setEditingBody('')
  }

  const handleConfirmDeleteComment = async (commentId: string) => {
    const didDelete = await onDeleteComment(commentId)
    if (!didDelete) {
      return
    }

    setPendingDeleteCommentId(null)
    setEditingCommentId(null)
    setEditingBody('')
  }

  const handleConfirmDeleteExportedComments = async () => {
    const didDelete = await onDeleteExportedComments()
    if (!didDelete) {
      return
    }

    setIsDeleteExportedConfirmOpen(false)
    setPendingDeleteCommentId(null)
  }

  return (
    <div className="comment-modal-backdrop" role="presentation">
      <div aria-label="View comments" className="comment-modal comment-list-modal" role="dialog">
        <div className="comment-list-modal-header">
          <h2>View Comments</h2>
          <p className="comment-modal-meta">
            {sortedComments.length} comment(s) total
          </p>
        </div>

        <div className="comment-list-modal-actions">
          {!isDeleteExportedConfirmOpen && (
            <button
              disabled={isSaving || exportedCommentCount === 0}
              onClick={() => {
                setIsDeleteExportedConfirmOpen(true)
              }}
              type="button"
            >
              Delete Exported
            </button>
          )}
          {isDeleteExportedConfirmOpen && (
            <div className="comment-list-confirm-actions">
              <p className="comment-modal-warning" role="status">
                Delete {exportedCommentCount} exported comment(s)?
              </p>
              <button
                disabled={isSaving}
                onClick={() => {
                  void handleConfirmDeleteExportedComments()
                }}
                type="button"
              >
                Confirm Delete Exported
              </button>
              <button
                disabled={isSaving}
                onClick={() => {
                  setIsDeleteExportedConfirmOpen(false)
                }}
                type="button"
              >
                Cancel Delete Exported
              </button>
            </div>
          )}
        </div>

        <ul className="comment-list-items" data-testid="comment-list-items">
          {sortedComments.length === 0 && (
            <li className="comment-list-empty">No comments yet.</li>
          )}
          {sortedComments.map((comment) => {
            const isExpanded = expandedCommentIds.has(comment.id)
            const isEditing = editingCommentId === comment.id
            const isPendingDelete = pendingDeleteCommentId === comment.id
            const bodyIsLong = isLongCommentBody(comment.body)
            const displayBody = isExpanded
              ? comment.body
              : summarizeCommentBody(comment.body)

            return (
              <li
                className="comment-list-item"
                data-testid={`comment-list-item-${comment.id}`}
                key={comment.id}
              >
                <div className="comment-list-item-meta">
                  <p className="comment-modal-target" title={comment.relativePath}>
                    {comment.relativePath}:{formatLineRange(
                      comment.startLine,
                      comment.endLine,
                    )}
                  </p>
                  <p className="comment-modal-meta">{comment.createdAt}</p>
                  {comment.exportedAt && (
                    <p className="comment-modal-meta">exported: {comment.exportedAt}</p>
                  )}
                </div>

                {!isEditing && (
                  <div className="comment-list-item-body-wrap">
                    <pre className="comment-list-item-body">{displayBody}</pre>
                    {bodyIsLong && (
                      <button
                        className="comment-list-expand-button"
                        onClick={() => {
                          handleToggleExpanded(comment.id)
                        }}
                        type="button"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div className="comment-list-edit-form">
                    <label className="comment-modal-label" htmlFor={`comment-edit-${comment.id}`}>
                      Edit comment body
                    </label>
                    <textarea
                      className="comment-modal-textarea"
                      id={`comment-edit-${comment.id}`}
                      onChange={(event) => {
                        setEditingBody(event.target.value)
                      }}
                      rows={5}
                      value={editingBody}
                    />
                    <div className="comment-modal-actions">
                      <button
                        disabled={isSaving}
                        onClick={() => {
                          setEditingCommentId(null)
                          setEditingBody('')
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!canSaveEdit}
                        onClick={() => {
                          void handleSaveEditedComment()
                        }}
                        type="button"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="comment-list-item-actions">
                    {!isPendingDelete && (
                      <>
                        <button
                          disabled={isSaving}
                          onClick={() => {
                            setEditingCommentId(comment.id)
                            setEditingBody(comment.body)
                            setPendingDeleteCommentId(null)
                          }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          disabled={isSaving}
                          onClick={() => {
                            setPendingDeleteCommentId(comment.id)
                            setIsDeleteExportedConfirmOpen(false)
                          }}
                          type="button"
                        >
                          Delete
                        </button>
                      </>
                    )}

                    {isPendingDelete && (
                      <div className="comment-list-confirm-actions">
                        <p className="comment-modal-warning" role="status">
                          Delete this comment?
                        </p>
                        <button
                          disabled={isSaving}
                          onClick={() => {
                            void handleConfirmDeleteComment(comment.id)
                          }}
                          type="button"
                        >
                          Confirm Delete
                        </button>
                        <button
                          disabled={isSaving}
                          onClick={() => {
                            setPendingDeleteCommentId(null)
                          }}
                          type="button"
                        >
                          Cancel Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <div className="comment-modal-actions">
          <button disabled={isSaving} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
