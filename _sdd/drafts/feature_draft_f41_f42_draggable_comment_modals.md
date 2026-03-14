# Feature Draft: F41/F42 Draggable Comment Modals

**Date**: 2026-03-13
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft
**Features**: F41 View Comments draggable modal, F42 shared draggable comment modals

---

<!-- spec-update-todo-input-start -->
# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-03-13
**Author**: Codex
**Target Spec**: main.md

## Background & Motivation Updates

### Background Update: comment modal이 작업 대상을 가리는 문제
**Target Section**: `_sdd/spec/main.md` > `§1 Background & Motivation`
**Change Type**: Problem Statement / Motivation

**Current**: comments workflow는 Add Comment, Add Global Comments, View Comments, Export Comments 모달을 제공하지만, 각 모달은 중앙 고정 배치라 사용자가 코드/스펙의 가려지는 영역을 피해서 재배치할 수 없다.
**Proposed**: comment modal family에 사용자가 직접 위치를 조정할 수 있는 draggable interaction을 도입해, 코드/스펙을 보면서 모달을 옆으로 옮겨두는 작업 흐름을 지원한다.
**Reason**: comment review/export는 원문 문맥을 계속 보면서 진행되는 경우가 많아, 중앙 고정 모달은 맥락 확인을 반복적으로 방해한다.

## Design Changes

### Design Change: draggable comment modal positioning contract
**Priority**: High
**Target Section**: `_sdd/spec/main.md` > `§2 Core Design`
**Change Type**: Logic Flow / Design Rationale

**Description**:
comment modal은 기본적으로 centered 상태로 열리되, 사용자가 헤더 drag handle을 잡아 viewport 안에서 재배치할 수 있어야 한다. drag는 modal body 전체가 아니라 header/drag handle에서만 시작되어야 하며, textarea selection, checkbox toggle, button click, internal scrolling과 충돌하지 않아야 한다.

공통 구현은 existing modal wheel passthrough와 독립된 shared drag-position hook/utility로 정리하고, `View Comments`에서 먼저 적용한 뒤 Add Comment, Add Global Comments, Export Comments까지 같은 positioning contract를 사용하도록 확장한다.

**Code Reference**: `[src/code-comments/comment-list-modal.tsx:CommentListModal]`, `[src/code-comments/comment-editor-modal.tsx:CommentEditorModal]`, `[src/code-comments/global-comments-modal.tsx:GlobalCommentsModal]`, `[src/code-comments/export-comments-modal.tsx:ExportCommentsModal]`, `[src/modal-wheel-passthrough.ts:useModalBackgroundWheelPassthrough]`

**Impact**:
- comment modal 공통 헤더 구조와 CSS contract가 필요하다.
- modal open/close, `Escape`, backdrop, wheel passthrough는 그대로 유지되어야 한다.
- drag 시작 영역과 interactive child 영역의 이벤트 경계를 테스트로 고정해야 한다.

## New Features

### Feature: F41 View Comments draggable modal
**Priority**: High
**Category**: UI/UX
**Target Component**: `src/code-comments/comment-list-modal.tsx`
**Target Section**: `_sdd/spec/main.md` > `§4 Component Details > Comments / Export`; `_sdd/spec/comments-and-export/overview.md` > `2. 사용자 가시 동작`

**Description**:
`View Comments` 모달은 헤더를 drag handle로 제공하고, 사용자가 모달 위치를 자유롭게 옮길 수 있어야 한다. 기본 열림 위치는 centered 상태를 유지하되, 드래그 이후에는 현재 열림 세션 동안 사용자가 놓은 위치를 유지한다.

**Acceptance Criteria**:
- [ ] `View Comments` 모달 상단에 drag 가능한 header 영역이 존재한다.
- [ ] 사용자는 header를 pointer drag하여 모달을 viewport 안에서 이동할 수 있다.
- [ ] drag 중에도 모달은 닫히지 않고, 내부 리스트/버튼/checkbox 동작은 회귀하지 않는다.
- [ ] 모달이 viewport 바깥으로 완전히 사라지지 않도록 위치가 clamp된다.
- [ ] `Escape` 닫기, backdrop 존재, internal scroll, wheel passthrough는 기존과 동일하게 유지된다.
- [ ] 모달을 닫고 다시 열면 centered 기본 위치로 다시 열린다.

**Technical Notes**:
- drag start는 `h2` 텍스트 전체보다 별도 header wrapper/handle에서 받는 편이 안전하다.
- pointer events 기반 구현을 우선하고, text selection 방지를 위해 drag 중 `user-select: none` 처리를 고려한다.
- `View Comments`는 리스트 길이가 길기 때문에 기존 내부 스크롤과 drag start 영역이 명확히 분리되어야 한다.

