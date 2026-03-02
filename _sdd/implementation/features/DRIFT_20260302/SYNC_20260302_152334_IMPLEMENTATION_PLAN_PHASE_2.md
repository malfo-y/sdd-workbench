# Implementation Plan — Phase 2: 편집 + 저장 + Dirty 상태

**상위 문서**: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
**태스크**: T6 ~ T10
**전제**: Phase 1 (T1~T5) 완료
**목표**: CM6 에디터에 편집 기능을 활성화하고, 파일 저장 IPC + dirty 상태 관리 + unsaved changes guard를 구현
**모델 권장**: `sonnet` (기존 IPC 패턴 추종)

---

## 태스크 개요

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T6 | `workspace:writeFile` IPC 구현 | P0 | - | IPC Layer |
| T7 | Workspace dirty 상태 + save 액션 구현 | P0 | T6 | State Layer |
| T8 | CM6 편집 모드 활성화 + Cmd+S keymap | P0 | T5,T7 | Editor UI |
| T9 | Unsaved changes guard 구현 | P0 | T7,T8 | State Layer |
| T10 | Watcher dirty-aware auto-reload + 배너 | P1 | T7 | State Layer |

## 병렬 실행 요약

```
T6 ── T7 ──┬── T8 ── T9
            └── T10
```

- **T6**: Phase 1과 독립, Phase 2 시작 시 바로 착수 가능
- **T7**: T6 완료 후 실행 (writeFile IPC 필요)
- **T8**: T5(Phase 1) + T7 완료 후 실행
- **T9**: T7 + T8 완료 후 실행
- **T10**: T7 완료 후 T9와 병렬 가능 (다른 파일)

| 최대 병렬 | 순차 필수 | 파일 충돌 |
|-----------|-----------|-----------|
| 2 (T9∥T10) | T6→T7→T8→T9 | `workspace-context.tsx` (T7,T9,T10 순차) |

---

## 태스크 상세

### T6: `workspace:writeFile` IPC 구현

**Priority**: P0 | **Type**: Feature | **Deps**: -

**설명**:
Electron Main 프로세스에 `workspace:writeFile` IPC 핸들러를 추가한다. 경로 검증(`isPathInsideWorkspace`), 크기 제한(2MB), atomic write를 적용한다. Preload bridge와 Window 타입을 확장한다.

**수용 기준**:
- [ ] `workspace:writeFile` IPC 핸들러가 `electron/main.ts`에 등록
- [ ] `isPathInsideWorkspace(rootPath, relativePath)` 경로 검증 — workspace 바깥 경로 거부
- [ ] content 2MB 초과 시 `{ ok: false, error: 'File too large' }` 반환
- [ ] atomic write 구현 (임시 파일 → `fs.rename`)
- [ ] Preload에 `writeFile(rootPath, relativePath, content)` 노출
- [ ] `electron-env.d.ts`에 `WorkspaceWriteFileResult` 타입 + Window.workspace 확장
- [ ] 에러 시 throw 없이 `{ ok: false, error }` 반환

**Target Files**:
- [M] `electron/main.ts` -- `handleWorkspaceWriteFile` IPC 핸들러 추가
- [M] `electron/preload.ts` -- `writeFile` bridge 함수 추가
- [M] `electron/electron-env.d.ts` -- `WorkspaceWriteFileResult` 타입 + Window 확장

**기술 노트**:
- 기존 `handleWorkspaceReadFile` 패턴 참조
- 경로 검증: `path.resolve(rootPath, relativePath)` → `resolvedPath.startsWith(rootPath + path.sep)` 확인
- atomic write: `fs.writeFile(tmpPath, content, 'utf-8')` → `fs.rename(tmpPath, targetPath)`
- `tmpPath`는 targetPath + `.tmp.${Date.now()}` 또는 `os.tmpdir()` 사용
- 기존 `workspace:exportCommentsBundle`의 파일 쓰기 패턴도 참고

---

### T7: Workspace dirty 상태 + save 액션 구현

