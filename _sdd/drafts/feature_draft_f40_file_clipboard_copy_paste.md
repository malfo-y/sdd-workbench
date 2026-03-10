# Feature Draft: F40 파일 클립보드 복사/붙여넣기

> **Date**: 2026-03-11
> **Source**: `_sdd/discussion/discussion_file_clipboard_copy_paste.md`, `_sdd/drafts/clipboard-file-copy-paste-research.md`

---

<!-- spec-update-todo-input-start -->

# Part 1: Spec Patch Draft

> This patch can be copy-pasted into the corresponding spec section,
> or used as input for the `spec-update-todo` skill.

# Spec Update Input

**Date**: 2026-03-11
**Author**: user
**Target Spec**: `_sdd/spec/sdd-workbench/`

## New Features

### Feature: F40 파일 클립보드 복사/붙여넣기

**Priority**: High
**Category**: File Management
**Target Component**: File Tree, Workspace Backend, Main Process
**Target Section**: `_sdd/spec/main.md` > `Goal > Key Features`

**Description**:
파일 트리에서 파일/디렉토리를 복사(Cmd+C)하고 붙여넣기(Cmd+V)할 수 있는 기능. 2-Phase로 구현한다:
- **Phase 1**: 앱 내부 클립보드 기반 Copy/Paste (로컬 + 원격 워크스페이스)
- **Phase 2**: Finder→앱 읽기 전용 Interop (로컬 워크스페이스 전용)

Cut(잘라내기) 기능은 범위 밖이다. 앱→Finder 쓰기(양방향)도 범위 밖이다.

**Acceptance Criteria**:
- [ ] 파일 트리에서 파일/디렉토리 선택 후 Cmd+C → Cmd+V로 복사 가능
- [ ] 컨텍스트 메뉴에 Copy / Paste 항목 표시
- [ ] 포커스 기반 단축키 분기: 파일 트리 포커스 시 Cmd+C=파일 복사, 에디터 포커스 시 Cmd+C=텍스트 복사
- [ ] 같은 디렉토리에 붙여넣기 시 이름 충돌 자동 해결 (예: `file (1).txt`)
- [ ] 로컬/원격 워크스페이스 모두에서 내부 Copy/Paste 동작
- [ ] (Phase 2) Finder에서 Cmd+C한 파일을 앱 내 로컬 워크스페이스에 Cmd+V로 붙여넣기 가능
- [ ] (Phase 2) 원격 워크스페이스에서 Finder 붙여넣기 시도 시 unsupported 배너 표시

**Technical Notes**:
- 내부 클립보드는 main process에서 `{ operation: 'copy', paths: string[] }` 상태로 관리
- 파일 복사 연산은 `WorkspaceBackend` 인터페이스에 `copyEntries` 메서드 추가
- Finder interop은 `clipboard.readBuffer('NSFilenamesPboardType')` + `bplist-parser`로 구현
- VS Code 패턴 참조: 포커스 기반 단축키 분기, `incrementFileName()` 이름 충돌 해결

**Dependencies**:
- Phase 2: `bplist-parser` npm 패키지 (devDependencies가 아닌 dependencies)

---

## Component Changes

### Modified Component: WorkspaceBackend

**Target Section**: `_sdd/spec/sdd-workbench/contracts/ipc-contracts.md` > IPC 채널
**Change Type**: 메서드/채널 추가

**추가 IPC 채널**:

| 채널 | 방향 | 요청 | 응답 | 설명 |
|------|------|------|------|------|
| `workspace:copyEntries` | R→M | `{ rootPath, entries: { relativePath, kind }[] , destDir }` | `{ ok, copiedPaths?, error? }` | 파일/디렉토리 복사 수행 |
| `workspace:readFileClipboard` | R→M | `{ rootPath }` | `{ ok, paths?, source: 'internal'\|'finder' }` | 현재 클립보드 상태 조회 |
| `workspace:setFileClipboard` | R→M | `{ paths: string[], operation: 'copy' }` | `{ ok }` | 내부 클립보드에 경로 저장 |
| `workspace:pasteFromClipboard` | R→M | `{ rootPath, destDir, isRemote }` | `{ ok, pastedPaths?, error? }` | 클립보드 → 대상 디렉토리에 붙여넣기 |

