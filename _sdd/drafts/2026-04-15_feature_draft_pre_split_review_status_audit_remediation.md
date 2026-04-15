# Feature Draft: Pre-split Review Status Audit Remediation

<!-- spec-update-todo-input-start -->
# Part 1: Temporary Spec Draft

## Change Summary

`_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`를 canonical backlog로 삼아, 감사 시점에 `Open` 또는 `Partial`로 남아 있는 항목을 phase-gated remediation pipeline으로 정리한다.

이번 delta는 기존 `post_split_remaining_issues` remediation을 폐기하는 것이 아니라 상위 집계 문서로 재해석하는 작업이다. 이미 worktree에 존재하는 대규모 dirty diff와 prior remediation 산출물은 "부분 구현 또는 사전 정리"로 취급하고, 실제 execution에서는 그 위에 still-open delta만 보강한다.

핵심 방향은 다음과 같다.

1. 먼저 app shell / workspace / file tree / comments처럼 사용자 흐름과 상태 정합성에 직접 영향을 주는 foundation debt를 정리한다.
2. 그 다음 code editor / spec viewer / electron main / backend abstraction / remote agent에 남은 구조적 debt를 줄인다.
3. 마지막으로 naming drift, unsafe cast, helper duplication, 테스트 blind spot 같은 cross-cutting cleanup을 닫고 감사 문서 기준으로 재검증한다.

## Scope Delta

### In Scope

- `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`의 `Open` 50건 + `Partial` 21건
- `app-shell-and-backend.md`:
  - Finder source paste hardening
  - local/remote workspace backend boilerplate 및 타입 중복 축소
  - App shell stale-closure / 분해 후속 정리
  - local-only copy helper naming 정리
- `workspace.md` / `file-tree.md`:
  - watcher / banner / openWorkspace UX / compatibility naming
  - file-tree huge component 분리, render param 정리, git badge helper 정리
  - 경로 처리 / inline input validation / delete contract / context menu 조립 개선
- `code-comments.md`:
  - unsafe cast 제거
  - empty snippet / hash / list modal / escape key 중복 / line scan 개선
  - shared modal keydown helper 또는 equivalent canonicalization
- `code-editor.md` / `spec-viewer.md`:
  - editor/spec panel further split
  - canonical language metadata
  - highlight lifecycle / async cleanup / helper 중복 / naming drift 정리
  - rendered HTML / placeholder / debug visibility 관련 후속 정리
- `electron-main.md` / `remote-agent.md`:
  - DUMMY IPC event, path guard naming, queueRemoteAgentLog visibility
  - rev-parse 중복, backend handler typing, remote runtime giant file 분리
  - request/result cast, parseErrorCode chain, install script heredoc risk 완화
- 감사 문서 전체를 phase/task/validation으로 연결하는 temporary spec, implementation plan, progress/report/log
- phase별 focused test + `npm test` + `npm run lint` + `npm run dev` boot 시도

### Out of Scope

- `_sdd/spec/` 직접 수정
- 감사 문서에서 이미 `Fixed` 또는 `Info`로 평가된 항목 재작업
- unrelated dirty changes의 revert 또는 history rewrite
- IDE급 신규 기능 확장, LSP, auto-save/auto-format
- audit finding과 무관한 cosmetic refactor

### Guardrail Delta

1. execution은 항상 current dirty worktree를 보존한 채 still-open delta만 보강한다.
2. unrelated user changes는 revert하지 않는다.
3. 각 phase는 `implementation -> implementation_review -> fix -> re-review -> validation` 순서를 강제한다.
4. `critical/high/medium`은 phase exit blocker다.
5. local/remote 차이는 가능한 한 existing `workspace:*` surface 뒤에 숨긴다.
6. comment/global-comments source of truth는 기존 파일 경로를 유지하고 backward-compatible migration만 허용한다.
7. global spec 반영은 구현과 검증 완료 후 `spec_update_done`에만 위임한다.

## Contract/Invariant Delta

