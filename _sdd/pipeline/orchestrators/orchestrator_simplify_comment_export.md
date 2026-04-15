# Orchestrator: Comment Export 간소화

**생성일**: 2026-04-14
**규모**: 소규모 (small direct path)
**생성자**: autopilot

## 기능 설명

Comment Export 시 `renderCommentBlock()`이 출력하는 정보를 간소화한다.
- before/after 컨텍스트 제거
- anchor hash 제거
- snippet을 첫 줄 코드만으로 축소
- 멀티라인 코멘트는 첫 줄 + 범위 표기 (예: `L5 (~L12)`)

## Acceptance Criteria
- [ ] AC1: export 결과에 `anchor.before`, `anchor.after`가 포함되지 않는다
- [ ] AC2: export 결과에 `anchor.hash`가 포함되지 않는다
- [ ] AC3: snippet이 선택 범위의 첫 줄 코드만 표시한다
- [ ] AC4: 멀티라인 코멘트(startLine != endLine)일 때 헤더에 범위 표기가 포함된다 (예: `L5 (~L12)`)
- [ ] AC5: 단일 라인 코멘트는 기존처럼 `L2` 형식으로 표시된다
- [ ] AC6: `comment-anchor.ts` (anchor 생성 로직)은 변경되지 않는다
- [ ] AC7: 기존 테스트가 새 포맷에 맞게 업데이트되고 전체 테스트가 통과한다

## Reasoning Trace

- 토론 문서(`_sdd/discussion/2026-04-14_discussion_simplify_comment_export.md`)에서 요구사항이 완전히 확정됨
- 단일 함수 수정 + 테스트 업데이트라 small direct path. `feature-draft`, `implementation-plan` 불필요
- global spec 변경 불필요 — 내부 렌더링 포맷 변경이고 repo-wide invariant에 해당하지 않음
- 테스트는 기존 `comment-export.test.ts`가 있으므로 인라인 `npm test` 실행

## Pipeline Steps

### Step 1: implementation
**Claude subagent_type**: `implementation`
**model**: `opus`
**입력 파일**:
- `_sdd/discussion/2026-04-14_discussion_simplify_comment_export.md`
- `src/code-comments/comment-export.ts`
- `src/code-comments/comment-export.test.ts`
- `src/code-comments/comment-types.ts`
**출력 파일**:
- `src/code-comments/comment-export.ts`
- `src/code-comments/comment-export.test.ts`

**프롬프트**:
Comment Export 간소화를 구현하세요.

토론 문서(`_sdd/discussion/2026-04-14_discussion_simplify_comment_export.md`)의 결정 사항을 따릅니다:

1. `renderCommentBlock()` 함수를 수정합니다:
   - `anchor.hash`, `anchor.before`, `anchor.after` 출력을 제거합니다
   - `anchor.snippet`은 첫 줄 코드만 표시합니다 (snippet을 `\n`으로 split하여 첫 줄만 사용)
   - 헤더 포맷:
     - 단일 라인(startLine === endLine): `### {relativePath}:L{startLine}`
     - 멀티 라인(startLine !== endLine): `### {relativePath}:L{startLine} (~L{endLine})`
   - `createdAt`도 제거합니다 (LLM에게 불필요)
   - 출력은: 헤더 + 첫 줄 snippet 인용 + 코멘트 body

2. `comment-export.test.ts` 테스트를 새 포맷에 맞게 업데이트합니다:
   - 기존 테스트가 새 헤더 포맷을 검증하도록 수정
   - 멀티라인 코멘트 케이스 추가
   - before/after/hash가 출력에 없는지 검증하는 테스트 추가

3. `comment-anchor.ts`는 수정하지 않습니다.

## Review-Fix Loop

- `scope`: `global`
- `max_rounds`: 2
- `exit_condition`: `critical = 0 AND high = 0 AND medium = 0`
- `fix_targets`: `critical/high/medium`
- `agent_mapping`: `review = implementation-review`, `fix = implementation`, `re-review = implementation-review`

## Test Strategy

- `mode`: `inline`
- `commands`: `npm test`
- `근거`: 기존 테스트 파일이 있고 변경 범위가 작아 인라인 실행으로 충분
- `reporting`: 통과/실패 건수를 report에 기록. 실패 시 원인 요약 포함

## Error Handling

- `재시도 횟수`: 2
- `핵심 단계`: Step 1 (implementation) — 실패 시 재시도
- `비핵심 단계`: 없음
