import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import {
  setGitMarkers,
  gitMarkersField,
  GitDotMarker,
  type GitMarkerKind,
} from './cm6-git-gutter'

// ---------------------------------------------------------------------------
// gitMarkersField — StateField reducer logic
// ---------------------------------------------------------------------------

describe('gitMarkersField', () => {
  it('초기값은 빈 Map', () => {
    const state = EditorState.create({ extensions: [gitMarkersField] })
    expect(state.field(gitMarkersField).size).toBe(0)
  })

  it('setGitMarkers effect로 마커 주입', () => {
    let state = EditorState.create({ extensions: [gitMarkersField] })
    const markers = new Map<number, GitMarkerKind>([
      [1, 'added'],
      [3, 'modified'],
    ])
    state = state.update({ effects: [setGitMarkers.of(markers)] }).state
    expect(state.field(gitMarkersField).get(1)).toBe('added')
    expect(state.field(gitMarkersField).get(3)).toBe('modified')
  })

  it('새 Map으로 교체됨 (merge 아님)', () => {
    let state = EditorState.create({ extensions: [gitMarkersField] })
    // First injection
    state = state.update({
      effects: [setGitMarkers.of(new Map<number, GitMarkerKind>([[1, 'added']]))],
    }).state
    expect(state.field(gitMarkersField).get(1)).toBe('added')

    // Second injection with different data — line 1 must disappear
    state = state.update({
      effects: [setGitMarkers.of(new Map<number, GitMarkerKind>([[2, 'modified']]))],
    }).state
    expect(state.field(gitMarkersField).has(1)).toBe(false)
    expect(state.field(gitMarkersField).get(2)).toBe('modified')
  })

  it('effect 없는 트랜잭션은 기존 Map 유지', () => {
    let state = EditorState.create({
      doc: 'hello\nworld',
      extensions: [gitMarkersField],
    })
    const markers = new Map<number, GitMarkerKind>([[2, 'added']])
    state = state.update({ effects: [setGitMarkers.of(markers)] }).state

    // Transaction without a setGitMarkers effect (e.g. cursor move)
    state = state.update({ selection: { anchor: 0 } }).state
    expect(state.field(gitMarkersField).get(2)).toBe('added')
  })

  it('빈 Map 주입 시 마커 전체 제거', () => {
    let state = EditorState.create({ extensions: [gitMarkersField] })
    state = state.update({
      effects: [
        setGitMarkers.of(
          new Map<number, GitMarkerKind>([
            [1, 'added'],
            [2, 'modified'],
          ]),
        ),
      ],
    }).state
    expect(state.field(gitMarkersField).size).toBe(2)

    // Clear all markers
    state = state.update({
      effects: [setGitMarkers.of(new Map())],
    }).state
    expect(state.field(gitMarkersField).size).toBe(0)
  })

  it('multiple setGitMarkers effects in one transaction — first one wins', () => {
    let state = EditorState.create({ extensions: [gitMarkersField] })
    const first = new Map<number, GitMarkerKind>([[1, 'added']])
    const second = new Map<number, GitMarkerKind>([[5, 'modified']])
    state = state.update({
      effects: [setGitMarkers.of(first), setGitMarkers.of(second)],
    }).state
    // The reducer returns on the first matching effect it encounters
    expect(state.field(gitMarkersField).get(1)).toBe('added')
    expect(state.field(gitMarkersField).has(5)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// GitDotMarker — toDOM class name and eq() behaviour
// ---------------------------------------------------------------------------

describe('GitDotMarker toDOM', () => {
  it('added 마커 DOM className', () => {
    const marker = new GitDotMarker('added')
    const node = marker.toDOM() as HTMLElement
    expect(node.tagName).toBe('SPAN')
    expect(node.className).toBe('cm-git-dot cm-git-added')
  })

  it('modified 마커 DOM className', () => {
    const marker = new GitDotMarker('modified')
    const node = marker.toDOM() as HTMLElement
    expect(node.tagName).toBe('SPAN')
    expect(node.className).toBe('cm-git-dot cm-git-modified')
  })

  it('eq() — 같은 kind는 equal', () => {
    const a = new GitDotMarker('added')
    const b = new GitDotMarker('added')
    expect(a.eq(b)).toBe(true)
  })

  it('eq() — 다른 kind는 not equal', () => {
    const a = new GitDotMarker('added')
    const m = new GitDotMarker('modified')
    expect(a.eq(m)).toBe(false)
  })
})
