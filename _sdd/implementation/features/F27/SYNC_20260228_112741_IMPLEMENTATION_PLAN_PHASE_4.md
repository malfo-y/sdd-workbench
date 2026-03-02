# IMPLEMENTATION_PLAN (F27 Phase 4: 신뢰성/보안 강화 + F15(SSHFS) 경로 폐기)

## 1. Overview

F27의 Phase 4 목표는 Phase 3까지 확보한 원격 연결 UX를 **운영 가능한 수준으로 하드닝**하는 것이다.
핵심은 다음 4가지다.

1. remote 연결 재시도/백오프 정책을 표준화하고 상태머신(`connecting -> connected -> degraded/disconnected`)을 안정화
2. remote RPC 보안 경계(허용 메서드 화이트리스트 + 경로 경계 + 민감 정보 노출 방지) 강화
3. 결정사항에 따라 F15(SSHFS 기반 remote 감지/휴리스틱) 경로를 코드에서 제거
4. 위 변경을 App/Electron 통합 테스트로 회귀 방지

기준 입력:

- Feature Draft: `/_sdd/drafts/feature_draft_f27_remote_agent_protocol_mvp.md` (R8~R9)
- 이전 단계:
  - `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_PLAN_PHASE_3.md`
  - `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_PROGRESS_PHASE_3.md`
- Spec (read-only):
  - `/_sdd/spec/main.md`
  - `/_sdd/spec/sdd-workbench/02-architecture.md`
  - `/_sdd/spec/sdd-workbench/04-interfaces.md`
  - `/_sdd/spec/sdd-workbench/05-operational-guides.md`
- Decision Log:
  - `/_sdd/spec/DECISION_LOG.md` (F15 폐기 + F27 단일 경로 결정)

가정(Phase 4):

- remote 연결 자동 재시도는 **일시적 오류(TIMEOUT/CONNECTION_CLOSED 계열)**에 한정한다.
- 치명적 오류(`AUTH_FAILED`, `AGENT_PROTOCOL_MISMATCH`, `PATH_DENIED`)는 즉시 실패 처리하고 자동 재시도하지 않는다.

---

## 2. Scope (In/Out)

### In Scope

- remote 연결 정책 환경값/기본값 정리 (`connect timeout`, `request timeout`, `retry attempts`)
- connection-service 재시도/백오프 상태머신 구현 및 이벤트 정합성 강화
- remote 보안 강화를 위한 메서드 화이트리스트/오류 메시지 민감정보 차단
- F15(SSHFS/mount 기반 remote 감지) 코드 제거 및 watch mode 해석 단순화
- Renderer 재시도 UX(배너/버튼) 및 상태 표시 정합화
- Phase 4 통합 회귀 테스트 보강

### Out of Scope

- agent 자동 업그레이드/롤백 오케스트레이션
- 다중 프로필 저장소/즐겨찾기/고급 프로필 관리 UX
- 원격 터미널/포트포워딩/원격 확장 실행
- 원격 권한 모델 세분화(RBAC 등)

---

## 3. Components

1. **Remote Reliability Policy Layer**
- 재시도 횟수/백오프/타임아웃 정책의 단일 소스

2. **Remote Connection Lifecycle Layer**
- connection-service 재시도 상태 전이와 이벤트 전달 일관성

3. **Remote Security Guard Layer**
- RPC 허용 메서드 검증, 경계 위반 차단, 민감정보 노출 방지

4. **Legacy F15 Decommission Layer**
- SSHFS/mount 휴리스틱 제거 및 F27 단일 경로 정리

5. **Renderer Recovery UX Layer**
- 재시도 진입점/배너/상태 표현 정합화

6. **Validation Layer**
- unit/integration/app 테스트로 회귀 차단

---

## 4. Implementation Phases

### Phase 4-A: 신뢰성 정책 + 연결 상태머신 강화

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P4-1 | remote 신뢰성 정책(환경값/기본값) 모듈화 | P0 | - | Remote Reliability Policy Layer |
| P4-2 | connection-service 재시도/백오프 상태머신 구현 | P0 | P4-1 | Remote Connection Lifecycle Layer |

### Phase 4-B: 보안 하드닝 + F15 제거

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P4-3 | remote RPC 보안 가드(화이트리스트/민감정보 차단) 적용 | P0 | P4-2 | Remote Security Guard Layer |
| P4-4 | F15(SSHFS/mount 휴리스틱) 경로 제거 및 watch mode 단순화 | P0 | P4-2 | Legacy F15 Decommission Layer |

