# Feature Draft: Post-split SSH / Remote-Agent Hardening

<!-- spec-update-todo-input-start -->
# Part 1: Temporary Spec Draft

## Change Summary

모놀리스 분할 이후 남은 1차 구조 workstream으로, `bootstrap.ts`, `transport-ssh.ts`, `directory-browser.ts`에 흩어진 SSH helper와 오류 처리 규칙을 하나의 shared boundary로 수렴한다. 이번 draft는 단순 중복 제거에 그치지 않고, `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`의 `D4`, `S1`, `S2`, `A7`을 한 묶음으로 처리 가능한 실행 청사진을 제공한다.

핵심 변경은 다음 네 축이다.

- shared `electron/remote-agent/ssh-utils.ts` 도입
- option/script injection hardening
- exit-code / auth failure / stderr normalization 일관화
- `transport-ssh.ts` request write failure surface 명시화

## Scope Delta

**In Scope**

- `electron/remote-agent/ssh-utils.ts` 신규 도입
- `bootstrap.ts`의 SSH 인자 구성, probe/install 스크립트 경계, stderr normalization 정리
- `transport-ssh.ts`의 SSH destination hardening 및 request write 실패 즉시 surface
- `directory-browser.ts`의 shared helper 재사용 및 bootstrap 의존 제거
- `bootstrap.test.ts`, `transport-ssh.test.ts`, `directory-browser.test.ts` 갱신
- `ssh-utils.test.ts` 신규 추가

**Out of Scope**

- `system-open.ts`의 유사 SSH option hardening (`S6`)
- `workspace-context` 관련 비동기/정합성 수정
- remote agent runtime(`electron/remote-agent/runtime/*`) 동작 변경
- renderer IPC 계약, remote workspace spec 본문, `_sdd/spec/` 문서 수정
- protocol/schema 변경이 필요한 수준의 에러 코드 확장

**Guardrails**

- 기존 remote workspace IPC/public behavior는 유지하고 내부 helper ownership만 재정리한다.
- 정상 경로의 SSH 연결/부팅/browse 동작은 가능한 한 유지한다.
- `AUTH_FAILED`, `BOOTSTRAP_FAILED`, `CONNECTION_CLOSED`, `TIMEOUT` 등 기존 에러 코드 체계는 유지한다.
- `_sdd/spec/` 아래 파일은 수정하지 않는다.

## Contract/Invariant Delta

| ID | Type | Change | Why |
|----|------|--------|-----|
| C1 | Modify | bootstrap / transport / browse의 SSH command assembly는 shared `ssh-utils.ts`를 canonical helper boundary로 사용한다. | `D4` 중복 제거와 helper ownership 정리 |
| C2 | Add | SSH destination(`user`, `host`)와 bootstrap script/path 입력(`agentPath`, remote command fragments)은 option/script injection 관점에서 검증 또는 안전한 escaping을 거친다. | `S1`, `S2`를 한 번에 방어 |
| C3 | Modify | numeric exit code 추출, auth failure 판정, stderr normalization은 세 경로에서 일관된 규칙을 사용한다. | bootstrap/browse/transport 간 오류 표면 불일치 제거 |
| C4 | Add | `transport.request()`는 writable stdin 부재나 write callback 오류를 timeout까지 숨기지 않고 즉시 `CONNECTION_CLOSED` 계열 오류로 surface한다. | `A7` 해결 |
| I1 | Add | `ssh-utils.ts`는 bootstrap, transport, directory-browser에서 공통 사용 가능해야 하며 protocol/service cycle을 만들지 않는다. | shared helper가 새 구조 부채가 되지 않도록 제한 |
| I2 | Add | `directory-browser.ts`는 bootstrap-owned helper import를 제거하고 shared helper를 직접 사용한다. | browse가 bootstrap 내부 구현에 종속되지 않도록 경계 재설정 |

## Touchpoints

| 파일 | 변경 이유 |
|------|-----------|
| `electron/remote-agent/ssh-utils.ts` | shell escape, identity args, destination validation, exit/auth/stderr normalization의 canonical ownership |
| `electron/remote-agent/bootstrap.ts` | probe/install script hardening, shared helper adoption, bootstrap 전용 path 정책 유지 |
| `electron/remote-agent/transport-ssh.ts` | shared helper adoption, destination hardening, request write 실패 즉시 reject |
| `electron/remote-agent/directory-browser.ts` | bootstrap 의존 제거, shared helper reuse, browse 오류 normalization 일관화 |
| `electron/remote-agent/ssh-utils.test.ts` | helper 단위 회귀 방지 |
| `electron/remote-agent/bootstrap.test.ts` | bootstrap-specific escaping/normalization 검증 |
| `electron/remote-agent/transport-ssh.test.ts` | option injection 방지와 stdin write failure surface 검증 |
| `electron/remote-agent/directory-browser.test.ts` | browse auth/exit/stderr behavior와 shared helper reuse 검증 |

