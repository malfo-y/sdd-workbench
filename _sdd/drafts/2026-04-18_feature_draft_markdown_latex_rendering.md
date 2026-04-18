# Feature Draft: Spec Viewer Markdown LaTeX Rendering

<!-- spec-update-todo-input-start -->
# Part 1: Temporary Spec Draft

## Change Summary

- Spec Viewer markdown renderer에 LaTeX math 파이프라인을 추가해 `$...$` 인라인 수식과 `$$...$$` 블록 수식을 텍스트가 아닌 수식 DOM으로 렌더한다.
- 기존 `remark-gfm`, citation link, slug, link interception, source mapping, markdown 보안 정책을 유지한 채 math 렌더링만 좁은 범위로 통합한다.
- math 렌더링은 plugin 추가만으로 끝내지 않고 sanitize allowlist, KaTeX style loading, source-line metadata 보존, 회귀 테스트를 함께 고정한다.

## Scope Delta

### In Scope

- `remark-math` + `rehype-katex` 또는 동등한 안전한 pipeline을 Spec Viewer markdown 렌더링에 통합
- KaTeX CSS를 앱 bootstrap 시점에 1회 로드하고 Spec Viewer 패널에서 display math overflow/spacing이 읽기 가능하게 유지되도록 보강
- KaTeX가 생성하는 HTML/MathML subtree가 현재 sanitize 정책에 의해 제거되지 않도록 allowlist를 최소 범위로 확장
- math가 포함된 rendered block에서도 기존 source action, line metadata, search/navigation highlight가 불필요하게 깨지지 않도록 유지
- inline/block math 렌더링 및 주요 보안/회귀 경로 테스트 추가

### Out of Scope

- TeX macro customization UI
- 사용자 임의 HTML 허용 또는 raw HTML 렌더링 정책 완화
- MathJax 등 다른 수식 엔진 도입
- markdown 외 코드 뷰어/코멘트 export 모델 변경
- 구현 완료 후 persistent spec 반영 작업 자체

### Guardrails

- 기존 `sanitizeMarkdownUri`의 차단 정책(`javascript:`, `vbscript:`, `file:`, 임의 `data:`)은 유지한다.
- math plugin 도입으로 existing link/citation/image/source mapping contract를 약화시키지 않는다.
- 스타일은 패널 mount마다 중복 주입하지 않고 앱 bootstrap에서 한 번만 로드한다.
- math subtree 때문에 source-line gutter가 equation 내부에 과도하게 찍히지 않도록 inline/display math wrapper에 필요한 최소 metadata만 남긴다.

## Contract/Invariant Delta

| ID | Type | Change | Why |
|----|------|--------|-----|
| C1 | Modify | Spec Viewer markdown pipeline은 `$...$` 인라인 수식과 `$$...$$` 블록 수식을 safe math plugin chain으로 렌더해야 한다. | 현재는 plain text로 남아 사용자가 수식을 읽기 어렵다. |
| C2 | Modify | math 렌더링 후에도 markdown 보안 정책은 유지되어야 하며, sanitize schema는 KaTeX가 생성한 최소 HTML/MathML 구조만 통과시켜야 한다. | math 지원을 위해 보안 경계를 넓히되 uncontrolled HTML 허용으로 번지면 안 된다. |
| C3 | Modify | math가 포함된 rendered subtree도 기존 source action과 line-level source mapping을 계속 제공해야 하며, inline/display math가 기존 selection fallback을 깨면 안 된다. | renderer capability 추가가 `Go to Source`, comment entry, search highlight 회귀로 이어지면 안 된다. |
| I1 | Add | KaTeX vendor stylesheet는 앱 bootstrap 경로에서 정확히 1회 로드되어야 하며, Spec Viewer mount/unmount에 의존하면 안 된다. | 스타일 flash나 중복 주입 없이 일관된 수식 레이아웃을 유지해야 한다. |
| I2 | Add | non-math markdown 동작(relative image, internal link, citation, source-text leaf wrapping, search/navigation highlight)은 기존 계약을 유지해야 한다. | math 지원이 기존 reader workflow를 해치지 않아야 한다. |

