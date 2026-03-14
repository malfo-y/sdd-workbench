# Implementation Review: Python Citation Navigation

**Review Date**: 2026-03-14
**Review Mode**: Tier 1 — Plan-based full review (Feature Draft as Plan)
**Reference**: `_sdd/drafts/feature_draft_python_citation_navigation.md`
**Reviewer**: Claude Opus 4.6
**Model**: claude-opus-4-6[1m]

---

## 1. Progress Overview

### Task Completion

| ID | Task | Component | Priority | Code | Tests | Status |
|----|------|-----------|----------|------|-------|--------|
| 1 | Citation target grammar & shared helpers | Citation Target Grammar | P0 | ✓ | ✓ 13/13 | COMPLETE |
| 2 | Python declaration resolver | Python Declaration Resolver | P0 | ✓ | ✓ 5/5 | COMPLETE |
| 3 | Prose citation remark transform | Rendered Citation Adapters | P1 | ✓ | ✓ 2/2 | COMPLETE |
| 4 | Fenced Python citation annotation | Rendered Citation Adapters | P1 | ✓ | ✓ 3/3 | COMPLETE |
| 5 | Spec Viewer/App semantic jump orchestration | Navigation Orchestration | P0 | ✓ | ✗ 2 failing | PARTIAL |
| 6 | Regression tests & fallback polish | Regression Test Suite | P1 | - | ✗ 2 failing | PARTIAL |

### Acceptance Criteria Summary

- Total criteria: 18
- Met: 15 (83%)
- Not met: 1
- Untested / 검증 불가: 2

### Test Summary

- Total tests: 183
- Passing: 180
- Failing: 2
- Skipped: 1

---

## 2. Detailed Assessment

### Completed Tasks

#### Task 1: Citation target grammar & shared helpers
- **citation-target.ts** (126줄): `CitationTarget` type, `parseBracketCitationText()`, `buildCitationHref()`, `parseCitationHref()` 정상 구현
- **spec-link-utils.ts** (213줄): `SpecLinkResolution` union type (5 variant), `resolveSpecLink()` — semantic citation target (`workspace-symbol`) 분기 추가
- Tests: 4 + 9 = 13 passing
- Acceptance Criteria: 3/3 MET

| # | Criterion | Code | Test | Status |
|---|-----------|------|------|--------|
| 1 | citation target shape가 prose/fenced block 양쪽 공통 사용 | citation-target.ts | ✓ | MET |
| 2 | same-workspace relative path 제약과 symbol parsing 규칙 unit test | citation-target.test.ts | ✓ 4 tests | MET |
| 3 | 기존 line-hash link behavior regression 없음 | spec-link-utils.test.ts | ✓ 9 tests | MET |

#### Task 2: Python declaration resolver
- **python-symbol-resolver.ts** (127줄): `@lezer/python` AST parser 기반 declaration lookup. function, class, method 지원
- Tests: 5 passing
- Acceptance Criteria: 3/3 MET

| # | Criterion | Code | Test | Status |
|---|-----------|------|------|--------|
| 1 | top-level function, class, class method declaration lookup | python-symbol-resolver.ts | ✓ 3 success tests | MET |
| 2 | unsupported pattern은 explicit failure | python-symbol-resolver.ts | ✓ 2 failure tests | MET |
| 3 | 외부 parser dependency 없이 구현 | @lezer/python 재사용 | - | MET |

#### Task 3: Prose citation remark transform
- **remark-citation-links.ts** (82줄): bracket citation을 link node로 변환하는 remark plugin
- Tests: 2 passing
- Acceptance Criteria: 3/3 MET

| # | Criterion | Code | Test | Status |
|---|-----------|------|------|--------|
| 1 | paragraph 등 prose 안 citation이 clickable target으로 렌더 | remark-citation-links.ts | ✓ | MET |
| 2 | markdown link, inline code, heading anchor behavior 유지 | remark-citation-links.ts | ✓ skip test | MET |
| 3 | plugin unit tests가 citation detection과 non-target exclusion 검증 | remark-citation-links.test.ts | ✓ 2 tests | MET |

#### Task 4: Fenced Python citation annotation
- **code-block-citation.ts** (27줄): full-line Python comment citation 감지, annotation metadata 생성
- Tests: 3 passing
- Acceptance Criteria: 3/3 MET

| # | Criterion | Code | Test | Status |
|---|-----------|------|------|--------|
| 1 | python/py fenced block의 `# [path.py:Symbol]` line 감지 | code-block-citation.ts | ✓ | MET |
| 2 | non-citation code line은 기존 highlight behavior 유지 | code-block-citation.ts | ✓ | MET |
| 3 | annotation utility tests가 recognition과 false positive exclusion 검증 | code-block-citation.test.ts | ✓ 3 tests | MET |

### Partial Tasks

#### Task 5: Spec Viewer/App semantic jump orchestration
- **spec-viewer-panel.tsx**: `handleMarkdownLinkClick`에 `workspace-symbol` 분기 추가, try/catch fallback UX 구현
- **App.tsx**: `openCitationTarget` 함수 — 파일 읽기 → Python resolver 실행 → jump request
- **App.test.tsx**: 2개 테스트 실패

