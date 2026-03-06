import { describe, expect, it } from 'vitest'
import {
  buildSearchMatchStartLines,
  isMarkdownSearchBlockBoundary,
  matchesSpecSearchLine,
} from './spec-search'

describe('spec-search', () => {
  it('matches ordered wildcard tokens within a single line', () => {
    expect(matchesSpecSearchLine('Guide intro for API errors', 'guide*error')).toBe(true)
    expect(matchesSpecSearchLine('Guide intro for API errors', '*error')).toBe(true)
    expect(matchesSpecSearchLine('Guide intro for API errors', 'guide*')).toBe(true)
    expect(matchesSpecSearchLine('Guide intro for API errors', 'guide**error')).toBe(true)
    expect(matchesSpecSearchLine('Guide intro for API errors', '**')).toBe(false)
    expect(matchesSpecSearchLine('Guide intro for API errors', 'error*guide')).toBe(false)
  })

  it('keeps markdown block boundary rules while finding wildcard matches', () => {
    const markdown = [
      '# Title',
      '',
      'Guide intro paragraph',
      '',
      '| Name | Value |',
      '| --- | --- |',
      '| API error row | 1 |',
      '',
      '- Another bullet',
    ].join('\n')

    expect(buildSearchMatchStartLines(markdown, 'guide*para')).toEqual([3])
    expect(buildSearchMatchStartLines(markdown, 'api*row')).toEqual([7])
    expect(buildSearchMatchStartLines(markdown, '**')).toEqual([])
    expect(isMarkdownSearchBlockBoundary('| row | value |')).toBe(true)
  })
})