## Touchpoints

- `src/spec-viewer/spec-viewer-panel.tsx`
  - `remarkPlugins` / `rehypePlugins` 체인에 math pipeline을 추가하고, 기존 slug/sanitize/source-leaf 단계와 충돌하지 않도록 순서를 고정한다.
- `src/spec-viewer/spec-viewer-markdown-components.tsx`
  - KaTeX root span이 source-line metadata를 잃지 않도록 custom span renderer 범위를 보강한다.
- `src/spec-viewer/markdown-security.ts`
  - KaTeX/MathML 렌더 결과가 sanitize 단계에서 제거되지 않도록 태그/속성/class allowlist를 최소 범위로 확장한다.
- `src/main.tsx`
  - KaTeX stylesheet를 앱 bootstrap 시점에 1회 import한다.
- `src/App.css`
  - display math spacing/overflow가 spec panel 레이아웃 안에서 읽기 가능하도록 좁은 범위의 패널 스타일 보강을 검토한다.
- `src/spec-viewer/spec-viewer-panel.test.tsx`
  - math 렌더링, source-line metadata, 기존 link/image/citation behavior regression을 함께 고정한다.
- `src/spec-viewer/markdown-security.test.ts`
  - sanitize policy가 math 지원 후에도 기존 URI 차단 규칙을 유지하는지 검증한다.
- `package.json`
  - math plugin 및 vendor style 의존성을 추가한다.

## Implementation Plan

1. math 렌더링 의존성(`remark-math`, `rehype-katex`, `katex`)과 global stylesheet loading 경로를 먼저 고정한다.
2. `spec-viewer-panel.tsx`에 remark/rehype math chain을 추가하고, citation/GFM/link interception과의 순서를 조정한다.
3. sanitize schema와 span renderer를 보강해 KaTeX output이 제거되지 않으면서도 source mapping과 보안 경계가 유지되게 만든다.
4. display overflow와 panel-level presentation을 다듬고, inline/block math 및 기존 markdown regression을 테스트로 고정한 뒤 repo gate와 Electron 수동 확인으로 닫는다.

## Validation Plan

| ID | Targets | Verification Method | Evidence / Notes |
|----|---------|---------------------|------------------|
| V1 | C1, I1 | test, manual UI check | `spec-viewer-panel.test.tsx`에서 inline/display math KaTeX DOM 존재와 raw delimiter 비노출을 검증하고, `npm run dev` Electron에서 style flash/overflow를 확인한다. |
| V2 | C2 | test | `markdown-security.test.ts`와 sanitize schema assertions로 unsafe URI 차단 유지, KaTeX/MathML allowlist 최소화 여부를 검증한다. |
| V3 | C3, I2 | test, review | math가 포함된 rendered subtree에서 source-line metadata와 context-menu fallback이 유지되는지, 기존 image/link/citation regression이 없는지 panel tests와 코드 리뷰로 확인한다. |
| V4 | C1, C2, C3, I1, I2 | repo gate | `npm test`, `npm run lint` 통과로 최종 통합 상태를 확인한다. |

## Risks / Open Questions

- `remark-math`의 single-dollar inline parsing은 금액 표기 같은 일반 텍스트와 충돌할 수 있다. 이번 범위는 사용자 요구에 맞춰 `$...$` 지원을 우선하지만, 충돌 사례가 있으면 문서 escape guideline이나 parser option 조정이 후속 이슈가 될 수 있다.
- KaTeX output을 sanitize 뒤에 두면 schema 확장이 필수이고, sanitize 앞에 두면 plugin output을 직접 신뢰하는 형태가 된다. 이번 구현은 explicit allowlist를 가진 sanitize-after-katex 경로를 우선 검토하는 편이 traceability와 보안 설명에 유리하다.
- display math가 긴 경우 panel width를 넘길 수 있다. vendor CSS import만으로 충분하지 않으면 `App.css`에 `.katex-display` overflow guard를 추가해야 한다.
- KaTeX root span에 source-line metadata를 어떻게 부여할지에 따라 line-number gutter noise가 생길 수 있다. block/inline math wrapper에는 `data-source-line-start/end` 중심으로 최소 metadata를 부여하는 쪽이 안전하다.

