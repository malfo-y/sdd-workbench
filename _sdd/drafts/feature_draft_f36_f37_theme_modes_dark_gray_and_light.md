# Feature Draft: F36/F37 테마 모드 도입 (`dark-gray` 기준선 + `light` 추가)

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

### Feature: F36 Appearance theme foundation + `dark-gray` baseline
**Priority**: High  
**Category**: Appearance / Theme Architecture  
**Target Component**: `App`, `App CSS`, `CodeEditorPanel`  
**Target Section**: `_sdd/spec/main.md` > `현재 상태 요약`; `_sdd/spec/sdd-workbench/product-overview.md` > `MVP 범위`, `기능 커버리지`; `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`, `1.4 Code Editor Layer`; `_sdd/spec/sdd-workbench/contract-map.md` > `1. 핵심 타입 계약`, `2. 링크/경로 해석 규칙`; `_sdd/spec/sdd-workbench/appendix.md` > `기능 이력`, `상세 수용 기준`

**Description**:  
앱의 현재 다크 계열 시각 스타일을 공식 `dark-gray` 테마 기준선으로 정리하고, appearance theme 선택/영속화의 기본 구조를 도입한다. MVP에서는 기존 look을 최대한 유지하되, 특히 Code Editor는 전체 앱 톤과 더 잘 맞도록 약간 더 gray 쪽으로 조정한다. 이 기능은 “완전한 true dark”를 추가하는 것이 아니라, 현재 팔레트를 `dark-gray`로 명시하고 이후 추가 테마를 얹을 수 있는 기반을 만드는 작업이다.

**Acceptance Criteria**:

- [ ] 앱은 최소 `dark-gray`, `light` 두 가지 appearance theme를 이해하는 상태 계약을 가진다.
- [ ] 기본값은 기존 사용자 경험을 유지하도록 `dark-gray`를 사용한다.
- [ ] 사용자가 선택한 theme는 localStorage 등 기존 renderer persistence 경로에 저장되고, 앱 재시작 후 복원된다.
- [ ] App shell, panel, button, tab, banner, modal, file tree 등 주요 UI 색상은 하드코딩 값 대신 theme token/variable을 우선 사용한다.
- [ ] Code Editor의 현재 다크 테마는 `dark-gray` 기준선에 맞게 약간 더 gray 쪽으로 조정되며, 기존 검색/selection/navigation highlight 가독성은 유지된다.

**Technical Notes**:

- 범위의 핵심은 “다중 테마 지원을 위한 토큰화 + 현재 팔레트의 `dark-gray` 정규화”다.
- `true dark`는 이번 범위 밖이며, 현재 다크 팔레트를 유지·정리한 뒤 별도 feature로 추가한다.
- Theme 전환은 renderer 주도 상태로 처리하고, Electron `nativeTheme`는 이번 draft에서 필수 의존성으로 두지 않는다.

**Dependencies**:

- F18 Shiki 기반 코드 하이라이팅
- F24 CodeMirror 6 기반 코드 에디터
- F34/F35 navigation highlight (상태색 회귀 방지 필요)

### Feature: F37 `light` theme 지원
**Priority**: High  
**Category**: Appearance / Theme Variant  
**Target Component**: `App`, `CodeEditorPanel`, `SpecViewerPanel`, `syntax-highlight`  
**Target Section**: `_sdd/spec/main.md` > `현재 상태 요약`; `_sdd/spec/sdd-workbench/product-overview.md` > `MVP 범위`, `기능 커버리지`; `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`, `1.4 Code Editor Layer`, `1.5 Spec Viewer Layer`; `_sdd/spec/sdd-workbench/contract-map.md` > `1. 핵심 타입 계약`, `5. 마커 매핑 규칙`; `_sdd/spec/sdd-workbench/appendix.md` > `기능 이력`, `상세 수용 기준`

