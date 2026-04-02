# Implementation Report: F25 — 파일/디렉토리 생성 및 삭제 (File Tree CRUD)

**Date**: 2026-02-25
**Feature**: F25
**Execution**: Parallel (Phase 1 Group 1a+1b 동시, Phase 2 sequential)

---

## Progress Summary

- Total Tasks: 10 (T1~T10)
- Completed: 10
- Tests Added: 8 (file-tree-panel.test.tsx)
- All Passing: Yes

## Parallel Execution Stats

- Phase 1 Group 1 (병렬): T1+T2 (electron side) / T3 (context side) 동시 실행
- Phase 2 (sequential): T5~T10 (파일 의존)
- Sub-agent Failures: 0

## Completed Tasks

- [x] T1: IPC 핸들러 4개 구현 [parallel: group 1a]
- [x] T2: Preload bridge + 타입 선언 [parallel: group 1a]
- [x] T3: WorkspaceContext CRUD 액션 추가 [parallel: group 1b]
- [x] T4: IPC 패턴 검증 (T1 내 포함)
- [x] T5: 파일 트리 컨텍스트 메뉴 확장 [phase 2]
- [x] T6: 인라인 이름 입력 UI [phase 2]
- [x] T7: App.tsx 콜백 연결 + confirm dialog [phase 2]
- [x] T8: Active file 삭제 edge case 처리 [phase 2]
- [x] T9: 빈 영역 우클릭 root level 생성 [phase 2]
- [x] T10: 통합 테스트 8개 추가 [phase 2]

## Files Modified

- [M] electron/main.ts (~165 lines)
- [M] electron/preload.ts (~28 lines)
- [M] electron/electron-env.d.ts (~28 lines)
- [M] src/workspace/workspace-context.tsx (~160 lines)
- [M] src/file-tree/file-tree-panel.tsx (~100 lines)
- [M] src/App.tsx (~60 lines)
- [M] src/App.css (+49 lines)
- [M] src/file-tree/file-tree-panel.test.tsx (+8 tests)
- [M] src/App.test.tsx (mock 4개 추가)

## Test Summary

- 새 테스트: 8개
- 전체: 368 passed | 1 skipped (기존)
- Build: pass
- Lint: F25 신규 에러 0 (기존 F24 code-editor 에러 32개는 pre-existing)

## Conclusion

READY — 모든 기능 구현 완료. 테스트/build 통과.

---

## F33 Addendum (2026-03-08)

### Progress Summary

- Total Tasks: 6
- Completed: 6
- Tests Added/Updated: 7 files
- All Passing: Yes

### Completed

- [x] Task 1: source offset metadata helper 추가
- [x] Task 2: comment/jump exact range 계약 확장
- [x] Task 3: Spec Viewer renderer exact metadata 확장
- [x] Task 4: offset-aware selection resolver 추가
- [x] Task 5: App/Code Viewer exact jump + comment wiring 통합
- [x] Task 6: persistence/integration regression test 확장

### Files Modified

