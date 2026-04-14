# 토론 요약: POST_SPLIT_REMAINING_ISSUES 우선순위 논의

**날짜**: 2026-04-14
**라운드 수**: 6
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)
1. 리팩토링 이후 남은 이슈를 단순 심각도 순이 아니라 실제 수정 묶음 기준으로 재해석할 필요가 있었다.
2. 초반에는 레이스/보안 등 정합성 우선 접근을 검토했지만, 사용자 의견을 반영해 구조 정리를 먼저 하는 방향으로 전환했다.
3. 구조 정리 안에서도 `workspace-context`처럼 상태 의미를 건드릴 가능성이 큰 영역과, SSH 유틸처럼 비교적 안전하게 분리 가능한 영역을 구분할 필요가 있었다.
4. 첫 구조 묶음은 이후 수정 비용을 낮추면서도 보안 항목과 자연스럽게 연결되는 작은 승리여야 한다는 점에 합의했다.

## 결정 사항 (Decisions Made)
| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | 우선순위 논의의 초점은 “남은 수정 항목의 실행 순서”로 둔다 | 사용자가 우선순위 정리를 먼저 원함 | 1 |
| 2 | 전체 전략은 정합성/안전 우선이 아니라 구조 정리 우선으로 잡는다 | 사용자 의견상 구조 부채를 먼저 줄이는 편이 맞다고 판단 | 2 |
| 3 | 첫 구조 묶음의 시작점은 `D4` SSH 유틸 통합으로 둔다 | 범위가 비교적 작고, 중복 제거와 `S1`, `S2` 보안 강화가 함께 연결됨 | 3, 4 |
| 4 | 그 다음 구조 묶음 후보는 `D1` main routed handler 팩토리로 둔다 | Electron main 경로의 반복을 크게 줄일 수 있음 | 4 |
| 5 | `workspace-context` 반복 패턴(R2-F6 계열)은 이번 구조 묶음에 바로 넣지 않고 다음 묶음으로 미룬다 | 단순 DRY 정리보다 상태 전이 의미를 건드릴 위험이 커서 `A1~A5` 정합성 수정과 함께 다루는 편이 안전함 | 3 |

## 미결 질문 (Open Questions)
- [ ] 없음: 이번 토론 범위에서는 우선순위 초안과 묶음 구성이 충분히 수렴되었다.

## 실행 항목 (Action Items)
| # | 항목 | 우선순위 | 담당 |
|---|------|---------|------|
| 1 | `bootstrap.ts`, `transport-ssh.ts`, `directory-browser.ts`의 SSH 공통 유틸을 `ssh-utils.ts`로 통합하는 작업 초안 작성 | High | 다음 구현 단계 |
| 2 | SSH 유틸 통합 시 `S1`, `S2` 보안 항목을 함께 흡수할 수 있는지 구현 범위를 검증 | High | 다음 구현 단계 |
| 3 | 후속 구조 묶음으로 `D1` routed handler 팩토리 적용 범위를 점검 | Medium | 다음 구현 단계 |
| 4 | `workspace-context` 반복 패턴 정리는 `A1~A5` 정합성 수정과 묶어 별도 작업 단위로 계획 | Medium | 다음 구현 단계 |

## 리서치 결과 요약 (Research Findings)
- `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`: 잔여 이슈 86개가 카테고리별로 정리되어 있으며, High 우선 항목은 레이스/보안/중복에 집중되어 있다.
- `_sdd/review/workspace.md`: `workspace-context` 계열은 구조 문제와 정합성 문제가 강하게 얽혀 있어, 단순 구조 정리만 먼저 하기에는 위험이 있다.
- `_sdd/review/spec-viewer.md`: spec viewer 계열은 중간 심각도 개선과 추가 분리가 주류라 첫 묶음 우선순위로는 밀린다.
- `_sdd/review/app-shell-and-backend.md`: `remote-workspace-backend`와 Electron 지원 계층에도 중복이 있으나, SSH 유틸 통합이 더 작고 명확한 시작점이다.
- `_sdd/spec/main.md`, `_sdd/spec/code-map.md`, `_sdd/spec/feature-index.md`: 현재 제품은 renderer 상태 일관성과 local/remote 공통 contract를 핵심 설계로 삼고 있어, 상태 모델을 크게 건드리는 정리는 보수적으로 접근하는 편이 맞다.

