# Code Quality Review: Spec Viewer

**날짜**: 2026-04-14
**세션**: R4
**리뷰 깊이**: 하이브리드 — 구조 스캔 후 보안/파싱/2246줄 패널에 정밀 집중
**대상 파일**: `src/spec-viewer/` 하위 13개 소스 파일 (4,256 LOC)

---

## 모듈 의존 관계

```
spec-viewer-panel.tsx (2,246 LOC)  ← 모듈 진입점
├── markdown-security.ts (172)
│   └── spec-link-utils.ts (179)
│       └── citation-target.ts (193)
├── source-line-resolver.ts (611)
│   └── source-line-metadata.ts (129)
├── markdown-utils.ts (72)
├── spec-link-popover.tsx (99)
├── spec-search.ts (64)
├── rehype-source-text-leaves.ts (80)
├── remark-citation-links.ts (211)
│   └── citation-target.ts
├── code-block-citation.ts (47)
│   └── citation-target.ts
└── python-symbol-resolver.ts (153)  ← panel에서 직접 사용하지 않음
    (citation navigation 시 IPC 뒤에서 사용)
```

외부 모듈 의존: `react-markdown`, `rehype-sanitize`, `rehype-slug`, `remark-gfm`, `hast-util-sanitize`, `github-slugger`, `@lezer/python`

---

## 발견 사항 요약

| # | 심각도 | 카테고리 | 위치 | 설명 |
|---|--------|---------|------|------|
| F1 | High | Q1 — 파일 크기 | spec-viewer-panel.tsx 전체 | 2,246줄 모놀리스 컴포넌트 — 983줄 헬퍼 + 1,263줄 컴포넌트 본체 |
| F2 | High | Q4 — 코드 중복 | spec-viewer-panel.tsx:1858-1985 | `renderBlockWithSourceLine` 반복 호출 13회 (h1~h6, p, li, blockquote, pre, table, th, td) |
| F3 | Medium | Q4 — 코드 중복 | source-line-resolver.ts:317 + spec-viewer-panel.tsx:409 | `getElementDepth()` 함수 동일 코드 2벌 |
| F4 | Medium | Q4 — 코드 중복 | citation-target.ts:22-26 + python-symbol-resolver.ts:22-26 | `IDENTIFIER_PATTERN`, `SIMPLE_SYMBOL_PATTERN`, `QUALIFIED_METHOD_PATTERN` 정규식 3개 동일 중복 |
| F5 | Medium | Q4 — 코드 중복 | remark-citation-links.ts:25 + code-block-citation.ts:11 | `BRACKET_CITATION_PATTERN` 정규식 동일 중복 |
| F6 | Medium | Q7 — 보안 | markdown-security.ts:88-91 | `span` 태그에 `style` 속성 허용 — 값 검증 없이 임의 CSS 주입 가능 (UI 파괴, 피싱 가능) |
| F7 | Medium | Q7 — 보안 | spec-viewer-panel.tsx:973 | `dangerouslySetInnerHTML` 사용 — `escapeHtml`로 보호되지만 XSS 표면적 존재 |
| F8 | Medium | Q1 — 함수 크기 | spec-viewer-panel.tsx:1732-1997 | `markdownComponents` useMemo 블록이 265줄 |
| F9 | Medium | Q9 — 메모리 누수 | spec-viewer-panel.tsx:928-938 | `HighlightedCodeBlock`의 비동기 highlight — cleanup에서 `cancelled = true`만 설정하고 Promise 자체를 취소하지 않음 (열심히 스크롤 시 누적 가능) |
| F10 | Medium | Q4 — 코드 중복 | spec-viewer-panel.tsx:1679-1716 + 1417-1481 | `handleTocLinkClick`과 `handleMarkdownLinkClick` 내 heading scroll 로직 거의 동일 (~37줄) |
| F11 | Medium | Q10 — 엣지 케이스 | source-line-resolver.ts:214-236 | `estimateLineFromSpanOffset` — 라인 길이가 균등하다고 가정한 비율 추정, 긴/짧은 라인 혼합 시 부정확 |
| F12 | Low | Q4 — 코드 중복 | source-line-resolver.ts:23-46 + 48-71 | `normalizeSourceLine`과 `normalizeSourceOffset`이 거의 동일 (차이는 `>= 1` vs `>= 0`) |
| F13 | Low | Q7 — 보안 | markdown-security.ts:118-119 | `SAFE_URI_SCHEME_PATTERN` 불일치 시 URI를 그대로 반환 — 스킴이 없는 상대 경로 허용이 의도이나, `data:text/html` 등 비이미지 data URI 통과 가능 |
| F14 | Low | Q3 — 타입 안전성 | spec-viewer-panel.tsx:226, 307 | `props as Record<string, unknown>` unsafe cast (renderBlockWithSourceLine, renderElementWithSourceLine) |
| F15 | Low | Q10 — 엣지 케이스 | markdown-security.ts:6-7 | `DATA_IMAGE_URI_PATTERN`이 `\s` 허용 — base64 내부 공백은 spec 준수이지만, 잠재적 개행 포함 가능 |
| F16 | Low | Q10 — 엣지 케이스 | spec-viewer-panel.tsx:520-524 | `resolveSourceLineFromSelection` 및 `collectRenderedSourceLines`에서 `querySelectorAll` 결과를 `Array.from`으로 변환 — 큰 문서 시 성능 이슈 가능 |
| F17 | Low | Q8 — 비동기 패턴 | spec-viewer-panel.tsx:1487-1512 | `handleMarkdownLinkClick` 내 async IIFE — 에러 시 무음 `catch` fallback |
| F18 | Info | Q11 — 테스트 | spec-viewer-panel.tsx | 테스트 파일 존재하나, 983줄의 헬퍼 함수들(renderBlockWithSourceLine, mapComment* 등)에 대한 단위 테스트 부재 |
| F19 | Info | Q6 — 데드 코드 | spec-viewer-panel.tsx:148 | `BLOCKED_RESOURCE_PLACEHOLDER_TEXT` 상수 — 블록된 이미지에 표시되는 텍스트가 사용자에게 의미 없는 내용 |

