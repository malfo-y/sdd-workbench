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
  CodeEditorPanel,
  type CodeViewerJumpRequest,
} from './code-editor/code-editor-panel'
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
const MIN_CONTENT_PANE_WIDTH = 360
const RESIZER_WIDTH = 12
const TRACKPAD_HISTORY_MIN_AXIS_DELTA = 18
const TRACKPAD_HISTORY_TRIGGER_DELTA = 120
const TRACKPAD_HISTORY_IDLE_RESET_MS = 160
const TRACKPAD_HISTORY_COOLDOWN_MS = 380
const COMMENT_BANNER_AUTODISMISS_MS = 5000

type PaneSizes = {
  left: number
  content: number
}

type ResizeSession = {
  startX: number
  availableWidth: number
  startSizes: PaneSizes
}

type ContentTab = 'code' | 'spec'

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

type CommentBannerState = {
  message: string
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

function FinderIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4 4.5C4 3.67 4.67 3 5.5 3H18.5C19.33 3 20 3.67 20 4.5V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5V4.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <circle cx="9.5" cy="10" fill="currentColor" r="1.2" />
      <circle cx="14.5" cy="10" fill="currentColor" r="1.2" />
      <path
        d="M9 14.5C9.8 15.6 11 16.2 12 16.2C13 16.2 14.2 15.6 15 14.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
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

function BackArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M15 6L9 12L15 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ForwardArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M9 6L15 12L9 18"
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
    activeFileGitLineMarkers,
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
    loadingDirectories,
    watchModePreference,
    watchMode,
    isRemoteMounted,
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
    saveComments,
    saveGlobalComments,
    showBanner,
    setSelectionRange,
    setExpandedDirectories,
    loadDirectoryChildren,
    setWatchModePreference,
    clearBanner,
    externalChangeDetected,
    reloadExternalChange,
    dismissExternalChange,
    isDirty,
    saveFile,
    markFileDirty,
    createFile,
    createDirectory,
    deleteFile,
    deleteDirectory,
  } = useWorkspace()
  const displayPath = rootPath
    ? abbreviateWorkspacePath(rootPath)
    : 'No workspace selected'
  const [paneSizes, setPaneSizes] = useState<PaneSizes>({
    left: 20,
    content: 80,
  })
  const [activeResizeHandle, setActiveResizeHandle] = useState(false)
  const [activeTab, setActiveTab] = useState<ContentTab>('code')
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
  const historyNavigationRef = useRef(false)
  const specScrollPositionsRef = useRef<Record<string, number>>({})
  const [commentDraftState, setCommentDraftState] =
    useState<CommentDraftState | null>(null)
  const [globalCommentsModalState, setGlobalCommentsModalState] =
    useState<GlobalCommentsModalState | null>(null)
  const [isSavingGlobalCommentsModal, setIsSavingGlobalCommentsModal] =
    useState(false)
  const [isViewCommentsModalOpen, setIsViewCommentsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportSelectedCommentIds, setExportSelectedCommentIds] = useState<string[] | null>(null)
  const [exportIncludeGlobalComments, setExportIncludeGlobalComments] = useState(false)
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
  const activeFileGitLineMarkerMap = useMemo(
    () =>
      new Map(
        activeFileGitLineMarkers.map((marker) => [marker.line, marker.kind] as const),
      ),
    [activeFileGitLineMarkers],
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
  const [commentBannerState, setCommentBannerState] =
    useState<CommentBannerState | null>(null)

  const showCommentBanner = useCallback(
    (message: string) => {
      showBanner(message)
      setCommentBannerState({
        message,
      })
    },
    [showBanner],
  )

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
    (relativePath: string, selectionRange?: LineSelectionRange) => {
      if (activeWorkspaceId === null) {
        return
      }

      const payload = buildCopyActiveFilePathPayload(relativePath, selectionRange)
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
        showCommentBanner('Cannot add comment: no active workspace selected.')
        return
      }

      setCommentDraftState({
        workspaceId: activeWorkspaceId,
        relativePath: input.relativePath,
        selectionRange: input.selectionRange,
        fileContent: input.content,
      })
    },
    [activeWorkspaceId, showCommentBanner],
  )

  const handleSaveComment = useCallback(
    async (body: string) => {
      if (!commentDraftState) {
        return
      }

      if (!activeWorkspaceId || activeWorkspaceId !== commentDraftState.workspaceId) {
        setCommentDraftState(null)
        showCommentBanner('Cannot save comment: active workspace changed.')
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
        showCommentBanner('Comment saved.')
      } catch (error) {
        showCommentBanner(
          error instanceof Error
            ? `Cannot save comment: ${error.message}`
            : 'Cannot save comment.',
        )
      }
    },
    [
      activeWorkspaceId,
      commentDraftState,
      comments,
      saveComments,
      showCommentBanner,
    ],
  )

  const effectiveExportGlobalComments = exportIncludeGlobalComments ? globalComments : ''
  const effectiveExportHasGlobalComments = exportIncludeGlobalComments && hasGlobalComments

  const estimateBundleLength = useCallback(
    (instruction: string) => {
      const commentsForEstimate = exportSelectedCommentIds
        ? comments.filter((c) => exportSelectedCommentIds.includes(c.id))
        : pendingComments
      return renderLlmBundle({
        instruction,
        comments: commentsForEstimate,
        globalComments: effectiveExportGlobalComments,
      }).length
    },
    [comments, effectiveExportGlobalComments, exportSelectedCommentIds, pendingComments],
  )

  const handleSaveGlobalComments = useCallback(
    async (body: string) => {
      const targetWorkspaceId = globalCommentsModalState?.workspaceId
      if (!targetWorkspaceId) {
        showCommentBanner('Cannot save global comments: no active workspace selected.')
        return
      }

      setIsSavingGlobalCommentsModal(true)
      try {
        const saved = await saveGlobalComments(body, targetWorkspaceId)
        if (!saved) {
          return
        }

        showCommentBanner('Global comments saved.')
        setGlobalCommentsModalState(null)
      } finally {
        setIsSavingGlobalCommentsModal(false)
      }
    },
    [globalCommentsModalState, saveGlobalComments, showCommentBanner],
  )

  const handleRequestAddCommentFromSpec = useCallback(
    (input: {
      relativePath: string
      selectionRange: LineSelectionRange
    }) => {
      if (!activeWorkspaceId) {
        showCommentBanner('Cannot add comment: no active workspace selected.')
        return
      }

      if (
        !activeSpec ||
        input.relativePath !== activeSpec ||
        activeSpecContent === null
      ) {
        showCommentBanner('Cannot add comment: active spec content is unavailable.')
        return
      }

      setCommentDraftState({
        workspaceId: activeWorkspaceId,
        relativePath: input.relativePath,
        selectionRange: input.selectionRange,
        fileContent: activeSpecContent,
      })
    },
    [activeSpec, activeSpecContent, activeWorkspaceId, showCommentBanner],
  )

  const handleExportComments = useCallback(
    async (input: ExportCommentsModalInput) => {
      if (!rootPath || !activeWorkspaceId) {
        showCommentBanner('Cannot export comments: no active workspace selected.')
        return
      }

      const exportSnapshot = exportSelectedCommentIds
        ? comments.filter((c) => exportSelectedCommentIds.includes(c.id))
        : pendingComments

      if (exportSnapshot.length === 0 && !effectiveExportHasGlobalComments) {
        showCommentBanner('No pending comments to export.')
        return
      }
      const commentsMarkdown = renderCommentsMarkdown(exportSnapshot, {
        globalComments: effectiveExportGlobalComments,
      })
      const bundleMarkdown = renderLlmBundle({
        instruction: input.instruction,
        comments: exportSnapshot,
        globalComments: effectiveExportGlobalComments,
      })
      const isClipboardAllowed = bundleMarkdown.length <= MAX_CLIPBOARD_CHARS
      const shouldCopyToClipboard = input.copyToClipboard && isClipboardAllowed

      if (input.copyToClipboard && !isClipboardAllowed) {
        showCommentBanner(
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
            showCommentBanner(`Failed to export comments: ${fileExportError}`)
            return
          }
          if (failedTargets.length > 0) {
            showCommentBanner(`Failed export target: ${failedTargets.join(', ')}.`)
            return
          }
          showCommentBanner('No export target selected.')
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
            showCommentBanner('Comments exported, but failed to record export status.')
            return
          }
        }

        if (failedTargets.length > 0) {
          showCommentBanner(
            `Comments exported: ${completedTargets.join(', ')}. Failed: ${failedTargets.join(', ')}.`,
          )
        } else {
          showCommentBanner(`Comments exported: ${completedTargets.join(', ')}.`)
        }
        setIsExportModalOpen(false)
        setExportSelectedCommentIds(null)
        setExportIncludeGlobalComments(false)
      } finally {
        setIsExportingComments(false)
      }
    },
    [
      activeWorkspaceId,
      comments,
      effectiveExportGlobalComments,
      effectiveExportHasGlobalComments,
      exportSelectedCommentIds,
      pendingComments,
      rootPath,
      saveComments,
      showCommentBanner,
      writeToClipboard,
    ],
  )

  const handleUpdateComment = useCallback(
    async (commentId: string, body: string) => {
      if (!activeWorkspaceId) {
        showCommentBanner('Cannot update comment: no active workspace selected.')
        return false
      }

      const sanitizedBody = sanitizeCommentBody(body)
      if (sanitizedBody.length === 0) {
        showCommentBanner('Cannot save comment: comment body is empty.')
        return false
      }

      const hasTargetComment = comments.some((comment) => comment.id === commentId)
      if (!hasTargetComment) {
        showCommentBanner('Cannot update comment: target comment not found.')
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
      showCommentBanner('Comment updated.')
      return true
    },
    [activeWorkspaceId, comments, saveComments, showCommentBanner],
  )

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!activeWorkspaceId) {
        showCommentBanner('Cannot delete comment: no active workspace selected.')
        return false
      }

      const nextComments = comments.filter((comment) => comment.id !== commentId)
      if (nextComments.length === comments.length) {
        showCommentBanner('Cannot delete comment: target comment not found.')
        return false
      }

      const saved = await saveComments(nextComments)
      if (!saved) {
        return false
      }
      showCommentBanner('Comment deleted.')
      return true
    },
    [activeWorkspaceId, comments, saveComments, showCommentBanner],
  )

  const handleDeleteExportedComments = useCallback(async () => {
    if (!activeWorkspaceId) {
      showCommentBanner('Cannot delete exported comments: no active workspace selected.')
      return false
    }

    const exportedCommentCount = comments.filter(
      (comment) => Boolean(comment.exportedAt),
    ).length
    if (exportedCommentCount === 0) {
      showCommentBanner('No exported comments to delete.')
      return false
    }

    const nextComments = comments.filter((comment) => !comment.exportedAt)
    const saved = await saveComments(nextComments)
    if (!saved) {
      return false
    }
    showCommentBanner(`Deleted ${exportedCommentCount} exported comment(s).`)
    return true
  }, [activeWorkspaceId, comments, saveComments, showCommentBanner])

  const openWorkspaceInExternalApp = useCallback(
    async (target: 'iterm' | 'vscode' | 'finder') => {
      if (!rootPath) {
        return
      }

      const targetLabels: Record<typeof target, string> = {
        iterm: 'iTerm',
        vscode: 'VSCode',
        finder: 'Finder',
      }
      const targetLabel = targetLabels[target]
      try {
        let result: SystemOpenInResult
        if (target === 'iterm') {
          result = await window.workspace.openInIterm(rootPath)
        } else if (target === 'vscode') {
          result = await window.workspace.openInVsCode(rootPath)
        } else {
          result = await window.workspace.openInFinder(rootPath)
        }
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
        '--pane-content': `${paneSizes.content}%`,
      }) as CSSProperties,
    [paneSizes],
  )

  const startResize = (clientX: number) => {
    const layoutElement = workspaceLayoutRef.current
    if (!layoutElement) {
      return
    }

    const layoutWidth = layoutElement.getBoundingClientRect().width
    const availableWidth = layoutWidth - RESIZER_WIDTH
    const minimumWidthSum = MIN_LEFT_PANE_WIDTH + MIN_CONTENT_PANE_WIDTH

    if (availableWidth <= minimumWidthSum) {
      return
    }

    resizeSessionRef.current = {
      startX: clientX,
      availableWidth,
      startSizes: paneSizes,
    }
    setActiveResizeHandle(true)
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
      const maxLeftWidth = availableWidth - MIN_CONTENT_PANE_WIDTH
      const nextLeftWidth = clamp(
        startLeftWidth + deltaX,
        MIN_LEFT_PANE_WIDTH,
        maxLeftWidth,
      )
      const nextContentWidth = availableWidth - nextLeftWidth

      setPaneSizes({
        left: (nextLeftWidth / availableWidth) * 100,
        content: (nextContentWidth / availableWidth) * 100,
      })
    }

    const stopResize = () => {
      resizeSessionRef.current = null
      setActiveResizeHandle(false)
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

      setActiveTab(relativePath.endsWith('.md') ? 'spec' : 'code')
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

  const handleSelectFileFromTree = useCallback(
    (relativePath: string) => {
      selectFile(relativePath)
      setActiveTab(relativePath.endsWith('.md') ? 'spec' : 'code')
    },
    [selectFile],
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
      } else {
        setActiveTab('code')
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

    if (historyNavigationRef.current) {
      historyNavigationRef.current = false
      setActiveTab(activeFile.endsWith('.md') ? 'spec' : 'code')
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

  useEffect(() => {
    if (!bannerMessage) {
      setCommentBannerState(null)
      return
    }

    if (!commentBannerState || bannerMessage !== commentBannerState.message) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      clearBanner()
      setCommentBannerState(null)
    }, COMMENT_BANNER_AUTODISMISS_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [bannerMessage, clearBanner, commentBannerState])

  useEffect(() => {
    if (!isDirty) {
      return
    }
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [isDirty])

  const navigateHistory = useCallback(
    (direction: 'back' | 'forward') => {
      historyNavigationRef.current = true
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || !event.shiftKey) return

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        setActiveTab(event.key === 'ArrowLeft' ? 'code' : 'spec')
        return
      }

      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

      event.preventDefault()

      const currentIndex = workspaces.findIndex(
        (ws) => ws.id === activeWorkspaceId,
      )
      if (currentIndex === -1 || workspaces.length < 2) return

      const nextIndex =
        event.key === 'ArrowUp'
          ? (currentIndex - 1 + workspaces.length) % workspaces.length
          : (currentIndex + 1) % workspaces.length

      switchWorkspace(workspaces[nextIndex].id)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [workspaces, activeWorkspaceId, switchWorkspace])

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

  const handleDismissBanner = useCallback(() => {
    setCommentBannerState(null)
    clearBanner()
  }, [clearBanner])

  const handleRequestCreateFile = useCallback(
    async (relativePath: string) => {
      await createFile(relativePath)
    },
    [createFile],
  )

  const handleRequestCreateDirectory = useCallback(
    async (relativePath: string) => {
      await createDirectory(relativePath)
    },
    [createDirectory],
  )

  const handleRequestDeleteFile = useCallback(
    async (relativePath: string) => {
      const fileName = relativePath.split('/').pop() ?? relativePath

      if (isDirty && activeFile === relativePath) {
        const proceedWithDirty = window.confirm(
          `"${fileName}" has unsaved changes. Delete anyway?`
        )
        if (!proceedWithDirty) return
      }

      const confirmed = window.confirm(
        `Delete file "${fileName}"?\n\nThis action cannot be undone.`
      )
      if (!confirmed) return

      await deleteFile(relativePath)
    },
    [deleteFile, isDirty, activeFile],
  )

  const handleRequestDeleteDirectory = useCallback(
    async (relativePath: string) => {
      const dirName = relativePath.split('/').pop() ?? relativePath

      const activeFileIsInside = activeFile?.startsWith(relativePath + '/') ?? false
      if (isDirty && activeFileIsInside) {
        const proceedWithDirty = window.confirm(
          `The currently open file has unsaved changes. Delete directory "${dirName}" anyway?`
        )
        if (!proceedWithDirty) return
      }

      const confirmed = window.confirm(
        `Delete directory "${dirName}" and all its contents?\n\nThis action cannot be undone.`
      )
      if (!confirmed) return

      await deleteDirectory(relativePath)
    },
    [deleteDirectory, isDirty, activeFile],
  )

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header-left" data-testid="app-header-left">
          <h1>SDD Workbench</h1>
          <div
            className="header-history-actions"
            data-testid="header-history-actions"
          >
            <button
              aria-label="Back"
              className="workspace-open-in-button"
              disabled={!canGoBack}
              onClick={goBackInHistory}
              title="Back"
              type="button"
            >
              <BackArrowIcon />
            </button>
            <button
              aria-label="Forward"
              className="workspace-open-in-button"
              disabled={!canGoForward}
              onClick={goForwardInHistory}
              title="Forward"
              type="button"
            >
              <ForwardArrowIcon />
            </button>
          </div>
          <div className="content-tab-bar" data-testid="content-tab-bar">
            <button
              className={`content-tab-button${activeTab === 'code' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('code')}
              type="button"
            >
              Code
            </button>
            <button
              className={`content-tab-button${activeTab === 'spec' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('spec')}
              type="button"
            >
              Spec
            </button>
          </div>
        </div>
        <div className="app-header-actions" data-testid="app-header-actions">
          <div className="header-comments-group" data-testid="header-comments-group">
            <span className="header-action-group-label">Code comments</span>
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
            </div>
          </div>
        </div>
      </header>

      {externalChangeDetected && (
        <div className="text-banner" data-testid="external-change-banner" role="alert">
          <span>File changed on disk. Reload?</span>
          <div>
            <button onClick={reloadExternalChange} type="button">Reload</button>
            <button onClick={dismissExternalChange} type="button">Dismiss</button>
          </div>
        </div>
      )}

      {!externalChangeDetected && bannerMessage && (
        <div className="text-banner" role="alert">
          <span>{bannerMessage}</span>
          <button onClick={handleDismissBanner}>Dismiss</button>
        </div>
      )}

      <section
        className="workspace-layout"
        ref={workspaceLayoutRef}
        style={workspaceLayoutStyle}
      >
        <div className="pane-slot">
          <section className="file-panel" data-testid="file-panel">
            <div className="sidebar-workspace-group" data-testid="sidebar-workspace-group">
              <div className="sidebar-workspace-controls">
                <WorkspaceSwitcher
                  activeWorkspaceId={activeWorkspaceId}
                  onSelectWorkspace={setActiveWorkspace}
                  workspaces={workspaces}
                />
                <div className="sidebar-workspace-actions" data-testid="sidebar-workspace-actions">
                  <button
                    aria-label="Open Workspace"
                    className="workspace-open-in-button"
                    onClick={() => void openWorkspace()}
                    title="Open Workspace"
                    type="button"
                  >
                    <OpenIcon />
                  </button>
                  <button
                    aria-label="Close Workspace"
                    className="workspace-open-in-button"
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
                    <CloseIcon />
                  </button>
                </div>
              </div>
            </div>
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
                <button
                  aria-label="Open in Finder"
                  className="workspace-open-in-button"
                  data-testid="workspace-open-in-finder"
                  disabled={!rootPath}
                  onClick={() => void openWorkspaceInExternalApp('finder')}
                  title="Open in Finder"
                  type="button"
                >
                  <FinderIcon />
                </button>
              </div>
            </div>
            <FileTreePanel
              activeFile={activeFile}
              expandedDirectories={expandedDirectories}
              fileTree={fileTree}
              changedFiles={changedFiles}
              loadingDirectories={loadingDirectories}
              isIndexing={isIndexing}
              onExpandedDirectoriesChange={setExpandedDirectories}
              onRequestCopyRelativePath={handleCopyRelativePath}
              onRequestLoadDirectory={loadDirectoryChildren}
              onSelectFile={handleSelectFileFromTree}
              rootPath={rootPath}
              onRequestCreateFile={handleRequestCreateFile}
              onRequestCreateDirectory={handleRequestCreateDirectory}
              onRequestDeleteFile={handleRequestDeleteFile}
              onRequestDeleteDirectory={handleRequestDeleteDirectory}
            />
          </section>
        </div>

        <div
          aria-label="Resize sidebar and content panels"
          aria-orientation="vertical"
          className={`pane-resizer ${activeResizeHandle ? 'is-active' : ''}`}
          data-testid="pane-resizer-left"
          onPointerDown={(event) => startResize(event.clientX)}
          role="separator"
        />

        <div className="pane-slot">
          <div className={`content-pane-wrapper${activeTab !== 'code' ? ' is-hidden' : ''}`} data-testid="content-pane-code">
            <CodeEditorPanel
              activeFile={activeFile}
              activeFileContent={activeFileContent}
              activeFileImagePreview={activeFileImagePreview}
              commentLineEntries={activeFileCommentLineEntries}
              commentLineCounts={activeFileCommentLineCounts}
              gitLineMarkers={activeFileGitLineMarkerMap}
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
              editable
              onSave={saveFile}
              onDirtyChange={(dirty) => { if (dirty) markFileDirty() }}
            />
          </div>
          <div className={`content-pane-wrapper${activeTab !== 'spec' ? ' is-hidden' : ''}`} data-testid="content-pane-spec">
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
        globalComments={globalComments}
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
        onRequestExport={(selectedIds, includeGlobal) => {
          setExportSelectedCommentIds(selectedIds)
          setExportIncludeGlobalComments(includeGlobal)
          setIsViewCommentsModalOpen(false)
          setIsExportModalOpen(true)
        }}
        onJumpToComment={(relativePath, startLine, endLine) => {
          setIsViewCommentsModalOpen(false)
          if (!workspaceFilePathSet.has(relativePath)) {
            return
          }
          setActiveTab('code')
          selectFile(relativePath)
          setSelectionRange({ startLine, endLine })
          jumpRequestTokenRef.current += 1
          setCodeViewerJumpRequest({
            targetRelativePath: relativePath,
            lineNumber: startLine,
            token: jumpRequestTokenRef.current,
          })
        }}
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
        commentCount={exportSelectedCommentIds ? exportSelectedCommentIds.length : comments.length}
        estimateBundleLength={estimateBundleLength}
        hasGlobalComments={effectiveExportHasGlobalComments}
        allowExportWithoutPendingComments={Boolean(exportSelectedCommentIds) || effectiveExportHasGlobalComments}
        isExporting={isExportingComments}
        isOpen={isExportModalOpen}
        maxClipboardChars={MAX_CLIPBOARD_CHARS}
        pendingCommentCount={exportSelectedCommentIds
          ? comments.filter((c) => exportSelectedCommentIds.includes(c.id) && !c.exportedAt).length
          : pendingComments.length}
        onCancel={() => {
          if (!isExportingComments) {
            setIsExportModalOpen(false)
            setExportSelectedCommentIds(null)
            setExportIncludeGlobalComments(false)
          }
        }}
        onConfirm={handleExportComments}
      />
    </main>
  )
}

export default App
