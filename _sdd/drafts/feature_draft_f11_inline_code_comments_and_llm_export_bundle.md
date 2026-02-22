# Feature Draft: F11 Inline Code Comments + LLM Export Bundle

**Date**: 2026-02-21
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-21
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F11 인라인 코드 코멘트(선택 기반)
**Priority**: High
**Category**: Core Feature
**Target Component**: `src/code-viewer/code-viewer-panel.tsx`, `src/code-comments/*`
**Target Section**: `/_sdd/spec/main.md` > `2.1 MVP 포함 범위`, `6.3 CodeViewerPanel`, `7. 상태 모델`, `12.2 Feature Queue`

**Description**:
Code Viewer에서 라인 선택 후 코멘트를 추가하고, 소스 파일은 수정하지 않은 채 워크스페이스 외부 메타데이터(`comments.json`)로 저장한다. 코멘트는 `file/startLine/endLine/body/anchor(snippet+hash)`를 포함하고, 1-based 라인 범위를 기준으로 관리한다.

**Acceptance Criteria**:
- [ ] 선택 범위가 있을 때 `Add Comment` 액션으로 코멘트 입력/저장이 가능하다.
- [ ] 코멘트는 워크스페이스별 `workspaceRoot/.sdd-workbench/comments.json`에 영속화된다.
- [ ] 코멘트 저장 시 `anchor.snippet`, `anchor.hash`, `createdAt`이 자동 생성된다.
- [ ] 앱은 코멘트 저장/읽기 실패 시 배너로 실패를 안내하고 크래시하지 않는다.

**Technical Notes**:
- 코멘트 데이터는 JSON이 source of truth.
- 라인 이동 자동 추적(AST/relocation)은 포함하지 않는다(MVP+1 제외).
- 정렬 규칙은 `file ASC, startLine ASC, createdAt ASC`로 고정한다.

**Dependencies**:
- 기존 선택 상태(`selectionRange`) 및 active file 컨텍스트 재사용

---

### Feature: F11 LLM Prompt Bundle Export
**Priority**: High
**Category**: Enhancement
**Target Component**: `src/App.tsx`, `src/code-comments/*`, `electron/main.ts`
**Target Section**: `/_sdd/spec/main.md` > `6.5 Workspace/Context Actions`, `9.2 MVP 목표 채널`, `10.3 신뢰성`, `13. 테스트 및 수용 기준`, `12.2 Feature Queue`

**Description**:
`Export Comments` 액션으로 모달을 열어 LLM 지시문을 입력하고, 코멘트 번들(Instruction + Constraints + Comments)을 생성한다. 옵션에 따라 클립보드 복사, `_COMMENTS.md` 저장, bundle 파일 저장(`.sdd-workbench/exports/<timestamp>-comments-bundle.md`)을 수행한다.

**Acceptance Criteria**:
- [ ] Export 모달에서 `Instruction for LLM` 입력 및 export 옵션 선택이 가능하다.
- [ ] `_COMMENTS.md`는 export 시 항상 전체 재생성(덮어쓰기)된다.
- [ ] 번들 파일 저장 옵션 사용 시 timestamp 파일이 생성된다.
- [ ] 번들 텍스트는 LLM copy-paste 가능한 고정 포맷으로 생성된다.

**Technical Notes**:
- `_COMMENTS.md`는 역파싱하지 않는다(단방향 산출물).
- 외부 워크스페이스 자동 탐색 없이 active workspace 기준으로 동작한다.

**Dependencies**:
- F11 코멘트 저장 기능

---

## Improvements

### Improvement: 번들 길이 안전 정책 고정
**Priority**: High
**Target Section**: `/_sdd/spec/main.md` > `10. 성능/보안/신뢰성 기준`, `13. 테스트 및 수용 기준`
**Current State**: 컨텍스트 복사 기능은 있지만 대형 payload 길이 보호 정책이 코멘트 번들 단위로 정의되어 있지 않음
**Proposed**: `MAX_CLIPBOARD_CHARS = 30000` 기준을 도입하고 초과 시 클립보드 복사를 비활성화하고 파일 저장만 허용
**Reason**: LLM 입력 길이 초과 실패를 사전에 방지하고 실패 모드를 예측 가능하게 유지