- `src/source-selection.ts`
- `src/spec-viewer/rehype-source-text-leaves.ts`
- `src/spec-viewer/source-line-metadata.ts`
- `src/spec-viewer/source-line-resolver.ts`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/code-comments/comment-types.ts`
- `src/code-comments/comment-anchor.ts`
- `src/code-comments/comment-persistence.ts`
- `src/code-editor/code-editor-panel.tsx`
- `src/App.tsx`
- 관련 테스트 7개 파일

### Test Summary

- `npx vitest run src/spec-viewer/source-line-metadata.test.ts src/code-comments/comment-anchor.test.ts src/code-comments/comment-persistence.test.ts src/spec-viewer/source-line-resolver.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/code-editor/code-editor-panel.test.tsx src/App.test.tsx` -> pass (`7 files, 206 passed, 1 skipped`)
- `npx tsc --noEmit` -> pass
- `npm test` -> pass (`55 files, 564 passed, 1 skipped`)

### Quality Assessment

- Integration: rendered markdown selection이 same-file raw markdown exact offset range로 매핑되고, CodeMirror exact jump와 spec-origin comment persistence까지 일관되게 연결됨
- Backward compatibility: 기존 line-based comment schema와 line jump/search marker 동작 유지
- Residual scope boundary: source 수정 후 offset recovery/re-anchor는 미구현

### Conclusion

READY — F33 exact source offset anchor MVP 구현 완료. 스펙 동기화는 별도 `spec-update-done` 단계에서 반영 필요.

---

## F34/F35 Addendum (2026-03-08)

### Progress Summary

- Total Tasks: 7
- Completed: 7
- Tests Added/Updated: 5 files
- All Passing: Yes

### Completed

- [x] Task 1: App spec/code navigation request contract 추가
- [x] Task 2: Code Viewer markdown-only `Go to Spec` context menu 추가
- [x] Task 3: Spec Viewer external line->block navigation 처리 추가
- [x] Task 4: Spec Viewer temporary block navigation highlight 추가
- [x] Task 5: Code Viewer temporary line navigation highlight 추가
- [x] Task 6: App wiring 통합 및 explicit navigation gating 정리
- [x] Task 7: panel/app regression test 보강

### Files Modified

- `src/code-editor/cm6-navigation-highlight.ts`
- `src/code-editor/code-editor-panel.tsx`
- `src/code-editor/code-editor-panel.test.tsx`
- `src/spec-viewer/source-line-resolver.ts`
- `src/spec-viewer/source-line-resolver.test.ts`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`

### Test Summary

- `npx tsc --noEmit` -> pass
- `npm test` -> pass (`55 files, 574 passed, 1 skipped`)

### Quality Assessment

- Integration: Code 탭의 markdown source line에서 Spec 탭 rendered block으로 이동하는 F34 경로와, spec->code/code->spec 양방향 temporary navigation highlight가 App orchestration 아래 일관되게 연결됨
- Backward compatibility: 기존 search highlight, comment marker, exact source offset jump, passive selection sync 동작 유지
- Residual scope boundary: 일반 코드 파일에서 semantic spec section 탐색, exact token highlight, persistence/custom duration은 제외

### Conclusion

READY — F34/F35 markdown source `Go to Spec` + cross-panel navigation highlight 구현 완료. 스펙 동기화는 별도 `spec-update-done` 단계에서 반영 필요.

---

## F38 Addendum (2026-03-08)

### Progress Summary

- Total Tasks: 5
- Completed: 5
- Tests Added/Updated: 3 files
- All Passing: Yes

### Completed

- [x] Task 1: main/preload/renderer appearance menu bridge 추가
- [x] Task 2: role-preserving `View > Theme` native menu 도입
- [x] Task 3: renderer bootstrap/theme change -> menu checked state sync 연결
- [x] Task 4: header large theme group 제거
- [x] Task 5: native menu sync + header compaction 회귀 테스트 보강

### Files Modified

