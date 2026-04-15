# Feature Draft: Post-split Remaining Issues Master Remediation

<!-- spec-update-todo-input-start -->
# Part 1: Temporary Spec Draft

## Change Summary

`_sdd/spec/appendix/backlog-and-risks.md`, `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`, 현재 구현 상태를 기준으로 모놀리스 분할 이후 남아 있는 안정화 작업과 아직 닫히지 않은 사용자 가시 backlog를 하나의 순차 실행형 master remediation draft로 묶는다.

이번 delta의 목적은 "남은 이슈 전체를 무엇부터 어떤 write set으로 수정할지"를 고정하는 것이다. 이미 완료된 SSH / remote-agent 공통 유틸 통합(`D4`, `S1` 계열), routed handler factory(`D1`), `transport-ssh` stdin pending fix(`A7`)는 재계획 범위에서 제외하고, 현재 코드 기준으로 남아 있는 축만 phase 단위로 재배열한다.

핵심 방향은 다음과 같다.

1. 먼저 `workspace` 비동기/레이스와 파일 트리/클립보드 안전성 같은 정합성 문제를 닫는다.
2. 그 다음 Electron backend hardening, viewer resource lifecycle, shared utility/type drift를 정리한다.
3. 마지막으로 active heading, heading hash jump, export reset, rendered spec scroll restore, marker detail UI, swipe history 같은 사용자 가시 backlog를 additive feature로 닫는다.

## Scope Delta

### In Scope

- post-split stabilization 잔여축:
  - `workspace-context` 계열 비동기 로딩 / watcher subscription / snapshot hydration / close teardown 정합성
  - file tree 검색 실패 표현, request token reset, clipboard cross-workspace guard, comment persistence schema hardening
  - Electron backend path validation, atomic write cleanup, remote connection diagnostics, remaining option hardening
  - code editor / spec viewer / syntax highlight resource lifecycle 정리
  - backend abstraction, shared type, language map, utility drift 감소
- 현재 known issue 중 구현 대상 backlog:
  - active heading / TOC active 추적
  - non-line hash heading jump 정밀화
  - watcher tuning
  - 트랙패드 스와이프 파일 히스토리 내비게이션
  - source selection mapping 후속 정밀화 범위
  - comment relocation heuristic
  - marker detail panel / comment thread UI
  - incremental export reset / re-export-all UX
  - global comments version history / 다중 문서 분류
  - rendered spec scroll position 앱 재시작 복원
- 각 phase 종료 시 `npm test`, `npm run lint`, 필요 시 `npm run dev` 수동 smoke 기준을 포함한 검증 전략

### Out of Scope

- `_sdd/spec/appendix/backlog-and-risks.md`의 "범위 밖으로 남긴 항목" 전체
- 이미 구현/검증 완료된 SSH 공통 유틸 통합, bootstrap/browse/transport hardening, routed handler factory
- IDE급 기능 추가, full LSP, auto-save/auto-format, staged/unstaged 세분화 git UI
- `_sdd/spec/` 직접 수정

### Guardrail Delta

1. 실행 경계는 계속 `activeWorkspaceId` 기준으로 유지한다.
2. local/remote 차이는 가능한 한 `workspace:*` IPC surface 뒤에 숨긴다.
3. source mapping은 exact offset additive + line fallback 모델을 유지한다.
4. comment source of truth는 계속 `.sdd-workbench/comments.json` / `.sdd-workbench/global-comments.md`를 유지하고, 필요한 경우 additive metadata 또는 backward-compatible migration만 허용한다.
5. phase 간 의미 충돌 가능성이 높으면 병렬보다 순차 실행을 우선한다.

## Contract/Invariant Delta

| ID | Type | Change | Why |
|----|------|--------|-----|
| C1 | Modify | `workspace` 문서 로딩, watch, snapshot, close teardown 경로는 fire-and-forget 대신 완료/실패를 관찰 가능한 비동기 동작으로 정리한다 | race와 stale state 전이를 줄이기 위해 |
| C2 | Modify | file tree 검색, delete, clipboard, comment persistence는 "실패"와 "결과 없음"을 구분하고 cross-workspace mutation을 차단해야 한다 | 사용자 체감 안전성과 명확한 오류 표면이 필요해서 |
| C3 | Modify | Electron backend의 path validation, atomic write, remote error redaction/diagnostics는 공통 helper와 명시적 cleanup 규칙을 가진다 | backend surface drift와 silent failure를 줄이기 위해 |
| C4 | Modify | code editor / spec viewer / syntax highlight 리소스는 재사용 또는 해제 생명주기가 명시되어야 하며, jump/search/comment UX는 기존 계약을 유지한다 | 메모리/리소스 누수와 과민한 재생성을 줄이기 위해 |
| C5 | Add | active heading, precise heading jump, export reset, marker detail UI, global comments organization, spec scroll restore 등 남은 backlog는 additive UX feature로 단계적으로 제공한다 | 사용자 가시 backlog를 roadmap 수준이 아니라 실행 가능한 task로 닫기 위해 |
| C6 | Modify | shared language map, backend interface typing, context surface, path utility는 canonical single source를 갖도록 정리한다 | 중복과 drift를 구조적으로 줄이기 위해 |
| I1 | Add | `activeWorkspaceId`와 workspace root 경계는 모든 phase에서 유지되어야 하며, local/remote 공통 계약을 깨지 않는다 | 제품의 핵심 guardrail 유지 |
| I2 | Add | exact source offset + line fallback 이중 경로는 viewer refactor 이후에도 유지되어야 한다 | spec/code navigation 회귀 방지 |
| I3 | Add | comment 저장 포맷 변경이 필요하면 기존 comments/global-comments 파일을 읽을 수 있는 backward-compatible 경로를 제공한다 | 기존 사용자 데이터 보호 |
| I4 | Add | 각 phase 종료 시 fresh `npm test`, `npm run lint`, 변경 흐름 중심 smoke verification을 남긴다 | review-fix loop와 품질 게이트 일치 |

