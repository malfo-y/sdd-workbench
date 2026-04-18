import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type UIEvent,
} from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { AppearanceTheme } from '../appearance-theme'
import {
  findMostRecentCommentInSelectionRange,
} from '../code-comments/comment-line-index'
import { CommentHoverPopover } from '../code-comments/comment-hover-popover'
import { CommentMarkerDetailPanel } from '../code-comments/comment-marker-detail-panel'
import { type CodeComment } from '../code-comments/comment-types'
import { CopyActionPopover } from '../context-menu/copy-action-popover'
import { buildCopyActiveFilePathPayload } from '../context-copy/copy-payload'
import { extractMarkdownHeadings } from './markdown-utils'
import {
  MARKDOWN_SANITIZE_SCHEMA,
  sanitizeMarkdownUri,
} from './markdown-security'
import { SpecLinkPopover } from './spec-link-popover'
import {
  resolveBestRenderedSourceBlockForLine,
  resolveNearestSourceLineFromPoint,
  resolveSourceSelectionRangeFromSelection,
  resolveSourceLine,
} from './source-line-resolver'
import { buildSourceLineAttributes } from './source-line-metadata'
import { resolveSpecLink, type SpecLinkLineRange } from './spec-link-utils'
import { buildSearchMatchStartLines } from './spec-search'
import { rehypeWrapSourceTextLeaves } from './rehype-source-text-leaves'
import type { SourceOffsetRange } from '../source-selection'
import {
  type CitationNavigationResult,
  type CitationTarget,
} from './citation-target'
import { remarkCitationLinks } from './remark-citation-links'
import {
  areLineArraysEqual,
  areLineCommentMapsEqual,
  areLineCountMapsEqual,
  collectRenderedCommentMarkerAnchors,
  collectRenderedSourceLines,
  mapCommentCountsToMarkerAnchors,
  mapCommentEntriesToMarkerAnchors,
} from './spec-viewer-comment-markers'
import { createSpecViewerMarkdownComponents } from './spec-viewer-markdown-components'
import {
  hasVisibleSelectionInElement,
  mapSearchMatchLinesToRenderedSourceLines,
} from './spec-viewer-helpers'
import {
  findHeadingElement,
  resolveActiveHeadingId,
  scrollToHeadingById,
} from './spec-viewer-scroll'

type SpecViewerPanelProps = {
  workspaceRootPath: string | null
  activeSpecPath: string | null
  markdownContent: string | null
  appearanceTheme?: AppearanceTheme
  navigationRequest?: {
    targetRelativePath: string
    token: number
    lineNumber?: number
    headingId?: string
  } | null
  isActive?: boolean
  isLoading: boolean
  readError: string | null
  onOpenRelativePath: (
    relativePath: string,
    lineRange: SpecLinkLineRange | null,
    headingId?: string | null,
  ) => boolean
  onOpenCitationTarget: (
    target: CitationTarget,
  ) => Promise<CitationNavigationResult>
  onGoToSourceLine: (
    lineNumber: number,
    sourceOffsetRange?: SourceOffsetRange,
  ) => void
  onRequestAddComment: (input: {
    relativePath: string
    selectionRange: { startLine: number; endLine: number }
    sourceOffsetRange?: SourceOffsetRange
  }) => void
  onRequestEditComment: (comment: CodeComment) => void
  onRequestDeleteComment: (comment: CodeComment) => void
  onRequestCopySelectedContent: (input: {
    relativePath: string
    content: string
    selectionRange: { startLine: number; endLine: number }
  }) => void
  onRequestCopyBoth: (input: {
    relativePath: string
    content: string
    selectionRange: { startLine: number; endLine: number }
  }) => void
  onRequestCopyRelativePath: (
    relativePath: string,
    selectionRange?: { startLine: number; endLine: number },
  ) => void
  commentLineCounts: ReadonlyMap<number, number>
  commentLineEntries?: ReadonlyMap<number, readonly CodeComment[]>
  restoredScrollTop?: number | null
  onScrollPositionChange?: (input: {
    relativePath: string
    scrollTop: number
  }) => void
}

type LinkPopoverState = {
  href: string
  message?: string
  x: number
  y: number
}

type SourcePopoverState = {
  selectionRange: {
    startLine: number
    endLine: number
  }
  sourceOffsetRange?: SourceOffsetRange
  x: number
  y: number
}

type CommentHoverState = {
  lineNumber: number
  comments: readonly CodeComment[]
  x: number
  y: number
}

const HOVER_POPOVER_CLOSE_DELAY_MS = 120
const NAVIGATION_HIGHLIGHT_DURATION_MS = 1600