**Priority**: P0 | **Type**: Feature | **Deps**: T6

**설명**:
`WorkspaceSession`에 `isDirty` 상태를 추가하고, `saveFile(content)` 액션을 구현한다. 저장 성공 시 dirty를 해제한다.

**수용 기준**:
- [ ] `WorkspaceSession`에 `isDirty: boolean` 필드 추가 (초기값 `false`)
- [ ] `setDirty(workspaceId, dirty)` 순수 상태 전이 함수
- [ ] `WorkspaceProvider`에 `saveFile(content: string)` 액션 추가
- [ ] `saveFile` → `window.workspace.writeFile(rootPath, relativePath, content)` → 성공 시 `isDirty = false`
- [ ] 파일 전환 시 dirty 상태 리셋
- [ ] 단위 테스트 통과 (workspace-model.test.ts)

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- `isDirty` 필드 + `setDirty` 순수 함수
- [M] `src/workspace/workspace-context.tsx` -- `saveFile` 액션 + dirty 상태 관리
- [M] `src/workspace/workspace-model.test.ts` -- `isDirty`/`setDirty` 테스트

**기술 노트**:
- `createInitialSession()`에 `isDirty: false` 추가
- `setDirty(state, workspaceId, dirty)` → session 업데이트
- `setActiveFile` 시 `isDirty = false` 리셋 (새 파일로 전환하면 dirty 해제)
- `saveFile` 실패 시 배너로 에러 표시, dirty는 유지
- `WorkspaceSession` 타입은 `workspace-model.ts`에서 관리, `workspace-persistence.ts`의 snapshot에서 `isDirty`는 제외 (영속화하지 않음)

---

### T8: CM6 편집 모드 활성화 + Cmd+S keymap

**Priority**: P0 | **Type**: Feature | **Deps**: T5, T7

**설명**:
Phase 1에서 `readOnly`로 설정한 CodeEditorPanel을 `Compartment` 기반으로 편집 가능하게 전환한다. `Mod-s` keymap으로 저장 트리거, `updateListener`에서 `docChanged` 감지 시 dirty 상태로 전환한다.

**수용 기준**:
- [ ] `Compartment`으로 `readOnly` 상태를 동적 전환 가능
- [ ] 에디터에서 텍스트 편집이 가능
- [ ] 편집 시 `docChanged` → `onDirtyChange(true)` 콜백 호출
- [ ] `Cmd+S`(Mac) / `Ctrl+S`(Win) → `onSave(doc.toString())` 콜백 호출
- [ ] `Cmd+S` 시 브라우저 기본 저장 다이얼로그 방지 (`preventDefault`)
- [ ] Props에 `editable`, `onSave`, `onDirtyChange` 추가

**Target Files**:
- [M] `src/code-editor/code-editor-panel.tsx` -- Compartment 기반 readOnly 전환, Mod-s keymap, updateListener dirty 감지
- [M] `src/code-editor/code-editor-panel.test.tsx` -- 편집/저장/dirty 테스트 추가

**기술 노트**:
- `const readOnlyCompartment = new Compartment()`
- 초기: `readOnlyCompartment.of(EditorState.readOnly.of(!editable))`
- `editable` prop 변경 시: `view.dispatch({ effects: readOnlyCompartment.reconfigure(...) })`
- `Mod-s` keymap: `keymap.of([{ key: 'Mod-s', run: (view) => { onSave?.(view.state.doc.toString()); return true } }])`
- `EditorView.updateListener.of(update => { if (update.docChanged) onDirtyChange?.(true) })`
- App.tsx에서 `editable={true}` 전달 + `onSave` → `saveFile(content)` 연결 + `onDirtyChange` → `setDirty` 연결

---

### T9: Unsaved changes guard 구현

**Priority**: P0 | **Type**: Feature | **Deps**: T7, T8

**설명**:
dirty 상태에서 파일 전환, 워크스페이스 전환, 앱 닫기 시 confirm dialog를 표시하여 의도치 않은 변경 손실을 방지한다.

