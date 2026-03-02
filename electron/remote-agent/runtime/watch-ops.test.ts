import { mkdtemp, rm, writeFile } from 'node:fs/promises'
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
})