## Touchpoints

| Area | 주요 파일 | 변경 이유 |
|------|-----------|----------|
| Workspace state / persistence | `src/workspace/workspace-context.tsx`, `src/workspace/use-workspace-file-operations.ts`, `src/workspace/use-workspace-watcher.ts`, `src/workspace/use-workspace-snapshot.ts`, `src/workspace/workspace-persistence.ts` | race, fire-and-forget, snapshot restore, context surface 정리 |
| File tree / clipboard / comments | `src/file-tree/file-tree-panel.tsx`, `electron/file-clipboard.ts`, `src/code-comments/comment-persistence.ts`, `src/App.tsx` | 검색 실패 표현, delete contract, cross-workspace paste, schema safety 강화 |
| Electron backend / path safety | `electron/workspace-utils.ts`, `electron/workspace-ipc-handlers.ts`, `electron/workspace-path.ts`, `electron/remote-agent/runtime/workspace-ops.ts` | atomic write, path validation, schema validation, cleanup 일원화 |
| Remote backend / diagnostics | `electron/remote-agent/connection-service.ts`, `electron/workspace-backend/remote-workspace-backend.ts`, `electron/system-open.ts` | listener lifecycle, error redaction, option hardening, backend method duplication 감소 |
| Code editor / highlighting | `src/code-editor/code-editor-panel.tsx`, `src/code-viewer/language-map.ts`, `src/code-viewer/syntax-highlight.ts`, `src/spec-viewer/highlighted-code-block.tsx` | editor lifecycle, map drift, highlighter disposal, async cleanup 정리 |
| Spec viewer / navigation | `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/spec-viewer-scroll.ts`, `src/spec-viewer/spec-link-utils.ts` | active heading, heading hash jump, rendered scroll restore, source mapping 후속 개선 |
| Comments / export UX | `src/code-comments/comment-anchor.ts`, `src/code-comments/comment-export.ts`, `src/code-comments/export-comments-modal.tsx`, `src/code-comments/global-comments-modal.tsx` | relocation heuristic, export reset, global comments organization, marker detail UI |
| Test / verification | `src/App.test.tsx`, `src/file-tree/file-tree-panel.test.tsx`, `src/code-editor/code-editor-panel.test.tsx`, `src/spec-viewer/spec-viewer-panel.test.tsx`, `electron/*/*.test.ts` | phase별 회귀 고정 및 남은 blind spot 해소 |

## Implementation Plan

1. **Phase 1 — Workspace Async / State Stabilization**
   `workspace` 문서 로더, watcher subscription, snapshot restore, close teardown을 먼저 고쳐서 이후 모든 UI/backend 작업의 상태 기반을 안정화한다.
2. **Phase 2 — Tree / Clipboard / Comment Safety**
   파일 검색 UX, delete confirmation contract, clipboard workspace boundary, comment schema 파싱을 정리한다.
3. **Phase 3 — Backend Hardening**
   atomic write, path validation, comment JSON schema 검증, remote diagnostics, system-open hardening을 마무리한다.
4. **Phase 4 — Viewer Lifecycle / Shared Utility Cleanup**
   editor/highlighter 리소스 관리와 language map / 반복 UI helper를 정리한다.
5. **Phase 5 — Backend Abstraction / Type Normalization**
   remote backend request table, backend typing, context surface grouping 등 구조 drift를 줄인다.
6. **Phase 6 — User-visible Backlog Completion**
   active heading, heading jump precision, scroll restore, export reset, marker detail, comment relocation, global comments organization, swipe history, watcher tuning을 닫는다.
7. **Phase 7 — Coverage / Naming / Final Polish**
   테스트 커버리지, low-risk naming, dead-code cleanup, residual review finding 정리를 끝낸다.

## Validation Plan

| ID | Targets | Verification Method | Evidence / Notes |
|----|---------|---------------------|------------------|
| V1 | C1, I1, I4 | unit/integration test, review | `workspace` loader/watch/snapshot/close 경로에 대한 focused test + full gate |
| V2 | C2, I1, I3, I4 | UI test, unit test, smoke | file tree 검색/삭제/clipboard/comment persistence 회귀 검증 |
| V3 | C3, C6, I1, I4 | backend test, remote/local scenario review | atomic write, path validation, remote diagnostics, system-open hardening 검증 |
| V4 | C4, C6, I2, I4 | component test, render/navigation smoke | editor/highlighter lifecycle, map drift, viewer helper refactor 회귀 검증 |
| V5 | C5, I2, I3, I4 | Electron smoke, targeted UI test | active heading, export reset, marker detail, scroll restore 등 사용자 가시 흐름 검증 |
| V6 | C1, C2, C3, C4, C5, C6, I1, I2, I3, I4 | full regression | 마지막 phase 종료 후 `npm test`, `npm run lint`, 대표 수동 smoke 묶음 |

## Risks / Open Questions

1. 범위가 넓기 때문에 Phase 6의 backlog UX 중 comment relocation / global comments version history는 schema 또는 migration 설계가 커지면 별도 draft로 분리하는 편이 안전할 수 있다.
2. `POST_SPLIT_REMAINING_ISSUES.md`의 일부 low/medium 항목은 현재 코드 기준으로 이미 사실상 완화되었을 수 있다. 구현 착수 전 phase별로 "still reproducible" 체크를 한 번 더 거쳐야 한다.
3. 트랙패드 스와이프 히스토리는 macOS/Electron 이벤트 제약 때문에 prototype 결과에 따라 full ship이 아니라 guarded experimental path가 될 수 있다.
4. rendered spec scroll restore는 per-workspace/per-spec/per-tab 저장 범위를 먼저 확정해야 하며, 과도한 persistence는 state drift를 유발할 수 있다.
5. delete confirmation contract를 FileTreePanel 자체로 끌어올릴지, App orchestrator 책임으로 유지하되 명시적 prop contract만 만들지는 구현 전 최종 선택이 필요하다.

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

