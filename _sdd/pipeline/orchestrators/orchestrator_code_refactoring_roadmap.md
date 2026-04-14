# Orchestrator: 코드 리팩토링 로드맵 (Phase 0~4)

**생성일**: 2026-04-14
**규모**: 대규모 (multi-phase)
**생성자**: autopilot
**토론 기반**: `_sdd/discussion/2026-04-14_discussion_code_refactoring_roadmap.md`

## 기능 설명

8개 코드 리뷰에서 도출된 리팩토링 로드맵을 Codex 기반 `sdd-autopilot`으로 실행한다. Phase 0의 보안/버그/정리 즉시 수정과, Phase 1~4의 4대 모놀리스 분할(spec-viewer → main.ts → App.tsx → workspace-context)을 순차적으로 구현하고, 각 phase마다 review-fix loop를 닫는다.

## Acceptance Criteria

- [ ] AC1: Phase 0의 보안 5건, 버그 6건, 정리 6건이 모두 반영되고 `npm test` + `npm run lint`가 통과한다.
- [ ] AC2: `src/spec-viewer/spec-viewer-panel.tsx`가 관심사별 모듈로 분리되고, extracted module import/export가 유지되며 `npm test` + `npm run lint`가 통과한다.
- [ ] AC3: `electron/main.ts`의 IPC/유틸리티/워처/라우팅 관심사가 분리되고, `electron/ipc-types.ts` 공유 모듈이 도입되며 `npm test` + `npm run lint`가 통과한다.
- [ ] AC4: `src/App.tsx`의 코멘트/히스토리/외부 앱/리사이즈 로직이 custom hook으로 분리되고, App shell 동작 회귀 없이 `npm test` + `npm run lint`가 통과한다.
- [ ] AC5: `src/workspace/workspace-context.tsx`의 파일 I/O, Git, comments, remote, watcher, snapshot 관심사가 hook/helper로 분리되고, WorkspaceContextValue surface를 유지한 채 `npm test` + `npm run lint`가 통과한다.
- [ ] AC6: 각 phase의 exit criteria와 최종 통합 리뷰에서 `critical = 0 AND high = 0 AND medium = 0`를 만족한다.
- [ ] AC7: 전체 완료 후 persistent 구조 변화만 global spec에 동기화되고, temporary execution detail은 `_sdd/spec/` 본문에 누수되지 않는다.

## Reasoning Trace

- 변경 범위가 5개 phase로 나뉘고 dependency chain이 깊기 때문에 `feature_draft` 이후 `implementation_plan`을 거치는 대규모 multi-phase path로 판단했다.
- global spec은 유지하되, 실행 청사진은 temporary spec과 implementation plan에 고정하고 마지막에만 `spec_update_done`으로 persistent truth를 반영한다.
- 각 phase가 독립 exit gate를 가져야 하므로 `Review-Fix Loop.scope = per-phase`를 사용하고 마지막에 final integration review를 추가한다.
- 기존 테스트 스택이 vitest + eslint로 충분히 크고, 이번 변경이 구조 분리 중심이므로 테스트 전략은 `inline`이 적절하다.
- 강하게 작동하는 SDD 원칙은 `Spec-first`, `Delta-first`, `Execute -> Verify`, `Review-fix mandatory`, `Global spec direct edit 금지`다.

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
- `_sdd/spec/main.md`
- `_sdd/discussion/2026-04-14_discussion_code_refactoring_roadmap.md`
- `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`
**출력 파일**: `_sdd/drafts/2026-04-14_feature_draft_code_refactoring_roadmap.md`

**프롬프트**:
코드 리팩토링 로드맵에 대한 feature draft를 작성하세요.

Part 1 temporary spec은 canonical 7섹션을 포함하고, 다음 내용을 반영하세요.
- Change Summary: Phase 0~4 전체 범위
- Scope Delta: 구조 분리 중심, 로직 변경 최소화
- Contract/Invariant Delta: IPC 인터페이스, export signature, WorkspaceContextValue, preload sandbox 제약
- Touchpoints: 4대 모놀리스와 Phase 0 quick-fix 대상 파일
- Implementation Plan: phase별 순서와 dependency
- Validation Plan: `V*` ID로 `npm test`, `npm run lint`, import/export 정합성, phase별 smoke evidence를 연결
- Risks / Open Questions: 순환 참조, import path 회귀, 분리 전제조건 패턴 개선

