# Feature Index

## 목적

이 문서는 기능 ID(`Fxx`, `BUG-xx`) 기준의 탐색 인덱스다.

- 제품 관점에서는 어떤 기능이 현재 들어가 있는지 빠르게 확인한다.
- 구현 관점에서는 기능 변경 시 먼저 찾아봐야 할 문서/코드/테스트를 좁힌다.
- 상세 계약은 [contract-map](./contract-map.md), 상세 도메인 설명은 [component-map](./component-map.md)를 우선 참조한다.

## 1. Foundation / Workspace / Viewer

| ID | 이름 | 상태 | 사용자 가치 | 주요 문서 | 핵심 코드 / 테스트 |
|---|---|---|---|---|---|
| F01 | workspace bootstrap + 배너/경로 축약 | Done | 앱 실행 후 빠르게 워크스페이스를 연다 | [개요](./product-overview.md), [워크스페이스/트리](./domains/workspace-and-file-tree.md) | `src/App.tsx`, `src/workspace/workspace-context.tsx` / `src/App.test.tsx` |
| F02 | 파일 인덱싱 + 트리 렌더 | Done | 프로젝트 구조를 즉시 탐색한다 | [워크스페이스/트리](./domains/workspace-and-file-tree.md), [IPC](./contracts/ipc-contracts.md) | `electron/main.ts`, `src/file-tree/file-tree-panel.tsx` / `src/file-tree/file-tree-panel.test.tsx` |
| F03 | 코드 뷰어 + 라인 선택 | Done | 파일을 읽고 라인 범위를 잡는다 | [코드 에디터](./domains/code-editor.md), [상태 모델](./contracts/state-model.md) | `src/code-editor/code-editor-panel.tsx` / `src/code-editor/code-editor-panel.test.tsx` |
| F03.1 | 확장자 색상 코딩 | Done | 파일 타입을 트리에서 빠르게 구분한다 | [워크스페이스/트리](./domains/workspace-and-file-tree.md) | `src/file-tree/file-tree-panel.tsx` / `src/file-tree/file-tree-panel.test.tsx` |
| F03.5 | 멀티 워크스페이스 | Done | 여러 프로젝트를 같은 세션에서 오간다 | [개요](./product-overview.md), [상태 모델](./contracts/state-model.md) | `src/workspace/workspace-context.tsx`, `src/workspace/workspace-model.ts` / `src/workspace/workspace-model.test.ts` |
| F04 | markdown dual view | Done | raw markdown과 rendered spec를 함께 다룬다 | [스펙 뷰어](./domains/spec-viewer.md) | `src/spec-viewer/spec-viewer-panel.tsx` / `src/spec-viewer/spec-viewer-panel.test.tsx` |
| F04.1 | 링크 인터셉트 + copy popover | Done | 내부/외부 링크를 안전하게 해석한다 | [스펙 뷰어](./domains/spec-viewer.md), [내비게이션 규칙](./contracts/navigation-rules.md) | `src/spec-viewer/spec-link-utils.ts`, `src/spec-viewer/spec-viewer-panel.tsx` / `src/spec-viewer/spec-viewer-panel.test.tsx` |
| F05 | spec -> code line jump | Done | 스펙에서 대응 코드 라인으로 바로 이동한다 | [스펙 뷰어](./domains/spec-viewer.md), [내비게이션 규칙](./contracts/navigation-rules.md) | `src/App.tsx`, `src/spec-viewer/spec-viewer-panel.tsx` / `src/App.test.tsx` |
| F06 | 툴바 복사 정책 고정 | Done | 복사 동작을 예측 가능하게 사용한다 | [개요](./product-overview.md), [코멘트/Export 계약](./contracts/comment-contracts.md) | `src/App.tsx` / `src/App.test.tsx` |
| F06.1 | 컨텍스트 복사 popover | Done | 복사 전에 경로/문맥을 확인한다 | [코드 에디터](./domains/code-editor.md) | `src/App.tsx` / `src/App.test.tsx` |
| F06.2 | 드래그 선택 + copy UX 통합 | Done | 드래그/컨텍스트 메뉴 흐름을 일관되게 사용한다 | [코드 에디터](./domains/code-editor.md), [상태 모델](./contracts/state-model.md) | `src/code-editor/cm6-selection-bridge.ts` / `src/code-editor/cm6-selection-bridge.test.ts` |
| F07 | watcher + changed indicator | Done | 파일 변경을 즉시 감지한다 | [워크스페이스/트리](./domains/workspace-and-file-tree.md), [운영 가이드](./operations-and-validation.md) | `electron/main.ts`, `src/workspace/workspace-context.tsx` / `src/App.test.tsx` |
| F07.1 | workspace file history navigation | Done | back/forward로 최근 파일 이동을 복원한다 | [appearance/navigation](./domains/appearance-and-navigation.md), [상태 모델](./contracts/state-model.md) | `src/App.tsx`, `src/workspace/workspace-model.ts` / `src/App.test.tsx` |
| F07.2 | 코드 에디터 히스토리 스크롤 복원 | Done | 히스토리 이동 후 읽던 위치를 유지한다 | [코드 에디터](./domains/code-editor.md) | `src/App.tsx`, `src/code-editor/code-editor-panel.tsx` / `src/App.test.tsx` |
| F08 | Open In(iTerm/VSCode) | Done | 현재 파일/워크스페이스를 외부 도구로 연다 | [appearance/navigation](./domains/appearance-and-navigation.md), [IPC](./contracts/ipc-contracts.md) | `electron/main.ts`, `src/App.tsx` / `src/App.test.tsx` |
| F09 | 앱 재시작 세션 복원 | Done | 마지막 세션을 다시 연다 | [개요](./product-overview.md), [상태 모델](./contracts/state-model.md) | `src/workspace/workspace-persistence.ts` / `src/workspace/workspace-persistence.test.ts` |
| F10 | 보안/성능 안정화 | Done | 위험한 링크/대형 파일/외부 경계를 안전하게 다룬다 | [운영 가이드](./operations-and-validation.md), [스펙 뷰어](./domains/spec-viewer.md) | `src/spec-viewer/markdown-security.ts`, `electron/main.ts` / 관련 통합 테스트 |
| F10.1 | rendered selection `Go to Source` | Done | 렌더된 spec에서 선택 지점을 코드로 보낸다 | [스펙 뷰어](./domains/spec-viewer.md), [내비게이션 규칙](./contracts/navigation-rules.md) | `src/spec-viewer/spec-viewer-panel.tsx` / `src/spec-viewer/spec-viewer-panel.test.tsx` |
| F10.2 | code viewer 이미지 프리뷰 | Done | 텍스트가 아닌 자산도 앱 안에서 확인한다 | [코드 에디터](./domains/code-editor.md) | `src/code-editor/code-editor-panel.tsx` / `src/code-editor/code-editor-panel.test.tsx` |

