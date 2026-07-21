import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  IPC_CHANNELS,
  type WorkspaceWatchSetFocusedPathsRequest,
} from './ipc-types'
import {
  handleWorkspaceGetGitLineMarkersRouted,
  handleWorkspaceReadFileRouted,
  handleWorkspaceSearchTextRouted,
  handleWorkspaceWatchSetFocusedPathsRouted,
  handleWorkspaceWatchStopRouted,
  initRouting,
} from './workspace-ipc-routing'
import type { RoutingDependencies } from './workspace-ipc-routing'
import type { WorkspaceBackend } from './workspace-backend/types'

function createBackend(kind: 'local' | 'remote'): WorkspaceBackend {
  return {
    kind,
    index: async () => ({ ok: true, fileTree: [] }),
    indexDirectory: async () => ({
      ok: true,
      children: [],
      childrenStatus: 'complete',
      totalChildCount: 0,
    }),
    searchFiles: async () => ({
      ok: true,
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    }),
    searchText: async () => ({
      ok: true,
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    }),
    readFile: async () => ({ ok: true, content: 'ok' }),
    writeFile: async () => ({ ok: true }),
    createFile: async () => ({ ok: true }),
    createDirectory: async () => ({ ok: true }),
    deleteFile: async () => ({ ok: true }),
    deleteDirectory: async () => ({ ok: true }),
    rename: async () => ({ ok: true }),
    getGitLineMarkers: async () => ({ ok: true, markers: [] }),
    getGitFileStatuses: async () => ({ ok: true, statuses: {} }),
    readComments: async () => ({ ok: true, comments: [] }),
    writeComments: async () => ({ ok: true }),
    readGlobalComments: async () => ({ ok: true, body: '' }),
    writeGlobalComments: async () => ({ ok: true }),
    exportCommentsBundle: async () => ({ ok: true }),
    copyEntries: async () => ({ ok: true, copiedPaths: [] }),
    watchStart: async () => ({ ok: true }),
    watchStop: async () => ({ ok: true }),
  }
}

function initializeRouting() {
  const deps: RoutingDependencies = {
    remoteConnectionService: {} as RoutingDependencies['remoteConnectionService'],
    queueRemoteAgentLog: vi.fn(),
    sanitizeRemoteLogMessage: vi.fn((message: string | undefined) => message ?? null),
  }

  return initRouting(deps)
}

