# Orchestrator: Post-split Remaining Issues Master Remediation

**생성일**: 2026-04-14T23:55:34+0900
**규모**: 대규모 (multi-phase)
**생성자**: autopilot
**기반 draft**: `_sdd/drafts/2026-04-14_feature_draft_post_split_remaining_issues_master_remediation.md`

## 기능 설명

모놀리스 분할 이후 남아 있는 안정화 작업과 user-visible backlog를 하나의 multi-phase remediation pipeline으로 구현한다. 이번 파이프라인은 기존 feature draft를 실행 청사진으로 유지하되, 현재 코드 기준으로 still-open delta만 반영하는 gated implementation plan을 먼저 확정하고, 각 phase마다 review-fix와 repo gate를 닫은 뒤 마지막에 global spec을 동기화한다.

구현의 핵심 축은 다음과 같다.

- `workspace` loader/watch/restore의 async/state 정합성 정리
- file tree / clipboard / comment persistence safety 강화
- Electron local/remote backend hardening과 error semantics 정리
- editor/highlighter lifecycle과 shared helper canonicalization
- typed backend/context surface normalization
- active heading, app-restart spec scroll restore, export reset, marker detail 같은 backlog feature 완료

## Acceptance Criteria

- [ ] AC1: `_sdd/implementation/2026-04-14_implementation_plan_post_split_remaining_issues_master_remediation.md`가 생성되고, phase별 `goal`, `task set / dependency closure`, `validation focus`, `exit criteria`, `carry-over policy`를 모두 포함한다.
- [ ] AC2: Phase 1에서 `workspace` loader/watch/restore 경로의 race/fire-and-forget 패턴이 정리되고 관련 focused test + `npm test` + `npm run lint`가 통과한다.
- [ ] AC3: Phase 2~3에서 file tree/comment/backend safety와 local/remote error semantics가 정리되고 review-fix gate를 통과한다.
- [ ] AC4: Phase 4~5에서 editor/highlighter/backend/context surface drift가 canonical helper/type source로 수렴한다.
- [ ] AC5: Phase 6에서 active heading, precise heading jump, app-restart spec scroll restore, comment/export backlog 중 still-missing delta가 실제로 구현되고 관련 회귀 테스트가 통과한다.
- [ ] AC6: 각 phase 종료 시 `critical = 0 AND high = 0 AND medium = 0`를 만족하고, 마지막 `final integration review`까지 통과한다.
- [ ] AC7: 최종 구현 결과 중 persistent 변화만 `_sdd/spec/`에 반영되고, temporary execution detail은 global spec 본문에 누수되지 않는다.

## Reasoning Trace

- 사용자 요청이 이미 existing feature draft를 명시했으므로 planning entry인 `feature_draft`는 재실행하지 않고, standalone `implementation_plan` 예외로 gated execution plan만 추가한다.
- 현재 코드 탐색상 Phase 1~5의 핵심 technical debt는 여전히 남아 있지만, Phase 6 backlog 일부는 runtime scroll cache / swipe bridge처럼 부분 구현이 있으므로 implementation 전에 delta refresh가 필요하다.
- 범위가 넓고 phase dependency가 깊으므로 `Review-Fix Loop.scope = per-phase`를 사용해야 다음 phase로 안전하게 넘어갈 수 있다.
- repo에 Vitest와 ESLint gate가 이미 충분하고 대부분의 변경이 code/test surface 중심이므로 테스트 전략은 `inline`을 사용한다. 다만 Electron manual smoke는 환경 제약 시 manual gap으로 보고한다.
- 강하게 작동하는 SDD 원칙은 `Spec-first`, `Delta-first`, `Execute -> Verify`, `Review-fix mandatory`, `Global spec direct edit 금지`다.

## Execution Profiles

- `implementation_plan`: `plan_strict` -> `gpt-5.4 / xhigh`
- `implementation`: `impl_default` -> `gpt-5.4 / high`
- `implementation_review`: `review_default` -> `gpt-5.4 / high`
- `final_integration_review`: `review_integration_strict` -> `gpt-5.4 / xhigh`
- `spec_update_done`: `spec_sync_default` -> `gpt-5.4 / medium`

## Pipeline Steps

### Step 1: implementation_plan
**Codex agent_type**: `implementation_plan`
**Execution profile**: `plan_strict` (`gpt-5.4 / xhigh`)
**입력 파일**:
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
- 현재 코드 탐색 결과가 드러나는 핵심 파일:
  - `src/workspace/use-workspace-file-operations.ts`
  - `src/workspace/use-workspace-watcher.ts`
  - `src/workspace/use-workspace-snapshot.ts`
  - `src/file-tree/file-tree-panel.tsx`
  - `src/code-comments/comment-persistence.ts`
  - `electron/file-clipboard.ts`
  - `electron/workspace-utils.ts`
  - `electron/workspace-backend/types.ts`
  - `electron/remote-agent/runtime/request-router.ts`
  - `src/code-editor/code-editor-panel.tsx`
  - `src/hooks/use-history-navigation.ts`
  - `src/spec-viewer/spec-viewer-scroll.ts`
