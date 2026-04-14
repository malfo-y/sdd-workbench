import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import {
  beginWorkspaceDocumentSave,
  completeWorkspaceDocumentSaveFailure,
  completeWorkspaceDocumentSaveSuccess,
  getWorkspaceDocumentSession,
  getWorkspaceFileLastLine,
  markWorkspaceDocumentDirtyCompatibility,
  pushWorkspaceFileHistory,
  removeWorkspaceDocumentSession,
  removeWorkspaceSessionPaths,
  renameWorkspaceSessionPaths,
  setDirty,
  setWorkspaceDocumentDraftContent,
  updateWorkspaceSession,
  upsertWorkspaceDocumentSessionFromDisk,
  type DocumentSaveState,
  type WorkspaceId,
  type WorkspaceSession,
  type WorkspaceState,
} from './workspace-model'
import {
  executeTrackedIpcCall,
  isTrackedIpcCallCurrent,
  type WorkspaceRequestIdMapRef,
} from './ipc-call-helper'

type SetWorkspaceState = Dispatch<SetStateAction<WorkspaceState>>
type SetBannerMessage = Dispatch<SetStateAction<string | null>>
type WorkspaceStateRef = MutableRefObject<WorkspaceState>

function isMarkdownFile(relativePath: string) {
  return relativePath.toLowerCase().endsWith('.md')
}

function getWorkspaceDocumentSaveState(
  session: WorkspaceSession,
  relativePath: string | null,
): DocumentSaveState | null {
  if (!relativePath) {
    return null
  }
  const saveState = session.documentSessionsByPath[relativePath]?.saveState ?? null
  if (saveState) {
    return saveState
  }
  return relativePath === session.activeFile && session.isDirty ? 'dirty' : 'clean'
}

function getWorkspaceActiveDocumentSaveState(
  session: WorkspaceSession,
): DocumentSaveState | null {
  return getWorkspaceDocumentSaveState(session, session.activeFile)
}

function getWorkspaceIsDirtyCompatibility(session: WorkspaceSession): boolean {
  const saveState = getWorkspaceActiveDocumentSaveState(session)
  if (saveState === null) {
    return false
  }
  return saveState !== 'clean'
}

function hasUnsavedChanges(saveState: DocumentSaveState | null): boolean {
  return saveState !== null && saveState !== 'clean'
}

function getWorkspaceDocumentDraftContent(
  session: WorkspaceSession,
  relativePath: string | null,
): string | null {
  if (!relativePath) {
    return null
  }

  return getWorkspaceDocumentSession(session, relativePath)?.draftContent ?? null
}

function syncWorkspaceDisplayedDocumentContent(
  session: WorkspaceSession,
): WorkspaceSession {
  const activeFileDraftContent = getWorkspaceDocumentDraftContent(
    session,
    session.activeFile,
  )
  const activeSpecDraftContent =
    session.activeSpec !== null && isMarkdownFile(session.activeSpec)
      ? getWorkspaceDocumentDraftContent(session, session.activeSpec)
      : null

  const nextActiveFileContent =
    activeFileDraftContent ?? session.activeFileContent
  const nextActiveSpecContent =
    activeSpecDraftContent ?? session.activeSpecContent

  if (
    nextActiveFileContent === session.activeFileContent &&
    nextActiveSpecContent === session.activeSpecContent
  ) {
    return session
  }

  return {
    ...session,
    activeFileContent: nextActiveFileContent,
    activeSpecContent: nextActiveSpecContent,
  }
}

function getSpecPreviewUnavailableMessage(reason: string) {
  if (reason === 'file_too_large') {
    return 'Failed to render markdown preview: file exceeds 10MB limit.'
  }

  if (reason === 'blocked_resource') {
    return 'Failed to render markdown preview: blocked resource.'
  }

  return 'Failed to render markdown preview: binary file detected.'
}

function withoutChangedFileMarker(changedFiles: string[], relativePath: string) {
  if (!changedFiles.includes(relativePath)) {
    return changedFiles
  }
  return changedFiles.filter((path) => path !== relativePath)
}

