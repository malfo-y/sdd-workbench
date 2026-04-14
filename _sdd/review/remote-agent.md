# Code Quality Review: Remote Agent

**날짜**: 2026-04-14
**세션**: R3
**리뷰 깊이**: 정밀 — SSH 통신 경로 end-to-end 추적, 라인 단위 점검

## 발견 사항 요약

| # | 심각도 | 카테고리 | 위치 | 설명 |
|---|--------|---------|------|------|
| F1 | High | Q7 — 보안 | `bootstrap.ts:86-96` | 원격 셸 스크립트에 agentPath를 직접 삽입 (shell injection 경로) |
| F2 | High | Q7 — 보안 | `bootstrap.ts:144-149` | heredoc으로 런타임 페이로드 전체를 cat 파이프, 페이로드 내 EOF 마커와 충돌 가능 |
| F3 | High | Q2 — 에러 핸들링 | `bootstrap.ts:265-270` | `getNumericExitCode`가 `error.code`를 number로만 체크하나 Node.js에서 ExecFileException.code는 string (`'ECONNRESET'` 등) |
| F4 | Medium | Q7 — 보안 | `transport-ssh.ts:489` | `profile.user`, `profile.host`가 셸 이스케이프 없이 SSH 인자로 전달 |
| F5 | Medium | Q8 — 비동기 | `transport-ssh.ts:250` | `this.process?.stdin.write(frame)`의 optional chaining — start 이후 race 시 조용히 드롭 |
| F6 | Medium | Q2 — 에러 핸들링 | `connection-service.ts:405-407` | `safeUpdateState`의 빈 catch — 의도적이나 로깅 없이 삼킴 |
| F7 | Medium | Q9 — 메모리 누수 | `connection-service.ts:424` | `cleanupWorkspaceTransport`에서 `externalAgentListenersByWorkspaceId` 삭제, disconnect 의도와 무관하게 호출 시 리스너 소실 |
| F8 | Medium | Q4 — 코드 중복 | `bootstrap.ts` / `transport-ssh.ts` / `directory-browser.ts` | `shellEscape`, `appendIdentityArgs`, `buildSshArgs`, SSH 에러 판별 함수가 3곳에 독립 복제 |
| F9 | Medium | Q1 — 파일 크기 | `workspace-ops.ts` | 1,032줄, 17개 exported 함수 — God File 경향 |
| F10 | Medium | Q10 — 엣지 케이스 | `workspace-ops.ts:711-714` | `workspaceCreateFile`에서 stat → ENOENT 분기가 RemoteAgentError도 재throw |
| F11 | Medium | Q3 — 타입 안전성 | `workspace-ops.ts:713` | `(error as NodeJS.ErrnoException).code` — 3곳에서 반복되는 unsafe assertion |
| F12 | Medium | Q10 — 엣지 케이스 | `copy-ops.ts:58` | `startsWith` 경로 비교 — `/workspace-root-extra/` 같은 접두사 일치 false positive |
| F13 | Low | Q6 — 데드 코드 | `watch-ops.ts:236-238` | `pollIntervalOverride` 삼항 조건이 양쪽 동일 값 (`DEFAULT_POLL_INTERVAL_MS`) |
| F14 | Low | Q5 — 네이밍 | `security.ts:37` | `MAX_REDATED_MESSAGE_LENGTH` 오타 (REDACTED) |
| F15 | Low | Q4 — 코드 중복 | `directory-browser.ts:288-311` | `parseErrorCode` 함수가 if 체인으로 동일 문자열 매핑 — REMOTE_AGENT_ERROR_CODES Set으로 대체 가능 |
| F16 | Low | Q3 — 타입 안전성 | `transport-ssh.ts:43-44` | `request` 제네릭 반환 `TResult`에 `as TResult` 캐스팅 (런타임 검증 없음) |
| F17 | Info | Q11 — 테스트 | `watch-ops.test.ts` | 78줄로 RuntimeWatchService 커버리지 얕음 (diff 알고리즘 테스트 부족) |
| F18 | Info | Q11 — 테스트 | `workspace-ops.test.ts` | 241줄로 17개 exported 함수 대비 커버리지 sparse |
| F19 | Info | Q5 — 네이밍 | 전체 | 에러 코드 `PATH_DENIED`가 method-not-found에도 재활용됨 (의미 혼동) |

