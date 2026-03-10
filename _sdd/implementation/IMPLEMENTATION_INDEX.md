# Implementation Index

Feature별 구현 산출물 아카이브 인덱스.

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
