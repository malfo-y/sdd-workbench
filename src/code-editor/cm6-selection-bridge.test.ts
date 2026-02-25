import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { selectionToLineRange } from './cm6-selection-bridge'

// Helper: compute character offset of a given 1-based line/col in a string
function offset(doc: string, line: number, col = 1): number {
  const lines = doc.split('\n')
  let pos = 0
  for (let i = 0; i < line - 1; i++) {
    pos += lines[i].length + 1 // +1 for the newline
  }
  return pos + col - 1
}

const DOC = 'line1\nline2\nline3\nline4\nline5'

describe('selectionToLineRange', () => {
  describe('empty selection (cursor, from === to)', () => {
    it('returns the cursor line as a single-line range on line 1', () => {
      const state = EditorState.create({
        doc: DOC,
        selection: { anchor: offset(DOC, 1) },
      })
      expect(selectionToLineRange(state)).toEqual({ startLine: 1, endLine: 1 })
    })

    it('returns the cursor line as a single-line range on line 3', () => {
      const state = EditorState.create({
        doc: DOC,
        selection: { anchor: offset(DOC, 3) },
      })
      expect(selectionToLineRange(state)).toEqual({ startLine: 3, endLine: 3 })
    })

    it('returns the cursor line as a single-line range on the last line', () => {
      const state = EditorState.create({
        doc: DOC,
        selection: { anchor: offset(DOC, 5) },
      })
      expect(selectionToLineRange(state)).toEqual({ startLine: 5, endLine: 5 })
    })
  })

  describe('forward selection (from < to)', () => {
    it('returns correct startLine and endLine for a two-line selection', () => {
      const state = EditorState.create({
        doc: DOC,
        selection: {
          anchor: offset(DOC, 2),
          head: offset(DOC, 3),
        },
      })
      expect(selectionToLineRange(state)).toEqual({ startLine: 2, endLine: 3 })
    })

    it('returns correct range for lines 1 through 5', () => {
      const state = EditorState.create({
        doc: DOC,
        selection: {
          anchor: offset(DOC, 1),
          head: offset(DOC, 5),
        },
      })
      expect(selectionToLineRange(state)).toEqual({ startLine: 1, endLine: 5 })
    })

    it('handles selection ending mid-line', () => {
      const state = EditorState.create({
        doc: DOC,
        selection: {
          anchor: offset(DOC, 2, 1),
          head: offset(DOC, 4, 3),
        },
      })
      expect(selectionToLineRange(state)).toEqual({ startLine: 2, endLine: 4 })
    })
  })

  describe('backward selection (from > to, i.e. anchor > head)', () => {
    it('normalizes so that startLine <= endLine', () => {
      const state = EditorState.create({
        doc: DOC,
        selection: {
          anchor: offset(DOC, 4),
          head: offset(DOC, 2),
        },
      })
      expect(selectionToLineRange(state)).toEqual({ startLine: 2, endLine: 4 })
    })

    it('normalizes a 3-to-1 backward selection', () => {
      const state = EditorState.create({
        doc: DOC,
        selection: {
          anchor: offset(DOC, 3),
          head: offset(DOC, 1),
        },
      })
      expect(selectionToLineRange(state)).toEqual({ startLine: 1, endLine: 3 })
    })
  })

  describe('single-line selection (from and to on the same line)', () => {
    it('returns a range where startLine equals endLine', () => {
      const state = EditorState.create({
        doc: DOC,
        selection: {
          anchor: offset(DOC, 2, 1),
          head: offset(DOC, 2, 4),
        },
      })
      expect(selectionToLineRange(state)).toEqual({ startLine: 2, endLine: 2 })
    })
  })
})
