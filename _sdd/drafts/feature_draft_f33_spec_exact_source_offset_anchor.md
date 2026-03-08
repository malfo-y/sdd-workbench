# Feature Draft: F33 Spec Viewer exact source offset anchor MVP

**Date**: 2026-03-08
**Author**: user + Codex
**Status**: 📋 Planned
**Target Spec**: `_sdd/spec/main.md` + 하위 문서

---

# Part 1: Spec Patch Draft

> 이 패치는 해당 스펙 섹션에 복사-붙여넣기하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-03-08
**Author**: user + Codex
**Target Spec**: `_sdd/spec/main.md` + 하위 문서

## New Features

### Feature: F33 Spec Viewer 코멘트/소스 액션 exact source offset anchor MVP
**Priority**: Medium  
**Category**: Comment UX / Source Mapping / Markdown Precision  
**Target Component**: `SpecViewerPanel`, `source-line-resolver`, `CodeEditorPanel`, `comment-anchor`  
**Target Section**: `_sdd/spec/main.md` > `현재 상태 요약`; `_sdd/spec/sdd-workbench/01-overview.md` > `MVP 범위`, `기능 커버리지`; `_sdd/spec/sdd-workbench/03-components.md` > `1.3 Code Viewer Layer`, `1.5 Spec Viewer Layer`; `_sdd/spec/sdd-workbench/04-interfaces.md` > `2. 링크/경로/선택 액션 규칙`, `4. 코멘트/Export 정책 계약`, `5. 마커 매핑 규칙`; `_sdd/spec/sdd-workbench/appendix.md` > `기능 이력`, `상세 수용 기준`

**Description**:  
Rendered markdown에서 선택한 텍스트를 같은 markdown 원문의 **exact source offset range**로 해석하는 MVP를 추가한다. 기존 F32의 line-level best-effort anchor 위에, 지원되는 inline 구조에서는 선택 시점 기준으로 raw markdown source의 정확한 `[startOffset, endOffset)` 범위를 계산해 `Go to Source`와 `Add Comment`에 사용한다. `Go to Source`는 Code Viewer에서 line 스크롤만이 아니라 해당 source range를 선택/강조할 수 있어야 하며, `Add Comment`는 기존 `startLine/endLine`을 유지하면서 optional offset metadata를 함께 저장할 수 있어야 한다. 단, 원문이 이후 수정되면 stored offset은 stale 될 수 있으며, 이번 MVP는 재정렬(re-anchor)이나 복구를 시도하지 않는다.

**Acceptance Criteria**:

- [ ] paragraph/list/blockquote 안의 일반 텍스트, emphasis/strong, inline code, link text처럼 지원되는 rendered inline selection은 same-file raw markdown source의 exact offset range로 해석된다.
- [ ] `Go to Source`는 지원되는 selection에 대해 Code Viewer를 해당 markdown 파일의 정확한 source range로 이동시키고, 단순 line scroll이 아니라 실제 range selection 또는 동등한 강조를 수행한다.
- [ ] `Add Comment`는 지원되는 selection에 대해 기존 `startLine/endLine`과 함께 optional exact offset range를 comment anchor metadata에 저장할 수 있다.
- [ ] fenced code block 내부 selection은 기존 line 정밀도를 유지하면서 가능하면 exact source offset range까지 계산한다.
- [ ] collapsed selection, unsupported node, offset metadata 부족, DOM/source 매핑 실패 시에는 현재 F32 line-level fallback으로 안전하게 degrade 된다.
- [ ] comment marker, spec search, file search, export 흐름, comment list/sort 규칙은 기존 동작을 유지하고 exact offset 정보는 additive contract로만 도입된다.
- [ ] markdown 원문이 코멘트 생성 또는 jump 이후 변경되어 offset이 stale 되더라도, 이번 MVP는 자동 복구를 요구하지 않으며 최대 line-level fallback까지만 허용한다.

**Technical Notes**:

- 이번 범위는 rendered markdown와 **같은 markdown 원문 파일** 사이의 exact mapping이다. prose에서 다른 코드 파일 토큰으로 semantic link를 거는 기능은 포함하지 않는다.
- exact range는 0-based half-open interval인 `[startOffset, endOffset)`로 정의한다.
- block marker/search용 `data-source-line` 계열은 유지하고, exact mapping용 offset metadata는 별도 attribute 또는 동등한 DOM contract로 추가한다.
- global `LineSelectionRange` 모델을 전면 교체하지 않고, spec source action/comment 경로에만 optional exact offset payload를 추가하는 것을 기본값으로 한다.
- old comment JSON은 그대로 유효해야 하며, new optional offset metadata가 없는 comment도 계속 동작해야 한다.

**Dependencies**:

- F10.1 Markdown Selection `Go to Source`
- F11.1 Rendered Markdown `Add Comment`
- F24 CodeMirror 6 기반 코드 에디터
- F32 Spec Viewer 코멘트/source action line anchor 정밀도 개선

## Improvements

### Improvement: Spec Viewer source metadata 계약을 line span에서 exact offset span까지 확장
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`; `_sdd/spec/sdd-workbench/04-interfaces.md` > `5. 마커 매핑 규칙`  
**Current State**: 현재 renderer/resolver는 `data-source-line`, `data-source-line-start/end` 기반으로 line-level best-effort 해석만 제공한다.  
**Proposed**: renderer가 지원되는 inline leaf 또는 동등한 wrapper에 `sourceOffsetStart/sourceOffsetEnd` metadata를 제공하고, resolver가 selection DOM range를 exact source offset range로 계산하도록 확장한다.  
**Reason**: 스펙 뷰어에서 선택한 단어/토큰이 code view의 실제 raw markdown 위치와 더 정확하게 대응되게 하기 위함이다.

### Improvement: Code Viewer jump 계약을 line scroll에서 exact range selection까지 확장
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.3 Code Viewer Layer`; `_sdd/spec/sdd-workbench/04-interfaces.md` > `2. 링크/경로/선택 액션 규칙`  
**Current State**: `CodeViewerJumpRequest`는 `lineNumber`만 전달해 line scroll만 수행한다.  
**Proposed**: jump request가 optional exact offset range를 전달할 수 있게 하고, CodeMirror가 해당 source range를 실제 selection 또는 동등한 시각 강조로 반영하도록 확장한다.  
**Reason**: spec viewer에서 선택한 텍스트를 code tab에서 정확히 확인할 수 있어야 하기 때문이다.

### Improvement: Comment anchor persistence에 optional source offset metadata 추가
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/04-interfaces.md` > `4. 코멘트/Export 정책 계약`  
**Current State**: comment anchor는 snippet/hash/before/after와 `startLine/endLine`만 저장한다.  
**Proposed**: exact selection이 가능한 경우 `CodeCommentAnchor`에 optional `startOffset/endOffset`를 저장하고, parser/serializer는 backward-compatible하게 이를 처리한다.  
**Reason**: 스펙 뷰어 origin comment가 line 범위를 넘어 raw markdown의 더 정확한 위치를 보존할 수 있어야 하기 때문이다.

## Component Changes

### Component Change: Spec Viewer exact source metadata layer 추가
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- markdown node position에서 line뿐 아니라 offset span도 정규화하는 helper를 추가한다.
- 지원되는 rendered inline leaf에 exact source offset metadata를 부여한다.
- marker/search용 대표 block metadata와 interactive exact metadata의 책임을 분리한다.

### Component Change: `source-line-resolver`를 offset-aware source resolver로 확장
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- selection anchor/focus DOM range를 line range뿐 아니라 source offset range까지 계산할 수 있게 확장한다.
- collapsed selection 또는 unsupported structure는 F32 line fallback을 유지한다.
- code fence 전용 경로와 일반 markdown inline 경로를 함께 유지한다.

### Component Change: Code Viewer / Comment subsystem exact range 지원
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.3 Code Viewer Layer`; `_sdd/spec/sdd-workbench/04-interfaces.md` > `2. 링크/경로/선택 액션 규칙`, `4. 코멘트/Export 정책 계약`  
**Type**: Existing Component Extension  
**Change Summary**:

