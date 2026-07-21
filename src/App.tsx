import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './App.css'
import { MAX_CLIPBOARD_CHARS } from './code-comments/comment-config'
import {
  buildCommentDisplayMaps,
} from './code-comments/comment-line-index'
import { CommentListModal } from './code-comments/comment-list-modal'
import { CommentEditorModal } from './code-comments/comment-editor-modal'
import { GlobalCommentsModal } from './code-comments/global-comments-modal'
import { ExportCommentsModal } from './code-comments/export-comments-modal'
import {
  CodeEditorPanel,
} from './code-editor/code-editor-panel'
import { FileTreePanel } from './file-tree/file-tree-panel'
import { ProjectSearchPanel } from './project-search/project-search-panel'
import {
  applyAppearanceThemeToRoot,
  loadAppearanceTheme,
  notifyAppearanceThemeChanged,
  resolveAppearanceTheme,
  saveAppearanceTheme,
  subscribeToAppearanceThemeMenuRequests,
  subscribeToSystemThemeChanges,
  type AppearanceTheme,
} from './appearance-theme'
import { SpecViewerPanel } from './spec-viewer/spec-viewer-panel'
import {
  formatRemoteWorkspaceSummaryPath,
  formatRemoteWorkspaceTooltip,
  formatWorkspaceSummaryPath,
} from './workspace/path-format'
import { RemoteConnectModal } from './workspace/remote-connect-modal'
import { useWorkspace } from './workspace/use-workspace'
import { WorkspaceSwitcher } from './workspace/workspace-switcher'
import {
  AddIcon,
  BackArrowIcon,
  CloseIcon,
  FinderIcon,
  ForwardArrowIcon,
  ItermIcon,
  OpenIcon,
  ViewIcon,
  VsCodeIcon,
} from './app-icons'
import {
  collectWorkspaceFilePaths,
  formatWorkspaceWatchMode,
  getRemoteRecoveryHint,
  isFatalRemoteErrorCode,
} from './app-shell-utils'
import { useCommentActions } from './hooks/use-comment-actions'
import { useExternalAppOpener } from './hooks/use-external-app-opener'
import { useHistoryNavigation } from './hooks/use-history-navigation'
import { usePaneResize } from './hooks/use-pane-resize'

type ContentTab = 'code' | 'spec'
type SidebarTab = 'files' | 'search'

