import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from 'react'
import './App.css'
import { buildCodeComment } from './code-comments/comment-anchor'
import { MAX_CLIPBOARD_CHARS } from './code-comments/comment-config'
import { renderCommentsMarkdown, renderLlmBundle } from './code-comments/comment-export'
import {
  buildCommentLineEntryIndex,
  buildCommentLineIndex,
  getCommentLineEntries,
  getCommentLineCounts,
} from './code-comments/comment-line-index'
import { CommentListModal } from './code-comments/comment-list-modal'
import { CommentEditorModal } from './code-comments/comment-editor-modal'
import { GlobalCommentsModal } from './code-comments/global-comments-modal'
import { sanitizeCommentBody } from './code-comments/comment-types'
import {
  ExportCommentsModal,
  type ExportCommentsModalInput,
} from './code-comments/export-comments-modal'
import {
  buildCopyActiveFilePathPayload,
  buildCopySelectedContentPayload,
  buildCopySelectedLinesPayload,
} from './context-copy/copy-payload'
import {
  CodeViewerPanel,
  type CodeViewerJumpRequest,
} from './code-viewer/code-viewer-panel'
import { FileTreePanel } from './file-tree/file-tree-panel'
import { type SpecLinkLineRange } from './spec-viewer/spec-link-utils'
import { SpecViewerPanel } from './spec-viewer/spec-viewer-panel'
import { abbreviateWorkspacePath } from './workspace/path-format'
import { useWorkspace } from './workspace/use-workspace'
import { WorkspaceSwitcher } from './workspace/workspace-switcher'
import type {
  LineSelectionRange,
  WorkspaceWatchModePreference,
} from './workspace/workspace-model'

function collectWorkspaceFilePaths(
  nodes: WorkspaceFileNode[],
  paths = new Set<string>(),
): Set<string> {
  for (const node of nodes) {
    if (node.kind === 'file') {
      paths.add(node.relativePath)
      continue
    }

    collectWorkspaceFilePaths(node.children ?? [], paths)
  }

  return paths
}

const MIN_LEFT_PANE_WIDTH = 220
const MIN_CENTER_PANE_WIDTH = 360
const MIN_RIGHT_PANE_WIDTH = 220
const RESIZER_WIDTH = 12
const TRACKPAD_HISTORY_MIN_AXIS_DELTA = 18
const TRACKPAD_HISTORY_TRIGGER_DELTA = 120
const TRACKPAD_HISTORY_IDLE_RESET_MS = 160
const TRACKPAD_HISTORY_COOLDOWN_MS = 380

type PaneSizes = {
  left: number
  center: number
  right: number
}

type ResizeHandle = 'left' | 'right'

type ResizeSession = {
  handle: ResizeHandle
  startX: number
  availableWidth: number
  startSizes: PaneSizes
}

type CommentDraftState = {
  workspaceId: string
  relativePath: string
  selectionRange: LineSelectionRange
  fileContent: string
}

type GlobalCommentsModalState = {
  workspaceId: string
  initialValue: string
}

function buildSpecScrollStateKey(
  workspaceId: string | null,
  relativePath: string,
) {
  return `${workspaceId ?? '__none__'}::${relativePath}`
}

function formatWorkspaceWatchMode(watchMode: 'native' | 'polling' | null) {
  if (watchMode === 'native') {
    return 'Native'
  }
  if (watchMode === 'polling') {
    return 'Polling'
  }
  return 'Not started'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

type WheelHistoryState = {
  accumulatedDeltaX: number
  lastEventAt: number
  cooldownUntil: number
  lastTriggeredDirection: 'back' | 'forward' | null
}

function canConsumeHorizontalScroll(element: HTMLElement, deltaX: number): boolean {
  const overflowX = window.getComputedStyle(element).overflowX
  if (overflowX !== 'auto' && overflowX !== 'scroll' && overflowX !== 'overlay') {
    return false
  }

  const maxScrollLeft = element.scrollWidth - element.clientWidth
  if (maxScrollLeft <= 0) {
    return false
  }

  if (deltaX > 0) {
    return element.scrollLeft < maxScrollLeft
  }

  return element.scrollLeft > 0
}

function shouldSkipTrackpadHistoryFallback(
  target: EventTarget | null,
  deltaX: number,
): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  let current: Element | null = target
  while (current) {
    if (current instanceof HTMLElement && canConsumeHorizontalScroll(current, deltaX)) {
      return true
    }
    current = current.parentElement
  }

  return false
}

function ItermIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect
        fill="none"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
        width="20"
        x="2"
        y="3"
      />
      <path
        d="M7 9.5L10 12L7 14.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12.5 15H17"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function VsCodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M17.5 4L10.2 9.8L6.8 6.8L4.2 8.2L7.7 12L4.2 15.8L6.8 17.2L10.2 14.2L17.5 20V4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 5V19"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M5 12H19"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ViewIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M2.5 12C4.7 7.8 8 5.5 12 5.5C16 5.5 19.3 7.8 21.5 12C19.3 16.2 16 18.5 12 18.5C8 18.5 4.7 16.2 2.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" fill="none" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 4V14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 10.5L12 14L15.5 10.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M5 18.5H19"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M6.5 6.5L17.5 17.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M17.5 6.5L6.5 17.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M3 8.5V6.8C3 5.8 3.8 5 4.8 5H10L12 7H19.2C20.2 7 21 7.8 21 8.8V17.2C21 18.2 20.2 19 19.2 19H4.8C3.8 19 3 18.2 3 17.2V11"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M8 12H15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M11.5 8.5L15 12L11.5 15.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function App() {
  const {
    workspaces,
    activeWorkspaceId,
    rootPath,
    fileTree,
    changedFiles,
    activeFile,
    activeSpec,
    activeFileContent,
    activeFileImagePreview,
    activeSpecContent,
    isIndexing,
    isReadingFile,
    isReadingSpec,
    readFileError,
    activeSpecReadError,
    previewUnavailableReason,
    selectionRange,
    expandedDirectories,
    comments,
    isReadingComments,
    isWritingComments,
    globalComments,
    isReadingGlobalComments,
    isWritingGlobalComments,
    watchModePreference,
    watchMode,
    isRemoteMounted,
    bannerMessage,
    openWorkspace,
    setActiveWorkspace,
    closeWorkspace,
    selectFile,
    canGoBack,
    canGoForward,
    goBackInHistory,
    goForwardInHistory,
    saveComments,
    saveGlobalComments,
    showBanner,
    setSelectionRange,
    setExpandedDirectories,
    setWatchModePreference,
    clearBanner,
  } = useWorkspace()
  const displayPath = rootPath
    ? abbreviateWorkspacePath(rootPath)
    : 'No workspace selected'
  const [paneSizes, setPaneSizes] = useState<PaneSizes>({
    left: 15,
    center: 40,
    right: 45,
  })
  const [activeResizeHandle, setActiveResizeHandle] =
    useState<ResizeHandle | null>(null)
  const workspaceLayoutRef = useRef<HTMLElement | null>(null)
  const resizeSessionRef = useRef<ResizeSession | null>(null)
  const workspaceFilePathSet = useMemo(
    () => collectWorkspaceFilePaths(fileTree),
    [fileTree],
  )
  const jumpRequestTokenRef = useRef(0)
  const [codeViewerJumpRequest, setCodeViewerJumpRequest] =
    useState<CodeViewerJumpRequest | null>(null)
  const previousActiveFileRef = useRef<string | null>(null)
  const specScrollPositionsRef = useRef<Record<string, number>>({})
  const [commentDraftState, setCommentDraftState] =
    useState<CommentDraftState | null>(null)
  const [globalCommentsModalState, setGlobalCommentsModalState] =
    useState<GlobalCommentsModalState | null>(null)
  const [isSavingGlobalCommentsModal, setIsSavingGlobalCommentsModal] =
    useState(false)
  const [isViewCommentsModalOpen, setIsViewCommentsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isExportingComments, setIsExportingComments] = useState(false)
  const commentLineIndex = useMemo(
    () => buildCommentLineIndex(comments),
    [comments],
  )
  const commentLineEntryIndex = useMemo(
    () => buildCommentLineEntryIndex(comments),
    [comments],
  )
  const activeFileCommentLineCounts = useMemo(
    () => getCommentLineCounts(commentLineIndex, activeFile),
    [activeFile, commentLineIndex],
  )
  const activeFileCommentLineEntries = useMemo(
    () => getCommentLineEntries(commentLineEntryIndex, activeFile),
    [activeFile, commentLineEntryIndex],
  )
  const activeSpecCommentLineCounts = useMemo(
    () => getCommentLineCounts(commentLineIndex, activeSpec),
    [activeSpec, commentLineIndex],
  )
  const activeSpecCommentLineEntries = useMemo(
    () => getCommentLineEntries(commentLineEntryIndex, activeSpec),
    [activeSpec, commentLineEntryIndex],
  )
  const pendingComments = useMemo(
    () => comments.filter((comment) => !comment.exportedAt),
    [comments],
  )
  const hasGlobalComments = globalComments.trim().length > 0
  const isCommentsActionDisabled =
    !rootPath ||
    isReadingComments ||
    isWritingComments ||
    isReadingGlobalComments ||
    isWritingGlobalComments ||
    isSavingGlobalCommentsModal ||
    isExportingComments
  const canCloseWorkspace =
    activeWorkspaceId !== null && workspaces.some(({ id }) => id === activeWorkspaceId)
  const wheelHistoryStateRef = useRef<WheelHistoryState>({
    accumulatedDeltaX: 0,
    lastEventAt: 0,
    cooldownUntil: 0,
    lastTriggeredDirection: null,
  })

  const writeToClipboard = useCallback(
    async (
      payload: string,
      errorMessage: string,
      options?: {
        suppressErrorBanner?: boolean
      },
    ) => {
      const suppressErrorBanner = options?.suppressErrorBanner ?? false
      if (!navigator.clipboard?.writeText) {
        if (!suppressErrorBanner) {
          showBanner('Failed to copy: clipboard API is unavailable.')
        }
        return false
      }

      try {
        await navigator.clipboard.writeText(payload)
        return true
      } catch {
        if (!suppressErrorBanner) {
          showBanner(errorMessage)
        }
        return false
      }
    },
    [showBanner],
  )

  const handleCopyRelativePath = useCallback(
    (relativePath: string) => {
      if (activeWorkspaceId === null) {
        return
      }

      const payload = buildCopyActiveFilePathPayload(relativePath)
      void writeToClipboard(payload, 'Failed to copy relative path.')
    },
    [activeWorkspaceId, writeToClipboard],
  )

  const handleCopyBoth = useCallback(
    (input: {
      relativePath: string
      content: string
      selectionRange: LineSelectionRange
    }) => {
      if (activeWorkspaceId === null) {
        return
      }

      const payload = buildCopySelectedLinesPayload({
        relativePath: input.relativePath,
        content: input.content,
        selectionRange: input.selectionRange,
      })
      void writeToClipboard(payload, 'Failed to copy selected lines.')
    },
    [activeWorkspaceId, writeToClipboard],
  )

  const handleCopySelectedContent = useCallback(
    (input: {
      relativePath: string
      content: string
      selectionRange: LineSelectionRange
    }) => {
      if (activeWorkspaceId === null) {
        return
      }

      const payload = buildCopySelectedContentPayload({
        content: input.content,
        selectionRange: input.selectionRange,
      })
      void writeToClipboard(payload, 'Failed to copy selected content.')
    },
    [activeWorkspaceId, writeToClipboard],
  )

  const handleRequestAddComment = useCallback(
    (input: {
      relativePath: string
      content: string
      selectionRange: LineSelectionRange
    }) => {
      if (!activeWorkspaceId) {
        showBanner('Cannot add comment: no active workspace selected.')
        return
      }

      setCommentDraftState({
        workspaceId: activeWorkspaceId,
        relativePath: input.relativePath,
        selectionRange: input.selectionRange,
        fileContent: input.content,
      })
    },
    [activeWorkspaceId, showBanner],
  )

  const handleSaveComment = useCallback(
    async (body: string) => {
      if (!commentDraftState) {
        return
      }

      if (!activeWorkspaceId || activeWorkspaceId !== commentDraftState.workspaceId) {
        setCommentDraftState(null)
        showBanner('Cannot save comment: active workspace changed.')
        return
      }

      try {
        const nextComment = buildCodeComment({
          relativePath: commentDraftState.relativePath,
          selectionRange: commentDraftState.selectionRange,
          body,
          fileContent: commentDraftState.fileContent,
        })

        const saved = await saveComments([...comments, nextComment])
        if (!saved) {
          return
        }
        setCommentDraftState(null)
        showBanner('Comment saved.')
      } catch (error) {
        showBanner(
          error instanceof Error
            ? `Cannot save comment: ${error.message}`
            : 'Cannot save comment.',
        )
      }
    },
    [activeWorkspaceId, commentDraftState, comments, saveComments, showBanner],
  )

  const estimateBundleLength = useCallback(
    (instruction: string) =>
      renderLlmBundle({
        instruction,
        comments: pendingComments,
        globalComments,
      }).length,
    [globalComments, pendingComments],
  )

  const handleSaveGlobalComments = useCallback(
    async (body: string) => {
      const targetWorkspaceId = globalCommentsModalState?.workspaceId
      if (!targetWorkspaceId) {
        showBanner('Cannot save global comments: no active workspace selected.')
        return
      }

      setIsSavingGlobalCommentsModal(true)
      try {
        const saved = await saveGlobalComments(body, targetWorkspaceId)
        if (!saved) {
          return
        }

        showBanner('Global comments saved.')
        setGlobalCommentsModalState(null)
      } finally {
        setIsSavingGlobalCommentsModal(false)
      }
    },
    [globalCommentsModalState, saveGlobalComments, showBanner],
  )

  const handleRequestAddCommentFromSpec = useCallback(
    (input: {
      relativePath: string
      selectionRange: LineSelectionRange
    }) => {
      if (!activeWorkspaceId) {
        showBanner('Cannot add comment: no active workspace selected.')
        return
      }

      if (
        !activeSpec ||
        input.relativePath !== activeSpec ||
        activeSpecContent === null
      ) {
        showBanner('Cannot add comment: active spec content is unavailable.')
        return
      }

      setCommentDraftState({
        workspaceId: activeWorkspaceId,
        relativePath: input.relativePath,
        selectionRange: input.selectionRange,
        fileContent: activeSpecContent,
      })
    },
    [activeSpec, activeSpecContent, activeWorkspaceId, showBanner],
  )

  const handleExportComments = useCallback(
    async (input: ExportCommentsModalInput) => {
      if (!rootPath || !activeWorkspaceId) {
        showBanner('Cannot export comments: no active workspace selected.')
        return
      }

      if (pendingComments.length === 0 && !hasGlobalComments) {
        showBanner('No pending comments to export.')
        return
      }

      const exportSnapshot = pendingComments
      const commentsMarkdown = renderCommentsMarkdown(exportSnapshot, {
        globalComments,
      })
      const bundleMarkdown = renderLlmBundle({
        instruction: input.instruction,
        comments: exportSnapshot,
        globalComments,
      })
      const isClipboardAllowed = bundleMarkdown.length <= MAX_CLIPBOARD_CHARS
      const shouldCopyToClipboard = input.copyToClipboard && isClipboardAllowed

      if (input.copyToClipboard && !isClipboardAllowed) {
        showBanner(
          `Clipboard copy skipped: bundle exceeds ${MAX_CLIPBOARD_CHARS.toLocaleString()} characters.`,
        )
      }

      setIsExportingComments(true)
      try {
        let didCopyToClipboard = false
        let wroteCommentsFile = false
        let wroteBundleFile = false
        let fileExportError: string | null = null
        if (shouldCopyToClipboard) {
          didCopyToClipboard = await writeToClipboard(
            bundleMarkdown,
            'Failed to copy comments bundle.',
            {
              suppressErrorBanner: true,
            },
          )
        }

        if (input.writeCommentsFile || input.writeBundleFile) {
          const exportResult = await window.workspace.exportCommentsBundle({
            rootPath,
            commentsMarkdown: input.writeCommentsFile
              ? commentsMarkdown
              : undefined,
            bundleMarkdown: input.writeBundleFile ? bundleMarkdown : undefined,
            writeCommentsFile: input.writeCommentsFile,
            writeBundleFile: input.writeBundleFile,
          })

          if (!exportResult.ok) {
            fileExportError = exportResult.error ?? 'Failed to export comments.'
          } else {
            wroteCommentsFile = Boolean(exportResult.commentsPath)
            wroteBundleFile = Boolean(exportResult.bundlePath)
          }
        }

        const completedTargets: string[] = []
        const failedTargets: string[] = []
        if (didCopyToClipboard) {
          completedTargets.push('clipboard')
        } else if (shouldCopyToClipboard) {
          failedTargets.push('clipboard')
        }
        if (input.writeCommentsFile && !wroteCommentsFile) {
          failedTargets.push('_COMMENTS.md')
        }
        if (input.writeBundleFile && !wroteBundleFile) {
          failedTargets.push('bundle file')
        }
        if (wroteCommentsFile) {
          completedTargets.push('_COMMENTS.md')
        }
        if (wroteBundleFile) {
          completedTargets.push('bundle file')
        }

        if (completedTargets.length === 0) {
          if (fileExportError) {
            showBanner(`Failed to export comments: ${fileExportError}`)
            return
          }
          if (failedTargets.length > 0) {
            showBanner(`Failed export target: ${failedTargets.join(', ')}.`)
            return
          }
          showBanner('No export target selected.')
          return
        }

        if (exportSnapshot.length > 0) {
          const exportedCommentIds = new Set(
            exportSnapshot.map((comment) => comment.id),
          )
          const exportTimestamp = new Date().toISOString()
          const markedComments = comments.map((comment) =>
            exportedCommentIds.has(comment.id)
              ? { ...comment, exportedAt: exportTimestamp }
              : comment,
          )

          const isStatusSaved = await saveComments(markedComments)
          if (!isStatusSaved) {
            showBanner('Comments exported, but failed to record export status.')
            return
          }
        }

        if (failedTargets.length > 0) {
          showBanner(
            `Comments exported: ${completedTargets.join(', ')}. Failed: ${failedTargets.join(', ')}.`,
          )
        } else {
          showBanner(`Comments exported: ${completedTargets.join(', ')}.`)
        }
        setIsExportModalOpen(false)
      } finally {
        setIsExportingComments(false)
      }
    },
    [
      activeWorkspaceId,
      comments,
      globalComments,
      hasGlobalComments,
      pendingComments,
      rootPath,
      saveComments,
      showBanner,
      writeToClipboard,
    ],
  )

  const handleUpdateComment = useCallback(
    async (commentId: string, body: string) => {
      if (!activeWorkspaceId) {
        showBanner('Cannot update comment: no active workspace selected.')
        return false
      }

      const sanitizedBody = sanitizeCommentBody(body)
      if (sanitizedBody.length === 0) {
        showBanner('Cannot save comment: comment body is empty.')
        return false
      }

      const hasTargetComment = comments.some((comment) => comment.id === commentId)
      if (!hasTargetComment) {
        showBanner('Cannot update comment: target comment not found.')
        return false
      }

      const nextComments = comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              body: sanitizedBody,
            }
          : comment,
      )

      const saved = await saveComments(nextComments)
      if (!saved) {
        return false
      }
      showBanner('Comment updated.')
      return true
    },
    [activeWorkspaceId, comments, saveComments, showBanner],
  )

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!activeWorkspaceId) {
        showBanner('Cannot delete comment: no active workspace selected.')
        return false
      }

      const nextComments = comments.filter((comment) => comment.id !== commentId)
      if (nextComments.length === comments.length) {
        showBanner('Cannot delete comment: target comment not found.')
        return false
      }

      const saved = await saveComments(nextComments)
      if (!saved) {
        return false
      }
      showBanner('Comment deleted.')
      return true
    },
    [activeWorkspaceId, comments, saveComments, showBanner],
  )

  const handleDeleteExportedComments = useCallback(async () => {
    if (!activeWorkspaceId) {
      showBanner('Cannot delete exported comments: no active workspace selected.')
      return false
    }

    const exportedCommentCount = comments.filter(
      (comment) => Boolean(comment.exportedAt),
    ).length
    if (exportedCommentCount === 0) {
      showBanner('No exported comments to delete.')
      return false
    }

    const nextComments = comments.filter((comment) => !comment.exportedAt)
    const saved = await saveComments(nextComments)
    if (!saved) {
      return false
    }
    showBanner(`Deleted ${exportedCommentCount} exported comment(s).`)
    return true
  }, [activeWorkspaceId, comments, saveComments, showBanner])

  const openWorkspaceInExternalApp = useCallback(
    async (target: 'iterm' | 'vscode') => {
      if (!rootPath) {
        return
      }

      const targetLabel = target === 'iterm' ? 'iTerm' : 'VSCode'
      try {
        const result =
          target === 'iterm'
            ? await window.workspace.openInIterm(rootPath)
            : await window.workspace.openInVsCode(rootPath)
        if (!result.ok) {
          showBanner(result.error ?? `Failed to open workspace in ${targetLabel}.`)
        }
      } catch {
        showBanner(`Failed to open workspace in ${targetLabel}.`)
      }
    },
    [rootPath, showBanner],
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

  const workspaceLayoutStyle = useMemo(
    () =>
      ({
        '--pane-left': `${paneSizes.left}%`,
        '--pane-center': `${paneSizes.center}%`,
        '--pane-right': `${paneSizes.right}%`,
      }) as CSSProperties,
    [paneSizes],
  )

  const startResize = (handle: ResizeHandle, clientX: number) => {
    const layoutElement = workspaceLayoutRef.current
    if (!layoutElement) {
      return
    }

    const layoutWidth = layoutElement.getBoundingClientRect().width
    const availableWidth = layoutWidth - RESIZER_WIDTH * 2
    const minimumWidthSum =
      MIN_LEFT_PANE_WIDTH + MIN_CENTER_PANE_WIDTH + MIN_RIGHT_PANE_WIDTH

    if (availableWidth <= minimumWidthSum) {
      return
    }

    resizeSessionRef.current = {
      handle,
      startX: clientX,
      availableWidth,
      startSizes: paneSizes,
    }
    setActiveResizeHandle(handle)
  }

  useEffect(() => {
    if (!activeResizeHandle) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeSession = resizeSessionRef.current
      if (!resizeSession) {
        return
      }

      const deltaX = event.clientX - resizeSession.startX
      const { availableWidth, startSizes } = resizeSession

      const startLeftWidth = (startSizes.left / 100) * availableWidth
      const startRightWidth = (startSizes.right / 100) * availableWidth

      if (resizeSession.handle === 'left') {
        const maxLeftWidth =
          availableWidth - MIN_CENTER_PANE_WIDTH - startRightWidth
        const nextLeftWidth = clamp(
          startLeftWidth + deltaX,
          MIN_LEFT_PANE_WIDTH,
          maxLeftWidth,
        )
        const nextCenterWidth =
          availableWidth - startRightWidth - nextLeftWidth

        setPaneSizes({
          left: (nextLeftWidth / availableWidth) * 100,
          center: (nextCenterWidth / availableWidth) * 100,
          right: (startRightWidth / availableWidth) * 100,
        })
        return
      }

      const maxRightWidth =
        availableWidth - startLeftWidth - MIN_CENTER_PANE_WIDTH
      const nextRightWidth = clamp(
        startRightWidth - deltaX,
        MIN_RIGHT_PANE_WIDTH,
        maxRightWidth,
      )
      const nextCenterWidth = availableWidth - startLeftWidth - nextRightWidth

      setPaneSizes({
        left: (startLeftWidth / availableWidth) * 100,
        center: (nextCenterWidth / availableWidth) * 100,
        right: (nextRightWidth / availableWidth) * 100,
      })
    }

    const stopResize = () => {
      resizeSessionRef.current = null
      setActiveResizeHandle(null)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
  }, [activeResizeHandle])

  const openSpecRelativePath = useCallback(
    (
      relativePath: string,
      lineRange: SpecLinkLineRange | null,
    ) => {
      if (!workspaceFilePathSet.has(relativePath)) {
        return false
      }

      selectFile(relativePath)
      if (lineRange) {
        setSelectionRange({
          startLine: lineRange.startLine,
          endLine: lineRange.endLine,
        })
        jumpRequestTokenRef.current += 1
        setCodeViewerJumpRequest({
          targetRelativePath: relativePath,
          lineNumber: lineRange.startLine,
          token: jumpRequestTokenRef.current,
        })
      } else {
        setCodeViewerJumpRequest(null)
      }
      return true
    },
    [workspaceFilePathSet, selectFile, setSelectionRange],
  )

  const goToActiveSpecSourceLine = useCallback(
    (lineNumber: number) => {
      if (!activeSpec) {
        showBanner('Cannot go to source: no active spec is selected.')
        return
      }

      const opened = openSpecRelativePath(activeSpec, {
        startLine: lineNumber,
        endLine: lineNumber,
      })
      if (!opened) {
        showBanner(
          'Cannot go to source: the active spec is unavailable in this workspace.',
        )
      }
    },
    [activeSpec, openSpecRelativePath, showBanner],
  )

  const handleSpecScrollPositionChange = useCallback(
    (input: { relativePath: string; scrollTop: number }) => {
      if (!activeWorkspaceId) {
        return
      }

      specScrollPositionsRef.current[
        buildSpecScrollStateKey(activeWorkspaceId, input.relativePath)
      ] = input.scrollTop
    },
    [activeWorkspaceId],
  )

  const restoredSpecScrollTop =
    activeWorkspaceId && activeSpec
      ? specScrollPositionsRef.current[
          buildSpecScrollStateKey(activeWorkspaceId, activeSpec)
        ] ?? null
      : null

  useEffect(() => {
    if (!activeFile) {
      previousActiveFileRef.current = null
      return
    }

    const fileChanged = previousActiveFileRef.current !== activeFile
    previousActiveFileRef.current = activeFile
    if (!fileChanged) {
      return
    }

    if (
      !selectionRange ||
      selectionRange.startLine !== selectionRange.endLine
    ) {
      return
    }

    jumpRequestTokenRef.current += 1
    setCodeViewerJumpRequest({
      targetRelativePath: activeFile,
      lineNumber: selectionRange.startLine,
      token: jumpRequestTokenRef.current,
    })
  }, [activeFile, selectionRange])

  useEffect(() => {
    if (!commentDraftState) {
      return
    }

    if (
      !activeWorkspaceId ||
      activeWorkspaceId !== commentDraftState.workspaceId ||
      activeFile !== commentDraftState.relativePath
    ) {
      setCommentDraftState(null)
    }
  }, [activeFile, activeWorkspaceId, commentDraftState])

  const navigateHistory = useCallback(
    (direction: 'back' | 'forward') => {
      if (direction === 'back') {
        goBackInHistory()
        return
      }
      goForwardInHistory()
    },
    [goBackInHistory, goForwardInHistory],
  )

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 3) {
        event.preventDefault()
        navigateHistory('back')
        return
      }

      if (event.button === 4) {
        event.preventDefault()
        navigateHistory('forward')
      }
    }

    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [navigateHistory])

  useEffect(() => {
    const unsubscribe = window.workspace.onHistoryNavigate((event) => {
      navigateHistory(event.direction)
    })

    return unsubscribe
  }, [navigateHistory])

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const absDeltaX = Math.abs(event.deltaX)
      if (absDeltaX < TRACKPAD_HISTORY_MIN_AXIS_DELTA) {
        return
      }

      if (absDeltaX <= Math.abs(event.deltaY)) {
        return
      }

      if (shouldSkipTrackpadHistoryFallback(event.target, event.deltaX)) {
        return
      }

      const state = wheelHistoryStateRef.current
      const now = performance.now()
      const direction = event.deltaX > 0 ? 'forward' : 'back'

      if (now < state.cooldownUntil) {
        if (direction === state.lastTriggeredDirection) {
          return
        }
      }

      if (now - state.lastEventAt > TRACKPAD_HISTORY_IDLE_RESET_MS) {
        state.accumulatedDeltaX = 0
        state.lastTriggeredDirection = null
      }

      state.lastEventAt = now
      state.accumulatedDeltaX += event.deltaX

      if (Math.abs(state.accumulatedDeltaX) < TRACKPAD_HISTORY_TRIGGER_DELTA) {
        return
      }

      event.preventDefault()
      const triggeredDirection = state.accumulatedDeltaX > 0 ? 'forward' : 'back'
      navigateHistory(triggeredDirection)
      state.accumulatedDeltaX = 0
      state.cooldownUntil = now + TRACKPAD_HISTORY_COOLDOWN_MS
      state.lastTriggeredDirection = triggeredDirection
    }

    window.addEventListener('wheel', handleWheel, {
      passive: false,
    })
    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [navigateHistory])

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>SDD Workbench</h1>
        <div className="app-header-actions" data-testid="app-header-actions">
          <div
            className="header-history-actions"
            data-testid="header-history-actions"
          >
            <button
              disabled={!canGoBack}
              onClick={goBackInHistory}
              type="button"
            >
              Back
            </button>
            <button
              disabled={!canGoForward}
              onClick={goForwardInHistory}
              type="button"
            >
              Forward
            </button>
          </div>
          <WorkspaceSwitcher
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={setActiveWorkspace}
            workspaces={workspaces}
          />
          <div className="header-comments-actions" data-testid="header-comments-actions">
            <button
              aria-label="Add Global Comments"
              className="header-action-button"
              disabled={isCommentsActionDisabled}
              onClick={() => {
                if (!activeWorkspaceId) {
                  return
                }
                setGlobalCommentsModalState({
                  workspaceId: activeWorkspaceId,
                  initialValue: globalComments,
                })
              }}
              title="Add Global Comments"
              type="button"
            >
              <span aria-hidden="true" className="header-action-icon">
                <AddIcon />
              </span>
              <span className="header-action-label">+ Global</span>
            </button>
            <button
              aria-label="View Comments"
              className="header-action-button"
              disabled={isCommentsActionDisabled}
              onClick={() => {
                setIsViewCommentsModalOpen(true)
              }}
              title="View Comments"
              type="button"
            >
              <span aria-hidden="true" className="header-action-icon">
                <ViewIcon />
              </span>
              <span className="header-action-label">View</span>
            </button>
            <button
              aria-label="Export Comments"
              className="header-action-button"
              disabled={isCommentsActionDisabled}
              onClick={() => {
                setIsExportModalOpen(true)
              }}
              title="Export Comments"
              type="button"
            >
              <span aria-hidden="true" className="header-action-icon">
                <ExportIcon />
              </span>
              <span className="header-action-label">Export</span>
            </button>
          </div>
          <div className="header-workspace-actions" data-testid="header-workspace-actions">
            <button
              aria-label="Close Workspace"
              className="header-action-button"
              disabled={!canCloseWorkspace}
              onClick={() => {
                if (!activeWorkspaceId) {
                  return
                }
                closeWorkspace(activeWorkspaceId)
              }}
              title="Close Workspace"
              type="button"
            >
              <span aria-hidden="true" className="header-action-icon">
                <CloseIcon />
              </span>
              <span className="header-action-label">Close</span>
            </button>
            <button
              aria-label="Open Workspace"
              className="header-action-button"
              onClick={() => void openWorkspace()}
              title="Open Workspace"
              type="button"
            >
              <span aria-hidden="true" className="header-action-icon">
                <OpenIcon />
              </span>
              <span className="header-action-label">Open</span>
            </button>
          </div>
        </div>
      </header>

      {bannerMessage && (
        <div className="text-banner" role="alert">
          <span>{bannerMessage}</span>
          <button onClick={clearBanner}>Dismiss</button>
        </div>
      )}

      <section
        className="workspace-layout"
        ref={workspaceLayoutRef}
        style={workspaceLayoutStyle}
      >
        <div className="pane-slot">
          <section className="file-panel" data-testid="file-panel">
            <div className="workspace-summary">
              <p className="label">Current Workspace</p>
              <p
                className="path workspace-summary-path"
                data-testid="workspace-path"
                title={rootPath ?? ''}
              >
                {displayPath}
              </p>
              <div className="workspace-watch-status">
                <span className="workspace-watch-status-label">Mode:</span>
                <span
                  className="workspace-watch-status-value"
                  data-testid="workspace-watch-mode-value"
                >
                  {formatWorkspaceWatchMode(watchMode)}
                </span>
                {isRemoteMounted && (
                  <span
                    className="workspace-remote-badge"
                    data-testid="workspace-remote-badge"
                  >
                    REMOTE
                  </span>
                )}
              </div>
              <div className="workspace-watch-preference">
                <label
                  className="workspace-watch-preference-label"
                  htmlFor="workspace-watch-preference-select"
                >
                  Watch Mode
                </label>
                <select
                  className="workspace-watch-preference-select"
                  data-testid="workspace-watch-mode-preference"
                  disabled={!rootPath}
                  id="workspace-watch-preference-select"
                  onChange={handleWatchModePreferenceChange}
                  value={watchModePreference}
                >
                  <option value="auto">Auto</option>
                  <option value="native">Native</option>
                  <option value="polling">Polling</option>
                </select>
              </div>
            </div>
            <div className="workspace-open-in">
              <span className="workspace-open-in-label">Open In:</span>
              <div className="workspace-open-in-actions">
                <button
                  aria-label="Open in iTerm"
                  className="workspace-open-in-button"
                  data-testid="workspace-open-in-iterm"
                  disabled={!rootPath}
                  onClick={() => void openWorkspaceInExternalApp('iterm')}
                  title="Open in iTerm"
                  type="button"
                >
                  <ItermIcon />
                </button>
                <button
                  aria-label="Open in VSCode"
                  className="workspace-open-in-button"
                  data-testid="workspace-open-in-vscode"
                  disabled={!rootPath}
                  onClick={() => void openWorkspaceInExternalApp('vscode')}
                  title="Open in VSCode"
                  type="button"
                >
                  <VsCodeIcon />
                </button>
              </div>
            </div>
            <FileTreePanel
              activeFile={activeFile}
              expandedDirectories={expandedDirectories}
              fileTree={fileTree}
              changedFiles={changedFiles}
              isIndexing={isIndexing}
              onExpandedDirectoriesChange={setExpandedDirectories}
              onRequestCopyRelativePath={handleCopyRelativePath}
              onSelectFile={selectFile}
              rootPath={rootPath}
            />
          </section>
        </div>

        <div
          aria-label="Resize file browser and code preview panels"
          aria-orientation="vertical"
          className={`pane-resizer ${activeResizeHandle === 'left' ? 'is-active' : ''}`}
          data-testid="pane-resizer-left"
          onPointerDown={(event) => startResize('left', event.clientX)}
          role="separator"
        />

        <div className="pane-slot">
          <CodeViewerPanel
            activeFile={activeFile}
            activeFileContent={activeFileContent}
            activeFileImagePreview={activeFileImagePreview}
            commentLineEntries={activeFileCommentLineEntries}
            commentLineCounts={activeFileCommentLineCounts}
            isReadingFile={isReadingFile}
            jumpRequest={codeViewerJumpRequest}
            onSelectRange={setSelectionRange}
            onRequestCopyBoth={handleCopyBoth}
            onRequestCopyRelativePath={handleCopyRelativePath}
            onRequestCopySelectedContent={handleCopySelectedContent}
            onRequestAddComment={handleRequestAddComment}
            previewUnavailableReason={previewUnavailableReason}
            readFileError={readFileError}
            selectionRange={selectionRange}
          />
        </div>

        <div
          aria-label="Resize code preview and rendered spec panels"
          aria-orientation="vertical"
          className={`pane-resizer ${activeResizeHandle === 'right' ? 'is-active' : ''}`}
          data-testid="pane-resizer-right"
          onPointerDown={(event) => startResize('right', event.clientX)}
          role="separator"
        />

        <div className="pane-slot">
          <section className="workspace-card spec-panel" data-testid="spec-panel">
            <SpecViewerPanel
              activeSpecPath={activeSpec}
              commentLineEntries={activeSpecCommentLineEntries}
              commentLineCounts={activeSpecCommentLineCounts}
              isLoading={isReadingSpec}
              markdownContent={activeSpecContent}
              onScrollPositionChange={handleSpecScrollPositionChange}
              onRequestAddComment={handleRequestAddCommentFromSpec}
              onGoToSourceLine={goToActiveSpecSourceLine}
              onOpenRelativePath={openSpecRelativePath}
              readError={activeSpecReadError}
              restoredScrollTop={restoredSpecScrollTop}
              workspaceRootPath={rootPath}
            />
          </section>
        </div>
      </section>

      <CommentEditorModal
        isOpen={commentDraftState !== null}
        isSaving={isWritingComments}
        onCancel={() => {
          if (!isWritingComments) {
            setCommentDraftState(null)
          }
        }}
        onSave={handleSaveComment}
        relativePath={commentDraftState?.relativePath ?? null}
        selectionRange={commentDraftState?.selectionRange ?? null}
      />
      <CommentListModal
        comments={comments}
        isOpen={isViewCommentsModalOpen}
        isSaving={isWritingComments}
        onClose={() => {
          if (!isWritingComments) {
            setIsViewCommentsModalOpen(false)
          }
        }}
        onDeleteComment={handleDeleteComment}
        onDeleteExportedComments={handleDeleteExportedComments}
        onUpdateComment={handleUpdateComment}
      />
      <GlobalCommentsModal
        initialValue={globalCommentsModalState?.initialValue ?? ''}
        isOpen={globalCommentsModalState !== null}
        isSaving={isSavingGlobalCommentsModal}
        onCancel={() => {
          if (!isSavingGlobalCommentsModal) {
            setGlobalCommentsModalState(null)
          }
        }}
        onSave={handleSaveGlobalComments}
      />
      <ExportCommentsModal
        commentCount={comments.length}
        estimateBundleLength={estimateBundleLength}
        allowExportWithoutPendingComments={hasGlobalComments}
        isExporting={isExportingComments}
        isOpen={isExportModalOpen}
        maxClipboardChars={MAX_CLIPBOARD_CHARS}
        pendingCommentCount={pendingComments.length}
        onCancel={() => {
          if (!isExportingComments) {
            setIsExportModalOpen(false)
          }
        }}
        onConfirm={handleExportComments}
      />
    </main>
  )
}

export default App
