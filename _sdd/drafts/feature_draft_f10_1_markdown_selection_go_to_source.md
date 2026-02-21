# Feature Draft: F10.1 Markdown Selection Go To Source

**Date**: 2026-02-21
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나, `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-21
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F10.1 마크다운 선택 우클릭 `Go to Source`
**Priority**: High
**Category**: UX
**Target Component**: `SpecViewerPanel`, `App`, `CodeViewerPanel` 연동
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue`

**Description**:
우측 Markdown 렌더 패널에서 텍스트를 선택한 뒤 우클릭하면 컨텍스트 액션(`Go to Source`)을 표시한다. 액션 실행 시 현재 렌더 중인 markdown 파일의 원본(센터 코드 뷰어)으로 이동하고, 선택된 렌더 텍스트가 속한 source line으로 점프한다.

**Acceptance Criteria**:
- [ ] 우측 렌더 패널에서 텍스트 선택 후 우클릭 시 `Go to Source` 액션이 표시된다.
- [ ] `Go to Source` 클릭 시 현재 `activeSpec` 파일이 center 코드 뷰어에서 열리고 해당 line으로 점프한다.
- [ ] line 매핑은 문자 단위 정밀 매핑이 아닌 line 기준(best-effort)으로 동작한다.
- [ ] `activeSpec`가 없거나 source line을 해석할 수 없을 때 앱이 깨지지 않고 no-op 또는 배너 피드백으로 처리된다.
- [ ] 기존 링크 인터셉트/링크 popover(F04.1), line jump(F05), 세션 복원(F09) 동작이 회귀하지 않는다.

**Technical Notes**:
- MVP는 "선택한 텍스트가 포함된 markdown 블록의 시작 line"을 source line으로 사용한다.
- 문자 오프셋 단위 정밀 매핑은 범위 밖으로 둔다.

**Dependencies**:
- F04/F04.1/F05/F09 구현 완료 상태

## Improvements

### Improvement: Spec Viewer 컨텍스트 액션 모델 확장
**Priority**: Medium
**Target Section**: `/_sdd/spec/main.md` > `6.4 SpecViewerPanel`, `11.3 멀티 워크스페이스 공통 규칙`
**Current State**: 링크 클릭 시 popover 액션만 존재하며, 선택 기반 source 이동 액션은 없음.
**Proposed**: 선택 기반 우클릭 액션(`Go to Source`)을 SpecViewerPanel 출력 계약에 추가.
**Reason**: 스펙 렌더와 원본 코드를 왕복하는 실사용 흐름(검토/수정 지시)에 필요한 핵심 탐색 UX다.

### Improvement: 수용 기준에 렌더 선택 -> source line 점프 회귀 테스트 추가
**Priority**: Medium
**Target Section**: `/_sdd/spec/main.md` > `13. 테스트 및 수용 기준`
**Current State**: 링크 기반 점프(F05) 테스트는 있으나 렌더 선택 우클릭 기반 점프 테스트는 없음.
**Proposed**: 우클릭 `Go to Source` 시나리오(정상/라인 해석 실패/no-op)를 통합 테스트에 추가.
**Reason**: 향후 markdown 렌더러/스타일 변경 시 핵심 UX 회귀를 조기 탐지하기 위함.

## Bug Reports

해당 없음

## Component Changes

### Update Component: SpecViewerPanel (`src/spec-viewer/spec-viewer-panel.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.4 SpecViewerPanel`
**Change Type**: Enhancement

**Changes**:
- markdown 렌더 블록의 source line 메타데이터를 사용해 우클릭 지점 line을 해석
- 텍스트 선택 + 우클릭 컨텍스트 액션 표시
- `onGoToSourceLine(lineNumber)` 콜백 계약 추가

### New Component: Spec Source Popover (`src/spec-viewer/spec-source-popover.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.4 SpecViewerPanel`
**Change Type**: New Component

**Changes**:
- 커서 위치 기반 소형 팝오버 UI
- `Go to Source` 버튼 + dismiss(외부 클릭/ESC)

### New Supporting Module: Source Line Resolver (`src/spec-viewer/source-line-resolver.ts`)
**Target Section**: `/_sdd/spec/main.md` > `8. 링크/경로 파싱 규칙 (MVP 고정)`
**Change Type**: New Supporting Module

**Changes**:
- 우클릭 이벤트 타깃 DOM에서 source line(`data-source-line`) 추출
- 선택 영역 anchor/focus 기반 fallback line 해석
- line 정규화(1 이상 정수)

### Update Component: App Shell Wiring (`src/App.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.5 Workspace/Context Actions`
**Change Type**: Enhancement

**Changes**:
- `SpecViewerPanel`의 `onGoToSourceLine` 이벤트를 `openSpecRelativePath`/jump 로직에 연결
- `activeSpec` 기준 center 코드뷰어 이동 + line jump 요청 생성

## Configuration Changes

해당 없음

## Notes

### Resolved Decisions
- [x] 문자 단위 정밀 매핑 대신 line 단위 best-effort로 구현한다.
- [x] 액션 이름은 `Go to Source`로 고정한다.
- [x] source 파일은 현재 `activeSpec`으로 고정한다(워크스페이스 간 탐색 없음).

