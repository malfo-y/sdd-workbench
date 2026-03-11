# SDD Workbench

## Goal

### Project Snapshot

- SDD Workbench는 로컬/원격 워크스페이스를 열고, 코드와 Markdown 스펙을 한 앱에서 왕복 탐색·편집·리뷰하는 Electron 데스크톱 워크벤치다.
- 현재 기준선은 `F01~F40` 구현 완료 상태이며, 원격 경로는 `F27` Remote Agent Protocol이 canonical path이고 `F15` SSHFS 경로는 이력으로만 남긴다.
- 이 문서는 “이 저장소가 무엇을 하고 어디를 먼저 봐야 하는가”를 5분 안에 파악하게 만드는 엔트리 포인트다.

### Key Features

- Code/Spec 탭 전환과 line-level code/spec 왕복 내비게이션
- CM6 기반 코드 편집/저장/검색/wrap/gutter 확장
- 멀티 워크스페이스, 파일 트리 CRUD, 파일 클립보드 Copy/Paste, lazy indexing, 파일 검색, Git 상태/라인 마커
- line comments / global comments / hover preview / export bundle
- Remote Agent Protocol 기반 원격 워크스페이스 연결과 SSH browse
- 원격 워크스페이스에서 SSH 기반 iTerm/VSCode 외부 도구 열기와 VSCode SSH config 자동 동기화
- `dark-gray` / `light` 테마와 native `View > Theme` 메뉴

### Non-Goals

- IDE급 리팩터링, LSP, 멀티탭, auto-save, auto-format
- 내장 터미널, Git diff/commit 전용 UI
- 원격 포트포워딩, 원격 LSP/확장 실행, 복수 배포 채널 관리
- 코멘트 실시간 동기화, 스레드/답글형 협업 UI

## Architecture Overview

### System Boundary

- `electron/main.ts`: 파일 시스템, watcher, Git, system open, local/remote backend 라우팅, remote bootstrap, VSCode SSH config sync를 담당한다.
- `electron/system-open.ts`: local/remote 워크스페이스별 외부 도구(iTerm/VSCode/Finder) 실행 전략과 SSH 명령 조합을 담당한다.
- `electron/vscode-ssh-config.ts`: `~/.ssh/sdd-workbench.config` 관리형 Host 블록 생성/갱신과 Include 삽입을 담당한다.
- `electron/preload.ts`: Renderer에 `window.workspace` typed bridge만 노출한다.
- `src/App.tsx`, `src/workspace/workspace-context.tsx`: app shell, active workspace, 패널 전환, jump orchestration을 담당한다.
- `src/code-editor/code-editor-panel.tsx`: CM6 편집기, 저장, 검색, gutter, navigation highlight를 담당한다.
- `src/spec-viewer/spec-viewer-panel.tsx`: rendered markdown, source mapping, spec search, copy/comment/source action을 담당한다.
- `src/code-comments/*`: 코멘트 persistence, export, hover preview, modal CRUD를 담당한다.

### Repository Map

| 경로 | 책임 | 먼저 보는 상황 |
|---|---|---|
| `src/` | React renderer, app shell, 패널, 상태, UI 상호작용 | 사용자가 보는 동작이나 상태 전이를 바꿀 때 |
| `electron/` | Main process, preload, workspace backend, remote agent, IPC | 파일/감시/Git/원격 동작을 바꿀 때 |
| `scripts/build-remote-agent-runtime.mjs` | remote runtime 번들 생성 | remote agent protocol/runtime을 수정할 때 |
| `_sdd/spec/sdd-workbench/` | 도메인/계약/운영 스펙 분할 문서 | 변경 책임과 불변식을 문서에서 먼저 좁힐 때 |
| `_sdd/implementation/` | 구현 계획/진행/리뷰 기록 | 특정 `Fxx` 구현 이력과 남은 작업을 볼 때 |
| `test_workspace/` | 수동 스모크와 샘플 워크스페이스 | 파일 트리/스펙 뷰/점프 흐름을 빠르게 재현할 때 |

### Runtime Map