function buildSavedFileRefreshSuppressionKey(
  workspaceId: WorkspaceId,
  relativePath: string,
) {
  return `${workspaceId}::${relativePath}`
}

export function useWorkspaceFileOperations(input: {
  workspaceStateRef: WorkspaceStateRef
  setWorkspaceState: SetWorkspaceState
  setBannerMessage: SetBannerMessage
  setExternalChangeDetected: Dispatch<SetStateAction<boolean>>
  savedFileRefreshSuppressionRef: MutableRefObject<Set<string>>
  readFileRequestIdByWorkspaceRef: WorkspaceRequestIdMapRef
  readSpecRequestIdByWorkspaceRef: WorkspaceRequestIdMapRef
  loadWorkspaceGitLineMarkers: (
    workspaceId: WorkspaceId,
    rootPath: string,
    relativePath: string,
  ) => Promise<void>
  refreshWorkspaceGitDecorations: (
    workspaceId: WorkspaceId,
    rootPath: string,
    activeFile?: string | null,
  ) => void
  loadWorkspaceIndex: (
    workspaceId: WorkspaceId,
    rootPath: string,
    mode?: 'reset' | 'refresh',
  ) => Promise<'success' | 'failed' | 'stale'>
  loadWorkspaceGitFileStatuses: (
    workspaceId: WorkspaceId,
    rootPath: string,
  ) => Promise<void>
}) {
  const {
    workspaceStateRef,
    setWorkspaceState,
    setBannerMessage,
    setExternalChangeDetected,
    savedFileRefreshSuppressionRef,
    readFileRequestIdByWorkspaceRef,
    readSpecRequestIdByWorkspaceRef,
    loadWorkspaceGitLineMarkers,
    refreshWorkspaceGitDecorations,
    loadWorkspaceIndex,
    loadWorkspaceGitFileStatuses,
  } = input

  const loadWorkspaceSpec = useCallback(
    (workspaceId: WorkspaceId, relativePath: string, mode: 'select' | 'refresh' = 'select') => {
      const workspaceSession = workspaceStateRef.current.workspacesById[workspaceId]
      if (!workspaceSession) {
        return
      }

      const existingDocumentSession = getWorkspaceDocumentSession(
        workspaceSession,
        relativePath,
      )
      const shouldPreserveCurrentContent =
        mode === 'refresh' ||
        hasUnsavedChanges(existingDocumentSession?.saveState ?? null)

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...currentSession,
          activeSpec: relativePath,
          activeSpecContent: shouldPreserveCurrentContent
            ? getWorkspaceDocumentDraftContent(currentSession, relativePath) ??
              currentSession.activeSpecContent
            : null,
          activeSpecReadError: shouldPreserveCurrentContent
            ? currentSession.activeSpecReadError
            : null,
          isReadingSpec: true,
        })),
      )

      void (async () => {
        try {
          const { requestId, result: readResult } = await executeTrackedIpcCall({
            requestIdByWorkspaceRef: readSpecRequestIdByWorkspaceRef,
            workspaceId,
            call: () => window.workspace.readFile(workspaceSession.rootPath, relativePath),
          })
          if (
            !isTrackedIpcCallCurrent(
              readSpecRequestIdByWorkspaceRef,
              workspaceId,
              requestId,
            )
          ) {
            return
          }

          if (!readResult.ok) {
            const errorMessage = readResult.error
              ? `Failed to read file: ${readResult.error}`
              : 'Failed to read file.'
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                activeSpecContent: shouldPreserveCurrentContent
                  ? currentSession.activeSpecContent
                  : null,
                activeSpecReadError: shouldPreserveCurrentContent
                  ? currentSession.activeSpecReadError
                  : errorMessage,
                isReadingSpec: false,
              })),
            )
            if (shouldPreserveCurrentContent) {
              setBannerMessage(errorMessage)
            }
            return
          }

          if (readResult.previewUnavailableReason) {
            const previewErrorMessage = getSpecPreviewUnavailableMessage(
              readResult.previewUnavailableReason ?? 'binary_file',
            )
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                activeSpecContent: shouldPreserveCurrentContent
                  ? currentSession.activeSpecContent
                  : null,
                activeSpecReadError: shouldPreserveCurrentContent
                  ? currentSession.activeSpecReadError
                  : previewErrorMessage,
                isReadingSpec: false,
              })),
            )
            if (shouldPreserveCurrentContent) {
              setBannerMessage(previewErrorMessage)
            }
            return
          }

          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => {
              const shouldPreserveDraft = hasUnsavedChanges(
                getWorkspaceDocumentSession(currentSession, relativePath)?.saveState ??
                  null,
              )
              const nextSession = shouldPreserveDraft
                ? currentSession
                : upsertWorkspaceDocumentSessionFromDisk(
                    currentSession,
                    relativePath,
                    readResult.content ?? '',
                  )

              return syncWorkspaceDisplayedDocumentContent({
                ...nextSession,
                activeSpecContent:
                  getWorkspaceDocumentDraftContent(nextSession, relativePath) ??
                  readResult.content ??
                  '',
                activeSpecReadError: null,
                isReadingSpec: false,
              })
            }),
          )
        } catch (error) {
          const requestId =
            readSpecRequestIdByWorkspaceRef.current[workspaceId] ?? 0
          if (
            !isTrackedIpcCallCurrent(
              readSpecRequestIdByWorkspaceRef,
              workspaceId,
              requestId,
            )
          ) {
            return
          }

          const errorMessage =
            error instanceof Error
              ? `Failed to read file: ${error.message}`
              : 'Failed to read file.'
          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              activeSpecContent: shouldPreserveCurrentContent
                ? currentSession.activeSpecContent
                : null,
              activeSpecReadError:
                shouldPreserveCurrentContent
                  ? currentSession.activeSpecReadError
                  : errorMessage,
              isReadingSpec: false,
            })),
          )
          if (shouldPreserveCurrentContent) {
            setBannerMessage(errorMessage)
          }
        }
      })()
    },
    [
      readSpecRequestIdByWorkspaceRef,
      setBannerMessage,
      setWorkspaceState,
      workspaceStateRef,
    ],
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
      const existingDocumentSession = getWorkspaceDocumentSession(
        workspaceSession,
        relativePath,
      )
      const shouldReuseUnsavedDraft =
        mode === 'select' &&
        existingDocumentSession !== null &&
        hasUnsavedChanges(existingDocumentSession.saveState)
      const canReuseActiveSpecContent =
        mode === 'select' &&
        selectingMarkdown &&
        workspaceSession.activeSpec === relativePath &&
        workspaceSession.activeSpecContent !== null &&
        workspaceSession.activeSpecReadError === null &&
        workspaceSession.previewUnavailableReason === null

      if (shouldReuseUnsavedDraft || canReuseActiveSpecContent) {
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
            const reusableDocumentContent =
              getWorkspaceDocumentDraftContent(currentSession, relativePath) ??
              currentSession.activeSpecContent ??
              ''
            const nextSession = syncWorkspaceDisplayedDocumentContent({
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
              activeSpec: shouldUpdateSpec ? relativePath : currentSession.activeSpec,
              activeFileContent: reusableDocumentContent,
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
              activeSpecContent: shouldUpdateSpec
                ? reusableDocumentContent
                : currentSession.activeSpecContent,
              activeSpecReadError: null,
              isReadingSpec: false,
              isDirty: currentSession.isDirty,
            })

            return setDirty(nextSession, getWorkspaceIsDirtyCompatibility(nextSession))
          }),
        )
        void loadWorkspaceGitLineMarkers(
          workspaceId,
          workspaceSession.rootPath,
          relativePath,
        )
        return
      }

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
          const { requestId, result: readResult } = await executeTrackedIpcCall({
            requestIdByWorkspaceRef: readFileRequestIdByWorkspaceRef,
            workspaceId,
            call: () => window.workspace.readFile(workspaceSession.rootPath, relativePath),
          })
          if (
            !isTrackedIpcCallCurrent(
              readFileRequestIdByWorkspaceRef,
              workspaceId,
              requestId,
            )
          ) {
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
            updateWorkspaceSession(previous, workspaceId, (currentSession) => {
              if (readResult.imagePreview) {
                return {
                  ...currentSession,
                  activeFileContent: null,
                  activeFileImagePreview: readResult.imagePreview,
                  activeFileGitLineMarkers: [],
                  selectionRange: null,
                  isReadingFile: false,
                  activeSpecContent:
                    shouldUpdateSpec || shouldRefreshSpec
                      ? null
                      : currentSession.activeSpecContent,
                  activeSpecReadError:
                    shouldUpdateSpec || shouldRefreshSpec
                      ? null
                      : currentSession.activeSpecReadError,
                  isReadingSpec:
                    shouldUpdateSpec || shouldRefreshSpec
                      ? false
                      : currentSession.isReadingSpec,
                }
              }

              const shouldPreserveDraft = hasUnsavedChanges(
                getWorkspaceDocumentSession(currentSession, relativePath)?.saveState ??
                  null,
              )
              const nextSession = shouldPreserveDraft
                ? currentSession
                : upsertWorkspaceDocumentSessionFromDisk(
                    currentSession,
                    relativePath,
                    readResult.content ?? '',
                  )
              const syncedSession = syncWorkspaceDisplayedDocumentContent({
                ...nextSession,
                activeFileContent:
                  getWorkspaceDocumentDraftContent(nextSession, relativePath) ??
                  readResult.content ??
                  '',
                activeFileImagePreview: null,
                activeFileGitLineMarkers: currentSession.activeFileGitLineMarkers,
                selectionRange: currentSession.selectionRange,
                isReadingFile: false,
                activeSpecContent:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? getWorkspaceDocumentDraftContent(nextSession, relativePath) ??
                      readResult.content ??
                      ''
                    : currentSession.activeSpecContent,
                activeSpecReadError:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? null
                    : currentSession.activeSpecReadError,
                isReadingSpec:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? false
                    : currentSession.isReadingSpec,
              })

              return setDirty(
                syncedSession,
                getWorkspaceIsDirtyCompatibility(syncedSession),
              )
            }),
          )
          if (!readResult.imagePreview) {
            void loadWorkspaceGitLineMarkers(
              workspaceId,
              workspaceSession.rootPath,
              relativePath,
            )
          }
        } catch (error) {
          const requestId =
            readFileRequestIdByWorkspaceRef.current[workspaceId] ?? 0
          if (
            !isTrackedIpcCallCurrent(
              readFileRequestIdByWorkspaceRef,
              workspaceId,
              requestId,
            )
          ) {
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
    [
      loadWorkspaceGitLineMarkers,
      readFileRequestIdByWorkspaceRef,
      setWorkspaceState,
      workspaceStateRef,
    ],
  )

  const saveFile = useCallback(async (content: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession =
      workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    const { rootPath, activeFile } = workspaceSession
    if (!activeFile) {
      return false
    }

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => {
        const withDraft = setWorkspaceDocumentDraftContent(
          currentSession,
          activeFile,
          content,
        )
        const saving = beginWorkspaceDocumentSave(withDraft, activeFile)
        return setDirty(saving, true)
      }),
    )

    try {
      const writeResult = await window.workspace.writeFile(rootPath, activeFile, content)

      if (!writeResult.ok) {
        const errorMessage = writeResult.error
          ? `Failed to save file: ${writeResult.error}`
          : 'Failed to save file.'
        setBannerMessage(errorMessage)
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => {
            const rolledBack = completeWorkspaceDocumentSaveFailure(
              currentSession,
              activeFile,
            )
            return setDirty(rolledBack, getWorkspaceIsDirtyCompatibility(rolledBack))
          }),
        )
        return false
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
          setDirty(
            completeWorkspaceDocumentSaveSuccess(currentSession, activeFile, content),
            false,
          ),
        ),
      )
      setExternalChangeDetected(false)
      savedFileRefreshSuppressionRef.current.add(
        buildSavedFileRefreshSuppressionKey(activeWorkspaceId, activeFile),
      )
      refreshWorkspaceGitDecorations(activeWorkspaceId, rootPath, activeFile)
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to save file: ${error.message}`
          : 'Failed to save file.'
      setBannerMessage(errorMessage)
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => {
          const rolledBack = completeWorkspaceDocumentSaveFailure(
            currentSession,
            activeFile,
          )
          return setDirty(rolledBack, getWorkspaceIsDirtyCompatibility(rolledBack))
        }),
      )
      return false
    }
  }, [
    refreshWorkspaceGitDecorations,
    savedFileRefreshSuppressionRef,
    setBannerMessage,
    setExternalChangeDetected,
    setWorkspaceState,
    workspaceStateRef,
  ])

  const reloadExternalChange = useCallback(() => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession || !workspaceSession.activeFile) {
      return
    }

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => {
        const withoutDraft = removeWorkspaceDocumentSession(
          currentSession,
          workspaceSession.activeFile!,
        )
        return setDirty(withoutDraft, false)
      }),
    )
    setExternalChangeDetected(false)
    loadWorkspaceFile(activeWorkspaceId, workspaceSession.activeFile, 'refresh')
  }, [loadWorkspaceFile, setExternalChangeDetected, setWorkspaceState, workspaceStateRef])

  const dismissExternalChange = useCallback(() => {
    setExternalChangeDetected(false)
  }, [setExternalChangeDetected])

  const markFileDirty = useCallback((draftContent?: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
        currentSession.activeFile
          ? (() => {
              const nextSession =
                typeof draftContent === 'string'
                  ? syncWorkspaceDisplayedDocumentContent({
                      ...setWorkspaceDocumentDraftContent(
                        currentSession,
                        currentSession.activeFile,
                        draftContent,
                      ),
                      activeFileContent: draftContent,
                      activeSpecContent:
                        currentSession.activeSpec === currentSession.activeFile &&
                        isMarkdownFile(currentSession.activeFile)
                          ? draftContent
                          : currentSession.activeSpecContent,
                    })
                  : markWorkspaceDocumentDirtyCompatibility(
                      currentSession,
                      currentSession.activeFile,
                      currentSession.activeFileContent ?? '',
                    )
              return setDirty(
                nextSession,
                getWorkspaceIsDirtyCompatibility(nextSession),
              )
            })()
          : setDirty(currentSession, true),
      ),
    )
  }, [setWorkspaceState, workspaceStateRef])

  const createFile = useCallback(async (relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession =
      workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    try {
      const createResult = await window.workspace.createFile(
        workspaceSession.rootPath,
        relativePath,
      )

      if (!createResult.ok) {
        const errorMessage = createResult.error
          ? `Failed to create file: ${createResult.error}`
          : 'Failed to create file.'
        setBannerMessage(errorMessage)
        return false
      }

      loadWorkspaceFile(activeWorkspaceId, relativePath, 'select', 'push')
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to create file: ${error.message}`
          : 'Failed to create file.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [loadWorkspaceFile, setBannerMessage, workspaceStateRef])

  const createDirectory = useCallback(async (relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession =
      workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    try {
      const createResult = await window.workspace.createDirectory(
        workspaceSession.rootPath,
        relativePath,
      )

      if (!createResult.ok) {
        const errorMessage = createResult.error
          ? `Failed to create directory: ${createResult.error}`
          : 'Failed to create directory.'
        setBannerMessage(errorMessage)
        return false
      }

      void loadWorkspaceIndex(activeWorkspaceId, workspaceSession.rootPath, 'refresh')
      void loadWorkspaceGitFileStatuses(activeWorkspaceId, workspaceSession.rootPath)
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to create directory: ${error.message}`
          : 'Failed to create directory.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [
    loadWorkspaceGitFileStatuses,
    loadWorkspaceIndex,
    setBannerMessage,
    workspaceStateRef,
  ])

  const deleteFile = useCallback(async (relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession =
      workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    try {
      const deleteResult = await window.workspace.deleteFile(
        workspaceSession.rootPath,
        relativePath,
      )

      if (!deleteResult.ok) {
        const errorMessage = deleteResult.error
          ? `Failed to delete file: ${deleteResult.error}`
          : 'Failed to delete file.'
        setBannerMessage(errorMessage)
        return false
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => {
          const removedSession = removeWorkspaceSessionPaths(
            currentSession,
            relativePath,
          )
          const syncedSession = syncWorkspaceDisplayedDocumentContent(removedSession)
          return setDirty(
            syncedSession,
            getWorkspaceIsDirtyCompatibility(syncedSession),
          )
        }),
      )

      void loadWorkspaceIndex(activeWorkspaceId, workspaceSession.rootPath, 'refresh')
      void loadWorkspaceGitFileStatuses(activeWorkspaceId, workspaceSession.rootPath)
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to delete file: ${error.message}`
          : 'Failed to delete file.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [
    loadWorkspaceGitFileStatuses,
    loadWorkspaceIndex,
    setBannerMessage,
    setWorkspaceState,
    workspaceStateRef,
  ])

  const deleteDirectory = useCallback(async (relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession =
      workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    try {
      const deleteResult = await window.workspace.deleteDirectory(
        workspaceSession.rootPath,
        relativePath,
      )

      if (!deleteResult.ok) {
        const errorMessage = deleteResult.error
          ? `Failed to delete directory: ${deleteResult.error}`
          : 'Failed to delete directory.'
        setBannerMessage(errorMessage)
        return false
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => {
          const removedSession = removeWorkspaceSessionPaths(
            currentSession,
            relativePath,
          )
          const syncedSession = syncWorkspaceDisplayedDocumentContent(removedSession)
          return setDirty(
            syncedSession,
            getWorkspaceIsDirtyCompatibility(syncedSession),
          )
        }),
      )

      void loadWorkspaceIndex(activeWorkspaceId, workspaceSession.rootPath, 'refresh')
      void loadWorkspaceGitFileStatuses(activeWorkspaceId, workspaceSession.rootPath)
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to delete directory: ${error.message}`
          : 'Failed to delete directory.'
      setBannerMessage(errorMessage)
      return false
    }
  }, [
    loadWorkspaceGitFileStatuses,
    loadWorkspaceIndex,
    setBannerMessage,
    setWorkspaceState,
    workspaceStateRef,
  ])

  const renameFileOrDirectory = useCallback(
    async (oldRelativePath: string, newRelativePath: string) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return false
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[activeWorkspaceId]
      if (!workspaceSession) {
        return false
      }

      const { rootPath, activeFile, comments } = workspaceSession

      const hasComments = comments.some(
        (comment) =>
          comment.relativePath === oldRelativePath ||
          comment.relativePath.startsWith(oldRelativePath + '/'),
      )
      if (hasComments) {
        setBannerMessage(
          'Cannot rename: comments exist on this file or directory. Please remove comments first.',
        )
        return false
      }

      const activeFileIsBeingRenamed =
        activeFile === oldRelativePath ||
        (activeFile !== null && activeFile.startsWith(`${oldRelativePath}/`))
      if (
        activeFileIsBeingRenamed &&
        getWorkspaceIsDirtyCompatibility(workspaceSession)
      ) {
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

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => {
            const renamedSession = renameWorkspaceSessionPaths(
              currentSession,
              oldRelativePath,
              newRelativePath,
            )
            const syncedSession = syncWorkspaceDisplayedDocumentContent(renamedSession)
            return setDirty(
              syncedSession,
              getWorkspaceIsDirtyCompatibility(syncedSession),
            )
          }),
        )

        void loadWorkspaceIndex(activeWorkspaceId, rootPath, 'refresh')
        void loadWorkspaceGitFileStatuses(activeWorkspaceId, rootPath)

        return true
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? `Failed to rename: ${error.message}`
            : 'Failed to rename.'
        setBannerMessage(errorMessage)
        return false
      }
    },
    [
      loadWorkspaceGitFileStatuses,
      loadWorkspaceIndex,
      setBannerMessage,
      setWorkspaceState,
      workspaceStateRef,
    ],
  )

  return {
    loadWorkspaceSpec,
    loadWorkspaceFile,
    saveFile,
    reloadExternalChange,
    dismissExternalChange,
    markFileDirty,
    createFile,
    createDirectory,
    deleteFile,
    deleteDirectory,
    renameFileOrDirectory,
  }
}
