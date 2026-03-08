# Implementation Plan: F36/F37 테마 모드 도입 (`dark-gray` baseline + `light`)

## Plan 요약

| 항목 | 내용 |
|------|------|
| 총 Phase 수 | 4 |
| 총 Task 수 | 7 |
| 최대 병렬 실행 | 3 tasks (Phase 2) |
| 예상 File Conflicts | 4개 주요 축 (`src/App.tsx`, `src/App.css`, `src/index.css`, 테스트 파일군) |
| Phase 전략 | Dependency-Driven |
| 모델 추천 | `gpt-5.3-codex` (`reasoning effort: high`) |

## 메타데이터

- 생성일: 2026-03-08
- 기준 문서:
  - Draft: `_sdd/drafts/feature_draft_f36_f37_theme_modes_dark_gray_and_light.md`
  - Spec: `_sdd/spec/main.md` v`0.49.1`
  - Spec detail: `_sdd/spec/sdd-workbench/03-components.md`, `_sdd/spec/sdd-workbench/04-interfaces.md`
- 전략 선택 근거:
  - `risk_ratio`: 약 `0.29` (Shiki/CM6 theme routing, 전역 token migration이 상대적 고위험)
  - `dep_depth`: `4` (theme contract -> App wiring -> token/theme routing -> light polish -> regression)
  - 사용자 대면 기능 비중이 높지만, 기반 상태/라우팅 의존성이 커서 `Dependency-Driven` 채택

## Overview

이번 작업은 현재 앱의 다크 계열 시각 스타일을 공식 `dark-gray` 기준선으로 정리하고, 그 위에 `light` theme를 얹을 수 있는 토큰 기반 테마 구조를 도입하는 것이다. 핵심은 App shell, CodeMirror, Spec Viewer code block(Shiki)이 동일한 appearance state를 공유하도록 만들고, 기존 다크 사용성을 크게 흔들지 않으면서 light theme를 실사용 가능한 품질로 추가하는 것이다.

## Scope

### In Scope

- `appearanceTheme = 'dark-gray' | 'light'` 상태 계약
- renderer persistence 기반 theme 저장/복원
- header action 영역의 최소 theme selector
- `src/index.css`, `src/App.css` 중심의 semantic tokenization
- CodeMirror `dark-gray` retune + `light` theme extension 추가
- Spec Viewer fenced code block의 theme-aware Shiki routing
- light/dark-gray 전환 회귀 테스트 및 품질 게이트 정리

### Out of Scope

- `true dark` theme 추가
- `system` follow 모드
- OS accent color 연동
- 외부 theme import 또는 VS Code marketplace 호환
- 앱 전반 레이아웃/타이포 재설계

## 구현 가정

- root theme attribute는 `document.documentElement[data-theme]`를 기본값으로 사용한다.
- theme selector는 header action 영역의 native `<select>` 또는 동등한 최소 control로 시작한다.
- light palette는 VS Code Light+ / GitHub Light 계열을 참고하되 exact cloning은 목표가 아니다.
- `prefers-color-scheme` 기반 자동 전환은 제거하거나 무력화하고, explicit theme state를 단일 source of truth로 삼는다.

## Components

1. **Theme Contract Layer**: appearance type, storage key, load/save helper
2. **App Shell Theme Integration**: selector UI, root dataset 적용, child panel prop wiring
3. **Global Token Layer**: semantic CSS variables, shell/control/panel palette 분리
4. **Code Editor Theme Layer**: CM6 `dark-gray` / `light` theme extension routing
5. **Spec Highlight Theme Layer**: Shiki theme routing, fenced code block light rendering
6. **Validation Layer**: persistence, switching, contrast, regression test 고정

## Implementation Phases

### Phase 1: Theme Foundation & App Wiring

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | appearance theme 계약 및 persistence helper 추가 | P0 | - | Theme Contract Layer |
| 2 | App selector, root attribute, panel prop wiring 추가 | P0 | 1 | App Shell Theme Integration |

### Phase 2: `dark-gray` 기준선 정리

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | global CSS token layer 도입 및 explicit theme root 정리 | P0 | 2 | Global Token Layer |
| 4 | CodeMirror `dark-gray` retune + `light` theme routing 추가 | P0 | 2 | Code Editor Theme Layer |
| 5 | Shiki/spec code block theme-aware routing 추가 | P0 | 2 | Spec Highlight Theme Layer |

