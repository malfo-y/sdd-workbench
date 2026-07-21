# Feature Draft: 리모트 활성 파일 Watch Fast Lane

<!-- spec-update-todo-input-start -->
# Part 1: Spec Delta
## Change Summary

리모트 워크스페이스에서 외부 도구가 현재 보고 있는 파일을 수정했을 때 Code/Spec 뷰어 반영이 느린 문제를, 전체 워크스페이스 polling 주기 단축이 아니라 활성 파일 전용 fast lane으로 해결한다. 현재 remote agent runtime watcher는 전체 워크스페이스 polling을 `1500ms`로 수행하고, renderer는 기존 `workspace:watchEvent`가 활성 파일 또는 활성 spec 경로를 포함하면 clean 문서는 refresh하고 dirty 문서는 충돌 배너로 막는다.

이번 delta는 renderer가 현재 활성 파일/spec 경로를 watcher focus로 main/backend에 전달하고, remote agent runtime이 그 focused path만 약 `0.3~0.5초` 주기로 가볍게 stat 검사하도록 watch 계약을 확장한다. fast lane 이벤트는 기존 `workspace.watchEvent` / `workspace:watchEvent` 흐름으로 흘려보내며, dirty 충돌 정책과 전체 트리/깃/구조 갱신 완충 정책은 유지한다.

## Scope Delta

In Scope:

- 새 feature ID 제안: `F52` 리모트 활성 파일 watch fast lane.
- renderer가 active workspace의 `activeFile`과, 서로 다를 경우 `activeSpec`을 watcher focused paths로 전달하는 최소 IPC/backend 계약 추가.
- renderer가 active workspace 전환, remote 연결 해제/비remote 전환, watcher stop 시 이전 remote workspace focus를 같은 `watchSetFocusedPaths(..., [])` 호출로 정리.
- remote backend가 focused paths를 remote agent runtime method로 전달.
- remote agent runtime watcher가 focused files만 별도 짧은 주기로 검사하고, 변경 시 기존 watch event payload shape(`changedRelativePaths`, `hasStructureChanges`)를 재사용.
- fast lane 목표 지연: focused file content metadata 변경이 약 `0.3~0.5초` 안에 watch event로 도착해야 한다.
- 기존 dirty 문서 충돌 정책 유지: dirty active document는 자동 refresh하지 않고 기존 "File changed on disk. Reload?" 배너 경로를 사용.
- remote runtime 변경 후 `npm run build:remote-agent-runtime`, `npm test`, `npm run lint` 검증.

Out of Scope:

- 전체 remote workspace polling 주기 단축.
- 비활성 파일, tree hydration, git file statuses, directory structure 변경의 즉시 반영.
- renderer periodic refresh 또는 renderer 직접 remote filesystem polling.
- local watcher semantics 변경.
- dirty draft 자동 병합, 자동 reload, conflict UI 재설계.
- 원격 LSP, 포트포워딩, SSHFS 경로 복원.

Guardrail Delta:

- local/remote 차이는 `workspace:*` IPC/backend surface 뒤에 둔다.
- focused path는 workspace-relative path만 허용하고 workspace root escape를 허용하지 않는다.
- active remote workspace가 아니거나 watcher가 멈춘 workspace의 focused path set은 비어 있어야 한다.
- fast lane은 기존 watch event contract를 재사용하며 renderer refresh 책임을 새 경로로 분산하지 않는다.
- fast lane은 `hasStructureChanges=false` content-change event만 즉시 보낸다. 구조 변경은 기존 전체 polling watcher가 담당한다.

## Persistent Spec Implications

