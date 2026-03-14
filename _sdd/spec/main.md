# SDD Workbench

> 로컬/원격 워크스페이스에서 코드와 Markdown 스펙을 왕복 탐색·편집·리뷰하는 Electron 기반 워크벤치

**Version**: 0.48.0
**Last Updated**: 2026-03-14
**Status**: In Review

## Table of Contents

- §1 Background & Motivation
- §2 Core Design
- §3 Architecture Overview
- §4 Component Details
- §5 Usage Guide & Expected Results
- §6 Data Models
- §7 API Reference
- §8 Environment & Dependencies
- Appendix: Code Reference Index

---

## §1 Background & Motivation

### Problem Statement

SDD Workbench는 코드 편집기, Markdown 스펙 뷰어, 원격 작업 도구, 리뷰 메모 export 흐름이 서로 분리되어 있을 때 생기는 맥락 전환 비용을 줄이기 위해 만들어졌다. 일반적인 개발 흐름에서는 파일을 열고, 대응 스펙을 찾고, 관련 코멘트를 남기고, 필요하면 원격 저장소에 접속하는 과정이 각기 다른 도구로 흩어진다. 이 프로젝트는 그 흐름을 하나의 데스크톱 워크벤치 안으로 모으고, 로컬과 원격 워크스페이스를 같은 상태 모델과 IPC 표면으로 다루도록 설계했다 [src/workspace/workspace-context.tsx:WorkspaceProvider] [electron/main.ts:registerIpcHandlers].

### Why This Approach

이 프로젝트는 “완전한 IDE”가 아니라 “스펙 중심 개발과 리뷰 루프를 빠르게 반복하는 작업대”를 목표로 한다. 그래서 렌더러는 코드/스펙/코멘트의 상호작용에 집중하고, 파일 시스템과 OS 접근은 main process로 제한했다. 또한 원격 작업은 SSHFS 같은 파일시스템 마운트 의존 대신 remote agent protocol을 canonical path로 채택해 연결 상태, 오류 코드, watch fallback을 더 명시적으로 제어한다 [electron/main.ts:handleWorkspaceConnectRemote] [electron/remote-agent/runtime/agent-main.ts:runRemoteAgent].

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Electron workbench + typed IPC + remote agent | 코드/스펙/리뷰/원격 흐름을 한 UX로 통합, local/remote 동일 contract 유지 | main/renderer 경계와 IPC 설계가 필요 | **Chosen** |
| IDE + 별도 Markdown viewer + 별도 메모 문서 | 각 도구는 성숙, 초기 구현 비용 낮음 | 점프/상태/코멘트 문맥이 쉽게 분리됨 | Rejected: 협업 루프가 느려짐 |
| SSHFS/mount 기반 remote workspace | 로컬처럼 보이는 경로 접근 가능 | watch 안정성, 성능, 오류 가시성 제어가 약함 | Rejected: F27 이후 canonical path에서 제외 |

### Core Value Proposition

핵심 가치는 “같은 문맥에서 코드와 스펙을 왕복하고, 그 결과를 바로 협업 산출물로 만든다”는 데 있다. `App`가 Code/Spec 탭과 점프 요청을 오케스트레이션하고 [src/App.tsx:App], `WorkspaceProvider`가 active workspace/file/spec/comments/session을 한 상태 트리로 유지하며 [src/workspace/workspace-context.tsx:WorkspaceProvider], `registerIpcHandlers`가 로컬/원격 모두에 동일한 `workspace:*` 채널을 노출한다 [electron/main.ts:registerIpcHandlers]. 그 결과 사용자는 파일을 열고, 스펙의 특정 블록에서 원문 라인으로 이동하고, 코멘트를 남기고, `_COMMENTS.md` 또는 LLM bundle로 export하는 흐름을 한 앱 안에서 반복할 수 있다 [src/code-comments/comment-export.ts:renderCommentsMarkdown] [src/code-comments/comment-export.ts:renderLlmBundle].

### Primary Objective

코드 변경, 스펙 검토, 코멘트 수집, 원격 작업을 “탐색 가능한 하나의 루프”로 묶어 실제 구현/리뷰 사이클을 빠르게 유지하는 것이 1차 목표다.

### Key Features

1. **Code/Spec 왕복 내비게이션**: rendered spec과 raw code 사이를 line-level로 이동하고 highlight를 유지한다.
2. **편집 가능한 코드 워크벤치**: CodeMirror 6 기반 편집, 저장, 검색, wrap, git gutter, comment gutter를 제공한다.
3. **협업용 코멘트 루프**: line comments, global comments, hover preview, draggable review modals, export bundle을 지원한다.
4. **대규모 워크스페이스 대응**: lazy indexing, child cap, watcher fallback, partial loading으로 큰 저장소를 다룬다.
5. **원격 워크스페이스 통합**: browse, connect, watch, system open, VS Code SSH config sync를 같은 계약으로 지원한다.
6. **일관된 시각 상태 관리**: theme, navigation highlight, selection, search를 서로 분리된 시각 상태로 유지한다.
7. **Python citation navigation**: 스펙 문서에서 `[path.py:Symbol]` bracket citation으로 Python 선언 위치를 자동 탐색한다.

### Target Users / Use Cases