### Scope Boundary
- 본 기능은 선택 기반 source 이동에 집중하며, markdown heading hash 정밀 스크롤 복원은 포함하지 않는다.
- link popover(`Copy Link Address`) UX를 대체하지 않고 공존한다.

---

# Part 2: Implementation Plan

## Overview

F10.1은 우측 markdown 렌더 텍스트에서 원본 markdown source line으로 즉시 왕복하는 보조 탐색 기능이다. 기존 F04.1 링크 popover와 F05 line jump 인프라를 재사용하되, 선택 기반 우클릭 진입점을 추가한다.

## Scope

### In Scope
- markdown 렌더 요소의 source line 메타데이터 활용
- 선택 + 우클릭 시 `Go to Source` 팝오버 액션
- `activeSpec` source file로 line jump 연결
- 회귀 테스트 추가

### Out of Scope
- 문자/토큰 단위 정밀 source 매핑
- cross-workspace source 탐색
- 외부 링크/링크 popover UX 재설계

## Components

1. **Source Line Resolver Layer**: 렌더 DOM -> line 번호 해석
2. **Spec Selection Action UI Layer**: 선택 우클릭 팝오버
3. **App Navigation Wiring Layer**: `activeSpec` source 이동 + line jump
4. **Validation Layer**: unit/integration 테스트 회귀 고정

## Implementation Phases

### Phase 1: Source Line Resolution Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | source line resolver 유틸 추가 | P0 | - | Source Line Resolver Layer |
| T2 | SpecViewer 우클릭 액션 UI(팝오버) 추가 | P0 | T1 | Spec Selection Action UI Layer |

### Phase 2: Wiring and Behavior Integration
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | SpecViewerPanel 선택 우클릭 + 콜백 연동 | P0 | T1,T2 | Spec Selection Action UI Layer |
| T4 | App jump wiring(`activeSpec` + line jump) 추가 | P0 | T3 | App Navigation Wiring Layer |

### Phase 3: Validation and Regression
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 단위/통합 테스트 추가 및 회귀 검증 | P0 | T3,T4 | Validation Layer |

## Task Details

### Task T1: source line resolver 유틸 추가
**Component**: Source Line Resolver Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
우클릭 이벤트 타깃과 선택 범위를 바탕으로 source line을 해석하는 유틸을 추가한다. line은 markdown 블록 메타데이터(`data-source-line`) 기준으로 계산하고, 숫자 정규화 규칙을 포함한다.

**Acceptance Criteria**:
- [ ] 이벤트 타깃에서 가장 가까운 `data-source-line` 값을 추출할 수 있다.
- [ ] 선택 anchor/focus 노드 기준 fallback 해석이 가능하다.
- [ ] line 값은 1 이상 정수로 정규화된다.
- [ ] 해석 실패 시 `null` 반환으로 안전하게 degrade 된다.

**Target Files**:
- [C] `src/spec-viewer/source-line-resolver.ts` -- DOM/selection 기반 source line 해석 유틸
- [C] `src/spec-viewer/source-line-resolver.test.ts` -- 성공/실패/fallback/정규화 테스트

**Technical Notes**:
- parser AST 직접 재계산보다 DOM 메타데이터 기반 해석을 우선한다.
- resolver는 SpecViewerPanel 외부에서도 재사용 가능한 순수 함수 중심으로 설계한다.

**Dependencies**: -

---

### Task T2: SpecViewer 우클릭 액션 UI(팝오버) 추가
**Component**: Spec Selection Action UI Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
선택 상태에서 우클릭 시 표시할 팝오버 컴포넌트를 추가한다. 최소 액션은 `Go to Source`와 `Close`를 제공한다.

**Acceptance Criteria**:
- [ ] 커서 위치 기준으로 팝오버가 표시된다.
- [ ] `Go to Source` 클릭 시 상위 콜백이 호출된다.
- [ ] 외부 클릭/ESC로 dismiss 가능하다.
- [ ] viewport 경계에서 위치가 클램프된다.

**Target Files**:
- [C] `src/spec-viewer/spec-source-popover.tsx` -- source 이동 액션 팝오버 컴포넌트
- [M] `src/App.css` -- spec source popover 스타일

**Technical Notes**:
- 기존 `spec-link-popover` 패턴(위치 클램프, dismiss 처리)을 재사용한다.
- 링크 popover와 클래스 네임 충돌이 없도록 prefix를 분리한다.

**Dependencies**: T1

---

### Task T3: SpecViewerPanel 선택 우클릭 + 콜백 연동
**Component**: Spec Selection Action UI Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`ReactMarkdown` 렌더 결과에 source line 메타데이터를 심고, 선택 + 우클릭 시 resolver로 line을 계산해 팝오버를 띄운다. `onGoToSourceLine(lineNumber)` 콜백 계약을 상위로 노출한다.

