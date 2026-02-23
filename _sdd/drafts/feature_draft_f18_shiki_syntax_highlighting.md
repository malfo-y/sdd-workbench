# Feature Draft: F18 Shiki 기반 코드 하이라이팅

---

# Part 1: Spec Patch Draft

> This patch can be copy-pasted into the corresponding spec section,
> or used as input for the `spec-update-todo` skill.

# Spec Update Input

**Date**: 2026-02-23
**Author**: user
**Target Spec**: `/_sdd/spec/sdd-workbench/`

## New Features

### Feature: Shiki 기반 코드 하이라이팅 (F18)
**Priority**: Medium
**Category**: Code Viewer Enhancement
**Target Component**: Code Viewer Layer
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.4 Code Viewer Layer`

**Description**:
기존 PrismJS(`prismjs ^1.30.0`) 기반의 per-line 동기 하이라이팅을 Shiki 기반으로 교체한다.
Shiki는 TextMate 문법 + VS Code 테마를 사용해 더 정확하고 일관된 토큰 분류를 제공한다.
Electron 환경이므로 WASM 로딩이 안정적이며, 비동기 초기화를 singleton 캐시로 관리한다.

핵심 변경:
1. PrismJS 제거, Shiki(`shiki`) 의존성 추가
2. `syntax-highlight.ts`를 비동기 Shiki API 기반으로 전면 교체
3. `code-viewer-panel.tsx`에서 비동기 하이라이팅 결과를 `useEffect`+`useState`로 소비
4. Shiki CSS Variables 테마를 사용하여 기존 `.token.*` 커스텀 CSS를 `--shiki-*` CSS 변수 기반으로 교체
5. 지원 언어를 Shiki 내장 문법 기반으로 확장(기존 9개 → Shiki 번들 전체 사용 가능)

**Acceptance Criteria**:
- [ ] PrismJS 의존성(`prismjs`, `@types/prismjs`)이 제거된다.
- [ ] Shiki(`shiki`) 의존성이 추가된다.
- [ ] `highlightLines` 비동기 함수가 전체 파일 텍스트 + 언어를 받아 라인별 HTML 배열을 반환한다.
- [ ] Shiki highlighter는 최초 호출 시 한 번만 생성되고 이후 캐시된 인스턴스를 재사용한다.
- [ ] `HighlightLanguage` 타입이 Shiki의 `BundledLanguage`로 교체되거나, 기존 매핑이 Shiki 언어 ID로 변환된다.
- [ ] `language-map.ts`의 확장자 매핑이 Shiki 언어 ID 기반으로 업데이트되고 추가 언어(html, yaml, toml, shell, rust, go, java, c, cpp, swift, ruby, sql 등)가 포함된다.
- [ ] Code Viewer에서 비동기 하이라이팅 완료 전까지 plaintext(escape된 HTML)를 임시 표시한다.
- [ ] 비동기 하이라이팅 완료 후 교체 시 시각적 깜빡임이 최소화된다.
- [ ] CSS Variables 테마로 Shiki가 생성하는 `--shiki-*` 변수를 `.code-line-content`에서 커스텀 색상으로 바인딩한다.
- [ ] 기존 `.token.*` PrismJS 전용 CSS 규칙이 제거된다.
- [ ] Comment hover popover의 preview lines도 Shiki 기반으로 하이라이팅된다.
- [ ] 기존 테스트가 새로운 하이라이팅 메커니즘에 맞게 갱신되고 전체 테스트가 통과한다.
- [ ] `tsc --noEmit` 0 errors, `vitest run` all pass, `lint` 0 warnings.

**Technical Notes**:
- Shiki `codeToTokens()` API로 전체 코드 블록을 토큰화한 뒤, 라인별 토큰을 `<span style="color:var(--shiki-token-...)">` 형태로 직렬화하여 기존 `dangerouslySetInnerHTML` 패턴을 유지한다.
- CSS Variables 테마(`css-variables`)를 사용하면 Shiki가 `var(--shiki-token-comment)` 등의 CSS 변수를 출력하므로 기존 커스텀 다크 색상을 CSS 변수 바인딩으로 제어할 수 있다.
- Highlighter 인스턴스는 module-level Promise로 캐시해 중복 생성을 방지한다.
- `plaintext` 언어는 Shiki에서도 지원하므로 별도 분기 없이 동일하게 처리 가능하다.

**Dependencies**:
- `shiki` npm 패키지

---

## Improvements

### Improvement: 확장 가능한 언어 매핑
**Priority**: Low
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.4 Code Viewer Layer`
**Current State**: 9개 언어(ts, tsx, js, jsx, json, css, md, py)만 하이라이팅 지원
**Proposed**: Shiki 번들에 포함된 모든 언어를 `HighlightLanguage` 타입으로 사용 가능하게 하고, `language-map.ts`에 추가 확장자 매핑(html, yaml, toml, sh, rs, go, java, c, cpp, swift, rb, sql 등)을 포함
**Reason**: Shiki가 200+ TextMate 문법을 지원하므로, 추가 설정 없이 폭넓은 코드 프리뷰가 가능해짐

