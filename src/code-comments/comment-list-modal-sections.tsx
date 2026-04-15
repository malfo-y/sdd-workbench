import type { CodeComment } from './comment-types'

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

type CommentListGlobalSectionProps = {
  hasGlobalComments: boolean
  includeGlobalComments: boolean
  canEditGlobalComments: boolean
  canSaveGlobalComments: boolean
  isEditingGlobalComments: boolean
  isSavingGlobalComments: boolean
  savedGlobalComments: string
  editingGlobalCommentsBody: string
  onChangeEditingGlobalCommentsBody: (value: string) => void
  onStartEditingGlobalComments: () => void
  onClearEditingGlobalComments: () => void
  onCancelEditingGlobalComments: () => void
  onSaveGlobalComments: () => void
  onChangeIncludeGlobalComments: (checked: boolean) => void
}

type CommentListItemsProps = {
  comments: readonly CodeComment[]
  expandedCommentIds: ReadonlySet<string>
  editingCommentId: string | null
  editingBody: string
  pendingDeleteCommentId: string | null
  selectedCommentIds: ReadonlySet<string>
  isSaving: boolean
  canSaveEdit: boolean
  onToggleSelected: (commentId: string) => void
  onJumpToComment: (
    relativePath: string,
    startLine: number,
    endLine: number,
  ) => void
  onToggleExpanded: (commentId: string) => void
  onStartEditingComment: (comment: CodeComment) => void
  onChangeEditingBody: (value: string) => void
  onCancelEditingComment: () => void
  onSaveEditedComment: () => void
  onRequestDeleteComment: (commentId: string) => void
  onConfirmDeleteComment: (commentId: string) => void
  onCancelDeleteComment: () => void
}

export function CommentListGlobalSection({
  hasGlobalComments,
  includeGlobalComments,
  canEditGlobalComments,
  canSaveGlobalComments,
  isEditingGlobalComments,
  isSavingGlobalComments,
  savedGlobalComments,
  editingGlobalCommentsBody,
  onChangeEditingGlobalCommentsBody,
  onStartEditingGlobalComments,
  onClearEditingGlobalComments,
  onCancelEditingGlobalComments,
  onSaveGlobalComments,
  onChangeIncludeGlobalComments,
}: CommentListGlobalSectionProps) {
  return (
    <section
      className="comment-list-global-section"
      data-testid="comment-list-global-section"
    >
      <h3>Global Comments</h3>
      {isEditingGlobalComments ? (
        <>
          <label
            className="comment-modal-label"
            htmlFor="comment-list-global-editor"
          >
            Global comments (Markdown)
          </label>
          <textarea
            className="comment-modal-textarea comment-list-global-editor"
            data-testid="comment-list-global-editor"
            id="comment-list-global-editor"
            onChange={(event) => {
              onChangeEditingGlobalCommentsBody(event.target.value)
            }}
            rows={7}
            value={editingGlobalCommentsBody}
          />
          <div className="comment-modal-actions comment-list-global-actions">
            <button
              disabled={isSavingGlobalComments}
              onClick={onClearEditingGlobalComments}
              type="button"
            >
              Clear
            </button>
            <button
              disabled={isSavingGlobalComments}
              onClick={onCancelEditingGlobalComments}
              type="button"
            >
              Cancel
            </button>
            <button
              data-testid="save-global-comments-button"
              disabled={!canSaveGlobalComments}
              onClick={onSaveGlobalComments}
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
              onClick={onStartEditingGlobalComments}
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
              onClick={onStartEditingGlobalComments}
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
              onChangeIncludeGlobalComments(event.target.checked)
            }}
            type="checkbox"
          />
          Include in export
        </label>
      )}
    </section>
  )
}

export function CommentListItems({
  comments,
  expandedCommentIds,
  editingCommentId,
  editingBody,
  pendingDeleteCommentId,
  selectedCommentIds,
  isSaving,
  canSaveEdit,
  onToggleSelected,
  onJumpToComment,
  onToggleExpanded,
  onStartEditingComment,
  onChangeEditingBody,
  onCancelEditingComment,
  onSaveEditedComment,
  onRequestDeleteComment,
  onConfirmDeleteComment,
  onCancelDeleteComment,
}: CommentListItemsProps) {
  return (
    <ul className="comment-list-items" data-testid="comment-list-items">
      {comments.length === 0 && (
        <li className="comment-list-empty">No comments yet.</li>
      )}
      {comments.map((comment) => {
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
                  onToggleSelected(comment.id)
                }}
                type="checkbox"
              />
            </label>
            <div className="comment-list-item-content">
              <div className="comment-list-item-meta">
                <button
                  className="comment-modal-target comment-modal-target-jump"
                  onClick={() => {
                    onJumpToComment(
                      comment.relativePath,
                      comment.startLine,
                      comment.endLine,
                    )
                  }}
                  title={`Jump to ${comment.relativePath}:${formatLineRange(comment.startLine, comment.endLine)}`}
                  type="button"
                >
                  {comment.relativePath}:
                  {formatLineRange(comment.startLine, comment.endLine)}
                </button>
                <p className="comment-modal-meta">{comment.createdAt}</p>
                {comment.exportedAt && (
                  <p className="comment-modal-meta">
                    exported: {comment.exportedAt}
                  </p>
                )}
              </div>

              {!isEditing && (
                <div className="comment-list-item-body-wrap">
                  <pre className="comment-list-item-body">{displayBody}</pre>
                  {bodyIsLong && (
                    <button
                      className="comment-list-expand-button"
                      onClick={() => {
                        onToggleExpanded(comment.id)
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
                  <label
                    className="comment-modal-label"
                    htmlFor={`comment-edit-${comment.id}`}
                  >
                    Edit comment body
                  </label>
                  <textarea
                    className="comment-modal-textarea"
                    id={`comment-edit-${comment.id}`}
                    onChange={(event) => {
                      onChangeEditingBody(event.target.value)
                    }}
                    rows={5}
                    value={editingBody}
                  />
                  <div className="comment-modal-actions">
                    <button
                      disabled={isSaving}
                      onClick={onCancelEditingComment}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!canSaveEdit}
                      onClick={onSaveEditedComment}
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
                          onStartEditingComment(comment)
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        disabled={isSaving}
                        onClick={() => {
                          onRequestDeleteComment(comment.id)
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
                          onConfirmDeleteComment(comment.id)
                        }}
                        type="button"
                      >
                        Confirm Delete
                      </button>
                      <button
                        disabled={isSaving}
                        onClick={onCancelDeleteComment}
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
  )
}
