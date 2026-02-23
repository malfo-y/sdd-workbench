import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type { HighlightLanguage } from './language-map'

const LANG_IMPORTS: Record<string, () => Promise<unknown>> = {
  typescript: () => import('shiki/langs/typescript.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  xml: () => import('shiki/langs/xml.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  toml: () => import('shiki/langs/toml.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  c: () => import('shiki/langs/c.mjs'),
  cpp: () => import('shiki/langs/cpp.mjs'),
  swift: () => import('shiki/langs/swift.mjs'),
  ruby: () => import('shiki/langs/ruby.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  scss: () => import('shiki/langs/scss.mjs'),
  less: () => import('shiki/langs/less.mjs'),
  graphql: () => import('shiki/langs/graphql.mjs'),
  dockerfile: () => import('shiki/langs/dockerfile.mjs'),
  makefile: () => import('shiki/langs/makefile.mjs'),
  vue: () => import('shiki/langs/vue.mjs'),
  svelte: () => import('shiki/langs/svelte.mjs'),
  php: () => import('shiki/langs/php.mjs'),
  r: () => import('shiki/langs/r.mjs'),
  lua: () => import('shiki/langs/lua.mjs'),
  dart: () => import('shiki/langs/dart.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'),
  scala: () => import('shiki/langs/scala.mjs'),
  zig: () => import('shiki/langs/zig.mjs'),
}

let highlighterPromise: Promise<HighlighterCore> | null = null

export function getOrCreateHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [import('shiki/themes/github-dark.mjs')],
      langs: [],
    })
  }
  return highlighterPromise
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlForLines(lines: string[]): string[] {
  return lines.map((line) => (line.length > 0 ? escapeHtml(line) : ' '))
}

function splitToEscapedLines(code: string): string[] {
  return code.split('\n').map((line) => (line.length > 0 ? escapeHtml(line) : ' '))
}

export async function highlightLines(
  code: string,
  language: HighlightLanguage,
): Promise<string[]> {
  if (language === 'plaintext' || !code) {
    return splitToEscapedLines(code)
  }

  let highlighter: HighlighterCore
  try {
    highlighter = await getOrCreateHighlighter()
  } catch {
    return splitToEscapedLines(code)
  }

  const loadedLangs = highlighter.getLoadedLanguages()
  if (!loadedLangs.includes(language)) {
    const langImporter = LANG_IMPORTS[language]
    if (!langImporter) {
      return splitToEscapedLines(code)
    }
    try {
      await highlighter.loadLanguage(langImporter() as Parameters<HighlighterCore['loadLanguage']>[0])
    } catch {
      return splitToEscapedLines(code)
    }
  }

  const { tokens } = highlighter.codeToTokens(code, {
    lang: language,
    theme: 'github-dark',
  })

  return tokens.map((lineTokens) => {
    if (lineTokens.length === 0) {
      return ' '
    }

    const allEmpty = lineTokens.every((t) => t.content.length === 0)
    if (allEmpty) {
      return ' '
    }

    return lineTokens
      .map((token) => {
        const escaped = escapeHtml(token.content)
        if (token.color) {
          return `<span style="color:${token.color}">${escaped}</span>`
        }
        return escaped
      })
      .join('')
  })
}

export async function highlightPreviewLines(
  previewLines: string[],
  language: HighlightLanguage,
): Promise<string[]> {
  if (language === 'plaintext' || previewLines.length === 0) {
    return escapeHtmlForLines(previewLines)
  }

  const code = previewLines.join('\n')
  return highlightLines(code, language)
}
