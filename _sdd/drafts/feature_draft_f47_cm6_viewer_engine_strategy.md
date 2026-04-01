# Feature Draft: F47 CM6 Viewer Engine Strategy

<!-- spec-update-todo-input-start -->
# Part 1: Spec Patch Draft

# Spec Update Input

**Date**: 2026-04-01
**Author**: Codex
**Target Spec**: `/_sdd/spec/code-editor/overview.md`, `/_sdd/spec/code-editor/contracts.md`, `/_sdd/spec/feature-index.md`, `/_sdd/spec/code-map.md`
**Spec Update Classification**: Improvement + Refactor

## Background & Motivation Updates

### Update: viewer-first 전환 이후 Code Viewer 구현체 전략을 명시한다
**Priority**: High
**Target Section**: `/_sdd/spec/code-editor/overview.md` > `1. 목적`, `2. 사용자 가시 동작`; `/_sdd/spec/feature-index.md` > `1. Foundation / Workspace / Viewer`

**Current State**:
F46으로 Code 탭은 제품 의미상 viewer-first로 재정의되었지만, 구현과 문서에는 여전히 "editor" vocabulary와 편집 잔여 계약이 남아 있다. 이 상태에서는 "viewer라면 CM6보다 더 단순한 렌더러로 바꿔야 하나?"라는 질문이 반복될 수 있다.

**Proposed**:
현재 Code Viewer의 기본 엔진은 계속 CodeMirror 6을 사용한다고 명시한다. viewer-first는 "에디터 엔진 제거"가 아니라 "엔진은 유지하되 제품 역할을 탐색 중심 viewer로 고정"하는 결정이다.

**Reason**:
현재 제품이 유지해야 하는 검색, selection bridge, jump/highlight, git/comment gutter, 긴 파일 대응 같은 요구는 정적 syntax highlighter보다 editor-grade engine에 더 잘 맞는다. CM6는 이 요구를 충족하면서도 read-only mode를 안정적으로 지원한다.

## Design Changes

### Design Change: Code Viewer는 CM6 read-only engine을 표준 구현으로 유지한다
**Priority**: High
**Target Section**: `/_sdd/spec/code-editor/overview.md` > `2. 사용자 가시 동작`, `4.2 검색 / wrap / fallback`, `4.3 jump와 highlight`; `/_sdd/spec/code-editor/contracts.md` > `3. 전역 불변식`

**Description**:
Code Viewer의 표준 렌더링 엔진은 CodeMirror 6 read-only 구성으로 유지한다. 다음 기능은 CM6 viewer contract의 핵심으로 취급한다.

- `Cmd+F` 검색
- line wrap 토글
- selection bridge
- spec-origin jump / temporary navigation highlight
- git line marker
- comment gutter / comment hover
- 긴 텍스트 파일에서의 스크롤/selection 안정성

다음은 이번 단계의 명시적 비목표로 둔다.

- Monaco 기반 재구현
- Shiki 또는 정적 syntax highlighter 기반 custom viewer 이관
- viewer-first를 이유로 CM6 extension/gutter 계층을 제거하는 작업

**Acceptance Criteria**:
- [ ] Code Viewer의 표준 구현체가 CM6 read-only engine임이 문서화된다.
- [ ] 검색, wrap, selection, jump/highlight, git/comment marker를 CM6 viewer contract의 핵심으로 명시한다.
- [ ] "viewer-first = 정적 렌더러 전환"이 아님을 분명히 한다.
- [ ] Monaco/Shiki/custom static viewer migration은 이번 범위 밖이라고 명시한다.

### Design Change: Code Viewer public surface에서 editor 잔여 계약을 줄인다
**Priority**: High
**Target Section**: `/_sdd/spec/code-editor/overview.md` > `3. 핵심 상태와 source of truth`, `4.1 편집과 저장`; `/_sdd/spec/code-editor/contracts.md` > `2. 핵심 타입`, `3. 전역 불변식`

**Description**:
`CodeEditorPanel`은 내부 엔진으로 CM6를 계속 사용하되, 제품 표면과 컴포넌트 계약에서는 editor residue를 줄인다. viewer-first 이후 더 이상 핵심 경로가 아닌 `editable`, `onSave`, `onContentChange`, dirty bridge, `Mod-s` save keybinding 같은 계약은 축소 또는 제거 후보로 분류한다.

