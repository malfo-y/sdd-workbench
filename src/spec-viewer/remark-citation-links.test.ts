import { describe, expect, it } from 'vitest'
import { buildCitationHref } from './citation-target'
import { transformCitationTextNodes } from './remark-citation-links'

describe('transformCitationTextNodes', () => {
  it('replaces prose citation text with internal link nodes', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Before [src/app.py:run] after',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'text',
        value: 'Before ',
      },
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/app.py',
          symbolName: 'run',
        }),
        children: [
          {
            type: 'text',
            value: '[src/app.py:run]',
          },
        ],
      },
      {
        type: 'text',
        value: ' after',
      },
    ])
  })

  it('replaces file-only prose citation text with internal link nodes', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Before [src/app.py] after',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'text',
        value: 'Before ',
      },
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/app.py',
          symbolName: null,
        }),
        children: [
          {
            type: 'text',
            value: '[src/app.py]',
          },
        ],
      },
      {
        type: 'text',
        value: ' after',
      },
    ])
  })

  it('transforms multiple consecutive citations in one text node', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '[src/a.py:Foo] and [src/b.py:Bar]',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/a.py',
          symbolName: 'Foo',
        }),
        children: [{ type: 'text', value: '[src/a.py:Foo]' }],
      },
      { type: 'text', value: ' and ' },
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/b.py',
          symbolName: 'Bar',
        }),
        children: [{ type: 'text', value: '[src/b.py:Bar]' }],
      },
    ])
  })

  it('transforms one-level dotted method citations', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '[src/app.py:Worker.run]',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/app.py',
          symbolName: 'Worker.run',
        }),
        children: [{ type: 'text', value: '[src/app.py:Worker.run]' }],
      },
    ])
  })

  it('transforms prose citations that contain invisible whitespace artifacts', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '이 핵심 오케스트레이터가 [\u200Bdrift/metrics.py:compute_all_metrics\u200B]이다.',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'text',
        value: '이 핵심 오케스트레이터가 ',
      },
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'drift/metrics.py',
          symbolName: 'compute_all_metrics',
        }),
        children: [
          {
            type: 'text',
            value: '[\u200Bdrift/metrics.py:compute_all_metrics\u200B]',
          },
        ],
      },
      {
        type: 'text',
        value: '이다.',
      },
    ])
  })

  it('transforms bracket-wrapped inline code citations into internal links', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Use [',
            },
            {
              type: 'inlineCode',
              value: 'src/app.py:Worker',
            },
            {
              type: 'text',
              value: '] as the primary entry point.',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'text',
        value: 'Use ',
      },
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/app.py',
          symbolName: 'Worker',
        }),
        children: [
          {
            type: 'text',
            value: '[',
          },
          {
            type: 'inlineCode',
            value: 'src/app.py:Worker',
          },
          {
            type: 'text',
            value: ']',
          },
        ],
      },
      {
        type: 'text',
        value: ' as the primary entry point.',
      },
    ])
  })

  it('transforms multiple bracket-wrapped inline code citations in one paragraph', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Use [',
            },
            {
              type: 'inlineCode',
              value: 'src/app.py',
            },
            {
              type: 'text',
              value: '], [',
            },
            {
              type: 'inlineCode',
              value: 'src/worker.py:Worker.run',
            },
            {
              type: 'text',
              value: '] together.',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'text',
        value: 'Use ',
      },
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/app.py',
          symbolName: null,
        }),
        children: [
          {
            type: 'text',
            value: '[',
          },
          {
            type: 'inlineCode',
            value: 'src/app.py',
          },
          {
            type: 'text',
            value: ']',
          },
        ],
      },
      {
        type: 'text',
        value: ', ',
      },
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/worker.py',
          symbolName: 'Worker.run',
        }),
        children: [
          {
            type: 'text',
            value: '[',
          },
          {
            type: 'inlineCode',
            value: 'src/worker.py:Worker.run',
          },
          {
            type: 'text',
            value: ']',
          },
        ],
      },
      {
        type: 'text',
        value: ' together.',
      },
    ])
  })

  it('transforms bracket-wrapped file-only inline code citations into internal links', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Use [',
            },
            {
              type: 'inlineCode',
              value: 'src/app.py',
            },
            {
              type: 'text',
              value: '] as the primary entry point.',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'text',
        value: 'Use ',
      },
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/app.py',
          symbolName: null,
        }),
        children: [
          {
            type: 'text',
            value: '[',
          },
          {
            type: 'inlineCode',
            value: 'src/app.py',
          },
          {
            type: 'text',
            value: ']',
          },
        ],
      },
      {
        type: 'text',
        value: ' as the primary entry point.',
      },
    ])
  })

  it('transforms bracket-wrapped inline code citations into internal link nodes', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Use [',
            },
            {
              type: 'inlineCode',
              value: 'src/app.py:Worker.run',
            },
            {
              type: 'text',
              value: '] for the callback hook.',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'text',
        value: 'Use ',
      },
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/app.py',
          symbolName: 'Worker.run',
        }),
        children: [
          {
            type: 'text',
            value: '[',
          },
          {
            type: 'inlineCode',
            value: 'src/app.py:Worker.run',
          },
          {
            type: 'text',
            value: ']',
          },
        ],
      },
      {
        type: 'text',
        value: ' for the callback hook.',
      },
    ])
  })

  it('ignores empty brackets and non-citation bracket text', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'See [] and [not a citation] here.',
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    // Neither empty brackets nor non-citation text should be transformed
    expect(tree.children[0]?.children).toEqual([
      { type: 'text', value: 'See [] and [not a citation] here.' },
    ])
  })

  it('transforms citations inside blockquote and list item contexts', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  value: '[src/app.py:run]',
                },
              ],
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    const paragraph = tree.children[0]?.children?.[0]
    expect(paragraph?.children).toEqual([
      {
        type: 'link',
        url: buildCitationHref({
          targetRelativePath: 'src/app.py',
          symbolName: 'run',
        }),
        children: [{ type: 'text', value: '[src/app.py:run]' }],
      },
    ])
  })

  it('leaves inline code and existing markdown links untouched', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'inlineCode',
              value: '[src/app.py:run]',
            },
            {
              type: 'text',
              value: ' ',
            },
            {
              type: 'link',
              url: './guide.md',
              children: [
                {
                  type: 'text',
                  value: '[src/app.py:run]',
                },
              ],
            },
          ],
        },
      ],
    }

    transformCitationTextNodes(tree)

    expect(tree.children[0]?.children).toEqual([
      {
        type: 'inlineCode',
        value: '[src/app.py:run]',
      },
      {
        type: 'text',
        value: ' ',
      },
      {
        type: 'link',
        url: './guide.md',
        children: [
          {
            type: 'text',
            value: '[src/app.py:run]',
          },
        ],
      },
    ])
  })
})
