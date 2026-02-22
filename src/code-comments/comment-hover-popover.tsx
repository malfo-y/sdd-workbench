import { useEffect, useMemo, useRef } from 'react'
import type { CodeComment } from './comment-types'

type CommentHoverPopoverProps = {
  lineNumber: number
  comments: readonly CodeComment[]
  x: number
  y: number
  onClose: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  maxVisibleComments?: number
  maxBodyChars?: number
}

const POPOVER_WIDTH = 360
const POPOVER_HEIGHT = 240
const VIEWPORT_EDGE_PADDING = 12

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toSingleLinePreview(body: string, maxBodyChars: number) {
  const oneLine = body.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= maxBodyChars) {
    return oneLine
  }
  return `${oneLine.slice(0, maxBodyChars - 1)}…`
}

function toLineRangeLabel(comment: CodeComment) {
  if (comment.startLine === comment.endLine) {
    return `L${comment.startLine}`
  }
  return `L${comment.startLine}-L${comment.endLine}`
}

export function CommentHoverPopover({
  lineNumber,
  comments,
  x,
  y,
  onClose,
  onMouseEnter,
  onMouseLeave,
  maxVisibleComments = 3,
  maxBodyChars = 120,
}: CommentHoverPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const position = useMemo(() => {
    if (typeof window === 'undefined') {
      return { left: x, top: y }
    }

    return {
      left: clamp(
        x + 10,
        VIEWPORT_EDGE_PADDING,
        window.innerWidth - POPOVER_WIDTH - VIEWPORT_EDGE_PADDING,
      ),
      top: clamp(
        y + 10,
        VIEWPORT_EDGE_PADDING,
        window.innerHeight - POPOVER_HEIGHT - VIEWPORT_EDGE_PADDING,
      ),
    }
  }, [x, y])

  const visibleComments = comments.slice(0, maxVisibleComments)
  const hiddenCommentCount = Math.max(0, comments.length - visibleComments.length)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        event.target instanceof Node &&
        !popoverRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      aria-label="Comment previews"
      className="comment-hover-popover"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={popoverRef}
      role="dialog"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
    >
      <p className="comment-hover-popover-title">Comments on line {lineNumber}</p>
      <ol className="comment-hover-popover-list">
        {visibleComments.map((comment) => (
          <li className="comment-hover-popover-item" key={comment.id}>
            <p className="comment-hover-popover-item-meta">
              {comment.relativePath}:{toLineRangeLabel(comment)}
            </p>
            <p className="comment-hover-popover-item-body">
              {toSingleLinePreview(comment.body, maxBodyChars)}
            </p>
          </li>
        ))}
      </ol>
      {hiddenCommentCount > 0 && (
        <p className="comment-hover-popover-more">+{hiddenCommentCount} more</p>
      )}
    </div>
  )
}

