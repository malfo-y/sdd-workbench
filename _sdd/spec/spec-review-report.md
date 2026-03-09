# Spec Review Report (Strict)

**Date**: 2026-03-02
**Reviewer**: Codex
**Scope**: Spec+Code
**Spec Files**:
- `_sdd/spec/main.md`
- `_sdd/spec/sdd-workbench/product-overview.md`
- `_sdd/spec/sdd-workbench/system-architecture.md`
- `_sdd/spec/sdd-workbench/component-map.md`
- `_sdd/spec/sdd-workbench/contract-map.md`
- `_sdd/spec/sdd-workbench/operations-and-validation.md`
- `_sdd/spec/sdd-workbench/appendix.md`
- `_sdd/spec/decision-log.md`
**Code State**: `b67423e` + dirty workspace (`electron/remote-agent/runtime/*` modified, temp/untracked files present)
**Decision**: SYNC_REQUIRED

## Executive Summary
핵심 기능 드리프트(동일 문서 anchor 이동, View Comments 내 global comments inline 편집/비우기, lazy subtree changed marker 버블링)는 스펙과 구현이 현재 정합합니다. 다만 운영/품질 게이트 섹션의 상태 표기가 현재 코드베이스 검증 결과와 불일치합니다. `npm test`는 통과(49 files, 490 passed, 1 skipped)했지만, `npm run lint`는 실패(43 errors)하여 스펙의 “lint pass” 진술과 충돌합니다. 기능 스펙 드리프트는 경미하나, 품질 상태 문서 드리프트가 있어 `SYNC_REQUIRED`로 판정합니다.

## Findings by Severity

### High
- 없음.

### Medium
1. 품질 게이트 상태가 현재 검증 결과와 불일치
   - Evidence:
     - `_sdd/spec/main.md:65` ("최신 품질 게이트 ... `npm run lint` -> pass")
     - `_sdd/spec/sdd-workbench/operations-and-validation.md:54-58` ("`npm run lint` -> pass")
     - 실제 실행: `npm run lint` 실패, 43 errors
     - 예시 에러: `electron/remote-agent/framing.ts:58` (`no-constant-condition`), `electron/workspace-backend/types.ts:67` (`no-explicit-any`), `src/code-editor/code-editor-panel.test.tsx:27` (`no-explicit-any`)
   - Impact:
     - 스펙이 품질 게이트 통과 상태를 과대 표기하여 릴리즈/계획 판단을 오도할 수 있음.
   - Recommendation:
     - `spec-update-done`로 품질 게이트 섹션을 최신 실행 결과 기준으로 갱신하고, "pass" 고정 문구 대신 실행 시점/커밋 기준 표기 규칙을 명시.

2. 자동 테스트 베이스라인 수치가 최신 상태와 불일치
   - Evidence:
     - `_sdd/spec/sdd-workbench/operations-and-validation.md:56` = `26 files, 360 passed, 1 skipped`
     - 실제 실행: `npm test` = `49 files, 490 passed, 1 skipped`
   - Impact:
     - 테스트 커버리지/회귀 신뢰도에 대한 문서 신뢰도 하락.
   - Recommendation:
     - 자동 게이트 수치 섹션을 최신 결과로 갱신하거나, 정적 수치 대신 "최근 실행 결과 링크/아티팩트 참조" 방식으로 전환.

### Low
1. 테스트는 통과하나 App 통합 테스트에서 반복 stderr 노이즈 존재
   - Evidence:
     - `npm test` 출력에서 `src/App.test.tsx` 여러 케이스 수행 중 `TypeError: textRange(...).getClientRects is not a function` 반복 출력
     - 최종 결과는 pass (`src/App.test.tsx (93 tests | 1 skipped)`)
   - Impact:
     - 실패가 아니어도 실제 회귀 신호가 로그 노이즈에 묻힐 수 있음.
   - Recommendation:
     - jsdom/CM6 테스트 환경에서 `getClientRects` 관련 폴리필/테스트 더블 보강 검토.

2. 리뷰 시점 코드 상태가 clean tree가 아님
   - Evidence:
     - `git status --short`: `electron/remote-agent/runtime/generated-payload.ts`, `watch-ops.ts`, `watch-ops.test.ts` 수정 + temp untracked 파일
   - Impact:
     - 리뷰 기준 상태(HEAD vs working tree) 혼선 가능.
   - Recommendation:
     - 스펙 검증 기준을 `HEAD`/`working tree` 중 하나로 명시하고, 릴리즈 전 clean tree 기준 재검증.

