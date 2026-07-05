# Feature Draft: 프로젝트 전체 텍스트 검색

<!-- spec-update-todo-input-start -->
# Part 1: Temporary Spec Draft

## Change Summary

SDD Workbench에 VS Code의 프로젝트 내 텍스트 검색과 유사한 MVP를 추가한다. 현재 검색 surface는 Code Viewer 현재 파일 검색, File Browser 파일명 검색(`workspace:searchFiles`), Spec Viewer 현재 spec 검색으로 나뉘어 있으며, 워크스페이스 전체 파일 내용을 찾는 기능은 없다.

이번 delta는 기존 `workspace:searchFiles` 파일명 검색 계약을 확장하지 않고, 로컬/원격 워크스페이스 공통 `workspace:searchText` IPC와 remote agent `workspace.searchText` method를 새로 추가한다. Renderer는 local/remote 차이를 숨긴 `WorkspaceProvider.searchText(query)`를 사용하고, UI는 File Tree 검색 입력과 섞지 않는 sidebar Search 탭 MVP로 시작한다.

MVP 검색 semantics는 case-insensitive substring이다. 결과는 파일 경로, 1-based line number, line snippet을 제공하고, 사용자가 결과를 클릭하면 기존 Code Viewer line jump/highlight 흐름으로 해당 파일/라인을 연다. Regex, replace, include/exclude glob, 복잡한 필터링은 이번 범위에서 제외한다.

## Scope Delta

### In Scope

- 새 feature ID 제안: `F51` 프로젝트 전체 텍스트 검색.
- 로컬/원격 공통 `workspace:searchText` IPC, preload bridge, backend abstraction, remote agent runtime method 추가.
- 텍스트 검색 엔진:
  - case-insensitive substring line scan.
  - 결과 단위: `{ relativePath, lineNumber, snippet }`.
  - empty/whitespace query는 빈 결과.
  - ignored dirs: 기존 파일명 검색과 같은 `.git`, `node_modules`, `dist`, `build`, `out`, `.next`, `.turbo`.
  - symlink directory 재귀 금지.
  - large directory skip, max depth, result cap, time budget, file size cap, binary skip.
  - partial 상태: `truncated`, `timedOut`, `depthLimitHit`, `skippedLargeDirectoryCount`, `skippedLargeFileCount`, `skippedBinaryFileCount`.
- Sidebar 영역에 File Tree와 별도 Search 탭 추가.
- Search 탭에서 query 입력, loading/error/empty/partial 상태, 파일별 grouped results, line number, snippet 표시.
- 결과 클릭 시 기존 `selectFile`, `setSelectionRange`, `queueCodeViewerJumpRequest`를 재사용해 Code 탭으로 이동하고 line highlight 적용.
- 원격 runtime 변경 후 `npm run build:remote-agent-runtime` 실행 및 generated payload 갱신.
- 테스트:
  - local scanner semantics와 guardrail.
  - IPC routing/backend local/remote parity.
  - remote method allowlist/router/runtime.
  - renderer stale request discard, partial 표시, result click navigation.

### Out of Scope

- Regex 검색.
- Replace/replace all.
- Include/exclude glob 입력.
- 파일 타입/확장자 필터.
- 검색 결과 영구 저장.
- 전체 repo 인덱스 구축 또는 별도 검색 엔진 의존성 추가.
- Code Viewer 내부 검색 semantics 변경.
- 기존 File Browser `workspace:searchFiles` semantics 변경.

### Guardrail Delta

- 프로젝트 텍스트 검색은 `activeWorkspaceId`의 active workspace root 안에서만 실행한다.
- Local/remote 차이는 renderer에 노출하지 않고 `workspace:*` IPC와 `WorkspaceBackendRouter` 뒤에 둔다.
- 검색은 main process 또는 remote agent runtime에서 수행하며 renderer가 직접 filesystem을 읽지 않는다.
- 대형 repo 보호를 위해 traversal/time/result/file-size/binary guardrail을 기본 동작으로 둔다.
- Renderer는 query 또는 workspace가 바뀐 뒤 도착한 stale response를 폐기한다.

## Contract/Invariant Delta

| ID | Type | Change | Why |
|----|------|--------|-----|
| C1 | Add | `workspace:searchText` IPC와 preload `window.workspace.searchText(rootPath, query)`를 추가한다. Request는 active root path와 query만 public surface로 받고, cap 값은 backend 기본값으로 적용한다. | 파일명 검색과 내용 검색 계약을 분리하고 renderer filesystem 접근을 피한다. |
| C2 | Add | `WorkspaceBackend`에 `searchText` method를 추가하고 local backend와 remote backend가 같은 result shape를 반환한다. | local/remote 차이를 `workspace:*` surface 뒤에 숨기는 기존 global guardrail을 유지한다. |
| C3 | Add | Remote Agent Protocol allowlist와 runtime router에 `workspace.searchText`를 추가한다. Runtime 변경 후 generated payload를 다시 빌드한다. | 원격 워크스페이스에서도 로컬과 같은 기능을 제공한다. |
| C4 | Add | Text search MVP는 case-insensitive substring line scan이며 empty query는 빈 결과다. Regex, replace, include/exclude glob은 지원하지 않는다. | MVP 범위를 작게 유지하고 기존 `workspace:searchFiles` wildcard semantics와 혼동하지 않는다. |
| C5 | Add | Search result는 `relativePath`, 1-based `lineNumber`, `snippet`을 포함하고 partial guardrail flags를 함께 반환한다. | UI가 파일/라인/snippet을 표시하고 불완전 결과를 명시할 수 있어야 한다. |
| C6 | Add | Sidebar Search 탭은 File Tree 검색과 별도 surface이며, result click은 existing Code Viewer line jump/highlight를 재사용한다. | 파일명 검색 UX와 프로젝트 내용 검색 UX를 섞지 않고 navigation contract를 재사용한다. |
| I1 | Add | Text search는 workspace root 밖 경로를 읽지 않고 remote root mismatch 또는 relative path escape를 허용하지 않는다. | workspace 경계와 remote security contract를 유지한다. |
| I2 | Add | Text search는 ignored dirs, symlink directory skip, max depth, result cap, time budget, file size cap, binary skip을 항상 적용한다. | 대형 repo에서 앱 응답성과 remote session 안정성을 지킨다. |
| I3 | Add | Renderer search panel은 stale request token을 사용해 오래된 결과를 표시하지 않는다. | 빠른 query 변경 또는 workspace switch 후 잘못된 결과 표시를 막는다. |
| I4 | Add | `workspace:searchFiles` 파일명 검색과 Spec Viewer 현재 문서 검색은 이번 변경으로 semantics가 바뀌지 않는다. | 기존 검색 기능 회귀를 막는다. |

