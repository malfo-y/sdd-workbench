# Feature Draft: F31 — 검색 `*` wildcard 지원

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

### Feature: F31 검색 `*` wildcard 지원 (파일 브라우저 + 스펙 뷰어)
**Priority**: Medium  
**Category**: Search UX / Matcher Semantics  
**Target Component**: `workspace-search`, `FileTreePanel`, `SpecViewerPanel`  
**Target Section**: `_sdd/spec/main.md` > `현재 상태 요약`; `_sdd/spec/sdd-workbench/01-overview.md` > `MVP 범위`, `기능 커버리지`; `_sdd/spec/sdd-workbench/03-components.md` > `1.3 File Tree Layer`, `1.5 Spec Viewer Layer`, `1.7 Electron Boundary`; `_sdd/spec/sdd-workbench/04-interfaces.md` > `8.1 파일 브라우저 파일명 검색 규칙 (F29)`, `8.2 스펙 뷰어 텍스트 검색 규칙 (F30)`; `_sdd/spec/sdd-workbench/appendix.md` > `기능 이력`, `상세 수용 기준`

**Description**:  
기존 substring 기반 검색에 단일 wildcard 문자 `*` 지원을 추가한다. `*`는 **0개 이상의 임의 문자**를 의미하며, 전체 매칭은 strict glob anchor가 아니라 **non-empty token들의 순서 보존 ordered match**로 해석한다. 즉 `foo*bar`는 후보 문자열 안에 `foo`가 먼저 나오고 그 뒤에 `bar`가 나오면 매치된다. 파일 브라우저 검색은 `fileName` 기준, 스펙 뷰어 검색은 raw markdown의 **단일 line 기준**으로 이 규칙을 적용한다.

**Acceptance Criteria**:

- [ ] 검색어에 `*`가 없을 때는 기존 case-insensitive substring 동작과 동일하다.
- [ ] `*`는 0개 이상의 임의 문자를 의미하며, `foo*bar`, `*guide`, `guide*`, `foo**bar` 같은 패턴을 허용한다.
- [ ] 연속된 `*`는 단일 wildcard와 동일하게 취급한다.
- [ ] non-wildcard 문자가 없는 검색어(`*`, `**`, 공백 + `*`)는 빈 검색으로 취급하며 전체 결과를 반환하지 않는다.
- [ ] 파일 브라우저 검색은 `relativePath` 전체가 아니라 `fileName` 기준으로만 wildcard 매칭을 수행한다.
- [ ] 스펙 뷰어 검색은 raw markdown의 같은 line 안에서만 wildcard 매칭을 수행하며, 줄바꿈을 넘는 매치는 지원하지 않는다.
- [ ] 스펙 뷰어는 기존 block highlight/navigation 모델을 유지하고, wildcard 매치 line이 속한 block만 강조한다.
- [ ] local/remote 파일 브라우저 검색은 기존 IPC shape 변경 없이 동일한 wildcard semantics를 사용한다.
- [ ] `*` 지원이 기존 depth/result/time 보호 정책을 우회하지 않는다.
- [ ] 검색 입력 UI에는 `*` 지원이 드러나는 최소 수준의 discoverability 문구(placeholder 또는 helper)가 제공된다.

**Technical Notes**:

- 이번 범위는 `*`만 지원하며 `?`, `[]`, `**`, regex, fuzzy search는 포함하지 않는다.
- literal `*`를 검색하기 위한 escape(`\*`)는 이번 범위에서 제외한다.
- ordered token match는 기존 substring 동작과 최대한 호환되도록 anchor 없는 방식으로 정의한다.
- 파일 브라우저는 backend 탐색 엔진에서 wildcard 매칭을 수행하고 renderer는 raw query를 그대로 전달한다.
- 스펙 뷰어는 raw markdown line scan 단계에서 wildcard 매칭을 수행한 뒤 기존 `data-source-line` block 매핑을 재사용한다.

**Dependencies**:

- F29 (파일 브라우저 검색)
- F30 (스펙 뷰어 검색)

## Improvements