## Spec-Only Quality Notes
- Clarity:
  - 기능/컴포넌트 책임 기술은 명확함. 최근 반영(동일 문서 anchor, lazy marker 힌트, global comments inline edit)도 문장 충돌 없이 일관됨.
- Completeness:
  - 기능 수용 기준은 충분하나, 품질 게이트 섹션의 최신성 관리 규칙이 약함.
- Consistency:
  - 기능 행위 스펙은 구현과 대체로 일치. 품질 상태(pass/fail) 표기만 불일치.
- Testability:
  - 스모크 체크리스트/자동 게이트 섹션이 있어 검증 가능성은 높음.
- Structure:
  - `main.md` 허브 + 하위 문서 분리는 탐색성이 좋음. 링크 체크 결과 broken relative links는 발견되지 않음 (`BROKEN_LINKS:0`).

## Spec-to-Code Drift Notes
- Architecture:
  - same-document anchor in-panel 이동 구현 확인: `src/spec-viewer/spec-viewer-panel.tsx:556-616`
  - lazy subtree changed marker 힌트 구현 확인: `src/file-tree/file-tree-panel.tsx:87-124`, `src/workspace/workspace-context.tsx:233-261`, `src/workspace/workspace-context.tsx:505-508`
- Features:
  - View Comments global comments inline edit/clear/save 구현 확인: `src/code-comments/comment-list-modal.tsx:247-335`
  - App 저장 라우팅/배너 처리 확인: `src/App.tsx:741-760`
  - 대응 테스트 확인:
    - `src/spec-viewer/spec-viewer-panel.test.tsx:259-294`
    - `src/file-tree/file-tree-panel.test.tsx:182-292`
    - `src/code-comments/comment-list-modal.test.tsx:208-271`
- API:
  - 이번 리뷰 범위에서 계약 위반 증거 없음.
- Configuration:
  - `_sdd/env.md` 요구 절차에 따라 `node -v`, `npm -v`, `npm test`, `npm run lint` 실행함.
- Issues/Technical debt:
  - lint gate 실패 및 App 테스트 stderr 노이즈가 문서 운영 품질을 저해.

## Open Questions
1. 품질 게이트 섹션은 "마지막 로컬 실행" 기준으로 유지할지, "CI 기준"으로만 갱신할지?
2. lint 정책은 현재처럼 strict 유지 후 점진적 정리할지, 테스트 파일 일부 규칙 완화로 전환할지?

## Suggested Next Actions
1. `spec-update-done`로 `_sdd/spec/main.md`, `_sdd/spec/sdd-workbench/operations-and-validation.md`의 품질 게이트 상태를 최신 실행 결과로 동기화.
2. lint 오류(43건) 정리 계획을 수립하고, 완료 전에는 스펙에 lint pass를 고정 문구로 표기하지 않도록 정책화.
3. clean working tree 기준으로 최종 게이트(`npm test`, `npm run lint`, 필요시 `npm run build`)를 재실행해 릴리즈 기준선 확정.

## Decision Log Follow-ups (Proposal Only)
- Proposed entry: 품질 게이트 문서화 기준 명확화
  - Context:
    - 스펙의 품질 게이트(pass) 표기와 실제 실행 결과가 주기적으로 불일치.
  - Decision:
    - 품질 게이트 섹션은 실행 시점/커밋/명령 결과를 함께 표기하고, 실패 항목을 숨기지 않는다.
  - Rationale:
    - 문서 신뢰성 확보 및 릴리즈 판단 오류 방지.
  - Alternatives considered:
    - pass 상태만 수동 갱신(간편하지만 신뢰성 낮음)
  - Impact / follow-up:
    - `spec-update-done` 시 품질 게이트 섹션 갱신 체크를 기본 절차로 포함.

## Handoff for Spec Updates (if SYNC_REQUIRED)
- Recommended command: `spec-update-done`
- Update priorities:
  - P1: 품질 게이트 pass/fail 상태 최신화(`main.md`, `operations-and-validation.md`)
  - P2: 자동 게이트 수치(파일/테스트 건수) 최신화
  - P3: 품질 게이트 표기 정책(로컬/CI 기준) 명문화
