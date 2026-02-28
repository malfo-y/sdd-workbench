# 04. Interfaces

## 1. 핵심 타입 계약

```ts
type SelectionState = { startLine: number; endLine: number } | null

type WorkspaceWatchMode = 'native' | 'polling'
type WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'
type WorkspaceKind = 'local' | 'remote'
type RemoteConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'disconnected'
type RemoteErrorCode =
  | 'AUTH_FAILED'
  | 'TIMEOUT'
  | 'AGENT_PROTOCOL_MISMATCH'
  | 'PATH_DENIED'
type RemoteWorkspaceProfile = {
  host: string
  user: string
  port?: number
  remoteRootPath: string
}
type WorkspaceGitLineMarkerKind = 'added' | 'modified'
type WorkspaceGitLineMarker = {
  line: number
  kind: WorkspaceGitLineMarkerKind
}

interface WorkspaceFileNode {
  name: string
  relativePath: string
  type: 'file' | 'directory'
  children?: WorkspaceFileNode[]
  childrenStatus?: 'complete' | 'not-loaded' | 'partial'
  totalChildCount?: number
}

type GitFileStatusKind = 'added' | 'modified' | 'untracked'

type ContentTab = 'code' | 'spec'
type PaneSizes = { left: number; content: number }

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
  }
  createdAt: string
  exportedAt?: string
}
```

핵심 규칙:

1. 라인 번호는 1-based 기준
2. 코멘트 source of truth는 `workspaceRoot/.sdd-workbench/comments.json`
3. global comments source of truth는 `workspaceRoot/.sdd-workbench/global-comments.md`
4. `_COMMENTS.md`는 export 산출물(재생성)이며 source of truth가 아님
5. watcher 선호값(`watchModePreference`)은 workspace 세션 snapshot에 영속화된다.
6. (F27, planned) remote workspace는 `workspaceKind='remote'`와 `remoteProfile`을 갖고, 연결 상태는 `remoteConnectionState`로 관리한다.

## 2. 링크/경로 해석 규칙

지원 패턴:

- `#heading-id`
- `./path/to/file.md`, `../path/to/file.md`
- `path/to/file.ts#Lx`, `path/to/file.ts#Lx-Ly`
- external URI(`https://`, `mailto:` 등)

동작 규칙:

1. same-workspace 상대 링크만 내부 라우팅
2. external/unresolved는 자동 이동 없이 copy popover
3. rendered selection 액션(`Add Comment`, `Go to Source`)은 현재 `activeSpec` 범위에서만 동작
4. same-spec source jump는 가능한 경우 `activeSpecContent`를 재사용해 rendered 패널 리셋을 피한다.
5. rendered spec scroll position은 `workspace + activeSpecPath` 키로 런타임 저장/복원한다.

## 3. IPC 계약