## Implementation Plan

1. `ssh-utils.ts`를 먼저 도입해 shared API를 고정한다.
2. `bootstrap.ts`와 `directory-browser.ts`를 shared helper로 전환하면서 script/path hardening과 오류 normalization을 맞춘다.
3. `transport-ssh.ts`를 shared helper로 전환하고, destination hardening 및 request write failure surface를 추가한다.
4. helper 단위 테스트와 consumer 테스트를 보강한 뒤 targeted remote-agent tests, `npm test`, `npm run lint`로 마무리한다.

기본 실행 순서는 순차형이지만, shared helper API가 먼저 안정화되면 bootstrap/directory-browser 묶음과 transport 묶음은 제한적으로 병렬화 가능하다.

## Validation Plan

| ID | Targets | Verification Method | Evidence / Notes |
|----|---------|---------------------|------------------|
| V1 | C1, I1, I2 | `electron/remote-agent/ssh-utils.test.ts` 신규 추가 + 기존 args 관련 테스트 갱신 | shared helper API, bootstrap-owned helper import 제거, destination helper usage 확인 |
| V2 | C2 | `bootstrap.test.ts`, `transport-ssh.test.ts`에 option/script injection hardening 케이스 추가 | `agentPath` escaping, `user`/`host` leading `-` 거부 또는 동등 hardening 검증 |
| V3 | C3 | `bootstrap.test.ts`, `directory-browser.test.ts`, `transport-ssh.test.ts`에서 exit/auth/stderr normalization 케이스 보강 | auth failure, non-zero exit, node runtime missing 메시지 일관성 확인 |
| V4 | C4 | `transport-ssh.test.ts`에 stdin 부재 / write callback failure 즉시 reject 케이스 추가 | timeout 대기 없이 `CONNECTION_CLOSED` 계열 오류로 surface되는지 확인 |
| V5 | C1, C2, C3, C4, I1, I2 | `npm test -- electron/remote-agent/ssh-utils.test.ts electron/remote-agent/bootstrap.test.ts electron/remote-agent/transport-ssh.test.ts electron/remote-agent/directory-browser.test.ts`, `npm test`, `npm run lint` | targeted regression + repo standard gate |

## Risks / Open Questions

| # | Type | Description | Mitigation / Direction |
|---|------|-------------|------------------------|
| R1 | Risk | shell escaping 또는 script 조립 경계가 바뀌면서 기존 SSH command quoting이 미묘하게 달라질 수 있다. | helper 단위 테스트에 공백/quote 포함 입력을 추가하고, bootstrap/browse/transport가 같은 helper를 쓰도록 제한한다. |
| R2 | Risk | `user`/`host` option injection hardening을 `--` 구분자에 의존하면 OpenSSH 버전별 해석 차이를 다시 확인해야 한다. | 기본 방향은 helper 차원에서 leading `-` 입력을 reject하는 쪽으로 잡고, `--`는 추가 defense 여부만 후속 검토한다. |
| R3 | Risk | `ssh-utils.ts`가 bootstrap 전용 메시지나 protocol 타입까지 끌어오면 import cycle이 생길 수 있다. | helper는 SSH 조립/정규화만 담당하고, `RemoteAgentError` 생성은 consumer가 유지한다. |
| R4 | Open | `buildSshArgs`와 `normalizeLocalIdentityFilePath`의 기존 export ownership을 bootstrap에 남길지 shared helper로 옮길지 결정이 필요하다. | 현재 알려진 소비자가 내부 파일과 테스트뿐이므로, canonical export를 `ssh-utils.ts`로 옮기고 tests/import를 같이 갱신하는 쪽을 권장한다. |

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

이번 구현은 SSH 연결 계층을 다시 설계하는 작업이 아니라, split 이후 드러난 구조 중복과 방어 누락을 좁은 범위에서 정리하는 hardening pass입니다. 구현의 중심은 `ssh-utils.ts`를 canonical helper boundary로 세우고, bootstrap / transport / browse가 그 helper를 재사용하면서 서로 다른 오류 표면과 보안 경계를 맞추는 것입니다.

## Scope

**In Scope**

- shared `ssh-utils.ts` 생성
- `bootstrap.ts`의 probe/install 스크립트 hardening
- `transport-ssh.ts`의 destination hardening과 request write failure surface
- `directory-browser.ts`의 shared helper adoption과 bootstrap coupling 제거
- remote-agent 관련 단위 테스트 보강

**Out of Scope**

