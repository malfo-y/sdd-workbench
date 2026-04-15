# Orchestrator: Pre-split Review Status Audit Remediation

**생성일**: 2026-04-15T12:25:10+0900
**규모**: 대규모 (multi-phase)
**생성자**: autopilot
**기반 입력**: `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`

## 기능 설명

`_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`에 남아 있는 모든 `Open`/`Partial` 항목을 감사 기준의 canonical backlog로 삼아, 현재 dirty worktree와 기존 remediation 산출물을 보존한 채 still-open delta를 단계적으로 닫는다.

이번 파이프라인은 기존 `post_split_remaining_issues` 흐름을 폐기하지 않고 입력 컨텍스트로 재사용한다. 다만 사용자 요청 범위는 그보다 넓으므로, `app-shell-and-backend`, `workspace`, `file-tree`, `code-comments`, `code-editor`, `spec-viewer`, `electron-main`, `remote-agent` 전체를 포괄하는 새 temporary spec과 새 phase plan을 먼저 만든 뒤, 각 phase마다 review-fix와 repo gate를 즉시 닫는다.

핵심 구현 축은 다음과 같다.

- foundation: app shell / workspace state / navigation / file-tree safety 정리
- comments + viewer: comment/export semantics, code editor, spec viewer, shared helper 정리
- backend: Electron local/remote backend, IPC routing, remote agent hardening 정리
- final sweep: low-level 중복, naming drift, blind-spot tests, audit revalidation 정리

## Acceptance Criteria

- [ ] AC1: `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`가 생성되고, 감사 문서의 `Open`/`Partial` 항목 전체를 phase/task 수준으로 추적 가능한 temporary spec으로 정리한다.
- [ ] AC2: `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`가 생성되고, 각 audit finding이 `Target Files`, phase, validation focus와 연결된다.
- [ ] AC3: `app-shell-and-backend`, `workspace`, `file-tree` 계열 finding의 still-open delta가 코드/테스트/re-review evidence로 닫힌다.
- [ ] AC4: `code-comments`, `code-editor`, `spec-viewer` 계열 finding의 still-open delta가 코드/테스트/re-review evidence로 닫힌다.
- [ ] AC5: `electron-main`, `remote-agent`, backend abstraction 계열 finding의 still-open delta가 코드/테스트/re-review evidence로 닫힌다.
- [ ] AC6: 각 phase 종료 시 `critical = 0 AND high = 0 AND medium = 0`를 만족하고, 마지막 `final integration review`까지 통과한다.
- [ ] AC7: `npm test`, `npm run lint`, 필요한 focused test, `npm run dev` boot 시도가 실제로 수행되고 결과가 보고서에 기록된다.
- [ ] AC8: 검증된 persistent 변화만 `_sdd/spec/`에 반영되고, 감사 실행 메모나 temporary phase detail은 global spec 본문에 누수되지 않는다.

## Reasoning Trace

- 감사 문서 기준으로 `Open 50 + Partial 21`이 남아 있고 write set이 renderer/main/spec/test 전역에 걸치므로, single-pass direct path가 아니라 multi-phase expanded path가 필요하다.
- 같은 주제의 기존 `post_split_remaining_issues` 산출물은 유용하지만 범위가 더 좁고 이미 `in_progress` 상태라, 이번 요청은 새 audit-scope temporary spec으로 재정의하는 편이 안전하다.
- 현재 worktree가 크게 dirty하므로 phase별 구현은 "빈 저장소에서 새로 작성"이 아니라 "현재 dirty diff를 포함한 실제 상태에서 still-open delta만 보강"하는 방식이어야 한다.
- global spec은 이미 존재하고 thin-core를 유지해야 하므로, planned alignment는 구현 완료 후 `spec_update_done` 한 번으로 모은다. 이번 path에는 `spec_update_todo`를 넣지 않는다.
- 품질 게이트는 이미 Vitest/ESLint가 충분하고 대부분의 리스크가 코드/테스트 surface에 있으므로 `inline` 검증 전략을 사용한다. UI 시각 확인은 `npm run dev` boot와 manual gap 보고로 처리한다.