---

## 상세 발견

### F1: spec-viewer-panel.tsx 2,246줄 모놀리스

- **파일**: `spec-viewer-panel.tsx:1-2246`
- **심각도**: High
- **카테고리**: Q1 — 파일/함수 크기
- **설명**: 단일 파일에 983줄의 모듈 레벨 헬퍼 함수 + 1,263줄의 `SpecViewerPanel` 컴포넌트가 합쳐져 있다. 주요 관심사가 최소 6개 이상 혼합:
  1. 코멘트 마커 앵커 매핑 로직 (322-702)
  2. 검색 기능 (747-766, 1030-1282)
  3. 마크다운 렌더링 컴포넌트 설정 (1732-1997)
  4. 코드 블록 syntax highlight (768-982)
  5. 링크/팝오버 핸들링 (1390-1546)
  6. 스크롤 복원/네비게이션 (1170-1312)
- **제안**: `HighlightedCodeBlock`은 이미 별도 함수로 분리되어 있으므로 별도 파일로 추출 가능. 코멘트 마커 매핑 로직(322-702)은 순수 함수들이므로 별도 모듈로 분리 가능.

### F2: renderBlockWithSourceLine 반복 호출 13회

- **파일**: `spec-viewer-panel.tsx:1858-1985`
- **심각도**: High
- **카테고리**: Q4 — 코드 중복
- **설명**: `markdownComponents` 내에서 `p`, `li`, `blockquote`, `pre`, `table`, `h1`~`h6`, `th`, `td` 총 13개 태그에 대해 `renderBlockWithSourceLine` 호출 패턴이 거의 동일하게 반복된다. 매번 같은 인자 5개(`resolvedCommentMarkerCounts`, `resolvedCommentMarkerEntries`, `handleCommentMarkerMouseEnter`, `scheduleCommentHoverClose`)를 전달한다.
- **제안**: 태그 이름과 옵션만 다르므로, 팩토리 함수(`buildBlockComponent(tagName, options)`)로 반복 제거 가능.

### F3: `getElementDepth` 동일 코드 2벌

- **파일**: `source-line-resolver.ts:317-325`, `spec-viewer-panel.tsx:409-417`
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: 완전히 동일한 함수가 두 파일에 존재한다.
- **제안**: 공유 유틸리티로 추출하거나, 한 곳에서 export.

### F4: Python 식별자 정규식 3개 동일 중복

- **파일**: `citation-target.ts:22-26`, `python-symbol-resolver.ts:22-26`
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: `IDENTIFIER_PATTERN`, `SIMPLE_SYMBOL_PATTERN`, `QUALIFIED_METHOD_PATTERN` 정규식 3개가 두 파일에 동일하게 정의되어 있다.
- **제안**: `citation-target.ts`에서 export하여 `python-symbol-resolver.ts`에서 재사용.

### F5: `BRACKET_CITATION_PATTERN` 정규식 중복

- **파일**: `remark-citation-links.ts:25`, `code-block-citation.ts:11`
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: `/\[[^\]\n]+\]/g` 정규식이 두 파일에 동일하게 정의되어 있다.
- **제안**: `citation-target.ts`에서 공유 상수로 export.

### F6: `span` 태그에 `style` 속성 무제한 허용

