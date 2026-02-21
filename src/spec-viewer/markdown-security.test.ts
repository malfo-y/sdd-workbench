import { describe, expect, it } from 'vitest'
import {
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
      expect(isAllowedDataImageUri('data:text/plain;base64,SGVsbG8=')).toBe(false)
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
