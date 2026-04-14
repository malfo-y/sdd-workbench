import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

const MIN_LEFT_PANE_WIDTH = 220
const MIN_CONTENT_PANE_WIDTH = 360
const RESIZER_WIDTH = 12

type PaneSizes = {
  left: number
  content: number
}

type ResizeSession = {
  startX: number
  availableWidth: number
  startSizes: PaneSizes
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function usePaneResize(workspaceLayoutRef: React.RefObject<HTMLElement | null>) {
  const [paneSizes, setPaneSizes] = useState<PaneSizes>({
    left: 20,
    content: 80,
  })
  const [activeResizeHandle, setActiveResizeHandle] = useState(false)
  const resizeSessionRef = useRef<ResizeSession | null>(null)

  const workspaceLayoutStyle = useMemo(
    () =>
      ({
        '--pane-left': `${paneSizes.left}%`,
        '--pane-content': `${paneSizes.content}%`,
      }) as CSSProperties,
    [paneSizes],
  )

  const startResize = (clientX: number) => {
    const layoutElement = workspaceLayoutRef.current
    if (!layoutElement) {
      return
    }

    const layoutWidth = layoutElement.getBoundingClientRect().width
    const availableWidth = layoutWidth - RESIZER_WIDTH
    const minimumWidthSum = MIN_LEFT_PANE_WIDTH + MIN_CONTENT_PANE_WIDTH

    if (availableWidth <= minimumWidthSum) {
      return
    }

    resizeSessionRef.current = {
      startX: clientX,
      availableWidth,
      startSizes: paneSizes,
    }
    setActiveResizeHandle(true)
  }

  useEffect(() => {
    if (!activeResizeHandle) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeSession = resizeSessionRef.current
      if (!resizeSession) {
        return
      }

      const deltaX = event.clientX - resizeSession.startX
      const { availableWidth, startSizes } = resizeSession

      const startLeftWidth = (startSizes.left / 100) * availableWidth
      const maxLeftWidth = availableWidth - MIN_CONTENT_PANE_WIDTH
      const nextLeftWidth = clamp(
        startLeftWidth + deltaX,
        MIN_LEFT_PANE_WIDTH,
        maxLeftWidth,
      )
      const nextContentWidth = availableWidth - nextLeftWidth

      setPaneSizes({
        left: (nextLeftWidth / availableWidth) * 100,
        content: (nextContentWidth / availableWidth) * 100,
      })
    }

    const stopResize = () => {
      resizeSessionRef.current = null
      setActiveResizeHandle(false)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
  }, [activeResizeHandle])

  return {
    activeResizeHandle,
    workspaceLayoutStyle,
    startResize,
  }
}
