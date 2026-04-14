# Implementation Plan: 코드 리팩토링 로드맵 (Phase 0~4)

**날짜**: 2026-04-14
**기반 문서**:
- `_sdd/drafts/2026-04-14_feature_draft_code_refactoring_roadmap.md`
- `_sdd/discussion/2026-04-14_discussion_code_refactoring_roadmap.md`
- `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`

**Phase 전략**: Dependency-Driven (의존성 체인 깊이 4, 계층 명확: 기반 수정 -> 독립 모듈 분할 -> 앱 셸 분할 -> 코어 상태 분할)

---

## Overview

4대 모놀리스 파일(합계 12,061줄)을 관심사별로 분할하여 각 파일을 ~800줄 이하로 축소한다. Phase 0에서 즉시 수정 가능한 보안/버그/정리 항목 17건을 먼저 처리하여 안정적인 base를 확보한 후, Phase 1~4를 순차 실행한다.

## Scope

### In Scope

- Phase 0: 보안 취약점 5건 즉시 수정, 버그/안정성 6건 수정, 데드코드/오타 6건 정리
- Phase 1~4: 4대 모놀리스 파일의 관심사별 분할 (구조 분리 중심, 로직 변경 최소화)
- 분리 전제조건인 패턴 개선: IPC 타입 통합 (Phase 2), IPC boilerplate 헬퍼 (Phase 4), IPC 등록 테이블화 (Phase 2)

### Out of Scope

- 비동기/레이스 컨디션 로직 수정 (POST_SPLIT_REMAINING_ISSUES A1~A12)
- 추가 보안 강화 (S1~S9 중 Phase 0 제외 항목)
- 타입 안전성 개선 (T1~T8), 네이밍 일관성 정리 (N1~N7)
- 테스트 커버리지 확대 (C1~C7)
- 4대 모놀리스 외 추가 파일 크기 축소 (L1~L8)

## Components

| 컴포넌트 | 현재 줄 수 | 목표 줄 수 | Phase |
|----------|-----------|-----------|-------|
| `src/spec-viewer/spec-viewer-panel.tsx` | 2,246 | ~1,200 | Phase 1 |
| `electron/main.ts` | 3,511 | ~800 | Phase 2 |
| `src/App.tsx` | 2,627 | ~800 | Phase 3 |
| `src/workspace/workspace-context.tsx` | 3,677 | ~800 | Phase 4 |

## Contract/Invariant Delta Coverage

| Delta ID | 설명 | Planned Tasks | Validation Link |
|----------|------|---------------|-----------------|
| C1 | IPC 인터페이스 유지 (`workspace:*` 채널 시그니처 불변) | T2-0, T2-3, T2-4, T2-5, T2-6, T4-4, T4-5 | V1, V5, V6 |
| C2 | export 시그니처 유지 (분할 후 public export 호환) | T1-1~T1-5, T2-1~T2-5, T3-1~T3-4, T4-1~T4-6 | V1, V2, V4 |
| C3 | WorkspaceContextValue 인터페이스 유지 (40+ props 그대로) | T4-0~T4-6 | V1, V4, V6 |
| C4 | Phase 0 수정은 동작 보존 (방어 로직 추가만, 정상 경로 불변) | T0-1~T0-17 | V1, V7 |
| I1 | 분할 후 모듈 간 순환 참조 금지 | T1-1~T1-5, T2-1~T2-5, T3-1~T3-4, T4-1~T4-6 | V2, V3 |
| I2 | Electron preload sandbox 제약 준수 (`ipc-types.ts` 순수 타입만) | T2-0 | V1, V5 |

---

## Implementation Phases

| Phase | 이름 | 선행 조건 | Task 수 | 예상 파일 변경 |
|-------|------|----------|---------|--------------|
| 0 | Quick Fixes | 없음 | 17 | ~11 파일 수정 |
| 1 | spec-viewer-panel.tsx 분할 | Phase 0 완료 | 5 | 1 수정 + 4 생성 + 3 수정(중복 통합) |
| 2 | main.ts 분할 | Phase 1 완료 | 7 | 2 수정(main.ts, preload.ts) + 6 생성 |
| 3 | App.tsx 분할 | Phase 2 완료 | 4 | 1 수정 + 4 생성 |
| 4 | workspace-context.tsx 분할 | Phase 3 완료 | 7 | 1 수정 + 7 생성 |

---

## Phase 0: Quick Fixes

**Goal**: 보안 5건 + 버그 6건 + 정리 6건 즉시 수정하여 이후 분할 작업의 안정적 base 확보

**Task Set / Dependency Closure**: T0-1~T0-17 (모든 task 독립, 병렬 가능). 다만 동일 파일 수정 task는 순차 실행 권장 (T0-6/T0-11/T0-17은 workspace-context.tsx 공유, T0-7/T0-8은 code-editor-panel.tsx 공유, T0-3/T0-10/T0-16은 file-tree-panel.tsx 공유, T0-2/T0-9는 bootstrap.ts 공유).

**Validation Focus**: V1 (npm test), V7 (Phase 0 수동 검증 -- 보안 수정은 차단 동작 확인, 버그 수정은 정상 경로 불변 확인)

**Exit Criteria**:
- [ ] 17건 전체 수정 완료
- [ ] `npm test` 전체 통과 (V1)
- [ ] `npm run lint` 통과 (V2)
- [ ] `npm run dev`로 기본 동작 확인: 워크스페이스 열기, 파일 선택, 스펙 보기, 코멘트 CRUD (V6)
- [ ] 각 보안 수정의 방어 동작 수동 확인 (V7)
- [ ] C4 검증: 기존 정상 경로 동작 불변

**Carry-over Policy**: None (critical/high/medium 이슈는 exit blocker)

---

### Task T0-1: copy-ops.ts startsWith 경로 비교를 안전한 함수로 교체
**Component**: electron/remote-agent/runtime
**Priority**: P0
**Type**: Bug (Security)

**Description**: `copy-ops.ts:58`에서 `normalizedDest.startsWith(normalizedRoot)` 경로 비교가 `/workspace-root-extra/` 같은 접두사 일치 false positive를 허용한다. `isPathInsideWorkspace` 또는 `path.resolve` + trailing separator 비교로 교체한다.

**Acceptance Criteria**:
- [ ] `startsWith` 대신 `path.resolve(normalizedRoot) + path.sep` 접두사 비교 또는 동등한 안전한 비교 사용
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/remote-agent/runtime/copy-ops.ts` -- L58 경로 비교 교체

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R3-F12. 관련 테스트: `electron/remote-agent/runtime/copy-ops.test.ts`
**Dependencies**: 없음

---

### Task T0-2: bootstrap.ts heredoc 마커 충돌 검증 테스트 추가
**Component**: electron/remote-agent
**Priority**: P0
**Type**: Test (Security)

**Description**: `bootstrap.ts:144`에서 `__SDD_REMOTE_AGENT__` heredoc 마커가 `REMOTE_AGENT_RUNTIME_PAYLOAD` 내용에 포함되면 인젝션 위험. 빌드 시 마커 포함 여부를 검증하는 테스트를 추가한다.

**Acceptance Criteria**:
- [ ] 런타임 페이로드에 heredoc 마커 문자열이 포함되지 않음을 검증하는 테스트 추가
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/remote-agent/bootstrap.ts` -- 또는 테스트 파일에 검증 추가
- [M] `electron/remote-agent/bootstrap.test.ts` -- heredoc 마커 충돌 검증 테스트

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R3-F2
**Dependencies**: 없음