**Description**:  
`dark-gray` 기준선 위에 별도의 `light` theme를 추가한다. light theme는 앱 shell, 각 패널, 버튼/탭, banner/modal, CodeMirror, rendered spec code block(Shiki)까지 포함해 일관된 밝은 팔레트를 제공해야 한다. 목표는 VS Code/GitHub 계열의 익숙한 light 인상을 참고하되, 테마 시스템 전체를 복제하는 것이 아니라 현재 앱 구조에 맞는 토큰형 light palette를 제공하는 것이다.

**Acceptance Criteria**:

- [ ] 사용자가 `light` theme를 선택하면 App shell, sidebar, content panel, modal, popover, button, tab, file tree가 일관된 light palette로 전환된다.
- [ ] Code Editor는 별도의 light CM6 theme를 사용하며, 검색/selection/comment/git/navigation highlight 가독성을 유지한다.
- [ ] Spec Viewer의 fenced code block과 preview highlight는 light Shiki theme를 사용하고 dark inline color를 유지하지 않는다.
- [ ] Theme 전환은 앱 재시작 없이 즉시 반영된다.
- [ ] `light` 도입 후에도 `dark-gray` 모드의 기존 시각 인상과 사용성은 크게 흔들리지 않는다.

**Technical Notes**:

- Light theme는 현재 구조에 맞는 토큰 세트를 제공하는 것이 목적이며, VS Code 테마 시스템 자체를 복제하지 않는다.
- Shiki는 theme-aware highlighter 선택 또는 multi-theme caching이 필요하다.
- Spec Viewer와 Code Editor의 상태색(search/comment/navigation/selection)은 단순 palette invert가 아니라 theme별 대비를 재조정해야 한다.

**Dependencies**:

- F36 Appearance theme foundation + `dark-gray` baseline
- F18 Shiki 기반 코드 하이라이팅
- F24 CodeMirror 6 기반 코드 에디터

## Improvements

### Improvement: 하드코딩 색상값을 theme token 중심으로 정리
**Priority**: High  
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`; `_sdd/spec/sdd-workbench/contract-map.md` > `1. 핵심 타입 계약`  
**Current State**: `index.css`, `App.css`, CM6 theme, Shiki highlight 경로에 색상값이 직접 박혀 있어 새로운 theme variant 추가 비용이 높다.  
**Proposed**: 앱 공통 색을 semantic token(background/surface/text/border/accent/state)으로 모으고, `dark-gray`/`light` palette가 같은 token 표면을 공유하도록 바꾼다.  
**Reason**: light theme를 넣으려면 palette 추가보다 먼저 하드코딩 정리가 선행되어야 회귀 비용을 통제할 수 있다.

### Improvement: CodeMirror/Shiki를 theme-aware routing으로 확장
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.4 Code Editor Layer`, `1.5 Spec Viewer Layer`  
**Current State**: Code Editor는 dark CM6 theme만 있고, Shiki도 `github-dark` 하나만 사용한다.  
**Proposed**: active appearance theme에 따라 CM6 extension과 Shiki theme를 선택하는 공통 라우팅을 추가한다.  
**Reason**: 앱 shell만 light가 되고 코드 영역이 dark로 남으면 제품 완성도가 크게 떨어진다.

## Component Changes

### Component Change: App Shell appearance state + theme selector 추가
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`  
**Type**: Existing Component Extension  
**Change Summary**:

- App이 `appearanceTheme` 상태(`'dark-gray' | 'light'`)를 관리하고 persistence를 담당한다.
- 헤더 액션 영역에 최소 테마 전환 UI(`Theme` select 또는 동등한 control)를 추가한다.
- theme 변경 시 root-level dataset/class 또는 동등한 방식으로 전역 CSS token을 전환한다.

### Component Change: Global CSS token layer 도입
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`  
**Type**: Existing Styling Refactor  
**Change Summary**:

- `index.css`, `App.css`의 주요 색상값을 semantic CSS variable/token으로 치환한다.
- `dark-gray`와 `light`가 같은 token name을 공유하도록 palette layer를 분리한다.
- banner, tab, modal, popover, file tree, button hover/active, divider까지 포함해 주요 표면을 token 기반으로 맞춘다.

