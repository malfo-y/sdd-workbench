import { type MouseEvent } from 'react'
import type { AppearanceTheme } from '../appearance-theme'
import type { CodeComment } from '../code-comments/comment-types'
import type { Components } from 'react-markdown'
import {
  buildCitationHref,
  parseBracketCitationText,
} from './citation-target'
import { HighlightedCodeBlock } from './highlighted-code-block'
import {
  resolveMarkdownImageSource,
} from './markdown-security'
import {
  buildSourceLineAttributes,
  SOURCE_TEXT_LEAF_ATTRIBUTE,
} from './source-line-metadata'
import {
  renderBlockWithSourceLine,
  renderElementWithSourceLine,
  resolveMarkdownLanguage,
  type MarkdownComponentProps,
} from './spec-viewer-helpers'

type CommentMarkerMouseEnterHandler = (
  event: MouseEvent<HTMLElement>,
  lineNumber: number,
  comments: readonly CodeComment[],
) => void

type SpecViewerMarkdownComponentContext = {
  activeSpecPath: string | null
  appearanceTheme: AppearanceTheme
  workspaceRootPath: string | null
  resolvedCommentMarkerCounts: ReadonlyMap<string, number>
  resolvedCommentMarkerEntries: ReadonlyMap<string, readonly CodeComment[]>
  onCommentMarkerMouseEnter: CommentMarkerMouseEnterHandler
  onCommentMarkerMouseLeave: () => void
  onMarkdownLinkClick: (
    event: MouseEvent<HTMLAnchorElement>,
    href?: string,
  ) => void
}

type CommentAwareBlockTag =
  | 'p'
  | 'li'
  | 'blockquote'
  | 'pre'
  | 'table'
  | 'th'
  | 'td'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'

type MarkdownBlockOptions = {
  includeAnchorLine?: boolean
  markerAnchor?: boolean
  markerPlacement?: 'inside' | 'before'
}

type CommentAwareBlockComponents = Pick<Components, CommentAwareBlockTag>

const BLOCKED_RESOURCE_PLACEHOLDER_TEXT = 'Image blocked by viewer policy'

function createCommentAwareBlockRenderer<Tag extends CommentAwareBlockTag>(
  tagName: Tag,
  context: SpecViewerMarkdownComponentContext,
  options?: MarkdownBlockOptions,
) {
  return (props: MarkdownComponentProps<Tag>) =>
    renderBlockWithSourceLine(
      tagName,
      props,
      context.resolvedCommentMarkerCounts,
      context.resolvedCommentMarkerEntries,
      context.onCommentMarkerMouseEnter,
      context.onCommentMarkerMouseLeave,
      options,
    )
}

function createPlainElementRenderer<Tag extends 'tr'>(tagName: Tag) {
  return (props: MarkdownComponentProps<Tag>) =>
    renderElementWithSourceLine(tagName, props)
}

function createCommentAwareBlockRenderers(
  context: SpecViewerMarkdownComponentContext,
): CommentAwareBlockComponents {
  return {
    p: createCommentAwareBlockRenderer('p', context),
    li: createCommentAwareBlockRenderer('li', context),
    blockquote: createCommentAwareBlockRenderer('blockquote', context),
    pre: createCommentAwareBlockRenderer('pre', context),
    table: createCommentAwareBlockRenderer('table', context, {
      markerPlacement: 'before',
    }),
    th: createCommentAwareBlockRenderer('th', context, {
      includeAnchorLine: false,
    }),
    td: createCommentAwareBlockRenderer('td', context, {
      includeAnchorLine: false,
    }),
    h1: createCommentAwareBlockRenderer('h1', context),
    h2: createCommentAwareBlockRenderer('h2', context),
    h3: createCommentAwareBlockRenderer('h3', context),
    h4: createCommentAwareBlockRenderer('h4', context),
    h5: createCommentAwareBlockRenderer('h5', context),
    h6: createCommentAwareBlockRenderer('h6', context),
  }
}

