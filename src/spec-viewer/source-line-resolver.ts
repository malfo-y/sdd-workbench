const SOURCE_LINE_ATTRIBUTE = 'data-source-line'

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

export function resolveSourceLine(input: {
  target: EventTarget | null
  selection: Selection | null
}): number | null {
  return (
    resolveSourceLineFromTarget(input.target) ??
    resolveSourceLineFromSelection(input.selection)
  )
}

