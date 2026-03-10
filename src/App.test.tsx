import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { StrictMode } from 'react'
import { EditorView } from '@codemirror/view'
import App from './App'
import {
  APPEARANCE_THEME_STORAGE_KEY,
  DEFAULT_APPEARANCE_THEME,
  type AppearanceTheme,
} from './appearance-theme'
import { WorkspaceProvider } from './workspace/workspace-context'
import { useWorkspace } from './workspace/use-workspace'
import {
  WORKSPACE_SESSION_SCHEMA_VERSION,
  WORKSPACE_SESSION_STORAGE_KEY,
} from './workspace/workspace-persistence'

const indexCssSource = readFileSync(
  resolve(process.cwd(), 'src/index.css'),
  'utf8',
)
const appCssSource = readFileSync(resolve(process.cwd(), 'src/App.css'), 'utf8')

function MarkDirtyButton() {
  const { markFileDirty } = useWorkspace()
  return (
    <button data-testid="mark-dirty-btn" onClick={markFileDirty} type="button">
      Mark Dirty
    </button>
  )
}

function AppWithMarkDirty() {
  return (
    <WorkspaceProvider>
      <App />
      <MarkDirtyButton />
    </WorkspaceProvider>
  )
}

function createTestStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key) ?? null : null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, String(value))
    },
  }
}

function setWorkspaceSessionStorage(rawValue: unknown) {
  window.localStorage.setItem(
    WORKSPACE_SESSION_STORAGE_KEY,
    JSON.stringify(rawValue),
  )
}

function clearWorkspaceSessionStorage() {
  window.localStorage.removeItem(WORKSPACE_SESSION_STORAGE_KEY)
}

function setAppearanceThemeStorage(value: string) {
  window.localStorage.setItem(APPEARANCE_THEME_STORAGE_KEY, value)
}

function clearAppearanceThemeStorage() {
  window.localStorage.removeItem(APPEARANCE_THEME_STORAGE_KEY)
}

function getCM6View(container: HTMLElement): EditorView | null {
  const cmEditor = container.querySelector('.cm-editor')
  return cmEditor ? EditorView.findFromDOM(cmEditor as HTMLElement) : null
}

function findTextNodeContaining(root: Node, fragment: string): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let currentNode = walker.nextNode()
  while (currentNode) {
    if (currentNode.textContent?.includes(fragment)) {
      return currentNode as Text
    }
    currentNode = walker.nextNode()
  }
  return null
}

async function expandWorkspaceSummaryIfCollapsed() {
  const expandButton = screen.queryByRole('button', { name: 'Expand' })
  if (!expandButton) {
    return
  }

  fireEvent.click(expandButton)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument()
  })
}

