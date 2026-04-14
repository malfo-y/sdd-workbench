# 토론 요약: 코드 리팩토링 구현 리뷰 전략

**날짜**: 2026-04-14
**라운드 수**: 4
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)
1. **리뷰의 1차 목적**: 이번 작업은 신규 기능 추가보다 대규모 구조 분리이므로, “좋게 리팩토링되었는가”보다 “기존 계약과 동작이 유지되었는가”를 우선 검증해야 한다.
2. **가장 적합한 리뷰 프레임**: phase 로그를 다시 읽는 방식보다, acceptance criteria와 invariant를 계약 체크리스트로 바꾸고 실제 구현/테스트/수동 스모크로 역검증하는 접근이 더 적합하다.
3. **가장 큰 맹점**: `npm test`와 `npm run lint` 통과, phase review-fix 로그만으로는 Electron 실제 UI 상호작용과 수동 흐름 회귀를 충분히 증명하지 못한다.
4. **최종 리뷰 산출물**: 전체 체크리스트를 장문으로 남기기보다, 발견된 문제를 빠르게 수정 루프로 넘길 수 있는 “버그 리스트 + 재현 절차”가 더 실용적이다.

## 결정 사항 (Decisions Made)
| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | 구현 리뷰의 기본 축은 `회귀 검증`으로 잡는다. | 구조 분리 중심 리팩토링이라 public behavior와 계약 유지 여부가 핵심 리스크다. | 1 |
| 2 | 리뷰 방식은 `계약 회귀형`으로 진행한다. | 로드맵/로그의 완료 선언보다 IPC surface, context surface, UI flow 같은 실제 계약을 직접 확인하는 편이 더 강하다. | 2 |
| 3 | 첫 번째 집중 검증 영역은 `수동 UI 흐름`으로 둔다. | 자동 테스트가 녹색이어도 Electron 상호작용, 탭/모달/리사이즈/외부 열기 흐름은 누락될 가능성이 높다. | 3 |
| 4 | 리뷰 결과물은 `버그 리스트 + 재현` 형태로 남긴다. | 바로 후속 디버깅과 수정 루프에 연결하기 쉽다. | 4 |

## 미결 질문 (Open Questions)
- [ ] 없음

## 실행 항목 (Action Items)
| # | 항목 | 우선순위 | 담당 |
|---|------|---------|------|
| 1 | 로드맵/로그/현재 코드 기준으로 회귀 계약 체크리스트를 만든다. (`workspace:*` IPC, `WorkspaceContextValue`, App shell wiring, spec viewer navigation, remote/watch 흐름) | High | Codex |
| 2 | 자동 검증은 `npm test`, `npm run lint`, 관련 테스트 파일 diff 확인으로 묶고, 수동 검증은 Electron UI smoke 중심으로 별도 라운드로 분리한다. | High | Codex |
| 3 | 수동 smoke는 탭 전환, comment/export modal, pane resize, remote connect, watcher/degraded flow, open-in 외부 앱 동작을 우선순위로 점검한다. | High | Codex |
| 4 | 발견사항은 “증상 / 재현 절차 / 관련 파일 / 추정 계약 위반” 형식의 버그 리스트로 정리한다. | Medium | Codex |

## 리서치 결과 요약 (Research Findings)
- `_sdd/pipeline/orchestrators/orchestrator_code_refactoring_roadmap.md`: Phase 0~4 전체가 구조 분리 중심이며, acceptance criteria는 각 phase 종료 시 `npm test`와 `npm run lint`, shared surface 유지, 최종 `critical/high/medium = 0`를 요구한다.
- `_sdd/pipeline/log_code_refactoring_roadmap_20260414.md`: feature-draft → implementation-plan → phase별 implementation/review-fix → final integration review → spec sync까지 완료로 기록되어 있다.
- `_sdd/pipeline/report_code_refactoring_roadmap_20260414.md`: 최종 결과는 4대 모놀리스의 대규모 축소와 모듈 분리로 요약된다.
- `_sdd/spec/main.md`: persistent 구조 결정으로 boundary-oriented split, shared IPC type module, workspace helper 분리가 이미 global spec에 반영돼 있다.
- `_sdd/spec/operations.md`: 자동 게이트 외에도 watch, 탭 전환, comments/export, remote 연결 등 수동 smoke 항목이 길게 정의돼 있어, 실제 회귀 리뷰의 핵심 근거로 적합하다.
- 현재 워크트리는 대규모 변경 상태이며, 변경 면적은 `electron/main.ts`, `electron/preload.ts`, `src/App.tsx`, `src/workspace/workspace-context.tsx`, `src/spec-viewer/spec-viewer-panel.tsx` 및 신규 helper/hook 파일들에 걸쳐 있다.

## Sources
- `_sdd/pipeline/orchestrators/orchestrator_code_refactoring_roadmap.md`
- `_sdd/pipeline/log_code_refactoring_roadmap_20260414.md`
- `_sdd/pipeline/report_code_refactoring_roadmap_20260414.md`
- `_sdd/spec/main.md`
- `_sdd/spec/operations.md`
- `git status --short`
- `rg` 검색 결과 (`src/`, `electron/` 내 IPC/hook/context 관련 위치 및 테스트 파일 목록)

## 토론 흐름 (Discussion Flow)
Round 1: 리뷰 초점을 무엇으로 잡을지 논의 → `회귀 검증` 선택
Round 2: 리뷰 프레임을 무엇으로 잡을지 논의 → `계약 회귀형` 선택
Round 3: 가장 먼저 의심할 맹점을 논의 → `수동 UI 흐름` 선택
Round 4: 최종 산출물 형식을 논의 → `버그 리스트 + 재현` 선택 후 정리

## 부록: 대화 로그 (Conversation Log)

### Round 1
**Q**: 이번 구현 리뷰를 시작할 때 가장 먼저 깊게 볼 축을 무엇으로 둘까요?
**Options**: 1) 회귀 검증 2) 구조 검증 3) 정리 후 종료
**A**: 회귀 검증
**Follow-up**: 구조 분리 리팩토링의 특성상 public behavior와 계약 유지 여부가 우선이라는 방향이 잡혔다.

### Round 2
**Q**: 구현 리뷰 방식은 어떤 프레임으로 잡을까요?
**Options**: 1) 계약 회귀형 2) Phase 재연형 3) 정리 후 종료
**A**: 계약 회귀형
**Follow-up**: phase 로그를 재독하는 것보다 acceptance/invariant를 기준으로 실제 구현을 역검증하는 접근이 더 적합하다고 정리했다.

### Round 3
**Q**: 이 계약 회귀형 리뷰에서 가장 먼저 의심해야 할 맹점은 무엇인가요?
**Options**: 1) 수동 UI 흐름 2) 경계 계약 붕괴 3) 정리 후 종료
**A**: 수동 UI 흐름
**Follow-up**: 자동 테스트 녹색만으로는 Electron 실제 상호작용을 충분히 증명하지 못하므로 manual smoke를 우선순위로 두기로 했다.

### Round 4
**Q**: 구현 리뷰의 최종 산출물은 어떤 형태가 가장 실용적인가요?
**Options**: 1) 버그 리스트+재현 2) 체크리스트+판정표 3) 정리 후 종료
**A**: 버그 리스트+재현
**Follow-up**: 이번 리뷰는 바로 디버깅/수정 루프로 연결돼야 하므로, 발견사항 중심의 산출물이 적합하다고 정리했다.