### Phase 3: `light` Theme 완성

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 6 | light palette를 App shell/panel/control 전반에 완성 | P1 | 3, 4, 5 | Global Token Layer |

### Phase 4: Validation & Polish

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 7 | persistence/theme switching 회귀 테스트 및 품질 게이트 보강 | P0 | 4, 5, 6 | Validation Layer |

## Task Details

### Task 1: appearance theme 계약 및 persistence helper 추가
**Component**: Theme Contract Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
App이 공통으로 참조할 appearance theme 타입, storage key, load/save helper를 분리한다. malformed 저장값은 안전하게 무시하고 `dark-gray`로 fallback 해야 하며, 초기 렌더에서 flicker를 줄이도록 lazy initializer 형태로 App에 주입한다.

**Acceptance Criteria**:
- [ ] `AppearanceTheme` 유니온이 최소 `'dark-gray' | 'light'`를 지원한다.
- [ ] 저장값이 비어 있거나 손상된 경우 `dark-gray`로 fallback 한다.
- [ ] load/save helper가 DOM 의존성 없이 순수하게 테스트 가능하다.
- [ ] App이 초기 `useState`에서 helper를 사용하도록 연결된다.

**Target Files**:
- [C] `src/appearance-theme.ts` -- appearance theme 타입, storage key, parse/load/save helper
- [C] `src/appearance-theme.test.ts` -- malformed value/default restore/unit test
- [M] `src/App.tsx` -- initial appearance state hydrate 연결

**Technical Notes**:
- localStorage key는 workspace session key와 분리한다.
- 이후 `true dark` 추가가 가능한 additive contract를 유지한다.

**Dependencies**: -

### Task 2: App selector, root attribute, panel prop wiring 추가
**Component**: App Shell Theme Integration  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
header action 영역에 최소 theme selector를 추가하고, 선택 즉시 root-level theme attribute가 갱신되도록 연결한다. App이 active theme를 CodeEditorPanel/SpecViewerPanel로 전달하는 prop 경로도 이 단계에서 먼저 고정한다.

**Acceptance Criteria**:
- [ ] header action 영역에서 `Dark Gray` / `Light`를 선택할 수 있다.
- [ ] theme 변경 시 `document.documentElement[data-theme]` 또는 동등한 단일 root attribute가 갱신된다.
- [ ] App이 active theme를 CodeEditorPanel/SpecViewerPanel props로 전달한다.
- [ ] persistence helper가 theme 변경 직후 호출된다.

**Target Files**:
- [C] `src/appearance-theme-selector.tsx` -- 최소 theme selector UI
- [M] `src/App.tsx` -- selector 배치, root attribute side effect, panel prop wiring
- [M] `src/code-editor/code-editor-panel.tsx` -- `appearanceTheme` prop 계약 추가
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- `appearanceTheme` prop 계약 추가
- [M] `src/App.test.tsx` -- selector interaction / root attribute / restore integration test

**Technical Notes**:
- 이 단계에서는 selector가 기존 control 스타일을 재사용하도록 두고, palette-specific CSS는 다음 단계로 넘긴다.
- `App.tsx`와 child panel prop 계약은 이후 task의 병렬성을 위해 먼저 고정한다.

**Dependencies**: 1

### Task 3: global CSS token layer 도입 및 explicit theme root 정리
**Component**: Global Token Layer  
**Priority**: P0-Critical  
**Type**: Refactor

**Description**:  
현재 `index.css`와 `App.css`에 흩어진 색상 하드코딩을 semantic token 중심으로 재구성한다. 먼저 현재 인상을 `dark-gray` 기준선으로 정리하고, explicit theme 전환을 방해하는 `prefers-color-scheme` 경로를 제거하거나 무력화한다.

**Acceptance Criteria**:
- [ ] `:root` 및 `[data-theme='dark-gray']`, `[data-theme='light']` 계층에 공통 semantic token이 정의된다.
- [ ] body, app shell, panel, button, tab, border, text, banner, modal 등 주요 표면이 token을 우선 사용한다.
- [ ] 기존 `prefers-color-scheme` 자동 전환이 explicit theme state보다 우선하지 않는다.
- [ ] `dark-gray` 모드에서 현재 앱의 시각 인상과 정보 위계가 크게 흔들리지 않는다.