- `electron/appearance-menu.ts`
- `electron/appearance-menu.test.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `src/appearance-theme.ts`
- `src/appearance-theme.test.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/appearance-theme-selector.tsx` (deleted)

### Test Summary

- `npx vitest run electron/appearance-menu.test.ts src/appearance-theme.test.ts src/App.test.tsx` -> pass (`3 files, 125 passed, 1 skipped`)
- `npx tsc --noEmit` -> pass
- `npm test` -> pass (`57 files, 600 passed, 1 skipped`)
- `npm run build` -> pass

### Quality Assessment

- Integration: Electron native application menu가 `View > Theme > Dark Gray | Light` radio submenu를 제공하고, renderer/localStorage 기반 appearance state와 checked state가 IPC로 동기화된다.
- UX impact: header의 큰 `Theme` group을 제거해 상단 폭을 회수했고, theme 전환의 primary entry point를 native menu로 옮겼다.

---

## Copy Full Path Addendum (2026-03-20)

### Progress Summary

- Total Tasks: 4
- Completed: 4
- Tests Added/Updated: 3 files
- All Passing: Yes

### Completed

- [x] Task 1: full-path clipboard payload builder 추가
- [x] Task 2: 파일 트리 컨텍스트 메뉴에 `Copy Full Path` 액션 추가
- [x] Task 3: App에서 로컬/원격 workspace root 해석 후 clipboard payload 연결
- [x] Task 4: 로컬/원격 회귀 테스트 보강

### Files Modified

- `src/context-copy/copy-payload.ts`
- `src/context-copy/copy-payload.test.ts`
- `src/file-tree/file-tree-panel.tsx`
- `src/file-tree/file-tree-panel.test.tsx`
- `src/App.tsx`
- `src/App.test.tsx`

### Test Summary

- `npx vitest run src/context-copy/copy-payload.test.ts` -> pass (`14 passed`)
- `npx vitest run src/file-tree/file-tree-panel.test.tsx` -> pass (`47 passed`)
- `npx vitest run src/App.test.tsx` -> pass (`134 passed`, `1 skipped`)

### Quality Assessment

- Integration: file tree context menu에서 local workspace는 실제 절대 경로, remote workspace는 `remote://...` synthetic root를 제외한 `remoteRoot` 기준 full path를 클립보드에 쓴다.
- Backward compatibility: 기존 `Copy Relative Path`, 파일 복사 `Copy`, active file 유지 동작은 그대로 유지된다.
- Residual scope boundary: code editor/spec viewer의 `Copy Relative Path` 계열 액션에는 아직 `Copy Full Path`를 확장하지 않았다.

### Conclusion

READY — 파일 브라우저 `Copy Full Path` 구현 완료. 로컬/원격 경로 semantics와 회귀 테스트까지 반영됨.

---

## Preview Limit 10MB Addendum (2026-03-20)

### Progress Summary

- Total Tasks: 4
- Completed: 4
- Tests Added/Updated: 2 files
- All Passing: Yes

### Completed

- [x] Task 1: local preview file size guard를 `10MB`로 상향
- [x] Task 2: remote runtime preview file size guard를 `10MB`로 상향
- [x] Task 3: code/spec preview unavailable 메시지를 `10MB` 기준으로 갱신
- [x] Task 4: runtime payload 재생성 및 regression test 갱신

### Files Modified

- `electron/main.ts`
- `electron/remote-agent/runtime/workspace-ops.ts`
- `electron/remote-agent/runtime/generated-payload.ts`
- `src/workspace/workspace-context.tsx`
- `src/code-editor/code-editor-panel.tsx`
- `src/code-editor/code-editor-panel.test.tsx`
- `src/App.test.tsx`

### Test Summary

- `npm run build:remote-agent-runtime` -> pass
- `npx vitest run src/code-editor/code-editor-panel.test.tsx` -> pass (`49 passed`)
- `npx vitest run src/App.test.tsx` -> pass (`134 passed`, `1 skipped`)

### Quality Assessment

- Integration: local Electron main process와 remote agent runtime이 동일한 `10MB` preview guard를 사용하도록 맞췄다.
- Backward compatibility: `file_too_large` reason contract는 유지되고, 사용자에게 보이는 수치만 `10MB`로 업데이트됐다.
- Residual scope boundary: 큰 파일에서의 렌더 시간/메모리 사용량을 줄이기 위한 line-count or time-budget guard는 아직 없다.

### Conclusion

READY — preview 파일 크기 제한 `10MB` 상향 구현 완료. local/remote guard, 사용자 메시지, 테스트, generated runtime payload까지 동기화됨.
- Safety: `setApplicationMenu()`는 role-preserving template를 사용해 기존 표준 메뉴 동작을 유지한다.
- Residual scope boundary: compact header fallback button, `system` mode, `true dark`, settings/tray 기반 theme control은 제외했다.

### Conclusion

READY — F38 native `View > Theme` menu + header theme compaction 구현 완료. 스펙 동기화는 별도 `spec-update-done` 단계에서 반영 필요.

---

## F41/F42 Addendum (2026-03-13)

### Progress Summary

- Total Tasks: 6
- Completed: 6
- Tests Added/Updated: 6 files
- All Passing: Yes

### Completed

