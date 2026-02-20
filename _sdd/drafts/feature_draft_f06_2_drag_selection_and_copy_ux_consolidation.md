# Feature Draft: F06.2 Drag Selection + Copy UX Consolidation

**Date**: 2026-02-20
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-20
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F06.2 드래그 라인 선택 + 복사 UX 통합
**Priority**: High (P0)
**Category**: UX Enhancement
**Target Component**: CodeViewerPanel, FileTreePanel, App, Header Actions, Tests
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue` (신규 항목 `F06.2` 추가)

**Description**:
코드 뷰어의 다중 라인 선택을 `Shift+Click` 외에 `마우스 드래그`로도 가능하게 확장하고,
복사 UX를 우클릭 컨텍스트 메뉴 중심으로 통합한다.

요구사항 반영 포인트:
- 코드 우클릭 메뉴에 `Copy Both`(경로+본문, 기존 F06 포맷) 추가
- 상단 툴바의 `Copy Selected Lines`, `Copy Active File Path` 제거
- 파일 트리에서 파일뿐 아니라 디렉터리도 `Copy Relative Path` 지원

**Acceptance Criteria**:
- [ ] 코드 뷰어에서 마우스 드래그로 연속 라인 선택이 가능하다.
- [ ] 기존 `Shift+Click` 선택 동작은 유지된다.
- [ ] 코드 우클릭 메뉴에서 아래 3개 액션을 제공한다.
  - `Copy Selected Content`
  - `Copy Both` (형식: `relative/path:Lx-Ly` + 본문)
  - `Copy Relative Path`
- [ ] 상단 툴바에서 `Copy Active File Path`, `Copy Selected Lines` 버튼이 제거된다.
- [ ] 파일 트리에서 파일/디렉터리 모두 우클릭 시 `Copy Relative Path`를 제공한다.
- [ ] 멀티 워크스페이스 환경에서 복사 결과는 항상 active workspace 기준이다.

**Technical Notes**:
- `Copy Both`는 내부적으로 F06의 `Copy Selected Lines` payload 포맷을 그대로 사용한다.
- 파일 트리 디렉터리 우클릭은 토글(onClick)과 독립 동작해야 한다.
- 드래그 선택 중 브라우저 기본 텍스트 선택/컨텍스트 충돌을 방지한다.

**Dependencies**:
- F03 라인 선택 상태 모델
- F06 copy payload 포맷
- F06.1 우클릭 popover 패턴

## Improvements

### Improvement: 복사 진입점 단순화 (Toolbar -> Context Menu)
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `4.6 Context Toolbar`, `6.2 FileTreePanel`, `6.3 CodeViewerPanel`
**Current State**: 동일 복사 기능이 툴바와 컨텍스트 메뉴에 분산되어 있고, 파일 경로 복사는 툴바 의존도가 남아 있다.
**Proposed**: 복사 UX를 우클릭 컨텍스트 메뉴 중심으로 통합하고 툴바 복사 2버튼은 제거한다.
**Reason**: 탐색 맥락(코드/트리)에서 즉시 복사 가능해지고 상단 헤더 복잡도가 줄어든다.

### Improvement: FileTree 우클릭 복사 범위 확장 (파일 -> 파일+디렉터리)
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `6.2 FileTreePanel`
**Current State**: 파일만 우클릭 복사가 가능하며 디렉터리는 미지원이다.
**Proposed**: 파일/디렉터리 모두 `Copy Relative Path` 지원.
**Reason**: 디렉터리 경로 복사 수요를 동일 인터랙션으로 충족.

### Improvement: F08/F09 진입점을 Toolbar 비의존 구조로 재정의
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `4.6 Context Toolbar`, `12.2 Priority Queue > F08`, `12.2 Priority Queue > F09`
**Current State**: F08/F09가 toolbar 기반 액션 확장 맥락으로 읽힐 여지가 있다.
**Proposed**:
- F08: 워크스페이스 레벨 액션 영역(Workspace switcher 인접) 기반으로 정의
- F09: SpecViewer 섹션/헤딩 컨텍스트 기반으로 정의
- Toolbar 삭제 이후에도 F08/F09 기능 목적은 유지하되 진입점만 재배치
**Reason**: F06.2에서 toolbar를 제거해도 후속 기능 로드맵(F08/F09)을 자연스럽게 연결하기 위함.

## Bug Reports

해당 없음

## Component Changes

### Update Component: CodeViewerPanel (`src/code-viewer/code-viewer-panel.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`
**Change Type**: Enhancement

**Changes**:
- 드래그 기반 multi-line 선택 인터랙션 추가
- 우클릭 메뉴 액션에 `Copy Both` 추가
- 기존 우클릭 selection 유지/전환 정책 유지

### Update Component: FileTreePanel (`src/file-tree/file-tree-panel.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.2 FileTreePanel`
**Change Type**: Enhancement

**Changes**:
- 디렉터리 버튼에도 우클릭 컨텍스트 메뉴 연결
- 파일/디렉터리 공통 `Copy Relative Path` 처리

### Update Component: App (`src/App.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `3.1 코드베이스 인벤토리`
**Change Type**: Enhancement

