## Rewrite Summary

- Target document:
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/`
- Execution timestamp:
  - `2026-03-08`
- Key changes:
  - `main.md`를 더 얇은 허브 문서로 축소
  - `03-components.md`, `04-interfaces.md`, `appendix.md`를 링크 허브로 전환
  - `FEATURE_INDEX.md`, `CODE_MAP.md`를 새로 추가
  - `03-domains/*`, `04-contracts/*`, `appendix/*` 하위 구조를 추가

## What Was Pruned or Moved

- `03-components.md`
  - 상세 파일 인벤토리 -> `CODE_MAP.md`
  - 도메인별 상세 설명 -> `03-domains/*`
- `04-interfaces.md`
  - 타입/IPC/검색/내비게이션/코멘트/theme 규칙 -> `04-contracts/*`
- `appendix.md`
  - 기능 이력 -> `appendix/feature-history.md`
  - 상세 수용 기준 -> `appendix/detailed-acceptance.md`
  - 리스크/백로그 -> `appendix/backlog-and-risks.md`
  - 용어 -> `appendix/glossary.md`

## File Split Map

- 인덱스:
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/FEATURE_INDEX.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/CODE_MAP.md`
- 도메인:
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/03-domains/workspace-and-file-tree.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/03-domains/code-editor.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/03-domains/spec-viewer.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/03-domains/comments-and-export.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/03-domains/remote-workspace.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/03-domains/appearance-and-navigation.md`
- 계약:
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/04-contracts/state-model.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/04-contracts/ipc-contracts.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/04-contracts/navigation-rules.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/04-contracts/search-rules.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/04-contracts/comment-contracts.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/04-contracts/theme-and-menu-contracts.md`
- 부록:
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/appendix/feature-history.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/appendix/detailed-acceptance.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/appendix/backlog-and-risks.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/appendix/glossary.md`

## Ambiguities and Issues

- [P1] [Undefined Ownership]
  - 새로 생긴 `FEATURE_INDEX.md`와 `CODE_MAP.md`를 누가 얼마나 자주 갱신하는지 운영 규칙은 아직 약하다.
  - Suggested resolution: `spec-update-done` 결과물에 두 문서 점검을 체크리스트로 추가한다.
- [P2] [Outdated Claim Risk]
  - `feature-history.md`는 계속 길어질 수 있다.
  - Suggested resolution: 분기별 스냅샷 또는 release cut 단위 archive를 나중에 검토한다.
- [P2] [Ambiguous Requirement]
  - CODE_MAP의 granularity가 어느 수준까지 내려가야 하는지는 아직 고정되지 않았다.
  - Suggested resolution: 당장은 도메인 단위 유지, 필요 시 hotspot 영역만 더 세분화한다.

## Decision Log Additions

- Entry title:
  - `2026-03-08 - 스펙 문서를 설명층/계약층/인덱스층/기록층으로 재분해`
- Why this was recorded:
  - 긴 허브 문서 3개(`03-components`, `04-interfaces`, `appendix`)를 직접 수정하는 비용을 낮추고, 사용자용 읽기 흐름과 구현 인덱싱 흐름을 분리하기 위해 구조를 고정했다.
