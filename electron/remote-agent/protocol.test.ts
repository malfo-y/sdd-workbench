import { describe, expect, it } from 'vitest'
import {
  REMOTE_AGENT_ERROR_CODES,
  REMOTE_AGENT_PROTOCOL_VERSION,
  RemoteAgentError,
  ensureSupportedProtocolVersion,
  isSupportedProtocolVersion,
} from './protocol'

describe('remote-agent/protocol', () => {
  it('includes required MVP error codes', () => {
    expect(REMOTE_AGENT_ERROR_CODES).toEqual(
      expect.arrayContaining([
        'AUTH_FAILED',
        'TIMEOUT',
        'AGENT_PROTOCOL_MISMATCH',
        'PATH_DENIED',
      ]),
    )
  })

  it('accepts the declared protocol version', () => {
    expect(isSupportedProtocolVersion(REMOTE_AGENT_PROTOCOL_VERSION)).toBe(true)
  })

  it('rejects unsupported protocol versions', () => {
    expect(isSupportedProtocolVersion('9.9.9')).toBe(false)

    expect(() => {
      ensureSupportedProtocolVersion('9.9.9')
    }).toThrowError(RemoteAgentError)

    expect(() => {
      ensureSupportedProtocolVersion('9.9.9')
    }).toThrow(/Unsupported remote agent protocol version/)
  })
})
