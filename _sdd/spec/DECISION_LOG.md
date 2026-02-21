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

## 2026-02-20 - F04 구현 완료 반영(Markdown 듀얼 뷰 + workspace별 activeSpec 복원)

- Context:
  - F04 구현 후 사용자 수동 스모크와 자동 검증(`npm test`, `npm run lint`, `npm run build`)이 모두 통과했음.
  - 기존 스펙에는 F04가 Planned로 남아 있어 구현 상태와 문서 상태가 불일치했음.
- Decision:
  - F04를 `✅ Done`으로 전환한다.
  - `.md` 선택 시 center(raw)+right(rendered) 동시 표시를 기본 동작으로 고정한다.
  - `activeSpec`는 워크스페이스 세션별로 분리 복원하고, TOC/스크롤/activeHeading 복원은 후속으로 유지한다.
- Rationale:
  - 완료된 기능을 Planned로 유지하면 우선순위 큐/테스트 기준이 왜곡된다.
  - F05 이후 링크 점프 기능은 F04 기반 렌더 패널을 전제로 하므로 상태를 명확히 고정해야 한다.
- Alternatives considered:
  - F04를 Partial 상태로 유지
  - TOC/스크롤 복원까지 포함해 F04 범위를 확대
- Impact / follow-up:
  - `main.md`의 커버리지 매트릭스/컴포넌트 상태/Feature Queue/수용 기준을 F04 완료 상태로 동기화한다.
  - 다음 우선순위는 F04.1(링크 안전화) 이후 F05로 진행한다.

## 2026-02-20 - F04.1 구현 완료 반영(링크 안전 인터셉트 + copy popover, 글로벌 배너 미사용)

- Context:
  - rendered markdown 링크 클릭 시 renderer가 이동/리로드되는 문제가 있었고, F04.1에서 안전 인터셉트가 구현됨.
  - 후속 사용자 피드백으로 링크 클릭 시 상단 텍스트 배너는 UX 노이즈가 커서 제거 요청이 있었음.
- Decision:
  - F04.1을 `✅ Done`으로 전환한다.
  - same-workspace 상대 링크는 파일 열기로 처리하고, external/unresolved 링크는 이동 없이 copy popover를 표시한다.
  - 링크 액션 피드백은 글로벌 배너를 사용하지 않고 popover 중심으로 처리한다.
- Rationale:
  - 기본 네비게이션 차단으로 앱 상태 리셋 리스크를 제거하면서 링크 주소 복사 흐름을 유지할 수 있다.
  - 링크 클릭마다 글로벌 배너를 노출하지 않으면 반복 사용 시 시각적 잡음을 줄일 수 있다.
- Alternatives considered:
  - 외부 링크를 시스템 브라우저로 즉시 오픈
  - external/unresolved 링크에서 배너 + popover를 동시 유지
- Impact / follow-up:
  - `main.md`의 링크/경로 규칙(섹션 8)과 F05 범위를 재정의해 line jump 미구현 범위를 명확히 분리한다.
  - F05에서 `#Lx`, `#Lx-Ly` 점프/하이라이트를 F04.1 인터셉트 경로 위에 확장한다.

## 2026-02-20 - F05 구현 완료 반영(spec 링크 라인 점프 고정)

- Context:
  - F05 구현에서 `#Lx`, `#Lx-Ly` 링크 파싱, lineRange 전달, code viewer 점프/하이라이트가 완료됨.
  - 자동 검증(`npm test`, `npm run lint`, `npm run build`)과 사용자 수동 스모크가 모두 통과함.
- Decision:
  - F05를 스펙 상태 `✅ Done`으로 전환한다.
  - spec 링크 라인 점프는 active workspace 범위에서만 처리하고 cross-workspace fallback은 도입하지 않는다.
  - non-line hash(`path.md#heading`)는 파일 열기만 수행하고 heading 위치 스크롤은 후속(F09)으로 유지한다.
- Rationale:
  - 구현 완료 항목을 Planned로 유지하면 feature queue와 수용 기준이 실제 코드와 어긋난다.
  - active workspace 경계 정책을 명확히 고정해야 멀티 워크스페이스 상태 오염을 방지할 수 있다.
