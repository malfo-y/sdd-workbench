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

## 2026-02-21 - F08 범위 확장(Open in VSCode 추가 + 버튼 위치 고정)

- Context:
  - F08이 기존에는 iTerm 단일 액션 기준으로 정의되어 있었음.
  - 사용자 요청으로 VSCode 열기 액션이 추가되었고, 버튼 위치를 헤더가 아닌 좌측 `Current Workspace` 블록 아래로 고정해야 했음.
- Decision:
  - F08 범위를 `Open in iTerm` + `Open in VSCode` 2개 액션으로 확장한다.
  - F08 액션 버튼은 상단 헤더가 아닌 좌측 패널의 `Current Workspace` 요약 블록 바로 아래에 배치한다.
  - IPC 계획은 `system:openInIterm` + `system:openInVsCode` 2채널로 관리한다.
- Rationale:
  - 워크스페이스 실행 액션은 현재 워크스페이스 맥락 근처(좌측 요약 블록)에서 제공하는 편이 발견 가능성과 의미 정합성이 높다.
  - iTerm/VSCode를 함께 제공하면 실제 작업 루프(터미널 + 에디터 진입) 전환 비용을 줄일 수 있다.
- Alternatives considered:
  - iTerm 단일 액션 유지
  - 액션 버튼을 헤더(Workspace switcher 인접)에 유지
- Impact / follow-up:
  - `main.md`의 F08 설명/완료 기준/예상 변경 파일/수용 기준/IPC 계획을 확장된 요구사항 기준으로 업데이트한다.
  - 다음 단계에서 `implementation-plan`으로 F08을 작업 분할할 때 2개 액션 및 위치 제약을 그대로 적용한다.

## 2026-02-21 - F08 액션 UI 형태 고정(`Open In:` + 아이콘 버튼)

- Context:
  - 사용자 요청으로 F08 액션의 시각적 표현을 텍스트 버튼보다 간결한 형태로 고정할 필요가 있었음.
- Decision:
  - 좌측 `Current Workspace` 아래 F08 액션 UI를 `Open In:` 라벨 + 아이콘 버튼 2개(iTerm, VSCode)로 고정한다.
  - 아이콘 버튼은 tooltip/접근성 라벨(`Open in iTerm`, `Open in VSCode`)을 반드시 제공한다.
  - 활성 워크스페이스가 없으면 두 버튼은 disabled 처리한다.
- Rationale:
  - 액션 밀도를 줄이면서도 라벨(`Open In:`)을 남기면 의미 전달과 시각적 간결성을 동시에 확보할 수 있다.
  - 아이콘 단독 UI는 접근성 라벨/툴팁을 같이 고정해야 사용성 저하를 막을 수 있다.
- Alternatives considered:
  - 텍스트 버튼(`Open in iTerm`, `Open in VSCode`) 유지
  - 아이콘만 배치하고 라벨 없이 사용
- Impact / follow-up:
  - `main.md`의 F08 포함 범위/완료 기준/레이아웃 설명에 icon UI 정책을 반영한다.

## 2026-02-21 - F08 구현 완료 반영(Open in iTerm/VSCode)

- Context:
  - F08 구현이 완료되었고 사용자 수동 스모크에서 동작 확인이 끝났음.
  - 자동 검증(`npm test`, `npm run lint`, `npm run build`)이 모두 통과했고, 테스트 수치는 총 93건(`App.test.tsx` 34건)으로 갱신되었음.
  - 기존 스펙에는 F08이 Planned로 남아 있어 구현 상태와 문서 상태가 불일치했음.
- Decision:
  - F08을 스펙 상태 `✅ Done`으로 전환한다.
  - `system:openInIterm`/`system:openInVsCode` 채널 상태를 Implemented로 전환한다.
  - 좌측 `Current Workspace` 아래 `Open In:` 아이콘 버튼(iTerm/VSCode) + disabled/배너 오류 피드백 동작을 구현 기준으로 고정한다.
- Rationale:
  - 완료된 기능을 Planned로 유지하면 우선순위 큐와 수용 기준의 기준선이 왜곡된다.
  - IPC 계약/UI 배치/접근성 라벨을 구현 결과로 고정해야 후속 F09 범위를 분리해 안정적으로 진행할 수 있다.
- Alternatives considered:
  - F08을 Partial 상태로 유지
  - iTerm만 Done 처리하고 VSCode는 별도 Feature로 분리
- Impact / follow-up:
  - `main.md`의 메타데이터/인벤토리/커버리지/IPC 계약/Feature Queue/수용 기준/검증 수치를 F08 완료 기준으로 동기화한다.
  - 다음 우선순위는 F09(스펙 섹션 복사)와 F10(안정화)로 정리한다.

## 2026-02-21 - F09 범위 교체(스펙 섹션 복사 -> 앱 재시작 세션 복원)

- Context:
  - 사용자 우선순위가 “스펙 섹션 복사”보다 “앱 재시작 후 작업 문맥 복원(워크스페이스/활성 파일/파일 위치)”에 더 높게 설정되었음.
  - 멀티 워크스페이스(F03.5)와 파일 히스토리(F07.1)가 이미 구현되어 있어 세션 영속화 계층을 추가하면 실사용성이 크게 개선될 수 있음.
- Decision:
  - F09를 `Copy Current Spec Section`에서 `앱 재시작 세션 복원 + 라인 기준 위치 복원`으로 교체한다.
  - 복원 범위는 열린 워크스페이스 목록, active workspace, workspace별 active file, 파일별 마지막 라인으로 고정한다.
  - 라인 복원은 픽셀 스크롤 복원 대신 라인 기준 복원으로 고정하고, 파일 길이 변경 시 EOF clamp를 허용한다.
  - 영속화 저장소는 renderer `localStorage`를 기본으로 한다.
  - 기존 F09(섹션 복사)는 현재 우선순위 큐에서 제외하고 필요 시 신규 Feature ID로 재등록한다.
