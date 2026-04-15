import { useEffect, useMemo, useRef } from 'react'
import {
  compareCodeComments,
  type CodeComment,
} from './comment-types'
import { useEscapeDismiss } from './use-escape-dismiss'

type CommentMarkerDetailPanelProps = {
  lineNumber: number
  comments: readonly CodeComment[]
  x: number
  y: number
  onClose: () => void
  onRequestEditComment: (comment: CodeComment) => void
  onRequestDeleteComment: (comment: CodeComment) => void
}

const PANEL_WIDTH = 440
const PANEL_HEIGHT = 360
const VIEWPORT_EDGE_PADDING = 12

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatLineRange(startLine: number, endLine: number) {
  if (startLine === endLine) {
    return `L${startLine}`
  }
  return `L${startLine}-L${endLine}`
}

export function CommentMarkerDetailPanel({
  lineNumber,
  comments,
  x,
  y,
  onClose,
  onRequestEditComment,
  onRequestDeleteComment,
}: CommentMarkerDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const position = useMemo(() => {
    if (typeof window === 'undefined') {
      return { left: x, top: y }
    }

    return {
      left: clamp(
        x + 10,
        VIEWPORT_EDGE_PADDING,
        window.innerWidth - PANEL_WIDTH - VIEWPORT_EDGE_PADDING,
      ),
      top: clamp(
        y + 10,
        VIEWPORT_EDGE_PADDING,
        window.innerHeight - PANEL_HEIGHT - VIEWPORT_EDGE_PADDING,
      ),
    }
  }, [x, y])
  const sortedComments = useMemo(
    () => [...comments].sort(compareCodeComments),
    [comments],
  )

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        panelRef.current &&
        event.target instanceof Node &&
        !panelRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [onClose])

  useEscapeDismiss({
    isEnabled: true,
    onDismiss: onClose,
  })

  return (
    <div
      aria-label={`Comment details for line ${lineNumber}`}
      className="comment-marker-detail-panel"
      ref={panelRef}
      role="dialog"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
    >
      <div className="comment-marker-detail-header">
        <div>
          <p className="comment-marker-detail-eyebrow">Marker detail</p>
          <h2 className="comment-marker-detail-title">Comments on line {lineNumber}</h2>
        </div>
        <button
          aria-label="Close comment details"
          className="comment-marker-detail-close"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
      <ol className="comment-marker-detail-list">
        {sortedComments.map((comment) => (
          <li className="comment-marker-detail-item" key={comment.id}>
            <p className="comment-marker-detail-meta">
              {comment.relativePath}:{formatLineRange(comment.startLine, comment.endLine)}
            </p>
            <p className="comment-marker-detail-body">{comment.body}</p>
            <div className="comment-marker-detail-actions">
              <button
                onClick={() => {
                  onRequestEditComment(comment)
                  onClose()
                }}
                type="button"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  onRequestDeleteComment(comment)
                  onClose()
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
