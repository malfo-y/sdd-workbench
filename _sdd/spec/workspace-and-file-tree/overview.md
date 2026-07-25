# Workspace And File Tree

## 1. 목적

이 문서는 워크스페이스 세션, 파일 트리, 파일 검색, CRUD, git 상태 가시화가 사용자에게 어떻게 보이고 코드에서 어디에 구현되어 있는지 설명한다.

## 2. 사용자 가시 동작

- 여러 워크스페이스를 열고 전환할 수 있다.
- 파일 트리를 펼치고 접고, lazy-loaded 디렉토리를 필요할 때만 확장한다.
- 연결이 끊긴 원격 워크스페이스에서 파일을 선택하면 저장된 프로필로 재연결한 뒤 선택한 파일 열기를 이어간다.
- 파일/디렉토리를 생성, 삭제, 이름 변경할 수 있다.
- 파일/디렉토리를 트리에서 복사(Cmd+C / 컨텍스트 메뉴)하고 붙여넣기(Cmd+V / 컨텍스트 메뉴)할 수 있다. macOS Finder 클립보드도 로컬 워크스페이스에서 지원한다.
- 파일 브라우저 검색으로 로컬/원격 워크스페이스 전체에서 파일명을 찾을 수 있다.
- changed marker(`●`)와 git file status badge(`U`, `M`)를 통해 트리 상태를 빠르게 파악한다.

## 3. 핵심 상태와 source of truth

- renderer source of truth:
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/workspace-model.ts`
- 영속화:
  - `src/workspace/workspace-persistence.ts`
- 트리 UI:
  - `src/file-tree/file-tree-panel.tsx`
- 검색 backend:
  - `electron/workspace-search.ts`
  - `electron/workspace-backend/local-workspace-backend.ts`
  - `electron/workspace-backend/remote-workspace-backend.ts`

## 4. 핵심 규칙

### 4.1 세션과 active file

- 워크스페이스 상태는 `workspaceId` 기준으로 분리한다.
- active file/content/dirty/git line marker는 renderer session 상태에서 보이지만, text/markdown draft/save state는 path-keyed document session으로 관리한다.
- active workspace 전환은 드롭다운(MRU 성격)과 키보드 순차 전환(`switchActiveWorkspace`)을 구분한다.
- `Open workspaces` selector는 워크스페이스를 선택하거나 바깥을 누르면 닫힌다.
- 각 항목의 `X`는 해당 워크스페이스만 제거하고, async close가 진행 중인 동안에는 비활성화되어 같은 workspace의 중복 close 요청을 허용하지 않는다. 남은 항목이 있으면 갱신된 selector를 계속 열어 둔다.
- 마지막 워크스페이스를 제거하면 selector의 open state를 초기화하고 zero-workspace UI로 전환한다. 이후 워크스페이스를 다시 추가해도 selector는 닫힌 상태에서 시작한다.
- text/markdown 문서의 내용 lifecycle은 `activeFileContent`/`activeSpecContent` 같은 탭별 필드가 아니라 path-keyed `document session`으로 통합한다.
- `activeFile`/`activeSpec`는 navigation pointer로 유지하되, `savedContent`/`draftContent`/`saveState(clean|dirty|saving|conflict)`가 문서 상태의 source of truth가 된다.
- runtime document session cache는 기본적으로 앱 재시작 persistence 범위에 포함하지 않는다(unsaved draft 복원은 기본 범위 밖).

### 4.2 트리와 lazy indexing

- 전체 인덱싱에는 node cap `100000`, 디렉토리 child cap `500`을 적용한다.
- `childrenStatus='not-loaded'|'partial'|'complete'`로 lazy/partial 상태를 구분한다.
- `workspace:indexDirectory`로 단일 디렉토리를 on-demand 로드한다.
- `not-loaded`/`partial` 하위 변경 경로는 힌트 버블링으로 일부 가시성을 유지한다.
- lazy file tree index는 트리 가시성과 탐색을 위한 상태이며, spec citation navigation 같은 직접 file read 경로의 절대 게이트는 아니다.

### 4.3 파일 검색

- 검색은 현재 로드된 트리를 훑지 않고 backend contract를 사용한다.
- 기본 보호값:
  - depth limit `20`
  - result cap `200`
  - large-directory child cap `10000`
  - time budget `2000ms`
- partial 결과는 UI 힌트로 드러내고, 클릭 시 ancestor directory를 best-effort로 확장한다.

### 4.4 CRUD / Rename / Git badge

- 파일/디렉토리 생성/삭제/rename은 모두 IPC를 통해 수행한다.
- rename은 코멘트 존재 경로와 dirty active file에 대해 차단 규칙이 있다.
- git file status는 `git status --porcelain` 결과를 `added|modified|untracked`로 정규화해 U/M badge로 보여준다.

### 4.5 파일 클립보드 Copy / Paste

- 내부 클립보드: 파일 트리에서 Cmd+C 또는 컨텍스트 메뉴 "Copy"로 항목을 선택하면 main process 모듈 상태에 저장한다. Cmd+V 또는 "Paste"로 대상 디렉토리에 복사한다.
- macOS Finder 클립보드: `electron-clipboard-ex`의 `readFilePaths()`로 native NSPasteboard에 직접 접근해 Finder에서 복사한 파일도 붙여넣기 할 수 있다. **로컬 워크스페이스 전용** — 원격 워크스페이스에서 Finder 소스 paste를 시도하면 안내 배너를 보여준다.
- 이름 충돌 해결: 대상 디렉토리에 동명 파일이 있으면 `name (1).ext` 형태로 자동 넘버링한다 (`incrementFileName`).
- 파일 복사 백엔드: `WorkspaceBackend.copyEntries()`가 local/remote 공통으로 재귀 복사를 수행한다. `BackendRouter`가 `rootPath` 기준으로 올바른 백엔드에 라우팅한다.
- 트리 갱신: paste 후 새 파일은 기존 watch 이벤트를 통해 파일 트리에 반영된다.

## 5. 주요 코드

- 상태
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/workspace-model.ts`
  - `src/workspace/workspace-persistence.ts`
