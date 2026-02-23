# Feature Draft: F15 Remote Workspace via SSHFS (Auto + Manual Watch Override)

**Date**: 2026-02-23
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-23
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F15 SSHFS 마운트 원격 워크스페이스 + Watch Mode 자동/수동 전환
**Priority**: High
**Category**: Core Feature
**Target Component**: `electron/main.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`, `src/workspace/workspace-context.tsx`, `src/workspace/workspace-model.ts`, `src/workspace/workspace-persistence.ts`, `src/App.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/01-overview.md` > `3.1 MVP 포함 범위`, `3.2 MVP 제외 범위`, `5. 현재 기능 커버리지 요약`; `/_sdd/spec/sdd-workbench/02-architecture.md` > `4.1 Workspace 세션 상태`, `5.1 Workspace 부팅/전환`; `/_sdd/spec/sdd-workbench/04-interfaces.md` > `1. 핵심 타입 계약`, `3. IPC 계약`

**Description**:
SSHFS(또는 유사 마운트) 경로를 일반 워크스페이스와 동일하게 열고, watcher는 자동 판정 + 수동 override를 함께 지원한다.
기본 정책은 `/Volumes/*` 경로를 remote로 간주하여 polling 모드로 시작한다. 사용자는 워크스페이스별로 `auto | native | polling` override를 지정해 모드를 강제할 수 있다.

**Acceptance Criteria**:
- [ ] `/Volumes/*` 경로를 워크스페이스로 열 수 있고 기존 파일 탐색/코드 뷰/마크다운 뷰/코멘트/export 흐름이 동일하게 동작한다.
- [ ] watcher 모드 타입 `WatchMode = 'native' | 'polling'`, 사용자 선호 타입 `WatchModePreference = 'auto' | 'native' | 'polling'`가 계약에 추가된다.
- [ ] `watchModePreference='auto'`일 때 `/Volumes/*` 경로는 기본 `polling + remote`, 그 외 경로는 기본 `native + local`로 시작한다.
- [ ] `watchModePreference='native'|'polling'`이면 자동 판정보다 override가 우선 적용된다.
- [ ] polling 모드는 1000~2000ms 상수 간격(기본 1500ms)으로 `mtimeMs + size` 메타데이터 diff를 비교한다.
- [ ] polling diff 결과가 기존 `changedFiles`/active file 자동 재로딩 플로우에 동일하게 반영된다.
- [ ] UI에 active workspace의 `Mode`와 `Preference` 정보 및 `[REMOTE]` 배지가 최소 정보로 표시된다.
- [ ] native watcher 시작 실패 시 polling fallback이 적용되고 배너로 안내된다.
- [ ] SSH 클라이언트/SFTP/인증/원격 실행/포트포워딩/원격 터미널은 구현 범위에 포함되지 않는다.

**Technical Notes**:
- 자동 판정은 SSH 프로토콜 인식이 아니라 경로 휴리스틱 기반(`/Volumes/*`)으로 수행한다.
- 모드 결정 우선순위는 `manual override > auto heuristic`로 고정한다.
- polling은 파일 본문 비교 없이 메타데이터 비교만 수행한다.
- 대규모 리포지토리 최적화(부분 polling)는 후속(F15.x)으로 분리한다.

**Dependencies**:
- 기존 F07 watcher 파이프라인
- 기존 F11.2 changed marker 버블링 가시화 규칙
- 기존 F09 세션 스냅샷 복원 흐름

## Improvements

### Improvement: 워크스페이스별 Watch Mode 선호값 영속화
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/02-architecture.md` > `4.1 Workspace 세션 상태`; `/_sdd/spec/sdd-workbench/05-operational-guides.md` > `3. 신뢰성 기준`
**Current State**: watcher 모드는 런타임에서 자동 결정되며 사용자 지정 선호값은 유지되지 않는다.
**Proposed**: `watchModePreference`를 workspace 세션 스냅샷에 저장/복원한다.
**Reason**: 마운트 환경마다 적합한 watcher 모드가 달라 재시작 후에도 사용자 의도를 유지해야 하기 때문.

### Improvement: Native watcher 실패 시 Polling 자동 fallback
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/05-operational-guides.md` > `3. 신뢰성 기준`
**Current State**: watcher 시작 실패 시 배너만 노출되고 변경 감지가 비활성화될 수 있다.
**Proposed**: native watcher start 실패 시 polling으로 즉시 fallback하고 배너로 모드 전환 사실을 안내한다.
**Reason**: 마운트 환경 이벤트 불안정성을 런타임에서 흡수해 변경 감지 가용성을 높이기 위함.

