# Implementation Progress: post_split_routed_handler_factory

**날짜**: 2026-04-14
**기반 논의**: `_sdd/discussion/2026-04-14_discussion_post_split_remaining_issues_prioritization.md`
**관련 리뷰**: `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md` (`D1`)

| task_id | title | phase | dependencies | status | owner/sub-agent | notes |
|---|---|---|---|---|---|---|
| D1 | `workspace-ipc-routing.ts` routed handler factory 추출 | direct | 없음 | completed | codex | public IPC handler export 유지, rootPath 기반 routed handler 공통 팩토리 + 회귀 테스트 추가 완료 |

## Notes

- `D4` SSH 유틸 통합은 별도 workstream으로 이미 진행된 상태로 간주한다.
- 이번 구현은 `_sdd/spec/`를 수정하지 않고, Electron routing layer 내부 반복 제거와 검증에만 집중한다.
- Verification: `npm test -- electron/workspace-ipc-routing.test.ts`, `npm test`, `npm run lint`
