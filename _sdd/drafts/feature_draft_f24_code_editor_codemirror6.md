# Feature Draft: F24 — Code Editor (CodeMirror 6 전환)

## Context

기존 3패널→2패널 전환(F23) 이후, read-only CodeViewerPanel을 CodeMirror 6 기반 편집 가능 에디터로 교체한다. 코드 코멘트를 보며 직접 수정 가능하게 하여 spec-code 왕복 편집 비용을 줄인다. `feat/text_editor` 브랜치에서 작업.

## Part 1: Spec Patch Draft

> 이 패치는 해당 스펙 섹션에 직접 반영하거나, `spec-update-todo` 스킬의 입력으로 사용할 수 있음.

# Spec Update Input

**Date**: 2026-02-24
**Author**: user + Claude
**Target Spec**: `_sdd/spec/main.md` 및 하위 문서

## New Features

### Feature: F24 코드 에디터 (CodeMirror 6 기반)
**Priority**: High
**Category**: Core Feature
**Target Component**: `src/code-editor/*` (신규), App Shell, Electron Boundary
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.4 Code Viewer Layer` (대체)

**Description**:
기존 custom line-rendering + Shiki 기반 read-only CodeViewerPanel을 CodeMirror 6 기반 CodeEditorPanel로 교체한다. Phase 1에서 read-only 뷰어 동등성을 확보하고, Phase 2에서 편집 + 저장 + dirty 상태 관리를 추가하며, Phase 3에서 gutter extension(Git 마커, 코멘트 배지)을 복원하고, Phase 4에서 레거시 코드를 정리한다.

**Acceptance Criteria**:
- [ ] CM6 기반 코드 뷰어가 기존 CodeViewerPanel의 모든 기능을 대체
- [ ] 다크 테마(github-dark 유사)가 CM6 theme extension으로 구현
- [ ] `@codemirror/search`가 기존 F21 커스텀 검색을 대체
- [ ] `workspace:writeFile` IPC가 atomic write + 경계 검사로 구현
- [ ] Cmd+S로 수동 저장 동작
- [ ] Dirty 상태 인디케이터 + unsaved changes guard
- [ ] Dirty 파일의 외부 변경 시 auto-reload 건너뛰고 배너 표시
- [ ] Git line marker / Comment badge gutter가 CM6 extension으로 동작
- [ ] 우클릭 컨텍스트 메뉴(Copy, Add Comment)가 CM6 내에서 동작

**Technical Notes**:
- CM6 패키지: `@codemirror/state`, `view`, `language`, `commands`, `search`, `theme-one-dark` + 언어별 패키지
- Shiki는 spec-viewer(`HighlightedCodeBlock`)에서 계속 사용하므로 삭제하지 않음
- `line-selection.ts`의 유틸은 code-viewer 내부에서만 사용되므로 삭제 가능
- `LineSelectionRange`는 `workspace-model.ts`의 정의를 canonical source로 유지

**Dependencies**: 없음

---

## Component Changes

### New: CodeEditorPanel (`src/code-editor/code-editor-panel.tsx`)
- CM6 기반 코드 읽기/편집 통합 컴포넌트

### New: CM6 Language Map (`src/code-editor/cm6-language-map.ts`)
- 파일 확장자 → CM6 LanguageSupport 매핑 + lazy loading

### New: CM6 Dark Theme (`src/code-editor/cm6-dark-theme.ts`)
- github-dark 유사 다크 테마 (oneDark 기반)

### New: CM6 Selection Bridge (`src/code-editor/cm6-selection-bridge.ts`)
- CM6 character-based selection → `LineSelectionRange` 변환

### New: CM6 Gutter Extensions (`cm6-git-gutter.ts`, `cm6-comment-gutter.ts`)
- Git line marker / Comment badge gutter

### Modified: Electron IPC
- `workspace:writeFile` IPC 채널 추가 (atomic write, 경계 검사)

### Modified: WorkspaceProvider
- `isDirty` 상태 + `saveFile` 액션 + watcher dirty guard

### Modified: App Shell
- CodeViewerPanel → CodeEditorPanel 교체 + dirty indicator + unsaved guard

### Delete (Phase 4): `code-viewer-panel.tsx`, `line-selection.ts` + 테스트
### Preserve: `syntax-highlight.ts`, `language-map.ts` (spec-viewer 사용 중)

---

# Part 2: Implementation Plan

## Overview

CodeViewerPanel(custom line rendering + Shiki)을 CodeMirror 6 기반 CodeEditorPanel로 교체. 4개 Phase로 점진 마이그레이션, 각 Phase 독립 검증 가능.

## Scope

### In Scope
- CM6 에디터 (read-only → editable), 다크 테마, 언어 매핑
- Selection bridge (CM6 → LineSelectionRange)
- CM6 `@codemirror/search` (기존 F21 대체)
- `workspace:writeFile` IPC + Cmd+S 저장 + dirty 상태
- Unsaved changes guard + watcher dirty-aware reload
- Git marker / Comment badge gutter extension
- 레거시 code-viewer 정리

### Out of Scope
- Auto-save, auto-format, LSP, minimap, multi-cursor 커스텀
- Shiki 삭제 (spec-viewer 사용 중)

## Implementation Phases

### Phase 1: CM6 Read-Only 교체
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | CM6 패키지 설치 + 다크 테마 정의 | P0 | - | CM6 Core |
| T2 | CM6 언어 매핑 모듈 구현 | P0 | T1 | CM6 Core |
| T3 | CM6 selection bridge 유틸 구현 | P0 | T1 | CM6 Core |
| T4 | CodeEditorPanel 컴포넌트 구현 (read-only) | P0 | T1,T2,T3 | Editor UI |
| T5 | App.tsx에서 CodeViewerPanel → CodeEditorPanel 교체 | P0 | T4 | App Shell |

### Phase 2: 편집 + 저장 + Dirty 상태
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T6 | `workspace:writeFile` IPC 구현 | P0 | - | IPC Layer |
| T7 | Workspace dirty 상태 + save 액션 구현 | P0 | T6 | State Layer |
| T8 | CM6 편집 모드 활성화 + Cmd+S keymap | P0 | T5,T7 | Editor UI |
| T9 | Unsaved changes guard 구현 | P0 | T7,T8 | State Layer |
| T10 | Watcher dirty-aware auto-reload + 배너 | P1 | T7 | State Layer |

### Phase 3: Gutter Extensions
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T11 | Git line marker gutter extension | P1 | T5 | Gutter |
| T12 | Comment badge gutter + hover popover | P1 | T5 | Gutter |
| T13 | 컨텍스트 메뉴 (Copy/Add Comment) CM6 통합 | P1 | T5 | Editor UI |

### Phase 4: 레거시 정리
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T14 | 레거시 code-viewer 파일 삭제 + 스타일 정리 | P2 | T5,T11,T12,T13 | Cleanup |
| T15 | 테스트 보강/마이그레이션 | P0 | T4,T8,T11,T12 | Test |

## Task Details

### T1: CM6 패키지 설치 + 다크 테마 정의
**Priority**: P0 | **Type**: Feature | **Deps**: -

설치: `@codemirror/state`, `view`, `language`, `commands`, `search`, `theme-one-dark`, `lang-javascript`, `lang-python`, `lang-html`, `lang-css`, `lang-markdown`, `lang-json`, `lang-rust`, `lang-cpp`, `lang-java`, `lang-sql`, `lang-xml`, `lang-yaml`

테마: `EditorView.theme({ ... }, { dark: true })` + `syntaxHighlighting(oneDarkHighlightStyle)` 조합. 배경 `#1a1a1a`, 텍스트 `#d3d3d3`, gutter `#7d7d7d`, 선택 `rgba(78,140,198,0.2)`.

