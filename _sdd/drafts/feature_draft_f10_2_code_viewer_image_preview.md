# Feature Draft: F10.2 Code Viewer Image Preview

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

### Feature: F10.2 코드 뷰어 이미지 프리뷰
**Priority**: High
**Category**: UX
**Target Component**: `CodeViewerPanel`, `workspace:readFile` IPC, `WorkspaceProvider`
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue`

**Description**:
파일 트리에서 이미지 파일을 선택했을 때 center `Code Preview` 패널에서 텍스트 대신 이미지 프리뷰를 렌더한다. 기존 코드/마크다운 텍스트 프리뷰 흐름은 유지하고, 이미지는 read-only 미리보기로만 제공한다.

**Acceptance Criteria**:
- [ ] `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` 선택 시 center 패널에서 이미지가 렌더된다.
- [ ] 기존 텍스트 파일은 현재와 동일하게 코드 라인 프리뷰/선택/우클릭 복사 동작을 유지한다.
- [ ] 지원하지 않는 이미지 형식(예: 기본안에서 `svg` 제외) 또는 정책 위반 리소스는 `blocked placeholder text` 또는 `preview unavailable`로 안전하게 처리한다.
- [ ] 기존 2MB 프리뷰 상한 정책을 준수하며 상한 초과 파일은 기존 unavailable UX를 유지한다.
- [ ] watcher 변경 감지/세션 복원/파일 히스토리(F07/F07.1/F09) 동작이 회귀하지 않는다.

**Technical Notes**:
- 이미지 전달은 Renderer 안전성을 위해 `file://` 직접 노출 대신 안전한 미디어 payload(`mime + data URL`) 계약을 사용한다.
- 렌더 표면은 우측 markdown 패널이 아니라 center `Code Preview`로 고정한다.

**Dependencies**:
- F03/F03.1/F07/F09 구현 완료 상태

## Improvements

### Improvement: `workspace:readFile` 결과 계약의 미디어 프리뷰 확장
**Priority**: High
**Target Section**: `/_sdd/spec/main.md` > `9.2 MVP 목표 채널 (구현 + 계획)`
**Current State**: `workspace:readFile`는 텍스트 `content` 중심이며 바이너리 파일은 `previewUnavailableReason`으로만 처리된다.
**Proposed**: `workspace:readFile` 결과에 이미지 프리뷰를 위한 미디어 payload 필드를 추가해, 텍스트/이미지/미리보기 불가를 명시적으로 구분한다.
**Reason**: 코드 뷰어에서 이미지 파일을 읽기 전용으로 빠르게 검토할 수 있어 실제 워크플로우 가치를 높인다.

