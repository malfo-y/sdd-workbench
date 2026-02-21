# Feature Draft: F07.1 Workspace File History Navigation

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

### Feature: F07.1 워크스페이스별 파일 히스토리 네비게이션 (Back/Forward)
**Priority**: High (P0)
**Category**: Core Feature
**Target Component**: WorkspaceSession, WorkspaceProvider, Header Actions, App
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue` (신규 항목 `F07.1` 추가)

**Description**:
F07(파일 watcher + changed indicator)와 별도로, 워크스페이스별 파일 열람 히스토리를 저장하고
`Back`/`Forward`로 파일 이동할 수 있는 탐색 기능을 추가한다.

핵심 동작:
- 워크스페이스마다 독립된 파일 히스토리 스택/포인터 유지
- Back 클릭 시 이전에 열었던 파일로 이동
- Forward 클릭 시 이후 파일로 이동
- Back 이후 다른 파일을 열면 기존 forward 히스토리를 무효화(truncate)

**Acceptance Criteria**:
- [ ] 각 워크스페이스는 파일 히스토리를 독립적으로 유지한다.
- [ ] `Back` 버튼으로 이전 파일로 이동할 수 있다.
- [ ] `Forward` 버튼으로 이후 파일로 이동할 수 있다.
- [ ] `Back` 후 새 파일을 열면 forward 히스토리가 제거된다.
- [ ] 히스토리 이동은 active workspace 안에서만 동작한다.
- [ ] 히스토리가 없거나 이동 불가능한 경우 버튼은 disabled 처리된다.
- [ ] 같은 파일을 연속으로 여는 경우 중복 히스토리 엔트리가 추가되지 않는다.

**Technical Notes**:
- 히스토리 저장 단위는 `relativePath`로 고정한다.
- spec 링크 점프(`openSpecRelativePath`)를 통한 파일 열기도 히스토리에 반영한다.
- 히스토리 네비게이션으로 열린 파일은 새 엔트리를 push하지 않는다(순수 포인터 이동).
- 히스토리 최대 길이는 기본 200으로 제한한다(초과 시 가장 오래된 항목 제거).

**Dependencies**:
- F03.5 멀티 워크스페이스 상태 모델
- F05 spec 링크 파일 열기 오케스트레이션
- F06.2 컨텍스트 복사/UI 정리 완료 상태

## Improvements

### Improvement: F07과 F07.1 범위 분리 명시
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue`, `12.3 Feature-draft 실행 순서`
**Current State**: F07은 watcher/changed indicator 중심이며 히스토리 네비게이션 요구가 추가됨.
**Proposed**: F07은 watcher에 집중하고, 히스토리 네비게이션은 F07.1 독립 feature로 분리한다.
**Reason**: 상태 모델 변경과 IPC watcher 변경을 분리해 구현/검증 리스크를 낮춘다.

### Improvement: Header Actions에 탐색 컨트롤 추가
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `4. 목표 UX/레이아웃`, `6.5 Header/Context Actions`
**Current State**: 상단에는 Workspace 전환/열기/닫기만 있고 파일 히스토리 네비게이션 액션이 없다.
**Proposed**: Header Actions에 `Back`, `Forward` 버튼을 추가하고 active workspace 기준으로 제어한다.
**Reason**: 사용자가 파일 탐색 문맥을 빠르게 왕복할 수 있다.

### Improvement: 상태 모델에 파일 히스토리 필드 추가
**Priority**: High (P0)
**Target Section**: `/_sdd/spec/main.md` > `7. 상태 모델`, `11.3 멀티 워크스페이스 공통 규칙`
**Current State**: `WorkspaceSession`에는 `activeFile`, `selectionRange`는 있으나 history stack/pointer가 없다.
**Proposed**: `WorkspaceSession`에 파일 히스토리 스택/포인터를 추가하고 규칙(분기 시 forward 무효화)을 명시한다.
**Reason**: 구현/테스트 기준을 명시적으로 고정해야 회귀를 방지할 수 있다.

## Bug Reports

해당 없음

## Component Changes

### Update Component: Workspace Model (`src/workspace/workspace-model.ts`)
**Target Section**: `/_sdd/spec/main.md` > `6.1 WorkspaceProvider`, `7. 상태 모델`
**Change Type**: Enhancement

**Changes**:
- `WorkspaceSession`에 파일 히스토리 필드 추가(`fileHistory`, `fileHistoryIndex`)
- 히스토리 push/step(뒤로/앞으로)/분기 truncate 순수 함수 추가 또는 기존 전이 함수 확장
- 워크스페이스 전환/제거 정책과 충돌 없이 동작하도록 보강

