# Feature Draft: F48 Spec Viewer Table Cell + Repeated Text Anchor Hardening

<!-- spec-update-todo-input-start -->
# Part 1: Spec Patch Draft

# Spec Update Input

**Date**: 2026-04-02
**Author**: Codex
**Target Spec**: `/_sdd/spec/main.md`, `/_sdd/spec/spec-viewer/overview.md`, `/_sdd/spec/spec-viewer/contracts.md`, `/_sdd/spec/comments-and-export/contracts.md`, `/_sdd/spec/feature-index.md`
**Spec Update Classification**: Improvement + Bug Fix

## Background & Motivation Updates

### Update: table cell과 repeated-text exact mapping ambiguity를 F32/F33의 후속 hardening 대상으로 명시

**Priority**: High
**Target Section**: `/_sdd/spec/main.md` > `§2 Core Design > Key Idea`; `/_sdd/spec/spec-viewer/overview.md` > `4.1 line anchor와 exact offset`; `/_sdd/spec/feature-index.md` > `1. Foundation / Workspace / Viewer`

**Current State**:
현재 spec source mapping은 line range를 source of truth로 유지하고, supported inline structure에서만 exact offset을 additive payload로 계산한다. paragraph/list/blockquote는 대체로 의도한 수준으로 동작하지만, GFM table에서는 실제 cell text 선택과 marker 표시가 nearest line fallback으로 내려가며 사용자가 기대한 위치와 어긋날 수 있다. 또한 exact offset 복원이 substring 매칭에 기대는 경로에서는 같은 rendered text가 가까운 source span 안에 반복될 때 잘못된 exact offset을 고를 수 있다.

**Proposed**:
table cell과 repeated-text ambiguity를 함께 hardening 범위로 명시한다. F32의 line-level precision과 F33의 exact offset path는 유지하되, GFM table에서는 `cell-local source mapping`을 우선 적용하고, exact path가 ambiguous한 경우에는 잘못된 exact offset보다 보수적인 line fallback을 선택하도록 정리한다.

**Reason**:
table은 source markdown의 pipe syntax와 rendered cell 구조가 어긋나기 쉽고, repeated text는 약한 substring 매칭이 오탐을 만들 수 있어 기존 generic fallback과 optimistic exact path만으로는 `Add Comment`, `Go to Source`, marker hover 위치가 충분히 안정적이지 않다.

## Design Changes

### Design Change: GFM table cell source mapping을 일반 block fallback과 분리

**Priority**: High
**Target Section**: `/_sdd/spec/spec-viewer/contracts.md` > `3. source selection 규칙`, `4.1 spec -> code`

**Description**:
table selection은 paragraph/list/blockquote와 같은 generic span 추정으로만 처리하지 않는다. `td`/`th`와 그 하위 leaf metadata를 우선 사용해 same-file raw markdown 기준의 line range와 가능하면 exact offset range를 계산한다. table 문맥에서 exact mapping이 실패할 때만 현재 nearest line fallback을 허용한다.

**Acceptance Criteria**:

- [ ] table cell 내부 plain text selection은 table block start line이 아니라 cell에 대응되는 source line을 우선 사용한다.
- [ ] table cell 내부 inline code, emphasis/strong, link text selection은 가능한 경우 exact offset range까지 계산한다.
- [ ] table cell에서 `Go to Source`는 same-file raw markdown의 해당 cell 근처를 우선 선택/강조한다.
- [ ] exact mapping 실패 시에는 현재 line fallback을 유지하되, unrelated block으로 튀는 사례를 줄인다.

### Design Change: repeated rendered text가 있는 exact mapping은 보수적으로 채택

**Priority**: High
**Target Section**: `/_sdd/spec/spec-viewer/contracts.md` > `3. source selection 규칙`, `4.1 spec -> code`; `/_sdd/spec/main.md` > `§2 Core Design > Key Idea`

**Description**:
exact offset 복원 후보 span 안에 같은 rendered text가 여러 번 등장하면 optimistic exact mapping을 확정하지 않는다. repeated text ambiguity가 감지되면 exact offset은 drop하고 line range 또는 nearest fallback으로 degrade 한다.

**Acceptance Criteria**:

- [ ] 같은 rendered text가 candidate source span에 반복될 때 잘못된 exact offset이 저장되지 않는다.
- [ ] repeated text ambiguity는 table cell뿐 아니라 supported inline selection 전반에서 같은 규칙으로 처리된다.
- [ ] exact offset이 drop되더라도 line range 기반 `Add Comment`와 `Go to Source`는 계속 동작한다.

### Design Change: rendered markdown comment marker의 table 문맥 매핑 규칙 보강

**Priority**: Medium
**Target Section**: `/_sdd/spec/comments-and-export/contracts.md` > `5. marker / hover preview 규칙`; `/_sdd/spec/spec-viewer/overview.md` > `4.2 검색과 navigation`

**Description**:
기존 rendered markdown marker는 `data-source-line` 기반 nearest mapping을 사용한다. table에서는 이 규칙이 marker를 table 전체 block 또는 인접 rendered line에 붙이는 bias를 만들 수 있으므로, table row/cell descendant metadata가 있으면 그것을 먼저 사용하고, 그 다음에 lower-line-preferred nearest fallback을 적용한다.

**Acceptance Criteria**:

- [ ] table-origin comment marker는 가능한 경우 same-cell 대표 anchor node에 붙고, 대표 anchor를 찾지 못한 경우에만 `td/th` 또는 same-row candidate로 fallback 한다.
- [ ] hover preview는 marker 위치 보강 후에도 기존 comment ordering과 `+N more` 규칙을 유지한다.
- [ ] paragraph/list/blockquote marker 규칙은 회귀하지 않는다.

## New Features

### Feature: F48 Table cell + repeated-text exact anchor hardening for `Add Comment` and `Go to Source`

**Priority**: High
**Category**: Comment UX / Source Mapping / Markdown Precision
**Target Component**: `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/source-line-resolver.ts`, `src/spec-viewer/rehype-source-text-leaves.ts`
**Target Section**: `/_sdd/spec/spec-viewer/overview.md` > `2. 사용자 가시 동작`, `4.1 line anchor와 exact offset`; `/_sdd/spec/spec-viewer/contracts.md` > `3. source selection 규칙`, `4.1 spec -> code`

**Description**:
GFM table에서 rendered cell text를 선택하거나 우클릭할 때, source action이 generic nearest line 대신 cell-aware source mapping을 사용하도록 강화한다. 동시에 exact offset 복원 후보가 ambiguous한 repeated text selection에서는 잘못된 exact offset을 저장하지 않도록 guard를 추가한다. line range는 계속 저장하고, exact path가 신뢰 가능한 경우에만 optional exact offset metadata를 함께 전달한다.

**Acceptance Criteria**:

- [ ] `td`/`th` 내부 plain text selection은 cell line을 우선 사용한다.
- [ ] `td`/`th` 내부 inline formatting selection은 가능한 경우 exact offset range를 생성한다.
- [ ] repeated text ambiguity가 감지되면 exact offset 대신 line fallback이 선택된다.
- [ ] collapsed selection 또는 metadata 부족 시에는 current fallback으로 degrade 한다.
- [ ] markdown draft baseline이 존재하면 table selection도 저장본이 아니라 draft text를 기준으로 해석한다.

### Feature: F48.1 Table-aware rendered comment marker mapping

**Priority**: Medium
**Category**: Comment UX / Visual Mapping
**Target Component**: `src/code-comments/comment-line-index.ts`, `src/spec-viewer/spec-viewer-panel.tsx`
**Target Section**: `/_sdd/spec/comments-and-export/contracts.md` > `5. marker / hover preview 규칙`

**Description**:
table-origin comments가 rendered markdown에서 더 자연스러운 위치에 보이도록, marker mapping에 table-aware 우선순위를 도입한다. table context에서는 same cell 또는 same row candidate를 우선 매핑하고, 일반 markdown은 기존 nearest line 규칙을 유지한다.

**Acceptance Criteria**:

- [ ] table comment marker가 unrelated paragraph 또는 table 외부 block으로 이동하지 않는다.
- [ ] table 전체 block marker만 남는 현재 bias가 줄어든다.
- [ ] 기존 lower-line-preferred tie-break는 table-aware candidate가 없을 때만 적용된다.

## Improvements

### Improvement: table selection + repeated-text ambiguity 회귀 테스트를 paragraph/list/blockquote와 분리해 고정

