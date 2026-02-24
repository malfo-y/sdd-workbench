# Feature Draft: F23 — 2패널 탭 레이아웃

## Part 1: Spec Patch Draft

> 이 패치는 해당 스펙 섹션에 직접 반영하거나, `spec-update-todo` 스킬의 입력으로 사용할 수 있음.

# Spec Update Input

**Date**: 2026-02-24
**Author**: user + Claude
**Target Spec**: `_sdd/spec/main.md` 및 하위 문서

## New Features

### Feature: 2패널 탭 레이아웃 (F23)
**Priority**: High
**Category**: UI/Layout
**Target Component**: App Shell, Workspace Layout
**Target Section**: `_sdd/spec/sdd-workbench/02-architecture.md` > `3. UI 레이아웃`

**Description**:
기존 3패널 레이아웃(파일 트리 | 코드 | 스펙)을 2패널 탭 레이아웃(사이드바 | 탭 콘텐츠)으로 변경한다.
- 좌측 사이드바: 워크스페이스 선택기/Open/Close + 현재 경로 + Open In + 파일 트리
- 우측 콘텐츠: "Code" / "Spec" 탭으로 전환되는 단일 뷰 영역
- 헤더: 좌측(타이틀 + Back/Forward + Code/Spec 탭) + 우측(코멘트 액션)
- 워크스페이스 관리(선택기/Open/Close)는 헤더에서 사이드바 상단으로 이동

**Acceptance Criteria**:
- [ ] 3패널 그리드가 2패널(사이드바 + 콘텐츠)로 변경됨
- [ ] "Code" / "Spec" 탭 클릭으로 콘텐츠 영역 전환
- [ ] 탭 전환 시 각 뷰의 스크롤 위치 유지
- [ ] spec 링크 점프 / Go to Source 시 Code 탭으로 자동 전환
- [ ] 워크스페이스 선택기/Open/Close가 사이드바 상단(타이틀 아래, 현재 경로 위)에 배치
- [ ] 리사이저가 1개(사이드바 ↔ 콘텐츠)로 축소
- [ ] 최소 앱 폭이 기존 대비 크게 축소됨(우측 패널 제거 효과)
- [ ] 워크스페이스 1개 이상일 때 사이드바에서 전환 가능
- [ ] Cmd+Shift+Up/Down 키보드 워크스페이스 전환 동작 유지
- [ ] 기존 코멘트/export/검색 기능이 탭 전환 후에도 정상 동작
- [ ] 기존 테스트 통과(일부 레이아웃 관련 테스트 수정 필요)

**Technical Notes**:
- 기존 `PaneSizes`(`left/center/right`)를 `left/content`로 단순화
- CSS Grid 3열 → 2열 변경
- 탭 상태는 워크스페이스별로 유지하지 않음(전역 UI 상태)
- spec 스크롤 위치 복원 로직은 기존 런타임 방식 유지

**Dependencies**:
- 없음 (기존 구현 위에 레이아웃 재구성)

---

## Component Changes

### Modified Component: App Shell (`src/App.tsx`)
**Target Section**: `_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`
**Purpose**: 3패널 → 2패널 탭 레이아웃 전환
**변경 사항**:
- 헤더: 워크스페이스 그룹 제거, 탭 바 추가
- 레이아웃: 3열 그리드 → 2열 그리드
- 사이드바: 워크스페이스 선택기/Open/Close 포함
- 콘텐츠: 탭 상태에 따라 CodeViewerPanel 또는 SpecViewerPanel 렌더
- 리사이즈: 핸들 1개로 축소
- spec 점프/Go to Source 시 탭 자동 전환

### Modified Component: Architecture Layout (`02-architecture.md` 3절)
**Target Section**: `_sdd/spec/sdd-workbench/02-architecture.md` > `3. UI 레이아웃`
**변경 사항**:
```text
Header Left: Title + Back/Forward + [Code|Spec] Tab
Header Right: Comments(Global/View)
Left Sidebar: Workspace(Selector/Open/Close) + Current Path + Open In + FileTree
Content: Code Preview OR Rendered Spec (tab-switched)
```

---

## Notes

### Context
- 기존 3패널은 넓은 화면이 필요하여 작은 모니터/분할 화면에서 불편
- 코드와 스펙을 동시에 볼 필요가 적고, 탭 전환으로 충분
- 워크스페이스 관련 컨트롤을 사이드바에 모으면 헤더가 간결해짐