## 2. Comments / Export / Review Flow

| ID | 이름 | 상태 | 사용자 가치 | 주요 문서 | 핵심 코드 / 테스트 |
|---|---|---|---|---|---|
| F11 | inline comment + export bundle | Done | 코드 라인에 코멘트를 달고 묶어서 내보낸다 | [코멘트/Export](./domains/comments-and-export.md), [코멘트 계약](./contracts/comment-contracts.md) | `src/code-comments/comment-export.ts`, `src/code-comments/comment-editor-modal.tsx` / `src/code-comments/comment-export.test.ts` |
| F11.1 | markdown comment entry + marker + incremental export | Done | rendered spec에서도 코멘트를 만든다 | [스펙 뷰어](./domains/spec-viewer.md), [코멘트 계약](./contracts/comment-contracts.md) | `src/spec-viewer/spec-viewer-panel.tsx` / `src/spec-viewer/spec-viewer-panel.test.tsx` |
| F11.2 | spec jump scroll retention + collapsed marker bubbling | Done | 스펙 점프 후 읽던 문맥을 잃지 않는다 | [스펙 뷰어](./domains/spec-viewer.md), [내비게이션 규칙](./contracts/navigation-rules.md) | `src/spec-viewer/spec-viewer-panel.tsx` / `src/spec-viewer/spec-viewer-panel.test.tsx` |
| F12.1 | marker hover preview | Done | 마커에 마우스를 올려 코멘트 내용을 미리 본다 | [코멘트/Export](./domains/comments-and-export.md) | `src/code-comments/comment-hover-popover.tsx` / 관련 modal/panel 테스트 |
| F12.2 | View Comments + edit/delete/Delete Exported | Done | 저장된 코멘트를 한 곳에서 관리한다 | [코멘트/Export](./domains/comments-and-export.md), [코멘트 계약](./contracts/comment-contracts.md) | `src/code-comments/comment-list-modal.tsx` / `src/code-comments/comment-list-modal.test.tsx` |
| F12.3 | global comments + export prepend order | Done | 라인 코멘트와 별개인 전역 메모를 함께 관리한다 | [코멘트/Export](./domains/comments-and-export.md), [코멘트 계약](./contracts/comment-contracts.md) | `src/code-comments/global-comments-modal.tsx`, `src/code-comments/comment-export.ts` / export 테스트 |
| F12.4 | header action compact reorder | Done | 상단 액션 영역을 더 읽기 쉽게 정리한다 | [appearance/navigation](./domains/appearance-and-navigation.md) | `src/App.tsx`, `src/App.css` / `src/App.test.tsx` |
| F12.5 | comment feedback auto-dismiss + action clarity | Done | 작업 피드백 배너가 과도하게 쌓이지 않는다 | [코멘트/Export](./domains/comments-and-export.md), [운영 가이드](./operations-and-validation.md) | `src/App.tsx` / `src/App.test.tsx` |
| F17 | global include checkbox + Delete Exported 위치 조정 | Done | export 포함 범위를 명시적으로 고른다 | [코멘트/Export](./domains/comments-and-export.md), [코멘트 계약](./contracts/comment-contracts.md) | `src/code-comments/comment-list-modal.tsx`, `src/code-comments/export-comments-modal.tsx` / modal 테스트 |
| F20 | 선택 export 완화 + target 클릭 점프 | Done | 코멘트 검토와 export 흐름을 덜 제약적으로 사용한다 | [코멘트/Export](./domains/comments-and-export.md), [내비게이션 규칙](./contracts/navigation-rules.md) | `src/code-comments/comment-list-modal.tsx`, `src/App.tsx` / `src/App.test.tsx` |

