# IMPLEMENTATION_REPORT (F27 Phase 5)

**Date**: 2026-02-28
**Plan**: `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_PLAN_PHASE_5.md`

## Summary

F27 Phase 5 목표였던 SSH `-i` 인증키 지정 지원을 구현했다.
원격 연결 프로필 계약에 `identityFile`을 추가하고, bootstrap/transport SSH 실행 인자에
`-i <identityFile>`와 `-o IdentitiesOnly=yes`를 일관되게 반영했다.
또한 Connect Remote UX, retry/session persistence, 보안 redaction 회귀를 함께 고정했다.

## Deliverables

- Profile contract extension:
  - `identityFile?: string`을 renderer/preload/electron/remote-agent 타입에 반영
  - remote profile 모델 테스트에 `identityFile` 회귀 케이스 추가
- SSH argument wiring:
  - `bootstrap.ts` `buildSshArgs`에 identity 처리 추가
  - `transport-ssh.ts` `buildSshProcessArgs`에 identity 처리 추가
  - identity가 있을 때만 `-i`와 `IdentitiesOnly=yes`를 포함하고, 없으면 기존 인자 유지
- UX / state / persistence:
  - Connect Remote 모달에 `Identity File (optional)` 입력 추가
  - submit payload에 `identityFile` 포함(빈 값 생략)
  - `workspace-context` connect/retry 경로 정규화에 `identityFile` 반영
  - session snapshot normalize/restore에 `identityFile` 반영
- Security redaction hardening:
  - backend `redactRemoteErrorMessage`에 `~/.ssh/...` 경로 패턴 redaction 추가
  - renderer banner sanitization에도 `~/.ssh/...` redaction 추가
- Regression tests:
  - bootstrap/transport 인자 검증 테스트 추가
  - persistence roundtrip 테스트에 `identityFile` 포함
  - App remote connect/retry payload 테스트에 `identityFile` 포함
  - App banner redaction 테스트에 `~/.ssh/...` 노출 금지 검증

## Validation

- `npx tsc --noEmit`: pass
- `npx vitest run electron/remote-agent/bootstrap.test.ts electron/remote-agent/transport-ssh.test.ts electron/remote-agent/security.test.ts src/workspace/workspace-persistence.test.ts src/App.test.tsx`: pass
- `npm test`: pass (454 tests: 453 passed, 1 skipped)
- `npm run build`: pass

## Readiness Verdict

- **READY (Phase 5 scope)**
- Notes:
  - jsdom/CodeMirror 관련 stderr 로그는 기존과 동일하게 출력되나 테스트 실패로 이어지지 않음.
  - build 시 chunk size warning이 있으나 패키징 완료됨.
