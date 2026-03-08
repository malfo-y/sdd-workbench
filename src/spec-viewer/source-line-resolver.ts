import {
  SOURCE_LINE_ATTRIBUTE,
  SOURCE_LINE_END_ATTRIBUTE,
  SOURCE_LINE_START_ATTRIBUTE,
  SOURCE_OFFSET_END_ATTRIBUTE,
  SOURCE_OFFSET_START_ATTRIBUTE,
  SOURCE_TEXT_LEAF_ATTRIBUTE,
} from './source-line-metadata'
import {
  normalizeSourceOffsetRange,
  type SourceOffsetRange,
} from '../source-selection'

export type SourceLineRange = {
  startLine: number
  endLine: number
}

export type SourceSelectionRange = SourceLineRange & {
  sourceOffsetRange?: SourceOffsetRange
}

function normalizeSourceLine(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null
    }
    const normalized = Math.trunc(value)
    return normalized >= 1 ? normalized : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      return null
    }
    const normalized = Math.trunc(parsed)
    return normalized >= 1 ? normalized : null
  }

  return null
}

function normalizeSourceOffset(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null
    }
    const normalized = Math.trunc(value)
    return normalized >= 0 ? normalized : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      return null
    }
    const normalized = Math.trunc(parsed)
    return normalized >= 0 ? normalized : null
  }

  return null
}

function toElement(node: Node | null): Element | null {
  if (!node) {
    return null
  }
  return node instanceof Element ? node : node.parentElement
}

function clampNodeOffset(node: Node, rawOffset: number | undefined): number {
  const maxOffset =
    node instanceof CharacterData ? node.data.length : node.childNodes.length
  const fallbackOffset = maxOffset
  const candidateOffset =
    typeof rawOffset === 'number' && Number.isFinite(rawOffset)
      ? Math.trunc(rawOffset)
      : fallbackOffset
  if (candidateOffset <= 0) {
    return 0
  }
  if (candidateOffset >= maxOffset) {
    return maxOffset
  }
  return candidateOffset
}

function countLineBreaks(text: string): number {
  let count = 0
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') {
      count += 1
    }
  }
  return count
}

function resolveSourceLineSpanFromElement(
  element: Element | null,
): SourceLineRange | null {
  if (!element) {
    return null
  }

  const anchorLine = normalizeSourceLine(element.getAttribute(SOURCE_LINE_ATTRIBUTE))
  const startLine = normalizeSourceLine(
    element.getAttribute(SOURCE_LINE_START_ATTRIBUTE),
  )
  const endLine = normalizeSourceLine(
    element.getAttribute(SOURCE_LINE_END_ATTRIBUTE),
  )
  const normalizedStartLine = startLine ?? anchorLine ?? endLine
  const normalizedEndLine = endLine ?? anchorLine ?? startLine
  if (normalizedStartLine === null || normalizedEndLine === null) {
    return null
  }

  return {
    startLine: Math.min(normalizedStartLine, normalizedEndLine),
    endLine: Math.max(normalizedStartLine, normalizedEndLine),
  }
}

function resolveSourceOffsetSpanFromElement(
  element: Element | null,
): SourceOffsetRange | null {
  if (!element) {
    return null
  }

  return normalizeSourceOffsetRange({
    startOffset: normalizeSourceOffset(
      element.getAttribute(SOURCE_OFFSET_START_ATTRIBUTE),
    ) ?? Number.NaN,
    endOffset: normalizeSourceOffset(
      element.getAttribute(SOURCE_OFFSET_END_ATTRIBUTE),
    ) ?? Number.NaN,
  })
}

function resolveNodeTextOffsetWithinElement(
  element: HTMLElement,
  targetNode: Node,
  targetOffset: number | undefined,
): number | null {
  if (!element.contains(targetNode)) {
    return null
  }

  try {
    const range = document.createRange()
    range.selectNodeContents(element)
    range.setEnd(targetNode, clampNodeOffset(targetNode, targetOffset))
    return range.toString().length
  } catch {
    return null
  }
}

function estimateLineFromSpanOffset(
  span: SourceLineRange,
  textOffset: number | null,
  totalTextLength: number,
) {
  if (span.startLine >= span.endLine) {
    return span.startLine
  }

  if (textOffset === null || totalTextLength <= 0) {
    return span.startLine
  }

  const totalLineCount = span.endLine - span.startLine + 1
  const boundedOffset = Math.max(0, Math.min(textOffset, totalTextLength))
  const ratio = boundedOffset / totalTextLength
  const lineIndex = Math.min(
    totalLineCount - 1,
    Math.floor(ratio * totalLineCount),
  )

  return span.startLine + lineIndex
}

