import { describe, expect, it } from 'vitest'
import {
  buildSourceLineAttributes,
  getMarkdownNodeSourceLine,
  getMarkdownNodeSourceLineSpan,
  SOURCE_LINE_ATTRIBUTE,
  SOURCE_LINE_END_ATTRIBUTE,
  SOURCE_LINE_START_ATTRIBUTE,
  type MarkdownNodeWithPosition,
} from './source-line-metadata'

describe('source-line-metadata', () => {
  it('normalizes markdown node start/end line span', () => {
    const node = {
      position: {
        start: { line: 3.9 },
        end: { line: 6.2 },
      },
    } satisfies MarkdownNodeWithPosition

    expect(getMarkdownNodeSourceLine(node)).toBe(3)
    expect(getMarkdownNodeSourceLineSpan(node)).toEqual({
      startLine: 3,
      endLine: 6,
    })
  })

  it('falls back to a single available line when start or end is missing', () => {
    expect(
      getMarkdownNodeSourceLineSpan({
        position: {
          end: { line: 9 },
        },
      }),
    ).toEqual({
      startLine: 9,
      endLine: 9,
    })

    expect(
      getMarkdownNodeSourceLineSpan({
        position: {
          start: { line: 5 },
        },
      }),
    ).toEqual({
      startLine: 5,
      endLine: 5,
    })
  })

  it('returns undefined for invalid or missing node positions', () => {
    expect(getMarkdownNodeSourceLineSpan(undefined)).toBeUndefined()
    expect(
      getMarkdownNodeSourceLineSpan({
        position: {
          start: { line: 0 },
          end: { line: Number.NaN },
        },
      }),
    ).toBeUndefined()
  })

  it('builds anchor and span attributes for rendered nodes', () => {
    expect(
      buildSourceLineAttributes({
        position: {
          start: { line: 4 },
          end: { line: 7 },
        },
      }),
    ).toEqual({
      [SOURCE_LINE_ATTRIBUTE]: 4,
      [SOURCE_LINE_START_ATTRIBUTE]: 4,
      [SOURCE_LINE_END_ATTRIBUTE]: 7,
    })

    expect(
      buildSourceLineAttributes(
        {
          position: {
            start: { line: 11 },
            end: { line: 12 },
          },
        },
        {
          includeAnchorLine: false,
        },
      ),
    ).toEqual({
      [SOURCE_LINE_ATTRIBUTE]: undefined,
      [SOURCE_LINE_START_ATTRIBUTE]: 11,
      [SOURCE_LINE_END_ATTRIBUTE]: 12,
    })
  })
})