이 계획은 post-split 이후 남아 있는 안정화 이슈와 product-visible backlog를 "한 번에 다 수정할 수 있는" 순차 실행형 master roadmap으로 정리한다. 이미 끝난 SSH 공통 유틸 통합, routed handler factory, 일부 분할 작업은 제외하고, 현재 코드 기준으로 남은 write set만 phase와 task로 분해한다.

전체 전략은 다음과 같다.

- **먼저 정합성**: `workspace` state와 검색/클립보드/삭제 같은 기본 흐름을 안전하게 만든다.
- **그 다음 backend / viewer 구조**: hardening, diagnostics, lifecycle, shared source 정리를 진행한다.
- **마지막으로 backlog UX**: active heading, export reset, global comments organization 같은 사용자 가시 기능을 닫는다.

## Scope

### In Scope

- `workspace` async/state race, snapshot restore, watcher lifecycle, close teardown
- file tree search UX, clipboard boundary guard, comment schema hardening, delete confirmation contract
- Electron backend path validation / atomic write / remote diagnostics / system-open hardening
- code editor / spec viewer / Shiki lifecycle 개선
- backend abstraction/type drift 및 shared language map / helper 정리
- backlog known issue 10건의 실행 가능한 phase/task화
- 테스트 보강과 low-risk naming / dead-code polish

### Out of Scope

- `_sdd/spec/` 직접 수정
- backlog 문서의 explicit out-of-scope 항목
- 이미 완료된 SSH hardening / routed handler factory 재실행
- IDE급 신규 기능 확장

## Components

| Component | 주요 코드 | 이번 계획에서의 역할 |
|-----------|----------|----------------------|
| Workspace State / Persistence | `src/workspace/*` | race 제거, awaitable flow, restore 안정화, context surface 정리 |
| File Tree / Clipboard / Comments | `src/file-tree/*`, `electron/file-clipboard.ts`, `src/code-comments/*` | 사용자 입력 안전성, 검색 UX, delete/clipboard/comments contract 정리 |
| Electron Backend / Remote | `electron/workspace-*.ts`, `electron/remote-agent/*`, `electron/system-open.ts` | path safety, diagnostics, abstraction, type drift 해소 |
| Code Editor / Viewer | `src/code-editor/*`, `src/code-viewer/*` | editor/highlighter lifecycle, display map canonicalization |
| Spec Viewer / Navigation | `src/spec-viewer/*` | active heading, heading jump, scroll restore, source mapping 후속 개선 |
| Verification | `src/**/*.test.ts(x)`, `electron/**/*.test.ts` | phase별 회귀 고정 및 full gate 유지 |

## Contract/Invariant Delta Coverage

| Delta | Covered By | Notes |
|-------|------------|-------|
| C1 | T1-1, T1-2, T1-3, T5-3 | `workspace` loader/watch/snapshot/close 흐름을 awaitable / explicit state로 재정리 |
| C2 | T2-1, T2-2, T2-3 | search/clipboard/delete/comments의 failure surface와 boundary guard 정리 |
| C3 | T3-1, T3-2, T3-3 | backend utility, atomic write, remote diagnostics, system-open hardening |
| C4 | T4-1, T4-2, T4-3 | editor/highlighter lifecycle, viewer/tree helper canonicalization |
| C5 | T6-1, T6-2, T6-3, T6-4 | 사용자 가시 backlog feature를 additive UX로 구현 |
| C6 | T4-1, T5-1, T5-2, T5-3, T7-2 | canonical map/type/helper/source 정리 |
| I1 | T1-1 ~ T7-2 | 모든 phase에서 workspace boundary / common IPC surface 유지 |
| I2 | T4-2, T4-3, T6-1, T6-2 | viewer/source mapping/navigation 회귀 방지 |
| I3 | T2-3, T6-2, T6-3 | comments/global-comments storage의 backward compatibility 유지 |
| I4 | T1-1 ~ T7-2 | phase exit마다 `npm test`, `npm run lint`, 변경 흐름 smoke 실시 |

## Implementation Phases

| Phase | Goal | Primary Tasks | Dependencies |
|-------|------|---------------|-------------|
| 1 | `workspace` async/state 안정화 | T1-1, T1-2, T1-3 | 없음 |
| 2 | file tree / clipboard / comment safety 강화 | T2-1, T2-2, T2-3 | Phase 1 |
| 3 | Electron backend / remote hardening 마무리 | T3-1, T3-2, T3-3 | Phase 2 |
| 4 | viewer lifecycle / shared utility cleanup | T4-1, T4-2, T4-3 | Phase 3 |
| 5 | backend abstraction / type normalization | T5-1, T5-2, T5-3 | Phase 4 |
| 6 | user-visible backlog 기능 완료 | T6-1, T6-2, T6-3, T6-4 | Phase 5 |
| 7 | coverage / naming / final polish | T7-1, T7-2 | Phase 6 |

## Task Details

### Task T1-1: workspace 문서 로더를 awaitable tracked action으로 전환
**Component**: Workspace State / Persistence  
**Priority**: P0  
**Type**: Refactor

**Description**: `loadWorkspaceSpec`, `loadWorkspaceFile`의 async IIFE 패턴을 제거하고 호출자가 완료/실패를 관찰할 수 있는 tracked async action으로 바꾼다. stale request guard는 유지하되, snapshot/watcher/history 흐름이 await 가능해지도록 정리한다.

