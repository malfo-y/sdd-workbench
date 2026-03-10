# Feature Draft: F39 원격 워크스페이스용 SSH 외부 도구 열기

**Date**: 2026-03-10
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-03-10
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F39 원격 워크스페이스용 SSH 외부 도구 열기 📋 Planned
**Priority**: High
**Category**: Workflow Feature
**Target Component**: `src/App.tsx`, `src/workspace/remote-connect-modal.tsx`, `src/workspace/workspace-model.ts`, `src/workspace/workspace-persistence.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`, `electron/main.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/product-overview.md` > `Key Features`; `/_sdd/spec/sdd-workbench/system-architecture.md` > `2. 런타임 경계`, `4.1 Workspace 세션 상태`, `5.9 Remote Agent Protocol 원격 워크스페이스 플로우`; `/_sdd/spec/sdd-workbench/domains/remote-workspace.md` > `2. 사용자 가시 동작`, `4. 핵심 규칙`; `/_sdd/spec/sdd-workbench/contracts/ipc-contracts.md` > `2. 채널 개요`, `3. 핵심 request/response 요약`; `/_sdd/spec/sdd-workbench/contracts/state-model.md` > `2. 핵심 타입`, `4. source of truth`

**Description**:
F27 원격 워크스페이스에서 `Open in iTerm`, `Open in VSCode` 액션이 로컬 경로 열기 대신 SSH 기반 원격 열기 전략을 사용하도록 확장한다. 원격 워크스페이스의 canonical `rootPath`는 `remote://...` 내부 식별자이므로 외부 도구 실행 시에는 `remoteProfile(host/user/port/identityFile/remoteRoot/sshAlias)`를 source of truth로 사용한다.

**Acceptance Criteria**:
- [ ] 원격 워크스페이스에서 `Open in iTerm`을 누르면 현재 원격 프로필로 새 iTerm 세션을 열고 SSH 접속 후 `remoteRoot` 위치에서 셸이 시작된다.
- [ ] 원격 워크스페이스에서 `Open in VSCode`를 누르면 VS Code Remote-SSH authority를 사용해 `remoteRoot`를 열며, 로컬 디렉토리 `stat` 실패 메시지가 노출되지 않는다.
- [ ] 원격 프로필에 VS Code 원격 열기에 필요한 `sshAlias`가 없거나 실행 전제조건이 부족하면 generic OS 오류 대신 사용자 안내 메시지를 배너로 보여준다.
- [ ] 원격 워크스페이스에서 `Open in Finder`를 실행하면 로컬 경로 검증을 시도하지 않고, 명시적인 unsupported 메시지로 safe-fail 한다.
- [ ] 로컬 워크스페이스의 `Open in iTerm` / `Open in VSCode` / `Open in Finder` 동작은 회귀하지 않는다.
- [ ] 세션 복원 후에도 원격 외부 열기 관련 프로필 필드(`sshAlias` 포함)가 유지된다.

**Technical Notes**:
- 기존 `system:openInIterm` / `system:openInVsCode` / `system:openInFinder` 채널은 유지하되, payload는 `rootPath` 단독이 아니라 workspace-aware request로 확장한다.
- VS Code 실행은 `code` CLI PATH 의존을 필수로 두지 않고, macOS 앱 인자 전달(`open -a "Visual Studio Code" --args ...`) 또는 동등한 app-args 전략을 우선 검토한다.
- iTerm 실행은 AppleScript/`osascript` 기반 신규 세션 생성 후 SSH 명령 주입 전략을 사용한다.
- `remote://...` 경로는 로컬 파일시스템 경로가 아니므로 `path.resolve`/`stat` 대상에서 제외한다.

**Dependencies**:
- F08 외부 도구 열기 버튼/IPC 채널
- F27 원격 워크스페이스 프로필 및 세션 복원

---

## Improvements

