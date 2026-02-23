import type { BundledLanguage } from 'shiki'

export type HighlightLanguage = BundledLanguage | 'plaintext'

const EXTENSION_LANGUAGE_MAP: Record<string, HighlightLanguage> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  md: 'markdown',
  py: 'python',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  svg: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  swift: 'swift',
  rb: 'ruby',
  sql: 'sql',
  scss: 'scss',
  less: 'less',
  graphql: 'graphql',
  gql: 'graphql',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  vue: 'vue',
  svelte: 'svelte',
  php: 'php',
  r: 'r',
  lua: 'lua',
  dart: 'dart',
  kt: 'kotlin',
  scala: 'scala',
  zig: 'zig',
}

export function getHighlightLanguage(filePath: string | null): HighlightLanguage {
  if (!filePath) {
    return 'plaintext'
  }

  const fileName = filePath.split('/').at(-1)?.toLowerCase() ?? ''

  if (fileName === 'dockerfile') {
    return 'dockerfile'
  }

  if (fileName === 'makefile') {
    return 'makefile'
  }

  const extension = filePath.split('.').at(-1)?.toLowerCase() ?? ''
  if (!extension || extension === filePath.toLowerCase()) {
    return 'plaintext'
  }

  return EXTENSION_LANGUAGE_MAP[extension] ?? 'plaintext'
}
