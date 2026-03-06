import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
  type UIEvent,
} from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import {
  mapCommentCountsToRenderedSourceLines,
  mapCommentEntriesToRenderedSourceLines,
} from '../code-comments/comment-line-index'
import { CommentHoverPopover } from '../code-comments/comment-hover-popover'
import type { CodeComment } from '../code-comments/comment-types'
import { highlightLines } from '../code-viewer/syntax-highlight'
import type { HighlightLanguage } from '../code-viewer/language-map'
import { extractMarkdownHeadings } from './markdown-utils'
import {
  MARKDOWN_SANITIZE_SCHEMA,
  resolveMarkdownImageSource,
  sanitizeMarkdownUri,
} from './markdown-security'
import { SpecLinkPopover } from './spec-link-popover'
import { SpecSourcePopover } from './spec-source-popover'
import {
  resolveNearestSourceLineFromPoint,
  resolveSourceLineRangeFromSelection,
  resolveSourceLine,
} from './source-line-resolver'
import { resolveSpecLink, type SpecLinkLineRange } from './spec-link-utils'
import { buildSearchMatchStartLines } from './spec-search'

type SpecViewerPanelProps = {
  workspaceRootPath: string | null
  activeSpecPath: string | null
  markdownContent: string | null
  isActive?: boolean
  isLoading: boolean
  readError: string | null
  onOpenRelativePath: (
    relativePath: string,
    lineRange: SpecLinkLineRange | null,
  ) => boolean
  onGoToSourceLine: (lineNumber: number) => void
  onRequestAddComment: (input: {
    relativePath: string
    selectionRange: { startLine: number; endLine: number }
  }) => void
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
  x: number
  y: number
}

type SourcePopoverState = {
  selectionRange: {
    startLine: number
    endLine: number
  }
  x: number
  y: number
}

type CommentHoverState = {
  lineNumber: number
  comments: readonly CodeComment[]
  x: number
  y: number
}

const BLOCKED_RESOURCE_PLACEHOLDER_TEXT = 'blocked placeholder text'
const HOVER_POPOVER_CLOSE_DELAY_MS = 120

type MarkdownNodeWithPosition = {
  type?: string
  tagName?: string
  position?: {
    start?: {
      line?: number
    }
  }
  children?: MarkdownNodeWithPosition[]
}

function getMarkdownNodeSourceLine(node: MarkdownNodeWithPosition | undefined) {
  const candidate = node?.position?.start?.line
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
    return undefined
  }
  const normalized = Math.trunc(candidate)
  return normalized >= 1 ? normalized : undefined
}

function isMarkerContainerTag(tagName: string) {
  return tagName === 'blockquote' || tagName === 'li'
}

function isPreferredMarkerChildType(type: string | undefined) {
  return (
    type === 'paragraph' ||
    type === 'listItem' ||
    type === 'heading' ||
    type === 'code' ||
    type === 'table'
  )
}

function isPreferredMarkerChildTagName(tagName: string | undefined) {
  return (
    tagName === 'p' ||
    tagName === 'li' ||
    tagName === 'pre' ||
    tagName === 'table' ||
    tagName === 'h1' ||
    tagName === 'h2' ||
    tagName === 'h3' ||
    tagName === 'h4' ||
    tagName === 'h5' ||
    tagName === 'h6'
  )
}

function shouldSuppressMarkerForNestedSameLineChild(
  tagName: string,
  node: MarkdownNodeWithPosition | undefined,
  sourceLine: number | undefined,
) {
  if (!isMarkerContainerTag(tagName) || !node || sourceLine === undefined) {
    return false
  }

  const childNodes = Array.isArray(node.children) ? node.children : []
  for (const childNode of childNodes) {
    if (getMarkdownNodeSourceLine(childNode) !== sourceLine) {
      continue
    }

    if (
      isPreferredMarkerChildType(childNode.type) ||
      isPreferredMarkerChildTagName(childNode.tagName)
    ) {
      return true
    }
  }

  return false
}

