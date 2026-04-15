# Backlog And Risks

## 1. 현재 Known Issue / 한계

1. watcher 튜닝 여지가 남아 있다.
2. source selection mapping은 exact source offset이 있는 구조에서는 raw markdown line 복구를 우선하지만, raw HTML, 복잡한 GFM edge case, stale offset에서는 여전히 best-effort 또는 line fallback 한계가 있다.
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
2. Done: Electron main / workspace backend remediation으로 unsafe dummy IPC event 제거, local backend typing dedup, remote log visibility 보강까지 반영했다. 다만 `system-open.ts` 추가 hardening과 선택적 보일러플레이트 축소는 별도 low-risk 후속으로 남긴다.
3. Done: `workspace-context`/file tree/clipboard/comment persistence의 audit-scope still-open delta를 정리했고 관련 focused test와 repo gate를 통과했다.
4. Done: spec viewer / code editor / remote backend stabilization을 구현했고, source-line exactness 보정과 runtime errno handling 정리를 current workspace repo gate로 검증했다.
5. 🚧 Planned: 추가 low-risk cleanup(`system-open.ts` SSH option hardening, deeper structural split, semantic comment relocation)은 별도 follow-up으로 관리한다.
