# IMPLEMENTATION_PLAN (F27 Phase 3: Renderer Remote UX + Workspace State 통합)

## 1. Overview

F27의 Phase 3 목표는 Phase 2에서 연결된 remote backend를 Renderer 사용자 흐름에 실제로 노출하는 것이다.
즉, 사용자가 앱에서 원격 연결을 생성/확인/종료할 수 있고, workspace 상태 모델이 remote 연결 상태를 일관되게 표현해야 한다.

핵심 결과물은 다음 3가지다.

1. `WorkspaceSession` 모델/영속화에 remote 메타데이터(`workspaceKind`, `remoteProfile`, `remoteConnectionState`, `remoteErrorCode`) 반영
2. `workspace:connectRemote` / `workspace:remoteConnectionEvent` / `workspace:disconnectRemote`를 `workspace-context` 액션/상태 머신으로 연결
3. App UI에 `Connect Remote Workspace` 진입점 + 상태 뱃지/배너 + 최소 연결 모달 도입

기준 입력:

- Feature Draft: `/_sdd/drafts/feature_draft_f27_remote_agent_protocol_mvp.md` (R6~R7)
- Phase 2 계획/결과:
  - `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_PLAN_PHASE_2.md`
  - `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_PROGRESS_PHASE_2.md`
- Spec (read-only):
  - `/_sdd/spec/main.md`
  - `/_sdd/spec/sdd-workbench/02-architecture.md`
  - `/_sdd/spec/sdd-workbench/04-interfaces.md`

가정(Phase 3 MVP):

- 연결 UX는 **모달 기반**으로 시작한다.
- remote 세션 자동 재연결(backoff/retry 고도화)은 Phase 4 범위로 유지한다.

---

## 2. Scope (In/Out)

### In Scope

- workspace 상태 모델에 remote 메타데이터 필드 추가
- snapshot persistence에 remote 메타데이터 저장/복원(기존 v1 스냅샷 하위호환 포함)
- `workspace-context`에 remote 연결/해제 액션 추가 및 remote connection event 반영
- App에 원격 연결 모달 진입점 추가 (`Connect Remote Workspace`)
- 활성 workspace remote 상태 표시(REMOTE 뱃지 + 연결 상태 + 오류 배너)
- remote workspace 닫기/전환 시 세션 정리(`disconnectRemote`) 연동
- 관련 단위/통합 테스트 보강

### Out of Scope

- SSH transport 재시도/백오프/보안 화이트리스트 강화 (Phase 4)
- agent 자동 업그레이드/롤백 오케스트레이션
- 다중 remote 프로필 저장소/즐겨찾기 UX
- F15 코드베이스의 완전 삭제(물리 제거) 자체

---

## 3. Components

1. **Workspace Session Model Layer**
- remote/local 공존을 위한 session 타입/ID 정책/상태 전이 규칙

2. **Workspace Persistence Layer**
- remote 메타데이터를 포함한 snapshot schema 진화 + 하위호환 로딩

3. **Workspace Context Remote Lifecycle Layer**
- connect/disconnect 액션, remote event 구독, watcher/index/comments 동기화

4. **Remote Connection UI Layer**
- 연결 모달, 연결 상태 뱃지/배너, 사용자 재시도/해제 동선

5. **Validation Layer**
- model/persistence/context/app 테스트로 회귀 차단

---

## 4. Implementation Phases

### Phase 3-A: 모델/영속화 계약 고정

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P3-1 | WorkspaceSession remote 메타데이터 + ID 정책 확장 | P0 | - | Workspace Session Model Layer |
| P3-2 | snapshot schema v2 확장 + v1 하위호환 로딩 | P0 | P3-1 | Workspace Persistence Layer |

### Phase 3-B: context remote lifecycle 연결

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P3-3 | connect/disconnect/event 상태 머신을 workspace-context에 통합 | P0 | P3-1,P3-2 | Workspace Context Remote Lifecycle Layer |

### Phase 3-C: UI 진입점 + 상태 가시화 + 검증

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P3-4 | Connect Remote 모달 + App 상태 표시/배너 UI 구현 | P1 | P3-3 | Remote Connection UI Layer |
| P3-5 | Phase 3 통합 테스트 보강 (App/model/persistence) | P0 | P3-4 | Validation Layer |

---

## 5. Task Details

### Task P3-1: WorkspaceSession remote 메타데이터 + ID 정책 확장
**Component**: Workspace Session Model Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`WorkspaceSession`에 remote 식별/상태 필드를 추가하고,
remote 연결 결과(`workspaceId`, `rootPath`)를 안정적으로 보관할 수 있도록 workspace ID 정책을 확장한다.

