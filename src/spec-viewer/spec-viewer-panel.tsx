import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type UIEvent,
} from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { mapCommentCountsToRenderedSourceLines } from '../code-comments/comment-line-index'
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

type SpecViewerPanelProps = {
  workspaceRootPath: string | null
  activeSpecPath: string | null
  markdownContent: string | null
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

const BLOCKED_RESOURCE_PLACEHOLDER_TEXT = 'blocked placeholder text'

type MarkdownNodeWithPosition = {
  position?: {
    start?: {
      line?: number
    }
  }
}

function getMarkdownNodeSourceLine(node: MarkdownNodeWithPosition | undefined) {
  const candidate = node?.position?.start?.line
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
    return undefined
  }
  const normalized = Math.trunc(candidate)
  return normalized >= 1 ? normalized : undefined
}

function renderBlockWithSourceLine(
  tagName: string,
  props: Record<string, unknown>,
  markerCountsByLine: ReadonlyMap<number, number>,
) {
  const { node, ...restProps } = props
  const sourceLine = getMarkdownNodeSourceLine(
    node as MarkdownNodeWithPosition | undefined,
  )
  const markerCount =
    sourceLine !== undefined ? markerCountsByLine.get(sourceLine) ?? 0 : 0
  const hasCommentMarker = markerCount > 0
  const existingClassName =
    typeof restProps.className === 'string' ? restProps.className : ''
  const mergedClassName = hasCommentMarker
    ? `${existingClassName} spec-comment-marked`.trim()
    : existingClassName
  return createElement(tagName, {
    ...restProps,
    className: mergedClassName.length > 0 ? mergedClassName : undefined,
    'data-source-line': sourceLine,
    'data-has-comment-marker': hasCommentMarker ? 'true' : undefined,
    'data-comment-count': hasCommentMarker ? String(markerCount) : undefined,
  })
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

export function SpecViewerPanel({
  workspaceRootPath,
  activeSpecPath,
  markdownContent,
  isLoading,
  readError,
  onOpenRelativePath,
  onGoToSourceLine,
  onRequestAddComment,
  commentLineCounts,
  restoredScrollTop = null,
  onScrollPositionChange,
}: SpecViewerPanelProps) {
  const tocHeadings = useMemo(
    () =>
      markdownContent ? extractMarkdownHeadings(markdownContent, 3) : [],
    [markdownContent],
  )
  const contentRef = useRef<HTMLElement | null>(null)
  const [linkPopoverState, setLinkPopoverState] = useState<LinkPopoverState | null>(
    null,
  )
  const [sourcePopoverState, setSourcePopoverState] =
    useState<SourcePopoverState | null>(null)
  const [isTocExpanded, setIsTocExpanded] = useState(false)
  const [resolvedCommentMarkerCounts, setResolvedCommentMarkerCounts] =
    useState<ReadonlyMap<number, number>>(new Map())
  const lastAppliedScrollRestoreRef = useRef<{
    specPath: string
    contentLength: number
    scrollTop: number
  } | null>(null)

  useEffect(() => {
    setIsTocExpanded(false)
    setLinkPopoverState(null)
    setSourcePopoverState(null)
    setResolvedCommentMarkerCounts(new Map())
    lastAppliedScrollRestoreRef.current = null
  }, [activeSpecPath])

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
      return
    }

    const renderedSourceLines = collectRenderedSourceLines(containerElement)
    const mappedCounts = mapCommentCountsToRenderedSourceLines(
      commentLineCounts,
      renderedSourceLines,
    )

    setResolvedCommentMarkerCounts((previous) =>
      areLineCountMapsEqual(previous, mappedCounts) ? previous : mappedCounts,
    )
  }, [activeSpecPath, commentLineCounts, markdownContent])

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
      setSourcePopoverState(null)
      const resolvedLink = resolveSpecLink(href, activeSpecPath)
      if (resolvedLink.kind === 'anchor') {
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
    [activeSpecPath, onOpenRelativePath],
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
      setLinkPopoverState(null)
      setSourcePopoverState({
        selectionRange: resolvedSelectionRange,
        x: event.clientX,
        y: event.clientY,
      })
    },
    [],
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

      {!activeSpecPath && (
        <p className="spec-viewer-empty" data-testid="spec-viewer-empty">
          Select a Markdown file to render it in the spec panel.
        </p>
      )}

      {activeSpecPath && isLoading && (
        <p className="spec-viewer-loading" data-testid="spec-viewer-loading">
          Loading markdown preview...
        </p>
      )}

      {activeSpecPath && !isLoading && readError && (
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

      {activeSpecPath && !isLoading && !readError && markdownContent && (
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
            onContextMenu={handleSpecContextMenu}
            onScroll={handleContentScroll}
            ref={contentRef}
          >
            <ReactMarkdown
              urlTransform={(url) => sanitizeMarkdownUri(url)}
              components={{
                a: ({ node, href, children, ...anchorProps }) => {
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
                img: ({ node, src, alt, ...imageProps }) => {
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
                p: (props) =>
                  renderBlockWithSourceLine(
                    'p',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                li: (props) =>
                  renderBlockWithSourceLine(
                    'li',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                blockquote: (props) =>
                  renderBlockWithSourceLine(
                    'blockquote',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                pre: (props) =>
                  renderBlockWithSourceLine(
                    'pre',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                table: (props) =>
                  renderBlockWithSourceLine(
                    'table',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                h1: (props) =>
                  renderBlockWithSourceLine(
                    'h1',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                h2: (props) =>
                  renderBlockWithSourceLine(
                    'h2',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                h3: (props) =>
                  renderBlockWithSourceLine(
                    'h3',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                h4: (props) =>
                  renderBlockWithSourceLine(
                    'h4',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                h5: (props) =>
                  renderBlockWithSourceLine(
                    'h5',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
                h6: (props) =>
                  renderBlockWithSourceLine(
                    'h6',
                    props as Record<string, unknown>,
                    resolvedCommentMarkerCounts,
                  ),
              }}
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
    </section>
  )
}