- `CodeViewerJumpRequest`가 optional exact offset range를 받을 수 있게 한다.
- `Add Comment` 저장 경로는 기존 line range를 유지하되 optional offset metadata를 함께 저장할 수 있게 한다.
- exact range가 없는 기존 comment/jump payload는 그대로 유효해야 한다.

## Notes

### Scope Boundary

- 이번 범위는 rendered markdown에서 **선택된 텍스트**를 raw markdown source의 exact offset range로 연결하는 MVP다.
- right-click point action만으로 nearest token을 자동 추정하는 고급 snapping은 이번 기본 범위에 포함하지 않는다.
- markdown 원문 변경 후 re-anchor, relocation, context-hash 기반 복구는 범위 밖이다.
- HTML block, image alt, raw HTML, 복잡한 GFM edge case 등 exact mapping 품질이 불안정한 구조는 line fallback을 허용한다.

### Context

F32로 line anchor 정밀도는 올라갔지만, 실제로 스펙 뷰어에서 특정 단어/토큰을 선택했을 때 code tab에서는 해당 줄 전체만 보이는 한계가 남아 있다. 사용자는 현재 원문 변경 후 복구를 요구하지 않으므로, selection 시점 기준 exact offset mapping만 도입해도 체감 가치를 크게 올릴 수 있다.

### Open Questions

- [ ] GFM table cell text를 이번 MVP의 기본 지원 구조에 포함할지, paragraph/list/blockquote/inline code/link 우선 후 phase 2로 미룰지는 구현 전 node position 품질을 보고 최종 확정할 수 있다. draft 기본값은 "table은 best-effort, 실패 시 fallback"이다.
- [ ] plain text leaf에 exact offset metadata를 안정적으로 부여하려면 rehype/AST 단계 wrapper가 필요할 가능성이 높다. draft 기본값은 "필요하면 작은 helper/plugin 추가"다.
- [ ] collapsed selection에 대해 nearest inline leaf 전체 span을 자동 선택할지는 후속 옵션이다. draft 기본값은 "collapsed selection은 F32 fallback 유지"다.

---

# Part 2: Implementation Plan

# Implementation Plan: F33 Spec Viewer exact source offset anchor MVP

## Overview

F33은 rendered markdown에서 사용자가 선택한 텍스트를 같은 markdown 원문의 exact source offset range로 매핑한다. 핵심은 renderer가 지원되는 inline 구조에 offset metadata를 제공하고, resolver가 selection DOM range를 `[startOffset, endOffset)`로 해석하며, comment/jump 계층이 그 결과를 additive contract로 소비하도록 만드는 것이다.

## Scope

### In Scope

- markdown node position의 offset span 정규화 helper 추가
- 지원되는 rendered inline 구조에 exact source metadata 부여
- selection 기반 exact source offset resolver 추가
- `Go to Source` exact range jump/selection 지원
- spec-origin comment에 optional offset metadata 저장
- backward-compatible persistence/test 보강

### Out of Scope

- markdown 원문 수정 후 exact anchor 재정렬/recovery
- prose와 다른 코드 파일 사이의 semantic linking
- 전체 앱 selection 모델을 offset 기반으로 전면 교체
- unsupported markdown 구조의 완전한 token-perfect mapping 보장
- collapsed point action의 nearest token snapping

## Components

1. **Source Offset Metadata Layer**: markdown position -> DOM metadata 정규화
2. **Offset Resolver Layer**: rendered selection -> source offset range 계산
3. **Comment Anchor Layer**: optional offset metadata 저장/복원
4. **Code Viewer Exact Jump Layer**: exact range selection/scroll integration
5. **Validation Layer**: source mapping, persistence, integration 회귀 고정

## Implementation Phases

### Phase 1: Foundation Contracts
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | source offset metadata helper 추가 | P0 | - | Source Offset Metadata Layer |
| 2 | comment/jump exact range 계약 확장 | P0 | 1 | Comment Anchor Layer |

