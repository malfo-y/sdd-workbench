import { describe, expect, it } from 'vitest'
import { getHighlightLanguage } from './language-map'

describe('language-map', () => {
  it('maps supported extensions to highlight languages', () => {
    expect(getHighlightLanguage('src/app.ts')).toBe('typescript')
    expect(getHighlightLanguage('src/app.tsx')).toBe('tsx')
    expect(getHighlightLanguage('src/app.js')).toBe('javascript')
    expect(getHighlightLanguage('src/app.jsx')).toBe('jsx')
    expect(getHighlightLanguage('src/app.json')).toBe('json')
    expect(getHighlightLanguage('src/app.css')).toBe('css')
    expect(getHighlightLanguage('README.md')).toBe('markdown')
    expect(getHighlightLanguage('tools/script.py')).toBe('python')
  })

  it('falls back to plaintext for unsupported extensions', () => {
    expect(getHighlightLanguage('archive.log')).toBe('plaintext')
    expect(getHighlightLanguage('LICENSE')).toBe('plaintext')
    expect(getHighlightLanguage(null)).toBe('plaintext')
  })
})