### Improvement: `workspace:searchFiles` query semantics 확장
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/04-interfaces.md` > `workspace:searchFiles 계약 요약 (F29)`  
**Current State**: 검색어는 파일명 substring(case-insensitive)으로만 해석된다.  
**Proposed**: `query`는 기존 substring을 기본값으로 유지하되, `*`가 포함된 경우 ordered token wildcard match로 해석한다. non-wildcard 문자가 없는 query는 empty query로 취급한다.  
**Reason**: IPC shape 변경 없이 검색 표현력을 높이면서도 전체 저장소 dump나 고비용 regex 처리를 피하기 위함이다.

### Improvement: 스펙 뷰어 검색 규칙의 wildcard semantics 명시
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/04-interfaces.md` > `8.2 스펙 뷰어 텍스트 검색 규칙 (F30)`  
**Current State**: 스펙 검색은 raw markdown substring(case-insensitive) 기준으로만 정의되어 있다.  
**Proposed**: `*`가 포함된 query는 같은 line 안에서 ordered token wildcard match로 해석하고, 줄바꿈을 넘는 wildcard는 지원하지 않는다고 명시한다.  
**Reason**: block highlight 모델과 search cost를 유지하면서 가장 자주 쓰는 패턴 검색 수요를 충족시키기 위함이다.

## Component Changes

### Component Change: File Tree Layer에 wildcard discoverability 추가
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.3 File Tree Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- 검색 입력 placeholder 또는 helper에 `*` wildcard 지원을 드러낸다.
- renderer는 wildcard query를 가공하지 않고 backend로 그대로 전달한다.
- `*`만 있는 query는 backend empty result를 그대로 표시하며 전체 트리를 강제로 나열하지 않는다.

### Component Change: Spec Viewer Layer wildcard matcher 추가
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.5 Spec Viewer Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- raw markdown line scan이 substring match에서 wildcard-aware ordered token match로 바뀐다.
- 기존 block highlight, focus, next/previous navigation, hotkey gate는 그대로 유지된다.
- 검색 입력 discoverability 문구에 `*` 사용 가능성이 드러난다.

### Component Change: Electron Boundary matcher semantics 확장
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.7 Electron Boundary`  
**Type**: Existing Component Extension  
**Change Summary**:

- `workspace-search` 엔진이 wildcard-aware matcher를 사용한다.
- local main / remote runtime 모두 동일 matcher semantics를 재사용한다.
- 결과 메타데이터 shape은 유지하고 매칭 규칙만 확장한다.

## API Changes

### API Change: `workspace:searchFiles` request 해석 규칙 업데이트
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/04-interfaces.md` > `workspace:searchFiles 계약 요약 (F29)`  
**Current State**: request shape는 `{ rootPath, query, ... }`이며 query semantics는 substring으로만 설명된다.  
**Proposed**:

- request shape 변화 없음
- `query` semantics:
  - `*` 미포함: 기존 substring(case-insensitive)
  - `*` 포함: ordered token wildcard match(case-insensitive)
  - non-wildcard 문자 없음: empty query 취급

**Reason**: 계약 호환성을 유지하면서 구현과 테스트가 동일 규칙을 기준으로 정렬되도록 하기 위함이다.

## Notes

### Scope Boundary

- 이번 범위는 `*` 단일 wildcard만 지원한다.
- 파일 브라우저는 path glob이 아니라 `fileName` 기준만 확장한다.
- 스펙 뷰어는 같은 line 안에서만 wildcard 매칭을 수행한다.
- literal `*` 검색, escape 문법, regex/fuzzy/replace는 후속 범위다.

---

# Part 2: Implementation Plan

# Implementation Plan: F31 검색 `*` wildcard 지원

## Overview

기존 F29/F30 검색 UX에 단일 wildcard `*`를 추가한다. 목표는 검색 계약이나 성능 보호 정책을 바꾸지 않으면서도 자주 쓰는 패턴 검색(`foo*bar`, `*guide`, `guide*`)을 지원하는 것이다.

핵심 설계는 다음과 같다.

