# Implementation Progress: pre_split_review_status_audit_remediation

**날짜**: 2026-04-15
**기반 입력**:
- `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`
- `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`
- `_sdd/pipeline/orchestrators/orchestrator_pre_split_review_status_audit_remediation.md`
- `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`

**Execution Mode**: phase-iterative, per-phase review-fix

| phase | title | status | notes |
|---|---|---|---|
| 1 | Foundation surface reconciliation | completed | re-review에서 `critical/high/medium = 0` 확인. low 1건(`copy-entries.ts` naming)만 잔여 |
| 2 | Comment / export structural cleanup | completed | implementation_review에서 `critical/high/medium = 0` 확인 |
| 3 | Viewer lifecycle and naming cleanup | completed | review-fix loop 3라운드 후 `critical/high/medium = 0` 확인 |
| 4 | Electron main / local backend hardening | completed | implementation_review에서 `critical/high/medium = 0` 확인 |
| 5 | Remote runtime / backend hardening | completed | implementation_review에서 `critical/high/medium = 0` 확인 |
| 6 | Final sweep / audit revalidation | completed | final integration review에서 `critical/high/medium = 0`, report/spec sync ready 확인 |

## Phase 1

### Initial implementation delta

- `src/context-copy/copy-payload.ts`
  - Windows path separator 판단을 drive-letter/UNC 패턴 기반으로 좁힘
- `src/workspace/workspace-persistence.ts`
  - storage fallback helper에서 `as unknown as` 이중 캐스팅 제거
- `electron/workspace-ipc-handlers.ts`
  - open dialog error와 user cancel semantics 분리
- `src/workspace/use-workspace-remote.ts`
  - canceled dialog는 silent cancel, 실제 error만 banner로 노출
- `electron/file-clipboard.ts`
  - Finder clipboard symlink source 차단
- 대응 테스트 업데이트

### Validation

- `npm test -- src/context-copy/copy-payload.test.ts src/workspace/workspace-persistence.test.ts electron/file-clipboard.test.ts src/App.test.tsx`
- 결과: PASS (`4` files, `208` passed, `1` skipped)

### Review round 1

- reviewer artifact:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_1.md`
- findings summary:
  - `Medium`: file-tree giant component / positional render args / context menu action builder 미해결
  - `Medium`: workspace compatibility naming + `loadWorkspaceIndex` ownership 정리 미해결
  - `Low`: `copy-entries.ts` local-only naming ambiguity

### Fix round 1

- 완료
- subagent ownership:
  - file-tree scope
  - workspace scope
- 적용 내용:
  - `src/file-tree/file-tree-panel.tsx`
    - recursive renderer를 helper 파일로 분리하고 positional argument 묶음을 typed context object로 치환
    - context menu action builder를 helper로 분리
  - `src/file-tree/file-tree-panel.test.tsx`
    - file/root context menu paste target regression coverage 추가
  - `src/workspace/workspace-context.tsx`
    - `loadWorkspaceIndex`가 async index 완료 시 최신 `workspaceStateRef` snapshot을 읽도록 정리
    - empty dependency array 제거
  - `src/workspace/workspace-context-helpers.ts`
  - `src/workspace/workspace-model.ts`
    - canonical naming:
      - `getWorkspaceHasUnsavedChanges`
      - `deriveWorkspaceHasUnsavedChanges`
      - `markWorkspaceDocumentDirtyWithoutDraftSync`
    - 기존 compatibility alias는 deprecated wrapper로 유지
  - `src/workspace/workspace-model.test.ts`
    - naming / dirty-state behavior coverage 보강

### Validation after fix round 1

- `npm test -- src/context-copy/copy-payload.test.ts electron/file-clipboard.test.ts src/file-tree/file-tree-panel.test.tsx src/App.test.tsx src/workspace/workspace-persistence.test.ts src/workspace/workspace-model.test.ts`
- 결과: PASS (`6` files, `303` passed, `1` skipped)
- `npm test`
- 결과: PASS (`79` files, `903` passed, `1` skipped)
- `npm run lint`
- 결과: PASS

### Re-review round 1

- reviewer artifact:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_1_reround_1.md`
- findings summary:
  - `Critical`: none
  - `High`: none
  - `Medium`: none
  - `Low`: `electron/workspace-backend/copy-entries.ts` naming ambiguity (`app-shell-and-backend:F14`)
