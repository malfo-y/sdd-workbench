# 04. Interfaces

## 1. 핵심 타입 계약

```ts
type SelectionState = { startLine: number; endLine: number } | null

type WorkspaceWatchMode = 'native' | 'polling'
type WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'

interface WorkspaceFileNode {
  name: string
  relativePath: string
  type: 'file' | 'directory'
  children?: WorkspaceFileNode[]
  childrenStatus?: 'complete' | 'not-loaded' | 'partial'
  totalChildCount?: number
}

type CodeComment = {
  id: string
  relativePath: string
  startLine: number
  endLine: number
  body: string
  anchor: {
    snippet: string
    hash: string
    before?: string
    after?: string
  }
  createdAt: string
  exportedAt?: string
}
```

핵심 규칙:

1. 라인 번호는 1-based 기준
2. 코멘트 source of truth는 `workspaceRoot/.sdd-workbench/comments.json`
3. global comments source of truth는 `workspaceRoot/.sdd-workbench/global-comments.md`
4. `_COMMENTS.md`는 export 산출물(재생성)이며 source of truth가 아님
5. watcher 선호값(`watchModePreference`)은 workspace 세션 snapshot에 영속화된다.

## 2. 링크/경로 해석 규칙

지원 패턴:

- `#heading-id`
- `./path/to/file.md`, `../path/to/file.md`
- `path/to/file.ts#Lx`, `path/to/file.ts#Lx-Ly`
- external URI(`https://`, `mailto:` 등)

동작 규칙:

1. same-workspace 상대 링크만 내부 라우팅
2. external/unresolved는 자동 이동 없이 copy popover
3. rendered selection 액션(`Add Comment`, `Go to Source`)은 현재 `activeSpec` 범위에서만 동작
4. same-spec source jump는 가능한 경우 `activeSpecContent`를 재사용해 rendered 패널 리셋을 피한다.
5. rendered spec scroll position은 `workspace + activeSpecPath` 키로 런타임 저장/복원한다.

## 3. IPC 계약

| 채널 | 방향 | 요약 |
|---|---|---|
| `workspace:openDialog` | Renderer -> Main (`invoke`) | 워크스페이스 선택 |
| `workspace:index` | Renderer -> Main (`invoke`) | 파일 트리 인덱싱 (`truncated` 포함) |
| `workspace:readFile` | Renderer -> Main (`invoke`) | 파일 본문/이미지 payload 읽기 |
| `workspace:watchStart` / `workspace:watchStop` | Renderer -> Main (`invoke`) | watcher lifecycle + watch mode resolution |
| `workspace:watchEvent` | Main -> Renderer (`send`) | 변경 파일 + 구조변경 플래그 |
| `workspace:historyNavigate` | Main -> Renderer (`send`) | back/forward 이벤트 |
| `system:openInIterm` / `system:openInVsCode` | Renderer -> Main (`invoke`) | 외부 툴 열기 |
| `workspace:readComments` | Renderer -> Main (`invoke`) | comments 읽기 |
| `workspace:writeComments` | Renderer -> Main (`invoke`) | comments 쓰기 |
| `workspace:readGlobalComments` | Renderer -> Main (`invoke`) | global comments 읽기 |
| `workspace:writeGlobalComments` | Renderer -> Main (`invoke`) | global comments 쓰기 |
| `workspace:exportCommentsBundle` | Renderer -> Main (`invoke`) | `_COMMENTS.md`/bundle 저장 |
| `workspace:indexDirectory` | Renderer -> Main (`invoke`) | on-demand 단일 디렉토리 자식 로드 |

`workspace:watchStart` 계약 요약:

- request: `{ workspaceId, rootPath, watchModePreference?: 'auto'|'native'|'polling' }`
- response: `{ ok, watchMode?: 'native'|'polling', isRemoteMounted?: boolean, fallbackApplied?: boolean, error?: string }`
- 해석 규칙: `override(native|polling) > auto 휴리스틱(mount 명령 네트워크 FS 감지 => polling)`
- fallback 규칙: `native` 시작 실패 시 `polling`으로 강등 성공 후 `fallbackApplied=true`

