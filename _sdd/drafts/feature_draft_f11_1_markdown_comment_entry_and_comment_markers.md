# Feature Draft: F11.1 Markdown Comment Entry + Comment Markers

**Date**: 2026-02-22
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-22
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F11.1 Rendered Markdown에서 Add Comment
**Priority**: High
**Category**: Core Feature
**Target Component**: `src/spec-viewer/spec-viewer-panel.tsx`, `src/App.tsx`
**Target Section**: `/_sdd/spec/main.md` > `2.1 MVP 포함 범위`, `6.4 SpecViewerPanel`, `7. 상태 모델`, `12.2 Priority Queue`

**Description**:
Rendered Markdown 패널에서 텍스트를 선택한 뒤 우클릭하여 `Add Comment`를 실행할 수 있어야 한다. 이때 코멘트는 현재 `activeSpec` 파일 기준 source line으로 매핑되어 기존 F11 comments 저장소(`workspaceRoot/.sdd-workbench/comments.json`)에 동일 규칙으로 저장된다.

**Acceptance Criteria**:
- [ ] rendered markdown 텍스트 selection + 우클릭 시 `Add Comment` 액션이 표시된다.
- [ ] `Add Comment` 실행 시 F11의 코멘트 입력 모달을 재사용해 저장할 수 있다.
- [ ] 저장 대상 `relativePath`는 현재 `activeSpec` 경로이고, line은 source-line 기반으로 결정된다.
- [ ] 매핑 실패/activeSpec 부재 시 앱은 크래시하지 않고 no-op 또는 배너로 처리된다.
- [ ] 같은 컨텍스트 메뉴에 `Add Comment`와 `Go to Source`를 함께 노출하고, 순서는 `Add Comment`를 먼저 둔다.

**Technical Notes**:
- source line 매핑은 F10.1과 동일하게 `data-source-line` 기반 best-effort 규칙을 따른다.
- 매핑 규칙은 `exact-match 우선`, 실패 시 `nearest fallback`으로 고정한다(동률이면 더 작은 line).
- initial scope에서는 line 단위 anchor만 보장(문자 단위 정밀 매핑 제외).

**Dependencies**:
- F10.1 `Go to Source`의 source-line 해석 로직 재사용 가능
- F11 comment 저장 플로우 재사용

---

