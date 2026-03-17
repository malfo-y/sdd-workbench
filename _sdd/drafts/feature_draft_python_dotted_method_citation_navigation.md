# Feature Draft: Python Dotted Method Citation Navigation

Created: 2026-03-18
Author: Codex
Status: Draft

## Part 1 Summary

| 섹션 | 항목 수 | 주요 내용 |
|------|---------|----------|
| Background & Motivation Updates | 1 | `Class.method` citation을 실제 선언 위치로 연결 |
| Design Changes | 2 | dotted symbol grammar, owner-aware Python resolver |
| New Features | 2 | prose dotted citation navigation, fenced code block dotted citation navigation |
| Improvements | 1 | exact method 우선, unresolved fallback 유지 |
| Usage Scenarios | 2 | prose click, generic fenced block click |
| Notes | 2 | Python-only 후속 확장, class-only fallback 제외 |

<!-- spec-update-todo-input-start -->
# Part 1: Spec Patch Draft

> This patch can be copy-pasted into the corresponding spec section,
> or used as input for the `spec-update-todo` skill.

# Spec Update Input

**Date**: 2026-03-18
**Author**: Codex
**Target Spec**: `_sdd/spec/main.md`, `_sdd/spec/spec-viewer/overview.md`, `_sdd/spec/spec-viewer/contracts.md`, `_sdd/spec/appendix/detailed-acceptance.md`

## Background & Motivation Updates

### Background Update: Python citations already reference class-owned methods
**Status**: 📋 Planned
**Target Section**: `_sdd/spec/main.md` > `§1 Background & Motivation > Problem Statement`
**Change Type**: Problem Statement / Motivation / Alternative Comparison

**Current**: 현재 rendered spec citation navigation은 `[pkg/mod.py:Worker]` 같은 simple symbol까지만 안정적으로 다루며, 실제 문서에 등장하는 `[pkg/mod.py:Worker.run]` 형태는 클릭 가능한 reference로 해석되지 않는다.
**Proposed**: Python citation grammar를 `Class.method`까지 확장해, rendered prose와 fenced code block 안에 있는 dotted method citation도 실제 method declaration으로 이동할 수 있도록 정의한다. exact method resolution에 실패하면 class-only로 임의 fallback하지 않고 현재 safe fallback UX를 유지한다.
**Reason**: 구현/스펙 문서가 클래스 소유 메서드를 직접 가리키는 경우가 많아서, dotted citation을 제외하면 executable navigation의 문서 적합성이 떨어진다.

---

## Design Changes

### Design Change: Citation target grammar accepts Python owner-qualified method symbols
**Status**: 📋 Planned
**Priority**: High
**Target Section**: `_sdd/spec/main.md` > `§2 Core Design > Algorithm / Logic Flow`
**Change Type**: Algorithm / Logic Flow / Design Rationale

**Description**:
citation grammar는 기존 `[relative/path.py:SymbolName]` 외에 `[relative/path.py:ClassName.methodName]`도 허용한다. MVP-for-follow-up 범위에서는 owner depth를 정확히 1단계로 제한한다. 즉 `Class.method`는 허용하지만 `Outer.Inner.method`, `Class.method.helper`, `module.Class.method` 같은 deeper chain은 허용하지 않는다. prose와 fenced code block 양쪽 모두 같은 parser contract를 사용한다.

**Code Reference**: `[src/spec-viewer/citation-target.ts:parseBracketCitationText]`

**Impact**:
- citation target parser가 simple symbol과 one-level dotted method symbol을 모두 지원해야 한다.
- href serialization/parsing contract가 dotted symbol을 lossless 하게 보존해야 한다.
- invalid deep owner-chain은 early reject 되어야 한다.

---

### Design Change: Owner-aware Python declaration resolver
**Status**: 📋 Planned
**Priority**: High
**Target Section**: `_sdd/spec/spec-viewer/contracts.md` > `Part 1: Navigation Rules > spec -> code / code -> spec 규칙`
**Change Type**: Algorithm / Logic Flow / Design Rationale

