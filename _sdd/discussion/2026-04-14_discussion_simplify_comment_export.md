# 토론 요약: Comment Export 간소화

**날짜**: 2026-04-14
**라운드 수**: 3
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)
1. **Export 컨텍스트 과다**: 현재 코멘트당 snippet(600자) + before(220자) + after(220자) = 최대 ~1040자의 코드 컨텍스트가 포함되어 불필요하게 방대함
2. **실제 사용 패턴**: 코멘트를 달고 export하는 UX에서 코드 수정이 거의 일어나지 않아 풍부한 컨텍스트의 실효성이 낮음
3. **LLM 위치 파악**: 줄번호 + 해당 줄 코드만으로도 코드 수정이 극단적이지 않으면 충분히 위치 특정 가능
4. **멀티라인 코멘트 표현**: 여러 줄에 걸친 코멘트는 첫 줄 내용 + 범위 표기로 간결하게 처리
5. **Hash 필요성**: export된 결과를 LLM이 읽을 때 anchor hash는 의미 없으므로 제거

## 결정 사항 (Decisions Made)
| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | `renderCommentBlock()`만 수정 (접근 A) | anchor 데이터 보존으로 복원 가능, 변경 범위 최소 | 1, 2 |
| 2 | before/after 컨텍스트 export에서 제거 | 코드 수정이 드문 UX에서 불필요한 정보 | 1, 2, 3 |
| 3 | snippet을 첫 줄 내용만으로 축소 | 줄번호와 함께면 위치 파악 충분 | 3 |
| 4 | 멀티라인은 첫 줄 + 범위 표기 (예: `L5 (~L12)`) | 가장 간결한 방식 선호 | 4 |
| 5 | anchor hash export에서 제거 | LLM에게 불필요한 정보 | 5 |
| 6 | anchor 생성 로직(`comment-anchor.ts`)은 변경 없음 | 내부 매칭 기능 보존, 나중에 상세 export 복원 가능 | 1 |

## 미결 질문 (Open Questions)
- 없음

## 실행 항목 (Action Items)
| # | 항목 | 우선순위 | 담당 |
|---|------|---------|------|
| 1 | `src/code-comments/comment-export.ts`의 `renderCommentBlock()` 수정: 첫 줄 코드 + 줄번호 + 범위 표기만 출력하도록 변경 | High | 구현 담당자 |
| 2 | export 결과물 확인: 간소화된 bundle이 LLM에게 충분한 정보를 제공하는지 실제 테스트 | Medium | 구현 담당자 |

## 리서치 결과 요약 (Research Findings)
- **현재 구현**: `comment-export.ts:9-21` (`renderCommentBlock`)에서 snippet/before/after/hash를 모두 포함하여 렌더링
- **anchor 생성**: `comment-anchor.ts:13-14`에서 `MAX_ANCHOR_SNIPPET_CHARS=600`, `MAX_CONTEXT_CHARS=220`으로 설정
- **영향 범위**: `renderCommentBlock()` 함수 하나만 수정하면 `renderCommentsMarkdown()`과 `renderLlmBundle()` 모두에 반영됨

## 토론 흐름 (Discussion Flow)
Round 1: 멀티라인 코멘트 표현 방식 → "첫 줄만 + 범위 표기" 선택
Round 2: 구현 접근 방식 (A/B/C) → "A: renderCommentBlock만 수정" 선택
Round 3: anchor hash 제거 여부 → "Hash 제거" 선택

## 부록: 대화 로그 (Conversation Log)

### Round 1
**Q**: 여러 줄에 걸친 코멘트(예: L5-L12)의 경우, 간소화된 export에서 어떻게 표현하면 좋을까요?
**Options**: 1) 선택된 모든 줄 포함 (권장) 2) 첫 줄 + 마지막 줄만 3) 첫 줄만 + 범위 표기 4) 토론 종료
**A**: 첫 줄만 + 범위 표기 — 가장 간결한 방식 선호

### Round 2
**Q**: 어떤 접근이 좋을까요?
**Options**: 1) A: renderCommentBlock만 수정 (권장) 2) B: anchor 생성 경량화 3) C: export 모드 선택 옵션 4) 토론 종료
**A**: A: renderCommentBlock만 수정 — 변경 범위 최소, anchor 데이터 보존

### Round 3
**Q**: export 결과에서 anchor hash(예: `#a1b2c3d4`)도 제거할까요?
**Options**: 1) Hash 제거 (권장) 2) Hash 유지 3) 토론 종료
**A**: Hash 제거 — LLM에게 불필요한 정보