## 상세 발견

### F1: bootstrap probeScript에 agentPath 직접 삽입

- **파일**: `electron/remote-agent/bootstrap.ts:86-96`
- **심각도**: High
- **카테고리**: Q7 — 보안
- **설명**: `resolveRemoteAgentPath`가 정규식 `[A-Za-z0-9_./$~-]`로 안전 문자만 허용하므로 현재 injection은 불가능하다. 그러나 `agentPath`가 셸 이스케이프 없이 probe 스크립트에 직접 삽입되는 패턴은 방어적이지 않다. 향후 정규식이 완화될 경우 injection 경로가 열린다.
- **제안**: `agentPath`를 `shellEscape`로 감싸거나, 허용 문자 정규식 검증과 이스케이프를 모두 적용하는 defense-in-depth 방식 채택.

### F2: heredoc을 통한 런타임 페이로드 설치

- **파일**: `electron/remote-agent/bootstrap.ts:144-149`
- **심각도**: High
- **카테고리**: Q7 — 보안
- **설명**: `REMOTE_AGENT_RUNTIME_PAYLOAD`를 `cat > path <<'__SDD_REMOTE_AGENT__'` heredoc으로 원격에 전송한다. 페이로드 내에 `__SDD_REMOTE_AGENT__` 문자열이 등장하면 heredoc이 조기 종료되어 나머지가 셸 명령으로 실행될 수 있다. 번들러가 이 마커를 포함하지 않도록 보장하는 메커니즘이 없다.
- **제안**: (1) 빌드 시 페이로드에 마커 문자열이 포함되지 않는지 검증하는 테스트 추가, (2) base64 인코딩 전송 후 원격에서 디코딩하는 방식으로 전환 고려.

### F3: ExecFileException.code 타입 불일치

- **파일**: `electron/remote-agent/bootstrap.ts:265-270`, `directory-browser.ts:380-385`
- **심각도**: High
- **카테고리**: Q2 — 에러 핸들링
- **설명**: `getNumericExitCode`가 `typeof error.code === 'number'`만 체크한다. Node.js `ExecFileException`에서 `code`는 string (`'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'`, `'ECONNRESET'` 등)이고, 실제 exit code는 `error.status`에 담긴다. 결과적으로 exit code가 있어도 `undefined`를 반환해 `reject(error)`로 빠지고, 이 경우 upstream에서 `CONNECTION_CLOSED`로 잘못 분류될 수 있다.
- **제안**: `error.status` (number) 또는 `(error as any).code === number` 분기를 추가하고, `maxBuffer` 초과 등 string code도 별도 처리.

### F4: SSH 인자에 user/host 미이스케이프

- **파일**: `electron/remote-agent/transport-ssh.ts:489`
- **심각도**: Medium
- **카테고리**: Q7 — 보안
- **설명**: `profile.user`와 `profile.host`가 `spawn('ssh', args)` 인자로 직접 전달된다. `spawn`은 셸을 거치지 않으므로 command injection은 불가능하지만, 악의적 호스트명(`-o ProxyCommand=...`)이 SSH 옵션으로 해석될 수 있다 (SSH option injection). `profile.user`도 마찬가지.
- **제안**: host와 user에 `-`로 시작하는 값을 거부하는 검증 추가. 또는 `--` 구분자를 SSH args에 삽입.

### F5: stdin.write의 optional chaining으로 인한 무음 드롭

