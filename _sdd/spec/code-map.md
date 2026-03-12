# Code Map

## 목적

이 문서는 구현 변경 시 어느 파일부터 읽어야 하는지 빠르게 좁히기 위한 코드 인덱스다.

- 제품 설명은 [product-overview](./product-overview.md)와 [component-map](./component-map.md)를 본다.
- 상태/IPC/계약은 [contract-map](./contract-map.md)와 하위 계약 문서를 본다.
- 여기서는 “어디를 고칠 가능성이 높은가”만 빠르게 찾는다.

## 1. App Shell / Navigation

- 책임:
  - 탭 레이아웃, 헤더 액션, 모달 오케스트레이션, code/spec 전환, jump request 라우팅, theme 상태 반영
- 핵심 파일:
  - `src/App.tsx`
  - `src/App.css`
  - `src/main.tsx`
  - `src/appearance-theme.ts`
- 같이 보는 파일:
  - `src/workspace/workspace-context.tsx`
  - `src/code-editor/code-editor-panel.tsx`
  - `src/spec-viewer/spec-viewer-panel.tsx`
- 핵심 테스트:
  - `src/App.test.tsx`
  - `src/appearance-theme.test.ts`
- 변경 시 주의점:
  - 탭 자동 전환, jump highlight, native menu theme sync는 서로 묶여 있다.

## 2. Workspace State / Persistence

- 책임:
  - 멀티 워크스페이스 상태, active file/content, dirty, watcher mode, git marker, 원격 연결 상태
- 핵심 파일:
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/workspace-model.ts`
  - `src/workspace/workspace-persistence.ts`
- 같이 보는 파일:
  - `src/workspace/workspace-switcher.tsx`
  - `src/App.tsx`
- 핵심 테스트:
  - `src/workspace/workspace-model.test.ts`
  - `src/workspace/workspace-persistence.test.ts`
  - `src/App.test.tsx`
- 변경 시 주의점:
  - renderer 상태 모델을 건드리면 거의 항상 IPC, file tree, code/spec panel까지 영향이 간다.

## 3. File Tree / Search / Git File Status

- 책임:
  - 트리 렌더, lazy expand, CRUD/rename 메뉴, 파일 검색, changed marker, git file-level badge
- 핵심 파일:
  - `src/file-tree/file-tree-panel.tsx`
  - `electron/workspace-search.ts`
  - `electron/git-file-statuses.ts`
- 같이 보는 파일:
  - `src/workspace/workspace-context.tsx`
  - `electron/main.ts`
  - `electron/workspace-backend/local-workspace-backend.ts`
  - `electron/workspace-backend/remote-workspace-backend.ts`
- 핵심 테스트:
  - `src/file-tree/file-tree-panel.test.tsx`
  - `electron/workspace-search.test.ts`
  - `electron/git-file-statuses.test.ts`
- 변경 시 주의점:
  - 검색은 lazy-loaded tree와 독립적이며, remote/local 공통 contract를 유지해야 한다.

## 4. Code Editor / CM6 Extensions

- 책임:
  - 편집, 저장, 검색, wrap, selection bridge, jump/highlight, git/comment gutter, language/theme routing
- 핵심 파일:
  - `src/code-editor/code-editor-panel.tsx`
  - `src/code-editor/cm6-dark-theme.ts`
  - `src/code-editor/cm6-light-theme.ts`
  - `src/code-editor/cm6-selection-bridge.ts`
  - `src/code-editor/cm6-git-gutter.ts`
  - `src/code-editor/cm6-comment-gutter.ts`
  - `src/code-editor/cm6-navigation-highlight.ts`
- 같이 보는 파일:
  - `src/source-selection.ts`
  - `src/App.tsx`
  - `electron/git-line-markers.ts`
- 핵심 테스트:
  - `src/code-editor/code-editor-panel.test.tsx`
  - `src/code-editor/cm6-selection-bridge.test.ts`
  - `src/code-editor/cm6-git-gutter.test.ts`
  - `src/code-editor/cm6-comment-gutter.test.ts`
- 변경 시 주의점:
  - CM6 쪽 selection/jump 변경은 spec-origin exact offset 경로와 쉽게 충돌한다.

## 5. Spec Viewer / Source Mapping

- 책임:
  - rendered markdown, source action, exact offset mapping, search, same-doc anchor, code->spec navigation
- 핵심 파일:
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/spec-viewer/source-line-metadata.ts`
  - `src/spec-viewer/source-line-resolver.ts`
  - `src/spec-viewer/spec-search.ts`
  - `src/spec-viewer/rehype-source-text-leaves.ts`
  - `src/spec-viewer/spec-link-utils.ts`