### Update Component: WorkspaceProvider (`src/workspace/workspace-context.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.1 WorkspaceProvider`, `11.3 멀티 워크스페이스 공통 규칙`
**Change Type**: Enhancement

**Changes**:
- `selectFile()` 경로에 히스토리 기록 규칙 추가
- `goBackInHistory()`, `goForwardInHistory()`, `canGoBack`, `canGoForward` 노출
- 히스토리 네비게이션 시 읽기/selection 동작을 기존 정책과 정합되게 유지

### Update Component: App Shell (`src/App.tsx`, `src/App.css`)
**Target Section**: `/_sdd/spec/main.md` > `4. 목표 UX/레이아웃`, `6.5 Header/Context Actions`
**Change Type**: Enhancement

**Changes**:
- Header Actions에 `Back`/`Forward` 버튼 추가
- 버튼 disabled 상태를 active workspace/history state와 연동
- 기존 Workspace switcher/Close/Open Workspace 흐름 유지

## Configuration Changes

해당 없음

## Notes

### Resolved Decisions
- [x] 히스토리는 워크스페이스별로 독립 저장한다.
- [x] Back/Forward는 active workspace 범위에서만 동작한다.
- [x] Back 후 다른 파일 열기 시 forward 히스토리는 무효화한다.
- [x] 같은 파일 연속 open은 중복 히스토리로 push하지 않는다.

### Scope Boundary
- F07.1은 파일 히스토리 네비게이션만 다룬다.
- F07 watcher/changed indicator 구현은 별도 feature로 유지한다.
- 키보드 단축키(`Cmd+[`, `Cmd+]`)와 앱 재시작 후 히스토리 영속화는 범위 밖이다.

### Extension Note (2026-02-21)
- F07.1 확장 범위에 입력 바인딩을 추가한다:
  - 마우스 특수 버튼(뒤로/앞으로) 입력
  - macOS 트랙패드 swipe 제스처 입력
- swipe 이벤트가 환경별로 불안정한 경우를 위해 renderer의 수평 `wheel(deltaX)` 기반 fallback을 추가한다.
- 상단 `Back`/`Forward` 버튼과 동일한 히스토리 액션(`goBackInHistory`, `goForwardInHistory`)을 호출해야 한다.
- 히스토리 정책(push/truncate/워크스페이스 분리)은 기존 F07.1 규칙을 그대로 재사용한다.

### Extension Acceptance Criteria (Input Binding)
- [ ] 마우스 특수 버튼 입력으로 히스토리 뒤로/앞으로 이동이 동작한다.
- [ ] macOS swipe 제스처 입력으로 히스토리 뒤로/앞으로 이동이 동작한다.
- [ ] swipe 이벤트가 전달되지 않는 환경에서도 수평 `wheel(deltaX)` 제스처로 뒤로/앞으로 이동이 동작한다.
- [ ] 입력 바인딩은 active workspace 범위에서만 히스토리 이동을 수행한다.
- [ ] 이동 불가능 상태에서는 입력 바인딩이 no-op이며 앱 상태를 깨지 않는다.
- [ ] 기존 헤더 `Back`/`Forward` 버튼 동작과 충돌/중복 누적 없이 공존한다.

### Extension Target Files
- [M] `electron/main.ts` -- `app-command`/`swipe`를 renderer 히스토리 명령 이벤트로 브릿지
- [M] `electron/preload.ts` -- history navigation 이벤트 구독 API 노출
- [M] `electron/electron-env.d.ts` -- history navigation 이벤트 타입/Window 계약 확장
- [M] `src/App.tsx` -- 입력 이벤트(`mouse`/`swipe IPC`/`wheel deltaX fallback`)를 `goBackInHistory`/`goForwardInHistory`에 연결
- [M] `src/App.test.tsx` -- 마우스 버튼/제스처 명령/휠 fallback 기반 통합 테스트 추가

---

# Part 2: Implementation Plan

## Overview

F07.1은 워크스페이스별 파일 열람 히스토리를 추가해 파일 탐색 왕복 비용을 줄이는 기능이다.
구현의 핵심은 상태 모델 확장(스택+포인터), 파일 열기 경로의 히스토리 규칙 통합,
그리고 Header UI의 `Back/Forward` 액션 추가다.

## Scope

### In Scope
- 워크스페이스별 파일 히스토리 스택/포인터 도입
- Back/Forward 상태 계산 및 네비게이션 액션
- Back 이후 신규 파일 open 시 forward 무효화
- Header 액션 버튼(`Back`, `Forward`) 및 disabled 규칙
- 단위/통합 테스트 보강

