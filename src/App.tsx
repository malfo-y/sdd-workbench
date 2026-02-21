import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import './App.css'
import {
  buildCopyActiveFilePathPayload,
  buildCopySelectedContentPayload,
  buildCopySelectedLinesPayload,
} from './context-copy/copy-payload'
import {
  CodeViewerPanel,
  type CodeViewerJumpRequest,
} from './code-viewer/code-viewer-panel'
import { FileTreePanel } from './file-tree/file-tree-panel'
import { type SpecLinkLineRange } from './spec-viewer/spec-link-utils'
import { SpecViewerPanel } from './spec-viewer/spec-viewer-panel'
import { abbreviateWorkspacePath } from './workspace/path-format'
import { useWorkspace } from './workspace/use-workspace'
import { WorkspaceSwitcher } from './workspace/workspace-switcher'
import type { LineSelectionRange } from './workspace/workspace-model'

function collectWorkspaceFilePaths(
  nodes: WorkspaceFileNode[],
  paths = new Set<string>(),
): Set<string> {
  for (const node of nodes) {
    if (node.kind === 'file') {
      paths.add(node.relativePath)
      continue
    }

    collectWorkspaceFilePaths(node.children ?? [], paths)
  }

  return paths
}

const MIN_LEFT_PANE_WIDTH = 220
const MIN_CENTER_PANE_WIDTH = 360
const MIN_RIGHT_PANE_WIDTH = 220
const RESIZER_WIDTH = 12
const TRACKPAD_HISTORY_MIN_AXIS_DELTA = 18
const TRACKPAD_HISTORY_TRIGGER_DELTA = 120
const TRACKPAD_HISTORY_IDLE_RESET_MS = 160
const TRACKPAD_HISTORY_COOLDOWN_MS = 380

type PaneSizes = {
  left: number
  center: number
  right: number
}

type ResizeHandle = 'left' | 'right'

