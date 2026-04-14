# SDD Workbench

**Spec Version**: 0.50.0
**Last Updated**: 2026-04-14
**Role**: reader-facing whitepaper. Canonical thin global spec은 [main.md](./main.md)다.

---

## Executive Summary

SDD Workbench는 코드와 Markdown 스펙을 같은 작업대에서 왕복 탐색하고, 그 과정에서 생기는 코멘트를 바로 협업 산출물로 내보내는 Electron 데스크톱 앱이다. 로컬 프로젝트뿐 아니라 SSH 기반 원격 워크스페이스도 동일한 `workspace:*` IPC surface로 다룬다.

핵심 설계 원칙은 세 가지다.

1. **Renderer가 문맥의 source of truth** — 탭, 스크롤, selection, comment, search 상태를 사용자 관점에서 일관되게 유지한다.
2. **FS/OS 접근은 main process로 제한** — workspace 경계 검증, watcher lifecycle, export I/O를 안전하게 통제한다.
3. **local/remote 공통 surface** — renderer가 local/remote를 구분하지 않아도 되도록 backend abstraction layer를 제공한다.

Code 탭은 viewer-first(F46)로 탐색에 집중하며, 편집이 필요할 때는 VSCode로 handoff한다. Spec 탭은 rendered markdown에서 source mapping, Python citation navigation, 블록 단위 검색을 지원한다. 두 탭 사이의 왕복은 line-level jump + highlight로 연결되고, 그 과정에서 남긴 코멘트는 export bundle로 즉시 공유할 수 있다.

---

## Background / Motivation

### Problem

코드 편집기, Markdown 스펙 뷰어, 원격 접속 도구, 리뷰 메모 export 흐름이 서로 다른 도구에 흩어져 있으면 맥락 전환 비용이 크다. 파일을 열고, 대응 스펙을 찾고, 코멘트를 남기고, 원격 저장소에 접속하는 과정이 각각 다른 창과 다른 UX를 요구한다.

### Why This Matters

스펙 중심 개발(SDD) 워크플로에서는 코드와 스펙 사이를 빠르게 오가며, 발견한 이슈를 즉시 기록하고, 그 기록을 팀과 공유하는 루프가 핵심이다. 이 루프의 마찰이 클수록 스펙과 코드 사이의 드리프트가 누적되고, 리뷰 품질이 떨어진다.

### Alternatives Considered

- **기존 IDE + Markdown 플러그인**: 코드 편집은 강하지만 스펙 렌더링, source mapping, comment export 흐름은 별도 도구에 의존한다.
- **Markdown 문서 전용 뷰어**: 스펙은 잘 보여주지만 코드 컨텍스트와 분리된다.
- **SSHFS 마운트 기반 원격 접근**: 파일시스템 마운트에 의존하면 연결 상태, 오류 코드, watch fallback을 명시적으로 제어하기 어렵다.

### Why This Approach

"완전한 IDE"가 아니라 "스펙 중심 리뷰 루프를 빠르게 반복하는 작업대"를 목표로 한다. 코드와 스펙을 같은 문맥에서 왕복하고, 그 결과를 바로 코멘트 export로 만들되, 본격적인 편집은 VSCode 같은 외부 도구에 맡긴다. 원격 접근은 SSHFS 마운트 대신 remote agent protocol을 채택해 연결 lifecycle을 명시적으로 통제한다.

---

## Core Design

### Renderer / Main / Remote 3층 구조

```text
Renderer (App + WorkspaceProvider)
        |
        v
Preload (typed workspace bridge)
        |
        v
Main (IPC handlers + backend router)
        |                     |
        |                     +--> Remote agent runtime / stdio RPC
        +--> Local FS / watcher / git / export
```

- **Renderer**: 멀티 워크스페이스 상태, active file/spec, navigation history, comments, appearance theme을 관리한다. 탭 전환은 `display: none`으로 비활성 패널을 숨기되 언마운트하지 않아 스크롤/문맥을 보존한다.
- **Main process**: IPC 핸들러가 `BackendRouter`를 통해 local/remote 구현체를 선택하고, watcher lifecycle, system open, export I/O, security boundary를 통제한다.
- **Remote agent**: SSH transport + stdio RPC로 원격 파일 읽기/쓰기/감시/git/comment를 처리한다. bootstrap 시 runtime 배포 + 버전 검증을 자동 수행한다.

