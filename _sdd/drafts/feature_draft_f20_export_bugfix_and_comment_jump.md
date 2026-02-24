# Feature Draft F20: Export 버그 수정 및 코멘트→코드 점프

# Part 1: Spec Patch Draft

> 이 패치는 해당 스펙 섹션에 직접 복사-붙여넣기하거나,
> `spec-update-todo` 스킬의 입력으로 사용할 수 있습니다.

# Spec Update Input

**Date**: 2026-02-24
**Author**: user
**Target Spec**: `/_sdd/spec/sdd-workbench/04-interfaces.md`, `/_sdd/spec/sdd-workbench/03-components.md`

---

## 버그 수정

### Bug: Export에서 pending-only 제한이 선택 export 시에도 적용됨
**Severity**: High
**Target Section**: `/_sdd/spec/sdd-workbench/04-interfaces.md` > `4. 코멘트/Export 정책 계약`
**Location**: `src/App.tsx:1633`, `src/code-comments/export-comments-modal.tsx:67-68`
**Description**: View Comments에서 사용자가 명시적으로 코멘트를 선택한 후 export하는 경우에도, export modal에서 `pendingCommentCount > 0` 또는 `allowExportWithoutPendingComments(=global comments 포함)` 조건을 만족하지 않으면 Export 버튼이 비활성화됨. 이미 exported된 코멘트만 선택한 경우 export 불가.
**Reproduction**:
1. 코멘트 여러 개를 작성 후 한 번 export
2. View Comments 열기
3. exported된 코멘트만 선택 (global comments 미포함)
4. Export Selected 클릭 → Export modal에서 Export 버튼 비활성화
**Expected Behavior**: View Comments에서 명시적으로 코멘트를 선택한 경우, pending/exported 구분 없이 선택된 코멘트를 export할 수 있어야 함.

**스펙 변경 내용**:
기존 정책 항목 6번 수정:
- 기존: `Export 대상 line comment는 pending comments(exportedAt 없음)만 포함한다.`
- 변경: `Export 기본 동작은 pending comments만 포함하되, View Comments에서 명시적으로 코멘트를 선택한 경우 선택된 코멘트를 모두 export할 수 있다. 이 경우 pending/exported 구분은 적용하지 않는다.`

---

### Bug: Export 코멘트 갯수에 global comments 미반영
**Severity**: Medium
**Target Section**: `/_sdd/spec/sdd-workbench/04-interfaces.md` > `4. 코멘트/Export 정책 계약`
**Location**: `src/App.tsx:1630`, `src/code-comments/export-comments-modal.tsx:93`, `src/code-comments/comment-export.ts:56`
**Description**: Export modal의 `{commentCount} comment(s) included` 카운트가 코드 코멘트만 포함하고 global comments를 반영하지 않음. 또한 export된 markdown의 `Total comments:` 라인도 마찬가지.
**Reproduction**:
1. 코멘트 2개 + global comments 작성
2. View Comments에서 2개 선택 + Include global comments 체크
3. Export Selected 클릭 → Export modal에 `2 comment(s) included`로 표시 (global comments가 포함됨에도 카운트에 미반영)
**Expected Behavior**: Global comments가 포함될 때 카운트 표시에 이를 반영해야 함 (예: `2 comment(s) + global comments included`).

**스펙 변경 내용**:
기존 정책 항목 8번 보완:
- 기존: `Export 모달에는 View Comments 체크박스 상태를 반영한 global comments 포함 여부(included/not included)를 표시한다.`
- 변경: `Export 모달에는 View Comments 체크박스 상태를 반영한 global comments 포함 여부를 표시한다. 코멘트 갯수 표시 시 global comments가 포함되는 경우 이를 카운트에 반영한다 (예: "N comment(s) + global comments included"). export된 markdown의 Total comments 라인에도 global comments 포함 여부를 표기한다.`

---

## 개선 사항