function createMarkdownAnchorRenderer(
  context: SpecViewerMarkdownComponentContext,
) {
  return (props: MarkdownComponentProps<'a'>) => {
    const { node, href, children, ...anchorProps } = props
    return (
      <a
        {...anchorProps}
        {...buildSourceLineAttributes(node, {
          includeAnchorLine: false,
        })}
        href={href}
        onClick={(event) => context.onMarkdownLinkClick(event, href)}
      >
        {children}
      </a>
    )
  }
}

function createMarkdownSpanRenderer() {
  return (props: MarkdownComponentProps<'span'>) => {
    const { node, children, className, ...spanProps } = props
    const isSourceTextLeaf =
      node?.properties?.[SOURCE_TEXT_LEAF_ATTRIBUTE] === 'true'
    const classNames = typeof className === 'string' ? className.split(/\s+/) : []
    const isKatexDisplayRoot = classNames.includes('katex-display')
    const isKatexRoot =
      classNames.includes('katex') &&
      !classNames.includes('katex-html') &&
      !classNames.includes('katex-mathml')

    if (!isSourceTextLeaf && !isKatexRoot && !isKatexDisplayRoot) {
      return (
        <span className={className} {...spanProps}>
          {children}
        </span>
      )
    }

    return (
      <span
        className={className}
        {...spanProps}
        {...buildSourceLineAttributes(node, {
          includeAnchorLine: isKatexDisplayRoot,
        })}
      >
        {children}
      </span>
    )
  }
}

function createMarkdownImageRenderer(
  context: SpecViewerMarkdownComponentContext,
) {
  return (props: MarkdownComponentProps<'img'>) => {
    const { src, alt, ...imageProps } = props
    const resolvedImageSource = resolveMarkdownImageSource(
      src,
      context.activeSpecPath,
      context.workspaceRootPath,
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
  }
}

function createMarkdownCodeRenderer(
  context: SpecViewerMarkdownComponentContext,
) {
  return (props: MarkdownComponentProps<'code'>) => {
    const { node, className, children, ...codeProps } = props
    const languageMatch =
      typeof className === 'string' ? className.match(/language-(\w+)/) : null
    const codeText = String(children).replace(/\n$/, '')
    // Fenced code blocks span multiple source lines (even single-line
    // content has opening/closing fences). Inline code stays on one line.
    const nodeSpansMultipleLines =
      node?.position?.start?.line != null &&
      node?.position?.end?.line != null &&
      node.position.end.line > node.position.start.line
    const isFencedBlock =
      !!languageMatch || codeText.includes('\n') || nodeSpansMultipleLines
    if (!isFencedBlock) {
      const inlineCitationTarget = parseBracketCitationText(codeText)
      if (inlineCitationTarget) {
        const href = buildCitationHref(inlineCitationTarget)
        return (
          <a
            {...buildSourceLineAttributes(node, {
              includeAnchorLine: false,
            })}
            className="spec-inline-citation-link"
            href={href}
            onClick={(event) => context.onMarkdownLinkClick(event, href)}
          >
            <code className={className} {...codeProps}>
              {children}
            </code>
          </a>
        )
      }

      return (
        <code
          {...buildSourceLineAttributes(node, {
            includeAnchorLine: false,
          })}
          className={className}
          {...codeProps}
        >
          {children}
        </code>
      )
    }

    const language = languageMatch
      ? resolveMarkdownLanguage(languageMatch[1])
      : 'plaintext'
    return (
      <HighlightedCodeBlock
        appearanceTheme={context.appearanceTheme}
        code={codeText}
        language={language}
        onCitationClick={context.onMarkdownLinkClick}
        sourceLineStart={node?.position?.start?.line}
      />
    )
  }
}

export function createSpecViewerMarkdownComponents(
  context: SpecViewerMarkdownComponentContext,
): Components {
  return {
    ...createCommentAwareBlockRenderers(context),
    tr: createPlainElementRenderer('tr'),
    a: createMarkdownAnchorRenderer(context),
    span: createMarkdownSpanRenderer(),
    img: createMarkdownImageRenderer(context),
    code: createMarkdownCodeRenderer(context),
  }
}
