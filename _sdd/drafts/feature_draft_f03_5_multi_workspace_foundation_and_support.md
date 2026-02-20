# Feature Draft: F03.5 Multi-Workspace Foundation + Support

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

### Feature: F03.5 멀티 워크스페이스 지원(기반 + 동작)
**Priority**: High (P0)
**Category**: Core Feature
**Target Component**: WorkspaceProvider, FileTreePanel, App Shell, Workspace Switcher, Tests
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue` (신규 항목 `F03.5` 추가)

**Description**:
단일 워크스페이스 상태를 다중 워크스페이스 상태 모델로 확장한다. `Open Workspace`는 항상 "추가"로 동작하고, 이미 열린 경로를 다시 열면 중복 생성하지 않고 기존 워크스페이스를 활성화한다. 워크스페이스 닫기/제거 UX를 포함하고, 워크스페이스별 파일/뷰 상태(파일 트리 폴더 펼침 포함)는 유지하되, 워크스페이스 전환 시 코드 선택 범위(`selectionRange`)는 리셋한다.

**Acceptance Criteria**:
- [ ] `Open Workspace`는 기존 워크스페이스를 대체하지 않고 항상 추가 동작을 수행한다.
- [ ] 같은 `rootPath`를 다시 열면 새 항목을 만들지 않고 기존 워크스페이스로 포커스가 이동한다.
- [ ] 활성 워크스페이스 전환 UI(드롭다운 등)가 제공된다.
- [ ] 활성 워크스페이스를 닫기/제거할 수 있다.
- [ ] `activeFile`, `activeFileContent`, 파일 트리 등 워크스페이스별 상태가 전환 후에도 유지된다.
- [ ] 파일 트리 폴더 펼침 상태(`expandedDirectories`)가 워크스페이스별로 복원된다.
- [ ] 워크스페이스 전환 시 `selectionRange`는 리셋된다.
- [ ] 기존 F01/F02/F03/F03.1 동작이 회귀 없이 유지된다.

**Technical Notes**:
- 상태관리 기술은 기존과 동일하게 React Context + `useState` 계열을 유지한다.
- 멀티 워크스페이스 식별자는 `rootPath` 기반의 안정 ID(정규화 경로)를 사용한다.
- 중복 경로 정책은 "중복 금지 + 기존 포커스"로 고정한다.
- 워크스페이스 제거 시 활성 워크스페이스였다면 최근 순서 기준으로 다음 활성 워크스페이스를 결정한다.

**Dependencies**:
- F03.1 완료 상태

## Improvements

### Improvement: 상태 모델을 멀티 워크스페이스 구조로 명시
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `7. 상태 모델 (초안)`
**Current State**: 단일 `rootPath`/`fileTree`/`activeFile` 구조 중심
**Proposed**: `activeWorkspaceId`, `workspaceOrder`, `workspacesById` 기반 모델 및 전환 규칙 추가
**Reason**: 후속 F04/F05/F06 기능이 단일 워크스페이스 가정에 묶이지 않도록 조기 정렬

### Improvement: 범위 문서에서 멀티 워크스페이스 위치 명확화
**Priority**: Medium (P1)
**Target Section**: `/_sdd/spec/main.md` > `2. 범위` 및 `12.2 Priority Queue`
**Current State**: 멀티 워크스페이스는 Non-Goal로 표기
**Proposed**: MVP 외 확장 항목으로 `F03.5`를 추가하고 구현 순서를 명시
**Reason**: 실제 구현 계획과 문서 기준의 충돌 방지

### Improvement: 테스트 기준에 멀티 워크스페이스 정책 추가
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `13. 테스트 및 수용 기준`
**Current State**: 단일 워크스페이스 흐름 검증 중심
**Proposed**: `추가`, `중복 포커스`, `닫기/제거`, `전환 시 selection 리셋`, `워크스페이스별 상태(트리 펼침 포함) 유지` 시나리오를 필수 항목으로 추가
**Reason**: 전환/중복 처리 정책 회귀를 조기에 차단

## Bug Reports

해당 없음 (신규 기능 확장)

## Component Changes

### Update Component: WorkspaceProvider (`src/workspace/workspace-context.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.1 WorkspaceProvider` 및 `7. 상태 모델 (초안)`
**Change Type**: Refactor + Enhancement

**Changes**:
- 단일 상태에서 `workspacesById + activeWorkspaceId + workspaceOrder` 구조로 전환
- `openWorkspace()`를 "항상 추가 + 중복 시 포커스" 정책으로 변경
- `setActiveWorkspace(id)` 액션 추가
- `closeWorkspace(id)` 액션 추가(활성 워크스페이스 재선정 포함)
- 워크스페이스별 `expandedDirectories` 보관 및 복원
- 워크스페이스 전환 시 `selectionRange` 리셋 규칙 반영

### New Component: Workspace Switcher (`src/workspace/workspace-switcher.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.5 Toolbar` 또는 App Shell 관련 섹션
**Change Type**: New Component

**Changes**:
- 활성 워크스페이스 선택 드롭다운 UI 추가
- 워크스페이스 목록 표시 및 활성 전환 이벤트 제공
- 워크스페이스별 닫기/제거 액션 제공
- 경로 표시 축약(`~`) 규칙 재사용

### Update Component: FileTreePanel (`src/file-tree/file-tree-panel.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.2 FileTreePanel` 및 `7. 상태 모델 (초안)`
**Change Type**: Enhancement

**Changes**:
- 로컬 `expandedDirectories` 상태를 워크스페이스 세션 상태와 연동
- 워크스페이스 전환 시 각 세션의 펼침 상태를 복원

### Update Component: App Shell (`src/App.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `4. 목표 UX/레이아웃` 및 `6. 컴포넌트 상세`
**Change Type**: Enhancement