**Priority**: High
**Target Section**: `/_sdd/spec/spec-viewer/overview.md` > `7. 핵심 테스트`; `/_sdd/spec/spec-viewer/contracts.md` > `7. 관련 테스트`; `/_sdd/spec/comments-and-export/contracts.md` > `8. 관련 테스트`

**Current State**:
현재 테스트는 table cell line 우선순위 일부만 고정하고 있고, exact offset/comment marker/inline formatting/fallback degrade를 함께 묶어 보지 않는다. repeated rendered text ambiguity에 대해 "exact offset을 버리고 fallback해야 한다"는 계약도 명시적으로 고정되어 있지 않다.

**Proposed**:
table 중심 regression matrix를 추가하되, repeated text ambiguity를 독립 축으로 함께 고정한다. plain cell text, inline code, strong/emphasis, link text, repeated cell text, repeated inline text outside table, collapsed selection fallback, marker hover mapping을 각각 분리해 테스트한다.

**Reason**:
table mapping은 generic paragraph flow와 실패 양상이 다르므로, 별도 회귀 축이 없으면 이후 renderer/resolver 변경 때 쉽게 다시 깨진다.

## Failure Modes

| 시나리오 | 실패 시 | 사용자 가시성 | 처리 방안 |
|---|---|---|---|
| 동일 row에 동일한 cell text가 반복됨 | wrong exact offset 선택 가능 | `Go to Source`가 인접 cell 근처로 감 | exact path를 보수적으로 채택하고 ambiguity 감지 시 line fallback |
| paragraph/list/blockquote 안에서 같은 inline text가 반복됨 | wrong exact offset 선택 가능 | comment가 같은 줄의 다른 token에 붙어 보일 수 있음 | repeated-text ambiguity를 공통 규칙으로 처리하고 exact offset drop |
| escaped pipe / complex GFM cell content | exact offset 계산 실패 | line은 맞지만 token-level selection은 없음 | exact path를 포기하고 current line fallback 유지 |
| multi-node selection이 서로 다른 cell을 가로지름 | overly broad range 또는 ambiguous target | comment가 row/table 수준으로 보일 수 있음 | 이번 범위는 same-cell 우선, cross-cell selection은 normalized line range + fallback 허용 |
| marker mapping만 바꾸고 source action은 그대로 둠 | marker 위치와 comment 저장 위치가 다시 어긋남 | hover 위치와 jump 위치 불일치 | source action과 marker mapping을 같은 feature scope에서 검증 |
| table hardening이 일반 paragraph 경로를 침범함 | existing spec comment UX regression | paragraph/list/blockquote behavior change | table-specific predicate와 dedicated tests로 scope 분리 |

## Notes

### Context

현재 구현은 `td`/`th`에 line metadata를 부여하고 text leaf wrapping도 일부 수행하지만, table에서는 source markdown의 pipe syntax와 rendered DOM 구조 차이 때문에 exact offset path가 충분히 안정적이지 않다. 또한 [`source-line-resolver.ts`](../../src/spec-viewer/source-line-resolver.ts) 의 substring 기반 exact offset 경로는 repeated text에서 오탐 가능성이 있다. 그 결과 사용자는 table cell comment가 “대충 가까운 line”에 달리거나, 같은 line 안의 다른 토큰에 붙는 것처럼 체감할 수 있다.

### Constraints

- 기본 selection 모델은 계속 line range다.
- optional exact offset은 additive metadata여야 하며 old comment schema를 깨면 안 된다.
- same-path markdown draft가 있을 때는 table mapping도 draft baseline을 따라야 한다.
- paragraph/list/blockquote의 기존 exact/fallback 동작은 유지해야 한다.
- table hardening은 `Go to Source`, `Add Comment`, marker hover mapping을 함께 고려해야 한다.
- repeated text ambiguity에서는 exact offset 정확도보다 false-positive 방지가 우선이다.
- 이번 범위는 same-cell selection hardening까지만 다루고, cross-cell selection은 기존 normalized line range + fallback을 유지한다.

## Resolved Decisions