### Improvement: 외부 도구 열기 IPC를 workspace-aware 계약으로 확장
**Priority**: High
**Target Section**: `/_sdd/spec/sdd-workbench/contracts/ipc-contracts.md` > `2. 채널 개요`, `3. 핵심 request/response 요약`; `/_sdd/spec/sdd-workbench/system-architecture.md` > `2. 런타임 경계`
**Current State**: `system:openIn*` 요청은 `rootPath`만 전달하며, main process는 이를 항상 로컬 디렉토리로 가정한다.
**Proposed**: 요청 payload에 `workspaceKind`, `remoteProfile`, `target`별 실행 전제조건을 포함해 local/remote 분기를 명시적으로 처리한다.
**Reason**: F27 이후 원격 워크스페이스의 canonical path는 로컬 경로가 아니므로, 외부 도구 열기에서 별도 source of truth가 필요하다.

### Improvement: 원격 연결 프로필에 VS Code 원격 authority 힌트(`sshAlias`) 추가
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/contracts/state-model.md` > `2. 핵심 타입`, `4. source of truth`; `/_sdd/spec/sdd-workbench/domains/remote-workspace.md` > `4.1 연결과 browse`
**Current State**: 원격 프로필은 `host/user/port/identityFile/remoteRoot`는 저장하지만, VS Code Remote-SSH authority를 안정적으로 구성할 별도 필드가 없다.
**Proposed**: `WorkspaceRemoteProfile`에 optional `sshAlias`를 추가하고 persistence/복원 대상에 포함한다.
**Reason**: VS Code Remote-SSH는 사용자 SSH 설정 별칭과 결합될 때 가장 안정적으로 원격 폴더 열기를 수행하므로, 별칭을 명시적으로 저장하는 편이 재현성과 오류 안내 품질이 높다.

### Improvement: 원격 외부 열기 오류를 명시적 정책으로 표준화
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/domains/remote-workspace.md` > `2. 사용자 가시 동작`, `4. 핵심 규칙`; `/_sdd/spec/sdd-workbench/system-architecture.md` > `5.9 Remote Agent Protocol 원격 워크스페이스 플로우`
**Current State**: 원격 워크스페이스에서 외부 열기 실패 시 로컬 디렉토리 검사 오류나 generic launch 오류가 그대로 노출될 수 있다.
**Proposed**: `MISSING_SSH_ALIAS`, `UNSUPPORTED_REMOTE_TARGET`, `LAUNCH_FAILED` 수준의 사용자 메시지 정책을 두고 배너 문구를 명시적으로 관리한다.
**Reason**: 원격 열기 실패 원인은 사용자가 수정 가능한 전제조건 누락인 경우가 많아, OS 레벨 오류보다 안내 메시지가 필요하다.

---

## Bug Reports

### Bug: 원격 워크스페이스의 외부 열기 버튼이 로컬 경로 검증으로 실패
**Severity**: High
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `5.9 Remote Agent Protocol 원격 워크스페이스 플로우`; `/_sdd/spec/sdd-workbench/domains/remote-workspace.md` > `2. 사용자 가시 동작`
**Location**: `src/App.tsx`, `electron/main.ts`
**Description**: 원격 워크스페이스에서도 `Open in iTerm` / `Open in VSCode` / `Open in Finder` 요청이 `rootPath`를 로컬 디렉토리처럼 `stat`하는 경로를 타서 실패한다.
**Reproduction**: 원격 워크스페이스 연결 후 `Open in VSCode` 또는 `Open in iTerm`을 클릭한다.
**Expected Behavior**: 원격 워크스페이스는 `remoteProfile` 기반 SSH/Remote-SSH 실행 전략을 사용하거나, 지원하지 않는 타깃은 명시적 안내 메시지로 종료해야 한다.

---

## Component Changes

### New Component: `electron/system-open.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/system-architecture.md` > `2. 런타임 경계`; `/_sdd/spec/sdd-workbench/domains/remote-workspace.md` > `4. 핵심 규칙`
**Purpose**: local/remote 워크스페이스별 외부 도구 실행 전략을 main process에서 분리해 관리한다.
**Input**: `target`, `workspaceKind`, `rootPath`, `remoteProfile`
**Output**: 성공/실패 결과와 사용자용 오류 메시지

