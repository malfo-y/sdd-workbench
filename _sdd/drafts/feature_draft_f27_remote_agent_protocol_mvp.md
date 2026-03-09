# Feature Draft: F27 Remote Agent Protocol 기반 원격 워크스페이스 MVP

**Date**: 2026-02-28
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-28
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F27 Remote Agent Protocol 기반 원격 워크스페이스 실행(MVP)
**Priority**: High
**Category**: Core Feature
**Target Component**: `electron/main.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`, `src/workspace/workspace-context.tsx`, `src/workspace/workspace-model.ts`, `src/workspace/workspace-persistence.ts`, `src/App.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/product-overview.md` > `3.1 MVP 포함 범위`, `3.2 MVP 제외 범위`, `4. 주요 사용자 흐름`; `/_sdd/spec/sdd-workbench/system-architecture.md` > `2. 런타임 경계`, `5. 핵심 데이터 플로우`, `6. 워크스페이스 경계 규칙`; `/_sdd/spec/sdd-workbench/component-map.md` > `1.2 Workspace State Layer`, `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/contract-map.md` > `1. 핵심 타입 계약`, `3. IPC 계약`; `/_sdd/spec/sdd-workbench/operations-and-validation.md` > `2. 보안 기준`, `3. 신뢰성 기준`, `4. 테스트 운영`

**Description**:
SSHFS 마운트 의존 대신 SSH를 통해 원격 에이전트를 실행하고, 로컬 앱이 RPC 프로토콜로 파일/디렉토리/감시/git 메타데이터 작업을 수행한다. 목표는 현재 로컬 워크스페이스 기능을 원격에서도 동일 계약(`workspace:*` IPC)으로 제공하는 것이다.

**Acceptance Criteria**:
- [ ] 원격 연결(Host/User/Remote Root Path)로 워크스페이스를 열 수 있고, 파일 트리/파일 열기/저장/생성/삭제/rename이 동작한다.
- [ ] renderer API(`window.workspace`)의 핵심 계약은 유지되고, 내부 구현만 local backend 또는 remote backend로 분기된다.
- [ ] 원격 워크스페이스 변경 이벤트가 기존 `workspace:watchEvent` 계약(`changedRelativePaths`, `hasStructureChanges`)으로 전달된다.
- [ ] 원격 워크스페이스에서도 `workspace:getGitLineMarkers`, `workspace:getGitFileStatuses`가 동작한다.
- [ ] 연결 끊김/타임아웃/권한 오류가 앱 크래시 없이 배너/상태로 노출된다.
- [ ] 세션 복원 시 원격 워크스페이스 메타데이터(연결 프로필/루트 경로/마지막 상태)가 복원된다.
- [ ] 원격 에이전트 범위는 워크스페이스 루트 내부 작업으로 제한되고 경계 이탈 시 거부된다.
- [ ] 내장 터미널, 포트포워딩 UI, 원격 확장 실행은 MVP 범위에서 제외한다.

**Technical Notes**:
- 프로토콜 전송은 SSH stdio 기반(JSON-RPC 유사 프레이밍)으로 정의하고 버전 필드를 포함한다.
- renderer는 로컬/원격 구분 로직을 직접 갖지 않고 `workspace:*` 호출만 유지한다.
- remote watcher는 원격측에서 감시하고 이벤트만 전달하며, 필요 시 원격 polling fallback을 허용한다.
- sshfs 경로 휴리스틱은 하위호환 유지 대상으로 두되, 신규 원격 연결 경로를 우선 지원한다.

**Dependencies**:
- 기존 F15/F16 watcher 및 대규모 인덱싱 정책
- 기존 F24/F25/F25b/F26 파일 편집/CRUD/Git 상태 계약
- 기존 Workspace 세션 복원(F09)

## Improvements

### Improvement: Local FS 의존 경계를 Workspace Backend 추상화로 분리
**Priority**: High
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `2. 런타임 경계`, `5. 핵심 데이터 플로우`; `/_sdd/spec/sdd-workbench/component-map.md` > `1.7 Electron Boundary`
**Current State**: `electron/main.ts`가 로컬 파일시스템/프로세스 명령을 직접 수행한다.
**Proposed**: `WorkspaceBackend` 인터페이스를 도입해 `local`/`remote` 구현을 분리하고 IPC handler는 backend만 호출한다.
**Reason**: 원격 기능 추가 시 로컬 경로 가정이 섞여 회귀 리스크가 커지는 문제를 줄이고 기능 확장을 단계화하기 위함.

