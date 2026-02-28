# 02. Architecture

## 1. 아키텍처 원칙

- 파일 시스템/OS 접근은 Main 프로세스로 제한
- Renderer는 상태/표시/상호작용에 집중
- Preload를 통한 제한된 IPC surface만 노출
- 멀티 워크스페이스 정책은 active workspace 기준으로 일관 처리

## 2. 런타임 경계

```text
Electron Main
  - open dialog, index/read/write file, watch lifecycle(native/polling), system open, export I/O
  - remote agent session lifecycle(ssh bootstrap/handshake/request routing) (F27, planned)
  - workspace backend routing(local backend / remote backend) (F27, planned)
Preload
  - window.workspace API bridge (typed)
  - remote connection invoke contract bridge (F27, planned)
Renderer (React)
  - WorkspaceProvider + panels(CodeEditorPanel, SpecViewerPanel) + context actions
  - remote connection state + banner rendering (F27, planned)
```

## 3. UI 레이아웃

```text
Header Left: Title + Back/Forward + [Code|Spec] Tab
Header Right: Comments(Add Global/View)
Left Sidebar: Workspace(Selector/Open/Close) + Current Path + Open In + FileTree
Content: Code Editor(CM6) OR Rendered Spec (tab-switched, display:none 방식 비활성 탭 보존)
```

- 2패널 탭 레이아웃: 좌측 사이드바 + 우측 콘텐츠(Code/Spec 탭 전환)
- CSS Grid 2열: `minmax(220px, var(--pane-left)) 12px minmax(360px, var(--pane-content))`
- 리사이저 1개(사이드바 ↔ 콘텐츠)
- 비활성 탭은 `display: none`으로 숨겨 스크롤 위치/상태 보존
- `.md` 파일 선택 시 Spec 탭 자동 전환, 그 외 파일은 Code 탭 자동 전환
- `Cmd+Shift+Left/Right`로 Code/Spec 탭 키보드 전환

## 4. 상태 도메인

### 4.1 Workspace 세션 상태

- `rootPath`, `fileTree`, `expandedDirectories`
- `activeFile`, `activeFileContent`, `activeFileImagePreview`
- `activeFileGitLineMarkers`
- `isDirty` (편집 중 미저장 상태 추적)
- `activeSpec`, `activeSpecContent`
- `selectionRange`, `fileLastLineByPath`
- `changedFiles`, `fileHistory`, `fileHistoryIndex`
- `loadingDirectories`
- `watchModePreference`, `watchMode`, `isRemoteMounted`
- `workspaceKind` (`local | remote`) (F27, planned)
- `remoteProfile`, `remoteConnectionState`, `remoteErrorCode` (F27, planned)
- `comments`, `isReadingComments`, `isWritingComments`, `commentsError`
- `globalComments`, `isReadingGlobalComments`, `isWritingGlobalComments`, `globalCommentsError`

### 4.2 전역 상태

- `activeWorkspaceId`, `workspaceOrder`, `workspacesById`
- `activeTab` (`'code' | 'spec'`): 현재 활성 콘텐츠 탭(워크스페이스별이 아닌 전역 UI 상태)
- UI 보조 상태(`bannerMessage`, `commentBannerState`, `isExportingComments`, comment/global/export modal open state, spec scroll position map)

## 5. 핵심 데이터 플로우

### 5.1 Workspace 부팅/전환

1. `workspace:openDialog`
2. `workspace:index`
3. session 생성 또는 기존 focus
4. watcher 시작(`workspace:watchStart`, preference 전달)
5. Main에서 mode 해석(`mount` 명령 네트워크 FS 감지 + auto -> polling, override 우선)
6. native 실패 시 polling fallback(degraded success) + 배너 안내

### 5.2 파일 읽기/표시

1. 파일 선택 -> `workspace:readFile`
2. 텍스트면 CodeEditorPanel(CM6) 렌더
3. 텍스트 파일이면 `workspace:getGitLineMarkers`로 active file 라인 마커(added/modified)를 조회
4. 이미지면 `imagePreview` 렌더
5. preview 불가면 reason 기반 placeholder 표시
6. Git 조회 실패/비저장소 경로는 마커만 빈 배열로 degrade(배너 없음)

### 5.3 Spec 탐색 점프

1. rendered markdown 링크 인터셉트
2. same-workspace면 file open + optional line jump + Code 탭 자동 전환
3. same-spec source jump는 read/reset을 최소화하고 기존 rendered 문맥을 유지
4. spec panel scrollTop은 `workspace + spec path` 기준으로 런타임 저장/복원
5. external/unresolved면 copy popover
6. selection 우클릭 `Go to Source` -> activeSpec line jump + Code 탭 자동 전환
7. View Comments 코멘트 target 클릭 시 Code 탭 자동 전환 + 코드 라인 점프

### 5.4 File Tree 변경 마커 가시성

1. 변경 파일이 visible이면 파일 노드에 `●` 표시
2. 변경 파일이 collapse된 서브트리에 있으면 nearest visible ancestor 디렉토리에 `●` 버블링
3. 디렉토리 확장 시 마커는 더 하위 visible 노드로 이동

### 5.5 코멘트/내보내기

