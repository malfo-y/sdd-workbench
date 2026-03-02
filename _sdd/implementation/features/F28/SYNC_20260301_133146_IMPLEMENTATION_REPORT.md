# IMPLEMENTATION_REPORT (F28)

**Date**: 2026-03-01
**Plan**: `/_sdd/drafts/feature_draft_f28_remote_root_browse_after_ssh.md` (Part 2)

## Summary

F28의 목표였던 "SSH 프로필 확인 후 원격 디렉토리 탐색으로 `remoteRoot` 선택" 흐름을 구현했다. 기존 F27 연결 경로를 유지하면서, browse IPC/API와 2-step 연결 모달 UX를 추가해 경로 수동 입력 의존을 낮췄다.

## Deliverables

- `workspace:browseRemoteDirectories` IPC 계약(preload/env/main) 추가
- SSH 단발 호출 기반 원격 디렉토리 브라우저 서비스 추가
- browse 요청/결과 로깅(`remoteBrowse.request/result`) 추가
- Remote Connect 모달 2-step(Profile/Directory) UX + 오류 고정 노출 + truncation 경고
- App 레벨 browse callback wiring 및 browse->connect 통합
- 단위/통합 테스트 보강

## Validation

- `npm test`: pass (full suite)
- `npm run build`: pass
- `npx eslint` (changed TS files): pass
- `npm run lint` (full repo): fail (pre-existing unrelated lint debt)

## Readiness Verdict

- **READY (F28 scope)**
- Caveat: repository-level lint baseline 이슈는 본 변경 범위 밖으로 남아 있음.