| 채널 | 방향 | 요약 |
|---|---|---|
| `workspace:openDialog` | Renderer -> Main (`invoke`) | 워크스페이스 선택 |
| `workspace:index` | Renderer -> Main (`invoke`) | 파일 트리 인덱싱 (`truncated` 포함) |
| `workspace:readFile` | Renderer -> Main (`invoke`) | 파일 본문/이미지 payload 읽기 |
| `workspace:watchStart` / `workspace:watchStop` | Renderer -> Main (`invoke`) | watcher lifecycle + watch mode resolution |
| `workspace:watchEvent` | Main -> Renderer (`send`) | 변경 파일 + 구조변경 플래그 |
| `workspace:historyNavigate` | Main -> Renderer (`send`) | back/forward 이벤트 |
| `workspace:getGitLineMarkers` | Renderer -> Main (`invoke`) | active file 단건 Git diff line marker 조회 |
| `system:openInIterm` / `system:openInVsCode` | Renderer -> Main (`invoke`) | 외부 툴 열기 |
| `workspace:readComments` | Renderer -> Main (`invoke`) | comments 읽기 |
| `workspace:writeComments` | Renderer -> Main (`invoke`) | comments 쓰기 |
| `workspace:readGlobalComments` | Renderer -> Main (`invoke`) | global comments 읽기 |
| `workspace:writeGlobalComments` | Renderer -> Main (`invoke`) | global comments 쓰기 |
| `workspace:exportCommentsBundle` | Renderer -> Main (`invoke`) | `_COMMENTS.md`/bundle 저장 |
| `workspace:writeFile` | Renderer -> Main (`invoke`) | 파일 저장(atomic write, 경계 검사) (F24) |
| `workspace:indexDirectory` | Renderer -> Main (`invoke`) | on-demand 단일 디렉토리 자식 로드 |
| `workspace:createFile` | Renderer -> Main (`invoke`) | 빈 파일 생성(경계 검사 + 중복 확인) (F25) |
| `workspace:createDirectory` | Renderer -> Main (`invoke`) | 디렉토리 생성(경계 검사 + 중복 확인) (F25) |
| `workspace:deleteFile` | Renderer -> Main (`invoke`) | 파일 삭제(경계 검사 + 파일 확인) (F25) |
| `workspace:deleteDirectory` | Renderer -> Main (`invoke`) | 디렉토리 재귀 삭제(경계 검사 + 디렉토리 확인) (F25) |
| `workspace:rename` | Renderer -> Main (`invoke`) | 파일/디렉토리 이름 변경(경계 검사 + 충돌 확인) (F25b) |
| `workspace:getGitFileStatuses` | Renderer -> Main (`invoke`) | 워크스페이스 전체 Git 파일 상태 조회 (F26) |
| `workspace:connectRemote` | Renderer -> Main (`invoke`) | 원격 연결 프로필로 remote agent 세션 연결 + remote workspace 생성 (F27, planned) |
| `workspace:disconnectRemote` | Renderer -> Main (`invoke`) | remote workspace 세션 종료/정리 (F27, planned) |
| `workspace:remoteConnectionEvent` | Main -> Renderer (`send`) | 원격 연결 상태/오류 코드 이벤트 전달 (F27, planned) |

`workspace:watchStart` 계약 요약:

- request: `{ workspaceId, rootPath, watchModePreference?: 'auto'|'native'|'polling' }`
- response: `{ ok, watchMode?: 'native'|'polling', isRemoteMounted?: boolean, fallbackApplied?: boolean, error?: string }`
- 해석 규칙: `override(native|polling) > auto 휴리스틱(mount 명령 네트워크 FS 감지 => polling)`
- fallback 규칙: `native` 시작 실패 시 `polling`으로 강등 성공 후 `fallbackApplied=true`
- F15(SSHFS 기반) watcher 경로는 deprecated이며 F27 안정화 이후 제거 대상이다.

`workspace:indexDirectory` 계약 요약:

- request: `{ rootPath, relativePath }`
- response: `{ ok, children?: WorkspaceFileNode[], childrenStatus?: 'complete'|'partial', totalChildCount?: number, error?: string }`
- 디렉토리별 child cap(`500`) 적용, 초과 시 `partial` + `totalChildCount` 반환

`workspace:connectRemote` 계약 요약 (F27, planned):

- request: `{ profile: { host: string, user: string, port?: number, remoteRootPath: string } }`
- response: `{ ok: boolean, workspaceId?: string, rootPath?: string, remoteConnectionState?: 'connected'|'degraded', errorCode?: RemoteErrorCode, error?: string }`
- 성공 시 Renderer는 반환된 workspace 식별자를 기준으로 기존 `workspace:index/read/write/watch` 계약을 그대로 사용한다.
- 실패 시 `errorCode`를 우선 해석하고, UI는 배너 + 재시도 액션을 제공한다.
- bootstrap 자동화 범위(MVP): agent 존재 확인 -> 없으면 설치 -> 버전 검증
- 자동 업그레이드/롤백/복수 배포 채널 관리는 MVP 범위에서 제외한다.

`workspace:disconnectRemote` 계약 요약 (F27, planned):

- request: `{ workspaceId: string }`
- response: `{ ok: boolean, errorCode?: RemoteErrorCode, error?: string }`
- 동작: 원격 세션 종료 + watcher 정리 + workspace 상태를 `disconnected`로 전환

`workspace:remoteConnectionEvent` 계약 요약 (F27, planned):

