# IMPLEMENTATION_PLAN (F27 Phase 5: SSH `-i` 인증키 지정 지원)

## 1. Overview

F27 Phase 5 목표는 원격 연결 프로필에 **SSH 인증키 경로(`identityFile`)**를 추가하고,
Electron의 SSH 실행 경로에서 `ssh -i <path>`가 실제로 적용되도록 완성하는 것이다.

핵심 결과:

1. 프로필/IPC/Renderer 타입 계약에 `identityFile`이 일관되게 추가된다.
2. `bootstrap`/`transport`의 SSH 인자 빌더가 `-i`와 `IdentitiesOnly` 정책을 반영한다.
3. Connect Remote 모달에서 인증키 경로를 입력하고 재시도/세션 복원 흐름에서 재사용할 수 있다.
4. 민감 경로 노출을 막는 오류 처리와 회귀 테스트를 함께 고정한다.

기준 입력:

- 이전 단계 결과:
  - `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_REPORT_PHASE_4.md`
- 관련 코드:
  - `electron/remote-agent/*`
  - `src/workspace/*`
  - `electron/preload.ts`, `electron/electron-env.d.ts`
- 사용자 요구:
  - SSH 연결 시 `-i` 옵션 사용 가능해야 함

결정사항(사용자 확정):

- `identityFile`은 session snapshot(localStorage)에 저장/복원한다.
- `identityFile`이 지정되면 `-o IdentitiesOnly=yes`를 강제 적용한다.

예상 난이도/기간:

- 백엔드만 최소 반영: 반나절
- UI/저장/회귀테스트 포함: 약 0.5~1일

---

## 2. Scope (In/Out)

### In Scope

- remote connection profile에 `identityFile?: string` 추가
- SSH 실행 경로(`bootstrap`, `transport`)에서 `-i` 적용
- `identityFile` 지정 시 `IdentitiesOnly=yes` 강제 적용
- `identityFile` 입력 UX(모달) 추가 및 검증
- session snapshot에 `identityFile` 저장/복원
- 오류 메시지/배너 경로 노출 방지(redaction) 회귀 검증
- unit/app 테스트 보강

### Out of Scope

- 키 파일 선택 GUI(파일 피커)
- passphrase 입력/저장 UX
- SSH agent 관리(`ssh-add`) 오케스트레이션
- 다중 키(`-i` 여러 개) 우선순위 정책 확장

---

## 3. Components

1. **Remote Profile Contract Layer**
- Renderer/Preload/Electron 간 `identityFile` 타입 계약 정렬

2. **SSH Argument Wiring Layer**
- `ssh` 커맨드 인자 생성 시 `-i` 및 관련 옵션 적용

3. **Remote Connect UX Layer**
- 인증키 경로 입력/검증, retry 시 profile 재사용

4. **Persistence Layer**
- `identityFile` snapshot 저장/복원 호환성 유지

5. **Security & Validation Layer**
- 경로 redaction 및 회귀 테스트 고정

---

## 4. Implementation Phases

### Phase 5-A: 타입/계약 확장

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P5-1 | `identityFile` 프로필 계약을 전 계층에 추가 | P0 | - | Remote Profile Contract Layer |

### Phase 5-B: SSH 인자 + UX/Persistence 구현

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P5-2 | SSH 실행 경로에 `-i`/`IdentitiesOnly` 적용 | P0 | P5-1 | SSH Argument Wiring Layer |
| P5-3 | Connect Remote 모달/상태/저장소에 `identityFile` 반영 | P1 | P5-1 | Remote Connect UX Layer, Persistence Layer |

### Phase 5-C: 보안 검증 + 통합 회귀

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| P5-4 | `identityFile` 관련 오류 redaction 및 노출 정책 고정 | P0 | P5-2,P5-3 | Security & Validation Layer |
| P5-5 | Phase 5 통합 테스트/빌드 게이트 검증 | P0 | P5-4 | Security & Validation Layer |

---

## 5. Task Details

### Task P5-1: `identityFile` 프로필 계약을 전 계층에 추가
**Component**: Remote Profile Contract Layer  
**Priority**: P0-Critical  
**Type**: Infrastructure

**Description**:
remote profile 타입에 `identityFile?: string`을 추가하고,
Renderer ↔ Preload ↔ Main ↔ Remote Agent 타입이 동일 계약으로 맞춰지도록 정리한다.

**Acceptance Criteria**:
- [ ] `RemoteConnectionProfile`/`WorkspaceRemoteProfile`/preload/env 타입에 `identityFile?: string` 필드가 일관되게 추가된다.
- [ ] connect/retry 경로에서 `identityFile`이 profile payload로 전달된다.
- [ ] 타입 불일치 없이 `npx tsc --noEmit` 통과한다.

