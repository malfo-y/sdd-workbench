# Implementation Report: post_split_routed_handler_factory

**날짜**: 2026-04-14
**기반 논의**: `_sdd/discussion/2026-04-14_discussion_post_split_remaining_issues_prioritization.md`
**관련 리뷰 항목**: `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md` `D1`

## 완료 작업

1. `electron/workspace-ipc-routing.ts`의 rootPath 기반 routed handler 반복을 `createRoutedWorkspaceHandler(...)` 공통 팩토리로 통합했습니다.
2. 기존 public export 이름(`handleWorkspace*Routed`)과 반환 shape는 유지하고, 각 handler별 fallback message는 이전 계약과 동일하게 고정했습니다.
3. `handleWorkspaceWatchStopRouted`는 `workspaceId -> remote rootPath` 분기라는 예외 경로가 있어서 별도 구현으로 유지했습니다.
4. `electron/workspace-ipc-routing.test.ts`를 추가해 성공 라우팅, fallback shape, remote `watchStop`, validation error를 회귀 테스트로 고정했습니다.

## 변경 파일

- `electron/workspace-ipc-routing.ts`
- `electron/workspace-ipc-routing.test.ts`
- `_sdd/implementation/2026-04-14_implementation_progress_post_split_routed_handler_factory.md`

## 검증 결과

### Focused

- `npm test -- electron/workspace-ipc-routing.test.ts`
  - 결과: PASS
  - 세부: `1 file`, `4 tests`

### Full Gate

- `npm test`
  - 결과: PASS
  - 세부: `73 files`, `858 passed`, `1 skipped`

- `npm run lint`
  - 결과: PASS

## 리스크 / 후속 작업

- 이번 변경은 `D1` 내부 반복 제거까지만 닫았습니다. 다음 구조 정리 후보인 `workspaceId` 기반 예외 라우팅(`watchStop`, remote connect/disconnect 계열)을 더 일반화할지는 별도 task로 다루는 편이 안전합니다.
- 토론 문서 기준 다음 우선 후보는 `workspace-context`가 아니라 `main routed handler` 다음 구조 묶음 범위 재점검입니다. 상태 의미를 건드리는 `A1~A5`는 아직 시작하지 않았습니다.