---

## Component Changes

### Modified Component: syntax-highlight.ts
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.4 Code Viewer Layer`
**Purpose**: PrismJS → Shiki 기반 비동기 하이라이팅 제공
**Input**: 전체 파일 텍스트 + 언어 식별자
**Output**: 라인별 HTML string 배열 (Promise)
**Planned Methods**:
- `getOrCreateHighlighter()` - Shiki highlighter 싱글톤 생성/반환 (Promise)
- `highlightLines(code: string, language: string): Promise<string[]>` - 전체 코드를 Shiki로 토큰화 후 라인별 HTML 배열 반환
- `highlightPreviewLines(lines: string[], language: string): Promise<string[]>` - hover preview용 라인별 하이라이팅

### Modified Component: language-map.ts
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.4 Code Viewer Layer`
**Purpose**: 확장자 → Shiki 언어 ID 매핑 확장
**Changes**: `HighlightLanguage` 타입을 Shiki의 `BundledLanguage | 'plaintext'`로 교체, 추가 확장자 매핑

### Modified Component: code-viewer-panel.tsx
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.4 Code Viewer Layer`
**Purpose**: 비동기 하이라이팅 결과 소비
**Changes**: `useMemo` 동기 하이라이팅 → `useEffect`+`useState` 비동기 패턴으로 전환, fallback plaintext 표시

---

## Notes

### Context
- Electron 앱이므로 Shiki의 WASM 로딩이 안정적으로 동작한다.
- 기존 PrismJS per-line 동기 하이라이팅은 라인 단위 토큰화로 인해 multi-line string/template literal 등에서 부정확한 토큰 분류가 발생할 수 있다. Shiki는 전체 코드를 한 번에 토큰화하므로 이 문제가 해결된다.
- CSS Variables 테마를 사용하면 사용자 정의 테마 색상을 CSS만으로 교체할 수 있어 유지보수성이 향상된다.

### Constraints
- Shiki 초기화는 비동기이므로 최초 파일 로드 시 짧은 plaintext 표시 구간이 존재할 수 있다(실제로는 highlighter가 캐시되면 후속 파일은 거의 즉시 하이라이팅됨).
- 매우 큰 파일(수천 줄)에서 전체 토큰화 비용이 PrismJS per-line보다 높을 수 있으나, 현재 앱의 파일 크기 제한(2MB)으로 실질적 문제 없음.

---
---

# Part 2: Implementation Plan

## Overview

PrismJS를 Shiki로 교체하여 코드 하이라이팅 정확도와 언어 범위를 대폭 향상시킨다.
핵심 변경은 `syntax-highlight.ts` 전면 교체, `language-map.ts` 확장, `code-viewer-panel.tsx` 비동기 소비 패턴 적용, CSS 토큰 스타일 교체이다.

## Scope

### In Scope
- PrismJS 제거 및 Shiki 의존성 추가
- `syntax-highlight.ts` Shiki 기반 전면 재작성
- `language-map.ts` Shiki 언어 ID 기반 확장
- `code-viewer-panel.tsx` 비동기 하이라이팅 소비
- `App.css` 토큰 CSS 교체 (`.token.*` → `--shiki-*` CSS 변수)
- 관련 테스트 갱신

### Out of Scope
- 사용자 테마 선택 UI
- 라인 번호 gutter 외 장식(diff highlight, bracket matching 등)
- spec viewer의 markdown 코드 블록 하이라이팅(react-markdown 영역)

## Components
1. **syntax-highlight**: Shiki highlighter 싱글톤 + `highlightLines`/`highlightPreviewLines` 비동기 API
2. **language-map**: 확장자→Shiki 언어 ID 매핑 + 타입 확장
3. **code-viewer-panel**: 비동기 하이라이팅 결과 소비 + fallback plaintext
4. **App.css**: PrismJS `.token.*` 제거 + Shiki CSS Variables 바인딩
5. **Tests**: syntax-highlight 단위 테스트 신설 + code-viewer-panel 테스트 갱신

## Implementation Phases

### Phase 1: 핵심 하이라이팅 엔진 교체

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1 | Shiki 의존성 추가 + PrismJS 제거 | P0 | - | Infrastructure |
| 2 | language-map.ts Shiki 언어 ID 기반 리팩터 | P0 | 1 | language-map |
| 3 | syntax-highlight.ts Shiki 기반 전면 재작성 | P0 | 1, 2 | syntax-highlight |

### Phase 2: UI 통합 + 스타일 교체

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 4 | code-viewer-panel.tsx 비동기 하이라이팅 소비 | P0 | 3 | code-viewer-panel |
| 5 | App.css 토큰 스타일 교체 | P0 | 3 | App.css |

### Phase 3: 테스트 갱신

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 6 | syntax-highlight 단위 테스트 신설 | P1 | 3 | Tests |
| 7 | code-viewer-panel 테스트 갱신 | P1 | 4 | Tests |

## Task Details

### Task 1: Shiki 의존성 추가 + PrismJS 제거
**Component**: Infrastructure
**Priority**: P0-Critical
**Type**: Infrastructure

**Description**:
`package.json`에서 `prismjs`와 `@types/prismjs`를 제거하고 `shiki`를 추가한다.
`npm install` 후 빌드 가능 상태를 확인한다.

**Acceptance Criteria**:
- [ ] `prismjs`, `@types/prismjs`가 `package.json`에서 제거된다.
- [ ] `shiki`가 `dependencies`에 추가된다.
- [ ] `npm install` 성공.

**Target Files**:
- [M] `package.json` -- prismjs 제거, shiki 추가

**Technical Notes**:
- `shiki`는 `dependencies`에 추가 (renderer에서 런타임 사용)
- 이 시점에서 기존 `syntax-highlight.ts`의 prismjs import가 깨지므로 Task 3과 함께 진행 필요

**Dependencies**: -

---

### Task 2: language-map.ts Shiki 언어 ID 기반 리팩터
**Component**: language-map
**Priority**: P0-Critical
**Type**: Refactor

**Description**:
`HighlightLanguage` 타입을 Shiki의 `BundledLanguage | 'plaintext'`로 교체하고, 확장자 매핑을 Shiki 언어 ID 기준으로 업데이트한다. 기존 9개 매핑을 유지하면서 html, yaml, toml, shell(sh/bash/zsh), rust, go, java, c, cpp, swift, ruby, sql, xml, scss, less, graphql, dockerfile, makefile 등을 추가한다.

**Acceptance Criteria**:
- [ ] `HighlightLanguage` 타입이 Shiki의 `BundledLanguage` 기반으로 교체된다.
- [ ] 기존 9개 확장자 매핑이 Shiki 언어 ID로 유효하게 유지된다.
- [ ] 추가 확장자 매핑(html, yaml, toml, sh, rs, go, java, c, cpp, swift, rb, sql 등)이 포함된다.
- [ ] `getHighlightLanguage` 함수의 반환 타입이 새 `HighlightLanguage`이다.

**Target Files**:
- [M] `src/code-viewer/language-map.ts` -- 타입 교체 + 매핑 확장

**Technical Notes**:
- Shiki의 `BundledLanguage`는 `import type { BundledLanguage } from 'shiki'`로 가져옴
- `plaintext`는 Shiki에도 존재하므로 fallback 로직 유지
- `clike`는 Shiki에 없으므로 제거(c, cpp로 대체)

**Dependencies**: 1

---

### Task 3: syntax-highlight.ts Shiki 기반 전면 재작성
**Component**: syntax-highlight
**Priority**: P0-Critical
**Type**: Feature

**Description**:
PrismJS 기반의 동기 per-line 하이라이팅을 Shiki의 비동기 전체 코드 토큰화 기반으로 전면 교체한다.

주요 API:
1. `getOrCreateHighlighter()` — Shiki `createHighlighter`를 module-level Promise로 캐시, `css-variables` 테마 + 필요 언어 로드
2. `highlightLines(code: string, language: HighlightLanguage): Promise<string[]>` — 전체 코드를 `codeToTokens`로 토큰화 후 라인별 HTML `<span>` 문자열 배열로 변환
3. `highlightPreviewLines(lines: string[], language: HighlightLanguage): Promise<string[]>` — preview용 라인 배열 하이라이팅

**Acceptance Criteria**:
- [ ] `highlightLines`가 전체 코드와 언어를 받아 라인별 HTML 배열을 Promise로 반환한다.
- [ ] Shiki highlighter가 최초 호출 시 한 번만 생성되고 캐시된다.
- [ ] `plaintext` 언어에서는 HTML escape만 수행한다.
- [ ] 알 수 없는 언어에서도 에러 없이 escape fallback으로 동작한다.
- [ ] `highlightPreviewLines`가 빈 줄을 `' '` (공백)으로 처리한다.

**Target Files**:
- [M] `src/code-viewer/syntax-highlight.ts` -- 전면 재작성

**Technical Notes**:
- `codeToTokens(code, { lang, theme: 'css-variables' })`로 토큰 배열 획득
- 각 라인의 토큰을 `<span style="color:var(--shiki-token-{scope})">text</span>`으로 직렬화
- PrismJS import 전체 제거
- `escapeHtml` 유틸은 plaintext/fallback용으로 유지

**Dependencies**: 1, 2

---

### Task 4: code-viewer-panel.tsx 비동기 하이라이팅 소비
**Component**: code-viewer-panel
**Priority**: P0-Critical
**Type**: Feature

**Description**:
기존 `useMemo` 기반 동기 하이라이팅을 `useEffect` + `useState` 기반 비동기 패턴으로 전환한다.

동작:
1. `activeFileContent`/`highlightLanguage` 변경 시 `useEffect`에서 `highlightLines` 호출
2. 하이라이팅 완료 전까지 `escapeHtml`로 생성한 plaintext 라인을 `useMemo`로 임시 표시
3. 비동기 결과 도착 시 `highlightedLines` state 업데이트
4. 파일 전환 시 이전 비동기 호출을 취소(stale closure 방지)

**Acceptance Criteria**:
- [ ] 파일 로드 시 plaintext가 즉시 표시되고, 하이라이팅 완료 후 교체된다.
- [ ] 파일 전환 시 이전 파일의 비동기 하이라이팅 결과가 무시된다.
- [ ] `highlightPreviewLines`도 동일한 비동기 패턴으로 comment hover popover에 반영된다.
- [ ] 기존 `dangerouslySetInnerHTML` 패턴은 유지된다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.tsx` -- 비동기 하이라이팅 소비 패턴