**Acceptance Criteria**:
- [ ] `use-workspace-file-operations.ts`에 `void (async () => {})()` 패턴이 남지 않는다
- [ ] stale request guard와 draft reuse 동작이 유지된다
- [ ] snapshot/watcher/history 경로에서 새 async 시그니처를 안전하게 사용할 수 있다

**Target Files**:
- [M] `src/workspace/use-workspace-file-operations.ts` -- document loader를 awaitable tracked action으로 재구성
- [M] `src/workspace/ipc-call-helper.ts` -- tracked IPC helper 시그니처/보조 유틸 확장
- [M] `src/workspace/workspace-context.tsx` -- 내부 호출부 정리
- [C] `src/workspace/use-workspace-file-operations.test.ts` -- loader race / stale request / draft reuse 회귀 테스트

**Technical Notes**: Covers C1, C6, I1, validated by V1  
**Dependencies**: 없음

### Task T1-2: watcher subscription lifecycle과 close teardown을 명시화
**Component**: Workspace State / Persistence  
**Priority**: P0  
**Type**: Bug

**Description**: `onWatchEvent` 구독 생명주기와 콜백 생성을 분리하고, `closeWorkspace`의 remote disconnect / watch stop을 fire-and-forget이 아닌 명시적 teardown 경로로 정리한다.

**Acceptance Criteria**:
- [ ] watch subscription이 effect 재실행 시 이벤트 유실 없이 유지된다
- [ ] `closeWorkspace`가 disconnect/watch stop 실패를 무음으로 삼키지 않는다
- [ ] active file/spec refresh와 changedFiles 갱신 회귀가 없다

**Target Files**:
- [M] `src/workspace/use-workspace-watcher.ts` -- listener lifecycle / callback indirection 정리
- [M] `src/workspace/workspace-context.tsx` -- close teardown orchestration 수정
- [M] `src/workspace/use-workspace-remote.ts` -- disconnect/watch stop 호출부 정리
- [C] `src/workspace/use-workspace-watcher.test.ts` -- subscription lifecycle / close teardown 테스트

**Technical Notes**: Covers C1, I1, I4, validated by V1  
**Dependencies**: T1-1

### Task T1-3: snapshot hydration을 병렬 restore + 명시적 오류 표면으로 재정리
**Component**: Workspace State / Persistence  
**Priority**: P0  
**Type**: Refactor

**Description**: snapshot restore의 직렬 `await` 루프를 `Promise.allSettled` 중심 restore flow로 정리하고, persistence parse 실패/restore 실패를 배너 또는 복구 가능한 상태로 표면화한다.

**Acceptance Criteria**:
- [ ] snapshot restore가 workspace 단위 병렬 restore를 지원한다
- [ ] parse/restore 실패가 완전히 무음으로 사라지지 않는다
- [ ] restore 실패 시 나머지 workspace restore는 계속 진행된다

**Target Files**:
- [M] `src/workspace/use-workspace-snapshot.ts` -- 병렬 restore / failed restore 집계
- [M] `src/workspace/workspace-persistence.ts` -- parse failure / storage failure 진단 보강
- [M] `src/workspace/workspace-context.tsx` -- restore caller 정리
- [C] `src/workspace/use-workspace-snapshot.test.ts` -- restore concurrency / partial failure 테스트

**Technical Notes**: Covers C1, I1, I4, validated by V1  
**Dependencies**: T1-1

### Task T2-1: file tree 검색 상태를 실패/빈결과/partial 상태로 분리
**Component**: File Tree / Clipboard / Comments  
**Priority**: P0  
**Type**: Bug

**Description**: file tree 검색에서 rootPath 변경 시 request token을 리셋하고, 검색 실패를 빈 결과와 구분되는 UI 상태로 드러내며, partial hint와 함께 유지한다.

**Acceptance Criteria**:
- [ ] rootPath 변경 시 stale search response가 새 workspace에 반영되지 않는다
- [ ] 검색 실패와 결과 없음이 서로 다른 UI 상태로 표현된다
- [ ] partial hint(`truncated`, `timedOut`, `depthLimitHit`)는 기존대로 유지된다

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- search token/state 모델 확장
- [M] `src/file-tree/file-tree-panel.test.tsx` -- search failure / workspace switch regression 테스트

**Technical Notes**: Covers C2, I1, validated by V2  
**Dependencies**: Phase 1 완료

### Task T2-2: clipboard paste를 workspace boundary aware flow로 강화
**Component**: File Tree / Clipboard / Comments  
**Priority**: P0  
**Type**: Bug

**Description**: Finder/local paste와 internal clipboard paste 모두에서 source/target workspace 경계를 명시적으로 검증하고, cross-workspace paste 정책을 코드와 테스트에 고정한다.

**Acceptance Criteria**:
- [ ] internal clipboard paste 시 source rootPath와 target rootPath 정책이 명시적으로 검증된다
- [ ] 허용하지 않는 cross-workspace paste는 안전하게 거부된다
- [ ] Finder/local paste 경로 검증 회귀가 없다

**Target Files**:
- [M] `electron/file-clipboard.ts` -- internal/finder paste boundary 검증 추가
- [M] `electron/file-clipboard.test.ts` -- cross-workspace paste / finder path regression 테스트
- [M] `electron/workspace-backend/copy-entries.ts` -- local copy boundary helper 정리

**Technical Notes**: Covers C2, C3, I1, validated by V2, V3  
**Dependencies**: Phase 1 완료

### Task T2-3: delete confirmation contract와 comment schema parsing을 명시화
**Component**: File Tree / Clipboard / Comments  
**Priority**: P1  
**Type**: Refactor

**Description**: FileTreePanel의 delete action이 confirmation responsibility를 명시적 prop/contract로 갖도록 정리하고, comment persistence는 invalid numeric input / partial record를 명시적으로 skip 또는 오류로 처리하는 schema path를 강화한다.