type HastNode = {
  type?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
  position?: {
    start?: {
      line?: number
      offset?: number
    }
    end?: {
      line?: number
      offset?: number
    }
  }
}

function hasClassName(node: HastNode, className: string) {
  const rawClassName = node.properties?.className
  const classNames = Array.isArray(rawClassName)
    ? rawClassName
    : typeof rawClassName === 'string'
      ? rawClassName.split(/\s+/)
      : []
  return classNames.includes(className)
}

function isInlineMathNode(node: HastNode) {
  return (
    node.type === 'element' &&
    node.tagName === 'code' &&
    hasClassName(node, 'language-math') &&
    hasClassName(node, 'math-inline')
  )
}

function isDisplayMathNode(node: HastNode) {
  if (node.type !== 'element' || node.tagName !== 'pre') {
    return false
  }

  const firstChild = Array.isArray(node.children) ? node.children[0] : null
  return (
    !!firstChild &&
    firstChild.type === 'element' &&
    firstChild.tagName === 'code' &&
    hasClassName(firstChild, 'language-math') &&
    hasClassName(firstChild, 'math-display')
  )
}

function wrapMathNodeWithSourceMetadata(
  node: HastNode,
  includeAnchorLine: boolean,
): HastNode {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      className: ['spec-viewer-math-source'],
      ...buildSourceLineAttributes(node, { includeAnchorLine }),
    },
    children: [node],
  }
}

function visitMathNodes(node: HastNode) {
  const children = Array.isArray(node.children) ? node.children : null
  if (!children) {
    return
  }

  const nextChildren: HastNode[] = []
  for (const child of children) {
    if (isInlineMathNode(child)) {
      nextChildren.push(wrapMathNodeWithSourceMetadata(child, false))
      continue
    }

    if (isDisplayMathNode(child)) {
      nextChildren.push(wrapMathNodeWithSourceMetadata(child, true))
      continue
    }

    visitMathNodes(child)
    nextChildren.push(child)
  }

  node.children = nextChildren
}

function rehypeWrapMathWithSourceMetadata() {
  return (tree: HastNode) => {
    visitMathNodes(tree)
  }
}

