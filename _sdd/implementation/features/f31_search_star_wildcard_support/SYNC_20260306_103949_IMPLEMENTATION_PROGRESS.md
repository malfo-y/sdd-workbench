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

---

## F05 Addendum (2026-02-20)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F05)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4, T5` (completed)
  - Phase 3: `T6, T7, T8` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | 링크 라인 해시 파싱 확장 (`#Lx`, `#Lx-Ly`) | P0 | - | completed | `spec-link-utils.test.ts` pass |
| T2 | parser 단위 테스트 보강 | P0 | T1 | completed | `spec-link-utils.test.ts` pass |
| T3 | SpecViewerPanel 콜백 계약 확장(lineRange 전달) | P0 | T1 | completed | `spec-viewer-panel.test.tsx` pass |
| T4 | App 링크 액션 오케스트레이션(file open + range + jump request) | P0 | T3 | completed | `App.test.tsx` pass |
| T5 | CodeViewer jump 스크롤 동작 추가 | P1 | T4 | completed | `code-viewer-panel.test.tsx` pass |
| T6 | SpecViewerPanel 링크-라인 상호작용 테스트 | P0 | T3 | completed | `spec-viewer-panel.test.tsx` pass |
| T7 | CodeViewer jump 동작 테스트 | P1 | T5 | completed | `code-viewer-panel.test.tsx` pass |
| T8 | App 통합 테스트(F05 + 멀티 워크스페이스 회귀) | P0 | T4,T5,T6 | completed | `App.test.tsx` pass |

### 2) Files Changed (F05)

- `src/spec-viewer/spec-link-utils.ts`
- `src/spec-viewer/spec-link-utils.test.ts`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_1.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_2.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_3.md`

### 3) Test and Quality Gate Status (F05)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: up to date
- `npm test`: pass (`53 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F05)

- Group A: `T1 -> T2` (parser + parser tests, same file overlap)
- Group B: `T3 -> T4` (SpecViewer callback contract + App wiring)
- Group C: `T5 -> T7` (CodeViewer jump + unit test)
- Group D: `T6 -> T8` (panel/app integration regression)

### 5) Blockers and Decisions (F05)

- Blockers: 없음
- Applied decisions:
  - non-line hash(`path#heading`)는 파일 열기만 수행하고 lineRange는 `null` 처리
  - line jump는 active workspace 파일 집합에서만 처리
  - `scrollIntoView`는 지원 환경에서만 best-effort 호출

---

## F06 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F06)
- Covered tasks:
  - Phase 1: `T1, T2, T3` (completed)
  - Phase 2: `T4` (completed)
  - Phase 3: `T5` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | 툴바 컴포넌트 도입 및 헤더 연결 | P0 | - | completed | `context-toolbar.test.tsx` pass |
| T2 | 복사 payload 유틸 구현 | P0 | - | completed | `copy-payload.test.ts` pass |
| T3 | 툴바 컴포넌트 테스트 추가 | P1 | T1 | completed | `context-toolbar.test.tsx` pass |
| T4 | App 클립보드 오케스트레이션 + 가드/피드백 연결 | P0 | T1, T2 | completed | `App.test.tsx` pass |
| T5 | App 통합 테스트(F06 포맷/가드/멀티 워크스페이스) | P0 | T4 | completed | `App.test.tsx` pass |

### 2) Files Changed (F06)

- `src/toolbar/context-toolbar.tsx` (new)

---

## F29/F30 Addendum (2026-03-06)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f29_f30_file_tree_and_spec_search.md` (Part 2)
- Covered tasks:
  - Phase 1: `1, 2, 3` (completed)
  - Phase 2: `4` (completed)
  - Phase 3: `5, 6` (completed)
  - Phase 4: `7, 8` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| 1 | `workspace:searchFiles` 타입/bridge/contract 정의 | P0 | - | completed | backend/local/remote integration tests pass |
| 2 | 로컬 backend 파일명 검색 구현 | P0 | 1 | completed | `electron/workspace-search.test.ts` pass |
| 3 | remote runtime + remote backend 검색 구현 | P0 | 1 | completed | runtime/request router/security tests pass |
| 4 | WorkspaceContext 액션 + FileTreePanel 검색 UI/결과 렌더 | P0 | 1,2,3 | completed | `src/file-tree/file-tree-panel.test.tsx` pass |
| 5 | SpecViewerPanel 검색 상태/블록 하이라이트/이동 구현 | P0 | - | completed | `src/spec-viewer/spec-viewer-panel.test.tsx` pass |
| 6 | App Shell hotkey 게이트 + Spec 활성 상태 연결 | P1 | 5 | completed | `src/App.test.tsx` regression pass |
| 7 | backend/runtime/file-tree 검색 테스트 추가 | P0 | 2,3,4 | completed | targeted backend/runtime suites pass |
| 8 | spec 검색 테스트 추가 | P0 | 5,6 | completed | spec viewer suite pass |

