# Implementation Review: SDD Workbench Phase 1

**Review Date**: 2026-04-15
**Review Mode**: Tier 1
**Reference**:
- `_sdd/implementation/2026-04-15_implementation_plan_pre_split_review_status_audit_remediation.md`
- `_sdd/drafts/2026-04-15_feature_draft_pre_split_review_status_audit_remediation.md`
- `_sdd/review/PRE_SPLIT_REVIEW_STATUS_AUDIT_2026-04-15.md`
**Model**: Codex GPT-5

## 1. Findings

### Critical
- None.

### High
- None.

### Medium
- `severity: medium`
  `file/line`: `src/file-tree/file-tree-panel.tsx:226-247`, `src/file-tree/file-tree-panel.tsx:330-344`, `src/file-tree/file-tree-panel.tsx:974-1066`, `src/file-tree/file-tree-panel.tsx:1174-1188`
  `related`: `T1-2`, `file-tree:F3`, `file-tree:F4`, `file-tree:F12`
  `evidence`: Phase 1 actual change set does not modify `file-tree-panel.tsx`, and the file still contains a 13-argument recursive renderer plus inline context-menu action assembly inside a 1244-line component.
  `recommendation`: Extract node rendering and context-menu action composition into dedicated helpers/components, replace positional parameters with a typed context object, and rerun Phase 1 review after the split.

- `severity: medium`
  `file/line`: `src/workspace/workspace-context.tsx:93-220`, `src/workspace/workspace-context-helpers.ts:31-39`, `src/workspace/workspace-model.ts:316-349`
  `related`: `T1-1`, `workspace:F15`, `workspace:F20`, `workspace:F23`
  `evidence`: The current patch closes dialog/error behavior and storage casting, but `loadWorkspaceIndex` still uses an empty dependency array with ref-driven state access, and the `*Compatibility` helpers remain in the public workspace path. That leaves the planned stale-closure/compatibility cleanup incomplete.
  `recommendation`: Either finish the Phase 1 cleanup by removing or isolating the compatibility layer and tightening callback ownership, or explicitly defer these IDs out of the Phase 1 exit gate.

### Low
- `severity: low`
  `file/line`: `electron/workspace-backend/copy-entries.ts:6`
  `related`: `T1-3`, `app-shell-and-backend:F14`
  `evidence`: The local-only helper is still named `copyEntries`, so the naming ambiguity called out by the audit remains.
  `recommendation`: Rename to a local-specific helper name or move the local-only behavior behind a clearly scoped backend surface.

## 2. Progress Overview

Phase 1 is partially complete. The current patch materially improves:

- `app-shell-and-backend:F2` via Finder symlink rejection in `electron/file-clipboard.ts`
- `file-tree:F11` via the Windows separator heuristic fix in `src/context-copy/copy-payload.ts`
- `workspace:F17` via removal of `as unknown as` storage access in `src/workspace/workspace-persistence.ts`
- `workspace:F24` via cancel/error separation between `electron/workspace-ipc-handlers.ts` and `src/workspace/use-workspace-remote.ts`

## 3. Verification Summary

- `node -v`: `v25.2.1`
- `npm -v`: `11.12.1`
- Focused verification:
  `npm test -- src/context-copy/copy-payload.test.ts src/workspace/workspace-persistence.test.ts electron/file-clipboard.test.ts src/App.test.tsx`
  Result: `4 passed`, `208 passed`, `1 skipped`
- Repo gate:
  `npm test`
  Result: `79 passed`, `901 passed`, `1 skipped`
- Repo gate:
  `npm run lint`
  Result: `PASS`

Environment note: `_sdd/env.md` recommends Node `20.x`, but this review was executed on Node `25.2.1`.

## 4. Recommendations

- Must: close the two medium findings before marking Phase 1 complete under the orchestrator gate.
- Should: keep the current `F2/F11/F17/F24` fixes and re-review after the `file-tree` and `workspace` follow-up refactors land.
- Could: fold the `F14` naming cleanup into the same Phase 1 follow-up if the write set is already open.

## 5. Conclusion

Phase 1 does not meet the orchestrator exit condition yet. Fresh tests and lint are green, but `critical/high/medium = 0` is not satisfied because `file-tree` structural cleanup and `workspace` stale-closure/compatibility cleanup remain open.
