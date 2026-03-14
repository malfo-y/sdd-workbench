# Feature Draft: Python Citation Navigation in Markdown and Fenced Code Blocks

Created: 2026-03-14
Author: Codex
Status: Draft

## Part 1 Summary

| 섹션 | 항목 수 | 주요 내용 |
|------|---------|----------|
| Background & Motivation Updates | 1 | plain citation을 클릭 가능한 semantic navigation으로 승격 |
| Design Changes | 2 | citation target grammar, Python declaration resolver, fenced block annotation 규칙 |
| New Features | 2 | 본문 inline citation navigation, fenced Python code block citation navigation |
| Improvements | 1 | unresolved citation fallback 안전 규칙 |
| Usage Scenarios | 2 | prose click, fenced block click |
| Notes | 2 | Python 우선 MVP, comment-line citation 제한 |

<!-- spec-update-todo-input-start -->
# Part 1: Spec Patch Draft

> This patch can be copy-pasted into the corresponding spec section,
> or used as input for the `spec-update-todo` skill.

# Spec Update Input

**Date**: 2026-03-14
**Author**: Codex
**Target Spec**: `_sdd/spec/main.md`, `_sdd/spec/spec-viewer/overview.md`, `_sdd/spec/spec-viewer/contracts.md`, `_sdd/spec/appendix/detailed-acceptance.md`

## Background & Motivation Updates

### Background Update: Citation text should become executable navigation
**Status**: 📋 Planned
**Target Section**: `_sdd/spec/main.md` > `§1 Background & Motivation > Problem Statement`
**Change Type**: Problem Statement / Motivation / Alternative Comparison

**Current**: spec 본문과 sampled implementation은 `[src/file.py:Symbol]` 같은 bracket citation을 사람이 읽을 수 있는 참고 표기처럼 사용하지만, 사용자는 여전히 파일 트리 검색이나 수동 스크롤로 실제 선언 위치를 찾아야 한다.
**Proposed**: same-workspace relative citation이 rendered spec 안에서 직접 클릭 가능한 navigation target이 되도록 정의한다. prose citation과 예제 fenced code block 안 citation 모두 supported path로 명시하고, unresolved symbol은 file-open fallback 없이 현재 위치에서 safe fallback만 유지한다.
**Reason**: whitepaper와 supporting docs가 이미 코드 reference를 풍부하게 담고 있으므로, citation을 executable artifact로 승격하면 spec review와 implementation traceability가 크게 좋아진다.

---

## Design Changes

### Design Change: Citation target grammar and semantic navigation pipeline
**Status**: 📋 Planned
**Priority**: High
**Target Section**: `_sdd/spec/main.md` > `§2 Core Design > Algorithm / Logic Flow`
**Change Type**: Algorithm / Logic Flow / Design Rationale

**Description**:
rendered spec는 기존 markdown link 해석 외에 plain citation token도 별도 grammar로 인식한다. MVP citation 문법은 `relative/path.py:SymbolName`을 bracket으로 감싼 `[relative/path.py:SymbolName]` 형태다. prose 영역에서는 plain text citation을 internal target으로 승격하고, fenced Python code block에서는 full-line comment citation인 `# [relative/path.py:SymbolName]`만 인식한다. 클릭 시 resolver는 relative path를 먼저 검증하고, 그 다음 Python declaration resolver로 class/function/method/module 선언 위치를 찾는다. unique declaration을 찾았을 때만 semantic jump를 수행하며, 찾지 못하면 file open 없이 current fallback UX만 유지한다.

**Code Reference**: `[src/spec-viewer/spec-link-utils.ts:resolveSpecLink]`

**Impact**:
- spec-viewer link parsing 규칙이 line-hash 전용에서 semantic symbol target까지 확장된다.
- App-level jump orchestration이 line range뿐 아니라 semantic declaration lookup 결과도 받을 수 있어야 한다.
- fenced code block rendering path가 syntax highlight 결과와 별도로 interactive annotation metadata를 다룰 수 있어야 한다.