- Rationale:
  - 앱 재시작 후 바로 작업 문맥을 복원하면 실제 개발 루프의 전환 비용을 크게 줄일 수 있다.
  - 라인 기준 복원은 구현 복잡도를 통제하면서도 사용자 체감 가치가 높은 최소 요건이다.
  - 기존 F09 요구는 다른 복사 UX(F06.1/F06.2)와 중복 가치가 있어 우선순위를 낮추는 것이 합리적이다.
- Alternatives considered:
  - 기존 F09(섹션 복사)를 유지하고 세션 복원을 F10 이후로 이월
  - 세션 복원에 픽셀 단위 스크롤 복원까지 포함
  - localStorage 대신 별도 IPC 기반 저장소를 즉시 도입
- Impact / follow-up:
  - `main.md`의 범위/커버리지/상태 모델/신뢰성/Feature Queue/수용 기준/리스크를 F09 교체 기준으로 동기화한다.
  - 다음 구현 순서는 `F09(세션 복원) -> F10(안정화)`로 유지한다.

## 2026-02-21 - F09 구현 완료 반영(세션 복원 + activeSpec 복원 포함)

- Context:
  - F09 구현이 완료되었고 사용자 수동 스모크에서 앱 재시작 복원이 확인되었음.
  - 초기 구현 이후 사용자 피드백으로 우측 markdown 렌더 패널(`activeSpec`) 복원이 누락된 점이 확인되어 후속 보완이 추가되었음.
  - 복원 초기화 타이밍에서 stale 인덱싱 응답이 실패로 처리되는 경계 케이스가 확인되어 안정성 보정이 필요했음.
- Decision:
  - F09를 스펙 상태 `✅ Done`으로 전환한다.
  - 세션 snapshot 범위를 `workspaces + active workspace + active file + activeSpec + fileLastLineByPath`로 고정한다.
  - 복원 플로우에서 인덱싱 실패(`failed`)는 workspace skip/continue로 처리하고, stale 응답(`stale`)은 no-op으로 처리한다.
  - 초기 hydrate 완료 전 snapshot clear/save 루프를 차단하는 가드(`hasHydratedSnapshot`)를 유지한다.
- Rationale:
  - 코드/스펙 병행 작업 UX의 핵심은 코드 파일과 별도로 spec 렌더 상태를 복원하는 데 있으므로 `activeSpec` 복원이 필수다.
  - 복원 과정의 부분 실패/경합을 전체 실패로 승격하지 않아야 멀티 워크스페이스 환경에서 사용성이 유지된다.
  - hydrate 가드가 없으면 시작 직후 snapshot 손실 가능성이 있어 세션 복원 신뢰성이 떨어진다.
- Alternatives considered:
  - `activeSpec` 복원을 F10으로 이월
  - stale 인덱싱 응답을 실패로 간주해 해당 workspace를 닫음
  - hydrate 직후 즉시 저장을 허용하고 clear/save 경합은 무시
- Impact / follow-up:
  - `main.md`의 F09 포함 범위/완료 기준/상태 모델/수용 기준/검증 수치를 구현 결과로 동기화한다.
  - 다음 우선순위는 `F10(안정화 패스)`로 단순화한다.

## 2026-02-21 - F10.1 구현 완료 반영(rendered markdown 선택 우클릭 `Go to Source`)

- Context:
  - 사용자 요청으로 rendered markdown 패널에서 텍스트를 선택한 뒤 원본 markdown source line으로 즉시 이동하는 보조 탐색 UX가 필요했음.
  - 링크 기반 점프(F04.1/F05)는 구현되어 있었지만, 링크가 없는 일반 본문 문장에서는 source 왕복 경로가 부족했음.
  - 구현/테스트/수동 스모크가 완료되어 스펙 동기화가 필요했음.
- Decision:
  - F10.1을 스펙 상태 `✅ Done`으로 전환한다.
  - source line 매핑은 markdown 블록 시작 라인(`data-source-line`) 기반 best-effort로 고정한다.
  - `Go to Source` 실행 대상은 항상 현재 `activeSpec`으로 고정하고 단일 라인 점프(`Lx-Lx`)로 처리한다.
  - selection이 없거나 line 해석 실패 시 컨텍스트 액션을 노출하지 않거나 no-op 처리한다.
  - 링크 popover와 source popover는 상호 배타 상태로 관리한다.
- Rationale:
  - line 단위 매핑은 구현 복잡도를 낮추면서도 문서-코드 왕복 UX를 빠르게 제공할 수 있다.
  - `activeSpec` 고정 정책은 멀티 워크스페이스 경계에서 탐색 모호성을 줄이고 기존 F04~F05 규칙과 정합성이 높다.
  - 액션 노출 조건을 제한하면 오작동/잘못된 점프를 줄일 수 있다.
- Alternatives considered:
  - 문자/토큰 단위 정밀 매핑 도입
  - cross-workspace source 탐색
  - 링크/selection 액션 통합 단일 팝오버
- Impact / follow-up:
  - `main.md`의 인벤토리/SpecViewer 계약/상태 규칙/Feature Queue/수용 기준/테스트 수치(113건)를 F10.1 기준으로 동기화한다.
  - F10에서는 F10.1의 best-effort 매핑 정확도 개선 여지를 안정화 항목으로 검토한다.

## 2026-02-21 - F10 구현 완료 반영(보안/성능/테스트 안정화 패스)

- Context:
  - F10 구현으로 markdown sanitize/리소스 경계, 인덱싱 guardrail, 코드 하이라이트 메모이제이션이 코드/테스트에 반영되었음.
  - 구현 로그 기준 자동 테스트가 125건으로 증가했고(`App.test.tsx` 42건 포함), `npm run lint`/`npm run build`도 통과했음.
  - 스펙에는 F10이 Planned로 남아 있어 구현 상태와 문서 상태가 불일치했음.
