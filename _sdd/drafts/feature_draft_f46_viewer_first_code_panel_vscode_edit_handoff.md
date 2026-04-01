# Feature Draft: F46 Viewer-First Code Panel + VS Code Edit Handoff

<!-- spec-update-todo-input-start -->
# Part 1: Spec Patch Draft

# Spec Update Input

**Date**: 2026-04-01
**Author**: Codex
**Target Spec**: `/_sdd/spec/code-editor/overview.md`, `/_sdd/spec/code-editor/contracts.md`, `/_sdd/spec/appearance-and-navigation/overview.md`, `/_sdd/spec/remote-workspace/contracts.md`, `/_sdd/spec/feature-index.md`
**Spec Update Classification**: Improvement + Refactor

## Background & Motivation Updates

### Update: Code 패널의 제품 역할을 "앱 내 편집기"보다 "탐색 중심 뷰어"로 재정의
**Priority**: High
**Target Section**: `/_sdd/spec/code-editor/overview.md` > `1. 목적`, `2. 사용자 가시 동작`; `/_sdd/spec/feature-index.md` > `1. Foundation / Workspace / Viewer`

**Current State**:
Code 탭은 CodeMirror 6 기반 편집/저장/dirty/conflict 흐름을 직접 제공한다. 구현상 탐색 기능과 편집 기능이 같은 패널에 공존하며, 제품 메시지와 실제 사용 의도가 다소 섞여 있다.

**Proposed**:
Code 탭의 1차 역할을 read-only viewer로 재정의한다. 앱은 파일 탐색, 검색, 스펙-코드 이동, 코멘트, git 상태 가시화, 외부 편집 handoff를 담당하고, 본격 편집은 VS Code로 넘긴다.

**Reason**:
제품의 핵심 강점이 spec/code navigation과 workspace orchestration에 있으므로, in-app editing 부담을 줄이고 사용자의 mental model을 단순화한다.

## Design Changes

### Design Change: Viewer-first Code 패널 계약
**Priority**: High
**Target Section**: `/_sdd/spec/code-editor/overview.md` > `2. 사용자 가시 동작`, `4.2 검색 / wrap / fallback`, `4.3 jump와 highlight`; `/_sdd/spec/code-editor/contracts.md` > `2. 핵심 타입`, `3. 전역 불변식`

**Description**:
Code 패널은 read-only를 기본 동작으로 삼는다. 다음 기능은 유지한다.

- 텍스트/코드 파일 렌더
- `Cmd+F` 기반 검색
- line wrap 토글
- selection bridge
- spec-origin jump / navigation highlight
- git line marker
- comment gutter / comment hover
- `Go to Spec`, copy 계열 액션
- image/binary/too-large fallback

다음 기능은 Code 패널의 1차 UX 범위에서 제외한다.

- 앱 내부 직접 편집
- `Cmd+S` 저장
- 앱 내부 draft 기반 수정 라인 marker
- Code 패널을 편집기처럼 설명하는 UI copy

**Acceptance Criteria**:
- [ ] Code 패널은 기본적으로 read-only viewer로 동작한다.
- [ ] 검색, wrap, selection, jump/highlight는 기존 의미를 유지한다.
- [ ] git line marker와 comment gutter는 viewer 모드에서도 유지된다.
- [ ] Code 패널 자체에서 저장/dirty 유도 UX를 전면에 노출하지 않는다.
- [ ] 앱 내부 draft line marker는 새 요구사항으로 도입하지 않는다.
- [ ] Code 패널의 사용자 가시 copy는 `Code Viewer` 기준으로 정리된다.

### Design Change: File-scoped VS Code 편집 handoff 추가
**Priority**: High
**Target Section**: `/_sdd/spec/appearance-and-navigation/overview.md` > `2. 사용자 가시 동작`, `4.1 레이아웃과 탭`; `/_sdd/spec/remote-workspace/contracts.md` > `2.3 system:openInIterm / system:openInVsCode / system:openInFinder`

**Description**:
Code 패널 헤더에 `Edit in VSCode` 액션을 추가한다. 기존 사이드바의 workspace-level `Open In VSCode`는 유지하고, 새 액션은 "현재 보고 있는 파일을 VS Code에서 이어서 편집"하는 file-scoped handoff를 담당한다.

로컬 워크스페이스에서는 active file을 직접 연다. 원격 워크스페이스에서는 `sshAlias` 기반 Remote-SSH 경로를 사용해 current file context를 VS Code CLI/URI에 전달한다. 구현은 다음 우선순위를 따른다.

