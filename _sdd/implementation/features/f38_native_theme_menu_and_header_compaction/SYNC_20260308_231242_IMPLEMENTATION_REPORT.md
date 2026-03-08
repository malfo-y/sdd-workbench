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
- Safety: `setApplicationMenu()`는 role-preserving template를 사용해 기존 표준 메뉴 동작을 유지한다.
- Residual scope boundary: compact header fallback button, `system` mode, `true dark`, settings/tray 기반 theme control은 제외했다.

### Conclusion

READY — F38 native `View > Theme` menu + header theme compaction 구현 완료. 스펙 동기화는 별도 `spec-update-done` 단계에서 반영 필요.