- Decision:
  - F10을 스펙 상태 `✅ Done`으로 전환한다.
  - markdown 렌더 보안 정책은 sanitize allowlist + workspace 경계 리소스 허용으로 고정한다.
  - 인덱싱 cap은 `10,000` 노드로 고정하고 `workspace:index.truncated` 신호를 renderer 배너에 연결한다.
  - 차단 리소스는 `blocked placeholder text`로 표시한다.
  - `data:` URI는 `data:image/*`만 제한 허용하며, 코드 뷰어 이미지 프리뷰는 F10.2로 분리한다.
- Rationale:
  - F10은 신규 UX 추가 없이 안정성/보안/성능 기준선을 고정하는 단계이므로 정책을 명시적으로 문서화해야 회귀를 방지할 수 있다.
  - index cap과 truncation 신호를 함께 고정해야 대형 워크스페이스에서 성능과 사용자 피드백을 동시에 확보할 수 있다.
  - `data:image/*` 제한 허용은 안전성과 실사용성 간 균형을 맞추는 최소 선택이다.
- Alternatives considered:
  - 인덱싱 cap 미도입(무제한 인덱싱 유지)
  - `data:` URI 전체 차단 또는 전체 허용
  - 차단 리소스 no-op 처리(placeholder 미표시)
- Impact / follow-up:
  - `main.md`의 메타데이터/인벤토리/IPC 계약/성능·보안·신뢰성 기준/Feature Queue/수용 기준/검증 수치를 F10 완료 기준으로 동기화한다.
  - F10.2(코드 뷰어 이미지 프리뷰)는 별도 feature로 유지한다.

## 2026-02-21 - F10.2 구현 완료 반영(코드 뷰어 이미지 프리뷰 + 복원/종료 안정화)

- Context:
  - F10.2 구현으로 코드 뷰어에 이미지 프리뷰 모드가 추가되었고, `workspace:readFile` 계약이 `imagePreview`/`blocked_resource`까지 확장되었음.
  - 사용자 검증에서 “이미지 active file 복원 시 stale 인덱스 경합으로 프리뷰가 누락될 수 있는 문제”와 “앱 종료 지연” 피드백이 있었고 후속 수정이 반영되었음.
  - 최신 게이트 결과는 `npm test` 133건 통과(`App.test.tsx` 46건 포함), `npm run lint`/`npm run build` 통과임.
- Decision:
  - F10.2를 스펙 상태 `✅ Done`으로 전환한다.
  - 코드 뷰어 파일 읽기 계약을 `{ ok, content, imagePreview?, previewUnavailableReason? }`로 고정하고, 차단 리소스는 `blocked_resource`로 처리한다.
  - 세션 복원 시 stale 인덱스 응답이 발생해도 active file/spec 복원을 계속하는 정책으로 고정한다.
  - watcher 종료는 single-flight 정리(`stopAllWorkspaceWatchersPromise`)를 사용해 중복 정리 호출로 인한 종료 지연을 완화한다.
- Rationale:
  - 텍스트 전용 프리뷰는 이미지 자산 확인 흐름에서 사용성이 낮아 read-only 이미지 렌더를 기본 제공하는 것이 효과적이다.
  - stale 인덱스 경합을 복원 중단 조건으로 두면 이미지/마크다운 복원 누락이 발생하므로 continue 정책이 더 안전하다.
  - 앱 종료 경로에서 watcher 정리를 단일 비동기 플라이트로 수렴시키면 체감 종료 지연과 중복 close 비용을 줄일 수 있다.
- Alternatives considered:
  - 이미지 파일도 기존처럼 바이너리 preview-unavailable만 제공
  - stale 인덱스 응답을 복원 실패로 처리해 해당 workspace를 스킵
  - 종료 시점마다 watcher 정리를 중복 호출하고 각 호출에서 개별 close
- Impact / follow-up:
  - `main.md`의 인벤토리/상태 모델/IPC 계약/F10.2 섹션/수용 기준/테스트 수치를 최신 코드 기준으로 동기화한다.
  - 이미지 프리뷰는 read-only로 고정하고, 확대/축소/패닝 및 추가 포맷(`bmp`, `ico`)은 후속 backlog로 유지한다.

## 2026-02-22 - F11 구현 완료 + review follow-up 반영

- Context:
  - F11(인라인 코드 코멘트 + LLM Export Bundle) 구현이 완료되었고, 자동 테스트/린트/빌드 게이트를 통과했음.
  - implementation-review에서 지적된 두 이슈(클립보드 export 성공 판정 불일치, 종료 시 write 중단 가능성)가 후속 수정으로 반영되었음.
  - 스펙 문서에는 F11이 Planned로 남아 있었고, IPC/수용 기준/검증 수치가 최신 코드와 드리프트 상태였음.
- Decision:
  - F11 상태를 `✅ Done`으로 전환한다.
  - comments source of truth(`.sdd-workbench/comments.json`), `_COMMENTS.md` overwrite export, bundle 길이 제한(`MAX_CLIPBOARD_CHARS=30000`) 정책을 구현 기준으로 고정한다.
  - clipboard export 성공 피드백은 실제 clipboard write 성공 시에만 집계되도록 고정한다.
  - 종료 경로는 watcher 정리 전에 in-flight workspace write settle을 최대 5초까지 대기하고, 이후 watcher 종료 타임아웃(1.5초)을 적용한다.
- Rationale:
  - F11은 코드 뷰어 우클릭 코멘트 작성과 LLM 전달 번들 생성이라는 핵심 사용자 흐름을 완결했고, 실패 경로까지 포함한 신뢰성 정책을 문서에 고정해야 회귀를 줄일 수 있다.
  - clipboard 성공/실패 오판은 사용자 신뢰에 직접 영향을 주므로 성공 판정 기준을 구현 동작과 일치시켜야 한다.
  - 종료 시 write settle 대기를 명시해야 comments 저장/export 중 데이터 손실 가능성을 줄일 수 있다.
