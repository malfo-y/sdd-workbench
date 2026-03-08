# Comment Contracts

## 1. 목적

이 문서는 comment schema, persistence, export, hover preview, marker 매핑 규칙을 정리한다.

## 2. source of truth

1. line comments:
   - `workspaceRoot/.sdd-workbench/comments.json`
2. global comments:
   - `workspaceRoot/.sdd-workbench/global-comments.md`
3. export 산출물:
   - `_COMMENTS.md`
   - bundle payload

## 3. anchor schema

- 필수:
  - `startLine`
  - `endLine`
  - `anchor.snippet`
  - `anchor.hash`
- 선택:
  - `anchor.before`
  - `anchor.after`
  - `anchor.startOffset`
  - `anchor.endOffset`

규칙:

1. line range는 항상 저장한다.
2. optional offset은 same-file raw markdown exact selection이 가능한 경우에만 저장한다.
3. old JSON에 offset field가 없어도 계속 유효해야 한다.
4. stale offset re-anchor는 현재 범위에 없다.

## 4. export 규칙

1. 기본 export는 pending comments만 포함한다.
2. 사용자가 명시적으로 선택한 export에서는 exported comment도 포함할 수 있다.
3. global comments는 체크박스가 켜져 있고 내용이 비어 있지 않을 때만 prepend 한다.
4. target 중 하나 이상 성공하면 성공한 snapshot line comment에만 `exportedAt`를 기록한다.
5. `MAX_CLIPBOARD_CHARS=30000` 초과 시 clipboard target은 비활성화한다.

## 5. marker / hover preview 규칙

1. 코드 뷰어 마커는 `startLine` 기준 badge + hover preview를 제공한다.
2. rendered markdown 마커는 `data-source-line` 매핑을 사용한다.
3. nearest fallback이 필요하면 더 작은 line을 우선한다.
4. hover preview는 최대 3개 코멘트만 보여주고 초과분은 `+N more`로 요약한다.

## 6. 관련 구현 파일

- `src/code-comments/comment-types.ts`
- `src/code-comments/comment-anchor.ts`
- `src/code-comments/comment-persistence.ts`
- `src/code-comments/comment-line-index.ts`
- `src/code-comments/comment-hover-popover.tsx`
- `src/code-comments/comment-export.ts`
- `src/code-comments/comment-list-modal.tsx`
- `src/code-comments/export-comments-modal.tsx`
- `src/code-comments/global-comments-modal.tsx`

## 7. 관련 테스트

- `src/code-comments/comment-anchor.test.ts`
- `src/code-comments/comment-persistence.test.ts`
- `src/code-comments/comment-export.test.ts`
- `src/code-comments/comment-list-modal.test.tsx`
- `src/App.test.tsx`
