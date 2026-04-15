import { describe, expect, it, vi } from 'vitest'
import {
  buildAtomicWriteTemporaryPath,
  writeFileAtomic,
} from './atomic-write'

describe('electron/atomic-write', () => {
  it('creates a sibling temporary path for atomic writes', () => {
    expect(
      buildAtomicWriteTemporaryPath('/tmp/project/notes.md', 'token-123'),
    ).toBe('/tmp/project/.notes.md.' + process.pid + '.token-123.tmp')
  })

  it('cleans up the temporary file when rename fails', async () => {
    const writeFile = vi.fn(async () => undefined)
    const rename = vi.fn(async () => {
      throw new Error('rename failed')
    })
    const rm = vi.fn(async () => undefined)

    await expect(
      writeFileAtomic('/tmp/project/notes.md', '# notes\n', {
        createTemporaryPath: () => '/tmp/project/.notes.md.test.tmp',
        writeFile,
        rename,
        rm,
      }),
    ).rejects.toThrow('rename failed')

    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/project/.notes.md.test.tmp',
      '# notes\n',
      'utf8',
    )
    expect(rm).toHaveBeenCalledWith('/tmp/project/.notes.md.test.tmp', {
      force: true,
    })
  })
})
