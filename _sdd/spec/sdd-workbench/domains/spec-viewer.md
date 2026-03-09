# Spec Viewer

## 1. 목적

이 문서는 rendered markdown, source action, 검색, source mapping, code-to-spec navigation을 담당하는 Spec Viewer 도메인을 설명한다.

## 2. 사용자 가시 동작

- markdown 파일을 rendered spec으로 읽을 수 있다.
- same-document anchor와 내부 파일 링크를 안전하게 따라갈 수 있다.
- rendered selection에서 `Copy Line Contents`, `Copy Contents and Path`, `Copy Relative Path`, `Go to Source`, `Add Comment`를 호출할 수 있다.
- spec 검색, block highlight, code->spec explicit navigation highlight를 사용할 수 있다.

## 3. 핵심 상태와 source of truth

- 메인 패널:
  - `src/spec-viewer/spec-viewer-panel.tsx`
- source metadata / resolver:
  - `src/spec-viewer/source-line-metadata.ts`
  - `src/spec-viewer/source-line-resolver.ts`
  - `src/spec-viewer/rehype-source-text-leaves.ts`
- 검색:
  - `src/spec-viewer/spec-search.ts`
- 링크/보안:
  - `src/spec-viewer/spec-link-utils.ts`
  - `src/spec-viewer/markdown-security.ts`

## 4. 핵심 규칙

### 4.1 line anchor와 exact offset

- 기본 selection 모델은 line range를 유지한다.
- supported inline structure에서는 same-file raw markdown exact offset을 additive payload로 계산한다.
- collapsed selection이나 unsupported structure는 line fallback으로 degrade 한다.
- rendered selection copy action payload와 popover 설명 문자열은 same-file raw markdown line range를 source of truth로 사용한다.
- `Copy Relative Path`는 `relativePath:Lx` 또는 `relativePath:Lx-Ly` 형식으로 line anchor를 포함한다.

### 4.2 검색과 navigation

- spec 검색은 raw markdown line scan 후 rendered block으로 매핑한다.
- `Cmd/Ctrl+F`는 Spec 탭 활성 상태에서만 열린다.
- code -> spec explicit navigation은 `data-source-line` 후보 중 best-effort block을 고른다.
- navigation highlight는 search/comment state와 별도 class로 관리한다.

### 4.3 scroll과 문맥 유지

- same-spec source jump는 가능한 경우 현재 rendered 문맥을 재사용한다.
- spec scroll position은 런타임에서 workspace + activeSpecPath 기준으로 복원한다.

## 5. 주요 코드

- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/source-line-metadata.ts`
- `src/spec-viewer/source-line-resolver.ts`
- `src/spec-viewer/spec-search.ts`
- `src/spec-viewer/spec-link-utils.ts`
- `src/spec-viewer/rehype-source-text-leaves.ts`
- `src/spec-viewer/markdown-security.ts`
- `src/source-selection.ts`

## 6. 관련 계약 문서

- [navigation-rules](../contracts/navigation-rules.md)
- [search-rules](../contracts/search-rules.md)
- [comment-contracts](../contracts/comment-contracts.md)

## 7. 핵심 테스트

- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/spec-viewer/source-line-resolver.test.ts`
- `src/spec-viewer/source-line-metadata.test.ts`
- `src/spec-viewer/spec-search.test.ts`
- `src/App.test.tsx`

## 8. 변경 시 주의점

- rendered block anchor와 interactive source metadata는 의도적으로 분리되어 있다.
- source mapping을 바꾸면 comment anchor, copy payload, `Go to Source`, `Go to Spec`, navigation highlight 회귀를 같이 확인해야 한다.
