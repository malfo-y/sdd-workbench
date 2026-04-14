# IMPLEMENTATION_PROGRESS

## 1) Scope Covered

- Active input: `_sdd/implementation/2026-04-14_implementation_review_code_refactoring_review_strategy.md`
- Execution mode: sequential fallback
- Reason:
  - `shortcut` 수정은 `src/hooks/use-history-navigation.ts`와 `src/App.test.tsx`가 직접 결합됩니다.
  - `watch fallback` 수정은 `use-workspace-remote.ts`, `use-workspace-watcher.ts`, `src/App.test.tsx`가 같은 사용자 계약을 공유합니다.

| ID | Task | Phase | Dependencies | Status | Owner | Notes |
|----|------|-------|--------------|--------|-------|-------|
| R1 | `Cmd+Shift` 탭/워크스페이스 단축키 계약 복원 | 1 | - | completed | codex | 테스트를 먼저 `Cmd+Shift` 기준으로 전환 후 구현 수정 |
| R2 | local watcher fallback이 `REMOTE` 상태처럼 보이지 않도록 수정 | 1 | R1와 독립이나 동일 회귀 세트 | completed | codex | fallback event에서 기존 session `isRemoteMounted` 유지 |
| R3 | `watchStart` fallback 배너 5초 auto-dismiss 복원 | 1 | R2와 동일 회귀 세트 | completed | codex | initial fallback 경로에도 remote banner dismiss 타이머 적용 |

## 2) Target Files

- [M] `src/hooks/use-history-navigation.ts`
- [M] `src/workspace/use-workspace-watcher.ts`
- [M] `src/workspace/use-workspace-remote.ts`
- [M] `src/App.test.tsx`

## 3) TDD Trace

- RED:
  - `src/App.test.tsx`에서 `Cmd+Shift+Left/Right`, `Cmd+Shift+Up/Down`만 정답으로 인정하도록 수정
  - local fallback 시 `REMOTE` 배지가 없어야 한다는 테스트 추가
  - `watchStart` fallback 배너 auto-dismiss 테스트 추가
- GREEN:
  - `use-history-navigation.ts`를 `metaKey + shiftKey` 기준으로 변경
  - `use-workspace-watcher.ts`가 fallback event 처리 시 `isRemoteMounted`를 강제로 `true`로 바꾸지 않도록 수정
  - `use-workspace-remote.ts`가 `fallbackApplied` 경로에서도 5초 dismiss 타이머를 잡도록 수정
- REFACTOR:
  - broader IPC payload 확장 없이 renderer session state를 보존하는 쪽으로 최소 수정

## 4) Verification

- Focused regression:
  - `npm test -- src/App.test.tsx` -> pass (`157 tests | 1 skipped`)
- Quality gate:
  - `npm test` -> pass (`71 files`, `840 passed`, `1 skipped`)
  - `npm run lint` -> pass

## 5) Unplanned Dependencies

- 없음

## 6) Notes

- `_sdd/spec/` 아래 파일은 수정하지 않았습니다.
- 현재 워크트리는 사용자가 진행 중인 대규모 리팩토링 변경이 이미 섞여 있으므로, 이번 라운드는 지정 리뷰 항목 관련 파일만 수정했습니다.