**Planned Methods**:
- `openWorkspaceInExternalTool()` - local/remote 분기 후 도구별 실행 전략 선택
- `buildRemoteItermCommand()` - SSH 접속 및 `remoteRoot` 진입 명령 구성
- `buildVsCodeRemoteArgs()` - VS Code Remote-SSH authority/remote path 인자 구성
- `getUnsupportedTargetMessage()` - remote Finder 등 unsupported 정책 메시지 반환

### Update Component: `src/workspace/workspace-model.ts`, `src/workspace/workspace-persistence.ts`, `src/workspace/remote-connect-modal.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/contracts/state-model.md` > `2. 핵심 타입`, `4. source of truth`; `/_sdd/spec/sdd-workbench/domains/remote-workspace.md` > `4.1 연결과 browse`
**Change Type**: Enhancement

**Changes**:
- `WorkspaceRemoteProfile`에 optional `sshAlias` 필드 추가
- 세션 저장/복원 시 `sshAlias` 영속화
- 원격 연결 모달에 VS Code 원격 열기용 SSH alias 입력 또는 안내 문구 추가

### Update Component: `electron/preload.ts`, `electron/electron-env.d.ts`, `src/App.tsx`, `electron/main.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/contracts/ipc-contracts.md` > `2. 채널 개요`, `3. 핵심 request/response 요약`; `/_sdd/spec/sdd-workbench/system-architecture.md` > `2. 런타임 경계`, `4.1 Workspace 세션 상태`
**Change Type**: Enhancement

**Changes**:
- `window.workspace.openIn*` 브리지를 workspace-aware request로 확장
- renderer는 `workspaceKind`/`remoteProfile`을 전달하고, main process는 local/remote 실행 전략을 선택
- 원격 Finder/alias 누락 등 예상 가능한 실패를 사용자 안내 메시지로 매핑

---

## Configuration Changes

- 현재 없음

---

## Notes

### Context
현재 F08 외부 도구 열기 기능은 로컬 워크스페이스 중심으로 구현되어 있고, F27 원격 워크스페이스의 canonical root(`remote://...`)를 고려하지 않는다. 사용자가 원격 워크스페이스를 연 상태에서 같은 버튼을 누르면 기대 동작은 "SSH로 붙어서 도구를 열기"인데, 실제 구현은 "로컬 폴더 열기"를 시도하므로 실패한다.

### Constraints
- `_sdd/spec/` 구조는 이번 단계에서 수정하지 않고 patch draft만 생성한다.
- macOS를 primary 지원 대상으로 유지한다.
- VS Code Remote-SSH는 사용자의 로컬 VS Code 설치와 SSH 설정 상태에 일부 의존하므로, alias 누락 시 안내 문구가 필요하다.
- 원격 Finder 지원은 SSHFS/NFS 등 별도 마운트가 없는 한 범위 밖으로 둔다.

### References
- 기존 F08 결정: `/_sdd/spec/decision-log.md`
- 원격 워크스페이스 규칙: `/_sdd/spec/sdd-workbench/domains/remote-workspace.md`
- 현행 IPC 계약: `/_sdd/spec/sdd-workbench/contracts/ipc-contracts.md`

---

# Part 2: Implementation Plan

## Overview

F39의 목표는 F08의 외부 도구 열기 UX를 F27 원격 워크스페이스 모델과 정합되게 확장하는 것이다. 구현 핵심은 외부 도구 실행을 "로컬 경로 열기"에서 "워크스페이스 종류별 실행 전략"으로 바꾸는 것이며, 원격 iTerm은 SSH 명령 실행, 원격 VS Code는 Remote-SSH authority 기반 열기, 원격 Finder는 명시적 unsupported 정책으로 정리한다.

## Scope

### In Scope
- 원격 워크스페이스에서 `Open in iTerm`의 SSH 기반 실행
- 원격 워크스페이스에서 `Open in VSCode`의 Remote-SSH 기반 실행
- `WorkspaceRemoteProfile`에 `sshAlias` 추가 및 세션 복원
- workspace-aware `system:openIn*` request 계약 도입
- 원격 Finder unsupported 정책 및 사용자 안내 메시지
- 로컬 워크스페이스 외부 열기 회귀 방지 테스트

