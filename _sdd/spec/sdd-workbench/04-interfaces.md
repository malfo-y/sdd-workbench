# 04. Interfaces

## 1. 핵심 타입 계약

```ts
type SelectionState = { startLine: number; endLine: number } | null

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
3. `_COMMENTS.md`는 export 산출물(재생성)이며 source of truth가 아님

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
| `workspace:watchStart` / `workspace:watchStop` | Renderer -> Main (`invoke`) | watcher lifecycle |
| `workspace:watchEvent` | Main -> Renderer (`send`) | 변경 파일 + 구조변경 플래그 |
| `workspace:historyNavigate` | Main -> Renderer (`send`) | back/forward 이벤트 |
| `system:openInIterm` / `system:openInVsCode` | Renderer -> Main (`invoke`) | 외부 툴 열기 |
| `workspace:readComments` | Renderer -> Main (`invoke`) | comments 읽기 |
| `workspace:writeComments` | Renderer -> Main (`invoke`) | comments 쓰기 |
| `workspace:exportCommentsBundle` | Renderer -> Main (`invoke`) | `_COMMENTS.md`/bundle 저장 |

## 4. 코멘트/Export 정책 계약

1. `Add Comment`는 CodeViewer/SpecViewer 모두에서 동일 저장 플로우를 사용한다.
2. Export 대상은 pending comments(`exportedAt` 없음)만 포함한다.
3. target 중 1개 이상 성공하면 해당 snapshot comment에 `exportedAt`를 기록한다.
4. `MAX_CLIPBOARD_CHARS=30000` 초과 시 clipboard target은 비활성화한다.
5. partial success 시 성공/실패 target을 배너에 분리해 표기한다.

## 5. 마커 매핑 규칙

1. 코드 뷰어 마커는 라인별 count badge + hover preview를 제공한다.
2. rendered markdown 마커는 `data-source-line` 기반 매핑 + hover preview를 제공한다.
3. 매핑 우선순위: exact-match -> nearest fallback
4. nearest 동률이면 더 작은 line 우선
5. hover preview는 최대 3개 코멘트를 표시하고, 초과분은 `+N more`로 요약한다.
6. hover preview는 read-only이며 닫힘 조건은 mouse leave, `Esc`, outside click이다.

## 6. 파일 트리 변경 마커 가시화 규칙

1. 변경 파일이 현재 visible이면 파일 노드에 `●`를 표시한다.
2. 변경 파일이 collapse된 디렉토리 하위에 있으면 nearest visible collapsed ancestor 디렉토리에 `●`를 표시한다.
3. 디렉토리를 확장하면 마커는 더 하위 visible 노드로 이동한다.
