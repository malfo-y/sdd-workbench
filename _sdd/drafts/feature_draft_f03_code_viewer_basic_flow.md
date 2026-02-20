# Feature Draft: F03 Code Viewer Basic Flow

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

### Feature: F03 코드 뷰어 기본 흐름
**Priority**: High (P0)
**Category**: Core Feature
**Target Component**: Electron Main IPC, Preload API, WorkspaceProvider, CodeViewerPanel, App Shell
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue > F03. 코드 뷰어 기본 흐름`

**Description**:
파일 트리에서 선택한 파일을 `workspace:readFile` 기반으로 on-demand 로딩하고, center 패널에 텍스트/코드를 표시한다. 라인 선택 범위를 상태로 추적해 이후 복사 기능(F06)의 기반을 마련한다.

**Acceptance Criteria**:
- [ ] `workspace:readFile` IPC 채널이 구현되어 상대경로 파일 본문을 안전하게 읽어온다.
- [ ] 파일 선택 시 center 패널에 파일 내용이 렌더링된다.
- [ ] 로딩/읽기 실패/미선택 상태가 center 패널에서 명확히 구분된다.
- [ ] 대용량 파일(2MB 초과)은 `preview 불가` 상태로 처리된다.
- [ ] 바이너리 파일은 오류 대신 `preview 불가` 상태로 처리된다.
- [ ] `activeFile`과 `activeFileContent` 상태가 일관되게 유지된다.
- [ ] 라인 선택 범위(`startLine`, `endLine`, 1-based)가 상태에 저장된다.
- [ ] `.md` 파일도 우선 raw 텍스트로 center 패널에서 표시된다(F04에서 rendered 확장).
- [ ] F03 범위의 자동 테스트(파일 로딩 + 선택 범위) 최소 2건 이상이 통과한다.

**Technical Notes**:
- 파일 시스템 접근은 Main 프로세스에서만 수행한다.
- 경로 역참조(`..`) 및 워크스페이스 외부 접근은 차단한다.
- 대용량 파일 preview 제한은 2MB로 고정하고 상수로 관리한다(후속 feature에서 조정 가능).
- 바이너리/대용량 파일은 공통 `preview 불가` 상태로 노출한다.
- F03는 읽기 중심 MVP로 유지하고 고급 syntax highlight는 후속 Feature로 분리한다.

**Dependencies**:
- F01, F02 완료 상태

## Improvements

### Improvement: 상태 모델에 파일 본문/선택 범위 명시
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `7. 상태 모델 (초안)`
**Current State**: `activeFile`까지만 정의되어 있고 파일 본문/선택 범위 상태는 미정
**Proposed**: `activeFileContent`, `isReadingFile`, `readFileError`, `selectionRange` 필드 및 전이 규칙 추가
**Reason**: F03 구현 범위를 상태 모델에 고정해 F04/F06 확장 시 드리프트를 방지하기 위함

### Improvement: IPC 계약에 `workspace:readFile` 추가
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `9.2 MVP 목표 채널 (구현 + 계획)`
**Current State**: `workspace:readFile`가 Planned 수준으로만 존재
**Proposed**: 요청/응답 스키마(성공/실패/오류 메시지)와 경로 검증 정책을 명시
**Reason**: Main/Preload/Renderer 간 파일 읽기 계약을 고정하기 위함

### Improvement: F03 테스트 기준 구체화
**Priority**: Medium (P1)
**Target Section**: `/_sdd/spec/main.md` > `13. 테스트 및 수용 기준`
**Current State**: F03 테스트 범위가 추상적
**Proposed**: 파일 선택 -> 본문 렌더링, 읽기 실패 배너/패널 처리, 선택 범위 상태 추적 테스트를 필수 항목으로 추가
**Reason**: F06 복사 기능 이전에 selection 기반 회귀를 조기 차단하기 위함

## Bug Reports

해당 없음 (F03는 신규 기능 확장)

## Component Changes

### Update Component: Electron Main (`workspace:readFile`)
**Target Section**: `/_sdd/spec/main.md` > `9.2 MVP 목표 채널 (구현 + 계획)`
**Change Type**: Enhancement

**Changes**:
- `workspace:readFile` invoke 핸들러 추가
- `rootPath + relativePath` 기반 안전한 절대 경로 해석
- 읽기 실패/권한 오류 시 표준 오류 응답 반환
- 2MB 초과 파일/바이너리 파일에 대해 `preview 불가` 응답 반환

### Update Component: Preload/Renderer 타입 계약
**Target Section**: `/_sdd/spec/main.md` > `5. 아키텍처 개요 (To-Be)` 및 `9. IPC 계약 (초안)`
**Change Type**: Enhancement

**Changes**:
- `window.workspace.readFile(rootPath, relativePath)` API 노출
- `WorkspaceReadFileResult` 타입 정의를 Main/Renderer 경계에 맞게 확장

### New Component: CodeViewerPanel
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`
**Change Type**: New Component

