# Feature Draft: F12.5 Comment Feedback Autodismiss + Action Group Clarity

**Date**: 2026-02-23
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-23
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F12.5 코멘트 피드백 자동 정리 + 헤더 액션 그룹 명확화
**Priority**: Medium
**Category**: UI/UX
**Target Component**: `src/App.tsx`, `src/App.css`, `src/code-comments/comment-list-modal.tsx`, `src/code-comments/export-comments-modal.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/product-overview.md` > `3.1 MVP 포함 범위`, `4.4 코멘트-LLM 흐름`; `/_sdd/spec/sdd-workbench/system-architecture.md` > `3. UI 레이아웃`, `5.5 코멘트/내보내기`; `/_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`, `1.6 Comment Domain Layer`; `/_sdd/spec/sdd-workbench/contract-map.md` > `4. 코멘트/Export 정책 계약`

**Description**:
코멘트 작업 피드백/진입 UI를 정리한다.  
1) 코멘트 관련 성공/안내 배너는 5초 후 자동 dismiss  
2) `View Comments` 모달 상단에서 global comments를 함께 확인  
3) 헤더 액션을 `Code comments` / `Workspace` 라벨 그룹으로 명확히 분리  
4) `Export Comments` 모달에 global comments 포함 여부를 명시

**Acceptance Criteria**:
- [ ] 코멘트 관련 배너는 노출 후 5초 경과 시 자동으로 사라진다.
- [ ] 자동 dismiss 배너도 사용자가 즉시 `Dismiss`로 수동 종료할 수 있다.
- [ ] `View Comments` 모달에서 global comments가 line comments보다 상단에 표시된다.
- [ ] global comments가 비어 있으면 `View Comments` 상단에 empty 상태 문구가 표시된다.
- [ ] 헤더 액션이 `Code comments (+Global/View/Export)` + `Workspace (workspace switcher/Open/Close)` 형태로 시각적으로 구분된다.
- [ ] `Export Comments` 모달에 global comments 포함 상태(`included`/`not included`)가 표시된다.
- [ ] 기존 코멘트 저장/편집/삭제/export 기능은 회귀하지 않는다.

**Technical Notes**:
- 배너 auto-dismiss는 코멘트 액션에서 발생한 메시지에만 적용한다(워크스페이스 인덱싱/IO 오류 배너는 기존 수동 dismiss 유지).
- `View Comments`의 global 영역은 read-only로 시작하고, 편집은 기존 `Add Global Comments` 모달을 유지한다.
- 헤더 그룹 라벨은 액션 버튼보다 시각 우선순위가 낮은 스타일(`sub-label`)로 렌더한다.
- Export 포함 상태는 실제 export 입력(`globalComments.trim().length > 0`) 기준으로 계산한다.

**Dependencies**:
- F12.2(`View Comments`) / F12.3(`Add Global Comments`) / F12.4(헤더 액션 그룹)

## Improvements

### Improvement: 코멘트 작업 완료 피드백 노이즈 감소
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `5.5 코멘트/내보내기`
**Current State**: 코멘트 작업 배너는 수동 dismiss 전까지 상단을 점유한다.
**Proposed**: 코멘트 관련 배너만 5초 auto-dismiss를 적용한다.
**Reason**: 반복 코멘트 작업 시 상단 배너 누적 인지 부하를 줄이기 위함.

### Improvement: 코멘트/워크스페이스 액션 인지 구조 강화
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `3. UI 레이아웃`
**Current State**: 상단 액션이 동일 밀도로 나열되어 기능 그룹 인지가 약하다.
**Proposed**: `Code comments` / `Workspace` 라벨 그룹과 순서를 고정한다.
**Reason**: 코멘트 액션과 워크스페이스 제어 액션의 문맥 충돌을 줄이기 위함.

### Improvement: Export 구성 가시성 강화(global 포함 상태)
**Priority**: Low
**Target Section**: `/_sdd/spec/sdd-workbench/contract-map.md` > `4. 코멘트/Export 정책 계약`
**Current State**: export 모달에서 global comments 포함 여부가 직접적으로 표시되지 않는다.
**Proposed**: export 모달에 포함 상태 라인을 노출한다.
**Reason**: 사용자가 bundle 결과를 export 전에 예측 가능하게 만들기 위함.

## Component Changes

### Update Component: `src/App.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`
**Change Type**: Enhancement

**Changes**:
- 코멘트 전용 배너 출력 helper 및 5초 auto-dismiss 타이머 추가
- `CommentListModal`에 global comments 전달
- `ExportCommentsModal`에 global 포함 여부 전달
- 헤더 액션 그룹 라벨/배치(`Code comments`, `Workspace`) 조정

