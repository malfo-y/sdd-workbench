# IMPLEMENTATION_PLAN (F06)

## 1. Overview

F06의 목표는 상단 컨텍스트 툴바에서 `Copy Active File Path`와 `Copy Selected Lines`를 구현해, 현재 활성 워크스페이스 기준 컨텍스트를 즉시 클립보드로 복사할 수 있게 하는 것이다.

핵심 전제:
- F03/F03.1의 코드 뷰어 라인 선택 상태(`selectionRange`)는 이미 구현되어 있음
- F03.5의 active workspace 정책을 그대로 따른다
- F04/F04.1/F05 동작(우측 spec 유지, 링크 점프)은 회귀 없이 유지한다

기준 스펙:
- `/_sdd/spec/main.md` 섹션 `12.2(F06)`, `13.1`
- `/_sdd/spec/user-spec.md` 섹션 `4.6.3`, `4.6.4`, `E2`

## 2. Scope (In/Out)

### In Scope
- 상단 툴바에 `Copy Active File Path`, `Copy Selected Lines` 액션 추가
- `Copy Active File Path`: 활성 파일 상대경로 복사
- `Copy Selected Lines`: `relative/path:Lx-Ly` + 선택 본문 포맷 복사
- 활성 워크스페이스/활성 파일/선택 범위 가드(disabled + 런타임 방어)
- 클립보드 실패 시 텍스트 배너 피드백
- 단위/통합 테스트 추가 및 기존 핵심 흐름 회귀 검증

### Out of Scope
- `Open Workspace in iTerm` (F08)
- `Copy Current Spec Section` (F09)
- 우클릭 컨텍스트 메뉴 복사 (F06.1)
- 토스트 배너 전환

## 3. Components

1. **Toolbar UI Layer**
- F06 범위 버튼 2개를 포함한 상단 액션 UI 구성
- disabled 상태/접근성 속성 정의

2. **Copy Payload Utility Layer**
- 상대경로 복사 문자열 생성
- 선택 라인 범위 기반 복사 포맷 생성(`header + selected content`)

3. **Clipboard Orchestration Layer (App)**
- 툴바 액션 -> payload 유틸 -> `navigator.clipboard.writeText` 실행
- 실패 시 `showBanner`로 오류 피드백

4. **Validation Layer**
- payload 유틸 단위 테스트
- 툴바 컴포넌트 테스트
- App 통합 테스트(멀티 워크스페이스 포함)

## 4. Implementation Phases

### Phase 1: UI/Utility Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | 툴바 컴포넌트 도입 및 헤더 연결 | P0 | - | Toolbar UI Layer |
| T2 | 복사 payload 유틸 구현 | P0 | - | Copy Payload Utility Layer |
| T3 | 툴바 컴포넌트 테스트 추가 | P1 | T1 | Validation Layer |

### Phase 2: App Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T4 | App 클립보드 오케스트레이션 + 가드/피드백 연결 | P0 | T1, T2 | Clipboard Orchestration Layer |

### Phase 3: End-to-End Validation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | App 통합 테스트(F06 포맷/가드/멀티 워크스페이스) | P0 | T4 | Validation Layer |

## 5. Task Details

### Task T1: 툴바 컴포넌트 도입 및 헤더 연결
**Component**: Toolbar UI Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
기존 헤더 액션 영역에 F06 범위 버튼(`Copy Active File Path`, `Copy Selected Lines`)을 배치하기 위한 툴바 컴포넌트를 도입하고, App에서 현재 상태를 기반으로 disabled 조건을 계산해 전달한다.

**Acceptance Criteria**:
- [ ] 상단 액션 영역에 `Copy Active File Path`, `Copy Selected Lines` 버튼이 표시된다.
- [ ] 활성 워크스페이스가 없으면 두 버튼 모두 disabled 된다.
- [ ] 활성 파일이 없으면 `Copy Active File Path`가 disabled 된다.
- [ ] 선택 범위가 없으면 `Copy Selected Lines`가 disabled 된다.

**Target Files**:
- [C] `src/toolbar/context-toolbar.tsx` -- F06 버튼 UI 컴포넌트 신규
- [M] `src/App.tsx` -- Toolbar 컴포넌트 렌더 + 상태 기반 disabled 계산
- [M] `src/App.css` -- 툴바 레이아웃/버튼 스타일 보강

**Technical Notes**:
- 기존 `WorkspaceSwitcher`/`Open Workspace` 배치는 유지하고, F06 버튼만 추가한다.
- F08/F09 버튼은 본 Task 범위에서 구현하지 않는다.

**Dependencies**: -

---

### Task T2: 복사 payload 유틸 구현
**Component**: Copy Payload Utility Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
상대경로 복사 문자열과 선택 라인 복사 문자열을 생성하는 순수 유틸 함수를 구현한다.

**Acceptance Criteria**:
- [ ] 경로 복사 payload는 활성 파일 상대경로 문자열 그대로 반환된다.
- [ ] 선택 라인 payload는 첫 줄 `relative/path:Lx-Ly` 형식을 따른다.
- [ ] 선택 본문은 실제 선택 범위 라인을 줄바꿈 포함 그대로 유지한다.
- [ ] 선택 범위가 파일 길이를 벗어나면 안전하게 clamp 처리된다.

**Target Files**:
- [C] `src/context-copy/copy-payload.ts` -- payload 생성 유틸 신규
- [C] `src/context-copy/copy-payload.test.ts` -- 포맷/경계/정규화 테스트

**Technical Notes**:
- 줄 분리 규칙은 코드 뷰어와 일관되도록 `split('\n')` 기준을 고정한다.
- F06.1에서 재사용할 수 있도록 UI 의존성 없는 pure function으로 유지한다.

**Dependencies**: -

