# IMPLEMENTATION_PLAN (F11)

## 1. Overview

F11의 목표는 코드 뷰어 선택 범위 기반 인라인 코멘트 수집과 LLM 전달용 export bundle 생성을 추가하는 것이다.
핵심 축은 4가지다.

1. 코멘트 도메인 모델(`CodeComment`, `anchor/hash`) 고정
2. 워크스페이스 경계 내 comments 저장/내보내기 IPC 계약 확장
3. 우클릭 `Add Comment` + `Export Comments` UX 연결
4. 길이 제한(`MAX_CLIPBOARD_CHARS=30000`) 및 회귀 테스트 고정

기준 문서:

- `/_sdd/spec/main.md` 섹션 `2.1`, `6.3`, `6.5`, `7`, `9.2`, `10.3`, `12.2(F11)`, `13.1`
- `/_sdd/drafts/feature_draft_f11_inline_code_comments_and_llm_export_bundle.md`

---

## 2. Scope (In/Out)

### In Scope

- `CodeComment` 타입 및 anchor(snippet/hash/before/after) 생성 유틸 구현
- 워크스페이스별 comments source of truth(`.sdd-workbench/comments.json`) 도입
- `_COMMENTS.md` overwrite export + bundle 파일 저장(`.sdd-workbench/exports/<timestamp>-comments-bundle.md`)
- CodeViewer 우클릭 `Add Comment` + 코멘트 입력 모달
- App 액션 `Export Comments` 모달 + 옵션(copy / `_COMMENTS.md` / bundle file)
- bundle copy 길이 제한(`MAX_CLIPBOARD_CHARS=30000`) 및 파일 저장 fallback
- 단위/통합 테스트 보강 + 품질 게이트 통과

### Out of Scope

- 코멘트 편집/삭제/정렬 UI 고도화
- AST/semantic 기반 라인 relocation 추적
- 원격 동기화/협업
- LLM API 직접 호출(클립보드/파일 export만)

---

## 3. Components

1. **Comment Domain Layer**
- `CodeComment` 타입, anchor/hash 생성 규칙, deterministic 정렬 키 정의

2. **Comment Persistence & Export Layer (Renderer Utility)**
- comments JSON 직렬화/역직렬화, `_COMMENTS.md` 및 bundle 텍스트 렌더

3. **Comment IPC Layer (Electron Main/Preload)**
- `workspace:readComments`, `workspace:writeComments`, `workspace:exportCommentsBundle`
- workspace 경계 검사 + 디렉터리 생성 + 파일 저장

4. **Workspace Comment State Layer**
- 워크스페이스별 comments 로딩/저장 상태 및 에러 상태 관리
- active workspace 전환 시 코멘트 경계 유지

5. **Comment Interaction UI Layer**
- CodeViewer 우클릭 액션 확장(`Add Comment`) + 입력 모달

6. **Export UX Layer**
- `Export Comments` 모달, 옵션 선택, 길이 제한 가드, 배너 피드백

7. **Validation Layer**
- 단위/통합 회귀 테스트 + `test/lint/build` 품질 게이트

---

## 4. Implementation Phases

### Phase 1: Domain + IPC Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | 코멘트 도메인 타입/anchor/hash 유틸 구현 | P0 | - | Comment Domain Layer |
| T2 | comments persistence/export 유틸 구현 | P0 | T1 | Comment Persistence & Export Layer |
| T3 | comments IPC 채널(main/preload/type) 구현 | P0 | T1 | Comment IPC Layer |

### Phase 2: Workspace State + UI Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T4 | workspace comments 상태/액션 통합 | P0 | T3 | Workspace Comment State Layer |
| T5 | CodeViewer `Add Comment` + 입력 모달 연결 | P0 | T1,T4 | Comment Interaction UI Layer |
| T6 | `Export Comments` 모달 + 길이 제한/내보내기 플로우 연결 | P0 | T2,T4 | Export UX Layer |

### Phase 3: Regression Lock

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T7 | 테스트 보강 + 품질 게이트 통과 | P0 | T5,T6 | Validation Layer |

---

## 5. Task Details

