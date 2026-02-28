# IMPLEMENTATION_PLAN (F27 Phase 6: 실행 가능한 Remote Agent Runtime 배포/기동)

## 1. Overview

F27 Phase 6 목표는 현재 "연결 골격 + stub bootstrap" 상태를 넘어,
원격에서 실제 stdio RPC를 처리하는 **실행 가능한 remote agent runtime**을 배포/기동해
`Connect Remote Workspace`가 end-to-end로 성공하도록 만드는 것이다.

현 상태 근거(2026-02-28 디버깅):

- SSH 자체 연결 성공 (`SSH_OK`)
- remote root(`/data`) 접근 성공 (`ROOT_OK`)
- `~/.sdd-workbench/bin/sdd-remote-agent --protocol-version` 성공 (`1.0.0`)
- `--stdio` 실행 실패 (`RC:1`, `Remote agent runtime is not bundled in this MVP build.`)

핵심 결과:

1. remote agent runtime이 stdio JSON line 프로토콜로 `workspace.*` 메서드를 실제 처리한다.
2. bootstrap이 runtime payload를 원격에 자동 설치/업데이트(MVP 수준)하고 실행 검증한다.
3. transport/connection-service가 bootstrap 실패 원인을 `CONNECTION_CLOSED`가 아닌 의미 있는 코드/메시지로 표준화한다.
4. 회귀 테스트로 "stub만 있는 상태" 재발을 차단한다.

기준 입력:

- 이전 단계 결과:
  - `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_REPORT_PHASE_5.md`
- 관련 코드:
  - `electron/remote-agent/*`
  - `electron/workspace-backend/remote-*.ts`
  - `electron/main.ts`, `src/workspace/*`, `src/App.test.tsx`
- 사용자 확인:
  - 실제 SSH 연결/키 인증/remote root는 정상
  - 현 실패는 remote agent runtime 부재에서 발생

결정사항(사용자 확정):

- Phase 6 MVP에서 원격 `node` 런타임 의존성을 허용한다.
- `agentPath`가 지정되면 해당 경로에 runtime을 덮어쓰기 설치한다.

예상 난이도/기간:

- runtime 최소 기능(index/read/write/watch/git/comments) + 배포 자동화 + 회귀테스트: 약 1.5~3일

---

## 2. Scope (In/Out)

### In Scope

- 실행 가능한 remote agent runtime(stdio JSON line server) 구현
- `workspace.*` 허용 메서드 처리기 구현(파일/디렉토리/comments/watch/git)
- bootstrap runtime payload 설치/업데이트(MVP 자동화) 및 기동 검증
- bootstrap/transport/connection-service 오류 코드 매핑 정교화
- UI의 agent path 기본값/가이드 정합화(오해 방지)
- Phase 6 통합 테스트/빌드 게이트 확정

### Out of Scope

- 원격 포트포워딩, 원격 터미널, 원격 확장 실행
- 다중 hop/bastion 고급 인증 UX
- 완전한 원격 자동 업그레이드 체계(채널/롤백/서명 검증)
- 원격 권한 세분화(RBAC)

---

## 3. Components

1. **Remote Agent Runtime Layer**
- stdio 프레이밍, request router, method handlers, 이벤트 송신

2. **Runtime Deployment Layer**
- 런타임 payload 생성/버전 태깅/원격 설치 검증

3. **SSH Bootstrap & Session Lifecycle Layer**
- runtime 설치 후 기동 검증, 실패 시 표준 에러 매핑

4. **Workspace Operation Adapter Layer**
- local backend 계약과 동일한 response shape 유지

5. **Renderer Diagnostics Layer**
- 사용자 배너/상태에서 실행 실패 원인 가시화

6. **Validation Layer**
- unit/integration/app/build 회귀 방지

---

## 4. Implementation Phases

### Phase 6-A: Runtime 서버 구현

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P6-1 | remote agent runtime 엔트리/프레이밍/라우팅 뼈대 구현 | P0 | - | Remote Agent Runtime Layer |
| P6-2 | `workspace.*` 파일/코멘트/Git 메서드 핸들러 구현 | P0 | P6-1 | Workspace Operation Adapter Layer |
| P6-3 | watch start/stop + watch event/fallback 이벤트 브리지 구현 | P0 | P6-1 | Remote Agent Runtime Layer |