**출력 파일**:
- `_sdd/implementation/2026-04-14_implementation_plan_post_split_remaining_issues_master_remediation.md`

**프롬프트**:
existing feature draft를 기반으로 post-split remaining issues master remediation의 multi-phase implementation plan을 작성하세요.

필수 요구사항:
- 현재 코드 기준 still-open delta와 이미 partial로 구현된 항목을 구분하세요.
- phase는 7개를 유지하되, 각 phase마다 `goal`, `task set / dependency closure`, `validation focus`, `exit criteria`, `carry-over policy`를 반드시 포함하세요.
- task에는 실제 `Target Files`를 포함하고, draft Part 2의 task ID(T1-1 ~ T7-2)를 유지하세요.
- `workspace` async/state, file tree/comment safety, backend hardening, lifecycle cleanup, typed surface, backlog feature, verification 순서를 유지하세요.
- manual Electron verification이 환경상 제한될 수 있음을 plan과 risk에 반영하세요.

### Step 2: implementation
**Codex agent_type**: `implementation`
**Execution profile**: `impl_default` (`gpt-5.4 / high`)
**입력 파일**:
- `_sdd/implementation/2026-04-14_implementation_plan_post_split_remaining_issues_master_remediation.md`
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
**출력 파일**:
- plan에 정의된 phase 소유 코드 및 테스트 파일
- `_sdd/implementation/2026-04-14_implementation_progress_post_split_remaining_issues_master_remediation.md`
- `_sdd/implementation/2026-04-14_implementation_report_post_split_remaining_issues_master_remediation.md`
- phase별 focused validation evidence 파일(필요 시)

**프롬프트**:
implementation plan의 phase를 순서대로 구현하세요.

원칙:
- 각 phase 시작 전에 해당 task의 still-missing delta를 현재 코드 기준으로 재확인하세요.
- 이미 부분 구현된 behavior는 유지하고, 누락된 delta만 보강하세요.
- phase가 끝날 때마다 focused test -> `npm test` -> `npm run lint`를 실행할 수 있는 상태를 남기세요.
- UI backlog가 포함된 phase에서는 `npm run dev` 기반 smoke를 시도하되, 환경상 시각 검증이 불가하면 그 사실과 수동 확인 항목을 기록하세요.

**Exit Gate**:
이 step은 단독 완료가 아니다. implementation plan의 phase boundary에 따라 각 phase 직후 same-scope `Review-Fix Loop`와 required validation을 즉시 닫고, 마지막 `final integration review`를 통과한 뒤에만 Step 3으로 진행한다.

### Step 3: spec_update_done
**Codex agent_type**: `spec_update_done`
**Execution profile**: `spec_sync_default` (`gpt-5.4 / medium`)
**입력 파일**:
- `_sdd/spec/main.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/decision-log.md`
- `_sdd/spec/appendix/backlog-and-risks.md`
- 관련 component `overview.md` / `contracts.md`
- `_sdd/drafts/2026-04-14_feature_draft_post_split_remaining_issues_master_remediation.md`
- `_sdd/implementation/2026-04-14_implementation_plan_post_split_remaining_issues_master_remediation.md`
- `_sdd/implementation/2026-04-14_implementation_report_post_split_remaining_issues_master_remediation.md`
- `_sdd/pipeline/report_post_split_remaining_issues_master_remediation_<timestamp>.md`
**출력 파일**:
- `_sdd/spec/main.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/decision-log.md`
- 관련 component `overview.md` / `contracts.md`
- `_sdd/spec/appendix/backlog-and-risks.md`

**프롬프트**:
master remediation 구현 완료 후 global spec을 실제 코드와 동기화하세요.

제약:
- implemented + verified 된 persistent information만 반영하세요.
- temporary execution detail, phase memo, transient risk log는 global spec 본문에 올리지 마세요.
- 구현이 partial로 남은 backlog는 backlog/risk surface에 deferred 상태로만 정리하세요.

**Precondition**:
모든 phase의 immediate review-fix gate, required validation, final integration review, repo gate가 닫힌 뒤에만 실행한다.

## Review-Fix Loop