**Acceptance Criteria**:
- [ ] delete confirmation responsibility가 FileTreePanel 계약에 드러난다
- [ ] invalid comment numeric field가 명시적 처리 규칙을 가진다
- [ ] App orchestration과 file tree tests가 새 계약에 맞게 정리된다

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- delete action contract 명시화
- [M] `src/file-tree/file-tree-panel.test.tsx` -- delete confirmation contract 테스트
- [M] `src/App.tsx` -- delete orchestration 정리
- [M] `src/code-comments/comment-persistence.ts` -- schema parsing / invalid numeric handling 강화
- [M] `src/code-comments/comment-persistence.test.ts` -- invalid schema regression 테스트

**Technical Notes**: Covers C2, I3, validated by V2  
**Dependencies**: T2-1

### Task T3-1: atomic write / path validation / comment JSON schema helper를 공통화
**Component**: Electron Backend / Remote  
**Priority**: P0  
**Type**: Infrastructure

**Description**: local Electron handler와 remote runtime 양쪽의 atomic write/path validation/schema parsing에 공통 규칙을 도입한다. `writeFileAtomic` cleanup, temp filename hardening, comment JSON 최소 schema 검증을 포함한다.

**Acceptance Criteria**:
- [ ] atomic write가 rename 실패 시 temp file cleanup을 보장한다
- [ ] temp filename은 예측 가능성이 낮아진다
- [ ] comments JSON은 `Array.isArray` 이상 수준의 최소 schema 검증을 수행한다
- [ ] local Electron handler와 remote runtime 모두 일관된 규칙을 갖는다

**Target Files**:
- [M] `electron/workspace-utils.ts` -- atomic write cleanup / temp filename hardening
- [M] `electron/workspace-ipc-handlers.ts` -- comments schema 검증 및 helper 사용
- [M] `electron/workspace-path.ts` -- canonical path helper 확장
- [M] `electron/remote-agent/runtime/workspace-ops.ts` -- runtime 쪽 atomic write/schema guard 동기화
- [M] `electron/remote-agent/runtime/workspace-ops.test.ts` -- runtime regression 테스트
- [C] `electron/workspace-ipc-handlers.test.ts` -- local handler path/schema regression 테스트

**Technical Notes**: Covers C3, C6, I1, I3, validated by V3  
**Dependencies**: Phase 2 완료

### Task T3-2: remote connection diagnostics와 listener lifecycle을 보강
**Component**: Electron Backend / Remote  
**Priority**: P1  
**Type**: Bug

**Description**: `connection-service`의 무음 catch, external listener cleanup 타이밍, remote backend error wrapping을 정리해 reconnect 중 listener 유실과 진단 정보 손실을 줄인다.

**Acceptance Criteria**:
- [ ] stale update 외 예기치 않은 registry update failure는 debug 정보가 남는다
- [ ] reconnect 루프 중 external listener가 조기 삭제되지 않는다
- [ ] remote backend error wrapping이 개발/테스트 환경에서 원인 추적 가능성을 보존한다

**Target Files**:
- [M] `electron/remote-agent/connection-service.ts` -- safeUpdateState / cleanup lifecycle 개선
- [M] `electron/remote-agent/connection-service.test.ts` -- reconnect / listener lifecycle 테스트
- [M] `electron/workspace-backend/remote-workspace-backend.ts` -- requestWorkspaceMethod diagnostic path 정리
- [M] `electron/workspace-backend/remote-workspace-backend.test.ts` -- error wrapping 회귀 테스트

**Technical Notes**: Covers C3, I1, validated by V3  
**Dependencies**: T3-1

### Task T3-3: system-open과 remote method error semantics를 남은 hardening 수준까지 맞춘다
**Component**: Electron Backend / Remote  
**Priority**: P2  
**Type**: Bug

**Description**: `system-open.ts`의 remote SSH destination hardening을 shared rule과 맞추고, remote runtime/request-router/security 계층의 `PATH_DENIED` 재사용 문제를 정리해 error semantics를 명확하게 한다.

**Acceptance Criteria**:
- [ ] remote iTerm / shell destination에서 option-like host/user 입력이 차단된다
- [ ] method-not-allowed 계열 error semantics가 path denied와 구분된다
- [ ] 관련 테스트가 추가 또는 갱신된다

**Target Files**:
- [M] `electron/system-open.ts` -- destination hardening
- [M] `electron/system-open.test.ts` -- hardening regression 테스트
- [M] `electron/remote-agent/security.ts` -- error semantic helper 정리
- [M] `electron/remote-agent/runtime/request-router.ts` -- method error code 정리
- [M] `electron/remote-agent/runtime/request-router.test.ts` -- error semantic 회귀 테스트

**Technical Notes**: Covers C3, C6, I1, validated by V3  
**Dependencies**: T3-2

### Task T4-1: editor lifecycle과 display language source를 canonical map으로 통합
**Component**: Code Editor / Viewer  
**Priority**: P1  
**Type**: Refactor

**Description**: `showEditor` 토글에 과민한 `EditorView` 생성/파괴를 줄이고, display language와 highlight language가 같은 canonical map을 참조하도록 정리한다.

