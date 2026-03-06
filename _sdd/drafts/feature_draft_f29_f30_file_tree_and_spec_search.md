# Feature Draft: F29/F30 — 파일 브라우저 검색 + 스펙 뷰어 텍스트 검색

**Date**: 2026-03-06
**Author**: user + Codex
**Status**: 📋 Planned
**Target Spec**: `_sdd/spec/main.md` + 하위 문서

---

# Part 1: Spec Patch Draft

> 이 패치는 해당 스펙 섹션에 복사-붙여넣기하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-03-06
**Author**: user + Codex
**Target Spec**: `_sdd/spec/main.md` + 하위 문서

## New Features

### Feature: F29 파일 브라우저 파일명 검색 (로컬/리모트 공통, backend-assisted)
**Priority**: Medium  
**Category**: File Tree UX / Search  
**Target Component**: `FileTreePanel`, `WorkspaceProvider`, `WorkspaceBackend(local/remote)`, `Electron IPC`, `Remote Agent Runtime`  
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.2 Workspace State Layer`, `1.3 File Tree Layer`, `1.7 Electron Boundary`; `_sdd/spec/sdd-workbench/04-interfaces.md` > `IPC 계약`; `_sdd/spec/sdd-workbench/01-overview.md` > 기능 커버리지

**Description**:  
좌측 파일 브라우저 상단에 파일명 검색 입력 UI를 추가한다. 검색은 현재 렌더된 트리 상태에 의존하지 않고 workspace backend가 직접 파일 시스템을 탐색해 수행한다. 로컬/리모트 모두 동일한 계약을 사용하며, 검색 범위는 **파일명 substring match(case-insensitive)** 로 제한한다. 탐색은 depth limit와 대형 디렉토리 skip 정책을 적용해 대규모 저장소에서도 UI 정지 없이 동작해야 한다.

**Acceptance Criteria**:

- [ ] 파일 브라우저 상단에 검색 입력과 clear 액션이 표시된다.
- [ ] 검색은 현재 로드된 트리 여부와 무관하게 workspace 전체 후보를 탐색한다.
- [ ] 매칭 기준은 파일명 기준 substring match이며 기본적으로 case-insensitive 동작이다.
- [ ] 검색은 로컬/리모트 workspace에서 동일한 결과 계약(`results`, `truncated`, `skippedLargeDirectoryCount`, `depthLimitHit`, `timedOut`)을 사용한다.
- [ ] 검색은 기본 depth limit `20`을 넘는 하위 디렉토리를 탐색하지 않는다.
- [ ] eligible child count가 `10,000` 초과인 디렉토리는 해당 subtree 탐색을 건너뛴다.
- [ ] 심볼릭 링크 디렉토리는 재귀 탐색하지 않는다.
- [ ] 결과 수는 기본 cap `200`으로 제한되며 cap 또는 시간 예산 초과 시 partial 결과와 상태 힌트를 함께 표시한다.
- [ ] 검색 실행은 debounce(예: 200ms) 적용으로 키 입력마다 과도한 RPC를 발생시키지 않는다.
- [ ] 검색 결과 클릭 시 해당 파일이 열리고, 상위 디렉토리는 best-effort로 확장된다.
- [ ] 검색어가 비면 일반 파일 트리 표시로 즉시 복귀한다.
- [ ] 결과가 0건이면 `"No files found"` 상태를 표시한다.

**Technical Notes**:

- 검색은 파일 내용이 아닌 파일명만 대상으로 한다.
- 기존 ignore 규칙(`.git`, `node_modules`, `dist`, `build`, `out`, `.next`, `.turbo`)을 그대로 재사용한다.
- 리모트는 현재 `workspace:index` 초기 인덱스가 `maxDepth: 0` 기준이므로, 검색은 `fileTree` 상태가 아닌 backend/runtime 직접 탐색 방식으로 구현한다.
- 기본 시간 예산은 `2000ms`를 제안하며, 초과 시 `timedOut=true`와 partial 결과를 반환한다.
- 결과 항목은 최소 `relativePath`, `fileName`, `parentRelativePath`를 포함한다.

**Dependencies**:

- F23 (2패널 탭 레이아웃)
- F25/F25b (파일 트리 상호작용/경로 기반 액션)
- F27/F28 (remote backend/runtime 구조)

### Feature: F30 스펙 뷰어 텍스트 검색 (블록 단위 강조)
**Priority**: Medium  
**Category**: Spec Viewer UX / Search  
**Target Component**: `SpecViewerPanel`, `App Shell`  
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`, `1.5 Spec Viewer Layer`; `_sdd/spec/sdd-workbench/01-overview.md` > 기능 커버리지; `_sdd/spec/sdd-workbench/appendix.md` > 상세 수용 기준

