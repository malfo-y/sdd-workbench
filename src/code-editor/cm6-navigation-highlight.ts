import { StateEffect, StateField, type EditorState, type Extension } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'

export const setNavigationLineHighlight = StateEffect.define<number | null>()

function buildNavigationLineDecoration(
  state: EditorState,
  lineNumber: number | null,
): DecorationSet {
  if (lineNumber === null || state.doc.lines === 0) {
    return Decoration.none
  }

  const clampedLineNumber = Math.min(
    Math.max(1, Math.trunc(lineNumber)),
    state.doc.lines,
  )
  const line = state.doc.line(clampedLineNumber)

  return Decoration.set([
    Decoration.line({
      attributes: {
        class: 'cm-navigation-line',
        'data-navigation-line': String(clampedLineNumber),
      },
    }).range(line.from),
  ])
}

export const navigationLineHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(value, tr) {
    let nextValue = value.map(tr.changes)

    for (const effect of tr.effects) {
      if (effect.is(setNavigationLineHighlight)) {
        return buildNavigationLineDecoration(tr.state, effect.value)
      }
    }

    return nextValue
  },
  provide: (field) => EditorView.decorations.from(field),
})

export function createNavigationHighlightExtension(): Extension[] {
  return [navigationLineHighlightField]
}
