import type { LineSelectionRange } from '../workspace/workspace-model'

type SelectedLinesPayloadInput = {
  relativePath: string
  content: string
  selectionRange: LineSelectionRange
}

function normalizeLineNumber(lineNumber: number): number {
  return Math.max(1, Math.trunc(lineNumber))
}

export function buildCopyActiveFilePathPayload(relativePath: string): string {
  return relativePath
}

export function buildCopySelectedLinesPayload({
  relativePath,
  content,
  selectionRange,
}: SelectedLinesPayloadInput): string {
  const lines = content.length === 0 ? [''] : content.split('\n')
  const lineCount = lines.length

  const start = normalizeLineNumber(selectionRange.startLine)
  const end = normalizeLineNumber(selectionRange.endLine)
  const normalizedStart = Math.min(start, end)
  const normalizedEnd = Math.max(start, end)

  const clampedStart = Math.min(normalizedStart, lineCount)
  const clampedEnd = Math.min(normalizedEnd, lineCount)
  const selectedContent = lines.slice(clampedStart - 1, clampedEnd).join('\n')

  return `${relativePath}:L${clampedStart}-L${clampedEnd}\n${selectedContent}`
}