### Improvement: 코멘트 뷰어에서 해당 코드 라인으로 이동
**Priority**: High
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.6 Comment Domain Layer`
**Current State**: View Comments 모달에서 코멘트의 파일경로:라인 정보가 텍스트로만 표시되며 클릭 불가.
**Proposed**: 코멘트의 target 텍스트(`relativePath:L{start}-L{end}`)를 클릭하면 해당 파일을 열고 코드 뷰어에서 해당 라인으로 스크롤 이동. View Comments 모달은 이동 시 자동으로 닫힘.
**Reason**: 코멘트 작성 맥락을 빠르게 확인하기 위해 코드 위치를 직접 확인할 수 있어야 함. 기존 `CodeViewerJumpRequest` 메커니즘을 재활용 가능.

**스펙 변경 내용**:
`03-components.md` > `1.6 Comment Domain Layer` > `comment-list-modal.tsx` 설명 보완:
- 기존: `코멘트 조회/편집/개별삭제/Delete Exported(2-step confirm, 하단 좌측 배치) + global comments 상단 read-only 섹션 + "Include in export" 체크박스`
- 변경: `코멘트 조회/편집/개별삭제/Delete Exported(2-step confirm, 하단 좌측 배치) + global comments 상단 read-only 섹션 + "Include in export" 체크박스 + 코멘트 target 클릭 시 해당 파일/라인으로 점프(모달 닫힘)`

`04-interfaces.md` > `4. 코멘트/Export 정책 계약`에 신규 항목 추가:
- `13. View Comments에서 코멘트의 target 텍스트(파일경로:라인)를 클릭하면, 해당 파일을 열고 코드 뷰어에서 해당 라인으로 스크롤한다. 모달은 자동으로 닫힌다. 점프 대상 파일이 현재 워크스페이스에 없으면 무시한다.`

---

## Notes

### Context
- 이 3개 항목은 F11(inline comments) ~ F17(unified view/export) 기능 완성 후 발견된 이슈들.
- 기존 `CodeViewerJumpRequest` 인프라 및 `selectFile` + `setCodeViewerJumpRequest` 패턴을 재활용.

### Constraints
- View Comments 모달의 레이아웃 변경을 최소화 (target 텍스트를 버튼으로 변경하는 수준).
- Export modal의 prop 인터페이스 변경을 최소화.

---
---

# Part 2: Implementation Plan

## Overview
Export 기능의 버그 2건 수정 및 코멘트 뷰어→코드 라인 점프 기능 추가. 기존 인프라 재활용으로 구현 범위를 최소화.

## Scope
### In Scope
- Export modal: pending-only 제한 제거 (선택 export 시)
- Export modal/markdown: global comments 카운트 반영
- View Comments modal: 코멘트 target 클릭→코드 라인 점프

### Out of Scope
- 코드 뷰어 글자/단어별 텍스트 선택 기능 (별도 feature draft 필요)
- 코드 뷰어 텍스트 검색 기능 (별도 feature draft 필요)

## Components
1. **ExportCommentsModal**: pending-only 가드 조건 완화 + 카운트 표시 개선
2. **comment-export**: markdown 출력의 Total comments 라인 개선
3. **CommentListModal**: target 클릭 핸들러 + onJumpToComment 콜백 추가
4. **App.tsx**: export modal prop 수정 + comment list modal의 jump 콜백 연결

## Implementation Phases

### Phase 1: Bug Fixes (독립 실행 가능)
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 1  | Export pending-only 제한 제거 | P0 | - | ExportCommentsModal, App |
| 2  | Export 카운트에 global comments 반영 | P0 | - | ExportCommentsModal, comment-export, App |

### Phase 2: Feature (Phase 1과 독립 실행 가능)
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| 3  | 코멘트 target 클릭→코드 점프 | P1 | - | CommentListModal, App |

## Task Details

### Task 1: Export pending-only 제한 제거
**Component**: ExportCommentsModal, App
**Priority**: P0-Critical
**Type**: Bug

**Description**:
View Comments에서 사용자가 명시적으로 코멘트를 선택한 경우, exported 코멘트도 포함하여 export할 수 있도록 수정.

**변경 사항**:

1. `src/App.tsx` - `allowExportWithoutPendingComments` prop 계산 변경:
   ```
   기존: allowExportWithoutPendingComments={effectiveExportHasGlobalComments}
   변경: allowExportWithoutPendingComments={Boolean(exportSelectedCommentIds) || effectiveExportHasGlobalComments}
   ```
   `exportSelectedCommentIds`가 설정된 경우 (= View Comments에서 명시적 선택), pending 여부에 관계없이 export 허용.

2. `src/code-comments/export-comments-modal.tsx` - "No pending comments" 경고 메시지 조건 유지 (기존 로직 그대로, `allowExportWithoutPendingComments`가 true이면 버튼 활성화되므로 해결됨).

**Acceptance Criteria**:
- [ ] View Comments에서 exported 코멘트만 선택 후 export 시 Export 버튼 활성화
- [ ] View Comments에서 pending + exported 혼합 선택 후 export 정상 동작
- [ ] 기존 동작(header에서 직접 Export Comments 클릭 시 pending만 export)은 유지
- [ ] 테스트 통과

**Target Files**:
- [M] `src/App.tsx` -- allowExportWithoutPendingComments prop 수정
- [M] `src/App.test.tsx` -- 관련 테스트 추가/수정

**Technical Notes**:
- `exportSelectedCommentIds`가 null이면 header에서 직접 열린 것이므로 기존 pending-only 정책 유지.
- `exportSelectedCommentIds`가 배열이면 View Comments에서 선택된 것이므로 pending 제한 해제.
- `handleExportComments` 내 `exportSnapshot` 계산(App.tsx:692-694)은 이미 `exportSelectedCommentIds` 기준으로 필터하므로 변경 불필요.

**Dependencies**: 없음

---

### Task 2: Export 카운트에 global comments 반영
**Component**: ExportCommentsModal, comment-export, App
**Priority**: P0-Critical
**Type**: Bug

**Description**:
Export modal 및 exported markdown 출력에서 global comments가 포함될 때 카운트에 반영.

**변경 사항**:

1. `src/code-comments/export-comments-modal.tsx`:
   - L93 텍스트 변경:
     ```
     기존: <p>{commentCount} comment(s) included</p>
     변경: <p>{commentCount} comment(s){hasGlobalComments ? ' + global comments' : ''} included</p>
     ```

2. `src/code-comments/comment-export.ts`:
   - `renderCommentsMarkdown` 함수의 `Total comments:` 라인(L56) 수정:
     ```
     기존: `Total comments: ${sortedComments.length}`
     변경: `Total comments: ${sortedComments.length}${normalizedGlobalComments.length > 0 ? ' (+ global comments)' : ''}`
     ```

**Acceptance Criteria**:
- [ ] Global comments 포함 시 export modal에 `N comment(s) + global comments included` 표시
- [ ] Global comments 미포함 시 기존대로 `N comment(s) included` 표시
- [ ] Exported markdown의 `Total comments` 라인에 global comments 포함 여부 반영
- [ ] 기존 테스트 통과 + 신규 테스트 추가

**Target Files**:
- [M] `src/code-comments/export-comments-modal.tsx` -- 카운트 텍스트 수정
- [M] `src/code-comments/comment-export.ts` -- Total comments 라인 수정
- [M] `src/code-comments/export-comments-modal.test.tsx` -- 카운트 표시 테스트
- [M] `src/code-comments/comment-export.test.ts` -- Total comments 라인 테스트

**Technical Notes**:
- Global comments는 단일 텍스트 블록이므로 개별 카운트에 `+1`로 추가하지 않고 `+ global comments` 텍스트로 표현.
- `renderLlmBundle` 함수는 `Total comments` 라인이 없으므로 수정 불필요.

**Dependencies**: 없음

---

### Task 3: 코멘트 target 클릭→코드 점프
**Component**: CommentListModal, App
**Priority**: P1-High
**Type**: Feature

**Description**:
View Comments 모달에서 코멘트의 파일경로:라인 텍스트를 클릭하면, 해당 파일을 열고 코드 뷰어에서 해당 라인으로 스크롤. 모달은 자동으로 닫힘.

**변경 사항**:

1. `src/code-comments/comment-list-modal.tsx`:
   - `CommentListModalProps`에 콜백 추가:
     ```typescript
     onJumpToComment: (relativePath: string, startLine: number, endLine: number) => void
     ```
   - L288-293의 target 텍스트 `<p>` → `<button>` 으로 변경:
     ```tsx
     <button
       className="comment-modal-target comment-modal-target-jump"
       onClick={() => {
         onJumpToComment(comment.relativePath, comment.startLine, comment.endLine)
       }}
       title={`Jump to ${comment.relativePath}:${formatLineRange(comment.startLine, comment.endLine)}`}
       type="button"
     >
       {comment.relativePath}:{formatLineRange(comment.startLine, comment.endLine)}
     </button>
     ```

2. `src/App.tsx`:
   - `CommentListModal`에 `onJumpToComment` 콜백 전달:
     ```typescript
     onJumpToComment={(relativePath, startLine, endLine) => {
       // 1. 모달 닫기
       setIsViewCommentsModalOpen(false)
       // 2. 파일 열기
       const didSelect = selectFile(relativePath)
       if (!didSelect) {
         return
       }
       // 3. 라인 선택
       setSelectionRange({ startLine, endLine })
       // 4. 점프 요청
       jumpRequestTokenRef.current += 1
       setCodeViewerJumpRequest({
         targetRelativePath: relativePath,
         lineNumber: startLine,
         token: jumpRequestTokenRef.current,
       })
     }}
     ```

3. `src/App.css`:
   - `.comment-modal-target-jump` 스타일 추가 (기존 `.comment-modal-target` 기반 + 클릭 가능 시각적 힌트):
     ```css
     .comment-modal-target-jump {
       cursor: pointer;
       text-decoration: underline;
       text-decoration-color: rgba(255, 255, 255, 0.3);
       text-underline-offset: 2px;
     }
     .comment-modal-target-jump:hover {
       text-decoration-color: rgba(255, 255, 255, 0.7);
     }
     ```

**Acceptance Criteria**:
- [ ] View Comments에서 코멘트 target 텍스트 클릭 시 해당 파일이 열림
- [ ] 코드 뷰어에서 해당 라인으로 스크롤됨
- [ ] 해당 라인 범위가 선택됨 (startLine-endLine)
- [ ] View Comments 모달이 자동으로 닫힘
- [ ] 워크스페이스에 없는 파일의 target 클릭 시 무시 (에러 없음)
- [ ] Target 텍스트에 시각적 클릭 가능 힌트 (underline + hover 효과)
- [ ] 기존 코멘트 편집/삭제 기능에 영향 없음
- [ ] 테스트 통과

**Target Files**:
- [M] `src/code-comments/comment-list-modal.tsx` -- onJumpToComment prop 추가, target 텍스트 button 변경
- [M] `src/App.tsx` -- onJumpToComment 콜백 연결
- [M] `src/App.css` -- target-jump 버튼 스타일
- [M] `src/code-comments/comment-list-modal.test.tsx` -- jump 콜백 테스트
- [M] `src/App.test.tsx` -- 통합 테스트

**Technical Notes**:
- `selectFile`은 `useWorkspace` 훅에서 제공하는 함수로, 이미 파일 존재 여부를 검증하고 없으면 `false`를 반환.
- `CodeViewerJumpRequest`의 `token`은 중복 점프 방지를 위한 메커니즘. 매 점프마다 increment 필요.
- 편집 모드(`editingCommentId`)에서는 target 클릭을 허용해도 무방 (모달이 닫히면서 편집 상태도 리셋됨).

**Dependencies**: 없음

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| `selectFile`이 비동기 파일 읽기를 트리거하는 동안 jump request가 먼저 도달 | 점프 실패 가능 | `CodeViewerPanel`의 기존 `useEffect`가 `activeFileContent` 변경 시 jump를 재평가하므로 문제 없음 |
| Export modal의 `allowExportWithoutPendingComments` 변경이 header 직접 호출에 영향 | 의도치 않은 동작 변경 | `exportSelectedCommentIds`가 null일 때만 기존 정책 유지 (header 호출 시 항상 null) |

## Open Questions
- (없음 - 모든 항목이 명확한 버그/개선)

## Parallel Execution Summary
| Phase | Total Tasks | Max Parallel | Sequential (conflicts) |
|-------|-------------|--------------|----------------------|
| 1     | 2           | 2            | 0                    |
| 2     | 1           | 1            | 0                    |

세 Task 모두 Target Files 겹침이 `App.tsx`, `App.test.tsx`에서 발생하지만, 수정 지점이 다르므로 병렬 실행 후 merge 가능. 단, Task 1과 Task 3이 `App.tsx`를 동시에 수정하므로 순차 실행이 안전.

**권장 실행 순서**: Task 1 → Task 2 (병렬 가능) → Task 3

## Model Recommendation
Task 복잡도가 낮으므로 `sonnet` 모델로 충분.