### Improvement: 원격 연결 상태/오류 표준화
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/contract-map.md` > `1. 핵심 타입 계약`, `3. IPC 계약`; `/_sdd/spec/sdd-workbench/operations-and-validation.md` > `3. 신뢰성 기준`
**Current State**: watcher fallback 중심 상태만 존재하고 원격 연결 상태 머신은 없다.
**Proposed**: `connecting/connected/degraded/disconnected` 상태와 공통 오류 코드(`AUTH_FAILED`, `TIMEOUT`, `AGENT_PROTOCOL_MISMATCH`, `PATH_DENIED`)를 정의한다.
**Reason**: 장애 대응/재연결 정책/테스트 케이스를 일관된 계약으로 검증하기 위함.

## Bug Reports

- 현재 없음

## Component Changes

### New Component: `electron/remote-agent/protocol.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/contract-map.md` > `3. IPC 계약`
**Purpose**: 원격 에이전트 요청/응답/이벤트 메시지 타입 및 버전 계약 정의
**Input**: RPC 요청(`method`, `params`, `id`)
**Output**: RPC 응답(`result`/`error`) 및 서버 이벤트(`watchEvent`, `connectionStatus`)

**Planned Methods**:
- `encodeRemoteAgentMessage(...)` - 전송 프레임 직렬화
- `decodeRemoteAgentMessage(...)` - 수신 프레임 역직렬화/검증
- `isSupportedProtocolVersion(...)` - 버전 호환성 검사

### New Component: `electron/remote-agent/transport-ssh.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/operations-and-validation.md` > `3. 신뢰성 기준`
**Purpose**: SSH 프로세스 실행, 에이전트 부팅, 표준입출력 스트림 연결 관리
**Input**: 연결 프로필(host/user/port/auth/remoteRoot)
**Output**: 연결 세션 핸들, 상태 이벤트, 종료 원인

**Planned Methods**:
- `startRemoteAgentSession(profile)` - SSH + agent bootstrap
- `sendRequest(sessionId, request)` - RPC 요청 전송
- `stopRemoteAgentSession(sessionId)` - 세션 종료/정리

### New Component: `electron/workspace-backend/types.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.7 Electron Boundary`
**Purpose**: local/remote 공통 `WorkspaceBackend` 인터페이스 정의
**Input**: workspace 식별자/상대경로/요청 타입
**Output**: 기존 IPC result와 정합된 backend 결과

**Planned Methods**:
- `indexWorkspace(...)`
- `readWorkspaceFile(...)`
- `writeWorkspaceFile(...)`
- `watchWorkspace(...)`
- `getGitLineMarkers(...)`

### Update Component: `src/workspace/workspace-model.ts`, `src/workspace/workspace-context.tsx`, `src/workspace/workspace-persistence.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.2 Workspace State Layer`; `/_sdd/spec/sdd-workbench/system-architecture.md` > `4.1 Workspace 세션 상태`
**Change Type**: Enhancement

**Changes**:
- 워크스페이스 타입(`local|remote`) 및 원격 연결 메타데이터 필드 추가
- 원격 연결 상태/오류 코드 상태 추가
- 세션 스냅샷 저장/복원 대상에 원격 메타데이터 포함

### Update Component: `src/App.tsx`, `src/App.css`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`; `/_sdd/spec/sdd-workbench/system-architecture.md` > `3. UI 레이아웃`
**Change Type**: Enhancement

**Changes**:
- `Open Workspace` 외 `Connect Remote Workspace` 진입점 추가
- 활성 워크스페이스에 `REMOTE` 배지 + 연결 상태 표시
- 연결 오류/재시도 UX를 배너 정책과 정합되게 추가

## Configuration Changes

