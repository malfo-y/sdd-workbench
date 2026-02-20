import { describe, expect, it } from 'vitest'
import {
  buildCopyActiveFilePathPayload,
  buildCopySelectedLinesPayload,
} from './copy-payload'

describe('copy-payload', () => {
  it('returns active file path payload as relative path', () => {
    expect(buildCopyActiveFilePathPayload('src/auth.ts')).toBe('src/auth.ts')
  })

  it('builds selected lines payload with fixed header format', () => {
    const payload = buildCopySelectedLinesPayload({
      relativePath: 'src/auth.ts',
      content: 'line1\nline2\nline3',
      selectionRange: {
        startLine: 2,
        endLine: 3,
      },
    })

    expect(payload).toBe('src/auth.ts:L2-L3\nline2\nline3')
  })

  it('normalizes reversed selection ranges', () => {
    const payload = buildCopySelectedLinesPayload({
      relativePath: 'src/auth.ts',
      content: 'line1\nline2\nline3',
      selectionRange: {
        startLine: 3,
        endLine: 2,
      },
    })

    expect(payload).toBe('src/auth.ts:L2-L3\nline2\nline3')
  })

  it('clamps selection range to file boundaries', () => {
    const payload = buildCopySelectedLinesPayload({
      relativePath: 'src/auth.ts',
      content: 'line1\nline2\nline3',
      selectionRange: {
        startLine: 0,
        endLine: 99,
      },
    })

    expect(payload).toBe('src/auth.ts:L1-L3\nline1\nline2\nline3')
  })

  it('handles empty file content', () => {
    const payload = buildCopySelectedLinesPayload({
      relativePath: 'src/auth.ts',
      content: '',
      selectionRange: {
        startLine: 1,
        endLine: 1,
      },
    })

    expect(payload).toBe('src/auth.ts:L1-L1\n')
  })
})
