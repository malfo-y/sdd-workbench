# Pipeline Report: 코드 리팩토링 로드맵

## Summary

- 기간: 2026-04-14
- 결과: completed
- 범위: Phase 0 quick fixes + Phase 1~4 monolith split + phase review/fix + final integration review + spec sync

## Key Outcomes

- `src/spec-viewer/spec-viewer-panel.tsx`를 comment marker / highlighted block / scroll / helper 모듈로 분리
- `electron/main.ts`를 shared IPC types, workspace utils/indexing/handlers/watchers/routing 구조로 분리
- `src/App.tsx`를 comment/history/external-app/pane-resize hook과 shell helper 구조로 분리
- `src/workspace/workspace-context.tsx`를 comments / file operations / git decorations / remote / watcher / snapshot hook 구조로 분리
- tracked IPC helper(`src/workspace/ipc-call-helper.ts`)와 workspace tree/state helper를 도입

## Exit Evidence

- `npm run lint` passed
- `npm test` passed
- latest test gate: 71 files passed, 838 passed / 1 skipped

## Final State

- `src/spec-viewer/spec-viewer-panel.tsx`: `2246 -> 1362`
- `electron/main.ts`: `3507 -> 424`
- `src/App.tsx`: `2627 -> 922`
- `src/workspace/workspace-context.tsx`: `3683 -> 741`

## Spec Sync

- `_sdd/spec/main.md`에 boundary-oriented split + shared IPC type module 결정을 반영
- `_sdd/spec/decision-log.md`에 refactoring roadmap 완료 결정을 기록
