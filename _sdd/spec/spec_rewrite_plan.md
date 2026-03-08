# Spec Rewrite Plan

**Date**: 2026-03-08  
**Author**: user + Codex  
**Status**: Draft  
**Target**: `/_sdd/spec/` 전체 구조 리라이트 계획

---

## 1. 목적

이 계획서는 현재 SDD Workbench 스펙을 다음 두 목적에 더 잘 맞도록 재구성하기 위한 리라이트 계획을 정의한다.

1. 사용자가 스펙을 읽고 현재 제품 상태와 기능 범위를 빠르게 이해할 수 있어야 한다.
2. 사람이나 AI가 기능 추가/변경 시 관련 구현 파일과 계약을 빠르게 인덱싱하고 분석할 수 있어야 한다.

이 계획의 목표는 스펙 내용을 새로 쓰는 것이 아니라, **기존 내용을 역할별로 재배치하고 중복을 줄이며 탐색 구조를 명확히 만드는 것**이다.

---

## 2. 현재 진단

### 2.1 강점

- `main.md` + 하위 문서 분할 구조가 이미 존재한다.
- [01-overview.md](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/01-overview.md), [02-architecture.md](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/02-architecture.md)는 사람 읽기용 문서로 비교적 잘 작동한다.
- [DECISION_LOG.md](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/DECISION_LOG.md)가 “왜 이렇게 됐는가”를 보존하는 역할을 하고 있다.

### 2.2 문제

- [03-components.md](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/03-components.md)는 도메인 설명, 파일 인덱스, 구현 메모가 한 문서에 함께 섞여 있다.
- [04-interfaces.md](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/sdd-workbench/04-interfaces.md)는 핵심 타입, 링크 규칙, IPC, 검색, 코멘트, theme 계약이 한 파일에 몰려 있어 탐색 비용이 높다.
- 기능 단위 인덱스(`Fxx -> 관련 문서/코드/테스트`)가 별도 문서로 존재하지 않는다.
- 구현 분석용 코드 맵 문서가 없어, AI나 사람이 관련 파일을 찾을 때 `03-components.md` 전체를 훑어야 한다.
- `appendix.md`는 이력/수용 기준/리스크가 함께 있어 계속 커질 가능성이 높다.

### 2.3 리라이트 우선 대상

1. `04-interfaces.md`
2. `03-components.md`
3. `appendix.md`
4. `main.md` 슬림화
5. 기능/코드 인덱스 추가

---

## 3. 리라이트 원칙

### 3.1 문서 층 분리

- **설명층**: 사람이 제품을 이해하는 문서
- **계약층**: 구현 규칙과 불변식을 정의하는 문서
- **인덱스층**: 기능/코드 위치를 빠르게 찾는 문서
- **기록층**: 이력, 결정, 리스크를 보관하는 문서

### 3.2 한 문서, 한 질문

각 문서는 한 가지 질문에만 강하게 답해야 한다.

- `이 제품이 뭔가?` -> `main.md`, `01-overview.md`
- `시스템이 어떻게 나뉘는가?` -> `02-architecture.md`
- `이 기능은 어디에 구현되어 있는가?` -> `FEATURE_INDEX.md`, `CODE_MAP.md`
- `정확한 계약은 무엇인가?` -> `04-contracts/*`
- `왜 이런 결정을 했는가?` -> `DECISION_LOG.md`

### 3.3 호환성 우선

기존 링크와 참조를 한 번에 깨지 않기 위해 다음 원칙을 사용한다.

- `03-components.md`, `04-interfaces.md`, `appendix.md`는 삭제하지 않는다.
- 대신 각각 **얇은 인덱스 문서**로 유지하고 하위 파일 링크 허브 역할로 바꾼다.
- 기존 문서 링크를 참조하는 구현/리뷰 문서가 깨지지 않게 한다.

### 3.4 구현 인덱스 분리

기능 설명과 구현 파일 목록을 같은 문서에 섞지 않는다.

