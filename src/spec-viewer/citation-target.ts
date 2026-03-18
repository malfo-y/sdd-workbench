/**
 * Parsed citation target pointing to a Python symbol in a workspace file.
 * Format: `[relative/path.py:SymbolName]` or
 * `[relative/path.py:ClassName.methodName]` or file-only `[relative/path.py]`.
 */
export type CitationTarget = {
  targetRelativePath: string
  symbolName: string | null
}

export type CitationNavigationResult =
  | {
      ok: true
    }
  | {
      ok: false
      failureReason?: string
    }

export const CITATION_LINK_PREFIX = '#sdd-citation:'

const IDENTIFIER_PATTERN = '[A-Za-z_][A-Za-z0-9_]*'
const SIMPLE_SYMBOL_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const QUALIFIED_METHOD_PATTERN = new RegExp(
  `^${IDENTIFIER_PATTERN}\\.${IDENTIFIER_PATTERN}$`,
)
const INVISIBLE_CITATION_WHITESPACE_PATTERN = /[\u200B-\u200D\uFEFF]/g

function normalizeCitationWhitespace(input: string): string {
  return input.replace(INVISIBLE_CITATION_WHITESPACE_PATTERN, '')
}

/**
 * Normalizes a POSIX-style path by resolving `.` and `..` segments and
 * converting Windows backslashes to forward slashes.
 */
export function normalizePosixPath(input: string): string {
  const normalizedInput = input.replace(/\\/g, '/')
  const isAbsolute = normalizedInput.startsWith('/')
  const segments = normalizedInput.split('/')
  const normalized: string[] = []

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue
    }

    if (segment === '..') {
      if (
        normalized.length === 0 ||
        normalized[normalized.length - 1] === '..'
      ) {
        if (!isAbsolute) {
          normalized.push('..')
        }
        continue
      }

      normalized.pop()
      continue
    }

    normalized.push(segment)
  }

  if (isAbsolute) {
    return `/${normalized.join('/')}`
  }

  return normalized.join('/') || '.'
}

function normalizeWorkspaceRelativePath(rawPath: string): string | null {
  const normalizedPath = normalizePosixPath(
    normalizeCitationWhitespace(rawPath).trim(),
  )
  if (
    !normalizedPath ||
    normalizedPath === '.' ||
    normalizedPath === '..' ||
    normalizedPath.startsWith('../') ||
    normalizedPath.startsWith('/')
  ) {
    return null
  }

  return normalizedPath
}

function normalizeSymbolName(rawSymbolName: string): string | null {
  const normalizedSymbolName = normalizeCitationWhitespace(rawSymbolName).trim()
  if (
    !SIMPLE_SYMBOL_PATTERN.test(normalizedSymbolName) &&
    !QUALIFIED_METHOD_PATTERN.test(normalizedSymbolName)
  ) {
    return null
  }

  return normalizedSymbolName
}

function isFileOnlyCitationPath(targetRelativePath: string): boolean {
  return targetRelativePath.endsWith('.py')
}

function parseCitationParts(rawValue: string): CitationTarget | null {
  const trimmed = normalizeCitationWhitespace(rawValue).trim()
  if (!trimmed) {
    return null
  }

  const separatorIndex = trimmed.lastIndexOf(':')
  if (separatorIndex < 0) {
    const targetRelativePath = normalizeWorkspaceRelativePath(trimmed)
    if (!targetRelativePath || !isFileOnlyCitationPath(targetRelativePath)) {
      return null
    }

    return {
      targetRelativePath,
      symbolName: null,
    }
  }

  if (separatorIndex === 0 || separatorIndex >= trimmed.length - 1) {
    return null
  }

  const targetRelativePath = normalizeWorkspaceRelativePath(
    trimmed.slice(0, separatorIndex),
  )
  const symbolName = normalizeSymbolName(trimmed.slice(separatorIndex + 1))
  if (!targetRelativePath || !symbolName) {
    return null
  }

  return {
    targetRelativePath,
    symbolName,
  }
}

/**
 * Parses a bracket-wrapped citation string like `[src/app.py:run]` into a
 * `CitationTarget`. Returns `null` for invalid format, unsupported deep dotted
 * symbols, absolute paths, or parent-directory escapes.
 */
export function parseBracketCitationText(rawValue: string): CitationTarget | null {
  const trimmed = normalizeCitationWhitespace(rawValue).trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null
  }

  return parseCitationParts(trimmed.slice(1, -1))
}

/** Serializes a `CitationTarget` into a URL-safe href string for use in rendered markdown links. */
export function buildCitationHref(target: CitationTarget): string {
  if (target.symbolName === null) {
    return `${CITATION_LINK_PREFIX}${encodeURIComponent(target.targetRelativePath)}`
  }

  return `${CITATION_LINK_PREFIX}${encodeURIComponent(target.targetRelativePath)}:${encodeURIComponent(target.symbolName)}`
}

/** Parses a citation href produced by `buildCitationHref` back into a `CitationTarget`. */
export function parseCitationHref(href: string): CitationTarget | null {
  if (!href.startsWith(CITATION_LINK_PREFIX)) {
    return null
  }

  const payload = href.slice(CITATION_LINK_PREFIX.length)
  const separatorIndex = payload.lastIndexOf(':')
  if (separatorIndex < 0) {
    try {
      return parseCitationParts(decodeURIComponent(payload))
    } catch {
      return null
    }
  }

  if (separatorIndex === 0 || separatorIndex >= payload.length - 1) {
    return null
  }

  try {
    const targetRelativePath = decodeURIComponent(payload.slice(0, separatorIndex))
    const symbolName = decodeURIComponent(payload.slice(separatorIndex + 1))
    return parseCitationParts(`${targetRelativePath}:${symbolName}`)
  } catch {
    return null
  }
}
