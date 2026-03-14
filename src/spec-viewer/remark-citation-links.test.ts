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
