# Feature Draft: F12.4 Header Action Layout Reorder

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

### Feature: F12.4 헤더 액션 그룹 재배치(Comments 그룹 + Workspace 그룹)
**Priority**: Medium
**Category**: UI/UX
**Target Component**: `src/App.tsx`, `src/App.css`
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `3. UI 레이아웃`; `/_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`; `/_sdd/spec/sdd-workbench/product-overview.md` > `3.1 MVP 포함 범위`

**Description**:
헤더 버튼을 기능 그룹으로 재배치한다. comments 관련 액션(`Add Global Comments`, `View Comments`, `Export Comments`)은 우측 영역의 왼쪽 그룹으로 묶고, workspace 제어 액션(`Close Workspace`, `Open Workspace`)은 맨 오른쪽 그룹으로 고정한다.
동시에 액션 밀도를 줄이기 위해 버튼 스타일을 compact화하고, 기본은 `icon + short label`을 사용하며 협소 폭에서는 `icon-only`로 전환한다.

**Acceptance Criteria**:
- [ ] 헤더 액션 순서가 `Back/Forward -> Workspace Switcher -> Comments Group -> Workspace Group`으로 렌더된다.
- [ ] Comments Group 내부 순서는 `Add Global Comments`, `View Comments`, `Export Comments`를 유지한다.
- [ ] Workspace Group 내부 순서는 `Close Workspace`, `Open Workspace`를 유지한다.
- [ ] 좁은 화면에서 wrap이 발생해도 그룹 내부 상대 순서는 보존된다.
- [ ] 기존 버튼 disabled 조건/동작은 회귀하지 않는다.
- [ ] 데스크톱 기본 표시에서 comments/workspace 액션은 `icon + short label` compact 버튼으로 표시된다.
- [ ] 협소 폭(반응형 breakpoint)에서는 comments/workspace 액션이 `icon-only`로 전환된다.
- [ ] `icon-only` 상태에서도 `title`/`aria-label`이 유지되어 접근성이 보장된다.

**Technical Notes**:
- 그룹 단위 wrapper(`header-comments-actions`, `header-workspace-actions`)를 도입한다.
- 액션 버튼에 공통 compact variant(`header-action-button`)를 도입하고 icon slot + label slot 구조를 사용한다.
- 라벨 short text 예시: `+ Global`, `View`, `Export`, `Close`, `Open`.
- 반응형에서 라벨 slot만 숨기고 버튼 hit area(최소 높이/너비)는 유지한다.
- F12.2/F12.3가 미구현인 단계에서는 해당 버튼을 숨기거나 disabled placeholder로 처리 가능(스펙 적용 시점 정책에 맞춤).

**Dependencies**:
- F12.2(`View Comments`)와 F12.3(`Add Global Comments`) 버튼 정의

## Improvements

### Improvement: 헤더 액션 의미별 시각 계층 명확화
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `3. UI 레이아웃`
**Current State**: 액션 버튼이 단일 행에 혼합되어 기능 군집이 약하다.
**Proposed**: comments/workspace 액션을 그룹화하고 spacing/정렬 규칙을 분리한다.
**Reason**: 작업 맥락 전환 시 버튼 탐색 시간을 줄이고 실수 클릭 확률을 낮추기 위함.

### Improvement: 헤더 액션 밀도 축소(icon+label -> icon-only responsive)
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `3. UI 레이아웃`
**Current State**: 액션 텍스트 길이 증가로 헤더가 공간을 과점유한다.
**Proposed**: 기본은 `icon + short label`, 협소 폭에서는 `icon-only`로 전환한다.
**Reason**: 기능 접근성을 유지하면서 상단 레이아웃 점유 면적을 줄이기 위함.

## Component Changes

### Update Component: `src/App.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`
**Change Type**: Enhancement

**Changes**:
- 헤더 액션 DOM 구조를 그룹 단위로 재배치
- comments 관련 버튼 묶음 추가
- workspace 관련 버튼을 맨 오른쪽 그룹으로 배치
- comments/workspace 액션에 icon + short label 렌더 구조 추가
- 반응형용 `icon-only` 전환을 위한 label span 분리 및 접근성 속성(`aria-label`, `title`) 명시

### Update Component: `src/App.css`
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `3. UI 레이아웃`
**Change Type**: Enhancement

**Changes**:
- 그룹 wrapper 스타일(`gap`, `justify`, `wrap`) 정의
- 반응형 구간에서 그룹 순서 유지 스타일 보강
- compact 버튼 스타일(폰트/패딩/높이/간격) 정의
- 협소 폭에서 label 숨김 + icon-only 레이아웃 전환 규칙 정의

### Update Component: `src/App.test.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/operations-and-validation.md` > `4. 테스트 운영`
**Change Type**: Enhancement

**Changes**:
- 헤더 액션 그룹 순서/버튼 존재/disabled 회귀 테스트 추가

## Notes

### Context
현재 헤더는 기능이 늘어나면서 액션 밀도가 높아졌다. F12.4는 기능 추가 없이 배치만 개선해 작업 흐름을 안정화하는 UI 정리 작업이다.

