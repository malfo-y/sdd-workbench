# Component Map

## 목적

이 문서는 도메인별 책임, 핵심 코드 경로, 흔한 변경 시작점을 빠르게 좁히기 위한 컴포넌트 허브다.

- 기능 ID 기준 진입은 [feature-index](./feature-index.md)
- 파일/테스트 기준 진입은 [code-map](./code-map.md)
- 세부 계약은 [contract-map](./contract-map.md)

## 1. Component Index

| 도메인 | 사용자 가시 범위 | 상세 문서 | 핵심 코드 경로 | 검증 시작점 |
|---|---|---|---|---|
| Workspace / File Tree | 멀티 워크스페이스, 파일 트리, lazy indexing, CRUD, 파일 검색, Git 파일 상태 | [workspace-and-file-tree](./domains/workspace-and-file-tree.md) | `src/file-tree/file-tree-panel.tsx`, `src/workspace/workspace-context.tsx`, `electron/workspace-search.ts`, `electron/git-file-statuses.ts` | `src/file-tree/file-tree-panel.test.tsx`, `electron/workspace-search.test.ts`, `electron/git-file-statuses.test.ts` |
| Code Editor | CM6 편집/저장/검색/wrap/gutter, line jump, code highlight | [code-editor](./domains/code-editor.md) | `src/code-editor/code-editor-panel.tsx`, `src/code-editor/cm6-selection-bridge.ts`, `src/code-editor/cm6-git-gutter.ts`, `src/code-editor/cm6-comment-gutter.ts` | `src/code-editor/code-editor-panel.test.tsx`, `src/code-editor/cm6-selection-bridge.test.ts` |
| Spec Viewer | rendered markdown, source action, exact offset, same-file source/spec 왕복, spec 검색 | [spec-viewer](./domains/spec-viewer.md) | `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/source-line-metadata.ts`, `src/spec-viewer/source-line-resolver.ts`, `src/spec-viewer/spec-search.ts` | `src/spec-viewer/spec-viewer-panel.test.tsx`, `src/spec-viewer/source-line-resolver.test.ts` |
| Comments / Export | line/global comments, hover preview, export bundle, 관리 모달 | [comments-and-export](./domains/comments-and-export.md) | `src/code-comments/comment-persistence.ts`, `src/code-comments/comment-export.ts`, `src/code-comments/comment-list-modal.tsx`, `src/code-comments/global-comments-modal.tsx` | `src/code-comments/comment-persistence.test.ts`, `src/code-comments/comment-export.test.ts`, `src/code-comments/comment-list-modal.test.tsx` |
| Remote Workspace | remote backend, browse, SSH transport, runtime bootstrap, watcher, reconnect | [remote-workspace](./domains/remote-workspace.md) | `src/workspace/remote-connect-modal.tsx`, `electron/main.ts`, `electron/workspace-backend/*`, `electron/remote-agent/*` | `src/workspace/remote-connect-modal.test.tsx`, `electron/workspace-backend/*.test.ts`, `electron/remote-agent/*.test.ts` |
| Appearance / Navigation | App shell, content tabs, history, jump highlight, theme, native menu | [appearance-and-navigation](./domains/appearance-and-navigation.md) | `src/App.tsx`, `src/App.css`, `src/appearance-theme.ts`, `electron/appearance-menu.ts` | `src/App.test.tsx`, `src/appearance-theme.test.ts`, `electron/appearance-menu.test.ts` |

## 2. Common Change Recipes

| 변경 목적 | 먼저 읽을 문서 | 먼저 열 파일 | 함께 확인할 계약 |
|---|---|---|---|
| 파일 트리 동작, lazy expand, 검색 결과 표시 | [workspace-and-file-tree](./domains/workspace-and-file-tree.md), [code-map](./code-map.md) | `src/file-tree/file-tree-panel.tsx`, `electron/workspace-search.ts`, `src/workspace/workspace-context.tsx` | [ipc-contracts](./contracts/ipc-contracts.md), [search-rules](./contracts/search-rules.md) |
| code/spec 왕복 점프, highlight, same-file source mapping | [spec-viewer](./domains/spec-viewer.md), [appearance-and-navigation](./domains/appearance-and-navigation.md) | `src/App.tsx`, `src/spec-viewer/spec-viewer-panel.tsx`, `src/code-editor/cm6-navigation-highlight.ts` | [navigation-rules](./contracts/navigation-rules.md) |
| 코멘트 저장소 경로, export 포맷, modal CRUD | [comments-and-export](./domains/comments-and-export.md) | `src/code-comments/comment-persistence.ts`, `src/code-comments/comment-export.ts`, `src/code-comments/comment-list-modal.tsx` | [comment-contracts](./contracts/comment-contracts.md) |
| 원격 연결, browse, backend 라우팅, watcher/reconnect | [remote-workspace](./domains/remote-workspace.md), [operations-and-validation](./operations-and-validation.md) | `src/workspace/remote-connect-modal.tsx`, `electron/main.ts`, `electron/workspace-backend/remote-workspace-backend.ts`, `electron/remote-agent/connection-service.ts` | [ipc-contracts](./contracts/ipc-contracts.md), [state-model](./contracts/state-model.md) |
| 테마 상태, native menu, 탭/히스토리 UI | [appearance-and-navigation](./domains/appearance-and-navigation.md) | `src/App.tsx`, `src/appearance-theme.ts`, `electron/appearance-menu.ts` | [theme-and-menu-contracts](./contracts/theme-and-menu-contracts.md), [state-model](./contracts/state-model.md) |

## 3. Boundary Reminders

1. `activeWorkspaceId`가 모든 파일/탭/점프 동작의 실행 경계다.
2. local/remote 차이는 가능한 한 `workspace:*` 계약 뒤에 숨겨야 한다.
3. 라인 번호는 1-based, exact source offset은 same-file raw markdown 기준 0-based half-open 계약을 유지한다.
4. search, comment, selection, navigation highlight는 서로 다른 시각 상태로 유지한다.
5. theme source of truth는 renderer이며, main process는 menu checked state만 mirror한다.

## 4. 유지보수 규칙

1. 이 문서에는 책임, 시작점, 경계 규칙만 남기고 긴 이력이나 상세 acceptance는 넣지 않는다.
2. 파일 인벤토리가 더 필요하면 `code-map.md`에 추가한다.
3. 새 불변식/IPC/type 규칙은 가장 가까운 `contracts/*` 문서 1곳에만 canonical하게 적는다.
