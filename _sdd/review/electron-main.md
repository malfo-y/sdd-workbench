# Code Quality Review: Electron Main + Preload

**날짜**: 2026-04-14
**세션**: R1
**리뷰 깊이**: 정밀 — 라인 단위 전수 점검
**대상 파일**: `electron/main.ts` (3,511 LOC), `electron/preload.ts` (611 LOC)

---

## 발견 사항 요약

| # | 심각도 | 카테고리 | 위치 | 설명 |
|---|--------|---------|------|------|
| F1 | High | Q4 — 코드 중복 | main.ts + preload.ts 전체 | main.ts ↔ preload.ts 간 타입 정의 대량 중복 (~49개 타입) |
| F2 | High | Q4 — 코드 중복 | main.ts:2707-2974 | Routed 핸들러 18개가 동일 패턴 복붙 (~267줄) |
| F3 | High | Q1 — 파일 크기 | main.ts 전체 | 3,511줄 모놀리스 — 7개 이상 관심사 혼합 |
| F4 | Medium | Q3 — 타입 안전성 | main.ts:1722 | `JSON.parse` 결과를 `CodeCommentRecord[]`로 unsafe cast |
| F5 | Medium | Q6 — 데드 코드 | main.ts:3435-3438 | `main-process-message` 이벤트 — renderer에서 수신하는 곳 없음 |
| F6 | Medium | Q3 — 타입 안전성 | main.ts:2646 | `DUMMY_IPC_EVENT = {} as IpcMainInvokeEvent` unsafe assertion |
| F7 | Medium | Q2 — 에러 핸들링 | main.ts:547-551 | `writeFileAtomic` 실패 시 .tmp 파일 미정리 |
| F8 | Medium | Q4 — 코드 중복 | main.ts:1167-1539 | 파일 I/O 핸들러 7개의 반복 검증 보일러플레이트 |
| F9 | Medium | Q5 — 네이밍 | main.ts:605-609 | `ensurePathWithinWorkspace`가 실제로는 boolean 반환 (ensure 아님) |
| F10 | Medium | Q4 — 코드 중복 | main.ts:3213-3288 | `registerIpcHandlers`의 removeHandler/handle 30쌍 반복 |
| F11 | Low | Q1 — 함수 크기 | main.ts:3333-3446 | `createWindow` 113줄 |
| F12 | Low | Q10 — 엣지 케이스 | main.ts:547-551 | `writeFileAtomic`의 temp 파일 이름이 예측 가능 (pid+timestamp) |
| F13 | Low | Q2 — 에러 핸들링 | main.ts:3178-3191 | `queueRemoteAgentLog`의 `.catch(() => undefined)` 무음 실패 |
| F14 | Low | Q10 — 엣지 케이스 | main.ts:1593-1594 | Git 커맨드 2회 연속 호출 (rev-parse) — 비효율 |
| F15 | Low | Q1 — 함수 크기 | main.ts:100-424 | 타입 정의 블록만 325줄 (파일 상단 점유) |
| F16 | Info | Q11 — 테스트 | main.ts 전체 | main.ts 자체에 대한 단위 테스트 없음 (보조 모듈은 테스트 있음) |

---

## 상세 발견

### F1: main.ts ↔ preload.ts 간 타입 대량 중복

- **파일**: `electron/main.ts:100-424` ↔ `electron/preload.ts:11-336`
- **심각도**: High
- **카테고리**: Q4 — 코드 중복
- **설명**: preload.ts에 정의된 49개 타입 중 대부분이 main.ts에도 거의 동일한 형태로 존재한다. `CodeCommentRecord`, `WorkspaceFileNode`, `WorkspaceReadFileResult` 등 핵심 IPC 계약 타입이 양쪽에서 독립적으로 관리되고 있다. 현재 preload.ts에서는 어떤 타입도 main.ts로부터 import하지 않는다.
- **위험**: 한쪽만 수정하면 IPC 계약이 조용히 깨진다. 런타임에서야 발견됨.
- **제안**: 공유 타입을 `electron/ipc-types.ts` 또는 `shared/workspace-ipc.ts`로 추출하고, 양쪽에서 import한다. Electron의 preload sandbox 제약 상 직접 import가 안 되면 빌드 시 타입만 추출하는 전략을 사용.

### F2: Routed 핸들러 18개 동일 패턴 복붙