- Remote Agent Protocol 기반 원격 watcher는 전체 polling watcher(`1500ms`)와 별도로 focused active file/spec fast lane을 가질 수 있다.
- focused path update는 renderer의 active document state에서 파생되며, local/remote 공통 `workspace:*` boundary를 통과한다.
- focused path update는 빈 목록을 통한 focus cleanup을 포함하며, cleanup도 별도 manager가 아니라 같은 `workspace:*` boundary를 통과한다.
- fast lane의 목표는 clean active file/spec의 체감 반영 지연을 약 `0.3~0.5초`로 줄이는 것이다.
- inactive files, tree hydration, git status, directory structure refresh는 기존 damped watch policy를 유지한다.
- dirty document conflict invariant는 유지된다. 외부 변경 이벤트가 dirty active document에 도착해도 draft를 덮어쓰지 않는다.
<!-- spec-update-todo-input-end -->

# Part 2: Implementation and Validation Plan
## Overview

이 계획은 리모트 워크스페이스에서 사용자가 현재 보고 있는 파일 또는 spec 문서가 외부 도구에서 수정될 때, 기존 remote 전체 polling(`electron/remote-agent/runtime/watch-ops.ts`의 `DEFAULT_POLL_INTERVAL_MS = 1500`)보다 빠르게 renderer refresh 경로에 도달하게 하는 최소 변경이다.

이 문서에서 "focused path"는 active workspace의 `WorkspaceSession.activeFile`과, 값이 있고 `activeFile`과 다른 `WorkspaceSession.activeSpec`을 de-dup한 workspace-relative path 목록을 뜻한다. "fast lane"은 remote agent runtime이 focused path 목록에 대해서만 짧은 주기로 파일 metadata를 비교하고, 변경이 있으면 기존 `workspace.watchEvent` payload로 알리는 watch 보조 루프를 뜻한다.

핵심 결정은 다음과 같다.

- 전체 remote workspace polling interval은 줄이지 않는다. `_sdd/discussion/2026-07-04_discussion_remote_file_watch_refresh.md`의 결정 1을 반영해 refresh storm과 큰 repo scan 비용을 피한다.
- fast lane 대상은 visible active file/spec로 제한한다. 비활성 파일, tree hydration, git status, 구조 변경은 기존 damped policy에 남긴다.
- 구현 위치는 renderer periodic refresh가 아니라 remote agent layer다. renderer는 focused path를 알려주고, refresh/dirty conflict 처리는 기존 `src/workspace/use-workspace-watcher.ts` watch event 경로를 재사용한다.
- dirty document는 자동 refresh하지 않는다. `DocumentSaveState`와 dirty compatibility는 `src/workspace/workspace-model.ts`가 소유하고, `src/workspace/use-workspace-watcher.ts`의 conflict banner 경로를 유지한다.

## Scope

In Scope:

- focused paths update IPC/backend method 추가.
- local backend no-op과 remote backend forwarding 추가.
- renderer active file/spec 변경 시 focused paths update 호출.
- active workspace 전환, remote 연결 해제/비remote 전환, watcher stop 시 이전 remote workspace focused paths cleanup.
- remote agent runtime fast lane stat loop 추가.
- fast lane event를 기존 remote watch bridge와 renderer watcher 경로로 전달.
- unit/integration tests와 generated runtime payload 갱신.
- spec-sync가 사용할 spec patch notes 정리.

Out of Scope:

- 전체 polling interval 조정.
- renderer에서 `readFile`을 주기적으로 호출하는 refresh loop.
- inactive file fast lane.
- directory create/delete/rename 즉시 구조 event.
- git status refresh 주기 변경.
- local native/polling watcher 구조 변경.
- dirty conflict UI 문구/레이아웃 변경.

## Contract/Invariant Delta and Coverage