- exit decision:
  - Phase 1 completed
  - orchestrator exit gate satisfied (`critical/high/medium = 0`)

## Phase 2

### Initial implementation delta

- `src/code-comments/comment-persistence.ts`
  - `isRecord()` type guard를 도입해 `as Record<string, unknown>` parsing path 제거
- `src/code-comments/comment-persistence.test.ts`
  - non-record anchor payload skip coverage 추가
- `src/code-comments/comment-anchor.ts`
  - empty-file anchor에 sentinel snippet을 도입해 빈 snippet 생성 제거
  - hash를 32-bit FNV-1a에서 64-bit FNV-1a로 상향
- `src/code-comments/comment-anchor.test.ts`
  - 16-hex hash / empty-file anchor regression coverage 추가
- `src/code-comments/comment-line-index.ts`
  - rendered-line lookup과 mapping loop를 공통 helper로 정리
  - `findMostRecentCommentInSelectionRange()`가 actual keyed entries만 순회하도록 변경
- `src/code-comments/comment-line-index.test.ts`
  - sparse wide-range selection regression coverage 추가
- `src/code-comments/use-escape-dismiss.ts`
  - comment modal/popup 공통 Escape dismiss hook 추가
- `src/code-comments/comment-list-modal.tsx`
  - staged Escape dismiss 로직을 callback 기반으로 정리
  - global section / comment list item rendering을 helper section 파일로 분리
- `src/code-comments/comment-list-modal-sections.tsx`
  - giant modal 내부 JSX와 list item rendering 책임 분리
- `src/code-comments/comment-editor-modal.tsx`
- `src/code-comments/global-comments-modal.tsx`
- `src/code-comments/export-comments-modal.tsx`
- `src/code-comments/comment-hover-popover.tsx`
- `src/code-comments/comment-marker-detail-panel.tsx`
  - repeated Escape-key listener를 shared hook으로 정리

### Validation

- `npm test -- src/code-comments/comment-persistence.test.ts src/code-comments/comment-anchor.test.ts src/code-comments/comment-line-index.test.ts src/code-comments/comment-export.test.ts src/code-comments/comment-list-modal.test.tsx src/code-comments/comment-editor-modal.test.tsx src/code-comments/global-comments-modal.test.tsx src/code-comments/export-comments-modal.test.tsx src/code-comments/comment-hover-popover.test.tsx src/code-comments/comment-marker-detail-panel.test.tsx`
- 결과: PASS (`10` files, `98` passed)
- `npm test`
- 결과: PASS (`79` files, `909` passed, `1` skipped)
- `npm run lint`
- 결과: PASS
- `npm run dev`
- 결과: Vite/Electron dev server boot 성공 (`http://localhost:5173/` 확인 후 수동 확인 불가 상태로 종료)

### Review round 1

- reviewer artifact:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_2.md`
- findings summary:
  - `Critical`: none
  - `High`: none
  - `Medium`: none
  - `Low`: none
- exit decision:
  - Phase 2 completed
  - orchestrator exit gate satisfied (`critical/high/medium = 0`)

## Phase 3

### Initial implementation delta

- `src/code-editor/code-editor-panel.tsx`
  - CM6 surface를 `useCodeEditorView()` hook 기반으로 정리하고 code-editor/class naming drift를 보정
- `src/code-editor/use-code-editor-view.ts`
  - editor lifecycle/state sync, jump/highlight, scroll restore, selection suppression을 hook으로 분리
- `src/code-viewer/syntax-highlight.ts`
  - highlighter cache에 idle disposal을 도입하고 empty-string 처리 조건을 명확화
- `src/spec-viewer/highlighted-code-block.tsx`
  - token React node 렌더링으로 `dangerouslySetInnerHTML` 제거
- `src/spec-viewer/markdown-security.ts`
  - `DATA_IMAGE_URI_PATTERN`을 더 엄격하게 조정
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/spec-viewer-markdown-components.tsx`
- `src/spec-viewer/spec-viewer-helpers.ts`
- `src/spec-viewer/source-line-resolver.ts`
- `src/spec-viewer/spec-viewer-scroll.ts`
  - helper extraction, stale response handling, placeholder/diagnostics visibility 정리

