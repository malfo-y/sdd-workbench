# Implementation Review: pre_split_review_status_audit_remediation Phase 4 (viewer request)

**Review Date**: 2026-04-15
**Review Mode**: Tier 1
**Reference**:
- `_sdd/pipeline/orchestrators/orchestrator_pre_split_review_status_audit_remediation.md`
- `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`
- `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`
- `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`
- `_sdd/implementation/2026-04-15_implementation_progress_pre_split_review_status_audit_remediation.md`
- `_sdd/review/code-editor.md`
- `_sdd/review/spec-viewer.md`

계획 문서 기준 viewer cleanup 범위는 `Phase 3: Viewer Lifecycle And Naming Cleanup`이며, 본 문서는 사용자 요청 표현인 `Phase 4(viewer)` 명칭을 따라 저장했다.

## 1. Findings

### Critical
- 없음

### High
- 없음

### Medium
- **[spec-viewer:F11 / T3-2] `estimateLineFromSpanOffset()`의 근사 매핑이 그대로 남아 있어 source-line 해상도 오차 가능성이 아직 열려 있습니다.**
  - **Severity**: Medium
  - **File/Line**: `src/spec-viewer/source-line-resolver.ts:221-243`
  - **Related audit/task**: `spec-viewer:F11`, `T3-2`
  - **Evidence**:
    - 현재 구현은 multi-line rendered span에서 `textOffset / totalTextLength` 비율로 line index를 추정합니다.
    - 이 알고리즘은 라인 길이가 균등하지 않은 문단/리스트/표 셀에서 실제 source line과 어긋날 수 있습니다.
    - 회귀 테스트도 이 근사 전략을 그대로 고정하고 있습니다: `src/spec-viewer/source-line-resolver.test.ts:88-108`.
  - **Why this remains open**:
    - 이번 phase 변경은 ancestor walk, `Array.from` 제거, selection helper 정리에는 기여했지만, F11의 핵심인 “근사 line mapping 자체”는 구조적으로 바뀌지 않았습니다.
    - `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md:151`도 이 항목을 `Open`으로 남겨 둔 기준과 동일한 상태입니다.
  - **Recommended fix**:
    - 비율 추정 대신 source metadata 기반의 더 정확한 mapping을 도입하셔야 합니다.
    - 우선순위가 높은 방향은 `rehype-source-text-leaves`가 남기는 offset/span 정보를 line-break aware lookup으로 확장하거나, span별 cumulative line boundary를 계산해 offset-to-line을 exact/near-exact로 변환하는 것입니다.

### Low
- **[code-editor:F13] `CodeViewerJumpRequest` 레거시 alias가 남아 있어 naming cleanup이 완전히 끝나지 않았습니다.**
  - **Severity**: Low
  - **File/Line**: `src/code-editor/use-code-editor-view.ts:43-45`, `src/code-editor/code-editor-panel.tsx:73`
  - **Related audit/task**: `code-editor:F13`, `T3-3`
  - **Evidence**:
    - canonical type는 `CodeEditorJumpRequest`로 분리됐지만, deprecated alias가 그대로 export되고 panel도 재-export합니다.
  - **Recommended fix**:
    - call site migration이 끝났다면 alias export를 제거하시고, 당장 제거가 어렵다면 explicit defer 근거를 progress/report에 남기는 편이 안전합니다.

- **[code-editor:F14] `code-viewer-*` CSS/test id surface가 그대로 유지되어 naming drift가 남아 있습니다.**
  - **Severity**: Low
  - **File/Line**: `src/code-editor/code-editor-panel.tsx:375-447`
  - **Related audit/task**: `code-editor:F14`, `T3-3`
  - **Evidence**:
    - panel/header/test id/className이 여전히 `code-viewer-*` 접두어를 사용합니다.
    - 현재 테스트 surface도 이 이름에 결합되어 있습니다. 예: `src/code-editor/code-editor-panel.test.tsx:351`, `src/App.test.tsx:875`.
  - **Recommended fix**:
    - 한 번에 rename하려면 CSS, tests, App integration selector를 함께 교체해야 합니다.
    - 이번 phase에서 유지하려면 “compatibility naming defer”로 명시하는 편이 좋습니다.

## 2. Progress Overview

- `code-editor` 쪽은 giant panel의 CM6 lifecycle이 `useCodeEditorView()`로 이동하면서 F4/F5/F6/F8/F9/F11/F12 대부분이 실질적으로 정리되었습니다.
- `spec-viewer` 쪽은 markdown component factory 추출, unsafe cast 제거, blocked image placeholder 개선, citation failure visibility 보강, `dangerouslySetInnerHTML` 제거로 F1/F2/F7/F8/F9/F12/F14/F15/F16/F17/F19가 의미 있게 닫혔습니다.
- 다만 `spec-viewer:F11`은 현재도 근사 알고리즘이 핵심 동작으로 남아 있어 phase exit blocker가 해소됐다고 보기 어렵습니다.

## 3. Verification Summary

- Environment:
  - `node -v` -> `v25.2.1`
  - `npm -v` -> `11.12.1`
  - spec env recommendation: Node `20.x`
- Focused validation:
  - `npm test -- src/code-editor/code-editor-panel.test.tsx src/code-viewer/language-map.test.ts src/code-viewer/syntax-highlight.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/spec-viewer/highlighted-code-block.test.tsx src/spec-viewer/spec-link-utils.test.ts src/spec-viewer/source-line-resolver.test.ts src/spec-viewer/markdown-security.test.ts`
  - Result: PASS (`8` files, `177` passed)
- Repo gate:
  - `npm test`
  - Result: PASS (`79` files, `912` passed, `1` skipped)
- Repo gate:
  - `npm run lint`
  - Result: PASS
- UI boot attempt:
  - `npm run dev`
  - Result: PASS (`http://localhost:5173/` 출력 확인 후 세션 종료, 수동 상호작용 불가)

## 4. Recommendations

- **Must**: `spec-viewer:F11`을 닫기 위해 근사 line mapping을 exact/near-exact source offset mapping으로 교체하십시오.
- **Should**: `CodeViewerJumpRequest` alias와 `code-viewer-*` naming drift는 compatibility defer인지 실제 rename target인지 progress 문서에 명시하십시오.

## 5. Conclusion

현재 viewer same-scope 기준 결과는 `critical 0 / high 0 / medium 1 / low 2`입니다. 따라서 viewer phase exit gate는 아직 충족되지 않았고, 남은 blocker는 `spec-viewer:F11` 한 건입니다.