### Feature: F11.1 코드 뷰어 라인 코멘트 마커
**Priority**: High
**Category**: UI/UX
**Target Component**: `src/code-viewer/code-viewer-panel.tsx`
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`, `13.1 수용 기준`

**Description**:
코멘트가 달린 라인은 코드 뷰어 라인 번호 옆에 시각적 마커가 표시되어야 한다. 사용자는 어떤 라인에 코멘트가 있는지 스캔만으로 파악할 수 있어야 한다.

**Acceptance Criteria**:
- [ ] active file의 코멘트 라인에 마커가 표시된다.
- [ ] 같은 라인에 코멘트가 여러 개면 `count badge`로 개수를 표시한다.
- [ ] 라인 선택/드래그/우클릭 기존 동작(F03/F06.2/F11)은 회귀하지 않는다.

**Technical Notes**:
- 마커 표현은 `count badge`로 고정한다.
- 마커 계산은 파일별/라인별 precompute로 O(n) 반복을 줄인다.

**Dependencies**:
- F11 comments 상태(`comments`) 접근

---

### Feature: F11.1 rendered markdown 코멘트 마커
**Priority**: Medium
**Category**: UI/UX
**Target Component**: `src/spec-viewer/spec-viewer-panel.tsx`
**Target Section**: `/_sdd/spec/main.md` > `6.4 SpecViewerPanel`, `13.1 수용 기준`

**Description**:
Rendered Markdown에서도 코멘트가 달린 source line 근처에 마커가 표시되어야 한다. 이를 통해 문서 쪽에서도 코멘트 분포를 확인할 수 있어야 한다.

**Acceptance Criteria**:
- [ ] rendered markdown 블록(`h*`, `p`, `li`, `pre`, `table` 등) 중 코멘트 라인에 대응되는 블록에 마커가 표시된다.
- [ ] 마커 렌더는 sanitize 정책(F10)과 충돌하지 않는다.
- [ ] TOC/링크/Go to Source/F10.1 컨텍스트 메뉴 기존 동작은 회귀하지 않는다.

**Technical Notes**:
- 블록 매핑은 `data-source-line` 기반이며 `exact-match 우선`, 실패 시 `nearest fallback`을 허용한다(동률이면 더 작은 line).
- 상세 comment list popover는 out-of-scope(후속).

**Dependencies**:
- F10.1 source-line metadata
- F11 comments 데이터

---

### Feature: F11.1 증분 코멘트 Export (재-export 제외)
**Priority**: Medium
**Category**: Enhancement
**Target Component**: `src/App.tsx`, `src/code-comments/comment-types.ts`, `src/code-comments/comment-persistence.ts`, `src/code-comments/export-comments-modal.tsx`
**Target Section**: `/_sdd/spec/main.md` > `6.5 Workspace/Context Actions`, `7. 상태 모델`, `10. 성능/보안/신뢰성 기준`, `13.1 수용 기준`, `12.2 Priority Queue`

**Description**:
코멘트 export 시 아직 export되지 않은 코멘트만 bundle/_COMMENTS 생성 대상에 포함한다. 한 번 export 성공한 코멘트는 `comments.json`에 export 상태를 기록하고, 다음 export에서는 기본적으로 제외한다.

**Acceptance Criteria**:
- [ ] export payload는 기본적으로 `pending(미export)` 코멘트만 포함한다.
- [ ] export가 성공한 코멘트는 `comments.json`에 export 상태 필드(`exportedAt`)가 기록된다.
- [ ] pending 코멘트가 0개면 export 실행을 차단하고 사용자에게 안내한다.
- [ ] export 대상이 모두 실패하면 export 상태는 갱신되지 않는다.

**Technical Notes**:
- 코멘트 스키마에 `exportedAt?: string`(ISO timestamp)을 optional로 추가해 backward compatibility를 유지한다.
- legacy 코멘트(`exportedAt` 없음)는 모두 pending으로 취급한다.
- export 상태 갱신 기준은 "선택된 export 타겟 중 최소 1개 성공"으로 고정한다.

**Dependencies**:
- F11 export 모달/저장 플로우
- F11 comments read/write 영속화

---

## Improvements

### Improvement: comment line index 유틸 분리
**Priority**: Medium
**Target Section**: `/_sdd/spec/main.md` > `6. 컴포넌트 상세`, `10. 성능/보안/신뢰성 기준`
**Current State**: 코드/마크다운 패널에서 코멘트 라인 계산 로직이 각각 필요해 중복 계산 위험이 있음
**Proposed**: comment 목록을 파일/라인 인덱스로 변환하는 공용 유틸을 추가하고 두 패널이 재사용
**Reason**: 중복 제거, 성능/일관성 확보, 테스트 용이성 향상

---

## Component Changes

### New Component: `src/code-comments/comment-line-index.ts`
**Target Section**: `/_sdd/spec/main.md` > `6. 컴포넌트 상세`
**Purpose**: comments 배열을 `relativePath -> line -> count` 인덱스로 변환해 코드/마크다운 마커 렌더에 재사용
**Input**: `CodeComment[]`, `relativePath`
**Output**: line lookup map (`has(line)`, `count(line)`)

**Planned Methods**:
- `buildCommentLineIndex(comments)` - 전체 인덱스 생성
- `getCommentLineCount(index, relativePath, line)` - 라인별 개수 조회

### Update Component: `CodeViewerPanel`
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`
**Change Type**: Enhancement

**Changes**:
- props에 active file comment line index 입력 추가
- 라인 번호 옆 코멘트 마커 렌더 추가
- 기존 selection/context-menu 이벤트 경로 유지

### Update Component: `SpecViewerPanel`
**Target Section**: `/_sdd/spec/main.md` > `6.4 SpecViewerPanel`
**Change Type**: Enhancement

**Changes**:
- rendered selection context-menu에 `Add Comment` 액션 추가
- comment line index 기반 블록 마커 렌더 추가
- 기존 링크 popover/source popover와의 우선순위/상호 배타 규칙 명시

### Update Component: `App`
**Target Section**: `/_sdd/spec/main.md` > `6.5 Workspace/Context Actions`
**Change Type**: Enhancement

**Changes**:
- SpecViewer에서 올라온 `onRequestAddCommentFromSpec` 이벤트를 F11 모달 저장 경로로 연결
- comments -> line index 계산 후 CodeViewer/SpecViewer로 전달
- export 시 pending 코멘트 필터링 + 성공 코멘트 `exportedAt` 마킹 후 저장

