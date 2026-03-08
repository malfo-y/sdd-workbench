# F36/F37 Phase 1 Implementation Report — Theme Foundation & App Wiring

## Progress Summary

- **Total Tasks**: 2 (`1`, `2`)
- **Completed**: 2/2
- **Tests Added**: 5 (`appearance-theme.test.ts` 3 + `App.test.tsx` 2)
- **All Passing**: Yes (`579 passed, 1 skipped`)
- **Build**: Clean (`npx tsc --noEmit`, `npm test`, `npm run build`)

## Parallel Execution Stats

| Metric | Value |
|--------|-------|
| Total Groups Dispatched | 1 |
| Tasks Run in Parallel | 0 |
| Sequential Tasks | 2 (`1 -> 2`) |
| Sub-agent Failures | 0 |
| Sequential Fallback Reason | `src/App.tsx` state contract / root wiring 공유 |

## Completed Tasks

| ID | Task | Tests | Execution |
|----|------|-------|-----------|
| 1 | appearance theme 계약 및 persistence helper 추가 | 3 | Group A (sequential) |
| 2 | App selector, root attribute, panel prop wiring 추가 | 2 | Group A (sequential) |

## Files Created

| File | Description |
|------|-------------|
| `src/appearance-theme.ts` | appearance theme 타입, storage key, load/save helper |
| `src/appearance-theme.test.ts` | helper unit tests |
| `src/appearance-theme-selector.tsx` | header theme selector UI |

## Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | lazy hydrate + root `data-theme` + header selector + panel prop wiring |
| `src/App.test.tsx` | theme restore/fallback/selector integration regression |
| `src/code-editor/code-editor-panel.tsx` | optional `appearanceTheme` prop + root data attribute |
| `src/spec-viewer/spec-viewer-panel.tsx` | optional `appearanceTheme` prop + root data attribute |

## Test Summary

- **New tests**: 5
- **Final result**: `56 files, 579 passed, 1 skipped`
- **Type check**: Clean (`npx tsc --noEmit`)
- **Build**: Clean (`npm run build`)

## Quality Assessment

### Security
- 새로운 IPC 채널이나 권한 경계 변경 없음
- renderer localStorage만 사용하고, theme 값은 허용된 유니온으로만 파싱

### Error Handling
- malformed 저장값은 `dark-gray`로 안전하게 fallback
- unmount 시 root `data-theme`를 제거해 테스트/재마운트 오염 방지

### Code Patterns
- theme 계약을 `src/appearance-theme.ts`로 분리해 App에서 재사용
- selector는 최소 UI 컴포넌트로 분리하고 기존 select 스타일을 재사용
- Code/Spec panel에는 additive prop만 추가해 Phase 2 theme routing 준비 완료

### Performance
- theme hydrate는 lazy `useState` initializer로 1회만 수행
- root attribute 전환만 추가되어 Phase 1 렌더 비용 증가는 미미함

### Test Quality
- helper는 순수 unit test로 고정
- App integration test는 restore, malformed fallback, persistence, panel prop forwarding을 함께 검증

## Issues Encountered & Resolved

| Issue | Resolution |
|-------|------------|
| theme restore 로직은 추가됐지만 root attribute/source of truth가 없었음 | `document.documentElement[data-theme]` effect로 고정 |
| selector UI 추가를 위해 App.css를 건드리면 Phase 1 scope가 넓어질 수 있었음 | 기존 `workspace-switcher-select` 스타일을 재사용 |
| panel theme wiring을 지금 안 잡으면 Phase 2 task가 App 계약 변경까지 다시 건드려야 함 | Phase 1에서 optional `appearanceTheme` prop과 root data attribute를 먼저 고정 |

## Phase Verdict

**READY** — Phase 1 acceptance criteria 충족, 타입 체크/전체 테스트/빌드 모두 통과.

## Next Steps

- **Phase 2 / Task 3**: `src/index.css`, `src/App.css` token foundation + explicit theme root 정리
- **Phase 2 / Task 4**: CM6 `dark-gray` retune + `light` theme routing
- **Phase 2 / Task 5**: Shiki/spec code block theme-aware routing
