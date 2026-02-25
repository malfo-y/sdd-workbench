import { describe, expect, it } from 'vitest'
import {
  buildCopyActiveFilePathPayload,
  buildCopySelectedContentPayload,
  buildCopySelectedLinesPayload,
} from './copy-payload'

describe('copy-payload', () => {
  it('returns active file path payload as relative path', () => {
    expect(buildCopyActiveFilePathPayload('src/auth.ts')).toBe('src/auth.ts')
  })

  it('includes single line number when selectionRange is a single line', () => {
    expect(
      buildCopyActiveFilePathPayload('src/auth.ts', { startLine: 42, endLine: 42 }),
    ).toBe('src/auth.ts:L42')
  })

  it('includes line range when selectionRange spans multiple lines', () => {
    expect(
      buildCopyActiveFilePathPayload('src/auth.ts', { startLine: 10, endLine: 20 }),
    ).toBe('src/auth.ts:L10-L20')
  })

  it('normalizes reversed selectionRange for path payload', () => {
    expect(
      buildCopyActiveFilePathPayload('src/auth.ts', { startLine: 20, endLine: 10 }),
    ).toBe('src/auth.ts:L10-L20')
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

  it('builds selected content payload with selected body only', () => {
    const payload = buildCopySelectedContentPayload({
      content: 'line1\nline2\nline3',
      selectionRange: {
        startLine: 2,
        endLine: 3,
      },
    })

    expect(payload).toBe('line2\nline3')
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

  it('normalizes reversed ranges for selected content payload', () => {
    const payload = buildCopySelectedContentPayload({
      content: 'line1\nline2\nline3',
      selectionRange: {
        startLine: 3,
        endLine: 2,
      },
    })

    expect(payload).toBe('line2\nline3')
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

  it('clamps selected content payload range to file boundaries', () => {
    const payload = buildCopySelectedContentPayload({
      content: 'line1\nline2\nline3',
      selectionRange: {
        startLine: 0,
        endLine: 99,
      },
    })

    expect(payload).toBe('line1\nline2\nline3')
  })
})
