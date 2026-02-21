# Spec Review Report (Strict)

**Date**: 2026-02-21
**Reviewer**: Codex
**Scope**: Spec+Code
**Spec Files**: `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md`, `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/DECISION_LOG.md`
**Code State**: `2f094bc` (clean working tree)
**Decision**: SYNC_REQUIRED

## Executive Summary
전체적으로 스펙은 현재 코드(F10.2 포함)와 매우 높은 정합성을 유지하고 있고, 테스트/린트/빌드 게이트도 통과했다(`npm test`: 133 passed, `npm run lint`: pass, `npm run build`: pass). 다만 `workspace:watchEvent` IPC payload 문서가 코드의 실제 계약(`hasStructureChanges`)을 반영하지 못해 API 드리프트 1건이 확인되었다. 다음 구현/문서 작업 전 이 항목만 동기화하면 릴리스 기준 문서 품질로 볼 수 있다.

## Findings by Severity

### High
- 없음.

### Medium
1. `workspace:watchEvent` IPC payload 문서가 구조 변경 플래그(`hasStructureChanges`)를 누락함.
   - Evidence: `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md:429`에는 `{ workspaceId, changedRelativePaths[] }`로만 명시되어 있음.
   - Evidence: `/Users/hyunjoonlee/github/sdd-workbench/electron/main.ts:91`의 payload 타입과 `/Users/hyunjoonlee/github/sdd-workbench/electron/main.ts:624` 송신 로직은 `hasStructureChanges`를 포함함.
   - Evidence: `/Users/hyunjoonlee/github/sdd-workbench/electron/preload.ts:46` 및 `/Users/hyunjoonlee/github/sdd-workbench/electron/electron-env.d.ts:67`에서도 `hasStructureChanges?: boolean` 계약을 노출함.
   - Evidence: `/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx:942`~`/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx:994`에서 해당 플래그로 구조 refresh(`loadWorkspaceIndex(..., 'refresh')`)를 수행함.
   - Impact: 스펙만 보고 구현/리뷰할 경우 구조 변경 refresh 트리거를 누락할 수 있고, watcher 관련 회귀 테스트/디버깅에서 오판 가능성이 생김.
   - Recommendation: `spec-update-done`로 IPC 표(9.2)와 watcher 신뢰성 메모를 `hasStructureChanges` 포함 계약으로 동기화.

### Low
- 없음.

## Spec-Only Quality Notes
- Clarity: 전반적으로 좋음. 기능별 상태/규칙/완료 기준이 명시적임.
- Completeness: F01~F10.2 범위와 수용 기준이 상세함.
- Consistency: 대체로 일관적이며, 주요 불일치는 IPC payload 1건.
- Testability: 파일/테스트 단위 수치와 게이트가 명시되어 검증 가능성이 높음.
- Structure: 인벤토리/상태 모델/IPC/수용 기준 구조가 탐색 가능함.

## Spec-to-Code Drift Notes
- Architecture: 정합 (F10.2 이미지 프리뷰 + 복원/종료 안정화가 코드/스펙에 반영됨).
- Features: 정합 (F10.2 관련 상태/동작/수용 기준 반영됨).
- API: **부분 드리프트** (`workspace:watchEvent` payload 문서 누락).
- Configuration: 큰 드리프트 없음.
- Issues/Technical debt: 이미지 프리뷰 고급 UX(줌/패닝/추가 포맷)는 backlog로 명시되어 일관적임.

## Open Questions
1. 없음 (현 시점에서 추가 의사결정 필요 항목 없음).

## Suggested Next Actions
1. `spec-update-done`로 `workspace:watchEvent` payload 명세에 `hasStructureChanges?: boolean`를 반영한다.
2. 동일 수정에서 watcher 신뢰성 섹션(구조 변경 refresh 트리거 설명)도 함께 보강한다.
3. 반영 후 `spec-summary`로 최종 상태를 갱신 확인한다.

## Decision Log Follow-ups (Proposal Only)
- Proposed entry: `2026-02-21 - watcher 이벤트 payload 문서 계약 동기화`
  - Context:
    - 코드(preload/env/context)에서 `workspace:watchEvent.hasStructureChanges`를 사용 중이나 spec IPC 표에는 누락됨.
  - Decision:
    - `workspace:watchEvent` 표준 payload를 `{ workspaceId, changedRelativePaths[], hasStructureChanges? }`로 고정한다.
  - Rationale:
    - 구조 변경 refresh 신호를 계약에 명시해야 watcher 동작을 정확히 재구현/검증할 수 있다.
  - Alternatives considered:
    - 문서는 단순화하고 코드 동작만 유지
  - Impact / follow-up:
    - `main.md` IPC 섹션과 watcher 신뢰성 설명을 동기화한다.

## Handoff for Spec Updates (if SYNC_REQUIRED)
- Recommended command: `spec-update-done`
- Update priorities:
  - P1: `workspace:watchEvent` payload 표 업데이트 (`hasStructureChanges?: boolean` 추가)
  - P2: watcher 신뢰성 설명에 구조 변경 refresh 경로 반영
  - P3: 없음
