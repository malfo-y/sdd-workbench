type SpecLinkResolution =
  | {
      kind: 'anchor'
      href: string
    }
  | {
      kind: 'workspace-file'
      href: string
      targetRelativePath: string
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

function normalizePosixPath(input: string): string {
  const isAbsolute = input.startsWith('/')
  const segments = input.split('/')
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
  }
}