1. remote current file 직접 열기
2. remote current file 직접 열기가 환경/CLI 한계로 실패하면 remote workspace root 열기
3. `sshAlias`가 없거나 Remote-SSH prerequisite가 충족되지 않으면 명시적 오류 표시

fallback은 silent degrade가 아니라 사용자 기대를 깨지 않는 수준의 명시적 동작이어야 한다.

**Acceptance Criteria**:
- [ ] Code 패널 헤더에 `Edit in VSCode` 버튼/아이콘이 추가된다.
- [ ] active file이 없으면 버튼은 disabled 상태다.
- [ ] 헤더 액션은 icon + short label 조합으로 노출된다.
- [ ] 로컬 워크스페이스에서 active file이 VS Code로 열린다.
- [ ] 원격 워크스페이스에서 VS Code Remote-SSH handoff가 계속 동작한다.
- [ ] 원격 워크스페이스에서 `sshAlias`가 있으면 current file open을 우선 시도한다.
- [ ] 원격 current-file targeting이 불가능한 경우 workspace-level open으로 안전하게 fallback한다.
- [ ] `sshAlias`가 없으면 설정 보완이 필요하다는 명시적 오류를 보여준다.
- [ ] 기존 사이드바 `Open In VSCode` 동작은 회귀하지 않는다.

## New Features

### Feature: F46 Viewer-first Code 패널
**Priority**: High
**Category**: UX / Product Focus
**Target Component**: `src/code-editor/code-editor-panel.tsx`, `src/App.tsx`, `src/App.css`
**Target Section**: `/_sdd/spec/code-editor/overview.md` > `2. 사용자 가시 동작`, `4.2 검색 / wrap / fallback`, `4.3 jump와 highlight`; `/_sdd/spec/feature-index.md` > `1. Foundation / Workspace / Viewer`

**Description**:
Code 탭을 read-only viewer로 되돌리되, 탐색성과 변경 가시성에 필요한 핵심 기능은 유지한다. 특히 검색, git line marker, navigation highlight, comment gutter, markdown `Go to Spec`는 회귀 없이 남아 있어야 한다.

**Acceptance Criteria**:
- [ ] Code 탭은 직접 편집 없이 파일 내용을 안정적으로 보여준다.
- [ ] viewer 모드에서 `Cmd+F` 검색이 유지된다.
- [ ] viewer 모드에서 git line marker(`added`/`modified`)가 유지된다.
- [ ] viewer 모드에서 selection 기반 context action이 유지된다.
- [ ] viewer 모드에서 spec-origin jump와 temporary navigation highlight가 유지된다.
- [ ] image/binary/too-large fallback UI는 기존 동작을 유지한다.

### Feature: F46.1 VS Code 편집 아이콘
**Priority**: High
**Category**: External Tool Integration
**Target Component**: `src/code-editor/code-editor-panel.tsx`, `src/App.tsx`, `electron/system-open.ts`
**Target Section**: `/_sdd/spec/appearance-and-navigation/overview.md` > `2. 사용자 가시 동작`; `/_sdd/spec/remote-workspace/contracts.md` > `2.3 system:openInIterm / system:openInVsCode / system:openInFinder`

**Description**:
Code 패널 헤더에 file-scoped `Edit in VSCode` 액션을 제공한다. 사용자는 현재 파일을 읽다가 필요 시 한 번의 클릭으로 VS Code에서 편집을 이어갈 수 있어야 한다.

**Acceptance Criteria**:
- [ ] 헤더 액션은 현재 active file 기준으로 동작한다.
- [ ] 버튼은 icon + short label(`Edit`) 조합이며 tooltip/aria-label을 통해 의도가 명확하다.
- [ ] 로컬 파일은 직접 열리고, 원격 파일은 Remote-SSH 흐름으로 연결된다.
- [ ] 원격 file-scoped open은 current file 직접 열기를 우선 시도한다.
- [ ] 원격 current-file open 실패 시 workspace root open fallback을 제공한다.
- [ ] 실패 시 banner 또는 동등한 사용자 가시 오류를 표시한다.

## Improvements

### Improvement: VS Code 저장 후 앱 복귀 흐름을 viewer 관점에서 재정의
**Priority**: Medium
**Target Section**: `/_sdd/spec/workspace-and-file-tree/overview.md` > `4.1 세션과 active file`; `/_sdd/spec/code-editor/overview.md` > `4.1 편집과 저장`

