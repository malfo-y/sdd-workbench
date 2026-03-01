# 05. Operational Guides

## 1. 성능 기준

- 파일 트리 초기 렌더 cap: 10,000
- 인덱싱 cap: 100,000 (`truncated` 배너 표시)
- 코드 프리뷰 제한: 2MB 초과 시 preview unavailable
- 하이라이트(Shiki 비동기)는 file content/language 변경 시에만 수행하며, 완료 전까지 plaintext fallback 표시
- watcher 이벤트는 debounce 처리
- polling watcher는 기본 1500ms 간격으로 메타데이터 diff(`mtimeMs + size`)를 수행
- polling watcher는 child cap(`500`) 초과 디렉토리를 자동 제외하여 과대 디렉토리 반복 스캔을 방지
- 파일 트리 changed marker 버블링 계산은 1-pass(O(n)) 기준으로 유지
- 디렉토리별 child cap(`WORKSPACE_INDEX_DIRECTORY_CHILD_CAP=500`) 적용으로 과대 디렉토리 cap 처리
- `not-loaded` 디렉토리 on-demand 확장은 `workspace:indexDirectory` IPC 단건 호출
- Git line marker 조회는 active file 단건(`workspace:getGitLineMarkers`)으로 제한하고 전체 트리 diff 스캔은 금지
- (F27) remote agent 연결 타임아웃 기본값: `REMOTE_AGENT_CONNECT_TIMEOUT_MS=10000`
- (F27) remote RPC 요청 타임아웃 기본값: `REMOTE_AGENT_REQUEST_TIMEOUT_MS=15000`
- (F27) remote 연결 자동 재시도 기본값: `REMOTE_AGENT_RECONNECT_ATTEMPTS=3`
- (F27) remote agent bootstrap 자동화는 MVP 범위로 제한하며, 현재 구현은 연결 시 runtime 배포(덮어쓰기) + 실행 가능 여부/버전 검증을 수행한다.

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
- 세션 복원은 부분 실패 continue 정책
- 종료 경로는 write settle(max 5s) 후 watcher 종료(timeout 1.5s)
- (F27) remote 연결 상태는 `connecting -> connected -> degraded/disconnected` 상태 머신으로 관리한다.
- (F27) 재시도 한도 초과 시 자동 재시도를 중단하고 명시적 사용자 재시도 액션으로 전환한다.
- (F27) remote 프로토콜 버전 불일치 시 기능 강등 없이 즉시 연결 실패 처리(`AGENT_PROTOCOL_MISMATCH`)
- (F27) F15(SSHFS 기반) 연결 경로는 폐기되었고 remote-protocol 단일 경로를 사용한다.

## 4. 테스트 운영

### 4.1 자동 게이트 (2026-02-25 기준)

- `npm test` -> `26 files, 360 passed, 1 skipped`
- `npm run lint` -> pass
- `npm run build` -> pass

### 4.2 권장 검증 순서

1. 링크/라인 매핑 단위 테스트
2. 상태 전이/세션 복원 통합 테스트
3. IPC 경계 스모크 테스트
4. comments export/marker 회귀 테스트

### 4.3 수동 스모크 체크

1. 멀티 워크스페이스 추가/전환/닫기
2. Code/Spec 탭 전환(클릭 + `Cmd+Shift+Left/Right`) + 탭 전환 시 스크롤 위치 유지 확인
3. watcher 변경 마커 및 active file 자동 반영
4. collapse 상태에서 변경 마커가 상위 디렉토리로 버블링되는지 확인
5. rendered spec 중간 위치에서 `Go to Source` 후 scroll 문맥 유지 확인
6. Back/Forward(mouse/swipe/wheel) 동작
7. CodeViewer/SpecViewer에서 Add Comment + marker 표시
8. View Comments에서 edit/delete/Delete Exported 동작 + 실패 시 모달 유지 확인
9. Add Global Comments 저장/복원 + Export 시 Global Comments 선행 배치 확인
10. Export Comments pending-only/partial success 배너 + `exportedAt` 기록 확인
11. CodeViewer/SpecViewer marker hover preview(`+N more`) 동작 확인
12. 헤더 compact action(`icon + short label`) 및 협소 폭 icon-only 접근성(`title`/`aria-label`) 확인
13. 로컬 워크스페이스에서 watch mode `Auto` 기본값이 `native`로 선택되는지 확인
14. watch mode를 `Native/Polling`으로 변경했을 때 override 우선 적용 확인
15. native 실패 시 polling fallback 배너 노출 및 변경 감지 유지 확인
16. remote workspace 연결 시 watch mode가 `polling`으로 표시되고 `REMOTE` 배지가 표시되는지 확인
17. 코멘트 액션 배너가 5초 후 자동 dismiss되고 `Dismiss`로 즉시 닫히는지 확인
18. `View Comments` 상단 global comments(read-only/empty), `Export Comments`의 global 포함 상태(`included`/`not included`) 표기를 확인
19. 대규모 워크스페이스에서 초기 인덱싱 시 node cap(100,000) + child cap(500) 적용 확인
20. `not-loaded` 디렉토리 확장 시 on-demand 로드 + "Loading..." placeholder 동작 확인
21. `partial` 디렉토리에 "Showing N of M items" cap 메시지 표시 확인
22. polling watcher가 child cap 초과 디렉토리를 제외하고 스캔하는지 확인
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
37. 우클릭 컨텍스트 메뉴에서 Copy Line Contents / Copy Contents and Path / Copy Relative Path / Add Comment 동작 확인
38. (F27) `Connect Remote Workspace`로 host/user/port/remoteRoot/identityFile 입력 후 remote workspace가 열리는지 확인
39. (F27) remote 연결 직후 `workspace:index/read/write/create/delete/rename`이 기존 로컬 계약과 동일하게 동작하는지 확인
40. (F27) remote watch 이벤트가 `changedRelativePaths`, `hasStructureChanges` 형식으로 반영되는지 확인
41. (F27) remote 연결 단절 시 상태가 `degraded` 또는 `disconnected`로 반영되고 재시도 UI가 표시되는지 확인
42. (F27) remote root 경계 밖 접근 시 `PATH_DENIED` 오류로 거부되는지 확인

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
