# Orchestrator: F45 문서 세션 통합 + Draft 기반 Spec View

**생성일**: 2026-04-01T10:55:00+09:00
**규모**: 대규모
**생성자**: sdd-autopilot

## 기능 설명

사용자 원래 요청:

> "파일 편집과 저장이 잘 안 되는데... 특히 undo나 redo랑 파일 저장, 중간에 spec view로 넘어갔다가 다시 code view로 넘어오는 등 다양한 작업들이 있을 텐데 이게 너무 복잡한 걸까? 뭔가 좋은 방법이 없을까?"
>
> "오토파일럿 스킬로 구현하자."

기존 산출물:

- feature draft: `_sdd/drafts/feature_draft_f45_document_session_unification.md`

### 구체화된 요구사항

- path-keyed runtime document session을 도입해 `savedContent`, `draftContent`, `saveState`를 한곳에서 관리한다.
- 동일 markdown 파일의 Code 탭과 Spec 탭은 같은 draft text를 공유한다.
- Code 탭에서 markdown를 수정한 뒤 저장하지 않아도 Spec 탭에서 최신 draft가 렌더된다.
- Code/Spec 탭 전환만으로 draft reset, auto-save, undo/redo reset이 발생하지 않는다.
- dirty 상태에서 외부 파일 변경이 감지되면 auto-reload 대신 conflict state와 명시적 사용자 선택 UX를 제공한다.
- 기존 `activeFile` / `activeSpec` navigation pointer, jump highlight, search/comment/source-action contract는 의미를 유지한다.
- 구현 후 테스트를 실제 실행하고 결과를 `_sdd/implementation/test_results/`에 남긴다.
- 구현 완료 후 canonical spec을 실제 코드 기준으로 동기화한다.

### 제약 조건

- `_sdd/spec/` 직접 수정은 `spec_update_todo`와 `spec_update_done` 단계에만 맡긴다.
- autosave는 이번 범위에 포함하지 않는다.
- 앱 재시작 후 unsaved draft 복원은 이번 범위에 포함하지 않는다.
- CodeMirror의 undo/redo, IME, selection은 editor-local responsibility로 유지한다.
- 기존 `.md` 파일의 `Go to Spec`, `Go to Source`, temporary highlight, scroll retention contract를 깨지 않는다.
- `_sdd/env.md` 기준 표준 명령은 `npm`, `npm test`, `npm run build` 계열을 사용한다.
- 저장소 루트에는 `.codex/config.toml`이 없으므로 max_depth/max_threads는 명시적으로 확인할 수 없다. 실행 시 병렬 fan-out은 보수적으로 사용한다.

## Acceptance Criteria

- [ ] AC1. text/markdown 문서의 runtime source of truth가 path-keyed document session으로 통합된다.
- [ ] AC2. 동일 markdown 파일에서 Code edit -> Spec view -> Code return 흐름이 저장 없이 유지된다.
- [ ] AC3. 저장 성공 시 `savedContent`와 `draftContent`가 동기화되고 save state가 clean으로 복귀한다.
- [ ] AC4. dirty 상태의 외부 파일 변경은 auto-reload 대신 conflict UX로 처리된다.
- [ ] AC5. 파일/워크스페이스 전환과 rename/delete guard가 save-state 기반으로 일관되게 동작한다.
- [ ] AC6. CodeMirror undo/redo 동작은 app state 동기화 때문에 회귀하지 않는다.
- [ ] AC7. 관련 테스트가 실제 실행되고 결과가 `_sdd/implementation/test_results/`에 저장된다.
- [ ] AC8. 구현 완료 후 `_sdd/spec/` supporting docs와 indexes가 실제 코드 기준으로 동기화된다.

## Reasoning Trace

- 이번 변경은 `workspace-context`, `App`, `code-editor`, `spec-viewer`, 다수 테스트를 동시에 건드리는 cross-cutting refactor라 대규모로 판단했다.
- 이미 `_sdd/drafts/feature_draft_f45_document_session_unification.md`가 존재하고 Part 2가 task/Target Files 수준까지 구체화되어 있어 `implementation_plan`은 생략하고 feature draft Part 2를 baseline contract로 사용한다.
- 동일 markdown draft 공유와 external conflict 처리는 spec drift 위험이 높으므로 `spec_update_todo -> implementation -> spec_update_done` 순서를 채택했다.
- 이 기능은 UI/상태 전이 중심이고 외부 리소스가 필요 없으므로 `ralph_loop_init` 대신 인라인 테스트 전략이 적합하다.
- SDD 관점에서 핵심은 "editor-local undo/redo"와 "app-level save/conflict/navigation state"를 분리해 spec-first contract를 코드 구조에 반영하는 것이다.

