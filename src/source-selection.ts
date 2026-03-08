export type SourceOffsetRange = {
  startOffset: number
  endOffset: number
}

function normalizeSourceOffset(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null
  }

  const normalized = Math.trunc(value)
  return normalized >= 0 ? normalized : null
}

export function normalizeSourceOffsetRange(
  range: SourceOffsetRange | null | undefined,
  maxLength?: number,
): SourceOffsetRange | null {
  if (!range) {
    return null
  }

  const startOffset = normalizeSourceOffset(range.startOffset)
  const endOffset = normalizeSourceOffset(range.endOffset)
  if (startOffset === null || endOffset === null) {
    return null
  }

  const normalizedMaxLength =
    typeof maxLength === 'number' && Number.isFinite(maxLength)
      ? Math.max(0, Math.trunc(maxLength))
      : null

  const boundedStartOffset =
    normalizedMaxLength === null
      ? startOffset
      : Math.min(startOffset, normalizedMaxLength)
  const boundedEndOffset =
    normalizedMaxLength === null
      ? endOffset
      : Math.min(endOffset, normalizedMaxLength)

  if (boundedStartOffset >= boundedEndOffset) {
    return null
  }

  return {
    startOffset: boundedStartOffset,
    endOffset: boundedEndOffset,
  }
}
