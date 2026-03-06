# 03. Components

## 1. 컴포넌트 책임 맵

### 1.1 App Shell

- `src/App.tsx`
  - 2패널 탭 레이아웃(사이드바 + Code/Spec 탭 콘텐츠) 조립, header 액션, 모달 오케스트레이션, dirty indicator + unsaved changes guard (F24)
  - header left(title + history + Code/Spec 탭 바) + header right(comments) 그룹
  - 워크스페이스 관리(선택기/Open/Close)는 사이드바 상단에 배치
  - `activeTab` 상태(`'code' | 'spec'`)로 콘텐츠 영역 전환, `display: none`으로 비활성 탭 보존
  - `.md` 파일 선택 시 Spec 탭 자동 전환, 그 외 파일은 Code 탭 자동 전환
  - `SpecViewerPanel`에 `isActive={activeTab === 'spec'}` 전달, Spec 탭 활성 상태에서만 `Cmd/Ctrl+F`가 스펙 검색 UI를 열도록 게이트
  - spec 점프/Go to Source/코멘트 점프 시 Code 탭 자동 전환 (`openSpecRelativePath` 후 `setActiveTab('code')` 순서로 적용)
  - 파일 트리 CRUD 콜백(`onRequestCreateFile/Directory`, `onRequestDeleteFile/Directory`, `onRequestRename`) 연결 + confirm dialog + dirty file 삭제 처리 (F25/F25b)
  - 코멘트 배너 + 원격 연결/폴백 배너 auto-dismiss 타이머 제어
  - spec 점프/코멘트 요청/내보내기 흐름 연결
  - (F28) `handleBrowseRemoteDirectories` + `RemoteConnectModal` 2-step(profile/directory) browse-then-connect orchestration
  - `Cmd+Shift+Up/Down` 키보드 워크스페이스 순환 전환 리스너
  - `Cmd+Shift+Left/Right` 키보드 탭 전환 리스너
  - 리사이즈 핸들 1개(사이드바 ↔ 콘텐츠), `PaneSizes = { left, content }`
  - `codeScrollPositionsRef: Record<string, number>` — 파일별 코드 에디터 픽셀 스크롤 위치(키: `workspaceId::relativePath`) (F07.2)
  - `handleCodeScrollChange(scrollTop)` + `restoredCodeScrollTop` — 히스토리 이동 시 스크롤 위치 저장/복원 orchestration (F07.2)
- `src/App.css`
  - 2열 CSS Grid 레이아웃(`--pane-left` + `--pane-content`), 리사이저 1개
  - `content-tab-bar`/`content-tab-button` 탭 전환 스타일(활성/비활성 시각 구분)
  - `content-pane-wrapper`(`.is-hidden` 토글) 탭 콘텐츠 가시성
  - `sidebar-workspace-group`/`sidebar-workspace-controls` 사이드바 워크스페이스 관리 스타일
  - CM6 Git gutter/Comment badge 색상 스타일

### 1.2 Workspace State Layer

- `src/workspace/workspace-context.tsx`
  - 멀티 워크스페이스 상태 및 action 집약
  - active file read/refresh/전환 시 `workspace:getGitLineMarkers` 재조회 및 세션 상태 반영
  - same-spec source jump에서 불필요한 spec reset/read 최소화
  - workspace별 watch mode preference 변경/재시작 + fallback 배너 처리
  - comments/global-comments read-write 액션 제공
  - `loadDirectoryChildren` on-demand 디렉토리 확장 + `isFilePathPotentiallyPresent` lazy tree 보호
  - (F29) `searchFiles(query)` 액션: `workspace:searchFiles` IPC 호출, 기본 탐색 제한(`maxDepth=20`, `maxResults=200`, `maxDirectoryChildren=10000`, `timeBudgetMs=2000`) 적용, 로컬/리모트 backend 차이를 renderer에서 숨김
  - (F25) `createFile`, `createDirectory`, `deleteFile`, `deleteDirectory` 액션: IPC 호출 + active file 삭제 시 `activeFile=null` / `activeFileContent=null` / `isDirty=false` 초기화
  - (F25b) `renameFileOrDirectory` 액션: 코멘트 보호 검사(`comments.some`) → dirty 거부 → `workspace:rename` IPC → active file 경로 갱신(직접 rename + 디렉토리 하위 prefix 치환)
  - (F26) `loadWorkspaceGitFileStatuses` 액션: `workspace:getGitFileStatuses` IPC 조회, workspace open/hydration/watch event/saveFile 시점에 호출, request ID 기반 stale 방지
  - `gitFileStatuses: Record<string, GitFileStatusKind>` 상태 필드 (F26)
  - (F27) `connectRemoteWorkspace`/`disconnectRemoteWorkspace`/`retryRemoteWorkspaceConnection` 액션 + remote 연결 상태 이벤트/배너 반영
  - (F27/F28) 원격 연결 모달 입력값 저장(localStorage key: `sdd-workbench.remote-connect-draft.v1`, `activeStep`/`lastBrowsePath`/`remoteRoot` 포함)
  - (F27/F28) remote 연결 단절/강등 이벤트 + watch fallback 배너 5초 auto-dismiss 스케줄링
  - lazy 디렉토리(`not-loaded`/`partial`) 하위 변경 파일은 `isFilePathPotentiallyPresent` 힌트로 `changedFiles` 유지(재인덱싱 직후 marker 소실 방지)