- Alternatives considered:
  - F11을 partial로 유지하고 후속 기능(렌더 패널 코멘트 진입)까지 포함해 한 번에 done 처리
  - 종료 경로에서 기존 watcher single-flight만 유지하고 write settle 대기는 도입하지 않음
- Impact / follow-up:
  - `main.md` 메타데이터/인벤토리/상태 모델/IPC 계약/Feature Queue/수용 기준/검증 수치를 F11 완료 기준으로 동기화한다.
  - 후속 코멘트 UX(예: rendered markdown에서 코멘트 진입/가시화)는 신규 feature draft로 분리한다.

## 2026-02-22 - F11.1 구현 완료 반영(rendered markdown 코멘트 진입 + marker + 증분 export)

- Context:
  - F11.1 구현으로 rendered markdown selection 우클릭 `Add Comment` 진입, 코드/문서 코멘트 marker, 증분 export(`pending-only`, `exportedAt`)가 코드/테스트에 반영되었음.
  - implementation-review 최신 결론이 `READY`로 확정되었고, mixed export 부분 성공 시나리오(clipboard 실패/file 성공, clipboard 성공/file 실패)가 테스트로 고정되었음.
  - 기존 `main.md`는 F11까지만 반영되어 F11.1 기능 상태/수용 기준/검증 수치(158 passed)와 드리프트가 있었음.
- Decision:
  - F11.1을 스펙 상태 `✅ Done`으로 전환한다.
  - rendered markdown source popover 액션 순서를 `Add Comment` -> `Go to Source`로 고정한다.
  - 코멘트 marker 매핑은 exact-match 우선, 실패 시 nearest fallback(동률이면 더 작은 line) 규칙으로 고정한다.
  - export는 pending comments(`exportedAt` 미지정)만 대상으로 하고, 최소 1개 target 성공 시 snapshot 코멘트에 `exportedAt`를 기록한다.
  - 테스트/검증 수치는 최신 실행값(`npm test`: 158 passed, `npm run lint`: pass, `npm run build`: pass)으로 동기화한다.
- Rationale:
  - 스펙-코드 왕복 루프에서 문서 패널에서 즉시 코멘트를 남기고(진입점), 양쪽 패널에서 코멘트 위치를 확인하는 가시성(marker)을 함께 제공해야 실제 작업 효율이 올라간다.
  - 증분 export를 고정하면 이미 처리한 코멘트 재전송을 줄여 LLM 작업 흐름의 중복을 줄일 수 있다.
  - mixed export 결과를 성공 target 기준으로 기록해야 사용자 피드백과 실제 상태(`exportedAt`)가 일치한다.
- Alternatives considered:
  - F11.1을 partial 상태로 유지하고 marker/증분 export를 후속으로 분리
  - marker를 exact-match만 허용하고 fallback 미지원
  - export 성공 여부를 전체 all-or-nothing으로 처리
- Impact / follow-up:
  - `main.md` 메타데이터/인벤토리/상태 규칙/Feature Queue/수용 기준/검증 수치/결론을 F11.1 완료 기준으로 동기화한다.
  - 후속 backlog는 코멘트 편집/삭제, marker 상세 패널, re-export-all/reset UX로 분리한다.

## 2026-02-22 - 스펙 구조 리라이트(인덱스 + 하위 문서 분할)

- Context:
  - `/_sdd/spec/main.md`가 1300+ 라인으로 확장되면서 인벤토리/Feature Queue/수용 기준/운영 기준이 단일 파일에 과집중되어 탐색성이 낮아졌음.
  - F11/F11.1까지 구현 완료된 상태에서 같은 정책(코멘트/증분 export/마커)이 여러 섹션에 반복 기술되어 문서 유지비용이 증가했음.
  - 사용자 요청으로 `spec-rewrite`를 적용해 스펙 구조를 재정렬할 필요가 생겼음.
- Decision:
  - `main.md`는 인덱스/요약 허브로 축소하고, 상세는 `/_sdd/spec/sdd-workbench/` 하위 주제 문서로 분할한다.
  - 분할 구조는 `01-overview`, `02-architecture`, `03-components`, `04-interfaces`, `05-operational-guides`, `appendix`로 고정한다.
  - 상세 기능 이력과 리스크/백로그는 appendix로 이동하고, 구현/정책 결정의 source of truth는 계속 `DECISION_LOG.md`로 유지한다.
- Rationale:
  - 구현 반영(`spec-update-done`) 시 변경 범위를 주제 문서 단위로 줄이면 드리프트 위험과 리뷰 비용을 낮출 수 있다.
  - 인덱스-하위문서 구조는 읽기 경로를 단순화하고, 신규 기능(F12+) 추가 시 문서 충돌을 완화한다.
- Alternatives considered:
  - 단일 `main.md` 유지 + 섹션 정리만 수행
  - `main.md`를 유지하고 appendix만 추가
  - 기능별(F01~) 개별 문서로 과도 분할
- Impact / follow-up:
  - `main.md` 링크 허브를 기준으로 하위 문서를 탐색하는 문서 운영 규칙을 적용한다.
  - 추후 기능 추가 시 우선 해당 주제 문서만 갱신하고, summary 수준 변경만 인덱스에 반영한다.
  - appendix 비대화 추이를 모니터링하고 필요 시 릴리스 단위 아카이브를 분리한다.

## 2026-02-22 - F11.2 구현 완료 반영(spec jump scroll 유지 + collapsed marker 버블링)

