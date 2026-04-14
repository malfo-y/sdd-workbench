# Implementation Review: Post-split SSH / Remote-Agent Hardening

**Review Date**: 2026-04-14
**Review Mode**: Tier 1
**Reference**:
- `_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`
- `_sdd/implementation/2026-04-14_implementation_progress_post_split_ssh_remote_agent_hardening.md`
- `_sdd/implementation/2026-04-14_implementation_report_post_split_ssh_remote_agent_hardening.md`
- `_sdd/implementation/2026-04-14_implementation_review_post_split_ssh_remote_agent_hardening.md`
- `_sdd/env.md`
**Model**: GPT-5 Codex

## 1. Findings
### Critical
- 없음.

### High
- 없음.

### Medium
- 없음.

### Low
- 없음.

## 2. Progress Overview
이번 재검토 범위는 사용자 지시대로 SSH / remote-agent hardening workstream에 한정했고, workspace routing 및 다른 discussion 주제는 검토에서 제외했습니다. 참조 입력은 지정된 draft/progress/report/review/env 문서만 사용했고, 코드 검토도 지정된 7개 대상 파일만 읽었습니다.

이전 rerun review의 핵심 쟁점이었던 두 항목은 현재 코드와 테스트 기준에서 모두 해소된 것으로 확인됐습니다.

- 이전 Critical: 기본 `agentPath`의 `$HOME`이 literal 문자열로 남아 bootstrap/start 경로가 깨지던 문제
  - 현재는 [electron/remote-agent/ssh-utils.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/ssh-utils.ts:18)의 `shellEscapeRemotePath()`가 `$HOME` / `$HOME/...`를 shell expression으로 조립하고,
  - [electron/remote-agent/bootstrap.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/bootstrap.ts:159)의 probe/install script,
  - [electron/remote-agent/transport-ssh.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/transport-ssh.ts:486)의 stdio launch command가 이 helper를 사용합니다.
  - 셸 재현에서도 `$HOME`이 literal이 아니라 실제 홈 경로로 확장됨을 다시 확인했습니다.

- 이전 Medium: 테스트가 문자열 포함 여부만 보고 실제 셸 의미론을 검증하지 못하던 문제
  - [electron/remote-agent/bootstrap.test.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/bootstrap.test.ts:23)은 `execFileSync('sh', ['-lc', ...])`로 generated assignment를 실제 셸에서 평가합니다.
  - [electron/remote-agent/transport-ssh.test.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/transport-ssh.test.ts:43)은 `sh -lc` argument를 다시 decode한 뒤 shell word parsing으로 runtime command semantics를 검증합니다.
  - 따라서 이전처럼 문자열만 맞고 런타임은 깨지는 상태가 그대로 통과하는 구조는 이번 범위에서는 해소됐습니다.

## 3. Verification Summary
### Fresh Verification

- `node -v` -> `v25.2.1`
- `npm -v` -> `11.12.1`
- `npm test -- electron/remote-agent/ssh-utils.test.ts electron/remote-agent/bootstrap.test.ts electron/remote-agent/directory-browser.test.ts electron/remote-agent/transport-ssh.test.ts`
  - PASS
  - `Test Files 4 passed`
  - `Tests 36 passed`
- `npm test`
  - PASS
  - `Test Files 73 passed`
  - `Tests 858 passed | 1 skipped`
- `npm run lint`
  - PASS

### Additional Direct Verification

- 셸 재현:
  - Command intent: 현재 bootstrap/transport가 생성하는 것과 같은 `$HOME`-prefixed quoting 패턴이 실제 셸에서 올바르게 확장되는지 확인
  - Result: `/Users/hyunjoonlee/bin/agent's folder/remote agent`
- 해석:
  - 이전 review에서 문제였던 literal `$HOME/...` 출력은 더 이상 재현되지 않았습니다.
  - targeted test 보강 내용과 직접 셸 재현 결과가 서로 일치합니다.

### Scope Assessment

- `ssh-utils.ts`: EXISTS, MET
- `bootstrap.ts` / `bootstrap.test.ts`: EXISTS, MET
- `directory-browser.ts` / `directory-browser.test.ts`: EXISTS, MET
- `transport-ssh.ts` / `transport-ssh.test.ts`: EXISTS, MET
- 이전 finding 해소 여부: RESOLVED
- Gate (`critical=0, high=0, medium=0`): PASS

## 4. Recommendations
### Must

- 없음.

### Should

- 없음.

### Could

- 선택 사항으로 실제 원격 호스트 대상 smoke를 한 번 더 돌리면 운영 신뢰도는 올라가지만, 이번 gate 판정에는 필요하지 않습니다.

## 5. Conclusion
이번 rerun2 리뷰에서는 이전 Critical/Medium finding이 모두 해소된 것으로 판단했습니다. 지정된 fresh verification 세트와 추가 셸 재현이 모두 성공했고, 검토 범위 안에서 새 Critical/High/Medium/Low finding은 발견되지 않았습니다. 최종 gate 판정은 `PASS`입니다.