| # | Criterion | Code | Test | Status |
|---|-----------|------|------|--------|
| 1 | prose citation click이 App-level semantic jump flow 호출 | spec-viewer-panel.tsx:950-1024 | ✓ | MET |
| 2 | fenced block citation click이 동일 flow 재사용 | spec-viewer-panel.tsx:415-479 | ✓ | MET |
| 3 | 성공 시 Code tab이 열리고 declaration line highlight 적용 | App.tsx:1389-1437 | ✗ FAILING | NOT MET |
| 4 | failure path에서 fallback UX 유지, file 자동 열기 없음 | spec-viewer-panel.tsx:974-987 | ✓ | MET |

**실패 상세**:
1. `renders file content and tracks selected line range` — 파일 트리에서 "docs" 디렉토리 버튼을 찾지 못함
2. `citation navigation opens file and selects symbol` — selection이 `none`이어야 하는데 `L1-L1` 반환

#### Task 6: Regression tests & fallback polish
- Task 5의 2개 테스트 실패로 인해 회귀 검증 불완전

| # | Criterion | Code | Test | Status |
|---|-----------|------|------|--------|
| 1 | 기존 line-range markdown link tests 통과 | spec-link-utils.test.ts | ✓ 9/9 | MET |
| 2 | unresolved/unsupported citation이 silent failure 없음 | - | △ | UNTESTED |
| 3 | prose/fenced 모두 success + failure integration coverage | App.test.tsx | ✗ 2 failing | NOT MET |

---

## 3. Issues Found

### Critical (2)

1. **App.test.tsx: `renders file content and tracks selected line range` 실패**
   - Location: `src/App.test.tsx`
   - Issue: `Unable to find role="button" and name "docs"` — 파일 트리 렌더링 문제
   - Impact: 기존 파일 선택 flow의 회귀 가능성
   - Action: 테스트 fixture의 디렉토리 구조 또는 App의 파일 트리 렌더링 변경 확인 필요

2. **App.test.tsx: citation navigation selection 상태 불일치**
   - Location: `src/App.test.tsx:2188`
   - Issue: 파일 전환 후 selection이 `none`이어야 하는데 `L1-L1` 반환
   - Impact: citation navigation 후 선택 상태가 올바르지 않음
   - Action: `openCitationTarget`의 selection 초기화 로직 검증 필요

### Quality Issues (2)

1. **`normalizePosixPath()` 코드 중복**
   - Location: `citation-target.ts`, `spec-link-utils.ts` 양쪽에 동일 함수 존재
   - Impact: 유지보수 부담, 미묘한 의미 차이 (backslash 처리)
   - Action: 공통 유틸리티로 추출 권장

2. **App.test.tsx citation 전용 테스트 부족**
   - Location: `src/App.test.tsx`
   - Issue: Python symbol resolution 실패, 파일 읽기 오류, 잘못된 workspace path 등의 시나리오 미검증
   - Action: openCitationTarget의 failure path 테스트 추가 권장

### Improvements (2)

1. **remark-citation-links 테스트 보강**
   - 다중 연속 citation, 빈 bracket, 깊은 중첩 노드 edge case 미검증
   - Priority: Low

2. **Citation 포맷 문서화**
   - `[file:symbol]` 포맷에 대한 JSDoc 또는 코드 주석 부재
   - Priority: Low

---

## 4. Test Status

### Test Summary

| File | Tests | Status |
|------|-------|--------|
| citation-target.test.ts | 4 | ✓ All passing |
| python-symbol-resolver.test.ts | 5 | ✓ All passing |
| remark-citation-links.test.ts | 2 | ✓ All passing |
| code-block-citation.test.ts | 3 | ✓ All passing |
| spec-link-utils.test.ts | 9 | ✓ All passing |
| spec-viewer-panel.test.tsx | 37+ | ✓ All passing |
| App.test.tsx | 118 | ✗ 2 failing |

### Untested Areas

- `openCitationTarget` failure paths (파일 미존재, resolution 실패, 비-Python 파일)
- 복수 citation이 동시에 존재하는 markdown prose
- fenced block에서 citation click 후 fallback UX 통합 검증

---

## 5. Recommendations

### Must Do (Blockers)

1. [ ] **App.test.tsx 2개 실패 테스트 수정** — 파일 트리 fixture와 selection 초기화 로직 점검
   - `renders file content and tracks selected line range`: 디렉토리 구조 fixture 확인
   - `citation navigation opens file and selects symbol`: selection 초기화 타이밍 확인

### Should Do (Quality)

2. [ ] `normalizePosixPath()` 공통 유틸리티로 추출 (DRY)
3. [ ] `openCitationTarget` failure path 테스트 추가 (파일 미존재, resolution 실패)

### Could Do (Improvements)

4. [ ] remark-citation-links edge case 테스트 보강 (다중 citation, 빈 bracket)
5. [ ] Citation 포맷 JSDoc 문서화

---

## 6. Conclusion

Python Citation Navigation 기능은 **아키텍처적으로 건실하게 구현**되었습니다. 6개 Task 중 4개(Task 1-4)가 완전히 완료되었고, 핵심 모듈(citation grammar, Python resolver, remark transform, code block annotation)은 모두 테스트 통과합니다.

**가장 큰 리스크**는 App.test.tsx의 2개 테스트 실패입니다. 하나는 기존 파일 트리 렌더링 회귀, 다른 하나는 citation navigation 후 selection 상태 불일치입니다. **가장 중요한 다음 행동**은 이 2개 테스트 실패를 수정하여 Task 5-6을 완료하는 것입니다.

Overall Progress: **4/6 tasks complete (67%), 15/18 criteria met (83%)**
