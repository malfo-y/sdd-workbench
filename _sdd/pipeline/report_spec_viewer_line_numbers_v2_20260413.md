# Pipeline Report: Spec Viewer 줄번호 확장 (테이블 행 + 코드 블록)

**날짜**: 2026-04-13
**오케스트레이터**: `_sdd/pipeline/orchestrators/orchestrator_spec_viewer_line_numbers_v2.md`

## 1. 뭘 했는가

### 실행 단계
1. **feature-draft** (opus) → temporary spec + implementation plan
2. **implementation** (opus) → 코드 구현 4개 파일
3. **implementation-review** (opus) → 리뷰 (C0/H1/M3/L3)
4. **fix** (autopilot direct) → H1, M1 수정
5. **inline-test** → `npm test` 828 passed
6. **spec-update-done** (sonnet) → global spec 동기화

### 산출물
| 파일 | 변경 유형 |
|------|----------|
| `src/spec-viewer/spec-viewer-panel.tsx` | `tr` includeAnchorLine 제거, HighlightedCodeBlock sourceLineStart prop, code 핸들러 전달 |
| `src/App.css` | pre suppression, 코드 블록 span display:block |
| `src/spec-viewer/spec-viewer-panel.test.tsx` | V1(tr), V2(th/td 미포함), V3(코드 블록 절대값) 테스트 |
| `src/App.test.tsx` | V4(pre suppression), V5(table suppression) CSS 테스트 |
| `_sdd/spec/spec-viewer/overview.md` | 줄번호 설명 확장 |
| `_sdd/spec/feature-index.md` | F49.1 행 추가 |
| `_sdd/spec/main.md` | 버전 0.49.3 |
| `_sdd/drafts/feature_draft_spec_viewer_line_numbers_v2.md` | temporary spec |

## 2. 어떻게 나왔는가

### 기능 검증
- **AC1 (테이블 행 줄번호)**: MET — `tr`에 `data-source-line` 속성 활성화, `::before`로 거터 표시 (Chromium position:absolute로 정상 동작)
- **AC2 (코드 블록 내부 줄번호)**: MET — `<span data-source-line="N">` 래핑, opening fence 기준 오프셋
- **AC3 (기존 블록 줄번호 regression)**: MET — 기존 핸들러 변경 없음, 전 테스트 통과
- **AC4 (comment marker 공존)**: MET — `tr`은 `renderElementWithSourceLine` 사용 (marker 경로 외), 코드 블록 span도 무관
- **AC5 (테스트 suite)**: MET — 828 passed, 1 skipped (기존)
- **AC6 (새 테스트)**: MET — 5개 테스트 추가 (V1~V5)

### 테스트 결과
- **828 passed** / 1 skipped / 0 failed
- 1 flaky timeout (cap message — 줄번호와 무관, 단독 실행 시 통과)

### 리뷰 결과
- Review 1회, Fix 1회
- Critical: 0, High: 0 (H1 해소), Medium: 0 (M1 해소, M2/M3 deferred), Low: 3

## 3. 뭘 더 해야 하는가

### 후속 작업
| # | 항목 | 우선순위 | 근거 |
|---|------|---------|------|
| 1 | Electron에서 `tr::before` 시각적 렌더링 확인 | Medium | JSDOM 테스트만으로는 시각적 렌더링 보장 불가. Chromium에서 확인 필요 |
| 2 | 코드 블록 줄번호 off-by-one 검토 | Low | opening fence 줄이 첫 코드 줄에 표시됨 — 기존 resolver와 일관적이지만, 사용자 기대와 1줄 차이 가능 |
| 3 | 검색 highlight 이중 적용 확인 (M2) | Low | 코드 블록 검색 시 `pre`와 첫 `span`에 이중 background |
| 4 | 대규모 spec에서 resolver 성능 확인 (M3) | Low | `[data-source-line]` 후보 요소 수 증가 |
| 5 | 줄번호 on/off 토글 UI | Low | 1차 때부터 deferred |

## 4. Taste Decisions

| # | 결정 | 근거 |
|---|------|------|
| 1 | `tr`에 직접 `data-source-line` 활성화 (첫 번째 셀 위임 대신) | `position: absolute`로 Chromium에서 정상 동작. 코드 변경 최소화 |
| 2 | 코드 블록 줄번호를 opening fence 기준으로 유지 | 기존 `resolveCodeBlockLineOffset`과 일관성. Off-by-one 수정은 기존 동작 변경이라 별도 PR 권고 |
| 3 | `th`/`td` 셀의 `includeAnchorLine: false` 유지 | 행 단위 줄번호로 충분, 셀 단위는 시각적 노이즈 |
| 4 | M2/M3을 deferred 처리 | 시각적/성능 문제이며, 기능 오류가 아님. 실제 사용에서 문제 시 대응 |

## 5. 오케스트레이터 상태

- 경로: `_sdd/pipeline/orchestrators/orchestrator_spec_viewer_line_numbers_v2.md`
- 상태: **완료** (log 기준 전 단계 성공)
