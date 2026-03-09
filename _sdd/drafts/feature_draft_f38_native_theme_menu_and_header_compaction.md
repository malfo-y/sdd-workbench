# Feature Draft: F38 Electron native `View > Theme` 메뉴 + 헤더 테마 컨트롤 축소

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

### Feature: F38 Electron native `View > Theme` 메뉴 + 헤더 테마 컨트롤 축소
**Priority**: High  
**Category**: Appearance / Desktop Menu Integration  
**Target Component**: `Electron Main`, `preload`, `App`  
**Target Section**: `_sdd/spec/main.md` > `현재 상태 요약`; `_sdd/spec/sdd-workbench/product-overview.md` > `MVP 범위`, `기능 커버리지`; `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`; `_sdd/spec/sdd-workbench/contract-map.md` > `1. 핵심 타입 계약`; `_sdd/spec/sdd-workbench/appendix.md` > `기능 이력`, `상세 수용 기준`

**Description**:  
테마 전환의 주 진입점을 App header의 넓은 `Theme` select에서 Electron native application menu의 `View > Theme` submenu로 옮긴다. 메뉴에는 `Dark Gray`, `Light` radio item을 제공하고, 선택 결과는 기존 appearance theme 계약(`dark-gray | light`)과 persistence를 그대로 사용한다. 이 변경과 함께 App header는 넓은 theme group을 제거하거나 동등한 수준으로 축소해 상단 공간을 더 효율적으로 사용한다.

**Acceptance Criteria**:

- [ ] Electron app은 native application menu에 `View > Theme > Dark Gray`, `View > Theme > Light` radio submenu를 제공한다.
- [ ] 사용자가 native menu에서 theme를 선택하면 renderer의 appearance theme가 즉시 바뀌고, 기존 persistence 경로에 저장된다.
- [ ] 앱 시작 시 renderer가 복원한 현재 theme는 native menu checked state에도 동기화된다.
- [ ] App header는 기존의 넓은 `Theme` label + select group을 유지하지 않으며, 그 공간은 다른 header action이나 content 폭에 반환된다.
- [ ] renderer와 main menu 상태가 엇갈릴 수 있는 순간에는 renderer의 appearance theme 상태를 source of truth로 사용하고, main menu는 그 상태를 반영하도록 갱신된다.
- [ ] native menu를 추가해도 기본 Edit/View/Window/app role 동작이 사라지지 않도록 표준 Electron role 기반 메뉴 구조를 유지한다.

**Technical Notes**:

- Electron native menu는 커스텀 dropdown/popup UI가 아니라 standard application menu 항목으로 제공한다.
- 현재 appearance theme persistence는 renderer `localStorage`에 있으므로, 이번 MVP에서는 renderer를 source of truth로 유지하고 main menu는 IPC로 이를 반영한다.
- main process는 `localStorage`를 직접 읽지 않으므로, 초기 menu checked state는 기본값으로 시작한 뒤 renderer bootstrap 직후 authoritative theme로 동기화하는 구조가 현실적이다.
- header 축소는 “native menu로 이동했는데도 상단 공간을 계속 차지하는 중복 control”을 없애는 것이 목적이며, 전용 settings 화면이나 command palette는 이번 범위 밖이다.

**Dependencies**:

- F36 appearance theme foundation
- F37 `light` theme

## Improvements

