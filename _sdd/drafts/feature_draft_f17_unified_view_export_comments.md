# Feature Draft: F17 View Comments 통합 Export

---

# Part 1: Spec Patch Draft

> This patch can be copy-pasted into the corresponding spec section,
> or used as input for the `spec-update-todo` skill.

# Spec Update Input

**Date**: 2026-02-23
**Author**: user
**Target Spec**: `/_sdd/spec/sdd-workbench/`

## New Features

### Feature: View Comments 통합 Export (선택 기반)
**Priority**: High
**Category**: Comment UX
**Target Component**: Comment Domain Layer + App Shell
**Target Section**: `/_sdd/spec/sdd-workbench/04-interfaces.md` > `4. 코멘트/Export 정책 계약`

**Description**:
기존에 분리되어 있던 `View Comments`와 `Export Comments`를 통합한다.
`View Comments` 모달에서 각 line comment 왼쪽에 체크박스를 추가하고, 하단에 `Export Selected` 버튼을 배치하여 선택된 코멘트만 Export 모달로 전달한다.

**Acceptance Criteria**:
- [ ] `View Comments` 모달에 각 line comment 왼쪽에 체크박스가 표시된다.
- [ ] 모달 열림 시 모든 pending line comment는 기본 체크 상태다.
- [ ] exported 상태(`exportedAt` 존재) line comment는 기본 미체크이며 체크 가능하다.
- [ ] 상단에 `Select All` / `Deselect All` 토글이 존재한다.
- [ ] 하단에 `Export Selected (N)` 버튼이 표시되고, 선택 0개면 비활성화된다.
- [ ] `Export Selected` 클릭 시 View Comments 모달이 닫히고 Export Comments 모달이 열린다.
- [ ] Export Comments 모달은 선택된 코멘트만 대상으로 동작한다.
- [ ] Export 완료 후 선택된 코멘트에만 `exportedAt`가 기록된다.
- [ ] 헤더의 기존 `Export Comments` 버튼이 제거된다.
- [ ] 기존 View Comments 기능(edit/delete/Delete Exported)이 회귀하지 않는다.

**Technical Notes**:
- `CommentListModal`에 `selectedCommentIds: Set<string>` 상태를 추가한다.
- `Export Selected` 클릭 시 선택된 ID 배열을 콜백으로 상위(`App.tsx`)에 전달한다.
- `App.tsx`의 `handleExportComments`에서 `pendingComments` 대신 전달받은 선택 코멘트를 사용한다.
- `ExportCommentsModal`은 props로 받는 `commentCount`/`pendingCommentCount`를 선택 기반으로 전환한다.

**Dependencies**:
- 기존 F12.2(View Comments edit/delete), F12.3(Global Comments export prepend) 완료 상태 전제

---

## Improvements

