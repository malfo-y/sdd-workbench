# Feature Draft: F28 SSH 선접속 기반 원격 경로 탐색/선택 UX

**Date**: 2026-03-01
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-03-01
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F28 SSH 연결 후 원격 디렉토리 탐색으로 `remoteRoot` 선택
**Priority**: High
**Category**: Core Feature
**Target Component**: `src/workspace/remote-connect-modal.tsx`, `src/App.tsx`, `electron/preload.ts`, `electron/electron-env.d.ts`, `electron/main.ts`, `electron/remote-agent/directory-browser.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/01-overview.md` > `3.1 MVP 포함 범위`, `4.6 원격 에이전트 워크스페이스 연결 흐름(F27, Implemented)`; `/_sdd/spec/sdd-workbench/02-architecture.md` > `5.9 Remote Agent Protocol 원격 워크스페이스 플로우(F27, Implemented)`; `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`, `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/04-interfaces.md` > `1. 핵심 타입 계약`, `3. IPC 계약`; `/_sdd/spec/sdd-workbench/05-operational-guides.md` > `3. 신뢰성 기준`, `4. 테스트 운영`

**Description**:
현재는 연결 전에 `remoteRoot`를 정확히 입력해야 해서 실사용 진입 장벽이 높다. F28은 SSH 인증 정보(host/user/port/identityFile)를 먼저 확인한 뒤, 원격 디렉토리 목록을 탐색해 워크스페이스 루트를 선택하도록 연결 UX를 2단계로 확장한다.

**Acceptance Criteria**:
- [ ] 원격 연결 모달에서 1단계(접속 프로필 입력)와 2단계(원격 디렉토리 탐색/선택) 흐름이 제공된다.
- [ ] 사용자는 `remoteRoot`를 수동 입력하지 않아도 디렉토리 브라우저에서 선택 후 연결할 수 있다.
- [ ] 원격 디렉토리 탐색은 동일 SSH 인증 옵션(`user`, `port`, `identityFile`)을 재사용한다.
- [ ] 디렉토리 탐색 결과는 정렬된 디렉토리 목록(디렉토리/심볼릭 링크 디렉토리)과 `truncated` 정보를 포함한다.
- [ ] 디렉토리 접근 실패/권한 오류/인증 오류는 모달 내 고정 오류 메시지로 남아 사용자가 확인 가능하다.
- [ ] 최종 선택된 경로는 기존 `connectRemote` 경로로 전달되어 F27 연결/상태/재시도 동작과 호환된다.
- [ ] 마지막 입력값 저장에는 탐색 기반으로 확정된 `remoteRoot`도 포함되어 재접속 시 재사용된다.

**Technical Notes**:
- 디렉토리 탐색은 원격 agent stdio 세션을 열기 전에 SSH 단발 명령으로 수행한다.
- MVP는 디렉토리 목록 탐색만 제공하며 원격 파일 미리보기/검색/북마크는 제외한다.
- 목록 크기 cap(기본 500)을 적용해 응답 프레임 과대화를 방지한다.
- 기존 정책대로 `identityFile` 경로는 로컬에서 `~`/`$HOME` 확장을 적용해 SSH 인자에 전달한다.

**Dependencies**:
- F27 Remote Agent Protocol 연결 경로
- 현재 원격 연결 draft 저장 정책(`sdd-workbench.remote-connect-draft.v1`)

## Improvements

### Improvement: `remoteRoot` 선입력 의존 완화
**Priority**: High
**Target Section**: `/_sdd/spec/sdd-workbench/01-overview.md` > `4.6 원격 에이전트 워크스페이스 연결 흐름(F27, Implemented)`; `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`
**Current State**: 모달 제출 전에 `remoteRoot`를 반드시 직접 입력해야 한다.
**Proposed**: 접속 프로필 검증 후 원격 디렉토리 브라우징으로 경로를 선택하는 흐름을 기본 제공한다.
**Reason**: 사용자가 원격 경로를 정확히 기억하지 못해도 SSH 접속 후 탐색 방식으로 진입할 수 있게 하기 위함.

