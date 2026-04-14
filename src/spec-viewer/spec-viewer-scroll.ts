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
  const escapedId =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(headingId)
      : headingId
  const targetHeading =
    containerElement.querySelector<HTMLElement>(`#${escapedId}`) ??
    document.getElementById(headingId)
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
