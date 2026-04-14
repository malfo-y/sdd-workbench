import { Menu, app, BrowserWindow, ipcMain } from 'electron'
import { appendFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { RemoteConnectionService } from './remote-agent/connection-service'
import { loadRemoteReliabilityPolicy } from './remote-agent/reliability-policy'
import { redactRemoteErrorMessage } from './remote-agent/security'
import type { RemoteConnectionEvent } from './remote-agent/types'
import {
  APPEARANCE_THEME_CHANGED_CHANNEL,
  buildApplicationMenuTemplate,
  sendAppearanceThemeMenuRequest,
} from './appearance-menu'
import { createFileClipboardHandlers } from './file-clipboard'
import {
  DEFAULT_APPEARANCE_THEME,
  parseAppearanceTheme,
  type AppearanceTheme,
} from '../src/appearance-theme'
import {
  buildBrowserWindowStateOptions,
  captureWindowState,
  loadWindowState,
  saveWindowState,
} from './window-state'
import { IPC_CHANNELS } from './ipc-types'
import {
  REMOTE_AGENT_LOG_DIRECTORY_NAME,
  REMOTE_AGENT_LOG_FILE_NAME,
  runBackgroundTask,
  waitForWorkspaceWritesToSettle,
} from './workspace-utils'
import { initHandlersWin } from './workspace-ipc-handlers'
import {
  initWatchersWin,
  sendWorkspaceHistoryNavigationEvent,
  stopAllWorkspaceWatchers,
} from './workspace-watchers'
import {
  getWorkspaceBackendRouter,
  handleSystemOpenInFinder,
  handleSystemOpenInIterm,
  handleSystemOpenInVsCode,
  handleWorkspaceBrowseRemoteDirectories,
  handleWorkspaceConnectRemote,
  handleWorkspaceCreateDirectoryRouted,
  handleWorkspaceCreateFileRouted,
  handleWorkspaceDeleteDirectoryRouted,
  handleWorkspaceDeleteFileRouted,
  handleWorkspaceDisconnectRemote,
  handleWorkspaceExportCommentsBundleRouted,
  handleWorkspaceGetGitFileStatusesRouted,
  handleWorkspaceGetGitLineMarkersRouted,
  handleWorkspaceIndexDirectoryRouted,
  handleWorkspaceIndexRouted,
  handleWorkspaceOpenDialog,
  handleWorkspaceReadCommentsRouted,
  handleWorkspaceReadFileRouted,
  handleWorkspaceReadGlobalCommentsRouted,
  handleWorkspaceRenameRouted,
  handleWorkspaceSearchFilesRouted,
  handleWorkspaceSyncVsCodeSshConfig,
  handleWorkspaceWatchStartRouted,
  handleWorkspaceWatchStopRouted,
  handleWorkspaceWriteCommentsRouted,
  handleWorkspaceWriteFileRouted,
  handleWorkspaceWriteGlobalCommentsRouted,
  initRouting,
} from './workspace-ipc-routing'

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
let currentAppearanceTheme: AppearanceTheme = DEFAULT_APPEARANCE_THEME

const DEFAULT_WINDOW_WIDTH = 1440
const DEFAULT_WINDOW_HEIGHT = 900
const MIN_WINDOW_WIDTH = 1100
const MIN_WINDOW_HEIGHT = 720

let remoteAgentLogWriteQueue: Promise<void> = Promise.resolve()
const remoteReliabilityPolicy = loadRemoteReliabilityPolicy()
const remoteConnectionService = new RemoteConnectionService({
  emitEvent: sendWorkspaceRemoteConnectionEvent,
  policy: remoteReliabilityPolicy,
})
let hasRequestedQuitWatcherShutdown = false
const QUIT_WRITE_SETTLE_TIMEOUT_MS = 5000
const QUIT_WATCHER_SHUTDOWN_TIMEOUT_MS = 1500



function sendWorkspaceRemoteConnectionEvent(payload: RemoteConnectionEvent) {
  queueRemoteAgentLog({
    at: new Date().toISOString(),
    source: 'remoteConnectionEvent',
    workspaceId: payload.workspaceId,
    sessionId: payload.sessionId ?? null,
    state: payload.state,
    errorCode: payload.errorCode ?? null,
    message: sanitizeRemoteLogMessage(payload.message),
    occurredAt: payload.occurredAt,
  })
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('workspace:remoteConnectionEvent', payload)
}



function sanitizeRemoteLogMessage(message: string | undefined): string | null {
  if (!message || message.trim().length === 0) {
    return null
  }

  const sanitized = redactRemoteErrorMessage(message, '')
  return sanitized.length > 0 ? sanitized : null
}

function queueRemoteAgentLog(payload: Record<string, unknown>): void {
  remoteAgentLogWriteQueue = remoteAgentLogWriteQueue
    .then(async () => {
      const userDataDirectoryPath = app.getPath('userData')
      const logDirectoryPath = path.join(
        userDataDirectoryPath,
        REMOTE_AGENT_LOG_DIRECTORY_NAME,
      )
      const logFilePath = path.join(logDirectoryPath, REMOTE_AGENT_LOG_FILE_NAME)
      await mkdir(logDirectoryPath, { recursive: true })
      await appendFile(logFilePath, `${JSON.stringify(payload)}\n`, 'utf8')
    })
    .catch(() => undefined)
}


function registerIpcHandlers() {
  const clipboardHandlers = createFileClipboardHandlers(getWorkspaceBackendRouter())

  // Channel -> handler mapping table
  type IpcHandler = Parameters<typeof ipcMain.handle>[1]

  const handlerTable: Array<[string, IpcHandler]> = [
    [IPC_CHANNELS.WORKSPACE_OPEN_DIALOG, handleWorkspaceOpenDialog],
    [IPC_CHANNELS.WORKSPACE_INDEX, handleWorkspaceIndexRouted],
    [IPC_CHANNELS.WORKSPACE_INDEX_DIRECTORY, handleWorkspaceIndexDirectoryRouted],
    [IPC_CHANNELS.WORKSPACE_SEARCH_FILES, handleWorkspaceSearchFilesRouted],
    [IPC_CHANNELS.WORKSPACE_READ_FILE, handleWorkspaceReadFileRouted],
    [IPC_CHANNELS.WORKSPACE_WRITE_FILE, handleWorkspaceWriteFileRouted],
    [IPC_CHANNELS.WORKSPACE_CREATE_FILE, handleWorkspaceCreateFileRouted],
    [IPC_CHANNELS.WORKSPACE_CREATE_DIRECTORY, handleWorkspaceCreateDirectoryRouted],
    [IPC_CHANNELS.WORKSPACE_DELETE_FILE, handleWorkspaceDeleteFileRouted],
    [IPC_CHANNELS.WORKSPACE_DELETE_DIRECTORY, handleWorkspaceDeleteDirectoryRouted],
    [IPC_CHANNELS.WORKSPACE_RENAME, handleWorkspaceRenameRouted],
    [IPC_CHANNELS.WORKSPACE_GET_GIT_LINE_MARKERS, handleWorkspaceGetGitLineMarkersRouted],
    [IPC_CHANNELS.WORKSPACE_GET_GIT_FILE_STATUSES, handleWorkspaceGetGitFileStatusesRouted],
    [IPC_CHANNELS.WORKSPACE_READ_COMMENTS, handleWorkspaceReadCommentsRouted],
    [IPC_CHANNELS.WORKSPACE_WRITE_COMMENTS, handleWorkspaceWriteCommentsRouted],
    [IPC_CHANNELS.WORKSPACE_READ_GLOBAL_COMMENTS, handleWorkspaceReadGlobalCommentsRouted],
    [IPC_CHANNELS.WORKSPACE_WRITE_GLOBAL_COMMENTS, handleWorkspaceWriteGlobalCommentsRouted],
    [IPC_CHANNELS.WORKSPACE_EXPORT_COMMENTS_BUNDLE, handleWorkspaceExportCommentsBundleRouted],
    [IPC_CHANNELS.WORKSPACE_WATCH_START, handleWorkspaceWatchStartRouted],
    [IPC_CHANNELS.WORKSPACE_WATCH_STOP, handleWorkspaceWatchStopRouted],
    [IPC_CHANNELS.WORKSPACE_CONNECT_REMOTE, handleWorkspaceConnectRemote],
    [IPC_CHANNELS.WORKSPACE_SYNC_VSCODE_SSH_CONFIG, handleWorkspaceSyncVsCodeSshConfig],
    [IPC_CHANNELS.WORKSPACE_BROWSE_REMOTE_DIRECTORIES, handleWorkspaceBrowseRemoteDirectories],
    [IPC_CHANNELS.WORKSPACE_DISCONNECT_REMOTE, handleWorkspaceDisconnectRemote],
    [IPC_CHANNELS.SYSTEM_OPEN_IN_ITERM, handleSystemOpenInIterm],
    [IPC_CHANNELS.SYSTEM_OPEN_IN_VSCODE, handleSystemOpenInVsCode],
    [IPC_CHANNELS.SYSTEM_OPEN_IN_FINDER, handleSystemOpenInFinder],
    [IPC_CHANNELS.WORKSPACE_SET_FILE_CLIPBOARD, clipboardHandlers.handleSetFileClipboard],
    [IPC_CHANNELS.WORKSPACE_READ_FILE_CLIPBOARD, clipboardHandlers.handleReadFileClipboard],
    [IPC_CHANNELS.WORKSPACE_COPY_ENTRIES, clipboardHandlers.handleCopyEntries],
    [IPC_CHANNELS.WORKSPACE_PASTE_FROM_CLIPBOARD, clipboardHandlers.handlePasteFromClipboard],
  ]

  for (const [channel, handler] of handlerTable) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, handler)
  }

  ipcMain.removeAllListeners(APPEARANCE_THEME_CHANGED_CHANNEL)
  ipcMain.on(APPEARANCE_THEME_CHANGED_CHANNEL, (_event, payload: { theme?: string }) => {
    currentAppearanceTheme =
      parseAppearanceTheme(payload?.theme ?? null) ?? DEFAULT_APPEARANCE_THEME
    installApplicationMenu()
  })
}