### Improvement: Appearance theme 변경 경로를 renderer/main IPC bridge로 명시화
**Priority**: High  
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`; `_sdd/spec/sdd-workbench/contract-map.md` > `1. 핵심 타입 계약`  
**Current State**: appearance theme 변경은 현재 renderer 내부 select control과 localStorage persistence에 묶여 있고, main process는 현재 theme 상태를 알지 못한다.  
**Proposed**: main menu 요청(`set theme`)과 renderer authoritative state sync(`current theme changed`)를 위한 preload IPC bridge를 추가한다.  
**Reason**: native menu checked state와 renderer theme persistence를 동시에 유지하려면 양방향 동기화 표면이 필요하다.

### Improvement: Header action 영역의 폭 회수
**Priority**: Medium  
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`  
**Current State**: `Theme` label + select group이 header right 영역에서 비교적 큰 폭을 차지한다.  
**Proposed**: native menu를 primary entry point로 승격하고, header에서는 해당 group을 제거하거나 동등한 수준으로 더 작은 footprint로 축소한다.  
**Reason**: 사용자는 theme selector가 너무 크게 느껴졌고, 이 공간은 comments 등 다른 header action과 content 가시성에 더 유용하게 쓸 수 있다.

## Component Changes

### Component Change: Electron main menu에 `View > Theme` 추가
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`  
**Type**: Existing Component Extension  
**Change Summary**:

- `electron/main.ts`는 standard role 기반 application menu를 명시적으로 구성하거나 helper로 분리한다.
- `View` submenu 아래에 `Dark Gray`, `Light` radio item을 배치한다.
- menu item 선택은 renderer에 theme 변경 요청을 보내고, renderer가 적용한 authoritative state를 기준으로 checked state를 갱신한다.

### Component Change: preload/theme bridge 추가
**Target Section**: `_sdd/spec/sdd-workbench/contract-map.md` > `1. 핵심 타입 계약`  
**Type**: Existing Interface Extension  
**Change Summary**:

- preload는 renderer가 main menu theme 요청을 수신할 수 있는 listener를 제공한다.
- preload는 renderer가 현재 appearance theme를 main process에 알릴 수 있는 API를 제공한다.
- renderer 쪽 타입 선언은 새 bridge를 반영한다.

### Component Change: Header theme control footprint 축소
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`  
**Type**: Existing Component Simplification  
**Change Summary**:

- App header는 기존 `Theme` label + large select group을 유지하지 않는다.
- MVP 기본값은 native menu를 primary control로 간주하고 header 중복 control을 제거하는 것이다.
- 향후 discoverability가 부족하다고 판단되면 compact icon/button fallback은 별도 feature로 추가한다.

## Notes

### Scope Boundary

- 이번 범위는 Electron native application menu 기반 theme entry point 도입과 header footprint 축소에만 집중한다.
- `dark-gray | light` theme 계약 자체를 바꾸지는 않는다.
- `system` mode, `true dark`, settings 화면, tray menu, command palette theme switcher는 범위 밖이다.
- theme menu는 `View` 하위 메뉴를 기본값으로 사용하며, 독립 top-level `Theme` 메뉴는 만들지 않는다.

### Context

현재 appearance theme는 기능적으로 동작하지만, header의 `Theme` group이 실제 필요 대비 큰 폭을 차지한다. 사용자는 native Electron menu로 theme 전환을 옮길 수 있는지를 물었고, 현재 코드 구조상 이는 충분히 가능하다. 다만 renderer가 theme persistence의 source of truth이므로, 단순히 main menu만 추가하는 것이 아니라 renderer/main 간 checked state sync를 명시적으로 설계해야 한다.

### Open Questions

현재 기준 Open Question 없음. 아래 설계를 기본값으로 고정한다.

- native application menu가 theme 전환의 primary entry point다.
- renderer `appearanceTheme` 상태와 persistence가 authoritative source다.
- header의 기존 large theme group은 제거를 기본값으로 둔다.
- macOS와 Windows/Linux 모두 `View > Theme` 구조를 사용한다.

---

# Part 2: Implementation Plan

# Implementation Plan: F38 Electron native `View > Theme` 메뉴 + 헤더 테마 컨트롤 축소

## Overview

이번 작업의 핵심은 theme state 자체를 다시 설계하는 것이 아니라, 이미 구현된 `dark-gray | light` 계약 위에 Electron native menu를 새로운 control surface로 추가하는 것이다. 따라서 가장 중요한 설계 포인트는 renderer/localStorage를 그대로 source of truth로 유지하면서, main menu checked state와 사용자 액션을 IPC bridge로 동기화하는 것이다. 부수 효과로 header right 영역의 큰 theme group을 제거해 상단 공간을 회수한다.

