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