- **파일**: `electron/remote-agent/transport-ssh.ts:250`
- **심각도**: Medium
- **카테고리**: Q8 — 비동기 패턴
- **설명**: `this.process?.stdin.write(frame)` — `this.process`가 null이면 `write`가 호출되지 않고 Promise는 타임아웃까지 pending 상태로 남는다. 이미 L214-218에서 `this.process` null 체크 후 throw하지만, 두 체크 사이의 race window에서 process가 null이 될 수 있다.
- **제안**: optional chaining 대신 null이면 즉시 reject하도록 변경. 또는 `const proc = this.process; if (!proc) reject(...)`.

### F6: safeUpdateState의 빈 catch

- **파일**: `electron/remote-agent/connection-service.ts:403-408`
- **심각도**: Medium
- **카테고리**: Q2 — 에러 핸들링
- **설명**: `safeUpdateState`가 `catch {}` (빈 블록)으로 에러를 삼킨다. 주석은 "already-closed sessions"를 설명하지만, 예기치 않은 에러도 함께 삼킨다. 디버깅 시 상태 전이 실패를 추적하기 어렵다.
- **제안**: debug-level 로깅 또는 `catch (e) { /* expected for closed sessions */ }` 수준의 구체적 필터링 추가.

### F7: cleanupWorkspaceTransport에서 외부 리스너 무조건 삭제

- **파일**: `electron/remote-agent/connection-service.ts:410-424`
- **심각도**: Medium
- **카테고리**: Q9 — 메모리 누수
- **설명**: `cleanupWorkspaceTransport`가 `externalAgentListenersByWorkspaceId.delete(workspaceId)`를 호출한다. 이 메서드는 reconnect 루프 내 실패 시에도 호출되므로 (L164), 재연결 시도 중 외부 리스너가 소실된다. reconnect 성공 후 이벤트를 받지 못하는 상황 발생 가능.
- **제안**: `cleanupWorkspaceTransport`에서 transport/listener 정리만 하고, `externalAgentListenersByWorkspaceId` 삭제는 최종 disconnect 시에만 수행하도록 분리.

### F8: SSH 유틸리티 함수 3중 복제

- **파일**: `bootstrap.ts`, `transport-ssh.ts`, `directory-browser.ts`
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**:
  - `shellEscape`: 3곳에 동일 구현
  - `appendIdentityArgs`: `bootstrap.ts`와 `transport-ssh.ts`에 동일 구현
  - `getNumericExitCode`: `bootstrap.ts`와 `directory-browser.ts`에 동일 구현
  - `isSshAuthFailure`: `bootstrap.ts`와 `directory-browser.ts`에 동일 구현
  - `normalizeSshErrorMessage`: `bootstrap.ts`와 `directory-browser.ts`에 유사 구현 (bootstrap 버전은 node runtime missing 체크 포함)
- **제안**: `electron/remote-agent/ssh-utils.ts`로 공통 추출. 향후 한쪽만 수정하고 다른 쪽을 놓치는 버그 방지.

### F9: workspace-ops.ts God File

- **파일**: `electron/remote-agent/runtime/workspace-ops.ts`
- **심각도**: Medium
- **카테고리**: Q1 — 파일/함수 크기
- **설명**: 1,032줄에 17개 exported 함수. 파일 인덱싱, 읽기/쓰기, Git 연동, 코멘트 관리, 이미지 프리뷰, 번들 내보내기까지 모든 workspace 조작이 단일 파일에 집중. 개별 함수는 적절한 크기이나 파일 단위 응집도가 낮다.
- **제안**: 기능 그룹별 분리 검토 — `workspace-index-ops.ts` (인덱싱/트리), `workspace-file-ops.ts` (CRUD), `workspace-git-ops.ts` (Git), `workspace-comment-ops.ts` (코멘트). 현재 runtime 번들링 구조와 상충 없는지 확인 필요.

### F10: workspaceCreateFile의 stat → ENOENT 분기 누수

