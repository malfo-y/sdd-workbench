# SDD Workbench 기본 스펙 (MVP Baseline)

## 메타데이터

- 문서 버전: `0.10.0`
- 마지막 업데이트: `2026-02-20`
- 문서 상태: `Draft`
- 기준 입력:
  - 사용자 요구사항: `/_sdd/spec/user_spec.md`
  - UI 스케치: `/_sdd/spec/ui_sketch.png`
  - 코드베이스: Electron + React + F01/F02/F03/F03.1/F03.5/F04/F04.1/F05(워크스페이스 부트스트랩 + 파일 트리 + 코드 뷰어 + 확장자 색상 코딩 + 멀티 워크스페이스 + Markdown 듀얼 뷰 + 링크 인터셉트/copy popover + spec->code 라인 점프) 구현 상태

---

## 1. 목표

SDD Workbench의 목표는 로컬 저장소에서 스펙 문서를 항상 가시화한 상태로 코드 탐색을 지원하고, CLI 작업 중 컨텍스트 복사/이동 비용을 낮추는 데 있다.

핵심 목표:

1. 스펙(Markdown)과 코드를 동시에 보는 3-패널 워크벤치 제공
2. 스펙 문서 링크에서 코드 라인으로 즉시 점프
3. CLI 사용을 위한 컨텍스트 복사 기능 제공
4. 외부 툴(Codex/Claude CLI)로 인한 파일 변경을 UI에서 반영

---

## 2. 범위

### 2.1 MVP 포함 범위

- 워크스페이스 열기/활성 전환/제거
- 파일 트리 탐색
- 코드 읽기 뷰어(읽기 중심)
- Markdown 렌더링 뷰어
- 스펙 링크 기반 코드 점프
- 상단 컨텍스트 툴바(4개 액션)
- 파일 변경 표시(changed indicator)

### 2.2 MVP 제외 범위 (Non-Goals)

- IDE급 편집 기능(멀티탭, LSP, 리팩터링, 프로젝트 검색)
- 내장 터미널/PTY
- 복수 워크스페이스 고급 기능(세션 영속화, 워크스페이스별 watcher 운영)
- 플러그인 시스템
- Git diff/commit UI

---

## 3. 현재 구현 상태 (As-Is)

### 3.1 코드베이스 인벤토리

| 파일 | 역할 | 상태 |
|---|---|---|
| `src/App.tsx` | `Open Workspace` + workspace switcher + 좌측 파일 트리 + center 코드 뷰어 + 우측 rendered spec 패널 통합 + same-workspace spec 링크 파일 열기/라인 점프 wiring | Implemented (F01/F02/F03/F03.5/F04/F04.1/F05) |
| `src/main.tsx` | `WorkspaceProvider` 마운트 포함 React 진입점 | Implemented (F01) |
| `src/workspace/workspace-context.tsx` | 멀티 워크스페이스 상태(`workspacesById`/`workspaceOrder`/`activeWorkspaceId`) + 인덱싱/읽기/선택/`activeSpec`/배너 상태 관리 | Implemented (F01/F02/F03/F03.5/F04) |
| `src/workspace/use-workspace.ts` | Workspace Context 전용 hook | Implemented (F01) |
| `src/workspace/workspace-model.ts` | 멀티 워크스페이스 순수 상태 전이 모델(add/focus/close/update) | Implemented (F03.5) |
| `src/workspace/workspace-switcher.tsx` | 활성 워크스페이스 선택 + 닫기/제거 UI | Implemented (F03.5) |
| `src/workspace/path-format.ts` | UI 표시용 경로 축약 유틸(`~`) | Implemented (F01) |
| `src/file-tree/file-tree-panel.tsx` | 디렉터리 토글형 파일 트리 패널 + 렌더 cap(500) + 워크스페이스별 펼침 상태 연동 | Implemented (F02/F03.5) |
| `src/code-viewer/code-viewer-panel.tsx` | 라인 단위 코드 프리뷰 + 선택 범위 + preview-unavailable 표시 + language 라벨 + spec 링크 점프 스크롤 | Implemented (F03/F03.1/F05) |
| `src/code-viewer/line-selection.ts` | 1-based 라인 선택/Shift 확장 유틸 | Implemented (F03) |
| `src/code-viewer/language-map.ts` | 확장자 -> 하이라이트 언어 매핑(`.py` 포함) | Implemented (F03.1) |
| `src/code-viewer/syntax-highlight.ts` | Prism 기반 라인 하이라이트 어댑터 + plaintext escape fallback | Implemented (F03.1) |
| `src/spec-viewer/markdown-utils.ts` | markdown heading 추출 + TOC id 생성 유틸 | Implemented (F04) |
| `src/spec-viewer/spec-viewer-panel.tsx` | rendered spec 패널 + TOC + markdown 링크 인터셉트 + lineRange 전달 + 링크 popover 연동 | Implemented (F04/F04.1/F05) |
| `src/spec-viewer/spec-link-utils.ts` | spec 링크 분류(anchor/workspace-file/external/unresolved) + activeSpec 기준 경로 해석 + `#Lx/#Lx-Ly` 파싱 | Implemented (F04.1/F05) |
| `src/spec-viewer/spec-link-popover.tsx` | 커서 기준 링크 액션 popover(`Copy Link Address`, `Close`) | Implemented (F04.1) |
| `src/App.css` | 3패널 레이아웃 + 파일 트리/코드 뷰어/spec 패널 + 워크스페이스 switcher + spec 링크 popover 스타일 + 토큰 컬러 스타일 | Implemented (F02/F03/F03.1/F03.5/F04/F04.1) |
| `src/App.test.tsx` | F01/F02/F03/F03.1/F03.5/F04/F04.1/F05 통합 플로우 테스트(16건) | Implemented (F01/F02/F03/F03.1/F03.5/F04/F04.1/F05) |
| `src/workspace/workspace-model.test.ts` | 멀티 워크스페이스 정책 테스트(6건) | Implemented (F03.5/F04) |
| `src/code-viewer/line-selection.test.ts` | 선택 범위 정규화/Shift 확장 테스트(5건) | Implemented (F03) |
| `src/code-viewer/language-map.test.ts` | 확장자 매핑/ fallback 테스트(2건) | Implemented (F03.1) |
| `src/code-viewer/code-viewer-panel.test.tsx` | `.py` 하이라이트 + plaintext fallback + jump 스크롤 테스트(3건) | Implemented (F03.1/F05) |
| `src/spec-viewer/markdown-utils.test.ts` | markdown heading/TOC 유틸 테스트(2건) | Implemented (F04) |
| `src/spec-viewer/spec-link-utils.test.ts` | 링크 해석/경계/외부 URL 분류 + lineRange 파싱 테스트(11건) | Implemented (F04.1/F05) |
| `src/spec-viewer/spec-viewer-panel.test.tsx` | rendered panel 상태/링크 인터셉트/popover + lineRange 전달 테스트(8건) | Implemented (F04/F04.1/F05) |
| `src/test/setup.ts` | RTL matcher setup (`jest-dom`) | Implemented (F01) |
| `electron/main.ts` | BrowserWindow 부팅 + `workspace:openDialog`/`workspace:index`/`workspace:readFile` IPC handler | Implemented (F01/F02/F03) |
| `electron/preload.ts` | `window.workspace.openDialog()`/`index()`/`readFile()` API 노출 | Implemented (F01/F02/F03) |
| `electron/electron-env.d.ts` | Renderer 전역 workspace 타입 계약(openDialog/index/readFile) | Implemented (F01/F02/F03) |
| `vitest.config.ts` | `jsdom` 기반 테스트 환경 설정 | Implemented (F01) |
| `vite.config.ts` | Vite + Electron 빌드 설정 | Implemented |
| `package.json` | dev/build/test 스크립트 + Prism 하이라이트 + markdown 렌더 의존성(`react-markdown`, `remark-gfm`, `rehype-slug`) 포함 | Implemented |
| `/_sdd/spec/user_spec.md` | 기능 요구사항 원문 | Implemented (문서) |