## Touchpoints

- `_sdd/spec/feature-index.md`: `F51` planned feature entry 추가.
- `_sdd/spec/workspace-and-file-tree/contracts.md`: `workspace:searchText` IPC request/response와 guardrail 추가.
- `_sdd/spec/spec-viewer/contracts.md`: Search Rules에 Project Text Search를 별도 검색 surface로 추가하고, File Browser 파일명 검색과 Spec Viewer 현재 문서 검색과의 경계를 명시.
- `_sdd/spec/remote-workspace/overview.md`, `_sdd/spec/remote-workspace/contracts.md`: remote agent `workspace.searchText` method와 local/remote parity를 반영.
- `_sdd/spec/decision-log.md`: F51 MVP 범위, 별도 capability, sidebar Search tab, advanced search 제외, performance guardrail 결정을 기록.
- `electron/workspace-search.ts`: 현재 파일명 검색 유틸이 traversal cap/time budget 패턴을 제공하므로, 텍스트 검색 scanner를 같은 모듈에 추가해 local main과 remote runtime이 공유한다.
- `electron/ipc-types.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`: `WorkspaceSearchText*` 타입, IPC channel, window bridge 추가.
- `electron/workspace-ipc-handlers.ts`, `electron/workspace-ipc-routing.ts`, `electron/main.ts`: local handler, backend routed handler, `registerIpcHandlers` handler table의 `workspace:searchText` 등록 추가.
- `electron/workspace-backend/types.ts`, `electron/workspace-backend/local-workspace-backend.ts`, `electron/workspace-backend/remote-workspace-backend.ts`: backend abstraction에 `searchText` 추가.
- `electron/remote-agent/security.ts`: `workspace.searchText` allowlist 추가.
- `electron/remote-agent/runtime/workspace-ops.ts`, `electron/remote-agent/runtime/request-router.ts`, `electron/remote-agent/runtime/runtime-types.ts`: remote runtime method, params parsing, result type 추가.
- `electron/remote-agent/runtime/generated-payload.ts`: `npm run build:remote-agent-runtime`로 갱신.
- `src/workspace/workspace-context.tsx`, `src/workspace/workspace-context-types.ts`: active workspace 기반 `searchText(query)` action 추가.
- `src/project-search/project-search-panel.tsx` 또는 동등한 새 renderer component: sidebar Search 탭 UI의 독립 구현 위치.
- `src/App.tsx`, `src/App.css`: File/Search sidebar tabs, result click navigation, panel styling 통합.
- 관련 테스트: `electron/workspace-search.test.ts`, `electron/workspace-ipc-routing.test.ts`, `electron/workspace-backend/local-workspace-backend.test.ts`, `electron/workspace-backend/backend-router.test.ts`, `electron/workspace-backend/backend-integration.test.ts`, `electron/workspace-backend/remote-workspace-backend.test.ts`, `electron/remote-agent/runtime/workspace-ops.test.ts`, `electron/remote-agent/runtime/request-router.test.ts`, `electron/remote-agent/security.test.ts`, `src/App.test.tsx`, 필요 시 `src/project-search/project-search-panel.test.tsx`.

## Implementation Plan

1. Shared type surface를 먼저 추가한다: `WorkspaceSearchTextRequest`, `WorkspaceSearchTextMatch`, `WorkspaceSearchTextResult`, IPC channel, preload/window API, backend method map.
2. `electron/workspace-search.ts`에 text scanner를 추가한다. 기존 파일명 검색의 traversal pattern을 재사용하되, line content scan, file size cap, binary skip, text search partial counters를 추가한다.
3. Local handler와 routed handler를 연결한다. Local은 workspace root directory 검증 후 scanner를 호출하고, routed handler는 local/remote backend 공통 error result shape를 유지한다. `electron/main.ts`의 `registerIpcHandlers` handler table에는 `[IPC_CHANNELS.WORKSPACE_SEARCH_TEXT, handleWorkspaceSearchTextRouted]` 한 줄만 추가하고 새 IPC 등록 abstraction은 만들지 않는다.
4. Remote backend, security allowlist, runtime workspace ops, request router를 연결한다. Runtime 변경 후 `npm run build:remote-agent-runtime`으로 payload를 갱신한다.
5. Renderer workspace context에 `searchText(query)`를 추가해 active workspace root와 safe error result를 일관되게 처리한다.
6. Sidebar에 File/Search segmented tabs를 추가하고, Search panel MVP를 구현한다. Search panel은 debounced query, stale response discard, loading/error/empty/partial state, grouped file results를 처리한다.
7. Result click에서 Code 탭으로 전환하고 `selectFile(relativePath)`, `setSelectionRange({ startLine: lineNumber, endLine: lineNumber })`, `queueCodeViewerJumpRequest({ shouldHighlight: true })`를 호출한다.
8. Spec patch는 Part 1을 `spec-update-todo` 입력으로 사용해 feature index, workspace/search contracts, remote contracts, decision log를 동기화한다.
9. 검증은 focused tests, `npm run build:remote-agent-runtime`, `npm test`, `npm run lint` 순서로 수행한다.

