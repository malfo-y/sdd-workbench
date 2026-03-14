import { describe, expect, it } from 'vitest'
import { extractCodeBlockCitationMatches } from './code-block-citation'

describe('extractCodeBlockCitationMatches', () => {
  it('extracts inline citations from unlabeled fenced code content', () => {
    const matches = extractCodeBlockCitationMatches(
      [
        'DJDataset [data_juicer/core/data/dj_dataset.py:DJDataset]',
        'NestedDataset [data_juicer/core/data/dj_dataset.py:NestedDataset]',
      ].join('\n'),
    )

    expect(matches).toEqual([
      {
        lineNumber: 1,
        startOffset: 10,
        endOffset: 57,
        rawText: '[data_juicer/core/data/dj_dataset.py:DJDataset]',
        target: {
          targetRelativePath: 'data_juicer/core/data/dj_dataset.py',
          symbolName: 'DJDataset',
        },
      },
      {
        lineNumber: 2,
        startOffset: 14,
        endOffset: 65,
        rawText: '[data_juicer/core/data/dj_dataset.py:NestedDataset]',
        target: {
          targetRelativePath: 'data_juicer/core/data/dj_dataset.py',
          symbolName: 'NestedDataset',
        },
      },
    ])
  })

  it('extracts Python comment citations and ignores non-citation brackets', () => {
    const matches = extractCodeBlockCitationMatches(
      [
        '# [src/app.py:run]',
        'sample["meta.date"]',
        'items[0:10]',
      ].join('\n'),
    )

    expect(matches).toEqual([
      {
        lineNumber: 1,
        startOffset: 2,
        endOffset: 18,
        rawText: '[src/app.py:run]',
        target: {
          targetRelativePath: 'src/app.py',
          symbolName: 'run',
        },
      },
    ])
  })

  it('rejects unsupported dotted symbols in generic fenced blocks', () => {
    const matches = extractCodeBlockCitationMatches(
      'Worker [src/app.py:Worker.run]',
    )

    expect(matches).toEqual([])
  })
})
