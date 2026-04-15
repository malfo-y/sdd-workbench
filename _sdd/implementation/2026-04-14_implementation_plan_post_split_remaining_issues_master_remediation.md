# Implementation Plan: Post-split Remaining Issues Master Remediation

**날짜**: 2026-04-14
**기반 문서**:
- `_sdd/drafts/2026-04-14_feature_draft_post_split_remaining_issues_master_remediation.md`
- `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`
- `_sdd/spec/main.md`
- `_sdd/spec/workspace-and-file-tree/overview.md`
- `_sdd/spec/workspace-and-file-tree/contracts.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `_sdd/spec/comments-and-export/overview.md`
- `_sdd/spec/comments-and-export/contracts.md`
- `_sdd/spec/remote-workspace/overview.md`
- `_sdd/spec/remote-workspace/contracts.md`

**Planning mode**: standalone `implementation-plan` 예외. feature draft는 이미 존재하므로, 이번 문서는 현재 코드 기준 phase gate와 execution order를 고정하는 실행 계획으로 사용한다.

## Overview

이 계획은 post-split 이후 남아 있는 정합성 문제, backend hardening, viewer lifecycle 정리, user-visible backlog를 7개 phase로 순차 실행한다. 핵심 원칙은 다음과 같다.

1. `workspace` state와 file tree/comment/backend safety를 먼저 닫아 이후 phase의 기반을 안정화한다.
2. large write set은 phase boundary 안에서만 다루고, 각 phase 종료 전에 review-fix gate와 repo gate를 모두 닫는다.
3. 이미 일부 구현이 존재하는 backlog(`spec` runtime scroll position, swipe history bridge 등)는 재구현하지 않고 "still missing delta"만 보강한다.

## Current-State Refresh

코드 탐색 기준으로 이번 계획의 출발점은 아래와 같다.

- 여전히 남아 있는 핵심 패턴:
  - `src/workspace/use-workspace-file-operations.ts`의 `void (async () => {})()` loader 2곳
  - `src/workspace/use-workspace-watcher.ts`의 effect 재구독 + fire-and-forget cleanup
  - `src/workspace/use-workspace-snapshot.ts`의 직렬 restore 루프
  - `src/file-tree/file-tree-panel.tsx`의 search failure/empty conflation
  - `src/code-comments/comment-persistence.ts`의 `Number(...)` 기반 loose parsing
  - `electron/file-clipboard.ts`의 internal clipboard cross-workspace policy 부재
  - `electron/workspace-utils.ts`의 predictable temp filename + cleanup 없는 atomic write
  - `electron/workspace-backend/types.ts`의 `Promise<unknown>` surface
  - `electron/remote-agent/runtime/request-router.ts`의 method-not-allowed와 `PATH_DENIED` code 재사용
  - `src/code-editor/code-editor-panel.tsx`의 `showEditor` 기준 EditorView 재생성
- 이미 부분적으로 구현된 흐름:
  - `src/hooks/use-history-navigation.ts`는 runtime spec/code scroll cache와 `swipe` bridge를 이미 가진다.
  - `src/spec-viewer/spec-viewer-scroll.ts`는 heading lookup helper를 이미 가진다.
  - 따라서 Phase 6은 active heading, app-restart scroll restore, hash-only heading jump precision, guarded swipe UX 보강에 집중한다.

## Scope

### In Scope

- `workspace` async/state race, snapshot restore, watcher lifecycle, close teardown
- file tree search state, clipboard workspace boundary, delete confirmation contract, comment schema hardening
- Electron/local/remote backend path safety, atomic write cleanup, diagnostics, error semantics
- editor/highlighter lifecycle, shared language metadata, repeated UI helper canonicalization
- backend/type/context surface normalization
- active heading, heading jump precision, app-restart spec scroll restore
- comment relocation heuristic, marker detail UI, export reset, global comments organization
- focused test gap closing, low-risk naming/dead-code cleanup

### Out of Scope

- `_sdd/spec/` 직접 수정
- `_sdd/spec/appendix/backlog-and-risks.md`의 explicit out-of-scope 항목
- 이미 완료된 SSH 유틸 통합 / routed handler factory 재실행
- IDE급 신규 기능 확장, full LSP, auto-save/auto-format

## Components

| Component | 주요 코드 | 이번 계획에서의 역할 |
|-----------|----------|----------------------|
| Workspace State / Persistence | `src/workspace/*` | async/state 정합성, restore, watcher, context surface |
| File Tree / Clipboard / Comments | `src/file-tree/*`, `electron/file-clipboard.ts`, `src/code-comments/*` | search/error UX, boundary guard, schema safety, comment UX |
| Electron Backend / Remote | `electron/*.ts`, `electron/remote-agent/*`, `electron/remote-agent/runtime/*` | atomic write, path safety, diagnostics, error semantics, typed backend |
| Code Editor / Viewer | `src/code-editor/*`, `src/code-viewer/*`, `src/spec-viewer/*` | EditorView lifecycle, highlighter disposal, helper canonicalization |
| Navigation / History | `src/hooks/use-history-navigation.ts`, `src/spec-viewer/spec-viewer-scroll.ts`, `src/spec-viewer/spec-link-utils.ts` | scroll restore, active heading, hash jump precision, swipe UX |
| Verification | `src/**/*.test.ts(x)`, `electron/**/*.test.ts` | phase regression, repo gate, blind-spot coverage |

## Contract/Invariant Delta Coverage

| Delta | Covered By | Notes |
|-------|------------|-------|
| C1 | Phase 1, Phase 5 | `workspace` loader/watch/restore/context surface를 awaitable + grouped surface로 정리 |
| C2 | Phase 2, Phase 6 | file tree, clipboard, delete contract, comment schema/UX를 실패 구분 가능한 상태로 정리 |
| C3 | Phase 2, Phase 3, Phase 5 | local/remote backend safety, atomic write, diagnostics, error semantics 정리 |
| C4 | Phase 4 | editor/highlighter/resource lifecycle와 viewer helper canonicalization |
| C5 | Phase 6 | active heading, precise jump, scroll restore, marker detail, export reset, organization, guarded swipe |
| C6 | Phase 3, Phase 4, Phase 5, Phase 7 | backend typing, language map, context surface, naming drift, helper canonical source 정리 |
| I1 | Phase 1~7 | `activeWorkspaceId` 및 workspace root boundary 유지 |
| I2 | Phase 4, Phase 6 | exact source offset + line fallback, viewer navigation 회귀 방지 |
| I3 | Phase 2, Phase 6 | comment/global-comments backward compatibility 유지 |
| I4 | Phase 1~7 | phase별 focused test + `npm test` + `npm run lint` evidence 남김 |

## Implementation Phases

| Phase | Goal | Primary Tasks | Dependencies |
|-------|------|---------------|-------------|
| 1 | Workspace async/state stabilization | T1-1, T1-2, T1-3 | 없음 |
| 2 | Tree / clipboard / comment safety | T2-1, T2-2, T2-3 | Phase 1 |
| 3 | Backend hardening | T3-1, T3-2, T3-3 | Phase 2 |
| 4 | Viewer lifecycle / shared utility cleanup | T4-1, T4-2, T4-3 | Phase 3 |
| 5 | Backend abstraction / type normalization | T5-1, T5-2, T5-3 | Phase 4 |
| 6 | User-visible backlog completion | T6-1, T6-2, T6-3, T6-4 | Phase 5 |
| 7 | Coverage / naming / final polish | T7-1, T7-2 | Phase 6 |

## Phase 1: Workspace Async / State Stabilization

**Goal**: `workspace` 문서 로딩, watch subscription, snapshot restore, close teardown을 호출자 관찰 가능한 async 경로로 재정리한다.

**Task Set / Dependency Closure**:
- T1-1 awaitable tracked loader
- T1-2 watcher lifecycle + close teardown explicitization
- T1-3 parallel snapshot restore + restore failure surfacing

**Validation Focus**:
- `src/workspace/use-workspace-file-operations.test.ts`
- `src/workspace/use-workspace-watcher.test.ts`
- `src/workspace/use-workspace-snapshot.test.ts`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] `loadWorkspaceSpec`/`loadWorkspaceFile`에서 `void (async () => {})()`가 제거된다.
- [ ] watcher 구독이 effect 재실행과 독립적으로 유지되고 cleanup failure가 무음으로 사라지지 않는다.
- [ ] snapshot restore가 workspace 단위 병렬 실행을 사용하고 partial failure를 표면화한다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: None. `critical/high/medium`은 모두 exit blocker다.

**Task Ownership**:
- T1-1 Target Files:
  - `src/workspace/use-workspace-file-operations.ts`
  - `src/workspace/ipc-call-helper.ts`
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/use-workspace-file-operations.test.ts`
- T1-2 Target Files:
  - `src/workspace/use-workspace-watcher.ts`
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/use-workspace-remote.ts`
  - `src/workspace/use-workspace-watcher.test.ts`
- T1-3 Target Files:
  - `src/workspace/use-workspace-snapshot.ts`
  - `src/workspace/workspace-persistence.ts`
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/use-workspace-snapshot.test.ts`