- 기능 단위 탐색은 `FEATURE_INDEX.md`
- 파일/테스트 단위 탐색은 `CODE_MAP.md`

---

## 4. 목표 구조

```text
_sdd/spec/
├── main.md
├── DECISION_LOG.md
├── FEATURE_INDEX.md
├── CODE_MAP.md
├── REWRITE_REPORT.md
├── SPEC_REVIEW_REPORT.md
├── SUMMARY.md
├── user_spec.md
├── spec_rewrite_plan.md
├── sdd-workbench/
│   ├── 01-overview.md
│   ├── 02-architecture.md
│   ├── 03-components.md
│   ├── 03-domains/
│   │   ├── workspace-and-file-tree.md
│   │   ├── code-editor.md
│   │   ├── spec-viewer.md
│   │   ├── comments-and-export.md
│   │   ├── remote-workspace.md
│   │   └── appearance-and-navigation.md
│   ├── 04-interfaces.md
│   ├── 04-contracts/
│   │   ├── state-model.md
│   │   ├── ipc-contracts.md
│   │   ├── navigation-rules.md
│   │   ├── search-rules.md
│   │   ├── comment-contracts.md
│   │   └── theme-and-menu-contracts.md
│   ├── 05-operational-guides.md
│   ├── appendix.md
│   └── appendix/
│       ├── feature-history.md
│       ├── detailed-acceptance.md
│       ├── backlog-and-risks.md
│       └── glossary.md
└── prev/
```

---

## 5. 문서별 역할

### 5.1 유지 문서

- `main.md`
  - 1페이지 요약 + 읽는 순서 + 핵심 링크
- `01-overview.md`
  - 목표, 비목표, 사용자 흐름, 현재 기능 커버리지
- `02-architecture.md`
  - Main/Preload/Renderer 경계, 상태 흐름, 주요 orchestration
- `05-operational-guides.md`
  - 테스트, 운영, 보안, 성능, 수동 스모크 기준
- `DECISION_LOG.md`
  - 구조/범위/정책의 이유

### 5.2 새 인덱스 문서

- `FEATURE_INDEX.md`
  - 기능 단위 인덱스
  - 추천 컬럼:
    - `ID`
    - `이름`
    - `상태`
    - `사용자 가치`
    - `주요 문서`
    - `핵심 코드 파일`
    - `핵심 테스트`
- `CODE_MAP.md`
  - 구현 영향 범위 인덱스
  - 추천 컬럼:
    - `도메인`
    - `핵심 파일`
    - `연관 파일`
    - `핵심 테스트`
    - `변경 시 주의점`

### 5.3 얇아질 인덱스 문서

- `03-components.md`
  - 더 이상 모든 컴포넌트를 상세히 담지 않는다.
  - `03-domains/*`의 링크 허브 + 짧은 책임 맵만 유지한다.
- `04-interfaces.md`
  - 전체 계약 요약 + `04-contracts/*` 링크 허브만 유지한다.
- `appendix.md`
  - appendix 하위 파일 소개와 링크만 유지한다.

---

## 6. 분해 계획

### 6.1 `03-components.md` -> `03-domains/*`

#### 남길 내용

- 상위 책임 맵 요약
- 도메인별 링크
- 문서 읽는 순서

#### 옮길 내용

- `workspace-and-file-tree.md`
  - `WorkspaceContext`, `FileTreePanel`, 파일 트리 검색, git status marker, CRUD
- `code-editor.md`
  - `CodeEditorPanel`, CM6 theme, gutter, line wrap, scroll restore
- `spec-viewer.md`
  - `SpecViewerPanel`, source mapping, exact offset, search, navigation highlight
- `comments-and-export.md`
  - comment domain, export flow, hover preview, modal
- `remote-workspace.md`
  - remote connect, backend, watch bridge, bootstrap/runtime
- `appearance-and-navigation.md`
  - theme, header/native menu, cross-panel navigation, history navigation

### 6.2 `04-interfaces.md` -> `04-contracts/*`

#### 남길 내용

- 계약 카테고리 개요
- 하위 계약 문서 링크
- 가장 중요한 전역 불변식 5~10개