- **파일**: `main.ts:2707-2974`
- **심각도**: High
- **카테고리**: Q4 — 코드 중복
- **설명**: `handleWorkspace*Routed` 함수 18개가 모두 아래 동일 패턴을 따른다:
  ```ts
  async function handleWorkspace*Routed(_event, request) {
    try {
      const backend = workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
      return (await backend.*(request)) as *Result
    } catch (error) {
      return { ok: false, ...defaults, error: toBackendErrorMessage(error, '...') }
    }
  }
  ```
  각 함수의 차이는 메서드 이름, 에러 기본값, 에러 메시지뿐이다. ~267줄이 사실상 동일 로직.
- **제안**: 제네릭 라우팅 팩토리 함수로 추출:
  ```ts
  function createRoutedHandler<Req extends { rootPath?: string }, Res>(
    method: keyof WorkspaceBackend,
    errorDefaults: Partial<Res>,
    fallbackMessage: string,
  ) { ... }
  ```

### F3: 3,511줄 모놀리스

- **파일**: `main.ts` 전체
- **심각도**: High
- **카테고리**: Q1 — 파일/함수 크기
- **설명**: 단일 파일에 7개 이상의 관심사가 혼합되어 있다:
  1. **타입 정의** (L100-424, ~325줄)
  2. **유틸리티 함수** (L492-719, ~228줄) — 경로 정규화, 바이너리 감지, 이미지 프리뷰
  3. **파일 트리 인덱싱** (L720-957, ~237줄) — buildWorkspaceTree, buildDirectoryChildren
  4. **IPC 핸들러 (직접)** (L959-2010, ~1,051줄) — 파일 CRUD, Git, 코멘트
  5. **파일 시스템 워칭** (L2033-2528, ~495줄) — native/polling 양방향
  6. **Routed 핸들러 + 라우터** (L2646-2974, ~328줄)
  7. **리모트 에이전트 연결** (L3021-3211, ~190줄)
  8. **앱 라이프사이클** (L3213-3511, ~298줄) — IPC 등록, 윈도우, 메뉴
- **제안**: 최소한 아래 분리가 가능:
  - `electron/ipc-types.ts` — 공유 타입
  - `electron/workspace-indexing.ts` — 파일 트리 인덱싱
  - `electron/workspace-watchers.ts` — 파일 시스템 감시
  - `electron/workspace-ipc-handlers.ts` — 직접 핸들러
  - `electron/workspace-ipc-routing.ts` — 라우팅 핸들러

### F4: JSON.parse 결과 unsafe cast

- **파일**: `main.ts:1712-1722`
- **심각도**: Medium
- **카테고리**: Q3 — 타입 안전성
- **설명**:
  ```ts
  const parsedComments = JSON.parse(rawJson)
  if (!Array.isArray(parsedComments)) { ... }
  return {
    ok: true,
    comments: parsedComments as CodeCommentRecord[],  // L1722
  }
  ```
  `Array.isArray` 체크만으로 배열의 각 요소가 `CodeCommentRecord` 형태인지 검증하지 않는다. `comments.json`이 외부에서 수동 편집되었거나 corruption이 발생하면, renderer에서 undefined 프로퍼티 접근으로 크래시 가능.
- **제안**: 최소한 첫 번째 요소의 필수 필드 (`id`, `relativePath`, `body`) 존재 여부를 검증하는 가벼운 validation 추가. 또는 zod 같은 스키마 라이브러리 도입.

### F5: 데드 코드 — `main-process-message` 이벤트

- **파일**: `main.ts:3435-3438`
- **심각도**: Medium
- **카테고리**: Q6 — 데드 코드
- **설명**:
  ```ts
  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })
  ```
  주석이 "Test active push message"라고 명시하고 있으며, `src/` 디렉토리 전체에서 `main-process-message` 채널을 수신하는 코드가 없다. Electron 템플릿 보일러플레이트가 그대로 남은 것.
- **제안**: 삭제.

### F6: DUMMY_IPC_EVENT unsafe assertion

- **파일**: `main.ts:2646`
- **심각도**: Medium
- **카테고리**: Q3 — 타입 안전성
- **설명**:
  ```ts
  const DUMMY_IPC_EVENT = {} as IpcMainInvokeEvent
  ```
  빈 객체를 `IpcMainInvokeEvent`로 캐스팅. 모든 직접 핸들러가 `_event` 파라미터를 사용하지 않으므로 현재는 안전하지만, 향후 핸들러 내에서 `event.sender` 등에 접근하면 런타임 에러 발생.
