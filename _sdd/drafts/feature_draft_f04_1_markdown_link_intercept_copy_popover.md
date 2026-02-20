# Feature Draft: F04.1 Markdown Link Intercept + Copy Popover

**Date**: 2026-02-20
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-20
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F04.1 Markdown 링크 안전 인터셉트 + 링크 주소 복사 Popover
**Priority**: High (P0)
**Category**: Enhancement
**Target Component**: SpecViewerPanel, WorkspaceProvider, App Shell, Tests
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue` (신규 항목 `F04.1` 추가)

**Description**:
Rendered markdown 내 링크 클릭 시 브라우저 기본 이동을 차단하고, 링크 타입에 따라 안전하게 처리한다.  
같은 활성 워크스페이스에서 해석 가능한 상대 링크는 해당 파일을 열고, 외부 링크/다른 워크스페이스 링크/해석 실패 링크는 커서 근처 popover를 표시해 링크 주소를 복사할 수 있게 한다.

**Acceptance Criteria**:
- [ ] markdown 링크 클릭 시 Electron renderer가 페이지 이동/리로드되지 않는다.
- [ ] 활성 워크스페이스 기준으로 해석 가능한 상대 파일 링크는 `selectFile()`로 열린다.
- [ ] 외부 URL 또는 활성 워크스페이스 해석 실패 링크 클릭 시 링크 주소 복사 popover가 표시된다.
- [ ] popover에서 `Copy Link Address` 실행 시 클립보드 복사가 가능하다.
- [ ] 해석 실패/지원 불가 링크에 대해 사용자 피드백(배너 또는 동등 메시지)이 제공된다.
- [ ] 기존 F04 dual view, F03.5 멀티 워크스페이스 전환 동작이 회귀하지 않는다.

**Technical Notes**:
- 이 기능은 F05 전체(라인 점프/하이라이트)를 선행 구현하지 않고, 링크 인터셉트 안정화에 집중한다.
- 링크 해석 기준은 `active workspace` 고정이며 cross-workspace 자동 탐색은 허용하지 않는다.

**Dependencies**:
- F04 markdown dual view
- F03.5 active workspace 정책

## Improvements

### Improvement: 링크 클릭 정책을 F04.1 기준으로 명시
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `8. 링크/경로 파싱 규칙 (MVP 고정)`
**Current State**: 외부 URL 위임/내부 링크 해석 규칙이 F04.1 UX(복사 popover)와 불일치 가능
**Proposed**: 기본 네비게이션 차단 + active workspace 해석 우선 + 실패/외부 링크는 copy popover/오류 피드백으로 처리
**Reason**: 링크 클릭 시 앱 상태 초기화(워크스페이스 리셋처럼 보이는 현상) 방지

### Improvement: SpecViewerPanel 출력 계약에 링크 인터셉트 이벤트 추가
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `6.4 SpecViewerPanel`
**Current State**: Output이 `activeHeadingId`, `spec-link-click` 수준으로 추상적
**Proposed**: `onLinkAction`(open-file/copy-link/error-feedback) 수준의 이벤트 계약을 명시
**Reason**: 구현/테스트 경계 명확화 및 F05 확장 준비

### Improvement: 수용 기준에 링크 안전성 회귀 테스트 추가
**Priority**: Medium (P1)
**Target Section**: `/_sdd/spec/main.md` > `13. 테스트 및 수용 기준`
**Current State**: markdown 링크 클릭 시 기본 이동 차단/복사 UX에 대한 명시적 테스트 기준 없음
**Proposed**: 링크 클릭 시 앱 상태 유지 + same-workspace open + unresolved/external copy popover 시나리오 추가
**Reason**: 사용자 데이터/세션 상태 보호

## Bug Reports

### Bug: Rendered markdown 링크 클릭 시 앱 상태 초기화
**Severity**: High
**Target Section**: `/_sdd/spec/main.md` > `14. 리스크 및 미확정 사항` 또는 `13. 테스트 및 수용 기준`
**Location**: `src/spec-viewer/spec-viewer-panel.tsx` (`ReactMarkdown` 기본 anchor 동작)

**Description**:
Rendered markdown 링크를 클릭하면 기본 브라우저 네비게이션이 실행되어 renderer 상태가 리로드된다. 사용자 입장에서는 열린 워크스페이스가 사라지거나 앱이 깨진 것처럼 보인다.

**Reproduction**:
1. `.md` 파일을 열고 오른쪽 rendered panel에서 상대 링크(`./x.md`)를 클릭한다.
2. 화면이 이동/리로드되어 현재 상태가 초기화된다.

**Expected Behavior**:
- 기본 이동은 차단되고, 정책에 따라 내부 파일 열기 또는 링크 복사 안내가 발생해야 한다.

**Workaround**:
- 현재 없음 (기능 패치 필요)

## Component Changes

### Update Component: SpecViewerPanel (`src/spec-viewer/spec-viewer-panel.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.4 SpecViewerPanel`
**Change Type**: Enhancement + Bug Fix

**Changes**:
- markdown anchor 클릭 기본 동작 차단
- 링크 타입 분류(`same-workspace-file` / `external` / `unresolved`)
- same-workspace 파일 링크는 상위 콜백으로 전달해 파일 열기 처리
- external/unresolved 링크는 popover 표시 및 주소 복사 액션 제공

### New Component: Spec Link Popover (`src/spec-viewer/spec-link-popover.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.4 SpecViewerPanel` 또는 `4. 목표 UX/레이아웃`
**Change Type**: New Component

**Changes**:
- 커서 기준 위치에 표시되는 소형 popover UI
- `Copy Link Address` 버튼 제공
- dismiss(외부 클릭/ESC) 지원

### New Component: Spec Link Resolver Utility (`src/spec-viewer/spec-link-utils.ts`)
**Target Section**: `/_sdd/spec/main.md` > `8. 링크/경로 파싱 규칙 (MVP 고정)`
**Change Type**: New Supporting Module

**Changes**:
- `activeSpec` 기준 상대 링크 해석
- active workspace 내부 경로 안전성 검사(escape 차단)
- 링크 분류 결과 타입 제공

### Update Component: WorkspaceProvider (`src/workspace/workspace-context.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.1 WorkspaceProvider`
**Change Type**: Enhancement

**Changes**:
- Spec 링크 처리 실패/정책 메시지를 배너로 노출할 수 있는 API 유지/정리

## Configuration Changes

해당 없음

## Notes

### Resolved Decisions
- [x] same-workspace 링크는 해당 파일을 열기(`selectFile`)로 처리
- [x] 외부 링크/다른 워크스페이스 링크는 자동 이동하지 않고 copy popover/오류 피드백으로 처리
- [x] cross-workspace 자동 탐색/전환은 MVP에서 제외

### Scope Boundary
- F04.1은 “안전한 링크 클릭 UX”에 집중하고, F05의 `#Lx`, `#Lx-Ly` 코드 점프는 포함하지 않는다.
- 시스템 브라우저 자동 오픈은 본 기능 범위에서 제외한다.