### Constraints
- spec 스크롤 위치 복원은 기존 런타임 방식 유지
- 코멘트/export/검색 기능은 동작 변경 없음
- spec 링크 클릭 → Code 탭 자동 전환 + 라인 점프

---

# Part 2: Implementation Plan

## Overview

3패널 레이아웃을 2패널 탭 레이아웃으로 전환한다. 코드와 스펙을 탭으로 전환하는 단일 콘텐츠 영역을 도입하고, 워크스페이스 관리 UI를 사이드바로 이동하며, 리사이즈 로직을 단순화한다.

## Scope

### In Scope
- 3패널 → 2패널 그리드 전환 (CSS + JSX)
- Code/Spec 탭 바 추가 (헤더 영역)
- 워크스페이스 선택기/Open/Close를 사이드바 상단으로 이동
- 리사이즈 핸들 1개로 축소
- spec 링크/Go to Source → Code 탭 자동 전환
- 탭 전환 시 스크롤 위치 보존
- 기존 테스트 수정

### Out of Scope
- 탭 전환 키보드 단축키 (후속 feature)
- 모바일 반응형 재설계 (후속 feature)
- 새로운 탭 유형 추가 (e.g. Terminal)

## Components
1. **Tab State**: `activeTab: 'code' | 'spec'` 상태 관리
2. **Header Tab Bar**: Code/Spec 탭 UI 컴포넌트
3. **Sidebar Layout**: 워크스페이스 관리 + 파일 트리 통합
4. **Content Area**: 탭에 따른 조건부 렌더링
5. **Auto Tab Switch**: spec 점프 시 Code 탭 전환 로직
6. **Resize Simplification**: 2열 리사이즈 로직

## Implementation Phases

### Phase 1: 레이아웃 구조 변경 + 탭 상태
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1  | CSS 그리드를 3열에서 2열로 변경 + 탭 바 스타일 | P0 | - | Layout |
| 2  | 탭 상태 + 탭 바 JSX + 조건부 렌더링 | P0 | - | Tab State, Content |
| 3  | 워크스페이스 선택기/Open/Close를 사이드바로 이동 | P0 | - | Sidebar |
| 4  | 리사이즈 로직 2열 단순화 | P0 | 1 | Resize |

### Phase 2: 동작 통합 + 테스트
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 5  | spec 점프/Go to Source → Code 탭 자동 전환 | P0 | 2 | Auto Tab Switch |
| 6  | 기존 테스트 수정 + 탭 전환 테스트 추가 | P1 | 2, 3, 5 | Test |

## Task Details

### Task 1: CSS 그리드를 3열에서 2열로 변경 + 탭 바 스타일
**Component**: Layout
**Priority**: P0-Critical
**Type**: Refactor

**Description**:
`.workspace-layout`의 CSS Grid를 3열(사이드바/리사이저/코드/리사이저/스펙)에서 2열(사이드바/리사이저/콘텐츠)로 변경한다. 우측 리사이저와 스펙 패널 열을 제거한다. 탭 바 스타일을 추가한다.

**Acceptance Criteria**:
- [ ] `.workspace-layout` 그리드가 `minmax(220px, var(--pane-left)) 12px minmax(360px, var(--pane-content))` 3열(좌+리사이저+콘텐츠)
- [ ] `--pane-center`/`--pane-right` CSS 변수 → `--pane-content`로 통합
- [ ] 우측 `.pane-resizer` 관련 스타일 불필요 (좌측 1개만 유지)
- [ ] `.content-tab-bar` 탭 버튼 스타일 추가 (활성/비활성 시각 구분)
- [ ] 헤더에서 워크스페이스 그룹 스타일 제거
- [ ] 사이드바 상단 워크스페이스 관리 영역 스타일 추가

**Target Files**:
- [M] `src/App.css` -- 그리드/탭/헤더/사이드바 스타일 전면 수정

**Technical Notes**:
- 기존 `--pane-left` 기본값은 유지(예: 25%), `--pane-content`는 나머지(`1fr`)
- 탭 바는 콘텐츠 영역 상단에 고정(헤더의 Back/Forward 옆)
- min-width 제약: 사이드바 220px, 콘텐츠 360px 유지

**Dependencies**: 없음

---