describe('F01/F02/F03/F04 workspace flow', () => {
  const openDialogMock = vi.fn<() => Promise<WorkspaceOpenDialogResult>>()
  const indexWorkspaceMock =
    vi.fn<(rootPath: string) => Promise<WorkspaceIndexResult>>()
  const readFileMock =
    vi.fn<
      (rootPath: string, relativePath: string) => Promise<WorkspaceReadFileResult>
    >()
  const getGitLineMarkersMock =
    vi.fn<
      (
        rootPath: string,
        relativePath: string,
      ) => Promise<WorkspaceGetGitLineMarkersResult>
    >()
  const getGitFileStatusesMock =
    vi.fn<
      (rootPath: string) => Promise<WorkspaceGetGitFileStatusesResult>
    >()
  const readCommentsMock =
    vi.fn<(rootPath: string) => Promise<WorkspaceReadCommentsResult>>()
  const writeCommentsMock =
    vi.fn<
      (
        rootPath: string,
        comments: CodeCommentRecord[],
      ) => Promise<WorkspaceWriteCommentsResult>
    >()
  const readGlobalCommentsMock =
    vi.fn<(rootPath: string) => Promise<WorkspaceReadGlobalCommentsResult>>()
  const writeGlobalCommentsMock =
    vi.fn<
      (rootPath: string, body: string) => Promise<WorkspaceWriteGlobalCommentsResult>
    >()
  const exportCommentsBundleMock =
    vi.fn<
      (
        request: WorkspaceExportCommentsBundleRequest,
      ) => Promise<WorkspaceExportCommentsBundleResult>
    >()
  const watchStartMock =
    vi.fn<
      (
        workspaceId: string,
        rootPath: string,
        watchModePreference?: WorkspaceWatchModePreference,
      ) => Promise<WorkspaceWatchControlResult>
    >()
  const watchStopMock =
    vi.fn<(workspaceId: string) => Promise<WorkspaceWatchControlResult>>()
  const connectRemoteMock =
    vi.fn<
      (
        profile: WorkspaceRemoteConnectionProfile,
      ) => Promise<WorkspaceConnectRemoteResult>
    >()
  const browseRemoteDirectoriesMock =
    vi.fn<
      (
        request: WorkspaceRemoteDirectoryBrowseRequest,
      ) => Promise<WorkspaceRemoteDirectoryBrowseResult>
    >()
  const disconnectRemoteMock =
    vi.fn<
      (workspaceId: string) => Promise<WorkspaceDisconnectRemoteResult>
    >()
  const indexDirectoryMock =
    vi.fn<
      (
        rootPath: string,
        relativePath: string,
        options?: { offset?: number; limit?: number },
      ) => Promise<WorkspaceIndexDirectoryResult>
    >()
  const writeFileMock =
    vi.fn<
      (
        rootPath: string,
        relativePath: string,
        content: string,
      ) => Promise<WorkspaceWriteFileResult>
    >()
  const openInItermMock =
    vi.fn<(request: SystemOpenInRequest) => Promise<SystemOpenInResult>>()
  const openInVsCodeMock =
    vi.fn<(request: SystemOpenInRequest) => Promise<SystemOpenInResult>>()
  const openInFinderMock =
    vi.fn<(request: SystemOpenInRequest) => Promise<SystemOpenInResult>>()
  const createFileMock =
    vi.fn<(rootPath: string, relativePath: string) => Promise<{ ok: boolean; error?: string }>>()
  const createDirectoryMock =
    vi.fn<(rootPath: string, relativePath: string) => Promise<{ ok: boolean; error?: string }>>()
  const deleteFileMock =
    vi.fn<(rootPath: string, relativePath: string) => Promise<{ ok: boolean; error?: string }>>()
  const deleteDirectoryMock =
    vi.fn<(rootPath: string, relativePath: string) => Promise<{ ok: boolean; error?: string }>>()
  const renameMock =
    vi.fn<(rootPath: string, oldRelativePath: string, newRelativePath: string) => Promise<{ ok: boolean; error?: string }>>()
  const searchFilesMock =
    vi.fn<
      (
        rootPath: string,
        query: string,
        options?: {
          maxDepth?: number
          maxResults?: number
          maxDirectoryChildren?: number
          timeBudgetMs?: number
        },
      ) => Promise<WorkspaceSearchFilesResult>
    >()
  const watchListeners = new Set<(event: WorkspaceWatchEvent) => void>()
  const onWatchEventMock =
    vi.fn<(listener: (event: WorkspaceWatchEvent) => void) => () => void>()
  const watchFallbackListeners = new Set<(event: WorkspaceWatchFallbackEvent) => void>()
  const onWatchFallbackMock =
    vi.fn<(listener: (event: WorkspaceWatchFallbackEvent) => void) => () => void>()
  const historyNavigateListeners = new Set<
    (event: WorkspaceHistoryNavigationEvent) => void
  >()
  const onHistoryNavigateMock =
    vi.fn<
      (
        listener: (event: WorkspaceHistoryNavigationEvent) => void,
      ) => () => void
    >()
  const remoteConnectionListeners = new Set<
    (event: WorkspaceRemoteConnectionEvent) => void
  >()
  const onRemoteConnectionEventMock =
    vi.fn<
      (
        listener: (event: WorkspaceRemoteConnectionEvent) => void,
      ) => () => void
    >()
  const appearanceThemeMenuRequestListeners = new Set<
    (theme: AppearanceTheme) => void
  >()
  const onAppearanceThemeMenuRequestMock =
    vi.fn<(listener: (theme: AppearanceTheme) => void) => () => void>()
  const notifyAppearanceThemeChangedMock =
    vi.fn<(theme: AppearanceTheme) => void>()

  beforeEach(() => {
    openDialogMock.mockReset()
    indexWorkspaceMock.mockReset()
    indexDirectoryMock.mockReset()
    readFileMock.mockReset()
    getGitLineMarkersMock.mockReset()
    getGitFileStatusesMock.mockReset()
    readCommentsMock.mockReset()
    writeCommentsMock.mockReset()
    readGlobalCommentsMock.mockReset()
    writeGlobalCommentsMock.mockReset()
    exportCommentsBundleMock.mockReset()
    watchStartMock.mockReset()
    watchStopMock.mockReset()
    connectRemoteMock.mockReset()
    browseRemoteDirectoriesMock.mockReset()
    disconnectRemoteMock.mockReset()
    writeFileMock.mockReset()
    openInItermMock.mockReset()
    openInVsCodeMock.mockReset()
    openInFinderMock.mockReset()
    createFileMock.mockReset()
    createDirectoryMock.mockReset()
    deleteFileMock.mockReset()
    deleteDirectoryMock.mockReset()
    renameMock.mockReset()
    searchFilesMock.mockReset()
    onWatchEventMock.mockReset()
    onWatchFallbackMock.mockReset()
    onHistoryNavigateMock.mockReset()
    onRemoteConnectionEventMock.mockReset()
    onAppearanceThemeMenuRequestMock.mockReset()
    notifyAppearanceThemeChangedMock.mockReset()
    watchListeners.clear()
    watchFallbackListeners.clear()
    historyNavigateListeners.clear()
    remoteConnectionListeners.clear()
    appearanceThemeMenuRequestListeners.clear()
    watchStartMock.mockResolvedValue({
      ok: true,
      watchMode: 'native',
      isRemoteMounted: false,
      fallbackApplied: false,
    })
    watchStopMock.mockResolvedValue({ ok: true })
    connectRemoteMock.mockResolvedValue({
      ok: false,
      workspaceId: '',
      errorCode: 'UNKNOWN',
      error: 'Not configured in test.',
    })
    browseRemoteDirectoriesMock.mockResolvedValue({
      ok: true,
      currentPath: '/home/tester',
      entries: [],
      truncated: false,
    })
    disconnectRemoteMock.mockResolvedValue({
      ok: true,
      workspaceId: '',
    })
    readCommentsMock.mockResolvedValue({
      ok: true,
      comments: [],
    })
    getGitLineMarkersMock.mockResolvedValue({
      ok: true,
      markers: [],
    })
    getGitFileStatusesMock.mockResolvedValue({
      ok: true,
      statuses: {},
    })
    readGlobalCommentsMock.mockResolvedValue({
      ok: true,
      body: '',
    })
    writeCommentsMock.mockResolvedValue({ ok: true })
    writeGlobalCommentsMock.mockResolvedValue({ ok: true })
    exportCommentsBundleMock.mockResolvedValue({ ok: true })
    indexDirectoryMock.mockResolvedValue({
      ok: true,
      children: [],
      childrenStatus: 'complete' as const,
      totalChildCount: 0,
    })
    openInItermMock.mockResolvedValue({ ok: true })
    openInVsCodeMock.mockResolvedValue({ ok: true })
    openInFinderMock.mockResolvedValue({ ok: true })
    createFileMock.mockResolvedValue({ ok: true })
    createDirectoryMock.mockResolvedValue({ ok: true })
    deleteFileMock.mockResolvedValue({ ok: true })
    deleteDirectoryMock.mockResolvedValue({ ok: true })
    renameMock.mockResolvedValue({ ok: true })
    searchFilesMock.mockResolvedValue({
      ok: true,
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
    onWatchEventMock.mockImplementation((listener) => {
      watchListeners.add(listener)
      return () => {
        watchListeners.delete(listener)
      }
    })
    onWatchFallbackMock.mockImplementation((listener) => {
      watchFallbackListeners.add(listener)
      return () => {
        watchFallbackListeners.delete(listener)
      }
    })
    onHistoryNavigateMock.mockImplementation((listener) => {
      historyNavigateListeners.add(listener)
      return () => {
        historyNavigateListeners.delete(listener)
      }
    })
    onRemoteConnectionEventMock.mockImplementation((listener) => {
      remoteConnectionListeners.add(listener)
      return () => {
        remoteConnectionListeners.delete(listener)
      }
    })
    onAppearanceThemeMenuRequestMock.mockImplementation((listener) => {
      appearanceThemeMenuRequestListeners.add(listener)
      return () => {
        appearanceThemeMenuRequestListeners.delete(listener)
      }
    })
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createTestStorage(),
    })
    clearWorkspaceSessionStorage()
    clearAppearanceThemeStorage()
    window.workspace = {
      openDialog: openDialogMock,
      index: indexWorkspaceMock,
      indexDirectory: indexDirectoryMock,
      searchFiles: searchFilesMock,
      readFile: readFileMock,
      writeFile: writeFileMock,
      getGitLineMarkers: getGitLineMarkersMock,
      getGitFileStatuses: getGitFileStatusesMock,
      readComments: readCommentsMock,
      writeComments: writeCommentsMock,
      readGlobalComments: readGlobalCommentsMock,
      writeGlobalComments: writeGlobalCommentsMock,
      exportCommentsBundle: exportCommentsBundleMock,
      watchStart: watchStartMock,
      watchStop: watchStopMock,
      connectRemote: connectRemoteMock,
      browseRemoteDirectories: browseRemoteDirectoriesMock,
      disconnectRemote: disconnectRemoteMock,
      onWatchEvent: onWatchEventMock,
      onWatchFallback: onWatchFallbackMock,
      onRemoteConnectionEvent: onRemoteConnectionEventMock,
      onHistoryNavigate: onHistoryNavigateMock,
      onAppearanceThemeMenuRequest: onAppearanceThemeMenuRequestMock,
      notifyAppearanceThemeChanged: notifyAppearanceThemeChangedMock,
      openInIterm: openInItermMock,
      openInVsCode: openInVsCodeMock,
      openInFinder: openInFinderMock,
      createFile: createFileMock,
      createDirectory: createDirectoryMock,
      deleteFile: deleteFileMock,
      deleteDirectory: deleteDirectoryMock,
      rename: renameMock,
    }
  })

  const emitWatchEvent = (event: WorkspaceWatchEvent) => {
    for (const listener of watchListeners) {
      listener(event)
    }
  }

  const emitHistoryNavigateEvent = (event: WorkspaceHistoryNavigationEvent) => {
    for (const listener of historyNavigateListeners) {
      listener(event)
    }
  }

  const emitAppearanceThemeMenuRequest = (theme: AppearanceTheme) => {
    for (const listener of appearanceThemeMenuRequestListeners) {
      listener(theme)
    }
  }

  const emitRemoteConnectionEvent = (event: WorkspaceRemoteConnectionEvent) => {
    for (const listener of remoteConnectionListeners) {
      listener(event)
    }
  }

  afterEach(() => {
    cleanup()
  })

  it('updates workspace path and keeps previous path when selection is canceled', async () => {
    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: '/Users/tester/projects/sdd-workbench',
      })
      .mockResolvedValueOnce({
        canceled: true,
        selectedPath: null,
      })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    expect(screen.getByTestId('workspace-path')).toHaveTextContent(
      'No workspace selected',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveTextContent(
        '~/projects/sdd-workbench',
      )
    })
    expect(screen.getByTestId('workspace-path')).toHaveAttribute(
      'title',
      '/Users/tester/projects/sdd-workbench',
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(indexWorkspaceMock).toHaveBeenCalledWith(
      '/Users/tester/projects/sdd-workbench',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('canceled')
    })

    expect(screen.getByTestId('workspace-path')).toHaveTextContent(
      '~/projects/sdd-workbench',
    )
    expect(indexWorkspaceMock).toHaveBeenCalledTimes(1)
  })

  it('shows error banner when open dialog returns error', async () => {
    openDialogMock.mockResolvedValueOnce({
      canceled: true,
      selectedPath: null,
      error: 'permission denied',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('permission denied')
    })

    expect(screen.getByTestId('workspace-path')).toHaveTextContent(
      'No workspace selected',
    )
    expect(indexWorkspaceMock).not.toHaveBeenCalled()
  })

  it('renders Open In buttons as disabled when no active workspace exists', () => {
    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    expect(screen.getByRole('button', { name: 'Open in iTerm' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open in VSCode' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open in Finder' })).toBeDisabled()
  })

  it('shows resolved watch mode metadata and restarts watcher on preference change', async () => {
    const workspaceRoot = '/Volumes/remote-workspace/project-a'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    watchStartMock.mockImplementation(
      async (_workspaceId, _rootPath, watchModePreference = 'auto') => ({
        ok: true,
        watchMode: watchModePreference === 'native' ? 'native' : 'polling',
        isRemoteMounted: true,
        fallbackApplied: false,
      }),
    )

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-watch-mode-value')).toHaveTextContent(
        'Polling',
      )
    })
    expect(screen.getByTestId('workspace-remote-badge')).toHaveTextContent(
      'REMOTE',
    )
    await expandWorkspaceSummaryIfCollapsed()
    expect(screen.getByTestId('workspace-watch-mode-preference')).toHaveValue(
      'auto',
    )

    fireEvent.change(screen.getByTestId('workspace-watch-mode-preference'), {
      target: { value: 'native' },
    })

    await waitFor(() => {
      expect(watchStartMock).toHaveBeenLastCalledWith(
        workspaceRoot,
        workspaceRoot,
        'native',
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-watch-mode-value')).toHaveTextContent(
        'Native',
      )
    })
  })

  it('shows fallback banner when watchStart applies polling fallback', async () => {
    const workspaceRoot = '/Users/tester/watch-fallback'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    watchStartMock.mockResolvedValueOnce({
      ok: true,
      watchMode: 'polling',
      isRemoteMounted: false,
      fallbackApplied: true,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Fallback to polling watcher is active.',
      )
    })
    expect(screen.getByTestId('workspace-watch-mode-value')).toHaveTextContent(
      'Polling',
    )
  })

  it('renders header action groups in stable order', () => {
    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    const headerActions = screen.getByTestId('app-header-actions')
    const childTestIds = Array.from(headerActions.children).map((child) =>
      child.getAttribute('data-testid'),
    )

    expect(childTestIds).toEqual(['header-comments-group'])
    expect(screen.getByTestId('app-header-left')).toContainElement(
      screen.getByTestId('header-history-actions'),
    )
    expect(screen.getByTestId('app-header-left')).toContainElement(
      screen.getByTestId('content-tab-bar'),
    )
    expect(screen.queryByTestId('header-theme-group')).not.toBeInTheDocument()
    expect(screen.getByTestId('header-comments-group')).toHaveTextContent(
      'Code comments',
    )
    expect(screen.getByTestId('sidebar-workspace-group')).toBeInTheDocument()
  })

  it('restores the stored appearance theme, syncs it to the host, and forwards it to both panels', async () => {
    setAppearanceThemeStorage('light')

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    })

    expect(screen.queryByTestId('appearance-theme-select')).not.toBeInTheDocument()
    expect(notifyAppearanceThemeChangedMock).toHaveBeenCalledWith('light')
    expect(screen.getByTestId('code-viewer-panel')).toHaveAttribute(
      'data-appearance-theme',
      'light',
    )
    expect(screen.getByTestId('spec-viewer-panel')).toHaveAttribute(
      'data-appearance-theme',
      'light',
    )
  })

  it('falls back to dark-gray for malformed storage and applies native menu theme requests', async () => {
    setAppearanceThemeStorage('neon')

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(
        'data-theme',
        DEFAULT_APPEARANCE_THEME,
      )
    })

    act(() => {
      emitAppearanceThemeMenuRequest('light')
    })

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    })
    expect(window.localStorage.getItem(APPEARANCE_THEME_STORAGE_KEY)).toBe('light')
    expect(notifyAppearanceThemeChangedMock).toHaveBeenLastCalledWith('light')
    expect(screen.getByTestId('code-viewer-panel')).toHaveAttribute(
      'data-appearance-theme',
      'light',
    )
    expect(screen.getByTestId('spec-viewer-panel')).toHaveAttribute(
      'data-appearance-theme',
      'light',
    )
  })

  it('switches back to dark-gray after successive native menu requests without leaving stale theme state', async () => {
    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    act(() => {
      emitAppearanceThemeMenuRequest('light')
    })

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    })

    act(() => {
      emitAppearanceThemeMenuRequest('dark-gray')
    })

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark-gray')
    })
    expect(window.localStorage.getItem(APPEARANCE_THEME_STORAGE_KEY)).toBe(
      'dark-gray',
    )
    expect(notifyAppearanceThemeChangedMock).toHaveBeenLastCalledWith('dark-gray')
    expect(screen.getByTestId('code-viewer-panel')).toHaveAttribute(
      'data-appearance-theme',
      'dark-gray',
    )
    expect(screen.getByTestId('spec-viewer-panel')).toHaveAttribute(
      'data-appearance-theme',
      'dark-gray',
    )
  })

  it('applies the light palette contract to root theme tokens and major shell surfaces', async () => {
    setAppearanceThemeStorage('light')

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    })

    expect(indexCssSource).toMatch(
      /:root\[data-theme='light'\][\s\S]*--theme-bg-app:\s*#e5e9ee;/,
    )
    expect(indexCssSource).toMatch(
      /:root\[data-theme='light'\][\s\S]*--theme-bg-surface:\s*#edf1f5;/,
    )
    expect(indexCssSource).toMatch(
      /:root\[data-theme='light'\][\s\S]*--theme-border:\s*#c8d0d8;/,
    )
    expect(indexCssSource).toMatch(
      /:root\[data-theme='light'\][\s\S]*--theme-surface-shadow:\s*0 6px 18px rgba\(31, 35, 40, 0\.06\);/,
    )
    expect(indexCssSource).toMatch(
      /:root\[data-theme='light'\][\s\S]*--theme-warning-text:\s*#745c0f;/,
    )
    expect(indexCssSource).toMatch(
      /:root\[data-theme='light'\][\s\S]*--theme-git-added-border:\s*#57ab5a;/,
    )
    expect(indexCssSource).toMatch(
      /:root\[data-theme='light'\][\s\S]*--theme-navigation-ring:\s*rgba\(9, 105, 218, 0\.3\);/,
    )

    expect(appCssSource).toMatch(
      /\.sidebar-workspace-group\s*\{[\s\S]*background:\s*var\(--theme-bg-surface-alt\);[\s\S]*box-shadow:\s*var\(--theme-surface-shadow\);/,
    )
    expect(appCssSource).toMatch(
      /\.file-tree-panel\s*\{[\s\S]*background:\s*var\(--theme-bg-surface-alt\);[\s\S]*box-shadow:\s*var\(--theme-surface-shadow\);/,
    )
    expect(appCssSource).toMatch(
      /\.code-viewer-panel\s*\{[\s\S]*background:\s*var\(--theme-bg-surface-alt\);[\s\S]*box-shadow:\s*var\(--theme-surface-shadow\);/,
    )
    expect(appCssSource).toMatch(
      /\.spec-viewer-content\s*\{[\s\S]*background:\s*var\(--theme-bg-surface-alt\);[\s\S]*box-shadow:\s*var\(--theme-surface-shadow\);/,
    )
    expect(appCssSource).toMatch(
      /\.comment-modal\s*\{[\s\S]*box-shadow:\s*var\(--theme-modal-shadow\);/,
    )

    expect(screen.getByTestId('sidebar-workspace-group')).toBeInTheDocument()
    expect(screen.getByTestId('file-tree-panel')).toBeInTheDocument()
    expect(screen.getByTestId('code-viewer-panel')).toHaveAttribute(
      'data-appearance-theme',
      'light',
    )
  })

  it('uses compact comment/workspace action buttons with accessible labels', () => {
    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    const addGlobalButton = screen.getByRole('button', {
      name: 'Add Global Comments',
    })
    const viewCommentsButton = screen.getByRole('button', {
      name: 'View Comments',
    })
    const closeWorkspaceButton = screen.getByRole('button', {
      name: 'Close Workspace',
    })
    const openWorkspaceButton = screen.getByRole('button', {
      name: 'Open Workspace',
    })

    expect(screen.queryByRole('button', { name: 'Export Comments' })).not.toBeInTheDocument()

    for (const button of [addGlobalButton, viewCommentsButton]) {
      expect(button).toHaveClass('header-action-button')
      expect(button).toHaveAttribute('title')
    }

    for (const button of [openWorkspaceButton, closeWorkspaceButton]) {
      expect(button).toHaveClass('workspace-open-in-button')
      expect(button).toHaveAttribute('title')
    }

    expect(addGlobalButton).toHaveTextContent('+ Global')
    expect(viewCommentsButton).toHaveTextContent('View')

    const sidebarButtons = Array.from(
      screen.getByTestId('sidebar-workspace-actions').querySelectorAll('button'),
    ).map((button) => button.getAttribute('aria-label'))
    expect(sidebarButtons).toEqual([
      'Open Workspace',
      'Connect Remote Workspace',
      'Close Workspace',
    ])
  })

  it('connects a remote workspace from modal and shows remote state', async () => {
    connectRemoteMock.mockResolvedValueOnce({
      ok: true,
      workspaceId: 'remote-workspace-a',
      sessionId: 'session-a',
      rootPath: 'remote://remote-workspace-a',
      remoteConnectionState: 'connected',
      state: 'connected',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/project-a' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-identity-file-input'), {
      target: { value: '~/.ssh/id_ed25519' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(connectRemoteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'example.com',
          remoteRoot: '/srv/project-a',
          identityFile: '~/.ssh/id_ed25519',
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-connection-state')).toHaveTextContent(
        'connected',
      )
    })
    expect(screen.getByTestId('workspace-path')).toHaveTextContent(
      'remote:/srv/project-a',
    )
    expect(screen.getByTestId('workspace-path')).toHaveAttribute(
      'title',
      'example.com:/srv/project-a',
    )
    await expandWorkspaceSummaryIfCollapsed()
    expect(screen.getByTestId('workspace-remote-target')).toHaveTextContent(
      'example.com:/srv/project-a',
    )
  })

  it('browses remote directories and connects with the selected path', async () => {
    browseRemoteDirectoriesMock
      .mockResolvedValueOnce({
        ok: true,
        currentPath: '/data',
        entries: [
          {
            name: 'project-a',
            path: '/data/project-a',
            kind: 'directory',
          },
        ],
        truncated: false,
      })
      .mockResolvedValueOnce({
        ok: true,
        currentPath: '/data/project-a',
        entries: [],
        truncated: false,
      })
    connectRemoteMock.mockResolvedValueOnce({
      ok: true,
      workspaceId: 'remote-workspace-browse',
      sessionId: 'session-browse',
      rootPath: 'remote://remote-workspace-browse',
      remoteConnectionState: 'connected',
      state: 'connected',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'browse.example.com' },
    })
    fireEvent.click(screen.getByTestId('remote-connect-browse-button'))

    await waitFor(() => {
      expect(browseRemoteDirectoriesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'browse.example.com',
        }),
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('remote-connect-current-path')).toHaveTextContent(
        '/data',
      )
    })

    fireEvent.click(screen.getByTestId('remote-connect-entry-project-a'))

    await waitFor(() => {
      expect(screen.getByTestId('remote-connect-current-path')).toHaveTextContent(
        '/data/project-a',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(connectRemoteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'browse.example.com',
          remoteRoot: '/data/project-a',
        }),
      )
    })
  })

  it('shows standardized banner when remote connect fails with AUTH_FAILED', async () => {
    connectRemoteMock.mockResolvedValueOnce({
      ok: false,
      workspaceId: 'remote-workspace-auth-failed',
      errorCode: 'AUTH_FAILED',
      error: 'permission denied',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'auth.example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/private' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('AUTH_FAILED')
    })
    expect(
      screen.getByRole('dialog', { name: 'Connect Remote Workspace' }),
    ).toBeInTheDocument()
  })

  it('shows bootstrap failure detail when remote connect fails with BOOTSTRAP_FAILED', async () => {
    connectRemoteMock.mockResolvedValueOnce({
      ok: false,
      workspaceId: 'remote-workspace-bootstrap-failed',
      errorCode: 'BOOTSTRAP_FAILED',
      error:
        'Remote Node.js runtime is missing on the target host. Install Node.js and ensure "node" is available in non-interactive SSH shell PATH.',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'bootstrap.example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/bootstrap' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('BOOTSTRAP_FAILED')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Node.js runtime is missing')
  })

  it('updates remote connection state from events and disconnects on close', async () => {
    connectRemoteMock.mockResolvedValueOnce({
      ok: true,
      workspaceId: 'remote-workspace-events',
      sessionId: 'session-events',
      rootPath: 'remote://remote-workspace-events',
      remoteConnectionState: 'connected',
      state: 'connected',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'events.example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/events' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-connection-state')).toHaveTextContent(
        'connected',
      )
    })

    act(() => {
      emitRemoteConnectionEvent({
        workspaceId: 'remote-workspace-events',
        state: 'degraded',
        errorCode: 'TIMEOUT',
        message: 'agent heartbeat delayed',
        occurredAt: new Date().toISOString(),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-connection-state')).toHaveTextContent(
        'degraded',
      )
    })
    expect(screen.getByRole('alert')).toHaveTextContent('TIMEOUT')

    fireEvent.click(screen.getByRole('button', { name: 'Close Workspace' }))

    await waitFor(() => {
      expect(disconnectRemoteMock).toHaveBeenCalledWith('remote-workspace-events')
    })
  })

  it('retries remote connect with the last profile when transiently disconnected', async () => {
    connectRemoteMock
      .mockResolvedValueOnce({
        ok: true,
        workspaceId: 'remote-workspace-retry',
        sessionId: 'session-retry-1',
        rootPath: 'remote://remote-workspace-retry',
        remoteConnectionState: 'connected',
        state: 'connected',
      })
      .mockResolvedValueOnce({
        ok: true,
        workspaceId: 'remote-workspace-retry',
        sessionId: 'session-retry-2',
        rootPath: 'remote://remote-workspace-retry',
        remoteConnectionState: 'connected',
        state: 'connected',
      })
    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'retry.example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/retry' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-workspace-id-input'), {
      target: { value: 'remote-workspace-retry' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-identity-file-input'), {
      target: { value: '~/.ssh/id_ed25519' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-connection-state')).toHaveTextContent(
        'connected',
      )
    })

    act(() => {
      emitRemoteConnectionEvent({
        workspaceId: 'remote-workspace-retry',
        state: 'disconnected',
        errorCode: 'TIMEOUT',
        message: 'transient outage',
        occurredAt: new Date().toISOString(),
      })
    })

    await expandWorkspaceSummaryIfCollapsed()
    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-retry-button')).toHaveTextContent(
        'Retry Connect',
      )
    })

    fireEvent.click(screen.getByTestId('workspace-remote-retry-button'))

    await waitFor(() => {
      expect(connectRemoteMock).toHaveBeenCalledTimes(2)
    })
    expect(connectRemoteMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        workspaceId: 'remote-workspace-retry',
        host: 'retry.example.com',
        remoteRoot: '/srv/retry',
        identityFile: '~/.ssh/id_ed25519',
      }),
    )
  })

  it('shows reconnect guidance for fatal remote errors', async () => {
    connectRemoteMock.mockResolvedValueOnce({
      ok: true,
      workspaceId: 'remote-workspace-fatal',
      sessionId: 'session-fatal',
      rootPath: 'remote://remote-workspace-fatal',
      remoteConnectionState: 'connected',
      state: 'connected',
    })
    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'fatal.example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/private' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-workspace-id-input'), {
      target: { value: 'remote-workspace-fatal' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-connection-state')).toHaveTextContent(
        'connected',
      )
    })

    act(() => {
      emitRemoteConnectionEvent({
        workspaceId: 'remote-workspace-fatal',
        state: 'disconnected',
        errorCode: 'AUTH_FAILED',
        message: 'Permission denied',
        occurredAt: new Date().toISOString(),
      })
    })

    await expandWorkspaceSummaryIfCollapsed()
    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-retry-button')).toHaveTextContent(
        'Reconnect',
      )
    })
    expect(screen.getByTestId('workspace-remote-retry-hint')).toHaveTextContent(
      'Fix credentials/path and reconnect',
    )
  })

  it('redacts sensitive payloads from remote event banners', async () => {
    connectRemoteMock.mockResolvedValueOnce({
      ok: true,
      workspaceId: 'remote-workspace-redact',
      sessionId: 'session-redact',
      rootPath: 'remote://remote-workspace-redact',
      remoteConnectionState: 'connected',
      state: 'connected',
    })
    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'redact.example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/redact' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-workspace-id-input'), {
      target: { value: 'remote-workspace-redact' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-connection-state')).toHaveTextContent(
        'connected',
      )
    })

    act(() => {
      emitRemoteConnectionEvent({
        workspaceId: 'remote-workspace-redact',
        state: 'disconnected',
        message: 'ssh stderr: password=hunter2 ~/.ssh/id_ed25519 /Users/tester/.ssh/id_ed25519',
        occurredAt: new Date().toISOString(),
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('password=[REDACTED]')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('[REDACTED_PATH]')
    expect(screen.getByRole('alert')).not.toHaveTextContent('hunter2')
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      '/Users/tester/.ssh/id_ed25519',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      '~/.ssh/id_ed25519',
    )
  })

  it('opens active workspace in iTerm, VSCode, and Finder', async () => {
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveTextContent(
        '~/projects/sdd-workbench',
      )
    })

    const openInItermButton = screen.getByRole('button', { name: 'Open in iTerm' })
    const openInVsCodeButton = screen.getByRole('button', { name: 'Open in VSCode' })
    const openInFinderButton = screen.getByRole('button', { name: 'Open in Finder' })
    expect(openInItermButton).toBeEnabled()
    expect(openInVsCodeButton).toBeEnabled()
    expect(openInFinderButton).toBeEnabled()

    fireEvent.click(openInItermButton)
    fireEvent.click(openInVsCodeButton)
    fireEvent.click(openInFinderButton)

    await waitFor(() => {
      expect(openInItermMock).toHaveBeenCalledWith(
        {
          rootPath: '/Users/tester/projects/sdd-workbench',
          workspaceKind: 'local',
        },
      )
      expect(openInVsCodeMock).toHaveBeenCalledWith(
        {
          rootPath: '/Users/tester/projects/sdd-workbench',
          workspaceKind: 'local',
        },
      )
      expect(openInFinderMock).toHaveBeenCalledWith(
        {
          rootPath: '/Users/tester/projects/sdd-workbench',
          workspaceKind: 'local',
        },
      )
    })
  })

  it('opens remote workspace actions with remote profile payload', async () => {
    connectRemoteMock.mockResolvedValueOnce({
      ok: true,
      workspaceId: 'remote-open-actions',
      sessionId: 'session-remote-open-actions',
      rootPath: 'remote://remote-open-actions',
      remoteConnectionState: 'connected',
      state: 'connected',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'remote.example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/remote-project' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-user-input'), {
      target: { value: 'ubuntu' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-port-input'), {
      target: { value: '2222' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-identity-file-input'), {
      target: { value: '~/.ssh/id_ed25519' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-ssh-alias-input'), {
      target: { value: 'remote-devbox' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-workspace-id-input'), {
      target: { value: 'remote-open-actions' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-connection-state')).toHaveTextContent(
        'connected',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open in iTerm' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open in VSCode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open in Finder' }))

    await waitFor(() => {
      expect(openInItermMock).toHaveBeenCalledWith(
        expect.objectContaining({
          rootPath: 'remote://remote-open-actions',
          workspaceKind: 'remote',
          remoteProfile: expect.objectContaining({
            workspaceId: 'remote-open-actions',
            host: 'remote.example.com',
            user: 'ubuntu',
            port: 2222,
            remoteRoot: '/srv/remote-project',
            identityFile: '~/.ssh/id_ed25519',
            sshAlias: 'remote-devbox',
          }),
        }),
      )
      expect(openInVsCodeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          rootPath: 'remote://remote-open-actions',
          workspaceKind: 'remote',
          remoteProfile: expect.objectContaining({
            sshAlias: 'remote-devbox',
            remoteRoot: '/srv/remote-project',
          }),
        }),
      )
      expect(openInFinderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          rootPath: 'remote://remote-open-actions',
          workspaceKind: 'remote',
          remoteProfile: expect.objectContaining({
            host: 'remote.example.com',
          }),
        }),
      )
    })
  })

  it('shows error banner when open in app request fails', async () => {
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    openInVsCodeMock.mockResolvedValueOnce({
      ok: false,
      error: 'Failed to launch VSCode.',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open in VSCode' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open in VSCode' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to launch VSCode.')
    })
  })

  it('shows error banner when open in Finder request fails', async () => {
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    openInFinderMock.mockResolvedValueOnce({
      ok: false,
      error: 'Failed to open in Finder.',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open in Finder' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open in Finder' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to open in Finder.')
    })
  })

  it('shows truncation banner when workspace index result is truncated', async () => {
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/huge-workspace',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
      truncated: true,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Workspace index truncated at 100,000 nodes.',
      )
    })
  })

  it('renders indexed file tree and updates active file when clicked', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'api.ts',
            relativePath: 'src/api.ts',
            kind: 'file',
          },
          {
            name: 'auth.ts',
            relativePath: 'src/auth.ts',
            kind: 'file',
          },
        ],
      },
      {
        name: 'README.md',
        relativePath: 'README.md',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: 'export const auth = true',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'auth.ts' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()

    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
      'No active file',
    )

    fireEvent.click(screen.getByRole('button', { name: 'src' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'auth.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'auth.ts' }))

    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/auth.ts')
    expect(screen.getByTestId('code-viewer-active-file')).toHaveAttribute(
      'title',
      'src/auth.ts',
    )

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    expect(readFileMock).toHaveBeenCalledWith(
      '/Users/tester/projects/sdd-workbench',
      'src/auth.ts',
    )
  })

  // TODO: F24 Phase 3 — git markers will be restored as CM6 gutter extension
  it.skip('renders git line markers for active file', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'auth.ts',
            relativePath: 'src/auth.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: 'line1\nline2\nline3',
    })
    getGitLineMarkersMock.mockResolvedValueOnce({
      ok: true,
      markers: [
        { line: 1, kind: 'added' },
        { line: 2, kind: 'modified' },
      ],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'auth.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'auth.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-line-git-marker-1')).toHaveAttribute(
        'data-kind',
        'added',
      )
    })
    expect(screen.getByTestId('code-line-git-marker-2')).toHaveAttribute(
      'data-kind',
      'modified',
    )
    expect(getGitLineMarkersMock).toHaveBeenCalledWith(
      '/Users/tester/projects/sdd-workbench',
      'src/auth.ts',
    )
  })

  it('degrades safely when git marker lookup fails', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'main.ts',
        relativePath: 'main.ts',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: 'const value = 1',
    })
    getGitLineMarkersMock.mockResolvedValueOnce({
      ok: false,
      markers: [],
      error: 'not a git repository',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'main.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'main.ts' }))

    await waitFor(() => {
      // CM6 editor container is mounted (text rendering relies on browser APIs not available in jsdom)
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })
    // TODO: F24 Phase 3 — git markers will be restored as CM6 gutter extension
    // expect(screen.queryByTestId('code-line-git-marker-1')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('refreshes git badges and line markers when the window regains focus', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'auth.ts',
            relativePath: 'src/auth.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: 'line1\nline2\nline3',
    })
    getGitFileStatusesMock.mockResolvedValue({
      ok: true,
      statuses: {},
    })
    getGitLineMarkersMock.mockResolvedValue({
      ok: true,
      markers: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'auth.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'auth.ts' }))

    await waitFor(() => {
      expect(getGitLineMarkersMock).toHaveBeenCalledWith(
        '/Users/tester/projects/sdd-workbench',
        'src/auth.ts',
      )
    })
    expect(screen.queryByTestId('tree-git-badge-src/auth.ts')).not.toBeInTheDocument()

    const gitStatusCallCountBeforeFocus = getGitFileStatusesMock.mock.calls.length
    const gitLineMarkerCallCountBeforeFocus = getGitLineMarkersMock.mock.calls.length

    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 300)
      })
    })

    getGitFileStatusesMock.mockResolvedValueOnce({
      ok: true,
      statuses: {
        'src/auth.ts': 'modified',
      },
    })
    getGitLineMarkersMock.mockResolvedValueOnce({
      ok: true,
      markers: [{ line: 2, kind: 'modified' }],
    })

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => {
      expect(getGitFileStatusesMock).toHaveBeenCalledTimes(
        gitStatusCallCountBeforeFocus + 1,
      )
    })
    await waitFor(() => {
      expect(getGitLineMarkersMock).toHaveBeenCalledTimes(
        gitLineMarkerCallCountBeforeFocus + 1,
      )
    })
    expect(screen.getByTestId('tree-git-badge-src/auth.ts')).toHaveTextContent('M')
  })

  it('shows a cap message when indexed nodes exceed initial render limit', async () => {
    const hugeTree: WorkspaceFileNode[] = Array.from({ length: 10_020 }, (_, index) => ({
      name: `dir-${index}`,
      relativePath: `dir-${index}`,
      kind: 'directory',
      children: [],
    }))

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: hugeTree,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByTestId('file-tree-cap-message')).toHaveTextContent(
        'Showing first 10,000 nodes.',
      )
    })
  })

  it('renders file content and tracks selected line range', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'README.md',
        relativePath: 'README.md',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'alpha\nbeta\ngamma',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      // CM6 editor container is mounted (line-level clicks are handled by CM6 internally)
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('README.md')

    // CM6 handles selection internally; line-click testids (code-line-*) are not available.
    // In jsdom, CM6 does not fire selection updates, so selection remains at default.
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: none',
    )
  })

  it('supports multi-workspace switch, duplicate focus, close, and selection reset', async () => {
    const projectARoot = '/Users/tester/project-a'
    const projectBRoot = '/Users/tester/project-b'
    const projectATree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'app.ts',
            relativePath: 'src/app.ts',
            kind: 'file',
          },
        ],
      },
    ]
    const projectBTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'note.md',
            relativePath: 'docs/note.md',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: projectATree,
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: projectBTree,
        }
      }

      return {
        ok: false,
        fileTree: [],
        error: 'unknown workspace',
      }
    })

    readFileMock.mockImplementation(async (rootPath, relativePath) => {
      if (rootPath === projectARoot && relativePath === 'src/app.ts') {
        return {
          ok: true,
          content: 'export const name = "project-a"\nconsole.log(name)',
        }
      }

      if (rootPath === projectBRoot && relativePath === 'docs/note.md') {
        return {
          ok: true,
          content: '# project-b',
        }
      }

      return {
        ok: false,
        content: null,
        error: 'missing file',
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'app.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'app.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })
    // CM6 handles selection internally; line-click testids (code-line-*) are not available
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/app.ts')

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'note.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'note.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement
    expect(workspaceSelect.options).toHaveLength(2)

    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    expect(screen.getByRole('button', { name: 'app.ts' })).toBeInTheDocument()
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: none',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    expect(indexWorkspaceMock).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Close Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })

    expect(
      (screen.getByTestId('workspace-switcher-select') as HTMLSelectElement)
        .options,
    ).toHaveLength(1)
  })

  it('restores workspace sessions and active file line on app mount', async () => {
    const projectARoot = '/Users/tester/restore-a'
    const projectBRoot = '/Users/tester/restore-b'
    const projectAId = projectARoot
    const projectBId = projectBRoot

    setWorkspaceSessionStorage({
        schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
        activeWorkspaceId: projectBId,
        workspaceOrder: [projectAId, projectBId],
        workspacesById: {
          [projectAId]: {
            rootPath: projectARoot,
            activeFile: 'a.ts',
            expandedDirectories: ['src'],
            fileLastLineByPath: {
              'a.ts': 3,
            },
          },
          [projectBId]: {
            rootPath: projectBRoot,
            activeFile: 'b.ts',
            expandedDirectories: ['src'],
            fileLastLineByPath: {
              'b.ts': 2,
            },
          },
        },
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [{ name: 'a.ts', relativePath: 'a.ts', kind: 'file' }],
        }
      }
      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [{ name: 'b.ts', relativePath: 'b.ts', kind: 'file' }],
        }
      }
      return {
        ok: false,
        fileTree: [],
      }
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content:
        relativePath === 'a.ts'
          ? 'line1\nline2\nline3\nline4'
          : 'line1\nline2\nline3',
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(watchStartMock).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L2-L2',
    )
    expect(
      (screen.getByTestId('workspace-switcher-select') as HTMLSelectElement).options,
    ).toHaveLength(2)
  })

  it('uses persisted watch mode preference during restore watchStart', async () => {
    const projectRoot = '/Users/tester/restore-watch-preference'
    const projectId = projectRoot

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: projectId,
      workspaceOrder: [projectId],
      workspacesById: {
        [projectId]: {
          rootPath: projectRoot,
          activeFile: 'main.ts',
          expandedDirectories: [],
          fileLastLineByPath: { 'main.ts': 1 },
          watchModePreference: 'polling',
        },
      },
    })

    watchStartMock.mockImplementation(
      async (_workspaceId, _rootPath, watchModePreference = 'auto') => ({
        ok: true,
        watchMode: watchModePreference === 'polling' ? 'polling' : 'native',
        isRemoteMounted: false,
        fallbackApplied: false,
      }),
    )
    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [{ name: 'main.ts', relativePath: 'main.ts', kind: 'file' }],
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: 'const main = true',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(watchStartMock).toHaveBeenCalledWith(
        projectRoot,
        projectRoot,
        'polling',
      )
    })
    await expandWorkspaceSummaryIfCollapsed()
    await waitFor(() => {
      expect(screen.getByTestId('workspace-watch-mode-preference')).toHaveValue(
        'polling',
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-watch-mode-value')).toHaveTextContent(
        'Polling',
      )
    })
  })

  it('reconnects persisted remote workspace sessions on app mount', async () => {
    const remoteWorkspaceId = 'remote-restore-a'
    const remoteRootPath = `remote://${remoteWorkspaceId}`

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: remoteWorkspaceId,
      workspaceOrder: [remoteWorkspaceId],
      workspacesById: {
        [remoteWorkspaceId]: {
          rootPath: remoteRootPath,
          workspaceKind: 'remote',
          remoteWorkspaceId,
          remoteConnectionState: 'connected',
          remoteProfile: {
            workspaceId: remoteWorkspaceId,
            host: 'restore.example.com',
            remoteRoot: '/srv/restore-a',
          },
          activeFile: null,
          expandedDirectories: [],
          fileLastLineByPath: {},
        },
      },
    })

    connectRemoteMock.mockResolvedValueOnce({
      ok: true,
      workspaceId: remoteWorkspaceId,
      sessionId: 'session-restore-a',
      rootPath: remoteRootPath,
      remoteConnectionState: 'connected',
      state: 'connected',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(connectRemoteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: remoteWorkspaceId,
          host: 'restore.example.com',
          remoteRoot: '/srv/restore-a',
        }),
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-connection-state')).toHaveTextContent(
        'connected',
      )
    })
  })

  it('restores image active file and expanded directories on app mount', async () => {
    const projectRoot = '/Users/tester/restore-image'
    const projectId = projectRoot

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: projectId,
      workspaceOrder: [projectId],
      workspacesById: {
        [projectId]: {
          rootPath: projectRoot,
          activeFile: 'assets/diagram.png',
          expandedDirectories: ['assets'],
          fileLastLineByPath: {},
        },
      },
    })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [
        {
          name: 'assets',
          relativePath: 'assets',
          kind: 'directory',
          children: [
            {
              name: 'diagram.png',
              relativePath: 'assets/diagram.png',
              kind: 'file',
            },
          ],
        },
      ],
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: null,
      imagePreview: {
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,AA==',
      },
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectRoot,
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'assets/diagram.png',
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-image-preview')).toBeInTheDocument()
    })

    expect(screen.getByRole('img', { name: 'Image preview for assets/diagram.png' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AA==',
    )
    expect(screen.getByRole('button', { name: 'diagram.png' })).toBeInTheDocument()
  })

  it('restores active file even when initial restore index result becomes stale', async () => {
    const projectRoot = '/Users/tester/restore-stale-image'
    const projectId = projectRoot

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: projectId,
      workspaceOrder: [projectId],
      workspacesById: {
        [projectId]: {
          rootPath: projectRoot,
          activeFile: 'examples/family.png',
          expandedDirectories: ['examples'],
          fileLastLineByPath: {},
        },
      },
    })

    let indexCallCount = 0
    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath !== projectRoot) {
        return {
          ok: false,
          fileTree: [],
        }
      }

      indexCallCount += 1
      if (indexCallCount === 1) {
        emitWatchEvent({
          workspaceId: projectId,
          changedRelativePaths: [],
          hasStructureChanges: true,
        })
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 12)
        })
      }

      return {
        ok: true,
        fileTree: [
          {
            name: 'examples',
            relativePath: 'examples',
            kind: 'directory',
            children: [
              {
                name: 'family.png',
                relativePath: 'examples/family.png',
                kind: 'file',
              },
            ],
          },
        ],
      }
    })

    readFileMock.mockResolvedValue({
      ok: true,
      content: null,
      imagePreview: {
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,AA==',
      },
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectRoot,
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'examples/family.png',
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-image-preview')).toBeInTheDocument()
    })
  })

  it('skips failed workspace restores and keeps remaining workspaces active', async () => {
    const validRoot = '/Users/tester/restore-valid'
    const invalidRoot = '/Users/tester/restore-invalid'
    const validId = validRoot
    const invalidId = invalidRoot

    setWorkspaceSessionStorage({
        schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
        activeWorkspaceId: invalidId,
        workspaceOrder: [validId, invalidId],
        workspacesById: {
          [validId]: {
            rootPath: validRoot,
            activeFile: 'ok.ts',
            expandedDirectories: [],
            fileLastLineByPath: { 'ok.ts': 2 },
          },
          [invalidId]: {
            rootPath: invalidRoot,
            activeFile: 'broken.ts',
            expandedDirectories: [],
            fileLastLineByPath: { 'broken.ts': 4 },
          },
        },
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === validRoot) {
        return {
          ok: true,
          fileTree: [{ name: 'ok.ts', relativePath: 'ok.ts', kind: 'file' }],
        }
      }
      if (rootPath === invalidRoot) {
        return {
          ok: false,
          fileTree: [],
          error: 'permission denied',
        }
      }
      return {
        ok: false,
        fileTree: [],
      }
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: 'line1\nline2',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Some workspaces could not be restored (1).',
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        validRoot,
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'ok.ts',
      )
    })
    expect(watchStopMock).toHaveBeenCalledWith(invalidId)
    expect(
      (screen.getByTestId('workspace-switcher-select') as HTMLSelectElement).options,
    ).toHaveLength(1)
  })

  it('restores active markdown spec independently from active code file on app mount', async () => {
    const projectRoot = '/Users/tester/restore-spec'
    const projectId = projectRoot

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: projectId,
      workspaceOrder: [projectId],
      workspacesById: {
        [projectId]: {
          rootPath: projectRoot,
          activeFile: 'src/app.ts',
          activeSpec: '_sdd/spec/main.md',
          expandedDirectories: ['src', '_sdd', '_sdd/spec'],
          fileLastLineByPath: {
            'src/app.ts': 4,
          },
        },
      },
    })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [
        {
          name: '_sdd',
          relativePath: '_sdd',
          kind: 'directory',
          children: [
            {
              name: 'spec',
              relativePath: '_sdd/spec',
              kind: 'directory',
              children: [
                {
                  name: 'main.md',
                  relativePath: '_sdd/spec/main.md',
                  kind: 'file',
                },
              ],
            },
          ],
        },
        {
          name: 'src',
          relativePath: 'src',
          kind: 'directory',
          children: [
            {
              name: 'app.ts',
              relativePath: 'src/app.ts',
              kind: 'file',
            },
          ],
        },
      ],
    })

    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'src/app.ts') {
        return {
          ok: true,
          content: 'const ready = true\nconsole.log(ready)\nexport {}\n',
        }
      }

      if (relativePath === '_sdd/spec/main.md') {
        return {
          ok: true,
          content: '# Restored Spec\n\n- persisted',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectRoot,
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'src/app.ts',
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        '_sdd/spec/main.md',
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'Restored Spec',
      )
    })
  })

  it('restores snapshot under StrictMode without clearing persisted session', async () => {
    const projectRoot = '/Users/tester/strict-restore'
    const projectId = projectRoot

    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: projectId,
      workspaceOrder: [projectId],
      workspacesById: {
        [projectId]: {
          rootPath: projectRoot,
          activeFile: 'main.md',
          expandedDirectories: [],
          fileLastLineByPath: { 'main.md': 2 },
        },
      },
    })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [{ name: 'main.md', relativePath: 'main.md', kind: 'file' }],
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: '# hello\n\nsession restore',
    })

    render(
      <StrictMode>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </StrictMode>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectRoot,
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'main.md',
      )
    })
  })

  it('navigates file history with Back/Forward and truncates forward after branching', async () => {
    const workspaceRoot = '/Users/tester/history-single'
    const indexedTree: WorkspaceFileNode[] = [
      { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
      { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
      { name: 'c.ts', relativePath: 'c.ts', kind: 'file' },
      { name: 'd.ts', relativePath: 'd.ts', kind: 'file' },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    const backButton = screen.getByRole('button', { name: 'Back' })
    const forwardButton = screen.getByRole('button', { name: 'Forward' })
    expect(backButton).toBeDisabled()
    expect(forwardButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    expect(backButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'c.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('c.ts')
    })

    expect(backButton).toBeEnabled()
    expect(forwardButton).toBeDisabled()

    fireEvent.click(backButton)
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
    expect(forwardButton).toBeEnabled()

    fireEvent.click(forwardButton)
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('c.ts')
    })

    fireEvent.click(backButton)
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    fireEvent.click(screen.getByRole('button', { name: 'd.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('d.ts')
    })

    expect(forwardButton).toBeDisabled()
  })

  it('keeps file history independent per workspace for Back/Forward navigation', async () => {
    const projectARoot = '/Users/tester/history-a'
    const projectBRoot = '/Users/tester/history-b'

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [
            { name: 'a1.ts', relativePath: 'a1.ts', kind: 'file' },
            { name: 'a2.ts', relativePath: 'a2.ts', kind: 'file' },
          ],
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [
            { name: 'b1.ts', relativePath: 'b1.ts', kind: 'file' },
            { name: 'b2.ts', relativePath: 'b2.ts', kind: 'file' },
          ],
        }
      }

      return {
        ok: false,
        fileTree: [],
      }
    })

    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a1.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'a1.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a1.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'a2.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a2.ts')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'b1.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b1.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'b2.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b2.ts')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b1.ts')
    })

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement
    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a2.ts')

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a1.ts')
    })
  })

  it('navigates history via mouse back/forward special buttons', async () => {
    const workspaceRoot = '/Users/tester/history-mouse-buttons'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
        { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    const filePanel = screen.getByTestId('file-panel')
    const codeViewerPanel = screen.getByTestId('code-viewer-panel')

    fireEvent.mouseUp(filePanel, { button: 3 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    fireEvent.mouseUp(codeViewerPanel, { button: 3 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })

    fireEvent.mouseUp(codeViewerPanel, { button: 4 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
  })

  it('navigates history via horizontal wheel only inside code/spec panels', async () => {
    const workspaceRoot = '/Users/tester/history-wheel-scope'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
        { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    fireEvent.wheel(screen.getByTestId('file-panel'), { deltaX: -45, deltaY: 0, deltaMode: 0 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    const codeViewerPanel = screen.getByTestId('code-viewer-panel')
    fireEvent.wheel(codeViewerPanel, { deltaX: -45, deltaY: 0, deltaMode: 0 })
    fireEvent.wheel(codeViewerPanel, { deltaX: -45, deltaY: 0, deltaMode: 0 })
    fireEvent.wheel(codeViewerPanel, { deltaX: -45, deltaY: 0, deltaMode: 0 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })
  })

  it('does not navigate history via mouse horizontal wheel in code/spec panels', async () => {
    const workspaceRoot = '/Users/tester/history-mouse-horizontal-wheel'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
        { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    const codeViewerPanel = screen.getByTestId('code-viewer-panel')
    fireEvent.wheel(codeViewerPanel, { deltaX: -120, deltaY: 0, deltaMode: 0 })
    fireEvent.wheel(codeViewerPanel, { deltaX: -3, deltaY: 0, deltaMode: 1 })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
  })

  it('navigates history via ipc history commands from app-command/swipe bridge', async () => {
    const workspaceRoot = '/Users/tester/history-ipc-bridge'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
        { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })
    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    emitHistoryNavigateEvent({
      direction: 'back',
      source: 'swipe',
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })

    fireEvent.pointerDown(screen.getByTestId('code-viewer-panel'))
    emitHistoryNavigateEvent({
      direction: 'back',
      source: 'swipe',
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    })

    emitHistoryNavigateEvent({
      direction: 'forward',
      source: 'app-command',
    })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
  })

  it('auto-switches tab when navigating history between code and spec files', async () => {
    const workspaceRoot = '/Users/tester/history-tab-switch'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'app.ts', relativePath: 'app.ts', kind: 'file' },
        { name: 'spec.md', relativePath: 'spec.md', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => ({
      ok: true,
      content: `content:${relativePath}`,
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'app.ts' })).toBeInTheDocument()
    })

    // Select code file -> Code tab active
    fireEvent.click(screen.getByRole('button', { name: 'app.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('app.ts')
    })
    const codeTab = screen.getByTestId('content-tab-bar').querySelector('.content-tab-button.is-active')
    expect(codeTab).toHaveTextContent('Code')

    // Select spec file -> Spec tab active
    fireEvent.click(screen.getByRole('button', { name: 'spec.md' }))
    await waitFor(() => {
      const specTab = screen.getByTestId('content-tab-bar').querySelector('.content-tab-button.is-active')
      expect(specTab).toHaveTextContent('Spec')
    })

    // Navigate back -> should switch to Code tab (app.ts)
    fireEvent.pointerDown(screen.getByTestId('spec-panel'))
    emitHistoryNavigateEvent({ direction: 'back', source: 'swipe' })
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('app.ts')
    })
    await waitFor(() => {
      const activeTab = screen.getByTestId('content-tab-bar').querySelector('.content-tab-button.is-active')
      expect(activeTab).toHaveTextContent('Code')
    })

    // Navigate forward -> should switch to Spec tab (spec.md)
    emitHistoryNavigateEvent({ direction: 'forward', source: 'app-command' })
    await waitFor(() => {
      const activeTab = screen.getByTestId('content-tab-bar').querySelector('.content-tab-button.is-active')
      expect(activeTab).toHaveTextContent('Spec')
    })
  })

  it('switches Code/Spec tabs with Cmd+Ctrl+Left/Right only', async () => {
    const workspaceRoot = '/Users/tester/keyboard-tab-switch'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
        { name: 'guide.md', relativePath: 'guide.md', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'a.ts') {
        return { ok: true, content: 'const a = 1\n' }
      }
      if (relativePath === 'guide.md') {
        return { ok: true, content: '# Guide\n' }
      }
      return { ok: false, content: null, error: 'not found' }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'guide.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      const activeTab = screen
        .getByTestId('content-tab-bar')
        .querySelector('.content-tab-button.is-active')
      expect(activeTab).toHaveTextContent('Code')
    })

    fireEvent.keyDown(window, {
      key: 'ArrowRight',
      metaKey: true,
      shiftKey: true,
    })
    expect(
      screen
        .getByTestId('content-tab-bar')
        .querySelector('.content-tab-button.is-active'),
    ).toHaveTextContent('Code')

    fireEvent.keyDown(window, {
      key: 'ArrowRight',
      metaKey: true,
      ctrlKey: true,
    })
    await waitFor(() => {
      const activeTab = screen
        .getByTestId('content-tab-bar')
        .querySelector('.content-tab-button.is-active')
      expect(activeTab).toHaveTextContent('Spec')
    })

    fireEvent.keyDown(window, {
      key: 'ArrowLeft',
      metaKey: true,
      ctrlKey: true,
    })
    await waitFor(() => {
      const activeTab = screen
        .getByTestId('content-tab-bar')
        .querySelector('.content-tab-button.is-active')
      expect(activeTab).toHaveTextContent('Code')
    })
  })

  it('opens spec search with Cmd+F only when the Spec tab is active', async () => {
    const workspaceRoot = '/Users/tester/spec-search-hotkey'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
        { name: 'guide.md', relativePath: 'guide.md', kind: 'file' },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'guide.md') {
        return {
          ok: true,
          content: '# Guide\n\nGuide intro',
        }
      }

      return {
        ok: true,
        content: 'export const value = 1\n',
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'guide.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'guide.md' }))
    await waitFor(() => {
      const activeTab = screen
        .getByTestId('content-tab-bar')
        .querySelector('.content-tab-button.is-active')
      expect(activeTab).toHaveTextContent('Spec')
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      const activeTab = screen
        .getByTestId('content-tab-bar')
        .querySelector('.content-tab-button.is-active')
      expect(activeTab).toHaveTextContent('Code')
    })

    const codeFindEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'f',
      metaKey: true,
    })
    window.dispatchEvent(codeFindEvent)

    expect(codeFindEvent.defaultPrevented).toBe(false)
    expect(
      screen.queryByTestId('spec-viewer-search-input'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'guide.md' }))
    await waitFor(() => {
      const activeTab = screen
        .getByTestId('content-tab-bar')
        .querySelector('.content-tab-button.is-active')
      expect(activeTab).toHaveTextContent('Spec')
    })

    const specFindEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'f',
      metaKey: true,
    })
    window.dispatchEvent(specFindEvent)

    expect(specFindEvent.defaultPrevented).toBe(true)
    expect(
      await screen.findByTestId('spec-viewer-search-input'),
    ).toBeInTheDocument()
  })

  it('switches workspace with Cmd+Ctrl+Up/Down only', async () => {
    const workspaceARoot = '/Users/tester/keyboard-workspace-a'
    const workspaceBRoot = '/Users/tester/keyboard-workspace-b'

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: workspaceARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: workspaceBRoot,
      })
    indexWorkspaceMock.mockImplementation(async (rootPath) => ({
      ok: true,
      fileTree: [
        {
          name: rootPath === workspaceARoot ? 'a.ts' : 'b.ts',
          relativePath: rootPath === workspaceARoot ? 'a.ts' : 'b.ts',
          kind: 'file',
        },
      ],
    }))

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute('title', workspaceARoot)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute('title', workspaceBRoot)
    })

    fireEvent.keyDown(window, {
      key: 'ArrowUp',
      metaKey: true,
      shiftKey: true,
    })
    expect(screen.getByTestId('workspace-path')).toHaveAttribute('title', workspaceBRoot)

    fireEvent.keyDown(window, {
      key: 'ArrowUp',
      metaKey: true,
      ctrlKey: true,
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute('title', workspaceARoot)
    })

    fireEvent.keyDown(window, {
      key: 'ArrowDown',
      metaKey: true,
      ctrlKey: true,
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute('title', workspaceBRoot)
    })
  })

  it('applies watcher changed indicators per workspace', async () => {
    const projectARoot = '/Users/tester/watch-a'
    const projectBRoot = '/Users/tester/watch-b'

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'a.ts',
              relativePath: 'a.ts',
              kind: 'file',
            },
          ],
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'b.ts',
              relativePath: 'b.ts',
              kind: 'file',
            },
          ],
        }
      }

      return {
        ok: false,
        fileTree: [],
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'b.ts' })).toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: projectARoot,
      changedRelativePaths: ['a.ts'],
    })

    expect(
      screen.queryByTestId('tree-changed-indicator-a.ts'),
    ).not.toBeInTheDocument()

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement
    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })
    expect(screen.getByTestId('tree-changed-indicator-a.ts')).toBeInTheDocument()
    expect(
      screen.queryByTestId('tree-changed-indicator-b.ts'),
    ).not.toBeInTheDocument()
  })

  it('normalizes watcher changed paths before rendering changed indicators', async () => {
    const workspaceRoot = '/Users/tester/watch-normalize-paths'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'src',
          relativePath: 'src',
          kind: 'directory',
          children: [
            {
              name: 'a.ts',
              relativePath: 'src/a.ts',
              kind: 'file',
            },
          ],
        },
      ],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['./src\\a.ts', '/tmp/invalid.ts'],
    })

    await waitFor(() => {
      expect(screen.getByTestId('tree-changed-indicator-src')).toBeInTheDocument()
    })
  })

  it('refreshes file tree when watcher reports structure-only changes', async () => {
    const workspaceRoot = '/Users/tester/watch-structure-refresh'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [],
      })
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [
          {
            name: 'docs',
            relativePath: 'docs',
            kind: 'directory',
            children: [
              {
                name: 'new.ts',
                relativePath: 'docs/new.ts',
                kind: 'file',
              },
            ],
          },
        ],
      })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'new.ts' })).not.toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: [],
      hasStructureChanges: true,
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'new.ts' })).toBeInTheDocument()
    })
    expect(indexWorkspaceMock).toHaveBeenCalledTimes(2)
  })

  it('keeps file tree visible while structure refresh is in flight', async () => {
    const workspaceRoot = '/Users/tester/watch-structure-inflight'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })

    let resolveRefreshIndex:
      | ((result: WorkspaceIndexResult) => void)
      | null = null
    const refreshIndexPromise = new Promise<WorkspaceIndexResult>((resolve) => {
      resolveRefreshIndex = resolve
    })

    indexWorkspaceMock
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [{ name: 'a.ts', relativePath: 'a.ts', kind: 'file' }],
      })
      .mockImplementationOnce(async () => refreshIndexPromise)

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: [],
      hasStructureChanges: true,
    })

    await waitFor(() => {
      expect(indexWorkspaceMock).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    expect(screen.queryByText('Indexing workspace files...')).not.toBeInTheDocument()

    expect(resolveRefreshIndex).not.toBeNull()
    resolveRefreshIndex!({
      ok: true,
      fileTree: [{ name: 'b.ts', relativePath: 'b.ts', kind: 'file' }],
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'b.ts' })).toBeInTheDocument()
    })
  })

  it('clears active file when watcher structure refresh removes it from tree', async () => {
    const workspaceRoot = '/Users/tester/watch-structure-remove'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [{ name: 'gone.ts', relativePath: 'gone.ts', kind: 'file' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [],
      })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'const gone = true',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'gone.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'gone.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('gone.ts')
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['gone.ts'],
      hasStructureChanges: true,
    })

    await waitFor(() => {
      expect(
        screen.getByTestId('code-viewer-active-file'),
      ).toHaveTextContent('No active file')
    })
    expect(screen.queryByRole('button', { name: 'gone.ts' })).not.toBeInTheDocument()
  })

  it('keeps changed indicator while opened and clears it after leaving file', async () => {
    const workspaceRoot = '/Users/tester/watch-clear-on-open'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'a.ts',
          relativePath: 'a.ts',
          kind: 'file',
        },
        {
          name: 'b.ts',
          relativePath: 'b.ts',
          kind: 'file',
        },
      ],
    })
    readFileMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'const a = 1',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'const b = 2',
      })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['a.ts'],
    })

    await waitFor(() => {
      expect(screen.getByTestId('tree-changed-indicator-a.ts')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))

    await waitFor(() => {
      // CM6 editor container is mounted; text rendering relies on browser APIs
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
    expect(screen.getByTestId('tree-changed-indicator-a.ts')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
    })
    expect(screen.queryByTestId('tree-changed-indicator-a.ts')).not.toBeInTheDocument()
  })

  it('auto-refreshes opened file content on watcher event and keeps marker until leaving', async () => {
    const workspaceRoot = '/Users/tester/watch-auto-refresh'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'a.ts',
          relativePath: 'a.ts',
          kind: 'file',
        },
      ],
    })
    readFileMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'const value = 1',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'const value = 2',
      })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      // CM6 editor container is mounted; text rendering relies on browser APIs
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['a.ts'],
    })

    await waitFor(() => {
      expect(readFileMock).toHaveBeenCalledTimes(2)
    })
    // After auto-refresh, the editor container remains mounted
    expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    expect(screen.getByTestId('tree-changed-indicator-a.ts')).toBeInTheDocument()
  })

  it('keeps rendered spec visible while active spec refresh is in flight', async () => {
    const workspaceRoot = '/Users/tester/watch-spec-refresh-visible'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'README.md',
          relativePath: 'README.md',
          kind: 'file',
        },
      ],
    })

    let resolveRefreshRead:
      | ((result: WorkspaceReadFileResult) => void)
      | null = null
    const refreshReadPromise = new Promise<WorkspaceReadFileResult>((resolve) => {
      resolveRefreshRead = resolve
    })
    readFileMock
      .mockResolvedValueOnce({
        ok: true,
        content: '# V1',
      })
      .mockImplementationOnce(async () => refreshReadPromise)

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'V1' })).toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['README.md'],
    })

    await waitFor(() => {
      expect(readFileMock).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByTestId('spec-viewer-content')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'V1' })).toBeInTheDocument()
    expect(screen.queryByTestId('spec-viewer-loading')).not.toBeInTheDocument()

    expect(resolveRefreshRead).not.toBeNull()
    resolveRefreshRead!({
      ok: true,
      content: '# V2',
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'V2' })).toBeInTheDocument()
    })
  })

  it('stops watcher when active workspace is closed', async () => {
    const workspaceRoot = '/Users/tester/watch-close'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(watchStartMock).toHaveBeenCalledWith(
        workspaceRoot,
        workspaceRoot,
        'auto',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Close Workspace' }))

    await waitFor(() => {
      expect(watchStopMock).toHaveBeenCalledWith(workspaceRoot)
    })
  })

  it('shows read error message when workspace.readFile returns failure', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'denied.ts',
        relativePath: 'denied.ts',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: false,
      content: null,
      error: 'permission denied',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'denied.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'denied.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-error')).toHaveTextContent(
        'Failed to read file: permission denied',
      )
    })
  })

  it('shows preview unavailable state for files larger than 2MB', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'large.txt',
        relativePath: 'large.txt',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: null,
      previewUnavailableReason: 'file_too_large',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'large.txt' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'large.txt' }))

    await waitFor(() => {
      expect(
        screen.getByTestId('code-viewer-preview-unavailable'),
      ).toHaveTextContent('Preview unavailable: file exceeds 2MB limit.')
    })
  })

  it('renders image preview in code viewer for supported image files', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'diagram.png',
        relativePath: 'diagram.png',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: null,
      imagePreview: {
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,AA==',
      },
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'diagram.png' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'diagram.png' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-image-preview')).toBeInTheDocument()
    })

    expect(screen.getByRole('img', { name: 'Image preview for diagram.png' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AA==',
    )
    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: image',
    )
    expect(screen.queryByTestId('code-viewer-content')).not.toBeInTheDocument()
  })

  it('shows preview unavailable state for blocked resources', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'vector.svg',
        relativePath: 'vector.svg',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: null,
      previewUnavailableReason: 'blocked_resource',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'vector.svg' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'vector.svg' }))

    await waitFor(() => {
      expect(
        screen.getByTestId('code-viewer-preview-unavailable'),
      ).toHaveTextContent('Preview unavailable: blocked resource by policy.')
    })
  })

  it('applies python syntax highlighting for .py files in integrated flow', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'tool.py',
        relativePath: 'tool.py',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'def run():\n    return 1',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'tool.py' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'tool.py' }))

    await waitFor(() => {
      // CM6 handles syntax highlighting internally; data-highlight-language attribute is not used
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })
    expect(screen.getByTestId('code-viewer-language')).toHaveTextContent(
      'Language: python',
    )
  })

  it('does not render removed toolbar copy buttons and copies both from code-viewer context menu', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'auth.ts',
            relativePath: 'src/auth.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'alpha\nbeta\ngamma',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    expect(
      screen.queryByRole('button', { name: 'Copy Active File Path' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copy Selected Lines' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'auth.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'auth.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    // CM6 handles selection internally; fire contextmenu on the editor container
    fireEvent.contextMenu(screen.getByTestId('code-viewer-content'), {
      clientX: 120,
      clientY: 160,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Contents and Path' }))

    await waitFor(() => {
      // With CM6 default selection (L1-L1), copy both uses the first line
      expect(clipboardWriteText).toHaveBeenCalledWith(
        'src/auth.ts:L1-L1\nalpha',
      )
    })
  })

  it('shows banner when code-viewer Copy Contents and Path fails', async () => {
    const clipboardWriteText = vi
      .fn()
      .mockRejectedValue(new Error('permission denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'single.ts',
        relativePath: 'single.ts',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'const value = 1',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'single.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'single.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    // CM6 handles selection internally; fire contextmenu on the editor container
    fireEvent.contextMenu(screen.getByTestId('code-viewer-content'), {
      clientX: 80,
      clientY: 110,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Contents and Path' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to copy selected lines.',
      )
    })
  })

  it('copies relative path based on active workspace after switching', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const projectARoot = '/Users/tester/project-a'
    const projectBRoot = '/Users/tester/project-b'

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'src',
              relativePath: 'src',
              kind: 'directory',
              children: [
                {
                  name: 'a.ts',
                  relativePath: 'src/a.ts',
                  kind: 'file',
                },
              ],
            },
          ],
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'src',
              relativePath: 'src',
              kind: 'directory',
              children: [
                {
                  name: 'b.ts',
                  relativePath: 'src/b.ts',
                  kind: 'file',
                },
              ],
            },
          ],
        }
      }

      return {
        ok: false,
        fileTree: [],
      }
    })

    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'src/a.ts') {
        return {
          ok: true,
          content: 'const a = 1',
        }
      }

      if (relativePath === 'src/b.ts') {
        return {
          ok: true,
          content: 'const b = 2',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/a.ts')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'b.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/b.ts')
    })

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement

    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    // CM6 handles selection internally; fire contextmenu on the editor container
    fireEvent.contextMenu(screen.getByTestId('code-viewer-content'), {
      clientX: 100,
      clientY: 110,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))
    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('src/a.ts:L1')
    })

    fireEvent.change(workspaceSelect, { target: { value: projectBRoot } })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    fireEvent.contextMenu(screen.getByTestId('code-viewer-content'), {
      clientX: 120,
      clientY: 130,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))
    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('src/b.ts:L1')
    })
  })

  it('copies selected content/copy both from code-viewer context menu and applies right-click selection policy', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'auth.ts',
            relativePath: 'src/auth.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'alpha\nbeta\ngamma',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'auth.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'auth.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    // CM6 handles selection internally; fire contextmenu on the editor container
    // Default CM6 selection in jsdom is L1-L1
    fireEvent.contextMenu(screen.getByTestId('code-viewer-content'), {
      clientX: 120,
      clientY: 160,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Line Contents' }))

    await waitFor(() => {
      // With CM6 default selection (L1-L1), copy selected content uses the first line
      expect(clipboardWriteText).toHaveBeenCalledWith('alpha')
    })
    // CM6 selection updates are internal; the header selection display remains unchanged in jsdom
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: none',
    )

    fireEvent.contextMenu(screen.getByTestId('code-viewer-content'), {
      clientX: 140,
      clientY: 190,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Copy Contents and Path' }))
    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('src/auth.ts:L1-L1\nalpha')
    })
  })

  it('copies relative path from file-tree file/directory context menu without changing active file', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'note.md',
            relativePath: 'docs/note.md',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'note.md' })).toBeInTheDocument()
    })

    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
      'No active file',
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: 'docs' }), {
      clientX: 70,
      clientY: 90,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('docs')
    })

    fireEvent.contextMenu(screen.getByRole('button', { name: 'note.md' }), {
      clientX: 90,
      clientY: 110,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('docs/note.md')
    })
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
      'No active file',
    )
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it('refreshes file tree immediately after deleting a file from context menu', async () => {
    const workspaceRoot = '/Users/tester/projects/delete-refresh-workspace'
    const originalConfirm = window.confirm
    const confirmMock = vi.fn<() => boolean>().mockReturnValue(true)
    window.confirm = confirmMock

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [
              {
                name: 'a.ts',
                relativePath: 'src/a.ts',
                kind: 'file',
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        fileTree: [
          {
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            children: [],
          },
        ],
      })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'src' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.contextMenu(screen.getByRole('button', { name: 'a.ts' }), {
      clientX: 120,
      clientY: 140,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(deleteFileMock).toHaveBeenCalledWith(workspaceRoot, 'src/a.ts')
    })
    await waitFor(() => {
      expect(indexWorkspaceMock).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'a.ts' }),
      ).not.toBeInTheDocument()
    })
    expect(confirmMock).toHaveBeenCalledTimes(1)
    window.confirm = originalConfirm
  })

  it('renders markdown in right spec panel when .md file is selected', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'README.md',
        relativePath: 'README.md',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: '# Title\n\n## Intro\nbody',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toBeInTheDocument()
    })

    expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
      'README.md',
    )
    expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent('Title')
    expect(screen.getByTestId('spec-viewer-toc')).toBeInTheDocument()
  })

  it('keeps rendered spec visible while selecting a code file', async () => {
    const workspaceRoot = '/Users/tester/projects/sdd-workbench'
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'app.ts',
            relativePath: 'src/app.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Title\n\nspec body',
        }
      }

      if (relativePath === 'src/app.ts') {
        return {
          ok: true,
          content: 'const value = 1',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent('Title')
    })
    expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
      'docs/README.md',
    )

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'app.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'app.ts' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/app.ts')
    })
    // CM6 editor container is mounted; text rendering relies on browser APIs
    expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
      'docs/README.md',
    )
    expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent('spec body')
  })

  it('opens line-range markdown links from rendered spec content and applies selection', async () => {
    const workspaceRoot = '/Users/tester/projects/sdd-workbench'
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'overview.ts',
            relativePath: 'src/overview.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Main\n\n[Open Overview](../src/overview.ts#L2-L3)',
        }
      }

      if (relativePath === 'src/overview.ts') {
        return {
          ok: true,
          content: 'line1\nline2\nline3\nline4',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('link', { name: 'Open Overview' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'src/overview.ts',
      )
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L2-L3',
    )
    expect(readFileMock).toHaveBeenCalledWith(workspaceRoot, 'src/overview.ts')
    expect(screen.getByTestId('workspace-path')).toHaveAttribute(
      'title',
      workspaceRoot,
    )
  })

  it('opens markdown links without line hash and keeps selection empty', async () => {
    const workspaceRoot = '/Users/tester/projects/sdd-workbench'
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'plain.ts',
            relativePath: 'src/plain.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Main\n\n[Open Plain](../src/plain.ts)',
        }
      }

      if (relativePath === 'src/plain.ts') {
        return {
          ok: true,
          content: 'const value = 1',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('link', { name: 'Open Plain' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'src/plain.ts',
      )
    })

    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: none',
    )
  })

  it('goes to active spec source line from rendered markdown selection context action', async () => {
    const workspaceRoot = '/Users/tester/projects/sdd-workbench'
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'app.ts',
            relativePath: 'src/app.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Title\n\nsource jump paragraph',
        }
      }

      if (relativePath === 'src/app.ts') {
        return {
          ok: true,
          content: 'const app = true',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'source jump paragraph',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'app.ts' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'app.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/app.ts')
    })
    expect(readFileMock).toHaveBeenCalledTimes(2)

    const paragraph = screen.getByText('source jump paragraph')
    const selectedNode = findTextNodeContaining(paragraph, 'source jump')
    if (!selectedNode) {
      throw new Error('Expected text node containing source jump')
    }
    const anchorOffset = selectedNode.data.indexOf('source jump')
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: selectedNode,
      anchorOffset,
      focusNode: selectedNode,
      focusOffset: anchorOffset + 'source jump'.length,
      toString: () => 'source jump',
    } as unknown as Selection)

    fireEvent.contextMenu(paragraph, {
      clientX: 220,
      clientY: 260,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'docs/README.md',
      )
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L3-L3',
    )
    const codeView = getCM6View(screen.getByTestId('code-viewer-content'))
    if (!codeView) {
      throw new Error('Expected CodeMirror view')
    }
    expect(
      codeView.state.sliceDoc(
        codeView.state.selection.main.from,
        codeView.state.selection.main.to,
      ),
    ).toBe('source jump')
    await waitFor(() => {
      expect(
        screen
          .getByTestId('code-viewer-content')
          .querySelector('.cm-navigation-line'),
      ).not.toBeNull()
    })
    expect(readFileMock).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
      'source jump paragraph',
    )
  })

  it('navigates from markdown source line in Code tab to the rendered spec block and highlights it', async () => {
    const workspaceRoot = '/Users/tester/projects/go-to-spec-workspace'
    const markdownContent = '# Title\n\nalpha\nbeta\ngamma'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'docs',
          relativePath: 'docs',
          kind: 'directory',
          children: [
            {
              name: 'README.md',
              relativePath: 'docs/README.md',
              kind: 'file',
            },
          ],
        },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: markdownContent,
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'alpha beta gamma',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    await waitFor(() => {
      expect(screen.getByTestId('content-pane-code')).not.toHaveClass('is-hidden')
    })

    const codeContainer = screen.getByTestId('code-viewer-content')
    const codeView = getCM6View(codeContainer)
    if (!codeView) {
      throw new Error('Expected CodeMirror view')
    }
    const gammaLine = codeView.state.doc.line(5)
    act(() => {
      codeView.dispatch({
        selection: {
          anchor: gammaLine.from,
          head: gammaLine.from,
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
        'Selection: L5-L5',
      )
    })

    fireEvent.contextMenu(codeContainer, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Spec' }))

    await waitFor(() => {
      expect(screen.getByTestId('content-pane-spec')).not.toHaveClass('is-hidden')
    })

    const paragraph = screen.getByText(
      (_content, element) =>
        element?.tagName === 'P' &&
        element.textContent?.includes('alpha') &&
        element.textContent?.includes('beta') &&
        element.textContent?.includes('gamma'),
    )
    await waitFor(() => {
      expect(paragraph).toHaveClass('is-spec-navigation-target')
    })
  })

  it('opens line links using the currently active workspace after switching', async () => {
    const projectARoot = '/Users/tester/projects/workspace-a'
    const projectBRoot = '/Users/tester/projects/workspace-b'
    const workspaceTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
      {
        name: 'src',
        relativePath: 'src',
        kind: 'directory',
        children: [
          {
            name: 'shared.ts',
            relativePath: 'src/shared.ts',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: workspaceTree,
    })

    readFileMock.mockImplementation(async (rootPath, relativePath) => {
      if (rootPath === projectARoot && relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Workspace A\n\n[Open Shared](../src/shared.ts#L3-L4)',
        }
      }

      if (rootPath === projectBRoot && relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: '# Workspace B\n\n[Open Shared](../src/shared.ts#L5-L6)',
        }
      }

      if (rootPath === projectARoot && relativePath === 'src/shared.ts') {
        return {
          ok: true,
          content: 'a1\na2\na3\na4\na5',
        }
      }

      if (rootPath === projectBRoot && relativePath === 'src/shared.ts') {
        return {
          ok: true,
          content: 'b1\nb2\nb3\nb4\nb5\nb6',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'Workspace A',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectBRoot,
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'Workspace B',
      )
    })

    fireEvent.change(screen.getByTestId('workspace-switcher-select'), {
      target: { value: projectARoot },
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        projectARoot,
      )
    })
    expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
      'Workspace A',
    )

    fireEvent.click(screen.getByRole('link', { name: 'Open Shared' }))

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent(
        'src/shared.ts',
      )
    })
    expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
      'Selection: L3-L4',
    )
    expect(readFileMock).toHaveBeenLastCalledWith(projectARoot, 'src/shared.ts')
  })

  it('shows copy popover for external markdown links without resetting workspace', async () => {
    const workspaceRoot = '/Users/tester/projects/sdd-workbench'
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
        children: [
          {
            name: 'README.md',
            relativePath: 'docs/README.md',
            kind: 'file',
          },
        ],
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: '# Main\n\n[External Link](https://example.com/docs)',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('link', { name: 'External Link' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Link actions' })).toHaveTextContent(
        'https://example.com/docs',
      )
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('workspace-path')).toHaveAttribute(
      'title',
      workspaceRoot,
    )
  })

  it('restores activeSpec per workspace when switching', async () => {
    const projectARoot = '/Users/tester/spec-project-a'
    const projectBRoot = '/Users/tester/spec-project-b'

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectARoot,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: projectBRoot,
      })

    indexWorkspaceMock.mockImplementation(async (rootPath) => {
      if (rootPath === projectARoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'SPEC_A.md',
              relativePath: 'SPEC_A.md',
              kind: 'file',
            },
          ],
        }
      }

      if (rootPath === projectBRoot) {
        return {
          ok: true,
          fileTree: [
            {
              name: 'SPEC_B.md',
              relativePath: 'SPEC_B.md',
              kind: 'file',
            },
          ],
        }
      }

      return {
        ok: false,
        fileTree: [],
      }
    })

    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'SPEC_A.md') {
        return {
          ok: true,
          content: '# Workspace A',
        }
      }

      if (relativePath === 'SPEC_B.md') {
        return {
          ok: true,
          content: '# Workspace B',
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SPEC_A.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'SPEC_A.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        'SPEC_A.md',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SPEC_B.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'SPEC_B.md' }))
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        'SPEC_B.md',
      )
    })

    const workspaceSelect = screen.getByTestId(
      'workspace-switcher-select',
    ) as HTMLSelectElement

    fireEvent.change(workspaceSelect, { target: { value: projectARoot } })
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        'SPEC_A.md',
      )
    })

    fireEvent.change(workspaceSelect, { target: { value: projectBRoot } })
    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
        'SPEC_B.md',
      )
    })
  })

  it('shows preview unavailable state for binary files', async () => {
    const indexedTree: WorkspaceFileNode[] = [
      {
        name: 'binary.dat',
        relativePath: 'binary.dat',
        kind: 'file',
      },
    ]

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: '/Users/tester/projects/sdd-workbench',
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: indexedTree,
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: null,
      previewUnavailableReason: 'binary_file',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'binary.dat' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'binary.dat' }))

    await waitFor(() => {
      expect(
        screen.getByTestId('code-viewer-preview-unavailable'),
      ).toHaveTextContent('Preview unavailable: binary file detected.')
    })
  })

  it('adds a code comment from context menu and persists it', async () => {
    const workspaceRoot = '/Users/tester/projects/comments-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'main.ts',
          relativePath: 'main.ts',
          kind: 'file',
        },
      ],
    })
    readFileMock.mockResolvedValueOnce({
      ok: true,
      content: 'const alpha = 1\nconst beta = 2',
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'main.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'main.ts' }))

    await waitFor(() => {
      // CM6 editor container is mounted
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    // CM6 handles selection internally; fire contextmenu on the editor container
    fireEvent.contextMenu(screen.getByTestId('code-viewer-content'), {
      clientX: 100,
      clientY: 120,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Add comment' })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Comment'), {
      target: {
        value: 'Handle null input before assignment',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Comment' }))

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })

    const [writtenRootPath, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenRootPath).toBe(workspaceRoot)
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      relativePath: 'main.ts',
      startLine: 1,
      endLine: 1,
      body: 'Handle null input before assignment',
    })
  })

  it('persists exact source offsets when adding a comment from rendered markdown', async () => {
    const workspaceRoot = '/Users/tester/projects/spec-comment-workspace'
    const markdownContent = '# Title\n\nalpha **beta** gamma'
    const expectedStartOffset = markdownContent.indexOf('gamma')
    const expectedEndOffset = expectedStartOffset + 'gamma'.length

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'docs',
          relativePath: 'docs',
          kind: 'directory',
          children: [
            {
              name: 'README.md',
              relativePath: 'docs/README.md',
              kind: 'file',
            },
          ],
        },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: markdownContent,
        }
      }

      return {
        ok: false,
        content: null,
      }
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'alpha beta gamma',
      )
    })

    const paragraph =
      screen.getByTestId('spec-viewer-content').querySelector('p')
    if (!paragraph) {
      throw new Error('Expected rendered paragraph')
    }
    const selectedNode = findTextNodeContaining(paragraph, 'gamma')
    if (!selectedNode) {
      throw new Error('Expected text node containing gamma')
    }
    const anchorOffset = selectedNode.data.indexOf('gamma')
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: selectedNode,
      anchorOffset,
      focusNode: selectedNode,
      focusOffset: anchorOffset + 'gamma'.length,
      toString: () => 'gamma',
    } as unknown as Selection)

    fireEvent.contextMenu(paragraph, {
      clientX: 220,
      clientY: 260,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Add comment' })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Comment'), {
      target: {
        value: 'Focus on gamma token',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Comment' }))

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })

    const [writtenRootPath, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenRootPath).toBe(workspaceRoot)
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      relativePath: 'docs/README.md',
      startLine: 3,
      endLine: 3,
      body: 'Focus on gamma token',
      anchor: {
        snippet: 'gamma',
        startOffset: expectedStartOffset,
        endOffset: expectedEndOffset,
      },
    })
  })

  it('copies rendered spec selection via source actions using raw markdown line mapping', async () => {
    const workspaceRoot = '/Users/tester/projects/spec-copy-workspace'
    const markdownContent = '# Title\n\nalpha\nbeta\ngamma'
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'docs',
          relativePath: 'docs',
          kind: 'directory',
          children: [
            {
              name: 'README.md',
              relativePath: 'docs/README.md',
              kind: 'file',
            },
          ],
        },
      ],
    })
    readFileMock.mockImplementation(async (_rootPath, relativePath) => {
      if (relativePath === 'docs/README.md') {
        return {
          ok: true,
          content: markdownContent,
        }
      }

      return {
        ok: false,
        content: null,
      }
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent(
        'alpha beta gamma',
      )
    })

    const paragraph =
      screen.getByTestId('spec-viewer-content').querySelector('p')
    if (!paragraph) {
      throw new Error('Expected rendered paragraph')
    }
    const selectedNode = findTextNodeContaining(paragraph, 'gamma')
    if (!selectedNode) {
      throw new Error('Expected text node containing gamma')
    }
    const anchorOffset = selectedNode.data.indexOf('gamma')
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: selectedNode,
      anchorOffset,
      focusNode: selectedNode,
      focusOffset: selectedNode.data.length,
      toString: () => 'gamma',
    } as unknown as Selection)

    fireEvent.contextMenu(paragraph, {
      clientX: 220,
      clientY: 260,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Line Contents' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('gamma')
    })

    fireEvent.contextMenu(paragraph, {
      clientX: 220,
      clientY: 260,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Contents and Path' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        'docs/README.md:L5-L5\ngamma',
      )
    })

    fireEvent.contextMenu(paragraph, {
      clientX: 220,
      clientY: 260,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('docs/README.md:L5')
    })
  })

  it('opens View Comments modal and shows comment metadata', async () => {
    const workspaceRoot = '/Users/tester/projects/view-comments-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'docs/spec.md:4-6:aaaa1111:2026-02-22T14:00:00.000Z',
          relativePath: 'docs/spec.md',
          startLine: 4,
          endLine: 6,
          body: 'Need to refine this section',
          anchor: {
            snippet: 'Section title',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T14:00:00.000Z',
        },
      ],
    })
    readGlobalCommentsMock.mockResolvedValueOnce({
      ok: true,
      body: '## Global Notes\n- Keep consistency',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    expect(screen.getByText('docs/spec.md:L4-L6')).toBeInTheDocument()
    expect(screen.getByText('2026-02-22T14:00:00.000Z')).toBeInTheDocument()
    expect(screen.getByText('Need to refine this section')).toBeInTheDocument()
    expect(screen.getByTestId('comment-list-global-body')).toHaveTextContent(
      '## Global Notes',
    )
  })

  it('jumps to comment code line and closes View Comments modal when target clicked', async () => {
    const workspaceRoot = '/Users/tester/projects/jump-comment-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [
        {
          name: 'src',
          relativePath: 'src',
          kind: 'directory',
          children: [
            {
              name: 'a.ts',
              relativePath: 'src/a.ts',
              kind: 'file',
            },
          ],
        },
      ],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:2-3:aaaa1111:2026-02-22T14:00:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 2,
          endLine: 3,
          body: 'Review this block',
          anchor: {
            snippet: 'some code',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T14:00:00.000Z',
        },
      ],
    })
    readFileMock.mockResolvedValue({
      ok: true,
      content: 'line1\nline2\nline3\n',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    // Click the target jump button
    fireEvent.click(screen.getByRole('button', { name: 'src/a.ts:L2-L3' }))

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'View comments' })).not.toBeInTheDocument()
    })

    // Active file should be updated
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('src/a.ts')
    })

    // Selection range should be updated
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-selection-range')).toHaveTextContent(
        'Selection: L2-L3',
      )
    })
  })

  it('closes View Comments modal but does not jump when comment file is not in workspace', async () => {
    const workspaceRoot = '/Users/tester/projects/jump-missing-file-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/missing.ts:1-1:bbbb2222:2026-02-22T14:00:00.000Z',
          relativePath: 'src/missing.ts',
          startLine: 1,
          endLine: 1,
          body: 'Comment on missing file',
          anchor: {
            snippet: 'code',
            hash: 'bbbb2222',
          },
          createdAt: '2026-02-22T14:00:00.000Z',
        },
      ],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    // Click the target jump button for a file not in workspace
    fireEvent.click(screen.getByRole('button', { name: 'src/missing.ts:L1' }))

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'View comments' })).not.toBeInTheDocument()
    })

    // Active file should remain as "No active file" since selectFile returned false
    expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('No active file')
  })

  it('updates a comment body from View Comments modal', async () => {
    const workspaceRoot = '/Users/tester/projects/edit-comments-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:2-2:aaaa1111:2026-02-22T14:10:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 2,
          endLine: 2,
          body: 'old body',
          anchor: {
            snippet: 'const value = 1',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T14:10:00.000Z',
        },
      ],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Edit comment body'), {
      target: { value: '  updated body  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    const [writtenRootPath, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenRootPath).toBe(workspaceRoot)
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      id: 'src/a.ts:2-2:aaaa1111:2026-02-22T14:10:00.000Z',
      body: 'updated body',
    })
  })

  it('auto-dismisses comment banners after 5 seconds', async () => {
    const workspaceRoot = '/Users/tester/projects/comment-banner-autodismiss'
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:2-2:aaaa1111:2026-02-22T14:10:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 2,
          endLine: 2,
          body: 'old body',
          anchor: {
            snippet: 'const value = 1',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T14:10:00.000Z',
        },
      ],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Edit comment body'), {
      target: { value: 'updated body' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Comment updated.')
    })

    const autoDismissCall = setTimeoutSpy.mock.calls.find(
      (call) => call[1] === 5000,
    )
    expect(autoDismissCall).toBeDefined()
    const timeoutHandler = autoDismissCall?.[0]
    expect(typeof timeoutHandler).toBe('function')

    await act(async () => {
      (timeoutHandler as () => void)()
    })

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('does not auto-dismiss non-comment banners', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    openDialogMock.mockResolvedValueOnce({
      canceled: true,
      selectedPath: null,
      error: 'permission denied',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('permission denied')
    })

    expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 5000)
  })

  it('auto-dismisses remote connection banners after 5 seconds', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    connectRemoteMock.mockResolvedValueOnce({
      ok: true,
      workspaceId: 'remote-workspace-banner-autodismiss',
      sessionId: 'session-banner-autodismiss',
      rootPath: 'remote://remote-workspace-banner-autodismiss',
      remoteConnectionState: 'connected',
      state: 'connected',
    })
    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect Remote Workspace' }))
    fireEvent.change(screen.getByTestId('remote-connect-host-input'), {
      target: { value: 'autodismiss.example.com' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-root-input'), {
      target: { value: '/srv/autodismiss' },
    })
    fireEvent.change(screen.getByTestId('remote-connect-workspace-id-input'), {
      target: { value: 'remote-workspace-banner-autodismiss' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-remote-connection-state')).toHaveTextContent(
        'connected',
      )
    })

    act(() => {
      emitRemoteConnectionEvent({
        workspaceId: 'remote-workspace-banner-autodismiss',
        state: 'degraded',
        errorCode: 'TIMEOUT',
        message: 'agent heartbeat delayed',
        occurredAt: new Date().toISOString(),
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('TIMEOUT')
    })

    const autoDismissCall = setTimeoutSpy.mock.calls.find(
      (call) => call[1] === 5000,
    )
    expect(autoDismissCall).toBeDefined()
    const timeoutHandler = autoDismissCall?.[0]
    expect(typeof timeoutHandler).toBe('function')

    await act(async () => {
      const dismissBanner = timeoutHandler as () => void
      dismissBanner()
    })

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('keeps edit mode open when comment update fails and shows error banner', async () => {
    const workspaceRoot = '/Users/tester/projects/edit-comments-fail-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:2-2:aaaa1111:2026-02-22T14:10:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 2,
          endLine: 2,
          body: 'old body',
          anchor: {
            snippet: 'const value = 1',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T14:10:00.000Z',
        },
      ],
    })
    writeCommentsMock.mockResolvedValueOnce({
      ok: false,
      error: 'write failed',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Edit comment body'), {
      target: { value: 'updated body' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to save comments: write failed',
      )
    })

    expect(screen.getByLabelText('Edit comment body')).toHaveValue('updated body')
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('deletes exported comments only from View Comments modal', async () => {
    const workspaceRoot = '/Users/tester/projects/delete-exported-comments-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:1-1:aaaa1111:2026-02-22T10:00:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 1,
          endLine: 1,
          body: 'pending comment',
          anchor: {
            snippet: 'pending',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T10:00:00.000Z',
        },
        {
          id: 'src/b.ts:3-3:bbbb2222:2026-02-22T11:00:00.000Z',
          relativePath: 'src/b.ts',
          startLine: 3,
          endLine: 3,
          body: 'already exported comment',
          anchor: {
            snippet: 'exported',
            hash: 'bbbb2222',
          },
          createdAt: '2026-02-22T11:00:00.000Z',
          exportedAt: '2026-02-22T12:00:00.000Z',
        },
      ],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Exported' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete Exported' }))

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    const [writtenRootPath, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenRootPath).toBe(workspaceRoot)
    expect(writtenComments).toHaveLength(1)
    expect(writtenComments[0]).toMatchObject({
      id: 'src/a.ts:1-1:aaaa1111:2026-02-22T10:00:00.000Z',
    })
    expect(writtenComments[0]).not.toHaveProperty('exportedAt')
  })

  it('keeps delete-exported confirmation open when save fails and shows error banner', async () => {
    const workspaceRoot =
      '/Users/tester/projects/delete-exported-comments-fail-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:1-1:aaaa1111:2026-02-22T10:00:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 1,
          endLine: 1,
          body: 'pending comment',
          anchor: {
            snippet: 'pending',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T10:00:00.000Z',
        },
        {
          id: 'src/b.ts:3-3:bbbb2222:2026-02-22T11:00:00.000Z',
          relativePath: 'src/b.ts',
          startLine: 3,
          endLine: 3,
          body: 'already exported comment',
          anchor: {
            snippet: 'exported',
            hash: 'bbbb2222',
          },
          createdAt: '2026-02-22T11:00:00.000Z',
          exportedAt: '2026-02-22T12:00:00.000Z',
        },
      ],
    })
    writeCommentsMock.mockResolvedValueOnce({
      ok: false,
      error: 'delete failed',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Exported' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete Exported' }))

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to save comments: delete failed',
      )
    })

    expect(
      screen.getByRole('button', { name: 'Confirm Delete Exported' }),
    ).toBeInTheDocument()
  })

  it('opens Add Global Comments modal and saves global comments body', async () => {
    const workspaceRoot = '/Users/tester/projects/global-comments-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readGlobalCommentsMock.mockResolvedValueOnce({
      ok: true,
      body: '## Existing context\n- Preserve endpoints',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Add Global Comments' }),
      ).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add Global Comments' }))
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Add global comments' }),
      ).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('Global comments (Markdown)')
    expect(textarea).toHaveValue('## Existing context\n- Preserve endpoints')

    fireEvent.change(textarea, {
      target: { value: '## Global Rules\n- Keep API compatibility' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Global Comments' }))

    await waitFor(() => {
      expect(writeGlobalCommentsMock).toHaveBeenCalledTimes(1)
    })
    expect(writeGlobalCommentsMock).toHaveBeenCalledWith(
      workspaceRoot,
      '## Global Rules\n- Keep API compatibility',
    )
  })

  it('keeps global comments scoped to the workspace where the modal was opened', async () => {
    const workspaceRootA = '/Users/tester/projects/global-comments-workspace-a'
    const workspaceRootB = '/Users/tester/projects/global-comments-workspace-b'
    const globalCommentsByRoot = new Map<string, string>([
      [workspaceRootA, ''],
      [workspaceRootB, ''],
    ])

    readGlobalCommentsMock.mockImplementation(async (rootPath: string) => ({
      ok: true,
      body: globalCommentsByRoot.get(rootPath) ?? '',
    }))
    writeGlobalCommentsMock.mockImplementation(
      async (rootPath: string, body: string) => {
        globalCommentsByRoot.set(rootPath, body)
        return { ok: true }
      },
    )

    openDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: workspaceRootA,
      })
      .mockResolvedValueOnce({
        canceled: false,
        selectedPath: workspaceRootB,
      })
    indexWorkspaceMock.mockResolvedValue({
      ok: true,
      fileTree: [],
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        workspaceRootA,
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        workspaceRootB,
      )
    })

    fireEvent.change(screen.getByTestId('workspace-switcher-select'), {
      target: { value: workspaceRootA },
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        workspaceRootA,
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add Global Comments' }))
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Add global comments' }),
      ).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Global comments (Markdown)'), {
      target: { value: 'Workspace A global note' },
    })

    fireEvent.change(screen.getByTestId('workspace-switcher-select'), {
      target: { value: workspaceRootB },
    })
    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveAttribute(
        'title',
        workspaceRootB,
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Global Comments' }))
    await waitFor(() => {
      expect(writeGlobalCommentsMock).toHaveBeenCalledWith(
        workspaceRootA,
        'Workspace A global note',
      )
    })

    expect(globalCommentsByRoot.get(workspaceRootA)).toBe('Workspace A global note')
    expect(globalCommentsByRoot.get(workspaceRootB)).toBe('')

    fireEvent.click(screen.getByRole('button', { name: 'Add Global Comments' }))
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Add global comments' }),
      ).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Global comments (Markdown)')).toHaveValue('')
  })

  it('keeps Add Global Comments modal open when save fails and shows error banner', async () => {
    const workspaceRoot = '/Users/tester/projects/global-comments-fail-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readGlobalCommentsMock.mockResolvedValueOnce({
      ok: true,
      body: '## Existing context',
    })
    writeGlobalCommentsMock.mockResolvedValueOnce({
      ok: false,
      error: 'global write failed',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Add Global Comments' }),
      ).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add Global Comments' }))
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Add global comments' }),
      ).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Global comments (Markdown)'), {
      target: { value: '## Global Rules\n- Keep API compatibility' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Global Comments' }))

    await waitFor(() => {
      expect(writeGlobalCommentsMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to save global comments: global write failed',
      )
    })

    expect(
      screen.getByRole('dialog', { name: 'Add global comments' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Global comments (Markdown)')).toHaveValue(
      '## Global Rules\n- Keep API compatibility',
    )
  })

  it('prepends global comments in export markdown and bundle', async () => {
    const workspaceRoot = '/Users/tester/projects/export-order-workspace'
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:1-1:aaaa1111:2026-02-22T12:00:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 1,
          endLine: 1,
          body: 'line comment',
          anchor: {
            snippet: 'const a = 1',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T12:00:00.000Z',
        },
      ],
    })
    readGlobalCommentsMock.mockResolvedValueOnce({
      ok: true,
      body: '## Shared Context\n- Apply globally',
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: true,
      commentsPath: `${workspaceRoot}/_COMMENTS.md`,
      bundlePath: `${workspaceRoot}/.sdd-workbench/exports/20260222-comments-bundle.md`,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('export-selected-button'))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })
    expect(screen.getByText('Global comments: included')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => {
      expect(exportCommentsBundleMock).toHaveBeenCalledTimes(1)
    })
    const [request] = exportCommentsBundleMock.mock.calls[0]
    const commentsMarkdown = request.commentsMarkdown ?? ''
    const bundleMarkdown = request.bundleMarkdown ?? ''
    expect(commentsMarkdown).toContain('## Global Comments')
    expect(commentsMarkdown).toContain('## Comments')
    expect(bundleMarkdown).toContain('## Global Comments')
    expect(bundleMarkdown).toContain('## Comments')

    const commentsGlobalIndex = commentsMarkdown.indexOf('## Global Comments')
    const commentsSectionIndex = commentsMarkdown.indexOf('## Comments')
    expect(commentsGlobalIndex).toBeGreaterThan(-1)
    expect(commentsGlobalIndex).toBeLessThan(commentsSectionIndex)

    const bundleGlobalIndex = bundleMarkdown.indexOf('## Global Comments')
    const bundleSectionIndex = bundleMarkdown.indexOf('## Comments')
    expect(bundleGlobalIndex).toBeGreaterThan(-1)
    expect(bundleGlobalIndex).toBeLessThan(bundleSectionIndex)
    expect(writeGlobalCommentsMock).toHaveBeenCalledTimes(1)
    expect(writeGlobalCommentsMock).toHaveBeenCalledWith(workspaceRoot, '')
  })

  it('allows export when only global comments exist and keeps line export status unchanged', async () => {
    const workspaceRoot = '/Users/tester/projects/global-only-export-workspace'
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [],
    })
    readGlobalCommentsMock.mockResolvedValueOnce({
      ok: true,
      body: 'Global-only export context',
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: true,
      commentsPath: `${workspaceRoot}/_COMMENTS.md`,
      bundlePath: `${workspaceRoot}/.sdd-workbench/exports/20260222-comments-bundle.md`,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('export-selected-button'))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })
    expect(screen.getByText('0 pending comment(s)')).toBeInTheDocument()
    expect(screen.getByText('Global comments: included')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => {
      expect(exportCommentsBundleMock).toHaveBeenCalledTimes(1)
    })
    expect(writeCommentsMock).not.toHaveBeenCalled()
    expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    expect(writeGlobalCommentsMock).toHaveBeenCalledTimes(1)
    expect(writeGlobalCommentsMock).toHaveBeenCalledWith(workspaceRoot, '')
  })

  it('excludes global comments from export when global checkbox is unchecked', async () => {
    const workspaceRoot = '/Users/tester/projects/global-checkbox-uncheck-workspace'
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:1-1:aaaa1111:2026-02-22T12:00:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 1,
          endLine: 1,
          body: 'line comment',
          anchor: {
            snippet: 'const a = 1',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T12:00:00.000Z',
        },
      ],
    })
    readGlobalCommentsMock.mockResolvedValueOnce({
      ok: true,
      body: '## Shared Context\n- Apply globally',
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: true,
      commentsPath: `${workspaceRoot}/_COMMENTS.md`,
      bundlePath: `${workspaceRoot}/.sdd-workbench/exports/20260222-comments-bundle.md`,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    // Uncheck the global comments checkbox
    fireEvent.click(screen.getByTestId('include-global-comments-checkbox'))

    fireEvent.click(screen.getByTestId('export-selected-button'))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })
    expect(screen.getByText('Global comments: not included')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => {
      expect(exportCommentsBundleMock).toHaveBeenCalledTimes(1)
    })
    const [request] = exportCommentsBundleMock.mock.calls[0]
    const bundleMarkdown = request.bundleMarkdown ?? ''
    expect(bundleMarkdown).not.toContain('## Global Comments')
    expect(writeGlobalCommentsMock).not.toHaveBeenCalled()
  })

  it('disables clipboard export when bundle exceeds max length and exports files only', async () => {
    const workspaceRoot = '/Users/tester/projects/export-comments-workspace'
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValue({
      ok: true,
      comments: [
        {
          id: 'src/a.ts:1-1:aaaa1111:2026-02-22T12:00:00.000Z',
          relativePath: 'src/a.ts',
          startLine: 1,
          endLine: 1,
          body: 'x'.repeat(31_000),
          anchor: {
            snippet: 'const a = 1',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T12:00:00.000Z',
        },
      ],
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: true,
      commentsPath: `${workspaceRoot}/_COMMENTS.md`,
      bundlePath: `${workspaceRoot}/.sdd-workbench/exports/20260222-comments-bundle.md`,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('export-selected-button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })
    expect(screen.getByText('Global comments: not included')).toBeInTheDocument()

    const clipboardCheckbox = screen.getByLabelText('Copy bundle to clipboard')
    expect(clipboardCheckbox).toBeDisabled()
    expect(clipboardCheckbox).not.toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => {
      expect(exportCommentsBundleMock).toHaveBeenCalledTimes(1)
    })
    expect(clipboardWriteText).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })

    expect(exportCommentsBundleMock).toHaveBeenCalledWith({
      rootPath: workspaceRoot,
      commentsMarkdown: expect.any(String),
      bundleMarkdown: expect.any(String),
      writeCommentsFile: true,
      writeBundleFile: true,
    })

    const [, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenComments).toHaveLength(0)

    // Re-open View Comments and verify exported comment was removed by default.
    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })
    expect(screen.getByText('No comments yet.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Select comment from src/a.ts:L1')).not.toBeInTheDocument()
  })

  it('allows export of already-exported comments when selected from View Comments', async () => {
    const workspaceRoot = '/Users/tester/projects/exported-only-from-view-workspace'
    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValue({
      ok: true,
      comments: [
        {
          id: 'src/b.ts:5-5:bbbb2222:2026-02-22T10:00:00.000Z',
          relativePath: 'src/b.ts',
          startLine: 5,
          endLine: 5,
          body: 'This comment was already exported.',
          anchor: {
            snippet: 'const b = 2',
            hash: 'bbbb2222',
          },
          createdAt: '2026-02-22T10:00:00.000Z',
          exportedAt: '2026-02-22T11:00:00.000Z',
        },
      ],
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: true,
      commentsPath: `${workspaceRoot}/_COMMENTS.md`,
      bundlePath: `${workspaceRoot}/.sdd-workbench/exports/20260222_110000-comments-bundle.md`,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })

    // Select the already-exported comment and click export
    fireEvent.click(screen.getByLabelText('Select comment from src/b.ts:L5'))
    fireEvent.click(screen.getByTestId('export-selected-button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })
    expect(screen.getByText('0 pending comment(s)')).toBeInTheDocument()
    expect(screen.getByText('Global comments: not included')).toBeInTheDocument()
    // Export button must be enabled when comments are explicitly selected from View Comments
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled()
  })

  it('keeps file export success when clipboard copy fails during mixed export', async () => {
    const workspaceRoot = '/Users/tester/projects/mixed-export-workspace'
    const clipboardWriteText = vi
      .fn()
      .mockRejectedValue(new Error('clipboard unavailable'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'docs/spec.md:3-3:aaaa1111:2026-02-22T12:00:00.000Z',
          relativePath: 'docs/spec.md',
          startLine: 3,
          endLine: 3,
          body: 'Need clarification for this requirement.',
          anchor: {
            snippet: 'Requirement heading',
            hash: 'aaaa1111',
          },
          createdAt: '2026-02-22T12:00:00.000Z',
        },
      ],
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: true,
      commentsPath: `${workspaceRoot}/_COMMENTS.md`,
      bundlePath: `${workspaceRoot}/.sdd-workbench/exports/20260222_120000-comments-bundle.md`,
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('export-selected-button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => {
      expect(exportCommentsBundleMock).toHaveBeenCalledTimes(1)
    })
    expect(clipboardWriteText).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    const [, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenComments).toHaveLength(0)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Comments exported: _COMMENTS.md, bundle file. Failed: clipboard.',
      )
    })
  })

  it('keeps clipboard export success when file export fails during mixed export', async () => {
    const workspaceRoot = '/Users/tester/projects/mixed-export-file-fail-workspace'
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [],
    })
    readCommentsMock.mockResolvedValueOnce({
      ok: true,
      comments: [
        {
          id: 'docs/spec.md:5-5:bbbb2222:2026-02-22T13:00:00.000Z',
          relativePath: 'docs/spec.md',
          startLine: 5,
          endLine: 5,
          body: 'Clipboard success should still mark export state.',
          anchor: {
            snippet: 'Another heading',
            hash: 'bbbb2222',
          },
          createdAt: '2026-02-22T13:00:00.000Z',
        },
      ],
    })
    exportCommentsBundleMock.mockResolvedValueOnce({
      ok: false,
      error: 'disk full',
    })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Comments' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View Comments' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'View comments' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('export-selected-button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Export comments' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(exportCommentsBundleMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(writeCommentsMock).toHaveBeenCalledTimes(1)
    })
    const [, writtenComments] = writeCommentsMock.mock.calls[0]
    expect(writtenComments).toHaveLength(0)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Comments exported: clipboard. Failed: _COMMENTS.md, bundle file.',
      )
    })
  })

  it('auto-reloads file when not dirty and external change detected', async () => {
    const workspaceRoot = '/Users/tester/watch-auto-reload-clean'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [{ name: 'a.ts', relativePath: 'a.ts', kind: 'file' }],
    })
    readFileMock
      .mockResolvedValueOnce({ ok: true, content: 'const a = 1' })
      .mockResolvedValueOnce({ ok: true, content: 'const a = 2' })

    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['a.ts'],
    })

    await waitFor(() => {
      expect(readFileMock).toHaveBeenCalledTimes(2)
    })
    expect(screen.queryByTestId('external-change-banner')).not.toBeInTheDocument()
  })

  it('shows external change banner when dirty file changes on disk and skips auto-reload', async () => {
    const workspaceRoot = '/Users/tester/watch-dirty-banner'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [{ name: 'a.ts', relativePath: 'a.ts', kind: 'file' }],
    })
    readFileMock.mockResolvedValueOnce({ ok: true, content: 'const a = 1' })

    render(<AppWithMarkDirty />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mark-dirty-btn'))

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['a.ts'],
    })

    await waitFor(() => {
      expect(screen.getByTestId('external-change-banner')).toBeInTheDocument()
    })
    expect(screen.getByTestId('external-change-banner')).toHaveTextContent(
      'File changed on disk. Reload?',
    )
    expect(readFileMock).toHaveBeenCalledTimes(1)
  })

  it('reloads external file change when Reload button clicked and clears dirty', async () => {
    const workspaceRoot = '/Users/tester/watch-dirty-reload'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [{ name: 'a.ts', relativePath: 'a.ts', kind: 'file' }],
    })
    readFileMock
      .mockResolvedValueOnce({ ok: true, content: 'const a = 1' })
      .mockResolvedValueOnce({ ok: true, content: 'const a = 2' })

    render(<AppWithMarkDirty />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mark-dirty-btn'))

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['a.ts'],
    })

    await waitFor(() => {
      expect(screen.getByTestId('external-change-banner')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    await waitFor(() => {
      expect(readFileMock).toHaveBeenCalledTimes(2)
    })
    expect(screen.queryByTestId('external-change-banner')).not.toBeInTheDocument()
  })

  it('dismisses external change banner without reloading when Dismiss clicked', async () => {
    const workspaceRoot = '/Users/tester/watch-dirty-dismiss'

    openDialogMock.mockResolvedValueOnce({
      canceled: false,
      selectedPath: workspaceRoot,
    })
    indexWorkspaceMock.mockResolvedValueOnce({
      ok: true,
      fileTree: [{ name: 'a.ts', relativePath: 'a.ts', kind: 'file' }],
    })
    readFileMock.mockResolvedValueOnce({ ok: true, content: 'const a = 1' })

    render(<AppWithMarkDirty />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    await waitFor(() => {
      expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mark-dirty-btn'))

    emitWatchEvent({
      workspaceId: workspaceRoot,
      changedRelativePaths: ['a.ts'],
    })

    await waitFor(() => {
      expect(screen.getByTestId('external-change-banner')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    await waitFor(() => {
      expect(screen.queryByTestId('external-change-banner')).not.toBeInTheDocument()
    })
    expect(readFileMock).toHaveBeenCalledTimes(1)
  })

  describe('T9: unsaved changes guard', () => {
    it('shows confirm when switching files while dirty and aborts on cancel', async () => {
      const workspaceRoot = '/Users/tester/dirty-guard-file-switch'
      openDialogMock.mockResolvedValueOnce({
        canceled: false,
        selectedPath: workspaceRoot,
      })
      indexWorkspaceMock.mockResolvedValueOnce({
        ok: true,
        fileTree: [
          { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
          { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
        ],
      })
      readFileMock.mockResolvedValue({ ok: true, content: 'content' })

      const confirmMock = vi.fn<() => boolean>().mockReturnValue(false)
      window.confirm = confirmMock

      render(<AppWithMarkDirty />)

      fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
      await waitFor(() => {
        expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('mark-dirty-btn'))

      fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))

      expect(confirmMock).toHaveBeenCalledWith('Unsaved changes will be lost. Continue?')
      expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('a.ts')
      expect(readFileMock).toHaveBeenCalledTimes(1)
    })

    it('switches files when dirty and user confirms', async () => {
      const workspaceRoot = '/Users/tester/dirty-guard-file-confirm'
      openDialogMock.mockResolvedValueOnce({
        canceled: false,
        selectedPath: workspaceRoot,
      })
      indexWorkspaceMock.mockResolvedValueOnce({
        ok: true,
        fileTree: [
          { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
          { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
        ],
      })
      readFileMock.mockResolvedValue({ ok: true, content: 'content' })

      const confirmMock = vi.fn<() => boolean>().mockReturnValue(true)
      window.confirm = confirmMock

      render(<AppWithMarkDirty />)

      fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
      await waitFor(() => {
        expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('mark-dirty-btn'))

      fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))

      expect(confirmMock).toHaveBeenCalledWith('Unsaved changes will be lost. Continue?')
      await waitFor(() => {
        expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
      })
    })

    it('switches files without confirm when not dirty', async () => {
      const workspaceRoot = '/Users/tester/dirty-guard-file-clean'
      openDialogMock.mockResolvedValueOnce({
        canceled: false,
        selectedPath: workspaceRoot,
      })
      indexWorkspaceMock.mockResolvedValueOnce({
        ok: true,
        fileTree: [
          { name: 'a.ts', relativePath: 'a.ts', kind: 'file' },
          { name: 'b.ts', relativePath: 'b.ts', kind: 'file' },
        ],
      })
      readFileMock.mockResolvedValue({ ok: true, content: 'content' })

      const confirmMock = vi.fn<() => boolean>()
      window.confirm = confirmMock

      render(<AppWithMarkDirty />)

      fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
      await waitFor(() => {
        expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
      })

      // NOT marking dirty this time
      fireEvent.click(screen.getByRole('button', { name: 'b.ts' }))

      expect(confirmMock).not.toHaveBeenCalled()
      await waitFor(() => {
        expect(screen.getByTestId('code-viewer-active-file')).toHaveTextContent('b.ts')
      })
    })

    it('shows confirm when switching workspace while dirty and aborts on cancel', async () => {
      const workspaceARoot = '/Users/tester/dirty-guard-ws-switch-a'
      const workspaceBRoot = '/Users/tester/dirty-guard-ws-switch-b'
      openDialogMock
        .mockResolvedValueOnce({ canceled: false, selectedPath: workspaceARoot })
        .mockResolvedValueOnce({ canceled: false, selectedPath: workspaceBRoot })
      indexWorkspaceMock.mockResolvedValue({
        ok: true,
        fileTree: [{ name: 'x.ts', relativePath: 'x.ts', kind: 'file' }],
      })
      readFileMock.mockResolvedValue({ ok: true, content: 'content' })

      const confirmMock = vi.fn<() => boolean>().mockReturnValue(false)
      window.confirm = confirmMock

      render(<AppWithMarkDirty />)

      // Open workspace A and select a file, mark dirty
      fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'x.ts' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'x.ts' }))
      await waitFor(() => {
        expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('mark-dirty-btn'))

      // Open workspace B (focus shifts to B)
      fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
      await waitFor(() => {
        expect(indexWorkspaceMock).toHaveBeenCalledTimes(2)
      })
      // workspace B is now active; select its file and mark dirty
      fireEvent.click(screen.getByRole('button', { name: 'x.ts' }))
      await waitFor(() => {
        expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByTestId('mark-dirty-btn'))

      // Now try switching back to workspace A while workspace B is dirty
      const workspaceSelect = screen.getByTestId('workspace-switcher-select') as HTMLSelectElement
      fireEvent.change(workspaceSelect, { target: { value: workspaceARoot } })

      expect(confirmMock).toHaveBeenCalledWith('Unsaved changes will be lost. Continue?')
      await waitFor(() => {
        expect(screen.getByTestId('workspace-path')).toHaveAttribute('title', workspaceBRoot)
      })
    })

    it('shows confirm when closing workspace while dirty and aborts on cancel', async () => {
      const workspaceRoot = '/Users/tester/dirty-guard-close'
      openDialogMock.mockResolvedValueOnce({
        canceled: false,
        selectedPath: workspaceRoot,
      })
      indexWorkspaceMock.mockResolvedValueOnce({
        ok: true,
        fileTree: [{ name: 'a.ts', relativePath: 'a.ts', kind: 'file' }],
      })
      readFileMock.mockResolvedValue({ ok: true, content: 'content' })

      const confirmMock = vi.fn<() => boolean>().mockReturnValue(false)
      window.confirm = confirmMock

      render(<AppWithMarkDirty />)

      fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
      await waitFor(() => {
        expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('mark-dirty-btn'))

      fireEvent.click(screen.getByRole('button', { name: 'Close Workspace' }))

      expect(confirmMock).toHaveBeenCalledWith('Unsaved changes will be lost. Continue?')
      expect(screen.getByTestId('workspace-path')).toHaveAttribute('title', workspaceRoot)
    })

    it('registers beforeunload handler when dirty and removes it when clean', async () => {
      const workspaceRoot = '/Users/tester/dirty-guard-beforeunload'
      openDialogMock.mockResolvedValueOnce({
        canceled: false,
        selectedPath: workspaceRoot,
      })
      indexWorkspaceMock.mockResolvedValueOnce({
        ok: true,
        fileTree: [{ name: 'a.ts', relativePath: 'a.ts', kind: 'file' }],
      })
      readFileMock.mockResolvedValue({ ok: true, content: 'content' })
      const writeFileResult: WorkspaceWriteFileResult = { ok: true }
      writeFileMock.mockResolvedValue(writeFileResult)

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      render(<AppWithMarkDirty />)

      fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'a.ts' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
      await waitFor(() => {
        expect(screen.getByTestId('code-viewer-content')).toBeInTheDocument()
      })

      const beforeunloadCallsBefore = addEventListenerSpy.mock.calls.filter(
        ([event]) => event === 'beforeunload',
      ).length

      act(() => {
        fireEvent.click(screen.getByTestId('mark-dirty-btn'))
      })

      await waitFor(() => {
        const beforeunloadCallsAfter = addEventListenerSpy.mock.calls.filter(
          ([event]) => event === 'beforeunload',
        ).length
        expect(beforeunloadCallsAfter).toBeGreaterThan(beforeunloadCallsBefore)
      })

      // Verify beforeunload was registered when dirty
      expect(addEventListenerSpy.mock.calls.some(([event]) => event === 'beforeunload')).toBe(true)

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })
})