- **파일**: `electron/remote-agent/runtime/workspace-ops.ts:709-721`
- **심각도**: Medium
- **카테고리**: Q10 — 엣지 케이스
- **설명**: 파일 존재 체크 로직:
  ```typescript
  try {
    await stat(resolvedFilePath)
    throw new RemoteAgentError('UNKNOWN', 'File already exists.')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code && 
        (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
  ```
  `stat` 성공 시 throw한 `RemoteAgentError`도 catch 블록에 진입한다. `RemoteAgentError`는 `code` 프로퍼티가 있으므로 (`'UNKNOWN'`), `code !== 'ENOENT'` 조건에 걸려 재throw된다. 결과적으로 동작은 올바르지만 **우연히** 맞는 것이다. 동일 패턴이 `workspaceCreateDirectory` (L736-740), `workspaceRename` (L802-810)에서도 반복된다.
- **제안**: stat 성공 시 `return` 후 throw하거나, catch 블록에서 `RemoteAgentError`를 먼저 필터링하여 의도를 명확히.

### F11: 반복되는 unsafe ErrnoException assertion

- **파일**: `electron/remote-agent/runtime/workspace-ops.ts:713,739,809,834,890`
- **심각도**: Medium
- **카테고리**: Q3 — 타입 안전성
- **설명**: `(error as NodeJS.ErrnoException).code`가 5곳 이상에서 반복된다. `catch(error)`의 `error`는 `unknown`이므로 `as` assertion은 타입 가드 없이 unsafe하다. `RemoteAgentError`도 `code` 프로퍼티가 있어 의도치 않은 분기 진입 가능 (F10 참조).
- **제안**: `isErrnoException(error)` 타입 가드 유틸리티 도입. `RemoteAgentError`를 먼저 검사하는 패턴으로 통일.

### F12: copy-ops.ts의 startsWith 경로 비교

- **파일**: `electron/remote-agent/runtime/copy-ops.ts:58`
- **심각도**: Medium
- **카테고리**: Q10 — 엣지 케이스
- **설명**: `normalizedDest.startsWith(normalizedRoot)` — rootPath가 `/workspace`이고 destDir이 `/workspace-extra/foo`면 `startsWith`가 true를 반환하여 워크스페이스 외부 경로를 허용한다. 같은 파일의 `normalizedSrc.startsWith(normalizedRoot)` (L71)에도 동일 문제.
- **제안**: `path-guard.ts`의 `isPathInsideWorkspace` 함수를 사용하거나, `startsWith(normalizedRoot + path.sep)` 또는 `normalizedDest === normalizedRoot` 체크 추가.

### F13: watch-ops.ts 죽은 삼항 조건

- **파일**: `electron/remote-agent/runtime/watch-ops.ts:236-238`
- **심각도**: Low
- **카테고리**: Q6 — 데드 코드
- **설명**: 
  ```typescript
  const pollIntervalOverride =
    watchModePreference === 'native' || watchModePreference === 'polling'
      ? DEFAULT_POLL_INTERVAL_MS
      : DEFAULT_POLL_INTERVAL_MS
  ```
  삼항 조건의 양쪽 분기가 동일 값. native 모드 구현이 제거된 후 남은 잔재로 보임.
- **제안**: 삼항 제거하고 `this.pollIntervalMs = DEFAULT_POLL_INTERVAL_MS`로 단순화.

### F14: 오타 — MAX_REDATED_MESSAGE_LENGTH

- **파일**: `electron/remote-agent/security.ts:37`
- **심각도**: Low
- **카테고리**: Q5 — 네이밍 일관성
- **설명**: `MAX_REDATED_MESSAGE_LENGTH` → `MAX_REDACTED_MESSAGE_LENGTH`가 의도된 네이밍으로 보임. 내부 상수이므로 기능 영향은 없으나 코드 가독성 저하.
- **제안**: `MAX_REDACTED_MESSAGE_LENGTH`로 rename.

