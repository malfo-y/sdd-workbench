# IMPLEMENTATION_REPORT

## Feature: F17 — View Comments 통합 Export (선택 기반)

**Date**: 2026-02-23
**Plan source**: `_sdd/drafts/feature_draft_f17_unified_view_export_comments.md` (Part 2)

---

## Progress Summary

- Total Tasks: 3
- Completed: 3
- Tests Added: 8 (comment-list-modal) + 6 updated (App.test.tsx)
- Total Tests: 220 passing (up from 213)
- All Passing: Yes

## Completed Tasks

- [x] T1: CommentListModal 체크박스 + 선택 상태 + Export Selected 버튼 추가
- [x] T2: App.tsx View→Export 파이프라인 연결 + 헤더 Export 버튼 제거
- [x] T3: 단위/통합 테스트 추가 및 회귀 검증

---

## Files Modified

| File | Type | Summary |
|------|------|---------|
| `src/code-comments/comment-list-modal.tsx` | Modified | 체크박스, 선택 상태, Select All/Deselect All, Export Selected 버튼 추가 |
| `src/App.tsx` | Modified | `exportSelectedCommentIds` 상태 추가, Export 버튼 제거, View→Export 연결, 선택 기반 export 핸들러 |
| `src/App.css` | Modified | `.comment-list-selection-bar`, `.comment-list-item-checkbox-wrap`, `.comment-list-item-content` 추가 |
| `src/code-comments/comment-list-modal.test.tsx` | Modified | 8개 신규 테스트 추가 (체크박스/선택/Export Selected), 기존 renders에 `onRequestExport` prop 추가 |
| `src/App.test.tsx` | Modified | Export 버튼 제거 확인, View→Export 선택 흐름 테스트 (5개 수정) |

---

## Acceptance Criteria Verification

| Criterion | Status |
|-----------|--------|
| View Comments 모달에 각 line comment 왼쪽에 체크박스가 표시된다 | ✅ |
| 모달 열림 시 모든 pending line comment는 기본 체크 상태다 | ✅ |
| exported 상태 line comment는 기본 미체크이며 체크 가능하다 | ✅ |
| 상단에 Select All / Deselect All 토글이 존재한다 | ✅ |
| 하단에 Export Selected (N) 버튼이 표시되고, 선택 0개(global 없음)면 비활성화된다 | ✅ |
| Export Selected 클릭 시 View Comments 모달이 닫히고 Export Comments 모달이 열린다 | ✅ |
| Export Comments 모달은 선택된 코멘트만 대상으로 동작한다 | ✅ |
| Export 완료 후 선택된 코멘트에만 exportedAt가 기록된다 | ✅ |
| 헤더의 기존 Export Comments 버튼이 제거된다 | ✅ |
| 기존 View Comments 기능(edit/delete/Delete Exported)이 회귀하지 않는다 | ✅ |
| Global Comments만 존재할 때도 Export 진입 가능 (0 selected + hasGlobalComments) | ✅ |

---

## Quality Gate

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx vitest run` | ✅ 220/220 passed |
| `npm run lint` | ✅ 0 warnings |
| `npm run build` | ✅ build successful |

---

## Implementation Notes

### Global Comments 전용 Export
기존 spec에서 명시되지 않았으나, line comments가 0개이고 global comments가 있는 경우에도 Export 모달에 진입할 수 있도록 `Export Selected` 버튼의 disable 조건을 `selectedCount === 0 && !hasGlobalComments`로 조정했다. 이는 기존 `allowExportWithoutPendingComments={hasGlobalComments}` prop과 일관된 정책이다.

### ExportIcon 제거
`App.tsx`에서 `Export Comments` 버튼 제거 시 `ExportIcon` 컴포넌트도 함께 제거하여 unused code를 정리했다.

---

## Conclusion

**READY** — F17 구현 완료. View Comments에서 Export Selected를 통한 단일 흐름이 완성되었으며 모든 품질 게이트를 통과했다.