function renderBlockWithSourceLine(
  tagName: string,
  props: Record<string, unknown>,
  markerCountsByLine: ReadonlyMap<number, number>,
  markerEntriesByLine: ReadonlyMap<number, readonly CodeComment[]>,
  onMarkerMouseEnter: (
    event: MouseEvent<HTMLElement>,
    lineNumber: number,
    comments: readonly CodeComment[],
  ) => void,
  onMarkerMouseLeave: () => void,
) {
  const { node, children, ...restProps } = props as {
    node?: MarkdownNodeWithPosition
    children?: ReactNode
    className?: string
  }
  const sourceLine = getMarkdownNodeSourceLine(node)
  const markerCount =
    sourceLine !== undefined ? markerCountsByLine.get(sourceLine) ?? 0 : 0
  const markerComments =
    sourceLine !== undefined ? markerEntriesByLine.get(sourceLine) ?? [] : []
  const hasCommentMarker =
    markerCount > 0 &&
    markerComments.length > 0 &&
    !shouldSuppressMarkerForNestedSameLineChild(tagName, node, sourceLine)
  const existingClassName =
    typeof restProps.className === 'string' ? restProps.className : ''
  const mergedClassName = [
    existingClassName,
    hasCommentMarker ? 'spec-comment-marked' : '',
  ]
    .filter((value) => value.length > 0)
    .join(' ')
  const baseProps = {
    ...restProps,
    className: mergedClassName.length > 0 ? mergedClassName : undefined,
    'data-source-line': sourceLine,
    'data-has-comment-marker': hasCommentMarker ? 'true' : undefined,
    'data-comment-count': hasCommentMarker ? String(markerCount) : undefined,
  }

  if (!hasCommentMarker || sourceLine === undefined) {
    return createElement(tagName, baseProps, children ?? null)
  }

  return createElement(
    tagName,
    baseProps,
    createElement(
      'span',
      {
        className: 'spec-comment-marker',
        'data-testid': `spec-comment-marker-${sourceLine}`,
        onMouseEnter: (event: MouseEvent<HTMLElement>) => {
          onMarkerMouseEnter(event, sourceLine, markerComments)
        },
        onMouseLeave: onMarkerMouseLeave,
      },
      String(markerCount),
    ),
    children ?? null,
  )
}

function areLineCountMapsEqual(
  left: ReadonlyMap<number, number>,
  right: ReadonlyMap<number, number>,
) {
  if (left.size !== right.size) {
    return false
  }

  for (const [line, count] of left.entries()) {
    if ((right.get(line) ?? 0) !== count) {
      return false
    }
  }

  return true
}

function areLineCommentMapsEqual(
  left: ReadonlyMap<number, readonly CodeComment[]>,
  right: ReadonlyMap<number, readonly CodeComment[]>,
) {
  if (left.size !== right.size) {
    return false
  }

  for (const [line, comments] of left.entries()) {
    const rightComments = right.get(line)
    if (!rightComments || rightComments.length !== comments.length) {
      return false
    }

    for (let index = 0; index < comments.length; index += 1) {
      if (comments[index]?.id !== rightComments[index]?.id) {
        return false
      }
    }
  }

  return true
}