### Phase 2: Renderer and Resolver
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | Spec Viewer renderer exact metadata 확장 | P0 | 1 | Source Offset Metadata Layer |
| 4 | offset-aware selection resolver 추가 | P0 | 1, 3 | Offset Resolver Layer |

### Phase 3: Integration and Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 5 | App/Code Viewer exact jump + comment wiring 통합 | P1 | 2, 4 | Code Viewer Exact Jump Layer |
| 6 | persistence/integration regression test 확장 | P0 | 2, 4, 5 | Validation Layer |

## Task Details

### Task 1: source offset metadata helper 추가
**Component**: Source Offset Metadata Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
markdown node position에서 line뿐 아니라 offset span도 정규화하는 helper를 추가한다. helper는 기존 `data-source-line` 호환을 유지하면서 optional exact offset metadata를 함께 조립할 수 있어야 한다.

**Acceptance Criteria**:

- [ ] markdown node `position.start.offset` / `position.end.offset`를 0 이상 정수의 half-open range로 정규화할 수 있다.
- [ ] line span metadata와 offset span metadata를 함께 생성하거나, 일부만 유효할 때 안전하게 `undefined` 처리할 수 있다.
- [ ] 기존 marker/search용 line metadata 호출부와 호환된다.
- [ ] helper는 DOM/React에 결합되지 않은 순수 함수 중심 구조로 유지된다.

**Target Files**:
- [M] `src/spec-viewer/source-line-metadata.ts` -- line + offset metadata helper 확장
- [M] `src/spec-viewer/source-line-metadata.test.ts` -- offset normalization/unit test
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- helper 소비 준비 및 기존 metadata call-site 정리

**Technical Notes**:

- offset contract는 normalized LF text 기준 0-based `[startOffset, endOffset)`를 기본값으로 둔다.
- invalid pair(`start > end`, negative, NaN)는 drop하고 caller가 fallback을 택하게 하는 편이 안전하다.

**Dependencies**: -

### Task 2: comment/jump exact range 계약 확장
**Component**: Comment Anchor Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
global `LineSelectionRange`를 전면 교체하지 않고, spec-origin action이 optional exact offset range를 전달/저장할 수 있도록 comment model과 jump contract를 확장한다. old comment schema는 그대로 파싱되어야 한다.

**Acceptance Criteria**:

- [ ] `CodeCommentAnchor`가 optional `startOffset/endOffset` 또는 동등한 exact range 필드를 가질 수 있다.
- [ ] `createCommentAnchor` / `buildCodeComment`가 optional offset range 입력을 받되, 미제공 시 현재 line-based 동작을 유지한다.
- [ ] comment JSON parser/serializer가 new optional field를 round-trip하면서 old schema도 계속 수용한다.
- [ ] `CodeViewerJumpRequest` 또는 동등한 jump contract가 optional exact range payload를 전달할 수 있다.

**Target Files**:
- [M] `src/code-comments/comment-types.ts` -- optional exact offset field 추가
- [M] `src/code-comments/comment-anchor.ts` -- offset-aware anchor build path
- [M] `src/code-comments/comment-persistence.ts` -- backward-compatible parse/serialize
- [M] `src/code-editor/code-editor-panel.tsx` -- jump request type 확장
- [M] `src/code-comments/comment-anchor.test.ts` -- anchor contract regression
- [M] `src/code-comments/comment-persistence.test.ts` -- schema compatibility regression

**Technical Notes**:

- comment 정렬/집계/marker 인덱스는 기존 `startLine/endLine` 기준을 유지하는 편이 영향 범위를 줄인다.
- comment id는 현재 line/hash/timestamp 체계를 유지해도 충분하다.

**Dependencies**: 1

### Task 3: Spec Viewer renderer exact metadata 확장
**Component**: Source Offset Metadata Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
Spec Viewer renderer가 지원되는 inline 구조에 exact source offset metadata를 부여하도록 확장한다. paragraph/list/blockquote 내부 텍스트, emphasis/strong, inline code, link text를 우선 지원하고, 기존 block marker/search highlight 동작은 유지한다.

