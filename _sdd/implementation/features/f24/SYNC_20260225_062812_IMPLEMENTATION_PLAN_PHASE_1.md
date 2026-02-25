# Implementation Plan — Phase 1: CM6 Read-Only 교체

**상위 문서**: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
**태스크**: T1 ~ T5
**목표**: CodeViewerPanel을 CM6 기반 read-only CodeEditorPanel로 교체하여 기능 동등성 확보
**모델 권장**: `opus` (CM6 + React lifecycle 조율 복잡)

---

## 태스크 개요

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | CM6 다크 테마 정의 | P0 | - | CM6 Core |
| T2 | CM6 언어 매핑 모듈 구현 | P0 | - | CM6 Core |
| T3 | CM6 selection bridge 유틸 구현 | P0 | - | CM6 Core |
| T4 | CodeEditorPanel 컴포넌트 구현 (read-only) | P0 | T1,T2,T3 | Editor UI |
| T5 | App.tsx에서 CodeViewerPanel → CodeEditorPanel 교체 | P0 | T4 | App Shell |

## 병렬 실행 요약

```
T1 ──┐
T2 ──┼── T4 ── T5
T3 ──┘
```

- **T1, T2, T3**: 완전 독립, 병렬 실행 가능 (파일 충돌 없음)
- **T4**: T1~T3 완료 후 실행
- **T5**: T4 완료 후 실행

| 최대 병렬 | 순차 필수 | 파일 충돌 |
|-----------|-----------|-----------|
| 3 (T1∥T2∥T3) | T4→T5 | 없음 |

---

## 태스크 상세

### T1: CM6 다크 테마 정의

**Priority**: P0 | **Type**: Feature | **Deps**: -

**설명**:
github-dark 유사 다크 테마를 CM6 `EditorView.theme()` + `syntaxHighlighting(oneDarkHighlightStyle)` 조합으로 구현한다. 기존 CodeViewerPanel의 시각적 일관성을 유지하면서 CM6 스타일링 시스템으로 전환한다.

**수용 기준**:
- [ ] `EditorView.theme({ ... }, { dark: true })` 기반 테마가 동작
- [ ] 배경 `#1a1a1a`, 텍스트 `#d3d3d3`, gutter `#7d7d7d`, 선택 `rgba(78,140,198,0.2)` 색상
- [ ] `oneDarkHighlightStyle` 기반 syntax highlighting 동작
- [ ] export로 다른 모듈에서 import 가능

**Target Files**:
- [C] `src/code-editor/cm6-dark-theme.ts` -- CM6 다크 테마 extension 정의

**기술 노트**:
- `@codemirror/theme-one-dark`에서 `oneDarkHighlightStyle` import
- `@codemirror/view`에서 `EditorView.theme()` 사용
- `@codemirror/language`에서 `syntaxHighlighting()` 사용
- 테마 extension과 highlight style을 배열로 export: `export const darkTheme: Extension[]`
- 기존 App.css의 코드 뷰어 배경/텍스트 색상 참조하여 일관성 유지

---

### T2: CM6 언어 매핑 모듈 구현

**Priority**: P0 | **Type**: Feature | **Deps**: -

**설명**:
파일 확장자를 CM6 `LanguageSupport`로 변환하는 lazy mapping 모듈을 구현한다. 기존 `language-map.ts`(Shiki용)와는 별도로, CM6 언어 패키지를 dynamic import하여 번들 크기를 최소화한다.

**수용 기준**:
- [ ] 13개 언어(TS/JS/Python/HTML/CSS/JSON/MD/Rust/C++/Java/SQL/XML/YAML) 지원
- [ ] 미지원 확장자는 plaintext fallback (빈 extension 배열 반환)
- [ ] lazy import (`import()`)로 언어 패키지 로드
- [ ] `Dockerfile`, `Makefile` 등 파일명 기반 매핑도 지원
- [ ] 단위 테스트 통과