**Changes**:
- center 패널용 read-only 코드/텍스트 뷰 컴포넌트 도입
- 라인 선택 범위 입력/출력 계약 정의
- 로딩/오류/빈 상태 UI 제공
- `preview 불가` 상태 UI 제공(대용량/바이너리 공통)

### Update Component: WorkspaceProvider
**Target Section**: `/_sdd/spec/main.md` > `6.1 WorkspaceProvider` 및 `7. 상태 모델 (초안)`
**Change Type**: Enhancement

**Changes**:
- 파일 선택 시 본문 로딩 액션 추가
- `activeFileContent`, `isReadingFile`, `readFileError`, `selectionRange` 상태 제공
- 읽기 실패 시 오류 상태를 UI에서 처리 가능한 형태로 유지

## Configuration Changes

해당 없음 (F03 범위에서 신규 env/config 없음)

## Notes

### Scope Boundary
- F04의 Markdown rendered 패널/TOC는 본 draft에서 제외
- F05의 spec 링크 점프(`path#Lx`)는 제외
- 고급 syntax highlighting(Monaco/CodeMirror 세부 튜닝)은 제외

### Follow-up Note
- 대용량 파일 기준은 2MB로 고정하고, 추후 필요 시 스펙/구현에서 조정한다.
- 바이너리 파일은 F03에서 `preview 불가` 상태로 처리한다.

---

# Part 2: Implementation Plan

## Overview

F03는 파일 트리 선택과 center 코드 뷰어를 연결하는 MVP 핵심 경로다. `workspace:readFile` IPC를 추가하고, Workspace 상태를 확장해 파일 본문/선택 범위를 관리하며, CodeViewerPanel에서 읽기 중심 UI를 제공한다.

## Scope

### In Scope
- Main 프로세스 `workspace:readFile` IPC 핸들러 구현
- preload API + `Window.workspace` 타입 계약 확장
- WorkspaceProvider 상태 확장(`activeFileContent`, `isReadingFile`, `readFileError`, `selectionRange`)
- center `CodeViewerPanel` 신규 도입 (로딩/오류/빈 상태 포함)
- 대용량(2MB 초과)/바이너리 파일 `preview 불가` 상태 처리
- App 레이아웃을 3패널 준비 형태로 확장(좌:트리, 중:코드, 우:placeholder)
- F03 자동 테스트(파일 로딩 + 선택 범위) 추가

### Out of Scope
- Markdown rendered view 및 TOC(F04)
- spec 링크 클릭 점프(F05)
- 툴바 복사 액션(F06)
- watcher/changed indicator(F07)

## Components
1. **Electron Main (`electron/main.ts`)**: 안전한 파일 읽기 IPC
2. **Preload Bridge (`electron/preload.ts`)**: `readFile` API 노출
3. **Renderer Types (`electron/electron-env.d.ts`)**: 파일 읽기 결과 타입 계약
4. **Workspace State (`src/workspace/workspace-context.tsx`)**: 파일 본문/선택 범위 상태 관리
5. **Code Viewer UI (`src/code-viewer/*`)**: 코드 표시 및 라인 선택 UI
6. **App Shell (`src/App.tsx`, `src/App.css`)**: center 패널 통합
7. **Tests (`src/App.test.tsx`, `src/code-viewer/*.test.tsx`)**: 흐름/선택 범위 검증

