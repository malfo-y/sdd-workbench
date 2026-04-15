function normalizeHeadingId(headingId: string): string {
  return headingId.startsWith('user-content-')
    ? headingId.slice('user-content-'.length)
    : headingId
}

function buildHeadingIdCandidates(headingId: string): string[] {
  const trimmedHeadingId = headingId.trim()
  if (!trimmedHeadingId) {
    return []
  }

  const normalizedHeadingId = normalizeHeadingId(trimmedHeadingId)
  return Array.from(
    new Set([trimmedHeadingId, normalizedHeadingId, `user-content-${normalizedHeadingId}`]),
  )
}

/**
 * Finds a heading element inside a container by its ID, with a text-content
 * fallback when the exact ID selector does not match.
 *
 * Returns `null` when no matching heading is found.
 */
export function findHeadingElement(
  containerElement: HTMLElement,
  headingId: string,
  headingText: string | null,
): HTMLElement | null {
  const targetHeading =
    buildHeadingIdCandidates(headingId)
      .map((candidateHeadingId) => {
        const escapedId =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(candidateHeadingId)
            : candidateHeadingId
        return (
          containerElement.querySelector<HTMLElement>(`#${escapedId}`) ??
          document.getElementById(candidateHeadingId)
        )
      })
      .find((headingElement): headingElement is HTMLElement => headingElement !== null) ??
    null
  const fallbackHeading =
    targetHeading ??
    (headingText
      ? Array.from(
          containerElement.querySelectorAll<HTMLElement>(
            'h1, h2, h3, h4, h5, h6',
          ),
        ).find(
          (headingElement) =>
            headingElement.textContent?.trim() === headingText,
        ) ?? null
      : null)
  return fallbackHeading
}

function getHeadingOffsetTop(
  containerElement: HTMLElement,
  headingElement: HTMLElement,
) {
  if (headingElement.offsetTop > 0) {
    return headingElement.offsetTop
  }

  const containerRect = containerElement.getBoundingClientRect()
  const headingRect = headingElement.getBoundingClientRect()
  return headingRect.top - containerRect.top + containerElement.scrollTop
}

export function resolveActiveHeadingId(
  containerElement: HTMLElement,
): string | null {
  const headingElements = Array.from(
    containerElement.querySelectorAll<HTMLElement>(
      'h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]',
    ),
  )
  if (headingElements.length === 0) {
    return null
  }

  const threshold = containerElement.scrollTop + 24
  let activeHeadingId = headingElements[0]?.id ?? null
  let bestOffsetTop = Number.NEGATIVE_INFINITY

  for (const headingElement of headingElements) {
    if (!headingElement.id) {
      continue
    }

    const offsetTop = getHeadingOffsetTop(containerElement, headingElement)
    if (offsetTop > threshold || offsetTop < bestOffsetTop) {
      continue
    }

    bestOffsetTop = offsetTop
    activeHeadingId = normalizeHeadingId(headingElement.id)
  }

  return activeHeadingId
}

/**
 * Scrolls to a heading element identified by its `id` attribute. Uses
 * `findHeadingElement` to resolve the target with a text-content fallback.
 *
 * Returns `true` when the heading was found and scrolled to, `false` otherwise.
 */
export function scrollToHeadingById(
  containerElement: HTMLElement,
  headingId: string,
  headingText: string | null,
): boolean {
  const headingElement = findHeadingElement(containerElement, headingId, headingText)
  if (!headingElement) {
    return false
  }

  if (typeof headingElement.scrollIntoView === 'function') {
    headingElement.scrollIntoView({
      block: 'start',
      inline: 'nearest',
    })
  }
  return true
}
