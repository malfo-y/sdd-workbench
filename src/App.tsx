import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import './App.css'
import { CodeViewerPanel } from './code-viewer/code-viewer-panel'
import { FileTreePanel } from './file-tree/file-tree-panel'
import { SpecViewerPanel } from './spec-viewer/spec-viewer-panel'
import { abbreviateWorkspacePath } from './workspace/path-format'
import { useWorkspace } from './workspace/use-workspace'
import { WorkspaceSwitcher } from './workspace/workspace-switcher'

function isMarkdownFile(path: string | null) {
  return path?.toLowerCase().endsWith('.md') ?? false
}

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

function App() {
  const {
    workspaces,
    activeWorkspaceId,
    rootPath,
    fileTree,
    activeFile,
    activeSpec,
    activeFileContent,
    isIndexing,
    isReadingFile,
    readFileError,
    previewUnavailableReason,
    selectionRange,
    expandedDirectories,
    bannerMessage,
    openWorkspace,
    setActiveWorkspace,
    closeWorkspace,
    selectFile,
    setSelectionRange,
    setExpandedDirectories,
    clearBanner,
  } = useWorkspace()
  const displayPath = rootPath
    ? abbreviateWorkspacePath(rootPath)
    : 'No workspace selected'
  const displayActiveFile = activeFile ?? 'No active file'
  const activeFileIsMarkdown = isMarkdownFile(activeFile)
  const [paneSizes, setPaneSizes] = useState<PaneSizes>({
    left: 25,
    center: 50,
    right: 25,
  })
  const [activeResizeHandle, setActiveResizeHandle] =
    useState<ResizeHandle | null>(null)
  const workspaceLayoutRef = useRef<HTMLElement | null>(null)
  const resizeSessionRef = useRef<ResizeSession | null>(null)
  const workspaceFilePathSet = useMemo(
    () => collectWorkspaceFilePaths(fileTree),
    [fileTree],
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
    (relativePath: string) => {
      if (!workspaceFilePathSet.has(relativePath)) {
        return false
      }

      selectFile(relativePath)
      return true
    },
    [workspaceFilePathSet, selectFile],
  )

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>SDD Workbench</h1>
        <div className="app-header-actions">
          <WorkspaceSwitcher
            activeWorkspaceId={activeWorkspaceId}
            onCloseWorkspace={closeWorkspace}
            onSelectWorkspace={setActiveWorkspace}
            workspaces={workspaces}
          />
          <button onClick={() => void openWorkspace()}>Open Workspace</button>
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
          <FileTreePanel
            activeFile={activeFile}
            expandedDirectories={expandedDirectories}
            fileTree={fileTree}
            isIndexing={isIndexing}
            onExpandedDirectoriesChange={setExpandedDirectories}
            onSelectFile={selectFile}
            rootPath={rootPath}
          />
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
            onSelectRange={setSelectionRange}
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
            <p className="label">Current Workspace</p>
            <p className="path" data-testid="workspace-path" title={rootPath ?? ''}>
              {displayPath}
            </p>
            <p
              className="path active-file-path"
              data-testid="active-file-path"
              title={activeFile ?? ''}
            >
              {displayActiveFile}
            </p>
            <SpecViewerPanel
              activeSpecPath={activeSpec}
              isLoading={activeFileIsMarkdown && isReadingFile}
              markdownContent={activeFileIsMarkdown ? activeFileContent : null}
              onOpenRelativePath={openSpecRelativePath}
              readError={activeFileIsMarkdown ? readFileError : null}
            />
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