**Current State**:
문서 세션과 dirty/save/conflict vocabulary가 앱 내부 편집을 중심으로 설명된다.

**Proposed**:
viewer-first 단계에서는 외부 편집 후 watcher refresh와 git marker refresh가 사용자 가시 핵심이 되며, 앱 내부 draft/save/conflict 모델은 즉시 제거하지 않더라도 제품 표면에서는 2차 책임으로 후퇴한다.

**Reason**:
현재 아키텍처를 한 번에 단순화하기보다, 사용자 경험을 먼저 viewer 중심으로 바꾸고 내부 상태 모델 정리는 후속 단계로 분리하는 편이 안전하다.

**Acceptance Criteria**:
- [ ] VS Code에서 저장한 뒤 앱이 watcher 경로로 내용을 반영한다.
- [ ] active file git line marker가 외부 저장 후에도 갱신된다.
- [ ] viewer 전환이 document session 제거를 의미하지 않음을 명시한다.

## Failure Modes

| 시나리오 | 실패 시 | 사용자 가시성 | 처리 방안 |
|---|---|---|---|
| active file 없음 | `Edit in VSCode` 실행 불가 | 버튼 disabled | 클릭 불가 상태 유지 |
| remote workspace에 `sshAlias` 없음 | Remote-SSH current-file handoff 실패 | 명시적 배너/오류 | 기존 `Open In VSCode` 규칙을 따르며 설정 유도 |
| remote file-scoped open이 플랫폼/CLI 한계로 불안정 | current file focusing 실패 | workspace root open | current file open 우선 시도 후 safe fallback 허용 |
| viewer 전환 중 검색/marker가 같이 꺼짐 | 핵심 탐색성 저하 | 즉시 사용자 체감 회귀 | acceptance criteria와 회귀 테스트로 차단 |
| viewer-first와 document session 정리 작업을 한 번에 묶음 | 범위 확대, 회귀 위험 증가 | 구현 지연/불안정 | 이번 범위에서는 UX 표면 재정의까지만 수행 |

## Notes

### Context
이번 변경은 "편집 기능을 완전히 삭제"하는 작업이 아니라, 제품의 기본 사용 흐름을 viewer-first로 재정렬하고, 편집은 VS Code로 넘기는 handoff를 강화하는 작업이다.

### Constraints
- 기존 search / git marker / navigation highlight / comment gutter는 유지해야 한다.
- 앱 내부 draft line marker는 새로 추가하지 않는다.
- workspace-level `Open In VSCode`는 유지한다.
- 원격 `Edit in VSCode`는 `sshAlias` 기반 Remote-SSH 계약을 재사용해야 한다.
- 원격 `Edit in VSCode`는 current file 직접 열기를 우선 시도하되, workspace root fallback을 허용한다.
- 헤더 액션은 icon-only가 아니라 icon + short label 기본값을 사용한다.
- Code 패널의 사용자 가시 명칭은 `Code Viewer`로 정리한다.
- document session/saveState 정리는 후속 리팩터링 후보로 남겨 둔다.

## Open Questions

1. 원격 current-file handoff를 MVP에서 "workspace open fallback 허용"으로 둘지, "파일 직접 열기 보장"까지 요구할지 최종 범위를 확정할 필요가 있다.
2. `Edit in VSCode` 버튼을 icon-only로 둘지, 짧은 label을 함께 노출할지는 실제 헤더 밀도와 함께 결정할 필요가 있다.
3. viewer-first 전환 후 `Code Preview` 문구를 `Code Viewer` 또는 더 중립적인 copy로 바꿀지 확정이 필요하다.

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

이번 작업의 목표는 Code 탭을 viewer-first 경험으로 되돌리면서, 사용자가 현재 파일을 VS Code에서 자연스럽게 이어 편집할 수 있게 만드는 것이다. 구현은 세 갈래로 나뉜다: Code 패널 contract 정리, file-scoped VS Code handoff 확장, App shell wiring 및 회귀 검증.

## Scope

### In Scope
- Code 패널을 read-only viewer 기본값으로 재정의
- 검색, git marker, comment gutter, jump/highlight 유지
- Code 패널 헤더 `Edit in VSCode` 액션 추가
- local/remote file-scoped VS Code handoff 또는 safe fallback
- 회귀 테스트 업데이트