**Technical Notes**:
- `useEffect` 내 `let cancelled = false` 패턴으로 stale 결과 방지
- plaintext fallback은 기존 `escapeHtml`을 재사용하되 `syntax-highlight.ts`에서 export
- `highlightedPreviewLines` state는 초기값으로 plaintext 라인 사용

**Dependencies**: 3

---

### Task 5: App.css 토큰 스타일 교체
**Component**: App.css
**Priority**: P0-Critical
**Type**: Refactor

**Description**:
기존 PrismJS `.token.*` CSS 규칙(`.code-line-content .token.comment` 등)을 제거하고, Shiki CSS Variables 테마의 `--shiki-*` CSS 변수를 `.code-line-list` 스코프에 바인딩한다.

기존 색상 매핑:
- `.token.comment/prolog/doctype/cdata` → `#7a8899` → `--shiki-token-comment`
- `.token.punctuation` → `#c0cad6` → `--shiki-token-punctuation`
- `.token.property/tag/boolean/number/constant/symbol/deleted` → `#e0a36a` → `--shiki-token-constant`
- `.token.selector/attr-name/string/char/builtin/inserted` → `#a3d9a5` → `--shiki-token-string`
- `.token.operator/entity/url/.language-css .string/.style .string` → `#94c3ed` → `--shiki-token-keyword` (보조)
- `.token.atrule/attr-value/keyword` → `#c4a4f4` → `--shiki-token-keyword`
- `.token.function/class-name` → `#6fb3f2` → `--shiki-token-function`
- `.token.regex/important/variable` → `#e0a36a` → 기존과 동일

