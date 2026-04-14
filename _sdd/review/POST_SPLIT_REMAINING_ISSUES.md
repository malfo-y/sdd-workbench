# 모놀리스 분할 이후 남는 디버깅/개선 항목

**날짜**: 2026-04-14
**기준**: Phase 0(즉시 수정) + Phase 1~4(모놀리스 분할) 완료 후 잔여 항목
**출처**: `_sdd/review/` 아래 8개 리뷰 (R1~R8)

> Phase 0에서 처리되는 항목과 Phase 1~4 분할로 자연 해소되는 항목은 제외.
> 각 항목에 출처 리뷰와 원본 발견 번호를 명시.

---

## 1. 비동기/레이스 컨디션 (Q8)

구조 분리 후에도 로직 자체는 그대로이므로, 비동기 패턴 문제는 별도 수정 필요.

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| A1 | High | R2-F2 | workspace-context (→hook) | `loadWorkspaceSpec` — `void (async () => {})()` IIFE 패턴, 호출자가 완료/에러를 알 수 없음. async 함수로 전환 필요 |
| A2 | High | R2-F3 | workspace-context (→hook) | `loadWorkspaceFile` — 동일 IIFE 패턴 (~170줄 IIFE). async 함수로 전환 필요 |
| A3 | High | R2-F5 | workspace-context (→hook) | `onWatchEvent` useEffect — 콜백 재생성 시 이전 구독 해제↔새 구독 등록 사이 이벤트 유실 가능. 콜백을 useRef로 래핑하여 구독 생명주기 분리 필요 |
| A4 | Medium | R2-F7 | workspace-context (→hook) | `closeWorkspace` — `void disconnectRemoteWorkspace()` fire-and-forget, 에러 무시 |
| A5 | Medium | R2-F8 | workspace-context (→hook) | `closeWorkspace` — `void stopWorkspaceWatch()` fire-and-forget, 에러 무시 |
| A6 | Medium | R2-F11 | workspace-context (→hook) | 스냅샷 하이드레이션 — for 루프 안 연쇄 await, 워크스페이스 5개면 5번 직렬. `Promise.allSettled`로 병렬화 가능 |
| A7 | Medium | R3-F5 | transport-ssh.ts:250 | `this.process?.stdin.write(frame)` optional chaining — null이면 조용히 드롭, Promise는 타임아웃까지 pending. 즉시 reject로 변경 필요 |
| A8 | Medium | R4-F9 | spec-viewer (→별도 파일) | `HighlightedCodeBlock` highlight Promise — cleanup에서 `cancelled=true`만 설정, Promise 자체 미취소. 빠른 스크롤 시 누적 |
| A9 | Medium | R7-F6 | file-tree-panel.tsx:724 | 검색 에러가 조용히 빈 결과로 리셋 — 사용자에게 검색 실패 vs 결과 없음 구분 불가 |
| A10 | Medium | R7-F7 | file-tree-panel.tsx:604 | rootPath 변경 시 `searchRequestTokenRef` 미리셋 — 이전 워크스페이스 검색 응답이 새 워크스페이스에 표시될 수 있음 |
| A11 | Low | R4-F17 | spec-viewer-panel.tsx:1487 | `handleMarkdownLinkClick` 내 async IIFE 무음 catch — 디버깅 시 원인 파악 어려움 |
| A12 | Low | R2-F18 | workspace-persistence.ts:375 | `loadWorkspaceSessionSnapshot` 빈 catch — 파싱 오류 무시, 사용자 알림 없음 |

---

## 2. 보안 (Q7)

