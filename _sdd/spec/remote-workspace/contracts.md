# IPC Contracts — Remote Workspace

이 문서는 `Renderer <-> Main` invoke/send 채널 중 원격 연결, browse, system open, SSH config 관련 IPC 계약을 정리한다.

워크스페이스 핵심 작업(인덱싱, 파일 CRUD, watcher, Git, 검색, 코멘트, 클립보드) IPC는 [workspace-and-file-tree/contracts.md](../workspace-and-file-tree/contracts.md)에 있다.

## 1. 채널 개요

| 채널 | 방향 | 용도 |
|---|---|---|
| `workspace:browseRemoteDirectories` | Renderer -> Main (`invoke`) | 연결 전 remote directory browse |
| `workspace:connectRemote` / `workspace:disconnectRemote` | Renderer -> Main (`invoke`) | remote session lifecycle |
| `workspace:remoteConnectionEvent` | Main -> Renderer (`send`) | remote 상태/오류 이벤트 |
| `system:openInIterm` / `system:openInVsCode` / `system:openInFinder` | Renderer -> Main (`invoke`) | workspace-aware 외부 도구 열기 (local: 직접 열기, remote: SSH/Remote-SSH) |
| `workspace:syncVsCodeSshConfig` | Renderer -> Main (`invoke`) | VSCode Remote-SSH용 `~/.ssh/sdd-workbench.config` Host 블록 동기화 |
| `appearance-theme:menu-request` | Main -> Renderer (`send`) | native theme menu 선택 전달 |
| `appearance-theme:changed` | Renderer -> Main (`send`) | renderer current theme 통지 |

Remote agent runtime allowlist includes `workspace.searchText` for project text search parity and `workspace.watchSetFocusedPaths` for focused remote watcher updates. The renderer-facing IPC remains under the shared `workspace:*` surface; full request/result details live in [workspace-and-file-tree/contracts.md](../workspace-and-file-tree/contracts.md).

## 2. 핵심 request/response 요약

### 2.1 `workspace:connectRemote`

- request:
  - `{ profile: { workspaceId, host, remoteRoot, user?, port?, agentPath?, identityFile?, requestTimeoutMs?, connectTimeoutMs? } }`
- response:
  - `{ ok, workspaceId?, sessionId?, rootPath?, remoteConnectionState?, state?, errorCode?, error? }`
- 연결 중/이후 SSH process 또는 stdin/stdout/stderr stream이 예기치 않게 실패하면 pending RPC는 `CONNECTION_CLOSED`로 reject 되고, main process는 `workspace:remoteConnectionEvent`를 `state='disconnected'`, `errorCode='CONNECTION_CLOSED'`로 보낸다.
- 같은 단절 원인에서 `session.disconnected`는 한 번만 전파된다. 명시적 `workspace:disconnectRemote` 또는 shutdown 중 도착한 late stream error는 앱 크래시나 추가 단절 이벤트를 만들지 않는다.

### 2.2 `workspace:browseRemoteDirectories`

- request:
  - `{ request: { host, user?, port?, identityFile?, targetPath?, connectTimeoutMs?, limit? } }`
- response:
  - `{ ok, currentPath, entries, truncated, errorCode?, error? }`

### 2.3 `system:openInIterm` / `system:openInVsCode` / `system:openInFinder`

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

### 2.4 `workspace:syncVsCodeSshConfig`

- request:
  - `{ sshAlias, host, user?, port?, identityFile? }`
- response:
  - `{ ok, configPath?, managedConfigPath?, includeInserted?, entryUpdated?, error? }`
- 규칙:
  - `~/.ssh/sdd-workbench.config`에 관리형 Host 블록을 생성/갱신한다.
  - `~/.ssh/config` 최상단에 `Include ~/.ssh/sdd-workbench.config`을 삽입한다 (Host 블록 내부에 들어가면 OpenSSH가 무시하므로).
  - `sshAlias`는 공백 불가. `port`는 1~65535 정수.
  - SSH directory(0o700)와 config 파일(0o600) 권한을 보장한다.

### 2.5 Remote `workspace.searchText`

- remote RPC method:
  - `workspace.searchText`
- forwarded params:
  - `{ query }`
- result:
  - Same shape as renderer `workspace:searchText` success result.
- 규칙:
  - remote backend validates the request root against the remote session root before forwarding.
  - remote runtime uses the shared workspace text scanner and returns the same partial flags as local search.
  - detailed search semantics, caps, and exclusions are defined by `workspace:searchText` in [workspace-and-file-tree/contracts.md](../workspace-and-file-tree/contracts.md), not duplicated here.

### 2.6 Remote `workspace.watchSetFocusedPaths`

- remote RPC method:
  - `workspace.watchSetFocusedPaths`
- forwarded params:
  - `{ focusedRelativePaths }`
- result:
  - `{ ok: true }`
- 규칙:
  - remote backend validates the request root against the remote session root before forwarding.
  - remote runtime accepts workspace-relative focused paths only; empty path, absolute path, and root-escape path are rejected or excluded at the runtime boundary.
  - the focused fast lane checks active file/spec metadata at `400ms` and emits the existing `workspace.watchEvent` shape with `hasStructureChanges=false` for content-only focused changes.
  - focused fast lane events do not increase directory structure, inactive-file, or remote git status refresh frequency.

## 3. 공통 안전 규칙

1. filesystem write는 모두 workspace 경계 검증을 거친다.
2. invoke handler는 실패 시 throw보다 `{ ok: false, error }` 형태의 safe degrade를 우선한다.
3. renderer는 local/remote backend 차이를 IPC surface 뒤에 숨긴다.
4. typed preload bridge와 spec 계약은 함께 갱신한다.
5. Remote SSH transport의 process/stdio 오류는 renderer에 raw stream exception으로 새지 않고 remote connection state/error code로 정규화한다.

## 4. 관련 구현 파일

- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `electron/system-open.ts`
- `electron/vscode-ssh-config.ts`
- `electron/remote-agent/protocol.ts`
- `electron/remote-agent/transport-ssh.ts`
- `electron/remote-agent/bootstrap.ts`
- `electron/remote-agent/connection-service.ts`
- `electron/remote-agent/security.ts`
- `electron/remote-agent/runtime/request-router.ts`
- `electron/remote-agent/runtime/watch-ops.ts`
- `electron/remote-agent/runtime/workspace-ops.ts`
- `electron/remote-agent/runtime/generated-payload.ts`

## 5. 관련 테스트

- `electron/remote-agent/*.test.ts`
- `electron/remote-agent/runtime/*.test.ts`
- `electron/workspace-backend/remote-workspace-backend.test.ts`
- `electron/system-open.test.ts`
- `electron/vscode-ssh-config.test.ts`
- `src/workspace/remote-connect-modal.test.tsx`
- `src/App.test.tsx`
