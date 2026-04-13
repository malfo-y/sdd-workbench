# Orchestrator: Spec Viewer 원문 줄번호 표시

**생성일**: 2026-04-13T10:00:00
**규모**: 소규모
**생성자**: autopilot

## 기능 설명

Spec viewer의 렌더링된 마크다운 블록 요소 좌측에 원문(.md) 줄번호를 거터 형태로 표시한다. 기존 `data-source-line` 속성을 활용하여 CSS `::before` 방식으로 구현하며, 중첩 요소 중복 방지와 기존 comment marker 거터와의 공존을 보장한다.

## Acceptance Criteria

- [ ] AC1: Spec viewer에서 렌더링된 블록 요소(p, li, h1~h6, pre 등) 좌측에 원문 줄번호가 표시된다
- [ ] AC2: 중첩 요소(blockquote > p, table > th/td)에서 줄번호가 중복 표시되지 않는다
- [ ] AC3: 기존 comment marker가 있는 요소에서 줄번호와 comment marker가 겹치지 않고 공존한다
- [ ] AC4: 기존 `npm test` 테스트가 모두 통과한다

## Reasoning Trace

- **Small direct path 선택 근거**: CSS 중심 변경이고, 토론 문서(`_sdd/discussion/2026-04-12_discussion_spec_viewer_source_line_numbers.md`)가 요구사항/범위/결정사항을 충분히 제공하므로 feature-draft를 생략한다
- **스킬 조합**: `implementation` → `implementation-review` → review-fix → `spec-update-done`. 토론 문서가 temporary spec 역할을 대행한다
- **Global spec 처리**: 구현 완료 후 `spec-update-done`으로 persistent information만 동기화한다
- **테스트 전략**: inline — `npm test`로 기존 테스트 regression 확인 + 시각적 검증 보고
- **적용 원칙**: Execute → Verify (단순 에이전트 호출이 아닌 테스트 evidence 확인)

## Pipeline Steps

### Step 1: implementation
**Claude subagent_type**: `implementation`
**model**: `opus`
**입력 파일**:
- `_sdd/discussion/2026-04-12_discussion_spec_viewer_source_line_numbers.md` (요구사항)
- `_sdd/spec/main.md` (global spec 참조)
- `src/App.css` (CSS 수정 대상)
- `src/spec-viewer/spec-viewer-panel.tsx` (컴포넌트 확인용)
- `src/spec-viewer/source-line-metadata.ts` (data attribute 정의 참조)
**출력 파일**:
- `src/App.css` (줄번호 거터 CSS 추가)
- 필요 시 `src/spec-viewer/spec-viewer-panel.tsx` (최소한의 조정)

**프롬프트**:

Spec viewer에 마크다운 원문 줄번호를 거터 형태로 표시하는 기능을 구현하세요.

**배경**: 토론 문서 `_sdd/discussion/2026-04-12_discussion_spec_viewer_source_line_numbers.md`에 요구사항과 결정사항이 정리되어 있습니다.

**핵심 구현 사항**:
1. CSS `::before` pseudo-element + `content: attr(data-source-line)` 방식으로 블록 요소 좌측에 줄번호 표시
2. 스타일링: 코드 에디터 줄번호와 유사한 muted/subtle 색상, monospace 폰트, 적절한 거터 너비
3. 중첩 요소 중복 방지: `blockquote`와 `table` 컨테이너에는 줄번호를 표시하지 않고, 내부 leaf 요소(p, th, td 등)에만 표시
4. comment marker 공존: 기존 comment marker(`data-has-comment-marker`, `padding-left: 1.8rem`, `.spec-comment-marker`)와 줄번호가 겹치지 않도록 레이아웃 조정
5. `.spec-viewer-content` 내부 요소에만 적용 (다른 패널에 영향 없도록 스코핑)

**참고할 현재 구현**:
- `source-line-metadata.ts`: `data-source-line` 속성 정의
- `spec-viewer-panel.tsx`: `renderBlockWithSourceLine()` 함수가 블록 요소에 속성 부착
- `App.css`: `.spec-viewer-content` 레이아웃, `.spec-comment-marker` 스타일, `[data-has-comment-marker='true']` 패딩

**제약**:
- React 컴포넌트 수정은 최소화 — CSS만으로 가능한 범위에서 해결
- 기존 comment marker, search highlight, navigation highlight 기능에 영향 없어야 함
- CSS 변수(`--theme-*`)를 활용하여 기존 테마와 일관성 유지

### Step 2: spec-update-done
**Claude subagent_type**: `spec-update-done`
**model**: `sonnet`
**입력 파일**:
- `_sdd/spec/main.md`
- `_sdd/discussion/2026-04-12_discussion_spec_viewer_source_line_numbers.md`
- 구현된 코드 파일 (`src/App.css`, 필요 시 `src/spec-viewer/spec-viewer-panel.tsx`)
**출력 파일**: `_sdd/spec/*.md`

**프롬프트**:
Spec viewer 원문 줄번호 표시 기능 구현이 완료되었습니다. 구현 결과를 바탕으로 global spec에 persistent information만 동기화하세요. CSS `::before` + `data-source-line` 기반 줄번호 거터가 추가된 사실을 반영하되, 구현 세부사항이나 transient execution detail은 올리지 마세요.

## Review-Fix Loop

- `scope`: `global`
- `max_rounds`: 2
- `exit_condition`: `critical = 0 AND high = 0 AND medium = 0`
- `fix_targets`: `critical/high/medium`
- `agent_mapping`: `review = implementation-review`, `fix = implementation`, `re-review = implementation-review`

## Test Strategy

- `mode`: `inline`
- `commands`: `npm test`
- `선택 근거`: CSS 중심 변경으로 기존 테스트 regression 확인이 주 목적. 시각적 결과는 수동 확인 필요
- `reporting`: 테스트 통과/실패 건수, 실패 시 원인, 수동 확인 필요 항목을 `_sdd/pipeline/report_spec_viewer_line_numbers_<timestamp>.md`에 기록

## Error Handling

- `재시도 횟수`: 2
- `핵심 단계`: Step 1 (implementation) — 실패 시 재시도
- `비핵심 단계`: Step 2 (spec-update-done) — 실패 시 경고 후 수동 처리 안내