- payload: `{ workspaceId: string, state: RemoteConnectionState, errorCode?: RemoteErrorCode, message?: string }`
- 용도: 연결 수립/강등/끊김을 실시간 반영하여 배너/상태 뱃지 업데이트

원격 오류 코드 규칙 (F27, planned):

- `AUTH_FAILED`: 인증 실패(키/계정/권한)
- `TIMEOUT`: 연결 또는 RPC 응답 시간 초과
- `AGENT_PROTOCOL_MISMATCH`: agent와 클라이언트 프로토콜 버전 불일치
- `PATH_DENIED`: remote root 경계 밖 접근 시도 또는 권한 거부

`workspace:getGitLineMarkers` 계약 요약:

- request: `{ rootPath, relativePath }`
- response: `{ ok, markers: Array<{ line: number; kind: 'added'|'modified' }>, error?: string }`
- 비교 기준: `git diff --no-color --unified=0 HEAD -- <relativePath>`
- 실패/비저장소/`HEAD` 부재/파일 없음은 `ok=false|true` + `markers=[]`로 safe degrade(throw 금지)

`workspace:createFile` 계약 요약 (F25):

- request: `{ rootPath, relativePath }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace` — workspace 바깥 경로 거부
- 중복 검사: 동일 경로에 파일/디렉토리 이미 존재 시 `ok=false`
- 동작: 부모 디렉토리 `mkdir -p` + 빈 파일(`writeFile(path, '')`) 생성
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용

`workspace:createDirectory` 계약 요약 (F25):

- request: `{ rootPath, relativePath }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace`
- 중복 검사: 동일 경로에 파일/디렉토리 이미 존재 시 `ok=false`
- 동작: `mkdir(resolvedPath, { recursive: true })`
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용

`workspace:deleteFile` 계약 요약 (F25):

- request: `{ rootPath, relativePath }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace`
- 존재 확인: `stat` + `isFile()` — 디렉토리면 거부
- 동작: `fs.unlink(resolvedPath)`
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용

`workspace:deleteDirectory` 계약 요약 (F25):

- request: `{ rootPath, relativePath }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace`
- 존재 확인: `stat` + `isDirectory()` — 파일이면 거부
- 동작: `fs.rm(resolvedPath, { recursive: true, force: true })` — 영구 삭제(휴지통 없음, MVP)
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용

`workspace:writeFile` 계약 요약 (F24):

- request: `{ rootPath, relativePath, content: string }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace(rootPath, relativePath)` — workspace 바깥 경로 거부
- 크기 제한: content 2MB 초과 시 거부
- atomic write: `writeFileAtomic` 사용(임시 파일 → rename)
- 에러 시 `ok=false` + `error` 메시지(throw 금지)

`workspace:rename` 계약 요약 (F25b):

- request: `{ rootPath, oldRelativePath, newRelativePath }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace` — old/new 모두 workspace 바깥 경로 거부
- 존재 확인: `stat(oldPath)` 필수 — 존재하지 않으면 `ok=false`
- 충돌 확인: `stat(newPath)` 시 이미 존재하면 `ok=false`
- 동작: 부모 디렉토리 `mkdir -p` + `fs.rename(oldPath, newPath)` (파일/디렉토리 공용)
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용
- Renderer 측 보호: 코멘트가 있는 대상(파일 또는 하위 파일)은 rename 차단, dirty 파일 rename 차단

`workspace:getGitFileStatuses` 계약 요약 (F26):

- request: `{ rootPath }`
- response: `{ ok: boolean, statuses: Record<string, GitFileStatusKind>, error?: string }`
- git 저장소 확인: `git rev-parse --is-inside-work-tree` 실패 시 `{ ok: false, statuses: {} }` (throw 금지)
- 동작: `git status --porcelain` 실행 → `parseGitStatusPorcelain()` 파싱
- 상태 매핑: `??` → `untracked`, `A`/`AM` → `added`, `M`/`MM`/` M` → `modified`, `R`/`C` → `added`(new path), `D` → skip, `T` → `modified`
- 조회 시점: workspace open, hydration, watcher 이벤트 수신, 파일 저장 성공 후
- stale 응답 방지: request ID 패턴 적용

## 4. 코멘트/Export 정책 계약

