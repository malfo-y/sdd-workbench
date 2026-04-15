import { randomUUID } from 'node:crypto'
import { rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

type AtomicWriteDependencies = {
  createTemporaryPath?: (targetPath: string) => string
  writeFile?: (
    filePath: string,
    content: string,
    encoding: BufferEncoding,
  ) => Promise<void>
  rename?: (sourcePath: string, targetPath: string) => Promise<void>
  rm?: (
    targetPath: string,
    options: {
      force?: boolean
    },
  ) => Promise<void>
  onCleanupError?: (temporaryPath: string, error: unknown) => void
}

export function buildAtomicWriteTemporaryPath(
  targetPath: string,
  token: string = randomUUID(),
): string {
  const targetDirectory = path.dirname(targetPath)
  const targetName = path.basename(targetPath)
  return path.join(targetDirectory, `.${targetName}.${process.pid}.${token}.tmp`)
}

export async function writeFileAtomic(
  targetPath: string,
  content: string,
  dependencies: AtomicWriteDependencies = {},
): Promise<void> {
  const temporaryPath =
    dependencies.createTemporaryPath?.(targetPath) ??
    buildAtomicWriteTemporaryPath(targetPath)
  const writeFileImpl = dependencies.writeFile ?? writeFile
  const renameImpl = dependencies.rename ?? rename
  const rmImpl = dependencies.rm ?? rm
  let temporaryFileWritten = false

  try {
    await writeFileImpl(temporaryPath, content, 'utf8')
    temporaryFileWritten = true
    await renameImpl(temporaryPath, targetPath)
    temporaryFileWritten = false
  } catch (error) {
    if (temporaryFileWritten) {
      try {
        await rmImpl(temporaryPath, { force: true })
      } catch (cleanupError) {
        const cleanupCode =
          cleanupError &&
          typeof cleanupError === 'object' &&
          'code' in cleanupError
            ? String(cleanupError.code)
            : ''
        if (cleanupCode !== 'ENOENT') {
          const onCleanupError =
            dependencies.onCleanupError ?? defaultAtomicWriteCleanupErrorLogger
          onCleanupError(temporaryPath, cleanupError)
        }
      }
    }
    throw error
  }
}

function defaultAtomicWriteCleanupErrorLogger(
  temporaryPath: string,
  error: unknown,
): void {
  console.warn(`Failed to clean up temporary file "${temporaryPath}".`, error)
}