function areLineArraysEqual(
  left: readonly number[],
  right: readonly number[],
) {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

function collectRenderedSourceLines(containerElement: HTMLElement): number[] {
  const values = new Set<number>()
  const sourceLineElements = Array.from(
    containerElement.querySelectorAll<HTMLElement>('[data-source-line]'),
  )
  for (const element of sourceLineElements) {
    const lineNumber = Number(element.getAttribute('data-source-line'))
    if (!Number.isFinite(lineNumber)) {
      continue
    }
    const normalizedLine = Math.trunc(lineNumber)
    if (normalizedLine >= 1) {
      values.add(normalizedLine)
    }
  }
  return Array.from(values)
}

function containsSelectionNode(
  element: HTMLElement,
  node: Node | null,
): boolean {
  if (!node) {
    return false
  }
  return element.contains(node instanceof Element ? node : node.parentElement)
}

function hasVisibleSelectionInElement(
  selection: Selection,
  element: HTMLElement,
): boolean {
  if (selection.isCollapsed || selection.toString().trim().length === 0) {
    return false
  }

  return (
    containsSelectionNode(element, selection.anchorNode) ||
    containsSelectionNode(element, selection.focusNode)
  )
}

const MARKDOWN_LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  bash: 'shellscript',
  sh: 'shellscript',
  zsh: 'shellscript',
  yml: 'yaml',
  rb: 'ruby',
  kt: 'kotlin',
  gql: 'graphql',
  htm: 'html',
}

function resolveMarkdownLanguage(tag: string): HighlightLanguage {
  const normalized = tag.toLowerCase()
  return (MARKDOWN_LANGUAGE_ALIASES[normalized] ?? normalized) as HighlightLanguage
}

function mapSearchMatchLinesToRenderedSourceLines(
  searchMatchLines: readonly number[],
  renderedSourceLines: readonly number[],
) {
  if (searchMatchLines.length === 0 || renderedSourceLines.length === 0) {
    return []
  }

  const rawMatchCounts = new Map<number, number>()
  for (const lineNumber of searchMatchLines) {
    rawMatchCounts.set(lineNumber, 1)
  }

  const mappedCounts = mapCommentCountsToRenderedSourceLines(
    rawMatchCounts,
    renderedSourceLines,
  )

  return Array.from(mappedCounts.keys()).sort((left, right) => left - right)
}

function HighlightedCodeBlock({
  code,
  language,
}: {
  code: string
  language: HighlightLanguage
}) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    highlightLines(code, language).then((lines) => {
      if (!cancelled) {
        setHighlightedHtml(lines.join('\n'))
      }
    })
    return () => {
      cancelled = true
    }
  }, [code, language])

  if (highlightedHtml === null) {
    return <code>{code}</code>
  }

  return <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
}

