# Feature Draft: F03.1 Code Viewer Extension Color Coding

**Date**: 2026-02-20
**Author**: Codex
**Target Spec**: main.md
**Status**: Draft

---

# Part 1: Spec Patch Draft

> 이 패치는 스펙 문서의 해당 섹션에 copy-paste하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-20
**Author**: Codex
**Target Spec**: main.md

## New Features

### Feature: F03.1 코드 뷰어 확장자별 컬러 코딩

**Priority**: High (P1)
**Category**: Enhancement
**Target Component**: CodeViewerPanel, Syntax Highlight Utility, App Styles, Tests
**Target Section**: `/_sdd/spec/main.md` > `12.2 Priority Queue` (신규 항목 `F03.1` 추가)

**Description**:
F03에서 도입된 코드 뷰어에 확장자 기반 컬러 코딩을 적용한다. 주요 확장자(`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`, `.py`)는 언어별 하이라이팅을 제공하고, 미지원 확장자는 plain text로 안전하게 fallback한다.

**Acceptance Criteria**:

- [ ] 코드 뷰어가 파일 확장자 기준으로 하이라이팅 언어를 결정한다.
- [ ] `.py` 파일은 반드시 Python 하이라이팅으로 렌더링된다.
- [ ] 주요 확장자(`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`)에 컬러 코딩이 적용된다.
- [ ] 미지원 확장자는 plain text fallback으로 렌더링된다.
- [ ] preview unavailable(2MB 초과/바이너리) 및 라인 선택 범위 동작은 기존 F03 동작을 유지한다.
- [ ] 자동 테스트에서 `.py` 포함 매핑/렌더링/fallback 경로가 검증된다.

**Technical Notes**:

- MVP 범위는 "읽기 전용 하이라이팅"이며 에디터 교체(Monaco/CodeMirror)는 제외한다.
- 하이라이팅 엔진은 현재 구조와 충돌이 적은 경량 경로(예: Prism 계열)를 우선 검토한다.
- 라인 선택(1-based) 및 기존 상태모델을 유지하면서 렌더 계층만 확장한다.

**Dependencies**:

- F03 코드 뷰어 기본 흐름 완료

## Improvements

### Improvement: CodeViewerPanel 렌더 품질 향상

**Priority**: High (P1)
**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`
**Current State**: 라인 단위 plain text 렌더링
**Proposed**: 확장자별 syntax color coding + fallback 렌더 정책 명시
**Reason**: 코드 가독성과 탐색 효율 개선

### Improvement: 테스트 기준에 언어 매핑 검증 추가

**Priority**: Medium (P2)
**Target Section**: `/_sdd/spec/main.md` > `13. 테스트 및 수용 기준`
**Current State**: 파일 로딩/선택 범위 중심 테스트
**Proposed**: `.py` 필수 포함 언어 매핑/미지원 fallback 테스트 추가
**Reason**: 하이라이팅 회귀 방지

## Bug Reports

해당 없음 (기능 고도화)

## Component Changes

### Update Component: CodeViewerPanel

**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel`
**Change Type**: Enhancement

**Changes**:

- 파일 확장자 기반 하이라이팅 렌더 경로 추가
- plain text fallback 정책 적용
- 기존 selection range 표시/상호작용 유지

### New Component: Syntax Language/Highlight Utility

**Target Section**: `/_sdd/spec/main.md` > `6.3 CodeViewerPanel` 및 `11. 개발 환경 및 의존성`
**Change Type**: New Supporting Module

**Changes**:

- 확장자 -> 언어 ID 매핑 유틸 신규 추가
- 하이라이팅 렌더 어댑터 유틸 신규 추가
- `.py` -> Python 매핑 강제

## Configuration Changes

해당 없음

## Notes

### Scope Boundary

- 에디터 엔진 교체(Monaco/CodeMirror) 및 고급 기능은 제외
- 언어 자동 감지(content 기반)는 제외하고 확장자 기반 규칙으로 고정

### Policy

- `.py`는 반드시 주요 지원 확장자에 포함한다.

---

# Part 2: Implementation Plan

## Overview

F03.1은 기존 CodeViewerPanel의 plain text 렌더를 확장자 기반 컬러 코딩으로 확장하는 소규모 고도화다. 핵심은 `.py` 포함 주요 확장자 지원과 fallback 안정성, 그리고 F03 기존 동작(preview unavailable/selection range) 비회귀다.

## Scope

### In Scope

- 하이라이팅 의존성/유틸 도입
- 확장자 -> 언어 매핑(`.py` 필수) 구현
- CodeViewerPanel 하이라이팅 렌더 통합
- 코드 토큰 컬러 스타일 추가
- 자동 테스트(매핑/렌더/fallback/비회귀) 추가

### Out of Scope

- Monaco/CodeMirror 도입
- 파일 내용 기반 언어 추론
- 테마 전환(dark/light) 옵션화

