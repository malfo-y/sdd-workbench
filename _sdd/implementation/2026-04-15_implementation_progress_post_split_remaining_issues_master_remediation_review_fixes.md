# Implementation Progress: post_split_remaining_issues_master_remediation_review_fixes

**날짜**: 2026-04-15
**기반 입력**:
- `_sdd/implementation/2026-04-15_implementation_review_post_split_remaining_issues_master_remediation.md`
- `_sdd/drafts/2026-04-14_feature_draft_post_split_remaining_issues_master_remediation.md`
- `_sdd/spec/main.md`
- `_sdd/spec/comments-and-export/overview.md`
- `_sdd/spec/comments-and-export/contracts.md`

**Execution Mode**: sequential

| task_id | title | phase | dependencies | status | owner/sub-agent | notes |
|---|---|---|---|---|---|---|
| R1 | export modal bundle length 추정과 실제 export 집합을 일치시킨다 | review-fix | 없음 | completed | codex | `includePreviouslyExportedComments` 상태를 길이 추정과 clipboard disable 경로에 연결하고 regression test 추가 |
| R2 | native watcher fallback에도 tuned poll interval을 재사용한다 | review-fix | 없음 | completed | codex | start 시 계산한 `pollIntervalMs`를 native error fallback까지 전달하고 focused watcher regression test 추가 |
| R3 | global comments organization을 export가 실제로 소비하도록 구조화한다 | review-fix | R1 | completed | codex | markdown blob 저장은 유지하되 document/section parser를 도입해 export render와 modal detection이 같은 semantics를 사용하도록 정리 |

## Target Files

- [M] `src/code-comments/comment-export.ts`
- [M] `src/code-comments/comment-export.test.ts`
- [M] `src/code-comments/export-comments-modal.tsx`
- [M] `src/code-comments/export-comments-modal.test.tsx`
- [M] `src/code-comments/global-comments-modal.tsx`
- [M] `src/code-comments/global-comments-modal.test.tsx`
- [M] `src/hooks/use-comment-actions.ts`
- [M] `electron/workspace-watchers.ts`
- [C] `electron/workspace-watchers.test.ts`

## TDD Trace

- RED:
  - `ExportCommentsModal`에서 이미 export된 comment 포함 토글이 길이 추정/clipboard 경고에 반영되지 않는 회귀를 test로 고정
  - `comment-export`에서 global comments document/section organization parse + normalized render 기대값을 test로 고정
  - native watcher error 이후 polling fallback이 resolved interval을 재사용하는지를 focused test로 고정
- GREEN:
  - `estimateBundleLength()`가 `includePreviouslyExportedComments` 상태를 받아 실제 export snapshot과 같은 집합을 사용하도록 수정
  - `parseGlobalCommentsOrganization()`를 도입하고 export markdown/LLM bundle이 structured global comments section을 렌더링하도록 수정
  - `GlobalCommentsModal`의 detected organization UI가 parser 결과를 그대로 사용하도록 정리
  - `createNativeWorkspaceWatcherEntry()`에서 계산된 `pollIntervalMs`를 `switchToPollingFallback()`까지 전달하도록 수정
- REFACTOR:
  - global comments organization semantics를 quick-insert UI와 export renderer가 공유하도록 정리해 “작성 보조”와 “downstream 소비”가 분리되지 않게 고정

## Verification

- Focused regression:
  - `npm test -- src/code-comments/comment-export.test.ts src/code-comments/export-comments-modal.test.tsx src/code-comments/global-comments-modal.test.tsx electron/workspace-watchers.test.ts`
  - Result: PASS (`4` files, `36` tests)
- Quality gate:
  - `npm test`
  - Result: PASS (`79` files, `899 passed`, `1 skipped`)
  - `npm run lint`
  - Result: PASS
- Dev boot:
  - `npm run dev`
  - Result: Vite dev server + Electron bundles boot 확인
  - Note: CLI 세션이라 실제 Electron 창 내부 수동 smoke는 수행하지 못함

## Unplanned Dependencies

- `UNPLANNED_DEPENDENCY`: `electron/workspace-watchers.ts`
  - 이유: review low finding이 `workspace-watch-mode.ts` helper가 아니라 runtime native->polling fallback 구현 경로에 있었기 때문에, 실제 적용 위치를 직접 수정해야 했음
- `UNPLANNED_DEPENDENCY`: `electron/workspace-watchers.test.ts`
  - 이유: fallback interval reuse를 helper test만으로는 검증할 수 없어 runtime 경로를 고정하는 focused regression test를 추가했음

## Notes

- `_sdd/spec/` 아래 파일은 수정하지 않았습니다.
- 현재 워크트리는 다른 기능 작업 diff가 많아서, 이번 라운드는 review finding과 직접 연결된 파일만 수정했습니다.
- global comments source of truth는 여전히 `.sdd-workbench/global-comments.md` 단일 markdown 파일이지만, export/render 단계에서는 document/section 구조를 명시적으로 parse해 소비하도록 바뀌었습니다.
