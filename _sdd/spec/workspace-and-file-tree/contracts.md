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

### 2.1 `workspace:indexDirectory`

- request:
  - `{ rootPath, relativePath, offset?: number, limit?: number }`
- response:
  - `{ ok, children, childrenStatus, totalChildCount, error? }`
- 규칙:
  - 디렉토리 child cap `500`
  - 초과 시 `childrenStatus='partial'`

### 2.2 `workspace:watchStart`

- request:
  - `{ workspaceId, rootPath, watchModePreference?: 'auto'|'native'|'polling' }`
- response:
  - `{ ok, watchMode?, isRemoteMounted?, fallbackApplied?, error? }`
- 규칙:
  - 우선순위는 `override > auto heuristic`
  - native 실패 시 polling fallback 가능

### 2.3 `workspace:searchFiles`

- request:
  - `{ rootPath, query, maxDepth?, maxResults?, maxDirectoryChildren?, timeBudgetMs? }`
- response:
  - `{ ok, results, truncated, skippedLargeDirectoryCount, depthLimitHit, timedOut, error? }`
- 상세 규칙은 [search-rules](../spec-viewer/contracts.md) 참조

### 2.4 파일 클립보드 Copy / Paste

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