**Description**:  
렌더된 markdown spec 패널에 문서 내 텍스트 검색 UI를 추가한다. 검색은 현재 열린 `markdownContent` 원문을 기준으로 case-insensitive substring 매칭을 수행하고, 매치된 source line에 대응되는 **렌더 블록 단위**(`h*`, `p`, `li`, `blockquote`, `pre`, `table`)에 강조 표시를 적용한다. 사용자는 검색 입력, 이전/다음 이동, 카운트 표시, `Cmd/Ctrl+F` 단축키로 현재 문서 내 결과를 빠르게 탐색할 수 있다.

**Acceptance Criteria**:

- [ ] spec 패널에서 검색 바를 열어 현재 문서의 텍스트를 검색할 수 있다.
- [ ] 매칭 기준은 `markdownContent` 원문에 대한 case-insensitive substring match다.
- [ ] 매치된 source line에 대응되는 렌더 블록에 `.is-spec-search-match` 스타일이 적용된다.
- [ ] 현재 포커스된 매치 블록에 `.is-spec-search-focus` 스타일이 추가 적용된다.
- [ ] 이전/다음 버튼과 `Enter` / `Shift+Enter`로 결과 간 이동할 수 있다.
- [ ] 이동 시 해당 블록은 `scrollIntoView({ block: 'center' })` 또는 동등 UX로 중앙 근처에 스크롤된다.
- [ ] 결과 수 `"N / M"` 또는 `"No results"` 표시가 제공된다.
- [ ] `Escape` 또는 닫기 버튼으로 검색을 닫으면 하이라이트가 해제된다.
- [ ] `activeSpecPath` 변경 시 검색 상태가 초기화된다.
- [ ] `Cmd/Ctrl+F`는 Spec 탭이 활성 상태일 때만 spec 검색 바를 연다.
- [ ] 문서가 없거나 markdownContent가 없는 상태에서는 검색 UI가 비활성/비노출된다.

**Technical Notes**:

- 인라인 단어 단위 하이라이트는 이번 범위에서 제외하고 블록 단위 강조만 지원한다.
- 매치 라인 계산은 raw markdown line 배열을 기반으로 수행하고, 렌더 블록은 기존 `data-source-line` 매핑을 재사용한다.
- 기존 TOC, anchor 이동, comment marker, source popover 동작을 깨지 않도록 검색 상태는 `SpecViewerPanel` 로컬 상태로 관리한다.
- Code 탭의 CM6 기본 검색과 충돌하지 않도록 App Shell에서 Spec 탭 활성 여부를 기준으로 hotkey를 제한한다.

**Dependencies**:

- F10.1/F11.1 (source-line 매핑 및 rendered markdown 블록 마커 기반)
- F23 (Code/Spec 탭 전환)
- F24 (Code 탭의 CM6 검색과 공존)

## Improvements