**Changes**:
- 헤더에 workspace switcher 통합
- 현재 활성 워크스페이스 기준으로 좌/중/우 패널 데이터 바인딩
- 기존 "Open Workspace" 버튼을 "Add Workspace" 의미로 운영

## Configuration Changes

해당 없음

## Notes

### Policy Decisions (확정)
- `Open Workspace`: 항상 추가
- 중복 `rootPath`: 기존 워크스페이스 포커스
- 워크스페이스 제거 UX: F03.5 범위에 포함
- 파일 트리 폴더 펼침 상태: 워크스페이스별 복원
- 전환 정책: 워크스페이스별 상태 유지, `selectionRange`만 전환 시 리셋

### Scope Boundary
- 본 기능은 멀티 워크스페이스 기반/핵심 전환 UX에 집중한다.
- 워크스페이스별 watcher 수명주기와 세션 영속화는 후속 Feature로 분리한다.

---

# Part 2: Implementation Plan

## Overview

F03.5는 기존 단일 워크스페이스 Context를 멀티 워크스페이스 모델로 전환하고, 사용자에게 전환/닫기 UI를 제공하는 기능이다. 핵심 정책(항상 추가, 중복 포커스, 워크스페이스별 상태 복원, selection 리셋)을 코드와 테스트에 동시에 고정한다.

## Scope

### In Scope
- 멀티 워크스페이스 상태 모델 도입 (`workspacesById`, `activeWorkspaceId`, `workspaceOrder`)
- `openWorkspace()` 정책 변경 (항상 추가, 중복 시 포커스)
- 활성 워크스페이스 전환 액션 및 UI 도입
- 워크스페이스 닫기/제거 액션 및 UI 도입
- 파일 트리 폴더 펼침 상태의 워크스페이스별 저장/복원
- 전환 시 `selectionRange` 리셋 규칙 반영
- 멀티 워크스페이스 정책 테스트 추가

### Out of Scope
- 워크스페이스별 파일 워처 (F07 연계)
- 멀티 워크스페이스 세션 영속화(앱 재실행 복원)

