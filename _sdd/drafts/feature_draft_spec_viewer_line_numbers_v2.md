# Feature Draft: Spec Viewer 줄번호 확장 — 테이블 행 + 코드 블록 내부

<!-- spec-update-todo-input-start -->
# Part 1: Temporary Spec Draft

**Date**: 2026-04-13
**Feature ID**: F49.1 (F49 후속 확장)
**Target Spec**: `_sdd/spec/spec-viewer/overview.md`, `_sdd/spec/main.md`, `_sdd/spec/feature-index.md`

## Change Summary

F49(1차)에서 CSS `::before` + `data-source-line` 방식으로 블록 레벨(p, h1~h6, li, blockquote leaf 등) 줄번호 거터를 구현 완료했다. 이번 F49.1은 1차에서 의도적으로 제외한 두 영역을 확장한다:

1. **테이블 행 줄번호**: `tr` 핸들러의 `includeAnchorLine: false`를 제거하여 각 행에 줄번호를 표시한다. `th`/`td` 셀과 `<table>` 컨테이너의 CSS suppression은 그대로 유지해 중복을 방지한다.
2. **코드 블록 내부 줄번호**: `HighlightedCodeBlock` 컴포넌트에 `sourceLineStart` prop을 추가하고, 각 코드 줄을 `<span data-source-line="N">` 으로 감싸 원문 시작줄+오프셋 기반 줄번호를 부착한다. `<pre>` 래퍼의 줄번호는 CSS suppression으로 숨긴다.

## Scope Delta

### 포함

| 영역 | 변경 내용 |
|------|----------|
| `tr` 핸들러 | `includeAnchorLine: false` 제거 → `data-source-line` 속성 활성화 |
| `th`/`td` 핸들러 | `includeAnchorLine: false` 유지 (변경 없음 — 중복 방지) |
| `<table>` CSS suppression | `content: none` 유지 (변경 없음) |
| `HighlightedCodeBlock` | `sourceLineStart` prop 추가, 각 줄 `<span>` 래핑 + `data-source-line` 부착 |
| `code` 핸들러 | `node.position.start.line`을 `sourceLineStart`로 전달 |
| `<pre>` CSS | 줄번호 suppression 규칙 추가 (`pre[data-source-line]::before { content: none }`) |
| CSS | `tr[data-source-line]::before` 스타일 추가 (셀 내 정렬 고려) |
| 테스트 | 테이블 행 줄번호, 코드 블록 내부 줄번호 검증 테스트 추가 |

### 제외

- 줄번호 on/off 토글 UI (1차 때 scope 밖으로 분류, 그대로 유지)
- 코드 블록 내부 줄번호의 클릭/네비게이션 기능 (기존 `pre` 기반 소스 액션으로 충분)
- `th`/`td` 셀 개별 줄번호 (행 단위 줄번호로 충분, 셀 단위는 시각적 노이즈)

## Contract/Invariant Delta

### Contracts

| ID | 유형 | 설명 |
|----|------|------|
| C1 | 신규 | `tr` 요소에 `data-source-line` 속성이 부착되어 원문 줄번호가 거터로 표시된다 |
| C2 | 신규 | `HighlightedCodeBlock`이 `sourceLineStart` prop을 받고, 각 코드 줄을 `<span data-source-line="sourceLineStart + index">` 로 래핑한다 |
| C3 | 신규 | `code` 핸들러가 fenced block일 때 `node.position.start.line`을 `sourceLineStart`로 전달한다 |
| C4 | 신규 | `pre[data-source-line]::before`에 `content: none`을 적용해 `<pre>` 래퍼 줄번호를 숨긴다 |
| C5 | 기존 유지 | `th`/`td` 핸들러의 `includeAnchorLine: false` 유지 — 셀 레벨 줄번호 중복 방지 |
| C6 | 기존 유지 | `table[data-source-line]::before { content: none }` 유지 — 테이블 컨테이너 줄번호 suppression |

### Invariants

| ID | 설명 |
|----|------|
| I1 | comment marker 거터와의 공존 레이아웃이 회귀하지 않는다 |
| I2 | 기존 블록 레벨 줄번호(p, h1~h6, li 등)가 회귀하지 않는다 |
| I3 | 코드 블록 내부 줄번호 추가가 기존 citation navigation, syntax highlighting, source action에 영향을 주지 않는다 |
| I4 | `tr`의 `data-source-line` 활성화가 기존 테이블 cell source mapping (Go to Source, Add Comment)에 영향을 주지 않는다 |
| I5 | blockquote 내부 leaf 줄번호 동작이 회귀하지 않는다 |

