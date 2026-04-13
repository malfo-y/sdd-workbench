# Pipeline Report: Spec Viewer 원문 줄번호 표시

## 1. 뭘 했는가

| 항목 | 내용 |
|------|------|
| 실행 단계 | implementation → implementation-review → inline-test → spec-update-done |
| 에이전트 | sdd-skills:implementation, sdd-skills:implementation-review, sdd-skills:spec-update-done |
| 주요 산출물 | `src/App.css` (줄번호 거터 CSS), 테스트 2개 파일 |
| Review-fix 횟수 | 1회 review, fix 불필요 |
| 테스트 | npm test 실행 — 823 passed, 1 skipped |

## 2. 어떻게 나왔는가

| AC | 상태 | 검증 방법 |
|----|------|----------|
| AC1: 블록 요소 줄번호 표시 | MET | 코드 분석 + 테스트 |
| AC2: 중첩 중복 방지 | MET | 코드 분석 + 테스트 |
| AC3: comment marker 공존 | MET | 코드 분석 + 테스트 |
| AC4: npm test 통과 | MET | npm test 실행 (823/823) |

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/App.css` | 줄번호 거터 CSS 규칙 추가 (~60줄) |
| `src/App.test.tsx` | CSS 규칙 존재 테스트 6개 추가 |
| `src/spec-viewer/spec-viewer-panel.test.tsx` | DOM 구조 검증 테스트 3개 추가 |
| `_sdd/spec/feature-index.md` | F49 줄번호 거터 feature 행 추가 |
| `_sdd/spec/spec-viewer/overview.md` | 줄번호 거터 사용자 동작 불릿 추가 |
| `_sdd/spec/main.md` | 버전 0.49.2 갱신 |

### Review Findings

- Critical: 0, High: 0, Medium: 0 (해소), Low: 3
- L1: 테이블 셀 줄번호 미표시 CSS 주석 부재 (의도된 동작)
- L2: blockquote padding 하드코딩
- L3: on/off 토글 미구현 (1차 범위 밖)

## 3. 뭘 더 해야 하는가

| 항목 | 우선순위 | 비고 |
|------|---------|------|
| 시각적 검증 (dev 서버에서 확인) | High | 수동 확인 필요 — `npm run dev` 후 스펙 뷰어 확인 |
| 줄번호 on/off 토글 UI | Medium | 토론 Action Item #4 |
| 코드블록 내부 줄번호 | Low | 토론 Action Item #5 |
| 테이블 셀 줄번호 미표시 CSS 주석 추가 | Low | Review L1 |

## 4. Taste Decisions

| 결정 | 근거 |
|------|------|
| feature-draft 생략 (Small direct path) | CSS 중심 변경 + 토론 문서가 요구사항 충분히 제공 |
| React 컴포넌트 무수정 | CSS만으로 완전 구현 가능 — 최소 변경 원칙 |
| blockquote/table 컨테이너 줄번호 억제 | 중첩 중복 방지 — 내부 leaf 요소에만 표시 |
| comment marker 재배치 (left: 2.9rem) | 줄번호 거터(2.6rem) 오른쪽에 배치하여 공존 |

## 5. 오케스트레이터

- 경로: `_sdd/pipeline/orchestrators/orchestrator_spec_viewer_line_numbers.md`
- 상태: 완료
- 로그: `_sdd/pipeline/log_spec_viewer_line_numbers_20260413_100000.md`
