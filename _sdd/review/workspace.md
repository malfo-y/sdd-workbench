# Code Quality Review: Workspace 상태 관리

**날짜**: 2026-04-14
**세션**: R2
**리뷰 깊이**: 정밀 — 상태 흐름과 reducer 로직을 라인 단위로 추적

## 리뷰 대상 파일

| 파일 | LOC | 비고 |
|------|-----|------|
| `src/workspace/workspace-context.tsx` | 3,677 | 상태 정의, 이펙트, IPC 호출 |
| `src/workspace/workspace-model.ts` | 1,203 | reducer, 액션, 상태 전이 |
| `src/workspace/workspace-persistence.ts` | 403 | 직렬화, localStorage, 복원 로직 |
| `src/workspace/remote-connect-modal.tsx` | 707 | SSH 연결 UI, 폼 검증 |
| `src/workspace/path-format.ts` | 117 | 경로 정규화 |
| `src/workspace/workspace-switcher.tsx` | 54 | 탭 전환 UI |
| `src/workspace/use-workspace.ts` | 10 | context hook |

## 발견 사항 요약

| # | 심각도 | 카테고리 | 위치 | 설명 |
|---|--------|---------|------|------|
| F1 | Critical | Q1 | workspace-context.tsx (전체) | 3,677줄 God Component — 단일 Provider에 30+ useCallback, 10+ useEffect |
| F2 | High | Q8 | workspace-context.tsx:1929 | loadWorkspaceSpec — IIFE `void (async () => {})()` 패턴의 에러 미전파 |
| F3 | High | Q8 | workspace-context.tsx:2204 | loadWorkspaceFile — 동일 IIFE 패턴, 비동기 에러가 호출자에게 전달 안 됨 |
| F4 | High | Q8 | workspace-context.tsx:3383-3398 | 외부 변경 감지 시 레이스 컨디션 — activeFile 비교를 클로저 밖에서 수행 |
| F5 | High | Q9 | workspace-context.tsx:3314-3453 | onWatchEvent useEffect — 의존성 배열 정확하지만 콜백 재생성 시 이전 구독 해제 후 새 구독 사이에 이벤트 유실 가능 |
| F6 | High | Q4 | workspace-context.tsx (다수) | 비동기 IPC 호출 boilerplate 반복 — requestId 발급 → loading 상태 세팅 → try/catch → stale check → 상태 업데이트 패턴이 10회+ 반복 |
| F7 | Medium | Q8 | workspace-context.tsx:1876 | closeWorkspace — `void disconnectRemoteWorkspace()` fire-and-forget로 에러 무시 |
| F8 | Medium | Q8 | workspace-context.tsx:1889 | closeWorkspace — `void stopWorkspaceWatch()` 역시 fire-and-forget |
| F9 | Medium | Q9 | workspace-context.tsx:762-764 | remoteBannerAutoDismissTimerRef — 컴포넌트 언마운트 시 clearTimeout 호출됨(L797-802), 정상 |
| F10 | Medium | Q4 | workspace-context.tsx:2965-2993 | hydrateExpandedDirectories와 refreshWorkspaceDirectories가 완전히 동일한 구현체 |
| F11 | Medium | Q8 | workspace-context.tsx:3121-3269 | 스냅샷 하이드레이션 — for 루프 안에서 연쇄 await, 워크스페이스가 많으면 병렬 없이 순차 복원 |
| F12 | Medium | Q8 | workspace-context.tsx:2854 | loadWorkspaceDirectoryChildren — `while (true)` 루프에 명시적 상한 없음, 서버가 계속 partial 반환 시 무한 루프 가능 |
| F13 | Medium | Q10 | workspace-context.tsx:1545 | setBannerMessage에 함수 인자 전달 — 타입 안전하지만 `setBannerMessage((currentMessage) => currentMessage ?? 'message')` 패턴이 일반 문자열 set과 혼용 |
| F14 | Medium | Q3 | workspace-context.tsx:59-141 | WorkspaceContextValue — 40+ 프로퍼티 타입, 상태/액션 분리 없음 |
| F15 | Medium | Q6 | workspace-context.tsx:927-929 | `loadWorkspaceIndex` 의존성 배열이 `[]`이지만 `hydrateExpandedDirectories`를 호출 — stale closure 아님(ref 기반), 다만 ESLint exhaustive-deps 경고 가능 |
| F16 | Low | Q4 | workspace-model.ts:580-620, 623-724 | renameWorkspaceSessionPaths와 removeWorkspaceSessionPaths — documentSessionsByPath/fileLastLineByPath/gitFileStatuses 순회 패턴이 유사 |
| F17 | Low | Q3 | workspace-persistence.ts:217-256 | readStorageValue/writeStorageValue/deleteStorageValue — `as unknown as` 이중 캐스팅 사용 |
| F18 | Low | Q10 | workspace-persistence.ts:375-377 | loadWorkspaceSessionSnapshot catch — 빈 catch로 파싱 오류 무시, 사용자에게 알림 없음 |
| F19 | Low | Q1 | workspace-context.tsx:2047-2378 | loadWorkspaceFile 함수가 ~330줄 — 단일 함수로 과대 |
| F20 | Low | Q5 | workspace-context.tsx | getActiveIsDirty vs getWorkspaceIsDirtyCompatibility vs deriveWorkspaceIsDirtyCompatibility — 유사 이름의 dirty 체크 함수 3개 |
| F21 | Low | Q4 | remote-connect-modal.tsx:50-53 | isRecord, toDraftStringField — workspace-persistence.ts에도 동일 유틸 존재 |
| F22 | Info | Q11 | workspace-context.tsx | workspace-context.tsx에 대한 테스트 파일이 없음 |
| F23 | Info | Q5 | workspace-model.ts:315-348 | markWorkspaceDocumentDirtyCompatibility — "Legacy compatibility helper" 주석, 장기 유지 의도 불명확 |
| F24 | Info | Q10 | workspace-context.tsx:1577-1584 | openDialog 결과 canceled인데도 result.error 존재 시 에러 메시지 표시 — 의도적 설계지만 UX 혼란 가능 |