**Dependencies**:
- 기존 F12.2 View Comments edit/delete modal

### Feature: F42 shared draggable comment modals
**Priority**: High
**Category**: UI/UX
**Target Component**: `src/code-comments/comment-editor-modal.tsx`, `src/code-comments/global-comments-modal.tsx`, `src/code-comments/export-comments-modal.tsx`
**Target Section**: `_sdd/spec/main.md` > `§4 Component Details > Comments / Export`; `_sdd/spec/comments-and-export/contracts.md` > `8. modal positioning rules (new)`

**Description**:
`Add Comment`, `Add Global Comments`, `Export Comments`도 `View Comments`와 동일한 draggable positioning contract를 사용해야 한다. 각 modal은 기존 크기/내용은 유지하되, 공통 drag hook과 공통 header 스타일을 사용해 일관된 이동 경험을 제공한다.

**Acceptance Criteria**:
- [ ] `Add Comment`, `Add Global Comments`, `Export Comments`, `View Comments`가 같은 drag interaction 규칙을 사용한다.
- [ ] drag는 modal header에서만 시작되고, textarea/fieldset/button/input interaction은 drag start로 오인되지 않는다.
- [ ] 각 modal의 기존 width, max-height, form submit, warning/status message, autofocus behavior는 유지된다.
- [ ] shared drag utility 또는 hook이 도입되어 중복 pointer logic을 modal별로 복제하지 않는다.
- [ ] 최소 modal unit tests + app integration tests에서 drag behavior와 기존 close/submit flow가 함께 검증된다.

**Technical Notes**:
- 공통 utility는 viewport clamp, initial centered position 계산, drag delta 추적을 함께 담당해야 한다.
- reopen 시 마지막 위치 persistence는 이번 범위에서 제외하고, 매번 centered로 시작하는 단순한 계약을 유지한다.
- 향후 remote connect modal 등 다른 dialog로 확장 가능하되, 이번 범위는 comment modal family로 제한한다.

**Dependencies**:
- F41 draggable interaction contract 확정

## Improvements

### Improvement: comment modal header semantics 정리
**Priority**: Medium
**Target Section**: `_sdd/spec/comments-and-export/contracts.md` > `8. modal positioning rules (new)`
**Current State**: comment modals는 제목과 메타 텍스트만 있고, drag handle과 interactive 영역 경계가 문서화되어 있지 않다.
**Proposed**: comment modal header를 "title + optional meta + drag handle role" 구조로 명시하고, drag start 가능 영역과 불가능 영역(textarea / button / input)을 계약으로 고정한다.
**Reason**: shared draggable rollout 이후 modal마다 drag interaction이 어긋나지 않도록 UX contract를 문서 차원에서 고정하기 위함이다.

## Component Changes

### New Component: `src/modal-drag-position.ts`
**Target Section**: `_sdd/spec/main.md` > `§4 Component Details > Shared UI Utility`; `_sdd/spec/comments-and-export/contracts.md` > `8. modal positioning rules (new)`
**Purpose**: comment modal 공통 draggable positioning state / clamp / drag gesture 처리
**Input**: dialog element ref, handle element ref, open state, optional size margin
**Output**: inline style(`left/top/transform` 또는 동등한 positioning payload), drag state, bind handlers

**Planned Methods**:
- `useModalDragPosition(...)` - centered 초기값과 drag 이후 좌표를 관리
- `clampModalPosition(...)` - viewport bounds 안으로 좌표 제한
- `getCenteredModalPosition(...)` - 첫 열림 시 centered 좌표 계산

### Update Component: `src/code-comments/comment-list-modal.tsx`
**Target Section**: `_sdd/spec/main.md` > `§4 Component Details > Comments / Export`
**Change Type**: Enhancement

**Changes**:
- draggable header wrapper 추가
- shared drag hook 연결
- dialog positioning style 적용

### Update Component: `src/code-comments/comment-editor-modal.tsx`
**Target Section**: `_sdd/spec/main.md` > `§4 Component Details > Comments / Export`
**Change Type**: Enhancement

**Changes**:
- Add Comment modal에 공통 draggable header 적용

### Update Component: `src/code-comments/global-comments-modal.tsx`
**Target Section**: `_sdd/spec/main.md` > `§4 Component Details > Comments / Export`
**Change Type**: Enhancement

**Changes**:
- Add Global Comments modal에 공통 draggable header 적용

