import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

type WorkspaceOpenDialogResult = {
  canceled: boolean
  selectedPath: string | null
  error?: string
}

type WorkspaceFileNode = {
  name: string
  relativePath: string
  kind: 'file' | 'directory'
  children?: WorkspaceFileNode[]
}

type WorkspaceIndexRequest = {
  rootPath: string
}

type WorkspaceIndexResult = {
  ok: boolean
  fileTree: WorkspaceFileNode[]
  error?: string
}

type WorkspacePreviewUnavailableReason = 'file_too_large' | 'binary_file'

type WorkspaceReadFileRequest = {
  rootPath: string
  relativePath: string
}

type WorkspaceReadFileResult = {
  ok: boolean
  content: string | null
  error?: string
  previewUnavailableReason?: WorkspacePreviewUnavailableReason
}

const WORKSPACE_INDEX_IGNORE_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
])

const MAX_FILE_PREVIEW_BYTES = 2 * 1024 * 1024

const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

function normalizeToWorkspaceRelativePath(absolutePath: string, rootPath: string) {
  return path.relative(rootPath, absolutePath).split(path.sep).join('/')
}

function isPathInsideWorkspace(rootPath: string, targetPath: string) {
  const relativePath = path.relative(rootPath, targetPath)
  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  )
}

function isLikelyBinaryContent(contentBuffer: Buffer) {
  return contentBuffer.includes(0)
}

function sortWorkspaceTree(nodes: WorkspaceFileNode[]): WorkspaceFileNode[] {
  const sorted: WorkspaceFileNode[] = [...nodes].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'directory' ? -1 : 1
    }
    return fileNameCollator.compare(left.name, right.name)
  })

  return sorted.map((node): WorkspaceFileNode => {
    if (node.kind === 'directory' && node.children) {
      return {
        ...node,
        children: sortWorkspaceTree(node.children),
      }
    }
    return node
  })
}

async function buildWorkspaceTree(
  rootPath: string,
  currentDirectory: string,
): Promise<WorkspaceFileNode[]> {
  const entries = await readdir(currentDirectory, { withFileTypes: true })
  const nodes: WorkspaceFileNode[] = []

  for (const entry of entries) {
    if (WORKSPACE_INDEX_IGNORE_NAMES.has(entry.name)) {
      continue
    }

    if (entry.isSymbolicLink()) {
      continue
    }

    const absolutePath = path.join(currentDirectory, entry.name)
    const relativePath = normalizeToWorkspaceRelativePath(absolutePath, rootPath)

    if (!relativePath || relativePath.startsWith('..')) {
      continue
    }

    if (entry.isDirectory()) {
      const children = await buildWorkspaceTree(rootPath, absolutePath)
      nodes.push({
        name: entry.name,
        relativePath,
        kind: 'directory',
        children,
      })
      continue
    }

    if (entry.isFile()) {
      nodes.push({
        name: entry.name,
        relativePath,
        kind: 'file',
      })
    }
  }

  return sortWorkspaceTree(nodes)
}

async function handleWorkspaceOpenDialog(): Promise<WorkspaceOpenDialogResult> {
  try {
    const targetWindow = win ?? BrowserWindow.getFocusedWindow() ?? null
    const dialogResult = targetWindow
      ? await dialog.showOpenDialog(targetWindow, {
          properties: ['openDirectory'],
        })
      : await dialog.showOpenDialog({
        properties: ['openDirectory'],
        })

    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return {
        canceled: true,
        selectedPath: null,
      }
    }

    return {
      canceled: false,
      selectedPath: dialogResult.filePaths[0],
    }
  } catch (error) {
    return {
      canceled: true,
      selectedPath: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function handleWorkspaceIndex(
  _event: IpcMainInvokeEvent,
  request: WorkspaceIndexRequest,
): Promise<WorkspaceIndexResult> {
  try {
    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        fileTree: [],
        error: 'rootPath is required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        fileTree: [],
        error: 'Selected workspace root is not a directory.',
      }
    }

    const fileTree = await buildWorkspaceTree(resolvedRootPath, resolvedRootPath)
    return {
      ok: true,
      fileTree,
    }
  } catch (error) {
    return {
      ok: false,
      fileTree: [],
      error: error instanceof Error ? error.message : 'Failed to index workspace',
    }
  }
}

async function handleWorkspaceReadFile(
  _event: IpcMainInvokeEvent,
  request: WorkspaceReadFileRequest,
): Promise<WorkspaceReadFileResult> {
  try {
    const rootPath = request?.rootPath
    const relativePath = request?.relativePath
    if (!rootPath || !relativePath) {
      return {
        ok: false,
        content: null,
        error: 'rootPath and relativePath are required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath = path.resolve(resolvedRootPath, relativePath)
    if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
      return {
        ok: false,
        content: null,
        error: 'Cannot read files outside the workspace root.',
      }
    }

    const targetStats = await stat(resolvedTargetPath)
    if (!targetStats.isFile()) {
      return {
        ok: false,
        content: null,
        error: 'Selected path is not a file.',
      }
    }

    if (targetStats.size > MAX_FILE_PREVIEW_BYTES) {
      return {
        ok: true,
        content: null,
        previewUnavailableReason: 'file_too_large',
      }
    }

    const contentBuffer = await readFile(resolvedTargetPath)
    if (isLikelyBinaryContent(contentBuffer)) {
      return {
        ok: true,
        content: null,
        previewUnavailableReason: 'binary_file',
      }
    }

    return {
      ok: true,
      content: contentBuffer.toString('utf8'),
    }
  } catch (error) {
    return {
      ok: false,
      content: null,
      error: error instanceof Error ? error.message : 'Failed to read file',
    }
  }
}

function registerIpcHandlers() {
  ipcMain.removeHandler('workspace:openDialog')
  ipcMain.removeHandler('workspace:index')
  ipcMain.removeHandler('workspace:readFile')
  ipcMain.handle('workspace:openDialog', handleWorkspaceOpenDialog)
  ipcMain.handle('workspace:index', handleWorkspaceIndex)
  ipcMain.handle('workspace:readFile', handleWorkspaceReadFile)
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})
