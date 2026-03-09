# Feature Draft: F34/F35 Markdown source `Go to Spec` + cross-panel navigation highlight

**Date**: 2026-03-08
**Author**: user + Codex
**Status**: 📋 Planned
**Target Spec**: `_sdd/spec/main.md` + 하위 문서

---

# Part 1: Spec Patch Draft

> 이 패치는 해당 스펙 섹션에 복사-붙여넣기하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-03-08
**Author**: user + Codex
**Target Spec**: `_sdd/spec/main.md` + 하위 문서

## New Features

### Feature: F34 Markdown source `Go to Spec`
**Priority**: Medium  
**Category**: Navigation UX / Markdown Mapping  
**Target Component**: `CodeEditorPanel`, `SpecViewerPanel`, `App`  
**Target Section**: `_sdd/spec/main.md` > `현재 상태 요약`; `_sdd/spec/sdd-workbench/product-overview.md` > `MVP 범위`, `기능 커버리지`; `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`, `1.4 Code Editor Layer`, `1.5 Spec Viewer Layer`; `_sdd/spec/sdd-workbench/contract-map.md` > `2. 링크/경로 해석 규칙`, `5. 마커 매핑 규칙`; `_sdd/spec/sdd-workbench/appendix.md` > `기능 이력`, `상세 수용 기준`

**Description**:  
`.md` 파일을 Code 탭에서 보고 있을 때, 현재 커서/선택 line에서 rendered spec의 대응 block으로 이동하는 `Go to Spec` 액션을 추가한다. 사용자는 code viewer context menu에서 `Go to Spec`를 실행할 수 있고, App은 Spec 탭으로 전환한 뒤 해당 markdown source line에 대응되는 rendered block을 best-effort로 찾아 스크롤한다. 이 기능은 semantic spec linking이 아니라 **같은 markdown 파일의 raw source line -> rendered spec block** 매핑만 다룬다.

**Acceptance Criteria**:

- [ ] active file이 `.md`이고 일반 텍스트 편집 모드일 때만 Code Viewer context menu에 `Go to Spec` 액션이 노출된다.
- [ ] `Go to Spec`는 현재 `selectionRange.startLine`을 navigation anchor로 사용하며, multi-line selection은 `startLine`만 사용한다.
- [ ] 액션 실행 시 App은 같은 markdown 파일의 Spec 탭으로 전환하고, 대응되는 rendered block을 `data-source-line` 기반 best-effort mapping으로 스크롤한다.
- [ ] exact matching block이 없더라도 nearest rendered markdown block으로 안전하게 degrade 되며, 액션 실패 시 앱이 조용히 깨지지 않는다.
- [ ] non-markdown file, image preview, preview unavailable 상태에서는 `Go to Spec`가 노출되지 않거나 비활성화되어야 한다.

**Technical Notes**:

- 범위는 `Code(.md raw source) -> Spec(rendered)` 이동만 포함한다.
- 일반 코드 파일에서 의미적으로 관련 spec section을 찾는 기능은 이번 범위 밖이다.
- mapping은 raw markdown line 기준이며, F32/F33에서 도입된 `data-source-line`, `data-source-line-start/end`, rendered block line mapping을 재사용한다.

**Dependencies**:

- F05 spec->code line jump
- F24 CodeMirror 6 기반 코드 에디터
- F32 스펙 뷰어 코멘트/source action line anchor 정밀도 개선
- F33 스펙 뷰어 exact source offset anchor MVP

### Feature: F35 Cross-panel navigation target highlight
**Priority**: Medium  
**Category**: Navigation UX / Visual Feedback  
**Target Component**: `App`, `CodeEditorPanel`, `SpecViewerPanel`  
**Target Section**: `_sdd/spec/main.md` > `현재 상태 요약`; `_sdd/spec/sdd-workbench/product-overview.md` > `MVP 범위`, `기능 커버리지`; `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`, `1.4 Code Editor Layer`, `1.5 Spec Viewer Layer`; `_sdd/spec/sdd-workbench/contract-map.md` > `2. 링크/경로 해석 규칙`, `5. 마커 매핑 규칙`; `_sdd/spec/sdd-workbench/appendix.md` > `기능 이력`, `상세 수용 기준`

**Description**:  
스펙이나 코드로 line/block navigation이 일어났을 때, 사용자가 도착 위치를 즉시 인지할 수 있도록 임시 highlight를 추가한다. spec-origin `Go to Source`, F34 `Go to Spec`, 그리고 App이 명시적으로 line jump를 수행하는 코드 이동 경로는 line/block-based temporary highlight를 사용한다. highlight는 search highlight나 comment marker와 분리된 별도 시각 상태로 동작해야 한다.