- `system-open.ts` SSH command hardening
- remote runtime 프로토콜/메서드 변경
- `connection-service.ts` 또는 backend/session registry 변경
- renderer 상태/배너/IPC contract 변경
- `_sdd/spec/` 문서 수정

## Components

| Component | Responsibility |
|-----------|----------------|
| Shared SSH Utility Foundation | escaping, identity args, timeout/destination helper, exit/auth/stderr normalization |
| Bootstrap Hardening | agentPath/script 경계 보호, bootstrap 전용 오류 surface 유지 |
| Transport Hardening | destination option injection 방지, request write failure surface |
| Browse Hardening | shared helper reuse, bootstrap layering 제거, browse 오류 정규화 |
| Remote-Agent Test Surface | helper 단위 테스트 + consumer 회귀 테스트 |

## Contract/Invariant Delta Coverage

| Delta ID | Covered By | Validation |
|----------|------------|------------|
| C1 | H1, H2, H3 | V1, V5 |
| C2 | H1, H2, H3 | V2, V5 |
| C3 | H1, H2, H3 | V3, V5 |
| C4 | H3 | V4, V5 |
| I1 | H1 | V1, V5 |
| I2 | H1, H2 | V1, V5 |

## Implementation Phases

### Phase 1: Shared Helper Boundary 고정

- Goal: `ssh-utils.ts`의 canonical helper API와 테스트를 먼저 고정한다.
- Task Set: H1
- Dependency Closure: 없음
- Validation Focus: helper ownership, import boundary, escaping/normalization primitive
- Exit Criteria: `ssh-utils.ts`와 `ssh-utils.test.ts`가 생성되고, consumer가 의존할 API shape가 정해진다.
- Carry-over Policy: 없음

### Phase 2: Consumer Adoption + Hardening

- Goal: bootstrap / browse / transport가 shared helper를 사용하도록 정리하고, 보안/오류 delta를 각 consumer에 적용한다.
- Task Set: H2, H3
- Dependency Closure: H1 완료 필수
- Validation Focus: destination/script hardening, request write failure surface, consumer 회귀 테스트
- Exit Criteria: 세 consumer가 shared helper를 사용하고, targeted tests / repo gates가 통과한다.
- Carry-over Policy: `critical/high/medium` carry-over 없음

## Task Details

### Task H1: shared `ssh-utils.ts` foundation 도입
**Component**: Shared SSH Utility Foundation  
**Priority**: P0  
**Type**: Refactor

**Description**: bootstrap / transport / browse가 공통으로 사용하는 SSH helper를 신규 모듈로 모은다. 이 단계에서 canonical helper ownership을 고정하고, consumer가 그대로 import 가능한 API shape를 확정한다.

**Acceptance Criteria**:
- [ ] `electron/remote-agent/ssh-utils.ts`가 생성된다.
- [ ] shell escape, identity args, numeric exit code 추출, auth failure 판정, stderr normalization, destination hardening helper가 모듈에 정의된다.
- [ ] `directory-browser.ts`가 bootstrap-owned helper에 의존하지 않아도 되는 경계가 마련된다.
- [ ] `ssh-utils.test.ts`가 helper-level 회귀 케이스를 포함한다.

**Target Files**:
- [C] `electron/remote-agent/ssh-utils.ts` -- canonical SSH helper 모듈
- [C] `electron/remote-agent/ssh-utils.test.ts` -- helper 단위 회귀 테스트

**Technical Notes**: Covers C1, C2, C3, I1, I2, validated by V1, V2, V3. `RemoteAgentError` 생성이나 bootstrap 전용 상태는 helper로 끌어오지 말고, consumer가 helper 결과를 조합하도록 유지합니다.
**Dependencies**: -

### Task H2: bootstrap / directory-browser consumer 전환
**Component**: Bootstrap Hardening / Browse Hardening  
**Priority**: P0  
**Type**: Bug

**Description**: `bootstrap.ts`와 `directory-browser.ts`가 shared helper를 사용하도록 전환하고, bootstrap script/path 경계와 browse 오류 표면을 같이 정리한다.

**Acceptance Criteria**:
- [ ] `bootstrap.ts`의 probe/install 경로에서 `agentPath`가 직접 raw 삽입되지 않거나 동등한 수준으로 안전하게 조립된다.
- [ ] `directory-browser.ts`가 bootstrap import 대신 shared helper를 사용한다.
- [ ] bootstrap / browse 모두 auth failure, numeric exit code, stderr normalization 규칙을 shared helper 기준으로 맞춘다.
- [ ] 관련 테스트가 새 helper ownership과 hardening 동작을 검증한다.