### Out of Scope
- SSH config 파일 자동 파싱/자동 생성
- VS Code shell command 설치 자동화
- Windows/Linux용 외부 도구 열기 구현
- 원격 포트포워딩, 내장 터미널, 원격 확장 관리
- SSHFS가 이미 마운트된 경로를 Finder에서 직접 여는 별도 최적화

## Components

1. **Workspace Open Contract Layer**: `system:openIn*` payload를 local/remote 공통 계약으로 확장한다.
2. **Remote Profile Input Layer**: 원격 연결 프로필에 `sshAlias`를 저장/복원하고 입력 UI를 제공한다.
3. **Renderer Dispatch Layer**: 활성 워크스페이스 종류에 맞춰 외부 열기 요청을 조합하고 오류를 배너로 보여준다.
4. **Main Process Launch Strategy Layer**: iTerm/VS Code/Finder별 local/remote 실행 전략을 분리한다.
5. **Regression Validation Layer**: 로컬 회귀와 원격 신규 동작을 테스트/스모크로 검증한다.

## Implementation Phases

### Phase 1: 계약과 프로필 확장
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| R1 | workspace-aware system open 계약 정의 | P0 | - | Workspace Open Contract Layer |
| R2 | 원격 프로필에 `sshAlias` 입력/영속화 추가 | P0 | R1 | Remote Profile Input Layer |

### Phase 2: renderer와 main 실행 전략 연결
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| R3 | renderer 외부 열기 dispatch를 workspace-aware로 전환 | P0 | R1,R2 | Renderer Dispatch Layer |
| R4 | main process 외부 열기 helper 분리 | P0 | R1 | Main Process Launch Strategy Layer |
| R5 | IPC handler에 remote launch 정책 통합 | P0 | R3,R4 | Main Process Launch Strategy Layer |

### Phase 3: 회귀 방지와 스모크 정리
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| R6 | 원격/로컬 외부 열기 회귀 테스트 및 스모크 보강 | P0 | R2,R5 | Regression Validation Layer |

## Task Details

### Task R1: workspace-aware system open 계약 정의
**Component**: Workspace Open Contract Layer
**Priority**: P0-Critical
**Type**: Infrastructure

**Description**:
`window.workspace.openIn*` API와 IPC payload를 `rootPath` 단독 계약에서 `workspaceKind`, `remoteProfile`, `rootPath`를 포함하는 공통 request 구조로 확장한다. 이 단계에서는 실제 실행 로직보다 타입/bridge/persistence 경계를 먼저 고정한다.

**Acceptance Criteria**:
- [ ] `openInIterm`, `openInVsCode`, `openInFinder`가 동일한 request 구조를 사용한다.
- [ ] `WorkspaceRemoteProfile`에 optional `sshAlias`가 추가된다.
- [ ] 세션 복원 타입이 새 필드를 보존한다.
- [ ] preload/env 타입이 renderer와 동일 계약을 노출한다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- `WorkspaceRemoteProfile`과 관련 타입 확장
- [M] `src/workspace/workspace-persistence.ts` -- `sshAlias` 저장/복원 반영
- [M] `src/workspace/workspace-persistence.test.ts` -- 새 필드 영속화 회귀 테스트
- [M] `electron/electron-env.d.ts` -- workspace-aware system open request/result 타입 반영
- [M] `electron/preload.ts` -- `openIn*` 브리지 payload 구조 확장

**Technical Notes**:
- 가능하면 request 타입을 공용화해 `openIn*` 세 메서드가 같은 shape를 재사용하게 한다.
- 이후 R3/R5에서 사용할 공통 에러 코드 문자열은 여기서 먼저 선언해도 된다.

**Dependencies**: -

---

### Task R2: 원격 프로필에 `sshAlias` 입력/영속화 추가
**Component**: Remote Profile Input Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
원격 연결 모달에 VS Code Remote-SSH용 별칭 필드를 추가하고, 사용자가 입력한 값을 연결 프로필과 세션 복원 경로에서 유지한다. 입력이 비어 있어도 원격 연결 자체는 가능해야 하며, VS Code 원격 열기에서만 전제조건으로 해석한다.