**Acceptance Criteria**:

- [ ] 지원되는 rendered inline 구조에 exact source offset metadata가 부여된다.
- [ ] marker/search 대표 block용 line metadata는 그대로 유지된다.
- [ ] plain text leaf 처리에 별도 wrapper/helper가 필요하면 최소 범위의 plugin/helper로 해결한다.
- [ ] collapsed selection 또는 unsupported node는 exact metadata가 없어도 기존 UX를 깨뜨리지 않는다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- inline renderer/wrapper 확장
- [M] `src/spec-viewer/source-line-metadata.ts` -- renderer용 offset prop builder 보강
- [C] `src/spec-viewer/source-offset-plugin.ts` -- 필요 시 inline text wrapper/helper
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- rendered metadata regression

**Technical Notes**:

- ReactMarkdown component override만으로 plain text leaf metadata가 부족하면 rehype 단계 wrapper가 더 현실적이다.
- exact metadata와 comment marker class를 같은 DOM node에 무분별하게 겹치지 않도록 책임을 분리한다.

**Dependencies**: 1

### Task 4: offset-aware selection resolver 추가
**Component**: Offset Resolver Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
resolver가 selection anchor/focus DOM range를 exact source offset range로 해석하도록 확장한다. partial selection inside annotated leaf를 지원하고, multi-node selection은 정규화된 min/max offset range로 합친다. exact 해석이 불가능하면 F32 line fallback을 유지한다.

**Acceptance Criteria**:

- [ ] annotated inline leaf 내부 partial text selection은 leaf 전체가 아니라 실제 선택 구간의 exact offset range로 계산된다.
- [ ] 여러 annotated leaf에 걸친 selection은 정규화된 `{ startOffset, endOffset }` 범위를 반환할 수 있다.
- [ ] code fence selection은 newline-aware line path를 유지하면서 가능하면 exact offset range를 함께 계산한다.
- [ ] collapsed selection, unsupported structure, metadata 누락 시 기존 line fallback 또는 `null` 반환으로 안전하게 degrade 된다.

**Target Files**:
- [M] `src/spec-viewer/source-line-resolver.ts` -- offset-aware resolver 로직
- [M] `src/spec-viewer/source-line-resolver.test.ts` -- partial/multi-node/fallback regression
- [M] `src/spec-viewer/source-line-metadata.ts` -- resolver가 읽는 attribute contract 확정

**Technical Notes**:

- DOM `Range` 길이를 그대로 source offset으로 쓰지 말고, annotated leaf 내부 local offset을 source span에 더하는 방식이 안전하다.
- 반환 타입은 line range와 optional offset range를 함께 담는 구조가 integration에 유리하다.

**Dependencies**: 1, 3

### Task 5: App/Code Viewer exact jump + comment wiring 통합
**Component**: Code Viewer Exact Jump Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:  
Spec Viewer의 `Go to Source`와 `Add Comment`가 improved resolver 결과를 소비하도록 App과 Code Viewer를 연결한다. exact offset range가 있으면 CodeMirror에서 해당 range를 선택/강조하고, 없으면 기존 line scroll로 동작한다.

**Acceptance Criteria**:

- [ ] spec-origin `Go to Source`는 optional exact offset range를 jump request에 전달할 수 있다.
- [ ] Code Viewer는 optional exact range가 있으면 해당 source range를 selection 또는 동등한 강조 상태로 보여준다.
- [ ] spec-origin `Add Comment`는 optional exact offset range를 comment build path에 전달할 수 있다.
- [ ] 기존 code-origin comment 생성, comment jump, line-only spec action은 회귀하지 않는다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- source popover/action payload 확장
- [M] `src/App.tsx` -- commentDraftState / jump request wiring 확장
- [M] `src/code-editor/code-editor-panel.tsx` -- exact range selection/scroll integration
- [M] `src/App.test.tsx` -- spec-origin action integration regression
- [M] `src/code-editor/code-editor-panel.test.tsx` -- exact jump selection regression