type ResizeSession = {
  handle: ResizeHandle
  startX: number
  availableWidth: number
  startSizes: PaneSizes
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

type WheelHistoryState = {
  accumulatedDeltaX: number
  lastEventAt: number
  cooldownUntil: number
  lastTriggeredDirection: 'back' | 'forward' | null
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

function ItermIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect
        fill="none"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
        width="20"
        x="2"
        y="3"
      />
      <path
        d="M7 9.5L10 12L7 14.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12.5 15H17"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function VsCodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M17.5 4L10.2 9.8L6.8 6.8L4.2 8.2L7.7 12L4.2 15.8L6.8 17.2L10.2 14.2L17.5 20V4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function App() {
  const {
    workspaces,
    activeWorkspaceId,
    rootPath,
    fileTree,
    changedFiles,
    activeFile,
    activeSpec,
    activeFileContent,
    activeSpecContent,
    isIndexing,
    isReadingFile,
    isReadingSpec,
    readFileError,
    activeSpecReadError,
    previewUnavailableReason,
    selectionRange,
    expandedDirectories,
    bannerMessage,
    openWorkspace,
    setActiveWorkspace,
    closeWorkspace,
    selectFile,
    canGoBack,
    canGoForward,
    goBackInHistory,
    goForwardInHistory,
    showBanner,
    setSelectionRange,
    setExpandedDirectories,
    clearBanner,
  } = useWorkspace()
  const displayPath = rootPath
    ? abbreviateWorkspacePath(rootPath)
    : 'No workspace selected'
  const [paneSizes, setPaneSizes] = useState<PaneSizes>({
    left: 15,
    center: 40,
    right: 45,
  })
  const [activeResizeHandle, setActiveResizeHandle] =
    useState<ResizeHandle | null>(null)
  const workspaceLayoutRef = useRef<HTMLElement | null>(null)
  const resizeSessionRef = useRef<ResizeSession | null>(null)
  const workspaceFilePathSet = useMemo(
    () => collectWorkspaceFilePaths(fileTree),
    [fileTree],
  )
  const jumpRequestTokenRef = useRef(0)
  const [codeViewerJumpRequest, setCodeViewerJumpRequest] =
    useState<CodeViewerJumpRequest | null>(null)
  const previousActiveFileRef = useRef<string | null>(null)
  const wheelHistoryStateRef = useRef<WheelHistoryState>({
    accumulatedDeltaX: 0,
    lastEventAt: 0,
    cooldownUntil: 0,
    lastTriggeredDirection: null,
  })

  const writeToClipboard = useCallback(
    async (payload: string, errorMessage: string) => {
      if (!navigator.clipboard?.writeText) {
        showBanner('Failed to copy: clipboard API is unavailable.')
        return
      }

      try {
        await navigator.clipboard.writeText(payload)
      } catch {
        showBanner(errorMessage)
      }
    },
    [showBanner],
  )

  const handleCopyRelativePath = useCallback(
    (relativePath: string) => {
      if (activeWorkspaceId === null) {
        return
      }

      const payload = buildCopyActiveFilePathPayload(relativePath)
      void writeToClipboard(payload, 'Failed to copy relative path.')
    },
    [activeWorkspaceId, writeToClipboard],
  )

  const handleCopyBoth = useCallback(
    (input: {
      relativePath: string
      content: string
      selectionRange: LineSelectionRange
    }) => {
      if (activeWorkspaceId === null) {
        return
      }

      const payload = buildCopySelectedLinesPayload({
        relativePath: input.relativePath,
        content: input.content,
        selectionRange: input.selectionRange,
      })
      void writeToClipboard(payload, 'Failed to copy selected lines.')
    },
    [activeWorkspaceId, writeToClipboard],
  )

  const handleCopySelectedContent = useCallback(
    (input: {
      relativePath: string
      content: string
      selectionRange: LineSelectionRange
    }) => {
      if (activeWorkspaceId === null) {
        return
      }

      const payload = buildCopySelectedContentPayload({
        content: input.content,
        selectionRange: input.selectionRange,
      })
      void writeToClipboard(payload, 'Failed to copy selected content.')
    },
    [activeWorkspaceId, writeToClipboard],
  )

  const openWorkspaceInExternalApp = useCallback(
    async (target: 'iterm' | 'vscode') => {
      if (!rootPath) {
        return
      }

      const targetLabel = target === 'iterm' ? 'iTerm' : 'VSCode'
      try {
        const result =
          target === 'iterm'
            ? await window.workspace.openInIterm(rootPath)
            : await window.workspace.openInVsCode(rootPath)
        if (!result.ok) {
          showBanner(result.error ?? `Failed to open workspace in ${targetLabel}.`)
        }
      } catch {
        showBanner(`Failed to open workspace in ${targetLabel}.`)
      }
    },
    [rootPath, showBanner],
  )

  const workspaceLayoutStyle = useMemo(
    () =>
      ({
        '--pane-left': `${paneSizes.left}%`,
        '--pane-center': `${paneSizes.center}%`,
        '--pane-right': `${paneSizes.right}%`,
      }) as CSSProperties,
    [paneSizes],
  )

  const startResize = (handle: ResizeHandle, clientX: number) => {
    const layoutElement = workspaceLayoutRef.current
    if (!layoutElement) {
      return
    }

    const layoutWidth = layoutElement.getBoundingClientRect().width
    const availableWidth = layoutWidth - RESIZER_WIDTH * 2
    const minimumWidthSum =
      MIN_LEFT_PANE_WIDTH + MIN_CENTER_PANE_WIDTH + MIN_RIGHT_PANE_WIDTH

    if (availableWidth <= minimumWidthSum) {
      return
    }

    resizeSessionRef.current = {
      handle,
      startX: clientX,
      availableWidth,
      startSizes: paneSizes,
    }
    setActiveResizeHandle(handle)
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
      const startRightWidth = (startSizes.right / 100) * availableWidth

      if (resizeSession.handle === 'left') {
        const maxLeftWidth =
          availableWidth - MIN_CENTER_PANE_WIDTH - startRightWidth
        const nextLeftWidth = clamp(
          startLeftWidth + deltaX,
          MIN_LEFT_PANE_WIDTH,
          maxLeftWidth,
        )
        const nextCenterWidth =
          availableWidth - startRightWidth - nextLeftWidth

        setPaneSizes({
          left: (nextLeftWidth / availableWidth) * 100,
          center: (nextCenterWidth / availableWidth) * 100,
          right: (startRightWidth / availableWidth) * 100,
        })
        return
      }

      const maxRightWidth =
        availableWidth - startLeftWidth - MIN_CENTER_PANE_WIDTH
      const nextRightWidth = clamp(
        startRightWidth - deltaX,
        MIN_RIGHT_PANE_WIDTH,
        maxRightWidth,
      )
      const nextCenterWidth = availableWidth - startLeftWidth - nextRightWidth

      setPaneSizes({
        left: (startLeftWidth / availableWidth) * 100,
        center: (nextCenterWidth / availableWidth) * 100,
        right: (nextRightWidth / availableWidth) * 100,
      })
    }

    const stopResize = () => {
      resizeSessionRef.current = null
      setActiveResizeHandle(null)
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

  const openSpecRelativePath = useCallback(
    (
      relativePath: string,
      lineRange: SpecLinkLineRange | null,
    ) => {
      if (!workspaceFilePathSet.has(relativePath)) {
        return false
      }

      selectFile(relativePath)
      if (lineRange) {
        setSelectionRange({
          startLine: lineRange.startLine,
          endLine: lineRange.endLine,
        })
        jumpRequestTokenRef.current += 1
        setCodeViewerJumpRequest({
          targetRelativePath: relativePath,
          lineNumber: lineRange.startLine,
          token: jumpRequestTokenRef.current,
        })
      } else {
        setCodeViewerJumpRequest(null)
      }
      return true
    },
    [workspaceFilePathSet, selectFile, setSelectionRange],
  )

  const goToActiveSpecSourceLine = useCallback(
    (lineNumber: number) => {
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
      }
    },
    [activeSpec, openSpecRelativePath, showBanner],
  )

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

    if (
      !selectionRange ||
      selectionRange.startLine !== selectionRange.endLine
    ) {
      return
    }

    jumpRequestTokenRef.current += 1
    setCodeViewerJumpRequest({
      targetRelativePath: activeFile,
      lineNumber: selectionRange.startLine,
      token: jumpRequestTokenRef.current,
    })
  }, [activeFile, selectionRange])

  const navigateHistory = useCallback(
    (direction: 'back' | 'forward') => {
      if (direction === 'back') {
        goBackInHistory()
        return
      }
      goForwardInHistory()
    },
    [goBackInHistory, goForwardInHistory],
  )

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
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

  useEffect(() => {
    const unsubscribe = window.workspace.onHistoryNavigate((event) => {
      navigateHistory(event.direction)
    })

    return unsubscribe
  }, [navigateHistory])

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
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

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>SDD Workbench</h1>
        <div className="app-header-actions">
          <button
            disabled={!canGoBack}
            onClick={goBackInHistory}
            type="button"
          >
            Back
          </button>
          <button
            disabled={!canGoForward}
            onClick={goForwardInHistory}
            type="button"
          >
            Forward
          </button>
          <WorkspaceSwitcher
            activeWorkspaceId={activeWorkspaceId}
            onCloseWorkspace={closeWorkspace}
            onSelectWorkspace={setActiveWorkspace}
            workspaces={workspaces}
          />
          <button onClick={() => void openWorkspace()} type="button">
            Open Workspace
          </button>
        </div>
      </header>

      {bannerMessage && (
        <div className="text-banner" role="alert">
          <span>{bannerMessage}</span>
          <button onClick={clearBanner}>Dismiss</button>
        </div>
      )}

      <section
        className="workspace-layout"
        ref={workspaceLayoutRef}
        style={workspaceLayoutStyle}
      >
        <div className="pane-slot">
          <section className="file-panel" data-testid="file-panel">
            <div className="workspace-summary">
              <p className="label">Current Workspace</p>
              <p
                className="path workspace-summary-path"
                data-testid="workspace-path"
                title={rootPath ?? ''}
              >
                {displayPath}
              </p>
            </div>
            <div className="workspace-open-in">
              <span className="workspace-open-in-label">Open In:</span>
              <div className="workspace-open-in-actions">
                <button
                  aria-label="Open in iTerm"
                  className="workspace-open-in-button"
                  data-testid="workspace-open-in-iterm"
                  disabled={!rootPath}
                  onClick={() => void openWorkspaceInExternalApp('iterm')}
                  title="Open in iTerm"
                  type="button"
                >
                  <ItermIcon />
                </button>
                <button
                  aria-label="Open in VSCode"
                  className="workspace-open-in-button"
                  data-testid="workspace-open-in-vscode"
                  disabled={!rootPath}
                  onClick={() => void openWorkspaceInExternalApp('vscode')}
                  title="Open in VSCode"
                  type="button"
                >
                  <VsCodeIcon />
                </button>
              </div>
            </div>
            <FileTreePanel
              activeFile={activeFile}
              expandedDirectories={expandedDirectories}
              fileTree={fileTree}
              changedFiles={changedFiles}
              isIndexing={isIndexing}
              onExpandedDirectoriesChange={setExpandedDirectories}
              onRequestCopyRelativePath={handleCopyRelativePath}
              onSelectFile={selectFile}
              rootPath={rootPath}
            />
          </section>
        </div>

        <div
          aria-label="Resize file browser and code preview panels"
          aria-orientation="vertical"
          className={`pane-resizer ${activeResizeHandle === 'left' ? 'is-active' : ''}`}
          data-testid="pane-resizer-left"
          onPointerDown={(event) => startResize('left', event.clientX)}
          role="separator"
        />

        <div className="pane-slot">
          <CodeViewerPanel
            activeFile={activeFile}
            activeFileContent={activeFileContent}
            isReadingFile={isReadingFile}
            jumpRequest={codeViewerJumpRequest}
            onSelectRange={setSelectionRange}
            onRequestCopyBoth={handleCopyBoth}
            onRequestCopyRelativePath={handleCopyRelativePath}
            onRequestCopySelectedContent={handleCopySelectedContent}
            previewUnavailableReason={previewUnavailableReason}
            readFileError={readFileError}
            selectionRange={selectionRange}
          />
        </div>

        <div
          aria-label="Resize code preview and rendered spec panels"
          aria-orientation="vertical"
          className={`pane-resizer ${activeResizeHandle === 'right' ? 'is-active' : ''}`}
          data-testid="pane-resizer-right"
          onPointerDown={(event) => startResize('right', event.clientX)}
          role="separator"
        />

        <div className="pane-slot">
          <section className="workspace-card spec-panel" data-testid="spec-panel">
            <SpecViewerPanel
              activeSpecPath={activeSpec}
              isLoading={isReadingSpec}
              markdownContent={activeSpecContent}
              onGoToSourceLine={goToActiveSpecSourceLine}
              onOpenRelativePath={openSpecRelativePath}
              readError={activeSpecReadError}
            />
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