### New Config: `REMOTE_AGENT_CONNECT_TIMEOUT_MS`
**Target Section**: `/_sdd/spec/sdd-workbench/operations-and-validation.md` > `3. 신뢰성 기준`
**Type**: Environment Variable
**Required**: No
**Default**: `8000`
**Description**: SSH/agent 초기 연결 타임아웃(ms)

### New Config: `REMOTE_AGENT_REQUEST_TIMEOUT_MS`
**Target Section**: `/_sdd/spec/sdd-workbench/operations-and-validation.md` > `3. 신뢰성 기준`
**Type**: Environment Variable
**Required**: No
**Default**: `15000`
**Description**: 원격 RPC 단건 요청 타임아웃(ms)

### New Config: `REMOTE_AGENT_RECONNECT_ATTEMPTS`
**Target Section**: `/_sdd/spec/sdd-workbench/operations-and-validation.md` > `3. 신뢰성 기준`
**Type**: Environment Variable
**Required**: No
**Default**: `3`
**Description**: 일시적 연결 단절 시 자동 재시도 횟수

## Notes

### Context
현재 원격 지원은 SSHFS 마운트 품질에 강하게 의존하며, 파일 감시/이벤트 전달의 불안정성이 UX 병목이다. 이 변경은 마운트 계층 대신 명시적 원격 프로토콜 계층을 추가해 안정성과 확장성을 확보하려는 목적이다.

### Constraints
- 스펙 문서 구조를 크게 재편하지 않고 기존 workspace 계약 위에 확장한다.
- MVP에서는 단일 remote root 기준으로 동작하고, 다중 hop/bastion/점프호스트 UI는 제외한다.
- 원격 agent 배포/업데이트 자동화는 최소 수준(필요 시 원격에 단일 실행 파일/스크립트 배치)으로 제한한다.

### References
- 기존 F15 draft: `/_sdd/drafts/feature_draft_f15_remote_workspace_via_sshfs.md`
- 현재 watcher 운영 기준: `/_sdd/spec/sdd-workbench/operations-and-validation.md`

---

# Part 2: Implementation Plan

## Overview

F27의 MVP 목표는 로컬 기능과 동일한 사용자 계약을 유지하면서 원격 워크스페이스를 안정적으로 다루는 것이다. 구현 전략은 Electron main의 파일/감시 실행 경계를 backend 인터페이스로 분리하고, remote backend는 SSH 기반 agent 프로토콜을 통해 동작시키는 방식이다. 이 문서는 에픽 수준 분해이며, 각 태스크는 추후 개별 상세 계획으로 확장한다.

## Scope

### In Scope
- SSH 기반 remote agent 세션 생성/종료
- 파일 트리 인덱싱/파일 읽기/쓰기/CRUD/rename의 원격 실행
- watch 이벤트 브리지(`workspace:watchEvent` 계약 유지)
- git line marker/file status 원격 조회
- 연결 상태/오류 코드/재시도 정책 최소 도입
- UI 원격 연결 진입점 + 상태 표시
- 세션 복원 시 원격 메타데이터 유지

### Out of Scope
- 내장 터미널 UI
- 포트포워딩/원격 확장 실행
- 원격 디버거/원격 LSP 프로세스 관리
- 다중 hop 및 고급 인증 UX(예: SSO 브라우저 플로우)
- 완전 자동 원격 agent 업그레이드 체계

## Components

1. **Remote Agent Protocol Layer**: 메시지 계약/버전/오류 코드 정의
2. **SSH Transport & Session Layer**: agent 부팅, 연결 수명주기, 재시도
3. **Workspace Backend Layer**: local/remote backend 추상화 및 IPC 라우팅
4. **Remote Watch & Git Bridge Layer**: 원격 변경/깃 메타데이터 연동
5. **Renderer Workspace State Layer**: 원격 워크스페이스 상태/세션 영속화
6. **UI Connection Layer**: 원격 연결 진입점, 상태 표시, 배너
7. **Reliability & Security Layer**: 경계 검증, timeout/reconnect, 테스트

## Implementation Phases

### Phase 1: 프로토콜/세션 기반 구축
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| R1 | 원격 프로토콜 계약/타입 초안 정립 | P0 | - | Remote Agent Protocol Layer |
| R2 | SSH transport + agent bootstrap 구현 | P0 | R1 | SSH Transport & Session Layer |