### Task T1: 코멘트 도메인 타입/anchor/hash 유틸 구현

**Component**: Comment Domain Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
코멘트 데이터 계약(`CodeComment`)과 선택 범위 기반 anchor(snippet/hash/before/after) 생성 로직을 구현한다.
라인 번호는 1-based inclusive로 고정하고 hash는 deterministic하게 생성한다.

**Acceptance Criteria**:

- [ ] `CodeComment` 타입 및 생성 입력 타입이 명시된다.
- [ ] 동일 입력에서 `anchor.hash`가 항상 동일하게 생성된다.
- [ ] 단일 라인/다중 라인/빈 본문 경계 케이스에서 안전 동작한다.
- [ ] 정렬 기준(`file ASC`, `startLine ASC`, `createdAt ASC`)을 유틸 레벨에서 고정할 수 있다.

**Target Files**:

- [C] `src/code-comments/comment-types.ts` -- 코멘트 타입/입출력 계약 정의
- [C] `src/code-comments/comment-anchor.ts` -- snippet/hash 생성 유틸
- [C] `src/code-comments/comment-anchor.test.ts` -- anchor/hash 단위 테스트

**Technical Notes**:

- hash 입력 전 공백/개행 normalize를 적용한다.
- snippet은 과도하게 길어지지 않도록 제한한다(예: 줄 수/문자 수 cap).

**Dependencies**: -

---

### Task T2: comments persistence/export 유틸 구현

**Component**: Comment Persistence & Export Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
comments JSON 직렬화/역직렬화, `_COMMENTS.md` 렌더, LLM bundle 텍스트 렌더 함수를 구현한다.
`_COMMENTS.md`는 export 산출물로 overwrite 생성하며 source of truth는 `comments.json`으로 유지한다.

**Acceptance Criteria**:

- [ ] comments JSON serialize/parse가 schema 오류에 대해 안전 fallback을 제공한다.
- [ ] `_COMMENTS.md` 출력 포맷이 deterministic하다.
- [ ] bundle 포맷(Instruction/Constraints/Comments)이 고정 템플릿으로 생성된다.
- [ ] `MAX_CLIPBOARD_CHARS=30000` 상수가 중앙 관리된다.

**Target Files**:

- [C] `src/code-comments/comment-config.ts` -- `MAX_CLIPBOARD_CHARS` 상수
- [C] `src/code-comments/comment-persistence.ts` -- JSON serialize/parse 유틸
- [C] `src/code-comments/comment-persistence.test.ts` -- persistence 단위 테스트
- [C] `src/code-comments/comment-export.ts` -- markdown/bundle 렌더 유틸
- [C] `src/code-comments/comment-export.test.ts` -- export 포맷 단위 테스트

**Technical Notes**:

- parse 실패 시 throw 대신 typed error/fallback 반환을 우선한다.
- 정렬은 render 전에 항상 적용해 출력 안정성을 보장한다.

**Dependencies**: T1

---

### Task T3: comments IPC 채널(main/preload/type) 구현

**Component**: Comment IPC Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
Electron main/preload/global type 계약에 comments read/write/export 채널을 추가하고,
workspace 경계 내 파일 입출력을 안전하게 처리한다.

**Acceptance Criteria**:

- [ ] `workspace:readComments`/`workspace:writeComments`/`workspace:exportCommentsBundle`가 동작한다.
- [ ] `.sdd-workbench` 및 `exports` 디렉터리가 없으면 자동 생성된다.
- [ ] 경계 밖 경로 접근은 차단되고 오류가 반환된다.
- [ ] timestamp 기반 bundle 파일명이 보장된다.

**Target Files**:

- [M] `electron/main.ts` -- comments IPC handler + 경계 검사 + 파일 저장
- [M] `electron/preload.ts` -- renderer bridge API 노출
- [M] `electron/electron-env.d.ts` -- Window 타입 계약 확장

**Technical Notes**:

- 기존 `isPathInsideWorkspace` 로직을 재사용한다.
- write는 임시파일 후 rename 방식 등 원자적 저장을 우선 고려한다.

**Dependencies**: T1

