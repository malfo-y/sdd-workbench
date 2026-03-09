# Feature Draft: F25b — 파일/디렉토리 Rename (코멘트 보호 방식)

## Context

F25에서 파일/디렉토리 생성·삭제가 구현되었으나, rename은 코멘트 `relativePath` 마이그레이션 복잡도 때문에 제외되었다. 본 피처에서는 **코멘트가 있는 파일/디렉토리의 rename을 차단**하는 방식으로 복잡도를 제거하고, rename 기능을 추가한다.

### 핵심 설계 결정

> **코멘트가 있는 대상은 rename 불가.** rename 시도 시 "코멘트가 있는 파일은 이름을 변경할 수 없습니다. 먼저 코멘트를 삭제해 주세요." 메시지를 표시하고 거부한다.

이 제약으로 인해:
- `comments.json`의 `relativePath` 마이그레이션 로직이 **완전히 불필요**
- IPC 핸들러는 단순 `fs.rename()` + 경계 검사만 수행
- 코멘트 검사는 Renderer(State Layer)에서 IPC 호출 전에 수행

### 기존 인프라 활용

- **F25 CRUD 패턴**: IPC 핸들러, preload bridge, 타입 선언의 동일 패턴 재사용
- **Watcher `structureChanged` 플래그**: rename 후 `unlink(old)` + `add(new)` 이벤트로 트리 자동 갱신
- **인라인 입력 UI**: F25의 `InlineInputState` + validation 로직을 rename 모드로 확장
- **`CopyActionPopover`**: 컨텍스트 메뉴에 "Rename" 액션 추가

---

## Part 1: Spec Patch Draft

# Spec Update Input

**Date**: 2026-02-25
**Author**: user + Claude
**Target Spec**: `_sdd/spec/main.md` 및 하위 문서

## New Features

### Feature: F25b 파일/디렉토리 Rename (코멘트 보호 방식)
**Priority**: Medium
**Category**: Core Feature
**Target Component**: `src/file-tree/*`, `electron/main.ts`, App Shell
**Target Section**: `component-map.md` > `1.3 File Tree Layer`, `contract-map.md` > `3. IPC 계약`

**Description**:
파일 트리에서 파일/디렉토리 이름 변경을 지원한다. 우클릭 컨텍스트 메뉴에 "Rename" 액션을 추가하고, 인라인 입력을 통해 새 이름을 받으며, IPC를 통해 `fs.rename`을 수행한다. 코멘트 `relativePath` 마이그레이션 복잡도를 회피하기 위해, 코멘트가 달린 파일(또는 하위에 코멘트가 있는 디렉토리)은 rename을 거부한다.

**Acceptance Criteria**:
- [ ] 파일/디렉토리 우클릭 시 "Rename" 액션이 컨텍스트 메뉴에 표시
- [ ] "Rename" 선택 시 해당 노드 위치에 인라인 입력이 현재 이름으로 pre-fill되어 표시
- [ ] 인라인 입력에서 Enter로 확정, Escape로 취소
- [ ] 같은 이름 입력 시 아무 작업 없이 취소 처리
- [ ] 코멘트가 있는 파일 rename 시도 시 에러 메시지 표시 후 거부
- [ ] 하위에 코멘트가 있는 디렉토리 rename 시도 시 에러 메시지 표시 후 거부
- [ ] rename 성공 후 watcher가 트리를 자동 갱신
- [ ] active file rename 시 activeFile 경로가 새 경로로 갱신
- [ ] active file이 rename된 디렉토리 하위에 있을 때 activeFile 경로 갱신
- [ ] dirty active file rename 시 unsaved changes confirm 먼저 표시
- [ ] 중복 이름(대상 경로에 이미 파일/디렉토리 존재) 시 에러 표시
- [ ] workspace 경계 외 경로 rename 거부
- [ ] 빈 영역 우클릭 시에는 "Rename" 미표시

