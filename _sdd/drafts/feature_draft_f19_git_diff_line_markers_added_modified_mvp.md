# Feature Draft: F19 Git Diff Line Markers (MVP: Added/Modified Only)

**Date**: 2026-02-24
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-24
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F19 코드 뷰어 Git 라인 마커(MVP: 추가/수정)
**Priority**: Medium  
**Category**: UI/UX  
**Target Component**: `electron/main.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`, `src/workspace/workspace-context.tsx`, `src/App.tsx`, `src/code-viewer/code-viewer-panel.tsx`, `src/App.css`  
**Target Section**: `/_sdd/spec/sdd-workbench/02-architecture.md` > `4. 상태 모델`; `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`, `1.5 Code/Spec View Layer`, `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/04-interfaces.md` > `3. IPC 계약`

**Description**:  
코드 뷰어에서 active file 기준 Git 변경 라인 마커를 표시한다. MVP 범위는 다음과 같다.
1) Added line -> 초록색 마커  
2) Modified line -> 파란색 마커  
3) Deleted line 마커(빨간색)는 이번 범위에서 제외

**Acceptance Criteria**:
- [ ] active file이 Git 저장소 내 파일이면, 코드 라인 옆에 Git 변경 마커가 표시된다.
- [ ] 추가 라인은 `added`(green), 수정 라인은 `modified`(blue)로 구분되어 표시된다.
- [ ] deleted-only hunk는 표시하지 않는다(MVP 제외).
- [ ] image preview 모드/preview unavailable 상태에서는 Git 라인 마커를 표시하지 않는다.
- [ ] 기존 line selection/drag/context menu/comment badge 동작을 방해하지 않는다.
- [ ] 워크스페이스 전환/파일 전환/active file refresh 시 마커가 올바르게 갱신된다.
- [ ] Git 미초기화 디렉토리, git 명령 실패, binary/비교 불가 파일에서도 앱은 크래시 없이 마커만 비표시 처리된다.

**Technical Notes**:
- 비교 기준은 `HEAD` 대비 현재 워킹트리(`staged + unstaged`)로 고정한다.
- IPC로 active file 단건 조회만 수행하고, 전체 트리 Git 스캔은 하지 않는다.
- diff 파싱은 `--unified=0` hunk 기반으로 처리한다.
- `-`와 `+`가 함께 있는 hunk는 교집합 라인을 `modified`로 매핑한다.
- 순수 `+` 라인은 `added`로 매핑한다.
- 남는 `-` 라인은 MVP에서 무시한다(삭제 마커 제외).

**Dependencies**:
- F03/F03.1 코드 뷰어 라인 렌더 구조
- F11.1/F12.1 라인 배지/마커 렌더 경험(겹침 회피 규칙 재사용)

## Improvements

### Improvement: 파일 변경 상태 가시성 강화(라인 수준)
**Priority**: Medium  
**Target Section**: `/_sdd/spec/sdd-workbench/01-overview.md` > `3.1 MVP 포함 범위`  
**Current State**: 파일 트리 레벨 changed marker(`●`)만 존재하고, 코드 라인 단위 변경 위치는 확인할 수 없다.  
**Proposed**: active file 라인 단위 Git marker를 추가해 변경 위치를 즉시 식별 가능하게 한다.  
**Reason**: 리뷰/점검 시 diff 뷰를 별도로 열지 않아도 변경 밀집 구간을 빠르게 스캔할 수 있다.

## Component Changes

### New IPC Contract: `workspace:getGitLineMarkers`
**Target Section**: `/_sdd/spec/sdd-workbench/04-interfaces.md` > `3. IPC 계약`  
**Change Type**: New API

**Changes**:
- Renderer -> Main `invoke` 채널 추가
- request: `{ rootPath: string; relativePath: string }`
- response: `{ ok: boolean; markers?: Array<{ line: number; kind: 'added' | 'modified' }>; error?: string }`

### Update Component: `electron/main.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.7 Electron Boundary`  
**Change Type**: Enhancement