### Improvement: 워크스페이스 검색 IPC/RPC 계약 추가
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/04-interfaces.md` > `IPC 계약`  
**Current State**: `workspace:index`와 `workspace:indexDirectory`는 트리 인덱싱/페이지 로드만 제공하고, 검색 계약은 없다.  
**Proposed**: `workspace:searchFiles` 계약을 추가해 파일명 검색을 backend abstraction 경유로 통일한다.  
**Reason**: 리모트 workspace는 초기 트리 인덱스가 얕기 때문에, renderer-local 트리 필터링만으로는 실사용 가능한 검색을 제공할 수 없다.

### Improvement: 검색 결과 partial 상태/skip 메타데이터 표준화
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/04-interfaces.md` > `IPC 계약`, `_sdd/spec/sdd-workbench/05-operational-guides.md` > 성능/신뢰성 기준  
**Current State**: 인덱싱에는 `truncated`가 있으나 검색은 아직 정의되지 않았다.  
**Proposed**: 검색 응답에 `truncated`, `skippedLargeDirectoryCount`, `depthLimitHit`, `timedOut`를 포함한다.  
**Reason**: 성능 보호 정책이 조용히 결과를 누락시키지 않도록 UI와 테스트가 partial 상태를 명시적으로 다룰 수 있어야 한다.

## Component Changes

### Component Change: File Tree Layer 검색 모드 추가
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.3 File Tree Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- `FileTreePanel` 상단에 검색 입력/clear/loading/result 상태 추가
- 검색어가 비어 있지 않을 때 일반 트리 대신 검색 결과 목록을 렌더
- 결과 선택 시 기존 `onSelectFile(relativePath)` 흐름 재사용

### Component Change: Workspace State / Backend 검색 액션 추가
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.2 Workspace State Layer`, `1.7 Electron Boundary`  
**Type**: Existing Component Extension  
**Change Summary**:

- `WorkspaceProvider`에 검색 호출 액션 추가
- local/remote backend 공통 `searchFiles()` 메서드 추가
- preload / renderer 타입 / IPC 핸들러 / remote runtime에 검색 계약 연결

### Component Change: Spec Viewer 검색 상태 및 hotkey 게이트 추가
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`, `1.5 Spec Viewer Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- `SpecViewerPanel`에 검색 바/매치 상태/이동 액션/블록 하이라이트 추가
- `App.tsx`가 Spec 탭 활성 여부를 `SpecViewerPanel`에 전달해 `Cmd/Ctrl+F` 충돌을 제어

## API Changes

### API Change: `workspace:searchFiles`
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/04-interfaces.md` > `IPC 계약`  
**Current State**: 검색 전용 IPC/RPC가 없음  
**Proposed**:

- request:
  - `{ rootPath, query, maxDepth?: number, maxResults?: number, maxDirectoryChildren?: number, timeBudgetMs?: number }`
- response:
  - `{ ok: boolean, results: Array<{ relativePath: string, fileName: string, parentRelativePath: string }>, truncated: boolean, skippedLargeDirectoryCount: number, depthLimitHit: boolean, timedOut: boolean, error?: string }`

**Reason**: 검색 정책을 local/remote 공통 계약으로 고정해 renderer가 저장소 크기나 연결 방식에 상관없이 일관된 UX를 제공하도록 하기 위함

## Notes

### Scope Boundary

- 파일 브라우저 검색은 파일명만 대상으로 하며 파일 내용 검색은 포함하지 않는다.
- fuzzy search, regex search, whole-word search, replace는 제외한다.
- 스펙 뷰어 검색은 렌더 블록 단위 강조만 포함하고 인라인 단어 하이라이트는 제외한다.
- 검색 결과 영속화, 최근 검색어 저장, 다중 탭 간 검색 상태 공유는 포함하지 않는다.

---

# Part 2: Implementation Plan

# Implementation Plan: F29/F30 파일 브라우저 검색 + 스펙 뷰어 텍스트 검색

## Overview

두 검색 기능을 추가한다.

1. **F29 파일 브라우저 검색**: local/remote 공통 backend 탐색 기반 파일명 검색
2. **F30 스펙 뷰어 검색**: 현재 markdown 문서 내 검색 + 블록 단위 강조 + 결과 이동

핵심 설계 차이는 다음과 같다.

- 파일 브라우저 검색은 현재 `fileTree`만 필터링하면 리모트에서 거의 동작하지 않으므로 backend contract가 필요하다.
- 스펙 뷰어 검색은 이미 메모리에 있는 `markdownContent`와 `data-source-line`을 재사용하면 renderer 범위에서 해결 가능하다.

