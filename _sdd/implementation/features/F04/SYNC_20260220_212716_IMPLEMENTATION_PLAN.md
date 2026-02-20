# IMPLEMENTATION_PLAN (F04)

## 1. Overview

F04의 목표는 `.md` 파일 선택 시 center 패널(raw)과 right 패널(rendered)을 동시에 제공하는 것이다.  
기존 F03.5 멀티 워크스페이스 모델을 유지하면서, `activeSpec`를 워크스페이스 세션 상태로 분리해 워크스페이스 전환 시 문서 상태가 섞이지 않도록 고정한다.

기준 스펙:
- `/_sdd/spec/main.md` 섹션 `11.3`, `12.2(F04)`, `13.1`

## 2. Scope (In/Out)

### In Scope
- Markdown 렌더링 파이프라인 도입 (`react-markdown` + GFM)
- 기본 TOC(heading 목록) 표시
- `.md` 선택 시 dual view 동작 (center raw + right rendered)
- `activeSpec`를 워크스페이스별 세션 상태로 분리
- 단일/멀티 워크스페이스 회귀 테스트 추가

### Out of Scope
- TOC/스크롤/active heading의 워크스페이스별 복원
- 링크 인터셉트 및 코드 점프(F05)
- 섹션 active tracking 정밀화(F09)
- sanitize 강화/보안 하드닝(F10)

## 3. Components

1. **Workspace State Layer**: `activeSpec` 세션 상태 모델링 및 컨텍스트 액션 연결
2. **Spec Viewer Panel**: Markdown 렌더링 + TOC + 비활성/빈 상태 UI
3. **App Shell Integration**: 우측 placeholder 제거 후 SpecViewer 패널 연결
4. **Styling Layer**: 우측 패널, TOC, 본문 렌더 스타일 정의
5. **Test Layer**: workspace 상태 단위 테스트 + App 통합 테스트 + SpecViewer 컴포넌트 테스트

## 4. Implementation Phases

### Phase 1: Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | Markdown 렌더 의존성/유틸 도입 | P0 | - | Spec Viewer Panel |
| T2 | `activeSpec` 워크스페이스 상태 확장 | P0 | - | Workspace State Layer |

### Phase 2: UI Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | SpecViewerPanel 구현 (rendered + TOC) | P0 | T1 | Spec Viewer Panel |
| T4 | App dual view 통합 및 컨텍스트 연결 | P0 | T2, T3 | App Shell Integration |
| T5 | 우측 패널 스타일링/레이아웃 정리 | P1 | T4 | Styling Layer |

### Phase 3: Validation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T6 | 단위/통합 테스트 보강 및 회귀 고정 | P0 | T2, T3, T4 | Test Layer |

## 5. Task Details

### Task T1: Markdown 렌더 의존성/유틸 도입
**Component**: Spec Viewer Panel  
**Priority**: P0  
**Type**: Infrastructure

**Description**:
F04에서 사용할 Markdown 렌더링 의존성과 TOC 계산 유틸을 추가한다. 렌더러는 GFM을 처리할 수 있어야 하며, 기본 heading 목록을 추출할 수 있어야 한다.

**Acceptance Criteria**:
- [ ] Markdown 렌더링 라이브러리와 GFM 플러그인이 설치된다.
- [ ] heading 목록 추출 유틸이 구현된다.
- [ ] TOC에서 사용할 slug/anchor 키 규칙이 deterministic 하다.

**Target Files**:
- [M] `package.json` -- markdown 렌더링 의존성 추가
- [M] `package-lock.json` -- lockfile 동기화
- [C] `src/spec-viewer/markdown-utils.ts` -- heading 추출/anchor 생성 유틸

**Technical Notes**:
- 렌더 라이브러리는 `react-markdown`, GFM은 `remark-gfm` 기준으로 고정한다.
- TOC는 MVP에서 `h1~h3`까지만 노출(과도한 깊이 방지).

**Dependencies**: -

---

### Task T2: `activeSpec` 워크스페이스 상태 확장
**Component**: Workspace State Layer  
**Priority**: P0  
**Type**: Refactor