1. marker는 `td/th` 전체보다 same-cell 대표 anchor node를 우선 사용하고, 대표 anchor를 찾지 못한 경우에만 `td/th` 또는 same-row candidate로 fallback 한다.
2. repeated text ambiguity는 table 전용 heuristic이 아니라 공통 `source span uniqueness check`로 처리한다. candidate source span 안에서 rendered text가 유일할 때만 exact offset을 채택하고, ambiguity가 있으면 exact offset을 drop한다.
3. 이번 범위는 same-cell selection hardening까지만 포함한다. cross-cell drag selection은 기존 normalized line range + fallback을 유지하고 후속 범위로 남긴다.

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

이번 작업의 목표는 spec viewer의 GFM table에서 comment/source anchor를 generic fallback 의존 상태에서 꺼내고, repeated rendered text가 있는 exact mapping을 더 보수적으로 만드는 것이다. 구현은 네 갈래로 나뉜다: table-aware source metadata 보강, resolver의 same-cell exact mapping 우선화, repeated-text ambiguity guard, rendered marker mapping hardening. 핵심은 paragraph/list/blockquote 경로를 불필요하게 흔들지 않으면서 table과 repeated-text failure mode를 함께 줄이는 것이다. marker는 same-cell 대표 anchor node 기준으로 배치하고, scope는 same-cell selection hardening까지만 제한한다.

## Scope

### In Scope

- `td`/`th` 및 그 하위 leaf의 source metadata/offset contract 보강
- table cell selection의 line range + optional exact offset 계산 안정화
- repeated text ambiguity에서 false-positive exact offset 방지
- table-origin `Add Comment` / `Go to Source` integration hardening
- table-aware comment marker mapping 및 hover regression 보강
- table 전용 renderer/resolver/unit/integration test 추가

### Out of Scope

- markdown 원문 수정 후 stale offset re-anchor
- cross-file semantic linking
- paragraph/list/blockquote selection 모델 재설계
- full token snapping for collapsed right-click without usable metadata
- cross-cell selection hardening
- table 외 markdown 구조의 UX 재정의

## Components

1. **Table Source Metadata Layer**: `td`/`th`와 text leaf의 source span/offset contract
2. **Table Resolver Layer**: same-cell selection에서 exact offset과 line range를 우선 계산
3. **Ambiguity Guard Layer**: repeated text exact mapping을 보수적으로 채택
4. **Marker Mapping Layer**: table-origin comments의 rendered marker 배치 보강
5. **Validation Layer**: table-specific + repeated-text regression matrix 고정

## Implementation Phases

### Phase 1: Metadata contract hardening

| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T1 | table cell source metadata와 leaf wrapping contract를 정리한다 | P0 | - | Table Source Metadata Layer |

### Phase 2: Resolver upgrade

| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T2 | table selection과 repeated-text ambiguity guard를 함께 resolver에 통합한다 | P0 | T1 | Table Resolver Layer |

### Phase 3: Marker and panel integration

| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T3 | table-aware marker mapping과 source action wiring을 통합한다 | P1 | T2 | Marker Mapping Layer |

### Phase 4: Regression coverage

| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T4 | table 전용 unit/integration regression matrix를 추가한다 | P0 | T1, T2, T3 | Validation Layer |

## Task Details

### Task T1: table cell source metadata와 leaf wrapping contract를 정리한다

**Component**: Table Source Metadata Layer
**Priority**: P0
**Type**: Feature

**Description**:
`td`/`th` 및 table cell 내부 text leaf에 대해 source line span과 source offset span이 일관되게 노출되도록 metadata contract를 정리한다. 목표는 resolver가 generic block span 대신 cell-local metadata를 먼저 읽을 수 있게 만드는 것이다.

**Acceptance Criteria**:

- [ ] `td`/`th` 내부 plain text leaf가 source offset metadata를 안정적으로 노출한다.
- [ ] inline code, link text, strong/em inside table cell도 existing source metadata contract를 재사용할 수 있다.
- [ ] whitespace-only leaf나 의미 없는 wrapper는 metadata noise를 늘리지 않는다.
- [ ] paragraph/list/blockquote text leaf wrapping behavior는 회귀하지 않는다.