## Scope

### In Scope

- `workspace:searchFiles` IPC/RPC 및 local/remote backend 구현
- depth limit / large-directory skip / result cap / time budget 정책 반영
- 파일 브라우저 검색 UI, loading/empty/partial 상태
- 스펙 뷰어 검색 UI, 결과 카운트, 이전/다음 이동, 블록 단위 하이라이트
- Spec 탭 활성 시에만 `Cmd/Ctrl+F`가 spec 검색을 열도록 하는 hotkey 게이트
- 자동 테스트 추가

### Out of Scope

- 파일 내용 검색
- 경로 전체 fuzzy search
- 검색 결과 최근 기록/영속화
- 스펙 뷰어 인라인 단어 하이라이트
- Code 탭 CM6 검색 UX 변경

## Components

1. **Search Contract Layer**: backend abstraction, preload, renderer 타입 계약
2. **Workspace Search Backend**: local Electron main + remote runtime 탐색 구현
3. **File Tree Search UI**: 검색 입력, 결과 목록, partial 상태 힌트
4. **Spec Search UI**: 문서 검색, 블록 강조, 다음/이전 이동
5. **Validation**: backend/runtime 테스트 + renderer 상호작용 테스트

## Implementation Phases

### Phase 1: 검색 계약 및 backend 구현

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | `workspace:searchFiles` 타입/bridge/contract 정의 | P0 | - | Search Contract Layer |
| 2 | 로컬 backend 파일명 검색 구현 | P0 | 1 | Workspace Search Backend |
| 3 | remote runtime + remote backend 검색 구현 | P0 | 1 | Workspace Search Backend |

### Phase 2: 파일 브라우저 검색 UI 통합

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 4 | WorkspaceContext 액션 + FileTreePanel 검색 UI/결과 렌더 | P0 | 1, 2, 3 | File Tree Search UI |

### Phase 3: 스펙 뷰어 검색 UX 구현

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 5 | SpecViewerPanel 검색 상태/블록 하이라이트/이동 구현 | P0 | - | Spec Search UI |
| 6 | App Shell hotkey 게이트 + Spec 활성 상태 연결 | P1 | 5 | Spec Search UI |

### Phase 4: 검증 및 회귀 테스트

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 7 | backend/runtime/file-tree 검색 테스트 추가 | P0 | 2, 3, 4 | Validation |
| 8 | spec 검색 테스트 추가 | P0 | 5, 6 | Validation |

## Task Details

### Task 1: `workspace:searchFiles` 타입/bridge/contract 정의
**Component**: Search Contract Layer  
**Priority**: P0  
**Type**: Infrastructure

**Description**:  
local/remote backend가 공통으로 사용할 검색 계약을 정의한다. request/response shape, 결과 메타데이터, preload bridge, renderer 전역 타입, backend interface를 추가한다.

**Acceptance Criteria**:

- [ ] `WorkspaceBackend` 인터페이스에 `searchFiles(request)`가 추가된다.
- [ ] preload `window.workspace.searchFiles(...)` 브리지가 추가된다.
- [ ] renderer 타입 선언에 검색 request/result 인터페이스가 추가된다.
- [ ] 응답 메타데이터(`truncated`, `skippedLargeDirectoryCount`, `depthLimitHit`, `timedOut`)가 타입으로 고정된다.

**Target Files**:
- [M] `electron/workspace-backend/types.ts` -- backend 공통 request/result 타입 + 인터페이스 메서드 추가
- [M] `electron/preload.ts` -- `searchFiles` bridge 및 result 타입 추가
- [M] `electron/electron-env.d.ts` -- renderer 전역 타입 계약 추가

**Technical Notes**:

- 결과 item은 최소 `relativePath`, `fileName`, `parentRelativePath` 포함
- 구현 상수 기본값(`20`, `200`, `10000`, `2000ms`)은 request 생략 시 backend 기본값으로 처리