- UI
  - `src/file-tree/file-tree-panel.tsx`
  - `src/workspace/workspace-switcher.tsx`
- Electron / backend
  - `electron/main.ts`
  - `electron/workspace-search.ts`
  - `electron/git-file-statuses.ts`
  - `electron/file-clipboard.ts`: 클립보드 상태, Finder 읽기, IPC 핸들러
  - `electron/increment-file-name.ts`: 이름 충돌 자동 넘버링
  - `electron/workspace-backend/copy-entries.ts`: 로컬 재귀 복사
  - `electron/workspace-backend/local-workspace-backend.ts`
  - `electron/workspace-backend/remote-workspace-backend.ts`

## 6. 관련 계약 문서

- [ipc-contracts (본 컴포넌트 contracts)](./contracts.md)
- [state-model](../code-editor/contracts.md)
- [search-rules](../spec-viewer/contracts.md)

## 7. 핵심 테스트

- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-persistence.test.ts`
- `src/file-tree/file-tree-panel.test.tsx`
- `electron/workspace-search.test.ts`
- `electron/git-file-statuses.test.ts`
- `electron/file-clipboard.test.ts`
- `electron/increment-file-name.test.ts`
- `electron/workspace-backend/copy-entries.test.ts`
- `src/App.test.tsx`

## 8. 변경 시 주의점

- 검색 UX를 바꾸면 backend contract와 partial hint 문구를 같이 보정해야 한다.
- lazy indexing 규칙은 file tree, watcher, remote backend가 함께 의존한다.
- git badge와 changed marker는 별도 상태이므로 하나를 단순 병합하면 안 된다.
