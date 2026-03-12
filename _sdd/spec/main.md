# SDD Workbench

## Goal

### Project Snapshot

- SDD Workbench는 로컬/원격 워크스페이스를 열고, 코드와 Markdown 스펙을 한 앱에서 왕복 탐색·편집·리뷰하는 Electron 데스크톱 워크벤치다.
- 현재 기준선은 `F01~F40` 구현 완료 상태이며, 원격 경로는 `F27` Remote Agent Protocol이 canonical path이고 `F15` SSHFS 경로는 이력으로만 남긴다.
- 이 문서는 "이 저장소가 무엇을 하고 어디를 먼저 봐야 하는가"를 5분 안에 파악하게 만드는 엔트리 포인트다.

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

## Architecture

### 아키텍처 원칙

- 파일 시스템/OS 접근은 Main 프로세스로 제한
- Renderer는 상태/표시/상호작용에 집중
- Preload를 통한 제한된 IPC surface만 노출
- 멀티 워크스페이스 정책은 active workspace 기준으로 일관 처리

### 런타임 경계

```text
Electron Main
  - open dialog, index/read/write file, watch lifecycle(native/polling), system open, export I/O
  - remote agent session lifecycle(ssh bootstrap/handshake/request routing) (F27)
  - remote directory browse service(`workspace:browseRemoteDirectories`) (F28)
  - workspace backend routing(local backend / remote backend) (F27)
Preload
  - window.workspace API bridge (typed)
  - remote connection invoke contract bridge (F27)
Renderer (React)
  - WorkspaceProvider + panels(CodeEditorPanel, SpecViewerPanel) + context actions
  - remote connection state + banner rendering (F27)
```

### System Boundary

- `electron/main.ts`: 파일 시스템, watcher, Git, system open, local/remote backend 라우팅, remote bootstrap, VSCode SSH config sync
- `electron/system-open.ts`: local/remote 워크스페이스별 외부 도구(iTerm/VSCode/Finder) 실행 전략
- `electron/vscode-ssh-config.ts`: `~/.ssh/sdd-workbench.config` 관리형 Host 블록 생성/갱신
- `electron/preload.ts`: Renderer에 `window.workspace` typed bridge만 노출
- `src/App.tsx`, `src/workspace/workspace-context.tsx`: app shell, active workspace, 패널 전환, jump orchestration
- `src/code-editor/code-editor-panel.tsx`: CM6 편집기, 저장, 검색, gutter, navigation highlight
- `src/spec-viewer/spec-viewer-panel.tsx`: rendered markdown, source mapping, spec search, copy/comment/source action
- `src/code-comments/*`: 코멘트 persistence, export, hover preview, modal CRUD

### UI 레이아웃

```text
Header Left: Title + Back/Forward + [Code|Spec] Tab
Header Right: Comments(Add Global/View)
Left Sidebar: Workspace(Selector/Open/Close) + Current Path + Open In + FileTree
Content: Code Editor(CM6) OR Rendered Spec (tab-switched, display:none 방식 비활성 탭 보존)
```

- 2패널 탭 레이아웃: 좌측 사이드바 + 우측 콘텐츠(Code/Spec 탭 전환)
- 비활성 탭은 `display: none`으로 숨겨 스크롤 위치/상태 보존
- `.md` 파일 선택 시 Spec 탭 자동 전환, 그 외 파일은 Code 탭 자동 전환

### Repository Map

| 경로 | 책임 | 먼저 보는 상황 |
|---|---|---|
| `src/` | React renderer, app shell, 패널, 상태, UI 상호작용 | 사용자가 보는 동작이나 상태 전이를 바꿀 때 |
| `electron/` | Main process, preload, workspace backend, remote agent, IPC | 파일/감시/Git/원격 동작을 바꿀 때 |
| `scripts/build-remote-agent-runtime.mjs` | remote runtime 번들 생성 | remote agent protocol/runtime을 수정할 때 |
| `_sdd/spec/` | 컴포넌트별 overview/contracts 스펙 문서 | 변경 책임과 불변식을 문서에서 먼저 좁힐 때 |
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

## Component Index