## Component Changes

### New Component: `electron/workspace-watch-mode.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.7 Electron Boundary`
**Purpose**: 경로 휴리스틱 + 선호값 기반 watcher 모드 결정
**Input**: `{ rootPath, watchModePreference }`
**Output**: `{ watchMode, isRemoteMounted, resolvedBy }`

**Planned Methods**:
- `resolveWorkspaceWatchMode(input)` - override/auto 규칙 기반 모드 판정

### Update Component: `electron/main.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/04-interfaces.md` > `3. IPC 계약`
**Change Type**: Enhancement

**Changes**:
- `workspace:watchStart` 요청 계약에 `watchModePreference` 입력 추가
- `workspace:watchStart` 응답 계약에 `watchMode`, `isRemoteMounted`, `fallbackApplied` 추가
- watcher 엔트리를 `native`/`polling` 모드로 분기 관리
- polling 루프(메타데이터 diff) + watchEvent 송신 통합
- native 실패 시 polling fallback 경로 추가

### Update Component: `src/workspace/workspace-model.ts`, `src/workspace/workspace-context.tsx`, `src/workspace/workspace-persistence.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.2 Workspace State Layer`; `/_sdd/spec/sdd-workbench/02-architecture.md` > `4.1 Workspace 세션 상태`
**Change Type**: Enhancement

**Changes**:
- `WorkspaceSession`에 `watchModePreference`, `watchMode`, `isRemoteMounted` 상태 추가
- `setWatchModePreference(workspaceId, preference)` 액션 추가
- watchStart 응답 기반 세션 메타데이터 갱신
- preference를 세션 스냅샷에 저장/복원

### Update Component: `src/App.tsx`, `src/App.css`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`; `/_sdd/spec/sdd-workbench/02-architecture.md` > `3. UI 레이아웃`
**Change Type**: Enhancement

**Changes**:
- `Current Workspace` 블록에 `Mode`, `Preference`, `[REMOTE]` 표시 추가
- `Watch Mode` 선택 UI(`Auto / Native / Polling`) 추가
- 기존 헤더/파일 패널 레이아웃 회귀 없이 최소 정보로 배치

## Notes

### Context
원격 지원의 목표는 SSH 기능 자체가 아니라 마운트된 파일시스템에서도 SDD Workbench 루프(탐색/코멘트/export/변경감지)를 안정적으로 유지하는 것이다.

### Constraints
- SSH/SFTP/인증/원격 에이전트/원격 실행은 구현하지 않는다.
- polling은 메타데이터 diff만 사용하고 파일 본문 비교는 하지 않는다.
- 수동 override는 워크스페이스 단위로만 적용한다(전역 설정 화면은 미포함).

### Open Questions
- 현재 없음

---

# Part 2: Implementation Plan

## Overview

F15의 목표는 마운트된 원격 워크스페이스를 기존 워크스페이스와 동일하게 처리하되, watcher 신뢰성을 위해 `native/polling` 자동 판정과 워크스페이스별 수동 override를 함께 도입하는 것이다. 핵심은 Electron boundary의 모드 분기/polling runtime, Renderer 상태 영속화, 그리고 최소 UI 제어를 일관 계약으로 묶는 것이다.

## Scope

### In Scope
- 경로 휴리스틱(`/Volumes/*`) 기반 자동 모드 판정
- 워크스페이스별 수동 override(`auto|native|polling`) 및 우선순위 적용
- `workspace:watchStart` 계약 확장(요청: preference, 응답: resolved mode/remote/fallback)
- polling 기반 파일 메타데이터 diff 및 `changedFiles` 이벤트 반영
- native 실패 시 polling 자동 fallback
- watcher 모드 표시 + override UI + 세션 영속화
- 관련 단위/통합 테스트 보강