**Acceptance Criteria**:

- [ ] spec-origin `Go to Source` 또는 동등한 code navigation이 일어나면 Code Viewer에서 대상 line이 임시 highlight 된다.
- [ ] F34 `Go to Spec`이 일어나면 Spec Viewer에서 대상 rendered block이 임시 highlight 된다.
- [ ] highlight는 짧은 시간 후 자동 해제되며, 같은 line/block으로 연속 이동해도 다시 트리거될 수 있다.
- [ ] search highlight(`is-spec-search-match/focus`)와 comment marker, exact offset selection은 기존 동작을 유지하고 navigation highlight는 additive class/state로만 도입된다.
- [ ] 단순 파일 선택이나 탭 전환만으로는 highlight가 발생하지 않고, 명시적인 navigation action에서만 동작한다.

**Technical Notes**:

- Code Viewer는 line-level 임시 decoration 또는 동등한 line background highlight를 사용한다.
- Spec Viewer는 block-level 임시 class(`navigation target`)를 사용한다.
- highlight duration은 짧은 고정값(예: 1.5~2초)을 기본값으로 하며, persistence는 범위 밖이다.

**Dependencies**:

- F05 spec->code line jump
- F30 스펙 뷰어 검색 block highlight
- F24 CodeMirror 6 기반 코드 에디터
- F34 Markdown source `Go to Spec`

## Improvements

### Improvement: cross-panel navigation state를 App 공용 contract로 승격
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`; `_sdd/spec/sdd-workbench/contract-map.md` > `2. 링크/경로 해석 규칙`  
**Current State**: App은 code jump request는 가지고 있지만 spec-side navigation request/highlight state는 없다.  
**Proposed**: App이 code/spec 각각에 대해 line/block navigation token을 전달하는 additive request contract를 관리하도록 확장한다.  
**Reason**: F34/F35가 panel-local 상태가 아니라 cross-panel navigation orchestration에 속하기 때문이다.

### Improvement: navigation highlight와 search highlight를 분리
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.4 Code Editor Layer`, `1.5 Spec Viewer Layer`; `_sdd/spec/sdd-workbench/contract-map.md` > `5. 마커 매핑 규칙`  
**Current State**: Spec Viewer에는 search block highlight가 있지만 navigation highlight는 없다. Code Viewer는 jump selection만 있고 line highlight contract가 없다.  
**Proposed**: navigation 전용 temporary highlight state/class를 별도로 추가한다.  
**Reason**: 검색/코멘트/selection과 navigation feedback를 분리해야 회귀 위험이 낮다.

## Component Changes

### Component Change: Code Editor context menu에 markdown-only `Go to Spec` 추가
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.4 Code Editor Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- Code Viewer context menu action 목록에 markdown source 전용 `Go to Spec`를 추가한다.
- action은 현재 `selectionRange.startLine`을 App으로 전달한다.
- non-markdown / image preview / unavailable preview 상태에서는 노출하지 않거나 비활성화한다.

### Component Change: Spec Viewer block navigation/highlight request 지원
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.5 Spec Viewer Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- Spec Viewer가 external navigation request(lineNumber + token)를 받아 대응 block으로 스크롤할 수 있게 한다.
- 대응 block에 temporary navigation highlight class를 적용하고 자동 해제한다.
- mapping은 existing rendered source line collection + nearest fallback 규칙을 재사용한다.

### Component Change: Code Viewer line navigation highlight 지원
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.4 Code Editor Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- existing jump request 경로에 line highlight state를 추가한다.
- exact offset jump가 있는 경우에도 line-level navigation highlight를 병행할 수 있게 한다.
- repeated navigation to same line을 token 기반으로 재트리거할 수 있게 한다.

## Notes

### Scope Boundary

- 이번 범위는 **같은 markdown 파일 내부의 raw source line <-> rendered spec block** navigation만 다룬다.
- 일반 코드 파일에서 의미적 spec section을 찾는 기능은 포함하지 않는다.
- highlight는 temporary UX feedback만 포함하며, 앱 재시작 복원이나 사용자 설정은 포함하지 않는다.
- exact token highlight는 범위 밖이며 block/line 기반 highlight만 다룬다.

### Context

현재는 spec에서 code로 가는 경로는 있지만 반대 방향인 markdown source -> rendered spec 경로가 없다. 또한 jump가 성공해도 도착 지점을 한눈에 찾기 어려워, navigation highlight를 같이 넣는 편이 체감 UX 개선이 크다. F34와 F35는 App navigation state, Spec Viewer mapping, Code Viewer jump path를 공유하므로 한 묶음으로 계획하는 것이 구현/테스트 경로를 단순화한다.

