import { useCallback, useState, useMemo, type MouseEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { extractMarkdownHeadings } from './markdown-utils'
import { SpecLinkPopover } from './spec-link-popover'
import { resolveSpecLink, type SpecLinkLineRange } from './spec-link-utils'

type SpecViewerPanelProps = {
  activeSpecPath: string | null
  markdownContent: string | null
  isLoading: boolean
  readError: string | null
  onOpenRelativePath: (
    relativePath: string,
    lineRange: SpecLinkLineRange | null,
  ) => boolean
}

type LinkPopoverState = {
  href: string
  x: number
  y: number
}

export function SpecViewerPanel({
  activeSpecPath,
  markdownContent,
  isLoading,
  readError,
  onOpenRelativePath,
}: SpecViewerPanelProps) {
  const tocHeadings = useMemo(
    () =>
      markdownContent ? extractMarkdownHeadings(markdownContent, 3) : [],
    [markdownContent],
  )
  const [linkPopoverState, setLinkPopoverState] = useState<LinkPopoverState | null>(
    null,
  )

  const closeLinkPopover = useCallback(() => {
    setLinkPopoverState(null)
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
              <p className="label spec-viewer-toc-label">Table of Contents</p>
              <ol className="spec-viewer-toc-list">
                {tocHeadings.map((heading) => (
                  <li
                    className={`spec-viewer-toc-item depth-${heading.depth}`}
                    key={`${heading.id}-${heading.depth}`}
                  >
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <article className="spec-viewer-content" data-testid="spec-viewer-content">
            <ReactMarkdown
              components={{
                a: ({ href, children, ...anchorProps }) => (
                  <a
                    {...anchorProps}
                    href={href}
                    onClick={(event) => handleMarkdownLinkClick(event, href)}
                  >
                    {children}
                  </a>
                ),
              }}
              rehypePlugins={[rehypeSlug]}
              remarkPlugins={[remarkGfm]}
            >
              {markdownContent}
            </ReactMarkdown>
          </article>
        </div>
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
