# Feature Draft: F25 — 파일/디렉토리 생성 및 삭제 (File Tree CRUD)

## Context

F24에서 CM6 기반 코드 편집이 가능해진 후, 파일 브라우저에서 파일/디렉토리를 직접 생성·삭제하는 기능이 필요해졌다. 현재 파일 트리는 읽기 전용이며 우클릭 메뉴에 "Copy Relative Path"만 제공한다. Rename은 코멘트 `relativePath` 일괄 갱신 등 복잡도가 높아 본 피처에서 제외하고, 생성/삭제에 집중한다.

### 기존 인프라 활용

- **Watcher `structureChanged` 플래그**: `add`, `unlink`, `addDir`, `unlinkDir` 이벤트는 `hasPendingStructureChanges=true`를 설정하여 Renderer가 자동 re-index(`loadWorkspaceIndex('refresh')`)를 수행한다. 따라서 생성/삭제 후 파일 트리 수동 조작이 불필요하다.
- **`isPathInsideWorkspace`**: F24의 `writeFile`에서 사용 중인 경로 검증 유틸을 재사용한다.
- **`beginWorkspaceWriteOperation` / `endWorkspaceWriteOperation`**: 종료 대기 패턴을 재사용한다.
- **`CopyActionPopover`**: 다중 액션을 이미 지원하는 컨텍스트 메뉴 컴포넌트를 재사용한다.

---

## Part 1: Spec Patch Draft

> 이 패치는 해당 스펙 섹션에 직접 반영하거나, `spec-update-todo` 스킬의 입력으로 사용할 수 있음.

# Spec Update Input

**Date**: 2026-02-25
**Author**: user + Claude
**Target Spec**: `_sdd/spec/main.md` 및 하위 문서

## New Features

### Feature: F25 파일/디렉토리 생성 및 삭제
**Priority**: High
**Category**: Core Feature
**Target Component**: `src/file-tree/*`, `electron/main.ts`, App Shell
**Target Section**: `component-map.md` > `1.3 File Tree Layer`, `contract-map.md` > `3. IPC 계약`

**Description**:
파일 트리 패널에서 파일/디렉토리의 생성 및 삭제를 지원한다. 우클릭 컨텍스트 메뉴에 액션을 추가하고, 인라인 입력을 통해 새 이름을 받으며, IPC 핸들러를 통해 파일시스템 조작을 수행한다. 삭제 시 confirm dialog를 표시하고, active file 관련 edge case를 처리한다.

**Acceptance Criteria**:
- [ ] 파일/디렉토리 우클릭 시 "New File", "New Directory", "Delete" 액션이 컨텍스트 메뉴에 표시
- [ ] 빈 영역(트리 하단) 우클릭 시 "New File", "New Directory" 액션만 표시(root level 생성)
- [ ] "New File" / "New Directory" 선택 시 해당 위치에 인라인 텍스트 입력이 표시
- [ ] 인라인 입력에서 Enter로 확정, Escape로 취소
- [ ] 파일 생성 시 빈 파일이 생성되고 자동으로 해당 파일이 선택(열림)
- [ ] 디렉토리 생성 시 빈 디렉토리가 생성되고 해당 디렉토리가 자동 확장
- [ ] 파일 삭제 시 confirm dialog 표시 후 삭제
- [ ] 디렉토리 삭제 시 "N개 항목 포함" 경고와 함께 confirm dialog 표시 후 삭제
- [ ] active file 삭제 시 activeFile이 null로 초기화
- [ ] dirty active file 삭제 시 unsaved changes confirm이 먼저 표시
- [ ] 삭제된 파일에 달린 코멘트는 유지(orphaned)되며 별도 정리하지 않음
- [ ] 중복 이름 입력 시 에러 배너 표시
- [ ] workspace 경계 외 경로 생성/삭제 거부
- [ ] 생성/삭제 후 watcher가 `structureChanged`를 감지하여 파일 트리가 자동 갱신

**Technical Notes**:
- `workspace:createFile`, `workspace:createDirectory`, `workspace:deleteFile`, `workspace:deleteDirectory` IPC 4개 추가
- 삭제는 `fs.rm` 사용 (디렉토리는 `{ recursive: true, force: true }`)
- 삭제는 휴지통 이동이 아닌 영구 삭제(MVP)
- Rename은 F25 범위 외(코멘트 `relativePath` 마이그레이션 복잡도)

**Dependencies**: 없음 (F24 writeFile 패턴 재사용)

