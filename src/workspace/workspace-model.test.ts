import { describe, expect, it } from 'vitest'
import {
  addOrFocusWorkspace,
  canStepWorkspaceFileHistory,
  closeWorkspace,
  createEmptyWorkspaceState,
  createWorkspaceId,
  createWorkspaceSession,
  getWorkspaceFileLastLine,
  MAX_WORKSPACE_FILE_HISTORY,
  pushWorkspaceFileHistory,
  setWorkspaceSelectionRange,
  setActiveWorkspace,
  stepWorkspaceFileHistory,
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

  it('keeps changedFiles separated by workspace', () => {
    const workspaceAId = createWorkspaceId(ROOT_A)
    const workspaceBId = createWorkspaceId(ROOT_B)

    let state = addOrFocusWorkspace(createEmptyWorkspaceState(), ROOT_A).state
    state = updateWorkspaceSession(state, workspaceAId, (session) => ({
      ...session,
      changedFiles: ['src/a.ts'],
    }))

    state = addOrFocusWorkspace(state, ROOT_B).state
    state = updateWorkspaceSession(state, workspaceBId, (session) => ({
      ...session,
      changedFiles: ['docs/b.md'],
    }))

    expect(state.workspacesById[workspaceAId]?.changedFiles).toEqual(['src/a.ts'])
    expect(state.workspacesById[workspaceBId]?.changedFiles).toEqual(['docs/b.md'])
  })

  it('pushes file history and deduplicates consecutive same file opens', () => {
    let session = createWorkspaceSession(ROOT_A)
    session = pushWorkspaceFileHistory(session, 'src/a.ts')
    session = pushWorkspaceFileHistory(session, 'src/b.ts')
    session = pushWorkspaceFileHistory(session, 'src/b.ts')

    expect(session.fileHistory).toEqual(['src/a.ts', 'src/b.ts'])
    expect(session.fileHistoryIndex).toBe(1)
  })

  it('truncates forward history when opening a new file after back navigation', () => {
    let session = createWorkspaceSession(ROOT_A)
    session = pushWorkspaceFileHistory(session, 'src/a.ts')
    session = pushWorkspaceFileHistory(session, 'src/b.ts')
    session = pushWorkspaceFileHistory(session, 'src/c.ts')

    const steppedBack = stepWorkspaceFileHistory(session, 'back')
    expect(steppedBack.targetRelativePath).toBe('src/b.ts')
    session = steppedBack.nextSession
    session = pushWorkspaceFileHistory(session, 'src/d.ts')

    expect(session.fileHistory).toEqual(['src/a.ts', 'src/b.ts', 'src/d.ts'])
    expect(session.fileHistoryIndex).toBe(2)
    expect(canStepWorkspaceFileHistory(session, 'forward')).toBe(false)
  })

  it('steps back and forward only when history pointer can move', () => {
    let session = createWorkspaceSession(ROOT_A)
    expect(canStepWorkspaceFileHistory(session, 'back')).toBe(false)
    expect(canStepWorkspaceFileHistory(session, 'forward')).toBe(false)

    session = pushWorkspaceFileHistory(session, 'src/a.ts')
    session = pushWorkspaceFileHistory(session, 'src/b.ts')
    session = pushWorkspaceFileHistory(session, 'src/c.ts')
    expect(canStepWorkspaceFileHistory(session, 'back')).toBe(true)
    expect(canStepWorkspaceFileHistory(session, 'forward')).toBe(false)

    const backOne = stepWorkspaceFileHistory(session, 'back')
    session = backOne.nextSession
    expect(backOne.targetRelativePath).toBe('src/b.ts')
    expect(canStepWorkspaceFileHistory(session, 'forward')).toBe(true)

    const backTwo = stepWorkspaceFileHistory(session, 'back')
    session = backTwo.nextSession
    expect(backTwo.targetRelativePath).toBe('src/a.ts')
    expect(canStepWorkspaceFileHistory(session, 'back')).toBe(false)

    const forwardOne = stepWorkspaceFileHistory(session, 'forward')
    session = forwardOne.nextSession
    expect(forwardOne.targetRelativePath).toBe('src/b.ts')
  })

  it('keeps workspace file history bounded to max length', () => {
    let session = createWorkspaceSession(ROOT_A)

    for (let index = 1; index <= MAX_WORKSPACE_FILE_HISTORY + 5; index += 1) {
      session = pushWorkspaceFileHistory(session, `src/file-${index}.ts`)
    }

    expect(session.fileHistory).toHaveLength(MAX_WORKSPACE_FILE_HISTORY)
    expect(session.fileHistory[0]).toBe('src/file-6.ts')
    expect(session.fileHistory[MAX_WORKSPACE_FILE_HISTORY - 1]).toBe(
      `src/file-${MAX_WORKSPACE_FILE_HISTORY + 5}.ts`,
    )
    expect(session.fileHistoryIndex).toBe(MAX_WORKSPACE_FILE_HISTORY - 1)
  })

  it('keeps fileHistory separated by workspace', () => {
    const workspaceAId = createWorkspaceId(ROOT_A)
    const workspaceBId = createWorkspaceId(ROOT_B)

    let state = addOrFocusWorkspace(createEmptyWorkspaceState(), ROOT_A).state
    state = updateWorkspaceSession(state, workspaceAId, (session) =>
      pushWorkspaceFileHistory(session, 'src/a.ts'),
    )

    state = addOrFocusWorkspace(state, ROOT_B).state
    state = updateWorkspaceSession(state, workspaceBId, (session) =>
      pushWorkspaceFileHistory(session, 'docs/b.md'),
    )

    expect(state.workspacesById[workspaceAId]?.fileHistory).toEqual(['src/a.ts'])
    expect(state.workspacesById[workspaceBId]?.fileHistory).toEqual(['docs/b.md'])
  })

  it('updates fileLastLineByPath when selection changes on active file', () => {
    let session = createWorkspaceSession(ROOT_A)
    session = {
      ...session,
      activeFile: 'src/auth.ts',
    }

    session = setWorkspaceSelectionRange(session, {
      startLine: -2,
      endLine: 8.9,
    })

    expect(session.selectionRange).toEqual({
      startLine: 1,
      endLine: 8,
    })
    expect(session.fileLastLineByPath).toEqual({
      'src/auth.ts': 8,
    })
    expect(getWorkspaceFileLastLine(session, 'src/auth.ts')).toBe(8)
  })

  it('preserves fileLastLineByPath when selection is cleared', () => {
    let session = createWorkspaceSession(ROOT_A)
    session = {
      ...session,
      activeFile: 'src/auth.ts',
      fileLastLineByPath: {
        'src/auth.ts': 6,
      },
    }

    session = setWorkspaceSelectionRange(session, null)

    expect(session.selectionRange).toBeNull()
    expect(session.fileLastLineByPath).toEqual({
      'src/auth.ts': 6,
    })
  })
})