## Components
1. **Workspace Model (`src/workspace/workspace-model.ts`)**: 멀티 상태 구조와 순수 정책 함수
2. **WorkspaceProvider (`src/workspace/workspace-context.tsx`)**: 상태 저장/전환/파일 읽기 오케스트레이션
3. **Workspace Switcher (`src/workspace/workspace-switcher.tsx`)**: 활성 선택 + 닫기/제거 UI
4. **FileTreePanel (`src/file-tree/file-tree-panel.tsx`)**: 워크스페이스별 펼침 상태 복원
5. **App Shell (`src/App.tsx`, `src/App.css`)**: 헤더/레이아웃 통합
6. **Tests (`src/workspace/*.test.ts`, `src/App.test.tsx`)**: 정책 + 통합 검증

## Implementation Phases

### Phase 1: Multi-Workspace State Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | 멀티 워크스페이스 모델/정책 유틸 도입 | P0 | - | Workspace Model |
| 2 | WorkspaceProvider를 멀티 상태 구조로 리팩토링 | P0 | 1 | WorkspaceProvider |

### Phase 2: UI Integration
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | Workspace Switcher 컴포넌트 구현 | P1 | 2 | Workspace Switcher |
| 4 | App 헤더에 switcher 통합 + Add Workspace 흐름 연결 | P0 | 3 | App Shell |
| 5 | 멀티 워크스페이스 전환 UI 스타일 반영 | P2 | 4 | App Shell |

### Phase 3: Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 6 | 단위 테스트: 추가/중복 포커스/전환 정책 검증 | P0 | 1 | Tests |
| 7 | 통합 테스트: 다중 워크스페이스 전환 + selection 리셋 검증 | P0 | 2,4 | Tests |

## Task Details

### Task 1: 멀티 워크스페이스 모델/정책 유틸 도입
**Component**: Workspace Model
**Priority**: P0-Critical
**Type**: Refactor

**Description**:
멀티 워크스페이스 상태 모델과 정책 함수를 별도 모듈로 분리한다. `add-or-focus`, `set-active`, `close`, `workspace 조회` 로직을 순수 함수로 정의해 Context 복잡도를 낮춘다.

**Acceptance Criteria**:
- [ ] `WorkspaceId`, `WorkspaceSession`(또는 동등 타입)이 정의된다.
- [ ] `activeWorkspaceId`, `workspaceOrder`, `workspacesById`를 다루는 순수 함수가 제공된다.
- [ ] 중복 경로 입력 시 "신규 생성 없음 + 기존 포커스" 정책이 함수 레벨에서 보장된다.
- [ ] 워크스페이스 제거 시 활성 워크스페이스 재선정 정책이 함수 레벨에서 보장된다.

**Target Files**:
- [C] `src/workspace/workspace-model.ts` -- 멀티 워크스페이스 타입/순수 정책 함수 추가

**Technical Notes**:
- ID는 정규화된 `rootPath` 문자열을 우선 사용한다.
- UI/IPC 의존 없는 순수 함수 형태로 테스트 가능성을 높인다.

**Dependencies**: -

---

### Task 2: WorkspaceProvider 멀티 상태 리팩토링
**Component**: WorkspaceProvider
**Priority**: P0-Critical
**Type**: Refactor

**Description**:
단일 상태 보관 방식을 멀티 워크스페이스 구조로 전환한다. 현재 활성 워크스페이스를 계산해 기존 컴포넌트 소비 인터페이스를 최대한 유지한다.

**Acceptance Criteria**:
- [ ] `openWorkspace()`가 "항상 추가"로 동작한다.
- [ ] 중복 `rootPath` 재오픈 시 기존 워크스페이스가 활성화된다.
- [ ] `closeWorkspace()`가 동작하고 `workspaceOrder`/`activeWorkspaceId`가 정합성을 유지한다.
- [ ] `selectFile()`는 활성 워크스페이스에만 적용된다.
- [ ] `expandedDirectories`가 워크스페이스 세션별로 분리 저장된다.
- [ ] 워크스페이스 전환 시 `selectionRange`가 리셋된다.
- [ ] `activeFile`, `activeFileContent` 등은 워크스페이스별로 분리 보관된다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 멀티 상태 구조/액션/읽기 흐름 리팩토링
- [M] `src/workspace/use-workspace.ts` -- 확장된 context 값(전환 액션 포함) 소비 타입 동기화
- [M] `electron/electron-env.d.ts` -- 필요 시 타입 노출 확장(`WorkspaceId`는 renderer 내부 타입으로 유지 가능)
- [M] `src/file-tree/file-tree-panel.tsx` -- 펼침 상태를 외부 제어 가능한 prop 기반으로 확장(필요 시)