- [x] Task 1: modal drag offset/clamp shared hook 추가
- [x] Task 2: `View Comments` draggable header + reset contract 적용
- [x] Task 3: `Add Comment` / `Add Global Comments` draggable rollout
- [x] Task 4: `Export Comments` draggable rollout
- [x] Task 5: drag utility/unit regression tests 추가
- [x] Task 6: App-level draggable modal shell regression 보강

### Files Modified

- `src/modal-drag-position.ts`
- `src/modal-drag-position.test.ts`
- `src/code-comments/comment-list-modal.tsx`
- `src/code-comments/comment-list-modal.test.tsx`
- `src/code-comments/comment-editor-modal.tsx`
- `src/code-comments/comment-editor-modal.test.tsx`
- `src/code-comments/global-comments-modal.tsx`
- `src/code-comments/global-comments-modal.test.tsx`
- `src/code-comments/export-comments-modal.tsx`
- `src/code-comments/export-comments-modal.test.tsx`
- `src/App.css`
- `src/App.test.tsx`

### Test Summary

- `npx vitest run src/modal-drag-position.test.ts src/code-comments/comment-list-modal.test.tsx src/code-comments/comment-editor-modal.test.tsx src/code-comments/global-comments-modal.test.tsx src/code-comments/export-comments-modal.test.tsx src/App.test.tsx --reporter=dot` -> pass (`6 files, 161 passed, 1 skipped`)
- `npx tsc --noEmit` -> pass
- `npm test -- --reporter=dot` -> pass (`64 files, 694 passed, 1 skipped`)

### Quality Assessment

- Integration: `View Comments`, `Add Comment`, `Add Global Comments`, `Export Comments`가 모두 같은 draggable header contract와 centered-on-reopen reset behavior를 공유하게 됐다.
- UX impact: 사용자가 comment modal을 코드/스펙을 가리지 않는 위치로 옮긴 채 edit/save/export 흐름을 계속 진행할 수 있다.
- Safety: drag start 영역을 header로 제한하고 viewport clamp를 공통 훅으로 모아, form control interaction과 modal visibility regressions를 줄였다.
- Residual scope boundary: reopen 이후 위치 persistence, viewport resize 시 즉시 re-clamp, remote connect 같은 non-comment modal 확장은 이번 범위에서 제외했다.

### Conclusion

READY — F41/F42 draggable comment modal family 구현 완료. 스펙 동기화는 별도 `spec-update-done` 단계에서 반영 필요.

---

## F45 Addendum (2026-04-01)

### Progress Summary

- Total Tasks: 5
- Completed: 5
- Tests Added/Updated: 5 files
- All Passing: Yes

### Completed

- [x] Task 1: `WorkspaceDocumentSession` / `DocumentSaveState` / path-keyed runtime cache contract 추가
- [x] Task 2: `workspace-context`의 load/save/watch 흐름을 document session 기반으로 정리
- [x] Task 3: `CodeEditorPanel` draft bridge(`onContentChange`)와 same-file echo 시 undo history 보존 처리 추가
- [x] Task 4: same-path markdown Code/Spec 탭 draft 공유 및 external change -> conflict wiring 연결
- [x] Task 5: model/editor/app regression test와 persistence exclusion 회귀 추가

### Files Modified

- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-context.tsx`
- `src/code-editor/code-editor-panel.tsx`
- `src/App.tsx`
- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-persistence.test.ts`
- `src/code-editor/code-editor-panel.test.tsx`
- `src/App.test.tsx`
- `_sdd/implementation/test_results/test_result_20260401_105635.md`

### Test Summary

- `npx vitest run src/code-editor/code-editor-panel.test.tsx src/App.test.tsx src/workspace/workspace-model.test.ts src/workspace/workspace-persistence.test.ts --reporter=dot` -> pass (`4 files, 244 passed, 1 skipped`)
- `npx vitest run src/spec-viewer/spec-viewer-panel.test.tsx --reporter=dot` -> pass (`1 file, 49 passed`)
- `npx tsc --noEmit` -> pass
- `npx vitest run src/code-editor/code-editor-panel.test.tsx src/App.test.tsx src/spec-viewer/spec-viewer-panel.test.tsx src/workspace/workspace-model.test.ts src/workspace/workspace-persistence.test.ts --reporter=dot` -> pass (`5 files, 293 passed, 1 skipped`)