### F15: directory-browser.ts parseErrorCode if 체인

- **파일**: `electron/remote-agent/directory-browser.ts:288-311`
- **심각도**: Low
- **카테고리**: Q4 — 코드 중복
- **설명**: `parseErrorCode` 함수가 8개의 if문으로 문자열을 동일 문자열로 매핑한다. `protocol.ts`에 이미 `REMOTE_AGENT_ERROR_CODES` 배열이 정의되어 있다.
- **제안**: `REMOTE_AGENT_ERROR_CODES`의 Set을 활용하여 `includes` 체크 + 타입 narrowing으로 단순화.

### F16: request 제네릭의 unsafe 캐스팅

- **파일**: `electron/remote-agent/transport-ssh.ts:242-244`
- **심각도**: Low
- **카테고리**: Q3 — 타입 안전성
- **설명**: `resolve(value as TResult)` — 원격 응답의 `result` 필드를 런타임 검증 없이 `TResult`로 캐스팅한다. 프로토콜 수준에서는 `unknown`이므로 호출자가 잘못된 타입을 기대하면 런타임 오류 발생 가능.
- **제안**: 핵심 RPC 메서드에 대해 Zod 등 런타임 스키마 검증 도입 검토. 현재 MVP 단계에서는 trade-off로 수용 가능하나 주석으로 의도 표시 권장.

### F17: watch-ops 테스트 커버리지 부족

- **파일**: `electron/remote-agent/runtime/watch-ops.test.ts`
- **심각도**: Info
- **카테고리**: Q11 — 테스트 커버리지
- **설명**: 78줄로 `RuntimeWatchService` (311줄 소스)의 핵심 로직인 `diffWorkspacePollingSnapshot`, `buildWorkspacePollingSnapshot`, symlink cycle 방지 등이 충분히 테스트되지 않음.
- **제안**: diff 알고리즘 단위 테스트, symlink cycle 시나리오, `MAX_WORKSPACE_POLL_FILES` 경계값 테스트 추가.

### F18: workspace-ops 테스트 커버리지 sparse

- **파일**: `electron/remote-agent/runtime/workspace-ops.test.ts`
- **심각도**: Info
- **카테고리**: Q11 — 테스트 커버리지
- **설명**: 241줄로 17개 exported 함수 (1,032줄 소스) 대비 테스트가 부족. 특히 `workspaceExportCommentsBundle`, `workspaceRename`, 이미지 프리뷰 검증, 바이너리 파일 감지 등의 엣지 케이스 테스트 부재.
- **제안**: 파일 CRUD 엣지 케이스 (권한 오류, 심볼릭 링크, 경로 탈출 시도) 테스트 보강.

### F19: PATH_DENIED 에러 코드의 의미 과부하

- **파일**: `electron/remote-agent/runtime/request-router.ts:45`, `electron/remote-agent/security.ts:49`
- **심각도**: Info
- **카테고리**: Q5 — 네이밍 일관성
- **설명**: `PATH_DENIED`가 (1) 워크스페이스 외부 경로 접근 거부, (2) RPC 메서드 미허용, (3) 디렉토리 브라우저 경로 거부 등 서로 다른 의미에 재사용된다. `request-router.ts:45`에서 `METHOD_NOT_FOUND_CODE`로 별칭은 줬으나 실제 전송 코드는 `PATH_DENIED`.
- **제안**: `METHOD_NOT_ALLOWED` 같은 전용 에러 코드 추가 검토.

## 긍정적 패턴 (Good Patterns)

1. **프로토콜 버전 검증 일관성**: 모든 메시지 수신 경로(`handleIncomingMessage`, `handleResponseMessage`, `handleMessage`)에서 `ensureSupportedProtocolVersion`을 호출하여 버전 불일치를 조기에 감지한다.

2. **Connect Run Token 패턴**: `connection-service.ts`의 Symbol 기반 `connectRunToken`이 stale connect 시도를 안전하게 취소한다. 레이스 컨디션 방어에 효과적인 패턴.