export function SpecViewerPanel({
  workspaceRootPath,
  activeSpecPath,
  markdownContent,
  isActive = false,
  isLoading,
  readError,
  onOpenRelativePath,
  onGoToSourceLine,
  onRequestAddComment,
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
  const [isTocExpanded, setIsTocExpanded] = useState(false)
  const [resolvedCommentMarkerCounts, setResolvedCommentMarkerCounts] =
    useState<ReadonlyMap<number, number>>(new Map())
  const [resolvedCommentMarkerEntries, setResolvedCommentMarkerEntries] =
    useState<ReadonlyMap<number, readonly CodeComment[]>>(new Map())
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

  useEffect(() => {
    setIsTocExpanded(false)
    setLinkPopoverState(null)
    setSourcePopoverState(null)
    setCommentHoverState(null)
    setResolvedCommentMarkerCounts(new Map())
    setResolvedCommentMarkerEntries(new Map())
    setIsSearchOpen(false)
    setSearchQuery('')
    setCurrentSearchMatchIndex(0)
    setResolvedSearchMatchLines([])
    lastAppliedScrollRestoreRef.current = null
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }
  }, [activeSpecPath])

  useEffect(
    () => () => {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current)
        hoverCloseTimerRef.current = null
      }
    },
    [],
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
  }, [activeSpecPath, markdownContent, restoredScrollTop])

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

    const renderedSourceLines = collectRenderedSourceLines(containerElement)
    const mappedCounts = mapCommentCountsToRenderedSourceLines(
      commentLineCounts,
      renderedSourceLines,
    )
    const mappedEntries = mapCommentEntriesToRenderedSourceLines(
      commentLineEntries,
      renderedSourceLines,
    )

    setResolvedCommentMarkerCounts((previous) =>
      areLineCountMapsEqual(previous, mappedCounts) ? previous : mappedCounts,
    )
    setResolvedCommentMarkerEntries((previous) =>
      areLineCommentMapsEqual(previous, mappedEntries) ? previous : mappedEntries,
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
          const escapedId =
            typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
              ? CSS.escape(headingId)
              : headingId
          const targetHeading =
            containerElement.querySelector<HTMLElement>(`#${escapedId}`) ??
            document.getElementById(headingId)
          const fallbackHeading =
            targetHeading ??
            (headingText
              ? Array.from(
                  containerElement.querySelectorAll<HTMLElement>(
                    'h1, h2, h3, h4, h5, h6',
                  ),
                ).find(
                  (headingElement) =>
                    headingElement.textContent?.trim() === headingText,
                ) ?? null
              : null)
          if (!fallbackHeading) {
            continue
          }

          if (typeof fallbackHeading.scrollIntoView === 'function') {
            fallbackHeading.scrollIntoView({
              block: 'start',
              inline: 'nearest',
            })
          }
          return
        }

        return
      }

      event.preventDefault()

      if (resolvedLink.kind === 'workspace-file') {
        const opened = onOpenRelativePath(
          resolvedLink.targetRelativePath,
          resolvedLink.lineRange,
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
    [activeSpecPath, closeCommentHover, documentHeadings, onOpenRelativePath],
  )

  const handleSpecContextMenu = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const selection = window.getSelection()
      const contentElement = contentRef.current
      if (!selection || !contentElement) {
        setSourcePopoverState(null)
        return
      }

      if (!hasVisibleSelectionInElement(selection, contentElement)) {
        setSourcePopoverState(null)
        return
      }

      const selectionLineRange = resolveSourceLineRangeFromSelection(selection)
      const fallbackSourceLine =
        resolveSourceLine({
          target: event.target,
          selection,
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
        x: event.clientX,
        y: event.clientY,
      })
    },
    [closeCommentHover],
  )

  const handleAddComment = useCallback(() => {
    if (!sourcePopoverState || !activeSpecPath) {
      return
    }

    onRequestAddComment({
      relativePath: activeSpecPath,
      selectionRange: sourcePopoverState.selectionRange,
    })
    setSourcePopoverState(null)
  }, [activeSpecPath, onRequestAddComment, sourcePopoverState])

  const handleGoToSource = useCallback(() => {
    if (!sourcePopoverState) {
      return
    }

    onGoToSourceLine(sourcePopoverState.selectionRange.startLine)
    setSourcePopoverState(null)
  }, [onGoToSourceLine, sourcePopoverState])

  const handleTocLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, headingId: string, headingText: string) => {
      event.preventDefault()
      const containerElement = contentRef.current
      if (!containerElement) {
        return
      }

      const escapedId =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(headingId)
          : headingId
      const targetHeading =
        containerElement.querySelector<HTMLElement>(`#${escapedId}`) ??
        document.getElementById(headingId)
      const fallbackHeading =
        targetHeading ??
        Array.from(
          containerElement.querySelectorAll<HTMLElement>(
            'h1, h2, h3, h4, h5, h6',
          ),
        ).find(
          (headingElement) => headingElement.textContent?.trim() === headingText,
        ) ??
        null
      if (!fallbackHeading) {
        return
      }

      if (typeof fallbackHeading.scrollIntoView === 'function') {
        fallbackHeading.scrollIntoView({
          block: 'start',
          inline: 'nearest',
        })
      }
    },
    [],
  )

  const handleContentScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (!activeSpecPath || !onScrollPositionChange) {
        return
      }

      onScrollPositionChange({
        relativePath: activeSpecPath,
        scrollTop: event.currentTarget.scrollTop,
      })
    },
    [activeSpecPath, onScrollPositionChange],
  )

  const markdownComponents = useMemo<Components>(
    () => ({
      a: (props) => {
        const { node, href, children, ...anchorProps } = props
        void node
        return (
          <a
            {...anchorProps}
            href={href}
            onClick={(event) => handleMarkdownLinkClick(event, href)}
          >
            {children}
          </a>
        )
      },
      img: (props) => {
        const { node, src, alt, ...imageProps } = props
        void node
        const resolvedImageSource = resolveMarkdownImageSource(
          src,
          activeSpecPath,
          workspaceRootPath,
        )
        if (!resolvedImageSource) {
          return (
            <span
              className="spec-viewer-blocked-resource"
              data-testid="spec-viewer-blocked-resource"
            >
              {BLOCKED_RESOURCE_PLACEHOLDER_TEXT}
            </span>
          )
        }

        return (
          <img
            {...imageProps}
            alt={alt ?? 'Markdown image'}
            loading="lazy"
            src={resolvedImageSource}
          />
        )
      },
      code: (props) => {
        const { node, className, children, ...codeProps } = props
        void node
        const languageMatch =
          typeof className === 'string' ? className.match(/language-(\w+)/) : null
        if (!languageMatch) {
          return (
            <code className={className} {...codeProps}>
              {children}
            </code>
          )
        }
        const language = resolveMarkdownLanguage(languageMatch[1])
        const codeText = String(children).replace(/\n$/, '')
        return <HighlightedCodeBlock code={codeText} language={language} />
      },
      p: (props) =>
        renderBlockWithSourceLine(
          'p',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      li: (props) =>
        renderBlockWithSourceLine(
          'li',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      blockquote: (props) =>
        renderBlockWithSourceLine(
          'blockquote',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      pre: (props) =>
        renderBlockWithSourceLine(
          'pre',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      table: (props) =>
        renderBlockWithSourceLine(
          'table',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      h1: (props) =>
        renderBlockWithSourceLine(
          'h1',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      h2: (props) =>
        renderBlockWithSourceLine(
          'h2',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      h3: (props) =>
        renderBlockWithSourceLine(
          'h3',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      h4: (props) =>
        renderBlockWithSourceLine(
          'h4',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      h5: (props) =>
        renderBlockWithSourceLine(
          'h5',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
      h6: (props) =>
        renderBlockWithSourceLine(
          'h6',
          props as Record<string, unknown>,
          resolvedCommentMarkerCounts,
          resolvedCommentMarkerEntries,
          handleCommentMarkerMouseEnter,
          scheduleCommentHoverClose,
        ),
    }),
    [
      activeSpecPath,
      handleCommentMarkerMouseEnter,
      handleMarkdownLinkClick,
      resolvedCommentMarkerCounts,
      resolvedCommentMarkerEntries,
      scheduleCommentHoverClose,
      workspaceRootPath,
    ],
  )

  return (
    <section className="spec-viewer-panel" data-testid="spec-viewer-panel">
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
              rehypePlugins={[rehypeSlug, [rehypeSanitize, MARKDOWN_SANITIZE_SCHEMA]]}
              remarkPlugins={[remarkGfm]}
            >
              {markdownContent}
            </ReactMarkdown>
          </article>
        </div>
      )}
      {sourcePopoverState && (
        <SpecSourcePopover
          endLine={sourcePopoverState.selectionRange.endLine}
          onAddComment={handleAddComment}
          onClose={closeSourcePopover}
          onGoToSource={handleGoToSource}
          startLine={sourcePopoverState.selectionRange.startLine}
          x={sourcePopoverState.x}
          y={sourcePopoverState.y}
        />
      )}
      {linkPopoverState && (
        <SpecLinkPopover
          href={linkPopoverState.href}
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
          onMouseEnter={clearHoverCloseTimer}
          onMouseLeave={scheduleCommentHoverClose}
          x={commentHoverState.x}
          y={commentHoverState.y}
        />
      )}
    </section>
  )
}

const EMPTY_COMMENT_LINE_ENTRIES: ReadonlyMap<number, readonly CodeComment[]> = new Map()
