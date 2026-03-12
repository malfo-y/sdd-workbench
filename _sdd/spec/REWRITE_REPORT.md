# Spec Rewrite Report

## Rewrite Summary
- **Target**: `_sdd/spec/` 전체 구조
- **Execution timestamp**: 2026-03-12
- **근거**: `_sdd/discussion/discussion_spec_restructure.md` (4라운드 구조화된 토론)
- **Key changes**:
  - `sdd-workbench/` 중간 디렉토리를 제거하고 컴포넌트 디렉토리 구조로 전환
  - `domains/*.md` + `contracts/*.md` → `<component>/overview.md` + `<component>/contracts.md`
  - `product-overview.md` + `system-architecture.md` + `component-map.md` + `contract-map.md` → `main.md`에 선별 통합
  - `ipc-contracts.md`를 workspace-and-file-tree/contracts.md와 remote-workspace/contracts.md로 분할
  - `navigation-rules.md` + `search-rules.md` → `spec-viewer/contracts.md`로 병합
  - `decision-log.md` 압축 (구현완료 엔트리 요약 테이블화)

## What Was Pruned or Moved

| 원본 | 처리 |
|------|------|
| `sdd-workbench/product-overview.md` (190줄) | main.md Goal/Scope 섹션으로 통합 |
| `sdd-workbench/system-architecture.md` (163줄) | main.md Architecture 섹션으로 통합 |
| `sdd-workbench/component-map.md` (45줄) | main.md Component Index로 통합 |
| `sdd-workbench/contract-map.md` (44줄) | main.md Contract Index로 통합 |
| `sdd-workbench/domains/code-editor.md` | `code-editor/overview.md` |
| `sdd-workbench/domains/spec-viewer.md` | `spec-viewer/overview.md` |
| `sdd-workbench/domains/workspace-and-file-tree.md` | `workspace-and-file-tree/overview.md` |
| `sdd-workbench/domains/comments-and-export.md` | `comments-and-export/overview.md` |
| `sdd-workbench/domains/appearance-and-navigation.md` | `appearance-and-navigation/overview.md` |
| `sdd-workbench/domains/remote-workspace.md` | `remote-workspace/overview.md` |
| `sdd-workbench/contracts/state-model.md` | `code-editor/contracts.md` |
| `sdd-workbench/contracts/navigation-rules.md` | `spec-viewer/contracts.md` (Part 1) |
| `sdd-workbench/contracts/search-rules.md` | `spec-viewer/contracts.md` (Part 2) |
| `sdd-workbench/contracts/comment-contracts.md` | `comments-and-export/contracts.md` |
| `sdd-workbench/contracts/theme-and-menu-contracts.md` | `appearance-and-navigation/contracts.md` |
| `sdd-workbench/contracts/ipc-contracts.md` (167줄) | workspace-and-file-tree/contracts.md + remote-workspace/contracts.md로 분할 |
| `sdd-workbench/code-map.md` | `code-map.md` (루트로 이동) |
| `sdd-workbench/feature-index.md` | `feature-index.md` (루트로 이동, 링크 갱신) |
| `sdd-workbench/operations-and-validation.md` | `operations.md` (루트로 이동) |
| `sdd-workbench/appendix/*` | `appendix/*` (루트로 이동) |
| `decision-log.md` (1170줄) | 압축: 구현완료 엔트리 요약 테이블 + 정책 결정 전문 유지 |

## File Split Map

```
_sdd/spec/
├── main.md                              # 인덱스 (~200줄, 통합본)
├── code-map.md                          # 파일/테스트 인벤토리
├── feature-index.md                     # 기능 ID 기준 진입점
├── operations.md                        # 성능/보안/신뢰성/테스트 기준
├── code-editor/
│   ├── overview.md                      # CM6 에디터 도메인
│   └── contracts.md                     # State Model (핵심 타입/불변식)
├── spec-viewer/
│   ├── overview.md                      # Spec Viewer 도메인
│   └── contracts.md                     # Navigation Rules + Search Rules
├── workspace-and-file-tree/
│   ├── overview.md                      # 워크스페이스/트리 도메인
│   └── contracts.md                     # IPC Contracts (workspace core)
├── comments-and-export/
│   ├── overview.md                      # 코멘트/내보내기 도메인
│   └── contracts.md                     # Comment Contracts
├── appearance-and-navigation/
│   ├── overview.md                      # App shell/탭/테마 도메인
│   └── contracts.md                     # Theme & Menu Contracts
├── remote-workspace/
│   ├── overview.md                      # 원격 워크스페이스 도메인
│   └── contracts.md                     # IPC Contracts (remote)
├── appendix/
│   ├── backlog-and-risks.md
│   ├── detailed-acceptance.md
│   ├── feature-history.md
│   └── glossary.md
├── decision-log.md                      # 압축본
├── summary.md
├── prev/                                # 백업
└── REWRITE_REPORT.md
```

## Ambiguities and Issues

- **[Low] IPC 분할 경계**: `appearance-theme:*` 채널은 remote-workspace/contracts.md에 배치했으나 appearance-and-navigation에도 관련성이 있다. 현재는 theme-and-menu-contracts.md에서 상세 규칙을 다루므로 큰 문제 없음.
- **[Low] 외부 참조 깨짐**: `_sdd/drafts/`(42개)와 `_sdd/implementation/`(69개) 문서에서 `sdd-workbench/domains/` 등 기존 경로를 참조하는 링크가 깨지지만, 완료된 이력 문서라 실해 없음 (토론에서 "무시" 결정).

## Decision Log Additions

- 이번 restructure 결정의 근거는 `_sdd/discussion/discussion_spec_restructure.md`에 보존됨.