### Update Component: `src/code-comments/export-comments-modal.tsx`
**Target Section**: `_sdd/spec/main.md` > `§4 Component Details > Comments / Export`
**Change Type**: Enhancement

**Changes**:
- Export Comments modal에 공통 draggable header 적용

### Update Component: `src/App.css`
**Target Section**: `_sdd/spec/main.md` > `§8 Environment & Dependencies`; `_sdd/spec/comments-and-export/contracts.md` > `8. modal positioning rules (new)`
**Change Type**: Enhancement

**Changes**:
- draggable modal positioning style
- header cursor / drag handle style
- drag 중 text selection / pointer feedback style

## Usage Scenarios

### Scenario: View Comments를 옆으로 옮기고 코드 문맥을 보면서 검토
**Target Section**: `_sdd/spec/main.md` > `§5 Usage Guide & Expected Results`

**Steps**:
1. 사용자가 `View Comments`를 연다.
2. 모달이 화면 중앙에 열린다.
3. 사용자가 header를 잡고 모달을 오른쪽 아래로 옮긴다.
4. 뒤에 보이는 코드/스펙을 참고하며 comment edit/delete/export를 진행한다.

**Expected Result**:
- modal이 사용자가 놓은 위치에 머문다.
- 뒤쪽 코드/스펙 문맥을 계속 확인할 수 있다.
- 기존 comment action 흐름은 동일하게 동작한다.

### Scenario: Add Comment / Export Comments를 가리지 않는 위치로 이동
**Target Section**: `_sdd/spec/main.md` > `§5 Usage Guide & Expected Results`

**Steps**:
1. 사용자가 line comment 추가 또는 export flow를 시작한다.
2. modal이 선택 라인 근처를 가리면 header를 드래그해 옆으로 치운다.
3. textarea 입력, checkbox 선택, confirm/cancel을 그대로 수행한다.

**Expected Result**:
- drag 이후에도 textarea focus, submit, cancel, warning 표시가 정상 동작한다.
- interactive control 조작은 drag와 충돌하지 않는다.

## Notes

### Context
이번 draft는 사용자가 명시적으로 요청한 두 요구사항을 한 문서로 묶었다.
- 요구사항 1: `View Comments` 위치를 직접 옮길 수 있게 하기
- 요구사항 2: 같은 패턴을 comment modal 전반으로 확대하기

### Constraints
- `_sdd/spec/`는 이번 단계에서 수정하지 않는다. 이 draft는 `spec-update-todo` 입력용 초안이다.
- reopen 후 위치 기억(localStorage/session persistence)은 이번 범위에서 제외한다.
- remote connect modal, 일반 popover, file tree/context popover는 이번 범위에서 제외한다.

### Open Questions
- drag handle을 제목 바 전체로 둘지, 별도 grip affordance를 둘지 최종 시각 결정이 필요하다.
- viewport resize 중 clamp를 즉시 재적용할지, 다음 drag 시점에만 정렬할지는 구현 시 선택이 필요하다.
<!-- spec-update-todo-input-end -->

---

# Part 2: Implementation Plan

## Overview

이번 작업은 comment modal family에 draggable positioning을 도입하는 것이다. 구현은 두 단계로 본다.
1. `View Comments`에 먼저 drag contract를 적용해 interaction을 고정한다.
2. 같은 contract를 Add Comment, Add Global Comments, Export Comments로 확장한다.

핵심은 modal마다 pointer logic을 복제하지 않고, shared hook + shared CSS contract로 공통화하는 것이다.

## Scope

### In Scope
- comment modal 공통 draggable positioning utility / hook
- `View Comments` draggable header 도입
- `Add Comment`, `Add Global Comments`, `Export Comments` draggable rollout
- viewport clamp와 centered initial placement
- unit / integration test 보강

### Out of Scope
- 위치 persistence(localStorage, reopen restore, restart restore)
- remote connect modal 등 다른 non-comment modal 확장
- 기존 modal 정보 구조/버튼 레이아웃 대규모 리디자인
- keyboard-only repositioning 기능

## Components

1. **Modal Drag Utility Layer**: centered initial position, drag delta, viewport clamp
2. **Comment List Modal Layer**: View Comments 전용 drag 적용과 기존 목록 UX 공존
3. **Comment Form Modal Layer**: Add Comment / Global / Export modal 공통 rollout
4. **Validation Layer**: unit and app-level regression coverage

## Implementation Phases

### Phase 1: Shared foundation + View Comments
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | shared modal drag hook / clamp utility 추가 | P0 | - | Modal Drag Utility Layer |
| T2 | View Comments에 draggable header 적용 | P0 | T1 | Comment List Modal Layer |

