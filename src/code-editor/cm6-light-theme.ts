import type { Extension } from '@codemirror/state'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'

const cm6LightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#f3f6f8',
    color: '#24292f',
  },
  '.cm-content': {
    caretColor: '#24292f',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#24292f',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    {
      backgroundColor: 'rgba(52,120,185,0.18)',
    },
  '.cm-panels': {
    backgroundColor: '#f3f6f8',
    color: '#24292f',
  },
  '.cm-panels.cm-panels-top': {
    borderBottom: '1px solid #c8d0d8',
  },
  '.cm-panels.cm-panels-bottom': {
    borderTop: '1px solid #c8d0d8',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(214,177,65,0.24)',
    outline: '1px solid rgba(214,177,65,0.38)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(214,177,65,0.34)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(52,120,185,0.08)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(52,120,185,0.12)',
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: 'rgba(52,120,185,0.16)',
  },
  '.cm-gutters': {
    backgroundColor: '#e7ecf1',
    color: '#57606a',
    border: 'none',
    borderRight: '1px solid #c8d0d8',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e7ecf1',
    color: '#24292f',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#57606a',
  },
  '.cm-tooltip': {
    border: '1px solid #c8d0d8',
    backgroundColor: '#ffffff',
  },
  '.cm-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  '.cm-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: '#ffffff',
    borderBottomColor: '#ffffff',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: 'rgba(52,120,185,0.14)',
      color: '#1f2328',
    },
  },
})

export const lightTheme: Extension[] = [
  cm6LightTheme,
  syntaxHighlighting(defaultHighlightStyle),
]
