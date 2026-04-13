# Orchestrator: Spec Viewer 줄번호 확장 (테이블 셀 + 코드 블록)

**생성일**: 2026-04-13T15:00:00+09:00
**규모**: 중규모 (single-phase medium direct path)
**생성자**: autopilot
**선행 작업**: 1차 줄번호 구현 완료 (`log_spec_viewer_line_numbers_20260413_100000.md`)

## 기능 설명

1차 구현에서 제외된 테이블 셀(`td`, `th`)과 코드 펜스(fenced code block) 내부에 원문 마크다운 줄번호를 표시한다.

- **테이블 셀**: 기존 `includeAnchorLine: false` 플래그를 제거하여 `data-source-line` 속성을 활성화하고, CSS로 줄번호를 표시한다. `<table>` 컨테이너의 suppression은 유지하되 `<tr>` 행에 줄번호를 달아 행 단위로 원문 위치를 표시한다.
- **코드 블록**: `HighlightedCodeBlock` 컴포넌트에 `sourceLineStart` prop을 추가하고, 각 코드 줄에 원문 시작줄 기준 오프셋 줄번호를 표시한다. `<pre>` 래퍼의 줄번호는 중복 방지를 위해 suppression한다.

## Acceptance Criteria

- [ ] AC1: 테이블 행(`<tr>`)에 원문 줄번호가 거터에 표시된다
- [ ] AC2: 코드 블록 내부의 각 줄에 원문 줄번호가 표시된다 (시작줄 기준 오프셋)
- [ ] AC3: 기존 블록 레벨 줄번호(p, h1~h6, li)가 regression 없이 동작한다
- [ ] AC4: comment marker와 공존한다 (레이아웃 충돌 없음)
- [ ] AC5: 기존 테스트 suite가 전부 통과한다
- [ ] AC6: 새로운 동작에 대한 테스트가 추가된다

## Reasoning Trace

- 1차 구현이 완료된 확장 작업이므로 discussion은 이미 진행됨 (`2026-04-12_discussion`)
- non-trivial change이므로 `feature-draft`를 거친다. 기존 draft가 `_sdd/drafts/`에 없음
- feature draft Part 2가 task/dependency/validation을 충분히 제공할 것이므로 `implementation-plan`은 생략
- single-phase medium path → `Review-Fix Loop.scope = global`
- 테스트는 `npm test` 인라인. 기존 823 passed 기준 regression 확인
- SDD 원칙: Delta-first (temporary spec) + Execute→Verify + Review-fix 필수

## Pipeline Steps

### Step 1: feature-draft
**Claude subagent_type**: `feature-draft`
**model**: `opus`
**입력 파일**:
- `_sdd/spec/main.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/discussion/2026-04-12_discussion_spec_viewer_source_line_numbers.md`
- `_sdd/pipeline/log_spec_viewer_line_numbers_20260413_100000.md`
**출력 파일**: `_sdd/drafts/feature_draft_spec_viewer_line_numbers_v2.md`

**프롬프트**:
Spec Viewer 줄번호 확장에 대한 feature draft를 작성하세요.

배경: 1차 구현에서 CSS `::before` + `data-source-line` 방식으로 블록 레벨 줄번호를 구현 완료했습니다. 이번에는 1차에서 제외된 두 영역을 확장합니다:

1. **테이블 행 줄번호**: `spec-viewer-panel.tsx`의 `tr` 핸들러(line ~898)에서 `includeAnchorLine: false`를 제거하여 `data-source-line` 속성을 활성화합니다. `th`/`td` 셀은 행 단위로 줄번호가 이미 달리므로 `includeAnchorLine: false`를 유지하여 중복을 방지합니다. `<table>` 컨테이너의 CSS suppression(`content: none`)은 유지합니다.