## Validation Plan

| ID | Targets | Verification Method | Evidence / Notes |
|----|---------|---------------------|------------------|
| V1 | C1, C2, I1 | Type/test review, IPC routing tests | `electron/ipc-types.ts`, preload bridge, backend method map, `electron/main.ts` handler table, `electron/workspace-ipc-routing.test.ts`에서 `workspace:searchText` local/remote routing 확인. `electron/workspace-backend/local-workspace-backend.test.ts`, `electron/workspace-backend/backend-router.test.ts`, `electron/workspace-backend/backend-integration.test.ts`의 typed backend fixtures는 `searchText` mock/assertion만 최소 보완한다. |
| V2 | C4, C5, I2, I4 | Unit tests | `electron/workspace-search.test.ts`에 substring, case-insensitive, empty query, result cap, time budget, depth limit, large file skip, binary skip, ignored dirs, symlink directory skip 추가. |
| V3 | C2, C3, I1, I2 | Remote runtime tests | `electron/remote-agent/runtime/workspace-ops.test.ts`, `request-router.test.ts`, `remote-workspace-backend.test.ts`, `security.test.ts`에서 `workspace.searchText` allowlist/dispatch/params/result 확인. |
| V4 | C6, I3 | Renderer tests | `src/App.test.tsx`와 Search panel test에서 sidebar Search tab, stale discard, partial state 표시, result click line jump/highlight 호출 확인. |
| V5 | C3 | Build command | `npm run build:remote-agent-runtime` 실행 후 `electron/remote-agent/runtime/generated-payload.ts`가 runtime 변경을 포함하는지 확인. |
| V6 | C1-C6, I1-I4 | Full gate | `npm test`, `npm run lint`; UI 변경이므로 `npm run dev`로 Electron 앱에서 local workspace text search smoke 확인. |

## Risks / Open Questions

### Q1. MVP cap 기본값 확정
- **Decision taken**: public IPC에는 cap tuning field를 노출하지 않고, backend 기본값으로 `maxDepth=20`, `maxResults=200`, `maxDirectoryChildren=10000`, `timeBudgetMs=2000`, `maxFileBytes=1MiB`를 적용한다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: `workspace:searchFiles`처럼 max fields를 request options로 노출하는 대안은 UI/계약 surface가 커져 MVP 범위를 늘리므로 보류했다. 파일 preview cap `10MiB`를 그대로 쓰는 대안은 content scan 비용이 커져 대형 repo 위험 완화에 약하므로 보류했다.
- **Confidence**: HIGH
- **User confirmation needed**: No

### Q2. Search 탭의 정확한 sidebar 배치
- **Decision taken**: 기존 sidebar workspace controls 아래에서 File Tree panel과 Project Search panel을 전환하는 segmented tab을 `src/App.tsx`에 추가한다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: File Tree 검색 입력 아래에 내용 검색 결과를 같이 표시하는 대안은 기능 경계가 흐려져 보류했다. Header command button/modal 검색은 결과를 계속 보며 탐색하는 흐름이 약해 보류했다.
- **Confidence**: HIGH
- **User confirmation needed**: No

### Q3. 결과 클릭 highlight의 깊이
- **Decision taken**: MVP는 Code Viewer 기존 line navigation highlight만 사용하고, CodeMirror 문서 안에서 query match range를 별도 선택/강조하지 않는다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: match column 계산과 range highlight를 함께 넣는 대안은 scanner result shape와 CM6 extension 변경이 늘어나 MVP 범위를 초과하므로 보류했다. Search result snippet 안의 match 강조는 UI polish이지만 필수 navigation 계약은 아니므로 후속으로 둔다.
- **Confidence**: HIGH
- **User confirmation needed**: No

### Q4. Feature ID 배정
- **Decision taken**: `feature-index.md`의 마지막 feature가 `F50`이므로 새 기능 ID를 `F51`로 사용한다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: 기존 F29/F30 검색 묶음에 하위 ID를 붙이는 대안은 프로젝트 전체 텍스트 검색이 별도 IPC/backend/remote/UI surface를 갖기 때문에 추적성이 낮아 보류했다.
- **Confidence**: HIGH
- **User confirmation needed**: No

### Q5. Remote workspace spec 반영 범위
- **Decision taken**: 핵심 IPC 계약은 `workspace-and-file-tree/contracts.md`에 두고, `remote-workspace/overview.md`와 `remote-workspace/contracts.md`에는 `workspace.searchText` remote parity와 allowlist/runtime method만 요약 반영한다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: remote contracts에 전체 request/response를 중복 기재하는 대안은 thin supporting spec 원칙에 맞지 않아 보류했다. remote 문서 변경을 생략하는 대안은 remote runtime method 추가가 보이지 않아 보류했다.
- **Confidence**: HIGH
- **User confirmation needed**: No
<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