1. `Add Comment`는 CodeEditor/SpecViewer 모두에서 동일 저장 플로우를 사용한다.
2. `View Comments`는 상단 global comments(read-only) + 하단 line comments 목록을 함께 보여준다. global comments가 존재하면 "Include in export" 체크박스(기본 체크)를 제공한다.
3. `View Comments` 편집/삭제/Delete Exported는 동일 comments 저장 플로우를 재사용한다. `Delete Exported`는 모달 하단 좌측에 배치한다.
4. global comments 빈 값은 `No global comments.` empty 상태 문구로 표시한다.
5. `Delete Exported`는 `exportedAt`가 있는 line comment만 삭제하고 pending comment는 유지한다.
6. Export 기본 동작은 pending comments(`exportedAt` 없음)만 포함한다. 단, View Comments에서 명시적으로 코멘트를 선택한 경우 선택된 코멘트를 모두 export할 수 있으며, 이때 pending/exported 구분은 적용하지 않는다.
7. global comments가 비어있지 않고 "Include in export" 체크박스가 선택된 경우에만 export 문서에 `Global Comments` 섹션을 `Comments` 섹션보다 먼저 배치한다.
8. Export 모달에는 View Comments 체크박스 상태를 반영한 global comments 포함 여부(`included`/`not included`)를 표시한다. 코멘트 갯수 표시 시 global comments가 포함되는 경우 `N comment(s) + global comments included` 형태로 표기한다. export된 `_COMMENTS.md`의 `Total comments` 라인에도 `(+ global comments)` 표기를 추가한다.
9. target 중 1개 이상 성공하면 해당 snapshot line comment에만 `exportedAt`를 기록한다.
10. `MAX_CLIPBOARD_CHARS=30000` 초과 시 clipboard target은 비활성화한다.
11. partial success 시 성공/실패 target을 배너에 분리해 표기한다.
12. 코멘트 액션 경로 배너는 5초 auto-dismiss를 적용하고, 비코멘트 배너는 수동 dismiss를 유지한다.
13. View Comments에서 코멘트의 target 텍스트(파일경로:라인)를 클릭하면, 해당 파일을 열고 코드 뷰어에서 해당 라인으로 스크롤한다. 모달은 자동으로 닫힌다. 점프 대상 파일이 현재 워크스페이스에 없으면 모달만 닫히고 점프는 무시한다.

## 5. 마커 매핑 규칙

1. 코드 뷰어 마커는 코멘트 startLine 기준 line별 count badge + hover preview를 제공한다.
2. rendered markdown 마커는 `data-source-line` 기반 매핑 + hover preview를 제공한다.
3. 매핑 우선순위: exact-match -> nearest fallback
4. nearest 동률이면 더 작은 line 우선
5. hover preview는 최대 3개 코멘트를 표시하고, 초과분은 `+N more`로 요약한다.
6. hover preview는 read-only이며 닫힘 조건은 mouse leave, `Esc`, outside click이다.
7. Git 라인 마커는 active file 기준 line별 `added|modified`만 표시한다.
8. `oldCount=0, newCount>0` hunk는 `added`, `oldCount>0, newCount>0` hunk는 교집합을 `modified`, 초과 new 라인은 `added`로 매핑한다.
9. deletion-only hunk(`newCount=0`)는 MVP에서 표시하지 않는다.
10. image preview/preview unavailable 모드에서는 Git 라인 마커를 렌더하지 않는다.

## 6. 대규모 워크스페이스 lazy indexing 규칙

1. 인덱싱 시 디렉토리별 child cap(`WORKSPACE_INDEX_DIRECTORY_CHILD_CAP=500`)을 적용한다.
2. 원격 마운트(`detectRemoteMountPoint` 기반)에서는 추가로 깊이 제한(`WORKSPACE_INDEX_SHALLOW_DEPTH=3`)을 적용한다.
3. child cap 초과 디렉토리는 첫 500개 항목만 포함하고 `childrenStatus='partial'` + `totalChildCount`를 설정한다.
4. 깊이 제한 도달 디렉토리는 `children=[]`, `childrenStatus='not-loaded'`로 설정한다.
5. `not-loaded` 디렉토리 확장 시 `workspace:indexDirectory`로 on-demand 로드한다.
6. polling watcher는 child cap 초과 디렉토리를 자동 제외하여 과대 디렉토리 반복 스캔을 방지한다.
7. `isFilePathPotentiallyPresent` 헬퍼로 un-indexed 서브트리 내 active file이 re-index 시 클리어되지 않도록 보호한다.