| ID | Type | Change | Covered By | Validated By |
|----|------|--------|------------|--------------|
| C1 | Add | `workspace:*` boundary에 focused paths update contract를 추가한다. Request는 `workspaceId`, `rootPath`, workspace-relative `focusedRelativePaths`만 포함한다. | T1 | V1, V2 |
| C2 | Add | local backend는 focused paths update를 성공 no-op으로 처리하고, remote backend는 remote agent runtime method로 전달한다. | T1, T3 | V2, V5 |
| C3 | Add | remote agent runtime watcher는 focused paths만 `300~500ms` 범위의 고정 상수 주기로 metadata 비교하고 content change를 `workspace.watchEvent`로 emit한다. | T3 | V6, V7 |
| C4 | Modify | existing remote watch event bridge와 renderer watcher refresh 경로를 재사용한다. renderer periodic refresh를 추가하지 않는다. | T2, T4 | V3, V4, V10 |
| C5 | Modify | dirty active document는 fast lane event를 받아도 자동 refresh하지 않고 기존 conflict banner 정책을 유지한다. | T4 | V11 |
| C6 | Add | active workspace가 다른 workspace로 바뀌거나, remote workspace가 disconnected/non-remote가 되거나, watcher가 stop될 때 이전 remote workspace의 focused paths는 같은 `watchSetFocusedPaths(..., [])` method로 비워진다. | T2 | V14 |
| I1 | Add | focused path는 workspace-relative path만 허용하며 root escape, absolute path, 빈 path는 runtime 경계에서 거부하거나 무시한다. | T1, T3 | V1, V6 |
| I2 | Add | fast lane은 focused files만 검사하며 inactive files, tree hydration, git statuses, structural refresh 빈도를 높이지 않는다. stale focus cleanup 후 inactive previous workspace는 fast lane 대상에 남지 않는다. | T2, T3 | V3, V8, V14 |
| I3 | Add | remote runtime source 변경 후 `generated-payload.ts`는 빌드 산출물과 동기화되어야 한다. | T3 | V9 |
| I4 | Modify | persistent spec은 remote watcher fast lane, focus cleanup, dirty conflict invariant를 기록하되, main global spec에는 feature-level 상세를 넣지 않는다. | T5 | V12 |

## Touchpoints

| Touchpoint | Current Role | Planned Change |
|------------|--------------|----------------|
| `electron/ipc-types.ts` | Electron main/preload shared IPC type source. | `workspace:watchSetFocusedPaths` request/result/channel 타입을 추가해 C1의 typed boundary를 고정한다. |
| `electron/preload.ts` and `electron/electron-env.d.ts` | renderer `window.workspace` bridge와 global type declaration. | renderer가 focused paths update를 호출할 수 있는 window API를 추가한다. |
| `electron/workspace-backend/types.ts` | local/remote backend method map과 interface. | `watchSetFocusedPaths` backend method를 추가해 local no-op과 remote forwarding을 같은 surface로 둔다. |
| `electron/workspace-ipc-routing.ts` and `electron/main.ts` | routed IPC handler registration. | focused paths update handler를 추가하고, local backend는 no-op result를 반환하게 한다. |
| `src/workspace/use-workspace-watcher.ts` | watch event 수신 후 active file/spec refresh와 dirty conflict banner를 처리하는 renderer hook. | active remote workspace의 focused paths를 watch backend에 알려주고, active workspace가 바뀌거나 eligible remote 상태가 아니게 되면 이전 remote workspace에 `watchSetFocusedPaths(..., [])`를 보내는 effect를 추가하되, periodic refresh는 추가하지 않는다. |
| `src/workspace/use-workspace-remote.ts` | remote workspace connect/disconnect와 watcher start/stop lifecycle을 소유하는 hook. | watcher stop/restart/close 경로에서 같은 `watchSetFocusedPaths(..., [])` cleanup을 호출해 stopped watcher의 focused paths가 runtime에 남지 않게 한다. |
| `electron/workspace-backend/remote-watch-bridge.ts` | remote agent watch event/fallback을 renderer-facing watch event로 forward한다. | focused paths update method를 remote agent RPC로 전달한다. |
| `electron/workspace-backend/remote-workspace-backend.ts` | remote workspace backend implementation. | root validation 뒤 `RemoteWatchBridge` focused paths update를 호출한다. |
| `electron/remote-agent/security.ts` | remote RPC method allowlist. | 새 runtime method를 allowlist에 추가한다. |
| `electron/remote-agent/runtime/request-router.ts` and `runtime-types.ts` | remote runtime request dispatch와 event/result types. | focused paths update method를 `RuntimeWatchService`에 연결하고 payload/result type을 문서화한다. |
| `electron/remote-agent/runtime/watch-ops.ts` | remote polling watcher. | focused paths metadata cache와 fast lane timer를 추가한다. 기존 full snapshot polling interval은 유지한다. |
| `electron/remote-agent/runtime/generated-payload.ts` | remote runtime bundled payload. | `npm run build:remote-agent-runtime`로 runtime 변경을 반영한다. |
| Tests | watch/backend/router/renderer regression surface. | focused paths routing, stale focus cleanup, runtime fast lane latency, inactive-file non-fast behavior, dirty conflict regression을 검증한다. |
| `_sdd/spec/*` supporting docs | persistent product/contracts docs. | Part 1 delta를 feature-index, remote/workspace/code-editor contracts, decision log에 반영한다. |