## Phase 2: Tree / Clipboard / Comment Safety

**Goal**: file tree search, clipboard paste, delete contract, comment schema parsing의 failure surface를 분리하고 boundary policy를 명시한다.

**Task Set / Dependency Closure**:
- T2-1 search failure/empty/partial state 분리
- T2-2 clipboard boundary aware paste
- T2-3 delete confirmation contract + comment schema parsing hardening

**Validation Focus**:
- `src/file-tree/file-tree-panel.test.tsx`
- `electron/file-clipboard.test.ts`
- `src/code-comments/comment-persistence.test.ts`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] workspace 전환 후 stale search response가 새 결과를 오염시키지 않는다.
- [ ] search failure와 empty result가 별도 UI state로 구분된다.
- [ ] internal/finder clipboard paste의 workspace boundary 정책이 코드와 테스트에 고정된다.
- [ ] invalid numeric comment fields가 explicit skip 또는 error로 처리된다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: None.

**Task Ownership**:
- T2-1 Target Files:
  - `src/file-tree/file-tree-panel.tsx`
  - `src/file-tree/file-tree-panel.test.tsx`
- T2-2 Target Files:
  - `electron/file-clipboard.ts`
  - `electron/file-clipboard.test.ts`
  - `electron/workspace-backend/copy-entries.ts`
