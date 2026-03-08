import { EditorView } from '@codemirror/view'
import { syntaxHighlighting } from '@codemirror/language'
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import type { Extension } from '@codemirror/state'

const cm6DarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#1d2128',
      color: '#d7dce3',
    },
    '.cm-content': {
      caretColor: '#d7dce3',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#d7dce3',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: 'rgba(123,182,232,0.22)',
      },
    '.cm-panels': {
      backgroundColor: '#20252d',
      color: '#d7dce3',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid #333a45',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid #333a45',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(214,177,65,0.22)',
      outline: '1px solid rgba(214,177,65,0.42)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(214,177,65,0.34)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(123,182,232,0.08)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(123,182,232,0.14)',
    },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(123,182,232,0.18)',
    },
    '.cm-gutters': {
      backgroundColor: '#1d2128',
      color: '#8f98a5',
      border: 'none',
      borderRight: '1px solid #333a45',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1d2128',
      color: '#d7dce3',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#8f98a5',
    },
    '.cm-tooltip': {
      border: '1px solid #4f5968',
      backgroundColor: '#262c36',
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: '#262c36',
      borderBottomColor: '#262c36',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(123,182,232,0.18)',
        color: '#eef2f7',
      },
    },
  },
  { dark: true },
)

export const darkGrayTheme: Extension[] = [
  cm6DarkTheme,
  syntaxHighlighting(oneDarkHighlightStyle),
]

export const darkTheme = darkGrayTheme
