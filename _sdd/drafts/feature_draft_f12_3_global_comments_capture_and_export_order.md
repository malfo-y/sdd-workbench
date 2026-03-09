# Feature Draft: F12.3 Global Comments + Export Prepend Order

**Date**: 2026-02-22
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-22
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F12.3 Add Global Comments (파일/라인 비참조 코멘트)
**Priority**: High
**Category**: Enhancement
**Target Component**: `src/App.tsx`, `src/code-comments/*`, `src/workspace/workspace-context.tsx`, `electron/*`
**Target Section**: `/_sdd/spec/sdd-workbench/product-overview.md` > `3.1 MVP 포함 범위`, `4.3 코멘트-LLM 흐름`; `/_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`, `1.2 Workspace State Layer`, `1.6 Comment Domain Layer`, `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/contract-map.md` > `3. IPC 계약`, `4. 코멘트/Export 정책 계약`

**Description**:
헤더에 `Add Global Comments` 버튼을 추가해 파일/라인과 무관한 전역 코멘트를 작성/수정한다. 전역 코멘트는 워크스페이스별로 저장되며, 코멘트 export 시 line comment보다 먼저 bundle 상단에 포함되어야 한다.

**Acceptance Criteria**:
- [ ] `Add Global Comments` 버튼으로 전역 코멘트 편집 모달을 열 수 있다.
- [ ] 전역 코멘트는 워크스페이스별로 영속화된다(예: `.sdd-workbench/global-comments.md`).
- [ ] 앱 재시작 후 동일 워크스페이스를 열면 전역 코멘트 내용이 복원된다.
- [ ] `Export Comments` 시 전역 코멘트 블록이 line comments보다 먼저 출력된다.
- [ ] line comment의 incremental export(`exportedAt`) 정책은 기존 그대로 유지된다.

**Technical Notes**:
- 전역 코멘트는 line comment 스키마(`comments.json`)에 섞지 않고 별도 파일로 관리한다.
- 전역 코멘트가 비어 있으면 export에서 전역 섹션은 생략 가능하다.
- 전역 코멘트 편집은 Markdown plaintext 입력으로 제한한다.

**Dependencies**:
- F11/F11.1 export 파이프라인
- F09 세션 복원(워크스페이스별 상태 복원 맥락)

## Improvements

### Improvement: Export 렌더 계약에 `globalComments` 입력 추가
**Priority**: High
**Target Section**: `/_sdd/spec/sdd-workbench/contract-map.md` > `4. 코멘트/Export 정책 계약`
**Current State**: export 텍스트는 line comment 기반으로만 생성된다.
**Proposed**: `renderCommentsMarkdown`/`renderLlmBundle`에 optional `globalComments` 입력을 추가하고, 렌더 시 전역 섹션을 선행 배치한다.
**Reason**: LLM 입력에서 전체 작업 의도(전역 맥락)를 먼저 전달하기 위함.

### Improvement: 전역 코멘트 전용 IPC 채널 도입
**Priority**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/contract-map.md` > `3. IPC 계약`
**Current State**: `comments.json` read/write 채널만 존재한다.
**Proposed**: `workspace:readGlobalComments`, `workspace:writeGlobalComments` 채널을 추가한다.
**Reason**: 기존 comment 스키마를 건드리지 않고 데이터 책임을 분리하기 위함.

## Component Changes

### New Component: `src/code-comments/global-comments-modal.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.6 Comment Domain Layer`
**Purpose**: 전역 코멘트 작성/수정 UI
**Input**: `initialValue`, `isSaving`, `onSave`, `onCancel`
**Output**: 전역 코멘트 문자열 저장 요청

**Planned Methods**:
- `GlobalCommentsModal()` - textarea 기반 입력 모달

### Update Component: `src/code-comments/comment-export.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/contract-map.md` > `4. 코멘트/Export 정책 계약`
**Change Type**: Enhancement

**Changes**:
- `renderCommentsMarkdown({ globalComments, comments })` 형태로 시그니처 확장
- `renderLlmBundle` 출력에 `## Global Comments` 섹션 선행 추가

### Update Component: `src/App.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.1 App Shell`
**Change Type**: Enhancement

**Changes**:
- `Add Global Comments` 버튼 추가
- 전역 코멘트 읽기/편집/저장 상태 관리
- export 입력 생성 시 global comments prepend 반영