---

### Design Change: Python-first declaration resolver with existing parser stack
**Status**: 📋 Planned
**Priority**: High
**Target Section**: `_sdd/spec/spec-viewer/contracts.md` > `Part 1: Navigation Rules > spec -> code / code -> spec 규칙`
**Change Type**: Algorithm / Logic Flow / Design Rationale

**Description**:
semantic citation resolution은 새 외부 parser를 추가하지 않고, 현재 editor stack에 이미 포함된 CodeMirror/Lezer Python parser를 재사용한다. MVP 범위는 declaration-only다. module top-level function, class, class body method declaration까지를 지원하고, symbol syntax는 simple symbol name으로 제한한다. local variable, import alias, re-export, runtime-generated symbol, cross-file inheritance search, dotted owner-chain symbol은 다루지 않는다.

**Code Reference**: `[src/code-editor/code-editor-panel.tsx:applyJumpRequestToView]`

**Impact**:
- dependency 추가 없이 Python semantic navigation을 도입할 수 있다.
- 지원 범위가 declaration-only로 제한되므로 성공/실패 조건이 명확해진다.
- future TS support는 후속 task로 분리할 수 있다.

---

## New Features

### Feature: Inline citation navigation in rendered prose
**Status**: 📋 Planned
**Priority**: High
**Category**: Navigation
**Target Component**: Spec Viewer
**Target Section**: `_sdd/spec/spec-viewer/overview.md` > `2. 사용자 가시 동작`

**Description**:
paragraph, list item, blockquote, table cell 등 rendered prose 안에 존재하는 `[relative/path.py:SymbolName]` citation을 클릭 가능한 internal target으로 렌더링한다. target file이 same workspace 안에 있고, Python declaration resolver가 unique symbol location을 찾으면 해당 파일과 선언 라인으로 이동한다.

**Acceptance Criteria**:
- [ ] markdown 본문에 plain text로 작성된 `[pkg/mod.py:MyClass]` citation이 internal clickable target으로 렌더된다.
- [ ] 클릭 시 same-workspace relative path 검증을 통과한 Python file만 semantic resolution을 시도한다.
- [ ] unique declaration을 찾으면 Code tab이 열리고 선언 line으로 jump/highlight 된다.
- [ ] unresolved, unsupported, or unsafe citation은 broken navigation 대신 기존 fallback UX를 유지하고 파일을 자동으로 열지 않는다.

**Technical Notes**:
plain citation은 기존 markdown link 문법을 강제하지 않고 remark transform으로 internal target node로 승격한다.

**Dependencies**:
shared citation grammar, Python declaration resolver, existing App jump pipeline

---

### Feature: Fenced Python code block citation navigation
**Status**: 📋 Planned
**Priority**: High
**Category**: Navigation / Rendered Examples
**Target Component**: Spec Viewer
**Target Section**: `_sdd/spec/main.md` > `§4 Component Details > Spec Viewer`

**Description**:
fenced Python code block 안에 있는 full-line comment citation `# [relative/path.py:SymbolName]`을 interactive annotation으로 렌더링한다. 일반 코드 토큰은 그대로 syntax highlighting을 유지하고, citation comment line만 visually distinct하고 clickable한 affordance를 가진다.

**Acceptance Criteria**:
- [ ] fenced code block language가 `python` 또는 `py`일 때 `# [pkg/mod.py:helper]` line을 citation line으로 인식한다.
- [ ] citation line은 나머지 code token styling을 깨뜨리지 않고 별도 interactive affordance를 가진다.
- [ ] 클릭 시 prose citation과 동일한 Python declaration resolution 규칙을 사용한다.
- [ ] code block 안 임의 텍스트 전체를 interactive 처리하지 않고 citation comment line만 대상으로 삼는다.

