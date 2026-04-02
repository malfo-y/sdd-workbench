# Navigation Rules + Search Rules

이 문서는 기존 `navigation-rules.md`와 `search-rules.md`를 통합한 Spec Viewer 컴포넌트 계약이다.

---

# Part 1: Navigation Rules

## 1. 목적

spec 링크, source action, code/spec 왕복 이동, exact offset, temporary highlight 규칙을 정리한다.

## 2. 링크 해석 규칙

지원 패턴:

- `#heading-id`
- `./path/to/file.md`, `../path/to/file.md`
- `path/to/file.ts#Lx`, `path/to/file.ts#Lx-Ly`
- `#sdd-citation:<encoded-path>:<symbol>` (bracket citation에서 자동 생성)
- external URI(`https://`, `mailto:` 등)

핵심 규칙:

1. same-document anchor는 브라우저 기본 이동 대신 현재 spec 패널 내부 heading scroll을 사용한다.
2. same-workspace 상대 링크만 내부 라우팅한다.
3. `#sdd-citation:` 링크는 대상 파일 읽기 → Python symbol 해석 → Code 탭 점프 순서로 처리한다. 파일 트리 lazy index 포함 여부는 선행 조건이 아니며, 실제 `readFile` 성공 여부를 기준으로 판단한다.
4. external 또는 unresolved 링크는 자동 이동 대신 안전한 fallback(copy/open)을 사용한다.

citation 세부 규칙:

- prose text와 inline code span의 `[relative/path.py:Symbol]`, `[relative/path.py:Class.method]`는 semantic citation target으로 승격될 수 있다.
- fenced code block에서는 언어 태그와 무관하게 `[relative/path.py:Symbol]` / `[relative/path.py:Class.method]` token만 interactive target으로 추출한다.
- Python symbol resolution은 declaration-only며 simple symbol과 one-level dotted `Class.method` exact match만 지원한다.
- deeper dotted owner chain(`Outer.Inner.method`)은 unsupported target으로 처리한다.
- citation 해석 실패 시 link popover에 failure reason을 포함해 copy fallback을 유지한다.

## 3. source selection 규칙

1. 기본 selection 모델은 line range다.
2. fenced code block에서는 newline offset 기반 line 정밀도를 유지한다.
3. 일반 markdown paragraph/list/blockquote/table cell은 `data-source-line-start/end` descendant metadata를 우선 사용한다.
4. exact offset mapping은 지원 구조에서만 additive payload로 계산한다.
5. table exact offset은 same-cell selection에서만 허용한다.
6. repeated rendered text 때문에 exact source span이 ambiguous하면 exact offset을 버리고 line fallback으로 degrade 한다.
7. collapsed selection, cross-cell table selection, unsupported structure는 nearest line fallback으로 degrade 한다.

## 4. spec -> code / code -> spec 규칙

### 4.1 spec -> code

- `Go to Source`는 same-file raw markdown source를 우선 대상으로 한다.
- same-path markdown draft가 존재하면 `Go to Source`의 same-file raw markdown baseline은 저장본이 아니라 draft text다.
- exact offset이 있으면 CodeMirror selection을 사용한다.
- table exact offset은 same-cell + unique match 조건을 만족할 때만 사용한다.
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
- `src/spec-viewer/citation-target.ts`
- `src/spec-viewer/python-symbol-resolver.ts`
- `src/spec-viewer/remark-citation-links.ts`
- `src/spec-viewer/code-block-citation.ts`
- `src/spec-viewer/spec-link-utils.ts`

## 7. 관련 테스트

- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/spec-viewer/source-line-resolver.test.ts`
- `src/spec-viewer/source-line-metadata.test.ts`
- `src/spec-viewer/citation-target.test.ts`
- `src/spec-viewer/python-symbol-resolver.test.ts`
- `src/spec-viewer/remark-citation-links.test.ts`
- `src/spec-viewer/code-block-citation.test.ts`
- `src/code-editor/code-editor-panel.test.tsx`
- `src/App.test.tsx`

---

# Part 2: Search Rules

## 1. 목적

Code Editor, File Browser, Spec Viewer 검색 규칙과 wildcard semantics를 모아 둔다.

## 2. 공통 규칙

1. 검색은 기본적으로 case-insensitive다.
2. `*`가 없는 query는 substring 검색이다.
3. `*`가 있는 query는 ordered token wildcard match다.
4. non-wildcard 문자가 없는 query(`*`, `**`)는 empty query로 취급한다.

## 3. Code Editor 검색

- 구현:
  - CM6 `@codemirror/search`
- 규칙:
  - image/preview unavailable 모드에서는 검색을 열지 않는다.
  - 파일 전환 시 검색 상태를 초기화한다.
- 관련 파일:
  - `src/code-editor/code-editor-panel.tsx`

## 4. File Browser 파일명 검색

- 구현:
  - `workspace:searchFiles`
  - `electron/workspace-search.ts`
  - `src/file-tree/file-tree-panel.tsx`
- 기본 보호값:
  - depth limit `20`
  - result cap `200`
  - large-directory child cap `10000`
  - time budget `2000ms`
- 보호 규칙:
  - `.git`, `node_modules`, `dist`, `build`, `out`, `.next`, `.turbo` ignore
  - symlink directory 재귀 금지
- partial 상태:
  - `truncated`
  - `skippedLargeDirectoryCount`
  - `depthLimitHit`
  - `timedOut`

## 5. Spec Viewer 검색

- 구현:
  - raw markdown line scan -> rendered block 매핑
  - `Cmd/Ctrl+F`는 Spec 탭 활성 상태에서만 허용
- 규칙:
  - 결과는 rendered `data-source-line` block에 `.is-spec-search-match` / `.is-spec-search-focus`로 표시한다.
  - `Enter` / `Shift+Enter`와 이전/다음 버튼 모두 wrap-around를 지원한다.
  - `activeSpecPath` 변경 시 검색 상태를 초기화한다.
  - same-path markdown draft가 존재하면 검색은 저장본이 아니라 draft baseline을 대상으로 수행한다.
  - same-path markdown에서 content만 갱신되는 경우(저장 전 draft 반영) stale match/focus를 남기지 않도록 검색 상태를 reset하거나 즉시 재계산한다.

## 6. discoverability

- File Browser와 Spec Viewer 검색 입력은 `(* supported)` placeholder를 사용한다.

## 7. 관련 구현 파일

- `electron/workspace-search.ts`
- `src/file-tree/file-tree-panel.tsx`
- `src/spec-viewer/spec-search.ts`
- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/code-editor/code-editor-panel.tsx`

## 8. 관련 테스트

- `electron/workspace-search.test.ts`
- `src/file-tree/file-tree-panel.test.tsx`
- `src/spec-viewer/spec-search.test.ts`
- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/code-editor/code-editor-panel.test.tsx`