**Acceptance Criteria**:
- [ ] viewer-only 경로에서 더 이상 editor-centric props를 필수 전제로 두지 않는다.
- [ ] `CodeEditorPanel`의 public contract는 viewer 역할과 일치하도록 정리된다.
- [ ] 저장/dirty 관련 로직은 CM6 viewer contract의 핵심 요구사항으로 남지 않는다.
- [ ] 남겨야 하는 editor-local state는 selection/search/navigation 같은 viewer 기능을 위해서만 유지한다.

## New Features

### Feature: F47 CM6 viewer engine decision
**Priority**: High
**Category**: Architecture / UX Stability
**Target Component**: `src/code-editor/code-editor-panel.tsx`, `src/code-editor/code-editor-panel.test.tsx`
**Target Section**: `/_sdd/spec/code-editor/overview.md` > `1. 목적`, `2. 사용자 가시 동작`, `4.2 검색 / wrap / fallback`, `4.3 jump와 highlight`

**Description**:
Code Viewer 구현체를 별도 엔진으로 교체하지 않고 CM6 read-only engine으로 유지한다. 이 결정은 viewer-first UX와 기술 구현을 연결하는 기준점이며, 이후 기능 추가도 CM6 extension 중심으로 설계한다.

**Acceptance Criteria**:
- [ ] Code Viewer가 유지해야 하는 기능 요구가 CM6 viewer contract로 정리된다.
- [ ] CM6가 단순 syntax highlighting이 아니라 interaction-capable viewer engine으로 설명된다.
- [ ] 향후 기능 초안/구현이 CM6 extension 경로를 우선 선택하도록 기준을 제공한다.

### Feature: F47.1 editor residue cleanup for viewer-first
**Priority**: Medium
**Category**: Refactor
**Target Component**: `src/code-editor/code-editor-panel.tsx`, `src/App.tsx`
**Target Section**: `/_sdd/spec/code-editor/overview.md` > `4.1 편집과 저장`, `4.2 검색 / wrap / fallback`; `/_sdd/spec/code-map.md` > `Renderer`

**Description**:
viewer-first 전환 이후에도 남아 있는 editor-centric prop surface와 keybinding residue를 정리한다. 목표는 CM6를 버리는 것이 아니라, CM6를 "viewer engine"으로 더 정확히 드러내는 것이다.

**Acceptance Criteria**:
- [ ] viewer-only 제품 경로에서 더 이상 `editable`/save/draft bridge가 필요하지 않도록 정리된다.
- [ ] `Mod-s` save keybinding 같은 editor-only affordance는 제거되거나 명시적 legacy path로 후퇴한다.
- [ ] App과 panel 사이 계약이 현재 제품 의미와 일치한다.

## Improvements

### Improvement: 문서와 코드 맵에서 `code-editor` 디렉터리의 의미를 viewer engine 관점으로 설명한다
**Priority**: Medium
**Target Section**: `/_sdd/spec/code-map.md` > `Renderer`; `/_sdd/spec/feature-index.md` > `1. Foundation / Workspace / Viewer`

**Current State**:
파일 경로와 컴포넌트 이름은 여전히 `code-editor`를 사용하지만, 제품 copy는 `Code Viewer`다. 이 차이는 구현체 이름과 제품 역할을 혼동하게 만든다.

**Proposed**:
`src/code-editor/*`는 "viewer를 구현하는 CM6 engine layer"라는 설명으로 문서화한다. 즉시 디렉터리 rename은 하지 않되, naming mismatch가 의도된 transitional state임을 기록한다.

**Reason**:
모듈 rename은 영향 범위가 크므로, 우선 architecture description을 명확히 하는 편이 안전하다.

**Acceptance Criteria**:
- [ ] `code-editor` 경로가 제품상 `Code Viewer` 구현체라는 점이 문서화된다.
- [ ] directory rename은 후속 후보임을 명시한다.

## Failure Modes