### Open Questions

- [ ] `Go to Spec`의 진입점은 이번 MVP에서 context menu만 지원한다. toolbar 버튼/단축키 추가는 후속 범위로 둔다.
- [ ] multi-line selection의 spec 이동 anchor는 `startLine`을 기본값으로 둔다. 중간 line 선택 전략은 이번 범위 밖이다.
- [ ] highlight duration은 구현 직전 최종 확정이 필요하다. draft 기본값은 `1600ms`다.

---

# Part 2: Implementation Plan

# Implementation Plan: F34/F35 Markdown source `Go to Spec` + cross-panel navigation highlight

## Overview

F34/F35는 markdown raw source와 rendered spec 사이의 왕복 navigation을 대칭으로 맞추고, 도착 지점 인지성을 높이는 작업이다. 핵심은 App이 cross-panel navigation request를 공용 state로 관리하고, Code Viewer는 markdown source line을 Spec Viewer로 넘기며, Spec/Code Viewer는 각각 temporary block/line highlight를 적용하는 것이다.

## Scope

### In Scope

- `.md` active file 전용 `Go to Spec` context menu action
- Code Viewer `selectionRange.startLine` -> Spec Viewer rendered block navigation
- Spec Viewer block temporary highlight
- Code Viewer line temporary highlight
- App-level navigation request/token orchestration
- panel/app regression test 보강

### Out of Scope

- 일반 코드 파일에서 semantic spec section 검색
- exact token/word highlight
- highlight duration 사용자 설정
- 앱 재시작 후 navigation highlight 복원
- toolbar/hotkey 기반 `Go to Spec`

## Components

1. **Navigation Contract Layer**: App-level spec/code navigation request state
2. **Code-to-Spec Action Layer**: Code Viewer markdown source `Go to Spec`
3. **Spec Navigation Layer**: rendered block scroll + temporary highlight
4. **Code Highlight Layer**: Code jump line highlight + exact jump 공존
5. **Validation Layer**: panel/app integration regression

## Implementation Phases

### Phase 1: Contracts and Entry Point
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | App navigation request/state contract 추가 | P0 | - | Navigation Contract Layer |
| 2 | Code Viewer markdown-only `Go to Spec` 액션 추가 | P0 | 1 | Code-to-Spec Action Layer |

### Phase 2: Spec-side Navigation and Highlight
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | Spec Viewer line->block navigation request 처리 | P0 | 1, 2 | Spec Navigation Layer |
| 4 | Spec Viewer temporary navigation highlight 추가 | P1 | 3 | Spec Navigation Layer |

### Phase 3: Code-side Highlight and Integration
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 5 | Code Viewer line navigation highlight 추가 | P1 | 1 | Code Highlight Layer |
| 6 | App wiring 통합(spec->code + code->spec) | P0 | 2, 3, 4, 5 | Navigation Contract Layer |

### Phase 4: Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 7 | panel/app regression test 보강 | P0 | 2, 3, 4, 5, 6 | Validation Layer |

## Task Details

### Task 1: App navigation request/state contract 추가
**Component**: Navigation Contract Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
App이 Code/Spec 양쪽 navigation을 orchestration할 수 있도록 panel 간 request contract를 추가한다. 기존 `CodeViewerJumpRequest` 패턴은 유지하되, Spec Viewer용 line navigation request와 양쪽 highlight re-trigger용 token/state를 additive하게 도입한다.

**Acceptance Criteria**:

- [ ] App이 Spec Viewer로 line navigation request를 전달할 수 있다.
- [ ] App이 Code Viewer/Spec Viewer highlight re-trigger를 위한 token 또는 동등한 재실행 신호를 관리한다.
- [ ] 기존 file open, selection, code jump contract는 backward-compatible하게 유지된다.
- [ ] 단순 파일 선택/탭 전환은 navigation request를 생성하지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- spec/code navigation request state, token orchestration, markdown file navigation wiring
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- new spec navigation request prop 수용
- [M] `src/code-editor/code-editor-panel.tsx` -- existing jump/highlight contract 수용

**Technical Notes**:

- code jump와 spec jump가 서로 다른 request shape를 가져도 되지만, `lineNumber + token` 공통 필드는 맞추는 편이 낫다.
- navigation highlight는 search state나 selection state와 분리해야 한다.

**Dependencies**: -

