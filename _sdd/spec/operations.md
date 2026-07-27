# Operations and Validation

## 1. 성능 기준

- 파일 트리 초기 렌더 cap: 10,000
- 인덱싱 cap: 100,000 (`truncated` 배너 표시)
- 코드 프리뷰 제한: 2MB 초과 시 preview unavailable
- 하이라이트(Shiki 비동기)는 file content/language 변경 시에만 수행하며, 완료 전까지 plaintext fallback 표시
- watcher 이벤트는 debounce 처리
- local polling watcher는 기본 1500ms 간격으로 메타데이터 diff(`mtimeMs + size`)를 수행
- local polling watcher는 child cap(`500`) 초과 디렉토리를 자동 제외하여 과대 디렉토리 반복 스캔을 방지
- remote runtime polling watcher는 기본 1500ms 간격 메타데이터 diff(`mtimeMs + size`) + 파일 상한 100,000 + symlink 추적(realpath 순환 방지) 정책을 사용
- 파일 트리 changed marker 버블링 계산은 1-pass(O(n)) 기준으로 유지
- 디렉토리별 child cap(`WORKSPACE_INDEX_DIRECTORY_CHILD_CAP=500`) 적용으로 과대 디렉토리 cap 처리
- `not-loaded` 디렉토리 on-demand 확장은 `workspace:indexDirectory` IPC 단건 호출
- Git line marker 조회는 active file 단건(`workspace:getGitLineMarkers`)으로 제한하고 전체 트리 diff 스캔은 금지
- (F27) remote agent 연결 타임아웃 기본값: `REMOTE_AGENT_CONNECT_TIMEOUT_MS=10000`
- (F27) remote RPC 요청 타임아웃 기본값: `REMOTE_AGENT_REQUEST_TIMEOUT_MS=15000`
- (F27) remote 연결 자동 재시도 기본값: `REMOTE_AGENT_RECONNECT_ATTEMPTS=3`
- (F27) remote agent bootstrap 자동화는 MVP 범위로 제한하며, 현재 구현은 연결 시 runtime 배포(덮어쓰기) + 실행 가능 여부/버전 검증을 수행한다.
- (F28) remote directory browse 기본값: `DEFAULT_BROWSE_LIMIT=500`, `MAX_BROWSE_LIMIT=5000`, `DEFAULT_BROWSE_TIMEOUT_MS=7000`

## 2. 보안 기준

- `contextIsolation` 유지 + preload 경유 API만 노출
- 파일 읽기 시 workspace 경계 검증
- markdown 렌더는 sanitize allowlist 강제
- 로컬 리소스는 workspace 내부 상대경로만 허용
- `data:` URI는 `data:image/*`만 제한 허용
- (F27) remote agent 메서드는 허용된 RPC 목록만 실행(화이트리스트)
- (F27) remote 파일 작업은 `remoteRoot` 경계 검증을 통과한 상대경로만 허용
- (F27) 인증/연결 실패 원인은 표준 오류 코드로만 노출하고 민감정보(키 경로/비밀번호)는 로그/배너에 출력하지 않음

## 3. 신뢰성 기준

