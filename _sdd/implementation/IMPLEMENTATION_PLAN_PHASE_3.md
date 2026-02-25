# Implementation Plan — Phase 3: Gutter Extensions

**상위 문서**: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
**태스크**: T11 ~ T13
**전제**: Phase 1 (T5) 완료 (Phase 2와 병렬 진행 가능)
**목표**: CM6 gutter API로 Git line marker, Comment badge, 컨텍스트 메뉴를 복원
**모델 권장**: `sonnet` (CM6 gutter API 기반, 중간 복잡도)

---

## 태스크 개요

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T11 | Git line marker gutter extension | P1 | T5 | Gutter |
| T12 | Comment badge gutter + hover popover | P1 | T5 | Gutter |
| T13 | 컨텍스트 메뉴 (Copy/Add Comment) CM6 통합 | P1 | T5 | Editor UI |

## 병렬 실행 요약

```
T11 ┐
T12 ├── (T5 의존, 서로 독립)
T13 ┘
```

- **T11, T12, T13**: 서로 독립적인 extension이지만, 모두 `code-editor-panel.tsx`에 통합 필요
- 개별 extension 파일은 병렬 작성 가능, 최종 통합은 순차

| 최대 병렬 | 순차 필수 | 파일 충돌 |
|-----------|-----------|-----------|
| 3 (T11∥T12∥T13 extension 파일) | `code-editor-panel.tsx` 통합은 순차 | `code-editor-panel.tsx` (순차 통합) |

---

## 태스크 상세

### T11: Git line marker gutter extension

**Priority**: P1 | **Type**: Feature | **Deps**: T5

**설명**:
CM6 `gutter()` API를 사용하여 Git diff 라인 마커(added: green, modified: blue)를 line number gutter 옆에 표시한다. 외부에서 `gitLineMarkers` Map을 `StateEffect`로 주입한다.

**수용 기준**:

- [ ] CM6 `gutter()` 기반 Git 마커 gutter 동작
- [ ] `added` 라인에 green dot, `modified` 라인에 blue dot 표시
- [ ] `StateEffect`로 마커 데이터를 외부에서 주입 가능
- [ ] 마커 데이터 변경(파일 전환, refresh) 시 gutter 업데이트
- [ ] image preview / preview unavailable 모드에서는 gutter 미표시 (에디터 자체가 미렌더)
- [ ] 단위 테스트 통과 (순수 함수 로직)
- [ ] CSS 스타일이 기존 Git marker와 시각적으로 일치

**Target Files**:

- [C] `src/code-editor/cm6-git-gutter.ts` -- Git marker gutter extension
- [C] `src/code-editor/cm6-git-gutter.test.ts` -- marker 매핑 로직 테스트
- [M] `src/code-editor/code-editor-panel.tsx` -- gitGutter extension 추가 + StateEffect dispatch
- [M] `src/App.css` -- CM6 git gutter dot 스타일 (기존 `.code-line-git-marker` 대체)

**기술 노트**:

- `StateField<Map<number, 'added'|'modified'>>` + `StateEffect<Map<number, 'added'|'modified'>>`
- `gutter({ class: 'cm-git-gutter', lineMarker: (view, line) => ... })`
- `GutterMarker` 서브클래스: `toDOM()`에서 colored dot span 반환
- Props의 `gitLineMarkers?: ReadonlyMap<number, WorkspaceGitLineMarkerKind>` → `StateEffect` dispatch
- `useEffect`에서 `gitLineMarkers` 변경 감지 → `view.dispatch({ effects: setGitMarkers.of(newMap) })`
- CSS: `.cm-git-gutter .cm-git-added { color: #2ea043 }`, `.cm-git-modified { color: #1f6feb }`

---

### T12: Comment badge gutter + hover popover

**Priority**: P1 | **Type**: Feature | **Deps**: T5

**설명**:
CM6 gutter에 코멘트 count badge를 표시하고, badge hover 시 기존 `CommentHoverPopover` 컴포넌트를 재사용하여 코멘트 본문 미리보기를 제공한다. 120ms close delay를 유지한다.

**수용 기준**:

- [ ] 코멘트가 있는 라인에 count badge 표시 (gutter marker)
- [ ] badge mouseenter → hover popover 표시 (기존 `CommentHoverPopover` 재사용)
- [ ] popover는 최대 3개 코멘트 표시, 초과분 `+N more`
- [ ] mouseleave 시 120ms delay 후 popover 닫힘
- [ ] Esc / outside click으로도 popover 닫힘
- [ ] `StateEffect`로 코멘트 데이터 외부 주입

**Target Files**:

- [C] `src/code-editor/cm6-comment-gutter.ts` -- Comment badge gutter extension
- [C] `src/code-editor/cm6-comment-gutter.test.ts` -- badge 매핑 로직 테스트
- [M] `src/code-editor/code-editor-panel.tsx` -- commentGutter extension 추가 + hover state 관리
- [M] `src/App.css` -- CM6 comment badge 스타일

**기술 노트**:

- `StateField<Map<number, { count: number, entries: CodeComment[] }>>` + `StateEffect`
- `GutterMarker.toDOM()`에서 badge span 렌더 + `mouseenter`/`mouseleave` 이벤트 바인딩
- Hover popover 관리: CM6 gutter 내 DOM 이벤트 → React state로 브릿지
  - `GutterMarker.toDOM()`에서 이벤트 → `onCommentHover(lineNumber, rect)` 콜백
  - `CodeEditorPanel` 내부에서 `CommentHoverPopover` 조건부 렌더
- Props: `commentLineCounts`, `commentLineEntries` → `StateEffect` dispatch
- 120ms delay: `setTimeout` + `clearTimeout` (기존 CodeViewerPanel 패턴 재사용)
- `HOVER_POPOVER_CLOSE_DELAY_MS = 120` 상수 유지

---

### T13: 컨텍스트 메뉴 (Copy/Add Comment) CM6 통합

**Priority**: P1 | **Type**: Feature | **Deps**: T5

**설명**:
CM6 `EditorView.domEventHandlers({ contextmenu })` 로 우클릭 이벤트를 가로채, 기존 `CopyActionPopover` 컴포넌트를 재사용하여 Copy/Add Comment 액션을 제공한다. selection bridge로 `LineSelectionRange`를 전달한다.

**수용 기준**:

- [ ] CM6 에디터 영역 우클릭 → 기존 `CopyActionPopover` 표시
- [ ] Popover에 Copy Relative Path, Copy Selection, Copy Both, Add Comment 액션 제공
- [ ] selection이 없을 때(커서만)도 현재 라인 기준으로 동작
- [ ] 브라우저 기본 컨텍스트 메뉴 방지 (`preventDefault`)
- [ ] selection bridge를 통해 `LineSelectionRange`로 변환 후 콜백 전달

**Target Files**:

- [M] `src/code-editor/code-editor-panel.tsx` -- contextmenu domEventHandler + CopyActionPopover 렌더

**기술 노트**:

- `EditorView.domEventHandlers({ contextmenu: (event, view) => { ... } })`
- `event.preventDefault()` 후 selection bridge로 현재 selection → `LineSelectionRange` 변환
- 마우스 위치(`event.clientX/Y`)와 selection range를 React state에 저장
- `CopyActionPopover`는 기존 코드에서 이미 `import { CopyActionPopover } from '../context-menu/copy-action-popover'` 사용 중
- Props 콜백: `onRequestCopyRelativePath`, `onRequestCopySelectedContent`, `onRequestCopyBoth`, `onRequestAddComment` — 기존 인터페이스 그대로 유지

---

## Phase 3 완료 검증

### 자동 검증

```bash
npx tsc --noEmit
npm test
npm run build
```

### 수동 스모크 테스트

- [ ] Git 변경이 있는 파일 열기 → added(초록)/modified(파란) gutter dot 표시
- [ ] 코멘트가 있는 파일 열기 → 해당 라인에 count badge 표시
- [ ] badge hover → popover에 코멘트 본문 미리보기 표시
- [ ] popover에서 마우스 벗어남 → 120ms 후 닫힘
- [ ] 에디터 영역 우클릭 → Copy/Add Comment popover 표시
- [ ] Copy Relative Path → 클립보드에 경로 복사
- [ ] Add Comment → 코멘트 모달 열림
- [ ] 드래그 선택 후 우클릭 → Copy Selection/Copy Both 동작
