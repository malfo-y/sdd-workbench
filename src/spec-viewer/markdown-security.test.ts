import { describe, expect, it } from 'vitest'
import { sanitize } from 'hast-util-sanitize'
import type { Element, Root } from 'hast'
import {
  MARKDOWN_SANITIZE_SCHEMA,
  isAllowedDataImageUri,
  resolveMarkdownImageSource,
  sanitizeMarkdownUri,
} from './markdown-security'

describe('markdown-security', () => {
  describe('sanitizeMarkdownUri', () => {
    it('blocks unsafe URI schemes', () => {
      expect(sanitizeMarkdownUri('javascript:alert(1)')).toBe('')
      expect(sanitizeMarkdownUri('file:///etc/passwd')).toBe('')
      expect(sanitizeMarkdownUri('vbscript:msgbox(1)')).toBe('')
      expect(sanitizeMarkdownUri('data:text/html;base64,PHNjcmlwdD4=')).toBe('')
    })

    it('allows safe URI schemes and relative paths', () => {
      expect(sanitizeMarkdownUri('https://example.com/docs')).toBe(
        'https://example.com/docs',
      )
      expect(sanitizeMarkdownUri('mailto:hello@example.com')).toBe(
        'mailto:hello@example.com',
      )
      expect(sanitizeMarkdownUri('./images/diagram.png')).toBe(
        './images/diagram.png',
      )
      expect(sanitizeMarkdownUri('#overview')).toBe('#overview')
    })
  })

  describe('isAllowedDataImageUri', () => {
    it('allows only data:image/* base64 URIs', () => {
      expect(
        isAllowedDataImageUri('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'),
      ).toBe(true)
      expect(
        isAllowedDataImageUri('data:image/jpeg;charset=utf-8;base64,/9j/4AAQSk'),
      ).toBe(true)
      expect(
        isAllowedDataImageUri('data:image/png;base64,iVBORw0KGgo AAAANSUhEUgAAAAUA'),
      ).toBe(false)
      expect(isAllowedDataImageUri('data:text/plain;base64,SGVsbG8=')).toBe(false)
    })
  })

  describe('MARKDOWN_SANITIZE_SCHEMA', () => {
    it('preserves the minimal KaTeX MathML subtree and drops unrelated attributes', () => {
      const sanitized = sanitize(
        {
          type: 'root',
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: {
                className: ['katex-display'],
                'data-source-line': 5,
                'data-source-line-end': 7,
                'data-source-line-start': 5,
                style: 'display:block',
                onClick: 'alert(1)',
              },
              children: [
                {
                  type: 'element',
                  tagName: 'math',
                  properties: {
                    xmlns: 'http://www.w3.org/1998/Math/MathML',
                    display: 'block',
                    onClick: 'alert(1)',
                  },
                  children: [
                    {
                      type: 'element',
                      tagName: 'semantics',
                      properties: {},
                      children: [
                        {
                          type: 'element',
                          tagName: 'annotation',
                          properties: {
                            encoding: 'application/x-tex',
                            onClick: 'alert(1)',
                          },
                          children: [{ type: 'text', value: '\\int_0^1 x^2 dx' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        MARKDOWN_SANITIZE_SCHEMA,
      ) as Root

      const katexDisplay = sanitized.children[0] as Element
      expect(katexDisplay).toMatchObject({
        type: 'element',
        tagName: 'span',
        properties: {
          className: ['katex-display'],
          'data-source-line': 5,
          'data-source-line-end': 7,
          'data-source-line-start': 5,
          style: 'display:block',
        },
      })
      expect(katexDisplay.properties).not.toHaveProperty('onClick')

      const math = (katexDisplay.children?.[0] ?? null) as Element | null
      expect(math).toMatchObject({
        type: 'element',
        tagName: 'math',
        properties: {
          display: 'block',
          xmlns: 'http://www.w3.org/1998/Math/MathML',
        },
      })
      expect(math?.properties).not.toHaveProperty('onClick')

      const semantics = (math?.children?.[0] ?? null) as Element | null
      const annotation = (semantics?.children?.[0] ?? null) as Element | null
      expect(annotation).toMatchObject({
        type: 'element',
        tagName: 'annotation',
        properties: {
          encoding: 'application/x-tex',
        },
      })
      expect(annotation?.properties).not.toHaveProperty('onClick')
    })
  })

  describe('resolveMarkdownImageSource', () => {
    it('resolves workspace-relative image paths to file URLs', () => {
      const resolved = resolveMarkdownImageSource(
        './assets/image one.png',
        'docs/spec.md',
        '/Users/tester/workspace',
      )

      expect(resolved).toBe(
        'file:///Users/tester/workspace/docs/assets/image%20one.png',
      )
    })

    it('keeps allowed data:image URI values as-is', () => {
      const dataImageUri = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4'
      expect(
        resolveMarkdownImageSource(
          dataImageUri,
          'docs/spec.md',
          '/Users/tester/workspace',
        ),
      ).toBe(dataImageUri)
    })

    it('returns null for blocked or unresolved sources', () => {
      expect(
        resolveMarkdownImageSource(
          'https://example.com/image.png',
          'docs/spec.md',
          '/Users/tester/workspace',
        ),
      ).toBeNull()
      expect(
        resolveMarkdownImageSource(
          '../../outside.png',
          'docs/spec.md',
          '/Users/tester/workspace',
        ),
      ).toBeNull()
      expect(
        resolveMarkdownImageSource('./assets/image.png', 'docs/spec.md', null),
      ).toBeNull()
    })
  })
})