### Update Component: `src/code-comments/comment-types.ts`, `src/code-comments/comment-persistence.ts`
**Target Section**: `/_sdd/spec/main.md` > `6. 컴포넌트 상세`, `7. 상태 모델`
**Change Type**: Enhancement

**Changes**:
- `CodeComment`에 optional `exportedAt` 필드 추가
- parse/serialize에서 `exportedAt`을 보존하고 legacy 스키마와 호환

### Update Component: `src/code-comments/export-comments-modal.tsx`
**Target Section**: `/_sdd/spec/main.md` > `6.5 Workspace/Context Actions`
**Change Type**: Enhancement

**Changes**:
- export 모달에 pending 코멘트 수 기반 안내/가드 추가
- pending 코멘트 0개일 때 confirm 비활성화

---

## Notes

### Context
F11은 “코드 뷰어에서만 코멘트 작성 가능”했기 때문에 스펙 문서 문맥에서 즉시 코멘트를 남기기 어려웠다. F11.1은 작성 진입점을 markdown renderer까지 확장하고, 코드/문서 양쪽 가시성 마커를 추가해 코멘트 기반 작업 루프를 단축한다. 추가로 증분 export 정책을 도입해 이미 처리한 코멘트의 중복 export를 줄인다.

### Constraints
- source line 매핑은 best-effort line 단위로 제한한다.
- source code 파일 자동 수정/relocation은 포함하지 않는다.
- 워크스페이스 경계 정책(F11)은 유지한다.
- export 상태는 코멘트 메타데이터(`comments.json`) 안에서만 관리한다(`_COMMENTS.md` 역파싱 금지).

### Open Questions
- 현재 없음 (2026-02-22 결정 반영 완료: `count badge`, `exact-match 우선 + nearest fallback`, `Add Comment` 우선 메뉴)

---

# Part 2: Implementation Plan

## Overview

F11.1은 F11 코멘트 시스템을 확장해 (1) rendered markdown에서 직접 코멘트를 추가하고, (2) 코드/문서 패널에 코멘트 마커를 표시하며, (3) 이미 export된 코멘트를 다음 export에서 제외하는 증분 export 정책을 도입한다. 핵심은 source-line 매핑 재사용(F10.1)과 공용 line index 유틸/코멘트 export 상태 추적을 결합해 회귀 없이 작업 밀도를 높이는 것이다.

## Scope

### In Scope
- rendered markdown selection 우클릭 `Add Comment`
- 코드 뷰어 라인 코멘트 마커
- rendered markdown 블록 코멘트 마커
- comment line index 공용 유틸
- 증분 export(`pending comments only`) + `exportedAt` 상태 기록
- 단위/통합 테스트 보강

### Out of Scope
- 코멘트 편집/삭제 UI
- 코멘트 마커 클릭 시 상세 리스트/스레드 UI
- 문자 단위 정밀 source 매핑
- 수동 reset/re-export-all 토글 UI

## Components

1. **Comment Line Index Layer**: 코멘트 라인 lookup 공용 유틸
2. **Spec Comment Entry Layer**: rendered markdown -> comment draft 연결
3. **Marker Rendering Layer**: code/spec 패널 시각 마커
4. **Incremental Export State Layer**: 코멘트 export 상태(`exportedAt`) 추적 및 pending 필터
5. **Validation Layer**: 회귀 테스트 및 상호작용 안정화

## Implementation Phases

### Phase 1: 데이터/계약 확장

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | comment line index 유틸 추가 | P0 | - | Comment Line Index Layer |
| T2 | App wiring 확장(spec add-comment + marker props) | P0 | T1 | Spec Comment Entry Layer |

### Phase 2: UI 구현

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | CodeViewer 라인 마커 렌더 구현 | P0 | T1,T2 | Marker Rendering Layer |
| T4 | SpecViewer `Add Comment` 컨텍스트 액션 구현 | P0 | T2 | Spec Comment Entry Layer |
| T5 | SpecViewer 블록 마커 렌더 구현 | P1 | T1,T4 | Marker Rendering Layer |

### Phase 3: 테스트/안정화

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T6 | 단위 테스트(comment line index + source-line mapping 경계) | P0 | T1,T4,T5 | Validation Layer |
| T7 | 통합 테스트(App/CodeViewer/SpecViewer 회귀) + 품질 게이트 | P0 | T3,T4,T5,T6 | Validation Layer |

