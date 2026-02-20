export type LineSelectionRange = {
  startLine: number
  endLine: number
}

type NextSelectionResult = {
  anchorLine: number
  range: LineSelectionRange
}

export function normalizeLineSelectionRange(
  startLine: number,
  endLine: number,
): LineSelectionRange {
  return startLine <= endLine
    ? { startLine, endLine }
    : { startLine: endLine, endLine: startLine }
}

export function computeSelectionRange(
  anchorLine: number | null,
  clickedLine: number,
  extendSelection: boolean,
): NextSelectionResult {
  const normalizedLineNumber = Math.max(1, Math.trunc(clickedLine))

  if (!extendSelection || anchorLine === null) {
    return {
      anchorLine: normalizedLineNumber,
      range: {
        startLine: normalizedLineNumber,
        endLine: normalizedLineNumber,
      },
    }
  }

  return {
    anchorLine,
    range: normalizeLineSelectionRange(anchorLine, normalizedLineNumber),
  }
}

export function splitPreviewLines(content: string): string[] {
  if (content.length === 0) {
    return ['']
  }

  return content.split('\n')
}