## 3. Remote / Scale / Runtime

| ID | 이름 | 상태 | 사용자 가치 | 주요 문서 | 핵심 코드 / 테스트 |
|---|---|---|---|---|---|
| F15 | SSHFS 원격 watch mode(auto/override) | Legacy | 초기 원격 마운트 기반 감시 경로를 제공했다 | [원격 워크스페이스](./domains/remote-workspace.md), [운영 가이드](./operations-and-validation.md) | `electron/workspace-watch-mode.ts` / `electron/workspace-watch-mode.test.ts` |
| F16 | lazy indexing + on-demand 디렉토리 확장 | Done | 큰 저장소에서도 트리를 감당한다 | [워크스페이스/트리](./domains/workspace-and-file-tree.md), [IPC](./contracts/ipc-contracts.md) | `electron/main.ts`, `src/workspace/workspace-context.tsx` / `src/file-tree/file-tree-panel.test.tsx` |
| F27 | Remote Agent Protocol 원격 워크스페이스 | Done | SSHFS 없이 원격 파일/감시/git/comment를 다룬다 | [원격 워크스페이스](./domains/remote-workspace.md), [IPC](./contracts/ipc-contracts.md) | `electron/workspace-backend/*`, `electron/remote-agent/*` / `electron/workspace-backend/*.test.ts`, `electron/remote-agent/**/*.test.ts` |
| F28 | remote directory browse + remoteRoot 선택 | Done | 연결 전에 원격 디렉토리를 탐색해 경로를 고른다 | [원격 워크스페이스](./domains/remote-workspace.md), [IPC](./contracts/ipc-contracts.md) | `electron/remote-agent/directory-browser.ts`, `src/App.tsx` / browse 관련 통합 테스트 |

## 4. Editor / Tree / Search / Git