**Description**:
멀티 워크스페이스 세션에 `activeSpec` 필드를 추가하고, `.md` 선택 흐름에서 워크스페이스별로 분리 저장되도록 Context 로직을 확장한다.

**Acceptance Criteria**:
- [ ] `WorkspaceSession`에 `activeSpec: string | null`이 추가된다.
- [ ] `.md` 파일 선택 시 해당 워크스페이스의 `activeSpec`가 갱신된다.
- [ ] 워크스페이스 전환 후에도 각 워크스페이스의 `activeSpec`가 독립 유지된다.
- [ ] 기존 `selectionRange` 리셋/파일 읽기 흐름이 회귀하지 않는다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- `WorkspaceSession` 타입 및 초기값 확장
- [M] `src/workspace/workspace-context.tsx` -- `activeSpec` 상태 갱신/노출
- [M] `src/workspace/use-workspace.ts` -- 컨텍스트 확장 값 타입 소비 동기화
- [M] `src/workspace/workspace-model.test.ts` -- `activeSpec` 세션 분리 관련 단위 테스트

**Technical Notes**:
- `activeSpec`는 워크스페이스별 세션 필드로만 관리하고 전역 공유 상태를 만들지 않는다.
- F04에서는 `activeSpec` 복원 범위를 경로(path)로 한정한다.

**Dependencies**: -

---

### Task T3: SpecViewerPanel 구현 (rendered + TOC)
**Component**: Spec Viewer Panel  
**Priority**: P0  
**Type**: Feature

**Description**:
우측 패널 전용 `SpecViewerPanel`을 신규 구현한다. Markdown 본문 렌더링과 기본 TOC를 함께 표시하며, 활성 spec이 없거나 non-markdown일 때 안내 상태를 제공한다.

**Acceptance Criteria**:
- [ ] Markdown 본문이 rendered HTML로 표시된다.
- [ ] heading 기반 TOC가 표시되고 항목 앵커 링크가 생성된다.
- [ ] active spec이 없을 때 empty state가 표시된다.
- [ ] 렌더 실패/입력 없음 상태를 안전하게 처리한다.

**Target Files**:
- [C] `src/spec-viewer/spec-viewer-panel.tsx` -- 우측 Markdown 렌더/TOC 패널
- [C] `src/spec-viewer/spec-viewer-panel.test.tsx` -- 렌더/TOC/empty state 테스트
- [M] `src/spec-viewer/markdown-utils.ts` -- 패널 통합 시 유틸 보강

**Technical Notes**:
- F04는 링크 인터셉트를 넣지 않는다(클릭 처리 없이 기본 렌더).
- TOC는 panel 내부에서 단순 목록으로 제공하고 active tracking은 제외한다.

**Dependencies**: T1

---

### Task T4: App dual view 통합 및 컨텍스트 연결
**Component**: App Shell Integration  
**Priority**: P0  
**Type**: Feature

**Description**:
기존 right placeholder를 제거하고 `SpecViewerPanel`을 App 레이아웃에 연결한다. `.md` 선택 시 center의 raw preview와 right rendered가 동시에 유지되도록 상태 바인딩을 완성한다.

**Acceptance Criteria**:
- [ ] `.md` 선택 시 center(raw) + right(rendered)가 동시에 노출된다.
- [ ] non-markdown 선택 시 right 패널은 spec empty/placeholder 상태로 동작한다.
- [ ] A/B 워크스페이스 전환 시 `activeSpec`가 섞이지 않는다.
- [ ] 기존 파일 트리/코드뷰 동작이 회귀하지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- SpecViewerPanel 통합 및 prop wiring
- [M] `src/workspace/workspace-context.tsx` -- App에서 필요한 spec 관련 상태 제공 정리

**Technical Notes**:
- active workspace 규칙은 기존 11.3 정책을 그대로 유지한다.
- right panel 데이터 소스는 활성 워크스페이스 세션 한정이다.

**Dependencies**: T2, T3

---

### Task T5: 우측 패널 스타일링/레이아웃 정리
**Component**: Styling Layer  
**Priority**: P1  
**Type**: Feature

**Description**:
SpecViewerPanel 레이아웃/타이포그래피/스크롤 스타일을 추가하고 3패널 레이아웃에서 우측 패널 가독성을 확보한다.

