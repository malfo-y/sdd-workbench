import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

/** Quiet Light inspired CodeMirror 6 editor chrome */
const cm6LightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#f5f5f5',
    color: '#333333',
  },
  '.cm-content': {
    caretColor: '#333333',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#333333',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    {
      backgroundColor: '#c1f5b0',
    },
  '.cm-panels': {
    backgroundColor: '#f2f2f2',
    color: '#333333',
  },
  '.cm-panels.cm-panels-top': {
    borderBottom: '1px solid #d0d0d0',
  },
  '.cm-panels.cm-panels-bottom': {
    borderTop: '1px solid #d0d0d0',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(254,249,53,0.28)',
    outline: '1px solid rgba(254,249,53,0.5)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(254,249,53,0.5)',
  },
  '.cm-activeLine': {
    backgroundColor: '#e4f6d4',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(193,245,176,0.35)',
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: 'rgba(193,245,176,0.5)',
  },
  '.cm-gutters': {
    backgroundColor: '#ebebeb',
    color: '#aaaaaa',
    border: 'none',
    borderRight: '1px solid #dcdcdc',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e4f6d4',
    color: '#333333',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#777777',
  },
  '.cm-tooltip': {
    border: '1px solid #d0d0d0',
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
      backgroundColor: 'rgba(75,131,205,0.16)',
      color: '#222222',
    },
  },
})

/** Quiet Light syntax token colors */
const quietLightHighlightStyle = HighlightStyle.define([
  // Comments — gray
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: '#aaaaaa',
  },
  // Keywords — blue
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.operatorKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
    ],
    color: '#4b83cd',
  },
  // Operators / punctuation — dark gray
  {
    tag: [tags.operator, tags.punctuation, tags.separator],
    color: '#777777',
  },
  // Strings — green
  {
    tag: [tags.string, tags.special(tags.string)],
    color: '#448c27',
  },
  // Regexp — default text
  { tag: tags.regexp, color: '#333333' },
  // Numbers, booleans, constants — orange-brown
  {
    tag: [
      tags.number,
      tags.bool,
      tags.null,
      tags.atom,
      tags.self,
      tags.special(tags.variableName),
    ],
    color: '#ab6526',
  },
  // Escape sequences — orange-brown
  { tag: tags.escape, color: '#ab6526' },
  // Types, namespaces — purple
  {
    tag: [tags.typeName, tags.standard(tags.typeName), tags.namespace],
    color: '#7a3e9d',
  },
  // Class names — red bold
  {
    tag: [tags.className, tags.definition(tags.className)],
    color: '#aa3731',
    fontWeight: 'bold',
  },
  // Function names — red bold
  {
    tag: [
      tags.function(tags.variableName),
      tags.function(tags.definition(tags.variableName)),
    ],
    color: '#aa3731',
    fontWeight: 'bold',
  },
  // Property names — red
  {
    tag: [tags.propertyName, tags.definition(tags.propertyName)],
    color: '#aa3731',
  },
  // Variable names — default text
  { tag: tags.variableName, color: '#333333' },
  // HTML/XML tags — blue
  { tag: tags.tagName, color: '#4b83cd' },
  // Attributes — light blue
  { tag: tags.attributeName, color: '#91b3e0' },
  // Attribute values — green
  { tag: tags.attributeValue, color: '#448c27' },
  // Meta / annotations — gray
  {
    tag: [
      tags.meta,
      tags.documentMeta,
      tags.annotation,
      tags.processingInstruction,
    ],
    color: '#aaaaaa',
  },
  // Headings / strong — bold
  { tag: [tags.heading, tags.strong], fontWeight: 'bold' },
  // Emphasis — italic
  { tag: tags.emphasis, fontStyle: 'italic' },
  // Links — blue
  { tag: tags.link, color: '#4b83cd', textDecoration: 'underline' },
  // Invalid — dark red
  { tag: tags.invalid, color: '#660000' },
])

export const lightTheme: Extension[] = [
  cm6LightTheme,
  syntaxHighlighting(quietLightHighlightStyle),
]
