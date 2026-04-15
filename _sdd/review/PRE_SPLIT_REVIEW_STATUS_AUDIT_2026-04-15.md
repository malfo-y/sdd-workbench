# Pre-Split Review Status Audit

**Audit Date**: 2026-04-15
**Scope**: `_sdd/review/*.md` 중 `POST_SPLIT_*` 제외
**Audit Basis**: current codebase, `_sdd/spec`, `npm test`, `npm run lint`
**Status Legend**:

- `Fixed`: 원래 지적한 패턴이 현재 코드에서 실질적으로 해소됨
- `Partial`: 일부 완화되었지만 핵심 우려 또는 일부 하위 이슈가 남아 있음
- `Open`: 현재 코드에도 동일하거나 본질적으로 유사한 문제가 남아 있음
- `Info`: 정보성 항목이며 상태만 메모

## Verification Summary

- `npm test`: PASS (`79` files, `899` passed, `1` skipped)
- `npm run lint`: PASS
- 대형 모놀리스 분해는 전반적으로 진행되었으나, 세부 리스크와 일부 타입/중복/보안 후속 이슈는 잔존

## app-shell-and-backend.md

| Finding | Status | Current Evidence | Notes |
|---|---|---|---|
| F1 | Fixed | `src/App.tsx`는 `909` LOC이고 `useCommentActions`, `useHistoryNavigation`, `usePaneResize`, `useExternalAppOpener`로 분리됨 | 원래의 2k+ LOC God component 상태는 해소됨 |
| F2 | Partial | `electron/file-clipboard.ts`에 destination root 검증 추가 | Finder source 자체에 대한 symlink/dereference 추가 방어는 없음 |
| F3 | Fixed | `electron/file-clipboard.ts`가 internal paste 시 source/target root 동일성 검사 | 교차 워크스페이스 paste는 차단됨 |
| F4 | Open | `electron/workspace-backend/remote-workspace-backend.ts`의 `watchStop`/`dispose` 중복 지속 | 동일 try/catch 블록이 그대로 남아 있음 |
| F5 | Open | `requestWorkspaceMethod()`가 여전히 `RemoteAgentError`로 재래핑하고 redaction 적용 | 원본 디버그 맥락 손실 우려 유지 |
| F6 | Partial | `forwardRootWorkspaceMethod`, `forwardDirectoryWorkspaceMethod`, `forwardRelativePathWorkspaceMethod` 도입 | 반복은 줄었지만 메서드별 boilerplate는 상당수 유지 |
| F7 | Fixed | `electron/system-open.ts`의 `normalizeRemoteSshValue()`가 `-` 시작/공백/제어문자 차단 | 원래 지적한 host/user 인자 검증 공백은 해소 |
| F8 | Fixed | `buildRemoteItermCommand()`는 `parts.map(quoteShellArgument)` 유지 | `identityFile` 포함 전체 인자가 quote 처리됨 |
| F9 | Partial | `App.tsx`는 작아졌지만 여전히 단일 진입 컴포넌트 | stale closure 우려는 낮아졌지만 완전 소거는 아님 |
| F10 | Open | `electron/workspace-backend/local-workspace-backend.ts`의 `LocalWorkspaceBackendHandlers` 중복 타입 유지 | `WorkspaceBackend`와 실질적으로 같은 shape |
| F11 | Fixed | `electron/workspace-backend/types.ts`가 `WorkspaceBackendMethodMap` 기반 제네릭 반환 타입 사용 | `Promise<unknown>` 기반 인터페이스 문제는 해소 |
| F12 | Fixed | export/comment 로직이 `src/hooks/use-comment-actions.ts`로 이동 | 원래 `handleExportComments` 장문 콜백은 분해됨 |
| F13 | Fixed | `electron/file-clipboard.test.ts`에 paste 경로 관련 테스트 다수 추가 | 테스트 부재 지적은 해소 |
| F14 | Open | `electron/workspace-backend/copy-entries.ts` 이름은 그대로 | local-only 성격을 이름이 여전히 드러내지 않음 |

