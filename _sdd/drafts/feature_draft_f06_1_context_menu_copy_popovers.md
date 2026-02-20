# Feature Draft: F06.1 Context Menu Copy Popovers

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

### Feature: F06.1 코드/파일 트리 우클릭 컨텍스트 복사 Popover
**Priority**: High (P0)
**Category**: UX Enhancement
**Target Component**: CodeViewerPanel, FileTreePanel, App Shell, Tests
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue` (신규 항목 `F06.1` 추가)

**Description**:
코드 뷰어와 파일 트리에 우클릭 컨텍스트 메뉴(popover)를 도입해 복사 진입점을 추가한다.
코드 뷰어에서는 선택 라인 내용 복사/상대경로 복사를 제공하고,
파일 트리에서는 파일 항목 우클릭 시 상대경로 복사를 제공한다.

**Acceptance Criteria**:
- [ ] 코드 라인 우클릭 시 커서 근처에 컨텍스트 popover가 표시된다.
- [ ] 코드 popover에서 `Copy Selected Content`를 실행하면 현재 선택 범위 텍스트가 복사된다.
- [ ] 코드 popover에서 `Copy Relative Path`를 실행하면 활성 파일 상대경로가 복사된다.
- [ ] 파일 트리의 파일 항목 우클릭 시 `Copy Relative Path` popover가 표시되고 복사된다.
- [ ] 우클릭 라인이 기존 선택 범위 안이면 선택을 유지하고, 범위 밖이면 해당 라인 단일 선택으로 전환된다.
- [ ] popover는 외부 클릭/ESC/액션 완료 시 닫힌다.
- [ ] 멀티 워크스페이스 전환 후에도 복사 결과는 active workspace 기준으로 일관 동작한다.

**Technical Notes**:
- 경로 복사 포맷은 절대경로가 아닌 `relative path`로 고정한다.
- F06 툴바 액션(상단 버튼) 구현과 충돌하지 않도록 복사 페이로드 유틸을 재사용 가능하게 분리한다.

**Dependencies**:
- F03 라인 선택 상태 모델
- F03.5 active workspace 정책
- F04.1 popover 상호작용 패턴

## Improvements

### Improvement: F06 복사 UX를 툴바 + 컨텍스트 메뉴 2채널로 명시
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `4.6 Context Toolbar` 및 `12.2 Priority Queue > F06`
**Current State**: 툴바 중심 복사만 계획되어 있어 탐색 컨텍스트(코드/파일 우클릭)에서 직접 복사가 어렵다.
**Proposed**: F06은 툴바 액션을 유지하고, F06.1에서 컨텍스트 메뉴 복사를 추가해 접근 경로를 보완한다.
**Reason**: 사용자가 코드/파일 탐색 중 즉시 복사를 수행할 수 있어 작업 전환 비용이 줄어든다.

### Improvement: CodeViewer 우클릭 selection 정책 고정
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `7. 상태 모델 (초안)` 또는 `6.3 CodeViewerPanel`
**Current State**: 우클릭 시 selection 변경 규칙이 정의되어 있지 않다.
**Proposed**: 우클릭 지점이 기존 선택 범위 안이면 selection 유지, 범위 밖이면 해당 라인 단일 선택으로 전환.
**Reason**: 멀티라인 복사 흐름을 보호하면서 단일라인 빠른 복사 UX도 확보한다.

## Bug Reports

해당 없음

## Component Changes

### New Component: Copy Action Popover (`src/context-menu/copy-action-popover.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6. 컴포넌트 상세`
**Change Type**: New Component

**Changes**:
- 커서 기준 위치에 표시되는 재사용 popover UI
- 액션 버튼 목록(`Copy Selected Content`, `Copy Relative Path`, `Close`) 지원
- dismiss(외부 클릭/ESC/완료 시 닫힘) 지원

### New Component: Copy Payload Utility (`src/context-menu/copy-payload.ts`)
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel` / `4.6 Context Toolbar`
**Change Type**: New Supporting Module

**Changes**:
- 선택 범위 텍스트 추출 유틸
- 상대경로/선택 범위 기반 복사 payload 조합 유틸
- F06/F06.1에서 재사용 가능한 복사 포맷 규칙 제공

### Update Component: CodeViewerPanel (`src/code-viewer/code-viewer-panel.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`
**Change Type**: Enhancement

**Changes**:
- 코드 라인 우클릭 이벤트 처리
- 우클릭 selection 유지/전환 규칙 적용
- 컨텍스트 popover 액션 연결(선택 내용 복사/상대경로 복사)

