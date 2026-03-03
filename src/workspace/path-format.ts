export function abbreviateWorkspacePath(inputPath: string): string {
  const macHomeMatch = inputPath.match(/^\/Users\/[^/]+(\/.*)?$/)
  if (macHomeMatch) {
    return `~${macHomeMatch[1] ?? ''}`
  }

  const windowsHomeMatch = inputPath.match(/^[A-Za-z]:\\Users\\[^\\]+(\\.*)?$/)
  if (windowsHomeMatch) {
    return `~${windowsHomeMatch[1] ?? ''}`
  }

  return inputPath
}

const DEFAULT_SUMMARY_MAX_LENGTH = 28

function detectPathSeparator(inputPath: string): '/' | '\\' {
  return inputPath.includes('\\') && !inputPath.includes('/') ? '\\' : '/'
}

function normalizeRemoteRootPath(remoteRoot: string): string {
  const trimmedRoot = remoteRoot.trim()
  if (trimmedRoot.length === 0) {
    return '/'
  }

  if (trimmedRoot.startsWith('/') || trimmedRoot.startsWith('\\')) {
    return trimmedRoot
  }

  return `/${trimmedRoot}`
}

export function formatWorkspaceSummaryPath(
  inputPath: string,
  maxLength = DEFAULT_SUMMARY_MAX_LENGTH,
): string {
  const abbreviatedPath = abbreviateWorkspacePath(inputPath)
  if (abbreviatedPath.length <= maxLength) {
    return abbreviatedPath
  }

  const separator = detectPathSeparator(abbreviatedPath)
  const segments = abbreviatedPath
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0)

  if (segments.length <= 1) {
    return abbreviatedPath
  }

  const isHomePath = abbreviatedPath.startsWith('~')
  const isAbsolutePath =
    !isHomePath &&
    (abbreviatedPath.startsWith('/') || abbreviatedPath.startsWith('\\'))
  const hasWindowsDrivePrefix = /^[A-Za-z]:[\\/]/.test(abbreviatedPath)

  let leadingPath = ''

  if (isHomePath) {
    const homeSegments = segments[0] === '~' ? segments.slice(1) : segments
    if (homeSegments.length === 0) {
      return abbreviatedPath
    }
    leadingPath = `~${separator}${homeSegments[0]}`
  } else if (hasWindowsDrivePrefix) {
    const drive = segments[0]
    const driveSegments = segments.slice(1)
    if (!drive || driveSegments.length === 0) {
      return abbreviatedPath
    }
    leadingPath = `${drive}${separator}${driveSegments[0]}`
  } else if (isAbsolutePath) {
    leadingPath = `${separator}${segments[0]}`
  } else {
    leadingPath = segments[0]
  }

  const trailingSegment = segments[segments.length - 1]
  if (!trailingSegment) {
    return abbreviatedPath
  }

  const leadingPathWithTrailing = `${separator}${trailingSegment}`
  if (leadingPath.endsWith(leadingPathWithTrailing)) {
    if (isHomePath) {
      return `~${separator}...${separator}${trailingSegment}`
    }
    if (hasWindowsDrivePrefix && segments[0]) {
      return `${segments[0]}${separator}...${separator}${trailingSegment}`
    }
    if (isAbsolutePath) {
      return `${separator}...${separator}${trailingSegment}`
    }
    return abbreviatedPath
  }

  return `${leadingPath}${separator}...${separator}${trailingSegment}`
}

export function formatRemoteWorkspaceSummaryPath(
  remoteRoot: string,
  maxLength = DEFAULT_SUMMARY_MAX_LENGTH,
): string {
  const normalizedRemoteRoot = normalizeRemoteRootPath(remoteRoot)
  return `remote:${formatWorkspaceSummaryPath(normalizedRemoteRoot, maxLength)}`
}

export function formatRemoteWorkspaceTooltip(
  host: string,
  remoteRoot: string,
  user?: string,
): string {
  const normalizedRemoteRoot = normalizeRemoteRootPath(remoteRoot)
  const userPrefix = user?.trim() ? `${user.trim()}@` : ''
  return `${userPrefix}${host}:${normalizedRemoteRoot}`
}