**Technical Notes**:
- 파일 읽기 경합 방지를 위해 request token을 워크스페이스별로 관리한다.
- 전역 배너는 유지하되 워크스페이스별 오류 상태(`readFileError`)는 세션 내부에 둔다.

**Dependencies**: 1

---

### Task 3: Workspace Switcher 컴포넌트 구현
**Component**: Workspace Switcher
**Priority**: P1-High
**Type**: Feature

**Description**:
활성 워크스페이스를 선택할 수 있는 드롭다운 컴포넌트를 구현한다. 워크스페이스 목록과 현재 선택값을 보여주고 전환/제거 이벤트를 상위로 전달한다.

**Acceptance Criteria**:
- [ ] 워크스페이스 목록이 드롭다운으로 표시된다.
- [ ] 활성 워크스페이스가 명확히 구분된다.
- [ ] 항목 선택 시 `setActiveWorkspace(id)`가 호출된다.
- [ ] 워크스페이스 제거 UI가 제공되고 `closeWorkspace(id)`가 호출된다.

**Target Files**:
- [C] `src/workspace/workspace-switcher.tsx` -- 워크스페이스 선택 UI 컴포넌트 추가
- [M] `src/workspace/path-format.ts` -- 필요 시 드롭다운 표시용 축약 경로 유틸 재사용/보강

**Technical Notes**:
- 초기 UX는 드롭다운 우선으로 단순화한다(탭 UI 제외).

**Dependencies**: 2

---

### Task 4: App 헤더 통합 + Add Workspace 흐름 연결
**Component**: App Shell
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`App` 헤더에 switcher를 통합하고 기존 버튼 동작을 "Open Workspace"(의미상 Add)로 유지한다. 패널 데이터는 활성 워크스페이스 기준으로 렌더링한다.

**Acceptance Criteria**:
- [ ] 헤더에서 `Open Workspace` + workspace switcher가 함께 동작한다.
- [ ] 워크스페이스 전환 시 파일 트리/코드뷰가 해당 워크스페이스 상태로 바뀐다.
- [ ] 워크스페이스 제거 시 헤더/패널이 올바른 다음 활성 워크스페이스로 전환된다.
- [ ] 워크스페이스 재전환 시 파일 트리 폴더 펼침 상태가 복원된다.
- [ ] 전환 직후 `Selection: none`이 표시된다.

**Target Files**:
- [M] `src/App.tsx` -- switcher 통합/활성 워크스페이스 바인딩
- [M] `src/file-tree/file-tree-panel.tsx` -- 워크스페이스별 펼침 상태 주입/변경 이벤트 연동

**Technical Notes**:
- 기존 테스트 식별자(`data-testid`)를 최대한 유지해 회귀 테스트 비용을 낮춘다.

**Dependencies**: 3

---

### Task 5: 멀티 워크스페이스 전환 UI 스타일 반영
**Component**: App Shell
**Priority**: P2-Medium
**Type**: Feature

**Description**:
switcher/헤더 레이아웃에 필요한 스타일을 추가하고 모바일 폭에서도 헤더가 깨지지 않게 조정한다.

**Acceptance Criteria**:
- [ ] switcher 영역 스타일이 기존 헤더와 충돌하지 않는다.
- [ ] 모바일 너비에서 버튼/드롭다운이 줄바꿈되어도 조작 가능하다.
- [ ] 기존 코드뷰어/파일트리 스타일 회귀가 없다.

**Target Files**:
- [M] `src/App.css` -- switcher/헤더/반응형 스타일 추가

**Technical Notes**:
- 스타일은 기존 다크 톤을 유지한다.

**Dependencies**: 4

---

### Task 6: 단위 테스트(정책 함수)
**Component**: Tests
**Priority**: P0-Critical
**Type**: Test

