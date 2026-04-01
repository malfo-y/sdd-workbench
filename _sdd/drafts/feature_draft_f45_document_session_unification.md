# Feature Draft: F45 문서 세션 통합 + Draft 기반 Spec View

> **Date**: 2026-04-01
> **Source**: user request ("파일 편집/저장/undo/redo/spec-code 전환 복잡도 완화")

---

<!-- spec-update-todo-input-start -->

# Part 1: Spec Patch Draft

> This patch can be copy-pasted into the corresponding spec sections,
> or used as input for the `spec-update-todo` skill.

# Spec Update Input

**Date**: 2026-04-01
**Author**: Codex
**Target Spec**: `_sdd/spec/code-editor/`, `_sdd/spec/spec-viewer/`, `_sdd/spec/workspace-and-file-tree/`, `_sdd/spec/appearance-and-navigation/`
**Spec Update Classification**: Improvement + Refactor

## Background & Motivation Updates

### Update: markdown 편집/저장/뷰 전환 복잡도 원인 명시

**Target Section**: `_sdd/spec/code-editor/overview.md` > `1. 목적`, `_sdd/spec/workspace-and-file-tree/overview.md` > `4.1 세션과 active file`

현재 runtime state는 `activeFile`, `activeSpec`, `activeFileContent`, `activeSpecContent`, `isDirty`가 서로 다른 책임을 나눠 가진다. 이 구조는 기능 자체는 동작하지만, 동일 markdown 문서를 Code 탭과 Spec 탭에서 번갈아 다룰 때 "저장 전 draft", "저장된 내용", "rendered spec", "외부 변경 충돌"이 별도 흐름으로 흩어져 이해와 유지보수 비용을 높인다.

이번 변경은 "문서 하나를 두 뷰로 본다"는 관점을 canonical contract로 승격해, undo/redo 같은 에디터 내부 기능은 CodeMirror에 남기고, renderer는 문서 draft/save/conflict lifecycle만 책임지도록 정리한다.

## Design Changes

### Change: runtime document session source of truth 도입

**Target Section**: `_sdd/spec/code-editor/contracts.md` > `2. 핵심 타입`, `_sdd/spec/code-editor/contracts.md` > `3. 전역 불변식`

text/markdown 파일의 runtime source of truth를 경로별 `document session`으로 통합한다.

예상 canonical 개념:

- `DocumentSaveState = 'clean' | 'dirty' | 'saving' | 'conflict'`
- `WorkspaceDocumentSession = { relativePath, savedContent, draftContent, saveState, readState, preview metadata, externalChange metadata }`
- `activeFile`와 `activeSpec`는 계속 navigation pointer로 유지하되, 텍스트 내용 lifecycle은 path-keyed document session이 담당한다.

핵심 규칙:

1. undo/redo stack은 editor-local state이며 workspace session source of truth가 아니다.
2. dirty 여부는 가능한 한 `draftContent !== savedContent` 또는 `saveState`에서 파생한다.
3. `isDirty`가 남아야 한다면 transitional compatibility field로만 유지하고, canonical decision source는 document session으로 이동한다.
4. runtime draft/session cache는 앱 재시작 persistence의 기본 범위에 포함하지 않는다.

### Change: 동일 markdown 파일의 Code/Spec 뷰는 같은 draft text를 공유

**Target Section**: `_sdd/spec/spec-viewer/overview.md` > `2. 사용자 가시 동작`, `_sdd/spec/spec-viewer/overview.md` > `4.4 scroll과 문맥 유지`, `_sdd/spec/appearance-and-navigation/overview.md` > `4.1 레이아웃과 탭`

동일 경로의 markdown 파일이 active code 문서이자 active spec 문서일 때, Spec 탭은 마지막 저장본이 아니라 현재 draft를 렌더한다.

예상 사용자 가시 동작:

- markdown를 Code 탭에서 수정한 뒤 저장하지 않아도 Spec 탭에서 수정 중인 내용이 즉시 보인다.
- Spec 탭에서 다시 Code 탭으로 돌아와도 같은 draft를 계속 편집한다.
- 탭 전환 자체는 저장/redo/undo를 트리거하지 않는다.
- explicit `Go to Source` / `Go to Spec` 이동은 기존 navigation highlight contract를 유지하되, 문서 내용은 동일 draft session을 참조한다.

