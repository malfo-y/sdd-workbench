import path from 'node:path'
import { RemoteAgentError } from '../protocol'

export function normalizeToWorkspaceRelativePath(
  absolutePath: string,
  rootPath: string,
): string {
  const relativePath = path.relative(rootPath, absolutePath)
  if (!relativePath || relativePath === '.') {
    return ''
  }
  return relativePath.split(path.sep).join('/')
}

export function isPathInsideWorkspace(
  rootPath: string,
  targetPath: string,
): boolean {
  const normalizedRootPath = path.resolve(rootPath)
  const normalizedTargetPath = path.resolve(targetPath)

  if (normalizedRootPath === normalizedTargetPath) {
    return true
  }

  const relativePath = path.relative(normalizedRootPath, normalizedTargetPath)
  return relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
}

export function resolveWorkspaceRelativePath(
  rootPath: string,
  relativePath: string,
): string {
  const normalizedRelativePath = relativePath.trim()
  if (!normalizedRelativePath) {
    throw new RemoteAgentError('PATH_DENIED', 'relativePath is required.')
  }

  const resolvedRootPath = path.resolve(rootPath)
  const resolvedTargetPath = path.resolve(resolvedRootPath, normalizedRelativePath)
  if (!isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)) {
    throw new RemoteAgentError(
      'PATH_DENIED',
      'Relative path escaped remote workspace root.',
    )
  }

  return resolvedTargetPath
}

export function ensurePathWithinWorkspace(
  rootPath: string,
  targetPath: string,
): void {
  if (isPathInsideWorkspace(rootPath, targetPath)) {
    return
  }

  throw new RemoteAgentError(
    'PATH_DENIED',
    'Requested path is outside the remote workspace root.',
  )
}
