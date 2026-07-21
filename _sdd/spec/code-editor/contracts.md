# State Model

## 1. 목적

이 문서는 viewer-first renderer와 IPC 경계에서 반복해서 참조되는 핵심 타입과 전역 불변식을 정리한다.

## 2. 핵심 타입

- `ContentTab = 'code' | 'spec'`
- `AppearanceTheme = 'dark-gray' | 'light'`
- `WorkspaceWatchMode = 'native' | 'polling'`
- `WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'`
- `WorkspaceKind = 'local' | 'remote'`
- `SelectionState = { startLine: number; endLine: number } | null`
- `PaneSizes = { left: number; content: number }`
- `SourceOffsetRange = { startOffset: number; endOffset: number }`
- `CodeViewerJumpRequest = { targetRelativePath, lineNumber, sourceOffsetRange?, shouldHighlight?, token }`
- `SpecViewerNavigationRequest = { targetRelativePath, lineNumber, token }`
- `GitFileStatusKind = 'added' | 'modified' | 'untracked'`
- `WorkspaceGitLineMarkerKind = 'added' | 'modified'`
- `SystemOpenInRequest = { rootPath, relativePath?, workspaceKind?: 'local'|'remote', remoteProfile?: SystemOpenRemoteProfile | null }`
- `SystemOpenRemoteProfile = { workspaceId, host, remoteRoot, user?, port?, agentPath?, identityFile?, sshAlias?, requestTimeoutMs?, connectTimeoutMs? }`
- `SystemOpenInResult = { ok, error? }`
- `WorkspaceSyncVsCodeSshConfigRequest = { sshAlias, host, user?, port?, identityFile? }`
- `DocumentSaveState = 'clean' | 'dirty' | 'saving' | 'conflict'`
- `WorkspaceDocumentSession = { relativePath, savedContent, draftContent, saveState, conflictDiskContent }`

## 3. 전역 불변식

1. 라인 번호는 전역적으로 1-based다.
2. exact source offset은 same-file raw markdown 기준 0-based half-open `[startOffset, endOffset)`이다.
3. comment는 항상 `startLine/endLine`을 유지하고, optional offset은 additive metadata로만 사용한다.
4. `appearanceTheme`는 workspace session state가 아니라 renderer-level UI state다.
5. `token`이 있는 navigation request는 같은 line/block 재이동에서도 highlight를 재트리거할 수 있어야 한다.
6. source of truth가 다른 상태를 한 필드에 합치지 않는다.
   - 예: changed marker와 git status badge, search focus와 navigation highlight
7. undo/redo stack과 selection은 editor-local state이며, path-keyed document session의 source of truth가 아니다.
8. text/markdown 문서의 dirty/저장/외부 변경 충돌 판정은 가능한 한 `draftContent`/`savedContent`/`saveState`에서 파생한다.
9. runtime document session cache는 기본적으로 앱 재시작 snapshot persistence 범위에 포함하지 않는다.
10. Code Viewer의 표준 renderer는 CM6 read-only engine이며, viewer-first 전환이 곧 정적 highlighter 전환을 의미하지는 않는다.
11. `CodeEditorPanel` public surface는 viewer contract를 기준으로 유지하며, editor-centric save/draft mutation callback은 canonical contract가 아니다.
12. focused remote watcher event가 active file/spec에 도착해도 dirty document의 `draftContent`를 자동으로 덮어쓰지 않고 기존 external-change conflict banner 경로를 사용한다.

## 4. source of truth

- workspace/session 상태:
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/workspace-model.ts`
- persisted workspace snapshot:
  - `src/workspace/workspace-persistence.ts` (sshAlias 포함 원격 프로필 영속화)
- theme persistence:
  - `src/appearance-theme.ts`
- comment persistence:
  - `src/code-comments/comment-persistence.ts`

## 5. 관련 구현 파일

- `src/workspace/workspace-context.tsx`
- `src/workspace/workspace-model.ts`
- `src/code-editor/code-editor-panel.tsx`
- `src/appearance-theme.ts`
- `src/source-selection.ts`
- `src/code-comments/comment-types.ts`
- `electron/system-open.ts`
- `electron/vscode-ssh-config.ts`

## 6. 관련 테스트

- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-persistence.test.ts`
- `src/appearance-theme.test.ts`
- `electron/system-open.test.ts`
- `electron/vscode-ssh-config.test.ts`
- `src/App.test.tsx`
