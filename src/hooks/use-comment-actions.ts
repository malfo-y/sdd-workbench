import { useCallback, useMemo, useState } from 'react'
import { buildCodeComment } from '../code-comments/comment-anchor'
import { MAX_CLIPBOARD_CHARS } from '../code-comments/comment-config'
import { renderCommentsMarkdown, renderLlmBundle } from '../code-comments/comment-export'
import { sanitizeCommentBody, type CodeComment } from '../code-comments/comment-types'
import type { ExportCommentsModalInput } from '../code-comments/export-comments-modal'
import {
  buildCopyActiveFilePathPayload,
  buildCopyFullPathPayload,
  buildCopySelectedContentPayload,
  buildCopySelectedLinesPayload,
} from '../context-copy/copy-payload'
import type { SourceOffsetRange } from '../source-selection'
import type { LineSelectionRange } from '../workspace/workspace-model'

type CommentDraftState = {
  mode: 'add' | 'edit'
  workspaceId: string
  relativePath: string
  selectionRange: LineSelectionRange
  commentId?: string
  initialBody: string
  sourceOffsetRange?: SourceOffsetRange
  fileContent?: string
}

type GlobalCommentsModalState = {
  workspaceId: string
  initialValue: string
}

export type UseCommentActionsParams = {
  activeWorkspaceId: string | null
  activeWorkspaceFullRootPath: string | null
  rootPath: string | null
  activeSpec: string | null
  activeSpecContent: string | null
  comments: CodeComment[]
  globalComments: string
  showBanner: (message: string) => void
  saveComments: (comments: CodeComment[]) => Promise<boolean>
  saveGlobalComments: (body: string, workspaceId: string) => Promise<boolean>
}