---

### Task T0-3: file-tree-panel.tsx 파일명 검증 강화
**Component**: src/file-tree
**Priority**: P0
**Type**: Bug (Security)

**Description**: `file-tree-panel.tsx:432` `validateInlineInputName` 함수가 `/`만 차단하고 `\`, NUL(`\0`), 기타 제어문자를 허용한다. 추가 차단 규칙을 적용한다.

**Acceptance Criteria**:
- [ ] `\` (백슬래시), NUL 문자(`\0`), ASCII 제어문자(0x00~0x1F) 차단
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- L432 `validateInlineInputName` 함수 수정

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R7-F1. 관련 테스트: `src/file-tree/file-tree-panel.test.tsx`
**Dependencies**: 없음

---

### Task T0-4: markdown-security.ts span style CSS 속성 allowlist 도입
**Component**: src/spec-viewer
**Priority**: P0
**Type**: Bug (Security)

**Description**: `markdown-security.ts:88`에서 `span`에 `style` 속성을 무제한 허용한다. CSS 속성 allowlist를 도입하거나, 허용된 속성만 통과시키는 필터를 추가한다.

**Acceptance Criteria**:
- [ ] `style` 속성에 허용된 CSS 속성(예: `color`, `background-color`, `font-weight`)만 통과
- [ ] 또는 `style` 속성을 완전히 제거하고 `className` 기반으로 전환
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/spec-viewer/markdown-security.ts` -- L88 span style 관련 sanitize 규칙 수정

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R4-F6. 관련 테스트: `src/spec-viewer/markdown-security.test.ts`
**Dependencies**: 없음

---

### Task T0-5: file-clipboard.ts destAbsolute 경로 탈출 검증 추가
**Component**: electron
**Priority**: P0
**Type**: Bug (Security)

**Description**: `file-clipboard.ts:91` `pasteFinderFiles`에서 `destAbsolute`가 `rootPath` 외부를 가리킬 때 검증이 없다. 경로 탈출 검증을 추가한다.

**Acceptance Criteria**:
- [ ] `destAbsolute`가 `rootPath` 내부인지 검증하는 로직 추가
- [ ] `rootPath` 외부 대상 시 에러 반환
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/file-clipboard.ts` -- L91 이후 destAbsolute 경로 검증 추가

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R8-F2. 관련 테스트: `electron/file-clipboard.test.ts`
**Dependencies**: 없음

---

### Task T0-6: workspace-context.tsx 무한 루프 위험 최대 반복 횟수 추가
**Component**: src/workspace
**Priority**: P0
**Type**: Bug

**Description**: `workspace-context.tsx:2854`에 `while (true)` 무한 루프 위험이 있다. 최대 반복 횟수를 추가하여 방어한다.

**Acceptance Criteria**:
- [ ] `while (true)` 루프에 최대 반복 횟수 (예: 100회) guard 추가
- [ ] 초과 시 경고 로그 출력 후 break
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- L2854 `while (true)` 루프에 guard 추가

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R2-F12
**Dependencies**: 없음

---

### Task T0-7: code-editor-panel.tsx rAF cancelAnimationFrame cleanup 추가
**Component**: src/code-editor
**Priority**: P0
**Type**: Bug

**Description**: `code-editor-panel.tsx:699`에서 `requestAnimationFrame`으로 스크롤 복원을 하지만, 컴포넌트 언마운트 시 `cancelAnimationFrame` cleanup이 없다.

**Acceptance Criteria**:
- [ ] `requestAnimationFrame` 반환값을 저장하고 cleanup에서 `cancelAnimationFrame` 호출
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx` -- L699 rAF cleanup 추가

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R6-F2. 관련 테스트: `src/code-editor/code-editor-panel.test.tsx`
**Dependencies**: 없음

---

### Task T0-8: code-editor-panel.tsx getCM6Language reject try-catch 추가
**Component**: src/code-editor
**Priority**: P0
**Type**: Bug

**Description**: `code-editor-panel.tsx:646`에서 `getCM6Language(activeFile)` await가 reject될 경우 처리되지 않는다. try-catch를 추가한다.

**Acceptance Criteria**:
- [ ] `getCM6Language` 호출을 try-catch로 감싸고, reject 시 fallback (언어 지원 없이 진행)
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx` -- L646 `getCM6Language` try-catch 추가

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R6-F7. 관련 테스트: `src/code-editor/code-editor-panel.test.tsx`
**Dependencies**: 없음 (T0-7과 동일 파일이므로 순차 실행 권장)

---

### Task T0-9: bootstrap.ts ExecFileException.code 타입 분기 추가
**Component**: electron/remote-agent
**Priority**: P0
**Type**: Bug

**Description**: `bootstrap.ts:265` `getNumericExitCode` 함수에서 `error.code`가 `number` 타입만 체크하는데, 실제로 `error.status`가 numeric exit code를 가진다. `error.status` 분기를 추가한다.

**Acceptance Criteria**:
- [ ] `error.status` (number) fallback 분기 추가
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/remote-agent/bootstrap.ts` -- L265 `getNumericExitCode` 함수에 `error.status` 분기 추가

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R3-F3. 관련 테스트: `electron/remote-agent/bootstrap.test.ts`
**Dependencies**: 없음 (T0-2와 동일 파일이므로 순차 실행 권장)

---

### Task T0-10: file-tree-panel.tsx CRUD 콜백 에러 미처리 수정
**Component**: src/file-tree
**Priority**: P0
**Type**: Bug

**Description**: `file-tree-panel.tsx:768` `submitInlineInput` 콜백에서 `onRequestCreate`/`onRequestRename` 호출의 에러가 처리되지 않는다. `.catch()` 추가.

**Acceptance Criteria**:
- [ ] CRUD 콜백 호출에 `.catch()` 또는 try-catch 추가
- [ ] 에러 시 사용자에게 인라인 에러 표시
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- L768 `submitInlineInput` 콜백에 에러 처리 추가

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R7-F2. 관련 테스트: `src/file-tree/file-tree-panel.test.tsx`
**Dependencies**: 없음 (T0-3과 동일 파일이므로 순차 실행 권장)

---

### Task T0-11: workspace-context.tsx watcher 레이스 컨디션 수정
**Component**: src/workspace
**Priority**: P0
**Type**: Bug

**Description**: `workspace-context.tsx:3383` `suppressSavedActiveFileRefresh` 플래그가 `setWorkspaceState` 업데이터 외부에서 읽혀 레이스 컨디션이 발생할 수 있다. 업데이터 내부로 이동한다.

**Acceptance Criteria**:
- [ ] `suppressSavedActiveFileRefresh` 검사를 `setWorkspaceState` 업데이터 함수 내부로 이동
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- L3380~3383 suppressSavedActiveFileRefresh 로직 이동

**Technical Notes**: Delta C4, Validation V1/V7. 출처: R2-F4
**Dependencies**: 없음 (T0-6과 동일 파일이므로 순차 실행 권장)

