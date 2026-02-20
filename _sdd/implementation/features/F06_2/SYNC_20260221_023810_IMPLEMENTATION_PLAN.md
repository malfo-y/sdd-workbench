# IMPLEMENTATION_PLAN (F06.2)

## 1. Overview

F06.2의 목표는 복사 UX를 우클릭 컨텍스트 중심으로 통합하고,
코드 선택 UX를 `Shift+Click` + 드래그 기반으로 확장하는 것이다.

핵심 전제:
- F06의 payload 포맷(`relative/path:Lx-Ly + 본문`)은 유지한다.
- F06.1의 우클릭 selection 정책(범위 안 유지/범위 밖 단일 선택)은 유지한다.
- F03.5 active workspace 정책과 F04/F05 링크/점프 동작은 회귀 없이 유지해야 한다.

기준 문서:
- `/_sdd/spec/main.md` 섹션 `12.2 (F06.2)`, `13.1`, `11.3`
- `/_sdd/drafts/feature_draft_f06_2_drag_selection_and_copy_ux_consolidation.md`

## 2. Scope (In/Out)

### In Scope
- CodeViewer 드래그 기반 연속 라인 선택 추가
- CodeViewer 우클릭 액션 `Copy Both` 추가
- `Copy Both` -> `buildCopySelectedLinesPayload` 연결
- 상단 툴바 복사 2버튼 제거 + `ContextToolbar` 컴포넌트 제거
- FileTree 디렉터리 우클릭 `Copy Relative Path` 추가
- 단위/통합 테스트 갱신 및 회귀 검증

### Out of Scope
- F08/F09 기능 구현
- 절대경로 복사 옵션
- 비연속 다중 선택
- watcher/changed indicator(F07)

## 3. Components

1. **Selection Interaction Layer**
- drag 기반 라인 범위 선택

2. **Copy Action Layer**
- CodeViewer 우클릭 3액션(`Copy Selected Content`, `Copy Both`, `Copy Relative Path`)
- App clipboard orchestration 재사용

3. **Toolbar Simplification Layer**
- 복사 2버튼 제거 및 `ContextToolbar` 컴포넌트/테스트 삭제

4. **FileTree Context Layer**
- 디렉터리 우클릭 경로 복사

5. **Validation Layer**
- 단위/컴포넌트/통합 테스트 회귀 고정

## 4. Implementation Phases

### Phase 1: Selection and Copy Action Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | CodeViewer drag selection 상태/이벤트 추가 | P0 | - | Selection Interaction Layer |
| T2 | CodeViewer 우클릭 `Copy Both` 액션 추가 | P0 | T1 | Copy Action Layer |

### Phase 2: App/Toolbar Consolidation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | App 복사 콜백 재배선 (`Copy Both` 우클릭 경로) | P0 | T2 | Copy Action Layer |
| T4 | ContextToolbar 복사 2버튼 제거 및 헤더 정리 | P0 | T3 | Toolbar Simplification Layer |

### Phase 3: FileTree Expansion + Validation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | FileTree 디렉터리 우클릭 `Copy Relative Path` 지원 | P0 | - | FileTree Context Layer |
| T6 | 테스트 보강 및 회귀 검증 | P0 | T1,T2,T3,T4,T5 | Validation Layer |

## 5. Task Details

### Task T1: CodeViewer drag selection 상태/이벤트 추가
**Component**: Selection Interaction Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
코드 라인에서 마우스 드래그로 연속 범위를 선택할 수 있도록 이벤트 모델을 확장한다.

**Acceptance Criteria**:
- [ ] `mousedown` + 라인 이동 시 연속 범위 selection이 갱신된다.
- [ ] `mouseup` 이후 클릭 이벤트와 충돌 없이 selection이 유지된다.
- [ ] 기존 `Shift+Click` 선택이 회귀하지 않는다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx`
- [M] `src/code-viewer/code-viewer-panel.test.tsx`

**Technical Notes**:
- selection 범위 계산은 기존 `normalizeLineSelectionRange()`를 재사용한다.
- drag 후 click 중복 호출은 suppression 가드로 방지한다.

**Dependencies**: -

---

### Task T2: CodeViewer 우클릭 `Copy Both` 액션 추가
**Component**: Copy Action Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
CodeViewer 우클릭 메뉴에 `Copy Both` 액션을 추가해 경로+본문 payload 복사를 트리거한다.

**Acceptance Criteria**:
- [ ] 우클릭 메뉴에 `Copy Both`가 노출된다.
- [ ] 기존 `Copy Selected Content`, `Copy Relative Path`는 회귀하지 않는다.
- [ ] 우클릭 selection 유지/전환 정책(F06.1)이 유지된다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx`
- [M] `src/code-viewer/code-viewer-panel.test.tsx`