- **제안**: 핸들러 시그니처에서 `_event` 파라미터를 제거하고, IPC 등록 시에만 래핑하는 구조로 변경. 또는 `localWorkspaceBackend` 생성 시 핸들러를 직접 호출하는 대신 이벤트 없는 별도 인터페이스 사용.

### F7: writeFileAtomic 실패 시 .tmp 파일 미정리

- **파일**: `main.ts:547-551`
- **심각도**: Medium
- **카테고리**: Q2 — 에러 핸들링
- **설명**:
  ```ts
  async function writeFileAtomic(targetPath: string, content: string) {
    const temporaryPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`
    await writeFile(temporaryPath, content, 'utf8')
    await rename(temporaryPath, targetPath)  // 이 단계 실패 시 tmp 파일 잔류
  }
  ```
  `rename` 호출이 실패하면 (예: 대상 디렉토리 삭제, 권한 문제) `.tmp-*` 파일이 워크스페이스에 잔류한다. 반복되면 워크스페이스 오염.
- **제안**:
  ```ts
  try {
    await rename(temporaryPath, targetPath)
  } catch (renameError) {
    await unlink(temporaryPath).catch(() => {})
    throw renameError
  }
  ```

### F8: 파일 I/O 핸들러의 반복 검증 보일러플레이트

- **파일**: `main.ts:1167-1539`
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: `handleWorkspaceReadFile`, `handleWorkspaceWriteFile`, `handleWorkspaceCreateFile`, `handleWorkspaceCreateDirectory`, `handleWorkspaceDeleteFile`, `handleWorkspaceDeleteDirectory`, `handleWorkspaceRename` — 7개 핸들러가 동일한 검증 시퀀스를 반복:
  1. `rootPath`, `relativePath` null 체크
  2. `path.resolve(rootPath)` → `path.resolve(resolvedRootPath, relativePath)`
  3. `isPathInsideWorkspace()` 검사
  각 핸들러마다 10~15줄이 이 패턴으로 반복됨 (~70-100줄 중복).
- **제안**: 공통 검증 유틸리티 추출:
  ```ts
  function resolveAndValidateWorkspacePath(rootPath: string, relativePath: string):
    { ok: true; resolvedRoot: string; resolvedTarget: string } |
    { ok: false; error: string }
  ```

### F9: `ensurePathWithinWorkspace` 이름이 동작과 불일치

- **파일**: `main.ts:605-609`
- **심각도**: Medium
- **카테고리**: Q5 — 네이밍 일관성
- **설명**:
  ```ts
  function ensurePathWithinWorkspace(rootPath: string, targetPath: string): boolean {
    const resolvedRootPath = path.resolve(rootPath)
    const resolvedTargetPath = path.resolve(targetPath)
    return isPathInsideWorkspace(resolvedRootPath, resolvedTargetPath)
  }
  ```
  `ensure*` 네이밍은 일반적으로 "조건 불만족 시 throw 또는 강제" 시맨틱을 기대하게 한다. 하지만 이 함수는 `boolean`만 반환하며, 실질적으로 `isPathInsideWorkspace`와 동일한 동작을 한다 (단지 `path.resolve`를 추가).
- **제안**: `isResolvedPathWithinWorkspace` 또는 `checkPathWithinWorkspace`로 이름 변경.

### F10: registerIpcHandlers의 removeHandler/handle 30쌍 반복

- **파일**: `main.ts:3213-3288`
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: `ipcMain.removeHandler(channel)` + `ipcMain.handle(channel, handler)` 쌍이 30번 반복된다. 채널 이름이 문자열 리터럴로 사용되어 타이포 위험도 있음.
- **제안**: 채널-핸들러 맵 객체로 선언하고 루프 등록:
  ```ts
  const IPC_HANDLERS = {
    'workspace:openDialog': handleWorkspaceOpenDialog,
    'workspace:index': handleWorkspaceIndexRouted,
    // ...
  } as const
  for (const [channel, handler] of Object.entries(IPC_HANDLERS)) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, handler)
  }
  ```

### F11: createWindow 함수 113줄

- **파일**: `main.ts:3333-3446`
- **심각도**: Low
- **카테고리**: Q1 — 함수 크기
- **설명**: BrowserWindow 생성, 윈도우 상태 저장/복원, 히스토리 내비게이션 이벤트, 스와이프 이벤트, 데드코드(F5), URL 로딩까지 단일 함수에 포함.
- **제안**: 히스토리 내비게이션 이벤트 등록과 윈도우 상태 관리를 별도 헬퍼로 분리 가능.

### F12: writeFileAtomic temp 파일 이름 예측 가능

- **파일**: `main.ts:548`
- **심각도**: Low
- **카테고리**: Q10 — 엣지 케이스
- **설명**: `const temporaryPath = \`${targetPath}.tmp-${process.pid}-${Date.now()}\``
  PID와 현재 시간으로 구성. 사용자 소유 워크스페이스 내에서만 사용되므로 실질적 보안 위험은 낮지만, 이론적으로 동일 프로세스에서 밀리초 내 동일 파일에 동시 쓰기 시 충돌 가능.