### Phase 6-B: 배포/기동 자동화

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P6-4 | runtime payload 빌드/포장 파이프라인 추가 | P0 | P6-1 | Runtime Deployment Layer |
| P6-5 | bootstrap에 payload 설치/업데이트 + 실행 검증 추가 | P0 | P6-2,P6-3,P6-4 | SSH Bootstrap & Session Lifecycle Layer |
| P6-6 | transport/connection-service 오류코드 매핑 및 진단 메시지 보강 | P1 | P6-5 | SSH Bootstrap & Session Lifecycle Layer |

### Phase 6-C: UX 정합화 + 통합 검증

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P6-7 | agent path 기본값/가이드 및 실패 배너 정합화 | P1 | P6-6 | Renderer Diagnostics Layer |
| P6-8 | Phase 6 통합 회귀 테스트/빌드 게이트 확정 | P0 | P6-7 | Validation Layer |

---

## 5. Task Details

### Task P6-1: remote agent runtime 엔트리/프레이밍/라우팅 뼈대 구현
**Component**: Remote Agent Runtime Layer  
**Priority**: P0-Critical  
**Type**: Infrastructure

**Description**:
원격에서 실행되는 runtime 프로세스 엔트리를 추가하고,
stdin(JSON line request) -> method dispatch -> stdout(response/event) 기본 루프를 구현한다.

**Acceptance Criteria**:
- [ ] runtime 실행 파일이 `--protocol-version`과 `--stdio` 모드를 모두 지원한다.
- [ ] `protocolVersion` 불일치 요청은 `AGENT_PROTOCOL_MISMATCH` 응답으로 반환된다.
- [ ] 알 수 없는 메서드는 표준 오류 응답(`PATH_DENIED` 또는 `UNKNOWN`)으로 반환된다.
- [ ] malformed frame 처리 시 프로세스 크래시 없이 오류 응답/종료 정책이 고정된다.

**Target Files**:
- [C] `electron/remote-agent/runtime/agent-main.ts` -- 원격 런타임 엔트리
- [C] `electron/remote-agent/runtime/request-router.ts` -- method 라우팅/응답 조립
- [C] `electron/remote-agent/runtime/runtime-types.ts` -- 런타임 내부 타입
- [C] `electron/remote-agent/runtime/agent-main.test.ts` -- stdio 루프/핸드셰이크 테스트
- [M] `electron/remote-agent/protocol.ts` -- runtime 경계와 맞춘 메시지/오류 타입 보강

**Technical Notes**:
- 로컬 main과 동일한 JSON line framing 규칙을 유지해 transport 변경 폭을 줄인다.
- runtime은 단일 워크스페이스 루트 기준으로 시작 파라미터를 고정한다.

**Dependencies**: -

---

### Task P6-2: `workspace.*` 파일/코멘트/Git 메서드 핸들러 구현
**Component**: Workspace Operation Adapter Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
runtime에서 `workspace.index`, `workspace.readFile`, `workspace.writeFile`,
`workspace.create*`, `workspace.delete*`, `workspace.rename`,
`workspace.read/writeComments`, `workspace.read/writeGlobalComments`,
`workspace.exportCommentsBundle`, `workspace.getGitLineMarkers`, `workspace.getGitFileStatuses`
를 처리한다.

**Acceptance Criteria**:
- [ ] remote backend allowlist의 모든 non-watch 메서드가 runtime에서 동작한다.
- [ ] 상대경로 경계 이탈(`../`)은 `PATH_DENIED`로 거부된다.
- [ ] 반환 shape가 현재 local backend 계약과 호환된다.
- [ ] comments/global-comments/export와 git 결과가 기존 UI에서 회귀 없이 표시된다.

