# SDD Workbench 기본 스펙 (MVP Baseline)

## 메타데이터

- 문서 버전: `0.18.0`
- 마지막 업데이트: `2026-02-21`
- 문서 상태: `Draft`
- 기준 입력:
  - 사용자 요구사항: `/_sdd/spec/user_spec.md`
  - UI 스케치: `/_sdd/spec/ui_sketch.png`
  - 코드베이스: Electron + React + F01/F02/F03/F03.1/F03.5/F04/F04.1/F05/F06/F06.1/F06.2/F07/F07.1/F08/F09/F10.1/F10/F10.2(워크스페이스 부트스트랩 + 파일 트리 + 코드 뷰어 + 확장자 색상 코딩 + 멀티 워크스페이스 + Markdown 듀얼 뷰 + 링크 인터셉트/copy popover + spec->code 라인 점프 + 우클릭 복사/드래그 선택 통합 + watcher 기반 changed indicator + workspace file history navigation 입력 바인딩 확장 + Open In(iTerm/VSCode) 액션 + 앱 재시작 세션 복원/라인 기준 위치 복원 + activeSpec 복원 + rendered markdown 선택 우클릭 `Go to Source` + markdown sanitize/리소스 경계 + 인덱싱 cap/truncation 배너 + 코드 하이라이트 메모이제이션 + 코드 뷰어 이미지 프리뷰 + 복원 stale 인덱스 보정 + watcher 종료 지연 완화) 구현 상태

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
- 워크스페이스별 파일 히스토리 네비게이션(`Back`/`Forward`)
- 앱 재시작 시 워크스페이스/active file/active spec/라인 기준 위치 복원(F09 Done)
- 파일 트리 탐색
- 코드 읽기 뷰어(읽기 중심)
- Markdown 렌더링 뷰어
- 스펙 링크 기반 코드 점프
- rendered markdown 선택 우클릭 기반 source line 점프(`Go to Source`)
- 컨텍스트 액션(코드/트리 우클릭 복사 + 워크스페이스/스펙 액션)
- 파일 변경 표시(changed indicator)

### 2.2 MVP 제외 범위 (Non-Goals)

- IDE급 편집 기능(멀티탭, LSP, 리팩터링, 프로젝트 검색)
- 내장 터미널/PTY
- 플러그인 시스템
- Git diff/commit UI

---

## 3. 현재 구현 상태 (As-Is)

### 3.1 코드베이스 인벤토리

| 파일 | 역할 | 상태 |
|---|---|---|
| `src/App.tsx` | `Open Workspace` + workspace switcher + 좌측 파일 트리 + center 코드 뷰어 + 우측 rendered spec 패널 통합(`activeSpec` 기반 유지) + same-workspace spec 링크 파일 열기/라인 점프 wiring + 코드/트리 컨텍스트 복사 오케스트레이션 + F07 changed indicator wiring + F07.1 history navigation(`Back`/`Forward`, mouse back/forward, swipe IPC, wheel fallback) + 좌측 `Open In:`(iTerm/VSCode) 액션 + 복원 라인 점프 연동 + rendered markdown 선택 우클릭 source 점프 wiring(`Go to Source`) + spec viewer workspace root 전달(F10 보안 경계) + 코드 뷰어 이미지 프리뷰 상태 연동(F10.2) | Implemented (F01/F02/F03/F03.5/F04/F04.1/F05/F06/F06.1/F06.2/F07/F07.1/F08/F09/F10.1/F10/F10.2) |
| `src/main.tsx` | `WorkspaceProvider` 마운트 포함 React 진입점 | Implemented (F01) |
| `src/workspace/workspace-context.tsx` | 멀티 워크스페이스 상태(`workspacesById`/`workspaceOrder`/`activeWorkspaceId`) + 인덱싱/읽기/선택/`activeSpec` 본문 상태(`activeSpecContent`/`isReadingSpec`/`activeSpecReadError`) + `activeFileImagePreview` 상태 + watcher lifecycle(`watchStart`/`watchStop`) + `changedFiles` 라우팅/active file auto-refresh + F07.1 파일 히스토리 액션(`canGoBack`/`canGoForward`/`goBackInHistory`/`goForwardInHistory`) + F09 snapshot hydrate/persist/부분 실패 continue + `activeSpec`/이미지 active file 복원 + stale 인덱스 복원 continue 보정 + 배너 상태 관리 + F10 인덱싱 truncation 피드백 | Implemented (F01/F02/F03/F03.5/F04/F07/F07.1/F09/F10/F10.2) |
| `src/workspace/use-workspace.ts` | Workspace Context 전용 hook | Implemented (F01) |
| `src/workspace/workspace-model.ts` | 멀티 워크스페이스 순수 상태 전이 모델(add/focus/close/update) + spec 본문 세션 상태 필드 + `activeFileImagePreview` 세션 상태 + `changedFiles` 정의 + F07.1 파일 히스토리 스택/포인터 전이 + F09 파일별 마지막 라인 맵(`fileLastLineByPath`) 및 selection 정규화 | Implemented (F03.5/F04/F07/F07.1/F09/F10.2) |
| `src/workspace/workspace-persistence.ts` | F09 세션 snapshot 스키마/검증/localStorage read-write-clear 유틸(`schemaVersion`, `activeWorkspaceId`, `workspaceOrder`, workspace별 `activeFile`/`activeSpec`/`expandedDirectories`/`fileLastLineByPath`) | Implemented (F09) |
| `src/workspace/workspace-switcher.tsx` | 활성 워크스페이스 선택 + 닫기/제거 UI | Implemented (F03.5) |
| `src/workspace/path-format.ts` | UI 표시용 경로 축약 유틸(`~`) | Implemented (F01) |
| `src/file-tree/file-tree-panel.tsx` | 디렉터리 토글형 파일 트리 패널 + 렌더 cap(500) + 워크스페이스별 펼침 상태 연동 + 파일/디렉터리 우클릭 경로 복사 + changed marker(`●`) 렌더 | Implemented (F02/F03.5/F06.1/F06.2/F07) |
| `src/code-viewer/code-viewer-panel.tsx` | 라인 단위 코드 프리뷰 + 선택 범위(Shift+Click/드래그) + 텍스트/이미지/preview-unavailable 3-way 표시 + language 라벨 + spec 링크 점프 스크롤 + 우클릭 복사 액션(`Copy Selected Content`/`Copy Both`/`Copy Relative Path`) + 하이라이트 결과 메모이제이션 | Implemented (F03/F03.1/F05/F06.1/F06.2/F10/F10.2) |
| `src/code-viewer/line-selection.ts` | 1-based 라인 선택/Shift 확장 유틸 | Implemented (F03) |
| `src/code-viewer/language-map.ts` | 확장자 -> 하이라이트 언어 매핑(`.py` 포함) | Implemented (F03.1) |
| `src/code-viewer/syntax-highlight.ts` | Prism 기반 라인 하이라이트 어댑터 + plaintext escape fallback + 배치 하이라이트 헬퍼(`highlightPreviewLines`) | Implemented (F03.1/F10) |
| `src/spec-viewer/markdown-utils.ts` | markdown heading 추출 + TOC id 생성 유틸 | Implemented (F04) |
| `src/spec-viewer/spec-viewer-panel.tsx` | rendered spec 패널 + TOC + markdown sanitize + 로컬 리소스/URI 경계 + 차단 리소스 placeholder + markdown 링크 인터셉트 + lineRange 전달 + 링크 popover 연동 + 선택 우클릭 `Go to Source`(source line best-effort 해석) | Implemented (F04/F04.1/F05/F10.1/F10) |
| `src/spec-viewer/markdown-security.ts` | sanitize schema/URI 정책 + 로컬 리소스 허용/차단(`data:image/*` 제한 허용 포함) 유틸 | Implemented (F10) |
| `src/spec-viewer/spec-link-utils.ts` | spec 링크 분류(anchor/workspace-file/external/unresolved) + activeSpec 기준 경로 해석 + `#Lx/#Lx-Ly` 파싱 | Implemented (F04.1/F05) |
| `src/spec-viewer/spec-link-popover.tsx` | 커서 기준 링크 액션 popover(`Copy Link Address`, `Close`) | Implemented (F04.1) |
| `src/spec-viewer/spec-source-popover.tsx` | 커서 기준 source 액션 popover(`Go to Source`, `Close`) | Implemented (F10.1) |
| `src/spec-viewer/source-line-resolver.ts` | rendered markdown 블록 `data-source-line` + selection(anchor/focus) 기반 source line 해석 유틸 | Implemented (F10.1) |
| `src/context-copy/copy-payload.ts` | 컨텍스트 복사 재사용 payload 유틸(`relative/path`, `relative/path:Lx-Ly`, selected content) | Implemented (F06/F06.1/F06.2) |
| `src/context-menu/copy-action-popover.tsx` | 코드/트리 우클릭 복사 액션 popover 공통 컴포넌트 | Implemented (F06.1) |
| `src/App.css` | 3패널 레이아웃 + 파일 트리/코드 뷰어/spec 패널 + 워크스페이스 switcher + spec 링크/컨텍스트/source popover 스타일 + 토큰 컬러 스타일 + file-tree changed marker 스타일 + F07.1 헤더 `Back`/`Forward` 액션 배치 + F08 `Open In:` 아이콘 버튼 스타일 + F10 차단 리소스 placeholder 스타일 + F10.2 코드 뷰어 이미지 프리뷰 스타일 | Implemented (F02/F03/F03.1/F03.5/F04/F04.1/F06.1/F06.2/F07/F07.1/F08/F10.1/F10/F10.2) |
| `src/App.test.tsx` | F01~F10.2 통합 플로우 테스트(46건, multi-workspace/spec/watcher/history-navigation/open-in + 세션 복원/부분 실패 continue/activeSpec 복원 + rendered selection `Go to Source` + 인덱싱 truncation 배너 + 이미지 프리뷰/blocked_resource/복원 stale 보정 회귀 포함) | Implemented (F01/F02/F03/F03.1/F03.5/F04/F04.1/F05/F06/F06.1/F06.2/F07/F07.1/F08/F09/F10.1/F10/F10.2) |
| `src/workspace/workspace-model.test.ts` | 멀티 워크스페이스 정책 테스트(15건, `changedFiles` + file history 전이 분리 + F09 라인 맵/selection 정규화 + `activeFileImagePreview` 초기화 검증 포함) | Implemented (F03.5/F04/F07/F07.1/F09/F10.2) |
| `src/workspace/workspace-persistence.test.ts` | snapshot 스키마 검증/파싱 실패 fallback/엔트리 cap/`activeSpec` 포함 roundtrip 테스트(6건) | Implemented (F09) |
| `src/code-viewer/line-selection.test.ts` | 선택 범위 정규화/Shift 확장 테스트(5건) | Implemented (F03) |
| `src/code-viewer/language-map.test.ts` | 확장자 매핑/ fallback 테스트(2건) | Implemented (F03.1) |
| `src/code-viewer/code-viewer-panel.test.tsx` | `.py` 하이라이트 + plaintext fallback + jump 스크롤 + 드래그 선택/우클릭 3액션 + 하이라이트 메모이제이션 + 이미지 모드/blocked_resource 회귀 테스트(9건) | Implemented (F03.1/F05/F06.1/F06.2/F10/F10.2) |
| `src/spec-viewer/markdown-utils.test.ts` | markdown heading/TOC 유틸 테스트(2건) | Implemented (F04) |
| `src/spec-viewer/spec-link-utils.test.ts` | 링크 해석/경계/외부 URL 분류 + lineRange 파싱 테스트(11건) | Implemented (F04.1/F05) |
| `src/spec-viewer/spec-viewer-panel.test.tsx` | rendered panel 상태/링크 인터셉트/popover + lineRange 전달 + 선택 우클릭 `Go to Source` + sanitize/리소스 차단 테스트(12건) | Implemented (F04/F04.1/F05/F10.1/F10) |
| `src/spec-viewer/markdown-security.test.ts` | sanitize 스키마/URI 정책/리소스 허용-차단(`data:image/*` 제한 허용) 테스트(6건) | Implemented (F10) |
| `src/spec-viewer/source-line-resolver.test.ts` | target/selection fallback/정규화 기반 source line 해석 테스트(5건) | Implemented (F10.1) |
| `src/context-copy/copy-payload.test.ts` | 복사 payload 포맷/경계값/정규화 테스트(8건) | Implemented (F06/F06.1/F06.2) |
| `src/context-menu/copy-action-popover.test.tsx` | copy action popover dismiss/액션 테스트(3건) | Implemented (F06.1) |
| `src/file-tree/file-tree-panel.test.tsx` | 파일/디렉터리 우클릭 복사 + 토글 + changed marker + 루트 파일 노출 회귀 테스트(3건) | Implemented (F02/F06.1/F06.2/F07) |
| `src/test/setup.ts` | RTL matcher setup (`jest-dom`) | Implemented (F01) |
| `electron/main.ts` | BrowserWindow 부팅 + `workspace:openDialog`/`workspace:index`/`workspace:readFile` + watcher IPC(`workspace:watchStart`/`workspace:watchStop`/`workspace:watchEvent`) + history navigate 이벤트 브릿지(`app-command`/`swipe` -> `workspace:historyNavigate`) + system open IPC(`system:openInIterm`/`system:openInVsCode`) + watcher registry/debounce/cleanup + 인덱싱 cap(10,000)/`truncated` 신호 반환 + `readFile.imagePreview`/`blocked_resource` 정책 + watcher 종료 single-flight/종료 지연 완화 | Implemented (F01/F02/F03/F07/F07.1/F08/F10/F10.2) |
| `electron/preload.ts` | `window.workspace.openDialog()`/`index()`/`readFile()` + watcher bridge(`watchStart`/`watchStop`/`onWatchEvent`) + history navigate 구독(`onHistoryNavigate`) + system open invoke(`openInIterm`/`openInVsCode`) API 노출 + `workspace:index` `truncated` 타입 브리지 + `readFile.imagePreview`/`blocked_resource` 타입 브리지 | Implemented (F01/F02/F03/F07/F07.1/F08/F10/F10.2) |
| `electron/electron-env.d.ts` | Renderer 전역 workspace 타입 계약(openDialog/index/readFile + watcher API/event payload + history navigation event payload + system open result/API + `workspace:index.truncated` + `readFile.imagePreview`/`blocked_resource`) | Implemented (F01/F02/F03/F07/F07.1/F08/F10/F10.2) |
| `vitest.config.ts` | `jsdom` 기반 테스트 환경 설정 | Implemented (F01) |
| `vite.config.ts` | Vite + Electron 빌드 설정 | Implemented |
| `package.json` | dev/build/test 스크립트 + Prism 하이라이트 + markdown 렌더 의존성(`rehype-sanitize` 포함) + watcher 의존성(`chokidar`) 포함 | Implemented |
| `/_sdd/spec/user_spec.md` | 기능 요구사항 원문 | Implemented (문서) |

