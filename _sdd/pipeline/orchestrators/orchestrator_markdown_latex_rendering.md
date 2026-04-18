# Orchestrator: Markdown LaTeX Rendering

**생성일**: 2026-04-18T00:00:00+09:00
**규모**: 중규모
**생성자**: sdd-autopilot

## 기능 설명

Spec Viewer의 markdown 렌더러에서 LaTeX 수식이 보이지 않는 문제를 해결한다. 인라인 수식과 블록 수식을 모두 지원하고, 기존 markdown 보안/링크/소스 매핑/테스트 구조를 깨지 않도록 통합한다.

## Acceptance Criteria

- [ ] `$...$` 인라인 수식이 Spec Viewer에서 텍스트가 아닌 수식 DOM으로 렌더된다.
- [ ] `$$...$$` 블록 수식이 Spec Viewer에서 렌더된다.
- [ ] math 렌더링 추가 후에도 기존 markdown 보안 정책과 내부 링크/기존 플러그인 체인이 유지된다.
- [ ] 관련 회귀 테스트가 추가되고 `npm test`, `npm run lint`가 통과한다.
- [ ] 구현 완료 후 spec-viewer global spec과 feature index가 구현 사실에 맞게 동기화된다.

## Reasoning Trace

- 현재 구현은 `react-markdown + remark-gfm + rehype-sanitize + rehype-slug`까지만 연결되어 있어 math 파이프라인 부재가 직접 원인으로 보인다.
- 변경 범위가 UI 한 컴포넌트에 닫혀 있지만 의존성 추가, sanitize 조정, 스타일 로딩, 테스트 회귀가 함께 필요하므로 non-trivial medium path로 판단한다.
- temporary execution surface를 먼저 고정하기 위해 `feature_draft`를 선행하고, Part 2가 충분히 명확할 것으로 보여 `implementation_plan`은 생략한다.
- single-phase path이므로 `implementation` 직후 global review-fix gate를 즉시 닫는 구조를 사용한다.
- global spec이 존재하므로 구현 검증이 끝난 뒤 `spec_update_done`으로 persistent capability만 반영한다.
- 테스트는 headless renderer 회귀와 repo gate가 중심이므로 inline 전략이 적합하다.

## Pipeline Steps

### Step 1: feature_draft
**Codex agent_type**: `feature_draft`
**입력 파일**:
- `_sdd/spec/main.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/markdown-security.ts`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/main.tsx`
- `package.json`

**출력 파일**: `_sdd/drafts/2026-04-18_feature_draft_markdown_latex_rendering.md`

**프롬프트**:
사용자 요청: "지금 마크다운 렌더러에 latex 수식 렌더가 안 되는데, 이거 해결 가능해?"

Spec Viewer의 markdown LaTeX 렌더링 지원에 대한 feature draft를 작성하세요.
Part 1에는 temporary spec 7섹션을 포함하고, `Contract/Invariant Delta`와 `Validation Plan`을 ID로 연결하세요.
Part 2에는 implementation이 바로 소비할 수 있도록 Target Files, dependency 추가, sanitize 고려사항, style loading, 테스트 전략을 구체화하세요.

### Step 2: implementation
**Codex agent_type**: `implementation`
**입력 파일**:
- `_sdd/drafts/2026-04-18_feature_draft_markdown_latex_rendering.md`
- `_sdd/spec/main.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/markdown-security.ts`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/main.tsx`
- `package.json`

**출력 파일**:
- `package.json`
- `package-lock.json`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/markdown-security.ts`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/main.tsx`

**프롬프트**:
feature draft를 기준으로 Spec Viewer markdown LaTeX 렌더링을 구현하세요.
`remark-math`와 `rehype-katex` 또는 동등한 안전한 파이프라인을 통합하고, 인라인/블록 수식 렌더링이 동작하게 만드세요.
기존 markdown 보안, 링크 처리, source mapping, citation 동작을 불필요하게 깨지 말고 필요한 범위만 수정하세요.
회귀 테스트를 추가하고 repo gate(`npm test`, `npm run lint`)를 통과할 수 있도록 구현하세요.