---

## Component Changes

### New Component: Code Comment Domain (`src/code-comments/comment-types.ts`, `src/code-comments/comment-anchor.ts`)
**Target Section**: `/_sdd/spec/main.md` > `6. 컴포넌트 상세`, `7. 상태 모델`
**Purpose**: `CodeComment` 타입/anchor 생성(snippet/hash) 규칙 정의
**Input**: `activeFile`, `selectionRange`, `activeFileContent`, 사용자 코멘트 문자열
**Output**: 저장 가능한 `CodeComment` 객체

**Planned Methods**:
- `createCommentAnchor(content, selectionRange)` - snippet/before/after/hash 생성
- `buildCodeComment(input)` - `CodeComment` 엔트리 생성

### New Component: Comment Persistence/Export (`src/code-comments/comment-persistence.ts`, `src/code-comments/comment-export.ts`)
**Target Section**: `/_sdd/spec/main.md` > `6. 컴포넌트 상세`, `9. IPC 계약`
**Purpose**: comments read/write 및 `_COMMENTS.md`/bundle text 생성 규칙 캡슐화
**Input**: `workspaceRoot`, comment list, 사용자 instruction/options
**Output**: persisted JSON, markdown artifact, bundle text

**Planned Methods**:
- `serializeComments(comments)` / `parseComments(json)`
- `renderCommentsMarkdown(comments)`
- `renderLlmBundle({ instruction, comments })`

### Update Component: Code Viewer (`src/code-viewer/code-viewer-panel.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`
**Change Type**: Enhancement

**Changes**:
- 우클릭 액션에 `Add Comment` 항목 추가
- 선택 범위 없는 경우 `Add Comment` 비활성 또는 비노출 정책 적용
- 기존 `Copy Selected Content`/`Copy Both`/`Copy Relative Path` 동작 유지

### Update Component: App Wiring (`src/App.tsx`)
**Target Section**: `/_sdd/spec/main.md` > `6.5 Workspace/Context Actions`
**Change Type**: Enhancement

**Changes**:
- `Export Comments` 액션 및 모달 오케스트레이션 추가
- 코멘트 저장/내보내기 성공/실패 배너 피드백 연결
- active workspace 변경 시 코멘트 로드 경계 유지

### Update Component: Electron IPC (`electron/main.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`)
**Target Section**: `/_sdd/spec/main.md` > `9.2 MVP 목표 채널`
**Change Type**: Enhancement

**Changes**:
- 코멘트 read/write/export용 IPC 채널 추가
- workspace root 경계 검사 + `.sdd-workbench` 디렉터리 생성/파일 저장 처리
- bundle export 파일 timestamp naming 보장

---

## Configuration Changes

### New Config: `MAX_CLIPBOARD_CHARS`
**Target Section**: `/_sdd/spec/main.md` > `10. 성능/보안/신뢰성 기준`
**Type**: App Constant
**Required**: Yes
**Default**: `30000`
**Description**: 코멘트 번들 클립보드 복사 허용 최대 길이

---

## Notes

### Context
이 기능은 “앱이 코드를 직접 수정하지 않고, 의도와 문맥을 구조화해 에이전트 수정 루프를 빠르게 만든다”는 현재 제품 철학을 강화한다.

### Constraints
- source code 파일은 직접 수정하지 않는다.
- `_COMMENTS.md`는 export 산출물이며 source of truth가 아니다.
- comments/bundle 저장 경로는 active workspace root 경계 밖으로 벗어날 수 없다.

### Out of Scope
- 자동 라인 relocation(`moved`) 탐지 로직
- AST 기반 anchor 추적
- 실시간 협업/원격 동기화
- LLM API 직접 호출(클립보드/파일 export만)

---

# Part 2: Implementation Plan

## Overview

F11은 코드 선택 기반 코멘트 수집과 LLM export 번들 생성을 추가하는 기능이다.
핵심은 코멘트 데이터 모델/영속화/내보내기 포맷을 먼저 고정하고,
그 위에 Code Viewer 우클릭 액션과 App export UX를 연결하는 것이다.

