import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

export type ModalDragOffset = {
  x: number
  y: number
}

type ModalRect = {
  left: number
  top: number
  width: number
  height: number
}

type ViewportSize = {
  width: number
  height: number
}

type ModalDragSession = {
  pointerId: number
  lastClientX: number
  lastClientY: number
}

const DEFAULT_MIN_VISIBLE_PIXELS = 160
const INITIAL_MODAL_DRAG_OFFSET: ModalDragOffset = { x: 0, y: 0 }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getViewportSize(): ViewportSize {
  return {
    width: window.innerWidth || document.documentElement.clientWidth || 0,
    height: window.innerHeight || document.documentElement.clientHeight || 0,
  }
}

export function clampModalDragDelta(
  rect: ModalRect,
  delta: ModalDragOffset,
  viewport: ViewportSize,
  options?: {
    minVisibleX?: number
    minVisibleY?: number
  },
): ModalDragOffset {
  const minVisibleX = Math.min(rect.width, options?.minVisibleX ?? DEFAULT_MIN_VISIBLE_PIXELS)
  const minVisibleY = Math.min(
    rect.height,
    options?.minVisibleY ?? DEFAULT_MIN_VISIBLE_PIXELS,
  )

  const minLeft = minVisibleX - rect.width
  const maxLeft = viewport.width - minVisibleX
  const minTop = minVisibleY - rect.height
  const maxTop = viewport.height - minVisibleY

  const nextLeft = clamp(rect.left + delta.x, minLeft, maxLeft)
  const nextTop = clamp(rect.top + delta.y, minTop, maxTop)

  return {
    x: nextLeft - rect.left,
    y: nextTop - rect.top,
  }
}

export function useModalDragPosition<TDialogElement extends HTMLElement>({
  dialogRef,
  isOpen,
  minVisiblePixels = DEFAULT_MIN_VISIBLE_PIXELS,
}: {
  dialogRef: RefObject<TDialogElement>
  isOpen: boolean
  minVisiblePixels?: number
}) {
  const [offset, setOffset] = useState<ModalDragOffset>(INITIAL_MODAL_DRAG_OFFSET)
  const [isDragging, setIsDragging] = useState(false)
  const dragSessionRef = useRef<ModalDragSession | null>(null)

  const stopDragging = useCallback(() => {
    dragSessionRef.current = null
    setIsDragging(false)
    document.body.classList.remove('comment-modal-dragging')
  }, [])

  const applyPointerMove = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const dragSession = dragSessionRef.current
      const dialog = dialogRef.current
      if (!dragSession || !dialog || pointerId !== dragSession.pointerId) {
        return
      }

      const requestedDelta = {
        x: clientX - dragSession.lastClientX,
        y: clientY - dragSession.lastClientY,
      }
      if (requestedDelta.x === 0 && requestedDelta.y === 0) {
        return
      }

      const rect = dialog.getBoundingClientRect()
      const appliedDelta = clampModalDragDelta(
        {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        requestedDelta,
        getViewportSize(),
        {
          minVisibleX: minVisiblePixels,
          minVisibleY: minVisiblePixels,
        },
      )

      dragSession.lastClientX = clientX
      dragSession.lastClientY = clientY

      if (appliedDelta.x === 0 && appliedDelta.y === 0) {
        return
      }

      setOffset((current) => ({
        x: current.x + appliedDelta.x,
        y: current.y + appliedDelta.y,
      }))
    },
    [dialogRef, minVisiblePixels],
  )

  const handlePointerEnd = useCallback(
    (pointerId: number) => {
      if (!dragSessionRef.current || pointerId !== dragSessionRef.current.pointerId) {
        return
      }
      stopDragging()
    },
    [stopDragging],
  )

  useEffect(() => {
    setOffset(INITIAL_MODAL_DRAG_OFFSET)
    stopDragging()
  }, [isOpen, stopDragging])

  useEffect(() => {
    return () => {
      stopDragging()
    }
  }, [stopDragging])

  useEffect(() => {
    if (!isDragging) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      applyPointerMove(event.pointerId, event.clientX, event.clientY)
    }

    const handleWindowPointerEnd = (event: PointerEvent) => {
      handlePointerEnd(event.pointerId)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handleWindowPointerEnd)
    window.addEventListener('pointercancel', handleWindowPointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handleWindowPointerEnd)
      window.removeEventListener('pointercancel', handleWindowPointerEnd)
    }
  }, [applyPointerMove, handlePointerEnd, isDragging])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== undefined && event.button !== 0) {
        return
      }

      dragSessionRef.current = {
        pointerId: event.pointerId,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      }
      setIsDragging(true)
      document.body.classList.add('comment-modal-dragging')
      event.currentTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    },
    [],
  )

  const dialogStyle = useMemo<CSSProperties>(
    () => ({
      transform: `translate3d(${offset.x}px, ${offset.y}px, 0px)`,
    }),
    [offset.x, offset.y],
  )

  return {
    dialogStyle,
    isDragging,
    dragHandleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        applyPointerMove(event.pointerId, event.clientX, event.clientY)
      },
      onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
        handlePointerEnd(event.pointerId)
      },
      onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
        handlePointerEnd(event.pointerId)
      },
    },
  }
}