## code-comments.md

| Finding | Status | Current Evidence | Notes |
|---|---|---|---|
| F1 | Fixed | `src/code-comments/comment-persistence.ts`의 `parseOptionalFiniteNumber()`가 비유한 숫자를 `null` 처리 | NaN 전파 문제 해소 |
| F2 | Fixed | `parseRequiredFiniteLineNumber()`가 비유한 line 값을 `null` 처리 후 skip | NaN line 강제 보정 문제 해소 |
| F3 | Open | `parseAnchor()`/`parseComment()`에서 `as Record<string, unknown>` 유지 | unsafe assertion 패턴 자체는 남아 있음 |
| F4 | Open | `src/code-comments/comment-anchor.ts`는 빈 파일에서도 빈 `snippet` 생성 가능 | crash는 없지만 edge case는 그대로 |
| F5 | Open | 해시 함수는 여전히 `hashFnv1a()` 32-bit | 충돌 가능성 지적은 본질적으로 유지 |
| F6 | Open | `mapCommentCountsToRenderedSourceLines()`와 `mapCommentEntriesToRenderedSourceLines()` 구조 유사 | 공통화되지는 않음 |
| F7 | Open | `src/code-comments/comment-list-modal.tsx`는 여전히 `666` LOC | 대형 단일 컴포넌트 상태 유지 |
| F8 | Open | Escape key 핸들링이 `comment-list-modal`, `comment-editor-modal`, `global-comments-modal`, `export-comments-modal`, `comment-hover-popover`, `comment-marker-detail-panel` 등에 반복 | 패턴 중복 유지 |
| F9 | Fixed | `src/code-comments/comment-hover-popover.test.tsx` 추가 | 테스트 부재 지적 해소 |
| F10 | Open | `findMostRecentCommentInSelectionRange()`는 여전히 line range 순회 방식 | 넓은 범위에서 선형 스캔 구조 유지 |

## code-editor.md

| Finding | Status | Current Evidence | Notes |
|---|---|---|---|
| F1 | Fixed | EditorView 생성 effect가 `showEditor`가 아니라 `shouldMountEditor` 기준 | 토글에 따른 불필요한 destroy/recreate 우려 해소 |
| F2 | Fixed | update effect가 `cancelled`와 `cancelAnimationFrame`을 함께 사용 | 원래 RAF 경합 리스크는 크게 낮아짐 |
| F3 | Fixed | wrap/theme는 별도 reconfigure effect로 반영 | 초기 prop 캡처 문제 해소 |
| F4 | Open | `src/code-editor/code-editor-panel.tsx`는 `1093` LOC | 여전히 큰 단일 컴포넌트 |
| F5 | Open | `onCommentHoverRef.current`와 `onCommentLeaveRef.current`를 렌더 시 직접 대입 | ref assignment 패턴은 유지 |
| F6 | Partial | `buildExtensions()` 2단계 호출은 남아 있으나 theme/wrap mismatch는 줄어듦 | 구조상 중복은 유지 |
| F7 | Fixed | `getCM6Language()` 호출은 `try/catch`로 감쌈 | reject 시 unhandled promise 문제 해소 |
| F8 | Open | `getDisplayLanguage()`와 `getCM6Language()`용 map은 여전히 분리 | 언어 매핑 중복 유지 |
| F9 | Partial | `disposeHighlighterCache()`는 추가됐지만 호출부는 없음 | 영구 캐시 완화 장치는 생겼으나 실제 lifecycle 연동은 없음 |
| F10 | Fixed | `darkTheme` 별칭 export는 제거되고 `darkGrayTheme`만 남음 | dead alias 정리 |
| F11 | Partial | CM6 map과 Shiki map은 여전히 독립 | 의도적 분리일 수 있으나 문서화 부족 |
| F12 | Open | `syntax-highlight.ts`에 `if (language === 'plaintext' || !code)` 유지 | 빈 문자열/undefined 완화 지적은 남음 |
| F13 | Open | 타입명 `CodeViewerJumpRequest` 유지 | 리네이밍 잔재 지속 |
| F14 | Open | CSS/test id/className이 여전히 `code-viewer-*` | 컴포넌트명과 클래스명 불일치 유지 |
| F15 | Fixed | `src/code-editor/code-editor-panel.test.tsx`가 풍부한 커버리지 유지 | 정보성 항목, 상태 양호 |
| F16 | Fixed | `src/code-viewer/syntax-highlight.test.ts` 유지 | 정보성 항목, 상태 양호 |