- **제안**: `crypto.randomUUID()` 또는 `randomBytes(8).toString('hex')` 사용 고려.

### F13: queueRemoteAgentLog의 무음 실패

- **파일**: `main.ts:3178-3191`
- **심각도**: Low
- **카테고리**: Q2 — 에러 핸들링
- **설명**:
  ```ts
  remoteAgentLogWriteQueue = remoteAgentLogWriteQueue
    .then(async () => { ... })
    .catch(() => undefined)  // 모든 로그 쓰기 실패를 무시
  ```
  로그 파일 쓰기 실패가 조용히 무시된다. fire-and-forget 패턴으로 의도적일 수 있으나, 반복적인 디스크 오류 시 사용자가 인지할 방법이 없다.
- **제안**: 첫 실패 시에만 `console.warn`을 한 번 출력하고, 이후는 억제하는 throttled warning 고려.

### F14: Git 커맨드 연속 호출 비효율

- **파일**: `main.ts:1593-1594`
- **심각도**: Low
- **카테고리**: Q10 — 엣지 케이스
- **설명**:
  ```ts
  await runGitCommand(resolvedRootPath, ['rev-parse', '--is-inside-work-tree'])
  await runGitCommand(resolvedRootPath, ['rev-parse', '--verify', 'HEAD'])
  ```
  `rev-parse`를 2회 별도 프로세스로 호출한다. 첫 번째는 git 저장소 여부 확인, 두 번째는 HEAD 존재 확인.
- **제안**: 단일 호출로 합치거나, `git diff`가 스스로 적절한 에러를 내므로 사전 체크를 생략하는 것도 고려.

### F15: 타입 정의 블록이 파일 상단 325줄 점유

- **파일**: `main.ts:100-424`
- **심각도**: Low
- **카테고리**: Q1 — 파일/함수 크기
- **설명**: 57개 타입 정의가 파일 상단 325줄을 차지하여 코드 탐색을 어렵게 한다. 이 중 대부분은 IPC 요청/응답 타입으로 F1의 공유 타입 추출과 함께 해결 가능.
- **제안**: F1 해결 시 자연스럽게 해소됨.

### F16: main.ts 자체 단위 테스트 부재

- **파일**: `main.ts` 전체
- **심각도**: Info
- **카테고리**: Q11 — 테스트 커버리지
- **설명**: `electron/` 하위 34개 테스트 파일이 존재하나 모두 보조 모듈 (`git-line-markers`, `workspace-search`, `workspace-watch-mode`, `remote-agent/*`, `workspace-backend/*`, `file-clipboard`, `appearance-menu`, `window-state`, `workspace-path`, `system-open` 등) 대상이다. `main.ts`의 핵심 핸들러 (`handleWorkspaceReadFile`, `handleWorkspaceWriteFile`, `handleWorkspaceCreateFile` 등)에 대한 직접 테스트는 없다.
- **참고**: `workspace-backend/local-workspace-backend.test.ts`와 `backend-integration.test.ts`가 간접적으로 일부 경로를 커버할 수 있으나, main.ts 내부의 경로 검증, 에러 분기, 엣지 케이스 (큰 파일, 바이너리, SVG 차단 등)는 미커버.
- **제안**: 최소한 `handleWorkspaceReadFile`의 경로 탈출 차단, 바이너리 감지, 파일 크기 제한 등 보안 관련 경로는 테스트 추가 권장. 모놀리스 분리(F3) 후에 테스트 작성이 훨씬 용이해짐.

---

## 긍정적 패턴 (Good Patterns)

### 보안 (Q7)
- **경로 탈출 방어 일관성**: 모든 파일 I/O 핸들러에서 `isPathInsideWorkspace` / `isPathInsideWorkspaceOrRoot` 체크를 빠짐없이 수행한다.
- **SVG 차단**: `BLOCKED_IMAGE_EXTENSIONS`로 SVG 렌더링을 사전 차단 (XSS 방어).
- **이미지 매직바이트 검증**: `hasImageSignature`로 확장자 스푸핑 방어. 확장자와 실제 파일 내용이 일치해야만 프리뷰 제공.
- **Git 커맨드 안전성**: `execFile` (not `exec`) 사용으로 쉘 인젝션 방지. 인수는 배열로 전달.
- **에러 메시지 새니타이징**: 리모트 에이전트 관련 에러는 `redactRemoteErrorMessage`로 민감 정보 제거 후 클라이언트에 전달.