### Validation

- `npm test -- src/code-editor/code-editor-panel.test.tsx src/code-viewer/language-map.test.ts src/code-viewer/syntax-highlight.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/spec-viewer/highlighted-code-block.test.tsx src/spec-viewer/spec-link-utils.test.ts src/spec-viewer/source-line-resolver.test.ts src/spec-viewer/markdown-security.test.ts`
- 결과: PASS (`8` files, `177` passed)
- `npm test`
- 결과: PASS (`79` files, `912` passed, `1` skipped)
- `npm run lint`
- 결과: PASS
- `npm run dev`
- 결과: Vite/Electron dev server boot 성공 (`http://localhost:5173/` 확인 후 수동 확인 불가 상태로 종료)

### Review round 1

- reviewer artifact:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_3.md`
- findings summary:
  - `High`: `use-code-editor-view.ts` mount effect dependency로 인한 theme/wrap toggle 시 editor 재생성 위험

### Fix round 1

- `src/code-editor/use-code-editor-view.ts`
  - editor mount effect dependency를 `shouldMountEditor` 기준으로 축소
  - mount 시 initial theme/wrap 값은 ref에서 읽고 이후 변경은 compartment reconfigure에만 위임
- `src/code-editor/code-editor-panel.test.tsx`
  - appearance theme 변경 후에도 문서 내용이 유지되는 회귀 테스트 추가

### Validation after fix round 1

- `npm test`
- 결과: PASS (`79` files, `913` passed, `1` skipped)
- `npm run lint`
- 결과: PASS

### Re-review round 1

- reviewer artifact:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_3_reround_1.md`
- findings summary:
  - `Medium`: hidden editor가 다시 visible 될 때 `requestMeasure()` 보정 누락

### Fix round 2

- `src/code-editor/code-editor-panel.tsx`
  - `showEditor=true` 전환 시 `requestAnimationFrame` 안에서 `view.requestMeasure()` 호출
- `src/code-editor/code-editor-panel.test.tsx`
  - hidden editor가 visible 상태로 복귀할 때 measurement refresh가 호출되는 회귀 테스트 추가

### Validation after fix round 2

- `npm test -- src/App.test.tsx src/code-editor/code-editor-panel.test.tsx`
- 결과: PASS (`2` files, `208` passed, `1` skipped)
- `npm test`
- 결과: PASS (`79` files, `914` passed, `1` skipped)
- `npm run lint`
- 결과: PASS

### Re-review round 2

- reviewer artifact:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_3_reround_2.md`
- findings summary:
  - `Critical`: none
  - `High`: none
  - `Medium`: none
  - `Low`: none
- exit decision:
  - Phase 3 completed
  - orchestrator exit gate satisfied (`critical/high/medium = 0`)

## Phase 4

### Initial implementation delta

- `electron/workspace-ipc-routing.ts`
  - `DUMMY_IPC_EVENT` 제거
  - local backend용 request-only handler adapter와 event access sentinel 추가
- `electron/workspace-backend/local-workspace-backend.ts`
  - handler 타입 중복을 `Omit<WorkspaceBackend, 'kind' | 'dispose'>`로 축소
  - backend 생성 로직을 spread 기반으로 단순화
- `electron/main.ts`
  - `queueRemoteAgentLog()`의 무음 실패 제거
  - 최초 실패 1회 `console.warn`, 이후 성공 시 suppression reset
- `electron/workspace-utils.ts`
  - `isPathWithinWorkspace()` 추가
  - `ensurePathWithinWorkspace`는 compatibility alias로 유지
- `electron/workspace-ipc-routing.test.ts`
  - real IPC invoke event 없이 local adapter가 동작하는 회귀 테스트 추가
- `electron/workspace-backend/local-workspace-backend.test.ts`
  - handler fixture를 `satisfies LocalWorkspaceBackendHandlers`로 고정

### Validation

- `npm test -- electron/workspace-ipc-handlers.test.ts electron/workspace-ipc-routing.test.ts electron/workspace-backend/backend-router.test.ts electron/workspace-backend/local-workspace-backend.test.ts electron/system-open.test.ts`
- 결과: PASS (`5` files, `30` passed)
- `npm test`
- 결과: PASS (`79` files, `914` passed, `1` skipped)
- `npm run lint`
- 결과: PASS

### Review round 1

- reviewer artifact:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_4.md`
- findings summary:
  - `Critical`: none
  - `High`: none
  - `Medium`: none
  - `Low`: none
