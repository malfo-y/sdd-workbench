import { useEffect, useMemo, useRef, useState } from 'react'
import {
  sanitizeCommentBody,
  sortCodeComments,
  type CodeComment,
} from './comment-types'

type CommentListModalProps = {
  isOpen: boolean
  isSaving: boolean
  isSavingGlobalComments?: boolean
  comments: readonly CodeComment[]
  globalComments: string
  onClose: () => void
  onUpdateComment: (
    commentId: string,
    body: string,
  ) => boolean | Promise<boolean>
  onDeleteComment: (commentId: string) => boolean | Promise<boolean>
  onDeleteExportedComments: () => boolean | Promise<boolean>
  onSaveGlobalComments?: (body: string) => boolean | Promise<boolean>
  onRequestExport: (selectedCommentIds: string[], includeGlobalComments: boolean) => void
  onJumpToComment: (relativePath: string, startLine: number, endLine: number) => void
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
  isSavingGlobalComments = false,
  comments,
  globalComments,
  onClose,
  onUpdateComment,
  onDeleteComment,
  onDeleteExportedComments,
  onSaveGlobalComments,
  onRequestExport,
  onJumpToComment,
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
  const [selectedCommentIds, setSelectedCommentIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [includeGlobalComments, setIncludeGlobalComments] = useState(true)
  const [savedGlobalComments, setSavedGlobalComments] = useState(globalComments)
  const [editingGlobalCommentsBody, setEditingGlobalCommentsBody] =
    useState(globalComments)
  const [isEditingGlobalComments, setIsEditingGlobalComments] = useState(false)

  // Ref to read latest comments without including in deps (prevents reset on every comment change)
  const commentsRef = useRef(comments)
  commentsRef.current = comments
  const globalCommentsRef = useRef(globalComments)
  globalCommentsRef.current = globalComments

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setExpandedCommentIds(new Set())
    setEditingCommentId(null)
    setEditingBody('')
    setPendingDeleteCommentId(null)
    setIsDeleteExportedConfirmOpen(false)
    setIncludeGlobalComments(true)
    setIsEditingGlobalComments(false)
    setSavedGlobalComments(globalCommentsRef.current)
    setEditingGlobalCommentsBody(globalCommentsRef.current)
    // Default: pending comments selected, exported comments unselected
    setSelectedCommentIds(
      new Set(
        commentsRef.current
          .filter((c) => !c.exportedAt)
          .map((c) => c.id),
      ),
    )
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
  const hasGlobalComments = savedGlobalComments.trim().length > 0
  const canEditGlobalComments = Boolean(onSaveGlobalComments)
  const canSaveGlobalComments = Boolean(
    canEditGlobalComments &&
      !isSavingGlobalComments &&
      editingGlobalCommentsBody !== savedGlobalComments,
  )

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

  const handleToggleSelected = (commentId: string) => {
    setSelectedCommentIds((previous) => {
      const next = new Set(previous)
      if (next.has(commentId)) {
        next.delete(commentId)
      } else {
        next.add(commentId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedCommentIds(new Set(sortedComments.map((c) => c.id)))
  }

  const handleDeselectAll = () => {
    setSelectedCommentIds(new Set())
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
    setSelectedCommentIds((previous) => {
      const next = new Set(previous)
      next.delete(commentId)
      return next
    })
  }

  const handleConfirmDeleteExportedComments = async () => {
    const didDelete = await onDeleteExportedComments()
    if (!didDelete) {
      return
    }

    setIsDeleteExportedConfirmOpen(false)
    setPendingDeleteCommentId(null)
  }

  const handleSaveGlobalComments = async () => {
    if (!onSaveGlobalComments || !canSaveGlobalComments) {
      return
    }
    const didSave = await onSaveGlobalComments(editingGlobalCommentsBody)
    if (!didSave) {
      return
    }
    setSavedGlobalComments(editingGlobalCommentsBody)
    setIsEditingGlobalComments(false)
  }

  const selectedCount = selectedCommentIds.size

  return (
    <div className="comment-modal-backdrop" role="presentation">
      <div aria-label="View comments" className="comment-modal comment-list-modal" role="dialog">
        <div className="comment-list-modal-header">
          <h2>View Comments</h2>
          <p className="comment-modal-meta">
            {sortedComments.length} comment(s) total
          </p>
        </div>

        <section
          className="comment-list-global-section"
          data-testid="comment-list-global-section"
        >
          <h3>Global Comments</h3>
          {isEditingGlobalComments ? (
            <>
              <label className="comment-modal-label" htmlFor="comment-list-global-editor">
                Global comments (Markdown)
              </label>
              <textarea
                className="comment-modal-textarea comment-list-global-editor"
                data-testid="comment-list-global-editor"
                id="comment-list-global-editor"
                onChange={(event) => {
                  setEditingGlobalCommentsBody(event.target.value)
                }}
                rows={7}
                value={editingGlobalCommentsBody}
              />
              <div className="comment-modal-actions comment-list-global-actions">
                <button
                  disabled={isSavingGlobalComments}
                  onClick={() => {
                    setEditingGlobalCommentsBody('')
                  }}
                  type="button"
                >
                  Clear
                </button>
                <button
                  disabled={isSavingGlobalComments}
                  onClick={() => {
                    setIsEditingGlobalComments(false)
                    setEditingGlobalCommentsBody(savedGlobalComments)
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  data-testid="save-global-comments-button"
                  disabled={!canSaveGlobalComments}
                  onClick={() => {
                    void handleSaveGlobalComments()
                  }}
                  type="button"
                >
                  {isSavingGlobalComments ? 'Saving...' : 'Save Global Comments'}
                </button>
              </div>
            </>
          ) : hasGlobalComments ? (
            <>
              <pre
                className="comment-list-global-body"
                data-testid="comment-list-global-body"
              >
                {savedGlobalComments}
              </pre>
              <div className="comment-modal-actions comment-list-global-actions">
                <button
                  disabled={!canEditGlobalComments || isSavingGlobalComments}
                  onClick={() => {
                    setIsEditingGlobalComments(true)
                    setEditingGlobalCommentsBody(savedGlobalComments)
                  }}
                  type="button"
                >
                  Edit Global Comments
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                className="comment-list-global-empty"
                data-testid="comment-list-global-empty"
              >
                No global comments.
              </p>
              <div className="comment-modal-actions comment-list-global-actions">
                <button
                  disabled={!canEditGlobalComments || isSavingGlobalComments}
                  onClick={() => {
                    setIsEditingGlobalComments(true)
                    setEditingGlobalCommentsBody(savedGlobalComments)
                  }}
                  type="button"
                >
                  Add Global Comments
                </button>
              </div>
            </>
          )}
          {hasGlobalComments && (
            <label className="comment-list-global-checkbox">
              <input
                checked={includeGlobalComments}
                data-testid="include-global-comments-checkbox"
                onChange={(event) => {
                  setIncludeGlobalComments(event.target.checked)
                }}
                type="checkbox"
              />
              Include in export
            </label>
          )}
        </section>

        <div className="comment-list-selection-bar" data-testid="comment-list-selection-bar">
          <button onClick={handleSelectAll} type="button">
            Select All
          </button>
          <button onClick={handleDeselectAll} type="button">
            Deselect All
          </button>
          <span className="comment-list-selection-count" data-testid="comment-list-selection-count">
            {selectedCount} selected
          </span>
        </div>

        <ul className="comment-list-items" data-testid="comment-list-items">
          {sortedComments.length === 0 && (
            <li className="comment-list-empty">No comments yet.</li>
          )}
          {sortedComments.map((comment) => {
            const isExpanded = expandedCommentIds.has(comment.id)
            const isEditing = editingCommentId === comment.id
            const isPendingDelete = pendingDeleteCommentId === comment.id
            const isSelected = selectedCommentIds.has(comment.id)
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
                <label className="comment-list-item-checkbox-wrap">
                  <input
                    aria-label={`Select comment from ${comment.relativePath}:${formatLineRange(comment.startLine, comment.endLine)}`}
                    checked={isSelected}
                    onChange={() => {
                      handleToggleSelected(comment.id)
                    }}
                    type="checkbox"
                  />
                </label>
                <div className="comment-list-item-content">
                  <div className="comment-list-item-meta">
                    <button
                      className="comment-modal-target comment-modal-target-jump"
                      onClick={() => {
                        onJumpToComment(comment.relativePath, comment.startLine, comment.endLine)
                      }}
                      title={`Jump to ${comment.relativePath}:${formatLineRange(comment.startLine, comment.endLine)}`}
                      type="button"
                    >
                      {comment.relativePath}:{formatLineRange(
                        comment.startLine,
                        comment.endLine,
                      )}
                    </button>
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
                </div>
              </li>
            )
          })}
        </ul>

        <div className="comment-modal-actions">
          <div className="comment-list-modal-delete-exported">
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
          <button
            disabled={selectedCount === 0 && !(hasGlobalComments && includeGlobalComments)}
            data-testid="export-selected-button"
            onClick={() => {
              onRequestExport([...selectedCommentIds], includeGlobalComments)
            }}
            type="button"
          >
            Export Selected ({selectedCount})
          </button>
          <button disabled={isSaving || isSavingGlobalComments} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
