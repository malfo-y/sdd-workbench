# IMPLEMENTATION_REPORT_PHASE_1

## 1) Files Touched in Phase

- `package.json`
- `package-lock.json`
- `src/spec-viewer/markdown-utils.ts` (new)
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-context.tsx`
- `src/workspace/workspace-model.test.ts`

## 2) Review Checklist Summary by Category

- Security: pass
  - F04 범위는 기존 preload IPC 경계 바깥으로 확장하지 않음.
- Error handling: pass
  - 기존 read/index 실패 배너/에러 경로 유지.
- Code patterns: pass
  - `activeSpec`를 세션 필드로 추가해 멀티 워크스페이스 모델 일관성 유지.
- Performance: pass
  - markdown heading 추출은 현재 활성 문서에만 적용.
- Test quality: pass
  - `workspace-model.test.ts`에 workspace별 `activeSpec` 분리 정책 고정.
- Cross-task integration: pass
  - F03.5 상태 전이 규칙(selection reset, active workspace)과 충돌 없음.

## 3) Phase Verdict

- `proceed`

---

## F04.1 Phase 1 Addendum (Tasks 1,2)

### 1) Files Touched

- `src/spec-viewer/spec-link-utils.ts` (new)
- `src/spec-viewer/spec-viewer-panel.tsx`

### 2) Review Checklist Summary

- Security: pass
  - 링크를 렌더러 내부 정책으로 처리하고 기본 브라우저 이동을 차단.
- Error handling: pass
  - `empty/missing_active_spec/invalid_path/unsupported` 해석 실패 경로를 명시 분류.
- Code patterns: pass
  - resolver 유틸 분리로 panel 이벤트 분기 책임을 단순화.
- Performance: pass
  - 링크 클릭 시점 계산만 수행하며 추가 인덱싱 없음.
- Test quality: pass
  - Task 6에서 resolver 단위 테스트로 경계 케이스 고정.
- Cross-task integration: pass
  - Task 2가 resolver 결과를 안정적으로 소비.

### 3) Phase Verdict (F04.1 Phase 1)

- `proceed`

---

## F05 Phase 1 Addendum (Tasks T1, T2)

### 1) Files Touched

- `src/spec-viewer/spec-link-utils.ts`
- `src/spec-viewer/spec-link-utils.test.ts`

### 2) Review Checklist Summary

- Security: pass
  - 기존 path escape/absolute path 차단 정책을 유지.
- Error handling: pass
  - invalid/non-line hash는 `lineRange: null` 정책으로 일관 처리.
- Code patterns: pass
  - line range 파싱을 resolver 유틸 레이어에 한정해 UI 결합을 분리.
- Performance: pass
  - 링크 클릭 시점의 정규식 파싱만 추가되어 비용이 작음.
- Test quality: pass
  - `#Lx`, `#Lx-Ly`, 역순 범위 정규화, non-line hash 케이스를 고정.
- Cross-task integration: pass
  - 기존 external/anchor/unresolved 분기와 충돌 없음.

### 3) Phase Verdict (F05 Phase 1)

- `proceed`

---

## F06 Phase 1 Addendum (Tasks T1, T2, T3)

### 1) Files Touched

- `src/toolbar/context-toolbar.tsx` (new)
- `src/toolbar/context-toolbar.test.tsx` (new)
- `src/context-copy/copy-payload.ts` (new)
- `src/context-copy/copy-payload.test.ts` (new)
- `src/App.tsx`
- `src/App.css`

### 2) Review Checklist Summary

- Security: pass
  - 복사 기능은 renderer clipboard API 범위 내에서만 동작하며 권한 경계 확장 없음.
- Error handling: pass
  - payload 생성은 순수 함수로 경계값(clamp/reversed range) 처리.
- Code patterns: pass
  - toolbar/payload 유틸을 분리해 App orchestration 결합도를 낮춤.
- Performance: pass
  - payload 계산은 클릭 시점에만 수행.
- Test quality: pass
  - payload 포맷/경계 테스트 + toolbar 계약 테스트를 추가해 회귀를 고정.
- Cross-task integration: pass
  - 기존 header actions/workspace-switcher 흐름과 공존.

### 3) Phase Verdict (F06 Phase 1)

- `proceed`

---

## F06.1 Phase 1 Addendum (Tasks T1, T2)

### 1) Files Touched