## electron-main.md

| Finding | Status | Current Evidence | Notes |
|---|---|---|---|
| F1 | Fixed | 공유 타입이 `electron/ipc-types.ts`로 분리되어 `main.ts`, `preload.ts`에서 import 사용 | main/preload 타입 중복 해소 |
| F2 | Fixed | routed handler boilerplate가 `electron/workspace-ipc-routing.ts`로 이동 | main.ts의 복붙 문제 해소 |
| F3 | Fixed | `electron/main.ts`는 현재 `424` LOC | 3.5k LOC 모놀리스 상태 종료 |
| F4 | Fixed | comments 파싱은 `electron/comment-storage.ts`로 이동 | `JSON.parse` unsafe cast 문제는 정리됨 |
| F5 | Fixed | `main-process-message` 이벤트 사용 흔적 없음 | dead code 제거된 상태 |
| F6 | Open | `electron/workspace-ipc-routing.ts`에 `DUMMY_IPC_EVENT = {} as IpcMainInvokeEvent` 유지 | 위치만 이동했을 뿐 unsafe assertion은 남음 |
| F7 | Fixed | `electron/atomic-write.ts`가 실패 시 temp file cleanup 수행 | 원래 cleanup 누락 지적 해소 |
| F8 | Fixed | 파일 I/O 핸들러가 `workspace-ipc-handlers.ts`로 추출 | main.ts 기준 중복 해소 |
| F9 | Open | `ensurePathWithinWorkspace()`는 여전히 boolean 반환 | 이름-동작 불일치 유지 |
| F10 | Fixed | `registerIpcHandlers()`는 channel/handler 매핑 테이블 사용 | remove/handle 반복 해소 |
| F11 | Partial | `createWindow` 자체는 축소됐지만 여전히 main 내부 핵심 함수 | 원래 심각도는 낮아져 사실상 완화 |
| F12 | Fixed | temp 파일명은 `randomUUID()` 기반 | 예측 가능성 문제 해소 |
| F13 | Open | `queueRemoteAgentLog()`가 여전히 `.catch(() => undefined)` 사용 | 무음 실패 패턴 유지 |
| F14 | Open | `rev-parse` 연속 호출이 local/remote git status 경로에 여전히 존재 | 효율성 지적 잔존 |
| F15 | Fixed | 타입 정의 대다수가 별도 모듈로 이동 | main.ts 상단 325줄 타입 블록 문제 해소 |
| F16 | Partial | `main.ts` 직접 테스트는 없지만 `workspace-ipc-routing`, `workspace-ipc-handlers`, `file-clipboard` 등 분리 모듈 테스트 존재 | coverage 방식은 개선, direct test는 여전히 없음 |

## file-tree.md