### Phase 2: comment modal family rollout
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | Add Comment / Add Global Comments draggable 적용 | P1 | T1 | Comment Form Modal Layer |
| T4 | Export Comments draggable 적용 | P1 | T1 | Comment Form Modal Layer |

### Phase 3: validation and regression
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | drag utility + modal unit tests 추가 | P0 | T2,T3,T4 | Validation Layer |
| T6 | app-level integration regression 보강 | P0 | T2,T3,T4 | Validation Layer |

## Task Details

### Task T1: shared modal drag hook / clamp utility 추가
**Component**: Modal Drag Utility Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
comment modal에서 공통으로 사용할 draggable positioning utility를 추가한다. 첫 열림 시 centered position을 계산하고, drag 중 delta를 반영하며, viewport 밖으로 완전히 벗어나지 않도록 clamp한다.

**Acceptance Criteria**:
- [ ] shared hook 또는 utility가 생성된다.
- [ ] modal open 시 centered initial position을 계산한다.
- [ ] drag 중 `x/y` offset이 갱신된다.
- [ ] clamp 규칙으로 modal이 viewport 밖으로 사라지지 않는다.
- [ ] reopen 시 position이 초기 centered 상태로 재설정된다.

**Target Files**:
- [C] `src/modal-drag-position.ts` -- centered position, drag delta, clamp logic
- [C] `src/modal-drag-position.test.ts` -- clamp / initial position / reset tests
- [M] `src/App.css` -- draggable header / positioned modal base class

**Technical Notes**:
- `useModalBackgroundWheelPassthrough`와 책임을 분리한다.
- shared hook은 modal body가 아니라 drag handle ref를 별도로 받아야 interactive child와 충돌하지 않는다.
- positioning은 `position: fixed` 기반 `left/top` 또는 동등한 inline style 계약으로 관리하는 편이 clamp 계산이 단순하다.

**Dependencies**: -

---

### Task T2: View Comments에 draggable header 적용
**Component**: Comment List Modal Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`CommentListModal`에 draggable header를 추가하고, shared hook을 연결해 사용자가 모달 위치를 직접 옮길 수 있게 만든다. 기존 comment selection/edit/delete/export 동작은 유지한다.

**Acceptance Criteria**:
- [ ] `View Comments` 헤더 drag 시 modal 위치가 이동한다.
- [ ] comment row click, checkbox, textarea, delete/export button은 기존대로 동작한다.
- [ ] long list scroll과 drag handle이 충돌하지 않는다.
- [ ] modal reopen 시 centered 상태로 돌아간다.

**Target Files**:
- [M] `src/code-comments/comment-list-modal.tsx` -- draggable header, hook binding, positioned dialog style
- [M] `src/code-comments/comment-list-modal.test.tsx` -- drag start, clamp, existing action regression
- [M] `src/App.css` -- comment-list header / handle affordance styles

**Technical Notes**:
- header 전체를 drag 영역으로 쓸 경우 버튼이 없는 영역만 handle 역할을 하도록 구조를 분리하는 편이 안전하다.
- 기존 `comment-list-modal-header`를 확장해 title/meta와 handle affordance를 함께 수용한다.

**Dependencies**: T1

---

### Task T3: Add Comment / Add Global Comments draggable 적용
**Component**: Comment Form Modal Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
`CommentEditorModal`과 `GlobalCommentsModal`에 shared draggable contract를 적용한다. textarea autoFocus, submit, cancel, `Escape` close는 유지하면서 header drag만 추가한다.

**Acceptance Criteria**:
- [ ] `Add Comment` modal에서 drag와 textarea 입력이 함께 정상 동작한다.
- [ ] `Add Global Comments` modal에서 drag와 textarea 입력이 함께 정상 동작한다.
- [ ] submit / cancel / `Escape` 동작은 회귀하지 않는다.
- [ ] autofocus와 drag handle이 충돌하지 않는다.

**Target Files**:
- [M] `src/code-comments/comment-editor-modal.tsx` -- draggable header and shared hook wiring
- [M] `src/code-comments/comment-editor-modal.test.tsx` -- drag + save/cancel regression
- [M] `src/code-comments/global-comments-modal.tsx` -- draggable header and shared hook wiring
- [M] `src/code-comments/global-comments-modal.test.tsx` -- drag + save/cancel regression
- [M] `src/App.css` -- shared header style reuse

**Technical Notes**:
- form modal 둘 다 거의 같은 구조이므로 markup pattern을 최대한 맞추는 것이 유지보수에 유리하다.
- textarea drag 오인 방지를 위해 handle 영역은 textarea 위 별도 header block으로 분리한다.

