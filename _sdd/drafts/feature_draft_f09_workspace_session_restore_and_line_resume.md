# Feature Draft: F09 Workspace Session Restore + Line Resume

**Date**: 2026-02-21
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-21
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F09 앱 재시작 세션 복원 + 파일 라인 위치 복원
**Priority**: High (P0)
**Category**: Core Feature
**Target Component**: WorkspaceProvider, WorkspaceModel, App, Persistence Layer
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue` (`F09` 항목 교체)

**Description**:
기존 F09(현재 스펙 섹션 복사) 대신,
앱 재시작 시 이전 작업 문맥을 자동으로 복원하는 기능을 도입한다.

복원 대상:
- 열린 workspace 목록
- active workspace
- workspace별 active file
- 파일별 마지막 라인 위치(라인 기준)

핵심 동작:
- 앱 종료 전 상태를 로컬 저장소에 저장한다.
- 앱 시작 시 저장 상태를 읽어 workspace를 재구성한다.
- 파일을 다시 열면 마지막 라인 위치로 이동한다.

**Acceptance Criteria**:
- [ ] 앱 재시작 후 이전에 열려 있던 workspace들이 자동 복원된다.
- [ ] 앱 재시작 후 active workspace가 이전 상태로 복원된다.
- [ ] workspace별 active file이 자동 복원된다.
- [ ] 해당 파일을 다시 열 때 마지막 라인 위치로 이동한다(라인 기반, 스크롤 best-effort).
- [ ] 존재하지 않는 경로/읽기 실패 workspace는 안전하게 스킵되고 앱이 정상 동작한다.
- [ ] 복원 실패는 텍스트 배너로 노출되며 전체 복원 플로우는 계속 진행된다.

**Technical Notes**:
- 영속화 저장소는 Renderer `localStorage`를 기본으로 한다.
- 저장 데이터는 버전 필드(`schemaVersion`)를 포함한다.
- 라인 위치는 파일별 map(`relativePath -> lineNumber`)으로 저장하고, 파일 길이 변경 시 EOF로 clamp한다.
- 복원 시 파일 본문 로드 완료 후 라인 점프를 트리거한다.

**Dependencies**:
- F03.5 멀티 워크스페이스 상태 모델
- F05 코드 라인 점프(`CodeViewerJumpRequest`) 메커니즘
- F07.1 파일 히스토리 모델

## Improvements

### Improvement: 기존 F09 범위 교체(스펙 섹션 복사 -> 세션 복원)
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue` > `F09`
**Current State**: F09가 `Copy Current Spec Section`으로 정의되어 있음.
**Proposed**: F09를 세션 복원 기능으로 교체한다.
**Reason**: 사용자의 실제 우선순위(작업 문맥 복구)가 더 높고, 현재 워크벤치 사용성 개선 효과가 큼.

### Improvement: 상태 모델에 파일별 마지막 라인 위치 추가
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `7. 상태 모델`
**Current State**: `selectionRange`는 현재 파일 기준이며 파일별 복원 맵이 없음.
**Proposed**: workspace 세션에 `fileLastLineByPath`(또는 동등 구조)를 추가한다.
**Reason**: 파일 재열기/재시작 복원에서 라인 기준 위치 복원을 지원해야 함.

### Improvement: 신뢰성 규칙 추가(복원 실패 내성)
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `10.3 신뢰성`, `13.1 수용 기준`
**Current State**: 앱 시작 복원 실패 처리 규칙이 명시되어 있지 않음.
**Proposed**:
- 복원 불가 workspace는 건너뛰고 나머지 복원 계속
- 부분 실패는 배너로 알림
- 저장 데이터 손상 시 안전 초기화
**Reason**: 복원 기능은 실패 내성이 핵심이며 전체 앱 사용 불능으로 이어지면 안 됨.

## Bug Reports

해당 없음

## Component Changes

### Create Component: Workspace Persistence (`src/workspace/workspace-persistence.ts`)
**Target Section**: `/_sdd/spec/main.md` > `6.1 WorkspaceProvider`, `10.3 신뢰성`
**Change Type**: Addition

**Changes**:
- 세션 snapshot 직렬화/역직렬화
- 스키마 버전 검증
- localStorage read/write/clear helper