### 주요 설계 결정

| 결정 | 이유 |
|------|------|
| Renderer state가 문맥의 source of truth | 탭/스크롤/selection/comment/search를 사용자 관점에서 일관 유지 |
| local/remote 공통 `workspace:*` surface | renderer에 local/remote 분기를 넣지 않아 기능 추가 비용을 낮춤 |
| Remote Agent Protocol (not SSHFS) | watch/reconnect/error code를 명시적으로 다룰 수 있음 |
| viewer-first Code 탭 + VSCode handoff | 앱 안에서는 탐색에 집중, 편집은 VSCode로 위임 |
| CM6를 read-only viewer engine으로 유지 | search, selection, jump, gutter 상호작용은 editor-grade engine이 적합 |
| line range 우선 + exact offset additive | 대부분의 markdown 구조에서 안정적 degrade, 세밀한 selection도 지원 |
| lazy indexing + child cap 500 + node cap 100K | 대규모 저장소에서도 초기 로드와 메모리 사용을 통제 |

### Guardrails

- 실행 경계는 항상 `activeWorkspaceId` 기준이다.
- 라인 번호는 전역적으로 1-based, exact source offset은 0-based half-open range다.
- theme source of truth는 renderer `appearanceTheme` + localStorage이며, main process는 menu checked state만 mirror한다.
- comments source of truth는 `.sdd-workbench/comments.json` + `.sdd-workbench/global-comments.md`다.
- 인덱싱 cap `100,000`, 디렉토리 child cap `500`, preview 파일 크기 제한 `2MB`.
- markdown 렌더는 sanitize allowlist 강제, 로컬 리소스는 workspace 내부 상대경로만 허용.

---

## Code Grounding

| Topic | Paths / Symbols | Why It Matters |
|---|---|---|
| App shell / orchestration | `src/App.tsx`, `src/App.css` | 탭 레이아웃, 헤더 액션, 모달, jump request 라우팅의 중심 |
| Workspace state model | `src/workspace/workspace-model.ts`, `src/workspace/workspace-context.tsx` | 멀티 워크스페이스 상태, document session, active file/spec의 source of truth |
| Code Viewer (CM6 engine) | `src/code-editor/code-editor-panel.tsx`, `src/code-editor/cm6-selection-bridge.ts` | viewer-first Code 탭의 검색, selection, jump, gutter 구현 |
| Spec Viewer / source mapping | `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/source-line-resolver.ts` | rendered markdown, source action, exact offset mapping, search |
| Citation navigation | `src/spec-viewer/citation-target.ts`, `src/spec-viewer/python-symbol-resolver.ts` | `[path.py:Symbol]` bracket citation → Python 선언 위치 점프 |
| Comments / export | `src/code-comments/comment-persistence.ts`, `src/code-comments/comment-export.ts` | line/global comment 저장, export bundle 생성 |
| IPC + backend router | `electron/main.ts`, `electron/workspace-backend/types.ts` | local/remote 공통 IPC surface, backend 라우팅 |
| Remote agent | `electron/remote-agent/protocol.ts`, `electron/remote-agent/transport-ssh.ts` | SSH transport, RPC protocol, bootstrap/versioning |
| Theme / menu | `src/appearance-theme.ts`, `electron/appearance-menu.ts` | dark-gray/light/system 테마 + native menu sync |
| File tree / search | `src/file-tree/file-tree-panel.tsx`, `electron/workspace-search.ts` | lazy tree, CRUD, 파일명 검색, git badge |

---

## Usage / Expected Results

### 기본 사용 흐름