- T2-3 Target Files:
  - `src/file-tree/file-tree-panel.tsx`
  - `src/file-tree/file-tree-panel.test.tsx`
  - `src/App.tsx`
  - `src/code-comments/comment-persistence.ts`
  - `src/code-comments/comment-persistence.test.ts`

## Phase 3: Backend Hardening

**Goal**: local/remote backend safety 규칙을 일관화하고 diagnostics 및 error semantics를 명확히 한다.

**Task Set / Dependency Closure**:
- T3-1 atomic write/path/schema helper canonicalization
- T3-2 remote connection diagnostics + listener lifecycle
- T3-3 system-open hardening + remote method error semantics

**Validation Focus**:
- `electron/workspace-ipc-handlers.test.ts`
- `electron/remote-agent/runtime/workspace-ops.test.ts`
- `electron/remote-agent/connection-service.test.ts`
- `electron/workspace-backend/remote-workspace-backend.test.ts`
- `electron/system-open.test.ts`
- `electron/remote-agent/runtime/request-router.test.ts`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] atomic write가 rename failure 시 cleanup을 보장하고 temp filename hardening을 적용한다.
- [ ] comments JSON이 최소 schema 검증을 수행한다.
- [ ] reconnect 중 listener가 조기 삭제되지 않고 diagnostics가 debug 가능하게 남는다.
- [ ] method-not-allowed error가 `PATH_DENIED`와 분리된다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: None.

**Task Ownership**:
- T3-1 Target Files:
  - `electron/workspace-utils.ts`
  - `electron/workspace-ipc-handlers.ts`
  - `electron/workspace-path.ts`
  - `electron/remote-agent/runtime/workspace-ops.ts`
  - `electron/remote-agent/runtime/workspace-ops.test.ts`
  - `electron/workspace-ipc-handlers.test.ts`