### Improvement: 원격 경로 탐색 실패 가시성 강화
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/05-operational-guides.md` > `3. 신뢰성 기준`, `4. 테스트 운영`
**Current State**: 연결 실패는 로깅되지만, 탐색 전용 실패 맥락은 별도 표준이 없다.
**Proposed**: 탐색 요청/응답 로깅(`remoteBrowse.request/result`)과 모달 내 고정 에러 노출을 추가한다.
**Reason**: 접속 실패와 경로 탐색 실패를 구분해 디버깅 시간을 줄이기 위함.

## Bug Reports

- 현재 없음

## Component Changes

### New Component: `electron/remote-agent/directory-browser.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/04-interfaces.md` > `3. IPC 계약`
**Purpose**: 원격 agent 연결 이전 단계에서 SSH 단발 호출로 디렉토리 목록을 조회
**Input**: SSH 프로필(host/user/port/identityFile), 조회 기준 경로
**Output**: 현재 경로, 디렉토리 엔트리 목록, truncation 여부, 오류 코드

**Planned Methods**:
- `browseRemoteDirectories(profile, targetPath)` - 대상 경로의 하위 디렉토리 목록 조회
- `normalizeBrowsePath(input, fallbackHome)` - 경로 표준화 및 기본 경로 결정

### Update Component: `src/workspace/remote-connect-modal.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`
**Change Type**: Enhancement

**Changes**:
- 연결 프로필 단계 + 디렉토리 선택 단계를 갖는 2-step 모달로 확장
- 디렉토리 목록, 상위 이동, 경로 선택, 탐색 오류 고정 노출 UI 추가
- 최종 `onSubmit` payload는 기존 `WorkspaceRemoteProfile` 형식을 유지

### Update Component: `electron/preload.ts`, `electron/electron-env.d.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/04-interfaces.md` > `1. 핵심 타입 계약`, `3. IPC 계약`
**Change Type**: Enhancement

**Changes**:
- `workspace:browseRemoteDirectories` IPC 브리지 및 타입 정의 추가
- 요청/응답 계약(`WorkspaceRemoteDirectoryBrowseRequest/Result`) 노출

### Update Component: `electron/main.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/05-operational-guides.md` > `3. 신뢰성 기준`
**Change Type**: Enhancement

**Changes**:
- `workspace:browseRemoteDirectories` IPC handler 등록
- 탐색 요청/결과 로깅(`remoteBrowse.request/result`) 추가
- 인증/경로/권한 오류를 UI 친화 메시지로 전달

## Configuration Changes

### New Config: `REMOTE_DIRECTORY_BROWSE_LIMIT`
**Target Section**: `/_sdd/spec/sdd-workbench/05-operational-guides.md` > `1. 성능 기준`
**Type**: Environment Variable
**Required**: No
**Default**: `500`
**Description**: 원격 디렉토리 탐색 1회 응답의 최대 엔트리 수

### New Config: `REMOTE_DIRECTORY_BROWSE_TIMEOUT_MS`
**Target Section**: `/_sdd/spec/sdd-workbench/05-operational-guides.md` > `3. 신뢰성 기준`
**Type**: Environment Variable
**Required**: No
**Default**: `7000`
**Description**: 원격 디렉토리 탐색 SSH 단발 호출 타임아웃(ms)

## Notes

### Context
원격 연결 자체(F27)는 동작하지만, 사용자가 정확한 `remoteRoot`를 사전에 알아야 하는 UX 제약 때문에 실제 접속 성공률이 낮아질 수 있다. 일반 SSH 사용 흐름(먼저 접속 후 경로 탐색)에 맞춘 입력 동선 보완이 필요하다.

### Constraints
- 대화형 shell/pty 기반 탐색 UI는 MVP 범위에서 제외한다.
- 탐색 단계에서는 디렉토리 목록만 다루고, 파일 목록/검색 인덱싱은 연결 이후 기존 경로를 사용한다.
- 심볼릭 링크 디렉토리는 선택 가능 대상으로 유지한다(기존 정책과 호환).

### References
- `/_sdd/drafts/feature_draft_f27_remote_agent_protocol_mvp.md`
- `/_sdd/spec/DECISION_LOG.md` (2026-03-01 원격 연결 정책)

---

# Part 2: Implementation Plan

## Overview

F28은 기존 F27 연결 엔진을 유지한 채, 원격 루트 경로 입력 전 단계에 SSH 기반 디렉토리 탐색 API와 2-step 모달 UX를 추가하는 작업이다. 핵심은 `remoteRoot`를 “사전 지식 기반 수동 입력”에서 “탐색 후 선택”으로 전환하되, 연결/재시도/저장 계약은 기존 구조와 호환되게 유지하는 것이다.

## Scope

### In Scope
- 원격 디렉토리 탐색용 IPC 계약 추가
- Electron main의 SSH 디렉토리 탐색 handler 및 로깅
- 원격 연결 모달 2-step UX(프로필 입력 -> 디렉토리 선택)
- 선택된 경로를 기존 `connectRemote` 호출로 연결
- 관련 단위/통합 테스트 보강

### Out of Scope
- 원격 터미널 내비게이션(PTY)
- 디렉토리 검색/즐겨찾기/최근 경로 관리 고도화
- 원격 파일 프리뷰를 탐색 단계에서 제공
- agent bootstrap 정책 자체 변경(덮어쓰기/healthcheck/버전검증)

## Components

1. **Remote Browse IPC Layer**: preload/renderer 타입 계약 및 IPC 표면 추가
2. **Main Browse Service Layer**: SSH 단발 디렉토리 조회 및 오류 표준화
3. **Remote Connect Modal Layer**: 2-step 입력/탐색/선택 UI
4. **App Integration Layer**: 모달-IPC 호출 결합 및 최종 connect 전달
5. **Test & Reliability Layer**: cap/timeout/error 고정 및 회귀 테스트

## Implementation Phases

### Phase 1: 계약 및 백엔드 탐색 기반
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| B1 | 원격 디렉토리 탐색 IPC/타입 계약 추가 | P0 | - | Remote Browse IPC Layer |
| B2 | Electron main SSH 디렉토리 탐색 서비스 구현 | P0 | B1 | Main Browse Service Layer |

### Phase 2: 렌더러 UX 및 연결 통합
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| B3 | Remote Connect 모달을 2-step 탐색 UX로 확장 | P0 | B1,B2 | Remote Connect Modal Layer |
| B4 | App 레벨 탐색-선택-연결 플로우 통합 | P0 | B3 | App Integration Layer |

### Phase 3: 품질/운영 고정
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| B5 | cap/timeout/오류 노출/로그 회귀 테스트 고정 | P1 | B2,B4 | Test & Reliability Layer |

## Task Details

### Task B1: 원격 디렉토리 탐색 IPC/타입 계약 추가
**Component**: Remote Browse IPC Layer
**Priority**: P0
**Type**: Infrastructure

**Description**:
`workspace:browseRemoteDirectories` 호출 계약을 preload/renderer 경계에 추가한다. 요청은 SSH 프로필과 대상 경로를 포함하고, 응답은 현재 경로/디렉토리 목록/`truncated`/오류 코드로 표준화한다.

**Acceptance Criteria**:
- [ ] `window.workspace`에 `browseRemoteDirectories(...)` API가 추가된다.
- [ ] 요청/응답 타입이 `electron-env.d.ts`와 preload에 동기화된다.
- [ ] 렌더러 테스트 mock에서 신규 API 누락으로 인한 타입/런타임 오류가 발생하지 않는다.

**Target Files**:
- [M] `electron/electron-env.d.ts` -- `WorkspaceRemoteDirectoryBrowseRequest/Result` 및 API 타입 추가
- [M] `electron/preload.ts` -- `workspace:browseRemoteDirectories` IPC 브리지 추가
- [M] `src/App.test.tsx` -- `window.workspace` mock에 신규 API 반영

**Technical Notes**:
- 응답 스키마에 `errorCode`(예: `AUTH_FAILED`, `TIMEOUT`, `PATH_DENIED`)를 포함해 모달 에러 UX와 바로 연결한다.

**Dependencies**: -

---

### Task B2: Electron main SSH 디렉토리 탐색 서비스 구현
**Component**: Main Browse Service Layer
**Priority**: P0
**Type**: Feature

**Description**:
SSH 단발 호출로 원격 디렉토리 목록을 조회하는 서비스를 구현하고, `workspace:browseRemoteDirectories` IPC handler에서 호출한다. 대형 응답/권한 오류/인증 실패를 안전하게 처리한다.

**Acceptance Criteria**:
- [ ] 특정 경로의 하위 디렉토리 목록을 정렬하여 반환한다.
- [ ] 응답 엔트리 cap 적용 시 `truncated=true`를 반환한다.
- [ ] 인증 실패/타임아웃/권한 오류가 표준 오류 코드와 메시지로 반환된다.
- [ ] `remoteBrowse.request/result` 로그가 `remote-agent.log`에 남는다.

**Target Files**:
- [C] `electron/remote-agent/directory-browser.ts` -- SSH 단발 디렉토리 조회 로직
- [C] `electron/remote-agent/directory-browser.test.ts` -- path 정규화/cap/오류 처리 단위 테스트
- [M] `electron/main.ts` -- browse IPC handler 등록 + 로깅 연동

**Technical Notes**:
- 쉘 명령 인자 구성은 기존 SSH 인자 정책(`-i`, `IdentitiesOnly=yes`, `ConnectTimeout`)과 일관되게 맞춘다.
- stdout 파싱은 JSON 라인 또는 구분자 기반으로 고정해 공백/특수문자 디렉토리명을 안전하게 처리한다.

**Dependencies**: B1

---

### Task B3: Remote Connect 모달을 2-step 탐색 UX로 확장
**Component**: Remote Connect Modal Layer
**Priority**: P0
**Type**: Feature

**Description**:
기존 단일 폼 모달을 “접속 프로필 입력 -> 원격 디렉토리 탐색/선택” 2-step UI로 재구성한다. 탐색 오류 메시지는 자동 소거 없이 모달 내부에 유지한다.

**Acceptance Criteria**:
- [ ] Step 1에서 host/user/port/agentPath/identityFile 입력 후 탐색 시작 액션이 제공된다.
- [ ] Step 2에서 현재 경로, 상위 이동, 하위 디렉토리 선택 UI가 제공된다.
- [ ] 수동 `remoteRoot` 입력 fallback이 유지된다.
- [ ] 마지막 입력값(localStorage) 복원 시 step 상태와 선택 경로가 일관되게 표시된다.

**Target Files**:
- [M] `src/workspace/remote-connect-modal.tsx` -- 2-step 상태/탐색 UI/오류 고정 노출 구현
- [M] `src/workspace/remote-connect-modal.test.tsx` -- step 전환/복원/오류 유지 테스트 추가
- [M] `src/App.css` -- 디렉토리 탐색 목록/선택 상태 스타일 추가

**Technical Notes**:
- Step 2는 기본 시작 경로를 “마지막 선택 경로 -> 없으면 `$HOME`” 우선순위로 설정한다.
- 엔트리 렌더는 대용량 대응을 위해 단순 리스트 + 스크롤로 시작한다(가상 스크롤은 후속).

**Dependencies**: B1, B2

---

### Task B4: App 레벨 탐색-선택-연결 플로우 통합
**Component**: App Integration Layer
**Priority**: P0
**Type**: Feature

**Description**:
App에서 모달에 탐색 callback을 주입하고, Step 2에서 선택된 경로를 최종 `connectRemoteWorkspace` 호출 payload의 `remoteRoot`로 전달한다.

**Acceptance Criteria**:
- [ ] 모달의 탐색 요청이 `window.workspace.browseRemoteDirectories`로 전달된다.
- [ ] 선택 경로가 `connectRemoteWorkspace`의 `remoteRoot`로 전달된다.
- [ ] 연결 성공 시 모달 닫힘/워크스페이스 활성화가 기존과 동일하게 동작한다.
- [ ] 탐색 실패와 연결 실패 배너/모달 메시지가 구분되어 노출된다.

**Target Files**:
- [M] `src/App.tsx` -- browse callback wiring + submit payload 보강
- [M] `src/App.test.tsx` -- 탐색 후 연결 플로우 통합 테스트

**Technical Notes**:
- 모달 내부에서 직접 IPC 호출하지 않고 App에서 주입해 테스트 대체(mocks) 난이도를 낮춘다.

**Dependencies**: B3

---

### Task B5: cap/timeout/오류 노출/로그 회귀 테스트 고정
**Component**: Test & Reliability Layer
**Priority**: P1
**Type**: Test

**Description**:
대형 디렉토리, 느린 SSH 응답, 권한 거부, 인증 실패 시나리오를 테스트/로그 기준으로 고정해 회귀를 줄인다.

**Acceptance Criteria**:
- [ ] browse 응답 cap 초과 시 `truncated` 경고 UX가 유지된다.
- [ ] timeout/auth 오류가 예상 코드와 사용자 메시지로 노출된다.
- [ ] 탐색 실패 로그가 민감정보 마스킹 규칙을 따른다.
- [ ] 기존 F27 연결 테스트가 깨지지 않는다.

**Target Files**:
- [M] `electron/remote-agent/directory-browser.test.ts` -- timeout/auth/path 오류 케이스 보강
- [M] `electron/main.ts` -- browse 로그 마스킹/메시지 표준화 보강
- [M] `src/App.test.tsx` -- `truncated`/오류 메시지 회귀 테스트

**Technical Notes**:
- 민감정보 마스킹은 기존 remote 로그 sanitize 경로를 재사용한다.

**Dependencies**: B2, B4

---

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 2 | 없음 (B1: preload/env/test, B2: main+신규 서비스) |
| 2 | 2 | 2 | 의미 충돌 가능: B3(모달 props) <-> B4(App wiring) |
| 3 | 1 | 1 | `src/App.test.tsx`, `electron/main.ts` 단일 태스크 집중 |

**Conflict Notes**:
- B3/B4는 파일 충돌은 낮지만 모달 props 계약의 의미 충돌 가능성이 있어 인터페이스를 먼저 고정해야 한다.
- B5는 B2/B4 결과를 검증하는 태스크이므로 마지막에 순차 적용이 안전하다.

## Risks & Mitigations

1. **리스크**: 디렉토리 목록이 큰 경로에서 응답 프레임/파싱 비용 급증
   **완화**: cap + `truncated` 고정, 이후 사용자가 하위 경로로 좁혀 탐색

2. **리스크**: SSH 비대화형 환경에서 권한/셸 차이로 경로 탐색 실패
   **완화**: timeout/권한/auth 오류 코드를 분리하고 모달에서 재시도 가능하게 유지

3. **리스크**: 모달 복잡도 증가로 기존 연결 성공 경로 회귀
   **완화**: 수동 입력 fallback 유지 + App 통합 테스트에서 기존 시나리오 병행 검증

4. **리스크**: 탐색 성공 후 실제 agent bootstrap 실패(Node 미설치 등)로 사용자 혼란
   **완화**: “탐색 성공 != agent 실행 가능” 메시지를 연결 실패 시 명시

## Open Questions

1. 디렉토리 탐색 초기 경로를 항상 `$HOME`으로 고정할지, 마지막 성공 경로를 우선할지 최종 정책 확인 필요.
2. 숨김 디렉토리(`.` prefix) 표시를 기본 on으로 둘지 UI 토글로 분리할지 결정 필요.

---

## Next Steps

### Apply Spec Patch (choose one)
- **Method A (automatic)**: `spec-update-todo` 실행 후 이 문서 Part 1 입력
- **Method B (manual)**: Part 1 항목을 각 Target Section에 수동 반영

### Execute Implementation
- **Parallel**: `implementation` 스킬로 Part 2 Task B1~B5 실행
- **Sequential**: 순차 실행 시 B1 -> B2 -> B3 -> B4 -> B5 권장

### Model Recommendation
- 구현 단계는 코드/테스트 동시 갱신이 많아 현재와 동일한 coding-capable 모델 사용을 권장