### 2) Baseline

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm test`: pass (`52 files, 526 passed, 1 skipped`)

### 3) Final Verification

- Targeted suites:
  - `npx vitest run electron/workspace-search.test.ts electron/workspace-backend/local-workspace-backend.test.ts electron/workspace-backend/backend-integration.test.ts electron/workspace-backend/remote-workspace-backend.test.ts electron/remote-agent/security.test.ts electron/remote-agent/runtime/workspace-ops.test.ts electron/remote-agent/runtime/request-router.test.ts`
  - `npx vitest run src/file-tree/file-tree-panel.test.tsx`
  - `npx vitest run src/spec-viewer/spec-viewer-panel.test.tsx`
- Full regression:
  - `npm test`: pass (`53 files, 537 passed, 1 skipped`)

### 4) Parallelization Plan

- Group A (Phase 1): `1`
- Group B (Phase 1, after 1): `2` + `3`
- Group C (Phase 2/3 병렬 가능): `4` + `5`
- Group D (Phase 3 후속): `6`
- Group E (Validation): `7` + `8`

### 5) Applied Decisions

- 파일 브라우저 검색 기본 depth limit는 `20`
- 파일 브라우저 검색 기본 time budget은 `2000ms`
- 스펙 검색은 인라인 단어 하이라이트 없이 블록 단위 강조만 지원
- 파일 브라우저 검색은 lazy-loaded 트리 상태와 분리된 backend 탐색으로 처리
- 대형 디렉터리 skip/결과 cap/time budget 메타데이터를 UI 힌트로 노출
- 스펙 검색 핫키는 `SpecViewerPanel`이 active일 때만 가로채고, 블록 강조는 `data-source-line` DOM marker를 재사용

---

## F31 Addendum (2026-03-06)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f31_search_star_wildcard_support.md` (Part 2)
- Covered tasks:
  - Phase 1: `1, 2` (completed)
  - Phase 2: `3, 4` (completed)
  - Phase 3: `5, 6` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| 1 | 파일 브라우저 wildcard matcher 구현 | P0 | - | completed | `electron/workspace-search.test.ts`, `electron/remote-agent/runtime/workspace-ops.test.ts` pass |
| 2 | 스펙 검색 wildcard matcher helper 구현 | P0 | - | completed | `src/spec-viewer/spec-search.test.ts` pass |
| 3 | 파일 브라우저 검색 UI discoverability 반영 | P1 | 1 | completed | `src/file-tree/file-tree-panel.test.tsx` pass |
| 4 | 스펙 뷰어 wildcard matcher 통합 | P0 | 2 | completed | `src/spec-viewer/spec-viewer-panel.test.tsx` pass |
| 5 | backend/runtime wildcard 회귀 테스트 추가 | P0 | 1 | completed | backend/runtime targeted suites pass |
| 6 | renderer wildcard 회귀 테스트 추가 | P0 | 3, 4 | completed | renderer targeted suites pass |

### 2) Files Changed

- `electron/workspace-search.ts`
- `electron/workspace-search.test.ts`
- `electron/workspace-backend/backend-integration.test.ts`
- `electron/workspace-backend/remote-workspace-backend.test.ts`
- `electron/remote-agent/runtime/workspace-ops.test.ts`
- `src/file-tree/file-tree-panel.tsx`
- `src/file-tree/file-tree-panel.test.tsx`
- `src/spec-viewer/spec-search.ts` (new)
- `src/spec-viewer/spec-search.test.ts` (new)
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`

### 3) Final Verification

- `node -v` -> `v25.2.1`
- `npm -v` -> `11.7.0`
- `npx vitest run electron/workspace-search.test.ts electron/workspace-backend/backend-integration.test.ts electron/workspace-backend/remote-workspace-backend.test.ts electron/remote-agent/runtime/workspace-ops.test.ts src/file-tree/file-tree-panel.test.tsx src/spec-viewer/spec-viewer-panel.test.tsx src/spec-viewer/spec-search.test.ts` -> pass (`7 files, 77 passed`)
- `npx tsc --noEmit` -> pass
- `npm test` -> pass (`54 files, 546 passed, 1 skipped`)

### 4) Applied Decisions

- wildcard 범위는 `*` 하나만 지원한다.
- 매칭 방식은 strict glob이 아니라 case-insensitive ordered token match다.
- non-wildcard 문자가 없는 query(`*`, `**`)는 empty query로 취급한다.
- 파일 브라우저 wildcard는 `fileName` 기준만 확장하고 `relativePath` glob은 제외한다.
- 스펙 뷰어 wildcard는 raw markdown 같은 line 안에서만 매칭하고, 기존 block highlight/navigation 모델을 유지한다.
- 두 검색 입력 모두 placeholder에 `(* supported)`를 추가해 최소 수준의 discoverability를 제공한다.

---

## F06.1 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F06.1)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5` (completed)
  - Phase 4: `T6, T7` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | 복사 payload 유틸 확장 (selected content 본문 추출) | P0 | - | completed | `copy-payload.test.ts` pass |
| T2 | 공통 컨텍스트 복사 popover 컴포넌트 구현 | P0 | - | completed | `copy-action-popover.test.tsx` pass |
| T3 | CodeViewer 우클릭 정책 + popover 액션 연결 | P0 | T1,T2 | completed | `code-viewer-panel.test.tsx` pass |
| T4 | FileTree 파일 우클릭 popover 액션 연결 | P0 | T2 | completed | `file-tree-panel.test.tsx` pass |
| T5 | App 클립보드 콜백 통합 및 실패 배너 연결 | P0 | T3,T4 | completed | `App.test.tsx` pass |
| T6 | 단위/컴포넌트 테스트 추가 | P0 | T1,T2,T3,T4 | completed | unit/component suites pass |
| T7 | App 통합 테스트(우클릭 복사 + 멀티 워크스페이스 회귀) | P0 | T5,T6 | completed | `App.test.tsx` pass |

### 2) Files Changed (F06.1)

- `src/context-copy/copy-payload.ts`
- `src/context-copy/copy-payload.test.ts`
- `src/context-menu/copy-action-popover.tsx` (new)
- `src/context-menu/copy-action-popover.test.tsx` (new)
- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`
- `src/file-tree/file-tree-panel.tsx`
- `src/file-tree/file-tree-panel.test.tsx` (new)
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_1.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_2.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_3.md`