## Touchpoints

| 파일 | 관련 영역 | 변경 이유 |
|------|----------|----------|
| `src/spec-viewer/spec-viewer-panel.tsx` | `HighlightedCodeBlock` 컴포넌트 (~896-975) | `sourceLineStart` prop 추가, 줄별 `<span>` 래핑 |
| `src/spec-viewer/spec-viewer-panel.tsx` | `code` 핸들러 (~1842-1848) | `sourceLineStart` prop 전달 |
| `src/spec-viewer/spec-viewer-panel.tsx` | `tr` 핸들러 (~1898-1901) | `includeAnchorLine: false` 제거 |
| `src/App.css` | source line gutter 섹션 (~1514-1541) | `pre` suppression, `tr` 줄번호 스타일 추가 |
| `src/spec-viewer/spec-viewer-panel.test.tsx` | 줄번호 DOM 테스트 | 테이블 행, 코드 블록 내부 줄번호 검증 |
| `src/App.test.tsx` | CSS 규칙 테스트 (~11014-11060) | `pre` suppression, `tr` 스타일 규칙 검증 |

## Implementation Plan

### Phase 1: 테이블 행 줄번호 활성화

1. `spec-viewer-panel.tsx`의 `tr` 핸들러에서 `includeAnchorLine: false` 옵션 제거
2. `App.css`에 `tr[data-source-line]::before` 위치/스타일 규칙 추가 (행 내 정렬)
3. 테스트 추가: `tr` 요소에 `data-source-line` 속성이 존재하는지 검증

### Phase 2: 코드 블록 내부 줄번호

1. `HighlightedCodeBlock`에 `sourceLineStart` prop 추가
2. 각 코드 줄 렌더링을 `<span data-source-line="N">` 으로 래핑
3. `code` 핸들러에서 `node.position.start.line`을 `sourceLineStart`로 전달
4. `App.css`에 `pre[data-source-line]::before { content: none }` 추가
5. 코드 블록 내부 `<span>` 줄번호의 CSS 스타일 규칙 추가
6. 테스트 추가: 코드 블록 내 `<span>` 요소에 올바른 `data-source-line` 값이 부착되는지 검증

### Phase 3: 회귀 검증 및 CSS 정리

1. 기존 블록 레벨 줄번호 테스트 전체 pass 확인
2. comment marker 공존 레이아웃 회귀 확인
3. citation navigation, syntax highlighting 회귀 확인
4. CSS 정합성 테스트 추가 (App.test.tsx)

## Validation Plan

| ID | 검증 항목 | 유형 | Targets |
|----|----------|------|---------|
| V1 | `tr` 요소에 `data-source-line` 속성이 존재하고 올바른 줄번호를 가진다 | DOM 단위 테스트 | C1, I4 |
| V2 | `th`/`td`에는 `data-source-line` 속성이 없다 (중복 방지) | DOM 단위 테스트 | C5 |
| V3 | 코드 블록 내 각 줄의 `<span>`에 `data-source-line="sourceLineStart + index"` 가 부착된다 | DOM 단위 테스트 | C2, C3 |
| V4 | `<pre>` 요소의 CSS `::before` content가 none이다 (CSS 규칙 검증) | CSS 패턴 테스트 | C4 |
| V5 | 테이블 컨테이너 `<table>`의 줄번호 suppression이 유지된다 | CSS 패턴 테스트 | C6 |
| V6 | 기존 블록 레벨 줄번호 테스트가 모두 pass한다 | 회귀 테스트 | I2, I5 |
| V7 | comment marker 거터 레이아웃이 회귀하지 않는다 | 시각적 검증 + 기존 테스트 | I1 |
| V8 | 코드 블록 citation navigation이 정상 동작한다 | 기존 테스트 pass | I3 |
| V9 | 코드 블록 syntax highlighting이 정상 동작한다 | 기존 테스트 pass | I3 |
| V10 | 테이블 cell source action (Go to Source, Add Comment)이 회귀하지 않는다 | 기존 테스트 pass | I4 |
| V11 | 전체 테스트 스위트 (`npm test`) pass | 통합 | I1~I5 |

## Risks / Open Questions

