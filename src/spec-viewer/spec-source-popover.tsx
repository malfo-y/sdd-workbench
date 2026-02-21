import { useEffect, useMemo, useRef } from 'react'

type SpecSourcePopoverProps = {
  lineNumber: number
  x: number
  y: number
  onGoToSource: () => void
  onClose: () => void
}

const POPOVER_WIDTH = 220
const VIEWPORT_EDGE_PADDING = 12

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function SpecSourcePopover({
  lineNumber,
  x,
  y,
  onGoToSource,
  onClose,
}: SpecSourcePopoverProps) {
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
      aria-label="Source actions"
      className="spec-source-popover"
      ref={popoverRef}
      role="dialog"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
    >
      <p className="spec-source-popover-title">Source Action</p>
      <p className="spec-source-popover-line">Line {lineNumber}</p>
      <div className="spec-source-popover-actions">
        <button onClick={onGoToSource} type="button">
          Go to Source
        </button>
        <button onClick={onClose} type="button">
          Close
        </button>
      </div>
    </div>
  )
}

