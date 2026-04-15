# Pipeline Log: Pre-split Review Status Audit Remediation

## Meta
- **request**: `$sdd-autopilot _sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md 에서 open과 partial로 된 내용을 모두 고치고 싶어.`
- **orchestrator**: `_sdd/pipeline/orchestrators/orchestrator_pre_split_review_status_audit_remediation.md`
- **started**: 2026-04-15T12:34:47+0900
- **pipeline**: feature-draft -> implementation-plan -> implementation (phase-iterative, per-phase review-fix) -> spec-update-done

## Status Table

| Step | Agent | Status | Output |
|------|-------|--------|--------|
| 1 | feature_draft | completed | `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md` |
| 2 | implementation_plan | completed | `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md` |
| 3 | implementation | completed | code/tests + `_sdd/implementation/2026-04-15_implementation_progress_pre_split_review_status_audit_remediation.md` + `_sdd/implementation/2026-04-15_implementation_report_pre_split_review_status_audit_remediation.md` |
| 4 | spec_update_done | completed | `_sdd/spec/spec-viewer/overview.md`, `_sdd/spec/spec-viewer/contracts.md`, `_sdd/spec/appendix/backlog-and-risks.md`, `_sdd/spec/decision-log.md` |

## Execution Log Entries

### 2026-04-15T12:34:47+0900 — pipeline initialized
- 출력:
  - `_sdd/pipeline/orchestrators/orchestrator_pre_split_review_status_audit_remediation.md`
  - `_sdd/pipeline/log_pre_split_review_status_audit_remediation_20260415_123447.md`
- 핵심 결정사항:
  - 기존 `post_split_remaining_issues` 산출물은 입력 컨텍스트로 재사용하되, audit 문서 전체 범위를 새 canonical backlog로 취급한다.
  - dirty worktree를 보존하고 still-open delta만 보강하는 execution policy를 유지한다.
  - review-fix loop는 각 phase 직후 `implementation_review` agent를 명시 프롬프트로 호출하는 방식으로 고정한다.
- 이슈:
  - 실행 환경이 `_sdd/env.md` 권장 Node 20.x가 아니라 `v25.2.1`이므로 테스트 결과 해석에 주의가 필요하다.
  - 저장소에 기존 dirty changes가 많아 phase별로 unrelated 변경과 현재 phase 소유 변경을 구분해야 한다.

### 2026-04-15T12:43:00+0900 — planning artifacts materialized
- 출력:
  - `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`
  - `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`
- 핵심 결정사항:
  - audit remediation을 6개 phase로 고정했다.
  - Phase 1은 `App/workspace/file-tree/clipboard-path` foundation debt를 우선 닫는다.
  - checkpoint commit `a6e616e` 이후 상태를 execution baseline으로 사용한다.
- 이슈:
  - giant component 항목은 helper extraction 우선, wholesale rewrite 후순위로 처리한다.

### 2026-04-15T13:08:00+0900 — phase 1 partial implementation + focused validation
- 출력:
  - `src/context-copy/copy-payload.ts`
  - `src/workspace/workspace-persistence.ts`
  - `src/workspace/use-workspace-remote.ts`
  - `electron/workspace-ipc-handlers.ts`
  - `electron/file-clipboard.ts`
  - 대응 테스트 파일
- 핵심 결정사항:
  - `buildCopyFullPathPayload()`의 separator 판단을 Windows root 패턴 기반으로 좁혔다.
  - storage helper의 `as unknown as` 이중 캐스팅을 제거하고 `Reflect` 기반 fallback으로 정리했다.
  - workspace open dialog는 user cancel과 real error를 분리하는 방향으로 semantics를 정리했다.
  - Finder clipboard source는 symlink 입력을 차단하도록 보강했다.
- 테스트:
  - `npm test -- src/context-copy/copy-payload.test.ts src/workspace/workspace-persistence.test.ts electron/file-clipboard.test.ts src/App.test.tsx`
  - 결과: PASS (`4` files, `208` passed, `1` skipped)
- 이슈:
  - 아직 Phase 1 전체 finding closure는 아님. giant component / workspace compatibility naming / file-tree helper extraction은 후속 구현이 필요하다.