Phase 0에서 긴급한 것을 처리하지만, 아래 항목은 추가 보안 강화로 남음.

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| S1 | High | R3-F1 | bootstrap.ts:86-96 | `agentPath`를 probe 스크립트에 직접 삽입 — 현재 정규식으로 안전하지만 defense-in-depth 부족. `shellEscape` 적용 권장 |
| S2 | Medium | R3-F4 | transport-ssh.ts:489 | SSH 인자에 `profile.user`, `profile.host`가 `-`로 시작하면 SSH 옵션으로 해석됨 (option injection). `--` 구분자 또는 `-` 시작 거부 필요 |
| S3 | Medium | R4-F7 | spec-viewer-panel.tsx:973 | `dangerouslySetInnerHTML` — `token.color`에 대한 명시적 hex color 검증 없음. Shiki 외 경로로 토큰 생성 시 attribute injection 가능 |
| S4 | Medium | R8-F3 | file-clipboard.ts:206 | 내부 클립보드 paste — source/target rootPath가 다른 워크스페이스일 때 교차 복사 무검증. 동일성 검사 추가 필요 |
| S5 | Medium | R7-F5 | file-tree-panel.tsx:1029 | Delete 액션에 확인 다이얼로그 책임이 소비자(App.tsx)에만 있고, FileTreePanel 계약에 명시 안 됨 |
| S6 | Low | R8-F7 | system-open.ts:148 | `buildRemoteItermCommand`에서 호스트명 `-`로 시작 시 SSH 옵션 해석 가능 (R3-F4와 동일 패턴) |
| S7 | Low | R4-F13 | markdown-security.ts:118 | 비이미지 `data:` URI 처리 흐름이 복잡 — 현재 안전하지만 수정 시 실수 가능. `data:` 비이미지를 BLOCKED에 명시 추가 권장 |
| S8 | Low | R4-F15 | markdown-security.ts:6 | `DATA_IMAGE_URI_PATTERN`에 `\s` 허용 — base64 내 개행 포함 가능. 이론적 위험 |
| S9 | Low | R1-F12 | main.ts:548 | `writeFileAtomic` temp 파일 이름 예측 가능 (pid+timestamp). `crypto.randomUUID()` 사용 고려 |

---

## 3. 에러 핸들링 (Q2)

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| E1 | Medium | R1-F7 | main.ts:547 | `writeFileAtomic` — `rename` 실패 시 `.tmp` 파일 잔류. finally에서 unlink 필요 |
| E2 | Medium | R1-F4 | main.ts:1722 | `JSON.parse` 결과를 `CodeCommentRecord[]`로 unsafe cast — `Array.isArray`만으로 각 요소 미검증. 최소 필수 필드 검증 추가 |
| E3 | Medium | R3-F6 | connection-service.ts:405 | `safeUpdateState` 빈 catch — 예기치 않은 에러도 함께 삼킴. debug 로깅 추가 |
| E4 | Medium | R8-F5 | remote-workspace-backend.ts:310 | `requestWorkspaceMethod` — 모든 에러를 RemoteAgentError로 재래핑, 원본 스택 유실. 개발 모드에서 redact 생략 옵션 |
| E5 | Low | R1-F13 | main.ts:3178 | `queueRemoteAgentLog` `.catch(() => undefined)` 무음 실패 — throttled warning 추가 고려 |

---

## 4. 메모리 누수 / 리소스 관리 (Q9)

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| M1 | Medium | R3-F7 | connection-service.ts:424 | `cleanupWorkspaceTransport`에서 `externalAgentListenersByWorkspaceId` 무조건 삭제 — reconnect 루프 중 호출 시 리스너 소실. 최종 disconnect에서만 삭제하도록 분리 |
| M2 | Medium | R6-F1 | code-editor-panel.tsx:559 | EditorView 생성/파괴가 `showEditor` 토글에 과민 반응 — view를 숨기되 파괴하지 않는 방안 검토 |
| M3 | Medium | R6-F9 | syntax-highlight.ts:72 | Shiki HighlighterCore 인스턴스 영구 보유 — `disposeHighlighters()` 함수 노출하여 workspace 전환 시 정리 가능하도록 |
| M4 | Medium | R6-F5 | code-editor-panel.tsx:527 | Concurrent Mode에서 ref.current 직접 대입 — useEffect 안에서 대입하면 commit phase에서만 실행되므로 안전 |

---

## 5. 코드 중복 (Q4)