1. **워크스페이스 열기**: 앱 실행 후 로컬 디렉토리를 열거나, `Connect Remote Workspace`로 SSH 원격 워크스페이스를 연결한다.
2. **파일 탐색**: 좌측 파일 트리에서 파일을 선택한다. `.md` 파일은 Spec 탭이, 나머지는 Code 탭이 자동으로 열린다.
3. **Code ↔ Spec 왕복**: `Go to Source`(spec → code)와 `Go to Spec`(code → spec)으로 대응 위치를 오간다. 도착 지점은 잠시 하이라이트된다.
4. **코멘트 작성**: Code/Spec 탭에서 우클릭 → `Add Comment`로 라인 코멘트를 남기거나, `Add Global Comments`로 전역 메모를 작성한다.
5. **Export**: `Export Comments`에서 pending 코멘트를 선택하고 markdown bundle로 내보낸다. Global comments 포함 여부를 제어할 수 있다.
6. **외부 편집**: `Edit in VSCode`로 현재 파일을 VSCode에서 연다. 원격 워크스페이스는 Remote-SSH authority로 연결한다.

### 기대 결과

- 코드와 스펙 사이 왕복 시 line-level precision으로 정확한 위치에 도착한다.
- 스펙의 `[path.py:Symbol]` citation을 클릭하면 Python 파일의 선언 위치로 점프한다.
- 원격 워크스페이스에서도 파일 읽기/쓰기/감시/git/comment가 로컬과 동일하게 동작한다.
- export bundle은 코멘트를 파일/라인 기준으로 그룹핑하며, 재export 시 이미 내보낸 항목을 구분한다.

### 실패/예외 경계

- native watcher 시작 실패 시 polling fallback으로 degraded success를 유지한다.
- 원격 연결 단절 시 `degraded`/`disconnected` 상태로 반영하고, 재시도 한도 초과 시 사용자 명시 재시도로 전환한다.
- 2MB 초과 파일은 preview unavailable로 표시한다. 인덱싱 cap(100K) 초과 시 truncated 배너를 표시한다.
- comment save/export 실패 시 모달을 유지해 즉시 재시도할 수 있다.

---

## Further Reading / References

### Spec Documents

| Document | Role | When to Open |
|----------|------|--------------|
| [main.md](./main.md) | thin global spec | 프로젝트 범위, 설계 판단을 파악할 때 |
| [`<component>/overview.md`](./workspace-and-file-tree/overview.md) | 컴포넌트 설명 | 특정 도메인의 사용자 동작과 규칙을 읽을 때 |
| [`<component>/contracts.md`](./workspace-and-file-tree/contracts.md) | 계약 | IPC/state/search/navigation 규칙을 확인할 때 |
| [feature-index.md](./feature-index.md) | 기능 ID 인덱스 | `Fxx` 기준으로 범위를 추적할 때 |
| [code-map.md](./code-map.md) | 코드 진입점 가이드 | 어떤 파일부터 열어야 할지 좁힐 때 |
| [operations.md](./operations.md) | 운영/검증 기준 | 성능, 보안, 수동 스모크를 볼 때 |
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

```bash
npm install
npm run dev        # Electron dev server
npm test           # Vitest (remote agent runtime 빌드 포함)
npm run lint
npm run build      # 전체 빌드 (tsc + vite + electron-builder)
```

- Node.js 20.x LTS (최소 >=20), macOS primary
- 상세: [_sdd/env.md](../env.md)

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Desktop runtime | Electron 30.x | renderer/main/preload 경계와 OS 통합 |
| UI | React 18.x | app shell, panels, modals |
| Language | TypeScript 5.x | shared 타입과 안전한 IPC surface |
| Code editor | CodeMirror 6 | 검색, gutter, line jump (read-only viewer engine) |
| Markdown | react-markdown + remark-gfm + rehype-sanitize + rehype-slug | spec 렌더링, 보안, anchor |
| Syntax highlight | Shiki 3.x | 코드 하이라이트 |
| Test | Vitest + Testing Library + jsdom | unit/integration 테스트 |
| Build | Vite + electron-builder | 개발 서버와 패키징 |

---

**Note**: 이 문서는 thin global spec([main.md](./main.md))을 reader-facing whitepaper로 풀어쓴 companion이다. 세부 계약은 component `contracts.md`에, 구현 진입점은 [code-map.md](./code-map.md)에, 기능 추적은 [feature-index.md](./feature-index.md)에 있다.