<!-- spec-update-todo-input-end -->

# Part 2: Implementation Plan

## Overview

이번 변경은 "수식 렌더링 추가"처럼 보이지만 실제 구현 surface는 네 갈래입니다. 의존성과 전역 스타일 bootstrap을 먼저 고정하고, Spec Viewer markdown pipeline에 math를 연결한 뒤, sanitize/source-mapping 경계를 좁게 보강하고, 마지막으로 panel regression과 repo gate를 닫는 순서가 가장 안전합니다. 목표는 KaTeX DOM을 보이게 만드는 것만이 아니라, 기존 spec-viewer workflow가 math 문서에서도 그대로 유지되게 만드는 것입니다.

## Scope

### In Scope

- `remark-math`, `rehype-katex`, `katex` 의존성 추가
- KaTeX CSS global import와 spec panel display math overflow/spacing 보강
- `react-markdown` math plugin chain 통합
- KaTeX HTML/MathML sanitize allowlist 최소 확장
- math wrapper source-line metadata 유지
- inline/block math regression 및 보안 회귀 테스트

### Out of Scope

- custom macro registry
- 수식 편집기 UX
- raw HTML enablement
- spec document rewrite
- math search semantics 재설계

## Components

1. **Dependency + Bootstrap Layer**
   - `package.json`, `package-lock.json`, `src/main.tsx`
   - math engine 의존성과 vendor stylesheet loading 지점을 고정한다.
2. **Markdown Rendering Layer**
   - `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/spec-viewer-markdown-components.tsx`
   - remark/rehype chain과 math wrapper의 source metadata 보존을 담당한다.
3. **Sanitization Boundary Layer**
   - `src/spec-viewer/markdown-security.ts`, `src/spec-viewer/markdown-security.test.ts`
   - KaTeX/MathML allowlist 확장과 기존 URI policy 유지 여부를 담당한다.
4. **Presentation + Regression Layer**
   - `src/App.css`, `src/spec-viewer/spec-viewer-panel.test.tsx`
   - display math readability와 rendered-panel 회귀를 닫는다.

## Contract/Invariant Delta Coverage

| Delta ID | Covered By | Primary Tasks | Validation |
|----------|------------|---------------|------------|
| C1 | math plugin chain, bootstrap stylesheet, renderer wiring | T1, T2 | V1, V4 |
| C2 | sanitize schema 확장과 URI policy 유지 | T3 | V2, V4 |
| C3 | KaTeX wrapper source metadata, context-menu/search fallback 유지 | T2, T4 | V3, V4 |
| I1 | global CSS import 1회 보장 | T1, T4 | V1, V4 |
| I2 | non-math markdown behavior 회귀 방지 | T2, T3, T4 | V2, V3, V4 |

## Implementation Phases

### Phase 1: Setup

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | math dependency와 bootstrap stylesheet loading을 추가한다 | P0 | - | Dependency + Bootstrap Layer |

### Phase 2: Renderer Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T2 | Spec Viewer markdown pipeline과 math wrapper source metadata를 통합한다 | P0 | T1 | Markdown Rendering Layer |
| T3 | KaTeX sanitize boundary를 최소 allowlist로 보강한다 | P0 | T1 | Sanitization Boundary Layer |

### Phase 3: Presentation and Validation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T4 | Spec Viewer math presentation과 regression coverage를 고정한다 | P1 | T2, T3 | Presentation + Regression Layer |

## Task Details

### Task T1: math dependency와 bootstrap stylesheet loading을 추가한다
**Component**: Dependency + Bootstrap Layer
**Priority**: P0
**Type**: Infrastructure

**Description**: `remark-math`, `rehype-katex`, `katex`를 프로젝트 의존성에 추가하고, KaTeX CSS를 `src/main.tsx`에서 앱 bootstrap 시점에 1회 import한다. 스타일 로딩을 panel 내부로 밀어 넣지 말고, renderer 전체에서 deterministic하게 로드되도록 고정한다.