## Implementation Phases

### Phase 1: Focused Path Contract

- T1에서 shared IPC/backend contract와 routed handler를 먼저 추가한다.
- Exit criteria: renderer에서 호출 가능한 typed API가 있고, local no-op과 remote backend method가 compile-time surface에 존재한다.

### Phase 2: Renderer Focus Publisher

- T2에서 active remote workspace의 `activeFile`/`activeSpec` 변경을 focused paths update로 발행한다.
- Exit criteria: local workspace에서는 no-op 호출을 만들지 않고, remote connected/degraded workspace에서 de-duped focused paths가 전달되며, 이전 remote workspace나 stopped watcher에는 빈 focused paths가 전달된다.

### Phase 3: Remote Runtime Fast Lane

- T3에서 remote bridge, runtime router, watch service fast lane, generated payload를 구현한다.
- Exit criteria: fast lane interval 상수가 `300~500ms` 범위로 고정되고, focused file change가 full polling interval 전에 watch event로 emit되며, non-focused file은 fast lane으로 emit되지 않는다.

### Phase 4: Refresh/Conflict Regression

- T4에서 기존 renderer watch event semantics가 fast lane event에도 그대로 적용되는지 확인한다.
- Exit criteria: clean active file/spec refresh와 dirty conflict banner가 기존 정책대로 동작한다.

### Phase 5: Spec Sync Patch Notes

- T5에서 Part 1을 기준으로 persistent spec target을 갱신할 수 있게 한다.
- Exit criteria: feature-index와 supporting contracts에 반영할 문장 범위가 명확하다.

## Task Details

### Task T1: focused paths update IPC/backend contract 추가

**Priority**: P0  
**Type**: Feature

**Description**: renderer가 현재 focused path 목록을 watcher backend에 전달할 수 있도록 `workspace:watchSetFocusedPaths` typed contract를 추가한다. local backend는 no-op 성공을 반환하고, remote backend가 같은 interface를 구현할 수 있게 method map을 확장한다.

**Acceptance Criteria**:
- [ ] (V1) `WorkspaceWatchSetFocusedPathsRequest`와 result type, `IPC_CHANNELS.WORKSPACE_WATCH_SET_FOCUSED_PATHS`, preload/window API 타입이 존재한다.
- [ ] (V2) routed handler가 local workspace에서는 `{ ok: true }` no-op을 반환하고 remote workspace에서는 backend method를 호출한다.

**Target Files**:
- [M] `electron/ipc-types.ts` -- focused paths update request/result/channel 타입 추가.
- [M] `electron/preload.ts` -- `window.workspace.watchSetFocusedPaths(...)` bridge 추가.
- [M] `electron/electron-env.d.ts` -- renderer global window API 타입 추가.
- [M] `electron/workspace-backend/types.ts` -- backend method map/interface 추가.
- [M] `electron/workspace-ipc-routing.ts` -- local no-op과 routed handler 추가.
- [M] `electron/main.ts` -- IPC handler table 등록.
- [M] `electron/workspace-ipc-routing.test.ts` -- local/remote routing 검증.
- [M] `electron/workspace-backend/local-workspace-backend.test.ts` -- extended backend handler fixture 검증.
- [M] `electron/workspace-backend/backend-router.test.ts` -- interface fixture 보완.