---

# Part 2: Implementation Plan

## Overview

F04.1은 markdown 링크 클릭으로 인한 renderer 리로드 버그를 우선 차단하고, 링크 타입별 최소 UX(내부 파일 열기 / 링크 주소 복사 popover)를 제공하는 안전화 패치다. F05의 코드 라인 점프는 제외하고, active workspace 정책을 그대로 유지한다.

## Scope

### In Scope
- SpecViewer 링크 클릭 인터셉트(`preventDefault`)
- `activeSpec + rootPath` 기반 상대 링크 해석 유틸
- same-workspace 파일 링크 열기
- external/unresolved 링크 copy popover + 배너 피드백
- 단위/통합 테스트 추가

### Out of Scope
- `#Lx`, `#Lx-Ly` 파싱/라인 하이라이트(F05)
- cross-workspace 자동 탐색/자동 전환
- 외부 링크 자동 브라우저 오픈

## Components

1. **Spec Link Resolver (`src/spec-viewer/spec-link-utils.ts`)**: 링크 해석/분류/안전성 검증
2. **SpecViewerPanel (`src/spec-viewer/spec-viewer-panel.tsx`)**: 링크 인터셉트 + 액션 분기
3. **Spec Link Popover (`src/spec-viewer/spec-link-popover.tsx`)**: 링크 주소 복사 UI
4. **Workspace/App Wiring (`src/workspace/workspace-context.tsx`, `src/App.tsx`)**: 파일 열기/배너 연결
5. **Tests (`src/spec-viewer/*.test.ts*`, `src/App.test.tsx`)**: 회귀/정책 검증

## Implementation Phases

### Phase 1: Link Guard Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | 링크 해석/분류 유틸 구현 | P0 | - | Spec Link Resolver |
| 2 | SpecViewerPanel 링크 인터셉트 연결 | P0 | 1 | SpecViewerPanel |

### Phase 2: Copy Popover UX
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | 링크 주소 복사 popover 컴포넌트 구현 | P1 | 2 | Spec Link Popover |
| 4 | App/Workspace 연동(same-workspace open + banner) | P0 | 2,3 | Workspace/App Wiring |
| 5 | popover/링크 상태 스타일링 | P2 | 3 | Styles |

### Phase 3: Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 6 | 단위 테스트: 링크 해석/분류/경계검증 | P0 | 1 | Tests |
| 7 | 통합 테스트: 클릭 정책/상태 비회귀 | P0 | 2,3,4,5,6 | Tests |

