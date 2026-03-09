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
| `workspace:browseRemoteDirectories` | Renderer -> Main (`invoke`) | 연결 전 remote directory browse |
| `workspace:connectRemote` / `workspace:disconnectRemote` | Renderer -> Main (`invoke`) | remote session lifecycle |
| `workspace:remoteConnectionEvent` | Main -> Renderer (`send`) | remote 상태/오류 이벤트 |
| `workspace:historyNavigate` | Main -> Renderer (`send`) | back/forward 요청 |
| `system:openInIterm` / `system:openInVsCode` | Renderer -> Main (`invoke`) | 외부 도구 열기 |
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

## 4. 공통 안전 규칙

1. filesystem write는 모두 workspace 경계 검증을 거친다.
2. invoke handler는 실패 시 throw보다 `{ ok: false, error }` 형태의 safe degrade를 우선한다.
3. renderer는 local/remote backend 차이를 IPC surface 뒤에 숨긴다.
4. typed preload bridge와 spec 계약은 함께 갱신한다.

## 5. 관련 구현 파일

- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `electron/workspace-backend/types.ts`
- `electron/workspace-backend/local-workspace-backend.ts`
- `electron/workspace-backend/remote-workspace-backend.ts`

## 6. 관련 테스트

- `electron/workspace-backend/*.test.ts`
- `electron/workspace-watch-mode.test.ts`
- `src/App.test.tsx`