## Execution Profiles

- `feature_draft`: `draft_strict` -> `gpt-5.4 / xhigh`
- `implementation_plan`: `plan_strict` -> `gpt-5.4 / xhigh`
- `implementation`: `impl_default` -> `gpt-5.4 / high`
- `implementation_review`: `review_default` -> `gpt-5.4 / high`
- `final_integration_review`: `review_integration_strict` -> `gpt-5.4 / xhigh`
- `spec_update_done`: `spec_sync_default` -> `gpt-5.4 / medium`

## Pipeline Steps

### Step 1: feature_draft
**Codex agent_type**: `feature_draft`
**Execution profile**: `draft_strict` (`gpt-5.4 / xhigh`)
**입력 파일**:
- `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`
- `_sdd/review/app-shell-and-backend.md`
- `_sdd/review/code-comments.md`
- `_sdd/review/code-editor.md`
- `_sdd/review/electron-main.md`
- `_sdd/review/file-tree.md`
- `_sdd/review/remote-agent.md`
- `_sdd/review/spec-viewer.md`
- `_sdd/review/workspace.md`
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
- `_sdd/env.md`
- 기존 remediation 참고 산출물:
  - `_sdd/drafts/2026-04-14_feature_draft_post_split_remaining_issues_master_remediation.md`
  - `_sdd/implementation/2026-04-14_implementation_plan_post_split_remaining_issues_master_remediation.md`
  - `_sdd/implementation/2026-04-15_implementation_review_post_split_remaining_issues_master_remediation.md`
  - `_sdd/implementation/2026-04-15_implementation_progress_post_split_remaining_issues_master_remediation_review_fixes.md`
**출력 파일**:
- `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`

**프롬프트**:
감사 문서 `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`를 canonical backlog로 삼아 audit-scope feature draft를 작성하세요.

필수 요구사항:
- `Open`/`Partial` 전체를 누락 없이 수집하고, 각 finding을 component bucket과 remediation theme로 그룹핑하세요.
- 현재 dirty worktree와 기존 remediation 산출물을 참고해 "이미 dirty diff에 부분 반영된 항목"과 "still-missing delta"를 구분하세요.
- Part 1 temporary spec 7섹션을 모두 작성하고, `Contract/Invariant Delta`와 `Validation Plan` ID linkage를 포함하세요.
- Part 2 implementation plan은 audit finding별 traceability를 유지하는 task/phase skeleton이어야 합니다.
- unrelated dirty changes를 되돌리지 않는다는 작업 원칙과 Node 25 / spec 문서의 Node 20 권장 환경 드리프트를 risk에 반영하세요.

### Step 2: implementation_plan
**Codex agent_type**: `implementation_plan`
**Execution profile**: `plan_strict` (`gpt-5.4 / xhigh`)
**입력 파일**:
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
- 기존 remediation 참고 산출물:
  - `_sdd/drafts/2026-04-14_feature_draft_post_split_remaining_issues_master_remediation.md`
  - `_sdd/implementation/2026-04-14_implementation_plan_post_split_remaining_issues_master_remediation.md`
  - `_sdd/implementation/2026-04-15_implementation_review_post_split_remaining_issues_master_remediation.md`
  - `_sdd/implementation/2026-04-15_implementation_progress_post_split_remaining_issues_master_remediation_review_fixes.md`
**출력 파일**:
- `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`

**프롬프트**:
audit-scope remediation implementation plan을 작성하세요.

필수 요구사항:
- multi-phase plan이어야 하며 phase는 최소 다음 boundary를 포함하세요:
  - app shell / workspace / navigation foundation
  - file tree / clipboard / path UX
  - comments / export / modal semantics
  - code editor / spec viewer lifecycle and helper cleanup
  - electron main / local backend / IPC routing
  - remote agent / remote backend hardening
  - cross-cutting dedup / naming / blind-spot tests / final sweep
