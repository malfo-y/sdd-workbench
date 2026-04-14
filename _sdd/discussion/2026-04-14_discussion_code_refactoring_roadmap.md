# 토론 요약: 코드 리팩토링 로드맵

**날짜**: 2026-04-14
**라운드 수**: 6
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)

1. **우선순위 축 선택**: 보안 vs 모놀리스 분할 vs 버그 수정 vs 종합 — 모놀리스 분할이 가장 큰 구조적 부채이며 이후 작업의 기반이 됨
2. **분할 순서**: 위험도 높은 것부터 vs 쉬운 것부터 — 쉬운 것부터 시작해 패턴을 익히고 점진적으로 난이도를 올리는 전략 선택
3. **범위 결정**: 모놀리스만 vs 전체 수정 포함 — Phase 0으로 즉시 수정을 묶어 전체 로드맵에 포함
4. **분할 깊이**: 순수 구조 분리 vs 패턴 개선 포함 vs 전면 리팩토링 — 구조 분리 중심 + "분리 전제조건"인 패턴 개선만 예외적 포함

## 결정 사항 (Decisions Made)

| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | 모놀리스 분할을 최우선으로 | 4개 파일 합계 ~12,000줄이 유지보수성의 가장 큰 병목. 구조가 잡혀야 나머지 수정도 용이 | 논점 1 |
| 2 | 쉽고 독립적인 것부터: spec-viewer → main.ts → App.tsx → workspace-context | 성공 경험 축적 + 패턴 학습 + 점진적 난이도 증가. spec-viewer가 가장 독립적이고 workspace-context가 가장 의존성 높음 | 논점 2 |
| 3 | Phase 0(즉시 수정) + Phase 1~4(모놀리스 분할) 전체 포함 | 즉시 수정 가능한 보안/버그/데드코드는 별도 관리보다 통합 로드맵이 추적에 유리 | 논점 3 |
| 4 | 구조 분리 + 필수 패턴 개선만 예외 포함 | IPC 타입 통합(main.ts ↔ preload.ts 49개 중복)처럼 "분리 없이는 의미 없는 것"만 패턴 개선 포함. 나머지 로직은 그대로 이동 | 논점 4 |

## 미결 질문 (Open Questions)

- 없음

## 실행 항목 (Action Items)

| # | 항목 | 우선순위 | 설명 |
|---|------|---------|------|
| 1 | **Phase 0: Quick Fixes** | P0 | 보안(~5건) + 버그(~6건) + 정리(~5건) 즉시 수정 |
| 2 | **Phase 1: spec-viewer-panel.tsx 분할** | P1 | 2,246줄 → ~1,200줄. 헬퍼 함수 모듈화, HighlightedCodeBlock 추출, 중복 통합 |
| 3 | **Phase 2: main.ts 분할** | P2 | 3,511줄 → ~800줄. IPC 타입 공유 모듈(전제조건), 관심사별 5개 파일 분리, IPC 등록 테이블화 |
| 4 | **Phase 3: App.tsx 분할** | P3 | 2,627줄 → ~800줄. 4개 custom hook 추출 (comments, history, resize, external-app) |
| 5 | **Phase 4: workspace-context.tsx 분할** | P4 | 3,677줄 → ~800줄. 6개 custom hook 추출 + IPC boilerplate 헬퍼 도입(전제조건) |

---

## 상세 Phase 계획

### Phase 0: Quick Fixes (~20건)

