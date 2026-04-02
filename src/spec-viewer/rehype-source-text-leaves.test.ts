import { describe, expect, it } from 'vitest'
import { rehypeWrapSourceTextLeaves } from './rehype-source-text-leaves'

type HastNode = {
  type?: string
  tagName?: string
  value?: string
  position?: unknown
  properties?: Record<string, unknown>
  children?: HastNode[]
}

describe('rehype-source-text-leaves', () => {
  it('wraps non-empty text leaves inside table cells', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'table',
          children: [
            {
              type: 'element',
              tagName: 'tr',
              children: [
                {
                  type: 'element',
                  tagName: 'td',
                  children: [
                    {
                      type: 'text',
                      value: 'alpha',
                      position: {
                        start: { offset: 10 },
                        end: { offset: 15 },
                      },
                    },
                  ],
                },
                {
                  type: 'element',
                  tagName: 'th',
                  children: [
                    {
                      type: 'text',
                      value: 'beta',
                      position: {
                        start: { offset: 18 },
                        end: { offset: 22 },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    rehypeWrapSourceTextLeaves()(tree)

    const row = tree.children?.[0]?.children?.[0]
    const tdChild = row?.children?.[0]?.children?.[0]
    const thChild = row?.children?.[1]?.children?.[0]

    expect(tdChild).toMatchObject({
      type: 'element',
      tagName: 'span',
      properties: {
        'data-source-text-leaf': 'true',
      },
    })
    expect(thChild).toMatchObject({
      type: 'element',
      tagName: 'span',
      properties: {
        'data-source-text-leaf': 'true',
      },
    })
  })

  it('does not wrap whitespace-only text leaves inside table cells', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'td',
          children: [
            {
              type: 'text',
              value: '   ',
            },
          ],
        },
      ],
    }

    rehypeWrapSourceTextLeaves()(tree)

    expect(tree.children?.[0]?.children?.[0]).toMatchObject({
      type: 'text',
      value: '   ',
    })
  })
})
