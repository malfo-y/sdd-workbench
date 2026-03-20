import { describe, expect, it } from 'vitest'
import {
  isPathInsideWorkspace,
  isPathInsideWorkspaceOrRoot,
} from './workspace-path'

describe('workspace-path', () => {
  it('treats descendants as inside the workspace', () => {
    expect(
      isPathInsideWorkspace('/Users/tester/project', '/Users/tester/project/src'),
    ).toBe(true)
  })

  it('does not treat the workspace root itself as a descendant path', () => {
    expect(
      isPathInsideWorkspace('/Users/tester/project', '/Users/tester/project'),
    ).toBe(false)
  })

  it('treats the workspace root itself as valid for root-inclusive checks', () => {
    expect(
      isPathInsideWorkspaceOrRoot(
        '/Users/tester/project',
        '/Users/tester/project',
      ),
    ).toBe(true)
  })

  it('rejects paths outside the workspace for root-inclusive checks', () => {
    expect(
      isPathInsideWorkspaceOrRoot(
        '/Users/tester/project',
        '/Users/tester/other',
      ),
    ).toBe(false)
  })
})