describe('workspace-ipc-routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes focused-path watch IPC, backend, preload, and window API contract', async () => {
    expect(IPC_CHANNELS.WORKSPACE_WATCH_SET_FOCUSED_PATHS).toBe(
      'workspace:watchSetFocusedPaths',
    )

    const [ipcTypes, preload, windowTypes, backendTypes] = await Promise.all([
      readFile(path.join(process.cwd(), 'electron/ipc-types.ts'), 'utf8'),
      readFile(path.join(process.cwd(), 'electron/preload.ts'), 'utf8'),
      readFile(path.join(process.cwd(), 'electron/electron-env.d.ts'), 'utf8'),
      readFile(path.join(process.cwd(), 'electron/workspace-backend/types.ts'), 'utf8'),
    ])

    expect(ipcTypes).toMatch(
      /export type WorkspaceWatchSetFocusedPathsRequest = \{\s+workspaceId: string\s+rootPath: string\s+focusedRelativePaths: string\[\]\s+\}/,
    )
    expect(ipcTypes).toMatch(
      /export type WorkspaceWatchSetFocusedPathsResult = \{\s+ok: boolean\s+error\?: string\s+\}/,
    )
    expect(backendTypes).toContain('WorkspaceWatchSetFocusedPathsRequest')
    expect(backendTypes).toContain('watchSetFocusedPaths')
    expect(preload).toContain("ipcRenderer.invoke('workspace:watchSetFocusedPaths'")
    expect(windowTypes).toContain('watchSetFocusedPaths: (')
  })

  it('routes rootPath-based handlers through the resolved backend', async () => {
    const router = initializeRouting()
    const backend = createBackend('remote')
    const readFileSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, content: 'from-remote-backend' })
    backend.readFile = readFileSpy
    router.registerRemoteWorkspace({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      backend,
    })

    const result = await handleWorkspaceReadFileRouted({} as never, {
      rootPath: 'remote://workspace-a',
      relativePath: 'README.md',
    })

    expect(readFileSpy).toHaveBeenCalledWith({
      rootPath: 'remote://workspace-a',
      relativePath: 'README.md',
    })
    expect(result).toEqual({ ok: true, content: 'from-remote-backend' })
  })

  it('uses the local backend adapter without requiring a real IPC invoke event', async () => {
    initializeRouting()
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'workspace-routing-'))
    await writeFile(path.join(rootPath, 'README.md'), 'local file', 'utf8')

    const result = await handleWorkspaceReadFileRouted({} as never, {
      rootPath,
      relativePath: 'README.md',
    })

    expect(result).toEqual({ ok: true, content: 'local file' })
  })

  it('routes local text search through the local backend adapter', async () => {
    initializeRouting()
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'workspace-routing-text-'))
    await writeFile(path.join(rootPath, 'README.md'), 'local needle\n', 'utf8')

    const result = await handleWorkspaceSearchTextRouted({} as never, {
      rootPath,
      query: 'NEEDLE',
    })

    expect(result).toEqual({
      ok: true,
      results: [
        {
          relativePath: 'README.md',
          lineNumber: 1,
          snippet: 'local needle',
        },
      ],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
  })

  it('returns safe text search error shape when local root is not a directory', async () => {
    initializeRouting()
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'workspace-routing-file-root-'))
    const fileRootPath = path.join(rootPath, 'not-a-directory.txt')
    await writeFile(fileRootPath, 'needle\n', 'utf8')

    const result = await handleWorkspaceSearchTextRouted({} as never, {
      rootPath: fileRootPath,
      query: 'needle',
    })

    expect(result).toEqual({
      ok: false,
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
      error: 'Selected workspace root is not a directory.',
    })
  })

  it('routes remote text search through the resolved backend', async () => {
    const router = initializeRouting()
    const backend = createBackend('remote')
    const searchTextSpy = vi.fn().mockResolvedValue({
      ok: true,
      results: [
        {
          relativePath: 'src/remote.ts',
          lineNumber: 4,
          snippet: 'remote needle',
        },
      ],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
    backend.searchText = searchTextSpy
    router.registerRemoteWorkspace({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      backend,
    })

    const result = await handleWorkspaceSearchTextRouted({} as never, {
      rootPath: 'remote://workspace-a',
      query: 'needle',
    })

    expect(searchTextSpy).toHaveBeenCalledWith({
      rootPath: 'remote://workspace-a',
      query: 'needle',
    })
    expect(result).toEqual({
      ok: true,
      results: [
        {
          relativePath: 'src/remote.ts',
          lineNumber: 4,
          snippet: 'remote needle',
        },
      ],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
  })

  it('preserves text search fallback shape when backend resolution fails', async () => {
    initializeRouting()

    const result = await handleWorkspaceSearchTextRouted({} as never, {
      rootPath: 'remote://missing-workspace',
      query: 'needle',
    })

    expect(result).toEqual({
      ok: false,
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
      error: 'Remote workspace backend is not registered. Reconnect the remote workspace.',
    })
  })

  it('preserves handler-specific fallback shape when backend resolution fails', async () => {
    initializeRouting()
    const result = await handleWorkspaceGetGitLineMarkersRouted({} as never, {
      rootPath: 'remote://missing-workspace',
      relativePath: 'src/app.ts',
    })

    expect(result).toEqual({
      ok: false,
      markers: [],
      error: 'Remote workspace backend is not registered. Reconnect the remote workspace.',
    })
  })

  it('routes watchStop through the remote backend selected by workspaceId', async () => {
    const router = initializeRouting()
    const backend = createBackend('remote')
    const watchStopSpy = vi.fn().mockResolvedValue({ ok: true })
    backend.watchStop = watchStopSpy
    router.registerRemoteWorkspace({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      backend,
    })

    const result = await handleWorkspaceWatchStopRouted({} as never, {
      workspaceId: 'workspace-a',
    })

    expect(watchStopSpy).toHaveBeenCalledWith({ workspaceId: 'workspace-a' })
    expect(result).toEqual({ ok: true })
  })

  it('routes watchSetFocusedPaths as a local no-op and remote backend invocation', async () => {
    const router = initializeRouting()

    const localResult = await handleWorkspaceWatchSetFocusedPathsRouted({} as never, {
      workspaceId: 'local-workspace',
      rootPath: '/Users/tester/project',
      focusedRelativePaths: ['src/App.tsx'],
    })

    expect(localResult).toEqual({ ok: true })

    const backend = createBackend('remote')
    const watchSetFocusedPathsSpy = vi.fn().mockResolvedValue({ ok: true })
    backend.watchSetFocusedPaths = watchSetFocusedPathsSpy
    router.registerRemoteWorkspace({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      backend,
    })
    const remoteRequest: WorkspaceWatchSetFocusedPathsRequest = {
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      focusedRelativePaths: ['src/remote.ts'],
    }

    const remoteResult = await handleWorkspaceWatchSetFocusedPathsRouted(
      {} as never,
      remoteRequest,
    )

    expect(watchSetFocusedPathsSpy).toHaveBeenCalledWith(remoteRequest)
    expect(remoteResult).toEqual({ ok: true })
  })

  it('returns a validation error when watchStop request omits workspaceId', async () => {
    initializeRouting()

    const result = await handleWorkspaceWatchStopRouted({} as never, {
      workspaceId: '',
    })

    expect(result).toEqual({
      ok: false,
      error: 'workspaceId is required.',
    })
  })
})