#### 옮길 내용

- `state-model.md`
  - `ContentTab`, `AppearanceTheme`, selection, workspace state 핵심 규칙
- `ipc-contracts.md`
  - `workspace:*`, `system:*`, `appearance-theme:*` 채널 계약
- `navigation-rules.md`
  - line/offset/navigation highlight 규칙
- `search-rules.md`
  - 파일 검색, 스펙 검색, wildcard, result cap, fallback
- `comment-contracts.md`
  - comment anchor, export, persistence, global comments 규칙
- `theme-and-menu-contracts.md`
  - theme source of truth, pre-paint bootstrap, native menu sync, storage fallback

### 6.3 `appendix.md` -> `appendix/*`

#### 남길 내용

- appendix 안내 인덱스

#### 옮길 내용

- `feature-history.md`
  - `F01~Fxx` 이력표
- `detailed-acceptance.md`
  - 긴 수용 기준
- `backlog-and-risks.md`
  - known issues, 제외 범위, 후속 backlog
- `glossary.md`
  - 반복되는 용어 정의

---

## 7. 메인 문서 설계

### 7.1 `main.md` 목표 길이

- 이상적 길이: 80~140줄
- 포함 내용:
  - 버전
  - 현재 상태 요약
  - 최근 동기화 범위
  - 읽는 순서
  - 핵심 결정 링크
  - Open Questions 요약

### 7.2 `main.md`에서 빼야 할 것

- 긴 기능 목록 상세 설명
- 세부 수용 기준
- 긴 feature history 표
- 구현 파일 나열
- 긴 계약 표

이 내용은 각각 `FEATURE_INDEX.md`, `CODE_MAP.md`, `04-contracts/*`, `appendix/*`로 이동한다.

---

## 8. 새 문서 템플릿

### 8.1 도메인 문서 템플릿

```md
# [도메인명]

## 1. 목적
## 2. 사용자 가시 동작
## 3. 핵심 상태와 source of truth
## 4. 주요 UI/행동 규칙
## 5. 핵심 구현 파일
## 6. 핵심 테스트
## 7. 변경 시 주의점
## 8. 관련 기능
```

### 8.2 계약 문서 템플릿

```md
# [계약명]

## 1. 목적
## 2. 타입 / 입력 / 출력
## 3. 핵심 불변식
## 4. fallback / error handling
## 5. source of truth
## 6. 관련 구현 파일
## 7. 관련 테스트
```

### 8.3 `FEATURE_INDEX.md` 템플릿

```md
# Feature Index

| ID | 이름 | 상태 | 사용자 가치 | 주요 문서 | 핵심 코드 | 핵심 테스트 |
|---|---|---|---|---|---|---|
```

### 8.4 `CODE_MAP.md` 템플릿

```md
# Code Map

| 도메인 | 핵심 파일 | 연관 파일 | 핵심 테스트 | 변경 시 주의점 |
|---|---|---|---|---|
```

---

## 9. 실행 단계

### Phase 0: 안전 준비

- 기존 문서 backup
- 링크 사용처 점검
- `REWRITE_REPORT.md`에 리라이트 대상과 이유 기록

### Phase 1: 인덱스층 추가

- `FEATURE_INDEX.md` 생성
- `CODE_MAP.md` 생성
- 기존 문서는 그대로 둔다

### Phase 2: 계약층 분해

- `04-contracts/` 생성
- `04-interfaces.md` 내용을 하위 계약 문서로 이동
- `04-interfaces.md`는 인덱스형 허브로 축소

### Phase 3: 도메인층 분해

- `03-domains/` 생성
- `03-components.md` 내용을 도메인별로 이동
- `03-components.md`는 인덱스형 허브로 축소

### Phase 4: 기록층 분해

- `appendix/` 생성
- `appendix.md` 내용을 `feature-history`, `detailed-acceptance`, `backlog-and-risks`로 이동
- `appendix.md`는 링크 허브로 축소

### Phase 5: 메인 슬림화

