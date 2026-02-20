export type HighlightLanguage =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'jsx'
  | 'json'
  | 'css'
  | 'markdown'
  | 'python'
  | 'plaintext'

const EXTENSION_LANGUAGE_MAP: Record<string, HighlightLanguage> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  md: 'markdown',
  py: 'python',
}

export function getHighlightLanguage(filePath: string | null): HighlightLanguage {
  if (!filePath) {
    return 'plaintext'
  }

  const extension = filePath.split('.').at(-1)?.toLowerCase() ?? ''
  if (!extension || extension === filePath.toLowerCase()) {
    return 'plaintext'
  }

  return EXTENSION_LANGUAGE_MAP[extension] ?? 'plaintext'
}
