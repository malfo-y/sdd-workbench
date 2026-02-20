# IMPLEMENTATION_PLAN (F05)

## 1. Overview

F05의 목표는 rendered markdown 링크에서 `#Lx`, `#Lx-Ly`를 해석해 활성 워크스페이스 기준으로 파일을 열고(code), 지정 라인 범위를 하이라이트하며(jump+highlight), 사용자가 즉시 해당 위치를 볼 수 있게 하는 것이다.

핵심 전제:
- F04/F04.1이 이미 구현되어 있음 (`SpecViewerPanel` 링크 인터셉트 + same-workspace 파일 열기 + copy popover)
- F05는 기존 인터셉트 경로 위에 line jump만 확장한다.
- cross-workspace fallback은 도입하지 않는다.

기준 스펙:
- `/_sdd/spec/main.md` 섹션 `8`, `11.3`, `12.2(F05)`, `13.1`

## 2. Scope (In/Out)

### In Scope
- `path#Lx`, `path#Lx-Ly` 링크 파싱 및 라인 범위 정규화
- same-workspace 링크 클릭 시 파일 열기 + 선택 범위(`selectionRange`) 적용
- 링크 기반 jump 시 code viewer 자동 스크롤(best-effort)
- 멀티 워크스페이스(active workspace 고정) 회귀 검증
- 단위/컴포넌트/통합 테스트 보강

### Out of Scope
- pure hash(`'#id'`)를 code line jump로 해석하는 동작
- cross-workspace 자동 탐색/자동 전환
- external 링크 자동 브라우저 오픈
- TOC active tracking 고도화(F09)
- markdown sanitize 하드닝(F10)

## 3. Components

1. **Spec Link Parser Layer**
- 라인 해시 파싱(`Lx`, `Lx-Ly`) + 링크 분류 결과 확장

2. **SpecViewer Interaction Layer**
- 링크 클릭 시 `relativePath + lineRange`를 상위(App)로 전달

3. **App Orchestration Layer**
- 파일 열기(`selectFile`)와 라인 선택(`setSelectionRange`)을 단일 링크 액션으로 조합
- jump 스크롤 트리거 상태를 code viewer로 전달

4. **Code Viewer Jump Layer**
- jump 요청 수신 시 대상 라인으로 스크롤
- 기존 선택 하이라이트(`is-selected`) 재사용

5. **Validation Layer**
- parser 단위 테스트 + panel/app 통합 테스트 + code viewer jump 테스트

## 4. Implementation Phases

### Phase 1: Parser Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | 링크 라인 해시 파싱 확장 (`#Lx`, `#Lx-Ly`) | P0 | - | Spec Link Parser Layer |
| T2 | parser 단위 테스트 보강 | P0 | T1 | Validation Layer |

### Phase 2: Interaction Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | SpecViewerPanel 콜백 계약 확장(lineRange 전달) | P0 | T1 | SpecViewer Interaction Layer |
| T4 | App 링크 액션 오케스트레이션(file open + range + jump request) | P0 | T3 | App Orchestration Layer |
| T5 | CodeViewer jump 스크롤 동작 추가 | P1 | T4 | Code Viewer Jump Layer |

### Phase 3: Validation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T6 | SpecViewerPanel 링크-라인 상호작용 테스트 | P0 | T3 | Validation Layer |
| T7 | CodeViewer jump 동작 테스트 | P1 | T5 | Validation Layer |
| T8 | App 통합 테스트(F05 + 멀티 워크스페이스 회귀) | P0 | T4, T5, T6 | Validation Layer |

## 5. Task Details

### Task T1: 링크 라인 해시 파싱 확장 (`#Lx`, `#Lx-Ly`)
**Component**: Spec Link Parser Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
`resolveSpecLink()`가 기존 `anchor/workspace-file/external/unresolved` 분류를 유지하면서, workspace-file 링크의 해시가 `#Lx` 또는 `#Lx-Ly` 형식일 때 라인 범위 정보를 함께 반환하도록 확장한다.

**Acceptance Criteria**:
- [ ] `./foo.ts#L10` 파싱 시 `lineRange = { startLine: 10, endLine: 10 }`가 반환된다.
- [ ] `./foo.ts#L10-L20` 파싱 시 `lineRange = { startLine: 10, endLine: 20 }`가 반환된다.
- [ ] `./foo.ts#L20-L10`은 정규화되어 `startLine <= endLine`을 보장한다.
- [ ] `#heading`(pure anchor)은 기존 anchor 분기로 유지된다.
- [ ] invalid line hash는 workspace-file(파일 열기만) 또는 unresolved 중 하나의 고정 정책으로 일관 처리된다.

**Target Files**:
- [M] `src/spec-viewer/spec-link-utils.ts` -- 라인 해시 파싱/정규화 추가
- [M] `src/spec-viewer/spec-link-utils.test.ts` -- `#Lx`, `#Lx-Ly`, invalid hash 테스트 추가

**Technical Notes**:
- 기존 경로 정규화/escape 차단 로직을 깨지 않도록 hash 파싱을 경로 해석 이후 분기한다.
- 범위 정규화는 `start <= end`, `line >= 1` 규칙을 강제한다.

