# Appearance And Navigation

## 1. 목적

이 문서는 App shell 레이아웃, content tab, history navigation, cross-panel jump, appearance theme, native menu를 함께 다룬다.

## 2. 사용자 가시 동작

- Code/Spec 탭을 전환하면서 동일한 콘텐츠 영역을 재사용한다.
- Back/Forward, 워크스페이스 키보드 전환, Code/Spec 키보드 전환을 사용할 수 있다.
- spec -> code, code -> spec 이동 후 도착 라인/블록이 잠깐 하이라이트된다.
- native `View > Theme` 메뉴에서 `Dark Gray`/`Light`를 고를 수 있다.

## 3. 핵심 상태와 source of truth

- shell orchestration:
  - `src/App.tsx`
  - `src/App.css`
- theme bootstrap / persistence:
  - `src/appearance-theme.ts`
  - `src/main.tsx`
  - `src/index.css`
- native menu:
  - `electron/appearance-menu.ts`
  - `electron/main.ts`
  - `electron/preload.ts`

## 4. 핵심 규칙

### 4.1 레이아웃과 탭

- 현재 레이아웃은 2패널(사이드바 + 탭 콘텐츠)이다.
- 비활성 탭은 숨기되 언마운트하지 않아 스크롤/문맥을 보존한다.
- `.md` 파일 선택은 기본적으로 Spec 탭을 열고, explicit source jump는 Code 탭을 우선 연다.

### 4.2 navigation highlight

- explicit navigation만 temporary highlight를 발생시킨다.
- highlight는 search/comment/selection과 별도 additive 상태다.
- 동일 target 재이동은 `token`으로 재트리거한다.

### 4.3 theme

- 현재 supported mode는 `dark-gray`, `light` 두 가지다.
- renderer `appearanceTheme` + localStorage가 source of truth다.
- React mount 전 root `data-theme` bootstrap으로 first-paint flash를 줄인다.
- main process는 native menu checked state만 mirror 한다.

## 5. 주요 코드

- `src/App.tsx`
- `src/App.css`
- `src/index.css`
- `src/appearance-theme.ts`
- `src/main.tsx`
- `src/code-editor/cm6-navigation-highlight.ts`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `electron/appearance-menu.ts`
- `electron/main.ts`
- `electron/preload.ts`

## 6. 관련 계약 문서

- [theme-and-menu-contracts (본 컴포넌트 contracts)](./contracts.md)
- [state-model](../code-editor/contracts.md)
- [navigation-rules](../spec-viewer/contracts.md)
- [ipc-contracts](../workspace-and-file-tree/contracts.md)

## 7. 핵심 테스트

- `src/App.test.tsx`
- `src/appearance-theme.test.ts`
- `src/code-editor/code-editor-panel.test.tsx`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `electron/appearance-menu.test.ts`

## 8. 변경 시 주의점

- navigation 동작은 App shell, code editor, spec viewer 세 군데가 함께 맞아야 한다.
- theme source of truth를 main process로 옮기면 현재 persistence/bootstrap 구조가 크게 바뀐다.