| Finding | Status | Current Evidence | Notes |
|---|---|---|---|
| F1 | Partial | `validateInlineInputName()`가 `/`, `\\`, `.`, `..`, control chars 차단 | OS 예약어까지 막지는 않아 완전 해소는 아님 |
| F2 | Fixed | `submitInlineInput()`가 `guardPromise(...).catch(handleError)` 사용 | async rejection 미처리 문제 해소 |
| F3 | Open | `src/file-tree/file-tree-panel.tsx`는 현재 `1244` LOC | 오히려 더 커진 상태 |
| F4 | Open | `renderFileTreeNodes()` 다수 인자 구조 유지 | positional parameter 과다 문제 지속 |
| F5 | Partial | prop 이름이 `onRequestConfirmedDelete*`로 바뀌어 confirm 책임은 더 명확해짐 | 삭제 확인 책임은 여전히 호출자 의존 |
| F6 | Fixed | 검색 실패 시 `Search failed. Please try again.`를 UI state에 기록 | 무음 초기화 문제 해소 |
| F7 | Fixed | `rootPath` effect에서 `searchRequestTokenRef.current += 1` 수행 | stale search 응답 위험 해소 |
| F8 | Open | git badge text/title 로직 중복 정리 흔적 없음 | 반복 패턴 잔존 |
| F9 | Partial | 즉시 오류로 이어지지는 않지만 경로 조합 edge case 방어 강화는 제한적 | 큰 위험은 아님 |
| F10 | Open | 불필요한 조건 분기 정리는 별도 확인되지 않음 | low-level cleanup 미진행 |
| F11 | Open | `buildCopyFullPathPayload()`는 여전히 `rootPath.includes('\\\\')`로 separator 판단 | macOS 경로 특수 케이스 지적 잔존 |
| F12 | Open | context menu action 조립은 여전히 컴포넌트 내부에 남음 | 가독성용 추출 미실시 |
| F13 | Fixed | `src/file-tree/file-tree-panel.test.tsx` 대형 테스트 스위트 유지 | 정보성 항목, 상태 양호 |

## remote-agent.md

| Finding | Status | Current Evidence | Notes |
|---|---|---|---|
| F1 | Fixed | `buildProbeAgentScript()`가 `shellEscapeRemotePath()` 결과를 변수 할당 후 사용 | 직접 삽입형 injection 우려 해소 |
| F2 | Open | `buildInstallAgentScript()`는 여전히 heredoc으로 payload 설치 | EOF marker 충돌 리스크 구조는 유지 |
| F3 | Fixed | `extractNumericExitCode()`가 `number`와 `status`를 모두 처리 | exec exception 타입 불일치 완화 |
| F4 | Fixed | `ssh-utils.ts`의 `assertSafeSshDestinationValue()`가 host/user 검증 | user/host 미이스케이프 문제 해소 |
| F5 | Fixed | `transport-ssh.ts`가 `stdin` 존재/파괴/writable 여부를 먼저 검사 | 무음 드롭 패턴 제거 |
| F6 | Fixed | `safeUpdateState()`는 stale 외에는 `console.warn` 남김 | 완전 무음 catch 문제 해소 |
| F7 | Fixed | `cleanupWorkspaceTransport(..., { preserveExternalListeners: true })` 도입 | disconnect와 listener 정리 구분 가능 |
| F8 | Fixed | SSH 공통 로직이 `ssh-utils.ts`로 모임 | 3중 복제 상당 부분 해소 |
| F9 | Open | `electron/remote-agent/runtime/workspace-ops.ts`는 여전히 `1039` LOC | God file 지적 유지 |
| F10 | Open | `workspaceCreateFile()`의 stat/ENOENT 분기 구조 유지 | edge case 정리 미흡 |
| F11 | Open | `workspace-ops.ts`에 `(error as NodeJS.ErrnoException).code` 반복 유지 | unsafe assertion 지속 |
| F12 | Fixed | `runtime/copy-ops.ts`가 `normalizedRoot + path.sep` 기준 비교 | 접두사 false positive 문제 해소 |
| F13 | Fixed | `watch-ops.ts`의 죽은 삼항 조건은 제거됨 | 단순 cleanup 완료 |
| F14 | Fixed | 상수명은 `MAX_REDACTED_MESSAGE_LENGTH`로 수정됨 | 오타 해소 |
| F15 | Open | `directory-browser.ts`의 `parseErrorCode()` if 체인 유지 | 더 간결한 구조로 정리되지는 않음 |
| F16 | Open | `transport-ssh.ts`의 request generic cast는 유지 | 런타임 검증 없는 `as TResult` 지속 |
| F17 | Partial | `watch-ops.test.ts`는 여전히 `78` LOC로 얕지만, 기본 smoke는 존재 | coverage 개선 여지는 큼 |
| F18 | Partial | `workspace-ops.test.ts`는 `331` LOC로 이전보다 확장 | 큰 파일 대비 충분하다고 보긴 어려움 |
| F19 | Fixed | runtime request-router는 `METHOD_NOT_ALLOWED`를 명시 사용 | `PATH_DENIED` 의미 과부하 문제 해소 |

