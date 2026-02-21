# IMPLEMENTATION_REPORT_PHASE_2

## 1) Files Touched in Phase

- `src/spec-viewer/spec-viewer-panel.tsx` (new)
- `src/App.tsx`
- `src/App.css`

## 2) Review Checklist Summary by Category

- Security: pass
  - renderer 렌더링 레이어 변경으로 신규 시스템 권한 추가 없음.
- Error handling: pass
  - active spec 없음/로딩/오류/unavailable 상태를 명시적으로 분리 표기.
- Code patterns: pass
  - `SpecViewerPanel` 분리로 App shell과 렌더 로직 책임 분리.
- Performance: pass
  - TOC depth를 `h1~h3`으로 제한해 우측 패널 초기 비용 제어.
- Test quality: pass
  - 컴포넌트 단위 테스트로 TOC/empty 상태 검증 준비 완료.
- Cross-task integration: pass
  - 기존 center `CodeViewerPanel` 흐름(raw preview)을 유지한 채 right rendered panel을 추가.

## 3) Phase Verdict

- `proceed`

---

## F04.1 Phase 2 Addendum (Tasks 3,4,5)

### 1) Files Touched

- `src/spec-viewer/spec-link-popover.tsx` (new)
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/App.tsx`
- `src/App.css`

### 2) Review Checklist Summary

- Security: pass
  - external/unresolved 링크를 자동 탐색하지 않고 명시 액션(복사)으로 제한.
- Error handling: pass
  - 클립보드 API 실패 시 banner 메시지 fallback 제공.
- Code patterns: pass
  - popover 컴포넌트 분리 + App에서 파일 열기/메시지 책임 분리.
- Performance: pass
  - popover는 클릭 시에만 렌더되며 viewport clamp 계산 비용이 작음.
- Test quality: pass
  - panel/app 테스트에서 링크 인터셉트와 상태 유지 경로 검증.
- Cross-task integration: pass
  - active workspace 파일 집합 기반 선택 로직과 충돌 없음.

### 3) Phase Verdict (F04.1 Phase 2)

- `proceed`

---

## F05 Phase 2 Addendum (Tasks T3, T4, T5)

### 1) Files Touched

- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/App.tsx`
- `src/code-viewer/code-viewer-panel.tsx`

### 2) Review Checklist Summary

- Security: pass
  - 링크 인터셉트 정책은 유지되고 external 이동은 여전히 차단.
- Error handling: pass
  - active workspace에 파일이 없으면 기존처럼 open 실패(`false`) 처리.
- Code patterns: pass
  - parser 결과(`lineRange`)를 panel -> app -> viewer로 명시 전달.
- Performance: pass
  - jump는 token 기반 요청 시점에만 실행, 평시 비용 없음.
- Test quality: pass
  - Phase 3에서 panel/viewer/app 계층 테스트로 동작 검증.
- Cross-task integration: pass
  - F03 selection click과 공존하며 line jump만 추가됨.

### 3) Phase Verdict (F05 Phase 2)

- `proceed`

---

## F06 Phase 2 Addendum (Task T4)

### 1) Files Touched

- `src/App.tsx`

### 2) Review Checklist Summary

- Security: pass
  - 외부 링크/파일 시스템 권한 확대 없이 기존 API 경계 내에서 clipboard 호출만 수행.
- Error handling: pass
  - clipboard 미지원/실패 시 배너 메시지를 명시 처리.
- Code patterns: pass
  - `writeToClipboard` helper로 실패 분기 중복 제거.
- Performance: pass
  - 버튼 클릭 이벤트 기반 실행으로 지속 연산 없음.
- Test quality: pass
  - Phase 3 통합 테스트에서 성공/실패/멀티 워크스페이스 경로 검증.
- Cross-task integration: pass
  - F04/F05 링크 탐색과 selection 상태 전이 규칙을 유지.

### 3) Phase Verdict (F06 Phase 2)

- `proceed`

---

## F06.1 Phase 2 Addendum (Tasks T3, T4)

### 1) Files Touched

- `src/code-viewer/code-viewer-panel.tsx`
- `src/code-viewer/code-viewer-panel.test.tsx`
- `src/file-tree/file-tree-panel.tsx`
- `src/file-tree/file-tree-panel.test.tsx` (new)

### 2) Review Checklist Summary

- Security: pass
  - 우클릭 이벤트 처리만 추가되며 외부 이동/권한 경로 없음.