**Changes**:
- 코드 우클릭 `Copy Both` 액션 콜백 추가
- 툴바 복사 2버튼 콜백 제거
- 복사 실패 배너 정책은 유지

### Delete Component: ContextToolbar (`src/toolbar/context-toolbar.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `4.6 Context Toolbar`
**Change Type**: Deletion

**Changes**:
- toolbar 컴포넌트 완전 제거
- F08/F09는 toolbar가 아닌 신규 진입점으로 스펙 정의를 이동

### Update Supporting Module: Copy Payload (`src/context-copy/copy-payload.ts`)
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`, `4.6 Context Toolbar`
**Change Type**: Reuse/No-Format-Change

**Changes**:
- 기존 `buildCopySelectedLinesPayload` 재사용 경로를 CodeViewer 우클릭 흐름으로 확장
- payload 포맷 변경 없음

## Configuration Changes

해당 없음

## Notes

### Resolved Decisions
- [x] 복사 UX는 우클릭 컨텍스트 메뉴 중심으로 통합
- [x] 코드 우클릭 라벨은 `Copy Both`로 고정
- [x] `Copy Active File Path` 툴바 버튼 제거
- [x] `ContextToolbar`는 완전 제거
- [x] 파일 트리 디렉터리도 `Copy Relative Path` 지원

### Scope Boundary
- 이번 범위는 복사 UX/선택 UX 개선(F06.2)까지로 제한한다.
- F08/F09 구현 자체는 범위 밖이며, 본 문서에서는 진입점 재정의만 Part 1 스펙 패치로 반영한다.

---

# Part 2: Implementation Plan

## Overview

F06.2는 선택 UX와 복사 UX를 동시에 단순화하는 기능이다.
핵심은 드래그 선택 도입과 복사 진입점 재배치(툴바 제거 + 우클릭 통합)이며,
기존 payload 포맷과 멀티 워크스페이스 규칙은 그대로 유지한다.

## Scope

### In Scope
- CodeViewer drag multi-line selection
- CodeViewer 우클릭 `Copy Both` 액션 추가
- ContextToolbar 복사 2버튼 제거
- FileTree 디렉터리 우클릭 `Copy Relative Path` 지원
- 단위/통합 테스트 갱신

### Out of Scope
- F08/F09 액션 구현
- 절대경로 복사 옵션
- 디렉터리 우클릭 추가 액션(삭제/열기 등)
- selection 모델의 비연속 선택

## Components

1. **Selection Interaction Layer**: drag 기반 라인 범위 선택
2. **Copy Action Layer**: 코드 우클릭 3액션(`Content`, `Both`, `Path`)
3. **Toolbar Simplification Layer**: 복사 버튼 제거
4. **FileTree Context Layer**: 디렉터리 우클릭 복사
5. **Validation Layer**: unit/component/integration 회귀 고정

## Implementation Phases

### Phase 1: Selection and Copy Action Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | CodeViewer drag selection 상태/이벤트 추가 | P0 | - | Selection Interaction Layer |
| T2 | CodeViewer 우클릭 `Copy Both` 액션 추가 | P0 | T1 | Copy Action Layer |

### Phase 2: App/Toolbar Consolidation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | App 복사 콜백 재배선 (`Copy Both` 우클릭 경로) | P0 | T2 | Copy Action Layer |
| T4 | ContextToolbar 복사 2버튼 제거 및 App 헤더 정리 | P0 | T3 | Toolbar Simplification Layer |

### Phase 3: FileTree Expansion + Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | FileTree 디렉터리 우클릭 `Copy Relative Path` 지원 | P0 | - | FileTree Context Layer |
| T6 | 테스트 보강 및 회귀 검증 | P0 | T1,T2,T3,T4,T5 | Validation Layer |

## Task Details

### Task T1: CodeViewer drag selection 상태/이벤트 추가
**Component**: Selection Interaction Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
코드 라인에서 마우스 드래그로 연속 범위를 선택할 수 있도록 CodeViewer 이벤트 모델을 확장한다.

**Acceptance Criteria**:
- [ ] `mousedown` 후 라인 이동(`mouseenter`/동등 이벤트) 시 selection이 연속 범위로 갱신된다.
- [ ] `mouseup`으로 drag selection이 종료된다.
- [ ] 기존 `Shift+Click` 선택은 그대로 동작한다.
- [ ] active file 변경 시 drag 상태가 안전하게 초기화된다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx` -- drag state + pointer/mouse 이벤트 처리
- [M] `src/code-viewer/line-selection.ts` -- 범위 계산 유틸 보강(필요 시)
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- drag selection 시나리오 테스트 추가

