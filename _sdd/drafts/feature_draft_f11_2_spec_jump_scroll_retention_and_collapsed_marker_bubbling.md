# Feature Draft: F11.2 Spec Jump Scroll Retention + Collapsed Marker Bubbling

**Date**: 2026-02-22
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> This patch can be copy-pasted into the corresponding spec section,
> or used as input for the `spec-update-todo` skill.

# Spec Update Input

**Date**: 2026-02-22
**Author**: Codex
**Target Spec**: main.md

## Improvements

### Improvement: Spec -> Code 점프 시 rendered markdown 위치 유지
**Priority**: High
**Target Section**: `_sdd/spec/sdd-workbench/contract-map.md` > `2. 링크/경로 해석 규칙`
**Current State**:
- rendered markdown에서 `Go to Source` 또는 spec 링크로 코드 점프할 때, 같은 spec 파일 재로드가 발생하며 오른쪽 패널이 상단으로 리셋될 수 있음.
- 사용자 관점에서 읽던 문맥이 사라져 탐색 효율이 저하됨.

**Proposed**:
- spec -> code 점프(특히 same-file source jump)에서는 rendered markdown를 불필요하게 초기화하지 않는다.
- `activeSpec`별 스크롤 위치를 저장하고, 같은 spec로 복귀/재선택 시 마지막 스크롤 위치를 복원한다.
- 내용이 실제로 변경된 경우(파일 변경/새 spec 열기)에는 기존 정책대로 콘텐츠 갱신을 허용하되, 가능한 범위에서 직전 읽던 위치를 복원한다.

**Reason**:
- 스펙-코드 왕복 작업의 핵심은 문맥 유지이며, 현재 동작은 반복 스크롤 비용을 유발한다.

### Improvement: collapse 상태에서도 변경 마커 가시화
**Priority**: High
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.3 File Tree Layer`
**Current State**:
- 변경 마커(`●`)는 변경된 파일(또는 노출된 노드)에만 표시된다.
- 변경 파일이 collapse된 디렉토리 하위에 있으면 마커가 사용자에게 보이지 않는다.

**Proposed**:
- collapse된 디렉토리 하위에 changed descendant가 있으면, 해당 디렉토리(사용자에게 보이는 가장 가까운 상위 노드)에 마커를 버블링 표시한다.
- 디렉토리를 펼치면 마커는 더 하위(보다 구체적인 visible node)로 이동하고, 최종적으로 파일 노드에서 확인 가능해야 한다.
- 마커는 count가 아닌 기존 단일 점(`●`) 정책을 유지한다.

**Reason**:
- 변경 감지의 목적은 “지금 어디가 바뀌었는지 즉시 알림”이며, collapse 상태에서 신호가 사라지면 감시 기능이 약화된다.

## Component Changes

### Update Component: workspace-context
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.2 Workspace State Layer`
**Change Type**: Enhancement

**Changes**:
- same-spec source jump 시 spec read/reset 최소화 규칙 추가
- spec scroll position 저장/복원 상태 연결(App/SpecViewer 인터페이스 포함)

### Update Component: SpecViewerPanel
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.5 Spec Viewer Layer`
**Change Type**: Enhancement

**Changes**:
- 렌더 패널 스크롤 이벤트를 상위로 보고하는 콜백 추가
- 외부에서 전달된 복원 위치(scrollTop) 적용 로직 추가
- 스펙 점프 시 위치 보존 회귀 테스트 추가

### Update Component: FileTreePanel
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.3 File Tree Layer`
**Change Type**: Enhancement

**Changes**:
- changedFiles + expandedDirectories를 기반으로 “visible marker path” 계산
- collapse된 하위 변경을 상위 디렉토리 마커로 버블링
- expand/collapse에 따라 marker 위치가 동적으로 재계산되도록 반영

## Notes

### Constraints
- 기존 마커 스타일(`●`)과 파일 선택 UX는 유지한다.
- 멀티 워크스페이스 경계를 넘는 점프/마커 계산은 허용하지 않는다.
- 이번 범위의 scroll position 복원은 런타임 내 탐색 안정화가 1순위이며, 재시작 복원 확장은 제외한다.