Part 2에서는 각 phase의 Target Files, dependency closure, validation linkage를 Codex `implementation`과 `implementation_plan`이 바로 소비할 수 있게 정리하세요.

### Step 2: implementation_plan
**Codex agent_type**: `implementation_plan`
**Execution profile**: `plan_strict` (`gpt-5.4 / xhigh`)
**입력 파일**:
- `_sdd/drafts/2026-04-14_feature_draft_code_refactoring_roadmap.md`
- `_sdd/discussion/2026-04-14_discussion_code_refactoring_roadmap.md`
- `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`
- `_sdd/spec/main.md`
**출력 파일**: `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md`

**프롬프트**:
feature draft를 기반으로 multi-phase implementation plan을 작성하세요.

각 phase마다 아래 항목을 반드시 포함하세요.
- `goal`
- `task set / dependency closure`
- `validation focus`
- `exit criteria`
- `carry-over policy`

Phase 구조는 아래를 따르세요.
- Phase 0: Quick Fixes — 보안 5건 + 버그 6건 + 정리 6건
- Phase 1: spec-viewer-panel.tsx 분할
- Phase 2: main.ts 분할 + `electron/ipc-types.ts` 공유 모듈
- Phase 3: App.tsx 분할 + 4개 custom hook
- Phase 4: workspace-context.tsx 분할 + IPC boilerplate helper + 6개 custom hook

각 task는 Target Files, dependency, 예상 변경량, `Contract/Invariant Delta Coverage`, `Validation Plan` 연결을 포함해야 합니다.

### Step 3: implementation (Phase 0)
**Codex agent_type**: `implementation`
**Execution profile**: `impl_default` (`gpt-5.4 / high`)
**입력 파일**:
- `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md` (Phase 0 섹션)
- `_sdd/discussion/2026-04-14_discussion_code_refactoring_roadmap.md` (Phase 0 상세)
- `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`
**출력 파일**:
- `electron/remote-agent/runtime/copy-ops.ts`
- `electron/remote-agent/bootstrap.ts`
- `src/file-tree/file-tree-panel.tsx`
- `src/spec-viewer/markdown-security.ts`
- `electron/file-clipboard.ts`
- `src/workspace/workspace-context.tsx`
- `src/code-editor/code-editor-panel.tsx`
- `electron/main.ts`
- `electron/remote-agent/runtime/watch-ops.ts`
- `electron/remote-agent/security.ts`
- `src/code-editor/cm6-dark-theme.ts`

**프롬프트**:
implementation plan의 Phase 0 (Quick Fixes)를 구현하세요.

원칙:
- 최소 침습 수정
- 정상 경로 로직 보존
- 보안/버그 수정은 guard 중심
- 관련 테스트가 있으면 함께 보강

필수 범위:
- 보안 5건: 경로 검증, heredoc marker 검증, filename validation hardening, markdown style sanitization, clipboard path escape 방지
- 버그 6건: 무한 루프 guard, rAF cleanup, CM6 language rejection 처리, exit code fallback, CRUD callback error handling, watcher suppression race 완화
- 정리 6건: dead code 제거, 죽은 조건 단순화, 오타 수정, unused alias 제거, 중복 체크 제거, 중복 helper 정리

수정 후 해당 phase 범위에서 `npm test`와 `npm run lint`를 실행할 수 있는 상태를 남기세요.

### Step 4: implementation (Phase 1)
**Codex agent_type**: `implementation`
**Execution profile**: `impl_default` (`gpt-5.4 / high`)
**입력 파일**:
- `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md` (Phase 1 섹션)
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/`
**출력 파일**:
- `src/spec-viewer/spec-viewer-comment-markers.ts`
- `src/spec-viewer/highlighted-code-block.tsx`
- `src/spec-viewer/spec-viewer-scroll.ts`
- `src/spec-viewer/spec-viewer-helpers.ts`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/source-line-resolver.ts`
- `src/spec-viewer/citation-target.ts`
- `src/spec-viewer/python-symbol-resolver.ts`

**프롬프트**:
implementation plan의 Phase 1을 구현하세요.

목표:
- `spec-viewer-panel.tsx`의 모듈 레벨 헬퍼와 보조 컴포넌트를 분리
- 구조 분리만 수행하고 함수 시그니처/동작은 유지
- `getElementDepth`, bracket citation pattern, Python identifier regex의 중복을 통합

검증 관점:
- rendered spec navigation, code block highlight, citation handling, source line mapping 회귀가 없어야 합니다.

