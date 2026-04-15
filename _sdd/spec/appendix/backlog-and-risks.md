# Backlog And Risks

## 1. 현재 Known Issue / 한계

1. watcher 튜닝 여지가 남아 있다.
2. source selection mapping은 raw HTML, 복잡한 GFM edge case, stale offset에서 best-effort 또는 line fallback 한계가 있다.
3. 코멘트 relocation(AST/semantic)은 미지원이다.

## 2. 범위 밖으로 남긴 항목

1. deleted-only Git line marker(red)
2. auto-save / auto-format / LSP / minimap / multi-cursor 커스텀
3. rename 시 코멘트 경로 자동 마이그레이션
4. staged/unstaged 세분화된 git file status
5. general code file -> semantic spec section linking
6. navigation highlight duration/user setting
7. `true dark`, `system` follow, OS accent color 연동
8. VS Code theme marketplace 호환 / 외부 theme import
9. compact header fallback theme button / settings-tray 기반 theme control

## 3. 운영 리스크

1. 큰 저장소에서는 lazy indexing / polling 정책 조합을 잘못 건드리면 체감 성능이 바로 흔들린다.
2. source mapping 규칙을 바꿀 때 exact offset 경로와 fallback 경로 둘 다 회귀될 수 있다.
3. remote protocol을 바꾸면 preload type, renderer helper, spec contract가 쉽게 드리프트한다.
4. 테마 토큰을 넓게 수정할 때 CM6/Shiki/state color 대비가 동시에 깨질 수 있다.

## 4. Post-split stabilization workstreams

`_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`는 실행용 상세 백로그로 유지하고, 여기에는 모놀리스 분할 이후에도 남아 있는 지속적 수정 축만 얇게 기록한다.

구조 정리와 안정화는 비교적 안전하게 분리 가능한 계층부터 순차적으로 진행한다. 이미 구현되어 검증이 끝난 축은 backlog에서 완료 상태로 내리고, 남은 묶음만 `🚧 Planned`로 유지한다.

1. Done: SSH / remote-agent 공통 유틸 통합과 bootstrap / browse / transport hardening을 구현했다. shared `ssh-utils.ts`를 canonical helper boundary로 도입했고, 관련 review-fix와 `npm test`, `npm run lint`를 통과했다. 단, `system-open.ts`의 유사 SSH option hardening은 별도 후속 작업으로 남긴다.
2. Partial: Electron main / workspace backend 구조 정리는 4대 모놀리스 분할과 routed handler factory 도입까지 진행되었다. 다만 경로 검증 보일러플레이트 공통화처럼 남은 backend surface 정리는 `🚧 Planned`로 유지한다.
3. 🚧 Planned: `workspace-context`의 비동기 로딩, watch subscription, snapshot hydration 경로를 재정리해 레이스와 fire-and-forget 상태 전이를 줄인다.
4. 🚧 Planned: file tree / clipboard / comment persistence 경계에서 남아 있는 교차 워크스페이스, NaN 입력, 검색 실패 표현 같은 안전성 문제를 보강한다.
5. 🚧 Planned: spec viewer / code editor / comment UI의 후속 분리와 리소스 정리를 진행하되, 이 단계는 사용자 체감 안정성과 테스트 보강을 함께 묶어서 수행한다.