### Out of Scope
- SSH/SFTP/인증/원격 명령 실행
- 원격 터미널/포트포워딩
- polling 대상 최적화(open/recent/expanded 한정)
- 전역 설정 화면/고급 watcher 튜닝 UI

## Components

1. **Watch Mode Resolution Layer**: 휴리스틱 + override 기반 모드 결정
2. **Main Watch Runtime Layer**: native/polling watcher 실행, fallback, 이벤트 송신
3. **Workspace State Layer**: preference/mode/remote 상태 및 persistence
4. **UI Indicator & Control Layer**: mode 표시 + override 선택
5. **Validation Layer**: 판정/상태/이벤트/UI 회귀 검증

## Implementation Phases

### Phase 1: 계약/기반 구축
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | WatchMode/Preference 타입 + IPC 계약 확장 | P0 | - | Watch Mode Resolution Layer |
| T2 | 경로 휴리스틱 + override 우선순위 판정 유틸 추가 | P0 | T1 | Watch Mode Resolution Layer |

### Phase 2: watcher 런타임 통합
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | Main 프로세스 native/polling watcher 분기 구현 | P0 | T1,T2 | Main Watch Runtime Layer |
| T4 | native 실패 시 polling fallback + 결과 플래그/배너 경로 정리 | P1 | T3 | Main Watch Runtime Layer |

### Phase 3: 상태/영속화/UI 연결
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | WorkspaceSession에 preference/mode/remote 상태 추가 | P0 | T1 | Workspace State Layer |
| T6 | preference persistence(저장/복원) 연결 | P0 | T5 | Workspace State Layer |
| T7 | App에 mode 표시 + override 선택 UI 추가 | P1 | T5,T6 | UI Indicator & Control Layer |

### Phase 4: 테스트/회귀 검증
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T8 | watch mode 판정 유틸 단위 테스트 추가 | P0 | T2 | Validation Layer |
| T9 | App/Workspace 통합 테스트(override 우선순위 + 폴링 이벤트) 보강 | P0 | T3,T5,T6,T7 | Validation Layer |

## Task Details

### Task T1: WatchMode/Preference 타입 + IPC 계약 확장
**Component**: Watch Mode Resolution Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`workspace:watchStart` 요청/응답 계약에 mode preference 및 resolved mode 정보를 추가하고 preload/renderer 타입을 동기화한다.

**Acceptance Criteria**:
- [ ] `WatchMode = 'native' | 'polling'` 타입이 경계 타입에 추가된다.
- [ ] `WatchModePreference = 'auto' | 'native' | 'polling'` 타입이 경계 타입에 추가된다.
- [ ] `watchStart` 요청에 `watchModePreference` 필드가 추가된다.
- [ ] `watchStart` 응답에 `watchMode`, `isRemoteMounted`, `fallbackApplied` 필드가 추가된다.
- [ ] preload 브리지 타입과 `window.workspace` 타입 선언이 일치한다.

**Target Files**:
- [M] `electron/electron-env.d.ts` -- WatchMode/Preference + watchStart request/response 타입 확장
- [M] `electron/preload.ts` -- watchStart 호출 계약 반영
- [M] `src/workspace/workspace-context.tsx` -- watchStart 호출 입력/응답 타입 반영

**Technical Notes**:
- 기존 watchStart 식별자(`workspaceId`, `rootPath`)는 그대로 유지한다.

**Dependencies**: -

---

### Task T2: 경로 휴리스틱 + override 우선순위 판정 유틸 추가
**Component**: Watch Mode Resolution Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`manual override > auto heuristic` 우선순위를 가진 모드 판정 유틸을 추가한다.

**Acceptance Criteria**:
- [ ] `preference='auto'` + `/Volumes/*` 경로는 `polling + remote`로 판정된다.
- [ ] `preference='auto'` + non-`/Volumes/*` 경로는 `native + local`로 판정된다.
- [ ] `preference='native'|'polling'`은 경로와 무관하게 강제 적용된다.
- [ ] 판정 결과에 `resolvedBy: 'override' | 'heuristic'`가 포함된다.

**Target Files**:
- [C] `electron/workspace-watch-mode.ts` -- 모드 판정 유틸 구현
- [M] `electron/main.ts` -- watchStart에서 판정 유틸 사용

**Technical Notes**:
- 경로 문자열 정규화(`\\` -> `/`) 후 prefix 매칭한다.

