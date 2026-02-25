import type { LineSelectionRange } from '../workspace/workspace-model'

type SelectedLinesPayloadInput = {
  relativePath: string
  content: string
  selectionRange: LineSelectionRange
}

type SelectedContentPayloadInput = {
  content: string
  selectionRange: LineSelectionRange
}

type NormalizedSelection = {
  startLine: number
  endLine: number
  selectedContent: string
}

function normalizeLineNumber(lineNumber: number): number {
  return Math.max(1, Math.trunc(lineNumber))
}

export function buildCopyActiveFilePathPayload(
  relativePath: string,
  selectionRange?: LineSelectionRange,
): string {
  if (selectionRange) {
    const start = normalizeLineNumber(selectionRange.startLine)
    const end = normalizeLineNumber(selectionRange.endLine)
    const normalizedStart = Math.min(start, end)
    const normalizedEnd = Math.max(start, end)
    if (normalizedStart === normalizedEnd) {
      return `${relativePath}:L${normalizedStart}`
    }
    return `${relativePath}:L${normalizedStart}-L${normalizedEnd}`
  }
  return relativePath
}

function normalizeSelection({
  content,
  selectionRange,
}: SelectedContentPayloadInput): NormalizedSelection {
  const lines = content.length === 0 ? [''] : content.split('\n')
  const lineCount = lines.length

  const start = normalizeLineNumber(selectionRange.startLine)
  const end = normalizeLineNumber(selectionRange.endLine)
  const normalizedStart = Math.min(start, end)
  const normalizedEnd = Math.max(start, end)

  const clampedStart = Math.min(normalizedStart, lineCount)
  const clampedEnd = Math.min(normalizedEnd, lineCount)
  const selectedContent = lines.slice(clampedStart - 1, clampedEnd).join('\n')

  return {
    startLine: clampedStart,
    endLine: clampedEnd,
    selectedContent,
  }
}

export function buildCopySelectedContentPayload({
  content,
  selectionRange,
}: SelectedContentPayloadInput): string {
  return normalizeSelection({
    content,
    selectionRange,
  }).selectedContent
}

export function buildCopySelectedLinesPayload({
  relativePath,
  content,
  selectionRange,
}: SelectedLinesPayloadInput): string {
  const normalizedSelection = normalizeSelection({
    content,
    selectionRange,
  })

  return `${relativePath}:L${normalizedSelection.startLine}-L${normalizedSelection.endLine}\n${normalizedSelection.selectedContent}`
}