## Implementation Phases

### Phase 1: IPC Contract & State Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | `workspace:readFile` Main 핸들러 구현(경로 검증 포함) | P0 | - | Electron Main |
| 2 | preload `workspace.readFile()` + 전역 타입 계약 확장 | P0 | 1 | Preload Bridge |
| 3 | WorkspaceProvider 파일 본문/선택 상태 및 액션 확장 | P0 | 2 | Workspace State |

### Phase 2: Code Viewer Integration
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 4 | `CodeViewerPanel` + 라인 선택 유틸 구현 | P0 | 3 | Code Viewer UI |
| 5 | App Shell center 패널 통합 + 상태별 UI 연결 | P0 | 3,4 | App Shell |

### Phase 3: Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 6 | 통합 테스트: 파일 선택 시 본문 로딩/오류 처리 검증 | P0 | 5 | Tests |
| 7 | 단위 테스트: 라인 선택 범위 계산/표시 규칙 검증 | P1 | 4 | Tests |

## Task Details

### Task 1: `workspace:readFile` Main 핸들러 구현
**Component**: Electron Main
**Priority**: P0-Critical
**Type**: Feature

**Description**:
Main 프로세스에 `workspace:readFile` IPC invoke 핸들러를 추가한다. 입력 `rootPath`, `relativePath`를 검증한 뒤 UTF-8 텍스트를 읽어 반환하고, 워크스페이스 외부 접근은 차단한다. 대용량(2MB 초과) 또는 바이너리 파일은 `preview 불가`로 처리한다.

**Acceptance Criteria**:
- [ ] `ipcMain.handle('workspace:readFile', ...)`가 등록되어 있다.
- [ ] `relativePath`가 `..`로 워크스페이스 밖을 가리키면 실패 응답을 반환한다.
- [ ] 파일 읽기 성공 시 `{ ok: true, content }` 형태를 반환한다.
- [ ] 읽기 실패/권한 오류 시 `{ ok: false, content: null, error }`를 반환한다.
- [ ] 2MB 초과 파일 또는 바이너리 파일은 `preview 불가` 식별 가능한 응답으로 반환된다.

**Target Files**:
- [M] `electron/main.ts` -- `workspace:readFile` 타입/핸들러/경로 검증 로직 추가

**Technical Notes**:
- `path.resolve(rootPath, relativePath)`와 `path.relative(rootPath, resolvedPath)`를 함께 사용해 경로 탈출을 방지한다.
- 응답 타입은 기존 `workspace:index` 패턴과 동일한 `ok + error` 구조를 유지한다.
- 파일 크기 임계값은 2MB 상수로 고정한다.

**Dependencies**: -

---

### Task 2: preload API 및 전역 타입 계약 확장
**Component**: Preload Bridge
**Priority**: P0-Critical
**Type**: Feature

**Description**:
Renderer에서 `window.workspace.readFile(rootPath, relativePath)`를 호출할 수 있도록 preload API를 확장하고, 전역 타입(`Window.workspace`, read result 타입)을 동기화한다.

**Acceptance Criteria**:
- [ ] preload에 `readFile(rootPath, relativePath)` wrapper가 추가된다.
- [ ] `WorkspaceReadFileResult`(또는 동등 타입)가 정의된다.
- [ ] `electron/electron-env.d.ts`의 `Window.workspace` 타입 계약이 업데이트된다.
- [ ] `preview 불가` 상태를 구분할 수 있는 타입 필드가 포함된다.

**Target Files**:
- [M] `electron/preload.ts` -- `readFile` invoke wrapper 및 결과 타입 추가
- [M] `electron/electron-env.d.ts` -- `WorkspaceReadFileResult` + `window.workspace.readFile` 타입 추가

**Technical Notes**:
- 채널명은 `workspace:readFile`로 고정해 추후 watcher/toolbar 채널과 네이밍 일관성을 유지한다.

**Dependencies**: 1

---

### Task 3: WorkspaceProvider 파일 본문/선택 상태 확장
**Component**: Workspace State
**Priority**: P0-Critical
**Type**: Feature