- Alternatives considered:
  - F05를 Partial 상태로 유지
  - 링크 해석 실패 시 다른 워크스페이스 자동 탐색/전환 도입
  - non-line hash를 즉시 heading 스크롤까지 포함해 확장
- Impact / follow-up:
  - `main.md`의 커버리지 매트릭스/컴포넌트 상태/링크 규칙/Feature Queue/수용 기준을 F05 완료 상태로 동기화한다.
  - 다음 우선순위는 F06/F07로 이동한다.

## 2026-02-20 - F06.1 우클릭 복사 컨텍스트 정책 선반영

- Context:
  - F06 구현 전 단계에서 코드 뷰어/파일 트리 우클릭 복사 UX를 별도 feature로 분리해 스펙에 먼저 고정할 필요가 있었음.
  - 사용자 요청으로 경로 포맷과 우클릭 시 selection 동작을 미리 확정해 혼선을 줄이기로 했음.
- Decision:
  - `main.md` Priority Queue에 `F06.1`(P0, S)을 신규 추가하고 실행 순서를 `F06 -> F06.1 -> F07`로 고정한다.
  - 경로 복사는 `relative path`로 고정한다.
  - CodeViewer 우클릭 시 기존 선택 범위 안이면 selection을 유지하고, 범위 밖이면 해당 라인 단일 선택으로 전환한다.
  - F06은 툴바 복사 2종 범위로 유지하고, 우클릭 복사 UX는 F06.1 범위로 분리한다.
- Rationale:
  - 툴바 복사와 탐색 중 우클릭 복사는 사용 맥락이 달라 별도 feature로 나누는 편이 구현/검증/회귀 관리에 유리하다.
  - 우클릭 selection 정책을 사전에 고정하면 구현 시 UX 일관성과 테스트 기준이 명확해진다.
- Alternatives considered:
  - F06에 우클릭 복사를 함께 포함해 한 번에 구현
  - 우클릭 시 항상 해당 단일 라인으로 selection 강제 전환
  - 경로 복사 포맷을 절대경로로 유지
- Impact / follow-up:
  - `main.md`의 컴포넌트 상태/상태 모델/Feature Queue/수용 기준/리스크를 F06.1 planned 기준으로 동기화한다.
  - 구현 완료 후 `spec-update-done`에서 F06.1 상태를 `✅ Done`으로 전환한다.

## 2026-02-20 - F04 동작 보정 반영(activeSpec 기반 우측 패널 유지)

- Context:
  - 구현 중 코드 파일 선택 시 우측 markdown 렌더 패널이 비워져 스펙+코드 동시 작업 흐름이 끊기는 문제가 확인되었음.
  - 제품 목표는 코드와 스펙을 병렬로 참조하는 3패널 워크벤치이며, 우측 패널이 active file 타입에 종속되면 목표 UX와 충돌함.
- Decision:
  - 우측 rendered spec 패널의 데이터 소스는 `activeSpec` 세션 상태로 고정한다.
  - Markdown 파일 선택 시에만 `activeSpec`/`activeSpecContent`를 갱신하고, 코드/비-Markdown 파일 선택 시에는 마지막 spec 렌더 상태를 유지한다.
  - spec 렌더 로딩/오류는 코드 프리뷰 상태와 분리해 `isReadingSpec`/`activeSpecReadError`로 관리한다.
- Rationale:
  - center(code)와 right(spec)를 독립 상태로 유지해야 “스펙 보면서 코드 읽기” 핵심 시나리오가 끊기지 않는다.
  - spec 렌더 상태를 분리하면 코드 파일 읽기 에러/preview unavailable 이벤트가 우측 패널을 오염시키지 않는다.
- Alternatives considered:
  - `activeFile`이 Markdown일 때만 우측 패널 표시
  - 코드 파일 선택 시 우측 패널을 placeholder로 초기화
- Impact / follow-up:
  - `main.md`의 F04 정의/상태 모델/수용 기준/테스트 수치를 실제 구현(총 54 tests, `App.test.tsx` 17건)에 맞춰 동기화한다.
  - F09 진행 시 active heading/section 추출도 동일하게 `activeSpec` 기반으로 확장한다.

