# Orchestrator: Post-split SSH / Remote-Agent Hardening

**생성일**: 2026-04-14T22:40:00+09:00
**규모**: 중규모 (feature-draft partial pipeline)
**생성자**: autopilot
**토론 기반**:
- `_sdd/discussion/2026-04-14_discussion_post_split_remaining_issues_prioritization.md`

## 기능 설명

모놀리스 분할 이후 남은 1차 workstream 중 `D4` SSH 유틸 통합을 구현 가능한 draft로 구체화한다. 이번 파이프라인은 구현 자체가 아니라, `bootstrap.ts`, `transport-ssh.ts`, `directory-browser.ts`와 관련 테스트를 대상으로 한 temporary spec + implementation plan 산출까지를 범위로 한다.

핵심 delta는 다음 네 가지다.

- shared `ssh-utils.ts` 도입으로 중복 SSH helper 통합
- option/script injection hardening
- exit-code / auth failure / stderr normalization 일관화
- request write failure surface 명시화

## Acceptance Criteria

- [ ] AC1: `_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`가 생성된다.
- [ ] AC2: Part 1이 `spec-update-todo` 호환 7섹션과 `<!-- spec-update-todo-input-start -->` / `<!-- spec-update-todo-input-end -->` 마커를 포함한다.
- [ ] AC3: Part 1이 `ssh-utils.ts` 도입, option/script injection hardening, exit-code/auth/stderr normalization, request write failure surface를 `Contract/Invariant Delta`와 `Validation Plan` linkage로 반영한다.
- [ ] AC4: Part 2가 implementation이 바로 소비 가능한 수준으로 phase/task/validation을 제시하고, 모든 task에 `**Target Files**`를 명시한다.
- [ ] AC5: `_sdd/spec/` 아래 파일은 수정하지 않는다.

## Reasoning Trace

- `_sdd/discussion/2026-04-14_discussion_post_split_remaining_issues_prioritization.md`에서 합의된 첫 구조 묶음이 `D4` SSH 유틸 통합이므로, 이번 partial pipeline은 그 첫 실행 청사진 생성에 집중한다.
- 사용자 요청이 이미 feature-draft 범위, 입력 파일, 출력 파일, 핵심 delta까지 구체화하고 있으므로 추가 discussion 없이 `feature_draft` 단일 step으로 충분하다.
- global spec은 thin core를 유지해야 하고, 이번 요청도 `_sdd/spec/` 직접 수정을 금지하므로 persistent spec sync는 수행하지 않는다.
- 구현 단계가 아직 시작되지 않으므로 review-fix gate는 이번 실행에서 deferred 상태로 정의만 남기고, 검증은 draft 산출물의 구조/traceability inline validation으로 제한한다.
- 강하게 작동하는 SDD 원칙은 `Spec-first`, `Delta-first`, `파일 기반 handoff`, `global spec direct edit 금지`다.

## Execution Profiles

- `feature_draft`: `draft_strict` -> `gpt-5.4 / xhigh`

## Pipeline Steps

### Step 1: feature_draft
**Codex agent_type**: `feature_draft`
**Execution profile**: `draft_strict` (`gpt-5.4 / xhigh`)
**입력 파일**:
- `/Users/hyunjoonlee/github/sdd-workbench/_sdd/discussion/2026-04-14_discussion_post_split_remaining_issues_prioritization.md`
- `/Users/hyunjoonlee/github/sdd-workbench/_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`
- `/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/bootstrap.ts`
- `/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/transport-ssh.ts`
- `/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/directory-browser.ts`
- `/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/bootstrap.test.ts`
- `/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/transport-ssh.test.ts`
- `/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/directory-browser.test.ts`
- `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md`

**출력 파일**:
- `/Users/hyunjoonlee/github/sdd-workbench/_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`

**프롬프트**:
`post-split SSH / remote-agent hardening` 1차 workstream에 대한 feature draft를 한국어로 작성하세요.

제약:
- `_sdd/spec/` 아래 파일은 절대 수정하지 마세요.
- scope는 `bootstrap.ts`, `transport-ssh.ts`, `directory-browser.ts` 및 관련 테스트로 한정합니다.
- 출력 파일은 정확히 `/Users/hyunjoonlee/github/sdd-workbench/_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md` 입니다.

