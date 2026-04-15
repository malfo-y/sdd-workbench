# Implementation Plan: Pre-split Review Status Audit Remediation

**날짜**: 2026-04-15
**기반 문서**:
- `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`
- `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`
- `_sdd/spec/main.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/workspace-and-file-tree/overview.md`
- `_sdd/spec/workspace-and-file-tree/contracts.md`
- `_sdd/spec/code-editor/overview.md`
- `_sdd/spec/code-editor/contracts.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `_sdd/spec/comments-and-export/overview.md`
- `_sdd/spec/comments-and-export/contracts.md`
- `_sdd/spec/remote-workspace/overview.md`
- `_sdd/spec/remote-workspace/contracts.md`
- `_sdd/spec/appearance-and-navigation/overview.md`
- `_sdd/spec/appearance-and-navigation/contracts.md`

**Planning mode**: `feature_draft` 이후 expanded `implementation-plan`. 감사 문서 전체를 phase/task 수준 execution backlog로 고정한다.

## Overview

이 계획은 감사 문서의 `Open`/`Partial` 항목 전체를 6개 phase로 나눠 순차 실행한다. 현재 커밋 기준 worktree는 clean checkpoint 상태이므로, 이제부터의 수정은 audit remediation 전용 delta로 취급할 수 있다.

핵심 전략은 다음과 같다.

1. foundation surface를 먼저 닫아 이후 viewer/backend phase의 회귀 위험을 낮춘다.
2. giant component split는 무리한 wholesale rewrite보다 helper extraction + contract normalization을 우선한다.
3. 각 phase는 audit finding mapping을 명시하고, phase 직후 `implementation_review` findings-first gate를 강제한다.

## Current-State Refresh

- checkpoint commit `a6e616e` 이후 clean baseline에서 시작한다.
- prior remediation 결과 덕분에 `workspace`, `comments`, `remote`, `viewer` 영역은 이미 상당 부분 개선되어 있다.
- 아직 감사 문서상 열려 있는 주된 부채는 다음과 같다.
  - giant component 및 giant runtime file 잔존
  - unsafe cast / duplicated helper / ambiguous naming
  - 일부 diagnostics visibility / placeholder / fallback UX
  - comments/export 및 path handling의 low-level canonicalization 부족

## Scope

### In Scope

- audit 문서의 `Open`/`Partial` finding 전체
- foundation / comments / viewer / electron main / remote runtime / final audit sweep
- phase별 focused tests, repo gate, `npm run dev` boot 시도
- `_sdd/implementation/*`, `_sdd/pipeline/*` 산출물 갱신

### Out of Scope

- `_sdd/spec/` 직접 수정
- audit와 무관한 신규 기능 추가
- unrelated non-audit refactor
- history rewrite

## Components

| Component | 주요 코드 | 이번 계획에서의 역할 |
|-----------|----------|----------------------|
| Foundation / Workspace / App | `src/App.tsx`, `src/workspace/*`, `src/file-tree/*` | foundation flow, stale closure, banner, compatibility, path UX |
| Comments / Export | `src/code-comments/*`, `src/hooks/use-comment-actions.ts` | parser, modal, export, anchor, shared keydown/scan logic |
| Viewer | `src/code-editor/*`, `src/code-viewer/*`, `src/spec-viewer/*` | panel split, lifecycle, canonical metadata, placeholder/debug cleanup |
| Electron Main / Local Backend | `electron/workspace-*`, `electron/system-open.ts`, `electron/file-clipboard.ts` | typed surface, path guard naming, boilerplate/diagnostics cleanup |
| Remote Agent / Remote Backend | `electron/remote-agent/*`, `electron/workspace-backend/remote-workspace-backend.ts` | runtime split, cast reduction, install/browse/error semantics |
| Verification | `src/**/*.test.ts(x)`, `electron/**/*.test.ts` | phase evidence, blind-spot coverage, audit closure |

## Contract/Invariant Delta Coverage

| Delta | Covered By | Notes |
|-------|------------|-------|
| C1 | Phase 1~6 | finding traceability, audit rerun readiness |
| C2 | Phase 1 | workspace/app/file-tree foundation cleanup |
| C3 | Phase 2 | comments/export canonicalization |
| C4 | Phase 3 | viewer lifecycle and helper cleanup |
| C5 | Phase 4 | electron main/local backend hardening |
| C6 | Phase 5 | remote runtime/backend hardening |
| I1 | Phase 1~6 | unrelated existing behavior 보호 |
| I2 | Phase 1~6 | phase별 closure/deferred 판정 가능 상태 유지 |
| I3 | Phase 1~6 | review-fix findings-first gate |
| I4 | Phase 1~6 | Node version drift와 테스트 evidence 보고 |

## Implementation Phases

| Phase | Goal | Primary Tasks | Dependencies |
|------|------|---------------|-------------|
| 1 | Foundation surface reconciliation | T1-1, T1-2, T1-3 | 없음 |
| 2 | Comment/export structural cleanup | T2-1, T2-2, T2-3 | Phase 1 |
| 3 | Viewer lifecycle and naming cleanup | T3-1, T3-2, T3-3 | Phase 2 |
| 4 | Electron main/local backend hardening | T4-1, T4-2, T4-3 | Phase 3 |
| 5 | Remote runtime/backend hardening | T5-1, T5-2, T5-3 | Phase 4 |
| 6 | Final sweep and audit revalidation | T6-1, T6-2 | Phase 5 |

## Phase 1: Foundation Surface Reconciliation

**Goal**: `App`, `workspace`, `file-tree`, `clipboard/path` 영역의 still-open foundation debt를 정리하고 사용자 흐름의 정합성을 높인다.

**Task Set / Dependency Closure**:
- T1-1 workspace/app compatibility, banner, open flow 정리
- T1-2 file tree giant component helper extraction + path handling cleanup
- T1-3 clipboard/path edge-case hardening and naming follow-up

**Validation Focus**:
- `npm test -- src/App.test.tsx src/file-tree/file-tree-panel.test.tsx src/workspace/workspace-persistence.test.ts`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] `workspace.md`의 F13, F15, F16, F17, F20, F23, F24가 코드/테스트 또는 justified closure 상태로 정리된다.
- [ ] `file-tree.md`의 F1, F3, F4, F5, F8, F10, F11, F12가 helper extraction 또는 contract 정리로 완화된다.
- [ ] `app-shell-and-backend.md`의 F2, F9, F14가 current code 기준으로 닫힌다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: None.

**Task Ownership**:
- T1-1 Target Files:
  - `src/App.tsx`
  - `src/app-shell-utils.ts`
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/workspace-context-types.ts`
  - `src/workspace/workspace-persistence.ts`
  - `src/workspace/workspace-model.ts`
  - `src/workspace/remote-connect-modal.tsx`
  - `src/App.test.tsx`
  - `src/workspace/workspace-persistence.test.ts`