- `main.md`에서 상세 설명 제거
- 요약/읽는 순서/핵심 링크만 남김

### Phase 6: 링크/용어 정리

- 상대 링크 점검
- 문서 제목/용어 일관성 정리
- 반복 문구 제거

---

## 10. 우선순위 제안

가장 효과가 큰 순서는 아래와 같다.

1. `FEATURE_INDEX.md`
2. `CODE_MAP.md`
3. `04-contracts/*`
4. `03-domains/*`
5. `appendix/*`
6. `main.md` 슬림화

이 순서가 좋은 이유:

- AI/사람의 구현 탐색 효율은 `FEATURE_INDEX`와 `CODE_MAP` 추가만으로 즉시 좋아진다.
- 가장 큰 문서 병목은 `04-interfaces.md`이므로, 계약층 분해 효과가 가장 크다.
- `03-components.md` 분해는 그다음 단계에서 도메인 설명 가독성을 개선한다.

---

## 11. 수용 기준

- 사용자는 `main.md`와 `01-overview.md`만 읽고 현재 제품 상태를 이해할 수 있다.
- 사람이나 AI는 `FEATURE_INDEX.md`에서 특정 기능(F38 등)을 찾고, 관련 문서/코드/테스트로 바로 이동할 수 있다.
- 사람이나 AI는 `CODE_MAP.md`에서 특정 도메인(예: spec-viewer, appearance)의 핵심 구현 파일과 테스트를 바로 찾을 수 있다.
- `03-components.md`, `04-interfaces.md`, `appendix.md`는 더 이상 “모든 것” 문서가 아니고, 허브 역할만 수행한다.
- 기존 중요한 rationale은 삭제되지 않고 `DECISION_LOG.md`에 유지된다.
- 상대 링크와 파일 경로가 깨지지 않는다.

---

## 12. 리스크와 대응

### Risk 1: 링크 대량 변경으로 탐색성이 오히려 나빠질 수 있음

- 대응:
  - 기존 파일명을 유지하고 index 문서로 축소
  - 한 번에 삭제하지 않음

### Risk 2: 문서를 잘게 나누면 사람이 “어디부터 읽어야 할지” 더 헷갈릴 수 있음

- 대응:
  - `main.md`에 읽는 순서 고정
  - 각 인덱스 문서 상단에 “이 문서는 무엇을 위한 문서인가” 명시

### Risk 3: 기능 설명과 구현 인덱스가 다시 섞일 수 있음

- 대응:
  - `FEATURE_INDEX.md`와 `CODE_MAP.md`를 canonical 인덱스로 고정
  - 도메인/계약 문서에는 긴 파일 나열을 최소화

### Risk 4: appendix 분해 후 feature history와 acceptance가 분산될 수 있음

- 대응:
  - `appendix.md`를 허브로 유지
  - 한 곳에서만 canonical 기록을 관리

---

## 13. Open Questions

현재 기준 Open Question 없음. 아래 방향을 기본값으로 고정한다.

- 기존 파일명은 가능한 유지한다.
- `03-components.md`, `04-interfaces.md`, `appendix.md`는 삭제하지 않고 허브 문서로 남긴다.
- 새 인덱스 문서 `FEATURE_INDEX.md`, `CODE_MAP.md`를 최우선으로 추가한다.
- 구조 리라이트는 단계적으로 진행한다.

---

## 14. 다음 액션 제안

다음 실제 작업 순서는 아래가 적절하다.

1. `spec-rewrite`로 backup + `FEATURE_INDEX.md`, `CODE_MAP.md` 먼저 추가
2. `04-interfaces.md`를 `04-contracts/*`로 분해
3. `03-components.md`를 `03-domains/*`로 분해
4. `appendix.md`를 `appendix/*`로 분해
5. 마지막에 `main.md`를 얇게 정리

이 계획은 현재 스펙의 의미를 바꾸지 않고, **읽기 효율과 구현 인덱싱 효율을 동시에 높이기 위한 구조 리라이트 기준 문서**로 사용한다.