---

## Component Changes

### Modified: `src/file-tree/file-tree-panel.tsx`
- 우클릭 컨텍스트 메뉴에 "New File", "New Directory", "Delete" 액션 추가
- 인라인 이름 입력 UI(`<input>`) 상태 관리 (`inlineInput: { parentPath: string, type: 'file' | 'directory' } | null`)
- 빈 영역 우클릭 처리(root level 생성)
- 삭제 요청 콜백 prop 추가
- 새 props: `onRequestCreateFile`, `onRequestCreateDirectory`, `onRequestDeleteFile`, `onRequestDeleteDirectory`

### Modified: `src/App.tsx`
- FileTreePanel에 create/delete 콜백 연결
- 삭제 confirm dialog 표시 로직
- active file 삭제 시 상태 초기화
- dirty file 삭제 시 unsaved changes 우선 처리

### Modified: `src/workspace/workspace-context.tsx`
- `createFile(relativePath)`, `createDirectory(relativePath)`, `deleteFile(relativePath)`, `deleteDirectory(relativePath)` 액션 추가
- active file 삭제 시 `activeFile=null`, `activeFileContent=null`, `isDirty=false` 초기화

### Modified: `electron/main.ts`
- `handleWorkspaceCreateFile` IPC 핸들러 추가
- `handleWorkspaceCreateDirectory` IPC 핸들러 추가
- `handleWorkspaceDeleteFile` IPC 핸들러 추가
- `handleWorkspaceDeleteDirectory` IPC 핸들러 추가
- `registerIpcHandlers()`에 4개 채널 등록

### Modified: `electron/preload.ts`
- `window.workspace` API에 `createFile`, `createDirectory`, `deleteFile`, `deleteDirectory` 추가

### Modified: `electron/electron-env.d.ts`
- IPC request/response 타입 추가
- `WorkspaceApi` 타입에 4개 메서드 추가

### Modified: `src/App.css`
- 인라인 이름 입력 스타일(`.tree-inline-input`)
- 삭제 confirm dialog 스타일(기존 confirm dialog 패턴 재사용)

---

## IPC 계약 상세

### `workspace:createFile`

- request: `{ rootPath: string, relativePath: string }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace` — workspace 바깥 경로 거부
- 중복 검사: 동일 경로에 파일/디렉토리 이미 존재 시 `ok=false` + `error`
- 동작: 부모 디렉토리 `mkdir -p` + 빈 파일(`writeFile(path, '')`) 생성
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용

### `workspace:createDirectory`

- request: `{ rootPath: string, relativePath: string }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace`
- 중복 검사: 동일 경로에 파일/디렉토리 이미 존재 시 `ok=false` + `error`
- 동작: `mkdir(resolvedPath, { recursive: true })`
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용

### `workspace:deleteFile`

- request: `{ rootPath: string, relativePath: string }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace`
- 존재 확인: `stat` + `isFile()` — 디렉토리면 거부
- 동작: `fs.unlink(resolvedPath)`
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용

### `workspace:deleteDirectory`

- request: `{ rootPath: string, relativePath: string }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace`
- 존재 확인: `stat` + `isDirectory()` — 파일이면 거부
- 동작: `fs.rm(resolvedPath, { recursive: true, force: true })`
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용

---

## Edge Cases

### 1. Active File 삭제
- `activeFile`이 삭제 대상과 동일하면 `activeFile=null`, `activeFileContent=null`, `isDirty=false`로 초기화
- dirty 상태인 경우 unsaved changes confirm dialog를 먼저 표시

### 2. Active File이 삭제된 디렉토리 하위
- 디렉토리 삭제 시 `activeFile`이 해당 디렉토리 하위에 있는지 `relativePath.startsWith(dirPath + '/')` 검사
- 해당하면 Active File 삭제와 동일 처리

### 3. 중복 이름
- IPC 핸들러에서 `stat`으로 존재 확인 후 `EEXIST` 에러 반환
- Renderer에서 에러 배너 표시(5초 auto-dismiss)

### 4. 이름 유효성 검사
- Renderer 단에서 빈 문자열, `/` 포함, `.` 또는 `..` 거부
- 에러 시 인라인 입력에 붉은색 테두리 + 간단한 에러 메시지

### 5. Watcher 자동 갱신
- 생성/삭제 후 watcher가 `add`/`unlink`/`addDir`/`unlinkDir` 이벤트를 감지
- `hasStructureChanges=true` → `loadWorkspaceIndex('refresh')` → 트리 자동 갱신
- 별도의 수동 트리 조작 불필요