### Phase 2: Electron backend 분리 및 원격 실행 경로 구축
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| R3 | WorkspaceBackend 인터페이스 도입 + local backend 분리 | P0 | R1 | Workspace Backend Layer |
| R4 | remote backend로 파일 I/O/CRUD/코멘트 경로 연결 | P0 | R2,R3 | Workspace Backend Layer |
| R5 | remote watch/git 브리지 구현 | P0 | R2,R4 | Remote Watch & Git Bridge Layer |

### Phase 3: Renderer 연결 및 사용자 플로우 추가
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| R6 | workspace 상태 모델에 remote 메타데이터 추가 | P0 | R3 | Renderer Workspace State Layer |
| R7 | 원격 연결 UI + 상태 표시/오류 배너 도입 | P1 | R4,R6 | UI Connection Layer |

### Phase 4: 신뢰성/보안/검증
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| R8 | timeout/reconnect/경계검증 정책 반영 | P0 | R5,R7 | Reliability & Security Layer |
| R9 | 통합 테스트/스모크 시나리오 보강 | P0 | R5,R6,R7,R8 | Reliability & Security Layer |

## Task Details

### Task R1: 원격 프로토콜 계약/타입 초안 정립
**Component**: Remote Agent Protocol Layer
**Priority**: P0
**Type**: Infrastructure

**Description**:
원격 에이전트 요청/응답/이벤트 형식과 오류 코드를 정의하고, Electron main/preload/renderer 타입 경계에서 재사용 가능한 계약으로 고정한다.

**Acceptance Criteria**:
- [ ] 요청/응답/이벤트 메시지 타입이 단일 모듈에 정의된다.
- [ ] 프로토콜 버전 필드와 호환성 검사 규칙이 정의된다.
- [ ] 공통 오류 코드(`AUTH_FAILED`, `TIMEOUT`, `PROTOCOL_MISMATCH`, `PATH_DENIED`)가 정의된다.
- [ ] 타입 계약 테스트가 추가된다.

**Target Files**:
- [C] `electron/remote-agent/protocol.ts` -- 메시지 타입/오류 코드/버전 계약 정의
- [C] `electron/remote-agent/protocol.test.ts` -- 직렬화/검증/버전 테스트
- [M] `electron/electron-env.d.ts` -- renderer 경계 타입 확장
- [M] `electron/preload.ts` -- 신규 원격 관련 IPC 타입 반영

**Technical Notes**:
- 초기에는 JSON line framing(개행 구분)으로 단순화하고, payload 크기 제한을 명시한다.

**Dependencies**: -

---

### Task R2: SSH transport + agent bootstrap 구현
**Component**: SSH Transport & Session Layer
**Priority**: P0
**Type**: Infrastructure

**Description**:
SSH 프로세스를 사용해 원격 agent를 실행하고, 세션 시작/종료/비정상 종료를 관리하는 transport 계층을 구현한다.

**Acceptance Criteria**:
- [ ] 연결 프로필 입력으로 원격 agent 세션을 시작할 수 있다.
- [ ] 세션 종료 시 child process/stdin/stdout/stderr가 누수 없이 정리된다.
- [ ] 초기 handshake 실패를 명확한 오류 코드로 반환한다.
- [ ] 연결 타임아웃과 기본 재시도 정책이 동작한다.

**Target Files**:
- [C] `electron/remote-agent/transport-ssh.ts` -- SSH 실행/세션 수명주기 관리
- [C] `electron/remote-agent/session-registry.ts` -- 세션 ID/상태 레지스트리
- [C] `electron/remote-agent/transport-ssh.test.ts` -- bootstrap/종료/오류 처리 테스트
- [M] `electron/main.ts` -- 세션 시작/종료 IPC 진입점 추가

**Technical Notes**:
- 인증 UX는 MVP에서 최소화하고, 실패 이유를 상세 코드로 전달한다.

**Dependencies**: R1

---

### Task R3: WorkspaceBackend 인터페이스 도입 + local backend 분리
**Component**: Workspace Backend Layer
**Priority**: P0
**Type**: Refactor

