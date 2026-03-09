# Feature Draft: F21 — Code Viewer 텍스트 검색

---

# Part 1: Spec Patch Draft

> 이 패치는 해당 스펙 섹션에 복사-붙여넣기하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-24
**Author**: user + Claude
**Target Spec**: `_sdd/spec/main.md` + 하위 문서

## New Features

### Feature: Code Viewer 텍스트 검색 (substring match + 라인 단위 이동)
**Priority**: Medium
**Category**: Code Viewer UX
**Target Component**: `code-viewer-panel`
**Target Section**: `_sdd/spec/sdd-workbench/component-map.md` > `1.4 Code Viewer Layer`, `_sdd/spec/sdd-workbench/contract-map.md` > 신규 섹션 or 기존 규칙 추가

**Description**:
Code Viewer 헤더 영역에 텍스트 검색 UI를 추가한다. 사용자가 검색어를 입력하면 현재 파일의 모든 라인에서 **substring 매칭**으로 검색하고, 매치가 있는 라인을 하이라이트 표시한다. 이전/다음 버튼(또는 Enter/Shift+Enter)으로 매치 라인 사이를 **라인 단위로 이동**(scrollIntoView)할 수 있다.

**Acceptance Criteria**:
- [ ] `Cmd+F`(macOS) / `Ctrl+F`(기타) 단축키로 검색 바 토글
- [ ] 검색 입력 시 현재 파일 전체 라인에서 substring 매칭 수행
- [ ] 매치가 있는 라인에 시각적 하이라이트(`.is-search-match`) 적용
- [ ] 현재 포커스된 매치 라인에 별도 강조(`.is-search-focus`) 적용
- [ ] 이전(▲) / 다음(▼) 버튼으로 매치 라인 간 이동 + `scrollIntoView({ block: 'center' })`
- [ ] `Enter` → 다음 매치, `Shift+Enter` → 이전 매치
- [ ] 현재 매치 위치 표시: `"3 / 12"` 형태
- [ ] 매치 0건일 때 `"No results"` 표시
- [ ] `Escape` 또는 닫기 버튼으로 검색 바 닫기 + 하이라이트 해제
- [ ] 파일 변경 시(activeFile 변경) 검색 상태 초기화
- [ ] 대소문자 무시(case-insensitive) 기본 동작
- [ ] 이미지 프리뷰 / preview unavailable 모드에서는 검색 바 비활성

**Technical Notes**:
- 검색 로직은 `previewLines` 배열에 대해 `line.toLowerCase().includes(query.toLowerCase())`로 수행
- 라인 점프는 기존 `lineButtonRefs.current[n].scrollIntoView({ block: 'center' })` 인프라 재사용
- 검색 상태는 `CodeViewerPanel` 내부 상태로 관리 (App 레벨 상태 불필요)
- wrap-around: 마지막 매치에서 다음 → 첫 매치로, 첫 매치에서 이전 → 마지막 매치로

**Dependencies**:
- 없음 (기존 인프라만 활용)

---

# Part 2: Implementation Plan

## Overview

Code Viewer 패널에 텍스트 검색 기능을 추가한다. 검색 바 UI + substring 매칭 로직 + 매치 라인 하이라이트 + 라인 단위 이동을 구현한다.

## Scope

### In Scope
- 검색 바 UI (입력, 이전/다음 버튼, 매치 카운트, 닫기)
- substring 매칭 (case-insensitive)
- 매치 라인 CSS 하이라이트
- 라인 단위 이동 (scrollIntoView)
- 키보드 단축키 (`Cmd/Ctrl+F`, `Enter`, `Shift+Enter`, `Escape`)

### Out of Scope
- 정규식 검색
- "Whole word" 옵션 (향후 확장 가능)
- 매치 단어 내 인라인 하이라이트 (라인 단위 하이라이트만)
- 파일 간 글로벌 검색 (현재 파일 내 검색만)
- 검색어 치환(replace)

## Components
1. **검색 바 UI**: 헤더 하단에 조건부 렌더되는 검색 입력 + 네비게이션 + 카운트
2. **검색 로직**: `previewLines` 기반 substring 매칭 → 매치 라인 번호 배열 생성
3. **라인 하이라이트**: 매치 라인에 `.is-search-match`, 현재 포커스에 `.is-search-focus` CSS 클래스
4. **키보드 핸들링**: 글로벌 `Cmd/Ctrl+F` + 검색 바 내 `Enter`/`Shift+Enter`/`Escape`

## Implementation Phases

### Phase 1: 검색 로직 + UI + 스타일

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1  | 검색 바 UI + 매칭 로직 + 라인 하이라이트 + 키보드 단축키 | P0 | - | code-viewer-panel |

