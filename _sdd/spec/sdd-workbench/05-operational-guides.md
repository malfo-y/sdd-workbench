# 05. Operational Guides

## 1. 성능 기준

- 파일 트리 초기 렌더 cap: 500
- 인덱싱 cap: 10,000 (`truncated` 배너 표시)
- 코드 프리뷰 제한: 2MB 초과 시 preview unavailable
- 하이라이트(Shiki 비동기)는 file content/language 변경 시에만 수행하며, 완료 전까지 plaintext fallback 표시
- watcher 이벤트는 debounce 처리
- polling watcher는 로컬 1500ms / 원격 마운트 5000ms 간격으로 메타데이터 diff(`mtimeMs + size`)를 수행
- polling watcher는 child cap(`500`) 초과 디렉토리를 자동 제외하여 과대 디렉토리 반복 스캔을 방지
- 파일 트리 changed marker 버블링 계산은 1-pass(O(n)) 기준으로 유지
- 원격 마운트 인덱싱 시 깊이 제한(`WORKSPACE_INDEX_SHALLOW_DEPTH=3`) 적용으로 초기 로드 최적화
- 디렉토리별 child cap(`WORKSPACE_INDEX_DIRECTORY_CHILD_CAP=500`) 적용으로 과대 디렉토리 cap 처리
- `not-loaded` 디렉토리 on-demand 확장은 `workspace:indexDirectory` IPC 단건 호출
- Git line marker 조회는 active file 단건(`workspace:getGitLineMarkers`)으로 제한하고 전체 트리 diff 스캔은 금지

## 2. 보안 기준

- `contextIsolation` 유지 + preload 경유 API만 노출
- 파일 읽기 시 workspace 경계 검증
- markdown 렌더는 sanitize allowlist 강제
- 로컬 리소스는 workspace 내부 상대경로만 허용
- `data:` URI는 `data:image/*`만 제한 허용

## 3. 신뢰성 기준

- open/index/read/watch/comments/export 실패 시 앱 크래시 없이 배너 피드백
- global comments read/write 실패 시 모달을 유지해 즉시 재시도 가능해야 한다.
- watcher는 open 시 시작, close/unmount 시 정리
- `auto` + 네트워크 FS 감지(`mount` 명령 파싱)는 polling 기본값을 사용하고, 수동 override(`native|polling`)가 우선한다.
- native watcher 시작 실패 시 polling fallback으로 degraded success를 유지한다.
- active file 변경 이벤트는 자동 re-read
- Git line marker 조회 실패/비저장소 경로/`HEAD` 부재는 UI 크래시 없이 marker 비표시로 degrade한다.
- same-spec source jump는 rendered spec 패널 콘텐츠/스크롤 문맥을 유지해야 한다.
- 세션 복원은 부분 실패 continue 정책
- 종료 경로는 write settle(max 5s) 후 watcher 종료(timeout 1.5s)

## 4. 테스트 운영

### 4.1 자동 게이트 (2026-02-24 기준)

- `npm test` -> `23 files, 285 passed`
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
13. `/Volumes/*` 워크스페이스에서 `REMOTE` 배지 표시 확인
14. watch mode `Auto`일 때 `/Volumes/*` -> polling, non-`/Volumes/*` -> native 판정 확인
15. watch mode를 `Native/Polling`으로 변경했을 때 override 우선 적용 확인
16. native 실패 시 polling fallback 배너 노출 및 변경 감지 유지 확인
17. 코멘트 액션 배너가 5초 후 자동 dismiss되고 `Dismiss`로 즉시 닫히는지 확인
18. `View Comments` 상단 global comments(read-only/empty), `Export Comments`의 global 포함 상태(`included`/`not included`) 표기를 확인
19. 대규모/원격 워크스페이스에서 초기 인덱싱 시 깊이 제한(원격) 및 child cap(500) 적용 확인
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

## 5. 개발 환경

- Runtime: `react`, `react-dom`, `react-markdown`, `remark-gfm`, `rehype-sanitize`, `shiki`, `chokidar`
- Build/Test: `electron`, `vite`, `typescript`, `eslint`, `vitest`, `@testing-library/*`

실행 명령:

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```
