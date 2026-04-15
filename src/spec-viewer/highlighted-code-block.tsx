import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import type { AppearanceTheme } from '../appearance-theme'
import {
  escapeHtml,
  highlightLineTokens,
  type HighlightLineToken,
  renderLineTokensToHtml,
} from '../code-viewer/syntax-highlight'
import type { HighlightLanguage } from '../code-viewer/language-map'
import {
  extractCodeBlockCitationMatches,
  type CodeBlockCitationMatch,
} from './code-block-citation'
import { buildCitationHref } from './citation-target'

function renderHighlightedCodeLineWithCitationMatches({
  tokens,
  lineNumber,
  matches,
  onCitationClick,
}: {
  tokens: readonly HighlightLineToken[]
  lineNumber: number
  matches: readonly CodeBlockCitationMatch[]
  onCitationClick: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}) {
  if (matches.length === 0) {
    return null
  }

  const segments: ReactNode[] = []
  let cursor = 0
  let tokenKey = 0
  let matchIndex = 0
  let activeMatch: CodeBlockCitationMatch | null = null
  let activeMatchChildren: ReactNode[] = []

  const appendSegment = (text: string, color: string | null, insideCitation: boolean) => {
    if (text.length === 0) {
      return
    }

    const key = `code-line-${lineNumber}-token-${tokenKey}`
    tokenKey += 1
    const segmentNode = color ? (
      <span key={key} style={{ color }}>
        {text}
      </span>
    ) : (
      <Fragment key={key}>{text}</Fragment>
    )

    if (insideCitation) {
      activeMatchChildren.push(segmentNode)
      return
    }

    segments.push(segmentNode)
  }

  const flushActiveCitation = () => {
    if (!activeMatch) {
      return
    }

    const href = buildCitationHref(activeMatch.target)
    segments.push(
      <a
        className="spec-code-citation-link"
        data-testid={`spec-code-citation-${lineNumber}-${matchIndex + 1}`}
        href={href}
        key={`code-line-${lineNumber}-citation-${matchIndex}`}
        onClick={(event) => onCitationClick(event, href)}
        title={activeMatch.rawText}
      >
        {activeMatchChildren}
      </a>,
    )
    activeMatch = null
    activeMatchChildren = []
    matchIndex += 1
  }

  for (const token of tokens) {
    let tokenCursor = 0

    while (tokenCursor < token.content.length) {
      if (!activeMatch) {
        const nextMatch = matches[matchIndex]
        if (!nextMatch) {
          appendSegment(token.content.slice(tokenCursor), token.color, false)
          cursor += token.content.length - tokenCursor
          tokenCursor = token.content.length
          continue
        }

        if (cursor < nextMatch.startOffset) {
          const plainLength = Math.min(
            token.content.length - tokenCursor,
            nextMatch.startOffset - cursor,
          )
          appendSegment(
            token.content.slice(tokenCursor, tokenCursor + plainLength),
            token.color,
            false,
          )
          cursor += plainLength
          tokenCursor += plainLength
          continue
        }

        activeMatch = nextMatch
        activeMatchChildren = []
        continue
      }

      if (cursor < activeMatch.endOffset) {
        const citationLength = Math.min(
          token.content.length - tokenCursor,
          activeMatch.endOffset - cursor,
        )
        appendSegment(
          token.content.slice(tokenCursor, tokenCursor + citationLength),
          token.color,
          true,
        )
        cursor += citationLength
        tokenCursor += citationLength
      }

      if (cursor >= activeMatch.endOffset) {
        flushActiveCitation()
      }
    }
  }

  if (activeMatch) {
    flushActiveCitation()
  }

  return segments
}

export function HighlightedCodeBlock({
  code,
  language,
  appearanceTheme,
  onCitationClick,
  sourceLineStart,
}: {
  code: string
  language: HighlightLanguage
  appearanceTheme: AppearanceTheme
  onCitationClick: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  sourceLineStart?: number
}) {
  const [highlightedLineTokens, setHighlightedLineTokens] = useState<
    HighlightLineToken[][] | null
  >(null)
  const highlightRequestTokenRef = useRef(0)
  const codeLines = useMemo(() => code.split('\n'), [code])
  const citationMatches = useMemo(
    () => extractCodeBlockCitationMatches(code),
    [code],
  )
  const citationMatchesByLineNumber = useMemo(() => {
    const matchesByLineNumber = new Map<number, CodeBlockCitationMatch[]>()
    codeLines.forEach((_, index) => {
      matchesByLineNumber.set(index + 1, [])
    })
    citationMatches.forEach((match) => {
      matchesByLineNumber.get(match.lineNumber)?.push(match)
    })
    return matchesByLineNumber
  }, [citationMatches, codeLines])

  useEffect(() => {
    const requestToken = highlightRequestTokenRef.current + 1
    highlightRequestTokenRef.current = requestToken
    let cancelled = false
    setHighlightedLineTokens(null)

    void highlightLineTokens(code, language, appearanceTheme).then((tokenLines) => {
      if (cancelled || highlightRequestTokenRef.current !== requestToken) {
        return
      }
      setHighlightedLineTokens(tokenLines)
    })

    return () => {
      cancelled = true
    }
  }, [appearanceTheme, code, language])

  const renderedLines =
    highlightedLineTokens?.map((lineTokens) => renderLineTokensToHtml(lineTokens)) ??
    codeLines.map((line) => (line.length > 0 ? escapeHtml(line) : ' '))

  return (
    <code>
      {renderedLines.map((renderedLine, index) => {
        const lineNumber = index + 1
        const matches = citationMatchesByLineNumber.get(lineNumber) ?? []
        const renderedCitationSegments = renderHighlightedCodeLineWithCitationMatches({
          tokens:
            highlightedLineTokens?.[index] ??
            [
              {
                content:
                  (codeLines[index] ?? '').length > 0 ? codeLines[index] ?? '' : ' ',
                color: null,
              },
            ],
          lineNumber,
          matches,
          onCitationClick,
        })

        const sourceLineValue =
          sourceLineStart != null ? sourceLineStart + index : undefined

        return (
          <Fragment key={`code-line-${lineNumber}`}>
            <span data-source-line={sourceLineValue}>
              {renderedCitationSegments ? (
                renderedCitationSegments
              ) : (
                <span dangerouslySetInnerHTML={{ __html: renderedLine }} />
              )}
            </span>
            {lineNumber < renderedLines.length ? '\n' : null}
          </Fragment>
        )
      })}
    </code>
  )
}
