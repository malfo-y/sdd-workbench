import './App.css'
import { CodeViewerPanel } from './code-viewer/code-viewer-panel'
import { FileTreePanel } from './file-tree/file-tree-panel'
import { abbreviateWorkspacePath } from './workspace/path-format'
import { useWorkspace } from './workspace/use-workspace'
import { WorkspaceSwitcher } from './workspace/workspace-switcher'

function App() {
  const {
    workspaces,
    activeWorkspaceId,
    rootPath,
    fileTree,
    activeFile,
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

      <section className="workspace-layout">
        <FileTreePanel
          activeFile={activeFile}
          expandedDirectories={expandedDirectories}
          fileTree={fileTree}
          isIndexing={isIndexing}
          onExpandedDirectoriesChange={setExpandedDirectories}
          onSelectFile={selectFile}
          rootPath={rootPath}
        />

        <CodeViewerPanel
          activeFile={activeFile}
          activeFileContent={activeFileContent}
          isReadingFile={isReadingFile}
          onSelectRange={setSelectionRange}
          previewUnavailableReason={previewUnavailableReason}
          readFileError={readFileError}
          selectionRange={selectionRange}
        />

        <section className="workspace-card spec-placeholder">
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
          <p className="note">
            Right panel markdown rendering will be added in F04.
          </p>
          <p className="note">
            TODO: Replace this text banner with toast banner in a follow-up
            feature.
          </p>
        </section>
      </section>
    </main>
  )
}

export default App
