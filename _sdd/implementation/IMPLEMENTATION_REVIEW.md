# Implementation Review: F45 문서 세션 통합 + Draft 기반 Spec View

**Review Date**: 2026-04-01
**Review Mode**: Tier 1 — feature draft Part 2 기반 full review
**Reference**: `/Users/hyunjoonlee/github/sdd-workbench/_sdd/drafts/feature_draft_f45_document_session_unification.md`
**Model**: GPT-5 Codex

## 1. Findings
### Critical (0)
- 없음

### High (1)
- `renameFileOrDirectory()`가 F45의 path-keyed document session contract를 끝까지 따라가지 못합니다. [workspace-context.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx#L2646)에서 rename 성공 후 갱신하는 값은 `activeFile`뿐인데, canonical runtime state는 [workspace-model.ts](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-model.ts#L71) 의 `activeFile`/`activeSpec` + `documentSessionsByPath` 조합입니다. 현재 구현대로면 열린 markdown/spec 파일이나 그 파일이 포함된 디렉터리를 rename할 때 `activeSpec`, `activeSpecContent`, `fileLastLineByPath`, `fileHistory`, `documentSessionsByPath`의 key가 모두 옛 경로에 남습니다. 결과적으로 rename 직후 Code/Spec 포인터가 갈라지고, renamed path는 기존 draft/save/conflict 연속성을 잃습니다.

### Medium (1)
- delete 경로도 path-keyed session 정리가 불완전합니다. [workspace-context.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx#L2555) 와 [workspace-context.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx#L2606) 는 삭제 후 `activeFile` 쪽만 비우고 `activeSpec`, `activeSpecContent`, `documentSessionsByPath`는 그대로 둡니다. 그래서 현재 spec panel이 삭제된 markdown를 보고 있는 경우, async reindex가 끝날 때까지 삭제된 문서가 계속 렌더되거나 spec-origin action이 stale path를 참조할 수 있습니다. F45가 문서 lifecycle의 source of truth를 path-keyed session으로 옮겼기 때문에, structural delete도 동일한 정리 규칙을 즉시 적용해야 합니다.

### Low (0)
- 없음

## 2. AC Verdicts
| AC ID | Description | Verdict | Evidence | Notes |
|-------|-------------|---------|----------|-------|
| AC1 | text/markdown 문서는 runtime document session에서 `savedContent`, `draftContent`, `saveState`를 함께 관리한다 | MET | [workspace-model.ts](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-model.ts#L10), [workspace-model.ts](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-model.ts#L59), [workspace-model.test.ts](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-model.test.ts#L479) | `DocumentSaveState`, `WorkspaceDocumentSession`, `documentSessionsByPath`와 transition helper가 구현됨 |
| AC2 | 동일 markdown 파일에서 Code 탭 수정 후 Spec 탭으로 전환하면 저장하지 않은 변경이 즉시 반영된다 | MET | [App.test.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/App.test.tsx#L5432) | same-path markdown draft 공유 integration test 통과 |
| AC3 | Code/Spec 탭 전환만으로 draft가 초기화되거나 저장되지 않는다 | MET | [code-editor-panel.test.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/code-editor/code-editor-panel.test.tsx#L1200), [App.test.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/App.test.tsx#L5499) | same-file prop echo가 undo history를 깨지 않음 |
| AC4 | 저장 성공 시 draft와 saved content가 동기화되고 `saveState='clean'`으로 복귀한다 | MET | [workspace-context.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx#L1405), [workspace-model.test.ts](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-model.test.ts#L507) | save success/failure transition이 구현 및 테스트됨 |
| AC5 | dirty 상태의 외부 파일 변경은 자동 reload 대신 `conflict`로 전환되고, 사용자에게 명시적 선택 UI를 제공한다 | MET | [workspace-context.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx#L3348), [App.test.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/App.test.tsx#L10029) | `conflict` 승격 + `Reload` / `Dismiss` 배너 검증됨 |
| AC6 | 파일/워크스페이스 전환, rename/delete guard는 동일한 save-state contract를 사용한다 | NOT MET | [workspace-context.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx#L1833), [workspace-context.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx#L2555), [workspace-context.tsx](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx#L2646) | workspace/file switch guard는 save-state 기반이지만, rename/delete는 path-keyed session과 active spec 정리가 미완성 |
| AC7 | runtime draft/session cache는 앱 재시작 snapshot에 저장되지 않는다 | MET | [workspace-persistence.test.ts](/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-persistence.test.ts#L73) | snapshot JSON에 `documentSessionsByPath` 미포함 |

## 3. Verification Summary

- 환경 확인:
  - `node -v` -> `v25.2.1`
  - `npm -v` -> `11.12.1`
- Fresh verification:
  - `npx vitest run src/workspace/workspace-model.test.ts src/workspace/workspace-persistence.test.ts src/code-editor/code-editor-panel.test.tsx src/spec-viewer/spec-viewer-panel.test.tsx src/App.test.tsx --reporter=dot` -> pass (`5 files, 293 passed, 1 skipped`)
  - `npx tsc --noEmit` -> pass
  - `npm test -- --reporter=dot` -> pass (`70 files, 798 passed, 1 skipped`)
- 테스트 기준으로 save-state, same-path draft sharing, external conflict, persistence exclusion은 모두 재현 및 통과했다.
- 다만 structural file operations(rename/delete)에서 path-keyed session continuity를 보장하는 검증은 부족했고, 코드 읽기 기준으로 실제 결함이 확인된다.

## 4. Progress Overview

- 구현의 핵심 축은 잘 들어갔다.
  - document session 모델
  - CodeMirror draft bridge
  - same-path markdown Code/Spec draft 공유
  - watcher dirty -> conflict 승격
  - runtime-only persistence exclusion
- fresh verification도 전체적으로 안정적이다.
- 남은 문제는 대부분 structural path mutation(rename/delete)에서 새 contract를 끝까지 밀어넣지 못한 부분이다.

## 5. Recommendations

### Must
- rename 성공 시 `activeSpec`, `activeSpecContent`, `fileLastLineByPath`, `fileHistory`, `documentSessionsByPath`를 함께 rewrite하는 path-migration helper를 추가해야 한다.
- delete 성공 시 삭제 경로와 관련된 `activeSpec` / `activeSpecContent` / `documentSessionsByPath`를 즉시 정리해야 한다.

### Should
- rename/delete regression test를 추가해 active markdown/spec + dirty/clean session이 structural mutation 뒤에도 일관되게 유지되는지 고정해야 한다.
- document session path migration/cleanup을 workspace-model helper로 끌어내려 context 분기 로직을 줄이는 편이 안전하다.

### Could
- conflict banner에서 `Dismiss`를 `Keep Draft`처럼 더 명시적인 문구로 바꾸면 save-state vocabulary가 UI까지 더 선명하게 이어진다.

## 6. Conclusion

F45 구현은 핵심 happy path 기준으로는 잘 완성됐고, fresh verification도 전체적으로 통과했다. 하지만 이번 기능의 본질이 "path-keyed document session을 source of truth로 삼는다"는 데 있는 만큼, rename/delete 같은 structural path mutation에서 그 contract가 유지되지 않는 현재 상태는 그대로 넘어가기 어렵다. 따라서 평가는 "대부분 구현 완료, 그러나 rename/delete lifecycle 결함으로 최종 완료 판정은 보류"가 적절하다.

## 7. Assumptions

- Tier 1 기준은 feature draft Part 2를 active contract로 사용했다.
- `_sdd/env.md`는 Node 20 / npm 10 권장을 적고 있지만, 이번 fresh verification은 Node 25.2.1 / npm 11.12.1에서 수행됐다. 현재 테스트는 모두 통과했지만, CI/배포 환경이 더 낮은 버전이라면 별도 확인이 필요하다.