- T3-2 Target Files:
  - `electron/remote-agent/connection-service.ts`
  - `electron/remote-agent/connection-service.test.ts`
  - `electron/workspace-backend/remote-workspace-backend.ts`
  - `electron/workspace-backend/remote-workspace-backend.test.ts`
- T3-3 Target Files:
  - `electron/system-open.ts`
  - `electron/system-open.test.ts`
  - `electron/remote-agent/security.ts`
  - `electron/remote-agent/runtime/request-router.ts`
  - `electron/remote-agent/runtime/request-router.test.ts`

## Phase 4: Viewer Lifecycle / Shared Utility Cleanup

**Goal**: editor/highlighter lifecycle을 과민 재생성 없이 정리하고 shared helper를 canonical source로 수렴한다.

**Task Set / Dependency Closure**:
- T4-1 EditorView lifecycle + canonical language map
- T4-2 highlighter disposal + HighlightedCodeBlock async cleanup
- T4-3 repeated viewer/tree helper canonicalization

**Validation Focus**:
- `src/code-editor/code-editor-panel.test.tsx`
- `src/code-viewer/language-map.test.ts`
- `src/code-viewer/syntax-highlight.test.ts`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/spec-viewer/highlighted-code-block.test.tsx`
- `src/file-tree/file-tree-panel.test.tsx`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] `showEditor` 토글만으로 EditorView가 불필요하게 파괴/재생성되지 않는다.
- [ ] display language와 syntax highlight language가 동일한 canonical map을 참조한다.
- [ ] obsolete highlight result가 안전하게 무시되거나 취소된다.
- [ ] repeated block builder / git badge logic이 canonical helper/component로 수렴한다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: None.

**Task Ownership**:
- T4-1 Target Files:
  - `src/code-editor/code-editor-panel.tsx`
  - `src/code-editor/code-editor-panel.test.tsx`
  - `src/code-viewer/language-map.ts`
  - `src/code-viewer/language-map.test.ts`
  - `src/code-editor/cm6-language-map.ts`
- T4-2 Target Files:
  - `src/code-viewer/syntax-highlight.ts`
  - `src/code-viewer/syntax-highlight.test.ts`
  - `src/spec-viewer/highlighted-code-block.tsx`
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/spec-viewer/spec-viewer-panel.test.tsx`
  - `src/spec-viewer/highlighted-code-block.test.tsx`
- T4-3 Target Files:
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/spec-viewer/spec-viewer-helpers.ts`
  - `src/file-tree/git-status-badge.tsx`
  - `src/file-tree/file-tree-panel.tsx`
  - `src/file-tree/file-tree-panel.test.tsx`

## Phase 5: Backend Abstraction / Type Normalization

**Goal**: backend dispatch/type surface와 context surface를 grouped, typed, reusable contract로 정리한다.

**Task Set / Dependency Closure**:
- T5-1 RemoteWorkspaceBackend table-driven request map
- T5-2 typed WorkspaceBackend/local backend handlers
- T5-3 grouped WorkspaceContext surface

**Validation Focus**:
- `electron/workspace-backend/remote-workspace-backend.test.ts`
- `electron/workspace-backend/backend-router.test.ts`
- `electron/workspace-backend/local-workspace-backend.test.ts`
- `src/App.test.tsx`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] remote backend request forwarding이 table-driven 또는 동등한 canonical helper를 사용한다.
- [ ] 주요 backend 메서드 반환형이 `Promise<unknown>`보다 구체화된다.
- [ ] `WorkspaceContext` surface가 `state/actions/remote` 등 의미 단위로 묶인다.
- [ ] App과 소비자 코드가 compatibility regression 없이 동작한다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: grouped context surface가 과도하게 번질 경우 compatibility wrapper를 유지한 내부 구조 정리까지만 허용한다. 다만 `medium` 이상 finding은 blocker다.

**Task Ownership**:
- T5-1 Target Files:
  - `electron/workspace-backend/remote-workspace-backend.ts`
  - `electron/workspace-backend/remote-workspace-backend.test.ts`
- T5-2 Target Files:
  - `electron/workspace-backend/types.ts`
  - `electron/workspace-backend/local-workspace-backend.ts`
  - `electron/workspace-ipc-routing.ts`
  - `electron/workspace-backend/backend-router.test.ts`
  - `electron/workspace-backend/local-workspace-backend.test.ts`
- T5-3 Target Files:
  - `src/workspace/workspace-context-types.ts`
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/use-workspace.ts`
  - `src/App.tsx`
  - `src/App.test.tsx`