**Dependencies**: -

---

### Task T2: parser 단위 테스트 보강
**Component**: Validation Layer  
**Priority**: P0  
**Type**: Test

**Description**:
F05 파싱 규칙을 회귀 방지용 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] line hash 지원 케이스(`Lx`, `Lx-Ly`) 테스트가 추가된다.
- [ ] 기존 external/escape/missing_active_spec 테스트가 회귀 없이 유지된다.
- [ ] pure anchor(`#id`) 동작이 유지된다.

**Target Files**:
- [M] `src/spec-viewer/spec-link-utils.test.ts` -- parser 규칙 테스트 확장

**Technical Notes**:
- 기존 F04.1 테스트와 충돌하지 않도록 `resolveSpecLink` 결과 shape를 명시적으로 검증한다.

**Dependencies**: T1

---

### Task T3: SpecViewerPanel 콜백 계약 확장(lineRange 전달)
**Component**: SpecViewer Interaction Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
`SpecViewerPanel`의 `onOpenRelativePath` 콜백 계약을 확장해 `relativePath`와 `lineRange`를 함께 전달한다. 링크 타입이 workspace-file이면 상위에 lineRange를 전달하고, external/unresolved는 기존 popover 동작을 유지한다.

**Acceptance Criteria**:
- [ ] workspace-file + line hash 링크 클릭 시 `onOpenRelativePath(path, lineRange)`가 호출된다.
- [ ] workspace-file + non-line hash 링크는 `lineRange = null`로 호출된다.
- [ ] pure anchor(`#id`)는 기존처럼 기본 동작을 유지한다.
- [ ] external/unresolved 링크는 여전히 popover 경로로 처리된다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- 콜백 타입/호출부 확장
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- line hash 링크 클릭 시 콜백 인자 검증 추가

**Technical Notes**:
- `preventDefault` 정책은 기존 F04.1과 동일하게 유지한다.
- popover/clipboard UX는 변경하지 않는다.

**Dependencies**: T1

---

### Task T4: App 링크 액션 오케스트레이션(file open + range + jump request)
**Component**: App Orchestration Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
App의 `openSpecRelativePath` 경로를 확장해 same-workspace 파일 검증 후 `selectFile()`와 `setSelectionRange()`를 조합 실행한다. lineRange가 있을 경우 code viewer로 전달할 jump request 상태를 생성한다.

**Acceptance Criteria**:
- [ ] 링크 클릭으로 파일이 열릴 때 lineRange가 있으면 `selectionRange`가 반영된다.
- [ ] lineRange가 없으면 기존 동작(파일 열기만)과 동일하다.
- [ ] 파일이 active workspace에 없으면 기존처럼 `false`를 반환한다.
- [ ] 멀티 워크스페이스 전환 후에도 active workspace 기준 동작이 유지된다.

**Target Files**:
- [M] `src/App.tsx` -- 콜백 계약 확장 + jump request 상태 관리 + CodeViewer prop wiring

**Technical Notes**:
- `selectFile()` 호출 직후 `setSelectionRange()`를 적용해 읽기 완료 후에도 범위가 유지되도록 한다.
- jump trigger는 재진입 가능하도록 토큰 기반(또는 증가 카운터) 구조를 권장한다.

**Dependencies**: T3

---

### Task T5: CodeViewer jump 스크롤 동작 추가
**Component**: Code Viewer Jump Layer  
**Priority**: P1  
**Type**: Feature

**Description**:
CodeViewerPanel이 App에서 전달된 jump request를 수신하면 대상 라인 요소로 스크롤한다. 기존 선택 하이라이트 클래스(`is-selected`)를 그대로 활용한다.

**Acceptance Criteria**:
- [ ] jump request 수신 시 대상 라인이 뷰포트에 노출되도록 스크롤된다.
- [ ] 선택 하이라이트는 기존 `selectionRange` 기반으로 유지된다.
- [ ] 일반 클릭 선택 동작(F03)은 회귀하지 않는다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx` -- jump request prop/scroll effect 추가
- [M] `src/App.css` -- 필요 시 jump 가독성 보강 스타일(선택적)

**Technical Notes**:
- DOM 접근은 `ref` 기반으로 제한하고, content 미로딩 상태에서는 no-op 처리한다.
- 스크롤 API는 `scrollIntoView({ block: 'center' })` best-effort 적용.

**Dependencies**: T4

---

### Task T6: SpecViewerPanel 링크-라인 상호작용 테스트
**Component**: Validation Layer  
**Priority**: P0  
**Type**: Test

**Description**:
SpecViewerPanel 테스트에 line hash 시나리오를 추가해 parser 결과가 UI 이벤트로 올바르게 전달되는지 고정한다.

**Acceptance Criteria**:
- [ ] `./foo.ts#L10` 클릭 시 `onOpenRelativePath('foo.ts 경로', {10,10})` 호출 검증
- [ ] `./foo.ts#L10-L20` 클릭 시 `{10,20}` 호출 검증
- [ ] external/unresolved popover 테스트가 기존대로 통과

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- line hash 클릭 테스트 추가

