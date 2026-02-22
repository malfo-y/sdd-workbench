# Feature Draft: F12.2 View Comments + Edit/Delete

**Date**: 2026-02-22
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-22
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F12.2 View Comments 패널(조회/편집/삭제)
**Priority**: High
**Category**: Core Feature
**Target Component**: `src/App.tsx`, `src/code-comments/*`, `src/workspace/workspace-context.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/01-overview.md` > `3.1 MVP 포함 범위`, `4.3 코멘트-LLM 흐름`; `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`, `1.6 Comment Domain Layer`; `/_sdd/spec/sdd-workbench/04-interfaces.md` > `1. 핵심 타입 계약`, `4. 코멘트/Export 정책 계약`

**Description**:
헤더에 `View Comments` 버튼을 추가하고, 현재 워크스페이스의 코멘트를 목록으로 조회/편집/삭제할 수 있는 모달을 제공한다. 변경 사항은 기존 source of truth(`comments.json`)에 즉시 반영되어 코드/문서 마커와 동기화되어야 한다.

**Acceptance Criteria**:
- [ ] `View Comments` 버튼 클릭 시 코멘트 목록 모달이 열린다.
- [ ] 목록 항목에는 최소 `relativePath`, `line range`, `createdAt`, `body`가 표시된다.
- [ ] 코멘트 본문 편집 후 저장 시 `comments.json`이 갱신되고 badge/count가 즉시 반영된다.
- [ ] 삭제 액션 실행 시 해당 코멘트가 제거되고 라인 badge/count가 즉시 갱신된다.
- [ ] `Delete Exported` 액션 실행 시 `exportedAt`가 있는 코멘트만 일괄 제거되고 pending 코멘트는 유지된다.
- [ ] 긴 코멘트는 접힘 상태(요약)로 시작하고, 확장해서 전체 본문 확인 가능하다.
- [ ] 저장/삭제 실패 시 배너로 오류를 안내하고 앱은 크래시하지 않는다.

**Technical Notes**:
- 코멘트 파일 포맷은 JSON 배열(`comments.json`)을 유지한다.
- 편집은 `body` 변경 중심으로 제한하고 `id`, `createdAt`, `anchor`는 유지한다.
- 정렬 규칙은 기존과 동일(`file ASC`, `startLine ASC`, `createdAt ASC`)을 유지한다.

**Dependencies**:
- F11/F11.1 코멘트 저장 및 마커 렌더 파이프라인

## Improvements

### Improvement: 코멘트 관리 UI 분리 컴포넌트 도입
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.6 Comment Domain Layer`
**Current State**: 코멘트 생성/내보내기 모달은 존재하지만 코멘트 관리 전용 UI가 없다.
**Proposed**: 조회/편집/삭제를 담당하는 `comment-list-modal`을 별도 컴포넌트로 분리한다.
**Reason**: App 컴포넌트 복잡도 상승을 막고 테스트 범위를 국소화하기 위함.

## Component Changes

### New Component: `src/code-comments/comment-list-modal.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.6 Comment Domain Layer`
**Purpose**: 코멘트 목록 조회/편집/삭제 UI
**Input**: `comments`, `isSaving`, `onUpdate`, `onDelete`, `onClose`
**Output**: 사용자 편집 액션 이벤트

**Planned Methods**:
- `CommentListModal()` - 목록/편집 상태/삭제 확인 UI

### Update Component: `src/App.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`
**Change Type**: Enhancement

**Changes**:
- `View Comments` 버튼 추가
- 목록 모달 open/close 및 저장/삭제 핸들러 추가
- 기존 `saveComments` 흐름 재사용

### Update Component: `src/code-comments/comment-types.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/04-interfaces.md` > `1. 핵심 타입 계약`
**Change Type**: Enhancement

**Changes**:
- 편집 시 body sanitize 규칙을 재사용하기 위한 helper 공개/정리

### Update Component: `src/App.css`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`
**Change Type**: Enhancement

**Changes**:
- 코멘트 목록 모달 레이아웃/스크롤/버튼 스타일 추가

## Notes

### Context
현재 코멘트는 생성 후 내보내기만 가능하고 수정/삭제가 불가능해 반복 작업에서 관리 비용이 발생한다. F12.2는 코멘트 lifecycle의 관리 단계를 보완한다.

### Constraints
- bulk edit는 초기 범위에서 제외한다.
- bulk delete는 `Delete Exported`(export 완료 코멘트 일괄 삭제) 1종만 포함한다.
- 코멘트 내용 변경 시 line range 재계산/anchor 재생성은 수행하지 않는다.

### Open Questions
- 현재 없음

---

# Part 2: Implementation Plan

## Overview

F12.2는 코멘트 읽기/수정/삭제를 위한 관리 UI를 추가한다. 핵심은 기존 `saveComments` 경로를 재사용해 데이터 일관성을 유지하면서 모달 UX를 안정적으로 제공하는 것이다.

## Scope

### In Scope
- `View Comments` 헤더 액션
- 코멘트 목록 모달(조회/확장/편집/삭제)
- `Delete Exported` 일괄 정리 액션(`exportedAt` 존재 코멘트 삭제)
- 저장/삭제 후 badge 및 marker 즉시 동기화
- 테스트 보강

### Out of Scope
- 코멘트 스레드/답글
- 다중 선택 일괄 작업
- 코멘트 relocation/anchor 재매핑

## Components

1. **Comment Management UI Layer**: 목록/편집/삭제 모달
2. **App Orchestration Layer**: 버튼/모달 상태/저장 호출
3. **Validation Layer**: 편집/삭제 회귀 검증

## Implementation Phases