**Acceptance Criteria**:
- [ ] `package.json`에 math rendering 관련 dependency가 추가된다.
- [ ] `package-lock.json`이 새 의존성 트리를 반영한다.
- [ ] KaTeX CSS는 `src/main.tsx` 또는 동등한 앱 bootstrap entry에서 정확히 1회 import된다.
- [ ] spec panel mount/unmount와 무관하게 math styling이 유지된다.

**Target Files**:
- [M] `package.json` -- `remark-math`, `rehype-katex`, `katex` dependency 추가
- [M] `package-lock.json` -- lockfile 동기화
- [M] `src/main.tsx` -- KaTeX vendor stylesheet global import

**Technical Notes**: Covers C1, I1, validated by V1, V4. 스타일 import를 panel component로 넣으면 lazy mount 시 FOUC와 중복 주입 위험이 생기므로 bootstrap 경로가 우선이다.
**Dependencies**: -

### Task T2: Spec Viewer markdown pipeline과 math wrapper source metadata를 통합한다
**Component**: Markdown Rendering Layer
**Priority**: P0
**Type**: Feature

**Description**: `spec-viewer-panel.tsx`의 `remarkPlugins` / `rehypePlugins` 체인에 math pipeline을 추가하고, `spec-viewer-markdown-components.tsx`에서 KaTeX root span이 source-line metadata를 잃지 않도록 보강한다. goal은 수식이 보이면서도 기존 link interception, citation, search/navigation highlight, source action fallback이 그대로 살아 있는 상태다.

**Acceptance Criteria**:
- [ ] `$...$` 인라인 수식이 KaTeX inline DOM으로 렌더된다.
- [ ] `$$...$$` 블록 수식이 KaTeX display DOM으로 렌더된다.
- [ ] `remark-gfm`, citation link, slug, link interception이 math 추가 후에도 유지된다.
- [ ] inline/display math wrapper가 `data-source-line-start/end` 또는 동등 metadata를 유지해 source action fallback이 계속 가능하다.

**Target Files**:
- [M] `src/spec-viewer/spec-viewer-panel.tsx` -- remark/rehype math plugin chain 및 plugin order 통합
- [M] `src/spec-viewer/spec-viewer-markdown-components.tsx` -- KaTeX span에 필요한 최소 source metadata 보강

**Technical Notes**: Covers C1, C3, I2, validated by V1, V3. `remarkMath`는 citation transform보다 먼저 두어 math token을 citation parser가 건드리지 않게 하고, rehype 단계는 KaTeX output과 sanitize/source-leaf wrapping 순서를 명시적으로 고정해야 한다.
**Dependencies**: T1

### Task T3: KaTeX sanitize boundary를 최소 allowlist로 보강한다
**Component**: Sanitization Boundary Layer
**Priority**: P0
**Type**: Feature

**Description**: `markdown-security.ts`의 sanitize schema를 확장해 KaTeX가 생성하는 `span` class와 필요한 MathML 태그/속성만 통과시키고, 기존 URI 차단 정책은 그대로 유지한다. math 지원을 이유로 wildcard allowlist나 unsafe scheme 허용으로 넓히지 않는다.

**Acceptance Criteria**:
- [ ] KaTeX output에 필요한 `span.className`과 MathML 태그/속성이 sanitize 단계에서 제거되지 않는다.
- [ ] `sanitizeMarkdownUri`는 기존 unsafe scheme 차단 동작을 유지한다.
- [ ] relative image resolution과 blocked external image policy는 기존대로 유지된다.
- [ ] allowlist는 observed KaTeX output을 중심으로 최소 범위로 제한된다.

**Target Files**:
- [M] `src/spec-viewer/markdown-security.ts` -- KaTeX/MathML sanitize schema 확장
- [M] `src/spec-viewer/markdown-security.test.ts` -- unsafe URI policy 유지 + math allowlist regression 추가

**Technical Notes**: Covers C2, I2, validated by V2, V4. `span` 전체 자유 허용 대신 className/MathML tag subset을 좁게 열고, 추가 태그가 필요하면 test-driven으로만 확장하는 편이 안전하다.
**Dependencies**: T1