---

### Task T0-12: main.ts main-process-message 데드 코드 삭제
**Component**: electron
**Priority**: P1
**Type**: Refactor

**Description**: `main.ts:3435-3438`에 Vite 템플릿에서 남은 `main-process-message` 데드 코드를 삭제한다.

**Acceptance Criteria**:
- [ ] L3435~3438 (`win.webContents.on('did-finish-load', ...)`) 블록 삭제
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/main.ts` -- L3435-3438 데드 코드 삭제 (3줄)

**Technical Notes**: Delta C4, Validation V1/V2. 출처: R1-F5
**Dependencies**: 없음

---

### Task T0-13: watch-ops.ts 죽은 삼항 조건 단순화
**Component**: electron/remote-agent/runtime
**Priority**: P1
**Type**: Refactor

**Description**: `watch-ops.ts:236`에서 삼항 조건의 양쪽 분기가 모두 `DEFAULT_POLL_INTERVAL_MS`를 반환한다. 단순화한다.

**Acceptance Criteria**:
- [ ] 삼항 조건을 `DEFAULT_POLL_INTERVAL_MS` 직접 대입으로 단순화
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/remote-agent/runtime/watch-ops.ts` -- L235-238 삼항 조건 단순화

**Technical Notes**: Delta C4, Validation V1/V2. 출처: R3-F13. 관련 테스트: `electron/remote-agent/runtime/watch-ops.test.ts`
**Dependencies**: 없음

---

### Task T0-14: security.ts MAX_REDATED 오타 수정
**Component**: electron/remote-agent
**Priority**: P1
**Type**: Refactor

**Description**: `security.ts:37` `MAX_REDATED_MESSAGE_LENGTH` -> `MAX_REDACTED_MESSAGE_LENGTH` 오타 rename.

**Acceptance Criteria**:
- [ ] `MAX_REDATED` -> `MAX_REDACTED` rename (파일 내 모든 참조)
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/remote-agent/security.ts` -- L37 `MAX_REDATED_MESSAGE_LENGTH` rename

**Technical Notes**: Delta C4, Validation V1/V2. 출처: R3-F14. 관련 테스트: `electron/remote-agent/security.test.ts`
**Dependencies**: 없음

---

### Task T0-15: cm6-dark-theme.ts darkTheme 미사용 별칭 확인 후 제거
**Component**: src/code-editor
**Priority**: P2
**Type**: Refactor

**Description**: `cm6-dark-theme.ts:185` `export const darkTheme = darkGrayTheme` 별칭이 사용되지 않으면 제거한다. 사용 중이면 유지하고 주석을 추가한다.

**Acceptance Criteria**:
- [ ] `darkTheme` export의 import site를 확인
- [ ] 미사용이면 제거, 사용 중이면 import site를 `darkGrayTheme`으로 변경 후 별칭 제거
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/code-editor/cm6-dark-theme.ts` -- L185 별칭 확인 및 제거

**Technical Notes**: Delta C4, Validation V1/V2. 출처: R6-F10
**Dependencies**: 없음

---

### Task T0-16: file-tree-panel.tsx isExpanded 중복 체크 제거
**Component**: src/file-tree
**Priority**: P2
**Type**: Refactor

**Description**: `file-tree-panel.tsx:318-320`에서 `isExpanded`가 이미 조건으로 사용된 후 내부에서 다시 `isExpanded &&`로 중복 체크된다. 내부 중복을 제거한다.

**Acceptance Criteria**:
- [ ] L320 `isExpanded && (` 를 제거하여 중복 조건 해소
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- L318-320 isExpanded 중복 제거

**Technical Notes**: Delta C4, Validation V1/V2. 출처: R7-F10. 관련 테스트: `src/file-tree/file-tree-panel.test.tsx`
**Dependencies**: 없음 (T0-3, T0-10과 동일 파일이므로 순차 실행 권장)

---

### Task T0-17: workspace-context.tsx hydrateExpandedDirectories/refreshWorkspaceDirectories 통합
**Component**: src/workspace
**Priority**: P2
**Type**: Refactor

**Description**: `workspace-context.tsx:2965` `hydrateExpandedDirectories`와 유사 기능의 `refreshWorkspaceDirectories`를 하나로 통합한다.

**Acceptance Criteria**:
- [ ] 두 함수의 동작 차이를 분석하고 단일 함수로 통합
- [ ] 기존 호출 site를 통합 함수로 변경
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- L2965 부근 중복 함수 통합

**Technical Notes**: Delta C4, Validation V1/V2. 출처: R2-F10. Phase 4 T4-6 (스냅샷 hook 추출) 시 이 통합 결과가 그대로 이동되므로 Phase 0에서 선행해야 함
**Dependencies**: 없음 (T0-6, T0-11과 동일 파일이므로 순차 실행 권장)

---

## Phase 1: spec-viewer-panel.tsx 분할

**Goal**: `spec-viewer-panel.tsx` 2,246줄에서 모듈 레벨 헬퍼 ~755줄을 추출하여 컴포넌트 본체 ~1,200줄로 축소

**Task Set / Dependency Closure**:
- T1-1, T1-2: 병렬 가능 (서로 다른 라인 범위, 파일 겹침 없음)
- T1-3, T1-4: T1-1/T1-2 이후 (남은 함수 정리)
- T1-5: 마지막 (중복 통합, spec-viewer 모듈 간)
- 선행조건: Phase 0 완료 (T0-3, T0-16이 file-tree-panel.tsx를 수정하므로 spec-viewer와 직접 충돌은 없으나, Phase 순서 엄수)

**Validation Focus**: V3 (순환 참조 검증), V4 (export 시그니처 불변)

**Exit Criteria**:
- [ ] `spec-viewer-panel.tsx`가 ~1,200줄 이하로 축소
- [ ] 4개 신규 파일 생성 완료
- [ ] `npm test` 전체 통과 (V1) -- 특히 `spec-viewer-panel.test.tsx` 통과
- [ ] `npm run lint` 통과 (V2)
- [ ] 순환 참조 없음 확인 (V3)
- [ ] 기존 import site에서 타입 에러 없음 (V4, C2)
- [ ] `npm run dev`로 스펙 뷰어 동작 확인 (V6)
- [ ] I1 검증: 추출된 모듈 간 import가 단방향

**Carry-over Policy**: None (critical/high/medium 이슈는 exit blocker)

---

### Task T1-1: 코멘트 마커 매핑 로직 추출
**Component**: src/spec-viewer
**Priority**: P0
**Type**: Refactor

**Description**: `spec-viewer-panel.tsx` L322-702 (~380줄)의 코멘트 카운트 매핑 순수 함수 블록을 별도 파일로 추출한다. `areLineCountMapsEqual`(L322)부터 `mapCommentCountsToRenderedSourceLines` 반환(L702)까지.

**Acceptance Criteria**:
- [ ] `spec-viewer-comment-markers.ts`에 모든 관련 함수 이동
- [ ] `spec-viewer-panel.tsx`에서 import로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- L322-702 제거, import 추가
- [C] `src/spec-viewer/spec-viewer-comment-markers.ts` -- `areLineCountMapsEqual`, `mapCommentCountsToRenderedSourceLines` 등 순수 함수