## Sources
- `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`
- `_sdd/review/workspace.md`
- `_sdd/review/spec-viewer.md`
- `_sdd/review/app-shell-and-backend.md`
- `_sdd/spec/main.md`
- `_sdd/spec/code-map.md`
- `_sdd/spec/feature-index.md`

## 토론 흐름 (Discussion Flow)
Round 1: 토론 초점을 “우선순위 정리”로 확정
Round 2: 전체 우선순위 축으로 처음에는 정합성/안전 우선을 검토
Round 3: 구조 중복을 미루는 약점을 검토한 뒤, 사용자 의견에 따라 구조 정리 우선으로 전환
Round 4: 첫 구조 묶음 후보 중 `SSH 유틸 통합`을 시작점으로 선택
Round 5: 정리 직전, 남은 미결을 `workspace-context` 반복 패턴 포함 여부 하나로 축소
Round 6: 해당 반복 패턴은 이번 구조 묶음이 아니라 다음 정합성 묶음으로 미루기로 결정

## 부록: 대화 로그 (Conversation Log)

### Round 1
**Q**: `_sdd/review/POST_SPLIT_REMAINING_ISSUES.md`와 관련 리뷰 파일들을 어떤 관점으로 먼저 볼까요?
**Options**: 1) 우선순위 정리 2) 이슈 타당성 점검 3) 여기서 정리
**A**: 우선순위 정리
**Follow-up**: 토론 범위를 “남은 수정 항목의 실행 순서”로 좁힘

### Round 2
**Q**: 첫 번째 수정 묶음을 어떤 기준으로 잡는 게 맞을까요?
**Options**: 1) 정합성/안전 우선 2) 중복/구조 우선 3) 여기서 정리
**A**: 정합성/안전 우선
**Follow-up**: `workspace-context`, `remote-agent`, 파일 트리/클립보드를 중심으로 1차 우선순위 초안 구성

### Round 3
**Q**: 정합성/안전 우선을 택하면 구조 중복(D1, D4)을 잠시 뒤로 미루게 되는데, 이 트레이드오프를 어떻게 보시나요?
**Options**: 1) 감수 가능 2) 같이 묶자 3) 여기서 정리
**A**: 구조 정리부터 먼저 하자
**Follow-up**: 사용자 의견에 따라 전체 방향을 구조 정리 우선으로 변경

### Round 4
**Q**: 구조 정리를 먼저 한다면, 어떤 묶음부터 시작하는 게 가장 효율적일까요?
**Options**: 1) SSH 유틸 통합 2) main 라우팅 팩토리 3) 여기서 정리
**A**: SSH 유틸 통합
**Follow-up**: 작은 범위로 중복 제거와 보안 개선을 동시에 노리는 시작점으로 정리

### Round 5
**Q**: 이제 정리로 넘어갈까요, 아니면 남은 미결 1개(`workspace-context` 반복 패턴 포함 여부)만 더 논의할까요?
**Options**: 1) 지금 정리 2) 미결 1개 더 논의 3) 토론 종료
**A**: 미결 1개 더 논의
**Follow-up**: 마지막 논점만 추가로 좁혀 보기로 결정

### Round 6
**Q**: `workspace-context` 반복 패턴(R2-F6 계열)은 언제 다루는 게 맞을까요?
**Options**: 1) 다음 묶음으로 미루기 2) 이번 구조 묶음에 포함 3) 여기서 정리
**A**: 다음 묶음으로 미루기
**Follow-up**: `workspace-context`는 정합성 수정(A1~A5)과 함께 다루는 쪽으로 결론