### Update Component: FileTreePanel (`src/file-tree/file-tree-panel.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.2 FileTreePanel`
**Change Type**: Enhancement

**Changes**:
- 파일 항목 우클릭 이벤트 처리
- 파일 상대경로 복사 popover 액션 연결

### Update Component: App (`src/App.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `3.1 코드베이스 인벤토리`
**Change Type**: Enhancement

**Changes**:
- 클립보드 복사 성공/실패 피드백 경로 연결(배너 또는 동등 메시지)
- CodeViewerPanel/FileTreePanel에 copy 액션 콜백 wiring

## Configuration Changes

해당 없음

## Notes

### Resolved Decisions
- [x] 경로 복사는 `relative path`로 고정
- [x] 우클릭 지점이 기존 선택 범위 안이면 selection 유지
- [x] 우클릭 지점이 기존 선택 범위 밖이면 해당 라인 단일 선택으로 전환

### Scope Boundary
- F06.1은 우클릭 컨텍스트 메뉴 복사 UX에 집중한다.
- 상단 툴바의 4개 액션 전체 완성(F06/F08/F09)은 별도 Feature 범위로 유지한다.

---

# Part 2: Implementation Plan

## Overview

F06.1은 코드 뷰어/파일 트리에 우클릭 컨텍스트 메뉴를 도입해 복사 액션 접근성을 개선하는 기능이다.
핵심은 selection 정책(유지/전환)과 relative path 복사 규칙을 명확히 고정하고,
기존 F04.1 popover 상호작용 패턴을 재사용해 회귀 리스크를 줄이는 것이다.

## Scope

### In Scope
- 코드 라인 우클릭 컨텍스트 popover
- 파일 트리 파일 항목 우클릭 컨텍스트 popover
- 선택 내용 복사 + 상대경로 복사
- 우클릭 selection 유지/전환 정책
- 단위/통합 테스트 및 회귀 검증

### Out of Scope
- 툴바 4개 액션 전체 구현(F06/F08/F09)
- 절대경로 복사 옵션
- 디렉터리 우클릭 액션 확장(복사 외)

## Components

1. **Copy Payload Utility**: 선택 텍스트/경로 복사 payload 생성
2. **Copy Action Popover**: 컨텍스트 메뉴 UI(재사용)
3. **CodeViewer Context Menu**: 우클릭 selection 정책 + copy actions
4. **FileTree Context Menu**: 파일 상대경로 copy action
5. **Integration Tests**: App 기준 우클릭 흐름/회귀 검증

## Implementation Phases

### Phase 1: Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | 복사 payload 유틸 설계/구현 | P0 | - | Copy Payload Utility |
| 2 | 재사용 컨텍스트 popover 컴포넌트 구현 | P0 | - | Copy Action Popover |

### Phase 2: CodeViewer Context Menu
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | CodeViewer 우클릭 selection 정책 + popover 액션 연결 | P0 | 1,2 | CodeViewer Context Menu |
| 4 | App 복사 콜백 wiring 및 피드백 경로 연결 | P1 | 3 | Integration Wiring |

### Phase 3: FileTree Context Menu
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 5 | FileTree 파일 우클릭 popover + relative path 복사 | P0 | 2 | FileTree Context Menu |
| 6 | 스타일/접근성 정리(포지셔닝, 키보드 dismiss) | P1 | 3,5 | UI Polish |

### Phase 4: Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 7 | 유틸/컴포넌트 단위 테스트 추가 | P0 | 1,2,3,5 | Tests |
| 8 | App 통합 테스트(우클릭 정책 + 멀티 워크스페이스 회귀) | P0 | 4,6,7 | Tests |

## Task Details

### Task 1: 복사 payload 유틸 설계/구현
**Component**: Copy Payload Utility  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
코드 선택 범위에서 복사 텍스트를 추출하고, relative path 기반 payload를 생성하는 유틸 함수를 구현한다.
F06 툴바 액션에서도 재사용 가능한 형태로 분리한다.

**Acceptance Criteria**:
- [ ] 선택 범위(`startLine`, `endLine`)에 해당하는 텍스트를 정확히 추출한다.
- [ ] 범위 역전/경계값(1 미만, 파일 길이 초과)을 안전하게 정규화한다.
- [ ] relative path 입력 시 복사 문자열이 일관된 규칙으로 생성된다.

**Target Files**:
- [C] `src/context-menu/copy-payload.ts` -- 복사 payload 유틸 신규 추가
- [C] `src/context-menu/copy-payload.test.ts` -- 유틸 단위 테스트

