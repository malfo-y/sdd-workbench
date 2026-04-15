# Implementation Review: SDD Workbench

**Review Date**: 2026-04-15
**Review Mode**: Tier 1
**Reference**: `_sdd/implementation/2026-04-14_implementation_plan_post_split_remaining_issues_master_remediation.md`, `_sdd/drafts/2026-04-14_feature_draft_post_split_remaining_issues_master_remediation.md`, `_sdd/env.md`, current worktree
**Model**: GPT-5 Codex

## 1. Findings
### Critical
- 없음.

### High
- `T6-3`의 acceptance criteria 중 `global comments가 문서 또는 섹션 기준 분류를 지원한다`가 아직 구조적으로 충족되지 않았습니다. 현재 구현은 Global Comments 모달에서 문서/섹션 템플릿을 삽입하고 heading을 감지해 보여주는 수준에 머물러 있고, 저장 및 export 경로는 여전히 전체 global comments를 하나의 자유형 markdown blob으로 다룹니다. `suggestedDocumentPath`도 `activeSpec` 한 축만 전달되어 코드 파일/다른 문서 기준 분류 semantics가 없습니다. 결과적으로 “작성 보조 UI”는 생겼지만 “문서/섹션 단위 조직화 및 downstream 소비”는 미완료 상태입니다. 근거: `src/code-comments/global-comments-modal.tsx:31-50`, `src/code-comments/global-comments-modal.tsx:141-220`, `src/App.tsx:874-885`, `src/code-comments/comment-export.ts:48-57`, `src/code-comments/comment-export.ts:91-95`, `_sdd/drafts/2026-04-14_feature_draft_post_split_remaining_issues_master_remediation.md:567-572`.

### Medium
- export modal의 bundle 길이 추정과 clipboard disable 기준이 `Include already-exported comments` 토글을 반영하지 않습니다. UI는 `estimateBundleLength()`를 통해 pending comments 기준으로만 길이를 계산하지만, 실제 submit 시에는 `includePreviouslyExportedComments`가 켜져 있으면 전체 `comments` 집합으로 export를 수행합니다. 이 차이 때문에 modal은 사전에는 clipboard export가 가능해 보이는데, 실제 submit 시점에서만 “bundle exceeds … characters” 배너로 강등될 수 있습니다. 기능은 degrade되지만 사전 피드백이 부정확합니다. 근거: `src/code-comments/export-comments-modal.tsx:69-79`, `src/code-comments/export-comments-modal.tsx:176-187`, `src/hooks/use-comment-actions.ts:312-323`, `src/hooks/use-comment-actions.ts:416-440`.

### Low
- watcher tuning helper에 추가된 `pollIntervalMs` heuristic이 runtime native->polling fallback 경로에는 일관되게 적용되지 않습니다. 초기 watch start 경로는 `resolveWorkspaceWatchMode()`가 계산한 interval을 쓰지만, native watcher error 이후 `switchToPollingFallback()`는 여전히 `WORKSPACE_WATCH_POLL_INTERVAL_MS` 상수를 직접 사용합니다. 현재 테스트를 깨는 수준은 아니지만, “느린/원격성 mount일수록 polling interval을 완화한다”는 규칙이 일부 degradation path에서 우회됩니다. 근거: `electron/workspace-watch-mode.ts:15-60`, `electron/workspace-watchers.ts:517-521`.

## 2. Progress Overview
- Tier 1로 판단했습니다. `_sdd/implementation/2026-04-14_implementation_plan_post_split_remaining_issues_master_remediation.md`가 존재하고, plan이 가리키는 주요 target files와 현재 worktree 구조가 직접 대응합니다.
- Phase 1~5 목표는 현재 코드와 passing tests 기준으로 대체로 충족된 상태로 보입니다. async workspace loader/watch/snapshot stabilization, backend hardening, viewer lifecycle cleanup, typed backend/context regrouping은 구현 흔적과 회귀 테스트가 모두 확인되었습니다.
- Phase 6은 `T6-1`, `T6-2`, `T6-4`가 대체로 `MET`이고, `T6-3`만 `PARTIAL`입니다. export reset과 append-only local history는 들어갔지만, global comments organization은 semantic organization이 아니라 authoring affordance 수준입니다.
- Phase 7은 focused regression coverage 보강 목적에 부합합니다. `comment-marker-detail-panel`, `comment-hover-popover`, `export-comments-modal`, `global-comments-modal`, `App` history/watch mode 관련 테스트가 추가되어 blind spot은 줄었습니다.

## 3. Verification Summary
- `_sdd/env.md`를 기준으로 fresh verification을 수행했습니다. 이전 turn의 테스트 결과는 재사용하지 않았습니다.
- 환경 확인:
`node -v` = `v25.2.1`
`npm -v` = `11.12.1`
- repo gate:
`npm test` = PASS
결과: `78` test files, `895 passed`, `1 skipped`
- repo gate:
`npm run lint` = PASS
- dev boot:
`npm run dev` = Vite/Electron bundle boot 성공
확인 시각: `2026-04-15 08:33:21 KST`
메모: CLI 세션이라 실제 Electron 창 내부 수동 smoke는 수행하지 못했습니다.
- Plan alignment 판정:
`T6-1 active heading + precise heading jump + app-restart spec scroll restore` = `EXISTS / MET`
`T6-2 comment relocation heuristic + marker detail UI` = `EXISTS / MET`
`T6-3 export reset + global comments organization/history` = `EXISTS / PARTIAL`
`T6-4 watcher tuning + guarded trackpad swipe UX` = `EXISTS / MET`, 단 low-risk tuning inconsistency 1건 존재
- 환경 드리프트 메모:
`_sdd/env.md`는 Node `20.x`를 primary로 적고 있지만, 이번 review evidence는 Node `25.2.1`에서 수집되었습니다. 따라서 “현재 worktree는 Node 25에서도 green”은 확인되지만, “문서화된 primary runtime에서의 동일 결과”는 별도 근거가 필요합니다.

## 4. Recommendations
- Must: global comments를 실제 문서/섹션 단위로 저장/복원/export할 수 있게 data shape를 분리하거나, 최소한 export 시 heading 단위 parse 결과를 명시적으로 구조화해 `T6-3` acceptance criteria를 닫으셔야 합니다.
- Should: export modal의 길이 추정 함수를 `includePreviouslyExportedComments` 상태까지 반영하도록 바꿔서 clipboard 가능 여부가 submit 전에 정확히 보이도록 정리하시는 편이 좋습니다.
- Could: native watcher가 runtime에 polling으로 degrade될 때도 `resolveWorkspaceWatchMode()`의 결과를 재사용해 polling interval heuristic을 통일하시면 watcher tuning 스토리가 더 일관됩니다.
- Could: `_sdd/env.md`의 primary runtime과 맞춘 Node `20.x` 환경에서 `npm test`, `npm run lint`, 가능하면 짧은 Electron manual smoke를 한 번 더 남기면 review 증거가 더 강해집니다.

## 5. Conclusion
현재 구현은 전반적으로 건강합니다. fresh verification 기준으로 `npm test`, `npm run lint`, `npm run dev` boot가 모두 통과했고, plan의 큰 축도 대부분 코드와 테스트로 닫혀 있습니다. 다만 이번 범위를 “계획 대비 완전 종료”로 판단하기에는 `T6-3`의 global comments organization이 아직 presentation-level 보조 기능에 머물러 있다는 점이 가장 큰 남은 gap입니다. 제 판단으로는 `Critical = 0`, `High = 1`, `Medium = 1`, `Low = 1`이며, 바로 다음 수정 우선순위는 `T6-3` semantic organization 보완입니다.