### Step 5: implementation (Phase 2)
**Codex agent_type**: `implementation`
**Execution profile**: `impl_default` (`gpt-5.4 / high`)
**입력 파일**:
- `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md` (Phase 2 섹션)
- `electron/main.ts`
- `electron/preload.ts`
- `electron/`
**출력 파일**:
- `electron/ipc-types.ts`
- `electron/workspace-utils.ts`
- `electron/workspace-indexing.ts`
- `electron/workspace-ipc-handlers.ts`
- `electron/workspace-watchers.ts`
- `electron/workspace-ipc-routing.ts`
- `electron/main.ts`
- `electron/preload.ts`

**프롬프트**:
implementation plan의 Phase 2를 구현하세요.

목표:
- `main.ts`의 타입/유틸/인덱싱/IPC handler/watcher/routing 관심사를 분리
- `electron/ipc-types.ts`를 main/preload shared type module로 도입
- preload sandbox 제약을 지키기 위해 runtime value leakage 없이 type-only import 구조를 유지
- IPC 등록 반복 코드는 table-driven registration으로 단순화 가능하되, channel surface는 유지

검증 관점:
- preload surface, workspace IPC, remote connection flow, watch flow가 기존과 동일하게 동작해야 합니다.

### Step 6: implementation (Phase 3)
**Codex agent_type**: `implementation`
**Execution profile**: `impl_default` (`gpt-5.4 / high`)
**입력 파일**:
- `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md` (Phase 3 섹션)
- `src/App.tsx`
- `src/code-comments/`
- `src/spec-viewer/`
- `src/file-tree/`
**출력 파일**:
- `src/hooks/use-comment-actions.ts`
- `src/hooks/use-history-navigation.ts`
- `src/hooks/use-external-app-opener.ts`
- `src/hooks/use-pane-resize.ts`
- `src/app-icons.tsx`
- `src/app-shell-utils.ts`
- `src/App.tsx`

**프롬프트**:
implementation plan의 Phase 3을 구현하세요.

목표:
- App shell에서 코멘트 CRUD/내보내기, 네비게이션/히스토리, 외부 앱 열기, pane resize 로직을 각각 hook으로 분리
- App.tsx에는 상태 선언, theme, file-tree CRUD handler, panel wiring, JSX shell만 남긴다
- 순수 아이콘과 shell 헬퍼는 필요 시 별도 모듈로 분리해 App 본문 크기를 줄인다
- 동작 변경 없이 파라미터 주입 방식으로만 분리한다

검증 관점:
- comment modal/export flow, history navigation, remote connect modal, open-in actions, pane resize, Code/Spec panel wiring 회귀가 없어야 합니다.

### Step 7: implementation (Phase 4)
**Codex agent_type**: `implementation`
**Execution profile**: `impl_default` (`gpt-5.4 / high`)
**입력 파일**:
- `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md` (Phase 4 섹션)
- `src/workspace/workspace-context.tsx`
- `src/workspace/`
**출력 파일**:
- `src/workspace/use-workspace-file-operations.ts`
- `src/workspace/use-workspace-git-decorations.ts`
- `src/workspace/use-workspace-comments.ts`
- `src/workspace/use-workspace-remote.ts`
- `src/workspace/use-workspace-watcher.ts`
- `src/workspace/use-workspace-snapshot.ts`
- `src/workspace/ipc-call-helper.ts`
- `src/workspace/workspace-context.tsx`

**프롬프트**:
implementation plan의 Phase 4를 구현하세요.

목표:
- WorkspaceProvider에서 파일 I/O, Git decoration, comments, remote, watcher, snapshot 관심사를 hook으로 분리
- 반복되는 IPC requestId/stale/error 패턴은 `ipc-call-helper.ts`로 추출
- `WorkspaceContextValue` public surface는 유지하고 내부 구조만 정리

검증 관점:
- workspace open/switch/close, file read/write/rename/delete, comment persistence, remote connect/retry/disconnect, watch refresh, snapshot restore가 회귀 없이 유지되어야 합니다.

### Step 8: spec_update_done
**Codex agent_type**: `spec_update_done`
**Execution profile**: `spec_sync_default` (`gpt-5.4 / medium`)
**입력 파일**:
- `_sdd/spec/main.md`
- `_sdd/drafts/2026-04-14_feature_draft_code_refactoring_roadmap.md`
- `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md`
- `_sdd/pipeline/report_code_refactoring_roadmap_<timestamp>.md`
- 구현 완료된 관련 코드 파일들
**출력 파일**:
- `_sdd/spec/main.md`
- `_sdd/spec/decision-log.md`