**Acceptance Criteria**:
- [ ] markdown 본문 블록 요소에 source line 메타데이터가 주입된다.
- [ ] 텍스트 선택 후 우클릭 시 `Go to Source` 팝오버가 표시된다.
- [ ] 선택이 없거나 line 해석 실패면 팝오버를 표시하지 않는다(no-op).
- [ ] 기존 링크 클릭 인터셉트/popover 동작이 유지된다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- 우클릭 이벤트/line 콜백/소스 메타데이터 주입
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- selection contextmenu + 링크 회귀 테스트

**Technical Notes**:
- `components` 오버라이드에서 주요 블록 요소(`p`, `li`, `h1~h6`, `pre`, `blockquote`)에 `data-source-line`을 부여한다.
- line source는 markdown AST node position.start.line을 사용한다.

**Dependencies**: T1,T2

---

### Task T4: App jump wiring(`activeSpec` + line jump) 추가
**Component**: App Navigation Wiring Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
SpecViewer에서 전달된 line 번호를 이용해 현재 `activeSpec` 파일 source로 이동한다. center 코드뷰어 파일 선택 + line jump 요청 토큰을 갱신한다.

**Acceptance Criteria**:
- [ ] `Go to Source` 실행 시 `activeSpec` 파일이 center에 열린다.
- [ ] line 선택 및 jump 요청이 생성된다.
- [ ] `activeSpec`이 없거나 워크스페이스 파일 목록에 없으면 no-op + 배너 처리된다.

**Target Files**:
- [M] `src/App.tsx` -- `onGoToSourceLine` 핸들러 + jump request wiring
- [M] `src/workspace/workspace-context.tsx` -- 배너 API 사용 경로 점검(필요 시)

**Technical Notes**:
- 기존 `openSpecRelativePath`/`setSelectionRange`/`CodeViewerJumpRequest` 흐름을 재사용한다.
- 중복 점프 방지를 위해 기존 token 증가 규칙을 따른다.

**Dependencies**: T3

---

### Task T5: 단위/통합 테스트 추가 및 회귀 검증
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
새 우클릭 소스 이동 흐름과 기존 링크/점프/세션 복원 회귀를 함께 검증한다.

**Acceptance Criteria**:
- [ ] resolver 단위 테스트가 통과한다.
- [ ] SpecViewer 우클릭 `Go to Source` 시나리오가 통과한다.
- [ ] App 통합 테스트에서 source 이동 후 code viewer line 선택이 검증된다.
- [ ] `npm test`, `npm run lint`, `npm run build`가 통과한다.

**Target Files**:
- [M] `src/spec-viewer/source-line-resolver.test.ts` -- resolver 테스트 보강
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- 우클릭 popover 시나리오 추가
- [M] `src/App.test.tsx` -- `activeSpec` source 이동 통합 테스트 추가

**Technical Notes**:
- jsdom selection mock을 사용해 우클릭 선택 시나리오를 안정적으로 재현한다.
- 링크 popover/Go to Source popover가 충돌하지 않도록 케이스를 분리한다.

**Dependencies**: T3,T4

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| Phase 1 | 2 | 2 | `src/App.css` (Task T2 단독 사용) |
| Phase 2 | 2 | 1 | `src/spec-viewer/spec-viewer-panel.tsx` (T3 중심), `src/App.tsx`(T4) |
| Phase 3 | 1 | 1 | 테스트 파일 집중 |

충돌 포인트:
- `src/spec-viewer/spec-viewer-panel.tsx`는 링크/우클릭/렌더 메타데이터 경계가 겹치므로 단일 태스크(T3)에서 순차 처리 필요.
- `src/App.tsx`는 F05/F09 점프 로직과 연결되므로 의미적 충돌 위험이 있어 T4에서만 수정 권장.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 블록 line 매핑 정확도 한계 | 사용자가 기대한 정확한 위치와 차이 | line 단위 best-effort를 명시하고 heading/paragraph 중심 메타데이터 적용 |
| 우클릭 시 브라우저 기본 메뉴/selection 충돌 | UX 불안정 | 조건부 `preventDefault`(선택 + line 해석 성공 시) 적용 |
| 링크 popover와 source popover 충돌 | 액션 혼란 | 상태 분리 + 상호 배타적 표시 규칙 |
| jump wiring 회귀 | 기존 F05/F09 동작 영향 | App/SpecViewer 통합 테스트 회귀 고정 |

## Open Questions

- [ ] 없음 (현재 결정: line 기준 best-effort + `Go to Source` 단일 액션)

## Model Recommendation

- 구현/테스트 병행: GPT-5-Codex High
- 사유: `spec-viewer-panel`/`App`/테스트 동시 수정과 selection 이벤트 회귀 점검이 필요함.

---

## Next Steps

### Apply Spec Patch (choose one)
- **Method A (automatic)**: `spec-update-todo` 스킬 실행 후 이 문서 Part 1 입력
- **Method B (manual)**: Part 1 항목을 `/_sdd/spec/main.md` 해당 Target Section에 반영

### Execute Implementation
- **Parallel**: `implementation` 스킬로 Part 2 실행
- **Sequential**: `implementation-sequential` 스킬로 Part 2 순차 실행
