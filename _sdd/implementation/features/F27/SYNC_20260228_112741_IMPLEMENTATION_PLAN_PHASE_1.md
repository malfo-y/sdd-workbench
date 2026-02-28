# IMPLEMENTATION_PLAN (F27 Phase 1: Protocol + SSH Session Bootstrap)

## 1. Overview

F27의 Phase 1 목표는 원격 워크스페이스 전체 기능을 바로 구현하는 것이 아니라,
원격 연결의 기반 계층(프로토콜 계약 + SSH 세션/부트스트랩)을 먼저 고정하는 것이다.

핵심 결과물은 다음 3가지다.

1. 원격 에이전트 메시지 계약/프레이밍/오류코드의 단일 소스 정의
2. SSH 기반 원격 세션 수명주기(start/stop/fail) 관리 계층
3. MVP 자동화 범위(존재 확인 -> 없으면 설치 -> 버전 검증)를 포함한 bootstrap 경로

기준 입력:

- Feature Draft: `/_sdd/drafts/feature_draft_f27_remote_agent_protocol_mvp.md`
- Spec: `/_sdd/spec/main.md` (v0.41.0)
- Split Spec: `/_sdd/spec/sdd-workbench/02-architecture.md`, `04-interfaces.md`, `05-operational-guides.md`

---

## 2. Scope (In/Out)

### In Scope

- 원격 에이전트 프로토콜 타입/버전/오류 코드 정의
- stdio 기반 메시지 프레이밍(JSON line framing) 인코드/디코드
- SSH child process 실행 + 세션 시작/종료/오류 관리
- 세션 레지스트리(세션 ID, 상태, 정리 책임)
- MVP bootstrap 자동화:
  - 원격 agent 존재 확인
  - 미존재 시 설치
  - 프로토콜 버전 검증
- 최소 IPC 진입점(`connectRemote`, `disconnectRemote`) main/preload/env 타입 연결
- 단위/스모크 테스트 추가

### Out of Scope

- 원격 파일 I/O/CRUD/read/write/index 구현(R4 이후)
- 원격 watch/git 브리지(R5 이후)
- renderer 원격 상태 모델/연결 UI(R6~R7)
- 자동 업그레이드/롤백/복수 배포 채널 관리
- F15 제거 코드 정리(이번 Phase에서는 계획/플래그만 유지)

---

## 3. Components

1. **Remote Protocol Layer**
- 요청/응답/이벤트 타입, 오류 코드, 버전 계약, 프레이밍

2. **SSH Transport Layer**
- SSH 프로세스 실행, stdio 연결, 요청 전송/응답 매칭

3. **Bootstrap Automation Layer (MVP)**
- remote agent 존재 확인, 설치, 버전 검증

4. **Session Registry Layer**
- 세션 lifecycle/cleanup 책임과 상태 추적

5. **Main IPC Adapter Layer**
- connect/disconnect 진입점과 transport/registry 연결

6. **Validation Layer**
- 프로토콜/세션/부트스트랩 단위 테스트 + main 연동 스모크

---

## 4. Implementation Phases

### Phase 1-A: 계약/기반 모듈 고정

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P1-1 | 원격 프로토콜 타입/프레이밍 모듈 구현 | P0 | - | Remote Protocol Layer |
| P1-2 | remote IPC 경계 타입(preload/env) 추가 | P0 | P1-1 | Main IPC Adapter Layer |
| P1-3 | 세션 레지스트리 구현 | P0 | - | Session Registry Layer |

### Phase 1-B: SSH/Bootstrap 런타임 구축

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P1-4 | SSH transport 구현(세션 start/stop + 요청 매칭) | P0 | P1-1,P1-3 | SSH Transport Layer |
| P1-5 | MVP bootstrap 자동화(존재 확인/설치/버전 검증) 통합 | P0 | P1-4 | Bootstrap Automation Layer |

### Phase 1-C: Main 연동 + 검증

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P1-6 | `connectRemote`/`disconnectRemote` main 핸들러 연결 및 스모크 테스트 | P0 | P1-2,P1-3,P1-5 | Main IPC Adapter Layer |

---

## 5. Task Details

### Task P1-1: 원격 프로토콜 타입/프레이밍 모듈 구현
**Component**: Remote Protocol Layer
**Priority**: P0-Critical
**Type**: Infrastructure

**Description**:
원격 agent와 로컬 main 간의 요청/응답/이벤트 타입을 고정하고, line-delimited JSON 프레이밍 인코드/디코드 유틸을 구현한다.

