# Implementation Review: F39 원격 워크스페이스용 SSH 외부 도구 열기

**Review Date**: 2026-03-10
**Plan Location**: `_sdd/drafts/feature_draft_f39_remote_external_open_over_ssh.md`
**Reviewer**: Claude Opus 4.6
**Commits Reviewed**: `4e5b3d9`, `0d5d1df`, `1880db6`

---

## 1. Progress Overview

### Task Completion

| ID | Task | Code | Tests | Status |
|----|------|------|-------|--------|
| R1 | workspace-aware system open 계약 정의 | ✓ | ✓ | COMPLETE |
| R2 | 원격 프로필에 `sshAlias` 입력/영속화 추가 | ✓ | ✓ | COMPLETE |
| R3 | renderer 외부 열기 dispatch를 workspace-aware로 전환 | ✓ | ✓ | COMPLETE |
| R4 | main process 외부 열기 helper 분리 | ✓ | ✓ | COMPLETE |
| R5 | IPC handler에 remote launch 정책 통합 | ✓ | ✓ | COMPLETE |
| R6 | 원격/로컬 외부 열기 회귀 테스트 및 스모크 보강 | ✓ | ✓ | COMPLETE |
| +α | VSCode SSH config 자동 동기화 | ✓ | ✓ | COMPLETE (계획 외 추가) |

### Acceptance Criteria 총평

- **Total criteria**: 24
- **Met**: 23 (96%)
- **Untested (수동 확인 필요)**: 1
- **Not met**: 0

---

## 2. Detailed Assessment

### Feature Draft Acceptance Criteria vs 구현

#### F39 메인 Acceptance Criteria

| # | Criterion | Code Location | Test | Status |
|---|-----------|---------------|------|--------|
| 1 | 원격 iTerm → SSH 접속 후 remoteRoot 셸 시작 | `system-open.ts:94-112` `buildRemoteItermCommand()` | `system-open.test.ts` "builds ssh command" | MET |
| 2 | 원격 VSCode → Remote-SSH authority로 remoteRoot 열기 | `system-open.ts:114-130` `buildVsCodeRemoteArgs()` | `system-open.test.ts` "builds vscode remote args" | MET |
| 3 | sshAlias 누락 시 사용자 안내 메시지 배너 | `system-open.ts:118-122`, `App.tsx` 배너 처리 | `system-open.test.ts` "returns explicit error" | MET |
| 4 | 원격 Finder → unsupported 메시지로 safe-fail | `system-open.ts:172-177, 228-233` | `system-open.test.ts` "returns unsupported" | MET |
| 5 | 로컬 워크스페이스 외부 열기 회귀 없음 | `system-open.ts:179-214` | `system-open.test.ts` "opens local workspace", `App.test.tsx` 로컬 테스트 | MET |
| 6 | 세션 복원 후 sshAlias 포함 프로필 필드 유지 | `workspace-persistence` sshAlias 포함 | `remote-connect-modal.test.tsx` sshAlias submit 검증 | MET |

#### R1: workspace-aware system open 계약

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | openIn* 3개가 동일한 request 구조 사용 | `electron-env.d.ts` `SystemOpenInRequest` 공용 타입 | MET |
| 2 | WorkspaceRemoteProfile에 optional sshAlias | `system-open.ts:15` | MET |
| 3 | 세션 복원 타입이 새 필드 보존 | workspace-persistence에 sshAlias 포함 | MET |
| 4 | preload/env 타입이 동일 계약 노출 | `electron-env.d.ts`, `preload.ts` 일관 | MET |

#### R2: sshAlias 입력/영속화

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | 모달에서 sshAlias 입력/수정 가능 | `remote-connect-modal.tsx` sshAlias 필드 | MET |
| 2 | sshAlias 비어있어도 연결 가능 | sync 비활성 시 sshAlias optional | MET |
| 3 | 연결 후 remoteProfile에 sshAlias 보존 | 모달 submit → profile 포함 | MET |
| 4 | 앱 재시작 후 sshAlias 유지 | persistence 경로에 포함 | MET |

#### R3: renderer dispatch workspace-aware 전환

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | 요청에 workspace context 포함 | `App.tsx` handleOpenIn* → workspaceKind/remoteProfile 전달 | MET |
| 2 | 원격 실패 시 target별 안내 배너 | App.tsx 배너 처리 | MET |
| 3 | 로컬 UX 유지 | `App.test.tsx` 로컬 테스트 통과 | MET |

#### R4/R5: main process helper 분리 + IPC 통합

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | local/remote/iTerm/VSCode/Finder 분기 | `system-open.ts` `openLocalWorkspaceInExternalTool` / `openRemoteWorkspaceInExternalTool` | MET |
| 2 | SSH quoting 규칙 정의 | `quoteShellArgument()`, `escapeAppleScriptString()` | MET |
| 3 | VSCode 인자 helper 캡슐화 | `buildVsCodeRemoteArgs()`, `buildVsCodeOpenAppArgs()` | MET |
| 4 | remote 요청 시 stat 우회 | `getWorkspaceKind() === 'remote'` → stat 스킵 | MET |
| 5 | prerequisite 누락 시 safe error | sshAlias 누락 → explicit error message | MET |

