# IPC Contracts — Workspace Core

이 문서는 `Renderer <-> Main` invoke/send 채널 중 워크스페이스 핵심 작업(인덱싱, 파일 CRUD, watcher, Git, 검색, 코멘트, 클립보드, 히스토리)에 해당하는 IPC 계약을 정리한다.

원격 연결/browse/system open 관련 IPC는 [remote-workspace/contracts.md](../remote-workspace/contracts.md)에 있다.

## 1. 채널 개요

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
| `workspace:historyNavigate` | Main -> Renderer (`send`) | back/forward 요청 |

## 2. 핵심 request/response 요약

### 2.0 Renderer index lifecycle

- 최초 local/remote workspace connect는 `reset` mode로 index를 교체하며 기존 active file/spec, expanded directory, selection 상태를 초기화한다.
- 명시적 refresh는 `refresh` mode로 현재 renderer session을 보존·조정하고, root index에 없는 expanded directory를 background에서 비동기 hydration한다.
- user-action reconnect는 `reconnect` mode로 현재 renderer session을 보존·조정한다. root-only remote index를 받은 뒤 기존 expanded directory를 depth order로 다시 hydration하며, 이 hydration이 끝날 때까지 reconnect setup 및 이를 기다리는 파일 선택/디렉토리 확장을 완료하지 않는다.

### 2.1 `workspace:readFile`

- request:
  - `{ rootPath, relativePath }`
- response:
  - `{ ok, content, imagePreview?, previewUnavailableReason?, error? }`
- 파일 선택 규칙:
  - user-action connection guard의 synchronous direct path는 local 또는 실제 renderer 상태가 `connected`/`degraded`인 원격 세션만 허용한다. 추적 중인 reconnect가 없는 `connecting`/미확정 원격 상태는 usable connection으로 간주하지 않으며 read를 호출하지 않는다.
  - active remote session이 `disconnected`이면 renderer는 해당 세션에 저장된 `remoteProfile`로 `workspace:connectRemote`를 먼저 호출한다. 같은 workspace에서 이미 user-action reconnect가 진행 중이면 추가 파일 선택/디렉토리 확장은 그 in-flight 작업을 공유하고 setup 완료까지 기다린다.
  - in-flight reconnect 확인은 `connected`/`degraded` fast path보다 먼저 수행한다. 따라서 reconnect 도중 renderer 상태가 일시적으로 usable해 보여도 queued user action은 index/watcher setup을 포함한 재연결 작업 완료 전에 진행하지 않는다.
  - reconnect index는 기존 active file/spec와 expanded directory를 보존·조정하고, expanded directory hydration을 완료한 뒤 대기 중인 파일 선택을 이어간다. 따라서 root-only remote index가 반환되어도 현재 파일과 펼친 ancestor가 중간에 닫히지 않는다.
  - 재연결 후 read 여부는 하위 reconnect helper 반환값이 아니라 재시도 완료 시점의 실제 renderer session 상태로 결정한다.
  - 실제 상태가 `connected` 또는 `degraded`이면 최초 선택의 `relativePath`와 history mode를 보존해 `workspace:readFile`을 정확히 한 번 호출한다. watcher/index setup 실패로 helper가 `false`를 반환해도 실제 상태가 사용 가능하면 read한다.
  - 실제 상태가 `connected`/`degraded`가 아니면 `workspace:readFile`을 호출하지 않는다. helper가 `true`를 반환했더라도 reconnect setup 중 단절 이벤트가 도착해 실제 상태가 다시 `disconnected`가 된 경우도 동일하다.
  - 재연결 뒤 파일 read가 실패하면 재연결/read를 반복하지 않는다. 성공한 원격 연결은 유지하고 기존 파일 읽기 오류 surface로 실패를 표시한다.

### 2.2 `workspace:indexDirectory`

- request:
  - `{ rootPath, relativePath, offset?: number, limit?: number }`
- response:
  - `{ ok, children, childrenStatus, totalChildCount, error? }`