| 시나리오 | 실패 시 | 사용자 가시성 | 처리 방안 |
|---|---|---|---|
| viewer-first를 이유로 CM6를 정적 렌더러로 교체 | 검색/gutter/jump 회귀 | 즉시 탐색성 저하 | CM6 유지 결정을 spec에 명시 |
| editor residue 정리 중 save/dirty 로직과 viewer 로직을 혼동 | 불필요한 결합 지속 또는 회귀 | 유지보수 비용 증가 | public contract와 legacy residue를 분리해서 정리 |
| CM6 cleanup 중 search/gutter extension을 함께 제거 | 핵심 viewer 가치 손실 | 사용자 체감 회귀 큼 | CM6 viewer contract 핵심 항목을 acceptance criteria로 고정 |
| 구현체 이름과 제품 copy 차이를 무시 | 팀 내 의사결정 혼선 | 반복 논의 발생 | code-map/feature-index에 명시적 설명 추가 |

## Notes

### Context
이번 변경은 "새 viewer 라이브러리 도입"이 아니라, CM6를 현재 제품 요구에 맞는 viewer engine으로 명시하고 남아 있는 editor residue를 줄이는 작업이다.

### Constraints
- 현재 검색, selection, jump/highlight, git/comment gutter 기능은 유지해야 한다.
- 성능이나 UX 개선이 없는 viewer engine migration은 이번 범위에 포함하지 않는다.
- `src/code-editor/*` 경로 rename은 이번 단계에서 수행하지 않는다.
- viewer-first 이후 `Code Viewer` copy와 내부 엔진 설명이 서로 어긋나지 않도록 문서/코드 계약을 정리한다.

## Resolved Decisions

1. `src/code-editor/*` naming cleanup은 이번 범위에 포함하지 않고, 별도 refactor 후보로 분리한다.
2. read-only viewer의 CM6 extension 집합은 이번 단계에서 성급히 축소하지 않고, profiling 또는 실제 최적화 필요가 확인된 뒤 후속으로 검토한다.

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

이번 작업은 Code Viewer 구현체를 CM6 read-only engine으로 고정하고, viewer-first 전환 이후 남아 있는 editor residue를 정리하는 계획이다. 핵심은 엔진 교체가 아니라 계약 정리와 회귀 방지다.

## Scope

### In Scope
- CM6를 Code Viewer의 표준 engine으로 명시
- viewer contract와 editor residue를 구분하는 문서/코드 정리
- `CodeEditorPanel`의 editor-centric public surface 축소
- CM6 viewer invariants에 대한 회귀 테스트 강화

### Out of Scope
- Monaco 도입
- Shiki 또는 정적 syntax highlighter 기반 migration
- `src/code-editor/*` 디렉터리 rename
- `_sdd/spec/` 직접 수정

## Components

1. **Viewer Engine Contract Layer**: CM6 유지 결정, non-goal 명시, architecture wording
2. **Code Viewer Component Layer**: `CodeEditorPanel` public contract 정리, editor residue cleanup
3. **Regression Guard Layer**: search/gutter/jump/highlight 유지 테스트 강화

## Implementation Phases

### Phase 1: viewer engine contract 고정
| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T1 | CM6 viewer engine 결정과 non-goal을 문서/코드 주석에 반영한다 | P0 | - | Viewer Engine Contract Layer |

### Phase 2: editor residue cleanup
| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T2 | `CodeEditorPanel`의 editor-centric public surface를 축소한다 | P0 | T1 | Code Viewer Component Layer |

### Phase 3: 회귀 가드 강화
| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T3 | CM6 viewer invariants를 테스트로 고정한다 | P0 | T2 | Regression Guard Layer |

## Task Details

### Task T1: CM6 viewer engine 결정과 non-goal을 문서/코드 주석에 반영한다
**Component**: Viewer Engine Contract Layer
**Priority**: P0
**Type**: Refactor

**Description**:
README, 코드 주석, 컴포넌트 문서화에서 Code Viewer가 CM6 read-only engine 위에 서 있다는 점을 명시한다. 동시에 Monaco/Shiki/static viewer migration이 현재 범위 밖이라는 비목표를 기록한다.

**Acceptance Criteria**:
- [ ] 사용자/개발자 문서가 Code Viewer를 CM6 기반 viewer로 설명한다.
- [ ] viewer-first가 engine replacement를 뜻하지 않음을 명시한다.
- [ ] `src/code-editor/*` 경로가 viewer engine layer라는 설명이 추가된다.

**Target Files**:
- [M] `README.md` -- Code Viewer의 CM6 engine 역할 설명 보강
- [M] `README_en.md` -- 영문 설명 동기화
- [M] `src/code-editor/code-editor-panel.tsx` -- viewer engine contract와 legacy residue에 대한 주석/prop 설명 정리