`workspace:indexDirectory` 계약 요약:

- request: `{ rootPath, relativePath }`
- response: `{ ok, children?: WorkspaceFileNode[], childrenStatus?: 'complete'|'partial', totalChildCount?: number, error?: string }`
- 디렉토리별 child cap(`500`) 적용, 초과 시 `partial` + `totalChildCount` 반환

## 4. 코멘트/Export 정책 계약

1. `Add Comment`는 CodeViewer/SpecViewer 모두에서 동일 저장 플로우를 사용한다.
2. `View Comments`는 상단 global comments(read-only) + 하단 line comments 목록을 함께 보여준다. global comments가 존재하면 "Include in export" 체크박스(기본 체크)를 제공한다.
3. `View Comments` 편집/삭제/Delete Exported는 동일 comments 저장 플로우를 재사용한다. `Delete Exported`는 모달 하단 좌측에 배치한다.
4. global comments 빈 값은 `No global comments.` empty 상태 문구로 표시한다.
5. `Delete Exported`는 `exportedAt`가 있는 line comment만 삭제하고 pending comment는 유지한다.
6. Export 대상 line comment는 pending comments(`exportedAt` 없음)만 포함한다.
7. global comments가 비어있지 않고 "Include in export" 체크박스가 선택된 경우에만 export 문서에 `Global Comments` 섹션을 `Comments` 섹션보다 먼저 배치한다.
8. Export 모달에는 View Comments 체크박스 상태를 반영한 global comments 포함 여부(`included`/`not included`)를 표시한다.
9. target 중 1개 이상 성공하면 해당 snapshot line comment에만 `exportedAt`를 기록한다.
10. `MAX_CLIPBOARD_CHARS=30000` 초과 시 clipboard target은 비활성화한다.
11. partial success 시 성공/실패 target을 배너에 분리해 표기한다.
12. 코멘트 액션 경로 배너는 5초 auto-dismiss를 적용하고, 비코멘트 배너는 수동 dismiss를 유지한다.

## 5. 마커 매핑 규칙

1. 코드 뷰어 마커는 코멘트 startLine 기준 line별 count badge + hover preview를 제공한다.
2. rendered markdown 마커는 `data-source-line` 기반 매핑 + hover preview를 제공한다.
3. 매핑 우선순위: exact-match -> nearest fallback
4. nearest 동률이면 더 작은 line 우선
5. hover preview는 최대 3개 코멘트를 표시하고, 초과분은 `+N more`로 요약한다.
6. hover preview는 read-only이며 닫힘 조건은 mouse leave, `Esc`, outside click이다.

## 6. 대규모 워크스페이스 lazy indexing 규칙

1. 인덱싱 시 디렉토리별 child cap(`WORKSPACE_INDEX_DIRECTORY_CHILD_CAP=500`)을 적용한다.
2. 원격 마운트(`detectRemoteMountPoint` 기반)에서는 추가로 깊이 제한(`WORKSPACE_INDEX_SHALLOW_DEPTH=3`)을 적용한다.
3. child cap 초과 디렉토리는 첫 500개 항목만 포함하고 `childrenStatus='partial'` + `totalChildCount`를 설정한다.
4. 깊이 제한 도달 디렉토리는 `children=[]`, `childrenStatus='not-loaded'`로 설정한다.
5. `not-loaded` 디렉토리 확장 시 `workspace:indexDirectory`로 on-demand 로드한다.
6. polling watcher는 child cap 초과 디렉토리를 자동 제외하여 과대 디렉토리 반복 스캔을 방지한다.
7. `isFilePathPotentiallyPresent` 헬퍼로 un-indexed 서브트리 내 active file이 re-index 시 클리어되지 않도록 보호한다.

## 7. 파일 트리 변경 마커 가시화 규칙

1. 변경 파일이 현재 visible이면 파일 노드에 `●`를 표시한다.
2. 변경 파일이 collapse된 디렉토리 하위에 있으면 nearest visible collapsed ancestor 디렉토리에 `●`를 표시한다.
3. 디렉토리를 확장하면 마커는 더 하위 visible 노드로 이동한다.
