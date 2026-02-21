import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import chokidar, { type FSWatcher } from 'chokidar'
import { execFile } from 'node:child_process'
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

type WorkspaceWatchStartRequest = {
  workspaceId: string
  rootPath: string
}

type WorkspaceWatchStopRequest = {
  workspaceId: string
}

type WorkspaceWatchControlResult = {
  ok: boolean
  error?: string
}

type WorkspaceWatchEventPayload = {
  workspaceId: string
  changedRelativePaths: string[]
  hasStructureChanges: boolean
}

type WorkspaceHistoryNavigationDirection = 'back' | 'forward'

type WorkspaceHistoryNavigationSource = 'app-command' | 'swipe'

type WorkspaceHistoryNavigationEventPayload = {
  direction: WorkspaceHistoryNavigationDirection
  source: WorkspaceHistoryNavigationSource
}

type SystemOpenInRequest = {
  rootPath: string
}

type SystemOpenInResult = {
  ok: boolean
  error?: string
}

type WorkspaceWatcherEntry = {
  workspaceId: string
  rootPath: string
  watcher: FSWatcher
  pendingRelativePaths: Set<string>
  hasPendingStructureChanges: boolean
  debounceTimer: ReturnType<typeof setTimeout> | null
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
const WATCH_EVENT_DEBOUNCE_MS = 300
const WATCHABLE_FILE_EVENTS = new Set(['add', 'change', 'unlink'])
const WATCHABLE_STRUCTURE_EVENTS = new Set(['add', 'unlink', 'addDir', 'unlinkDir'])

const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})
const workspaceWatchers = new Map<string, WorkspaceWatcherEntry>()

function normalizeToWorkspaceRelativePath(absolutePath: string, rootPath: string) {
  return path.relative(rootPath, absolutePath).split(path.sep).join('/')
}

function hasIgnoredWorkspaceSegment(relativePath: string) {
  const normalizedPath = relativePath.split(path.sep).join('/')
  return normalizedPath
    .split('/')
    .filter((segment) => segment.length > 0)
    .some((segment) => WORKSPACE_INDEX_IGNORE_NAMES.has(segment))
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

function shouldIgnoreWatchPath(rootPath: string, candidatePath: string) {
  const resolvedCandidatePath = path.resolve(candidatePath)
  const relativePath = path.relative(rootPath, resolvedCandidatePath)

  if (relativePath === '') {
    return false
  }

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return true
  }

  return hasIgnoredWorkspaceSegment(relativePath)
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

function openDirectoryWithApplication(
  applicationName: string,
  directoryPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'open',
      ['-a', applicationName, directoryPath],
      (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      },
    )
  })
}

async function handleSystemOpenInApplication(
  request: SystemOpenInRequest,
  applicationName: string,
): Promise<SystemOpenInResult> {
  try {
    if (process.platform !== 'darwin') {
      return {
        ok: false,
        error: 'Open in app is only supported on macOS.',
      }
    }

    const rootPath = request?.rootPath
    if (!rootPath) {
      return {
        ok: false,
        error: 'rootPath is required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        error: 'Selected workspace root is not a directory.',
      }
    }

    await openDirectoryWithApplication(applicationName, resolvedRootPath)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : `Failed to open workspace in ${applicationName}.`,
    }
  }
}

async function handleSystemOpenInIterm(
  _event: IpcMainInvokeEvent,
  request: SystemOpenInRequest,
): Promise<SystemOpenInResult> {
  return handleSystemOpenInApplication(request, 'iTerm')
}

async function handleSystemOpenInVsCode(
  _event: IpcMainInvokeEvent,
  request: SystemOpenInRequest,
): Promise<SystemOpenInResult> {
  return handleSystemOpenInApplication(request, 'Visual Studio Code')
}

function sendWorkspaceWatchEvent(payload: WorkspaceWatchEventPayload) {
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:watchEvent', payload)
}

function sendWorkspaceHistoryNavigationEvent(
  payload: WorkspaceHistoryNavigationEventPayload,
) {
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:historyNavigate', payload)
}

function flushWorkspaceWatchEvent(workspaceId: string) {
  const watchEntry = workspaceWatchers.get(workspaceId)
  if (!watchEntry) {
    return
  }

  watchEntry.debounceTimer = null
  if (
    watchEntry.pendingRelativePaths.size === 0 &&
    !watchEntry.hasPendingStructureChanges
  ) {
    return
  }

  const changedRelativePaths = Array.from(watchEntry.pendingRelativePaths).sort()
  const hasStructureChanges = watchEntry.hasPendingStructureChanges
  watchEntry.pendingRelativePaths.clear()
  watchEntry.hasPendingStructureChanges = false
  sendWorkspaceWatchEvent({
    workspaceId,
    changedRelativePaths,
    hasStructureChanges,
  })
}

function queueWorkspaceWatchEvent(
  workspaceId: string,
  eventName: string,
  targetPath: string,
) {
  const watchEntry = workspaceWatchers.get(workspaceId)
  if (!watchEntry) {
    return
  }

  const resolvedTargetPath = path.resolve(targetPath)
  if (!isPathInsideWorkspace(watchEntry.rootPath, resolvedTargetPath)) {
    return
  }

  if (shouldIgnoreWatchPath(watchEntry.rootPath, resolvedTargetPath)) {
    return
  }

  const relativePath = normalizeToWorkspaceRelativePath(
    resolvedTargetPath,
    watchEntry.rootPath,
  )
  if (!relativePath || relativePath.startsWith('..')) {
    return
  }

  if (WATCHABLE_FILE_EVENTS.has(eventName)) {
    watchEntry.pendingRelativePaths.add(relativePath)
  }
  if (WATCHABLE_STRUCTURE_EVENTS.has(eventName)) {
    watchEntry.hasPendingStructureChanges = true
  }
  if (watchEntry.debounceTimer !== null) {
    return
  }

  watchEntry.debounceTimer = setTimeout(() => {
    flushWorkspaceWatchEvent(workspaceId)
  }, WATCH_EVENT_DEBOUNCE_MS)
}

