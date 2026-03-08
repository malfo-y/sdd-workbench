# Theme And Menu Contracts

## 1. 목적

이 문서는 appearance theme state, pre-paint bootstrap, storage fallback, Electron native menu sync 규칙을 정리한다.

## 2. 핵심 계약

1. supported theme는 `dark-gray`, `light` 두 가지다.
2. renderer `appearanceTheme` 상태와 localStorage persistence가 source of truth다.
3. 저장값이 없거나 손상된 경우 `dark-gray`로 fallback 한다.
4. React mount 전에 `document.documentElement[data-theme]`에 persisted value를 반영해 first-paint flash를 줄인다.
5. storage access 실패는 throw하지 않고:
   - load -> `dark-gray` fallback
   - save -> in-memory state 유지
6. main process는 native menu checked state만 mirror 한다.

## 3. native menu 계약

- menu 위치:
  - `View > Theme > Dark Gray | Light`
- IPC:
  - `appearance-theme:menu-request`
  - `appearance-theme:changed`
- role-preserving template를 사용해 기본 app/file/edit/view/window/help 동작을 유지한다.

## 4. theme-aware rendering 범위

- App shell
- sidebar / panel / modal / popover
- CodeMirror theme
- Spec code block Shiki theme
- search / comment / navigation / git marker 상태색

## 5. 관련 구현 파일

- `src/appearance-theme.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/App.css`
- `src/code-editor/cm6-dark-theme.ts`
- `src/code-editor/cm6-light-theme.ts`
- `src/code-viewer/syntax-highlight.ts`
- `electron/appearance-menu.ts`
- `electron/main.ts`
- `electron/preload.ts`

## 6. 관련 테스트

- `src/appearance-theme.test.ts`
- `src/code-viewer/syntax-highlight.test.ts`
- `electron/appearance-menu.test.ts`
- `src/App.test.tsx`