- 각 phase마다 `goal`, `task set / dependency closure`, `validation focus`, `exit criteria`, `carry-over policy`를 모두 포함하세요.
- 각 audit finding은 task ID 또는 explicit revalidation bucket으로 반드시 연결하세요.
- `Target Files`를 실제 파일 경로로 적고, current dirty worktree와 충돌하지 않도록 scope를 서술하세요.
- `medium`도 기본 exit blocker로 취급하고, carry-over는 기본 `None`으로 두세요.

### Step 3: implementation
**Codex agent_type**: `implementation`
**Execution profile**: `impl_default` (`gpt-5.4 / high`)
**Execution Mode**: `phase-iterative`
**Phase Source**: `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`
**입력 파일**:
- `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`
- `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`
- `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`
- `_sdd/spec/main.md`
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
- existing dirty worktree
**출력 파일**:
- plan에 정의된 phase 소유 코드 및 테스트 파일
- `_sdd/implementation/2026-04-15_implementation_progress_pre_split_review_status_audit_remediation.md`
- `_sdd/implementation/2026-04-15_implementation_report_pre_split_review_status_audit_remediation.md`
- phase별 focused validation evidence 파일(필요 시)

**프롬프트**:
implementation plan을 runtime phase boundary에 따라 순서대로 실행하세요.

원칙:
- 각 phase 시작 전에 관련 audit finding이 현재 worktree에서 여전히 `Open`/`Partial`인지 다시 확인하고, 이미 해결된 dirty diff는 보존한 채 still-missing delta만 보강하세요.
- unrelated user changes를 revert하지 마세요.
- 각 phase가 끝날 때 focused test -> `npm test` -> `npm run lint`를 수행 가능한 상태를 남기세요.
- UI가 변하는 phase에서는 `npm run dev` boot를 시도하고, 실제 창 수동 검증이 불가하면 gap을 기록하세요.
- audit finding을 닫을 수 없다면 원인과 blocker를 보고서에 명시하세요.

**Exit Gate**:
이 step은 단독 완료가 아니다. implementation plan의 phase boundary에 따라 각 phase 직후 same-scope `Review-Fix Loop`와 required validation을 즉시 닫고, 마지막 `final integration review`를 통과한 뒤에만 Step 4로 진행한다.

**Per-phase review-fix invocation contract**:
1. 현재 phase의 구현 직후 autopilot은 같은 phase 범위로 `implementation_review` agent를 즉시 호출한다.
2. review 입력에는 최소한 다음을 포함한다:
   - `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`
   - `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`
   - `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`
   - 현재 phase가 담당하는 audit finding 목록
   - 현재 phase의 실제 변경 파일과 focused test 결과
3. review 프롬프트는 반드시 다음을 요구한다:
   - findings first 형식
   - severity를 `critical/high/medium/low`로 명시
   - 정확한 파일/라인 근거와 해당 phase task 또는 audit finding 연결
   - unrelated dirty changes는 참고만 하고 revert 대상으로 삼지 않음
4. `implementation_review` 결과에 `critical/high/medium`이 하나라도 있으면 autopilot은 그 finding만 입력으로 묶어 같은 phase 범위의 `implementation` agent를 다시 호출한다.
5. fix 후 autopilot은 같은 scope로 `implementation_review` agent를 재호출한다.
6. 이 순서는 `critical = 0 AND high = 0 AND medium = 0`가 될 때까지 또는 `max_rounds_per_phase`에 도달할 때까지 반복한다.

### Step 4: spec_update_done
**Codex agent_type**: `spec_update_done`
**Execution profile**: `spec_sync_default` (`gpt-5.4 / medium`)
**입력 파일**:
- `_sdd/spec/main.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/decision-log.md`
- `_sdd/spec/appendix/backlog-and-risks.md`
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
- `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`
- `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`
- `_sdd/implementation/2026-04-15_implementation_report_pre_split_review_status_audit_remediation.md`
- `_sdd/pipeline/report_pre_split_review_status_audit_remediation_<timestamp>.md`
**출력 파일**:
- `_sdd/spec/main.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/decision-log.md`
- `_sdd/spec/appendix/backlog-and-risks.md`
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