| User Type | Use Case | Priority |
|-----------|----------|----------|
| 제품/기능 개발자 | 코드와 스펙을 같은 문맥에서 열고 구현 범위를 빠르게 파악 | High |
| 리뷰어 | 특정 라인/블록에 코멘트를 남기고 export bundle로 전달 | High |
| 원격 환경 작업자 | 로컬과 유사한 UX로 remoteRoot를 열고 파일 I/O, watch, 외부 도구 실행 | High |
| 유지보수 담당자 | supporting docs와 code map을 따라 안전한 변경 시작점을 찾기 | Medium |

### Success Criteria

- [x] `.md` 파일과 일반 코드 파일이 같은 워크스페이스 세션 안에서 자연스럽게 전환된다.
- [x] spec -> code / code -> spec 이동이 line range 기준으로 안정적으로 작동한다.
- [x] 코멘트가 source of truth 파일과 export 산출물로 분리되어 관리된다.
- [x] local/remote 작업이 같은 `workspace:*` 계약으로 표현된다.
- [x] 대규모 디렉토리에서도 초기 인덱싱과 watcher가 안전하게 degrade 한다.

### Non-Goals (Out of Scope)

- IDE급 리팩터링, LSP, 멀티탭, auto-save, auto-format
- 내장 터미널, Git diff/commit 전용 UI
- 원격 포트포워딩, 원격 LSP/확장 실행, 복수 배포 채널 관리
- 코멘트 실시간 동기화, 스레드/답글형 협업 UI

---

## §2 Core Design

### Key Idea

핵심 설계 아이디어는 “파일 시스템과 외부 세계는 main process가 책임지고, 사용자가 체감하는 문맥은 renderer state가 책임진다”는 분리다. `App`는 탭 전환, 점프 요청, 모달, 배너, 코멘트 export 같은 상호작용을 조정하고 [src/App.tsx:App], `WorkspaceProvider`는 active workspace, active file/spec, dirty state, comments, remote connection state를 한 session 모델로 유지한다 [src/workspace/workspace-context.tsx:WorkspaceProvider]. 이 위에서 spec viewer는 markdown AST에 line/offset metadata를 심어 raw source와 rendered block을 잇고 [src/spec-viewer/source-line-metadata.ts:buildSourceLineAttributes], main process는 같은 `workspace:*` invoke surface 뒤에 local backend와 remote backend를 숨긴다 [electron/main.ts:registerIpcHandlers].

이 구조가 중요한 이유는 세 가지다. 첫째, Code 탭과 Spec 탭은 같은 콘텐츠 영역을 공유하지만 비활성 탭을 언마운트하지 않아 스크롤과 문맥을 보존한다 [src/App.tsx:App]. 둘째, selection 모델은 line range를 source of truth로 두고, exact offset은 지원 구조에서만 additive payload로 계산해 안정성과 정밀도를 모두 챙긴다 [src/spec-viewer/source-line-resolver.ts:resolveSourceLine] [src/spec-viewer/source-line-metadata.ts:buildSourceLineAttributes]. 셋째, 원격 워크스페이스는 연결 수립 후 remote backend를 등록하는 방식이라, renderer는 local/remote 차이를 거의 의식하지 않고 동일한 액션을 계속 사용할 수 있다 [electron/main.ts:handleWorkspaceConnectRemote].

### Algorithm / Logic Flow

#### Flow 1. Rendered spec를 raw source line으로 환원하는 메타데이터 경로

rendered markdown block에는 line span과 optional offset span이 함께 기록된다. 이 메타데이터가 있어야 `Go to Source`, spec-origin comment, `Copy Relative Path`가 같은 raw markdown 기준선으로 돌아갈 수 있다 [src/spec-viewer/source-line-metadata.ts:buildSourceLineAttributes] [src/spec-viewer/source-line-resolver.ts:resolveSourceLine].

```ts
# [src/spec-viewer/source-line-metadata.ts:buildSourceLineAttributes]
export function buildSourceLineAttributes(
  node: MarkdownNodeWithPosition | undefined,
  options?: { includeAnchorLine?: boolean },
) {
  const span = getMarkdownNodeSourceLineSpan(node)
  const offsetSpan = getMarkdownNodeSourceOffsetSpan(node)
  if (!span) {
    return {
      [SOURCE_LINE_ATTRIBUTE]: undefined,
      [SOURCE_LINE_START_ATTRIBUTE]: undefined,
      [SOURCE_LINE_END_ATTRIBUTE]: undefined,
      [SOURCE_OFFSET_START_ATTRIBUTE]: offsetSpan?.startOffset,
      [SOURCE_OFFSET_END_ATTRIBUTE]: offsetSpan?.endOffset,
    }
  }

  return {
    [SOURCE_LINE_ATTRIBUTE]:
      options?.includeAnchorLine === false ? undefined : span.startLine,
    [SOURCE_LINE_START_ATTRIBUTE]: span.startLine,
    [SOURCE_LINE_END_ATTRIBUTE]: span.endLine,
    [SOURCE_OFFSET_START_ATTRIBUTE]: offsetSpan?.startOffset,
    [SOURCE_OFFSET_END_ATTRIBUTE]: offsetSpan?.endOffset,
  }
}
```

#### Flow 2. 원격 연결 후 동일한 workspace contract로 backend를 등록하는 경로

원격 연결은 단순히 SSH 세션을 여는 데서 끝나지 않는다. 연결이 성공하면 main process가 remote backend를 생성하고 router에 등록해 이후 `index`, `readFile`, `writeFile`, `watch`, `comments` 요청이 같은 contract로 흘러가도록 만든다 [electron/main.ts:handleWorkspaceConnectRemote].

