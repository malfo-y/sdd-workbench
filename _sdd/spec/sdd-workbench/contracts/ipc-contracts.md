# IPC Contracts

## 1. 목적

이 문서는 `Renderer <-> Main` invoke/send 채널과 핵심 request/response 계약을 정리한다.

## 2. 채널 개요

| 채널 | 방향 | 용도 |
|---|---|---|
| `workspace:openDialog` | Renderer -> Main (`invoke`) | 워크스페이스 선택 |
| `workspace:index` | Renderer -> Main (`invoke`) | 루트 트리 인덱싱 |
| `workspace:indexDirectory` | Renderer -> Main (`invoke`) | on-demand 디렉토리 자식 로드 |
| `workspace:readFile` | Renderer -> Main (`invoke`) | 파일 내용/이미지 payload 읽기 |
| `workspace:writeFile` | Renderer -> Main (`invoke`) | atomic write 저장 |
| `workspace:createFile` / `workspace:createDirectory` | Renderer -> Main (`invoke`) | 트리 생성 작업 |
| `workspace:deleteFile` / `workspace:deleteDirectory` | Renderer -> Main (`invoke`) | 트리 삭제 작업 |
| `workspace:rename` | Renderer -> Main (`invoke`) | 파일/디렉토리 rename |
| `workspace:watchStart` / `workspace:watchStop` | Renderer -> Main (`invoke`) | watcher lifecycle |
| `workspace:watchEvent` | Main -> Renderer (`send`) | 변경 파일/구조 변경 이벤트 |
| `workspace:getGitLineMarkers` | Renderer -> Main (`invoke`) | active file git diff marker |
| `workspace:getGitFileStatuses` | Renderer -> Main (`invoke`) | 파일 트리 git status badge 데이터 |
| `workspace:searchFiles` | Renderer -> Main (`invoke`) | local/remote 공통 파일명 검색 |
| `workspace:readComments` / `workspace:writeComments` | Renderer -> Main (`invoke`) | line comments 읽기/쓰기 |
| `workspace:readGlobalComments` / `workspace:writeGlobalComments` | Renderer -> Main (`invoke`) | global comments 읽기/쓰기 |
| `workspace:exportCommentsBundle` | Renderer -> Main (`invoke`) | `_COMMENTS.md`/bundle 저장 |
| `workspace:setFileClipboard` | Renderer -> Main (`invoke`) | 파일 클립보드에 복사 항목 설정 |
| `workspace:readFileClipboard` | Renderer -> Main (`invoke`) | 클립보드 소스 확인 (internal/finder/none) |
| `workspace:copyEntries` | Renderer -> Main (`invoke`) | 파일/디렉토리 복사 실행 |
| `workspace:pasteFromClipboard` | Renderer -> Main (`invoke`) | 클립보드에서 대상 디렉토리에 붙여넣기 |
| `workspace:browseRemoteDirectories` | Renderer -> Main (`invoke`) | 연결 전 remote directory browse |
| `workspace:connectRemote` / `workspace:disconnectRemote` | Renderer -> Main (`invoke`) | remote session lifecycle |
| `workspace:remoteConnectionEvent` | Main -> Renderer (`send`) | remote 상태/오류 이벤트 |
| `workspace:historyNavigate` | Main -> Renderer (`send`) | back/forward 요청 |
| `system:openInIterm` / `system:openInVsCode` / `system:openInFinder` | Renderer -> Main (`invoke`) | workspace-aware 외부 도구 열기 (local: 직접 열기, remote: SSH/Remote-SSH) |
| `workspace:syncVsCodeSshConfig` | Renderer -> Main (`invoke`) | VSCode Remote-SSH용 `~/.ssh/sdd-workbench.config` Host 블록 동기화 |
| `appearance-theme:menu-request` | Main -> Renderer (`send`) | native theme menu 선택 전달 |
| `appearance-theme:changed` | Renderer -> Main (`send`) | renderer current theme 통지 |

## 3. 핵심 request/response 요약

### 3.1 `workspace:indexDirectory`

- request:
  - `{ rootPath, relativePath, offset?: number, limit?: number }`
- response:
  - `{ ok, children, childrenStatus, totalChildCount, error? }`
- 규칙:
  - 디렉토리 child cap `500`
  - 초과 시 `childrenStatus='partial'`

### 3.2 `workspace:watchStart`

- request:
  - `{ workspaceId, rootPath, watchModePreference?: 'auto'|'native'|'polling' }`
- response:
  - `{ ok, watchMode?, isRemoteMounted?, fallbackApplied?, error? }`
- 규칙:
  - 우선순위는 `override > auto heuristic`
  - native 실패 시 polling fallback 가능

### 3.3 `workspace:searchFiles`

- request:
  - `{ rootPath, query, maxDepth?, maxResults?, maxDirectoryChildren?, timeBudgetMs? }`
- response:
  - `{ ok, results, truncated, skippedLargeDirectoryCount, depthLimitHit, timedOut, error? }`
- 상세 규칙은 [search-rules](./search-rules.md) 참조

### 3.4 `workspace:connectRemote`