이 계획은 SDD Workbench에 "프로젝트 전체 텍스트 검색" MVP를 추가하기 위한 실행 계획이다. 프로젝트 전체 텍스트 검색은 active workspace root 아래 파일 내용을 case-insensitive substring으로 scan하고, `{ file, line, snippet }` 결과를 sidebar Search 탭에 보여준 뒤, 결과 클릭 시 기존 Code Viewer line jump/highlight로 이동하는 기능이다.

기존 검색 surface와의 경계는 다음과 같다.

- `workspace:searchFiles`: File Browser 파일명 검색이다. `electron/workspace-search.ts`의 ordered token wildcard file-name match를 유지한다.
- Code Viewer 검색: 현재 열린 파일 안에서 CM6 `@codemirror/search`가 처리한다.
- Spec Viewer 검색: 현재 rendered spec 문서 안에서 `src/spec-viewer/spec-search.ts`가 처리한다.
- 새 Project Text Search: 워크스페이스 전체 파일 내용을 scan하는 `workspace:searchText` / `workspace.searchText` capability다.

이번 구현은 Part 1 Contract `C1-C6`과 Invariant `I1-I4`를 만족하는 최소 코드만 다룬다. Regex, replace, include/exclude glob, 파일 타입 필터, 별도 검색 인덱스, 외부 검색 엔진 의존성은 MVP 범위가 아니다.

## Scope

### In Scope

- Shared IPC/backend/renderer type surface에 `WorkspaceSearchText*` 타입 추가.
- Local main process text search handler 추가.
- Remote backend forwarding과 remote agent runtime method 추가.
- Search panel renderer component와 App sidebar tab 통합.
- Result click으로 active file 선택, 1-based line selection, Code Viewer temporary line highlight.
- Spec patch 계획: `F51`, `workspace:searchText`, search rules, remote parity, decision log.
- Guardrail tests와 renderer workflow tests.

### Out of Scope

- Regex, replace, include/exclude glob, 파일 타입 필터.
- 검색 결과 persistence.
- 검색 query 단축키.
- Code Viewer 내부 match range highlight.
- `workspace:searchFiles` 파일명 검색 semantics 변경.
- Spec Viewer 현재 문서 검색 semantics 변경.

## Components

| Component | Definition | Planned Change |
|-----------|------------|----------------|
| Workspace IPC Surface | Renderer와 Electron main process 사이의 typed invoke bridge. Canonical type source는 `electron/ipc-types.ts`다. | `workspace:searchText` channel, request/result type, preload/window method 추가. |
| WorkspaceBackendRouter | `rootPath`로 local/remote `WorkspaceBackend` 구현체를 선택하는 main-process routing layer. | `searchText` method를 method map과 invoker에 추가. |
| Local Text Search Scanner | Node filesystem을 main process에서 순회하며 text line을 찾는 scanner. | `electron/workspace-search.ts`에 파일명 검색과 별도 함수로 추가. |
| Remote Agent Runtime | remote host에서 실행되는 Node runtime. Main process가 `workspace.*` RPC로 요청한다. | `workspace.searchText` runtime method, router dispatch, generated payload 갱신. |
| WorkspaceProvider | Renderer에서 active workspace context와 actions를 제공하는 React provider. | `searchText(query)` action 추가. |
| Project Search Panel | Sidebar Search 탭의 React UI. 새 용어: Search panel은 File Tree 검색이 아니라 workspace 전체 content search 결과를 표시하는 panel이다. | Query 입력, grouped results, partial/error/loading/empty state, stale discard, result click callback 구현. |
| App Shell Navigation | App-level tab state와 Code Viewer jump request를 연결하는 layer. | Search result click 시 Code 탭 전환, file select, line selection, line highlight 연결. |
| Spec Docs | `_sdd/spec` supporting docs. 이 draft에서는 수정하지 않고, Part 1을 spec-update-todo 입력으로 사용한다. | `F51`과 contracts 반영 계획. |

## Contract/Invariant Delta Coverage

| Delta ID | Covered By | Notes |
|----------|------------|-------|
| C1 | Tasks T1, T2, T5 | `workspace:searchText` IPC와 `window.workspace.searchText`를 추가한다. |
| C2 | Tasks T1, T2, T3 | `WorkspaceBackend.searchText`가 local/remote 공통 result shape를 반환한다. |
| C3 | Task T3 | Remote allowlist, runtime router, generated payload를 갱신한다. |
| C4 | Task T2 | Scanner semantics는 case-insensitive substring이며 advanced search는 넣지 않는다. |
| C5 | Tasks T1, T2, T4 | Result shape와 partial flags를 typed contract와 UI에 반영한다. |
| C6 | Tasks T4, T5 | Sidebar Search 탭과 result click navigation을 구현한다. |
| I1 | Tasks T2, T3, T5 | Local root validation, remote root/path guard, active workspace root 사용을 유지한다. |
| I2 | Tasks T2, T3 | Traversal/time/result/file/binary guardrail을 scanner와 runtime에 적용한다. |
| I3 | Tasks T4, T5 | Search panel request token으로 stale response를 폐기한다. |
| I4 | Tasks T2, T4, T5, T6 | 기존 searchFiles/spec search tests를 유지하고, 새 surface를 별도 문서화한다. |

## Implementation Phases

### Phase 1: Contract Surface and Local Engine

- Q1-Q5 사전 확인 checkpoint는 2026-06-05 사용자 confirmation으로 완료됐다. 확정 범위는 cap 기본값, sidebar 배치, highlight 깊이, feature ID, remote spec 반영 범위이며, 새 option design은 추가하지 않는다.
- T1에서 shared type/API shape를 추가한다.
- T2에서 local scanner와 local/routed handler를 추가한다.