- 규칙:
  - 디렉토리 child cap `500`
  - 초과 시 `childrenStatus='partial'`
  - 사용자가 `not-loaded` 디렉토리를 확장하는 경로는 [파일 선택의 actual-state user-action guard](#21-workspacereadfile)를 공통으로 사용한다. local 및 `connected`/`degraded` 원격 세션은 direct path를 유지하고, 실제 renderer 상태가 `disconnected`인 원격 세션만 저장된 `remoteProfile`로 재연결한다.
  - file tree는 lazy load를 시작하기 전에 해당 `relativePath`의 expanded intent를 기록하며, synchronous direct path는 이 intent에서 바로 진행한다.
  - reconnect index는 기존 expanded directory의 children을 임시 보존한 뒤 root부터 depth order로 다시 `workspace:indexDirectory` hydration하여 연결이 끊긴 동안의 추가/삭제를 최신 tree에 반영한다.
  - async connection guard가 끝났을 때도 해당 `relativePath`가 최신 expanded intent에 남아 있는 경우에만 확장을 이어간다. reconnect hydration이 그 경로를 이미 성공적으로 로드했다면 triggering directory load를 중복 호출하지 않고, 아직 로드하지 않았다면 `workspace:indexDirectory`를 한 번 호출한다.
  - reconnect 대기 중 사용자가 같은 경로를 collapse하면 최신 intent를 우선해 collapsed 상태를 유지하고 `workspace:indexDirectory`를 호출하지 않는다. connection guard가 실패하거나 usable하지 않은 상태로 끝난 경우도 호출하지 않는다.
  - watcher가 내부적으로 수행하는 expanded-directory hydration은 사용자 액션 guard의 대상이 아니며 자동 재연결을 시작하지 않는다.

### 2.3 `workspace:watchStart`

- request:
  - `{ workspaceId, rootPath, watchModePreference?: 'auto'|'native'|'polling' }`
- response:
  - `{ ok, watchMode?, isRemoteMounted?, fallbackApplied?, error? }`
- 규칙:
  - 우선순위는 `override > auto heuristic`
  - native 실패 시 polling fallback 가능

### 2.4 `workspace:searchFiles`

- request:
  - `{ rootPath, query, maxDepth?, maxResults?, maxDirectoryChildren?, timeBudgetMs? }`
- response:
  - `{ ok, results, truncated, skippedLargeDirectoryCount, depthLimitHit, timedOut, error? }`
- 상세 규칙은 [search-rules](../spec-viewer/contracts.md) 참조

### 2.5 파일 클립보드 Copy / Paste

**`workspace:setFileClipboard`**
- request: `{ rootPath, paths: { relativePath, kind }[] }`
- response: `{ ok, error? }`
- 규칙: main process 모듈 상태에 복사 항목을 저장한다. 워크스페이스 전환 시에도 유지된다.

**`workspace:readFileClipboard`**
- request: (없음)
- response: `{ ok, hasFiles, source: 'internal'|'finder'|'none', error? }`
- 규칙: 내부 클립보드 우선, 없으면 macOS Finder 클립보드 확인 (`electron-clipboard-ex` native 접근).

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

## 3. 공통 안전 규칙

1. filesystem write는 모두 workspace 경계 검증을 거친다.
2. invoke handler는 실패 시 throw보다 `{ ok: false, error }` 형태의 safe degrade를 우선한다.
3. renderer는 local/remote backend 차이를 IPC surface 뒤에 숨긴다.
4. typed preload bridge와 spec 계약은 함께 갱신한다.

## 4. 관련 구현 파일

- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `electron/workspace-backend/types.ts`
- `electron/workspace-backend/local-workspace-backend.ts`
- `electron/workspace-backend/remote-workspace-backend.ts`
- `electron/file-clipboard.ts`
- `electron/increment-file-name.ts`
- `electron/workspace-backend/copy-entries.ts`
- `electron/workspace-backend/backend-router.ts`

## 5. 관련 테스트

- `electron/workspace-backend/*.test.ts`
- `electron/workspace-watch-mode.test.ts`
- `electron/file-clipboard.test.ts`
- `electron/increment-file-name.test.ts`
- `electron/workspace-backend/copy-entries.test.ts`
- `electron/workspace-backend/backend-router.test.ts`
- `src/App.test.tsx`