export function useCommentActions(params: UseCommentActionsParams) {
  const {
    activeWorkspaceId,
    activeWorkspaceFullRootPath,
    rootPath,
    activeSpec,
    activeSpecContent,
    comments,
    globalComments,
    showBanner,
    saveComments,
    saveGlobalComments,
  } = params

  const showCommentBanner = showBanner

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

  const pendingComments = useMemo(
    () => comments.filter((comment) => !comment.exportedAt),
    [comments],
  )

  const hasGlobalComments = globalComments.trim().length > 0
  const effectiveExportGlobalComments = exportIncludeGlobalComments ? globalComments : ''
  const effectiveExportHasGlobalComments = exportIncludeGlobalComments && hasGlobalComments

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

  const handleCopyFullPath = useCallback(
    (relativePath: string) => {
      if (activeWorkspaceId === null || !activeWorkspaceFullRootPath) {
        return
      }

      const payload = buildCopyFullPathPayload(
        activeWorkspaceFullRootPath,
        relativePath,
      )
      void writeToClipboard(payload, 'Failed to copy full path.')
    },
    [activeWorkspaceFullRootPath, activeWorkspaceId, writeToClipboard],
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
        mode: 'add',
        workspaceId: activeWorkspaceId,
        relativePath: input.relativePath,
        selectionRange: input.selectionRange,
        initialBody: '',
        fileContent: input.content,
      })
    },
    [activeWorkspaceId, showCommentBanner],
  )

  const handleRequestEditComment = useCallback(
    (comment: {
      id: string
      relativePath: string
      startLine: number
      endLine: number
      body: string
    }) => {
      if (!activeWorkspaceId) {
        showCommentBanner('Cannot edit comment: no active workspace selected.')
        return
      }

      setCommentDraftState({
        mode: 'edit',
        workspaceId: activeWorkspaceId,
        relativePath: comment.relativePath,
        selectionRange: {
          startLine: comment.startLine,
          endLine: comment.endLine,
        },
        commentId: comment.id,
        initialBody: comment.body,
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

      if (commentDraftState.mode === 'edit') {
        if (!commentDraftState.commentId) {
          showCommentBanner('Cannot update comment: target comment not found.')
          return
        }

        const sanitizedBody = sanitizeCommentBody(body)
        if (sanitizedBody.length === 0) {
          showCommentBanner('Cannot save comment: comment body is empty.')
          return
        }

        const hasTargetComment = comments.some(
          (comment) => comment.id === commentDraftState.commentId,
        )
        if (!hasTargetComment) {
          showCommentBanner('Cannot update comment: target comment not found.')
          return
        }

        const nextComments = comments.map((comment) =>
          comment.id === commentDraftState.commentId
            ? {
                ...comment,
                body: sanitizedBody,
              }
            : comment,
        )

        const saved = await saveComments(nextComments)
        if (!saved) {
          return
        }

        setCommentDraftState(null)
        showCommentBanner('Comment updated.')
        return
      }

      try {
        const nextComment = buildCodeComment({
          relativePath: commentDraftState.relativePath,
          selectionRange: commentDraftState.selectionRange,
          sourceOffsetRange: commentDraftState.sourceOffsetRange,
          body,
          fileContent: commentDraftState.fileContent ?? '',
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

  const handleSaveGlobalCommentsFromList = useCallback(
    async (body: string) => {
      if (!activeWorkspaceId) {
        showCommentBanner('Cannot save global comments: no active workspace selected.')
        return false
      }

      const saved = await saveGlobalComments(body, activeWorkspaceId)
      if (!saved) {
        return false
      }

      showCommentBanner(
        body.trim().length === 0
          ? 'Global comments cleared.'
          : 'Global comments saved.',
      )
      return true
    },
    [activeWorkspaceId, saveGlobalComments, showCommentBanner],
  )

  const handleRequestAddCommentFromSpec = useCallback(
    (input: {
      relativePath: string
      selectionRange: LineSelectionRange
      sourceOffsetRange?: SourceOffsetRange
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
        mode: 'add',
        workspaceId: activeWorkspaceId,
        relativePath: input.relativePath,
        selectionRange: input.selectionRange,
        initialBody: '',
        ...(input.sourceOffsetRange
          ? { sourceOffsetRange: input.sourceOffsetRange }
          : {}),
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
          const nextComments = input.deleteExportedComments
            ? comments.filter((comment) => !exportedCommentIds.has(comment.id))
            : comments.map((comment) =>
                exportedCommentIds.has(comment.id)
                  ? { ...comment, exportedAt: exportTimestamp }
                  : comment,
              )

          const isStatusSaved = await saveComments(nextComments)
          if (!isStatusSaved) {
            showCommentBanner(
              input.deleteExportedComments
                ? 'Comments exported, but failed to delete exported comments.'
                : 'Comments exported, but failed to record export status.',
            )
            return
          }
        }

        if (input.deleteExportedComments && effectiveExportHasGlobalComments) {
          const isGlobalCommentsCleared = await saveGlobalComments(
            '',
            activeWorkspaceId,
          )
          if (!isGlobalCommentsCleared) {
            showCommentBanner('Comments exported, but failed to clear global comments.')
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
      saveGlobalComments,
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

  const handleRequestDeleteComment = useCallback(
    async (comment: {
      id: string
      relativePath: string
      startLine: number
      endLine: number
    }) => {
      if (!activeWorkspaceId) {
        showCommentBanner('Cannot delete comment: no active workspace selected.')
        return
      }

      const confirmed = window.confirm(
        `Delete comment at ${comment.relativePath}:L${comment.startLine}-L${comment.endLine}?`,
      )
      if (!confirmed) {
        return
      }

      await handleDeleteComment(comment.id)
    },
    [activeWorkspaceId, handleDeleteComment, showCommentBanner],
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

  const openRequestExport = useCallback((selectedIds: string[], includeGlobal: boolean) => {
    setExportSelectedCommentIds(selectedIds)
    setExportIncludeGlobalComments(includeGlobal)
    setIsViewCommentsModalOpen(false)
    setIsExportModalOpen(true)
  }, [])

  const closeExportModal = useCallback(() => {
    if (!isExportingComments) {
      setIsExportModalOpen(false)
      setExportSelectedCommentIds(null)
      setExportIncludeGlobalComments(false)
    }
  }, [isExportingComments])

  const dismissCommentDraft = useCallback(() => {
    setCommentDraftState(null)
  }, [])

  const clearCommentDraftIfStale = useCallback(
    (currentActiveFile: string | null, currentWorkspaceId: string | null) => {
      if (!commentDraftState) {
        return
      }

      if (
        !currentWorkspaceId ||
        currentWorkspaceId !== commentDraftState.workspaceId ||
        currentActiveFile !== commentDraftState.relativePath
      ) {
        setCommentDraftState(null)
      }
    },
    [commentDraftState],
  )

  return {
    commentDraftState,
    globalCommentsModalState,
    setGlobalCommentsModalState,
    isSavingGlobalCommentsModal,
    isViewCommentsModalOpen,
    setIsViewCommentsModalOpen,
    isExportModalOpen,
    exportSelectedCommentIds,
    exportIncludeGlobalComments,
    isExportingComments,
    pendingComments,
    hasGlobalComments,
    effectiveExportHasGlobalComments,
    writeToClipboard,
    handleCopyRelativePath,
    handleCopyFullPath,
    handleCopyBoth,
    handleCopySelectedContent,
    handleRequestAddComment,
    handleRequestEditComment,
    handleSaveComment,
    estimateBundleLength,
    handleSaveGlobalComments,
    handleSaveGlobalCommentsFromList,
    handleRequestAddCommentFromSpec,
    handleExportComments,
    handleUpdateComment,
    handleDeleteComment,
    handleRequestDeleteComment,
    handleDeleteExportedComments,
    openRequestExport,
    closeExportModal,
    dismissCommentDraft,
    clearCommentDraftIfStale,
  }
}