**Target Files**:
- [M] `src/index.css` -- root token, color-scheme, 전역 button/link/input 기본값 정리
- [M] `src/App.css` -- App shell/panel/control/modal/banner/file tree tokenization

**Technical Notes**:
- token은 최소 `background / surface / surface-elevated / text / text-muted / border / accent / state-*` 축으로 나눈다.
- 이 task는 palette foundation까지만 다루고, light polish는 Task 6에서 마무리한다.

**Dependencies**: 2

### Task 4: CodeMirror `dark-gray` retune + `light` theme routing 추가
**Component**: Code Editor Theme Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
현재 CM6 dark theme를 전체 앱 톤에 맞는 `dark-gray` 기준선으로 약간 더 graphite 쪽으로 조정하고, 별도 `light` theme extension을 추가한다. CodeEditorPanel은 active appearance theme에 따라 적절한 extension을 선택해야 한다.

**Acceptance Criteria**:
- [ ] `dark-gray` CM6 테마가 앱 shell 대비 너무 검지 않도록 retune 된다.
- [ ] `light` CM6 theme extension이 추가된다.
- [ ] CodeEditorPanel이 `appearanceTheme` prop에 따라 theme extension을 전환한다.
- [ ] search / selection / comment / git / navigation highlight가 두 theme 모두에서 가독성을 유지한다.

**Target Files**:
- [C] `src/code-editor/cm6-light-theme.ts` -- light palette용 CM6 theme extension
- [M] `src/code-editor/cm6-dark-theme.ts` -- current dark를 `dark-gray` 기준선으로 retune
- [M] `src/code-editor/code-editor-panel.tsx` -- theme routing 적용
- [M] `src/code-editor/code-editor-panel.test.tsx` -- theme routing 및 state highlight regression

**Technical Notes**:
- App shell token과 CM6 색을 1:1 공유하기보다, 의미 대응표를 맞추는 방식이 안전하다.
- CM6 내부 selection/search 색은 shell accent보다 약간 높은 대비를 유지하는 편이 좋다.

**Dependencies**: 2

### Task 5: Shiki/spec code block theme-aware routing 추가
**Component**: Spec Highlight Theme Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
Shiki highlight 경로를 active appearance theme에 맞게 확장한다. Spec Viewer의 fenced code block은 `dark-gray`와 `light` 각각에 맞는 theme를 사용해야 하며, highlighter cache는 theme variant를 고려해야 한다.

**Acceptance Criteria**:
- [ ] syntax highlight 경로가 `dark-gray` / `light` theme를 인자로 구분한다.
- [ ] highlighter cache 또는 factory가 두 theme variant를 안전하게 재사용한다.
- [ ] Spec Viewer fenced code block이 active theme에 맞는 highlight 결과를 사용한다.
- [ ] light theme에서 `github-dark` 인라인 색이 남지 않는다.

**Target Files**:
- [M] `src/code-viewer/syntax-highlight.ts` -- theme-aware highlighter routing/cache
- [M] `src/code-viewer/syntax-highlight.test.ts` -- theme variant cache/highlight regression
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- `HighlightedCodeBlock` theme prop 전달
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- light/dark-gray code block rendering test

**Technical Notes**:
- Shiki theme 이름은 구현 시점에 확정하되, dark/light가 같은 API surface를 공유하도록 유지한다.
- preview/highlight helper가 추가로 존재하면 같은 theme routing을 재사용하도록 맞춘다.

**Dependencies**: 2

### Task 6: light palette를 App shell/panel/control 전반에 완성
**Component**: Global Token Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:  
Task 3의 token foundation 위에서 light palette를 실제 사용 가능한 수준으로 다듬는다. header, sidebar, workspace summary, file tree, tabs, buttons, banners, dialogs, hover/active 상태를 포함해 전체 앱 인상을 일관되게 만든다.

**Acceptance Criteria**:
- [ ] light theme에서 App shell, sidebar, panel, tab, button, select, modal, banner가 일관된 밝은 팔레트를 사용한다.
- [ ] file tree와 workspace controls가 배경/텍스트/경계 대비를 유지한다.
- [ ] dark-gray 모드의 기존 시각 인상이 regression 없이 유지된다.
- [ ] navigation/search/comment/git 관련 상태색이 light theme에서도 과도하게 튀거나 묻히지 않는다.

