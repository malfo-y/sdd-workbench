import { describe, expect, it, vi } from 'vitest'
import {
  browseRemoteDirectories,
  buildRemoteDirectoryBrowseScript,
} from './directory-browser'

describe('remote-agent/directory-browser', () => {
  it('parses and sorts directory entries from browse output', async () => {
    const runSshCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: [
        '__SDD_BROWSE_CURRENT__\t/data/workspace',
        '__SDD_BROWSE_ENTRY__\tdirectory\tzeta',
        '__SDD_BROWSE_ENTRY__\tsymlink\talpha',
        '__SDD_BROWSE_TRUNCATED__\t1',
      ].join('\n'),
      stderr: '',
    }))

    const result = await browseRemoteDirectories(
      {
        host: 'example.com',
        targetPath: '/data/workspace',
      },
      {
        runSshCommand,
      },
    )

    expect(result).toEqual({
      currentPath: '/data/workspace',
      truncated: true,
      entries: [
        {
          kind: 'symlink',
          name: 'alpha',
          path: '/data/workspace/alpha',
        },
        {
          kind: 'directory',
          name: 'zeta',
          path: '/data/workspace/zeta',
        },
      ],
    })
  })

  it('returns AUTH_FAILED when ssh rejects credentials', async () => {
    await expect(
      browseRemoteDirectories(
        {
          host: 'example.com',
        },
        {
          runSshCommand: async () => ({
            exitCode: 255,
            stdout: '',
            stderr: 'Permission denied (publickey).',
          }),
        },
      ),
    ).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    })
  })

  it('returns PATH_DENIED when response contains PATH_DENIED marker', async () => {
    await expect(
      browseRemoteDirectories(
        {
          host: 'example.com',
          targetPath: 'relative/path',
        },
        {
          runSshCommand: async () => ({
            exitCode: 3,
            stdout:
              '__SDD_BROWSE_ERROR__\tPATH_DENIED\tTarget path must be absolute.\n',
            stderr: '',
          }),
        },
      ),
    ).rejects.toMatchObject({
      code: 'PATH_DENIED',
      message: 'Target path must be absolute.',
    })
  })

  it('returns TIMEOUT when browse ssh command times out', async () => {
    await expect(
      browseRemoteDirectories(
        {
          host: 'example.com',
        },
        {
          runSshCommand: async () => {
            throw new Error('Command timed out after 7000ms')
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'TIMEOUT',
    })
  })

  it('builds browse script with target path and limit', () => {
    const script = buildRemoteDirectoryBrowseScript({
      targetPath: '~/workspace',
      limit: 123,
    })

    expect(script).toContain("requested_path='~/workspace'")
    expect(script).toContain('limit=123')
    expect(script).toContain('__SDD_BROWSE_ENTRY__')
  })
})