**Acceptance Criteria**:
- [ ] 원격 연결 모달에서 `sshAlias`를 입력/수정할 수 있다.
- [ ] `sshAlias`가 비어 있어도 원격 연결 흐름은 유지된다.
- [ ] 연결 후 workspace session의 `remoteProfile`에 `sshAlias`가 보존된다.
- [ ] 앱 재시작 후 세션 복원 시 `sshAlias`가 유지된다.

**Target Files**:
- [M] `src/workspace/remote-connect-modal.tsx` -- alias 입력 필드/도움말 추가
- [M] `src/workspace/remote-connect-modal.test.tsx` -- alias 입력/submit 동작 테스트

**Technical Notes**:
- UI 라벨은 VS Code 전용 전제조건임을 드러내고, iTerm SSH 열기와 혼동되지 않게 해야 한다.
- `workspaceId` 자동 생성 로직과 `sshAlias`는 결합하지 않는다.

**Dependencies**: R1

---

### Task R3: renderer 외부 열기 dispatch를 workspace-aware로 전환
**Component**: Renderer Dispatch Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`src/App.tsx`의 외부 열기 버튼 핸들러가 활성 워크스페이스의 `workspaceKind`와 `remoteProfile`을 함께 전달하도록 수정한다. 이 단계에서는 원격 워크스페이스에서 generic local path 오류를 만들지 않도록 request 조합과 배너 처리 흐름을 정리한다.

**Acceptance Criteria**:
- [ ] `Open in iTerm` / `Open in VSCode` / `Open in Finder` 요청에 workspace context가 포함된다.
- [ ] 원격 워크스페이스에서 외부 열기 실패 시 target별 안내 메시지가 배너에 노출된다.
- [ ] 로컬 워크스페이스에서 기존 버튼 UX가 유지된다.

**Target Files**:
- [M] `src/App.tsx` -- external open 핸들러에 workspace context 전달

**Technical Notes**:
- `rootPath`는 local workspace에서는 계속 필요하므로 완전히 제거하지 말고 remote 판단과 분리한다.
- 버튼 disabled 정책 변경이 필요하면 R6 테스트와 함께 검증한다.

**Dependencies**: R1, R2

---

### Task R4: main process 외부 열기 helper 분리
**Component**: Main Process Launch Strategy Layer
**Priority**: P0-Critical
**Type**: Refactor

**Description**:
`electron/main.ts`에 직접 들어가 있던 local path 기반 실행 로직을 `electron/system-open.ts`로 분리하고, local/remote 타깃별 전략 선택과 명령 구성 함수를 별도 모듈로 정리한다. 이 단계는 명령 조합과 quoting을 테스트 가능한 순수 함수에 가깝게 만드는 것이 핵심이다.

**Acceptance Criteria**:
- [ ] local directory open, remote iTerm open, remote VS Code open, remote Finder unsupported가 helper 수준에서 구분된다.
- [ ] SSH 명령 조합 시 `user`, `port`, `identityFile`, `remoteRoot` quoting 규칙이 정의된다.
- [ ] VS Code 원격 열기 인자 조합이 helper로 캡슐화된다.

**Target Files**:
- [C] `electron/system-open.ts` -- 외부 도구 실행 전략/helper 모듈

**Technical Notes**:
- `open -a ... --args`와 `osascript` 사용 경계, shell escaping 책임을 helper 내부로 모은다.
- R5와의 파일 겹침을 줄이기 위해 IPC wiring은 이 태스크에서 다루지 않는다.

**Dependencies**: R1

---

### Task R5: IPC handler에 remote launch 정책 통합
**Component**: Main Process Launch Strategy Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`electron/main.ts`의 `handleSystemOpenIn*`가 helper를 사용해 local/remote 분기를 수행하도록 바꾸고, remote workspace에서 로컬 `stat`를 시도하지 않도록 수정한다. unsupported target과 prerequisite 누락을 사용자 친화적인 오류 메시지로 반환한다.

