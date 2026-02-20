import { useEffect, useMemo, useRef } from 'react'

type SpecLinkPopoverProps = {
  href: string
  x: number
  y: number
  onClose: () => void
  onCopy: () => void
}

const POPOVER_WIDTH = 280
const VIEWPORT_EDGE_PADDING = 12

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function SpecLinkPopover({
  href,
  x,
  y,
  onClose,
  onCopy,
}: SpecLinkPopoverProps) {
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
        window.innerHeight - 140,
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
      aria-label="Link actions"
      className="spec-link-popover"
      ref={popoverRef}
      role="dialog"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
    >
      <p className="spec-link-popover-title">Link Action</p>
      <p className="spec-link-popover-href" title={href}>
        {href}
      </p>
      <div className="spec-link-popover-actions">
        <button onClick={onCopy} type="button">
          Copy Link Address
        </button>
        <button onClick={onClose} type="button">
          Close
        </button>
      </div>
    </div>
  )
}