### 3) Test and Quality Gate Status (F06.1)

- `npm test`: pass (`77 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F06.1)

- Group A: `T1`, `T2` (순차 실행; 공통 popover API 설계 고정 후 payload 재사용 지점 정렬)
- Group B: `T3`, `T4` (파일 충돌 없음, 구현은 순차로 통합 검증)
- Group C: `T5` (App wiring 단일 경로)
- Group D: `T6 -> T7` (테스트 확장 후 통합 회귀)

### 5) Blockers and Decisions (F06.1)

- Blockers: 없음
- Applied decisions:
  - relative path 복사 정책을 유지하고 절대경로 옵션은 제외
  - CodeViewer 우클릭 정책은 범위 안 유지 / 범위 밖 단일 선택 전환으로 고정
  - FileTree 우클릭은 active file을 변경하지 않고 복사 액션만 수행
  - dismiss 규칙은 외부 클릭/ESC/액션 완료로 통일

---

## F06.2 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F06.2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5, T6` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | CodeViewer drag selection 상태/이벤트 추가 | P0 | - | completed | `code-viewer-panel.test.tsx` pass |
| T2 | CodeViewer 우클릭 `Copy Both` 액션 추가 | P0 | T1 | completed | `code-viewer-panel.test.tsx` pass |
| T3 | App 복사 콜백 재배선 (`Copy Both`) | P0 | T2 | completed | `App.test.tsx` pass |
| T4 | ContextToolbar 제거 및 헤더 정리 | P0 | T3 | completed | `App.test.tsx` pass |
| T5 | FileTree 디렉터리 우클릭 경로 복사 | P0 | - | completed | `file-tree-panel.test.tsx` pass |
| T6 | 테스트 보강/회귀 검증 | P0 | T1,T2,T3,T4,T5 | completed | full suite/lint/build pass |

### 2) Files Changed (F06.2)

- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`
- `src/file-tree/file-tree-panel.tsx`
- `src/file-tree/file-tree-panel.test.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/App.css`
- `src/toolbar/context-toolbar.tsx` (deleted)
- `src/toolbar/context-toolbar.test.tsx` (deleted)
- `_sdd/implementation/IMPLEMENTATION_PLAN.md`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_1.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_2.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_3.md`

### 3) Test and Quality Gate Status (F06.2)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: up to date
- `npm test`: pass (`75 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F06.2)

- Group A: `T1`, `T5` (파일 충돌 없음, 순차 통합 검증으로 진행)
- Group B: `T2 -> T3` (CodeViewer 액션 계약 이후 App wiring)
- Group C: `T4` (toolbar 제거 + App 헤더 정리)
- Group D: `T6` (최종 회귀 검증)

### 5) Blockers and Decisions (F06.2)

- Blockers: 없음
- Applied decisions:
  - CodeViewer 우클릭 액션 라벨은 `Copy Both`로 고정
  - `Copy Both`는 기존 F06 payload 포맷(`relative/path:Lx-Ly + 본문`)을 재사용
  - `ContextToolbar`는 완전 제거
  - FileTree 우클릭 경로 복사는 파일/디렉터리 모두 지원

---

## F07 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F07)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4, T5` (completed)
  - Phase 3: `T6` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | watcher IPC 타입/브리지 확장 | P0 | - | completed | `electron/electron-env.d.ts`, `electron/preload.ts` 타입/브리지 반영 |
| T2 | Main watcher 서비스 구현 | P0 | T1 | completed | `npm run build` pass (main/preload bundle) |
| T3 | `WorkspaceSession.changedFiles` 상태 모델 추가 | P0 | - | completed | `workspace-model.test.ts` pass |
| T4 | WorkspaceProvider watch lifecycle + 이벤트 라우팅 | P0 | T1,T2,T3 | completed | `App.test.tsx` watch lifecycle/이벤트 통합 검증 pass |
| T5 | FileTree 변경 표시(`●`) 렌더 통합 | P0 | T3,T4 | completed | `file-tree-panel.test.tsx`, `App.test.tsx` pass |
| T6 | 테스트 보강 + 회귀/게이트 검증 | P0 | T1,T2,T3,T4,T5 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F07)

- `_sdd/implementation/IMPLEMENTATION_PLAN.md`
- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `package.json`
- `package-lock.json`
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-context.tsx`
- `src/workspace/workspace-model.test.ts`
- `src/file-tree/file-tree-panel.tsx`
- `src/file-tree/file-tree-panel.test.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_1.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_2.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_3.md`

### 3) Test and Quality Gate Status (F07)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: pass (lockfile updated)
- `npm test`: pass (`78 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F07)

- Group A: `T1`, `T3` (파일 충돌 없음, 구현은 순차 통합 검증으로 진행)
- Group B: `T2` (`electron/main.ts` + `package*.json` 단일 그룹)
- Group C: `T4` (`workspace-context.tsx` lifecycle 결합)
- Group D: `T5` (App + FileTree UI wiring)
- Group E: `T6` (최종 회귀/게이트)

### 5) Blockers and Decisions (F07)

- Blockers: 없음
- Applied decisions:
  - `workspace:watchStop` IPC를 구현에 포함해 watcher 정리를 강제함
  - watch 이벤트는 workspaceId 기준으로 해당 세션 `changedFiles`에만 합집합 반영
  - `changedFiles`는 MVP에서 자동 clear 없이 유지(후속 clear UX에서 확장)
  - watcher ignore 정책은 인덱싱 ignore 정책(`.git`, `node_modules`, `dist`, `build`, `out`, `.next`, `.turbo`)을 그대로 재사용