**Technical Notes**: Delta C2, I1. Validation V1, V3, V4. 가장 큰 추출 블록 (~380줄). 관련 테스트: `src/spec-viewer/spec-viewer-panel.test.tsx`
**Dependencies**: Phase 0 완료

---

### Task T1-2: HighlightedCodeBlock 컴포넌트 추출
**Component**: src/spec-viewer
**Priority**: P0
**Type**: Refactor

**Description**: `spec-viewer-panel.tsx` L768-982 (~215줄)의 `renderHighlightedCodeLineWithCitationMatches` 및 관련 코드 블록 렌더링 로직을 별도 파일로 추출한다.

**Acceptance Criteria**:
- [ ] `highlighted-code-block.tsx`에 모든 관련 함수/컴포넌트 이동
- [ ] 필요한 타입(`HighlightLineToken`, `CodeBlockCitationMatch` 등) import 정리
- [ ] `spec-viewer-panel.tsx`에서 import로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- L768-982 제거, import 추가
- [C] `src/spec-viewer/highlighted-code-block.tsx` -- 코드 블록 렌더링 로직

**Technical Notes**: Delta C2, I1. Validation V1, V3, V4. 관련 테스트: `src/spec-viewer/spec-viewer-panel.test.tsx`
**Dependencies**: Phase 0 완료 (T1-1과 병렬 가능)

---

### Task T1-3: heading scroll 헬퍼 추출 및 중복 통합
**Component**: src/spec-viewer
**Priority**: P1
**Type**: Refactor

**Description**: `spec-viewer-panel.tsx`에서 `handleMarkdownLinkClick`(L1417) 내부와 `handleTocLinkClick`(L1679) 내부에 heading ID -> DOM element 찾기 -> scrollIntoView 패턴이 중복된다. 공통 `scrollToHeadingById(container, headingId)` 함수를 추출한다.

**Acceptance Criteria**:
- [ ] `spec-viewer-scroll.ts`에 공통 스크롤 헬퍼 생성
- [ ] 두 콜백에서 공통 헬퍼 호출로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- L1417 부근 + L1679 부근 스크롤 로직을 헬퍼 호출로 교체
- [C] `src/spec-viewer/spec-viewer-scroll.ts` -- `scrollToHeadingById` 등 (~60줄)

**Technical Notes**: Delta C2, I1. Validation V1, V3, V6. 컴포넌트 내부 useCallback 안에서 호출하므로, 추출 대상은 순수 DOM 조작 로직만
**Dependencies**: T1-1, T1-2 (라인 오프셋 변경 후 정확한 위치 확인 필요)

---

### Task T1-4: 기타 순수 헬퍼 함수 추출
**Component**: src/spec-viewer
**Priority**: P1
**Type**: Refactor

**Description**: T1-1~T1-3 완료 후 남은 모듈 레벨 순수 함수(`containsSelectionNode`(L704), `getCommentSourceLineKeys`(L756) 등)를 추출한다.

**Acceptance Criteria**:
- [ ] `spec-viewer-helpers.ts`에 남은 순수 함수 이동 (~100줄)
- [ ] `spec-viewer-panel.tsx`에서 import로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- L704-766 등 나머지 순수 함수 제거
- [C] `src/spec-viewer/spec-viewer-helpers.ts` -- `containsSelectionNode`, `getCommentSourceLineKeys` 등

**Technical Notes**: Delta C2, I1. Validation V1, V3, V4
**Dependencies**: T1-1, T1-2 (라인 오프셋 변경 후)

---

### Task T1-5: spec-viewer 모듈 간 중복 통합
**Component**: src/spec-viewer
**Priority**: P1
**Type**: Refactor

**Description**: spec-viewer 디렉토리 내 모듈 간 중복을 통합한다:
1. `getElementDepth`: `spec-viewer-panel.tsx`(L409)과 `source-line-resolver.ts`(L317)에 동일 함수 존재. `source-line-resolver.ts`에서만 export하고 `spec-viewer-panel.tsx`에서 import
2. `BRACKET_CITATION_PATTERN`: `remark-citation-links.ts`(L25)와 `code-block-citation.ts`(L11)에 동일 정규식 존재. `code-block-citation.ts`에서 export, `remark-citation-links.ts`에서 import (또는 별도 공유 파일)
3. `IDENTIFIER_PATTERN` + `QUALIFIED_NAME_PATTERN`: `citation-target.ts`(L22-25)와 `python-symbol-resolver.ts`(L22-25)에 동일. `citation-target.ts`에서 export, `python-symbol-resolver.ts`에서 import

**Acceptance Criteria**:
- [ ] 각 중복 항목이 단일 canonical 위치에서만 정의
- [ ] 기존 import site가 canonical 위치에서 import
- [ ] 기존 테스트 전체 통과

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- `getElementDepth` 제거, `source-line-resolver.ts`에서 import
- [M] `src/spec-viewer/source-line-resolver.ts` -- `getElementDepth` export 추가
- [M] `src/spec-viewer/code-block-citation.ts` -- `BRACKET_CITATION_PATTERN` export 추가
- [M] `src/spec-viewer/remark-citation-links.ts` -- `BRACKET_CITATION_PATTERN` 제거, `code-block-citation.ts`에서 import
- [M] `src/spec-viewer/citation-target.ts` -- `IDENTIFIER_PATTERN`, `QUALIFIED_NAME_PATTERN` export 추가
- [M] `src/spec-viewer/python-symbol-resolver.ts` -- 중복 정규식 제거, `citation-target.ts`에서 import

**Technical Notes**: Delta C2, I1. Validation V1, V2, V3. 관련 테스트: `source-line-resolver.test.ts`, `code-block-citation.test.ts`, `remark-citation-links.test.ts`, `citation-target.test.ts`, `python-symbol-resolver.test.ts`
**Dependencies**: T1-1 (spec-viewer-panel.tsx에서 getElementDepth 제거 시점)

---

## Phase 2: main.ts 분할

**Goal**: `main.ts` 3,511줄에서 관심사별 6개 파일을 분리하여 본체 ~800줄로 축소

**Task Set / Dependency Closure**:
- T2-0: 전제조건 (IPC 타입 공유 모듈, 다른 모든 task가 의존)
- T2-1: T2-0 이후 (유틸리티 -- 다른 추출 모듈이 import하는 공유 유틸)
- T2-2, T2-3, T2-4: T2-1 이후 병렬 가능 (서로 다른 관심사, workspace-utils.ts를 import)
- T2-5: T2-3 이후 (routed 핸들러가 direct 핸들러 참조)
- T2-6: 마지막 (IPC 등록 테이블화, 모든 핸들러 추출 완료 후)
- 선행조건: Phase 1 완료

**Validation Focus**: V5 (IPC surface 불변 -- `preload.ts`의 `contextBridge.exposeInMainWorld` 호출이 동일 API surface 유지), I2 (preload sandbox 준수)