**Technical Notes**:
MVP는 comment-line citation만 지원하며, inline code token 내부 citation parsing과 dotted symbol 표기는 의도적으로 제외한다.

**Dependencies**:
syntax highlight pipeline extension, citation grammar helpers, App jump orchestration

---

## Improvements

### Improvement: Safe fallback for unresolved semantic citations
**Status**: 📋 Planned
**Priority**: Medium
**Target Section**: `_sdd/spec/spec-viewer/contracts.md` > `Part 1: Navigation Rules > 링크 해석 규칙`
**Current State**: markdown link는 line hash가 있으면 deterministic하게 이동하지만, semantic symbol target은 현재 공식 지원이 없고 실패 상태 정의도 없다.
**Proposed**: semantic citation은 relative path 검증, language support, declaration uniqueness 세 단계를 통과했을 때만 자동 jump한다. 그 외에는 기존 popover/copy fallback을 유지하며, file-open-only fallback도 허용하지 않는다. silent failure나 잘못된 파일 이동을 피하는 것이 우선이다.
**Reason**: semantic resolution은 line hash보다 불확실성이 크므로, UX는 공격적 navigation보다 안전한 degrade를 우선해야 한다.

---

## Usage Scenarios

### Scenario: Reviewer opens a Python declaration from prose citation
**Status**: 📋 Planned
**Target Section**: `_sdd/spec/main.md` > `§5 Usage Guide & Expected Results`

**Setup**:
active spec에는 `[src/spec_viewer/resolver.py:PythonSymbolResolver]` 형태의 citation이 포함되어 있고, target file이 현재 workspace 안에 존재한다.

**Action**:
reviewer가 rendered prose citation을 클릭한다.

**Expected Result**:
앱은 target Python file을 열고 declaration line으로 jump/highlight 한다. resolution에 실패하면 unsafe 이동 대신 fallback UX를 보여 준다.

---

### Scenario: Reader follows a fenced example citation
**Status**: 📋 Planned
**Target Section**: `_sdd/spec/appendix/detailed-acceptance.md` > `Spec Viewer / Navigation acceptance`

**Setup**:
spec 예제 code block은 `python` fence이며, 내부에 `# [src/app.py:run]` citation line이 포함되어 있다.

**Action**:
reader가 code block 안 citation line을 클릭한다.

**Expected Result**:
일반 code line은 그대로 inert 상태를 유지하고, citation line만 interactive target으로 반응한다. 성공 시 target declaration으로 이동하고, 실패 시 current fallback UX로 degrade 한다.

---

## Notes

### Context
- 현재 스펙 문서들은 이미 `[path:symbol]` citation을 적극적으로 사용한다.
- existing navigation stack은 markdown link + line-range jump를 이미 지원한다.
- MVP 목표는 citation authoring syntax를 바꾸지 않고 executable navigation을 추가하는 것이다.
- failure path에서는 사용자를 다른 파일로 이동시키지 않고 현재 문맥을 보존하는 것이 기본 정책이다.

### Constraints
- Python declaration-only support가 우선이다.
- fenced block citation은 full-line comment syntax `# [path.py:Symbol]`만 지원한다.
- same-workspace relative path만 허용한다.
- symbol syntax는 `MyClass`, `helper` 같은 simple symbol만 허용하고 dotted owner-chain 표기는 지원하지 않는다.
- TypeScript 등 다른 언어 semantic resolution은 후속 확장 범위다.

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

Spec Viewer에 citation-aware navigation layer를 추가한다. plain prose citation과 fenced Python code block citation을 모두 지원하되, semantic resolution은 Python declaration-only MVP로 제한한다. 구현은 기존 markdown link handling, App jump orchestration, CodeMirror jump request를 재사용하고, 새 parser dependency 없이 current CodeMirror/Lezer Python stack을 활용한다.

## Scope