**추가 Backend 메서드**:
- `copyEntries(request: { rootPath: string; entries: { relativePath: string; kind: 'file' \| 'directory' }[]; destDir: string }): Promise<{ ok: boolean; copiedPaths?: string[]; error?: string }>`

### Modified Component: File Tree Panel

**Target Section**: `_sdd/spec/sdd-workbench/domains/workspace-and-file-tree.md`
**Change Type**: UI 기능 추가

**변경 내용**:
- 컨텍스트 메뉴에 "Copy" / "Paste" 액션 추가
- 파일 트리 패널에 `onKeyDown` 핸들러 추가 (Cmd+C, Cmd+V)
- 붙여넣기 대상 디렉토리: 선택된 노드가 파일이면 부모 디렉토리, 디렉토리이면 해당 디렉토리

### Modified Component: Remote Agent

**Target Section**: `_sdd/spec/sdd-workbench/domains/remote-workspace.md`
**Change Type**: RPC 확장

**변경 내용**:
- `request-router.ts`에 `workspace.copyEntries` 라우트 추가
- `workspace-ops.ts`에 `workspaceCopyEntries` 함수 추가 (Node.js `fs.cp` 기반)

---

## Configuration Changes

### New Config: `bplist-parser` 의존성 (Phase 2)

**Target Section**: `_sdd/spec/main.md` > `Environment & Dependencies`
**Type**: npm dependency
**Required**: Phase 2에서만 필요
**Default**: N/A
**Description**: macOS Finder 클립보드의 binary plist 형식 디코딩용 패키지

---

## Notes

### Context
- VS Code도 Finder interop은 지원하지 않음. 읽기 전용 interop만으로도 차별화 가치 있음.
- Cut 기능은 데이터 유실 리스크가 높아 의도적으로 제외함.

### Constraints
- Finder interop은 macOS 전용 (`NSFilenamesPboardType`)
- 원격 워크스페이스에서 Finder 붙여넣기는 지원하지 않음 (로컬 경로 → 원격 전송 복잡도)
- `clipboard.write()`는 파일 속성을 지원하지 않으므로 `readBuffer`/`writeBuffer` 사용 필수

### Open Questions (from Discussion)
- [ ] 이름 충돌 처리: `file (1).txt` 자동 넘버링 vs 사용자 확인 다이얼로그 → **자동 넘버링 권장** (VS Code 패턴)
- [ ] 디렉토리 복사 시 재귀 깊이 제한/대형 디렉토리 경고 정책
- [ ] `bplist-parser` 의존성 추가 vs 직접 구현 (패키지 크기 영향)

<!-- spec-update-todo-input-end -->

---

# Part 2: Implementation Plan

## Overview

파일 트리에서 파일/디렉토리를 복사·붙여넣기하는 기능을 2-Phase로 구현한다.
Phase 1은 앱 내부 클립보드 기반, Phase 2는 Finder→앱 읽기 전용 interop이다.

## Scope

### In Scope
- 앱 내부 클립보드 Copy/Paste (로컬 + 원격)
- Finder→앱 파일 붙여넣기 (로컬 워크스페이스 전용, Phase 2)
- 이름 충돌 자동 해결 (`incrementFileName`)
- 포커스 기반 Cmd+C/V 단축키 분기
- 컨텍스트 메뉴 Copy/Paste 항목

### Out of Scope
- Cut(잘라내기) 기능
- 앱→Finder 쓰기 (양방향 interop)
- Cross-workspace 복사 (워크스페이스 A → 워크스페이스 B)
- Drag & Drop 파일 복사

## Components

1. **FileClipboardService** (Main Process): 내부 클립보드 상태 관리 + Finder 클립보드 읽기
2. **WorkspaceBackend.copyEntries**: 파일/디렉토리 복사 연산 (local: `fs.cp`, remote: agent RPC)
3. **incrementFileName**: 이름 충돌 해결 유틸리티
4. **File Tree UI**: 컨텍스트 메뉴 + 키보드 단축키 + Paste 동작 연결

## Implementation Phases

