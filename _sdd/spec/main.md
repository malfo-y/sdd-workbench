# SDD Workbench 스펙 인덱스

## 메타데이터

- 문서 버전: `0.51.1`
- 마지막 업데이트: `2026-03-08`
- 문서 상태: `Draft`
- 목적:
  - 사용자가 현재 제품 범위를 빠르게 이해한다.
  - 사람이나 AI가 기능 변경 시 관련 문서/코드/테스트를 빠르게 인덱싱한다.

## 1. 현재 상태 요약

- 현재 기능 기준선은 `F01~F38` 구현 완료 상태다.
- 원격 경로는 현재 `F27` Remote Agent Protocol이 기준이고, `F15` SSHFS 경로는 이력으로만 남긴다.
- appearance mode는 `dark-gray`, `light` 두 가지를 지원한다.
- code/spec 왕복 navigation, spec search, 파일 검색, comment/export, git marker가 모두 구현되어 있다.
- 이 문서는 허브 역할만 맡고, 세부 설명은 도메인/계약/인덱스/부록 문서로 나눈다.

## 2. 권장 읽는 순서

### 사용자 관점

1. [01-overview](./sdd-workbench/01-overview.md)
2. [02-architecture](./sdd-workbench/02-architecture.md)
3. [03-components](./sdd-workbench/03-components.md)

### 구현 관점

1. [FEATURE_INDEX](./sdd-workbench/FEATURE_INDEX.md)
2. [CODE_MAP](./sdd-workbench/CODE_MAP.md)
3. [04-interfaces](./sdd-workbench/04-interfaces.md)

### 운영 / 이력

1. [05-operational-guides](./sdd-workbench/05-operational-guides.md)
2. [appendix](./sdd-workbench/appendix.md)
3. [DECISION_LOG](./DECISION_LOG.md)

## 3. 문서 구조

### 설명층

- [01-overview](./sdd-workbench/01-overview.md)
  - 목표, 비목표, 주요 사용자 흐름
- [02-architecture](./sdd-workbench/02-architecture.md)
  - Main / Preload / Renderer 경계와 데이터 흐름
- [03-components](./sdd-workbench/03-components.md)
  - 도메인별 책임 허브

### 계약층

- [04-interfaces](./sdd-workbench/04-interfaces.md)
  - 전역 불변식과 계약 허브

### 인덱스층

- [FEATURE_INDEX](./sdd-workbench/FEATURE_INDEX.md)
  - `Fxx` 기준 기능 인덱스
- [CODE_MAP](./sdd-workbench/CODE_MAP.md)
  - 파일/테스트 영향 범위 인덱스

### 기록층

- [appendix](./sdd-workbench/appendix.md)
  - 이력, 상세 수용 기준, 리스크, 용어집
- [DECISION_LOG](./DECISION_LOG.md)
  - 구조/범위/정책 결정의 이유
- [REWRITE_REPORT](./REWRITE_REPORT.md)
  - 이번 스펙 리라이트 작업 기록

## 4. 빠른 진입 링크

- 요구사항 원문: [user_spec](./user_spec.md)
- 리라이트 계획: [spec_rewrite_plan](./spec_rewrite_plan.md)
- 스펙 리뷰 리포트: [SPEC_REVIEW_REPORT](./SPEC_REVIEW_REPORT.md)
- 요약 문서: [SUMMARY](./SUMMARY.md)

## 5. Open Questions

현재 기준 Open Question 없음.

## 6. 유지보수 원칙

1. 기능 설명과 구현 인덱스를 한 문서에 섞지 않는다.
2. `Fxx` 기준 기능 검색은 `FEATURE_INDEX.md`를 canonical entry로 삼는다.
3. 코드 영향 범위 탐색은 `CODE_MAP.md`를 먼저 갱신한다.
4. 상세 규칙은 hub 문서가 아니라 하위 domain/contract 파일에 추가한다.
