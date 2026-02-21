import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import type { HighlightLanguage } from './language-map'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function highlightLineContent(
  lineContent: string,
  language: HighlightLanguage,
): string {
  if (language === 'plaintext') {
    return escapeHtml(lineContent)
  }

  const grammar = Prism.languages[language]
  if (!grammar) {
    return escapeHtml(lineContent)
  }

  return Prism.highlight(lineContent, grammar, language)
}

export function highlightPreviewLines(
  previewLines: string[],
  language: HighlightLanguage,
): string[] {
  return previewLines.map((lineContent) =>
    lineContent.length > 0 ? highlightLineContent(lineContent, language) : ' ',
  )
}