---

### Task T4: workspace comments 상태/액션 통합

**Component**: Workspace Comment State Layer  
**Priority**: P0-Critical  
**Type**: Refactor

**Description**:
워크스페이스 세션 모델과 context API에 comments 상태(`comments`, 읽기/쓰기 상태, 에러) 및 액션(load/add/export)을 추가한다.
active workspace 전환 시 comments 경계가 섞이지 않도록 유지한다.

**Acceptance Criteria**:

- [ ] workspace session에 comments 상태 필드가 추가된다.
- [ ] active workspace 변경 시 comments 로딩이 해당 workspace 기준으로 수행된다.
- [ ] 코멘트 저장/불러오기 실패 시 배너 피드백이 노출된다.
- [ ] 기존 파일 선택/히스토리/watcher 흐름에 회귀가 없다.

**Target Files**:

- [M] `src/workspace/workspace-model.ts` -- comments 상태 필드/전이 규칙 추가
- [M] `src/workspace/workspace-model.test.ts` -- 모델 전이/경계 테스트 확장
- [M] `src/workspace/workspace-context.tsx` -- comments 액션/상태 wiring
- [M] `src/workspace/use-workspace.ts` -- context 타입 노출 동기화

**Technical Notes**:

- comments read/write와 file read/index request token은 분리 관리한다.
- workspace close 시 comments 상태도 세션 단위로 정리한다.

**Dependencies**: T3

---

### Task T5: CodeViewer `Add Comment` + 입력 모달 연결

**Component**: Comment Interaction UI Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
CodeViewer 우클릭 메뉴에 `Add Comment` 액션을 추가하고, 선택 범위 기반 코멘트 입력 모달에서 저장까지 연결한다.
기존 복사 액션(`Copy Selected Content`, `Copy Both`, `Copy Relative Path`)은 유지한다.

**Acceptance Criteria**:

- [ ] 선택 범위가 있는 상태에서 우클릭 시 `Add Comment`를 실행할 수 있다.
- [ ] 선택 범위가 없으면 `Add Comment`는 disabled 또는 guard로 차단된다.
- [ ] 저장 성공 시 comments 상태가 갱신되고 피드백이 노출된다.
- [ ] 기존 우클릭 복사 액션 회귀가 없다.

**Target Files**:

- [M] `src/code-viewer/code-viewer-panel.tsx` -- `Add Comment` 액션 추가/콜백 연결
- [C] `src/code-comments/comment-editor-modal.tsx` -- 코멘트 입력 모달
- [M] `src/App.tsx` -- 모달 상태/코멘트 저장 오케스트레이션
- [M] `src/App.css` -- comment modal 스타일
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- 우클릭 메뉴 회귀 + Add Comment 테스트

**Technical Notes**:

- 우클릭 selection 정책(F06.1/F06.2)을 그대로 재사용한다.
- 입력 모달은 MVP에서 단일 textarea + Save/Cancel 구조로 제한한다.

**Dependencies**: T1, T4

---

### Task T6: `Export Comments` 모달 + 길이 제한/내보내기 플로우 연결

**Component**: Export UX Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
헤더 액션 영역에 `Export Comments` 진입점을 추가하고, instruction/옵션 입력 모달을 통해 copy 및 파일 export를 수행한다.
길이 제한 초과 시 copy를 차단하고 파일 export-only fallback을 제공한다.

**Acceptance Criteria**:

- [ ] Export 모달에서 instruction + 옵션(copy / `_COMMENTS.md` / bundle file) 선택이 가능하다.
- [ ] `_COMMENTS.md` overwrite 생성과 bundle 파일 저장이 동작한다.
- [ ] bundle 길이 초과 시 copy 옵션이 차단되고 안내가 표시된다.
- [ ] active workspace가 없으면 export 액션은 disabled/no-op 처리된다.

**Target Files**:

- [C] `src/code-comments/export-comments-modal.tsx` -- export 옵션 입력 모달
- [M] `src/App.tsx` -- export 액션/모달/IPC 호출/배너 처리
- [M] `src/App.css` -- export modal 스타일
- [M] `src/App.test.tsx` -- export 플로우/길이 제한 통합 테스트