## Task Details

### Task 1: 링크 해석/분류 유틸 구현
**Component**: Spec Link Resolver  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`activeSpecPath`, `workspaceRoot`, `href`를 입력받아 링크를 분류하고, same-workspace 파일 링크라면 `relativePath`를 반환하는 유틸을 구현한다.

**Acceptance Criteria**:
- [ ] `./`, `../` 상대 링크를 `activeSpec` 기준으로 정규화한다.
- [ ] workspace 경계 밖으로 벗어나는 경로는 `unresolved`로 분류한다.
- [ ] `http/https/mailto`는 `external`로 분류한다.
- [ ] same-workspace 파일 링크는 `targetRelativePath`를 반환한다.

**Target Files**:
- [C] `src/spec-viewer/spec-link-utils.ts` -- 링크 분류/해석 유틸
- [C] `src/spec-viewer/spec-link-utils.test.ts` -- 유틸 단위 테스트

**Technical Notes**:
- 경로 계산은 POSIX-style relative path(`workspace.index/readFile` 계약)와 맞춘다.
- 해시(`#...`)는 F05 범위로 이월하고 F04.1에서는 파일 경로까지만 처리한다.

**Dependencies**: -

---

### Task 2: SpecViewerPanel 링크 인터셉트 연결
**Component**: SpecViewerPanel  
**Priority**: P0-Critical  
**Type**: Bug

**Description**:
`ReactMarkdown` 렌더 anchor를 커스터마이징해 기본 네비게이션을 차단하고, Task 1 유틸 결과에 따라 상위 액션으로 분기한다.

**Acceptance Criteria**:
- [ ] 링크 클릭 시 기본 페이지 이동이 발생하지 않는다.
- [ ] same-workspace 파일 링크는 `onOpenRelativePath` 콜백이 호출된다.
- [ ] external/unresolved 링크는 popover 표시 콜백이 호출된다.
- [ ] 동일 문서 anchor 링크(`#section`)는 기본 스크롤 동작을 유지한다.
- [ ] 기존 TOC 렌더링/heading anchor 동작은 회귀하지 않는다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- markdown link click 인터셉트
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- 링크 인터셉트 시나리오

**Technical Notes**:
- `components.a` 오버라이드 방식으로 구현해 markdown 본문 링크만 제어한다.
- 동일 문서 anchor(`#id`)는 기본 동작 유지가 필요하면 예외 처리한다.

**Dependencies**: 1

---

### Task 3: 링크 주소 복사 popover 컴포넌트 구현
**Component**: Spec Link Popover  
**Priority**: P1-High  
**Type**: Feature

**Description**:
external/unresolved 링크 클릭 시 커서 근처에 표시되는 소형 popover를 구현한다. `Copy Link Address` 액션과 닫기 동작을 포함한다.

**Acceptance Criteria**:
- [ ] 클릭 좌표 근처에 popover가 표시된다.
- [ ] `Copy Link Address` 클릭 시 클립보드 복사가 수행된다.
- [ ] 바깥 클릭/ESC/완료 시 popover가 닫힌다.

**Target Files**:
- [C] `src/spec-viewer/spec-link-popover.tsx` -- popover UI 컴포넌트
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- popover 상태/표시 연동
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- popover 상호작용 테스트

**Technical Notes**:
- 클립보드는 `navigator.clipboard.writeText` 우선, 실패 시 graceful error 처리.
- viewport 바깥으로 나가지 않도록 위치 clamp를 적용한다.

**Dependencies**: 2

---

### Task 4: App/Workspace 연동(same-workspace open + banner)
**Component**: Workspace/App Wiring  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
SpecViewerPanel에서 발생한 링크 액션을 App/Workspace 계층에 연결한다. same-workspace 링크는 `selectFile()`, unresolved/external은 사용자 피드백 배너를 표시한다.

**Acceptance Criteria**:
- [ ] same-workspace 링크 클릭 시 해당 파일이 활성 파일로 열린다.
- [ ] unresolved/external 링크 클릭 시 상태 리셋 없이 안내 메시지가 표시된다.
- [ ] 멀티 워크스페이스 전환 후에도 active workspace 기준으로 일관 동작한다.

**Target Files**:
- [M] `src/App.tsx` -- SpecViewerPanel 액션 콜백 바인딩
- [M] `src/workspace/workspace-context.tsx` -- 배너 메시지 API 정리/유지

**Technical Notes**:
- `activeWorkspaceId`가 없을 때는 no-op + 배너 안내로 처리한다.
- other-workspace 탐색은 하지 않고 “현재 워크스페이스에서 찾을 수 없음” 메시지를 사용한다.

**Dependencies**: 2, 3

---