**Acceptance Criteria**:
- [ ] 요청/응답/이벤트 타입이 단일 모듈로 정의된다.
- [ ] 오류 코드(`AUTH_FAILED`, `TIMEOUT`, `AGENT_PROTOCOL_MISMATCH`, `PATH_DENIED`)가 계약에 포함된다.
- [ ] 프로토콜 버전 필드/검증 함수가 포함된다.
- [ ] framing 유틸이 chunk 경계 분할 입력에서도 안정적으로 메시지를 복원한다.

**Target Files**:
- [C] `electron/remote-agent/protocol.ts` -- 프로토콜 타입/오류코드/버전 계약
- [C] `electron/remote-agent/framing.ts` -- JSON line framing 인코드/디코드
- [C] `electron/remote-agent/protocol.test.ts` -- 타입/버전/오류코드 검증 테스트
- [C] `electron/remote-agent/framing.test.ts` -- chunk split/invalid payload 테스트

**Technical Notes**:
- framing은 UTF-8 문자열 기준으로 처리하고 payload size cap(예: 1MB) 방어 로직을 포함한다.

**Dependencies**: -

---

### Task P1-2: remote IPC 경계 타입(preload/env) 추가
**Component**: Main IPC Adapter Layer
**Priority**: P0-Critical
**Type**: Infrastructure

**Description**:
Renderer가 사용할 remote 연결 API 시그니처를 `electron-env.d.ts`와 `preload.ts`에 추가해 타입 경계를 먼저 고정한다.

**Acceptance Criteria**:
- [ ] `window.workspace.connectRemote(profile)` 타입이 추가된다.
- [ ] `window.workspace.disconnectRemote(workspaceId)` 타입이 추가된다.
- [ ] remote connection event payload 타입이 선언된다.
- [ ] 기존 API와 타입 충돌 없이 빌드 가능하다.

**Target Files**:
- [M] `electron/electron-env.d.ts` -- remote connect/disconnect 타입 추가
- [M] `electron/preload.ts` -- remote IPC invoke/on 이벤트 브리지 추가

**Technical Notes**:
- 실제 handler 구현(P1-6) 전까지 preload는 invoke 채널 시그니처만 고정한다.

**Dependencies**: P1-1

---

### Task P1-3: 세션 레지스트리 구현
**Component**: Session Registry Layer
**Priority**: P0-Critical
**Type**: Infrastructure

**Description**:
원격 세션의 생성/조회/종료/정리 책임을 캡슐화한 registry 모듈을 구현한다.

**Acceptance Criteria**:
- [ ] 세션 생성 시 고유 sessionId를 부여한다.
- [ ] 세션 상태(`connecting/connected/degraded/disconnected`)를 추적한다.
- [ ] 중복 종료/누락 정리 케이스가 안전하게 처리된다.
- [ ] 세션 조회/삭제 API가 테스트로 검증된다.

**Target Files**:
- [C] `electron/remote-agent/session-registry.ts` -- 세션 상태 저장/정리 모듈
- [C] `electron/remote-agent/session-registry.test.ts` -- lifecycle 테스트

**Technical Notes**:
- registry는 transport 구현 상세에 의존하지 않도록 세션 핸들 타입을 최소 인터페이스로 유지한다.

**Dependencies**: -

---

### Task P1-4: SSH transport 구현(세션 start/stop + 요청 매칭)
**Component**: SSH Transport Layer
**Priority**: P0-Critical
**Type**: Infrastructure

**Description**:
SSH child process를 실행해 원격 agent와 통신하고, 요청 ID 기준 응답 매칭/타임아웃/종료 처리를 구현한다.

**Acceptance Criteria**:
- [ ] 연결 프로필(host/user/port/remoteRoot)로 세션 시작이 가능하다.
- [ ] 요청 전송 후 response matching이 request id 기준으로 동작한다.
- [ ] 요청 타임아웃 시 `TIMEOUT` 오류로 변환된다.
- [ ] 프로세스 종료/에러 시 pending 요청이 정리되고 누수가 없다.

**Target Files**:
- [C] `electron/remote-agent/transport-ssh.ts` -- SSH 실행/요청응답/종료 처리
- [C] `electron/remote-agent/transport-ssh.test.ts` -- child process mock 기반 transport 테스트

**Technical Notes**:
- MVP에서는 `ssh` CLI 의존을 허용하고, 인증 정책은 OS/사용자 SSH 설정에 위임한다.

**Dependencies**: P1-1, P1-3

---