구조 분리만으로는 해소되지 않는 중복. Phase 1에서 일부 해결되지만 나머지는 별도 작업.

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| D1 | High | R1-F2 | main.ts (→routing 파일) | Routed 핸들러 18개 동일 패턴 복붙 (~267줄). 제네릭 팩토리 함수로 추출 |
| D2 | Medium | R8-F6 | remote-workspace-backend.ts:95 | RemoteWorkspaceBackend 18개 메서드 동일 패턴 — 라우팅 테이블 방식으로 리팩토링 |
| D3 | Medium | R1-F8 | main.ts (→handlers 파일) | 파일 I/O 핸들러 7개의 경로 검증 보일러플레이트 반복 (~70-100줄). 공통 유틸 `resolveAndValidateWorkspacePath` 추출 |
| D4 | Medium | R3-F8 | bootstrap.ts / transport-ssh.ts / directory-browser.ts | SSH 유틸리티 함수 3중 복제 (`shellEscape`, `appendIdentityArgs`, `getNumericExitCode`, `isSshAuthFailure`). `ssh-utils.ts`로 통합 |
| D5 | Medium | R4-F2 | spec-viewer-panel.tsx (→분할 후) | `renderBlockWithSourceLine` 13회 반복 호출. 팩토리 함수 `buildBlockComponent(tagName, options)` 도입 |
| D6 | Medium | R8-F4 | remote-workspace-backend.ts:251 | `watchStop`/`dispose` 동일 try/catch 블록 중복. 공통 헬퍼 추출 |
| D7 | Medium | R7-F8 | file-tree-panel.tsx:297,404 | git badge 텍스트/title 결정 로직 directory·file 양쪽 반복. `<GitStatusBadge>` 컴포넌트 추출 |
| D8 | Medium | R6-F8 | code-editor-panel.tsx:124 + language-map.ts:5 | `getDisplayLanguage` DISPLAY_MAP과 `EXTENSION_LANGUAGE_MAP` 불일치. 동일 맵 참조로 통합 |
| D9 | Medium | R6-F6 | code-editor-panel.tsx:568,652 | `buildExtensions` 호출 중복 — langSupport 유/무 차이. 주석으로 의도 명시 |
| D10 | Low | R8-F10 | local-workspace-backend.ts:25 | `LocalWorkspaceBackendHandlers` ≈ `WorkspaceBackend` 중복. `Omit<WorkspaceBackend, 'kind' | 'dispose'>` 사용 |
| D11 | Low | R4-F12 | source-line-resolver.ts:23-71 | `normalizeSourceLine`과 `normalizeSourceOffset` 거의 동일 (차이: `>= 1` vs `>= 0`) |
| D12 | Low | R2-F16 | workspace-model.ts:580-724 | `renameWorkspaceSessionPaths`와 `removeWorkspaceSessionPaths` 유사 순회 패턴 |
| D13 | Low | R2-F21 | remote-connect-modal.tsx:50 | `isRecord`, `toDraftStringField` — workspace-persistence.ts에도 유사 유틸 존재 |

---

## 6. 타입 안전성 (Q3)

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| T1 | Medium | R1-F6 | main.ts:2646 | `DUMMY_IPC_EVENT = {} as IpcMainInvokeEvent` — 핸들러 시그니처에서 `_event` 제거하고 이벤트 없는 인터페이스 사용 |
| T2 | Medium | R3-F11 | workspace-ops.ts:713,739,809 등 | `(error as NodeJS.ErrnoException).code` 5곳 반복 — `isErrnoException()` 타입 가드 도입 |
| T3 | Medium | R2-F14 | workspace-context.tsx:59-141 | `WorkspaceContextValue` 40+ 프로퍼티 flat 나열 — `state`/`actions`/`remote` 그룹화 |
| T4 | Low | R8-F11 | types.ts:141-174 | `WorkspaceBackend` 모든 메서드 `Promise<unknown>` 반환 — 구체적 반환 타입으로 점진 마이그레이션 |
| T5 | Low | R3-F16 | transport-ssh.ts:242 | `resolve(value as TResult)` — 런타임 검증 없는 제네릭 캐스팅 |
| T6 | Low | R4-F14 | spec-viewer-panel.tsx:226,307 | `props as Record<string, unknown>` unsafe cast |
| T7 | Low | R2-F17 | workspace-persistence.ts:217 | `as unknown as` 이중 캐스팅 — 직접 Storage API 호출로 단순화 |
| T8 | Low | R5-F3 | comment-persistence.ts:19,75 | `as Record<string, unknown>` unsafe assertion — 현재 안전하지만 스타일 주의 |

---