2. **코드 블록 내부 줄번호**: `HighlightedCodeBlock` 컴포넌트(line ~896)에 `sourceLineStart` prop을 추가합니다. `code` 핸들러(line ~1842)에서 `node.position.start.line`을 전달하고, 각 코드 줄에 원문 시작줄 기준 오프셋 줄번호를 `data-source-line` 속성으로 부착합니다. `<pre>` 래퍼는 코드 블록과 중복되므로 CSS suppression을 추가합니다.

Part 1에는 temporary spec 7섹션을 포함하고, `Contract/Invariant Delta`와 `Validation Plan`을 ID로 연결하세요.
Part 2에는 implementation이 직접 읽을 수 있는 Target Files, dependency, validation detail을 포함하세요.

관련 파일:
- `src/spec-viewer/spec-viewer-panel.tsx` (HighlightedCodeBlock: ~896-975, code handler: ~1792-1849, tr/th/td: ~1898-1925)
- `src/App.css` (source line gutter: ~1514-1541)
- `src/spec-viewer/source-line-metadata.ts` (buildSourceLineAttributes)
- `src/App.test.tsx`, `src/spec-viewer/spec-viewer-panel.test.tsx` (기존 테스트)

### Step 2: implementation
**Claude subagent_type**: `implementation`
**model**: `opus`
**입력 파일**:
- `_sdd/drafts/feature_draft_spec_viewer_line_numbers_v2.md`
- `_sdd/spec/spec-viewer/overview.md`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/App.css`
**출력 파일**:
- `src/spec-viewer/spec-viewer-panel.tsx` (수정)
- `src/App.css` (수정)
- `src/App.test.tsx` (수정 — 새 테스트 추가)
- `src/spec-viewer/spec-viewer-panel.test.tsx` (수정 — 새 테스트 추가)

**프롬프트**:
feature draft를 기반으로 구현을 진행하세요.
temporary spec의 `Contract/Invariant Delta`와 `Validation Plan`을 기준으로 진행하세요.
기존 줄번호 거터 CSS 패턴과 컴포넌트 구조를 따르세요.

### Step 3: spec-update-done
**Claude subagent_type**: `spec-update-done`
**model**: `sonnet`
**입력 파일**:
- `_sdd/spec/main.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/feature-index.md`
- `_sdd/drafts/feature_draft_spec_viewer_line_numbers_v2.md`
- 구현된 코드 파일
**출력 파일**: `_sdd/spec/main.md`, `_sdd/spec/spec-viewer/overview.md`, `_sdd/spec/feature-index.md`

**프롬프트**:
Spec Viewer 줄번호 확장 (테이블 행 + 코드 블록 내부) 구현 완료 기준으로 global spec을 실제 코드와 동기화하세요.
기존 F49 항목의 설명을 확장하거나 별도 항목을 추가하세요.
temporary spec의 실행 정보는 버리고, 구현되어 검증된 persistent repo-wide information만 global spec에 반영하세요.

## Review-Fix Loop

- `scope`: `global`
- `max_rounds`: 3
- `exit_condition`: `critical = 0 AND high = 0 AND medium = 0`
- `fix_targets`: `critical/high/medium/low`
- `agent_mapping`: `review = implementation-review`, `fix = implementation`, `re-review = implementation-review`

## Test Strategy

- `mode`: `inline`
- `commands`: `npm test`
- `selection_rationale`: 기존 테스트 suite (823 tests)로 regression 확인 + 새 테스트로 기능 검증. 단시간 실행 가능하므로 인라인 적합
- `V* mapping`: V1→AC1 (테이블 행 줄번호 DOM 확인), V2→AC2 (코드 블록 줄번호 DOM 확인), V3→AC3 (기존 테스트 regression), V4→AC4 (레이아웃 검증)
- `reporting`: 통과/실패 건수와 잔여 수동 확인 항목을 `_sdd/pipeline/report_spec_viewer_line_numbers_v2_20260413.md`에 기록

## Error Handling

- `retry_count`: 2 (에이전트 실패 시)
- `critical_steps`: Step 2 (implementation) — 실패 시 중단
- `non_critical_steps`: Step 3 (spec-update-done) — 실패 시 로그 기록 후 수동 동기화 권고