**Exit Criteria**:
- [ ] `main.ts`가 ~800줄 이하로 축소
- [ ] 6개 신규 파일 생성 완료 + `preload.ts` 수정
- [ ] `npm test` 전체 통과 (V1)
- [ ] `npm run lint` 통과 (V2)
- [ ] 순환 참조 없음 확인 (V3)
- [ ] `preload.ts` API surface 불변 확인 (V5, C1)
- [ ] `npm run build` 성공 -- preload sandbox 빌드 호환 (V5, I2)
- [ ] `npm run dev`로 전체 동작 확인 (V6)
- [ ] I1 검증: 추출된 모듈 간 import가 단방향

**Carry-over Policy**: None (critical/high/medium 이슈는 exit blocker)

---

### Task T2-0: IPC 타입 공유 모듈 생성 (전제조건)
**Component**: electron
**Priority**: P0
**Type**: Infrastructure

**Description**: `main.ts` L100-424 (~325줄)의 타입 정의를 `electron/ipc-types.ts`로 이동하고, `preload.ts`의 ~49개 중복 타입 정의도 통합한다. 순수 타입만 포함하여 preload sandbox 제약을 회피한다.

**Acceptance Criteria**:
- [ ] `ipc-types.ts`에 main.ts + preload.ts 공유 타입 통합
- [ ] `main.ts`에서 타입 정의 제거, `import type` 사용
- [ ] `preload.ts`에서 중복 타입 정의 제거, `import type` 사용
- [ ] `npm run build` 성공 (preload sandbox 빌드 호환)
- [ ] 기존 테스트 통과

**Target Files**:
- [C] `electron/ipc-types.ts` -- 공유 타입 정의 (~325줄 + preload 중복 통합)
- [M] `electron/main.ts` -- L100-424 타입 정의 제거, `import type` 추가
- [M] `electron/preload.ts` -- 중복 타입 정의 제거, `import type` 추가

**Technical Notes**: Delta C1, I2. Validation V1, V4, V5. `type` import만 사용하면 빌드 시 제거되므로 런타임 영향 없음. preload sandbox에서 Node.js 모듈 의존 금지
**Dependencies**: Phase 1 완료

---

### Task T2-1: 유틸리티 함수 추출
**Component**: electron
**Priority**: P0
**Type**: Refactor

**Description**: `main.ts` L492-719 (~228줄)의 유틸리티 함수를 추출한다. `normalizeToWorkspaceRelativePath`, `hasIgnoredWorkspaceSegment`, `writeFileAtomic`, `ensurePathWithinWorkspace` 등. 다른 추출 모듈에서 import하는 공유 유틸이므로 먼저 추출한다.

**Acceptance Criteria**:
- [ ] `workspace-utils.ts`에 유틸리티 함수 이동
- [ ] `main.ts`에서 import로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/main.ts` -- L492-719 제거, import 추가
- [C] `electron/workspace-utils.ts` -- 유틸리티 함수 (~228줄)

**Technical Notes**: Delta C2, I1. Validation V1, V3. `WORKSPACE_INDEX_IGNORE_NAMES`(L427) 등 관련 상수도 함께 이동
**Dependencies**: T2-0

---

### Task T2-2: 파일 트리 인덱싱 추출
**Component**: electron
**Priority**: P1
**Type**: Refactor

**Description**: `main.ts` L720-957 (~237줄)의 파일 트리 인덱싱 로직을 추출한다. `BuildWorkspaceTreeResult`, `buildWorkspaceTree` 등.

**Acceptance Criteria**:
- [ ] `workspace-indexing.ts`에 인덱싱 로직 이동
- [ ] `workspace-utils.ts`에서 `hasIgnoredWorkspaceSegment` 등 import
- [ ] `main.ts`에서 import로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/main.ts` -- L720-957 제거, import 추가
- [C] `electron/workspace-indexing.ts` -- 파일 트리 인덱싱 (~237줄)

**Technical Notes**: Delta C2, I1. Validation V1, V3
**Dependencies**: T2-1 (workspace-utils.ts 의존)

---

### Task T2-3: IPC 핸들러 추출
**Component**: electron
**Priority**: P1
**Type**: Refactor

**Description**: `main.ts` L959-2010 (~1,051줄)의 직접 IPC 핸들러를 추출한다. `handleWorkspaceIndexDirectory`, `handleWorkspaceReadFile`, `handleWorkspaceWriteFile` 등 가장 큰 추출 블록.

**Acceptance Criteria**:
- [ ] `workspace-ipc-handlers.ts`에 직접 IPC 핸들러 이동
- [ ] `workspace-utils.ts`, `workspace-indexing.ts`에서 import
- [ ] `main.ts`에서 import로 교체
- [ ] IPC 인터페이스(채널 시그니처) 불변 확인
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/main.ts` -- L959-2010 제거, import 추가
- [C] `electron/workspace-ipc-handlers.ts` -- 직접 IPC 핸들러 (~1,051줄)

**Technical Notes**: Delta C1, C2, I1. Validation V1, V3, V5. `win` (BrowserWindow)이 필요한 핸들러는 함수 인자로 받는 패턴 사용
**Dependencies**: T2-1 (workspace-utils.ts 의존), T2-2와 병렬 가능

---

### Task T2-4: 파일 시스템 워칭 추출
**Component**: electron
**Priority**: P1
**Type**: Refactor

**Description**: `main.ts` L2033-2528 (~495줄)의 파일 시스템 워칭 로직을 추출한다. `sendWorkspaceWatchEvent`, chokidar 워처 관리, `stopAllWorkspaceWatchers` 등.

**Acceptance Criteria**:
- [ ] `workspace-watchers.ts`에 워칭 로직 이동
- [ ] `win` (BrowserWindow) 참조를 초기화 시 주입하는 패턴 사용
- [ ] `main.ts`에서 import로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/main.ts` -- L2033-2528 제거, import 추가
- [C] `electron/workspace-watchers.ts` -- 파일 시스템 워칭 (~495줄)

**Technical Notes**: Delta C1, C2, I1. Validation V1, V3, V5
**Dependencies**: T2-1 (workspace-utils.ts 의존), T2-2/T2-3과 병렬 가능

---

### Task T2-5: Routed 핸들러 + 라우터 추출
**Component**: electron
**Priority**: P1
**Type**: Refactor

**Description**: `main.ts` L2646-2974 (~328줄)의 `localWorkspaceBackend`, routed 핸들러 18개, `workspaceBackendRouter`를 추출한다.

**Acceptance Criteria**:
- [ ] `workspace-ipc-routing.ts`에 routed 핸들러 + 라우터 이동
- [ ] `workspace-ipc-handlers.ts`에서 direct 핸들러 import
- [ ] `DUMMY_IPC_EVENT` 패턴 포함 (향후 제거 대상으로 TODO 주석)
- [ ] `main.ts`에서 import로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `electron/main.ts` -- L2646-2974 제거, import 추가
- [C] `electron/workspace-ipc-routing.ts` -- routed 핸들러 + 라우터 (~328줄)

**Technical Notes**: Delta C1, C2, I1. Validation V1, V3, V5. `DUMMY_IPC_EVENT`(L2646)는 향후 T1(타입 안전성 -- POST_SPLIT_REMAINING_ISSUES) 항목으로 제거 예정
**Dependencies**: T2-3 (direct 핸들러 참조)

---

### Task T2-6: IPC 등록 테이블화
**Component**: electron
**Priority**: P2
**Type**: Refactor