**Description**:
기존 `electron/main.ts`의 로컬 파일작업 로직을 `WorkspaceBackend` 인터페이스 구현체로 분리해 local/remote 분기 기반을 만든다.

**Acceptance Criteria**:
- [ ] 공통 backend 인터페이스가 정의된다.
- [ ] 기존 로컬 작업 경로가 local backend 구현체로 이관된다.
- [ ] 기존 로컬 워크스페이스 기능 회귀 없이 테스트가 통과한다.
- [ ] main IPC handler는 backend 호출 중심으로 단순화된다.

**Target Files**:
- [C] `electron/workspace-backend/types.ts` -- backend 공통 인터페이스
- [C] `electron/workspace-backend/local-workspace-backend.ts` -- 기존 로컬 동작 이관
- [C] `electron/workspace-backend/local-workspace-backend.test.ts` -- 로컬 backend 회귀 테스트
- [M] `electron/main.ts` -- IPC handler에서 backend 라우팅 적용

**Technical Notes**:
- 함수 시그니처는 현재 `workspace:*` IPC payload/response 계약을 그대로 유지한다.

**Dependencies**: R1

---

### Task R4: remote backend로 파일 I/O/CRUD/코멘트 경로 연결
**Component**: Workspace Backend Layer
**Priority**: P0
**Type**: Feature

**Description**:
원격 agent RPC를 통해 파일 인덱싱/읽기/쓰기/CRUD/코멘트 관련 연산을 수행하는 remote backend를 구현한다.

**Acceptance Criteria**:
- [ ] 원격 워크스페이스에서 index/read/write/create/delete/rename이 동작한다.
- [ ] comments/global comments read/write/export 관련 경로가 원격에서도 동작한다.
- [ ] 경계 밖 경로 요청은 원격 측/로컬 측 모두에서 거부된다.
- [ ] 오류 시 기존 배너 처리와 호환되는 에러 문자열/코드가 반환된다.

**Target Files**:
- [C] `electron/workspace-backend/remote-workspace-backend.ts` -- 원격 backend 구현
- [C] `electron/workspace-backend/remote-workspace-backend.test.ts` -- remote backend 단위 테스트
- [M] `electron/main.ts` -- workspace 유형별 backend 선택 로직
- [M] `electron/preload.ts` -- 원격 워크스페이스 열기 API 반영

**Technical Notes**:
- 원격 상대경로 정책은 현재 local 정책(`rootPath` 기준 relative path)과 동일하게 유지한다.

**Dependencies**: R2, R3

---

### Task R5: remote watch/git 브리지 구현
**Component**: Remote Watch & Git Bridge Layer
**Priority**: P0
**Type**: Feature

**Description**:
원격 변경 이벤트와 git 메타데이터 조회를 기존 renderer 계약으로 브리지한다.

**Acceptance Criteria**:
- [ ] 원격 watch 이벤트가 `workspace:watchEvent` 형식으로 전달된다.
- [ ] `hasStructureChanges` 플래그가 구조 변경 시점에 올바르게 전달된다.
- [ ] 원격 `getGitLineMarkers`/`getGitFileStatuses`가 동작한다.
- [ ] 연결 단절 시 watch 경로가 degraded 상태로 전환되고 사용자에게 안내된다.

**Target Files**:
- [C] `electron/remote-agent/watch-bridge.ts` -- 원격 watch 이벤트 변환/전달
- [C] `electron/remote-agent/watch-bridge.test.ts` -- watch payload 브리지 테스트
- [M] `electron/main.ts` -- watchStart/watchStop 및 git 조회 remote 경로 연결
- [M] `electron/git-line-markers.ts` -- remote backend 연동 가능한 입력 타입 확장
- [M] `electron/git-file-statuses.ts` -- remote backend 연동 가능한 입력 타입 확장

**Technical Notes**:
- watch payload 계약은 renderer 회귀 최소화를 위해 변경하지 않는다.

**Dependencies**: R2, R4

---

### Task R6: workspace 상태 모델에 remote 메타데이터 추가
**Component**: Renderer Workspace State Layer
**Priority**: P0
**Type**: Feature

**Description**:
워크스페이스 세션 모델에 원격 타입/연결정보/연결상태를 추가하고 세션 저장/복원과 연동한다.