### Phase 4: 증분 Export 확장

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T8 | 코멘트 스키마 `exportedAt` 확장 + persistence 호환성 보강 | P1 | - | Incremental Export State Layer |
| T9 | pending-only export + 성공 코멘트 마킹 구현 | P1 | T8 | Incremental Export State Layer |
| T10 | export 모달 pending 가드 + 회귀 테스트 보강 | P1 | T9 | Validation Layer |

## Task Details

### Task T1: comment line index 유틸 추가
**Component**: Comment Line Index Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
comments 배열을 파일/라인 인덱스로 변환하는 유틸을 추가한다. CodeViewer/SpecViewer가 동일한 계산 규칙을 공유하도록 만든다.

**Acceptance Criteria**:
- [ ] `relativePath` 기준 line count 조회가 가능하다.
- [ ] 같은 라인 다중 코멘트 count가 누적된다.
- [ ] 빈 목록/파일 불일치 케이스에서 안전한 fallback을 제공한다.

**Target Files**:
- [C] `/Users/hyunjoonlee/github/sdd-workbench/src/code-comments/comment-line-index.ts` -- line index 유틸 신규
- [C] `/Users/hyunjoonlee/github/sdd-workbench/src/code-comments/comment-line-index.test.ts` -- 유틸 단위 테스트

**Technical Notes**:
- line key는 number(1-based) 고정
- 성능 최적화를 위해 Map 기반 구현 권장

**Dependencies**: -

---

### Task T2: App wiring 확장(spec add-comment + marker props)
**Component**: Spec Comment Entry Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
App 레벨에서 comments 인덱스를 계산하고 CodeViewer/SpecViewer로 주입한다. SpecViewer에서 발생한 add-comment 요청을 F11의 comment draft/save 경로와 연결한다.

**Acceptance Criteria**:
- [ ] SpecViewer에서 add-comment 요청 이벤트를 수신해 comment modal을 띄운다.
- [ ] activeSpec 기준 relativePath/selectionRange가 draft에 반영된다.
- [ ] comments 인덱스가 CodeViewer/SpecViewer props로 전달된다.

**Target Files**:
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/App.tsx` -- spec add-comment handler + line index memo + props wiring
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/workspace/workspace-context.tsx` -- 필요 시 comments 노출 타입 보강

**Technical Notes**:
- F11의 `CommentEditorModal` 재사용
- workspace 변경 경합 가드(F11 기존 정책) 유지

**Dependencies**: T1

---

### Task T3: CodeViewer 라인 마커 렌더 구현
**Component**: Marker Rendering Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
코드 뷰어 라인 번호 옆에 코멘트 마커를 표시한다. 다중 코멘트 라인은 `count badge`로 표시한다.

**Acceptance Criteria**:
- [ ] 코멘트가 있는 라인에 마커가 렌더된다.
- [ ] 마커가 selection/drag/context-menu 동작을 방해하지 않는다.
- [ ] 파일 전환 시 해당 파일의 마커만 표시된다.

**Target Files**:
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/code-viewer/code-viewer-panel.tsx` -- line marker 렌더/props 처리
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/App.css` -- code line marker 스타일
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/code-viewer/code-viewer-panel.test.tsx` -- marker 렌더/상호작용 회귀 테스트

**Technical Notes**:
- 마커는 `aria-label`/`data-testid` 추가로 테스트 가능하게 구성
- 마커 표현은 `count badge`로 고정

**Dependencies**: T1, T2

---

### Task T4: SpecViewer `Add Comment` 컨텍스트 액션 구현
**Component**: Spec Comment Entry Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
Rendered Markdown selection 우클릭 메뉴에 `Add Comment`를 추가하고 source-line 해석 결과를 selectionRange로 변환해 App으로 전달한다.

**Acceptance Criteria**:
- [ ] selection + source-line 해석 성공 시 `Add Comment` 액션이 노출된다.
- [ ] 액션 실행 시 activeSpec/line 정보가 App으로 전달된다.
- [ ] 링크 popover/source popover와 충돌 없이 동작한다.
- [ ] 컨텍스트 메뉴에 `Add Comment`와 `Go to Source`를 함께 노출하고 `Add Comment`를 먼저 배치한다.

**Target Files**:
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.tsx` -- spec context action 추가
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-source-popover.tsx` -- 필요 시 액션 확장
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/source-line-resolver.ts` -- line range 보조 유틸(필요 시)
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.test.tsx` -- add-comment context test

**Technical Notes**:
- first iteration은 single-line(`Lx-Lx`) 저장 허용
- 액션 노출 우선순위는 `Add Comment` -> `Go to Source`로 고정
- source line 해석 실패 시 no-op 또는 기존 배너 정책 유지

**Dependencies**: T2

---

### Task T5: SpecViewer 블록 마커 렌더 구현
**Component**: Marker Rendering Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
Rendered Markdown 블록에 `data-source-line` 기준 코멘트 마커를 렌더한다. 사용자는 문서 쪽에서 코멘트 존재를 즉시 확인할 수 있다.

**Acceptance Criteria**:
- [ ] 코멘트 라인과 매핑된 블록에 마커가 표시된다.
- [ ] sanitize/markdown render 파이프라인을 깨지 않는다.
- [ ] TOC/링크 동작 회귀가 없다.

**Target Files**:
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.tsx` -- block marker 렌더
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/App.css` -- spec marker 스타일
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.test.tsx` -- marker 렌더 테스트