| # | 유형 | 내용 | 대응 |
|---|------|------|------|
| 1 | Risk | `tr`에 `data-source-line` 추가 시 기존 source line resolver가 테이블 탐색에서 `tr`을 candidate로 잡아 source action 정확도에 영향을 줄 수 있다 | `source-line-resolver.ts`의 탐색 로직을 확인하여 `tr`이 후보 우선순위에서 `th`/`td`를 밀어내지 않는지 검증 |
| 2 | Risk | 코드 블록 내부 `<span>` 래핑이 citation segment 렌더링과 충돌할 수 있다 | citation이 있는 줄은 기존 `renderedCitationSegments` 경로를 유지하되, 해당 `<span>` 안에 citation segment를 포함시키는 구조로 설계 |
| 3 | Risk | `tr`의 `::before` pseudo-element가 테이블 레이아웃(display: table-row)에서 정상 렌더링되지 않을 수 있다 | `tr`에 `position: relative; display: block` 등 추가가 테이블 깨짐을 유발할 수 있으므로, `tr` 대신 첫 번째 `td`/`th`에 row 줄번호를 위임하는 대안도 고려 |
| 4 | Open | `tr`의 `::before`가 table-row display에서 정상 동작하지 않으면 대안 접근이 필요 — 구현 단계에서 실제 렌더링 확인 후 결정 | Phase 1에서 실제 렌더링 테스트 후 CSS 전략 확정 |
| 5 | Open | 코드 블록 내부 줄번호의 시각적 크기/위치가 코드 가독성을 해칠 수 있음 | CSS 조정으로 opacity/font-size/padding 최적화, 필요 시 코드 블록 좌측 padding 추가 |

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

F49(1차) spec viewer 줄번호 거터 구현의 후속 확장으로, 테이블 행과 코드 블록 내부에 원문 줄번호를 추가한다. 1차에서 CSS-only 접근으로 완성한 블록 레벨 줄번호 인프라 위에, 최소한의 React 컴포넌트 변경과 CSS 추가로 확장한다.

## Scope

- **테이블 행**: `tr` 핸들러의 `includeAnchorLine` 옵션 제거 (1줄 변경) + CSS 추가
- **코드 블록 내부**: `HighlightedCodeBlock` prop 추가 + 줄별 `<span>` 래핑 + CSS 추가
- **회귀 보장**: 기존 테스트 전체 pass + 신규 테스트 추가

## Components

| 컴포넌트 | 역할 | 변경 크기 |
|----------|------|----------|
| `spec-viewer-panel.tsx` | 마크다운 렌더 핸들러 + HighlightedCodeBlock | Medium |
| `App.css` | 줄번호 거터 CSS 규칙 | Small |
| `spec-viewer-panel.test.tsx` | DOM 단위 테스트 | Medium |
| `App.test.tsx` | CSS 규칙 테스트 | Small |

## Contract/Invariant Delta Coverage

| Delta ID | 담당 Task | 검증 Task |
|----------|----------|----------|
| C1 | T1 | T3 (V1) |
| C2 | T2 | T3 (V3) |
| C3 | T2 | T3 (V3) |
| C4 | T2 | T4 (V4) |
| C5 | — (기존 유지) | T3 (V2) |
| C6 | — (기존 유지) | T4 (V5) |
| I1 | — | T5 (V7) |
| I2 | — | T5 (V6) |
| I3 | — | T5 (V8, V9) |
| I4 | T1 | T5 (V10) |
| I5 | — | T5 (V6) |

## Implementation Phases

### Phase 1: 테이블 행 줄번호 (T1)

단일 변경으로 `tr` 핸들러를 수정하고, CSS에서 테이블 행 줄번호가 올바르게 표시되도록 한다.

### Phase 2: 코드 블록 내부 줄번호 (T2)

`HighlightedCodeBlock` 컴포넌트와 `code` 핸들러를 수정하고, CSS에서 `pre` suppression 및 코드 줄번호 스타일을 추가한다.

### Phase 3: 테스트 추가 (T3, T4 — 병렬 가능)

DOM 단위 테스트(T3)와 CSS 규칙 테스트(T4)를 병렬로 작성한다.

### Phase 4: 회귀 검증 (T5)

기존 테스트 전체 pass를 확인하고, 시각적 회귀를 점검한다.

## Task Details

### T1: 테이블 행 줄번호 활성화

**Target Files**:
- `[M] src/spec-viewer/spec-viewer-panel.tsx` — `tr` 핸들러에서 `includeAnchorLine: false` 제거
- `[M] src/App.css` — `tr` 줄번호 CSS 규칙 추가

**Dependencies**: 없음

