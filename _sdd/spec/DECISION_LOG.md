## 2026-02-20 - 기본 스펙 베이스라인 문서화 방식

- Context:
  - 프로젝트는 Electron + React 템플릿 초기 상태이며, `/_sdd/spec/user_spec.md`에는 MVP 요구사항이 상세 정의되어 있음.
  - 현재 코드에는 제품 기능이 거의 없고 앱 골격만 존재함.
- Decision:
  - 기본 스펙을 `/_sdd/spec/main.md`로 생성하고, 모든 핵심 요구사항을 `As-Is (Implemented/Partial)` vs `To-Be (Planned)`로 구분해 명시한다.
- Rationale:
  - 현재 구현 대비 목표 기능 간 간극을 한눈에 파악해야 이후 `feature-draft` 단계에서 우선순위 선정을 빠르게 진행할 수 있다.
- Alternatives considered:
  - `user_spec.md`를 직접 수정해 통합 문서로 운영
  - 컴포넌트별 다중 스펙 파일로 즉시 분할
- Impact / follow-up:
  - 다음 단계에서 기능 단위(`feature-draft`)로 스펙 패치와 구현 계획을 생성하기 쉬운 기준점이 마련됨.

## 2026-02-20 - Feature-draft 순차 실행용 우선순위 큐 도입

- Context:
  - 구현 전 단계에서 “무엇부터 어떤 크기로” 진행할지 명확한 분할 기준이 필요함.
  - 현재는 대부분 기능이 Planned 상태라 한 번에 구현 범위가 커질 위험이 있음.
- Decision:
  - `main.md`에 P0/P1/P2 우선순위 기반 Feature Queue(F01~F10)를 정의하고, 각 Feature를 `feature-draft` 1회 단위로 분할한다.
- Rationale:
  - 기능 단위를 작게 유지하면 feature-draft -> implementation 사이클을 안정적으로 반복할 수 있고, 범위 통제와 검증이 쉬워진다.
- Alternatives considered:
  - 기존 체크리스트를 유지한 채 구현 시점에 임의 분할
  - 대형 기능 묶음 단위로 소수 Feature만 정의
- Impact / follow-up:
  - 이후 작업은 Feature ID 순서대로 진행하고, 완료 시 상태를 `✅ Done`으로 갱신한다.

## 2026-02-20 - F01 완료 반영 기준 확정 (경로/배너/테스트)

- Context:
  - F01(`workspace bootstrap`) 구현에서 워크스페이스 선택, 취소/오류 처리, 테스트 전략에 대한 운영 기준이 필요했음.
  - 구현 리뷰와 수동 스모크까지 완료되어 스펙 동기화 시점에 기준을 고정해야 함.
- Decision:
  - 내부 상태(`rootPath`)는 절대 경로를 유지하고, UI에서만 축약 경로(`~`)를 표시한다.
  - 오류 피드백은 F01에서 텍스트 배너를 사용하고, 토스트 배너 전환은 후속 Feature backlog로 관리한다.
  - 자동 테스트(`Vitest + RTL + jsdom`)는 조기 도입하며, 핵심 사용자 흐름은 수동 스모크로 보완한다.
- Rationale:
  - 경로 표현과 상태 저장을 분리하면 디버깅/후속 기능(F02+) 확장 시 경로 정합성을 유지하기 쉽다.
  - 초기 복잡도를 낮추면서도 사용자 피드백 경로를 빠르게 확보할 수 있다.
  - 테스트를 초기에 도입하면 feature-draft 반복 사이클에서 회귀 리스크를 줄일 수 있다.
- Alternatives considered:
  - 상태에도 축약 경로를 저장하는 방식
  - 처음부터 토스트 컴포넌트를 도입하는 방식
  - 수동 테스트 중심으로 진행하고 자동 테스트를 후순위로 미루는 방식
- Impact / follow-up:
  - `main.md`의 F01 상태를 `✅ Done`으로 반영하고, F02부터 동일 원칙을 적용한다.
  - 토스트 전환은 후속 feature-draft에서 별도 수용 기준으로 추적한다.

## 2026-02-20 - F02 파일 트리 탐색 규칙 확정

- Context:
  - F02 구현에서 파일 트리 표시 정책(숨김 파일/정렬/초기 렌더/탐색 UX)을 확정해야 했음.
  - 실제 사용 중 파일이 한 번에 과도하게 노출되는 문제가 확인되어 디렉터리 우선 탐색 방식이 필요했음.