**Technical Notes**:
- 렌더 비용 제어를 위해 block component override 내부에서 최소 계산 유지
- 매핑 규칙은 `exact-match 우선`, 실패 시 `nearest fallback`을 허용(동률이면 더 작은 line)

**Dependencies**: T1, T4

---

### Task T6: 단위 테스트 보강
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
comment line index와 source-line mapping 경계 케이스를 단위 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] comment-line-index 유틸 케이스(빈 목록/다중 코멘트/파일 분리)가 통과한다.
- [ ] source-line -> selectionRange 변환 경계 테스트가 추가된다.

**Target Files**:
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/code-comments/comment-line-index.test.ts` -- 유틸 테스트 보강
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/source-line-resolver.test.ts` -- 경계 테스트 보강

**Technical Notes**:
- 테스트 데이터는 현실적인 markdown/code snippet 사용

**Dependencies**: T1, T4, T5

---

### Task T7: 통합 테스트 + 품질 게이트
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
App/CodeViewer/SpecViewer end-to-end 흐름에서 F11.1 동작과 기존 기능 회귀를 함께 검증한다.

**Acceptance Criteria**:
- [ ] markdown selection -> add comment -> code/spec marker 표시 흐름 통합 테스트가 통과한다.
- [ ] 기존 F10.1(`Go to Source`) 및 F11(`Add Comment`/`Export Comments`) 회귀가 없다.
- [ ] `npm test`, `npm run lint`, `npm run build` 통과.

**Target Files**:
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/App.test.tsx` -- 통합 플로우 추가
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/code-viewer/code-viewer-panel.test.tsx` -- marker 회귀
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.test.tsx` -- spec add-comment/marker 회귀

**Technical Notes**:
- 테스트에서 comments fixture를 workspace 경계 포함 경로로 구성
- flaky 방지를 위해 selection/contextmenu helper 유틸 재사용

**Dependencies**: T3, T4, T5, T6

---

### Task T8: 코멘트 스키마 `exportedAt` 확장 + persistence 호환성 보강
**Component**: Incremental Export State Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
코멘트 데이터 모델에 optional `exportedAt` 필드를 추가하고, read/write 직렬화 과정에서 backward compatibility를 유지한다.

**Acceptance Criteria**:
- [ ] `CodeComment`에 `exportedAt?: string` 필드가 추가된다.
- [ ] 기존 comments JSON(필드 없음)도 정상 파싱된다.
- [ ] serialize/parse 라운드트립에서 `exportedAt` 값이 보존된다.

**Target Files**:
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/code-comments/comment-types.ts` -- `CodeComment` 스키마 확장
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/code-comments/comment-persistence.ts` -- parse/serialize 호환성 보강
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/code-comments/comment-persistence.test.ts` -- `exportedAt` 라운드트립 테스트 추가

**Technical Notes**:
- timestamp 형식은 ISO string으로 고정
- invalid `exportedAt` 값은 무시하고 pending으로 처리

**Dependencies**: -

---

