# Spec Viewer

## 1. 목적

이 문서는 rendered markdown, source action, 검색, source mapping, code-to-spec navigation을 담당하는 Spec Viewer 도메인을 설명한다.

## 2. 사용자 가시 동작

- markdown 파일을 rendered spec으로 읽을 수 있다.
- 동일 경로의 markdown 파일이 Code 탭에서 편집 중(draft)이라면, Spec 탭은 저장본이 아니라 **현재 draft**를 렌더한다.
- Code/Spec 탭 전환만으로 draft가 저장되거나 초기화되지 않으며, 두 탭은 같은 문서 세션(draft text)을 공유한다.
- same-document anchor와 내부 파일 링크를 안전하게 따라갈 수 있다.
- TOC를 열면 현재 scroll 위치에 맞는 active heading이 표시되고, same-document heading jump는 normalized id + heading text fallback으로 처리된다.
- rendered selection에서 `Copy Line Contents`, `Copy Contents and Path`, `Copy Relative Path`, `Go to Source`, `Add Comment`를 호출할 수 있다.
- spec 검색, block highlight, code->spec explicit navigation highlight를 사용할 수 있다.
- prose, inline code span, 또는 fenced code block 안의 `[path.py:Symbol]` / `[path.py:Class.method]` bracket citation을 클릭해 Python 선언 위치로 점프할 수 있다.
- citation 해석에 실패하면 기존 link popover 안에서 실패 이유를 확인할 수 있다.
- rendered spec의 각 블록 요소(p, h1~h6, li) 좌측에 원문 `.md` 줄번호가 거터 형태로 표시된다. 테이블 행(`tr`)에도 줄번호가 표시된다. fenced code block 내부의 각 줄에도 원문 줄번호가 `<span data-source-line>` 방식으로 표시된다. `blockquote`, `table` 컨테이너와 `pre` 래퍼는 줄번호를 표시하지 않는다(`pre`는 내부 줄별 `<span>`과의 중복 방지). `th`/`td` 셀은 행 단위 표시로 충분하므로 개별 줄번호를 표시하지 않는다. 기존 comment marker와 공존한다.

## 3. 핵심 상태와 source of truth

- 메인 패널:
  - `src/spec-viewer/spec-viewer-panel.tsx`
- source metadata / resolver:
  - `src/spec-viewer/source-line-metadata.ts`
  - `src/spec-viewer/source-line-resolver.ts`
  - `src/spec-viewer/rehype-source-text-leaves.ts`
  - `src/spec-viewer/spec-viewer-scroll.ts`
- 검색:
  - `src/spec-viewer/spec-search.ts`
- 링크/보안:
  - `src/spec-viewer/spec-link-utils.ts`
  - `src/spec-viewer/markdown-security.ts`
- citation navigation:
  - `src/spec-viewer/citation-target.ts`
  - `src/spec-viewer/python-symbol-resolver.ts`
  - `src/spec-viewer/remark-citation-links.ts`
  - `src/spec-viewer/code-block-citation.ts`
- markdown draft baseline source:
  - `src/workspace/workspace-model.ts` (path-keyed document session)
  - `src/workspace/workspace-context.tsx` (selector/wiring)

## 4. 핵심 규칙

### 4.1 line anchor와 exact offset

- 기본 selection 모델은 line range를 유지한다.
- supported inline structure에서는 same-file raw markdown exact offset을 additive payload로 계산한다.
- exact source offset metadata를 복구할 수 있으면 raw markdown offset에서 line range를 다시 계산해 multiline leaf later-line drift를 줄인다.
- GFM table은 same-cell selection에서만 cell-local exact offset을 시도한다.
- repeated text로 exact match가 ambiguous하면 optimistic exact offset을 버리고 line fallback을 선택한다.
- cross-cell selection은 새 exact heuristic을 도입하지 않고 normalized line range fallback을 유지한다.
- collapsed selection이나 unsupported structure는 line fallback으로 degrade 한다.
- rendered selection copy action payload와 popover 설명 문자열은 same-file raw markdown line range를 source of truth로 사용한다.
- same-path markdown draft가 존재하면, "same-file raw markdown" baseline은 저장본이 아니라 **draft text**를 기준으로 계산한다.
- `Copy Relative Path`는 `relativePath:Lx` 또는 `relativePath:Lx-Ly` 형식으로 line anchor를 포함한다.
- rendered table comment marker는 exact offset이 있으면 same-cell anchor에 붙고, exact offset이 없는 legacy/imported table comment는 false precision을 피하기 위해 neutral table anchor로 degrade 한다.

### 4.2 검색과 navigation