### Out of Scope
- F07 watcher/changed indicator 구현
- 전역(워크스페이스 통합) 히스토리
- 앱 재시작 후 히스토리 영속화
- 키보드 단축키 및 고급 탐색 UX

## Components

1. **History State Layer**: `WorkspaceSession` 히스토리 스택/포인터 관리
2. **File Activation Orchestration Layer**: `selectFile` + history navigation 동작 통합
3. **Header Navigation UI Layer**: Back/Forward 버튼 및 상태 연동
4. **Validation Layer**: 모델/통합 테스트로 회귀 고정

## Implementation Phases

### Phase 1: History State Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | WorkspaceSession 히스토리 필드/전이 함수 추가 | P0 | - | History State Layer |
| T2 | WorkspaceProvider 파일 열기 경로에 히스토리 규칙 통합 | P0 | T1 | File Activation Orchestration Layer |

### Phase 2: Header Actions Integration
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | App Header에 Back/Forward 버튼 추가 및 disabled 연동 | P0 | T2 | Header Navigation UI Layer |
| T4 | spec 링크/파일 트리 열기 흐름과 히스토리 규칙 정합성 보강 | P1 | T2 | File Activation Orchestration Layer |

### Phase 3: Validation and Regression
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | workspace-model 단위 테스트 추가 | P0 | T1 | Validation Layer |
| T6 | App 통합 테스트(워크스페이스별 back/forward/forward truncate) 추가 | P0 | T2,T3,T4,T5 | Validation Layer |

## Task Details

### Task T1: WorkspaceSession 히스토리 필드/전이 함수 추가
**Component**: History State Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`WorkspaceSession`에 파일 히스토리 스택/포인터를 도입하고,
push/step(뒤로, 앞으로)/분기 truncate 규칙을 순수 함수로 정의한다.

**Acceptance Criteria**:
- [ ] `WorkspaceSession`에 `fileHistory: string[]`, `fileHistoryIndex: number`가 추가된다.
- [ ] 일반 파일 open 시 히스토리에 push되고 index가 최신 위치를 가리킨다.
- [ ] back 상태에서 새 파일 open 시 forward 구간이 truncate된다.
- [ ] 연속 동일 파일 open은 중복 push되지 않는다.
- [ ] 히스토리 길이 상한(200) 정책이 적용된다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- 히스토리 필드/전이 함수/상한 정책 추가
- [M] `src/workspace/workspace-model.test.ts` -- push/back/forward/truncate/중복방지 단위 테스트 추가

**Technical Notes**:
- 순수 함수 레이어에서 정책을 고정하고, Provider는 오케스트레이션만 담당한다.
- index가 유효하지 않은 상태(-1, 범위 밖) 처리 규칙을 명시한다.

**Dependencies**: -

---

### Task T2: WorkspaceProvider 파일 열기 경로에 히스토리 규칙 통합
**Component**: File Activation Orchestration Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`selectFile`과 히스토리 네비게이션 액션(`goBackInHistory`, `goForwardInHistory`)을
동일 읽기 파이프라인으로 통합하고, 히스토리 push 여부를 제어한다.

**Acceptance Criteria**:
- [ ] 일반 `selectFile` 호출은 히스토리에 push된다.
- [ ] `goBackInHistory`/`goForwardInHistory`는 포인터 이동 후 파일을 열되 새 push는 발생하지 않는다.
- [ ] `canGoBack`, `canGoForward` 계산값이 active workspace 기준으로 노출된다.
- [ ] 워크스페이스 전환 시 각 워크스페이스 히스토리가 독립 유지된다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 히스토리 연동 파일 열기 오케스트레이션 + context value 확장
- [M] `src/workspace/use-workspace.ts` -- 확장된 context value 소비 타입 정합성 유지(필요 시)

**Technical Notes**:
- 기존 read request token 방식을 유지해 빠른 back/forward 연속 클릭에서도 stale response를 방지한다.
- selectionRange 초기화/읽기 에러 처리 등 기존 `selectFile` 계약을 유지한다.

**Dependencies**: T1

---

### Task T3: App Header에 Back/Forward 버튼 추가 및 disabled 연동
**Component**: Header Navigation UI Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
App 헤더 액션 영역에 `Back`, `Forward` 버튼을 추가하고,
active workspace/history 상태에 따라 enabled/disabled를 제어한다.

