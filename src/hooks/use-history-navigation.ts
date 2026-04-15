import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type {
  CitationNavigationResult,
  CitationTarget,
} from '../spec-viewer/citation-target'
import { resolvePythonSymbol } from '../spec-viewer/python-symbol-resolver'
import type { SpecLinkLineRange } from '../spec-viewer/spec-link-utils'
import type { SourceOffsetRange } from '../source-selection'
import type { CodeViewerJumpRequest } from '../code-editor/code-editor-panel'
import type { LineSelectionRange } from '../workspace/workspace-model'
import {
  loadPersistedSpecScrollPositions,
  savePersistedSpecScrollPositions,
} from '../workspace/workspace-persistence'

const TRACKPAD_HISTORY_MIN_AXIS_DELTA = 18
const TRACKPAD_HISTORY_TRIGGER_DELTA = 120
const TRACKPAD_HISTORY_IDLE_RESET_MS = 160
const TRACKPAD_HISTORY_COOLDOWN_MS = 380
const WHEEL_DELTA_MODE_PIXEL = 0
const MOUSE_WHEEL_DISCRETE_STEP_DELTA = 120
const COMMENT_BANNER_AUTODISMISS_MS = 5000
const HISTORY_NAVIGATION_SCOPE_SELECTOR = '[data-history-navigation-scope="true"]'

type ContentTab = 'code' | 'spec'

type SpecViewerNavigationRequest = {
  targetRelativePath: string
  token: number
  lineNumber?: number
  headingId?: string
}

type WheelHistoryState = {
  accumulatedDeltaX: number
  lastEventAt: number
  cooldownUntil: number
  lastTriggeredDirection: 'back' | 'forward' | null
}

function buildSpecScrollStateKey(
  workspaceId: string | null,
  relativePath: string,
) {
  return `${workspaceId ?? '__none__'}::${relativePath}`
}

function describeCitationResolutionFailure(
  relativePath: string,
  symbolName: string,
  reason: 'ambiguous' | 'not_found' | 'unsupported_symbol',
): string {
  switch (reason) {
    case 'ambiguous':
      return `Python symbol "${symbolName}" is ambiguous in ${relativePath}.`
    case 'not_found':
      return `Python symbol "${symbolName}" was not found in ${relativePath}.`
    case 'unsupported_symbol':
      return `Citation target syntax is not supported: ${symbolName}.`
  }
}

function canConsumeHorizontalScroll(element: HTMLElement, deltaX: number): boolean {
  const overflowX = window.getComputedStyle(element).overflowX
  if (overflowX !== 'auto' && overflowX !== 'scroll' && overflowX !== 'overlay') {
    return false
  }

  const maxScrollLeft = element.scrollWidth - element.clientWidth
  if (maxScrollLeft <= 0) {
    return false
  }

  if (deltaX > 0) {
    return element.scrollLeft < maxScrollLeft
  }

  return element.scrollLeft > 0
}

function shouldSkipTrackpadHistoryFallback(
  target: EventTarget | null,
  deltaX: number,
): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  let current: Element | null = target
  while (current) {
    if (current instanceof HTMLElement && canConsumeHorizontalScroll(current, deltaX)) {
      return true
    }
    current = current.parentElement
  }

  return false
}

function isLikelyMouseHorizontalWheel(event: WheelEvent): boolean {
  const absDeltaX = Math.abs(event.deltaX)
  const absDeltaY = Math.abs(event.deltaY)

  if (absDeltaX === 0) {
    return false
  }

  // Trackpad horizontal gesture fallback is tuned for pixel-precision input.
  if (event.deltaMode !== WHEEL_DELTA_MODE_PIXEL) {
    return true
  }

  const isDiscreteStepDelta =
    Number.isInteger(absDeltaX) &&
    absDeltaX % MOUSE_WHEEL_DISCRETE_STEP_DELTA === 0

  return isDiscreteStepDelta && absDeltaY === 0
}

function isHistoryNavigationScopeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  return target.closest(HISTORY_NAVIGATION_SCOPE_SELECTOR) !== null
}