### Phase 1: 앱 내부 클립보드 Copy/Paste

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | incrementFileName 유틸리티 | P0 | - | Shared Utility |
| T2 | WorkspaceBackend copyEntries 인터페이스 + 로컬 구현 | P0 | T1 | Backend |
| T3 | Remote Agent copyEntries RPC | P0 | T1 | Remote Agent |
| T4 | Main Process 클립보드 상태 + IPC 핸들러 | P0 | T2 | Main Process |
| T5 | Preload API + 타입 선언 | P0 | T4 | Bridge |
| T6 | File Tree Copy/Paste UI (컨텍스트 메뉴 + 키보드) | P0 | T5 | Renderer |
| T7 | Phase 1 통합 테스트 | P1 | T6 | Test |

### Phase 2: Finder→앱 Interop

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T8 | bplist-parser 의존성 + Finder 클립보드 읽기 | P0 | T4 | Main Process |
| T9 | pasteFromClipboard에 Finder 소스 통합 | P0 | T8 | Main Process |
| T10 | 원격 워크스페이스 Finder paste 차단 + unsupported 배너 | P1 | T9 | Renderer |

## Task Details

### Task 1: incrementFileName 유틸리티

**Component**: Shared Utility
**Priority**: P0-Critical
**Type**: Feature

**Description**:
이름 충돌 시 자동 넘버링 로직. `file.txt` → `file (1).txt`, `file (1).txt` → `file (2).txt`.
디렉토리도 동일 패턴 적용. 대상 디렉토리의 기존 항목 목록을 받아 충돌 없는 이름을 반환한다.

**Acceptance Criteria**:
- [ ] `incrementFileName('file.txt', ['file.txt'])` → `'file (1).txt'`
- [ ] `incrementFileName('file.txt', ['file.txt', 'file (1).txt'])` → `'file (2).txt'`
- [ ] `incrementFileName('dir', ['dir'])` → `'dir (1)'` (확장자 없는 경우)
- [ ] 단위 테스트 100% 커버리지

**Target Files**:
- [C] `src/file-tree/increment-file-name.ts` -- 유틸리티 함수
- [C] `src/file-tree/increment-file-name.test.ts` -- 단위 테스트

**Technical Notes**:
- VS Code의 `incrementFileName()` 패턴 참조
- 확장자 앞에 ` (N)` 삽입, 확장자 없으면 끝에 ` (N)` 추가
- 정규식으로 기존 넘버링 패턴 감지: `/ \((\d+)\)$/`, `/ \((\d+)\)(?=\.[^.]+$)/`

**Dependencies**: 없음

---

### Task 2: WorkspaceBackend copyEntries 인터페이스 + 로컬 구현

**Component**: Backend
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`WorkspaceBackend` 인터페이스에 `copyEntries` 메서드를 추가하고, 로컬 백엔드에서 `fs.cp`로 구현한다.
이름 충돌 시 `incrementFileName`으로 대상 경로를 조정한다.

**Acceptance Criteria**:
- [ ] `WorkspaceBackend` 인터페이스에 `copyEntries` 메서드 추가
- [ ] 로컬 백엔드: 파일 복사 (`fs.cp`)
- [ ] 로컬 백엔드: 디렉토리 재귀 복사 (`fs.cp` with `recursive: true`)
- [ ] 이름 충돌 시 자동 넘버링 적용
- [ ] 존재하지 않는 소스 경로에 대한 에러 처리
- [ ] 단위 테스트

**Target Files**:
- [M] `electron/workspace-backend/types.ts` -- copyEntries 인터페이스 추가
- [M] `electron/workspace-backend/local-workspace-backend.ts` -- 로컬 구현
- [C] `electron/workspace-backend/copy-entries.ts` -- copyEntries 로직 (fs.cp + incrementFileName)
- [C] `electron/workspace-backend/copy-entries.test.ts` -- 단위 테스트

**Technical Notes**:
- `fs.cp(src, dest, { recursive: true })` (Node.js 16.7+, Electron 30에서 사용 가능)
- 대상 디렉토리의 기존 항목 목록 조회 후 `incrementFileName`으로 중복 해결
- 여러 항목 복사 시 순차 처리 (원자성보다 안정성 우선)
- `incrementFileName`은 `src/file-tree/` 경로에 있으므로, electron에서 import하려면 경로 수정 필요. 대안: `electron/workspace-backend/copy-entries.ts` 내에서 자체 구현하거나, 공유 유틸리티 위치 조정

**Dependencies**: T1

---

### Task 3: Remote Agent copyEntries RPC

**Component**: Remote Agent
**Priority**: P0-Critical
**Type**: Feature