### 2026-04-15T13:30:00+0900 — phase 1 fix round 1 integrated
- 출력:
  - `src/file-tree/file-tree-panel.tsx`
  - `src/file-tree/file-tree-panel-helpers.tsx`
  - `src/file-tree/file-tree-panel.test.tsx`
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/workspace-context-helpers.ts`
  - `src/workspace/workspace-model.ts`
  - `src/workspace/workspace-model.test.ts`
- 핵심 결정사항:
  - file-tree recursive rendering 책임을 helper로 분리하고 13개 positional render argument를 typed context object로 정규화했다.
  - file/root context menu action builder를 별도 helper로 추출해 giant component 성격을 줄였다.
  - `loadWorkspaceIndex`가 stale closure 대신 최신 workspace snapshot을 기준으로 후처리하도록 정리했다.
  - workspace dirty-state helpers는 canonical naming으로 승격하고 compatibility alias는 deprecated wrapper로만 유지했다.
- 테스트:
  - `npm test -- src/context-copy/copy-payload.test.ts electron/file-clipboard.test.ts src/file-tree/file-tree-panel.test.tsx src/App.test.tsx src/workspace/workspace-persistence.test.ts src/workspace/workspace-model.test.ts`
  - 결과: PASS (`6` files, `303` passed, `1` skipped)
  - `npm test`
  - 결과: PASS (`79` files, `903` passed, `1` skipped)
  - `npm run lint`
  - 결과: PASS
- 이슈:
  - Phase 1 re-review가 아직 남아 있어 medium finding closure 여부는 reviewer 판단 대기 상태다.

### 2026-04-15T13:45:00+0900 — phase 1 re-review passed
- 출력:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_1_reround_1.md`
- 핵심 결정사항:
  - same-scope re-review에서 `critical/high/medium = 0`를 확인했다.
  - `electron/workspace-backend/copy-entries.ts` naming ambiguity는 `low`로만 남겨 두고 Phase 1 exit blocker로는 취급하지 않는다.
  - 오케스트레이터 gate 기준으로 Phase 1을 종료하고 Phase 2로 진행한다.
- 테스트:
  - reviewer는 focused/full/lint evidence를 그대로 재검토했고 모두 유효 판정했다.
- 이슈:
  - 실행 환경은 계속 Node `v25.2.1`이며 `_sdd/env.md` 권장값 Node `20.x`와 drift가 있다.

### 2026-04-15T13:55:00+0900 — phase 2 initial implementation + validation
- 출력:
  - `src/code-comments/comment-persistence.ts`
  - `src/code-comments/comment-persistence.test.ts`
  - `src/code-comments/comment-anchor.ts`
  - `src/code-comments/comment-anchor.test.ts`
  - `src/code-comments/comment-line-index.ts`
  - `src/code-comments/comment-line-index.test.ts`
  - `src/code-comments/use-escape-dismiss.ts`
  - `src/code-comments/comment-list-modal.tsx`
  - `src/code-comments/comment-list-modal-sections.tsx`
  - `src/code-comments/comment-editor-modal.tsx`
  - `src/code-comments/global-comments-modal.tsx`
  - `src/code-comments/export-comments-modal.tsx`
  - `src/code-comments/comment-hover-popover.tsx`
  - `src/code-comments/comment-marker-detail-panel.tsx`
- 핵심 결정사항:
  - comment persistence parsing에서 unsafe record cast를 제거하고 explicit type guard로 정리했다.
  - empty-file anchor는 sentinel snippet으로 정규화하고 hash는 64-bit FNV-1a로 올려 weak-hash 우려를 낮췄다.
  - comment line-index의 rendered-line mapping 루프를 공통 helper로 합치고 selection-range recent lookup은 keyed entry 순회로 바꿨다.
  - repeated Escape dismiss 로직은 shared hook으로 추출했고, `comment-list-modal`은 section split으로 giant component 성격을 줄였다.
- 테스트:
  - `npm test -- src/code-comments/comment-persistence.test.ts src/code-comments/comment-anchor.test.ts src/code-comments/comment-line-index.test.ts src/code-comments/comment-export.test.ts src/code-comments/comment-list-modal.test.tsx src/code-comments/comment-editor-modal.test.tsx src/code-comments/global-comments-modal.test.tsx src/code-comments/export-comments-modal.test.tsx src/code-comments/comment-hover-popover.test.tsx src/code-comments/comment-marker-detail-panel.test.tsx`
  - 결과: PASS (`10` files, `98` passed)
  - `npm test`
  - 결과: PASS (`79` files, `909` passed, `1` skipped)
  - `npm run lint`
  - 결과: PASS
  - `npm run dev`
  - 결과: dev server boot 성공 (`http://localhost:5173/` 확인 후 종료)
- 이슈:
  - UI 수동 확인은 현재 세션에서 불가하므로 boot 성공만 기록했다.
  - 실행 환경은 계속 Node `v25.2.1`이며 `_sdd/env.md` 권장값 Node `20.x`와 drift가 있다.

