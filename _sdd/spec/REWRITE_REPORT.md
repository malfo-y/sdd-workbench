# Spec Rewrite Report

## Latest Rewrite Run

- **Target**: `_sdd/spec/summary.md` 중심 supporting-doc cleanup
- **Execution timestamp**: 2026-03-13 23:24:56 +09:00
- **Mode**: Conservative
- **Canonical spec impact**: `main.md` 본문/구조는 유지
- **Why now**: `summary.md`가 `main.md` whitepaper와 supporting docs의 설명을 다시 길게 복제해 “두 번째 메인 문서”처럼 커지고 있었음

## What Was Pruned or Moved

| 대상 | 처리 | 이유 |
|------|------|------|
| `summary.md`의 기능별 상세 설명 | 제거 후 canonical 문서 링크로 대체 | 상세 설계는 `main.md`와 component docs가 이미 담당 |
| `summary.md`의 장문 status dashboard / roadmap | `Current Snapshot`, `Active Risks`, `Likely Next Actions`로 압축 | 요약 문서를 빠르게 스캔 가능한 형태로 유지 |
| `summary.md`의 중복 architecture/component 표 | 한 화면 아키텍처 설명 + supporting doc 링크로 축소 | supporting docs를 다시 복제하지 않기 위함 |
| 파일 분할/디렉토리 구조 | 변경 없음 | 현재 구조가 이미 대규모 spec 기준에 부합 |

## File Split Map

현재 파일 계층은 유지한다. 이번 rewrite는 역할 정리 중심이며 추가 split은 수행하지 않았다.

```text
_sdd/spec/
├── main.md                              # canonical whitepaper (§1~§8 + Appendix)
├── summary.md                           # lightweight entry snapshot
├── operations.md                        # validation / reliability baseline
├── code-map.md                          # code/test navigation index
├── feature-index.md                     # feature-id navigation index
├── <component>/overview.md              # domain overview
├── <component>/contracts.md             # contracts / invariants
├── appendix/                            # backlog / acceptance / glossary / history
├── decision-log.md                      # why / structure / policy history
├── SPEC_REVIEW_REPORT.md                # strict review findings
├── REWRITE_REPORT.md                    # rewrite history
└── prev/                                # safety backups
```

## Ambiguities and Issues

- **[Medium] Supporting-doc role drift**: `summary.md`는 다시 쉽게 커질 수 있다. 앞으로도 snapshot 범위를 벗어나면 `main.md`와의 중복이 재발할 가능성이 높다.
- **[Low] Manual index freshness**: `code-map.md`와 `feature-index.md`는 수동 관리 성격이 남아 있어, 구현 완료 후 sync가 늦으면 stale index가 될 수 있다.
- **[Low] Decision log growth**: `decision-log.md` active section이 계속 늘어나면 다시 진입 장벽이 올라갈 수 있다.

## Recommended Resolutions

1. `summary.md`를 “무엇을 먼저 읽을지 알려주는 문서”로만 유지하고, 기능 상세/긴 표/대시보드는 `main.md` 또는 component docs로 보낸다.
2. `spec-review`와 `spec-update-done` 시 `code-map.md` / `feature-index.md`를 함께 점검하는 운영 규칙을 유지한다.
3. active policy entries가 다시 과도하게 누적되면 `decision-log.md`의 상단에는 최근 정책만 두고, 오래된 구조 정리 맥락은 별도 archive snapshot으로 내리는 방안을 검토한다.

## Decision Log Additions

- `2026-03-13 - summary.md를 lightweight entry snapshot으로 재구성`

## Prior Major Rewrite (2026-03-12)

- `_sdd/spec/`을 component directory 기반 구조로 재편했다.
- `domains/*.md` + `contracts/*.md`를 `<component>/overview.md` + `<component>/contracts.md`로 통합했다.
- `product-overview.md`, `system-architecture.md`, `component-map.md`, `contract-map.md`의 핵심 내용을 `main.md` 중심 구조로 정리했다.
- `ipc-contracts.md`는 workspace와 remote 책임에 맞춰 분할했다.
- `decision-log.md`는 구현 완료 요약 테이블 + active policy 전문 유지 구조로 압축했다.

### Prior Structural Map

```text
_sdd/spec/
├── main.md
├── code-map.md
├── feature-index.md
├── operations.md
├── code-editor/
├── spec-viewer/
├── workspace-and-file-tree/
├── comments-and-export/
├── appearance-and-navigation/
├── remote-workspace/
├── appendix/
├── decision-log.md
├── summary.md
├── prev/
└── REWRITE_REPORT.md
```