- T1-2 Target Files:
  - `src/file-tree/file-tree-panel.tsx`
  - `src/file-tree/git-status-badge.tsx`
  - `src/file-tree/file-tree-panel.test.tsx`
- T1-3 Target Files:
  - `electron/file-clipboard.ts`
  - `electron/file-clipboard.test.ts`
  - `electron/workspace-backend/copy-entries.ts`

**Finding Mapping**:
- `app-shell-and-backend`: F2, F9, F14
- `workspace`: F13, F15, F16, F17, F20, F21, F23, F24
- `file-tree`: F1, F3, F4, F5, F8, F10, F11, F12

## Phase 2: Comment / Export Structural Cleanup

**Goal**: comments/export domain의 parser safety, modal dedup, list/detail 구조, scan 로직을 canonical helper 기준으로 정리한다.

**Task Set / Dependency Closure**:
- T2-1 parser/anchor/hash safety 정리
- T2-2 modal/list/detail shared helper 정리
- T2-3 selection-range scan / rendered mapping canonicalization

**Validation Focus**:
- `npm test -- src/code-comments/comment-anchor.test.ts src/code-comments/comment-persistence.test.ts src/code-comments/comment-export.test.ts src/code-comments/comment-hover-popover.test.tsx src/code-comments/comment-marker-detail-panel.test.tsx src/code-comments/global-comments-modal.test.tsx`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] `code-comments.md` F3, F4, F6, F8, F10이 canonical helper 또는 safer parser 기준으로 정리된다.
- [ ] giant list modal(F7) 축소 또는 분할 전략이 실제 코드 구조에 반영된다.
- [ ] hash/anchor 처리(F5)는 backward compatibility를 해치지 않는 방식으로 정리되거나 explicit deferred 근거가 남는다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: None.

**Task Ownership**:
- T2-1 Target Files:
  - `src/code-comments/comment-persistence.ts`
  - `src/code-comments/comment-anchor.ts`
  - `src/code-comments/comment-persistence.test.ts`
  - `src/code-comments/comment-anchor.test.ts`