**Dependencies**: 없음

### Task 2: 로컬 backend 파일명 검색 구현
**Component**: Workspace Search Backend  
**Priority**: P0  
**Type**: Feature

**Description**:  
로컬 workspace용 `workspace:searchFiles` IPC 핸들러를 구현한다. ignore 규칙 재사용, depth limit, large-directory skip, symlink skip, result cap, time budget을 적용하며 파일명 substring match를 수행한다.

**Acceptance Criteria**:

- [ ] 로컬 검색이 파일명 기준 case-insensitive substring match를 수행한다.
- [ ] 디렉토리 depth limit `20`을 초과하면 하위 탐색을 중단한다.
- [ ] child count `10,000` 초과 디렉토리는 subtree 탐색을 건너뛴다.
- [ ] 결과 cap `200` 도달 또는 time budget 초과 시 partial 결과를 반환한다.
- [ ] ignore 규칙과 심볼릭 링크 skip 정책이 유지된다.

**Target Files**:
- [M] `electron/main.ts` -- 검색 핸들러/탐색 유틸/IPC 라우팅 추가
- [M] `electron/workspace-backend/local-workspace-backend.ts` -- local backend handler wiring
- [M] `electron/workspace-backend/backend-integration.test.ts` -- 라우팅/응답 계약 검증 추가

**Technical Notes**:

- 가능한 한 기존 인덱싱용 entry 수집/정렬/경계 검사 유틸을 재사용한다.
- 결과는 파일만 반환하고 디렉토리 자체 매치는 반환하지 않는다.

**Dependencies**: 1

### Task 3: remote runtime + remote backend 검색 구현
**Component**: Workspace Search Backend  
**Priority**: P0  
**Type**: Feature

**Description**:  
remote agent runtime에 동일한 검색 정책을 구현하고, `remote-workspace-backend`에서 RPC 메서드를 노출한다. 로컬과 응답 shape/정책을 일치시켜 renderer 분기 없이 동작하도록 한다.

**Acceptance Criteria**:

- [ ] remote runtime에 `workspace.searchFiles` 메서드가 추가된다.
- [ ] remote backend가 `workspace:searchFiles`를 원격 RPC로 전달한다.
- [ ] 로컬과 동일한 기본 정책(depth limit/result cap/large-directory skip/time budget)을 사용한다.
- [ ] remote 응답도 동일한 메타데이터 필드를 반환한다.

**Target Files**:
- [M] `electron/remote-agent/runtime/workspace-ops.ts` -- remote 검색 구현
- [M] `electron/remote-agent/runtime/runtime-types.ts` -- runtime 검색 타입 추가
- [M] `electron/workspace-backend/remote-workspace-backend.ts` -- remote backend RPC 메서드 추가
- [M] `electron/remote-agent/runtime/workspace-ops.test.ts` -- runtime 검색 정책 테스트 추가
- [M] `electron/workspace-backend/remote-workspace-backend.test.ts` -- RPC forwarding 테스트 추가
- [M] `electron/remote-agent/runtime/generated-payload.ts` -- runtime payload 재생성 산출물 반영

**Technical Notes**:

- 현재 remote index는 `maxDepth: 0` 초기 인덱스만 사용하므로, 검색은 `fileTree` 상태와 독립적으로 runtime 파일시스템 탐색으로 수행해야 한다.
- payload 재생성은 source 변경 후 후처리 단계에서 수행한다.

**Dependencies**: 1

### Task 4: WorkspaceContext 액션 + FileTreePanel 검색 UI/결과 렌더
**Component**: File Tree Search UI  
**Priority**: P0  
**Type**: Feature

**Description**:  
파일 브라우저 상단에 검색 입력과 결과 렌더 영역을 추가한다. 검색은 debounce 후 `searchFiles` 액션을 호출하고, 일반 트리와 검색 결과 UI를 전환한다. 결과 선택 시 기존 파일 열기/활성화 흐름을 재사용한다.

**Acceptance Criteria**:

- [ ] 검색어 입력 시 debounce 후 backend 검색이 호출된다.
- [ ] 검색 중 loading 상태가 표시된다.
- [ ] 검색 결과 목록이 상대경로와 함께 렌더된다.
- [ ] 결과 클릭 시 파일이 열린다.
- [ ] 검색어가 비면 일반 트리 표시로 돌아간다.
- [ ] partial 결과일 때 `"results may be incomplete"` 수준의 힌트가 표시된다.
- [ ] `"No files found"` 빈 상태가 표시된다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- `searchFiles` 액션 추가
- [M] `src/workspace/use-workspace.ts` -- 검색 액션 노출 타입 동기화
- [M] `src/App.tsx` -- FileTreePanel 검색 콜백 wiring
- [M] `src/file-tree/file-tree-panel.tsx` -- 검색 입력/결과 목록/상태 렌더 추가
- [M] `src/App.css` -- 파일 트리 검색 UI 스타일 추가

**Technical Notes**:

- 검색 상태(query/loading/results)는 우선 `FileTreePanel` 로컬 상태로 유지하고, backend 호출 함수만 상위에서 주입한다.
- 상위 디렉토리 자동 확장은 best-effort로 제한하며, lazy tree 구조상 완전한 ancestor hydration은 이번 범위에서 필수가 아니다.

**Dependencies**: 1, 2, 3

### Task 5: SpecViewerPanel 검색 상태/블록 하이라이트/이동 구현
**Component**: Spec Search UI  
**Priority**: P0  
**Type**: Feature

**Description**:  
현재 markdown 문서에 대한 검색 기능을 `SpecViewerPanel` 내부 상태로 구현한다. raw markdown 라인 매치 결과를 계산하고, 매치 라인에 대응되는 렌더 블록에 하이라이트 클래스를 부여한다. 이전/다음 이동과 결과 카운트, Escape 닫기까지 포함한다.

**Acceptance Criteria**:

- [ ] 검색 바 UI(입력/카운트/이전/다음/닫기)가 표시된다.
- [ ] raw markdown 기준 substring match 결과가 계산된다.
- [ ] 매치 블록과 현재 포커스 블록에 별도 CSS 클래스가 적용된다.
- [ ] 이전/다음 이동 시 현재 블록으로 스크롤한다.
- [ ] `activeSpecPath` 변경 시 검색 상태가 초기화된다.
- [ ] 문서 미존재/미로딩 상태에서는 검색 UI가 비활성 또는 비노출된다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- 검색 상태/UI/하이라이트/스크롤 이동
- [M] `src/App.css` -- spec 검색 UI 및 블록 하이라이트 스타일

**Technical Notes**:

- 기존 `data-source-line` 속성을 재사용해 블록 하이라이트 대상을 판별한다.
- comment marker, TOC, source popover와 충돌하지 않도록 검색용 class merge만 추가한다.

**Dependencies**: 없음

### Task 6: App Shell hotkey 게이트 + Spec 활성 상태 연결
**Component**: Spec Search UI  
**Priority**: P1  
**Type**: Feature

**Description**:  
Spec 탭이 활성인 경우에만 `Cmd/Ctrl+F`가 spec 검색을 열도록 App Shell과 SpecViewerPanel 사이의 활성 상태 연결을 추가한다. Code 탭에서는 기존 CM6 검색 동작이 유지되어야 한다.

**Acceptance Criteria**:

- [ ] `activeTab === 'spec'`일 때만 spec 검색 hotkey가 활성화된다.
- [ ] Code 탭에서는 CM6 `Mod-f` 동작을 방해하지 않는다.
- [ ] hotkey 충돌 없이 Spec 탭과 Code 탭이 공존한다.

**Target Files**:
- [M] `src/App.tsx` -- Spec 활성 상태 prop 전달
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- hotkey gate prop 처리

**Technical Notes**:

- 전역 keydown 리스너가 필요하면 `isActive` prop과 cleanup을 함께 사용한다.

**Dependencies**: 5

### Task 7: backend/runtime/file-tree 검색 테스트 추가
**Component**: Validation  
**Priority**: P0  
**Type**: Test