### Improvement: 헤더 Export Comments 버튼 제거
**Priority**: High
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`
**Current State**: 헤더 Code comments 그룹에 `+ Global`, `View`, `Export` 3개 버튼이 존재한다.
**Proposed**: `Export` 버튼을 제거하고 `+ Global`, `View` 2개만 유지한다.
**Reason**: Export 기능이 View Comments 모달에 통합되므로 헤더 단축 버튼이 불필요해진다.

---

## Component Changes

### Update Component: `src/code-comments/comment-list-modal.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.6 Comment Domain Layer`
**Change Type**: Enhancement

**Changes**:
- line comment 항목 왼쪽에 체크박스 추가
- `selectedCommentIds` 상태 관리 (열림 시 pending 전부 체크)
- `Select All` / `Deselect All` 토글 버튼
- `Export Selected (N)` 하단 버튼 + 콜백

### Update Component: `src/code-comments/export-comments-modal.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.6 Comment Domain Layer`
**Change Type**: Enhancement

**Changes**:
- `selectedComments` props 추가로 선택 코멘트 기반 export 지원
- `commentCount`/`pendingCommentCount`를 선택 기반 값으로 표시

### Update Component: `src/App.tsx`
**Target Section**: `/_sdd/spec/sdd-workbench/03-components.md` > `1.1 App Shell`
**Change Type**: Enhancement

**Changes**:
- 헤더 `Export Comments` 버튼 제거
- `CommentListModal`에 `onRequestExport` 콜백 연결
- `handleExportComments`에서 선택된 코멘트 ID 기반 export 처리
- export 모달 열기를 View Comments의 `onRequestExport` 경유로 변경

---

## Notes

### Context
현재 UX는 코멘트를 보려면 View, 내보내려면 Export를 각각 열어야 하므로 코멘트를 확인하고 선택적으로 내보내는 자연스러운 흐름이 끊긴다.
View 안에서 바로 Export로 연결하면 코멘트를 보면서 어떤 걸 내보낼지 선택하는 단일 흐름이 완성된다.

### Constraints
- 기존 Export 모달의 instruction/target 선택 UI는 유지한다.
- Global Comments는 기존과 동일하게 export 시 자동 포함/제외 정책을 따른다.
- `exportedAt` 기록은 선택된 코멘트에만 적용한다.

---

# Part 2: Implementation Plan

## Overview
`View Comments` 모달에 코멘트 선택 체크박스와 `Export Selected` 버튼을 추가하고, 헤더의 독립 `Export` 버튼을 제거하여 View → Export 단일 흐름을 완성한다.

## Scope
### In Scope
- View Comments 모달에 체크박스 + Export Selected 버튼 추가
- 선택 기반 export 파이프라인 연결
- 헤더 Export 버튼 제거
- 기존 테스트 업데이트 및 신규 테스트 추가

### Out of Scope
- Export 모달 UI 자체 변경 (instruction/target 선택은 기존 유지)
- 코멘트 필터링/검색 UI
- 코멘트 스레드/협업 기능

## Components
1. **CommentListModal**: 체크박스 + 선택 상태 + Export Selected 버튼 추가
2. **ExportCommentsModal**: 선택 코멘트 기반 props 전환
3. **App Shell**: Export 버튼 제거 + View→Export 연결 + 선택 기반 export 핸들러

## Implementation Phases

### Phase 1: View Comments 모달 선택 UI
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | CommentListModal 체크박스 + 선택 상태 + Export Selected 버튼 추가 | P0 | - | CommentListModal |

### Phase 2: App 통합 + Export 연결
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T2 | App.tsx에서 View→Export 파이프라인 연결 + 헤더 Export 버튼 제거 | P0 | T1 | App Shell |

### Phase 3: 테스트 + 검증
| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | 단위/통합 테스트 추가 및 회귀 검증 | P0 | T2 | Validation |

## Task Details

### Task T1: CommentListModal 체크박스 + 선택 상태 + Export Selected 버튼 추가
**Component**: CommentListModal
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`CommentListModal`에 다음을 추가한다:
1. `selectedCommentIds: Set<string>` 내부 상태 — 모달 열림 시 pending comments 전부를 기본 선택
2. 각 line comment 항목 왼쪽에 체크박스
3. `Select All` / `Deselect All` 토글 버튼 (line comments 헤더 영역)
4. 하단 `Export Selected (N)` 버튼
5. 새 prop `onRequestExport: (selectedCommentIds: string[]) => void`

**Acceptance Criteria**:
- [ ] 체크박스가 각 line comment 왼쪽에 표시된다.
- [ ] 모달 열림 시 pending(`exportedAt` 없음) 코멘트는 체크, exported 코멘트는 미체크 상태다.
- [ ] Select All은 모든 line comment를 체크하고, Deselect All은 모두 해제한다.
- [ ] `Export Selected (N)` 버튼에 선택 개수가 표시되고, 0이면 disabled다.
- [ ] `Export Selected` 클릭 시 `onRequestExport`가 선택 ID 배열로 호출된다.
- [ ] 기존 edit/delete/Delete Exported 기능이 회귀하지 않는다.

**Target Files**:
- [M] `src/code-comments/comment-list-modal.tsx` -- 체크박스/선택상태/Export Selected 버튼 추가
- [M] `src/App.css` -- 체크박스/선택 토글/Export Selected 스타일

**Technical Notes**:
- 체크박스는 `<input type="checkbox">` 사용, `comment-list-item` 왼쪽에 배치
- `selectedCommentIds`는 `isOpen` 변경 시 pending comments로 리셋
- Delete 시 삭제된 코멘트 ID를 `selectedCommentIds`에서도 제거

**Dependencies**: -

---

### Task T2: App.tsx에서 View→Export 파이프라인 연결 + 헤더 Export 버튼 제거
**Component**: App Shell
**Priority**: P0-Critical
**Type**: Feature

**Description**:
1. 헤더 Code comments 그룹에서 `Export` 버튼 JSX를 제거한다.
2. `CommentListModal`에 `onRequestExport` prop을 연결한다:
   - 콜백은 선택된 코멘트 ID 배열을 받아 `exportSelectedCommentIds` 상태에 저장
   - View Comments 모달을 닫고 Export Comments 모달을 연다
3. `handleExportComments`를 수정한다:
   - `exportSelectedCommentIds`가 있으면 해당 ID의 코멘트만 export snapshot으로 사용
   - `exportedAt` 기록도 선택 코멘트에만 적용
4. `ExportCommentsModal`에 전달하는 `commentCount`/`pendingCommentCount`를 선택 기반으로 변경한다.

**Acceptance Criteria**:
- [ ] 헤더에 `Export Comments` 버튼이 더 이상 표시되지 않는다.
- [ ] View Comments에서 `Export Selected` 클릭 시 Export 모달이 열린다.
- [ ] Export 모달에 선택된 코멘트 수가 표시된다.
- [ ] Export 완료 후 선택된 코멘트에만 `exportedAt`가 기록된다.
- [ ] Export 취소 시 View Comments 모달이 다시 열리지 않는다(정상 종료).

**Target Files**:
- [M] `src/App.tsx` -- Export 버튼 제거, onRequestExport 연결, 선택 기반 export 핸들러
- [M] `src/code-comments/export-comments-modal.tsx` -- selectedCommentCount prop 추가 (optional)

**Technical Notes**:
- `exportSelectedCommentIds: string[] | null` 상태 추가 — `null`이면 export 모달 미사용
- `onRequestExport` 콜백에서 `setExportSelectedCommentIds(ids)` → `setIsViewCommentsModalOpen(false)` → `setIsExportModalOpen(true)`
- `handleExportComments` 내부에서 `exportSelectedCommentIds`로 `comments.filter`하여 snapshot 생성
- Export 모달 닫힘 시 `exportSelectedCommentIds`를 `null`로 클리어
- `estimateBundleLength`도 선택 코멘트 기반으로 동작해야 함

**Dependencies**: T1

---

### Task T3: 단위/통합 테스트 추가 및 회귀 검증
**Component**: Validation
**Priority**: P0-Critical
**Type**: Test

**Description**:
1. `comment-list-modal.test.tsx`:
   - 체크박스 렌더/토글 테스트
   - 기본 선택 상태(pending=체크, exported=미체크) 테스트
   - Select All / Deselect All 동작 테스트
   - Export Selected 버튼 disabled/enabled 테스트
   - Export Selected 클릭 시 `onRequestExport` 호출 테스트
   - 기존 edit/delete 테스트 회귀 확인

2. `App.test.tsx`:
   - 헤더 Export 버튼 부재 확인
   - View Comments → Export Selected → Export 모달 열림 흐름 테스트
   - 선택 코멘트만 export snapshot으로 사용되는지 확인

**Acceptance Criteria**:
- [ ] `npm test` 전체 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과

**Target Files**:
- [M] `src/code-comments/comment-list-modal.test.tsx` -- 체크박스/선택/Export Selected 테스트
- [M] `src/App.test.tsx` -- 헤더 Export 버튼 제거 확인 + View→Export 통합 흐름 테스트

**Technical Notes**:
- 기존 Export 버튼 관련 테스트는 제거 또는 수정
- `fireEvent.click` 으로 체크박스 토글 검증

**Dependencies**: T2

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| 기존 Export 테스트 대량 수정 | Medium | Export 모달 자체는 유지, 진입 경로만 변경이므로 수정 범위 제한적 |
| 선택 상태와 edit/delete 상호작용 | Low | 삭제 시 selectedIds에서 제거, 편집은 선택 상태에 영향 없음 |

## Open Questions
- (없음 — 사용자가 Export 헤더 버튼 제거에 동의함)

## Model Recommendation
구현 규모가 중간이고 기존 패턴을 따르므로 `sonnet` 모델을 권장한다.