**Technical Notes**:
- `splitPreviewLines` 결과와 동일한 줄 분리 규칙을 사용한다.
- 향후 툴바 `Copy Selected Lines`와 충돌하지 않도록 포맷 함수를 분리한다.

**Dependencies**: -

---

### Task 2: 재사용 컨텍스트 popover 컴포넌트 구현
**Component**: Copy Action Popover  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
F04.1 링크 popover 패턴을 참고해 액션 리스트를 주입 가능한 공통 컨텍스트 popover를 구현한다.

**Acceptance Criteria**:
- [ ] 커서 좌표 기준 popover 위치가 viewport 바깥으로 벗어나지 않는다.
- [ ] ESC/외부 클릭으로 popover가 닫힌다.
- [ ] 액션 클릭 후 popover가 닫힌다.

**Target Files**:
- [C] `src/context-menu/copy-action-popover.tsx` -- 재사용 popover 컴포넌트
- [M] `src/App.css` -- 컨텍스트 popover 스타일 추가

**Technical Notes**:
- 기존 `spec-link-popover` 스타일과 충돌하지 않도록 별도 class prefix를 사용한다.
- 액션 버튼 label을 props로 받아 코드/파일 트리에서 재사용한다.

**Dependencies**: -

---

### Task 3: CodeViewer 우클릭 selection 정책 + popover 액션 연결
**Component**: CodeViewer Context Menu  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
코드 라인 버튼에 `onContextMenu`를 연결해 우클릭 정책을 적용하고, `Copy Selected Content`, `Copy Relative Path` 액션을 제공한다.