**Target Files**:
- [C] `electron/remote-agent/runtime/path-guard.ts` -- 상대경로/워크스페이스 경계 검증
- [C] `electron/remote-agent/runtime/workspace-ops.ts` -- 파일/디렉토리/코멘트 처리
- [C] `electron/remote-agent/runtime/git-ops.ts` -- git marker/status 처리
- [C] `electron/remote-agent/runtime/workspace-ops.test.ts` -- 파일/코멘트 경계 테스트
- [C] `electron/remote-agent/runtime/git-ops.test.ts` -- git 메서드 테스트
- [M] `electron/remote-agent/security.ts` -- allowlist와 runtime 구현 목록 정합성 고정

**Technical Notes**:
- main.ts의 기존 로컬 동작을 무리하게 공유하지 말고, Phase 6에서는 런타임 독립 구현을 우선한다.
- 디렉토리/파일 존재성 오류는 사용자 배너 호환 메시지로 normalize한다.

**Dependencies**: P6-1

---

### Task P6-3: watch start/stop + watch event/fallback 이벤트 브리지 구현
**Component**: Remote Agent Runtime Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`workspace.watchStart`/`workspace.watchStop` 메서드를 런타임에 구현하고,
파일 변경 시 `workspace.watchEvent`(`watch.event` 호환 포함) 및 fallback 이벤트를 송신한다.

**Acceptance Criteria**:
- [ ] `watchStart` 호출 시 watch mode 결과(`native|polling`)가 반환된다.
- [ ] 변경 이벤트 payload(`changedRelativePaths`, `hasStructureChanges`)가 기존 bridge와 호환된다.
- [ ] `watchStop` 이후 이벤트 누수 없이 watcher 자원이 정리된다.
- [ ] bridge 테스트와 런타임 watch 테스트가 pass한다.

**Target Files**:
- [C] `electron/remote-agent/runtime/watch-ops.ts` -- watch lifecycle 구현
- [C] `electron/remote-agent/runtime/watch-ops.test.ts` -- watch/fallback 테스트
- [M] `electron/workspace-backend/remote-watch-bridge.ts` -- 이벤트 명세 차이 최소화(필요 시)
- [M] `electron/workspace-backend/remote-watch-bridge.test.ts` -- 이벤트 호환 회귀

**Technical Notes**:
- 원격 환경에서 native watch가 불가하면 polling fallback을 명시적으로 이벤트로 알린다.

**Dependencies**: P6-1

---

### Task P6-4: runtime payload 빌드/포장 파이프라인 추가
**Component**: Runtime Deployment Layer  
**Priority**: P0-Critical  
**Type**: Infrastructure

**Description**:
앱 빌드 산출물에 포함 가능한 runtime payload를 생성하고,
bootstrap이 그대로 원격으로 전송할 수 있는 형태(스크립트/단일 파일)로 포장한다.

**Acceptance Criteria**:
- [ ] 런타임 payload 생성 스크립트가 추가되고 로컬에서 실행 가능하다.
- [ ] payload 버전이 `REMOTE_AGENT_PROTOCOL_VERSION` 또는 명시적 runtime version과 연결된다.
- [ ] build/test 파이프라인에서 payload 누락 시 테스트가 실패한다.

**Target Files**:
- [C] `scripts/build-remote-agent-runtime.mjs` -- runtime payload 생성 스크립트
- [M] `package.json` -- runtime build 스크립트 연결
- [C] `electron/remote-agent/runtime/payload.test.ts` -- payload 생성/버전 정합 테스트
- [M] `electron/remote-agent/integration-smoke.test.ts` -- payload 존재 전제 회귀

**Technical Notes**:
- Phase 6 MVP runtime은 원격 `node` 런타임 의존을 허용한다.
- MVP에서는 코드서명 대신 checksum 기반 무결성 확인으로 시작한다.
- 자동 생성 산출물 commit 여부는 저장소 정책을 따르되, 테스트에서 존재성 검증을 고정한다.

**Dependencies**: P6-1

---

### Task P6-5: bootstrap에 payload 설치/업데이트 + 실행 검증 추가
**Component**: SSH Bootstrap & Session Lifecycle Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
bootstrap이 원격에 runtime payload를 업로드(또는 갱신)하고,
설치 후 `--protocol-version` + `--stdio` 준비 상태를 검증하도록 확장한다.