### 3.2 기능 요구사항 커버리지 매트릭스

| 요구사항 | 상태 | 근거 |
|---|---|---|
| 4.1 Workspace Management | Implemented (MVP) | 멀티 워크스페이스 추가/중복 포커스/전환/제거 + 워크스페이스별 트리 펼침 복원 + 전환 시 selection 리셋 구현(F03.5), 세션 영속화는 Non-Goal |
| 4.2 File Browser | Partial | 좌측 트리/active 하이라이트/디렉터리 토글 + center 코드 뷰어 연계 구현, changed indicator는 미구현 |
| 4.3 Code Viewer | Partial | 코드 프리뷰/라인 선택/preview-unavailable/확장자 색상 코딩(F03/F03.1) + spec 링크 점프 스크롤(F05) 구현, 툴바 복사 연계는 미구현 |
| 4.4 Spec Viewer | Implemented (Core) | `.md` dual view(center raw + right rendered) + TOC + workspace별 `activeSpec` 복원 구현(F04) |
| 4.5 Spec -> Code Navigation | Implemented (Core) | rendered markdown 링크 인터셉트 + same-workspace 파일 열기 + external/unresolved copy popover(F04.1) + `#Lx/#Lx-Ly` 라인 점프/하이라이트(F05) 구현 |
| 4.6 Context Toolbar | Planned | 4개 액션 버튼 미구현 |
| 4.7 File Change Detection | Planned | 파일 시스템 watcher 미구현 |
| Electron 앱 부팅/윈도우 표시 | Implemented | `electron/main.ts` |
| Renderer <-> Main 브리지 기본 틀 | Partial | `openDialog()`/`index()`/`readFile()` 구현, watcher/system 채널은 미구현 |

요약: F01/F02/F03/F03.1/F03.5/F04/F04.1/F05는 완료되었고, 다음 우선순위는 F06+ 영역이다. F06~F07은 `active workspace` 기준 동작을 기본 정책으로 한다.

---

## 4. 목표 UX/레이아웃 (To-Be)

`ui_sketch.png`와 `user_spec.md`를 기준으로 다음 구조를 목표로 한다.

```text
┌──────────────────────────────────────────────────────────────────┐
│ Top Toolbar: Open in iTerm | Copy Section | Copy Path | Copy Lines │
├──────────────────┬─────────────────────────┬─────────────────────┤
│ File Browser     │ Code Viewer             │ Spec Viewer         │
│ (Left Panel)     │ (Center, Raw/Code)      │ (Right, Rendered)   │
├──────────────────┴─────────────────────────┴─────────────────────┤
│ Optional Status Bar / Toast Area                                 │
└──────────────────────────────────────────────────────────────────┘
```

UI 원칙:

- 구조 우선(픽셀 퍼펙트 비목표)
- 읽기 중심 인터랙션
- 스펙-코드 왕복 이동 최소 클릭

---

## 5. 아키텍처 개요 (To-Be)

```text
Electron Main
  ├─ OS 통합 (파일 다이얼로그, iTerm 실행, 파일 워처)
  ├─ IPC Handler
  └─ Security Boundary (contextIsolation + preload)

Preload
  └─ 제한된 IPC API 노출

Renderer (React)
  ├─ WorkspaceProvider (전역 상태)
  ├─ Toolbar
  ├─ FileTreePanel
  ├─ CodeViewerPanel
  └─ SpecViewerPanel
```