```ts
# [electron/main.ts:handleWorkspaceConnectRemote]
async function handleWorkspaceConnectRemote(
  _event: IpcMainInvokeEvent,
  request: WorkspaceConnectRemoteRequest,
): Promise<RemoteConnectResult> {
  const profile = request?.profile
  if (!profile) {
    return { ok: false, workspaceId: '', errorCode: 'UNKNOWN', error: 'profile is required.' }
  }

  const connectResult = await remoteConnectionService.connect(profile)
  if (!connectResult.ok) {
    return connectResult
  }

  const remoteBackend = createRemoteWorkspaceBackend({
    workspaceId: connectResult.workspaceId,
    rootPath: connectResult.rootPath,
    requestRemote: async (workspaceId, method, params) =>
      remoteConnectionService.request(workspaceId, method, params),
    subscribeAgentEvents: (workspaceId, listener) =>
      remoteConnectionService.onAgentEvent(workspaceId, listener),
    sendWatchEvent: sendWorkspaceWatchEvent,
    sendWatchFallback: sendWorkspaceWatchFallbackEvent,
  })

  workspaceBackendRouter.registerRemoteWorkspace({
    workspaceId: connectResult.workspaceId,
    rootPath: connectResult.rootPath,
    backend: remoteBackend,
  })

  return connectResult
}
```

#### Flow 3. 구조화된 코멘트를 export 문서로 바꾸는 협업 경로

코멘트는 source of truth JSON/Markdown 파일과 export 산출물을 구분한다. `normalizeCodeComments`는 저장 포맷의 안전한 parsing과 schema 정규화를 담당하고 [src/code-comments/comment-persistence.ts:normalizeCodeComments], `renderCommentsMarkdown`은 pending comments와 global comments를 `_COMMENTS.md` 형식으로 변환한다 [src/code-comments/comment-export.ts:renderCommentsMarkdown].

```ts
# [src/code-comments/comment-export.ts:renderCommentsMarkdown]
export function renderCommentsMarkdown(
  comments: CodeComment[],
  options?: { globalComments?: string },
): string {
  const sortedComments = sortCodeComments(comments)
  const normalizedGlobalComments = normalizeGlobalComments(options?.globalComments)

  const sections = sortedComments.map((comment) => renderCommentBlock(comment))
  const commentsBody =
    sections.length > 0 ? sections.join('\n\n---\n\n') : '_No comments._'
  const markdownSections: string[] = []

  if (normalizedGlobalComments.length > 0) {
    markdownSections.push('## Global Comments', '', normalizedGlobalComments, '')
  }

  markdownSections.push('## Comments', '', commentsBody)

  return [
    '# _COMMENTS',
    '',
    `Generated at: ${new Date().toISOString()}`,
    `Total comments: ${sortedComments.length}${normalizedGlobalComments.length > 0 ? ' (+ global comments)' : ''}`,
    '',
    ...markdownSections,
    '',
  ].join('\n')
}
```

### Design Rationale

| Design Choice | Rationale | Alternatives Considered |
|---------------|-----------|------------------------|
| Renderer state를 문맥의 source of truth로 유지 | 탭/스크롤/selection/comment/search 상태를 사용자 관점에서 일관되게 유지하기 쉽다 | main process 중심 상태 관리 |
| FS/OS 접근을 main process로 제한 | workspace 경계 검증, watcher lifecycle, system open, export I/O를 안전하게 통제할 수 있다 | renderer 직접 접근 |
| local/remote 공통 `workspace:*` surface | 기능 추가 시 renderer 분기를 줄이고 테스트 범위를 단순화한다 | 원격 전용 별도 API |
| line range 우선 + exact offset additive | 대부분의 markdown 구조에서 안정적으로 degrade 하면서 세밀한 selection도 지원한다 | exact offset only, line only |
| comment modal drag는 transient UI state로 유지 | 열린 세션 안에서는 사용자가 모달을 옮겨 코드/스펙을 계속 볼 수 있고, reopen 시에는 stale 좌표를 남기지 않는다 [src/modal-drag-position.ts:useModalDragPosition] [src/code-comments/comment-list-modal.tsx:CommentListModal] | persisted modal coordinates |
| `display: none` 기반 탭 보존 | Code/Spec 탭 전환 시 스크롤 위치와 문맥 유지가 쉽다 | 탭 전환 시 패널 unmount/remount |
| renderer theme authoritative + menu mirror | storage failure와 app menu sync를 동시에 단순하게 처리한다 | main process authoritative theme |

### Cross-Cutting Invariants

- 실행 경계는 항상 `activeWorkspaceId` 기준이다 [src/workspace/workspace-context.tsx:WorkspaceProvider].
- 라인 번호는 전역적으로 1-based이고, exact source offset은 same-file raw markdown 기준 0-based half-open range다 [src/spec-viewer/source-line-resolver.ts:resolveSourceLine].
- local/remote 차이는 가능한 한 `workspace:*` IPC 뒤에 숨긴다 [electron/main.ts:registerIpcHandlers].
- theme source of truth는 renderer `appearanceTheme`와 localStorage이며, main process는 menu checked state만 mirror 한다 [src/appearance-theme.ts:restoreAppearanceThemeOnRoot] [electron/main.ts:installApplicationMenu].
- comments source of truth는 `.sdd-workbench/comments.json`과 `.sdd-workbench/global-comments.md`다 [src/code-comments/comment-persistence.ts:serializeCodeComments].

