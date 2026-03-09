# Implementation Review: F29/F30 파일 브라우저 검색 + 스펙 뷰어 검색

**Review Date**: 2026-03-06  
**Plan Location**: `/_sdd/drafts/feature_draft_f29_f30_file_tree_and_spec_search.md` (Part 2)  
**Spec Baseline**: `/_sdd/spec/main.md`, `/_sdd/spec/sdd-workbench/component-map.md`, `/_sdd/spec/sdd-workbench/contract-map.md`  
**Reviewer**: Codex

---

## 1. Findings by severity

### Medium

1. **TypeScript 정적 검증이 현재 워킹트리에서 깨진 상태다.**
   - 근거:
     - `npx tsc --noEmit` 실패
     - 신규 변경 관련 오류: `src/spec-viewer/spec-viewer-panel.tsx:940`, `src/spec-viewer/spec-viewer-panel.tsx:952`, `src/spec-viewer/spec-viewer-panel.tsx:979`, `src/spec-viewer/spec-viewer-panel.tsx:1250`
     - 신규 계약 반영 누락 오류: `src/App.test.tsx:318`, `electron/workspace-backend/backend-router.test.ts:5`
     - 기존 런타임 타입 오류도 여전히 존재: `electron/remote-agent/runtime/workspace-ops.ts:92`, `:95`, `:224`, `:240`, `:294`
   - 영향:
     - 런타임 테스트는 통과하지만, 타입체크를 품질 게이트로 쓰는 흐름에서는 현재 구현을 바로 승인하기 어렵다.
     - 특히 `searchFiles` 추가 이후 test mock/interface 동기화가 완전히 끝나지 않았다.
   - 판정: **Quality issue**

2. **Spec viewer 검색이 table body 매치에서는 블록 하이라이트/포커스가 누락될 가능성이 높다.**
   - 근거:
     - raw markdown 매치 라인 계산은 `|`로 시작하는 모든 라인을 새 block boundary로 취급한다: `src/spec-viewer/spec-viewer-panel.tsx:331-338`, `:341-370`
     - 실제 하이라이트는 exact `data-source-line` DOM marker에만 적용된다: `src/spec-viewer/spec-viewer-panel.tsx:531-547`
     - 렌더 마커는 `table` 자체에만 붙고 `tr`/`td`에는 붙지 않는다: `src/spec-viewer/spec-viewer-panel.tsx:1030-1092`
   - 영향:
     - 표 헤더 이후 body row에서 검색어가 매치되면 `searchMatchLines`에는 row line이 들어가지만, 대응되는 rendered block marker가 없어 강조/스크롤이 되지 않을 수 있다.
     - draft의 “매치된 source line에 대응되는 렌더 블록 하이라이트” 수용 기준을 table 케이스에서 완전히 만족하지 못한다.
   - 판정: **Functional gap**

### Low

3. **Draft가 요구한 App-level hotkey 회귀 테스트가 빠져 있다.**
   - 근거:
     - draft는 Task 8 target에 `src/App.test.tsx`를 명시한다: `/_sdd/drafts/feature_draft_f29_f30_file_tree_and_spec_search.md:449-450`
     - 현재 추가된 검색 hotkey 검증은 panel 단위 테스트에만 있다: `src/spec-viewer/spec-viewer-panel.test.tsx:670-730`
     - `src/App.test.tsx`에는 F29/F30 검색 회귀 테스트가 없다.
   - 영향:
     - `App.tsx`의 `activeTab === 'spec'` wiring(`src/App.tsx:2075-2080`)과 Code 탭 CM6 `Mod-f` 공존이 실제 앱 조합에서 보호되지 않는다.
     - draft의 리스크 항목(`Cmd/Ctrl+F` 충돌은 High risk) 대비 검증 강도가 낮다.
   - 판정: **Coverage gap**

4. **Spec 문서에는 아직 F29/F30 구현이 반영되지 않았다.**
   - 근거:
     - spec index는 아직 `F01~F28`까지만 완료 범위로 적고 있다: `/_sdd/spec/main.md:41-67`
     - Spec Viewer Layer / Electron Boundary / IPC 계약에는 `spec search`와 `workspace:searchFiles`가 없다: `/_sdd/spec/sdd-workbench/component-map.md:101-109`, `:138-192`, `/_sdd/spec/sdd-workbench/contract-map.md:123-152`
   - 영향:
     - 현재 구현과 spec baseline 사이에 drift가 생겼다.
     - 코드 리뷰/온보딩 시 최신 기능 존재를 spec만으로는 알 수 없다.
   - 판정: **Spec update needed**

### Critical / High

- 없음

---

## 2. Progress Overview

### Task Completion

| ID | Task | Code | Tests | Status |
|----|------|------|-------|--------|
| 1 | `workspace:searchFiles` 타입/bridge/contract 정의 | ✓ | ✓ | COMPLETE |
| 2 | 로컬 backend 파일명 검색 구현 | ✓ | ✓ | COMPLETE |
| 3 | remote runtime + remote backend 검색 구현 | ✓ | ✓ | COMPLETE |
| 4 | WorkspaceContext 액션 + FileTreePanel 검색 UI/결과 렌더 | ✓ | ✓ | COMPLETE |
| 5 | SpecViewerPanel 검색 상태/블록 하이라이트/이동 구현 | △ | ✓ | PARTIAL |
| 6 | App Shell hotkey 게이트 + Spec 활성 상태 연결 | ✓ | △ | COMPLETE (coverage gap) |
| 7 | backend/runtime/file-tree 검색 테스트 추가 | ✓ | ✓ | COMPLETE |
| 8 | spec 검색 테스트 추가 | △ | △ | PARTIAL |

