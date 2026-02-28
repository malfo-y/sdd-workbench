import { beforeEach, describe, expect, it } from 'vitest'
import {
  addOrFocusWorkspace,
  createEmptyWorkspaceState,
  createWorkspaceId,
  updateWorkspaceSession,
} from './workspace-model'
import {
  clearWorkspaceSessionSnapshot,
  createWorkspaceSessionSnapshot,
  loadWorkspaceSessionSnapshot,
  MAX_PERSISTED_FILE_LAST_LINE_ENTRIES,
  saveWorkspaceSessionSnapshot,
  WORKSPACE_SESSION_SCHEMA_VERSION,
  WORKSPACE_SESSION_STORAGE_KEY,
} from './workspace-persistence'

const ROOT_PATH = '/Users/tester/projects/persist-a'

function createTestStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key) ?? null : null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, String(value))
    },
  }
}

function setWorkspaceSessionStorage(rawValue: unknown) {
  window.localStorage.setItem(
    WORKSPACE_SESSION_STORAGE_KEY,
    JSON.stringify(rawValue),
  )
}

function setWorkspaceSessionStorageRaw(rawValue: string) {
  window.localStorage.setItem(WORKSPACE_SESSION_STORAGE_KEY, rawValue)
}

function readWorkspaceSessionStorage() {
  return window.localStorage.getItem(WORKSPACE_SESSION_STORAGE_KEY)
}

function clearWorkspaceSessionStorage() {
  window.localStorage.removeItem(WORKSPACE_SESSION_STORAGE_KEY)
}