**Acceptance Criteria**:
- [ ] `.code-line-content .token.*` 규칙이 전부 제거된다.
- [ ] `.code-line-list`에 `--shiki-*` CSS 변수가 바인딩된다.
- [ ] 기존 다크 테마 색상과 유사한 시각적 결과를 유지한다.

**Target Files**:
- [M] `src/App.css` -- PrismJS token CSS 제거 + Shiki CSS 변수 추가

**Technical Notes**:
- Shiki CSS Variables 테마가 사용하는 변수 목록: `--shiki-token-comment`, `--shiki-token-punctuation`, `--shiki-token-keyword`, `--shiki-token-string`, `--shiki-token-function`, `--shiki-token-constant`, `--shiki-token-string-expression`, `--shiki-token-parameter`, `--shiki-token-link`
- 필요 시 Shiki의 `defaultColor` 옵션으로 기본 텍스트 색상 제어

**Dependencies**: 3

---

### Task 6: syntax-highlight 단위 테스트 신설
**Component**: Tests
**Priority**: P1-High
**Type**: Test

**Description**:
`syntax-highlight.ts`에 대한 단위 테스트를 신설한다.
기존에는 별도 테스트 파일이 없었으므로 새로 생성한다.

**Acceptance Criteria**:
- [ ] `highlightLines`가 typescript 코드를 라인별 HTML 배열로 반환함을 검증한다.
- [ ] `highlightLines`가 plaintext에서 HTML escape만 수행함을 검증한다.
- [ ] `highlightPreviewLines`가 빈 줄을 공백으로 처리함을 검증한다.
- [ ] highlighter 캐시가 작동함을 검증한다(두 번 호출해도 `createHighlighter` 1회).
- [ ] 알 수 없는 언어에서 에러 없이 fallback 동작함을 검증한다.