### Phase 2: Remote Parity

- T3에서 remote backend forwarding, allowlist, runtime dispatch를 추가하고 generated payload를 갱신한다.

### Phase 3: Renderer Search UX

- T4에서 Search panel component를 만든다.
- T5에서 App sidebar tab과 result click navigation을 연결한다.

### Phase 4: Spec Patch and Final Verification

- T6에서 Part 1을 기반으로 spec-update-todo가 수정할 spec target을 정리한다.
- 전체 검증은 `npm run build:remote-agent-runtime`, `npm test`, `npm run lint`, UI smoke 순서로 수행한다.

## Task Details

### Task T1: Add `workspace:searchText` shared contracts

**Component**: Workspace IPC Surface / Backend Types / Renderer Workspace Types  
**Priority**: P0  
**Type**: Feature

**Description**: `workspace:searchText`의 request/result 타입과 preload/window/backend/context action surface를 추가한다. Public request는 `rootPath`와 `query`만 받는다. Backend caps는 scanner 내부 기본값으로 적용한다.

**Acceptance Criteria**:

- [ ] `electron/ipc-types.ts`에 `WorkspaceSearchTextRequest`, `WorkspaceSearchTextMatch`, `WorkspaceSearchTextResult`가 추가된다.
- [ ] `IPC_CHANNELS.WORKSPACE_SEARCH_TEXT = 'workspace:searchText'`가 추가된다.
- [ ] `electron/preload.ts`에 `workspace.searchText(rootPath, query)` bridge가 추가된다.
- [ ] `electron/electron-env.d.ts`의 `Window.workspace`에 `searchText` 타입이 추가된다.
- [ ] `electron/workspace-backend/types.ts`의 `WorkspaceBackendMethodMap`과 `WorkspaceBackend` interface에 `searchText`가 추가된다.
- [ ] 기존 backend fixture tests는 `searchText` mock/assertion만 최소 추가해 확장된 interface를 만족한다.
- [ ] `src/workspace/workspace-context-types.ts`에 `searchText(query)` action이 추가된다.

**Target Files**:

- [M] `electron/ipc-types.ts` -- `workspace:searchText` request/result/channel/preload-shared 타입 추가.
- [M] `electron/preload.ts` -- `window.workspace.searchText` bridge 추가.
- [M] `electron/electron-env.d.ts` -- renderer global window API 타입 추가.
- [M] `electron/workspace-backend/types.ts` -- backend method map/interface 추가.
- [M] `electron/workspace-backend/local-workspace-backend.test.ts` -- existing backend handler fixture에 `searchText` mock/assertion 최소 추가.
- [M] `electron/workspace-backend/backend-router.test.ts` -- `WorkspaceBackend` fixture에 `searchText` mock/assertion 최소 추가.
- [M] `electron/workspace-backend/backend-integration.test.ts` -- local/remote backend fixtures에 `searchText` mock/assertion 최소 추가.
- [M] `src/workspace/workspace-context-types.ts` -- WorkspaceContext action type 추가.

**Technical Notes**: Covers C1, C2, C5. Public request shape는 Part 1 Q1 decision을 따른다. Result line numbers are 1-based to match main spec global guardrail.

**Dependencies**: Q1-Q5 pre-implementation confirmation completed on 2026-06-05.

### Task T2: Implement local text search scanner and routed IPC handler

**Component**: Local Text Search Scanner / Main IPC Routing  
**Priority**: P0  
**Type**: Feature

**Description**: `electron/workspace-search.ts`에 파일 내용 scanner를 추가하고 local handler/routed handler를 연결한다. 기존 `searchWorkspaceFilesByName` 함수와 `workspace:searchFiles` semantics는 수정하지 않는다.

**Acceptance Criteria**:

- [ ] `searchWorkspaceText(...)` 또는 동등한 함수가 case-insensitive substring으로 line 단위 match를 반환한다.
- [ ] Empty/whitespace query는 `{ ok: true, results: [] }` 경로로 이어질 수 있는 empty result를 반환한다.
- [ ] Match result는 `relativePath`, 1-based `lineNumber`, trimmed `snippet`을 포함한다.
- [ ] Scanner는 ignored dirs, symlink directory skip, depth limit, large directory skip, result cap, time budget, file size cap, binary skip을 적용한다.
- [ ] Local handler는 workspace root 존재/디렉토리 검증 후 scanner를 호출하고 `{ ok: false, results: [], ...flags }` safe error shape를 반환한다.
- [ ] Routed handler는 local/remote backend error를 같은 result shape로 감싼다.
- [ ] `electron/main.ts`의 `registerIpcHandlers` handler table에 `[IPC_CHANNELS.WORKSPACE_SEARCH_TEXT, handleWorkspaceSearchTextRouted]`를 등록한다.
- [ ] `workspace:searchFiles` tests는 의미 변경 없이 통과한다.

**Target Files**:

- [M] `electron/workspace-search.ts` -- text scanner, helper types, guardrail constants 추가.
- [M] `electron/workspace-ipc-handlers.ts` -- `handleWorkspaceSearchText` 추가.
- [M] `electron/workspace-ipc-routing.ts` -- local backend adapter, invoker, routed handler 추가.
- [M] `electron/main.ts` -- `registerIpcHandlers` handler table에 `workspace:searchText` routed handler 한 줄 등록.
- [M] `electron/workspace-search.test.ts` -- text search scanner unit tests 추가.
- [M] `electron/workspace-ipc-routing.test.ts` -- routed `searchText` local/remote error/result tests 추가.