**Acceptance Criteria**:
- [ ] 원격에 runtime 파일이 없거나 버전이 다르면 자동 설치/업데이트된다.
- [ ] 설치 후 `--protocol-version` 검증 실패 시 `BOOTSTRAP_FAILED`를 반환한다.
- [ ] stdio 준비 실패(stub 메시지 포함)는 `BOOTSTRAP_FAILED` 또는 명시 코드로 표준화된다.
- [ ] bootstrap 테스트가 설치/업데이트/실패 경로를 검증한다.

**Target Files**:
- [M] `electron/remote-agent/bootstrap.ts` -- 설치 스크립트/검증 로직 확장
- [M] `electron/remote-agent/bootstrap.test.ts` -- 설치/업데이트/실패 회귀
- [M] `electron/remote-agent/types.ts` -- runtime 배포 관련 profile 옵션 보강(필요 시)
- [M] `electron/main.ts` -- bootstrap 오류 표면화 정합성 보강(필요 시)

**Technical Notes**:
- 사용자 지정 `agentPath`가 있으면 해당 경로에 runtime을 덮어쓰기 설치한다.
- `agentPath` 미지정 시 기본 경로 `~/.sdd-workbench/bin/sdd-remote-agent`를 사용한다.

**Dependencies**: P6-2, P6-3, P6-4

---

### Task P6-6: transport/connection-service 오류코드 매핑 및 진단 메시지 보강
**Component**: SSH Bootstrap & Session Lifecycle Layer  
**Priority**: P1-High  
**Type**: Reliability

**Description**:
agent 기동 실패를 단순 `CONNECTION_CLOSED`로 흡수하지 않도록,
transport/connection-service에서 bootstrap/runtime 오류를 구분해 전달한다.

**Acceptance Criteria**:
- [ ] runtime missing/stub/stdio 실패가 `CONNECTION_CLOSED` 대신 명시 코드로 전달된다.
- [ ] `connection-service` 이벤트(`degraded/disconnected`)의 `errorCode`/`message`가 원인과 일치한다.
- [ ] transport/connection-service 테스트가 새 매핑 규칙을 검증한다.

**Target Files**:
- [M] `electron/remote-agent/transport-ssh.ts` -- startup 실패 감지/매핑
- [M] `electron/remote-agent/transport-ssh.test.ts` -- startup 오류 매핑 테스트
- [M] `electron/remote-agent/connection-service.ts` -- 오류 전파/이벤트 정합화
- [M] `electron/remote-agent/connection-service.test.ts` -- 오류 전파 회귀
- [M] `electron/remote-agent/integration-smoke.test.ts` -- connect 실패 코드 검증 강화

**Technical Notes**:
- stderr에 `Remote agent runtime is not bundled` 패턴이 있으면 bootstrap 계층에서 우선 처리한다.

**Dependencies**: P6-5

---

### Task P6-7: agent path 기본값/가이드 및 실패 배너 정합화
**Component**: Renderer Diagnostics Layer  
**Priority**: P1-High  
**Type**: UX

**Description**:
기본 Agent Path 안내를 실제 기본 설치 경로와 일치시키고,
실패 배너에서 사용자가 즉시 복구 가능한 정보를 제공한다.

**Acceptance Criteria**:
- [ ] Connect Remote 모달의 Agent Path placeholder가 기본 경로와 일치한다.
- [ ] runtime 설치/기동 실패 시 배너가 "agent runtime 배포 실패" 성격을 명확히 표시한다.
- [ ] 민감 정보(redaction) 정책은 유지된다.
- [ ] App 테스트가 실패 메시지 분기를 검증한다.

**Target Files**:
- [M] `src/workspace/remote-connect-modal.tsx` -- placeholder/설명 문구 정합화
- [M] `src/workspace/workspace-context.tsx` -- 오류 코드별 배너 매핑 보강
- [M] `src/App.test.tsx` -- 배너/상태 메시지 회귀
- [M] `electron/remote-agent/security.ts` -- redaction 규칙 회귀 확인(필요 시)