3. **Atomic File Write**: `workspace-ops.ts`의 `writeFileAtomic`이 임시 파일 + rename 패턴으로 쓰기 중 crash 시 파일 손상을 방지한다.

4. **Path Guard 모듈 분리**: `path-guard.ts`가 경로 검증 로직을 단일 모듈로 격리하여 workspace-ops 내 모든 파일 조작에서 일관되게 호출된다. `resolveWorkspaceRelativePath`가 자동으로 탈출 검증을 포함하는 점이 좋다.

5. **방어적 stderrTail 관리**: `transport-ssh.ts`의 `stderrTail`이 1024 byte로 제한되어 메모리 폭주를 방지하면서도 startup 에러 진단에 충분한 컨텍스트를 유지한다.

6. **RPC 메서드 화이트리스트**: `security.ts`의 `REMOTE_WORKSPACE_METHOD_ALLOWLIST`가 원격 실행 가능한 메서드를 명시적으로 제한한다. `request-router.ts`의 switch 문과 이중으로 보호.

7. **에러 메시지 레닥션**: `security.ts`의 `redactRemoteErrorMessage`가 절대 경로, SSH 키 경로, 비밀 값을 일관되게 레닥트하여 민감 정보 노출을 방지한다.

8. **graceful shutdown 흐름**: `transport-ssh.ts`의 `stop()`이 stdin.end → SIGTERM → grace timeout 순서로 정리하고, `connection-service.ts`의 `shutdown()`이 모든 workspace를 병렬 정리한다.

9. **JSON Line Framing 안전성**: `framing.ts`의 `DEFAULT_MAX_FRAME_BYTES` (32MB) 제한이 악의적 대용량 메시지에 의한 메모리 소진을 방지한다.

10. **Reliability Policy 환경변수 오버라이드**: `reliability-policy.ts`가 min/max 범위 클램핑으로 비정상 환경변수 값을 안전하게 처리한다.

## 모듈 종합 평가

- **전체 인상**: Remote Agent 모듈은 전반적으로 잘 구조화되어 있다. 프로토콜 정의, 전송 계층, 연결 서비스, 세션 관리가 명확히 분리되어 있고, 에러 핸들링과 보안 방어가 체계적으로 적용되어 있다. 특히 connect run token, atomic write, path guard 등 방어적 프로그래밍 패턴이 돋보인다.

- **가장 큰 위험**:
  1. **F2 (heredoc 페이로드 주입)**: 번들된 런타임에 EOF 마커가 포함되면 원격 셸 실행으로 이어질 수 있는 보안 위험. 빌드 파이프라인에 검증이 없다.
  2. **F3 (ExecFileException.code 타입 불일치)**: `maxBuffer` 초과 등의 상황에서 exit code를 놓쳐 잘못된 에러 분류로 이어질 수 있다.
  3. **F12 (startsWith 경로 비교)**: `copy-ops.ts`에서 path-guard를 사용하지 않는 자체 구현이 workspace 경계 탈출을 허용할 수 있다.

- **권장 후속 조치**:
  1. **(보안 — 즉시)** F2: 빌드 시 페이로드에 heredoc 마커 포함 여부 검증 테스트 추가
  2. **(보안 — 즉시)** F12: `copy-ops.ts`의 `startsWith` 비교를 `isPathInsideWorkspace`로 교체
  3. **(보안 — 단기)** F4: SSH 인자에 `--` 구분자 삽입 또는 host/user 검증 추가
  4. **(품질 — 단기)** F8: SSH 유틸리티 함수 공통 모듈 추출
  5. **(품질 — 단기)** F3: `getNumericExitCode` 수정하여 `error.status` 활용
  6. **(품질 — 중기)** F9: workspace-ops.ts 기능별 분리
  7. **(테스트 — 중기)** F17, F18: watch-ops, workspace-ops 테스트 보강