### 6. Orphaned Comments
- 삭제된 파일에 달린 코멘트는 `comments.json`에 그대로 유지
- `View Comments`에서 orphaned 코멘트의 target 클릭 시 파일이 없으면 점프 무시(기존 동작)
- MVP에서 orphaned 정리 UI는 제공하지 않음

---

# Part 2: Implementation Plan

## Overview

파일 트리에서 파일/디렉토리 생성 및 삭제 기능 추가. IPC 핸들러 → State 액션 → UI 순서로 bottom-up 구현. 2개 Phase.

## Scope

### In Scope
- IPC 핸들러 4개 (`createFile`, `createDirectory`, `deleteFile`, `deleteDirectory`)
- Preload bridge + 타입 선언 확장
- WorkspaceProvider CRUD 액션
- 파일 트리 컨텍스트 메뉴 확장 (New File / New Directory / Delete)
- 인라인 이름 입력 UI
- 삭제 confirm dialog
- Active file 삭제 edge case 처리
- 이름 유효성 검사 (Renderer 단)

### Out of Scope
- Rename (코멘트 `relativePath` 마이그레이션 복잡도)
- 휴지통 이동 (영구 삭제, MVP)
- Orphaned comments 정리 UI
- 드래그 앤 드롭 이동
- 클립보드 복사/붙여넣기

## Implementation Phases

### Phase 1: IPC + State Layer (병렬 가능)

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | IPC 핸들러 4개 구현 (`createFile`, `createDirectory`, `deleteFile`, `deleteDirectory`) | P0 | - | `electron/main.ts` |
| T2 | Preload bridge 확장 + 타입 선언 | P0 | T1 | `electron/preload.ts`, `electron/electron-env.d.ts` |
| T3 | WorkspaceContext CRUD 액션 추가 | P0 | T2 | `src/workspace/workspace-context.tsx` |
| T4 | IPC 핸들러 단위 테스트 | P1 | T1 | 테스트 |

**Target Files (Phase 1)**:
- `electron/main.ts` — IPC 핸들러 4개 + `registerIpcHandlers` 확장
- `electron/preload.ts` — `workspaceApi` 객체에 4개 메서드 추가
- `electron/electron-env.d.ts` — request/response 타입 + `WorkspaceApi` 확장
- `src/workspace/workspace-context.tsx` — `createFile`, `createDirectory`, `deleteFile`, `deleteDirectory` 액션, context type 확장
- `src/workspace/workspace-model.ts` — active file 삭제 시 상태 초기화 순수 함수 (필요시)

**T1 상세**:

```typescript
// workspace:createFile
async function handleWorkspaceCreateFile(_event, request) {
  // 1. validate rootPath, relativePath
  // 2. isPathInsideWorkspace check
  // 3. stat → EEXIST check
  // 4. beginWorkspaceWriteOperation()
  // 5. mkdir(dirname, { recursive: true }) + writeFile(path, '')
  // 6. endWorkspaceWriteOperation() in finally
  // return { ok: true } or { ok: false, error }
}

// workspace:createDirectory
async function handleWorkspaceCreateDirectory(_event, request) {
  // 1. validate rootPath, relativePath
  // 2. isPathInsideWorkspace check
  // 3. stat → EEXIST check
  // 4. beginWorkspaceWriteOperation()
  // 5. mkdir(path, { recursive: true })
  // 6. endWorkspaceWriteOperation() in finally
  // return { ok: true } or { ok: false, error }
}

// workspace:deleteFile
async function handleWorkspaceDeleteFile(_event, request) {
  // 1. validate rootPath, relativePath
  // 2. isPathInsideWorkspace check
  // 3. stat → isFile check
  // 4. beginWorkspaceWriteOperation()
  // 5. unlink(path)
  // 6. endWorkspaceWriteOperation() in finally
  // return { ok: true } or { ok: false, error }
}

// workspace:deleteDirectory
async function handleWorkspaceDeleteDirectory(_event, request) {
  // 1. validate rootPath, relativePath
  // 2. isPathInsideWorkspace check
  // 3. stat → isDirectory check
  // 4. beginWorkspaceWriteOperation()
  // 5. rm(path, { recursive: true, force: true })
  // 6. endWorkspaceWriteOperation() in finally
  // return { ok: true } or { ok: false, error }
}
```