## spec-viewer.md

| Finding | Status | Current Evidence | Notes |
|---|---|---|---|
| F1 | Partial | `spec-viewer-panel.tsx`는 `1441` LOC로 줄었고 helper가 `spec-viewer-helpers.ts`, `spec-viewer-scroll.ts`, `highlighted-code-block.tsx` 등으로 분리 | 여전히 큰 단일 패널 파일 |
| F2 | Partial | `renderBlockWithSourceLine()`는 `spec-viewer-helpers.ts`로 추출 | panel 내부의 13회 호출 패턴은 남아 있음 |
| F3 | Fixed | `getElementDepth()`는 `source-line-resolver.ts` 단일 정의를 다른 모듈이 import 사용 | 중복 제거 완료 |
| F4 | Fixed | Python identifier regex는 `citation-target.ts` canonical 정의 사용 | 정규식 중복 제거 |
| F5 | Fixed | `remark-citation-links.ts`가 `code-block-citation.ts`의 `BRACKET_CITATION_PATTERN` import | 정규식 중복 제거 |
| F6 | Fixed | `markdown-security.ts`에서 `span`에 style 허용을 명시 추가하지 않음 | 무제한 style 허용 지적 해소 |
| F7 | Open | `highlighted-code-block.tsx`에 `dangerouslySetInnerHTML` 유지 | 보호 장치가 있어도 surface는 남아 있음 |
| F8 | Partial | markdown rendering 보조 로직이 일부 분리됨 | `spec-viewer-panel.tsx` 내부 JSX/컴포넌트 매핑은 여전히 큼 |
| F9 | Open | highlight async effect는 `cancelled` flag만 사용 | Promise 자체 취소는 여전히 없음 |
| F10 | Fixed | heading scroll 로직이 `spec-viewer-scroll.ts`의 `scrollToHeadingById()`로 공통화 | 중복 해소 |
| F11 | Open | `estimateLineFromSpanOffset` 근사 알고리즘에 대한 구조 변경 확인 안 됨 | 한계는 그대로 |
| F12 | Open | normalize helper 중복 정리는 확인되지 않음 | low-level cleanup 미실시 |
| F13 | Fixed | `markdown-security.test.ts`가 `data:text/html` 차단을 검증 | 비이미지 data URI 통과 우려 해소 |
| F14 | Open | `spec-viewer-helpers.ts`에서 `props as { ... }` 캐스팅 유지 | unsafe cast 패턴 지속 |
| F15 | Open | `DATA_IMAGE_URI_PATTERN`은 여전히 `\\s` 허용 | 원래 regex 관용 문제 유지 |
| F16 | Open | DOM query 후 `Array.from` 사용 패턴 지속 | 대문서 성능 미세 이슈는 남음 |
| F17 | Open | `handleMarkdownLinkClick()` 내부 async IIFE와 silent catch 유지 | fallback UX는 안전하지만 디버그 가시성 부족 |
| F18 | Partial | panel, security, citation, source-line 계열 테스트는 풍부 | helper 단위 세분 테스트는 여전히 제한적 |
| F19 | Open | `BLOCKED_RESOURCE_PLACEHOLDER_TEXT = 'blocked placeholder text'` 유지 | placeholder UX 개선 미실시 |

## workspace.md

