# Feature Draft: F02 File Tree Indexing

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

### Feature: F02 파일 인덱싱 + 좌측 파일 트리

**Priority**: High (P0)  
**Category**: New Feature  
**Target Component**: Electron Main IPC, Preload API, WorkspaceProvider, FileTreePanel, App Shell  
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue > F02. 파일 인덱싱 + 좌측 파일 트리`

**Description**:  
선택된 `rootPath`를 기준으로 파일 메타데이터를 재귀 인덱싱하고, 좌측 패널에 트리 형태로 렌더링해 파일 선택/활성 상태를 제공한다.

**Acceptance Criteria**:

- [ ] `workspace:index` IPC 채널을 통해 `rootPath` 기준 파일/디렉터리 메타데이터를 조회할 수 있다.
- [ ] 인덱싱은 경로/메타데이터 중심으로 수행되고 파일 본문은 읽지 않는다.
- [ ] 기본 ignore 규칙(`.git`, `node_modules`, `dist`, `build`, `out`, `.next`, `.turbo`)이 적용되며, 숨김 파일은 기본 표시한다.
- [ ] 트리 정렬은 디렉터리 우선 + 이름 오름차순으로 고정한다.
- [ ] 좌측 패널에서 디렉터리/파일 트리가 재귀 렌더링된다.
- [ ] 파일 항목 클릭 시 `activeFile`이 갱신되고 UI 하이라이트가 반영된다.
- [ ] 워크스페이스 미선택 상태에서는 빈 상태 안내를 표시한다.
- [ ] 인덱싱 실패/권한 오류 시 텍스트 배너로 오류를 표시하고 앱은 유지된다.
- [ ] 초기 렌더 한도(노드 수 cap)를 적용해 대형 저장소에서 렌더 과부하를 방지한다.
- [ ] F02 범위의 자동 테스트 1건 이상(트리 렌더링/상태 전이)이 포함된다.

**Technical Notes**:

- 파일 시스템 접근은 Main 프로세스에서만 수행한다.
- F01에서 확정한 텍스트 배너 오류 피드백 전략을 재사용한다.
- 경로 표시는 상대경로 중심으로 처리하되 내부 상태 정합성을 유지한다.
- 숨김 파일은 기본 표시하되, ignore 목록은 명시된 디렉터리 규칙만 적용한다.
- 정렬 규칙은 디렉터리 우선 + 이름 오름차순으로 고정한다.
- 초기 렌더 한도는 필수로 적용하고, 구체 cap 값은 상수로 관리해 추후 조정 가능하게 둔다.
- changed indicator(`●`)는 F07에서 구현하며 F02에는 포함하지 않는다.

## Improvements

### Improvement: Workspace 상태 모델 F02 확장 명시

**Priority**: High (P0)  
**Target Section**: `/_sdd/spec/main.md` > `7. 상태 모델 (초안)`  
**Current State**: `rootPath`, `bannerMessage` 중심으로 최소 부트스트랩 상태만 명시됨  
**Proposed**: `fileTree`, `activeFile`, `isIndexing`, `indexError`(또는 동등 필드) 추가 및 상태 전이 규칙 문서화  
**Reason**: F02 이후(F03/F04)의 파일 선택 흐름 기준점을 명확히 하기 위함

### Improvement: IPC 계약 구체화 (`workspace:index`)

**Priority**: High (P0)  
**Target Section**: `/_sdd/spec/main.md` > `9.2 MVP 목표 채널 (구현 + 계획)`  
**Current State**: `{ rootPath } -> 파일 메타 목록` 수준의 요약만 존재  
**Proposed**: 요청/응답 스키마와 오류 정책(권한 오류/부분 실패/빈 결과)을 명시  
**Reason**: Main/Preload/Renderer 계약을 고정해 후속 구현 드리프트를 줄이기 위함

### Improvement: F02 테스트 기준 보강

**Priority**: Medium (P1)  
**Target Section**: `/_sdd/spec/main.md` > `13. 테스트 및 수용 기준`  
**Current State**: F02 범위에 대한 자동 테스트 최소 기준이 구체적이지 않음  
**Proposed**: 트리 렌더링 + 파일 선택 상태 전이 검증을 F02 필수 테스트로 명시  
**Reason**: F03 이전에 파일 선택 기준 동작을 안정화하기 위함

## Bug Reports

해당 없음 (F02는 신규 기능 확장 단계)

## Component Changes

### Component Change: Main IPC 핸들러 확장 (`workspace:index`)

**Target Section**: `/_sdd/spec/main.md` > `9.2 MVP 목표 채널 (구현 + 계획)`  
**Type**: Existing Component Extension  
**Change Summary**:

- `electron/main.ts`에 재귀 인덱싱 핸들러(`workspace:index`) 추가
- ignore 규칙 및 안전한 경로 처리(루트 기준 상대경로 반환) 적용
- 반환 형태: `FileNode[]` 또는 동등 트리 모델 + 오류 메시지 정책

### Component Change: Preload API 확장 (`workspace.index`)

**Target Section**: `/_sdd/spec/main.md` > `5. 아키텍처 개요 (To-Be)` 및 `9. IPC 계약 (초안)`  
**Type**: Existing Component Extension  
**Change Summary**:

- Renderer에서 `window.workspace.index(rootPath)` 호출 가능하도록 preload 래퍼 추가
- 채널 문자열 직접 호출 분산을 줄이고 타입 계약을 한 곳에서 유지

### Component Change: Renderer 상태 및 좌측 패널 도입

**Target Section**: `/_sdd/spec/main.md` > `6.1 WorkspaceProvider`, `6.2 FileTreePanel`  
**Type**: Existing Component Extension + New Component  
**Change Summary**:

- `WorkspaceProvider`에 `fileTree`, `activeFile`, `isIndexing` 상태와 액션 추가
- `FileTreePanel`(신규)로 재귀 트리 렌더링 및 클릭 이벤트 처리
- App Shell에 좌측 파일 브라우저 영역 배치

## Configuration Changes

해당 없음 (F02 범위에서는 신규 환경변수/설정 파일 도입 없음)

## Notes

### Scope Boundary

- F03의 파일 본문 읽기/센터 뷰어 연결은 제외한다.
- F07의 changed indicator 및 watcher 연동은 제외한다.
- iTerm/Copy 액션은 F06/F08/F09 범위로 유지한다.

### Validation Notes

- 자동 테스트는 TDD 우선으로 작성한다.
- 수동 스모크는 대형 디렉터리/권한 오류 경로를 최소 1회 검증한다.

---

# Part 2: Implementation Plan

# Implementation Plan: F02 File Tree Indexing

## Overview

F01에서 확보한 `rootPath`를 기반으로 파일 메타데이터 인덱싱과 좌측 트리 UI를 연결해, 이후 F03/F04의 파일 열기 흐름을 위한 공통 기반을 만든다.

## Scope

### In Scope

- Main 프로세스 `workspace:index` IPC 핸들러 구현
- preload `workspace.index()` API 및 Renderer 타입 계약 확장
- 트리 모델 유틸 및 기본 ignore/정렬 규칙 적용
- `WorkspaceProvider` 상태 확장(`fileTree`, `activeFile`, `isIndexing`)
- 좌측 `FileTreePanel` 렌더링 + 파일 클릭 활성화
- 초기 렌더 한도(cap) 기반 노드 표시 제한
- F02 자동 테스트(최소 1건 이상) + 수동 스모크

### Out of Scope

- 파일 본문 읽기/코드 뷰어 렌더링(F03)
- Markdown 렌더링/TOC(F04)
- changed indicator/watcher(F07)
- 토스트 배너 전환(후속 Feature)

## Components

1. **Electron Main (`electron/main.ts`)**: `workspace:index` 핸들러 + 재귀 인덱싱
2. **Preload Bridge (`electron/preload.ts`)**: `workspace.index(rootPath)` API 노출
3. **Renderer Types (`electron/electron-env.d.ts`)**: `Window.workspace` 타입 계약 확장
4. **Workspace State (`src/workspace/*`)**: 트리/활성 파일 상태 및 액션 추가
5. **UI (`src/App.tsx`, `src/App.css`, `src/file-tree/*`)**: 좌측 파일 트리 패널 도입
6. **Tests (`src/App.test.tsx`, 신규 유틸 테스트 파일)**: 상태 전이 및 렌더링 검증

## Implementation Phases

### Phase 1: IPC & Index Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | 트리 노드 타입/변환 규칙 정의 (`FileNode`, relative path 규칙) | P0 | - | Main + Renderer Types |
| 2 | `workspace:index` 재귀 인덱싱 로직 구현 + ignore/정렬 적용 | P0 | 1 | Electron Main |
| 3 | preload `workspace.index(rootPath)` API + 전역 타입 확장 | P0 | 2 | Preload Bridge |

### Phase 2: Renderer Tree Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 4 | `WorkspaceProvider` 상태/액션 확장 (`fileTree`, `activeFile`, `isIndexing`) | P0 | 3 | Workspace State |
| 5 | `FileTreePanel` 신규 구현 (재귀 렌더 + active highlight + 초기 렌더 cap) | P0 | 4 | UI |
| 6 | App Shell 레이아웃에 좌측 패널 통합 + empty/loading/error 상태 연결 | P0 | 5 | UI |

### Phase 3: Validation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 7 | 자동 테스트: 트리 렌더링/파일 선택 상태 전이 검증 | P0 | 6 | Tests |
| 8 | 자동 테스트: ignore 규칙 또는 트리 유틸 단위 테스트 | P1 | 6 | Tests |
| 9 | 수동 스모크 테스트(실제 워크스페이스 인덱싱 시나리오) | P1 | 6 | QA |

## Task Details

### Task 2: `workspace:index` 재귀 인덱싱 구현

**Component**: Electron Main  
**Priority**: P0  
**Type**: Feature

**Description**:  
`rootPath`를 입력받아 디렉터리를 순회하고, ignore 규칙을 적용한 트리 메타데이터를 반환한다.

**Acceptance Criteria**:

- [ ] `ipcMain.handle('workspace:index', ...)` 또는 동등 구현이 존재한다.
- [ ] 반환 데이터는 상대경로 기반으로 정규화된다.
- [ ] 기본 ignore 디렉터리가 결과에서 제외되고, 숨김 파일은 기본 표시된다.
- [ ] 결과 정렬은 디렉터리 우선 + 이름 오름차순 규칙을 따른다.
- [ ] 권한 오류/읽기 실패 시 렌더러가 처리 가능한 오류 메시지를 반환한다.

**Dependencies**: 1

### Task 4: WorkspaceProvider 상태 확장

**Component**: Workspace State  
**Priority**: P0  
**Type**: Feature

**Description**:  
기존 `rootPath`/`bannerMessage` 구조에 파일 트리 및 활성 파일 상태를 추가하고, 인덱싱 호출 및 선택 액션을 관리한다.

**Acceptance Criteria**:

- [ ] Provider가 `fileTree`, `activeFile`, `isIndexing`(또는 동등 상태)을 제공한다.
- [ ] `rootPath`가 유효할 때 인덱싱 액션을 트리거할 수 있다.
- [ ] 인덱싱 실패 시 텍스트 배너 경로로 오류가 전달된다.

**Dependencies**: 3

### Task 7: 자동 테스트(트리 렌더링/선택 상태)

**Component**: Tests  
**Priority**: P0  
**Type**: Test

**Description**:  
파일 트리 렌더링과 항목 클릭 시 `activeFile` 반영 동작을 자동 테스트로 검증한다.

**Acceptance Criteria**:

- [ ] 최소 1건 이상 F02 핵심 사용자 흐름 테스트가 추가된다.
- [ ] 파일 클릭 시 active 하이라이트(또는 동등 상태 표시)가 검증된다.
- [ ] 정렬 규칙(디렉터리 우선 + 이름 오름차순) 또는 렌더 cap 동작 중 최소 1개가 테스트로 고정된다.
- [ ] 테스트는 기존 F01 테스트와 함께 안정적으로 통과한다.

**Dependencies**: 6

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 대형 저장소 순회 비용 증가 | 초기 UX 지연 | 인덱싱 중 로딩 상태 표시 + 결과 캐시/후속 최적화 여지 확보 |
| 심볼릭 링크/순환 경로 | 무한 순회/오류 | 기본적으로 symlink 미추적 정책 채택(필요 시 옵션화) |
| 권한 오류/읽기 실패 | 인덱싱 중단 | 개별 오류를 배너 메시지로 노출하고 앱은 지속 동작 |
| 경로 정규화 불일치 | 선택/하이라이트 오작동 | 상대경로 기준 단일 규칙 강제 및 테스트 보강 |

## Resolved Decisions

- [x] 숨김 파일은 기본 표시한다. (단, 명시된 ignore 디렉터리 규칙은 유지)
- [x] 인덱싱 결과 정렬은 디렉터리 우선 + 이름 오름차순으로 고정한다.
- [x] 초기 렌더 한도(cap)를 적용한다. (구체 값은 구현 상수로 두고 필요 시 조정)

---

## Next Steps

1. Part 1을 `spec-update-todo` 또는 후속 스펙 업데이트 턴에 반영한다.
2. Part 2를 `implementation` 스킬로 실행해 F02를 구현한다.
