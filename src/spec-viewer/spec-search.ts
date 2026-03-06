function buildOrderedSearchTokens(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\*+/)
    .filter((token) => token.length > 0)
}

export function matchesSpecSearchLine(line: string, query: string) {
  const tokens = buildOrderedSearchTokens(query)
  if (tokens.length === 0) {
    return false
  }

  const normalizedLine = line.toLowerCase()
  let searchStartIndex = 0

  for (const token of tokens) {
    const matchedIndex = normalizedLine.indexOf(token, searchStartIndex)
    if (matchedIndex < 0) {
      return false
    }
    searchStartIndex = matchedIndex + token.length
  }

  return true
}

export function isMarkdownSearchBlockBoundary(line: string) {
  return (
    /^(#{1,6})\s/.test(line) ||
    /^```/.test(line) ||
    /^(?:[-*+]|\d+\.)\s/.test(line) ||
    /^>/.test(line) ||
    /^\|/.test(line)
  )
}

export function buildSearchMatchStartLines(markdownContent: string, query: string) {
  const lines = markdownContent.split('\n')
  const matchedStartLines = new Set<number>()
  let currentBlockStartLine: number | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const lineNumber = index + 1
    const trimmedLine = line.trim()

    if (trimmedLine.length === 0) {
      currentBlockStartLine = null
      continue
    }

    if (currentBlockStartLine === null || isMarkdownSearchBlockBoundary(trimmedLine)) {
      currentBlockStartLine = lineNumber
    }

    if (matchesSpecSearchLine(line, query)) {
      matchedStartLines.add(currentBlockStartLine)
    }
  }

  return Array.from(matchedStartLines).sort((left, right) => left - right)
}
