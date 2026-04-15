import {
  createHighlighterCore,
  type HighlighterCore,
  type LanguageInput,
  type ThemeInput,
} from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import {
  DEFAULT_APPEARANCE_THEME,
  type AppearanceTheme,
  type ResolvedAppearanceTheme,
  resolveAppearanceTheme,
} from '../appearance-theme'
import type { HighlightLanguage } from './language-map'
import { ayuMirageTheme } from './shiki-ayu-mirage-theme'
import { quietLightTheme } from './shiki-quiet-light-theme'
import pythonLanguage from 'shiki/langs/python.mjs'

export type HighlightLineToken = {
  content: string
  color: string | null
}

const LANG_IMPORTS: Record<string, LanguageInput> = {
  typescript: () => import('shiki/langs/typescript.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  python: pythonLanguage,
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

const THEME_IMPORTS: Record<ResolvedAppearanceTheme, ThemeInput> = {
  'dark-gray': ayuMirageTheme,
  light: quietLightTheme,
}

const THEME_NAMES: Record<ResolvedAppearanceTheme, string> = {
  'dark-gray': 'ayu-mirage',
  light: 'quiet-light',
}

type HighlighterCacheEntry = {
  promise: Promise<HighlighterCore>
  instance: HighlighterCore | null
  disposeTimer: ReturnType<typeof setTimeout> | null
}

const highlighterCache = new Map<ResolvedAppearanceTheme, HighlighterCacheEntry>()
const HIGHLIGHTER_IDLE_DISPOSE_MS = 60_000

function clearDisposeTimer(entry: HighlighterCacheEntry) {
  if (!entry.disposeTimer) {
    return
  }
  clearTimeout(entry.disposeTimer)
  entry.disposeTimer = null
}

function disposeHighlighterEntry(entry: HighlighterCacheEntry) {
  clearDisposeTimer(entry)
  const disposableHighlighter = entry.instance as (HighlighterCore & {
    dispose?: () => void
  }) | null
  disposableHighlighter?.dispose?.()
}

function scheduleHighlighterDisposal(
  resolvedTheme: ResolvedAppearanceTheme,
  entry: HighlighterCacheEntry,
) {
  clearDisposeTimer(entry)
  entry.disposeTimer = setTimeout(() => {
    if (highlighterCache.get(resolvedTheme) !== entry) {
      return
    }
    highlighterCache.delete(resolvedTheme)
    disposeHighlighterEntry(entry)
  }, HIGHLIGHTER_IDLE_DISPOSE_MS)
}

export function getOrCreateHighlighter(
  appearanceTheme: AppearanceTheme = DEFAULT_APPEARANCE_THEME,
): Promise<HighlighterCore> {
  const resolved = resolveAppearanceTheme(appearanceTheme)
  const existing = highlighterCache.get(resolved)
  if (existing) {
    scheduleHighlighterDisposal(resolved, existing)
    return existing.promise
  }

  const entry: HighlighterCacheEntry = {
    promise: Promise.resolve(null as unknown as HighlighterCore),
    instance: null,
    disposeTimer: null,
  }

  entry.promise = createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    themes: [THEME_IMPORTS[resolved]],
    langs: [],
  })
    .then((highlighter) => {
      entry.instance = highlighter
      scheduleHighlighterDisposal(resolved, entry)
      return highlighter
    })
    .catch((error) => {
      highlighterCache.delete(resolved)
      throw error
    })

  highlighterCache.set(resolved, entry)
  return entry.promise
}

export async function disposeHighlighterCache(): Promise<void> {
  const entries = Array.from(highlighterCache.values())
  highlighterCache.clear()

  await Promise.all(
    entries.map(async (entry) => {
      try {
        clearDisposeTimer(entry)
        const highlighter =
          entry.instance ?? (await entry.promise.catch(() => null))
        if (!highlighter) {
          return
        }
        const disposableHighlighter = highlighter as HighlighterCore & {
          dispose?: () => void
        }
        disposableHighlighter.dispose?.()
      } catch {
        // Ignore cache disposal failures to keep teardown best-effort.
      }
    }),
  )
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

function splitToPlaintextLineTokens(code: string): HighlightLineToken[][] {
  return code.split('\n').map((line) => [
    {
      content: line.length > 0 ? line : ' ',
      color: null,
    },
  ])
}

export function renderLineTokensToHtml(
  lineTokens: readonly HighlightLineToken[],
): string {
  if (lineTokens.length === 0) {
    return ' '
  }

  const allEmpty = lineTokens.every((token) => token.content.length === 0)
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
}

export async function highlightLineTokens(
  code: string,
  language: HighlightLanguage,
  appearanceTheme: AppearanceTheme = DEFAULT_APPEARANCE_THEME,
): Promise<HighlightLineToken[][]> {
  if (language === 'plaintext' || code.length === 0) {
    return splitToPlaintextLineTokens(code)
  }

  let highlighter: HighlighterCore
  try {
    highlighter = await getOrCreateHighlighter(appearanceTheme)
  } catch {
    return splitToPlaintextLineTokens(code)
  }

  const loadedLangs = highlighter.getLoadedLanguages()
  if (!loadedLangs.includes(language)) {
    const langImporter = LANG_IMPORTS[language]
    if (!langImporter) {
      return splitToPlaintextLineTokens(code)
    }
    try {
      await highlighter.loadLanguage(langImporter)
    } catch {
      return splitToPlaintextLineTokens(code)
    }
  }

  const resolved = resolveAppearanceTheme(appearanceTheme)
  const { tokens } = highlighter.codeToTokens(code, {
    lang: language,
    theme: THEME_NAMES[resolved],
  })

  return tokens.map((lineTokens) => {
    if (lineTokens.length === 0) {
      return [{ content: ' ', color: null }]
    }

    const allEmpty = lineTokens.every((token) => token.content.length === 0)
    if (allEmpty) {
      return [{ content: ' ', color: null }]
    }

    return lineTokens.map((token) => ({
      content: token.content,
      color: token.color ?? null,
    }))
  })
}

export async function highlightLines(
  code: string,
  language: HighlightLanguage,
  appearanceTheme: AppearanceTheme = DEFAULT_APPEARANCE_THEME,
): Promise<string[]> {
  const tokenLines = await highlightLineTokens(code, language, appearanceTheme)
  return tokenLines.map((lineTokens) => renderLineTokensToHtml(lineTokens))
}

export async function highlightPreviewLines(
  previewLines: string[],
  language: HighlightLanguage,
  appearanceTheme: AppearanceTheme = DEFAULT_APPEARANCE_THEME,
): Promise<string[]> {
  if (language === 'plaintext' || previewLines.length === 0) {
    return escapeHtmlForLines(previewLines)
  }

  const code = previewLines.join('\n')
  return highlightLines(code, language, appearanceTheme)
}