**Acceptance Criteria**:
- [ ] 우클릭 지점이 기존 selection 범위 안이면 selection이 유지된다.
- [ ] 우클릭 지점이 기존 selection 범위 밖이면 해당 라인 단일 selection으로 전환된다.
- [ ] `Copy Selected Content`는 현재 selection 텍스트를 복사한다.
- [ ] `Copy Relative Path`는 활성 파일 relative path를 복사한다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx` -- 우클릭/selection 정책/popover 액션 연결
- [M] `src/code-viewer/line-selection.ts` -- 우클릭 정책 보조 유틸(필요 시)

**Technical Notes**:
- `event.preventDefault()`로 브라우저 기본 context menu를 차단한다.
- 복사 API는 `navigator.clipboard.writeText` 사용, 실패 시 상위 피드백 콜백 호출.

**Dependencies**: 1, 2

---

### Task 4: App 복사 콜백 wiring 및 피드백 경로 연결
**Component**: Integration Wiring  
**Priority**: P1-High  
**Type**: Feature

**Description**:
App에서 CodeViewer/FileTree의 복사 요청 콜백을 연결하고, 클립보드 실패 시 배너 메시지를 표시한다.

**Acceptance Criteria**:
- [ ] CodeViewer/FileTree에서 복사 요청 시 공통 클립보드 함수가 호출된다.
- [ ] 복사 실패 시 사용자 피드백(배너)이 표시된다.
- [ ] 성공 시 기존 워크스페이스 상태가 변경되지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- 복사 콜백 주입 및 배너 피드백 연결
- [M] `src/workspace/workspace-context.tsx` -- `showBanner` 사용 경로 확인/보강(필요 시)

**Technical Notes**:
- `useWorkspace()`에서 이미 제공하는 `showBanner`를 활용해 추가 전역 상태 도입을 피한다.

**Dependencies**: 3

---

### Task 5: FileTree 파일 우클릭 popover + relative path 복사
**Component**: FileTree Context Menu  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
파일 트리의 파일 버튼에 우클릭 액션을 추가해 `Copy Relative Path` popover를 제공한다.

**Acceptance Criteria**:
- [ ] 파일 항목 우클릭 시 popover가 표시된다.
- [ ] `Copy Relative Path` 실행 시 해당 파일 relative path가 복사된다.
- [ ] 디렉터리 토글 동작/파일 클릭 선택 동작이 회귀하지 않는다.

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- 파일 항목 우클릭 + popover 연결
- [M] `src/App.tsx` -- FileTreePanel 복사 콜백 wiring

**Technical Notes**:
- 파일 우클릭은 선택 변경을 강제하지 않고 복사 액션만 수행한다.
- 디렉터리 항목 우클릭 액션은 본 범위에서 제외한다.

**Dependencies**: 2

---

### Task 6: 스타일/접근성 정리
**Component**: UI Polish  
**Priority**: P1-High  
**Type**: Feature

**Description**:
코드/파일 트리 컨텍스트 popover의 공통 스타일을 정리하고 접근성 속성(aria-label, keyboard dismiss)을 고정한다.

**Acceptance Criteria**:
- [ ] dark theme에서 가독성 있는 popover 스타일이 적용된다.
- [ ] 팝오버가 작은 뷰포트에서도 화면 밖으로 벗어나지 않는다.
- [ ] ESC/외부 클릭 dismiss 동작이 일관된다.

**Target Files**:
- [M] `src/App.css` -- 컨텍스트 popover 스타일/상태 스타일
- [M] `src/context-menu/copy-action-popover.tsx` -- 접근성 속성 보강

**Technical Notes**:
- 기존 `spec-link-popover`와 UI 토큰을 공유하되 class namespace를 분리한다.

**Dependencies**: 3, 5

---

### Task 7: 유틸/컴포넌트 단위 테스트 추가
**Component**: Tests  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
복사 payload 유틸과 CodeViewer/FileTree 컨텍스트 메뉴 동작을 단위 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] 선택 범위 텍스트 추출/정규화 테스트가 추가된다.
- [ ] CodeViewer 우클릭 selection 정책(유지/전환) 테스트가 추가된다.
- [ ] FileTree 파일 우클릭 popover/복사 테스트가 추가된다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- 우클릭 정책/액션 테스트
- [C] `src/file-tree/file-tree-panel.test.tsx` -- 파일 우클릭 컨텍스트 메뉴 테스트
- [M] `src/context-menu/copy-payload.test.ts` -- 유틸 테스트 보강

**Technical Notes**:
- `navigator.clipboard.writeText` mock을 공통 헬퍼로 정리하면 테스트 중복을 줄일 수 있다.

**Dependencies**: 1, 2, 3, 5

---

### Task 8: App 통합 테스트(우클릭 정책 + 멀티 워크스페이스 회귀)
**Component**: Tests  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
App 통합 시나리오에서 코드/파일 트리 우클릭 복사 흐름이 기존 동작(F03.5/F04/F05)과 충돌하지 않는지 검증한다.

**Acceptance Criteria**:
- [ ] 코드 뷰어 우클릭으로 선택 내용 복사가 수행된다.
- [ ] 파일 트리 우클릭으로 relative path 복사가 수행된다.
- [ ] 멀티 워크스페이스 전환 후 복사 결과가 active workspace 기준으로 유지된다.
- [ ] 기존 F05 링크 점프/하이라이트 테스트가 회귀하지 않는다.

**Target Files**:
- [M] `src/App.test.tsx` -- 통합 시나리오 추가
- [M] `src/App.tsx` -- 테스트 가능 이벤트 바인딩 안정화(필요 시)

**Technical Notes**:
- 기존 `window.workspace` mock 패턴을 재사용해 테스트 안정성을 유지한다.

**Dependencies**: 4, 6, 7

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| Phase 1 | 2 | 2 | `src/App.css`는 Task 2 이후 변경 시점 주의 |
| Phase 2 | 2 | 1 | `src/code-viewer/code-viewer-panel.tsx`, `src/App.tsx` 순차 권장 |
| Phase 3 | 2 | 1 | `src/App.tsx`(Task 4/5), `src/App.css`(Task 2/6) 충돌 가능 |
| Phase 4 | 2 | 1 | `src/App.test.tsx` 중심 통합 회귀로 순차 권장 |

Conflict Notes:
- Task 3/4/5/8은 `src/App.tsx` 연동이 겹치므로 순차 실행이 안전하다.
- Task 2/6은 popover 스타일 파일(`src/App.css`) 충돌 가능성이 높다.
- Task 7의 테스트 추가는 Task 3/5 이후 병행 가능하지만, `code-viewer-panel.test.tsx` 충돌 시 순차 처리한다.

## Risks & Mitigations

1. **Risk**: 우클릭 정책으로 selection 상태가 예기치 않게 변할 수 있음  
   **Mitigation**: 범위 안/밖 정책을 단위 테스트로 고정
2. **Risk**: 클립보드 API 실패 시 사용자 혼란  
   **Mitigation**: 실패 시 배너 피드백 제공
3. **Risk**: popover 구현 중 기존 클릭/토글 UX 회귀  
   **Mitigation**: App 통합 테스트에 파일 선택/디렉터리 토글/링크 점프 회귀 케이스 포함

## Open Questions

- 현재 없음 (핵심 정책 확정 완료)

---

## Next Steps

1. `spec-update-todo`로 F06.1 항목을 `/_sdd/spec/main.md`에 반영
2. `implementation` 스킬로 Part 2 태스크(T1~T8) 실행
3. 구현/검증 완료 후 `spec-update-done`으로 상태 동기화