- 같이 보는 파일:
  - `src/source-selection.ts`
  - `src/code-editor/code-editor-panel.tsx`
  - `src/App.tsx`
- 핵심 테스트:
  - `src/spec-viewer/spec-viewer-panel.test.tsx`
  - `src/spec-viewer/source-line-resolver.test.ts`
  - `src/spec-viewer/source-line-metadata.test.ts`
  - `src/spec-viewer/spec-search.test.ts`
- 변경 시 주의점:
  - line-level fallback과 exact offset path를 동시에 유지해야 한다.

## 6. Comments / Export / Hover Preview

- 책임:
  - comment schema, persistence, hover preview, export bundle, modal CRUD, global comments
- 핵심 파일:
  - `src/code-comments/comment-types.ts`
  - `src/code-comments/comment-anchor.ts`
  - `src/code-comments/comment-persistence.ts`
  - `src/code-comments/comment-export.ts`
  - `src/code-comments/comment-list-modal.tsx`
  - `src/code-comments/export-comments-modal.tsx`
  - `src/code-comments/global-comments-modal.tsx`
- 같이 보는 파일:
  - `src/code-comments/comment-line-index.ts`
  - `src/code-comments/comment-hover-popover.tsx`
  - `src/App.tsx`
- 핵심 테스트:
  - `src/code-comments/comment-anchor.test.ts`
  - `src/code-comments/comment-persistence.test.ts`
  - `src/code-comments/comment-export.test.ts`
  - `src/code-comments/comment-list-modal.test.tsx`
- 변경 시 주의점:
  - schema 변경은 persistence, export text, modal UI를 함께 바꿔야 한다.

## 7. Electron Main / Backend / Remote Agent

- 책임:
  - IPC handler, local/remote backend 분기, watcher lifecycle, remote bootstrap/runtime, browse, security
- 핵심 파일:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/workspace-backend/types.ts`
  - `electron/workspace-backend/local-workspace-backend.ts`
  - `electron/workspace-backend/remote-workspace-backend.ts`
  - `electron/remote-agent/protocol.ts`
  - `electron/remote-agent/transport-ssh.ts`
  - `electron/remote-agent/bootstrap.ts`
  - `electron/remote-agent/connection-service.ts`
- 같이 보는 파일:
  - `electron/workspace-watch-mode.ts`
  - `electron/remote-agent/runtime/*`
  - `electron/remote-agent/directory-browser.ts`
  - `electron/remote-agent/security.ts`
- 핵심 테스트:
  - `electron/workspace-backend/*.test.ts`
  - `electron/remote-agent/*.test.ts`
  - `electron/remote-agent/runtime/*.test.ts`
  - `electron/workspace-watch-mode.test.ts`
- 변경 시 주의점:
  - remote contract를 바꾸면 preload type, renderer helper, spec contracts를 함께 갱신해야 한다.

## 8. Appearance / Native Menu / Theming

- 책임:
  - `dark-gray`/`light` theme state, pre-paint bootstrap, menu sync, App token palette, CM6/Shiki theme routing
- 핵심 파일:
  - `src/appearance-theme.ts`
  - `src/index.css`
  - `src/App.css`
  - `src/code-editor/cm6-dark-theme.ts`
  - `src/code-editor/cm6-light-theme.ts`
  - `src/code-viewer/syntax-highlight.ts`
  - `electron/appearance-menu.ts`
- 같이 보는 파일:
  - `src/main.tsx`
  - `src/App.tsx`
  - `electron/main.ts`
  - `electron/electron-env.d.ts`
- 핵심 테스트:
  - `src/appearance-theme.test.ts`
  - `src/code-viewer/syntax-highlight.test.ts`
  - `electron/appearance-menu.test.ts`
  - `src/App.test.tsx`
- 변경 시 주의점:
  - theme source of truth는 renderer이며, main process는 checked state mirror만 담당한다.