### Quality Assessment

- Integration: text/markdown 문서의 draft/save/conflict lifecycle이 path-keyed document session으로 수렴했고, same-path markdown의 Code/Spec 탭이 동일 draft를 공유한다.
- Editor safety: CodeMirror undo/redo와 selection은 editor-local로 유지되고, parent state echo가 same-file draft를 다시 주입해도 history가 깨지지 않는다.
- Persistence boundary: runtime document session cache는 snapshot persistence에 포함되지 않아 앱 재시작 후 unsaved draft를 복원하지 않는다.
- Residual scope boundary: conflict UX는 현재 `Reload` / `Dismiss(keep draft)` 수준이며, 3-way merge나 richer status chip은 이번 범위에 포함하지 않았다.

### Conclusion

READY — F45 document session 통합과 draft 기반 spec view 동작이 구현 및 검증 완료됐다. supporting spec sync는 `spec-update_done` 단계에서 planned wording을 실제 계약으로 갱신하면 된다.

---

## F46 Addendum (2026-04-01)

### Progress Summary

- Total Tasks: 3
- Completed: 3
- Tests Added/Updated: 4 files
- All Passing: Yes

### Parallel Execution Stats

- Groups Dispatched: 3
- Parallel Tasks: 0
- Sequential Fallbacks: 3
- Worker Failures: 0

### Iteration History

| Iteration | AC Status (MET/Total) | Critical | High | Re-executed Tasks | Result |
|-----------|----------------------|----------|------|-------------------|--------|
| 1 | 10 / 12 | 0 | 1 | `T3` | partial |
| 2 | 12 / 12 | 0 | 0 | `T3` | pass |

Iteration note:
- Iteration 1에서 기존 편집 중심 App regression tests 3개가 F46 viewer-first 계약과 충돌했다.
- Iteration 2에서 해당 테스트를 viewer/external-change semantics로 갱신하고 fresh verification을 다시 수행해 통과했다.

### Completed Tasks

- [x] Task T1: `CodeEditorPanel`을 viewer-first copy/contract로 정리하고 `Edit in VSCode` header action 추가
- [x] Task T2: local/remote file-scoped VSCode open contract 추가 및 remote current-file -> root fallback 구현
- [x] Task T3: App shell read-only wiring, `Edit in VSCode` payload 연결, README copy 갱신, regression update

### Files Modified

- `src/code-editor/code-editor-panel.tsx`
- `src/code-editor/code-editor-panel.test.tsx`
- `electron/system-open.ts`
- `electron/system-open.test.ts`
- `electron/preload.ts`
- `electron/electron-env.d.ts`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `README.md`
- `README_en.md`

UNPLANNED_DEPENDENCY:
- `electron/remote-agent/runtime/generated-payload.ts`
  - `npm test`가 `build:remote-agent-runtime`를 선행 실행해 generated runtime payload를 갱신했다. 제품 로직 변경이 아니라 verification side effect로 분류한다.

### Test Summary

- `npx vitest run electron/system-open.test.ts src/code-editor/code-editor-panel.test.tsx src/App.test.tsx --reporter=dot` -> pass (`3 files, 214 passed, 1 skipped`)
- `npx tsc --noEmit` -> pass
- `npm test -- --reporter=dot` -> pass (`70 files, 812 passed, 1 skipped`)

### Quality Assessment

- Integration: Code 탭은 read-only viewer로 동작하면서도 search, wrap, git line marker, comment gutter, navigation highlight, markdown `Go to Spec` 경로를 유지한다.
- External tool handoff: Code Viewer header에서 local active file과 remote active file context를 VSCode로 직접 넘길 수 있고, remote current-file launch 실패 시 workspace root open으로 안전하게 degrade 된다.
- Backward compatibility: 기존 사이드바 `Open In VSCode`와 remote `sshAlias` prerequisite contract는 유지된다.
- Test quality: 기존 편집 가정 App tests를 viewer-first semantics로 재작성해 F46 계약을 regression으로 고정했다.
- Residual scope boundary: document session/saveState 모델은 여전히 내부에 남아 있으며, 이번 작업은 UI/interaction surface를 viewer-first로 정리하는 데까지만 범위를 제한했다.