1. 앱 부팅은 `src/main.tsx` -> `src/App.tsx` 경로로 시작한다.
2. 워크스페이스 수명주기는 Renderer `workspace:*` 호출 -> `electron/main.ts` -> local/remote backend로 흐른다.
3. Code/Spec 왕복 이동은 `src/App.tsx`, `src/spec-viewer/spec-viewer-panel.tsx`, `src/code-editor/cm6-navigation-highlight.ts`가 함께 조정한다.
4. 원격 연결은 `src/workspace/remote-connect-modal.tsx` -> `electron/main.ts` -> `electron/remote-agent/*` -> `electron/workspace-backend/remote-workspace-backend.ts` 순서로 연결된다.
5. theme 적용은 `src/appearance-theme.ts`와 `src/main.tsx`가 source of truth를 유지하고, `electron/appearance-menu.ts`가 native menu checked state를 mirror한다.

### Cross-Cutting Invariants

- 실행 경계는 항상 `activeWorkspaceId` 기준이다.
- 라인 번호는 전역적으로 1-based이고, exact source offset은 same-file raw markdown 기준 0-based half-open `[startOffset, endOffset)`이다.
- local/remote 차이는 가능한 한 `workspace:*` IPC 뒤로 숨긴다.
- theme source of truth는 renderer `appearanceTheme`와 localStorage이며, main process는 mirror만 담당한다.
- search, comment, selection, navigation highlight는 서로 다른 시각 상태다.
- comment source of truth는 `.sdd-workbench/comments.json`과 `.sdd-workbench/global-comments.md`다.

## Component Details

### Component Index

| 책임 영역 | 먼저 읽을 문서 | 핵심 코드 경로 | 흔한 변경 시작점 |
|---|---|---|---|
| Workspace / File Tree | [workspace-and-file-tree](./sdd-workbench/domains/workspace-and-file-tree.md), [ipc-contracts](./sdd-workbench/contracts/ipc-contracts.md), [code-map](./sdd-workbench/code-map.md) | `src/file-tree/file-tree-panel.tsx`, `src/workspace/workspace-context.tsx`, `electron/workspace-search.ts`, `electron/git-file-statuses.ts` | 트리 렌더, lazy expand, CRUD, 파일 검색, Git badge |
| Code Editor | [code-editor](./sdd-workbench/domains/code-editor.md), [state-model](./sdd-workbench/contracts/state-model.md) | `src/code-editor/code-editor-panel.tsx`, `src/code-editor/cm6-selection-bridge.ts`, `src/code-editor/cm6-git-gutter.ts` | 편집/저장, 검색, wrap, gutter, line jump |
| Spec Viewer | [spec-viewer](./sdd-workbench/domains/spec-viewer.md), [navigation-rules](./sdd-workbench/contracts/navigation-rules.md), [search-rules](./sdd-workbench/contracts/search-rules.md) | `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/source-line-resolver.ts`, `src/spec-viewer/spec-search.ts` | rendered markdown, copy/comment/source action, exact offset, spec 검색 |
| Comments / Export | [comments-and-export](./sdd-workbench/domains/comments-and-export.md), [comment-contracts](./sdd-workbench/contracts/comment-contracts.md) | `src/code-comments/comment-persistence.ts`, `src/code-comments/comment-export.ts`, `src/code-comments/comment-list-modal.tsx` | schema, 저장소 경로, export text, modal CRUD |
| Remote Workspace | [remote-workspace](./sdd-workbench/domains/remote-workspace.md), [ipc-contracts](./sdd-workbench/contracts/ipc-contracts.md), [operations-and-validation](./sdd-workbench/operations-and-validation.md) | `src/workspace/remote-connect-modal.tsx`, `electron/workspace-backend/*`, `electron/remote-agent/*` | browse, bootstrap, request routing, watcher/reconnect |
| Appearance / Navigation | [appearance-and-navigation](./sdd-workbench/domains/appearance-and-navigation.md), [theme-and-menu-contracts](./sdd-workbench/contracts/theme-and-menu-contracts.md) | `src/App.tsx`, `src/App.css`, `src/appearance-theme.ts`, `electron/appearance-menu.ts` | 탭 전환, history, jump highlight, theme/menu |

### Fast Navigation Links

- 기능 ID 기준으로 시작할 때: [feature-index](./sdd-workbench/feature-index.md)
- 파일/테스트 영향 범위로 시작할 때: [code-map](./sdd-workbench/code-map.md)
- 전역 불변식과 IPC 계약을 먼저 볼 때: [contract-map](./sdd-workbench/contract-map.md)
- 운영/수동 검증 기준을 볼 때: [operations-and-validation](./sdd-workbench/operations-and-validation.md)
- 범위 밖 리스크와 용어를 볼 때: [appendix](./sdd-workbench/appendix.md)
- 구조 결정의 이유를 볼 때: [decision-log](./decision-log.md)

