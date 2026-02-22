## Rewrite Summary

- Target document: `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md`
- Execution timestamp: `2026-02-22`
- Rewrite strategy: `Section Update + Split`
- Key changes:
  - `main.md`를 인덱스/요약 허브로 축소
  - 상세 내용을 주제별 하위 문서 6개로 분리
  - 대형 단일 문서에서 반복되던 설명/체크리스트를 appendix 중심으로 정리
  - F11/F11.1 관련 중복 서술(인벤토리/큐/수용기준/결론)을 문맥별로 재배치

## What Was Pruned or Moved

- `main.md`에서 이동:
  - 목표/범위 상세 -> `01-overview.md`
  - 아키텍처/플로우 상세 -> `02-architecture.md`
  - 컴포넌트 책임 상세 -> `03-components.md`
  - 상태/링크/IPC 계약 상세 -> `04-interfaces.md`
  - 성능/보안/신뢰성/테스트 운영 상세 -> `05-operational-guides.md`
  - 기능 이력/리스크 목록 -> `appendix.md`
- 정리 항목:
  - 인덱스 파일 내 대형 표 중심 기술 제거
  - 동일 정책의 중복 표현(특히 F11/F11.1) 최소화

## File Split Map

- 인덱스:
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md`
- 신규 하위 문서:
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/01-overview.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/02-architecture.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/03-components.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/04-interfaces.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/05-operational-guides.md`
  - `/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/appendix.md`

## Ambiguities and Issues

- [P1] [Ambiguous Requirement] rendered markdown marker의 nearest fallback 시각화가 사용자 기대 라인과 다를 수 있음.
  - Suggested resolution: marker tooltip/legend와 함께 exact/fallback 구분 표시 검토.
- [P1] [Missing Acceptance Criteria] incremental export reset/re-export-all UX 기준이 부재.
  - Suggested resolution: F12+에서 reset 정책(수동/자동)과 감사 로그 기준을 draft로 명시.
- [P2] [Undefined Ownership] 스펙 분할 이후 문서 오너(overview/architecture/interfaces) 관리 규칙이 명시되지 않음.
  - Suggested resolution: 문서별 owner 또는 update responsibility를 별도 운영 가이드로 추가.
- [P2] [Outdated Claim Risk] Appendix 기반 이력은 지속 증가하므로 주기적 압축 없으면 다시 비대화 가능.
  - Suggested resolution: 분기 단위 archive 섹션 이동 또는 릴리스 스냅샷 파일 분리.

## Decision Log Additions

- Entry title: `2026-02-22 - 스펙 구조 리라이트(인덱스 + 하위 문서 분할)`
- Why this was recorded:
  - 단일 1300+ 라인 문서의 탐색/유지보수 비용을 낮추고, 향후 `spec-update-done` 변경 범위를 국소화하기 위해 구조 분할을 고정함.
