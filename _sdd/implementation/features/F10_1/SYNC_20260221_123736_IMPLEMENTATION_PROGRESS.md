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
- `src/toolbar/context-toolbar.test.tsx` (new)
- `src/context-copy/copy-payload.ts` (new)
- `src/context-copy/copy-payload.test.ts` (new)
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_1.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_2.md`
- `_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_3.md`

### 3) Test and Quality Gate Status (F06)

- `npm test`: pass (`65 passed`)
- `npm run lint`: pass
- `npm run build`: pass

### 4) Parallel Groups Executed (F06)

- Group A: `T1`, `T2` (safe parallel target였으나 App 연동 검증 맥락 유지 위해 순차 실행)
- Group B: `T3` (T1 이후)
- Group C: `T4` (T1/T2 이후)
- Group D: `T5` (T4 이후)

### 5) Blockers and Decisions (F06)

- Blockers: 없음
- Applied decisions:
  - 복사 성공은 무음 처리, 실패만 텍스트 배너로 노출
  - disabled 상태와 런타임 가드를 함께 유지해 예외 호출도 방어
  - 선택 라인 payload는 `relative/path:Lx-Ly` + 본문 형식을 고정

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