## Scope

### In Scope
- 코멘트 데이터 모델(`CodeComment`) + anchor(snippet/hash) 생성
- 워크스페이스별 comments JSON 영속화
- `_COMMENTS.md` 재생성 export
- LLM bundle 생성 + clipboard/file 저장
- 길이 정책(`MAX_CLIPBOARD_CHARS`) 적용
- 단위/통합 테스트 보강

### Out of Scope
- 코멘트 편집/삭제 UI 고도화(초기에는 add 중심)
- moved/missing 자동 추적 로직
- 클라우드 동기화 및 외부 LLM API 호출

## Components

1. **Comment Domain Layer**: 코멘트 타입/anchor/hash/정렬 규칙
2. **Comment Persistence IPC Layer**: comments.json 및 export artifact read/write
3. **Comment Interaction UI Layer**: Code Viewer `Add Comment` + 입력 모달
4. **Bundle Export UI Layer**: Export 모달 + 길이 정책 + clipboard/file 저장
5. **Validation Layer**: 포맷/상태/회귀 테스트

## Implementation Phases

### Phase 1: Domain + IPC 계약 고정

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | 코멘트 데이터 모델/anchor/hash 유틸 구현 | P0 | - | Comment Domain Layer |
| T2 | comments read/write/export IPC 구현 | P0 | T1 | Comment Persistence IPC Layer |

### Phase 2: UI 상호작용 구현

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | Code Viewer `Add Comment` 액션 + 입력 모달 연동 | P0 | T1,T2 | Comment Interaction UI Layer |
| T4 | Export Comments 모달 + bundle 생성/저장 플로우 구현 | P0 | T2 | Bundle Export UI Layer |

### Phase 3: 안정화/검증

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 길이 정책/에러 배너/경계 처리 보강 | P1 | T3,T4 | Bundle Export UI Layer |
| T6 | 단위/통합 테스트 보강 + 품질 게이트 | P0 | T3,T4,T5 | Validation Layer |

## Task Details

### Task T1: 코멘트 데이터 모델/anchor/hash 유틸 구현
**Component**: Comment Domain Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`CodeComment` 타입과 anchor(snippet/hash/before/after) 생성 로직을 구현한다. 선택 범위를 기준으로 snippet(최대 N chars 또는 1~3 lines)을 생성하고 정규화된 hash를 계산한다.

**Acceptance Criteria**:
- [ ] `CodeComment` 타입이 정의되고 필수 필드가 모두 검증된다.
- [ ] snippet/hash 생성 함수가 deterministic 결과를 반환한다.
- [ ] 선택 범위 경계(빈 파일/단일 줄/다중 줄)에서 안정 동작한다.

**Target Files**:
- [C] `src/code-comments/comment-types.ts` -- `CodeComment`/input/output 타입 정의
- [C] `src/code-comments/comment-anchor.ts` -- snippet/hash/before/after 생성 유틸
- [C] `src/code-comments/comment-anchor.test.ts` -- anchor 생성 단위 테스트

**Technical Notes**:
- hash는 SHA-256(또는 동급) + normalize(공백/줄바꿈 표준화) 기반으로 고정.
- line 번호는 1-based inclusive 기준 유지.

**Dependencies**: -

---

### Task T2: comments read/write/export IPC 구현
**Component**: Comment Persistence IPC Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
main/preload/type 계약에 코멘트 저장/읽기/export 채널을 추가하고, workspace 경계 안에서 `.sdd-workbench/comments.json`, `_COMMENTS.md`, `.sdd-workbench/exports/*.md` 저장을 처리한다.

**Acceptance Criteria**:
- [ ] comments JSON read/write IPC가 동작한다.
- [ ] `_COMMENTS.md` export는 전체 재생성(덮어쓰기)으로 동작한다.
- [ ] bundle 파일 export는 timestamp naming으로 저장된다.
- [ ] 경계 밖 경로 접근은 차단되고 오류가 반환된다.