### 2026-04-15T14:05:00+0900 — phase 2 review passed
- 출력:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_2.md`
- 핵심 결정사항:
  - same-scope review에서 `critical/high/medium = 0`를 확인했다.
  - parser safety, empty-file anchor, hash strength, line-index canonicalization, modal split, Escape dedup이 모두 phase mapping 범위에서 closure 판정되었다.
  - 오케스트레이터 gate 기준으로 Phase 2를 종료하고 Phase 3로 진행한다.
- 테스트:
  - reviewer는 focused/full/lint/dev boot evidence를 모두 유효 판정했다.
- 이슈:
  - UI 수동 상호작용 검증은 여전히 session gap으로 남아 있다.
  - 실행 환경은 계속 Node `v25.2.1`이며 `_sdd/env.md` 권장값 Node `20.x`와 drift가 있다.

### 2026-04-15T13:55:00+0900 — phase 3 initial implementation + validation
- 출력:
  - `src/code-editor/code-editor-panel.tsx`
  - `src/code-editor/use-code-editor-view.ts`
  - `src/code-viewer/syntax-highlight.ts`
  - `src/spec-viewer/highlighted-code-block.tsx`
  - `src/spec-viewer/markdown-security.ts`
  - `src/spec-viewer/source-line-resolver.ts`
  - `src/spec-viewer/spec-viewer-scroll.ts`
  - `src/spec-viewer/spec-viewer-helpers.ts`
  - `src/spec-viewer/spec-viewer-panel.tsx`
  - `src/spec-viewer/spec-viewer-markdown-components.tsx`
- 핵심 결정사항:
  - code editor lifecycle/state sync를 `useCodeEditorView()`로 분리했다.
  - syntax highlighter cache에 idle disposal을 추가했다.
  - spec-viewer code block highlight는 `dangerouslySetInnerHTML` 없이 React node 렌더링으로 전환했다.
  - markdown security/data image 검증과 helper canonicalization을 보강했다.
- 테스트:
  - `npm test -- src/code-editor/code-editor-panel.test.tsx src/code-viewer/language-map.test.ts src/code-viewer/syntax-highlight.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/spec-viewer/highlighted-code-block.test.tsx src/spec-viewer/spec-link-utils.test.ts src/spec-viewer/source-line-resolver.test.ts src/spec-viewer/markdown-security.test.ts`
  - 결과: PASS (`8` files, `177` passed)
  - `npm test`
  - 결과: PASS (`79` files, `912` passed, `1` skipped)
  - `npm run lint`
  - 결과: PASS
  - `npm run dev`
  - 결과: dev server boot 성공 (`http://localhost:5173/` 확인 후 종료)
- 이슈:
  - 수동 UI 상호작용은 환경 제약으로 미수행

### 2026-04-15T14:20:00+0900 — phase 3 review round 1 requested blocker fix
- 출력:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_3.md`
- 핵심 결정사항:
  - reviewer가 `use-code-editor-view.ts` mount effect dependency로 인한 editor 재생성 위험을 `High`로 보고했다.
  - theme/wrap 변경은 reconfigure effect만 타도록 mount effect 경계를 축소하기로 했다.

### 2026-04-15T14:35:00+0900 — phase 3 re-review round 1 requested measurement recovery
- 출력:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_3_reround_1.md`
- 핵심 결정사항:
  - 첫 fix 후 High는 해소됐지만 hidden editor가 다시 visible 될 때 `requestMeasure()`가 빠진 경로가 `Medium`으로 보고됐다.
  - visible 전환 시 measurement refresh를 복구하고 회귀 테스트를 추가하기로 했다.

### 2026-04-15T14:50:00+0900 — phase 3 re-review passed
- 출력:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_3_reround_2.md`
- 핵심 결정사항:
  - same-scope re-review에서 `critical/high/medium = 0`를 확인했다.
  - code editor mount/reconfigure 경계와 hidden->visible measurement refresh 회귀가 모두 닫혔다.
  - implementation plan 기준 Phase 3를 종료하고 Phase 4(local backend) review로 진행한다.
- 테스트:
  - `npm test -- src/App.test.tsx src/code-editor/code-editor-panel.test.tsx`
  - 결과: PASS (`2` files, `208` passed, `1` skipped)
  - `npm test`
  - 결과: PASS (`79` files, `914` passed, `1` skipped)
  - `npm run lint`
  - 결과: PASS

### 2026-04-15T15:05:00+0900 — phase 4 implementation + review passed
- 출력:
  - `electron/workspace-ipc-routing.ts`
  - `electron/workspace-ipc-routing.test.ts`
  - `electron/workspace-backend/local-workspace-backend.ts`
  - `electron/workspace-backend/local-workspace-backend.test.ts`
  - `electron/main.ts`
  - `electron/workspace-utils.ts`
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_4.md`
- 핵심 결정사항:
  - local backend 호출 경로에서 unsafe `DUMMY_IPC_EVENT`를 제거했다.
  - local backend handler typing 중복을 줄이고, remote agent log write failure가 최소 1회는 가시화되도록 조정했다.
  - path predicate naming drift는 compatibility alias를 유지하는 방식으로 완화했다.
  - reviewer가 same-scope 기준 `critical/high/medium = 0`를 확인했다.