### Update Component: `src/workspace/workspace-context.tsx`, `src/workspace/workspace-model.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.2 Workspace State Layer`
**Change Type**: Enhancement

**Changes**:
- 워크스페이스별 전역 코멘트 로드/캐시 상태 추가
- 워크스페이스 전환 시 active 상태 동기화

### Update Component: `electron/main.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`
**Target Section**: `/_sdd/spec/sdd-workbench/component-map.md` > `1.7 Electron Boundary`; `/_sdd/spec/sdd-workbench/contract-map.md` > `3. IPC 계약`
**Change Type**: Enhancement

**Changes**:
- 전역 코멘트 read/write IPC 추가
- workspace 경계 검증 및 파일 생성 로직 추가

## Notes

### Context
라인 코멘트만으로는 작업 전체 지시사항(예: 스타일 가이드, 공통 제약)을 함께 전달하기 어렵다. F12.3은 전역 코멘트 채널을 추가해 LLM export 품질을 개선한다.

### Constraints
- 전역 코멘트는 단일 문서(워크스페이스별 1개)로 제한한다.
- 전역 코멘트는 incremental export 대상이 아니며 항상 최신 본문 기준으로 포함한다.

### Open Questions
- 현재 없음

---

# Part 2: Implementation Plan

## Overview

F12.3은 line comment와 별개인 전역 코멘트 입력/저장 경로를 만들고 export 시 상단 prepend 규칙을 추가한다. 핵심은 별도 IPC 채널과 export 템플릿 확장이다.

## Scope

### In Scope
- `Add Global Comments` UI
- 전역 코멘트 파일 read/write IPC
- 워크스페이스별 전역 코멘트 상태 로딩/저장
- export 텍스트에서 전역 코멘트 선행 배치

### Out of Scope
- 전역 코멘트 버전 히스토리
- 다중 전역 문서/카테고리 분류
- 전역 코멘트 협업 동기화

## Components

1. **Global Comments Persistence Layer**: 전역 코멘트 파일 read/write
2. **Global Comments UI Layer**: 작성/수정 모달
3. **Export Composition Layer**: 전역 + 라인 코멘트 합성
4. **Validation Layer**: 계약/회귀 테스트

## Implementation Phases

### Phase 1: 계약/저장소 준비
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | 전역 코멘트 IPC 채널 추가 | P0 | - | Global Comments Persistence Layer |
| T2 | workspace 상태에 전역 코멘트 로딩/저장 액션 추가 | P0 | T1 | Global Comments Persistence Layer |

### Phase 2: UI/Export 통합
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | Add Global Comments 모달/버튼 구현 | P0 | T2 | Global Comments UI Layer |
| T4 | export 템플릿 prepend 규칙 구현 | P0 | T2,T3 | Export Composition Layer |

### Phase 3: 검증
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 테스트 보강(IPC/렌더/통합) | P0 | T3,T4 | Validation Layer |

## Task Details

### Task T1: 전역 코멘트 IPC 채널 추가
**Component**: Global Comments Persistence Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
워크스페이스 내부 `.sdd-workbench/global-comments.md` 읽기/쓰기 IPC 채널을 추가한다.

**Acceptance Criteria**:
- [ ] `workspace:readGlobalComments` 채널이 추가된다.
- [ ] `workspace:writeGlobalComments` 채널이 추가된다.
- [ ] 파일이 없으면 빈 문자열 또는 초기값으로 안전 처리된다.
- [ ] workspace 경계 바깥 경로 접근은 차단된다.

**Target Files**:
- [M] `electron/main.ts` -- read/write handler 구현 + 경계 검사
- [M] `electron/preload.ts` -- renderer 브리지 메서드 노출
- [M] `electron/electron-env.d.ts` -- 타입 계약 확장

**Technical Notes**:
- write는 `mkdir -p .sdd-workbench` 후 overwrite 저장으로 단순화.

**Dependencies**: -

---

### Task T2: workspace 상태에 전역 코멘트 로딩/저장 액션 추가
**Component**: Global Comments Persistence Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
워크스페이스별 전역 코멘트 상태를 컨텍스트에서 관리하고 전환/복원 시 로딩한다.

