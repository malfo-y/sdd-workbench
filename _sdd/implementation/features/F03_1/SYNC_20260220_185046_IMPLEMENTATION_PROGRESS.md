# IMPLEMENTATION_PROGRESS

## 1) Scope Covered (Phase/Task IDs)

- Active draft: `/_sdd/drafts/feature_draft_f03_1_code_viewer_extension_color_coding.md`
- Covered tasks:
  - Phase 1: `1, 2` (completed)
  - Phase 2: `3, 4` (completed)
  - Phase 3: `5, 6` (completed)

| ID | Task | Priority | Dependencies | Status | Tests |
|----|------|----------|--------------|--------|-------|
| 1 | 하이라이팅 의존성 및 기본 어댑터 도입 | P1 | - | completed | verified (lint/build) |
| 2 | 확장자 매핑 유틸 구현(`.py` 포함) | P1 | 1 | completed | verified (unit test) |
| 3 | CodeViewerPanel 하이라이팅 통합 | P1 | 2 | completed | verified (component/integration test) |
| 4 | 토큰 컬러 스타일 적용 | P2 | 3 | completed | verified (lint/build) |
| 5 | 단위 테스트: 매핑/fallback 검증 | P1 | 2 | completed | `npm test` pass (18/18) |
| 6 | 통합 테스트: `.py` 하이라이팅 + 비회귀 | P1 | 3,4,5 | completed | `npm test` pass (18/18) |

## 2) Files Changed

- `package.json`
- `package-lock.json`
- `src/code-viewer/language-map.ts` (new)
- `src/code-viewer/syntax-highlight.ts` (new)
- `src/code-viewer/code-viewer-panel.tsx`
- `src/App.css`
- `src/code-viewer/language-map.test.ts` (new)
- `src/code-viewer/code-viewer-panel.test.tsx` (new)
- `src/App.test.tsx`

## 3) Tests Added/Updated and Pass Status

- Added:
  - `src/code-viewer/language-map.test.ts`
    - 지원 확장자 매핑 + unsupported fallback 검증
  - `src/code-viewer/code-viewer-panel.test.tsx`
    - `.py` 하이라이팅 경로 + plaintext fallback + selection callback 검증
- Updated:
  - `src/App.test.tsx`
    - 통합 플로우에서 `.py` 파일 하이라이팅(language=python) 검증 추가
- Execution status:
  - `npm test`: pass (`18 passed`)
  - `npm run lint`: pass
  - `npm run build`: pass

## 4) Parallel Groups Executed

- Phase 1: 순차 실행 (Task 1 -> 2)
- Phase 2: 순차 실행 (Task 3 -> 4)
- Phase 3: 테스트 파일 분리로 병렬 가능하나 단일 세션에서 통합 검증

## 5) Blockers and Decisions Needed

- Blocker:
  - 없음
- Decisions applied:
  - `.py`는 필수 지원 확장자로 포함
  - 미지원 확장자는 `plaintext` fallback
  - 기존 F03 preview unavailable/selection 동작 유지

## 6) Next Task(s)

1. 사용자 수동 스모크: `.py`/`.ts`/미지원 확장자 표시 품질 확인
2. 필요 시 `implementation-review`로 F03.1 수용기준 재검증
3. 검증 완료 후 `spec-update-done`으로 F03.1 반영
