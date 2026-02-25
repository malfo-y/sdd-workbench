export type GitFileStatusKind = 'added' | 'modified' | 'untracked'

export type GitFileStatusMap = Record<string, GitFileStatusKind>

/**
 * Parses `git status --porcelain` output into a map of relative paths to status kinds.
 *
 * Porcelain format (v1):
 *   XY <path>
 *   XY <orig-path> -> <new-path>  (for renames/copies)
 *
 * X = index status, Y = work-tree status
 * We map:
 *   '??' → untracked
 *   'A' (index) → added
 *   'M' or ' M' → modified
 *   'R' → renamed: new path is added
 *   'D' → deleted (excluded from map — deleted files are not shown in tree)
 */
export function parseGitStatusPorcelain(stdout: string): GitFileStatusMap {
  const result: GitFileStatusMap = {}

  if (!stdout.trim()) {
    return result
  }

  const lines = stdout.split('\n')

  for (const line of lines) {
    if (line.length < 4) {
      continue
    }

    const indexStatus = line[0]
    const workTreeStatus = line[1]
    const pathPart = line.slice(3)

    if (!pathPart) {
      continue
    }

    // Deleted files: skip (they don't appear in file tree)
    if (indexStatus === 'D' || workTreeStatus === 'D') {
      continue
    }

    // Untracked
    if (indexStatus === '?' && workTreeStatus === '?') {
      result[pathPart] = 'untracked'
      continue
    }

    // Renamed or Copied: extract new path from "old -> new" format
    if (indexStatus === 'R' || indexStatus === 'C') {
      const arrowIndex = pathPart.indexOf(' -> ')
      if (arrowIndex >= 0) {
        const newPath = pathPart.slice(arrowIndex + 4)
        if (newPath) {
          result[newPath] = 'added'
        }
      } else {
        result[pathPart] = 'added'
      }
      continue
    }

    // Added (staged new file)
    if (indexStatus === 'A') {
      result[pathPart] = 'added'
      continue
    }

    // Modified (in index and/or work tree)
    if (indexStatus === 'M' || workTreeStatus === 'M') {
      result[pathPart] = 'modified'
      continue
    }

    // Type change
    if (indexStatus === 'T' || workTreeStatus === 'T') {
      result[pathPart] = 'modified'
      continue
    }
  }

  return result
}