- **파일**: `markdown-security.ts:88-91`
- **심각도**: Medium
- **카테고리**: Q7 — 보안
- **설명**: sanitize 스키마에서 `span` 태그에 `style` 속성을 허용하고 있다. 이는 rehype-sanitize의 기본 동작으로는 속성 값의 내용을 검증하지 않으므로, 악의적 CSS를 통한 UI 파괴가 가능하다. 예시:
  - `position: fixed; z-index: 999999; width: 100vw; height: 100vh` — 전체 화면 오버레이
  - `background-image: url(...)` — 외부 리소스 로드 (tracking pixel)
  - `content: '가짜 경고 메시지'` + pseudo element
  
  단, 입력이 로컬 마크다운 파일이므로 실질적 위험은 '신뢰하지 않는 스펙 파일을 열 때'로 제한된다.
- **제안**: `style` 허용을 제거하거나, 허용할 CSS 속성을 allowlist로 제한 (예: `color`, `font-weight`만).

### F7: `dangerouslySetInnerHTML` 사용

- **파일**: `spec-viewer-panel.tsx:973`
- **심각도**: Medium
- **카테고리**: Q7 — 보안
- **설명**: `HighlightedCodeBlock`에서 syntax-highlighted HTML을 `dangerouslySetInnerHTML`로 삽입한다. 입력은 `renderLineTokensToHtml`을 거치며 `escapeHtml`로 `<`, `>`, `&`를 이스케이프하고, `token.color`는 Shiki에서 생성된 CSS color 값이다.
  
  현재 안전한 이유:
  1. `escapeHtml`이 `<`, `>`, `&`를 이스케이프
  2. `token.color`는 `style="color:${token.color}"` 형태로 삽입되므로, color가 `"` 포함 시 attribute 탈출 가능 — 그러나 Shiki가 생성하는 color는 hex/keyword뿐
  
  잠재적 위험: `token.color`에 대한 명시적 검증이 없다. Shiki 이외의 경로로 토큰이 생성되면 color 값에 의한 attribute injection 가능.
- **제안**: `token.color`를 hex color pattern (`/^#[0-9a-fA-F]{3,8}$/`) 또는 named color allowlist로 검증하는 방어적 코드 추가 고려.

### F8: `markdownComponents` useMemo 265줄

- **파일**: `spec-viewer-panel.tsx:1732-1997`
- **심각도**: Medium
- **카테고리**: Q1 — 함수 크기
- **설명**: 단일 `useMemo` 블록 안에 13개 컴포넌트 렌더 함수가 정의되어 있다. 인라인 JSX, 이벤트 핸들러, 조건부 렌더링이 혼합되어 가독성이 낮다.
- **제안**: F2의 해결과 함께 팩토리 패턴으로 축소 가능.

### F9: highlight Promise 취소 불가

- **파일**: `spec-viewer-panel.tsx:928-938`
- **심각도**: Medium
- **카테고리**: Q9 — 메모리 누수
- **설명**: `HighlightedCodeBlock`의 useEffect에서 `highlightLineTokens` Promise를 실행하고 cleanup에서 `cancelled = true`만 설정한다. Promise 자체는 완료까지 실행되며, 빠른 스크롤 시 많은 수의 Shiki highlight 요청이 쌓일 수 있다.
- **제안**: 현재 구현은 React 패턴 상 표준적이고 `cancelled` flag로 상태 업데이트는 방지하므로 기능적 문제는 없으나, 코드 블록이 매우 많은 문서에서 성능 병목이 될 수 있다.

### F10: heading 스크롤 로직 중복

- **파일**: `spec-viewer-panel.tsx:1417-1481` (handleMarkdownLinkClick), `1679-1716` (handleTocLinkClick)
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: heading 요소를 CSS.escape로 찾고 fallback으로 textContent 매칭 후 `scrollIntoView`하는 로직이 두 콜백에 거의 동일하게 존재한다.
- **제안**: `scrollToHeading(containerElement, headingId, headingText)` 헬퍼로 추출.

### F11: `estimateLineFromSpanOffset` 비율 추정의 한계

- **파일**: `source-line-resolver.ts:214-236`
- **심각도**: Medium
- **카테고리**: Q10 — 엣지 케이스
- **설명**: 텍스트 오프셋으로부터 소스 라인을 추정할 때, 전체 텍스트 길이 대비 비율로 라인을 계산한다. 이는 모든 라인의 길이가 균등하다는 가정이며, 실제로 짧은 라인과 긴 라인이 섞인 경우 (예: 표 헤더 다음에 구분 라인) 오차가 발생한다.
- **제안**: 현재로서는 합리적 근사치. `estimateLineFromSpanOffset`이라는 함수명으로 한계가 명확히 표현되어 있어 설계적 문제는 아님.

