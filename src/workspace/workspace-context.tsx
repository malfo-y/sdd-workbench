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
  pushWorkspaceFileHistory,
  setWorkspaceSelectionRange as setWorkspaceSelectionRangeInModel,
  setActiveWorkspace as setActiveWorkspaceInState,
  stepWorkspaceFileHistory,
  updateWorkspaceSession,
  type LineSelectionRange,
  type WorkspaceId,
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
  activeFile: string | null
  activeSpec: string | null
  activeFileContent: string | null
  activeFileImagePreview: WorkspaceImagePreview | null
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
  bannerMessage: string | null
  openWorkspace: () => Promise<void>
  setActiveWorkspace: (workspaceId: WorkspaceId) => void
  closeWorkspace: (workspaceId: WorkspaceId) => void
  selectFile: (relativePath: string) => void
  canGoBack: boolean
  canGoForward: boolean
  goBackInHistory: () => void
  goForwardInHistory: () => void
  reloadComments: () => Promise<void>
  saveComments: (comments: CodeComment[]) => Promise<boolean>
  showBanner: (message: string) => void
  setSelectionRange: (selectionRange: LineSelectionRange | null) => void
  setExpandedDirectories: (expandedDirectories: string[]) => void
  clearBanner: () => void
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
  const [hasHydratedSnapshot, setHasHydratedSnapshot] = useState(false)
  const indexRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readFileRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readSpecRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readCommentsRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>(
    {},
  )
  const writeCommentsRequestIdByWorkspaceRef = useRef<
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
              indexedFilePathSet.has(currentSession.activeFile)
            const activeSpecStillExists =
              currentSession.activeSpec !== null &&
              indexedFilePathSet.has(currentSession.activeSpec)

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

  const startWorkspaceWatch = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string) => {
      if (watchedWorkspaceIdsRef.current.has(workspaceId)) {
        return true
      }

      try {
        const watchStartResult = await window.workspace.watchStart(
          workspaceId,
          rootPath,
        )
        if (!watchStartResult.ok) {
          setBannerMessage(
            watchStartResult.error
              ? `Failed to start watcher: ${watchStartResult.error}`
              : 'Failed to start watcher.',
          )
          return false
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
      await loadWorkspaceIndex(selectedWorkspaceId, selectedPath)
    } catch (error) {
      setBannerMessage(
        error instanceof Error
          ? `Failed to open workspace: ${error.message}`
          : 'Failed to open workspace.',
      )
    }
  }, [loadWorkspaceIndex, startWorkspaceWatch])

  const setActiveWorkspace = useCallback((workspaceId: WorkspaceId) => {
    setWorkspaceState((previous) =>
      setActiveWorkspaceInState(previous, workspaceId),
    )
  }, [])

  const closeWorkspace = useCallback((workspaceId: WorkspaceId) => {
    delete indexRequestIdByWorkspaceRef.current[workspaceId]
    delete readFileRequestIdByWorkspaceRef.current[workspaceId]
    delete readSpecRequestIdByWorkspaceRef.current[workspaceId]
    delete readCommentsRequestIdByWorkspaceRef.current[workspaceId]
    delete writeCommentsRequestIdByWorkspaceRef.current[workspaceId]
    void stopWorkspaceWatch(workspaceId)
    setWorkspaceState((previous) => closeWorkspaceInState(previous, workspaceId))
  }, [stopWorkspaceWatch])

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
            }
          }),
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
    [],
  )

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
      selectActiveWorkspaceFile(relativePath, 'push')
    },
    [selectActiveWorkspaceFile],
  )

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
          delete readSpecRequestIdByWorkspaceRef.current[workspaceId]
          setWorkspaceState((previous) =>
            closeWorkspaceInState(previous, workspaceId),
          )
          continue
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
  }, [activeWorkspaceRootPath, loadWorkspaceComments, workspaceState.activeWorkspaceId])

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
        loadWorkspaceFile(watchEvent.workspaceId, activeFile, 'refresh')
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
    })

    return () => {
      unsubscribe()
      const watchedWorkspaceIdList = Array.from(watchedWorkspaceIds)
      watchedWorkspaceIds.clear()
      for (const workspaceId of watchedWorkspaceIdList) {
        void window.workspace.watchStop(workspaceId)
      }
    }
  }, [loadWorkspaceFile, loadWorkspaceIndex, loadWorkspaceSpec])

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
      activeFile: activeWorkspace?.activeFile ?? null,
      activeSpec: activeWorkspace?.activeSpec ?? null,
      activeFileContent: activeWorkspace?.activeFileContent ?? null,
      activeFileImagePreview: activeWorkspace?.activeFileImagePreview ?? null,
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
      bannerMessage,
      openWorkspace,
      setActiveWorkspace,
      closeWorkspace,
      selectFile,
      canGoBack,
      canGoForward,
      goBackInHistory,
      goForwardInHistory,
      reloadComments,
      saveComments,
      showBanner,
      setSelectionRange,
      setExpandedDirectories,
      clearBanner,
    }),
    [
      workspaceState,
      activeWorkspace,
      bannerMessage,
      openWorkspace,
      setActiveWorkspace,
      closeWorkspace,
      selectFile,
      canGoBack,
      canGoForward,
      goBackInHistory,
      goForwardInHistory,
      reloadComments,
      saveComments,
      showBanner,
      setSelectionRange,
      setExpandedDirectories,
      clearBanner,
    ],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export { WorkspaceContext }
