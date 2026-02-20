# IMPLEMENTATION_PROGRESS

## 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F04)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4, T5` (completed)
  - Phase 3: `T6` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | Markdown 렌더 의존성/유틸 도입 | P0 | - | completed | `markdown-utils.test.ts` pass |
| T2 | `activeSpec` 워크스페이스 상태 확장 | P0 | - | completed | `workspace-model.test.ts` pass |
| T3 | SpecViewerPanel 구현 (rendered + TOC) | P0 | T1 | completed | `spec-viewer-panel.test.tsx` pass |
| T4 | App dual view 통합 및 컨텍스트 연결 | P0 | T2, T3 | completed | `App.test.tsx` F04 시나리오 pass |
| T5 | 우측 패널 스타일링/레이아웃 정리 | P1 | T4 | completed | `npm run lint`, `npm run build` pass |
| T6 | 단위/통합 테스트 보강 및 회귀 고정 | P0 | T2, T3, T4 | completed | `npm test` 전체 pass |

## 2) Files Changed

- `_sdd/implementation/IMPLEMENTATION_PLAN.md` (new)
- `package.json`
- `package-lock.json`
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-context.tsx`
- `src/workspace/workspace-model.test.ts`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `src/spec-viewer/markdown-utils.ts` (new)
- `src/spec-viewer/spec-viewer-panel.tsx` (new)
- `src/spec-viewer/markdown-utils.test.ts` (new)
- `src/spec-viewer/spec-viewer-panel.test.tsx` (new)

## 3) Tests Added/Updated and Pass Status

- Added:
  - `src/spec-viewer/markdown-utils.test.ts`
  - `src/spec-viewer/spec-viewer-panel.test.tsx`
- Updated:
  - `src/workspace/workspace-model.test.ts` (`activeSpec` 분리 정책)
  - `src/App.test.tsx` (F04 dual view + workspace별 activeSpec 복원)
- Execution status:
  - `npm test`: pass (`32 passed`)
  - `npm run lint`: pass
  - `npm run build`: pass

## 4) Parallel Groups Executed

- Batch A: `T1`, `T2` (순차 실행; `workspace-context.tsx` 연계 검증 필요로 단일 세션 처리)
- Batch B: `T3` (T1 이후)
- Batch C: `T4 -> T5` (UI 결합 파일 순차 처리)
- Batch D: `T6` (T2/T3/T4 완료 후 통합 검증)

## 5) Blockers and Decisions Needed

- Blocker:
  - 없음
- Decisions applied:
  - F04는 `activeSpec`만 워크스페이스 세션으로 복원
  - TOC/스크롤/active heading 복원은 제외
  - 링크 인터셉트는 제외(F05 범위)

## 6) Next Task(s)

1. 사용자 수동 스모크: `.md` 선택 시 center(raw)+right(rendered) 동작 확인
2. 필요 시 `implementation-review`로 F04 수용 기준 검증
3. 검증 완료 후 `spec-update-done`으로 F04 상태 동기화

---

## F04.1 Addendum (2026-02-20)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f04_1_markdown_link_intercept_copy_popover.md` (Part 2)
- Covered tasks:
  - Phase 1: `1, 2` (completed)
  - Phase 2: `3, 4, 5` (completed)
  - Phase 3: `6, 7` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| 1 | 링크 해석/분류 유틸 구현 | P0 | - | completed | `spec-link-utils.test.ts` pass |
| 2 | SpecViewerPanel 링크 인터셉트 연결 | P0 | 1 | completed | `spec-viewer-panel.test.tsx` pass |
| 3 | 링크 주소 복사 popover 구현 | P1 | 2 | completed | `spec-viewer-panel.test.tsx` pass |
| 4 | App/Workspace 연동 (same-workspace open + banner) | P0 | 2,3 | completed | `App.test.tsx` pass |
| 5 | popover/링크 상태 스타일링 | P2 | 3 | completed | `npm run lint` pass |
| 6 | 단위 테스트: 링크 해석/분류/경계검증 | P0 | 1 | completed | `spec-link-utils.test.ts` pass |
| 7 | 통합 테스트: 클릭 정책/상태 비회귀 | P0 | 2,3,4,5,6 | completed | `App.test.tsx`, `spec-viewer-panel.test.tsx` pass |

### 2) Files Changed (F04.1)

- `src/spec-viewer/spec-link-utils.ts` (new)
- `src/spec-viewer/spec-link-utils.test.ts` (new)
- `src/spec-viewer/spec-link-popover.tsx` (new)
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_1.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_2.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_3.md`

### 3) Test and Quality Gate Status (F04.1)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: up to date
- `npm test`: pass (`46 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F04.1)

- Group A (sequential fallback): `1 -> 2`
  - Reason: `spec-viewer-panel.tsx`가 resolver 결과를 즉시 소비
- Group B (sequential fallback): `3 -> 4 -> 5`
  - Reason: popover 상태/스타일/App wiring이 동일 UX 경로에서 결합
- Group C: `6` and `7`
  - `6`(resolver unit tests) 선행 후 `7`(panel/app integration)으로 확장

### 5) Blockers and Decisions (F04.1)

- Blockers: 없음
- Applied decisions:
  - same-workspace 상대 링크는 `selectFile` 경로로 열린다.
  - external/unresolved 링크는 자동 이동하지 않고 popover + banner로 처리한다.
  - same-document `#anchor` 링크는 기본 스크롤 동작을 허용한다.