## 7. 파일 트리 변경 마커 가시화 규칙

1. 변경 파일이 현재 visible이면 파일 노드에 `●`를 표시한다.
2. 변경 파일이 collapse된 디렉토리 하위에 있으면 nearest visible collapsed ancestor 디렉토리에 `●`를 표시한다.
3. 디렉토리를 확장하면 마커는 더 하위 visible 노드로 이동한다.

## 8. 코드 뷰어 텍스트 검색 규칙 (F21 커스텀 검색 → F24에서 CM6 `@codemirror/search`로 대체 완료)

> **참고**: F21에서 구현된 커스텀 검색 바(`.code-viewer-search-*`)는 F24에서 CM6 `@codemirror/search` 내장 검색으로 대체 완료. 아래 규칙은 레거시 참조용으로 보존.

1. `Ctrl+F`(또는 `Cmd+F`) 단축키로 검색 바를 토글한다. 이미지 프리뷰/preview unavailable 모드에서는 단축키를 무시한다.
2. 검색 매칭은 현재 파일의 원본 라인 텍스트를 대상으로 substring case-insensitive 방식(`line.toLowerCase().includes(query.toLowerCase())`)으로 수행한다.
3. 매치가 있는 라인에 `.is-search-match` CSS 클래스를 적용하고, 현재 포커스된 매치 라인에 `.is-search-focus`를 추가 적용한다.
4. 이전(▲)/다음(▼) 버튼 또는 `Enter`/`Shift+Enter`로 매치 라인을 순환 이동(`scrollIntoView({ block: 'center' })`)한다. 마지막 매치에서 다음 → 첫 매치로, 첫 매치에서 이전 → 마지막 매치로 wrap-around한다.
5. 검색 바에는 현재 매치 위치를 `N / M` 형식으로 표시하며, 매치 0건일 때 `No results`를 표시한다.
6. `Escape` 또는 닫기 버튼으로 검색 바를 닫으면 모든 검색 하이라이트가 해제된다.
7. activeFile이 변경되면 검색 상태(검색어, 포커스 인덱스, 열림 여부)를 전체 초기화한다.

## 9. 파일 편집/저장/Dirty 상태 규칙 (F24)

1. CM6 에디터에서 `docChanged` 이벤트 발생 시 `isDirty=true`로 전환한다.
2. `Cmd+S`로 수동 저장. auto-save는 지원하지 않는다.
3. 저장 성공 시 `isDirty=false`로 해제한다.
4. dirty 상태에서 파일 전환/워크스페이스 전환/창 닫기 시 confirm dialog를 표시한다.
5. 창 닫기는 `beforeunload` 이벤트로 가드한다.
6. dirty 파일의 외부 변경(watcher) 감지 시 auto-reload를 건너뛰고 "File changed on disk. Reload?" 배너를 표시한다.
7. 배너에서 Reload 선택 시 외부 변경 내용을 반영하고 dirty 해제. Dismiss 시 현재 편집 내용 유지.

## 10. 파일 트리 CRUD 규칙 (F25)

### 컨텍스트 메뉴 구성

| 클릭 대상 | 표시 액션 |
|-----------|-----------|
| 파일 노드 우클릭 | Copy Relative Path, New File (부모 디렉토리), New Directory (부모 디렉토리), Rename, Delete |
| 디렉토리 노드 우클릭 | Copy Relative Path, New File (해당 디렉토리), New Directory (해당 디렉토리), Rename, Delete |
| 빈 영역(트리 하단) 우클릭 | New File (workspace root), New Directory (workspace root) |

### 생성 규칙