**Target Files**:
- [C] `src/code-viewer/syntax-highlight.test.ts` -- 단위 테스트 신설

**Technical Notes**:
- `vitest`로 작성
- Shiki는 vitest 환경에서도 동작하나 WASM 로딩이 필요하므로 테스트 실행 시간이 기존보다 약간 길어질 수 있음
- 필요 시 `vi.mock('shiki')` 대신 실제 Shiki를 사용한 통합 테스트 수준으로 작성

**Dependencies**: 3

---

### Task 7: code-viewer-panel 테스트 갱신
**Component**: Tests
**Priority**: P1-High
**Type**: Test

**Description**:
`code-viewer-panel.test.tsx`의 기존 하이라이팅 관련 테스트를 비동기 Shiki 기반으로 갱신한다.

**Acceptance Criteria**:
- [ ] `highlightPreviewLines` spy/mock이 비동기 반환으로 갱신된다.
- [ ] python 하이라이팅 테스트가 Shiki 출력 패턴(`.token.keyword` 대신 `<span style="color:var(--shiki-token-keyword)">` 등)을 검증한다.
- [ ] `does not recompute highlighted lines when only selection changes` 테스트가 비동기 패턴에 맞게 갱신된다.
- [ ] 비동기 하이라이팅 완료 전 plaintext fallback이 표시됨을 검증하는 테스트가 추가된다.
- [ ] 기존 모든 테스트가 통과한다.

**Target Files**:
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- 비동기 하이라이팅 테스트 갱신

**Technical Notes**:
- `vi.mock('./syntax-highlight')` 또는 `vi.spyOn`으로 비동기 mock 설정
- `waitFor` / `act` 사용으로 비동기 상태 업데이트 처리
- Shiki 실제 인스턴스 대신 mock을 사용해 테스트 속도 유지

**Dependencies**: 4

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shiki WASM 로딩이 Electron renderer에서 문제 발생 | High | Electron은 Node.js 환경이므로 WASM 로딩이 안정적. 실패 시 plaintext fallback |
| 비동기 전환으로 깜빡임(flash of unstyled content) | Medium | plaintext를 즉시 렌더하고 하이라이팅 완료 시 교체. highlighter 캐시로 후속 파일은 거의 즉시 |
| Shiki 번들 크기 증가 | Low | Tree-shaking으로 사용하는 언어/테마만 로드. Electron 앱이므로 번들 크기 제약이 상대적으로 낮음 |
| 기존 테스트 대량 실패 | Medium | Phase 3에서 집중적으로 테스트 갱신. mock 기반으로 기존 테스트 패턴 유지 |
| 매우 큰 파일에서 성능 저하 | Low | 2MB 파일 크기 제한이 이미 존재. 필요 시 라인 수 기반 추가 가드 가능 |

## Open Questions

- 없음 (진행 가능)

## Model Recommendation

Task 1-5는 파일 간 의존성이 강하므로 순차 실행을 권장한다.
Task 6-7은 Task 3, 4 완료 후 병렬 실행 가능하다.
전체적으로 중규모 리팩터이므로 **sonnet** 모델로 충분하다.