### In Scope
- rendered prose의 `[relative/path.py:Symbol]` citation parsing과 클릭 처리
- fenced `python` / `py` code block의 `# [relative/path.py:Symbol]` citation line 처리
- Python class/function/method/module declaration 위치 해석
- same-workspace relative path 검증과 unresolved fallback UX
- unit/integration regression tests

### Out of Scope
- TypeScript, JavaScript, Rust 등 다른 언어 semantic resolution
- local variable, import alias, re-export, overloaded symbol, inheritance chain search
- dotted owner-chain symbol syntax (`Outer.inner_method`)
- inline code span이나 arbitrary code token 내부 citation parsing
- authoring-time lint, stale citation batch validation, auto-fix

## Components

1. **Citation Target Grammar**: prose/fenced block 공통 citation 문법과 href/target shape를 정의한다.
2. **Python Declaration Resolver**: file content를 파싱해 declaration line을 찾는 semantic lookup 계층이다.
3. **Rendered Citation Adapters**: remark transform과 fenced block annotation을 통해 interactive target을 만든다.
4. **Navigation Orchestration**: Spec Viewer click -> App read/resolve -> Code tab jump 흐름을 조정한다.
5. **Regression Test Suite**: markdown rendering, code block affordance, semantic jump fallback을 검증한다.

## Implementation Phases

### Phase 1: Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | Citation target grammar와 shared helpers 정의 | P0 | - | Citation Target Grammar |
| 2 | Python declaration resolver 구현 | P0 | - | Python Declaration Resolver |

### Phase 2: Rendering Adapters
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | prose citation remark transform 추가 | P1 | 1 | Rendered Citation Adapters |
| 4 | fenced Python citation annotation 유틸리티 추가 | P1 | 1 | Rendered Citation Adapters |

### Phase 3: Integration and Regression
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 5 | Spec Viewer/App semantic jump orchestration 연결 | P0 | 1, 2, 3, 4 | Navigation Orchestration |
| 6 | regression tests와 fallback polish 마무리 | P1 | 5 | Regression Test Suite |

## Task Details

### Task 1: Define citation target grammar and shared helpers
**Component**: Citation Target Grammar
**Priority**: P0-Critical
**Type**: Feature

**Description**:
plain citation과 semantic target hash를 공통 데이터 구조로 정의한다. relative path, symbol name, optional source kind를 정규화하고, unsafe input은 early reject 한다. existing `resolveSpecLink`가 line-range link와 semantic citation target을 모두 구분할 수 있도록 contract를 확장한다.

**Acceptance Criteria**:
- [ ] citation target shape가 prose/fenced block 양쪽에서 공통으로 사용된다.
- [ ] same-workspace relative path 제약과 symbol parsing 규칙이 unit test로 고정된다.
- [ ] 기존 line-hash link behavior가 regression 없이 유지된다.

**Target Files**:
- [C] `src/spec-viewer/citation-target.ts` -- citation target parser, serializer, shared types
- [M] `src/spec-viewer/spec-link-utils.ts` -- line-range link와 semantic citation target을 함께 해석
- [M] `src/spec-viewer/spec-link-utils.test.ts` -- semantic target parsing, fallback, legacy line link regression

**Technical Notes**:
- semantic citation href는 absolute/custom scheme 대신 상대 경로 + symbol hash/query 기반으로 유지해 sanitize 정책을 재사용한다.
- legacy markdown link rules를 깨지 않도록 semantic target branch를 additive하게 추가한다.

**Dependencies**: -

### Task 2: Implement Python declaration resolver with existing parser stack
**Component**: Python Declaration Resolver
**Priority**: P0-Critical
**Type**: Feature

**Description**:
CodeMirror/Lezer Python parser를 재사용해 Python source text에서 module/class/function/method declaration line을 찾는 resolver를 구현한다. simple symbol 이름을 받아 unique declaration line을 반환하고, ambiguity 또는 unsupported pattern은 명시적 failure로 처리한다.

