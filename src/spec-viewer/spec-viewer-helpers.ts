import {
  Fragment,
  createElement,
  type MouseEvent,
} from 'react'
import type { ExtraProps } from 'react-markdown'
import { mapCommentCountsToRenderedSourceLines } from '../code-comments/comment-line-index'
import { type CodeComment } from '../code-comments/comment-types'
import type { HighlightLanguage } from '../code-viewer/language-map'
import {
  buildSourceLineAttributes,
  getMarkdownNodeSourceLine,
} from './source-line-metadata'
import {
  buildCommentMarkerAnchorKey,
  COMMENT_MARKER_ANCHOR_ATTRIBUTE,
  COMMENT_MARKER_KEY_ATTRIBUTE,
  shouldSuppressMarkerForNestedSameLineChild,
} from './spec-viewer-comment-markers'

export type MarkdownComponentProps<Tag extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[Tag] & ExtraProps

export function renderBlockWithSourceLine(
  tagName: keyof JSX.IntrinsicElements,
  props: MarkdownComponentProps<keyof JSX.IntrinsicElements>,
  markerCountsByKey: ReadonlyMap<string, number>,
  markerEntriesByKey: ReadonlyMap<string, readonly CodeComment[]>,
  onMarkerMouseEnter: (
    event: MouseEvent<HTMLElement>,
    lineNumber: number,
    comments: readonly CodeComment[],
  ) => void,
  onMarkerMouseLeave: () => void,
  options?: {
    includeAnchorLine?: boolean
    markerAnchor?: boolean
    markerPlacement?: 'inside' | 'before'
  },
) {
  const { node, children, className, ...restProps } = props
  const sourceLine = getMarkdownNodeSourceLine(node)
  const markerAnchorKey = buildCommentMarkerAnchorKey(node)
  const markerCount =
    markerAnchorKey !== null ? markerCountsByKey.get(markerAnchorKey) ?? 0 : 0
  const markerComments =
    markerAnchorKey !== null ? markerEntriesByKey.get(markerAnchorKey) ?? [] : []
  const hasCommentMarker =
    markerCount > 0 &&
    markerComments.length > 0 &&
    !shouldSuppressMarkerForNestedSameLineChild(tagName, node, sourceLine)
  const existingClassName = typeof className === 'string' ? className : ''
  const mergedClassName = [
    existingClassName,
    hasCommentMarker ? 'spec-comment-marked' : '',
  ]
    .filter((value) => value.length > 0)
    .join(' ')
  const sourceLineAttributes = buildSourceLineAttributes(node, {
    includeAnchorLine: options?.includeAnchorLine,
  })
  const baseProps: Record<string, unknown> = {
    ...restProps,
    ...sourceLineAttributes,
    className: mergedClassName.length > 0 ? mergedClassName : undefined,
    'data-has-comment-marker': hasCommentMarker ? 'true' : undefined,
    'data-comment-count': hasCommentMarker ? String(markerCount) : undefined,
    [COMMENT_MARKER_ANCHOR_ATTRIBUTE]:
      options?.markerAnchor === false || markerAnchorKey === null
        ? undefined
        : 'true',
    [COMMENT_MARKER_KEY_ATTRIBUTE]:
      options?.markerAnchor === false ? undefined : markerAnchorKey ?? undefined,
  }

  if (!hasCommentMarker || sourceLine === undefined) {
    return createElement(tagName, baseProps, children ?? null)
  }

  const markerElement = createElement(
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
  )

  if (options?.markerPlacement === 'before') {
    return createElement(
      Fragment,
      null,
      markerElement,
      createElement(tagName, baseProps, children ?? null),
    )
  }

  return createElement(
    tagName,
    baseProps,
    markerElement,
    children ?? null,
  )
}

export function renderElementWithSourceLine(
  tagName: keyof JSX.IntrinsicElements,
  props: MarkdownComponentProps<keyof JSX.IntrinsicElements>,
  options?: {
    includeAnchorLine?: boolean
  },
) {
  const { node, children, ...restProps } = props

  return createElement(
    tagName,
    {
      ...restProps,
      ...buildSourceLineAttributes(node, options),
    },
    children ?? null,
  )
}

export function containsSelectionNode(
  element: HTMLElement,
  node: Node | null,
): boolean {
  if (!node) {
    return false
  }
  return element.contains(node instanceof Element ? node : node.parentElement)
}

export function hasVisibleSelectionInElement(
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

export function resolveMarkdownLanguage(tag: string): HighlightLanguage {
  const normalized = tag.toLowerCase()
  return (MARKDOWN_LANGUAGE_ALIASES[normalized] ?? normalized) as HighlightLanguage
}

export function mapSearchMatchLinesToRenderedSourceLines(
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
