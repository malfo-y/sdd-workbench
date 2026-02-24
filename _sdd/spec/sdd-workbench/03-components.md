# 03. Components

## 1. 컴포넌트 책임 맵

### 1.1 App Shell

- `src/App.tsx`
  - 3패널 조립, header 액션, 모달 오케스트레이션
  - header left(title + history) + header right(comments/workspace) 그룹으로 분리하고 compact 버튼(`icon + short label`) 적용
  - 코멘트 전용 배너 helper + auto-dismiss 타이머 제어
  - spec 점프/코멘트 요청/내보내기 흐름 연결
- `src/App.css`
  - 패널 레이아웃, marker/popover/modal 스타일
  - code line Git marker(`added`/`modified`) 색상 스타일
  - header action 그룹/반응형 icon-only 규칙(`max-width: 1240px`)

### 1.2 Workspace State Layer

- `src/workspace/workspace-context.tsx`
  - 멀티 워크스페이스 상태 및 action 집약
  - active file read/refresh/전환 시 `workspace:getGitLineMarkers` 재조회 및 세션 상태 반영
  - same-spec source jump에서 불필요한 spec reset/read 최소화
  - workspace별 watch mode preference 변경/재시작 + fallback 배너 처리
  - comments/global-comments read-write 액션 제공
  - `loadDirectoryChildren` on-demand 디렉토리 확장 + `isFilePathPotentiallyPresent` lazy tree 보호
- `src/workspace/workspace-model.ts`
  - 순수 상태 전이(`watchModePreference`, `watchMode`, `isRemoteMounted`, `loadingDirectories` 포함)
  - session 상태에 `activeFileGitLineMarkers` 포함
  - `mergeDirectoryChildren` 순수 함수(트리 노드 교체)
- `src/workspace/workspace-persistence.ts`
  - 세션 snapshot hydrate/persist(`watchModePreference` 영속화)
- `src/workspace/workspace-switcher.tsx`
  - 활성 workspace 선택

### 1.3 File Tree Layer

- `src/file-tree/file-tree-panel.tsx`
  - 디렉토리 토글형 트리 렌더
  - 파일/디렉토리 우클릭 경로 복사
  - changed marker 표시(visible 파일 + collapse 버블링 상위 디렉토리)
  - `not-loaded` 디렉토리 확장 시 on-demand 로드 트리거 + "Loading..." placeholder
  - `partial` 디렉토리에 "Showing N of M items" cap 메시지 표시

### 1.4 Code Viewer Layer

- `src/code-viewer/code-viewer-panel.tsx`
  - 라인 단위 렌더, 선택/드래그/컨텍스트 메뉴
  - line number 옆 Git marker(`added`/`modified`) 렌더
  - 이미지 프리뷰/preview unavailable 분기
  - comment count badge + hover popover 표시
- `src/code-viewer/line-selection.ts`
  - 1-based selection 유틸
- `src/code-viewer/language-map.ts`, `syntax-highlight.ts`
  - Shiki 기반 비동기 syntax highlight(JS regex 엔진, 40+ 언어 lazy 로드, github-dark 테마)
  - 확장자/파일명 → Shiki `BundledLanguage` 매핑 + plaintext fallback

### 1.5 Spec Viewer Layer

- `src/spec-viewer/spec-viewer-panel.tsx`
  - rendered markdown + TOC + 링크/소스 액션
  - `Add Comment`/`Go to Source` source popover
  - comment marker 매핑 렌더 + hover popover
  - spec scroll position capture/restore(런타임)
- `src/spec-viewer/spec-link-utils.ts`
  - 링크 해석 및 line-range 파싱
- `src/spec-viewer/source-line-resolver.ts`
  - selection target source line 해석
- `src/spec-viewer/markdown-security.ts`
  - sanitize/URI 정책

### 1.6 Comment Domain Layer

- `src/code-comments/comment-types.ts`
  - `CodeComment` 타입(`exportedAt` 포함)
- `src/code-comments/comment-anchor.ts`
  - anchor/hash 생성
- `src/code-comments/comment-persistence.ts`
  - parse/serialize
- `src/code-comments/comment-line-index.ts`
  - 파일/라인(startLine 기준) count index + entries index + nearest fallback mapping
- `src/code-comments/comment-hover-popover.tsx`
  - 코드/문서 공용 코멘트 hover preview UI
- `src/code-comments/comment-export.ts`
  - `_COMMENTS.md` 및 bundle 렌더(global comments prepend 포함)
- `src/code-comments/comment-editor-modal.tsx`
- `src/code-comments/export-comments-modal.tsx`
  - export target/길이 가드 + global comments 포함 상태 표시(View Comments 체크박스 상태 반영) + 코멘트 갯수에 global comments 포함 여부 표시(`N comment(s) + global comments included`)
- `src/code-comments/comment-list-modal.tsx`
  - 코멘트 조회/편집/개별삭제/Delete Exported(2-step confirm, 하단 좌측 배치) + global comments 상단 read-only 섹션 + "Include in export" 체크박스 + 코멘트 target 클릭 시 해당 파일/라인으로 점프(모달 닫힘)
- `src/code-comments/global-comments-modal.tsx`
  - 워크스페이스 전역 코멘트 편집/저장

### 1.7 Electron Boundary

- `electron/main.ts`
  - IPC handler, watch lifecycle(native/polling/fallback), export 파일 쓰기, system open
  - `workspace:getGitLineMarkers` 단건 diff 조회(`git diff --unified=0 HEAD -- <relativePath>`) + 실패 safe degrade
  - `detectRemoteMountPoint` (`mount` 명령 파싱 기반 네트워크 FS 감지)
  - `buildDirectoryChildren` + `handleWorkspaceIndexDirectory` (on-demand 디렉토리 IPC)
  - polling watcher child cap 초과 디렉토리 자동 제외
- `electron/workspace-watch-mode.ts`
  - `/Volumes/*` 휴리스틱 + override 우선순위 기반 watch mode resolver
- `electron/git-line-markers.ts`
  - unified diff hunk 파싱으로 라인 마커(`added`/`modified`) 계산
- `electron/preload.ts`
  - `window.workspace` 브리지(`getGitLineMarkers` 포함)
- `electron/electron-env.d.ts`
  - renderer 타입 계약

## 2. 테스트 맵(핵심)

- 통합: `src/App.test.tsx` (watch mode UI/fallback/hydrate 시나리오 포함)
- 상태모델: `src/workspace/workspace-model.test.ts`
- 상태 영속화: `src/workspace/workspace-persistence.test.ts`
- spec viewer: `src/spec-viewer/spec-viewer-panel.test.tsx`
- code viewer: `src/code-viewer/code-viewer-panel.test.tsx`
- file tree lazy load: `src/file-tree/file-tree-panel.test.tsx`
- electron resolver: `electron/workspace-watch-mode.test.ts`
- electron git parser: `electron/git-line-markers.test.ts`
- syntax highlight: `src/code-viewer/syntax-highlight.test.ts`
- comment 도메인: `comment-anchor/comment-persistence/comment-line-index/comment-export/comment-list-modal` 테스트

## 3. 유지보수 규칙

1. 기능 추가 시 먼저 도메인/상태/뷰 경계를 분리해 배치한다.
2. Renderer 로직 변경은 IPC 계약 변경 여부를 함께 검토한다.
3. comment/export 정책 변경 시 `comment-persistence`와 `App.test.tsx`를 동시에 갱신한다.
4. 상세 파일 인벤토리는 `appendix.md`를 참조한다.