## Scope

### In Scope

- native application menu `View > Theme` submenu 추가
- `Dark Gray` / `Light` radio item checked state sync
- main -> renderer theme change request IPC
- renderer -> main current theme state sync IPC
- header large theme group 제거 또는 동등한 수준 축소
- 메뉴/renderer sync 회귀 테스트

### Out of Scope

- `dark-gray | light` 외 새 theme 추가
- system theme follow
- command palette / settings page / tray menu
- compact header fallback control 추가
- 전체 menu bar 정보구조 재디자인

## Components

1. **Menu Bridge Layer**: main/preload/renderer theme sync contract
2. **Application Menu Layer**: `View > Theme` radio submenu + role-preserving template
3. **Header Layout Layer**: header theme group footprint 제거
4. **Validation Layer**: theme sync / boot restore / menu checked state regression

## Implementation Phases

### Phase 1: Theme Menu Contract
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | main/preload/renderer appearance menu bridge 정의 | P0 | - | Menu Bridge Layer |

### Phase 2: Native Menu Integration
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 2 | role-preserving application menu template + `View > Theme` submenu 추가 | P0 | 1 | Application Menu Layer |
| 3 | renderer bootstrap/theme change를 menu checked state와 동기화 | P0 | 1, 2 | Menu Bridge Layer |

### Phase 3: Header Compaction + Validation
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 4 | header large theme group 제거 및 레이아웃 정리 | P1 | 2, 3 | Header Layout Layer |
| 5 | native menu sync + header compaction 회귀 테스트 추가 | P0 | 2, 3, 4 | Validation Layer |

## Task Details

### Task 1: main/preload/renderer appearance menu bridge 정의
**Target Files**: `[M] electron/preload.ts`, `[M] electron/electron-env.d.ts`, `[M] src/appearance-theme.ts`, `[C] electron/appearance-menu.ts`

**Details**:

- appearance theme label/id를 native menu에서도 재사용할 수 있게 helper 또는 상수로 정리한다.
- preload에 `onAppearanceThemeMenuRequest(listener)`와 동등한 수신 API를 추가한다.
- preload에 `notifyAppearanceThemeChanged(theme)`와 동등한 송신 API를 추가한다.
- renderer/main이 공유하는 `AppearanceTheme` 값 집합은 기존 `dark-gray | light`를 유지한다.

**Notes**:

- 기존 `window.workspace` namespace를 확장하는 방향이 현재 코드베이스와 가장 잘 맞는다.
- 새로운 bridge는 Electron 환경이 아니거나 IPC가 비활성인 테스트 환경에서도 no-op/fallback이 가능해야 한다.

### Task 2: role-preserving application menu template + `View > Theme` submenu 추가
**Target Files**: `[C] electron/appearance-menu.ts`, `[M] electron/main.ts`

**Details**:

- `setApplicationMenu()`를 도입하되 standard role(`app`, `file`, `edit`, `view`, `window`, 필요 시 `help`)를 유지하는 template를 구성한다.
- `View` submenu 아래에 `Dark Gray`, `Light` radio item을 추가한다.
- menu item 선택 시 현재 focused window renderer로 theme 변경 요청 IPC를 보낸다.
- checked state patch/update를 helper로 분리해 `main.ts`가 과도하게 비대해지지 않게 유지한다.

**Notes**:

- 단순히 테마 submenu만 가진 menu를 설치하면 기본 copy/paste/window 역할이 사라질 수 있으므로 role-preserving 구성이 필수다.
- focused window가 없을 때 menu action이 예외를 던지지 않도록 방어한다.