**Technical Notes**:

- copy 옵션은 `MAX_CLIPBOARD_CHARS`와 현재 bundle 길이를 비교해 UI 레벨에서 선차단한다.
- 실패 케이스(IPC 오류, 파일 권한 오류)는 banner 메시지로 표준화한다.

**Dependencies**: T2, T4

---

### Task T7: 테스트 보강 + 품질 게이트 통과

**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
F11 범위 전체(도메인, IPC, UI 상호작용, 길이 정책)를 테스트로 고정하고 기존 기능 회귀를 확인한다.

**Acceptance Criteria**:

- [ ] 새 단위 테스트(`comment-anchor`, `comment-persistence`, `comment-export`)가 통과한다.
- [ ] App 통합 테스트에서 add comment/export 성공/실패/길이 제한 시나리오가 통과한다.
- [ ] 기존 CodeViewer 복사/선택 및 workspace 흐름 회귀가 없다.
- [ ] `npm test`, `npm run lint`, `npm run build`를 통과한다.

**Target Files**:

- [M] `src/App.test.tsx` -- F11 end-to-end 통합 시나리오 추가
- [M] `src/code-viewer/code-viewer-panel.test.tsx` -- context menu 회귀 + Add Comment
- [M] `src/workspace/workspace-model.test.ts` -- comments 세션 경계 회귀
- [M] `src/context-menu/copy-action-popover.test.tsx` -- 액션 수 증가 시 렌더/동작 회귀(필요 시)

**Technical Notes**:

- `window.workspace.*` mock 계약에 comments IPC 응답 타입을 추가한다.
- 대형 bundle 케이스는 반복 문자열 fixture로 deterministic하게 재현한다.

**Dependencies**: T5, T6

---

## 6. Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | Blocking Conflict |
|-------|-------------|--------------|-------------------|
| Phase 1 | 3 | 2 | T1 완료 전 T2/T3 착수 불가 |
| Phase 2 | 3 | 1 | `src/App.tsx`, `src/App.css`에서 T5/T6 충돌 |
| Phase 3 | 1 | 1 | `src/App.test.tsx` 중심 통합 검증 |

병렬 권장 트랙:

- Track A: `T1 -> T2`
- Track B: `T1 -> T3`
- Track C: `T3 -> T4 -> T5 -> T6 -> T7` (UI 중심 critical path)

파일 충돌 포인트:

- `src/App.tsx`: T5, T6 모두 수정 (순차 수행 필수)
- `src/App.css`: T5, T6 모두 수정 (순차 수행 필수)
- `src/App.test.tsx`: T6, T7 모두 수정 (순차 병합 필요)

의미적 충돌 포인트:

- IPC payload 스키마(main/preload/electron-env) 불일치 시 런타임 실패 위험
- 우클릭 메뉴 액션 순서 변경으로 F06.2 UX 회귀 가능
- active workspace 경계 누락 시 comments 오염 위험

예상 크리티컬 패스:

`T1 -> T3 -> T4 -> T5 -> T6 -> T7`

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| comments.json 파싱 실패/손상 | 코멘트 로딩 실패 | parse fallback + 배너 알림 + 기존 파일 보존 |
| bundle 과대 길이 copy 실패 | 사용자 export 실패 체감 | 사전 길이 검증 + copy 비활성 + 파일 저장 fallback |
| IPC 타입 드리프트(main/preload/env) | 런타임 오류 | T3에서 3개 파일 동시 갱신 + T7 통합 테스트 강제 |
| 우클릭 메뉴 복잡도 증가 | 사용성 저하 | 메뉴 순서 고정(`Copy*` 후 `Add Comment`) + disabled 정책 명시 |
| workspace 경계 검증 누락 | 보안/데이터 오염 | `isPathInsideWorkspace` 재사용 + 경계 테스트 추가 |

---

## 8. Open Questions

- [ ] 없음 (결정 고정: 정렬=file+line, `_COMMENTS.md` overwrite, `MAX_CLIPBOARD_CHARS=30000`)
