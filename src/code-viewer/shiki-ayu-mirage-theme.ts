/**
 * Ayu Mirage Shiki theme — used for spec viewer code blocks.
 * Based on https://github.com/ayu-theme/vscode-ayu (Mirage variant)
 */
export const ayuMirageTheme = {
  name: 'ayu-mirage',
  type: 'dark' as const,
  settings: [] as [],
  colors: {
    'editor.background': '#1f2430',
    'editor.foreground': '#cccac2',
  },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#697987', fontStyle: 'italic' },
    },
    {
      scope: ['comment.keyword', 'keyword.codetag', 'keyword.phpdoc'],
      settings: { foreground: '#697987', fontStyle: 'bold italic' },
    },
    {
      scope: ['invalid.illegal'],
      settings: { foreground: '#FF3333' },
    },
    {
      scope: ['keyword.operator'],
      settings: { foreground: '#F29E74' },
    },
    {
      scope: [
        'keyword',
        'keyword.operator.expression',
        'keyword.control',
        'keyword.control.at-rule.css',
      ],
      settings: { foreground: '#FFA759' },
    },
    {
      scope: ['storage', 'storage.type', 'storage.modifier', 'support.type'],
      settings: { foreground: '#FFA759' },
    },
    {
      scope: ['constant.language', 'support.constant'],
      settings: { foreground: '#DFBFFF' },
    },
    {
      scope: ['variable.language', 'variable.language.this'],
      settings: { foreground: '#5CCFE6', fontStyle: 'italic' },
    },
    {
      scope: ['variable', 'support.variable'],
      settings: { foreground: '#CCCAC2' },
    },
    {
      scope: ['variable.parameter'],
      settings: { foreground: '#DFBFFF' },
    },
    {
      scope: ['support.function'],
      settings: { foreground: '#F28779' },
    },
    {
      scope: ['entity.name.function', 'entity.method.name', 'meta.function-call'],
      settings: { foreground: '#FFD580', fontStyle: 'bold' },
    },
    {
      scope: ['meta.function-call.arguments'],
      settings: { foreground: '#CCCAC2' },
    },
    {
      scope: [
        'entity.name.type',
        'entity.other.inherited-class',
        'support.class',
        'entity.name.class',
      ],
      settings: { foreground: '#73D0FF', fontStyle: 'bold' },
    },
    {
      scope: ['entity.name.exception'],
      settings: { foreground: '#FF3333' },
    },
    {
      scope: ['entity.name.section'],
      settings: { fontStyle: 'bold' },
    },
    {
      scope: ['constant.numeric', 'constant.character', 'constant'],
      settings: { foreground: '#DFBFFF' },
    },
    {
      scope: [
        'string',
        'string.quoted',
        'punctuation.definition.string',
        'storage.type.string',
      ],
      settings: { foreground: '#D5FF80' },
    },
    {
      scope: ['string.regexp'],
      settings: { foreground: '#95E6CB' },
    },
    {
      scope: ['constant.character.escape'],
      settings: { foreground: '#DFBFFF' },
    },
    {
      scope: [
        'string.regexp keyword',
        'string.regexp keyword.operator',
        'string.regexp constant',
        'string.regexp constant.character',
        'string.regexp punctuation',
      ],
      settings: { foreground: '#95E6CB' },
    },
    {
      scope: ['constant.other.symbol'],
      settings: { foreground: '#DFBFFF' },
    },
    {
      scope: ['punctuation', 'punctuation.separator'],
      settings: { foreground: '#B0AEA6' },
    },
    {
      scope: ['punctuation.definition.keyword'],
      settings: { foreground: '#FFA759' },
    },
    {
      scope: [
        'meta.tag.sgml.doctype',
        'meta.tag.preprocessor',
        'meta.tag.preprocessor entity.name.tag',
      ],
      settings: { foreground: '#707A8C' },
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
      settings: { foreground: '#FFD580' },
    },
    {
      scope: ['entity.name.tag'],
      settings: { foreground: '#5CCFE6' },
    },
    {
      scope: ['meta.tag string.quoted', 'meta.tag punctuation.definition.string'],
      settings: { foreground: '#D5FF80' },
    },
    {
      scope: ['constant.character.entity', 'punctuation.definition.entity'],
      settings: { foreground: '#DFBFFF' },
    },
    {
      scope: [
        'meta.property-value',
        'source.css keyword.other',
        'source.css constant',
        'source.css constant.numeric',
      ],
      settings: { foreground: '#D5FF80' },
    },
    {
      scope: [
        'source.css variable',
        'source.css.less variable',
        'source.css.scss variable',
      ],
      settings: { foreground: '#F28779' },
    },
    {
      scope: ['variable.js', 'source.js variable', 'source.js support.variable'],
      settings: { foreground: '#CCCAC2' },
    },
    {
      scope: ['source.python variable.parameter'],
      settings: { foreground: '#DFBFFF' },
    },
    {
      scope: ['source.python meta.function-call support.type'],
      settings: { foreground: '#FFD580' },
    },
    {
      scope: [
        'entity.name.function.decorator',
        'meta.function.decorator punctuation.definition',
        'meta.function.decorator string.quoted',
        'meta.function.decorator variable.parameter',
        'meta.function.decorator keyword.operator',
      ],
      settings: { foreground: '#707A8C' },
    },
    {
      scope: ['variable.other.readwrite', 'variable.other.object'],
      settings: { foreground: '#CCCAC2' },
    },
    {
      scope: ['variable.other.property', 'variable.other.object.property'],
      settings: { foreground: '#F28779' },
    },
    {
      scope: ['markup.italic'],
      settings: { fontStyle: 'italic' },
    },
    {
      scope: ['markup.error'],
      settings: { foreground: '#FF3333' },
    },
    {
      scope: ['meta.link', 'meta.image.inline'],
      settings: { foreground: '#73D0FF' },
    },
    {
      scope: ['markup.output', 'markup.raw'],
      settings: { foreground: '#707A8C' },
    },
    {
      scope: [
        'punctuation.definition.template-expression.begin.ts',
        'punctuation.definition.template-expression.end.ts',
      ],
      settings: { foreground: '#FFA759' },
    },
  ],
}