## 상세 발견

### F1: God Component — WorkspaceProvider (3,677줄)

- **파일**: `src/workspace/workspace-context.tsx:733-3675`
- **심각도**: Critical
- **카테고리**: Q1 — 파일/함수 크기
- **설명**: `WorkspaceProvider` 단일 컴포넌트가 3,677줄. 내부에 30개 이상의 `useCallback`과 10개 이상의 `useEffect`가 있으며, 파일 I/O, 인덱싱, Git 데코레이션, 코멘트 관리, 원격 연결, 파일 감시, 스냅샷 복원 등 전혀 다른 관심사를 모두 포함.
- **제안**: 관심사별로 커스텀 훅으로 분리:
  - `useWorkspaceFileOperations` — 파일 읽기/쓰기/삭제/이름변경
  - `useWorkspaceGitDecorations` — Git line markers, file statuses
  - `useWorkspaceComments` — 코멘트 CRUD
  - `useWorkspaceRemote` — 원격 연결/해제/재시도
  - `useWorkspaceWatcher` — 파일 감시 이벤트 처리
  - `useWorkspaceSnapshot` — 스냅샷 저장/복원

### F2: loadWorkspaceSpec — IIFE 비동기 에러 누락

- **파일**: `src/workspace/workspace-context.tsx:1929-2042`
- **심각도**: High
- **카테고리**: Q8 — 비동기 패턴
- **설명**: `loadWorkspaceSpec`은 `void (async () => { ... })()` 패턴으로 비동기 작업을 시작. 이 IIFE 내부의 에러는 `catch` 블록에서 UI 상태에 반영되지만, 호출자 측에서는 작업 완료 여부를 알 수 없다. `loadWorkspaceSpec`의 반환 타입이 `void`이므로 호출자가 `await`할 수 없다.
- **제안**: `async` 함수로 리팩토링하여 호출자가 필요 시 결과를 대기할 수 있게 변경. 또는 현재 구조를 유지하되, 이 패턴이 의도적임을 문서화.

### F3: loadWorkspaceFile — 동일 IIFE 패턴

- **파일**: `src/workspace/workspace-context.tsx:2204-2375`
- **심각도**: High
- **카테고리**: Q8 — 비동기 패턴
- **설명**: F2와 동일한 패턴. `loadWorkspaceFile`도 내부에서 `void (async () => { ... })()` 사용. ~170줄에 달하는 IIFE async 블록이 존재.
- **제안**: F2와 동일.

### F4: 외부 변경 감지 시 레이스 컨디션