- 테스트:
  - `npm test -- electron/workspace-ipc-handlers.test.ts electron/workspace-ipc-routing.test.ts electron/workspace-backend/backend-router.test.ts electron/workspace-backend/local-workspace-backend.test.ts electron/system-open.test.ts`
  - 결과: PASS (`5` files, `30` passed)
  - `npm test`
  - 결과: PASS (`79` files, `914` passed, `1` skipped)
  - `npm run lint`
  - 결과: PASS

### 2026-04-15T15:25:00+0900 — phase 5 implementation + review passed
- 출력:
  - `electron/workspace-backend/remote-workspace-backend.ts`
  - `electron/workspace-backend/remote-workspace-backend.test.ts`
  - `electron/workspace-backend/remote-watch-bridge.ts`
  - `electron/workspace-backend/remote-git-bridge.ts`
  - `electron/remote-agent/runtime/workspace-ops.ts`
  - `electron/remote-agent/runtime/workspace-ops.test.ts`
  - `electron/remote-agent/runtime/watch-ops.test.ts`
  - `electron/remote-agent/directory-browser.ts`
  - `electron/remote-agent/directory-browser.test.ts`
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_phase_5.md`
- 핵심 결정사항:
  - remote backend request plumbing을 helper 기준으로 정리하고, request 실패 시 `requestMethod/workspaceId` 진단 맥락을 보존했다.
  - watch bridge subscription lifecycle과 runtime path existence/error-code handling을 보강했다.
  - reviewer가 remote/backend scope 기준 `critical/high/medium = 0`를 확인했다.
- 테스트:
  - `npm test -- electron/remote-agent/connection-service.test.ts electron/remote-agent/protocol.test.ts electron/remote-agent/runtime/request-router.test.ts electron/remote-agent/runtime/workspace-ops.test.ts electron/remote-agent/runtime/watch-ops.test.ts electron/remote-agent/directory-browser.test.ts electron/workspace-backend/remote-workspace-backend.test.ts electron/workspace-backend/remote-watch-bridge.test.ts electron/workspace-backend/remote-git-bridge.test.ts electron/workspace-watchers.test.ts`
  - 결과: PASS (`10` files, `39` passed)
  - `npm test`
  - 결과: PASS (`79` files, `919` passed, `1` skipped)
  - `npm run lint`
  - 결과: PASS
  - `npm run dev`
  - 결과: Vite dev server boot 성공 (`http://localhost:5173/` 확인 후 종료)

### 2026-04-15T15:35:00+0900 — final integration review passed
- 출력:
  - `_sdd/implementation/2026-04-15_implementation_review_pre_split_review_status_audit_remediation_final_integration.md`
  - `_sdd/implementation/2026-04-15_implementation_report_pre_split_review_status_audit_remediation.md`
  - `_sdd/pipeline/report_pre_split_review_status_audit_remediation_20260415_141415.md`
- 핵심 결정사항:
  - phase 경계를 넘는 regression과 late viewer/source-line delta까지 current workspace 기준 repo gate에 포함해 재검증했다.
  - final integration review 기준 `critical/high/medium = 0`를 확인했다.
  - `spec-update-done` 실행 준비가 완료되었다.
- 테스트:
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

### 2026-04-15T15:45:00+0900 — spec_update_done applied
- 출력:
  - `_sdd/spec/decision-log.md`
  - `_sdd/spec/spec-viewer/overview.md`
  - `_sdd/spec/spec-viewer/contracts.md`
  - `_sdd/spec/appendix/backlog-and-risks.md`
- 핵심 결정사항:
  - exact source offset이 있는 rendered selection은 raw markdown offset을 line range source of truth로 사용하도록 global spec을 동기화했다.
  - remediation 완료 상태와 남은 low-risk follow-up만 appendix backlog에 유지했다.
  - temporary phase breakdown과 transient review log는 global spec 본문에 올리지 않았다.

## Final Summary
- **완료 시간**: 2026-04-15T15:45:00+0900
- **총 소요 시간**: 약 3시간 10분
- **실행 결과**: completed
- **생성/수정 파일 수**: current workspace 기준 다수 코드/테스트 파일 + `_sdd` progress/review/report/spec 문서 갱신
- **Review 횟수**: phase review 5회 + viewer re-review 2회 + final integration review 1회
- **테스트 결과**: `npm test` PASS (`79` files, `919` passed, `1` skipped), `npm run lint` PASS, `npm run dev` boot 확인
- **스펙 동기화 여부**: 완료
- **잔여 이슈**: Electron 창 내부 수동 smoke, `system-open.ts` 추가 SSH option hardening, remote git/watch bridge diagnostics consistency는 별도 low-risk follow-up