**Dependencies**: T1

---

### Task T4: Export Comments draggable 적용
**Component**: Comment Form Modal Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
`ExportCommentsModal`에 draggable header를 추가한다. export target checkbox, warning text, estimated length, submit/cancel flow가 유지되어야 한다.

**Acceptance Criteria**:
- [ ] `Export Comments` modal이 header drag로 이동한다.
- [ ] checkbox toggle, textarea input, export submit/cancel이 drag와 충돌하지 않는다.
- [ ] clipboard disabled warning, no-target warning, no-pending warning이 기존처럼 표시된다.
- [ ] modal size/scroll 동작은 기존과 같거나 더 나빠지지 않는다.

**Target Files**:
- [M] `src/code-comments/export-comments-modal.tsx` -- draggable header and shared hook wiring
- [M] `src/code-comments/export-comments-modal.test.tsx` -- drag + checkbox/input/export regression
- [M] `src/App.css` -- export modal header style reuse

**Technical Notes**:
- fieldset과 checkbox 영역은 drag start 대상이 아니어야 한다.
- warning/status text 렌더와 drag state가 불필요하게 얽히지 않도록 form state와 position state를 분리한다.

**Dependencies**: T1

---

### Task T5: drag utility + modal unit tests 추가
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
shared utility와 각 modal 수준의 drag behavior를 자동 테스트로 고정한다. clamp, reset, interactive control collision 방지를 주요 검증 포인트로 삼는다.

**Acceptance Criteria**:
- [ ] shared hook의 centered 초기값 / clamp / reset이 테스트된다.
- [ ] `View Comments` drag 시작과 기존 action regression이 테스트된다.
- [ ] `Add Comment`, `Add Global Comments`, `Export Comments` drag + input interaction이 테스트된다.

**Target Files**:
- [M] `src/modal-drag-position.test.ts` -- utility behavior assertions
- [M] `src/code-comments/comment-list-modal.test.tsx` -- modal drag + action coexistence
- [M] `src/code-comments/comment-editor-modal.test.tsx` -- drag + form interaction
- [M] `src/code-comments/global-comments-modal.test.tsx` -- drag + form interaction
- [M] `src/code-comments/export-comments-modal.test.tsx` -- drag + fieldset/form interaction

**Technical Notes**:
- pointer event simulation이 애매하면 client position style 변경 검증으로도 충분하다.
- 현재 test environment 한계에 따라 `getBoundingClientRect` mocking이 필요할 수 있다.

**Dependencies**: T2, T3, T4

---

### Task T6: app-level integration regression 보강
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
`App.test.tsx`에서 comment modal entry points가 drag 가능해진 뒤에도 기존 open/close/export/global flow가 회귀하지 않는지 통합 검증을 추가한다.

**Acceptance Criteria**:
- [ ] `View Comments` open 후 drag 가능한 dialog가 렌더된다.
- [ ] `Add Global Comments` open/save flow가 drag 이후에도 유지된다.
- [ ] `Export Comments` open/export flow가 drag 이후에도 유지된다.
- [ ] 기존 banner / save / export assertions는 그대로 통과한다.

**Target Files**:
- [M] `src/App.test.tsx` -- comment modal open + drag-aware regression tests

**Technical Notes**:
- App-level tests는 exact pixel movement보다 "drag 가능한 구조가 연결되었는지"와 "flow regression이 없는지"에 집중한다.

**Dependencies**: T2, T3, T4

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| drag 시작 이벤트가 textarea/input까지 침범 | High | handle 영역을 header로 분리하고 interactive child는 drag target에서 제외 |
| fixed positioning 전환으로 기존 centered modal CSS가 깨짐 | Medium | shared base class를 추가하고 modal별 width/max-height는 기존 class에서 유지 |
| test 환경에서 pointer drag 재현이 불안정 | Medium | utility unit test + modal style assertion + app regression을 조합해 검증 |
| modal reopen 위치 계약이 모호 | Low | 이번 범위는 "reopen 시 centered reset"으로 문서에서 고정 |

## Open Questions

1. drag affordance를 텍스트 헤더만으로 충분히 전달할지, 별도 grip icon/label이 필요한지 디자인 결정이 필요하다.
2. viewport resize 시 즉시 재clamp를 할지, reopen 또는 다음 drag에서만 정리할지 구현 판단이 필요하다.

## Next Steps

1. 이 draft를 기준으로 `/spec-update-todo`를 실행하면 canonical spec에 planned 항목으로 반영할 수 있다.
2. 바로 구현까지 이어가려면 `/implementation`에서 Phase 1부터 진행하면 된다.