async function stopWorkspaceWatcher(workspaceId: string) {
  const watchEntry = workspaceWatchers.get(workspaceId)
  if (!watchEntry) {
    return
  }

  workspaceWatchers.delete(workspaceId)
  if (watchEntry.debounceTimer !== null) {
    clearTimeout(watchEntry.debounceTimer)
    watchEntry.debounceTimer = null
  }
  watchEntry.pendingRelativePaths.clear()
  watchEntry.hasPendingStructureChanges = false
  await watchEntry.watcher.close()
}

async function stopAllWorkspaceWatchers() {
  const workspaceIds = Array.from(workspaceWatchers.keys())
  await Promise.all(
    workspaceIds.map(async (workspaceId) => {
      try {
        await stopWorkspaceWatcher(workspaceId)
      } catch (error) {
        console.error(`Failed to stop watcher for workspace "${workspaceId}".`, error)
      }
    }),
  )
}

async function handleWorkspaceWatchStart(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWatchStartRequest,
): Promise<WorkspaceWatchControlResult> {
  try {
    const workspaceId = request?.workspaceId?.trim()
    const rootPath = request?.rootPath
    if (!workspaceId || !rootPath) {
      return {
        ok: false,
        error: 'workspaceId and rootPath are required.',
      }
    }

    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await stat(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        error: 'Selected workspace root is not a directory.',
      }
    }

    const existingWatchEntry = workspaceWatchers.get(workspaceId)
    if (existingWatchEntry?.rootPath === resolvedRootPath) {
      return { ok: true }
    }

    if (existingWatchEntry) {
      await stopWorkspaceWatcher(workspaceId)
    }

    const watcher = chokidar.watch(resolvedRootPath, {
      ignored: (candidatePath) =>
        shouldIgnoreWatchPath(resolvedRootPath, candidatePath),
      ignoreInitial: true,
      persistent: true,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 30,
      },
    })

    const watchEntry: WorkspaceWatcherEntry = {
      workspaceId,
      rootPath: resolvedRootPath,
      watcher,
      pendingRelativePaths: new Set(),
      hasPendingStructureChanges: false,
      debounceTimer: null,
    }
    workspaceWatchers.set(workspaceId, watchEntry)

    watcher.on('all', (eventName, candidatePath) => {
      if (
        !WATCHABLE_FILE_EVENTS.has(eventName) &&
        !WATCHABLE_STRUCTURE_EVENTS.has(eventName)
      ) {
        return
      }
      queueWorkspaceWatchEvent(workspaceId, eventName, candidatePath)
    })

    watcher.on('error', (error) => {
      console.error(`Workspace watcher error (${workspaceId}).`, error)
    })

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to start workspace watcher.',
    }
  }
}

async function handleWorkspaceWatchStop(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWatchStopRequest,
): Promise<WorkspaceWatchControlResult> {
  try {
    const workspaceId = request?.workspaceId?.trim()
    if (!workspaceId) {
      return {
        ok: false,
        error: 'workspaceId is required.',
      }
    }

    await stopWorkspaceWatcher(workspaceId)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to stop workspace watcher.',
    }
  }
}

function registerIpcHandlers() {
  ipcMain.removeHandler('workspace:openDialog')
  ipcMain.removeHandler('workspace:index')
  ipcMain.removeHandler('workspace:readFile')
  ipcMain.removeHandler('workspace:watchStart')
  ipcMain.removeHandler('workspace:watchStop')
  ipcMain.removeHandler('system:openInIterm')
  ipcMain.removeHandler('system:openInVsCode')
  ipcMain.handle('workspace:openDialog', handleWorkspaceOpenDialog)
  ipcMain.handle('workspace:index', handleWorkspaceIndex)
  ipcMain.handle('workspace:readFile', handleWorkspaceReadFile)
  ipcMain.handle('workspace:watchStart', handleWorkspaceWatchStart)
  ipcMain.handle('workspace:watchStop', handleWorkspaceWatchStop)
  ipcMain.handle('system:openInIterm', handleSystemOpenInIterm)
  ipcMain.handle('system:openInVsCode', handleSystemOpenInVsCode)
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.on('closed', () => {
    void stopAllWorkspaceWatchers()
    win = null
  })

  win.on('app-command', (event, command) => {
    if (command === 'browser-backward') {
      event.preventDefault()
      sendWorkspaceHistoryNavigationEvent({
        direction: 'back',
        source: 'app-command',
      })
      return
    }

    if (command === 'browser-forward') {
      event.preventDefault()
      sendWorkspaceHistoryNavigationEvent({
        direction: 'forward',
        source: 'app-command',
      })
    }
  })

  win.on('swipe', (event, direction) => {
    if (direction === 'right') {
      event.preventDefault()
      sendWorkspaceHistoryNavigationEvent({
        direction: 'back',
        source: 'swipe',
      })
      return
    }

    if (direction === 'left') {
      event.preventDefault()
      sendWorkspaceHistoryNavigationEvent({
        direction: 'forward',
        source: 'swipe',
      })
    }
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
  void stopAllWorkspaceWatchers()
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('before-quit', () => {
  void stopAllWorkspaceWatchers()
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