## Phase 6: User-visible Backlog Completion

**Goal**: partial implementation이 이미 있는 navigation/history/comment/export backlog를 실제 ship 가능한 상태로 닫는다.

**Task Set / Dependency Closure**:
- T6-1 active heading + precise heading jump + app-restart spec scroll restore
- T6-2 comment relocation heuristic + marker detail UI
- T6-3 export reset + global comments organization/history
- T6-4 watcher tuning + guarded trackpad swipe UX

**Validation Focus**:
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/code-comments/comment-anchor.test.ts`
- `src/code-comments/comment-export.test.ts`
- `src/code-comments/global-comments-modal.test.tsx`
- `src/App.test.tsx`
- `electron/workspace-watch-mode.test.ts`
- `npm test`
- `npm run lint`
- `npm run dev` 기반 Electron smoke는 가능할 때 수행하고, 불가 시 manual gap을 보고서에 남긴다.

**Exit Criteria**:
- [ ] rendered spec에서 active heading state가 갱신된다.
- [ ] hash-only heading jump가 best-effort line fallback보다 정밀하게 동작한다.
- [ ] spec scroll position이 앱 재시작 후 복원된다.
- [ ] marker detail UI, export reset, global comments organization이 기존 export/persistence와 호환된다.
- [ ] swipe history는 지원 환경에서만 동작하고 그렇지 않으면 안전하게 no-op/degrade 한다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: `comment relocation` 또는 `global comments history`가 schema migration 급으로 커지면 해당 subtask만 deferred candidate로 기록할 수 있다. 단, 실제 carry-over는 `low` 이하이면서 기존 기능 회귀가 없을 때만 허용한다.

**Task Ownership**:
- T6-1 Target Files:
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/spec-viewer/spec-viewer-scroll.ts`
  - `src/spec-viewer/spec-link-utils.ts`
  - `src/workspace/workspace-persistence.ts`
  - `src/App.tsx`
  - `src/spec-viewer/spec-viewer-panel.test.tsx`
- T6-2 Target Files:
  - `src/code-comments/comment-anchor.ts`
  - `src/code-comments/comment-line-index.ts`
  - `src/code-comments/comment-hover-popover.tsx`
  - `src/code-comments/comment-marker-detail-panel.tsx`
  - `src/code-comments/comment-list-modal.tsx`
  - `src/App.tsx`
  - `src/code-comments/comment-anchor.test.ts`
  - `src/code-comments/comment-marker-detail-panel.test.tsx`
- T6-3 Target Files:
  - `src/code-comments/comment-export.ts`
  - `src/code-comments/export-comments-modal.tsx`
  - `src/code-comments/global-comments-modal.tsx`
  - `src/code-comments/comment-persistence.ts`
  - `src/code-comments/global-comments-history.ts`
  - `src/code-comments/comment-export.test.ts`
  - `src/code-comments/global-comments-modal.test.tsx`
- T6-4 Target Files:
  - `src/hooks/use-history-navigation.ts`
  - `src/App.tsx`
  - `src/workspace/use-workspace-watcher.ts`
  - `electron/workspace-watch-mode.ts`
  - `src/App.test.tsx`
  - `electron/workspace-watch-mode.test.ts`

## Phase 7: Coverage / Naming / Final Polish

**Goal**: 새로 도입한 helper/hook/component의 blind spot을 메우고 low-risk cleanup으로 마감한다.