### Out of Scope
- document session / saveState 모델 제거
- 앱 내부 draft 기반 modified line marker 추가
- VS Code extension 개발
- Spec 탭 동작 철학 변경

## Components

1. **Code Viewer Layer**: read-only contract, header copy/action, search/marker continuity
2. **External Tool Handoff Layer**: local/remote VS Code open contract 확장
3. **App Shell Wiring Layer**: viewer 모드 기본화, 배너/disabled/error wiring

## Implementation Phases

### Phase 1: Code 패널 viewer contract 정리
| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T1 | Code 패널을 viewer-first contract로 정리하고 header action slot을 확장한다 | P0 | - | Code Viewer Layer |

### Phase 2: VS Code file handoff 경로 확장
| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T2 | local/remote file-scoped VS Code open 계약을 추가한다 | P0 | - | External Tool Handoff Layer |

### Phase 3: App shell 연결 및 회귀 검증
| ID | Task | Priority | Dependencies | Component |
|---|---|---|---|---|
| T3 | App shell에서 viewer 기본화와 `Edit in VSCode` 액션을 연결한다 | P0 | T1, T2 | App Shell Wiring Layer |

## Task Details

### Task T1: Code 패널을 viewer-first contract로 정리하고 header action slot을 확장한다
**Component**: Code Viewer Layer
**Priority**: P0
**Type**: Refactor

**Description**:
`CodeEditorPanel`을 제품 의미상 viewer 중심으로 재정리한다. 편집에 직접 필요한 props와 UI copy를 재검토하고, read-only 모드에서 필요한 기능(search, wrap, selection, jump/highlight, git/comment gutter)가 그대로 유지되도록 정리한다. 동시에 헤더에 `Edit in VSCode` 액션이 들어갈 자리를 만든다.