### Change: 저장/외부 변경/가드 로직을 save-state contract로 일원화

**Target Section**: `_sdd/spec/code-editor/overview.md` > `4.1 편집과 저장`, `_sdd/spec/workspace-and-file-tree/overview.md` > `4.1 세션과 active file`, `_sdd/spec/appearance-and-navigation/overview.md` > `2. 사용자 가시 동작`

현재의 confirm/banner/dirty 예외 처리를 `saveState` 중심으로 정리한다.

정책:

- `clean`: 저장본과 draft가 같다. 외부 변경 감지 시 자동 refresh 가능
- `dirty`: 저장 전 draft가 있다. 외부 변경 감지 시 자동 refresh 금지, conflict 진입 후보
- `saving`: 저장 중이다. 중복 저장과 경쟁 watch refresh를 억제한다.
- `conflict`: dirty 상태에서 외부 디스크 변경이 감지되었다. 사용자가 reload/discard/keep draft 중 명시적 선택을 해야 한다.

Guard 적용 대상:

- 파일 전환
- 워크스페이스 전환/닫기
- active dirty file rename/delete
- external change reload

### Change: rendered spec 검색/복사/코멘트는 현재 draft render 기준으로 동작

**Target Section**: `_sdd/spec/spec-viewer/contracts.md` > `Part 1: Navigation Rules`, `_sdd/spec/spec-viewer/contracts.md` > `Part 2: Search Rules`

동일 markdown path가 draft 상태일 때, Spec Viewer의 rendered DOM은 draft content에서 생성된다. 따라서 다음 기능도 같은 render 기준을 공유한다.

- spec search
- rendered selection copy payload
- `Add Comment`
- `Go to Source`

line anchor와 exact offset contract 자체는 유지하되, same-path markdown draft가 존재하면 raw source baseline도 draft text 기준으로 계산한다.

## New Features

### Feature: F45 문서 세션 통합 + Draft 기반 Spec View

**Priority**: High
**Category**: Editing Architecture / UX Stability
**Target Component**: Workspace State, Code Editor, Spec Viewer, App Shell
**Target Section**: `_sdd/spec/code-editor/overview.md` > `3. 핵심 상태와 source of truth`, `_sdd/spec/spec-viewer/overview.md` > `3. 핵심 상태와 source of truth`

**Description**:
문서 편집 상태를 경로별 document session으로 통합하고, 같은 markdown 파일의 Code/Spec 탭이 동일 draft를 보도록 바꾼다. 이로써 runtime 책임을 "editor-local undo/redo"와 "app-level save/conflict/navigation state"로 선명히 분리한다.

**Acceptance Criteria**:
- [ ] text/markdown 문서는 runtime document session에서 `savedContent`, `draftContent`, `saveState`를 함께 관리한다.
- [ ] 동일 markdown 파일에서 Code 탭 수정 후 Spec 탭으로 전환하면 저장하지 않은 변경이 렌더된 spec에 즉시 반영된다.
- [ ] Code/Spec 탭 전환만으로 draft가 초기화되거나 저장되지 않는다.
- [ ] 저장 성공 시 draft와 saved content가 동기화되고 `saveState='clean'`으로 복귀한다.
- [ ] dirty 상태의 외부 파일 변경은 자동 reload 대신 `conflict`로 전환되고, 사용자에게 명시적 선택 UI를 제공한다.
- [ ] 파일/워크스페이스 전환, rename/delete guard는 동일한 save-state contract를 사용한다.
- [ ] runtime draft/session cache는 기본적으로 앱 재시작 snapshot에 저장되지 않는다.

## Improvements

### Improvement: App shell의 dirty UX를 상태 의미 기반으로 단순화

**Target Section**: `_sdd/spec/appearance-and-navigation/overview.md` > `4.1 레이아웃과 탭`

App shell은 "dirty boolean이 켜져 있나" 대신 "현재 문서 세션이 어떤 save state인가"만 해석한다. 이로써 배너/confirm/탭 전환/외부 변경 응답이 한 vocabulary로 정리된다.

예상 개선점:

- dirty와 conflict를 분리해 사용자 설명이 정확해진다.
- rename/delete/close guard가 서로 다른 메시지와 예외 규칙으로 갈라지지 않는다.
- Spec 탭 전환 자체는 단순 view change로 다루고, 문서 lifecycle은 document session이 담당한다.