### Component Change: Code Editor theme routing 추가
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.4 Code Editor Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- CM6 dark theme를 `dark-gray` 기준으로 약간 더 graphite 톤으로 다듬는다.
- 별도 `light` CM6 theme extension을 추가한다.
- active appearance theme에 따라 Code Editor가 적절한 theme extension을 사용하도록 routing을 추가한다.

### Component Change: Spec code block theme routing 추가
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.5 Spec Viewer Layer`  
**Type**: Existing Component Extension  
**Change Summary**:

- Shiki highlight path가 active appearance theme에 맞는 theme를 선택하도록 확장한다.
- light theme에서 rendered code block이 dark inline color를 유지하지 않도록 한다.
- highlighter singleton/caching 전략이 theme variant를 고려하도록 확장한다.

## Notes

### Scope Boundary

- 이번 범위는 `dark-gray` + `light` 2개 테마만 다룬다.
- `true dark`, `system` follow, OS accent color 연동은 후속 범위다.
- 앱 전체 재디자인이 아니라 현재 UI를 기준으로 theme token을 정리하는 작업이다.
- VS Code theme marketplace 호환이나 외부 theme import는 포함하지 않는다.

### Context

현재 앱은 다크 계열이지만 사실상 `dark-gray`에 가깝고, Code Editor/Spec code block/App shell이 서로 다른 방식으로 색을 관리하고 있다. 사용자는 지금 look을 유지하면서 Code Editor만 약간 더 gray 쪽으로 맞춘 뒤, 실사용 가능한 `light` theme를 추가하기를 원한다. 따라서 이번 draft는 “current dark를 `dark-gray`로 정규화”하고, “light theme 하나를 완성도 있게 추가”하는 데 집중한다.

### Open Questions

- [ ] 이번 MVP의 theme selector 위치는 header action 영역을 기본값으로 둔다. 전용 settings 패널은 후속 범위다.
- [ ] `light` palette는 VS Code Light+와 GitHub Light 계열을 참고하되, exact cloning은 목표가 아니다.
- [ ] `true dark`와 `system` mode는 의도적으로 이번 draft에서 제외한다. 이유는 현재 목표가 `dark-gray` 정리 + `light` 추가이기 때문이다.
- [ ] F36/F37를 한 파일로 묶은 이유는 CSS token layer, CM6 theme routing, Shiki theme routing, App persistence/UI가 모두 공유되기 때문이다.

---

# Part 2: Implementation Plan

# Implementation Plan: F36/F37 테마 모드 도입 (`dark-gray` 기준선 + `light` 추가)

## Overview

이번 작업의 핵심은 현재 다크 계열 UI를 `dark-gray` 기준선으로 정리하고, 그 위에 `light` theme를 얹을 수 있는 토큰 기반 테마 구조를 만드는 것이다. 가장 중요한 점은 색을 단순 치환하는 것이 아니라 App shell, CodeMirror, Shiki code block이 같은 appearance state를 공유하도록 만드는 것이다.

## Scope

### In Scope

- `dark-gray`, `light` 두 가지 appearance theme 상태 계약
- 기본값 `dark-gray` + localStorage persistence
- header action 영역의 최소 theme selector
- `index.css`/`App.css` 기반 global tokenization
- Code Editor `dark-gray` retune + `light` CM6 theme 추가
- Spec code block(Shiki) theme routing 추가
- theme switching/persistence 회귀 테스트

### Out of Scope

- `true dark` 추가
- `system` follow 모드
- OS accent color 연동
- 외부 theme import/marketplace 호환
- 앱 전체 레이아웃/타이포 대개편

## Components

1. **Theme Contract Layer**: appearance state, persistence, root dataset/class
2. **Global Token Layer**: `index.css`/`App.css` semantic color tokens
3. **Code Editor Theme Layer**: CM6 `dark-gray`/`light` theme routing
4. **Spec Highlight Theme Layer**: Shiki light/dark-gray routing
5. **Selector Integration Layer**: header theme control + live switching
6. **Validation Layer**: persistence/visual contract regression

## Implementation Phases

### Phase 1: Theme Foundation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | appearance theme contract + persistence helper 추가 | P0 | - | Theme Contract Layer |
| 2 | App header theme selector + live switching wiring 추가 | P0 | 1 | Selector Integration Layer |

### Phase 2: Global Tokenization and `dark-gray`
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | global CSS token layer 도입 + 주요 UI 색상 토큰화 | P0 | 1 | Global Token Layer |
| 4 | Code Editor `dark-gray` retune + light theme routing 추가 | P0 | 1, 3 | Code Editor Theme Layer |

### Phase 3: `light` Theme Completion
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 5 | Shiki/spec code block theme-aware routing 추가 | P0 | 1, 3 | Spec Highlight Theme Layer |
| 6 | light palette를 App shell/panel/control 전반에 완성 | P1 | 2, 3, 4, 5 | Global Token Layer |

### Phase 4: Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 7 | persistence + theme switching regression test 보강 | P0 | 2, 4, 5, 6 | Validation Layer |

## Task Details

### Task 1: appearance theme contract + persistence helper 추가
**Component**: Theme Contract Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
Renderer가 공통으로 참조할 appearance theme 타입과 persistence helper를 도입한다. 기본값은 `dark-gray`로 두고, App은 초기 렌더 시 저장된 값을 읽어 active theme를 결정할 수 있어야 한다.

**Acceptance Criteria**:

- [ ] `appearanceTheme` 타입이 최소 `'dark-gray' | 'light'`를 지원한다.
- [ ] 저장/복원 helper가 malformed localStorage 값을 안전하게 무시하고 `dark-gray`로 fallback 한다.
- [ ] theme 변경 시 App이 root-level dataset/class를 갱신할 수 있다.
- [ ] 향후 `true dark` 추가가 가능한 additive contract여야 한다.

**Target Files**:
- [C] `src/theme/appearance-theme.ts` -- theme 타입, storage key, load/save helper
- [M] `src/App.tsx` -- appearance state + helper wiring
- [M] `src/App.test.tsx` -- malformed storage/default restore regression

**Technical Notes**:

- storage key는 기존 workspace session key와 분리하는 편이 안전하다.
- root-level attribute는 `document.documentElement` 또는 `.app-shell[data-theme]` 중 하나로 통일한다.

**Dependencies**: -

### Task 2: App header theme selector + live switching wiring 추가
**Component**: Selector Integration Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
header action 영역에 최소 theme selector를 추가하고, 선택 시 앱 전체 appearance state가 즉시 반영되도록 연결한다. MVP에서는 `Dark Gray`, `Light` 두 개 옵션만 제공한다.

**Acceptance Criteria**:

- [ ] header action 영역에서 `Dark Gray`, `Light` 중 하나를 선택할 수 있다.
- [ ] 선택 직후 앱 전체에 active theme가 반영된다.
- [ ] theme 변경 시 persistence helper가 호출된다.
- [ ] 기존 header action layout/comments/history/workspace control은 크게 깨지지 않는다.

**Target Files**:
- [M] `src/App.tsx` -- selector state/control/rendering
- [M] `src/App.css` -- header selector style
- [M] `src/App.test.tsx` -- live switching/persistence integration regression

**Technical Notes**:

- settings modal 없이도 접근 가능한 위치여야 하므로 header action 영역이 가장 단순하다.
- MVP에서는 segmented control보다 `select`가 구현 비용이 낮다.

**Dependencies**:

- Task 1

### Task 3: global CSS token layer 도입 + 주요 UI 색상 토큰화
**Component**: Global Token Layer  
**Priority**: P0-Critical  
**Type**: Refactor + Feature Foundation

**Description**:  
`index.css`, `App.css`의 주요 색상값을 semantic token으로 치환하고, `dark-gray`/`light` palette가 같은 token 표면을 공유하도록 정리한다. 최소한 App shell, sidebar, panel, tab, button, modal, popover, banner, file tree가 token 기반으로 동작해야 한다.

**Acceptance Criteria**:

- [ ] `index.css` 또는 동등한 글로벌 CSS 레이어에 공통 semantic token이 정의된다.
- [ ] 주요 UI 표면이 직접 hex 값보다 token 참조를 우선 사용한다.
- [ ] `dark-gray` palette는 현재 look을 크게 흔들지 않으면서 baseline 역할을 한다.
- [ ] `light` palette를 추가할 수 있도록 palette override 구조가 마련된다.

**Target Files**:
- [M] `src/index.css` -- global token 정의, root color-scheme/data-theme 규칙
- [M] `src/App.css` -- App shell/panel/button/tab/modal/banner/file tree 색상 토큰화
- [M] `src/App.tsx` -- root theme attribute wiring 확인

**Technical Notes**:

- token 이름은 raw color가 아니라 semantic 역할(surface/text/border/accent/state) 중심으로 잡는 편이 이후 확장에 유리하다.
- 한 번에 전체 파일을 뒤엎기보다 우선 user-visible surface를 먼저 토큰화한다.

**Dependencies**:

- Task 1

### Task 4: Code Editor `dark-gray` retune + light theme routing 추가
**Component**: Code Editor Theme Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
CM6 dark theme를 현재 앱 톤에 맞는 `dark-gray` 쪽으로 조정하고, 별도의 light CM6 theme extension을 추가한다. Code Editor는 active appearance theme에 따라 적절한 extension을 선택해야 한다.

**Acceptance Criteria**:

- [ ] 기존 dark CM6 theme가 `dark-gray` 기준으로 약간 더 gray 쪽으로 조정된다.
- [ ] light CM6 theme extension이 추가된다.
- [ ] theme switching 시 editor 재마운트 없이도 시각 상태가 일관되게 갱신된다.
- [ ] 검색/selection/comment/git/navigation highlight의 대비가 각 theme에서 유지된다.

**Target Files**:
- [M] `src/code-editor/cm6-dark-theme.ts` -- `dark-gray` retune
- [C] `src/code-editor/cm6-light-theme.ts` -- light CM6 theme
- [M] `src/code-editor/code-editor-panel.tsx` -- active theme routing
- [M] `src/code-editor/code-editor-panel.test.tsx` -- theme routing/highlight regression

**Technical Notes**:

- CM6는 extension selection을 theme state에 따라 분기하면 된다.
- navigation/search/comment gutter 색은 palette 변경 시 가장 먼저 깨지기 쉬운 표면이다.

**Dependencies**:

- Task 1
- Task 3

### Task 5: Shiki/spec code block theme-aware routing 추가
**Component**: Spec Highlight Theme Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
Spec Viewer의 code block highlight가 active theme에 따라 `dark-gray`/`light` variant를 선택하도록 확장한다. 현재 `github-dark` 고정 경로를 theme-aware API로 바꾸고, 필요하면 highlighter cache 전략도 theme별로 분리한다.

**Acceptance Criteria**:

- [ ] `highlightLines()` 또는 동등한 API가 active theme를 받아 적절한 Shiki theme를 사용한다.
- [ ] light theme에서 code block inline color가 dark palette로 남지 않는다.
- [ ] plaintext fallback과 unsupported language fallback은 기존처럼 안전하게 동작한다.
- [ ] Spec Viewer code block 렌더 경로가 새로운 theme contract를 사용한다.

**Target Files**:
- [M] `src/code-viewer/syntax-highlight.ts` -- theme-aware highlighter routing/cache
- [M] `src/code-viewer/syntax-highlight.test.ts` -- dark-gray/light theme regression
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- highlight 호출부 theme 전달
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- rendered code block theme regression

**Technical Notes**:

- current singleton은 `github-dark` 하나만 로드하므로 theme variant가 추가되면 cache key를 분리해야 한다.
- light theme는 `github-light` 계열이 가장 무난한 default다.

**Dependencies**:

- Task 1
- Task 3

### Task 6: light palette를 App shell/panel/control 전반에 완성
**Component**: Global Token Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:  
Task 3의 token 구조 위에 실제 `light` palette를 완성한다. App shell, sidebar, card/panel, modal, popover, button, tab, file tree, search/navigation/comment state 등 주요 user-visible surface가 light theme에서 어색하지 않게 동작해야 한다.

**Acceptance Criteria**:

- [ ] light theme에서 panel/surface/border/text 계층이 명확하다.
- [ ] file tree, tab bar, banner, modal, popover가 눈부심 없이 일관된 밝은 palette를 사용한다.
- [ ] state color(search/comment/navigation/git marker)가 background와 충분한 대비를 가진다.
- [ ] `dark-gray` palette와 selector/persistence contract는 회귀하지 않는다.

**Target Files**:
- [M] `src/index.css` -- light palette token values
- [M] `src/App.css` -- component-level token consumption/light state 조정
- [M] `src/App.tsx` -- 필요한 theme class/data attribute 보강

**Technical Notes**:

- 목표는 “밝기만 반전된 UI”가 아니라, 현재 제품 구조에 맞는 light surface hierarchy를 주는 것이다.
- light palette는 pure white 일변도보다 panel/elevated surface를 적당히 분리하는 편이 낫다.

**Dependencies**:

- Task 2
- Task 3
- Task 4
- Task 5

### Task 7: persistence + theme switching regression test 보강
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:  
theme switching과 persistence가 App/Code Editor/Spec code block 전반에서 회귀 없이 동작하는지 테스트를 추가한다. 최소한 default theme, 저장값 복원, live switching, highlight theme routing을 고정해야 한다.

**Acceptance Criteria**:

- [ ] App integration test가 default `dark-gray`, persisted `light`, malformed storage fallback을 검증한다.
- [ ] Code Editor test가 `dark-gray`/`light` theme routing과 highlight visibility를 검증한다.
- [ ] Shiki/spec code block test가 active theme에 따라 다른 highlight 결과를 사용하는 경로를 검증한다.
- [ ] 기존 navigation/search/comment 회귀 테스트와 충돌하지 않는다.

**Target Files**:
- [M] `src/App.test.tsx` -- theme selector/persistence integration
- [M] `src/code-editor/code-editor-panel.test.tsx` -- CM6 theme routing regression
- [M] `src/code-viewer/syntax-highlight.test.ts` -- Shiki theme selection regression
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- spec code block theme propagation regression

**Technical Notes**:

- CSS 실제 렌더 색을 완전히 스냅샷하기보다 `data-theme`, theme prop routing, DOM contract를 검증하는 편이 안정적이다.
- theme routing 테스트는 visual diff보다 “어떤 theme key가 선택됐는가”를 고정하는 방향이 효율적이다.

**Dependencies**:

- Task 2
- Task 4
- Task 5
- Task 6

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 하드코딩 색상 누락으로 일부 UI가 old dark 색을 유지할 수 있음 | High | semantic token 우선 refactor 후 user-visible surface를 체크리스트로 검증 |
| CM6/Spec/Shiki가 서로 다른 theme 인상을 줄 수 있음 | High | App theme contract를 단일 source of truth로 두고 editor/highlighter routing을 같은 key로 통일 |
| light theme에서 search/comment/navigation/git marker 대비가 떨어질 수 있음 | Medium | state color를 palette별 별도 조정하고 회귀 테스트 추가 |
| theme selector가 header layout을 어지럽힐 수 있음 | Low | MVP는 compact select 1개로 제한 |

## Parallelization Notes

- Task 1 완료 전에는 Task 2/4/5를 병렬로 시작하지 않는 편이 안전하다.
- Task 3과 Task 4/5는 contract 공유가 있지만, target file overlap이 제한적이라 foundation 이후 병렬화 여지가 있다.
- Task 6은 Task 3/4/5 결과를 반영해야 하므로 후반 통합 단계로 보는 편이 낫다.

## Definition of Done

- 사용자가 `Dark Gray`, `Light`를 전환할 수 있다.
- 앱 재시작 후 theme 선택이 복원된다.
- Code Editor와 Spec code block이 active theme에 맞게 렌더된다.
- 현재 look은 `dark-gray` baseline으로 보존된다.
- `true dark`를 넣지 않고도 구조적으로 후속 추가가 가능한 상태가 된다.
