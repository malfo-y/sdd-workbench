import { describe, expect, it } from 'vitest'
import { resolveWorkspaceWatchMode } from './workspace-watch-mode'

describe('workspace-watch-mode', () => {
  it('resolves /Volumes workspace to polling in auto mode', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Volumes/remote/project-a',
        watchModePreference: 'auto',
      }),
    ).toEqual({
      watchMode: 'polling',
      isRemoteMounted: true,
      resolvedBy: 'heuristic',
    })
  })

  it('resolves non-/Volumes workspace to native in auto mode', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Users/tester/project-a',
        watchModePreference: 'auto',
      }),
    ).toEqual({
      watchMode: 'native',
      isRemoteMounted: false,
      resolvedBy: 'heuristic',
    })
  })

  it('forces native mode when override is native', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Volumes/remote/project-a',
        watchModePreference: 'native',
      }),
    ).toEqual({
      watchMode: 'native',
      isRemoteMounted: true,
      resolvedBy: 'override',
    })
  })

  it('forces polling mode when override is polling', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Users/tester/project-a',
        watchModePreference: 'polling',
      }),
    ).toEqual({
      watchMode: 'polling',
      isRemoteMounted: false,
      resolvedBy: 'override',
    })
  })

  it('normalizes path separators before applying /Volumes heuristic', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '\\Volumes\\remote\\project-a',
        watchModePreference: 'auto',
      }),
    ).toEqual({
      watchMode: 'polling',
      isRemoteMounted: true,
      resolvedBy: 'heuristic',
    })
  })

  it('resolves to polling when isRemoteMountedHint is true', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Users/tester/bc-cloud/remote-project',
        watchModePreference: 'auto',
        isRemoteMountedHint: true,
      }),
    ).toEqual({
      watchMode: 'polling',
      isRemoteMounted: true,
      resolvedBy: 'heuristic',
    })
  })

  it('resolves to native when isRemoteMountedHint is false and path is local', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Users/tester/project-a',
        watchModePreference: 'auto',
        isRemoteMountedHint: false,
      }),
    ).toEqual({
      watchMode: 'native',
      isRemoteMounted: false,
      resolvedBy: 'heuristic',
    })
  })

  it('respects native override even when isRemoteMountedHint is true', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Users/tester/bc-cloud/remote-project',
        watchModePreference: 'native',
        isRemoteMountedHint: true,
      }),
    ).toEqual({
      watchMode: 'native',
      isRemoteMounted: true,
      resolvedBy: 'override',
    })
  })
})