---

## F07 Follow-up Addendum (2026-02-21)

### 1) Scope Covered

- Follow-up scope after F07:
  - 열린(active) 파일이 watcher 이벤트에 포함될 때 자동 리로드
  - 변경된 파일을 수동으로 열거나 자동 리로드 성공 시 `changedFiles` 마커 제거

### 2) Files Changed

- `src/workspace/workspace-context.tsx`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_1.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_2.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_3.md`

### 3) Test and Quality Gate Status

- `npm test`: pass (`80 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Applied Decisions

- active file이 변경 이벤트에 포함되면 workspace read flow를 재사용해 자동 갱신한다.
- read 성공(`ok: true`, preview unavailable 포함) 시 해당 파일의 changed marker를 제거한다.
- read 실패(`ok: false` 또는 예외) 시 changed marker는 유지한다.

---

## F07.1 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f07_1_workspace_file_history_navigation.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5, T6` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | WorkspaceSession 히스토리 필드/전이 함수 추가 | P0 | - | completed | `workspace-model.test.ts` pass |
| T2 | WorkspaceProvider 파일 열기 경로에 히스토리 규칙 통합 | P0 | T1 | completed | `App.test.tsx` history scenarios pass |
| T3 | Header에 Back/Forward 버튼 추가 + disabled 연동 | P0 | T2 | completed | `App.test.tsx` pass |
| T4 | spec 링크/파일 트리 열기 흐름과 히스토리 정책 정합화 | P1 | T2 | completed | `App.test.tsx` existing spec-link scenarios pass |
| T5 | workspace-model 단위 테스트 보강 | P0 | T1 | completed | `workspace-model.test.ts` pass (12 tests) |
| T6 | App 통합 테스트(Back/Forward/truncate/workspace 분리) 추가 | P0 | T2,T3,T4,T5 | completed | `App.test.tsx` pass (28 tests) |

### 2) Files Changed (F07.1)

- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-context.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_1.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_2.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_3.md`

### 3) Test and Quality Gate Status (F07.1)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm test`: pass (`87 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F07.1)

- Group A: `T1`, `T5` (`workspace-model.ts`/`workspace-model.test.ts` 충돌로 순차 실행)
- Group B: `T2`, `T4` (`workspace-context.tsx` 중심으로 순차 실행)
- Group C: `T3` (App header actions UI 연결)
- Group D: `T6` (최종 통합 회귀)

### 5) Blockers and Decisions (F07.1)

- Blockers: 없음
- Applied decisions:
  - 히스토리는 워크스페이스별로 `relativePath` 기준 독립 저장.
  - Back/Forward는 active workspace 범위에서만 포인터 이동.
  - history navigation으로 열린 파일은 신규 push 없이 기존 포인터만 이동.
  - Back 후 신규 파일 open 시 forward 구간은 truncate.
  - 연속 동일 파일 open은 히스토리 중복 엔트리를 생성하지 않음.

---

## F08 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F08)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | Main IPC 핸들러 구현 (`system:openInIterm`, `system:openInVsCode`) | P0 | - | completed | `App.test.tsx` open-in call path pass |
| T2 | preload 브리지 + Window 타입 계약 확장 | P0 | T1 | completed | `tsc`, `npm test` pass |
| T3 | 좌측 `Current Workspace` 아래 `Open In:` 아이콘 버튼 UI/핸들러 | P0 | T2 | completed | `App.test.tsx` disabled/call scenario pass |
| T4 | 아이콘 버튼 스타일/접근성/disabled 상태 고정 | P1 | T3 | completed | `npm run lint`, manual visual check |
| T5 | 통합 테스트 보강 + 품질 게이트 | P0 | T1,T2,T3,T4 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F08)

- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F08)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: pass (up to date)
- `npm test`: pass (`93 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F08)

- Group A: `T1` (Main IPC) + `T2` (preload/type) 순차 실행
- Group B: `T3` + `T4` (`src/App.tsx`/`src/App.css`) 순차 실행
- Group C: `T5` (통합 테스트/게이트)

### 5) Blockers and Decisions (F08)

- Blockers: 없음
- Applied decisions:
  - F08 액션은 헤더가 아닌 좌측 `Current Workspace` 카드 하단에 배치
  - 버튼 텍스트 대신 icon-only + `aria-label`/`title`(`Open in iTerm`, `Open in VSCode`) 적용
  - 실패 피드백은 기존 텍스트 배너(`showBanner`)를 재사용

---

## F09 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f09_workspace_session_restore_and_line_resume.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5, T6` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | localStorage 기반 snapshot schema/read-write 유틸 추가 | P0 | - | completed | `workspace-persistence.test.ts` pass |
| T2 | `WorkspaceSession.fileLastLineByPath` + selection 기반 라인 갱신 규칙 추가 | P0 | - | completed | `workspace-model.test.ts` pass |
| T3 | Provider hydrate/persist 파이프라인 + 실패 workspace skip 처리 | P0 | T1,T2 | completed | `App.test.tsx` restore/failure scenarios pass |
| T4 | 파일 재열기/복원 시 라인 선택/점프 연동 | P0 | T2,T3 | completed | `App.test.tsx` restore line assertions pass |
| T5 | persistence/model 단위 테스트 보강 | P0 | T1,T2 | completed | `workspace-persistence.test.ts`, `workspace-model.test.ts` pass |
| T6 | App 통합 테스트(재시작 복원/부분 실패 continue) 보강 | P0 | T3,T4,T5 | completed | `App.test.tsx` pass |