- Context:
  - rendered spec에서 `Go to Source` 또는 spec link 기반 code jump 시 same-spec 선택 경로에서도 spec read/reset이 발생해 패널 스크롤이 상단으로 튀는 UX 회귀가 있었음.
  - file tree 변경 마커는 변경 파일이 collapse된 디렉토리 하위에 있으면 사용자에게 보이지 않아 watcher 가시성이 저하되었음.
  - F11.2 구현으로 `workspace-context`, `App`, `SpecViewerPanel`, `FileTreePanel`과 대응 테스트가 갱신되었고, 전체 게이트(`npm test`, `npm run lint`, `npm run build`)가 통과했음.
- Decision:
  - F11.2를 스펙 상태 `✅ Done`으로 전환한다.
  - same-spec source jump는 가능한 경우 `activeSpecContent`를 재사용해 rendered spec reset/read를 피한다.
  - rendered spec scroll position은 `workspace + activeSpecPath` 키 기준으로 런타임 저장/복원한다.
  - changed marker는 visible 파일 우선, 숨겨진 경우 nearest visible collapsed ancestor 디렉토리로 버블링한다.
- Rationale:
  - 스펙-코드 왕복 작업의 핵심은 문맥 유지이며, same-spec jump에서 불필요한 리셋을 제거해야 반복 스크롤 비용을 줄일 수 있다.
  - watcher 신호는 collapse 상태에서도 보여야 의미가 있으므로 상위 디렉토리 버블링이 필요하다.
  - 런타임 복원은 구현 복잡도를 낮추면서도 사용 체감 개선 효과가 즉시 크다.
- Alternatives considered:
  - same-spec jump에서도 항상 readFile 재호출(기존 유지)
  - changed marker를 파일 노드에만 고정(버블링 미지원)
  - scroll 복원을 앱 재시작 영속 복원까지 한 번에 확장
- Impact / follow-up:
  - `main.md`, `01-overview.md`, `02-architecture.md`, `03-components.md`, `04-interfaces.md`, `05-operational-guides.md`, `appendix.md`에 F11.2 완료 상태와 계약을 반영한다.
  - 후속으로 앱 재시작 후 rendered spec scroll 복원, TOC active tracking은 별도 backlog로 유지한다.

## 2026-02-22 - F12.1 구현 완료 반영(code/rendered 코멘트 marker hover preview)

- Context:
  - F12.1 구현으로 코드 뷰어/렌더드 마크다운에서 코멘트 count badge hover 시 본문 preview를 보여주는 기능이 추가되었음.
  - line index가 count-only에서 line별 comment entries 조회를 포함하도록 확장되었고, rendered markdown은 nearest fallback 매핑을 유지한 채 preview를 제공하게 되었음.
  - 구현 보고서 기준 전체 품질 게이트(`npm test`, `npm run lint`, `npm run build`)가 통과했고 `npm test` 수치는 `18 files, 169 passed`로 갱신되었음.
- Decision:
  - F12.1을 스펙 상태 `✅ Done`으로 전환한다.
  - 마커 계약을 count badge + hover preview로 확장하고, preview는 read-only로 고정한다.
  - hover preview는 최대 3개 코멘트만 노출하고 초과는 `+N more`로 요약한다.
  - 닫힘 조건은 `mouse leave`, `Esc`, outside click으로 고정한다.
- Rationale:
  - 코멘트 본문 확인을 위해 모달/파일 탐색으로 이동해야 하는 비용을 줄여 코드 리뷰 속도를 높일 수 있다.
  - read-only preview와 표시 개수 제한은 정보량과 시야 방해 사이의 균형을 유지한다.
  - 기존 exact-match/nearest fallback 매핑 정책을 재사용하면 marker 일관성과 구현 복잡도를 동시에 관리할 수 있다.
- Alternatives considered:
  - hover 대신 클릭 기반 상세 패널만 제공
  - preview에 전체 코멘트를 모두 노출
  - preview에 편집/삭제 액션까지 포함
- Impact / follow-up:
  - `main.md`, `01-overview.md`, `02-architecture.md`, `03-components.md`, `04-interfaces.md`, `appendix.md`를 F12.1 완료 상태로 동기화한다.
  - preview 지연값/표시 개수 사용자 설정과 상세 편집/삭제 패널은 backlog로 유지한다.

## 2026-02-22 - F12.2/F12.3/F12.4 구현 완료 반영(comment 관리 + global comments + header 액션 재배치)

- Context:
  - F12.2(`View Comments` 조회/편집/삭제/Delete Exported), F12.3(`Add Global Comments` + export prepend), F12.4(헤더 액션 그룹 compact 재배치) 구현이 완료되었음.
  - implementation-review follow-up으로 실패 경로 보강(저장 실패 배너 + 모달 상태 유지)과 관련 테스트가 추가되어 최종 판정이 `READY`로 확정되었음.
  - 최신 품질 게이트는 `npm test`(`19 files, 188 passed`), `npm run lint`, `npm run build` 모두 통과 상태임.
- Decision:
  - F12.2/F12.3/F12.4를 스펙 상태 `✅ Done`으로 전환한다.
  - 코멘트 관리 계약을 `View Comments`(편집/개별삭제/Delete Exported) 기준으로 고정하고, `Delete Exported`는 `exportedAt`가 있는 line comment만 제거하도록 고정한다.
  - global comments source of truth를 `workspaceRoot/.sdd-workbench/global-comments.md`로 고정하고, export 시 `Global Comments`를 `Comments`보다 먼저 배치한다.
  - 헤더 액션 순서를 `history -> workspace switcher -> comments group -> workspace group`으로 고정하고, comments/workspace 버튼은 compact(`icon + short label`) + 협소 폭 icon-only 정책을 적용한다.
- Rationale:
  - 코멘트 수명주기(생성 후 수정/정리)가 닫혀야 실제 협업 루프에서 누적 노이즈를 제어할 수 있다.
  - 전역 지시사항을 line comment 앞에 배치하면 LLM 입력 문맥 전달 품질이 안정된다.
  - 액션 그룹 재배치는 버튼 탐색 비용을 줄이고 상단 레이아웃 밀도를 낮춰 작업 가독성을 개선한다.
