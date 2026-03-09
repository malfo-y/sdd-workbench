# IMPLEMENTATION_PLAN (F10)

## 1. Overview

F10의 목표는 신규 UX를 추가하지 않고, 현재 구현(F01~F09/F10.1)의 안정성을 끌어올리는 것이다.
핵심 축은 3가지다.

1. Markdown 렌더 보안 하드닝(`sanitize` + 로컬 리소스 경계)
2. 인덱싱/렌더링 성능 보정(대형 워크스페이스/대형 파일에서의 비용 제어)
3. 섹션 13 수용 기준 중심 회귀 테스트 보강

기준 스펙:

- `/_sdd/spec/main.md` 섹션 `10`, `12.2(F10)`, `13`
- `/_sdd/spec/decision-log.md` (F10.1 이후 F10 안정화 우선순위 확정)

## 2. Scope (In/Out)

### In Scope

- Markdown 렌더 파이프라인에 sanitize 적용 및 허용 스키마 명시
- rendered markdown의 로컬 리소스(이미지 등) 경로를 workspace 내부 상대경로로 제한
- 워크스페이스 인덱싱 비용 상한(guardrail) 도입 및 UI graceful degradation
- 코드 뷰어 하이라이트 계산의 불필요 재연산 감소
- 핵심 회귀 테스트(보안/성능 경계/멀티 워크스페이스 회귀) 추가

### Out of Scope

- 신규 사용자 기능(F11 성격)의 도입
- Monaco/CodeMirror 전환, 가상 스크롤 등 대형 아키텍처 교체
- cross-workspace 링크 탐색 정책 변경
- 문자/토큰 단위 source 매핑 고도화(F10.1 확장)

## 3. Components

1. **Spec Security Layer**

- `spec-viewer` 렌더링 경로의 sanitize/URI 정책

1. **Indexing Performance Layer**

- Electron main 인덱싱 트리 생성 경로 + Renderer 연계 배너 처리

1. **Code Rendering Performance Layer**

- 코드 뷰어 라인 하이라이트 계산 메모이제이션

1. **Validation Layer**

- 단위/통합 테스트 보강 및 회귀 게이트 고정

## 4. Implementation Phases

### Phase 1: Security Hardening

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | Markdown sanitize/URI 정책 유틸 도입 | P0 | - | Spec Security Layer |
| T2 | SpecViewerPanel에 sanitize + 로컬 리소스 제한 적용 | P0 | T1 | Spec Security Layer |

### Phase 2: Performance Stabilization

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | Workspace 인덱싱 guardrail(cap + truncation 신호) 도입 | P0 | - | Indexing Performance Layer |
| T4 | CodeViewer 하이라이트 계산 메모이제이션 | P1 | - | Code Rendering Performance Layer |

### Phase 3: Regression & Acceptance Lock

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | F10 회귀 테스트 묶음 보강 및 게이트 정리 | P0 | T2,T3,T4 | Validation Layer |

## 5. Task Details

### Task T1: Markdown sanitize/URI 정책 유틸 도입

**Component**: Spec Security Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`react-markdown` 렌더링 경로에서 사용할 sanitize 스키마와 URI 허용 정책을 별도 모듈로 분리한다.
`data-source-line`, heading id, TOC/링크 동작에 필요한 최소 속성만 허용하고 나머지는 제거한다.

**Acceptance Criteria**:

- [ ] sanitize 스키마가 코드로 명시되고, 렌더 시 허용 태그/속성 집합이 고정된다.
- [ ] URI 정책에서 `javascript:`/`file:`/기타 위험 스킴이 차단된다.
- [ ] 로컬 리소스 허용 여부 판별 함수가 테스트로 고정된다.
- [ ] 기존 F04/F04.1/F10.1 링크/selection 흐름과 충돌하지 않는다.

**Target Files**:

- [M] `package.json` -- `rehype-sanitize` 의존성 추가
- [M] `package-lock.json` -- lockfile 동기화
- [C] `src/spec-viewer/markdown-security.ts` -- sanitize schema + URI/resource policy
- [C] `src/spec-viewer/markdown-security.test.ts` -- 허용/차단 규칙 단위 테스트

