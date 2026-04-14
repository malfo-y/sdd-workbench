# Feature Draft: 코드 리팩토링 로드맵 (Phase 0~4)

<!-- spec-update-todo-input-start -->
# Part 1: Temporary Spec Draft

## Change Summary

8개 코드 리뷰(`_sdd/review/`)에서 도출된 85건+ 발견 사항을 기반으로, **Phase 0(Quick Fixes ~17건)** + **Phase 1~4(4대 모놀리스 분할)** 로드맵을 실행한다.

| Phase | 대상 | Before | After | 핵심 변경 |
|-------|------|--------|-------|----------|
| 0 | 17개 파일 산발 수정 | — | — | 보안 5건 + 버그 6건 + 정리 6건 즉시 수정 |
| 1 | `src/spec-viewer/spec-viewer-panel.tsx` | 2,246줄 | ~1,200줄 | 헬퍼 함수 모듈화, HighlightedCodeBlock 추출, 중복 통합 |
| 2 | `electron/main.ts` | 3,511줄 | ~800줄 | IPC 타입 공유 모듈(전제조건), 관심사별 6개 파일 분리, IPC 등록 테이블화 |
| 3 | `src/App.tsx` | 2,627줄 | ~800줄 | 4개 custom hook 추출 (comments, history, resize, external-app) |
| 4 | `src/workspace/workspace-context.tsx` | 3,677줄 | ~800줄 | 6개 custom hook 추출 + IPC boilerplate 헬퍼 도입(전제조건) |

전체 변경 후 4대 모놀리스 합계: **~12,061줄 -> ~3,600줄** (약 70% 감소).

## Scope Delta

**포함:**
- 구조 분리 (파일 분할, 모듈 추출) — 로직 변경 최소화
- Phase 0: 보안 취약점 즉시 수정, 버그/안정성 수정, 데드코드/오타 정리
- Phase 1~4: 4대 모놀리스 파일의 관심사별 분할

**예외적 패턴 개선 (분리 전제조건):**
- IPC 타입 통합 (Phase 2 전제조건) — `main.ts`와 `preload.ts`의 ~49개 중복 타입을 `electron/ipc-types.ts`로 통합
- IPC boilerplate 헬퍼 (Phase 4 전제조건) — `executeTrackedIpcCall<T>(...)` 공통 헬퍼 도입
- IPC 등록 테이블화 (Phase 2) — 30쌍 반복 핸들러 등록을 맵 객체 + 루프로 전환

**제외:**
- 비동기/레이스 컨디션 로직 수정 (POST_SPLIT_REMAINING_ISSUES A1~A12)
- 추가 보안 강화 (POST_SPLIT_REMAINING_ISSUES S1~S9 중 Phase 0 제외 항목)
- 타입 안전성 개선 (POST_SPLIT_REMAINING_ISSUES T1~T8)
- 네이밍 일관성 정리 (POST_SPLIT_REMAINING_ISSUES N1~N7)
- 테스트 커버리지 확대 (POST_SPLIT_REMAINING_ISSUES C1~C7)
- 4대 모놀리스 외 추가 파일 크기 축소 (L1~L8)

## Contract/Invariant Delta

| ID | 유형 | 설명 | 영향 범위 |
|----|------|------|----------|
| C1 | Contract | **기존 IPC 인터페이스 유지** — `workspace:*` 채널의 요청/응답 타입 시그니처 불변. `electron/preload.ts`가 expose하는 API surface 변경 없음 | Phase 2 (main.ts 분할), Phase 4 (workspace-context 분할) |
| C2 | Contract | **export 시그니처 유지** — 분할되는 각 모듈의 public export가 기존 import site와 호환. 기존 파일에서 re-export 허용 | Phase 1~4 전체 |
| C3 | Contract | **WorkspaceContextValue 인터페이스 유지** — `workspace-context.tsx`의 `WorkspaceContextValue` 타입 (40+ 프로퍼티)은 그대로 유지. hook 분할은 내부 구현 변경이며 context consumer에게 투명 | Phase 4 |
| C4 | Contract | **Phase 0 수정은 동작 보존** — 보안/버그 수정은 방어 로직 추가이며, 기존 정상 경로의 동작은 변경하지 않음 | Phase 0 |
| I1 | Invariant | **분할 후 모듈 간 순환 참조 금지** — 추출된 모듈 간 import 관계가 단방향이어야 하며, circular dependency가 없어야 함 | Phase 1~4 전체 |
| I2 | Invariant | **Electron preload sandbox 제약 준수** — `electron/ipc-types.ts`는 preload에서 import 가능해야 하며, Node.js runtime 전용 모듈에 의존하지 않아야 함 | Phase 2 |

## Touchpoints

**4대 모놀리스 (Phase 1~4 핵심):**

| 파일 | 현재 줄 수 | Phase |
|------|-----------|-------|
| `src/spec-viewer/spec-viewer-panel.tsx` | 2,246 | Phase 1 |
| `electron/main.ts` | 3,511 | Phase 2 |
| `src/App.tsx` | 2,627 | Phase 3 |
| `src/workspace/workspace-context.tsx` | 3,677 | Phase 4 |

