import { describe, expect, it } from 'vitest'
import {
  REMOTE_AGENT_RUNTIME_PAYLOAD,
  REMOTE_AGENT_RUNTIME_PAYLOAD_PROTOCOL_VERSION,
} from './generated-payload'

describe('remote-agent/runtime/payload', () => {
  it('contains executable shebang and protocol version marker', () => {
    expect(REMOTE_AGENT_RUNTIME_PAYLOAD.startsWith('#!/usr/bin/env node\n')).toBe(
      true,
    )
    expect(REMOTE_AGENT_RUNTIME_PAYLOAD).toContain(
      REMOTE_AGENT_RUNTIME_PAYLOAD_PROTOCOL_VERSION,
    )
    expect(REMOTE_AGENT_RUNTIME_PAYLOAD).toContain('--healthcheck')
    expect(REMOTE_AGENT_RUNTIME_PAYLOAD).toContain('workspace.watchStart')
  })
})