### Task 2: 탭 상태 + 탭 바 JSX + 조건부 렌더링
**Component**: Tab State, Content Area
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`App.tsx`에 `activeTab` 상태(`'code' | 'spec'`)를 추가한다. 헤더의 Back/Forward 옆에 Code/Spec 탭 버튼을 배치한다. 콘텐츠 영역에서 `activeTab`에 따라 `CodeViewerPanel` 또는 `SpecViewerPanel`을 조건부 렌더링한다. 비활성 탭의 컴포넌트는 언마운트하지 않고 CSS `display: none`으로 숨겨 스크롤 위치/상태를 유지한다.

**Acceptance Criteria**:
- [ ] `activeTab` 상태가 `'code'`(기본) / `'spec'`으로 전환
- [ ] 탭 바가 헤더의 Back/Forward 오른쪽에 위치
- [ ] Code 탭 활성 시 CodeViewerPanel 표시, SpecViewerPanel 숨김
- [ ] Spec 탭 활성 시 SpecViewerPanel 표시, CodeViewerPanel 숨김
- [ ] 탭 전환 시 각 뷰의 스크롤 위치 유지
- [ ] 3패널 JSX 구조가 2패널로 변경(우측 리사이저 + 우측 pane-slot 제거)
- [ ] `PaneSizes` 타입이 `{ left: number; content: number }`로 단순화
- [ ] 헤더에서 워크스페이스 그룹(WorkspaceSwitcher/Open/Close) 제거

**Target Files**:
- [M] `src/App.tsx` -- 탭 상태, 헤더 재구성, 레이아웃 JSX 변경, PaneSizes 단순화

**Technical Notes**:
- `display: none` 방식으로 비활성 탭을 숨겨야 spec 스크롤 위치 복원이 자연스럽게 동작
- `PaneSizes`에서 `center`/`right` 제거, `content` 추가
- 리사이즈 핸들도 `'left'` 1개만 남김 (`'right'` 제거)
- `workspaceLayoutStyle`에서 `--pane-center`/`--pane-right` → `--pane-content`

**Dependencies**: 없음

---

### Task 3: 워크스페이스 선택기/Open/Close를 사이드바로 이동
**Component**: Sidebar Layout
**Priority**: P0-Critical
**Type**: Refactor

**Description**:
헤더의 `header-workspace-group`(WorkspaceSwitcher + Open/Close 버튼)을 사이드바 상단으로 이동한다. 사이드바 내 배치 순서: 워크스페이스 선택기+Open/Close → 현재 경로(workspace-summary) → Open In → 파일 트리.

**Acceptance Criteria**:
- [ ] 헤더에서 `header-workspace-group` 전체 제거
- [ ] 사이드바 `.file-panel` 최상단에 워크스페이스 관리 블록 배치
- [ ] 배치 순서: 선택기+Open/Close → 현재 경로 → Open In → 파일 트리
- [ ] WorkspaceSwitcher의 `onSelectWorkspace`가 기존 MRU 동작 유지
- [ ] Open/Close 버튼 동작 변경 없음
- [ ] 사이드바 폭에 맞는 컴팩트 레이아웃

**Target Files**:
- [M] `src/App.tsx` -- 워크스페이스 그룹 JSX 이동 (헤더 → 사이드바)
- [M] `src/App.css` -- 사이드바 워크스페이스 관리 영역 스타일

**Technical Notes**:
- `WorkspaceSwitcher` 컴포넌트 자체는 수정 불필요 (props 동일)
- 사이드바에서 select 요소가 사이드바 폭에 맞게 `width: 100%` 적용
- Open/Close 버튼은 아이콘+라벨 → 아이콘 only(또는 컴팩트)로 변경 가능

**Dependencies**: 없음

---

### Task 4: 리사이즈 로직 2열 단순화
**Component**: Resize Simplification
**Priority**: P0-Critical
**Type**: Refactor

**Description**:
기존 3열 리사이즈 로직(좌측/우측 핸들, `left`/`center`/`right` 퍼센트)을 2열(좌측 핸들만, `left`/`content` 퍼센트)로 단순화한다.

**Acceptance Criteria**:
- [ ] `ResizeHandle` 타입에서 `'right'` 제거 (또는 타입 자체를 단순화)
- [ ] `ResizeSession` / 리사이즈 핸들러에서 `'right'` 분기 제거
- [ ] 좌측 핸들 드래그 시 `left`와 `content`만 조정
- [ ] min-width 제약: 사이드바 220px, 콘텐츠 360px
- [ ] 우측 리사이저 JSX 제거

**Target Files**:
- [M] `src/App.tsx` -- PaneSizes, ResizeHandle, 리사이즈 핸들러, JSX

