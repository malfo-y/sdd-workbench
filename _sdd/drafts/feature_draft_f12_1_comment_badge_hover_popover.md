# Feature Draft: F12.1 Comment Badge Hover Popover

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

### Feature: F12.1 코드/문서 코멘트 배지 Hover Popover
**Priority**: Medium
**Category**: UI/UX
**Target Component**: `src/code-viewer/code-viewer-panel.tsx`, `src/spec-viewer/spec-viewer-panel.tsx`, `src/code-comments/comment-line-index.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/01-overview.md` > `3.1 MVP 포함 범위`, `4.3 코멘트-LLM 흐름`; `/_sdd/spec/sdd-workbench/03-components.md` > `1.4 Code Viewer Layer`, `1.5 Spec Viewer Layer`; `/_sdd/spec/sdd-workbench/04-interfaces.md` > `5. 마커 매핑 규칙`

**Description**:
코드 뷰어와 rendered markdown 뷰어에서 코멘트 count badge에 마우스를 올리면 해당 라인의 코멘트 본문 요약을 popover로 보여준다. 사용자는 클릭 없이 코멘트 맥락을 빠르게 확인할 수 있어야 한다.

**Acceptance Criteria**:
- [ ] 코드 뷰어 라인 배지 hover 시 해당 라인 코멘트 목록 popover가 표시된다.
- [ ] rendered markdown의 코멘트 마커 hover 시 source line 기준 코멘트 목록 popover가 표시된다.
- [ ] 한 라인에 코멘트가 여러 개면 최대 N개(예: 3개)까지 본문 프리뷰를 보여주고 나머지는 `+N more`로 축약한다.
- [ ] popover는 마우스 이탈, `Esc`, 바깥 클릭으로 닫힌다.
- [ ] 기존 selection/우클릭/Add Comment/Go to Source/링크 popover 동작은 회귀하지 않는다.

**Technical Notes**:
- 코멘트 본문 프리뷰는 1줄/최대 글자수 제한(예: 120자) 후 말줄임으로 렌더한다.
- 마커 매핑은 기존 규칙(`exact-match -> nearest fallback`)을 그대로 사용한다.
- hover 지연(show/hide delay)은 100~150ms 범위로 깜빡임을 완화한다.

**Dependencies**:
- F11/F11.1 코멘트 저장 및 마커 파이프라인

## Improvements

