# 토론 요약: 프로젝트 전체 텍스트 검색

**날짜**: 2026-06-05
**라운드 수**: 7
**참여 방식**: 구조화된 토론 (discussion skill)

## 토론 배경 및 초기 콘텍스트 (Background / Initial Context)

- **사용자 문제 제기**: VS Code의 프로젝트 내 텍스트 검색처럼, SDD Workbench에서도 워크스페이스 전체 파일 내용을 검색할 수 있는지 토론하고자 했다.
- **토론을 시작한 배경**: 현재 앱에는 파일명 검색, 현재 파일 검색, Spec Viewer 검색이 있지만, 프로젝트 전체 내용 검색은 별도 기능으로 확인되지 않았다. 스펙 중심 개발/리뷰 루프에서 관련 코드와 문서를 빠르게 찾는 기능으로 이어질 수 있다.
- **현재 상태**: 앱은 Electron/React 기반이며, 로컬/원격 워크스페이스 작업을 `workspace:*` IPC와 `WorkspaceBackendRouter` 뒤에 숨기는 구조다. 기존 `workspace:searchFiles`는 파일명 검색 전용이며, `electron/workspace-search.ts`는 파일 이름을 대상으로 ordered token wildcard 검색을 수행한다. 원격 런타임에도 `workspace.searchFiles`가 대응되어 있다.
- **범위와 제외 범위**: 이번 토론 범위는 로컬+원격 공통 프로젝트 전체 텍스트 검색 MVP다. 정규식 검색, 치환, include/exclude glob, 복잡한 결과 필터링은 MVP에서 제외한다.
- **수집한 근거**: `_sdd/spec/main.md`, `_sdd/spec/feature-index.md`, `_sdd/spec/spec-viewer/contracts.md`, `_sdd/spec/workspace-and-file-tree/contracts.md`, `electron/workspace-search.ts`, `electron/workspace-backend/types.ts`, `electron/remote-agent/runtime/workspace-ops.ts`, `electron/ipc-types.ts`, `src/file-tree/file-tree-panel.tsx`, `package.json`.

## 핵심 논점 (Key Discussion Points)

1. 기존 검색과 새 기능의 경계: 현재 `workspace:searchFiles`는 파일명 검색이므로, 프로젝트 텍스트 검색은 별도 `searchText` 계열 capability로 추가하는 편이 명확하다.
2. 로컬/원격 일관성: 앱의 기존 guardrail은 local/remote 차이를 renderer에서 숨기는 것이므로, 텍스트 검색도 `WorkspaceBackendRouter`와 remote agent method를 모두 거치는 방향이 적합하다.
3. UI 배치: 파일명 검색과 섞기보다는 별도 검색 패널 MVP가 더 자연스럽다. 사이드바 탭으로 배치하면 VS Code와 유사한 탐색 흐름을 만들 수 있다.
4. MVP 범위 축소: VS Code 검색 전체를 따라가지 않고, 기본 텍스트 검색, 파일/라인/snippet 결과, 클릭 이동만 먼저 구현한다.
5. 핵심 위험: 대형 저장소에서 UI가 멈추거나 검색이 과도하게 오래 걸리는 문제가 가장 중요한 실패 시나리오다.

## 결정 사항 (Decisions Made)

| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | 프로젝트 텍스트 검색은 로컬+원격 공통 기능으로 설계한다 | 기존 앱 원칙이 `workspace:*` surface 뒤에 local/remote 차이를 숨기는 구조이기 때문이다 | 2 |
| 2 | 파일명 검색을 확장하지 않고 별도 텍스트 검색 capability를 추가한다 | 현재 `workspace:searchFiles`는 파일명 검색 계약이며 결과 타입도 파일 단위다 | 1 |
| 3 | UI는 별도 검색 패널 MVP로 시작한다 | 파일명 검색과 내용 검색을 섞으면 사이드바 파일 트리 UX가 복잡해진다 | 3 |
| 4 | 첫 MVP는 기본 텍스트 검색만 제공한다 | 정규식, 치환, include/exclude는 구현량과 테스트 범위를 크게 늘린다 | 4 |
| 5 | 대형 repo 성능 보호를 최우선 guardrail로 둔다 | 내용 검색은 파일 내용을 읽어야 하므로 result cap, time budget, file size cap, binary skip이 없으면 앱 반응성을 해칠 수 있다 | 5 |

## 미결 질문 (Open Questions)

| # | 질문 | 카테고리 | 맥락 / 의존 |
|---|------|----------|-------------|
| - | 없음 | - | 단축키, snippet 세부 표시, include/exclude glob은 MVP 이후 feature draft나 구현 계획에서 다룰 세부 항목으로 남긴다 |

## 실행 항목 (Action Items)

| # | 항목 | 우선순위 | 담당 |
|---|------|---------|------|
| 1 | `workspace:searchText` 요청/응답 타입을 `electron/ipc-types.ts`, preload bridge, workspace backend types에 추가 | High | 후속 구현 |
| 2 | 로컬 backend에 텍스트 검색 엔진을 추가하고 ignored dirs, binary skip, file size cap, result cap, time budget을 적용 | High | 후속 구현 |
| 3 | remote agent runtime에 동일한 `workspace.searchText` method를 추가하고 protocol/security allowlist를 갱신 | High | 후속 구현 |
| 4 | 사이드바 검색 탭 UI를 추가해 query 입력, grouped results, line number, snippet, partial 상태를 표시 | High | 후속 구현 |
| 5 | 결과 클릭 시 기존 파일 열기와 line jump/highlight 흐름을 재사용 | High | 후속 구현 |
| 6 | `workspace-and-file-tree/contracts.md`, `spec-viewer/contracts.md`, `feature-index.md`에 새 기능 계약과 feature ID를 반영 | Medium | 후속 스펙 업데이트 |
| 7 | local/remote search, cap/truncation, binary/large file skip, stale request discard, result click navigation 테스트 추가 | High | 후속 구현 |

