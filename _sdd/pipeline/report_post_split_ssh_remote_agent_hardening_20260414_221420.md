# Pipeline Report: Post-split SSH / Remote-Agent Hardening

**오케스트레이터**: `_sdd/pipeline/orchestrators/orchestrator_post_split_ssh_remote_agent_hardening.md`  
**로그**: `_sdd/pipeline/log_post_split_ssh_remote_agent_hardening_20260414_221420.md`  
**상태**: completed

## 1. 뭘 했는가

- `feature_draft`로 1차 SSH / remote-agent hardening workstream의 temporary spec과 implementation plan을 생성했다.
- `implementation`으로 shared SSH helper 경계를 `electron/remote-agent/ssh-utils.ts`에 고정하고, 다음 파일을 수정했다.
  - `electron/remote-agent/bootstrap.ts`
  - `electron/remote-agent/bootstrap.test.ts`
  - `electron/remote-agent/directory-browser.ts`
  - `electron/remote-agent/directory-browser.test.ts`
  - `electron/remote-agent/transport-ssh.ts`
  - `electron/remote-agent/transport-ssh.test.ts`
  - `electron/remote-agent/ssh-utils.ts`
  - `electron/remote-agent/ssh-utils.test.ts`
- 구현 직후 `implementation_review`로 findings를 받고, release-blocking regression을 한 번 수정한 뒤 re-review를 다시 수행했다.

## 2. 어떻게 나왔는가

### 구현 결과

- SSH 공통 유틸(`shellEscape`, identity path normalization, destination hardening, exit code/auth/stderr normalization)을 shared `ssh-utils.ts`로 통합했다.
- `bootstrap.ts`는 remote agent install/probe 경로에서 `agentPath`를 raw 삽입하지 않고 안전하게 조립하도록 바뀌었다.
- `directory-browser.ts`는 bootstrap-owned helper 의존을 제거하고 shared helper를 직접 사용하도록 정리했다.
- `transport-ssh.ts`는 shared helper를 사용하고, writable stdin 부재나 write callback 실패를 timeout까지 숨기지 않고 즉시 `CONNECTION_CLOSED`로 surface하도록 수정했다.
- review-fix round 1에서 발견된 `$HOME` literal 경로 regression은 `shellEscapeRemotePath()` 추가와 셸 의미론 테스트 보강으로 해소했다.

### review-fix 결과

- round 1 review:
  - Critical 1
  - Medium 1
- round 1 fix:
  - `$HOME` prefix를 실제 셸 확장 semantics를 유지하는 방식으로 조립
  - generated string 검사만 하던 테스트를 `sh -lc` 실제 평가 방식으로 보강
- rerun2 review:
  - Critical 0
  - High 0
  - Medium 0
  - Low 0

## 3. 테스트 / 검증

실행 환경:
- `node -v` → `v25.2.1`
- `npm -v` → `11.12.1`

실제 실행 결과:
- focused regression
  - 명령: `npm test -- electron/remote-agent/ssh-utils.test.ts electron/remote-agent/bootstrap.test.ts electron/remote-agent/directory-browser.test.ts electron/remote-agent/transport-ssh.test.ts`
  - 결과: PASS (`4 files`, `36 passed`)
- 전체 테스트
  - 명령: `npm test`
  - 결과: PASS (`73 files`, `858 passed`, `1 skipped`)
- 린트
  - 명령: `npm run lint`
  - 결과: PASS

수동 검증:
- `bootstrap`/`transport`가 생성하는 `$HOME`-prefixed quoting 패턴을 `sh -lc`로 직접 재현해 literal path regression이 해소됐음을 확인했다.
- `npm run dev` 기반 Electron manual smoke는 이번 파이프라인에서는 수행하지 않았다.

## 4. 스펙 동기화

- `spec-update-done`: 실행하지 않음
- 판단 근거:
  - 이번 변경은 thin global spec의 배경/범위/guardrail/핵심 결정 레벨을 바꾸기보다 remote-agent 내부 구조와 방어 로직을 정리하는 수준이다.
  - 따라서 이번 파이프라인에서는 global spec sync를 `not required`로 처리했다.

## 5. Taste Decisions

- SSH destination hardening은 `ssh --` 해석 차이에 기대기보다 leading `-` 입력을 helper 차원에서 거부하는 쪽으로 두었다.
- shared helper ownership은 bootstrap 내부가 아니라 `ssh-utils.ts`로 이동시키는 방향을 canonical로 삼았다.
- review-fix round 1에서 나온 regression은 테스트가 모두 통과했더라도 런타임 semantics 기준으로 blocker로 취급했다.

## 6. 후속 조치

- 권장 후속 1: `npm run dev`로 실제 remote browse/connect smoke를 한 번 수행해 운영 신뢰도를 높인다.
- 권장 후속 2: discussion 문서 기준 다음 workstream인 `D1 routed handler factory` 또는 `A1~A5` 정합성 묶음으로 이어간다.
- 권장 후속 3: `system-open.ts`의 유사 SSH option hardening(`S6`)은 별도 workstream으로 다룬다.
