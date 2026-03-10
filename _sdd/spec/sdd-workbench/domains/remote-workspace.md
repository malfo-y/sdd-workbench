# Remote Workspace

## 1. 목적

이 문서는 Remote Agent Protocol 기반 원격 워크스페이스 연결, browse, backend abstraction, 감시 정책을 설명한다.

## 2. 사용자 가시 동작

- 원격 연결 모달에서 접속 정보를 입력하고 원격 워크스페이스를 연다.
- 연결 전에 원격 디렉토리를 browse 해서 `remoteRoot`를 고른다.
- 연결 이후에는 로컬 워크스페이스와 유사하게 파일 읽기/쓰기/감시/git/comments/파일 복사(copyEntries) 기능을 사용한다.
- 연결 단절, degraded 상태, retry 가능 여부를 배너/상태로 확인한다.
- 원격 워크스페이스에서 `Open in iTerm`을 누르면 SSH 접속 후 `remoteRoot`에서 셸이 시작된다.
- 원격 워크스페이스에서 `Open in VSCode`를 누르면 VS Code Remote-SSH authority로 `remoteRoot`를 연다 (`sshAlias` 필수).
- 원격 워크스페이스에서 `Open in Finder`를 누르면 unsupported 안내 메시지를 배너로 보여준다.
- 원격 연결 모달에서 `sshAlias`를 입력하고, VSCode SSH config 자동 동기화를 선택할 수 있다.

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

### 4.2 backend abstraction

- renderer는 local/remote 차이를 `workspace:*` contract 뒤에 숨긴다.
- main process가 `WorkspaceBackend` 구현체를 골라 동일한 invoke surface를 유지한다.
- `copyEntries`도 동일한 추상화를 따른다. remote backend는 `workspace.copyEntries` RPC를 remote agent runtime에 위임한다.
- macOS Finder 클립보드 붙여넣기는 로컬 전용이다. 원격 워크스페이스에서 Finder 소스만 있으면 안내 메시지를 반환한다.

### 4.4 외부 도구 실행 정책

- 원격 워크스페이스의 외부 도구 실행은 `remoteProfile`(host/user/port/identityFile/remoteRoot/sshAlias)을 source of truth로 사용한다. `remote://...` canonical path를 로컬 경로로 `stat`하지 않는다.
- iTerm: AppleScript로 신규 세션을 만들고 SSH 명령을 주입한다. `identityFile`이 있으면 `-i ... -o IdentitiesOnly=yes`를 적용한다.
- VSCode: `sshAlias` 기반 `vscode-remote://ssh-remote+{alias}{path}` URI로 Remote-SSH 창을 연다. `sshAlias` 누락 시 사용자 안내 메시지를 반환한다.
- Finder: 원격 지원 불가. 명시적 unsupported 메시지를 반환한다.
- VSCode SSH config 자동 동기화: `~/.ssh/sdd-workbench.config`에 관리형 Host 블록을 유지하고 `~/.ssh/config` 최상단에 Include를 삽입한다.
- macOS 전용. 다른 플랫폼에서는 미지원 메시지를 반환한다.

### 4.3 watch / scale / fallback

- remote runtime polling watcher는 `1500ms`, 파일 상한 `100000`, symlink 추적을 사용한다.
- 연결 실패/강등은 오류 코드와 함께 renderer로 이벤트를 보낸다.
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
- `electron/system-open.ts`
- `electron/vscode-ssh-config.ts`

## 6. 관련 계약 문서

- [ipc-contracts](../contracts/ipc-contracts.md)
- [state-model](../contracts/state-model.md)
- [search-rules](../contracts/search-rules.md)

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