function isTrackpadHistorySupportedPlatform() {
  if (typeof navigator === 'undefined') {
    return true
  }

  const navigatorWithUserAgentData = navigator as Navigator & {
    userAgentData?: {
      platform?: string
    }
  }
  const platform = [
    navigatorWithUserAgentData.userAgentData?.platform,
    navigator.platform,
    navigator.userAgent,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()

  return platform.includes('mac') || platform.includes('darwin')
}

export type UseHistoryNavigationParams = {
  activeWorkspaceId: string | null
  activeFile: string | null
  activeSpec: string | null
  activeFileContent: string | null
  rootPath: string | null
  selectionRange: LineSelectionRange | null
  workspaceFilePathSet: Set<string>
  workspaces: { id: string }[]
  goBackInHistory: () => void
  goForwardInHistory: () => void
  selectFile: (relativePath: string) => void
  setSelectionRange: (range: LineSelectionRange) => void
  switchWorkspace: (workspaceId: string) => void
  showBanner: (message: string) => void
  bannerMessage: string | null
  clearBanner: () => void
  isDirty: boolean
  setActiveTab: (tab: ContentTab) => void
}

export function useHistoryNavigation(params: UseHistoryNavigationParams) {
  const {
    activeWorkspaceId,
    activeFile,
    activeSpec,
    activeFileContent,
    rootPath,
    selectionRange,
    workspaceFilePathSet,
    workspaces,
    goBackInHistory,
    goForwardInHistory,
    selectFile,
    setSelectionRange,
    switchWorkspace,
    showBanner,
    bannerMessage,
    clearBanner,
    isDirty,
    setActiveTab,
  } = params

  const jumpRequestTokenRef = useRef(0)
  const specNavigationRequestTokenRef = useRef(0)
  const [codeViewerJumpRequest, setCodeViewerJumpRequest] =
    useState<CodeViewerJumpRequest | null>(null)
  const [specViewerNavigationRequest, setSpecViewerNavigationRequest] =
    useState<SpecViewerNavigationRequest | null>(null)
  const previousActiveFileRef = useRef<string | null>(null)
  const historyNavigationRef = useRef(false)
  const specScrollPositionsRef = useRef(loadPersistedSpecScrollPositions())
  const codeScrollPositionsRef = useRef<Record<string, number>>({})
  const wheelHistoryStateRef = useRef<WheelHistoryState>({
    accumulatedDeltaX: 0,
    lastEventAt: 0,
    cooldownUntil: 0,
    lastTriggeredDirection: null,
  })
  const isHistoryNavigationScopeActiveRef = useRef(false)

  const queueCodeViewerJumpRequest = useCallback(
    (input: {
      targetRelativePath: string
      lineNumber: number
      sourceOffsetRange?: SourceOffsetRange
      shouldHighlight?: boolean
    }) => {
      jumpRequestTokenRef.current += 1
      setCodeViewerJumpRequest({
        targetRelativePath: input.targetRelativePath,
        lineNumber: input.lineNumber,
        ...(input.sourceOffsetRange
          ? { sourceOffsetRange: input.sourceOffsetRange }
          : {}),
        ...(input.shouldHighlight ? { shouldHighlight: true } : {}),
        token: jumpRequestTokenRef.current,
      })
    },
    [],
  )

  const queueSpecViewerNavigationRequest = useCallback(
    (input: {
      targetRelativePath: string
      lineNumber?: number
      headingId?: string
    }) => {
      if (
        typeof input.lineNumber !== 'number' &&
        typeof input.headingId !== 'string'
      ) {
        return
      }

      specNavigationRequestTokenRef.current += 1
      setSpecViewerNavigationRequest({
        targetRelativePath: input.targetRelativePath,
        ...(typeof input.lineNumber === 'number'
          ? { lineNumber: input.lineNumber }
          : {}),
        ...(typeof input.headingId === 'string' && input.headingId.trim().length > 0
          ? { headingId: input.headingId.trim() }
          : {}),
        token: specNavigationRequestTokenRef.current,
      })
    },
    [],
  )

  const openSpecRelativePath = useCallback(
    (
      relativePath: string,
      lineRange: SpecLinkLineRange | null,
      headingId?: string | null,
    ) => {
      if (!workspaceFilePathSet.has(relativePath)) {
        return false
      }

      const isSpecTarget = relativePath.endsWith('.md')
      setActiveTab(isSpecTarget ? 'spec' : 'code')
      setSpecViewerNavigationRequest(null)
      selectFile(relativePath)
      if (lineRange) {
        setSelectionRange({
          startLine: lineRange.startLine,
          endLine: lineRange.endLine,
        })
        queueCodeViewerJumpRequest({
          targetRelativePath: relativePath,
          lineNumber: lineRange.startLine,
          shouldHighlight: true,
        })
      } else {
        setCodeViewerJumpRequest(null)
        if (isSpecTarget && headingId) {
          queueSpecViewerNavigationRequest({
            targetRelativePath: relativePath,
            headingId,
          })
        }
      }
      return true
    },
    [
      queueCodeViewerJumpRequest,
      queueSpecViewerNavigationRequest,
      selectFile,
      setActiveTab,
      setSelectionRange,
      workspaceFilePathSet,
    ],
  )

  const openCitationTarget = useCallback(
    async (target: CitationTarget): Promise<CitationNavigationResult> => {
      if (!rootPath) {
        return {
          ok: false,
          failureReason: 'Workspace is unavailable.',
        }
      }

      const targetFileContent =
        activeFile === target.targetRelativePath && activeFileContent !== null
          ? activeFileContent
          : null

      let fileContent = targetFileContent
      if (fileContent === null) {
        const readResult = await window.workspace.readFile(
          rootPath,
          target.targetRelativePath,
        )
        if (!readResult.ok || typeof readResult.content !== 'string') {
          return {
            ok: false,
            failureReason: `Failed to read citation target: ${
              readResult.error ?? target.targetRelativePath
            }`,
          }
        }
        fileContent = readResult.content
      }

      if (target.symbolName === null) {
        setSpecViewerNavigationRequest(null)
        selectFile(target.targetRelativePath)
        setActiveTab('code')
        setSelectionRange({
          startLine: 1,
          endLine: 1,
        })
        queueCodeViewerJumpRequest({
          targetRelativePath: target.targetRelativePath,
          lineNumber: 1,
          shouldHighlight: true,
        })
        return {
          ok: true,
        }
      }

      const resolution = resolvePythonSymbol(fileContent, target.symbolName)
      if (!resolution.ok) {
        return {
          ok: false,
          failureReason: describeCitationResolutionFailure(
            target.targetRelativePath,
            target.symbolName,
            resolution.reason,
          ),
        }
      }

      setSpecViewerNavigationRequest(null)
      selectFile(target.targetRelativePath)
      setActiveTab('code')
      setSelectionRange({
        startLine: resolution.lineNumber,
        endLine: resolution.lineNumber,
      })
      queueCodeViewerJumpRequest({
        targetRelativePath: target.targetRelativePath,
        lineNumber: resolution.lineNumber,
        sourceOffsetRange: resolution.sourceOffsetRange,
        shouldHighlight: true,
      })
      return {
        ok: true,
      }
    },
    [
      activeFile,
      activeFileContent,
      queueCodeViewerJumpRequest,
      rootPath,
      selectFile,
      setActiveTab,
      setSelectionRange,
    ],
  )

  const handleSelectFileFromTree = useCallback(
    (relativePath: string) => {
      setSpecViewerNavigationRequest(null)
      selectFile(relativePath)
      setActiveTab(relativePath.endsWith('.md') ? 'spec' : 'code')
    },
    [selectFile, setActiveTab],
  )

  const goToActiveSpecSourceLine = useCallback(
    (lineNumber: number, sourceOffsetRange?: SourceOffsetRange) => {
      if (!activeSpec) {
        showBanner('Cannot go to source: no active spec is selected.')
        return
      }

      const opened = openSpecRelativePath(activeSpec, {
        startLine: lineNumber,
        endLine: lineNumber,
      })
      if (!opened) {
        showBanner(
          'Cannot go to source: the active spec is unavailable in this workspace.',
        )
      } else {
        if (sourceOffsetRange) {
          queueCodeViewerJumpRequest({
            targetRelativePath: activeSpec,
            lineNumber,
            sourceOffsetRange,
            shouldHighlight: true,
          })
        }
        setActiveTab('code')
      }
    },
    [activeSpec, openSpecRelativePath, queueCodeViewerJumpRequest, setActiveTab, showBanner],
  )

  const handleRequestGoToSpec = useCallback(
    (input: { relativePath: string; lineNumber: number }) => {
      if (!input.relativePath.toLowerCase().endsWith('.md')) {
        return
      }

      if (!workspaceFilePathSet.has(input.relativePath)) {
        showBanner(
          'Cannot go to spec: the active markdown file is unavailable in this workspace.',
        )
        return
      }

      setActiveTab('spec')
      if (activeFile !== input.relativePath) {
        selectFile(input.relativePath)
      }
      queueSpecViewerNavigationRequest({
        targetRelativePath: input.relativePath,
        lineNumber: input.lineNumber,
      })
    },
    [
      activeFile,
      queueSpecViewerNavigationRequest,
      selectFile,
      setActiveTab,
      showBanner,
      workspaceFilePathSet,
    ],
  )

  const handleSpecScrollPositionChange = useCallback(
    (input: { relativePath: string; scrollTop: number }) => {
      if (!activeWorkspaceId) {
        return
      }

      const normalizedScrollTop = Math.max(0, Math.trunc(input.scrollTop))
      specScrollPositionsRef.current[
        buildSpecScrollStateKey(activeWorkspaceId, input.relativePath)
      ] = normalizedScrollTop
      savePersistedSpecScrollPositions(specScrollPositionsRef.current)
    },
    [activeWorkspaceId],
  )

  const restoredSpecScrollTop =
    activeWorkspaceId && activeSpec
      ? specScrollPositionsRef.current[
          buildSpecScrollStateKey(activeWorkspaceId, activeSpec)
        ] ?? null
      : null

  const handleCodeScrollChange = useCallback(
    (scrollTop: number) => {
      if (!activeWorkspaceId || !activeFile) {
        return
      }

      codeScrollPositionsRef.current[
        buildSpecScrollStateKey(activeWorkspaceId, activeFile)
      ] = scrollTop
    },
    [activeWorkspaceId, activeFile],
  )

  const restoredCodeScrollTop =
    activeWorkspaceId && activeFile
      ? codeScrollPositionsRef.current[
          buildSpecScrollStateKey(activeWorkspaceId, activeFile)
        ] ?? null
      : null

  const navigateHistory = useCallback(
    (direction: 'back' | 'forward') => {
      historyNavigationRef.current = true
      if (direction === 'back') {
        goBackInHistory()
        return
      }
      goForwardInHistory()
    },
    [goBackInHistory, goForwardInHistory],
  )

  // Active file change: handle jump request and tab switch
  useEffect(() => {
    if (!activeFile) {
      previousActiveFileRef.current = null
      return
    }

    const fileChanged = previousActiveFileRef.current !== activeFile
    previousActiveFileRef.current = activeFile
    if (!fileChanged) {
      return
    }

    if (historyNavigationRef.current) {
      historyNavigationRef.current = false
      setActiveTab(activeFile.endsWith('.md') ? 'spec' : 'code')
    }

    if (
      !selectionRange ||
      selectionRange.startLine !== selectionRange.endLine
    ) {
      return
    }

    if (
      codeViewerJumpRequest?.targetRelativePath === activeFile &&
      codeViewerJumpRequest.lineNumber === selectionRange.startLine &&
      codeViewerJumpRequest.sourceOffsetRange
    ) {
      return
    }

    jumpRequestTokenRef.current += 1
    setCodeViewerJumpRequest({
      targetRelativePath: activeFile,
      lineNumber: selectionRange.startLine,
      token: jumpRequestTokenRef.current,
    })
  }, [activeFile, codeViewerJumpRequest, selectionRange, setActiveTab])

  // Clear spec navigation request when active file changes
  useEffect(() => {
    if (
      specViewerNavigationRequest &&
      activeFile &&
      activeFile !== specViewerNavigationRequest.targetRelativePath
    ) {
      setSpecViewerNavigationRequest(null)
    }
  }, [activeFile, specViewerNavigationRequest])

  // Auto-dismiss banner
  useEffect(() => {
    if (!bannerMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      clearBanner()
    }, COMMENT_BANNER_AUTODISMISS_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [bannerMessage, clearBanner])

  // beforeunload guard
  useEffect(() => {
    if (!isDirty) {
      return
    }
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [isDirty])

  // Mouse button 3/4 navigation
  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      if (!isHistoryNavigationScopeTarget(event.target)) {
        return
      }

      if (event.button === 3) {
        event.preventDefault()
        navigateHistory('back')
        return
      }

      if (event.button === 4) {
        event.preventDefault()
        navigateHistory('forward')
      }
    }

    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [navigateHistory])

  // Track pointer down for history navigation scope
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      isHistoryNavigationScopeActiveRef.current = isHistoryNavigationScopeTarget(
        event.target,
      )
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [])

  // IPC history navigation
  useEffect(() => {
    const unsubscribe = window.workspace.onHistoryNavigate((event) => {
      if (event.source === 'swipe' && !isTrackpadHistorySupportedPlatform()) {
        return
      }
      const isScopeHovered =
        document.querySelector(`${HISTORY_NAVIGATION_SCOPE_SELECTOR}:hover`) !== null
      if (!isHistoryNavigationScopeActiveRef.current && !isScopeHovered) {
        return
      }
      navigateHistory(event.direction)
    })

    return unsubscribe
  }, [navigateHistory])

  // Keyboard shortcuts: Meta+Shift+Arrow for tab/workspace switching
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || !event.shiftKey || event.ctrlKey) return

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        setActiveTab(event.key === 'ArrowLeft' ? 'code' : 'spec')
        return
      }

      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

      event.preventDefault()

      const currentIndex = workspaces.findIndex(
        (ws) => ws.id === activeWorkspaceId,
      )
      if (currentIndex === -1 || workspaces.length < 2) return

      const nextIndex =
        event.key === 'ArrowUp'
          ? (currentIndex - 1 + workspaces.length) % workspaces.length
          : (currentIndex + 1) % workspaces.length

      switchWorkspace(workspaces[nextIndex].id)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [workspaces, activeWorkspaceId, setActiveTab, switchWorkspace])

  // Trackpad horizontal swipe navigation
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (!isTrackpadHistorySupportedPlatform()) {
        return
      }

      if (!isHistoryNavigationScopeTarget(event.target)) {
        return
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      if (isLikelyMouseHorizontalWheel(event)) {
        return
      }

      const absDeltaX = Math.abs(event.deltaX)
      if (absDeltaX < TRACKPAD_HISTORY_MIN_AXIS_DELTA) {
        return
      }

      if (absDeltaX <= Math.abs(event.deltaY)) {
        return
      }

      if (shouldSkipTrackpadHistoryFallback(event.target, event.deltaX)) {
        return
      }

      const state = wheelHistoryStateRef.current
      const now = performance.now()
      const direction = event.deltaX > 0 ? 'forward' : 'back'

      if (now < state.cooldownUntil) {
        if (direction === state.lastTriggeredDirection) {
          return
        }
      }

      if (now - state.lastEventAt > TRACKPAD_HISTORY_IDLE_RESET_MS) {
        state.accumulatedDeltaX = 0
        state.lastTriggeredDirection = null
      }

      state.lastEventAt = now
      state.accumulatedDeltaX += event.deltaX

      if (Math.abs(state.accumulatedDeltaX) < TRACKPAD_HISTORY_TRIGGER_DELTA) {
        return
      }

      event.preventDefault()
      const triggeredDirection = state.accumulatedDeltaX > 0 ? 'forward' : 'back'
      navigateHistory(triggeredDirection)
      state.accumulatedDeltaX = 0
      state.cooldownUntil = now + TRACKPAD_HISTORY_COOLDOWN_MS
      state.lastTriggeredDirection = triggeredDirection
    }

    window.addEventListener('wheel', handleWheel, {
      passive: false,
    })
    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [navigateHistory])

  return {
    codeViewerJumpRequest,
    specViewerNavigationRequest,
    restoredSpecScrollTop,
    restoredCodeScrollTop,
    navigateHistory,
    queueCodeViewerJumpRequest,
    queueSpecViewerNavigationRequest,
    openSpecRelativePath,
    openCitationTarget,
    handleSelectFileFromTree,
    goToActiveSpecSourceLine,
    handleRequestGoToSpec,
    handleSpecScrollPositionChange,
    handleCodeScrollChange,
  }
}
