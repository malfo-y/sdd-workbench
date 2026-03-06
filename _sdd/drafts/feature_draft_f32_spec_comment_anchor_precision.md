# Feature Draft: F32 Spec Viewer 코멘트 앵커 정밀도 개선

**Date**: 2026-03-06
**Author**: user + Codex
**Status**: 📋 Planned
**Target Spec**: `_sdd/spec/main.md` + 하위 문서

---

# Part 1: Spec Patch Draft

> 이 패치는 해당 스펙 섹션에 복사-붙여넣기하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-03-06
**Author**: user + Codex
**Target Spec**: `_sdd/spec/main.md` + 하위 문서

## New Features

### Feature: F32 Spec Viewer 코멘트/소스 액션 line anchor 정밀도 개선
**Priority**: Medium  
**Category**: Comment UX / Source Mapping  
**Target Component**: `SpecViewerPanel`, `source-line-resolver`  
**Target Section**: `_sdd/spec/main.md` > `현재 상태 요약`; `_sdd/spec/sdd-workbench/01-overview.md` > `MVP 범위`, `기능 커버리지`; `_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`; `_sdd/spec/sdd-workbench/04-interfaces.md` > `2. 링크/경로/선택 액션 규칙`, `4. 코멘트/Export 정책 계약`, `5. 마커 매핑 규칙`; `_sdd/spec/sdd-workbench/appendix.md` > `기능 이력`, `상세 수용 기준`

**Description**:  
Rendered markdown에서 `Add Comment`와 `Go to Source`가 사용하는 source line 해석을 block 시작 line 중심에서 더 정밀한 **line-level best-effort anchor**로 확장한다. fenced code block의 기존 newline offset 계산은 유지하고, 일반 paragraph/list/blockquote/table에서는 더 세밀한 rendered node source metadata와 resolver 규칙을 사용해 선택/우클릭 지점에 가까운 source line을 계산한다. 목표는 comment 저장 포맷을 바꾸지 않고도 스펙 뷰어에서 달리는 코멘트가 원문상 더 정확한 line range를 가리키게 하는 것이다.

**Acceptance Criteria**:

- [ ] rendered paragraph 안에서 선택 후 `Add Comment`를 실행하면, 가능한 경우 paragraph 시작 line이 아니라 선택 지점에 더 가까운 source line으로 `selectionRange`가 계산된다.
- [ ] list item과 blockquote 내부 paragraph 선택/우클릭은 부모 컨테이너의 시작 line보다 더 구체적인 child/source span line을 우선 사용한다.
- [ ] GFM table에서 row/cell 텍스트 선택 또는 우클릭 시 table 전체 시작 line이 아니라 해당 row/cell에 대응되는 source line이 우선 선택된다.
- [ ] fenced code block 내부 선택은 현재처럼 newline offset 기반 정밀 line 계산을 유지한다.
- [ ] anchor/focus가 서로 다른 rendered node에 걸친 selection은 정규화된 `{ startLine, endLine }` 범위를 반환한다.
- [ ] granular line 해석이 실패하는 경우 현재 block-level fallback 또는 nearest-from-point fallback으로 안전하게 degrade 된다.
- [ ] `Add Comment` 저장 플로우, `Go to Source` 액션, comment marker 렌더링, spec search highlight는 기존 UX를 유지하고 line 해석 정확도만 개선된다.

**Technical Notes**:

- 이번 범위는 comment 데이터 모델을 바꾸지 않고 `startLine/endLine`만 더 정확히 계산하는 개선이다.
- 목표는 **line-level precision**이며, 문자/column 단위 exact anchor 또는 inline token-perfect mapping은 포함하지 않는다.
- resolver는 `data-source-line` 단일 값 외에 필요한 경우 start/end span metadata를 읽을 수 있어야 한다.
- renderer는 paragraph/list/blockquote/table row/cell 등 기존보다 더 세밀한 노드에 source metadata를 부여한다.
- fenced code block은 현재 `pre > code` newline offset 계산 경로를 유지하고, 일반 markdown 블록은 보강된 metadata 우선 규칙을 따른다.