**Technical Notes**:
- Task 2에서 `PaneSizes` 타입 변경과 함께 진행
- `handlePointerMove`에서 `right` 핸들 분기 삭제
- `MIN_RIGHT_PANE_WIDTH` → `MIN_CONTENT_PANE_WIDTH`로 이름 변경 (또는 `MIN_CENTER_PANE_WIDTH` 재활용)

**Dependencies**: Task 1 (CSS 그리드 변경 후)

---

### Task 5: spec 점프/Go to Source → Code 탭 자동 전환
**Component**: Auto Tab Switch
**Priority**: P0-Critical
**Type**: Feature

**Description**:
spec 링크 클릭(파일 열기 + 라인 점프)이나 "Go to Source" 액션 실행 시 자동으로 Code 탭으로 전환한다. View Comments에서 코멘트 target 클릭 시에도 Code 탭으로 전환한다.

**Acceptance Criteria**:
- [ ] `openSpecRelativePath` (spec 링크 점프) 실행 시 `activeTab`을 `'code'`로 설정
- [ ] `goToActiveSpecSourceLine` (Go to Source) 실행 시 `activeTab`을 `'code'`로 설정
- [ ] View Comments 코멘트 target 클릭 → 코드 점프 시 `activeTab`을 `'code'`로 설정
- [ ] Code 탭 전환 후 정상적으로 라인 점프 동작

**Target Files**:
- [M] `src/App.tsx` -- spec 점프/Go to Source/코멘트 점프 콜백에 `setActiveTab('code')` 추가

**Technical Notes**:
- `openSpecRelativePath`는 파일을 선택하고 라인 점프를 요청하는 콜백
- `goToActiveSpecSourceLine`는 selection 기반 source line 점프
- 코멘트 target 클릭 점프 핸들러에도 동일 적용
- 탭 전환은 단순히 `setActiveTab('code')` 호출

**Dependencies**: Task 2 (탭 상태 존재해야 함)

---

### Task 6: 기존 테스트 수정 + 탭 전환 테스트 추가
**Component**: Test
**Priority**: P1-High
**Type**: Test

**Description**:
레이아웃 변경으로 인해 깨지는 기존 테스트를 수정한다. 3패널 관련 assertion을 2패널로 변경하고, 탭 전환 동작 테스트를 추가한다.

**Acceptance Criteria**:
- [ ] 기존 `App.test.tsx` 테스트 중 3패널 레이아웃/헤더 워크스페이스 관련 assertion 수정
- [ ] 탭 전환(Code ↔ Spec) 테스트 추가
- [ ] spec 점프 시 Code 탭 자동 전환 테스트 추가
- [ ] 사이드바 워크스페이스 관리 UI 존재 테스트 추가
- [ ] `npm test` 전체 통과
- [ ] `npx tsc --noEmit` 통과

**Target Files**:
- [M] `src/App.test.tsx` -- 기존 레이아웃 테스트 수정 + 탭 전환 테스트 추가

**Technical Notes**:
- `data-testid="pane-resizer-right"` 관련 assertion 제거
- `data-testid="header-workspace-group"` assertion → 사이드바 위치로 변경
- `data-testid="spec-panel"` assertion → 탭 전환 후 가시성 확인으로 변경
- 탭 전환 테스트: `fireEvent.click(탭 버튼)` → 해당 패널 표시 확인

**Dependencies**: Task 2, 3, 5 (모든 구조 변경 완료 후)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| spec 스크롤 위치 복원 실패(탭 숨김 시) | Medium | `display: none` 방식으로 DOM 유지, 언마운트 방지 |
| 기존 테스트 대량 실패 | Medium | Phase 2에서 집중 수정, 레이아웃 변경 후 즉시 검증 |
| 코멘트 hover popover가 숨겨진 탭에서 동작 | Low | `display: none` 시 이벤트 전파 차단 확인 |
| 사이드바 워크스페이스 UI가 좁은 폭에서 잘림 | Low | min-width 220px 유지 + 컴팩트 스타일 적용 |

## Open Questions
- [ ] 탭 전환 키보드 단축키 필요 여부 (후속 feature로 분리 가능)
- [ ] 모바일/900px 이하 반응형 정책 재설계 필요 여부

## Model Recommendation
- **sonnet**: Task 1-5 (구조적이지만 명확한 변경)
- **sonnet**: Task 6 (테스트 수정은 패턴 반복)