- `scope`: `per-phase`
- `max_rounds_per_phase`: 3
- `timing`: 각 phase `implementation` 직후 즉시 실행하는 completion gate
- `phase boundary source`: `_sdd/implementation/2026-04-14_implementation_plan_post_split_remaining_issues_master_remediation.md`
- `phase exit criteria`:
  - Phase 1: loader/watch/restore async/state 정합성이 focused test + repo gate로 고정된다.
  - Phase 2: file tree/search/clipboard/comment safety가 failure distinction과 boundary policy까지 고정된다.
  - Phase 3: local/remote backend hardening과 error semantics가 diagnostics 가능한 상태로 정리된다.
  - Phase 4: editor/highlighter/helper lifecycle drift가 canonical source로 수렴한다.
  - Phase 5: backend/context typed surface가 compatibility regression 없이 유지된다.
  - Phase 6: backlog UX 중 still-missing delta가 테스트 가능한 상태로 ship된다.
  - Phase 7: blind-spot tests와 low-risk cleanup을 마치고 final integration review 준비가 끝난다.
- `carry-over policy`:
  - Default: `None`
  - `critical/high/medium` 이슈는 phase exit blocker다.
  - 예외 carry-over는 Phase 6의 일부 backlog subtask에 한해 `low` 이하, 기존 기능 회귀 없음, plan에 기록된 risk/migration 폭주 상황일 때만 허용한다.
- `agent_mapping`:
  - `review = implementation_review`
  - `fix = implementation`
  - `re-review = implementation_review`
- `review_profile`: `review_default` -> `gpt-5.4 / high`
- `fix_profile`: `impl_default` -> `gpt-5.4 / high`
- `final integration review`:
  - 마지막 phase 이후 `implementation_review`를 1회 더 실행해 cross-phase regressions와 spec sync readiness를 점검한다.
- `final_integration_review_profile`: `review_integration_strict` -> `gpt-5.4 / xhigh`

## Test Strategy

- `mode`: `inline`
- `commands`:
  - Phase 1 focused:
    - `npm test -- src/workspace/use-workspace-file-operations.test.ts src/workspace/use-workspace-watcher.test.ts src/workspace/use-workspace-snapshot.test.ts`
  - Phase 2 focused:
    - `npm test -- src/file-tree/file-tree-panel.test.tsx electron/file-clipboard.test.ts src/code-comments/comment-persistence.test.ts`
  - Phase 3 focused:
    - `npm test -- electron/workspace-ipc-handlers.test.ts electron/remote-agent/runtime/workspace-ops.test.ts electron/remote-agent/connection-service.test.ts electron/workspace-backend/remote-workspace-backend.test.ts electron/system-open.test.ts electron/remote-agent/runtime/request-router.test.ts`
  - Phase 4 focused:
    - `npm test -- src/code-editor/code-editor-panel.test.tsx src/code-viewer/language-map.test.ts src/code-viewer/syntax-highlight.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/spec-viewer/highlighted-code-block.test.tsx src/file-tree/file-tree-panel.test.tsx`
  - Phase 5 focused:
    - `npm test -- electron/workspace-backend/remote-workspace-backend.test.ts electron/workspace-backend/backend-router.test.ts electron/workspace-backend/local-workspace-backend.test.ts src/App.test.tsx`
  - Phase 6 focused:
    - `npm test -- src/spec-viewer/spec-viewer-panel.test.tsx src/code-comments/comment-anchor.test.ts src/code-comments/comment-export.test.ts src/code-comments/global-comments-modal.test.tsx src/App.test.tsx electron/workspace-watch-mode.test.ts`
  - Phase 7 focused:
    - `npm test -- electron/workspace-ipc-handlers.test.ts electron/file-clipboard.test.ts src/workspace/use-workspace-file-operations.test.ts src/workspace/use-workspace-watcher.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/code-comments/comment-hover-popover.test.tsx`
  - Each phase repo gate:
    - `npm test`
    - `npm run lint`
  - UI smoke:
    - `npm run dev` after Phase 6 and final, when Electron launch is feasible
- `선택 근거`: existing Vitest/ESLint gate가 충분하고 대부분의 phase가 code/test surface 중심이다. long-running external loop보다 phase-focused inline evidence가 적합하다.
- `reporting`: phase별 focused test 결과, repo gate 결과, manual smoke 가능 여부, 남은 수동 확인 항목을 `_sdd/pipeline/report_post_split_remaining_issues_master_remediation_<timestamp>.md`에 기록한다.

## Error Handling

- 재시도 횟수:
  - `implementation_plan`: 구조/phase gate 미충족 시 최대 2회 수정 후 재검증
  - phase implementation: 같은 phase 범위에서 최대 2회 fix round 허용, 이후에도 `critical/high/medium` 잔존 시 중단
  - `spec_update_done`: spec drift 또는 persistent/non-persistent 경계 모호 시 최대 1회 수정
- 핵심 단계:
  - Phase 1~7 구현과 review-fix, `npm test`, `npm run lint`, final integration review, `spec_update_done`
  - 핵심 단계 실패 시 다음 phase나 spec sync로 진행하지 않는다.
- 비핵심 단계:
  - `npm run dev` 기반 manual smoke
  - GUI launch 또는 visual confirmation이 불가하면 보고서에 환경 제약과 수동 확인 항목을 남기고 자동 게이트 결과와 분리해 기록한다.
