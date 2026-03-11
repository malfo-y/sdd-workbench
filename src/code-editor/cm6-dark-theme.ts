import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

/** Ayu Mirage inspired CodeMirror 6 editor chrome */
const cm6DarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#1f2430',
      color: '#cccac2',
    },
    '.cm-content': {
      caretColor: '#ffcc66',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#ffcc66',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: '#409fff40',
      },
    '.cm-panels': {
      backgroundColor: '#242936',
      color: '#cccac2',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid #171b24',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid #171b24',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(255,204,102,0.22)',
      outline: '1px solid rgba(255,204,102,0.42)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(255,204,102,0.34)',
    },
    '.cm-activeLine': {
      backgroundColor: '#1a1f29',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(64,159,255,0.18)',
    },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(64,159,255,0.24)',
    },
    '.cm-gutters': {
      backgroundColor: '#1f2430',
      color: '#707a8c80',
      border: 'none',
      borderRight: '1px solid #171b24',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1f2430',
      color: '#cccac2',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#707a8c',
    },
    '.cm-tooltip': {
      border: '1px solid #171b24',
      backgroundColor: '#242936',
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: '#242936',
      borderBottomColor: '#242936',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(64,159,255,0.22)',
        color: '#cccac2',
      },
    },
  },
  { dark: true },
)

/** Ayu Mirage syntax token colors */
const ayuMirageHighlightStyle = HighlightStyle.define([
  // Comments — blue-gray, italic
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: '#697987',
    fontStyle: 'italic',
  },
  // Keywords — orange
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.operatorKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
    ],
    color: '#ffa759',
  },
  // Operators — salmon
  { tag: tags.operator, color: '#f29e74' },
  // Punctuation / separators — muted foreground
  { tag: [tags.punctuation, tags.separator], color: '#b0aea6' },
  // Strings — lime green
  {
    tag: [tags.string, tags.special(tags.string)],
    color: '#d5ff80',
  },
  // Regexp — mint
  { tag: tags.regexp, color: '#95e6cb' },
  // Numbers, booleans, null — lavender
  {
    tag: [tags.number, tags.bool, tags.null, tags.atom],
    color: '#dfbfff',
  },
  // self / this — cyan, italic
  { tag: tags.self, color: '#5ccfe6', fontStyle: 'italic' },
  // special(variableName) e.g. builtins — lavender
  { tag: tags.special(tags.variableName), color: '#dfbfff' },
  // Escape sequences — lavender
  { tag: tags.escape, color: '#dfbfff' },
  // Types, namespaces — sky blue
  {
    tag: [tags.typeName, tags.standard(tags.typeName), tags.namespace],
    color: '#73d0ff',
  },
  // Class names — sky blue, bold
  {
    tag: [tags.className, tags.definition(tags.className)],
    color: '#73d0ff',
    fontWeight: 'bold',
  },
  // Function names — golden yellow, bold
  {
    tag: [
      tags.function(tags.variableName),
      tags.function(tags.definition(tags.variableName)),
    ],
    color: '#ffd580',
    fontWeight: 'bold',
  },
  // Property names — coral
  {
    tag: [tags.propertyName, tags.definition(tags.propertyName)],
    color: '#f28779',
  },
  // Variable names — default text
  { tag: tags.variableName, color: '#cccac2' },
  // HTML/XML tags — cyan
  { tag: tags.tagName, color: '#5ccfe6' },
  // Attributes — golden yellow
  { tag: tags.attributeName, color: '#ffd580' },
  // Attribute values — lime green
  { tag: tags.attributeValue, color: '#d5ff80' },
  // Meta / annotations — muted
  {
    tag: [
      tags.meta,
      tags.documentMeta,
      tags.annotation,
      tags.processingInstruction,
    ],
    color: '#707a8c',
  },
  // Headings / strong — bold, bright
  { tag: [tags.heading, tags.strong], fontWeight: 'bold', color: '#e6e1cf' },
  // Emphasis — italic
  { tag: tags.emphasis, fontStyle: 'italic' },
  // Links — sky blue
  { tag: tags.link, color: '#73d0ff', textDecoration: 'underline' },
  // Invalid — red
  { tag: tags.invalid, color: '#ff3333' },
])

export const darkGrayTheme: Extension[] = [
  cm6DarkTheme,
  syntaxHighlighting(ayuMirageHighlightStyle),
]

export const darkTheme = darkGrayTheme