- `src/workspace/workspace-model.ts`
  - 순수 상태 전이(`watchModePreference`, `watchMode`, `isRemoteMounted`, `loadingDirectories` 포함)
  - session 상태에 `activeFileGitLineMarkers` 포함
  - `isDirty` 상태 + `saveFile(content)` → writeFile IPC → dirty 해제 (F24)
  - `switchActiveWorkspace` 순수 함수(순서 유지 전환, MRU 재배열 없음)
  - `mergeDirectoryChildren` 순수 함수(트리 노드 교체)
- `src/workspace/workspace-persistence.ts`
  - 세션 snapshot hydrate/persist(`watchModePreference` 영속화)
- `src/workspace/workspace-switcher.tsx`
  - 활성 workspace 선택

### 1.3 File Tree Layer

- `src/file-tree/file-tree-panel.tsx`
  - 디렉토리 토글형 트리 렌더
  - (F29) 상단 파일 검색 입력 + Clear 버튼, query 200ms debounce 후 backend filename substring 검색 요청
  - (F29) 검색 활성 시 트리 대신 검색 결과 목록/Searching/No files found/partial hint 상태 렌더
  - (F29) 검색 결과 선택 시 상위 ancestor directory를 best-effort로 펼친 뒤 파일 선택, lazy-loaded tree 상태와 무관하게 결과 열기 지원
  - (F31) 검색 입력 placeholder에 `(* supported)` discoverability 문구 추가, renderer는 wildcard query를 가공하지 않고 backend로 그대로 전달
  - 파일/디렉토리 우클릭 경로 복사
  - changed marker 표시(visible 파일 + collapse 버블링 상위 디렉토리 + lazy subtree changed path 힌트 버블링)
  - `not-loaded` 디렉토리 확장 시 on-demand 로드 트리거 + "Loading..." placeholder
  - 초기 렌더 노드 cap(`INITIAL_RENDER_NODE_LIMIT=10000`)으로 렌더 프레임 급증 방지
  - `partial` 디렉토리에 "Showing N of M items" cap 메시지 표시
  - (F25/F25b) 우클릭 컨텍스트 메뉴: 파일/디렉토리 노드 → "Copy Relative Path", "New File", "New Directory", "Rename", "Delete" / 빈 영역 → "New File", "New Directory"
  - (F25/F25b) 인라인 이름 입력 UI(`.tree-inline-input`): 생성 모드(빈 입력) + rename 모드(현재 이름 pre-fill), Enter 확정, Escape 취소, 빈 이름/슬래시/점점 유효성 검사
  - (F25/F25b) Props: `onRequestCreateFile`, `onRequestCreateDirectory`, `onRequestDeleteFile`, `onRequestDeleteDirectory`, `onRequestRename`
  - (F26) `gitFileStatuses` prop → 파일별 U/M 뱃지 렌더 + `buildGitStatusSubtreeMap` 디렉토리 상태 버블링(접힘 시만 표시)

### 1.4 Code Editor Layer (F24: CodeMirror 6 기반)