**Target Files**:
- [C] `src/code-editor/cm6-language-map.ts` -- 확장자 → CM6 LanguageSupport 매핑
- [C] `src/code-editor/cm6-language-map.test.ts` -- 매핑 테스트

**기술 노트**:
- `async function getCM6Language(filePath: string): Promise<LanguageSupport | null>`
- 기존 `src/code-viewer/language-map.ts`의 확장자 목록 참조하되 CM6 패키지로 매핑
- 설치된 CM6 lang 패키지: `lang-javascript`(TS/JS/JSX/TSX), `lang-python`, `lang-html`, `lang-css`, `lang-markdown`, `lang-json`, `lang-rust`, `lang-cpp`(C/C++), `lang-java`, `lang-sql`, `lang-xml`, `lang-yaml`
- `.tsx`/`.jsx`는 `lang-javascript`에서 `javascript({ typescript: true, jsx: true })` 등으로 설정

---

### T3: CM6 selection bridge 유틸 구현

**Priority**: P0 | **Type**: Feature | **Deps**: -

**설명**:
CM6의 character-based selection(`state.selection.main.from/to`)을 기존 코드베이스에서 사용하는 1-based `LineSelectionRange`로 변환하는 유틸을 구현한다. 빈 selection(커서만)은 커서 위치 라인의 단일 range로 변환한다.

**수용 기준**:
- [ ] `EditorState` → `LineSelectionRange` 변환 함수 동작
- [ ] 빈 selection(from === to)은 커서 라인 단일 range로 변환
- [ ] 복수 라인 selection은 올바른 startLine/endLine 반환
- [ ] 역방향 selection(from > to)도 정규화
- [ ] 순수 함수로 구현되어 jsdom 없이 단위 테스트 가능
- [ ] 단위 테스트 통과

**Target Files**:
- [C] `src/code-editor/cm6-selection-bridge.ts` -- CM6 selection → LineSelectionRange 변환
- [C] `src/code-editor/cm6-selection-bridge.test.ts` -- 변환 로직 테스트

**기술 노트**:
- `LineSelectionRange`는 `src/workspace/workspace-model.ts`에서 import
- CM6: `state.selection.main.from/to` → `state.doc.lineAt(pos).number` → `{ startLine, endLine }`
- 순수 함수 시그니처: `function selectionToLineRange(state: EditorState): LineSelectionRange`
- CM6 `EditorState` mock이 어려우면 primitive 입력으로 분리: `function positionsToLineRange(doc: Text, from: number, to: number): LineSelectionRange`

---

### T4: CodeEditorPanel 컴포넌트 구현 (read-only)

**Priority**: P0 | **Type**: Feature | **Deps**: T1, T2, T3

**설명**:
CM6 기반 read-only 코드 뷰어 컴포넌트를 구현한다. 기존 CodeViewerPanel과 동일한 Props 인터페이스를 유지하여 App.tsx에서 교체만으로 동작하도록 한다. Image/binary/too-large fallback UI, jump-to-line, selection bridge, 검색(`@codemirror/search`)을 포함한다.

**수용 기준**:
- [ ] React ref 기반 `EditorView` 생성/소멸 lifecycle 동작
- [ ] `readOnly` extension으로 편집 불가 상태
- [ ] 파일 변경 시 `EditorView`의 document가 올바르게 교체됨
- [ ] 다크 테마 적용 (`cm6-dark-theme`)
- [ ] 언어별 syntax highlighting 적용 (`cm6-language-map`)
- [ ] `@codemirror/search`의 Ctrl/Cmd+F 검색 동작
- [ ] selection 변경 시 `onSelectRange` 콜백 호출 (selection bridge 사용)
- [ ] `jumpRequest` 수신 시 `EditorView.scrollIntoView` 동작
- [ ] image preview / preview unavailable / too large fallback UI 유지
- [ ] `.cm-editor { height: 100% }` 스타일로 컨테이너 채움
- [ ] Props 인터페이스가 기존 CodeViewerPanel과 호환