**Description**:
Python resolver는 Lezer AST walk 중 class ownership context를 추적한다. top-level class/function declaration과 class body method declaration을 함께 수집하되, method는 `ClassName.methodName`의 fully-qualified key로도 저장한다. dotted citation이 들어오면 exact owner-qualified declaration만 찾고, simple symbol과 dotted symbol의 ambiguity 규칙을 분리해 처리한다.

**Code Reference**: `[src/spec-viewer/python-symbol-resolver.ts:resolvePythonSymbol]`

**Impact**:
- `run`과 `Worker.run`을 다른 symbol space로 취급할 수 있다.
- 동일한 method name이 여러 클래스에 있어도 `Worker.run`은 deterministic하게 해석 가능하다.
- exact method를 못 찾을 때 class로 강등 이동하지 않으므로 misleading jump를 피할 수 있다.

---

## New Features

### Feature: Dotted prose citation navigation for Python class methods
**Status**: 📋 Planned
**Priority**: High
**Category**: Navigation
**Target Component**: Spec Viewer
**Target Section**: `_sdd/spec/spec-viewer/overview.md` > `2. 사용자 가시 동작`

**Description**:
rendered prose 안의 `[relative/path.py:ClassName.methodName]` citation을 clickable internal target으로 렌더링한다. target file이 workspace 안에 있고, Python resolver가 owner-qualified method declaration을 unique하게 찾으면 해당 method declaration line으로 이동한다.

**Acceptance Criteria**:
- [ ] markdown 본문에 plain text로 작성된 `[pkg/mod.py:Worker.run]` citation이 clickable target으로 렌더된다.
- [ ] 클릭 시 exact method declaration을 찾으면 Code tab이 열리고 method declaration line으로 jump/highlight 된다.
- [ ] exact method declaration이 없으면 class declaration으로 자동 강등 이동하지 않고 fallback UX를 유지한다.
- [ ] existing simple symbol citation behavior는 regression 없이 유지된다.

**Technical Notes**:
`Worker.run`은 parser 단계에서 허용되지만, `Outer.Worker.run` 같은 deeper chain은 여전히 거부한다.

**Dependencies**:
extended citation grammar, owner-aware Python declaration resolver, existing App jump pipeline

---

### Feature: Dotted citation navigation inside generic fenced code blocks
**Status**: 📋 Planned
**Priority**: High
**Category**: Navigation / Rendered Examples
**Target Component**: Spec Viewer
**Target Section**: `_sdd/spec/main.md` > `§4 Component Details > Spec Viewer`

**Description**:
generic fenced code block 및 language-tagged fenced block 안의 `[relative/path.py:ClassName.methodName]` citation token을 interactive target으로 렌더링한다. 줄 전체가 comment일 필요는 없고, diagram/outline/textual example 안에 포함된 citation token만 클릭 가능하면 된다.

**Acceptance Criteria**:
- [ ] unlabeled fenced block 안 `Worker [pkg/mod.py:Worker.run]` 형태 citation이 clickable target으로 렌더된다.
- [ ] `python`, `text`, unlabeled fence 등 language와 무관하게 same grammar를 적용한다.
- [ ] dotted method citation click은 prose와 동일한 resolver 규칙을 사용한다.
- [ ] invalid deep chain 또는 unsupported symbol은 링크화하지 않는다.

**Technical Notes**:
generic fenced block support는 이미 존재하는 inline token extraction 경로 위에 dotted symbol grammar만 확장하면 된다.

**Dependencies**:
extended citation grammar, code block citation extraction, App jump orchestration

---

## Improvements

### Improvement: Exact method semantics should outrank class-level fallback
**Status**: 📋 Planned
**Priority**: Medium
**Target Section**: `_sdd/spec/spec-viewer/contracts.md` > `Part 1: Navigation Rules > 링크 해석 규칙`
**Current State**: dotted symbol을 무시하고 class로 보내면 구현은 단순하지만, 사용자가 기대한 target과 실제 jump target이 달라질 수 있다.
**Proposed**: `Class.method` citation은 exact method declaration resolution이 성공했을 때만 자동 이동하고, 실패 시 fallback UX만 유지한다. class declaration으로의 silent downgrade는 허용하지 않는다.
**Reason**: executable citation은 “눌렀을 때 정확히 그 대상을 보여 준다”는 신뢰가 중요하므로, partial success보다 accurate failure가 낫다.

