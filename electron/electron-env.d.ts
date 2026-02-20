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
  error?: string
}

type WorkspacePreviewUnavailableReason = 'file_too_large' | 'binary_file'

interface WorkspaceReadFileResult {
  ok: boolean
  content: string | null
  error?: string
  previewUnavailableReason?: WorkspacePreviewUnavailableReason
}

interface Window {
  workspace: {
    openDialog: () => Promise<WorkspaceOpenDialogResult>
    index: (rootPath: string) => Promise<WorkspaceIndexResult>
    readFile: (
      rootPath: string,
      relativePath: string,
    ) => Promise<WorkspaceReadFileResult>
  }
}
