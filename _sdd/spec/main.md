# SDD Workbench 스펙 인덱스 (MVP Baseline)

## 메타데이터

- 문서 버전: `0.46.0`
- 마지막 업데이트: `2026-03-06`
- 문서 상태: `Draft`
- 기준 입력:
  - 사용자 요구사항: `/_sdd/spec/user_spec.md`
  - F11 draft: `/_sdd/drafts/feature_draft_f11_inline_code_comments_and_llm_export_bundle.md`
  - F11.1 draft: `/_sdd/drafts/feature_draft_f11_1_markdown_comment_entry_and_comment_markers.md`
  - F11.2 draft: `/_sdd/drafts/feature_draft_f11_2_spec_jump_scroll_retention_and_collapsed_marker_bubbling.md`
  - F12.1 draft: `/_sdd/drafts/feature_draft_f12_1_comment_badge_hover_popover.md`
  - F12.2 draft: `/_sdd/drafts/feature_draft_f12_2_view_comments_edit_delete.md`
  - F12.3 draft: `/_sdd/drafts/feature_draft_f12_3_global_comments_capture_and_export_order.md`
  - F12.4 draft: `/_sdd/drafts/feature_draft_f12_4_header_action_layout_reorder.md`
  - F12.5 draft: `/_sdd/drafts/feature_draft_f12_5_comment_feedback_autodismiss_and_action_group_clarity.md`
  - F15 draft: `/_sdd/drafts/feature_draft_f15_remote_workspace_via_sshfs.md`
  - F18 draft: `/_sdd/drafts/feature_draft_f18_shiki_syntax_highlighting.md`
  - F19 draft: `/_sdd/drafts/feature_draft_f19_git_diff_line_markers_added_modified_mvp.md`
  - F20 draft: `/_sdd/drafts/feature_draft_f20_export_bugfix_and_comment_jump.md`
  - F21 draft: `/_sdd/drafts/feature_draft_f21_code_viewer_text_search.md`
  - F22: keyboard workspace switch (Cmd+Shift+Up/Down)
  - F23 draft: `/_sdd/drafts/feature_draft_f23_two_panel_tab_layout.md`
  - F24 draft: `/_sdd/drafts/feature_draft_f24_code_editor_codemirror6.md`
  - F25 draft: `/_sdd/drafts/feature_draft_f25_file_tree_crud.md`
  - F25b draft: `/_sdd/drafts/feature_draft_f25b_file_tree_rename.md`
  - F26: git file-level status markers in file tree
  - F27 draft: `/_sdd/drafts/feature_draft_f27_remote_agent_protocol_mvp.md`
  - F28 draft: `/_sdd/drafts/feature_draft_f28_remote_root_browse_after_ssh.md`
  - F29/F30 draft: `/_sdd/drafts/feature_draft_f29_f30_file_tree_and_spec_search.md`
  - F31 draft: `/_sdd/drafts/feature_draft_f31_search_star_wildcard_support.md`
  - F24.1: code editor line wrap toggle button + default On
  - F07.2: code editor scroll position restore on history navigation
- 리라이트:
  - 단일 대형 문서(`main.md`)를 인덱스 + 주제별 하위 문서로 분할
  - 결정 로그는 `/_sdd/spec/DECISION_LOG.md`를 source of truth로 유지

---

## 1. 현재 상태 요약