**Target Files**:
- [M] `package.json` -- CM6 의존성 추가
- [C] `src/code-editor/cm6-dark-theme.ts` -- 다크 테마

---

### T2: CM6 언어 매핑 모듈 구현
**Priority**: P0 | **Type**: Feature | **Deps**: T1

확장자 → CM6 `LanguageSupport` lazy mapping. 주요 13개 언어(TS/JS/Python/HTML/CSS/JSON/MD/Rust/C++/Java/SQL/XML/YAML) 지원, 나머지 plaintext fallback.

**Target Files**:
- [C] `src/code-editor/cm6-language-map.ts`

---

### T3: CM6 selection bridge 유틸 구현
**Priority**: P0 | **Type**: Feature | **Deps**: T1

`state.selection.main.from/to` → `state.doc.lineAt(pos).number` → `LineSelectionRange`. 빈 selection은 커서 라인 단일 range.

**Target Files**:
- [C] `src/code-editor/cm6-selection-bridge.ts`
- [C] `src/code-editor/cm6-selection-bridge.test.ts`

---

### T4: CodeEditorPanel 컴포넌트 (read-only)
**Priority**: P0 | **Type**: Feature | **Deps**: T1,T2,T3

React ref → `EditorView` 생성/소멸. Extensions: `[readOnly, darkTheme, languageSupport, search(), selectionBridge, keymap.of(defaultKeymap)]`. Props는 기존 CodeViewerPanel과 호환. Image/binary/too-large fallback UI 유지. Jump-to-line via `EditorView.scrollIntoView`.