### Task 5: popover/링크 상태 스타일링
**Component**: Styles  
**Priority**: P2-Medium  
**Type**: Feature

**Description**:
link copy popover 스타일과 링크 상태 표시(hover/clickable affordance)를 추가한다.

**Acceptance Criteria**:
- [ ] popover가 dark theme에 맞게 가독성 있게 표시된다.
- [ ] 링크 hover 상태가 명확해진다.
- [ ] 기존 spec viewer/table/code 스타일과 충돌하지 않는다.

**Target Files**:
- [M] `src/App.css` -- popover/링크 상태 스타일 추가

**Technical Notes**:
- 기존 색상 토큰을 재사용해 시각 일관성을 유지한다.

**Dependencies**: 3

---

### Task 6: 단위 테스트(링크 해석/분류/경계검증)
**Component**: Tests  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
링크 해석 유틸의 경계 조건(상대경로 정규화, workspace escape 차단, external 분류)을 단위 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] same-workspace 상대 링크 해석 테스트가 있다.
- [ ] `../` escape 차단 테스트가 있다.
- [ ] external URL 분류 테스트가 있다.

**Target Files**:
- [M] `src/spec-viewer/spec-link-utils.test.ts` -- 단위 테스트 보강
- [M] `src/spec-viewer/spec-link-utils.ts` -- 테스트 가능 API 정리

**Technical Notes**:
- URL/경로 파싱 실패 케이스를 명시적으로 검증한다.

**Dependencies**: 1

---

### Task 7: 통합 테스트(클릭 정책/상태 비회귀)
**Component**: Tests  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
App 통합 시나리오에서 링크 클릭 정책이 사용자 흐름을 깨지 않는지 검증한다.

**Acceptance Criteria**:
- [ ] markdown 상대 링크 클릭 시 `selectFile` 경로가 실행된다.
- [ ] external/unresolved 클릭 시 popover 또는 배너 피드백이 표시된다.
- [ ] 링크 클릭 후에도 workspace/session 상태가 유지된다.
- [ ] 기존 F01~F04 테스트가 회귀 없이 통과한다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- 링크 액션 통합 assertion
- [M] `src/App.test.tsx` -- markdown 링크 클릭 시나리오 추가

**Technical Notes**:
- 링크 클릭 후 “app reset 없음”은 `workspace-path`/active workspace 유지로 검증한다.

**Dependencies**: 2, 3, 4, 5, 6

---

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 1 | Task 2가 `spec-viewer-panel.tsx`에서 Task 1 유틸을 소비 |
| 2 | 3 | 1 | Task 3/4가 `spec-viewer-panel.tsx`, Task 5가 `App.css` (Task 3 결과 의존) |
| 3 | 2 | 2 | 가능 (`spec-link-utils.test.ts` vs `App.test.tsx`), 단 Task 7은 최종 통합 시점에 권장 |

### Conflict Notes

- `src/spec-viewer/spec-viewer-panel.tsx`는 Task 2/3/4의 공통 충돌 파일이므로 순차 처리 필수.
- `src/App.tsx`와 `src/workspace/workspace-context.tsx`는 링크 액션 wiring 경계가 맞물리므로 의미적 충돌 가능성이 높다.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 링크 해석 오판으로 잘못된 파일 오픈 | 사용자 혼란/오동작 | resolver 유닛 테스트 + workspace 경계 검사 강제 |
| popover 위치 계산 실패 | UX 저하 | viewport clamp + 최소 여백 규칙 적용 |
| 클립보드 API 실패(권한/환경) | 기능 일부 실패 | 실패 시 배너 메시지 fallback |
| F05와 책임 중복 | 후속 리팩토링 비용 | F04.1은 “안전 인터셉트/복사”만, 라인 점프는 F05로 분리 명시 |

## Resolved Decisions

- [x] same-workspace 링크는 파일 열기로 처리한다.
- [x] external/other-workspace 링크는 자동 이동하지 않고 copy popover/오류 피드백으로 처리한다.
- [x] cross-workspace 자동 fallback은 도입하지 않는다.
- [x] 동일 문서 anchor 링크(`#section`)는 기본 스크롤을 허용한다.

## Open Questions

- 없음

## Model Recommendation

- 구현 추천: `sonnet` (UI 인터셉트 + 상태 wiring + 테스트 확장)
- F05까지 동시에 확장하는 경우: `opus` 고려

---

## Next Steps

### Apply Spec Patch (choose one)

- **Method A (automatic)**: `spec-update-todo` 실행 후 이 문서의 Part 1을 입력으로 사용
- **Method B (manual)**: Part 1 항목을 각 Target Section에 수동 반영

### Execute Implementation

- **Parallel**: `implementation` 스킬로 Part 2 실행
- **Sequential**: `implementation-sequential` 스킬로 Part 2 실행