describe('workspace-persistence', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createTestStorage(),
    })
    clearWorkspaceSessionStorage()
  })

  it('creates and loads snapshot from workspace state', () => {
    const workspaceId = createWorkspaceId(ROOT_PATH)
    let state = addOrFocusWorkspace(createEmptyWorkspaceState(), ROOT_PATH).state
    state = updateWorkspaceSession(state, workspaceId, (session) => ({
      ...session,
      activeFile: 'src/main.ts',
      activeSpec: '_sdd/spec/main.md',
      expandedDirectories: ['src', 'src'],
      fileLastLineByPath: {
        'src/main.ts': 12,
      },
      watchModePreference: 'polling',
    }))

    const snapshot = createWorkspaceSessionSnapshot(state)
    saveWorkspaceSessionSnapshot(snapshot)
    const loadedSnapshot = loadWorkspaceSessionSnapshot()

    expect(loadedSnapshot).not.toBeNull()
    expect(loadedSnapshot?.schemaVersion).toBe(WORKSPACE_SESSION_SCHEMA_VERSION)
    expect(loadedSnapshot?.workspaceOrder).toEqual([workspaceId])
    expect(loadedSnapshot?.activeWorkspaceId).toBe(workspaceId)
    expect(loadedSnapshot?.workspacesById[workspaceId]).toEqual({
      rootPath: ROOT_PATH,
      workspaceKind: 'local',
      remoteWorkspaceId: null,
      remoteProfile: null,
      remoteConnectionState: null,
      remoteErrorCode: null,
      activeFile: 'src/main.ts',
      activeSpec: '_sdd/spec/main.md',
      expandedDirectories: ['src'],
      fileLastLineByPath: {
        'src/main.ts': 12,
      },
      watchModePreference: 'polling',
    })
  })

  it('persists and restores remote workspace metadata in schema v2', () => {
    const workspaceId = 'remote-workspace-a'
    let state = addOrFocusWorkspace(createEmptyWorkspaceState(), 'remote://remote-workspace-a', {
      workspaceId,
      sessionOptions: {
        workspaceKind: 'remote',
        remoteWorkspaceId: 'remote-workspace-a',
        remoteConnectionState: 'degraded',
        remoteErrorCode: 'TIMEOUT',
        remoteProfile: {
          workspaceId: 'remote-workspace-a',
          host: 'example.com',
          user: 'tester',
          remoteRoot: '/repo',
          port: 2222,
        },
      },
    }).state
    state = updateWorkspaceSession(state, workspaceId, (session) => ({
      ...session,
      activeFile: 'src/main.ts',
    }))

    const snapshot = createWorkspaceSessionSnapshot(state)
    saveWorkspaceSessionSnapshot(snapshot)
    const loadedSnapshot = loadWorkspaceSessionSnapshot()

    expect(loadedSnapshot?.workspacesById[workspaceId]).toEqual({
      rootPath: 'remote://remote-workspace-a',
      workspaceKind: 'remote',
      remoteWorkspaceId: 'remote-workspace-a',
      remoteProfile: {
        workspaceId: 'remote-workspace-a',
        host: 'example.com',
        user: 'tester',
        remoteRoot: '/repo',
        port: 2222,
      },
      remoteConnectionState: 'degraded',
      remoteErrorCode: 'TIMEOUT',
      activeFile: 'src/main.ts',
      activeSpec: null,
      expandedDirectories: [],
      fileLastLineByPath: {},
      watchModePreference: 'auto',
    })
  })

  it('defaults watch mode preference to auto when missing in persisted payload', () => {
    const workspaceId = createWorkspaceId(ROOT_PATH)
    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
      activeWorkspaceId: workspaceId,
      workspaceOrder: [workspaceId],
      workspacesById: {
        [workspaceId]: {
          rootPath: ROOT_PATH,
          activeFile: 'src/main.ts',
          activeSpec: null,
          expandedDirectories: [],
          fileLastLineByPath: {},
        },
      },
    })

    const loadedSnapshot = loadWorkspaceSessionSnapshot()
    expect(loadedSnapshot?.workspacesById[workspaceId]?.watchModePreference).toBe(
      'auto',
    )
  })

  it('returns null when snapshot schema version is unsupported', () => {
    setWorkspaceSessionStorage({
        schemaVersion: 999,
        activeWorkspaceId: null,
        workspaceOrder: [],
        workspacesById: {},
      })

    expect(loadWorkspaceSessionSnapshot()).toBeNull()
  })

  it('loads schema v1 snapshot with remote defaults for backward compatibility', () => {
    const workspaceId = createWorkspaceId(ROOT_PATH)
    setWorkspaceSessionStorage({
      schemaVersion: 1,
      activeWorkspaceId: workspaceId,
      workspaceOrder: [workspaceId],
      workspacesById: {
        [workspaceId]: {
          rootPath: ROOT_PATH,
          activeFile: 'src/legacy.ts',
          activeSpec: null,
          expandedDirectories: ['src'],
          fileLastLineByPath: { 'src/legacy.ts': 7 },
          watchModePreference: 'auto',
        },
      },
    })

    const loadedSnapshot = loadWorkspaceSessionSnapshot()
    expect(loadedSnapshot?.schemaVersion).toBe(WORKSPACE_SESSION_SCHEMA_VERSION)
    expect(loadedSnapshot?.workspacesById[workspaceId]).toMatchObject({
      rootPath: ROOT_PATH,
      workspaceKind: 'local',
      remoteWorkspaceId: null,
      remoteProfile: null,
      remoteConnectionState: null,
      remoteErrorCode: null,
      activeFile: 'src/legacy.ts',
    })
  })

  it('returns null when stored snapshot is invalid JSON', () => {
    setWorkspaceSessionStorageRaw('{invalid')
    expect(loadWorkspaceSessionSnapshot()).toBeNull()
  })

  it('ignores invalid workspace entries and returns null when no valid workspace remains', () => {
    setWorkspaceSessionStorage({
        schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
        activeWorkspaceId: '/invalid',
        workspaceOrder: ['/invalid'],
        workspacesById: {
          '/invalid': {
            rootPath: '',
            activeFile: 'src/main.ts',
            expandedDirectories: ['src'],
            fileLastLineByPath: { 'src/main.ts': 3 },
          },
        },
      })

    expect(loadWorkspaceSessionSnapshot()).toBeNull()
  })

  it('limits persisted file last line map to max entry count', () => {
    const workspaceId = createWorkspaceId(ROOT_PATH)
    const fileLastLineByPath = Object.fromEntries(
      Array.from(
        { length: MAX_PERSISTED_FILE_LAST_LINE_ENTRIES + 3 },
        (_value, index) => [`file-${index + 1}.ts`, index + 1],
      ),
    )
    let state = addOrFocusWorkspace(createEmptyWorkspaceState(), ROOT_PATH).state
    state = updateWorkspaceSession(state, workspaceId, (session) => ({
      ...session,
      fileLastLineByPath,
    }))

    const snapshot = createWorkspaceSessionSnapshot(state)
    const persistedMap = snapshot.workspacesById[workspaceId]?.fileLastLineByPath
    expect(persistedMap).toBeDefined()
    expect(Object.keys(persistedMap ?? {})).toHaveLength(
      MAX_PERSISTED_FILE_LAST_LINE_ENTRIES,
    )
    expect(persistedMap?.['file-4.ts']).toBe(4)
    expect(persistedMap?.['file-1.ts']).toBeUndefined()
  })

  it('clears persisted snapshot', () => {
    setWorkspaceSessionStorage({
      schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
    })
    clearWorkspaceSessionSnapshot()
    expect(readWorkspaceSessionStorage()).toBeNull()
  })
})