설계 원칙:

- 파일 시스템/OS 접근은 Main에서만 수행
- Renderer는 상태 + 표시 + 사용자 액션 처리에 집중
- IPC payload는 최소 스키마로 명시화

---

## 6. 컴포넌트 상세

### 6.1 WorkspaceProvider

| 항목 | 내용 |
|---|---|
| Purpose | 멀티 워크스페이스 세션 관리 + 워크스페이스별 인덱싱/파일 본문/선택 상태와 배너 피드백 관리 |
| Input | `window.workspace.openDialog()`, `window.workspace.index(rootPath)`, `window.workspace.readFile(rootPath, relativePath)` 결과 |
| Output | `workspaces`, `workspaceOrder`, `activeWorkspaceId`, `rootPath`, `fileTree`, `activeFile`, `activeFileContent`, `isIndexing`, `isReadingFile`, `readFileError`, `previewUnavailableReason`, `selectionRange`, `expandedDirectories`, `bannerMessage`, `openWorkspace()`, `setActiveWorkspace()`, `closeWorkspace()`, `selectFile()`, `setSelectionRange()`, `setExpandedDirectories()`, `clearBanner()` |
| Dependencies | `workspace:openDialog`, `workspace:index`, `workspace:readFile` IPC + preload 브리지 |
| 상태 | Implemented (F01/F02/F03/F03.5) |

### 6.2 FileTreePanel

| 항목 | 내용 |
|---|---|
| Purpose | 좌측 파일 트리 표시 + 디렉터리 토글 탐색 + active file 표시 + 워크스페이스별 펼침 상태 연동 |
| Input | 파일 트리 모델, activeFile, isIndexing, expandedDirectories |
| Output | 파일 선택 이벤트, expandedDirectories 변경 이벤트 |
| Dependencies | WorkspaceProvider |
| 상태 | Partial (F02/F03.5 Implemented, F07 changed marker 예정) |

### 6.3 CodeViewerPanel

| 항목 | 내용 |
|---|---|
| Purpose | 코드 원문 프리뷰 표시, 라인 선택 범위 추적, preview unavailable 상태 표시, 확장자 기반 색상 코딩 |
| Input | activeFilePath, fileContent, isReadingFile, readFileError, previewUnavailableReason, selectionRange |
| Output | selectedLineRange |
| Dependencies | `line-selection` 유틸, Prism 기반 하이라이트 어댑터 |
| 상태 | Partial (F03/F03.1/F05 Implemented, F06 연계 예정) |

### 6.4 SpecViewerPanel

| 항목 | 내용 |
|---|---|
| Purpose | Markdown 렌더링, TOC 표시, markdown 링크 인터셉트/안전 처리(동일 문서 anchor 허용 + same-workspace 파일 열기 + lineRange 전달 + external/unresolved copy popover) |
| Input | `activeSpecPath`, markdown content, `onOpenRelativePath(relativePath, lineRange)` |
| Output | TOC anchor 링크, `onOpenRelativePath(relativePath, lineRange)` 호출, link popover UI |
| Dependencies | `react-markdown`, `remark-gfm`, `rehype-slug`, `spec-link-utils`, `spec-link-popover` |
| 상태 | Partial (F04/F04.1/F05 Implemented, activeHeading 추적은 F09 예정) |

### 6.5 Toolbar

| 항목 | 내용 |
|---|---|
| Purpose | 컨텍스트 액션(4개) 제공 |
| Input | 현재 섹션, active file path, selected lines |
| Output | iTerm 실행 요청, 클립보드 복사 요청 |
| Dependencies | WorkspaceProvider, IPC/Clipboard API |
| 상태 | Planned |

### 6.6 WorkspaceSwitcher

| 항목 | 내용 |
|---|---|
| Purpose | 활성 워크스페이스 선택 및 닫기/제거 UX 제공 |
| Input | `workspaces`, `activeWorkspaceId` |
| Output | `setActiveWorkspace(id)`, `closeWorkspace(id)` 이벤트 |
| Dependencies | WorkspaceProvider, 경로 축약 유틸(`abbreviateWorkspacePath`) |
| 상태 | Implemented (F03.5) |

---

## 7. 상태 모델 (초안)

```ts
type SelectionState = {
  startLine: number
  endLine: number
} | null

type WorkspaceSession = {
  rootPath: string
  fileTree: FileNode[] // F02 구현
  activeFile: string | null // F02 구현
  activeFileContent: string | null // F03 구현
  isIndexing: boolean // F02 구현
  isReadingFile: boolean // F03 구현
  readFileError: string | null // F03 구현
  previewUnavailableReason: 'file_too_large' | 'binary_file' | null // F03 구현
  selectionRange: SelectionState // F03 구현
  expandedDirectories: string[] // F03.5 구현
  activeSpec: string | null // F04 구현
  changedFiles: string[] // F07 예정 (내부 구현은 Set 권장)
}

type WorkspaceState = {
  activeWorkspaceId: string | null // F03.5 구현
  workspaceOrder: string[] // F03.5 구현 (최근 활성 순서 기반)
  workspacesById: Record<string, WorkspaceSession> // F03.5 구현
  bannerMessage: string | null
}

type SpecViewState = {
  activeHeadingId?: string
}
```

`#L10` 표기는 1-based 기준으로 처리하고, 내부 에디터 API가 0-based이면 변환한다.

F01 기준 상태 전이 규칙:

1. 초기 상태: `rootPath = null`, `bannerMessage = null`
2. 성공 선택: `rootPath = selectedPath(절대 경로)`, `bannerMessage = null`
3. 취소/오류: `rootPath`는 기존 값 유지, `bannerMessage`만 갱신
4. 경로 축약(`~`)은 UI 표시 전용이며, 내부 상태(`rootPath`)와 `title`에는 절대 경로를 유지