- `src/code-editor/code-editor-panel.tsx`  - CodeMirror 6 기반 코드 읽기/편집 통합 컴포넌트
  - React ref → `EditorView` 생성/소멸, Extensions 관리
  - `Compartment` 기반 `readOnly` 동적 전환
  - `wrapCompartment` (`Compartment`) 기반 line wrap 동적 전환 (F24.1)
  - 헤더 "Wrap On/Off" 토글 버튼(`data-testid="code-viewer-wrap-toggle"`, `aria-pressed`), 기본 On(가로 스크롤 방지 → 트랙패드 wheel 히스토리 내비게이션 안정화) (F24.1)
  - `@codemirror/search` 내장 검색(기존 F21 커스텀 검색 대체)
  - `Mod-s` keymap → `onSave(doc.toString())` + `updateListener`에서 `docChanged` → dirty
  - Image/binary/too-large fallback UI 유지
  - Jump-to-line via `EditorView.scrollIntoView`
  - 컨텍스트 메뉴(Copy/Add Comment) CM6 `domEventHandlers` 통합
  - `onScrollChange?: (scrollTop: number) => void` prop — `view.scrollDOM` native scroll 이벤트 감지 후 상위 전달 (F07.2)
  - `restoredScrollTop?: number | null` prop — 콘텐츠 로드(`view.setState`) 후 `requestAnimationFrame`으로 픽셀 스크롤 복원 (F07.2)
- `src/code-editor/cm6-dark-theme.ts`  - github-dark 유사 다크 테마(`EditorView.theme` + `syntaxHighlighting(oneDarkHighlightStyle)`)
  - 배경 `#1a1a1a`, 텍스트 `#d3d3d3`, gutter `#7d7d7d`, 선택 `rgba(78,140,198,0.2)`
- `src/code-editor/cm6-language-map.ts`  - 파일 확장자 → CM6 `LanguageSupport` lazy mapping (13개 언어 + plaintext fallback)
- `src/code-editor/cm6-selection-bridge.ts`  - CM6 character-based selection → `LineSelectionRange` 변환
  - 빈 selection은 커서 라인 단일 range
- `src/code-editor/cm6-git-gutter.ts`  - CM6 `gutter()` API로 added(green)/modified(blue) dot, `StateEffect`로 주입
- `src/code-editor/cm6-comment-gutter.ts`  - `GutterMarker.toDOM()`에서 badge span + hover popover, 기존 `CommentHoverPopover` 재사용

#### Spec-Viewer 공용 유지 모듈

- `src/code-viewer/language-map.ts`, `syntax-highlight.ts`
  - Shiki 기반 비동기 syntax highlight(JS regex 엔진, 40+ 언어 lazy 로드, github-dark 테마)
  - 확장자/파일명 → Shiki `BundledLanguage` 매핑 + plaintext fallback
  - ※ spec-viewer의 `HighlightedCodeBlock`에서 계속 사용하므로 삭제하지 않음

### 1.5 Spec Viewer Layer

- `src/spec-viewer/spec-viewer-panel.tsx`
  - rendered markdown + TOC + 링크/소스 액션
  - (F30) `isActive` prop 기반 `Cmd/Ctrl+F` 핫키 게이트, Spec 탭 활성 상태에서만 검색 바 open/focus/select
  - (F30) raw markdown line scan → rendered `data-source-line` block 매핑으로 검색 결과 계산, 문단/heading/list/code/table 블록 단위 highlight/focus 클래스(`.is-spec-search-match`, `.is-spec-search-focus`) 토글
  - (F30) 검색 결과 수(`0 / 0` 포함) 표시 + next/previous 순환 이동 + focused block `scrollIntoView({ block: 'nearest', inline: 'nearest' })`
  - (F31) search placeholder에 `(* supported)` discoverability 문구 추가, wildcard matcher는 helper 모듈을 통해 ordered token semantics를 재사용
  - `Add Comment`/`Go to Source` source popover
  - same-document anchor(`#heading-id`) 클릭 시 패널 내부 heading scroll 처리(브라우저 기본 이동 차단)
  - comment marker 매핑 렌더 + hover popover
  - spec scroll position capture/restore(런타임)
- `src/spec-viewer/spec-search.ts`
  - (F31) raw markdown line wildcard matcher + block boundary 판정 + matched start line 계산 helper
- `src/spec-viewer/spec-link-utils.ts`
  - 링크 해석 및 line-range 파싱
- `src/spec-viewer/source-line-resolver.ts`
  - selection target source line 해석
- `src/spec-viewer/markdown-security.ts`
  - sanitize/URI 정책

### 1.6 Comment Domain Layer

- `src/code-comments/comment-types.ts`
  - `CodeComment` 타입(`exportedAt` 포함)
- `src/code-comments/comment-anchor.ts`
  - anchor/hash 생성
- `src/code-comments/comment-persistence.ts`
  - parse/serialize
