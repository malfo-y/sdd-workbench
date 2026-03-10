import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'
import { mkdtemp, writeFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createFileClipboardHandlers, readFinderClipboardFiles, resetClipboardState } from './file-clipboard'
import type { WorkspaceBackendRouter } from './workspace-backend/backend-router'

// vi.hoisted ensures mocks are available when vi.mock factories run (hoisted)
const { mockAvailableFormats, mockReadBuffer } = vi.hoisted(() => ({
  mockAvailableFormats: vi.fn<() => string[]>().mockReturnValue([]),
  mockReadBuffer: vi.fn<(format: string) => Buffer>().mockReturnValue(Buffer.alloc(0)),
}))

vi.mock('electron', () => ({
  clipboard: {
    availableFormats: (...args: unknown[]) => mockAvailableFormats(...args as []),
    readBuffer: (...args: unknown[]) => mockReadBuffer(...args as [string]),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const bplistCreator = require('bplist-creator')

/** Create a real bplist buffer mimicking Finder's NSFilenamesPboardType */
function makeFinderplistBuffer(paths: string[]): Buffer {
  return bplistCreator([paths]) as Buffer
}

const mockEvent = {} as IpcMainInvokeEvent

function makeMockRouter(copyEntriesFn = vi.fn().mockResolvedValue({ ok: true, copiedPaths: [] })) {
  return {
    resolveByRootPath: vi.fn().mockReturnValue({
      copyEntries: copyEntriesFn,
    }),
  } as unknown as WorkspaceBackendRouter
}

describe('readFinderClipboardFiles', () => {
  beforeEach(() => {
    mockAvailableFormats.mockReturnValue([])
    mockReadBuffer.mockReturnValue(Buffer.alloc(0))
  })

  it('returns null when NSFilenamesPboardType is not available', () => {
    mockAvailableFormats.mockReturnValue(['text/plain'])
    expect(readFinderClipboardFiles()).toBeNull()
  })

  it('returns null when buffer is empty', () => {
    mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
    mockReadBuffer.mockReturnValue(Buffer.alloc(0))
    expect(readFinderClipboardFiles()).toBeNull()
  })

  it('returns file paths when Finder clipboard has files', () => {
    const buf = makeFinderplistBuffer(['/Users/me/file.txt', '/Users/me/dir'])
    mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
    mockReadBuffer.mockReturnValue(buf)

    const result = readFinderClipboardFiles()
    expect(result).toEqual(['/Users/me/file.txt', '/Users/me/dir'])
  })

  it('returns single file path', () => {
    const buf = makeFinderplistBuffer(['/Users/me/file.txt'])
    mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
    mockReadBuffer.mockReturnValue(buf)

    const result = readFinderClipboardFiles()
    expect(result).toEqual(['/Users/me/file.txt'])
  })

  it('returns null when buffer is invalid bplist', () => {
    mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
    mockReadBuffer.mockReturnValue(Buffer.from('not-a-valid-bplist'))

    expect(readFinderClipboardFiles()).toBeNull()
  })
})

describe('createFileClipboardHandlers', () => {
  beforeEach(() => {
    resetClipboardState()
    mockAvailableFormats.mockReturnValue([])
    mockReadBuffer.mockReturnValue(Buffer.alloc(0))
  })

  describe('handleSetFileClipboard', () => {
    it('stores clipboard state and returns ok', async () => {
      const router = makeMockRouter()
      const { handleSetFileClipboard, handleReadFileClipboard } =
        createFileClipboardHandlers(router)

      const result = await handleSetFileClipboard(mockEvent, {
        rootPath: '/proj',
        paths: [{ relativePath: 'src/a.ts', kind: 'file' }],
      })

      expect(result).toEqual({ ok: true })

      const readResult = await handleReadFileClipboard()
      expect(readResult.hasFiles).toBe(true)
      expect(readResult.source).toBe('internal')
    })

    it('returns error if rootPath is missing', async () => {
      const router = makeMockRouter()
      const { handleSetFileClipboard } = createFileClipboardHandlers(router)

      const result = await handleSetFileClipboard(mockEvent, {
        rootPath: '',
        paths: [{ relativePath: 'a.ts', kind: 'file' }],
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('returns error if paths is empty', async () => {
      const router = makeMockRouter()
      const { handleSetFileClipboard } = createFileClipboardHandlers(router)

      const result = await handleSetFileClipboard(mockEvent, {
        rootPath: '/proj',
        paths: [],
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('handleReadFileClipboard', () => {
    it('returns hasFiles false and source none when clipboard is empty', async () => {
      const router = makeMockRouter()
      const { handleReadFileClipboard } = createFileClipboardHandlers(router)

      const result = await handleReadFileClipboard()

      expect(result).toEqual({ ok: true, hasFiles: false, source: 'none' })
    })

    it('returns hasFiles true and source internal after set', async () => {
      const router = makeMockRouter()
      const { handleSetFileClipboard, handleReadFileClipboard } =
        createFileClipboardHandlers(router)

      await handleSetFileClipboard(mockEvent, {
        rootPath: '/proj',
        paths: [{ relativePath: 'dir/', kind: 'directory' }],
      })

      const result = await handleReadFileClipboard()
      expect(result).toEqual({ ok: true, hasFiles: true, source: 'internal' })
    })

    it('returns hasFiles true and source finder when Finder has files', async () => {
      const buf = makeFinderplistBuffer(['/Users/me/file.txt'])
      mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
      mockReadBuffer.mockReturnValue(buf)

      const router = makeMockRouter()
      const { handleReadFileClipboard } = createFileClipboardHandlers(router)

      const result = await handleReadFileClipboard()
      expect(result).toEqual({ ok: true, hasFiles: true, source: 'finder' })
    })

    it('prefers internal over finder when both have files', async () => {
      // Set Finder clipboard
      const buf = makeFinderplistBuffer(['/Users/me/file.txt'])
      mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
      mockReadBuffer.mockReturnValue(buf)

      const router = makeMockRouter()
      const { handleSetFileClipboard, handleReadFileClipboard } =
        createFileClipboardHandlers(router)

      // Set internal clipboard too
      await handleSetFileClipboard(mockEvent, {
        rootPath: '/proj',
        paths: [{ relativePath: 'a.ts', kind: 'file' }],
      })

      const result = await handleReadFileClipboard()
      expect(result.source).toBe('internal')
    })
  })

  describe('handleCopyEntries', () => {
    it('delegates to backendRouter.resolveByRootPath().copyEntries and returns ok', async () => {
      const copyEntriesFn = vi.fn().mockResolvedValue({ ok: true, copiedPaths: ['dest/a.ts'] })
      const router = makeMockRouter(copyEntriesFn)
      const { handleCopyEntries } = createFileClipboardHandlers(router)

      const result = await handleCopyEntries(mockEvent, {
        rootPath: '/proj',
        entries: [{ relativePath: 'a.ts', kind: 'file' }],
        destDir: 'dest',
      })

      expect(router.resolveByRootPath).toHaveBeenCalledWith('/proj')
      expect(copyEntriesFn).toHaveBeenCalledWith({
        rootPath: '/proj',
        entries: [{ relativePath: 'a.ts', kind: 'file' }],
        destDir: 'dest',
      })
      expect(result).toEqual({ ok: true, copiedPaths: ['dest/a.ts'] })
    })

    it('returns error if rootPath is missing', async () => {
      const router = makeMockRouter()
      const { handleCopyEntries } = createFileClipboardHandlers(router)

      const result = await handleCopyEntries(mockEvent, {
        rootPath: '',
        entries: [{ relativePath: 'a.ts', kind: 'file' }],
        destDir: 'dest',
      })

      expect(result.ok).toBe(false)
    })

    it('returns error on backend failure', async () => {
      const copyEntriesFn = vi.fn().mockRejectedValue(new Error('disk full'))
      const router = makeMockRouter(copyEntriesFn)
      const { handleCopyEntries } = createFileClipboardHandlers(router)

      const result = await handleCopyEntries(mockEvent, {
        rootPath: '/proj',
        entries: [{ relativePath: 'a.ts', kind: 'file' }],
        destDir: 'dest',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toContain('disk full')
    })
  })

  describe('handlePasteFromClipboard', () => {
    it('returns source none and ok true when clipboard is empty', async () => {
      const router = makeMockRouter()
      const { handlePasteFromClipboard } = createFileClipboardHandlers(router)

      const result = await handlePasteFromClipboard(mockEvent, {
        rootPath: '/proj',
        destDir: 'dest',
      })

      expect(result).toEqual({ ok: true, source: 'none' })
    })

    it('copies clipboard entries to destDir and returns pasted paths', async () => {
      const copyEntriesFn = vi.fn().mockResolvedValue({ ok: true, copiedPaths: ['dest/a.ts'] })
      const router = makeMockRouter(copyEntriesFn)
      const { handleSetFileClipboard, handlePasteFromClipboard } =
        createFileClipboardHandlers(router)

      await handleSetFileClipboard(mockEvent, {
        rootPath: '/proj',
        paths: [{ relativePath: 'a.ts', kind: 'file' }],
      })

      const result = await handlePasteFromClipboard(mockEvent, {
        rootPath: '/proj',
        destDir: 'dest',
      })

      expect(copyEntriesFn).toHaveBeenCalledWith({
        rootPath: '/proj',
        entries: [{ relativePath: 'a.ts', kind: 'file' }],
        destDir: 'dest',
      })
      expect(result).toEqual({ ok: true, pastedPaths: ['dest/a.ts'], source: 'internal' })
    })

    it('returns error on backend failure during paste', async () => {
      const copyEntriesFn = vi.fn().mockRejectedValue(new Error('copy failed'))
      const router = makeMockRouter(copyEntriesFn)
      const { handleSetFileClipboard, handlePasteFromClipboard } =
        createFileClipboardHandlers(router)

      await handleSetFileClipboard(mockEvent, {
        rootPath: '/proj',
        paths: [{ relativePath: 'a.ts', kind: 'file' }],
      })

      const result = await handlePasteFromClipboard(mockEvent, {
        rootPath: '/proj',
        destDir: 'dest',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toContain('copy failed')
    })

    it('returns error if rootPath is missing', async () => {
      const router = makeMockRouter()
      const { handlePasteFromClipboard } = createFileClipboardHandlers(router)

      const result = await handlePasteFromClipboard(mockEvent, {
        rootPath: '',
        destDir: 'dest',
      })

      expect(result.ok).toBe(false)
    })

    describe('Finder clipboard paste (local)', () => {
      let tmpDir: string

      beforeEach(async () => {
        tmpDir = await mkdtemp(path.join(tmpdir(), 'clipboard-paste-'))
      })

      afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true })
      })

      it('pastes Finder files to local destDir', async () => {
        // Create a source file to simulate Finder clipboard
        const srcFile = path.join(tmpDir, 'finder-source.txt')
        await writeFile(srcFile, 'hello from finder')

        // Create dest directory
        const destDir = path.join(tmpDir, 'dest')
        const { mkdir } = await import('node:fs/promises')
        await mkdir(destDir, { recursive: true })

        // Mock Finder clipboard with real bplist data
        const buf = makeFinderplistBuffer([srcFile])
        mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
        mockReadBuffer.mockReturnValue(buf)

        const router = makeMockRouter()
        const { handlePasteFromClipboard } = createFileClipboardHandlers(router)

        const result = await handlePasteFromClipboard(mockEvent, {
          rootPath: tmpDir,
          destDir: 'dest',
        })

        expect(result.ok).toBe(true)
        expect(result.source).toBe('finder')
        expect(result.pastedPaths).toEqual(['dest/finder-source.txt'])

        // Verify file was actually copied
        const destFiles = await readdir(destDir)
        expect(destFiles).toContain('finder-source.txt')
      })

      it('resolves name collisions for Finder paste', async () => {
        const srcFile = path.join(tmpDir, 'dup.txt')
        await writeFile(srcFile, 'source content')

        // Create dest with existing file
        const destDir = path.join(tmpDir, 'dest')
        const { mkdir } = await import('node:fs/promises')
        await mkdir(destDir, { recursive: true })
        await writeFile(path.join(destDir, 'dup.txt'), 'existing')

        const buf = makeFinderplistBuffer([srcFile])
        mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
        mockReadBuffer.mockReturnValue(buf)

        const router = makeMockRouter()
        const { handlePasteFromClipboard } = createFileClipboardHandlers(router)

        const result = await handlePasteFromClipboard(mockEvent, {
          rootPath: tmpDir,
          destDir: 'dest',
        })

        expect(result.ok).toBe(true)
        expect(result.source).toBe('finder')
        expect(result.pastedPaths).toEqual(['dest/dup (1).txt'])
      })

      it('pastes Finder files to rootPath when destDir is empty', async () => {
        const srcFile = path.join(tmpDir, 'src', 'file.txt')
        const { mkdir } = await import('node:fs/promises')
        await mkdir(path.join(tmpDir, 'src'), { recursive: true })
        await writeFile(srcFile, 'content')

        // Create a clean dest root
        const rootDir = path.join(tmpDir, 'root')
        await mkdir(rootDir, { recursive: true })

        const buf = makeFinderplistBuffer([srcFile])
        mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
        mockReadBuffer.mockReturnValue(buf)

        const router = makeMockRouter()
        const { handlePasteFromClipboard } = createFileClipboardHandlers(router)

        const result = await handlePasteFromClipboard(mockEvent, {
          rootPath: rootDir,
          destDir: '',
        })

        expect(result.ok).toBe(true)
        expect(result.pastedPaths).toEqual(['file.txt'])
      })
    })

    describe('Finder clipboard paste (remote)', () => {
      it('returns error when Finder has files but workspace is remote', async () => {
        const buf = makeFinderplistBuffer(['/Users/me/file.txt'])
        mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
        mockReadBuffer.mockReturnValue(buf)

        const router = makeMockRouter()
        const { handlePasteFromClipboard } = createFileClipboardHandlers(router)

        const result = await handlePasteFromClipboard(mockEvent, {
          rootPath: '/proj',
          destDir: 'dest',
          isRemote: true,
        })

        expect(result.ok).toBe(false)
        expect(result.source).toBe('finder')
        expect(result.error).toBeDefined()
      })

      it('uses internal clipboard on remote even when Finder has files', async () => {
        // Set Finder clipboard
        const buf = makeFinderplistBuffer(['/Users/me/file.txt'])
        mockAvailableFormats.mockReturnValue(['NSFilenamesPboardType'])
        mockReadBuffer.mockReturnValue(buf)

        const copyEntriesFn = vi.fn().mockResolvedValue({ ok: true, copiedPaths: ['dest/a.ts'] })
        const router = makeMockRouter(copyEntriesFn)
        const { handleSetFileClipboard, handlePasteFromClipboard } =
          createFileClipboardHandlers(router)

        // Set internal clipboard
        await handleSetFileClipboard(mockEvent, {
          rootPath: '/proj',
          paths: [{ relativePath: 'a.ts', kind: 'file' }],
        })

        const result = await handlePasteFromClipboard(mockEvent, {
          rootPath: '/proj',
          destDir: 'dest',
          isRemote: true,
        })

        expect(result.ok).toBe(true)
        expect(result.source).toBe('internal')
        expect(result.pastedPaths).toEqual(['dest/a.ts'])
      })
    })
  })
})