**Acceptance Criteria**:
- [ ] `WorkspaceSession`에 `workspaceKind`, `remoteProfile`, `remoteConnectionState`, `remoteErrorCode` 필드가 추가된다.
- [ ] remote workspace의 backend 식별자(`remoteWorkspaceId`)를 세션에 저장할 수 있다.
- [ ] local workspace 기본값/기존 동작이 깨지지 않는다.
- [ ] `addOrFocusWorkspace` 계열 API가 remote 생성 시 명시적 ID/메타데이터 주입을 지원한다.
- [ ] 모델 단위 테스트가 remote/local 혼합 상태를 검증한다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- session 타입/기본값/추가 액션/ID 정책 확장
- [M] `src/workspace/workspace-model.test.ts` -- remote session 생성/전환/닫기 케이스 추가

**Technical Notes**:
- `rootPath` 기반 local ID 생성 규칙은 유지한다.
- remote는 `connectRemote` 응답의 `workspaceId`를 backend 식별자로 유지하고,
  Renderer session ID와 분리 가능한 구조를 허용한다.

**Dependencies**: -

---

### Task P3-2: snapshot schema v2 확장 + v1 하위호환 로딩
**Component**: Workspace Persistence Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
workspace snapshot에 remote 메타데이터를 저장/복원하도록 schema를 확장한다.
기존 v1 스냅샷도 로딩 가능해야 한다.

**Acceptance Criteria**:
- [ ] persistence schema version이 증가하고 remote 필드가 저장된다.
- [ ] v1 snapshot 로드시 local 기본값으로 안전하게 마이그레이션된다.
- [ ] remote workspace snapshot 복원 시 `workspaceKind/remoteProfile/remoteConnectionState`가 유지된다.
- [ ] snapshot 파싱 실패/누락 필드는 non-fatal 처리된다.
- [ ] persistence 테스트가 v1/v2 모두 검증한다.

**Target Files**:
- [M] `src/workspace/workspace-persistence.ts` -- schema v2 + normalize/migration 로직
- [M] `src/workspace/workspace-persistence.test.ts` -- backward compatibility + remote 필드 테스트

**Technical Notes**:
- 민감정보(비밀번호/토큰)는 저장하지 않는다.
- MVP에서는 remote 복원 시 기본 상태를 `disconnected` 또는 마지막 persisted 상태로 두되,
  자동 재연결은 수행하지 않는다.

**Dependencies**: P3-1

---

### Task P3-3: connect/disconnect/event 상태 머신을 workspace-context에 통합
**Component**: Workspace Context Remote Lifecycle Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`workspace-context`에 remote 연결/해제 액션을 추가하고,
`workspace:remoteConnectionEvent`를 session 상태에 반영한다.
close/switch/watch 정리 경로도 remote 세션 정합성을 유지하도록 갱신한다.

**Acceptance Criteria**:
- [ ] `connectRemoteWorkspace(profile)` 액션이 추가된다.
- [ ] 연결 성공 시 remote workspace 세션이 생성되고 `rootPath` 기반 index/watch/comments/git 로딩이 시작된다.
- [ ] 연결 실패 시 `errorCode`/`error`를 배너 및 session 상태에 반영한다.
- [ ] `disconnectRemoteWorkspace(...)` 액션이 remote backend 세션 종료를 수행한다.
- [ ] `onRemoteConnectionEvent` 수신 시 `remoteConnectionState`/`remoteErrorCode`가 업데이트된다.
- [ ] remote workspace close 시 `disconnectRemote`가 누락 없이 호출된다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- remote 액션/이벤트 구독/정리 로직 추가
- [M] `src/workspace/workspace-model.ts` -- context에서 사용하는 상태 전이 헬퍼 보강(필요 시)
- [M] `src/App.test.tsx` -- context를 통한 remote lifecycle 통합 시나리오 검증

**Technical Notes**:
- Phase 2에서 도입된 `rootPath=remote://...` 경로와 backend 식별자(`workspaceId`)를 혼동하지 않도록
  context 내부에서 명시적으로 분리 관리한다.
- stale async response 방지 패턴(requestId gate)은 기존 index/read 흐름과 동일 규칙을 따른다.

**Dependencies**: P3-1, P3-2

---

### Task P3-4: Connect Remote 모달 + App 상태 표시/배너 UI 구현
**Component**: Remote Connection UI Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:
사용자가 원격 연결을 생성할 수 있는 모달 UI를 추가하고,
활성 workspace의 remote 상태를 뱃지/문구/배너로 시각화한다.

**Acceptance Criteria**:
- [ ] App 헤더/사이드바에 `Connect Remote Workspace` 진입 버튼이 추가된다.
- [ ] host/user/port/remoteRoot 입력 모달이 제공된다.
- [ ] submit 시 `connectRemoteWorkspace`를 호출하고 성공/실패 UX를 분기한다.
- [ ] 활성 remote workspace에 `REMOTE` + 연결상태(`connected|degraded|disconnected`)가 표시된다.
- [ ] `AUTH_FAILED/TIMEOUT/AGENT_PROTOCOL_MISMATCH/PATH_DENIED` 오류가 배너로 표준화 표시된다.
- [ ] local workspace 사용성(열기/전환/편집 흐름)을 저해하지 않는다.