**보안 즉시 수정:**
| 출처 | 발견 | 수정 내용 |
|------|------|----------|
| R3-F12 | `copy-ops.ts:58` startsWith 경로 비교 | `isPathInsideWorkspace`로 교체 |
| R3-F2 | `bootstrap.ts:144` heredoc 마커 충돌 | 빌드 시 마커 포함 여부 검증 테스트 추가 |
| R7-F1 | `file-tree-panel.tsx:432` 파일명 검증 불충분 | `\`, NUL, 제어문자 추가 차단 |
| R4-F6 | `markdown-security.ts:88` span style 무제한 허용 | CSS 속성 allowlist 도입 또는 style 제거 |
| R8-F2 | `file-clipboard.ts:91` Finder 경로 탈출 미검증 | destAbsolute 경로 탈출 검증 추가 |

**버그/안정성 즉시 수정:**
| 출처 | 발견 | 수정 내용 |
|------|------|----------|
| R2-F12 | `workspace-context.tsx:2854` 무한 루프 위험 | 최대 반복 횟수 추가 (1줄) |
| R6-F2 | `code-editor-panel.tsx:697` rAF 미취소 | `cancelAnimationFrame` cleanup 추가 |
| R6-F7 | `code-editor-panel.tsx:646` getCM6Language reject 미처리 | try-catch 추가 (1줄) |
| R3-F3 | `bootstrap.ts:265` ExecFileException.code 타입 불일치 | `error.status` 분기 추가 |
| R7-F2 | `file-tree-panel.tsx:768` CRUD 콜백 에러 미처리 | `.catch()` 추가 |
| R2-F4 | `workspace-context.tsx:3383` watcher 레이스 컨디션 | suppressSavedActiveFileRefresh를 업데이터 내부로 이동 |

**정리 (데드코드/오타):**
| 출처 | 발견 | 수정 내용 |
|------|------|----------|
| R1-F5 | `main.ts:3435` main-process-message 데드 코드 | 삭제 (3줄) |
| R3-F13 | `watch-ops.ts:236` 죽은 삼항 조건 | 단순화 |
| R3-F14 | `security.ts:37` MAX_REDATED 오타 | MAX_REDACTED로 rename |
| R6-F10 | `cm6-dark-theme.ts:185` darkTheme 미사용 별칭 | 확인 후 제거 |
| R7-F10 | `file-tree-panel.tsx:318` isExpanded 중복 체크 | 내부 중복 제거 |
| R2-F10 | `workspace-context.tsx:2965` 중복 함수 | hydrateExpandedDirectories/refreshWorkspaceDirectories 통합 |

### Phase 1: spec-viewer-panel.tsx (2,246줄 → ~1,200줄)

**목표**: 983줄의 모듈 레벨 헬퍼를 별도 파일로 추출, 컴포넌트 본체를 ~1,200줄로 축소.

**분할 대상:**
| 추출 대상 | 예상 파일 | 추출 LOC |
|----------|----------|---------|
| 코멘트 마커 매핑 로직 (L322-702) | `spec-viewer-comment-markers.ts` | ~380 |
| HighlightedCodeBlock (L768-982) | `highlighted-code-block.tsx` | ~215 |
| heading scroll 헬퍼 (L1417-1481, 1679-1716 중복 통합) | `spec-viewer-scroll.ts` | ~60 |
| 기타 순수 헬퍼 함수들 | 기존 모듈에 병합 또는 `spec-viewer-helpers.ts` | ~100 |

**중복 통합 (분리와 동시 수행):**
- `getElementDepth`: `source-line-resolver.ts`에서만 export, `spec-viewer-panel.tsx`에서 import
- `BRACKET_CITATION_PATTERN`: `citation-target.ts`에서 export
- Python 식별자 정규식 3개: `citation-target.ts`에서 export, `python-symbol-resolver.ts`에서 import

### Phase 2: main.ts (3,511줄 → ~800줄)

**전제조건 — IPC 타입 공유 모듈:**
- `electron/ipc-types.ts` 생성 — main.ts와 preload.ts의 ~49개 중복 타입을 한 곳으로 통합
- 양쪽에서 import하도록 변경
- Electron preload sandbox 제약 확인 필요 (빌드 시 타입만 추출 전략 검토)

**분할 대상:**
| 관심사 | 예상 파일 | 추출 LOC |
|--------|----------|---------|
| 타입 정의 (L100-424) | `electron/ipc-types.ts` (전제조건) | ~325 |
| 유틸리티 (L492-719) | `electron/workspace-utils.ts` | ~228 |
| 파일 트리 인덱싱 (L720-957) | `electron/workspace-indexing.ts` | ~237 |
| IPC 핸들러 직접 (L959-2010) | `electron/workspace-ipc-handlers.ts` | ~1,051 |
| 파일 시스템 워칭 (L2033-2528) | `electron/workspace-watchers.ts` | ~495 |
| Routed 핸들러 + 라우터 (L2646-2974) | `electron/workspace-ipc-routing.ts` | ~328 |

**IPC 등록 테이블화 (분리 전제조건):**
- `registerIpcHandlers`의 30쌍 반복 → 채널-핸들러 맵 객체 + 루프 등록
- 채널 이름 문자열 리터럴을 상수로 관리

**main.ts 잔류**: 앱 라이프사이클, createWindow, 리모트 에이전트 연결 초기화 (~800줄)

### Phase 3: App.tsx (2,627줄 → ~800줄)

**분할 대상:**
| 추출 대상 | 예상 hook 이름 | 추출 LOC |
|----------|---------------|---------|
| 코멘트 CRUD + 내보내기 (L667-1230) | `useCommentActions` | ~560 |
| 네비게이션/히스토리 (L1467-1982) | `useHistoryNavigation` | ~510 |
| 외부 앱 열기 (L1239-1380) | `useExternalAppOpener` | ~140 |
| 리사이즈 (L1385-1465) | `usePaneResize` | ~80 |

**App.tsx 잔류**: 상태 선언, 테마, 클립보드, 파일 트리 CRUD 핸들러, JSX 렌더링 (~800줄)

### Phase 4: workspace-context.tsx (3,677줄 → ~800줄)

**전제조건 — IPC boilerplate 헬퍼:**
- `executeTrackedIpcCall<T>(...)` 공통 헬퍼 도입
- requestId 관리, stale 체크, 에러 처리를 일원화
- 10회+ 반복되는 패턴을 한 곳으로

**분할 대상:**
| 추출 대상 | 예상 hook 이름 | 주요 기능 |
|----------|---------------|----------|
| 파일 I/O | `useWorkspaceFileOperations` | readFile, writeFile, createFile, deleteFile, rename |
| Git 데코레이션 | `useWorkspaceGitDecorations` | lineMarkers, fileStatuses 로드 |
| 코멘트 관리 | `useWorkspaceComments` | load/save comments, globalComments |
| 원격 연결 | `useWorkspaceRemote` | connect, disconnect, reconnect, banner |
| 파일 감시 | `useWorkspaceWatcher` | onWatchEvent, startWatch, stopWatch |
| 스냅샷 | `useWorkspaceSnapshot` | save/restore session, hydrate |

**WorkspaceProvider 잔류**: 상태 선언, useReducer, context value 조립, 각 hook 통합 (~800줄)

---

## 리서치 결과 요약 (Research Findings)

- 8개 리뷰 파일에서 총 85건+ 발견 사항 식별 (Critical 1, High ~18, Medium ~38, Low ~20, Info ~10)
- 4대 모놀리스 합계 ~12,061줄이 전체 코드베이스의 구조적 부채 핵심
- 리뷰 전반에서 반복되는 패턴: 코드 중복(Q4), 파일 크기(Q1), 비동기 패턴(Q8), 보안(Q7)
- 코드 품질은 전반적으로 높음 — 보안 방어, 비동기 패턴, 순수 함수 설계 등 긍정적 패턴 다수

## 토론 흐름 (Discussion Flow)

Round 1: 우선순위 축 선택 → 모놀리스 분할 우선
Round 2: 분할 순서 → 쉽고 독립적인 것부터 (spec-viewer → main.ts → App.tsx → workspace-context)
Round 3: 범위 결정 → Phase 0(즉시 수정) + Phase 1~4(분할) 전체 포함
Round 4: 분할 깊이 → 구조 분리 중심, 로직 변경 최소화
Round 5: 비판적 검토 → IPC 타입 통합 등 "분리 전제조건"인 패턴 개선은 예외적 포함
Round 6: 중간 요약 + 수렴 확인 → 정리

## 부록: 대화 로그 (Conversation Log)

### Round 1
**Q**: 리팩토링 계획의 최우선 목표가 뭔가요? 지금 가장 걱정되는 축은?
**Options**: 1) 보안 먼저 2) 모놀리스 분할 먼저 3) 버그 위험 먼저 4) 전부 종합해서
**A**: 모놀리스 분할 먼저
**Follow-up**: 4개 모놀리스 현황표 제시

### Round 2
**Q**: 4개 모놀리스를 어떤 순서로 분할할지 접근방식을 고르신다면?
**Options**: 1) 쉽고 독립적인 것부터 2) 핵심부터 공략 3) backend/frontend 분리 4) 전부 병렬로
**A**: 쉽고 독립적인 것부터
**Follow-up**: 순서 확정 (spec-viewer → main.ts → App.tsx → workspace-context)

### Round 3
**Q**: 리팩토링 계획에 즉시 수정 가능한 것들도 포함할까요?
**Options**: 1) 모두 포함 2) 모놀리스만
**A**: 모두 포함
**Follow-up**: Phase 0~4 구조 초안 제시

### Round 4
**Q**: 모놀리스 분할 시 각 Phase의 깊이를 어느 수준으로 가져갈까요?
**Options**: 1) 구조 분리만 2) 구조 + 패턴 개선 3) 전면 리팩토링
**A**: 구조 분리만
**Follow-up**: 비판적 검토 — "순수 구조 분리"의 한계 제기

### Round 5
**Q**: IPC 타입 통합 같은 "분리 전제조건"은 예외로 패턴 개선을 포함할까요?
**Options**: 1) 필수적인 것만 예외 2) 순수 구조 분리만
**A**: 필수적인 것만 예외
**Follow-up**: 중간 요약 제시

### Round 6
**Q**: 위 계획 구조로 정리해도 될까요?
**Options**: 1) 정리해줘 2) Phase 0 상세화 3) 모놀리스 분할 상세화 4) 테스트 전략 논의
**A**: 정리해줘
