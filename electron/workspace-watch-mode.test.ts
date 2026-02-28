import { describe, expect, it } from 'vitest'
import { resolveWorkspaceWatchMode } from './workspace-watch-mode'

describe('workspace-watch-mode', () => {
  it('resolves to native in auto mode without remote hint', () => {
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

  it('does not infer remote status from /Volumes path anymore', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Volumes/mounted/project-a',
        watchModePreference: 'auto',
      }),
    ).toEqual({
      watchMode: 'native',
      isRemoteMounted: false,
      resolvedBy: 'heuristic',
    })
  })

  it('resolves to polling when remote hint is true', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Users/tester/project-a',
        watchModePreference: 'auto',
        isRemoteMountedHint: true,
      }),
    ).toEqual({
      watchMode: 'polling',
      isRemoteMounted: true,
      resolvedBy: 'heuristic',
    })
  })

  it('forces native mode when override is native', () => {
    expect(
      resolveWorkspaceWatchMode({
        rootPath: '/Users/tester/project-a',
        watchModePreference: 'native',
        isRemoteMountedHint: true,
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
})