- Decision:
  - 숨김 파일은 기본 표시하고, ignore는 명시된 대형 디렉터리(`.git`, `node_modules`, `dist`, `build`, `out`, `.next`, `.turbo`)에 한정한다.
  - 정렬은 디렉터리 우선 + 이름 오름차순으로 고정한다.
  - 파일 트리는 디렉터리 기본 접힘 상태로 렌더링하고, 사용자가 디렉터리를 눌렀을 때만 하위 파일/폴더를 노출한다.
  - 초기 렌더는 노드 cap(500) 제한을 적용해 대형 워크스페이스에서 렌더 과부하를 방지한다.
- Rationale:
  - 숨김 파일 기본 표시는 CLI/개발 워크플로우에서 필요한 파일 접근성을 높인다.
  - 정렬 고정은 탐색 예측 가능성을 보장하고 테스트 안정성을 높인다.
  - 디렉터리 토글 UX는 “줄줄이 나열” 문제를 해결해 탐색 가독성을 개선한다.
  - 렌더 cap은 초기 렌더 성능과 UI 응답성을 안정화한다.
- Alternatives considered:
  - 숨김 파일/디렉터리를 모두 기본 숨김 처리
  - 파일/폴더 혼합 정렬 또는 최신 수정 시각 정렬
  - 트리 전체를 초기 확장 상태로 유지
  - 렌더 cap 없이 전체 노드 즉시 렌더
- Impact / follow-up:
  - `main.md`에서 F02를 `✅ Done`으로 반영하고, F03 이후 기능은 동일 탐색 규칙을 유지한다.
  - root-level 파일의 노출 정책(예: 별도 그룹)은 필요 시 후속 feature-draft에서 검토한다.

## 2026-02-20 - F03 코드 뷰어 기본 읽기 흐름/미리보기 정책 확정

- Context:
  - F03 구현에서 center 패널 코드 프리뷰, 읽기 실패 처리, 선택 범위 상태를 제품 기본 동작으로 고정해야 했음.
  - 대용량/바이너리 파일을 그대로 렌더하면 안정성과 성능 리스크가 커져 preview 정책이 필요했음.
- Decision:
  - `workspace:readFile` IPC를 도입하고, `rootPath` 경계 검증으로 workspace 밖 경로 접근을 차단한다.
  - 파일 읽기 결과는 `ok/content/error/previewUnavailableReason` 계약으로 통일한다.
  - 2MB 초과 파일과 바이너리 파일은 본문 대신 `preview unavailable` 상태(`file_too_large`, `binary_file`)를 반환한다.
  - 라인 선택은 1-based 기준으로 저장하고 `Shift+Click` 확장을 지원한다.
- Rationale:
  - 읽기 흐름을 명시적으로 분리하면 오류/예외 상황에서도 UI 상태를 예측 가능하게 유지할 수 있다.
  - preview 불가 정책은 렌더러 부담을 줄이고 사용자에게 명확한 피드백을 제공한다.
  - 1-based 선택 규칙은 스펙 링크 표기(`L10`)와 일관성이 높다.
- Alternatives considered:
  - 파일 크기/바이너리 구분 없이 모두 렌더 시도
  - `workspace:readFile` 없이 renderer 직접 파일 접근
  - 0-based 내부 선택 상태를 그대로 노출
- Impact / follow-up:
  - `main.md`의 `workspace:readFile` 상태를 `Implemented (F03)`로 반영한다.
  - F04/F05에서 markdown 렌더/링크 점프와 결합할 때 동일 선택 상태 모델을 재사용한다.

## 2026-02-20 - F03.1 확장자 기반 색상 코딩 규칙 확정

- Context:
  - F03 구현 이후 코드 뷰어가 plain text 중심이라 가독성 개선 요구가 발생했음.
  - 사용자 요청으로 `.py`는 필수 지원 확장자로 포함해야 했음.
- Decision:
  - Prism 기반 하이라이트 어댑터를 도입하고, 확장자 매핑(`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`, `.py`)을 고정한다.
  - 미지원 확장자는 `plaintext` fallback으로 처리한다.
  - 토큰 컬러 스타일은 기본 테마 수준으로 적용하고, VS Code급 상세 하이라이팅은 MVP 이후로 이월한다.