**Description**:  
로컬/리모트 검색 정책과 파일 브라우저 검색 UI를 자동 테스트로 검증한다.

**Acceptance Criteria**:

- [ ] depth limit, large-directory skip, result cap, timed out 메타데이터가 테스트된다.
- [ ] remote runtime 응답 shape이 로컬과 동일함을 검증한다.
- [ ] FileTreePanel 검색 입력/결과 선택/빈 상태/partial 상태가 테스트된다.

**Target Files**:
- [M] `electron/workspace-backend/backend-integration.test.ts` -- 로컬 라우팅/응답 계약 테스트
- [M] `electron/remote-agent/runtime/workspace-ops.test.ts` -- remote 검색 정책 테스트
- [M] `electron/workspace-backend/remote-workspace-backend.test.ts` -- remote forwarding 테스트
- [M] `src/file-tree/file-tree-panel.test.tsx` -- 검색 UI/결과 상호작용 테스트

**Dependencies**: 2, 3, 4

### Task 8: spec 검색 테스트 추가
**Component**: Validation  
**Priority**: P0  
**Type**: Test

**Description**:  
스펙 검색 UI, 블록 강조, 결과 이동, hotkey gate를 자동 테스트로 검증한다.

**Acceptance Criteria**:

- [ ] 검색어 입력 시 결과 카운트와 하이라이트가 반영된다.
- [ ] 이전/다음 이동 시 포커스 블록 전환과 scrollIntoView 호출이 검증된다.
- [ ] `Escape` 닫기 및 `activeSpecPath` 변경 초기화가 검증된다.
- [ ] Spec 탭 활성 상태에서만 hotkey가 동작함을 검증한다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- 검색 UI/이동/hotkey 테스트
- [M] `src/App.test.tsx` -- Spec 탭 활성 hotkey gate 회귀 테스트

**Dependencies**: 5, 6

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 리모트 대형 저장소에서 검색 RPC 지연 | Medium | depth limit, result cap, large-directory skip, time budget 동시 적용 |
| large-directory skip가 기대 결과 일부를 숨김 | Medium | partial 힌트 + skip count를 UI에 표시 |
| Spec 검색 하이라이트가 comment marker/TOC와 충돌 | Medium | 기존 `data-source-line`/class merge 패턴 재사용, 테스트 보강 |
| `Cmd/Ctrl+F` 충돌로 Code 탭 검색 회귀 | High | Spec 탭 활성 시에만 hotkey gate, App-level 회귀 테스트 추가 |

## Open Questions

- 두 검색 기능은 구현 경계가 다르지만 모두 “탐색 검색 UX” 범주이므로 하나의 draft 파일에 묶고, 기능 ID는 `F29`/`F30`으로 분리했다.
- 파일 브라우저 검색 기본 depth limit는 사용자 피드백을 반영해 기본값 `20`으로 고정한다. 실제 대형/원격 smoke 결과에서 과도한 지연이 확인되면 구현 단계에서 추가 보호 장치(result cap/time budget)를 우선 조정한다.
- 검색 시간 예산은 사용자 피드백을 반영해 기본 `2000ms`로 고정한다. 원격 환경 편차는 partial 응답 메타데이터와 debounce로 완화한다.

## Parallelization Notes

- Task 1 완료 전에는 후속 작업 병렬화 가치가 낮다.
- Task 2와 Task 3은 타입 계약 고정 후 병렬 진행 가능하다.
- Task 4는 Task 2/3 결과 계약이 고정된 뒤 진행하는 것이 안전하다.
- Task 5는 backend 작업과 독립적이므로 Phase 1과 병렬 가능하다.
- Task 6은 Task 5 이후 소규모 후속 작업이다.
- Task 7과 Task 8은 각각 파일 트리/스펙 검색 축으로 분리해 병렬화 가능하다.

## Model Recommendation

- `sonnet` — backend contract + renderer UX + 테스트 설계를 한 문서에서 정리하기에 충분하다.