**Dependencies**: T1

---

### Task T3: Main 프로세스 native/polling watcher 분기 구현
**Component**: Main Watch Runtime Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
watcher 엔트리를 모드별로 관리하고 polling 루프 기반 diff 이벤트를 기존 watchEvent 계약에 맞춰 송신한다.

**Acceptance Criteria**:
- [ ] watchStart 시 모드별 엔트리(`native` 또는 `polling`)가 생성된다.
- [ ] polling 루프는 지정 간격마다 파일 메타데이터(`mtimeMs`, `size`)를 비교한다.
- [ ] diff가 발생한 파일은 기존 `workspace:watchEvent` payload 형식으로 송신된다.
- [ ] watchStop/close/unmount 시 polling 타이머와 native watcher 모두 누수 없이 정리된다.

**Target Files**:
- [M] `electron/main.ts` -- watcher 엔트리 확장 + polling runtime 구현

**Technical Notes**:
- 초기 스냅샷 생성 시 ignore 규칙은 기존 watcher/index ignore 규칙을 재사용한다.
- F15에서는 full-tree metadata scan 허용, 부분 polling 최적화는 후속으로 분리한다.

**Dependencies**: T1, T2

---

### Task T4: native 실패 시 polling fallback + 결과 플래그/배너 경로 정리
**Component**: Main Watch Runtime Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
native watcher 초기화 실패 시 polling으로 자동 전환해 변경 감지 가용성을 유지하고, fallback 상태를 renderer에 전달한다.

**Acceptance Criteria**:
- [ ] native watcher 생성 실패 시 polling fallback으로 재시도한다.
- [ ] fallback 성공 시 `ok: true`, `fallbackApplied: true`가 반환된다.
- [ ] renderer에서 fallback 배너 안내를 표시한다.
- [ ] fallback 경로에서도 watchStop/cleanup이 정상 동작한다.

**Target Files**:
- [M] `electron/main.ts` -- native -> polling fallback 로직 + 응답 플래그
- [M] `src/workspace/workspace-context.tsx` -- fallback 배너 메시지 처리

**Technical Notes**:
- hard-fail보다 degraded-success를 우선해 watcher 가용성을 유지한다.

**Dependencies**: T3

---

### Task T5: WorkspaceSession에 preference/mode/remote 상태 추가
**Component**: Workspace State Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
워크스페이스 세션 상태에 watch preference/resolved mode/remote 여부를 추가하고 전환 시 일관되게 노출한다.

**Acceptance Criteria**:
- [ ] `WorkspaceSession`에 `watchModePreference`, `watchMode`, `isRemoteMounted` 필드가 추가된다.
- [ ] watchStart 성공 시 해당 세션에 모드/remote 정보가 기록된다.
- [ ] 워크스페이스 전환 시 active 세션의 mode/preference 정보가 올바르게 노출된다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- 세션 타입/초기값 확장
- [M] `src/workspace/workspace-context.tsx` -- watchStart 결과를 세션 상태로 반영
- [M] `src/workspace/workspace-model.test.ts` -- 상태 전이 테스트 보강

**Technical Notes**:
- preference 기본값은 `auto`로 고정한다.

**Dependencies**: T1

---

### Task T6: preference persistence(저장/복원) 연결
**Component**: Workspace State Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
워크스페이스별 `watchModePreference`를 세션 스냅샷에 저장/복원해 앱 재시작 후에도 사용자 선호를 유지한다.

**Acceptance Criteria**:
- [ ] 세션 스냅샷 스키마에 `watchModePreference`가 포함된다.
- [ ] hydrate 시 preference가 복원되고 watchStart에 전달된다.
- [ ] 스냅샷에 값이 없을 때는 `auto`로 fallback된다.

**Target Files**:
- [M] `src/workspace/workspace-persistence.ts` -- snapshot read/write 스키마 확장
- [M] `src/workspace/workspace-context.tsx` -- hydrate/persist 파이프라인 반영
- [M] `src/workspace/workspace-persistence.test.ts` -- 스키마 호환 테스트 보강

**Technical Notes**:
- 기존 snapshot과 하위호환을 유지한다.

**Dependencies**: T5

---