function App() {
  const {
    workspaces,
    activeWorkspaceId,
    rootPath,
    workspaceKind,
    remoteProfile,
    remoteConnectionState,
    remoteErrorCode,
    fileTree,
    changedFiles,
    gitFileStatuses,
    activeFile,
    activeSpec,
    activeFileContent,
    activeFileImagePreview,
    activeFileGitLineMarkers,
    activeSpecContent,
    isIndexing,
    isReadingFile,
    isReadingSpec,
    readFileError,
    activeSpecReadError,
    previewUnavailableReason,
    selectionRange,
    expandedDirectories,
    comments,
    isReadingComments,
    isWritingComments,
    globalComments,
    isReadingGlobalComments,
    isWritingGlobalComments,
    loadingDirectories,
    watchModePreference,
    watchMode,
    isRemoteMounted,
    bannerMessage,
    openWorkspace,
    connectRemoteWorkspace,
    disconnectRemoteWorkspace,
    retryRemoteWorkspaceConnection,
    setActiveWorkspace,
    switchWorkspace,
    closeWorkspace,
    selectFile,
    canGoBack,
    canGoForward,
    goBackInHistory,
    goForwardInHistory,
    saveComments,
    saveGlobalComments,
    showBanner,
    setSelectionRange,
    setExpandedDirectories,
    loadDirectoryChildren,
    refreshFileTree,
    searchFiles,
    searchText,
    setWatchModePreference,
    clearBanner,
    externalChangeDetected,
    reloadExternalChange,
    dismissExternalChange,
    isDirty,
    createFile,
    createDirectory,
    deleteFile,
    deleteDirectory,
    renameFileOrDirectory,
  } = useWorkspace()
  const isActiveRemoteWorkspace = workspaceKind === 'remote'
  const displayPath = rootPath
    ? isActiveRemoteWorkspace && remoteProfile
      ? formatRemoteWorkspaceSummaryPath(remoteProfile.remoteRoot)
      : formatWorkspaceSummaryPath(rootPath)
    : 'No workspace selected'
  const activeWorkspaceFullRootPath =
    isActiveRemoteWorkspace && remoteProfile
      ? remoteProfile.remoteRoot
      : rootPath
  const workspacePathTitle = isActiveRemoteWorkspace && remoteProfile
    ? formatRemoteWorkspaceTooltip(
        remoteProfile.host,
        remoteProfile.remoteRoot,
        remoteProfile.user,
      )
    : rootPath ?? ''
  const [activeTab, setActiveTab] = useState<ContentTab>('code')
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('files')
  const [appearanceTheme, setAppearanceTheme] =
    useState<AppearanceTheme>(() => loadAppearanceTheme())
  const resolvedTheme = resolveAppearanceTheme(appearanceTheme)
  const workspaceLayoutRef = useRef<HTMLElement | null>(null)
  const workspaceFilePathSet = useMemo(
    () => collectWorkspaceFilePaths(fileTree),
    [fileTree],
  )
  const [isRemoteConnectModalOpen, setIsRemoteConnectModalOpen] = useState(false)
  const [isWorkspaceSummaryExpanded, setIsWorkspaceSummaryExpanded] =
    useState(false)

  const activeFileCommentDisplay = useMemo(
    () => buildCommentDisplayMaps(comments, activeFile, activeFileContent),
    [activeFile, activeFileContent, comments],
  )
  const activeFileGitLineMarkerMap = useMemo(
    () =>
      new Map(
        activeFileGitLineMarkers.map((marker) => [marker.line, marker.kind] as const),
      ),
    [activeFileGitLineMarkers],
  )
  const activeSpecCommentDisplay = useMemo(
    () => buildCommentDisplayMaps(comments, activeSpec, activeSpecContent),
    [activeSpec, activeSpecContent, comments],
  )

  // --- Pane resize hook ---
  const {
    activeResizeHandle,
    workspaceLayoutStyle,
    startResize,
  } = usePaneResize(workspaceLayoutRef)

  // --- Comment actions hook ---
  const commentActions = useCommentActions({
    activeWorkspaceId,
    activeWorkspaceFullRootPath,
    rootPath,
    activeSpec,
    activeSpecContent,
    comments,
    globalComments,
    showBanner,
    saveComments,
    saveGlobalComments,
  })

  // --- External app opener hook ---
  const externalApp = useExternalAppOpener({
    rootPath,
    workspaceKind,
    remoteProfile,
    activeWorkspaceId,
    showBanner,
    connectRemoteWorkspace,
    disconnectRemoteWorkspace,
    retryRemoteWorkspaceConnection,
    setWatchModePreference,
    onRemoteConnected: useCallback(() => {
      setIsRemoteConnectModalOpen(false)
    }, []),
  })

  // --- History navigation hook ---
  const historyNav = useHistoryNavigation({
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
  })

  // --- Derived state ---
  const isCommentsActionDisabled =
    !rootPath ||
    isReadingComments ||
    isWritingComments ||
    isReadingGlobalComments ||
    isWritingGlobalComments ||
    commentActions.isSavingGlobalCommentsModal ||
    commentActions.isExportingComments

  const canCloseWorkspace =
    activeWorkspaceId !== null && workspaces.some(({ id }) => id === activeWorkspaceId)
  const shouldShowRemoteBadge = isActiveRemoteWorkspace || isRemoteMounted
  const remoteConnectionLabel = remoteConnectionState ?? 'disconnected'
  const shouldShowRetryRemoteButton =
    isActiveRemoteWorkspace &&
    (remoteConnectionLabel === 'degraded' ||
      remoteConnectionLabel === 'disconnected')
  const isFatalRemoteFailure = isFatalRemoteErrorCode(remoteErrorCode)
  const remoteRecoveryHint = shouldShowRetryRemoteButton
    ? getRemoteRecoveryHint(remoteErrorCode)
    : null

  // --- Clear stale comment draft on file/workspace change ---
  const { clearCommentDraftIfStale } = commentActions
  useEffect(() => {
    clearCommentDraftIfStale(activeFile, activeWorkspaceId)
  }, [activeFile, activeWorkspaceId, clearCommentDraftIfStale])

  // --- Appearance theme ---
  useLayoutEffect(() => {
    applyAppearanceThemeToRoot(appearanceTheme)
  }, [appearanceTheme, resolvedTheme])

  useEffect(() => {
    if (appearanceTheme !== 'system') {
      return
    }
    return subscribeToSystemThemeChanges(() => {
      applyAppearanceThemeToRoot('system')
      // Force re-render so resolvedTheme updates for child components.
      setAppearanceTheme('system')
    })
  }, [appearanceTheme])

  const handleAppearanceThemeChange = useCallback((theme: AppearanceTheme) => {
    setAppearanceTheme(theme)
    saveAppearanceTheme(theme)
  }, [])

  useEffect(() => {
    return subscribeToAppearanceThemeMenuRequests((theme) => {
      handleAppearanceThemeChange(theme)
    })
  }, [handleAppearanceThemeChange])

  useEffect(() => {
    notifyAppearanceThemeChanged(appearanceTheme)
  }, [appearanceTheme])

  // --- Banner dismiss ---
  const handleDismissBanner = useCallback(() => {
    clearBanner()
  }, [clearBanner])

  // --- File tree CRUD ---
  const handleRequestCreateFile = useCallback(
    async (relativePath: string) => {
      await createFile(relativePath)
    },
    [createFile],
  )

  const handleRequestCreateDirectory = useCallback(
    async (relativePath: string) => {
      await createDirectory(relativePath)
    },
    [createDirectory],
  )

  const handleRequestDeleteFile = useCallback(
    async (relativePath: string) => {
      const fileName = relativePath.split('/').pop() ?? relativePath

      if (isDirty && activeFile === relativePath) {
        const proceedWithDirty = window.confirm(
          `"${fileName}" has unsaved changes. Delete anyway?`
        )
        if (!proceedWithDirty) return
      }

      const confirmed = window.confirm(
        `Delete file "${fileName}"?\n\nThis action cannot be undone.`
      )
      if (!confirmed) return

      await deleteFile(relativePath)
    },
    [deleteFile, isDirty, activeFile],
  )

  const handleRequestDeleteDirectory = useCallback(
    async (relativePath: string) => {
      const dirName = relativePath.split('/').pop() ?? relativePath

      const activeFileIsInside = activeFile?.startsWith(relativePath + '/') ?? false
      if (isDirty && activeFileIsInside) {
        const proceedWithDirty = window.confirm(
          `The currently open file has unsaved changes. Delete directory "${dirName}" anyway?`
        )
        if (!proceedWithDirty) return
      }

      const confirmed = window.confirm(
        `Delete directory "${dirName}" and all its contents?\n\nThis action cannot be undone.`
      )
      if (!confirmed) return

      await deleteDirectory(relativePath)
    },
    [deleteDirectory, isDirty, activeFile],
  )

  const handleRequestRename = useCallback(
    async (oldRelativePath: string, newRelativePath: string) => {
      await renameFileOrDirectory(oldRelativePath, newRelativePath)
    },
    [renameFileOrDirectory],
  )

  const handleRequestCopyToClipboard = useCallback(
    (entries: { relativePath: string; kind: 'file' | 'directory' }[]) => {
      if (!rootPath) return
      void window.workspace.setFileClipboard(rootPath, entries)
    },
    [rootPath],
  )

  const handleRequestPasteFromClipboard = useCallback(
    async (destDir: string) => {
      if (!rootPath) return
      const isRemote = workspaceKind === 'remote'
      const result = await window.workspace.pasteFromClipboard(rootPath, destDir, isRemote)
      if (!result.ok) {
        showBanner(result.error ?? 'Failed to paste files.')
      }
    },
    [rootPath, showBanner, workspaceKind],
  )

  const handleOpenSearchResult = useCallback(
    (target: { relativePath: string; lineNumber: number }) => {
      setActiveTab('code')
      selectFile(target.relativePath)
      setSelectionRange({
        startLine: target.lineNumber,
        endLine: target.lineNumber,
      })
      historyNav.queueCodeViewerJumpRequest({
        targetRelativePath: target.relativePath,
        lineNumber: target.lineNumber,
        shouldHighlight: true,
      })
    },
    [historyNav, selectFile, setSelectionRange],
  )

  return (
    <main className="app-shell" data-appearance-theme={appearanceTheme}>
      <header className="app-header">
        <div className="app-header-left" data-testid="app-header-left">
          <h1>SDD Workbench</h1>
          <div
            className="header-history-actions"
            data-testid="header-history-actions"
          >
            <button
              aria-label="Back"
              className="workspace-open-in-button"
              disabled={!canGoBack}
              onClick={() => historyNav.navigateHistory('back')}
              title="Back"
              type="button"
            >
              <BackArrowIcon />
            </button>
            <button
              aria-label="Forward"
              className="workspace-open-in-button"
              disabled={!canGoForward}
              onClick={() => historyNav.navigateHistory('forward')}
              title="Forward"
              type="button"
            >
              <ForwardArrowIcon />
            </button>
          </div>
          <div className="content-tab-bar" data-testid="content-tab-bar">
            <button
              className={`content-tab-button${activeTab === 'code' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('code')}
              type="button"
            >
              Code
            </button>
            <button
              className={`content-tab-button${activeTab === 'spec' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('spec')}
              type="button"
            >
              Spec
            </button>
          </div>
        </div>
        <div className="app-header-actions" data-testid="app-header-actions">
          <div className="header-comments-group" data-testid="header-comments-group">
            <span className="header-action-group-label">Code comments</span>
            <div className="header-comments-actions" data-testid="header-comments-actions">
              <button
                aria-label="Add Global Comments"
                className="header-action-button"
                disabled={isCommentsActionDisabled}
                onClick={() => {
                  if (!activeWorkspaceId) {
                    return
                  }
                  commentActions.setGlobalCommentsModalState({
                    workspaceId: activeWorkspaceId,
                    initialValue: globalComments,
                  })
                }}
                title="Add Global Comments"
                type="button"
              >
                <span aria-hidden="true" className="header-action-icon">
                  <AddIcon />
                </span>
                <span className="header-action-label">+ Global</span>
              </button>
              <button
                aria-label="View Comments"
                className="header-action-button"
                disabled={isCommentsActionDisabled}
                onClick={() => {
                  commentActions.setIsViewCommentsModalOpen(true)
                }}
                title="View Comments"
                type="button"
              >
                <span aria-hidden="true" className="header-action-icon">
                  <ViewIcon />
                </span>
                <span className="header-action-label">View</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {externalChangeDetected && (
        <div className="text-banner" data-testid="external-change-banner" role="alert">
          <span>File changed on disk. Reload?</span>
          <div>
            <button onClick={reloadExternalChange} type="button">Reload</button>
            <button onClick={dismissExternalChange} type="button">Dismiss</button>
          </div>
        </div>
      )}

      {!externalChangeDetected && bannerMessage && (
        <div className="text-banner" role="alert">
          <span>{bannerMessage}</span>
          <button onClick={handleDismissBanner}>Dismiss</button>
        </div>
      )}

      <section
        className="workspace-layout"
        ref={workspaceLayoutRef}
        style={workspaceLayoutStyle}
      >
        <div className="pane-slot">
          <section className="file-panel" data-testid="file-panel">
            <div className="sidebar-workspace-group" data-testid="sidebar-workspace-group">
              <div className="sidebar-workspace-controls">
                <WorkspaceSwitcher
                  activeWorkspaceId={activeWorkspaceId}
                  onCloseWorkspace={closeWorkspace}
                  onSelectWorkspace={setActiveWorkspace}
                  workspaces={workspaces}
                />
                <div className="sidebar-workspace-actions" data-testid="sidebar-workspace-actions">
                  <button
                    aria-label="Open Workspace"
                    className="workspace-open-in-button"
                    onClick={() => void openWorkspace()}
                    title="Open Workspace"
                    type="button"
                  >
                    <OpenIcon />
                  </button>
                  <button
                    aria-label="Connect Remote Workspace"
                    className="workspace-connect-remote-button"
                    data-testid="workspace-connect-remote-button"
                    onClick={() => {
                      setIsRemoteConnectModalOpen(true)
                    }}
                    title="Connect Remote Workspace"
                    type="button"
                  >
                    Remote
                  </button>
                  <button
                    aria-label="Close Workspace"
                    className="workspace-open-in-button"
                    disabled={!canCloseWorkspace}
                    onClick={() => {
                      if (!activeWorkspaceId) {
                        return
                      }
                      closeWorkspace(activeWorkspaceId)
                    }}
                    title="Close Workspace"
                    type="button"
                  >
                    <CloseIcon />
                  </button>
                </div>
              </div>
            </div>
            <div
              className={`workspace-summary ${isWorkspaceSummaryExpanded ? '' : 'workspace-summary-collapsed'}`}
            >
              <div className="workspace-summary-header">
                <p className="label">Current Workspace</p>
                <button
                  className="workspace-summary-toggle"
                  onClick={() => {
                    setIsWorkspaceSummaryExpanded((previous) => !previous)
                  }}
                  type="button"
                >
                  {isWorkspaceSummaryExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
              <p
                className="path workspace-summary-path"
                data-testid="workspace-path"
                title={workspacePathTitle}
              >
                {displayPath}
              </p>
              <div className="workspace-watch-status">
                <span className="workspace-watch-status-label">Mode:</span>
                <span
                  className="workspace-watch-status-value"
                  data-testid="workspace-watch-mode-value"
                >
                  {formatWorkspaceWatchMode(watchMode)}
                </span>
                {shouldShowRemoteBadge && (
                  <span
                    className="workspace-remote-badge"
                    data-testid="workspace-remote-badge"
                  >
                    REMOTE
                  </span>
                )}
                {shouldShowRetryRemoteButton ? (
                  <button
                    className={`workspace-remote-connection-state workspace-remote-connection-state-action workspace-remote-connection-state-${remoteConnectionLabel}`}
                    data-testid="workspace-remote-connection-state"
                    disabled={externalApp.isRetryingRemoteWorkspace || externalApp.isConnectingRemoteWorkspace}
                    onClick={() => {
                      void externalApp.handleRetryRemoteWorkspaceConnection()
                    }}
                    title={isFatalRemoteFailure ? 'Reconnect' : 'Retry Connect'}
                    type="button"
                  >
                    {remoteConnectionLabel}
                  </button>
                ) : isActiveRemoteWorkspace ? (
                  <span
                    className={`workspace-remote-connection-state workspace-remote-connection-state-${remoteConnectionLabel}`}
                    data-testid="workspace-remote-connection-state"
                  >
                    {remoteConnectionLabel}
                  </span>
                ) : null}
              </div>
              {isWorkspaceSummaryExpanded && (
                <>
                  {isActiveRemoteWorkspace && remoteProfile && (
                    <p className="workspace-remote-target" data-testid="workspace-remote-target">
                      {remoteProfile.user ? `${remoteProfile.user}@` : ''}
                      {remoteProfile.host}:{remoteProfile.remoteRoot}
                    </p>
                  )}
                  {isActiveRemoteWorkspace && remoteErrorCode && (
                    <p
                      className="workspace-remote-error-code"
                      data-testid="workspace-remote-error-code"
                    >
                      Last error: {remoteErrorCode}
                    </p>
                  )}
                  {isActiveRemoteWorkspace && remoteRecoveryHint && (
                    <p
                      className="workspace-remote-retry-hint"
                      data-testid="workspace-remote-retry-hint"
                    >
                      {remoteRecoveryHint}
                    </p>
                  )}
                  <div className="workspace-watch-preference">
                    <label
                      className="workspace-watch-preference-label"
                      htmlFor="workspace-watch-preference-select"
                    >
                      Watch Mode
                    </label>
                    <select
                      className="workspace-watch-preference-select"
                      data-testid="workspace-watch-mode-preference"
                      disabled={!rootPath}
                      id="workspace-watch-preference-select"
                      onChange={externalApp.handleWatchModePreferenceChange}
                      value={watchModePreference}
                    >
                      <option value="auto">Auto</option>
                      <option value="native">Native</option>
                      <option value="polling">Polling</option>
                    </select>
                  </div>
                  {shouldShowRetryRemoteButton && (
                    <button
                      className="workspace-remote-retry-button"
                      data-testid="workspace-remote-retry-button"
                      disabled={externalApp.isRetryingRemoteWorkspace || externalApp.isConnectingRemoteWorkspace}
                      onClick={() => {
                        void externalApp.handleRetryRemoteWorkspaceConnection()
                      }}
                      type="button"
                    >
                      {externalApp.isRetryingRemoteWorkspace
                        ? 'Retrying...'
                        : isFatalRemoteFailure
                          ? 'Reconnect'
                          : 'Retry Connect'}
                    </button>
                  )}
                  {isActiveRemoteWorkspace && remoteConnectionLabel !== 'disconnected' && (
                    <button
                      className="workspace-remote-disconnect-button"
                      onClick={() => {
                        void externalApp.handleDisconnectRemoteWorkspace()
                      }}
                      type="button"
                    >
                      Disconnect Remote
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="workspace-open-in">
              <span className="workspace-open-in-label">Open In:</span>
              <div className="workspace-open-in-actions">
                <button
                  aria-label="Open in iTerm"
                  className="workspace-open-in-button"
                  data-testid="workspace-open-in-iterm"
                  disabled={!rootPath}
                  onClick={() => void externalApp.openWorkspaceInExternalApp('iterm')}
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
                  onClick={() => void externalApp.openWorkspaceInExternalApp('vscode')}
                  title="Open in VSCode"
                  type="button"
                >
                  <VsCodeIcon />
                </button>
                <button
                  aria-label="Open in Finder"
                  className="workspace-open-in-button"
                  data-testid="workspace-open-in-finder"
                  disabled={!rootPath}
                  onClick={() => void externalApp.openWorkspaceInExternalApp('finder')}
                  title="Open in Finder"
                  type="button"
                >
                  <FinderIcon />
                </button>
              </div>
            </div>
            <div className="sidebar-panel-tabs" role="tablist" aria-label="Sidebar panels">
              <button
                aria-selected={activeSidebarTab === 'files'}
                className={`sidebar-panel-tab${activeSidebarTab === 'files' ? ' is-active' : ''}`}
                onClick={() => setActiveSidebarTab('files')}
                role="tab"
                type="button"
              >
                Files
              </button>
              <button
                aria-selected={activeSidebarTab === 'search'}
                className={`sidebar-panel-tab${activeSidebarTab === 'search' ? ' is-active' : ''}`}
                onClick={() => setActiveSidebarTab('search')}
                role="tab"
                type="button"
              >
                Search
              </button>
            </div>
            {activeSidebarTab === 'files' ? (
              <FileTreePanel
                activeFile={activeFile}
                expandedDirectories={expandedDirectories}
                fileTree={fileTree}
                changedFiles={changedFiles}
                gitFileStatuses={gitFileStatuses}
                loadingDirectories={loadingDirectories}
                isIndexing={isIndexing}
                onExpandedDirectoriesChange={setExpandedDirectories}
                onRequestCopyFullPath={commentActions.handleCopyFullPath}
                onRequestCopyRelativePath={commentActions.handleCopyRelativePath}
                onRequestLoadDirectory={loadDirectoryChildren}
                onSearchFiles={searchFiles}
                onSelectFile={historyNav.handleSelectFileFromTree}
                rootPath={rootPath}
                onRequestCreateFile={handleRequestCreateFile}
                onRequestCreateDirectory={handleRequestCreateDirectory}
                onRequestConfirmedDeleteFile={handleRequestDeleteFile}
                onRequestConfirmedDeleteDirectory={handleRequestDeleteDirectory}
                onRequestRename={handleRequestRename}
                onRequestCopyToClipboard={handleRequestCopyToClipboard}
                onRequestPasteFromClipboard={handleRequestPasteFromClipboard}
                onRequestRefresh={() => {
                  void refreshFileTree()
                }}
              />
            ) : (
              <ProjectSearchPanel
                onOpenSearchResult={handleOpenSearchResult}
                onSearchText={searchText}
                workspaceKey={activeWorkspaceId}
              />
            )}
          </section>
        </div>

        <div
          aria-label="Resize sidebar and content panels"
          aria-orientation="vertical"
          className={`pane-resizer ${activeResizeHandle ? 'is-active' : ''}`}
          data-testid="pane-resizer-left"
          onPointerDown={(event) => startResize(event.clientX)}
          role="separator"
        />

        <div className="pane-slot">
          <div
            className={`content-pane-wrapper${activeTab !== 'code' ? ' is-hidden' : ''}`}
            data-history-navigation-scope="true"
            data-testid="content-pane-code"
          >
            <CodeEditorPanel
              activeFile={activeFile}
              activeFileContent={activeFileContent}
              activeFileImagePreview={activeFileImagePreview}
              appearanceTheme={resolvedTheme}
              commentLineEntries={activeFileCommentDisplay.entries}
              commentLineCounts={activeFileCommentDisplay.counts}
              gitLineMarkers={activeFileGitLineMarkerMap}
              isActive={activeTab === 'code'}
              isReadingFile={isReadingFile}
              jumpRequest={historyNav.codeViewerJumpRequest}
              onSelectRange={setSelectionRange}
              onRequestCopyBoth={commentActions.handleCopyBoth}
              onRequestCopyRelativePath={commentActions.handleCopyRelativePath}
              onRequestCopySelectedContent={commentActions.handleCopySelectedContent}
              onRequestAddComment={commentActions.handleRequestAddComment}
              onRequestEditComment={commentActions.handleRequestEditComment}
              onRequestDeleteComment={commentActions.handleRequestDeleteComment}
              onRequestEditInVsCode={externalApp.openActiveFileInVsCode}
              onRequestGoToSpec={historyNav.handleRequestGoToSpec}
              previewUnavailableReason={previewUnavailableReason}
              readFileError={readFileError}
              selectionRange={selectionRange}
              onScrollChange={historyNav.handleCodeScrollChange}
              restoredScrollTop={historyNav.restoredCodeScrollTop}
            />
          </div>
          <div
            className={`content-pane-wrapper${activeTab !== 'spec' ? ' is-hidden' : ''}`}
            data-history-navigation-scope="true"
            data-testid="content-pane-spec"
          >
            <section className="workspace-card spec-panel" data-testid="spec-panel">
              <SpecViewerPanel
                activeSpecPath={activeSpec}
                appearanceTheme={resolvedTheme}
                commentLineEntries={activeSpecCommentDisplay.entries}
                commentLineCounts={activeSpecCommentDisplay.counts}
                isActive={activeTab === 'spec'}
                isLoading={isReadingSpec}
                markdownContent={activeSpecContent}
                navigationRequest={historyNav.specViewerNavigationRequest}
                onScrollPositionChange={historyNav.handleSpecScrollPositionChange}
                onRequestAddComment={commentActions.handleRequestAddCommentFromSpec}
                onRequestEditComment={commentActions.handleRequestEditComment}
                onRequestDeleteComment={commentActions.handleRequestDeleteComment}
                onRequestCopyBoth={commentActions.handleCopyBoth}
                onRequestCopyRelativePath={commentActions.handleCopyRelativePath}
                onRequestCopySelectedContent={commentActions.handleCopySelectedContent}
                onRequestEditInVsCode={externalApp.openActiveFileInVsCode}
                onOpenCitationTarget={historyNav.openCitationTarget}
                onGoToSourceLine={historyNav.goToActiveSpecSourceLine}
                onOpenRelativePath={historyNav.openSpecRelativePath}
                readError={activeSpecReadError}
                restoredScrollTop={historyNav.restoredSpecScrollTop}
                workspaceRootPath={rootPath}
              />
            </section>
          </div>
        </div>
      </section>

      <RemoteConnectModal
        isOpen={isRemoteConnectModalOpen}
        isSubmitting={externalApp.isConnectingRemoteWorkspace}
        onBrowse={externalApp.handleBrowseRemoteDirectories}
        onClose={() => {
          if (!externalApp.isConnectingRemoteWorkspace) {
            setIsRemoteConnectModalOpen(false)
          }
        }}
        onSyncVsCodeSshConfig={externalApp.handleSyncVsCodeSshConfig}
        onSubmit={externalApp.handleSubmitRemoteConnect}
      />
      <CommentEditorModal
        isOpen={commentActions.commentDraftState !== null}
        isSaving={isWritingComments}
        initialBody={commentActions.commentDraftState?.initialBody ?? ''}
        mode={commentActions.commentDraftState?.mode ?? 'add'}
        onCancel={() => {
          if (!isWritingComments) {
            commentActions.dismissCommentDraft()
          }
        }}
        onSave={commentActions.handleSaveComment}
        relativePath={commentActions.commentDraftState?.relativePath ?? null}
        selectionRange={commentActions.commentDraftState?.selectionRange ?? null}
      />
      <CommentListModal
        comments={comments}
        globalComments={globalComments}
        isOpen={commentActions.isViewCommentsModalOpen}
        isSavingGlobalComments={isWritingGlobalComments}
        isSaving={isWritingComments}
        onClose={() => {
          if (!isWritingComments) {
            commentActions.setIsViewCommentsModalOpen(false)
          }
        }}
        onDeleteComment={commentActions.handleDeleteComment}
        onDeleteExportedComments={commentActions.handleDeleteExportedComments}
        onSaveGlobalComments={commentActions.handleSaveGlobalCommentsFromList}
        onUpdateComment={commentActions.handleUpdateComment}
        onRequestExport={commentActions.openRequestExport}
        onJumpToComment={(relativePath, startLine, endLine) => {
          commentActions.setIsViewCommentsModalOpen(false)
          if (!workspaceFilePathSet.has(relativePath)) {
            return
          }
          setActiveTab('code')
          selectFile(relativePath)
          setSelectionRange({ startLine, endLine })
          historyNav.queueCodeViewerJumpRequest({
            targetRelativePath: relativePath,
            lineNumber: startLine,
            shouldHighlight: true,
          })
        }}
      />
      <GlobalCommentsModal
        initialValue={commentActions.globalCommentsModalState?.initialValue ?? ''}
        isOpen={commentActions.globalCommentsModalState !== null}
        isSaving={commentActions.isSavingGlobalCommentsModal}
        suggestedDocumentPath={activeSpec}
        workspaceId={commentActions.globalCommentsModalState?.workspaceId ?? null}
        onCancel={() => {
          if (!commentActions.isSavingGlobalCommentsModal) {
            commentActions.setGlobalCommentsModalState(null)
          }
        }}
        onSave={commentActions.handleSaveGlobalComments}
      />
      <ExportCommentsModal
        commentCount={commentActions.exportSelectedCommentIds ? commentActions.exportSelectedCommentIds.length : comments.length}
        estimateBundleLength={commentActions.estimateBundleLength}
        exportedCommentCount={comments.filter((comment) => Boolean(comment.exportedAt)).length}
        hasGlobalComments={commentActions.effectiveExportHasGlobalComments}
        allowExportWithoutPendingComments={Boolean(commentActions.exportSelectedCommentIds) || commentActions.effectiveExportHasGlobalComments}
        isExporting={commentActions.isExportingComments}
        isOpen={commentActions.isExportModalOpen}
        maxClipboardChars={MAX_CLIPBOARD_CHARS}
        pendingCommentCount={commentActions.exportSelectedCommentIds
          ? comments.filter((c) => commentActions.exportSelectedCommentIds!.includes(c.id) && !c.exportedAt).length
          : commentActions.pendingComments.length}
        onCancel={commentActions.closeExportModal}
        onConfirm={commentActions.handleExportComments}
        onResetExportedComments={async () => {
          await commentActions.handleResetExportedComments()
        }}
      />
    </main>
  )
}

export default App