**Technical Notes**:
- 경로/키/secret 노출 금지 규칙은 Phase 5 정책을 그대로 준수한다.

**Dependencies**: P6-6

---

### Task P6-8: Phase 6 통합 회귀 테스트/빌드 게이트 확정
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
runtime 구현/배포/기동 경로를 통합 테스트로 고정해,
다음 단계에서 다시 stub 상태로 회귀하지 않도록 한다.

**Acceptance Criteria**:
- [ ] 런타임 단위 테스트가 request 처리/경계검증/watch 이벤트를 검증한다.
- [ ] bootstrap/transport 테스트가 payload 설치/stdio 기동 실패 매핑을 검증한다.
- [ ] App 테스트가 사용자 가시 오류/재시도 흐름을 검증한다.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build`가 통과한다.

**Target Files**:
- [M] `electron/remote-agent/bootstrap.test.ts`
- [M] `electron/remote-agent/transport-ssh.test.ts`
- [M] `electron/remote-agent/connection-service.test.ts`
- [M] `electron/remote-agent/integration-smoke.test.ts`
- [M] `src/App.test.tsx`
- [M] `package.json` -- 테스트/빌드 게이트 연결(필요 시)

**Technical Notes**:
- SSH 실환경 E2E는 선택적 수동 스모크로 분리하고 CI는 mock 기반으로 결정성을 유지한다.

**Dependencies**: P6-7

---

## 6. Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 6-A | 3 | 2 | `P6-2`와 `P6-3`는 병렬 가능하나 `request-router.ts` 계약 충돌 가능 |
| 6-B | 3 | 1 | `bootstrap.ts`/`transport-ssh.ts`/`integration-smoke.test.ts` 공유로 순차 권장 |
| 6-C | 2 | 1 | `App.test.tsx` 공유로 `P6-7 -> P6-8` 순차 고정 |

충돌/순서 메모:

- `P6-1`의 runtime request/response 계약이 확정되기 전 `P6-2`/`P6-3` 병렬 착수 시 재작업 위험이 높다.
- `P6-5`와 `P6-6`은 `bootstrap`/`transport` 오류 매핑 경계를 공유하므로 같은 PR/연속 커밋으로 처리하는 편이 안전하다.
- `P6-8`은 phase 마지막 통합 게이트로 고정해 "연결됨" 스모크를 반드시 확인한다.

---

## 7. Risks & Mitigations

1. **원격 런타임 의존성(Node 런타임 등) 불일치 위험**
- Mitigation: MVP 의존성(requirements)을 명시하고, bootstrap preflight에서 명확한 에러 코드로 노출한다.

2. **runtime-allowlist 드리프트 위험**
- Mitigation: `security.ts` allowlist와 runtime method table을 교차 검증하는 테스트를 추가한다.

3. **watch 자원 누수/중복 이벤트 위험**
- Mitigation: watch start/stop 반복 시나리오 테스트로 watcher dispose를 고정한다.

4. **설치 스크립트 실패 시 원인 불명 위험**
- Mitigation: bootstrap stderr 패턴을 표준 오류 코드로 매핑하고, redaction 이후에도 진단 가능 키워드를 유지한다.

5. **UI Agent Path 안내와 실제 설치 경로 불일치 위험**
- Mitigation: 모달 placeholder/도움말 문구를 기본 설치 경로와 동일하게 맞추고 App 테스트로 잠근다.

---

## 8. Open Questions

1. runtime 버전 업그레이드 정책 확정 필요:
- 항상 덮어쓰기 vs 버전 비교 후 조건부 업그레이드.
- 현재 계획: protocol/runtime 버전 불일치 시 조건부 업그레이드.

2. Phase 6 완료 정의에 실환경 수동 스모크 포함 여부 확정 필요:
- CI(mock) 통과만으로 종료할지,
- 실제 SSH 대상 1회 연결 성공을 완료 조건에 포함할지.
- 현재 계획: CI 게이트 + 실환경 수동 스모크(권장) 병행.
