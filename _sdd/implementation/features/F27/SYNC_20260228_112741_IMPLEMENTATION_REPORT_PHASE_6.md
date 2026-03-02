# IMPLEMENTATION_REPORT (F27 Phase 6)

**Date**: 2026-02-28
**Plan**: `/_sdd/implementation/features/F27/SYNC_20260228_112741_IMPLEMENTATION_PLAN_PHASE_6.md`

## Summary

F27 Phase 6 목표였던 "stub bootstrap" 제거와 실행 가능한 원격 agent runtime 배포/기동을 구현했다.
이제 bootstrap이 런타임 payload를 원격에 설치/업데이트하고, transport가 startup healthcheck를 수행해
실패를 `CONNECTION_CLOSED`로 뭉개지 않고 `BOOTSTRAP_FAILED`로 표준화한다.

## Deliverables

- Remote runtime server (stdio JSON line):
  - `agent-main.ts`/`request-router.ts` 기반 request-response 루프 구현
  - `--protocol-version`, `--healthcheck`, `--stdio --protocol-version --workspace-root` 지원
  - `workspace.*` allowlist 범위의 파일/디렉토리/comments/git/watch 연산 처리
  - path boundary guard(`..` 이탈 차단)와 watch polling fallback 이벤트 송신
- Runtime payload build pipeline:
  - `scripts/build-remote-agent-runtime.mjs` 추가
  - generated payload(`generated-payload.ts`)를 bootstrap에서 직접 배포 사용
  - `package.json`의 `test`/`build`에서 payload 생성 선행 실행
- Bootstrap/runtime install + startup validation:
  - `bootstrap.ts`에서 runtime/stub marker 구분(`--healthcheck`)
  - 미설치/구버전/스텁 상태에서 payload 설치 후 `--protocol-version` 재검증
- Startup failure diagnostics hardening:
  - `transport-ssh.ts`가 연결 시작 직후 `agent.healthcheck` 요청으로 준비상태 확인
  - stub/runtime 미탑재 시그널을 `BOOTSTRAP_FAILED`로 매핑
  - `connection-service.ts`에서 `BOOTSTRAP_FAILED`를 fatal로 처리
- Renderer UX alignment:
  - Connect Remote 모달 Agent Path placeholder를 기본 경로(`~/.sdd-workbench/bin/sdd-remote-agent`)로 정합화
  - `workspace-context.tsx`에 bootstrap 실패 전용 배너 문구 추가
- Regression coverage:
  - runtime 단위 테스트군 추가
  - transport startup healthcheck/stub 매핑 테스트 보강
  - bootstrap/connection/integration/app 관련 기존 테스트와의 호환성 확인

## Validation

- `npx tsc --noEmit`: pass
- `npx vitest run electron/remote-agent/runtime/agent-main.test.ts electron/remote-agent/runtime/request-router.test.ts electron/remote-agent/runtime/workspace-ops.test.ts electron/remote-agent/runtime/watch-ops.test.ts electron/remote-agent/runtime/payload.test.ts electron/remote-agent/transport-ssh.test.ts`: pass
- `npx vitest run electron/remote-agent/bootstrap.test.ts electron/remote-agent/connection-service.test.ts electron/remote-agent/integration-smoke.test.ts electron/workspace-backend/remote-workspace-backend.test.ts electron/workspace-backend/remote-watch-bridge.test.ts src/App.test.tsx`: pass
- `npm test`: pass
- `npm run build`: pass

## Readiness Verdict

- **READY (Phase 6 scope)**
- Residual risk:
  - CI는 mock 기반이므로 실제 원격 호스트(권한/경로/node 버전 차이)에서 1회 수동 스모크를 권장.