### F13: 비이미지 data URI 통과 가능

- **파일**: `markdown-security.ts:114-119`
- **심각도**: Low
- **카테고리**: Q7 — 보안
- **설명**: `sanitizeMarkdownUri`에서 `BLOCKED_URI_SCHEME_PATTERN`(javascript, vbscript, file)을 차단하고, `SAFE_URI_SCHEME_PATTERN`과 매칭되지 않으면(스킴 없는 상대 경로) 그대로 반환한다. 이 로직 자체는 안전하지만, 이미지가 아닌 `data:` URI(예: `data:text/html,<script>...`)는 `isAllowedDataImageUri`에서 먼저 체크되고, `BLOCKED_URI_SCHEME_PATTERN`에도 해당하지 않으므로 `SAFE_URI_SCHEME_PATTERN` 체크까지 도달한다. `data:` 스킴은 `http:`, `https:`, `mailto:` 허용 목록에 없으므로 빈 문자열 반환. **결론: 현재 코드는 안전함.** 다만 흐름이 다소 복잡하여 향후 수정 시 실수 가능.
- **제안**: `data:` 스킴의 비이미지 케이스를 `BLOCKED_URI_SCHEME_PATTERN`에 명시적으로 추가하면 의도가 더 명확.

### F17: async IIFE 내 무음 catch

- **파일**: `spec-viewer-panel.tsx:1487-1512`
- **심각도**: Low
- **카테고리**: Q8 — 비동기 패턴
- **설명**: `handleMarkdownLinkClick`에서 citation target 열기 실패 시 빈 `catch` 블록으로 에러를 삼키고 fallback popover를 표시한다. 주석("Fall through to the existing safe fallback UX")으로 의도는 설명되어 있으나, 디버깅 시 원인 파악이 어려울 수 있다.
- **제안**: `console.warn` 수준의 로깅 추가 고려.

---

## 긍정적 패턴 (Good Patterns)

- **sanitize 아키텍처**: `rehype-sanitize` + `sanitizeMarkdownUri` + `resolveMarkdownImageSource` 3단계 방어 구조가 잘 설계되어 있음. XSS 주요 벡터(javascript:, vbscript:, file:)가 명시적으로 차단됨.
- **소스 라인 해상도**: `source-line-metadata.ts` → `rehype-source-text-leaves.ts` → `source-line-resolver.ts` 체인으로 마크다운 위치 정보를 DOM까지 추적하는 설계가 체계적. 엣지 케이스(table cell, code block, collapsed selection) 처리가 꼼꼼함.
- **null 안전성**: `normalizeSourceLine`, `normalizeSourceOffset` 등 모든 파싱 함수가 `null` 반환으로 실패를 표현하며, 호출자가 일관되게 null 체크를 수행.
- **불변성 존중**: `ReadonlyMap`, `readonly` array를 적극 활용하여 컴포넌트 프로퍼티의 불변성을 보장.
- **테스트 커버리지**: 13개 소스 파일 중 9개에 `.test.ts` 파일이 존재하며, 특히 `citation-target`, `source-line-resolver`, `markdown-security` 등 핵심 로직에 대한 테스트가 충실.
- **방어적 DOM 접근**: `scrollIntoView` 호출 전 `typeof === 'function'` 체크, `CSS.escape` 가용 여부 체크 등 런타임 안전성 확보.

---

## 모듈 종합 평가

- **전체 인상**: 기능적으로 완성도 높고 보안 아키텍처가 잘 설계된 모듈. 주요 위험은 보안이 아닌 **유지보수성** — 2,246줄 모놀리스와 코드 중복이 핵심 부채.
- **가장 큰 위험**: `spec-viewer-panel.tsx`의 크기. 983줄의 헬퍼 함수들이 컴포넌트와 같은 파일에 있어 변경 시 전체 렌더링 로직에 대한 이해가 필요. R1의 `main.ts`(3,511줄)와 같은 패턴.
- **권장 후속 조치**:
  1. **(High)** `HighlightedCodeBlock`, 코멘트 마커 매핑 로직, heading scroll 헬퍼를 별도 파일로 추출하여 `spec-viewer-panel.tsx`를 ~1,200줄 이하로 축소
  2. **(Medium)** `getElementDepth`, Python 식별자 정규식, `BRACKET_CITATION_PATTERN` 등 중복 코드 통합
  3. **(Medium)** `span[style]` 허용 범위 제한 또는 CSS 속성 allowlist 도입
  4. **(Low)** `renderBlockWithSourceLine` 13회 반복을 팩토리 패턴으로 개선