### Acceptance Criteria Summary

- Total criteria reviewed: `36`
- Met: `34`
- Not met: `1`
- Untested / insufficiently tested: `1`

판정 근거:
- `Task 5`의 table-body search mapping 이슈로 기능 기준 1건을 `NOT MET`로 분류
- `Task 8`의 App-level hotkey regression 누락으로 검증 기준 1건을 `UNTESTED`로 분류

---

## 3. Detailed Assessment

### Completed Tasks

- **Task 1**
  - 코드: `electron/workspace-backend/types.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`
  - 확인: `WorkspaceBackend.searchFiles`, preload bridge, renderer result type, metadata fields 모두 추가됨
- **Task 2**
  - 코드: `electron/workspace-search.ts`, `electron/main.ts`, `electron/workspace-backend/local-workspace-backend.ts`
  - 확인: case-insensitive filename substring, depth/result/large-dir/time budget 정책 구현
- **Task 3**
  - 코드: `electron/remote-agent/runtime/workspace-ops.ts`, `electron/remote-agent/runtime/request-router.ts`, `electron/workspace-backend/remote-workspace-backend.ts`
  - 확인: remote RPC `workspace.searchFiles` 추가, 로컬과 동일 메타데이터 shape 유지
- **Task 4**
  - 코드: `src/workspace/workspace-context.tsx:2374-2429`, `src/file-tree/file-tree-panel.tsx:449-564`, `:784-860`, `src/App.tsx:2007-2019`
  - 확인: debounce, loading/empty/partial 상태, 결과 선택 시 파일 오픈 + ancestor best-effort expand
- **Task 6**
  - 코드: `src/App.tsx:2075-2080`, `src/spec-viewer/spec-viewer-panel.tsx:549-568`
  - 확인: `isActive` prop 기반 hotkey gate 구현
- **Task 7**
  - 테스트:
    - `electron/workspace-search.test.ts`
    - `electron/workspace-backend/backend-integration.test.ts`
    - `electron/workspace-backend/remote-workspace-backend.test.ts`
    - `electron/remote-agent/runtime/workspace-ops.test.ts`
    - `src/file-tree/file-tree-panel.test.tsx`
  - 확인: backend/runtime/UI 축 모두 존재

### Partial Tasks

- **Task 5**
  - 코드: `src/spec-viewer/spec-viewer-panel.tsx`
  - 충족:
    - 검색 바 UI
    - raw markdown 기준 match 계산
    - next/prev/Enter/Shift+Enter 이동
    - Escape/닫기 reset
    - `activeSpecPath` 변경 시 초기화
  - 부족:
    - table body row 매치에서 rendered block highlight 대응이 완전하지 않음
- **Task 8**
  - 테스트: `src/spec-viewer/spec-viewer-panel.test.tsx:670-730`
  - 충족:
    - search open
    - count/highlight
    - Enter navigation
    - Escape close
    - inactive hotkey guard
  - 부족:
    - draft가 요구한 `src/App.test.tsx` 통합 hotkey 회귀 없음

---

## 4. Test Status

### Executed in this review

- `node -v` → `v25.2.1`
- `npm -v` → `11.7.0`
- `npm test` → **PASS** (`53 files, 537 passed, 1 skipped`)
- `npx tsc --noEmit` → **FAIL**

### Blind Spots

- 실제 App shell에서 Code 탭 CM6 검색과 Spec 탭 검색이 충돌하지 않는지에 대한 integration coverage가 없다.
- spec viewer table search, complex markdown block(line wrap/table body) 케이스에 대한 자동 테스트가 없다.
- spec baseline은 아직 F29/F30을 설명하지 않으므로 문서 검증과 코드 검증이 분리되어 있다.

---

## 5. Recommendations

### Must Do

1. `npx tsc --noEmit`가 통과하도록 타입 오류를 정리한다.
2. spec viewer search line-to-block mapping을 table/body row까지 맞춘다.
3. `src/App.test.tsx`에 Spec 탭 `Cmd/Ctrl+F` open + Code 탭 CM6 non-regression 통합 테스트를 추가한다.

### Should Do

1. `spec-update-done` 또는 `spec-update-todo`로 F29/F30을 spec index/components/interfaces에 반영한다.
2. spec viewer search에 table/list/multiline paragraph 케이스를 추가해 block mapping 회귀를 막는다.

### Could Do

1. file tree search race(clear/workspace switch 중 늦게 도착한 응답)까지 테스트를 넓힌다.
2. search partial hint에 skip/timedOut 원인을 더 구체적으로 노출하는 UX를 검토한다.

---

## 6. Open Questions

- 현재 프로젝트의 공식 품질 게이트가 `build + test + lint`인지, 아니면 `tsc --noEmit`도 release 기준에 포함되는지 문서상 명확하지 않다.
  - deterministic default: 이번 리뷰에서는 `tsc --noEmit` 실패를 **Quality issue**로 분류했다.

---

## 7. Final Verdict

**CONDITIONALLY READY**

핵심 기능(F29 파일 검색, F30 spec 검색)은 코드와 런타임 테스트 기준으로 대부분 구현되었고 `npm test`도 모두 통과한다. 다만 현재 워킹트리 기준으로는 타입체크가 깨져 있고, spec viewer search가 table body 매치를 완전하게 처리하지 못하며, draft가 요구한 App-level hotkey 회귀 검증과 spec 동기화가 남아 있다. 가장 먼저 할 일은 `npx tsc --noEmit` 복구와 search mapping/통합 테스트 보강이다.
