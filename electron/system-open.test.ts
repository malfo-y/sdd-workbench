import { describe, expect, it, vi } from 'vitest'
import {
  buildRemoteItermCommand,
  buildVsCodeRemoteArgs,
  openWorkspaceInExternalTool,
  type SystemOpenInRequest,
} from './system-open'

describe('electron/system-open', () => {
  it('builds an SSH command for remote iTerm sessions', () => {
    const command = buildRemoteItermCommand({
      workspaceId: 'remote-a',
      host: 'example.com',
      user: 'tester',
      port: 2222,
      identityFile: '~/.ssh/id_ed25519',
      remoteRoot: "/srv/it's-here",
    })

    expect(command).toContain("'ssh'")
    expect(command).toContain("'-p' '2222'")
    expect(command).toContain("'-i' '~/.ssh/id_ed25519'")
    expect(command).toContain("'-o' 'IdentitiesOnly=yes'")
    expect(command).toContain("'tester@example.com'")
    expect(command).toContain('exec $SHELL -l')
    expect(command).toContain("/srv/it")
    expect(command).toContain("s-here")
  })

  it('builds VSCode remote args from sshAlias', () => {
    expect(
      buildVsCodeRemoteArgs({
        workspaceId: 'remote-a',
        host: 'example.com',
        remoteRoot: '/srv/project-a',
        sshAlias: 'devbox-a',
      }),
    ).toEqual([
      '-a',
      'Visual Studio Code',
      '--args',
      '--remote',
      'ssh-remote+devbox-a',
      '/srv/project-a',
    ])
  })

  it('returns an explicit error when remote VSCode open has no sshAlias', async () => {
    const execFile = vi.fn<(file: string, args: string[]) => Promise<void>>(
      () => Promise.resolve(),
    )

    await expect(
      openWorkspaceInExternalTool(
        {
          rootPath: 'remote://remote-a',
          workspaceKind: 'remote',
          remoteProfile: {
            workspaceId: 'remote-a',
            host: 'example.com',
            remoteRoot: '/srv/project-a',
          },
        },
        'vscode',
        {
          platform: 'darwin',
          execFile,
        },
      ),
    ).resolves.toEqual({
      ok: false,
      error: 'Open in VSCode for remote workspace requires SSH Alias in the remote profile.',
    })

    expect(execFile).not.toHaveBeenCalled()
  })

  it('returns unsupported for remote Finder open', async () => {
    await expect(
      openWorkspaceInExternalTool(
        {
          rootPath: 'remote://remote-a',
          workspaceKind: 'remote',
          remoteProfile: {
            workspaceId: 'remote-a',
            host: 'example.com',
            remoteRoot: '/srv/project-a',
            sshAlias: 'devbox-a',
          },
        },
        'finder',
        {
          platform: 'darwin',
        },
      ),
    ).resolves.toEqual({
      ok: false,
      error: 'Open in Finder is unavailable for remote workspace.',
    })
  })

  it('opens local workspaces via open -a application', async () => {
    const execFile = vi.fn<(file: string, args: string[]) => Promise<void>>(
      () => Promise.resolve(),
    )
    const statPath = vi.fn(async () => ({
      isDirectory: () => true,
    }))

    const request: SystemOpenInRequest = {
      rootPath: '/Users/tester/project-a',
      workspaceKind: 'local',
    }

    await expect(
      openWorkspaceInExternalTool(request, 'vscode', {
        platform: 'darwin',
        execFile,
        statPath,
      }),
    ).resolves.toEqual({ ok: true })

    expect(execFile).toHaveBeenCalledWith('open', [
      '-a',
      'Visual Studio Code',
      '/Users/tester/project-a',
    ])
  })

  it('opens remote iTerm sessions via osascript', async () => {
    const execFile = vi.fn<(file: string, args: string[]) => Promise<void>>(
      () => Promise.resolve(),
    )

    await expect(
      openWorkspaceInExternalTool(
        {
          rootPath: 'remote://remote-a',
          workspaceKind: 'remote',
          remoteProfile: {
            workspaceId: 'remote-a',
            host: 'example.com',
            user: 'tester',
            remoteRoot: '/srv/project-a',
            sshAlias: 'devbox-a',
          },
        },
        'iterm',
        {
          platform: 'darwin',
          execFile,
        },
      ),
    ).resolves.toEqual({ ok: true })

    expect(execFile).toHaveBeenCalledTimes(1)
    expect(execFile).toHaveBeenCalledWith(
      'osascript',
      expect.arrayContaining([
        '-e',
        'tell application "iTerm"',
      ]),
    )
    const appleScriptArgs = execFile.mock.calls[0]?.[1] ?? []
    expect(appleScriptArgs.join(' ')).toContain('write text')
    expect(appleScriptArgs.join(' ')).toContain('tester@example.com')
    expect(appleScriptArgs.join(' ')).toContain('/srv/project-a')
  })
})
