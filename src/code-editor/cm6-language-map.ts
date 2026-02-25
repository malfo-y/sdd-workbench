import type { LanguageSupport } from '@codemirror/language'

/**
 * Maps a file path to a CM6 LanguageSupport instance via lazy (dynamic) import.
 *
 * Supported languages (13):
 *   TypeScript, JavaScript, Python, HTML, CSS, JSON, Markdown,
 *   Rust, C/C++, Java, SQL, XML, YAML
 *
 * @param filePath - Absolute or relative file path, or null.
 * @returns A Promise resolving to a LanguageSupport instance, or null when the
 *          file type has no CM6 language package support.
 */
export async function getCM6Language(filePath: string | null): Promise<LanguageSupport | null> {
  if (filePath === null) {
    return null
  }

  const extension = filePath.split('.').at(-1)?.toLowerCase() ?? ''

  // If there is no extension (e.g. "LICENSE", "Makefile", "Dockerfile"),
  // or the "extension" equals the full filename (no dot present), return null.
  const hasExtension = extension.length > 0 && filePath.includes('.')
  if (!hasExtension) {
    return null
  }

  switch (extension) {
    case 'ts': {
      const { javascript } = await import('@codemirror/lang-javascript')
      return javascript({ typescript: true })
    }
    case 'tsx': {
      const { javascript } = await import('@codemirror/lang-javascript')
      return javascript({ typescript: true, jsx: true })
    }
    case 'js': {
      const { javascript } = await import('@codemirror/lang-javascript')
      return javascript()
    }
    case 'jsx': {
      const { javascript } = await import('@codemirror/lang-javascript')
      return javascript({ jsx: true })
    }
    case 'py': {
      const { python } = await import('@codemirror/lang-python')
      return python()
    }
    case 'html':
    case 'htm': {
      const { html } = await import('@codemirror/lang-html')
      return html()
    }
    case 'css': {
      const { css } = await import('@codemirror/lang-css')
      return css()
    }
    case 'md': {
      const { markdown } = await import('@codemirror/lang-markdown')
      return markdown()
    }
    case 'json': {
      const { json } = await import('@codemirror/lang-json')
      return json()
    }
    case 'rs': {
      const { rust } = await import('@codemirror/lang-rust')
      return rust()
    }
    case 'c':
    case 'h':
    case 'cpp':
    case 'hpp': {
      const { cpp } = await import('@codemirror/lang-cpp')
      return cpp()
    }
    case 'java': {
      const { java } = await import('@codemirror/lang-java')
      return java()
    }
    case 'sql': {
      const { sql } = await import('@codemirror/lang-sql')
      return sql()
    }
    case 'xml':
    case 'svg': {
      const { xml } = await import('@codemirror/lang-xml')
      return xml()
    }
    case 'yaml':
    case 'yml': {
      const { yaml } = await import('@codemirror/lang-yaml')
      return yaml()
    }
    default:
      return null
  }
}