**Target Files**:
- [M] `electron/remote-agent/bootstrap.ts` -- shared helper adoption, script hardening, 오류 정규화
- [M] `electron/remote-agent/bootstrap.test.ts` -- agentPath/script hardening, normalization 테스트
- [M] `electron/remote-agent/directory-browser.ts` -- bootstrap coupling 제거, shared helper adoption
- [M] `electron/remote-agent/directory-browser.test.ts` -- auth/exit/stderr 회귀 테스트

**Technical Notes**: Covers C1, C2, C3, I2, validated by V1, V2, V3, V5. `NODE_RUNTIME_MISSING_MESSAGE` semantics는 유지하되 helper ownership은 bootstrap 밖으로 이동할 수 있습니다.
**Dependencies**: H1

### Task H3: transport hardening과 request write failure surface
**Component**: Transport Hardening  
**Priority**: P0  
**Type**: Bug

**Description**: `transport-ssh.ts`가 shared helper를 사용하도록 정리하고, SSH destination option injection 방지와 request write failure immediate reject를 구현한다.

**Acceptance Criteria**:
- [ ] transport가 duplicated `shellEscape` / identity arg logic 없이 shared helper를 사용한다.
- [ ] `user` 또는 `host`가 SSH option으로 해석될 수 있는 입력을 helper 차원에서 거부하거나 동등한 hardening을 구현한다.
- [ ] writable stdin이 없거나 write callback이 실패하면 request promise가 timeout까지 pending 되지 않는다.
- [ ] 관련 테스트가 option injection 방지와 write failure surface를 검증한다.

**Target Files**:
- [M] `electron/remote-agent/transport-ssh.ts` -- shared helper adoption, destination hardening, write failure reject
- [M] `electron/remote-agent/transport-ssh.test.ts` -- leading `-` 입력 방지, stdin/write failure 테스트

**Technical Notes**: Covers C1, C2, C3, C4, validated by V1, V2, V3, V4, V5. `stdin.write`는 optional chaining 제거와 callback/error path cleanup을 함께 설계해야 pendingRequests 정리가 일관됩니다.
**Dependencies**: H1

## Parallel Execution Summary

- 기본 권장 순서: **H1 -> H2 -> H3**
- 제한적 병렬화 가능 구간: H1에서 `ssh-utils.ts` API shape가 고정된 뒤에는 H2와 H3가 서로 다른 consumer 파일을 주로 수정하므로 병렬화 후보가 된다.
- 병렬화 시 ownership:
  - H1 owns `ssh-utils.ts`, `ssh-utils.test.ts`
  - H2 owns `bootstrap.ts`, `bootstrap.test.ts`, `directory-browser.ts`, `directory-browser.test.ts`
  - H3 owns `transport-ssh.ts`, `transport-ssh.test.ts`
- 기본값을 순차로 두는 이유: helper API가 중간에 흔들리면 H2/H3가 동시에 충돌할 가능성이 높고, 이번 범위는 작아서 병렬 이득이 제한적이다.

## Risks and Mitigations

| ID | Risk | Mitigation |
|----|------|------------|
| RM1 | helper가 지나치게 많은 책임을 흡수하면 bootstrap/transport/browse보다 더 큰 shared bucket이 된다. | SSH 조립/정규화 primitive만 넣고, domain-specific error construction은 consumer에 남긴다. |
| RM2 | `agentPath` escaping과 remote command quoting이 바뀌면서 bootstrap healthcheck/protocol probe가 깨질 수 있다. | bootstrap 테스트에 path variant(기본 경로, `~/...`, quote 포함 불가 path rejection)와 stderr normalization 케이스를 넣는다. |
| RM3 | `stdin.write` failure를 즉시 reject로 바꾸면 기존 timeout 기반 테스트 가정이 깨질 수 있다. | `transport-ssh.test.ts`를 callback/error-path 중심으로 재작성하고 pending request cleanup까지 함께 검증한다. |
| RM4 | leading `-` rejection을 너무 넓게 적용하면 기존 저장 프로필 중 일부가 갑자기 invalid가 될 수 있다. | hardening 적용 범위를 `user`/`host` SSH destination 조립 경계에만 한정하고, 오류 메시지를 명확히 유지한다. |

## Open Questions

- OQ1: SSH destination hardening은 helper 내부 validation으로 통일하는 것이 가장 단순하지만, connect modal 입력 단계에서도 같은 정책을 재사용할지 후속 정리가 필요합니다.
- OQ2: `buildSshArgs`를 bootstrap의 compatibility export로 잠시 남길지, 이번 범위에서 바로 `ssh-utils.ts` canonical export로 전환할지는 구현 직전에 최종 결정이 필요합니다. 현재 권장안은 즉시 전환입니다.
