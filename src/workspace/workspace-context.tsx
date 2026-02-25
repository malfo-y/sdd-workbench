import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addOrFocusWorkspace,
  canStepWorkspaceFileHistory,
  closeWorkspace as closeWorkspaceInState,
  createEmptyWorkspaceState,
  createWorkspaceId,
  getWorkspaceFileLastLine,
  listWorkspaces,
  mergeDirectoryChildren,
  pushWorkspaceFileHistory,
  setDirty,
  setWorkspaceSelectionRange as setWorkspaceSelectionRangeInModel,
  setActiveWorkspace as setActiveWorkspaceInState,
  switchActiveWorkspace as switchActiveWorkspaceInState,
  stepWorkspaceFileHistory,
  updateWorkspaceSession,
  type GitFileStatusKind,
  type LineSelectionRange,
  type WorkspaceId,
  type WorkspaceGitLineMarker,
  type WorkspaceWatchMode,
  type WorkspaceWatchModePreference,
  type WorkspaceState,
} from './workspace-model'
import {
  clearWorkspaceSessionSnapshot,
  createWorkspaceSessionSnapshot,
  loadWorkspaceSessionSnapshot,
  saveWorkspaceSessionSnapshot,
  type WorkspaceSessionSnapshot,
} from './workspace-persistence'
import { normalizeCodeComments } from '../code-comments/comment-persistence'
import { sortCodeComments, type CodeComment } from '../code-comments/comment-types'

type WorkspaceContextValue = {
  workspaceOrder: WorkspaceId[]
  workspaces: Array<{ id: WorkspaceId; rootPath: string }>
  activeWorkspaceId: WorkspaceId | null
  rootPath: string | null
  fileTree: WorkspaceFileNode[]
  changedFiles: string[]
  gitFileStatuses: Record<string, GitFileStatusKind>
  activeFile: string | null
  activeSpec: string | null
  activeFileContent: string | null
  activeFileImagePreview: WorkspaceImagePreview | null
  activeFileGitLineMarkers: WorkspaceGitLineMarker[]
  activeSpecContent: string | null
  isIndexing: boolean
  isReadingFile: boolean
  isReadingSpec: boolean
  readFileError: string | null
  activeSpecReadError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  expandedDirectories: string[]
  comments: CodeComment[]
  isReadingComments: boolean
  isWritingComments: boolean
  commentsError: string | null
  globalComments: string
  isReadingGlobalComments: boolean
  isWritingGlobalComments: boolean
  globalCommentsError: string | null
  loadingDirectories: string[]
  watchModePreference: WorkspaceWatchModePreference
  watchMode: WorkspaceWatchMode | null
  isRemoteMounted: boolean
  isDirty: boolean
  externalChangeDetected: boolean
  bannerMessage: string | null
  markFileDirty: () => void
  openWorkspace: () => Promise<void>
  setActiveWorkspace: (workspaceId: WorkspaceId) => void
  switchWorkspace: (workspaceId: WorkspaceId) => void
  closeWorkspace: (workspaceId: WorkspaceId) => void
  selectFile: (relativePath: string) => void
  canGoBack: boolean
  canGoForward: boolean
  goBackInHistory: () => void
  goForwardInHistory: () => void
  reloadComments: () => Promise<void>
  saveComments: (comments: CodeComment[]) => Promise<boolean>
  reloadGlobalComments: () => Promise<void>
  saveGlobalComments: (
    body: string,
    workspaceId?: WorkspaceId,
  ) => Promise<boolean>
  showBanner: (message: string) => void
  saveFile: (content: string) => Promise<boolean>
  setSelectionRange: (selectionRange: LineSelectionRange | null) => void
  setExpandedDirectories: (expandedDirectories: string[]) => void
  loadDirectoryChildren: (relativePath: string) => Promise<void>
  setWatchModePreference: (
    preference: WorkspaceWatchModePreference,
  ) => Promise<void>
  clearBanner: () => void
  reloadExternalChange: () => void
  dismissExternalChange: () => void
  createFile: (relativePath: string) => Promise<boolean>
  createDirectory: (relativePath: string) => Promise<boolean>
  deleteFile: (relativePath: string) => Promise<boolean>
  deleteDirectory: (relativePath: string) => Promise<boolean>
  renameFileOrDirectory: (oldRelativePath: string, newRelativePath: string) => Promise<boolean>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined,
)

type WorkspaceProviderProps = {
  children: ReactNode
}

type WorkspaceIndexStatus = 'success' | 'failed' | 'stale'
const WORKSPACE_INDEX_NODE_CAP = 10_000

function isMarkdownFile(relativePath: string) {
  return relativePath.toLowerCase().endsWith('.md')
}

function getSpecPreviewUnavailableMessage(
  reason: WorkspacePreviewUnavailableReason,
) {
  if (reason === 'file_too_large') {
    return 'Failed to render markdown preview: file exceeds 2MB limit.'
  }

  if (reason === 'blocked_resource') {
    return 'Failed to render markdown preview: blocked resource.'
  }

  return 'Failed to render markdown preview: binary file detected.'
}

function getWorkspaceIndexTruncationMessage() {
  return `Workspace index truncated at ${WORKSPACE_INDEX_NODE_CAP.toLocaleString()} nodes.`
}

function withoutChangedFileMarker(changedFiles: string[], relativePath: string) {
  if (!changedFiles.includes(relativePath)) {
    return changedFiles
  }
  return changedFiles.filter((path) => path !== relativePath)
}

function collectFileRelativePaths(
  nodes: WorkspaceFileNode[],
  output = new Set<string>(),
): Set<string> {
  for (const node of nodes) {
    if (node.kind === 'file') {
      output.add(node.relativePath)
      continue
    }

    if (node.children) {
      collectFileRelativePaths(node.children, output)
    }
  }

  return output
}

function isFilePathPotentiallyPresent(
  tree: WorkspaceFileNode[],
  filePath: string,
): boolean {
  for (const node of tree) {
    if (node.kind === 'file' && node.relativePath === filePath) {
      return true
    }

    if (
      node.kind === 'directory' &&
      filePath.startsWith(node.relativePath + '/')
    ) {
      if (node.childrenStatus === 'not-loaded') {
        return true
      }

      if (node.children) {
        if (isFilePathPotentiallyPresent(node.children, filePath)) {
          return true
        }
      }
    }
  }

  return false
}