| ID | 이름 | 상태 | 사용자 가치 | 주요 문서 | 핵심 코드 / 테스트 |
|---|---|---|---|---|---|
| F18 | Shiki syntax highlighting | Done | 더 정확한 코드 하이라이트를 본다 | [코드 에디터](./domains/code-editor.md), [운영 가이드](./operations-and-validation.md) | `src/code-viewer/syntax-highlight.ts` / `src/code-viewer/syntax-highlight.test.ts` |
| F19 | active file Git diff line markers | Done | 현재 파일의 변경 라인을 즉시 본다 | [코드 에디터](./domains/code-editor.md), [워크스페이스/트리](./domains/workspace-and-file-tree.md) | `electron/git-line-markers.ts`, `src/code-editor/cm6-git-gutter.ts` / `electron/git-line-markers.test.ts` |
| F21 | code viewer 텍스트 검색 | Replaced | 초기 커스텀 검색 UX를 제공했다 | [검색 규칙](./contracts/search-rules.md), [코드 에디터](./domains/code-editor.md) | 현재는 `@codemirror/search` 경로 / `src/code-editor/code-editor-panel.test.tsx` |
| F22 | Cmd+Shift+Up/Down 워크스페이스 전환 | Done | 키보드만으로 워크스페이스를 순환한다 | [appearance/navigation](./domains/appearance-and-navigation.md), [상태 모델](./contracts/state-model.md) | `src/App.tsx`, `src/workspace/workspace-model.ts` / `src/App.test.tsx` |
| F23 | 2패널 탭 레이아웃 | Done | Code/Spec을 탭으로 전환해 더 좁은 화면에서도 쓴다 | [appearance/navigation](./domains/appearance-and-navigation.md) | `src/App.tsx`, `src/App.css` / `src/App.test.tsx` |
| F24 | CodeMirror 6 코드 에디터 | Done | 읽기 전용 뷰어 대신 편집/저장/검색을 한 곳에서 처리한다 | [코드 에디터](./domains/code-editor.md), [상태 모델](./contracts/state-model.md) | `src/code-editor/code-editor-panel.tsx` / `src/code-editor/code-editor-panel.test.tsx` |
| F24.1 | line wrap 토글 + 기본 On | Done | 긴 줄도 가로 스크롤 없이 읽는다 | [코드 에디터](./domains/code-editor.md) | `src/code-editor/code-editor-panel.tsx` / `src/code-editor/code-editor-panel.test.tsx` |
| F25 | 파일 트리 CRUD | Done | 파일/디렉토리를 앱 안에서 만든다/지운다 | [워크스페이스/트리](./domains/workspace-and-file-tree.md), [IPC](./contracts/ipc-contracts.md) | `src/file-tree/file-tree-panel.tsx`, `electron/main.ts` / `src/file-tree/file-tree-panel.test.tsx` |
| F25b | 파일/디렉토리 rename | Done | 컨텍스트 메뉴에서 이름을 바꾼다 | [워크스페이스/트리](./domains/workspace-and-file-tree.md), [IPC](./contracts/ipc-contracts.md) | `src/file-tree/file-tree-panel.tsx`, `src/workspace/workspace-context.tsx` / 관련 file-tree/workspace 테스트 |
| F26 | 파일 트리 Git 파일 상태 마커 | Done | 파일 수준 U/M 상태를 트리에서 즉시 본다 | [워크스페이스/트리](./domains/workspace-and-file-tree.md) | `electron/git-file-statuses.ts`, `src/file-tree/file-tree-panel.tsx` / `electron/git-file-statuses.test.ts` |

## 5. Search / Source Mapping / Navigation / Theme