## 7. 엣지 케이스 (Q10)

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| X1 | Medium | R5-F1 | comment-persistence.ts:30 | `parseAnchor` — `Number()` 변환 시 NaN 미검증, 하위 함수 방어에 의존. NaN 체크 추가 |
| X2 | Medium | R5-F2 | comment-persistence.ts:96 | `parseComment` — 동일 NaN 패턴. non-numeric 문자열 시 skip 처리 |
| X3 | Medium | R3-F10 | workspace-ops.ts:709 | `workspaceCreateFile` stat → ENOENT 분기에서 RemoteAgentError도 재throw — 우연히 동작. catch 블록에서 RemoteAgentError 먼저 필터링 |
| X4 | Medium | R3-F12 | copy-ops.ts:58 | `startsWith` 경로 비교 — `/workspace-root-extra/` 같은 접두사 일치 false positive. **Phase 0에서 처리 예정이나 L71도 동일 문제** |
| X5 | Medium | R4-F11 | source-line-resolver.ts:214 | `estimateLineFromSpanOffset` — 라인 길이 균등 가정. 알려진 한계, 함수명으로 표현됨 |
| X6 | Medium | R2-F13 | workspace-context.tsx:1545 | `setBannerMessage`에 함수 인자 전달 — 일반 문자열 set과 혼용 |
| X7 | Low | R6-F3 | code-editor-panel.tsx:559 | EditorView 초기 extension과 prop 불일치 — eslint-disable 주석에 이유 명시 필요 |
| X8 | Low | R5-F4 | comment-anchor.ts:111 | 빈 파일에서 앵커 생성 — snippet이 빈 문자열, 의미 없는 매칭 가능 |
| X9 | Low | R7-F9 | file-tree-panel.tsx:776 | `fullRelativePath` 생성 시 trailing `/` edge case |
| X10 | Low | R7-F11 | copy-payload.ts:44 | `rootPath.includes('\\')` Windows 판별 한계 |
| X11 | Low | R1-F14 | main.ts:1593 | Git `rev-parse` 2회 연속 호출 비효율 — 단일 호출로 합치기 |
| X12 | Low | R2-F24 | workspace-context.tsx:1577 | openDialog canceled인데 result.error 시 에러 표시 — UX 혼란 가능 |

---

## 8. 네이밍 일관성 (Q5)

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| N1 | Medium | R1-F9 | main.ts:605 | `ensurePathWithinWorkspace` — boolean 반환인데 `ensure` 네이밍. `isResolvedPathWithinWorkspace`로 변경 |
| N2 | Low | R2-F20 | workspace-context.tsx, workspace-model.ts | `getActiveIsDirty` / `getWorkspaceIsDirtyCompatibility` / `deriveWorkspaceIsDirtyCompatibility` — isDirty 함수 3개 혼란 |
| N3 | Low | R6-F13 | code-editor-panel.tsx:30 | `CodeViewerJumpRequest` 레거시 이름 — `CodeEditor*`로 통일 |
| N4 | Low | R6-F14 | code-editor-panel.tsx:854 | CSS 클래스 `code-viewer-*` 레거시 — 변경 시 영향 범위 넓음 |
| N5 | Low | R2-F23 | workspace-model.ts:315 | `markWorkspaceDocumentDirtyCompatibility` — "Legacy compatibility" 장기 유지 의도 불명확 |
| N6 | Info | R3-F19 | request-router.ts:45, security.ts:49 | `PATH_DENIED` 에러 코드가 경로 거부/메서드 미허용/디렉토리 거부에 재사용 — `METHOD_NOT_ALLOWED` 추가 검토 |
| N7 | Info | R8-F14 | copy-entries.ts | 모듈명이 local-only 전용이지만 이름에 드러나지 않음 |

---

## 9. 파일/함수 크기 (Q1) — 4대 모놀리스 외

모놀리스 분할로 4대 파일은 해결되지만, 아래 파일/함수는 별도.

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| L1 | Medium | R6-F4 | code-editor-panel.tsx | 1,082줄 — hover/jump/search/context menu 로직을 custom hook으로 추출 가능 |
| L2 | Medium | R3-F9 | workspace-ops.ts | 1,032줄, 17개 exported 함수 — 기능 그룹별 분리 (index/file/git/comment) |
| L3 | Medium | R7-F4 | file-tree-panel.tsx:225 | `renderFileTreeNodes` 파라미터 13개 — options 객체 패턴으로 리팩토링 |
| L4 | Info | R5-F7 | comment-list-modal.tsx:49 | 617줄 단일 함수 — global comments 편집 섹션, 선택 로직 분리 가능 |
| L5 | Info | R4-F8 | spec-viewer-panel.tsx (→분할 후) | `markdownComponents` useMemo 265줄 — 팩토리 패턴으로 축소 (D5와 연계) |
| L6 | Low | R1-F11 | main.ts (→분할 후) | `createWindow` 113줄 — 히스토리 내비게이션, 윈도우 상태 관리 분리 |
| L7 | Low | R2-F19 | workspace-context (→hook) | `loadWorkspaceFile` 330줄 — draft 재사용/IPC 읽기 경로 분리 |
| L8 | Low | R2-F15 | workspace-context (→hook) | `loadWorkspaceIndex` 의존성 배열 `[]`이지만 hydrateExpandedDirectories 호출 — ESLint 경고 가능 |