**수용 기준**:
- [ ] dirty 상태에서 파일 전환 시 `window.confirm()` 표시 → 취소 시 전환 중단
- [ ] dirty 상태에서 워크스페이스 전환 시 confirm → 취소 시 전환 중단
- [ ] dirty 상태에서 워크스페이스 닫기 시 confirm → 취소 시 닫기 중단
- [ ] `window.addEventListener('beforeunload')` 으로 앱 닫기/새로고침 가드
- [ ] `isDirty === false`일 때는 가드 없이 즉시 전환

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- 파일/워크스페이스 전환 시 dirty confirm guard
- [M] `src/App.tsx` -- `beforeunload` 이벤트 리스너 등록

**기술 노트**:
- `setActiveFile` 전에 dirty check: `if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return`
- `switchWorkspace`/`closeWorkspace` 전에도 동일 guard
- `beforeunload`: `useEffect` 내에서 `isDirty`일 때만 listener 등록
  ```ts
  window.addEventListener('beforeunload', (e) => { e.preventDefault(); e.returnValue = '' })
  ```
- confirm dialog는 네이티브 `window.confirm` 사용 (커스텀 모달은 scope 밖)

---

### T10: Watcher dirty-aware auto-reload + 배너

**Priority**: P1 | **Type**: Feature | **Deps**: T7

**설명**:
dirty 파일이 외부에서 변경되었을 때 auto-reload를 건너뛰고, "File changed on disk. Reload?" 배너를 표시한다. 사용자가 Reload를 선택하면 외부 변경을 반영하고 dirty를 해제한다.

**수용 기준**:
- [ ] `isDirty === false`일 때 외부 변경 → 기존대로 auto-reload
- [ ] `isDirty === true`일 때 외부 변경 → auto-reload 건너뛰기
- [ ] dirty + 외부 변경 시 배너 표시: "File changed on disk. Reload?"
- [ ] 배너 Reload 버튼 → 외부 내용으로 교체 + `isDirty = false`
- [ ] 배너 Dismiss → 현재 편집 내용 유지

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- watcher handler에서 dirty check + reload skip
- [M] `src/App.tsx` -- "File changed on disk" 배너 UI 추가

**기술 노트**:
- `workspace-context.tsx`의 `handleWatchEvent` 내에서 dirty check는 **동기적** 수행 (ref 사용)
  - `isDirtyRef.current`로 최신 dirty 상태를 동기적으로 읽음 (state는 stale closure 위험)
- `activeFile`이 `changedRelativePaths`에 포함되고 `isDirty`이면 → reload 건너뛰기 + 배너 상태 세팅
- 배너 상태: `externalChangeDetected: boolean` (워크스페이스 세션 또는 App 레벨)
- Reload 시: `readFile` 재호출 → content 교체 → dirty 해제 → 배너 해제
- Phase 2의 T9(unsaved guard)와 독립적으로 구현 가능

---

## Phase 2 완료 검증

### 자동 검증
```bash
npx tsc --noEmit
npm test
npm run build
```

### 수동 스모크 테스트
- [ ] 파일 열기 → 텍스트 편집 가능
- [ ] 편집 후 dirty indicator 표시 (UI에 반영)
- [ ] `Cmd+S` → 파일 저장 → dirty indicator 해제
- [ ] 저장 후 터미널에서 파일 내용 확인 → 변경 반영됨
- [ ] dirty 상태에서 다른 파일 선택 → confirm dialog 표시
- [ ] confirm에서 Cancel → 파일 전환 취소
- [ ] confirm에서 OK → 파일 전환 진행
- [ ] dirty 상태에서 워크스페이스 전환/닫기 → confirm 표시
- [ ] dirty 상태에서 Cmd+W/Cmd+Q → 브라우저 beforeunload 가드
- [ ] 외부에서 파일 수정(터미널 `echo "test" >> file`) → dirty이면 배너 표시, clean이면 auto-reload
- [ ] 배너에서 Reload → 외부 변경 반영 + dirty 해제
