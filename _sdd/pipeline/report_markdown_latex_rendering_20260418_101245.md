# Pipeline Report: markdown_latex_rendering

## 1. 뭘 했는가

- 실행 단계:
  - Step 1 `feature_draft`
  - Step 2 `implementation`
  - Step 2.1 immediate `implementation_review` gate
  - Step 2.2 inline validation (`npm test`, `npm run lint`)
  - Step 3 `spec_update_done`
- 사용한 에이전트:
  - `feature_draft` 성격 agent 1회
  - `implementation` 성격 agent 1회
  - `implementation_review` 성격 agent 1회
  - `spec_update_done` 성격 agent 1회
- 주요 산출물:
  - `_sdd/pipeline/orchestrators/orchestrator_markdown_latex_rendering.md`
  - `_sdd/drafts/2026-04-18_feature_draft_markdown_latex_rendering.md`
  - `_sdd/implementation/2026-04-18_implementation_review_markdown_latex_rendering.md`
  - `_sdd/pipeline/log_markdown_latex_rendering_20260418_101245.md`
  - 코드 변경: `package.json`, `package-lock.json`, `src/main.tsx`, `src/App.css`, `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/spec-viewer-markdown-components.tsx`, `src/spec-viewer/markdown-security.ts`, `src/spec-viewer/markdown-security.test.ts`, `src/spec-viewer/spec-viewer-panel.test.tsx`
  - 스펙 동기화: `_sdd/spec/spec-viewer/overview.md`, `_sdd/spec/spec-viewer/contracts.md`, `_sdd/spec/feature-index.md`, `_sdd/spec/decision-log.md`
- review-fix 횟수:
  - review 1회
  - fix 재진입 0회
  - re-review 0회

## 2. 어떻게 나왔는가

- 결과:
  - Spec Viewer markdown 렌더러에 KaTeX 기반 LaTeX math support가 추가되었다.
  - `$...$` 인라인 수식과 `$$...$$` 블록 수식이 렌더된다.
  - KaTeX CSS는 앱 bootstrap 시점에 1회 로드되도록 고정되었다.
  - sanitize schema는 KaTeX/MathML 최소 subtree만 허용하도록 확장되었고 기존 unsafe URI 차단은 유지되었다.
  - math wrapper에도 source metadata를 유지해 기존 `Go to Source`/selection 경로와 공존하도록 맞췄다.
  - feature index에 `F50 | spec viewer markdown LaTeX 렌더링`이 추가되었다.
- review-fix gate:
  - `critical/high/medium` finding 없음
  - immediate review-fix gate 종료 조건 충족
- 테스트/검증:
  - focused test: `npm test -- src/spec-viewer/markdown-security.test.ts src/spec-viewer/spec-viewer-panel.test.tsx` -> 71 passed
  - full repo test: `npm test` -> 79 files passed, 922 passed, 1 skipped
  - lint: `npm run lint` -> passed
  - 수동 UI 확인: `npm run dev` 기반 Electron 시각 확인은 이번 실행에 포함하지 못함
- 스펙 동기화:
  - `spec-viewer` overview/contracts, `feature-index`, `decision-log` 반영 완료
  - `main.md`는 thin global spec 원칙에 따라 수정하지 않음

## 3. 뭘 더 해야 하는가

- 권장 후속 확인:
  - `npm run dev`로 실제 Electron 패널에서 긴 display math overflow, line gutter, context menu source action을 한 번 수동 확인
- 제한사항 / 리스크:
  - `remark-math`의 single-dollar parsing 때문에 금액 표기 문장에서 오탐 가능성이 남아 있음
  - 현재 문서 집합에서 문제는 없지만, 실제 사용 예제가 쌓이면 currency/escaped-dollar 회귀 케이스를 추가하는 것이 좋음
- 미완료 단계:
  - 없음. 오케스트레이터 기준 Step 1~3과 최종 보고까지 완료

## 4. Taste Decisions

- Math engine은 MathJax가 아니라 KaTeX 기반 경로를 선택했다.
- stylesheet는 패널 단위 주입 대신 앱 bootstrap import로 고정했다.
- sanitize는 render 후 최소 allowlist 확장 방식으로 유지했다.
- global spec은 feature-level 상세를 `main.md`에 넣지 않고 `spec-viewer` 하위 문서와 feature index에만 반영했다.

## 5. 오케스트레이터 상태

- orchestrator: `_sdd/pipeline/orchestrators/orchestrator_markdown_latex_rendering.md`
- log: `_sdd/pipeline/log_markdown_latex_rendering_20260418_101245.md`
- status: completed

## 6. 추가 메모

- spec-less 시작이 아니었으므로 `spec-create`는 사용하지 않았다.
- pre-flight에서 Node 권장 버전(`20.x`)과 실제 로컬(`v25.2.1`) 차이가 있었지만, 이번 repo gate는 모두 통과했다.