### Update Component: Workspace Model (`src/workspace/workspace-model.ts`)
**Target Section**: `/_sdd/spec/main.md` > `7. 상태 모델`
**Change Type**: Enhancement

**Changes**:
- `WorkspaceSession`에 파일별 라인 복원 map 필드 추가
- 파일 선택/선택 라인 갱신 시 라인 위치 반영 규칙 추가

### Update Component: Workspace Provider (`src/workspace/workspace-context.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.1 WorkspaceProvider`, `11.3 멀티 워크스페이스 공통 규칙`
**Change Type**: Enhancement

**Changes**:
- 앱 시작 시 snapshot hydrate
- 상태 변경 시 snapshot persist
- workspace/index/file 복원 오케스트레이션
- 라인 복원 점프 요청 생성

### Update Component: App Shell (`src/App.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `3.1 코드베이스 인벤토리`
**Change Type**: Enhancement

**Changes**:
- 복원 라인 점프 요청을 CodeViewer로 전달
- 기존 링크 점프와 충돌 없는 jump token 규칙 유지

## Configuration Changes

해당 없음

## Notes

### Resolved Decisions
- [x] F09는 스펙 섹션 복사 기능이 아니라 세션 복원 기능으로 교체한다.
- [x] 라인 복원은 "라인 기준"으로 처리하고 픽셀 단위 스크롤 복원은 범위 밖으로 둔다.
- [x] 영속화 저장소는 localStorage를 기본으로 한다.

### Scope Boundary
- 이번 F09는 세션 복원(workspace/active file/line resume)에 집중한다.
- 기존 "Copy Current Spec Section" 기능은 본 F09 범위에서 제외한다.
- 키보드 단축키/탭형 편집기/고급 세션 병합은 범위 밖이다.

### Backlog Handling
- 기존 F09(스펙 섹션 복사)는 우선순위 큐에서 제거하고, 필요하면 신규 ID(예: F11)로 재등록한다.

---

# Part 2: Implementation Plan

## Overview

F09의 목표는 앱 재시작 후 작업 문맥을 복원하는 것이다.
현재 코드는 멀티 워크스페이스/파일 히스토리 상태를 런타임 메모리로만 유지하므로,
영속화 레이어 + 초기 복원 오케스트레이션을 추가해야 한다.

핵심 구현 축:
1. persistence schema/유틸
2. 상태 모델 확장(파일별 마지막 라인)
3. provider hydrate/persist + 복원 플로우
4. 코드 뷰어 라인 점프 연동

## Scope

### In Scope
- workspace 목록/active workspace/active file 영속화
- 파일별 마지막 라인 위치 영속화/복원
- 앱 시작 시 자동 복원
- 부분 실패 허용(복원 continue) + 배너 피드백
- 단위/통합 테스트

### Out of Scope
- 픽셀 단위 스크롤 정밀 복원
- 세션 동기화(클라우드/다중 기기)
- 기존 F09(현재 스펙 섹션 복사) 구현
- 히스토리/마커 완전 영속화 확장(필수 항목 외)

## Components

1. **Persistence Schema Layer**: 저장 포맷/버전/검증
2. **Workspace State Extension Layer**: 파일별 마지막 라인 상태
3. **Restore Orchestration Layer**: 앱 시작 복원 + 실패 내성
4. **Line Resume Integration Layer**: 파일 재열기 시 라인 점프
5. **Validation Layer**: unit/integration 회귀 고정

## Implementation Phases

### Phase 1: Persistence Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | persistence schema/유틸 추가(localStorage + 버전 검증) | P0 | - | Persistence Schema Layer |
| T2 | WorkspaceSession 파일별 라인 위치 상태 확장 | P0 | - | Workspace State Extension Layer |

### Phase 2: Restore Flow Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | WorkspaceProvider hydrate/persist 파이프라인 구현 | P0 | T1,T2 | Restore Orchestration Layer |
| T4 | 파일 재열기/복원 시 라인 점프 연동 | P0 | T2,T3 | Line Resume Integration Layer |

### Phase 3: Validation and Hardening

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 단위 테스트(persistence/model) 보강 | P0 | T1,T2 | Validation Layer |
| T6 | App 통합 테스트(재시작 복원/부분 실패/라인 복원) 보강 | P0 | T3,T4,T5 | Validation Layer |

## Task Details