1. 파일 브라우저는 backend matcher만 wildcard-aware로 바꾸고 기존 IPC shape를 유지한다.
2. 스펙 뷰어는 raw markdown line matcher만 wildcard-aware로 바꾸고 block highlight/navigation 모델은 유지한다.
3. `*`만 있는 query는 전체 결과를 쏟아내지 않도록 empty query로 취급한다.

## Scope

### In Scope

- 파일 브라우저 검색 `*` wildcard 지원
- 스펙 뷰어 검색 `*` wildcard 지원
- ordered token match semantics 정의 및 테스트 고정
- local/remote 공통 backend semantics 검증
- 최소 수준의 UI discoverability 문구 추가

### Out of Scope

- `?`, `[]`, regex, fuzzy search, replace
- literal `*` escape(`\*`)
- path 전체 glob(`src/*.tsx`)
- 스펙 검색의 줄바꿈 across-line wildcard
- 검색 기록/최근 검색어 저장

## Components

1. **Workspace Search Matcher**: 파일 브라우저용 wildcard matcher와 보호 정책 유지
2. **Spec Search Matcher**: raw markdown line 단위 wildcard matcher와 block line 계산
3. **Search UI Discoverability**: placeholder/helper 문구와 no-op `*` 질의 UX
4. **Validation**: local/remote backend + renderer regression test

## Implementation Phases

### Phase 1: Matcher semantics 구현

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | 파일 브라우저 wildcard matcher 구현 | P0 | - | Workspace Search Matcher |
| 2 | 스펙 검색 wildcard matcher helper 구현 | P0 | - | Spec Search Matcher |

### Phase 2: UI 통합

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | 파일 브라우저 검색 UI discoverability 반영 | P1 | 1 | Search UI Discoverability |
| 4 | 스펙 뷰어 wildcard matcher 통합 | P0 | 2 | Spec Search Matcher |

### Phase 3: 회귀 검증

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 5 | backend/runtime wildcard 회귀 테스트 추가 | P0 | 1 | Validation |
| 6 | renderer wildcard 회귀 테스트 추가 | P0 | 3, 4 | Validation |

## Task Details

### Task 1: 파일 브라우저 wildcard matcher 구현
**Component**: Workspace Search Matcher  
**Priority**: P0  
**Type**: Feature

**Description**:  
`electron/workspace-search.ts`의 파일명 매칭을 substring에서 wildcard-aware ordered token match로 확장한다. `foo*bar`는 fileName 안에서 `foo` 다음 `bar`가 순서대로 등장하면 매치된다. `*`만 있는 query는 empty query로 처리해 기존 result cap/time budget 정책을 우회하지 못하게 한다.

**Acceptance Criteria**:

- [ ] `guide*test`가 `guide-unit-test.md`를 매치한다.
- [ ] `*guide`와 `guide*`가 leading/trailing wildcard로 동작한다.
- [ ] `foo**bar`가 `foo*bar`와 동일하게 동작한다.
- [ ] `*` 또는 `**`만 입력하면 결과 0건 + non-truncated 상태를 반환한다.
- [ ] 기존 depth limit, large-directory skip, timedOut, result cap 동작은 그대로 유지된다.

**Target Files**:
- [M] `electron/workspace-search.ts` -- wildcard-aware matcher 및 empty-wildcard 처리
- [M] `electron/workspace-search.test.ts` -- ordered token match/empty-wildcard 보호 테스트

**Technical Notes**:

- strict glob anchor 대신 ordered token search를 사용해야 기존 substring UX와 덜 충돌한다.
- 매칭 함수는 fileName 문자열만 입력받는 순수 함수로 분리해 테스트하기 쉽게 유지한다.

**Dependencies**: -

### Task 2: 스펙 검색 wildcard matcher helper 구현
**Component**: Spec Search Matcher  
**Priority**: P0  
**Type**: Feature

**Description**:  
스펙 뷰어의 raw markdown line scan 로직을 별도 helper로 분리하고, 여기에 wildcard-aware ordered token match를 구현한다. block boundary 판정과 matched start line 계산을 helper로 이동해 spec panel 본체에서는 결과 line array만 소비하도록 만든다.