- **파일**: `src/workspace/workspace-context.tsx:3346-3401`
- **심각도**: High
- **카테고리**: Q8 — 비동기 패턴 / 레이스 컨디션
- **설명**: `onWatchEvent` 콜백에서 `activeFile`과 `isCurrentlyDirty`를 `workspaceStateRef.current`에서 읽은 후, 이후 `setWorkspaceState` 업데이터 함수 안에서 `currentSession.activeFile !== activeFile`을 다시 체크한다(L3385). 이중 체크가 있어서 대부분의 레이스는 방어되지만, `suppressSavedActiveFileRefresh` 분기(L3380-3381)는 이 이중 체크가 없다. 빠른 연속 저장/감시 이벤트 시, 올바른 파일이 아닌 다른 파일의 refresh suppression이 발생할 수 있다.
- **제안**: `suppressSavedActiveFileRefresh` 결정을 `setWorkspaceState` 업데이터 내부로 이동하여 최신 상태 기준으로 판단.

### F5: onWatchEvent useEffect의 이벤트 유실 가능성

- **파일**: `src/workspace/workspace-context.tsx:3314-3453`
- **심각도**: High
- **카테고리**: Q9 — 메모리 누수 / 이벤트 관리
- **설명**: `useEffect`의 의존성 배열에 5개의 콜백이 포함되어 있어, 콜백 중 하나가 재생성될 때마다 이전 구독이 해제되고 새 구독이 등록된다. `unsubscribe()`와 새 `onWatchEvent()` 등록 사이에 발생한 이벤트는 유실될 수 있다. 또한 cleanup 함수(L3439-3446)에서 `watchedWorkspaceIds`를 순회하며 `watchStop`을 호출하는데, 이는 콜백 재생성 시에도 실행되어 불필요한 watcher 정지/재시작이 발생할 수 있다.
- **제안**: 핵심 콜백들을 `useRef`로 래핑하여 이벤트 핸들러의 의존성을 제거하거나, 이벤트 구독을 별도 `useEffect`로 분리하여 콜백 변경과 구독 생명주기를 분리.

### F6: 비동기 IPC 호출 boilerplate 반복

- **파일**: `src/workspace/workspace-context.tsx` (다수)
- **심각도**: High
- **카테고리**: Q4 — 코드 중복
- **설명**: 다음 패턴이 10회 이상 반복:
  ```
  1. requestId 증가 및 ref에 저장
  2. setWorkspaceState로 loading 플래그 설정
  3. try { await IPC 호출; if (stale) return; setWorkspaceState(결과) }
  4. catch { if (stale) return; setWorkspaceState(에러); setBannerMessage(에러) }
  ```
  해당 함수들: `loadWorkspaceIndex`, `loadWorkspaceGitLineMarkers`, `loadWorkspaceGitFileStatuses`, `loadWorkspaceComments`, `loadWorkspaceGlobalComments`, `saveComments`, `saveGlobalComments`, `saveFile`, `startWorkspaceWatch` 등.
- **제안**: 공통 헬퍼 함수 `executeTrackedIpcCall<T>(...)` 로 추출하여 requestId 관리, stale 체크, 에러 처리를 일원화.

### F10: 중복 함수 — hydrateExpandedDirectories / refreshWorkspaceDirectories

- **파일**: `src/workspace/workspace-context.tsx:2965-2993`
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: `hydrateExpandedDirectories`(L2965-2978)와 `refreshWorkspaceDirectories`(L2980-2993)가 완전히 동일한 구현. 두 함수 모두 targets 배열을 순회하며 `loadWorkspaceDirectoryChildren`을 호출.
- **제안**: 하나를 제거하고 나머지 하나로 통합. 의미적 차이가 필요하면 래퍼로 처리.

### F11: 스냅샷 하이드레이션의 순차 복원

- **파일**: `src/workspace/workspace-context.tsx:3121-3269`
- **심각도**: Medium
- **카테고리**: Q8 — 비동기 패턴
- **설명**: `hydrateWorkspaceState`에서 `for...of` 루프 내 `await`로 각 워크스페이스를 순차 복원. 워크스페이스가 5개면 5번 직렬 await. 특히 remote 워크스페이스의 경우 `connectRemoteWorkspace`가 네트워크 I/O를 포함하므로 복원 시간이 크게 늘어날 수 있다.
- **제안**: local 워크스페이스는 `Promise.allSettled`로 병렬 복원하고, remote는 순차 유지 (연결 순서 보장 필요 시).

### F12: loadWorkspaceDirectoryChildren — 무한 루프 위험