| ID | Type | Change | Why |
|----|------|--------|-----|
| C1 | Modify | audit finding은 section별 리뷰 메모가 아니라 phase/task/validation에 연결된 실행 backlog로 관리한다 | 큰 범위를 누락 없이 추적하려면 canonical traceability가 필요해서 |
| C2 | Modify | workspace/app-shell/file-tree 흐름은 stale closure, ambiguous banner, path edge case, large component drift를 줄이는 방향으로 정리한다 | foundation surface의 사용자 혼란과 유지보수 비용을 줄이기 위해 |
| C3 | Modify | comments/export 흐름은 parser, anchor, modal, export semantics를 canonical helper 기준으로 재정렬한다 | 중복 로직과 schema ambiguity를 줄이기 위해 |
| C4 | Modify | code editor/spec viewer는 canonical language metadata, lifecycle cleanup, panel/helper 분해를 강화한다 | giant component와 lifecycle drift를 줄이기 위해 |
| C5 | Modify | electron main/local backend/remote backend는 typed surface, diagnostics, naming, boilerplate를 더 명시적으로 정리한다 | backend error semantics와 디버깅 가시성을 높이기 위해 |
| C6 | Modify | remote agent runtime은 giant file, unsafe cast, helper if-chain, install payload risk를 phase-based로 줄인다 | remote path의 구조적 debt와 런타임 risk를 완화하기 위해 |
| I1 | Add | 모든 phase는 current dirty worktree를 baseline으로 삼고 unrelated diff를 유지해야 한다 | 사용자 작업을 보호하기 위해 |
| I2 | Add | audit finding은 phase 종료 시 `closed`, `deferred with justification`, `still-open blocker` 중 하나로 판정 가능해야 한다 | 최종 audit revalidation을 기계적으로 가능하게 하려면 상태 모델이 필요해서 |
| I3 | Add | `implementation_review`는 각 phase 직후 findings-first 형식으로 호출되고 severity/file-line 근거를 남겨야 한다 | review-fix loop가 추상 규칙이 아니라 실행 단위여야 해서 |
| I4 | Add | 테스트 결과는 Node 25 현재 환경 기준으로 수집하되, `_sdd/env.md`의 Node 20 권장값과의 drift를 보고서에 명시한다 | 환경 차이로 인한 해석 리스크를 숨기지 않기 위해 |

## Touchpoints

| Area | 주요 파일 | 변경 이유 |
|------|-----------|----------|
| App shell / Workspace foundation | `src/App.tsx`, `src/app-shell-utils.ts`, `src/workspace/*`, `src/workspace/remote-connect-modal.tsx` | stale closure, banner, compatibility naming, watcher/openWorkspace UX |
| File tree / Clipboard | `src/file-tree/file-tree-panel.tsx`, `src/file-tree/git-status-badge.tsx`, `electron/file-clipboard.ts`, `electron/workspace-backend/copy-entries.ts` | giant component, path handling, git badge/helper duplication, Finder hardening |
| Comments / Export | `src/code-comments/*`, `src/hooks/use-comment-actions.ts` | parser safety, escape key dedup, export organization, line scan optimization |
| Code editor / Spec viewer | `src/code-editor/*`, `src/code-viewer/*`, `src/spec-viewer/*` | language map, lifecycle cleanup, helper/panel split, placeholder/debug visibility |
| Electron main / Local backend | `electron/workspace-ipc-routing.ts`, `electron/workspace-ipc-handlers.ts`, `electron/workspace-backend/*.ts`, `electron/system-open.ts`, `electron/workspace-utils.ts` | typed surface, DUMMY event, path guard naming, diagnostics, rev-parse duplication |
| Remote agent / Remote backend | `electron/remote-agent/*`, `electron/remote-agent/runtime/*`, `electron/workspace-backend/remote-workspace-backend.ts` | giant runtime file, install payload, cast removal, parseErrorCode cleanup, backend error context |
| Verification | `src/**/*.test.ts(x)`, `electron/**/*.test.ts` | audit finding closure, blind spot coverage, focused phase evidence |

## Implementation Plan

1. **Phase 1 — Foundation Surface Reconciliation**  
   `workspace`, `App`, `file-tree`의 still-open foundation debt를 먼저 정리해 이후 phase의 상태 기반을 안정화한다.

2. **Phase 2 — Comment / Export Structural Cleanup**  
   comments/export domain의 unsafe cast, duplicate escape handling, giant modal/list, selection scan 구조를 정리한다.

3. **Phase 3 — Viewer Lifecycle And Naming Cleanup**  
   code editor / spec viewer giant component와 lifecycle/helper drift를 줄이고 naming/placeholder/debug surface를 정리한다.

4. **Phase 4 — Electron Main / Local Backend Hardening**  
   IPC routing, path helper naming, queue logging visibility, local backend typing/boilerplate를 다듬는다.

5. **Phase 5 — Remote Agent / Remote Backend Hardening**  
   remote runtime giant file, cast, install payload, parseErrorCode chain, backend duplicate logic를 줄인다.

6. **Phase 6 — Final Sweep / Audit Revalidation**  
   cross-cutting low-level cleanup, blind-spot tests, audit 재판정을 마무리하고 spec sync 준비를 한다.

## Validation Plan

