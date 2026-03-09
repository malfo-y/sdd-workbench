# Navigation Rules

## 1. 목적

이 문서는 spec 링크, source action, code/spec 왕복 이동, exact offset, temporary highlight 규칙을 정리한다.

## 2. 링크 해석 규칙

지원 패턴:

- `#heading-id`
- `./path/to/file.md`, `../path/to/file.md`
- `path/to/file.ts#Lx`, `path/to/file.ts#Lx-Ly`
- external URI(`https://`, `mailto:` 등)

핵심 규칙:

1. same-document anchor는 브라우저 기본 이동 대신 현재 spec 패널 내부 heading scroll을 사용한다.
2. same-workspace 상대 링크만 내부 라우팅한다.
3. external 또는 unresolved 링크는 자동 이동 대신 안전한 fallback(copy/open)을 사용한다.

## 3. source selection 규칙

1. 기본 selection 모델은 line range다.
2. fenced code block에서는 newline offset 기반 line 정밀도를 유지한다.
3. 일반 markdown paragraph/list/blockquote/table cell은 `data-source-line-start/end` descendant metadata를 우선 사용한다.
4. exact offset mapping은 지원 구조에서만 additive payload로 계산한다.
5. collapsed selection과 unsupported structure는 nearest line fallback으로 degrade 한다.

## 4. spec -> code / code -> spec 규칙

### 4.1 spec -> code

- `Go to Source`는 same-file raw markdown source를 우선 대상으로 한다.
- exact offset이 있으면 CodeMirror selection을 사용한다.
- exact offset이 없어도 line jump는 계속 지원한다.

### 4.2 code -> spec

- `Go to Spec`는 active `.md` 파일에서만 노출한다.
- anchor는 `selectionRange.startLine`이다.
- semantic linking이 아니라 same-file raw source line -> rendered `data-source-line` block best-effort 매핑만 다룬다.

## 5. navigation highlight 규칙

1. explicit navigation만 temporary highlight를 발생시킨다.
2. search/comment/selection과 별도의 additive 시각 상태다.
3. duration은 `1600ms`다.
4. `token`이 바뀌면 같은 line/block에도 다시 적용될 수 있다.

## 6. 관련 구현 파일

- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/source-line-resolver.ts`
- `src/spec-viewer/source-line-metadata.ts`
- `src/spec-viewer/rehype-source-text-leaves.ts`
- `src/App.tsx`
- `src/code-editor/code-editor-panel.tsx`
- `src/code-editor/cm6-navigation-highlight.ts`

## 7. 관련 테스트

- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/spec-viewer/source-line-resolver.test.ts`
- `src/spec-viewer/source-line-metadata.test.ts`
- `src/code-editor/code-editor-panel.test.tsx`
- `src/App.test.tsx`