## 2026-02-21 - F06.2 복사 UX 통합 + F08/F09 진입점 재정의(Planned)

- Context:
  - 사용자 요청으로 복사 UX 단순화를 위해 코드 선택 드래그, 우클릭 액션 통합, 툴바 복사 버튼 제거, 디렉터리 경로 복사를 한 묶음으로 계획해야 했음.
  - 추가로 `Copy Both` 라벨과 `ContextToolbar` 완전 제거 여부, F08/F09의 후속 연결 방식이 결정되어야 했음.
- Decision:
  - Priority Queue에 `F06.2`(P0, M)를 신규 추가한다.
  - CodeViewer 우클릭 액션 라벨은 `Copy Both`로 고정하고 payload 포맷은 기존 F06(`relative/path:Lx-Ly` + 본문)을 재사용한다.
  - F06.2에서 `Copy Active File Path`/`Copy Selected Lines` 툴바 버튼과 `context-toolbar` 컴포넌트를 제거한다.
  - FileTree 우클릭 경로 복사는 파일뿐 아니라 디렉터리까지 확장한다.
  - F08/F09는 toolbar 의존이 아니라 각각 워크스페이스 액션 영역(F08), SpecViewer 액션 영역(F09)으로 진입점을 재정의한다.
- Rationale:
  - 복사 기능을 탐색 맥락(코드/트리 우클릭)으로 통합하면 작업 전환 비용이 줄고 UI 구조가 단순해진다.
  - 툴바 제거를 먼저 명시해야 F08/F09가 향후 잘못된 UI 전제(toolbar 확장)에 묶이지 않는다.
- Alternatives considered:
  - 기존 라벨(`Copy Selected Lines`) 유지
  - `context-toolbar`를 최소 골격으로 유지한 채 F08/F09를 연결
  - 디렉터리 우클릭 복사를 제외하고 파일만 지원
- Impact / follow-up:
  - `main.md`의 우선순위 큐, 상태/상호작용 규칙, 수용 기준, 리스크를 F06.2 planned 기준으로 갱신한다.
  - 다음 구현 순서는 `F06.1 -> F06.2 -> F07 -> F08/F09`를 권장한다.

## 2026-02-21 - F06.1/F06.2 구현 완료 반영(우클릭 복사 통합 + 툴바 제거)

- Context:
  - F06.1/F06.2 구현과 사용자 수동 스모크가 완료되었고 자동 검증(`npm test`, `npm run lint`, `npm run build`)이 모두 통과했음.
  - 스펙에는 F06.1/F06.2가 Planned로 남아 있어 실제 코드 상태와 문서 상태가 불일치했음.
- Decision:
  - F06.1, F06.2를 `✅ Done`으로 전환한다.
  - 복사 UX는 상단 툴바가 아닌 코드/파일트리 우클릭 컨텍스트 메뉴 중심 구조로 고정한다.
  - CodeViewer 복사 액션은 `Copy Selected Content`, `Copy Both`, `Copy Relative Path`로 고정한다.
  - FileTree 우클릭 경로 복사는 파일/디렉터리 모두에서 지원하도록 고정한다.
- Rationale:
  - 구현 완료 항목을 Planned로 유지하면 우선순위 큐, 수용 기준, 회귀 테스트 기준이 왜곡된다.
  - 우클릭 중심 복사 흐름은 실제 사용 맥락(코드/트리 탐색)과 정합성이 높고 UI 복잡도를 줄인다.
- Alternatives considered:
  - F06 툴바 복사 버튼 유지 + 우클릭 기능 병행
  - 디렉터리 우클릭 복사를 제외하고 파일만 지원
  - `Copy Both` 대신 기존 `Copy Selected Lines` 라벨 유지
- Impact / follow-up:
  - `main.md` 코드베이스 인벤토리/커버리지 매트릭스/상태 규칙/Feature Queue/수용 기준/검증 수치를 최신 구현 기준으로 동기화한다.
  - 다음 우선순위는 `F07 -> F08 -> F09`로 조정한다.