### Task 2: Code Viewer markdown-only `Go to Spec` 액션 추가
**Component**: Code-to-Spec Action Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
Code Viewer context menu에 markdown source 전용 `Go to Spec` 액션을 추가한다. 이 액션은 active file이 `.md`일 때만 노출되고, 현재 `selectionRange.startLine`을 App으로 전달해 rendered spec navigation을 시작한다.

**Acceptance Criteria**:

- [ ] active file이 `.md`이고 일반 텍스트 편집 모드일 때만 `Go to Spec`가 context menu에 노출된다.
- [ ] action은 `selectionRange.startLine`을 App callback으로 전달한다.
- [ ] non-markdown, image preview, preview unavailable 상태에서는 action이 노출되지 않거나 비활성화된다.
- [ ] 기존 context menu 액션(Add Comment/Copy*)은 회귀하지 않는다.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx` -- context menu action 추가 + markdown-only guard
- [M] `src/code-editor/code-editor-panel.test.tsx` -- markdown/non-markdown action 노출 회귀
- [M] `src/App.tsx` -- `onRequestGoToSpec` callback wiring

**Technical Notes**:

- selection이 없더라도 CM6 현재 커서 line이 `selectionRange`로 들어오므로 별도 cursor API를 직접 읽지 않는 쪽이 단순하다.
- UX 일관성을 위해 action label은 `Go to Spec`로 고정한다.

**Dependencies**: 1

### Task 3: Spec Viewer line->block navigation request 처리
**Component**: Spec Navigation Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
Spec Viewer가 App에서 전달된 markdown source line navigation request를 받아 대응 rendered block을 찾고 스크롤할 수 있도록 확장한다. mapping은 existing `data-source-line` block과 nearest fallback 규칙을 재사용한다.

**Acceptance Criteria**:

- [ ] Spec Viewer가 external navigation request(lineNumber + token)를 받으면 대응 block을 찾는다.
- [ ] exact matching `data-source-line` block이 있으면 그 block으로 이동한다.
- [ ] exact block이 없으면 nearest rendered block으로 degrade 한다.
- [ ] inactive spec/no content 상태에서는 안전하게 no-op 한다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- external line navigation request 처리 + block lookup
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- line->block scroll mapping regression
- [M] `src/App.tsx` -- spec navigation request prop 전달

**Technical Notes**:

- 이미 search/comment mapping에 쓰는 rendered source line collection을 재사용하면 중복 로직을 줄일 수 있다.
- navigation request는 search state와 무관하게 동작해야 한다.

**Dependencies**: 1, 2

### Task 4: Spec Viewer temporary navigation highlight 추가
**Component**: Spec Navigation Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:  
Spec Viewer에 navigation 도착 block을 잠시 강조하는 temporary highlight state를 추가한다. search highlight, comment marker와는 별도의 class/state로 관리한다.

**Acceptance Criteria**:

- [ ] line navigation request가 성공하면 대응 block에 temporary highlight class가 적용된다.
- [ ] 같은 block으로 연속 이동해도 token 기반으로 highlight가 재트리거된다.
- [ ] highlight는 일정 시간 후 자동 해제된다.
- [ ] search highlight/comment marker와 동시에 존재해도 기존 동작을 깨지 않는다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- temporary highlight state/timer/class toggle
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- highlight apply/clear/retrigger regression
- [M] `src/App.css` -- spec navigation highlight style

**Technical Notes**:

- search highlight class(`is-spec-search-match/focus`)와 navigation highlight class는 분리해야 한다.
- timer cleanup은 activeSpecPath 변경/unmount 시 정리해야 한다.

**Dependencies**: 3

### Task 5: Code Viewer line navigation highlight 추가
**Component**: Code Highlight Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:  
Code Viewer가 explicit jump/navigation이 일어났을 때 대상 line을 temporary highlight 하도록 확장한다. exact offset selection이 있더라도 line-level highlight를 함께 적용할 수 있어야 한다.

**Acceptance Criteria**:

- [ ] existing code jump request가 수행되면 대상 line에 temporary highlight가 적용된다.
- [ ] exact offset jump가 있는 경우에도 line highlight가 함께 보인다.
- [ ] highlight는 일정 시간 후 자동 해제된다.
- [ ] 반복 jump는 token 기반으로 highlight를 재트리거할 수 있다.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx` -- CM6 line highlight extension/state/effect 추가
- [M] `src/code-editor/code-editor-panel.test.tsx` -- line highlight apply/clear/exact jump 공존 regression
- [M] `src/App.css` -- code navigation highlight style

**Technical Notes**:

- selection 자체와 navigation highlight를 동일 상태로 취급하면 exact offset selection UX가 흔들릴 수 있으므로 분리하는 편이 안전하다.
- CM6 decoration/effect path는 기존 jump token 흐름과 연계하는 편이 단순하다.

