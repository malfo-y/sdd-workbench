import fs from 'node:fs/promises'
import path from 'node:path'
import { incrementFileName } from '../increment-file-name'
import type { WorkspaceCopyEntriesRequest } from './types'

export async function copyEntries(request: WorkspaceCopyEntriesRequest): Promise<void> {
  const { rootPath, entries, destDir } = request
  const destAbsDir = destDir ? path.join(rootPath, destDir) : rootPath

  // Get existing names in destination directory once (before copying)
  let existingNames: string[]
  try {
    existingNames = await fs.readdir(destAbsDir)
  } catch {
    existingNames = []
  }

  for (const entry of entries) {
    const srcAbs = path.join(rootPath, entry.relativePath)
    const baseName = path.basename(entry.relativePath)

    // Resolve name conflict
    const resolvedName = incrementFileName(baseName, existingNames)
    const destAbs = path.join(destAbsDir, resolvedName)

    // Copy (throws if source does not exist)
    await fs.cp(srcAbs, destAbs, { recursive: true })

    // Track the new name so subsequent entries in same batch see it
    existingNames.push(resolvedName)
  }
}