### 3.2 기능 요구사항 커버리지 매트릭스

| 요구사항 | 상태 | 근거 |
|---|---|---|
| 4.1 Workspace Management | Implemented (MVP) | 멀티 워크스페이스 추가/중복 포커스/전환/제거 + 워크스페이스별 트리 펼침 복원 + 전환 시 selection 리셋 + 워크스페이스별 파일 히스토리(`Back`/`Forward`) + 앱 재시작 세션 복원(workspaces/active workspace/active file/active spec/line resume, 부분 실패 continue) 구현(F03.5/F07.1/F09) |
| 4.2 File Browser | Implemented (MVP) | 좌측 트리/active 하이라이트/디렉터리 토글 + center 코드 뷰어 연계 + 파일/디렉터리 우클릭 상대경로 복사(F02/F03.5/F06.1/F06.2) + changed indicator(`●`) 반영(F07) + 파일 떠날 때 marker clear 정책 적용(F07 follow-up) |
| 4.3 Code Viewer | Implemented (Core) | 코드 프리뷰/라인 선택(Shift+Click + drag)/preview-unavailable/확장자 색상 코딩(F03/F03.1) + spec 링크 점프 스크롤(F05) + 우클릭 복사 3액션(`Copy Selected Content`/`Copy Both`/`Copy Relative Path`) 구현(F06.1/F06.2) + 이미지 파일 미리보기 모드(F10.2) |
| 4.4 Spec Viewer | Implemented (Core) | `.md` dual view(center raw + right rendered) + TOC + workspace별 `activeSpec` 복원 + 코드 파일 선택 시 우측 spec 유지(F04) + rendered markdown 선택 우클릭 `Go to Source` 액션(F10.1) + sanitize/로컬 리소스 경계/차단 placeholder(F10) 구현 |
| 4.5 Spec -> Code Navigation | Implemented (Core) | rendered markdown 링크 인터셉트 + same-workspace 파일 열기 + external/unresolved copy popover(F04.1) + `#Lx/#Lx-Ly` 라인 점프/하이라이트(F05) + rendered selection source line 점프(F10.1) + 안전 URI 정책(F10) 구현 |
| 4.6 Context Toolbar/Actions | Implemented (MVP) | F06 툴바 복사 2종은 F06.2에서 제거 완료, 코드/트리 컨텍스트 복사(F06.1/F06.2) + workspace open-in 액션(F08) + rendered spec selection source 액션(F10.1) 구현 |
| 4.7 File Change Detection | Implemented (Core) | workspace watcher lifecycle(open/start, close/stop), debounce된 changed event 라우팅, 파일 트리 marker 표시, active file auto-refresh(F07) 구현 |
| Electron 앱 부팅/윈도우 표시 | Implemented | `electron/main.ts` |
| Renderer <-> Main 브리지 기본 틀 | Implemented (MVP 범위) | `openDialog()`/`index()`/`readFile()` + `watchStart()`/`watchStop()`/`onWatchEvent()` + `onHistoryNavigate()` + system 채널(`openInIterm`, `openInVsCode`) + `workspace:index.truncated` 브리지 구현 |

