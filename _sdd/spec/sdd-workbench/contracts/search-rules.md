# Search Rules

## 1. 목적

이 문서는 Code Editor, File Browser, Spec Viewer 검색 규칙과 wildcard semantics를 모아 둔다.

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