- `src/context-copy/copy-payload.ts`
- `src/context-copy/copy-payload.test.ts`
- `src/context-menu/copy-action-popover.tsx` (new)
- `src/context-menu/copy-action-popover.test.tsx` (new)
- `src/App.css`

### 2) Review Checklist Summary

- Security: pass
  - 브라우저 기본 컨텍스트 메뉴를 대체하는 UI 추가이며 시스템 권한 경계 확장 없음.
- Error handling: pass
  - payload 정규화(clamp/reversed range)와 popover dismiss 경로를 명시 처리.
- Code patterns: pass
  - payload 유틸/공통 popover 컴포넌트를 분리해 패널 결합도를 낮춤.
- Performance: pass
  - 우클릭 시점에만 popover 계산/렌더를 수행.
- Test quality: pass
  - payload 경계 테스트 + popover dismiss/액션/클램프 테스트를 추가.
- Cross-task integration: pass
  - F06 payload 포맷을 유지하면서 F06.1 본문 복사 유틸을 확장.

### 3) Phase Verdict (F06.1 Phase 1)

- `proceed`

---

## F06.2 Phase 1 Addendum (Tasks T1, T2)

### 1) Files Touched

- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`

### 2) Review Checklist Summary

- Security: pass
  - renderer 내부 이벤트/상태 처리 변경만 포함, 권한 경계 확장 없음.
- Error handling: pass
  - drag 종료 시 click suppression을 추가해 이벤트 중복 오동작 경로를 차단.
- Code patterns: pass
  - 기존 selection 유틸(`normalizeLineSelectionRange`)을 재사용해 정책 일관성 유지.
- Performance: pass
  - drag 계산은 사용자 이벤트 시점에만 수행되어 상시 비용이 없음.
- Test quality: pass
  - drag selection + `Copy Both` 액션 콜백 경로를 컴포넌트 테스트로 고정.
- Cross-task integration: pass
  - F06.1 우클릭 정책(범위 내 유지/범위 밖 전환)과 충돌 없이 확장.

### 3) Phase Verdict (F06.2 Phase 1)

- `proceed`

---

## F07 Phase 1 Addendum (Tasks T1, T2)

### 1) Files Touched

- `electron/electron-env.d.ts`
- `electron/preload.ts`
- `electron/main.ts`
- `package.json`
- `package-lock.json`

### 2) Review Checklist Summary

- Security: pass
  - preload에 watch API를 명시 노출하고 채널을 workspace 전용으로 제한.
- Error handling: pass
  - `watchStart/watchStop`에 입력 검증과 오류 응답(`ok:false,error`) 경로를 추가.
- Code patterns: pass
  - main watcher registry를 함수(`start/stop/flush`) 단위로 분리해 lifecycle 책임을 명확화.
- Performance: pass
  - workspace 단위 debounce(300ms) + ignore 디렉터리 정책 적용.
- Test quality: pass
  - Phase 3 통합 테스트에서 watchStart/watchStop 호출 및 마커 반영 검증.
- Cross-task integration: pass
  - 기존 `workspace:index/readFile` IPC와 충돌 없이 병행 동작.

### 3) Phase Verdict (F07 Phase 1)

- `proceed`

---

## F07 Follow-up Phase 1 Addendum

### 1) Files Touched

- `src/workspace/workspace-context.tsx`

### 2) Review Checklist Summary

- Security: pass
  - renderer 상태/읽기 경로 내 로직 확장만 포함.

---

## F07.1 Phase 1 Addendum (Tasks T1, T2)

### 1) Files Touched

- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-context.tsx`

### 2) Review Checklist Summary

- Security: pass
  - renderer 상태 모델/오케스트레이션 확장으로 권한 경계 변화 없음.
- Error handling: pass
  - 히스토리 이동 불가능 상태를 no-op으로 처리하고 기존 파일 읽기 에러 경로 유지.
- Code patterns: pass
  - 히스토리 정책(push/step/canStep)을 `workspace-model` 순수 함수로 분리.
- Performance: pass
  - 히스토리 연산은 O(1) 포인터 이동 + 제한된 배열 조작(최대 200)으로 경량.
- Test quality: pass
  - 모델 단위 테스트로 중복 방지/branch truncate/상한 정책을 고정.
- Cross-task integration: pass
  - 기존 `selectFile` read 파이프라인을 재사용해 spec 링크/트리 열기 경로와 정합성 유지.

### 3) Phase Verdict (F07.1 Phase 1)

- `proceed`