### Phase 1: UI 골격
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | View Comments 모달 컴포넌트 추가 | P0 | - | Comment Management UI Layer |
| T2 | App 헤더 액션 + 모달 오케스트레이션 | P0 | T1 | App Orchestration Layer |

### Phase 2: 편집/삭제 기능
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | 코멘트 본문 편집 저장 플로우 구현 | P0 | T1,T2 | Comment Management UI Layer |
| T4 | 코멘트 삭제 플로우 구현 | P0 | T1,T2 | Comment Management UI Layer |

### Phase 3: 검증
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 단위/통합 테스트 추가 및 회귀 검증 | P0 | T3,T4 | Validation Layer |

## Task Details

### Task T1: View Comments 모달 컴포넌트 추가
**Component**: Comment Management UI Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
코멘트 목록 조회/요약/확장 렌더를 담당하는 모달 컴포넌트를 추가한다.

**Acceptance Criteria**:
- [ ] 코멘트 목록이 정렬된 상태로 표시된다.
- [ ] 긴 본문은 기본 축약, 사용자 확장 시 전체 노출된다.
- [ ] 모달 내부 스크롤이 가능하며 키보드 포커스가 유지된다.

**Target Files**:
- [C] `src/code-comments/comment-list-modal.tsx` -- 조회/확장 UI 구현
- [M] `src/App.css` -- 모달 레이아웃/리스트 스타일 추가

**Technical Notes**:
- 기존 `comment-modal` 디자인 토큰을 재사용해 스타일 일관성 유지.

**Dependencies**: -

---

### Task T2: App 헤더 액션 + 모달 오케스트레이션
**Component**: App Orchestration Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
헤더에 `View Comments` 액션을 추가하고 모달 open/close 상태를 관리한다.

**Acceptance Criteria**:
- [ ] active workspace가 없으면 버튼 비활성화된다.
- [ ] 버튼 클릭 시 모달이 열리고 닫힘 동작이 정상 동작한다.
- [ ] 기존 Export/Open Workspace 버튼 동작은 회귀하지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- 버튼/모달 상태/props wiring
- [M] `src/App.test.tsx` -- 버튼 노출/열림 테스트 추가

**Technical Notes**:
- F12.4 레이아웃 변경과 충돌을 줄이기 위해 action group class를 선제 도입 가능.

**Dependencies**: T1

---

### Task T3: 코멘트 본문 편집 저장 플로우 구현
**Component**: Comment Management UI Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
목록 항목별 `Edit` 액션으로 본문을 수정하고 `saveComments`로 저장한다.

**Acceptance Criteria**:
- [ ] 편집 모드 진입/취소/저장이 동작한다.
- [ ] 저장 시 sanitize 규칙이 적용된다.
- [ ] 저장 성공 시 목록과 badge가 즉시 갱신된다.

**Target Files**:
- [M] `src/code-comments/comment-list-modal.tsx` -- 편집 폼/상태 구현
- [M] `src/code-comments/comment-types.ts` -- body sanitize helper 재사용 정리
- [M] `src/App.tsx` -- 편집 저장 핸들러 구현

**Technical Notes**:
- `id` 기준 immutable update를 적용해 diff 안정성 확보.

**Dependencies**: T1, T2

---

### Task T4: 코멘트 삭제 플로우 구현
**Component**: Comment Management UI Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
목록 항목에서 개별 삭제 액션을 제공하고, `Delete Exported`로 export 완료 코멘트를 일괄 정리한다.

**Acceptance Criteria**:
- [ ] 삭제 확인 후 코멘트가 목록에서 제거된다.
- [ ] 저장 성공 시 코드/문서 마커 count가 감소/제거된다.
- [ ] `Delete Exported` 실행 시 `exportedAt`가 있는 코멘트만 제거되고 pending 코멘트는 유지된다.
- [ ] 실패 시 배너 에러를 표시하고 원래 목록 상태를 유지한다.

**Target Files**:
- [M] `src/code-comments/comment-list-modal.tsx` -- 삭제 액션/확인 UI
- [M] `src/App.tsx` -- 삭제 저장 핸들러 구현

**Technical Notes**:
- 개별 삭제/`Delete Exported` 모두 modal 내 confirm action(2-step)으로 accidental delete 방지.

**Dependencies**: T1, T2

---

### Task T5: 단위/통합 테스트 추가 및 회귀 검증
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
조회/편집/삭제 플로우의 정상/실패 케이스를 자동 테스트로 보강한다.

**Acceptance Criteria**:
- [ ] 모달 렌더/편집/삭제 시나리오 테스트가 추가된다.
- [ ] 저장 실패 시 배너 경로가 테스트된다.
- [ ] 기존 F11/F11.1 export 흐름은 회귀하지 않는다.

**Target Files**:
- [M] `src/App.test.tsx` -- 통합 흐름 테스트 추가
- [C] `src/code-comments/comment-list-modal.test.tsx` -- 모달 단위 테스트

**Technical Notes**:
- 정렬 검증은 fixture timestamp/path 조합으로 deterministic하게 구성.

**Dependencies**: T3, T4

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 2 | `src/App.tsx` (T2), `src/App.css` (T1) |
| 2 | 2 | 2 | `src/App.tsx`, `src/code-comments/comment-list-modal.tsx` |
| 3 | 1 | 1 | `src/App.test.tsx` |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 편집 중 동시 저장 충돌 | Medium | 저장 버튼 debounce + `isWritingComments` lock 활용 |
| 긴 코멘트 렌더 성능 저하 | Low | 기본 접힘/지연 렌더로 DOM 부하 제한 |

## Open Questions

- [ ] 삭제 UX를 즉시 삭제로 할지 confirm step으로 고정할지(기본안: confirm step)