**Phase 0 대상 파일 (17건):**

| 파일 | 수정 건수 | 카테고리 |
|------|----------|---------|
| `electron/remote-agent/runtime/copy-ops.ts` | 1 | 보안 |
| `electron/remote-agent/bootstrap.ts` | 2 | 보안, 버그 |
| `src/file-tree/file-tree-panel.tsx` | 2 | 보안, 정리 |
| `src/spec-viewer/markdown-security.ts` | 1 | 보안 |
| `electron/file-clipboard.ts` | 1 | 보안 |
| `src/workspace/workspace-context.tsx` | 2 | 버그 |
| `src/code-editor/code-editor-panel.tsx` | 2 | 버그 |
| `electron/main.ts` | 1 | 정리 |
| `electron/remote-agent/runtime/watch-ops.ts` | 1 | 정리 |
| `electron/remote-agent/security.ts` | 1 | 정리 |
| `src/code-editor/cm6-dark-theme.ts` | 1 | 정리 |

**Phase 1~4 추출 대상 (신규 생성 파일):**

| Phase | 신규 파일 | 역할 |
|-------|----------|------|
| 1 | `src/spec-viewer/spec-viewer-comment-markers.ts` | 코멘트 마커 매핑 로직 |
| 1 | `src/spec-viewer/highlighted-code-block.tsx` | HighlightedCodeBlock 컴포넌트 |
| 1 | `src/spec-viewer/spec-viewer-scroll.ts` | heading scroll 헬퍼 |
| 1 | `src/spec-viewer/spec-viewer-helpers.ts` | 기타 순수 헬퍼 함수 |
| 2 | `electron/ipc-types.ts` | IPC 공유 타입 정의 |
| 2 | `electron/workspace-utils.ts` | 워크스페이스 유틸리티 |
| 2 | `electron/workspace-indexing.ts` | 파일 트리 인덱싱 |
| 2 | `electron/workspace-ipc-handlers.ts` | IPC 핸들러 직접 |
| 2 | `electron/workspace-watchers.ts` | 파일 시스템 워칭 |
| 2 | `electron/workspace-ipc-routing.ts` | Routed 핸들러 + 라우터 |
| 3 | `src/hooks/use-comment-actions.ts` | 코멘트 CRUD + 내보내기 |
| 3 | `src/hooks/use-history-navigation.ts` | 네비게이션/히스토리 |
| 3 | `src/hooks/use-external-app-opener.ts` | 외부 앱 열기 |
| 3 | `src/hooks/use-pane-resize.ts` | 리사이즈 |
| 4 | `src/workspace/hooks/use-workspace-file-operations.ts` | 파일 I/O |
| 4 | `src/workspace/hooks/use-workspace-git-decorations.ts` | Git 데코레이션 |
| 4 | `src/workspace/hooks/use-workspace-comments.ts` | 코멘트 관리 |
| 4 | `src/workspace/hooks/use-workspace-remote.ts` | 원격 연결 |
| 4 | `src/workspace/hooks/use-workspace-watcher.ts` | 파일 감시 |
| 4 | `src/workspace/hooks/use-workspace-snapshot.ts` | 스냅샷 |
| 4 | `src/workspace/ipc-call-helper.ts` | IPC boilerplate 헬퍼 |

## Implementation Plan

### Phase 0: Quick Fixes (~17건, 즉시 수정)

