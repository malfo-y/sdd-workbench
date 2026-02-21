/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

interface WorkspaceOpenDialogResult {
  canceled: boolean
  selectedPath: string | null
  error?: string
}

interface WorkspaceFileNode {
  name: string
  relativePath: string
  kind: 'file' | 'directory'
  children?: WorkspaceFileNode[]
}

interface WorkspaceIndexResult {
  ok: boolean
  fileTree: WorkspaceFileNode[]
  truncated?: boolean
  error?: string
}

type WorkspacePreviewUnavailableReason =
  | 'file_too_large'
  | 'binary_file'
  | 'blocked_resource'

interface WorkspaceImagePreview {
  mimeType: string
  dataUrl: string
}

interface WorkspaceReadFileResult {
  ok: boolean
  content: string | null
  imagePreview?: WorkspaceImagePreview
  error?: string
  previewUnavailableReason?: WorkspacePreviewUnavailableReason
}

interface WorkspaceWatchControlResult {
  ok: boolean
  error?: string
}

interface WorkspaceWatchEvent {
  workspaceId: string
  changedRelativePaths: string[]
  hasStructureChanges?: boolean
}

type WorkspaceHistoryNavigationDirection = 'back' | 'forward'

type WorkspaceHistoryNavigationSource = 'app-command' | 'swipe'

interface WorkspaceHistoryNavigationEvent {
  direction: WorkspaceHistoryNavigationDirection
  source: WorkspaceHistoryNavigationSource
}

interface SystemOpenInResult {
  ok: boolean
  error?: string
}

interface Window {
  workspace: {
    openDialog: () => Promise<WorkspaceOpenDialogResult>
    index: (rootPath: string) => Promise<WorkspaceIndexResult>
    readFile: (
      rootPath: string,
      relativePath: string,
    ) => Promise<WorkspaceReadFileResult>
    watchStart: (
      workspaceId: string,
      rootPath: string,
    ) => Promise<WorkspaceWatchControlResult>
    watchStop: (workspaceId: string) => Promise<WorkspaceWatchControlResult>
    onWatchEvent: (
      listener: (event: WorkspaceWatchEvent) => void,
    ) => () => void
    onHistoryNavigate: (
      listener: (event: WorkspaceHistoryNavigationEvent) => void,
    ) => () => void
    openInIterm: (rootPath: string) => Promise<SystemOpenInResult>
    openInVsCode: (rootPath: string) => Promise<SystemOpenInResult>
  }
}