**Technical Notes**: Covers C1, C2, I1; validated by V1, V2. 새 설정값이나 사용자 옵션은 추가하지 않는다.
**Dependencies**: 없음.

### Task T2: renderer active file/spec focus publisher 추가

**Priority**: P0  
**Type**: Feature

**Description**: active workspace가 remote이고 연결 상태가 `connected` 또는 `degraded`일 때, `activeFile`과 `activeSpec`을 de-dup한 focused paths 목록을 watcher backend에 전달한다. active workspace가 바뀌거나 eligible remote 상태에서 벗어나거나 watcher가 stop되는 경우, 이전 remote workspace에는 같은 `watchSetFocusedPaths(..., [])` 호출로 focus를 비운다. 이 task는 focus 전달과 cleanup만 담당하며 renderer-side periodic refresh를 만들지 않는다.

**Acceptance Criteria**:
- [ ] (V3) remote workspace에서 `activeFile` 또는 `activeSpec`이 바뀌면 de-dup된 focused paths가 `watchSetFocusedPaths`로 전달된다.
- [ ] (V4) renderer code에 interval/timer 기반 `readFile` 또는 `loadWorkspaceFile(..., 'refresh')` loop가 추가되지 않는다.
- [ ] (V14) activeWorkspaceId가 다른 workspace로 바뀌거나, workspace가 disconnected/non-remote가 되거나, watcher가 stop될 때 이전 remote workspace에 `watchSetFocusedPaths(..., [])`가 호출된다.

**Target Files**:
- [M] `src/workspace/use-workspace-watcher.ts` -- active remote workspace focused paths 발행 effect 추가.
- [M] `src/workspace/use-workspace-remote.ts` -- watcher stop/restart/close 경로의 focused paths cleanup 추가.
- [M] `src/App.test.tsx` -- remote active file/spec focused paths 발행과 stale focus cleanup 검증.

**Technical Notes**: Covers C4, C6, I2; validated by V3, V4, V14. focused path vocabulary는 이 문서 Overview의 정의를 따른다. cleanup은 새 focus manager나 debounce 설정 없이 `watchSetFocusedPaths`의 빈 배열 호출로만 처리한다.
**Dependencies**: T1.

### Task T3: remote agent focused fast lane 구현

**Priority**: P0  
**Type**: Feature

**Description**: remote backend에서 focused paths update를 remote agent runtime으로 전달하고, runtime watcher가 focused files만 짧은 주기로 stat metadata 비교하도록 한다. 변경 이벤트는 기존 `workspace.watchEvent` payload를 사용하고 `hasStructureChanges=false`로 보낸다.

**Acceptance Criteria**:
- [ ] (V5) `RemoteWatchBridge`와 `RemoteWorkspaceBackend`가 focused paths update를 remote RPC로 전달한다.
- [ ] (V6) remote runtime method가 빈 path, absolute path, root escape path를 허용하지 않으며 정상 workspace-relative path만 focus set에 반영한다.
- [ ] (V7) fast lane interval 상수는 `300~500ms` 범위로 고정되어 별도 assertion으로 검증되고, focused file content metadata 변경은 timer slack을 포함한 검증 창 안에서 full polling interval(`1500ms`) 전에 watch event로 emit된다.
- [ ] (V8) non-focused file 변경은 fast lane 검증 창 안에서 watch event로 emit되지 않는다.
- [ ] (V9) `npm run build:remote-agent-runtime` 후 generated payload가 새 runtime method와 fast lane 코드를 포함한다.