**보안 즉시 수정 (5건):**
1. `copy-ops.ts:58` — `startsWith` 경로 비교를 `isPathInsideWorkspace`로 교체
2. `bootstrap.ts:144` — heredoc 마커 충돌 빌드 시 검증 테스트 추가
3. `file-tree-panel.tsx:432` — 파일명 검증에 `\`, NUL, 제어문자 추가 차단
4. `markdown-security.ts:88` — span style에 CSS 속성 allowlist 도입
5. `file-clipboard.ts:91` — destAbsolute 경로 탈출 검증 추가

**버그/안정성 즉시 수정 (6건):**
6. `workspace-context.tsx:2854` — 무한 루프 위험에 최대 반복 횟수 추가
7. `code-editor-panel.tsx:697` — rAF `cancelAnimationFrame` cleanup 추가
8. `code-editor-panel.tsx:646` — `getCM6Language` reject에 try-catch 추가
9. `bootstrap.ts:265` — `ExecFileException.code` 타입에 `error.status` 분기 추가
10. `file-tree-panel.tsx:768` — CRUD 콜백에 `.catch()` 추가
11. `workspace-context.tsx:3383` — watcher 레이스 컨디션 수정 (suppressSavedActiveFileRefresh 이동)

**정리 (6건):**
12. `main.ts:3435` — main-process-message 데드 코드 삭제
13. `watch-ops.ts:236` — 죽은 삼항 조건 단순화
14. `security.ts:37` — `MAX_REDATED` -> `MAX_REDACTED` rename
15. `cm6-dark-theme.ts:185` — darkTheme 미사용 별칭 확인 후 제거
16. `file-tree-panel.tsx:318` — isExpanded 중복 체크 제거
17. `workspace-context.tsx:2965` — hydrateExpandedDirectories/refreshWorkspaceDirectories 통합

### Phase 1: spec-viewer-panel.tsx 분할 (2,246줄 -> ~1,200줄)

1. 코멘트 마커 매핑 로직 (L322-702, ~380줄) -> `spec-viewer-comment-markers.ts` 추출
2. HighlightedCodeBlock 컴포넌트 (L768-982, ~215줄) -> `highlighted-code-block.tsx` 추출
3. heading scroll 헬퍼 (L1417-1481 + L1679-1716 중복 통합, ~60줄) -> `spec-viewer-scroll.ts` 추출
4. 기타 순수 헬퍼 함수 (~100줄) -> `spec-viewer-helpers.ts` 추출
5. 중복 통합: `getElementDepth` -> `source-line-resolver.ts`에서만 export, `BRACKET_CITATION_PATTERN` -> `citation-target.ts`에서 export, Python 식별자 정규식 -> `citation-target.ts`에서 export

### Phase 2: main.ts 분할 (3,511줄 -> ~800줄)

**전제조건: IPC 타입 공유 모듈**
1. `electron/ipc-types.ts` 생성 — main.ts(L100-424, ~325줄)와 preload.ts의 ~49개 중복 타입 통합
2. 양쪽에서 import하도록 변경, preload sandbox 제약 확인

**분할:**
3. 유틸리티 (L492-719, ~228줄) -> `electron/workspace-utils.ts`
4. 파일 트리 인덱싱 (L720-957, ~237줄) -> `electron/workspace-indexing.ts`
5. IPC 핸들러 직접 (L959-2010, ~1,051줄) -> `electron/workspace-ipc-handlers.ts`
6. 파일 시스템 워칭 (L2033-2528, ~495줄) -> `electron/workspace-watchers.ts`
7. Routed 핸들러 + 라우터 (L2646-2974, ~328줄) -> `electron/workspace-ipc-routing.ts`
8. IPC 등록 테이블화 — 30쌍 반복을 채널-핸들러 맵 + 루프 등록으로 전환

### Phase 3: App.tsx 분할 (2,627줄 -> ~800줄)

1. 코멘트 CRUD + 내보내기 (L669-1237, ~560줄) -> `src/hooks/use-comment-actions.ts`
2. 네비게이션/히스토리 (L1467-1982, ~510줄) -> `src/hooks/use-history-navigation.ts`
3. 외부 앱 열기 (L1239-1383, ~140줄) -> `src/hooks/use-external-app-opener.ts`
4. 리사이즈 (L1385-1465, ~80줄) -> `src/hooks/use-pane-resize.ts`

### Phase 4: workspace-context.tsx 분할 (3,677줄 -> ~800줄)

**전제조건: IPC boilerplate 헬퍼**
1. `src/workspace/ipc-call-helper.ts` — `executeTrackedIpcCall<T>(...)` 공통 헬퍼 도입
   - requestId 관리, stale 체크, 에러 처리 일원화 (10회+ 반복 패턴)

**분할:**
2. 파일 I/O -> `src/workspace/hooks/use-workspace-file-operations.ts`
3. Git 데코레이션 -> `src/workspace/hooks/use-workspace-git-decorations.ts`
4. 코멘트 관리 -> `src/workspace/hooks/use-workspace-comments.ts`
5. 원격 연결 -> `src/workspace/hooks/use-workspace-remote.ts`
6. 파일 감시 -> `src/workspace/hooks/use-workspace-watcher.ts`
7. 스냅샷 -> `src/workspace/hooks/use-workspace-snapshot.ts`

## Validation Plan

| ID | 검증 항목 | 방법 | Targets |
|----|----------|------|---------|
| V1 | 테스트 통과 | 각 Phase 완료 시 `npm test` 전체 통과 확인 | C1, C2, C3, C4 |
| V2 | lint 통과 | 각 Phase 완료 시 `npm run lint` 통과 확인 | C2, I1 |
| V3 | import 정합성 | 순환 참조 없음 확인 — `madge --circular` 또는 수동 import graph 검증 | I1 |
| V4 | export 시그니처 불변 | 분할 전후 public export 비교 — 기존 import site에서 타입 에러 없음 확인 | C2, C3 |
| V5 | IPC surface 불변 | `electron/preload.ts`의 `contextBridge.exposeInMainWorld` 호출이 동일한 API surface를 유지 | C1, I2 |
| V6 | 스모크 테스트 | 각 Phase 완료 시 `npm run dev`로 기본 동작 확인 (워크스페이스 열기, 파일 선택, 스펙 보기, 코멘트 CRUD) | C1, C3, C4 |
| V7 | Phase 0 동작 보존 | Phase 0 수정 항목별 수동 검증 — 보안 수정은 차단 동작 추가 확인, 버그 수정은 정상 경로 불변 확인 | C4 |

## Risks / Open Questions

| # | 유형 | 설명 | 완화 |
|---|------|------|------|
| R1 | Risk | **순환 참조 위험** — 분할 시 추출된 모듈 간 상호 참조가 생길 수 있음. 특히 Phase 4에서 hook 간 상태 공유 시 | 분할 전 import graph 분석, 단방향 의존 원칙 적용, V3로 검증 |
| R2 | Risk | **preload sandbox 제약 (Phase 2)** — `electron/ipc-types.ts`를 preload에서 import 시 번들링/빌드 제약이 있을 수 있음. Electron contextIsolation 환경에서 타입만 import하면 런타임 영향 없지만 빌드 설정 확인 필요 | 타입만 추출하는 전략 우선, 필요시 `.d.ts` 분리 |
| R3 | Risk | **hook 간 상태 공유 복잡도 (Phase 4)** — `workspace-context.tsx`의 6개 hook이 공유하는 상태(activeWorkspaceId, rootPath 등)가 많아 추출 시 props drilling이 복잡해질 수 있음 | 공통 state를 useReducer로 관리하고 각 hook에 전달, WorkspaceProvider가 조율 역할 유지 |
| R4 | Risk | **Phase 0과 Phase 1~4 충돌** — Phase 0 수정 대상 중 `workspace-context.tsx`, `main.ts`는 Phase 2, 4에서도 분할 대상. Phase 0을 먼저 완료해야 분할 작업의 base가 안정됨 | Phase 0 -> Phase 1 -> 2 -> 3 -> 4 순서 엄수 |
| R5 | Open | **Phase 3 hook 디렉토리 위치** — `src/hooks/` vs `src/app-hooks/` vs App.tsx 인접 배치. 현재 프로젝트에 `src/hooks/` 디렉토리가 없으므로 새로 생성 필요 | `src/hooks/`를 기본으로 하되, 구현 시 코드베이스 컨벤션 재확인 |
| R6 | Open | **분리 필요성 검토** — 이 문서는 Phase 0~4를 하나의 temporary spec으로 묶었으나, 각 Phase가 독립적으로 리뷰/머지 가능하므로 Phase별 별도 spec으로 분리할 수도 있음 | 현재는 통합 관리, 실행 시 Phase별 브랜치 분리로 대응 |

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

4대 모놀리스 파일(합계 ~12,061줄)을 관심사별로 분할하여 각 파일을 ~800줄 이하로 축소한다. Phase 0에서 즉시 수정 가능한 보안/버그/정리 항목 17건을 먼저 처리하여 안정적인 base를 확보한 후, Phase 1~4를 순차 실행한다.

## Scope

- **In**: 구조 분리 (파일 분할, 모듈 추출), Phase 0 즉시 수정, 분리 전제조건인 패턴 개선 (IPC 타입 통합, IPC boilerplate 헬퍼)
- **Out**: 비동기 패턴 리팩토링, 추가 보안 강화, 타입 안전성 개선, 네이밍 정리, 테스트 커버리지 확대 (POST_SPLIT_REMAINING_ISSUES 참조)

## Components

- `spec-viewer-panel.tsx` (Phase 1) — renderer, Markdown 스펙 뷰어
- `main.ts` (Phase 2) — Electron main process
- `App.tsx` (Phase 3) — renderer, App shell
- `workspace-context.tsx` (Phase 4) — renderer, 워크스페이스 상태 관리

## Contract/Invariant Delta Coverage

| Delta ID | Phase | 검증 |
|----------|-------|------|
| C1 (IPC 인터페이스 유지) | Phase 2, 4 | V1, V5, V6 |
| C2 (export 시그니처 유지) | Phase 1~4 | V1, V2, V4 |
| C3 (WorkspaceContextValue 유지) | Phase 4 | V1, V4, V6 |
| C4 (Phase 0 동작 보존) | Phase 0 | V1, V7 |
| I1 (순환 참조 금지) | Phase 1~4 | V2, V3 |
| I2 (preload sandbox 준수) | Phase 2 | V1, V5 |

## Implementation Phases

| Phase | 이름 | 선행 조건 | 예상 파일 변경 |
|-------|------|----------|--------------|
| 0 | Quick Fixes | 없음 | ~12 파일 수정 |
| 1 | spec-viewer-panel.tsx 분할 | Phase 0 완료 | 1 수정 + 4 생성 + 3 수정(중복 통합) |
| 2 | main.ts 분할 | Phase 1 완료 | 2 수정(main.ts, preload.ts) + 6 생성 |
| 3 | App.tsx 분할 | Phase 2 완료 | 1 수정 + 4 생성 |
| 4 | workspace-context.tsx 분할 | Phase 3 완료 | 1 수정 + 7 생성 |

## Task Details

---

### Phase 0: Quick Fixes

#### Task P0-1: 보안 즉시 수정 (5건)

**Target Files:**
- `[M] electron/remote-agent/runtime/copy-ops.ts` — L58 `startsWith` -> `isPathInsideWorkspace` 교체
- `[M] electron/remote-agent/bootstrap.ts` — L144 heredoc 마커 충돌 검증 테스트 추가
- `[M] src/file-tree/file-tree-panel.tsx` — L432 파일명 검증 강화 (`\`, NUL, 제어문자 차단)
- `[M] src/spec-viewer/markdown-security.ts` — L88 span style CSS 속성 allowlist 도입
- `[M] electron/file-clipboard.ts` — L91 destAbsolute 경로 탈출 검증 추가

**Technical Notes:**
- Delta: C4 (동작 보존)
- Validation: V1 (npm test), V7 (수동 검증)
- 각 수정은 방어 로직 추가이며, 기존 정상 경로 동작 불변

#### Task P0-2: 버그/안정성 즉시 수정 (6건)

**Target Files:**
- `[M] src/workspace/workspace-context.tsx` — L2854 무한 루프 위험 최대 반복 횟수 추가
- `[M] src/code-editor/code-editor-panel.tsx` — L697 `cancelAnimationFrame` cleanup 추가
- `[M] src/code-editor/code-editor-panel.tsx` — L646 `getCM6Language` reject try-catch 추가
- `[M] electron/remote-agent/bootstrap.ts` — L265 `error.status` 분기 추가
- `[M] src/file-tree/file-tree-panel.tsx` — L768 CRUD 콜백 `.catch()` 추가
- `[M] src/workspace/workspace-context.tsx` — L3383 suppressSavedActiveFileRefresh 업데이터 내부로 이동

**Technical Notes:**
- Delta: C4 (동작 보존)
- Validation: V1 (npm test), V7 (수동 검증)
- 각 수정은 1~3줄 수준의 최소 변경

#### Task P0-3: 정리 — 데드코드/오타 (6건)

**Target Files:**
- `[M] electron/main.ts` — L3435-3438 `main-process-message` 데드 코드 삭제 (3줄)
- `[M] electron/remote-agent/runtime/watch-ops.ts` — L236 죽은 삼항 조건 단순화
- `[M] electron/remote-agent/security.ts` — L37 `MAX_REDATED` -> `MAX_REDACTED` rename
- `[M] src/code-editor/cm6-dark-theme.ts` — L185 darkTheme 미사용 별칭 확인 후 제거
- `[M] src/file-tree/file-tree-panel.tsx` — L318 isExpanded 중복 체크 제거
- `[M] src/workspace/workspace-context.tsx` — L2965 hydrateExpandedDirectories/refreshWorkspaceDirectories 통합

**Technical Notes:**
- Delta: C4 (동작 보존)
- Validation: V1 (npm test), V2 (npm run lint)
- 가장 안전한 수정 그룹, 병렬 작업 가능

---

### Phase 1: spec-viewer-panel.tsx 분할 (2,246줄 -> ~1,200줄)

#### Task P1-1: 코멘트 마커 매핑 로직 추출

**Target Files:**
- `[M] src/spec-viewer/spec-viewer-panel.tsx` — L322-702 (~380줄) 제거, import 추가
- `[C] src/spec-viewer/spec-viewer-comment-markers.ts` — 추출 대상: `areLineCountMapsEqual`, `mapCommentCountsToRenderedSourceLines` 등 코멘트 카운트 매핑 관련 순수 함수

**Technical Notes:**
- Delta: C2 (export 시그니처 유지), I1 (순환 참조 금지)
- Validation: V1, V3, V4
- 가장 큰 추출 블록. L322(`areLineCountMapsEqual`)부터 L702(`mapCommentCountsToRenderedSourceLines` 반환)까지 연속된 순수 함수 블록
- `spec-viewer-panel.tsx`에서 이 함수들을 import하도록 변경

#### Task P1-2: HighlightedCodeBlock 컴포넌트 추출

**Target Files:**
- `[M] src/spec-viewer/spec-viewer-panel.tsx` — L768-982 (~215줄) 제거, import 추가
- `[C] src/spec-viewer/highlighted-code-block.tsx` — `renderHighlightedCodeLineWithCitationMatches` 및 관련 렌더링 로직 추출

**Technical Notes:**
- Delta: C2 (export 시그니처 유지), I1 (순환 참조 금지)
- Validation: V1, V3, V4
- L768(`renderHighlightedCodeLineWithCitationMatches`)부터 L982(코드 블록 렌더링 종료)까지
- `HighlightLineToken`, `CodeBlockCitationMatch` 등 필요한 타입을 함께 import

#### Task P1-3: heading scroll 헬퍼 추출 및 중복 통합

**Target Files:**
- `[M] src/spec-viewer/spec-viewer-panel.tsx` — L1417-1481 (handleMarkdownLinkClick 내 스크롤 로직) + L1679-1716 (handleTocLinkClick 내 스크롤 로직) 공통 부분 추출
- `[C] src/spec-viewer/spec-viewer-scroll.ts` — heading 스크롤 공통 헬퍼 (~60줄)

**Technical Notes:**
- Delta: C2, I1
- Validation: V1, V3, V6
- `handleMarkdownLinkClick`(L1417)과 `handleTocLinkClick`(L1679) 내부에 heading ID -> DOM element 찾기 -> scrollIntoView 패턴이 중복
- 공통 `scrollToHeadingById(container, headingId)` 함수로 추출

#### Task P1-4: 기타 순수 헬퍼 함수 추출

**Target Files:**
- `[M] src/spec-viewer/spec-viewer-panel.tsx` — L704-766 등 나머지 순수 함수 (~100줄) 제거
- `[C] src/spec-viewer/spec-viewer-helpers.ts` — `containsSelectionNode`, `getCommentSourceLineKeys` 등

**Technical Notes:**
- Delta: C2, I1
- Validation: V1, V3, V4
- Task P1-1~P1-3 완료 후 남은 모듈 레벨 순수 함수를 정리

#### Task P1-5: 중복 통합

**Target Files:**
- `[M] src/spec-viewer/spec-viewer-panel.tsx` — `getElementDepth`, `BRACKET_CITATION_PATTERN`, Python 식별자 정규식 제거
- `[M] src/spec-viewer/source-line-resolver.ts` — `getElementDepth` 단독 export 유지 (이미 존재하는 경우 확인)
- `[M] src/spec-viewer/citation-target.ts` — `BRACKET_CITATION_PATTERN` + Python 식별자 정규식 export 추가
- `[M] src/spec-viewer/python-symbol-resolver.ts` — `citation-target.ts`에서 import하도록 변경

**Technical Notes:**
- Delta: C2, I1
- Validation: V1, V2, V3
- 중복 제거와 동시에 export source를 canonical 위치로 통합

---

### Phase 2: main.ts 분할 (3,511줄 -> ~800줄)

#### Task P2-0: IPC 타입 공유 모듈 생성 (전제조건)

**Target Files:**
- `[C] electron/ipc-types.ts` — main.ts L100-424(~325줄)의 타입 정의 이동 + preload.ts의 ~49개 중복 타입 통합
- `[M] electron/main.ts` — 타입 정의 제거, `ipc-types.ts`에서 import
- `[M] electron/preload.ts` — 중복 타입 정의 제거, `ipc-types.ts`에서 import

**Technical Notes:**
- Delta: C1 (IPC 인터페이스 유지), I2 (preload sandbox 준수)
- Validation: V1, V4, V5
- `ipc-types.ts`는 순수 타입만 포함하여 preload sandbox 제약 회피
- `type` import만 사용하면 빌드 시 제거되므로 런타임 영향 없음

#### Task P2-1: 유틸리티 함수 추출

**Target Files:**
- `[M] electron/main.ts` — L492-719 (~228줄) 제거
- `[C] electron/workspace-utils.ts` — `normalizeToWorkspaceRelativePath`, `hasIgnoredWorkspaceSegment`, `writeFileAtomic`, `ensurePathWithinWorkspace` 등

**Technical Notes:**
- Delta: C2, I1
- Validation: V1, V3
- 다른 추출 모듈에서 import하는 공유 유틸이므로 먼저 추출

#### Task P2-2: 파일 트리 인덱싱 추출

**Target Files:**
- `[M] electron/main.ts` — L720-957 (~237줄) 제거
- `[C] electron/workspace-indexing.ts` — `buildWorkspaceTree`, `IndexedWorkspaceEntry`, `BuildWorkspaceTreeResult` 등

**Technical Notes:**
- Delta: C2, I1
- Validation: V1, V3
- `workspace-utils.ts`에서 `hasIgnoredWorkspaceSegment` 등을 import

#### Task P2-3: IPC 핸들러 추출

**Target Files:**
- `[M] electron/main.ts` — L959-2010 (~1,051줄) 제거
- `[C] electron/workspace-ipc-handlers.ts` — `handleWorkspaceIndexDirectory`, `handleWorkspaceReadFile`, `handleWorkspaceWriteFile` 등 직접 IPC 핸들러

**Technical Notes:**
- Delta: C1 (IPC 인터페이스 유지), C2, I1
- Validation: V1, V3, V5
- 가장 큰 추출 블록. `workspace-utils.ts`, `workspace-indexing.ts`를 import

#### Task P2-4: 파일 시스템 워칭 추출

**Target Files:**
- `[M] electron/main.ts` — L2033-2528 (~495줄) 제거
- `[C] electron/workspace-watchers.ts` — `sendWorkspaceWatchEvent`, chokidar 워처 관리, `stopAllWorkspaceWatchers` 등

**Technical Notes:**
- Delta: C1, C2, I1
- Validation: V1, V3, V5
- `win` 참조가 필요하므로 초기화 시 BrowserWindow 인스턴스를 주입받는 패턴 사용

#### Task P2-5: Routed 핸들러 + 라우터 추출

**Target Files:**
- `[M] electron/main.ts` — L2646-2974 (~328줄) 제거
- `[C] electron/workspace-ipc-routing.ts` — `localWorkspaceBackend`, routed 핸들러 18개, `workspaceBackendRouter`

**Technical Notes:**
- Delta: C1, C2, I1
- Validation: V1, V3, V5
- `DUMMY_IPC_EVENT`(L2646) 패턴은 이 모듈에 포함하되, 향후 T1(타입 안전성) 항목으로 제거 예정

#### Task P2-6: IPC 등록 테이블화

**Target Files:**
- `[M] electron/main.ts` — `registerIpcHandlers` 함수 내부 리팩토링
- `[M] electron/workspace-ipc-handlers.ts` — 핸들러 맵 export 추가 (선택)
- `[M] electron/workspace-ipc-routing.ts` — routed 핸들러 맵 export 추가 (선택)

**Technical Notes:**
- Delta: C1 (IPC surface 불변)
- Validation: V1, V5, V6
- 30쌍 `ipcMain.handle(channel, handler)` 반복을 `const IPC_HANDLERS: Record<string, Function> = { ... }` + `for (const [channel, handler] of Object.entries(IPC_HANDLERS))` 루프로 전환
- 채널 이름 문자열 리터럴을 `ipc-types.ts`에 상수로 관리

---

### Phase 3: App.tsx 분할 (2,627줄 -> ~800줄)

#### Task P3-1: useCommentActions hook 추출

**Target Files:**
- `[M] src/App.tsx` — L669-1237 (~560줄) 제거, hook import 추가
- `[C] src/hooks/use-comment-actions.ts` — 코멘트 CRUD (add, edit, delete, export, deleteExported) + 배너 표시 로직

**Technical Notes:**
- Delta: C2, I1
- Validation: V1, V3, V6
- 가장 큰 추출 블록. `handleCopyRelativePath`(L669)부터 `handleDeleteExportedComments`(L1237)까지
- `activeWorkspaceId`, `comments`, `saveComments`, `showCommentBanner` 등을 인자로 받음

#### Task P3-2: useHistoryNavigation hook 추출

**Target Files:**
- `[M] src/App.tsx` — L1467-1982 (~510줄) 제거, hook import 추가
- `[C] src/hooks/use-history-navigation.ts` — 코드 뷰어 jump 요청, 히스토리 네비게이션, 키보드/휠 이벤트 핸들링

**Technical Notes:**
- Delta: C2, I1
- Validation: V1, V3, V6
- `queueCodeViewerJumpRequest`(L1467)부터 wheel 이벤트 리스너(L1982)까지
- `jumpRequestTokenRef`, `navigateHistory`, `canGoBack`, `canGoForward` 등 상태/참조 포함

#### Task P3-3: useExternalAppOpener hook 추출

**Target Files:**
- `[M] src/App.tsx` — L1239-1383 (~140줄) 제거, hook import 추가
- `[C] src/hooks/use-external-app-opener.ts` — iTerm, VSCode, Finder 열기 + 원격 재시도 로직

**Technical Notes:**
- Delta: C2, I1
- Validation: V1, V3
- `openWorkspaceInExternalApp`(L1239)부터 `handleRetryRemoteWorkspaceConnection`(L1383)까지

#### Task P3-4: usePaneResize hook 추출

**Target Files:**
- `[M] src/App.tsx` — L1385-1465 (~80줄) 제거, hook import 추가
- `[C] src/hooks/use-pane-resize.ts` — 3-pane 리사이즈 핸들 드래그 로직

**Technical Notes:**
- Delta: C2, I1
- Validation: V1, V3
- `workspaceLayoutStyle`(L1385)부터 resize cleanup(L1465)까지
- `activeResizeHandle`, `paneSizes` 상태 포함

---

### Phase 4: workspace-context.tsx 분할 (3,677줄 -> ~800줄)

#### Task P4-0: IPC boilerplate 헬퍼 생성 (전제조건)

**Target Files:**
- `[C] src/workspace/ipc-call-helper.ts` — `executeTrackedIpcCall<T>(...)` 공통 헬퍼

**Technical Notes:**
- Delta: C1, C3
- Validation: V1, V5
- requestId 생성, stale 요청 체크, 에러 핸들링을 일원화
- 10회+ 반복되는 패턴: `const reqId = ++requestIdRef.current; ... if (reqId !== requestIdRef.current) return;`

#### Task P4-1: useWorkspaceFileOperations hook 추출

**Target Files:**
- `[M] src/workspace/workspace-context.tsx` — 파일 I/O 관련 로직 제거, hook import 추가
- `[C] src/workspace/hooks/use-workspace-file-operations.ts` — readFile, writeFile, createFile, deleteFile, rename, loadDirectoryChildren

**Technical Notes:**
- Delta: C2, C3, I1
- Validation: V1, V3, V4, V6
- `ipc-call-helper.ts`의 `executeTrackedIpcCall` 사용

#### Task P4-2: useWorkspaceGitDecorations hook 추출

**Target Files:**
- `[M] src/workspace/workspace-context.tsx` — Git 데코레이션 관련 로직 제거
- `[C] src/workspace/hooks/use-workspace-git-decorations.ts` — lineMarkers, fileStatuses 로드

**Technical Notes:**
- Delta: C2, C3, I1
- Validation: V1, V3, V4
- `activeFile` 변경 시 git line markers 로드, 워크스페이스 변경 시 file statuses 로드

#### Task P4-3: useWorkspaceComments hook 추출

**Target Files:**
- `[M] src/workspace/workspace-context.tsx` — 코멘트 관련 로직 제거
- `[C] src/workspace/hooks/use-workspace-comments.ts` — load/save comments, globalComments

**Technical Notes:**
- Delta: C2, C3, I1
- Validation: V1, V3, V4, V6
- `reloadComments`, `saveComments`, `reloadGlobalComments`, `saveGlobalComments`

#### Task P4-4: useWorkspaceRemote hook 추출

**Target Files:**
- `[M] src/workspace/workspace-context.tsx` — 원격 연결 관련 로직 제거
- `[C] src/workspace/hooks/use-workspace-remote.ts` — connect, disconnect, reconnect, banner 관리

**Technical Notes:**
- Delta: C1, C2, C3, I1
- Validation: V1, V3, V5, V6
- `connectRemoteWorkspace`, `disconnectRemoteWorkspace`, `retryRemoteWorkspaceConnection`

#### Task P4-5: useWorkspaceWatcher hook 추출

**Target Files:**
- `[M] src/workspace/workspace-context.tsx` — 파일 감시 관련 로직 제거
- `[C] src/workspace/hooks/use-workspace-watcher.ts` — onWatchEvent, startWatch, stopWatch

**Technical Notes:**
- Delta: C1, C2, C3, I1
- Validation: V1, V3, V5
- `workspace:watchEvent` IPC 이벤트 리스너, watchMode 관리

#### Task P4-6: useWorkspaceSnapshot hook 추출

**Target Files:**
- `[M] src/workspace/workspace-context.tsx` — 스냅샷 관련 로직 제거
- `[C] src/workspace/hooks/use-workspace-snapshot.ts` — save/restore session, hydrate

**Technical Notes:**
- Delta: C2, C3, I1
- Validation: V1, V3, V6
- `saveWorkspaceSessionSnapshot`, `restoreWorkspaceSessionSnapshot`, `hydrateExpandedDirectories`
- Phase 0 Task P0-3에서 `hydrateExpandedDirectories`/`refreshWorkspaceDirectories` 통합이 선행되어야 함

---

## Parallel Execution Summary

```
Phase 0:  [P0-1] [P0-2] [P0-3]   -- 3 tasks 병렬 가능 (파일 겹침 주의)
          ────────────────────────