### 2) Files Changed (F09)

- `src/workspace/workspace-persistence.ts` (new)
- `src/workspace/workspace-persistence.test.ts` (new)
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-context.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F09)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm test`: pass (`103 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F09)

- Group A: `T1` + `T5` (`workspace-persistence.ts`/test 축)
- Group B: `T2` (`workspace-model.ts`/test 축)
- Group C: `T3` + `T4` (`workspace-context.tsx` + `App.tsx` 결합 축, 파일 충돌로 순차)
- Group D: `T6` (최종 통합 회귀)

### 5) Blockers and Decisions (F09)

- Blockers: 없음
- Applied decisions:
  - 세션 저장소는 renderer `localStorage`를 사용하고 schema version(`v1`)을 고정한다.
  - 라인 복원은 픽셀 스크롤이 아닌 1-based 단일 라인 복원으로 처리한다.
  - 복원 실패 workspace는 skip하고 나머지 복원을 지속한다.
  - 부분 실패는 텍스트 배너(`Some workspaces could not be restored`)로 알린다.

---

## F10.1 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f10_1_markdown_selection_go_to_source.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | source line resolver 유틸 추가 | P0 | - | completed | `source-line-resolver.test.ts` pass |
| T2 | SpecViewer source popover UI 추가 | P0 | T1 | completed | `spec-viewer-panel.test.tsx` pass |
| T3 | SpecViewerPanel 선택 우클릭 + line 콜백 연동 | P0 | T1,T2 | completed | `spec-viewer-panel.test.tsx` pass |
| T4 | App `activeSpec` source line jump wiring 추가 | P0 | T3 | completed | `App.test.tsx` pass |
| T5 | 단위/통합 테스트 및 회귀 게이트 검증 | P0 | T3,T4 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F10.1)

- `src/spec-viewer/source-line-resolver.ts` (new)
- `src/spec-viewer/source-line-resolver.test.ts` (new)
- `src/spec-viewer/spec-source-popover.tsx` (new)
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/App.css`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F10.1)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: pass (up to date)
- `npm test`: pass (`113 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F10.1)

- Group A: `T1`, `T2` (`source-line-resolver` + `spec-source-popover` 신규 파일 중심, 충돌 없음)
- Group B: `T3` (`spec-viewer-panel.tsx` + panel test, 링크 popover 회귀 포함)
- Group C: `T4` (`App.tsx` + App integration wiring)
- Group D: `T5` (전체 테스트/린트/빌드 게이트)

### 5) Blockers and Decisions (F10.1)

- Blockers: 없음
- Applied decisions:
  - 라인 매핑은 markdown 블록의 `data-source-line`(node.position.start.line) 기반 best-effort로 고정했다.
  - 우클릭 액션은 selection이 존재하고 line 해석이 가능한 경우에만 노출한다.
  - source 이동은 현재 `activeSpec` 파일로 단일 라인 점프(`Lx-Lx`) 처리한다.
  - 외부 링크용 `SpecLinkPopover`와 선택용 `SpecSourcePopover` 상태를 분리해 충돌을 방지했다.

---

## F10 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F10)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | markdown sanitize/URI 정책 유틸 도입 | P0 | - | completed | `markdown-security.test.ts` pass |
| T2 | SpecViewer sanitize + 로컬 리소스 제한 적용 | P0 | T1 | completed | `spec-viewer-panel.test.tsx` pass |
| T3 | workspace index cap/truncation 신호 도입 | P0 | - | completed | `App.test.tsx` truncation case pass |
| T4 | CodeViewer 하이라이트 메모이제이션 | P1 | - | completed | `code-viewer-panel.test.tsx` pass |
| T5 | 회귀 테스트 보강 + 게이트 검증 | P0 | T2,T3,T4 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F10)

