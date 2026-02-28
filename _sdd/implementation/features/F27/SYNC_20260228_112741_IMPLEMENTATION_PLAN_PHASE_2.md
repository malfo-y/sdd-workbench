# IMPLEMENTATION_PLAN (F27 Phase 2: Workspace Backend 분리 + Remote 실행 경로 연결)

## 1. Overview

F27의 Phase 2 목표는 Phase 1에서 만든 원격 세션 계층을
기존 `workspace:*` IPC 파일 연산 경로에 실제로 연결하는 것이다.

핵심 결과물은 다음 3가지다.

1. `electron/main.ts`의 로컬 파일 연산 로직을 backend 계층으로 분리
2. remote agent RPC 기반 `remote backend` 구현(파일 I/O/CRUD/comments/git/watch 브리지)
3. `connectRemote` 성공 결과를 기존 `rootPath` 기반 계약과 호환되는 workspace 식별자로 노출

기준 입력:

- Feature Draft: `/_sdd/drafts/feature_draft_f27_remote_agent_protocol_mvp.md` (Part 2, R3~R5)
- Phase 1 계획/결과:
  - `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_PLAN_PHASE_1.md`
  - `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_PROGRESS_PHASE_1.md`
- Spec (read-only): `/_sdd/spec/main.md`, `/_sdd/spec/sdd-workbench/02-architecture.md`, `04-interfaces.md`, `05-operational-guides.md`

---

## 2. Scope (In/Out)

### In Scope

- `WorkspaceBackend` 인터페이스 도입 및 local backend 분리
- remote backend 구현:
  - index/read/write/create/delete/rename
  - comments/global comments read/write/export
  - getGitLineMarkers/getGitFileStatuses
  - watch start/stop + 이벤트 브리지
- main IPC의 backend 라우팅 계층 도입
- `workspace:connectRemote` 계약을 spec 요약과 정합되도록 확장:
  - 성공 시 `workspaceId` + `rootPath`(remote workspace 식별자) 반환
- 단위/통합 스모크 테스트 보강

### Out of Scope

- Renderer 원격 연결 UI(Connect Remote Workspace 버튼/모달) 구현 (Phase 3)
- Workspace 상태 모델(`workspaceKind`, `remoteProfile`, `remoteConnectionState`) 확장 (Phase 3)
- 자동 재연결/백오프/보안 화이트리스트 강화 (Phase 4)
- remote agent 자동 업그레이드/롤백 오케스트레이션
- F15 코드 제거(폐기 정리) 자체 구현

---

## 3. Components

1. **Workspace Backend Contract Layer**
- local/remote 공통 메서드 계약 정의

2. **Local Workspace Backend Layer**
- 기존 local FS 구현을 `main.ts`에서 분리

3. **Remote Workspace Backend Layer**
- remote agent RPC 호출 기반 파일/코멘트/git/watch 연산 구현

4. **Backend Routing Layer**
- `rootPath` 또는 remote workspace 식별자를 기준으로 backend 선택

5. **Main IPC Adapter Layer**
- 기존 `workspace:*` 핸들러를 backend 호출로 단순화

6. **Validation Layer**
- local 회귀 + remote 경로 스모크 + watch/git 브리지 검증

---

## 4. Implementation Phases

### Phase 2-A: Backend 계약/구조 고정

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P2-1 | WorkspaceBackend 인터페이스 도입 + local backend 분리 | P0 | - | Workspace Backend Contract Layer |

### Phase 2-B: Remote backend 기능 구현

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P2-2 | remote backend 파일/코멘트 RPC 경로 구현 | P0 | P2-1 | Remote Workspace Backend Layer |
| P2-3 | remote watch/git 브리지 모듈 구현 | P0 | P2-1 | Remote Workspace Backend Layer |

### Phase 2-C: Main 라우팅 통합 + 검증

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P2-4 | main IPC backend 라우팅 통합 + connectRemote 응답 정합화 | P0 | P2-2,P2-3 | Main IPC Adapter Layer |
| P2-5 | Phase 2 통합 스모크/회귀 테스트 보강 | P0 | P2-4 | Validation Layer |

---

## 5. Task Details

### Task P2-1: WorkspaceBackend 인터페이스 도입 + local backend 분리
**Component**: Workspace Backend Contract Layer  
**Priority**: P0-Critical  
**Type**: Refactor

**Description**:
`electron/main.ts`에 흩어져 있는 local 파일/코멘트/git 처리 로직을 backend 구현체로 추출하고,
공통 인터페이스를 먼저 고정한다.

**Acceptance Criteria**:
- [ ] local/remote 공통 `WorkspaceBackend` 인터페이스가 정의된다.
- [ ] 기존 local 연산(index/read/write/create/delete/rename/comments/git/watch)이 local backend로 이관된다.
- [ ] `main.ts`는 local 구현 세부 대신 backend 메서드를 호출한다.
- [ ] local 동작 회귀 없이 기존 테스트가 통과한다.

