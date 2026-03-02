# Implementation Plan — Phase 4: 레거시 정리 + 테스트 보강

**상위 문서**: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
**태스크**: T14 ~ T15
**전제**: Phase 1~3 (T1~T13) 완료
**목표**: 레거시 code-viewer 파일 삭제 + CSS 정리, 기존 테스트 시나리오 포팅 + 신규 기능 테스트 보강
**모델 권장**: `sonnet` (정리/테스트)

---

## 태스크 개요

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T14 | 레거시 code-viewer 파일 삭제 + 스타일 정리 | P2 | T5,T11,T12,T13 | Cleanup |
| T15 | 테스트 보강/마이그레이션 | P0 | T4,T8,T11,T12 | Test |

## 병렬 실행 요약

```
T14 (T5,T11,T12,T13 완료 후)
T15 (점진적, Phase별로 병행 가능)
```

- **T14**: 모든 gutter extension 완료 후 실행 (레거시 코드가 더 이상 참조되지 않음 확인 후)
- **T15**: Phase 1~3 각 단계 완료 시 점진적 추가 가능

| 최대 병렬 | 순차 필수 | 파일 충돌 |
|-----------|-----------|-----------|
| 1 (T15는 점진적) | T14 마지막 | 없음 |

---

## 태스크 상세

### T14: 레거시 code-viewer 파일 삭제 + 스타일 정리

**Priority**: P2 | **Type**: Cleanup | **Deps**: T5, T11, T12, T13

**설명**:
CodeEditorPanel이 CodeViewerPanel의 모든 기능을 완전히 대체한 후, 레거시 code-viewer 파일을 삭제하고 관련 CSS 스타일을 정리한다. spec-viewer에서 사용 중인 모듈(`syntax-highlight.ts`, `language-map.ts`)은 유지한다.

**수용 기준**:
- [ ] `src/code-viewer/code-viewer-panel.tsx` 삭제
- [ ] `src/code-viewer/code-viewer-panel.test.tsx` 삭제
- [ ] `src/code-viewer/line-selection.ts` 삭제
- [ ] `src/code-viewer/line-selection.test.ts` 삭제
- [ ] `src/code-viewer/syntax-highlight.ts` 유지 (spec-viewer 사용)
- [ ] `src/code-viewer/syntax-highlight.test.ts` 유지
- [ ] `src/code-viewer/language-map.ts` 유지 (spec-viewer 사용)
- [ ] `src/code-viewer/language-map.test.ts` 유지
- [ ] App.css에서 레거시 CSS 제거:
  - `.code-line-*` 관련 스타일
  - `.code-viewer-search-*` 검색 바 스타일
  - `.is-search-match`, `.is-search-focus` 하이라이트 스타일