**Technical Notes**:
- line ~1898-1901: `renderElementWithSourceLine('tr', props, { includeAnchorLine: false })` → 옵션 객체 제거 또는 `includeAnchorLine: true` (기본값)로 변경
- `tr`은 `display: table-row`이므로 `::before`가 정상 동작하지 않을 수 있음. 이 경우 두 가지 대안:
  - (a) `tr`에 `position: relative` 추가 후 `::before` 위치 조정
  - (b) `tr`의 줄번호를 첫 번째 셀에 위임 (CSS `tr[data-source-line] > :first-child::before` 등)
- 실제 렌더링 확인 후 CSS 전략 확정 (Risk #3, #4 참조)
- Contracts: C1
- Invariants: I4

### T2: 코드 블록 내부 줄번호

**Target Files**:
- `[M] src/spec-viewer/spec-viewer-panel.tsx` — `HighlightedCodeBlock` 컴포넌트에 `sourceLineStart` prop 추가 + 줄별 `<span>` 래핑; `code` 핸들러에서 prop 전달
- `[M] src/App.css` — `pre[data-source-line]::before { content: none }` 추가; 코드 블록 내 `<span>[data-source-line]` 스타일 규칙 추가

**Dependencies**: 없음 (T1과 병렬 가능)

**Technical Notes**:

1. `HighlightedCodeBlock` 시그니처 변경:
   ```tsx
   function HighlightedCodeBlock({
     code,
     language,
     appearanceTheme,
     onCitationClick,
     sourceLineStart,  // 추가
   }: {
     code: string
     language: HighlightLanguage
     appearanceTheme: AppearanceTheme
     onCitationClick: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
     sourceLineStart?: number  // 추가
   })
   ```

2. 줄별 래핑 (line ~962-971):
   - 기존 `<Fragment key={...}>` 내부의 렌더링을 `<span data-source-line={sourceLineStart ? sourceLineStart + index : undefined}>` 으로 감싸기
   - citation segment가 있는 줄도 동일하게 `<span>` 안에 포함

3. `code` 핸들러 (line ~1842-1848):
   ```tsx
   <HighlightedCodeBlock
     appearanceTheme={appearanceTheme}
     code={codeText}
     language={language}
     onCitationClick={handleMarkdownLinkClick}
     sourceLineStart={node?.position?.start?.line}  // 추가
   />
   ```

4. CSS:
   - `pre[data-source-line]::before { content: none }` — `<pre>` 래퍼 줄번호 숨기기
   - 코드 블록 내부 `<span>`의 줄번호 스타일은 기존 `[data-source-line]::before` 규칙을 상속하되, 코드 블록 특유의 패딩/위치 조정이 필요할 수 있음
   - 코드 블록 내부 `<span>`에 `position: relative`를 추가하여 `::before`가 올바르게 위치하도록 해야 할 수 있음 (기존 블록 요소는 `.spec-viewer-content`를 containing block으로 사용)

- Contracts: C2, C3, C4
- Invariants: I3
- Risk #2 참조: citation segment와의 공존 구조 확인 필요

### T3: DOM 단위 테스트 추가

**Target Files**:
- `[M] src/spec-viewer/spec-viewer-panel.test.tsx` — 테이블 행 줄번호 + 코드 블록 내부 줄번호 DOM 검증 테스트 추가

**Dependencies**: T1, T2

**Technical Notes**:

테스트 케이스:
1. **V1**: GFM 테이블을 렌더링하고 `tr` 요소에 `data-source-line` 속성이 존재하며 올바른 값을 가지는지 검증
2. **V2**: 같은 테이블에서 `th`/`td`에는 `data-source-line` 속성이 없는지 검증 (기존 동작 유지)
3. **V3**: fenced code block을 렌더링하고 `<code>` 내부 `<span>` 요소들에 `data-source-line` 값이 `sourceLineStart + 줄오프셋`과 일치하는지 검증

마크다운 예시:
```markdown
# Title

| Col A | Col B |
|-------|-------|
| val1  | val2  |
| val3  | val4  |

```python
def hello():
    print("world")
```
```

- Validation: V1, V2, V3
- Contracts: C1, C2, C3, C5

### T4: CSS 규칙 테스트 추가

**Target Files**:
- `[M] src/App.test.tsx` — `pre` suppression + `tr` 스타일 CSS 패턴 테스트 추가

**Dependencies**: T1, T2

**Technical Notes**:

기존 `describe('source line gutter CSS', ...)` 블록에 추가할 테스트:
1. **V4**: `pre[data-source-line]::before` 에 `content: none`이 있는지 CSS 소스 패턴 매칭
2. **V5**: `table[data-source-line]::before` suppression이 여전히 존재하는지 확인 (기존 테스트와 별도로 명시적 검증)

- Validation: V4, V5
- Contracts: C4, C6

### T5: 회귀 검증

**Target Files**:
- `[M] src/spec-viewer/spec-viewer-panel.test.tsx` — 기존 테스트 pass 확인 (수정 아닌 실행)
- `[M] src/App.test.tsx` — 기존 CSS 테스트 pass 확인 (수정 아닌 실행)

**Dependencies**: T1, T2, T3, T4

**Technical Notes**:
1. `npm test` 전체 실행 → 823+ passed, 0 failed 확인 (V11)
2. 기존 블록 레벨 줄번호 테스트 pass 확인 (V6)
3. comment marker 레이아웃 테스트 pass 확인 (V7)
4. citation navigation 테스트 pass 확인 (V8)
5. syntax highlighting 테스트 pass 확인 (V9)
6. 테이블 cell source action 테스트 pass 확인 (V10)

- Validation: V6, V7, V8, V9, V10, V11
- Invariants: I1, I2, I3, I4, I5

## Parallel Execution Summary

```
Phase 1 + Phase 2 (병렬):
  T1: 테이블 행 줄번호 ─────────┐
  T2: 코드 블록 내부 줄번호 ─────┤
                                 ▼
Phase 3 (병렬):
  T3: DOM 단위 테스트 ───────────┐
  T4: CSS 규칙 테스트 ───────────┤
                                 ▼
Phase 4:
  T5: 회귀 검증 ─────────────────
```

- T1, T2는 서로 독립적 (다른 핸들러/컴포넌트 수정)이므로 병렬 가능
- T3, T4는 T1/T2 완료 후 병렬로 작성 가능
- T5는 모든 구현 + 테스트 완료 후 전체 pass 확인

## Risks and Mitigations

| # | Risk | 영향 | 완화 |
|---|------|------|------|
| 1 | `tr`의 `display: table-row`에서 `::before` pseudo-element가 정상 렌더링되지 않음 | 테이블 행 줄번호가 보이지 않거나 레이아웃 깨짐 | T1에서 실제 렌더링 확인 후 CSS 전략 확정. 대안으로 첫 번째 셀에 줄번호를 위임하는 방식을 fallback으로 준비 |
| 2 | 코드 블록 `<span>` 래핑이 citation segment 렌더링과 충돌 | citation 링크가 깨지거나 줄번호가 누락됨 | T2에서 citation이 있는 줄과 없는 줄을 분리 테스트. `<span>` 이 citation 경로를 감싸는 구조로 구현 |
| 3 | source-line-resolver가 `tr`의 `data-source-line`을 후보로 잡아 기존 cell-level 정확도에 영향 | Go to Source, Add Comment가 cell이 아닌 row로 점프 | T5에서 기존 테이블 source action 테스트 pass 확인. 필요 시 resolver에 `tr` 필터링 로직 추가 |
| 4 | 코드 블록 내부 `<span>` 줄번호의 `::before` 위치가 코드 들여쓰기와 충돌 | 줄번호가 코드 텍스트와 겹침 | T2에서 `position: relative` + 좌측 padding/margin 조정으로 해결. 코드 블록 전용 CSS 규칙 분리 |

## Open Questions

| # | 질문 | 영향 | 대응 |
|---|------|------|------|
| 1 | `tr`의 `::before`가 table-row에서 동작하지 않을 때 첫 번째 셀 위임 방식이 `th`/`td`의 `includeAnchorLine: false`와 충돌하지 않는가? | CSS 전략 변경 필요 | T1 구현 시 실험 후 결정 |
| 2 | 코드 블록 내부 줄번호의 containing block이 `.spec-viewer-content`인지 `<pre>`인지에 따라 `::before` 위치 계산이 달라진다 | 줄번호 정렬 방식 결정 | T2에서 `<span>`에 `position: relative`를 주거나, `<pre>` 내부에 별도 gutter 레이아웃을 도입할지 실험 |
| 3 | fenced code block에서 `node.position.start.line`이 opening fence (` ``` `) 줄인지 첫 번째 코드 줄인지에 따라 오프셋 보정이 필요한가? | 줄번호 정확도 | T2에서 실제 AST 출력을 확인하여 `+1` 보정 여부 결정. 일반적으로 `code` 노드의 position은 코드 내용 시작줄을 가리킴 |