### 비동기 패턴 (Q8)
- **싱글톤 프로미스 패턴**: `stopAllWorkspaceWatchers`가 중복 호출 시 같은 프로미스를 반환. 깨끗한 shutdown 보장.
- **순차 쓰기 큐**: `remoteAgentLogWriteQueue`가 프로미스 체이닝으로 로그 쓰기 순서 보장.
- **폴링 가드**: `pollingInProgress` 플래그로 중첩 폴링 방지.
- **폴백 전환 가드**: `workspacesInFallbackTransition` Set으로 네이티브→폴링 전환 중 중복 전환 방지.

### 에러 핸들링 (Q2)
- **일관된 Result 패턴**: 모든 핸들러가 `{ ok: boolean; error?: string }` 패턴을 따르며, throw 대신 구조화된 에러 응답 반환.
- **원자적 쓰기**: `writeFileAtomic`으로 파일 corruption 방지 (write → rename).
- **Graceful quit**: `before-quit`에서 쓰기 완료 대기 + 타임아웃 레이스로 안전 종료.

### 파일 시스템 워칭 (Q8/Q9)
- **디바운싱**: `WATCH_EVENT_DEBOUNCE_MS`로 이벤트 폭주 방지.
- **리소스 정리**: `stopWorkspaceWatcher`에서 타이머, 와처, 펜딩 이벤트 모두 정리.
- **예산 기반 인덱싱**: `indexBudget.remainingNodes`로 무한 재귀 방지.

### preload.ts (Q7)
- **contextBridge 사용**: `contextBridge.exposeInMainWorld`로 안전한 IPC 노출. 직접 `ipcRenderer` 노출 없음.
- **이벤트 구독 해제 함수 반환**: `onWatchEvent` 등이 unsubscribe 함수를 반환하여 메모리 누수 방지 구조 제공.
- **테마 파싱 방어**: `onAppearanceThemeMenuRequest`에서 `parseAppearanceTheme`로 유효성 검증 후 무효값 무시.

---

## 모듈 종합 평가

### 전체 인상
코드의 **기능적 완성도와 보안 수준은 높다**. 경로 탈출 방어, 원자적 쓰기, graceful shutdown, 폴링 폴백 등 방어적 프로그래밍이 잘 되어 있다. 하지만 **구조적 측면에서 3,500줄 모놀리스와 대량 타입 중복**이 유지보수성을 심각하게 저하시키고 있다.

### 가장 큰 위험

1. **타입 동기화 실패 위험 (F1)**: main.ts와 preload.ts 간 49개 타입이 독립적으로 유지되고 있어, IPC 계약이 조용히 깨질 수 있다. 이것이 가장 실질적인 버그 발생 위험.
2. **변경 비용 증가 (F2, F3)**: 새 IPC 채널 추가 시 타입 정의 2곳, 핸들러, routed 핸들러, registerIpcHandlers, preload API 등 최소 5곳을 수정해야 하며, 하나라도 누락하면 런타임 에러.

### 권장 후속 조치 (우선순위순)

| 순위 | 조치 | 관련 발견 | 예상 효과 |
|------|------|----------|----------|
| 1 | 공유 IPC 타입 모듈 추출 | F1, F15 | 타입 동기화 문제 근본 해결, ~300줄 제거 |
| 2 | Routed 핸들러 팩토리 함수 도입 | F2 | ~250줄 제거, 새 채널 추가 비용 절감 |
| 3 | IPC 등록 테이블 기반으로 리팩토링 | F10 | ~60줄 제거, 채널 이름 타이포 방지 |
| 4 | 파일 I/O 검증 유틸리티 추출 | F8 | ~70줄 제거 |
| 5 | 데드 코드 삭제 | F5 | 즉시 가능, 3줄 |
| 6 | writeFileAtomic tmp 파일 정리 | F7 | 워크스페이스 오염 방지 |
| 7 | JSON 파싱 후 최소 검증 추가 | F4 | comments.json 파손 시 안전한 실패 |
| 8 | 모놀리스 분할 (장기) | F3, F11, F16 | 테스트 용이성, 탐색성 대폭 개선 |