**프롬프트**:
audit remediation 구현 완료 후 global spec을 실제 코드와 동기화하세요.

제약:
- implemented + verified 된 persistent information만 반영하세요.
- audit 실행 메모, phase breakdown, transient review log는 global spec 본문에 올리지 마세요.
- 완전히 닫히지 못한 finding은 backlog/risk surface에 deferred 상태로만 남기세요.

**Precondition**:
모든 phase의 immediate review-fix gate, required validation, final integration review, repo gate가 닫힌 뒤에만 실행한다.

## Review-Fix Loop

- `scope`: `per-phase`
- `max_rounds_per_phase`: 3
- `timing`: 각 phase `implementation` 직후 즉시 실행하는 completion gate
- `phase boundary source`: `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`
- `phase exit criteria`:
  - Phase 1: app shell / workspace / navigation 계열 finding이 async-state, stale closure, banner/message consistency 측면에서 focused tests와 repo gate로 고정된다.
  - Phase 2: file tree / clipboard / path handling finding이 failure distinction, boundary policy, UI regression 없이 고정된다.
  - Phase 3: comments / export / modal semantics finding이 schema, organization, keyboard/escape, export surface 기준으로 고정된다.
  - Phase 4: code editor / spec viewer finding이 lifecycle, helper canonicalization, safety/perf concerns, navigation regression 없이 고정된다.
  - Phase 5: electron main / local backend / IPC routing finding이 typed surface, handler safety, error semantics 기준으로 고정된다.
  - Phase 6: remote agent / remote backend finding이 diagnostics, security, runtime helper structure, boundary policy 기준으로 고정된다.
  - Phase 7: cross-cutting dedup, naming drift, residual low-level cleanup, blind-spot tests가 integration-safe 상태로 정리된다.
- `carry-over policy`:
  - Default: `None`
  - `critical/high/medium` 이슈는 phase exit blocker다.
  - 예외 carry-over는 허용하지 않는다. `low`도 다음 phase로 넘기려면 explicit log와 사용자-visible non-impact 근거가 필요하다.
- `agent_mapping`:
  - `review = implementation_review`
  - `fix = implementation`
  - `re-review = implementation_review`
- `review invocation prompt contract`:
  - "현재 phase 범위만 검토하세요. 응답은 findings first여야 하며, 각 finding은 severity, 파일/라인, 관련 audit finding ID 또는 task ID, 재현/근거, 권장 수정 방향을 포함해야 합니다. unrelated dirty change는 회귀 위험이 아니면 finding으로 확장하지 마세요."
- `fix invocation prompt contract`:
  - "직전 `implementation_review` finding 중 현재 phase 범위의 `critical/high/medium`만 닫으세요. unrelated dirty changes를 되돌리지 말고, 수정 후 focused tests와 repo gate 준비 상태를 유지하세요."
- `re-review invocation prompt contract`:
  - "직전 review finding이 실제로 해소되었는지 먼저 검증하고, 같은 phase 범위에서 새 `critical/high/medium`이 남는지만 다시 보고하세요. findings first 형식을 유지하세요."
- `review_profile`: `review_default` -> `gpt-5.4 / high`
- `fix_profile`: `impl_default` -> `gpt-5.4 / high`
- `final integration review`:
  - 마지막 phase 이후 `implementation_review`를 1회 더 실행해 audit 전체 재정합성, cross-phase regressions, spec sync readiness를 점검한다.
- `final integration review prompt contract`:
  - "phase 경계를 넘는 회귀와 감사 문서 전체 대비 남은 `Open`/`Partial`을 검토하세요. 응답은 findings first 형식이며, audit 전체 closure 상태와 spec sync readiness를 함께 평가해야 합니다."
- `final_integration_review_profile`: `review_integration_strict` -> `gpt-5.4 / xhigh`