- open/index/read/watch/comments/export 실패 시 앱 크래시 없이 배너 피드백
- global comments read/write 실패 시 모달을 유지해 즉시 재시도 가능해야 한다.
- watcher는 open 시 시작, close/unmount 시 정리
- `auto` + `isRemoteMountedHint` 해석(local=false, remote=true)으로 watch mode를 결정하고, 수동 override(`native|polling`)가 우선한다.
- native watcher 시작 실패 시 polling fallback으로 degraded success를 유지한다.
- active file 변경 이벤트는 자동 re-read
- Git line marker 조회 실패/비저장소 경로/`HEAD` 부재는 UI 크래시 없이 marker 비표시로 degrade한다.
- same-spec source jump는 rendered spec 패널 콘텐츠/스크롤 문맥을 유지해야 한다.
- same-document heading jump는 normalized heading id + heading text fallback으로 처리해야 한다.
- spec scroll position은 `workspaceId + activeSpecPath` 기준으로 persistence되어 앱 재시작 후에도 복원되어야 한다.
- 세션 복원은 부분 실패 continue 정책
- 종료 경로는 write settle(max 5s) 후 watcher 종료(timeout 1.5s)
- (F27) remote 연결 상태는 `connecting -> connected -> degraded/disconnected` 상태 머신으로 관리한다.
- (F27) 재시도 한도 초과 시 자동 재시도를 중단하고 명시적 사용자 재시도 액션으로 전환한다.
- (F27) remote 프로토콜 버전 불일치 시 기능 강등 없이 즉시 연결 실패 처리(`AGENT_PROTOCOL_MISMATCH`)
- (F27) remote SSH child process와 stdio stream 오류는 앱 크래시 없이 `CONNECTION_CLOSED` 단절 이벤트로 정규화하고, 명시적 shutdown 중 late stream error는 무시한다.
- (F27) 장기 remote agent SSH transport는 `-S none`으로 connection sharing/multiplexing을 비활성화한 전용 연결에서 `ServerAliveInterval=2`, `ServerAliveCountMax=1`을 사용한다. 응답 없는 연결은 약 4초 내 process exit로 수렴하고 기존 이벤트 경로가 renderer 상태를 `disconnected`로 전환한다. bootstrap/browse 단발 SSH 요청은 이 정책에서 제외한다.
- (BUG-05/BUG-06) disconnected remote file-open과 lazy directory expansion은 workspace core의 [`workspace:readFile`](./workspace-and-file-tree/contracts.md#21-workspacereadfile) 및 [`workspace:indexDirectory`](./workspace-and-file-tree/contracts.md#22-workspaceindexdirectory) user-action guard를 따른다. reconnect는 renderer session을 보존·조정하고 expanded directory hydration을 기다리며, 최초 connect만 session을 reset한다.
- (F27) F15(SSHFS 기반) 연결 경로는 폐기되었고 remote-protocol 단일 경로를 사용한다.
- (F28) remote directory browse 실패(`AUTH_FAILED`/`TIMEOUT`/`PATH_DENIED` 등)는 연결 실패와 분리해 모달 내 고정 오류로 표시한다.
- swipe history는 supported macOS 계열 플랫폼에서만 활성화하고, 비지원 플랫폼에서는 `app-command` 경로만 유지한다.

## 4. 테스트 운영

### 4.1 자동 게이트

- **Remote reconnect session-preservation gate (2026-07-27)**
  - `npm test` -> `80 files passed, 945 passed, 1 skipped`
  - `npm run lint` -> pass
  - `npx tsc --noEmit` -> pass
  - root-only remote index를 기준으로 reconnect했을 때 active file과 expanded ancestor가 유지되고, 펼친 디렉토리의 단절 중 추가/삭제가 hydration으로 반영되며, reconnect hydration이 이미 성공한 triggering directory load는 중복 호출되지 않는지 검증한다. 기존 shared reconnect, collapse intent, reconnect/index/read 실패 동작도 함께 회귀 검증한다.
- **Workspace selector close-menu targeted gate (2026-07-25)**
  - `rtk npm test -- --run src/App.test.tsx -t "supports multi-workspace switch, duplicate focus, close, and selection reset"` -> `1 file passed, 1 passed, 169 skipped (170 total)`
  - `rtk npm test -- --run src/workspace/workspace-switcher.test.tsx` -> `1 file passed, 2 passed`
  - `rtk npm test -- --run src/App.test.tsx` -> `1 file passed, 169 passed, 1 skipped (170 total)`
  - `rtk npm test` -> `80 files passed, 943 passed, 1 skipped`
  - `rtk npm run lint` -> pass
  - TypeScript validation -> no errors
  - 여러 워크스페이스가 열린 selector에서 항목 `X`를 누르면 selector가 유지되고 닫힌 항목만 사라지며 나머지 항목이 계속 표시되는지 검증한다. async close 중 같은 항목의 중복 요청 차단과 마지막 workspace 제거 후 selector open state 초기화도 포함한다.
- **Remote file-open + directory-expand reconnect targeted gate (2026-07-24)**
  - `rtk npm test -- --run src/App.test.tsx -t "<10 reconnect test names>"` -> `1 file passed, 10 passed, 160 skipped (170 total)`
  - `rtk npm test -- --run src/file-tree/file-tree-panel.test.tsx` -> `1 file passed, 50 passed`
  - `rtk npm test -- --run src/App.test.tsx` -> `1 file passed, 169 passed, 1 skipped (170 total)`
  - `rtk npm test` -> `79 files passed, 941 passed, 1 skipped`
  - `rtk npm run lint` -> pass
  - TypeScript validation -> no errors
  - workspace core의 [`workspace:readFile`](./workspace-and-file-tree/contracts.md#21-workspacereadfile) 및 [`workspace:indexDirectory`](./workspace-and-file-tree/contracts.md#22-workspaceindexdirectory) 원격 재연결 회귀 10건을 검증한다. 추가 review-fix 시나리오는 reconnect setup 중 두 번째 사용자 액션이 조기 read하지 않는 경우와, expand 후 reconnect 대기 중 collapse한 디렉토리가 닫힌 상태를 유지하며 자식을 로드하지 않는 경우다.
- **Remote disconnect targeted gate (2026-07-23)**
  - `npx vitest run electron/remote-agent/transport-ssh.test.ts src/App.test.tsx` -> `2 files passed, 175 passed, 1 skipped`
  - `npm run lint` -> pass
  - SSH argument의 전용 연결(`-S none`) + keepalive 조합, 실제 SSH transport 경계의 예기치 않은 process exit -> `disconnected`/`CONNECTION_CLOSED` 이벤트, renderer 상태/메시지 반영을 자동 검증한다.
- **Current verified run (2026-04-15, Node 25.2.1 / npm 11.12.1)**
  - `npm test` -> `79 files, 899 passed, 1 skipped`
  - `npm run lint` -> pass
- **Release baseline (2026-03-02, Node 20.x baseline)**
  - `npm test` -> `49 files, 493 passed, 1 skipped`
  - `npm run lint` -> pass
  - `npm run build` -> pass
- **Interpretation**
  - 현재 트리에서 Node 25.x의 test/lint 경로는 다시 녹색이다.
  - release gate는 lint/build를 다시 같은 환경에서 검증하기 전까지 Node 20.x baseline을 canonical로 유지한다.

### 4.2 권장 검증 순서

1. 링크/라인 매핑 단위 테스트
2. 상태 전이/세션 복원 통합 테스트
3. IPC 경계 스모크 테스트
4. comments export/marker 회귀 테스트

### 4.3 수동 스모크 체크

1. 멀티 워크스페이스 추가/전환/닫기: selector 항목 선택과 바깥 클릭은 메뉴를 닫고, 항목 `X`는 pending 동안 비활성화되어 중복 close를 막으면서 남은 워크스페이스가 있으면 갱신된 메뉴를 유지하고, 마지막 항목 제거 후 다시 추가했을 때 selector가 닫힌 상태인지 확인
2. Code/Spec 탭 전환(클릭 + `Cmd+Shift+Left/Right`) + 탭 전환 시 스크롤 위치 유지 확인
3. watcher 변경 마커 및 active file 자동 반영
4. collapse 상태에서 변경 마커가 상위 디렉토리로 버블링되는지 확인(`not-loaded`/`partial` lazy 디렉토리 포함)
5. rendered spec 중간 위치에서 `Go to Source` 후 scroll 문맥 유지 + same-document anchor(`#heading`) 클릭 시 normalized heading jump / TOC active heading / 앱 재시작 후 scroll restore 확인
6. Back/Forward(mouse/app-command) 동작 + supported macOS 계열 플랫폼에서만 swipe/wheel history가 동작하는지 확인
7. CodeViewer/SpecViewer에서 Add Comment + marker 표시
8. View Comments에서 edit/delete/Delete Exported 동작 + header drag/clamp/reopen reset + 실패 시 모달 유지 확인
9. Add Global Comments 저장/복원 + document/section heading organization + recent revision restore + draggable header 이후에도 textarea 입력/저장이 유지되는지 확인
10. Export Comments pending-only/re-export/reset 경로 + draggable header 이후 checkbox/input/export 흐름 + actual export snapshot 기준 clipboard disable + `exportedAt` 기록 확인
11. CodeViewer/SpecViewer marker hover preview(`+N more`) -> detail panel -> `Edit/Delete` 흐름 확인
12. 헤더 compact action(`icon + short label`) 및 협소 폭 icon-only 접근성(`title`/`aria-label`) 확인
13. 로컬 워크스페이스에서 watch mode `Auto` 기본값이 `native`로 선택되는지 확인
14. watch mode를 `Native/Polling`으로 변경했을 때 override 우선 적용 확인
15. native 실패 시 polling fallback 배너 노출 및 변경 감지 유지 확인
16. remote workspace 연결 시 watch mode가 `polling`으로 표시되고 `REMOTE` 배지가 표시되는지 확인
17. 코멘트 액션 배너 및 remote 연결/폴백 배너가 5초 후 자동 dismiss되고 `Dismiss`로 즉시 닫히는지 확인
18. `View Comments` 상단 global comments(inline edit/clear/save/empty), `Export Comments`의 global 포함 상태(`included`/`not included`) 표기를 확인
19. 대규모 워크스페이스에서 초기 인덱싱 시 node cap(100,000) + child cap(500) 적용 확인
20. `not-loaded` 디렉토리 확장 시 on-demand 로드 + "Loading..." placeholder 동작 확인
21. `partial` 디렉토리에 "Showing N of M items" cap 메시지 표시 확인
22. local polling watcher가 child cap 초과 디렉토리를 제외하고 스캔하는지 확인
23. 텍스트 파일에서 Git added(초록)/modified(파랑) 라인 마커가 표시되고, 이미지/preview unavailable에서는 비표시인지 확인
24. 워크스페이스 2개 이상에서 `Cmd+Shift+Down`(다음)/`Cmd+Shift+Up`(이전) 전환 확인 + 순서 미변경 + wrap-around 확인
25. 워크스페이스 1개일 때 `Cmd+Shift+Up/Down` 무동작 확인
26. `.md` 파일 선택 시 Spec 탭 자동 전환, 비-`.md` 파일 선택 시 Code 탭 자동 전환 확인
27. spec 링크 점프/Go to Source/코멘트 target 클릭 시 Code 탭 자동 전환 확인
28. 워크스페이스 관리(선택기/Open/Close)가 사이드바에 표시되고 헤더에 없는지 확인
29. 리사이저 1개(사이드바 ↔ 콘텐츠)로 좌우 비율 조정 동작 확인
30. CM6 에디터에서 텍스트 편집 후 `isDirty` 인디케이터(파일명 옆 `●`) 표시 확인
31. `Cmd+S`로 저장 → dirty 해제 + watcher 이벤트 무시(self-change 방지) 확인
32. dirty 상태에서 다른 파일 전환 시 confirm dialog 표시 확인
33. dirty 파일의 외부 변경 감지 시 "File changed on disk. Reload?" 배너 표시 확인
34. CM6 `Cmd+F` 내장 검색이 정상 동작하고 match 이동/wrap-around가 되는지 확인
35. CM6 gutter에 Git added(초록)/modified(파랑) dot 마커가 표시되는지 확인
36. CM6 gutter에 코멘트 badge가 표시되고 hover popover가 동작하는지 확인
37. CodeViewer 우클릭 메뉴와 SpecViewer rendered selection 우클릭 메뉴에서 Copy Line Contents / Copy Contents and Path / Copy Relative Path / Add Comment 동작 확인
38. SpecViewer `Copy Relative Path`가 raw markdown line anchor(`:Lx`, `:Lx-Ly`)를 유지하는지 확인
39. (F27) `Connect Remote Workspace`로 host/user/port/remoteRoot/identityFile 입력 후 remote workspace가 열리는지 확인
40. (F27) remote 연결 직후 `workspace:index/read/write/create/delete/rename`이 기존 로컬 계약과 동일하게 동작하는지 확인
41. (F27) remote watch 이벤트가 `changedRelativePaths`, `hasStructureChanges` 형식으로 반영되는지 확인
42. (F27, 수동 미검증) 연결된 원격 호스트의 네트워크를 실제로 차단했을 때 3~5초 안에 상태가 `disconnected`로 반영되고 `CONNECTION_CLOSED` 재시도 UI가 표시되는지 확인
43. (BUG-05/BUG-06) disconnected remote file-open과 lazy directory expansion에서 active file과 expanded ancestor가 유지되고 단절 중 디렉토리 추가/삭제가 반영되는지 확인한다. reconnect setup 공유, 대기 중 collapse intent, triggering directory 단일 load, 실패 시 read/load 중단도 workspace core의 [`workspace:readFile`](./workspace-and-file-tree/contracts.md#21-workspacereadfile) 및 [`workspace:indexDirectory`](./workspace-and-file-tree/contracts.md#22-workspaceindexdirectory) 계약대로 동작해야 한다.
44. (F27) remote root 경계 밖 접근 시 `PATH_DENIED` 오류로 거부되는지 확인
45. (F28) remote connect 모달에서 `Browse Directories` -> `Use Current Directory`로 `remoteRoot`를 선택해 연결 가능한지 확인
46. (F27) remote polling watcher에서 symlink 디렉토리 내부 파일 변경이 `changedRelativePaths`에 반영되는지 확인

## 5. 개발 환경

- Runtime: `react`, `react-dom`, `react-markdown`, `remark-gfm`, `rehype-sanitize`, `shiki`, `chokidar`, `@codemirror/state`, `@codemirror/view`, `@codemirror/language`, `@codemirror/search`, `@codemirror/commands`
- Build/Test: `electron`, `vite`, `typescript`, `eslint`, `vitest`, `@testing-library/*`

실행 명령:

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```