요약: F01/F02/F03/F03.1/F03.5/F04/F04.1/F05/F06/F06.1/F06.2/F07/F07.1/F08/F09/F10.1/F10/F10.2는 완료되었다. 멀티 워크스페이스 기능은 `active workspace` 기준 동작을 기본 정책으로 한다.

---

## 4. 목표 UX/레이아웃 (To-Be)

`ui_sketch.png`와 `user_spec.md`를 기준으로 다음 구조를 목표로 한다.

```text
┌──────────────────────────────────────────────────────────────────┐
│ Top Action Row: Back/Forward | Workspace Switcher | Close/Open Workspace      │
├──────────────────┬─────────────────────────┬─────────────────────┤
│ File Browser     │ Code Viewer             │ Spec Viewer         │
│ (Left Panel)     │ (Center, Raw/Code)      │ (Right, Rendered)   │
│ + Workspace Actions: `Open In:` + [iTerm icon] [VSCode icon]      │
├──────────────────┴─────────────────────────┴─────────────────────┤
│ Context Menus: Code(F06.1/F06.2) | Tree(F06.1/F06.2) | Spec(F04.1/F10.1) │
├──────────────────────────────────────────────────────────────────┤
│ Optional Status Bar / Text Banner                                │
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
  ├─ OS 통합 (파일 다이얼로그, iTerm/VSCode 실행, 파일 워처)
  ├─ IPC Handler
  └─ Security Boundary (contextIsolation + preload)

Preload
  └─ 제한된 IPC API 노출

Renderer (React)
  ├─ WorkspaceProvider (전역 상태)
  ├─ Header Actions (workspace-level)
  ├─ Context Menus (code/tree/spec)
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
| Purpose | 멀티 워크스페이스 세션 관리 + 워크스페이스별 인덱싱/파일 본문/선택/변경상태(`changedFiles`) 관리 + watcher 이벤트 라우팅 + 배너 피드백 관리 |
| Input | `window.workspace.openDialog()`, `window.workspace.index(rootPath)`, `window.workspace.readFile(rootPath, relativePath)`, `window.workspace.watchStart(workspaceId, rootPath)`, `window.workspace.watchStop(workspaceId)`, `window.workspace.onWatchEvent(listener)` 결과 |
| Output | `workspaces`, `workspaceOrder`, `activeWorkspaceId`, `rootPath`, `fileTree`, `changedFiles`, `activeFile`, `activeFileContent`, `activeFileImagePreview`, `activeSpec`, `activeSpecContent`, `isIndexing`, `isReadingFile`, `isReadingSpec`, `readFileError`, `activeSpecReadError`, `previewUnavailableReason`, `selectionRange`, `expandedDirectories`, `bannerMessage`, `canGoBack`, `canGoForward`, `openWorkspace()`, `setActiveWorkspace()`, `closeWorkspace()`, `selectFile()`, `goBackInHistory()`, `goForwardInHistory()`, `setSelectionRange()`, `setExpandedDirectories()`, `clearBanner()` |
| Dependencies | `workspace:openDialog`, `workspace:index`, `workspace:readFile`, `workspace:watchStart`, `workspace:watchStop`, `workspace:watchEvent` IPC + preload 브리지 |
| 상태 | Implemented (F01/F02/F03/F03.5/F04/F07/F07.1/F09/F10.2) |

### 6.2 FileTreePanel

| 항목 | 내용 |
|---|---|
| Purpose | 좌측 파일 트리 표시 + 디렉터리 토글 탐색 + active file 표시 + 워크스페이스별 펼침 상태 연동 + 파일/디렉터리 우클릭 복사 액션 진입점 |
| Input | 파일 트리 모델, activeFile, isIndexing, expandedDirectories |
| Output | 파일 선택 이벤트, expandedDirectories 변경 이벤트, 파일/디렉터리 우클릭 복사 액션 이벤트 |
| Dependencies | WorkspaceProvider |
| 상태 | Implemented (F02/F03.5/F06.1/F06.2/F07) |

### 6.3 CodeViewerPanel

| 항목 | 내용 |
|---|---|
| Purpose | 코드 원문 프리뷰 표시, 라인 선택 범위 추적(Shift+Click + 드래그), preview unavailable 상태 표시, 확장자 기반 색상 코딩, 코드 라인 우클릭 복사 액션 진입점 |
| Input | activeFilePath, fileContent, activeFileImagePreview, isReadingFile, readFileError, previewUnavailableReason, selectionRange |
| Output | selectedLineRange, 코드 라인 우클릭 복사 액션 이벤트 |
| Dependencies | `line-selection` 유틸, Prism 기반 하이라이트 어댑터 |
| 상태 | Implemented (F03/F03.1/F05/F06.1/F06.2/F10.2) |

### 6.4 SpecViewerPanel

| 항목 | 내용 |
|---|---|
| Purpose | Markdown 렌더링, TOC 표시, markdown sanitize/리소스 경계 처리(동일 문서 anchor 허용 + same-workspace 파일 열기 + lineRange 전달 + external/unresolved copy popover + 차단 리소스 placeholder) + 선택 우클릭 기반 source 이동(`Go to Source`) |
| Input | `activeSpecPath`, `activeSpecContent`, `isReadingSpec`, `activeSpecReadError`, `onOpenRelativePath(relativePath, lineRange)`, `onGoToSourceLine(lineNumber)` |
| Output | TOC anchor 링크, `onOpenRelativePath(relativePath, lineRange)` 호출, link/source popover UI, `onGoToSourceLine(lineNumber)` 호출 |
| Dependencies | `react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-sanitize`, `markdown-security`, `spec-link-utils`, `spec-link-popover`, `spec-source-popover`, `source-line-resolver` |
| 상태 | Partial (F04/F04.1/F05/F10.1/F10 Implemented, activeHeading 추적은 후속 backlog) |

### 6.5 Workspace/Context Actions

| 항목 | 내용 |
|---|---|
| Purpose | 워크스페이스/스펙 액션 + 파일 히스토리 네비게이션(`Back`/`Forward`) + 코드/트리 컨텍스트 복사 액션 + rendered spec selection source 이동(`Go to Source`) 제공 (`Open in iTerm`/`Open in VSCode`는 좌측 `Current Workspace` 아래 `Open In:` 라벨 + 아이콘 버튼 형태로 배치됨) |
| Input | activeWorkspace, active file path, selected lines, active spec section |
| Output | iTerm/VSCode 실행 요청, 클립보드 복사 요청 |
| Dependencies | WorkspaceProvider, IPC/Clipboard API, 각 패널 컨텍스트 메뉴 |
| 상태 | Implemented (F07.1 `Back`/`Forward` + F06.1/F06.2 컨텍스트 복사 + F08 workspace open-in + F10.1 source jump action) |

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
  activeFileImagePreview: WorkspaceImagePreview | null // F10.2 구현
  activeSpec: string | null // F04 구현
  activeSpecContent: string | null // F04 구현 (우측 rendered spec 소스)
  isIndexing: boolean // F02 구현
  isReadingFile: boolean // F03 구현
  isReadingSpec: boolean // F04 구현
  readFileError: string | null // F03 구현
  activeSpecReadError: string | null // F04 구현
  previewUnavailableReason: 'file_too_large' | 'binary_file' | 'blocked_resource' | null // F03/F10.2 구현
  selectionRange: SelectionState // F03 구현
  fileLastLineByPath: Record<string, number> // F09 구현 (relativePath -> last line)
  expandedDirectories: string[] // F03.5 구현
  changedFiles: string[] // F07 구현 (내부 구현은 Set 권장)
  fileHistory: string[] // F07.1 구현
  fileHistoryIndex: number // F07.1 구현
}

type WorkspaceState = {
  activeWorkspaceId: string | null // F03.5 구현
  workspaceOrder: string[] // F03.5 구현 (최근 활성 순서 기반)
  workspacesById: Record<string, WorkspaceSession> // F03.5 구현
  bannerMessage: string | null
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
5. preview 불가(`previewUnavailableReason`) 시 본문 대신 사유(`file_too_large`/`binary_file`/`blocked_resource`)를 표시한다.
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

F04 기준 상태 전이 규칙(Implemented):

1. Markdown 파일 선택 시 `activeSpec`를 해당 경로로 갱신하고 `activeSpecContent`를 다시 로딩한다.
2. 코드/비-Markdown 파일 선택 시 `activeSpec`/`activeSpecContent`는 유지한다.
3. 우측 rendered spec 패널은 `activeSpec` 세션 상태를 기준으로 표시되며, center `activeFile` 종류와 독립적으로 유지된다.
4. Markdown 미리보기 로딩/오류는 `isReadingSpec`/`activeSpecReadError`로 별도 관리한다.

F06.1/F06.2 기준 상태/상호작용 규칙(Implemented):

1. CodeViewer에서 우클릭 지점이 기존 `selectionRange` 안이면 기존 선택 범위를 유지한다.
2. CodeViewer에서 우클릭 지점이 기존 `selectionRange` 밖이면 해당 라인 단일 선택으로 전환한다.
3. 컨텍스트 메뉴 경로 복사는 활성 워크스페이스 기준 `relative path` 포맷으로 고정한다.
4. CodeViewer는 `Shift+Click` 외에 드래그 기반 연속 선택을 지원한다.
5. CodeViewer 우클릭 복사 액션은 `Copy Selected Content`, `Copy Both`, `Copy Relative Path` 3개로 고정한다.
6. FileTree 우클릭 복사는 파일/디렉터리 모두에서 `Copy Relative Path`를 지원한다.

F07 기준 상태/상호작용 규칙(Implemented):

1. `openWorkspace`로 신규 워크스페이스가 추가되면 해당 workspace watcher를 즉시 시작한다.
2. `closeWorkspace` 또는 provider unmount 시 해당 watcher를 즉시 정리한다.
3. `workspace:watchEvent`는 `workspaceId` 기준으로 해당 세션의 `changedFiles`에만 합집합 반영한다.
4. watch 이벤트에 현재 active file이 포함되면 active file 본문을 자동으로 re-read한다.
5. changed marker는 파일을 여는 순간이 아니라, 같은 워크스페이스에서 다른 파일을 열어 이전 파일을 떠날 때 제거한다.
6. 워크스페이스 전환만으로는 changed marker를 제거하지 않는다.
7. `workspace:watchEvent.hasStructureChanges === true`이면 해당 워크스페이스 인덱스를 refresh 모드로 재요청한다.

F07.1 기준 상태/상호작용 규칙(Implemented):

1. 워크스페이스 세션별로 파일 히스토리(`fileHistory`)와 포인터(`fileHistoryIndex`)를 독립 관리한다.
2. 같은 파일을 연속으로 여는 경우 히스토리에 중복 push하지 않는다.
3. `goBackInHistory()`/`goForwardInHistory()`는 히스토리를 신규 push하지 않고 포인터만 이동한다(pointer-only).
4. 뒤로 이동 후 다른 파일을 열면 forward 구간을 truncate한다.
5. 히스토리 이동 입력 바인딩(헤더 버튼, mouse back/forward, `workspace:historyNavigate`, `wheel(deltaX)` fallback)은 모두 active workspace 범위에서 동일 액션을 호출한다.
6. 이동 불가능 상태(`canGoBack=false`, `canGoForward=false`)에서 입력 바인딩은 no-op으로 처리한다.

F09 기준 상태/복원 규칙(Implemented):

1. 앱 종료 전 워크스페이스 세션 snapshot(열린 workspace 목록, active workspace, workspace별 active file/active spec, 파일별 마지막 라인)을 localStorage에 저장한다.
2. 앱 시작 시 snapshot hydrate를 수행하고, 복원 가능한 workspace부터 순차 복원한다.
3. workspace별 파일 마지막 위치는 `relativePath -> lineNumber` 맵으로 관리하며 라인 값은 1 이상 정수로 정규화한다.
4. 저장된 라인이 현재 파일 길이를 초과하면 EOF 기준으로 clamp한다.
5. 복원 불가 workspace(경로 없음/권한 오류/인덱싱 실패)는 건너뛰고 나머지 복원은 계속한다.
6. 복원 중 부분 실패는 텍스트 배너로 알리고, 앱 전체 동작은 유지한다.
7. `activeSpec`가 `activeFile`과 다른 Markdown일 때도 spec 패널 상태를 별도 read로 복원한다.

F10.1 기준 상태/상호작용 규칙(Implemented):

1. rendered markdown에서 텍스트 selection 후 우클릭 시 source line이 해석 가능한 경우에만 `Go to Source` popover를 표시한다.
2. source line은 markdown 블록의 `data-source-line`(node position.start.line) 기준 best-effort로 계산한다.
3. `Go to Source` 실행 시 현재 `activeSpec` 파일을 center 코드 뷰어에서 단일 라인(`Lx-Lx`)으로 점프한다.
4. `activeSpec`가 없거나 경로 해석에 실패하면 앱은 깨지지 않고 no-op 또는 배너 피드백으로 처리한다.
5. link popover와 source popover는 상호 배타적으로 표시한다.

F10 기준 상태/상호작용 규칙(Implemented):

1. rendered markdown 렌더 파이프라인에는 sanitize allowlist 정책을 적용하고, 허용되지 않은 태그/속성/URI는 제거한다.
2. 로컬 리소스 URI는 워크스페이스 경계 내부 상대경로만 허용하며, `data:` URI는 `data:image/*`만 제한 허용한다.
3. 차단된 리소스는 자동 열기 대신 텍스트 placeholder(`blocked placeholder text`)로 렌더한다.
4. `workspace:index`는 인덱싱 노드 cap(`10,000`) 도달 시 `truncated=true`로 반환하며 renderer는 배너로 피드백한다.
5. 코드 하이라이트 계산은 파일 본문/언어가 바뀔 때만 재계산하고, selection/우클릭 상호작용에서는 재계산하지 않는다.

F10.2 기준 상태/상호작용 규칙(Implemented):

1. `workspace:readFile` 결과에 `imagePreview`가 있으면 코드 뷰어는 텍스트 라인 렌더 대신 이미지 모드로 전환한다.
2. 이미지 모드에서는 `selectionRange`를 초기화하고 텍스트 라인 우클릭 복사 UI를 노출하지 않는다.
3. `svg`/정책 위반 이미지 리소스는 `previewUnavailableReason='blocked_resource'`로 처리한다.
4. 세션 복원 시 `activeFile`가 이미지여도 stale 인덱스 응답 때문에 복원 스킵되지 않도록 continue 정책을 유지한다.

---

## 8. 링크/경로 파싱 규칙 (MVP 고정)

현재 구현 기준 지원/처리:

- `#heading-id` (same document anchor)
- `./path/to/file.md`, `../path/to/file.md` (activeSpec 기준 상대 링크)
- `path/to/file.ts#L10`, `path/to/file.ts#L10-L20` (same-workspace line jump)
- `https://...`, `mailto:...` 등 외부 링크
- rendered markdown selection + `Go to Source` (source line best-effort jump)

규칙:

1. 내부 경로 해석은 `active workspace rootPath` 기준 상대경로만 허용한다.
2. same document anchor(`#...`)는 기본 스크롤 동작을 유지한다.
3. same-workspace 상대 파일 링크는 내부 라우팅으로 파일을 연다(`selectFile` 경로).
4. 현재 활성 워크스페이스에서 해석할 수 없는 링크 및 외부 링크는 자동 이동하지 않고 링크 주소 copy popover를 표시한다.
5. 워크스페이스 간 자동 fallback(다른 워크스페이스 탐색)은 허용하지 않는다.
6. 코드 라인 점프(`Lx`, `Lx-Ly`)는 same-workspace 링크에서 파싱/하이라이트를 적용한다.
7. rendered markdown selection 컨텍스트 액션(`Go to Source`)은 현재 `activeSpec`에서만 동작한다.

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
| `workspace:index` | Renderer -> Main (`invoke`) | `{ rootPath }` -> `{ ok, fileTree, truncated?, error? }` | Implemented (F02/F10) |
| `workspace:readFile` | Renderer -> Main (`invoke`) | `{ rootPath, relativePath }` -> `{ ok, content, imagePreview?, error?, previewUnavailableReason? }` | Implemented (F03/F10.2) |
| `workspace:watchStart` | Renderer -> Main (`invoke`) | `{ workspaceId, rootPath }` | Implemented (F07) |
| `workspace:watchStop` | Renderer -> Main (`invoke`) | `{ workspaceId }` | Implemented (F07) |
| `workspace:watchEvent` | Main -> Renderer (`send`) | `{ workspaceId, changedRelativePaths[], hasStructureChanges? }` | Implemented (F07) |
| `workspace:historyNavigate` | Main -> Renderer (`send`) | `{ direction: 'back' \| 'forward', source: 'app-command' \| 'swipe' }` | Implemented (F07.1) |
| `system:openInIterm` | Renderer -> Main (`invoke`) | `{ rootPath }` | Implemented (F08) |
| `system:openInVsCode` | Renderer -> Main (`invoke`) | `{ rootPath }` | Implemented (F08) |

구현 메모:

- Renderer는 generic `invoke`를 직접 사용하지 않고 `window.workspace.openDialog()` 래퍼를 통해 호출한다.
- 인덱싱은 `window.workspace.index(rootPath)` 래퍼를 통해 호출한다.
- 인덱싱 결과 `truncated=true`는 index cap(10,000) 도달을 의미하며 renderer는 안내 배너를 노출한다.
- 파일 본문 읽기는 `window.workspace.readFile(rootPath, relativePath)` 래퍼를 통해 호출한다.
- `workspace:readFile`에서 이미지 파일은 `imagePreview(data:image/*)` payload를 우선 반환하며, 정책 차단 시 `previewUnavailableReason='blocked_resource'`를 반환한다.
- watcher lifecycle은 `window.workspace.watchStart()`/`watchStop()` 래퍼를 통해 호출한다.
- watcher 이벤트(`workspace:watchEvent`)는 `workspaceId`를 포함해 세션 오염 없이 라우팅하고, 필요 시 `hasStructureChanges` 플래그로 구조 변경 refresh를 전달한다.
- history navigation 이벤트(`workspace:historyNavigate`)는 `window.workspace.onHistoryNavigate()` 구독으로 전달되며, Renderer는 헤더 버튼과 동일 액션으로 라우팅한다.
- F08에서는 활성 워크스페이스 기준으로 `system:openInIterm`/`system:openInVsCode`를 호출한다.

---

## 10. 성능/보안/신뢰성 기준

### 10.1 성능

- 초기 인덱싱은 파일 경로/메타데이터 우선 (내용 지연 로딩)
- 파일 트리 렌더링은 초기 노드 cap(500)으로 과도한 렌더를 제한
- 워크스페이스 인덱싱은 노드 cap(10,000) 도달 시 `truncated`로 종료해 메인 프로세스 과부하를 방지한다.
- 코드 프리뷰는 파일당 2MB 초과 시 렌더를 생략하고 preview unavailable 상태를 반환한다.
- 코드 하이라이트는 파일 본문/언어 변경 시에만 재계산한다.
- watcher 이벤트 200~500ms 디바운스
- 대형 디렉터리 기본 ignore:
  - `.git/`
  - `node_modules/`
  - `dist/`, `build/`, `out/`
  - `.next/`, `.turbo/`

### 10.2 보안

- `contextIsolation` 유지, preload 경유 API만 노출
- `workspace:readFile`는 `rootPath` 경계 검증으로 workspace 외부 경로 접근을 차단한다.
- Markdown HTML sanitize를 `rehype-sanitize` allowlist 정책으로 강제한다.
- 로컬 리소스는 workspace 내부 상대경로만 허용하고, `data:` URI는 `data:image/*`만 제한 허용한다.

### 10.3 신뢰성

- F01에서 워크스페이스 다이얼로그 취소/오류 시 렌더러가 크래시하지 않고 텍스트 배너로 피드백한다.
- 취소/오류 발생 시 기존 `rootPath`를 유지한다.
- F02에서 인덱싱 실패/권한 오류 시 배너로 오류를 노출하고 앱 상태를 유지한다.
- F03에서 파일 읽기 실패 시 center 패널에 오류를 표시하고 앱 상태를 유지한다.
- F03에서 2MB 초과/바이너리 파일은 preview unavailable 상태로 안전하게 처리한다.
- F03.5에서 워크스페이스 전환/중복 재오픈/닫기 시 세션 정합성(`workspaceOrder`, `activeWorkspaceId`)을 유지한다.
- F04에서 `.md` 선택 시 center(raw)+right(rendered)가 동시에 표시되고 `activeSpec`가 워크스페이스별로 분리 복원되며, 코드 파일 선택 후에도 우측 rendered spec이 유지된다.
- F04.1에서 rendered markdown 링크 클릭 시 renderer 이동/리로드를 차단하고, same-workspace 링크는 파일을 열며 external/unresolved 링크는 copy popover로 처리한다.
- F05에서 `path#Lx`/`path#Lx-Ly` 링크 클릭 시 active workspace 기준으로 파일 열기 + 라인 선택/하이라이트 + best-effort 점프 스크롤이 동작한다.
- F07에서 워크스페이스별 watcher가 open/close lifecycle과 연동되고, changed indicator(`●`)가 파일 트리에 반영된다.
- F07에서 active file 변경 이벤트는 자동 re-read로 본문을 갱신하며, `hasStructureChanges` 이벤트는 워크스페이스 인덱스를 refresh하고, changed marker는 파일을 떠날 때 clear되며 워크스페이스 전환만으로는 clear되지 않는다.
- F07.1에서 파일 히스토리는 워크스페이스별 독립 스택/포인터로 유지되며 `Back`/`Forward`/mouse back-forward/`workspace:historyNavigate`/`wheel(deltaX)` fallback 입력이 동일 액션으로 라우팅된다.
- F09에서 앱 재시작 시 workspace/active file/active spec/라인 기준 위치 복원은 localStorage snapshot으로 처리하고, 부분 실패 시에도 복원을 계속한다.
- F10.1에서 rendered markdown 텍스트 선택 우클릭 시 `Go to Source`가 source line(best-effort) 기준으로 동작한다.
- F10에서 인덱싱 cap 도달(`truncated`) 시 앱은 정상 동작을 유지하고 배너로 제한 상태를 안내한다.
- F10에서 차단된 markdown 리소스는 자동 이동/로드 대신 placeholder로 안전하게 처리한다.
- F10.2에서 코드 뷰어는 이미지 프리뷰를 지원하고, 정책 차단 리소스는 텍스트 preview-unavailable 상태로 안전하게 처리한다.
- F10.2에서 종료 경로의 watcher 정리는 single-flight로 동작해 중복 종료 호출로 인한 앱 종료 지연을 완화한다.
- 토스트 배너 전환은 후속 Feature backlog로 유지한다.

---

## 11. 개발 환경 및 의존성

### 11.1 현재 의존성 (코드 기준)

- Runtime: `react`, `react-dom`, `prismjs`, `react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-sanitize`, `chokidar`
- Dev/Build/Test: `electron`, `vite`, `vite-plugin-electron`, `typescript`, `eslint`, `electron-builder`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`

### 11.2 MVP 구현 시 추가 검토 의존성

- 코드 뷰어 고도화(후속): Prism 확장 유지 vs `monaco-editor`/`codemirror` 전환 검토
- 코드 뷰어 이미지 프리뷰(F10.2)는 data URL 기반 read-only 미리보기로 구현 완료(확대/축소/패닝 등 고급 도구는 후속 검토)

### 11.3 멀티 워크스페이스 공통 규칙 (F04~F10.2/F06.1/F06.2 적용)

1. F04~F10.2 기능은 기본적으로 `activeWorkspaceId` 기준으로만 동작한다.
2. 활성 워크스페이스가 없으면 기능을 실행하지 않고 UI를 disabled 상태로 표시한다.
3. 워크스페이스 간 자동 fallback(다른 워크스페이스에서 경로 탐색)은 MVP 범위에서 허용하지 않는다.
4. 워크스페이스 전환 시 공유되면 안 되는 상태(예: line selection)는 리셋하고, 세션 상태(예: 파일 트리 펼침/active 문서)는 워크스페이스별로 유지한다.
5. 후속 기능 테스트는 단일 워크스페이스 시나리오 + 다중 워크스페이스 전환 회귀 시나리오를 모두 포함한다.

결정 고정(2026-02-20~2026-02-21):

- F04: 워크스페이스 전환 시 `activeSpec`만 복원한다.
- F04.1: same-workspace 상대 링크는 파일을 열고, external/unresolved 링크는 copy popover로 처리한다(자동 브라우저 이동 없음).
- F05: `#Lx`/`#Lx-Ly` 라인 점프/하이라이트는 active workspace 범위에서만 처리한다.
- F07: watcher는 `openWorkspace` 시점에 즉시 시작한다.
- F07 후속: changed marker는 파일을 여는 즉시가 아니라 해당 파일을 떠날 때 clear한다(워크스페이스 전환만으로는 clear하지 않음).
- F07.1: 파일 히스토리는 워크스페이스별 독립으로 유지하며, 뒤로 이동 후 신규 파일 open 시 forward 구간을 truncate한다.
- F07.1 확장: mouse back/forward, `app-command`/`swipe`, `wheel(deltaX)` fallback은 모두 동일 history 액션으로 연결하고 이동 불가 상태는 no-op으로 처리한다.
- F06/F08: 액션 가드는 기능별 개별 구현을 기본으로 한다(공통 guard layer는 보류).
- F08: `Open in iTerm`/`Open in VSCode` 버튼은 헤더가 아니라 좌측 `Current Workspace` 블록 아래에 배치한다.
- F06.1: 우클릭 복사 액션은 `relative path` 고정이며, CodeViewer 우클릭은 selection 범위 안/밖 정책(유지/단일 선택 전환)을 따른다.
- F06.2: CodeViewer는 드래그 선택을 추가하고 우클릭 복사 액션을 `Copy Selected Content`, `Copy Both`, `Copy Relative Path`로 통합한다.
- F06.2: FileTree 우클릭 복사는 파일/디렉터리 모두 지원하며, F08은 toolbar 비의존 진입점(Workspace Action)으로 정의한다.
- F09: 기존 `Copy Current Spec Section` 대신 앱 재시작 세션 복원 기능(workspaces + active file + line resume)으로 범위를 교체한다.
- F09: 세션 영속화 저장소는 renderer `localStorage`를 기본으로 하며, 라인 복원은 픽셀 스크롤 복원 대신 라인 기준으로 처리한다.
- F10.1: rendered markdown selection 우클릭 `Go to Source`는 line 기준 best-effort 매핑으로 고정하고 `activeSpec` source jump만 지원한다.
- F10: 인덱싱 cap은 `10,000`으로 고정하고 `workspace:index.truncated` 신호를 renderer 배너에 연결한다.
- F10: 차단 리소스는 `blocked placeholder text`로 처리하고, `data:` URI는 `data:image/*`만 제한 허용한다.
- F10.2: 코드 뷰어는 `imagePreview` payload를 우선 렌더하고, `blocked_resource`는 preview-unavailable 정책으로 처리한다.

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
  - 코드/비-Markdown 파일 선택 후에도 우측 rendered spec(`activeSpec`) 유지
- 제외:
  - TOC/스크롤/activeHeading의 워크스페이스별 복원
  - 섹션 active tracking 정밀화
  - 링크 인터셉트
  - 워크스페이스 간 문서 상태 공유
- 완료 기준:
  - `.md` 파일 선택 시 우측 렌더 패널이 정상 출력됨
  - A/B 워크스페이스를 전환해도 각 워크스페이스의 `activeSpec` 상태가 섞이지 않음
  - spec를 연 뒤 코드 파일을 선택해도 우측 패널이 마지막 `activeSpec` 렌더를 유지함
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
  - 앱 재시작 세션 복원(F09)
  - Open in iTerm/VSCode
  - 우클릭 컨텍스트 메뉴 복사(F06.1)
  - Copy UX 컨텍스트 메뉴 통합(F06.2)
- 완료 기준:
  - 두 버튼 모두 클립보드 결과 포맷이 요구사항과 일치
  - 워크스페이스 전환 후 복사 결과가 현재 활성 워크스페이스 기준으로 바뀜
- 예상 변경 파일:
  - `src/App.tsx`
  - `src/App.css`
  - `src/toolbar/context-toolbar.tsx`
  - `src/context-copy/copy-payload.ts`
  - `src/App.test.tsx`
  - `src/toolbar/context-toolbar.test.tsx`
  - `src/context-copy/copy-payload.test.ts`
- 상태: `✅ Done (2026-02-21)`
- 후속 정리(Completed):
  - F06.2에서 `Copy Active File Path`/`Copy Selected Lines` 툴바 버튼을 제거하고 우클릭 컨텍스트 메뉴 중심으로 통합했다.

#### F06.1. 코드/파일 트리 우클릭 컨텍스트 복사 Popover (P0, 크기 S)

- 포함:
  - CodeViewer 우클릭 컨텍스트 메뉴(`Copy Selected Content`, `Copy Relative Path`)
  - FileTree 파일 항목 우클릭 컨텍스트 메뉴(`Copy Relative Path`)
  - 우클릭 selection 정책 고정(범위 안: 유지, 범위 밖: 단일 라인 선택)
  - popover dismiss(외부 클릭/ESC/완료 시 닫힘)
- 제외:
  - 디렉터리 우클릭 액션 확장
  - 절대경로 복사
  - F06.2에서 다루는 드래그 선택/Copy Both/툴바 제거
- 완료 기준:
  - 코드 라인 우클릭 시 정책에 맞게 selection이 유지/전환된다.
  - `Copy Selected Content`가 현재 선택 텍스트를 복사한다.
  - 코드/파일 트리 `Copy Relative Path`가 활성 워크스페이스 기준 상대경로를 복사한다.
- 예상 변경 파일:
  - `src/code-viewer/code-viewer-panel.tsx`
  - `src/file-tree/file-tree-panel.tsx`
  - `src/App.tsx`
  - `src/App.css`
  - `src/*` (context menu/popover + copy payload util)
  - `src/App.test.tsx`
  - `src/code-viewer/code-viewer-panel.test.tsx`
- 상태: `✅ Done (2026-02-21)`

#### F06.2. 드래그 선택 + 복사 UX 통합 (Copy Both + Toolbar 제거) (P0, 크기 M)

- 포함:
  - CodeViewer 드래그 기반 연속 라인 선택(`Shift+Click` 유지)
  - CodeViewer 우클릭 액션 3종 고정(`Copy Selected Content`, `Copy Both`, `Copy Relative Path`)
  - `Copy Both`는 기존 F06 포맷(`relative/path:Lx-Ly` + 본문) 재사용
  - FileTree 파일/디렉터리 우클릭 `Copy Relative Path` 지원
  - 상단 `Copy Active File Path`/`Copy Selected Lines` 버튼 제거(`context-toolbar` 제거)
  - F08 진입점을 toolbar 비의존 구조로 재정의(워크스페이스 액션)
- 제외:
  - F08/F09 기능 구현 자체(F09는 세션 복원 범위)
  - 절대경로 복사 옵션
  - 비연속 다중 selection
- 완료 기준:
  - 코드 드래그로 연속 라인 선택이 가능하며 기존 `Shift+Click` 동작이 유지됨
  - 코드 우클릭에서 `Copy Both`가 동작하고 payload 포맷이 F06 규칙과 일치함
  - 파일/디렉터리 우클릭 모두 상대경로 복사가 가능함
  - 상단 복사 툴바 버튼이 제거되어도 컨텍스트 복사 UX가 유지됨
- 예상 변경 파일:
  - `src/code-viewer/code-viewer-panel.tsx`
  - `src/code-viewer/line-selection.ts`
  - `src/file-tree/file-tree-panel.tsx`
  - `src/App.tsx`
  - `src/App.css`
  - `src/context-copy/copy-payload.ts`
  - `src/toolbar/context-toolbar.tsx` (삭제)
  - `src/toolbar/context-toolbar.test.tsx` (삭제)
  - `src/App.test.tsx`
  - `src/code-viewer/code-viewer-panel.test.tsx`
  - `src/file-tree/file-tree-panel.test.tsx`
  - `src/context-copy/copy-payload.test.ts`
- 상태: `✅ Done (2026-02-21)`

#### F07. 파일 watcher + changed indicator (P0, 크기 M)

- 포함:
  - 워크스페이스별 워처 시작/종료 라이프사이클(`openWorkspace` 즉시 시작, `closeWorkspace` 즉시 정리)
  - workspace 단위 debounce + `changedFiles` 관리
  - 트리 내 변경 표시(`●`)
  - watch 이벤트에 active file이 포함되면 코드 뷰어 본문 자동 재로딩
  - changed marker clear 시점은 같은 워크스페이스에서 파일을 떠나는 순간으로 고정
- 제외:
  - diff 뷰
- 완료 기준:
  - 외부 편집 시 해당 파일에 변경 표시가 반영됨
  - 워크스페이스 전환 시 각 워크스페이스의 변경 표시가 분리되어 유지됨
  - 워크스페이스 제거 시 해당 watcher가 정리됨
  - active file이 외부 수정되면 코드 뷰어 본문이 자동 반영됨
  - changed marker는 파일을 떠날 때 제거되고 워크스페이스 전환만으로는 제거되지 않음
- 예상 변경 파일:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/electron-env.d.ts`
  - `src/workspace/workspace-model.ts`
  - `src/*` (provider, FileTreePanel)
- 상태: `✅ Done (2026-02-21)`

#### F07.1. 워크스페이스 파일 히스토리 네비게이션 (P0, 크기 M)

- 포함:
  - 워크스페이스별 파일 히스토리 스택/포인터(`fileHistory`, `fileHistoryIndex`) 관리
  - 헤더 `Back`/`Forward` 버튼 + disabled 상태 연동
  - `Back` 후 신규 파일 open 시 forward 구간 truncate
  - 입력 바인딩 확장: mouse back/forward, `workspace:historyNavigate`(`app-command`/`swipe`), renderer `wheel(deltaX)` fallback
- 제외:
  - 키보드 단축키(`Cmd+[`, `Cmd+]`)
  - 앱 재시작 후 히스토리 영속화
- 완료 기준:
  - active workspace 기준으로 `Back`/`Forward`가 동작한다.
  - 워크스페이스별 히스토리 독립성이 유지된다.
  - 뒤로 이동 후 다른 파일을 열면 forward 히스토리가 무효화된다.
  - swipe 이벤트 미전달 환경에서도 수평 `wheel(deltaX)` fallback으로 히스토리 이동이 동작한다.
- 예상 변경 파일:
  - `src/workspace/workspace-model.ts`
  - `src/workspace/workspace-context.tsx`
  - `src/App.tsx`
  - `src/App.css`
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/electron-env.d.ts`
  - `src/workspace/workspace-model.test.ts`
  - `src/App.test.tsx`
- 상태: `✅ Done (2026-02-21)`

#### F08. Open Workspace in iTerm / VSCode (P1, 크기 M)

- 포함:
  - 좌측 상단 `Current Workspace` 블록 바로 아래에 workspace action 버튼 배치
  - `Open In:` 라벨 + 아이콘 버튼 2개(`iTerm`, `VSCode`) 제공
  - 아이콘 버튼은 compact 스타일을 사용하고 라벨 텍스트는 tooltip/접근성 이름으로 제공
  - macOS iTerm/VSCode 실행 IPC
  - 실패 시 사용자 피드백
  - 액션 가드는 기능별 개별 처리
- 제외:
  - Terminal.app/기타 에디터 fallback
- 완료 기준:
  - `Open in iTerm` 클릭 시 iTerm이 활성 워크스페이스 경로에서 열림
  - `Open in VSCode` 클릭 시 VSCode가 활성 워크스페이스 경로에서 열림
  - 버튼 위치는 헤더가 아니라 좌측 `Current Workspace` 블록 아래로 고정됨
  - UI 형태는 `Open In:` + 아이콘 버튼 2개로 렌더되며, 각 버튼은 `aria-label`/tooltip(`Open in iTerm`, `Open in VSCode`)을 가진다.
  - 활성 워크스페이스가 없으면 두 아이콘 버튼은 disabled 상태가 된다.
- 예상 변경 파일:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/electron-env.d.ts`
  - `src/App.tsx`
  - `src/App.css`
  - `src/App.test.tsx`
- 상태: `✅ Done (2026-02-21)`

#### F09. 앱 재시작 세션 복원 + 라인 기준 위치 복원 (P0, 크기 M)

- 포함:
  - 앱 종료 전 workspace session snapshot 저장(localStorage)
  - 앱 시작 시 열린 workspace 목록/active workspace 자동 복원
  - workspace별 active file 자동 복원
  - workspace별 active spec(우측 markdown 렌더 상태) 자동 복원
  - 파일별 마지막 라인 위치 복원(라인 기준, clamp 포함)
  - 부분 복원 실패 continue + 텍스트 배너 피드백
- 제외:
  - 픽셀 단위 스크롤 정밀 복원
  - 클라우드/다중기기 세션 동기화
- 완료 기준:
  - 앱 재시작 후 이전 workspace/active workspace/active file이 자동 복원된다.
  - 앱 재시작 후 우측 spec 패널의 `activeSpec`가 복원된다.
  - 파일 재열기 시 마지막 라인으로 점프한다(라인 기준).
  - 일부 workspace 복원 실패가 있어도 나머지 복원이 계속되고 앱이 정상 동작한다.
- 예상 변경 파일:
  - `src/workspace/workspace-persistence.ts` (신규)
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/workspace-model.ts`
  - `src/App.tsx`
  - `src/workspace/workspace-persistence.test.ts` (신규)
  - `src/workspace/workspace-model.test.ts`
  - `src/App.test.tsx`
- 상태: `✅ Done (2026-02-21)`

#### F10.1. rendered markdown 선택 우클릭 `Go to Source` (P1, 크기 S)

- 포함:
  - rendered markdown 본문 텍스트 selection + 우클릭 컨텍스트 액션(`Go to Source`)
  - markdown 블록 시작 라인 기반 source line best-effort 해석(`data-source-line`)
  - `Go to Source` 실행 시 `activeSpec` source file 단일 라인 점프(`Lx-Lx`)
  - source/link popover 상호 배타 표시 + dismiss(외부 클릭/ESC)
- 제외:
  - 문자/토큰 단위 정밀 source 매핑
  - cross-workspace source 탐색
  - multi-action source menu 고도화
- 완료 기준:
  - rendered markdown selection 후 우클릭 시 `Go to Source` 액션이 표시된다.
  - `Go to Source` 실행 시 center 코드 뷰어가 `activeSpec`의 대응 라인으로 이동한다.
  - line 해석 실패/`activeSpec` 부재 시 앱이 깨지지 않고 no-op/배너 처리된다.
- 예상 변경 파일:
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/spec-viewer/spec-source-popover.tsx` (신규)
  - `src/spec-viewer/source-line-resolver.ts` (신규)
  - `src/App.tsx`
  - `src/App.css`
  - `src/spec-viewer/spec-viewer-panel.test.tsx`
  - `src/spec-viewer/source-line-resolver.test.ts` (신규)
  - `src/App.test.tsx`
- 상태: `✅ Done (2026-02-21)`

#### F10. 안정화 패스(보안/성능/테스트) (P2, 크기 M)

- 포함:
  - markdown sanitize/URI 정책 유틸 도입 + SpecViewer sanitize 적용
  - 로컬 리소스 경계(워크스페이스 상대경로 + `data:image/*` 제한 허용) 및 차단 placeholder 적용
  - 인덱싱 cap(`10,000`) + `workspace:index.truncated` 계약/배너 연동
  - 코드 뷰어 하이라이트 계산 메모이제이션
  - 핵심 단위/통합 테스트 보강(`markdown-security`, truncation, memoization)
- 제외:
  - 신규 사용자 기능 추가(F10.2 코드 뷰어 이미지 프리뷰는 별도)
- 완료 기준:
  - sanitize/URI/리소스 경계 정책이 코드+테스트로 고정된다.
  - 인덱싱 cap 도달 시 앱이 유지되고 `truncated` 배너가 노출된다.
  - 하이라이트 재계산이 selection/우클릭 상호작용에서 재발하지 않는다.
  - `npm test`/`npm run lint`/`npm run build` 게이트를 통과한다.
- 예상 변경 파일:
  - `src/spec-viewer/markdown-security.ts` (신규)
  - `src/spec-viewer/markdown-security.test.ts` (신규)
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/spec-viewer/spec-viewer-panel.test.tsx`
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/electron-env.d.ts`
  - `src/workspace/workspace-context.tsx`
  - `src/code-viewer/syntax-highlight.ts`
  - `src/code-viewer/code-viewer-panel.tsx`
  - `src/code-viewer/code-viewer-panel.test.tsx`
  - `src/App.tsx`
  - `src/App.css`
  - `src/App.test.tsx`
  - `package.json`, `package-lock.json`
- 상태: `✅ Done (2026-02-21)`

#### F10.2. 코드 뷰어 이미지 프리뷰 (P1, 크기 M)

- 포함:
  - `workspace:readFile` 이미지 payload(`imagePreview`) 계약 추가
  - 코드 뷰어 텍스트/이미지/preview-unavailable 3-way 렌더 분기
  - 허용 이미지 포맷(`.png/.jpg/.jpeg/.gif/.webp`) 프리뷰 + 정책 차단(`blocked_resource`) 처리
  - 세션 복원 시 이미지 active file 복원 및 stale 인덱스 경합 continue 보정
  - watcher 종료 single-flight 처리로 종료 지연 완화
- 제외:
  - 이미지 편집/주석/확대-축소-패닝 도구
  - `bmp`/`ico`/`svg` 등 추가 포맷 프리뷰
- 완료 기준:
  - 이미지 파일 선택 시 center 코드 뷰어에서 실제 이미지가 렌더된다.
  - 정책 차단 리소스는 앱 크래시 없이 preview-unavailable 상태로 표시된다.
  - 앱 재시작 후 이미지 active file도 복원되고, stale 인덱스 경합이 있어도 복원을 계속한다.
  - `npm test`/`npm run lint`/`npm run build` 게이트를 통과한다.
- 예상 변경 파일:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/electron-env.d.ts`
  - `src/workspace/workspace-model.ts`
  - `src/workspace/workspace-context.tsx`
  - `src/code-viewer/code-viewer-panel.tsx`
  - `src/App.tsx`
  - `src/App.css`
  - `src/App.test.tsx`
  - `src/code-viewer/code-viewer-panel.test.tsx`
  - `src/workspace/workspace-model.test.ts`
- 상태: `✅ Done (2026-02-21)`

### 12.3 Feature-draft 실행 순서 (현황)

1. `F01~F10.2` 완료

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
- [x] 코드/비-Markdown 파일 선택 후에도 우측 rendered spec 패널이 마지막 `activeSpec` 기준으로 유지됨 (F04 동작 보정, 2026-02-20)
- [x] rendered markdown 링크 클릭 시 same-workspace 파일 열기 + external/unresolved copy popover 동작 (F04.1 완료, 2026-02-20)
- [x] `path.ts#L10-L20` 클릭 시 점프 및 하이라이트 (F05 완료, 2026-02-20)
- [x] 복사 payload 포맷(`relative/path`, `relative/path:Lx-Ly` + 본문)과 실패 배너 처리 규칙이 고정됨 (F06 완료, F06.2에서 툴바 UI 제거, 2026-02-21)
- [x] 코드 뷰어/파일 트리 우클릭 컨텍스트 메뉴로 선택 내용/상대경로 복사 가능 (F06.1 완료, 2026-02-21)
- [x] 코드 뷰어 드래그 선택 + `Copy Both` + 파일/디렉터리 우클릭 경로 복사 + 툴바 복사 제거가 반영됨 (F06.2 완료, 2026-02-21)
- [x] 외부 파일 변경이 changed indicator에 반영됨 (F07 완료, 2026-02-21)
- [x] active file 외부 변경 시 코드 뷰어 자동 반영 + marker clear 시점(파일 떠날 때) 정책이 반영됨 (F07 follow-up 완료, 2026-02-21)
- [x] 워크스페이스별 파일 히스토리 `Back`/`Forward` + mouse/swipe/wheel 입력 바인딩이 동작함 (F07.1 완료, 2026-02-21)
- [x] 좌측 `Current Workspace` 아래 workspace actions에서 `Open in iTerm` 동작 (F08 완료, 2026-02-21)
- [x] 좌측 `Current Workspace` 아래 workspace actions에서 `Open in VSCode` 동작 (F08 완료, 2026-02-21)
- [x] 앱 재시작 시 열린 workspace/active workspace/active file 자동 복원 (F09 완료, 2026-02-21)
- [x] 앱 재시작 시 workspace별 active spec(우측 markdown 렌더 상태) 자동 복원 (F09 완료, 2026-02-21)
- [x] 파일 재열기/재시작 복원 시 마지막 라인 위치로 이동(라인 기준, clamp) (F09 완료, 2026-02-21)
- [x] 복원 실패 workspace가 있어도 나머지 복원이 계속되고 배너로 피드백됨 (F09 완료, 2026-02-21)
- [x] rendered markdown 텍스트 selection 우클릭 시 `Go to Source` 액션이 표시되고 `activeSpec` source line으로 점프함 (F10.1 완료, 2026-02-21)
- [x] markdown sanitize 정책이 적용되고 차단 리소스는 `blocked placeholder text`로 대체 렌더됨 (F10 완료, 2026-02-21)
- [x] 로컬 리소스는 workspace 상대경로 + `data:image/*`만 허용되고 위험 URI는 차단됨 (F10 완료, 2026-02-21)
- [x] 워크스페이스 인덱싱 cap(`10,000`) 도달 시 `truncated` 배너가 표시됨 (F10 완료, 2026-02-21)
- [x] 코드 뷰어 하이라이트 계산은 selection/우클릭 재렌더에서 재실행되지 않음 (F10 완료, 2026-02-21)
- [x] 코드 뷰어에서 이미지 파일(`.png/.jpg/.jpeg/.gif/.webp`) 선택 시 이미지 프리뷰 모드가 동작함 (F10.2 완료, 2026-02-21)
- [x] 차단 리소스(`svg`/정책 위반)는 `previewUnavailableReason='blocked_resource'`로 안전하게 처리됨 (F10.2 완료, 2026-02-21)
- [x] 앱 재시작 시 이미지 active file 복원과 stale 인덱스 경합 continue 정책이 유지됨 (F10.2 완료, 2026-02-21)

### 13.2 테스트 우선순위

1. 링크 파싱/라인 변환 로직 단위 테스트
2. 파일 트리/상태 전이 통합 테스트
3. 주요 IPC 계약 스모크 테스트
4. F04~F10.2/F06.1/F06.2 공통 멀티 워크스페이스 회귀 테스트

현재 검증 결과(F01/F02/F03/F03.1/F03.5/F04/F04.1/F05/F06/F06.1/F06.2/F07/F07.1/F08/F09/F10.1/F10/F10.2):

- 자동 테스트: 총 133건 통과(`npm test`)
  - `src/App.test.tsx` 46건
  - `src/workspace/workspace-model.test.ts` 15건
  - `src/workspace/workspace-persistence.test.ts` 6건
  - `src/code-viewer/line-selection.test.ts` 5건
  - `src/code-viewer/language-map.test.ts` 2건
  - `src/code-viewer/code-viewer-panel.test.tsx` 9건
  - `src/spec-viewer/markdown-security.test.ts` 6건
  - `src/spec-viewer/markdown-utils.test.ts` 2건
  - `src/spec-viewer/spec-link-utils.test.ts` 11건
  - `src/spec-viewer/spec-viewer-panel.test.tsx` 12건
  - `src/spec-viewer/source-line-resolver.test.ts` 5건
  - `src/context-copy/copy-payload.test.ts` 8건
  - `src/context-menu/copy-action-popover.test.tsx` 3건
  - `src/file-tree/file-tree-panel.test.tsx` 3건
- 품질 게이트: `npm run lint`, `npm run build` 통과
- 수동 스모크: Electron 앱 기준 완료(F01/F02/F03/F03.1/F03.5/F04/F04.1/F05/F06/F06.1/F06.2/F07/F07.1/F08/F09/F10.1/F10/F10.2, 2026-02-21)

---

## 14. 리스크 및 미확정 사항

1. F04는 `activeSpec`만 복원하도록 고정했기 때문에 TOC/스크롤/activeHeading 복원이 필요해지면 후속 확장 비용이 발생한다.
2. F04.1은 external/unresolved 링크를 popover 복사 UX로만 처리하므로, 시스템 브라우저 열기/보조 탐색 UX는 후속 Feature로 남는다.
3. 파일 링크의 non-line hash(`path.md#heading`)는 현재 파일 열기만 수행하고 heading 위치 스크롤은 미지원(backlog)이다.
4. F07 watcher를 워크스페이스별로 운영할 때 시스템 리소스 상한(동시 watcher 수, debounce 전략) 튜닝이 필요하다.
5. `system:openInIterm`/`system:openInVsCode` 실패 시 fallback 정책이 확정되지 않았다.
6. F06.1 우클릭 selection 정책(범위 안 유지/범위 밖 전환)은 F06.2 드래그 선택 도입 후 사용성 피드백에 따라 조정 가능성이 있다.
7. F09에서 localStorage snapshot 크기 증가(워크스페이스/파일 라인 맵 누적) 제어 정책은 현재 `MAX_PERSISTED_FILE_LAST_LINE_ENTRIES=200`으로 제한되어 있으나, 실제 사용 패턴 기준 추가 튜닝 여지가 있다.
8. F09에서 복원 중 파일 길이 변경/삭제 케이스의 line clamp UX(어디까지 자동 점프할지) 튜닝이 필요할 수 있다.
9. F07.1 `wheel(deltaX)` fallback은 트랙패드/입력 장치 편차가 있어 임계값/쿨다운 튜닝이 필요할 수 있다.
10. F10.1 source line 매핑은 line 단위 best-effort라 markdown 구조에 따라 실제 의도 위치와 1~수 라인 차이가 날 수 있다.
11. F10 인덱싱 cap(`10,000`)은 초대형 repo에서 파일 가시성/성능 trade-off가 있어 실제 사용 패턴 기반 튜닝 여지가 있다.
12. F10.2 이미지 프리뷰는 read-only 렌더만 제공하므로 확대/축소/패닝/멀티 포맷 지원(`bmp`, `ico`)은 후속 확장 항목으로 남아 있다.

---

## 15. Open Questions (F04~F10.2 선결)

- 현재 없음 (2026-02-21 결정 반영 완료)

---

## 16. 결론

이 문서는 F01/F02/F03/F03.1/F03.5/F04/F04.1/F05/F06/F06.1/F06.2/F07/F07.1/F08/F09/F10.1/F10/F10.2 구현 결과를 반영한 스펙이며, 멀티 워크스페이스 기준 정책 위에서 안정화 + 이미지 프리뷰 기준선을 고정했다. 다음 단계는 후속 UX 고도화(이미지 도구/추가 포맷 등) 우선순위를 재정의해 진행하는 것이다.