### Improvement: editor와 viewer의 역할 경계 재명시

**Target Section**: `_sdd/spec/code-editor/overview.md` > `8. 변경 시 주의점`, `_sdd/spec/spec-viewer/overview.md` > `8. 변경 시 주의점`

역할 경계:

- CodeMirror: selection, undo/redo, IME, editor-local history
- Workspace/App state: draft text, save lifecycle, external conflict, path-level routing
- Spec Viewer: draft 또는 saved markdown을 rendered projection으로 보여주는 consumer

이 원칙을 명시해, 이후 개선이 다시 editor 기능을 app state로 끌어올리는 방향으로 흐르지 않도록 한다.

## Failure Modes

| 시나리오 | 실패 시 | 사용자 가시성 | 처리 방안 |
|---|---|---|---|
| 저장 중 write 실패 | draft는 남아 있지만 저장본 갱신 실패 | save error banner + dirty/conflict 상태 유지 | `saveState`를 `dirty`로 되돌리고 draft 유지 |
| dirty 상태에서 외부 파일 변경 | 현재 draft와 디스크 내용이 갈라짐 | conflict 배너 또는 header status 표시 | 자동 reload 금지, 사용자가 reload/discard/keep draft 선택 |
| same-path markdown draft render 실패 | Spec 탭이 최신 draft를 렌더하지 못함 | spec panel read/render error | Code draft는 유지하고 Spec 쪽만 안전 fallback |
| file/workspace 전환 중 guard 누락 | draft 유실 가능 | confirm 누락 또는 잘못된 메시지 | 모든 전환 진입점을 save-state helper 하나로 통일 |
| search/comment action이 saved content를 계속 참조 | rendered spec와 source anchor가 어긋남 | jump/comment line mismatch | same-path draft render 시 raw source baseline도 draft 기준으로 재계산 |

## Notes

### Constraints

- 이번 범위의 핵심은 runtime state 정리이며, autosave는 포함하지 않는다.
- undo/redo 자체를 app-level state로 올리지 않는다.
- 앱 재시작 후 unsaved draft 복원은 기본 범위 밖이다.
- rendered spec 직접 편집은 다루지 않는다. Spec 탭은 계속 projection/view 역할을 유지한다.

### Recommended Migration Shape

- `activeFile` / `activeSpec` 포인터는 유지한다.
- content lifecycle만 document session으로 이동해 blast radius를 줄인다.
- `isDirty`는 필요하다면 임시 compatibility selector로 남기고 점진적으로 제거한다.

## Open Questions

- [ ] unsaved draft를 앱 재시작 후에도 복원할 것인가? 이번 draft는 **복원하지 않음**을 기본값으로 둔다.
- [ ] conflict UI를 배너만으로 둘지, header status chip까지 둘지? 이번 draft는 **배너 + 상태 텍스트** 정도를 권장한다.
- [ ] same-path markdown draft 상태에서 Spec search 결과를 즉시 재계산할지, 사용자가 다시 검색을 열 때만 갱신할지? 이번 draft는 **content 변경 시 현재 검색 상태를 reset 또는 재계산**하는 쪽을 권장한다.

<!-- spec-update-todo-input-end -->

---

# Part 2: Implementation Plan

## Overview

현재 편집 흐름의 복잡도는 기능 수보다 source of truth가 분산된 데서 온다. 이번 구현은 per-path document session을 도입해 text/markdown 문서의 draft/save/conflict lifecycle을 한곳으로 모으고, markdown의 Code/Spec 탭이 동일 draft를 공유하도록 정리한다.

핵심 목표는 두 가지다.

1. undo/redo, IME, selection은 계속 CodeMirror가 책임진다.
2. 저장/충돌/탭 전환/외부 변경은 app-level document session이 책임진다.

## Scope

### In Scope

- per-path runtime document session 모델 도입
- `saveState(clean/dirty/saving/conflict)` 기반 저장/외부 변경 contract
- markdown same-path Code/Spec 탭 draft 공유
- App shell guard/배너의 일관된 save-state 기반 정리
- 관련 unit/integration test 보강

### Out of Scope

- autosave
- 앱 재시작 후 unsaved draft 복원
- rendered spec 직접 편집
- multi-document tab UI
- CodeMirror undo stack를 renderer state에 영속화하는 작업

## Components

1. **Workspace State Layer**
   - active path pointer와 runtime document session의 경계를 정의한다.
