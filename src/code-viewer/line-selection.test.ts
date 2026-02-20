import { describe, expect, it } from 'vitest'
import {
  computeSelectionRange,
  normalizeLineSelectionRange,
  splitPreviewLines,
} from './line-selection'

describe('line-selection', () => {
  it('normalizes reversed ranges', () => {
    expect(normalizeLineSelectionRange(8, 3)).toEqual({
      startLine: 3,
      endLine: 8,
    })
  })

  it('builds single-line selection without shift', () => {
    expect(computeSelectionRange(null, 5, false)).toEqual({
      anchorLine: 5,
      range: {
        startLine: 5,
        endLine: 5,
      },
    })
  })

  it('extends selection range with shift from anchor line', () => {
    expect(computeSelectionRange(4, 9, true)).toEqual({
      anchorLine: 4,
      range: {
        startLine: 4,
        endLine: 9,
      },
    })
  })

  it('normalizes reverse shift selection range', () => {
    expect(computeSelectionRange(7, 2, true)).toEqual({
      anchorLine: 7,
      range: {
        startLine: 2,
        endLine: 7,
      },
    })
  })

  it('keeps one blank line for empty content', () => {
    expect(splitPreviewLines('')).toEqual([''])
  })
})
