import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { RuntimeWatchService } from './watch-ops'

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  })
}

describe('remote-agent/runtime/watch-ops', () => {
  it('starts polling watch and emits watch events', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-watch-'))
    const emitted: Array<{ eventName: string; payload: unknown }> = []

    try {
      const service = new RuntimeWatchService(rootPath, (eventName, payload) => {
        emitted.push({ eventName, payload })
      })

      const startResult = await service.start('native')
      expect(startResult).toMatchObject({
        ok: true,
        watchMode: 'polling',
        fallbackApplied: true,
      })

      await writeFile(path.join(rootPath, 'watched.txt'), 'hello\n', 'utf8')
      await wait(1_800)

      expect(emitted.some((event) => event.eventName === 'workspace.watchEvent')).toBe(
        true,
      )

      const stopResult = await service.stop()
      expect(stopResult).toEqual({ ok: true })
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })

  it('tracks file changes inside symlinked directories', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-watch-root-'))
    const externalPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-watch-target-'))
    const emitted: Array<{ eventName: string; payload: unknown }> = []

    try {
      await symlink(externalPath, path.join(rootPath, 'linked'))

      const service = new RuntimeWatchService(rootPath, (eventName, payload) => {
        emitted.push({ eventName, payload })
      })

      await service.start('native')

      await writeFile(path.join(externalPath, 'symlink-target.txt'), 'hello\n', 'utf8')
      await wait(1_800)

      const watchEvents = emitted.filter(
        (event) => event.eventName === 'workspace.watchEvent',
      )
      const hasChangedPath = watchEvents.some((event) => {
        const payload = event.payload as {
          changedRelativePaths?: string[]
        }
        return payload.changedRelativePaths?.includes('linked/symlink-target.txt') === true
      })

      expect(hasChangedPath).toBe(true)
      await service.stop()
    } finally {
      await rm(rootPath, { recursive: true, force: true })
      await rm(externalPath, { recursive: true, force: true })
    }
  })
})