**Target Files**:
- [C] `src/code-editor/code-editor-panel.tsx`
- [C] `src/code-editor/code-editor-panel.test.tsx`

---

### T5: App.tsx CodeViewerPanel → CodeEditorPanel 교체
**Priority**: P0 | **Type**: Feature | **Deps**: T4

Import 교체 + props 매핑. CM6 `.cm-editor { height: 100% }` CSS.

**Target Files**:
- [M] `src/App.tsx`
- [M] `src/App.css`

---

### T6: `workspace:writeFile` IPC 구현
**Priority**: P0 | **Type**: Feature | **Deps**: -

`handleWorkspaceWriteFile`: 경로 검증(`isPathInsideWorkspace`), 크기 검사(2MB), atomic write(`writeFileAtomic`), write operation counter. Preload bridge + Window 타입 확장.

**Target Files**:
- [M] `electron/main.ts`
- [M] `electron/preload.ts`
- [M] `electron/electron-env.d.ts`

---

### T7: Workspace dirty 상태 + save 액션
**Priority**: P0 | **Type**: Feature | **Deps**: T6

`WorkspaceSession.isDirty: boolean` 추가. `saveFile(content)` → `writeFile` IPC → 성공 시 dirty 해제.

**Target Files**:
- [M] `src/workspace/workspace-model.ts`
- [M] `src/workspace/workspace-context.tsx`
- [M] `src/workspace/workspace-model.test.ts`

---

### T8: CM6 편집 모드 + Cmd+S
**Priority**: P0 | **Type**: Feature | **Deps**: T5,T7

`Compartment`으로 `readOnly` 동적 전환. `Mod-s` keymap → `onSave(doc.toString())`. `updateListener`에서 `docChanged` → dirty.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx`
- [M] `src/code-editor/code-editor-panel.test.tsx`

---

### T9: Unsaved changes guard
**Priority**: P0 | **Type**: Feature | **Deps**: T7,T8

dirty 시 파일 전환/워크스페이스 전환/닫기: confirm dialog. 창 닫기: `beforeunload`.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx`
- [M] `src/App.tsx`

---

### T10: Watcher dirty-aware auto-reload
**Priority**: P1 | **Type**: Feature | **Deps**: T7

