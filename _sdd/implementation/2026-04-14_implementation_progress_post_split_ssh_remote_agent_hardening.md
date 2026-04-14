# IMPLEMENTATION_PROGRESS

## 1) Scope Covered

- Active input:
  - `_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`
  - `_sdd/pipeline/orchestrators/orchestrator_post_split_ssh_remote_agent_hardening.md`
  - `_sdd/env.md`
- Execution mode: sequential
- Reason:
  - `H2`와 `H3` 모두 `ssh-utils.ts` foundation에 직접 의존하므로 `H1 -> H2 -> H3` 순차 실행이 안전합니다.
  - `bootstrap.ts`, `directory-browser.ts`, `transport-ssh.ts`는 같은 SSH quoting / error normalization contract를 공유하므로 중간 분기 없이 한 번에 검증하는 편이 리스크가 낮습니다.

| ID | Task | Phase | Dependencies | Status | Owner | Notes |
|----|------|-------|--------------|--------|-------|-------|
| H1 | shared `ssh-utils.ts` foundation 도입 | 1 | - | completed | codex | shared SSH args, destination hardening, stderr/exit normalization helper를 신규 모듈로 고정 |
| H2 | `bootstrap.ts` / `directory-browser.ts` shared helper 전환 | 2 | H1 | completed | codex | bootstrap script는 escaped shell variable 기반으로 바꾸고, browse는 bootstrap coupling을 제거 |
| H3 | `transport-ssh.ts` hardening + request write failure surface | 2 | H1 | completed | codex | option-like destination reject, non-writable stdin / write callback error 즉시 surface 추가 |

## 2) Target Files

- [C] `electron/remote-agent/ssh-utils.ts`
- [C] `electron/remote-agent/ssh-utils.test.ts`
- [M] `electron/remote-agent/bootstrap.ts`
- [M] `electron/remote-agent/bootstrap.test.ts`
- [M] `electron/remote-agent/directory-browser.ts`
- [M] `electron/remote-agent/directory-browser.test.ts`
- [M] `electron/remote-agent/transport-ssh.ts`
- [M] `electron/remote-agent/transport-ssh.test.ts`

## 3) TDD Trace

- RED:
  - `ssh-utils.test.ts`에 shared helper contract, destination hardening, exit-code normalization 테스트 추가
  - `bootstrap.test.ts`에 escaped `agentPath` script 조립과 control-character reject 테스트 추가
  - `directory-browser.test.ts`에 shared SSH args contract와 stderr normalization 회귀 테스트 추가
  - `transport-ssh.test.ts`에 option-like destination reject, non-writable stdin, write callback error 즉시 surface 테스트 추가
- GREEN:
  - `ssh-utils.ts`를 추가하고 `buildSshArgs`, `buildSshBaseArgs`, `shellEscape`, `extractNumericExitCode`, auth/node/stderr normalization helper를 통합
  - `bootstrap.ts`가 shared helper를 사용하고 probe/install script를 escaped shell variable 기반으로 재작성
  - `directory-browser.ts`가 bootstrap import를 제거하고 shared helper를 직접 사용
  - `transport-ssh.ts`가 shared helper를 사용하고 request write failure를 timeout 전 즉시 surface
- REFACTOR:
  - helper에서 `RemoteAgentError`를 만들지 않고 consumer가 기존 에러 코드를 유지하도록 경계를 분리
  - 기존 `buildSshArgs` public surface는 bootstrap re-export로 유지해 주변 호출부 churn을 줄임

## 4) Verification

- Environment:
  - `node -v` -> `v25.2.1`
  - `npm -v` -> `11.12.1`
- Focused regression:
  - `npm test -- electron/remote-agent/ssh-utils.test.ts electron/remote-agent/bootstrap.test.ts electron/remote-agent/directory-browser.test.ts electron/remote-agent/transport-ssh.test.ts`
  - Result: pass (`4 files`, `35 tests`)
- Quality gate:
  - `npm test` -> pass (`72 files`, `853 passed`, `1 skipped`)
  - `npm run lint` -> pass

## 5) Unplanned Dependencies

- 없음

## 6) Notes

- `_sdd/spec/` 아래 파일은 수정하지 않았습니다.
- `bootstrap.ts`에는 이번 라운드 이전에 이미 `error.status` fallback 관련 dirty diff가 있었고, 해당 변경은 유지한 채 SSH helper/hardening 범위만 추가 수정했습니다.
- 현재 워크트리는 다른 리팩토링 변경이 많이 섞여 있으므로 이번 라운드는 assigned Target Files만 수정했습니다.