**Target Files**:
- [C] `src/workspace/remote-connect-modal.tsx` -- 원격 연결 입력 모달
- [M] `src/App.tsx` -- 연결 액션 진입점 + 상태 뱃지/배너 연결
- [M] `src/App.css` -- 모달/remote 상태 표시 스타일
- [M] `src/App.test.tsx` -- 모달 submit/실패 배너/상태 표시 테스트

**Technical Notes**:
- MVP에서는 profile 저장/관리 UI 없이 즉시 연결(one-shot) 흐름을 우선한다.
- 오류 메시지는 내부 코드 노출을 최소화하되, 디버깅 가능한 `errorCode`는 테스트 가능 상태로 유지한다.

**Dependencies**: P3-3

---

### Task P3-5: Phase 3 통합 테스트 보강 (App/model/persistence)
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
remote 상태 모델/연결 UI/lifecycle 정리까지 포함한 회귀 테스트를 추가한다.

**Acceptance Criteria**:
- [ ] model 테스트에 remote session 필드/ID 정책 시나리오가 추가된다.
- [ ] persistence 테스트에 schema v2 저장/복원 + v1 하위호환 케이스가 추가된다.
- [ ] App 테스트에 connect 성공/실패/remote event 반영/disconnect 정리 시나리오가 추가된다.
- [ ] 기존 local workflow 테스트가 유지된다.
- [ ] Phase 3 완료 기준(`npx tsc --noEmit`, `npm test`)이 통과한다.

**Target Files**:
- [M] `src/workspace/workspace-model.test.ts` -- remote 상태 전이 단위 테스트
- [M] `src/workspace/workspace-persistence.test.ts` -- schema migration 테스트
- [M] `src/App.test.tsx` -- remote UX + lifecycle 통합 테스트

**Technical Notes**:
- SSH 실연결은 테스트 범위에서 제외하고 `window.workspace` mock으로 계약을 검증한다.
- 실패 케이스(assertion)는 오류 코드 우선, 메시지는 보조로 검증한다.

**Dependencies**: P3-4

---

## 6. Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 3-A | 2 | 1 | `workspace-model.ts` 타입 계약 의존으로 P3-1 → P3-2 순차 권장 |
| 3-B | 1 | 1 | `workspace-context.tsx` 단일 핵심 통합 지점 |
| 3-C | 2 | 1 | `src/App.test.tsx` 공유로 P3-4 → P3-5 순차 권장 |

충돌/순서 메모:

- `P3-1`의 모델 계약이 먼저 고정되어야 `P3-2/P3-3`가 안정적으로 진행된다.
- `P3-3`은 remote lifecycle의 중심이므로 병렬 분할보다 단일 배치 구현이 안전하다.
- `P3-4/P3-5`는 `App.test.tsx` 충돌 가능성이 높아 순차 실행이 효율적이다.

---

## 7. Risks & Mitigations

1. **리스크**: remote `workspaceId`와 renderer session ID 불일치로 watch/disconnect 누수 발생  
   **완화**: `remoteWorkspaceId`를 session에 명시 저장하고 모든 remote 제어 호출은 해당 ID를 사용

2. **리스크**: snapshot schema 변경으로 기존 사용자 세션 복원 실패  
   **완화**: v1 로더 유지 + invalid field non-fatal 정책 + migration 테스트 추가

3. **리스크**: remote connection event와 UI 상태 반영 타이밍 경쟁(race)  
   **완화**: requestId gate + active session 존재 확인 후 상태 적용

4. **리스크**: local UX 회귀(기존 open/switch/dirty/watch 흐름 손상)  
   **완화**: 기존 App/workspace 테스트를 유지하고 remote 테스트를 추가로 병행

5. **리스크**: 오류 코드 노출 방식 불일치로 사용자 혼란  
   **완화**: 배너 메시지 포맷을 errorCode 중심으로 표준화하고 테스트에서 고정

---

## 8. Open Questions

1. 원격 연결 UX를 MVP에서 모달로 고정할지(현 계획), 차기 Phase에서 패널/프로필 매니저로 확장할지 확정 필요.
2. 앱 재실행 후 persisted remote workspace를 자동 재연결할지, `disconnected` 상태로 복원 후 수동 재연결할지 확정 필요.
3. remote profile에서 `workspaceId` 생성 규칙(사용자 입력 vs 자동 생성 slug)을 최종 확정할 필요가 있다.
4. remote workspace 닫기 시 기본 동작을 `세션 종료 후 탭 제거`로 고정할지, `탭 유지(disconnected)` 옵션을 둘지 확정 필요.
