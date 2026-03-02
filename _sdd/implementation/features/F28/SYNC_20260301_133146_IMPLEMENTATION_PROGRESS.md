# IMPLEMENTATION_PROGRESS (F28)

## 1) Scope Covered

- Plan source: `/_sdd/drafts/feature_draft_f28_remote_root_browse_after_ssh.md` (Part 2)
- Covered tasks: `B1` ~ `B5` (completed)

| ID | Task | Status | Evidence |
|---|---|---|---|
| B1 | 원격 디렉토리 탐색 IPC/타입 계약 추가 | completed | `electron/preload.ts`, `electron/electron-env.d.ts`, `src/App.test.tsx` |
| B2 | Electron main SSH 디렉토리 탐색 서비스 구현 | completed | `electron/remote-agent/directory-browser.ts`, `electron/main.ts`, unit tests |
| B3 | Remote Connect 모달 2-step 탐색 UX 확장 | completed | `src/workspace/remote-connect-modal.tsx`, `src/App.css`, modal tests |
| B4 | App 레벨 탐색-선택-연결 통합 | completed | `src/App.tsx`, `src/App.test.tsx` |
| B5 | cap/timeout/오류 노출/로그 회귀 테스트 고정 | completed | `electron/remote-agent/directory-browser.test.ts`, `src/workspace/remote-connect-modal.test.tsx`, `src/App.test.tsx` |

## 2) Files Changed

- `electron/electron-env.d.ts`
- `electron/preload.ts`
- `electron/main.ts`
- `electron/remote-agent/directory-browser.ts` (new)
- `electron/remote-agent/directory-browser.test.ts` (new)
- `src/workspace/remote-connect-modal.tsx`
- `src/workspace/remote-connect-modal.test.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`

## 3) Test Status

- Environment checks:
  - `node -v` => `v25.2.1`
  - `npm -v` => `11.7.0`
- Passed:
  - `npm test` (full suite, 49 files / 485 tests)
  - `npm run build`
  - `npx eslint` on changed TypeScript files
- Baseline caveat:
  - `npm run lint` full repository still fails due pre-existing lint issues in unrelated files.

## 4) Parallel/Sequential Execution

- Phase 1: `B1 -> B2` sequential (shared IPC/main contract)
- Phase 2: `B3 -> B4` sequential (modal props 계약 의존)
- Phase 3: `B5` validation-focused pass

## 5) Remaining Risks

- 원격 탐색은 SSH 비대화형 shell 동작에 의존하므로 일부 환경에서 디렉토리 listing 포맷 편차가 발생할 수 있다.
- 탐색 단계 성공이 agent runtime 성공을 보장하지 않으므로, bootstrap 실패 배너와 병행 확인이 필요하다.
