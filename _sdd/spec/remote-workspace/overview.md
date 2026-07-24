# Remote Workspace

## 1. 목적

이 문서는 Remote Agent Protocol 기반 원격 워크스페이스 연결, browse, backend abstraction, 감시 정책을 설명한다.

## 2. 사용자 가시 동작

- 원격 연결 모달에서 접속 정보를 입력하고 원격 워크스페이스를 연다.
- 연결 전에 원격 디렉토리를 browse 해서 `remoteRoot`를 고른다.
- 연결 이후에는 로컬 워크스페이스와 유사하게 파일 읽기/쓰기/감시/git/comments/파일 복사(copyEntries) 기능을 사용한다.
- 프로젝트 텍스트 검색은 로컬과 같은 `workspace:searchText` renderer surface로 사용하며, remote agent runtime의 `workspace.searchText`가 원격 파일 내용을 scan한다.
- 원격 워크스페이스에서 현재 보고 있는 active file/spec의 content-only 외부 변경은 focused fast lane을 통해 전체 workspace polling보다 빠르게 감지된다.
- 연결 단절, degraded 상태, retry 가능 여부를 배너/상태로 확인한다.
- 파일 브라우저에서 `disconnected` 원격 워크스페이스의 파일을 선택하거나 lazy 디렉토리를 확장하면 저장된 원격 프로필로 먼저 재연결한다. reconnect 중 추가 사용자 액션은 같은 setup 완료를 기다리고, 실제 연결 상태가 사용 가능한 경우에만 파일 열기 또는 디렉토리 자식 로드를 이어간다. 디렉토리 확장을 기다리는 동안 다시 collapse하면 최신 의도를 우선해 닫힌 상태를 유지하고 자식을 로드하지 않는다. 세부 판정과 호출 순서는 workspace core의 [`workspace:readFile`](../workspace-and-file-tree/contracts.md#21-workspacereadfile) 및 [`workspace:indexDirectory`](../workspace-and-file-tree/contracts.md#22-workspaceindexdirectory) 계약을 따른다.
- 원격 워크스페이스에서 `Open in iTerm`을 누르면 SSH 접속 후 `remoteRoot`에서 셸이 시작된다.
- 원격 워크스페이스에서 `Open in VSCode`를 누르면 VS Code Remote-SSH authority로 `remoteRoot`를 연다 (`sshAlias` 필수).
- 원격 워크스페이스에서 `Open in Finder`를 누르면 unsupported 안내 메시지를 배너로 보여준다.
- 원격 연결 모달에서 `sshAlias`를 입력하고, VSCode SSH config 자동 동기화를 선택할 수 있다.
- 장기 실행 remote agent SSH 연결은 connection sharing/multiplexing을 비활성화한 전용 transport를 사용한다. 응답 불능 상태가 되면 이 transport의 OpenSSH keepalive가 약 4초 내 process exit를 유도하고, 앱은 이를 `disconnected` 상태와 재시도 가능한 오류로 표시한다.

## 3. 핵심 상태와 source of truth

- renderer 상태:
  - `src/workspace/workspace-context.tsx`
- main/backend:
  - `electron/main.ts`
  - `electron/workspace-backend/types.ts`
  - `electron/workspace-backend/local-workspace-backend.ts`
  - `electron/workspace-backend/remote-workspace-backend.ts`
- remote agent:
  - `electron/remote-agent/protocol.ts`
  - `electron/remote-agent/transport-ssh.ts`
  - `electron/remote-agent/bootstrap.ts`
  - `electron/remote-agent/connection-service.ts`
  - `electron/remote-agent/runtime/*`

## 4. 핵심 규칙

### 4.1 연결과 browse

- browse는 연결 전 SSH 단발 요청으로 수행한다.
- connect는 remote agent bootstrap, healthcheck, 버전 검증을 포함한다.
- `identityFile`이 있으면 SSH에 `-i ... -o IdentitiesOnly=yes`를 적용한다.
- 장기 실행 remote agent transport에는 `-S none`으로 connection sharing/multiplexing을 비활성화하고 `ServerAliveInterval=2`, `ServerAliveCountMax=1`을 적용한다. 따라서 감시 대상 transport는 기존 `ControlMaster`/`ControlPersist` 연결을 재사용하지 않는다. browse/bootstrap 같은 단발 SSH 요청에는 이 정책을 적용하지 않는다.

### 4.2 backend abstraction

- renderer는 local/remote 차이를 `workspace:*` contract 뒤에 숨긴다.
- main process가 `WorkspaceBackend` 구현체를 골라 동일한 invoke surface를 유지한다.
- project text search도 같은 backend abstraction을 따르며, remote backend는 `workspace.searchText` RPC를 remote agent runtime에 위임한다.
- renderer가 active file/spec에서 파생한 focused path update도 같은 backend abstraction을 따르며, local backend는 no-op, remote backend는 `workspace.watchSetFocusedPaths` RPC로 위임한다.
- `copyEntries`도 동일한 추상화를 따른다. remote backend는 `workspace.copyEntries` RPC를 remote agent runtime에 위임한다.
- macOS Finder 클립보드 붙여넣기는 로컬 전용이다. 원격 워크스페이스에서 Finder 소스만 있으면 안내 메시지를 반환한다.

### 4.3 외부 도구 실행 정책

- 원격 워크스페이스의 외부 도구 실행은 `remoteProfile`(host/user/port/identityFile/remoteRoot/sshAlias)을 source of truth로 사용한다. `remote://...` canonical path를 로컬 경로로 `stat`하지 않는다.
- iTerm: AppleScript로 신규 세션을 만들고 SSH 명령을 주입한다. `identityFile`이 있으면 `-i ... -o IdentitiesOnly=yes`를 적용한다.
- VSCode: `sshAlias` 기반 `vscode-remote://ssh-remote+{alias}{path}` URI로 Remote-SSH 창을 연다. `sshAlias` 누락 시 사용자 안내 메시지를 반환한다.
- Finder: 원격 지원 불가. 명시적 unsupported 메시지를 반환한다.
- VSCode SSH config 자동 동기화: `~/.ssh/sdd-workbench.config`에 관리형 Host 블록을 유지하고 `~/.ssh/config` 최상단에 Include를 삽입한다.
- macOS 전용. 다른 플랫폼에서는 미지원 메시지를 반환한다.

### 4.4 watch / scale / fallback

- remote runtime polling watcher는 `1500ms`, 파일 상한 `100000`, symlink 추적을 사용한다.
- remote runtime은 focused active file/spec metadata를 `400ms` fast lane으로 별도 검사한다. 이 경로는 기존 `workspace.watchEvent` payload를 재사용하고 content-only 변경은 `hasStructureChanges=false`로 보낸다.
- focused path set은 connected/degraded remote workspace의 active file과 active spec에서 파생되며, focus 이동, remote disconnect/non-remote 전환, watcher stop/restart 시 빈 목록으로 정리된다.
- inactive files, directory structure refresh, tree hydration, remote git status refresh는 기존 damped watcher policy를 유지한다.
- remote project text search는 local scanner와 같은 guardrail 기본값과 partial flag shape를 사용한다. 세부 request/result 계약은 [workspace-and-file-tree/contracts.md](../workspace-and-file-tree/contracts.md)의 `workspace:searchText`를 따른다.
- 연결 실패/강등은 오류 코드와 함께 renderer로 이벤트를 보낸다.
- keepalive가 응답 없는 장기 SSH 연결을 종료하면 기존 process-exit 경로를 재사용해 `session.disconnected`와 renderer `CONNECTION_CLOSED` 상태 전이로 전파한다.
- SSH process exit, stdin/stdout/stderr stream error, pending RPC 실패는 모두 `CONNECTION_CLOSED` 단절 경로로 정규화한다. 단절 이벤트는 세션당 한 번만 emit하고, 명시적 disconnect/shutdown 중 뒤늦게 도착한 stream error는 무시한다.
- F15 SSHFS 경로는 이력으로 남기되, 현재 active 경로는 F27 remote-protocol 단일 경로다.

## 5. 주요 코드

- `electron/main.ts`
- `electron/workspace-backend/types.ts`
- `electron/workspace-backend/local-workspace-backend.ts`
- `electron/workspace-backend/remote-workspace-backend.ts`
- `electron/remote-agent/protocol.ts`
- `electron/remote-agent/transport-ssh.ts`
- `electron/remote-agent/bootstrap.ts`
- `electron/remote-agent/directory-browser.ts`
- `electron/remote-agent/connection-service.ts`
- `electron/remote-agent/security.ts`
- `electron/remote-agent/runtime/*` (incl. `copy-ops.ts`: remote copyEntries 구현)
- `electron/workspace-backend/remote-watch-bridge.ts`
- `electron/workspace-search.ts`
- `electron/system-open.ts`
- `electron/vscode-ssh-config.ts`

## 6. 관련 계약 문서

- [remote ipc-contracts (본 컴포넌트 contracts)](./contracts.md)
- [state-model](../code-editor/contracts.md)
- [search-rules](../spec-viewer/contracts.md)

## 7. 핵심 테스트

- `electron/workspace-backend/*.test.ts`
- `electron/remote-agent/*.test.ts`
- `electron/remote-agent/runtime/*.test.ts`
- `electron/workspace-watch-mode.test.ts`
- `electron/system-open.test.ts`
- `electron/vscode-ssh-config.test.ts`
- `src/workspace/remote-connect-modal.test.tsx`
- `src/App.test.tsx`

## 8. 변경 시 주의점

- remote protocol을 바꾸면 preload bridge, renderer helper, spec IPC 문서를 같이 바꿔야 한다.
- local/remote contract 차이가 renderer까지 새어 나오면 이후 기능 추가 비용이 커진다.