**Acceptance Criteria**:
- [ ] Code 패널이 read-only 기본 동작으로 렌더된다.
- [ ] `Cmd+F` 검색과 wrap toggle이 기존처럼 동작한다.
- [ ] git line marker / comment gutter / navigation highlight가 유지된다.
- [ ] 헤더에 `Edit in VSCode` 액션을 받을 prop/slot이 추가된다.
- [ ] 편집/저장 중심 copy가 `Code Viewer` 기준 viewer-first copy로 정리된다.

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx` -- read-only 기본 동작, header action 확장, viewer copy 정리
- [M] `src/code-editor/code-editor-panel.test.tsx` -- viewer mode에서 search/wrap/git marker/header action 회귀 고정
- [M] `src/App.css` -- Code 패널 헤더 버튼 스타일 보강

**Technical Notes**:
- 현재 컴포넌트는 이미 `editable = false` 기본값을 가지므로, T1은 구조적 재작성보다 App wiring과 copy 정리에 가깝다.
- 검색과 git gutter는 CM6 extension 레벨 기능이므로 read-only 전환과 분리해서 유지 검증한다.

**Dependencies**: -

### Task T2: local/remote file-scoped VS Code open 계약을 추가한다
**Component**: External Tool Handoff Layer
**Priority**: P0
**Type**: Feature

**Description**:
기존 workspace-level `system:openInVsCode` 계약을 current-file context까지 다룰 수 있도록 확장한다. 로컬은 active file 직접 open, 원격은 Remote-SSH current-file targeting을 best-effort로 시도하되 필요한 경우 workspace root fallback 또는 명시적 오류를 제공한다.

**Acceptance Criteria**:
- [ ] renderer에서 active file path를 포함한 VS Code open 요청을 보낼 수 있다.
- [ ] local workspace에서 file-scoped open이 동작한다.
- [ ] remote workspace에서 기존 Remote-SSH 흐름은 유지된다.
- [ ] remote workspace에서 `sshAlias`가 있으면 current file 직접 열기를 우선 시도한다.
- [ ] remote current-file targeting 실패 시 silent failure 없이 workspace-level safe fallback을 제공한다.
- [ ] remote workspace에 `sshAlias`가 없으면 설정 유도 오류를 반환한다.
- [ ] preload/type/test 계약이 함께 갱신된다.

**Target Files**:
- [M] `electron/system-open.ts` -- file-scoped VS Code open 및 remote fallback 정책 구현
- [M] `electron/system-open.test.ts` -- local file open / remote fallback / failure path 테스트 추가
- [M] `electron/preload.ts` -- 확장된 open request bridge 반영
- [M] `electron/electron-env.d.ts` -- renderer 타입 계약 갱신
- [M] `electron/vscode-ssh-config.ts` -- 필요 시 current-file handoff prerequisite 문서화/타입 보강

**Technical Notes**:
- 기존 workspace-level open path를 깨지 않도록 request payload는 backward-compatible optional field 추가가 안전하다.
- remote current-file open은 `sshAlias` + remote absolute file path를 조합한 VS Code Remote-SSH CLI/URI 경로를 우선 검토한다.
- remote current-file open 보장은 VS Code CLI/URI 제약에 좌우될 수 있으므로 fallback 정책을 먼저 문서화하고 구현해야 한다.
- root fallback은 "실패를 감춘다"가 아니라 "편집 시작은 가능하게 한다"는 UX 목적의 safe degrade로 정의한다.

**Dependencies**: -

### Task T3: App shell에서 viewer 기본화와 `Edit in VSCode` 액션을 연결한다
**Component**: App Shell Wiring Layer
**Priority**: P0
**Type**: Feature

**Description**:
App shell에서 Code 패널을 read-only viewer로 연결하고, active file 기준 `Edit in VSCode` 액션을 wiring한다. 실패 시 기존 banner 시스템을 활용하고, workspace-level `Open In VSCode`는 유지한다.

**Acceptance Criteria**:
- [ ] `CodeEditorPanel`에 `editable`을 강제로 켜지 않는다.
- [ ] `Edit in VSCode` 클릭 시 active file context로 open 요청이 전달된다.
- [ ] active file이 없으면 버튼이 disabled다.
- [ ] 기존 사이드바 `Open In VSCode`와 충돌하지 않는다.
- [ ] App-level 회귀 테스트가 viewer-first와 VS Code handoff를 검증한다.

**Target Files**:
- [M] `src/App.tsx` -- Code 패널 read-only wiring, VS Code handoff handler, banner 연동
- [M] `src/App.test.tsx` -- viewer mode 기본값, header action 동작, disabled/error/fallback 회귀 테스트
- [M] `README.md` -- 제품 설명을 viewer-first + VS Code handoff 기준으로 보정
- [M] `README_en.md` -- 영문 제품 설명 동기화

**Technical Notes**:
- watcher/external-change banner는 기존 구현을 최대한 재사용하고, viewer-first 전환으로 즉시 제거하지 않는다.
- 문서 세션 로직을 그대로 둘 경우에도 UI 표면은 "viewer + external edit" 중심으로 설명해야 한다.

**Dependencies**: T1, T2

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|---|---|---|---|
| Phase 1 | 1 | 1 | `src/code-editor/*`, `src/App.css` |
| Phase 2 | 1 | 1 | `electron/system-open.ts`, preload/type/test files |
| Phase 3 | 1 | 1 | `src/App.tsx`, `src/App.test.tsx`, README files |

병렬화 관점에서는 `T1`과 `T2`가 가장 깔끔하게 분리된다. `T3`는 panel contract와 system-open contract를 모두 소비하므로 마지막에 순차로 붙이는 편이 안전하다.

## Risks and Mitigations

1. **리스크**: viewer 전환 중 검색/marker 기능이 의도치 않게 약화될 수 있다.
   **대응**: read-only와 search/gutter를 분리된 계약으로 테스트에 고정한다.

2. **리스크**: remote current-file handoff가 VS Code CLI/URI 제약으로 환경마다 다를 수 있다.
   **대응**: `sshAlias` prerequisite를 명확히 하고, current-file open 우선 시도 후 workspace-level safe fallback 정책을 고정한다.

3. **리스크**: document session/saveState 모델이 남아 있어 구현자가 "편집 제거"를 과대 해석할 수 있다.
   **대응**: 이번 작업은 UX 표면 재정의이며, 상태 모델 제거는 별도 리팩터링으로 분리한다고 문서에 명시한다.

4. **리스크**: README와 스펙 문구가 실제 UX와 어긋난 채 남을 수 있다.
   **대응**: App wiring 단계에서 사용자-facing copy와 문서 설명을 함께 갱신한다.

## Resolved Decisions

1. remote file-scoped handoff는 current file open 우선 시도 후 workspace root fallback을 허용한다.
2. Code 패널 헤더의 `Edit in VSCode`는 icon + short label(`Edit`) 조합으로 노출한다.
3. Code 패널의 사용자 가시 명칭은 `Code Viewer`로 정리한다.

## Future Considerations

1. document session/saveState 모델 단순화는 viewer-first 전환 이후 별도 리팩터링 후보로 남긴다.