**Changes**:
- Git repo 유효성 확인 + 단건 diff 조회 핸들러 추가
- `git diff --no-color --unified=0 HEAD -- <relativePath>` 파싱 유틸 추가
- 실패 경로는 non-throw 결과(`ok: false`)로 반환

### Update Component: `electron/preload.ts`, `electron/electron-env.d.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/04-interfaces.md` > `3. IPC 계약`  
**Change Type**: Enhancement

**Changes**:
- `window.workspace.getGitLineMarkers(...)` 브리지/타입 추가

### Update Component: `src/workspace/workspace-context.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/02-architecture.md` > `4. 상태 모델`  
**Change Type**: Enhancement

**Changes**:
- workspace session에 active file Git marker 상태 추가
- active file 선택/refresh/watch 반영 시 marker 재조회 파이프라인 추가
- 실패 시 배너 노출 없이 빈 marker로 안전 degrade

### Update Component: `src/code-viewer/code-viewer-panel.tsx`, `src/App.css`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.5 Code/Spec View Layer`  
**Change Type**: Enhancement

**Changes**:
- 라인 넘버 옆 Git marker 렌더(`added`/`modified`)
- comment badge와 공존 가능한 배치 적용
- 선택/hover/context menu hit target 비간섭 보장

## Notes

### Context
사용자 요구는 “diff 텍스트 자체는 필요 없고, 코드 뷰어에서 변경 라인 위치를 색상 마커로 빠르게 식별”이다. MVP에서는 추가/수정만 먼저 제공해 구현 리스크를 줄이고, 삭제 라인 표시는 후속으로 분리한다.

### Constraints
- 삭제 라인 마커(red)는 MVP에서 제외한다.
- 렌더드 markdown 패널에는 Git 마커를 추가하지 않는다.
- 트리 패널 changed marker 정책(F07/F11.2)은 변경하지 않는다.

### Open Questions
- 현재 없음

---

# Part 2: Implementation Plan

## Overview

F19 MVP는 “active file 단건 Git diff -> line marker 렌더”를 최소 경로로 연결하는 작업이다. 핵심은 성능과 안정성을 유지하면서 코드 뷰어 가시성을 높이는 것이다.

## Scope

### In Scope
- active file 단건 Git line marker 조회 IPC
- added/modified 라인 분류 로직
- 코드 뷰어 라인 마커 렌더
- 기본 회귀 테스트

### Out of Scope
- deleted 라인(red) 마커
- inline diff 뷰/툴팁
- 파일 트리 Git 상태 배지 확장
- rendered markdown Git marker

## Components

1. **Git IPC Layer**: main/preload/electron-env 타입 계약  
2. **Git Marker State Layer**: workspace context 상태/재조회  
3. **Code Viewer Marker Layer**: 라인 UI 마커 렌더  
4. **Validation Layer**: 파서/렌더/통합 회귀 테스트

## Implementation Phases

### Phase 1: Git IPC + 파싱
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | `workspace:getGitLineMarkers` IPC 추가 | P0 | - | Git IPC Layer |
| T2 | `git diff --unified=0` 파싱으로 `added/modified` 라인 계산 | P0 | T1 | Git IPC Layer |

### Phase 2: 상태 연결 + UI 렌더
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | Workspace context에 active file marker 상태/재조회 연결 | P0 | T1,T2 | Git Marker State Layer |
| T4 | CodeViewer 라인 마커 렌더 + 스타일 | P0 | T3 | Code Viewer Marker Layer |

### Phase 3: 테스트/회귀
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | diff 파서 단위 테스트 + CodeViewer 렌더 테스트 | P0 | T2,T4 | Validation Layer |
| T6 | App 통합 회귀(파일 전환/워크스페이스 전환/오류 degrade) | P1 | T3,T4,T5 | Validation Layer |

## Task Details

### Task T1: Git line marker IPC 계약 추가
**Component**: Git IPC Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
Main/Preload/Renderer 타입 계약에 `workspace:getGitLineMarkers` 채널을 추가한다.