- Alternatives considered:
  - 코멘트 편집/삭제를 backlog로 유지하고 export 기능만 운영
  - global comments를 `comments.json` 스키마에 혼합 저장
  - 헤더 버튼을 기존 단일 그룹으로 유지
- Impact / follow-up:
  - `main.md`, `01-overview.md`, `02-architecture.md`, `03-components.md`, `04-interfaces.md`, `05-operational-guides.md`, `appendix.md`를 F12.4 기준 구현 상태로 동기화한다.
  - backlog는 코멘트 스레드/원격 동기화, re-export-all/reset UX, global comments 버전 이력 등으로 재정리한다.

## 2026-02-23 - F15 구현 완료 반영(SSHFS 원격 워크스페이스 watch mode auto/override + fallback)

- Context:
  - F15 구현으로 SSHFS(또는 유사 마운트) 경로를 기존 워크스페이스 흐름과 동일하게 열되, watcher 모드를 `auto|native|polling` 정책으로 제어할 수 있게 되었음.
  - Main 프로세스에 watch mode resolver(`electron/workspace-watch-mode.ts`)와 polling runtime(기본 1500ms metadata diff)이 추가되었고, native 시작 실패 시 polling fallback이 적용되도록 변경되었음.
  - 최신 구현 리뷰 기준 품질 게이트는 `npm test`(`20 files, 197 passed`), `npm run lint`, `npm run build` 모두 통과 상태임.
- Decision:
  - F15를 스펙 상태 `✅ Done`으로 전환한다.
  - `watchModePreference='auto'`일 때 `/Volumes/*`는 remote mount로 간주해 기본 `polling`으로 시작한다.
  - `watchModePreference='native'|'polling'`이면 휴리스틱보다 사용자 override를 우선 적용한다.
  - `workspace:watchStart` 응답 계약을 `watchMode`, `isRemoteMounted`, `fallbackApplied` 포함 형태로 고정한다.
  - native watcher 시작 실패는 hard-fail 대신 polling fallback(degraded success)으로 처리하고 배너로 안내한다.
  - 세션 영속화 스냅샷에 workspace별 `watchModePreference`를 포함해 재시작 후에도 사용자 의도를 복원한다.
- Rationale:
  - 원격 마운트 환경은 native watcher 신뢰도가 환경 의존적이므로 auto + override + fallback 조합이 운영 안정성을 가장 높인다.
  - `/Volumes/*` 규칙은 MVP 단계에서 구현 복잡도를 낮추면서도 macOS SSHFS 실사용 경로를 직접 커버할 수 있다.
  - degraded success 정책은 감시 기능 중단을 줄이고 사용자 체감 신뢰성을 높인다.
- Alternatives considered:
  - override 없이 auto 휴리스틱만 제공
  - native 실패 시 watchStart를 즉시 실패 처리
  - remote 판정을 별도 프로토콜 탐지/마운트 테이블 파싱으로 확장
- Impact / follow-up:
  - `main.md`, `01-overview.md`, `02-architecture.md`, `03-components.md`, `04-interfaces.md`, `05-operational-guides.md`, `appendix.md`를 F15 완료 기준으로 동기화한다.
  - 후속 backlog로 remote 판정 고도화(플랫폼별 mount metadata)와 polling 최적화(open/recent/expanded 범위 축소)를 유지한다.

## 2026-02-23 - F16 구현 완료 반영(대규모/원격 워크스페이스 lazy indexing + on-demand 디렉토리 확장)

- Context:
  - F16 구현으로 대규모/원격 워크스페이스의 초기 인덱싱 성능과 polling watcher 안정성을 개선했음.
  - 원격 마운트 감지가 `/Volumes/*` 고정 패턴에서 `mount` 명령 파싱 기반 네트워크 FS 감지로 업그레이드되었음.
  - 최신 품질 게이트는 `npm test`(`20 files, 213 passed`), `npm run lint`, `npm run build` 모두 통과 상태임.
- Decision:
  - F16을 스펙 상태 `Done`으로 전환한다.
  - 인덱싱은 **디렉토리별 child cap(`500`)** 과 **원격 마운트 한정 깊이 제한(`3`)** 을 병용한다.
  - polling watcher는 **child-count 기반 디렉토리 제외** 만 적용하고 깊이 제한은 적용하지 않는다.
  - 원격 마운트 감지는 `mount` 명령 출력에서 네트워크 FS 타입(`sshfs`, `nfs`, `cifs`, `afpfs`, `webdavfs`, `osxfuse`, `macfuse`, `fuse`)을 파싱한다.
  - `not-loaded` 디렉토리는 `workspace:indexDirectory` IPC로 on-demand 로드하며, 구조 변경 re-index 시 `not-loaded`로 리셋된다.
- Rationale:
  - 인덱싱과 watching의 성능 병목이 다르므로 전략을 분리: 인덱싱은 sshfs 전체 트리 워킹 비용이 병목이라 깊이 제한이 효과적이고, watching은 과대 디렉토리의 반복 스캔이 병목이라 child-count 기반 제외가 효과적이다.
  - 깊이 제한을 원격 마운트에만 적용하면 로컬 워크스페이스의 deep-but-small 디렉토리가 정상 인덱싱/감시된다.
  - `mount` 명령 파싱은 `/Volumes/*` 고정 패턴보다 FUSE 마운트 포인트를 더 정확히 감지한다.
- Alternatives considered:
  - 인덱싱에도 child-count 기반만 적용(원격에서 전체 트리 워킹이 여전히 느림)
  - watching에도 깊이 제한 적용(로컬 deep 디렉토리의 변경 감지가 누락됨)
  - `/Volumes/*` 패턴만 유지(FUSE 마운트 포인트가 `/Volumes` 외부일 때 감지 실패)
