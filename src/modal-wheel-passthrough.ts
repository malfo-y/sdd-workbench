import { useCallback, useRef, type WheelEvent as ReactWheelEvent } from 'react'

function isScrollableOverflowValue(value: string) {
  return value === 'auto' || value === 'scroll' || value === 'overlay'
}

function canScrollAxis(element: HTMLElement, axis: 'x' | 'y', delta: number) {
  if (delta === 0) {
    return false
  }

  const style = window.getComputedStyle(element)
  const overflowValue = axis === 'y' ? style.overflowY : style.overflowX
  if (!isScrollableOverflowValue(overflowValue)) {
    return false
  }

  const scrollSize = axis === 'y' ? element.scrollHeight : element.scrollWidth
  const clientSize = axis === 'y' ? element.clientHeight : element.clientWidth
  const maxScrollOffset = scrollSize - clientSize
  if (maxScrollOffset <= 0) {
    return false
  }

  const currentOffset = axis === 'y' ? element.scrollTop : element.scrollLeft
  return delta > 0 ? currentOffset < maxScrollOffset : currentOffset > 0
}

function findScrollableAncestor(
  start: Element | null,
  boundary: HTMLElement | null,
  deltaX: number,
  deltaY: number,
): HTMLElement | null {
  let current: Element | null = start

  while (current) {
    if (
      current instanceof HTMLElement &&
      (canScrollAxis(current, 'x', deltaX) || canScrollAxis(current, 'y', deltaY))
    ) {
      return current
    }

    if (boundary && current === boundary) {
      break
    }
    current = current.parentElement
  }

  return null
}

export function useModalBackgroundWheelPassthrough<TDialogElement extends HTMLElement>() {
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<TDialogElement | null>(null)

  const handleWheelCapture = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    const backdrop = backdropRef.current
    const dialog = dialogRef.current
    if (!backdrop || !dialog) {
      return
    }

    const targetElement = event.target instanceof Element ? event.target : null
    if (targetElement && dialog.contains(targetElement)) {
      const modalScrollTarget = findScrollableAncestor(
        targetElement,
        dialog,
        event.deltaX,
        event.deltaY,
      )
      if (modalScrollTarget) {
        return
      }
    }

    if (typeof document.elementsFromPoint !== 'function') {
      return
    }

    const elementsFromPoint = document.elementsFromPoint(event.clientX, event.clientY)
    for (const element of elementsFromPoint) {
      if (backdrop.contains(element)) {
        continue
      }

      const backgroundScrollTarget = findScrollableAncestor(
        element,
        null,
        event.deltaX,
        event.deltaY,
      )
      if (!backgroundScrollTarget) {
        continue
      }

      event.preventDefault()
      backgroundScrollTarget.scrollLeft += event.deltaX
      backgroundScrollTarget.scrollTop += event.deltaY
      return
    }
  }, [])

  return {
    backdropRef,
    dialogRef,
    handleWheelCapture,
  }
}
