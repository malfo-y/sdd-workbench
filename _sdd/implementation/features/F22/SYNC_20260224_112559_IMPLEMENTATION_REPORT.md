# Implementation Report: F21 — Code Viewer 텍스트 검색

**Date**: 2026-02-24
**Feature**: F21 — Code Viewer substring 텍스트 검색 + 라인 단위 이동

---

## Progress Summary

- Total Tasks: 1
- Completed: 1
- Tests Added: 19
- All Passing: Yes

### Baseline → Final
| 항목 | 베이스라인 | 최종 |
|------|-----------|------|
| Test files | 23 | 23 |
| Tests passed | 262 | **281** |
| Lint | pass | pass |
| Build | pass | pass |

---

## Completed

- [x] Task 1: 검색 바 UI + 매칭 로직 + 라인 하이라이트 + 키보드 단축키 (19 tests)

### TDD 진행
| Acceptance Criterion | RED | GREEN | REFACTOR | 상태 |
|----------------------|-----|-------|----------|------|
| 검색 바 기본 비표시 | ✓ | ✓ | ✓ | 완료 |
| Ctrl+F로 검색 바 열기 | ✓ | ✓ | ✓ | 완료 |
| Meta+F(Cmd+F)로 검색 바 열기 | ✓ | ✓ | ✓ | 완료 |
| substring 매칭 + 라인 하이라이트 | ✓ | ✓ | ✓ | 완료 |
| 매치 카운트 N / M 표시 | ✓ | ✓ | ✓ | 완료 |
| No results 표시 | ✓ | ✓ | ✓ | 완료 |
| is-search-focus 현재 매치 표시 | ✓ | ✓ | ✓ | 완료 |
| 다음 매치 버튼 이동 | ✓ | ✓ | ✓ | 완료 |
| 이전 매치 버튼 이동 | ✓ | ✓ | ✓ | 완료 |
| wrap-around 다음→첫 매치 | ✓ | ✓ | ✓ | 완료 |
| wrap-around 이전→마지막 매치 | ✓ | ✓ | ✓ | 완료 |
| Enter 다음 매치 이동 | ✓ | ✓ | ✓ | 완료 |
| Shift+Enter 이전 매치 이동 | ✓ | ✓ | ✓ | 완료 |
| Escape 검색 닫기 | ✓ | ✓ | ✓ | 완료 |
| 닫기 버튼 검색 닫기 | ✓ | ✓ | ✓ | 완료 |
| 닫기 시 하이라이트 해제 | ✓ | ✓ | ✓ | 완료 |
| 파일 변경 시 검색 초기화 | ✓ | ✓ | ✓ | 완료 |
| 이미지 프리뷰 모드 비표시 | ✓ | ✓ | ✓ | 완료 |
| case-insensitive 검색 | ✓ | ✓ | ✓ | 완료 |

---

## 생성/수정된 파일

| 파일 | 변경 | 내용 |
|------|------|------|
| `src/code-viewer/code-viewer-panel.tsx` | M | 검색 상태 4개, `searchMatchLines` useMemo, `searchMatchLineSet` useMemo, Ctrl/Cmd+F useEffect, 파일변경 리셋, 네비게이션 핸들러 4개, 검색 바 JSX, 라인 className 확장 |
| `src/App.css` | M | `.code-viewer-search-bar`, `.code-viewer-search-input`, `.code-viewer-search-count`, `.code-viewer-search-nav-button`, `.code-viewer-search-close-button`, `.is-search-match`, `.is-search-focus` 스타일 |
| `src/code-viewer/code-viewer-panel.test.tsx` | M | `describe('CodeViewerPanel search')` — 19개 테스트 추가 |

---

## 발견 사항

### scrollIntoView jsdom 이슈
- `lineButtonRefs.current[n]?.scrollIntoView()` 호출 시 jsdom에서 "not a function" 오류 발생
- 기존 jumpRequest 코드와 동일하게 `typeof el.scrollIntoView === 'function'` 가드로 해결

### 성능 최적화 (REFACTOR)
- 초기 구현: `searchMatchLines.includes(lineNumber)` — O(n) 라인 단위 렌더 시 O(n²)
- REFACTOR: `searchMatchLineSet = new Set(searchMatchLines)` 로 O(1) 조회로 개선

---

## Quality Assessment

### Phase Review
| Category | Issues | Status |
|----------|--------|--------|
| Security | 0 | Clean |
| Error Handling | 0 | Clean |
| Code Patterns | 0 | Clean (기존 패턴 일관성 유지) |
| Performance | 1 resolved | includes→Set 최적화 완료 |
| Test Quality | 0 | 19개 독립 테스트 |

### Conclusion: **READY**
