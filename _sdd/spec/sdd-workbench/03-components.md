# 03. Components

## 목적

이 문서는 상세 구현 메모를 모두 담는 문서가 아니라, 도메인별 책임과 읽는 순서를 안내하는 허브다.

- 기능 ID 기준 진입은 [FEATURE_INDEX](./FEATURE_INDEX.md)
- 파일/테스트 기준 진입은 [CODE_MAP](./CODE_MAP.md)
- 세부 계약은 [04-interfaces](./04-interfaces.md)

## 1. 도메인 맵

| 도메인 | 다루는 범위 | 상세 문서 |
|---|---|---|
| Workspace / File Tree | 멀티 워크스페이스, 트리, lazy indexing, CRUD, git badge, 파일 검색 | [workspace-and-file-tree](./03-domains/workspace-and-file-tree.md) |
| Code Editor | CM6 편집/저장/검색/wrap/jump/gutter | [code-editor](./03-domains/code-editor.md) |
| Spec Viewer | rendered markdown, source action, spec 검색, exact offset, code->spec | [spec-viewer](./03-domains/spec-viewer.md) |
| Comments / Export | line/global comments, hover preview, export bundle, 관리 모달 | [comments-and-export](./03-domains/comments-and-export.md) |
| Remote Workspace | remote backend, browse, SSH transport, runtime, watcher | [remote-workspace](./03-domains/remote-workspace.md) |
| Appearance / Navigation | App shell, content tabs, history nav, highlight, theme, native menu | [appearance-and-navigation](./03-domains/appearance-and-navigation.md) |

## 2. 읽는 순서

### 제품 이해가 먼저일 때

1. `01-overview`
2. `02-architecture`
3. 필요한 도메인 1개

### 구현 변경이 먼저일 때

1. `FEATURE_INDEX` 또는 `CODE_MAP`
2. 해당 도메인 문서 1개
3. 필요한 계약 문서 1~2개

## 3. 유지보수 규칙

1. 이 문서에는 도메인 요약과 링크만 남긴다.
2. 세부 파일 인벤토리는 `CODE_MAP.md`로 옮긴다.
3. 세부 불변식/IPC/type 규칙은 `04-contracts/*`로 옮긴다.