dirty 파일 외부 변경 시 reload 건너뛰기 + "File changed on disk. Reload?" 배너.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx`
- [M] `src/App.tsx`

---

### T11: Git line marker gutter extension
**Priority**: P1 | **Type**: Feature | **Deps**: T5

CM6 `gutter()` API로 added(green)/modified(blue) dot. `gitLineMarkers` Map → `StateEffect`로 주입.

**Target Files**:
- [C] `src/code-editor/cm6-git-gutter.ts`
- [M] `src/code-editor/code-editor-panel.tsx`
- [M] `src/App.css`

---

### T12: Comment badge gutter + hover popover
**Priority**: P1 | **Type**: Feature | **Deps**: T5

`GutterMarker.toDOM()`에서 badge span + mouseenter/mouseleave. React state로 popover 관리. 기존 `CommentHoverPopover` 재사용. 120ms close delay.

**Target Files**:
- [C] `src/code-editor/cm6-comment-gutter.ts`
- [M] `src/code-editor/code-editor-panel.tsx`
- [M] `src/App.css`

---

### T13: 컨텍스트 메뉴 CM6 통합
**Priority**: P1 | **Type**: Feature | **Deps**: T5

`EditorView.domEventHandlers({ contextmenu })` → 기존 `CopyActionPopover` 재사용. selection bridge로 LineSelectionRange 전달.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx`

---

### T14: 레거시 code-viewer 삭제 + 스타일 정리
**Priority**: P2 | **Type**: Cleanup | **Deps**: T5,T11,T12,T13

삭제: `code-viewer-panel.tsx`, `.test.tsx`, `line-selection.ts`, `.test.ts`
유지: `syntax-highlight.ts`, `language-map.ts` (spec-viewer 사용)
CSS: `.code-line-*`, `.code-viewer-search-*`, `.is-search-*` 스타일 제거

**Target Files**:
- [D] `src/code-viewer/code-viewer-panel.tsx`
- [D] `src/code-viewer/code-viewer-panel.test.tsx`
- [D] `src/code-viewer/line-selection.ts`
- [D] `src/code-viewer/line-selection.test.ts`
- [M] `src/App.css`

---

### T15: 테스트 보강/마이그레이션
**Priority**: P0 | **Type**: Test | **Deps**: T4,T8,T11,T12

기존 37개 코드뷰어 테스트 시나리오 포팅 + 편집/저장/dirty/guard/gutter 테스트 추가.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.test.tsx`
- [C] `src/code-editor/cm6-language-map.test.ts`
- [C] `src/code-editor/cm6-git-gutter.test.ts`
- [C] `src/code-editor/cm6-comment-gutter.test.ts`

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CM6 번들 크기 증가 | Medium | 언어 패키지 lazy import, tree shaking |
| CM6 jsdom 테스트 호환성 | Medium | extension 로직을 순수 함수로 분리 |
| dirty 상태에서 watcher race condition | Medium | dirty 체크를 watcher handler 내에서 동기적 수행 (ref) |
| 대용량 파일 CM6 성능 | Low | CM6 virtual rendering (viewport 밖 미렌더) |

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | Sequential |
|-------|-------------|--------------|------------|
| 1 | 5 | 3 (T1,T2,T3 → T4 → T5) | T4→T5 |
| 2 | 5 | 2 (T6∥T5 → T7 → T8 → T9,T10) | T7→T8→T9 |
| 3 | 3 | 3 (T11∥T12∥T13) | 0 |
| 4 | 2 | 1 (T14 after all, T15 incremental) | T14 last |

## Model Recommendation
- Phase 1 (T1~T5): `opus` — CM6 통합은 아키텍처 결정 많고 React+CM6 lifecycle 조율 복잡
- Phase 2 (T6~T10): `sonnet` — 기존 IPC 패턴 추종
- Phase 3 (T11~T13): `sonnet` — CM6 gutter API 기반, 중간 복잡도
- Phase 4 (T14~T15): `sonnet` — 정리/테스트

## Verification
1. `npm test` — 전체 테스트 통과 (각 Phase 완료 후)
2. `npx tsc --noEmit` — 타입 에러 없음
3. `npm run build` — 빌드 성공
4. `npm run dev` — 수동 스모크: 파일 열기, 편집, Cmd+S 저장, 탭 전환, spec 링크 점프, 컨텍스트 메뉴, git 마커, 코멘트 배지