**Acceptance Criteria**:
- [ ] active workspace 전환 시 해당 전역 코멘트가 로드된다.
- [ ] 저장 성공 시 상태와 저장소가 동기화된다.
- [ ] 읽기/쓰기 실패 시 배너 오류를 표시한다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- 전역 코멘트 상태 필드 추가
- [M] `src/workspace/workspace-context.tsx` -- load/save 액션 및 상태 동기화
- [M] `src/workspace/workspace-model.test.ts` -- 상태 전이 테스트 추가

**Technical Notes**:
- 세션 스냅샷에는 본문 자체 대신 필요 시 cache key만 유지 가능(기본안: 런타임 로드).

**Dependencies**: T1

---

### Task T3: Add Global Comments 모달/버튼 구현
**Component**: Global Comments UI Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
헤더 액션과 전역 코멘트 편집 모달을 구현하고 저장 플로우를 연결한다.

**Acceptance Criteria**:
- [ ] `Add Global Comments` 버튼이 헤더에 표시된다.
- [ ] 모달에서 편집/저장/취소가 동작한다.
- [ ] 저장 완료 시 성공 배너를 표시한다.

**Target Files**:
- [C] `src/code-comments/global-comments-modal.tsx` -- 전역 코멘트 편집 모달
- [M] `src/App.tsx` -- 버튼/모달 상태/저장 핸들러 연결
- [M] `src/App.css` -- 모달/버튼 스타일 추가

**Technical Notes**:
- textarea 입력은 markdown raw text로 보존하며 sanitize는 출력 시점에 적용.

**Dependencies**: T2

---

### Task T4: export 템플릿 prepend 규칙 구현
**Component**: Export Composition Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
코멘트 export 텍스트 생성 함수와 export 실행 경로를 확장해 전역 코멘트를 선행 배치한다.

**Acceptance Criteria**:
- [ ] bundle에서 `Global Comments` 섹션이 `Comments` 섹션보다 먼저 출력된다.
- [ ] `_COMMENTS.md`에도 동일한 순서가 적용된다.
- [ ] 전역 코멘트가 비어 있으면 섹션을 생략한다.
- [ ] line comment incremental export 동작은 기존과 동일하다.

**Target Files**:
- [M] `src/code-comments/comment-export.ts` -- 템플릿 시그니처/출력 확장
- [M] `src/code-comments/comment-export.test.ts` -- 순서/빈값 처리 테스트
- [M] `src/App.tsx` -- export 호출 인자(globalComments) 전달
- [M] `src/code-comments/export-comments-modal.tsx` -- 길이 추정 입력 경로 동기화(필요 시)

**Technical Notes**:
- 길이 추정 함수(`estimateBundleLength`)도 전역 코멘트를 포함해 계산한다.

**Dependencies**: T2, T3

---

### Task T5: 테스트 보강(IPC/렌더/통합)
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
전역 코멘트 저장/복원/export prepend 경로를 자동 테스트로 검증한다.

**Acceptance Criteria**:
- [ ] IPC read/write 핸들러 테스트가 추가된다.
- [ ] App에서 전역 코멘트 편집 후 export 반영이 검증된다.
- [ ] 기존 F11/F11.1 export 회귀가 없다.

**Target Files**:
- [M] `src/App.test.tsx` -- 전역 코멘트 편집 + export 통합 테스트
- [M] `electron/main.test.ts` -- IPC 핸들러 테스트(테스트 인프라 존재 시)

**Technical Notes**:
- Electron main 테스트 인프라가 없으면 renderer mock IPC 테스트로 대체한다.

**Dependencies**: T3, T4

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 1 | `src/workspace/workspace-context.tsx`는 T1 이후 작업 필요 |
| 2 | 2 | 2 | `src/App.tsx` (T3, T4) 충돌 가능 |
| 3 | 1 | 1 | 테스트 파일 충돌 가능성 낮음 |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| export 시 길이 급증으로 clipboard 제한 초과 | Medium | 기존 길이 제한 정책 재사용 + 안내 배너 |
| 전역 코멘트 파일 read/write 실패 | Medium | 빈값 fallback + 명확한 배너 메시지 |

## Open Questions

- [ ] 전역 코멘트 파일 경로를 `.sdd-workbench/global-comments.md`로 고정할지 여부(기본안: 고정)

