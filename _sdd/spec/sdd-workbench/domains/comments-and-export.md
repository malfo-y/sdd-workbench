# Comments And Export

## 1. 목적

이 문서는 line comment, global comments, hover preview, export bundle, View Comments 관리 흐름을 정리한다.

## 2. 사용자 가시 동작

- 코드/스펙에서 코멘트를 추가한다.
- 저장된 코멘트를 모달에서 조회, 수정, 삭제, exported 정리한다.
- global comments를 별도 텍스트로 편집하고 export 포함 여부를 제어한다.
- marker hover로 코멘트 내용을 빠르게 미리 본다.

## 3. 핵심 상태와 source of truth

- schema / anchor / persistence:
  - `src/code-comments/comment-types.ts`
  - `src/code-comments/comment-anchor.ts`
  - `src/code-comments/comment-persistence.ts`
- 인덱스 / hover / export:
  - `src/code-comments/comment-line-index.ts`
  - `src/code-comments/comment-hover-popover.tsx`
  - `src/code-comments/comment-export.ts`
- UI:
  - `src/code-comments/comment-editor-modal.tsx`
  - `src/code-comments/comment-list-modal.tsx`
  - `src/code-comments/export-comments-modal.tsx`
  - `src/code-comments/global-comments-modal.tsx`

## 4. 핵심 규칙

### 4.1 저장 경로

- line comments source of truth는 `workspaceRoot/.sdd-workbench/comments.json`
- global comments source of truth는 `workspaceRoot/.sdd-workbench/global-comments.md`
- `_COMMENTS.md`는 export 산출물이며 source of truth가 아니다

### 4.2 anchor와 fallback

- comment는 항상 `startLine/endLine`을 유지한다.
- spec-origin comment는 optional `startOffset/endOffset`를 함께 저장할 수 있다.
- stale offset recovery는 현재 범위에서 하지 않는다.

### 4.3 export와 preview

- 기본 export는 pending comments만 포함한다.
- 사용자가 명시적으로 선택한 export에서는 exported comment도 다시 포함할 수 있다.
- global comments는 체크박스가 켜진 경우에만 prepend 된다.
- hover preview는 최대 3개 코멘트까지만 표시한다.

## 5. 주요 코드

- `src/code-comments/comment-types.ts`
- `src/code-comments/comment-anchor.ts`
- `src/code-comments/comment-persistence.ts`
- `src/code-comments/comment-line-index.ts`
- `src/code-comments/comment-hover-popover.tsx`
- `src/code-comments/comment-export.ts`
- `src/code-comments/comment-list-modal.tsx`
- `src/code-comments/export-comments-modal.tsx`
- `src/code-comments/global-comments-modal.tsx`

## 6. 관련 계약 문서

- [comment-contracts](../contracts/comment-contracts.md)
- [navigation-rules](../contracts/navigation-rules.md)
- [state-model](../contracts/state-model.md)

## 7. 핵심 테스트

- `src/code-comments/comment-anchor.test.ts`
- `src/code-comments/comment-persistence.test.ts`
- `src/code-comments/comment-export.test.ts`
- `src/code-comments/comment-list-modal.test.tsx`
- `src/App.test.tsx`

## 8. 변경 시 주의점

- schema 변경은 persistence, export text, modal UI, hover preview를 함께 갱신해야 한다.
- global comments 포함 규칙은 export 카운트 문구와도 연결되어 있다.