| 책임 영역 | overview | contracts | 핵심 코드 경로 | 흔한 변경 시작점 |
|---|---|---|---|---|
| Workspace / File Tree | [overview](./workspace-and-file-tree/overview.md) | [contracts](./workspace-and-file-tree/contracts.md) | `src/file-tree/file-tree-panel.tsx`, `src/workspace/workspace-context.tsx`, `electron/workspace-search.ts` | 트리 렌더, lazy expand, CRUD, 파일 검색, Git badge |
| Code Editor | [overview](./code-editor/overview.md) | [contracts](./code-editor/contracts.md) | `src/code-editor/code-editor-panel.tsx`, `src/code-editor/cm6-selection-bridge.ts` | 편집/저장, 검색, wrap, gutter, line jump |
| Spec Viewer | [overview](./spec-viewer/overview.md) | [contracts](./spec-viewer/contracts.md) | `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/source-line-resolver.ts` | rendered markdown, copy/comment/source action, spec 검색 |
| Comments / Export | [overview](./comments-and-export/overview.md) | [contracts](./comments-and-export/contracts.md) | `src/code-comments/comment-persistence.ts`, `src/code-comments/comment-export.ts` | schema, 저장소 경로, export text, modal CRUD |
| Remote Workspace | [overview](./remote-workspace/overview.md) | [contracts](./remote-workspace/contracts.md) | `electron/workspace-backend/*`, `electron/remote-agent/*` | browse, bootstrap, request routing, watcher/reconnect |
| Appearance / Navigation | [overview](./appearance-and-navigation/overview.md) | [contracts](./appearance-and-navigation/contracts.md) | `src/App.tsx`, `src/appearance-theme.ts`, `electron/appearance-menu.ts` | 탭 전환, history, jump highlight, theme/menu |

## Contract Index

| 계약 문서 | 다루는 범위 |
|---|---|
| [code-editor/contracts.md](./code-editor/contracts.md) | 핵심 타입과 전역 상태 불변식 (State Model) |
| [workspace-and-file-tree/contracts.md](./workspace-and-file-tree/contracts.md) | `workspace:*` 핵심 IPC 채널 (인덱싱, CRUD, watcher, Git, 검색, 코멘트, 클립보드) |
| [spec-viewer/contracts.md](./spec-viewer/contracts.md) | 링크 해석, source action, code/spec 왕복, highlight, 검색 규칙 |
| [comments-and-export/contracts.md](./comments-and-export/contracts.md) | comment schema, persistence, export, marker, hover preview |
| [appearance-and-navigation/contracts.md](./appearance-and-navigation/contracts.md) | theme mode, bootstrap, storage fallback, native menu sync |
| [remote-workspace/contracts.md](./remote-workspace/contracts.md) | 원격 연결/browse/system open IPC, SSH config sync |

## Common Change Paths

| 변경 목적 | 먼저 볼 문서 | 먼저 열 파일 | 기본 검증 |
|---|---|---|---|
| 파일 트리/검색/Git badge | [workspace-and-file-tree](./workspace-and-file-tree/overview.md), [code-map](./code-map.md) | `src/file-tree/file-tree-panel.tsx`, `electron/workspace-search.ts` | `src/file-tree/file-tree-panel.test.tsx`, `electron/workspace-search.test.ts` |
| 코드 편집/저장/gutter | [code-editor](./code-editor/overview.md), [state-model](./code-editor/contracts.md) | `src/code-editor/code-editor-panel.tsx` | `src/code-editor/code-editor-panel.test.tsx`, `src/App.test.tsx` |
| 스펙 렌더링/왕복 점프/검색 | [spec-viewer](./spec-viewer/overview.md), [navigation+search](./spec-viewer/contracts.md) | `src/spec-viewer/spec-viewer-panel.tsx`, `src/App.tsx` | `src/spec-viewer/spec-viewer-panel.test.tsx`, `src/App.test.tsx` |
| 코멘트 저장/export | [comments-and-export](./comments-and-export/overview.md), [comment-contracts](./comments-and-export/contracts.md) | `src/code-comments/comment-persistence.ts` | `src/code-comments/comment-persistence.test.ts`, `src/code-comments/comment-export.test.ts` |
| 원격 연결/browse/watcher | [remote-workspace](./remote-workspace/overview.md), [remote-ipc](./remote-workspace/contracts.md) | `electron/workspace-backend/*`, `electron/remote-agent/*` | `electron/workspace-backend/*.test.ts`, `electron/remote-agent/*.test.ts` |
| 탭 전환/history/theme | [appearance](./appearance-and-navigation/overview.md), [theme-contracts](./appearance-and-navigation/contracts.md) | `src/App.tsx`, `src/appearance-theme.ts` | `src/App.test.tsx`, `src/appearance-theme.test.ts` |

## Fast Navigation Links

- 기능 ID 기준으로 시작할 때: [feature-index](./feature-index.md)
- 파일/테스트 영향 범위로 시작할 때: [code-map](./code-map.md)
- 운영/수동 검증 기준을 볼 때: [operations](./operations.md)
- 범위 밖 리스크와 용어를 볼 때: [appendix](./appendix/)
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
- 기본 자동 게이트와 수동 스모크 시작점은 [operations](./operations.md)에 있다.
- 원문 요구사항과 현재 기준선 차이는 [user-spec](./user-spec.md)와 [feature-index](./feature-index.md)를 함께 본다.

## Open Questions

- 현재 기준 blocking open question 없음.
- 새 기능 추가 시 해당 컴포넌트 디렉토리의 `overview.md`/`contracts.md`를 canonical edit point로 사용한다.
