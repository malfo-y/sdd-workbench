# Feature Draft: F01 Workspace Bootstrap

**Date**: 2026-02-20
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft (Decisions Resolved)

---

# Part 1: Spec Patch Draft

# Spec Update Input

**Date**: 2026-02-20
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F01 워크스페이스 부트스트랩

**Priority**: High (P0)
**Category**: New Feature
**Target Component**: Electron Main IPC, Preload API, Renderer WorkspaceProvider, App Shell
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue > F01. 워크스페이스 부트스트랩`

**Description**:
사용자가 워크스페이스 디렉터리를 선택하고, 선택된 경로가 전역 상태(`rootPath`)에 반영되는 최소 부트스트랩 플로우를 구현한다.

**Acceptance Criteria**:

- [ ] 앱에서 `Open Workspace` 액션을 실행할 수 있다.
- [ ] 디렉터리 선택 다이얼로그에서 폴더를 선택하면 절대 경로가 반환된다.
- [ ] 선택된 경로가 Renderer 전역 상태(`WorkspaceProvider`)의 `rootPath`에 반영된다.
- [ ] 경로 표시는 축약 포맷(예: 홈 디렉터리 `~`)을 지원하되 내부 상태(`rootPath`)는 절대 경로를 유지한다.
- [ ] 취소 시 `rootPath`는 변경되지 않고 앱이 오류 없이 유지된다.
- [ ] 취소/오류 케이스가 텍스트 배너로 사용자에게 표시된다.
- [ ] 최소 자동 테스트 1건(상태 전이 또는 API mocking)이 F01 범위 내에 포함된다.
- [ ] 후속 Feature(F02+)에서 재사용 가능한 IPC 채널 계약(`workspace:openDialog`)이 정의된다.

**Technical Notes**:

- Main 프로세스에서만 OS 파일 다이얼로그 접근
- Renderer는 preload를 통해 노출된 제한 API만 호출
- 경로 표시용 축약 유틸은 UI 전용이며, 비즈니스 상태에는 절대 경로를 유지
- 오류 피드백은 F01에서 텍스트 배너로 시작하고, 토스트 배너 전환은 후속 Feature로 기록
- F01 범위에서는 파일 인덱싱/트리 렌더링/워처는 제외

## Improvements

### Improvement: 상태 모델의 F01 기준점 명시

**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `7. 상태 모델 (초안)`
**Current State**: `rootPath` 필드 정의는 있으나 F01 완료 조건과 상태 전이 규칙이 약함
**Proposed**: F01 완료 시점의 최소 상태 전이(`null -> selectedPath`, cancel 시 유지)를 명시
**Reason**: `feature-draft`/`implementation` 반복 시 회귀 기준을 명확히 하기 위함

### Improvement: 오류 피드백 단계적 전환 전략 기록 (Text Banner -> Toast Banner)

**Priority**: Medium (P1)
**Target Section**: `/_sdd/spec/main.md` > `10.3 신뢰성` 및 `12.2 Priority Queue`
**Current State**: 오류 피드백 UI 방식이 확정되지 않음
**Proposed**: F01은 텍스트 배너를 기본으로 구현하고, 토스트 배너 전환을 후속 항목으로 명시
**Reason**: 초기 구현 복잡도를 낮추면서도 UX 개선 계획을 잊지 않기 위함

## Bug Reports

해당 없음 (F01은 신규 기능 부트스트랩 단계)

## Component Changes

### Component Change: Main IPC 핸들러 확장 (`workspace:openDialog`)

**Target Section**: `/_sdd/spec/main.md` > `9.2 MVP 목표 채널 (계획)`
**Type**: Existing Component Extension
**Change Summary**:

- `electron/main.ts`에 디렉터리 선택용 IPC invoke 핸들러 추가
- 반환 형태: `{ canceled: boolean, selectedPath: string | null }` 또는 동등 계약

### Component Change: Preload API 명시적 계약 추가

**Target Section**: `/_sdd/spec/main.md` > `5. 아키텍처 개요 (To-Be)` 및 `9. IPC 계약 (초안)`
**Type**: Existing Component Extension
**Change Summary**:

- generic `ipcRenderer.invoke` 직접 사용 대신 `workspace.openDialog()` 형태의 래퍼 API를 우선 도입
- 채널명 하드코딩 분산을 줄여 이후 기능 확장 시 계약 추적성을 높임

### Component Change: Renderer WorkspaceProvider 도입

**Target Section**: `/_sdd/spec/main.md` > `6.1 WorkspaceProvider`
**Type**: New Component
**Change Summary**:

- `rootPath`, `setRootPath` 또는 동등 액션을 가진 최소 Provider/Context 추가
- App 루트에서 Provider를 장착하고, 현재 선택 경로를 표시할 수 있는 최소 UI 연결

## Configuration Changes

해당 없음 (F01 범위에서는 환경변수/설정 파일 변경 없음)

## Notes

### Scope Boundary

- F02(파일 트리), F03(파일 내용 로딩), F07(워처)는 본 Feature에서 구현하지 않음

### Dependency Hint

- F01이 완료되어야 F02/F08에서 `rootPath`를 기준으로 동작 구현이 가능함

### Validation Notes

- F01에서 최소 자동 테스트 1건을 우선 도입한다 (TDD 우선)
- 수동 스모크 테스트는 자동 테스트를 보완하는 확인 절차로 유지한다
- 테스트 스택은 `Vitest + React Testing Library + jsdom` 조합을 기본 권장으로 둔다
- 토스트 배너 전환은 후속 Feature에서 처리하도록 TODO로 남긴다

---

# Part 2: Implementation Plan

# Implementation Plan: F01 Workspace Bootstrap

## Overview

Electron Main의 폴더 선택 기능과 Renderer 전역 상태를 연결해, 워크스페이스 루트를 안전하게 선택/표시하는 최소 실행 경로를 만든다.

## Scope

### In Scope

- `workspace:openDialog` IPC invoke 핸들러 추가
- preload에서 `workspace.openDialog` API 노출
- Renderer `WorkspaceProvider` 최소 구조 도입 (`rootPath` 중심)
- App에서 워크스페이스 열기 버튼 및 선택 경로(축약 표시) 연결
- 취소/오류 케이스 텍스트 배너 처리
- 최소 자동 테스트 1건 도입

### Out of Scope

- 파일 인덱싱 및 파일 트리 렌더링
- 파일 읽기 및 코드 뷰어 기능
- 파일 watcher 및 changed indicator
- iTerm 열기, 복사 액션
- 토스트 배너 컴포넌트 도입/치환

## Components

1. **Electron Main (`electron/main.ts`)**: OS 다이얼로그 + IPC 핸들러
2. **Preload Bridge (`electron/preload.ts`)**: 제한된 Renderer API 노출
3. **Renderer State (`src/*`)**: WorkspaceProvider/Context
4. **App Shell (`src/App.tsx`, `src/main.tsx`)**: 사용자 액션 트리거 및 상태 표시

## Implementation Phases

### Phase 1: IPC Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | `workspace:openDialog` invoke 핸들러 추가 | P0 | - | Electron Main |
| 2 | preload에 `workspace.openDialog()` API 노출 | P0 | 1 | Preload Bridge |
| 3 | Renderer 타입 정의(전역 window API) 보강 | P1 | 2 | Preload Bridge |

### Phase 2: Renderer Bootstrap

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 4 | `WorkspaceProvider` 및 `rootPath` 상태 도입 | P0 | 2 | Renderer State |
| 5 | App Shell에 `Open Workspace` 버튼/경로(축약 표시) 연결 | P0 | 4 | App Shell |
| 6 | 취소/실패 케이스 텍스트 배너 처리 + 토스트 전환 TODO 기록 | P0 | 5 | App Shell |

### Phase 3: Validation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 7 | F01 수동 스모크 테스트 체크리스트 실행 | P1 | 6 | QA |
| 8 | 최소 자동 테스트 1건(상태 전이 또는 API mocking 기반) 구현 | P0 | 6 | Renderer State |

## Task Details

### Task 1: `workspace:openDialog` invoke 핸들러 추가

**Component**: Electron Main  
**Priority**: P0  
**Type**: Feature

**Description**:
Main 프로세스에 폴더 선택 전용 IPC 핸들러를 추가하고, 선택/취소 결과를 Renderer에서 처리 가능한 형태로 반환한다.

**Acceptance Criteria**:

- [ ] `ipcMain.handle('workspace:openDialog', ...)` 또는 동등 구현이 존재한다.
- [ ] `openDirectory` 성격의 다이얼로그 옵션이 설정된다.
- [ ] 취소 시 명시적 canceled 결과를 반환한다.
- [ ] 예외 발생 시 Renderer가 처리 가능한 오류 결과/throw 정책이 문서화된다.

**Dependencies**: -

### Task 4: `WorkspaceProvider` 도입

**Component**: Renderer State  
**Priority**: P0  
**Type**: Feature

**Description**:
워크스페이스 루트 상태를 중앙화하는 Provider를 도입하고, 후속 기능이 동일 상태를 참조할 수 있도록 인터페이스를 최소 설계한다.

**Acceptance Criteria**:

- [ ] Provider가 `rootPath`와 업데이트 액션을 제공한다.
- [ ] 앱 루트에서 Provider가 실제로 마운트된다.
- [ ] Consumer 컴포넌트(App Shell)에서 `rootPath`를 읽어 표시 가능하다.

**Dependencies**: 2

### Task 7: F01 수동 스모크 테스트

**Component**: QA  
**Priority**: P1  
**Type**: Test

**Description**:
F01 기능 흐름을 사용자 시나리오 기준으로 검증한다.

**Acceptance Criteria**:

- [ ] 버튼 클릭 시 폴더 선택 다이얼로그가 열린다.
- [ ] 폴더 선택 후 UI에 경로가 반영된다.
- [ ] 취소 시 기존 값이 유지된다.
- [ ] 동작 중 렌더러/메인 프로세스 오류가 발생하지 않는다.

**Dependencies**: 6

### Task 8: 최소 자동 테스트 1건 구현

**Component**: Renderer State  
**Priority**: P0  
**Type**: Test

**Description**:
F01에서 핵심 상태 전이 또는 IPC 호출 흐름을 자동 테스트로 검증한다. 기본 전략은 TDD를 적용한다.

**Acceptance Criteria**:

- [ ] `Vitest + React Testing Library + jsdom` 환경에서 F01 관련 테스트 1건 이상이 실행된다.
- [ ] `rootPath` 상태 갱신 또는 취소 시 상태 유지 케이스가 검증된다.
- [ ] 테스트는 현재 구현의 핵심 회귀 포인트를 명확히 설명한다.

**Dependencies**: 6

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| IPC 계약이 초기에 불안정하면 후속 Feature(F02+) 연쇄 수정 발생 | 일정 지연 | F01에서 반환 타입을 먼저 고정하고 문서화 |
| 다이얼로그 취소/권한 오류 미처리 | 런타임 오류 | canceled/exception 분기 처리 및 UI fallback 문구 제공 |
| 경로 축약 표시와 내부 절대 경로가 혼동될 수 있음 | 오작동/디버깅 난이도 증가 | 상태는 절대 경로 유지, UI 렌더 단계에서만 축약 적용 |
| preload에서 과도한 API 노출 | 보안 저하 | `workspace` 네임스페이스 최소 API만 공개 |

## Resolved Decisions

- [x] 경로 표시는 축약 포맷을 도입한다. 내부 상태값은 절대 경로를 유지한다.
- [x] 오류 피드백은 F01에서 텍스트 배너를 사용하고, 토스트 배너 전환은 후속 작업으로 기록한다.
- [x] 자동 테스트는 가능한 빠르게 도입하며, F01에서 최소 1건을 구현한다.

## Open Questions

- 없음 (현재 기준 의사결정 완료)

---

## Next Steps

1. Part 1을 `spec-update-todo`로 적용해 `/_sdd/spec/main.md`에 정식 반영
2. Part 2를 `implementation`으로 실행해 F01 코드 구현