### Task T1: persistence schema/유틸 추가(localStorage + 버전 검증)
**Component**: Persistence Schema Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
세션 snapshot을 저장/로드하는 유틸을 추가한다.
스키마 버전과 데이터 검증을 포함해 손상 데이터에도 안전하게 동작하도록 한다.

**Acceptance Criteria**:
- [ ] snapshot 타입(`schemaVersion`, `workspaces`, `activeWorkspaceId`)이 정의된다.
- [ ] localStorage read/write helper가 구현된다.
- [ ] invalid schema/parse 실패 시 `null` 반환으로 안전하게 degrade된다.
- [ ] snapshot 마이그레이션 여지를 위한 버전 체크가 포함된다.

**Target Files**:
- [C] `src/workspace/workspace-persistence.ts` -- snapshot 타입/검증/read-write 유틸 추가
- [C] `src/workspace/workspace-persistence.test.ts` -- schema 검증/파싱 실패/버전 불일치 테스트

**Technical Notes**:
- 저장 키는 단일 고정 키(`sdd-workbench:workspace-session:v1`)를 사용한다.
- 저장 필드는 복원에 필요한 최소 상태만 포함한다(경량화).

**Dependencies**: -

---

### Task T2: WorkspaceSession 파일별 라인 위치 상태 확장
**Component**: Workspace State Extension Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
workspace 세션에 파일별 마지막 라인 위치 map을 추가하고,
선택 라인 변화에 따라 해당 파일의 마지막 라인을 갱신하도록 상태 규칙을 확장한다.

**Acceptance Criteria**:
- [ ] `WorkspaceSession`에 `fileLastLineByPath`(또는 동등 구조)가 추가된다.
- [ ] active file에서 selectionRange가 바뀌면 해당 파일 마지막 라인이 갱신된다.
- [ ] 파일 재열기 시 저장된 라인 값을 읽을 수 있다.
- [ ] 라인 값은 1 이상 정수로 정규화된다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- 세션 타입/초기값/라인 정규화 유틸 추가
- [M] `src/workspace/workspace-model.test.ts` -- 파일별 라인 map 갱신/정규화 테스트 추가

**Technical Notes**:
- 파일별 map은 workspace 단위로 독립 저장한다.
- line 값은 복원 시 파일 길이에 맞춰 clamp 처리한다.

**Dependencies**: -

---

### Task T3: WorkspaceProvider hydrate/persist 파이프라인 구현
**Component**: Restore Orchestration Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
Provider mount 시 snapshot을 읽어 workspace 목록/active workspace/active file을 복원하고,
상태 변경 시 snapshot 저장을 수행한다.

**Acceptance Criteria**:
- [ ] 앱 시작 시 snapshot이 있으면 workspace 목록이 자동 복원된다.
- [ ] active workspace가 저장값 기준으로 복원된다.
- [ ] workspace별 active file 복원이 시도된다.
- [ ] 경로 불가/인덱싱 실패 workspace는 스킵되며 나머지 복원은 계속된다.
- [ ] 상태 변경 시 snapshot이 최신 상태로 저장된다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- hydrate effect + persist effect + restore 오케스트레이션
- [M] `src/workspace/use-workspace.ts` -- 복원 관련 추가 context value 타입 정합성(필요 시)
- [M] `src/workspace/workspace-persistence.ts` -- provider에서 사용할 snapshot API 연동

**Technical Notes**:
- 초기 복원 중 저장 루프를 피하기 위해 hydrate guard 플래그를 사용한다.
- 복원은 workspace 단위 순차 처리로 안정성을 우선한다.

**Dependencies**: T1,T2

---

### Task T4: 파일 재열기/복원 시 라인 점프 연동
**Component**: Line Resume Integration Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
파일을 다시 열거나 앱 시작 복원에서 파일이 열릴 때,
저장된 마지막 라인으로 selection + 점프를 수행한다.

**Acceptance Criteria**:
- [ ] 복원된 active file은 마지막 라인으로 점프한다.
- [ ] 사용자가 파일 A -> B -> A 재열기 시 A의 마지막 라인으로 점프한다.
- [ ] 파일 길이보다 큰 라인 저장값은 마지막 라인으로 clamp된다.
- [ ] 기존 spec 링크 점프(F05)와 충돌하지 않는다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 파일 열기 시 라인 복원 selection 설정/요청 생성
- [M] `src/App.tsx` -- 라인 복원 jump request를 CodeViewer로 전달
- [M] `src/code-viewer/code-viewer-panel.tsx` -- jump request 처리 재사용(필요 시 reason 구분)