**Acceptance Criteria**:
- [ ] `WorkspaceSession`에 `workspaceKind`, `remoteProfile`, `remoteConnectionState`, `remoteErrorCode` 필드가 추가된다.
- [ ] 세션 복원 시 원격 워크스페이스 메타데이터가 유지된다.
- [ ] 로컬 워크스페이스와의 호환성이 유지된다(기본값 안전).
- [ ] 상태 모델 테스트와 persistence 테스트가 갱신된다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- 원격 상태 필드/액션 추가
- [M] `src/workspace/workspace-persistence.ts` -- 원격 메타데이터 저장/복원
- [M] `src/workspace/workspace-context.tsx` -- 원격 상태 반영 로직
- [M] `src/workspace/workspace-model.test.ts` -- 모델 테스트 보강
- [M] `src/workspace/workspace-persistence.test.ts` -- persistence 테스트 보강

**Technical Notes**:
- 스냅샷 schema version 상향 여부는 기존 호환 정책과 함께 결정한다.

**Dependencies**: R3

---

### Task R7: 원격 연결 UI + 상태 표시/오류 배너 도입
**Component**: UI Connection Layer
**Priority**: P1
**Type**: Feature

**Description**:
사용자가 원격 워크스페이스를 연결할 수 있는 UI를 추가하고, 활성 워크스페이스의 원격 상태를 표시한다.

**Acceptance Criteria**:
- [ ] `Connect Remote Workspace` 액션이 제공된다.
- [ ] 활성 워크스페이스에 `REMOTE` 배지와 연결 상태가 표시된다.
- [ ] 인증 실패/타임아웃/프로토콜 불일치 배너가 사용자에게 전달된다.
- [ ] 기존 로컬 워크스페이스 UX를 방해하지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- 원격 연결 진입점/상태 표시 추가
- [M] `src/App.css` -- 원격 배지/상태 UI 스타일
- [C] `src/workspace/remote-connect-modal.tsx` -- 원격 연결 입력 모달
- [M] `src/workspace/workspace-context.tsx` -- connect/disconnect 액션 연결
- [M] `src/App.test.tsx` -- 원격 연결 UX 테스트

**Technical Notes**:
- 초기 UI는 최소 입력(host, user, remoteRootPath, optional port)만 지원한다.

**Dependencies**: R4, R6

---

### Task R8: timeout/reconnect/경계검증 정책 반영
**Component**: Reliability & Security Layer
**Priority**: P0
**Type**: Infrastructure

**Description**:
원격 연결 안정성과 보안을 위해 timeout/reconnect 정책, 작업 경계 검증, 위험 동작 차단 정책을 구현한다.

**Acceptance Criteria**:
- [ ] 연결/요청 타임아웃이 공통 정책으로 적용된다.
- [ ] 연결 단절 시 제한된 재시도 후 상태가 `disconnected`로 고정된다.
- [ ] 워크스페이스 루트 경계 이탈 요청은 거부되고 로그/배너에 반영된다.
- [ ] 허용되지 않은 원격 명령 호출은 차단된다.

**Target Files**:
- [C] `electron/remote-agent/security.ts` -- 경계검증/허용 메서드 정책
- [C] `electron/remote-agent/retry-policy.ts` -- 재시도/백오프 정책
- [M] `electron/remote-agent/transport-ssh.ts` -- timeout/reconnect 연동
- [M] `electron/workspace-backend/remote-workspace-backend.ts` -- 보안 정책 적용
- [C] `electron/remote-agent/security.test.ts` -- 경계검증 테스트

**Technical Notes**:
- 재시도는 무한 반복을 금지하고 운영 기준값으로 제한한다.

**Dependencies**: R5, R7

---

### Task R9: 통합 테스트/스모크 시나리오 보강
**Component**: Reliability & Security Layer
**Priority**: P0
**Type**: Test

**Description**:
원격 워크스페이스 핵심 플로우(연결, 편집, watch, git, 재연결, 오류 처리)를 CI 가능한 테스트와 수동 스모크 체크로 보강한다.

