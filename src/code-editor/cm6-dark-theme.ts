import { EditorView } from '@codemirror/view'
import { syntaxHighlighting } from '@codemirror/language'
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import type { Extension } from '@codemirror/state'

const cm6DarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#1a1a1a',
      color: '#d3d3d3',
    },
    '.cm-content': {
      caretColor: '#d3d3d3',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#d3d3d3',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: 'rgba(78,140,198,0.2)',
      },
    '.cm-panels': {
      backgroundColor: '#1a1a1a',
      color: '#d3d3d3',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid #2d2d2d',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid #2d2d2d',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(78,140,198,0.2)',
      outline: '1px solid rgba(78,140,198,0.4)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(78,140,198,0.4)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(78,140,198,0.08)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(78,140,198,0.15)',
    },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(78,140,198,0.2)',
    },
    '.cm-gutters': {
      backgroundColor: '#1a1a1a',
      color: '#7d7d7d',
      border: 'none',
      borderRight: '1px solid #2d2d2d',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1a1a1a',
      color: '#d3d3d3',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#7d7d7d',
    },
    '.cm-tooltip': {
      border: '1px solid #3d3d3d',
      backgroundColor: '#252525',
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: '#252525',
      borderBottomColor: '#252525',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(78,140,198,0.2)',
        color: '#d3d3d3',
      },
    },
  },
  { dark: true },
)

export const darkTheme: Extension[] = [
  cm6DarkTheme,
  syntaxHighlighting(oneDarkHighlightStyle),
]