**Technical Notes**:
- 기존 `CodeViewerJumpRequest` 토큰 메커니즘을 재사용한다.
- line resume은 단일 라인 선택(`start=end`)으로 표현한다.

**Dependencies**: T2,T3

---

### Task T5: 단위 테스트(persistence/model) 보강
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
persistence schema 및 모델 확장 규칙을 단위 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] snapshot parse/validate/invalid fallback 테스트가 추가된다.
- [ ] 파일별 라인 위치 map 갱신/정규화 테스트가 추가된다.
- [ ] 기존 workspace-model 히스토리 테스트가 회귀 없이 유지된다.

**Target Files**:
- [M] `src/workspace/workspace-persistence.test.ts` -- snapshot unit tests
- [M] `src/workspace/workspace-model.test.ts` -- line map/state transition tests

**Technical Notes**:
- localStorage 의존 테스트는 모킹 또는 jsdom storage reset을 사용한다.

**Dependencies**: T1,T2

---

### Task T6: App 통합 테스트(재시작 복원/부분 실패/라인 복원) 보강
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
실제 사용 플로우 기준으로 세션 복원 동작을 통합 테스트에 추가한다.

**Acceptance Criteria**:
- [ ] 저장된 snapshot으로 WorkspaceProvider 재마운트 시 workspace/active file이 복원된다.
- [ ] 복원 실패 workspace가 있어도 나머지 복원이 계속되는 것이 검증된다.
- [ ] 파일 재열기 시 마지막 라인 복원 점프가 검증된다.
- [ ] `npm test`, `npm run lint`, `npm run build`가 통과한다.

**Target Files**:
- [M] `src/App.test.tsx` -- restore scenario 추가
- [M] `src/workspace/workspace-context.tsx` -- 테스트 주입 가능 지점 보강(필요 시)

**Technical Notes**:
- 테스트에서는 localStorage snapshot을 직접 주입한 뒤 App 재렌더로 복원 시나리오를 재현한다.
- watch/history 기존 회귀 케이스와 충돌하지 않도록 describe 블록을 분리한다.

**Dependencies**: T3,T4,T5

## Parallel Execution Summary

- Group A: `T1`, `T2` (파일 충돌 없음, 병렬 가능)
- Group B: `T3` (`workspace-context.tsx` 중심, T1/T2 이후)
- Group C: `T4` (`workspace-context.tsx` + `App.tsx` + code viewer 연동, T3 이후)
- Group D: `T5` (`workspace-persistence.test.ts` + `workspace-model.test.ts`, T1/T2 이후)
- Group E: `T6` (최종 통합 검증)

파일 충돌/순차 권장 지점:
- `src/workspace/workspace-context.tsx`는 hydrate/persist/restore가 집중되는 핵심 파일이므로 단일 태스크(T3/T4) 순차 권장
- `src/App.tsx`는 jump orchestration과 기존 F05/F07.1 로직 충돌 가능성이 있어 T4에서만 변경
- `src/App.test.tsx`는 기존 시나리오가 많아 T6에서 최종 통합 편집 권장

예상 critical path:
- `T1 -> T2 -> T3 -> T4 -> T6`

## Risks & Mitigations

1. **Risk**: 손상된 snapshot으로 앱 초기화 실패  
**Mitigation**: parse/validate 실패 시 snapshot 무시 + 안전 초기 상태로 fallback

2. **Risk**: restore 중 workspace index/read 지연으로 UX 블로킹  
**Mitigation**: workspace 단위 순차 복원 + 부분 실패 continue + 배너 알림

3. **Risk**: line restore가 기존 spec 링크 점프와 충돌  
**Mitigation**: jump request 토큰 규칙 유지 + restore/spec-link reason 분리(필요 시)

4. **Risk**: 저장 payload 과대화  
**Mitigation**: 최소 필드만 저장 + 파일별 라인 map 크기 제한(예: workspace당 최근 200 엔트리)

## Open Questions

- 현재 없음(요청 기준 확정):
  - 라인 복원은 픽셀 스크롤 복원 대신 라인 기준으로 처리
  - F09는 세션 복원 기능으로 교체