**Dependencies**:

- F10.1 Markdown Selection `Go to Source`
- F11.1 Rendered Markdown `Add Comment`
- F30 스펙 뷰어 텍스트 검색의 rendered line mapping

## Improvements

### Improvement: `source-line-resolver` 계약을 block start line에서 best-effort line span 해석으로 확장
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`; `_sdd/spec/sdd-workbench/04-interfaces.md` > `2. 링크/경로/선택 액션 규칙`  
**Current State**: 일반 markdown 블록은 가장 가까운 `data-source-line` 조상만 사용하므로 paragraph/table/list 내부에서 block 시작 line으로 쏠린다.  
**Proposed**: resolver가 더 세밀한 rendered node metadata와 line span 정보를 읽어 selection/target에 가까운 source line 또는 line range를 계산하도록 확장한다.  
**Reason**: 스펙 뷰어 코멘트와 source jump가 문서 구조상 더 자연스러운 위치를 가리키게 하기 위함이다.

### Improvement: Spec Viewer rendered metadata granularity 보강
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`, `_sdd/spec/sdd-workbench/04-interfaces.md` > `5. 마커 매핑 규칙`  
**Current State**: `data-source-line`은 주요 block에만 부여되어 row/cell/child paragraph 수준의 분해능이 부족하다.  
**Proposed**: `tr`, `th`, `td`, nested paragraph, inline code/link 등 comment/source 액션에 의미 있는 rendered node까지 source metadata를 확장하고, 필요 시 line span metadata를 함께 제공한다.  
**Reason**: table/list/blockquote와 긴 문단에서 block 시작 line bias를 줄이기 위함이다.