**Technical Notes**:
- 액션 라벨은 `Copy Both`로 고정한다.

**Dependencies**: T1

---

### Task T3: App 복사 콜백 재배선 (`Copy Both` 우클릭 경로)
**Component**: Copy Action Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
App에서 `Copy Both` 요청을 받아 기존 `buildCopySelectedLinesPayload` + `writeToClipboard`로 복사한다.

**Acceptance Criteria**:
- [ ] `Copy Both`가 F06 payload 포맷으로 복사된다.
- [ ] 클립보드 실패 시 기존 텍스트 배너가 표시된다.

**Target Files**:
- [M] `src/App.tsx`
- [M] `src/App.test.tsx`
- [M] `src/context-copy/copy-payload.ts` (필요 시)

**Technical Notes**:
- 포맷 변경 없이 재사용한다.

**Dependencies**: T2

---

### Task T4: ContextToolbar 복사 2버튼 제거 및 헤더 정리
**Component**: Toolbar Simplification Layer  
**Priority**: P0  
**Type**: Refactor

**Description**:
복사 UX 통합 정책에 맞춰 toolbar 복사 2버튼과 연관 컴포넌트를 제거한다.

**Acceptance Criteria**:
- [ ] 상단에서 `Copy Active File Path`, `Copy Selected Lines` 버튼이 제거된다.
- [ ] `ContextToolbar` 컴포넌트/테스트 파일이 제거된다.
- [ ] 워크스페이스 열기/전환/닫기 동작은 유지된다.

**Target Files**:
- [M] `src/App.tsx`
- [M] `src/App.css`
- [D] `src/toolbar/context-toolbar.tsx`
- [D] `src/toolbar/context-toolbar.test.tsx`
- [M] `src/App.test.tsx`

**Technical Notes**:
- F08/F09는 별도 진입점으로 후속 구현한다.

**Dependencies**: T3

---

### Task T5: FileTree 디렉터리 우클릭 `Copy Relative Path` 지원
**Component**: FileTree Context Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
디렉터리 버튼에도 우클릭 메뉴를 연결해 경로 복사를 지원한다.

**Acceptance Criteria**:
- [ ] 파일/디렉터리 모두 우클릭 시 `Copy Relative Path`가 동작한다.
- [ ] 디렉터리 좌클릭 토글 동작은 회귀하지 않는다.

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx`
- [M] `src/file-tree/file-tree-panel.test.tsx`
- [M] `src/App.test.tsx`

**Technical Notes**:
- 우클릭은 active file 변경을 유발하지 않는다.

**Dependencies**: -

---

### Task T6: 테스트 보강 및 회귀 검증
**Component**: Validation Layer  
**Priority**: P0  
**Type**: Test

**Description**:
F06.2 요구사항(드래그, Copy Both, 디렉터리 복사, 툴바 제거)을 자동 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] CodeViewer drag selection + 우클릭 3액션 테스트가 통과한다.
- [ ] FileTree 파일/디렉터리 우클릭 테스트가 통과한다.
- [ ] App 통합 테스트에서 툴바 미노출 + 컨텍스트 복사가 검증된다.
- [ ] `npm test`, `npm run lint`, `npm run build`가 통과한다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.test.tsx`
- [M] `src/file-tree/file-tree-panel.test.tsx`
- [M] `src/App.test.tsx`
- [M] `src/context-copy/copy-payload.test.ts` (필요 시)

**Technical Notes**:
- 기존 F04/F05/F06/F06.1 회귀 시나리오와 충돌하지 않도록 테스트 이름/의도를 분리한다.

**Dependencies**: T1,T2,T3,T4,T5

## 6. Parallel Execution Summary

- Group A: `T1`, `T5` (파일 충돌 없음)
- Group B: `T2 -> T3` (CodeViewer API 후 App wiring)
- Group C: `T4` (App/header/삭제 작업)
- Group D: `T6` (최종 검증)

## 7. Risks & Mitigations

1. **Risk**: drag selection과 click/context menu 이벤트 충돌  
**Mitigation**: drag 종료 후 click suppression 가드 추가 + 테스트 고정

2. **Risk**: toolbar 제거로 기존 테스트/상태 가정 붕괴  
**Mitigation**: App 통합 테스트를 컨텍스트 메뉴 기반으로 재작성

3. **Risk**: 디렉터리 우클릭과 토글 동작 간섭  
**Mitigation**: `onClick`(toggle)과 `onContextMenu`(copy) 경로를 분리 검증

## 8. Open Questions

- 없음 (결정 확정)
  - 우클릭 액션 라벨: `Copy Both`
  - `ContextToolbar` 완전 제거
  - F08/F09는 toolbar 비의존 진입점으로 진행
