import { useEffect, useState } from 'react'
import { useModalDragPosition } from '../modal-drag-position'
import { useModalBackgroundWheelPassthrough } from '../modal-wheel-passthrough'
import { parseGlobalCommentsOrganization } from './comment-export'
import {
  loadGlobalCommentsHistory,
  type GlobalCommentsHistoryEntry,
} from './global-comments-history'

type GlobalCommentsModalProps = {
  isOpen: boolean
  isSaving: boolean
  workspaceId: string | null
  initialValue: string
  suggestedDocumentPath?: string | null
  onCancel: () => void
  onSave: (body: string) => void | Promise<void>
}

function appendTemplate(existingBody: string, template: string) {
  const trimmedBody = existingBody.trimEnd()
  if (!trimmedBody) {
    return template
  }
  return `${trimmedBody}\n\n${template}`
}

function buildProjectTemplate() {
  return ['## Project-wide', '- Constraints:', '- Notes:'].join('\n')
}

function buildDocumentTemplate(suggestedDocumentPath?: string | null) {
  return [
    `## Document: ${suggestedDocumentPath?.trim() || '<relative/path.md>'}`,
    '- Constraints:',
    '- Notes:',
  ].join('\n')
}

function buildSectionTemplate() {
  return ['### Section: <name>', '- Notes:'].join('\n')
}

function extractDetectedOrganization(body: string) {
  const parsedOrganization = parseGlobalCommentsOrganization(body)
  if (!parsedOrganization || parsedOrganization.groups.length === 0) {
    return []
  }

  return parsedOrganization.groups.flatMap((group) => [
    group.title,
    ...group.sections.map((section) => section.title),
  ])
}

export function GlobalCommentsModal({
  isOpen,
  isSaving,
  workspaceId,
  initialValue,
  suggestedDocumentPath,
  onCancel,
  onSave,
}: GlobalCommentsModalProps) {
  const [body, setBody] = useState(initialValue)
  const [historyEntries, setHistoryEntries] = useState<GlobalCommentsHistoryEntry[]>(
    [],
  )
  const detectedOrganization = extractDetectedOrganization(body)
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
    setBody(initialValue)
    setHistoryEntries(loadGlobalCommentsHistory(workspaceId))
  }, [initialValue, isOpen, workspaceId])

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
        className={`comment-modal global-comments-modal is-draggable${isDragging ? ' is-dragging' : ''}`}
        onSubmit={(event) => {
          event.preventDefault()
          if (isSaving) {
            return
          }
          void onSave(body)
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
            <h2>Add Global Comments</h2>
            <p className="comment-modal-meta">
              These notes are exported before line comments.
            </p>
            <p className="comment-modal-meta">
              Use `##` headings for document groups and `###` for section notes.
            </p>
          </div>
          <span className="comment-modal-drag-label">Drag to move</span>
        </div>
        <div className="global-comments-toolbar">
          <span className="global-comments-toolbar-label">Quick insert</span>
          <div className="global-comments-toolbar-actions">
            <button
              disabled={isSaving}
              onClick={() => {
                setBody((current) => appendTemplate(current, buildProjectTemplate()))
              }}
              type="button"
            >
              Insert Project Section
            </button>
            <button
              disabled={isSaving}
              onClick={() => {
                setBody((current) =>
                  appendTemplate(
                    current,
                    buildDocumentTemplate(suggestedDocumentPath),
                  ),
                )
              }}
              type="button"
            >
              Insert Document Section
            </button>
            <button
              disabled={isSaving}
              onClick={() => {
                setBody((current) => appendTemplate(current, buildSectionTemplate()))
              }}
              type="button"
            >
              Insert Section Heading
            </button>
          </div>
        </div>
        {detectedOrganization.length > 0 && (
          <div className="global-comments-sections" data-testid="global-comments-sections">
            <p className="comment-modal-meta">Detected organization</p>
            <ul>
              {detectedOrganization.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        )}
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
        {historyEntries.length > 0 && (
          <div className="global-comments-history" data-testid="global-comments-history">
            <p className="comment-modal-meta">Recent saved revisions</p>
            <ol>
              {[...historyEntries].reverse().map((entry) => (
                <li key={entry.id}>
                  <button
                    onClick={() => {
                      setBody(entry.body)
                    }}
                    type="button"
                  >
                    Restore {entry.savedAt}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
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