| ID | Targets | Verification Method | Evidence / Notes |
|----|---------|---------------------|------------------|
| V1 | C1, C2, I1, I2, I4 | focused tests + repo gate + phase review | workspace/app/file-tree 관련 phase evidence |
| V2 | C1, C3, I2, I3, I4 | comments/export focused tests + review | parser/modal/export semantics 정리 근거 |
| V3 | C4, I2, I3, I4 | editor/spec viewer focused tests + review | lifecycle and helper cleanup 근거 |
| V4 | C5, I1, I3, I4 | electron/local backend focused tests + review | typed surface/diagnostics/path helper 근거 |
| V5 | C6, I1, I3, I4 | remote-focused tests + review | remote runtime/backend hardening 근거 |
| V6 | C1~C6, I1~I4 | full regression + final integration review + audit recheck | 최종 `npm test`, `npm run lint`, `npm run dev` boot, audit status diff |

## Risks / Open Questions

1. 현재 worktree 자체가 큰 dirty diff라, 일부 `Partial` 항목은 이미 사실상 해소됐을 가능성이 있다. phase 착수 전 finding별 delta refresh가 필요하다.
2. giant component split를 audit one-pass에서 모두 끝내려 하면 write set이 과도하게 커질 수 있다. phase boundary를 넘는 대형 분할은 helper extraction + contract stabilization 우선으로 접근해야 한다.
3. `hashFnv1a` 32-bit 교체처럼 데이터 해시 semantics를 건드리는 변경은 backward compatibility 검토가 필요하다.
4. remote install payload heredoc risk는 대체 전송 포맷 또는 escaping 정책을 요구할 수 있어 구현 비용이 클 수 있다.
5. `_sdd/env.md` 기준 primary runtime은 Node 20.x지만 현재 실행 환경은 Node 25.2.1이다. 자동 테스트 green이 곧 문서화된 primary runtime green을 보장하지는 않는다.

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Skeleton

## Overview

이번 skeleton은 audit finding을 6개 phase로 묶고, 각 phase가 어떤 section의 어떤 finding을 닫는지 추적 가능하게 만든다. 실제 상세 task/Target Files/validation gate는 implementation plan에서 확정한다.

## Phase Skeleton

| Phase | Theme | Primary Audit Buckets | Output |
|------|-------|------------------------|--------|
| 1 | Foundation surface reconciliation | `app-shell-and-backend`, `workspace`, `file-tree` | foundation cleanup + focused evidence |
| 2 | Comment/export structural cleanup | `code-comments` | comment/export cleanup + focused evidence |
| 3 | Viewer lifecycle and naming cleanup | `code-editor`, `spec-viewer` | viewer cleanup + focused evidence |
| 4 | Electron main/local backend hardening | `electron-main`, local/backend parts of `app-shell-and-backend` | IPC/backend cleanup + focused evidence |
| 5 | Remote runtime/backend hardening | `remote-agent`, remote/backend parts of `app-shell-and-backend` | remote cleanup + focused evidence |
| 6 | Final sweep and audit revalidation | cross-cutting leftovers from all sections | residual cleanup + audit rerun evidence |

## Finding Traceability Skeleton

### Phase 1
- `app-shell-and-backend`: F2, F9
- `workspace`: F4, F13, F14, F15, F16, F17, F19, F20, F21, F22, F23, F24
- `file-tree`: F1, F3, F4, F5, F8, F9, F10, F11, F12

### Phase 2
- `code-comments`: F3, F4, F5, F6, F7, F8, F10

### Phase 3
- `code-editor`: F4, F5, F6, F8, F9, F11, F12, F13, F14
- `spec-viewer`: F1, F2, F7, F8, F9, F11, F12, F14, F15, F16, F17, F18, F19

### Phase 4
- `electron-main`: F6, F9, F11, F13, F14, F16
- `app-shell-and-backend`: F10, F14

### Phase 5
- `app-shell-and-backend`: F4, F5, F6
- `remote-agent`: F2, F9, F10, F11, F15, F16, F17, F18

### Phase 6
- finding 재판정이 필요한 partial item 전체
- giant component/coverage/naming leftovers
- direct audit rerun and report

## Notes For Implementation Plan

- 각 phase는 반드시 `goal`, `task set / dependency closure`, `validation focus`, `exit criteria`, `carry-over policy`, `Target Files`, `finding mapping`을 가져야 한다.
- `implementation_review`는 phase 직후 즉시 호출되어야 하며 findings-first 형식과 severity/file-line 근거가 필수다.
- unrelated dirty changes는 baseline으로 보존하고, 현재 phase가 실제로 수정한 파일만 focused validation 대상으로 삼는다.