**Description**: `main.ts`의 `registerIpcHandlers` 함수 내부에서 30쌍 반복되는 `ipcMain.handle(channel, handler)` 호출을 채널-핸들러 맵 객체 + 루프 등록으로 전환한다. 채널 이름 문자열 리터럴을 `ipc-types.ts`에 상수로 관리한다.

**Acceptance Criteria**:
- [ ] `const IPC_HANDLER_MAP = { ... }` + `Object.entries` 루프로 등록 전환
- [ ] 채널 이름 상수를 `ipc-types.ts`에 정의
- [ ] IPC 인터페이스(채널 시그니처) 불변 확인
- [ ] 기존 테스트 통과, `npm run dev`로 전체 동작 확인

**Target Files**:
- [M] `electron/main.ts` -- `registerIpcHandlers` 내부 리팩토링
- [M] `electron/ipc-types.ts` -- IPC 채널 이름 상수 추가
- [M] `electron/workspace-ipc-handlers.ts` -- 핸들러 맵 export (선택)
- [M] `electron/workspace-ipc-routing.ts` -- routed 핸들러 맵 export (선택)

**Technical Notes**: Delta C1. Validation V1, V5, V6. 모든 핸들러 추출이 완료된 후 수행
**Dependencies**: T2-0, T2-1, T2-2, T2-3, T2-4, T2-5 (모든 핸들러 추출 완료 후)

---

## Phase 3: App.tsx 분할

**Goal**: `App.tsx` 2,627줄에서 4개 custom hook을 추출하여 본체 ~800줄로 축소

**Task Set / Dependency Closure**:
- T3-1, T3-3, T3-4: 병렬 가능 (서로 다른 라인 범위)
- T3-2: T3-1 이후 (L1467-1982 범위가 T3-1의 L669-1237 이후에 위치하며, 라인 오프셋 조정 필요)
- 선행조건: Phase 2 완료

**Validation Focus**: V6 (스모크 테스트 -- 코멘트 CRUD, 네비게이션, 외부 앱 열기, 리사이즈 모두 확인)

**Exit Criteria**:
- [ ] `App.tsx`가 ~800줄 이하로 축소
- [ ] `src/hooks/` 디렉토리에 4개 hook 파일 생성
- [ ] `npm test` 전체 통과 (V1) -- 특히 `App.test.tsx` 통과
- [ ] `npm run lint` 통과 (V2)
- [ ] 순환 참조 없음 확인 (V3)
- [ ] `npm run dev`로 전체 동작 확인: 코멘트 CRUD, 히스토리 네비게이션, 외부 앱 열기, 패널 리사이즈 (V6)
- [ ] C2 검증: App.tsx의 기존 export 유지

**Carry-over Policy**: None (critical/high/medium 이슈는 exit blocker)

---

### Task T3-1: useCommentActions hook 추출
**Component**: src/hooks (신규 디렉토리)
**Priority**: P0
**Type**: Refactor

**Description**: `App.tsx` L669-1237 (~560줄)의 코멘트 CRUD + 내보내기 로직을 custom hook으로 추출한다. `handleCopyRelativePath`(L669)부터 `handleDeleteExportedComments`(L1237)까지.

**Acceptance Criteria**:
- [ ] `use-comment-actions.ts`에 코멘트 관련 핸들러 모두 이동
- [ ] hook이 `activeWorkspaceId`, `comments`, `saveComments`, `showCommentBanner` 등을 인자로 받음
- [ ] `App.tsx`에서 hook 호출로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/App.tsx` -- L669-1237 제거, hook import 추가
- [C] `src/hooks/use-comment-actions.ts` -- 코멘트 CRUD + 내보내기 (~560줄)

**Technical Notes**: Delta C2, I1. Validation V1, V3, V6. 가장 큰 추출 블록. 관련 테스트: `src/App.test.tsx`
**Dependencies**: Phase 2 완료

---

### Task T3-2: useHistoryNavigation hook 추출
**Component**: src/hooks
**Priority**: P0
**Type**: Refactor

**Description**: `App.tsx` L1467-1982 (~510줄)의 코드 뷰어 jump 요청, 히스토리 네비게이션, 키보드/휠 이벤트 핸들링 로직을 custom hook으로 추출한다.

**Acceptance Criteria**:
- [ ] `use-history-navigation.ts`에 네비게이션 관련 핸들러 모두 이동
- [ ] `jumpRequestTokenRef`, `navigateHistory`, `canGoBack`, `canGoForward` 등 상태/참조 포함
- [ ] `App.tsx`에서 hook 호출로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/App.tsx` -- L1467-1982 제거, hook import 추가
- [C] `src/hooks/use-history-navigation.ts` -- 네비게이션/히스토리 (~510줄)

**Technical Notes**: Delta C2, I1. Validation V1, V3, V6. 관련 테스트: `src/App.test.tsx`
**Dependencies**: T3-1 (라인 오프셋 변경 후 정확한 위치 확인 필요. T3-1에서 ~560줄 제거 후 L1467이 ~L907로 이동)

---

### Task T3-3: useExternalAppOpener hook 추출
**Component**: src/hooks
**Priority**: P1
**Type**: Refactor

**Description**: `App.tsx` L1239-1383 (~140줄)의 iTerm, VSCode, Finder 열기 + 원격 재시도 로직을 custom hook으로 추출한다.

**Acceptance Criteria**:
- [ ] `use-external-app-opener.ts`에 외부 앱 관련 핸들러 이동
- [ ] `App.tsx`에서 hook 호출로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/App.tsx` -- L1239-1383 제거, hook import 추가
- [C] `src/hooks/use-external-app-opener.ts` -- 외부 앱 열기 (~140줄)

**Technical Notes**: Delta C2, I1. Validation V1, V3. 관련 테스트: `src/App.test.tsx`
**Dependencies**: Phase 2 완료 (T3-1과 병렬 가능)

---

### Task T3-4: usePaneResize hook 추출
**Component**: src/hooks
**Priority**: P1
**Type**: Refactor

**Description**: `App.tsx` L1385-1465 (~80줄)의 3-pane 리사이즈 핸들 드래그 로직을 custom hook으로 추출한다.

**Acceptance Criteria**:
- [ ] `use-pane-resize.ts`에 리사이즈 관련 로직 이동
- [ ] `activeResizeHandle`, `paneSizes` 상태 포함
- [ ] `App.tsx`에서 hook 호출로 교체
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/App.tsx` -- L1385-1465 제거, hook import 추가
- [C] `src/hooks/use-pane-resize.ts` -- 리사이즈 (~80줄)

**Technical Notes**: Delta C2, I1. Validation V1, V3. 관련 테스트: `src/App.test.tsx`
**Dependencies**: Phase 2 완료 (T3-1과 병렬 가능)

---

## Phase 4: workspace-context.tsx 분할

**Goal**: `workspace-context.tsx` 3,677줄에서 6개 custom hook을 추출하고 IPC boilerplate 헬퍼를 도입하여 본체 ~800줄로 축소