2. **WorkspaceProvider Lifecycle**
   - read/select/save/watch/guard 흐름을 save-state contract로 통합한다.
3. **Code Editor Adapter**
   - draft text 변경을 parent에 전달하고 explicit reset만 수용한다.
4. **Spec Viewer Projection**
   - same-path markdown draft를 rendered spec으로 소비한다.
5. **App Shell Orchestration**
   - Code/Spec 탭, navigation, conflict banner, confirm guard를 연결한다.

## Implementation Phases

### Phase 1: State Contract Foundation

| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T1 | document session type과 transition helper 정의 | P0 | - | Workspace State |
| T2 | WorkspaceProvider read/save/watch/guard 흐름을 document session 기반으로 재배선 | P0 | T1 | Workspace Lifecycle |

### Phase 2: View Adapter Preparation

| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T3 | CodeEditorPanel draft bridge + explicit reset semantics 추가 | P0 | T1 | Code Editor |
| T4 | Spec Viewer가 same-path draft markdown 갱신을 안전하게 반영하도록 정리 | P1 | T1 | Spec Viewer |

### Phase 3: App Shell Integration

| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T5 | App에서 shared document session을 Code/Spec 탭과 conflict UX에 연결 | P0 | T2, T3, T4 | App Shell |

### Phase 4: Verification & Regression

| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T6 | 모델/에디터/뷰어/앱 회귀 테스트 정리 | P0 | T2, T3, T4, T5 | Test |

## Task Details

### Task T1: document session type과 transition helper 정의

**Component**: Workspace State
**Priority**: P0
**Type**: Refactor

**Description**:
workspace runtime state에 문서 lifecycle 전용 contract를 추가한다. `activeFile` / `activeSpec`는 navigation pointer로 유지하고, 텍스트 내용/dirty/conflict는 path-keyed document session에서 관리하도록 정리한다.

**Acceptance Criteria**:
- [ ] text/markdown 문서용 runtime document session 타입이 정의된다.
- [ ] `clean/dirty/saving/conflict` save-state vocabulary가 canonical contract로 문서화된다.
- [ ] dirty 여부는 document session 기준으로 계산되거나, 기존 `isDirty`가 남는 경우 derived compatibility로 제한된다.
- [ ] workspace model 테스트가 path 분리, save-state transition, active pointer 유지 규칙을 검증한다.
- [ ] snapshot persistence 테스트가 runtime draft/session이 저장 대상이 아님을 보장한다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- document session 타입/selector/transition helper 추가
- [M] `src/workspace/workspace-model.test.ts` -- save-state 및 path-scoped session 회귀 테스트
- [M] `src/workspace/workspace-persistence.test.ts` -- runtime draft/session 비영속성 회귀 테스트

**Technical Notes**:
- 별도 helper 파일 추출 여부는 implementation 재량이지만, canonical contract는 workspace state layer에 있어야 한다.
- persistence schema bump는 기본적으로 필요하지 않다. draft/session은 runtime-only cache로 둔다.

**Dependencies**: 없음

---

### Task T2: WorkspaceProvider read/save/watch/guard 흐름을 document session 기반으로 재배선

**Component**: Workspace Lifecycle
**Priority**: P0
**Type**: Refactor

**Description**:
`loadWorkspaceFile`, `loadWorkspaceSpec`, `saveFile`, watch event 처리, rename/delete/close guard를 document session 기반으로 정리한다. duplicate `activeFileContent` / `activeSpecContent` 흐름을 줄이고, 외부 변경은 `saveState`에 따라 refresh 또는 conflict로 처리한다.

**Acceptance Criteria**:
- [ ] 파일 읽기 시 해당 path document session이 생성 또는 갱신된다.
- [ ] markdown same-path 선택 시 code/spec가 별도 content source를 복제하지 않는다.
- [ ] save 성공 시 `savedContent`와 `draftContent`가 동기화되고 conflict가 해제된다.
- [ ] dirty 상태의 watch event는 auto-refresh 대신 conflict로 전환된다.
- [ ] 파일 전환/워크스페이스 전환/rename/delete guard가 공통 save-state 판단을 사용한다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- load/save/watch/guard 흐름 재배선