**Acceptance Criteria**:
- [ ] top-level function, class, class method declaration lookup이 동작한다.
- [ ] unsupported pattern은 잘못된 jump 대신 explicit failure result를 반환한다.
- [ ] 외부 parser dependency 없이 현재 package set으로 구현된다.

**Target Files**:
- [C] `src/spec-viewer/python-symbol-resolver.ts` -- Python declaration lookup logic
- [C] `src/spec-viewer/python-symbol-resolver.test.ts` -- class/function/method success와 failure cases

**Technical Notes**:
- declaration-only MVP이므로 local variables, imports, runtime aliases는 lookup 대상에서 제외한다.
- dotted owner chain은 지원하지 않으므로 input grammar는 simple symbol으로 제한한다.
- line number는 app invariant에 맞게 1-based로 반환한다.

**Dependencies**: -

### Task 3: Add prose citation remark transform
**Component**: Rendered Citation Adapters
**Priority**: P1-High
**Type**: Feature

**Description**:
rendered markdown prose 안의 plain `[path.py:Symbol]` citation을 internal clickable node로 변환하는 remark plugin을 추가한다. 일반 markdown 링크, code span, raw text leaf metadata와 충돌하지 않도록 적용 범위를 제한한다.

**Acceptance Criteria**:
- [ ] paragraph/list/blockquote/table cell 안 citation이 clickable target으로 렌더된다.
- [ ] markdown link, inline code, existing heading anchor behavior는 유지된다.
- [ ] plugin unit tests가 citation detection과 non-target exclusion을 검증한다.

**Target Files**:
- [C] `src/spec-viewer/remark-citation-links.ts` -- prose citation을 internal link/node로 변환하는 remark plugin
- [C] `src/spec-viewer/remark-citation-links.test.ts` -- prose citation transform unit tests

**Technical Notes**:
- interactive wiring은 Task 5에서 panel에 연결하므로, 이 task는 transform correctness에 집중한다.
- inline code span과 existing markdown link text는 transform 대상에서 제외한다.

**Dependencies**: 1

### Task 4: Add fenced Python citation annotation utilities
**Component**: Rendered Citation Adapters
**Priority**: P1-High
**Type**: Feature

**Description**:
fenced Python code block의 full-line citation comment를 감지하고, syntax-highlight output과 함께 소비할 수 있는 annotation metadata를 생성한다. 일반 코드 토큰은 기존 하이라이트를 유지하고, citation line만 별도 interactive affordance 후보로 노출한다.

**Acceptance Criteria**:
- [ ] `python`/`py` fenced block의 `# [path.py:Symbol]` line을 감지한다.
- [ ] non-citation code line은 기존 highlight behavior를 유지한다.
- [ ] annotation utility tests가 comment-line recognition과 false positive exclusion을 검증한다.

**Target Files**:
- [C] `src/spec-viewer/code-block-citation.ts` -- fenced Python citation line detector와 metadata helpers
- [C] `src/spec-viewer/code-block-citation.test.ts` -- code block citation recognition tests
- [M] `src/code-viewer/syntax-highlight.ts` -- highlight output에 citation annotation metadata를 함께 제공하도록 확장

**Technical Notes**:
- MVP는 full-line `# ...` comment만 다루고 inline trailing comment citation은 제외한다.
- highlight API shape를 바꿀 때 plaintext fallback path도 함께 유지해야 한다.

**Dependencies**: 1

### Task 5: Wire Spec Viewer and App semantic jump orchestration
**Component**: Navigation Orchestration
**Priority**: P0-Critical
**Type**: Feature

**Description**:
Spec Viewer click handler가 semantic citation target을 App으로 전달하고, App이 target file content를 읽어 Python resolver를 실행한 뒤 기존 jump pipeline으로 연결하도록 구현한다. prose citation과 fenced block citation 모두 이 orchestration을 공유하며, resolution 실패 시 current fallback UX를 유지한다.