**Target Files**:
- [M] `electron/main.ts` -- IPC handler + 경계 검사 + 디렉터리 생성/파일 저장
- [M] `electron/preload.ts` -- renderer API 브리지 노출
- [M] `electron/electron-env.d.ts` -- Window 타입 계약 확장
- [C] `src/code-comments/comment-export.ts` -- `_COMMENTS.md`/bundle 텍스트 렌더 유틸
- [C] `src/code-comments/comment-persistence.ts` -- JSON serialize/parse helper

**Technical Notes**:
- 기존 `isPathInsideWorkspace` 정책을 재사용한다.
- 파일 저장은 atomic write(임시 파일 후 rename) 또는 동등 안정성 방식 권장.

**Dependencies**: T1

---

### Task T3: Code Viewer `Add Comment` 액션 + 입력 모달 연동
**Component**: Comment Interaction UI Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
Code Viewer 우클릭 메뉴에 `Add Comment`를 추가하고, 선택 범위를 기반으로 코멘트 입력 모달을 열어 저장까지 연결한다.

**Acceptance Criteria**:
- [ ] 우클릭 메뉴에서 `Add Comment`가 노출된다.
- [ ] 저장 시 active file + selectionRange + body로 comment 생성/저장이 수행된다.
- [ ] 저장 성공/실패에 대해 배너 피드백이 제공된다.
- [ ] 기존 복사 액션 3종 동작은 회귀 없이 유지된다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx` -- `Add Comment` 액션 추가/콜백 연결
- [C] `src/code-comments/comment-editor-modal.tsx` -- 코멘트 입력 모달 UI
- [M] `src/App.tsx` -- add-comment 핸들러/상태/저장 오케스트레이션
- [M] `src/App.css` -- 모달/액션 UI 스타일

**Technical Notes**:
- 모달은 textarea + Save/Cancel 최소 구성으로 시작.
- `selectionRange === null`일 때는 액션 비활성 또는 guard 처리.

**Dependencies**: T1, T2

---

### Task T4: Export Comments 모달 + bundle 생성/저장 플로우 구현
**Component**: Bundle Export UI Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
App 액션 영역에 `Export Comments`를 추가하고, instruction 입력 + 옵션 체크박스(copy/_COMMENTS.md/bundle file) 기반 export 플로우를 구현한다.

**Acceptance Criteria**:
- [ ] Export 모달에서 instruction/옵션 입력 후 confirm 가능
- [ ] `_COMMENTS.md` 저장 옵션 ON 시 파일이 재생성됨
- [ ] bundle file 저장 옵션 ON 시 timestamp 파일이 생성됨
- [ ] copy 옵션 ON 시 길이 정책 통과 시 클립보드 복사됨

**Target Files**:
- [C] `src/code-comments/export-comments-modal.tsx` -- export 옵션 모달
- [M] `src/App.tsx` -- export 버튼/모달/IPC 호출 wiring
- [M] `src/App.css` -- export 모달/폼 스타일
- [M] `src/code-comments/comment-export.ts` -- bundle 텍스트 포맷 함수 확장

**Technical Notes**:
- bundle 템플릿은 고정 헤더(Instruction/Constraints/Comments) 포맷으로 유지.
- 코멘트 정렬은 file+line deterministic order 사용.

**Dependencies**: T2

---

### Task T5: 길이 정책/에러 배너/경계 처리 보강
**Component**: Bundle Export UI Layer
**Priority**: P1-High
**Type**: Feature

**Description**:
`MAX_CLIPBOARD_CHARS`를 적용해 길이 초과 시 copy를 차단하고 경고 배너를 표시한다. 파일 저장-only fallback을 강제한다.

**Acceptance Criteria**:
- [ ] bundle 길이 <= max면 copy 허용
- [ ] bundle 길이 > max면 copy 비활성 + 경고 표시
- [ ] 길이 초과 시 파일 저장-only 경로가 정상 동작
- [ ] 정책 값은 상수로 중앙 관리된다.

**Target Files**:
- [C] `src/code-comments/comment-config.ts` -- `MAX_CLIPBOARD_CHARS` 상수
- [M] `src/App.tsx` -- copy guard + 배너 처리
- [M] `src/code-comments/export-comments-modal.tsx` -- copy 옵션 disable/도움말 표시

**Technical Notes**:
- 경고 문구: `Bundle too large for clipboard. Saved to file only.`
- 정책 상수는 추후 설정화 가능하도록 단일 모듈에서 export.

**Dependencies**: T3, T4

---

### Task T6: 단위/통합 테스트 보강 + 품질 게이트
**Component**: Validation Layer
**Priority**: P0-Critical
**Type**: Test

**Description**:
코멘트 생성/저장/export/길이 정책/회귀를 단위/통합 테스트로 고정하고 품질 게이트를 통과시킨다.

**Acceptance Criteria**:
- [ ] anchor/hash/markdown/bundle 포맷 단위 테스트가 통과한다.
- [ ] App 통합 테스트에서 add comment + export 플로우가 검증된다.
- [ ] 길이 초과 copy 차단/파일 저장 fallback이 검증된다.
- [ ] 기존 Code Viewer 복사/선택 기능 회귀가 없다.
- [ ] `npm test`, `npm run lint`, `npm run build`를 통과한다.

**Target Files**:
- [M] `src/App.test.tsx` -- add comment/export/modal/길이 정책 통합 테스트
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- `Add Comment` 액션 노출/기존 액션 회귀
- [C] `src/code-comments/comment-export.test.ts` -- markdown/bundle 포맷 테스트
- [C] `src/code-comments/comment-persistence.test.ts` -- JSON serialize/parse 테스트

**Technical Notes**:
- App 테스트에서는 `window.workspace.*` mock에 신규 comment IPC를 추가한다.
- 대형 bundle 케이스는 fixture 반복 문자열로 길이 정책 검증.

**Dependencies**: T3, T4, T5

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| Phase 1 | 2 | 2 | 없음 (T1: `src/code-comments/*`, T2: `electron/*`) |
| Phase 2 | 2 | 1 | `src/App.tsx`, `src/App.css` 충돌 (T3 ↔ T4) |
| Phase 3 | 2 | 1 | `src/App.test.tsx` 충돌 (T5 ↔ T6 순차 권장) |

충돌 포인트:
- `src/App.tsx`는 코멘트 작성/내보내기 두 흐름의 중심이라 T3/T4/T5를 순차 수행해야 안정적이다.
- `src/App.css`는 모달 스타일이 겹치므로 단일 태스크 책임(T4) 또는 순차 병합이 필요하다.

의미적 충돌 포인트:
- 기존 복사 액션 UX(F06.2)와 `Add Comment` 액션이 동일 우클릭 메뉴를 공유하므로 메뉴 순서/가시성 규칙을 명시해야 한다.
- 멀티 워크스페이스 경계(F03.5/F09)와 코멘트 파일 저장 경계를 일치시켜야 데이터 오염을 막을 수 있다.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 코멘트 JSON 손상/파싱 실패 | 코멘트 유실/로딩 실패 | parse 실패 시 빈 목록 fallback + 배너 알림 + 손상 파일 보존 |
| 대형 bundle copy 실패 | 사용자 작업 중단 | 길이 정책 사전 검사 + 파일 저장-only fallback |
| 우클릭 메뉴 복잡도 증가 | 사용성 저하 | 메뉴 순서 고정(`Copy` 계열 후 `Add Comment`) + 최소 액션 유지 |
| workspace 경계 오처리 | 잘못된 경로 저장/보안 위험 | main IPC에서 `isPathInsideWorkspace` 재사용 |

## Open Questions

- [ ] 없음 (결정 고정: 정렬=file+line, `_COMMENTS.md`는 export overwrite, copy 길이 제한=30000)

## Model Recommendation

- 구현: GPT-5 Codex High
- 테스트/회귀: GPT-5 Codex Medium

---

## Next Steps

1. `spec-update-todo`로 F11 패치를 `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md`에 반영
2. `implementation` 스킬로 Part 2 태스크(T1~T6) 실행
3. 완료 후 `spec-update-done`으로 구현 결과 동기화
