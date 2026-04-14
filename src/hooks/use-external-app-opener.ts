import { useCallback, useState, type ChangeEvent } from 'react'
import type { WorkspaceRemoteProfile, WorkspaceWatchModePreference } from '../workspace/workspace-model'

export type UseExternalAppOpenerParams = {
  rootPath: string | null
  workspaceKind: 'local' | 'remote' | null
  remoteProfile: WorkspaceRemoteProfile | null
  activeWorkspaceId: string | null
  showBanner: (message: string) => void
  connectRemoteWorkspace: (profile: WorkspaceRemoteProfile) => Promise<boolean>
  disconnectRemoteWorkspace: (workspaceId?: string) => Promise<boolean>
  retryRemoteWorkspaceConnection: (workspaceId?: string) => Promise<boolean>
  setWatchModePreference: (preference: WorkspaceWatchModePreference) => Promise<void>
  onRemoteConnected: () => void
}

export function useExternalAppOpener(params: UseExternalAppOpenerParams) {
  const {
    rootPath,
    workspaceKind,
    remoteProfile,
    activeWorkspaceId,
    showBanner,
    connectRemoteWorkspace,
    disconnectRemoteWorkspace,
    retryRemoteWorkspaceConnection,
    setWatchModePreference,
    onRemoteConnected,
  } = params

  const [isConnectingRemoteWorkspace, setIsConnectingRemoteWorkspace] = useState(false)
  const [isRetryingRemoteWorkspace, setIsRetryingRemoteWorkspace] = useState(false)

  const openWorkspaceInExternalApp = useCallback(
    async (target: 'iterm' | 'vscode' | 'finder', relativePath?: string) => {
      if (!rootPath) {
        return
      }

      const targetLabels: Record<typeof target, string> = {
        iterm: 'iTerm',
        vscode: 'VSCode',
        finder: 'Finder',
      }
      const targetLabel = targetLabels[target]
      const openRequest: SystemOpenInRequest = {
        rootPath,
        ...(relativePath ? { relativePath } : {}),
        workspaceKind: workspaceKind ?? 'local',
        ...(workspaceKind === 'remote' ? { remoteProfile } : {}),
      }
      try {
        let result: SystemOpenInResult
        if (target === 'iterm') {
          result = await window.workspace.openInIterm(openRequest)
        } else if (target === 'vscode') {
          result = await window.workspace.openInVsCode(openRequest)
        } else {
          result = await window.workspace.openInFinder(openRequest)
        }
        if (!result.ok) {
          showBanner(result.error ?? `Failed to open workspace in ${targetLabel}.`)
        }
      } catch {
        showBanner(`Failed to open workspace in ${targetLabel}.`)
      }
    },
    [remoteProfile, rootPath, showBanner, workspaceKind],
  )

  const openActiveFileInVsCode = useCallback(
    async (relativePath: string) => {
      await openWorkspaceInExternalApp('vscode', relativePath)
    },
    [openWorkspaceInExternalApp],
  )

  const handleWatchModePreferenceChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const preference = event.target.value as WorkspaceWatchModePreference
      if (
        preference !== 'auto' &&
        preference !== 'native' &&
        preference !== 'polling'
      ) {
        return
      }
      void setWatchModePreference(preference)
    },
    [setWatchModePreference],
  )

  const handleSubmitRemoteConnect = useCallback(
    async (profile: WorkspaceRemoteProfile) => {
      setIsConnectingRemoteWorkspace(true)
      try {
        const connected = await connectRemoteWorkspace(profile)
        if (connected) {
          onRemoteConnected()
        }
      } finally {
        setIsConnectingRemoteWorkspace(false)
      }
    },
    [connectRemoteWorkspace, onRemoteConnected],
  )

  const handleSyncVsCodeSshConfig = useCallback(
    async (
      request: WorkspaceSyncVsCodeSshConfigRequest,
    ): Promise<WorkspaceSyncVsCodeSshConfigResult> => {
      if (typeof window.workspace.syncVsCodeSshConfig !== 'function') {
        return {
          ok: false,
          error:
            'VSCode SSH config sync API is unavailable. Restart SDD Workbench to load latest preload/main changes.',
        }
      }

      try {
        return await window.workspace.syncVsCodeSshConfig(request)
      } catch {
        return {
          ok: false,
          error: 'Failed to update local SSH config for VSCode.',
        }
      }
    },
    [],
  )

  const handleBrowseRemoteDirectories = useCallback(
    async (
      request: WorkspaceRemoteDirectoryBrowseRequest,
    ): Promise<WorkspaceRemoteDirectoryBrowseResult> => {
      if (typeof window.workspace.browseRemoteDirectories !== 'function') {
        return {
          ok: false,
          currentPath: request.targetPath?.trim() ?? '',
          entries: [],
          truncated: false,
          errorCode: 'UNKNOWN',
          error:
            'Remote directory browse API is unavailable. Restart SDD Workbench to load latest preload/main changes.',
        }
      }

      try {
        return await window.workspace.browseRemoteDirectories(request)
      } catch {
        return {
          ok: false,
          currentPath: request.targetPath?.trim() ?? '',
          entries: [],
          truncated: false,
          errorCode: 'UNKNOWN',
          error: 'Failed to browse remote directories.',
        }
      }
    },
    [],
  )

  const handleDisconnectRemoteWorkspace = useCallback(async () => {
    if (!activeWorkspaceId) {
      return
    }
    await disconnectRemoteWorkspace(activeWorkspaceId)
  }, [activeWorkspaceId, disconnectRemoteWorkspace])

  const handleRetryRemoteWorkspaceConnection = useCallback(async () => {
    setIsRetryingRemoteWorkspace(true)
    try {
      await retryRemoteWorkspaceConnection(activeWorkspaceId ?? undefined)
    } finally {
      setIsRetryingRemoteWorkspace(false)
    }
  }, [activeWorkspaceId, retryRemoteWorkspaceConnection])

  return {
    isConnectingRemoteWorkspace,
    isRetryingRemoteWorkspace,
    openWorkspaceInExternalApp,
    openActiveFileInVsCode,
    handleWatchModePreferenceChange,
    handleSubmitRemoteConnect,
    handleSyncVsCodeSshConfig,
    handleBrowseRemoteDirectories,
    handleDisconnectRemoteWorkspace,
    handleRetryRemoteWorkspaceConnection,
  }
}