- **파일**: `src/workspace/workspace-context.tsx:2854-2961`
- **심각도**: Medium
- **카테고리**: Q8 — 비동기 패턴
- **설명**: `while (true)` 루프에서 `minimumChildCount`에 도달할 때까지 반복 로드. 서버가 계속 `partial` 상태를 반환하면서 children이 0개인 경우 무한 루프에 빠질 수 있다. `loadedChildCount`가 증가하지 않는 경우에 대한 방어가 없다.
- **제안**: 최대 반복 횟수(예: 20)를 도입하거나, children이 0개인 partial 응답 시 루프를 종료하는 조건 추가.

### F14: WorkspaceContextValue — 40+ 프로퍼티 타입

- **파일**: `src/workspace/workspace-context.tsx:59-141`
- **심각도**: Medium
- **카테고리**: Q3 — 타입 안전성
- **설명**: Context value 타입에 40개 이상의 프로퍼티가 flat하게 나열됨. 상태 프로퍼티와 액션 메서드가 구분 없이 섞여 있어 소비자 측에서 필요한 것만 선택하기 어렵다. `useMemo` 의존성 배열(L3629-3667)도 39개.
- **제안**: `state`, `actions`, `remote` 등으로 그룹화하여 소비자가 필요한 그룹만 구독할 수 있게 구조화. 또는 F1의 커스텀 훅 분리와 연계하여 별도 context로 분리.

### F17: workspace-persistence.ts의 이중 캐스팅

- **파일**: `src/workspace/workspace-persistence.ts:217-256`
- **심각도**: Low
- **카테고리**: Q3 — 타입 안전성
- **설명**: `readStorageValue`, `writeStorageValue`, `deleteStorageValue`에서 `storage as unknown as { getItem?: ... }` 이중 캐스팅 사용. 이는 테스트 환경에서 Storage API가 불완전할 수 있는 경우를 방어하는 것으로 보이나, `Storage` 인터페이스는 `getItem`/`setItem`/`removeItem`을 보장하므로 불필요한 방어.
- **제안**: 직접 `storage.getItem(key)` 호출로 단순화. 테스트 시 완전한 Storage mock 사용.

### F19: loadWorkspaceFile — 330줄 단일 함수

- **파일**: `src/workspace/workspace-context.tsx:2047-2378`
- **심각도**: Low
- **카테고리**: Q1 — 파일/함수 크기
- **설명**: `loadWorkspaceFile`이 약 330줄. 내부에서 draft 재사용 분기, 비동기 읽기, 이미지 프리뷰, markdown spec 동기화, git line markers 로드 등을 모두 처리.
- **제안**: "draft 재사용 경로"와 "IPC 읽기 경로"를 별도 함수로 분리.

### F20: isDirty 체크 함수 네이밍 혼란

- **파일**: `src/workspace/workspace-context.tsx:188-196`, `src/workspace/workspace-model.ts:736-744`
- **심각도**: Low
- **카테고리**: Q5 — 네이밍 일관성
- **설명**: dirty 상태를 체크하는 함수가 3개 존재:
  - `getWorkspaceIsDirtyCompatibility` (context.tsx L188) — 내부 헬퍼
  - `getActiveIsDirty` (context.tsx L1836) — useCallback 래퍼
  - `deriveWorkspaceIsDirtyCompatibility` (model.ts L736) — export되지만 context에서 사용 안 함
  - "Compatibility"라는 접미사가 F24 구현 전 레거시 호환 용도인데, 함수 이름만으로는 의도 파악이 어려움.
- **제안**: F24 구현 후 정리 대상. 레거시 호환이 불필요해지면 단일 함수로 통합.

### F21: remote-connect-modal.tsx의 중복 유틸

- **파일**: `src/workspace/remote-connect-modal.tsx:50-53`
- **심각도**: Low
- **카테고리**: Q4 — 코드 중복
- **설명**: `isRecord`, `toDraftStringField` 등이 `workspace-persistence.ts`에도 유사하게 존재(`isRecord`, `isNonEmptyString`). 모듈 간 공유 가능.
- **제안**: 공통 유틸로 추출하거나, 현재 규모에서는 허용 가능한 수준의 중복으로 유지.

### F22: workspace-context.tsx 테스트 부재

- **파일**: `src/workspace/workspace-context.tsx`
- **심각도**: Info
- **카테고리**: Q11 — 테스트 커버리지
- **설명**: 3,677줄의 핵심 상태 관리 컴포넌트에 전용 테스트 파일이 없음. `workspace-model.ts`, `workspace-persistence.ts`, `remote-connect-modal.tsx`, `path-format.ts`는 모두 테스트가 있으나, 가장 복잡한 context는 테스트가 없다. 비동기 흐름, 레이스 컨디션, 상태 전이 등이 테스트되지 않음.
- **제안**: F1의 커스텀 훅 분리 후 각 훅에 대한 단위 테스트 작성. 또는 현재 구조에서 integration 테스트 추가.

