# SDD Workbench 스펙 인덱스 (MVP Baseline)

## 메타데이터

- 문서 버전: `0.30.0`
- 마지막 업데이트: `2026-02-23`
- 문서 상태: `Draft`
- 기준 입력:
  - 사용자 요구사항: `/_sdd/spec/user_spec.md`
  - UI 스케치: `/_sdd/spec/ui_sketch.png`
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
- 리라이트:
  - 단일 대형 문서(`main.md`)를 인덱스 + 주제별 하위 문서로 분할
  - 결정 로그는 `/_sdd/spec/DECISION_LOG.md`를 source of truth로 유지

---

## 1. 현재 상태 요약

- 구현 완료 범위: `F01~F18`
- 핵심 사용자 가치:
  1. 멀티 워크스페이스 + 3패널(code/raw spec/rendered spec) 탐색
  2. spec link/selection 기반 code line jump
  3. 컨텍스트 복사 + Open In(iTerm/VSCode)
  4. file watcher 기반 변경 감지 + collapse 버블링 marker 가시화 + history navigation
  5. inline comment + comment 관리(View/Edit/Delete/Delete Exported) + LLM export bundle
  6. global comments(워크스페이스 단위) + export 선행 prepend + incremental export + global 포함 체크박스 선택
  7. code/rendered marker hover preview로 코멘트 본문 맥락 즉시 확인
  8. spec->code 점프 시 rendered spec 문맥(스크롤 위치) 유지 + comment 피드백 auto-dismiss + header action 그룹 명확화
  9. SSHFS 마운트 원격 워크스페이스 자동 polling + 수동 watch mode override
  10. 대규모 워크스페이스 지원: remote 깊이제한 + 디렉토리별 child cap + on-demand 확장 + 과대 디렉토리 polling 제외
- 최신 품질 게이트(2026-02-23):
  - `npm test` -> `21 files, 241 passed`
  - `npm run lint` -> pass
  - `npm run build` -> pass

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
  - 기능 이력(F01~F18), 상세 수용 기준, 리스크/백로그

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

- 현재 없음 (`2026-02-23` 기준)

---

## 6. 결론

이 인덱스 문서는 스펙 탐색성과 유지보수성을 높이기 위한 허브다. 상세 설계/계약/운영 기준은 하위 문서에서 관리하고, 기능 확장 시 해당 주제 문서만 국소 수정하는 것을 기본 전략으로 한다.