### Task T9: pending-only export + 성공 코멘트 마킹 구현
**Component**: Incremental Export State Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
Export Comments 실행 시 pending 코멘트만 bundle/_COMMENTS/copy 대상에 포함한다. 선택된 타겟 중 최소 1개가 성공하면 export된 코멘트에 `exportedAt`을 기록해 저장한다.

**Acceptance Criteria**:
- [ ] export payload는 pending 코멘트만 포함한다.
- [ ] export 성공(최소 1개 타겟 성공) 시 해당 코멘트만 `exportedAt`이 갱신된다.
- [ ] export 전체 실패 시 `exportedAt`은 갱신되지 않는다.
- [ ] 기존 F11 길이 제한 정책(`MAX_CLIPBOARD_CHARS`)과 충돌하지 않는다.

**Target Files**:
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/App.tsx` -- pending 필터/성공 판정/`exportedAt` 마킹/저장
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/code-comments/comment-export.ts` -- pending 기준 렌더 호출 회귀 보강(필요 시)
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/App.test.tsx` -- 증분 export 시나리오 통합 테스트

**Technical Notes**:
- export 대상 snapshot을 먼저 고정한 후 side effect를 수행해 경합을 줄인다.
- save 실패 시 배너로 실패를 알리고 메모리 상태/파일 상태 불일치를 최소화한다.

**Dependencies**: T8

---

### Task T10: export 모달 pending 가드 + 회귀 테스트 보강
**Component**: Validation Layer
**Priority**: P1-High
**Type**: Feature/Test

**Description**:
export 모달에서 pending 코멘트 수를 기준으로 안내/버튼 활성화를 제어한다. pending이 0이면 confirm을 비활성화해 불필요한 빈 export를 방지한다.

**Acceptance Criteria**:
- [ ] 모달에 pending 코멘트 수가 표시된다.
- [ ] pending 0개면 export confirm이 비활성화된다.
- [ ] pending이 존재할 때 기존 export 옵션(copy/file)이 정상 동작한다.

**Target Files**:
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/code-comments/export-comments-modal.tsx` -- pending 가드/표시 추가
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/App.css` -- pending 안내 UI 스타일
- [M] `/Users/hyunjoonlee/github/sdd-workbench/src/App.test.tsx` -- pending 0/양수 케이스 테스트

**Technical Notes**:
- 초기 MVP에서는 `Include exported` 토글을 제공하지 않는다.

**Dependencies**: T9

---

## Parallel Execution Summary

- 최대 병렬도: **2**
- 병렬 가능 그룹:
  - Group A: `T1`
  - Group B: `T2`
  - Group C (부분 병렬): `T3` || `T4` (단, `App.tsx` 충돌 여부에 따라 순차 fallback)
  - Group D: `T5`
  - Group E: `T6`
  - Group F: `T7`
  - Group G: `T8`
  - Group H: `T9`
  - Group I: `T10`

충돌 포인트:
- `src/App.tsx`: T2/T7/T9
- `src/spec-viewer/spec-viewer-panel.tsx`: T4/T5/T7
- `src/code-viewer/code-viewer-panel.tsx`: T3/T7
- `src/App.css`: T3/T5/T10
- `src/App.test.tsx`: T7/T9/T10

의미적 충돌 포인트:
- source-line 매핑 규칙(F10.1)과 comment 저장 line 규칙(F11.1) 불일치 가능성
- marker count badge 표시 규칙이 code/spec 패널에서 달라질 위험
- export 성공 판정(부분 성공/전체 실패)과 `exportedAt` 마킹 기준 불일치 가능성

## Risks

1. rendered markdown selection이 브라우저/DOM 구조 차이로 불안정할 수 있다.
2. 블록 단위 `data-source-line` 매핑은 실제 사용자 의도 라인과 오차가 날 수 있다.
3. marker 렌더가 많은 문서/파일에서 리렌더 비용을 증가시킬 수 있다.
4. `exportedAt` 마이그레이션 처리 누락 시 기존 코멘트가 의도치 않게 제외될 수 있다.
5. export 후 save 실패 시 "내보냈지만 상태 미기록" 재시도 케이스가 발생할 수 있다.

## Open Questions

현재 없음 (2026-02-22 결정 반영 완료)

---

## Next Steps

1. `spec-update-todo`로 Part 1을 스펙에 `📋 Planned`로 반영
2. `implementation-plan` 없이 바로 implementation 가능(범위 M)
3. 구현 완료 후 `spec-update-done`으로 F11.1 상태 동기화
