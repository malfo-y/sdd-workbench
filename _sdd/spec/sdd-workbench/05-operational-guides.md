# 05. Operational Guides

## 1. 성능 기준

- 파일 트리 초기 렌더 cap: 500
- 인덱싱 cap: 10,000 (`truncated` 배너 표시)
- 코드 프리뷰 제한: 2MB 초과 시 preview unavailable
- 하이라이트 재계산은 file content/language 변경 시에만 수행
- watcher 이벤트는 debounce 처리
- 파일 트리 changed marker 버블링 계산은 1-pass(O(n)) 기준으로 유지

## 2. 보안 기준

- `contextIsolation` 유지 + preload 경유 API만 노출
- 파일 읽기 시 workspace 경계 검증
- markdown 렌더는 sanitize allowlist 강제
- 로컬 리소스는 workspace 내부 상대경로만 허용
- `data:` URI는 `data:image/*`만 제한 허용

## 3. 신뢰성 기준

- open/index/read/watch/comments/export 실패 시 앱 크래시 없이 배너 피드백
- watcher는 open 시 시작, close/unmount 시 정리
- active file 변경 이벤트는 자동 re-read
- same-spec source jump는 rendered spec 패널 콘텐츠/스크롤 문맥을 유지해야 한다.
- 세션 복원은 부분 실패 continue 정책
- 종료 경로는 write settle(max 5s) 후 watcher 종료(timeout 1.5s)

## 4. 테스트 운영

### 4.1 자동 게이트 (2026-02-22 기준)

- `npm test` -> `18 files, 169 passed`
- `npm run lint` -> pass
- `npm run build` -> pass

### 4.2 권장 검증 순서

1. 링크/라인 매핑 단위 테스트
2. 상태 전이/세션 복원 통합 테스트
3. IPC 경계 스모크 테스트
4. comments export/marker 회귀 테스트

### 4.3 수동 스모크 체크

1. 멀티 워크스페이스 추가/전환/닫기
2. code/spec 패널 왕복 점프
3. watcher 변경 마커 및 active file 자동 반영
4. collapse 상태에서 변경 마커가 상위 디렉토리로 버블링되는지 확인
5. rendered spec 중간 위치에서 `Go to Source` 후 scroll 문맥 유지 확인
6. Back/Forward(mouse/swipe/wheel) 동작
7. CodeViewer/SpecViewer에서 Add Comment + marker 표시
8. Export Comments pending-only 및 partial success 배너
9. CodeViewer/SpecViewer marker hover preview(`+N more`) 동작 확인

## 5. 개발 환경

- Runtime: `react`, `react-dom`, `react-markdown`, `remark-gfm`, `rehype-sanitize`, `prismjs`, `chokidar`
- Build/Test: `electron`, `vite`, `typescript`, `eslint`, `vitest`, `@testing-library/*`

실행 명령:

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```