- Impact / follow-up:
  - `main.md`, `01-overview.md`, `02-architecture.md`, `03-components.md`, `04-interfaces.md`, `05-operational-guides.md`, `appendix.md`를 F16 완료 기준으로 동기화한다.
  - 후속 backlog로 Windows/Linux remote mount 감지, lazy-loaded 디렉토리 watching 확장, on-demand re-index 최적화를 유지한다.

## 2026-02-23 - F12.5 구현 완료 반영(comment feedback auto-dismiss + global 가시성 + header action clarity)

- Context:
  - F12.5 구현으로 코멘트 액션 피드백 배너 auto-dismiss, `View Comments`의 global comments 상단 노출, `Export Comments`의 global 포함 상태 표시, 헤더 액션 그룹 명확화가 코드/테스트에 반영되었음.
  - 최신 구현 산출물(`IMPLEMENTATION_PROGRESS.md`, `IMPLEMENTATION_REPORT.md`)에 F12.5 Addendum이 기록되었고 품질 게이트는 `npm test`(`20 files, 202 passed`), `npm run lint`, `npm run build` 통과 상태임.
- Decision:
  - F12.5를 스펙 상태 `✅ Done`으로 전환한다.
  - 코멘트 액션 경로 배너는 5초 auto-dismiss를 기본으로 하되 사용자 `Dismiss` 즉시 종료를 유지한다.
  - `View Comments`는 global comments(read-only/empty 상태 포함)를 line comments 상단에 고정 노출한다.
  - `Export Comments` 모달은 global comments 포함 여부(`included`/`not included`)를 명시한다.
  - 헤더 액션은 `Title + Back/Forward`(좌측)와 `Code comments`/`Workspace` 그룹(우측)으로 구분한다.
- Rationale:
  - 코멘트 작업 후 배너 잔류를 줄여 화면 점유를 완화하면서도 수동 종료 경로를 유지하면 피드백 가시성과 집중 흐름을 함께 확보할 수 있다.
  - global comments의 조회/내보내기 포함 여부를 UI에서 즉시 확인 가능해야 코멘트 번들의 실제 전달 컨텍스트를 예측할 수 있다.
  - 헤더 그룹 경계를 명확히 하면 코멘트 액션과 워크스페이스 액션의 인지 혼선을 줄일 수 있다.
- Alternatives considered:
  - 모든 배너(워크스페이스/IO 포함)에 auto-dismiss 적용
  - global comments를 View/Export에 노출하지 않고 기존 `Add Global Comments` 모달에서만 확인
  - 헤더 액션을 단일 버튼열로 유지
- Impact / follow-up:
  - `main.md`, `01-overview.md`, `02-architecture.md`, `03-components.md`, `04-interfaces.md`, `05-operational-guides.md`, `appendix.md`를 F12.5 기준으로 동기화한다.
  - 향후 backlog에서 배너 duration 사용자 설정, global comments 고급 편집 경험은 별도 기능으로 다룬다.

## 2026-02-23 - F17 구현 완료 반영(Global 포함 체크박스 + Delete Exported 하단 이동)

- Context:
  - F17(F17 follow-up) 구현으로 View Comments 모달에 global comments "Include in export" 체크박스를 추가하고, Delete Exported 버튼을 중간 위치에서 모달 하단 좌측으로 이동하는 UX 개선이 완료되었음.
  - `onRequestExport` 콜백이 `(string[], boolean)` 시그니처로 확장되어 `App.tsx`가 `effectiveExportGlobalComments`/`effectiveExportHasGlobalComments`를 계산하고 export 모달에 전달함.
  - 품질 게이트: `npm test`(`20 files, 225 passed`), `npm run lint`, `npx tsc --noEmit` 모두 통과.
- Decision:
  - F17을 스펙 상태 `✅ Done`으로 전환한다.
  - View Comments 모달에서 global comments가 존재하면 "Include in export" 체크박스(기본 체크)를 제공하고, 체크 해제 시 export에서 global comments를 제외한다.
  - Delete Exported 버튼은 모달 하단 액션 바 좌측(`margin-right: auto`)에 배치하여 Export Selected/Close 버튼과 시각적으로 분리한다.
  - Export Selected 버튼의 활성화 조건에 `hasGlobalComments && includeGlobalComments`를 반영한다.
- Rationale:
  - global comments를 항상 포함하면 특정 export에서 불필요한 전역 컨텍스트가 포함될 수 있으므로, 사용자에게 선택권을 제공한다.
  - Delete Exported는 파괴적 작업이므로 주요 액션(Export/Close)과 물리적으로 분리해 오작동 가능성을 낮춘다.
- Alternatives considered:
  - Export 모달에서 체크박스를 제공하는 방안(View Comments에서 미리 결정하는 것이 흐름에 자연스러움)
  - Delete Exported를 별도 섹션에 유지하는 방안(하단 통합이 공간 효율적)
- Impact / follow-up:
  - `main.md`, `01-overview.md`, `03-components.md`, `04-interfaces.md`, `appendix.md`를 F17 기준으로 동기화한다.

## 2026-02-23 - F18 구현 완료 반영(PrismJS → Shiki 코드 하이라이팅 마이그레이션)

- Context:
  - PrismJS는 RegExp 기반 토큰화로 지원 언어가 9개에 불과하고, TextMate 문법 대비 토큰 정확도가 낮았음.
  - Electron renderer 환경에서 Shiki 기본 WASM 엔진(oniguruma)은 모듈 로드 시점에 크래시를 일으킴.
  - Vite 빌드 환경에서 `import(\`shiki/langs/${variable}.mjs\`)` 동적 import는 번들링 불가.