### Improvement: Spec Viewer comment/source 액션 회귀 테스트 확장
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/appendix.md` > `상세 수용 기준`  
**Current State**: 현재 테스트는 일반 paragraph, code fence, 일부 검색 table mapping 중심이며 코멘트 anchor 정밀도에 대한 list/blockquote/table 회귀가 부족하다.  
**Proposed**: paragraph multiline, list item, blockquote, table row/cell, fallback degrade 시나리오를 테스트에 추가한다.  
**Reason**: markdown renderer 또는 resolver 변경 시 코멘트 anchor 정확도 회귀를 빠르게 탐지하기 위함이다.

## Component Changes

### Component Change: Spec Viewer Layer line metadata helper 추가
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- markdown node position에서 start/end line span을 안전하게 추출하는 helper를 추가한다.
- spec viewer renderer가 이 helper를 통해 rendered node에 일관된 source metadata를 부여한다.
- metadata shape는 resolver와 search/comment marker가 재사용 가능한 방향으로 맞춘다.

### Component Change: `source-line-resolver` 정밀도 향상
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- selection anchor/focus/target node에서 nearest source line 뿐 아니라 line span 기반 계산을 지원한다.
- code fence 전용 정밀 계산과 일반 markdown fallback 경로를 함께 유지한다.
- line 해석 실패 시 기존 null/fallback 안전성을 유지한다.

### Component Change: Spec Viewer source action wiring 유지 + anchor 계산만 개선
**Target Section**: `_sdd/spec/sdd-workbench/04-interfaces.md` > `2. 링크/경로/선택 액션 규칙`, `4. 코멘트/Export 정책 계약`  
**Type**: Existing Component Extension  
**Change Summary**:

- `Add Comment`와 `Go to Source` 팝오버 UI/명령은 유지한다.
- `selectionRange` 계산만 더 정밀해지고, `relativePath`/저장 플로우는 기존 계약을 유지한다.
- App/comment persistence 계층의 API shape는 변경하지 않는다.

## Notes

### Scope Boundary

- 이번 범위는 rendered markdown comment/source action의 **line anchor 정밀도 개선**이다.
- 문자/column 단위 anchor, AST 기반 relocation, 원문 변경 후 코멘트 자동 재배치 기능은 범위 밖이다.
- exact mapping이 불가능한 경우 기존 block-level/nearest fallback을 유지한다.

### Context

현재 스펙 뷰어 코멘트는 fenced code block을 제외하면 일반적으로 block 시작 line에 붙는 경향이 있다. 검색에서 이미 raw/source line과 rendered block 사이의 매핑을 보강한 만큼, 코멘트/source action도 같은 방향으로 line 정확도를 한 단계 끌어올리는 것이 실사용 가치가 높다.

### Open Questions

- [ ] paragraph가 여러 markdown source line에 걸치지만 nested rendered node 경계가 부족한 경우, 이번 범위는 "가장 가까운 available line span"을 사용한다. exact original column 복원은 후속 범위로 남긴다.
- [ ] renderer가 제공하는 node position이 일부 GFM 변형(table alignment row 등)에서 충분하지 않으면 해당 구조는 block-level fallback으로 degrade 한다.

---

# Part 2: Implementation Plan

# Implementation Plan: F32 Spec Viewer 코멘트 앵커 정밀도 개선

## Overview

F32는 rendered markdown에서 코멘트와 source jump가 가리키는 source line을 더 정확하게 만든다. 핵심은 renderer가 더 세밀한 source metadata를 내보내고, resolver가 그 metadata를 이용해 selection/우클릭 지점에 가까운 line 또는 line range를 계산하도록 바꾸는 것이다. comment 저장 포맷과 App wiring은 그대로 유지한다.

## Scope

### In Scope

- rendered markdown node source metadata 보강
- `source-line-resolver`의 line span/세밀한 node 우선 해석
- paragraph/list/blockquote/table에서 코멘트 anchor 정밀도 개선
- fenced code block 기존 정밀도 유지
- spec viewer comment/source action 회귀 테스트 추가

### Out of Scope

- 문자/column 단위 exact anchor
- comment schema 변경
- inline token 수준 하이라이트/selection serialization
- markdown 원문 수정 후 코멘트 자동 재배치
- search UX 또는 export 포맷 변경

## Components

1. **Source Metadata Layer**: markdown node position을 rendered metadata로 정규화
2. **Source Resolver Layer**: selection/target/point 기반 source line 계산
3. **Spec Viewer Action Integration**: `Add Comment`/`Go to Source`에서 개선된 resolver 사용
4. **Validation Layer**: unit/integration regression 고정

## Implementation Phases

### Phase 1: Metadata Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | source metadata helper 추가 | P0 | - | Source Metadata Layer |
| 2 | Spec Viewer renderer metadata 확장 | P0 | 1 | Source Metadata Layer |

### Phase 2: Resolver Upgrade
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | `source-line-resolver` line span 해석 추가 | P0 | 1, 2 | Source Resolver Layer |

### Phase 3: Integration and Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 4 | source action wiring에 개선된 anchor 계산 통합 | P1 | 3 | Spec Viewer Action Integration |
| 5 | paragraph/list/blockquote/table/fallback 회귀 테스트 추가 | P0 | 3, 4 | Validation Layer |

## Task Details

### Task 1: source metadata helper 추가
**Component**: Source Metadata Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
react-markdown node position에서 source start/end line을 정규화하고 rendered metadata props를 조립하는 helper를 추가한다. helper는 기존 `data-source-line` 호환을 유지하면서 필요한 경우 line span metadata도 함께 만들 수 있어야 한다.

**Acceptance Criteria**:

- [ ] markdown node position의 start/end line이 1 이상 정수로 정규화된다.
- [ ] start/end line이 모두 없거나 비정상인 경우 안전하게 `undefined`를 반환한다.
- [ ] 기존 `data-source-line` 사용처와 호환되는 metadata를 생성할 수 있다.
- [ ] table row/cell, nested paragraph 같은 추가 renderer가 같은 helper를 재사용할 수 있다.

**Target Files**:
- [C] `src/spec-viewer/source-line-metadata.ts` -- node position -> source metadata helper
- [C] `src/spec-viewer/source-line-metadata.test.ts` -- line span 정규화/unit test
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- helper 도입 준비 및 기존 inline helper 정리

**Technical Notes**:

- current `MarkdownNodeWithPosition` 타입을 helper 모듈로 옮기거나 공유 타입으로 승격하는 방향이 적합하다.
- helper는 DOM resolver와 결합하지 않고 순수 함수로 유지하는 편이 테스트와 재사용에 유리하다.

**Dependencies**: -

### Task 2: Spec Viewer renderer metadata 확장
**Component**: Source Metadata Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
SpecViewer renderer가 주요 block뿐 아니라 table row/cell, nested paragraph, 필요 시 inline code/link 등 더 세밀한 노드에 source metadata를 부여하도록 확장한다. comment marker suppression과 search highlight가 기존처럼 동작하도록 metadata 우선순위를 정리한다.

**Acceptance Criteria**:

- [ ] `p`, `li`, `blockquote`, `pre`, `table` 외에 `tr`, `th`, `td` 또는 동등한 세밀도 노드가 source metadata를 가진다.
- [ ] list/blockquote 내부 nested paragraph에 source metadata가 유지된다.
- [ ] 기존 comment marker 중복 억제 규칙이 세밀한 metadata 추가 후에도 깨지지 않는다.
- [ ] search block focus/highlight와 same-document anchor 동작이 회귀하지 않는다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- markdown component renderer 확장
- [M] `src/spec-viewer/source-line-metadata.ts` -- renderer용 metadata prop builder 보강
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- rendered metadata 기반 regression 준비

**Technical Notes**:

- metadata granularity를 늘릴수록 marker/search class가 여러 node에 붙을 수 있으므로 "interactive anchor용 metadata"와 "marker/highlight 대표 block"의 우선순위를 분리하는 편이 안전하다.
- table는 row/cell 단위 metadata를 추가하더라도 search highlight 대표 block은 기존 table block을 유지할 수 있다.

**Dependencies**: 1

### Task 3: `source-line-resolver` line span 해석 추가
**Component**: Source Resolver Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
resolver가 selection anchor/focus/target에서 가장 가까운 source metadata를 읽을 때, 단일 시작 line만이 아니라 start/end span과 더 세밀한 descendant metadata를 활용하도록 업그레이드한다. code fence는 기존 newline offset 계산을 우선 적용하고, 일반 markdown은 가능한 경우 세밀한 node line을 우선 선택한다.

**Acceptance Criteria**:

- [ ] selection anchor/focus가 서로 다른 세밀한 node에 있으면 정규화된 range가 반환된다.
- [ ] table cell/row target은 table 시작 line이 아니라 cell/row line을 우선 반환한다.
- [ ] list/blockquote child paragraph target은 부모 container line보다 child line을 우선 반환한다.
- [ ] code fence selection offset 계산은 그대로 유지된다.
- [ ] metadata가 부족한 구조에서는 기존 nearest fallback 또는 `null` 반환으로 안전하게 동작한다.

**Target Files**:
- [M] `src/spec-viewer/source-line-resolver.ts` -- line span/descendant-aware resolver
- [M] `src/spec-viewer/source-line-resolver.test.ts` -- paragraph/list/blockquote/table/fallback unit test
- [M] `src/spec-viewer/source-line-metadata.ts` -- resolver가 읽는 attribute contract 확정

**Technical Notes**:

- DOM traversal 우선순위는 `exact annotated descendant -> selection anchor/focus -> point fallback` 순으로 정리하는 편이 일관적이다.
- tie-break는 기존 lower-line 우선 규칙을 유지하는 편이 예측 가능하다.

**Dependencies**: 1, 2

### Task 4: source action wiring에 개선된 anchor 계산 통합
**Component**: Spec Viewer Action Integration  
**Priority**: P1-High  
**Type**: Feature

**Description**:  
`SpecViewerPanel`의 context menu -> source popover -> `Add Comment`/`Go to Source` 경로가 개선된 resolver 결과를 그대로 사용하도록 정리한다. UI 구조는 바꾸지 않고 `selectionRange` 표시와 fallback handling만 정밀도 개선에 맞게 조정한다.

**Acceptance Criteria**:

- [ ] `Add Comment`가 기존과 동일한 payload shape로 더 정확한 `selectionRange`를 전달한다.
- [ ] `Go to Source`가 improved start line을 사용하되 popover/close 동작은 유지한다.
- [ ] collapsed selection, activeSpec 부재, 해석 실패 시 현재 no-op/safe fallback 동작을 유지한다.
- [ ] App/comment persistence 레이어 수정 없이 동작한다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- source action resolution/wiring 정리
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- comment/go-to-source integration regression

**Technical Notes**:

- UI label이 line range를 표시할지 단일 line만 표시할지는 현재 팝오버 밀도를 고려해 최소 변경으로 유지하는 편이 적합하다.
- `onRequestAddComment` payload shape는 유지하므로 App.tsx 변경은 기본적으로 불필요하다.

**Dependencies**: 3

### Task 5: paragraph/list/blockquote/table/fallback 회귀 테스트 추가
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:  
resolver unit test와 panel integration test를 확장해 paragraph multiline, list item, blockquote, table row/cell, code fence 유지, fallback degrade 시나리오를 고정한다. 이번 기능은 line 해석 규칙이 핵심이므로 테스트가 구현보다 먼저 회귀 기준을 분명히 잡아야 한다.

**Acceptance Criteria**:

- [ ] `source-line-resolver.test.ts`에 paragraph/list/blockquote/table/fallback 시나리오가 추가된다.
- [ ] `spec-viewer-panel.test.tsx`에 `Add Comment`와 `Go to Source` integration 시나리오가 추가된다.
- [ ] 기존 code fence 정밀도 테스트는 유지되거나 강화된다.
- [ ] search highlight/table mapping 관련 기존 테스트가 계속 통과한다.

**Target Files**:
- [M] `src/spec-viewer/source-line-resolver.test.ts` -- resolver regression suite
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- source action integration suite
- [M] `src/spec-viewer/source-line-metadata.test.ts` -- helper regression coverage

**Technical Notes**:

- table 테스트는 검색용 table highlight 테스트와 별개로 comment/source action anchor를 검증해야 한다.
- multiline paragraph는 DOM selection mock이 취약할 수 있으므로 helper/unit test와 integration test를 적절히 분리한다.

**Dependencies**: 3, 4

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| renderer metadata를 너무 많이 늘리면 marker/highlight class 중복 부착 가능성 증가 | Medium | 대표 block과 interactive anchor metadata의 책임을 분리하고 regression test로 고정 |
| react-markdown node position이 일부 GFM 구조에서 기대보다 거칠 수 있음 | Medium | line span metadata + fallback 규칙 유지, unsupported 구조는 block-level degrade |
| resolver 로직 복잡도 증가로 기존 code fence 정밀도가 깨질 수 있음 | High | code fence 전용 테스트를 유지하고 분기 순서를 명시 |
| 대부분의 작업이 `spec-viewer-panel.tsx`에 모여 병렬성이 낮음 | Low | helper 모듈 선행 후 panel 통합을 순차로 진행 |

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | Sequential (conflicts) |
|-------|-------------|--------------|------------------------|
| 1 | 2 | 1 | 1 |
| 2 | 1 | 1 | 0 |
| 3 | 2 | 1 | 1 |

## Open Questions

- [ ] source popover의 line 표시를 단일 line 유지로 둘지, range가 넓을 때 `Line 12-14`처럼 노출할지는 구현 직전 UX 판단이 필요하다. 이번 draft는 payload 정밀도 우선, UI 변경 최소화를 기본값으로 둔다.
- [ ] inline link/emphasis/text node까지 metadata를 넓힐지, row/cell/child paragraph 수준까지만 한정할지는 구현 중 node position 품질을 보고 조정할 수 있다. MVP는 row/cell + child paragraph 우선이다.

## Model Recommendation

`Sonnet` → `gpt-5.3-codex` (`reasoning effort: high`)