- 구현 완료 범위: `F01~F31` + `F25b` + `F24.1` + `F07.2` + 버그 수정 2건(BUG-01 Go to Source 탭 전환, BUG-02 Copy Relative Path 라인 번호)
- 신규 동기화 범위: post-F31 드리프트 동기화(동일 문서 anchor in-panel 이동, lazy subtree changed marker 버블링 보강, View Comments 내 global comments inline 편집/비우기, 파일 브라우저 검색, 스펙 뷰어 검색, 검색 `*` wildcard 지원)
- 핵심 사용자 가치:
  1. 멀티 워크스페이스 + 2패널 탭 레이아웃(사이드바 + Code/Spec 탭 전환) 탐색
  2. spec link/selection 기반 code line jump + same-document anchor(`#heading`) in-panel 이동
  3. 컨텍스트 복사 + Open In(iTerm/VSCode)
  4. file watcher 기반 변경 감지 + collapse 버블링 marker 가시화 + history navigation
  5. inline comment + comment 관리(View/Edit/Delete/Delete Exported) + LLM export bundle + 코멘트 target 클릭으로 해당 코드 라인 점프
  6. global comments(워크스페이스 단위) + export 선행 prepend + export 대상 선택(pending/exported 모두 가능) + global 포함 체크박스 + View Comments 내 inline 편집/비우기 + global comments export 카운트 반영
  7. code/rendered marker hover preview로 코멘트 본문 맥락 즉시 확인
  8. spec->code 점프 시 rendered spec 문맥(스크롤 위치) 유지 + comment 피드백 auto-dismiss + header action 그룹 명확화
  9. Remote Agent Protocol 기반 원격 워크스페이스 연결: 모달 입력 + SSH bootstrap + 원격 파일/감시/git RPC + 상태/오류 표준화 + SSH browse 기반 remoteRoot 선택(F28)
  10. 대규모/원격 워크스페이스 감시 안정화: 인덱싱 cap 100,000 + 디렉토리별 child cap 500 + on-demand 확장 + local polling 과대 디렉토리 제외 + remote polling 100,000 파일 상한/심링크 추적 + lazy subtree changed marker 힌트 버블링
  11. active file 기준 Git diff 라인 마커(added/modified)로 변경 위치를 즉시 식별
  12. code viewer 텍스트 검색(Ctrl/Cmd+F): substring 매칭 + 라인 하이라이트 + 이전/다음 이동 + wrap-around
  13. 키보드 워크스페이스 전환(Cmd+Shift+Up/Down): 순서 유지 순환 전환 + wrap-around
  14. 2패널 탭 레이아웃: Code/Spec 탭 전환 + 워크스페이스 관리 사이드바 통합 + 리사이저 1개 + 파일 타입별 자동 탭 전환 + Cmd+Shift+Left/Right 탭 키보드 전환
  15. (F24) CodeMirror 6 기반 코드 에디터: read-only 뷰어 대체 → 편집 + Cmd+S 저장 + dirty 상태 관리 + CM6 gutter 확장(Git 마커, 코멘트 배지)
  16. (F25) 파일 트리 CRUD: 파일/디렉토리 생성·삭제 + 우클릭 컨텍스트 메뉴 + 인라인 이름 입력 + watcher 기반 트리 자동 갱신
  17. (F25b) 파일/디렉토리 Rename: 코멘트 보호 방식(코멘트 있는 대상 rename 차단), 인라인 입력 rename 모드, active file 경로 갱신
  18. (F26) 파일 트리 Git 파일 상태 마커: `git status --porcelain` 기반 U(Untracked/Added, 초록)/M(Modified, 주황) 뱃지 + 디렉토리 접힘 시 하위 상태 버블링
  19. (F24.1) 코드 에디터 line wrap 토글 버튼: 헤더 "Wrap On/Off" 버튼, `wrapCompartment` 기반 동적 전환, 기본 On(가로 스크롤 방지)
  20. (F07.2) 코드 에디터 히스토리 스크롤 위치 복원: Back/Forward 이동 시 이전 픽셀 스크롤 위치를 복원(런타임, `codeScrollPositionsRef`)
  21. (F29) 파일 브라우저 검색: local/remote 공통 `workspace:searchFiles` 계약 기반 파일명 검색 + partial 결과 힌트
  22. (F30) 스펙 뷰어 검색: raw markdown 기반 block search + `Cmd/Ctrl+F` hotkey gate + block highlight/navigation
  23. (F31) 검색 `*` wildcard 지원: 파일 브라우저/스펙 뷰어 공통 ordered token match + wildcard-only query empty 처리 + `(* supported)` discoverability
- 최신 품질 게이트(2026-03-06):
  - `npx tsc --noEmit` -> pass
  - `npm test` -> `54 files, 546 passed, 1 skipped`

---

## 2. 문서 맵

- [01-overview](./sdd-workbench/01-overview.md)
  - 목표/범위/비목표/주요 사용자 흐름/기능 커버리지
- [02-architecture](./sdd-workbench/02-architecture.md)
  - 런타임 경계(Main/Preload/Renderer), 상태 모델, 주요 데이터 플로우
- [03-components](./sdd-workbench/03-components.md)
  - 컴포넌트 책임 분리, 모듈별 변경 포인트
- [04-interfaces](./sdd-workbench/04-interfaces.md)
  - 상태 타입, 링크/경로 규칙, IPC 계약, 코멘트/export 규약
- [05-operational-guides](./sdd-workbench/05-operational-guides.md)
  - 성능/보안/신뢰성 기준, 테스트/스모크 가이드, 개발 환경
- [appendix](./sdd-workbench/appendix.md)
  - 기능 이력(F01~F31), 상세 수용 기준, 리스크/백로그

---

## 3. 운영 원칙

- 메인 문서(`main.md`)는 요약/탐색 허브로 유지한다.
- 구현 세부 규칙은 하위 문서에서 단일 책임으로 관리한다.
- 구현 반영은 `feature-draft -> implementation -> spec-update-done` 흐름으로 동기화한다.
- 근거성 있는 정책 변경은 `DECISION_LOG.md`에 기록한다.

---

## 4. 빠른 진입 링크

- 결정 기록: `/_sdd/spec/DECISION_LOG.md`
- 리라이트 리포트: `/_sdd/spec/REWRITE_REPORT.md`
- 스펙 리뷰 리포트: `/_sdd/spec/SPEC_REVIEW_REPORT.md`
- 사용자 요구사항 원문: `/_sdd/spec/user_spec.md`

---

## 5. Open Questions

현재 기준 Open Question 없음.

결정사항:
1. 기존 SSHFS 기반 원격 연결(F15)은 폐기하고 F27 remote-protocol 단일 경로로 전환한다.
2. 원격 agent 자동화는 MVP 수준으로 제한한다.
   범위: 연결 시 runtime 배포(덮어쓰기) -> 실행 가능 여부(`--healthcheck`) -> 프로토콜 버전 검증
   제외: 자동 업그레이드/롤백, 복수 배포 채널 관리, 고급 장애복구 오케스트레이션
3. 원격 연결 입력 UX는 모달로 시작하고, 마지막 입력값(host/user/port/remoteRoot/workspaceId/agentPath/identityFile)은 로컬 저장소에 저장해 재접속 시 재사용한다.
4. SSH 개인키 경로(`identityFile`)를 프로필에 저장할 수 있으며, 연결 시 `ssh -i <identityFile> -o IdentitiesOnly=yes`로 실행한다.

---

## 6. 결론

이 인덱스 문서는 스펙 탐색성과 유지보수성을 높이기 위한 허브다. 상세 설계/계약/운영 기준은 하위 문서에서 관리하고, 기능 확장 시 해당 주제 문서만 국소 수정하는 것을 기본 전략으로 한다.