### Issues Found

| # | Severity | Description | Phase | Status |
|---|----------|-------------|-------|--------|
| 1 | High | 기존 App regression tests가 in-app editing/save를 전제로 하고 있어 F46 viewer-first 계약과 충돌함 | Iteration 1 / T3 | resolved |

### Conclusion

READY — F46 viewer-first Code panel + VSCode edit handoff 구현 완료. local/remote file-scoped handoff, remote safe fallback, Code Viewer copy, regression updates까지 fresh verification으로 통과했다.

---

## F47 Addendum (2026-04-02)

### Progress Summary

- Total Tasks: 3
- Completed: 3
- Tests Added/Updated: 1 file
- All Passing: Yes

### Parallel Execution Stats

- Groups Dispatched: 1
- Parallel Tasks: 0
- Sequential Fallbacks: 1
- Worker Failures: 0

### Iteration History

| Iteration | AC Status (MET/Total) | Critical | High | Re-executed Tasks | Result |
|-----------|----------------------|----------|------|-------------------|--------|
| 1 | 11 / 12 | 0 | 1 | `T2`, `T3` | partial |
| 2 | 12 / 12 | 0 | 0 | `T2`, `T3` | pass |

Iteration note:
- Iteration 1에서 `EditorState.readOnly.of(true)`만으로는 DOM `contenteditable`이 유지되어 viewer contract test가 실패했다.
- Iteration 2에서 `EditorView.editable.of(false)`를 추가해 DOM 레벨 read-only contract까지 맞춘 뒤 fresh verification을 다시 수행해 통과했다.

### Completed Tasks

- [x] Task T1: README와 code-editor layer 설명을 CM6 read-only viewer engine 기준으로 정리
- [x] Task T2: `CodeEditorPanel` public contract에서 editor-centric props/save path 제거
- [x] Task T3: panel/app regression을 viewer invariants 기준으로 재검증

### Files Modified

- `src/code-editor/code-editor-panel.tsx`
- `src/code-editor/code-editor-panel.test.tsx`
- `README.md`
- `README_en.md`

### Test Summary

- `npx vitest run src/code-editor/code-editor-panel.test.tsx src/App.test.tsx --reporter=dot` -> pass (`2 files, 194 passed, 1 skipped`)
- `npx tsc --noEmit` -> pass
- `npm test -- --reporter=dot` -> pass (`70 files, 805 passed, 1 skipped`)

### Quality Assessment

- Viewer contract: Code Viewer는 여전히 CM6 위에서 search, wrap, selection, jump/highlight, git/comment gutter를 제공하지만, public surface는 더 이상 in-app editing/save semantics를 노출하지 않는다.
- DOM semantics: `EditorView.editable.of(false)`까지 적용해 CM6 root가 실제 read-only viewer로 동작하도록 고정했다.
- Scope control: App wiring은 이미 viewer-first contract와 일치해 추가 변경 없이 유지했고, CM6 extension 최소화 같은 범위 확장은 의도적으로 제외했다.
- Documentation: README와 project structure 설명이 `code-editor/`를 Code Viewer의 CM6 viewer engine layer로 더 정확히 설명하게 됐다.

### Issues Found

| # | Severity | Description | Phase | Status |
|---|----------|-------------|-------|--------|
| 1 | High | CM6 `readOnly` facet만으로는 DOM `contenteditable`이 `true`로 남아 viewer contract test가 실패함 | Iteration 1 / T2-T3 | resolved |

### Conclusion

READY — F47 CM6 viewer engine strategy 구현 완료. Code Viewer는 CM6 read-only engine 위에 남기되, editor-centric public contract와 save residue를 제거하고 viewer semantics를 테스트와 문서로 고정했다.
