import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type CopyActionPopoverAction = {
  label: string
  onSelect: () => void
  disabled?: boolean
}

type CopyActionPopoverProps = {
  title: string
  description?: string
  x: number
  y: number
  actions: CopyActionPopoverAction[]
  onClose: () => void
  ariaLabel?: string
}

const POPOVER_FALLBACK_WIDTH = 280
const POPOVER_FALLBACK_HEIGHT = 180
const VIEWPORT_EDGE_PADDING = 12
const ANCHOR_OFFSET = 10

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function CopyActionPopover({
  title,
  description,
  x,
  y,
  actions,
  onClose,
  ariaLabel = 'Copy actions',
}: CopyActionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState(() => ({
    left: x + ANCHOR_OFFSET,
    top: y + ANCHOR_OFFSET,
  }))

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const updatePosition = () => {
      const width = popoverRef.current?.offsetWidth || POPOVER_FALLBACK_WIDTH
      const height = popoverRef.current?.offsetHeight || POPOVER_FALLBACK_HEIGHT
      const maxLeft = Math.max(
        VIEWPORT_EDGE_PADDING,
        window.innerWidth - width - VIEWPORT_EDGE_PADDING,
      )
      const maxTop = Math.max(
        VIEWPORT_EDGE_PADDING,
        window.innerHeight - height - VIEWPORT_EDGE_PADDING,
      )
      const nextLeft = clamp(
        x + ANCHOR_OFFSET,
        VIEWPORT_EDGE_PADDING,
        maxLeft,
      )
      const nextTop = clamp(
        y + ANCHOR_OFFSET,
        VIEWPORT_EDGE_PADDING,
        maxTop,
      )

      setPosition((previous) => {
        if (previous.left === nextLeft && previous.top === nextTop) {
          return previous
        }
        return { left: nextLeft, top: nextTop }
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('resize', updatePosition)
    }
  }, [actions.length, description, title, x, y])

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
      aria-label={ariaLabel}
      className="copy-action-popover"
      ref={popoverRef}
      role="dialog"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
    >
      <p className="copy-action-popover-title">{title}</p>
      {description && (
        <p className="copy-action-popover-description" title={description}>
          {description}
        </p>
      )}
      <div className="copy-action-popover-actions">
        {actions.map((action) => (
          <button
            disabled={action.disabled}
            key={action.label}
            onClick={() => {
              action.onSelect()
              onClose()
            }}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