**Acceptance Criteria**:
- [ ] Header에 `Back`, `Forward` 버튼이 표시된다.
- [ ] 이동 불가 시 버튼이 disabled 된다.
- [ ] 버튼 클릭 시 현재 active workspace의 히스토리만 이동한다.
- [ ] 기존 `WorkspaceSwitcher`, `Close Workspace`, `Open Workspace` 흐름이 회귀하지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- 버튼 렌더/핸들러 연결
- [M] `src/App.css` -- 헤더 액션 레이아웃/버튼 스타일 조정

**Technical Notes**:
- 버튼 라벨은 우선 `Back`, `Forward`로 고정한다(후속 i18n 범위 밖).
- 접근성 위해 버튼 `type="button"` 및 명확한 name을 유지한다.

**Dependencies**: T2

---

### Task T4: spec 링크/파일 트리 열기 흐름과 히스토리 규칙 정합성 보강
**Component**: File Activation Orchestration Layer  
**Priority**: P1-High  
**Type**: Refactor

**Description**:
spec 링크 열기(`openSpecRelativePath`)와 파일 트리 클릭이 동일 히스토리 규칙을 따르도록 정리한다.

**Acceptance Criteria**:
- [ ] spec 링크를 통한 파일 열기(`path`, `#Lx`)도 히스토리에 push된다.
- [ ] back/forward 네비게이션 중에는 히스토리 신규 push가 발생하지 않는다.
- [ ] spec 링크 jump(`selectionRange`/scroll) 기존 동작이 회귀하지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- `openSpecRelativePath`와 히스토리 정책 연동 검증
- [M] `src/workspace/workspace-context.tsx` -- 파일 열기 엔트리포인트 정책 일관화

**Technical Notes**:
- 히스토리 엔트리는 파일 단위(`relativePath`)로만 저장하고 line range는 저장하지 않는다.

**Dependencies**: T2

---

### Task T5: workspace-model 단위 테스트 추가
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
히스토리 상태 전이 규칙을 모델 단위 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] push/back/forward/truncate/중복방지 테스트가 추가된다.
- [ ] 워크스페이스별 히스토리 독립성 테스트가 추가된다.
- [ ] 기존 멀티 워크스페이스 정책 테스트가 회귀 없이 통과한다.

**Target Files**:
- [M] `src/workspace/workspace-model.test.ts` -- 히스토리 상태 전이 케이스 추가

**Technical Notes**:
- 경계값(`index = -1`, 빈 히스토리, 상한 초과) 케이스를 포함한다.

**Dependencies**: T1

---

### Task T6: App 통합 테스트(워크스페이스별 back/forward/forward truncate) 추가
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
사용자 시나리오 기준으로 back/forward 동작, forward 무효화, 워크스페이스 독립성을 검증한다.

**Acceptance Criteria**:
- [ ] A->B->C 열기 후 Back/Forward가 기대 파일로 이동한다.
- [ ] Back 후 새 파일 D 열면 Forward가 비활성화된다.
- [ ] 워크스페이스 전환 시 각 워크스페이스 히스토리가 독립적으로 유지된다.
- [ ] 전체 품질 게이트(`npm test`, `npm run lint`, `npm run build`) 통과.

**Target Files**:
- [M] `src/App.test.tsx` -- 히스토리 네비게이션 통합 시나리오 추가

**Technical Notes**:
- 기존 F04/F05/F06.2 회귀 시나리오와 충돌하지 않도록 테스트 이름/의도를 분리한다.

**Dependencies**: T2,T3,T4,T5

## Parallel Execution Summary

- 최대 병렬 후보:
  - Group A: `T1`
  - Group B: `T2`
  - Group C: `T3`, `T4` (부분 병렬 가능, `src/App.tsx` 충돌 주의)
  - Group D: `T5`, `T6` (코드 확정 후 실행)

- 주요 충돌 지점:
  - `src/workspace/workspace-context.tsx`는 `T2`, `T4`가 겹치므로 순차 진행 권장
  - `src/App.tsx`는 `T3`, `T4`가 겹치므로 동일 작업 묶음으로 처리 권장

## Risks

1. back/forward 연속 클릭 시 비동기 read 응답 경합으로 화면 상태가 역전될 수 있음
2. 히스토리 push 규칙(중복/truncate) 누락 시 사용자 기대와 다른 이동이 발생할 수 있음
3. header 액션 추가로 F08/F09 진입점 배치와 버튼 우선순위 충돌 가능성

## Open Questions

- 없음 (요구사항 핵심 정책 확정)

## Recommended Next Step

1. `spec-update-todo`로 Part 1을 `/_sdd/spec/main.md`에 반영해 F07.1 항목을 큐에 추가
2. F07(watcher)와 병렬로 섞지 않고, `implementation-plan` 또는 `implementation`으로 F07.1을 독립 실행