**Description**:
워크스페이스 모델 순수 함수에 대해 핵심 정책을 단위 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] 첫 워크스페이스 추가 시 `activeWorkspaceId`가 설정된다.
- [ ] 동일 경로 재추가 시 워크스페이스 수가 증가하지 않는다.
- [ ] 동일 경로 재추가 시 해당 워크스페이스가 활성화된다.
- [ ] 워크스페이스 제거 시 활성 워크스페이스 재선정이 검증된다.
- [ ] 워크스페이스별 `expandedDirectories` 보존/복원이 검증된다.
- [ ] 전환 시 selection 리셋 정책을 검증하는 테스트가 존재한다.

**Target Files**:
- [C] `src/workspace/workspace-model.test.ts` -- 정책 함수 단위 테스트 추가
- [M] `src/workspace/workspace-model.ts` -- 테스트 가능한 API 노출 정리

**Technical Notes**:
- UI 없이 상태 전이만 검증해 실패 원인 파악을 단순화한다.

**Dependencies**: 1

---

### Task 7: 통합 테스트(멀티 워크스페이스 전환)
**Component**: Tests
**Priority**: P0-Critical
**Type**: Test

**Description**:
App 레벨에서 다중 워크스페이스 시나리오를 검증한다: A 추가 -> B 추가 -> A 재오픈(포커스) -> 트리 펼침 -> 전환/복원 -> 제거 -> selection 리셋.

**Acceptance Criteria**:
- [ ] `openDialog` 연속 호출로 2개 워크스페이스 추가 시나리오가 검증된다.
- [ ] 동일 경로 재오픈 시 중복 생성 없이 활성 전환이 검증된다.
- [ ] 워크스페이스별 `activeFile`/콘텐츠 유지가 검증된다.
- [ ] 워크스페이스별 파일 트리 폴더 펼침 상태 복원이 검증된다.
- [ ] 워크스페이스 제거 후 활성 워크스페이스 재선정이 검증된다.
- [ ] 워크스페이스 전환 시 `Selection: none`이 검증된다.
- [ ] 기존 F01/F02/F03/F03.1 핵심 테스트가 회귀 없이 유지된다.

**Target Files**:
- [M] `src/App.test.tsx` -- 멀티 워크스페이스 시나리오 및 회귀 검증 추가

**Technical Notes**:
- 테스트 데이터는 경로가 명확히 구분되는 fixture(`project-a`, `project-b`)를 사용한다.

**Dependencies**: 2, 4

---

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 1 | `workspace-context.tsx`는 Task 2 단독 수정 |
| 2 | 3 | 1 | Task 4 이후 Task 5 권장 (`App.tsx`/`App.css` 의미적 결합) |
| 3 | 2 | 2 | 가능 (`workspace-model.test.ts` vs `App.test.tsx`) |

### Conflict Notes
- `src/workspace/workspace-context.tsx`는 상태/액션 집중 파일이라 병렬 수정 충돌 위험이 높다.
- Task 4와 Task 5는 파일 충돌은 없지만 클래스명 계약 충돌 가능성이 있어 순차를 권장한다.
- 테스트 단계는 파일 충돌이 적지만, 정책 용어(`add`, `focus`, `selection reset`)를 공통 문구로 맞춰야 한다.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 멀티 상태 전환 중 비동기 read 응답 경합 | 잘못된 워크스페이스에 콘텐츠 반영 | 워크스페이스별 request token/ref 관리 |
| 기존 단일 흐름 회귀 | 기존 기능 불안정 | App 회귀 테스트 유지 + 멀티 시나리오 추가 |
| UI 복잡도 증가 | 헤더 가독성 저하 | 드롭다운 기반 단순 UX 유지, 탭 UI는 후속으로 분리 |
| 정책 해석 불일치 | 중복/전환 동작 혼선 | 단위 테스트에 정책을 명시적으로 고정 |

## Open Questions

해당 없음 (열린 이슈 2건은 F03.5 범위 포함으로 확정됨)

---

## Next Steps

1. 이 드래프트(범위 확정본)를 기준으로 `implementation` 스킬 실행
2. 구현 완료 후 `implementation-review`로 정책 충족 여부 확인
3. 검증 완료 후 `spec-update-done`으로 구현 결과 동기화
