# 02. Architecture

## 1. 아키텍처 원칙

- 파일 시스템/OS 접근은 Main 프로세스로 제한
- Renderer는 상태/표시/상호작용에 집중
- Preload를 통한 제한된 IPC surface만 노출
- 멀티 워크스페이스 정책은 active workspace 기준으로 일관 처리

## 2. 런타임 경계

```text
Electron Main
  - open dialog, index/read file, watch lifecycle, system open, export I/O
Preload
  - window.workspace API bridge (typed)
Renderer (React)
  - WorkspaceProvider + panels + context actions
```

## 3. UI 레이아웃

```text
Header: Back/Forward | Workspace Switcher | Close/Open Workspace
Left: Current Workspace + Open In + FileTree
Center: Code Preview (text/image/unavailable)
Right: Rendered Spec (TOC + link/source actions)
```

## 4. 상태 도메인

### 4.1 Workspace 세션 상태

- `rootPath`, `fileTree`, `expandedDirectories`
- `activeFile`, `activeFileContent`, `activeFileImagePreview`
- `activeSpec`, `activeSpecContent`
- `selectionRange`, `fileLastLineByPath`
- `changedFiles`, `fileHistory`, `fileHistoryIndex`
- `comments`, `isReadingComments`, `isWritingComments`, `commentsError`

### 4.2 전역 상태

- `activeWorkspaceId`, `workspaceOrder`, `workspacesById`
- UI 보조 상태(`bannerMessage`, `isExportingComments`)

## 5. 핵심 데이터 플로우

### 5.1 Workspace 부팅/전환

1. `workspace:openDialog`
2. `workspace:index`
3. session 생성 또는 기존 focus
4. watcher 시작(`workspace:watchStart`)

### 5.2 파일 읽기/표시

1. 파일 선택 -> `workspace:readFile`
2. 텍스트면 CodeViewer line 렌더
3. 이미지면 `imagePreview` 렌더
4. preview 불가면 reason 기반 placeholder 표시

### 5.3 Spec 탐색 점프

1. rendered markdown 링크 인터셉트
2. same-workspace면 file open + optional line jump
3. external/unresolved면 copy popover
4. selection 우클릭 `Go to Source` -> activeSpec line jump

### 5.4 코멘트/내보내기

1. CodeViewer/SpecViewer `Add Comment`
2. `comments.json` 저장(source of truth)
3. line index 생성 -> 코드/문서 marker 표시
4. Export 시 pending-only 선택 -> target 성공 시 `exportedAt` 기록

## 6. 워크스페이스 경계 규칙

1. 기능 실행 기준은 `activeWorkspaceId`
2. cross-workspace 자동 fallback 미지원
3. 전환 시 공유 금지 상태(selection)는 리셋
4. 세션 상태(active file/spec/expanded/history/comments)는 workspace별 유지