**Acceptance Criteria**:
- [ ] TOC와 본문 영역이 시각적으로 구분된다.
- [ ] 긴 markdown 본문에서 우측 패널 스크롤이 정상 동작한다.
- [ ] 기존 file tree/code viewer 스타일 회귀가 없다.

**Target Files**:
- [M] `src/App.css` -- spec viewer panel/TOC/markdown body 스타일 추가

**Technical Notes**:
- 현재 디자인 톤(다크, 저채도)을 유지하고 신규 컬러는 최소 추가한다.

**Dependencies**: T4

---

### Task T6: 단위/통합 테스트 보강 및 회귀 고정
**Component**: Test Layer  
**Priority**: P0  
**Type**: Test

**Description**:
F04 수용 기준을 자동 테스트로 고정한다. App 통합 흐름에서 dual view와 멀티 워크스페이스 `activeSpec` 분리를 검증하고, SpecViewerPanel 컴포넌트 테스트로 렌더 안정성을 보장한다.

**Acceptance Criteria**:
- [ ] `.md` 선택 시 rendered 패널 표시를 통합 테스트로 검증한다.
- [ ] 워크스페이스 전환 시 `activeSpec` 분리를 통합 테스트로 검증한다.
- [ ] 기존 F01~F03.5 테스트가 통과한다.
- [ ] 신규 SpecViewerPanel 테스트가 통과한다.

**Target Files**:
- [M] `src/App.test.tsx` -- dual view + multi-workspace activeSpec 회귀 테스트
- [M] `src/workspace/workspace-model.test.ts` -- 상태 모델 `activeSpec` 테스트 보강
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- 렌더 상세 시나리오 보강

**Technical Notes**:
- App 통합 테스트는 기존 `window.workspace` mock 패턴을 재사용한다.
- 테스트 식별자(`data-testid`)는 기존 스타일과 충돌 없게 명시한다.

**Dependencies**: T2, T3, T4

## 6. Parallel Execution Summary

### 병렬 배치 제안
1. **Batch A (병렬 가능)**: `T1`, `T2`
2. **Batch B (순차)**: `T3` (T1 이후)
3. **Batch C (순차)**: `T4` -> `T5`
4. **Batch D (순차)**: `T6` (T2/T3/T4 이후)

### 파일 충돌 관점
- `src/workspace/workspace-context.tsx`: `T2`, `T4`에서 공통 수정 가능성 -> 순차 필수
- `src/workspace/workspace-model.test.ts`: `T2`, `T6` 공통 수정 -> 순차 필수
- `src/App.tsx` vs `src/App.css`: 파일 분리로 병렬 가능하지만 UI 결합 위험이 높아 `T4` 후 `T5` 권장

### 예상 크리티컬 패스
`T2 -> T3 -> T4 -> T6`

## 7. Risks & Mitigations

1. **Risk**: Markdown 렌더링 결과가 예상보다 무거워 패널 렌더 지연 발생  
   **Mitigation**: F04에서는 렌더 범위를 active markdown 1개로 한정하고, 성능 최적화는 F10에서 별도 처리

2. **Risk**: `activeSpec`와 `activeFile` 관계가 불명확하면 상태 드리프트 발생  
   **Mitigation**: `.md` 선택 시에만 `activeSpec` 갱신 규칙을 테스트로 고정

3. **Risk**: TOC anchor 규칙 변경 시 F05 링크 동작과 충돌 가능  
   **Mitigation**: `markdown-utils.ts`에 slug 규칙을 단일 함수로 고정하고 테스트로 보호

4. **Risk**: sanitize 미적용 상태에서 렌더 보안 우려  
   **Mitigation**: 현재 로컬 trusted workspace 전제를 유지하고, sanitize 하드닝 항목을 F10 backlog로 명시 유지

## 8. Open Questions

- 현재 구현 진행을 막는 블로킹 질문은 없음.
- 후속(F05/F09) 연계를 위해 F04 완료 후 검토할 항목:
  - TOC depth를 `h1~h3`에서 확장할지 여부
  - `activeSpec` 비활성 조건(non-md 선택 시 유지/초기화)의 UX 세부 정책