**Description**:
원격 에이전트에 `workspace.copyEntries` RPC를 추가하여, 원격 워크스페이스에서도 파일/디렉토리 복사가 가능하게 한다.

**Acceptance Criteria**:
- [ ] `request-router.ts`에 `workspace.copyEntries` 라우트 등록
- [ ] `workspace-ops.ts`에 `workspaceCopyEntries` 함수 구현
- [ ] `remote-workspace-backend.ts`에서 `copyEntries` 위임
- [ ] 단위 테스트

**Target Files**:
- [M] `electron/remote-agent/runtime/request-router.ts` -- 라우트 추가
- [C] `electron/remote-agent/runtime/copy-ops.ts` -- copyEntries + incrementFileName 구현
- [C] `electron/remote-agent/runtime/copy-ops.test.ts` -- 단위 테스트
- [M] `electron/workspace-backend/remote-workspace-backend.ts` -- copyEntries 위임

**Technical Notes**:
- 기존 `workspace-ops.ts` 패턴 참조: `workspaceCreateFile`, `workspaceDeleteFile` 등
- remote agent runtime은 별도 번들이므로 `incrementFileName`을 runtime 내 자체 구현
- `fs.cpSync(src, dest, { recursive: true })` 사용 (runtime은 동기 패턴)

**Dependencies**: T1

---

### Task 4: Main Process 클립보드 상태 + IPC 핸들러

**Component**: Main Process
**Priority**: P0-Critical
**Type**: Feature

**Description**:
Main process에 파일 클립보드 상태를 관리하고, IPC 핸들러 4개를 등록한다:
- `workspace:setFileClipboard` — 내부 클립보드에 경로 저장
- `workspace:readFileClipboard` — 클립보드 상태 조회
- `workspace:copyEntries` — 백엔드 라우터 위임
- `workspace:pasteFromClipboard` — 클립보드에서 읽어 copyEntries 호출

**Acceptance Criteria**:
- [ ] 클립보드 상태: `{ operation: 'copy', paths: string[], rootPath: string } | null`
- [ ] 4개 IPC 핸들러 등록
- [ ] `pasteFromClipboard`: 내부 클립보드 → `copyEntries` 호출 → 결과 반환
- [ ] 워크스페이스 전환 시 클립보드 유지 (전역 상태)
- [ ] 단위 테스트

**Target Files**:
- [C] `electron/file-clipboard.ts` -- 클립보드 상태 관리 + IPC 핸들러 등록 함수
- [C] `electron/file-clipboard.test.ts` -- 단위 테스트
- [M] `electron/main.ts` -- `registerFileClipboardHandlers()` 호출 추가

**Technical Notes**:
- 기존 `main.ts`의 `ipcMain.handle` 패턴 따르되, 클립보드 전용 모듈로 분리
- `pasteFromClipboard` 내부에서 `backendRouter.copyEntries()` 호출
- Phase 2에서 Finder 소스 읽기를 이 모듈에 추가할 예정

**Dependencies**: T2

---

### Task 5: Preload API + 타입 선언

**Component**: Bridge
**Priority**: P0-Critical
**Type**: Feature

**Description**:
`preload.ts`에 파일 클립보드 IPC 채널 4개를 노출하고, `electron-env.d.ts`에 타입 선언을 추가한다.

**Acceptance Criteria**:
- [ ] `window.workspace.setFileClipboard(paths, rootPath)` 노출
- [ ] `window.workspace.readFileClipboard(rootPath)` 노출
- [ ] `window.workspace.copyEntries(rootPath, entries, destDir)` 노출
- [ ] `window.workspace.pasteFromClipboard(rootPath, destDir, isRemote)` 노출
- [ ] TypeScript 타입 선언 완비

**Target Files**:
- [M] `electron/preload.ts` -- 4개 IPC 채널 노출
- [M] `electron/electron-env.d.ts` -- 타입 선언 추가

**Technical Notes**:
- 기존 패턴: `ipcRenderer.invoke('workspace:methodName', payload)` + `as Promise<ResultType>`
- 파라미터는 단일 객체로 전달하는 기존 패턴 유지

**Dependencies**: T4

---

### Task 6: File Tree Copy/Paste UI (컨텍스트 메뉴 + 키보드)

**Component**: Renderer
**Priority**: P0-Critical
**Type**: Feature