- spec 검색은 raw markdown line scan 후 rendered block으로 매핑한다.
- `Cmd/Ctrl+F`는 Spec 탭 활성 상태에서만 열린다.
- code -> spec explicit navigation은 `data-source-line` 후보 중 best-effort block을 고른다.
- same-document heading navigation은 normalized heading id를 우선 찾고, 필요하면 heading text match로 fallback 한다.
- TOC active state는 현재 scroll container에서 가장 최근에 지난 heading을 기준으로 계산한다.
- navigation highlight는 search/comment state와 별도 class로 관리한다.

### 4.3 citation navigation

- prose text의 `[relative/path.py:Symbol]`과 `[relative/path.py:Class.method]`은 remark 플러그인이 클릭 가능한 링크로 변환한다.
- inline code span이 citation 하나만 감쌀 때도 같은 semantic citation 링크로 렌더한다.
- fenced code block 안의 bracket citation token은 언어 무관으로 추출되며, 일반 텍스트/diagram 예제 내부에서도 citation token만 링크로 렌더한다.
- 클릭 시 App 레벨에서 대상 파일을 실제로 읽고 Lezer Python 파서로 선언 위치를 해석해 Code 탭으로 점프한다.
- citation jump는 lazy file tree index 포함 여부와 무관하게 `readFile` 성공 여부를 기준으로 처리한다.
- Python 해석은 declaration-only이며, simple symbol과 one-level dotted `Class.method` exact match만 지원한다. deeper dotted chain은 지원하지 않는다.
- 해석 실패 시 기존 link fallback UX(copy popover)를 유지하되, popover 안에 실패 이유를 함께 표시한다.
- citation jump 후 Back/Forward로 돌아오면 markdown spec view가 다시 복원된다.
- `normalizePosixPath`는 `citation-target.ts`에서 export하며 `spec-link-utils.ts`와 공유한다.

### 4.4 scroll과 문맥 유지

- same-spec source jump는 가능한 경우 현재 rendered 문맥을 재사용한다.
- spec scroll position은 `workspaceId + activeSpecPath` 기준으로 persistence되며 앱 재시작 후에도 복원된다.
- same-path markdown에서 content만 변하는 경우(저장 전 draft 반영)는 path navigation이 아니므로, 스크롤/문맥 보존은 best-effort로 유지하되 stale search/highlight 상태가 남지 않도록 reset 또는 재계산 규칙을 둔다.

## 5. 주요 코드

- `src/spec-viewer/spec-viewer-panel.tsx`
- `src/spec-viewer/source-line-metadata.ts`
- `src/spec-viewer/source-line-resolver.ts`
- `src/spec-viewer/spec-search.ts`
- `src/spec-viewer/spec-link-utils.ts`
- `src/spec-viewer/spec-viewer-scroll.ts`
- `src/spec-viewer/rehype-source-text-leaves.ts`
- `src/spec-viewer/markdown-security.ts`
- `src/spec-viewer/citation-target.ts`
- `src/spec-viewer/python-symbol-resolver.ts`
- `src/spec-viewer/remark-citation-links.ts`
- `src/spec-viewer/code-block-citation.ts`
- `src/source-selection.ts`

## 6. 관련 계약 문서

- [navigation-rules + search-rules (본 컴포넌트 contracts)](./contracts.md)
- [comment-contracts](../comments-and-export/contracts.md)

## 7. 핵심 테스트

- `src/spec-viewer/spec-viewer-panel.test.tsx`
- `src/spec-viewer/source-line-resolver.test.ts`
- `src/spec-viewer/source-line-metadata.test.ts`
- `src/spec-viewer/spec-search.test.ts`
- `src/spec-viewer/citation-target.test.ts`
- `src/spec-viewer/python-symbol-resolver.test.ts`
- `src/spec-viewer/remark-citation-links.test.ts`
- `src/spec-viewer/code-block-citation.test.ts`
- `src/App.test.tsx`

## 8. 변경 시 주의점

- rendered block anchor와 interactive source metadata는 의도적으로 분리되어 있다.
- source mapping을 바꾸면 comment anchor, copy payload, `Go to Source`, `Go to Spec`, navigation highlight 회귀를 같이 확인해야 한다.
- draft 기반 렌더링을 도입하면 rendered DOM과 source baseline이 함께 움직여야 한다. draft 상태에서 search/copy/comment/go-to-source가 저장본을 참조해 어긋나지 않도록 회귀 테스트를 우선 고정한다.
- table source mapping을 바꿀 때는 same-cell exact path뿐 아니라 multi-comment same-line marker count, offset-less legacy marker fallback도 함께 확인해야 한다.
- 코드 블록 source mapping(`pre` suppression + 내부 `<span>` 줄번호)을 바꿀 때는 citation navigation, syntax highlighting, 기존 `pre`-level source action 회귀를 함께 확인해야 한다.