**Target Files**:
- [M] `electron/workspace-backend/remote-watch-bridge.ts` -- remote agent focused paths RPC forwarding 추가.
- [M] `electron/workspace-backend/remote-watch-bridge.test.ts` -- forwarding 검증.
- [M] `electron/workspace-backend/remote-workspace-backend.ts` -- root validation 후 bridge 호출 추가.
- [M] `electron/workspace-backend/remote-workspace-backend.test.ts` -- remote backend focused paths routing 검증.
- [M] `electron/remote-agent/security.ts` -- allowlist에 focused paths runtime method 추가.
- [M] `electron/remote-agent/security.test.ts` -- allowlist 회귀 검증.
- [M] `electron/remote-agent/runtime/runtime-types.ts` -- focused paths result/payload type 추가.
- [M] `electron/remote-agent/runtime/request-router.ts` -- runtime method dispatch 추가.
- [M] `electron/remote-agent/runtime/request-router.test.ts` -- dispatch와 path validation 검증.
- [M] `electron/remote-agent/runtime/watch-ops.ts` -- focused metadata cache와 `300~500ms` 범위의 고정 fast lane interval 상수/timer 추가.
- [M] `electron/remote-agent/runtime/watch-ops.test.ts` -- fast lane interval 상수, focused latency, non-focused non-fast behavior 검증.
- [M] `electron/remote-agent/runtime/generated-payload.ts` -- remote runtime bundle 갱신.

**Technical Notes**: Covers C2, C3, I1, I2, I3; validated by V5, V6, V7, V8, V9. fast lane interval은 public preference/config 없이 고정 상수로 두고, 테스트는 상수의 `300~500ms` 범위 assertion과 이벤트 대기 margin을 분리한다.
**Dependencies**: T1.

### Task T4: existing refresh and dirty conflict policy regression 고정

**Priority**: P0  
**Type**: Test

**Description**: fast lane event도 기존 watch event와 같은 renderer path를 타므로, clean active file/spec refresh와 dirty conflict banner 정책이 유지되는지 focused regression을 추가한다.

**Acceptance Criteria**:
- [ ] (V10) watch event가 active clean file/spec path를 포함하면 기존 `loadWorkspaceFile(..., 'refresh')` 또는 `loadWorkspaceSpec(..., 'refresh')` 경로가 실행된다.
- [ ] (V11) watch event가 dirty active document path를 포함해도 draft content가 자동으로 disk content로 대체되지 않고 conflict banner state가 유지된다.

**Target Files**:
- [M] `src/App.test.tsx` -- active clean refresh와 dirty conflict regression 검증.
- [M] `src/workspace/use-workspace-watcher.ts` -- 필요한 경우 테스트 가능성만 최소 보완.

**Technical Notes**: Covers C4, C5; validated by V10, V11. 구현 로직 변경이 필요 없으면 테스트만 추가한다.
**Dependencies**: T2.

### Task T5: persistent spec sync notes 반영

**Priority**: P1  
**Type**: Infrastructure

**Description**: 구현 후 Part 1 delta를 persistent spec에 반영한다. `main.md`에는 feature-level 상세를 넣지 않고, remote watcher와 workspace IPC 계약은 supporting docs에 둔다.

**Acceptance Criteria**:
- [ ] (V12) feature-index, remote-workspace overview/contracts, workspace-and-file-tree contracts, code-editor contracts, decision-log가 C1-C6/I1-I4의 persistent contract를 중복 없이 반영한다.
- [ ] (V13) `npm run build:remote-agent-runtime`, `npm test`, `npm run lint` 결과가 implementation report에 증거로 남는다.

**Target Files**:
- [M] `_sdd/spec/feature-index.md` -- `F52` planned/done entry 추가 또는 구현 상태 반영.
- [M] `_sdd/spec/remote-workspace/overview.md` -- remote watcher fast lane 정책 요약.
- [M] `_sdd/spec/remote-workspace/contracts.md` -- remote agent focused paths method와 watch contract 반영.
- [M] `_sdd/spec/workspace-and-file-tree/contracts.md` -- renderer-facing focused paths IPC와 watch event reuse 계약 반영.
- [M] `_sdd/spec/code-editor/contracts.md` -- dirty conflict invariant 유지 반영.
- [M] `_sdd/spec/decision-log.md` -- whole polling 단축/renderer periodic refresh 기각과 active-file fast lane 결정 기록.
- [M] `_sdd/spec/code-map.md` -- watcher/remote runtime touchpoint 갱신.