- Rationale:
  - 가벼운 하이라이팅 계층으로 빠르게 가독성을 높이면서 구현 복잡도를 통제할 수 있다.
  - fallback 규칙을 고정하면 파일 형식이 다양해도 렌더 실패 없이 동작한다.
  - `.py` 우선 지원은 현재 사용자 워크플로우 요구를 충족한다.
- Alternatives considered:
  - Monaco/CodeMirror로 즉시 전환
  - 특정 소수 확장자만 지원하고 나머지는 미지원 처리
  - 테마/언어 설정 UI까지 한 번에 도입
- Impact / follow-up:
  - `main.md`에 F03.1을 `✅ Done`으로 추가하고 수용 기준/테스트 결과를 갱신한다.
  - 고급 하이라이팅(semantic tokens, 언어별 세부 설정)은 MVP 이후 별도 feature-draft로 다룬다.

## 2026-02-20 - F03.5 멀티 워크스페이스 정책(추가/중복/전환) 확정

- Context:
  - 단일 워크스페이스 구조에서 멀티 워크스페이스 확장을 진행하기 위해 상태 모델과 UX 정책을 사전에 고정할 필요가 있었음.
  - 사용자 합의 사항으로 열기/중복/전환 정책이 명확히 제시됨.
- Decision:
  - `Open Workspace`는 항상 "추가"로 동작한다.
  - 이미 열린 경로를 다시 선택하면 중복 세션을 만들지 않고 기존 워크스페이스를 활성화한다.
  - 워크스페이스별 파일/콘텐츠 상태는 유지하고, 워크스페이스 전환 시 `selectionRange`만 리셋한다.
  - 상태 관리는 기존 기술 스택(React Context + `useState`)을 유지한 채 멀티 세션 모델(`activeWorkspaceId`, `workspaceOrder`, `workspacesById`)로 확장한다.
- Rationale:
  - 기존 컴포넌트 인터페이스를 크게 깨지 않으면서 멀티 워크스페이스를 도입할 수 있다.
  - 중복 경로 포커스 정책은 UX 예측 가능성과 상태 일관성을 높인다.
  - selection 리셋은 전환 직후 오동작(다른 워크스페이스 selection 오염)을 줄이는 안전한 기본값이다.
- Alternatives considered:
  - `Open Workspace`를 기존 워크스페이스 교체 방식으로 유지
  - 동일 경로 재오픈 시 중복 워크스페이스 생성 허용
  - selection까지 워크스페이스별 완전 유지
- Impact / follow-up:
  - `main.md`에 F03.5를 `📋 Planned`로 추가하고 수용 기준/실행 순서를 갱신한다.
  - 구현 단계에서 워크스페이스별 read 요청 경합 제어(request token 분리)를 필수 검증 항목으로 포함한다.

## 2026-02-20 - F03.5 범위 확정(닫기/제거 + 트리 펼침 복원 포함)

- Context:
  - F03.5 드래프트 검토 중 열린 이슈 2건(워크스페이스 닫기/제거 포함 여부, 트리 펼침 상태 복원 여부)에 대한 결정을 사용자와 확정해야 했음.
- Decision:
  - 워크스페이스 닫기/제거 UX를 F03.5 범위에 포함한다.
  - 파일 트리 폴더 펼침 상태(`expandedDirectories`)를 워크스페이스별로 복원한다.
  - 기존 정책(`Open Workspace`는 항상 추가, 중복 경로는 기존 포커스, 전환 시 `selectionRange` 리셋)은 유지한다.
- Rationale:
  - 닫기/제거가 없으면 "항상 추가" 정책에서 목록이 누적되어 실사용 UX가 저하된다.
  - 워크스페이스별 트리 펼침 복원은 전환 비용을 낮추고 탐색 맥락을 유지한다.
  - 두 항목을 지금 포함하면 후속 F04+ 진행 시 리팩터링 재작업을 줄일 수 있다.
- Alternatives considered:
  - 닫기/제거를 후속 Feature로 분리
  - 트리 펼침 상태 복원을 제외하고 전환 시 매번 초기화
- Impact / follow-up:
  - `main.md`의 F03.5 포함/제외/수용 기준/리스크 항목을 본 결정 기준으로 갱신한다.
  - `feature_draft_f03_5_multi_workspace_foundation_and_support.md`의 Open Questions를 해소 상태로 업데이트한다.

## 2026-02-20 - F03.5 구현 완료 반영(멀티 워크스페이스 동작 고정)