**Technical Notes**:

- 정책은 “최소 허용(default-deny)” 원칙으로 설계한다.
- `data-source-line`/`id` 등 F10.1/F04 동작 필수 속성은 schema allowlist에 명시한다.

**Dependencies**: -

---

### Task T2: SpecViewerPanel에 sanitize + 로컬 리소스 제한 적용

**Component**: Spec Security Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`SpecViewerPanel`의 `ReactMarkdown` 파이프라인에 T1 정책을 연결한다.
이미지/링크 렌더러에서 workspace 내부 상대경로만 허용하고, 비허용 리소스는 렌더/이동을 차단한다.

**Acceptance Criteria**:

- [ ] `ReactMarkdown`에 sanitize 플러그인이 적용된다.
- [ ] 외부/위험 URI 리소스는 자동 로드되지 않는다.
- [ ] workspace 내부 상대경로 리소스는 기존처럼 렌더 가능하다.
- [ ] link popover/source popover 상호 배타 규칙은 유지된다.

**Target Files**:

- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- sanitize/URI policy wiring
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- 이미지/링크 허용/차단 회귀 테스트

**Technical Notes**:

- `activeSpecPath` 기준 상대경로 해석 유틸을 재사용하고, 경계 벗어남(`../`)을 차단한다.
- 차단 리소스는 no-op 또는 안전한 placeholder 렌더로 일관 처리한다.

**Dependencies**: T1

---

### Task T3: Workspace 인덱싱 guardrail(cap + truncation 신호) 도입

**Component**: Indexing Performance Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
대형 워크스페이스에서 메인 프로세스 인덱싱이 과도하게 길어지는 문제를 막기 위해,
인덱싱 노드 cap을 도입하고 결과가 잘렸을 때 Renderer가 사용자에게 안내할 수 있는 신호를 추가한다.

**Acceptance Criteria**:

- [ ] 인덱싱은 설정된 노드 cap에 도달하면 안전하게 중단된다.
- [ ] `workspace:index` 결과에 truncation 여부가 전달된다.
- [ ] Renderer는 truncation 신호 수신 시 배너/메시지로 사용자에게 알린다.
- [ ] watcher 기반 구조 변경 refresh 경로와 충돌하지 않는다.

**Target Files**:

- [M] `electron/main.ts` -- index cap + result metadata(truncated) 반영
- [M] `electron/preload.ts` -- index result 타입/브리지 계약 확장
- [M] `electron/electron-env.d.ts` -- renderer 전역 타입 계약 확장
- [M] `src/workspace/workspace-context.tsx` -- truncation 배너 처리
- [M] `src/App.test.tsx` -- truncation 시나리오 회귀 테스트

**Technical Notes**:

- cap 값은 상수화하고(예: `MAX_INDEX_NODE_COUNT`), 추후 튜닝 가능하도록 분리한다.
- 기존 file-tree render cap(500)과 인덱싱 cap의 역할을 분리해 문서화한다.

**Dependencies**: -

---

### Task T4: CodeViewer 하이라이트 계산 메모이제이션

**Component**: Code Rendering Performance Layer  
**Priority**: P1-High  
**Type**: Refactor

**Description**:
현재 라인 렌더 루프에서 매 렌더마다 `highlightLineContent`가 반복 호출된다.
콘텐츠/언어 변경 시에만 하이라이트 결과를 재계산하도록 메모이제이션 계층을 추가한다.

**Acceptance Criteria**:

- [ ] 하이라이트 결과 계산은 `activeFileContent` 또는 `highlightLanguage` 변경 시에만 갱신된다.
- [ ] 선택/우클릭/리사이즈 같은 UI 상호작용으로 하이라이트 재계산이 발생하지 않는다.
- [ ] 기존 라인 선택/점프/컨텍스트 메뉴 동작은 그대로 유지된다.

**Target Files**:

- [M] `src/code-viewer/code-viewer-panel.tsx` -- highlighted line cache/useMemo 적용
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- 동작 회귀 + 계산 경계 테스트
- [M] `src/code-viewer/syntax-highlight.ts` -- 필요 시 배치 하이라이트 헬퍼 추가