**Acceptance Criteria**:
- [ ] prose citation click이 App-level semantic jump flow를 호출한다.
- [ ] fenced block citation click이 동일한 flow를 재사용한다.
- [ ] 성공 시 Code tab이 열리고 declaration line highlight가 적용된다.
- [ ] failure path에서 broken state 없이 fallback UX가 유지되며, target file을 자동으로 열지 않는다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- prose/fenced citation click wiring과 rendered affordance 적용
- [M] `src/App.tsx` -- target file read, Python resolver 실행, existing jump request 재사용
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- citation click wiring, affordance, fallback behavior tests
- [M] `src/App.test.tsx` -- semantic citation -> file read -> declaration jump integration tests

**Technical Notes**:
- App은 현재 rootPath와 existing file selection flow를 이미 갖고 있으므로, 별도 workspace context API 추가보다 local orchestration helper가 단순하다.
- Task 3/4가 만든 target metadata와 render output shape를 여기서 실제 UX로 연결한다.

**Dependencies**: 1, 2, 3, 4

### Task 6: Final regression coverage and fallback polish
**Component**: Regression Test Suite
**Priority**: P1-High
**Type**: Test

**Description**:
legacy markdown link, same-document anchor, line-range hash jump, prose citation, fenced block citation이 함께 존재할 때 회귀가 없는지 점검한다. unsupported language, missing file, missing symbol, ambiguous symbol 시나리오도 explicit test로 고정한다.

**Acceptance Criteria**:
- [ ] 기존 line-range markdown link tests가 그대로 통과한다.
- [ ] unsupported or unresolved semantic citation이 silent failure를 일으키지 않는다.
- [ ] prose/fenced path 모두 success + failure integration coverage를 가진다.

**Target Files**:
- [M] `src/spec-viewer/spec-link-utils.test.ts` -- legacy link regression and semantic fallback cases 보강
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- mixed-content rendering regression 보강
- [M] `src/App.test.tsx` -- app integration regression 보강

**Technical Notes**:
- failure UX는 exact banner text보다 state transition과 non-crash behavior에 초점을 맞춰 검증하는 편이 안정적이다.

**Dependencies**: 5

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | Sequential (conflicts) |
|-------|-------------|--------------|------------------------|
| 1 | 2 | 2 | 0 |
| 2 | 2 | 2 | 0 |
| 3 | 2 | 1 | 1 |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| semantic resolver가 declaration을 잘못 찾음 | 잘못된 파일/라인으로 jump | declaration-only MVP로 범위를 제한하고 ambiguity는 failure 처리 |
| fenced block interactive rendering이 syntax highlighting을 깨뜨림 | spec examples readability 저하 | annotation metadata와 code token rendering을 분리하고 citation comment line만 override |
| sanitize/link parsing과 새 citation target이 충돌 | 링크 클릭 무반응 또는 unsafe href 허용 | relative path 기반 target serialization을 유지하고 legacy link tests를 보강 |
| panel/App wiring이 복잡해져 regression 발생 | anchor/link/source actions 회귀 | orchestration helper를 분리하고 App + panel integration tests를 추가 |

## Open Questions

- None for current MVP scope.

## Resolved Decisions

- unresolved Python symbol은 file open 없이 현재 위치에서 fallback popover/copy UX만 유지한다.
- MVP symbol syntax는 simple symbol만 지원하며, dotted owner-chain syntax는 제외한다.
- TypeScript support는 이번 draft/구현 범위에서 제외하고 후속 기능으로 분리한다.

## Model Recommendation

Task 1-5는 parser reasoning과 UI integration이 함께 필요하므로 high-reasoning model이 적합하다. Task 6은 빠른 모델로도 가능하지만, 회귀 테스트 해석은 동일한 high-reasoning model을 쓰는 편이 안정적이다.