**Target Files**:
- [M] `src/index.css` -- light theme 전역 control/palette polish
- [M] `src/App.css` -- shell/panel/tree/modal/banner/tab light theme polish
- [M] `src/App.test.tsx` -- light theme shell-level visual contract regression

**Technical Notes**:
- Task 6은 token 이름을 다시 바꾸기보다 palette 값과 특정 surface override를 조정하는 데 집중한다.
- 이 단계에서 contrast tuning이 많이 발생하므로 Task 3과 순차 실행이 안전하다.

**Dependencies**: 3, 4, 5

### Task 7: persistence/theme switching 회귀 테스트 및 품질 게이트 보강
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:  
theme persistence, App shell switching, CM6 routing, Shiki routing, light/dark-gray contrast 회귀를 한 번에 고정한다. 자동 테스트와 수동 smoke checklist를 함께 정리해 후속 `true dark` 작업의 회귀 기준점으로 삼는다.

**Acceptance Criteria**:
- [ ] App integration test가 저장/복원, selector 전환, root attribute 반영을 고정한다.
- [ ] CodeEditorPanel test가 `dark-gray` / `light` theme route와 navigation/search state 가시성을 고정한다.
- [ ] Spec Viewer / syntax highlight test가 light code block route를 고정한다.
- [ ] 품질 게이트(`npx tsc --noEmit`, `npm test`, 필요 시 `npm run build`)를 계획에 명시하고 완료 조건으로 사용한다.

**Target Files**:
- [M] `src/App.test.tsx` -- App-level theme persistence/switching regression
- [M] `src/code-editor/code-editor-panel.test.tsx` -- CM6 theme routing/state visibility regression
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- Spec code block theme regression
- [M] `src/code-viewer/syntax-highlight.test.ts` -- Shiki theme routing/cache regression
- [M] `src/appearance-theme.test.ts` -- storage fallback/unit regression 보강

**Technical Notes**:
- 수동 smoke 항목은 selector 전환, 앱 재시작 복원, CM6 search highlight, spec fenced code block, modal/file tree 가독성 정도로 제한한다.
- visual snapshot보다는 DOM/class/inline style/assertion 조합이 유지보수에 유리하다.

**Dependencies**: 4, 5, 6

## Dependency Mapping

- **Critical Path**: `1 -> 2 -> (3, 4, 5) -> 6 -> 7`
- **Blocks**:
  - Task 1 blocks Task 2
  - Task 2 blocks Task 3, Task 4, Task 5
  - Task 6 requires Task 3, 4, 5 completion
  - Task 7 requires Task 4, 5, 6 completion
- **Parallel Eligible**:
  - Phase 2의 Task 3, 4, 5는 서로 다른 파일군을 사용하므로 병렬 실행 가능
- **Sequential Hotspots**:
  - `src/App.tsx`: Task 1 -> Task 2
  - `src/App.css` / `src/index.css`: Task 3 -> Task 6
  - 테스트 파일군: 구현 완료 후 Task 7에서 최종 보강

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 1 | `src/App.tsx` |
| 2 | 3 | 3 | 없음 (파일군 분리: CSS / CM6 / Shiki+Spec) |
| 3 | 1 | 1 | `src/App.css`, `src/index.css`는 Phase 2 Task 3 이후 순차 |
| 4 | 1 | 1 | 테스트 파일군 최종 통합 |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `prefers-color-scheme`가 explicit theme보다 우선해 light/dark 전환이 꼬일 수 있음 | High | Task 3에서 explicit root theme를 단일 source of truth로 정리 |
| App shell과 CM6/Shiki가 서로 다른 팔레트 인상을 주어 제품 완성도가 떨어질 수 있음 | High | Task 4/5에서 shell token과 의미 대응표를 맞추고, Task 6에서 최종 contrast tuning 수행 |
| light theme에서 search/comment/navigation/git 상태색이 묻힐 수 있음 | High | Task 4, 6, 7에서 상태색 전용 회귀 테스트와 수동 smoke를 함께 고정 |
| CSS 하드코딩이 많아 예상보다 회귀 범위가 넓을 수 있음 | Medium | Task 3에서 token foundation을 먼저 만들고, Task 6에서 palette polish만 수행하도록 분리 |

## Open Questions

현재 기준 Open Question 없음.

## Model Recommendation

- 기본 추천 모델: `gpt-5.3-codex`
- 권장 reasoning effort:
  - Phase 1~3: `high`
  - Phase 4: `medium`~`high`

