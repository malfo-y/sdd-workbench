import type { BundledLanguage } from 'shiki'

export type HighlightLanguage = BundledLanguage | 'plaintext'

type CodeLanguageInfo = {
  displayLanguage: string
  highlightLanguage: HighlightLanguage
}

const PLAINTEXT_LANGUAGE_INFO: CodeLanguageInfo = {
  displayLanguage: 'plaintext',
  highlightLanguage: 'plaintext',
}

const EXTENSION_LANGUAGE_MAP: Record<string, CodeLanguageInfo> = {
  ts: { displayLanguage: 'typescript', highlightLanguage: 'typescript' },
  tsx: { displayLanguage: 'tsx', highlightLanguage: 'tsx' },
  js: { displayLanguage: 'javascript', highlightLanguage: 'javascript' },
  jsx: { displayLanguage: 'jsx', highlightLanguage: 'jsx' },
  json: { displayLanguage: 'json', highlightLanguage: 'json' },
  css: { displayLanguage: 'css', highlightLanguage: 'css' },
  md: { displayLanguage: 'markdown', highlightLanguage: 'markdown' },
  py: { displayLanguage: 'python', highlightLanguage: 'python' },
  html: { displayLanguage: 'html', highlightLanguage: 'html' },
  htm: { displayLanguage: 'html', highlightLanguage: 'html' },
  xml: { displayLanguage: 'xml', highlightLanguage: 'xml' },
  svg: { displayLanguage: 'xml', highlightLanguage: 'xml' },
  yaml: { displayLanguage: 'yaml', highlightLanguage: 'yaml' },
  yml: { displayLanguage: 'yaml', highlightLanguage: 'yaml' },
  toml: { displayLanguage: 'toml', highlightLanguage: 'toml' },
  sh: { displayLanguage: 'shellscript', highlightLanguage: 'shellscript' },
  bash: { displayLanguage: 'shellscript', highlightLanguage: 'shellscript' },
  zsh: { displayLanguage: 'shellscript', highlightLanguage: 'shellscript' },
  rs: { displayLanguage: 'rust', highlightLanguage: 'rust' },
  go: { displayLanguage: 'go', highlightLanguage: 'go' },
  java: { displayLanguage: 'java', highlightLanguage: 'java' },
  c: { displayLanguage: 'c', highlightLanguage: 'c' },
  h: { displayLanguage: 'c', highlightLanguage: 'c' },
  cpp: { displayLanguage: 'cpp', highlightLanguage: 'cpp' },
  hpp: { displayLanguage: 'cpp', highlightLanguage: 'cpp' },
  swift: { displayLanguage: 'swift', highlightLanguage: 'swift' },
  rb: { displayLanguage: 'ruby', highlightLanguage: 'ruby' },
  sql: { displayLanguage: 'sql', highlightLanguage: 'sql' },
  scss: { displayLanguage: 'scss', highlightLanguage: 'scss' },
  less: { displayLanguage: 'less', highlightLanguage: 'less' },
  graphql: { displayLanguage: 'graphql', highlightLanguage: 'graphql' },
  gql: { displayLanguage: 'graphql', highlightLanguage: 'graphql' },
  vue: { displayLanguage: 'vue', highlightLanguage: 'vue' },
  svelte: { displayLanguage: 'svelte', highlightLanguage: 'svelte' },
  php: { displayLanguage: 'php', highlightLanguage: 'php' },
  r: { displayLanguage: 'r', highlightLanguage: 'r' },
  lua: { displayLanguage: 'lua', highlightLanguage: 'lua' },
  dart: { displayLanguage: 'dart', highlightLanguage: 'dart' },
  kt: { displayLanguage: 'kotlin', highlightLanguage: 'kotlin' },
  scala: { displayLanguage: 'scala', highlightLanguage: 'scala' },
  zig: { displayLanguage: 'zig', highlightLanguage: 'zig' },
}

const FILE_NAME_LANGUAGE_MAP: Record<string, CodeLanguageInfo> = {
  dockerfile: {
    displayLanguage: 'dockerfile',
    highlightLanguage: 'dockerfile',
  },
  makefile: {
    displayLanguage: 'makefile',
    highlightLanguage: 'makefile',
  },
}

export function getHighlightLanguage(filePath: string | null): HighlightLanguage {
  return getCodeLanguageInfo(filePath).highlightLanguage
}

export function getDisplayLanguage(filePath: string | null): string {
  return getCodeLanguageInfo(filePath).displayLanguage
}

export function getCodeLanguageInfo(filePath: string | null): CodeLanguageInfo {
  if (!filePath) {
    return PLAINTEXT_LANGUAGE_INFO
  }

  const fileName = filePath.split('/').at(-1)?.toLowerCase() ?? ''
  const exactMatch = FILE_NAME_LANGUAGE_MAP[fileName]
  if (exactMatch) {
    return exactMatch
  }

  const extension = filePath.split('.').at(-1)?.toLowerCase() ?? ''
  if (!extension || extension === filePath.toLowerCase()) {
    return PLAINTEXT_LANGUAGE_INFO
  }

  return EXTENSION_LANGUAGE_MAP[extension] ?? PLAINTEXT_LANGUAGE_INFO
}