- `package.json`
- `package-lock.json`
- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `src/spec-viewer/markdown-security.ts` (new)
- `src/spec-viewer/markdown-security.test.ts` (new)
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/workspace/workspace-context.tsx`
- `src/code-viewer/syntax-highlight.ts`
- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F10)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install rehype-sanitize`: pass
- `npm test`: pass (`125 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F10)

- Group A: `T1 -> T2` (Spec Security track, 파일 충돌로 순차)
- Group B: `T3` (Indexing Performance track)
- Group C: `T4` (Code Rendering Performance track)
- Group D: `T5` (최종 통합 회귀 게이트)

### 5) Blockers and Decisions (F10)

- Blockers: 없음
- Applied decisions:
  - 인덱싱 cap은 `10,000` 노드로 고정했다.
  - 차단 리소스는 `blocked placeholder text`로 표시한다.
  - `data:` URI는 `data:image/*`만 제한 허용한다.
  - `data:image/*` 허용은 markdown 렌더 보안 정책(F10) 수준에서만 반영하고, 코드 뷰어 이미지 프리뷰 자체는 F10.2에서 별도 처리한다.

---

## F10.2 Addendum (2026-02-21)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f10_2_code_viewer_image_preview.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | `workspace:readFile` 미디어 결과 계약 확장 | P0 | - | completed | 타입/컴파일 검증 pass |
| T2 | main 이미지 감지/인코딩/차단 처리 구현 | P0 | T1 | completed | App integration tests pass |
| T3 | Workspace 상태 모델/컨텍스트 미디어 상태 반영 | P0 | T1,T2 | completed | `workspace-model.test.ts` pass |
| T4 | CodeViewer 이미지 렌더 모드 + UI 분기 구현 | P0 | T3 | completed | `code-viewer-panel.test.tsx` pass |
| T5 | 이미지 프리뷰/텍스트 회귀 테스트 보강 | P0 | T4 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F10.2)

- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-context.tsx`
- `src/workspace/workspace-model.test.ts`
- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F10.2)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm test`: pass (`131 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F10.2)

- Group A: `T1 -> T2` (IPC 계약 + main read pipeline, 동일 계약 의존으로 순차)
- Group B: `T3 -> T4` (workspace 상태 + code viewer UI 분기, `workspace-context.tsx`/`App.tsx` 충돌로 순차)
- Group C: `T5` (단위/통합 회귀 + lint/build 게이트)

### 5) Blockers and Decisions (F10.2)

- Blockers: 없음
- Applied decisions:
  - 허용 이미지 포맷은 `.png/.jpg/.jpeg/.gif/.webp`로 제한했다.
  - `svg`는 정책상 차단(`blocked_resource`) 처리했다.
  - 이미지 payload는 `data:image/*` URI만 허용하고, renderer에서도 `data:image/` prefix 검증을 유지했다.
  - 이미지 프리뷰 모드에서는 텍스트 라인 선택/우클릭 복사 UI를 노출하지 않는다.

---

## F11 Addendum (2026-02-22)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F11)
- Covered tasks:
  - Phase 1: `T1, T2, T3` (completed)
  - Phase 2: `T4, T5, T6` (completed)
  - Phase 3: `T7` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | 코멘트 도메인 타입/anchor/hash 유틸 구현 | P0 | - | completed | `comment-anchor.test.ts` pass |
| T2 | comments persistence/export 유틸 구현 | P0 | T1 | completed | `comment-persistence.test.ts`, `comment-export.test.ts` pass |
| T3 | comments IPC 채널(main/preload/type) 구현 | P0 | T1 | completed | build/type check pass |
| T4 | workspace comments 상태/액션 통합 | P0 | T3 | completed | `App.test.tsx` integration pass |
| T5 | CodeViewer `Add Comment` + 입력 모달 연결 | P0 | T1,T4 | completed | `code-viewer-panel.test.tsx`, `App.test.tsx` pass |
| T6 | `Export Comments` 모달 + 길이 제한/내보내기 연결 | P0 | T2,T4 | completed | `App.test.tsx` pass |
| T7 | 테스트 보강 + 품질 게이트 통과 | P0 | T5,T6 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F11)

- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `src/code-comments/comment-types.ts` (new)
- `src/code-comments/comment-config.ts` (new)
- `src/code-comments/comment-anchor.ts` (new)
- `src/code-comments/comment-anchor.test.ts` (new)
- `src/code-comments/comment-persistence.ts` (new)
- `src/code-comments/comment-persistence.test.ts` (new)
- `src/code-comments/comment-export.ts` (new)
- `src/code-comments/comment-export.test.ts` (new)
- `src/code-comments/comment-editor-modal.tsx` (new)
- `src/code-comments/export-comments-modal.tsx` (new)
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-context.tsx`
- `src/workspace/workspace-model.test.ts`
- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F11)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: pass (up to date)
- `npm test`: pass (`145 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F11)

- Group A: `T1 -> T2 -> T3` (댓글 데이터 계약/IPC 계약 결합도가 높아 순차)
- Group B: `T4 -> T5 -> T6` (`workspace-context.tsx` + `App.tsx` + `code-viewer-panel.tsx` 충돌로 순차)
- Group C: `T7` (최종 통합 회귀 + lint/build 게이트)

### 5) Blockers and Decisions (F11)

- Blockers: 없음
- Applied decisions:
  - comments source of truth는 `workspaceRoot/.sdd-workbench/comments.json`으로 고정했다.
  - 코멘트 정렬은 `file ASC, startLine ASC, createdAt ASC` deterministic 규칙을 적용했다.
  - `Add Comment`는 코드 뷰어 우클릭 액션(`Copy*` 액션 유지)으로 통합했다.
  - `Export Comments`는 `clipboard + _COMMENTS.md + bundle file` 조합을 지원하며, 길이 제한(`MAX_CLIPBOARD_CHARS=30000`) 초과 시 clipboard는 비활성화한다.
  - `_COMMENTS.md`는 export 시 매번 overwrite 재생성한다.

---

## F12.1 Addendum (2026-02-22)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f12_1_comment_badge_hover_popover.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | 라인별 코멘트 detail index 확장 | P0 | - | completed | `comment-line-index.test.ts` pass |
| T2 | 공용 hover popover 컴포넌트 추가 | P1 | T1 | completed | panel tests pass |
| T3 | CodeViewer 배지 hover popover 통합 | P0 | T1,T2 | completed | `code-viewer-panel.test.tsx` pass |
| T4 | SpecViewer 마커 hover popover 통합 | P0 | T1,T2 | completed | `spec-viewer-panel.test.tsx` pass |
| T5 | 테스트 보강 및 회귀 검증 | P0 | T3,T4 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F12.1)

- `src/code-comments/comment-line-index.ts`
- `src/code-comments/comment-line-index.test.ts`
- `src/code-comments/comment-hover-popover.tsx` (new)
- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/App.tsx`
- `src/App.css`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F12.1)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: pass (up to date)
- `npm test -- src/code-comments/comment-line-index.test.ts src/code-viewer/code-viewer-panel.test.tsx src/spec-viewer/spec-viewer-panel.test.tsx`: pass
- `npm test`: pass (`169 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F12.1)

- Group A: `T1 -> T2` (공용 index/popover 기반 확정)
- Group B: `T3` (CodeViewer 통합)
- Group C: `T4` (SpecViewer 통합)
- Group D: `T5` (테스트/게이트)

### 5) Blockers and Decisions (F12.1)

- Blockers: 없음
- Applied decisions:
  - hover popover 닫힘 정책은 `mouse leave + Esc + outside click`을 모두 지원한다.
  - 코멘트 미리보기는 최대 3개 본문과 `+N more` 요약을 제공한다.
  - rendered markdown 마커는 pseudo-element에서 실제 badge element로 전환해 hover 상호작용을 안정화했다.
  - source-line 매핑은 기존 규칙(`exact-match -> nearest fallback`)을 그대로 재사용한다.

---

## F12.2 Addendum (2026-02-22)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f12_2_view_comments_edit_delete.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | `View Comments` 모달 컴포넌트 추가 | P0 | - | completed | `comment-list-modal.test.tsx` pass |
| T2 | App 헤더 액션 + 모달 오케스트레이션 | P0 | T1 | completed | `App.test.tsx` pass |
| T3 | 코멘트 본문 편집 저장 플로우 구현 | P0 | T1,T2 | completed | `App.test.tsx` pass |
| T4 | 개별 삭제 + `Delete Exported` 플로우 구현 | P0 | T1,T2 | completed | `App.test.tsx`, `comment-list-modal.test.tsx` pass |
| T5 | 단위/통합 테스트 보강 + 회귀 게이트 검증 | P0 | T3,T4 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F12.2)

- `src/code-comments/comment-list-modal.tsx` (new)
- `src/code-comments/comment-list-modal.test.tsx` (new)
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F12.2)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: pass (up to date)
- `npm test -- src/code-comments/comment-list-modal.test.tsx src/App.test.tsx`: pass
- `npm test`: pass (`178 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F12.2)

- Group A: `T1` (`comment-list-modal.tsx` + unit tests)
- Group B: `T2 -> T3 -> T4` (`App.tsx` 오케스트레이션/저장/삭제 결합으로 순차)
- Group C: `T5` (통합 회귀 + lint/build 게이트)

### 5) Blockers and Decisions (F12.2)

- Blockers: 없음
- Applied decisions:
  - 코멘트 목록 정렬은 기존 규칙(`file ASC, startLine ASC, createdAt ASC`)을 그대로 재사용한다.
  - 편집 저장은 `sanitizeCommentBody`를 재사용해 본문만 immutable update한다(`id`, `anchor`, `createdAt` 유지).
  - 삭제 UX는 개별 삭제/`Delete Exported` 모두 2-step confirm으로 고정했다.
  - `Delete Exported`는 `exportedAt` 존재 코멘트만 제거하고 pending 코멘트는 유지한다.
  - 저장 실패 경로는 기존 `saveComments` 배너 처리 경로를 그대로 사용한다.

---

## F12.3 Addendum (2026-02-22)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f12_3_global_comments_capture_and_export_order.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | 전역 코멘트 IPC 채널 추가 | P0 | - | completed | `npm test -- src/App.test.tsx` pass |
| T2 | workspace 상태에 전역 코멘트 로드/저장 액션 추가 | P0 | T1 | completed | `workspace-model.test.ts` pass |
| T3 | `Add Global Comments` 모달/버튼 구현 | P0 | T2 | completed | `App.test.tsx` pass |
| T4 | export 템플릿 전역 코멘트 선행(prepend) 규칙 구현 | P0 | T2,T3 | completed | `comment-export.test.ts`, `App.test.tsx` pass |
| T5 | 테스트 보강 + 회귀 게이트 검증 | P0 | T3,T4 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F12.3)

- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-context.tsx`
- `src/code-comments/comment-export.ts`
- `src/code-comments/comment-export.test.ts`
- `src/code-comments/export-comments-modal.tsx`
- `src/code-comments/global-comments-modal.tsx` (new)
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F12.3)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: pass (up to date)
- `npm test -- src/code-comments/comment-export.test.ts src/workspace/workspace-model.test.ts src/App.test.tsx`: pass
- `npm test`: pass (`183 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F12.3)

- Group A: `T1` (`electron/main.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`)
- Group B: `T2` (`workspace-model.ts`, `workspace-context.tsx`)
- Group C: `T3 -> T4` (`App.tsx` 중심 오케스트레이션 충돌로 순차)
- Group D: `T5` (테스트/게이트)

### 5) Blockers and Decisions (F12.3)

- Blockers: 없음
- Applied decisions:
  - 전역 코멘트 파일 경로는 `workspace/.sdd-workbench/global-comments.md`로 고정했다.
  - 전역 코멘트는 `comments.json`과 분리 저장하고 line comment `exportedAt` 정책은 변경하지 않았다.
  - export 텍스트(`_COMMENTS.md`, bundle)는 `## Global Comments`를 `## Comments` 앞에 배치한다(빈 경우 생략).
  - pending line comment가 0이어도 전역 코멘트가 있으면 export를 허용한다.

---

## F12.4 Addendum (2026-02-22)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f12_4_header_action_layout_reorder.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1` (completed)
  - Phase 2: `T2` (completed)
  - Phase 3: `T3` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | 헤더 액션 그룹 구조 재배치 | P0 | - | completed | `App.test.tsx` pass |
| T2 | 헤더 compact 스타일 + 반응형 icon-only 규칙 | P0 | T1 | completed | `App.test.tsx` pass |
| T3 | 버튼 순서/동작 회귀 테스트 | P0 | T1,T2 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F12.4)

- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `src/workspace/workspace-switcher.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F12.4)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: pass (up to date)
- `npm test -- src/App.test.tsx`: pass
- `npm test`: pass (`185 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F12.4)

- Group A: `T1 -> T2` (`src/App.tsx`, `src/App.css`, `src/workspace/workspace-switcher.tsx` 상호 의존으로 순차)
- Group B: `T3` (`src/App.test.tsx` 회귀 검증 + 전체 게이트)

### 5) Blockers and Decisions (F12.4)

- Blockers: 없음
- Applied decisions:
  - `Close Workspace` 버튼을 `WorkspaceSwitcher`에서 분리해 workspace action group으로 이동했다.
  - comments/workspace 액션은 `icon + short label` compact 버튼(`header-action-button`)으로 통일했다.
  - 반응형 icon-only 전환은 label slot만 숨기고 `aria-label`/`title`로 접근성 이름을 유지했다.
  - 기존 disabled/핸들러 로직은 동일 조건을 재사용해 회귀를 방지했다.

---

## F12.5 Addendum (2026-02-23)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f12_5_comment_feedback_autodismiss_and_action_group_clarity.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | View Comments global 섹션 추가 | P0 | - | completed | `comment-list-modal.test.tsx` pass |
| T2 | Export modal global 포함 상태 표시 | P0 | - | completed | `App.test.tsx` pass |
| T3 | 코멘트 배너 5초 auto-dismiss | P0 | T1,T2 | completed | `App.test.tsx` pass |
| T4 | 헤더 액션 그룹 라벨/순서 정리 | P1 | T2 | completed | `App.test.tsx` pass |
| T5 | 테스트 보강/회귀 검증 | P0 | T1,T2,T3,T4 | completed | `npm test`, `npm run lint`, `npm run build` pass |

### 2) Files Changed (F12.5)

- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `src/code-comments/comment-list-modal.tsx`
- `src/code-comments/comment-list-modal.test.tsx`
- `src/code-comments/export-comments-modal.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F12.5)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm install`: pass (up to date)
- `npx vitest run src/App.test.tsx src/code-comments/comment-list-modal.test.tsx`: pass
- `npm test`: pass (`202 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F12.5)

- Group A: `T1 -> T2` (`src/App.tsx` props wiring 충돌로 순차)
- Group B: `T3 -> T4` (`src/App.tsx`, `src/App.css` 동시 변경으로 순차)
- Group C: `T5` (테스트/게이트 검증)

### 5) Blockers and Decisions (F12.5)

- Blockers: 없음
- Applied decisions:
  - 코멘트 배너 auto-dismiss는 `showCommentBanner` 경로에서만 동작하도록 분리했다.
  - `View Comments` 상단에 global comments read-only 섹션을 추가하고 빈 값은 `No global comments.`로 고정했다.
  - 헤더는 `Code comments` / `Workspace` 라벨 그룹으로 재배치하고, workspace 그룹 내부를 `switcher -> Open -> Close` 순서로 고정했다.
  - Export 모달에 `Global comments: included/not included` 상태 라인을 추가했다.

---

## F19 Addendum (2026-02-24)

### 1) Scope Covered (Phase/Task IDs)

- Active plan: `/_sdd/drafts/feature_draft_f19_git_diff_line_markers_added_modified_mvp.md` (Part 2)
- Covered tasks:
  - Phase 1: `T1, T2` (completed)
  - Phase 2: `T3, T4` (completed)
  - Phase 3: `T5, T6` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| T1 | `workspace:getGitLineMarkers` IPC 추가 | P0 | - | completed | `App.test.tsx` pass |
| T2 | `git diff --unified=0` 파싱으로 `added/modified` 계산 | P0 | T1 | completed | `electron/git-line-markers.test.ts` pass |
| T3 | workspace active file marker 상태/재조회 연결 | P0 | T1,T2 | completed | `App.test.tsx`, `workspace-model.test.ts` pass |
| T4 | CodeViewer 라인 마커 렌더/스타일 추가 | P0 | T3 | completed | `code-viewer-panel.test.tsx` pass |
| T5 | 파서/렌더 단위 테스트 보강 | P0 | T2,T4 | completed | `electron/git-line-markers.test.ts`, `code-viewer-panel.test.tsx` pass |
| T6 | 통합 회귀(전환/실패 degrade) 검증 | P1 | T3,T4,T5 | completed | `App.test.tsx`, `npm test` pass |

### 2) Files Changed (F19)

- `electron/git-line-markers.ts` (new)
- `electron/git-line-markers.test.ts` (new)
- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-context.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`

### 3) Test and Quality Gate Status (F19)

- `node -v`: `v25.2.1`
- `npm -v`: `11.7.0`
- `npm test -- electron/git-line-markers.test.ts src/code-viewer/code-viewer-panel.test.tsx src/App.test.tsx`: pass
- `npm test`: pass (`250 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F19)

- Group A: `T1 + T2` (IPC 계약 + diff parser)
- Group B: `T3 + T4` (workspace 상태 + code viewer 렌더)
- Group C: `T5 + T6` (단위/통합 회귀 + 품질 게이트)

### 5) Blockers and Decisions (F19)

- Blockers: 없음
- Applied decisions:
  - 비교 기준은 `HEAD` 대비 워킹트리(`staged + unstaged`)로 고정했다.
  - deleted-only hunk는 MVP 범위 밖으로 분리해 렌더에서 제외했다.
  - Git 실패/비저장소 경로는 오류 배너 없이 `markers=[]`로 안전 degrade한다.
  - image preview/preview unavailable 상태에서는 라인 렌더 자체를 건너뛰어 Git 마커를 표시하지 않는다.
