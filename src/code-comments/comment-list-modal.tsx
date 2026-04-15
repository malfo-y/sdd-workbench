import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useModalBackgroundWheelPassthrough } from '../modal-wheel-passthrough'
import { useModalDragPosition } from '../modal-drag-position'
import {
  sanitizeCommentBody,
  sortCodeComments,
  type CodeComment,
} from './comment-types'
import {
  CommentListGlobalSection,
  CommentListItems,
} from './comment-list-modal-sections'
import { useEscapeDismiss } from './use-escape-dismiss'

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
  const { backdropRef, dialogRef, handleWheelCapture } =
    useModalBackgroundWheelPassthrough<HTMLDivElement>()
  const { dialogStyle, isDragging, dragHandleProps } = useModalDragPosition({
    dialogRef,
    isOpen,
  })
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
  const canDismissModal = !isSaving && !isSavingGlobalComments

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

  const handleCancelEditingComment = useCallback(() => {
    setEditingCommentId(null)
    setEditingBody('')
  }, [])

  const handleStartEditingComment = useCallback((comment: CodeComment) => {
    setEditingCommentId(comment.id)
    setEditingBody(comment.body)
    setPendingDeleteCommentId(null)
  }, [])

  const handleRequestDeleteComment = useCallback((commentId: string) => {
    setPendingDeleteCommentId(commentId)
    setIsDeleteExportedConfirmOpen(false)
  }, [])

  const handleCancelDeleteComment = useCallback(() => {
    setPendingDeleteCommentId(null)
  }, [])

  const handleRequestDeleteExportedComments = useCallback(() => {
    setIsDeleteExportedConfirmOpen(true)
  }, [])

  const handleCancelDeleteExportedComments = useCallback(() => {
    setIsDeleteExportedConfirmOpen(false)
  }, [])

  const handleStartEditingGlobalComments = useCallback(() => {
    setIsEditingGlobalComments(true)
    setEditingGlobalCommentsBody(savedGlobalComments)
  }, [savedGlobalComments])

  const handleCancelEditingGlobalComments = useCallback(() => {
    setIsEditingGlobalComments(false)
    setEditingGlobalCommentsBody(savedGlobalComments)
  }, [savedGlobalComments])

  const handleDismissViaEscape = useCallback(() => {
    if (editingCommentId) {
      handleCancelEditingComment()
      return
    }

    if (pendingDeleteCommentId) {
      handleCancelDeleteComment()
      return
    }

    if (isDeleteExportedConfirmOpen) {
      handleCancelDeleteExportedComments()
      return
    }

    if (isEditingGlobalComments) {
      handleCancelEditingGlobalComments()
      return
    }

    onClose()
  }, [
    editingCommentId,
    handleCancelDeleteComment,
    handleCancelDeleteExportedComments,
    handleCancelEditingComment,
    handleCancelEditingGlobalComments,
    isDeleteExportedConfirmOpen,
    isEditingGlobalComments,
    onClose,
    pendingDeleteCommentId,
  ])

  useEscapeDismiss({
    isEnabled: isOpen,
    canDismiss: canDismissModal,
    onDismiss: handleDismissViaEscape,
  })

  if (!isOpen) {
    return null
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

    handleCancelEditingComment()
  }

  const handleConfirmDeleteComment = async (commentId: string) => {
    const didDelete = await onDeleteComment(commentId)
    if (!didDelete) {
      return
    }

    setPendingDeleteCommentId(null)
    handleCancelEditingComment()
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
    <div
      className="comment-modal-backdrop"
      onWheelCapture={handleWheelCapture}
      ref={backdropRef}
      role="presentation"
    >
      <div
        aria-label="View comments"
        className={`comment-modal comment-list-modal is-draggable${isDragging ? ' is-dragging' : ''}`}
        ref={dialogRef}
        role="dialog"
        style={dialogStyle}
      >
        <div
          className="comment-modal-header comment-list-modal-header"
          data-testid="comment-modal-drag-handle"
          {...dragHandleProps}
        >
          <div className="comment-modal-header-main">
            <h2>View Comments</h2>
            <p className="comment-modal-meta">
              {sortedComments.length} comment(s) total
            </p>
          </div>
          <span className="comment-modal-drag-label">Drag to move</span>
        </div>

        <CommentListGlobalSection
          canEditGlobalComments={canEditGlobalComments}
          canSaveGlobalComments={canSaveGlobalComments}
          editingGlobalCommentsBody={editingGlobalCommentsBody}
          hasGlobalComments={hasGlobalComments}
          includeGlobalComments={includeGlobalComments}
          isEditingGlobalComments={isEditingGlobalComments}
          isSavingGlobalComments={isSavingGlobalComments}
          onCancelEditingGlobalComments={handleCancelEditingGlobalComments}
          onChangeEditingGlobalCommentsBody={setEditingGlobalCommentsBody}
          onChangeIncludeGlobalComments={setIncludeGlobalComments}
          onClearEditingGlobalComments={() => {
            setEditingGlobalCommentsBody('')
          }}
          onSaveGlobalComments={() => {
            void handleSaveGlobalComments()
          }}
          onStartEditingGlobalComments={handleStartEditingGlobalComments}
          savedGlobalComments={savedGlobalComments}
        />

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

        <CommentListItems
          canSaveEdit={canSaveEdit}
          comments={sortedComments}
          editingBody={editingBody}
          editingCommentId={editingCommentId}
          expandedCommentIds={expandedCommentIds}
          isSaving={isSaving}
          onCancelDeleteComment={handleCancelDeleteComment}
          onCancelEditingComment={handleCancelEditingComment}
          onChangeEditingBody={setEditingBody}
          onConfirmDeleteComment={(commentId) => {
            void handleConfirmDeleteComment(commentId)
          }}
          onJumpToComment={onJumpToComment}
          onRequestDeleteComment={handleRequestDeleteComment}
          onSaveEditedComment={() => {
            void handleSaveEditedComment()
          }}
          onStartEditingComment={handleStartEditingComment}
          onToggleExpanded={handleToggleExpanded}
          onToggleSelected={handleToggleSelected}
          pendingDeleteCommentId={pendingDeleteCommentId}
          selectedCommentIds={selectedCommentIds}
        />

        <div className="comment-modal-actions">
          <div className="comment-list-modal-delete-exported">
            {!isDeleteExportedConfirmOpen && (
              <button
                disabled={isSaving || exportedCommentCount === 0}
                onClick={handleRequestDeleteExportedComments}
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
                  onClick={handleCancelDeleteExportedComments}
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