### Task T7: App에 mode 표시 + override 선택 UI 추가
**Component**: UI Indicator & Control Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
active workspace에 대해 mode/preference/remote 상태를 표시하고, `Auto/Native/Polling` 선택 UI로 preference를 변경할 수 있게 한다.

**Acceptance Criteria**:
- [ ] active workspace가 있으면 `Mode: Native|Polling`이 표시된다.
- [ ] `isRemoteMounted=true`이면 `[REMOTE]` 배지가 표시된다.
- [ ] `Watch Mode` 선택(`Auto|Native|Polling`) 변경 시 해당 workspace preference가 갱신된다.
- [ ] active workspace가 없으면 관련 컨트롤이 disabled 또는 숨김 처리된다.
- [ ] 기존 헤더 액션/파일 패널 레이아웃 동작은 회귀하지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- 모드 표시/선호값 selector 렌더 및 액션 연결
- [M] `src/App.css` -- 모드 라벨/배지/selector 스타일 추가
- [M] `src/workspace/workspace-context.tsx` -- setWatchModePreference 액션 노출

**Technical Notes**:
- `Current Workspace` 블록 내부 보조 정보로 배치해 UI 복잡도를 최소화한다.

**Dependencies**: T5, T6

---

### Task T8: watch mode 판정 유틸 단위 테스트 추가
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
휴리스틱/override 우선순위 판정 규칙을 단위 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] `/Volumes/*` + `auto` -> `polling + remote` 케이스가 포함된다.
- [ ] non-`/Volumes/*` + `auto` -> `native + local` 케이스가 포함된다.
- [ ] `native` override 강제 케이스가 포함된다.
- [ ] `polling` override 강제 케이스가 포함된다.

**Target Files**:
- [C] `electron/workspace-watch-mode.test.ts` -- watch mode 판정 테스트 추가

**Technical Notes**:
- 규칙 변경 시 테스트 실패로 즉시 감지되도록 입력/출력 테이블 기반 케이스를 사용한다.

**Dependencies**: T2

---

### Task T9: App/Workspace 통합 테스트(override 우선순위 + 폴링 이벤트) 보강
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
watchStart의 모드 응답, override 우선순위, watchEvent 반영이 기존 UI/상태 흐름과 함께 동작하는지 통합 테스트를 보강한다.

**Acceptance Criteria**:
- [ ] `watchStart`가 `polling + remote`를 반환하면 mode/remote UI가 렌더된다.
- [ ] preference를 `native/polling`으로 변경하면 watchStart 재호출 또는 재시작 시 override가 적용된다.
- [ ] watchEvent로 들어온 변경 파일이 기존 changed marker 흐름에 반영된다.
- [ ] 기존 native watcher 시나리오 테스트가 회귀하지 않는다.

**Target Files**:
- [M] `src/App.test.tsx` -- 모드 표시/override UI/이벤트 통합 테스트 추가
- [M] `src/workspace/workspace-model.test.ts` -- preference 상태 전이 테스트 보강

**Technical Notes**:
- 기존 mock(`watchStartMock`, `emitWatchEvent`)를 재사용해 테스트 구조 일관성을 유지한다.

**Dependencies**: T3, T5, T6, T7

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 2 | `electron/main.ts` (T2) |
| 2 | 2 | 1 | `electron/main.ts` (T3, T4) |
| 3 | 3 | 2 | `src/workspace/workspace-context.tsx` (T5, T6, T7), `src/App.tsx` (T7) |
| 4 | 2 | 2 | `src/workspace/workspace-model.test.ts` (T9), `src/App.test.tsx` (T9) |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| polling이 대형 리포지토리에서 CPU 부하를 유발 | Medium | interval 기본 1500ms 유지 + ignore 규칙 재사용 + 후속 부분 polling 최적화 분리 |
| 휴리스틱 오판으로 부적절한 자동 모드 선택 | Medium | `/Volumes` 고정 규칙 + 사용자 override 제공 + 판정 테스트 고정 |
| override/persistence 추가로 상태 복잡도 증가 | Medium | `watchModePreference` 단일 필드 + snapshot 하위호환 테스트로 제어 |

## Open Questions

- 현재 없음

## Model Recommendation

- 구현: GPT-5 Codex High
- 검증: GPT-5 Codex Medium (테스트/리그레션 중심)