**Technical Notes**:

- global workspace selection state는 line-based로 유지하고, exact offset range는 jump/comment payload에만 추가하는 편이 구현 비용이 낮다.
- CodeMirror selection은 doc length clamp와 active file mismatch guard를 유지해야 한다.

**Dependencies**: 2, 4

### Task 6: persistence/integration regression test 확장
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:  
exact offset mapping은 renderer/resolver/model/integration이 동시에 맞아야 하므로, 단위 테스트와 통합 테스트를 함께 보강한다. old comment schema compatibility와 unsupported fallback도 반드시 고정한다.

**Acceptance Criteria**:

- [ ] metadata helper/unit test가 offset normalization과 invalid input drop을 검증한다.
- [ ] resolver test가 partial inline selection, multi-node selection, fallback degrade를 검증한다.
- [ ] comment persistence test가 new optional offset metadata round-trip과 old schema compatibility를 검증한다.
- [ ] App/Code Viewer integration test가 exact source jump/comment 저장 경로를 검증한다.

**Target Files**:
- [M] `src/spec-viewer/source-line-metadata.test.ts` -- helper regression
- [M] `src/spec-viewer/source-line-resolver.test.ts` -- resolver regression
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- rendered selection regression
- [M] `src/code-comments/comment-anchor.test.ts` -- exact offset anchor regression
- [M] `src/code-comments/comment-persistence.test.ts` -- persistence compatibility regression
- [M] `src/App.test.tsx` -- end-to-end spec-origin action regression
- [M] `src/code-editor/code-editor-panel.test.tsx` -- exact jump selection regression

**Technical Notes**:

- exact selection 테스트는 DOM selection mock과 CodeMirror selection assertion을 분리하는 편이 안정적이다.
- old stored comments fixture를 유지해 schema drift 회귀를 방지한다.

**Dependencies**: 2, 4, 5

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| plain text leaf는 ReactMarkdown component override만으로 metadata를 붙이기 어려움 | High | 최소 범위 rehype/helper wrapper 도입을 허용하고 scope를 supported inline 구조로 제한 |
| markdown syntax marker(`**`, link brackets, code fence backticks`)와 rendered text 길이가 달라 offset 계산이 어긋날 수 있음 | High | node `position.offset` 기반 span을 우선 사용하고, unsupported structure는 fallback 처리 |
| exact range contract를 전역 selection 모델로 확장하면 영향 범위가 커짐 | Medium | spec-origin action payload에만 optional offset range를 추가하는 additive 전략 유지 |
| source 변경 후 stale offset이 오동작으로 보일 수 있음 | Medium | scope boundary에 명시하고, jump/comment 소비 측에서 최소 line fallback 또는 safe no-op 유지 |
| 대부분의 작업이 `spec-viewer-panel.tsx`, `App.tsx`, `code-editor-panel.tsx`에 모여 병렬성이 낮음 | Low | helper/model 작업을 먼저 분리하고 integration은 후속 순차 실행 |

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | Sequential (conflicts) |
|-------|-------------|--------------|------------------------|
| 1 | 2 | 2 | 0 |
| 2 | 2 | 1 | 1 |
| 3 | 2 | 1 | 1 |

## Open Questions

- [ ] exact offset range를 `CodeCommentAnchor`의 flat field로 둘지, nested `sourceRange` object로 둘지는 구현 직전 최종 선택이 필요하다. draft 기본값은 영향 범위가 작은 flat optional field다.
- [ ] table cell과 nested emphasis/link가 섞인 selection의 품질이 충분하면 MVP에 포함하고, 그렇지 않으면 paragraph/list/blockquote 우선 후 table은 fallback으로 남길 수 있다.
- [ ] `Go to Source` exact jump를 selection highlight로만 보여줄지, 임시 decoration까지 추가할지는 구현 단순성을 보고 결정한다. draft 기본값은 "실제 selection 우선, decoration은 선택 사항"이다.

## Model Recommendation

`Sonnet` → `gpt-5.3-codex` (`reasoning effort: high`)