- Context:
  - F03.5 구현이 완료되어 정책 수준 합의(추가/중복 포커스/전환/닫기)를 실제 코드 기준으로 확정해야 했음.
  - 사용자 수동 스모크와 자동 테스트(`npm test`, `npm run lint`, `npm run build`)까지 모두 통과했음.
- Decision:
  - F03.5를 스펙 상태 `✅ Done`으로 전환한다.
  - Workspace 상태 모델을 `activeWorkspaceId`, `workspaceOrder`, `workspacesById` 기반의 구현 상태로 확정한다.
  - 워크스페이스별 `expandedDirectories` 복원, 전환 시 `selectionRange` 리셋, 중복 경로 재오픈 시 기존 포커스를 제품 기본 동작으로 고정한다.
- Rationale:
  - 구현/테스트/수동 확인이 모두 완료된 항목을 Planned로 유지하면 스펙 드리프트가 발생한다.
  - 멀티 워크스페이스 정책을 명시적으로 Done 처리해야 후속 F04+ 설계의 전제가 안정화된다.
- Alternatives considered:
  - F03.5를 Partial 상태로 유지
  - 전환 시 `selectionRange`를 유지하도록 정책 변경
- Impact / follow-up:
  - `main.md`의 구현 상태/수용 기준/우선순위 실행 순서를 F03.5 완료 기준으로 동기화한다.
  - 후속 우선순위는 `F04 -> F05 -> F06 -> F07` 순으로 진행한다.

## 2026-02-20 - F04~F07 멀티 워크스페이스 영향 기준 리라이트

- Context:
  - F03.5 완료 이후 F04~F07 스펙이 단일 워크스페이스 관점으로 일부 서술되어 해석 충돌 가능성이 있었음.
  - 사용자 요청으로 스펙 리라이트를 통해 영향 구간을 정리해야 했음.
- Decision:
  - F04~F07 공통 기준을 `active workspace` 우선 정책으로 고정한다.
  - 링크/경로 해석은 활성 워크스페이스 기준으로 처리하고 cross-workspace 자동 fallback은 MVP에서 제외한다.
  - watcher 관련 planned IPC payload에 `workspaceId`를 포함해 세션 오염을 방지한다.
  - 미확정 항목은 `main.md`의 `Open Questions (F04~F07 선결)`로 분리한다.
- Rationale:
  - 구현 전 기준을 명시하지 않으면 F04~F07에서 상태 누수/경로 충돌/리소스 누수가 발생하기 쉽다.
  - 공통 규칙을 먼저 고정하면 feature-draft/implementation 범위 산정이 단순해진다.
- Alternatives considered:
  - F04~F07에서 각 기능별로 개별 정책을 뒤늦게 정하는 방식
  - 활성 워크스페이스 실패 시 다른 워크스페이스 자동 탐색을 기본 정책으로 채택하는 방식
- Impact / follow-up:
  - `main.md`가 F04~F07 구현 준비 문서로 바로 사용 가능해짐.
  - 다음 feature-draft는 `Open Questions`의 선택지를 결정사항으로 전환하는 작업을 포함한다.

## 2026-02-20 - F04~F07 Open Questions 결정 고정

- Context:
  - F04~F07 준비 과정에서 남겨둔 선택지(Open Questions)를 구현 전에 확정해야 범위 변동을 줄일 수 있었음.
- Decision:
  - F04: `activeSpec`만 워크스페이스별 복원한다(TOC/스크롤/activeHeading 복원은 후속).
  - F05: 활성 워크스페이스에서 링크 해석 실패 시 오류만 표시한다(자동 cross-workspace 탐색 없음).
  - F07: watcher는 `openWorkspace` 시점에 즉시 시작하고 `closeWorkspace` 시 즉시 정리한다.
  - F06/F08: 액션 가드는 공통 레이어를 도입하지 않고 기능별 개별 구현을 유지한다.
- Rationale:
  - 현재 우선순위는 구현 속도와 정책 명확성 확보이며, 공통화/고급 복원은 후속 확장으로 분리하는 편이 안정적이다.
- Alternatives considered:
  - F04에서 스크롤/heading까지 동시 복원
  - F05에서 실패 시 다른 워크스페이스 탐색 보조 UX 제공
  - F07 watcher 지연 시작
  - F06/F08 공통 guard layer 선도입
- Impact / follow-up:
  - `main.md`의 `Open Questions`는 해소 상태로 전환한다.
  - 다음 `feature-draft`는 본 결정들을 전제로 수용 기준/테스트 시나리오를 작성한다.