## Pipeline Steps

### Step 1: spec_update_todo

**에이전트**: `spec_update_todo`
**입력 파일**:
- `_sdd/drafts/feature_draft_f45_document_session_unification.md`
- `_sdd/spec/code-editor/overview.md`
- `_sdd/spec/code-editor/contracts.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `_sdd/spec/workspace-and-file-tree/overview.md`
- `_sdd/spec/appearance-and-navigation/overview.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/decision-log.md`
**출력 파일**:
- `_sdd/spec/code-editor/overview.md`
- `_sdd/spec/code-editor/contracts.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `_sdd/spec/workspace-and-file-tree/overview.md`
- `_sdd/spec/appearance-and-navigation/overview.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/decision-log.md`

**프롬프트**:
`_sdd/drafts/feature_draft_f45_document_session_unification.md`의 Part 1을 기준으로 planned 상태의 spec patch를 canonical supporting docs에 반영하세요.
사용자 원래 요청은 파일 편집/저장/undo/redo/spec-code 왕복 복잡도를 줄이기 위해 document session을 통합하는 것입니다.
이번 단계에서는 코드 구현을 가정하지 말고 planned wording만 반영하세요.
`_sdd/spec/` 직접 수정은 이 단계에서만 허용됩니다.

### Step 2: implementation

**에이전트**: `implementation`
**입력 파일**:
- `_sdd/drafts/feature_draft_f45_document_session_unification.md`
- `_sdd/spec/code-editor/overview.md`
- `_sdd/spec/code-editor/contracts.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `_sdd/spec/workspace-and-file-tree/overview.md`
- `_sdd/spec/appearance-and-navigation/overview.md`
- `_sdd/env.md`
**출력 파일**:
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-context.tsx`
- `src/code-editor/code-editor-panel.tsx`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-persistence.test.ts`
- `src/code-editor/code-editor-panel.test.tsx`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/App.test.tsx`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
- `_sdd/implementation/test_results/test_result_<timestamp>.md`

**프롬프트**:
`_sdd/drafts/feature_draft_f45_document_session_unification.md`의 Part 2를 baseline contract로 사용해 F45를 구현하세요.
반드시 `ac-plan -> tdd-execute -> implementation-review -> fix` internal iteration을 수행하고, 종료 조건은 "all AC met AND critical = 0 AND high = 0"입니다.
구현 핵심은 다음과 같습니다.

1. path-keyed document session 도입
2. markdown same-path Code/Spec draft 공유
3. save state (`clean|dirty|saving|conflict`) 기반 save/external-change/guard 정리
4. CodeMirror undo/redo는 editor-local로 유지
5. 관련 테스트 추가/수정

실제 테스트와 검증을 실행하고, 결과를 `_sdd/implementation/test_results/test_result_<timestamp>.md`에 저장하세요.
스펙 파일은 직접 수정하지 마세요.

### Step 3: spec_update_done

**에이전트**: `spec_update_done`
**입력 파일**:
- `_sdd/drafts/feature_draft_f45_document_session_unification.md`
- `_sdd/spec/code-editor/overview.md`
- `_sdd/spec/code-editor/contracts.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `_sdd/spec/workspace-and-file-tree/overview.md`
- `_sdd/spec/appearance-and-navigation/overview.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/decision-log.md`
- `src/workspace/workspace-model.ts`
- `src/workspace/workspace-context.tsx`
- `src/code-editor/code-editor-panel.tsx`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/App.tsx`
- `_sdd/implementation/IMPLEMENTATION_REPORT.md`
**출력 파일**:
- `_sdd/spec/code-editor/overview.md`
- `_sdd/spec/code-editor/contracts.md`
- `_sdd/spec/spec-viewer/overview.md`
- `_sdd/spec/spec-viewer/contracts.md`
- `_sdd/spec/workspace-and-file-tree/overview.md`
- `_sdd/spec/appearance-and-navigation/overview.md`
- `_sdd/spec/feature-index.md`
- `_sdd/spec/decision-log.md`
- `_sdd/spec/summary.md`
- `_sdd/spec/code-map.md`

