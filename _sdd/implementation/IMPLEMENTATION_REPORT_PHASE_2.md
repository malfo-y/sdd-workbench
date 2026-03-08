# F36/F37 Phase 2 Implementation Report — `dark-gray` Baseline + Theme-Aware CM6/Shiki

## Progress Summary

- **Total Tasks**: 3 (`3`, `4`, `5`)
- **Completed**: 3/3
- **Tests Added**: 4 (`code-editor-panel.test.tsx` 1 + `syntax-highlight.test.ts` 2 + `spec-viewer-panel.test.tsx` 1)
- **All Passing**: Yes (`583 passed, 1 skipped`)
- **Build**: Clean (`npx tsc --noEmit`, `npm test`, `npm run build`)

## Parallel Execution Stats

| Metric | Value |
|--------|-------|
| Total Groups Dispatched | 1 |
| Tasks Run in Parallel | 3 (parallel-eligible) |
| Sequential Tasks | 0 |
| Sub-agent Failures | 0 |
| Single-session reason | shared palette tuning across CSS, CM6, and Shiki was easier to stabilize together |

## Completed Tasks

| ID | Task | Tests | Execution |
|----|------|-------|-----------|
| 3 | global CSS token layer 도입 및 explicit theme root 정리 | full regression | Group A |
| 4 | CodeMirror `dark-gray` retune + `light` theme routing 추가 | 1 | Group A |
| 5 | Shiki/spec code block theme-aware routing 추가 | 3 | Group A |

## Files Created

| File | Description |
|------|-------------|
| `src/code-editor/cm6-light-theme.ts` | `light` appearance용 CM6 theme extension |

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | semantic theme token layer, explicit `data-theme` palette values, global control defaults |
| `src/App.css` | shell/panel/control/token consumption 정리, raw color hardcode 제거 |
| `src/code-editor/cm6-dark-theme.ts` | current dark palette를 graphite `dark-gray` baseline으로 retune |
| `src/code-editor/code-editor-panel.tsx` | compartment-based CM6 theme routing |
| `src/code-editor/code-editor-panel.test.tsx` | CM6 dark/light switching regression |
| `src/code-viewer/syntax-highlight.ts` | appearance-aware Shiki routing/cache + typed lazy theme/language loader |
| `src/code-viewer/syntax-highlight.test.ts` | light/dark-gray highlight output/cache regression |
| `src/spec-viewer/spec-viewer-panel.tsx` | fenced code block highlight에 appearance theme 전달 |
| `src/spec-viewer/spec-viewer-panel.test.tsx` | fenced code block theme rerender regression |

## Test Summary

- **New tests**: 4
- **Final result**: `56 files, 583 passed, 1 skipped`
- **Type check**: Clean (`npx tsc --noEmit`)
- **Build**: Clean (`npm run build`)

## Quality Assessment

### Security
- 새로운 IPC 채널, preload API, 권한 경계 변경 없음
- theme switching은 renderer-local appearance state와 CSS/CM6/Shiki presentation만 변경

### Error Handling
- Shiki theme/language load 실패 시 기존 plaintext escape fallback 유지
- initial implementation에서 발생한 `ThemeInput`/`LanguageInput` 타입 불일치는 lazy getter contract로 정리해 build gate를 복구

### Code Patterns
- semantic token source는 `src/index.css`, token consumption은 `src/App.css`로 분리
- CM6는 editor recreate 대신 compartment reconfigure로 theme를 교체
- Shiki cache를 appearance theme별로 분리해 dark-gray/light 전환 시 cache pollution을 방지

### Performance
- theme switch는 root dataset 변경 + CM6 compartment reconfigure + 필요 시 fenced code block rerender만 수행
- Shiki highlighter는 theme variant별 singleton cache를 재사용
- `App.css`의 tokenization으로 explicit theme switch 시 `prefers-color-scheme` 경로와 충돌하지 않음

### Test Quality
- CM6 facet-based theme assertions으로 visual class 의존 없이 전환 경로를 고정
- syntax highlight tests가 output change와 cache separation을 함께 고정
- Spec Viewer integration test가 fenced code block rerender를 실제 panel 경로에서 검증

## Issues Encountered & Resolved

| Issue | Resolution |
|-------|------------|
| `App.css`에 남아 있던 surface/state hardcoded colors가 light theme 준비를 방해 | semantic token으로 이동하고 잔여 hex/rgba를 제거 |
| Shiki dynamic import를 `Promise<unknown>`로 감싸면서 `tsc`가 `ThemeInput`/`LanguageInput` 불일치로 실패 | lazy getter 자체를 `ThemeInput`/`LanguageInput`으로 선언해 contract를 직접 맞춤 |
| CM6 theme switch를 recreate effect에 묶으면 editor state churn이 커질 수 있었음 | 별도 `themeCompartment.reconfigure(...)` effect로 분리 |
| build 단계에서 Shiki theme asset이 추가되며 bundle 구성이 변함 | `github-dark-dimmed` / `github-light` chunk가 정상적으로 분리 생성되는 것까지 확인 |

## Non-Blocking Build Notes

- `vite` chunk size warning 존재 (`cpp`, main bundle 등), 이번 Phase 범위 밖
- `electron-builder`가 `package.json`의 `description`/`author` 누락과 macOS signing 제약을 경고, 기존 상태와 동일

## Phase Verdict

**READY** — Phase 2 acceptance criteria 충족, 타입 체크/전체 테스트/빌드 모두 통과.

## Next Steps

- **Phase 3 / Task 6**: light palette를 shell/tree/modal/banner 상태색까지 시각적으로 polish
- `App.test.tsx`에 shell-level light contract 회귀를 더 고정
- 필요 시 `implementation-review`로 light theme 품질과 regression surface를 점검