**Description**:
파일 선택 시 본문을 비동기 로딩하고, 로딩 상태/오류 상태/선택 라인 범위를 Context에서 관리한다.

**Acceptance Criteria**:
- [ ] Context에 `activeFileContent`, `isReadingFile`, `readFileError`, `selectionRange`가 추가된다.
- [ ] 파일 선택 시 `readFile` 호출 후 성공/실패 상태가 반영된다.
- [ ] 파일 변경 시 이전 `selectionRange`가 초기화된다.
- [ ] 읽기 실패 시 기존 앱은 유지되고 오류 상태가 노출 가능하다.
- [ ] `preview 불가` 응답 시 전용 상태(또는 동등 필드)로 UI에 전달된다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 파일 본문 로딩 상태/선택 범위 상태 및 액션 확장
- [M] `src/workspace/use-workspace.ts` -- 확장된 context 타입 소비(필요 시)

**Technical Notes**:
- `openWorkspace`로 root가 바뀔 때 파일 본문/선택 상태를 초기화한다.
- 경쟁 상태 방지를 위해 최신 선택 파일 기준으로 read 응답을 반영한다(간단한 request token 권장).

**Dependencies**: 2

---

### Task 4: CodeViewerPanel + 라인 선택 유틸 구현
**Component**: Code Viewer UI
**Priority**: P0-Critical
**Type**: Feature

**Description**:
center 패널에서 파일 내용을 라인 단위로 렌더링하고, 기본 선택 규칙(단일 클릭 시작, Shift+클릭 범위 확장)을 구현한다.

**Acceptance Criteria**:
- [ ] 파일 미선택/로딩/오류/성공 상태별 UI가 분리된다.
- [ ] 대용량/바이너리 파일에 대해 `preview 불가` 상태 UI가 표시된다.
- [ ] 라인 번호가 1-based로 표시된다.
- [ ] 단일 클릭 시 `startLine=endLine` 선택이 저장된다.
- [ ] Shift+클릭 시 연속 범위 선택이 저장된다.

**Target Files**:
- [C] `src/code-viewer/code-viewer-panel.tsx` -- center 패널 컴포넌트 신규 구현
- [C] `src/code-viewer/line-selection.ts` -- 선택 범위 계산 유틸(1-based)

**Technical Notes**:
- F03에서는 읽기 전용 텍스트 렌더를 우선하고, syntax highlight는 후속 feature로 분리한다.
- 선택 상태는 상위(Context)로 콜백 전달해 F06 복사 기능과 연결 가능하게 설계한다.

**Dependencies**: 3

---

### Task 5: App Shell 통합 및 레이아웃 확장
**Component**: App Shell
**Priority**: P0-Critical
**Type**: Feature

**Description**:
기존 2컬럼 레이아웃을 center 코드 뷰어 중심 흐름으로 확장하고, Provider 상태를 CodeViewerPanel에 연결한다.

**Acceptance Criteria**:
- [ ] `App.tsx`에서 CodeViewerPanel이 렌더링된다.
- [ ] 파일 선택 후 center 패널에 `activeFileContent`가 표시된다.
- [ ] 로딩/오류 상태가 center 패널 UI와 연결된다.
- [ ] 모바일 폭에서도 패널 레이아웃이 깨지지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- CodeViewerPanel 통합, 상태 연결
- [M] `src/App.css` -- center 패널/3패널 준비 레이아웃 스타일 확장

**Technical Notes**:
- 우측 Spec 패널은 F04 전까지 placeholder를 유지해 구조를 선반영할 수 있다.
- 기존 F01 배너 동작(텍스트 배너)은 그대로 유지한다.

**Dependencies**: 3, 4

---

### Task 6: 통합 테스트 (파일 로딩/오류 경로)
**Component**: Tests
**Priority**: P0-Critical
**Type**: Test

**Description**:
파일 트리 선택 -> 파일 본문 로딩 -> center 패널 렌더링, 그리고 read 실패 시 오류 상태 노출을 App 레벨 테스트로 검증한다.