**Dependencies**: 1

### Task 6: App wiring 통합(spec->code + code->spec)
**Component**: Navigation Contract Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
F34/F35를 App 수준에서 통합한다. Code Viewer의 `Go to Spec`, existing spec-origin `Go to Source`, markdown line link/comment jump 등 explicit navigation 경로가 공용 highlight/navigation state를 쓰도록 정리한다.

**Acceptance Criteria**:

- [ ] `Go to Spec` 실행 시 App이 Spec 탭으로 전환하고 Spec navigation request를 전달한다.
- [ ] spec-origin `Go to Source`는 기존 jump를 유지하면서 code highlight도 트리거한다.
- [ ] existing code line jump paths(line links/comment jumps)는 가능한 범위에서 동일 code highlight 경로를 재사용한다.
- [ ] 단순 active file 변경이나 markdown 파일 선택만으로 highlight가 오작동하지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- cross-panel navigation orchestration + request dispatch 정리
- [M] `src/App.test.tsx` -- integrated `Go to Spec`/`Go to Source`/highlight regression
- [M] `src/code-editor/code-editor-panel.tsx` -- App wiring 소비 정리
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- App wiring 소비 정리

**Technical Notes**:

- code->spec는 active markdown file와 rendered spec file이 같은 경로라는 가정을 기본값으로 둔다.
- future semantic spec linking과 혼동되지 않도록 naming은 `Go to Spec` + markdown-only guard로 제한한다.

**Dependencies**: 2, 3, 4, 5

### Task 7: panel/app regression test 보강
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:  
새 navigation 경로와 temporary highlight는 App/Code/Spec 세 군데가 동시에 맞아야 하므로 panel 단위와 app 통합 테스트를 함께 보강한다.

**Acceptance Criteria**:

- [ ] Code Viewer panel test가 markdown-only `Go to Spec` 노출/비노출을 검증한다.
- [ ] Spec Viewer panel test가 external line navigation request, nearest fallback, temporary highlight를 검증한다.
- [ ] Code Viewer panel test가 explicit jump 시 line highlight 적용/재트리거를 검증한다.
- [ ] App integration test가 `.md` raw source `Go to Spec` -> Spec 탭 전환 -> block highlight, spec-origin `Go to Source` -> Code 탭 line highlight를 검증한다.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.test.tsx` -- `Go to Spec` + code line highlight regression
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- spec navigation request + block highlight regression
- [M] `src/App.test.tsx` -- cross-panel integration regression

**Technical Notes**:

- highlight auto-clear는 fake timers 또는 짧은 timeout wait로 검증할 수 있다.
- App integration은 raw markdown `.md` 파일 하나만으로도 충분히 고정 가능하다.

**Dependencies**: 2, 3, 4, 5, 6

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| raw markdown line과 rendered block이 1:1이 아닌 구조(table/list/blockquote)에서 exact target이 없을 수 있음 | High | exact block 우선 + nearest rendered block fallback 규칙을 명시적으로 고정 |
| navigation highlight와 search/comment highlight가 충돌할 수 있음 | High | 별도 class/state로 분리하고 search/comment 로직을 건드리지 않는 additive 방식 채택 |
| CM6 selection과 line highlight를 같은 상태로 섞으면 jump UX가 불안정해질 수 있음 | Medium | exact selection과 temporary line highlight를 분리된 extension/state로 유지 |
| `Go to Spec` entry point가 많아지면 UX가 산만해질 수 있음 | Low | MVP는 context menu only로 제한 |

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | Sequential (conflicts) |
|-------|-------------|--------------|------------------------|
| 1 | 2 | 1 | 1 |
| 2 | 2 | 1 | 1 |
| 3 | 2 | 1 | 1 |
| 4 | 1 | 1 | 0 |

## Open Questions

- [ ] F34/F35를 하나의 draft 파일로 묶은 이유는 App navigation state, Spec line mapping, Code jump/highlight contract를 공유하기 때문이다. 별도 분리보다 구현 경로가 더 명확하다고 판단했다.
- [ ] `Go to Spec`를 toolbar나 hotkey까지 확장할지는 후속 UX 판단이다. draft 기본값은 context menu only다.
- [ ] code highlight를 현재 line 전체 배경으로 할지 gutter + line 배경 조합으로 할지는 구현 직전 CM6 styling 비용을 보고 최종 확정할 수 있다. draft 기본값은 line background 중심이다.

## Model Recommendation

`Sonnet` → `gpt-5.3-codex` (`reasoning effort: high`)