### Phase 2: UI Layer

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 파일 트리 컨텍스트 메뉴 확장 (New File / New Directory / Delete) | P0 | T3 | `src/file-tree/file-tree-panel.tsx` |
| T6 | 인라인 이름 입력 UI 구현 | P0 | T5 | `src/file-tree/file-tree-panel.tsx`, `src/App.css` |
| T7 | App.tsx에 create/delete 콜백 연결 + confirm dialog | P0 | T3,T5,T6 | `src/App.tsx` |
| T8 | Active file 삭제 edge case 처리 | P0 | T7 | `src/App.tsx`, `workspace-context.tsx` |
| T9 | 빈 영역 우클릭 → root level 생성 | P1 | T6 | `src/file-tree/file-tree-panel.tsx` |
| T10 | 기능 통합 테스트 | P1 | T7 | `src/file-tree/file-tree-panel.test.tsx`, `src/App.test.tsx` |

**Target Files (Phase 2)**:
- `src/file-tree/file-tree-panel.tsx` — 컨텍스트 메뉴 확장, 인라인 입력 UI, 빈 영역 우클릭
- `src/App.tsx` — create/delete 콜백 + confirm dialog + active file 삭제 처리
- `src/App.css` — `.tree-inline-input` 스타일
- `src/file-tree/file-tree-panel.test.tsx` — 컨텍스트 메뉴 액션 + 인라인 입력 테스트
- `src/App.test.tsx` — create/delete 통합 테스트

**T5 상세 — 컨텍스트 메뉴 액션 구성**:

| 클릭 대상 | 액션 목록 |
|-----------|-----------|
| 파일 노드 우클릭 | Copy Relative Path, New File (부모 디렉토리), New Directory (부모 디렉토리), Delete |
| 디렉토리 노드 우클릭 | Copy Relative Path, New File (해당 디렉토리), New Directory (해당 디렉토리), Delete |
| 빈 영역(트리 하단) 우클릭 | New File (root), New Directory (root) |

**T6 상세 — 인라인 입력 UI**:

```typescript
// 상태
type InlineInputState = {
  parentRelativePath: string  // '' = workspace root
  type: 'file' | 'directory'
} | null

// 렌더
// 해당 parentPath의 children 맨 위(또는 맨 아래)에 <input> 삽입
// Enter → validate → onRequestCreateFile/Directory(parentPath + '/' + name)
// Escape → cancel
// blur → cancel (이미 submit되지 않은 경우)
```

**T6 인라인 입력 위치 규칙**:
- 디렉토리에서 "New File/Directory" → 해당 디렉토리 children의 첫 번째 위치에 인라인 입력 삽입
- 해당 디렉토리가 접힌 상태면 자동 확장
- 파일에서 "New File/Directory" → 해당 파일의 부모 디렉토리 children의 첫 번째 위치
- 빈 영역에서 → root level children의 첫 번째 위치

**T7 상세 — Confirm Dialog**:

```
// 파일 삭제
confirm(`Delete file "${fileName}"?\n\nThis action cannot be undone.`)

// 디렉토리 삭제
confirm(`Delete directory "${dirName}" and all its contents?\n\nThis action cannot be undone.`)
```

MVP에서는 `window.confirm()` 사용. 추후 커스텀 모달로 대체 가능.

---

## 검증 체크리스트

- [ ] 파일 우클릭 → New File/New Directory/Delete 액션 표시
- [ ] 디렉토리 우클릭 → New File/New Directory/Delete 액션 표시
- [ ] 빈 영역 우클릭 → New File/New Directory 액션만 표시
- [ ] 인라인 입력 Enter → 파일/디렉토리 생성 + 트리 자동 갱신
- [ ] 인라인 입력 Escape → 취소
- [ ] 생성된 파일 자동 선택(열림)
- [ ] 생성된 디렉토리 자동 확장
- [ ] 파일 삭제 confirm → 삭제 + 트리 갱신
- [ ] 디렉토리 삭제 confirm → 재귀 삭제 + 트리 갱신
- [ ] active file 삭제 → 상태 초기화
- [ ] dirty active file 삭제 → unsaved confirm 먼저
- [ ] active file이 삭제된 디렉토리 하위 → 상태 초기화
- [ ] 중복 이름 → 에러 배너
- [ ] 빈 이름 / `/` 포함 / `.` `..` → 인라인 에러
- [ ] workspace 경계 외 경로 → 거부
