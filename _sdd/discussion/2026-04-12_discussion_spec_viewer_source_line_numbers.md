# 토론 요약: Spec Viewer에 원문 줄번호 표시

**날짜**: 2026-04-12
**라운드 수**: 5
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)
1. **줄번호 유형 정의**: "코드 파일의 줄번호 매핑"이 아니라, 스펙 마크다운 원문(.md 파일) 자체의 줄번호를 렌더링된 뷰에서 보여주는 것
2. **표시 단위**: 시각적 줄 단위가 아닌 블록 단위(단락, 헤더, 리스트 항목 등)로 해당 원문 시작 줄번호를 표시
3. **사용 목적**: 스펙 내 커뮤니케이션("스펙 42번 줄 보세요")과 스펙 디버깅/편집(렌더링 결과 ↔ 원문 위치 매칭)
4. **구현 방식**: 3가지 접근(CSS ::before, ReactMarkdown 컴포넌트 확장, 독립 거터 컬럼) 중 CSS `::before` + `data-source-line` 방식 선택
5. **잠재적 우려**: 중첩 요소 중복 표시, comment marker 공간 충돌, 코드블록 내부 줄번호 한계 — 모두 감수 가능으로 판단

## 결정 사항 (Decisions Made)
| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | 스펙 마크다운 원문 줄번호를 표시 | 코드 줄번호 매핑보다 직관적이고 사용 목적에 부합 | 1 |
| 2 | 블록 단위 표시 | 기존 `data-source-line` 인프라와 자연스럽게 연결, 마크다운 렌더링 특성 반영 | 2 |
| 3 | CSS `::before` + `data-source-line` 방식 | 최소 코드 변경, React 컴포넌트 수정 불필요, 토글 간단 | 4 |
| 4 | 1차 구현 범위 한정 | 블록 레벨 줄번호 + 중첩 중복 방지 + comment marker 공존. 코드블록 내부는 추후 개선 | 5 |

## 미결 질문 (Open Questions)
- [ ] 중첩 요소 중복 방지를 위한 정확한 CSS 셀렉터 설계 (구현 단계에서 결정)
- [ ] comment marker 거터와의 레이아웃 배치 방식 (좌측 줄번호 + 우측 코멘트 마커 등)
- [ ] 줄번호 표시 on/off 토글 UI 위치 및 기본 상태

## 실행 항목 (Action Items)
| # | 항목 | 우선순위 | 담당 |
|---|------|---------|------|
| 1 | CSS 기반 줄번호 거터 구현 (`data-source-line` 활용) | High | - |
| 2 | 중첩 요소 중복 표시 방지 셀렉터 설계 | High | - |
| 3 | 기존 comment marker 거터와의 공존 레이아웃 조정 | Medium | - |
| 4 | 줄번호 표시 on/off 토글 기능 | Medium | - |
| 5 | 코드블록 내부 줄번호 표시 (추후 개선) | Low | - |

## 리서치 결과 요약 (Research Findings)
- **기존 인프라**: 모든 렌더링된 블록 요소에 `data-source-line`, `data-source-line-start`, `data-source-line-end` 속성이 이미 부착되어 있음 (`source-line-metadata.ts`)
- **원문 줄번호 소스**: remark/rehype 파이프라인이 마크다운 AST의 `position.start.line`을 추출하여 HTML 속성으로 전달
- **기존 활용처**: `source-line-resolver.ts`가 DOM → 원문 줄 역매핑에 사용 (Go to Source, Add Comment 등)
- **코드 뷰어 참고**: CodeMirror 6의 `lineNumbers()` 확장으로 줄번호 표시 중
- **관련 파일**: `spec-viewer-panel.tsx`, `source-line-metadata.ts`, `source-line-resolver.ts`, `comment-line-index.ts`

## 토론 흐름 (Discussion Flow)
Round 1: 줄번호 유형 확인 → 코드 줄번호 매핑으로 오해, 이후 스펙 원문 줄번호로 재정의
Round 2: 표시 단위 결정 → 블록 단위 선택 (기존 data-source-line 인프라 활용)
Round 3: 사용 목적 확인 → 커뮤니케이션 + 디버깅/편집
Round 4: 구현 접근 방식 결정 → CSS ::before 방식 선택 (3가지 대안 비교)
Round 5: 비판적 검토 → 3가지 우려사항 제시, 모두 감수 가능 판단

## 부록: 대화 로그 (Conversation Log)

### Round 1
**Q**: 스펙 뷰어에 보여주고 싶은 '줄번호'가 정확히 어떤 걸 의미하시나요?
**Options**: 1) 스펙 원문 줄번호 2) 코드 줄번호 매핑 3) 둘 다/혼합 4) 토론 종료
**A**: 코드 줄번호 매핑 선택 → 이후 사용자 수정: "스펙 원문 줄번호"가 맞다고 재정의
**Follow-up**: 토론 리셋, 올바른 이해로 재시작

### Round 2
**Q**: 마크다운 렌더링 특성상 원문/렌더링 줄이 1:1이 아닌데, 줄번호 표시 방식은?
**Options**: 1) 블록 단위 (추천) 2) 시각적 줄 단위 3) 토론 종료
**A**: 블록 단위 선택
**Follow-up**: 기존 data-source-line 인프라와 자연스럽게 연결됨 확인

### Round 3
**Q**: 스펙 뷰어에 원문 줄번호를 보여주려는 주된 이유가 뭐예요?
**Options**: 1) 코드와 스펙 동기화 확인 2) 스펙 내 커뮤니케이션 3) 스펙 디버깅/편집 4) 토론 종료
**A**: 커뮤니케이션 + 디버깅/편집 (복수 선택)
**Follow-up**: "원문 몇 번째 줄인지 빠르게 파악"이 핵심 니즈로 정리

### Round 4 (Analysis - Alternatives)
**Q**: 세 가지 구현 접근 중 어떤 방향이 맞을까요?
**Options**: 1) CSS ::before (추천) 2) 커스텀 컴포넌트 확장 3) 독립 거터 컬럼 4) 토론 종료
**A**: CSS ::before 방식 선택
**Follow-up**: 각 접근의 트레이드오프 분석 제시 후 사용자 동의

### Round 5 (Analysis - Critical Review)
**Q**: CSS 방식의 잠재적 약점(중첩 중복, comment marker 충돌, 코드블록 한계)에 대해 어떻게 생각하세요?
**Options**: 1) 모두 감수 가능 2) 중첩 문제 중요 3) 코드블록 내부도 필요 4) 토론 종료
**A**: 모두 감수 가능 — 1차 구현 후 추후 개선
**Follow-up**: 1차 구현 범위 확정