**Acceptance Criteria**:
- [ ] 원격 연결 성공 플로우 테스트가 추가된다.
- [ ] watch 이벤트 반영/dirty 처리 회귀 테스트가 추가된다.
- [ ] 원격 git 상태/라인 마커 조회 테스트가 추가된다.
- [ ] 연결 실패/타임아웃/프로토콜 mismatch 케이스 테스트가 추가된다.

**Target Files**:
- [M] `src/App.test.tsx` -- 원격 워크스페이스 사용자 플로우 통합 테스트
- [M] `src/workspace/workspace-context.tsx` -- 테스트 가능한 오류/상태 경로 정리
- [C] `electron/remote-agent/integration-smoke.test.ts` -- main-remote 경계 스모크 테스트
- [M] `electron/main.ts` -- 테스트 훅/의존성 주입 지점 보강

**Technical Notes**:
- 실제 SSH 통합 대신 transport mock 기반 테스트를 기본으로 하고, 별도 수동 스모크 시나리오를 운영 문서에 추가한다.

**Dependencies**: R5, R6, R7, R8

---

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 2 | `electron/main.ts` (R2에서만 수정), 실질 충돌 낮음 |
| 2 | 3 | 2 | `electron/main.ts` (R3,R4,R5), `electron/preload.ts` (R4) |
| 3 | 2 | 2 | `src/workspace/workspace-context.tsx` (R6,R7) |
| 4 | 2 | 2 | `electron/workspace-backend/remote-workspace-backend.ts` (R8), `src/App.test.tsx` (R7,R9) |

**Conflict Notes**:
- `electron/main.ts`는 R3/R4/R5에서 공통 수정 대상이므로 순차 우선 적용이 안전하다.
- `src/workspace/workspace-context.tsx`는 R6/R7이 의미적으로 연결되므로 같은 담당자 또는 짧은 배치 간격 권장.
- 프로토콜 타입(`R1`) 변경은 하위 태스크 전반의 계약 기준이므로 먼저 고정해야 한다.

## Risks & Mitigations

1. **리스크**: backend 추상화 도중 로컬 기능 회귀
   **완화**: R3에서 local backend 회귀 테스트를 먼저 고정하고 remote는 그 위에 추가

2. **리스크**: 원격 watch 이벤트 지연/누락으로 dirty/자동 갱신 오동작
   **완화**: R5에서 payload 계약을 기존과 동일하게 유지하고 연결 단절 시 degraded 명시

3. **리스크**: 연결 장애 시 UI 상태 불일치(연결됨처럼 보이나 실제 끊김)
   **완화**: R6/R7에서 연결 상태 머신을 단일 source of truth로 유지

4. **리스크**: 경계 이탈/명령 주입 보안 문제
   **완화**: R8에서 경계검증 + 허용 메서드 화이트리스트 + 타임아웃 기본값 적용

5. **리스크**: 태스크 범위 과대(한 번에 VSCode급 기대)
   **완화**: Out-of-scope를 엄격히 유지하고, R1~R9 완료 후 후속 에픽으로 확장

## Open Questions

1. 원격 연결 입력 UX를 초기에는 모달로 둘지, 별도 연결 패널로 둘지 최종 결정 필요.
2. 원격 agent 실행물 배포 전략(스크립트 vs 바이너리)을 MVP에서 어느 수준까지 자동화할지 결정 필요.
3. 재연결 정책에서 자동 재시도 실패 후 사용자 수동 재시도 트리거 UX를 어디에 둘지 결정 필요.
4. 원격 워크스페이스 식별자 규칙(`workspaceId`)을 `ssh://` URI 형태로 정규화할지 결정 필요.
5. 기존 SSHFS 기반 auto-remote 감지(F15)와 신규 remote-protocol 연결을 UI에서 어떻게 구분 표기할지 결정 필요.

---

## Next Steps

1. R1(프로토콜 계약) 상세 계획 문서를 먼저 분리 작성한다.
2. R3(backend 추상화) 상세 계획을 병렬로 준비해 로컬 회귀 방지 축을 먼저 고정한다.
3. 각 Task(R1~R9)를 독립 feature-draft 파일로 분할할 때, 본 문서의 Target Files를 기준선으로 사용한다.