**Task Set / Dependency Closure**:
- T4-0: 전제조건 (IPC boilerplate 헬퍼 -- 다른 hook이 사용)
- T4-1, T4-2, T4-3: T4-0 이후 병렬 가능 (서로 다른 관심사)
- T4-4, T4-5: T4-0 이후 병렬 가능 (IPC 이벤트 관련)
- T4-6: 마지막 (스냅샷 hook -- T0-17 통합 결과에 의존)
- 선행조건: Phase 3 완료

**Validation Focus**: V4 (export 시그니처 -- WorkspaceContextValue 40+ props 불변), V5 (IPC surface), V6 (전체 스모크)

**Exit Criteria**:
- [ ] `workspace-context.tsx`가 ~800줄 이하로 축소
- [ ] `src/workspace/hooks/` 디렉토리에 6개 hook 파일 + `ipc-call-helper.ts` 생성
- [ ] `npm test` 전체 통과 (V1)
- [ ] `npm run lint` 통과 (V2)
- [ ] 순환 참조 없음 확인 (V3)
- [ ] `WorkspaceContextValue` 인터페이스 불변 확인 (V4, C3)
- [ ] `npm run dev`로 전체 동작 확인: 파일 I/O, Git, 코멘트, 원격 연결, 파일 감시, 스냅샷 (V6)
- [ ] C1 검증: IPC 인터페이스 불변
- [ ] I1 검증: hook 간 순환 참조 없음

**Carry-over Policy**: None (critical/high/medium 이슈는 exit blocker)

---

### Task T4-0: IPC boilerplate 헬퍼 생성 (전제조건)
**Component**: src/workspace
**Priority**: P0
**Type**: Infrastructure

**Description**: `executeTrackedIpcCall<T>(...)` 공통 헬퍼를 생성한다. requestId 생성, stale 요청 체크, 에러 핸들링을 일원화하여 10회+ 반복되는 패턴(`const reqId = ++requestIdRef.current; ... if (reqId !== requestIdRef.current) return;`)을 제거한다.

**Acceptance Criteria**:
- [ ] `ipc-call-helper.ts`에 `executeTrackedIpcCall<T>` 함수 구현
- [ ] requestId 관리, stale 체크, 에러 처리를 커버
- [ ] 단위 테스트 작성

**Target Files**:
- [C] `src/workspace/ipc-call-helper.ts` -- IPC boilerplate 헬퍼

**Technical Notes**: Delta C1, C3. Validation V1, V5. 이 헬퍼는 Phase 4 hook들이 공통으로 사용하므로 전제조건
**Dependencies**: Phase 3 완료

---

### Task T4-1: useWorkspaceFileOperations hook 추출
**Component**: src/workspace/hooks
**Priority**: P0
**Type**: Refactor

**Description**: `workspace-context.tsx`에서 파일 I/O 관련 로직(readFile, writeFile, createFile, deleteFile, rename, loadDirectoryChildren)을 custom hook으로 추출한다.

**Acceptance Criteria**:
- [ ] `use-workspace-file-operations.ts`에 파일 I/O 핸들러 이동
- [ ] `executeTrackedIpcCall` 사용으로 boilerplate 축소
- [ ] `WorkspaceContextValue`의 파일 관련 프로퍼티 불변
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 파일 I/O 관련 로직 제거, hook import 추가
- [C] `src/workspace/hooks/use-workspace-file-operations.ts` -- 파일 I/O hook

**Technical Notes**: Delta C2, C3, I1. Validation V1, V3, V4, V6
**Dependencies**: T4-0

---

### Task T4-2: useWorkspaceGitDecorations hook 추출
**Component**: src/workspace/hooks
**Priority**: P1
**Type**: Refactor

**Description**: `workspace-context.tsx`에서 Git 데코레이션 관련 로직(lineMarkers, fileStatuses 로드)을 custom hook으로 추출한다.

**Acceptance Criteria**:
- [ ] `use-workspace-git-decorations.ts`에 Git 관련 로직 이동
- [ ] `activeFile` 변경 시 git line markers 로드, 워크스페이스 변경 시 file statuses 로드
- [ ] `WorkspaceContextValue`의 Git 관련 프로퍼티 불변
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- Git 데코레이션 관련 로직 제거
- [C] `src/workspace/hooks/use-workspace-git-decorations.ts` -- Git 데코레이션 hook

**Technical Notes**: Delta C2, C3, I1. Validation V1, V3, V4
**Dependencies**: T4-0 (T4-1과 병렬 가능)

---

### Task T4-3: useWorkspaceComments hook 추출
**Component**: src/workspace/hooks
**Priority**: P1
**Type**: Refactor

**Description**: `workspace-context.tsx`에서 코멘트 관련 로직(load/save comments, globalComments)을 custom hook으로 추출한다.

**Acceptance Criteria**:
- [ ] `use-workspace-comments.ts`에 코멘트 관련 로직 이동
- [ ] `reloadComments`, `saveComments`, `reloadGlobalComments`, `saveGlobalComments` 포함
- [ ] `WorkspaceContextValue`의 코멘트 관련 프로퍼티 불변
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 코멘트 관련 로직 제거
- [C] `src/workspace/hooks/use-workspace-comments.ts` -- 코멘트 hook

**Technical Notes**: Delta C2, C3, I1. Validation V1, V3, V4, V6
**Dependencies**: T4-0 (T4-1, T4-2와 병렬 가능)

---

### Task T4-4: useWorkspaceRemote hook 추출
**Component**: src/workspace/hooks
**Priority**: P1
**Type**: Refactor

**Description**: `workspace-context.tsx`에서 원격 연결 관련 로직(connect, disconnect, reconnect, banner 관리)을 custom hook으로 추출한다.

**Acceptance Criteria**:
- [ ] `use-workspace-remote.ts`에 원격 연결 로직 이동
- [ ] `connectRemoteWorkspace`, `disconnectRemoteWorkspace`, `retryRemoteWorkspaceConnection` 포함
- [ ] `WorkspaceContextValue`의 원격 관련 프로퍼티 불변
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 원격 연결 관련 로직 제거
- [C] `src/workspace/hooks/use-workspace-remote.ts` -- 원격 연결 hook

**Technical Notes**: Delta C1, C2, C3, I1. Validation V1, V3, V5, V6
**Dependencies**: T4-0 (T4-1~T4-3과 병렬 가능)

---

### Task T4-5: useWorkspaceWatcher hook 추출
**Component**: src/workspace/hooks
**Priority**: P1
**Type**: Refactor

**Description**: `workspace-context.tsx`에서 파일 감시 관련 로직(onWatchEvent, startWatch, stopWatch)을 custom hook으로 추출한다.

**Acceptance Criteria**:
- [ ] `use-workspace-watcher.ts`에 파일 감시 로직 이동
- [ ] `workspace:watchEvent` IPC 이벤트 리스너, watchMode 관리 포함
- [ ] `WorkspaceContextValue`의 watcher 관련 프로퍼티 불변
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 파일 감시 관련 로직 제거
- [C] `src/workspace/hooks/use-workspace-watcher.ts` -- 파일 감시 hook

**Technical Notes**: Delta C1, C2, C3, I1. Validation V1, V3, V5
**Dependencies**: T4-0 (T4-4와 병렬 가능)

---

