# 토론 요약: SDD Workbench 전체 코드 품질 리뷰 계획

**날짜**: 2026-04-14
**라운드 수**: 6
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)

1. **리뷰 목적**: 코드 품질 점검 (버그, 안티패턴, 중복, 보안 취약점 등)
2. **레포 규모 파악**: ~59K LOC, 167 소스 파일, 8개 기능 모듈
3. **리뷰 순서 전략**: Risk-weighted (위험도 높은 모듈부터) vs Bottom-up vs Feature-slice
4. **리뷰 깊이**: 하이브리드 (구조 스캔 → 의심 영역 정밀 리뷰)
5. **결과 기록 방식**: `_sdd/review/` 디렉토리에 모듈별 마크다운 파일
6. **깊이 차등 적용**: 상위 3모듈(main.ts, Workspace, Remote Agent)은 정밀 리뷰, 나머지는 하이브리드
7. **품질 체크리스트**: 11개 항목 합의
8. **하이브리드 맹점**: 레이스 컨디션, 상태 불일치, IPC 미스매치 등은 구조 스캔만으로 발견 불가 → 고위험 모듈은 정밀 리뷰 필요

## 결정 사항 (Decisions Made)

| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | 코드 품질 점검 목적으로 리뷰 | 버그/안티패턴/보안 취약점 발견에 집중 | 1 |
| 2 | Risk-weighted 순서로 진행 | 버그 확률·임팩트가 큰 영역에서 최대 가치 | 3 |
| 3 | 깊이 차등 적용 | 상위 3모듈 정밀, 나머지 하이브리드 | 4, 6, 8 |
| 4 | `_sdd/review/`에 모듈별 파일 기록 | 세션 간 이월 가능, 프로젝트 내 참조 용이 | 5 |
| 5 | 11개 항목 체크리스트 사용 | 모듈 간 일관된 리뷰 품질 보장 | 7 |

## 미결 질문 (Open Questions)

- [ ] 각 세션에서 구체적으로 어떤 프롬프트를 입력해야 효과적인 리뷰가 되는지 (프롬프트 템플릿)
- [ ] 크로스 모듈 이슈 (모듈 경계를 넘는 문제) 전용 리뷰 세션이 필요한지

## 실행 항목 (Action Items)

| # | 항목 | 우선순위 | 담당 |
|---|------|---------|------|
| 1 | 리뷰 세션 1: `electron/main.ts` 정밀 리뷰 | High | Claude + 사용자 |
| 2 | 리뷰 세션 2: Workspace 상태 관리 정밀 리뷰 | High | Claude + 사용자 |
| 3 | 리뷰 세션 3: Remote Agent 정밀 리뷰 | High | Claude + 사용자 |
| 4 | 리뷰 세션 4: Spec Viewer 하이브리드 리뷰 | Medium | Claude + 사용자 |
| 5 | 리뷰 세션 5: Code Comments 하이브리드 리뷰 | Medium | Claude + 사용자 |
| 6 | 리뷰 세션 6: Code Editor 하이브리드 리뷰 | Medium | Claude + 사용자 |
| 7 | 리뷰 세션 7: File Tree 하이브리드 리뷰 | Medium | Claude + 사용자 |
| 8 | 리뷰 세션 8: Workspace Backend + App Shell 하이브리드 리뷰 | Low | Claude + 사용자 |

## 리뷰 실행 계획

### 세션 구성

| 세션 | 대상 모듈 | LOC | 깊이 | 방식 |
|------|----------|-----|------|------|
| **1** | `electron/main.ts` | 2,500 | 정밀 | 단일 파일, 라인별 리뷰 |
| **2** | Workspace (workspace-context, workspace-model, persistence) | 7,776 | 정밀 | 파일별 순차, reducer 로직 집중 |
| **3** | Remote Agent (connection, transport, reliability, runtime) | 6,326 | 정밀 | SSH 통신 경로 추적, 에러 핸들링 집중 |
| **4** | Spec Viewer (panel, citation, sanitization 등) | 8,252 | 하이브리드 | 구조 스캔 → 보안/파싱 로직 정밀 |
| **5** | Code Comments (persistence, anchor, export) | 3,786 | 하이브리드 | 구조 스캔 → 파일 I/O, 앵커 로직 정밀 |
| **6** | Code Editor (panel, gutter, theme) | 3,669 | 하이브리드 | 구조 스캔 → CM6 통합 확인 |
| **7** | File Tree (panel, CRUD, clipboard) | 3,360 | 하이브리드 | 구조 스캔 → 파일시스템 조작 정밀 |
| **8** | Workspace Backend + App Shell | 4,151 | 하이브리드 | 구조 스캔 → 라우팅 로직 확인 |

### 품질 체크리스트 (매 세션 공통)