- T2-2 Target Files:
  - `src/code-comments/comment-list-modal.tsx`
  - `src/code-comments/comment-editor-modal.tsx`
  - `src/code-comments/global-comments-modal.tsx`
  - `src/code-comments/export-comments-modal.tsx`
  - `src/code-comments/comment-hover-popover.tsx`
  - `src/code-comments/comment-marker-detail-panel.tsx`
  - related modal tests
- T2-3 Target Files:
  - `src/code-comments/comment-line-index.ts`
  - `src/code-comments/comment-export.ts`
  - `src/hooks/use-comment-actions.ts`
  - comment-line/export related tests

**Finding Mapping**:
- `code-comments`: F3, F4, F5, F6, F7, F8, F10

## Phase 3: Viewer Lifecycle And Naming Cleanup

**Goal**: code editor/spec viewer giant panel과 lifecycle/helper drift를 정리하고 naming/placeholder/debug visibility를 개선한다.

**Task Set / Dependency Closure**:
- T3-1 code editor panel split + canonical language metadata
- T3-2 spec viewer helper/panel split + async visibility cleanup
- T3-3 naming drift / placeholder / safety follow-up

**Validation Focus**:
- `npm test -- src/code-editor/code-editor-panel.test.tsx src/code-viewer/language-map.test.ts src/code-viewer/syntax-highlight.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/spec-viewer/highlighted-code-block.test.tsx src/spec-viewer/spec-link-utils.test.ts`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] `code-editor.md` F4, F5, F6, F8, F9, F11, F12, F13, F14가 code 구조와 tests 기준으로 정리된다.
- [ ] `spec-viewer.md` F1, F2, F8, F9, F12, F17, F18, F19가 helper extraction/visibility cleanup으로 완화된다.
- [ ] `dangerouslySetInnerHTML`와 `DATA_IMAGE_URI_PATTERN` 등 security-adjacent 항목은 current architecture 내에서 justified 상태가 되거나 safer wrapper가 도입된다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: None.

**Task Ownership**:
- T3-1 Target Files:
  - `src/code-editor/code-editor-panel.tsx`
  - `src/code-viewer/language-map.ts`
  - `src/code-viewer/syntax-highlight.ts`
  - related tests