### Task T4-6: useWorkspaceSnapshot hook 추출
**Component**: src/workspace/hooks
**Priority**: P1
**Type**: Refactor

**Description**: `workspace-context.tsx`에서 스냅샷 관련 로직(save/restore session, hydrate)을 custom hook으로 추출한다. T0-17에서 통합된 `hydrateExpandedDirectories`/`refreshWorkspaceDirectories` 결과가 그대로 이동한다.

**Acceptance Criteria**:
- [ ] `use-workspace-snapshot.ts`에 스냅샷 관련 로직 이동
- [ ] `saveWorkspaceSessionSnapshot`, `restoreWorkspaceSessionSnapshot`, `hydrateExpandedDirectories` 포함
- [ ] `WorkspaceContextValue`의 스냅샷 관련 프로퍼티 불변
- [ ] 기존 테스트 통과

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 스냅샷 관련 로직 제거
- [C] `src/workspace/hooks/use-workspace-snapshot.ts` -- 스냅샷 hook

**Technical Notes**: Delta C2, C3, I1. Validation V1, V3, V6. T0-17의 `hydrateExpandedDirectories`/`refreshWorkspaceDirectories` 통합 결과에 의존
**Dependencies**: T4-0, T4-1~T4-5 (마지막 정리 단계. 다른 hook 추출 후 남은 로직 확인 필요)

---

## Parallel Execution Summary

```
Phase 0:  보안 그룹  [T0-1] [T0-2] [T0-3] [T0-4] [T0-5]        -- 5 tasks, 파일 독립, 완전 병렬
          버그 그룹  [T0-6] [T0-7] [T0-8] [T0-9] [T0-10] [T0-11] -- 6 tasks, 동일 파일 순차:
                    T0-6→T0-11→T0-17 (workspace-context.tsx)
                    T0-7→T0-8 (code-editor-panel.tsx)
                    T0-3→T0-10→T0-16 (file-tree-panel.tsx)
                    T0-2→T0-9 (bootstrap.ts)
          정리 그룹  [T0-12] [T0-13] [T0-14] [T0-15] [T0-16] [T0-17]
          ─────────────────────────────────────────────────
Phase 1:  [T1-1] [T1-2]       -- 2 tasks 병렬 (서로 다른 라인 범위)
          [T1-3] [T1-4]       -- T1-1/T1-2 이후 (라인 오프셋 조정)
          [T1-5]              -- 마지막 (중복 통합)
          ─────────────────────────────────────────────────
Phase 2:  [T2-0]              -- 전제조건 (IPC 타입)
          [T2-1]              -- T2-0 이후 (유틸리티, 다른 모듈 의존)
          [T2-2] [T2-3] [T2-4] -- T2-1 이후 3 tasks 병렬
          [T2-5]              -- T2-3 이후 (routed → direct 참조)
          [T2-6]              -- 마지막 (등록 테이블화)
          ─────────────────────────────────────────────────
Phase 3:  [T3-1] [T3-3] [T3-4] -- 3 tasks 병렬 (서로 다른 라인 범위)
          [T3-2]              -- T3-1 이후 (라인 오프셋 인접)
          ─────────────────────────────────────────────────
Phase 4:  [T4-0]              -- 전제조건 (IPC 헬퍼)
          [T4-1] [T4-2] [T4-3] -- T4-0 이후 3 tasks 병렬
          [T4-4] [T4-5]       -- T4-0 이후 2 tasks 병렬
          [T4-6]              -- 마지막 (스냅샷, T0-17 통합 의존)
```

**Phase 간 순서는 엄격**: Phase 0 -> 1 -> 2 -> 3 -> 4. 각 Phase 완료 후 V1(npm test) + V6(스모크 테스트) 검증.

## Risks and Mitigations

| # | Risk | 심각도 | 영향 | 완화 방안 |
|---|------|--------|------|----------|
| R1 | 순환 참조 발생 | High | 빌드 실패 또는 런타임 undefined | 추출 전 import graph 분석(V3), 단방향 의존 원칙 적용. 특히 Phase 4 hook 간 상태 공유 주의 |
| R2 | preload sandbox에서 ipc-types.ts import 실패 | High | Phase 2 빌드 불가 | `import type`만 사용 (빌드 시 제거). 필요시 `.d.ts` 분리 전략 |
| R3 | hook 간 상태 공유로 props 폭발 (Phase 4) | Medium | 코드 복잡도 증가 | 공통 state를 useReducer로 관리, 각 hook에 최소 인터페이스만 전달. WorkspaceProvider가 조율 역할 유지 |
| R4 | Phase 0 수정과 후속 Phase 충돌 | Medium | 머지 컨플릭트 | Phase 0 -> 1 -> 2 -> 3 -> 4 순서 엄수. Phase별 별도 브랜치 또는 순차 커밋 |
| R5 | 대규모 리팩토링으로 기존 동작 퇴행 | High | 사용자 기능 장애 | V1(테스트), V6(스모크), V7(Phase 0 수동 검증)으로 각 Phase 검증 |

## Validation Plan Reference

| ID | 검증 항목 | 방법 | 적용 Phase | Delta Targets |
|----|----------|------|-----------|---------------|
| V1 | 테스트 통과 | `npm test` 전체 통과 | 전체 | C1, C2, C3, C4 |
| V2 | lint 통과 | `npm run lint` 통과 | 전체 | C2, I1 |
| V3 | import 정합성 | 순환 참조 없음 확인 (`madge --circular` 또는 수동) | Phase 1~4 | I1 |
| V4 | export 시그니처 불변 | 분할 전후 public export 비교, 타입 에러 없음 | Phase 1~4 | C2, C3 |
| V5 | IPC surface 불변 | `preload.ts`의 `contextBridge.exposeInMainWorld` 동일 API | Phase 2, 4 | C1, I2 |
| V6 | 스모크 테스트 | `npm run dev`로 기본 동작 확인 | 전체 | C1, C3, C4 |
| V7 | Phase 0 동작 보존 | 수정별 수동 검증 (보안: 차단 동작, 버그: 정상 경로) | Phase 0 | C4 |

## Open Questions

1. **Phase 3 hook 디렉토리**: `src/hooks/` vs `src/app/hooks/` vs App.tsx 인접 -- 현재 프로젝트에 `src/hooks/` 디렉토리가 없으므로 새로 생성 필요. `src/hooks/`를 기본으로 하되, 구현 시 코드베이스 컨벤션 재확인
2. **Phase 4 hook 간 공유 상태 인터페이스**: `WorkspaceProvider`가 useReducer를 사용하는 경우 reducer action 타입 정의 위치 -- `workspace-context.tsx` 유지 vs 별도 `workspace-state.ts` 분리
3. **IPC 채널 상수 관리 범위**: Phase 2에서 채널 이름 상수화 시, `ipc-types.ts`에 포함할지 별도 `ipc-channels.ts` 분리할지
4. **분리 실행 단위**: Phase별 별도 PR/브랜치 vs 통합 브랜치 Phase별 커밋 -- 리뷰 편의를 위해 Phase별 별도 PR 권장
5. **spec 반영**: 분할 완료 후 `_sdd/spec/code-map.md` 등 파일 구조 문서 업데이트 필요 -- `spec-update-todo` 후속 사용 제안
