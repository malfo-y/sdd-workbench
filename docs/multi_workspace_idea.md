아래는 **지금 구조(React Context + useState) 기준**으로, 나중에 멀티를 붙일 때의 설계안을 깔끔하게 정리해줄게. (MVP 끝난 후 적용하면 됨)

---

## 1) 목표 형태: 단일 → 멀티로 ‘겉 레이어’만 추가

### 지금(단일) 대략 이런 느낌일 거고

- `workspace-context.tsx`가 `WorkspaceState` 하나를 들고 있음

### 멀티로 바뀌면

- `AppContext` (or `workspace-context`)가 아래를 들고:

  - `activeWorkspaceId`

  - `workspacesById: Record<string, WorkspaceState>`

  - `openWorkspace(rootPath)`

  - `closeWorkspace(id)` (옵션)

  - `setActiveWorkspace(id)`

그리고 `use-workspace.ts`는 여전히:

- “현재 활성 워크스페이스의 상태만” 반환하도록 유지

즉, UI 컴포넌트들은 거의 수정 안 하고도 멀티가 됨.

---

## 2) 타입 설계 (추천)

```ts
type WorkspaceId = string;

type WorkspaceState = {
  id: WorkspaceId;
  rootPath: string;

  activeFile: string | null;
  activeSpec: string | null;

  changedFiles: string[]; // or Set<string> in memory
  // (MVP+1) comments?: CodeComment[]
  // 기타 워크스페이스 종속 상태들...
};

type AppState = {
  activeWorkspaceId: WorkspaceId | null;
  workspacesById: Record<WorkspaceId, WorkspaceState>;
  workspaceOrder: WorkspaceId[]; // 최근 사용 순서/탭 순서
};
```

**포인트:** “전역 상태”는 최소화하고, 웬만한 건 WorkspaceState 안으로.

---

## 3) Context API 설계 (컴포넌트 변경 최소화)

### workspace-context.tsx가 제공하는 것(예시)

- `appState` (혹은 필요한 일부)

- `activeWorkspace` (computed)

- 액션들:

  - `openWorkspace(rootPath)`

  - `setActiveWorkspace(id)`

  - `updateWorkspace(id, partial)` (or 특정 액션들)

  - `closeWorkspace(id)` (옵션)

### use-workspace.ts는 이렇게 유지

- 반환값:

  - `workspace` = activeWorkspace

  - `actions` = activeWorkspace 대상 액션들

컴포넌트 입장에서는 계속:

```ts
const { workspace, setActiveFile } = useWorkspace()
```

이렇게 “단일 워크스페이스처럼” 쓰게 만드는 게 핵심이야.

---

## 4) 제일 중요한 난관: watcher의 생명주기

멀티가 되면 watcher가 워크스페이스별로 필요해.

### 추천 패턴

- `workspacesById[id]`는 “상태”

- watcher 인스턴스는 “상태에 넣지 말고” Provider 내부의 `useRef(Map)`에 둬

예:

- `watchersRef.current.set(id, watcher)`

- workspace close 시 `watcher.close()` 하고 map에서 제거

왜냐면 watcher는 직렬화 불가 + 렌더 트리거 불필요 객체라 state에 두면 지옥임.

---

## 5) UI는 처음엔 “드롭다운 전환”이 제일 쉽다

MVP+2로 멀티 붙일 때 추천 UI:

- 상단 툴바 왼쪽에

  - `Workspace: [project-a ▼]`

  - `+ Add Workspace`

- (옵션) 최근 목록

탭 UI는 예쁘지만, 상태/레이아웃/단축키까지 고민이 늘어서 비용이 커져.

---

## 6) 로컬 UI 상태(네가 말한 selection anchor)는 그대로 두면 됨

`code-viewer-panel.tsx` 같은 곳에서 로컬로 들고 있는 UI 상태는:

- 워크스페이스 전환 시 초기화되는 게 자연스러움 (대부분 OK)

- 굳이 workspace state에 넣지 마

단, “전환해도 유지하고 싶다”가 생기면 그때만:

- `workspace.ui = { codeScrollPos, specScrollPos }` 같은 걸 추가

---

## 7) 지금 MVP에서 미리 해두면 좋은 ‘사소하지만 큰’ 준비

멀티가 쉬워지려면, 지금부터 액션 시그니처를 이렇게 만들어두는 게 좋아:

- 좋은 예:

  - `setActiveFile(path)` (active workspace에만 적용)

- 더 좋은 예(멀티 대비):

  - 내부 구현은 이미 `activeWorkspaceId`를 통해 갱신하도록 짜기

즉, 컴포넌트는 id 몰라도 되고,  
Provider 내부만 멀티 aware면 된다.

---

## 결론

지금 말한 구조(Context + useState + use-workspace 훅)는:

- ✅ 멀티 워크스페이스 확장 가능

- ✅ 컴포넌트 변경 최소화 가능

- ✅ zustand/redux 없어도 충분

난이도는 “Provider 내부 리팩토링 + watcher 분리 + UI 전환” 정도라서  
**MVP+2 정도에서 무난히 할 수 있는 수준**이야.

---