### Improvement: 라인별 코멘트 detail lookup 유틸 확장
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.6 Comment Domain Layer`; `/_sdd/spec/sdd-workbench/04-interfaces.md` > `5. 마커 매핑 규칙`
**Current State**: 현재는 라인별 코멘트 count만 계산하며 본문 목록 조회는 별도 계산이 필요하다.
**Proposed**: `comment-line-index`에 `line -> comments[]` 조회 유틸을 추가하고 CodeViewer/SpecViewer에서 공용 사용한다.
**Reason**: hover popover 렌더 시 중복 계산을 줄이고 일관된 정렬/필터 규칙을 보장하기 위함.

## Component Changes

### New Component: `src/code-comments/comment-hover-popover.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.6 Comment Domain Layer`
**Purpose**: 코멘트 목록 hover popover UI 렌더
**Input**: `lineNumber`, `comments[]`, `position`, `onClose`
**Output**: readonly comment preview popover

**Planned Methods**:
- `CommentHoverPopover()` - 코멘트 프리뷰 목록 렌더

### Update Component: `src/code-comments/comment-line-index.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.6 Comment Domain Layer`
**Change Type**: Enhancement

**Changes**:
- 기존 count index와 함께 line별 comment entry lookup 반환 함수 추가
- 코드/문서 양쪽에서 동일한 sort 순서 재사용

### Update Component: `src/code-viewer/code-viewer-panel.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.4 Code Viewer Layer`
**Change Type**: Enhancement

**Changes**:
- 라인 배지 hover 트리거 추가
- popover 표시 좌표 계산 및 닫힘 제어
- selection/우클릭 액션과 충돌 없는 이벤트 처리

### Update Component: `src/spec-viewer/spec-viewer-panel.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`
**Change Type**: Enhancement

**Changes**:
- rendered 블록 마커에 hover 가능한 실제 badge element 추가
- source-line 매핑된 코멘트 목록 popover 연결
- 기존 link/source popover와 상호 배타 상태 관리

### Update Component: `src/App.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`
**Change Type**: Enhancement

**Changes**:
- active file/spec 기준 라인별 코멘트 detail map 계산
- CodeViewer/SpecViewer props로 전달

## Notes

### Context
F11.1에서 count badge는 제공되지만 본문 확인을 위해서는 별도 탐색이 필요하다. F12.1은 읽기 전용 hover 미리보기로 코멘트 탐색 비용을 낮춘다.

### Constraints
- 코멘트 편집/삭제는 본 기능 범위에 포함하지 않는다(F12.2에서 처리).
- hover popover는 readonly이며 링크/점프 액션을 포함하지 않는다.

### Open Questions
- 현재 없음

---

# Part 2: Implementation Plan

## Overview

F12.1은 기존 count badge를 정보성 hover popover로 확장해, 코드/문서 양쪽에서 코멘트 내용을 빠르게 훑을 수 있게 한다. 핵심은 line-index 유틸 확장과 CodeViewer/SpecViewer 이벤트 충돌 방지다.

## Scope

### In Scope
- 코드 뷰어 라인 배지 hover popover
- rendered markdown 마커 hover popover
- 라인별 코멘트 detail lookup 유틸
- 단위/통합 테스트 추가

### Out of Scope
- 코멘트 편집/삭제
- 코멘트 상세 페이지/스레드 뷰
- 모바일 전용 hover 대체 UX(후속)

## Components

1. **Comment Index Extension Layer**: line별 코멘트 entry 조회
2. **Hover Popover UI Layer**: 배지 hover 미리보기
3. **Viewer Integration Layer**: code/spec 패널 이벤트 통합
4. **Validation Layer**: 회귀 및 상호작용 테스트

## Implementation Phases

### Phase 1: 도메인/공용 UI 준비
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | 라인별 코멘트 detail index 확장 | P0 | - | Comment Index Extension Layer |
| T2 | 공용 hover popover 컴포넌트 추가 | P1 | T1 | Hover Popover UI Layer |

### Phase 2: 패널 통합
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | CodeViewer 배지 hover popover 통합 | P0 | T1,T2 | Viewer Integration Layer |
| T4 | SpecViewer 마커 hover popover 통합 | P0 | T1,T2 | Viewer Integration Layer |

### Phase 3: 검증
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 테스트 보강 및 회귀 검증 | P0 | T3,T4 | Validation Layer |

## Task Details

### Task T1: 라인별 코멘트 detail index 확장
**Component**: Comment Index Extension Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`comment-line-index` 유틸을 확장해 라인별 comment count뿐 아니라 comment entry 목록을 안정적으로 조회할 수 있도록 한다.

**Acceptance Criteria**:
- [ ] 특정 파일/라인에 대한 `comments[]` 조회 함수가 추가된다.
- [ ] 기존 count 계산 API와 정렬 규칙이 유지된다.
- [ ] 동일 입력에 대해 deterministic 출력이 보장된다.

**Target Files**:
- [M] `src/code-comments/comment-line-index.ts` -- line->comments lookup API 추가
- [M] `src/code-comments/comment-line-index.test.ts` -- lookup/정렬/경계 테스트 추가

**Technical Notes**:
- 반환 타입은 readonly를 기본으로 하여 렌더러에서 불변성 유지.

**Dependencies**: -

---

### Task T2: 공용 hover popover 컴포넌트 추가
**Component**: Hover Popover UI Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
코멘트 리스트를 표시하는 공용 hover popover 컴포넌트를 추가한다.

**Acceptance Criteria**:
- [ ] title/line/comments/overflow indicator를 렌더한다.
- [ ] ESC/외부 클릭으로 닫힌다.
- [ ] 긴 본문 축약 렌더가 적용된다.

**Target Files**:
- [C] `src/code-comments/comment-hover-popover.tsx` -- hover popover UI
- [M] `src/App.css` -- hover popover 스타일

**Technical Notes**:
- 기존 popover 시각 스타일과 톤을 맞춘다.

**Dependencies**: T1

---

### Task T3: CodeViewer 배지 hover popover 통합
**Component**: Viewer Integration Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
코드 라인 번호 옆 badge hover 시 라인 코멘트 popover가 뜨도록 통합한다.

**Acceptance Criteria**:
- [ ] badge hover 시 해당 라인 코멘트 프리뷰가 표시된다.
- [ ] selection drag/우클릭 중에는 popover가 방해하지 않는다.
- [ ] active file 변경 시 popover 상태가 정리된다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx` -- hover 상태/이벤트/렌더 추가
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- hover 표시/닫힘 테스트

**Technical Notes**:
- popover 표시 대상은 commentCount > 0 라인으로 제한한다.

**Dependencies**: T1, T2

---

### Task T4: SpecViewer 마커 hover popover 통합
**Component**: Viewer Integration Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
rendered markdown 블록 마커를 hover 가능 element로 렌더하고 코멘트 프리뷰 popover를 연결한다.

**Acceptance Criteria**:
- [ ] comment marker가 있는 블록 hover 시 popover가 표시된다.
- [ ] 기존 `Add Comment`/`Go to Source` context popover와 충돌하지 않는다.
- [ ] 링크 popover 동작 회귀가 없다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- marker 렌더 구조 + hover 이벤트 추가
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- marker hover/기존 액션 회귀 테스트
- [M] `src/App.css` -- spec marker hover 스타일 보강

**Technical Notes**:
- pseudo-element 기반 marker는 이벤트 처리가 어려우므로 실제 DOM element로 전환을 고려한다.

**Dependencies**: T1, T2

---

### Task T5: 테스트 보강 및 회귀 검증
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
코멘트 hover 도입으로 인한 렌더/이벤트 회귀를 통합 검증한다.

**Acceptance Criteria**:
- [ ] App 수준에서 코드/문서 hover popover 표시가 검증된다.
- [ ] 기존 코멘트 저장/수정 없는 경로가 유지된다.
- [ ] `npm test`, `npm run lint`, `npm run build` 통과 기준을 확인한다.

**Target Files**:
- [M] `src/App.test.tsx` -- end-to-end 상호작용 테스트 확장

**Technical Notes**:
- flaky 방지를 위해 hover 이벤트 타이밍은 fake timer 또는 명시적 wait를 사용한다.

**Dependencies**: T3, T4

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 2 | `src/App.css` (T2 이후 스타일 확정) |
| 2 | 2 | 2 | 없음 |
| 3 | 1 | 1 | `src/App.test.tsx` |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| hover popover와 기존 popover 충돌 | Medium | popover state를 상호 배타적으로 관리 |
| spec marker DOM 전환에 따른 스타일 회귀 | Medium | marker 전용 테스트 + snapshot 검증 |

## Open Questions

- [ ] hover 지연 시간(즉시/지연) 값을 기본값으로 확정할지 여부