### Update Component: `src/code-comments/comment-list-modal.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.6 Comment Domain Layer`
**Change Type**: Enhancement

**Changes**:
- 상단 global comments read-only 섹션 추가
- global empty 상태 문구 추가

### Update Component: `src/code-comments/export-comments-modal.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/contract-map.md` > `4. 코멘트/Export 정책 계약`
**Change Type**: Enhancement

**Changes**:
- global comments 포함 여부 표시 UI 추가

### Update Component: `src/App.css`
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `3. UI 레이아웃`
**Change Type**: Enhancement

**Changes**:
- 헤더 액션 그룹 라벨/정렬 스타일 추가
- `View Comments` global 섹션 스타일 추가

### Update Component: `src/App.test.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/operations-and-validation.md` > `4. 테스트 운영`
**Change Type**: Enhancement

**Changes**:
- 코멘트 배너 auto-dismiss 타이밍 테스트 추가
- 헤더 그룹/순서/라벨 노출 테스트 추가
- export 모달 global 포함 여부 표시 테스트 추가

### Update Component: `src/code-comments/comment-list-modal.test.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/operations-and-validation.md` > `4. 테스트 운영`
**Change Type**: Enhancement

**Changes**:
- global comments 영역 렌더/empty 상태 테스트 추가

## Notes

### Context
F12.2~F12.4로 코멘트 관리 기능은 완성됐지만, 실제 사용 시 배너 누적/액션 그룹 혼재/모달 정보 부족으로 인지 비용이 남아 있다. F12.5는 기능 추가보다 코멘트 작업 흐름의 가시성을 높이는 마감 UX 정리 작업이다.

### Constraints
- 코멘트 데이터 모델(`comments.json`, `global-comments.md`)은 변경하지 않는다.
- global comments 편집 진입점은 기존 `Add Global Comments` 모달을 유지한다.
- 배너 auto-dismiss 범위는 코멘트 관련 메시지에 한정한다.

### Open Questions
- 현재 없음

---

# Part 2: Implementation Plan

## Overview

F12.5는 코멘트 작업 UX의 마찰을 줄이는 마감 개선이다. 핵심은 기존 기능을 유지한 채 배너 수명주기, 모달 정보량, 헤더 액션 인지 구조를 정리하는 것이다.

## Scope

### In Scope
- 코멘트 관련 배너 5초 auto-dismiss
- `View Comments`에 global comments 상단 표시
- 헤더 `Code comments` / `Workspace` 그룹 라벨 및 순서 정리
- `Export Comments` 모달의 global 포함 여부 표시
- 회귀 테스트 보강

### Out of Scope
- 코멘트 스레드/답글
- global comments 편집 UX 개편
- 배너 시스템 전면 리팩터링(전역 toast 시스템 전환)

## Components

1. **Comment Feedback Layer**: 코멘트 배너 auto-dismiss 제어
2. **Comment List Layer**: global + line comments 동시 조회
3. **Header Action Group Layer**: 코멘트/워크스페이스 액션 그룹 시각화
4. **Export Visibility Layer**: global 포함 상태 표시
5. **Validation Layer**: 회귀 테스트

## Implementation Phases

### Phase 1: 모달 정보량 확장
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | View Comments global 섹션 추가 | P0 | - | Comment List Layer |
| T2 | Export modal global 포함 상태 표시 | P0 | - | Export Visibility Layer |

### Phase 2: 헤더/배너 UX 정리
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | 코멘트 배너 5초 auto-dismiss 적용 | P0 | T1,T2 | Comment Feedback Layer |
| T4 | 헤더 액션 그룹 라벨/순서 정리 | P1 | T2 | Header Action Group Layer |

### Phase 3: 테스트/회귀 검증
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 자동 테스트 보강 및 회귀 검증 | P0 | T1,T2,T3,T4 | Validation Layer |

## Task Details

### Task T1: View Comments global 섹션 추가
**Component**: Comment List Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`View Comments` 모달 상단에 global comments read-only 블록을 추가하고, line comments 목록과 함께 보여준다.

**Acceptance Criteria**:
- [ ] global comments 본문이 존재하면 상단 블록에 렌더된다.
- [ ] global comments가 비어 있으면 empty 문구가 렌더된다.
- [ ] 기존 편집/삭제/Delete Exported 기능이 회귀하지 않는다.

**Target Files**:
- [M] `src/code-comments/comment-list-modal.tsx` -- global 섹션 렌더
- [M] `src/App.tsx` -- modal props로 global comments 전달
- [M] `src/code-comments/comment-list-modal.test.tsx` -- 렌더/empty 상태 테스트