### Task P1-5: MVP bootstrap 자동화(존재 확인/설치/버전 검증) 통합
**Component**: Bootstrap Automation Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
transport 시작 전에 원격 agent bootstrap 단계를 추가해, agent 미설치 환경에서도 자동 연결을 가능하게 한다.

**Acceptance Criteria**:
- [ ] remote agent 존재 확인 단계가 실행된다.
- [ ] 미설치 시 설치 루틴이 1회 실행된다.
- [ ] 설치/기존 agent 모두 버전 검증을 통과해야 세션 연결이 진행된다.
- [ ] 버전 불일치 시 `AGENT_PROTOCOL_MISMATCH` 오류를 반환한다.

**Target Files**:
- [C] `electron/remote-agent/bootstrap.ts` -- 존재 확인/설치/버전 검증 orchestration
- [C] `electron/remote-agent/bootstrap.test.ts` -- bootstrap 성공/실패/버전불일치 테스트
- [M] `electron/remote-agent/transport-ssh.ts` -- bootstrap 단계 호출 통합

**Technical Notes**:
- 설치 자산 전달 방식(스크립트/바이너리)은 Open Question으로 남기고, 인터페이스(`installAgent`)를 추상화해 후속 교체 가능하게 설계한다.

**Dependencies**: P1-4

---

### Task P1-6: `connectRemote`/`disconnectRemote` main 핸들러 연결 및 스모크 테스트
**Component**: Main IPC Adapter Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
main IPC에 remote 연결/해제 핸들러를 추가하고 transport+registry를 연결해 end-to-end 스모크 경로를 완성한다.

**Acceptance Criteria**:
- [ ] `workspace:connectRemote`가 세션 시작 결과를 반환한다.
- [ ] `workspace:disconnectRemote`가 세션 종료/정리를 수행한다.
- [ ] 연결 실패 시 오류 코드(`AUTH_FAILED`, `TIMEOUT`, `AGENT_PROTOCOL_MISMATCH`)가 표준 계약으로 반환된다.
- [ ] smoke 테스트에서 성공/실패 경로가 검증된다.

**Target Files**:
- [M] `electron/main.ts` -- connect/disconnect 핸들러 추가 + registry/transport 연동
- [C] `electron/remote-agent/integration-smoke.test.ts` -- main-transport-registry 스모크 테스트

**Technical Notes**:
- Phase 1에서는 remote workspace 생성/파일연산 연결 대신 세션 연결 성공 여부와 표준 오류 반환까지만 보장한다.

**Dependencies**: P1-2, P1-3, P1-5

---

## 6. Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1-A | 3 | 2 (`P1-1` ∥ `P1-3`) | 없음 (`P1-2`는 preload/env만 수정) |
| 1-B | 2 | 1 | `electron/remote-agent/transport-ssh.ts` (`P1-4`,`P1-5`) |
| 1-C | 1 | 1 | `electron/main.ts` 단일 변경 |

충돌/순서 메모:
- `P1-1` 완료 전에는 `P1-2`,`P1-4` 진행 불가(타입 계약 미고정).
- `P1-4`,`P1-5`는 동일 파일 수정으로 반드시 순차 수행.
- `P1-6`는 앞선 결과를 집약하므로 마지막에 고정.

---

## 7. Risks & Mitigations

1. **리스크**: SSH 실행 환경 편차(macOS/Linux 옵션 차이)로 bootstrap 실패
   **완화**: transport 옵션을 최소화하고 실패 원인을 표준 오류 코드로 매핑

2. **리스크**: 프레이밍/응답 매칭 버그로 세션 hang 발생
   **완화**: `framing.test.ts` + timeout + pending request cleanup 강제

3. **리스크**: bootstrap 자동화 구현이 과도해져 Phase 1 범위 초과
   **완화**: 존재 확인/설치/버전 검증만 구현, 업그레이드/롤백은 명시적으로 제외

4. **리스크**: main 핸들러 선추가로 renderer 기대 계약과 불일치
   **완화**: `electron-env.d.ts`/`preload.ts`/`main.ts`를 같은 커밋 단위로 동기화

---

## 8. Open Questions

1. 원격 agent 배포 artifact를 Node 스크립트로 둘지, 단일 바이너리로 둘지 최종 결정 필요
2. 설치 자산 전달 경로(앱 번들 내 포함 vs 런타임 다운로드) 결정 필요
3. SSH host key 정책(`StrictHostKeyChecking`)을 앱에서 고정할지 사용자 환경 기본값을 따를지 결정 필요
4. `workspaceId` 생성 규칙을 어떤 형태로 고정할지(`ssh://user@host/path` vs 내부 UUID) 결정 필요