### Phase 4-C: Renderer 복구 UX + 검증

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P4-5 | 재시도 UX(배너/액션) 및 상태 표시 정합화 | P1 | P4-2,P4-3,P4-4 | Renderer Recovery UX Layer |
| P4-6 | Phase 4 통합 회귀 테스트/스모크 보강 | P0 | P4-5 | Validation Layer |

---

## 5. Task Details

### Task P4-1: remote 신뢰성 정책(환경값/기본값) 모듈화
**Component**: Remote Reliability Policy Layer  
**Priority**: P0-Critical  
**Type**: Infrastructure

**Description**:
remote 연결 관련 타임아웃/재시도 정책을 단일 모듈로 정리하고,
`main -> connection-service -> transport` 경로에서 동일 기본값/검증 규칙을 사용하도록 통합한다.

**Acceptance Criteria**:
- [ ] `REMOTE_AGENT_CONNECT_TIMEOUT_MS`, `REMOTE_AGENT_REQUEST_TIMEOUT_MS`, `REMOTE_AGENT_RECONNECT_ATTEMPTS` 기본값/상한/하한이 코드로 명시된다.
- [ ] 잘못된 환경값(음수/NaN/과도한 값)은 안전한 기본값으로 normalize된다.
- [ ] connection-service 생성 시 정책이 명시적으로 주입된다.
- [ ] 정책 로더 단위 테스트가 추가된다.

**Target Files**:
- [C] `electron/remote-agent/reliability-policy.ts` -- 정책 로딩/정규화 유틸
- [C] `electron/remote-agent/reliability-policy.test.ts` -- env normalize 테스트
- [M] `electron/main.ts` -- 정책 로더 호출 + service 주입
- [M] `electron/remote-agent/connection-service.ts` -- 정책 옵션 수신

**Technical Notes**:
- 정책값은 프로세스 시작 시 1회 해석 후 immutable로 전달한다.
- 정책 로더는 side-effect 없이 순수 함수 중심으로 구현한다.

**Dependencies**: -

---

### Task P4-2: connection-service 재시도/백오프 상태머신 구현
**Component**: Remote Connection Lifecycle Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
연결 실패/예기치 못한 끊김에 대해 재시도 횟수/백오프를 적용하고,
`remoteConnectionEvent`가 상태/오류코드 관점에서 일관되게 발행되도록 정리한다.

**Acceptance Criteria**:
- [ ] transient 오류(`TIMEOUT`, `CONNECTION_CLOSED` 계열)에서만 자동 재시도한다.
- [ ] fatal 오류(`AUTH_FAILED`, `AGENT_PROTOCOL_MISMATCH`, `PATH_DENIED`)는 즉시 실패 처리한다.
- [ ] 재시도 중 상태는 `connecting` 또는 `degraded`로 유지되고, 한도 초과 시 `disconnected`로 종료된다.
- [ ] 재시도 종료 후 `disconnect`/`shutdown` 경로에서 transport/session 누수가 없다.
- [ ] connection lifecycle 테스트(성공/일시실패-복구/치명실패/한도초과)가 추가된다.

**Target Files**:
- [M] `electron/remote-agent/connection-service.ts` -- retry/backoff 상태 전이 구현
- [M] `electron/remote-agent/session-registry.ts` -- 상태 갱신/오류코드 추적 보강(필요 시)
- [C] `electron/remote-agent/connection-service.test.ts` -- lifecycle/retry 테스트
- [M] `electron/remote-agent/integration-smoke.test.ts` -- connect/disconnect 계약 회귀

**Technical Notes**:
- 백오프는 단순 exponential + max cap(예: 0.5s/1s/2s, cap 적용)으로 시작한다.
- 기존 `RemoteConnectResult`/IPC 응답 형태를 깨지 않도록 내부 상태머신으로 캡슐화한다.

**Dependencies**: P4-1

---

### Task P4-3: remote RPC 보안 가드(화이트리스트/민감정보 차단) 적용
**Component**: Remote Security Guard Layer  
**Priority**: P0-Critical  
**Type**: Security

**Description**:
remote RPC 호출 가능 메서드를 화이트리스트로 제한하고,
오류 메시지/배너/로그 경로에서 민감정보가 노출되지 않도록 표준화한다.