## 2026-02-21 - F07 구현 완료 반영(watcher changed indicator + clear 시점 고정)

- Context:
  - F07 구현으로 워크스페이스 단위 파일 watcher와 파일 트리 changed indicator(`●`)가 동작하기 시작했음.
  - 사용자 피드백으로 marker clear 시점은 "파일을 연 순간"이 아니라 "해당 파일을 떠나는 순간"으로 조정이 필요했음.
  - 워크스페이스 전환만으로 marker가 사라지면 변경 확인 흐름이 깨질 수 있어 clear 예외 규칙이 필요했음.
- Decision:
  - F07을 스펙 상태 `✅ Done`으로 전환한다.
  - watcher lifecycle은 `openWorkspace -> watchStart`, `closeWorkspace/unmount -> watchStop`으로 고정한다.
  - watch 이벤트에 active file이 포함되면 코드 뷰어 본문을 자동 re-read한다.
  - changed marker는 같은 워크스페이스에서 다른 파일을 열어 이전 파일을 떠나는 시점에만 clear한다.
  - 워크스페이스 전환만으로는 changed marker를 clear하지 않는다.
- Rationale:
  - 변경 감지와 본문 갱신을 자동화해야 수동 새로고침 없이 최신 상태를 확인할 수 있다.
  - marker clear 타이밍을 "읽고 떠날 때"로 고정하면 아직 검토하지 않은 변경 신호를 보존할 수 있다.
  - workspace switch는 파일 검토 완료 의미가 아니므로 clear 트리거로 쓰기 부적합하다.
- Alternatives considered:
  - 파일을 여는 즉시 marker clear
  - 워크스페이스 전환 시 marker clear
  - active file 자동 re-read 없이 marker만 표시
- Impact / follow-up:
  - `main.md`의 F07 상태, 상호작용 규칙, 수용 기준, 테스트 수치를 구현 기준으로 동기화한다.
  - 다음 우선순위는 `F08/F09`로 유지하고, F07.1(파일 히스토리/뒤로가기)은 별도 feature로 관리한다.

## 2026-02-21 - F07.1 구현 완료 반영(워크스페이스별 파일 히스토리 + 입력 바인딩 확장)

- Context:
  - F07.1 구현으로 워크스페이스별 파일 히스토리(`Back`/`Forward`)와 분기 truncate 정책이 코드/테스트에 반영되었음.
  - macOS 환경에서 `swipe` 이벤트가 기기/설정에 따라 불안정하게 전달되는 사례가 있어 사용자 확인 과정에서 fallback 요구가 추가되었음.
- Decision:
  - F07.1을 스펙 상태 `✅ Done`으로 전환한다.
  - 히스토리 정책은 워크스페이스별 독립 스택/포인터, 중복 push 방지, back 후 신규 open 시 forward truncate로 고정한다.
  - 입력 바인딩은 헤더 버튼 + mouse back/forward + `app-command`/`swipe` + renderer `wheel(deltaX)` fallback을 동일 history 액션으로 통합한다.
  - 이동 불가 상태(`canGoBack/canGoForward=false`)에서 모든 입력 바인딩은 no-op으로 처리한다.
- Rationale:
  - 파일 탐색 왕복을 빠르게 만들되 기존 멀티 워크스페이스 상태 오염을 막기 위해 히스토리 경계를 워크스페이스 단위로 유지해야 한다.
  - `swipe` 단일 경로에 의존하면 입력 장치/OS 설정 차이로 사용자 경험이 깨질 수 있어 fallback 경로가 필요하다.
- Alternatives considered:
  - 헤더 버튼만 지원하고 포인터/제스처 바인딩은 제외
  - `swipe` 이벤트만 지원하고 fallback 미도입
  - 히스토리를 전역(워크스페이스 공용)으로 운영
- Impact / follow-up:
  - `main.md`의 코드 인벤토리/상태 모델/IPC 계약/Feature Queue/수용 기준/리스크를 F07.1 완료 기준으로 동기화한다.
  - 다음 우선순위는 `F08/F09`로 유지한다.