**Target Files**:
- [M] `src/spec-viewer/source-line-metadata.ts` -- table cell에 필요한 line/offset metadata contract 정리
- [M] `src/spec-viewer/rehype-source-text-leaves.ts` -- table cell descendant wrapping 규칙 보강
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- `td`/`th` renderer가 metadata contract를 일관되게 소비하도록 정리
- [C] `src/spec-viewer/rehype-source-text-leaves.test.ts` -- table cell leaf wrapping / skip cases regression
- [M] `src/spec-viewer/source-line-metadata.test.ts` -- table node offset span normalization regression

**Technical Notes**:

- 기존 `data-source-text-leaf` wrapper를 재사용하되, table 문맥에서 ambiguity를 줄일 수 있는 최소 contract만 추가하는 편이 안전하다.
- metadata를 table block 전체에 더 많이 뿌리기보다, resolver가 신뢰할 수 있는 cell-local leaf를 강화하는 쪽이 정확도와 회귀 위험의 균형이 좋다.

**Dependencies**: -

### Task T2: table selection과 repeated-text ambiguity guard를 함께 resolver에 통합한다

**Component**: Table Resolver Layer
**Priority**: P0
**Type**: Feature

**Description**:
`source-line-resolver`가 table selection을 감지하면 generic span ratio 추정보다 same-cell exact mapping 경로를 먼저 시도하도록 확장한다. 동시에 exact offset 후보 span 안에서 repeated rendered text ambiguity를 감지하면 optimistic exact path를 버리고 fallback을 택하도록 만든다. selection anchor/focus가 같은 cell 안에 있을 때는 line range와 optional exact offset을 우선 계산하고, ambiguous/cross-cell case만 fallback으로 내려간다.

**Acceptance Criteria**:

- [ ] same-cell plain text selection에서 cell line이 반환된다.
- [ ] same-cell inline code/link/strong selection에서 가능한 경우 exact offset range가 반환된다.
- [ ] repeated cell text 또는 repeated inline text ambiguity는 잘못된 exact offset보다 fallback을 우선한다.
- [ ] cross-cell selection은 normalized line range 또는 fallback으로 안전하게 degrade 한다.
- [ ] code fence와 일반 paragraph/list/blockquote path는 기존 behavior를 유지한다.

**Target Files**:
- [M] `src/spec-viewer/source-line-resolver.ts` -- table-specific exact mapping 우선 경로 추가
- [M] `src/spec-viewer/source-line-resolver.test.ts` -- same-cell exact path / repeated text / cross-cell fallback regression
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- context menu selection resolution이 새 resolver semantics를 반영하도록 유지

**Technical Notes**:

- 우선순위는 `same-cell annotated leaf -> same-cell node span -> current generic line fallback` 순이 적합하다.
- `rawSlice.indexOf(renderedText)` 류의 약한 매칭은 repeated cell text뿐 아니라 일반 repeated inline text에서도 오탐을 만들 수 있으므로, exact path는 uniqueness check를 통과할 때만 채택하는 편이 낫다.
- cross-cell selection은 이번 범위에서 새 heuristic을 도입하지 않고 기존 normalized line range + fallback 계약을 유지한다.

**Dependencies**: T1

### Task T3: table-aware marker mapping과 source action wiring을 통합한다

**Component**: Marker Mapping Layer
**Priority**: P1
**Type**: Improvement

**Description**:
table-origin comments의 rendered marker가 자연스러운 cell/row 근처에 보이도록 marker mapping을 보강한다. source action 저장 위치와 marker 표시 위치가 다시 분리되지 않도록 `spec-viewer-panel`의 rendered source line collection 및 marker resolution 경로를 함께 검토한다.

**Acceptance Criteria**:

- [ ] table-origin comments는 same-cell 대표 anchor node가 있으면 그것을 우선 사용하고, 없으면 `td/th` 또는 same-row candidate를 순차 fallback으로 사용한다.
- [ ] table-aware candidate가 없을 때만 current lower-line-preferred nearest fallback을 사용한다.
- [ ] hover preview와 marker count aggregation은 기존 ordering 규칙을 유지한다.
- [ ] paragraph/list/blockquote marker placement는 회귀하지 않는다.

**Target Files**:
- [M] `src/code-comments/comment-line-index.ts` -- table-aware marker mapping helper 또는 우선순위 보강
- [M] `src/code-comments/comment-line-index.test.ts` -- table-aware marker mapping regression
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- rendered source line collection / marker resolution integration 보강
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- table marker hover/render placement regression

**Technical Notes**:

- table-specific rule를 generic helper 안으로 넣을지, `spec-viewer-panel`에서 table candidates를 먼저 좁힐지는 구현 직전 결정이 필요하다.
- 저장 위치와 marker 위치가 다른 기준을 쓰지 않도록 source action과 marker mapping의 source-of-truth line을 맞춰야 한다.
- marker anchor 우선순위는 `same-cell 대표 anchor node -> td/th -> same-row candidate -> generic nearest fallback`이 적합하다.

**Dependencies**: T2

### Task T4: table 전용 unit/integration regression matrix를 추가한다

**Component**: Validation Layer
**Priority**: P0
**Type**: Test

**Description**:
table hardening과 repeated-text ambiguity guard를 별도 regression matrix로 고정한다. unit test는 metadata/resolver/mapping을 다루고, integration test는 spec panel의 `Add Comment`, `Go to Source`, marker hover까지 묶어 검증한다.

**Acceptance Criteria**:

- [ ] plain table cell text selection regression이 추가된다.
- [ ] inline code / link / strong-em inside cell regression이 추가된다.
- [ ] repeated cell text ambiguity fallback regression이 추가된다.
- [ ] repeated inline text outside table ambiguity fallback regression이 추가된다.
- [ ] collapsed selection fallback regression이 추가된다.
- [ ] marker render/hover regression이 추가된다.

**Target Files**:
- [M] `src/spec-viewer/source-line-resolver.test.ts` -- table selection/fallback + repeated-text ambiguity matrix 확장
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- `Add Comment`, `Go to Source`, marker hover + repeated-text integration 확장
- [M] `src/code-comments/comment-line-index.test.ts` -- table-aware marker mapping regression
- [M] `src/spec-viewer/source-line-metadata.test.ts` -- table source span/unit regression
- [C] `src/spec-viewer/rehype-source-text-leaves.test.ts` -- table leaf wrapping regression

**Technical Notes**:

- table hardening은 generic markdown 흐름과 failure mode가 다르므로, 새 테스트 이름도 `table cell`과 `repeated text ambiguity` 축이 바로 보이게 짓는 편이 유지보수에 유리하다.
- integration은 same markdown string 기준으로 line range와 exact offset을 함께 검증해야 한다.

**Dependencies**: T1, T2, T3

## Parallel Execution Summary

- T1은 metadata contract와 leaf wrapping에 집중하므로 초기 선행 작업으로 고정하는 편이 좋다.
- T2는 T1의 contract가 정리된 뒤 병행 가능성이 낮은 핵심 resolver 작업이다.
- T3는 저장/점프 기준선이 정해진 뒤 진행해야 하므로 T2 이후가 안전하다.
- T4는 일부 test file이 T1/T2/T3와 겹치므로 완전 병렬보다는 feature 구현 직후 순차 마감이 적합하다.
- 병렬화를 꼭 한다면 `rehype-source-text-leaves.test.ts`와 `comment-line-index.test.ts` 일부 초안 정도만 분리 가능하고, `spec-viewer-panel.tsx`와 `source-line-resolver.ts`는 순차 처리 권장이다.

## Risks and Mitigations

- table hardening이 generic resolver 흐름을 오염시킬 수 있다.
  - mitigation: table-specific predicate를 먼저 두고 paragraph/list/blockquote path는 분리 유지
- repeated cell text나 일반 repeated inline text에서 false-positive exact offset이 생길 수 있다.
  - mitigation: exact path는 보수적으로 채택하고 ambiguity가 감지되면 fallback을 선택
- same-cell anchor를 잘못 고르면 marker가 셀 내부에서 어색한 위치로 붙을 수 있다.
  - mitigation: 대표 anchor node 규칙을 단순하게 유지하고, 없으면 `td/th` fallback을 사용
- marker mapping과 source action 기준선이 다시 갈라질 수 있다.
  - mitigation: integration test에서 저장 line, jump line, marker line을 함께 검증
- GFM edge case가 많아 구현 범위가 커질 수 있다.
  - mitigation: same-cell selection hardening을 MVP로 두고 cross-cell/complex table은 fallback 허용

## Open Questions

1. repeated text ambiguity를 더 공격적으로 풀려면 table-specific 또는 generic source tokenization이 필요한지 검토가 필요하다.