---

## §3 Architecture Overview

### System Diagram

```text
React Renderer
  App.tsx
  WorkspaceProvider
  CodeEditorPanel / SpecViewerPanel / FileTreePanel / Comment Modals
        |
        v
Preload Bridge
  window.workspace typed API
        |
        v
Electron Main
  IPC handlers
  local backend router
  watcher / git / export / system open
        |
        +--> Local filesystem
        |
        +--> RemoteConnectionService
                |
                v
          Remote Agent Runtime (stdio JSON RPC)
                |
                v
          Remote workspace root
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Desktop runtime | Electron | 30.x | renderer/main/preload 경계와 OS 통합 |
| UI | React | 18.x | app shell, panels, modals |
| Language | TypeScript | 5.x | shared 타입과 안전한 IPC surface |
| Code editor | CodeMirror 6 | 6.x | 편집, 검색, gutter, line jump |
| Markdown rendering | react-markdown + remark-gfm + rehype-sanitize + rehype-slug | current package range | spec 렌더링, 링크/보안, heading anchor |
| Syntax highlight | Shiki | 3.x | 코드 하이라이트 |
| File watch | chokidar | 4.x | local watcher/fallback |
| Test | Vitest + Testing Library + jsdom | current package range | unit/integration 테스트 |
| Build | Vite + electron-builder | 5.x / 24.x | 개발 서버와 패키징 |

### Design Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Remote Agent Protocol를 canonical remote path로 채택 | watch/reconnect/error code를 명시적으로 다룰 수 있다 | SSHFS/mounted path |
| lazy indexing + child cap 500 + node cap 100000 | 대규모 저장소에서도 초기 로드와 메모리 사용을 통제한다 | 전체 eager tree 로드 |
| markdown sanitize allowlist 적용 | local resource와 rendered HTML의 보안 경계를 유지한다 | unrestricted HTML render |
| supporting docs를 split spec으로 유지 | top-level은 whitepaper entry, 하위 문서는 세부 계약/테스트 인덱스로 분리할 수 있다 | 모든 내용을 main.md 하나에 통합 |

### Supporting Spec Map

| Document | Role | When to Open |
|----------|------|--------------|
| [main.md](./main.md) | whitepaper entry point | 프로젝트 목적, 구조, 사용법을 빠르게 파악할 때 |
| [`<component>/overview.md`](./workspace-and-file-tree/overview.md) | 컴포넌트 설명층 | 특정 도메인의 사용자 동작과 규칙을 읽을 때 |
| [`<component>/contracts.md`](./workspace-and-file-tree/contracts.md) | 계약층 | IPC/state/search/navigation 규칙을 확인할 때 |
| [operations.md](./operations.md) | 운영/검증 기준 | 품질 게이트, 수동 스모크, 성능/보안 기준을 볼 때 |
| [code-map.md](./code-map.md) | 구현 인벤토리 | 어떤 파일부터 열어야 할지 좁힐 때 |
| [feature-index.md](./feature-index.md) | 기능 ID 인덱스 | `Fxx` 기준으로 범위를 추적할 때 |
| [summary.md](./summary.md) | executive summary | 현재 상태와 우선순위를 빠르게 공유할 때 |
| [decision-log.md](./decision-log.md) | 정책/구조 이유 | 과거 의사결정 맥락을 확인할 때 |

---

## §4 Component Details

### Component: Workspace & File Tree

- **Overview**: 멀티 워크스페이스 세션, 파일 트리 렌더링, 검색, CRUD, git badge, changed marker를 담당한다.
- **Why**: 사용자가 “어떤 저장소를 보고 있는지”와 “현재 어떤 파일이 활성 상태인지”를 중심으로 전체 UX가 조직되기 때문에 별도 상태 축으로 분리되어야 한다.
- **Responsibility**: 세션 복원, active workspace 전환, lazy directory loading, file search, watcher 시작/종료.
- **Interface**: `workspace:openDialog`, `workspace:index`, `workspace:indexDirectory`, `workspace:searchFiles`, `workspace:watchStart`, `workspace:watchStop`.
- **Source**: `src/workspace/workspace-context.tsx` (`WorkspaceProvider`), `src/workspace/workspace-model.ts` (`createWorkspaceSession`), `src/file-tree/file-tree-panel.tsx`, `electron/main.ts` (`handleWorkspaceIndexRouted`, `handleWorkspaceWatchStartRouted`).
- **Dependencies**: local/remote workspace backend, git status/line marker, persistence snapshot.
- **Spec**: [overview](./workspace-and-file-tree/overview.md), [contracts](./workspace-and-file-tree/contracts.md)

### Component: Code Editor

- **Overview**: CodeMirror 6 기반으로 코드 읽기/편집/저장/검색/jump/highlight/gutter를 제공한다.
- **Why**: 스펙과 연결된 line-level 액션을 수행하려면 읽기 전용 viewer보다 편집 가능한 코드 패널이 필요하다.
- **Responsibility**: dirty state 반영, `Cmd+S` 저장, 내장 검색, wrap toggle, git/comment/navigation gutter 렌더링.
- **Interface**: code selection, `Go to Spec`, relative path copy, line-based navigation highlight.
- **Source**: `src/code-editor/code-editor-panel.tsx` (`CodeEditorPanel`), `src/code-editor/cm6-selection-bridge.ts`, `src/code-editor/cm6-navigation-highlight.ts`.
- **Dependencies**: Workspace state, git markers, comment line index, spec-origin jump payload.
- **Spec**: [overview](./code-editor/overview.md), [contracts](./code-editor/contracts.md)

### Component: Spec Viewer

- **Overview**: rendered markdown, source mapping, spec search, same-document anchor, `Go to Source`, spec-origin comment entry를 담당한다.
- **Why**: raw markdown만으로는 리뷰와 탐색이 어렵고, rendered 상태에서도 raw source 기준선을 잃지 않아야 하기 때문이다.
- **Responsibility**: markdown render, source-line metadata 부여, selection to source line/offset 해석, search block highlight.
- **Interface**: `Go to Source`, `Copy Relative Path`, `Add Comment`, `Cmd/Ctrl+F` for spec search.
- **Source**: `src/spec-viewer/spec-viewer-panel.tsx` (`SpecViewerPanel`), `src/spec-viewer/source-line-metadata.ts` (`buildSourceLineAttributes`), `src/spec-viewer/source-line-resolver.ts` (`resolveSourceLine`).
- **Dependencies**: markdown security/link utils, code editor jump/highlight, App tab orchestration.
- **Spec**: [overview](./spec-viewer/overview.md), [contracts](./spec-viewer/contracts.md)

### Component: Comments & Export

- **Overview**: line comments, global comments, hover preview, draggable comment modal family(View Comments / Add Comment / Add Global Comments / Export Comments), `_COMMENTS.md`/LLM bundle export를 제공한다.
- **Why**: 리뷰 결과를 앱 안에서 끝내지 않고 구조화된 산출물로 전달해야 SDD 워크플로가 완성된다.
- **Responsibility**: 코멘트 schema 정규화, persistence, line index 계산, export formatting, modal CRUD, header-only drag positioning contract.
- **Interface**: `workspace:readComments`, `workspace:writeComments`, `workspace:readGlobalComments`, `workspace:writeGlobalComments`, `workspace:exportCommentsBundle`.
- **Source**: `src/code-comments/comment-persistence.ts` (`normalizeCodeComments`), `src/code-comments/comment-export.ts` (`renderCommentsMarkdown`, `renderLlmBundle`), `src/modal-drag-position.ts` (`clampModalDragDelta`, `useModalDragPosition`), `src/code-comments/comment-list-modal.tsx` (`CommentListModal`), `src/code-comments/comment-editor-modal.tsx` (`CommentEditorModal`), `src/code-comments/global-comments-modal.tsx` (`GlobalCommentsModal`), `src/code-comments/export-comments-modal.tsx` (`ExportCommentsModal`).
- **Dependencies**: Workspace session, source-line selection, export directory/file write, shared modal shell styles.
- **Spec**: [overview](./comments-and-export/overview.md), [contracts](./comments-and-export/contracts.md)

### Component: Remote Workspace

- **Overview**: 원격 연결 모달, directory browse, remote agent bootstrap, backend abstraction, remote system open 정책을 담당한다.
- **Why**: 원격 저장소를 로컬과 같은 UX로 다루되, 파일시스템 마운트에 의존하지 않고 상태와 오류를 더 명확히 통제하기 위해 분리했다.
- **Responsibility**: connect/disconnect/retry, remoteRoot browse, remote watch event 전달, VSCode SSH config sync.
- **Interface**: `workspace:browseRemoteDirectories`, `workspace:connectRemote`, `workspace:disconnectRemote`, `workspace:syncVsCodeSshConfig`, `system:openInIterm`, `system:openInVsCode`.
- **Source**: `electron/main.ts` (`handleWorkspaceConnectRemote`, `handleWorkspaceBrowseRemoteDirectories`), `electron/remote-agent/runtime/agent-main.ts` (`parseAgentCliArgs`, `runRemoteAgent`), `src/workspace/remote-connect-modal.tsx`.
- **Dependencies**: RemoteConnectionService, backend router, system-open, SSH config manager.
- **Spec**: [overview](./remote-workspace/overview.md), [contracts](./remote-workspace/contracts.md)

### Component: Appearance & Navigation

- **Overview**: App shell 레이아웃, Code/Spec 탭, 히스토리 이동, navigation highlight, theme bootstrap, native menu sync를 다룬다.
- **Why**: 사용자가 체감하는 “문맥 유지”는 편집기 내부 기능보다 상위 shell 상태 관리에 더 크게 좌우되기 때문이다.
- **Responsibility**: 탭 자동 전환, back/forward, workspace switching shortcut, theme persistence, menu sync.
- **Interface**: header/tab actions, `appearance-theme:menu-request`, `appearance-theme:changed`.
- **Source**: `src/App.tsx` (`App`), `src/appearance-theme.ts` (`restoreAppearanceThemeOnRoot`, `notifyAppearanceThemeChanged`), `electron/main.ts` (`installApplicationMenu`).
- **Dependencies**: Workspace session, code/spec panels, localStorage, Electron application menu.
- **Spec**: [overview](./appearance-and-navigation/overview.md), [contracts](./appearance-and-navigation/contracts.md)

---

## §5 Usage Guide & Expected Results

### Scenario 1: 기본 로컬 워크스페이스 탐색

**Setup:**
```bash
npm install
npm run dev
```

**Action:**
```text
1. 앱에서 로컬 워크스페이스를 연다.
2. 파일 트리에서 일반 코드 파일과 `.md` 파일을 번갈아 선택한다.
3. Code/Spec 탭을 전환하거나 spec 링크에서 `Go to Source`를 사용한다.
```

**Expected Result:**
```text
- 루트 트리가 인덱싱되고, 과대 디렉토리는 cap/partial 상태로 안전하게 표시된다.
- `.md` 파일을 선택하면 Spec 탭이 자동 활성화되고, 일반 파일은 Code 탭으로 전환된다.
- 점프 후 도착 라인/블록에 navigation highlight가 적용되고, 비활성 탭의 스크롤 문맥은 유지된다.
```

### Scenario 2: 코멘트 작성과 리뷰 번들 export

**Setup:**
```text
활성 워크스페이스와 열려 있는 코드/스펙 파일이 필요하다.
```

**Action:**
```text
1. 코드 또는 rendered spec에서 줄/블록을 선택하고 Add Comment를 실행한다.
2. 필요하면 modal header를 드래그해 코드/스펙을 가리지 않는 위치로 옮긴다.
3. View Comments에서 comment를 편집하거나 Global Comments를 추가한다.
4. Export Comments를 실행해 `_COMMENTS.md` 또는 LLM bundle을 생성한다.
```

**Expected Result:**
```text
- line comments는 `.sdd-workbench/comments.json`, global comments는 `.sdd-workbench/global-comments.md`에 유지된다.
- comment modal은 header drag로만 이동하고, viewport 밖으로 완전히 사라지지 않으며, 닫았다 다시 열면 중앙에서 다시 시작한다.
- export 시 pending comments 중심의 `_COMMENTS.md`가 생성되고, 필요하면 global comments가 선행 섹션으로 포함된다.
- marker hover preview와 target jump를 통해 export 전에 코멘트 위치를 다시 검토할 수 있다.
```

### Scenario 3: 원격 워크스페이스 연결과 동일 contract 사용

**Setup:**
```bash
npm run build:remote-agent-runtime
npm run dev
```

**Action:**
```text
1. Connect Remote Workspace에서 host/user/port/identityFile을 입력한다.
2. Browse Directories로 `remoteRoot`를 고른 뒤 연결한다.
3. 연결 후 파일 읽기/쓰기, watch, 검색, Open in iTerm 또는 Open in VSCode를 실행한다.
```

**Expected Result:**
```text
- 연결 성공 시 remote workspace가 열리고 `REMOTE` 배지와 연결 상태가 표시된다.
- watch mode는 polling 기반으로 동작하며, 연결 단절 시 degraded/disconnected 상태와 재시도 힌트가 노출된다.
- 이후 파일 탐색, 읽기/쓰기, 코멘트, 검색은 로컬과 동일한 `workspace:*` 흐름으로 사용된다.
```

### Common Operations

- remote agent runtime 관련 코드를 수정했다면 `npm run build:remote-agent-runtime`를 먼저 실행한다.
- 기본 검증은 `npm test`, `npm run lint`, `npm run build` 순서로 수행한다.
- 수동 스모크의 canonical checklist는 [operations.md](./operations.md) `4.3 수동 스모크 체크`를 따른다.

---

## §6 Data Models

### Model: WorkspaceSession

```ts
type WorkspaceSession = {
  rootPath: string
  workspaceKind: 'local' | 'remote'
  remoteProfile: WorkspaceRemoteProfile | null
  remoteConnectionState: 'connecting' | 'connected' | 'degraded' | 'disconnected' | null
  fileTree: WorkspaceFileNode[]
  activeFile: string | null
  activeSpec: string | null
  comments: CodeComment[]
  globalComments: string
  watchModePreference: 'auto' | 'native' | 'polling'
  watchMode: 'native' | 'polling' | null
  isDirty: boolean
}
```

**Constraints:**
- session의 문맥 경계는 `activeWorkspaceId` 기준으로 분리된다.
- `workspaceKind === 'remote'`일 때만 `remoteProfile`, `remoteConnectionState`가 의미를 가진다.
- line selection과 scroll/context state는 workspace별로 독립적이어야 한다.

**Source:** [src/workspace/workspace-model.ts:createWorkspaceSession], [src/workspace/workspace-context.tsx:WorkspaceProvider]

### Model: CodeComment

```ts
type CodeComment = {
  id: string
  relativePath: string
  startLine: number
  endLine: number
  body: string
  anchor: {
    snippet: string
    hash: string
    before?: string
    after?: string
    startOffset?: number
    endOffset?: number
  }
  createdAt: string
  exportedAt?: string
}
```

**Constraints:**
- `startLine/endLine`은 항상 1-based 정규화 범위다.
- `body`는 줄바꿈 정규화 후 trim 된다.
- `exportedAt`는 source of truth가 아니라 export 이력을 나타내는 optional metadata다.

**Source:** [src/code-comments/comment-types.ts:normalizeCommentSelection], [src/code-comments/comment-persistence.ts:normalizeCodeComments]

### Model: RemoteConnectionProfile / Event

```ts
type RemoteConnectionProfile = {
  workspaceId: string
  host: string
  remoteRoot: string
  user?: string
  port?: number
  agentPath?: string
  identityFile?: string
  sshAlias?: string
  requestTimeoutMs?: number
  connectTimeoutMs?: number
}

