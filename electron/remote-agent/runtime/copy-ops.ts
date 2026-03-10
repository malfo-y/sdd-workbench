import fs from 'node:fs'
import path from 'node:path'

export type CopyOpsContext = {
  rootPath: string
}

/**
 * Increments a file name to avoid collision with existing names.
 * Self-contained implementation (remote runtime is a separate bundle).
 */
export function incrementFileName(name: string, existingNames: string[]): string {
  if (!existingNames.includes(name)) return name
  const existingSet = new Set(existingNames)
  const dotIndex = name.lastIndexOf('.')
  const hasExtension = dotIndex > 0
  const base = hasExtension ? name.slice(0, dotIndex) : name
  const ext = hasExtension ? name.slice(dotIndex) : ''
  let counter = 1
  for (;;) {
    const candidate = `${base} (${counter})${ext}`
    if (!existingSet.has(candidate)) return candidate
    counter++
  }
}

function resolveAbsolutePath(rootPath: string, relativePath: string): string | null {
  // Normalize using posix to handle forward/back slashes
  const normalized = path.posix.normalize(relativePath.split(path.sep).join('/'))
  if (path.posix.isAbsolute(normalized)) return null
  if (normalized === '..') return null
  if (normalized.startsWith('../')) return null
  return path.join(rootPath, normalized)
}

export function workspaceCopyEntries(
  ctx: CopyOpsContext,
  request: {
    entries: { relativePath: string; kind: 'file' | 'directory' }[]
    destDir: string
  },
): { ok: boolean; copiedPaths?: string[]; error?: string } {
  const { rootPath } = ctx
  const { entries, destDir } = request

  // Resolve destination directory
  const resolvedDestDir = destDir === '' || destDir === '.'
    ? rootPath
    : resolveAbsolutePath(rootPath, destDir)

  if (!resolvedDestDir) {
    return { ok: false, error: 'destDir is outside or denied: path escapes workspace root.' }
  }

  // Ensure destDir is within workspace
  const normalizedRoot = path.resolve(rootPath)
  const normalizedDest = path.resolve(resolvedDestDir)
  if (!normalizedDest.startsWith(normalizedRoot)) {
    return { ok: false, error: 'destDir is outside workspace root (path denied).' }
  }

  const copiedPaths: string[] = []

  for (const entry of entries) {
    // Validate source path
    const resolvedSrc = resolveAbsolutePath(rootPath, entry.relativePath)
    if (!resolvedSrc) {
      return { ok: false, error: `Entry path is outside workspace root (path denied): ${entry.relativePath}` }
    }
    const normalizedSrc = path.resolve(resolvedSrc)
    if (!normalizedSrc.startsWith(normalizedRoot)) {
      return { ok: false, error: `Entry path is outside workspace root (path denied): ${entry.relativePath}` }
    }

    // Check source exists
    if (!fs.existsSync(resolvedSrc)) {
      return { ok: false, error: `Source does not exist: ${entry.relativePath}` }
    }

    // Determine destination name (with collision avoidance)
    const srcName = path.basename(resolvedSrc)
    let existingNames: string[]
    try {
      existingNames = fs.readdirSync(normalizedDest)
    } catch {
      existingNames = []
    }
    const destName = incrementFileName(srcName, existingNames)
    const destPath = path.join(normalizedDest, destName)

    try {
      fs.cpSync(resolvedSrc, destPath, { recursive: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: `Copy failed: ${message}` }
    }

    copiedPaths.push(destPath)
  }

  return { ok: true, copiedPaths }
}
