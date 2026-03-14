import {
  normalizePosixPath,
  parseCitationHref,
  type CitationTarget,
} from './citation-target'

export type SpecLinkLineRange = {
  startLine: number
  endLine: number
}

export type SpecLinkResolution =
  | {
      kind: 'anchor'
      href: string
    }
  | {
      kind: 'workspace-file'
      href: string
      targetRelativePath: string
      lineRange: SpecLinkLineRange | null
    }
  | {
      kind: 'workspace-symbol'
      href: string
      target: CitationTarget
    }
  | {
      kind: 'external'
      href: string
    }
  | {
      kind: 'unresolved'
      href: string
      reason: 'empty' | 'invalid_path' | 'missing_active_spec' | 'unsupported'
    }

const EXTERNAL_LINK_PATTERN = /^[a-z][a-z\d+.-]*:/i
const LINE_RANGE_HASH_PATTERN = /^L(\d+)(?:-L?(\d+))?$/i

function dirnamePosix(input: string): string {
  const normalized = normalizePosixPath(input)
  if (normalized === '.' || normalized === '/') {
    return '.'
  }

  const lastSlashIndex = normalized.lastIndexOf('/')
  if (lastSlashIndex < 0) {
    return '.'
  }

  return normalized.slice(0, lastSlashIndex) || '.'
}

function parseLineRangeFromHash(hashFragment: string): SpecLinkLineRange | null {
  if (!hashFragment) {
    return null
  }

  const match = LINE_RANGE_HASH_PATTERN.exec(hashFragment)
  if (!match) {
    return null
  }

  const parsedStartLine = Number.parseInt(match[1], 10)
  const parsedEndLine = match[2]
    ? Number.parseInt(match[2], 10)
    : parsedStartLine

  if (!Number.isFinite(parsedStartLine) || !Number.isFinite(parsedEndLine)) {
    return null
  }

  if (parsedStartLine < 1 || parsedEndLine < 1) {
    return null
  }

  return parsedStartLine <= parsedEndLine
    ? { startLine: parsedStartLine, endLine: parsedEndLine }
    : { startLine: parsedEndLine, endLine: parsedStartLine }
}

export function resolveSpecLink(
  href: string | null | undefined,
  activeSpecPath: string | null,
): SpecLinkResolution {
  const normalizedHref = href?.trim() ?? ''
  if (!normalizedHref) {
    return {
      kind: 'unresolved',
      href: '',
      reason: 'empty',
    }
  }

  const citationTarget = parseCitationHref(normalizedHref)
  if (citationTarget) {
    return {
      kind: 'workspace-symbol',
      href: normalizedHref,
      target: citationTarget,
    }
  }

  if (normalizedHref.startsWith('#')) {
    return {
      kind: 'anchor',
      href: normalizedHref,
    }
  }

  if (
    EXTERNAL_LINK_PATTERN.test(normalizedHref) ||
    normalizedHref.startsWith('//')
  ) {
    return {
      kind: 'external',
      href: normalizedHref,
    }
  }

  if (!activeSpecPath) {
    return {
      kind: 'unresolved',
      href: normalizedHref,
      reason: 'missing_active_spec',
    }
  }

  const hashIndex = normalizedHref.indexOf('#')
  const hashFragment =
    hashIndex >= 0 ? normalizedHref.slice(hashIndex + 1) : ''

  const [pathWithoutHash] = normalizedHref.split('#')
  const [pathWithoutQuery] = pathWithoutHash.split('?')
  if (!pathWithoutQuery) {
    return {
      kind: 'unresolved',
      href: normalizedHref,
      reason: 'invalid_path',
    }
  }

  if (pathWithoutQuery.startsWith('/')) {
    return {
      kind: 'unresolved',
      href: normalizedHref,
      reason: 'unsupported',
    }
  }

  const currentDirectory = dirnamePosix(activeSpecPath)
  const resolvedPath = normalizePosixPath(
    currentDirectory === '.'
      ? pathWithoutQuery
      : `${currentDirectory}/${pathWithoutQuery}`,
  )

  if (
    !resolvedPath ||
    resolvedPath === '.' ||
    resolvedPath === '..' ||
    resolvedPath.startsWith('../') ||
    resolvedPath.startsWith('/')
  ) {
    return {
      kind: 'unresolved',
      href: normalizedHref,
      reason: 'invalid_path',
    }
  }

  return {
    kind: 'workspace-file',
    href: normalizedHref,
    targetRelativePath: resolvedPath,
    lineRange: parseLineRangeFromHash(hashFragment),
  }
}