### Task 3: renderer bootstrap/theme change를 menu checked state와 동기화
**Target Files**: `[M] src/main.tsx`, `[M] src/App.tsx`, `[M] src/appearance-theme.ts`, `[M] electron/main.ts`

**Details**:

- renderer는 boot 직후 복원한 appearance theme를 main process에 알려 menu checked state를 authoritative value로 맞춘다.
- 사용자가 theme를 바꿀 때는 localStorage save와 root apply 이후 main process에 현재 theme를 통지한다.
- main process는 통지받은 theme를 기준으로 menu item checked state를 갱신한다.

**Notes**:

- main process는 `localStorage`를 직접 읽을 수 없으므로, initial checked state는 renderer sync 이후에 정확해진다는 점을 설계상 수용한다.
- renderer가 source of truth라는 원칙을 문서와 코드 양쪽에 일관되게 반영한다.

### Task 4: header large theme group 제거 및 레이아웃 정리
**Target Files**: `[M] src/App.tsx`, `[M] src/App.css`, `[D] src/appearance-theme-selector.tsx`

**Details**:

- header right 영역에서 기존 `Theme` label + select group을 제거한다.
- 필요 시 comments group과 header action spacing을 다시 조정한다.
- 더 이상 사용되지 않는 `AppearanceThemeSelector`는 제거하거나, 실제 재사용 경로가 생기기 전까지 dead code로 남기지 않는다.

**Notes**:

- 이번 MVP는 “헤더에서도 theme를 바꿀 수 있어야 한다”보다 “불필요하게 큰 theme control을 없애고 native menu로 이동한다”를 우선한다.
- 추후 compact fallback이 필요하면 별도 feature로 추가한다.

### Task 5: native menu sync + header compaction 회귀 테스트 추가
**Target Files**: `[M] src/App.test.tsx`, `[M] src/appearance-theme.test.ts`, `[C] electron/appearance-menu.test.ts`

**Details**:

- renderer boot restore 시 main sync helper가 올바른 theme payload를 받는지 검증한다.
- theme change 후 menu checked state update helper가 예상 radio item 상태를 만드는지 검증한다.
- App header가 더 이상 넓은 `Theme` group을 렌더하지 않는지 검증한다.
- 기존 F36/F37 persistence/boot restore 동작이 회귀하지 않는지 확인한다.

**Notes**:

- main menu는 pure helper/template builder로 분리해 unit test 가능한 표면을 확보하는 편이 안전하다.
- Electron 실제 menu integration의 최종 확인은 수동 smoke test가 필요할 수 있다.

## Risks & Mitigations

### Risk 1: `setApplicationMenu()` 도입으로 기본 메뉴 역할 손실
- **Impact**: copy/paste, undo/redo, close, quit 같은 기본 항목이 사라질 수 있다.
- **Mitigation**: native role 기반 template를 먼저 설계하고, theme submenu는 `View` 아래에 additive하게 삽입한다.

### Risk 2: renderer/main theme 상태 일시 불일치
- **Impact**: 메뉴 checked state가 잠깐 잘못 보일 수 있다.
- **Mitigation**: renderer authoritative sync를 boot 직후와 every theme change 시점에 모두 수행한다.

### Risk 3: 헤더 control 제거 후 discoverability 저하
- **Impact**: 일부 사용자가 theme 설정 위치를 바로 찾지 못할 수 있다.
- **Mitigation**: 메뉴 위치를 `View > Theme`로 예측 가능한 곳에 두고, 필요 시 후속 feature로 compact header fallback을 추가한다.

## Validation Strategy

- 단위 테스트: appearance theme parse/persistence helper, menu template builder, menu checked state updater
- 통합 테스트: App boot restore + theme change sync hook
- 수동 확인:
  - macOS에서 앱 메뉴 `View > Theme` 노출 여부
  - Windows/Linux에서 application menu bar `View > Theme` 노출 여부
  - `Dark Gray`/`Light` 전환 시 header 공간 회수 및 즉시 반영 여부