- [ ] `src/App.tsx`에서 `code-viewer` 관련 import가 없음
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npm test` 전체 테스트 통과
- [ ] `npm run build` 빌드 성공

**Target Files**:
- [D] `src/code-viewer/code-viewer-panel.tsx` -- 레거시 코드 뷰어 삭제
- [D] `src/code-viewer/code-viewer-panel.test.tsx` -- 레거시 테스트 삭제
- [D] `src/code-viewer/line-selection.ts` -- 레거시 selection 유틸 삭제
- [D] `src/code-viewer/line-selection.test.ts` -- 레거시 selection 테스트 삭제
- [M] `src/App.css` -- `.code-line-*`, `.code-viewer-search-*`, `.is-search-*` 스타일 제거

**기술 노트**:
- 삭제 전 확인: `grep -r 'code-viewer-panel' src/` → 참조가 없어야 함
- 삭제 전 확인: `grep -r 'line-selection' src/` → `workspace-model.ts`의 `LineSelectionRange`는 유지 (canonical source)
- `code-viewer/` 디렉토리는 `syntax-highlight.ts`, `language-map.ts` + 테스트가 남으므로 디렉토리 자체는 유지
- CSS 정리 시 CM6 gutter 스타일(`.cm-git-gutter`, `.cm-comment-gutter` 등)은 유지
- 삭제 후 `npm run build`로 tree shaking이 정상 동작하는지 확인

---

### T15: 테스트 보강/마이그레이션

**Priority**: P0 | **Type**: Test | **Deps**: T4, T8, T11, T12

**설명**:
기존 code-viewer-panel 테스트의 37개 시나리오를 code-editor-panel 테스트로 포팅하고, Phase 2~3에서 추가된 기능(편집/저장/dirty/guard/gutter)의 테스트를 보강한다.

**수용 기준**:
- [ ] 기존 code-viewer-panel 테스트 시나리오 중 동등 기능이 code-editor-panel 테스트에 포팅됨
  - 파일 렌더링 (텍스트/이미지/binary/too-large fallback)
  - 선택 범위 변경
  - jump-to-line
  - 검색 (CM6 내장 검색으로 대체되므로 동작 확인만)
  - Git marker 표시
  - Comment badge 표시 + hover
  - 컨텍스트 메뉴
- [ ] 편집 모드 테스트: 텍스트 입력 → dirty 상태 변경
- [ ] 저장 테스트: Cmd+S → onSave 콜백 호출
- [ ] dirty guard 테스트: dirty 상태에서 파일 전환 시 confirm
- [ ] cm6-language-map 테스트: 확장자별 언어 매핑 검증
- [ ] cm6-selection-bridge 테스트: position → LineSelectionRange 변환
- [ ] cm6-git-gutter 테스트: 마커 데이터 → GutterMarker 매핑
- [ ] cm6-comment-gutter 테스트: 코멘트 데이터 → badge 매핑
- [ ] `npm test` 전체 통과

**Target Files**:
- [M] `src/code-editor/code-editor-panel.test.tsx` -- 기존 시나리오 포팅 + 편집/저장/dirty 테스트
- [M] `src/code-editor/cm6-language-map.test.ts` -- 언어 매핑 테스트 보강 (Phase 1에서 기본 작성)
- [M] `src/code-editor/cm6-selection-bridge.test.ts` -- 변환 테스트 보강 (Phase 1에서 기본 작성)
- [M] `src/code-editor/cm6-git-gutter.test.ts` -- gutter 마커 매핑 테스트 보강
- [M] `src/code-editor/cm6-comment-gutter.test.ts` -- badge 매핑 테스트 보강

**기술 노트**:
- CM6 jsdom 호환성 이슈: `EditorView`는 실제 DOM이 필요할 수 있음
  - 순수 함수 로직(selection bridge, marker 매핑)은 jsdom 없이 테스트
  - EditorView가 필요한 통합 테스트는 mock 또는 `@testing-library/react` 렌더
- 기존 `code-viewer-panel.test.tsx`의 테스트 구조 참조:
  - describe 그룹: rendering, selection, search, jump, git markers, comments, context menu
  - mock 패턴: `highlightPreviewLines` mock, `window.workspace` mock 등
- CM6 내장 검색은 별도 테스트 불필요 (라이브러리 자체 테스트에 의존)
- Phase 1~3 각 단계에서 기본 테스트를 작성하고, T15에서 누락 시나리오를 보강

---

## Phase 4 완료 검증

### 자동 검증
```bash
npx tsc --noEmit
npm test
npm run build
```

### 수동 스모크 테스트 (전체 회귀)
- [ ] 파일 열기, 편집, Cmd+S 저장
- [ ] 탭 전환(Code/Spec) 후 스크롤 위치 유지
- [ ] spec 링크 클릭 → 코드 라인 점프
- [ ] Ctrl/Cmd+F → CM6 내장 검색 동작
- [ ] Git 마커 표시 (added/modified)
- [ ] 코멘트 badge + hover popover
- [ ] 우클릭 컨텍스트 메뉴 (Copy/Add Comment)
- [ ] dirty 상태에서 파일 전환 → confirm dialog
- [ ] 외부 파일 변경 → dirty면 배너, clean이면 auto-reload
- [ ] 워크스페이스 전환/닫기 동작
- [ ] 이미지/binary 파일 → fallback UI
- [ ] `src/code-viewer/` 디렉토리에 `syntax-highlight.ts`, `language-map.ts` + 테스트만 남아있음
