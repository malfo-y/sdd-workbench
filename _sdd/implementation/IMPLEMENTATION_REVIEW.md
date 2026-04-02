# Implementation Review: F48 Spec Viewer Table Cell + Repeated Text Anchor Hardening

**Review Date**: 2026-04-02
**Review Mode**: Tier 1
**Reference**: [feature_draft_f48_spec_table_cell_anchor_precision.md](/Users/hyunjoonlee/github/sdd-workbench/_sdd/drafts/feature_draft_f48_spec_table_cell_anchor_precision.md)
**Model**: GPT-5 Codex

## 1. Findings
### Critical (0)
- 없음

### High (0)
- 없음

### Medium (2)
- 서로 다른 table cell에 달린 exact-offset comment가 같은 source line을 공유하면 marker count가 과대 계산될 수 있습니다. [`mapCommentCountsToMarkerAnchors()`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.tsx#L608) 는 line count를 단일 anchor로 먼저 몰아넣고, [`mergeCommentMarkerCounts()`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.tsx#L630) 가 그 값을 `Math.max`로 유지합니다. 그래서 같은 row의 두 cell에 comment가 1개씩 있을 때도 한 cell이 `2`, 다른 cell이 `1`로 보일 수 있습니다. 현재 regression은 단일 table comment까지만 검증합니다. [`spec-viewer-panel.test.tsx#L1556`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.test.tsx#L1556)
- exact offset이 없는 legacy/imported table comment는 여전히 임의의 cell에 붙습니다. [`selectBestRenderedCommentMarkerAnchor()`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.tsx#L495) 와 [`selectBestRenderedCommentMarkerAnchorForLine()`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.tsx#L552) 는 row-neutral fallback 없이 모든 anchor를 line/distance/depth/key로 정렬해 하나를 고릅니다. 그런데 table 렌더러는 현재 `td/th`만 marker anchor로 노출하고 [`spec-viewer-panel.tsx#L1825`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.tsx#L1825), same-row candidate는 따로 만들지 않습니다. 결과적으로 draft의 T3에서 정한 `same-cell -> td/th -> same-row candidate` fallback hierarchy는 부분 구현 상태입니다.

### Low (0)
- 없음

## 2. Progress Overview

- T1은 새 metadata surface를 더 넓히지 않고, 기존 leaf wrapping contract가 same-cell scope를 만족하는지 regression으로 고정하는 방식으로 처리됐다. [`rehype-source-text-leaves.test.ts#L13`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/rehype-source-text-leaves.test.ts#L13)
- T2는 resolver에서 same-cell only exact path와 repeated-text uniqueness guard를 추가해 주요 selection precision 요구사항을 충족했다. [`source-line-resolver.ts#L193`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/source-line-resolver.ts#L193), [`source-line-resolver.ts#L455`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/source-line-resolver.ts#L455)
- T3는 line fan-out marker mapping을 anchor-key 기반으로 바꿔 table cell marker placement를 개선했다. [`spec-viewer-panel.tsx#L421`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.tsx#L421), [`spec-viewer-panel.tsx#L1251`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.tsx#L1251)
- T4는 same-cell inline code exact offset, cross-cell fallback, repeated-text ambiguity, table cell marker placement regression을 추가해 핵심 경로를 고정했다. [`source-line-resolver.test.ts#L209`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/source-line-resolver.test.ts#L209), [`spec-viewer-panel.test.tsx#L1304`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.test.tsx#L1304), [`spec-viewer-panel.test.tsx#L1556`](/Users/hyunjoonlee/github/sdd-workbench/src/spec-viewer/spec-viewer-panel.test.tsx#L1556)

## 3. Verification Summary

- 환경 확인:
  - `node -v` -> `v25.2.1`
  - `npm -v` -> `11.12.1`
- Fresh verification:
  - `npx vitest run src/spec-viewer/source-line-resolver.test.ts src/spec-viewer/spec-viewer-panel.test.tsx src/spec-viewer/rehype-source-text-leaves.test.ts` -> pass (`3 files, 72 passed`)
  - `npx tsc --noEmit` -> pass
  - `npm test` -> pass (`71 files, 811 passed, 1 skipped`)
- 코드/테스트 기준으로 same-cell exact offset 저장, cross-cell safe fallback, repeated-text ambiguity fallback, 단일 table cell marker placement는 구현 및 검증됐다.
- 다만 multi-comment same-line aggregation과 offset-less table fallback은 fresh test 범위에도 없고, 코드 읽기 기준으로 draft 의도와 완전히 맞지 않는다.

## 4. Recommendations

### Must
- exact offset이 있는 comment가 anchor별로 분리될 때는 `commentLineCounts`를 line-level baseline으로 그대로 merge하지 말고, exact-anchor entries를 authoritative source로 삼아 per-anchor count를 다시 계산해야 한다.
- offset-less table comment에 대해 false precision을 피할 same-row fallback을 추가하거나, 최소한 arbitrary cell placement를 피하는 중립 anchor 정책을 명시적으로 구현해야 한다.

### Should
- 같은 row의 서로 다른 cell에 comment 2개가 있을 때 marker count가 `1 + 1`로 유지되는 regression test를 추가해야 한다.
- table line comment가 offset 없이 저장된 legacy/imported 케이스에 대한 marker placement regression을 추가해야 한다.

### Could
- marker anchor selection을 panel 내부 helper에 두는 현재 구조를 유지하더라도, table fallback policy를 별도 helper로 추출하면 이후 `same-row candidate` 추가 시 조건 분기가 덜 얽힌다.

## 5. Conclusion

F48 구현은 사용자가 실제로 겪던 same-cell table selection 문제를 해결하는 주 경로에서는 잘 맞습니다. fresh verification도 모두 통과했고, repeated-text ambiguity guard와 cell-level marker 배치도 들어갔습니다. 다만 marker fallback의 마지막 단계가 아직 draft에서 닫은 결정사항을 끝까지 구현하지 못했고, multi-comment same-line count aggregation에도 남은 결함이 있어 이번 평가는 "핵심 경로는 완료, marker fallback/aggregation은 추가 보정 필요"가 적절합니다.
