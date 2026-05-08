import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { chokidarWatchMock, resolveWorkspaceWatchModeMock } = vi.hoisted(() => ({
  chokidarWatchMock: vi.fn(),
  resolveWorkspaceWatchModeMock: vi.fn(() => ({
    watchMode: 'native',
    isRemoteMounted: true,
    resolvedBy: 'heuristic',
    pollIntervalMs: 4_321,
  })),
}))

vi.mock('chokidar', () => ({
  default: {
    watch: chokidarWatchMock,
  },
}))

vi.mock('./workspace-watch-mode', () => ({
  resolveWorkspaceWatchMode: resolveWorkspaceWatchModeMock,
}))

import {
  handleWorkspaceWatchStart,
  initWatchersWin,
  stopAllWorkspaceWatchers,
} from './workspace-watchers'

describe('workspace-watchers', () => {
  const webContentsSend = vi.fn()
  let errorHandler: ((error: NodeJS.ErrnoException) => void) | null = null

  beforeEach(() => {
    errorHandler = null
    webContentsSend.mockReset()
    chokidarWatchMock.mockReset()
    initWatchersWin(
      () =>
        ({
          isDestroyed: () => false,
          webContents: {
            send: webContentsSend,
          },
        }) as never,
    )
    chokidarWatchMock.mockImplementation(() => {
      const handlers = new Map<string, (...args: unknown[]) => void>()
      return {
        on(eventName: string, handler: (...args: unknown[]) => void) {
          handlers.set(eventName, handler)
          if (eventName === 'error') {
            errorHandler = handler as (error: NodeJS.ErrnoException) => void
          }
          return this
        },
        close: vi.fn(async () => undefined),
      }
    })
  })

  afterEach(async () => {
    await stopAllWorkspaceWatchers()
    vi.restoreAllMocks()
  })

  it('reuses resolved poll interval when native watcher falls back to polling', async () => {
    const workspaceRoot = await mkdtemp(
      path.join(os.tmpdir(), 'sdd-workspace-watchers-'),
    )
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    try {
      const result = await handleWorkspaceWatchStart({} as never, {
        workspaceId: 'workspace-1',
        rootPath: workspaceRoot,
        watchModePreference: 'auto',
      })

      expect(result).toEqual({
        ok: true,
        watchMode: 'native',
        isRemoteMounted: true,
        fallbackApplied: false,
      })
      expect(errorHandler).toBeTypeOf('function')

      errorHandler?.(
        Object.assign(new Error('native watch unsupported'), {
          code: 'ENOTSUP',
        }),
      )

      await new Promise((resolve) => globalThis.setTimeout(resolve, 20))

      expect(
        setTimeoutSpy.mock.calls.some(([, delay]) => delay === 4_321),
      ).toBe(true)
      expect(webContentsSend).toHaveBeenCalledWith('workspace:watchFallback', {
        workspaceId: 'workspace-1',
        watchMode: 'polling',
      })
    } finally {
      setTimeoutSpy.mockRestore()
      await rm(workspaceRoot, { recursive: true, force: true })
    }
  })

  it('uses polling in auto mode for large local workspaces', async () => {
    const workspaceRoot = await mkdtemp(
      path.join(os.tmpdir(), 'sdd-workspace-watchers-large-'),
    )

    try {
      await Promise.all(
        Array.from({ length: 2_001 }, async (_, index) => {
          await writeFile(path.join(workspaceRoot, `file-${index}.txt`), 'ok')
        }),
      )

      const result = await handleWorkspaceWatchStart({} as never, {
        workspaceId: 'large-workspace',
        rootPath: workspaceRoot,
        watchModePreference: 'auto',
      })

      expect(result).toEqual({
        ok: true,
        watchMode: 'polling',
        isRemoteMounted: true,
        fallbackApplied: true,
      })
      expect(chokidarWatchMock).not.toHaveBeenCalled()
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true })
    }
  })
})
