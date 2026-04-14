# Backlog And Risks

## 1. 현재 Known Issue / 한계

1. active heading / TOC active 추적은 아직 없다.
2. non-line hash heading jump 정밀화는 backlog다.
3. watcher 튜닝 여지가 남아 있다.
4. 트랙패드 스와이프 파일 히스토리 내비게이션은 신뢰 가능한 UX를 확보하지 못했다.
5. source selection mapping은 raw HTML, 복잡한 GFM edge case, stale offset에서 best-effort 또는 line fallback 한계가 있다.
6. 코멘트 relocation(AST/semantic)은 미지원이다.
7. marker 상세 패널/코멘트 스레드 UI는 없다.
8. incremental export reset / re-export-all UX는 없다.
9. global comments 버전 이력 / 다중 문서 분류는 없다.
10. rendered spec scroll position 앱 재시작 복원은 아직 없다.

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

## 4. 🚧 Planned: Post-split stabilization workstreams

`_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`는 실행용 상세 백로그로 유지하고, 여기에는 모놀리스 분할 이후에도 남아 있는 지속적 수정 축만 얇게 기록한다.

🚧 Planned sequencing:
공통 유틸과 backend surface처럼 비교적 안전하게 분리 가능한 구조 정리부터 시작하고, `workspace-context` 계열 상태 전이 정리는 별도 안정화 패스로 다룬다.

1. 🚧 Planned: SSH / remote-agent 공통 유틸을 통합하고, probe/SSH 인자 처리와 연결 오류 표면을 함께 강화한다.
2. 🚧 Planned: Electron main / workspace backend의 반복 라우팅과 경로 검증 보일러플레이트를 공통화해 local/remote 경계를 더 단단하게 유지한다.
3. 🚧 Planned: `workspace-context`의 비동기 로딩, watch subscription, snapshot hydration 경로를 재정리해 레이스와 fire-and-forget 상태 전이를 줄인다.
4. 🚧 Planned: file tree / clipboard / comment persistence 경계에서 남아 있는 교차 워크스페이스, NaN 입력, 검색 실패 표현 같은 안전성 문제를 보강한다.
5. 🚧 Planned: spec viewer / code editor / comment UI의 후속 분리와 리소스 정리를 진행하되, 이 단계는 사용자 체감 안정성과 테스트 보강을 함께 묶어서 수행한다.