**Technical Notes**:

- 메모이제이션 키는 콘텐츠 문자열/언어로 고정한다.
- 렌더 성능 최적화는 결과 동등성(HTML output 동일)을 테스트로 고정한다.

**Dependencies**: -

---

### Task T5: F10 회귀 테스트 묶음 보강 및 게이트 정리

**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
F10 범위 변경이 기존 기능(F04/F04.1/F05/F07/F09/F10.1)을 깨지 않도록,
보안/성능 경계 중심 회귀 테스트를 보강하고 실행 게이트를 최종 고정한다.

**Acceptance Criteria**:

- [ ] sanitize 정책 허용/차단 케이스가 단위+컴포넌트 테스트에 반영된다.
- [ ] 인덱싱 truncation/구조 변경 refresh/changed marker 기존 시나리오가 함께 통과한다.
- [ ] 코드 뷰어 selection/drag/context copy/line jump 회귀가 유지된다.
- [ ] `npm test`, `npm run lint`, `npm run build`를 통과한다.

**Target Files**:

- [M] `src/spec-viewer/markdown-security.test.ts` -- 정책 회귀 케이스 확장
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- sanitize + source/link popover 회귀
- [M] `src/App.test.tsx` -- 인덱싱 truncation + 멀티 워크스페이스 회귀
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- 하이라이트 메모이제이션 회귀

**Technical Notes**:

- 테스트는 기능 추가보다 “기존 계약 유지 + 경계값 고정”에 집중한다.
- flaky 방지를 위해 시간 의존 로직은 mock/고정값으로 제어한다.

**Dependencies**: T2,T3,T4

## 6. Parallel Execution Summary

### 병렬 가능 묶음 (충돌 최소)

- **Track A (보안)**: `T1 -> T2`
- **Track B (인덱싱 성능)**: `T3`
- **Track C (코드 렌더 성능)**: `T4`

### 병렬 실행 후 통합 단계

- `T5`는 `T2/T3/T4` 완료 후 실행(회귀 게이트 통합)

### 파일 충돌/의미적 충돌 포인트

- 파일 충돌:
  - `src/App.test.tsx`는 `T3`와 `T5` 모두 수정 가능성 높음(순차 권장)
  - `src/spec-viewer/spec-viewer-panel.test.tsx`는 `T2`/`T5` 충돌 가능
- 의미적 충돌:
  - sanitize 정책이 과도하면 F04.1 링크/TOC/F10.1 source line 메타데이터가 깨질 수 있음
  - 인덱싱 cap 도입 시 “사용자가 기대하는 파일 가시성”과 성능 사이 trade-off가 발생

### 예상 크리티컬 패스

`T1 -> T2 -> T5`
(동시에 `T3`, `T4`를 병렬로 완료 후 `T5`에서 최종 통합)

## 7. Risks & Mitigations

1. **Risk**: sanitize 스키마가 너무 보수적이라 기존 markdown 표시가 깨짐  
**Mitigation**: allowlist를 점진적으로 열고, F04/F10.1 회귀 테스트를 즉시 보강

2. **Risk**: 인덱싱 cap 도입으로 일부 파일이 트리에 보이지 않아 혼란 발생  
**Mitigation**: truncation 신호를 명시적으로 노출하고 cap 값 튜닝 상수화

3. **Risk**: 하이라이트 메모이제이션 과정에서 line jump/selection 동작 회귀  
**Mitigation**: `code-viewer-panel.test.tsx`에 selection/drag/jump 시나리오를 유지 검증

4. **Risk**: 병렬 작업 시 테스트 파일 충돌로 재작업 증가  
**Mitigation**: `T5`를 통합 전용 단계로 고정하고 선행 task는 구현 파일 중심으로 분리

## 8. Open Questions

### Resolved Decisions (2026-02-21)

1. 인덱싱 cap 기본값은 `10,000` 노드로 고정한다.
2. 차단된 이미지/리소스는 `blocked placeholder text`로 표시한다.
3. `data:` URI는 `data:image/*`만 제한 허용한다. 이미지 렌더링 자체는 이후 F10.2에서 별도 구현한다.

현재 블로킹 Open Question 없음.