function getAppearanceThemeTargetWindow(
  browserWindow?: BrowserWindow | null,
): BrowserWindow | null {
  if (browserWindow && !browserWindow.isDestroyed()) {
    return browserWindow
  }

  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow && !focusedWindow.isDestroyed()) {
    return focusedWindow
  }

  if (win && !win.isDestroyed()) {
    return win
  }

  return null
}

function installApplicationMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(
      buildApplicationMenuTemplate({
        currentTheme: currentAppearanceTheme,
        onSelectTheme: (theme, browserWindow) => {
          const targetWindow = getAppearanceThemeTargetWindow(browserWindow)
          if (!targetWindow) {
            return
          }
          sendAppearanceThemeMenuRequest(targetWindow, theme)
        },
      }),
    ),
  )
}

function createWindow() {
  const savedWindowState = loadWindowState(app.getPath('userData'), {
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
  })
  let saveWindowStateTimeout: ReturnType<typeof setTimeout> | null = null

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'sdd_icon.png'),
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    ...buildBrowserWindowStateOptions(savedWindowState),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (savedWindowState?.isMaximized) {
    win.maximize()
  }

  const flushWindowStateSave = () => {
    if (!win) {
      return
    }

    saveWindowState(app.getPath('userData'), captureWindowState(win))
  }

  const scheduleWindowStateSave = () => {
    if (saveWindowStateTimeout !== null) {
      clearTimeout(saveWindowStateTimeout)
    }

    saveWindowStateTimeout = setTimeout(() => {
      saveWindowStateTimeout = null
      flushWindowStateSave()
    }, 150)
  }

  win.on('move', scheduleWindowStateSave)
  win.on('resize', scheduleWindowStateSave)
  win.on('maximize', scheduleWindowStateSave)
  win.on('unmaximize', scheduleWindowStateSave)

  win.on('close', () => {
    if (saveWindowStateTimeout !== null) {
      clearTimeout(saveWindowStateTimeout)
      saveWindowStateTimeout = null
    }

    flushWindowStateSave()
  })

  win.on('closed', () => {
    if (saveWindowStateTimeout !== null) {
      clearTimeout(saveWindowStateTimeout)
      saveWindowStateTimeout = null
    }
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
  runBackgroundTask(stopAllWorkspaceWatchers(), 'stopAllWorkspaceWatchers')
  runBackgroundTask(
    getWorkspaceBackendRouter().clearRemoteWorkspaces(),
    'clearRemoteWorkspaces',
  )
  runBackgroundTask(remoteConnectionService.shutdown(), 'remoteConnectionService.shutdown')
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('before-quit', (event) => {
  if (hasRequestedQuitWatcherShutdown) {
    return
  }

  hasRequestedQuitWatcherShutdown = true
  event.preventDefault()
  void (async () => {
    const writesSettled = await waitForWorkspaceWritesToSettle(
      QUIT_WRITE_SETTLE_TIMEOUT_MS,
    )
    if (!writesSettled) {
      console.warn(
        `Timed out waiting for workspace writes to settle (${QUIT_WRITE_SETTLE_TIMEOUT_MS}ms).`,
      )
    }

    await Promise.race([
      Promise.all([
        stopAllWorkspaceWatchers(),
        getWorkspaceBackendRouter().clearRemoteWorkspaces(),
        remoteConnectionService.shutdown(),
      ]).then(() => undefined),
      new Promise<void>((resolve) => {
        setTimeout(resolve, QUIT_WATCHER_SHUTDOWN_TIMEOUT_MS)
      }),
    ])

    app.exit(0)
  })().catch((error) => {
    console.warn('before-quit cleanup failed.', error)
    app.exit(0)
  })
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  initHandlersWin(() => win)
  initWatchersWin(() => win)
  initRouting({
    remoteConnectionService,
    queueRemoteAgentLog,
    sanitizeRemoteLogMessage,
  })
  registerIpcHandlers()
  installApplicationMenu()
  createWindow()
})