---

## 10. 테스트 커버리지 (Q11)

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| C1 | Info | R1-F16 | main.ts (→분할 후 각 파일) | main.ts 핵심 핸들러 테스트 없음 — 경로 탈출 차단, 바이너리 감지, 파일 크기 제한 등 보안 경로 테스트 추가 |
| C2 | Info | R2-F22 | workspace-context (→hook 분할 후) | 3,677줄 핵심 상태 관리 테스트 없음 — hook 분리 후 각 hook 단위 테스트 |
| C3 | Info | R3-F17 | watch-ops.test.ts | 78줄로 RuntimeWatchService 커버리지 얕음 — diff 알고리즘, symlink cycle, 경계값 테스트 |
| C4 | Info | R3-F18 | workspace-ops.test.ts | 241줄로 17개 함수 대비 sparse — rename, 이미지 프리뷰, 바이너리 감지 엣지 케이스 |
| C5 | Info | R4-F18 | spec-viewer-panel (→분할 후) | 983줄 헬퍼 함수 단위 테스트 부재 |
| C6 | Info | R5-F9 | comment-hover-popover.tsx | 130줄 UI 컴포넌트 테스트 없음 — 위치 클램핑 순수 함수 분리 후 테스트 |
| C7 | Info | R8-F13 | file-clipboard.ts | `pasteFinderFiles` 경로 탈출 단위 테스트 미확인 |

---

## 11. 데드 코드 (Q6) — Phase 0 이후 잔여

| # | 심각도 | 출처 | 위치 | 설명 |
|---|--------|------|------|------|
| Z1 | Info | R4-F19 | spec-viewer-panel.tsx:148 | `BLOCKED_RESOURCE_PLACEHOLDER_TEXT` — 사용자에게 의미 없는 내용 |

---

## 요약 통계

| 카테고리 | High | Medium | Low | Info | 합계 |
|---------|------|--------|-----|------|------|
| 비동기/레이스 (Q8) | 3 | 5 | 2 | 2 | 12 |
| 보안 (Q7) | 1 | 4 | 4 | 0 | 9 |
| 에러 핸들링 (Q2) | 0 | 4 | 1 | 0 | 5 |
| 메모리 누수 (Q9) | 0 | 4 | 0 | 0 | 4 |
| 코드 중복 (Q4) | 1 | 8 | 4 | 0 | 13 |
| 타입 안전성 (Q3) | 0 | 2 | 4 | 2 | 8 |
| 엣지 케이스 (Q10) | 0 | 5 | 5 | 2 | 12 |
| 네이밍 (Q5) | 0 | 1 | 4 | 2 | 7 |
| 파일/함수 크기 (Q1) | 0 | 3 | 3 | 2 | 8 |
| 테스트 (Q11) | 0 | 0 | 0 | 7 | 7 |
| 데드 코드 (Q6) | 0 | 0 | 0 | 1 | 1 |
| **합계** | **5** | **36** | **27** | **18** | **86** |

## 권장 우선순위 (모놀리스 분할 이후)

1. **즉시 (High)**: A1~A3 비동기 패턴, S1 bootstrap injection, D1 routed 핸들러 팩토리
2. **단기 (Medium 중 영향 큰 것)**: D4 SSH 유틸 통합, E1~E2 에러 핸들링, M1 리스너 소실, X1~X2 NaN 전파
3. **중기 (Medium 나머지)**: D2~D3 코드 중복, T1~T3 타입 안전성, L1~L3 추가 파일 크기 축소
4. **장기 (Low/Info)**: 네이밍 정리, 테스트 보강, 엣지 케이스 방어