**Task Set / Dependency Closure**:
- T7-1 focused regression coverage expansion
- T7-2 low-risk naming / dead-code / compatibility cleanup

**Validation Focus**:
- `electron/workspace-ipc-handlers.test.ts`
- `electron/file-clipboard.test.ts`
- `src/workspace/use-workspace-file-operations.test.ts`
- `src/workspace/use-workspace-watcher.test.ts`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/code-comments/comment-hover-popover.test.tsx`
- `npm test`
- `npm run lint`
- final integration review

**Exit Criteria**:
- [ ] phase 1~6에서 추가된 helper/hook/component에 focused tests가 보강된다.
- [ ] low-risk naming/dead-code cleanup이 behavior regression 없이 반영된다.
- [ ] final integration review에서 `critical = 0 AND high = 0 AND medium = 0`를 만족한다.
- [ ] final `npm test`와 `npm run lint`가 통과한다.

**Carry-over Policy**: None.

**Task Ownership**:
- T7-1 Target Files:
  - `electron/workspace-ipc-handlers.test.ts`
  - `electron/file-clipboard.test.ts`
  - `src/workspace/use-workspace-file-operations.test.ts`
  - `src/workspace/use-workspace-watcher.test.ts`
  - `src/code-comments/comment-hover-popover.test.tsx`
  - `src/spec-viewer/spec-viewer-panel.test.tsx`
- T7-2 Target Files:
  - `electron/workspace-path.ts`
  - `src/code-editor/code-editor-panel.tsx`
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/workspace/workspace-model.ts`
  - `src/workspace/workspace-context.tsx`
  - `src/App.test.tsx`

## Parallel Execution Summary

- 기본 정책은 phase 단위 순차 실행이다.
- Phase 2에서는 `T2-1`과 `T2-2`가 write set 기준 병렬 후보지만, `T2-3`이 `file-tree-panel.tsx`와 `App.tsx`를 함께 건드리므로 `T2-1` 이후가 안전하다.
- Phase 4에서는 `T4-1`과 `T4-2`가 비교적 분리되지만 `spec-viewer-panel.tsx`를 공유하므로 parent integration이 필요하다.
- Phase 6에서는 `T6-1`, `T6-2/T6-3`, `T6-4`가 비교적 독립적이다. 다만 `App.tsx` orchestration과 persistence 영향이 있어 phase 내부 병렬은 bounded merge 전제로만 허용한다.
- review-fix loop는 병렬 실행 후에도 phase 단위로 하나의 completion gate로 닫는다.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Phase 1이 예상보다 넓어져 이후 phase 일정이 밀림 | 전체 pipeline 지연 | loader/watcher/snapshot에 필요한 테스트 파일을 먼저 고정하고 helper boundary부터 줄여 들어간다 |
| Phase 5 grouped context surface가 App 소비 코드를 크게 흔듦 | regressions 증가 | compatibility wrapper를 유지하고 public surface 변경은 최소화한다 |
| Phase 6 일부 backlog가 이미 부분 구현되어 재작업 범위가 섞임 | 중복 작업 | implementation 시작 전에 task별 still-missing delta를 먼저 체크하고 plan 대비 diff만 구현한다 |
| Electron manual smoke를 CLI에서 완전 검증하기 어려움 | UI backlog 검증 구멍 | 자동 게이트를 우선 통과시키고, `npm run dev` 실행 가능 여부와 수동 확인 필요 항목을 보고서에 명시한다 |

## Open Questions

1. `global comments history`를 별도 metadata file로 둘지, 기존 persistence에 additive metadata로 둘지 implementation 중 좁혀야 한다.
2. `comment relocation`이 heuristic 수준으로 충분한지, stale anchor 명시 UI가 필요한지 final design 선택이 남아 있다.
3. spec scroll restore는 per-workspace/per-file만으로 충분한지, 탭별 구분까지 필요한지 Phase 6 시작 시 확정해야 한다.
4. swipe history는 macOS 중심 guarded ship으로 둘 가능성이 높다. 다른 플랫폼의 no-op contract를 spec sync 시 어떻게 기록할지 결정이 필요하다.