function resolveCodeBlockLineOffset(
  codeElement: HTMLElement,
  targetNode: Node,
  targetOffset: number | undefined,
): number | null {
  if (!codeElement.contains(targetNode)) {
    return null
  }

  try {
    const range = document.createRange()
    range.setStart(codeElement, 0)
    range.setEnd(targetNode, clampNodeOffset(targetNode, targetOffset))
    return countLineBreaks(range.toString())
  } catch {
    return null
  }
}

function resolveSourceLineFromNode(
  node: Node | null,
  nodeOffset?: number,
): number | null {
  const element = toElement(node)
  if (!element) {
    return null
  }

  const targetNode = node ?? element
  let current: Element | null = element
  while (current) {
    const sourceLineSpan = resolveSourceLineSpanFromElement(current)
    if (sourceLineSpan) {
      if (
        current instanceof HTMLElement &&
        current.tagName.toLowerCase() === 'pre'
      ) {
        const codeElement = current.querySelector<HTMLElement>('code')
        if (codeElement) {
          const codeBlockLineOffset = resolveCodeBlockLineOffset(
            codeElement,
            targetNode,
            nodeOffset,
          )
          if (codeBlockLineOffset !== null) {
            return sourceLineSpan.startLine + codeBlockLineOffset
          }
        }
      }
      if (current instanceof HTMLElement) {
        const textOffset = resolveNodeTextOffsetWithinElement(
          current,
          targetNode,
          nodeOffset,
        )
        return estimateLineFromSpanOffset(
          sourceLineSpan,
          textOffset,
          current.textContent?.length ?? 0,
        )
      }

      return sourceLineSpan.startLine
    }
    current = current.parentElement
  }
  return null
}

function getSourceSpanDistance(span: SourceLineRange, lineNumber: number): number {
  if (lineNumber < span.startLine) {
    return span.startLine - lineNumber
  }
  if (lineNumber > span.endLine) {
    return lineNumber - span.endLine
  }
  return 0
}

function getElementDepth(element: Element): number {
  let depth = 0
  let current: Element | null = element
  while (current) {
    depth += 1
    current = current.parentElement
  }
  return depth
}

function resolveExactSourceOffsetFromElement(
  element: HTMLElement,
  targetNode: Node,
  targetOffset: number | undefined,
  sourceText: string,
): number | null {
  const sourceOffsetSpan = resolveSourceOffsetSpanFromElement(element)
  if (!sourceOffsetSpan) {
    return null
  }

  const textOffset = resolveNodeTextOffsetWithinElement(
    element,
    targetNode,
    targetOffset,
  )
  if (textOffset === null) {
    return null
  }

  const renderedText = element.textContent ?? ''
  if (renderedText.length === 0) {
    return null
  }

  if (element.getAttribute(SOURCE_TEXT_LEAF_ATTRIBUTE) === 'true') {
    return Math.min(
      sourceOffsetSpan.endOffset,
      sourceOffsetSpan.startOffset + textOffset,
    )
  }

  const rawSlice = sourceText.slice(
    sourceOffsetSpan.startOffset,
    sourceOffsetSpan.endOffset,
  )
  const contentIndex = rawSlice.indexOf(renderedText)
  if (contentIndex < 0) {
    return null
  }

  const contentStartOffset = sourceOffsetSpan.startOffset + contentIndex
  const contentEndOffset = contentStartOffset + renderedText.length

  return Math.min(contentEndOffset, contentStartOffset + textOffset)
}

function resolveSourceOffsetFromNode(
  node: Node | null,
  nodeOffset: number | undefined,
  sourceText: string,
): number | null {
  const element = toElement(node)
  if (!element) {
    return null
  }

  const targetNode = node ?? element
  let current: Element | null = element
  while (current) {
    if (current instanceof HTMLElement) {
      const resolvedOffset = resolveExactSourceOffsetFromElement(
        current,
        targetNode,
        nodeOffset,
        sourceText,
      )
      if (resolvedOffset !== null) {
        return resolvedOffset
      }
    }
    current = current.parentElement
  }

  return null
}

export function resolveSourceLineFromTarget(target: EventTarget | null): number | null {
  if (!(target instanceof Node)) {
    return null
  }
  return resolveSourceLineFromNode(target)
}

export function resolveSourceLineFromSelection(
  selection: Selection | null,
): number | null {
  if (!selection) {
    return null
  }

  return (
    resolveSourceLineFromNode(selection.anchorNode, selection.anchorOffset) ??
    resolveSourceLineFromNode(selection.focusNode, selection.focusOffset)
  )
}