## Task Details

### Task 1: 검색 바 UI + 매칭 로직 + 라인 하이라이트 + 키보드 단축키
**Component**: Code Viewer Layer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`CodeViewerPanel` 내부에 검색 기능 전체를 구현한다.

1. **상태 추가**:
   - `isSearchOpen: boolean` — 검색 바 표시 여부
   - `searchQuery: string` — 검색어
   - `searchMatchLines: number[]` — 매치된 라인 번호 배열
   - `currentMatchIndex: number` — 현재 포커스된 매치 인덱스 (0-based)

2. **검색 로직**:
   - `searchQuery` 변경 시 `previewLines`를 순회하여 `line.toLowerCase().includes(query.toLowerCase())`로 매치 라인 번호 배열 생성
   - `useMemo`로 `searchMatchLines` 계산 (의존: `previewLines`, `searchQuery`)
   - 매치 결과 변경 시 `currentMatchIndex`를 0으로 리셋 (또는 가장 가까운 매치로)

3. **검색 바 UI** (헤더와 코드 라인 리스트 사이):
   - `<input>` — 검색어 입력, autoFocus
   - 매치 카운트: `"3 / 12"` 또는 `"No results"`
   - ▲(이전) / ▼(다음) 버튼
   - ✕ 닫기 버튼

4. **라인 하이라이트**:
   - `code-line-row`에 `is-search-match` 클래스 추가 (매치 라인)
   - `code-line-row`에 `is-search-focus` 클래스 추가 (현재 포커스 매치 라인)

5. **라인 이동**:
   - 이전/다음 시 `lineButtonRefs.current[matchLine].scrollIntoView({ block: 'center' })` 호출
   - wrap-around 처리

6. **키보드 단축키**:
   - `Cmd/Ctrl+F` → `isSearchOpen` 토글 + input focus
   - 검색 바 내 `Enter` → 다음 매치
   - 검색 바 내 `Shift+Enter` → 이전 매치
   - `Escape` → 검색 닫기 + 상태 초기화

7. **초기화 조건**:
   - `activeFile` 변경 시 검색 상태 전체 리셋 (기존 `useEffect` 활용)
   - 이미지/preview unavailable 모드에서는 검색 바 비노출

8. **CSS 스타일** (`App.css`):
   - `.code-viewer-search-bar` — 검색 바 레이아웃
   - `.is-search-match` — 매치 라인 배경색 (예: `rgba(255, 200, 0, 0.15)`)
   - `.is-search-focus` — 현재 포커스 매치 배경색 (예: `rgba(255, 200, 0, 0.35)`)

**Acceptance Criteria**:
- [ ] 검색어 입력 시 매치 라인 하이라이트 표시
- [ ] 이전/다음 버튼으로 매치 라인 이동 + 스크롤
- [ ] `Cmd/Ctrl+F` 토글, `Enter`/`Shift+Enter` 이동, `Escape` 닫기
- [ ] 매치 카운트 `"N / M"` 또는 `"No results"` 표시
- [ ] 파일 변경 시 검색 초기화
- [ ] 이미지/preview unavailable에서 검색 바 비노출

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx` -- 검색 상태, 검색 바 UI, 매칭 로직, 키보드 핸들러, 라인 하이라이트 클래스
- [M] `src/App.css` -- `.code-viewer-search-bar`, `.is-search-match`, `.is-search-focus` 스타일
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- 검색 기능 테스트 추가

**Technical Notes**:
- 기존 `lineButtonRefs` + `scrollIntoView` 패턴을 그대로 재사용
- `searchMatchLines`는 `useMemo(() => { ... }, [previewLines, searchQuery])`로 계산
- `Cmd/Ctrl+F` 이벤트 리스너는 `useEffect`로 `window`에 등록, 브라우저 기본 검색 방지를 위해 `event.preventDefault()`
- 검색 바가 닫혀 있을 때는 매치 하이라이트 불필요 (성능)

**Dependencies**: 없음

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| 대용량 파일(수천 라인) 검색 성능 | Low | `useMemo`로 캐싱, substring은 O(n) 이므로 실질적 문제 없음 |
| `Cmd+F` 브라우저 기본 검색 충돌 | Medium | `event.preventDefault()`로 가로챔 (Electron 환경이므로 문제 없음) |

## Open Questions
- (없음 — 모든 설계 결정 확정)

## Model Recommendation
- `sonnet` — 단일 컴포넌트 내 기능 추가, 기존 패턴 재사용 중심이므로 sonnet 충분