- `src/code-comments/comment-line-index.ts`
  - 파일/라인(startLine 기준) count index + entries index + nearest fallback mapping
- `src/code-comments/comment-hover-popover.tsx`
  - 코드/문서 공용 코멘트 hover preview UI
- `src/code-comments/comment-export.ts`
  - `_COMMENTS.md` 및 bundle 렌더(global comments prepend 포함)
- `src/code-comments/comment-editor-modal.tsx`
- `src/code-comments/export-comments-modal.tsx`
  - export target/길이 가드 + global comments 포함 상태 표시(View Comments 체크박스 상태 반영) + 코멘트 갯수에 global comments 포함 여부 표시(`N comment(s) + global comments included`)
- `src/code-comments/comment-list-modal.tsx`
  - 코멘트 조회/편집/개별삭제/Delete Exported(2-step confirm, 하단 좌측 배치) + global comments 상단 섹션(inline 편집/비우기/저장 + "Include in export" 체크박스) + 코멘트 target 클릭 시 해당 파일/라인으로 점프(모달 닫힘)
- `src/code-comments/global-comments-modal.tsx`
  - 워크스페이스 전역 코멘트 편집/저장

### 1.7 Electron Boundary

- `electron/main.ts`
  - IPC handler, watch lifecycle(native/polling/fallback), export 파일 쓰기, system open
  - `workspace:writeFile` handler: 경로 검증(`isPathInsideWorkspace`), 크기 검사(2MB), atomic write (F24)
  - `workspace:getGitLineMarkers` 단건 diff 조회(`git diff --unified=0 HEAD -- <relativePath>`) + 실패 safe degrade
  - `MAX_WORKSPACE_INDEX_NODES=100000`, `WORKSPACE_INDEX_DIRECTORY_CHILD_CAP=500`, `workspace:indexDirectory` offset/limit 페이지네이션
  - (F29) `workspace:searchFiles` routed handler: rootPath 기준 local/remote backend search 위임 + 공통 result contract 반환
  - `buildDirectoryChildren` + `handleWorkspaceIndexDirectory` (on-demand 디렉토리 IPC)
  - local polling watcher child cap 초과 디렉토리 자동 제외
  - (F25) `workspace:createFile`, `workspace:createDirectory`, `workspace:deleteFile`, `workspace:deleteDirectory` 핸들러: 경로 검증 + 존재 확인 + `beginWorkspaceWriteOperation`/`endWorkspaceWriteOperation`
  - (F25b) `workspace:rename` 핸들러: old/new 경로 검증 + 존재/충돌 확인 + 부모 디렉토리 생성 + `fs.rename`
  - (F26) `workspace:getGitFileStatuses` 핸들러: git 저장소 확인 → `git status --porcelain` → `parseGitStatusPorcelain()` 파싱
  - (F27) `workspace:connectRemote`/`workspace:disconnectRemote` 핸들러 + remote connection event log(`remote-agent.log`) 기록
  - (F28) `workspace:browseRemoteDirectories` 핸들러 + browse request/result log(`remote-agent.log`) 기록
- `electron/workspace-watch-mode.ts`
  - `isRemoteMountedHint` + override 우선순위 기반 watch mode resolver
- `electron/workspace-backend/types.ts` (F27)
  - local/remote 공통 `WorkspaceBackend` 인터페이스 정의
- `electron/workspace-backend/local-workspace-backend.ts` (F27)
  - 기존 로컬 파일/디렉토리/코멘트/watch/git 동작 이관
  - (F29) local handler로 `searchFiles` 노출
- `electron/workspace-backend/remote-workspace-backend.ts` (F27)
  - remote agent RPC를 통한 index/read/write/CRUD/watch/git 경로 구현
  - (F29) `workspace.searchFiles` RPC 브리지
- `electron/workspace-backend/remote-watch-bridge.ts` (F27)
  - 원격 watcher 이벤트를 기존 `workspace:watchEvent` payload로 변환
- `electron/remote-agent/protocol.ts` (F27)
  - 원격 요청/응답/이벤트 타입 + 프로토콜 버전/오류 코드 계약
- `electron/remote-agent/transport-ssh.ts` (F27)
  - SSH 실행/agent bootstrap/세션 생명주기 + timeout/reconnect 관리
- `electron/remote-agent/bootstrap.ts` (F27)
  - 원격 runtime 배포 스크립트 생성/실행 + probe/healthcheck + SSH `identityFile` 옵션 처리