**Target Files**:
- [C] `src/code-editor/code-editor-panel.tsx` -- CM6 read-only 에디터 컴포넌트
- [C] `src/code-editor/code-editor-panel.test.tsx` -- 기본 렌더링/lifecycle 테스트

**기술 노트**:
- `useRef<HTMLDivElement>` + `useEffect`로 `EditorView` 생성, cleanup에서 `view.destroy()`
- Extensions: `[EditorState.readOnly.of(true), darkTheme, languageSupport, search(), keymap.of([...defaultKeymap, ...searchKeymap]), selectionBridgeExtension]`
- 파일 변경 감지: `activeFileContent` 변경 시 `view.dispatch({ changes: { from: 0, to: doc.length, insert: newContent } })`
- 또는 `EditorView`를 재생성 (언어도 바뀔 수 있으므로 재생성이 더 안전할 수 있음)
- `jumpRequest` 처리: `view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'center' }) })`
- selection bridge: `EditorView.updateListener.of(update => { if (update.selectionSet) onSelectRange(...) })`
- Image/fallback UI는 CM6 외부에서 조건 분기로 렌더 (기존 CodeViewerPanel 패턴 유지)
- 기존 CodeViewerPanel의 `CodeViewerJumpRequest` 타입 재사용 또는 동일 타입 재정의

---

### T5: App.tsx CodeViewerPanel → CodeEditorPanel 교체

**Priority**: P0 | **Type**: Feature | **Deps**: T4

**설명**:
App.tsx에서 `CodeViewerPanel` import를 `CodeEditorPanel`로 교체하고 props를 매핑한다. CM6 에디터가 컨테이너를 채우도록 CSS를 추가한다.

**수용 기준**:
- [ ] `CodeViewerPanel` import가 `CodeEditorPanel`로 교체됨
- [ ] 모든 기존 props가 올바르게 전달됨
- [ ] CM6 `.cm-editor`가 content pane을 100% 채움
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npm test` 전체 테스트 통과
- [ ] `npm run build` 빌드 성공

**Target Files**:
- [M] `src/App.tsx` -- CodeViewerPanel → CodeEditorPanel import 교체 + props 매핑
- [M] `src/App.css` -- `.cm-editor { height: 100% }` 등 CM6 컨테이너 스타일 추가

**기술 노트**:
- import 변경: `'./code-viewer/code-viewer-panel'` → `'./code-editor/code-editor-panel'`
- Props 호환이 목표이므로 매핑 변경 최소화
- 기존 code-viewer 관련 CSS(`.code-line-*`, `.code-viewer-search-*`)는 아직 삭제하지 않음 (Phase 4)
- `App.test.tsx`에서 CodeViewerPanel mock이 있다면 CodeEditorPanel로 교체 필요

---

## Phase 1 완료 검증

### 자동 검증
```bash
npx tsc --noEmit
npm test
npm run build
```

### 수동 스모크 테스트
- [ ] 파일 트리에서 `.ts` 파일 선택 → CM6 에디터에 syntax highlight 렌더
- [ ] `.py`, `.json`, `.md`, `.css` 등 다른 언어 파일 → 언어별 하이라이트 동작
- [ ] 이미지 파일 선택 → 기존 image preview UI 유지
- [ ] binary 파일 선택 → "preview unavailable" UI 유지
- [ ] Ctrl/Cmd+F → CM6 내장 검색 패널 열림
- [ ] spec 링크 클릭 → 코드 라인 점프(scrollIntoView) 동작
- [ ] 코드 영역 드래그 → selection range 변경 + 컨텍스트 메뉴 동작
- [ ] 텍스트 입력 시도 → read-only로 편집 불가
- [ ] 탭 전환(Code/Spec) → 스크롤 위치 유지
