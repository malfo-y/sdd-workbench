import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  bootstrapRemoteAgent,
  buildInstallAgentScript,
  buildProbeAgentScript,
  buildSshArgs,
  isSshNodeRuntimeMissing,
  normalizeLocalIdentityFilePath,
  resolveRemoteAgentPath,
} from './bootstrap'
import { RemoteAgentError, REMOTE_AGENT_PROTOCOL_VERSION } from './protocol'
import type { RemoteConnectionProfile } from './types'

const profile: RemoteConnectionProfile = {
  workspaceId: 'workspace-a',
  host: 'example.com',
  remoteRoot: '/repo',
}

function resolveShellVariable(
  assignment: string,
  variableName: string,
  homeDir: string,
): string {
  return execFileSync(
    'sh',
    [
      '-lc',
      `${assignment}
printf '%s' "$${variableName}"`,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: homeDir,
      },
    },
  )
}

describe('remote-agent/bootstrap', () => {
  it('detects ssh stderr patterns for missing node runtime', () => {
    expect(isSshNodeRuntimeMissing('sh: 1: node: not found')).toBe(true)
    expect(
      isSshNodeRuntimeMissing(
        '/usr/bin/env: ‘node’: No such file or directory',
      ),
    ).toBe(true)
    expect(
      isSshNodeRuntimeMissing('/usr/bin/env: node: No such file or directory'),
    ).toBe(true)
    expect(isSshNodeRuntimeMissing('permission denied')).toBe(false)
  })

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

  it('adds -i and IdentitiesOnly=yes when identityFile is provided', () => {
    const args = buildSshArgs(
      {
        ...profile,
        identityFile: '~/.ssh/id_ed25519',
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
      'example.com',
      'sh',
      '-lc',
      "'echo hello'",
    ])
  })

  it('keeps existing ssh args when identityFile is missing', () => {
    const args = buildSshArgs(profile, "'echo hello'")

    expect(args).toEqual([
      '-o',
      'ConnectTimeout=10',
      'example.com',
      'sh',
      '-lc',
      "'echo hello'",
    ])
  })

  it('preserves $HOME expansion for generated bootstrap script assignments', () => {
    const agentPath = resolveRemoteAgentPath({
      ...profile,
      agentPath: "~/bin/agent's folder/remote agent",
    })
    const homeDir = '/tmp/bootstrap home'

    expect(agentPath).toBe("$HOME/bin/agent's folder/remote agent")

    const probeScript = buildProbeAgentScript(agentPath)
    const installScript = buildInstallAgentScript(agentPath)
    const [probeAgentPathAssignment] = probeScript.split('\n')
    const [installAgentPathAssignment, installAgentDirAssignment] =
      installScript.split('\n')

    expect(resolveShellVariable(probeAgentPathAssignment, 'agent_path', homeDir)).toBe(
      "/tmp/bootstrap home/bin/agent's folder/remote agent",
    )
    expect(
      resolveShellVariable(installAgentPathAssignment, 'agent_path', homeDir),
    ).toBe("/tmp/bootstrap home/bin/agent's folder/remote agent")
    expect(resolveShellVariable(installAgentDirAssignment, 'agent_dir', homeDir)).toBe(
      "/tmp/bootstrap home/bin/agent's folder",
    )
    expect(probeScript).toContain(`agent_path="$HOME"'/bin/agent'"'"'s folder/remote agent'`)
    expect(probeScript).toContain('"$agent_path" --protocol-version')
    expect(installScript).toContain('mkdir -p "$agent_dir"')
    expect(installScript).toContain(`cat > "$agent_path" <<'__SDD_REMOTE_AGENT__'`)
    expect(installScript).toContain('"$agent_path" --protocol-version')
  })

  it('rejects control characters in agentPath', () => {
    expect(() =>
      resolveRemoteAgentPath({
        ...profile,
        agentPath: '/tmp/agent\nmalicious',
      }),
    ).toThrow('agentPath contains unsupported control characters.')
  })

  it('reinstalls even when agent already exists with compatible version', async () => {
    const probeAgent = vi
      .fn<
        () => Promise<{
          exists: boolean
          version?: string
          agentPath: string
        }>
      >()
      .mockResolvedValue({
        exists: true,
        version: REMOTE_AGENT_PROTOCOL_VERSION,
        agentPath: '/agent',
      })
    const installAgent = vi.fn(async () => undefined)

    const result = await bootstrapRemoteAgent(profile, {
      probeAgent,
      installAgent,
    })

    expect(result).toEqual({
      agentPath: '/agent',
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
      installed: true,
    })
    expect(installAgent).toHaveBeenCalledTimes(1)
    expect(probeAgent).toHaveBeenCalledTimes(1)
  })

  it('installs and validates version after overwrite', async () => {
    const installAgent = vi.fn(async () => undefined)
    const probeAgent = vi
      .fn<
        () => Promise<{
          exists: boolean
          version?: string
          agentPath: string
        }>
      >()
      .mockResolvedValueOnce({
        exists: true,
        version: REMOTE_AGENT_PROTOCOL_VERSION,
        agentPath: '/agent',
      })

    const result = await bootstrapRemoteAgent(profile, {
      probeAgent,
      installAgent,
    })

    expect(result.installed).toBe(true)
    expect(probeAgent).toHaveBeenCalledTimes(1)
    expect(installAgent).toHaveBeenCalledTimes(1)
  })

  it('returns AGENT_PROTOCOL_MISMATCH when version is incompatible', async () => {
    await expect(
      bootstrapRemoteAgent(profile, {
        probeAgent: async () => ({
          exists: true,
          version: '9.9.9',
          agentPath: '/agent',
        }),
        installAgent: async () => undefined,
      }),
    ).rejects.toMatchObject({
      code: 'AGENT_PROTOCOL_MISMATCH',
    })
  })

  it('fails when probe still cannot find agent after install', async () => {
    await expect(
      bootstrapRemoteAgent(profile, {
        probeAgent: async () => ({
          exists: false,
          agentPath: '/agent',
        }),
        installAgent: async () => undefined,
      }),
    ).rejects.toBeInstanceOf(RemoteAgentError)

    try {
      await bootstrapRemoteAgent(profile, {
        probeAgent: async () => ({
          exists: false,
          agentPath: '/agent',
        }),
        installAgent: async () => undefined,
      })
    } catch (error) {
      expect((error as RemoteAgentError).code).toBe('BOOTSTRAP_FAILED')
    }
  })
})
