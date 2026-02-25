import { StateField, StateEffect } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, gutter, GutterMarker } from '@codemirror/view'
import type { CodeComment } from '../code-comments/comment-types'

/**
 * Represents the comment data attached to a single line in the gutter.
 */
export type CommentGutterEntry = {
  count: number
  entries: readonly CodeComment[]
}

/**
 * StateEffect used to push a new Map of line-number → CommentGutterEntry into
 * the editor state.  Replacing the whole Map at once keeps the reducer simple
 * and avoids partial-update edge-cases.
 */
export const setCommentMarkers =
  StateEffect.define<Map<number, CommentGutterEntry>>()

/**
 * StateField that holds the current comment markers keyed by 1-based line
 * number.  Initial value is an empty Map.
 */
export const commentMarkersField = StateField.define<Map<number, CommentGutterEntry>>({
  create: () => new Map(),
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setCommentMarkers)) {
        return effect.value
      }
    }
    return value
  },
})

// ---------------------------------------------------------------------------
// GutterMarker
// ---------------------------------------------------------------------------

/**
 * A CM6 GutterMarker that renders a small badge showing the comment count for
 * the associated line.  The hover callbacks are injected at construction time
 * so that the marker itself has no dependency on external React state.
 */
class CommentBadgeMarker extends GutterMarker {
  constructor(
    private readonly lineNumber: number,
    private readonly entry: CommentGutterEntry,
    private readonly onHover: (lineNumber: number, rect: DOMRect) => void,
    private readonly onLeave: () => void,
  ) {
    super()
  }

  toDOM(): Node {
    const span = document.createElement('span')
    span.className = 'cm-comment-badge'
    span.textContent = String(this.entry.count)

    // Capture locals for the event listeners so they remain stable even if
    // the marker instance is later garbage-collected.
    const ln = this.lineNumber
    const onHover = this.onHover
    const onLeave = this.onLeave

    span.addEventListener('mouseenter', () => {
      onHover(ln, span.getBoundingClientRect())
    })
    span.addEventListener('mouseleave', () => {
      onLeave()
    })

    return span
  }
}

// ---------------------------------------------------------------------------
// Gutter extension builder
// ---------------------------------------------------------------------------

function commentGutter(
  onHover: (lineNumber: number, rect: DOMRect) => void,
  onLeave: () => void,
): Extension {
  return gutter({
    class: 'cm-comment-gutter',
    lineMarker(view: EditorView, line) {
      const markers = view.state.field(commentMarkersField)
      const lineNum = view.state.doc.lineAt(line.from).number
      const entry = markers.get(lineNum)
      return entry ? new CommentBadgeMarker(lineNum, entry, onHover, onLeave) : null
    },
    lineMarkerChange: (update) =>
      update.state.field(commentMarkersField) !== update.startState.field(commentMarkersField),
  })
}

/**
 * Creates the full set of CM6 extensions needed to display comment-count
 * badges in the editor gutter.
 *
 * @param onHover - Called when the cursor enters a badge.  Receives the
 *   1-based line number and the badge element's bounding rect so the caller
 *   can position a popover.
 * @param onLeave - Called when the cursor leaves a badge.
 * @returns An array of Extension values ready to be spread into the editor's
 *   extension list.
 */
export function createCommentGutterExtension(
  onHover: (lineNumber: number, rect: DOMRect) => void,
  onLeave: () => void,
): Extension[] {
  return [commentMarkersField, commentGutter(onHover, onLeave)]
}
