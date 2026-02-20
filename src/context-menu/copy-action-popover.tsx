import { useEffect, useMemo, useRef } from 'react'

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

const POPOVER_WIDTH = 280
const POPOVER_HEIGHT = 180
const VIEWPORT_EDGE_PADDING = 12

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
        window.innerHeight - POPOVER_HEIGHT,
      ),
    }
  }, [x, y])

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
