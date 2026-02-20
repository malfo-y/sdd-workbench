import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type LineSelectionRange = {
  startLine: number
  endLine: number
}

type WorkspaceContextValue = {
  rootPath: string | null
  fileTree: WorkspaceFileNode[]
  activeFile: string | null
  activeFileContent: string | null
  isIndexing: boolean
  isReadingFile: boolean
  readFileError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  bannerMessage: string | null
  openWorkspace: () => Promise<void>
  selectFile: (relativePath: string) => void
  setSelectionRange: (selectionRange: LineSelectionRange | null) => void
  clearBanner: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined,
)

type WorkspaceProviderProps = {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [fileTree, setFileTree] = useState<WorkspaceFileNode[]>([])
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [activeFileContent, setActiveFileContent] = useState<string | null>(null)
  const [isIndexing, setIsIndexing] = useState(false)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [readFileError, setReadFileError] = useState<string | null>(null)
  const [previewUnavailableReason, setPreviewUnavailableReason] = useState<WorkspacePreviewUnavailableReason | null>(null)
  const [selectionRange, setSelectionRange] = useState<LineSelectionRange | null>(
    null,
  )
  const [bannerMessage, setBannerMessage] = useState<string | null>(null)
  const readFileRequestIdRef = useRef(0)

  const clearBanner = useCallback(() => {
    setBannerMessage(null)
  }, [])

  const resetActiveFileState = useCallback(() => {
    readFileRequestIdRef.current += 1
    setActiveFile(null)
    setActiveFileContent(null)
    setReadFileError(null)
    setPreviewUnavailableReason(null)
    setSelectionRange(null)
    setIsReadingFile(false)
  }, [])

  const loadWorkspaceIndex = useCallback(
    async (nextRootPath: string) => {
      setIsIndexing(true)
      setFileTree([])
      resetActiveFileState()

      try {
        const indexResult = await window.workspace.index(nextRootPath)
        if (!indexResult.ok) {
          setBannerMessage(
            indexResult.error
              ? `Failed to index workspace: ${indexResult.error}`
              : 'Failed to index workspace.',
          )
          return
        }

        setFileTree(indexResult.fileTree)
        setBannerMessage(null)
      } catch (error) {
        setBannerMessage(
          error instanceof Error
            ? `Failed to index workspace: ${error.message}`
            : 'Failed to index workspace.',
        )
      } finally {
        setIsIndexing(false)
      }
    },
    [resetActiveFileState],
  )

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

      setRootPath(result.selectedPath)
      await loadWorkspaceIndex(result.selectedPath)
    } catch (error) {
      setBannerMessage(
        error instanceof Error
          ? `Failed to open workspace: ${error.message}`
          : 'Failed to open workspace.',
      )
    }
  }, [loadWorkspaceIndex])

  const selectFile = useCallback(
    (relativePath: string) => {
      setActiveFile(relativePath)
      setActiveFileContent(null)
      setSelectionRange(null)
      setReadFileError(null)
      setPreviewUnavailableReason(null)

      if (!rootPath) {
        setReadFileError('No workspace is currently selected.')
        return
      }

      const requestId = readFileRequestIdRef.current + 1
      readFileRequestIdRef.current = requestId
      setIsReadingFile(true)

      void (async () => {
        try {
          const readResult = await window.workspace.readFile(rootPath, relativePath)
          if (requestId !== readFileRequestIdRef.current) {
            return
          }

          if (!readResult.ok) {
            setReadFileError(
              readResult.error
                ? `Failed to read file: ${readResult.error}`
                : 'Failed to read file.',
            )
            return
          }

          if (readResult.previewUnavailableReason) {
            setPreviewUnavailableReason(readResult.previewUnavailableReason)
            return
          }

          setActiveFileContent(readResult.content ?? '')
        } catch (error) {
          if (requestId !== readFileRequestIdRef.current) {
            return
          }
          setReadFileError(
            error instanceof Error
              ? `Failed to read file: ${error.message}`
              : 'Failed to read file.',
          )
        } finally {
          if (requestId === readFileRequestIdRef.current) {
            setIsReadingFile(false)
          }
        }
      })()
    },
    [rootPath],
  )

  const value = useMemo(
    () => ({
      rootPath,
      fileTree,
      activeFile,
      activeFileContent,
      isIndexing,
      isReadingFile,
      readFileError,
      previewUnavailableReason,
      selectionRange,
      bannerMessage,
      openWorkspace,
      selectFile,
      setSelectionRange,
      clearBanner,
    }),
    [
      rootPath,
      fileTree,
      activeFile,
      activeFileContent,
      isIndexing,
      isReadingFile,
      readFileError,
      previewUnavailableReason,
      selectionRange,
      bannerMessage,
      openWorkspace,
      selectFile,
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
