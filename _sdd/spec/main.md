# SDD Workbench

> 로컬/원격 워크스페이스에서 코드와 Markdown 스펙을 왕복 탐색·편집·리뷰하는 Electron 기반 워크벤치

**Version**: 0.50.0
**Last Updated**: 2026-04-14
**Status**: In Review

---

## 1. 배경 및 High-Level Concept

### Problem

코드 편집기, Markdown 스펙 뷰어, 원격 작업 도구, 리뷰 메모 export 흐름이 서로 분리되어 있을 때 맥락 전환 비용이 크다. 파일을 열고, 대응 스펙을 찾고, 코멘트를 남기고, 원격 저장소에 접속하는 과정이 각기 다른 도구로 흩어진다.

### High-Level Concept

"완전한 IDE"가 아니라 "스펙 중심 개발과 리뷰 루프를 빠르게 반복하는 작업대"다. 파일 시스템과 OS 접근은 main process가 책임지고, 사용자가 체감하는 문맥은 renderer state가 책임진다. 코드와 스펙을 같은 문맥에서 왕복하고, 그 결과를 바로 협업 산출물(코멘트 export)로 만든다.

원격 작업은 SSHFS 같은 파일시스템 마운트 의존 대신 remote agent protocol을 canonical path로 채택해 연결 상태, 오류 코드, watch fallback을 명시적으로 제어한다.

---

## 2. Scope / Non-goals / Guardrails

### In Scope

- Code/Spec 왕복 내비게이션 (line-level jump, highlight)
- CodeMirror 6 기반 코드 뷰어 (검색, wrap, git/comment gutter)
- 코멘트 루프 (line/global comments, hover preview, draggable modals, export bundle)
- 대규모 워크스페이스 대응 (lazy indexing, child cap, watcher fallback)
- 원격 워크스페이스 통합 (browse, connect, watch, system open)
- 테마 및 시각 상태 관리 (dark/light, native menu sync)
- Python citation navigation (`[path.py:Symbol]` bracket citation)

### Non-goals

- IDE급 리팩터링, LSP, 멀티탭, auto-save, auto-format
- 내장 터미널, Git diff/commit 전용 UI
- 원격 포트포워딩, 원격 LSP/확장 실행, 복수 배포 채널 관리
- 코멘트 실시간 동기화, 스레드/답글형 협업 UI

### Guardrails

- 실행 경계는 항상 `activeWorkspaceId` 기준이다.
- 라인 번호는 전역적으로 1-based이고, exact source offset은 same-file raw markdown 기준 0-based half-open range다.
- local/remote 차이는 가능한 한 `workspace:*` IPC 뒤에 숨긴다.
- theme source of truth는 renderer `appearanceTheme`와 localStorage이며, main process는 menu checked state만 mirror 한다.
- comments source of truth는 `.sdd-workbench/comments.json`과 `.sdd-workbench/global-comments.md`다.
- 인덱싱 cap: `100000`, 디렉토리 child cap: `500`, preview 파일 크기 제한: `2MB`.
- 세부 운영 기준과 수동 스모크는 [operations.md](./operations.md)를 따른다.

---

## 3. 핵심 설계와 주요 결정

### Core Design

| 설계 판단 | 근거 | 대안 |
|----------|------|------|
| Renderer state를 문맥의 source of truth로 유지 | 탭/스크롤/selection/comment/search 상태를 사용자 관점에서 일관되게 유지 | main process 중심 상태 관리 |
| FS/OS 접근을 main process로 제한 | workspace 경계 검증, watcher lifecycle, export I/O를 안전하게 통제 | renderer 직접 접근 |
| local/remote 공통 `workspace:*` surface | 기능 추가 시 renderer 분기를 줄이고 테스트 범위를 단순화 | 원격 전용 별도 API |
| line range 우선 + exact offset additive | 대부분의 markdown 구조에서 안정적으로 degrade하면서 세밀한 selection도 지원. table은 same-cell exact만 허용, ambiguity는 line fallback | exact offset only / line only |
| `display: none` 기반 탭 보존 | Code/Spec 탭 전환 시 스크롤 위치와 문맥 유지 | unmount/remount |
| renderer theme authoritative + menu mirror | storage failure와 app menu sync를 동시에 단순하게 처리 | main process authoritative theme |

### Key Decisions