**Target Files**:
- [C] `electron/workspace-backend/types.ts` -- 공통 backend 계약/결과 타입
- [C] `electron/workspace-backend/local-workspace-backend.ts` -- local 구현 이관
- [C] `electron/workspace-backend/local-workspace-backend.test.ts` -- local backend 단위 테스트
- [M] `electron/main.ts` -- local 직접 구현 호출 제거/대체

**Technical Notes**:
- API 계약은 기존 `workspace:*` response shape를 그대로 유지한다.
- `main.ts`에서 재사용되는 유틸(경로 검증, atomic write, 댓글 경로 계산)은 backend 모듈로 이동한다.

**Dependencies**: -

---

### Task P2-2: remote backend 파일/코멘트 RPC 경로 구현
**Component**: Remote Workspace Backend Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
remote agent transport를 사용해 원격 파일 연산/코멘트 연산을 수행하는 `remote-workspace-backend`를 구현한다.

**Acceptance Criteria**:
- [ ] remote index/read/write/create/delete/rename RPC 호출이 구현된다.
- [ ] remote comments/global comments read/write/export RPC 호출이 구현된다.
- [ ] remote root 경계 이탈 시 `PATH_DENIED` 오류로 표준화된다.
- [ ] RPC 실패가 `AUTH_FAILED/TIMEOUT/AGENT_PROTOCOL_MISMATCH/PATH_DENIED` 규칙으로 매핑된다.

**Target Files**:
- [C] `electron/workspace-backend/remote-workspace-backend.ts` -- remote 파일/코멘트 backend
- [C] `electron/workspace-backend/remote-workspace-backend.test.ts` -- RPC 매핑/오류 매핑 테스트
- [M] `electron/remote-agent/protocol.ts` -- backend가 사용할 method/params/result 타입 보강
- [M] `electron/remote-agent/transport-ssh.ts` -- backend 호출 편의 API(요청 래퍼) 보강

**Technical Notes**:
- Phase 2에서는 renderer 변경 없이 IPC 입력(`rootPath`, `relativePath`)을 유지해야 하므로,
  remote backend 내부에서 root 별 세션/remoteRoot 매핑을 참조한다.

**Dependencies**: P2-1

---

### Task P2-3: remote watch/git 브리지 모듈 구현
**Component**: Remote Workspace Backend Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
원격 watch 이벤트와 git 조회를 기존 renderer 계약으로 변환하는 브리지 계층을 구현한다.

**Acceptance Criteria**:
- [ ] remote watch 이벤트가 `workspace:watchEvent` payload 형식으로 변환 가능하다.
- [ ] remote watch stop 시 구독/리스너가 누수 없이 해제된다.
- [ ] remote `getGitLineMarkers` / `getGitFileStatuses` 경로가 backend에서 제공된다.
- [ ] watch/git 경로가 local backend와 동일한 반환 계약을 유지한다.

**Target Files**:
- [C] `electron/workspace-backend/remote-watch-bridge.ts` -- watch 이벤트 변환/구독 관리
- [C] `electron/workspace-backend/remote-git-bridge.ts` -- remote git 조회 어댑터
- [C] `electron/workspace-backend/remote-watch-bridge.test.ts` -- watch payload/정리 테스트
- [C] `electron/workspace-backend/remote-git-bridge.test.ts` -- git bridge 테스트

**Technical Notes**:
- `changedRelativePaths` 정렬/중복제거 정책은 기존 main watcher 동작과 맞춘다.
- 구조 변경 여부(`hasStructureChanges`)는 remote 이벤트 타입을 명시적으로 매핑한다.

**Dependencies**: P2-1

---

### Task P2-4: main IPC backend 라우팅 통합 + connectRemote 응답 정합화
**Component**: Main IPC Adapter Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`main.ts`의 `workspace:*` 핸들러를 backend router 기반으로 통합하고,
`connectRemote` 성공 응답에서 remote workspace 식별 `rootPath`를 함께 반환한다.

**Acceptance Criteria**:
- [ ] `workspace:index/read/write/create/delete/rename/comments/git/watch`가 backend router를 통해 동작한다.
- [ ] `connectRemote` 성공 응답이 `{ ok, workspaceId, rootPath, remoteConnectionState }` 형태를 지원한다.
- [ ] `disconnectRemote` 시 backend 라우팅/watch 세션 정리가 함께 수행된다.
- [ ] preload/env 타입이 connect/disconnect 최신 계약과 일치한다.