| Finding | Status | Current Evidence | Notes |
|---|---|---|---|
| F1 | Fixed | `workspace-context.tsx`는 `789` LOC로 축소되고 `use-workspace-*` 훅으로 분리 | 원래 3.6k LOC provider 문제는 실질 해소 |
| F2 | Fixed | `loadWorkspaceSpec()`는 `use-workspace-file-operations.ts`에서 `Promise<WorkspaceLoadStatus>` 반환 | fire-and-forget IIFE 제거 |
| F3 | Fixed | `loadWorkspaceFile()`도 동일하게 async status 반환 | 비동기 에러 전달 구조 개선 |
| F4 | Partial | `useWorkspaceWatcher()`는 updater 내부 check를 보강했지만 suppression 판단 일부는 외부 값에 의존 | race 우려가 줄었으나 완전 해소라고 보긴 어려움 |
| F5 | Fixed | watcher effect는 refs(`loadWorkspaceFileRef`, `loadWorkspaceSpecRef` 등) 기반 | 콜백 재생성에 따른 구독 churn 문제 완화 |
| F6 | Fixed | `ipc-call-helper.ts`와 분리 훅이 tracked IPC 호출을 공통화 | boilerplate 상당수 제거 |
| F7 | Fixed | `closeWorkspace()`가 `await disconnectRemoteWorkspace()` 사용 | 에러 무시 fire-and-forget 제거 |
| F8 | Fixed | `closeWorkspace()`가 `await stopWorkspaceWatch()` 사용 | 동일 |
| F9 | Fixed | 타이머 cleanup 정상이라는 원래 판단과 상충되는 regressions는 없음 | 정보성 항목, 상태 양호 |
| F10 | Fixed | 중복 함수 대신 `hydrateExpandedDirectories()`가 `use-workspace-snapshot.ts`에 단일화 | 동일 구현 중복 해소 |
| F11 | Fixed | snapshot hydrate가 `Promise.allSettled()`로 병렬 복원 | 순차 복원 지적 해소 |
| F12 | Fixed | `loadWorkspaceDirectoryChildren()`에 `maxLoadDirectoryIterations` 가드 추가 | 무한 루프 우려 해소 |
| F13 | Open | `setBannerMessage((currentMessage) => ...)` 패턴은 여전히 사용 | 큰 버그는 아니지만 혼용 패턴은 유지 |
| F14 | Partial | 타입이 `WorkspaceContextState`, `Remote`, `Actions`로 분리됨 | 최종 `WorkspaceContextValue`는 여전히 flat + grouped 혼합 |
| F15 | Open | `loadWorkspaceIndex`는 여전히 빈 deps array 기반 | stale closure 주석성 지적 유지 |
| F16 | Open | `workspace-model.ts`의 rename/remove 유사 순회 로직 정리 흔적 확인 안 됨 | low-level 중복 지속 |
| F17 | Open | `workspace-persistence.ts`에 `as unknown as` 유지 | 이중 캐스팅 문제 그대로 |
| F18 | Fixed | `loadWorkspaceSessionSnapshotWithDiagnostics()`가 parse error를 반환 | silent catch 지적 해소 |
| F19 | Partial | `loadWorkspaceFile()`은 provider 밖으로 이동했지만 함수 자체는 여전히 큼 | 책임 분리는 개선, 내부 복잡도는 높음 |
| F20 | Open | `getWorkspaceIsDirtyCompatibility`, `deriveWorkspaceIsDirtyCompatibility`, `markWorkspaceDocumentDirtyCompatibility` naming 지속 | 레거시 compatibility 네이밍 잔존 |
| F21 | Open | `remote-connect-modal.tsx`의 소형 유틸 중복 정리 확인 안 됨 | 중요도는 낮음 |
| F22 | Partial | `workspace-context.tsx` 전용 테스트는 없지만 `src/App.test.tsx`가 상위 통합 흐름 대규모 검증 | direct unit coverage는 여전히 부족 |
| F23 | Open | `markWorkspaceDocumentDirtyCompatibility`와 legacy 주석 유지 | 장기 유지 의도 불명확 |
| F24 | Open | `openWorkspace()`가 `result.canceled`인데 `result.error` 있으면 배너 표시 | 원래 UX 혼란 지적 패턴 유지 |