**Technical Notes**:
- `workspace:rename` IPC 1개 추가 (파일/디렉토리 공용, `fs.rename`은 둘 다 처리)
- 코멘트 검사: Renderer에서 `comments` 배열을 `relativePath` 기준으로 매칭
- 디렉토리 코멘트 검사: `comments.some(c => c.relativePath.startsWith(dirPath + '/'))`
- rename 후 activeFile 경로 갱신은 State Layer에서 처리

**Dependencies**: F25 (파일 트리 CRUD)

---

## IPC 계약 상세

### `workspace:rename`

- request: `{ rootPath: string, oldRelativePath: string, newRelativePath: string }`
- response: `{ ok: boolean, error?: string }`
- 경로 검증: `isPathInsideWorkspace` — old/new 모두 workspace 바깥 경로 거부
- 존재 검사: old path `stat` — 존재하지 않으면 `ok=false`
- 충돌 검사: new path `stat` — 이미 존재하면 `ok=false` + `error: 'already exists'`
- 동작: `fs.rename(resolvedOldPath, resolvedNewPath)`
- 부모 디렉토리: new path의 부모 디렉토리가 없으면 `mkdir -p`로 생성 (이름 변경 + 위치 이동 동시 지원)
- `beginWorkspaceWriteOperation()` / `endWorkspaceWriteOperation()` 적용
- **코멘트 검사는 IPC에서 하지 않음** — Renderer 단에서 IPC 호출 전에 수행

---

## Component Changes

### Modified: `electron/main.ts`
- `handleWorkspaceRename` IPC 핸들러 추가
- `registerIpcHandlers()`에 `workspace:rename` 채널 등록

### Modified: `electron/preload.ts`
- `workspaceApi`에 `rename(rootPath, oldRelativePath, newRelativePath)` 메서드 추가

### Modified: `electron/electron-env.d.ts`
- `WorkspaceRenameResult` 타입 추가: `{ ok: boolean, error?: string }`
- `Window.workspace`에 `rename` 메서드 시그니처 추가

### Modified: `src/file-tree/file-tree-panel.tsx`
- 컨텍스트 메뉴에 "Rename" 액션 추가
- `InlineInputState` 확장: `type: 'file' | 'directory' | 'rename'`
- rename 모드: 현재 이름으로 pre-fill, 같은 디렉토리 내에서 이름만 변경
- rename 전용 prop 추가: `onRequestRename?: (oldRelativePath: string, newRelativePath: string) => void`

### Modified: `src/workspace/workspace-context.tsx`
- `renameFileOrDirectory(oldRelativePath, newRelativePath)` 액션 추가
- 코멘트 보호 검사: `comments` 배열에서 해당 경로 매칭
- IPC 호출 + 성공 시 activeFile 경로 갱신
- context type에 `renameFileOrDirectory` 추가

### Modified: `src/App.tsx`
- `FileTreePanel`에 `onRequestRename` 콜백 연결

### Modified: `src/App.css`
- rename 인라인 입력 스타일은 기존 `.tree-inline-input` 재사용

---

## Edge Cases

### 1. 코멘트 보호
- 파일 rename: `comments.some(c => c.relativePath === oldRelativePath)` → 있으면 거부
- 디렉토리 rename: `comments.some(c => c.relativePath === oldRelativePath + '/' || c.relativePath.startsWith(oldRelativePath + '/'))` → 있으면 거부
- 거부 메시지: `"코멘트가 있는 파일/디렉토리는 이름을 변경할 수 없습니다. 먼저 코멘트를 삭제해 주세요."`
- 이 검사는 **Renderer에서 IPC 호출 전에** 수행 (네트워크 불필요)

### 2. Active File Rename
- `activeFile === oldRelativePath` → `activeFile = newRelativePath`로 갱신
- 파일 내용 재로드 불필요 (경로만 변경, 내용 동일)
- `isDirty` 상태 유지 (rename은 내용 변경 아님)

### 3. Active File이 Rename된 디렉토리 하위
- `activeFile.startsWith(oldRelativePath + '/')` 검사
- 해당하면 activeFile 경로의 prefix를 `newRelativePath`로 치환:
  `activeFile = newRelativePath + activeFile.slice(oldRelativePath.length)`