**Acceptance Criteria**:

- [ ] helper가 raw markdown line 배열에서 wildcard match start lines를 계산한다.
- [ ] 같은 line 안에서만 wildcard 매칭하고, 줄바꿈을 넘는 매치는 허용하지 않는다.
- [ ] `*`만 있는 query는 빈 매치 배열을 반환한다.
- [ ] 기존 block boundary 규칙(heading/list/blockquote/code/table)은 유지된다.

**Target Files**:
- [C] `src/spec-viewer/spec-search.ts` -- wildcard matcher + matched start line 계산 helper
- [C] `src/spec-viewer/spec-search.test.ts` -- ordered token match, block boundary, empty-wildcard 테스트

**Technical Notes**:

- spec panel에서 직접 문자열 로직을 들고 있지 않도록 helper로 분리하면 후속 검색 정책 변경이 쉬워진다.
- line-level semantics를 helper 테스트로 고정해 block mapping 회귀를 줄인다.

**Dependencies**: -

### Task 3: 파일 브라우저 검색 UI discoverability 반영
**Component**: Search UI Discoverability  
**Priority**: P1  
**Type**: Feature

**Description**:  
파일 브라우저 검색 입력에서 `*` 지원이 최소 수준으로 드러나도록 placeholder 또는 helper 문구를 조정한다. wildcard query는 renderer에서 변환하지 않고 그대로 backend에 전달한다.

**Acceptance Criteria**:

- [ ] 파일 브라우저 검색 입력에 `*` 지원이 드러나는 문구가 추가된다.
- [ ] query 전달 경로는 기존 debounce/clear 동작을 그대로 유지한다.
- [ ] `*` 단독 query는 전체 트리 목록이 아니라 검색 0건 상태로 남는다.

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- placeholder/helper 문구 및 no-op wildcard UX 유지

**Technical Notes**:

- backend semantics가 이미 empty query를 처리하므로 renderer는 query를 과도하게 재해석하지 않는다.
- helper 문구는 UI를 과도하게 복잡하게 만들지 않는 수준으로 유지한다.

**Dependencies**: 1

### Task 4: 스펙 뷰어 wildcard matcher 통합
**Component**: Spec Search Matcher  
**Priority**: P0  
**Type**: Feature

**Description**:  
`SpecViewerPanel`이 Task 2의 helper를 사용해 wildcard-aware search line을 계산하도록 연결한다. 기존 block highlight, focus, next/previous, `Cmd/Ctrl+F` gate는 그대로 유지하고 placeholder/helper 문구만 최소한으로 갱신한다.

**Acceptance Criteria**:

- [ ] `SpecViewerPanel`이 substring 대신 helper 기반 wildcard matcher를 사용한다.
- [ ] `api*error` 같은 query가 같은 line의 토큰 순서를 기준으로 block highlight를 만든다.
- [ ] `*` 단독 query는 `0 / 0` 상태를 유지한다.
- [ ] 기존 next/previous 이동, focus class, hotkey gate는 회귀하지 않는다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- helper 연동 + discoverability 문구 갱신

**Technical Notes**:

- `scrollIntoView`와 block class 토글 로직은 그대로 두고 match line 계산 경로만 바꾼다.
- Task 2에서 생성한 helper를 가져다 쓰는 형태로 구현해 panel 파일 충돌 범위를 줄인다.

**Dependencies**: 2

### Task 5: backend/runtime wildcard 회귀 테스트 추가
**Component**: Validation  
**Priority**: P0  
**Type**: Test

**Description**:  
local/remote 파일 검색이 동일 wildcard semantics를 유지하는지 검증한다. 특히 remote forwarding과 runtime search response가 wildcard query를 변형하지 않는지 확인한다.

**Acceptance Criteria**:

- [ ] local search engine 테스트에 wildcard matrix가 추가된다.
- [ ] backend integration 테스트가 wildcard query를 local/remote 모두로 전달하는 시나리오를 검증한다.
- [ ] remote runtime 검색 테스트가 wildcard semantics와 empty-wildcard no-op을 검증한다.

**Target Files**:
- [M] `electron/workspace-backend/backend-integration.test.ts` -- local/remote query forwarding 회귀 테스트
- [M] `electron/remote-agent/runtime/workspace-ops.test.ts` -- remote search wildcard/empty-wildcard 테스트
- [M] `electron/workspace-backend/remote-workspace-backend.test.ts` -- wildcard query forwarding shape 테스트

**Technical Notes**:

- remote 쪽은 matcher 자체보다 query forwarding + response parity를 검증하는 쪽이 효율적이다.
- `electron/workspace-search.test.ts`와 예시 패턴을 최대한 맞춰 semantic drift를 줄인다.

**Dependencies**: 1

### Task 6: renderer wildcard 회귀 테스트 추가
**Component**: Validation  
**Priority**: P0  
**Type**: Test

**Description**:  
파일 브라우저와 스펙 뷰어의 wildcard UX를 자동 테스트로 고정한다. placeholder/helper, `*` 단독 query 처리, spec block highlight/navigation 회귀를 검증한다.

**Acceptance Criteria**:

- [ ] 파일 브라우저 검색 입력의 discoverability 문구가 테스트된다.
- [ ] 파일 브라우저에서 `*` 단독 query가 전체 목록을 노출하지 않는 동작이 테스트된다.
- [ ] 스펙 뷰어에서 wildcard query 입력 시 block highlight와 결과 카운트가 테스트된다.
- [ ] 스펙 뷰어에서 `*` 단독 query가 `0 / 0`을 유지하는 동작이 테스트된다.

**Target Files**:
- [M] `src/file-tree/file-tree-panel.test.tsx` -- wildcard discoverability/no-op query 테스트
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- wildcard block highlight/no-op query 테스트

**Technical Notes**:

- Task 2의 helper unit test와 Task 6의 component test는 같은 예시 패턴을 재사용하는 것이 좋다.

**Dependencies**: 3, 4

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| backend와 spec viewer가 서로 다른 wildcard semantics로 갈라짐 | Medium | ordered token 규칙을 스펙과 테스트 예시로 고정하고 helper/unit test + integration test를 같이 유지 |
| `*` 단독 query가 전체 결과를 노출해 대형 저장소에서 부하 발생 | High | non-wildcard 문자 없는 query는 empty query로 강제 처리 |
| strict glob 기대 사용자와 substring 호환 기대 사용자가 충돌 | Medium | 이번 범위는 anchor 없는 ordered token match로 명시하고 추후 strict glob은 별도 기능으로 분리 |
| discoverability 문구가 너무 약해 기능 존재를 모름 | Low | placeholder/helper 중 하나는 반드시 `*`를 언급하도록 acceptance에 고정 |

## Open Questions

- 이번 범위는 literal `*` escape를 제외한다. 실제 사용 중 문서 내 별표 자체를 찾는 요구가 생기면 `\*` 지원을 후속 항목으로 분리할지 검토가 필요하다.
- ordered token match를 채택하면 기존 substring UX와 호환성은 높지만 strict glob과는 다르다. 추후 path glob 요구가 생기면 `strict glob`을 별도 기능으로 분리하는 편이 안전하다.

## Parallelization Notes

- Task 1과 Task 2는 파일이 겹치지 않으므로 병렬 진행 가능하다.
- Task 3은 Task 1 이후 진행하는 편이 안전하다.
- Task 4는 Task 2가 만든 helper contract에 의존하므로 sequential이 적합하다.
- Task 5는 Task 1 완료 후 병렬 진행 가능하다.
- Task 6은 Task 3/4 완료 후 renderer 회귀를 묶어 처리하는 편이 충돌이 적다.

## Model Recommendation

- `sonnet` — 구현 범위는 작지만 matcher semantics, 기존 검색 회귀, local/remote parity를 함께 다뤄야 해서 중간 수준 추론이면 충분하다.