F02 기준 상태 전이 규칙:

1. 워크스페이스 선택 성공 시 `openWorkspace()` 내부에서 `workspace.index(rootPath)`를 호출한다.
2. 인덱싱 시작 시 `isIndexing = true`, 기존 `fileTree`/`activeFile`을 초기화한다.
3. 인덱싱 성공 시 `fileTree`를 갱신하고 `isIndexing = false`로 전환한다.
4. 인덱싱 실패 시 기존 앱은 유지되고 `bannerMessage`에 오류를 표시한다.
5. 트리 UI는 디렉터리 기본 접힘 상태에서 시작하고, 디렉터리 클릭 시 하위 노드를 확장한다.

F03 기준 상태 전이 규칙:

1. 파일 선택 시 `activeFile`을 갱신하고 기존 `activeFileContent`/`selectionRange`/읽기 오류 상태를 초기화한다.
2. `readFile` 요청 시작 시 `isReadingFile = true`로 전환한다.
3. 읽기 성공(`ok: true`, `content`) 시 `activeFileContent`를 갱신하고 `isReadingFile = false`로 전환한다.
4. 읽기 실패(`ok: false`) 시 `readFileError`를 저장하고 오류 메시지를 center 패널에 표시한다.
5. preview 불가(`previewUnavailableReason`) 시 본문 대신 사유(`file_too_large`/`binary_file`)를 표시한다.
6. 라인 클릭은 1-based 기준 선택 범위를 저장하며, `Shift+Click`은 anchor line 기반 범위를 확장한다.

F03.1 기준 상태/표시 규칙:

1. 하이라이트 언어는 `activeFile` 확장자 매핑 결과를 사용한다.
2. 지원 확장자(`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`, `.py`) 외에는 `plaintext` fallback을 사용한다.
3. `.py`는 필수 지원 확장자로 `python` 하이라이트를 적용한다.

F03.5 기준 상태 전이 규칙(Implemented):

1. `openWorkspace()`는 항상 추가 동작을 수행한다(기존 워크스페이스 교체 금지).
2. 이미 열린 `rootPath`를 다시 열면 신규 세션을 만들지 않고 기존 워크스페이스를 활성화한다.
3. 워크스페이스 전환 시 세션별 `activeFile`/`activeFileContent`/`fileTree`는 유지한다.
4. 워크스페이스 제거 시 `workspaceOrder`를 갱신하고, 제거 대상이 활성 세션이었다면 다음 활성 워크스페이스를 재선정한다.
5. 파일 트리 폴더 펼침 상태(`expandedDirectories`)는 워크스페이스 세션별로 저장/복원한다.
6. 워크스페이스 전환 시 `selectionRange`는 `null`로 리셋한다.
7. 파일 읽기 응답 경합은 워크스페이스별 request token으로 제어한다.

---

## 8. 링크/경로 파싱 규칙 (MVP 고정)

현재 구현 기준 지원/처리:

- `#heading-id` (same document anchor)
- `./path/to/file.md`, `../path/to/file.md` (activeSpec 기준 상대 링크)
- `path/to/file.ts#L10`, `path/to/file.ts#L10-L20` (same-workspace line jump)
- `https://...`, `mailto:...` 등 외부 링크

규칙:

1. 내부 경로 해석은 `active workspace rootPath` 기준 상대경로만 허용한다.
2. same document anchor(`#...`)는 기본 스크롤 동작을 유지한다.
3. same-workspace 상대 파일 링크는 내부 라우팅으로 파일을 연다(`selectFile` 경로).
4. 현재 활성 워크스페이스에서 해석할 수 없는 링크 및 외부 링크는 자동 이동하지 않고 링크 주소 copy popover를 표시한다.
5. 워크스페이스 간 자동 fallback(다른 워크스페이스 탐색)은 허용하지 않는다.
6. 코드 라인 점프(`Lx`, `Lx-Ly`)는 same-workspace 링크에서 파싱/하이라이트를 적용한다.

---

## 9. IPC 계약 (초안)

### 9.1 현재 존재하는 채널

| 채널 | 방향 | 용도 | 상태 |
|---|---|---|---|
| `main-process-message` | Main -> Renderer | 샘플 타임스탬프 송신 | Implemented (개발용) |

### 9.2 MVP 목표 채널 (구현 + 계획)

| 채널 | 방향 | Payload(요약) | 상태 |
|---|---|---|---|
| `workspace:openDialog` | Renderer -> Main (`invoke`) | 없음 -> `{ canceled: boolean, selectedPath: string \| null, error?: string }` | Implemented (F01) |
| `workspace:index` | Renderer -> Main (`invoke`) | `{ rootPath }` -> `{ ok, fileTree, error? }` | Implemented (F02) |
| `workspace:readFile` | Renderer -> Main (`invoke`) | `{ rootPath, relativePath }` -> `{ ok, content, error?, previewUnavailableReason? }` | Implemented (F03) |
| `workspace:watchStart` | Renderer -> Main (`invoke`) | `{ workspaceId, rootPath }` | Planned |
| `workspace:watchEvent` | Main -> Renderer (`send`) | `{ workspaceId, changedRelativePaths[] }` | Planned |
| `system:openInIterm` | Renderer -> Main (`invoke`) | `{ rootPath }` | Planned |

구현 메모:

- Renderer는 generic `invoke`를 직접 사용하지 않고 `window.workspace.openDialog()` 래퍼를 통해 호출한다.
- 인덱싱은 `window.workspace.index(rootPath)` 래퍼를 통해 호출한다.
- 파일 본문 읽기는 `window.workspace.readFile(rootPath, relativePath)` 래퍼를 통해 호출한다.
- watcher 이벤트(`workspace:watchEvent`)는 `workspaceId`를 포함해 세션 오염 없이 라우팅한다.

---

## 10. 성능/보안/신뢰성 기준

### 10.1 성능

- 초기 인덱싱은 파일 경로/메타데이터 우선 (내용 지연 로딩)
- 파일 트리 렌더링은 초기 노드 cap(500)으로 과도한 렌더를 제한
- 코드 프리뷰는 파일당 2MB 초과 시 렌더를 생략하고 preview unavailable 상태를 반환한다.
- watcher 이벤트 200~500ms 디바운스
- 대형 디렉터리 기본 ignore:
  - `.git/`
  - `node_modules/`
  - `dist/`, `build/`, `out/`
  - `.next/`, `.turbo/`

### 10.2 보안

- `contextIsolation` 유지, preload 경유 API만 노출
- `workspace:readFile`는 `rootPath` 경계 검증으로 workspace 외부 경로 접근을 차단한다.
- Markdown HTML sanitize 적용
- 로컬 이미지 접근은 workspace 내부 경로로 제한

### 10.3 신뢰성

- F01에서 워크스페이스 다이얼로그 취소/오류 시 렌더러가 크래시하지 않고 텍스트 배너로 피드백한다.
- 취소/오류 발생 시 기존 `rootPath`를 유지한다.
- F02에서 인덱싱 실패/권한 오류 시 배너로 오류를 노출하고 앱 상태를 유지한다.
- F03에서 파일 읽기 실패 시 center 패널에 오류를 표시하고 앱 상태를 유지한다.
- F03에서 2MB 초과/바이너리 파일은 preview unavailable 상태로 안전하게 처리한다.
- F03.5에서 워크스페이스 전환/중복 재오픈/닫기 시 세션 정합성(`workspaceOrder`, `activeWorkspaceId`)을 유지한다.
- F04에서 `.md` 선택 시 center(raw)+right(rendered)가 동시에 표시되고 `activeSpec`가 워크스페이스별로 분리 복원된다.
- F04.1에서 rendered markdown 링크 클릭 시 renderer 이동/리로드를 차단하고, same-workspace 링크는 파일을 열며 external/unresolved 링크는 copy popover로 처리한다.
- F05에서 `path#Lx`/`path#Lx-Ly` 링크 클릭 시 active workspace 기준으로 파일 열기 + 라인 선택/하이라이트 + best-effort 점프 스크롤이 동작한다.
- 토스트 배너 전환은 후속 Feature backlog로 유지한다.

---

## 11. 개발 환경 및 의존성

### 11.1 현재 의존성 (코드 기준)

- Runtime: `react`, `react-dom`, `prismjs`, `react-markdown`, `remark-gfm`, `rehype-slug`
- Dev/Build/Test: `electron`, `vite`, `vite-plugin-electron`, `typescript`, `eslint`, `electron-builder`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`

### 11.2 MVP 구현 시 추가 검토 의존성

- 코드 뷰어 고도화(후속): Prism 확장 유지 vs `monaco-editor`/`codemirror` 전환 검토
- Markdown 보안 보강(후속): `rehype-sanitize` 검토
- 파일 워처: Node native watcher 또는 `chokidar`

### 11.3 멀티 워크스페이스 공통 규칙 (F04~F07 적용)

1. F04~F07 기능은 기본적으로 `activeWorkspaceId` 기준으로만 동작한다.
2. 활성 워크스페이스가 없으면 기능을 실행하지 않고 UI를 disabled 상태로 표시한다.
3. 워크스페이스 간 자동 fallback(다른 워크스페이스에서 경로 탐색)은 MVP 범위에서 허용하지 않는다.
4. 워크스페이스 전환 시 공유되면 안 되는 상태(예: line selection)는 리셋하고, 세션 상태(예: 파일 트리 펼침/active 문서)는 워크스페이스별로 유지한다.
5. 후속 기능 테스트는 단일 워크스페이스 시나리오 + 다중 워크스페이스 전환 회귀 시나리오를 모두 포함한다.

결정 고정(2026-02-20):
- F04: 워크스페이스 전환 시 `activeSpec`만 복원한다.
- F04.1: same-workspace 상대 링크는 파일을 열고, external/unresolved 링크는 copy popover로 처리한다(자동 브라우저 이동 없음).
- F05: `#Lx`/`#Lx-Ly` 라인 점프/하이라이트는 active workspace 범위에서만 처리한다.
- F07: watcher는 `openWorkspace` 시점에 즉시 시작한다.
- F06/F08: 액션 가드는 기능별 개별 구현을 기본으로 한다(공통 guard layer는 보류).

---

## 12. 우선순위 기반 Feature Queue (Feature-draft 입력용)

### 12.1 분할 기준

- Feature 1개 = `feature-draft` 1회에서 스펙 패치 + 구현 계획을 만들 수 있는 범위
- 목표 크기:
  - `S`: 반나절 ~ 1일
  - `M`: 1 ~ 2일
- 원칙:
  - 한 Feature는 한 번에 검증 가능한 단일 사용자 가치 흐름을 가져야 함
  - 서로 강결합된 하위 작업은 같은 Feature로 묶고, 독립 검증 가능한 항목은 분리

### 12.2 Priority Queue

#### F01. 워크스페이스 부트스트랩 (P0, 크기 S)

- 포함:
  - 워크스페이스 열기 액션(다이얼로그) + `rootPath` 상태 반영
  - Renderer 전역 상태 골격(`WorkspaceProvider`) 도입
  - `workspace:openDialog` IPC 계약 구현 + preload wrapper 노출
  - 취소/오류 텍스트 배너 처리 및 축약 경로 표시
  - 최소 자동 테스트(Vitest/RTL) + 수동 스모크 검증