### Task T4: Spec Viewer math presentation과 regression coverage를 고정한다
**Component**: Presentation + Regression Layer
**Priority**: P1
**Type**: Test

**Description**: math DOM이 실제 패널 레이아웃에서 읽기 가능하도록 display overflow/spacing을 다듬고, `spec-viewer-panel.test.tsx`에 inline/display math, source metadata, 기존 non-math regression을 함께 고정한다. jsdom 테스트는 KaTeX class presence와 source-line attrs를 중심으로 보고, 최종 시각 검증은 Electron에서 수행한다.

**Acceptance Criteria**:
- [ ] display math가 spec panel width를 넘길 때 읽을 수 있는 overflow behavior를 가진다.
- [ ] inline math가 본문 line-height를 과도하게 깨지 않는다.
- [ ] `spec-viewer-panel.test.tsx`에 inline math, display math, math-adjacent source metadata 검증이 추가된다.
- [ ] 기존 relative image, unsafe image placeholder, citation/link regression이 유지된다.
- [ ] 구현 후 `npm test`, `npm run lint`를 통과한다.

**Target Files**:
- [M] `src/App.css` -- `.spec-viewer-content .katex-display` 중심의 panel-level spacing/overflow 보강
- [M] `src/spec-viewer/spec-viewer-panel.test.tsx` -- inline/display math 및 regression test 추가

**Technical Notes**: Covers C3, I1, I2, validated by V1, V3, V4. 테스트는 brittle snapshot보다 `.katex`, `.katex-display`, source-line attribute 존재, 기존 placeholder/link handlers 유지 여부를 직접 assert하는 쪽이 안정적이다.
**Dependencies**: T2, T3

## Parallel Execution Summary

- `T1`은 선행 고정 작업이므로 단독으로 먼저 수행한다.
- `T2`와 `T3`는 `T1` 이후 병렬화 가능하다.
  - `T2` write set: `src/spec-viewer/spec-viewer-panel.tsx`, `src/spec-viewer/spec-viewer-markdown-components.tsx`
  - `T3` write set: `src/spec-viewer/markdown-security.ts`, `src/spec-viewer/markdown-security.test.ts`
- `T4`는 renderer chain과 sanitize contract가 닫힌 뒤 수행하는 것이 안전하다. `src/App.css`와 `src/spec-viewer/spec-viewer-panel.test.tsx`는 visual/test stabilization 성격이라 마지막 phase가 적합하다.

## Risks and Mitigations

- **Risk**: single-dollar parsing이 기존 prose의 currency 문장과 충돌할 수 있다.
  - **Mitigation**: 이번 범위는 요구사항 충족을 위해 single-dollar inline math를 우선 지원하되, 회귀 문서가 나오면 escape guidance 또는 parser option 재검토를 후속 이슈로 남긴다.
- **Risk**: sanitize schema를 너무 넓게 열면 기존 markdown security contract가 약해질 수 있다.
  - **Mitigation**: KaTeX generated output 기준의 최소 tag/attr/class subset만 허용하고, `markdown-security.test.ts`에 negative case를 유지한다.
- **Risk**: KaTeX root span에 metadata를 붙이는 방식이 line-number gutter noise를 만들 수 있다.
  - **Mitigation**: `data-source-line-start/end` 중심으로 최소 속성만 주고 `data-source-line` anchor는 display wrapper에만 필요한 경우에 제한한다.
- **Risk**: vendor CSS만으로는 긴 display equation이 panel 내부에서 잘리지 않을 수 있다.
  - **Mitigation**: `App.css`에 spec-viewer scoped `.katex-display` overflow guard를 추가하고 Electron에서 직접 확인한다.

## Open Questions

- inline math에 대해 single-dollar parsing을 그대로 유지할지, 문서 작성 가이드에서 currency escape를 별도로 안내할지는 구현 후 실제 문서 샘플을 보고 판단이 필요하다.
- display math wrapper에 `data-source-line` anchor를 둘지 `data-source-line-start/end`만 둘지는 실제 context-menu resolver 동작을 보고 가장 조용한 옵션으로 확정하는 편이 좋다.