- Decision:
  - PrismJS를 완전 제거하고 Shiki(`shiki/core` + `shiki/engine/javascript`)로 전환한다.
  - JS regex 엔진을 사용하여 WASM 의존성을 제거하고, 정적 `LANG_IMPORTS` 맵으로 35개 언어를 lazy 로드한다.
  - `highlightLines`/`highlightPreviewLines`를 비동기 API로 제공하고, 완료 전까지 plaintext fallback을 표시한다.
  - Highlighter는 모듈 수준 싱글톤(`Promise<HighlighterCore>`)으로 캐시하여 중복 생성을 방지한다.
  - 테마는 `github-dark` 단일 테마로 고정하고, 토큰 색상은 inline `style="color:..."` 으로 적용한다.
- Rationale:
  - JS regex 엔진은 WASM 대비 약간의 성능 차이가 있지만, Electron renderer 호환성을 보장한다.
  - 정적 import 맵은 Vite 빌드 분석이 가능하여 tree-shaking과 코드 분할을 정상 수행한다.
  - 비동기 + plaintext fallback은 파일 전환 시 빈 화면 없이 즉시 콘텐츠를 표시한다.
- Alternatives considered:
  - Shiki 기본 번들(`createHighlighter` from `shiki`) — WASM 크래시로 불가
  - 동적 template literal import — Vite 번들링 불가로 런타임 404
  - PrismJS 유지 + 언어 확장 — TextMate 문법 정확도에 근본적 한계
- Impact / follow-up:
  - `package.json`에서 `prismjs`/`@types/prismjs` 제거, `shiki` 추가.
  - `App.css`에서 `.token.*` PrismJS 규칙 제거.
  - 지원 언어 9개 → 35+개로 확장, 추가 언어는 `LANG_IMPORTS`에 thunk 추가만으로 가능.
  - 품질 게이트: `npm test`(`21 files, 241 passed`), `npm run lint`, `npx tsc --noEmit` 모두 통과.

## 2026-02-24 - F19 구현 완료 반영(active file Git diff 라인 마커 MVP)

- Context:
  - F19 구현으로 active file 기준 Git diff 라인 마커(added/modified)가 코드 뷰어에 추가되었음.
  - Main 프로세스에 `workspace:getGitLineMarkers` IPC가 추가되었고, `git diff --no-color --unified=0 HEAD -- <relativePath>` 파싱 유틸(`electron/git-line-markers.ts`)이 도입되었음.
  - 최신 품질 게이트는 `npm test`(`22 files, 250 passed`), `npm run lint`, `npm run build` 모두 통과 상태임.
- Decision:
  - F19를 스펙 상태 `✅ Done`으로 전환한다.
  - Git 라인 마커는 MVP에서 `added`(green)/`modified`(blue)만 지원한다.
  - deletion-only hunk는 라인 마커 표시 범위에서 제외한다.
  - marker 조회는 active file 단건 IPC로 제한하고, 전체 트리 diff 스캔은 도입하지 않는다.
  - Git 실패/비저장소 경로/`HEAD` 부재/파일 없음은 배너 없이 marker 비표시로 safe degrade한다.
- Rationale:
  - diff 전문 UI 없이도 변경 밀집 구간을 즉시 식별해 검토 속도를 높일 수 있다.
  - 단건 조회 정책은 성능 리스크를 최소화하면서 실사용 가치를 확보한다.
  - deleted marker를 분리하면 MVP 복잡도를 통제하면서 후속 확장 여지를 남길 수 있다.
- Alternatives considered:
  - added/modified/deleted를 한 번에 모두 구현
  - 파일 트리 전체 diff 인덱스를 선계산해 모든 파일 marker를 미리 표시
  - Git 실패 시 사용자 배너를 매번 노출
- Impact / follow-up:
  - `main.md`, `01-overview.md`, `02-architecture.md`, `03-components.md`, `04-interfaces.md`, `05-operational-guides.md`, `appendix.md`를 F19 완료 기준으로 동기화한다.
  - deleted-only 라인(red) marker, diff 상세 뷰/툴팁은 후속 backlog로 유지한다.

## 2026-02-24 - F22 구현 완료 반영(Cmd+Shift+Up/Down 워크스페이스 키보드 전환)

- Context:
  - 기존 워크스페이스 전환은 드롭다운(`WorkspaceSwitcher`)만 지원했으며, 키보드 기반 빠른 전환이 불가능했음.
  - 기존 `setActiveWorkspace`는 MRU 패턴(`workspaceOrder` 끝으로 이동)을 사용하므로, 키보드 순차 전환에 부적합함.
- Decision:
  - `switchActiveWorkspace` 순수 함수를 추가한다. `setActiveWorkspace`와 동일하되 `workspaceOrder`를 재배열하지 않는다.
  - `Cmd+Shift+Up`(이전)/`Cmd+Shift+Down`(다음)으로 `workspaceOrder` 기준 순환 전환(wrap-around)을 지원한다.
  - 드롭다운 전환은 기존 `setActiveWorkspace`(MRU) 동작을 유지한다.
  - 워크스페이스 1개일 때는 무동작 처리한다.
- Rationale:
  - MRU 재배열 없이 순서를 유지해야 키보드 연속 전환에서 안정적 인덱싱이 보장된다.
  - 드롭다운과 키보드의 전환 의미가 다르므로(MRU vs 순차) 별도 함수로 분리하는 것이 상태 전이 명확성을 높인다.
  - `selectionRange` 리셋은 두 함수 모두 동일하게 유지한다.
- Alternatives considered:
  - `setActiveWorkspace`에 MRU 재배열 여부 플래그를 추가
  - `workspaceOrder`를 항상 고정하고 MRU를 별도 필드로 관리
- Impact / follow-up:
  - `main.md`, `01-overview.md`, `02-architecture.md`, `03-components.md`, `05-operational-guides.md`, `appendix.md`를 F22 완료 기준으로 동기화한다.
  - 품질 게이트: `npm test`(`23 files, 285 passed`), `npm run lint`, `npx tsc --noEmit` 모두 통과.