**Target Files**:
- [C] `electron/workspace-backend/backend-router.ts` -- rootPath -> backend 해석/등록/해제
- [C] `electron/workspace-backend/backend-router.test.ts` -- 라우팅/정리 테스트
- [M] `electron/main.ts` -- 모든 workspace IPC 핸들러 backend router 연동
- [M] `electron/remote-agent/types.ts` -- connect/disconnect 결과 타입 정합화
- [M] `electron/remote-agent/connection-service.ts` -- connect 결과에 remote root 식별 정보 연결
- [M] `electron/preload.ts` -- connectRemote 응답 타입/채널 payload 반영
- [M] `electron/electron-env.d.ts` -- window.workspace remote API 타입 반영
- [M] `src/App.test.tsx` -- window.workspace mock 계약 업데이트

**Technical Notes**:
- rootPath 기반 기존 호출 계약을 유지하기 위해 `remote://<workspaceId>` 같은 canonical 식별자 규칙을 도입한다.
- local path와 remote 식별자 충돌 방지 규칙을 `backend-router.ts`에서 중앙 관리한다.

**Dependencies**: P2-2, P2-3

---

### Task P2-5: Phase 2 통합 스모크/회귀 테스트 보강
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
local/remote backend 분리 이후 회귀를 막기 위해 main/remote 경계 통합 테스트를 추가한다.

**Acceptance Criteria**:
- [ ] local workspace 핵심 경로(index/read/write/create/delete/rename) 회귀 테스트가 통과한다.
- [ ] remote connect 후 반환된 rootPath로 workspace IPC 호출이 가능한 스모크 테스트가 추가된다.
- [ ] remote watch 이벤트 브리지 + git 조회 스모크 테스트가 추가된다.
- [ ] disconnect/비정상 종료 시 세션/리스너 정리 테스트가 추가된다.

**Target Files**:
- [M] `electron/remote-agent/integration-smoke.test.ts` -- connect -> workspace IPC -> disconnect 시나리오 확장
- [C] `electron/workspace-backend/backend-integration.test.ts` -- local/remote backend 공통 계약 테스트
- [M] `electron/main.ts` -- 테스트 가능한 의존성 주입 포인트(필요 시) 정리

**Technical Notes**:
- SSH 실연결 대신 transport mock/fake process 기반 테스트를 기본으로 유지한다.
- Phase 2 완료 기준은 `npx tsc --noEmit` + 대상 테스트 셋 green으로 정의한다.

**Dependencies**: P2-4

---

## 6. Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 2-A | 1 | 1 | `electron/main.ts` (P2-1) |
| 2-B | 2 | 2 (`P2-2` ∥ `P2-3`) | 없음 (신규 `workspace-backend/*` 중심) |
| 2-C | 2 | 1 | `electron/main.ts`, `preload.ts`, `electron-env.d.ts` |

충돌/순서 메모:
- P2-2/P2-3은 둘 다 P2-1의 `WorkspaceBackend` 계약 고정 후 병렬 가능
- P2-4는 main IPC와 타입 경계 파일을 동시에 수정하므로 순차 고정 권장
- P2-5는 P2-4 완료 후 최종 검증 단계로 고정

---

## 7. Risks & Mitigations

1. **리스크**: backend 분리 과정에서 local 기능 회귀  
   **완화**: P2-1에서 local backend 단위 테스트를 먼저 고정하고 main 라우팅 전환

2. **리스크**: remote workspace 식별자(`rootPath`) 설계 불안정으로 renderer 연동 충돌  
   **완화**: P2-4에서 canonical 규칙(`remote://...`)을 단일 모듈(`backend-router`)에 집중

3. **리스크**: watch/git 브리지의 payload 불일치로 UI 비정상 동작  
   **완화**: P2-3/P2-5에서 기존 payload 계약(`changedRelativePaths`, `hasStructureChanges`) 스냅샷 테스트

4. **리스크**: remote 경계 검증 누락 시 보안 취약점  
   **완화**: P2-2에서 `PATH_DENIED` 강제 매핑 + 상대경로 정규화 테스트 추가

5. **리스크**: main.ts 파일 집중 수정으로 병렬 생산성 저하  
   **완화**: backend 신규 파일 구현(P2-2/P2-3)을 먼저 병렬 완료 후 main 통합(P2-4) 최소화

---

## 8. Open Questions

1. remote workspace canonical `rootPath` 규칙을 `remote://<workspaceId>`로 고정할지, `ssh://user@host/path` 형태로 고정할지 확정 필요
2. `connectRemote.profile` 필드를 spec대로 `remoteRootPath`로 통일할지, Phase 1 구현(`remoteRoot`)과의 하위호환 기간을 둘지 결정 필요
3. remote comments/export의 저장 위치를 원격 루트 내부 `.sdd-workbench`로 고정할지, 별도 agent 관리 저장소를 둘지 확정 필요
4. F15(SSHFS) 레거시 watcher 코드와 Phase 2 backend 라우팅 사이의 임시 공존 기간을 둘지(또는 즉시 비활성화) 결정 필요