### References
- `src/workspace/workspace-context.tsx`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/file-tree/file-tree-panel.tsx`
- `src/App.tsx`

---

# Part 2: Implementation Plan

## 개요

본 기능은 탐색 UX 회귀 2건을 함께 해결한다.
1) spec -> code 점프 시 rendered markdown 문맥(스크롤 위치) 유지
2) collapse 트리에서도 changed marker 가시화 보장

## 범위

### In Scope
- same-file source jump에서 spec panel reset 최소화
- spec panel scroll position 저장/복원(런타임)
- collapsed subtree 변경 마커 버블링
- 관련 단위/통합 테스트 보강

### Out of Scope
- 앱 재시작 후 spec scroll position 복원
- 마커 count/세부 diff 표시
- AST 기반 정밀 위치 동기화

## 컴포넌트

1. **Spec Navigation Stability Layer**: workspace-context + App 점프 오케스트레이션
2. **Spec Viewer Scroll State Layer**: SpecViewerPanel scroll capture/restore
3. **Tree Marker Bubbling Layer**: FileTreePanel visible marker 계산
4. **Validation Layer**: spec/file-tree/app 회귀 테스트

## 구현 단계

### Phase 1: Spec 점프 안정화

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | same-spec 점프 시 spec 재로드/리셋 최소화 정책 반영 | P0 | - | Spec Navigation Stability Layer |
| T2 | SpecViewer scroll 저장/복원 인터페이스 추가 | P0 | T1 | Spec Viewer Scroll State Layer |
| T3 | 점프/복원 회귀 테스트 보강 | P1 | T1, T2 | Validation Layer |

### Phase 2: Collapse 마커 버블링

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T4 | visible node 기준 changed marker 버블링 계산 로직 구현 | P0 | - | Tree Marker Bubbling Layer |
| T5 | collapse/expand 마커 이동 회귀 테스트 보강 | P1 | T4 | Validation Layer |

## 태스크 상세

### Task T1: same-spec 점프 시 spec 재로드/리셋 최소화
**Component**: Spec Navigation Stability Layer  
**Priority**: P0  
**Type**: Bug Fix

**Description**:
`Go to Source`/spec 링크 점프 경로에서 대상 파일이 현재 `activeSpec`과 동일한 경우, rendered spec 콘텐츠를 `null`로 초기화하는 경로를 피하고 기존 뷰 상태를 유지한다.

**Acceptance Criteria**:
- [ ] rendered markdown에서 `Go to Source` 실행 시 오른쪽 패널이 상단으로 튀지 않는다.
- [ ] same-file jump에서 `activeSpecContent`가 불필요하게 clear되지 않는다.
- [ ] 기존 line jump 및 code viewer selection 동작은 유지된다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- same-spec jump/read 정책 분기
- [M] `src/App.tsx` -- spec jump 호출 경로(reason) 정리

**Technical Notes**:
- mode(`select`/`refresh`) 외에 점프 목적(reason) 또는 preserve 플래그를 도입해 분기 명확화.
- 파일 내용이 실제 변경된 경우의 refresh 경로는 기존대로 유지.

**Dependencies**: -

---

### Task T2: SpecViewer scroll position 저장/복원 인터페이스 추가
**Component**: Spec Viewer Scroll State Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
spec panel의 scrollTop을 파일 경로 기준으로 저장하고, 해당 spec를 다시 표시할 때 마지막 위치를 복원한다.

**Acceptance Criteria**:
- [ ] 사용자가 spec 패널을 스크롤하면 현재 spec의 scrollTop이 상태에 저장된다.
- [ ] 같은 spec로 돌아오면 직전 scrollTop으로 복원된다.
- [ ] 점프/선택 흐름에서도 복원 동작이 깨지지 않는다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- scroll capture + restore prop/효과 추가
- [M] `src/App.tsx` -- spec scroll state 보관 및 SpecViewer props wiring

**Technical Notes**:
- 복원은 content mount 직후 1회 적용(guard)하고 사용자 스크롤과 충돌하지 않게 debounce/조건부 적용.
- 맵 키는 `activeSpecPath` 기준(워크스페이스 단위로 분리된 상태 유지).

**Dependencies**: T1

---

### Task T3: spec 점프/복원 회귀 테스트 보강
**Component**: Validation Layer  
**Priority**: P1  
**Type**: Test

**Description**:
점프 시 스크롤 리셋 회귀와 저장/복원 시나리오를 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] `Go to Source` 실행 후 spec 패널 스크롤 유지(또는 저장 위치 복원) 검증 테스트 존재.
- [ ] same-spec 점프 시 불필요한 spec reset이 발생하지 않음을 검증한다.
- [ ] 기존 SpecViewer 링크/popover 테스트는 회귀하지 않는다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- scroll capture/restore 단위 테스트
- [M] `src/App.test.tsx` -- spec->code 점프 시 reset 회귀 통합 테스트

**Technical Notes**:
- jsdom 한계를 고려해 `scrollTop`/`scrollTo` mock 기반으로 검증.
- readFile mock 호출 횟수/순서를 함께 검증해 리로드 정책 회귀 감지.

**Dependencies**: T1, T2

---

### Task T4: collapse 상태 changed marker 버블링 구현
**Component**: Tree Marker Bubbling Layer  
**Priority**: P0  
**Type**: Feature

**Description**:
트리 렌더 시 “현재 화면에 보이는 노드” 기준으로 changed marker 표시 경로를 계산해, collapse된 하위 변경을 상위 디렉토리로 버블링한다.

**Acceptance Criteria**:
- [ ] 변경 파일이 collapse된 디렉토리 하위에 있으면 해당 디렉토리에 `●`가 표시된다.
- [ ] 디렉토리를 확장하면 더 하위 노드로 마커가 이동한다.
- [ ] 변경 파일이 직접 visible이면 파일 노드 마커를 우선 표시한다.

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- marker bubble 계산/렌더 로직
- [M] `src/App.css` -- 필요 시 디렉토리 마커 정렬 스타일 미세 조정

**Technical Notes**:
- 렌더 재귀 과정에서 subtree changed 여부를 반환하거나, 사전 계산 맵(`path -> shouldShowMarker`) 생성 후 렌더에 주입.
- marker는 기존 단일 점 UI 유지(카운트 미도입).

**Dependencies**: -

---

### Task T5: collapse/expand marker 버블링 회귀 테스트
**Component**: Validation Layer  
**Priority**: P1  
**Type**: Test

**Description**:
collapse 상태 가시성 및 expand 후 마커 이동 규칙을 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] collapsed 디렉토리에서 디렉토리 마커 표시 테스트가 존재한다.
- [ ] expanded 상태에서 하위 파일 마커 노출 테스트가 존재한다.
- [ ] 기존 파일/디렉토리 우클릭 복사 및 토글 동작은 회귀하지 않는다.

**Target Files**:
- [M] `src/file-tree/file-tree-panel.test.tsx` -- collapse/expand marker bubbling 테스트 추가
- [M] `src/App.test.tsx` -- watcher changed indicator 통합 시나리오 보강(선택)

**Technical Notes**:
- 테스트 트리는 최소 2~3 depth로 구성해 nearest visible ancestor 규칙을 검증.
- 마커 테스트는 `data-testid` 기반으로 유지해 회귀 신뢰도 확보.

**Dependencies**: T4

## Parallel Execution Summary

- **최대 병렬도**: 2
- **병렬 가능 그룹**:
  - Group A: `T1 -> T2 -> T3` (Spec 점프/스크롤 축)
  - Group B: `T4 -> T5` (트리 마커 버블링 축)
- **충돌 포인트**:
  - `src/App.test.tsx`는 T3/T5에서 동시 수정 충돌 가능성이 있어 한쪽에서만 수정하거나 순차 적용 필요
- **의미적 충돌 주의**:
  - T1/T2의 spec 상태 정책 변경은 F09 세션 복원/F10.1 source jump 동작과 계약 충돌 가능성이 있으므로 회귀 테스트로 보호

## Risks / Open Questions

1. 스크롤 복원을 “이전 위치 유지”로 강제할 때, 사용자가 의도적으로 맨 위로 이동한 직후 이벤트 경합이 발생할 수 있음
2. 대형 트리에서 버블링 계산 비용이 커질 수 있어 O(n) 1-pass 계산 유지 필요
3. `hasStructureChanges` refresh 직후 marker 재계산 타이밍에서 1프레임 지연 가능성 있음

## Done Definition

- 자동 테스트(`npm test`) 통과
- 정적 품질 게이트(`npm run lint`, `npm run build`) 통과
- 수동 스모크에서 아래를 확인:
  1. rendered markdown 중간 위치에서 `Go to Source` 수행 후 오른쪽 패널 위치 유지
  2. collapse된 디렉토리 하위 변경 시 상위 디렉토리 마커 표시
  3. 디렉토리 확장 시 마커가 하위 노드로 이동

---

## Next Steps

1. `implementation-plan` 없이 바로 `implementation`으로 실행 가능 (본 draft가 태스크/Target Files 포함)
2. 구현 전 스펙 반영이 필요하면 `spec-update-todo`에 Part 1 그대로 입력