## 긍정적 패턴 (Good Patterns)

- **requestId 기반 stale request 방어**: 모든 비동기 IPC 호출에서 requestId를 발급하고, 응답 수신 시 현재 requestId와 비교하여 stale 요청을 무시하는 패턴이 일관되게 적용됨. 레이스 컨디션 방어의 핵심 전략으로 효과적.

- **workspaceStateRef를 통한 최신 상태 접근**: `useState`의 상태를 `useRef`로 동기화하여 콜백 내에서 항상 최신 상태에 접근 가능. 클로저 stale 문제를 효과적으로 해결.

- **setWorkspaceState 업데이터 함수 패턴**: 거의 모든 상태 업데이트에서 `setWorkspaceState((previous) => ...)` 함수형 업데이터를 사용하여 동시 업데이트 시 상태 유실 방지.

- **updateWorkspaceSession의 참조 동등성 최적화**: `workspace-model.ts:1101-1123`에서 `nextSession === currentSession`이면 새 상태 객체를 생성하지 않아 불필요한 리렌더링 방지.

- **방어적 정규화 패턴**: `workspace-persistence.ts`의 `normalizeWorkspaceSession`, `normalizeFileLastLineByPath` 등에서 localStorage 데이터를 로드할 때 모든 필드를 방어적으로 검증. 스키마 마이그레이션(v1→v2)도 지원.

- **savedFileRefreshSuppression**: 파일 저장 직후 watcher echo를 무시하여 에디터 undo 히스토리를 보존하는 메커니즘(L3347-3355, L1465-1467). 실용적이고 효과적인 최적화.

- **sanitizeRemoteBannerMessage**: 원격 에러 메시지에서 비밀번호/토큰/SSH 경로를 REDACTED 처리(L262-269). 보안 의식이 반영된 좋은 패턴.

- **normalizeWatchRelativePath**: 파일 경로를 정규화할 때 절대 경로, `../` 탈출, 빈 경로 등을 모두 거부하는 방어적 구현(L306-321).

- **workspace-model.ts의 순수 함수 설계**: 상태 전이 함수들이 모두 `(session, ...args) => session` 형태의 순수 함수로, 입력 불변 + 새 객체 반환 패턴을 일관되게 따름. 테스트 용이성 우수.

- **remote-connect-modal.tsx의 폼 상태 localStorage 영속화**: 사용자가 모달을 닫았다 열어도 이전 입력값이 유지됨(L202-204). 좋은 UX.

## 모듈 종합 평가

- **전체 인상**: 상태 관리 로직 자체는 견고하다. requestId 기반 stale 방어, 함수형 업데이터, ref 기반 최신 상태 접근 등 React 비동기 상태 관리의 모범적 패턴을 따르고 있다. 그러나 **단일 파일/컴포넌트에 모든 것이 집중**되어 있어 유지보수성과 가독성이 심각하게 저하됨. workspace-model.ts와 workspace-persistence.ts는 깔끔한 분리와 순수 함수 설계로 품질이 좋다.

- **가장 큰 위험**:
  1. **F1 — God Component**: 3,677줄 단일 Provider는 변경 영향 범위를 예측하기 어렵고, 새로운 기능 추가 시 regression 위험이 높다.
  2. **F4/F5 — 레이스 컨디션 & 이벤트 유실**: watcher 이벤트 처리에서의 타이밍 이슈는 데이터 손실로 이어질 수 있다.
  3. **F12 — 무한 루프 위험**: 서버 응답에 따라 UI가 무한 로딩에 빠질 수 있다.

- **권장 후속 조치**:
  1. **[P0]** F12 — `loadWorkspaceDirectoryChildren`에 최대 반복 횟수 추가 (즉시 수정 가능, 1줄)
  2. **[P1]** F4 — watcher 이벤트의 savedFileRefreshSuppression 판단을 업데이터 내부로 이동
  3. **[P1]** F10 — 중복 함수 통합 (trivial fix)
  4. **[P2]** F1 — God Component를 커스텀 훅으로 분리 (대규모 리팩토링, 별도 계획 필요)
  5. **[P2]** F6 — IPC 호출 boilerplate 헬퍼 추출
  6. **[P3]** F22 — workspace-context 테스트 추가 (F1 분리 후 진행 권장)
