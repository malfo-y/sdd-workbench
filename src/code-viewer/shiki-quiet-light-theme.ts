/**
 * Quiet Light Shiki theme — used for spec viewer code blocks.
 * Based on https://github.com/onecrayon/theme-quietlight-vsc
 */
export const quietLightTheme = {
  name: 'quiet-light',
  type: 'light' as const,
  settings: [] as [],
  colors: {
    'editor.background': '#f5f5f5',
    'editor.foreground': '#333333',
  },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#AAAAAA' },
    },
    {
      scope: ['comment.keyword', 'keyword.codetag', 'keyword.phpdoc'],
      settings: { foreground: '#AAAAAA', fontStyle: 'bold' },
    },
    {
      scope: ['invalid.illegal'],
      settings: { foreground: '#660000' },
    },
    {
      scope: ['keyword.operator'],
      settings: { foreground: '#777777' },
    },
    {
      scope: [
        'keyword',
        'keyword.operator.expression',
        'keyword.control.at-rule.css',
      ],
      settings: { foreground: '#4B83CD' },
    },
    {
      scope: ['punctuation.definition.keyword'],
      settings: { foreground: '#91B3E0' },
    },
    {
      scope: ['keyword.operator.new'],
      settings: { foreground: '#7A3E9D' },
    },
    {
      scope: ['storage', 'storage.type', 'storage.modifier', 'support.type'],
      settings: { foreground: '#7A3E9D' },
    },
    {
      scope: [
        'constant.language',
        'support.constant',
        'variable.language',
        'variable.language.this',
      ],
      settings: { foreground: '#AB6526' },
    },
    {
      scope: ['variable', 'support.variable'],
      settings: { foreground: '#7A3E9D' },
    },
    {
      scope: ['punctuation.definition.variable'],
      settings: { foreground: '#B19BBD' },
    },
    {
      scope: [
        'entity.name.function',
        'entity.name.class',
        'entity.method.name',
        'support.function',
        'meta.function-call',
      ],
      settings: { foreground: '#AA3731' },
    },
    {
      scope: ['entity.name.function', 'entity.name.class', 'entity.method.name'],
      settings: { foreground: '#AA3731', fontStyle: 'bold' },
    },
    {
      scope: ['meta.function-call.arguments'],
      settings: { foreground: '#333333' },
    },
    {
      scope: [
        'entity.name.type',
        'entity.other.inherited-class',
        'support.class',
      ],
      settings: { foreground: '#AA3731', fontStyle: 'bold' },
    },
    {
      scope: ['entity.name.exception'],
      settings: { foreground: '#660000' },
    },
    {
      scope: ['entity.name.section'],
      settings: { fontStyle: 'bold' },
    },
    {
      scope: ['constant.numeric', 'constant.character', 'constant'],
      settings: { foreground: '#AB6526' },
    },
    {
      scope: [
        'string',
        'string.quoted',
        'punctuation.definition.string',
        'string.regexp',
        'storage.type.string',
      ],
      settings: { foreground: '#448C27' },
    },
    {
      scope: ['constant.character.escape'],
      settings: { foreground: '#AB6526' },
    },
    {
      scope: ['string.regex'],
      settings: { foreground: '#333333' },
    },
    {
      scope: [
        'string.regexp keyword',
        'string.regexp keyword.operator',
        'string.regexp constant',
        'string.regexp constant.character',
        'string.regexp punctuation',
      ],
      settings: { foreground: '#7A3E9D' },
    },
    {
      scope: ['constant.other.symbol'],
      settings: { foreground: '#AB6526' },
    },
    {
      scope: ['punctuation', 'punctuation.separator'],
      settings: { foreground: '#777777' },
    },
    {
      scope: [
        'meta.tag.sgml.doctype',
        'meta.tag.preprocessor',
        'meta.tag.preprocessor entity.name.tag',
      ],
      settings: { foreground: '#AAAAAA' },
    },
    {
      scope: [
        'meta.tag',
        'entity.attribute-name',
        'punctuation.definition.tag.html',
        'punctuation.definition.tag.begin.html',
        'punctuation.definition.tag.end.html',
        'entity.other.attribute-name.html',
        'punctuation.separator.key-value.html',
      ],
      settings: { foreground: '#91B3E0' },
    },
    {
      scope: ['entity.name.tag'],
      settings: { foreground: '#4B83CD' },
    },
    {
      scope: ['meta.tag string.quoted', 'meta.tag punctuation.definition.string'],
      settings: { foreground: '#448C27' },
    },
    {
      scope: ['constant.character.entity', 'punctuation.definition.entity'],
      settings: { foreground: '#AB6526' },
    },
    {
      scope: [
        'meta.property-value',
        'source.css keyword.other',
        'source.css constant',
        'source.css constant.numeric',
      ],
      settings: { foreground: '#448C27' },
    },
    {
      scope: [
        'source.css variable',
        'source.css.less variable',
        'source.css.scss variable',
      ],
      settings: { foreground: '#AA3731' },
    },
    {
      scope: ['variable.js', 'source.js variable', 'source.js support.variable'],
      settings: { foreground: '#333333' },
    },
    {
      scope: ['source.python variable.parameter'],
      settings: { foreground: '#333333' },
    },
    {
      scope: ['source.python meta.function-call support.type'],
      settings: { foreground: '#AA3731' },
    },
    {
      scope: [
        'entity.name.function.decorator',
        'meta.function.decorator punctuation.definition',
        'meta.function.decorator string.quoted',
        'meta.function.decorator variable.parameter',
        'meta.function.decorator keyword.operator',
      ],
      settings: { foreground: '#AAAAAA' },
    },
    {
      scope: ['markup.italic'],
      settings: { fontStyle: 'italic' },
    },
    {
      scope: ['markup.error'],
      settings: { foreground: '#660000' },
    },
    {
      scope: ['meta.link', 'meta.image.inline'],
      settings: { foreground: '#4B83CD' },
    },
    {
      scope: ['markup.output', 'markup.raw'],
      settings: { foreground: '#777777' },
    },
    {
      scope: [
        'punctuation.definition.template-expression.begin.ts',
        'punctuation.definition.template-expression.end.ts',
      ],
      settings: { foreground: '#AB6526' },
    },
  ],
}