type RemoteConnectionEvent = {
  workspaceId: string
  sessionId?: string
  state: 'connecting' | 'connected' | 'degraded' | 'disconnected'
  errorCode?: string
  message?: string
  occurredAt: string
}
```

**Constraints:**
- `workspaceId`, `host`, `remoteRoot`는 필수다.
- `sshAlias`는 VSCode Remote-SSH 경로에서 사실상 필수다.
- 오류는 자유 텍스트보다 `errorCode` 표준화를 우선한다.

**Source:** [electron/remote-agent/types.ts:createRemoteWorkspaceRootPath], [electron/main.ts:handleWorkspaceConnectRemote]

---

## §7 API Reference

### Channel Group: Workspace Core

| Channel | Request Summary | Response Summary | Notes |
|---------|-----------------|------------------|-------|
| `workspace:openDialog` | 워크스페이스 선택 요청 | `{ canceled, selectedPath, error? }` | 로컬 워크스페이스 진입점 |
| `workspace:index` | `{ rootPath }` | `{ ok, fileTree, truncated?, error? }` | 초기 트리 인덱싱 |
| `workspace:indexDirectory` | `{ rootPath, relativePath, offset?, limit? }` | `{ ok, children, childrenStatus, totalChildCount, error? }` | on-demand 디렉토리 로드 |
| `workspace:readFile` | `{ rootPath, relativePath }` | `{ ok, content, imagePreview?, previewUnavailableReason?, error? }` | 텍스트/이미지 preview |
| `workspace:writeFile` | `{ rootPath, relativePath, content }` | `{ ok, error? }` | atomic write |
| `workspace:createFile` / `workspace:createDirectory` | `{ rootPath, relativePath }` | `{ ok, error? }` | 파일/디렉토리 생성 |
| `workspace:deleteFile` / `workspace:deleteDirectory` | `{ rootPath, relativePath }` | `{ ok, error? }` | 삭제 |
| `workspace:rename` | `{ rootPath, oldRelativePath, newRelativePath }` | `{ ok, error? }` | rename guard 포함 |
| `workspace:searchFiles` | `{ rootPath, query, ...limits }` | `{ ok, results, truncated, depthLimitHit, timedOut, error? }` | local/remote 공통 검색 |
| `workspace:watchStart` / `workspace:watchStop` | watch mode preference 포함 | `{ ok, watchMode?, fallbackApplied?, error? }` | native/polling fallback |

상세 규칙은 [workspace-and-file-tree/contracts.md](./workspace-and-file-tree/contracts.md)를 canonical contract로 삼는다.

### Channel Group: Comments / Export

| Channel | Request Summary | Response Summary | Notes |
|---------|-----------------|------------------|-------|
| `workspace:readComments` | `{ rootPath }` | `{ ok, comments, error? }` | `.sdd-workbench/comments.json` read |
| `workspace:writeComments` | `{ rootPath, comments }` | `{ ok, error? }` | line comment persistence |
| `workspace:readGlobalComments` | `{ rootPath }` | `{ ok, body, error? }` | global comments read |
| `workspace:writeGlobalComments` | `{ rootPath, body }` | `{ ok, error? }` | global comments write |
| `workspace:exportCommentsBundle` | `{ rootPath, commentsMarkdown?, bundleMarkdown?, writeCommentsFile, writeBundleFile }` | `{ ok, commentsPath?, bundlePath?, error? }` | `_COMMENTS.md`/LLM bundle 저장 |

이 그룹은 [comments-and-export/contracts.md](./comments-and-export/contracts.md)와 `renderCommentsMarkdown`/`renderLlmBundle` 구현을 함께 봐야 한다 [src/code-comments/comment-export.ts:renderCommentsMarkdown] [src/code-comments/comment-export.ts:renderLlmBundle].

### Channel Group: Remote Workspace

| Channel | Request Summary | Response Summary | Notes |
|---------|-----------------|------------------|-------|
| `workspace:browseRemoteDirectories` | `{ request: { host, user?, port?, identityFile?, targetPath?, connectTimeoutMs?, limit? } }` | `{ ok, currentPath, entries, truncated, errorCode?, error? }` | 연결 전 remoteRoot 탐색 |
| `workspace:connectRemote` | `{ profile }` | `{ ok, workspaceId?, sessionId?, rootPath?, remoteConnectionState?, errorCode?, error? }` | 연결 후 remote backend 등록 |
| `workspace:disconnectRemote` | `{ workspaceId }` | `{ ok, workspaceId, error? }` | 세션 정리 |
| `workspace:syncVsCodeSshConfig` | `{ sshAlias, host, user?, port?, identityFile? }` | `{ ok, configPath?, managedConfigPath?, includeInserted?, entryUpdated?, error? }` | Remote-SSH helper |
| `system:openInIterm` / `system:openInVsCode` / `system:openInFinder` | `{ rootPath, workspaceKind?, remoteProfile? }` | `{ ok, error? }` | remote/local workspace-aware open |

원격 관련 canonical contract는 [remote-workspace/contracts.md](./remote-workspace/contracts.md)다.

### Channel Group: Navigation / Theme Events

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `workspace:watchEvent` | Main -> Renderer | 변경 파일/구조 변경 이벤트 전달 |
| `workspace:remoteConnectionEvent` | Main -> Renderer | 원격 상태 전이 전달 |
| `workspace:historyNavigate` | Main -> Renderer | back/forward 요청 전달 |
| `appearance-theme:menu-request` | Main -> Renderer | native menu 선택 전달 |
| `appearance-theme:changed` | Renderer -> Main | 현재 theme 반영 |

이 이벤트 그룹은 [spec-viewer/contracts.md](./spec-viewer/contracts.md)와 [appearance-and-navigation/contracts.md](./appearance-and-navigation/contracts.md)를 함께 참조한다.

---

## §8 Environment & Dependencies

### Directory Structure

```text
src/                         React renderer, panels, app shell, state
electron/                    Main process, preload, backend router, remote agent
_sdd/spec/                   whitepaper index + component overview/contracts + appendix
_sdd/implementation/         구현 계획/리뷰 기록
test_workspace/              수동 스모크용 샘플 워크스페이스
scripts/build-remote-agent-runtime.mjs
```

### Dependencies

| Category | Packages | Purpose |
|----------|----------|---------|
| Runtime/UI | `react`, `react-dom`, `electron` | 데스크톱 UI와 프로세스 경계 |
| Editor | `@codemirror/*` | 편집, 검색, gutter, 언어 지원 |
| Markdown | `react-markdown`, `remark-gfm`, `rehype-sanitize`, `rehype-slug`, `github-slugger` | spec 렌더링, 보안, anchor |
| Highlight | `shiki` | 코드 하이라이트 |
| Filesystem/watch | `chokidar` | watcher/fallback |
| Clipboard/OS | `electron-clipboard-ex` | macOS Finder file clipboard 연동 |
| Test/build | `vitest`, `@testing-library/*`, `vite`, `electron-builder`, `eslint` | 품질 게이트와 배포 |

### Configuration

- OS 기준선: macOS primary
- Shell: `zsh`
- Node.js: `20.x` LTS 권장, 최소 `>=20`
- 자동 품질 게이트 baseline: `2026-03-02` 기준 Node `20.x` 에서 last known good이며, Node `25.x` 환경은 아직 재검증되지 않았다.
- 패키지 매니저: `npm`
- 필수 env var: 현재 없음

환경 실행 규칙의 canonical source는 [_sdd/env.md](../env.md)다.

### Runbook

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

- `npm test`는 remote agent runtime 번들을 먼저 생성한 뒤 Vitest를 실행한다.
- `npm run build`는 `build:remote-agent-runtime`, `tsc`, `vite build`, `electron-builder`를 순서대로 수행한다.
- remote runtime을 수정했으면 `npm run build:remote-agent-runtime`를 선행한다.

### Operational Constraints

- 인덱싱 cap: `100000`
- 디렉토리 child cap: `500`
- preview 파일 크기 제한: `2MB`
- local/remote polling watcher 기본 간격: `1500ms`
- remote request timeout 기본값: `15000ms`
- browse limit 기본값: `500`, 최대 `5000`

세부 수치와 수동 스모크는 [operations.md](./operations.md)를 따른다.

### Common Change Paths

- 파일 트리/검색/Git badge를 바꾸면 [workspace-and-file-tree/overview.md](./workspace-and-file-tree/overview.md), [code-map.md](./code-map.md)를 먼저 본다.
- 코드 편집/저장/gutter를 바꾸면 [code-editor/overview.md](./code-editor/overview.md), [code-editor/contracts.md](./code-editor/contracts.md)를 먼저 본다.
- 스펙 렌더링/왕복 점프/검색을 바꾸면 [spec-viewer/overview.md](./spec-viewer/overview.md), [spec-viewer/contracts.md](./spec-viewer/contracts.md)를 먼저 본다.
- 원격 연결/browse/watcher를 바꾸면 [remote-workspace/overview.md](./remote-workspace/overview.md), [remote-workspace/contracts.md](./remote-workspace/contracts.md)를 먼저 본다.

현재 기준 blocking open question은 없다.

---

## Appendix: Code Reference Index

| File | Functions / Classes | Referenced In |
|------|---------------------|---------------|
| `src/App.tsx` | `App()` | §1, §2, §4 |
| `src/workspace/workspace-context.tsx` | `WorkspaceProvider()` | §1, §2, §6 |
| `src/workspace/workspace-model.ts` | `createWorkspaceSession()` | §4, §6 |
| `src/spec-viewer/source-line-metadata.ts` | `buildSourceLineAttributes()` | §2, §4 |
| `src/spec-viewer/source-line-resolver.ts` | `resolveSourceLine()` | §2, §4 |
| `src/code-comments/comment-persistence.ts` | `normalizeCodeComments()`, `serializeCodeComments()` | §2, §4, §6 |
| `src/code-comments/comment-export.ts` | `renderCommentsMarkdown()`, `renderLlmBundle()` | §1, §2, §7 |
| `src/modal-drag-position.ts` | `clampModalDragDelta()`, `useModalDragPosition()` | §2, §4, §5 |
| `src/appearance-theme.ts` | `restoreAppearanceThemeOnRoot()`, `notifyAppearanceThemeChanged()` | §2, §4 |
| `electron/main.ts` | `registerIpcHandlers()`, `handleWorkspaceConnectRemote()`, `installApplicationMenu()` | §1, §2, §4, §7 |
| `electron/remote-agent/runtime/agent-main.ts` | `parseAgentCliArgs()`, `runRemoteAgent()` | §1, §4 |