**Technical Notes**: Covers I4; validated by V12, V13. 이 feature-draft 생성 단계에서는 `_sdd/spec/` 파일을 수정하지 않는다.
**Dependencies**: T1, T2, T3, T4.

## Validation Plan

| ID | Targets | Verification Method | Evidence / Notes |
|----|---------|---------------------|------------------|
| V1 | C1, I1; T1 AC1 | 1등급: typecheck/build pass-fail + code review checklist | `electron/ipc-types.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`, `electron/workspace-backend/types.ts`에 request/result/channel/API가 존재하고 `npm test`의 TS compile 단계가 통과한 출력. |
| V2 | C2; T1 AC2 | 1등급: routing unit test pass-fail | `electron/workspace-ipc-routing.test.ts`에서 local no-op `{ ok: true }`와 remote backend invocation assertion 출력. |
| V3 | C4, I2; T2 AC1 | 1등급: renderer test pass-fail | `src/App.test.tsx`에서 remote active file/spec 변경 후 `watchSetFocusedPaths` 호출 인자 assertion 출력. |
| V4 | C4; T2 AC2 | 2등급: reviewer rubric 판정 | reviewer가 `src/workspace/use-workspace-watcher.ts`와 관련 renderer diff에서 interval/timer 기반 refresh loop 또는 periodic `readFile` 호출을 지목하지 못하면 충족. 증거는 diff hunk와 reviewer 판정. |
| V5 | C2; T3 AC1 | 1등급: backend/bridge tests pass-fail | `remote-watch-bridge.test.ts`와 `remote-workspace-backend.test.ts`에서 remote RPC method와 params forwarding assertion 출력. |
| V6 | I1; T3 AC2 | 1등급: runtime router/watch tests pass-fail | `request-router.test.ts` 또는 `watch-ops.test.ts`에서 invalid focused paths가 focus set에 반영되지 않거나 error result로 닫히는 assertion 출력. |
| V7 | C3; T3 AC3 | 1등급: constant assertion + latency-bounded runtime test pass-fail | `watch-ops.test.ts`에서 fast lane interval 상수가 `300~500ms` 범위임을 이벤트 대기 margin과 별도로 assertion하고, focused file 변경 후 full poll `1500ms` 전에 watch event가 emit됨을 assertion한 출력. `650~700ms` 상수 구현은 이 검증에서 실패해야 한다. |
| V8 | I2; T3 AC4 | 1등급: negative runtime test pass-fail | `watch-ops.test.ts`에서 non-focused file 변경 후 fast lane 검증 창 안에 watch event가 없음을 assertion한 출력. |
| V9 | I3; T3 AC5 | 1등급: build command + content assertion | `npm run build:remote-agent-runtime` 성공 출력과 `generated-payload.ts`에 새 runtime method 문자열이 포함된 grep/test assertion. |
| V10 | C4; T4 AC1 | 1등급: renderer regression test pass-fail | `src/App.test.tsx`에서 active clean file/spec watch event 후 refresh call 또는 displayed content update assertion 출력. |
| V11 | C5; T4 AC2 | 1등급: renderer regression test pass-fail | `src/App.test.tsx`에서 dirty active document watch event 후 draft content 보존과 conflict banner state assertion 출력. |
| V12 | I4; T5 AC1 | 2등급: spec review rubric 판정 | reviewer가 listed spec files에서 C1-C6/I1-I4가 supporting docs에 있고 `main.md`에 feature-level detail이 없음을 확인한 판정과 인용 경로. |
| V13 | T5 AC2 | 1등급: command pass-fail | `npm run build:remote-agent-runtime`, `npm test`, `npm run lint` 성공 출력. |
| V14 | C6, I2; T2 AC3 | 1등급: renderer lifecycle test pass-fail | `src/App.test.tsx`에서 activeWorkspaceId 전환, remote disconnected/non-remote 전환, watcher stop 경로가 이전 remote workspace에 `watchSetFocusedPaths(..., [])`를 호출하는 assertion 출력. |