- 제외:
  - 파일 인덱싱/트리 렌더링
  - watcher
  - 토스트 배너 컴포넌트 전환
- 완료 기준:
  - 워크스페이스 선택 후 루트 경로가 UI 상태에 반영됨
  - 취소/오류 시 기존 경로 유지 + 배너 피드백 제공
- 예상 변경 파일:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/electron-env.d.ts`
  - `src/App.tsx`
  - `src/main.tsx`
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/use-workspace.ts`
  - `src/workspace/path-format.ts`
  - `src/App.test.tsx`
  - `vitest.config.ts`
  - `src/test/setup.ts`
- 상태: `✅ Done (2026-02-20)`

#### F02. 파일 인덱싱 + 좌측 파일 트리 (P0, 크기 M)

- 포함:
  - 파일 메타데이터 재귀 인덱싱(기본 ignore 포함)
  - 좌측 FileTreePanel 렌더링(디렉터리 기본 접힘/토글)
  - active file 하이라이트 기본 동작
  - 초기 렌더 cap(500) 적용
- 제외:
  - changed indicator
  - 코드/마크다운 렌더 품질 고도화
- 완료 기준:
  - 트리에서 파일 클릭 이벤트가 발생하고 active file이 바뀜
- 예상 변경 파일:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/electron-env.d.ts`
  - `src/App.tsx`
  - `src/App.css`
  - `src/workspace/workspace-context.tsx`
  - `src/file-tree/file-tree-panel.tsx`
  - `src/App.test.tsx`
- 상태: `✅ Done (2026-02-20)`

#### F03. 코드 뷰어 기본 흐름 (P0, 크기 M)

- 포함:
  - 파일 본문 on-demand 로딩(`workspace:readFile`)
  - Center 패널 코드/텍스트 표시 + 읽기 실패/preview unavailable 상태 처리
  - 선택 라인 범위 상태 추적(복사용 기초)
- 제외:
  - 스펙 링크 점프
  - VS Code급 상세 syntax highlighting
- 완료 기준:
  - 파일 클릭 시 center 패널에 내용 표시
  - 라인 선택 범위가 상태에 저장됨
  - 2MB 초과/바이너리 파일에서 preview unavailable이 표시됨
- 예상 변경 파일:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/electron-env.d.ts`
  - `src/App.tsx`
  - `src/*` (CodeViewerPanel, selection state)
  - `src/code-viewer/line-selection.ts`
  - `src/code-viewer/line-selection.test.ts`
  - `src/App.test.tsx`
- 상태: `✅ Done (2026-02-20)`

#### F03.1. 코드 뷰어 확장자 색상 코딩 (P1, 크기 S)

- 포함:
  - Prism 기반 토큰 하이라이팅 어댑터 도입
  - 확장자 매핑(`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`, `.py`)
  - 미지원 확장자 `plaintext` fallback
  - 기본 토큰 컬러 스타일 적용
- 제외:
  - VS Code급 semantic highlighting
  - 언어별 세부 설정 UI/테마 커스터마이징
- 완료 기준:
  - `.py` 포함 주요 확장자에서 `data-highlight-language`와 컬러 토큰이 적용됨
  - 미지원 확장자는 `plaintext`로 안전하게 렌더됨
- 예상 변경 파일:
  - `package.json`
  - `src/App.css`
  - `src/code-viewer/language-map.ts`
  - `src/code-viewer/syntax-highlight.ts`
  - `src/code-viewer/code-viewer-panel.tsx`
  - `src/code-viewer/language-map.test.ts`
  - `src/code-viewer/code-viewer-panel.test.tsx`
  - `src/App.test.tsx`
- 상태: `✅ Done (2026-02-20)`

#### F03.5. 멀티 워크스페이스 기반 + 전환 지원 (P0, 크기 M)

- 포함:
  - 멀티 워크스페이스 상태 모델(`activeWorkspaceId`, `workspaceOrder`, `workspacesById`) 도입
  - `Open Workspace`를 항상 추가 동작으로 고정
  - 중복 경로 재오픈 시 기존 워크스페이스 포커스
  - 활성 워크스페이스 전환 UI(드롭다운) 제공
  - 워크스페이스 닫기/제거 UX 제공
  - 파일 트리 폴더 펼침 상태의 워크스페이스별 복원
  - 전환 시 `selectionRange` 리셋 규칙 적용
- 제외:
  - 세션 영속화(앱 재시작 복원)
  - 워크스페이스별 watcher 수명주기(F07 연계)
- 완료 기준:
  - 2개 이상 워크스페이스를 추가/전환 가능
  - 중복 경로 재오픈 시 중복 생성 없이 기존 항목이 활성화됨
  - 워크스페이스 제거 후 활성 워크스페이스가 올바르게 재선정됨
  - 워크스페이스별 파일/콘텐츠/파일트리 펼침 상태는 유지되고 전환 시 selection만 리셋됨
