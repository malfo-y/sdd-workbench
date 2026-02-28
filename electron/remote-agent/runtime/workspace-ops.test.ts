import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { workspaceIndex, workspaceReadFile, workspaceWriteFile } from './workspace-ops'

describe('remote-agent/runtime/workspace-ops', () => {
  it('indexes and reads files within workspace root', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-index-'))

    try {
      await mkdir(path.join(rootPath, 'src'), { recursive: true })
      await writeFile(path.join(rootPath, 'src/main.ts'), 'console.log("ok")\n', 'utf8')

      const indexResult = await workspaceIndex({ rootPath })
      expect(indexResult.ok).toBe(true)
      expect(JSON.stringify(indexResult.fileTree)).toContain('src/main.ts')

      const readResult = await workspaceReadFile(
        { rootPath },
        { relativePath: 'src/main.ts' },
      )
      expect(readResult).toMatchObject({
        ok: true,
        content: 'console.log("ok")\n',
      })
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })

  it('writes files and rejects workspace escape path', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-write-'))

    try {
      await workspaceWriteFile(
        { rootPath },
        { relativePath: 'docs/guide.md', content: '# hello\n' },
      )
      const saved = await readFile(path.join(rootPath, 'docs/guide.md'), 'utf8')
      expect(saved).toBe('# hello\n')

      await expect(
        workspaceWriteFile(
          { rootPath },
          { relativePath: '../outside.md', content: 'oops' },
        ),
      ).rejects.toMatchObject({
        code: 'PATH_DENIED',
      })
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })
})