export function SpecViewerPanel({
  workspaceRootPath,
  activeSpecPath,
  markdownContent,
  appearanceTheme = 'dark-gray',
  navigationRequest = null,
  isActive = false,
  isLoading,
  readError,
  onOpenRelativePath,
  onOpenCitationTarget,
  onGoToSourceLine,
  onRequestAddComment,
  onRequestEditComment,
  onRequestDeleteComment,
  onRequestCopySelectedContent,
  onRequestCopyBoth,
  onRequestCopyRelativePath,
  commentLineCounts,
  commentLineEntries = EMPTY_COMMENT_LINE_ENTRIES,
  restoredScrollTop = null,
  onScrollPositionChange,
}: SpecViewerPanelProps) {
  const tocHeadings = useMemo(
    () =>
      markdownContent ? extractMarkdownHeadings(markdownContent, 3) : [],
    [markdownContent],
  )
  const documentHeadings = useMemo(
    () =>
      markdownContent ? extractMarkdownHeadings(markdownContent, 6) : [],
    [markdownContent],
  )
  const contentRef = useRef<HTMLElement | null>(null)
  const [linkPopoverState, setLinkPopoverState] = useState<LinkPopoverState | null>(
    null,
  )
  const [sourcePopoverState, setSourcePopoverState] =
    useState<SourcePopoverState | null>(null)
  const [commentHoverState, setCommentHoverState] =
    useState<CommentHoverState | null>(null)
  const [commentDetailState, setCommentDetailState] =
    useState<CommentHoverState | null>(null)
  const [isTocExpanded, setIsTocExpanded] = useState(false)
  const [resolvedCommentMarkerCounts, setResolvedCommentMarkerCounts] =
    useState<ReadonlyMap<string, number>>(new Map())
  const [resolvedCommentMarkerEntries, setResolvedCommentMarkerEntries] =
    useState<ReadonlyMap<string, readonly CodeComment[]>>(new Map())
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentSearchMatchIndex, setCurrentSearchMatchIndex] = useState(0)
  const [resolvedSearchMatchLines, setResolvedSearchMatchLines] = useState<number[]>(
    [],
  )
  const lastAppliedScrollRestoreRef = useRef<{
    specPath: string
    contentLength: number
    scrollTop: number
  } | null>(null)
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const highlightedNavigationBlockRef = useRef<HTMLElement | null>(null)
  const navigationHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const lastHandledNavigationTokenRef = useRef<number | null>(null)
  const rawSearchMatchLines = useMemo(
    () =>
      markdownContent ? buildSearchMatchStartLines(markdownContent, searchQuery) : [],
    [markdownContent, searchQuery],
  )
  const focusedSearchLine =
    resolvedSearchMatchLines.length > 0
      ? resolvedSearchMatchLines[
          Math.min(currentSearchMatchIndex, resolvedSearchMatchLines.length - 1)
        ] ?? null
      : null
  const searchMatchedLines = useMemo(
    () => new Set(resolvedSearchMatchLines),
    [resolvedSearchMatchLines],
  )
  const editableComment =
    sourcePopoverState
      ? findMostRecentCommentInSelectionRange(
          commentLineEntries,
          sourcePopoverState.selectionRange,
        )
      : null

  const clearNavigationHighlight = useCallback(() => {
    if (navigationHighlightTimerRef.current) {
      clearTimeout(navigationHighlightTimerRef.current)
      navigationHighlightTimerRef.current = null
    }
    highlightedNavigationBlockRef.current?.classList.remove(
      'is-spec-navigation-target',
    )
    highlightedNavigationBlockRef.current = null
  }, [])

  useEffect(() => {
    clearNavigationHighlight()
    lastHandledNavigationTokenRef.current = null
    setIsTocExpanded(false)
    setLinkPopoverState(null)
    setSourcePopoverState(null)
    setCommentHoverState(null)
    setResolvedCommentMarkerCounts(new Map())
    setResolvedCommentMarkerEntries(new Map())
    setActiveHeadingId(null)
    setIsSearchOpen(false)
    setSearchQuery('')
    setCurrentSearchMatchIndex(0)
    setResolvedSearchMatchLines([])
    lastAppliedScrollRestoreRef.current = null
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }
  }, [activeSpecPath, clearNavigationHighlight])

  useEffect(
    () => () => {
      clearNavigationHighlight()
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current)
        hoverCloseTimerRef.current = null
      }
    },
    [clearNavigationHighlight],
  )

  useEffect(() => {
    if (!isSearchOpen) {
      return
    }

    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }, [isSearchOpen])

  useEffect(() => {
    if (currentSearchMatchIndex < resolvedSearchMatchLines.length) {
      return
    }
    setCurrentSearchMatchIndex(0)
  }, [currentSearchMatchIndex, resolvedSearchMatchLines.length])

  useEffect(() => {
    if (!isSearchOpen || focusedSearchLine === null) {
      return
    }

    const contentElement = contentRef.current
    if (!contentElement) {
      return
    }

    const targetBlock = contentElement.querySelector<HTMLElement>(
      `[data-source-line="${focusedSearchLine}"]`,
    )
    if (!targetBlock || typeof targetBlock.scrollIntoView !== 'function') {
      return
    }

    targetBlock.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [focusedSearchLine, isSearchOpen])

  const syncActiveHeading = useCallback((containerElement: HTMLElement | null) => {
    if (!containerElement) {
      setActiveHeadingId((previous) => (previous === null ? previous : null))
      return
    }

    const nextActiveHeadingId = resolveActiveHeadingId(containerElement)
    setActiveHeadingId((previous) =>
      previous === nextActiveHeadingId ? previous : nextActiveHeadingId,
    )
  }, [])

  useEffect(() => {
    const contentElement = contentRef.current
    if (!contentElement) {
      return
    }

    const sourceLineElements = contentElement.querySelectorAll<HTMLElement>(
      '[data-source-line]',
    )
    for (const element of sourceLineElements) {
      const lineNumber = Number(element.getAttribute('data-source-line'))
      const isMatch = Number.isFinite(lineNumber) && searchMatchedLines.has(lineNumber)
      const isFocus = Number.isFinite(lineNumber) && focusedSearchLine === lineNumber
      element.classList.toggle('is-spec-search-match', isMatch)
      element.classList.toggle('is-spec-search-focus', isFocus)
    }
  }, [focusedSearchLine, searchMatchedLines])

  useEffect(() => {
    const contentElement = contentRef.current
    if (!contentElement || !activeSpecPath || !markdownContent) {
      setActiveHeadingId((previous) => (previous === null ? previous : null))
      return
    }

    syncActiveHeading(contentElement)
  }, [activeSpecPath, markdownContent, syncActiveHeading])

  useEffect(() => {
    const contentElement = contentRef.current
    if (
      !contentElement ||
      !activeSpecPath ||
      !markdownContent ||
      !navigationRequest ||
      navigationRequest.targetRelativePath !== activeSpecPath
    ) {
      return
    }

    if (lastHandledNavigationTokenRef.current === navigationRequest.token) {
      return
    }

    const targetBlock =
      typeof navigationRequest.headingId === 'string'
        ? findHeadingElement(contentElement, navigationRequest.headingId, null)
        : typeof navigationRequest.lineNumber === 'number'
          ? resolveBestRenderedSourceBlockForLine(
              contentElement,
              navigationRequest.lineNumber,
            )
          : null
    if (!targetBlock) {
      return
    }

    if (typeof targetBlock.scrollIntoView === 'function') {
      targetBlock.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      })
    }

    clearNavigationHighlight()
    targetBlock.classList.remove('is-spec-navigation-target')
    void targetBlock.getBoundingClientRect()
    targetBlock.classList.add('is-spec-navigation-target')
    highlightedNavigationBlockRef.current = targetBlock
    navigationHighlightTimerRef.current = setTimeout(() => {
      clearNavigationHighlight()
    }, NAVIGATION_HIGHLIGHT_DURATION_MS)
    syncActiveHeading(contentElement)
    if (navigationRequest.headingId) {
      setActiveHeadingId(navigationRequest.headingId)
    }
    lastHandledNavigationTokenRef.current = navigationRequest.token
  }, [
    activeSpecPath,
    clearNavigationHighlight,
    markdownContent,
    navigationRequest,
    syncActiveHeading,
  ])

  useEffect(() => {
    const contentElement = contentRef.current
    if (
      !contentElement ||
      !activeSpecPath ||
      !markdownContent ||
      rawSearchMatchLines.length === 0
    ) {
      setResolvedSearchMatchLines((previous) =>
        previous.length > 0 ? [] : previous,
      )
      return
    }

    const renderedSourceLines = collectRenderedSourceLines(contentElement)
    const nextResolvedMatchLines = mapSearchMatchLinesToRenderedSourceLines(
      rawSearchMatchLines,
      renderedSourceLines,
    )

    setResolvedSearchMatchLines((previous) =>
      areLineArraysEqual(previous, nextResolvedMatchLines)
        ? previous
        : nextResolvedMatchLines,
    )
  }, [activeSpecPath, markdownContent, rawSearchMatchLines])

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      const isFindShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'f'
      if (!isFindShortcut || !isActive || !activeSpecPath || !markdownContent) {
        return
      }

      event.preventDefault()
      setIsSearchOpen(true)
    }

    window.addEventListener('keydown', handleWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown)
    }
  }, [activeSpecPath, isActive, markdownContent])

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false)
    setSearchQuery('')
    setCurrentSearchMatchIndex(0)
  }, [])

  const moveSearchFocus = useCallback(
    (direction: 1 | -1) => {
      if (resolvedSearchMatchLines.length === 0) {
        return
      }
      setCurrentSearchMatchIndex((previous) => {
        const nextIndex = previous + direction
        if (nextIndex < 0) {
          return resolvedSearchMatchLines.length - 1
        }
        if (nextIndex >= resolvedSearchMatchLines.length) {
          return 0
        }
        return nextIndex
      })
    },
    [resolvedSearchMatchLines.length],
  )

  useEffect(() => {
    const contentElement = contentRef.current
    if (!contentElement || !activeSpecPath || !markdownContent) {
      return
    }

    if (typeof restoredScrollTop !== 'number' || !Number.isFinite(restoredScrollTop)) {
      return
    }

    const normalizedScrollTop = Math.max(0, Math.trunc(restoredScrollTop))
    const lastAppliedScrollRestore = lastAppliedScrollRestoreRef.current
    if (
      lastAppliedScrollRestore &&
      lastAppliedScrollRestore.specPath === activeSpecPath &&
      lastAppliedScrollRestore.contentLength === markdownContent.length &&
      lastAppliedScrollRestore.scrollTop === normalizedScrollTop
    ) {
      return
    }

    contentElement.scrollTop = normalizedScrollTop
    lastAppliedScrollRestoreRef.current = {
      specPath: activeSpecPath,
      contentLength: markdownContent.length,
      scrollTop: normalizedScrollTop,
    }
    syncActiveHeading(contentElement)
  }, [activeSpecPath, markdownContent, restoredScrollTop, syncActiveHeading])

  useEffect(() => {
    const containerElement = contentRef.current
    if (!containerElement || !activeSpecPath || !markdownContent) {
      setResolvedCommentMarkerCounts((previous) =>
        previous.size > 0 ? new Map() : previous,
      )
      setResolvedCommentMarkerEntries((previous) =>
        previous.size > 0 ? new Map() : previous,
      )
      return
    }

    const anchors = collectRenderedCommentMarkerAnchors(containerElement)
    const mappedEntries = mapCommentEntriesToMarkerAnchors(commentLineEntries, anchors)
    const mappedCounts = new Map(mappedEntries.counts)
    const remainingCounts = mapCommentCountsToMarkerAnchors(
      commentLineCounts,
      anchors,
      mappedEntries.lineEntryCounts,
    )
    for (const [key, count] of remainingCounts.entries()) {
      mappedCounts.set(key, (mappedCounts.get(key) ?? 0) + count)
    }

    setResolvedCommentMarkerCounts((previous) =>
      areLineCountMapsEqual(previous, mappedCounts) ? previous : mappedCounts,
    )
    setResolvedCommentMarkerEntries((previous) =>
      areLineCommentMapsEqual(previous, mappedEntries.entries)
        ? previous
        : mappedEntries.entries,
    )
  }, [activeSpecPath, commentLineCounts, commentLineEntries, markdownContent])

  const clearHoverCloseTimer = useCallback(() => {
    if (!hoverCloseTimerRef.current) {
      return
    }
    clearTimeout(hoverCloseTimerRef.current)
    hoverCloseTimerRef.current = null
  }, [])

  const closeCommentHover = useCallback(() => {
    clearHoverCloseTimer()
    setCommentHoverState(null)
  }, [clearHoverCloseTimer])

  const closeCommentDetail = useCallback(() => {
    setCommentDetailState(null)
  }, [])

  const scheduleCommentHoverClose = useCallback(() => {
    clearHoverCloseTimer()
    hoverCloseTimerRef.current = setTimeout(() => {
      setCommentHoverState(null)
      hoverCloseTimerRef.current = null
    }, HOVER_POPOVER_CLOSE_DELAY_MS)
  }, [clearHoverCloseTimer])

  const handleCommentMarkerMouseEnter = useCallback(
    (
      event: MouseEvent<HTMLElement>,
      lineNumber: number,
      comments: readonly CodeComment[],
    ) => {
      if (comments.length === 0) {
        closeCommentHover()
        return
      }
      clearHoverCloseTimer()
      setCommentHoverState({
        lineNumber,
        comments,
        x: event.clientX,
        y: event.clientY,
      })
    },
    [clearHoverCloseTimer, closeCommentHover],
  )

  useEffect(() => {
    setCommentHoverState(null)
    setCommentDetailState(null)
  }, [activeSpecPath, markdownContent])

  const closeLinkPopover = useCallback(() => {
    setLinkPopoverState(null)
  }, [])

  const closeSourcePopover = useCallback(() => {
    setSourcePopoverState(null)
  }, [])

  const copyPopoverLink = useCallback(async () => {
    if (!linkPopoverState) {
      return
    }

    if (!navigator.clipboard?.writeText) {
      setLinkPopoverState(null)
      return
    }

    try {
      await navigator.clipboard.writeText(linkPopoverState.href)
    } catch {
      // Keep the interaction silent to avoid noisy global banners.
    } finally {
      setLinkPopoverState(null)
    }
  }, [linkPopoverState])

  const handleMarkdownLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href?: string) => {
      closeCommentHover()
      setSourcePopoverState(null)
      const resolvedLink = resolveSpecLink(href, activeSpecPath)
      if (resolvedLink.kind === 'anchor') {
        event.preventDefault()
        const containerElement = contentRef.current
        if (!containerElement) {
          return
        }

        const rawHeadingId = resolvedLink.href.slice(1).trim()
        if (!rawHeadingId) {
          return
        }

        const decodedHeadingId = (() => {
          try {
            return decodeURIComponent(rawHeadingId)
          } catch {
            return rawHeadingId
          }
        })()

        const candidateHeadingIds = Array.from(
          new Set([decodedHeadingId, rawHeadingId]),
        )
        for (const headingId of candidateHeadingIds) {
          const headingText =
            documentHeadings.find((heading) => heading.id === headingId)?.text ??
            null
          if (scrollToHeadingById(containerElement, headingId, headingText)) {
            setActiveHeadingId(headingId)
            return
          }
        }

        return
      }

      event.preventDefault()

      if (resolvedLink.kind === 'workspace-symbol') {
        void (async () => {
          try {
            const result = await onOpenCitationTarget(resolvedLink.target)
            if (result.ok) {
              setLinkPopoverState(null)
              return
            }

            setLinkPopoverState({
              href: resolvedLink.href,
              message: result.failureReason,
              x: event.clientX,
              y: event.clientY,
            })
            return
          } catch (error) {
            setLinkPopoverState({
              href: resolvedLink.href,
              message:
                error instanceof Error && error.message.trim().length > 0
                  ? error.message
                  : 'Unable to open citation target.',
              x: event.clientX,
              y: event.clientY,
            })
            return
          }
        })()
        return
      }

      if (resolvedLink.kind === 'workspace-file') {
        const opened = onOpenRelativePath(
          resolvedLink.targetRelativePath,
          resolvedLink.lineRange,
          resolvedLink.headingTarget?.headingId ?? null,
        )
        if (opened) {
          setLinkPopoverState(null)
          return
        }

        setLinkPopoverState({
          href: resolvedLink.href,
          x: event.clientX,
          y: event.clientY,
        })
        return
      }

      setLinkPopoverState({
        href: resolvedLink.href,
        x: event.clientX,
        y: event.clientY,
      })
    },
    [
      activeSpecPath,
      closeCommentHover,
      documentHeadings,
      onOpenCitationTarget,
      onOpenRelativePath,
    ],
  )

  const handleSpecContextMenu = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const selection = window.getSelection()
      const contentElement = contentRef.current
      if (!selection || !contentElement) {
        setSourcePopoverState(null)
        return
      }

      const hasVisibleSelection = hasVisibleSelectionInElement(
        selection,
        contentElement,
      )

      const resolvedSelection =
        hasVisibleSelection && markdownContent !== null
          ? resolveSourceSelectionRangeFromSelection(selection, markdownContent)
          : null
      const selectionLineRange = resolvedSelection
        ? {
            startLine: resolvedSelection.startLine,
            endLine: resolvedSelection.endLine,
          }
        : null
      const fallbackSourceLine =
        resolveSourceLine({
          target: event.target,
          selection: hasVisibleSelection ? selection : null,
          sourceText: markdownContent,
        }) ?? resolveNearestSourceLineFromPoint(contentElement, event.clientY)
      const resolvedSelectionRange =
        selectionLineRange ??
        (fallbackSourceLine
          ? {
              startLine: fallbackSourceLine,
              endLine: fallbackSourceLine,
            }
          : null)
      if (!resolvedSelectionRange) {
        setSourcePopoverState(null)
        return
      }

      event.preventDefault()
      closeCommentHover()
      setLinkPopoverState(null)
      setSourcePopoverState({
        selectionRange: resolvedSelectionRange,
        ...(resolvedSelection?.sourceOffsetRange
          ? { sourceOffsetRange: resolvedSelection.sourceOffsetRange }
          : {}),
        x: event.clientX,
        y: event.clientY,
      })
    },
    [closeCommentHover, markdownContent],
  )

  const handleAddComment = useCallback(() => {
    if (!sourcePopoverState || !activeSpecPath) {
      return
    }

    onRequestAddComment({
      relativePath: activeSpecPath,
      selectionRange: sourcePopoverState.selectionRange,
      ...(sourcePopoverState.sourceOffsetRange
        ? { sourceOffsetRange: sourcePopoverState.sourceOffsetRange }
        : {}),
    })
    setSourcePopoverState(null)
  }, [activeSpecPath, onRequestAddComment, sourcePopoverState])

  const handleGoToSource = useCallback(() => {
    if (!sourcePopoverState) {
      return
    }

    if (sourcePopoverState.sourceOffsetRange) {
      onGoToSourceLine(
        sourcePopoverState.selectionRange.startLine,
        sourcePopoverState.sourceOffsetRange,
      )
    } else {
      onGoToSourceLine(sourcePopoverState.selectionRange.startLine)
    }
    setSourcePopoverState(null)
  }, [onGoToSourceLine, sourcePopoverState])

  const handleCopySelectedContent = useCallback(() => {
    if (!sourcePopoverState || !activeSpecPath || markdownContent === null) {
      return
    }

    onRequestCopySelectedContent({
      relativePath: activeSpecPath,
      content: markdownContent,
      selectionRange: sourcePopoverState.selectionRange,
    })
    setSourcePopoverState(null)
  }, [
    activeSpecPath,
    markdownContent,
    onRequestCopySelectedContent,
    sourcePopoverState,
  ])

  const handleCopyBoth = useCallback(() => {
    if (!sourcePopoverState || !activeSpecPath || markdownContent === null) {
      return
    }

    onRequestCopyBoth({
      relativePath: activeSpecPath,
      content: markdownContent,
      selectionRange: sourcePopoverState.selectionRange,
    })
    setSourcePopoverState(null)
  }, [activeSpecPath, markdownContent, onRequestCopyBoth, sourcePopoverState])

  const handleCopyRelativePath = useCallback(() => {
    if (!sourcePopoverState || !activeSpecPath) {
      return
    }

    onRequestCopyRelativePath(
      activeSpecPath,
      sourcePopoverState.selectionRange,
    )
    setSourcePopoverState(null)
  }, [activeSpecPath, onRequestCopyRelativePath, sourcePopoverState])

  const handleTocLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, headingId: string, headingText: string) => {
      event.preventDefault()
      const containerElement = contentRef.current
      if (!containerElement) {
        return
      }

      if (scrollToHeadingById(containerElement, headingId, headingText)) {
        setActiveHeadingId(headingId)
      }
    },
    [],
  )

  const handleContentScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (activeSpecPath && onScrollPositionChange) {
        onScrollPositionChange({
          relativePath: activeSpecPath,
          scrollTop: event.currentTarget.scrollTop,
        })
      }

      syncActiveHeading(event.currentTarget)
    },
    [activeSpecPath, onScrollPositionChange, syncActiveHeading],
  )

  const markdownComponents = useMemo(
    () =>
      createSpecViewerMarkdownComponents({
        activeSpecPath,
        appearanceTheme,
        resolvedCommentMarkerCounts,
        resolvedCommentMarkerEntries,
        onCommentMarkerMouseEnter: handleCommentMarkerMouseEnter,
        onCommentMarkerMouseLeave: scheduleCommentHoverClose,
        onMarkdownLinkClick: handleMarkdownLinkClick,
        workspaceRootPath,
      }),
    [
      activeSpecPath,
      appearanceTheme,
      handleCommentMarkerMouseEnter,
      handleMarkdownLinkClick,
      resolvedCommentMarkerCounts,
      resolvedCommentMarkerEntries,
      scheduleCommentHoverClose,
      workspaceRootPath,
    ],
  )

  return (
    <section
      className="spec-viewer-panel"
      data-appearance-theme={appearanceTheme}
      data-testid="spec-viewer-panel"
    >
      <p className="label">Rendered Spec</p>
      <p
        className="path spec-viewer-active-spec"
        data-testid="spec-viewer-active-spec"
        title={activeSpecPath ?? ''}
      >
        {activeSpecPath ?? 'No active spec'}
      </p>
      {activeSpecPath && markdownContent && isSearchOpen && (
        <div className="spec-viewer-search-bar">
          <input
            className="spec-viewer-search-input"
            data-testid="spec-viewer-search-input"
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setCurrentSearchMatchIndex(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                closeSearch()
                return
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                moveSearchFocus(event.shiftKey ? -1 : 1)
              }
            }}
            placeholder="Find in spec (* supported)"
            ref={searchInputRef}
            type="search"
            value={searchQuery}
          />
          <span
            className="spec-viewer-search-count"
            data-testid="spec-viewer-search-count"
          >
            {resolvedSearchMatchLines.length === 0
              ? '0 / 0'
              : `${currentSearchMatchIndex + 1} / ${resolvedSearchMatchLines.length}`}
          </span>
          <button
            className="spec-viewer-search-button"
            disabled={resolvedSearchMatchLines.length === 0}
            onClick={() => moveSearchFocus(-1)}
            type="button"
          >
            Prev
          </button>
          <button
            className="spec-viewer-search-button"
            disabled={resolvedSearchMatchLines.length === 0}
            onClick={() => moveSearchFocus(1)}
            type="button"
          >
            Next
          </button>
          <button
            className="spec-viewer-search-close"
            onClick={closeSearch}
            type="button"
          >
            Close
          </button>
        </div>
      )}

      {!activeSpecPath && (
        <p className="spec-viewer-empty" data-testid="spec-viewer-empty">
          Select a Markdown file to render it in the spec panel.
        </p>
      )}

      {activeSpecPath && isLoading && !markdownContent && (
        <p className="spec-viewer-loading" data-testid="spec-viewer-loading">
          Loading markdown preview...
        </p>
      )}

      {activeSpecPath && !isLoading && readError && !markdownContent && (
        <p className="spec-viewer-error" data-testid="spec-viewer-error" role="alert">
          {readError}
        </p>
      )}

      {activeSpecPath && !isLoading && !readError && !markdownContent && (
        <p
          className="spec-viewer-unavailable"
          data-testid="spec-viewer-unavailable"
        >
          Select the active markdown file again to refresh rendered preview.
        </p>
      )}

      {activeSpecPath && markdownContent && (
        <div className="spec-viewer-body">
          {tocHeadings.length > 0 && (
            <nav className="spec-viewer-toc" data-testid="spec-viewer-toc">
              <button
                aria-expanded={isTocExpanded}
                className="spec-viewer-toc-toggle"
                data-testid="spec-viewer-toc-toggle"
                onClick={() => {
                  setIsTocExpanded((previous) => !previous)
                }}
                type="button"
              >
                <span className="label spec-viewer-toc-label">Table of Contents</span>
                <span className="spec-viewer-toc-chevron" aria-hidden="true">
                  {isTocExpanded ? '▾' : '▸'}
                </span>
              </button>
              {isTocExpanded && (
                <ol className="spec-viewer-toc-list" data-testid="spec-viewer-toc-list">
                  {tocHeadings.map((heading) => (
                    <li
                      className={`spec-viewer-toc-item depth-${heading.depth}`}
                      key={`${heading.id}-${heading.depth}`}
                    >
                      <a
                        aria-current={activeHeadingId === heading.id ? 'location' : undefined}
                        className={activeHeadingId === heading.id ? 'is-active' : undefined}
                        href={`#${heading.id}`}
                        onClick={(event) => {
                          handleTocLinkClick(event, heading.id, heading.text)
                        }}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </nav>
          )}

          <article
            className="spec-viewer-content"
            data-testid="spec-viewer-content"
            onMouseLeave={scheduleCommentHoverClose}
            onContextMenu={handleSpecContextMenu}
            onScroll={handleContentScroll}
            ref={contentRef}
          >
            <ReactMarkdown
              components={markdownComponents}
              urlTransform={(url) => sanitizeMarkdownUri(url)}
              rehypePlugins={[
                rehypeSlug,
                rehypeWrapMathWithSourceMetadata,
                rehypeKatex,
                [rehypeSanitize, MARKDOWN_SANITIZE_SCHEMA],
                rehypeWrapSourceTextLeaves,
              ]}
              remarkPlugins={[remarkGfm, remarkMath, remarkCitationLinks]}
            >
              {markdownContent}
            </ReactMarkdown>
          </article>
        </div>
      )}
      {sourcePopoverState && activeSpecPath && markdownContent !== null && (
        <CopyActionPopover
          actions={[
            {
              label: 'Add Comment',
              onSelect: handleAddComment,
            },
            ...(editableComment
              ? [
                  {
                    label: 'Edit Comment',
                    onSelect: () => {
                      onRequestEditComment(editableComment)
                      setSourcePopoverState(null)
                    },
                  },
                  {
                    label: 'Delete Comment',
                    onSelect: () => {
                      onRequestDeleteComment(editableComment)
                      setSourcePopoverState(null)
                    },
                  },
                ]
              : []),
            {
              label: 'Go to Source',
              onSelect: handleGoToSource,
            },
            {
              label: 'Copy Line Contents',
              onSelect: handleCopySelectedContent,
            },
            {
              label: 'Copy Contents and Path',
              onSelect: handleCopyBoth,
            },
            {
              label: 'Copy Relative Path',
              onSelect: handleCopyRelativePath,
            },
            {
              label: 'Close',
              onSelect: () => undefined,
            },
          ]}
          ariaLabel="Source actions"
          description={buildCopyActiveFilePathPayload(
            activeSpecPath,
            sourcePopoverState.selectionRange,
          )}
          onClose={closeSourcePopover}
          title="Source Actions"
          x={sourcePopoverState.x}
          y={sourcePopoverState.y}
        />
      )}
      {linkPopoverState && (
        <SpecLinkPopover
          href={linkPopoverState.href}
          message={linkPopoverState.message}
          onClose={closeLinkPopover}
          onCopy={() => {
            void copyPopoverLink()
          }}
          x={linkPopoverState.x}
          y={linkPopoverState.y}
        />
      )}
      {commentHoverState && (
        <CommentHoverPopover
          comments={commentHoverState.comments}
          lineNumber={commentHoverState.lineNumber}
          onClose={closeCommentHover}
          onOpenDetails={() => {
            setCommentDetailState(commentHoverState)
            closeCommentHover()
          }}
          onMouseEnter={clearHoverCloseTimer}
          onMouseLeave={scheduleCommentHoverClose}
          x={commentHoverState.x}
          y={commentHoverState.y}
        />
      )}
      {commentDetailState && (
        <CommentMarkerDetailPanel
          comments={commentDetailState.comments}
          lineNumber={commentDetailState.lineNumber}
          onClose={closeCommentDetail}
          onRequestDeleteComment={onRequestDeleteComment}
          onRequestEditComment={onRequestEditComment}
          x={commentDetailState.x}
          y={commentDetailState.y}
        />
      )}
    </section>
  )
}

const EMPTY_COMMENT_LINE_ENTRIES: ReadonlyMap<number, readonly CodeComment[]> = new Map()