**프롬프트**:
F45 구현 완료 기준으로 supporting spec docs를 실제 코드와 동기화하세요.
planned wording는 제거하고, 구현된 contract와 변경 지점만 반영하세요.
특히 document session source of truth, markdown draft-backed spec view, conflict handling, 관련 테스트/코드 인덱스가 실제 구현과 맞게 정리되어야 합니다.

## Contract Baseline

- **기본 contract source**: `_sdd/drafts/feature_draft_f45_document_session_unification.md` Part 2
- **기본 contract 필드**:
  - `Acceptance Criteria`
  - `Target Files`
  - `Dependencies`
- **계약 상태**: 별도 full contract artifact는 만들지 않는다.
- **review findings 관리**: `IMPLEMENTATION_REPORT.md`의 `iteration history`와 `latest review findings`에 누적한다.
- **에스컬레이션 규칙**: review 결과 contract 자체 변경이 필요하면 implementation을 멈추고 spec/plan update 경로로 에스컬레이션한다.
- **runtime 규칙**: 생성된 오케스트레이터는 위 해석 규칙을 포함하며, 실행 시 external reference를 다시 읽지 않아도 되도록 self-contained하게 동작한다.

## Implementation Internal Iteration

- **최대 반복**: 5회
- **종료 조건**: all AC met AND critical = 0 AND high = 0
- **수정 대상**: critical/high
- **기본 contract**: feature draft Part 2의 `Acceptance Criteria` + `Target Files` + `Dependencies`
- **iteration history**: round별 AC subset, review findings, fix 결과를 `IMPLEMENTATION_REPORT.md`에 기록한다.
- **medium 처리**: 다음 iteration 입력으로 승격하거나, 종료 조건 충족 시 최종 로그/후속 권고로 남긴다.
- **MAX 도달 분기**:
  - unresolved AC 또는 critical/high 잔존 -> 파이프라인 중단
  - medium/low만 잔존 -> 로그 기록 후 종료 가능

### Review 프롬프트

- document session state transition의 정합성
- same-path markdown draft 공유 contract 준수 여부
- external conflict handling 완전성
- guard logic의 일관성
- CodeMirror undo/redo 회귀 가능성
- test coverage sufficiency
- contract mismatch / hidden scope creep / verification insufficiency
- severity를 critical/high/medium/low로 분류

### Fix 프롬프트

- critical/high 이슈를 우선 수정
- medium은 종료 조건 충족 시 후속 권고로 남길 수 있다
- spec contract 변경이 필요하면 즉시 에스컬레이션한다

## Test Strategy

- **방식**: 인라인 테스트
- **실행 명령**:
  - `node -v`
  - `npm -v`
  - `npx vitest run src/workspace/workspace-model.test.ts src/workspace/workspace-persistence.test.ts src/code-editor/code-editor-panel.test.tsx src/spec-viewer/spec-viewer-panel.test.tsx src/App.test.tsx --reporter=dot`
  - `npx tsc --noEmit`
- **선택 근거**:
  - 이 기능은 UI/상태 전이 중심이며 외부 장시간 프로세스가 필요 없다.
  - 주요 리스크가 App/Workspace/Editor/Viewer 통합 회귀이므로 타깃 통합 테스트와 타입체크가 효과적이다.
- **사용자 보고 형식**:
  - 통과/실패 test file 수
  - 실패 원인 요약
  - 타입체크 결과
  - 수동 확인 필요 항목
  - 결과 파일 경로: `_sdd/implementation/test_results/test_result_<timestamp>.md`

## Error Handling

- **재시도 횟수**: 핵심 단계 2회, 테스트 단계 2회
- **핵심 단계**:
  - `spec_update_todo`
  - `implementation`
  - `inline-test`
  - `spec_update_done`
- **비핵심 단계**:
  - 최종 추가 `spec_review`는 이번 파이프라인에 포함하지 않는다

핵심 단계 실패 시 아래를 보고하고 파이프라인을 중단한다.

- 중단 원인
- 재시도 횟수
- 완료/미완료 단계
- 로그 파일 경로
- 부분 산출물 목록
- 권장 후속 조치