## Environment & Dependencies

- 런타임: `electron@30`, `react@18`, `vite@5`, `typescript@5`
- 편집/렌더링 핵심: `@codemirror/*`, `react-markdown`, `remark-gfm`, `rehype-sanitize`, `shiki`, `electron-clipboard-ex`
- 테스트/검증: `vitest`, `jsdom`, `@testing-library/*`, `eslint`, `electron-builder`
- 실행 환경 기준은 [_sdd/env.md](../env.md)에 유지한다.

## Usage Examples

### Running the Project

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

### Common Operations

- remote agent runtime 관련 코드를 바꿨다면 `npm run build:remote-agent-runtime`부터 다시 실행한다.
- 기본 자동 게이트와 수동 스모크 시작점은 [operations-and-validation](./sdd-workbench/operations-and-validation.md)에 있다.
- 원문 요구사항과 현재 기준선 차이는 [user-spec](./user-spec.md)와 [feature-index](./sdd-workbench/feature-index.md)를 함께 본다.

### Common Change Paths

| 변경 목적 | 먼저 볼 문서 | 먼저 열 파일 | 기본 검증 |
|---|---|---|---|
| 파일 트리/검색/Git badge | [workspace-and-file-tree](./sdd-workbench/domains/workspace-and-file-tree.md), [code-map](./sdd-workbench/code-map.md) | `src/file-tree/file-tree-panel.tsx`, `electron/workspace-search.ts`, `electron/git-file-statuses.ts` | `src/file-tree/file-tree-panel.test.tsx`, `electron/workspace-search.test.ts`, `electron/git-file-statuses.test.ts` |
| 코드 편집/저장/gutter | [code-editor](./sdd-workbench/domains/code-editor.md), [state-model](./sdd-workbench/contracts/state-model.md) | `src/code-editor/code-editor-panel.tsx`, `src/workspace/workspace-context.tsx` | `src/code-editor/code-editor-panel.test.tsx`, `src/App.test.tsx` |
| 스펙 렌더링/왕복 점프/검색/selection 액션 | [spec-viewer](./sdd-workbench/domains/spec-viewer.md), [navigation-rules](./sdd-workbench/contracts/navigation-rules.md), [search-rules](./sdd-workbench/contracts/search-rules.md) | `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/source-line-resolver.ts`, `src/App.tsx` | `src/spec-viewer/spec-viewer-panel.test.tsx`, `src/spec-viewer/source-line-resolver.test.ts`, `src/App.test.tsx` |
| 코멘트 저장/export | [comments-and-export](./sdd-workbench/domains/comments-and-export.md), [comment-contracts](./sdd-workbench/contracts/comment-contracts.md) | `src/code-comments/comment-persistence.ts`, `src/code-comments/comment-export.ts`, `src/code-comments/comment-list-modal.tsx` | `src/code-comments/comment-persistence.test.ts`, `src/code-comments/comment-export.test.ts`, `src/code-comments/comment-list-modal.test.tsx` |
| 원격 연결/browse/watcher | [remote-workspace](./sdd-workbench/domains/remote-workspace.md), [ipc-contracts](./sdd-workbench/contracts/ipc-contracts.md), [operations-and-validation](./sdd-workbench/operations-and-validation.md) | `src/workspace/remote-connect-modal.tsx`, `electron/main.ts`, `electron/remote-agent/*`, `electron/workspace-backend/*` | `electron/workspace-backend/*.test.ts`, `electron/remote-agent/*.test.ts`, `src/workspace/remote-connect-modal.test.tsx` |
| 탭 전환/history/theme/native menu | [appearance-and-navigation](./sdd-workbench/domains/appearance-and-navigation.md), [theme-and-menu-contracts](./sdd-workbench/contracts/theme-and-menu-contracts.md) | `src/App.tsx`, `src/appearance-theme.ts`, `electron/appearance-menu.ts` | `src/App.test.tsx`, `src/appearance-theme.test.ts`, `electron/appearance-menu.test.ts` |

## Open Questions

- 현재 기준 blocking open question 없음.
- 새 기능 추가 시 번호형 허브보다 해당 책임 문서(`domains/*`, `contracts/*`)를 canonical edit point로 사용한다.
