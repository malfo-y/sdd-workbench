const SOURCE_LINE_ATTRIBUTE = 'data-source-line'

export type SourceLineRange = {
  startLine: number
  endLine: number
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

function toElement(node: Node | null): Element | null {
  if (!node) {
    return null
  }
  return node instanceof Element ? node : node.parentElement
}

function resolveSourceLineFromElement(element: Element | null): number | null {
  let current: Element | null = element
  while (current) {
    const normalized = normalizeSourceLine(
      current.getAttribute(SOURCE_LINE_ATTRIBUTE),
    )
    if (normalized !== null) {
      return normalized
    }
    current = current.parentElement
  }
  return null
}

export function resolveSourceLineFromTarget(target: EventTarget | null): number | null {
  if (!(target instanceof Node)) {
    return null
  }
  return resolveSourceLineFromElement(toElement(target))
}

export function resolveSourceLineFromSelection(
  selection: Selection | null,
): number | null {
  if (!selection) {
    return null
  }

  return (
    resolveSourceLineFromElement(toElement(selection.anchorNode)) ??
    resolveSourceLineFromElement(toElement(selection.focusNode))
  )
}

export function resolveSourceLineRangeFromSelection(
  selection: Selection | null,
): SourceLineRange | null {
  if (!selection) {
    return null
  }

  const anchorLine = resolveSourceLineFromElement(toElement(selection.anchorNode))
  const focusLine = resolveSourceLineFromElement(toElement(selection.focusNode))
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