| # | 점검 항목 | 설명 |
|---|----------|------|
| 1 | 파일/함수 크기 | 100+ LOC 함수, God Object |
| 2 | 에러 핸들링 | 삼킨 에러, 미처리 Promise |
| 3 | 타입 안전성 | `any` 사용, unsafe assertion |
| 4 | 코드 중복 | 추출 가능한 반복 패턴 |
| 5 | 네이밍 일관성 | 컨벤션 위반 |
| 6 | 데드 코드 | 미사용 export, 도달불가 분기 |
| 7 | 보안 | 경로 탈출, 입력 미검증, XSS |
| 8 | 비동기 패턴 | 레이스 컨디션, 정리 누락 |
| 9 | 메모리 누수 | 이벤트 리스너 미해제, 구독 미정리 |
| 10 | 엣지 케이스 | null/undefined, 빈 배열, 경계값 |
| 11 | 테스트 커버리지 | 핵심 경로에 테스트 없는 곳 |

### 세션별 출력 형식

각 세션 종료 시 `_sdd/review/<module-name>.md` 파일 생성:

```markdown
# Code Quality Review: [모듈명]

**날짜**: YYYY-MM-DD
**대상 파일**: [파일 목록]
**리뷰 깊이**: 정밀 / 하이브리드

## 발견 사항 요약

| # | 심각도 | 카테고리 | 위치 | 설명 |
|---|--------|---------|------|------|

## 상세 발견

### [발견 제목]
- **파일**: path:line
- **심각도**: Critical / High / Medium / Low / Info
- **카테고리**: 체크리스트 항목 번호
- **설명**: ...
- **제안**: ...

## 긍정적 패턴 (Good Patterns)
- ...

## 모듈 종합 평가
- ...
```

### 세션 시작 프롬프트 (참고)

각 세션 시작 시 아래와 같이 요청:

> "세션 N: [모듈명] 코드 품질 리뷰를 시작하자.
> `_sdd/discussion/2026-04-14_discussion_code_quality_review_plan.md`에 있는 리뷰 계획을 따라서,
> 체크리스트 11개 항목 기준으로 [정밀/하이브리드] 리뷰 진행하고
> 결과를 `_sdd/review/[module].md`에 기록해줘."

## 리서치 결과 요약 (Research Findings)

- **코드베이스 규모**: 59K LOC, 프론트엔드 73% (42.9K) / 백엔드 27% (16K)
- **모듈 구조**: 8개 독립 기능 모듈로 잘 분리됨
- **테스트 비율**: 71개 테스트 파일 (43%), 모듈별 편차 있음
- **상태 관리**: React Context + 수동 Reducer (외부 라이브러리 없음), 100+ 프로퍼티
- **주요 위험 영역**: `electron/main.ts` 2,500 LOC 모놀리스, Workspace 상태 복잡도, SSH 통신 레이어

## 토론 흐름 (Discussion Flow)

Round 1: 리뷰 목적 확인 → 코드 품질 점검
Round 2: 코드베이스 맥락 수집 → 8모듈 59K LOC 파악
Round 3: 리뷰 순서 전략 → Risk-weighted 선택
Round 4: 리뷰 깊이 → 하이브리드 선택
Round 5: 결과 기록 방식 → _sdd/review/ 마크다운 + 체크리스트 11항목 합의
Round 6: 비판적 검토 → 고위험 모듈은 정밀 리뷰 필요 → 깊이 차등 적용 합의

## 부록: 대화 로그 (Conversation Log)

### Round 1
**Q**: 리뷰의 주된 목적이 뭔가요?
**Options**: 1) 코드 품질 점검 2) 아키텍처 이해/검증 3) 리팩토링 대상 발굴 4) 전부 다
**A**: 코드 품질 점검

### Round 2
**Q**: (맥락 수집) 코드베이스 구조 탐색
**Follow-up**: 59K LOC, 8개 모듈, 167 소스 파일 파악 완료

### Round 3
**Q**: 리뷰 범위를 어떻게 잡을까요?
**Options**: 1) 전체 순차 리뷰 2) 핵심 모듈 우선 3) 위험도 기반 선택
**A**: 핵심 모듈부터 시작하지만 결국 다 리뷰. 순서만 정하기.
**Follow-up**: 3가지 순서 전략 제안 (Risk-weighted, Bottom-up, Feature-slice)

### Round 4
**Q**: 어떤 순서 전략이 맞을까요?
**Options**: 1) A: Risk-weighted 2) B: Bottom-up 3) C: Feature-slice
**A**: A: Risk-weighted

### Round 5
**Q**: 리뷰 깊이를 어느 수준으로?
**Options**: 1) 구조적 리뷰 2) 라인별 정밀 리뷰 3) 하이브리드
**A**: 하이브리드
**Follow-up**: 결과 기록 → _sdd/review/, 체크리스트 11항목 합의

### Round 6
**Q**: 하이브리드 접근의 맹점 (비판적 검토)
**Follow-up**: 상위 3모듈은 정밀, 나머지는 하이브리드로 차등 적용 합의