**Target Files**:
- [M] `electron/remote-agent/types.ts` -- remote profile 타입 확장
- [M] `src/workspace/workspace-model.ts` -- renderer remote profile 타입 확장
- [M] `electron/preload.ts` -- preload profile 타입/IPC payload 확장
- [M] `electron/electron-env.d.ts` -- Window API 타입 확장
- [M] `src/workspace/workspace-model.test.ts` -- remote profile 필드 회귀

**Technical Notes**:
- optional 필드로 도입해 기존 프로필과 하위호환을 유지한다.
- 값 정규화는 `trim()` 기반으로 최소화한다.

**Dependencies**: -

---

### Task P5-2: SSH 실행 경로에 `-i`/`IdentitiesOnly` 적용
**Component**: SSH Argument Wiring Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`transport-ssh`와 `bootstrap`에서 SSH args 생성 시 `identityFile`이 존재하면
`-i <identityFile>`를 추가하고, 충돌 방지를 위해 `-o IdentitiesOnly=yes`를 강제 적용한다.

**Acceptance Criteria**:
- [ ] `identityFile` 지정 시 `ssh` 실행 인자에 `-i`가 포함된다.
- [ ] `identityFile` 지정 시 `-o IdentitiesOnly=yes`가 항상 포함된다.
- [ ] `identityFile` 미지정 시 기존 동작(현재 args)과 동일하다.
- [ ] bootstrap/probe/install 경로와 session transport 경로 모두 동일 정책을 사용한다.

**Target Files**:
- [M] `electron/remote-agent/transport-ssh.ts` -- runtime ssh args 확장
- [M] `electron/remote-agent/bootstrap.ts` -- probe/install ssh args 확장
- [M] `electron/remote-agent/transport-ssh.test.ts` -- `-i`/`IdentitiesOnly` 인자 검증
- [M] `electron/remote-agent/bootstrap.test.ts` -- bootstrap ssh args 회귀 검증

**Technical Notes**:
- 공통 인자 빌더를 추출해 bootstrap/transport 정책 드리프트를 방지한다.
- MVP에서는 키 파일 존재 여부를 사전 FS 검증하지 않고, SSH 에러를 표준 코드로 매핑한다.
- `IdentitiesOnly=yes` 강제 적용이 기존 연결 시나리오를 깨지 않는지 P5-5 회귀 테스트로 고정한다.

**Dependencies**: P5-1

---

### Task P5-3: Connect Remote 모달/상태/저장소에 `identityFile` 반영
**Component**: Remote Connect UX Layer, Persistence Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:
Connect Remote 모달에 인증키 경로 입력 필드를 추가하고,
workspace context의 connect/retry/session snapshot 흐름에서 `identityFile`이 유지되도록 반영한다.

**Acceptance Criteria**:
- [ ] 모달에 `identityFile` 입력이 추가되고 빈 값은 생략된다.
- [ ] connect 성공 후 remote profile state에 `identityFile`이 보존된다.
- [ ] retry 연결 시 마지막 `identityFile`이 포함된 profile로 재시도한다.
- [ ] session snapshot 저장/복원 시 `identityFile`이 손실되지 않는다.
- [ ] 기존 snapshot(v1/v2) 로딩 하위호환이 유지된다.

**Target Files**:
- [M] `src/workspace/remote-connect-modal.tsx` -- 인증키 입력 필드 + validation
- [M] `src/workspace/workspace-context.tsx` -- connect/retry profile 정규화 반영
- [M] `src/workspace/workspace-persistence.ts` -- snapshot serialize/deserialize 반영
- [M] `src/workspace/workspace-persistence.test.ts` -- snapshot identityFile 회귀
- [M] `src/App.tsx` -- 필요 시 profile 표시/동선 정합화
- [M] `src/App.test.tsx` -- 모달 submit/retry profile payload 검증

**Technical Notes**:
- UI에는 전체 키 경로를 기본적으로 재노출하지 않거나, 필요 시 마스킹 표시를 적용한다.
- `identityFile`은 snapshot에 저장하며, 로컬 민감정보 저장에 대한 주의사항을 운영 가이드에 명시한다.

**Dependencies**: P5-1

---

### Task P5-4: `identityFile` 관련 오류 redaction 및 노출 정책 고정
**Component**: Security & Validation Layer  
**Priority**: P0-Critical  
**Type**: Security

**Description**:
SSH 실패 시 오류 문자열에 키 경로가 포함될 수 있으므로,
main/backend/renderer 사용자 노출 메시지 경로에서 `identityFile`/절대경로가 노출되지 않도록 고정한다.