- T3-2 Target Files:
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/spec-viewer/highlighted-code-block.tsx`
  - `src/spec-viewer/spec-viewer-scroll.ts`
  - `src/spec-viewer/spec-link-utils.ts`
  - related tests
- T3-3 Target Files:
  - viewer-related CSS/test ids/helper modules touched by above changes

**Finding Mapping**:
- `code-editor`: F4, F5, F6, F8, F9, F11, F12, F13, F14
- `spec-viewer`: F1, F2, F7, F8, F9, F11, F12, F14, F15, F16, F17, F18, F19

## Phase 4: Electron Main / Local Backend Hardening

**Goal**: electron main/local backend 영역의 unsafe event stub, path guard naming, diagnostics visibility, backend typing/boilerplate를 정리한다.

**Task Set / Dependency Closure**:
- T4-1 IPC routing and path helper naming 정리
- T4-2 local backend typing/boilerplate reduction
- T4-3 diagnostics visibility and git status helper cleanup

**Validation Focus**:
- `npm test -- electron/workspace-ipc-routing.test.ts electron/workspace-ipc-handlers.test.ts electron/workspace-backend/backend-router.test.ts electron/workspace-backend/local-workspace-backend.test.ts electron/system-open.test.ts`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] `electron-main.md` F6, F9, F13, F14, F16이 current architecture 기준으로 정리된다.
- [ ] `app-shell-and-backend.md` F10이 중복 타입 제거 또는 canonical type alias 정리로 닫힌다.
- [ ] `electron-main.md` F11은 direct-test 필요성까지 포함해 closure 판정이 가능해야 한다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: None.

**Task Ownership**:
- T4-1 Target Files:
  - `electron/workspace-ipc-routing.ts`
  - `electron/workspace-ipc-handlers.ts`
  - `electron/workspace-path.ts`
  - `electron/workspace-ipc-routing.test.ts`
  - `electron/workspace-ipc-handlers.test.ts`
- T4-2 Target Files:
  - `electron/workspace-backend/types.ts`
  - `electron/workspace-backend/local-workspace-backend.ts`
  - `electron/workspace-backend/local-workspace-backend.test.ts`
- T4-3 Target Files:
  - `electron/system-open.ts`
  - `electron/system-open.test.ts`
  - git status and logging related electron modules

**Finding Mapping**:
- `electron-main`: F6, F9, F11, F13, F14, F16
- `app-shell-and-backend`: F10

## Phase 5: Remote Runtime / Backend Hardening

**Goal**: remote agent/runtime/backend의 giant file, unsafe cast, install payload, error parsing, diagnostics/context loss를 줄인다.

**Task Set / Dependency Closure**:
- T5-1 remote backend request/context cleanup
- T5-2 runtime workspace ops split and cast reduction
- T5-3 install/browse/error helper cleanup and test reinforcement

**Validation Focus**:
- `npm test -- electron/remote-agent/connection-service.test.ts electron/remote-agent/protocol.test.ts electron/remote-agent/runtime/request-router.test.ts electron/remote-agent/runtime/workspace-ops.test.ts electron/workspace-backend/remote-workspace-backend.test.ts electron/workspace-watchers.test.ts`
- `npm test`
- `npm run lint`

**Exit Criteria**:
- [ ] `app-shell-and-backend.md` F4, F5, F6가 remote backend 중복/맥락 손실 측면에서 정리된다.
- [ ] `remote-agent.md` F2, F9, F10, F11, F15, F16, F17, F18이 helper split / cast reduction / coverage 보강으로 완화된다.
- [ ] giant runtime file는 wholesale rewrite가 아니라도 ownership boundaries가 줄었다는 코드 근거가 있어야 한다.
- [ ] focused tests, `npm test`, `npm run lint`가 모두 통과한다.

**Carry-over Policy**: None.

**Task Ownership**:
- T5-1 Target Files:
  - `electron/workspace-backend/remote-workspace-backend.ts`
  - `electron/workspace-backend/remote-watch-bridge.ts`
  - `electron/workspace-backend/remote-git-bridge.ts`
  - `electron/workspace-backend/remote-workspace-backend.test.ts`
- T5-2 Target Files:
  - `electron/remote-agent/runtime/workspace-ops.ts`
  - `electron/remote-agent/runtime/request-router.ts`
  - related runtime tests
- T5-3 Target Files:
  - `electron/remote-agent/directory-browser.ts`
  - `electron/remote-agent/transport-ssh.ts`
  - `electron/remote-agent/connection-service.ts`
  - `electron/remote-agent/security.ts`
  - related tests

**Finding Mapping**:
- `app-shell-and-backend`: F4, F5, F6
- `remote-agent`: F2, F9, F10, F11, F15, F16, F17, F18

## Phase 6: Final Sweep / Audit Revalidation

**Goal**: 남은 low-level cleanup, cross-phase naming drift, direct audit closure 증거를 정리하고 final integration review 준비를 마친다.

**Task Set / Dependency Closure**:
- T6-1 residual low-level cleanup and blind-spot tests
- T6-2 audit rerun summary and closure evidence consolidation

**Validation Focus**:
- phase leftovers에 맞는 focused tests
- `npm test`
- `npm run lint`
- `npm run dev`

**Exit Criteria**:
- [ ] 각 audit section의 `Open`/`Partial` finding이 `closed` 또는 explicit deferred 근거와 함께 재판정 가능하다.
- [ ] final integration review에 제출할 progress/report가 준비된다.
- [ ] `npm test`, `npm run lint`, `npm run dev` boot 결과가 기록된다.

**Carry-over Policy**: None.

**Task Ownership**:
- T6-1 Target Files:
  - phase 1~5에서 남은 low-risk helper/test files
- T6-2 Target Files:
  - `_sdd/implementation/2026-04-15_implementation_progress_pre_split_review_status_audit_remediation.md`
  - `_sdd/implementation/2026-04-15_implementation_report_pre_split_review_status_audit_remediation.md`
  - `_sdd/pipeline/report_pre_split_review_status_audit_remediation_<timestamp>.md`

**Finding Mapping**:
- all sections residuals

## Review-Fix Execution Notes

- 각 phase 직후 `implementation_review`는 반드시 현재 phase finding mapping만 검토한다.
- review 결과는 findings first 형식으로 `critical/high/medium/low`를 명시해야 한다.
- `critical/high/medium`이 있으면 같은 phase 범위에서 즉시 fix -> re-review를 수행한다.
- 다음 phase로 넘어가기 전에 focused tests와 repo gate를 닫는다.

## Risks / Notes

1. giant component와 giant runtime file은 phase 하나에서 전면 분해가 어려울 수 있다. 최소 목표는 ownership boundary와 helper canonicalization을 명확히 만드는 것이다.
2. `hashFnv1a` 변경은 persistence/compatibility 이슈가 있어 implementation 중 세부 판단이 필요하다.
3. Node 25 기준 green 결과는 수집 가능하지만 Node 20 primary runtime 완전 일치 여부는 별도 확인이 필요하다.