**Acceptance Criteria**:
- [ ] Renderer에서 active file 기준 호출 가능
- [ ] 성공 시 `added/modified` 라인 배열 반환
- [ ] 실패 시 `ok: false` 반환(throw/no crash)

**Target Files**:
- [M] `electron/main.ts`
- [M] `electron/preload.ts`
- [M] `electron/electron-env.d.ts`

**Dependencies**: -

---

### Task T2: diff 파서(added/modified only) 구현
**Component**: Git IPC Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
`git diff --unified=0` 결과를 파싱해 new-file 라인 기준 마커를 계산한다.

**Acceptance Criteria**:
- [ ] 순수 `+` 블록은 `added`
- [ ] `-`/`+` 혼합 블록은 교집합 구간 `modified`
- [ ] 남는 삭제 구간은 무시(MVP)

**Target Files**:
- [M] `electron/main.ts`
- [M] `electron/main.test.ts` 또는 파서 유틸 테스트 파일

**Technical Notes**:
- line number는 코드 뷰어와 동일하게 1-based 사용

**Dependencies**: T1

---

### Task T3: workspace 상태/재조회 연결
**Component**: Git Marker State Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
active file 기준 Git marker를 workspace session 상태로 관리하고, 파일 전환/리프레시 시 재조회한다.

**Acceptance Criteria**:
- [ ] active file 변경 시 marker 재조회
- [ ] 워크스페이스 전환 시 해당 세션 marker로 교체
- [ ] 조회 실패 시 빈 marker로 degrade

**Target Files**:
- [M] `src/workspace/workspace-context.tsx`
- [M] `src/workspace/workspace-model.ts` (필요 시)
- [M] `src/App.tsx`

**Dependencies**: T1, T2

---

### Task T4: CodeViewer 마커 렌더
**Component**: Code Viewer Marker Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:  
라인 번호 옆 영역에 Git marker(`added`, `modified`)를 렌더한다.

**Acceptance Criteria**:
- [ ] added = green, modified = blue
- [ ] 선택/우클릭/코멘트 배지 hover 동작에 간섭 없음
- [ ] image/preview-unavailable 모드에서는 마커 비표시

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx`
- [M] `src/App.css`

**Dependencies**: T3

---

### Task T5: 단위 테스트 보강
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:  
diff 파싱 규칙과 CodeViewer marker 렌더를 테스트로 고정한다.

**Acceptance Criteria**:
- [ ] added/modified 분류 테스트 존재
- [ ] deleted-only 제외 테스트 존재
- [ ] marker 스타일/DOM 테스트 존재

**Target Files**:
- [M] `electron/main.test.ts` 또는 신규 파서 테스트 파일
- [M] `src/code-viewer/code-viewer-panel.test.tsx`

**Dependencies**: T2, T4

---

### Task T6: 통합 회귀
**Component**: Validation Layer  
**Priority**: P1-High  
**Type**: Test

**Description**:  
App 레벨에서 file/workspace 전환 및 실패 degrade 시나리오를 점검한다.

**Acceptance Criteria**:
- [ ] 파일 전환 시 marker가 해당 파일 기준으로 바뀜
- [ ] 워크스페이스 전환 시 marker가 세션별로 분리됨
- [ ] git 실패/비repo 경로에서 앱 동작 회귀 없음

**Target Files**:
- [M] `src/App.test.tsx`

**Dependencies**: T3, T4, T5

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| 대형 파일 diff 비용 증가 | Medium | active file 단건 조회 + 필요 시 size guard |
| 혼합 hunk 분류 오판 | Medium | parser 단위 테스트(다양한 hunk 케이스) |
| 코멘트 배지/선택 UI 충돌 | Low | 기존 hit target 유지 + 회귀 테스트 |

## Exit Criteria

- [ ] added/modified marker가 코드 뷰어에서 안정적으로 표시된다.
- [ ] deleted marker 미지원이 문서/테스트에서 명시된다.
- [ ] 자동 테스트(`npm test`)와 정적 점검(`npm run lint`, `npm run build`)이 통과한다.