**프롬프트**:
코드 리팩토링 로드맵 완료 기준으로 global spec을 실제 코드와 동기화하세요.

반영 대상은 implemented + verified persistent information만 허용합니다.
- 4대 모놀리스 분할 후의 구조적 파일 책임 변화
- shared IPC type module 도입
- workspace IPC helper 도입과 같은 repo-wide structural decision
- guardrail로 남아야 하는 보안/경계 검증 규칙

반영 금지:
- phase/task breakdown
- 리뷰 메모
- 테스트 실행 로그
- 임시 validation note

## Review-Fix Loop

- `scope`: `per-phase`
- `max_rounds_per_phase`: 3
- `exit_condition`: `critical = 0 AND high = 0 AND medium = 0`
- `fix_targets`: `critical/high/medium/low`
- `phase boundary source`: `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md`
- `phase exit criteria`:
  - Phase 0: 17개 quick-fix task가 모두 적용되고 `npm test` + `npm run lint`가 통과한다.
  - Phase 1: `spec-viewer-panel.tsx`가 대략 1,400줄 이하로 축소되고 extracted module import/export가 안정화된다.
  - Phase 2: `main.ts`가 대략 1,000줄 이하로 축소되고 `ipc-types.ts`를 통한 main/preload shared type surface가 유지된다.
  - Phase 3: `App.tsx`가 대략 1,000줄 이하로 축소되고 4개 custom hook 및 shell helper로 wiring이 유지된다.
  - Phase 4: `workspace-context.tsx`가 대략 1,000줄 이하로 축소되고 6개 hook + IPC helper로 구조가 정리된다.
- `carry-over policy`:
  - Default: `None`
  - `critical/high/medium` 이슈는 phase exit blocker다.
  - 예외 carry-over는 허용하지 않는다.
- `agent_mapping`:
  - `review = implementation_review`
  - `fix = implementation`
  - `re-review = implementation_review`
- `review_profile`: `review_default` -> `gpt-5.4 / high`
- `fix_profile`: `impl_default` -> `gpt-5.4 / high`
- `final integration review`:
  - 마지막 phase 이후 `implementation_review`를 1회 더 실행하여 cross-phase regression, import graph, shared type surface, context/public API drift를 점검한다.
- `final_integration_review_profile`: `review_integration_strict` -> `gpt-5.4 / xhigh`

## Test Strategy

- `mode`: `inline`
- `commands`:
  - `npm test`
  - `npm run lint`
  - phase별 필요 시 targeted smoke: App shell, spec viewer navigation, workspace open/watch/remote flow
- `선택 근거`:
  - 구조 분리 중심 변경이라 기존 Vitest + ESLint 조합이 회귀 검증의 주력 신호가 된다.
  - 대화형 UI 확인은 필요하지만, 장시간 loop보다 phase gate를 빠르게 닫는 inline 검증이 적합하다.
  - feature draft의 `Validation Plan (V*)`와 implementation plan의 phase validation focus를 phase별로 매핑해 확인한다.
- `사용자 보고 형식`:
  - 각 phase마다 통과/실패 테스트 건수, lint 결과, 잔여 수동 확인 항목을 `_sdd/pipeline/log_code_refactoring_roadmap_<timestamp>.md`와 `_sdd/pipeline/report_code_refactoring_roadmap_<timestamp>.md`에 기록하고 사용자에게 요약 보고한다.

## Error Handling

- `재시도 횟수`: 2
- `핵심 단계`:
  - Step 1 `feature_draft`
  - Step 2 `implementation_plan`
  - Step 3~7 `implementation`
  - phase별 `implementation_review`
- `비핵심 단계`:
  - Step 8 `spec_update_done`
- 핵심 단계 실패 시:
  - 에러와 마지막 성공 phase를 로그에 기록하고 해당 phase에서 중단한다.
  - 동일 phase에서 최대 2회까지 수정 후 재시도한다.
  - 2회 후에도 `critical/high`가 남으면 다음 phase로 넘어가지 않는다.
- 비핵심 단계 실패 시:
  - 로그와 최종 보고서에 spec sync 필요성을 남기고 종료할 수 있다.
- 공통 규칙:
  - 테스트 실패 상태에서 다음 phase로 진행하지 않는다.
  - 로그에 retry 사유, 남은 이슈 severity, 수동 확인 필요 항목을 남긴다.