**Technical Notes**:
- 현재 테스트의 `cleanup`/`renderPanel` 헬퍼 패턴을 재사용한다.

**Dependencies**: T3

---

### Task T7: CodeViewer jump 동작 테스트
**Component**: Validation Layer  
**Priority**: P1  
**Type**: Test

**Description**:
CodeViewerPanel 단위 테스트에 jump request 스크롤 검증을 추가한다.

**Acceptance Criteria**:
- [ ] jump request prop이 바뀌면 대상 라인의 `scrollIntoView`가 호출된다.
- [ ] selection 하이라이트 표시와 jump 동작이 동시에 유지된다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- scroll/jump 테스트 추가

**Technical Notes**:
- JSDOM 환경에서 `HTMLElement.prototype.scrollIntoView` mock을 사용한다.

**Dependencies**: T5

---

### Task T8: App 통합 테스트(F05 + 멀티 워크스페이스 회귀)
**Component**: Validation Layer  
**Priority**: P0  
**Type**: Test

**Description**:
실제 통합 시나리오에서 spec 링크 클릭으로 파일 열기 + 라인 범위 선택이 적용되는지 검증하고, active workspace 경계 규칙 회귀를 고정한다.

**Acceptance Criteria**:
- [ ] rendered spec 링크(`./foo.ts#L10-L20`) 클릭 시 active file이 열리고 `Selection: L10-L20`이 표시된다.
- [ ] line hash 없이 링크 클릭 시 파일은 열리지만 selection은 기본 상태를 유지한다.
- [ ] 외부 링크 클릭 시 popover 표시 경로가 유지된다.
- [ ] 멀티 워크스페이스 전환 후 링크 클릭 시 active workspace 기준으로만 동작한다.

**Target Files**:
- [M] `src/App.test.tsx` -- F05 통합 시나리오 추가/회귀 검증

**Technical Notes**:
- 기존 `window.workspace` mock + 디렉터리 확장 UX 패턴을 그대로 재사용한다.

**Dependencies**: T4, T5, T6

## 6. Parallel Execution Summary

### 병렬 배치 제안
1. **Batch A (순차)**: `T1 -> T2`
2. **Batch B (순차)**: `T3 -> T4`
3. **Batch C (조건부 병렬)**: `T5` 와 `T6`
- 조건: `T3/T4`의 콜백/prop 계약이 고정된 뒤 시작
4. **Batch D (순차)**: `T7 -> T8`

### 파일 충돌 기준
- `src/spec-viewer/spec-link-utils.ts`: `T1` 단독 수정, 이후 테스트(`T2`)만 접근
- `src/spec-viewer/spec-viewer-panel.tsx` + `src/spec-viewer/spec-viewer-panel.test.tsx`: `T3`, `T6` 충돌 가능(순차 권장)
- `src/App.tsx` + `src/App.test.tsx`: `T4`, `T8` 충돌 가능(순차 필수)
- `src/code-viewer/code-viewer-panel.tsx` + `src/code-viewer/code-viewer-panel.test.tsx`: `T5`, `T7` 충돌(순차 필수)

### 의미적 충돌(비파일)
- `onOpenRelativePath` 함수 시그니처 변경은 `SpecViewerPanel <-> App` 양쪽 동기화가 필요하다.
- jump request 데이터 계약은 `App <-> CodeViewerPanel` 양쪽 동기화가 필요하다.

### 예상 크리티컬 패스
`T1 -> T3 -> T4 -> T5 -> T8`

## 7. Risks & Mitigations

1. **Risk**: line hash 파싱 규칙이 느슨하면 잘못된 점프가 발생
- **Mitigation**: parser를 정규식 + 숫자 범위 검증으로 제한하고 단위 테스트로 고정

2. **Risk**: `selectFile`/`setSelectionRange` 순서 경쟁으로 selection 누락
- **Mitigation**: App에서 링크 액션 순서를 고정하고 통합 테스트에서 `Selection: Lx-Ly`를 검증

3. **Risk**: jump 스크롤이 수동 선택 동작을 방해
- **Mitigation**: jump 전용 request prop을 분리해 수동 클릭 선택과 이벤트 소스를 구분

4. **Risk**: 멀티 워크스페이스 전환 후 잘못된 세션에 selection 적용
- **Mitigation**: active workspace 기준 처리 + 통합 테스트에 A/B 전환 시나리오 추가

5. **Risk**: 외부 링크 처리 회귀(브라우저 이동 재발)
- **Mitigation**: 기존 external/unresolved popover 테스트를 유지하고 회귀 검증

## 8. Open Questions

1. **라인 번호가 파일 길이를 초과하는 경우 정책**
- 제안: 파일 열기는 유지하고, 스크롤은 가능한 마지막 라인으로 best-effort 처리
- 상태: 구현 전 확정 필요(비차단)

2. **`path.md#heading` 같은 non-line hash 파일 링크 처리**
- 제안: F05에서는 파일 열기만 유지(heading 이동은 F09 범위)
- 상태: 구현 전 확정 필요(비차단)