| 결정 | 근거 | 대안 |
|------|------|------|
| Remote Agent Protocol를 canonical remote path로 채택 | watch/reconnect/error code를 명시적으로 다룰 수 있다 | SSHFS/mounted path |
| lazy indexing + child cap 500 + node cap 100000 | 대규모 저장소에서도 초기 로드와 메모리 사용을 통제 | 전체 eager tree 로드 |
| markdown sanitize allowlist 적용 | local resource와 rendered HTML의 보안 경계를 유지 | unrestricted HTML render |
| boundary-oriented split + shared IPC type module 유지 | `main.ts`, `App.tsx`, `workspace-context.tsx`, `spec-viewer-panel.tsx`는 public surface를 유지한 채 책임별 모듈/hook으로 분리하고, main/preload shared 타입은 `electron/ipc-types.ts`로 고정한다 | 대형 엔트리 파일에 구현을 계속 집중 |
| supporting docs를 split spec으로 유지 | top-level은 global entry, 하위 문서는 세부 계약으로 분리 | 모든 내용을 main.md 하나에 통합 |
| comment modal drag는 transient UI state | reopen 시 stale 좌표를 남기지 않는다 | persisted modal coordinates |
| viewer-first Code 패널 + VSCode edit handoff | 앱 안에서는 탐색에 집중, 편집은 VSCode로 넘긴다 | 앱 내 full editor |

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Desktop runtime | Electron 30.x | renderer/main/preload 경계와 OS 통합 |
| UI | React 18.x | app shell, panels, modals |
| Language | TypeScript 5.x | shared 타입과 안전한 IPC surface |
| Code editor | CodeMirror 6 | 검색, gutter, line jump |
| Markdown | react-markdown + remark-gfm + rehype-sanitize + rehype-slug | spec 렌더링, 보안, anchor |
| Syntax highlight | Shiki 3.x | 코드 하이라이트 |
| Test | Vitest + Testing Library + jsdom | unit/integration 테스트 |
| Build | Vite + electron-builder | 개발 서버와 패키징 |

---

## Supporting Notes

### Spec Map

| Document | Role | When to Open |
|----------|------|--------------|
| [main.md](./main.md) | global spec entry | 프로젝트 목적, 범위, 설계 판단을 파악할 때 |
| [`<component>/overview.md`](./workspace-and-file-tree/overview.md) | 컴포넌트 설명 | 특정 도메인의 사용자 동작과 규칙을 읽을 때 |
| [`<component>/contracts.md`](./workspace-and-file-tree/contracts.md) | 계약 | IPC/state/search/navigation 규칙을 확인할 때 |
| [feature-index.md](./feature-index.md) | 기능 ID 인덱스 | `Fxx` 기준으로 범위를 추적할 때 |
| [code-map.md](./code-map.md) | 코드 진입점 가이드 | 어떤 파일부터 열어야 할지 좁힐 때 |
| [operations.md](./operations.md) | 운영/검증 기준 | 품질 게이트, 수동 스모크, 성능/보안 기준을 볼 때 |
| [summary.md](./summary.md) | executive summary | 현재 상태와 우선순위를 빠르게 공유할 때 |
| [decision-log.md](./decision-log.md) | 정책/구조 이유 | 과거 의사결정 맥락을 확인할 때 |

### Component Directories

| Directory | Scope |
|-----------|-------|
| [workspace-and-file-tree/](./workspace-and-file-tree/) | 멀티 워크스페이스 세션, 파일 트리, 검색, CRUD, git badge |
| [code-editor/](./code-editor/) | CM6 기반 코드 뷰어, 검색, gutter, jump/highlight |
| [spec-viewer/](./spec-viewer/) | rendered markdown, source mapping, citation, spec search |
| [comments-and-export/](./comments-and-export/) | line/global comments, hover, modals, export bundle |
| [remote-workspace/](./remote-workspace/) | 원격 연결, browse, backend abstraction, system open |
| [appearance-and-navigation/](./appearance-and-navigation/) | App shell, 탭, 히스토리, theme, native menu |

### Environment

환경 실행 규칙의 canonical source는 [_sdd/env.md](../env.md)다.

```bash
npm install
npm run dev        # 개발 서버
npm test           # Vitest (remote agent runtime 빌드 포함)
npm run lint
npm run build      # 전체 빌드
```

remote agent runtime을 수정했으면 `npm run build:remote-agent-runtime`을 선행한다.