- 예상 변경 파일:
  - `src/workspace/workspace-model.ts` (신규)
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/use-workspace.ts`
  - `src/workspace/workspace-switcher.tsx` (신규)
  - `src/file-tree/file-tree-panel.tsx`
  - `src/workspace/path-format.ts`
  - `src/App.tsx`
  - `src/App.css`
  - `src/App.test.tsx`
  - `src/workspace/workspace-model.test.ts` (신규)
- 상태: `✅ Done (2026-02-20)`

#### F04. Markdown 듀얼 뷰 (raw + rendered) (P0, 크기 M)

- 포함:
  - `.md` 선택 시 center(raw) + right(rendered) 동시 표시
  - GFM 렌더 + 기본 TOC 표시
  - `activeSpec`를 워크스페이스별 세션 상태로 분리
- 제외:
  - TOC/스크롤/activeHeading의 워크스페이스별 복원
  - 섹션 active tracking 정밀화
  - 링크 인터셉트
  - 워크스페이스 간 문서 상태 공유
- 완료 기준:
  - `.md` 파일 선택 시 우측 렌더 패널이 정상 출력됨
  - A/B 워크스페이스를 전환해도 각 워크스페이스의 `activeSpec` 상태가 섞이지 않음
- 예상 변경 파일:
  - `src/App.tsx`
  - `src/workspace/workspace-context.tsx`
  - `src/*` (SpecViewerPanel, markdown util)
  - `package.json` (markdown 관련 deps)
- 상태: `✅ Done (2026-02-20)`

#### F04.1. Markdown 링크 안전 인터셉트 + Copy Popover (P0, 크기 S)

- 포함:
  - rendered markdown 링크 클릭 시 기본 네비게이션 차단(`preventDefault`)
  - same document anchor(`#...`)는 기본 스크롤 유지
  - same-workspace 상대 링크는 active workspace 기준 파일 열기
  - external/unresolved 링크는 커서 기준 copy popover 표시
  - `Copy Link Address` 동작 + popover dismiss(외부 클릭/ESC)
- 제외:
  - `#Lx`, `#Lx-Ly` 파싱/라인 하이라이트
  - cross-workspace 자동 탐색/자동 전환
  - external 링크 시스템 브라우저 자동 열기
- 완료 기준:
  - markdown 링크 클릭 시 renderer 페이지 이동/리로드가 발생하지 않음
  - same-workspace 상대 링크 클릭 시 해당 파일이 열림
  - external/unresolved 링크 클릭 시 copy popover가 표시됨
- 예상 변경 파일:
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/spec-viewer/spec-link-utils.ts`
  - `src/spec-viewer/spec-link-popover.tsx`
  - `src/App.tsx`
  - `src/App.css`
  - `src/spec-viewer/spec-link-utils.test.ts`
  - `src/spec-viewer/spec-viewer-panel.test.tsx`
  - `src/App.test.tsx`
- 상태: `✅ Done (2026-02-20)`

#### F05. Spec -> Code 링크 점프 (P0, 크기 M)

- 포함:
  - `path`, `#Lx`, `#Lx-Ly` 파싱
  - 링크 클릭 시 활성 워크스페이스 기준 라인 점프 + 하이라이트
  - F04.1에서 도입된 링크 인터셉트와 통합된 라인 점프 동작
- 제외:
  - 지원 포맷 외 특수 링크 확장
  - 다른 워크스페이스 자동 검색/점프
- 완료 기준:
  - `path.ts#L10-L20` 클릭 시 해당 파일로 이동/강조됨
  - 같은 상대경로가 여러 워크스페이스에 있어도 활성 워크스페이스 기준으로 일관 동작
- 예상 변경 파일:
  - `src/spec-viewer/spec-link-utils.ts`
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/App.tsx`
  - `src/code-viewer/code-viewer-panel.tsx`
  - `src/spec-viewer/spec-link-utils.test.ts`
  - `src/spec-viewer/spec-viewer-panel.test.tsx`
  - `src/App.test.tsx`
  - `src/code-viewer/code-viewer-panel.test.tsx`
- 상태: `✅ Done (2026-02-20)`

#### F06. 툴바 복사 액션 2종 (Path/Selected Lines) (P0, 크기 S)

- 포함:
  - Copy Active File Path
  - Copy Selected Lines (`relative/path:Lx-Ly` 포맷)
  - 활성 워크스페이스가 없을 때 disabled/가드 처리
  - 가드는 기능별 개별 구현(공통 guard layer 미도입)
- 제외:
  - Copy Current Spec Section
  - Open in iTerm
- 완료 기준:
  - 두 버튼 모두 클립보드 결과 포맷이 요구사항과 일치
  - 워크스페이스 전환 후 복사 결과가 현재 활성 워크스페이스 기준으로 바뀜
- 예상 변경 파일:
  - `src/App.tsx`
  - `src/workspace/workspace-context.tsx`
  - `src/*` (Toolbar, clipboard util)
- 상태: `📋 Planned`

#### F07. 파일 watcher + changed indicator (P0, 크기 M)

- 포함:
  - 워크스페이스별 워처 시작/종료 라이프사이클(`openWorkspace` 즉시 시작, `closeWorkspace` 즉시 정리)
  - workspace 단위 debounce + `changedFiles` 관리
  - 트리 내 변경 표시(`●`)
- 제외:
  - diff 뷰
- 완료 기준:
  - 외부 편집 시 해당 파일에 변경 표시가 반영됨
  - 워크스페이스 전환 시 각 워크스페이스의 변경 표시가 분리되어 유지됨
  - 워크스페이스 제거 시 해당 watcher가 정리됨
- 예상 변경 파일:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/electron-env.d.ts`
  - `src/workspace/workspace-model.ts`
  - `src/*` (provider, FileTreePanel)
- 상태: `📋 Planned`

#### F08. Open Workspace in iTerm (P1, 크기 S)

- 포함:
  - 툴바 버튼 + macOS iTerm 실행 IPC
  - 실패 시 사용자 피드백
  - 액션 가드는 F06과 동일하게 기능별 개별 처리
- 제외:
  - Terminal.app fallback
- 완료 기준:
  - 버튼 클릭 시 iTerm이 워크스페이스 경로에서 열림
- 예상 변경 파일:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `src/*` (Toolbar, error/toast)
- 상태: `📋 Planned`

#### F09. Copy Current Spec Section (P1, 크기 M)

- 포함:
  - active heading 감지(best-effort)
  - heading~next heading 범위 markdown 추출/복사
- 제외:
  - AST 기반 고정밀 편집기 수준 추출
- 완료 기준:
  - 버튼 클릭 시 현재 섹션 전체가 markdown 포맷으로 복사됨
- 예상 변경 파일:
  - `src/*` (SpecViewerPanel, section extractor, Toolbar)
- 상태: `📋 Planned`

#### F10. 안정화 패스(보안/성능/테스트) (P2, 크기 M)

- 포함:
  - markdown sanitize/로컬 리소스 제약 점검
  - 인덱싱/렌더링 성능 보정
  - 핵심 단위/통합 테스트 추가
- 제외:
  - 신규 사용자 기능 추가
- 완료 기준:
  - 섹션 13 수용 기준의 회귀 테스트 커버 확보
- 예상 변경 파일:
  - `src/*`
  - `electron/*`
  - 테스트 파일 신규 경로
- 상태: `📋 Planned`

### 12.3 Feature-draft 실행 순서 (권장)

1. `F06` -> `F07` (`F01`, `F02`, `F03`, `F03.1`, `F03.5`, `F04`, `F04.1`, `F05` 완료)
2. MVP 필수 기능 완료 후 `F08`, `F09` 진행
3. 마지막에 `F10`으로 안정화

실행 규칙:

1. 각 턴에서 Feature ID 하나만 선택해 `feature-draft` 수행
2. 스코프 확대 요청이 생기면 현재 Feature 완료 후 다음 ID로 이월
3. 각 Feature 완료 시 본 섹션 상태를 `📋 Planned -> ✅ Done`으로 갱신

---

## 13. 테스트 및 수용 기준

### 13.1 수용 기준

- [x] workspaceRoot 선택 가능 (F01 완료, 2026-02-20)
- [x] file tree에서 파일 선택/active 표시 가능 (F02 완료, 2026-02-20)
- [x] file tree에서 파일 열기 가능 (F03 완료, 2026-02-20)
- [x] 코드 뷰어 라인 선택 범위 추적 가능 (F03 완료, 2026-02-20)
- [x] 주요 확장자(`.py` 포함) 색상 코딩 + `plaintext` fallback (F03.1 완료, 2026-02-20)
- [x] 멀티 워크스페이스 추가/전환/제거 가능 (`Open Workspace`=항상 추가, 중복 경로=기존 포커스, 전환 시 selection 리셋, 트리 펼침 상태 복원) (F03.5 완료, 2026-02-20)
- [x] `.md` 파일 선택 시 center(raw) + right(rendered) 동작 (F04 완료, 2026-02-20)
- [x] rendered markdown 링크 클릭 시 same-workspace 파일 열기 + external/unresolved copy popover 동작 (F04.1 완료, 2026-02-20)
- [x] `path.ts#L10-L20` 클릭 시 점프 및 하이라이트 (F05 완료, 2026-02-20)
- [ ] 툴바 액션 4종 정상 동작
- [ ] 외부 파일 변경이 changed indicator에 반영

### 13.2 테스트 우선순위

1. 링크 파싱/라인 변환 로직 단위 테스트
2. 파일 트리/상태 전이 통합 테스트
3. 주요 IPC 계약 스모크 테스트
4. F04~F07 공통 멀티 워크스페이스 회귀 테스트

현재 검증 결과(F01/F02/F03/F03.1/F03.5/F04/F04.1/F05):

- 자동 테스트: 총 53건 통과(`npm test`)
  - `src/App.test.tsx` 16건
  - `src/workspace/workspace-model.test.ts` 6건
  - `src/code-viewer/line-selection.test.ts` 5건
  - `src/code-viewer/language-map.test.ts` 2건
  - `src/code-viewer/code-viewer-panel.test.tsx` 3건
  - `src/spec-viewer/markdown-utils.test.ts` 2건
  - `src/spec-viewer/spec-link-utils.test.ts` 11건
  - `src/spec-viewer/spec-viewer-panel.test.tsx` 8건
- 품질 게이트: `npm run lint`, `npm run build` 통과
- 수동 스모크: Electron 앱 기준 완료(F01/F02/F03/F03.1/F03.5/F04/F04.1/F05, 2026-02-20)

---

## 14. 리스크 및 미확정 사항

1. F04는 `activeSpec`만 복원하도록 고정했기 때문에 TOC/스크롤/activeHeading 복원이 필요해지면 후속 확장 비용이 발생한다.
2. F04.1은 external/unresolved 링크를 popover 복사 UX로만 처리하므로, 시스템 브라우저 열기/보조 탐색 UX는 후속 Feature로 남는다.
3. 파일 링크의 non-line hash(`path.md#heading`)는 현재 파일 열기만 수행하고 heading 위치 스크롤은 미지원(F09 범위)이다.
4. F07 watcher를 워크스페이스별로 운영할 때 시스템 리소스 상한(동시 watcher 수, debounce 전략) 튜닝이 필요하다.
5. `system:openInIterm` 실패 시 fallback(Terminal.app) 정책이 확정되지 않았다.

---

## 15. Open Questions (F04~F07 선결)

- 현재 없음 (2026-02-20 결정 반영 완료)

---

## 16. 결론

이 문서는 F01/F02/F03/F03.1/F03.5/F04/F04.1/F05 구현 결과를 반영한 스펙이며, 멀티 워크스페이스 기준 정책 위에서 F06+를 진행할 수 있는 기준선을 고정했다. 다음 단계는 섹션 12 순서대로 F06/F07을 구현하고 툴바/changed indicator를 완성하는 것이다.
