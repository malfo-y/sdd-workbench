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
