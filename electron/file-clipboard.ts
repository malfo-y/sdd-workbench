import type { IpcMainInvokeEvent } from 'electron'
import { readFilePaths as nativeReadFilePaths } from 'electron-clipboard-ex'
import { cp, readdir } from 'node:fs/promises'
import path from 'node:path'
import type { WorkspaceBackendRouter } from './workspace-backend/backend-router'
import { incrementFileName } from './increment-file-name'

// --- Types ---

type FileClipboardEntry = {
  relativePath: string
  kind: 'file' | 'directory'
}

type FileClipboardState = {
  operation: 'copy'
  paths: FileClipboardEntry[]
  rootPath: string
} | null

type SetFileClipboardRequest = {
  rootPath: string
  paths: FileClipboardEntry[]
}

type SetFileClipboardResult = {
  ok: boolean
  error?: string
}

type ReadFileClipboardResult = {
  ok: boolean
  hasFiles: boolean
  source: 'internal' | 'finder' | 'none'
  error?: string
}

type CopyEntriesRequest = {
  rootPath: string
  entries: FileClipboardEntry[]
  destDir: string
}

type CopyEntriesResult = {
  ok: boolean
  copiedPaths?: string[]
  error?: string
}

type PasteFromClipboardRequest = {
  rootPath: string
  destDir: string
  isRemote?: boolean
}

type PasteFromClipboardResult = {
  ok: boolean
  pastedPaths?: string[]
  source: 'internal' | 'finder' | 'none'
  error?: string
}

// --- Module-level clipboard state ---

let clipboardState: FileClipboardState = null

/** Reset clipboard state (used in tests). */
export function resetClipboardState(): void {
  clipboardState = null
}

/**
 * macOS Finder 클립보드에서 파일 경로 배열을 읽는다.
 * electron-clipboard-ex의 readFilePaths()로 native NSPasteboard에 직접 접근한다.
 * @returns 절대 경로 배열 또는 null (Finder 파일이 없을 때)
 */
export function readFinderClipboardFiles(): string[] | null {
  if (process.platform !== 'darwin') return null

  try {
    const paths = nativeReadFilePaths()
    return paths.length > 0 ? paths : null
  } catch {
    return null
  }
}

/**
 * Finder 클립보드의 절대 경로 파일들을 대상 디렉토리에 복사한다.
 */
async function pasteFinderFiles(
  finderPaths: string[],
  rootPath: string,
  destDir: string,
): Promise<PasteFromClipboardResult> {
  const destAbsolute = destDir ? path.join(rootPath, destDir) : rootPath
  const existingNames = await readdir(destAbsolute).catch(() => [] as string[])
  const pastedPaths: string[] = []
  const usedNames = [...existingNames]

  for (const srcAbsolute of finderPaths) {
    const baseName = path.basename(srcAbsolute)
    const resolvedName = incrementFileName(baseName, usedNames)
    const destPath = path.join(destAbsolute, resolvedName)
    await cp(srcAbsolute, destPath, { recursive: true })
    const relPasted = destDir ? `${destDir}/${resolvedName}` : resolvedName
    pastedPaths.push(relPasted)
    usedNames.push(resolvedName)
  }

  return { ok: true, pastedPaths, source: 'finder' }
}

// --- Handler factory ---

export function createFileClipboardHandlers(backendRouter: WorkspaceBackendRouter) {
  async function handleSetFileClipboard(
    _event: IpcMainInvokeEvent,
    request: SetFileClipboardRequest,
  ): Promise<SetFileClipboardResult> {
    try {
      if (!request?.rootPath) {
        return { ok: false, error: 'rootPath is required.' }
      }
      if (!request.paths || request.paths.length === 0) {
        return { ok: false, error: 'paths must not be empty.' }
      }
      clipboardState = {
        operation: 'copy',
        paths: request.paths,
        rootPath: request.rootPath,
      }
      return { ok: true }
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Failed to set file clipboard.') }
    }
  }

  async function handleReadFileClipboard(): Promise<ReadFileClipboardResult> {
    try {
      if (clipboardState !== null) {
        return { ok: true, hasFiles: true, source: 'internal' }
      }
      const finderFiles = readFinderClipboardFiles()
      if (finderFiles && finderFiles.length > 0) {
        return { ok: true, hasFiles: true, source: 'finder' }
      }
      return { ok: true, hasFiles: false, source: 'none' }
    } catch (error) {
      return {
        ok: false,
        hasFiles: false,
        source: 'none',
        error: toErrorMessage(error, 'Failed to read file clipboard.'),
      }
    }
  }

  async function handleCopyEntries(
    _event: IpcMainInvokeEvent,
    request: CopyEntriesRequest,
  ): Promise<CopyEntriesResult> {
    try {
      if (!request?.rootPath) {
        return { ok: false, error: 'rootPath is required.' }
      }
      const backend = backendRouter.resolveByRootPath(request.rootPath)
      const result = await backend.copyEntries({
        rootPath: request.rootPath,
        entries: request.entries,
        destDir: request.destDir,
      })
      return result as CopyEntriesResult
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Failed to copy entries.') }
    }
  }

  async function handlePasteFromClipboard(
    _event: IpcMainInvokeEvent,
    request: PasteFromClipboardRequest,
  ): Promise<PasteFromClipboardResult> {
    try {
      if (!request?.rootPath) {
        return { ok: false, source: 'none', error: 'rootPath is required.' }
      }

      // Phase 2: Finder clipboard (local workspace only)
      if (!request.isRemote) {
        const finderFiles = readFinderClipboardFiles()
        if (finderFiles && finderFiles.length > 0) {
          return await pasteFinderFiles(finderFiles, request.rootPath, request.destDir)
        }
      } else {
        // Remote workspace: check if Finder has files and warn
        const finderFiles = readFinderClipboardFiles()
        if (finderFiles && finderFiles.length > 0 && clipboardState === null) {
          return {
            ok: false,
            source: 'finder',
            error: 'Finder 파일 붙여넣기는 로컬 워크스페이스에서만 지원됩니다.',
          }
        }
      }

      // Internal clipboard
      if (clipboardState === null) {
        return { ok: true, source: 'none' }
      }
      const backend = backendRouter.resolveByRootPath(request.rootPath)
      const result = await backend.copyEntries({
        rootPath: clipboardState.rootPath,
        entries: clipboardState.paths,
        destDir: request.destDir,
      })
      const copyResult = result as CopyEntriesResult
      if (!copyResult.ok) {
        return {
          ok: false,
          source: 'internal',
          error: copyResult.error ?? 'Failed to paste.',
        }
      }
      return {
        ok: true,
        pastedPaths: copyResult.copiedPaths,
        source: 'internal',
      }
    } catch (error) {
      return {
        ok: false,
        source: 'internal',
        error: toErrorMessage(error, 'Failed to paste from clipboard.'),
      }
    }
  }

  return {
    handleSetFileClipboard,
    handleReadFileClipboard,
    handleCopyEntries,
    handlePasteFromClipboard,
  }
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}