export function resolveSourceLineRangeFromSelection(
  selection: Selection | null,
): SourceLineRange | null {
  if (!selection) {
    return null
  }

  const anchorLine = resolveSourceLineFromNode(
    selection.anchorNode,
    selection.anchorOffset,
  )
  const focusLine = resolveSourceLineFromNode(
    selection.focusNode,
    selection.focusOffset,
  )
  if (anchorLine === null && focusLine === null) {
    return null
  }

  const startCandidate = anchorLine ?? focusLine ?? null
  const endCandidate = focusLine ?? anchorLine ?? null
  if (startCandidate === null || endCandidate === null) {
    return null
  }

  return {
    startLine: Math.min(startCandidate, endCandidate),
    endLine: Math.max(startCandidate, endCandidate),
  }
}

export function resolveSourceSelectionRangeFromSelection(
  selection: Selection | null,
  sourceText: string | null,
): SourceSelectionRange | null {
  const lineRange = resolveSourceLineRangeFromSelection(selection)
  if (!selection || !lineRange) {
    return lineRange
  }

  if (!sourceText || selection.isCollapsed) {
    return lineRange
  }

  const anchorOffset = resolveSourceOffsetFromNode(
    selection.anchorNode,
    selection.anchorOffset,
    sourceText,
  )
  const focusOffset = resolveSourceOffsetFromNode(
    selection.focusNode,
    selection.focusOffset,
    sourceText,
  )
  if (anchorOffset === null || focusOffset === null) {
    return lineRange
  }

  const sourceOffsetRange = normalizeSourceOffsetRange({
    startOffset: Math.min(anchorOffset, focusOffset),
    endOffset: Math.max(anchorOffset, focusOffset),
  })

  if (!sourceOffsetRange) {
    return lineRange
  }

  return {
    ...lineRange,
    sourceOffsetRange,
  }
}

export function resolveSourceLine(input: {
  target: EventTarget | null
  selection: Selection | null
}): number | null {
  return (
    resolveSourceLineFromTarget(input.target) ??
    resolveSourceLineFromSelection(input.selection)
  )
}

export function resolveNearestSourceLineFromPoint(
  containerElement: HTMLElement | null,
  clientY: number,
): number | null {
  if (!containerElement || !Number.isFinite(clientY)) {
    return null
  }

  const sourceLineElements = Array.from(
    containerElement.querySelectorAll<HTMLElement>(`[${SOURCE_LINE_ATTRIBUTE}]`),
  )

  let nearestLine: number | null = null
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const element of sourceLineElements) {
    const normalizedLine = normalizeSourceLine(
      element.getAttribute(SOURCE_LINE_ATTRIBUTE),
    )
    if (normalizedLine === null) {
      continue
    }

    const rect = element.getBoundingClientRect()
    const centerY = rect.top + rect.height / 2
    const distance = Math.abs(clientY - centerY)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLine = normalizedLine
      continue
    }

    if (distance === nearestDistance && nearestLine !== null) {
      nearestLine = Math.min(nearestLine, normalizedLine)
    }
  }

  return nearestLine
}

export function resolveBestRenderedSourceBlockForLine(
  containerElement: HTMLElement | null,
  lineNumber: number,
): HTMLElement | null {
  if (!containerElement || !Number.isFinite(lineNumber)) {
    return null
  }

  const normalizedLine = Math.max(1, Math.trunc(lineNumber))
  const candidateElements = Array.from(
    containerElement.querySelectorAll<HTMLElement>(`[${SOURCE_LINE_ATTRIBUTE}]`),
  )

  let bestElement: HTMLElement | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  let bestSpanLength = Number.POSITIVE_INFINITY
  let bestAnchorDistance = Number.POSITIVE_INFINITY
  let bestDepth = -1

  for (const element of candidateElements) {
    const span = resolveSourceLineSpanFromElement(element)
    if (!span) {
      continue
    }

    const distance = getSourceSpanDistance(span, normalizedLine)
    const spanLength = span.endLine - span.startLine
    const anchorLine = normalizeSourceLine(
      element.getAttribute(SOURCE_LINE_ATTRIBUTE),
    )
    const anchorDistance =
      anchorLine === null ? Number.POSITIVE_INFINITY : Math.abs(anchorLine - normalizedLine)
    const depth = getElementDepth(element)

    const isBetterCandidate =
      distance < bestDistance ||
      (distance === bestDistance && spanLength < bestSpanLength) ||
      (distance === bestDistance &&
        spanLength === bestSpanLength &&
        anchorDistance < bestAnchorDistance) ||
      (distance === bestDistance &&
        spanLength === bestSpanLength &&
        anchorDistance === bestAnchorDistance &&
        depth > bestDepth)

    if (!isBetterCandidate) {
      continue
    }

    bestElement = element
    bestDistance = distance
    bestSpanLength = spanLength
    bestAnchorDistance = anchorDistance
    bestDepth = depth
  }

  return bestElement
}