**Description**:
파일 트리 패널에 Copy/Paste 기능을 추가한다:
- 컨텍스트 메뉴에 "Copy" / "Paste" 항목
- 파일 트리 포커스 시 Cmd+C / Cmd+V 키보드 단축키
- Paste 대상 디렉토리 결정 로직

**Acceptance Criteria**:
- [ ] 컨텍스트 메뉴에 "Copy" 항목 (파일/디렉토리 선택 시)
- [ ] 컨텍스트 메뉴에 "Paste" 항목 (클립보드에 파일이 있을 때)
- [ ] Cmd+C: 선택된 파일/디렉토리를 클립보드에 복사
- [ ] Cmd+V: 클립보드 내용을 현재 위치에 붙여넣기
- [ ] Paste 후 파일 트리 자동 새로고침
- [ ] 에러 시 배너 메시지 표시
- [ ] 파일 트리에 포커스가 없으면 기본 텍스트 복사 동작 유지

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- 컨텍스트 메뉴 항목 + onKeyDown 핸들러 추가
- [M] `src/file-tree/file-tree-panel.test.tsx` -- UI 테스트 추가

**Technical Notes**:
- 기존 `contextMenuActions` 배열에 Copy/Paste 항목 추가
- `onKeyDown` 핸들러: 파일 트리 `<section>` 요소에 `tabIndex={0}` + `onKeyDown` 추가
- 포커스 감지: `document.activeElement`가 파일 트리 패널 내부인지 확인
- Paste 대상: `contextMenuState.nodeKind === 'file'`이면 부모 디렉토리, `'directory'`면 해당 디렉토리
- 키보드 Paste 시: 현재 선택 파일의 부모 디렉토리 또는 루트
- Paste 완료 후 `onRequestLoadDirectory`로 트리 갱신

**Dependencies**: T5

---

### Task 7: Phase 1 통합 테스트

**Component**: Test
**Priority**: P1-High
**Type**: Test

**Description**:
Phase 1 전체 플로우를 검증하는 통합 테스트. Backend router를 통한 copyEntries, 클립보드 상태 관리, UI 인터랙션을 종합 테스트한다.

**Acceptance Criteria**:
- [ ] backend-router에서 copyEntries 라우팅 테스트
- [ ] 클립보드 set → read → paste 플로우 테스트
- [ ] 이름 충돌 해결 시나리오 테스트
- [ ] 에러 케이스 (존재하지 않는 소스, 권한 오류) 테스트

**Target Files**:
- [M] `electron/workspace-backend/backend-router.test.ts` -- copyEntries 라우팅 테스트 추가
- [M] `electron/workspace-backend/backend-integration.test.ts` -- 통합 시나리오 추가

**Technical Notes**:
- 기존 `backend-router.test.ts` 패턴 참조
- 실제 파일 시스템 사용하는 통합 테스트는 `tmp` 디렉토리 활용

**Dependencies**: T6

---

### Task 8: bplist-parser 의존성 + Finder 클립보드 읽기

**Component**: Main Process
**Priority**: P0-Critical (Phase 2)
**Type**: Feature

**Description**:
`bplist-parser` 패키지를 설치하고, Finder에서 복사한 파일의 클립보드 데이터를 읽는 함수를 구현한다.

**Acceptance Criteria**:
- [ ] `bplist-parser` 패키지 설치 (dependencies)
- [ ] `readFinderClipboardFiles(): string[] | null` 함수 구현
- [ ] `clipboard.availableFormats()`에서 `NSFilenamesPboardType` 확인
- [ ] `clipboard.readBuffer()` + `bplist-parser.parseBuffer()` 조합
- [ ] 단위 테스트 (mock clipboard)

**Target Files**:
- [M] `package.json` -- bplist-parser 의존성 추가
- [M] `electron/file-clipboard.ts` -- readFinderClipboardFiles 함수 추가
- [M] `electron/file-clipboard.test.ts` -- Finder 클립보드 읽기 테스트 추가

**Technical Notes**:
- `clipboard` import는 main process에서만 가능 (preload 아님)
- `bplist-parser`의 `parseBuffer`는 `[string[]]` 형태 반환
- 에러 시 `null` 반환 (graceful degradation)

**Dependencies**: T4

---

### Task 9: pasteFromClipboard에 Finder 소스 통합

**Component**: Main Process
**Priority**: P0-Critical (Phase 2)
**Type**: Feature