---

### Task T3: 툴바 컴포넌트 테스트 추가
**Component**: Validation Layer  
**Priority**: P1  
**Type**: Test

**Description**:
툴바 컴포넌트의 렌더/disabled/클릭 콜백 계약을 단위 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] 버튼 라벨/순서가 요구사항과 일치한다.
- [ ] disabled props에 따라 버튼 활성 상태가 기대대로 바뀐다.
- [ ] 클릭 시 전달된 콜백이 호출된다.

**Target Files**:
- [C] `src/toolbar/context-toolbar.test.tsx` -- Toolbar 단위 테스트 신규
- [M] `src/toolbar/context-toolbar.tsx` -- 테스트 가능 props/접근성 속성 보완

**Technical Notes**:
- `data-testid`는 최소 범위로만 추가해 통합 테스트 의존도를 낮춘다.

**Dependencies**: T1

---

### Task T4: App 클립보드 오케스트레이션 + 가드/피드백 연결
**Component**: Clipboard Orchestration Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
App에서 툴바 버튼 클릭 시 payload 유틸로 문자열을 구성하고 클립보드 복사를 수행한다. 실패 시 텍스트 배너를 통해 오류를 노출한다.

**Acceptance Criteria**:
- [ ] `Copy Active File Path` 클릭 시 활성 파일 상대경로가 복사된다.
- [ ] `Copy Selected Lines` 클릭 시 `relative/path:Lx-Ly` + 선택 본문이 복사된다.
- [ ] 클립보드 API 미지원/실패 시 배너 오류 메시지가 표시된다.
- [ ] 워크스페이스 전환 후 복사 결과가 현재 active workspace 기준으로 바뀐다.

**Target Files**:
- [M] `src/App.tsx` -- 복사 핸들러, 가드, 배너 피드백, Toolbar callback wiring
- [M] `src/context-copy/copy-payload.ts` -- App 사용 시그니처 보강(필요 시)

**Technical Notes**:
- 성공 시 배너는 띄우지 않고 무음 처리(오류만 표시)로 UX 노이즈를 줄인다.
- 런타임 가드는 disabled와 별도로 유지해 예외 호출도 방어한다.

**Dependencies**: T1, T2

---

### Task T5: App 통합 테스트(F06 포맷/가드/멀티 워크스페이스)
**Component**: Validation Layer  
**Priority**: P0  
**Type**: Test

**Description**:
실제 사용자 흐름 기준으로 F06 복사 동작과 회귀 위험(멀티 워크스페이스, 기존 코드/스펙 탐색 흐름)을 통합 테스트로 검증한다.

**Acceptance Criteria**:
- [ ] 활성 파일이 있을 때 `Copy Active File Path`가 상대경로를 복사한다.
- [ ] 선택 범위가 있을 때 `Copy Selected Lines`가 고정 포맷(E2)을 만족한다.
- [ ] 선택 범위가 없으면 `Copy Selected Lines`는 disabled 상태다.
- [ ] 활성 워크스페이스 전환 후 복사 결과가 현재 워크스페이스 기준으로 갱신된다.
- [ ] 기존 F04/F05 흐름(스펙 렌더/링크 점프)이 회귀하지 않는다.

**Target Files**:
- [M] `src/App.test.tsx` -- F06 통합 시나리오 추가

**Technical Notes**:
- `navigator.clipboard.writeText` mock을 테스트별로 분리해 성공/실패 케이스를 고정한다.
- 기존 `window.workspace` mock 패턴을 그대로 재사용한다.

**Dependencies**: T4

## 6. Parallel Execution Summary

### 병렬 배치 제안
1. **Batch A (병렬 가능)**: `T1`, `T2`
2. **Batch B (순차)**: `T3` (T1 이후)
3. **Batch C (순차)**: `T4` (T1, T2 이후)
4. **Batch D (순차)**: `T5` (T4 이후)

### 파일 충돌 기준
- `src/App.tsx`: `T1`, `T4` 충돌(순차 필수)
- `src/context-copy/copy-payload.ts`: `T2`, `T4` 충돌 가능(순차 권장)
- `src/App.test.tsx`: `T5` 단독 수정(병렬 안전)
- `src/toolbar/context-toolbar.tsx`: `T1`, `T3` 충돌(순차 필수)

### 의미적 충돌(비파일)
- 툴바 disabled 규칙과 런타임 가드 규칙이 불일치하면 UX 혼선이 생긴다.
- 복사 포맷(E2) 변경은 F06.1/F09 후속 기능의 payload 재사용성에 영향을 준다.

### 예상 크리티컬 패스
`T1 -> T4 -> T5`

## 7. Risks & Mitigations

1. **Risk**: 클립보드 API 미지원/권한 이슈로 복사가 실패할 수 있음  
**Mitigation**: 실패 분기를 명시적으로 처리하고 텍스트 배너 오류를 표준화

2. **Risk**: 선택 라인 포맷이 요구사항(E2)과 미세하게 어긋날 수 있음  
**Mitigation**: payload 유틸 단위 테스트에서 문자열 포맷을 고정 검증

3. **Risk**: 멀티 워크스페이스 전환 후 이전 세션 경로가 복사될 수 있음  
**Mitigation**: 통합 테스트에서 A/B 전환 후 복사 결과를 직접 검증

4. **Risk**: 헤더 액션 추가로 기존 반응형 레이아웃이 깨질 수 있음  
**Mitigation**: `App.css` 모바일 브레이크포인트 회귀 점검 + 최소 스타일 추가

## 8. Open Questions

- 현재 없음 (다음 가정으로 고정)
  - 성공 복사는 무음 처리, 실패만 배너로 노출
  - 선택 범위가 없으면 `Copy Selected Lines`는 disabled