- `electron/remote-agent/directory-browser.ts` (F28)
  - SSH 단발 호출 기반 remote 디렉토리 browse(`DEFAULT_BROWSE_LIMIT=500`, `MAX_BROWSE_LIMIT=5000`, `DEFAULT_BROWSE_TIMEOUT_MS=7000`) + 오류 코드 표준화
- `electron/remote-agent/connection-service.ts` (F27)
  - reconnect/backoff 정책 + session registry 연동 + remote connection event 발행
- `electron/remote-agent/security.ts` (F27)
  - remote root 경계 검증 + 허용 메서드 화이트리스트
- `electron/remote-agent/runtime/*` (F27)
  - remote runtime CLI/요청 라우터/workspace ops/watch ops 구현 + payload 번들
  - watch ops: polling 1500ms, 파일 상한 100,000, symlink 추적 + realpath 순환 방지 집합 적용
- `electron/workspace-search.ts`
  - (F29/F31) 로컬 검색 엔진: depth limit, result cap, large directory skip, time budget, ignore rules, symlink skip 정책을 공통 결과 타입으로 정규화하고, filename substring/`*` wildcard ordered token match를 처리
- `electron/git-line-markers.ts`
  - unified diff hunk 파싱으로 라인 마커(`added`/`modified`) 계산
- `electron/git-file-statuses.ts` (F26)
  - `git status --porcelain` stdout 파싱 → `GitFileStatusMap` (`Record<string, 'added'|'modified'|'untracked'>`)
  - `??` → untracked, `A` → added, `M`/` M`/`MM` → modified, `R`/`C` → added(new path), `D` → skip, `T` → modified
- `electron/preload.ts`
  - `window.workspace` 브리지(`getGitLineMarkers`, `writeFile` 포함)
  - (F25) `createFile`, `createDirectory`, `deleteFile`, `deleteDirectory` 브리지 추가
  - (F25b) `rename` 브리지 추가
  - (F26) `getGitFileStatuses` 브리지 추가
  - (F29) `searchFiles(rootPath, query, options?)` 브리지 추가
- `electron/electron-env.d.ts`
  - renderer 타입 계약(`writeFile` 포함)
  - (F25) CRUD 4개 result 타입 + `WorkspaceApi` 확장
  - (F25b) `WorkspaceRenameResult` + `rename` 메서드 시그니처
  - (F26) `GitFileStatusKind` + `WorkspaceGetGitFileStatusesResult` + `getGitFileStatuses` 메서드 시그니처
  - (F27) remote connection profile(state/error 포함) + connect/disconnect IPC 시그니처
  - (F29) `WorkspaceSearchFileMatch` / `WorkspaceSearchFilesResult` + `searchFiles` 메서드 시그니처

## 2. 테스트 맵(핵심)

- 통합: `src/App.test.tsx` (watch mode UI/fallback/hydrate 시나리오 포함)
- 상태모델: `src/workspace/workspace-model.test.ts`
- 상태 영속화: `src/workspace/workspace-persistence.test.ts`
- spec viewer: `src/spec-viewer/spec-viewer-panel.test.tsx`
- code editor: `src/code-editor/code-editor-panel.test.tsx`, `cm6-selection-bridge.test.ts`, `cm6-language-map.test.ts`, `cm6-git-gutter.test.ts`, `cm6-comment-gutter.test.ts` (F24)
- file tree lazy load: `src/file-tree/file-tree-panel.test.tsx`
- electron resolver: `electron/workspace-watch-mode.test.ts`
- electron git parser: `electron/git-line-markers.test.ts`
- electron git file statuses parser: `electron/git-file-statuses.test.ts` (F26)
- electron remote protocol/transport/security/runtime: `electron/remote-agent/*.test.ts`, `electron/remote-agent/runtime/*.test.ts` (F27)
- electron backend abstraction: `electron/workspace-backend/*.test.ts` (F27)
- syntax highlight: `src/code-viewer/syntax-highlight.test.ts`
- comment 도메인: `comment-anchor/comment-persistence/comment-line-index/comment-export/comment-list-modal` 테스트

## 3. 유지보수 규칙

1. 기능 추가 시 먼저 도메인/상태/뷰 경계를 분리해 배치한다.
2. Renderer 로직 변경은 IPC 계약 변경 여부를 함께 검토한다.
3. comment/export 정책 변경 시 `comment-persistence`와 `App.test.tsx`를 동시에 갱신한다.
4. 상세 파일 인벤토리는 `appendix.md`를 참조한다.
