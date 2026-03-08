# Implementation Review: F36/F37 Theme Modes (`dark-gray` + `light`)

**Review Date**: 2026-03-08  
**Plan Location**: `/_sdd/implementation/IMPLEMENTATION_PLAN.md`  
**Draft Location**: `/_sdd/drafts/feature_draft_f36_f37_theme_modes_dark_gray_and_light.md`  
**Spec Baseline**: planned state (`spec-update-todo` applied, `spec-update-done` 미수행)  
**Reviewer**: Codex

---

## 1. Findings by severity

이번 재리뷰에서는 **새로운 findings를 발견하지 못했다.**

이전 리뷰에서 제기했던 항목은 모두 해소됐다.

- pre-paint theme bootstrap 추가: `src/main.tsx`, `src/appearance-theme.ts`, `src/App.tsx`
- storage access exception guard 추가: `src/appearance-theme.ts`, `src/appearance-theme.test.ts`
- Shiki highlighter retry-safe cache 추가: `src/code-viewer/syntax-highlight.ts`, `src/code-viewer/syntax-highlight.test.ts`

### Residual Risks / Testing Gaps

- `main.tsx`의 bootstrap은 unit/helper 경로와 full build/test로는 확인됐지만, 실제 packaged app cold start에서 first-paint flash가 체감상 완전히 사라졌는지는 수동 확인이 가장 확실하다.
- `vite` chunk size warning과 `electron-builder` metadata/signing 경고는 계속 존재하지만, 이번 feature 범위와 직접 충돌하지는 않는다.

### Critical / High / Medium / Low

- 없음

---

## 2. Progress Overview

### Task Completion

| ID | Task | Code | Tests | Status |
|----|------|------|-------|--------|
| 1 | appearance theme 계약 및 persistence helper 추가 | ✓ | ✓ | COMPLETE |
| 2 | App selector, root attribute, panel prop wiring 추가 | ✓ | ✓ | COMPLETE |
| 3 | global CSS token layer 도입 및 explicit theme root 정리 | ✓ | ✓ | COMPLETE |
| 4 | CodeMirror `dark-gray` retune + `light` theme routing 추가 | ✓ | ✓ | COMPLETE |
| 5 | Shiki/spec code block theme-aware routing 추가 | ✓ | ✓ | COMPLETE |
| 6 | light palette를 App shell/panel/control 전반에 완성 | ✓ | ✓ | COMPLETE |
| 7 | persistence/theme switching 회귀 테스트 및 품질 게이트 보강 | ✓ | ✓ | COMPLETE |

### Coverage Summary

- 계획된 7개 task 모두 구현돼 있다.
- persistence, selector switching, root attribute propagation, CM6 route switching, Shiki theme routing, light/dark-gray palette contract, failure recovery, quality gates까지 모두 실행 증거가 있다.
- 이전 review findings 3건은 코드와 테스트로 닫혔다.

---

## 3. Acceptance Criteria Assessment

### Task 1-2: Theme Contract / App Wiring

- `AppearanceTheme = 'dark-gray' | 'light'` 지원: **MET**
- malformed/empty/throwing storage fallback: **MET**
- selector 전환 및 panel prop 전달: **MET**
- persistence helper 호출 및 restore integration: **MET**
- pre-paint root theme bootstrap: **MET**

### Task 3-6: Token Layer / CM6 / Shiki / Light Polish

- semantic token layer 도입 및 주요 surface tokenization: **MET**
- explicit root theme state 우선: **MET**
- CM6 `dark-gray` / `light` route: **MET**
- search / selection / navigation highlight visibility regression: **MET**
- Shiki theme-aware routing / cache separation: **MET**
- Shiki transient failure 후 retry-safe recovery: **MET**
- light palette shell/control/tree/modal polish: **MET**

### Task 7: Regression / Quality Gates

- App integration regression: **MET**
- CodeEditorPanel regression: **MET**
- Spec Viewer / syntax highlight regression: **MET**
- manual smoke checklist 문서화: **MET**
- `npx tsc --noEmit`, `npm test`, `npm run build`: **MET**

---

## 4. Evidence Reviewed

### Key Source Files

- `src/appearance-theme.ts`
- `src/appearance-theme-selector.tsx`
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/App.css`
- `src/code-editor/cm6-dark-theme.ts`
- `src/code-editor/cm6-light-theme.ts`
- `src/code-editor/code-editor-panel.tsx`
- `src/code-viewer/syntax-highlight.ts`
- `src/spec-viewer/spec-viewer-panel.tsx`

### Key Test Files

- `src/appearance-theme.test.ts`
- `src/App.test.tsx`
- `src/code-editor/code-editor-panel.test.tsx`
- `src/code-viewer/syntax-highlight.test.ts`
- `src/spec-viewer/spec-viewer-panel.test.tsx`

### Documents Reviewed

- `/_sdd/implementation/IMPLEMENTATION_PLAN.md`
- `/_sdd/implementation/IMPLEMENTATION_PROGRESS.md`
- `/_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_1.md`
- `/_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_2.md`
- `/_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_3.md`
- `/_sdd/implementation/IMPLEMENTATION_REPORT_PHASE_4.md`

---

## 5. Test Status

### Executed in this review window

- `node -v` → `v25.2.1`
- `npm -v` → `11.7.0`
- `npx tsc --noEmit` → **PASS**
- `npm test -- --run src/appearance-theme.test.ts src/code-viewer/syntax-highlight.test.ts src/App.test.tsx` → **PASS** (`3 files, 135 passed, 1 skipped`)
- `npm test` → **PASS** (`56 files, 592 passed, 1 skipped`)
- `npm run build` → **PASS**

### Non-blocking build notes

- `vite` chunk size warning 존재
- `electron-builder`의 `description` / `author` / signing 경고 존재
- 모두 기존과 동일한 비차단 상태

---

## 6. Recommendations

### Must Do

- 없음

### Should Do

1. packaged app cold start에서 `light` restore가 체감상 깜빡임 없이 보이는지 한 번 수동 확인하면 더 좋다.

### Could Do

1. 차후 `spec-update-done` 시 theme bootstrap/failure recovery contract를 구현 반영사항으로 문서화한다.

---

## 7. Conclusion

**READY**

F36/F37 구현은 현재 계획 기준으로 완료 상태다. 이전 리뷰에서 걸렸던 pre-paint theme bootstrap, storage exception guard, Shiki retry-safe cache 모두 반영됐고, 관련 회귀 테스트와 전체 품질 게이트도 통과했다. 현재 기준으로는 기능/테스트/빌드 모두 `spec-update-done` 단계로 넘겨도 되는 상태다.