**Description**:
`pasteFromClipboard` 핸들러를 확장하여 Finder 클립보드 소스를 우선 확인하고, Finder 파일이 있으면 해당 파일을 대상 디렉토리에 복사한다.

**Acceptance Criteria**:
- [ ] Paste 시 Finder 클립보드 우선 확인 (로컬 워크스페이스인 경우만)
- [ ] Finder 파일 → 대상 디렉토리 복사 (`fs.cp`)
- [ ] 이름 충돌 자동 해결
- [ ] Finder 소스가 없으면 내부 클립보드 fallback
- [ ] 단위 테스트

**Target Files**:
- [M] `electron/file-clipboard.ts` -- pasteFromClipboard 확장
- [M] `electron/file-clipboard.test.ts` -- Finder→local paste 테스트

**Technical Notes**:
- `isRemote === false`일 때만 Finder 클립보드 확인
- Finder 경로는 절대 경로이므로 `fs.cp(absoluteSrc, path.join(rootPath, destDir, basename))` 패턴
- 반환 결과에 `source: 'finder' | 'internal'` 구분 포함

**Dependencies**: T8

---

### Task 10: 원격 워크스페이스 Finder paste 차단 + unsupported 배너

**Component**: Renderer
**Priority**: P1-High (Phase 2)
**Type**: Feature

**Description**:
원격 워크스페이스에서 Finder 파일 붙여넣기를 시도하면 unsupported 배너를 표시한다.

**Acceptance Criteria**:
- [ ] 원격 워크스페이스에서 Paste 시 Finder 소스 감지되면 배너 표시
- [ ] 배너 메시지: "Finder 파일 붙여넣기는 로컬 워크스페이스에서만 지원됩니다"
- [ ] 5초 후 자동 dismiss (기존 배너 auto-dismiss 패턴 활용)
- [ ] 내부 클립보드 Paste는 원격에서도 정상 동작

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- Paste 결과에 따른 배너 분기
- [M] `src/file-tree/file-tree-panel.test.tsx` -- 배너 표시 테스트

**Technical Notes**:
- `pasteFromClipboard` 응답의 `error` 또는 `source` 필드로 판단
- 기존 auto-dismiss 배너 패턴 (`d1fde44` 커밋) 재활용

**Dependencies**: T9

---

## Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | Sequential (conflicts) |
|-------|-------------|--------------|----------------------|
| 1     | 7           | 3            | T1 → T2,T3 (parallel) → T4 → T5 → T6 → T7 |
| 2     | 3           | 1            | T8 → T9 → T10 |

> Phase 1에서 T1은 공유 유틸리티로 먼저 완료 필요. T2(local backend)와 T3(remote agent)는 병렬 실행 가능 (파일 겹침 없음).
> T4 이후는 순차 (각 태스크가 이전 태스크 결과에 의존).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `incrementFileName` 공유 위치 문제 (renderer vs electron) | Medium | 공유 유틸 디렉토리 생성 또는 electron/renderer 각각 구현 |
| Finder 클립보드 API 변경 (macOS 업데이트) | Low | `bplist-parser` 커뮤니티가 관리, graceful fallback |
| 대형 디렉토리 복사 시 성능 | Medium | 복사 중 progress 표시 없이 진행 (MVP), 추후 개선 |
| remote agent runtime 번들 크기 증가 | Low | `incrementFileName`은 순수 함수로 크기 영향 미미 |

## Open Questions

- [ ] `incrementFileName`을 renderer와 electron 양쪽에서 사용 가능한 위치에 둘 것인가? (추천: `shared/` 디렉토리 또는 각각 구현)
- [ ] 디렉토리 복사 시 대형 디렉토리 경고 기준 (파일 수? 용량?) — MVP에서는 경고 없이 진행
- [ ] `bplist-parser` vs `electron-clipboard-ex` 선택 — `bplist-parser` 권장 (순수 JS, 네이티브 빌드 불필요)

## Model Recommendation

- **Phase 1**: `sonnet` — 기존 패턴이 명확하고 반복적인 CRUD 확장 작업
- **Phase 2**: `sonnet` — bplist-parser 통합은 리서치 문서에 코드 예시가 이미 있음
- 전체 복잡도: **Medium** (기존 패턴의 확장, 새로운 아키텍처 결정 없음)
