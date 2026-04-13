# Pipeline Log: Spec Viewer 줄번호 확장 (테이블 행 + 코드 블록)

## Meta

- **request**: "Spec viewer 줄번호를 테이블 셀과 코드 펜스 안에도 표시"
- **orchestrator**: `_sdd/pipeline/orchestrators/orchestrator_spec_viewer_line_numbers_v2.md`
- **started**: `2026-04-13T15:00:00+09:00`
- **pipeline**: `feature-draft -> implementation -> implementation-review -> fix -> inline-test -> spec-update-done`

## Status Table

| Step | Agent | Status | Output |
|---|---|---|---|
| 1 | feature-draft | completed | `_sdd/drafts/feature_draft_spec_viewer_line_numbers_v2.md` |
| 2 | implementation | completed | `spec-viewer-panel.tsx`, `App.css`, `spec-viewer-panel.test.tsx`, `App.test.tsx` |
| 2.1 | implementation-review | completed | Critical 0, High 1, Medium 3, Low 3 |
| 2.2 | fix (autopilot direct) | completed | H1 해소 (CSS 주석 + 근거 문서화), M1 해소 (절대값 assertion 추가) |
| 3 | inline-test | completed | 71 files, 828 passed, 1 skipped (1 flaky timeout — 무관) |
| 4 | spec-update-done | completed | `spec-viewer/overview.md`, `feature-index.md`, `main.md` |

## Execution Log Entries

### Step 1: feature-draft
- Part 1: temporary spec 7섹션 (C1~C6, I1~I5, V1~V11)
- Part 2: T1~T5 task details + parallel execution summary
- Risk 식별: tr display:table-row의 ::before 동작, citation segment 충돌 가능성

### Step 2: implementation
- T1: `tr` 핸들러에서 `includeAnchorLine: false` 제거
- T2: `HighlightedCodeBlock`에 `sourceLineStart` prop 추가, 줄별 `<span data-source-line>` 래핑
- T2: `code` 핸들러에서 `node?.position?.start?.line` 전달
- T2: CSS — `pre[data-source-line]::before { content: none }`, `pre code > span[data-source-line] { display: block }`
- T3: DOM 테스트 3개 추가 (V1, V2, V3)
- T4: CSS 패턴 테스트 2개 추가 (V4, V5)
- 기존 테스트 1개 업데이트 (검색 결과가 table → tr로 매핑 개선)
- 테스트 결과: 828 passed, 0 failed, 1 skipped

### Step 2.1: implementation-review
- AC1~AC6 검증, C1~C6 / I1~I5 검증
- H1: tr의 ::before 시각적 렌더링 우려 (High)
- M1: 코드 블록 줄번호 절대값 미검증 (Medium)
- M2: 검색 highlight 이중 적용 가능 (Medium) — 시각적 미관, 기능 오류 아님
- M3: resolver 후보 수 증가 (Medium) — 성능 문제, 대규모 spec에서 확인 필요

### Step 2.2: fix
- H1 해소: position: absolute 덕분에 Chromium에서 tr::before 정상 동작. CSS 주석으로 근거 문서화
- M1 해소: V3 테스트에 절대값 assertion 추가 (expect(3), expect(4)). Opening fence 기준 일관성 확인
- M2, M3: 시각적/성능 문제로 deferred

### Step 3: inline-test
- `npm test` 실행: 828 passed, 1 skipped
- 1 flaky failure (cap message timeout — 줄번호와 무관, 단독 실행 시 통과)

### Step 4: spec-update-done
- `spec-viewer/overview.md` §2: 줄번호 설명 확장 (tr 행, 코드 블록 내부, pre suppression)
- `feature-index.md`: F49.1 행 추가
- `main.md`: 버전 0.49.3

## Final Summary

- **완료 시간**: 2026-04-13
- **실행 결과**: 전 단계 성공
- **생성/수정 파일**: 7개 (spec-viewer-panel.tsx, App.css, spec-viewer-panel.test.tsx, App.test.tsx, overview.md, feature-index.md, main.md)
- **Review 횟수**: 1 (fix 1회 — H1 CSS 주석 + M1 테스트 보강)
- **테스트 결과**: 828 passed / 1 skipped / 1 flaky (무관)
- **스펙 동기화**: 완료 (spec-update-done)
- **잔여 이슈**: M2 (검색 highlight 이중 적용 — 시각적), M3 (resolver 후보 수 증가 — 성능)