### 4. Dirty Active File Rename
- dirty 상태에서 rename 시도 → unsaved changes confirm 표시
  - 저장 후 rename 또는 변경사항 버리고 rename
  - 또는: rename 자체는 파일 내용에 영향 없으므로 dirty 상태 그대로 rename 허용 후 새 경로로 save 가능하게 할 수도 있음
- **MVP 결정**: dirty 상태에서 rename 시도 시 "저장하지 않은 변경사항이 있습니다. 저장 후 다시 시도해 주세요." 표시하고 거부 (가장 안전)

### 5. 같은 이름 입력
- 새 이름 === 기존 이름 → 아무 작업 없이 인라인 입력 닫기

### 6. 중복 이름 (대상 경로에 이미 존재)
- IPC에서 `stat(newPath)` 성공 시 `{ ok: false, error: 'already exists' }` 반환
- Renderer에서 에러 배너 표시

### 7. Watcher 이벤트
- `fs.rename()`은 플랫폼에 따라 `unlink(old)` + `add(new)` 또는 `rename` 이벤트 발생
- chokidar는 rename을 `unlink` + `add`로 분리 처리하는 것이 일반적
- 두 경우 모두 `structureChanged=true`가 설정되어 트리 자동 갱신

### 8. 이름 유효성 검사
- 기존 F25 validation 재사용: 빈 문자열, `/` 포함, `.` 또는 `..` 거부
- rename은 파일명만 변경 (경로 이동 아님): `dirname(oldPath) + '/' + newName`

---

# Part 2: Implementation Plan

## Overview

파일/디렉토리 rename 기능 추가. 코멘트 보호 정책으로 코멘트 마이그레이션을 회피. IPC 핸들러 → State Layer → UI 순서로 bottom-up 구현. 1 Phase.

## Scope

### In Scope
- `workspace:rename` IPC 핸들러 (파일/디렉토리 공용)
- Preload bridge + 타입 선언 확장
- WorkspaceContext rename 액션 (코멘트 보호 검사 포함)
- 컨텍스트 메뉴 "Rename" 추가
- 인라인 입력 rename 모드 (현재 이름 pre-fill)
- Active file 경로 갱신
- Dirty file rename 거부

### Out of Scope
- 코멘트 `relativePath` 마이그레이션 (코멘트 보호로 회피)
- 드래그 앤 드롭 이동
- 다른 디렉토리로 이동 (이름 변경만)

## Implementation Tasks

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | `workspace:rename` IPC 핸들러 구현 | P0 | - | `electron/main.ts` |
| T2 | Preload bridge + 타입 선언 | P0 | T1 | `electron/preload.ts`, `electron/electron-env.d.ts` |
| T3 | WorkspaceContext rename 액션 (코멘트 보호 + activeFile 갱신) | P0 | T2 | `src/workspace/workspace-context.tsx` |
| T4 | 컨텍스트 메뉴 "Rename" + 인라인 입력 rename 모드 | P0 | T3 | `src/file-tree/file-tree-panel.tsx` |
| T5 | App.tsx 콜백 연결 | P0 | T3,T4 | `src/App.tsx` |
| T6 | 테스트 추가 | P1 | T4,T5 | `*.test.tsx` |

**Target Files**:
- `electron/main.ts` — IPC 핸들러 + `registerIpcHandlers` 확장
- `electron/preload.ts` — `workspaceApi.rename()` 추가
- `electron/electron-env.d.ts` — `WorkspaceRenameResult` + 메서드 시그니처
- `src/workspace/workspace-context.tsx` — `renameFileOrDirectory` 액션, 코멘트 검사, activeFile 갱신
- `src/file-tree/file-tree-panel.tsx` — 메뉴 "Rename" + 인라인 rename 모드
- `src/App.tsx` — `onRequestRename` 콜백 연결
- `src/file-tree/file-tree-panel.test.tsx` — rename UI 테스트
- `src/App.test.tsx` — rename 통합 테스트 (mock)

### T1 상세 — IPC 핸들러