**Technical Notes**:
- 기존 public hook shape를 한 번에 크게 바꾸기보다, 내부 selector/helper를 먼저 도입하고 외부 API는 점진적으로 정리하는 편이 안전하다.
- `activeSpec`를 완전히 제거하지 않고 navigation pointer로 유지하는 방향이 현재 blast radius를 줄인다.

**Dependencies**: T1

---

### Task T3: CodeEditorPanel draft bridge + explicit reset semantics 추가

**Component**: Code Editor
**Priority**: P0
**Type**: Feature

**Description**:
CodeEditorPanel이 "편집기 내부 상태"와 "문서 draft source of truth" 사이의 adapter 역할을 하도록 조정한다. 편집 중에는 draft text를 parent로 올리고, reload/discard/select-file 같은 명시적 상황에서만 editor document를 reset한다.

**Acceptance Criteria**:
- [ ] 편집 중 현재 draft text를 parent에 전달하는 callback이 존재한다.
- [ ] upstream saved/draft reset이 필요한 경우만 editor document를 교체한다.
- [ ] `Cmd+S`는 현재 editor document를 그대로 save callback에 전달한다.
- [ ] 단순 탭 전환이나 unrelated prop update가 editor reset을 일으키지 않는다.
- [ ] 테스트가 draft emission, save callback, explicit reset, dirty derivation의 기본 회귀를 검증한다.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx` -- draft bridge 및 reset semantics 정리
- [M] `src/code-editor/code-editor-panel.test.tsx` -- draft emission/reset/save 회귀 테스트

**Technical Notes**:
- undo/redo stack 자체를 parent state로 동기화하지 않는다.
- reset trigger의 shape는 token/version/cause 중 무엇이든 가능하지만, "명시적 reset만 허용" 원칙은 유지해야 한다.

**Dependencies**: T1

---

### Task T4: Spec Viewer가 same-path draft markdown 갱신을 안전하게 반영하도록 정리

**Component**: Spec Viewer
**Priority**: P1
**Type**: Improvement

**Description**:
same-path markdown draft가 갱신될 때 Spec Viewer가 저장본이 아닌 current draft render를 사용하도록 정리한다. 동일 path에서 content만 바뀌는 경우 search/highlight/source-action 상태가 stale해지지 않도록 최소 reset rule을 정의한다.

**Acceptance Criteria**:
- [ ] same-path markdown draft 갱신 시 rendered spec이 즉시 업데이트된다.
- [ ] search result / focus / highlight가 stale content를 참조하지 않는다.
- [ ] `Go to Source`, copy payload, comment entry가 current draft line mapping을 사용한다.
- [ ] 관련 panel 테스트가 same-path content update 시나리오를 검증한다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- same-path content update handling 정리
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- draft-backed render/search/source-action 회귀 테스트

**Technical Notes**:
- line anchor / exact offset contract는 유지하되, same-path raw source baseline만 draft로 교체한다.
- search reset과 full recompute 중 어느 전략을 택할지는 implementation 재량이지만 stale state를 남기면 안 된다.

**Dependencies**: T1

---

### Task T5: App에서 shared document session을 Code/Spec 탭과 conflict UX에 연결

**Component**: App Shell
**Priority**: P0
**Type**: Feature

**Description**:
App이 code panel과 spec panel에 넘기는 content source를 shared document session 기준으로 정리하고, conflict banner/confirm guard/message를 새 contract에 맞춰 통합한다. 사용자가 markdown를 편집한 뒤 Spec 탭으로 이동하고 다시 Code 탭으로 돌아오는 흐름을 first-class 시나리오로 고정한다.

**Acceptance Criteria**:
- [ ] App이 active code document와 active spec document에 대해 올바른 draft/saved selector를 사용한다.
- [ ] 동일 markdown 파일에서 Code edit -> Spec view -> Code return 흐름이 저장 없이 유지된다.
- [ ] conflict 상태에서 적절한 reload/discard/keep draft UX가 노출된다.
- [ ] 기존 navigation highlight / tab auto-switch contract가 유지된다.
- [ ] integration test가 markdown draft 공유, save 후 clean 복귀, external conflict banner 흐름을 검증한다.

**Target Files**:
- [M] `src/App.tsx` -- shared content selector 및 conflict UX wiring
- [M] `src/App.css` -- conflict/status affordance 스타일 보강
- [M] `src/App.test.tsx` -- markdown draft 공유 및 conflict integration 회귀 테스트

**Technical Notes**:
- 기존 `activeTab`/jump token/scroll retention 구조는 유지하되, content source만 document session selector로 바꾸는 방향이 안전하다.
- App이 editor undo/redo를 직접 관장하지 않도록 책임 경계를 지켜야 한다.

**Dependencies**: T2, T3, T4

---

### Task T6: 모델/에디터/뷰어/앱 회귀 테스트 정리

**Component**: Test
**Priority**: P0
**Type**: Test

**Description**:
새 contract가 실제로 단순해졌는지 검증하려면 모델 단위 테스트와 앱 통합 테스트를 함께 고정해야 한다. 특히 "same-path markdown draft 공유"와 "dirty external change -> conflict"를 핵심 golden path로 만든다.

**Acceptance Criteria**:
- [ ] workspace model 테스트가 save-state transition을 검증한다.
- [ ] code editor 테스트가 parent draft bridge와 explicit reset만 검증한다.
- [ ] spec viewer 테스트가 same-path content refresh 회귀를 검증한다.
- [ ] App 통합 테스트가 markdown edit/save/conflict 골든 패스를 검증한다.
- [ ] 기존 dirty-guard / navigation test가 의미상 유지되거나 새 contract에 맞게 정리된다.

**Target Files**:
- [M] `src/workspace/workspace-model.test.ts` -- state transition 회귀
- [M] `src/workspace/workspace-persistence.test.ts` -- runtime-only draft exclusion 회귀
- [M] `src/code-editor/code-editor-panel.test.tsx` -- editor bridge 회귀
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- draft-backed render 회귀
- [M] `src/App.test.tsx` -- end-to-end markdown draft/conflict 회귀

**Technical Notes**:
- 동일 시나리오를 unit/integration에 중복 복사하기보다, 각 레이어가 보장해야 하는 최소 contract를 분리해 검증하는 편이 유지보수에 유리하다.

**Dependencies**: T2, T3, T4, T5

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | Sequential (conflicts) |
|---|---:|---:|---|
| Phase 1 | 2 | 1 | `T1 -> T2`는 workspace state contract를 공유하므로 순차 진행이 안전하다. |
| Phase 2 | 2 | 2 | `T3`와 `T4`는 각각 `src/code-editor/*`, `src/spec-viewer/*` write set이라 병렬 가능하다. |
| Phase 3 | 1 | 1 | `T5`는 `App.tsx`에서 state/view wiring을 통합하므로 앞선 작업 결과를 모두 받아야 한다. |
| Phase 4 | 1 | 1 | `T6`는 전체 regression fix-up 단계다. |

권장 병렬 분할:

1. Worker A: `T3` Code Editor
2. Worker B: `T4` Spec Viewer
3. Main path: `T1 -> T2` 완료 후 `T5` 통합

## Risks and Mitigations

- **Risk**: workspace-context blast radius가 크다.
  - **Mitigation**: `activeFile` / `activeSpec` pointer contract는 유지하고, content lifecycle만 먼저 이동한다.
- **Risk**: editor reset 타이밍이 잘못 잡히면 undo history가 예상보다 자주 사라진다.
  - **Mitigation**: explicit reset cause/token을 두고, 저장 성공/파일 선택/사용자 discard 외에는 reset을 금지한다.
- **Risk**: same-path content update에서 Spec search/highlight가 stale DOM을 붙잡을 수 있다.
  - **Mitigation**: same-path markdown content 변경 시 search/highlight reset 또는 recompute rule을 명시적으로 넣는다.
- **Risk**: conflict UX를 과하게 넓히면 구현이 무거워진다.
  - **Mitigation**: 첫 단계는 banner + clear action set으로 제한하고, richer merge UX는 후속 범위로 남긴다.

## Open Questions

- [ ] `isDirty`를 완전히 제거할지, transition 기간 동안 selector alias로 남길지? 이번 계획은 **selector alias 유지 후 점진 제거**를 기본값으로 둔다.
- [ ] same-path markdown draft 변경 시 Spec search를 자동 recompute할지 reset할지? 이번 계획은 **reset 우선, 필요 시 recompute 확장**을 권장한다.
- [ ] conflict 상태에서 "keep draft"를 누른 뒤 저장 시 overwrite를 허용할지, 한 번 더 확인할지? 이번 계획은 **명시적 저장 시 overwrite 허용, 메시지 보강**을 기본값으로 둔다.