**Acceptance Criteria**:
- [ ] remote backend가 허용된 RPC 메서드 목록 외 호출을 차단한다.
- [ ] 경계 위반/허용되지 않은 메서드 호출은 `PATH_DENIED` 또는 명시적 보안 오류로 표준화된다.
- [ ] 사용자 노출 에러 메시지에서 민감정보(절대키 경로/비밀번호/원문 ssh stderr)가 제거된다.
- [ ] 보안 가드 단위 테스트 및 remote backend 보안 회귀 테스트가 추가된다.

**Target Files**:
- [C] `electron/remote-agent/security.ts` -- RPC whitelist/민감정보 마스킹 유틸
- [C] `electron/remote-agent/security.test.ts` -- whitelist/redaction 테스트
- [M] `electron/workspace-backend/remote-workspace-backend.ts` -- 메서드 호출 보안 가드 적용
- [M] `electron/workspace-backend/remote-workspace-backend.test.ts` -- 거부/매핑 테스트 보강
- [M] `src/workspace/workspace-context.tsx` -- fallback 메시지 처리 시 민감정보 노출 방지

**Technical Notes**:
- 화이트리스트는 `workspace.*` 허용 메서드를 상수로 관리하고 테스트로 잠근다.
- redaction 정책은 코드상 공통 유틸로 유지해 중복 구현을 피한다.

**Dependencies**: P4-2

---

### Task P4-4: F15(SSHFS/mount 휴리스틱) 경로 제거 및 watch mode 단순화
**Component**: Legacy F15 Decommission Layer  
**Priority**: P0-Critical  
**Type**: Refactor

**Description**:
결정사항에 따라 F15 경로(SSHFS/mount 기반 remote 감지)를 제거하고,
watch mode 해석을 F27 remote/local 경로 중심으로 단순화한다.

**Acceptance Criteria**:
- [ ] `electron/remote-mount-detection.ts`와 관련 테스트가 제거된다.
- [ ] `workspace-watch-mode`가 mount 휴리스틱 없이 동작하도록 단순화된다.
- [ ] `main.ts`에서 F15 감지 분기(`detectRemoteMountPoint`) 의존이 제거된다.
- [ ] local/remote watcher 동작이 회귀 없이 유지된다(remote는 remote backend 계약 기준).
- [ ] 관련 테스트가 새 규칙 기준으로 갱신된다.

**Target Files**:
- [D] `electron/remote-mount-detection.ts` -- F15 감지 로직 제거
- [D] `electron/remote-mount-detection.test.ts` -- F15 감지 테스트 제거
- [M] `electron/workspace-watch-mode.ts` -- watch mode 해석 단순화
- [M] `electron/workspace-watch-mode.test.ts` -- 새 규칙 테스트
- [M] `electron/main.ts` -- mount 기반 힌트 제거/대체

**Technical Notes**:
- 기존 `watchModePreference` 사용자 override(`native|polling`)는 유지한다.
- remote 여부 판정은 backend 종류/remote workspace 식별자를 우선 사용한다.

**Dependencies**: P4-2

---

### Task P4-5: 재시도 UX(배너/액션) 및 상태 표시 정합화
**Component**: Renderer Recovery UX Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:
재시도 가능한 실패 상태에서 사용자가 명시적으로 복구 동작을 실행할 수 있도록,
배너/상태 표시/버튼 동선을 일관되게 정리한다.

**Acceptance Criteria**:
- [ ] `disconnected/degraded` 상태에서 재시도 액션(예: Retry Connect)이 노출된다.
- [ ] 재시도 시 마지막 remote profile을 사용해 `connectRemoteWorkspace`를 다시 실행할 수 있다.
- [ ] 치명적 오류와 일시적 오류의 UI 메시지/액션이 구분된다.
- [ ] local workspace 사용성(열기/편집/전환) 회귀가 없다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- retry 액션/상태 처리
- [M] `src/App.tsx` -- retry 버튼/상태 문구/배너 동선
- [M] `src/App.css` -- retry UI 스타일
- [M] `src/App.test.tsx` -- retry UX 시나리오 테스트
- [M] `src/workspace/remote-connect-modal.tsx` -- 재시도 UX와 모달 상호작용 정합화(필요 시)

**Technical Notes**:
- retry 액션은 profile 누락 시 no-op이 아니라 사용자 안내 배너를 반환한다.
- 재시도 진행 중 중복 클릭 방지를 위해 pending 상태를 명시한다.

**Dependencies**: P4-2, P4-3, P4-4

---

### Task P4-6: Phase 4 통합 회귀 테스트/스모크 보강
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
신뢰성/보안/F15 제거가 동시에 들어가므로,
Electron(remote-agent/backend) + Renderer(App/context) 회귀를 통합 관점으로 보강한다.