Part 1 요구사항:
- `<!-- spec-update-todo-input-start -->` / `<!-- spec-update-todo-input-end -->` 마커 포함
- canonical temporary spec 7섹션 포함
- 핵심 delta:
  - shared `ssh-utils.ts` 도입
  - option/script injection hardening
  - exit-code / auth failure / stderr normalization
  - request write failure surface
- `Contract/Invariant Delta`는 `C*`, `I*` ID 사용
- `Validation Plan`은 `V*` ID를 사용하고 delta ID와 연결

Part 2 요구사항:
- implementation이 바로 소비할 수 있는 계획으로 작성
- `Overview`, `Scope`, `Components`, `Contract/Invariant Delta Coverage`, `Implementation Phases`, `Task Details`, `Parallel Execution Summary`, `Risks and Mitigations`, `Open Questions` 포함
- 모든 task에 `**Target Files**` 포함
- `Target Files`는 실제 코드베이스 기준으로 `ssh-utils.ts`, 기존 3개 소스 파일, 관련 테스트 파일을 명시

추가 반영 포인트:
- `bootstrap.ts`의 probe/install 스크립트에서 `agentPath` 삽입 hardening을 분명히 기술
- `transport-ssh.ts`의 SSH target 구성에서 `user`/`host` option injection 방지 방향을 명시
- `transport-ssh.ts`의 `stdin.write(frame)` 실패가 timeout 대기 대신 즉시 surface되어야 함을 명시
- `directory-browser.ts`가 shared SSH helper를 reuse하도록 정리

## Review-Fix Loop

- `scope`: `global`
- `applicability`: planning-only partial pipeline이라 이번 실행에서는 미적용
- `deferred_to`: 후속 implementation 오케스트레이터에서 같은 범위의 immediate review-fix gate로 활성화
- `max_rounds`: 3
- `exit_condition`: `critical = 0 AND high = 0 AND medium = 0`
- `fix_targets`: `critical/high/medium/low`
- `timing`: 구현 step이 추가된 이후 해당 `implementation` 직후 즉시 실행
- `agent_mapping`: `review = implementation_review`, `fix = implementation`, `re-review = implementation_review`

## Test Strategy

- `mode`: `inline`
- `commands`:
  - `test -f /Users/hyunjoonlee/github/sdd-workbench/_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`
  - `rg -n "<!-- spec-update-todo-input-start -->|<!-- spec-update-todo-input-end -->" /Users/hyunjoonlee/github/sdd-workbench/_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`
  - `rg -n "^## Change Summary$|^## Scope Delta$|^## Contract/Invariant Delta$|^## Touchpoints$|^## Implementation Plan$|^## Validation Plan$|^## Risks / Open Questions$" /Users/hyunjoonlee/github/sdd-workbench/_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`
  - `rg -n "^## Overview$|^## Scope$|^## Components$|^## Contract/Invariant Delta Coverage$|^## Implementation Phases$|^## Task Details$|^## Parallel Execution Summary$|^## Risks and Mitigations$|^## Open Questions$" /Users/hyunjoonlee/github/sdd-workbench/_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`
  - `rg -n "^\\*\\*Target Files\\*\\*:" /Users/hyunjoonlee/github/sdd-workbench/_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`
- `선택 근거`: 이번 partial pipeline은 코드 변경이 아니라 temporary spec + implementation plan 산출이 목적이므로, repo-wide test 대신 산출물 구조/traceability 검증을 inline으로 수행한다.
- `reporting`: 생성 여부, 필수 섹션/마커 검증 결과, 남은 후속 구현 필요 사항을 `_sdd/pipeline/report_post_split_ssh_remote_agent_hardening_<timestamp>.md`에 기록한다.

## Error Handling

- 재시도 횟수: draft 구조 미충족 시 최대 2회 수정 후 재검증
- 핵심 단계 실패:
  - `feature_draft` 산출물이 누락되거나 마커/섹션/Target Files가 불완전하면 실패로 처리
  - `_sdd/spec/` 파일 변경이 감지되면 즉시 중단하고 위반으로 기록
- 비핵심 단계:
  - 없음
- 후속 구현:
  - draft 생성 이후 implementation은 별도 승인/오케스트레이터에서 수행한다.
