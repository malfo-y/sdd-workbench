# Remote Workspace

## 1. 목적

이 문서는 Remote Agent Protocol 기반 원격 워크스페이스 연결, browse, backend abstraction, 감시 정책을 설명한다.

## 2. 사용자 가시 동작

- 원격 연결 모달에서 접속 정보를 입력하고 원격 워크스페이스를 연다.
- 연결 전에 원격 디렉토리를 browse 해서 `remoteRoot`를 고른다.
- 연결 이후에는 로컬 워크스페이스와 유사하게 파일 읽기/쓰기/감시/git/comments 기능을 사용한다.
- 연결 단절, degraded 상태, retry 가능 여부를 배너/상태로 확인한다.

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
- `electron/remote-agent/runtime/*`

## 6. 관련 계약 문서

- [ipc-contracts](../04-contracts/ipc-contracts.md)
- [state-model](../04-contracts/state-model.md)
- [search-rules](../04-contracts/search-rules.md)

## 7. 핵심 테스트

- `electron/workspace-backend/*.test.ts`
- `electron/remote-agent/*.test.ts`
- `electron/remote-agent/runtime/*.test.ts`
- `electron/workspace-watch-mode.test.ts`
- `src/App.test.tsx`

## 8. 변경 시 주의점

- remote protocol을 바꾸면 preload bridge, renderer helper, spec IPC 문서를 같이 바꿔야 한다.
- local/remote contract 차이가 renderer까지 새어 나오면 이후 기능 추가 비용이 커진다.