---

## Usage Scenarios

### Scenario: Reviewer opens a class-owned method from prose citation
**Status**: 📋 Planned
**Target Section**: `_sdd/spec/main.md` > `§5 Usage Guide & Expected Results`

**Setup**:
active spec에는 `[src/spec_viewer/resolver.py:PythonSymbolResolver.resolve]` 형태와 동일한 one-level dotted citation이 포함되어 있고, target file이 현재 workspace 안에 존재한다.

**Action**:
reviewer가 rendered prose citation을 클릭한다.

**Expected Result**:
앱은 target Python file을 열고 해당 method declaration line으로 jump/highlight 한다. exact method resolution에 실패하면 class-level auto fallback 없이 current fallback UX를 보여 준다.

---

### Scenario: Reader follows a dotted citation from a generic fenced block
**Status**: 📋 Planned
**Target Section**: `_sdd/spec/appendix/detailed-acceptance.md` > `Spec Viewer / Navigation acceptance`

**Setup**:
spec 예제 code block은 unlabeled 또는 `text` fence이며, 내부에 `NestedDataset [data_juicer/core/data/dj_dataset.py:DJDataset.load]` 같은 dotted citation token이 포함되어 있다.

**Action**:
reader가 code block 안 citation token을 클릭한다.

**Expected Result**:
일반 text/diagram 내용은 inert 상태를 유지하고 citation token만 interactive target으로 반응한다. 성공 시 target method declaration으로 이동하고, 실패 시 current fallback UX로 degrade 한다.

---

## Notes

### Context
- 기존 Python citation navigation MVP는 simple symbol만 허용한다.
- 실제 spec 문서에는 `Class.method` 수준의 citation authoring 필요가 충분히 있다.
- generic fenced block citation extraction은 이미 언어 무관 token extraction 경로를 갖고 있다.
- 이번 후속 기능은 authoring syntax를 새로 만드는 게 아니라 기존 dotted notation을 executable target으로 승격하는 작업이다.

### Constraints
- Python-only 후속 확장이다.
- supported symbol grammar는 `Symbol` 또는 `Class.method`까지만 허용한다.
- deeper dotted owner-chain은 지원하지 않는다.
- exact method를 못 찾을 때 class declaration fallback은 의도적으로 제공하지 않는다.
- TypeScript 등 다른 언어 semantic resolution은 별도 후속 범위다.

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

기존 Python citation navigation 위에 one-level dotted method symbol 지원을 추가한다. 핵심은 parser contract를 `Class.method`까지 넓히고, Python resolver가 class ownership을 추적해 exact method declaration을 찾도록 만드는 것이다. rendered prose와 fenced block은 이미 공통 citation target layer를 사용하므로, 이번 확장은 주로 grammar/resolver/test 쪽에 집중된다.

## Scope

### In Scope
- `[relative/path.py:Class.method]` citation parser/serializer 지원
- Python resolver의 owner-aware declaration collection
- prose / generic fenced block dotted citation click handling
- exact method resolution regression tests
- unresolved dotted citation fallback verification

### Out of Scope
- `Outer.Inner.method` 같은 multi-level owner chain
- class fallback auto-jump
- TypeScript/JavaScript method symbol resolution
- property/attribute assignment, nested local function, dynamically attached method 추적

## Components

1. **Extended Citation Grammar**: `Symbol`과 `Class.method`를 함께 허용하는 target parser/serializer.
2. **Owner-aware Python Resolver**: class ownership context를 포함해 declaration을 수집하고 exact method를 찾는다.
3. **Navigation Compatibility Layer**: 기존 prose/code block click path가 dotted symbol도 그대로 전달하도록 유지한다.
4. **Regression Test Suite**: simple symbol 회귀와 dotted method 신규 behavior를 함께 검증한다.

## Implementation Phases

### Phase 1: Grammar and Resolver
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | citation target grammar를 `Class.method`까지 확장 | P0 | - | Extended Citation Grammar |
| 2 | Python resolver에 owner-aware method resolution 추가 | P0 | 1 | Owner-aware Python Resolver |

