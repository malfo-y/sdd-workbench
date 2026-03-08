import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  escapeHtml,
  getOrCreateHighlighter,
  highlightLines,
  highlightPreviewLines,
} from './syntax-highlight'
import type { HighlightLanguage } from './language-map'

// Reset the module-level highlighter singleton between relevant tests so that
// caching behaviour can be observed in isolation.
beforeEach(() => {
  vi.resetModules()
})

describe('escapeHtml', () => {
  it('escapes &, <, > correctly', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
    expect(escapeHtml('1 < 2 && 3 > 0')).toBe('1 &lt; 2 &amp;&amp; 3 &gt; 0')
  })

  it('leaves strings without special characters unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
    expect(escapeHtml('')).toBe('')
  })
})

describe('highlightLines', () => {
  it('returns one entry per source line for typescript code', async () => {
    const code = 'const x = 1\nconst y = 2\nconst z = x + y'
    const result = await highlightLines(code, 'typescript')

    expect(result).toHaveLength(3)
  })

  it('entries contain Shiki inline styles for typescript', async () => {
    const code = 'const x: number = 42'
    const result = await highlightLines(code, 'typescript')

    // Shiki with github-dark theme produces hex-colour inline styles
    const hasColorSpan = result.some((line) => line.includes('<span style="color:'))
    expect(hasColorSpan).toBe(true)
  })

  it('changes highlighted output when the appearance theme changes', async () => {
    const code = 'const x: number = 42'
    const darkResult = await highlightLines(code, 'typescript', 'dark-gray')
    const lightResult = await highlightLines(code, 'typescript', 'light')

    expect(lightResult).not.toEqual(darkResult)
  })

  it('returns HTML-escaped lines for plaintext language', async () => {
    const code = 'hello <world> & friends'
    const result = await highlightLines(code, 'plaintext')

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('hello &lt;world&gt; &amp; friends')
  })

  it('returns HTML-escaped lines for empty code string', async () => {
    // An empty string splits into [''], which is a single empty line
    const result = await highlightLines('', 'typescript')

    expect(result).toHaveLength(1)
    // Empty lines are normalised to a single space
    expect(result[0]).toBe(' ')
  })

  it('handles multi-line plaintext with special chars', async () => {
    const code = 'line1 <b>\nline2 & more'
    const result = await highlightLines(code, 'plaintext')

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('line1 &lt;b&gt;')
    expect(result[1]).toBe('line2 &amp; more')
  })

  it('falls back to escaped plaintext for an unknown/unsupported language', async () => {
    // Cast to satisfy TypeScript; at runtime Shiki will fail to load the language
    const unsupported = 'notareallanguage____' as HighlightLanguage
    const code = 'some <code> here'

    // Must not throw; must return escaped lines
    const result = await highlightLines(code, unsupported)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('some &lt;code&gt; here')
  })
})

describe('highlightPreviewLines', () => {
  it('returns a single space for each empty line', async () => {
    const result = await highlightPreviewLines(['', '', ''], 'plaintext')

    expect(result).toHaveLength(3)
    result.forEach((line) => expect(line).toBe(' '))
  })

  it('returns empty array when given empty input', async () => {
    const result = await highlightPreviewLines([], 'plaintext')

    expect(result).toHaveLength(0)
  })

  it('returns HTML-escaped lines for plaintext language', async () => {
    const lines = ['hello <world>', 'foo & bar']
    const result = await highlightPreviewLines(lines, 'plaintext')

    expect(result[0]).toBe('hello &lt;world&gt;')
    expect(result[1]).toBe('foo &amp; bar')
  })

  it('returns a single space for empty line mixed with non-empty lines', async () => {
    const lines = ['const x = 1', '', 'const y = 2']
    const result = await highlightPreviewLines(lines, 'plaintext')

    expect(result[1]).toBe(' ')
  })

  it('highlights non-plaintext preview lines with Shiki', async () => {
    const lines = ['const x = 1', 'const y = 2']
    const result = await highlightPreviewLines(lines, 'typescript')

    expect(result).toHaveLength(2)
    const hasColorSpan = result.some((line) => line.includes('<span style="color:'))
    expect(hasColorSpan).toBe(true)
  })
})

describe('getOrCreateHighlighter', () => {
  it('returns a Highlighter with codeToTokens and getLoadedLanguages methods', async () => {
    const highlighter = await getOrCreateHighlighter()

    expect(typeof highlighter.codeToTokens).toBe('function')
    expect(typeof highlighter.getLoadedLanguages).toBe('function')
  })

  it('returns the same instance on repeated calls (singleton)', async () => {
    const first = await getOrCreateHighlighter()
    const second = await getOrCreateHighlighter()

    expect(first).toBe(second)
  })

  it('keeps separate cached instances per appearance theme', async () => {
    const dark = await getOrCreateHighlighter('dark-gray')
    const darkAgain = await getOrCreateHighlighter('dark-gray')
    const light = await getOrCreateHighlighter('light')

    expect(darkAgain).toBe(dark)
    expect(light).not.toBe(dark)
  })

  it('retries highlighter creation after a transient failure', async () => {
    vi.resetModules()
    let createCalls = 0

    vi.doMock('shiki/core', async () => {
      const actual = await vi.importActual<typeof import('shiki/core')>('shiki/core')
      return {
        ...actual,
        createHighlighterCore: ((options: Parameters<typeof actual.createHighlighterCore>[0]) => {
          createCalls += 1
          if (createCalls === 1) {
            return Promise.reject(new Error('transient create failure'))
          }
          return actual.createHighlighterCore(options)
        }) as typeof actual.createHighlighterCore,
      }
    })

    const { getOrCreateHighlighter: getFreshHighlighter } = await import('./syntax-highlight')

    await expect(getFreshHighlighter('light')).rejects.toThrow(
      'transient create failure',
    )

    const recovered = await getFreshHighlighter('light')

    expect(typeof recovered.codeToTokens).toBe('function')
    expect(createCalls).toBe(2)

    vi.doUnmock('shiki/core')
  })
})