## 리서치 결과 요약 (Research Findings)

- `_sdd/spec/main.md`: 앱의 핵심 방향은 스펙 중심 개발과 리뷰 루프를 빠르게 반복하는 워크벤치이며, local/remote 차이는 가능한 한 `workspace:*` IPC 뒤에 숨긴다.
- `_sdd/spec/spec-viewer/contracts.md`: 현재 검색 계약은 Code Editor 검색, File Browser 파일명 검색, Spec Viewer 검색으로 나뉘어 있으며 프로젝트 전체 텍스트 검색은 아직 없다.
- `electron/workspace-search.ts`: 현재 구현은 파일명 기반 검색만 수행하고, maxDepth/result cap/time budget/large directory cap을 이미 갖고 있다.
- `electron/remote-agent/runtime/workspace-ops.ts`: 원격 런타임도 `workspace.searchFiles`를 제공하므로, 텍스트 검색도 같은 패턴으로 추가 가능하다.
- `package.json`: 별도 검색 엔진 의존성은 없으며, Node/Electron/TypeScript 기반 자체 구현 또는 후속 의존성 추가 선택지가 있다. MVP는 기존 패턴에 맞춘 자체 scanner가 단순하다.

## 토론 흐름 (Discussion Flow)

Round 1: 주제 범위 확인 -> 최초에는 discussion skill 구현으로 잘못 해석했으나, 사용자가 프로젝트 전체 텍스트 검색 토론임을 정정했다.

Round 2: 구현 범위 -> 로컬+원격 공통 검색을 목표로 결정했다.

Round 3: 접근 방식 -> 별도 검색 패널 MVP를 권장안으로 선택했다.

Round 4: MVP 기능 깊이 -> 기본 텍스트 검색만 먼저 구현하고 고급 기능은 제외하기로 했다.

Round 5: 배치 -> 검색 패널은 사이드바 탭으로 두는 방향을 선택했다.

Round 6: 수렴 확인 -> 위험을 한 라운드 더 논의하기로 했다.

Round 7: 위험 우선순위 -> 대형 repo 성능을 최우선 실패 시나리오로 결정했다.

## 부록: 대화 로그 (Conversation Log)

### Round 1

**Q**: "형님이 말씀하신 'discussion을 우리 앱에 구현'은 어떤 범위로 먼저 보고 싶으세요?"

**Options**: 1) 가능성 검토 2) MVP 범위 정의 3) 정리/종료

**A**: 가능성 검토

**Follow-up**: 앱 구조를 확인했으나 질문 의도를 discussion skill 자체 구현으로 잘못 해석했다. 이후 사용자가 프로젝트 내 텍스트 검색 기능 토론이라고 정정했다.

### Round 2

**Q**: "프로젝트 전체 텍스트 검색 MVP는 어느 범위가 좋을까요?"

**Options**: 1) 로컬+원격 공통 2) 로컬 먼저 3) 정리/종료

**A**: 로컬+원격 공통

**Follow-up**: 기존 앱 원칙상 `WorkspaceBackendRouter`와 remote agent method를 함께 추가하는 방향으로 정리했다.

### Round 3

**Q**: "구현 접근은 어느 쪽이 형님 기대에 가장 맞을까요?"

**Options**: 1) 검색 패널 MVP 2) 파일트리 검색 확장 3) 정리/종료

**A**: 검색 패널 MVP

**Follow-up**: 파일명 검색과 내용 검색을 섞지 않고 별도 패널을 두는 방향으로 결정했다.

### Round 4

**Q**: "첫 MVP에서 VS Code식 고급 기능은 어디까지 넣는 게 좋을까요?"

**Options**: 1) 기본 텍스트 검색만 2) 필터까지 포함 3) 정리/종료

**A**: 기본 텍스트 검색만

**Follow-up**: regex, replace, include/exclude glob은 후속으로 미루고 안정적인 기본 검색에 집중하기로 했다.

### Round 5

**Q**: "검색 패널 MVP는 앱 안에서 어디에 두는 게 가장 자연스러울까요?"

**Options**: 1) 사이드바 탭 2) 상단 명령 버튼 3) 정리/종료

**A**: 사이드바 탭

**Follow-up**: VS Code와 유사한 접근성을 위해 파일 트리 옆 Search 탭으로 배치하는 방향을 잡았다.

### Round 6

**Q**: "지금까지 결정한 내용으로 토론 요약을 저장해도 괜찮을까요?"

**Options**: 1) 정리해줘 2) 위험 더 논의 3) 정리/종료

**A**: 위험 더 논의

**Follow-up**: 검색 기능의 실패 조건을 성능, 노이즈, UI 복잡도 관점에서 한 번 더 보기로 했다.

### Round 7

**Q**: "이 기능에서 가장 먼저 막아야 할 실패 시나리오는 무엇이라고 보세요?"

**Options**: 1) 대형 repo 성능 2) 결과 노이즈 3) 정리/종료

**A**: 대형 repo 성능

**Follow-up**: time budget, result cap, file size cap, binary skip, ignored dirs, stale request discard를 주요 guardrail로 기록했다.
