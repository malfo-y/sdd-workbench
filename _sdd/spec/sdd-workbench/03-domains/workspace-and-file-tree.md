# Workspace And File Tree

## 1. 목적

이 문서는 워크스페이스 세션, 파일 트리, 파일 검색, CRUD, git 상태 가시화가 사용자에게 어떻게 보이고 코드에서 어디에 구현되어 있는지 설명한다.

## 2. 사용자 가시 동작

- 여러 워크스페이스를 열고 전환할 수 있다.
- 파일 트리를 펼치고 접고, lazy-loaded 디렉토리를 필요할 때만 확장한다.
- 파일/디렉토리를 생성, 삭제, 이름 변경할 수 있다.
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
- active file/content/dirty/git line marker는 renderer session 상태에서 관리한다.
- active workspace 전환은 드롭다운(MRU 성격)과 키보드 순차 전환(`switchActiveWorkspace`)을 구분한다.

### 4.2 트리와 lazy indexing

- 전체 인덱싱에는 node cap `100000`, 디렉토리 child cap `500`을 적용한다.
- `childrenStatus='not-loaded'|'partial'|'complete'`로 lazy/partial 상태를 구분한다.
- `workspace:indexDirectory`로 단일 디렉토리를 on-demand 로드한다.
- `not-loaded`/`partial` 하위 변경 경로는 힌트 버블링으로 일부 가시성을 유지한다.

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
  - `electron/workspace-backend/local-workspace-backend.ts`
  - `electron/workspace-backend/remote-workspace-backend.ts`

## 6. 관련 계약 문서

- [state-model](../04-contracts/state-model.md)
- [ipc-contracts](../04-contracts/ipc-contracts.md)
- [search-rules](../04-contracts/search-rules.md)

## 7. 핵심 테스트

- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-persistence.test.ts`
- `src/file-tree/file-tree-panel.test.tsx`
- `electron/workspace-search.test.ts`
- `electron/git-file-statuses.test.ts`
- `src/App.test.tsx`

## 8. 변경 시 주의점

- 검색 UX를 바꾸면 backend contract와 partial hint 문구를 같이 보정해야 한다.
- lazy indexing 규칙은 file tree, watcher, remote backend가 함께 의존한다.
- git badge와 changed marker는 별도 상태이므로 하나를 단순 병합하면 안 된다.