1. CodeEditor/SpecViewer `Add Comment`
2. `comments.json` 저장(source of truth) + `View Comments` 편집/삭제/Delete Exported 동일 저장 경로 재사용
3. `Add Global Comments`는 `.sdd-workbench/global-comments.md`에 워크스페이스 단위 저장
4. `View Comments`는 line comments 상단에 global comments read-only 섹션을 함께 표시한다.
5. line index(startLine 기준 count + entries) 생성 -> 코드/문서 marker 표시
6. marker hover 시 라인 코멘트 본문 미리보기 popover 표시(read-only)
7. Export 모달에 global comments 포함 여부(`included`/`not included`)를 명시한다.
8. Export 시 Global Comments 선행 prepend + pending-only line comments 처리, target 성공 시 해당 line comment snapshot에만 `exportedAt` 기록
9. 코멘트 액션에서 생성된 배너는 5초 auto-dismiss를 적용하고, 비코멘트 배너는 수동 dismiss를 유지한다.

### 5.8 파일 쓰기/저장 (F24)

1. CM6 에디터에서 편집 → `isDirty` 상태 전환
2. `Cmd+S` → `workspace:writeFile` IPC(atomic write, 경로 경계 검사)
3. 저장 성공 → `isDirty` 해제, watcher 이벤트 무시(self-change)
4. dirty 파일 외부 변경 시 auto-reload 건너뛰기 + "File changed on disk. Reload?" 배너
5. dirty 상태에서 파일 전환/워크스페이스 전환/창 닫기 → confirm dialog

### 5.6 원격 워크스페이스 watcher 모드(F15, Deprecated)

1. `watchModePreference`는 workspace별로 `auto|native|polling` 상태를 유지/복원한다.
2. `auto`는 `mount` 명령 파싱으로 네트워크 FS(`sshfs`, `nfs`, `cifs`, `afpfs`, `webdavfs`, `osxfuse`, `macfuse`, `fuse`)를 감지해 polling을 선택한다.
3. `native|polling` 선택 시 휴리스틱보다 사용자 override가 우선한다.
4. polling 모드는 원격 마운트 5000ms / 로컬 1500ms 간격 메타데이터 diff(`mtimeMs + size`)로 변경 이벤트를 생성한다.
5. watchStart 응답에는 `watchMode`, `isRemoteMounted`, `fallbackApplied`가 포함된다.
6. F15 경로는 레거시로 유지되며 F27 안정화 후 제거(폐기) 대상이다.

### 5.7 대규모 워크스페이스 lazy indexing(F16)

1. 인덱싱 시 디렉토리별 child cap(`WORKSPACE_INDEX_DIRECTORY_CHILD_CAP=500`)을 적용하여 초과 디렉토리는 첫 500개만 로드하고 `partial` 상태로 표시한다.
2. 원격 마운트에서는 추가로 깊이 제한(`WORKSPACE_INDEX_SHALLOW_DEPTH=3`)을 적용해 초기 로드 속도를 확보한다.
3. `not-loaded` 디렉토리를 확장하면 `workspace:indexDirectory` IPC를 통해 on-demand로 자식을 로드한다.
4. polling watcher는 child cap 초과 디렉토리를 자동 제외하여 과대 디렉토리의 반복 스캔을 방지한다.
5. 구조 변경 re-index 시 lazy-loaded 디렉토리는 `not-loaded`로 리셋되고, 사용자가 다시 확장해야 로드된다.

### 5.9 Remote Agent Protocol 원격 워크스페이스 플로우(F27, 📋 Planned)

1. `workspace:connectRemote` 요청으로 원격 연결 프로필(host/user/port/remoteRoot)을 Main에 전달한다.
2. Main은 SSH transport를 통해 원격 agent를 실행하고 protocol handshake를 수행한다.
   (MVP 자동화: agent 존재 확인 -> 없으면 설치 -> 버전 검증)
3. handshake 성공 시 workspace backend를 `remote`로 선택하고 이후 `workspace:index/read/write/watch`를 remote backend로 라우팅한다.
4. 원격 watch 이벤트는 기존 `workspace:watchEvent` payload 계약으로 변환되어 Renderer로 전달된다.
5. 연결 끊김/타임아웃 시 `remoteConnectionState`를 `degraded`/`disconnected`로 갱신하고 사용자 재시도 경로를 노출한다.
6. remote backend는 모든 파일 작업에서 원격 root 경계 검증을 수행한다.
7. 자동 업그레이드/롤백/복수 배포 채널 관리는 MVP 범위에서 제외한다.

## 6. 워크스페이스 경계 규칙

1. 기능 실행 기준은 `activeWorkspaceId`
2. cross-workspace 자동 fallback 미지원
3. 전환 시 공유 금지 상태(selection)는 리셋
4. 세션 상태(active file/spec/expanded/history/comments/globalComments/watch preference)는 workspace별 유지
5. 키보드 전환(`Cmd+Shift+Up/Down`)은 `switchActiveWorkspace`(순서 유지)를 사용하고, 드롭다운 전환은 `setActiveWorkspace`(MRU 재배열)를 사용한다.
6. (F27, planned) remote workspace는 `remoteProfile + remoteRootPath`로 고유 식별하고, 파일 작업은 remote root 바깥으로 이탈할 수 없다.