**Acceptance Criteria**:
- [ ] backend 라우팅 오류 메시지에서 절대경로(`~/.ssh/...`, `/Users/.../.ssh/...`)가 redaction된다.
- [ ] renderer 배너에도 원문 키 경로가 노출되지 않는다.
- [ ] 보안 유틸 테스트에 `identityFile` 관련 패턴 케이스가 추가된다.

**Target Files**:
- [M] `electron/remote-agent/security.ts` -- redaction 패턴 보강
- [M] `electron/remote-agent/security.test.ts` -- key path redaction 케이스
- [M] `electron/main.ts` -- backend error message 경로 회귀 검증(필요 시)
- [M] `src/workspace/workspace-context.tsx` -- banner sanitization 회귀 정합화
- [M] `src/App.test.tsx` -- UI 노출 금지 시나리오 보강

**Technical Notes**:
- path redaction은 과도한 치환으로 가독성을 망치지 않도록 최소 패턴 우선 적용.
- 오류코드(`AUTH_FAILED`, `TIMEOUT`) 가시성은 유지하고 원문 stderr만 제거한다.

**Dependencies**: P5-2, P5-3

---

### Task P5-5: Phase 5 통합 테스트/빌드 게이트 검증
**Component**: Security & Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
`identityFile` 도입 후 profile contract, ssh args, UI/retry, persistence, redaction이
동시에 회귀하지 않도록 테스트와 빌드 게이트를 확정한다.

**Acceptance Criteria**:
- [ ] remote-agent 테스트가 `-i` 인자 적용 여부를 검증한다.
- [ ] App 테스트가 `identityFile` 입력/재시도 payload를 검증한다.
- [ ] persistence 테스트가 `identityFile` roundtrip을 검증한다.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` 통과한다.

**Target Files**:
- [M] `electron/remote-agent/transport-ssh.test.ts`
- [M] `electron/remote-agent/bootstrap.test.ts`
- [M] `src/App.test.tsx`
- [M] `src/workspace/workspace-persistence.test.ts`
- [M] `src/workspace/workspace-model.test.ts`

**Technical Notes**:
- 실 SSH 연결 대신 mock 인자 검증으로 결정적 테스트를 유지한다.
- 기존 jsdom/CodeMirror stderr 노이즈는 known issue로 분리한다.

**Dependencies**: P5-4

---

## 6. Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 5-A | 1 | 1 | 타입 계약 공통 파일 충돌로 순차 |
| 5-B | 2 | 2 | `P5-2`(electron/remote-agent)와 `P5-3`(renderer/persistence)는 병렬 가능 |
| 5-C | 2 | 1 | `App.test.tsx`, `security.ts` 공유로 `P5-4 -> P5-5` 순차 권장 |

충돌/순서 메모:

- `P5-1` 미완료 상태에서 `P5-2`/`P5-3`를 시작하면 타입 불일치로 재작업 가능성이 높다.
- `P5-3`와 `P5-4` 모두 `workspace-context.tsx`를 건드릴 수 있어 짧은 단위 merge가 필요하다.
- `P5-5`는 테스트 파일 충돌을 줄이기 위해 마지막 통합 단계로 고정한다.

---

## 7. Risks & Mitigations

1. **키 경로 민감정보 노출 위험**
- Mitigation: backend/renderer 공통 redaction 테스트를 추가하고 금지 패턴을 고정한다.

2. **bootstrap/transport 인자 정책 드리프트 위험**
- Mitigation: 공통 인자 빌더 또는 동일 테스트 fixture를 사용해 두 경로를 함께 검증한다.

3. **snapshot 하위호환 회귀 위험**
- Mitigation: 기존 schema 로딩 테스트를 유지하고 `identityFile` 필드가 없어도 정상 복원되도록 검증한다.

4. **ssh config 별칭과 `-i` 충돌 위험**
- Mitigation: `identityFile` 지정 시 `IdentitiesOnly=yes`를 강제 적용하고, 회귀 테스트로 호환성을 검증한다.

5. **UI에 전체 키 경로 노출로 인한 shoulder surfing 위험**
- Mitigation: 기본은 입력값 표시 최소화(또는 마스킹)하고, 배너/에러에는 절대경로를 출력하지 않는다.

---

## 8. Open Questions

1. `identityFile` 입력 UX를 plain text로 둘지, 파일 선택 버튼까지 포함할지 확정 필요
- 현재 계획: MVP는 plain text 입력만 지원.

2. SSH config 별칭(`Host my-remote`) 사용 시 `identityFile` 필드 충돌 시나리오에서
   예외 정책(예: 특정 호스트만 강제 해제)이 필요한지 확정 필요
- 현재 계획: UI 입력(`-i`)이 있으면 UI 입력 + `IdentitiesOnly=yes` 우선.
