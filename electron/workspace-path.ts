import path from 'node:path'

export function isPathInsideWorkspace(rootPath: string, targetPath: string) {
  const relativePath = path.relative(rootPath, targetPath)
  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  )
}

export function isPathInsideWorkspaceOrRoot(
  rootPath: string,
  targetPath: string,
) {
  const relativePath = path.relative(rootPath, targetPath)
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
}
