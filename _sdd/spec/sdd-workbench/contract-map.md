# Contract Map

## 목적

이 문서는 전역 타입/IPC/검색/내비게이션/코멘트/theme 계약의 허브다. 상세 규칙은 하위 계약 문서로 분리한다.

## 1. 가장 중요한 전역 불변식

1. 라인 번호는 전역적으로 1-based다.
2. exact source offset은 same-file raw markdown 기준 0-based half-open `[startOffset, endOffset)`다.
3. line range는 global selection 모델의 기본 계약으로 계속 유지한다.
4. comment source of truth는 `_COMMENTS.md`가 아니라 `.sdd-workbench/comments.json` 및 `.sdd-workbench/global-comments.md`다.
5. search, comment, selection, navigation highlight는 서로 다른 시각 상태다.
6. renderer `appearanceTheme`와 localStorage가 theme source of truth다.
7. local/remote 차이는 가능한 한 `workspace:*` IPC 뒤에 숨긴다.

## 2. 계약 문서 맵

| 계약 문서 | 다루는 범위 |
|---|---|
| [state-model](./contracts/state-model.md) | 핵심 타입과 전역 상태 불변식 |
| [ipc-contracts](./contracts/ipc-contracts.md) | `workspace:*`, `system:*`, `appearance-theme:*` 채널 |
| [navigation-rules](./contracts/navigation-rules.md) | 링크 해석, source action, code/spec 왕복 이동, highlight |
| [search-rules](./contracts/search-rules.md) | Code/File/Spec 검색, wildcard, cap, partial hint |
| [comment-contracts](./contracts/comment-contracts.md) | comment schema, persistence, export, marker, hover preview |
| [theme-and-menu-contracts](./contracts/theme-and-menu-contracts.md) | theme mode, bootstrap, storage fallback, native menu sync |

## 3. 읽는 순서

- 타입부터 파악할 때:
  - `state-model` -> 필요한 domain doc
- IPC를 바꿀 때:
  - `ipc-contracts` -> `code-map.md`의 Electron/Main 영역
- source jump/search/comment를 바꿀 때:
  - `navigation-rules`
  - `search-rules`
  - `comment-contracts`

## 4. 유지보수 규칙

1. 새 규칙을 추가할 때는 가장 가까운 하위 계약 문서 1곳에만 canonical하게 적는다.
2. 이 허브 문서에는 요약과 링크만 유지한다.
3. 구현 세부 파일 목록은 `code-map.md`에 둔다.