### Constraints
- 버튼 핸들러/disabled 로직은 바꾸지 않는다(배치/표시 스타일 중심).
- 라벨은 short label로 축약 가능하되 의미 전달은 `aria-label`로 보완한다.
- 모바일/협소 폭에서 접근성(tab order, focus ring)은 유지한다.

### Open Questions
- 현재 없음

---

# Part 2: Implementation Plan

## Overview

F12.4는 헤더 액션을 코멘트/워크스페이스 제어 영역으로 분리해 가시성과 조작성을 높인다. 변경 범위는 App 구조와 CSS 레이아웃이며 기능 로직 변화는 최소화한다.

## Scope

### In Scope
- 헤더 액션 그룹 래퍼 구조 추가
- 버튼 순서 및 그룹 배치 재정렬
- 반응형 레이아웃 보강
- compact 액션 버튼(`icon + short label`) 도입
- 협소 폭 `icon-only` 전환 규칙 추가
- 버튼 동작/disabled 회귀 테스트

### Out of Scope
- 새로운 비즈니스 로직 추가
- 대규모 디자인 리브랜딩(색상 시스템/테마 전면 개편)
- 모바일 전용 별도 헤더 컴포넌트 분리

## Components

1. **Header Layout Layer**: 액션 그룹 구조 재배치
2. **Responsive Styling Layer**: 반응형 정렬/간격 규칙
3. **Validation Layer**: 버튼 순서/동작 회귀 테스트

## Implementation Phases

### Phase 1: 구조 변경
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | App 헤더 액션 그룹 구조 재배치 | P0 | - | Header Layout Layer |

### Phase 2: 스타일 보강
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T2 | 헤더 그룹 스타일 및 반응형 규칙 업데이트 | P0 | T1 | Responsive Styling Layer |

### Phase 3: 검증
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | 버튼 순서/동작 회귀 테스트 | P0 | T1,T2 | Validation Layer |

## Task Details

### Task T1: App 헤더 액션 그룹 구조 재배치
**Component**: Header Layout Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
헤더 액션 DOM을 comments/workspace 그룹 단위로 나눠 재배치한다.

**Acceptance Criteria**:
- [ ] DOM 구조가 그룹 단위로 분리된다.
- [ ] `Open Workspace`, `Close Workspace`가 가장 오른쪽 그룹에 위치한다.
- [ ] comments 액션은 workspace 그룹 왼쪽에 위치한다.

**Target Files**:
- [M] `src/App.tsx` -- 헤더 액션 그룹 wrapper 도입 및 버튼 순서 재배치

**Technical Notes**:
- 향후 F12.x 확장을 위해 그룹 클래스명을 의미 기반으로 지정한다.

**Dependencies**: -

---

### Task T2: 헤더 그룹 스타일 및 반응형 규칙 업데이트
**Component**: Responsive Styling Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
새 그룹 구조에 맞춰 간격/정렬/랩핑 정책을 CSS로 정의한다.

**Acceptance Criteria**:
- [ ] 데스크톱에서 그룹 사이 간격과 정렬이 일관된다.
- [ ] 협소 폭에서 그룹 내부 순서는 유지된다.
- [ ] 데스크톱 기본 상태에서 icon + short label compact 버튼이 적용된다.
- [ ] 협소 폭에서 label이 숨겨지고 icon-only로 동작한다.
- [ ] icon-only 상태에서도 hover/focus/disabled 스타일이 명확하다.
- [ ] focus/hover 상태가 기존 대비 퇴행하지 않는다.

**Target Files**:
- [M] `src/App.css` -- `.app-header-actions` 하위 그룹 스타일 추가/조정

**Technical Notes**:
- flex-wrap 유지 + 그룹별 `display: inline-flex`로 순서 안정성 확보.

**Dependencies**: T1

---

### Task T3: 버튼 순서/동작 회귀 테스트
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
헤더 배치 변경 후 버튼 노출/순서/동작이 기존 기능과 동일한지 검증한다.

**Acceptance Criteria**:
- [ ] 헤더 버튼 그룹 순서가 테스트로 고정된다.
- [ ] `Open Workspace`, `Close Workspace`, `Export Comments` 동작 회귀가 없다.
- [ ] F12.2/F12.3 버튼이 존재할 때도 순서 규칙이 유지된다.
- [ ] `icon-only` 반응형 상태에서 `aria-label` 기반 액션 접근이 가능하다.

**Target Files**:
- [M] `src/App.test.tsx` -- 헤더 순서/동작 회귀 테스트 추가

**Technical Notes**:
- DOM 순서 검증은 action group 컨테이너 내 child 텍스트 순서 기반으로 수행.

**Dependencies**: T1, T2

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 1 | 1 | `src/App.tsx` |
| 2 | 1 | 1 | `src/App.css` |
| 3 | 1 | 1 | `src/App.test.tsx` |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 반응형에서 버튼 줄바꿈이 비직관적 | Medium | 최소 폭 기준 테스트 케이스 추가 |
| 향후 버튼 추가 시 순서 규칙 붕괴 | Low | 그룹 클래스 + 테스트로 순서 고정 |

## Open Questions

- [ ] F12.2/F12.3가 미완료일 때 comments 그룹 placeholder 정책(숨김 vs disabled) 확정 필요