**Acceptance Criteria**:
- [ ] `window.workspace.readFile` mock 경로가 추가된다.
- [ ] 파일 선택 시 본문 렌더링이 검증된다.
- [ ] read 실패 시 오류 UI 또는 오류 텍스트가 검증된다.
- [ ] 대용량 또는 바이너리 입력에서 `preview 불가` 상태가 검증된다.
- [ ] 기존 F01/F02 테스트가 회귀 없이 유지된다.

**Target Files**:
- [M] `src/App.test.tsx` -- readFile mock/성공/실패 시나리오 추가

**Technical Notes**:
- 테스트는 사용자 흐름 기반으로 작성하고 구현 세부(내부 state shape)에 과도하게 결합하지 않는다.

**Dependencies**: 5

---

### Task 7: 단위 테스트 (라인 선택 규칙)
**Component**: Tests
**Priority**: P1-High
**Type**: Test

**Description**:
`line-selection` 유틸 또는 `CodeViewerPanel` 선택 로직의 경계 케이스(단일 선택, 확장 선택, 역방향 선택)를 단위 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] 단일 클릭 선택 케이스 테스트가 존재한다.
- [ ] Shift+클릭 범위 확장 케이스 테스트가 존재한다.
- [ ] 역방향 선택 시 `startLine <= endLine` 정규화가 검증된다.

**Target Files**:
- [C] `src/code-viewer/line-selection.test.ts` -- 선택 범위 유틸 단위 테스트
- [C] `src/code-viewer/code-viewer-panel.test.tsx` -- 컴포넌트 선택 상호작용 테스트(필요 시)

**Technical Notes**:
- 선택 로직을 유틸로 분리하면 테스트 안정성과 병렬 개발성이 높아진다.

**Dependencies**: 4

---

## Parallel Execution Summary
| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 3 | 1 | `electron/main.ts`(Task 1), `workspace-context.tsx`(Task 3) 의존성으로 순차 권장 |
| 2 | 2 | 1 | Task 5가 `App.tsx` 통합이므로 Task 4 이후 순차 |
| 3 | 2 | 2 | 없음 (`src/App.test.tsx` vs `src/code-viewer/*.test.ts*`) |

### Conflict Notes
- 파일 수준 충돌은 Phase 3 외에는 최소화했지만, `WorkspaceProvider` 상태 계약 변경은 의미적 충돌 지점이다.
- Task 4와 Task 5는 파일 충돌은 없더라도 props 계약 충돌 가능성이 있어 Task 4 완료 후 Task 5 진행을 권장한다.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| 대용량 파일을 한 번에 읽어 UI 프리즈 발생 | 렌더 지연/사용성 저하 | 2MB 초과 파일은 읽기 대신 `preview 불가` 상태를 즉시 반환 |
| 바이너리 파일을 텍스트로 렌더 | 뷰 깨짐/오류 | 바이너리 감지 시 `preview 불가` 상태로 처리 |
| 비동기 read 응답 순서 역전 | 잘못된 파일 본문 표시 | 최신 선택 요청 토큰 기반으로 응답 반영 |
| 선택 범위 기준 불일치(0-based/1-based) | 복사 포맷 오류 | 내부 계산/표시 모두 1-based로 통일하고 단위 테스트 고정 |

## Resolved Decisions
- [x] 대용량 파일 preview 기준은 2MB로 고정한다(필요 시 후속 feature에서 조정).
- [x] 바이너리 파일은 오류 대신 `preview 불가` 전용 상태로 처리한다.

## Open Questions
- 없음 (현재 결정 완료)

## Model Recommendation
- 구현 추천: `sonnet` (현재 범위는 IPC + React 상태/뷰 + 테스트 중심의 중간 복잡도)
- 병렬 구현 시: Phase 3 테스트 태스크는 병렬 처리 적합

---

## Next Steps

### Apply Spec Patch (choose one)
- **Method A (automatic)**: `spec-update-todo` 실행 후 이 문서의 Part 1을 입력으로 사용
- **Method B (manual)**: Part 1 항목을 각 Target Section에 수동 반영

### Execute Implementation
- **Parallel**: `implementation-parallel` 스킬로 Part 2 실행
- **Sequential**: `implementation` 스킬로 Part 2 실행 (Target Files는 참조용)