### Improvement: Code Viewer 렌더 모드 분기(텍스트/이미지/불가) 명시
**Priority**: Medium
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`
**Current State**: 텍스트 또는 preview unavailable 메시지 2가지 상태만 명시되어 있다.
**Proposed**: 텍스트 코드 모드, 이미지 프리뷰 모드, preview unavailable 모드 3-way 렌더 계약으로 확장한다.
**Reason**: UI 상태 전이가 명확해야 테스트/회귀 검증이 쉬워진다.

### Improvement: 수용 기준/테스트에 이미지 프리뷰 회귀 케이스 추가
**Priority**: Medium
**Target Section**: `/_sdd/spec/main.md` > `13. 테스트 및 수용 기준`
**Current State**: 코드 뷰어 테스트는 텍스트/하이라이트/선택/복사 중심이다.
**Proposed**: 이미지 프리뷰 표시, 상한 초과 처리, 텍스트 파일 회귀 유지 테스트를 추가한다.
**Reason**: 미디어 분기 추가 시 기존 코드 프리뷰 흐름 회귀를 조기 탐지하기 위함이다.

## Bug Reports

해당 없음

## Component Changes

### Update Component: Main `workspace:readFile` Handler (`electron/main.ts`)
**Target Section**: `/_sdd/spec/main.md` > `9.2 MVP 목표 채널 (구현 + 계획)`
**Change Type**: Enhancement

**Changes**:
- 이미지 파일 감지(확장자 + 시그니처) 및 미디어 payload 생성
- 텍스트/이미지/preview unavailable 결과 분기 반환
- 용량 상한/지원 형식 경계 처리

### Update Component: Preload/Type Contract (`electron/preload.ts`, `electron/electron-env.d.ts`)
**Target Section**: `/_sdd/spec/main.md` > `6.1 Preload API Contract`
**Change Type**: Enhancement

**Changes**:
- `WorkspaceReadFileResult` 타입에 이미지 프리뷰 필드 추가
- Renderer 타입 계약 동기화

### Update Component: Workspace State Layer (`src/workspace/workspace-model.ts`, `src/workspace/workspace-context.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.2 Workspace/State Model`
**Change Type**: Enhancement

**Changes**:
- 활성 파일 프리뷰 상태에 이미지 payload를 저장/초기화하는 경로 추가
- 파일 선택/리프레시/watcher 갱신 시 텍스트/이미지 상태 일관성 유지

### Update Component: Code Viewer (`src/code-viewer/code-viewer-panel.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`
**Change Type**: Enhancement

**Changes**:
- 이미지 프리뷰 렌더 블록 추가
- 텍스트 기반 라인 선택/우클릭 복사 액션은 텍스트 모드에서만 활성 유지
- 이미지 모드에서는 적절한 설명/메타데이터 표시

### Update Component: App Wiring (`src/App.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.5 Workspace/Context Actions`
**Change Type**: Enhancement

**Changes**:
- Workspace 상태의 이미지 프리뷰 값을 CodeViewerPanel props로 전달
- 기존 selection/jump/copy 흐름과의 공존 유지

## Configuration Changes

### New Config Constant: `ALLOWED_IMAGE_PREVIEW_MIME_PREFIX`
**Target Section**: `/_sdd/spec/main.md` > `10.2 보안`
**Type**: In-code Constant
**Required**: Yes
**Default**: `data:image/*` 허용 (제한)
**Description**: 미디어 프리뷰 데이터 URI 중 이미지 계열만 허용하도록 제한한다.

## Notes

### Resolved Decisions
- [x] 이미지 파일 프리뷰는 우측 markdown 패널이 아니라 center `Code Preview`에서 렌더한다.
- [x] 정책 위반/차단 리소스는 `blocked placeholder text`로 사용자에게 명시한다.
- [x] `data:` URI는 `data:image/*`만 제한 허용한다.
- [x] 인덱싱/프리뷰 상한은 현재 기준(2MB, index cap 별도)과 충돌 없이 유지한다.

### Scope Boundary
- 본 기능은 read-only 이미지 프리뷰에 집중하며, 편집/annotation/zoom 도구는 포함하지 않는다.
- 기본안에서 `svg`는 보안 이유로 제외하고, 필요 시 후속 feature로 분리한다.

---

# Part 2: Implementation Plan

## Overview

F10.2는 기존 텍스트 중심 코드 뷰어를 텍스트/이미지 dual preview로 확장하는 작업이다. 핵심은 IPC 결과 계약 확장과 renderer 상태 전이 안정화이며, 기존 라인 선택/복사/점프 UX를 텍스트 모드에서 그대로 보존하는 것이다.

## Scope

### In Scope
- 이미지 파일 프리뷰를 위한 `workspace:readFile` 결과 계약 확장
- `CodeViewerPanel` 이미지 렌더 모드 추가
- Workspace 상태 모델/컨텍스트에 미디어 프리뷰 상태 추가
- 이미지 프리뷰 + 텍스트 회귀 테스트 추가

### Out of Scope
- 이미지 편집/주석/확대 축소 툴
- SVG 렌더 지원
- 우측 markdown viewer 이미지 정책(F10 안정화에서 별도)

## Components

1. **ReadFile Media Contract Layer**: main/preload/type 계약 확장
2. **Workspace State Integration Layer**: 컨텍스트 상태 전이(텍스트/이미지/불가)
3. **Code Viewer Media UI Layer**: center 패널 렌더 분기
4. **Validation Layer**: 단위/통합 회귀 테스트

## Implementation Phases

### Phase 1: IPC Contract and Main Pipeline
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | `workspace:readFile` 미디어 결과 계약 확장 | P0 | - | ReadFile Media Contract Layer |
| T2 | main 이미지 감지/인코딩/차단 처리 구현 | P0 | T1 | ReadFile Media Contract Layer |

### Phase 2: Renderer Integration
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | Workspace 상태 모델/컨텍스트에 미디어 상태 반영 | P0 | T1,T2 | Workspace State Integration Layer |
| T4 | CodeViewer 이미지 렌더 모드 + UI 분기 구현 | P0 | T3 | Code Viewer Media UI Layer |

### Phase 3: Validation and Regression
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 이미지 프리뷰/텍스트 회귀 테스트 보강 | P0 | T4 | Validation Layer |

## Task Details

### Task T1: `workspace:readFile` 미디어 결과 계약 확장
**Component**: ReadFile Media Contract Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`WorkspaceReadFileResult`를 텍스트 전용에서 텍스트+이미지 프리뷰 가능한 계약으로 확장한다. 기존 소비자와 호환되도록 필드를 optional로 추가하고, 불가 사유 코드는 유지한다.

**Acceptance Criteria**:
- [ ] `WorkspaceReadFileResult`에 이미지 프리뷰 표현용 필드가 추가된다.
- [ ] preload와 renderer global 타입이 동일 계약으로 동기화된다.
- [ ] 기존 텍스트 파일 소비 경로가 컴파일/런타임 회귀 없이 유지된다.

**Target Files**:
- [M] `electron/electron-env.d.ts` -- readFile 결과 타입 확장
- [M] `electron/preload.ts` -- readFile 결과 타입/브리지 동기화
- [M] `src/workspace/workspace-context.tsx` -- 타입 소비 지점 선반영

**Technical Notes**:
- Backward compatibility를 위해 새 필드는 optional로 시작한다.
- 프리뷰 종류를 명시하는 discriminator(`previewKind`)를 도입하면 분기 안정성이 높다.

**Dependencies**: -

---

### Task T2: main 이미지 감지/인코딩/차단 처리 구현
**Component**: ReadFile Media Contract Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`electron/main.ts`의 `handleWorkspaceReadFile`에서 이미지 파일을 감지해 안전한 미디어 payload를 반환한다. 허용 형식만 처리하고 정책 위반 형식은 차단/불가 처리한다.

**Acceptance Criteria**:
- [ ] 허용 형식(`png/jpg/jpeg/gif/webp`) 파일은 이미지 프리뷰 payload를 반환한다.
- [ ] 2MB 초과 파일은 기존 `file_too_large`로 처리된다.
- [ ] 미지원/정책 위반 형식은 `preview unavailable` 또는 blocked reason으로 처리된다.
- [ ] workspace 경계 검증/바이너리 판별 보안 규칙이 유지된다.

**Target Files**:
- [M] `electron/main.ts` -- readFile 이미지 분기/인코딩/정책 처리

**Technical Notes**:
- MIME 판별은 확장자 + 최소 시그니처 검증을 함께 사용한다.
- renderer 전달은 `data:image/*;base64,...` 형태를 기본안으로 둔다.

**Dependencies**: T1

---

### Task T3: Workspace 상태 모델/컨텍스트에 미디어 상태 반영
**Component**: Workspace State Integration Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
워크스페이스 세션에 활성 파일 미디어 프리뷰 상태를 추가하고, 파일 선택/refresh/watcher 업데이트 시 상태 전이가 일관되게 동작하도록 context를 확장한다.

**Acceptance Criteria**:
- [ ] `WorkspaceSession`에 이미지 프리뷰 상태 필드가 추가된다.
- [ ] 파일 전환 시 텍스트/이미지 상태가 서로 오염되지 않는다.
- [ ] watcher refresh 후 active file 재로딩 시 이미지 변경이 반영된다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- 세션 타입/초기값 확장
- [M] `src/workspace/workspace-model.test.ts` -- 상태 전이 회귀 테스트 추가
- [M] `src/workspace/workspace-context.tsx` -- readFile 결과 분기 + 상태 업데이트
- [M] `src/workspace/use-workspace.ts` -- 노출 타입 동기화

**Technical Notes**:
- `activeSpecContent` 경로는 markdown 텍스트 전용으로 유지한다.
- 텍스트/이미지 상태 reset 타이밍은 `activeFile` 전환 기준으로 통일한다.

**Dependencies**: T1,T2

---

### Task T4: CodeViewer 이미지 렌더 모드 + UI 분기 구현
**Component**: Code Viewer Media UI Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
코드 뷰어에 이미지 렌더 모드를 추가한다. 텍스트 모드에서는 기존 라인 선택/우클릭 복사/점프를 유지하고, 이미지 모드에서는 이미지 프리뷰 및 보조 안내를 제공한다.

**Acceptance Criteria**:
- [ ] 이미지 payload가 있을 때 코드 라인 목록 대신 이미지 프리뷰가 렌더된다.
- [ ] 텍스트 모드에서는 기존 기능(선택/드래그/복사/점프)이 그대로 동작한다.
- [ ] 이미지 모드에서 텍스트 전용 컨텍스트 액션이 노출되지 않는다.
- [ ] 접근성 라벨(`alt`, 상태 텍스트)이 제공된다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx` -- 이미지 렌더 분기/UI
- [M] `src/App.tsx` -- CodeViewer props wiring 확장
- [M] `src/App.css` -- 이미지 프리뷰 스타일

**Technical Notes**:
- 이미지 컨테이너는 패널 스크롤 정책과 충돌하지 않도록 `max-width/max-height`를 제한한다.
- 텍스트 선택 상태(`selectionRange`)는 이미지 모드 진입 시 `null`로 정리한다.

**Dependencies**: T3

---

### Task T5: 이미지 프리뷰/텍스트 회귀 테스트 보강
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
이미지 프리뷰 신규 경로와 기존 텍스트 코드 뷰어 경로를 함께 검증한다. multi-workspace/watcher/세션 복원 주요 흐름에서 회귀가 없는지 확인한다.

**Acceptance Criteria**:
- [ ] CodeViewer 단위 테스트에서 이미지 렌더/텍스트 렌더 분기가 검증된다.
- [ ] App 통합 테스트에서 readFile 이미지 결과가 center 패널에 표시된다.
- [ ] unsupported/oversize 파일 처리 케이스가 검증된다.
- [ ] `npm test`, `npm run lint`, `npm run build`를 통과한다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- 이미지 모드/텍스트 모드 회귀 테스트
- [M] `src/App.test.tsx` -- readFile 이미지 payload 통합 테스트
- [M] `src/workspace/workspace-model.test.ts` -- 미디어 상태 전이 회귀 케이스

**Technical Notes**:
- 테스트에서 실제 바이너리 파일 대신 작은 data URL fixture를 사용한다.
- 기존 selection/copy 테스트는 유지하고, 이미지 모드에서의 비노출 조건만 추가 검증한다.

**Dependencies**: T4

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| Phase 1 | 2 | 1 | `electron/main.ts` 계약 의존(T1 -> T2) |
| Phase 2 | 2 | 1 | `src/workspace/workspace-context.tsx`, `src/App.tsx` 순차 필요 |
| Phase 3 | 1 | 1 | 테스트 파일 집중 |

충돌 포인트:
- `src/workspace/workspace-context.tsx`는 readFile 분기와 watcher refresh 경로가 결합되어 있으므로 단일 태스크(T3)에서 집중 수정이 안전하다.
- `src/App.test.tsx`는 기존 대규모 회귀 시나리오가 많아 T5에서만 최종 통합 수정 권장.

의미적 충돌 포인트:
- readFile 계약 변경은 `activeSpec` markdown 렌더 경로에도 영향을 줄 수 있으므로 텍스트 default path 보장이 필요하다.
- 이미지 모드 추가 시 코드 뷰어의 기존 selection/jump/copy 동작이 숨겨지는 조건을 명확히 고정해야 한다.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 이미지 payload(base64)로 메모리 사용량 증가 | 렌더 지연/메모리 압박 | 2MB 상한 유지 + 프리뷰 모드 제한 + 필요 시 후속 썸네일 전략 |
| MIME 판별이 느슨해 잘못된 렌더 허용 | 보안/안정성 저하 | 확장자 + 시그니처 이중 검증 + 미지원 기본 차단 |
| readFile 계약 확장으로 기존 텍스트 경로 회귀 | 핵심 UX 깨짐 | App/CodeViewer/Workspace 통합 테스트 동시 보강 |
| 이미지 모드에서 텍스트 액션 노출 혼선 | UX 오류 | 모드별 UI 분기와 테스트 고정 |

## Open Questions

- [ ] 없음 (현재 결정: center Code Preview 렌더 + blocked placeholder + `data:image/*` 제한 허용)

## Model Recommendation

- 구현/테스트 병행: GPT-5-Codex High
- 사유: IPC 계약 변경(main/preload/types) + renderer 상태/컴포넌트 + 통합 테스트 동시 수정이 필요함.

---

## Next Steps

### Apply Spec Patch (choose one)
- **Method A (automatic)**: `spec-update-todo` 스킬 실행 후 이 문서 Part 1 입력
- **Method B (manual)**: Part 1 항목을 `/_sdd/spec/main.md` 해당 Target Section에 반영

### Execute Implementation
- **Parallel**: `implementation` 스킬로 Part 2 실행
- **Sequential**: `implementation-sequential` 스킬로 Part 2 순차 실행