**Acceptance Criteria**:
- [ ] remote workspace 요청은 `path.resolve`/`stat` 로컬 경로 검증을 우회한다.
- [ ] 원격 iTerm/VS Code는 helper 전략을 통해 실행되고, remote Finder는 명시적 unsupported 결과를 반환한다.
- [ ] 예상 가능한 prerequisite 누락 시 safe error message가 반환된다.
- [ ] local workspace 요청은 기존 성공 경로를 유지한다.

**Target Files**:
- [M] `electron/main.ts` -- `handleSystemOpenIn*`를 workspace-aware strategy로 전환

**Technical Notes**:
- remote open 실패 메시지는 민감 정보(`identityFile`, raw ssh stderr`)를 그대로 노출하지 않도록 기존 redaction 정책과 맞춰야 한다.
- helper 반환 타입을 `SystemOpenInResult`와 직접 맞추면 main.ts의 분기 복잡도를 줄일 수 있다.

**Dependencies**: R3, R4

---

### Task R6: 원격/로컬 외부 열기 회귀 테스트 및 스모크 보강
**Component**: Regression Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
로컬과 원격 워크스페이스 모두에서 외부 열기 액션이 의도한 payload/오류 정책을 따르는지 검증하는 테스트를 추가한다. 특히 기존 `src/App.test.tsx`의 local-only 가정을 보완하고, 새 helper의 명령 조합을 고립 테스트로 확인한다.

**Acceptance Criteria**:
- [ ] local workspace에서 기존 `openIn*` 호출 payload가 회귀 없이 유지된다.
- [ ] remote workspace에서 `openInIterm` / `openInVsCode`가 `remoteProfile` 기반 request를 보낸다.
- [ ] `sshAlias` 누락, remote Finder, generic launch failure 케이스가 명시적 메시지로 검증된다.
- [ ] helper 단위 테스트가 SSH/VS Code 인자 조합을 검증한다.

**Target Files**:
- [M] `src/App.test.tsx` -- local/remote open action regression 테스트
- [C] `electron/system-open.test.ts` -- helper 인자 조합/unsupported policy 테스트
- [M] `_sdd/implementation/F15_SMOKE_TEST_CHECKLIST.md` -- 원격 외부 열기 수동 확인 항목 추가

**Technical Notes**:
- `App.test.tsx`는 현재 local path 호출만 검증하므로 remote session fixture를 추가해야 한다.
- smoke checklist는 iTerm, VS Code, Finder 각각의 remote 기대 동작을 분리해 기록하는 편이 좋다.

**Dependencies**: R2, R5

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| VS Code Remote-SSH authority가 사용자 SSH 설정과 불일치 | 원격 VS Code 열기 실패 | `sshAlias`를 explicit field로 저장하고 누락 시 안내 메시지 제공 |
| AppleScript/SSH command quoting 오류 | iTerm에서 잘못된 디렉토리 진입 또는 접속 실패 | helper에서 quoting 함수를 분리하고 단위 테스트로 고정 |
| local/remote 공용 IPC 변경으로 로컬 열기 회귀 | 기존 F08 기능 고장 | bridge 타입 변경 후 local regression 테스트를 먼저 추가 |
| remote Finder 정책이 UI 기대와 다를 수 있음 | UX 혼란 | 명시적 unsupported 메시지를 우선 적용하고, 필요 시 후속 feature에서 disabled 정책 검토 |

## Open Questions

- [ ] `sshAlias`를 optional로 둘지, VS Code 원격 열기를 쓰려면 사실상 required로 문서화할지 최종 결정이 필요하다.
- [ ] 원격 `Open in Finder`를 클릭 가능 + 배너 에러로 둘지, 아예 disabled UI로 바꿀지 UX 결정이 필요하다.
- [ ] VS Code 실행 전략을 `open -a "Visual Studio Code" --args ...`로 고정할지, `code` CLI를 fallback으로 둘지 최종 결정이 필요하다.

## Model Recommendation

이 작업은 renderer/main/IPC/원격 프로필/테스트가 함께 얽혀 있어 `Sonnet` 수준으로 분류하는 편이 적절하다. 권장 모델은 `gpt-5.3-codex`이며 `reasoning effort: high`를 권장한다.