## Test Strategy

- `mode`: `inline`
- `commands`:
  - Phase 1 focused:
    - `npm test -- src/App.test.tsx src/workspace/use-workspace-file-operations.test.ts src/workspace/use-workspace-watcher.test.ts src/workspace/use-workspace-snapshot.test.ts src/workspace/workspace-persistence.test.ts`
  - Phase 2 focused:
    - `npm test -- src/file-tree/file-tree-panel.test.tsx electron/file-clipboard.test.ts electron/workspace-backend/copy-entries.test.ts`
  - Phase 3 focused:
    - `npm test -- src/code-comments/comment-anchor.test.ts src/code-comments/comment-persistence.test.ts src/code-comments/comment-export.test.ts src/code-comments/comment-hover-popover.test.tsx src/code-comments/comment-marker-detail-panel.test.tsx src/code-comments/global-comments-modal.test.tsx src/code-comments/export-comments-modal.test.tsx`
  - Phase 4 focused:
    - `npm test -- src/code-editor/code-editor-panel.test.tsx src/code-viewer/language-map.test.ts src/code-viewer/syntax-highlight.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/spec-viewer/highlighted-code-block.test.tsx src/spec-viewer/spec-link-utils.test.ts`
  - Phase 5 focused:
    - `npm test -- electron/workspace-ipc-handlers.test.ts electron/workspace-ipc-routing.test.ts electron/workspace-backend/backend-router.test.ts electron/workspace-backend/local-workspace-backend.test.ts electron/system-open.test.ts`
  - Phase 6 focused:
    - `npm test -- electron/remote-agent/connection-service.test.ts electron/remote-agent/protocol.test.ts electron/remote-agent/runtime/request-router.test.ts electron/remote-agent/runtime/workspace-ops.test.ts electron/workspace-backend/remote-workspace-backend.test.ts electron/workspace-watch-mode.test.ts electron/workspace-watchers.test.ts`
  - Phase 7 focused:
    - `npm test -- src/App.test.tsx src/file-tree/file-tree-panel.test.tsx src/spec-viewer/spec-viewer-panel.test.tsx electron/workspace-ipc-handlers.test.ts electron/remote-agent/runtime/request-router.test.ts`
  - Each phase repo gate:
    - `npm test`
    - `npm run lint`
  - UI smoke:
    - `npm run dev` after UI-impacting phases and final integration, when Electron boot is feasible
- `선택 근거`: audit finding 대부분이 renderer/main/test surface에 직접 매핑되고, 저장소에 이미 강한 Vitest/ESLint gate가 있으므로 phase-focused inline evidence가 가장 적합하다.
- `reporting`: phase별 focused test 결과, repo gate 결과, `npm run dev` boot 여부, manual smoke gap, audit finding closure 상태를 `_sdd/pipeline/report_pre_split_review_status_audit_remediation_<timestamp>.md`에 기록한다.

## Error Handling

- 재시도 횟수:
  - `feature_draft`: audit traceability 누락 또는 delta linkage 불충분 시 최대 2회 수정 후 재검증
  - `implementation_plan`: phase boundary / finding mapping / exit gate 미충족 시 최대 2회 수정 후 재검증
  - phase implementation: 같은 phase 범위에서 최대 2회 fix round 허용. 이후에도 `critical/high/medium` 잔존 시 중단
  - `spec_update_done`: persistent/non-persistent 경계가 모호하면 최대 1회 수정
- 핵심 단계:
  - `feature_draft`, `implementation_plan`, Phase 1~7 구현과 review-fix, `npm test`, `npm run lint`, final integration review, `spec_update_done`
  - 핵심 단계 실패 시 다음 phase나 spec sync로 진행하지 않는다.
- 비핵심 단계:
  - `npm run dev` 기반 manual smoke
  - Electron 창 내부 수동 확인
  - GUI/시각 검증이 불가하면 보고서에 환경 제약과 수동 확인 항목을 남기고 자동 게이트와 분리해 기록한다.