| ID | 이름 | 상태 | 사용자 가치 | 주요 문서 | 핵심 코드 / 테스트 |
|---|---|---|---|---|---|
| F29 | 파일 브라우저 파일명 검색 | Done | 로드되지 않은 디렉토리까지 포함해 파일을 찾는다 | [검색 규칙](./contracts/search-rules.md), [워크스페이스/트리](./domains/workspace-and-file-tree.md) | `electron/workspace-search.ts`, `src/file-tree/file-tree-panel.tsx` / `electron/workspace-search.test.ts` |
| F30 | 스펙 뷰어 텍스트 검색 | Done | 현재 spec 문서를 블록 단위로 찾는다 | [검색 규칙](./contracts/search-rules.md), [스펙 뷰어](./domains/spec-viewer.md) | `src/spec-viewer/spec-search.ts`, `src/spec-viewer/spec-viewer-panel.tsx` / `src/spec-viewer/spec-viewer-panel.test.tsx` |
| F31 | `*` wildcard 지원 | Done | 자주 쓰는 단순 glob 패턴으로 찾는다 | [검색 규칙](./contracts/search-rules.md) | `electron/workspace-search.ts`, `src/spec-viewer/spec-search.ts` / 관련 search 테스트 |
| F32 | spec comment/source action line anchor 정밀도 개선 | Done | 문단/테이블에서 더 정확한 라인에 코멘트를 단다 | [스펙 뷰어](./domains/spec-viewer.md), [내비게이션 규칙](./contracts/navigation-rules.md) | `src/spec-viewer/source-line-metadata.ts`, `src/spec-viewer/source-line-resolver.ts` / resolver 테스트 |
| F33 | exact source offset anchor MVP | Done | rendered selection을 raw markdown 정확한 offset으로 보낸다 | [스펙 뷰어](./domains/spec-viewer.md), [내비게이션 규칙](./contracts/navigation-rules.md) | `src/spec-viewer/rehype-source-text-leaves.ts`, `src/source-selection.ts` / `src/spec-viewer/spec-viewer-panel.test.tsx` |
| F34 | markdown source `Go to Spec` | Done | `.md` 코드 라인에서 대응 rendered block으로 이동한다 | [스펙 뷰어](./domains/spec-viewer.md), [appearance/navigation](./domains/appearance-and-navigation.md) | `src/App.tsx`, `src/source-line-resolver.ts` / `src/App.test.tsx` |
| F35 | cross-panel navigation highlight | Done | 이동 후 도착 위치를 눈에 띄게 표시한다 | [appearance/navigation](./domains/appearance-and-navigation.md), [내비게이션 규칙](./contracts/navigation-rules.md) | `src/code-editor/cm6-navigation-highlight.ts`, `src/spec-viewer/spec-viewer-panel.tsx` / 관련 App/panel 테스트 |
| F36 | appearance theme foundation | Done | `dark-gray`/`light` 테마 전환의 기반을 제공한다 | [appearance/navigation](./domains/appearance-and-navigation.md), [theme/menu 계약](./contracts/theme-and-menu-contracts.md) | `src/appearance-theme.ts`, `src/App.tsx`, `src/main.tsx` / `src/appearance-theme.test.ts` |
| F37 | `light` theme | Done | 밝은 회색 계열 테마로 앱을 사용한다 | [appearance/navigation](./domains/appearance-and-navigation.md), [theme/menu 계약](./contracts/theme-and-menu-contracts.md) | `src/index.css`, `src/code-editor/cm6-light-theme.ts`, `src/code-viewer/syntax-highlight.ts` / `src/App.test.tsx`, `src/code-viewer/syntax-highlight.test.ts` |
| F38 | native `View > Theme` 메뉴 | Done | 큰 헤더 UI 없이 시스템 메뉴에서 테마를 바꾼다 | [appearance/navigation](./domains/appearance-and-navigation.md), [theme/menu 계약](./contracts/theme-and-menu-contracts.md) | `electron/appearance-menu.ts`, `electron/main.ts`, `electron/preload.ts` / `electron/appearance-menu.test.ts` |

## 6. Bug Fix Index

| ID | 이름 | 상태 | 사용자 가치 | 주요 문서 | 핵심 코드 / 테스트 |
|---|---|---|---|---|---|
| BUG-01 | spec `Go to Source` 탭 전환 순서 수정 | Fixed | spec에서 jump 시 Code 탭이 확실히 열린다 | [appearance/navigation](./domains/appearance-and-navigation.md) | `src/App.tsx` / `src/App.test.tsx` |
| BUG-02 | Copy Relative Path 라인 번호 복구 | Fixed | 코드 컨텍스트 메뉴 복사값에 라인 정보가 보존된다 | [코드 에디터](./domains/code-editor.md), [코멘트 계약](./contracts/comment-contracts.md) | `src/App.tsx`, `src/code-editor/code-editor-panel.tsx` / `src/App.test.tsx` |