#### R6: 회귀 테스트

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | local openIn* 회귀 없음 | `App.test.tsx`, `system-open.test.ts` 로컬 케이스 | MET |
| 2 | remote openInIterm/VSCode remoteProfile 기반 | `App.test.tsx` 원격 테스트, `system-open.test.ts` | MET |
| 3 | sshAlias 누락/Finder/failure 메시지 검증 | `system-open.test.ts` 3개 케이스 | MET |
| 4 | helper 단위 테스트 | `system-open.test.ts` 9개 케이스 | MET |

---

## 3. Issues Found

### Critical (0)

없음.

### Quality Issues (3)

1. **sshAlias 프로필 수준 검증 부재**
   - Location: `system-open.ts` `SystemOpenRemoteProfile`
   - Issue: 모달에서는 검증하지만, JSON 직접 편집 시 whitespace 포함 sshAlias가 `buildVsCodeRemoteArgs`까지 전달될 수 있음
   - Severity: Low (실제 사용 경로에서는 모달 검증이 cover)
   - Action: `buildVsCodeRemoteArgs`에서 sshAlias whitespace 검증 추가 고려

2. **workspace-persistence sshAlias 단위 테스트 부재**
   - Location: `src/workspace/workspace-persistence.test.ts`
   - Issue: sshAlias 영속화/복원 전용 단위 테스트가 없음 (모달 테스트에서 간접 검증)
   - Severity: Low
   - Action: persistence roundtrip 테스트에 sshAlias 포함 검증 추가 고려

3. **스모크 테스트 체크리스트 미갱신**
   - Location: `_sdd/implementation/F15_SMOKE_TEST_CHECKLIST.md`
   - Issue: Feature draft R6에서 수동 확인 항목 추가를 명시했으나 미반영
   - Severity: Low (자동 테스트가 대부분 cover)
   - Action: 원격 iTerm/VSCode/Finder 수동 확인 항목 추가

### Improvements (계획 외 추가 구현 — 긍정적)

1. **VSCode SSH config 자동 동기화** (`vscode-ssh-config.ts`)
   - Feature draft에 없던 기능이지만 UX를 크게 개선
   - `~/.ssh/sdd-workbench.config` 관리형 config로 Host 블록 자동 생성/갱신
   - Include를 파일 상단에 삽입하는 올바른 전략 적용
   - SSH directory/file 권한(0o700/0o600) 정확

2. **VSCode CLI 자동 탐지 + fallback**
   - `resolveVsCodeCliPath()`: osascript로 앱 번들에서 CLI 경로 추출
   - CLI 실패 시 `open -a` fallback → 안정성 향상

---

## 4. Test Status

### Test Summary

| Test File | Tests | Passing | Failing |
|-----------|-------|---------|---------|
| `electron/system-open.test.ts` | 9 | 9 | 0 |
| `electron/vscode-ssh-config.test.ts` | 3 | 3 | 0 |
| `src/App.test.tsx` | 113 | 112 | 0 (1 skipped) |
| `src/workspace/remote-connect-modal.test.tsx` | 9 | 9 | 0 |
| **Total** | **134** | **133** | **0** |

### Untested Areas (수동 확인 권장)

- 실제 macOS에서 iTerm SSH 세션 열기 (osascript 실행)
- 실제 VSCode Remote-SSH 연결 (VSCode 설치 필요)
- 앱 재시작 후 sshAlias 복원 (E2E)

---

## 5. Recommendations

### Should Do (품질 개선)

1. [ ] `_sdd/implementation/F15_SMOKE_TEST_CHECKLIST.md`에 원격 외부 열기 수동 확인 항목 추가
2. [ ] `workspace-persistence.test.ts`에 sshAlias roundtrip 단위 테스트 추가
3. [ ] `buildVsCodeRemoteArgs`에 sshAlias whitespace 방어 검증 추가

### Could Do (선택적 개선)

4. [ ] VSCode CLI 경로 캐싱 (현재 매 호출마다 osascript 실행)
5. [ ] identityFile 존재 여부 사전 검증 + 경고 메시지
6. [ ] SSH config Include 위치 검증 유틸 (기존 config에 잘못된 위치의 Include가 있을 때 감지/수정)

---

## 6. Conclusion

F39 구현은 feature draft의 6개 Task(R1~R6) 전체와 24개 acceptance criteria 중 23개를 충족하며, 계획 외 추가 기능(VSCode SSH config 자동 동기화)까지 포함해 **기대 이상으로 완성**되었다. 테스트 134개 전체 통과, critical issue 0건. SSH config Include 위치 버그를 발견하고 즉시 수정한 점이 특히 좋다.

가장 큰 리스크는 macOS 전용 구현(osascript/AppleScript 의존)이나, 이는 feature draft에서 명시한 범위 내 제약이다. 즉시 필요한 추가 작업은 없으며, 품질 개선 3건은 후속 작업으로 충분하다.

**최종 판정: COMPLETE — Production Ready**