**Technical Notes**:
- 기능 변경보다 architecture wording 정리가 핵심이다.
- 문서화는 "왜 CM6를 계속 쓰는가"를 짧고 명확하게 남기는 쪽이 좋다.

**Dependencies**: -

### Task T2: `CodeEditorPanel`의 editor-centric public surface를 축소한다
**Component**: Code Viewer Component Layer
**Priority**: P0
**Type**: Refactor

**Description**:
현재 `CodeEditorPanel`에 남아 있는 `editable`, `onSave`, `onDirtyChange`, `onContentChange` 같은 editor-centric prop surface와 `Mod-s` keybinding을 정리한다. 목표는 viewer 기능을 지키면서 public API를 현재 제품 의미와 맞추는 것이다.

**Acceptance Criteria**:
- [ ] App의 현재 viewer 경로에 필요 없는 editor props가 제거되거나 legacy path로 명확히 후퇴한다.
- [ ] `Mod-s` save keybinding 같은 editor-only affordance가 기본 viewer contract에서 빠진다.
- [ ] selection/search/wrap/gutter/jump/highlight는 유지된다.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx` -- editor props/keybinding residue 정리, viewer contract 명확화
- [M] `src/App.tsx` -- panel 호출부와 타입 계약 정리
- [M] `src/App.css` -- 필요 시 header/control copy 정리

**Technical Notes**:
- 내부적으로 CM6 state/history를 일부 유지하더라도 public contract는 viewer 기준으로 정리할 수 있다.
- 이 단계는 document session/saveState 전면 제거와 묶지 않는다.

**Dependencies**: T1

### Task T3: CM6 viewer invariants를 테스트로 고정한다
**Component**: Regression Guard Layer
**Priority**: P0
**Type**: Test

**Description**:
CM6를 계속 쓰는 이유가 되는 핵심 viewer 기능을 회귀 테스트로 고정한다. 검색, wrap, git/comment gutter, jump/highlight, `Edit in VSCode` 주변 동작은 유지되고, editor-only affordance는 노출되지 않아야 한다.

**Acceptance Criteria**:
- [ ] panel test가 viewer mode의 search/wrap/gutter/jump 계약을 검증한다.
- [ ] panel test가 editor-only keybinding 또는 obsolete prop path 제거를 반영한다.
- [ ] app integration test가 viewer-first 흐름과 외부 편집 복귀를 계속 검증한다.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.test.tsx` -- CM6 viewer invariants 중심으로 테스트 재정렬
- [M] `src/App.test.tsx` -- viewer-first integration 회귀 유지

**Technical Notes**:
- 테스트 명세를 "CM6 editor behavior"보다 "Code Viewer behavior" 중심으로 다시 서술하는 편이 좋다.
- 기능 회귀를 막으려면 static highlighter로는 대체하기 어려운 상호작용을 명시적으로 검증해야 한다.

**Dependencies**: T2

## Parallel Execution Summary

- 전체 작업은 파일 겹침이 커서 기본적으로 순차 진행이 적합하다.
- T1은 문서/주석 중심이라 먼저 끝내고, 그 결과를 기준으로 T2 public contract cleanup을 진행하는 편이 안전하다.
- T3는 T2 이후 테스트 기대값이 확정되면 바로 수행할 수 있다.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| editor residue cleanup 중 실제로 필요한 CM6 extension까지 지움 | viewer 기능 회귀 | search/gutter/jump/highlight를 핵심 invariant로 먼저 고정 |
| 문서화만 하고 public contract를 정리하지 않음 | 구현과 설명이 다시 어긋남 | T2를 P0로 둬서 문서/코드 계약을 함께 맞춤 |
| CM6 유지 결정을 과도한 영구 고정으로 해석 | 미래 선택지 축소 | "현재 표준 구현"으로 표현하고 migration은 별도 제안으로 열어 둠 |

## Future Considerations

1. `src/code-editor/*` 내부 naming cleanup은 viewer-first / CM6 유지 결정이 충분히 안정화된 뒤 별도 refactor로 검토한다.
2. read-only viewer의 CM6 extension 최소화는 실제 profiling 또는 회귀 없이 줄일 수 있다는 근거가 생긴 뒤 후속 최적화로 검토한다.