1. "New File" / "New Directory" 선택 시 해당 위치 트리 하단에 인라인 입력(`.tree-inline-input`)이 표시된다.
2. Enter → 유효성 검사 → IPC 호출. Escape → 취소.
3. 이름 유효성: 빈 문자열, `/` 포함, `.` 또는 `..` 거부 (Renderer 단 즉시 검사).
4. 파일 생성 성공 시 해당 파일을 자동으로 open(selectFile).
5. 중복 이름 / IPC 에러 시 에러 배너 표시(5초 auto-dismiss).
6. 생성/삭제 후 watcher가 `add`/`unlink`/`addDir`/`unlinkDir` 이벤트를 감지 → `structureChanged=true` → `loadWorkspaceIndex('refresh')` → 트리 자동 갱신.

### 삭제 규칙

1. 파일 삭제: `window.confirm("Delete file \"${fileName}\"?\n\nThis action cannot be undone.")` 확인 후 IPC 호출.
2. 디렉토리 삭제: confirm 후 `fs.rm(..., { recursive: true, force: true })` — 영구 삭제(휴지통 없음, MVP).
3. active file 삭제 시 `activeFile=null`, `activeFileContent=null`, `isDirty=false` 초기화.
4. dirty active file 삭제 시 unsaved changes confirm dialog를 먼저 표시.
5. active file이 삭제된 디렉토리 하위에 있으면 동일하게 상태 초기화.
6. 삭제된 파일에 달린 코멘트는 `comments.json`에 orphaned 상태로 유지(MVP에서 정리 UI 미제공).

### Rename 규칙 (F25b)

1. "Rename" 선택 시 해당 노드 위치에 인라인 입력(`.tree-inline-input`)이 현재 이름 pre-fill 상태로 표시된다.
2. Enter → 유효성 검사(빈 문자열/슬래시/점점 거부) → 이름 변경 시에만 IPC 호출. Escape → 취소.
3. 같은 이름을 입력하면 rename 호출 없이 인라인 입력만 닫힌다.
4. **코멘트 보호**: rename 대상 파일(또는 대상 디렉토리 하위 파일)에 코멘트가 존재하면 rename을 차단하고 에러 배너를 표시한다.
5. **dirty 파일 보호**: active file이 dirty 상태이고 rename 대상과 경로가 일치하면 rename을 차단한다.
6. rename 성공 후 active file 경로 갱신: 직접 rename → 새 경로로 대체, 디렉토리 rename → 하위 파일 prefix 치환(`newRelativePath + activeFile.slice(oldRelativePath.length)`).
7. 빈 영역 우클릭 메뉴에는 "Rename"이 표시되지 않는다.

### Copy Relative Path 동작 (BUG-02 수정 반영)

1. 코드 에디터 우클릭 컨텍스트 메뉴에서 "Copy Relative Path" 선택 시 현재 커서/선택 라인 번호가 포함된 경로를 복사한다.
   - 단일 라인(커서): `src/foo.ts:L42`
   - 다중 라인 선택: `src/foo.ts:L10-L20`
2. 파일 트리 우클릭 또는 코드 에디터 헤더 버튼에서의 "Copy Relative Path"는 라인 번호 없이 상대경로만 복사한다.

## 11. 파일 트리 Git 파일 상태 마커 규칙 (F26)

1. `git status --porcelain` 기반으로 워크스페이스 전체의 파일 상태를 조회하여 파일 트리에 badge를 표시한다.
2. 상태별 badge: **U**(Untracked/Added, 초록 `#73c991`) / **M**(Modified, 주황 `#e2c08d`).
3. 파일 노드: 해당 파일의 git 상태에 따라 U 또는 M badge를 렌더한다.
4. 디렉토리 노드: **접힘(collapsed) 상태일 때만** 하위 파일 중 가장 높은 우선순위 상태의 badge를 버블링 표시한다.
5. 버블링 우선순위: `modified`(2) > `added`/`untracked`(1). 하위에 modified 파일이 하나라도 있으면 M badge.
6. 디렉토리 확장 시 디렉토리 자체의 버블링 badge는 숨기고, 개별 파일/하위 디렉토리의 badge를 표시한다.
7. git 저장소가 아닌 워크스페이스에서는 badge를 표시하지 않는다(`statuses={}` 반환).
8. 기존 watcher 기반 `changedFiles` 마커(주황 `●`)와 독립적으로 공존한다.
9. 조회 시점: workspace open/hydration, watcher 이벤트 수신, 파일 저장 성공 후.
