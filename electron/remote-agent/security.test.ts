import { describe, expect, it } from 'vitest'
import {
  assertRemoteWorkspaceMethodAllowed,
  getAllowedRemoteWorkspaceMethods,
  redactRemoteErrorMessage,
} from './security'

describe('remote-agent/security', () => {
  it('allows only whitelisted workspace RPC methods', () => {
    for (const method of getAllowedRemoteWorkspaceMethods()) {
      expect(() => assertRemoteWorkspaceMethodAllowed(method)).not.toThrow()
    }
  })

  it('rejects non-whitelisted methods with PATH_DENIED', () => {
    try {
      assertRemoteWorkspaceMethodAllowed('workspace.execShell')
      throw new Error('Expected method whitelist guard to throw.')
    } catch (error) {
      expect(error).toMatchObject({
        code: 'PATH_DENIED',
      })
    }
  })

  it('redacts sensitive values from remote error messages', () => {
    const message = redactRemoteErrorMessage(
      'ssh stderr: Permission denied (publickey). password=my-secret /Users/tester/.ssh/id_rsa',
    )

    expect(message).toContain('Permission denied')
    expect(message).toContain('password=[REDACTED]')
    expect(message).toContain('[REDACTED_PATH]')
    expect(message).not.toContain('my-secret')
    expect(message).not.toContain('/Users/tester/.ssh/id_rsa')
  })
})
