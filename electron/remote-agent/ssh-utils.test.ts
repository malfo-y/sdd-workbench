import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildSshArgs,
  buildSshBaseArgs,
  extractNumericExitCode,
  isSshNodeRuntimeMissing,
  normalizeLocalIdentityFilePath,
  normalizeSshErrorMessage,
  shellEscape,
} from './ssh-utils'
import type { RemoteConnectionProfile } from './types'

const profile: RemoteConnectionProfile = {
  workspaceId: 'workspace-a',
  host: 'example.com',
  remoteRoot: '/repo',
}

describe('remote-agent/ssh-utils', () => {
  it('normalizes local identity file path shorthand', () => {
    expect(normalizeLocalIdentityFilePath('~')).toBe(os.homedir())
    expect(normalizeLocalIdentityFilePath('~/.ssh/id_rsa')).toBe(
      path.join(os.homedir(), '.ssh/id_rsa'),
    )
    expect(normalizeLocalIdentityFilePath('$HOME/.ssh/id_ed25519')).toBe(
      path.join(os.homedir(), '.ssh/id_ed25519'),
    )
    expect(normalizeLocalIdentityFilePath('/tmp/id_rsa')).toBe('/tmp/id_rsa')
  })

  it('builds canonical ssh args with identity and timeout', () => {
    const args = buildSshArgs(
      {
        ...profile,
        identityFile: '~/.ssh/id_ed25519',
        user: 'tester',
        port: 2222,
      },
      "'echo hello'",
    )

    expect(args).toEqual([
      '-p',
      '2222',
      '-i',
      path.join(os.homedir(), '.ssh/id_ed25519'),
      '-o',
      'IdentitiesOnly=yes',
      '-o',
      'ConnectTimeout=10',
      'tester@example.com',
      'sh',
      '-lc',
      "'echo hello'",
    ])
  })

  it('rejects ssh destinations that can be interpreted as options', () => {
    expect(() =>
      buildSshBaseArgs({
        ...profile,
        host: '-oProxyCommand=evil',
      }),
    ).toThrow('host must not start with "-"')

    expect(() =>
      buildSshBaseArgs({
        ...profile,
        user: '-oProxyCommand=evil',
      }),
    ).toThrow('user must not start with "-"')
  })

  it('shell-escapes single quotes without losing content', () => {
    expect(shellEscape("a'b c")).toBe(`'a'"'"'b c'`)
  })

  it('normalizes numeric exit codes from child_process errors', () => {
    expect(
      extractNumericExitCode({
        name: 'Error',
        message: 'exit',
        code: 255,
      } as never),
    ).toBe(255)
    expect(
      extractNumericExitCode({
        name: 'Error',
        message: 'exit',
        status: 127,
      } as never),
    ).toBe(127)
  })

  it('maps node-missing stderr to the canonical message', () => {
    expect(isSshNodeRuntimeMissing('sh: 1: node: not found')).toBe(true)
    expect(
      normalizeSshErrorMessage(
        '/usr/bin/env: node: No such file or directory',
        'fallback',
      ),
    ).toContain('Remote Node.js runtime is missing')
    expect(normalizeSshErrorMessage('permission denied', 'fallback')).toBe(
      'permission denied',
    )
  })
})