## Components

1. **Syntax Highlight Adapter**: 확장자별 언어 매핑 + 하이라이트 결과 생성
2. **CodeViewerPanel**: 하이라이트 렌더 적용 + 기존 selection 동작 유지
3. **Styles**: 토큰 컬러 스타일 정의
4. **Tests**: `.py` 포함 매핑/렌더/fallback 회귀 방지

## Implementation Phases

### Phase 1: Highlight Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | 하이라이팅 의존성 및 기본 어댑터 유틸 도입 | P1 | - | Syntax Highlight Adapter |
| 2 | 확장자 언어 매핑 유틸 구현(`.py` 포함) | P1 | 1 | Syntax Highlight Adapter |

### Phase 2: Viewer Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3 | CodeViewerPanel에 하이라이팅 렌더 통합 | P1 | 2 | CodeViewerPanel |
| 4 | 토큰 컬러 스타일 추가 및 가독성 조정 | P2 | 3 | Styles |

### Phase 3: Validation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 5 | 단위 테스트: 언어 매핑/fallback 검증 | P1 | 2 | Tests |
| 6 | 통합 테스트: `.py` 하이라이팅 + F03 비회귀 검증 | P1 | 3,4,5 | Tests |

## Task Details

### Task 1: 하이라이팅 의존성 및 기본 어댑터 유틸 도입

**Component**: Syntax Highlight Adapter
**Priority**: P1-High
**Type**: Infrastructure

**Description**:
현재 코드 구조에 맞는 경량 하이라이팅 경로를 도입하고, 렌더러에서 호출 가능한 어댑터 유틸의 기본 골격을 추가한다.

**Acceptance Criteria**:

- [ ] 하이라이팅 런타임 의존성이 추가된다.
- [ ] 코드뷰어에서 사용할 공통 하이라이트 유틸 파일이 생성된다.
- [ ] 빌드/테스트 환경이 신규 의존성과 함께 정상 동작한다.

**Target Files**:

- [M] `package.json` -- 하이라이팅 의존성 추가
- [M] `package-lock.json` -- lockfile 동기화
- [C] `src/code-viewer/syntax-highlight.ts` -- 하이라이트 어댑터 유틸 추가

**Technical Notes**:

- 렌더 퍼포먼스를 위해 F03의 2MB preview 제한 정책을 그대로 활용한다.

**Dependencies**: -

---

### Task 2: 확장자 언어 매핑 유틸 구현(`.py` 필수)

**Component**: Syntax Highlight Adapter
**Priority**: P1-High
**Type**: Feature

**Description**:
파일 확장자에서 하이라이팅 언어를 결정하는 매핑 유틸을 구현한다. `.py`는 Python으로 고정 지원한다.

**Acceptance Criteria**:

- [ ] `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`, `.py` 매핑이 정의된다.
- [ ] `.py` 확장자는 `python`으로 매핑된다.
- [ ] 미지원 확장자는 `plaintext`(또는 동등 fallback)로 매핑된다.

**Target Files**:

- [C] `src/code-viewer/language-map.ts` -- 확장자 매핑 유틸 추가

**Technical Notes**:

- 확장자 파싱은 파일명 마지막 suffix 기준으로 처리한다.

**Dependencies**: 1

---

### Task 3: CodeViewerPanel 하이라이팅 렌더 통합

**Component**: CodeViewerPanel
**Priority**: P1-High
**Type**: Feature

**Description**:
기존 plain text 렌더 구간에 하이라이팅 렌더를 연결하되, 라인 선택/preview unavailable/error 분기 동작은 유지한다.

**Acceptance Criteria**:

- [ ] 지원 확장자 파일에서 컬러 코딩 렌더가 적용된다.
- [ ] 미지원 확장자는 plain text fallback으로 표시된다.
- [ ] `Selection: Lx-Ly` 갱신 로직이 기존과 동일하게 동작한다.
- [ ] preview unavailable/error 상태 UI는 기존 동작을 유지한다.

**Target Files**:

- [M] `src/code-viewer/code-viewer-panel.tsx` -- 하이라이팅 렌더 연결
- [M] `src/App.tsx` -- 필요 시 하이라이팅 관련 prop/metadata 전달
- [M] `src/workspace/workspace-context.tsx` -- 필요 시 active file extension 파생값 제공

**Technical Notes**:

- XSS/마크업 위험을 피하기 위해 검증된 렌더 경로를 사용한다.

**Dependencies**: 2

---

### Task 4: 토큰 컬러 스타일 추가 및 가독성 조정

**Component**: Styles
**Priority**: P2-Medium
**Type**: Feature

**Description**:
코드뷰어에 토큰별 색상 스타일을 추가해 가독성을 높인다.

**Acceptance Criteria**:

- [ ] 주요 토큰(keyword/string/comment/number/function 등)에 구분 가능한 색상이 적용된다.
- [ ] 기존 선택 하이라이트(`.code-line-row.is-selected`)와 시각적으로 충돌하지 않는다.
- [ ] 모바일 너비에서도 코드 라인이 깨지지 않는다.

**Target Files**:

- [M] `src/App.css` -- 코드 토큰 스타일 추가/조정

**Technical Notes**:

- 색상 대비를 유지하고 기존 다크 톤 UI에 맞춘다.

**Dependencies**: 3

---

### Task 5: 단위 테스트(언어 매핑/fallback)

**Component**: Tests
**Priority**: P1-High
**Type**: Test

**Description**:
언어 매핑 유틸에 대해 지원 확장자 및 fallback 규칙을 단위 테스트로 고정한다.

**Acceptance Criteria**:

- [ ] `.py -> python` 매핑 테스트가 존재한다.
- [ ] 주요 확장자 매핑 테스트가 존재한다.
- [ ] 미지원 확장자 fallback 테스트가 존재한다.

**Target Files**:

- [C] `src/code-viewer/language-map.test.ts` -- 확장자 매핑 단위 테스트
- [M] `src/code-viewer/language-map.ts` -- 테스트 가능 API 노출 정리

**Technical Notes**:

- 매핑 표를 상수로 분리하면 테스트 유지보수가 쉽다.

**Dependencies**: 2

---

### Task 6: 통합 테스트(`.py` 하이라이팅 + 비회귀)

**Component**: Tests
**Priority**: P1-High
**Type**: Test

**Description**:
코드 뷰어 통합 흐름에서 Python 하이라이팅 적용과 기존 F03 핵심 흐름 비회귀를 검증한다.

**Acceptance Criteria**:

- [ ] `.py` 파일 선택 시 Python 하이라이팅 경로 사용이 검증된다.
- [ ] 미지원 확장자에서 plain text fallback이 검증된다.
- [ ] 라인 선택 범위 표시는 기존처럼 동작한다.
- [ ] preview unavailable 관련 기존 테스트는 회귀 없이 통과한다.

**Target Files**:

- [M] `src/App.test.tsx` -- 통합 테스트 시나리오 확장
- [C] `src/code-viewer/code-viewer-panel.test.tsx` -- 코드뷰어 렌더/하이라이팅 상호작용 테스트

**Technical Notes**:

- 테스트 안정성을 위해 하이라이팅 라이브러리 내부 구현보다 public UI 계약(data-testid/텍스트)을 검증한다.

**Dependencies**: 3, 4, 5

---

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| 1 | 2 | 1 | Task 2는 Task 1 의존 (`language-map.ts` 단독 생성) |
| 2 | 2 | 1 | Task 3(`code-viewer-panel.tsx`) 선행 후 Task 4(`App.css`) 권장 |
| 3 | 2 | 2 | 가능 (`App.test.tsx` vs `code-viewer-panel.test.tsx`), 단 의미적 계약 동기화 필요 |

### Conflict Notes

- `src/code-viewer/code-viewer-panel.tsx`는 렌더/선택/상태 분기가 집중되는 파일이라 의미적 충돌 위험이 높다.
- 테스트 태스크는 파일 충돌이 적지만, 하이라이트 UI 계약 변경 시 동시에 실패할 수 있어 공통 assertion 규칙을 먼저 고정한다.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 하이라이팅 도입으로 렌더 비용 증가 | 스크롤/응답성 저하 | F03의 preview 제한(2MB) 유지, 필요 시 줄 단위 지연 렌더 검토 |
| 라이브러리 의존성 증가 | 빌드/번들 영향 | 최소 의존성 선택 + 테스트/빌드 게이트로 즉시 검증 |
| 확장자 매핑 누락 | 기대 언어 미표시 | 매핑 테이블 + 단위 테스트로 고정 (`.py` 필수) |
| 토큰 색상 대비 부족 | 가독성 저하 | 기존 테마 대비 기준으로 조정, 선택 하이라이트와 충돌 테스트 |

## Resolved Decisions

- [x] `.py`는 주요 확장자 지원 목록에 반드시 포함한다.
- [x] 미지원 확장자는 plain text fallback으로 처리한다.

## Open Questions

- 없음 (현재 요구사항 기준)

## Model Recommendation

- 구현 추천: `sonnet` (중간 난이도 UI/렌더 + 테스트 확장)
- 범위 확장(에디터 교체/다수 언어 최적화) 시 `opus` 고려

---

## Next Steps

### Apply Spec Patch (choose one)

- **Method A (automatic)**: `spec-update-todo` 실행 후 이 문서의 Part 1을 입력으로 사용
- **Method B (manual)**: Part 1 항목을 각 Target Section에 수동 반영

### Execute Implementation

- **Parallel**: `implementation` 스킬로 Part 2 실행
- **Sequential**: `implementation-sequential` 스킬로 Part 2 실행