Phase 1:  [P1-1] [P1-2]           -- 병렬 가능 (라인 범위 분리)
          [P1-3] [P1-4]           -- P1-1/P1-2 이후 (잔여 정리)
          [P1-5]                  -- 마지막 (중복 통합)
          ────────────────────────
Phase 2:  [P2-0]                  -- 전제조건 (IPC 타입)
          [P2-1]                  -- P2-0 이후 (유틸리티, 다른 모듈 의존)
          [P2-2] [P2-3] [P2-4]   -- P2-1 이후 병렬 가능
          [P2-5]                  -- P2-3 이후 (routed -> direct 참조)
          [P2-6]                  -- 마지막 (등록 테이블화)
          ────────────────────────
Phase 3:  [P3-1] [P3-3] [P3-4]   -- 병렬 가능 (라인 범위 분리)
          [P3-2]                  -- P3-1 이후 (라인 범위 인접)
          ────────────────────────
Phase 4:  [P4-0]                  -- 전제조건 (IPC 헬퍼)
          [P4-1] [P4-2] [P4-3]   -- P4-0 이후 병렬 가능
          [P4-4] [P4-5]          -- P4-0 이후 병렬 가능
          [P4-6]                  -- 마지막 (스냅샷, P0-3 통합 의존)
```

**Phase 간 순서는 엄격**: Phase 0 -> 1 -> 2 -> 3 -> 4. 각 Phase 완료 후 V1(npm test) + V6(스모크) 검증.

## Risks and Mitigations

| # | Risk | 영향 | 완화 방안 |
|---|------|------|----------|
| 1 | 순환 참조 발생 | 빌드 실패 또는 런타임 undefined | 추출 전 import graph 분석(V3), 단방향 의존 원칙 적용 |
| 2 | preload sandbox에서 ipc-types.ts import 실패 | Phase 2 빌드 불가 | `type` import만 사용 (빌드 시 제거), 필요시 `.d.ts` 분리 전략 |
| 3 | hook 간 상태 공유로 props 폭발 | Phase 4 코드 복잡도 증가 | 공통 state를 useReducer로 관리, 각 hook에 최소 인터페이스만 전달 |
| 4 | Phase 0 수정과 후속 Phase 충돌 | 머지 컨플릭트 | Phase 0 완료 후 다음 Phase 시작, Phase별 별도 브랜치 |
| 5 | 대규모 리팩토링으로 기존 동작 퇴행 | 사용자 기능 장애 | V1(테스트), V6(스모크), V7(Phase 0 수동 검증)으로 각 Phase 검증 |

## Open Questions

1. **Phase 3 hook 디렉토리**: `src/hooks/` vs App.tsx 인접 — 프로젝트에 기존 hooks 디렉토리 없음. `src/hooks/`를 새로 생성하는 것이 적절한지, 아니면 `src/app/hooks/` 같은 구조가 나은지 구현 시 결정 필요.
2. **Phase 4 hook 간 공유 상태 인터페이스**: `WorkspaceProvider`가 useReducer를 사용하는 경우 reducer action 타입을 어디에 정의할지 — `workspace-context.tsx`에 유지할지, 별도 `workspace-state.ts`로 분리할지.
3. **IPC 채널 상수 관리 범위**: Phase 2에서 채널 이름을 상수화할 때, `ipc-types.ts`에 포함할지 별도 `ipc-channels.ts`로 분리할지.
4. **분리 실행 단위**: Phase별 별도 PR/브랜치로 갈지, 통합 브랜치에서 Phase별 커밋으로 관리할지.