function createWorkspaceStateFromSnapshot(
  snapshot: WorkspaceSessionSnapshot,
): WorkspaceState {
  let nextState = createEmptyWorkspaceState()

  for (const workspaceId of snapshot.workspaceOrder) {
    const persistedWorkspaceSession = snapshot.workspacesById[workspaceId]
    if (!persistedWorkspaceSession) {
      continue
    }

    const addResult = addOrFocusWorkspace(
      nextState,
      persistedWorkspaceSession.rootPath,
    )
      nextState = updateWorkspaceSession(
        addResult.state,
        addResult.workspaceId,
        (session) => ({
          ...session,
          activeFile: persistedWorkspaceSession.activeFile,
          activeSpec: persistedWorkspaceSession.activeSpec,
          expandedDirectories: persistedWorkspaceSession.expandedDirectories,
          fileLastLineByPath: persistedWorkspaceSession.fileLastLineByPath,
          watchModePreference: persistedWorkspaceSession.watchModePreference,
        }),
      )
  }

  if (
    snapshot.activeWorkspaceId !== null &&
    nextState.workspacesById[snapshot.activeWorkspaceId]
  ) {
    nextState = setActiveWorkspaceInState(nextState, snapshot.activeWorkspaceId)
  }

  return nextState
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaceState, setWorkspaceState] = useState(createEmptyWorkspaceState)
  const workspaceStateRef = useRef(workspaceState)
  workspaceStateRef.current = workspaceState

  const [bannerMessage, setBannerMessage] = useState<string | null>(null)
  const [externalChangeDetected, setExternalChangeDetected] = useState(false)
  const [hasHydratedSnapshot, setHasHydratedSnapshot] = useState(false)
  const indexRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readFileRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readGitLineMarkersRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const readGitFileStatusesRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const readSpecRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readCommentsRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>(
    {},
  )
  const writeCommentsRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const readGlobalCommentsRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const writeGlobalCommentsRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const watchedWorkspaceIdsRef = useRef<Set<WorkspaceId>>(new Set())

  const clearBanner = useCallback(() => {
    setBannerMessage(null)
  }, [])

  const showBanner = useCallback((message: string) => {
    setBannerMessage(message)
  }, [])

  const loadWorkspaceIndex = useCallback(
    async (
      workspaceId: WorkspaceId,
      rootPath: string,
      mode: 'reset' | 'refresh' = 'reset',
    ): Promise<WorkspaceIndexStatus> => {
      const requestId =
        (indexRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
      indexRequestIdByWorkspaceRef.current[workspaceId] = requestId

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...(mode === 'reset'
            ? {
                ...currentSession,
                isIndexing: true,
                fileTree: [],
                changedFiles: [],
                activeFile: null,
                activeSpec: null,
                activeFileContent: null,
                activeFileImagePreview: null,
                activeFileGitLineMarkers: [],
                gitFileStatuses: {},
                activeSpecContent: null,
                isReadingFile: false,
                isReadingSpec: false,
                readFileError: null,
                activeSpecReadError: null,
                previewUnavailableReason: null,
                selectionRange: null,
                expandedDirectories: [],
              }
            : {
                ...currentSession,
                isIndexing: true,
              }),
        })),
      )

      try {
        const indexResult = await window.workspace.index(rootPath)
        if (indexRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
          return 'stale'
        }

        if (!indexResult.ok) {
          setBannerMessage(
            indexResult.error
              ? `Failed to index workspace: ${indexResult.error}`
              : 'Failed to index workspace.',
          )
          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              isIndexing: false,
            })),
          )
          return 'failed'
        }

        const indexedFilePathSet = collectFileRelativePaths(indexResult.fileTree)
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => {
            if (mode === 'reset') {
              return {
                ...currentSession,
                fileTree: indexResult.fileTree,
                isIndexing: false,
              }
            }

            const activeFileStillExists =
              currentSession.activeFile !== null &&
              (indexedFilePathSet.has(currentSession.activeFile) ||
                isFilePathPotentiallyPresent(
                  indexResult.fileTree,
                  currentSession.activeFile,
                ))
            const activeSpecStillExists =
              currentSession.activeSpec !== null &&
              (indexedFilePathSet.has(currentSession.activeSpec) ||
                isFilePathPotentiallyPresent(
                  indexResult.fileTree,
                  currentSession.activeSpec,
                ))

            return {
              ...currentSession,
              fileTree: indexResult.fileTree,
              changedFiles: currentSession.changedFiles.filter((relativePath) =>
                indexedFilePathSet.has(relativePath),
              ),
              activeFile: activeFileStillExists ? currentSession.activeFile : null,
              activeSpec: activeSpecStillExists ? currentSession.activeSpec : null,
              activeFileContent: activeFileStillExists
                ? currentSession.activeFileContent
                : null,
              activeFileImagePreview: activeFileStillExists
                ? currentSession.activeFileImagePreview
                : null,
              activeFileGitLineMarkers: activeFileStillExists
                ? currentSession.activeFileGitLineMarkers
                : [],
              activeSpecContent: activeSpecStillExists
                ? currentSession.activeSpecContent
                : null,
              readFileError: activeFileStillExists
                ? currentSession.readFileError
                : null,
              activeSpecReadError: activeSpecStillExists
                ? currentSession.activeSpecReadError
                : null,
              previewUnavailableReason: activeFileStillExists
                ? currentSession.previewUnavailableReason
                : null,
              selectionRange: activeFileStillExists
                ? currentSession.selectionRange
                : null,
              isReadingFile: activeFileStillExists
                ? currentSession.isReadingFile
                : false,
              isReadingSpec: activeSpecStillExists
                ? currentSession.isReadingSpec
                : false,
              isIndexing: false,
            }
          }),
        )
        setBannerMessage(
          indexResult.truncated ? getWorkspaceIndexTruncationMessage() : null,
        )
        return 'success'
      } catch (error) {
        if (indexRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
          return 'stale'
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            isIndexing: false,
          })),
        )
        setBannerMessage(
          error instanceof Error
            ? `Failed to index workspace: ${error.message}`
            : 'Failed to index workspace.',
        )
        return 'failed'
      }
    },
    [],
  )

  const loadWorkspaceGitLineMarkers = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string, relativePath: string) => {
      const requestId =
        (readGitLineMarkersRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
      readGitLineMarkersRequestIdByWorkspaceRef.current[workspaceId] = requestId

      try {
        const markerResult = await window.workspace.getGitLineMarkers(
          rootPath,
          relativePath,
        )
        if (
          readGitLineMarkersRequestIdByWorkspaceRef.current[workspaceId] !== requestId
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => {
            if (currentSession.activeFile !== relativePath) {
              return currentSession
            }

            return {
              ...currentSession,
              activeFileGitLineMarkers: markerResult.ok ? markerResult.markers : [],
            }
          }),
        )
      } catch {
        if (
          readGitLineMarkersRequestIdByWorkspaceRef.current[workspaceId] !== requestId
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => {
            if (currentSession.activeFile !== relativePath) {
              return currentSession
            }

            return {
              ...currentSession,
              activeFileGitLineMarkers: [],
            }
          }),
        )
      }
    },
    [],
  )

  const loadWorkspaceGitFileStatuses = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string) => {
      const requestId =
        (readGitFileStatusesRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
      readGitFileStatusesRequestIdByWorkspaceRef.current[workspaceId] = requestId

      try {
        const statusResult = await window.workspace.getGitFileStatuses(rootPath)
        if (
          readGitFileStatusesRequestIdByWorkspaceRef.current[workspaceId] !== requestId
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            gitFileStatuses: statusResult.ok ? statusResult.statuses : {},
          })),
        )
      } catch {
        if (
          readGitFileStatusesRequestIdByWorkspaceRef.current[workspaceId] !== requestId
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            gitFileStatuses: {},
          })),
        )
      }
    },
    [],
  )

  const loadWorkspaceComments = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string) => {
      const requestId =
        (readCommentsRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
      readCommentsRequestIdByWorkspaceRef.current[workspaceId] = requestId

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...currentSession,
          isReadingComments: true,
          commentsError: null,
        })),
      )

      try {
        const readResult = await window.workspace.readComments(rootPath)
        if (readCommentsRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
          return false
        }

        if (!readResult.ok) {
          const errorMessage = readResult.error
            ? `Failed to load comments: ${readResult.error}`
            : 'Failed to load comments.'
          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              isReadingComments: false,
              commentsError: errorMessage,
            })),
          )
          setBannerMessage(errorMessage)
          return false
        }

        const normalizedCommentsResult = normalizeCodeComments(readResult.comments)
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            comments: normalizedCommentsResult.comments,
            isReadingComments: false,
            commentsError: normalizedCommentsResult.error,
          })),
        )
        if (normalizedCommentsResult.error) {
          setBannerMessage(
            `Comments loaded with warnings: ${normalizedCommentsResult.error}`,
          )
        }
        return true
      } catch (error) {
        if (readCommentsRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
          return false
        }
        const errorMessage =
          error instanceof Error
            ? `Failed to load comments: ${error.message}`
            : 'Failed to load comments.'
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            isReadingComments: false,
            commentsError: errorMessage,
          })),
        )
        setBannerMessage(errorMessage)
        return false
      }
    },
    [],
  )

  const loadWorkspaceGlobalComments = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string) => {
      const requestId =
        (readGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
      readGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId] = requestId

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...currentSession,
          isReadingGlobalComments: true,
          globalCommentsError: null,
        })),
      )

      try {
        const readResult = await window.workspace.readGlobalComments(rootPath)
        if (
          readGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId] !== requestId
        ) {
          return false
        }

        if (!readResult.ok) {
          const errorMessage = readResult.error
            ? `Failed to load global comments: ${readResult.error}`
            : 'Failed to load global comments.'
          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              isReadingGlobalComments: false,
              globalCommentsError: errorMessage,
            })),
          )
          setBannerMessage(errorMessage)
          return false
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            globalComments: readResult.body,
            isReadingGlobalComments: false,
            globalCommentsError: null,
          })),
        )
        return true
      } catch (error) {
        if (
          readGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId] !== requestId
        ) {
          return false
        }
        const errorMessage =
          error instanceof Error
            ? `Failed to load global comments: ${error.message}`
            : 'Failed to load global comments.'
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            isReadingGlobalComments: false,
            globalCommentsError: errorMessage,
          })),
        )
        setBannerMessage(errorMessage)
        return false
      }
    },
    [],
  )

  const saveComments = useCallback(async (nextComments: CodeComment[]) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    const sortedComments = sortCodeComments(nextComments)
    const requestId =
      (writeCommentsRequestIdByWorkspaceRef.current[activeWorkspaceId] ?? 0) + 1
    writeCommentsRequestIdByWorkspaceRef.current[activeWorkspaceId] = requestId

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
        ...currentSession,
        isWritingComments: true,
        commentsError: null,
      })),
    )

    try {
      const writeResult = await window.workspace.writeComments(
        workspaceSession.rootPath,
        sortedComments,
      )
      if (
        writeCommentsRequestIdByWorkspaceRef.current[activeWorkspaceId] !== requestId
      ) {
        return false
      }

      if (!writeResult.ok) {
        const errorMessage = writeResult.error
          ? `Failed to save comments: ${writeResult.error}`
          : 'Failed to save comments.'
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            isWritingComments: false,
            commentsError: errorMessage,
          })),
        )
        setBannerMessage(errorMessage)
        return false
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
          ...currentSession,
          comments: sortedComments,
          isWritingComments: false,
          commentsError: null,
        })),
      )
      return true
    } catch (error) {
      if (
        writeCommentsRequestIdByWorkspaceRef.current[activeWorkspaceId] !== requestId
      ) {
        return false
      }
      const errorMessage =
        error instanceof Error
          ? `Failed to save comments: ${error.message}`
          : 'Failed to save comments.'
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
          ...currentSession,
          isWritingComments: false,
          commentsError: errorMessage,
        })),
      )
      setBannerMessage(errorMessage)
      return false
    }
  }, [])

  const saveGlobalComments = useCallback(
    async (body: string, workspaceId?: WorkspaceId) => {
      const targetWorkspaceId =
        workspaceId ?? workspaceStateRef.current.activeWorkspaceId
      if (!targetWorkspaceId) {
        return false
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[targetWorkspaceId]
      if (!workspaceSession) {
        return false
      }

      const requestId =
        (writeGlobalCommentsRequestIdByWorkspaceRef.current[targetWorkspaceId] ?? 0) +
        1
      writeGlobalCommentsRequestIdByWorkspaceRef.current[targetWorkspaceId] =
        requestId

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
          ...currentSession,
          isWritingGlobalComments: true,
          globalCommentsError: null,
        })),
      )

      try {
        const writeResult = await window.workspace.writeGlobalComments(
          workspaceSession.rootPath,
          body,
        )
        if (
          writeGlobalCommentsRequestIdByWorkspaceRef.current[targetWorkspaceId] !==
          requestId
        ) {
          return false
        }

        if (!writeResult.ok) {
          const errorMessage = writeResult.error
            ? `Failed to save global comments: ${writeResult.error}`
            : 'Failed to save global comments.'
          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
              ...currentSession,
              isWritingGlobalComments: false,
              globalCommentsError: errorMessage,
            })),
          )
          setBannerMessage(errorMessage)
          return false
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
            ...currentSession,
            globalComments: body,
            isWritingGlobalComments: false,
            globalCommentsError: null,
          })),
        )
        return true
      } catch (error) {
        if (
          writeGlobalCommentsRequestIdByWorkspaceRef.current[targetWorkspaceId] !==
          requestId
        ) {
          return false
        }
        const errorMessage =
          error instanceof Error
            ? `Failed to save global comments: ${error.message}`
            : 'Failed to save global comments.'
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
            ...currentSession,
            isWritingGlobalComments: false,
            globalCommentsError: errorMessage,
          })),
        )
        setBannerMessage(errorMessage)
        return false
      }
    },
    [],
  )

  const reloadComments = useCallback(async () => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    await loadWorkspaceComments(activeWorkspaceId, workspaceSession.rootPath)
  }, [loadWorkspaceComments])

  const reloadGlobalComments = useCallback(async () => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    await loadWorkspaceGlobalComments(activeWorkspaceId, workspaceSession.rootPath)
  }, [loadWorkspaceGlobalComments])

  const saveFile = useCallback(async (content: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    const { rootPath, activeFile } = workspaceSession
    if (!activeFile) {
      return false
    }

    try {
      const writeResult = await window.workspace.writeFile(rootPath, activeFile, content)

      if (!writeResult.ok) {
        const errorMessage = writeResult.error
          ? `Failed to save file: ${writeResult.error}`
          : 'Failed to save file.'
        setBannerMessage(errorMessage)
        return false
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
          setDirty(currentSession, false),
        ),
      )
      void loadWorkspaceGitFileStatuses(activeWorkspaceId, rootPath)
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to save file: ${error.message}`
          : 'Failed to save file.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [loadWorkspaceGitFileStatuses])

  const startWorkspaceWatch = useCallback(
    async (
      workspaceId: WorkspaceId,
      rootPath: string,
      options?: {
        forceRestart?: boolean
        watchModePreference?: WorkspaceWatchModePreference
      },
    ) => {
      const forceRestart = options?.forceRestart ?? false
      const existingWorkspaceSession =
        workspaceStateRef.current.workspacesById[workspaceId]
      const watchModePreference =
        options?.watchModePreference ??
        existingWorkspaceSession?.watchModePreference ??
        'auto'

      if (watchedWorkspaceIdsRef.current.has(workspaceId) && !forceRestart) {
        return true
      }

      if (forceRestart && watchedWorkspaceIdsRef.current.has(workspaceId)) {
        watchedWorkspaceIdsRef.current.delete(workspaceId)
        try {
          await window.workspace.watchStop(workspaceId)
        } catch {
          // Restart should still proceed even if previous watcher cleanup fails.
        }
      }

      try {
        const watchStartResult = await window.workspace.watchStart(
          workspaceId,
          rootPath,
          watchModePreference,
        )
        if (!watchStartResult.ok) {
          setBannerMessage(
            watchStartResult.error
              ? `Failed to start watcher: ${watchStartResult.error}`
              : 'Failed to start watcher.',
          )
          return false
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            watchMode:
              watchStartResult.watchMode ?? currentSession.watchMode,
            isRemoteMounted:
              watchStartResult.isRemoteMounted ??
              currentSession.isRemoteMounted,
          })),
        )
        if (watchStartResult.fallbackApplied) {
          setBannerMessage(
            'Native watcher is unavailable for this workspace. Fallback to polling watcher is active.',
          )
        }
        watchedWorkspaceIdsRef.current.add(workspaceId)
        return true
      } catch (error) {
        setBannerMessage(
          error instanceof Error
            ? `Failed to start watcher: ${error.message}`
            : 'Failed to start watcher.',
        )
        return false
      }
    },
    [],
  )

  const stopWorkspaceWatch = useCallback(async (workspaceId: WorkspaceId) => {
    watchedWorkspaceIdsRef.current.delete(workspaceId)
    try {
      await window.workspace.watchStop(workspaceId)
    } catch {
      // Watcher cleanup is best-effort because workspace close should always proceed.
    }
  }, [])

  const openWorkspace = useCallback(async () => {
    try {
      const result = await window.workspace.openDialog()

      if (result.canceled) {
        setBannerMessage(
          result.error
            ? `Failed to open workspace: ${result.error}`
            : 'Workspace selection was canceled.',
        )
        return
      }

      if (!result.selectedPath) {
        setBannerMessage('No workspace path was selected.')
        return
      }

      const selectedPath = result.selectedPath
      const selectedWorkspaceId = createWorkspaceId(selectedPath)
      const isExistingWorkspace =
        workspaceStateRef.current.workspacesById[selectedWorkspaceId] !== undefined

      setWorkspaceState((previous) => {
        const addResult = addOrFocusWorkspace(previous, selectedPath)
        return addResult.state
      })

      if (isExistingWorkspace) {
        setBannerMessage(null)
        return
      }

      await startWorkspaceWatch(selectedWorkspaceId, selectedPath)
      const indexStatus = await loadWorkspaceIndex(selectedWorkspaceId, selectedPath)
      if (indexStatus === 'success') {
        void loadWorkspaceGitFileStatuses(selectedWorkspaceId, selectedPath)
      }
    } catch (error) {
      setBannerMessage(
        error instanceof Error
          ? `Failed to open workspace: ${error.message}`
          : 'Failed to open workspace.',
      )
    }
  }, [loadWorkspaceIndex, loadWorkspaceGitFileStatuses, startWorkspaceWatch])

  const getActiveIsDirty = useCallback(() => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    const session = activeWorkspaceId
      ? workspaceStateRef.current.workspacesById[activeWorkspaceId]
      : null
    return session?.isDirty ?? false
  }, [])

  const setActiveWorkspace = useCallback((workspaceId: WorkspaceId) => {
    if (
      getActiveIsDirty() &&
      !window.confirm('Unsaved changes will be lost. Continue?')
    ) {
      return
    }
    setWorkspaceState((previous) =>
      setActiveWorkspaceInState(previous, workspaceId),
    )
  }, [getActiveIsDirty])

  const switchWorkspace = useCallback((workspaceId: WorkspaceId) => {
    if (
      getActiveIsDirty() &&
      !window.confirm('Unsaved changes will be lost. Continue?')
    ) {
      return
    }
    setWorkspaceState((previous) =>
      switchActiveWorkspaceInState(previous, workspaceId),
    )
  }, [getActiveIsDirty])

  const closeWorkspace = useCallback((workspaceId: WorkspaceId) => {
    if (
      getActiveIsDirty() &&
      !window.confirm('Unsaved changes will be lost. Continue?')
    ) {
      return
    }
    delete indexRequestIdByWorkspaceRef.current[workspaceId]
    delete readFileRequestIdByWorkspaceRef.current[workspaceId]
    delete readGitLineMarkersRequestIdByWorkspaceRef.current[workspaceId]
    delete readSpecRequestIdByWorkspaceRef.current[workspaceId]
    delete readCommentsRequestIdByWorkspaceRef.current[workspaceId]
    delete writeCommentsRequestIdByWorkspaceRef.current[workspaceId]
    delete readGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId]
    delete writeGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId]
    void stopWorkspaceWatch(workspaceId)
    setWorkspaceState((previous) => closeWorkspaceInState(previous, workspaceId))
  }, [getActiveIsDirty, stopWorkspaceWatch])

  const loadWorkspaceSpec = useCallback(
    (workspaceId: WorkspaceId, relativePath: string) => {
      const workspaceSession = workspaceStateRef.current.workspacesById[workspaceId]
      if (!workspaceSession) {
        return
      }

      const requestId = (readSpecRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
      readSpecRequestIdByWorkspaceRef.current[workspaceId] = requestId

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...currentSession,
          activeSpec: relativePath,
          activeSpecContent: null,
          activeSpecReadError: null,
          isReadingSpec: true,
        })),
      )

      void (async () => {
        try {
          const readResult = await window.workspace.readFile(
            workspaceSession.rootPath,
            relativePath,
          )
          if (readSpecRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
            return
          }

          if (!readResult.ok) {
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                activeSpecContent: null,
                activeSpecReadError: readResult.error
                  ? `Failed to read file: ${readResult.error}`
                  : 'Failed to read file.',
                isReadingSpec: false,
              })),
            )
            return
          }

          if (readResult.previewUnavailableReason) {
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                activeSpecContent: null,
                activeSpecReadError: getSpecPreviewUnavailableMessage(
                  readResult.previewUnavailableReason ?? 'binary_file',
                ),
                isReadingSpec: false,
              })),
            )
            return
          }

          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              activeSpecContent: readResult.content ?? '',
              activeSpecReadError: null,
              isReadingSpec: false,
            })),
          )
        } catch (error) {
          if (readSpecRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
            return
          }

          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              activeSpecContent: null,
              activeSpecReadError:
                error instanceof Error
                  ? `Failed to read file: ${error.message}`
                  : 'Failed to read file.',
              isReadingSpec: false,
            })),
          )
        }
      })()
    },
    [],
  )

  const loadWorkspaceFile = useCallback(
    (
      workspaceId: WorkspaceId,
      relativePath: string,
      mode: 'select' | 'refresh',
      historyMode: 'push' | 'preserve' = 'push',
    ) => {
      const workspaceSession = workspaceStateRef.current.workspacesById[workspaceId]
      if (!workspaceSession) {
        return
      }

      const selectingMarkdown = isMarkdownFile(relativePath)
      const shouldUpdateSpec = selectingMarkdown && mode === 'select'
      const shouldRefreshSpec =
        selectingMarkdown && workspaceSession.activeSpec === relativePath
      const canReuseActiveSpecContent =
        mode === 'select' &&
        selectingMarkdown &&
        workspaceSession.activeSpec === relativePath &&
        workspaceSession.activeSpecContent !== null &&
        workspaceSession.activeSpecReadError === null &&
        workspaceSession.previewUnavailableReason === null

      if (canReuseActiveSpecContent) {
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => {
            const restoredLineNumber = getWorkspaceFileLastLine(
              currentSession,
              relativePath,
            )
            const leavingActiveFile =
              currentSession.activeFile !== null &&
              currentSession.activeFile !== relativePath
                ? currentSession.activeFile
                : null
            const activeSpecContent = currentSession.activeSpecContent ?? ''

            return {
              ...currentSession,
              ...(historyMode === 'push'
                ? pushWorkspaceFileHistory(currentSession, relativePath)
                : {}),
              changedFiles:
                leavingActiveFile === null
                  ? currentSession.changedFiles
                  : withoutChangedFileMarker(
                      currentSession.changedFiles,
                      leavingActiveFile,
                    ),
              activeFile: relativePath,
              activeSpec: relativePath,
              activeFileContent: activeSpecContent,
              activeFileImagePreview: null,
              activeFileGitLineMarkers: [],
              selectionRange:
                restoredLineNumber === null
                  ? null
                  : {
                      startLine: restoredLineNumber,
                      endLine: restoredLineNumber,
                    },
              readFileError: null,
              previewUnavailableReason: null,
              isReadingFile: false,
              activeSpecContent,
              activeSpecReadError: null,
              isReadingSpec: false,
              isDirty: false,
            }
          }),
        )
        void loadWorkspaceGitLineMarkers(
          workspaceId,
          workspaceSession.rootPath,
          relativePath,
        )
        return
      }

      const requestId = (readFileRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
      readFileRequestIdByWorkspaceRef.current[workspaceId] = requestId

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => {
          const restoredLineNumber =
            mode === 'select'
              ? getWorkspaceFileLastLine(currentSession, relativePath)
              : null
          const leavingActiveFile =
            mode === 'select' &&
            currentSession.activeFile !== null &&
            currentSession.activeFile !== relativePath
              ? currentSession.activeFile
              : null

          return {
            ...currentSession,
            ...(mode === 'select' && historyMode === 'push'
              ? pushWorkspaceFileHistory(currentSession, relativePath)
              : {}),
            changedFiles:
              leavingActiveFile === null
                ? currentSession.changedFiles
                : withoutChangedFileMarker(
                    currentSession.changedFiles,
                    leavingActiveFile,
                  ),
            activeFile: mode === 'select' ? relativePath : currentSession.activeFile,
            activeSpec: shouldUpdateSpec ? relativePath : currentSession.activeSpec,
            activeFileContent:
              mode === 'select' ? null : currentSession.activeFileContent,
            activeFileImagePreview:
              mode === 'select' ? null : currentSession.activeFileImagePreview,
            activeFileGitLineMarkers:
              mode === 'select' ? [] : currentSession.activeFileGitLineMarkers,
            selectionRange:
              mode === 'select'
                ? restoredLineNumber === null
                  ? null
                  : {
                      startLine: restoredLineNumber,
                      endLine: restoredLineNumber,
                    }
                : currentSession.selectionRange,
            readFileError: null,
            previewUnavailableReason: null,
            isReadingFile: true,
            activeSpecContent:
              shouldUpdateSpec ? null : currentSession.activeSpecContent,
            activeSpecReadError:
              shouldUpdateSpec || shouldRefreshSpec
                ? null
                : currentSession.activeSpecReadError,
            isReadingSpec:
              shouldUpdateSpec || shouldRefreshSpec
                ? true
                : currentSession.isReadingSpec,
            isDirty: mode === 'select' ? false : currentSession.isDirty,
          }
        }),
      )

      void (async () => {
        try {
          const readResult = await window.workspace.readFile(
            workspaceSession.rootPath,
            relativePath,
          )
          if (readFileRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
            return
          }

          if (!readResult.ok) {
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                readFileError: readResult.error
                  ? `Failed to read file: ${readResult.error}`
                  : 'Failed to read file.',
                activeFileGitLineMarkers: [],
                isReadingFile: false,
                activeSpecContent:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? null
                    : currentSession.activeSpecContent,
                activeSpecReadError:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? readResult.error
                      ? `Failed to read file: ${readResult.error}`
                      : 'Failed to read file.'
                    : currentSession.activeSpecReadError,
                isReadingSpec:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? false
                    : currentSession.isReadingSpec,
              })),
            )
            return
          }

          if (readResult.previewUnavailableReason) {
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                previewUnavailableReason: readResult.previewUnavailableReason ?? null,
                activeFileImagePreview: null,
                activeFileGitLineMarkers: [],
                isReadingFile: false,
                activeSpecContent:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? null
                    : currentSession.activeSpecContent,
                activeSpecReadError:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? getSpecPreviewUnavailableMessage(
                        readResult.previewUnavailableReason ?? 'binary_file',
                      )
                    : currentSession.activeSpecReadError,
                isReadingSpec:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? false
                    : currentSession.isReadingSpec,
              })),
            )
            return
          }

          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              activeFileContent: readResult.imagePreview
                ? null
                : readResult.content ?? '',
              activeFileImagePreview: readResult.imagePreview ?? null,
              activeFileGitLineMarkers: readResult.imagePreview
                ? []
                : currentSession.activeFileGitLineMarkers,
              selectionRange: readResult.imagePreview
                ? null
                : currentSession.selectionRange,
              isReadingFile: false,
              activeSpecContent:
                shouldUpdateSpec || shouldRefreshSpec
                  ? readResult.imagePreview
                    ? null
                    : readResult.content ?? ''
                  : currentSession.activeSpecContent,
              activeSpecReadError:
                shouldUpdateSpec || shouldRefreshSpec
                  ? null
                  : currentSession.activeSpecReadError,
              isReadingSpec:
                shouldUpdateSpec || shouldRefreshSpec
                  ? false
                  : currentSession.isReadingSpec,
            })),
          )
          if (!readResult.imagePreview) {
            void loadWorkspaceGitLineMarkers(
              workspaceId,
              workspaceSession.rootPath,
              relativePath,
            )
          }
        } catch (error) {
          if (readFileRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
            return
          }

          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              readFileError:
                error instanceof Error
                  ? `Failed to read file: ${error.message}`
                  : 'Failed to read file.',
              activeFileGitLineMarkers: [],
              isReadingFile: false,
              activeSpecContent:
                shouldUpdateSpec || shouldRefreshSpec
                  ? null
                  : currentSession.activeSpecContent,
              activeSpecReadError:
                shouldUpdateSpec || shouldRefreshSpec
                  ? error instanceof Error
                    ? `Failed to read file: ${error.message}`
                    : 'Failed to read file.'
                  : currentSession.activeSpecReadError,
              isReadingSpec:
                shouldUpdateSpec || shouldRefreshSpec
                  ? false
                  : currentSession.isReadingSpec,
            })),
          )
        }
      })()
    },
    [loadWorkspaceGitLineMarkers],
  )

  const reloadExternalChange = useCallback(() => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    const { activeFile } = workspaceSession
    if (!activeFile) {
      return
    }

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
        setDirty(currentSession, false),
      ),
    )
    setExternalChangeDetected(false)
    loadWorkspaceFile(activeWorkspaceId, activeFile, 'refresh')
  }, [loadWorkspaceFile])

  const dismissExternalChange = useCallback(() => {
    setExternalChangeDetected(false)
  }, [])

  const markFileDirty = useCallback(() => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
        setDirty(currentSession, true),
      ),
    )
  }, [])

  const selectActiveWorkspaceFile = useCallback(
    (relativePath: string, historyMode: 'push' | 'preserve') => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }
      loadWorkspaceFile(activeWorkspaceId, relativePath, 'select', historyMode)
    },
    [loadWorkspaceFile],
  )

  const selectFile = useCallback(
    (relativePath: string) => {
      if (
        getActiveIsDirty() &&
        !window.confirm('Unsaved changes will be lost. Continue?')
      ) {
        return
      }
      selectActiveWorkspaceFile(relativePath, 'push')
    },
    [getActiveIsDirty, selectActiveWorkspaceFile],
  )

  const createFile = useCallback(async (relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    const { rootPath } = workspaceSession

    try {
      const createResult = await window.workspace.createFile(rootPath, relativePath)

      if (!createResult.ok) {
        const errorMessage = createResult.error
          ? `Failed to create file: ${createResult.error}`
          : 'Failed to create file.'
        setBannerMessage(errorMessage)
        return false
      }

      selectFile(relativePath)
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to create file: ${error.message}`
          : 'Failed to create file.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [selectFile])

  const createDirectory = useCallback(async (relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    const { rootPath } = workspaceSession

    try {
      const createResult = await window.workspace.createDirectory(rootPath, relativePath)

      if (!createResult.ok) {
        const errorMessage = createResult.error
          ? `Failed to create directory: ${createResult.error}`
          : 'Failed to create directory.'
        setBannerMessage(errorMessage)
        return false
      }

      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to create directory: ${error.message}`
          : 'Failed to create directory.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [])

  const deleteFile = useCallback(async (relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    const { rootPath, activeFile } = workspaceSession

    try {
      const deleteResult = await window.workspace.deleteFile(rootPath, relativePath)

      if (!deleteResult.ok) {
        const errorMessage = deleteResult.error
          ? `Failed to delete file: ${deleteResult.error}`
          : 'Failed to delete file.'
        setBannerMessage(errorMessage)
        return false
      }

      if (activeFile === relativePath) {
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            activeFile: null,
            activeFileContent: null,
            activeFileImagePreview: null,
            activeFileGitLineMarkers: [],
            isDirty: false,
            previewUnavailableReason: null,
          }))
        )
      }

      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to delete file: ${error.message}`
          : 'Failed to delete file.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [])

  const deleteDirectory = useCallback(async (relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    const { rootPath, activeFile } = workspaceSession

    try {
      const deleteResult = await window.workspace.deleteDirectory(rootPath, relativePath)

      if (!deleteResult.ok) {
        const errorMessage = deleteResult.error
          ? `Failed to delete directory: ${deleteResult.error}`
          : 'Failed to delete directory.'
        setBannerMessage(errorMessage)
        return false
      }

      if (activeFile !== null && activeFile.startsWith(relativePath + '/')) {
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            activeFile: null,
            activeFileContent: null,
            activeFileImagePreview: null,
            activeFileGitLineMarkers: [],
            isDirty: false,
            previewUnavailableReason: null,
          }))
        )
      }

      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to delete directory: ${error.message}`
          : 'Failed to delete directory.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [])

  const renameFileOrDirectory = useCallback(async (oldRelativePath: string, newRelativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    const { rootPath, activeFile, comments, isDirty } = workspaceSession

    // Comment protection check
    const hasComments = comments.some(
      (c) =>
        c.relativePath === oldRelativePath ||
        c.relativePath.startsWith(oldRelativePath + '/'),
    )
    if (hasComments) {
      setBannerMessage(
        'Cannot rename: comments exist on this file or directory. Please remove comments first.',
      )
      return false
    }

    // Dirty state check
    if (activeFile === oldRelativePath && isDirty) {
      setBannerMessage(
        'Cannot rename: unsaved changes exist. Please save the file first.',
      )
      return false
    }

    try {
      const renameResult = await window.workspace.rename(
        rootPath,
        oldRelativePath,
        newRelativePath,
      )

      if (!renameResult.ok) {
        const errorMessage = renameResult.error
          ? `Failed to rename: ${renameResult.error}`
          : 'Failed to rename.'
        setBannerMessage(errorMessage)
        return false
      }

      // Update activeFile path if it was renamed
      if (activeFile === oldRelativePath) {
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            activeFile: newRelativePath,
          })),
        )
      } else if (activeFile !== null && activeFile.startsWith(oldRelativePath + '/')) {
        // Directory rename: update active file path prefix
        const updatedActiveFile =
          newRelativePath + activeFile.slice(oldRelativePath.length)
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            activeFile: updatedActiveFile,
          })),
        )
      }

      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to rename: ${error.message}`
          : 'Failed to rename.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [])

  const goBackInHistory = useCallback(() => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    const backStepResult = stepWorkspaceFileHistory(workspaceSession, 'back')
    if (!backStepResult.targetRelativePath) {
      return
    }

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
        stepWorkspaceFileHistory(currentSession, 'back').nextSession,
      ),
    )
    loadWorkspaceFile(
      activeWorkspaceId,
      backStepResult.targetRelativePath,
      'select',
      'preserve',
    )
  }, [loadWorkspaceFile])

  const goForwardInHistory = useCallback(() => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    const forwardStepResult = stepWorkspaceFileHistory(workspaceSession, 'forward')
    if (!forwardStepResult.targetRelativePath) {
      return
    }

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
        stepWorkspaceFileHistory(currentSession, 'forward').nextSession,
      ),
    )
    loadWorkspaceFile(
      activeWorkspaceId,
      forwardStepResult.targetRelativePath,
      'select',
      'preserve',
    )
  }, [loadWorkspaceFile])

  const setSelectionRange = useCallback(
    (selectionRange: LineSelectionRange | null) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
          setWorkspaceSelectionRangeInModel(currentSession, selectionRange),
        ),
      )
    },
    [],
  )

  const setExpandedDirectories = useCallback(
    (expandedDirectories: string[]) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      const nextExpandedDirectories = Array.from(new Set(expandedDirectories))
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
          ...currentSession,
          expandedDirectories: nextExpandedDirectories,
        })),
      )
    },
    [],
  )

  const loadDirectoryChildren = useCallback(
    async (relativePath: string) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[activeWorkspaceId]
      if (!workspaceSession) {
        return
      }

      if (workspaceSession.loadingDirectories.includes(relativePath)) {
        return
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
          ...currentSession,
          loadingDirectories: [
            ...currentSession.loadingDirectories,
            relativePath,
          ],
        })),
      )

      try {
        const result = await window.workspace.indexDirectory(
          workspaceSession.rootPath,
          relativePath,
        )

        if (workspaceStateRef.current.activeWorkspaceId !== activeWorkspaceId) {
          return
        }

        if (!result.ok) {
          setBannerMessage(
            result.error
              ? `Failed to load directory: ${result.error}`
              : 'Failed to load directory.',
          )
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            fileTree: mergeDirectoryChildren(
              currentSession.fileTree,
              relativePath,
              result.children,
              result.childrenStatus,
              result.totalChildCount,
            ),
            loadingDirectories: currentSession.loadingDirectories.filter(
              (dir) => dir !== relativePath,
            ),
          })),
        )
      } catch (error) {
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            loadingDirectories: currentSession.loadingDirectories.filter(
              (dir) => dir !== relativePath,
            ),
          })),
        )
        setBannerMessage(
          error instanceof Error
            ? `Failed to load directory: ${error.message}`
            : 'Failed to load directory.',
        )
      }
    },
    [],
  )

  const setWatchModePreference = useCallback(
    async (preference: WorkspaceWatchModePreference) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[activeWorkspaceId]
      if (!workspaceSession) {
        return
      }
      const targetRootPath = workspaceSession.rootPath

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => {
          return {
            ...currentSession,
            watchModePreference: preference,
          }
        }),
      )

      await startWorkspaceWatch(activeWorkspaceId, targetRootPath, {
        forceRestart: true,
        watchModePreference: preference,
      })
    },
    [startWorkspaceWatch],
  )

  useEffect(() => {
    let isDisposed = false

    const hydrateWorkspaceState = async () => {
      const snapshot = loadWorkspaceSessionSnapshot()
      if (!snapshot || isDisposed) {
        if (!isDisposed) {
          setHasHydratedSnapshot(true)
        }
        return
      }

      const hydratedWorkspaceState = createWorkspaceStateFromSnapshot(snapshot)
      workspaceStateRef.current = hydratedWorkspaceState
      setWorkspaceState(hydratedWorkspaceState)

      let failedRestoreCount = 0
      for (const workspaceId of hydratedWorkspaceState.workspaceOrder) {
        if (isDisposed) {
          return
        }

        const workspaceSession = workspaceStateRef.current.workspacesById[workspaceId]
        const persistedWorkspaceSession = snapshot.workspacesById[workspaceId]
        if (!workspaceSession || !persistedWorkspaceSession) {
          continue
        }

        const watchStarted = await startWorkspaceWatch(
          workspaceId,
          workspaceSession.rootPath,
        )
        const indexStatus = await loadWorkspaceIndex(
          workspaceId,
          workspaceSession.rootPath,
          'refresh',
        )

        if (indexStatus === 'failed') {
          failedRestoreCount += 1
          if (watchStarted) {
            await stopWorkspaceWatch(workspaceId)
          }
          delete indexRequestIdByWorkspaceRef.current[workspaceId]
          delete readFileRequestIdByWorkspaceRef.current[workspaceId]
          delete readGitLineMarkersRequestIdByWorkspaceRef.current[workspaceId]
          delete readGitFileStatusesRequestIdByWorkspaceRef.current[workspaceId]
          delete readSpecRequestIdByWorkspaceRef.current[workspaceId]
          delete readGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId]
          delete writeGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId]
          setWorkspaceState((previous) =>
            closeWorkspaceInState(previous, workspaceId),
          )
          continue
        }

        if (indexStatus === 'success') {
          void loadWorkspaceGitFileStatuses(workspaceId, workspaceSession.rootPath)
        }

        // A newer refresh may mark this request stale during restore.
        // Even in that case, keep restoring active file/spec so preview hydration
        // is not skipped for the persisted session.

        if (persistedWorkspaceSession.activeFile) {
          loadWorkspaceFile(
            workspaceId,
            persistedWorkspaceSession.activeFile,
            'select',
            'push',
          )
        }

        if (
          persistedWorkspaceSession.activeSpec &&
          persistedWorkspaceSession.activeSpec !== persistedWorkspaceSession.activeFile
        ) {
          loadWorkspaceSpec(workspaceId, persistedWorkspaceSession.activeSpec)
        }
      }

      if (!isDisposed && failedRestoreCount > 0) {
        showBanner(
          `Some workspaces could not be restored (${failedRestoreCount}).`,
        )
      }

      if (!isDisposed) {
        setHasHydratedSnapshot(true)
      }
    }

    void hydrateWorkspaceState()

    return () => {
      isDisposed = true
    }
  }, [
    loadWorkspaceFile,
    loadWorkspaceGitFileStatuses,
    loadWorkspaceIndex,
    loadWorkspaceSpec,
    showBanner,
    startWorkspaceWatch,
    stopWorkspaceWatch,
  ])

  const activeWorkspaceRootPath = workspaceState.activeWorkspaceId
    ? workspaceState.workspacesById[workspaceState.activeWorkspaceId]?.rootPath ?? null
    : null

  useEffect(() => {
    const activeWorkspaceId = workspaceState.activeWorkspaceId
    if (!activeWorkspaceId || !activeWorkspaceRootPath) {
      return
    }

    void loadWorkspaceComments(activeWorkspaceId, activeWorkspaceRootPath)
    void loadWorkspaceGlobalComments(activeWorkspaceId, activeWorkspaceRootPath)
  }, [
    activeWorkspaceRootPath,
    loadWorkspaceComments,
    loadWorkspaceGlobalComments,
    workspaceState.activeWorkspaceId,
  ])

  useEffect(() => {
    if (!hasHydratedSnapshot) {
      return
    }

    if (workspaceState.workspaceOrder.length === 0) {
      clearWorkspaceSessionSnapshot()
      return
    }

    const snapshot = createWorkspaceSessionSnapshot(workspaceState)
    saveWorkspaceSessionSnapshot(snapshot)
  }, [hasHydratedSnapshot, workspaceState])

  useEffect(() => {
    const watchedWorkspaceIds = watchedWorkspaceIdsRef.current
    const unsubscribe = window.workspace.onWatchEvent((watchEvent) => {
      const hasStructureChanges = watchEvent.hasStructureChanges === true
      if (
        !watchEvent.workspaceId ||
        (watchEvent.changedRelativePaths.length === 0 && !hasStructureChanges)
      ) {
        return
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[watchEvent.workspaceId]
      const activeFile = workspaceSession?.activeFile ?? null
      const shouldRefreshActiveFile =
        activeFile !== null && watchEvent.changedRelativePaths.includes(activeFile)
      const isCurrentlyDirty = workspaceSession?.isDirty ?? false

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, watchEvent.workspaceId, (currentSession) => {
          const nextChangedFiles = Array.from(
            new Set([
              ...currentSession.changedFiles,
              ...watchEvent.changedRelativePaths,
            ]),
          )
          if (nextChangedFiles.length === currentSession.changedFiles.length) {
            return currentSession
          }
          return {
            ...currentSession,
            changedFiles: nextChangedFiles,
          }
        }),
      )

      if (shouldRefreshActiveFile && activeFile !== null) {
        if (isCurrentlyDirty) {
          setExternalChangeDetected(true)
        } else {
          loadWorkspaceFile(watchEvent.workspaceId, activeFile, 'refresh')
        }
      }

      const activeSpec = workspaceSession?.activeSpec ?? null
      const shouldRefreshActiveSpec =
        activeSpec !== null && watchEvent.changedRelativePaths.includes(activeSpec)
      if (
        shouldRefreshActiveSpec &&
        activeSpec !== null &&
        activeSpec !== activeFile
      ) {
        loadWorkspaceSpec(watchEvent.workspaceId, activeSpec)
      }

      if (hasStructureChanges && workspaceSession) {
        void loadWorkspaceIndex(
          watchEvent.workspaceId,
          workspaceSession.rootPath,
          'refresh',
        )
      }

      if (workspaceSession) {
        void loadWorkspaceGitFileStatuses(
          watchEvent.workspaceId,
          workspaceSession.rootPath,
        )
      }
    })

    return () => {
      unsubscribe()
      const watchedWorkspaceIdList = Array.from(watchedWorkspaceIds)
      watchedWorkspaceIds.clear()
      for (const workspaceId of watchedWorkspaceIdList) {
        void window.workspace.watchStop(workspaceId)
      }
    }
  }, [loadWorkspaceFile, loadWorkspaceGitFileStatuses, loadWorkspaceIndex, loadWorkspaceSpec])

  useEffect(() => {
    const unsubscribe = window.workspace.onWatchFallback((fallbackEvent) => {
      if (!fallbackEvent.workspaceId) {
        return
      }
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, fallbackEvent.workspaceId, (currentSession) => ({
          ...currentSession,
          watchMode: fallbackEvent.watchMode,
          isRemoteMounted: true,
        })),
      )
      setBannerMessage(
        'Native watcher is unavailable for this workspace. Fallback to polling watcher is active.',
      )
    })
    return unsubscribe
  }, [])

  const activeWorkspace = workspaceState.activeWorkspaceId
    ? workspaceState.workspacesById[workspaceState.activeWorkspaceId] ?? null
    : null
  const canGoBack = activeWorkspace
    ? canStepWorkspaceFileHistory(activeWorkspace, 'back')
    : false
  const canGoForward = activeWorkspace
    ? canStepWorkspaceFileHistory(activeWorkspace, 'forward')
    : false

  const value = useMemo(
    () => ({
      workspaceOrder: workspaceState.workspaceOrder,
      workspaces: listWorkspaces(workspaceState),
      activeWorkspaceId: workspaceState.activeWorkspaceId,
      rootPath: activeWorkspace?.rootPath ?? null,
      fileTree: activeWorkspace?.fileTree ?? [],
      changedFiles: activeWorkspace?.changedFiles ?? [],
      gitFileStatuses: activeWorkspace?.gitFileStatuses ?? {},
      activeFile: activeWorkspace?.activeFile ?? null,
      activeSpec: activeWorkspace?.activeSpec ?? null,
      activeFileContent: activeWorkspace?.activeFileContent ?? null,
      activeFileImagePreview: activeWorkspace?.activeFileImagePreview ?? null,
      activeFileGitLineMarkers: activeWorkspace?.activeFileGitLineMarkers ?? [],
      activeSpecContent: activeWorkspace?.activeSpecContent ?? null,
      isIndexing: activeWorkspace?.isIndexing ?? false,
      isReadingFile: activeWorkspace?.isReadingFile ?? false,
      isReadingSpec: activeWorkspace?.isReadingSpec ?? false,
      readFileError: activeWorkspace?.readFileError ?? null,
      activeSpecReadError: activeWorkspace?.activeSpecReadError ?? null,
      previewUnavailableReason: activeWorkspace?.previewUnavailableReason ?? null,
      selectionRange: activeWorkspace?.selectionRange ?? null,
      expandedDirectories: activeWorkspace?.expandedDirectories ?? [],
      comments: activeWorkspace?.comments ?? [],
      isReadingComments: activeWorkspace?.isReadingComments ?? false,
      isWritingComments: activeWorkspace?.isWritingComments ?? false,
      commentsError: activeWorkspace?.commentsError ?? null,
      globalComments: activeWorkspace?.globalComments ?? '',
      isReadingGlobalComments: activeWorkspace?.isReadingGlobalComments ?? false,
      isWritingGlobalComments: activeWorkspace?.isWritingGlobalComments ?? false,
      globalCommentsError: activeWorkspace?.globalCommentsError ?? null,
      loadingDirectories: activeWorkspace?.loadingDirectories ?? [],
      watchModePreference: activeWorkspace?.watchModePreference ?? 'auto',
      watchMode: activeWorkspace?.watchMode ?? null,
      isRemoteMounted: activeWorkspace?.isRemoteMounted ?? false,
      isDirty: activeWorkspace?.isDirty ?? false,
      externalChangeDetected,
      bannerMessage,
      openWorkspace,
      setActiveWorkspace,
      switchWorkspace,
      closeWorkspace,
      selectFile,
      canGoBack,
      canGoForward,
      goBackInHistory,
      goForwardInHistory,
      reloadComments,
      saveComments,
      reloadGlobalComments,
      saveGlobalComments,
      showBanner,
      saveFile,
      setSelectionRange,
      setExpandedDirectories,
      loadDirectoryChildren,
      setWatchModePreference,
      clearBanner,
      reloadExternalChange,
      dismissExternalChange,
      markFileDirty,
      createFile,
      createDirectory,
      deleteFile,
      deleteDirectory,
      renameFileOrDirectory,
    }),
    [
      workspaceState,
      activeWorkspace,
      bannerMessage,
      externalChangeDetected,
      openWorkspace,
      setActiveWorkspace,
      switchWorkspace,
      closeWorkspace,
      selectFile,
      canGoBack,
      canGoForward,
      goBackInHistory,
      goForwardInHistory,
      reloadComments,
      saveComments,
      reloadGlobalComments,
      saveGlobalComments,
      showBanner,
      saveFile,
      setSelectionRange,
      setExpandedDirectories,
      loadDirectoryChildren,
      setWatchModePreference,
      clearBanner,
      reloadExternalChange,
      dismissExternalChange,
      markFileDirty,
      createFile,
      createDirectory,
      deleteFile,
      deleteDirectory,
      renameFileOrDirectory,
    ],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export { WorkspaceContext }
