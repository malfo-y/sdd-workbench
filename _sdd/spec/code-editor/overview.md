# Code Editor

## 1. 목적

이 문서는 CodeMirror 6 기반 코드 에디터의 읽기/편집/저장/검색/jump/highlight 동작과 주요 구현 지점을 정리한다.

## 2. 사용자 가시 동작

- 일반 텍스트와 코드 파일을 읽고 편집할 수 있다.
- `Cmd+S`로 저장하고, dirty 상태를 확인할 수 있다.
- line wrap을 켜고 끌 수 있다.
- 코드 검색, 코멘트 추가, Copy Relative Path, `Go to Spec` 같은 컨텍스트 액션을 사용할 수 있다.
- git line marker, comment gutter, navigation highlight가 같은 에디터 안에서 공존한다.

## 3. 핵심 상태와 source of truth

- 에디터 내부 상태:
  - `src/code-editor/code-editor-panel.tsx`
- selection 브리지:
  - `src/code-editor/cm6-selection-bridge.ts`
- gutter / highlight extension:
  - `src/code-editor/cm6-git-gutter.ts`
  - `src/code-editor/cm6-comment-gutter.ts`
  - `src/code-editor/cm6-navigation-highlight.ts`
- language/theme routing:
  - `src/code-editor/cm6-language-map.ts`
  - `src/code-editor/cm6-dark-theme.ts`
  - `src/code-editor/cm6-light-theme.ts`

## 4. 핵심 규칙

### 4.1 편집과 저장

- `docChanged`가 발생하면 renderer session의 `isDirty=true`로 전환한다.
- auto-save는 없고 `Cmd+S` 수동 저장만 지원한다.
- dirty 상태에서 파일 전환/창 닫기/외부 변경 충돌은 confirm 또는 배너로 다룬다.

### 4.2 검색 / wrap / fallback

- 현재 검색은 CM6 `@codemirror/search`를 사용한다.
- line wrap은 `wrapCompartment`로 동적 전환한다.
- image/binary/too-large 파일은 편집기 대신 fallback UI를 사용한다.

### 4.3 jump와 highlight

- spec-origin jump는 line scroll과 optional exact offset selection을 함께 지원한다.
- `Go to Spec`는 active file이 `.md`일 때만 노출한다.
- navigation highlight는 search/selection/comment와 분리된 additive decoration이다.

## 5. 주요 코드

- `src/code-editor/code-editor-panel.tsx`
- `src/code-editor/cm6-selection-bridge.ts`
- `src/code-editor/cm6-git-gutter.ts`
- `src/code-editor/cm6-comment-gutter.ts`
- `src/code-editor/cm6-navigation-highlight.ts`
- `src/code-editor/cm6-dark-theme.ts`
- `src/code-editor/cm6-light-theme.ts`
- `src/code-editor/cm6-language-map.ts`

## 6. 관련 계약 문서

- [state-model (본 컴포넌트 contracts)](./contracts.md)
- [navigation-rules](../spec-viewer/contracts.md)
- [search-rules](../spec-viewer/contracts.md)
- [theme-and-menu-contracts](../appearance-and-navigation/contracts.md)

## 7. 핵심 테스트

- `src/code-editor/code-editor-panel.test.tsx`
- `src/code-editor/cm6-selection-bridge.test.ts`
- `src/code-editor/cm6-git-gutter.test.ts`
- `src/code-editor/cm6-comment-gutter.test.ts`
- `src/App.test.tsx`

## 8. 변경 시 주의점

- line selection 모델과 exact offset selection 모델을 동시에 유지해야 한다.
- 에디터 UI를 바꿀 때 context menu 액션 노출 조건과 jump/highlight 재트리거 규칙을 함께 봐야 한다.
