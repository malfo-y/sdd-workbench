# Implementation Index

Feature별 구현 산출물 아카이브 인덱스.

---

## spec_review_sync_20260313

**Description**: strict spec review 후 whitepaper summary / quality gate / validation baseline 문구를 동기화한 문서 유지보수 sync

| synced_at (UTC) | destination | source |
|---|---|---|
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_PLAN.md` | `IMPLEMENTATION_PLAN.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_PLAN_PHASE_1.md` | `IMPLEMENTATION_PLAN_PHASE_1.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_PLAN_PHASE_2.md` | `IMPLEMENTATION_PLAN_PHASE_2.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_PLAN_PHASE_3.md` | `IMPLEMENTATION_PLAN_PHASE_3.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_PLAN_PHASE_4.md` | `IMPLEMENTATION_PLAN_PHASE_4.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_PROGRESS.md` | `IMPLEMENTATION_PROGRESS.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_REVIEW.md` | `IMPLEMENTATION_REVIEW.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_REPORT.md` | `IMPLEMENTATION_REPORT.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_REPORT_PHASE_1.md` | `IMPLEMENTATION_REPORT_PHASE_1.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_REPORT_PHASE_2.md` | `IMPLEMENTATION_REPORT_PHASE_2.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_REPORT_PHASE_3.md` | `IMPLEMENTATION_REPORT_PHASE_3.md` |
| 2026-03-13 12:17:39 | `features/spec_review_sync_20260313/SYNC_20260313_121739_IMPLEMENTATION_REPORT_PHASE_4.md` | `IMPLEMENTATION_REPORT_PHASE_4.md` |

**Notes**: `summary.md` / `operations.md` / `main.md` / `decision-log.md` sync. Quality gate는 `2026-03-02 / Node 20.x` 를 last known good로 유지하고, `2026-03-13 / Node 25.2.1` review run은 unresolved note로 기록.

---

## F39_remote_ssh_external_open

**Description**: 원격 워크스페이스용 SSH 외부 도구 열기 (iTerm SSH, VSCode Remote-SSH, Finder unsupported, VSCode SSH config 자동 동기화)

| synced_at (UTC) | destination | source |
|---|---|---|
| 2026-03-10 13:24:22 | `features/F39_.../SYNC_20260310_132422_IMPLEMENTATION_REVIEW.md` | `IMPLEMENTATION_REVIEW.md` |
| 2026-03-10 13:24:22 | `features/F39_.../SYNC_20260310_132422_feature_draft_f39.md` | `_sdd/drafts/feature_draft_f39_remote_external_open_over_ssh.md` |

**Notes**: 6개 Task(R1~R6) 전체 완료 + VSCode SSH config sync 보너스 기능. 134 tests passing.

---

## f40_file_clipboard_copy_paste

**Description**: 파일 클립보드 Copy/Paste — 내부 클립보드 + macOS Finder 클립보드, 이름 충돌 자동 넘버링, local/remote 라우팅

| synced_at (UTC) | destination | source |
|---|---|---|
| 2026-03-10 16:09:09 | `features/f40/SYNC_20260310_160909_IMPLEMENTATION_REVIEW.md` | `IMPLEMENTATION_REVIEW.md` |

**Notes**: Phase 1(T1~T7) + Phase 2(T8~T10) 전체 완료. 43/45 AC 충족(96%). 686 tests passing, lint clean.