**Acceptance Criteria**:
- [ ] editor view가 단순 visibility 변화에 불필요하게 재생성되지 않는다
- [ ] header display language와 highlight language 간 drift가 제거된다
- [ ] 관련 cleanup 주석과 테스트가 정리된다

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx` -- EditorView lifecycle / display language 정리
- [M] `src/code-editor/code-editor-panel.test.tsx` -- lifecycle / display label regression 테스트
- [M] `src/code-viewer/language-map.ts` -- canonical language metadata 확장
- [M] `src/code-viewer/language-map.test.ts` -- canonical map 테스트
- [M] `src/code-editor/cm6-language-map.ts` -- canonical map 연동

**Technical Notes**: Covers C4, C6, I2, validated by V4  
**Dependencies**: Phase 3 완료

### Task T4-2: Shiki highlighter disposal과 HighlightedCodeBlock async cleanup을 도입
**Component**: Code Editor / Viewer  
**Priority**: P1  
**Type**: Infrastructure

**Description**: highlighter cache disposal API를 도입하고, `HighlightedCodeBlock`의 highlight Promise 흐름을 취소 가능 또는 request-token 기반으로 정리해 빠른 스크롤 시 누적되는 작업을 줄인다.

**Acceptance Criteria**:
- [ ] highlighter cache를 명시적으로 정리하는 API가 추가된다
- [ ] `HighlightedCodeBlock`이 obsolete highlight result를 안전하게 무시하거나 취소한다
- [ ] viewer theme change와 code block render 회귀가 없다

**Target Files**:
- [M] `src/code-viewer/syntax-highlight.ts` -- disposal API / cache lifecycle 추가
- [M] `src/code-viewer/syntax-highlight.test.ts` -- disposal / lifecycle 테스트
- [M] `src/spec-viewer/highlighted-code-block.tsx` -- async cleanup / tokenization 정리
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- new lifecycle hook-up
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- code block render regression 테스트
- [C] `src/spec-viewer/highlighted-code-block.test.tsx` -- isolated async lifecycle 테스트

**Technical Notes**: Covers C4, I2, validated by V4  
**Dependencies**: T4-1

### Task T4-3: viewer/tree 반복 UI helper를 canonical component/helper로 추출
**Component**: Code Editor / Viewer  
**Priority**: P2  
**Type**: Refactor

**Description**: spec viewer의 반복 block builder와 file tree git badge 표시 로직을 공통 helper/component로 추출해 medium-level duplication과 size 문제를 함께 줄인다.

**Acceptance Criteria**:
- [ ] spec viewer block rendering helper가 반복 호출을 줄인다
- [ ] file tree git badge 로직이 directory/file 공통 component를 사용한다
- [ ] 관련 테스트가 회귀를 고정한다

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- block helper 적용
- [M] `src/spec-viewer/spec-viewer-helpers.ts` -- canonical block helper 확장
- [C] `src/file-tree/git-status-badge.tsx` -- 공통 git badge component
- [M] `src/file-tree/file-tree-panel.tsx` -- badge component 적용
- [M] `src/file-tree/file-tree-panel.test.tsx` -- badge/render regression 테스트

**Technical Notes**: Covers C4, C6, I2, validated by V4  
**Dependencies**: T4-1

### Task T5-1: RemoteWorkspaceBackend를 table-driven request map으로 전환
**Component**: Electron Backend / Remote  
**Priority**: P1  
**Type**: Refactor

**Description**: `RemoteWorkspaceBackend`의 유사 메서드 반복을 request table 기반 구현으로 줄이고, `watchStop`/`dispose` cleanup 중복을 공통 helper로 정리한다.

**Acceptance Criteria**:
- [ ] request forwarding 로직이 table-driven 또는 동등한 canonical helper를 사용한다
- [ ] `watchStop`/`dispose` cleanup 중복이 제거된다
- [ ] public backend contract는 유지된다

**Target Files**:
- [M] `electron/workspace-backend/remote-workspace-backend.ts` -- table-driven request dispatch / cleanup helper
- [M] `electron/workspace-backend/remote-workspace-backend.test.ts` -- request dispatch / cleanup regression 테스트

**Technical Notes**: Covers C3, C6, validated by V3, V4  
**Dependencies**: T3-2

### Task T5-2: WorkspaceBackend와 local backend handler typing을 구체화
**Component**: Electron Backend / Remote  
**Priority**: P2  
**Type**: Refactor

**Description**: `WorkspaceBackend`의 `Promise<unknown>` 반환형과 local backend handler 중복을 구체적인 typed contract로 점진 정리한다. routed/local integration test도 함께 보강한다.

**Acceptance Criteria**:
- [ ] 주요 backend 메서드 반환형이 더 구체적인 타입을 갖는다
- [ ] local backend handler 타입은 `WorkspaceBackend`와 불필요하게 중복되지 않는다
- [ ] routed/local integration test가 새 타입 계약에 맞게 유지된다

**Target Files**:
- [M] `electron/workspace-backend/types.ts` -- backend method 반환형 구체화
- [M] `electron/workspace-backend/local-workspace-backend.ts` -- handler 타입 정리
- [M] `electron/workspace-ipc-routing.ts` -- typed backend 연동 정리
- [M] `electron/workspace-backend/backend-router.test.ts` -- typed routing regression 테스트
- [M] `electron/workspace-backend/local-workspace-backend.test.ts` -- local backend typing 회귀 테스트

**Technical Notes**: Covers C6, validated by V3, V4  
**Dependencies**: T5-1

### Task T5-3: WorkspaceContext surface를 state/actions/remote 묶음으로 재구성
**Component**: Workspace State / Persistence  
**Priority**: P2  
**Type**: Refactor

**Description**: flat한 `WorkspaceContextValue`를 소비자 이해가 쉬운 grouped surface로 재구성하되, 필요한 경우 compatibility layer를 두어 App과 기존 훅 소비 코드를 단계적으로 이전한다.

**Acceptance Criteria**:
- [ ] context surface가 `state` / `actions` / `remote` 등 의미 단위로 묶인다
- [ ] 소비자 코드(App 등)가 새 구조 또는 compatibility layer로 동작한다
- [ ] context API 변화가 문서화 가능한 수준으로 정리된다

**Target Files**:
- [M] `src/workspace/workspace-context-types.ts` -- grouped context shape 도입
- [M] `src/workspace/workspace-context.tsx` -- grouped value 조립
- [M] `src/workspace/use-workspace.ts` -- compatibility accessor 또는 새 surface 반환
- [M] `src/App.tsx` -- grouped context 소비 정리
- [M] `src/App.test.tsx` -- context surface regression 테스트

**Technical Notes**: Covers C1, C6, I1, validated by V1, V6  
**Dependencies**: T1-1, T5-2

### Task T6-1: spec viewer navigation backlog를 한 묶음으로 구현
**Component**: Spec Viewer / Navigation  
**Priority**: P1  
**Type**: Feature

**Description**: active heading / TOC active 추적, non-line hash heading jump 정밀화, rendered spec scroll position 앱 재시작 복원을 같은 navigation backlog 묶음으로 구현한다.

**Acceptance Criteria**:
- [ ] heading 기반 active state가 rendered spec에서 갱신된다
- [ ] hash-only heading jump가 line jump에 비해 더 정밀하게 동작한다
- [ ] spec scroll position이 앱 재시작 후 복원된다

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- active heading / precise jump / scroll restore 연동
- [M] `src/spec-viewer/spec-viewer-scroll.ts` -- scroll state helper 확장
- [M] `src/spec-viewer/spec-link-utils.ts` -- hash heading resolution 정밀화
- [M] `src/workspace/workspace-persistence.ts` -- persisted UI state 저장 범위 확장
- [M] `src/App.tsx` -- scroll restore orchestration
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- active heading / heading jump / scroll restore 테스트

**Technical Notes**: Covers C5, I2, I4, validated by V5  
**Dependencies**: Phase 5 완료

### Task T6-2: comment relocation heuristic와 marker detail UI를 additive feature로 도입
**Component**: File Tree / Clipboard / Comments  
**Priority**: P2  
**Type**: Feature

**Description**: stale anchor 시 best-effort relocation heuristic를 도입하고, line/global marker에서 상세 패널 또는 lightweight thread UI를 열 수 있는 additive UI를 추가한다.

**Acceptance Criteria**:
- [ ] stale anchor comment가 heuristic relocation 또는 degraded fallback을 가진다
- [ ] marker detail UI가 현재 line/global comment 흐름과 충돌하지 않는다
- [ ] 기존 comment export/persistence와 호환된다

**Target Files**:
- [M] `src/code-comments/comment-anchor.ts` -- relocation heuristic 확장
- [M] `src/code-comments/comment-line-index.ts` -- relocated comment indexing 반영
- [M] `src/code-comments/comment-hover-popover.tsx` -- detail entry point 보강
- [C] `src/code-comments/comment-marker-detail-panel.tsx` -- marker detail / lightweight thread UI
- [M] `src/code-comments/comment-list-modal.tsx` -- detail panel 연동
- [M] `src/App.tsx` -- modal/detail orchestration
- [M] `src/code-comments/comment-anchor.test.ts` -- relocation heuristic 테스트
- [C] `src/code-comments/comment-marker-detail-panel.test.tsx` -- detail UI 테스트

**Technical Notes**: Covers C5, I2, I3, validated by V5  
**Dependencies**: T2-3

### Task T6-3: export reset / global comments organization backlog를 닫는다
**Component**: File Tree / Clipboard / Comments  
**Priority**: P2  
**Type**: Feature

**Description**: incremental export reset / re-export-all UX와 global comments version history / 다중 문서 분류를 같은 export/comment workflow 묶음으로 구현한다.

**Acceptance Criteria**:
- [ ] export modal에서 reset / re-export-all 경로가 명시적으로 제공된다
- [ ] global comments가 문서 또는 섹션 기준 분류를 지원한다
- [ ] version history 또는 최소한 append-only 변경 이력 경로가 정의된다

**Target Files**:
- [M] `src/code-comments/comment-export.ts` -- export reset / re-export-all semantics
- [M] `src/code-comments/export-comments-modal.tsx` -- UX entry point 추가
- [M] `src/code-comments/global-comments-modal.tsx` -- 분류/이력 UI
- [M] `src/code-comments/comment-persistence.ts` -- additive metadata 또는 history persistence
- [C] `src/code-comments/global-comments-history.ts` -- history helper 또는 adapter
- [M] `src/code-comments/comment-export.test.ts` -- export reset regression 테스트
- [M] `src/code-comments/global-comments-modal.test.tsx` -- global comments organization 테스트

**Technical Notes**: Covers C5, I3, validated by V5  
**Dependencies**: T6-2

### Task T6-4: watcher tuning과 trackpad swipe history를 UX backlog로 정리
**Component**: Workspace State / Persistence  
**Priority**: P3  
**Type**: Feature

**Description**: watcher tuning 여지를 실제 운영 설정으로 정리하고, macOS trackpad swipe를 파일 히스토리 내비게이션에 연결할 수 있는 guarded UX를 도입한다.

**Acceptance Criteria**:
- [ ] watcher tuning이 설정 또는 heuristic 수준에서 명시된다
- [ ] swipe history가 지원 환경에서 의도대로 동작하거나 안전하게 비활성화된다
- [ ] 기존 keyboard/button history navigation과 충돌하지 않는다

**Target Files**:
- [M] `src/hooks/use-history-navigation.ts` -- swipe history 입력 경로 추가
- [M] `src/App.tsx` -- history orchestration / guard
- [M] `src/workspace/use-workspace-watcher.ts` -- tuning parameter/heuristic 정리
- [M] `electron/workspace-watch-mode.ts` -- watcher mode/tuning helper 보강
- [M] `src/App.test.tsx` -- history UX regression 테스트
- [M] `electron/workspace-watch-mode.test.ts` -- tuning regression 테스트

**Technical Notes**: Covers C5, I1, I4, validated by V5  
**Dependencies**: T1-2

### Task T7-1: 남은 blind spot을 focused test로 메운다
**Component**: Verification  
**Priority**: P1  
**Type**: Test

**Description**: 앞선 phase에서 추가된 behavior를 중심으로 missing test 영역을 메운다. 특히 workspace hooks, backend handlers, comment hover, copy/paste boundary, spec viewer helpers를 우선한다.

**Acceptance Criteria**:
- [ ] 앞선 phase에서 새로 도입한 helper/hook/component에 focused test가 추가된다
- [ ] 기존 full gate만으로는 놓치기 쉬운 edge case가 regression으로 고정된다

**Target Files**:
- [M] `electron/workspace-ipc-handlers.test.ts` -- backend path/schema regression 확장
- [M] `electron/file-clipboard.test.ts` -- cross-workspace / finder boundary 추가
- [M] `src/workspace/use-workspace-file-operations.test.ts` -- loader race regression 확장
- [M] `src/workspace/use-workspace-watcher.test.ts` -- watcher lifecycle 추가
- [C] `src/code-comments/comment-hover-popover.test.tsx` -- hover/detail positioning 테스트
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- backlog UX regression 확장

**Technical Notes**: Covers C1-C5, I4, validated by V6  
**Dependencies**: Phase 6 완료

### Task T7-2: low-risk naming / dead-code / compatibility 정리를 마무리
**Component**: Verification  
**Priority**: P3  
**Type**: Refactor

**Description**: behavior-sensitive 작업이 끝난 뒤 `ensurePathWithinWorkspace` naming, `CodeViewerJumpRequest` 레거시 명칭, dead placeholder, compatibility suffix 등 low-risk cleanup을 정리한다.

**Acceptance Criteria**:
- [ ] naming cleanup이 behavior 변경 없이 완료된다
- [ ] dead code / placeholder / misleading compatibility naming이 줄어든다
- [ ] 관련 import / test / CSS naming 회귀가 없다

**Target Files**:
- [M] `electron/workspace-path.ts` -- naming 정리
- [M] `src/code-editor/code-editor-panel.tsx` -- legacy type/class naming 정리
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- dead placeholder / helper naming 정리
- [M] `src/workspace/workspace-model.ts` -- compatibility naming 정리
- [M] `src/workspace/workspace-context.tsx` -- compatibility accessor 정리
- [M] `src/App.test.tsx` -- naming/selector 영향 회귀 정리

**Technical Notes**: Covers C6, validated by V6  
**Dependencies**: T7-1

## Parallel Execution Summary

- **Phase 1**은 `src/workspace/*` write set이 크게 겹치므로 순차 실행이 기본이다.
- **Phase 2**에서는 `T2-1`(file tree search)과 `T2-2`(clipboard boundary)는 병렬 가능하지만, `T2-3`은 `file-tree-panel.tsx`와 `App.tsx`를 함께 건드리므로 `T2-1` 이후가 안전하다.
- **Phase 3**에서는 `T3-1`과 `T3-3`이 일부 분리 가능하지만 둘 다 Electron backend semantics를 바꾸므로 동일 라운드에서 부모 통합이 필요하다.
- **Phase 4**에서는 `T4-1`(editor/language)과 `T4-2`(highlighter/spec viewer)는 write set이 거의 분리되어 병렬 후보가 된다. `T4-3`은 tree/spec viewer 양쪽 통합 결과를 본 뒤 적용하는 편이 안전하다.
- **Phase 5**는 backend/type/context surface가 의미적으로 강하게 연결되어 있어 순차 실행이 기본이다.
- **Phase 6**에서는 `T6-1`(spec viewer navigation)과 `T6-2`/`T6-3`(comments/export), `T6-4`(watcher/history)가 비교적 독립적이므로 bounded 병렬 실행 후보가 된다.
- **Phase 7**은 앞선 phase의 최종 상태를 기준으로 테스트/정리만 수행하므로 순차 마감이 적합하다.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `workspace` async/state 정리가 예상보다 넓게 번짐 | 초기 phase 지연, regressions 증가 | Phase 1에서 새 test file을 먼저 만들고, Promise 시그니처 변경 범위를 내부 helper 수준으로 제한 |
| comment relocation / global comments history가 additive 범위를 넘어 schema migration으로 커짐 | Phase 6 scope 급증 | schema migration이 필요하면 T6-2/T6-3를 별도 draft로 분리 |
| scroll restore / swipe history가 Electron 이벤트 제약에 막힘 | backlog feature 일부 보류 | feature flag 또는 guarded ship 경로 허용 |
| backend typing 정리가 routed/local/remote 공통 계약까지 크게 흔듦 | Phase 5 회귀 위험 | T5-2는 구체 타입을 점진적으로 추가하고 `Promise<unknown>` 제거를 단계적으로 진행 |
| naming cleanup이 test selector/CSS 계약을 건드림 | low-value regressions 발생 | T7-2는 마지막 phase에만 실행하고 selector 영향은 테스트에서 먼저 고정 |

## Open Questions

1. global comments version history는 append-only file, in-memory undo, 별도 metadata file 중 무엇이 가장 맞는지 구현 전 한 번 더 좁혀야 한다.
2. comment relocation은 heuristic만 제공할지, 사용자가 "stale anchor" 상태를 수동 승인하는 UX까지 넣을지 결정이 필요하다.
3. rendered spec scroll restore 범위는 per-workspace/per-file만으로 충분한지, 탭별 상태까지 나눌지 확정이 필요하다.
4. swipe history는 macOS 전용 ship이 현실적인데, cross-platform no-op contract를 별도 문서화할지 결정해야 한다.
5. `WorkspaceContextValue` grouped surface가 너무 넓게 번지면 `T5-3`는 compatibility wrapper를 유지한 채 내부 구조만 정리하는 변형안으로 줄일 수 있다.