```typescript
type WorkspaceRenameRequest = {
  rootPath: string
  oldRelativePath: string
  newRelativePath: string
}

async function handleWorkspaceRename(_event, request) {
  // 1. validate rootPath, oldRelativePath, newRelativePath
  // 2. isPathInsideWorkspace — old, new 모두 검증
  // 3. stat(oldPath) — 존재하지 않으면 ok=false
  // 4. stat(newPath) — 이미 존재하면 ok=false, error='already exists'
  // 5. mkdir(dirname(newPath), { recursive: true }) — 부모 디렉토리 보장
  // 6. beginWorkspaceWriteOperation()
  // 7. fs.rename(oldPath, newPath)
  // 8. endWorkspaceWriteOperation() in finally
  // return { ok: true } or { ok: false, error }
}
```

### T3 상세 — 코멘트 보호 검사

```typescript
function renameFileOrDirectory(oldRelativePath: string, newRelativePath: string) {
  const ws = getActiveWorkspace()

  // 1. 코멘트 보호 검사
  const hasComments = ws.comments.some(c =>
    c.relativePath === oldRelativePath ||
    c.relativePath.startsWith(oldRelativePath + '/')
  )
  if (hasComments) {
    showBanner('코멘트가 있는 파일/디렉토리는 이름을 변경할 수 없습니다.')
    return false
  }

  // 2. dirty 상태 검사
  if (ws.activeFile === oldRelativePath && ws.isDirty) {
    showBanner('저장하지 않은 변경사항이 있습니다. 저장 후 다시 시도해 주세요.')
    return false
  }

  // 3. IPC 호출
  const result = await window.workspace.rename(rootPath, oldRelativePath, newRelativePath)
  if (!result.ok) { showBanner(result.error); return false }

  // 4. activeFile 경로 갱신
  if (ws.activeFile === oldRelativePath) {
    // 파일 직접 rename
    updateActiveFile(newRelativePath)
  } else if (ws.activeFile?.startsWith(oldRelativePath + '/')) {
    // 디렉토리 rename → 하위 active file 경로 치환
    updateActiveFile(newRelativePath + ws.activeFile.slice(oldRelativePath.length))
  }

  return true
}
```

### T4 상세 — 인라인 Rename 모드

```typescript
// InlineInputState 확장
type InlineInputState = {
  parentRelativePath: string
  type: 'file' | 'directory' | 'rename-file' | 'rename-directory'
  originalRelativePath?: string  // rename 시 기존 전체 경로
  originalName?: string          // rename 시 기존 파일/디렉토리명 (pre-fill용)
} | null

// Rename 시작: 컨텍스트 메뉴 "Rename" 클릭
// → inlineInput = { parentRelativePath: dirname, type: 'rename-file', originalRelativePath, originalName: basename }
// → 해당 노드 위치의 label이 <input>으로 교체, defaultValue = originalName
// Enter → newName !== originalName이면 onRequestRename(originalPath, dirname + '/' + newName)
// Escape → cancel
```

---

## 검증 체크리스트

- [ ] 파일 우클릭 → "Rename" 액션 표시
- [ ] 디렉토리 우클릭 → "Rename" 액션 표시
- [ ] 빈 영역 우클릭 → "Rename" 미표시
- [ ] "Rename" → 인라인 입력에 현재 이름 pre-fill
- [ ] Enter → rename 성공 + 트리 자동 갱신
- [ ] Escape → 취소
- [ ] 같은 이름 입력 → 무시(취소)
- [ ] 코멘트가 있는 파일 rename → 에러 메시지, 거부
- [ ] 하위 코멘트가 있는 디렉토리 rename → 에러 메시지, 거부
- [ ] active file rename → 경로 갱신, 내용 유지
- [ ] active file in renamed dir → 경로 prefix 치환
- [ ] dirty file rename → 거부 메시지
- [ ] 중복 이름 → IPC 에러 → 에러 배너
- [ ] 이름 유효성 검사 (빈 문자열, `/`, `.`, `..`)
- [ ] workspace 경계 외 경로 → 거부
- [ ] `npm test` 통과
- [ ] `npm run build` 통과