**Technical Notes**:
- 글로벌 섹션은 line comments 목록과 시각적으로 구분되는 카드 블록으로 렌더한다.

**Dependencies**: -

---

### Task T2: Export modal global 포함 상태 표시
**Component**: Export Visibility Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
Export 모달 상단 메타 정보에 global comments 포함 여부를 표시한다.

**Acceptance Criteria**:
- [ ] global comments가 있으면 `included` 상태가 표시된다.
- [ ] global comments가 없으면 `not included` 상태가 표시된다.
- [ ] pending/target/길이 가드 로직은 기존과 동일하게 동작한다.

**Target Files**:
- [M] `src/code-comments/export-comments-modal.tsx` -- 상태 라인 렌더
- [M] `src/App.tsx` -- 상태 계산 및 modal props 전달
- [M] `src/App.test.tsx` -- 표시 회귀 테스트

**Technical Notes**:
- 상태 판정은 `trim().length > 0` 규칙을 고정한다.

**Dependencies**: -

---

### Task T3: 코멘트 배너 5초 auto-dismiss 적용
**Component**: Comment Feedback Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
코멘트 관련 액션에서 발생한 배너 메시지에만 5초 auto-dismiss를 적용한다.

**Acceptance Criteria**:
- [ ] 코멘트 관련 성공/안내 배너가 5초 후 자동으로 닫힌다.
- [ ] 5초 이전 수동 `Dismiss`가 정상 동작한다.
- [ ] 워크스페이스 watch/index 실패 등 비코멘트 배너는 기존 수동 dismiss 정책을 유지한다.

**Target Files**:
- [M] `src/App.tsx` -- 코멘트 배너 helper + timer lifecycle
- [M] `src/App.test.tsx` -- fake timer 기반 auto-dismiss 테스트

**Technical Notes**:
- auto-dismiss 타이머는 신규 코멘트 배너 수신 시 기존 타이머를 clear하고 재시작한다.

**Dependencies**: T1, T2

---

### Task T4: 헤더 액션 그룹 라벨/순서 정리
**Component**: Header Action Group Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
헤더를 `Code comments` 그룹과 `Workspace` 그룹으로 명확히 구분하고, workspace selector를 workspace 그룹 컨텍스트에 배치한다.

**Acceptance Criteria**:
- [ ] `Code comments` 라벨 아래에 `+Global`, `View`, `Export`가 렌더된다.
- [ ] `Workspace` 라벨 아래에 workspace selector, `Open`, `Close`가 렌더된다.
- [ ] 기존 버튼 disabled/핸들러 동작은 회귀하지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- 헤더 구조 재배치
- [M] `src/App.css` -- 그룹 라벨/정렬 스타일
- [M] `src/App.test.tsx` -- 그룹 라벨/순서 테스트

**Technical Notes**:
- 기존 `header-comments-actions`, `header-workspace-actions` 클래스를 확장해 스타일 충돌을 최소화한다.

**Dependencies**: T2

---

### Task T5: 자동 테스트 보강 및 회귀 검증
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
F12.5 변경사항에 대한 UI/동작 회귀 테스트를 보강한다.

**Acceptance Criteria**:
- [ ] View Comments global 섹션 렌더/empty 케이스가 테스트된다.
- [ ] Export modal global 포함 상태 문구가 테스트된다.
- [ ] 코멘트 배너 auto-dismiss 타이밍이 테스트된다.
- [ ] 헤더 그룹 라벨/순서/기존 액션 동작이 테스트된다.

**Target Files**:
- [M] `src/App.test.tsx` -- 통합 시나리오 테스트
- [M] `src/code-comments/comment-list-modal.test.tsx` -- 모달 단위 테스트

**Technical Notes**:
- 배너 타이밍 테스트는 `vi.useFakeTimers()`를 사용해 flaky를 줄인다.

**Dependencies**: T1, T2, T3, T4

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 1 | `src/App.tsx`(T1,T2) |
| 2 | 2 | 1 | `src/App.tsx`(T3,T4) |
| 3 | 1 | 1 | `src/App.test.tsx` |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 배너 auto-dismiss 범위 오판으로 중요 에러가 자동으로 사라짐 | Medium | 코멘트 전용 helper 경로에서만 타이머 적용 |
| 헤더 재배치로 기존 테스트/조작 순서가 깨짐 | Medium | 그룹 라벨/순서를 테스트로 고정 |
| View Comments 정보량 증가로 모달 가독성 저하 | Low | global 섹션 접힘/간결 스타일 유지 |

## Open Questions

- 현재 없음