### Phase 2: Integration and Verification
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | prose / fenced code block dotted citation navigation 경로 검증 | P1 | 1, 2 | Navigation Compatibility Layer |
| 4 | regression tests와 fallback policy 검증 | P1 | 2, 3 | Regression Test Suite |

## Task Details

### Task 1: Extend citation target grammar for one-level dotted method symbols
**Component**: Extended Citation Grammar
**Priority**: P0-Critical
**Type**: Feature

**Description**:
현재 simple symbol-only parser를 `Symbol | Class.method` grammar로 확장한다. href serialization/parsing은 dotted symbol을 그대로 round-trip 해야 하며, invalid deep chain은 reject 해야 한다.

**Acceptance Criteria**:
- [ ] `[src/app.py:Worker]`와 `[src/app.py:Worker.run]` 모두 parse/serialize 된다.
- [ ] `[src/app.py:Outer.Worker.run]`는 reject 된다.
- [ ] 기존 simple symbol tests는 유지되고 dotted symbol tests가 추가된다.

**Target Files**:
- [M] `src/spec-viewer/citation-target.ts` -- symbol grammar와 href parse/serialize 확장
- [M] `src/spec-viewer/citation-target.test.ts` -- simple + dotted + invalid deep chain regression

---

### Task 2: Add owner-aware exact method resolution to Python resolver
**Component**: Owner-aware Python Resolver
**Priority**: P0-Critical
**Type**: Feature

**Description**:
Lezer walk 중 현재 class ownership을 추적해서 method declaration에 `Class.method` qualified key를 부여한다. simple symbol lookup과 dotted lookup을 분기하되, dotted lookup은 exact qualified key만 성공 처리한다.

**Acceptance Criteria**:
- [ ] top-level `run`과 `Worker.run`을 구분해서 찾을 수 있다.
- [ ] 서로 다른 클래스에 같은 method name이 있어도 `Worker.run`은 deterministic 하게 해석된다.
- [ ] exact method가 없으면 `not_found`로 실패하고 class로 강등되지 않는다.

**Target Files**:
- [M] `src/spec-viewer/python-symbol-resolver.ts` -- owner-aware declaration collection, exact dotted lookup
- [M] `src/spec-viewer/python-symbol-resolver.test.ts` -- qualified method success, ambiguity, fallback rejection tests

---

### Task 3: Verify dotted citations through existing rendered navigation paths
**Component**: Navigation Compatibility Layer
**Priority**: P1-High
**Type**: Integration

**Description**:
기존 prose citation transform과 generic fenced block citation extraction이 dotted symbol을 그대로 전달하는지 확인하고, 필요한 최소 수정만 적용한다.

**Acceptance Criteria**:
- [ ] prose `[src/app.py:Worker.run]` click이 App resolver까지 전달된다.
- [ ] fenced `Worker [src/app.py:Worker.run]` token click도 같은 경로를 탄다.
- [ ] 기존 simple symbol citation UI는 regression이 없다.

**Target Files**:
- [M] `src/spec-viewer/remark-citation-links.ts` -- dotted symbol parse acceptance 확인
- [M] `src/spec-viewer/code-block-citation.ts` -- generic fenced extraction에서 dotted symbol 허용
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- prose/fenced dotted citation click integration

---

### Task 4: Add App-level regression coverage for exact dotted resolution
**Component**: Regression Test Suite
**Priority**: P1-High
**Type**: Test

**Description**:
App integration test에서 dotted prose/fenced citation click, exact method jump, unresolved dotted fallback을 모두 검증한다.

**Acceptance Criteria**:
- [ ] `[src/app.py:Worker.run]` click 시 method line으로 이동한다.
- [ ] unresolved dotted citation은 fallback UX만 띄우고 파일을 자동으로 열지 않는다.
- [ ] history/back behavior는 기존 citation flows와 동일하게 유지된다.

**Target Files**:
- [M] `src/App.test.tsx` -- dotted prose/fenced integration and fallback regression

## Resolved Decisions

- `Class.method`는 follow-up 범위에 포함한다.
- exact method resolution을 우선하며, 실패 시 class-level auto fallback은 하지 않는다.
- supported dotted depth는 owner 1단계(`Class.method`)까지만 허용한다.
- 이번 초안은 Python-only 확장으로 제한한다.
