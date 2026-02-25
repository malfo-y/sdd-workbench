import type { EditorState } from '@codemirror/state'
import type { LineSelectionRange } from '../workspace/workspace-model'

/**
 * Converts a CM6 EditorState's main selection into a 1-based LineSelectionRange.
 *
 * - Empty selection (from === to): returns the cursor line as a single-line range.
 * - Multi-line selection: returns the correct startLine/endLine.
 * - Backward selection (anchor > head, i.e. from > to): normalizes so that
 *   startLine is always <= endLine.
 */
export function selectionToLineRange(state: EditorState): LineSelectionRange {
  const { from, to } = state.selection.main

  const fromLine = state.doc.lineAt(from).number
  const toLine = state.doc.lineAt(to).number

  return fromLine <= toLine
    ? { startLine: fromLine, endLine: toLine }
    : { startLine: toLine, endLine: fromLine }
}
