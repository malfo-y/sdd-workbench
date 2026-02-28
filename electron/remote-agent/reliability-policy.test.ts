import { describe, expect, it } from 'vitest'
import {
  REMOTE_AGENT_CONNECT_TIMEOUT_DEFAULT_MS,
  REMOTE_AGENT_CONNECT_TIMEOUT_MAX_MS,
  REMOTE_AGENT_CONNECT_TIMEOUT_MIN_MS,
  REMOTE_AGENT_CONNECT_TIMEOUT_MS,
  REMOTE_AGENT_RECONNECT_ATTEMPTS,
  REMOTE_AGENT_RECONNECT_ATTEMPTS_DEFAULT,
  REMOTE_AGENT_RECONNECT_ATTEMPTS_MAX,
  REMOTE_AGENT_REQUEST_TIMEOUT_DEFAULT_MS,
  REMOTE_AGENT_REQUEST_TIMEOUT_MIN_MS,
  REMOTE_AGENT_REQUEST_TIMEOUT_MS,
  applyRemoteReliabilityPolicyToProfile,
  loadRemoteReliabilityPolicy,
} from './reliability-policy'

describe('remote-agent/reliability-policy', () => {
  it('returns safe defaults when env values are missing', () => {
    const policy = loadRemoteReliabilityPolicy({})

    expect(policy).toEqual({
      connectTimeoutMs: REMOTE_AGENT_CONNECT_TIMEOUT_DEFAULT_MS,
      requestTimeoutMs: REMOTE_AGENT_REQUEST_TIMEOUT_DEFAULT_MS,
      reconnectAttempts: REMOTE_AGENT_RECONNECT_ATTEMPTS_DEFAULT,
    })
  })

  it('normalizes invalid env values to default or bounds', () => {
    const policy = loadRemoteReliabilityPolicy({
      [REMOTE_AGENT_CONNECT_TIMEOUT_MS]: '-5',
      [REMOTE_AGENT_REQUEST_TIMEOUT_MS]: 'not-a-number',
      [REMOTE_AGENT_RECONNECT_ATTEMPTS]: '999',
    })

    expect(policy).toEqual({
      connectTimeoutMs: REMOTE_AGENT_CONNECT_TIMEOUT_MIN_MS,
      requestTimeoutMs: REMOTE_AGENT_REQUEST_TIMEOUT_DEFAULT_MS,
      reconnectAttempts: REMOTE_AGENT_RECONNECT_ATTEMPTS_MAX,
    })
  })

  it('clamps oversized timeout values to configured max', () => {
    const policy = loadRemoteReliabilityPolicy({
      [REMOTE_AGENT_CONNECT_TIMEOUT_MS]: '3600000',
      [REMOTE_AGENT_REQUEST_TIMEOUT_MS]: '1000',
      [REMOTE_AGENT_RECONNECT_ATTEMPTS]: '2',
    })

    expect(policy).toEqual({
      connectTimeoutMs: REMOTE_AGENT_CONNECT_TIMEOUT_MAX_MS,
      requestTimeoutMs: REMOTE_AGENT_REQUEST_TIMEOUT_MIN_MS,
      reconnectAttempts: 2,
    })
  })

  it('applies policy timeout defaults to profile only when omitted', () => {
    const policy = loadRemoteReliabilityPolicy({
      [REMOTE_AGENT_CONNECT_TIMEOUT_MS]: '12000',
      [REMOTE_AGENT_REQUEST_TIMEOUT_MS]: '18000',
      [REMOTE_AGENT_RECONNECT_ATTEMPTS]: '1',
    })

    expect(
      applyRemoteReliabilityPolicyToProfile(
        {
          workspaceId: 'workspace-a',
          host: 'example.com',
          remoteRoot: '/repo',
        },
        policy,
      ),
    ).toEqual(
      expect.objectContaining({
        connectTimeoutMs: 12000,
        requestTimeoutMs: 18000,
      }),
    )

    expect(
      applyRemoteReliabilityPolicyToProfile(
        {
          workspaceId: 'workspace-a',
          host: 'example.com',
          remoteRoot: '/repo',
          connectTimeoutMs: 22000,
          requestTimeoutMs: 28000,
        },
        policy,
      ),
    ).toEqual(
      expect.objectContaining({
        connectTimeoutMs: 22000,
        requestTimeoutMs: 28000,
      }),
    )
  })
})