- Error handling: pass
  - 우클릭 시 selection 정책(범위 내 유지/범위 밖 단일 선택)으로 상태 전이를 명시 고정.
- Code patterns: pass
  - 패널은 복사 실행 대신 App 콜백 요청만 수행하도록 책임 분리.
- Performance: pass
  - 컨텍스트 메뉴 상태는 로컬 state 기반으로 최소 범위 렌더링.
- Test quality: pass
  - CodeViewer 우클릭 정책/콜백, FileTree 파일/디렉터리 분기 테스트 추가.
- Cross-task integration: pass
  - 기존 파일 선택/디렉터리 토글/라인 클릭 흐름과 회귀 충돌 없음.

### 3) Phase Verdict (F06.1 Phase 2)

- `proceed`

---

## F06.2 Phase 2 Addendum (Tasks T3, T4)

### 1) Files Touched

- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `src/toolbar/context-toolbar.tsx` (deleted)
- `src/toolbar/context-toolbar.test.tsx` (deleted)

### 2) Review Checklist Summary

- Security: pass
  - 복사 경로 재배선과 툴바 제거만 포함되며 권한 경계 확장 없음.
- Error handling: pass
  - `Copy Both` 경로에서도 기존 clipboard 실패 배너 처리를 재사용.
- Code patterns: pass
  - 복사 실행 책임을 App에 유지하고, 패널은 요청 이벤트만 발행.
- Performance: pass
  - 상단 툴바 렌더 경로 제거로 상시 UI 복잡도가 감소.
- Test quality: pass
  - App 통합 테스트에서 툴바 제거와 컨텍스트 복사 경로를 검증.
- Cross-task integration: pass
  - F06.1 우클릭 UX 및 F05 line jump 흐름과 충돌 없음.

### 3) Phase Verdict (F06.2 Phase 2)

- `proceed`

---

## F07 Phase 2 Addendum (Tasks T3, T4, T5)

### 1) Files Touched

- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-context.tsx`
- `src/file-tree/file-tree-panel.tsx`
- `src/App.tsx`
- `src/App.css`

### 2) Review Checklist Summary

- Security: pass
  - renderer 상태 계층 변경만 포함, 권한 경계 확장 없음.
- Error handling: pass
  - watch start 실패는 banner로 노출하고 close/unmount stop은 best-effort cleanup 유지.
- Code patterns: pass
  - `changedFiles`를 session 모델에 추가해 멀티 워크스페이스 상태 분리를 보장.
- Performance: pass
  - watch 이벤트 수신 시 set-union 업데이트만 수행하고 파일 읽기 흐름과 분리.
- Test quality: pass
  - Phase 3에서 model/file-tree/app 테스트로 상태/렌더 연동 검증.
- Cross-task integration: pass
  - F06.2 우클릭 복사/selection 흐름과 충돌 없이 파일 트리 마커 UI 공존.

### 3) Phase Verdict (F07 Phase 2)

- `proceed`

---

## F07 Follow-up Phase 2 Addendum

### 1) Files Touched

- `src/App.test.tsx`

### 2) Review Checklist Summary

- Test quality: pass
  - changed file 수동 열람 시 마커 제거 시나리오 추가.
  - active file watcher 자동 리로드 + 본문 갱신 + marker 제거 시나리오 추가.
- Cross-task integration: pass
  - 기존 F07 watcher 테스트와 충돌 없이 함께 통과.

---

## F07.1 Phase 2 Addendum (Tasks T3, T4)

### 1) Files Touched

- `src/App.tsx`
- `src/workspace/workspace-context.tsx`

### 2) Review Checklist Summary

- Security: pass
  - UI 액션(`Back`/`Forward`) 및 renderer 상태 연결만 포함.
- Error handling: pass
  - 이동 불가 시 버튼 disabled + no-op 이중 가드 적용.
- Code patterns: pass
  - App은 액션 트리거/disabled 렌더만 담당하고 히스토리 정책은 context/model 계층 유지.
- Performance: pass
  - 버튼 상태 계산은 active workspace session 기준 boolean 계산으로 비용이 작음.
- Test quality: pass
  - 통합 테스트에서 단일 워크스페이스 back/forward/truncate 흐름 검증.
- Cross-task integration: pass
  - spec 링크 파일 열기 및 기존 header 흐름(WorkspaceSwitcher/Open/Close) 회귀 없음.

### 3) Phase Verdict (F07.1 Phase 2)

- `proceed`
