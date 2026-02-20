import { describe, expect, it } from 'vitest'
import {
  addOrFocusWorkspace,
  closeWorkspace,
  createEmptyWorkspaceState,
  createWorkspaceId,
  setActiveWorkspace,
  updateWorkspaceSession,
} from './workspace-model'

const ROOT_A = '/Users/tester/project-a'
const ROOT_B = '/Users/tester/project-b'

describe('workspace-model', () => {
  it('sets first added workspace as active', () => {
    const result = addOrFocusWorkspace(createEmptyWorkspaceState(), ROOT_A)
    const workspaceId = createWorkspaceId(ROOT_A)

    expect(result.created).toBe(true)
    expect(result.workspaceId).toBe(workspaceId)
    expect(result.state.activeWorkspaceId).toBe(workspaceId)
    expect(result.state.workspaceOrder).toEqual([workspaceId])
  })

  it('focuses existing workspace without creating duplicates', () => {
    const workspaceAId = createWorkspaceId(ROOT_A)
    const workspaceBId = createWorkspaceId(ROOT_B)

    let state = addOrFocusWorkspace(createEmptyWorkspaceState(), ROOT_A).state
    state = updateWorkspaceSession(state, workspaceAId, (session) => ({
      ...session,
      selectionRange: { startLine: 2, endLine: 3 },
    }))

    state = addOrFocusWorkspace(state, ROOT_B).state
    const duplicateOpen = addOrFocusWorkspace(state, ROOT_A)
    state = duplicateOpen.state

    expect(duplicateOpen.created).toBe(false)
    expect(Object.keys(state.workspacesById)).toHaveLength(2)
    expect(state.activeWorkspaceId).toBe(workspaceAId)
    expect(state.workspaceOrder).toEqual([workspaceBId, workspaceAId])
    expect(state.workspacesById[workspaceAId]?.selectionRange).toBeNull()
  })

  it('closes active workspace and promotes most recently used workspace', () => {
    const workspaceAId = createWorkspaceId(ROOT_A)
    const workspaceBId = createWorkspaceId(ROOT_B)

    let state = addOrFocusWorkspace(createEmptyWorkspaceState(), ROOT_A).state
    state = updateWorkspaceSession(state, workspaceAId, (session) => ({
      ...session,
      selectionRange: { startLine: 5, endLine: 6 },
    }))
    state = addOrFocusWorkspace(state, ROOT_B).state
    state = updateWorkspaceSession(state, workspaceBId, (session) => ({
      ...session,
      selectionRange: { startLine: 1, endLine: 2 },
    }))

    state = closeWorkspace(state, workspaceBId)

    expect(state.activeWorkspaceId).toBe(workspaceAId)
    expect(state.workspaceOrder).toEqual([workspaceAId])
    expect(state.workspacesById[workspaceAId]?.selectionRange).toBeNull()
  })

  it('preserves expanded directories per workspace when switching', () => {
    const workspaceAId = createWorkspaceId(ROOT_A)
    const workspaceBId = createWorkspaceId(ROOT_B)

    let state = addOrFocusWorkspace(createEmptyWorkspaceState(), ROOT_A).state
    state = updateWorkspaceSession(state, workspaceAId, (session) => ({
      ...session,
      expandedDirectories: ['src'],
    }))

    state = addOrFocusWorkspace(state, ROOT_B).state
    state = updateWorkspaceSession(state, workspaceBId, (session) => ({
      ...session,
      expandedDirectories: ['docs'],
    }))

    state = setActiveWorkspace(state, workspaceAId)
    state = setActiveWorkspace(state, workspaceBId)

    expect(state.workspacesById[workspaceAId]?.expandedDirectories).toEqual([
      'src',
    ])
    expect(state.workspacesById[workspaceBId]?.expandedDirectories).toEqual([
      'docs',
    ])
  })

  it('normalizes workspace id across trailing slash and separators', () => {
    expect(createWorkspaceId('/Users/tester/project-a/')).toBe(
      createWorkspaceId('/Users/tester/project-a'),
    )
    expect(createWorkspaceId('C:\\Users\\tester\\project-a')).toBe(
      createWorkspaceId('C:/Users/tester/project-a'),
    )
  })

  it('keeps activeSpec separated by workspace', () => {
    const workspaceAId = createWorkspaceId(ROOT_A)
    const workspaceBId = createWorkspaceId(ROOT_B)

    let state = addOrFocusWorkspace(createEmptyWorkspaceState(), ROOT_A).state
    state = updateWorkspaceSession(state, workspaceAId, (session) => ({
      ...session,
      activeSpec: 'docs/spec-a.md',
    }))

    state = addOrFocusWorkspace(state, ROOT_B).state
    state = updateWorkspaceSession(state, workspaceBId, (session) => ({
      ...session,
      activeSpec: 'docs/spec-b.md',
    }))

    state = setActiveWorkspace(state, workspaceAId)
    expect(state.workspacesById[workspaceAId]?.activeSpec).toBe('docs/spec-a.md')

    state = setActiveWorkspace(state, workspaceBId)
    expect(state.workspacesById[workspaceBId]?.activeSpec).toBe('docs/spec-b.md')
  })
})