**Technical Notes**: Covers C1, C2, C4, C5, I1, I2, I4; validated by V1, V2. Binary detection can reuse the existing NUL/control-byte heuristic style from `electron/workspace-utils.ts` / runtime `workspace-ops.ts`, but should stay in the scanner path so local and remote text search share behavior. IPC registration is a surgical handler-table addition only; no new IPC registration abstraction is part of this task.

**Dependencies**: T1.

### Task T3: Add remote `workspace.searchText` parity

**Component**: Remote Workspace Backend / Remote Agent Runtime  
**Priority**: P0  
**Type**: Feature

**Description**: Remote backend가 `searchText`를 `workspace.searchText` RPC로 forward하게 하고, security allowlist와 remote runtime router/ops를 추가한다. Runtime source 변경 후 generated payload를 갱신한다.

**Acceptance Criteria**:

- [ ] `electron/workspace-backend/remote-workspace-backend.ts`가 root mismatch를 거부하고 `workspace.searchText`로 query를 전달한다.
- [ ] `electron/remote-agent/security.ts` allowlist에 `workspace.searchText`가 포함된다.
- [ ] `electron/remote-agent/runtime/workspace-ops.ts`에 `workspaceSearchText`가 추가되고 local scanner와 같은 result shape를 반환한다.
- [ ] `electron/remote-agent/runtime/request-router.ts`가 `workspace.searchText`를 dispatch한다.
- [ ] `electron/remote-agent/runtime/runtime-types.ts`에 runtime search text result type이 추가된다.
- [ ] `npm run build:remote-agent-runtime` 실행으로 `electron/remote-agent/runtime/generated-payload.ts`가 갱신된다.
- [ ] Remote tests가 method allowlist, backend forwarding, runtime dispatch를 검증한다.

**Target Files**:

- [M] `electron/workspace-backend/remote-workspace-backend.ts` -- remote backend method map과 forwarder 추가.
- [M] `electron/remote-agent/security.ts` -- `workspace.searchText` allowlist 추가.
- [M] `electron/remote-agent/runtime/workspace-ops.ts` -- runtime text search method 추가.
- [M] `electron/remote-agent/runtime/request-router.ts` -- `workspace.searchText` dispatch 추가.
- [M] `electron/remote-agent/runtime/runtime-types.ts` -- runtime result type 추가.
- [M] `electron/remote-agent/runtime/generated-payload.ts` -- generated runtime payload 갱신.
- [M] `electron/workspace-backend/remote-workspace-backend.test.ts` -- forwarding/root guard test 추가.
- [M] `electron/remote-agent/security.test.ts` -- allowlist coverage 유지 또는 explicit assertion 추가.
- [M] `electron/remote-agent/runtime/workspace-ops.test.ts` -- remote runtime text search behavior/guardrail test 추가.
- [M] `electron/remote-agent/runtime/request-router.test.ts` -- `workspace.searchText` dispatch test 추가.

**Technical Notes**: Covers C2, C3, C5, I1, I2; validated by V3, V5. `scripts/build-remote-agent-runtime.mjs`는 실행 도구이며 이번 계획상 수정 대상이 아니다.

**Dependencies**: T1, T2. T2의 shared scanner behavior가 먼저 정리되어야 remote runtime이 같은 semantics를 사용할 수 있다.

### Task T4: Build Project Search panel component

**Component**: Project Search Panel  
**Priority**: P1  
**Type**: Feature

**Description**: Sidebar Search 탭에서 사용할 독립 React component를 만든다. Component는 query 입력, debounced search request, stale response discard, loading/error/empty/partial 표시, 파일별 grouped results, result click callback을 처리한다.

**Acceptance Criteria**:

- [ ] Query 입력은 whitespace-only일 때 검색하지 않고 빈 state를 표시한다.
- [ ] Query 변경 후 debounce를 적용해 `onSearchText(query)`를 호출한다.
- [ ] 이전 query나 workspace에 대한 stale response는 표시하지 않는다.
- [ ] Results는 `relativePath`별로 묶고 각 match의 `lineNumber`와 `snippet`을 표시한다.
- [ ] `truncated`, `timedOut`, `depthLimitHit`, skipped count 중 하나라도 있으면 결과가 불완전할 수 있음을 표시한다.
- [ ] Result click은 `onOpenSearchResult({ relativePath, lineNumber })`만 호출한다. Component 내부에서 file selection이나 tab switching을 직접 하지 않는다.
- [ ] Regex/replace/include/exclude UI가 없다.

**Target Files**:

- [C] `src/project-search/project-search-panel.tsx` -- Search panel component 생성.
- [C] `src/project-search/project-search-panel.test.tsx` -- component behavior tests 생성.
- [M] `src/App.css` -- Search panel layout/status/result styles 추가.

**Technical Notes**: Covers C5, C6, I3. Search panel은 App Shell navigation을 모르는 presentational/workflow component로 유지한다.

**Dependencies**: T1. T2/T3와 파일이 겹치지 않으므로 backend 구현과 병렬 가능하다.

### Task T5: Integrate sidebar Search tab and result navigation

**Component**: WorkspaceProvider / App Shell Navigation  
**Priority**: P1  
**Type**: Feature

**Description**: WorkspaceProvider에 active workspace 기반 `searchText(query)` action을 추가하고, App sidebar에 File/Search tab을 배치한다. Search result click은 기존 Code Viewer navigation primitives를 재사용한다.

**Acceptance Criteria**:

- [ ] `src/workspace/workspace-context.tsx`는 active workspace가 없거나 unavailable일 때 safe `{ ok: false, results: [], ...flags }`를 반환한다.
- [ ] Active workspace가 있으면 `window.workspace.searchText(rootPath, query)`를 호출한다.
- [ ] App sidebar는 File Tree와 Search panel을 전환할 수 있는 tab UI를 제공한다.
- [ ] File Tree 검색 입력과 Project Search 입력은 별도 state를 사용한다.
- [ ] Search result click은 Code 탭으로 전환하고, `selectFile(relativePath)`, `setSelectionRange({ startLine: lineNumber, endLine: lineNumber })`, `queueCodeViewerJumpRequest({ targetRelativePath, lineNumber, shouldHighlight: true })`를 호출한다.
- [ ] Active workspace가 바뀌면 Search panel이 stale 결과를 표시하지 않는다.

**Target Files**:

- [M] `src/workspace/workspace-context.tsx` -- `searchText(query)` action 구현.
- [M] `src/workspace/workspace-context-types.ts` -- T1 type surface에 맞춰 action export 확인.
- [M] `src/App.tsx` -- sidebar File/Search tabs, Search panel wiring, result click navigation 추가.
- [M] `src/App.css` -- sidebar tab styling과 App-level Search panel placement 보정.
- [M] `src/App.test.tsx` -- window mock, tab rendering, result click navigation, stale/workspace switch tests 추가.

**Technical Notes**: Covers C1, C6, I1, I3. `src/hooks/use-history-navigation.ts`는 이미 `queueCodeViewerJumpRequest`를 반환하므로 수정 없이 재사용하는 방향이 기본이다. 구현 중 App wiring이 과도해지면 handler만 작게 추출하되 새 hook은 만들지 않는다.

**Dependencies**: T1, T4. T2/T3가 끝나기 전에도 mock 기반 renderer tests는 작성 가능하지만, full integration은 backend API가 있어야 한다.

### Task T6: Apply spec patch via spec-update-todo

**Component**: Spec Docs  
**Priority**: P1  
**Type**: Documentation

**Description**: 이 draft Part 1을 `spec-update-todo` 입력으로 사용해 planned spec delta를 반영한다. 이 task는 구현자가 직접 `_sdd/spec`을 손으로 편집하라는 뜻이 아니라, SDD workflow의 spec-update-todo 단계에서 수정될 target을 명확히 하는 것이다.

**Acceptance Criteria**:

- [ ] `feature-index.md`에 `F51 프로젝트 전체 텍스트 검색` planned entry가 추가된다.
- [ ] `workspace-and-file-tree/contracts.md`에 `workspace:searchText` request/result/guardrail이 추가된다.
- [ ] `spec-viewer/contracts.md` Search Rules에 Project Text Search와 기존 File Browser/Spec Viewer 검색의 경계가 추가된다.
- [ ] `remote-workspace/overview.md`와 `remote-workspace/contracts.md`에 `workspace.searchText` remote parity와 runtime method 추가 사실이 반영된다.
- [ ] `decision-log.md`에 별도 capability, Search tab MVP, advanced search 제외, performance guardrail 결정을 기록한다.

**Target Files**:

- [M] `_sdd/spec/feature-index.md` -- `F51` planned feature entry 추가.
- [M] `_sdd/spec/workspace-and-file-tree/contracts.md` -- `workspace:searchText` IPC contract 추가.
- [M] `_sdd/spec/spec-viewer/contracts.md` -- Search Rules에 Project Text Search 경계 추가.
- [M] `_sdd/spec/remote-workspace/overview.md` -- remote workspace 사용자 가시 동작/핵심 규칙 요약 추가.
- [M] `_sdd/spec/remote-workspace/contracts.md` -- remote method 요약 추가.
- [M] `_sdd/spec/decision-log.md` -- F51 planned decision 기록 추가.

**Technical Notes**: Covers C1-C6, I1-I4 at documentation level. This feature-draft run did not modify `_sdd/spec/*`; these are future spec-update-todo targets.

**Dependencies**: Part 1 temporary spec draft. Code tasks do not depend on this task for compilation.

## Parallel Execution Summary

| Parallel Group | Tasks | Why Safe | Required Dependencies |
|----------------|-------|----------|-----------------------|
| G1 | T1 | Shared contracts define imports for later tasks. | Q1-Q5 confirmation completed |
| G2 | T2, T4 | T2 changes Electron/local scanner and IPC registration files; T4 creates renderer component and styles. Target files are disjoint, so they can run in parallel after T1. | T1 |
| G3 | T3, T5, T6 | T3 remote files, T5 renderer wiring, T6 spec docs are semantically separate after T1/T2/T4. T3 depends on T2 scanner semantics; T5 depends on T4 component; T6 depends on Part 1. | T3 after T2; T5 after T4; T6 after Part 1 |
| G4 | Final verification | Generated payload, tests, lint, UI smoke must run after code tasks. | T1-T5 |

Conflict notes:

- T2 and T3 both depend on the text search result shape from T1; do not let them assume different partial flag names.
- T4 and T5 both touch `src/App.css`; either assign distinct CSS blocks or make T5 own App-level placement styles after T4 component classes exist.
- T3 modifies remote runtime source and generated payload; run `npm run build:remote-agent-runtime` after T3, not before.
- T6 touches `_sdd/spec/*` only through the later spec-update-todo workflow; this draft generation step must not edit those files.

## Risks and Mitigations

### Q1. MVP cap 기본값 확정