## Parallel Execution Summary

| Group | Tasks | Parallelism Decision | Reason |
|-------|-------|----------------------|--------|
| G1 | T1 | Sequential first | T2/T3가 T1의 IPC/backend type surface를 import한다. |
| G2 | T2, T3 | Parallel after T1 | T2는 renderer focus publisher, T3는 remote backend/runtime이다. Target Files are mostly disjoint. |
| G3 | T4 | Sequential after T2 | T4 shares `src/App.test.tsx` and renderer watcher semantics with T2. |
| G4 | T5 | Sequential final | spec sync notes depend on actual implementation and validation results. |

# Risks/Mitigations and Open Questions
## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| R1. focused paths update가 active file 전환마다 너무 자주 remote RPC를 보내거나 stale focus를 남길 수 있다. | 빠른 파일 이동 중 remote agent 요청이 불필요하게 늘거나 이전 remote workspace가 fast lane 대상에 남을 수 있다. | renderer에서 de-duped path key가 이전 값과 같으면 호출하지 않는다. active workspace 전환, disconnected/non-remote 전환, watcher stop 시 같은 method의 빈 배열 호출로 이전 focus를 지운다. 별도 debounce 설정은 추가하지 않는다. |
| R2. fast lane과 full polling이 같은 path 변경을 중복 emit할 수 있다. | active file refresh가 두 번 발생할 수 있다. | runtime focused metadata를 fast lane emit 후 갱신하고, full polling은 기존 damped interval에 맡긴다. 중복이 남아도 dirty guard와 read request stale 처리로 데이터 손실은 막는다. |
| R3. active file 삭제/rename까지 fast lane으로 즉시 처리하려 하면 구조 refresh 범위가 커질 수 있다. | scope가 tree hydration/structure refresh로 확장되어 과거 refresh storm 리스크가 되살아날 수 있다. | fast lane은 existing focused file content metadata 변경만 즉시 대상으로 두고, delete/rename 구조 변화는 기존 full polling 경로에 남긴다. |
| R4. generated payload 갱신 누락 시 개발 환경 테스트는 통과해도 배포 remote runtime이 옛 코드를 실행할 수 있다. | remote fast lane이 실제 연결에서 동작하지 않는다. | T3와 V9에 `npm run build:remote-agent-runtime`과 payload content assertion을 필수로 둔다. |

## Open Questions

### Q1. Focused path update method naming
- **Decision taken**: renderer-facing IPC는 `workspace:watchSetFocusedPaths`, remote runtime RPC는 `workspace.watchSetFocusedPaths`로 계획했다.
- **Alternatives considered**: `workspace:updateWatchFocus`는 의미가 짧지만 payload가 path 목록임을 덜 드러낸다. `workspace.watchFocus`는 동사성이 약해 handler 이름과 맞지 않는다.
- **Confidence**: MEDIUM
- **User confirmation needed**: No

### Q2. Active spec 포함 범위
- **Decision taken**: `activeFile`과, 값이 있고 서로 다르면 `activeSpec`도 focused path에 포함한다.
- **Alternatives considered**: `activeFile`만 포함하면 rendered spec 단독 확인 중 외부 수정 반영이 느릴 수 있다. 현재 visible tab만 포함하는 대안은 App tab/layout 상태 의존이 커져 최소 변경 범위를 넘는다.
- **Confidence**: MEDIUM
- **User confirmation needed**: No

### Q3. Fast lane deletion handling
- **Decision taken**: fast lane은 focused existing file의 metadata 변경을 즉시 반영하고, delete/rename 구조 변화는 기존 full polling watcher에 맡긴다.
- **Alternatives considered**: focused file disappearance를 즉시 `hasStructureChanges=true`로 emit하는 대안은 tree hydration과 구조 refresh 빈도를 높여 이번 guardrail과 충돌한다.
- **Confidence**: MEDIUM
- **User confirmation needed**: No
