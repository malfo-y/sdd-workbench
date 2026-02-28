import { describe, expect, it, vi } from 'vitest'
import { bootstrapRemoteAgent, buildSshArgs } from './bootstrap'
import { RemoteAgentError, REMOTE_AGENT_PROTOCOL_VERSION } from './protocol'
import type { RemoteConnectionProfile } from './types'

const profile: RemoteConnectionProfile = {
  workspaceId: 'workspace-a',
  host: 'example.com',
  remoteRoot: '/repo',
}

describe('remote-agent/bootstrap', () => {
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
      '~/.ssh/id_ed25519',
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

  it('passes when agent already exists with compatible version', async () => {
    const installAgent = vi.fn(async () => undefined)

    const result = await bootstrapRemoteAgent(profile, {
      probeAgent: async () => ({
        exists: true,
        version: REMOTE_AGENT_PROTOCOL_VERSION,
        agentPath: '/agent',
      }),
      installAgent,
    })

    expect(result).toEqual({
      agentPath: '/agent',
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
      installed: false,
    })
    expect(installAgent).not.toHaveBeenCalled()
  })

  it('installs once when agent is missing, then validates version', async () => {
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
        exists: false,
        agentPath: '/agent',
      })
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
    expect(probeAgent).toHaveBeenCalledTimes(2)
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