**Acceptance Criteria**:
- [ ] remote-agent 테스트가 retry 정책/치명오류 즉시실패/한도초과를 검증한다.
- [ ] backend 테스트가 whitelist/path guard/security redaction을 검증한다.
- [ ] App 테스트가 retry UX + remote 상태 전이 + disconnect 정리를 검증한다.
- [ ] F15 제거 후 watch mode 테스트가 새 기준으로 안정적으로 통과한다.
- [ ] 완료 기준(`npx tsc --noEmit`, `npm test`, 필요 시 `npm run build`)이 통과한다.

**Target Files**:
- [M] `electron/remote-agent/connection-service.test.ts` -- retry/fatal 케이스 보강
- [M] `electron/remote-agent/integration-smoke.test.ts` -- IPC 계약 회귀
- [M] `electron/workspace-backend/remote-workspace-backend.test.ts` -- 보안 가드 회귀
- [M] `electron/workspace-watch-mode.test.ts` -- F15 제거 후 watch mode 규칙 검증
- [M] `src/App.test.tsx` -- retry UX 통합 시나리오

**Technical Notes**:
- 실 SSH 연결은 테스트 범위에서 제외하고 mock transport로 결정적 시나리오를 검증한다.
- flaky 방지를 위해 retry/backoff 타이머는 fake timers 기반으로 검증한다.

**Dependencies**: P4-5

---

## 6. Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 4-A | 2 | 1 | `connection-service.ts` 공유로 `P4-1 -> P4-2` 순차 권장 |
| 4-B | 2 | 2 | `electron/main.ts` 충돌 가능성으로 중간 머지 체크 필요 |
| 4-C | 2 | 1 | `src/App.test.tsx` 공유로 `P4-5 -> P4-6` 순차 권장 |

충돌/순서 메모:

- `P4-2` 상태머신 계약이 확정되기 전 `P4-5` UX 구현을 시작하면 이벤트 해석 재작업 가능성이 높다.
- `P4-3`(보안 가드)와 `P4-4`(F15 제거)는 이론상 병렬 가능하지만 `main.ts` 충돌 가능성이 있어 짧은 단위 머지가 필요하다.
- 테스트 파일(`App.test.tsx`, `integration-smoke.test.ts`)은 마지막 단계에서 집중 갱신하는 것이 충돌 비용이 낮다.

---

## 7. Risks & Mitigations

1. **재시도 로직 복잡도 증가로 상태 꼬임 위험**
- Mitigation: fake timer 기반 상태 전이 테스트를 먼저 작성하고, `connection-service` 단일 진입점으로 상태 변경을 제한.

2. **민감정보 마스킹 누락 위험**
- Mitigation: redaction 유틸을 공통화하고, 금지 패턴(키 경로/원문 ssh stderr) 단위 테스트를 추가.

3. **F15 제거 시 로컬 watcher 동작 회귀 위험**
- Mitigation: `workspace-watch-mode.test.ts`와 `npm test` 전체 실행을 Phase 4 완료 게이트로 고정.

4. **Renderer UX/이벤트 계약 불일치 위험**
- Mitigation: `App.test.tsx`에서 connect 실패 -> retry -> recovered 시나리오를 계약 테스트로 고정.

5. **동시 변경 파일 충돌(`main.ts`, `App.test.tsx`)로 개발 속도 저하**
- Mitigation: 계획된 순차 구간을 유지하고, 병렬 시 파일 경계를 엄격히 분리.

---

## 8. Open Questions

1. 자동 재시도 적용 범위를 정확히 어디까지 볼지 확정 필요:
   - `TIMEOUT`/`CONNECTION_CLOSED`만 재시도할지,
   - `UNKNOWN` 일부를 포함할지.

2. 재시도 백오프 정책 수치 확정 필요:
   - 기본 제안: `0.5s -> 1s -> 2s` (cap),
   - 혹은 고정 간격 재시도.

3. F15 제거 이후 `watchModePreference` UX 유지 수준 확정 필요:
   - remote에서도 수동 override(`native|polling`)를 계속 허용할지,
   - remote는 polling 고정으로 단순화할지.

4. `RemoteConnectionState` 타입에서 `idle` 상태(문서)와 실제 코드 상태머신 정합화 여부 확정 필요:
   - 코드 기준(`connecting|connected|degraded|disconnected`) 유지,
   - 또는 문서/타입에 `idle`을 일치시킬지.