**Technical Notes**:
- 선택 범위 계산은 기존 정규화 규칙(`normalizeLineSelectionRange`)을 재사용한다.
- drag 중 기본 텍스트 선택과 충돌하지 않게 처리한다.

**Dependencies**: -

---

### Task T2: CodeViewer 우클릭 `Copy Both` 액션 추가
**Component**: Copy Action Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
코드 우클릭 메뉴에 `Copy Both`(경로+본문) 액션을 추가하고 기존 액션과 공존시킨다.

**Acceptance Criteria**:
- [ ] 코드 우클릭 popover에 `Copy Both`가 표시된다.
- [ ] 실행 시 현재 selection 기준 payload(`relative/path:Lx-Ly + 본문`)가 생성 요청된다.
- [ ] 기존 `Copy Selected Content`, `Copy Relative Path` 동작은 회귀하지 않는다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx` -- popover 액션 목록 확장
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- 우클릭 액션 3종 검증 추가

**Technical Notes**:
- 우클릭 selection 유지/전환 정책(F06.1)은 그대로 유지한다.
- 액션 라벨은 `Copy Both`로 고정한다.

**Dependencies**: T1

---

### Task T3: App 복사 콜백 재배선 (`Copy Both` 우클릭 경로)
**Component**: Copy Action Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
CodeViewer의 `Copy Both` 우클릭 요청을 App에서 받아 기존 payload 유틸로 클립보드에 복사한다.

**Acceptance Criteria**:
- [ ] CodeViewer 우클릭 `Copy Both`가 `buildCopySelectedLinesPayload`를 사용한다.
- [ ] 클립보드 실패 시 기존 텍스트 배너가 표시된다.
- [ ] 성공 시 워크스페이스/선택 상태가 불필요하게 변경되지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- 새로운 우클릭 copy-both 콜백 추가
- [M] `src/context-copy/copy-payload.ts` -- 포맷 재사용/필요 시 타입 정리
- [M] `src/App.test.tsx` -- 우클릭 copy-both 통합 테스트 추가

**Technical Notes**:
- payload 포맷은 변경하지 않는다.
- `writeToClipboard` 경로를 재사용해 실패 처리 일관성을 유지한다.

**Dependencies**: T2

---

### Task T4: ContextToolbar 복사 2버튼 제거 및 App 헤더 정리
**Component**: Toolbar Simplification Layer  
**Priority**: P0-Critical  
**Type**: Refactor

**Description**:
복사 UX 통합 정책에 맞춰 상단 툴바의 `Copy Active File Path`, `Copy Selected Lines` 버튼을 제거한다.

**Acceptance Criteria**:
- [ ] 상단 헤더에서 복사 2버튼이 더 이상 렌더되지 않는다.
- [ ] 관련 비활성화 상태 계산/콜백 코드가 제거된다.
- [ ] 기존 워크스페이스 전환/열기/닫기 동작은 유지된다.

**Target Files**:
- [M] `src/App.tsx` -- toolbar 복사 wiring 제거
- [D] `src/toolbar/context-toolbar.tsx` -- toolbar 컴포넌트 제거
- [D] `src/toolbar/context-toolbar.test.tsx` -- 연관 테스트 제거
- [M] `src/App.test.tsx` -- 툴바 버튼 가정 테스트 정리

**Technical Notes**:
- toolbar 완전 제거를 확정하고, F08/F09는 추후 별도 액션 진입점으로 구현한다.

**Dependencies**: T3

---

### Task T5: FileTree 디렉터리 우클릭 `Copy Relative Path` 지원
**Component**: FileTree Context Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
파일 트리 디렉터리 버튼에도 우클릭 메뉴를 연결해 경로 복사를 가능하게 한다.

**Acceptance Criteria**:
- [ ] 파일/디렉터리 모두 우클릭 시 `Copy Relative Path` 메뉴가 표시된다.
- [ ] 디렉터리 우클릭 복사 시 해당 디렉터리 상대경로가 전달된다.
- [ ] 디렉터리 좌클릭 토글 동작은 회귀하지 않는다.

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- 디렉터리 우클릭 핸들러 추가
- [M] `src/file-tree/file-tree-panel.test.tsx` -- 디렉터리 우클릭 복사 테스트 추가
- [M] `src/App.test.tsx` -- App 통합 디렉터리 복사 시나리오 추가

**Technical Notes**:
- 디렉터리 우클릭은 active file 변경을 유발하지 않는다.
- 경로 포맷은 기존과 동일한 relative path 문자열이다.

**Dependencies**: -

---

### Task T6: 테스트 보강 및 회귀 검증
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
새 UX 요구사항(드래그 선택, 우클릭 통합, 툴바 제거, 디렉터리 복사)을 자동 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] CodeViewer 단위 테스트에서 drag selection 동작이 검증된다.
- [ ] CodeViewer 우클릭 3액션이 검증된다.
- [ ] FileTree 파일/디렉터리 우클릭 복사가 검증된다.
- [ ] App 통합 테스트에서 툴바 복사 버튼 미노출 + 우클릭 복사 동작이 검증된다.
- [ ] 전체 테스트/린트/빌드 게이트가 통과한다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- drag + context actions 테스트 보강
- [M] `src/file-tree/file-tree-panel.test.tsx` -- directory copy 테스트 보강
- [M] `src/App.test.tsx` -- toolbar 제거 + 우클릭 통합 플로우 회귀 테스트
- [M] `src/context-copy/copy-payload.test.ts` -- selected-lines 포맷 회귀 확인(필요 시)

**Technical Notes**:
- 기존 F04/F05/F06/F06.1 회귀 시나리오와 충돌 없이 검증하도록 테스트 이름/의도를 명확히 분리한다.

**Dependencies**: T1,T2,T3,T4,T5

## Parallel Execution Summary

- 최대 병렬 후보:
  - Group A: `T1`, `T5` (파일 충돌 없음)
  - Group B: `T2`, `T3` (순차 권장: `CodeViewer` API -> `App` wiring)
  - Group C: `T4` (App/Toolbar 결합으로 단독)
  - Group D: `T6` (최종 검증)

- 주요 충돌 지점:
  - `src/App.tsx`, `src/App.test.tsx`는 여러 태스크가 참조하므로 의미적 충돌 위험이 높다.
  - `src/code-viewer/code-viewer-panel.tsx`는 drag + context action이 결합되므로 `T1/T2` 순차가 안전하다.

## Risks

1. 드래그 선택 이벤트가 우클릭/점프 스크롤(F05)과 충돌할 수 있음
2. 툴바 제거로 기존 테스트 다수가 깨질 수 있음
3. 디렉터리 우클릭 추가 시 토글 UX(좌클릭)와 이벤트 간섭 가능성

## Open Questions

- 없음 (모두 결정됨)

## Recommended Next Step

1. `spec-update-todo`로 F06.2와 F08/F09 진입점 재정의를 `/_sdd/spec/main.md`에 반영
2. 이후 `implementation-plan` 없이 바로 `implementation` 진행 가능 (작업 크기: S~M)