- exit decision:
  - Phase 4 completed
  - orchestrator exit gate satisfied (`critical/high/medium = 0`)

## Phase 5

### Initial implementation delta

- `electron/workspace-backend/remote-workspace-backend.ts`
  - remote request error wrapper를 공통화하고 `requestMethod`, `workspaceId` 진단 맥락을 보존
  - `watchStop`/`dispose` best-effort 경로를 helper로 통합
- `electron/workspace-backend/remote-watch-bridge.ts`
  - agent subscription lifecycle과 `requestWorkspaceMethod()` helper를 정리
- `electron/workspace-backend/remote-git-bridge.ts`
  - `requestWorkspaceMethod()` helper로 repeated request shape를 축소
- `electron/remote-agent/runtime/workspace-ops.ts`
  - unsafe `ErrnoException` assertion을 제거하고 path existence helper를 공통화
- `electron/remote-agent/directory-browser.ts`
  - `parseErrorCode()`를 `REMOTE_AGENT_ERROR_CODES` 기반으로 단순화
- 테스트 보강:
  - `electron/remote-agent/runtime/workspace-ops.test.ts`
  - `electron/remote-agent/runtime/watch-ops.test.ts`
  - `electron/remote-agent/directory-browser.test.ts`

### Validation

- `npm test -- electron/remote-agent/connection-service.test.ts electron/remote-agent/protocol.test.ts electron/remote-agent/runtime/request-router.test.ts electron/remote-agent/runtime/workspace-ops.test.ts electron/remote-agent/runtime/watch-ops.test.ts electron/remote-agent/directory-browser.test.ts electron/workspace-backend/remote-workspace-backend.test.ts electron/workspace-backend/remote-watch-bridge.test.ts electron/workspace-backend/remote-git-bridge.test.ts electron/workspace-watchers.test.ts`
- 결과: PASS (`10` files, `39` passed)
- `npm test`
- 결과: PASS (`79` files, `919` passed, `1` skipped)
- `npm run lint`
- 결과: PASS
- `npm run dev`
- 결과: Vite dev server boot 성공 (`http://localhost:5173/` 확인 후 종료)

### Review round 1

- reviewer artifact:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_5.md`
- findings summary:
  - `Critical`: none
  - `High`: none
  - `Medium`: none
  - `Low`: none
- exit decision:
  - Phase 5 completed
  - orchestrator exit gate satisfied (`critical/high/medium = 0`)

## Phase 6

### Final integration review

- reviewer artifact:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_final_integration.md`
- findings summary:
  - `Critical`: none
  - `High`: none
  - `Medium`: none
  - `Low`: none

### Final validation

- `npm test -- src/spec-viewer/source-line-resolver.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/code-editor/code-editor-panel.test.tsx src/code-viewer/syntax-highlight.test.ts`
- 결과: PASS (`4` files, `154` passed)
- `npm test -- electron/remote-agent/connection-service.test.ts electron/remote-agent/protocol.test.ts electron/remote-agent/runtime/request-router.test.ts electron/remote-agent/runtime/workspace-ops.test.ts electron/remote-agent/runtime/watch-ops.test.ts electron/remote-agent/directory-browser.test.ts electron/workspace-backend/remote-workspace-backend.test.ts electron/workspace-backend/remote-watch-bridge.test.ts electron/workspace-backend/remote-git-bridge.test.ts electron/workspace-watchers.test.ts`
- 결과: PASS (`10` files, `39` passed)
- `npm test`
- 결과: PASS (`79` files, `919` passed, `1` skipped)
- `npm run lint`
- 결과: PASS
- `npm run dev`
- 결과: Vite dev server boot 성공 (`http://localhost:5173/` 확인 후 종료)

### Exit decision

- Phase 6 completed
- final integration review 기준 `critical/high/medium = 0`
- `spec-update-done` 실행 준비 완료
