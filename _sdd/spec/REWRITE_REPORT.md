## Rewrite Summary
- Target document: `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md`
- Execution timestamp: `2026-02-20`
- Key changes:
  - F04~F07 구간을 멀티 워크스페이스(`active workspace`) 기준으로 재정렬
  - 링크/경로 파싱 규칙을 단일 `workspaceRoot` 표현에서 `active workspace rootPath` 기준으로 명확화
  - watcher IPC payload에 `workspaceId`를 명시해 세션 오염 가능성 축소
  - F04~F07 영향 이슈를 `리스크` + `Open Questions`로 분리

## What Was Pruned or Moved
- 중복/모호 표현 정리:
  - F04~F07에서 다중 워크스페이스에 대한 암묵적 가정을 제거하고 명시 규칙으로 통일
- Appendix 이동:
  - 없음 (이번 리라이트는 파일 분할 없이 핵심 섹션 정밀 정리에 집중)

## File Split Map
- 유지:
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md` (index + 실행 기준)
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/DECISION_LOG.md`
- 신규:
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/REWRITE_REPORT.md`
- 비고:
  - 파일 분할은 보류. F04~F07 이후 문서가 다시 비대해지면 `main/` 하위 분할을 재검토.

## Ambiguities and Issues
- [P0] [Ambiguous Requirement] F04에서 워크스페이스별로 복원할 문서 상태 범위(`activeSpec`만 vs 스크롤/activeHeading 포함)가 미확정.
  - Suggested resolution: F04 draft에서 복원 범위를 명시하고 테스트 케이스를 고정.
- [P0] [Ambiguous Requirement] F05 링크가 활성 워크스페이스에서 해석 실패할 때 UX(오류만 vs 보조 탐색 액션)가 미확정.
  - Suggested resolution: MVP는 오류 피드백 우선, 보조 탐색은 후속 feature로 분리.
- [P1] [Missing Acceptance Criteria] F07 watcher 시작/종료 타이밍 정책이 수용 기준에 구체 수치(시점/해제 조건)로 고정되지 않음.
  - Suggested resolution: `openWorkspace` 즉시 시작 + `closeWorkspace` 즉시 정리 기준을 기본안으로 채택.
- [P2] [Outdated Claim Risk] 일부 F04~F07 예정 파일 목록은 실제 구현 시 컨텍스트/모델 파일 추가 변경 가능성이 큼.
  - Suggested resolution: 각 feature-draft에서 Target Files를 재계산.

## Decision Log Additions
- Entry title: `2026-02-20 - F04~F07 멀티 워크스페이스 영향 기준 리라이트`
- Why this was recorded:
  - F03.5 완료 이후 후속 기능(F04~F07)의 기준 축을 `active workspace`로 고정해 스펙 해석 충돌을 줄이기 위함.

## Resolution Update (2026-02-20)
- F04 복원 범위: `activeSpec`만 복원으로 확정.
- F05 링크 해석 실패 UX: 오류만 표시로 확정.
- F07 watcher 시작 정책: `openWorkspace` 즉시 시작으로 확정.
- F06/F08 guard 전략: 기능별 개별 구현으로 확정.
