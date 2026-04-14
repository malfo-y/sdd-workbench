# Implementation Review: Post-split SSH / Remote-Agent Hardening

**Review Date**: 2026-04-14
**Review Mode**: Tier 1
**Reference**:
- `_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`
- `_sdd/implementation/2026-04-14_implementation_progress_post_split_ssh_remote_agent_hardening.md`
- `_sdd/implementation/2026-04-14_implementation_report_post_split_ssh_remote_agent_hardening.md`
- `_sdd/env.md`
**Model**: GPT-5 Codex

## 1. Findings

### Critical

- 기본 remote agent 경로가 실제로는 깨졌습니다. [bootstrap.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/bootstrap.ts:158)와 [bootstrap.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/bootstrap.ts:176)에서 `agentPath`를 `shellEscape()`로 감싼 뒤 셸 변수 `agent_path` / `agent_dir`에 넣고, [bootstrap.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/bootstrap.ts:199)에서 기본값을 `$HOME/...` 형태로 정규화합니다. POSIX shell에서는 `agent_path='$HOME/...'; "$agent_path"`가 `$HOME`를 다시 확장하지 않으므로, probe/install이 실제 홈 디렉터리 대신 literal `$HOME/...` 경로를 대상으로 동작합니다. 같은 문제가 [transport-ssh.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/transport-ssh.ts:490)에도 있어 bootstrap 이후 stdio 시작 경로도 깨집니다. 리뷰 중 직접 재현한 `sh -lc 'agent_path='"'"'$HOME/.sdd-workbench/bin/sdd-remote-agent'"'"'; printf "%s\n" "$agent_path"'` 결과도 literal `$HOME/.sdd-workbench/bin/sdd-remote-agent`였습니다. 이 workstream의 기본 경로 bootstrap/start 흐름이 깨지므로 release blocker입니다.

### High

- 없음.

### Medium

- 새 bootstrap 회귀 테스트가 셸 의미론을 검증하지 못합니다. [bootstrap.test.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/bootstrap.test.ts:86)는 generated script 문자열에 quoted `$HOME`이 들어 있는지만 확인하고, 실제 셸에서 그 값이 확장되는지 또는 probe/install command가 실행 가능한 경로가 되는지는 확인하지 않습니다. 그 결과 위 Critical regression이 focused regression과 전체 `npm test`를 모두 통과했습니다.

### Low

- 없음.

## 2. Progress Overview

구현은 draft의 H1/H2/H3 범위를 대부분 반영했습니다. shared `ssh-utils.ts` 도입, SSH destination hardening, stderr/exit normalization 공통화, `stdin` write failure 즉시 surface는 코드와 테스트에 모두 반영되어 있습니다.

다만 이번 리뷰 범위의 핵심 목표 중 하나인 `bootstrap / transport` 안정화는 아직 완료로 보기 어렵습니다. 기본 `agentPath` 경로 해석이 깨져서 실제 remote bootstrap/start의 정상 경로가 regress 되었기 때문입니다.

## 3. Verification Summary

### Fresh Verification

- `node -v` -> `v25.2.1`
- `npm -v` -> `11.12.1`
- `npm test -- electron/remote-agent/ssh-utils.test.ts electron/remote-agent/bootstrap.test.ts electron/remote-agent/directory-browser.test.ts electron/remote-agent/transport-ssh.test.ts` -> PASS (`4 files`, `35 passed`)
- `npm test` -> PASS (`72 files`, `853 passed`, `1 skipped`)
- `npm run lint` -> PASS

### Additional Review Verification

- Shell behavior repro:
  - Command: `sh -lc 'agent_path='"'"'$HOME/.sdd-workbench/bin/sdd-remote-agent'"'"'; printf "%s\n" "$agent_path"'`
  - Result: `$HOME/.sdd-workbench/bin/sdd-remote-agent`
- Interpretation:
  - current implementation처럼 single-quoted `$HOME/...`를 변수에 넣은 뒤 `"$agent_path"`로 쓰면 홈 디렉터리 경로가 확장되지 않습니다.
  - 따라서 현재 bootstrap/probe/start 흐름은 기본 `agentPath`에서 동작 보장이 없습니다.

### Alignment Assessment

- H1 shared helper boundary: `EXISTS`, 기준 대부분 `MET`
- H2 bootstrap / browse consumer 전환: `PARTIAL`, 기준 `NOT MET` due to bootstrap path regression
- H3 transport hardening + write failure surface: `EXISTS`, 기준 `PARTIAL`
- Spec / draft alignment: `DRIFT` at runtime behavior level, despite passing tests

## 4. Recommendations

### Must

- `agentPath` / `agentDir`를 셸 변수에 저장할 때 `$HOME` 의미를 잃지 않도록 구현을 바꾸셔야 합니다. 예를 들어 `~/...`를 미리 절대 경로로 확정할 수 없다면, script source 안에서 `HOME`을 조합하거나 `$HOME` prefix를 별도 처리해야 합니다. 핵심은 `"$agent_path"` 실행 시 literal `$HOME/...`가 남지 않게 하는 것입니다.
- [transport-ssh.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/transport-ssh.ts:490)의 remote command 조립도 같은 규칙으로 맞춰서 default path와 공백/quote 포함 custom path를 둘 다 검증해야 합니다.
- fix 후에는 targeted remote-agent tests, `npm test`, `npm run lint`를 다시 실행하고, 가능하면 실제 remote browse/connect smoke까지 한 번 보시는 편이 안전합니다.

### Should

- [bootstrap.test.ts](/Users/hyunjoonlee/github/sdd-workbench/electron/remote-agent/bootstrap.test.ts:86)에 문자열 포함 여부가 아니라 generated script의 runtime semantics를 검증하는 테스트를 추가하셔야 합니다.
- bootstrap/install/probe/start에서 쓰는 remote path normalization contract를 `ssh-utils.ts` 또는 bootstrap-local helper 한 곳으로 고정해 같은 실수가 반복되지 않게 하시는 편이 좋습니다.

### Could

- `agentPath` 입력 케이스를 `absolute path`, `~/...`, `$HOME/...`, `space/quote 포함 custom path` 네 가지로 명시한 표 기반 테스트를 두면 후속 refactor 때 회귀를 잡기 쉬워집니다.

## 5. Conclusion

이번 workstream은 구조 정리와 일부 hardening 목적은 달성했지만, 기본 remote agent 경로 처리에서 release-blocking regression이 확인되었습니다. 테스트와 lint는 fresh verification에서 모두 통과했지만, 셸 실행 의미론이 테스트에 반영되지 않아 실제 런타임 결함을 놓쳤습니다. 현재 상태 평가는 `NOT READY`가 맞고, bootstrap/start 경로 처리와 그에 대한 회귀 테스트 보강이 선행되어야 합니다.
