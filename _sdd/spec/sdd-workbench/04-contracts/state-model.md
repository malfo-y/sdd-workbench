# State Model

## 1. 목적

이 문서는 renderer와 IPC 경계에서 반복해서 참조되는 핵심 타입과 전역 불변식을 정리한다.

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

## 3. 전역 불변식

1. 라인 번호는 전역적으로 1-based다.
2. exact source offset은 same-file raw markdown 기준 0-based half-open `[startOffset, endOffset)`이다.
3. comment는 항상 `startLine/endLine`을 유지하고, optional offset은 additive metadata로만 사용한다.
4. `appearanceTheme`는 workspace session state가 아니라 renderer-level UI state다.
5. `token`이 있는 navigation request는 같은 line/block 재이동에서도 highlight를 재트리거할 수 있어야 한다.
6. source of truth가 다른 상태를 한 필드에 합치지 않는다.
   - 예: changed marker와 git status badge, search focus와 navigation highlight

## 4. source of truth

- workspace/session 상태:
  - `src/workspace/workspace-context.tsx`
  - `src/workspace/workspace-model.ts`
- persisted workspace snapshot:
  - `src/workspace/workspace-persistence.ts`
- theme persistence:
  - `src/appearance-theme.ts`
- comment persistence:
  - `src/code-comments/comment-persistence.ts`

## 5. 관련 구현 파일

- `src/workspace/workspace-context.tsx`
- `src/workspace/workspace-model.ts`
- `src/appearance-theme.ts`
- `src/source-selection.ts`
- `src/code-comments/comment-types.ts`

## 6. 관련 테스트

- `src/workspace/workspace-model.test.ts`
- `src/workspace/workspace-persistence.test.ts`
- `src/appearance-theme.test.ts`
- `src/App.test.tsx`
