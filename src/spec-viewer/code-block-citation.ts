import { parseBracketCitationText, type CitationTarget } from './citation-target'

export type CodeBlockCitationMatch = {
  lineNumber: number
  startOffset: number
  endOffset: number
  rawText: string
  target: CitationTarget
}

const BRACKET_CITATION_PATTERN = /\[[^\]\n]+\]/g

/**
 * Extracts valid `[path:symbol]` citations from fenced code blocks regardless of
 * language. Matches may appear anywhere within a line, which keeps diagram-like
 * text blocks and unlabeled fences navigable.
 */
export function extractCodeBlockCitationMatches(
  code: string,
): CodeBlockCitationMatch[] {
  return code.split('\n').flatMap((line, index) => {
    const matches: CodeBlockCitationMatch[] = []

    for (const match of line.matchAll(BRACKET_CITATION_PATTERN)) {
      const rawText = match[0]
      const target = parseBracketCitationText(rawText)
      if (!target) {
        continue
      }

      const startOffset = match.index ?? -1
      if (startOffset < 0) {
        continue
      }

      matches.push({
        lineNumber: index + 1,
        startOffset,
        endOffset: startOffset + rawText.length,
        rawText,
        target,
      })
    }

    return matches
  })
}