- **Decision taken**: public IPC에는 cap tuning field를 노출하지 않고, backend 기본값으로 `maxDepth=20`, `maxResults=200`, `maxDirectoryChildren=10000`, `timeBudgetMs=2000`, `maxFileBytes=1MiB`를 적용한다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: `workspace:searchFiles`처럼 max fields를 request options로 노출하는 대안은 UI/계약 surface가 커져 MVP 범위를 늘리므로 보류했다. 파일 preview cap `10MiB`를 그대로 쓰는 대안은 content scan 비용이 커져 대형 repo 위험 완화에 약하므로 보류했다.
- **Confidence**: HIGH
- **User confirmation needed**: No

### Q2. Search 탭의 정확한 sidebar 배치

- **Decision taken**: 기존 sidebar workspace controls 아래에서 File Tree panel과 Project Search panel을 전환하는 segmented tab을 `src/App.tsx`에 추가한다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: File Tree 검색 입력 아래에 내용 검색 결과를 같이 표시하는 대안은 기능 경계가 흐려져 보류했다. Header command button/modal 검색은 결과를 계속 보며 탐색하는 흐름이 약해 보류했다.
- **Confidence**: HIGH
- **User confirmation needed**: No

### Q3. 결과 클릭 highlight의 깊이

- **Decision taken**: MVP는 Code Viewer 기존 line navigation highlight만 사용하고, CodeMirror 문서 안에서 query match range를 별도 선택/강조하지 않는다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: match column 계산과 range highlight를 함께 넣는 대안은 scanner result shape와 CM6 extension 변경이 늘어나 MVP 범위를 초과하므로 보류했다. Search result snippet 안의 match 강조는 UI polish이지만 필수 navigation 계약은 아니므로 후속으로 둔다.
- **Confidence**: HIGH
- **User confirmation needed**: No

### Q4. Feature ID 배정

- **Decision taken**: `feature-index.md`의 마지막 feature가 `F50`이므로 새 기능 ID를 `F51`로 사용한다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: 기존 F29/F30 검색 묶음에 하위 ID를 붙이는 대안은 프로젝트 전체 텍스트 검색이 별도 IPC/backend/remote/UI surface를 갖기 때문에 추적성이 낮아 보류했다.
- **Confidence**: HIGH
- **User confirmation needed**: No

### Q5. Remote workspace spec 반영 범위

- **Decision taken**: 핵심 IPC 계약은 `workspace-and-file-tree/contracts.md`에 두고, `remote-workspace/overview.md`와 `remote-workspace/contracts.md`에는 `workspace.searchText` remote parity와 allowlist/runtime method만 요약 반영한다. 2026-06-05 사용자 confirmation으로 확정했다.
- **Alternatives considered**: remote contracts에 전체 request/response를 중복 기재하는 대안은 thin supporting spec 원칙에 맞지 않아 보류했다. remote 문서 변경을 생략하는 대안은 remote runtime method 추가가 보이지 않아 보류했다.
- **Confidence**: HIGH
- **User confirmation needed**: No

## Open Questions

현재 구현을 막는 open question은 없다. Q1-Q5는 2026-06-05 사용자 confirmation으로 확정됐으며, 구현은 위 `Decision taken` 값을 기준으로 진행한다. 새 옵션 설계나 범위 확장은 추가하지 않는다.

## Self-Containment Check

- 검토 섹션 수: 9 (`Overview`, `Scope`, `Components`, `Contract/Invariant Delta Coverage`, `Implementation Phases`, `Task Details`, `Parallel Execution Summary`, `Risks and Mitigations`, `Open Questions`)
- Pass 1 발견 갭 및 보완:
  - 위치: `Overview`의 기존 검색 surface 설명. 보완: `workspace:searchFiles`, Code Viewer 검색, Spec Viewer 검색, 새 Project Text Search의 역할을 각각 정의해 외부 discussion 없이 경계를 알 수 있게 했다.
  - 위치: `Components`의 `WorkspaceBackendRouter`, Remote Agent Runtime 용어. 보완: 각 용어에 1줄 정의와 이 feature에서의 변경 연결을 추가했다.
  - 위치: `Task T6`의 `_sdd/spec/*` 참조. 보완: 이 draft run에서는 spec을 수정하지 않고, Part 1을 spec-update-todo 입력으로 쓰는 future target임을 명시했다.
  - 위치: `Task T5`의 `queueCodeViewerJumpRequest` 참조. 보완: 기존 hook이 이미 반환하는 navigation primitive이며 수정 없이 재사용하는 기본 방향이라고 inline 설명했다.
- Pass 2 발견 갭 및 보완:
  - 위치: `Scope`의 advanced search 제외. 보완: regex/replace/include-exclude가 왜 제외되는지 MVP 범위와 Minimum-Code Mandate 관점으로 명시했다.
  - 위치: `Implementation Phases`의 remote generated payload. 보완: runtime source 변경 후 `npm run build:remote-agent-runtime`을 실행해야 한다는 순서를 phase와 T3 acceptance criteria에 모두 기록했다.
  - 위치: `Parallel Execution Summary`의 병렬 가능성. 보완: T2/T4는 target files가 disjoint하다고 정정하고, T2/T3 result shape dependency, T3 generated payload dependency, T4/T5 CSS 충돌 가능성을 분리해 명시했다.
  - 위치: `Open Questions`의 구현 readiness 문장. 보완: Q1-Q5 사용자 confirmation 이후 구현을 막는 open question이 없다고 정리했다.
  - 위치: `Risks and Mitigations`의 cap 값. 보완: 선택한 숫자와 대안/기각 사유를 Q1 schema에 넣어 독자가 임의값이 아니라 best-effort decision임을 알 수 있게 했다.
- 보완 완료: Yes