- request:
  - `{ profile: { workspaceId, host, remoteRoot, user?, port?, agentPath?, identityFile?, requestTimeoutMs?, connectTimeoutMs? } }`
- response:
  - `{ ok, workspaceId?, sessionId?, rootPath?, remoteConnectionState?, state?, errorCode?, error? }`

### 3.5 `workspace:browseRemoteDirectories`

- request:
  - `{ request: { host, user?, port?, identityFile?, targetPath?, connectTimeoutMs?, limit? } }`
- response:
  - `{ ok, currentPath, entries, truncated, errorCode?, error? }`

### 3.6 `system:openInIterm` / `system:openInVsCode` / `system:openInFinder`

- request:
  - `{ rootPath, workspaceKind?: 'local'|'remote', remoteProfile?: { workspaceId, host, remoteRoot, user?, port?, identityFile?, sshAlias? } }`
- response:
  - `{ ok, error? }`
- 규칙:
  - `workspaceKind === 'remote'`일 때 `rootPath`의 로컬 `stat` 검증을 건너뛴다.
  - remote iTerm: AppleScript로 신규 세션을 열고 SSH 명령(`ssh -p PORT user@host -t "cd remoteRoot && exec $SHELL -l"`)을 실행한다.
  - remote VSCode: `sshAlias` 필수. `vscode-remote://ssh-remote+{sshAlias}{remoteRoot}` URI로 Remote-SSH 창을 연다.
  - remote Finder: unsupported — `{ ok: false, error: 'Open in Finder is unavailable for remote workspace.' }` 반환.
  - macOS 전용. 다른 플랫폼에서는 `{ ok: false }` 반환.

### 3.7 `workspace:syncVsCodeSshConfig`

- request:
  - `{ sshAlias, host, user?, port?, identityFile? }`
- response:
  - `{ ok, configPath?, managedConfigPath?, includeInserted?, entryUpdated?, error? }`
- 규칙:
  - `~/.ssh/sdd-workbench.config`에 관리형 Host 블록을 생성/갱신한다.
  - `~/.ssh/config` 최상단에 `Include ~/.ssh/sdd-workbench.config`을 삽입한다 (Host 블록 내부에 들어가면 OpenSSH가 무시하므로).
  - `sshAlias`는 공백 불가. `port`는 1~65535 정수.
  - SSH directory(0o700)와 config 파일(0o600) 권한을 보장한다.

### 3.8 파일 클립보드 Copy / Paste

**`workspace:setFileClipboard`**
- request: `{ rootPath, paths: { relativePath, kind }[] }`
- response: `{ ok, error? }`
- 규칙: main process 모듈 상태에 복사 항목을 저장한다. 워크스페이스 전환 시에도 유지된다.

**`workspace:readFileClipboard`**
- request: (없음)
- response: `{ ok, hasFiles, source: 'internal'|'finder'|'none', error? }`
- 규칙: 내부 클립보드 우선, 없으면 macOS Finder `NSFilenamesPboardType` 확인.

**`workspace:copyEntries`**
- request: `{ rootPath, entries: { relativePath, kind }[], destDir }`
- response: `{ ok, copiedPaths?, error? }`
- 규칙: `BackendRouter.resolveByRootPath(rootPath)`로 local/remote 올바른 백엔드에 라우팅. 이름 충돌 시 `incrementFileName`으로 자동 넘버링.

**`workspace:pasteFromClipboard`**
- request: `{ rootPath, destDir, isRemote? }`
- response: `{ ok, pastedPaths?, source: 'internal'|'finder'|'none', error? }`
- 규칙:
  - 로컬: Finder 클립보드 우선 확인 → 내부 클립보드 fallback.
  - 원격: Finder 소스만 있고 내부 클립보드 없으면 `{ ok: false, source: 'finder' }` 반환 (Finder paste는 로컬 전용).
  - 원격 내부 클립보드는 정상 동작.

## 4. 공통 안전 규칙

1. filesystem write는 모두 workspace 경계 검증을 거친다.
2. invoke handler는 실패 시 throw보다 `{ ok: false, error }` 형태의 safe degrade를 우선한다.
3. renderer는 local/remote backend 차이를 IPC surface 뒤에 숨긴다.
4. typed preload bridge와 spec 계약은 함께 갱신한다.

## 5. 관련 구현 파일

- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `electron/system-open.ts`
- `electron/vscode-ssh-config.ts`
- `electron/workspace-backend/types.ts`
- `electron/workspace-backend/local-workspace-backend.ts`
- `electron/workspace-backend/remote-workspace-backend.ts`
- `electron/file-clipboard.ts`
- `electron/increment-file-name.ts`
- `electron/workspace-backend/copy-entries.ts`
- `electron/workspace-backend/backend-router.ts`

## 6. 관련 테스트

- `electron/workspace-backend/*.test.ts`
- `electron/workspace-watch-mode.test.ts`
- `electron/system-open.test.ts`
- `electron/vscode-ssh-config.test.ts`
- `electron/file-clipboard.test.ts`
- `electron/increment-file-name.test.ts`
- `electron/workspace-backend/copy-entries.test.ts`
- `electron/workspace-backend/backend-router.test.ts`
- `src/App.test.tsx`