**Immediate review-fix gate (must finish before Step 3)**:
- `scope`: `global`
- `max_rounds`: 3
- `exit_condition`: `critical = 0 AND high = 0 AND medium = 0`
- `fix_targets`: `critical/high/medium/low`
- `timing`: Step 2 `implementation` 직후 즉시 실행하는 completion gate
- `agent_mapping`: `review = implementation_review`, `fix = implementation`, `re-review = implementation_review`
- `execution_sequence`: `implementation -> implementation_review -> implementation (if needed) -> implementation_review`
- autopilot은 Step 2 구현 직후 같은 범위로 `implementation_review` agent를 즉시 호출한다.
- review 입력에는 최소한 `_sdd/drafts/2026-04-18_feature_draft_markdown_latex_rendering.md`, `_sdd/spec/spec-viewer/overview.md`, `_sdd/spec/spec-viewer/contracts.md`, 현재 변경 파일 목록, `npm test`, `npm run lint` 결과를 포함한다.
- `review invocation prompt contract`:
  - "방금 끝난 markdown LaTeX 렌더링 구현 범위만 검토하세요. 응답은 findings first여야 하며, 각 finding은 severity, 파일/라인, 관련 Acceptance Criteria 또는 temporary spec linkage, 근거, 권장 수정 방향을 포함해야 합니다."
- `fix invocation prompt contract`:
  - "직전 `implementation_review` finding 중 `critical/high/medium`만 닫으세요. unrelated dirty changes를 되돌리지 말고, 수식 렌더링/보안/테스트 안정성을 유지하세요."
- `re-review invocation prompt contract`:
  - "직전 review finding이 실제로 해소되었는지 먼저 검증하고, 같은 범위에서 새 `critical/high/medium`이 남는지만 다시 보고하세요. findings first 형식을 유지하세요."
- `implementation_review` 결과에 `critical/high/medium`이 하나라도 있으면 autopilot은 그 finding만 입력으로 묶어 같은 범위의 `implementation` agent를 다시 호출한다.
- fix 후 autopilot은 같은 scope로 `implementation_review` agent를 재호출한다.
- 이 gate와 required inline validation이 모두 닫힌 뒤에만 Step 3으로 진행한다.

### Step 3: spec_update_done
**Codex agent_type**: `spec_update_done`
**입력 파일**:
- `_sdd/spec/main.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `_sdd/spec/feature-index.md`
- `_sdd/drafts/2026-04-18_feature_draft_markdown_latex_rendering.md`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/markdown-security.ts`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `package.json`

**출력 파일**:
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/decision-log.md`

**프롬프트**:
markdown LaTeX 렌더링 구현 완료 기준으로 global spec을 실제 코드와 동기화하세요.
temporary spec의 실행 정보는 버리고, Spec Viewer가 지원하는 persistent capability와 관련된 규칙만 반영하세요.
새 기능 인덱스 항목과 필요한 decision-log 기록도 포함하세요.

**Precondition**:
Step 2의 immediate review-fix gate와 required inline validation이 모두 닫힌 뒤에만 실행한다.

## Review-Fix Loop

- 이 오케스트레이터의 authoritative 순서와 프롬프트 계약은 Step 2의 `Immediate review-fix gate`에 인라인으로 고정한다.
- 별도 후처리 loop는 없고, Step 2 gate가 닫히기 전에는 `spec_update_done`으로 진행할 수 없다.

## Test Strategy

- `mode`: `inline`
- `commands`:
  - `npm test`
  - `npm run lint`
- `rationale`: 이번 변경은 renderer 플러그인/보안 설정/테스트 회귀에 닫혀 있고, 저장소 표준 gate가 이미 `_sdd/env.md`와 AGENTS.md에 정의되어 있어 inline 검증이 가장 직접적이다.
- `reporting`: 통과/실패 건수, 실패 시 원인, 수동 확인 필요 항목을 `_sdd/pipeline/report_markdown_latex_rendering_<timestamp>.md`에 기록한다.

## Error Handling

- `retries`: feature_draft/spec_update_done는 1회, implementation/review-fix loop는 최대 3회 재시도
- `critical_steps`: Step 2 immediate review-fix gate, `npm test`, `npm run lint`
- `non_critical_steps`: spec wording polish
- `failure_policy`: review-fix gate를 닫지 못하거나 repo gate가 실패하면 Step 3으로 진행하지 않고 blocker를 로그와 보고서에 남긴다
