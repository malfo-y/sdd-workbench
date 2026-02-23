# IMPLEMENTATION_PLAN (F15)

## 1. Overview

F15의 목표는 SSHFS(또는 유사 마운트) 경로를 기존 워크스페이스 흐름과 동일하게 다루면서,
watcher를 `auto + manual override` 정책으로 안정화하는 것이다.

이번 계획은 아직 스펙 본문(`/_sdd/spec`)에 반영되지 않은 드래프트를 구현 기준으로 삼는다.

기준 입력:

- `/_sdd/drafts/feature_draft_f15_remote_workspace_via_sshfs.md`

핵심 구현 축은 4가지다.

1. watcher 계약 확장(`WatchMode`, `WatchModePreference`)
2. `/Volumes/*` 휴리스틱 + 워크스페이스별 override 우선순위 고정
3. main 프로세스 watcher 런타임(native/polling/fallback) 안정화
4. 워크스페이스 상태/영속화/UI 연결 + 회귀 테스트 고정

---

## 2. Scope (In/Out)

### In Scope

- `workspace:watchStart` 요청/응답 계약에 모드 선호/해결 결과 추가
- 경로 휴리스틱(`/Volumes/*`) 기반 auto 모드 판정
- 워크스페이스별 수동 override(`auto|native|polling`) 적용
- main 프로세스 polling watcher 런타임(메타데이터 diff)
- native watcher 실패 시 polling fallback
- 세션 상태(`watchModePreference`, `watchMode`, `isRemoteMounted`) 저장/복원
- Current Workspace 영역의 모드 표시/선호 선택 UI 추가
- 단위/통합 테스트 보강

### Out of Scope

- SSH/SFTP 인증/세션/원격 실행
- 원격 터미널/포트포워딩
- polling 고급 최적화(open/recent/expanded 대상 축소)
- 전역 Settings 화면 추가

---

## 3. Components

1. **Watch Mode Contract Layer**
- Electron bridge/main/renderer 간 watcher 계약 타입 확장

2. **Watch Mode Resolver Layer**
- `manual override > auto heuristic` 우선순위 판정

3. **Main Watch Runtime Layer**
- native/polling watcher 분기 실행, 변경 이벤트 송신, fallback

4. **Workspace State & Persistence Layer**
- workspace session 상태/액션/로컬 스토리지 스냅샷 확장

5. **UI Indicator & Control Layer**
- Current Workspace 블록 내 모드 표시 + 선호값 선택 UI

6. **Validation Layer**
- resolver 단위 테스트 + App/Workspace 통합 회귀 테스트

---

## 4. Implementation Phases

### Phase 1: 계약 + 판정 + 런타임 기반 (P0)

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | watcher 계약 타입/IPC 브리지 확장 | P0 | - | Watch Mode Contract Layer |
| T2 | watch mode resolver 유틸 추가 | P0 | T1 | Watch Mode Resolver Layer |
| T3 | main watcher 분기(native/polling) + polling diff 엔진 | P0 | T1,T2 | Main Watch Runtime Layer |

### Phase 2: 상태/복원/UI + fallback 통합 (P0~P1)

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T4 | native 실패 시 polling fallback + 사용자 안내 연결 | P1 | T3 | Main Watch Runtime Layer |
| T5 | WorkspaceSession 상태/액션 확장 | P0 | T1,T3 | Workspace State & Persistence Layer |
| T6 | preference 영속화/복원 + watchStart 재연결 | P0 | T5 | Workspace State & Persistence Layer |
| T7 | Current Workspace 모드 표시 + override selector UI | P1 | T5,T6 | UI Indicator & Control Layer |

### Phase 3: 검증/회귀 고정 (P0)

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T8 | resolver 단위 테스트 추가 | P0 | T2 | Validation Layer |
| T9 | App/Workspace 통합 테스트 보강 | P0 | T4,T6,T7 | Validation Layer |

---

## 5. Task Details

### Task T1: watcher 계약 타입/IPC 브리지 확장

**Component**: Watch Mode Contract Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`watchStart` 계약을 확장해 watch mode 선호 입력과 resolved mode/remote/fallback 출력을 전달한다.
main/preload/renderer 타입 정합성을 먼저 고정한다.

**Acceptance Criteria**:

- [ ] `WatchMode = 'native' | 'polling'` 타입이 추가된다.
- [ ] `WatchModePreference = 'auto' | 'native' | 'polling'` 타입이 추가된다.
- [ ] `watchStart` 요청에 `watchModePreference` 필드가 추가된다.
- [ ] `watchStart` 응답에 `watchMode`, `isRemoteMounted`, `fallbackApplied`가 포함된다.
- [ ] preload API와 `window.workspace` 타입 선언이 일치한다.

**Target Files**:

- [M] `electron/electron-env.d.ts` -- watcher 계약 타입 확장
- [M] `electron/preload.ts` -- `watchStart` 인자/응답 브리지 반영
- [M] `src/workspace/workspace-context.tsx` -- `watchStart` 호출 타입 반영

**Technical Notes**:

- 기존 `watchStart(workspaceId, rootPath)` 식별자는 유지하고 3번째 preference 인자를 추가한다.
- backward compatibility는 renderer 호출부에서 기본값 `auto`를 주입해 맞춘다.

**Dependencies**: -

---

### Task T2: watch mode resolver 유틸 추가

**Component**: Watch Mode Resolver Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`manual override > auto heuristic` 정책으로 resolved mode를 계산하는 순수 유틸을 추가한다.

**Acceptance Criteria**:

- [ ] `auto` + `/Volumes/*` 경로에서 `polling + isRemoteMounted=true`로 계산된다.
- [ ] `auto` + non-`/Volumes/*` 경로에서 `native + isRemoteMounted=false`로 계산된다.
- [ ] `native|polling` override는 경로와 무관하게 강제 적용된다.
- [ ] 판정 결과에 `resolvedBy: 'override' | 'heuristic'`가 포함된다.

**Target Files**:

- [C] `electron/workspace-watch-mode.ts` -- resolver 구현
- [M] `electron/main.ts` -- watchStart에서 resolver 사용

**Technical Notes**:

- 경로 비교 전 slash normalize를 적용한다.
- prefix 체크는 최소 MVP 규칙으로 `/Volumes/` 고정한다.

**Dependencies**: T1

---

### Task T3: main watcher 분기(native/polling) + polling diff 엔진

**Component**: Main Watch Runtime Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
main 프로세스 watcher 엔트리를 mode-aware 구조로 바꾸고 polling 루프로 변경 감지를 송신한다.

**Acceptance Criteria**:

- [ ] watchStart 시 resolved mode에 따라 native 또는 polling 엔트리가 생성된다.
- [ ] polling 루프가 일정 간격(기본 1500ms)으로 `mtimeMs + size` diff를 계산한다.
- [ ] 변경 파일은 기존 `workspace:watchEvent` payload 형식으로 송신된다.
- [ ] watchStop/close 시 native watcher 및 polling timer가 누수 없이 정리된다.

**Target Files**:

- [M] `electron/main.ts` -- watcher registry 확장 + polling 구현

**Technical Notes**:

- 초기 스냅샷 구성은 기존 ignore 정책과 동일 경로 필터를 재사용한다.
- F15에서는 full-tree scan을 허용하고, 성능 최적화는 F15.x로 분리한다.

**Dependencies**: T1, T2

---

### Task T4: native 실패 시 polling fallback + 사용자 안내 연결

**Component**: Main Watch Runtime Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:
native watcher 시작 실패를 hard-fail로 끝내지 않고 polling fallback으로 강등 성공(degraded success) 처리한다.

**Acceptance Criteria**:

- [ ] native watcher 생성 실패 시 polling으로 자동 fallback 시도한다.
- [ ] fallback 성공 응답에 `fallbackApplied=true`가 포함된다.
- [ ] renderer에 fallback 안내 배너가 노출된다.
- [ ] fallback 경로에서도 watchStop 정리가 정상 동작한다.

**Target Files**:

- [M] `electron/main.ts` -- fallback 분기 + 응답 플래그
- [M] `src/workspace/workspace-context.tsx` -- fallback 배너 메시지 처리

**Technical Notes**:

- fallback 실패 시에만 `ok:false`를 반환한다.

**Dependencies**: T3

---

### Task T5: WorkspaceSession 상태/액션 확장

**Component**: Workspace State & Persistence Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
workspace session에 watch 관련 상태를 추가하고 preference 변경 액션을 노출한다.

**Acceptance Criteria**:

- [ ] `WorkspaceSession`에 `watchModePreference`, `watchMode`, `isRemoteMounted`가 추가된다.
- [ ] watchStart 성공 시 해당 session에 resolved mode/remote가 기록된다.
- [ ] workspace별 preference 변경 액션이 제공된다.
- [ ] workspace 전환 시 session별 상태가 섞이지 않는다.

**Target Files**:

- [M] `src/workspace/workspace-model.ts` -- session 타입/초기값 확장
- [M] `src/workspace/workspace-context.tsx` -- 상태 반영 + 액션 노출
- [M] `src/workspace/use-workspace.ts` -- context 인터페이스 노출 동기화
- [M] `src/workspace/workspace-model.test.ts` -- 상태 전이 테스트 보강

**Technical Notes**:

- 기본 preference는 `auto`로 통일한다.

**Dependencies**: T1, T3

---

### Task T6: preference 영속화/복원 + watchStart 재연결

**Component**: Workspace State & Persistence Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
watch preference를 세션 스냅샷에 저장하고 앱 재시작 hydrate 시 복원한다.

**Acceptance Criteria**:

- [ ] persistence 스키마에 `watchModePreference`가 추가된다.
- [ ] snapshot에 값이 없으면 `auto`로 안전 fallback한다.
- [ ] hydrate 후 watchStart가 복원된 preference를 사용한다.
- [ ] 기존 snapshot(v1)과 하위호환이 유지된다.

**Target Files**:

- [M] `src/workspace/workspace-persistence.ts` -- snapshot 스키마 확장
- [M] `src/workspace/workspace-context.tsx` -- hydrate/start pipeline 반영
- [M] `src/workspace/workspace-persistence.test.ts` -- 하위호환/복원 테스트 보강

**Technical Notes**:

- 스키마 키 변경이 필요하면 버전 suffix 업데이트를 검토한다.

**Dependencies**: T5

---

### Task T7: Current Workspace 모드 표시 + override selector UI

**Component**: UI Indicator & Control Layer  
**Priority**: P1-High  
**Type**: Feature

**Description**:
현재 워크스페이스 영역에 mode/preference/remote 정보를 표시하고 preference를 변경할 수 있게 한다.

**Acceptance Criteria**:

- [ ] active workspace에서 `Mode`와 `Preference`가 표시된다.
- [ ] remote mount일 때 `[REMOTE]` 배지가 표시된다.
- [ ] `Auto/Native/Polling` selector 변경 시 해당 workspace preference가 즉시 반영된다.
- [ ] active workspace가 없으면 컨트롤이 숨김 또는 disabled 처리된다.
- [ ] 기존 헤더 버튼/레이아웃 동작 회귀가 없다.

**Target Files**:

- [M] `src/App.tsx` -- mode 정보/selector 렌더 및 액션 연결
- [M] `src/App.css` -- mode/preference/remote UI 스타일
- [M] `src/App.test.tsx` -- UI 표시/selector 상호작용 테스트 보강

**Technical Notes**:

- F12 헤더 액션 배치와 충돌하지 않게 Current Workspace 카드 내부에 배치한다.

**Dependencies**: T5, T6

---

### Task T8: resolver 단위 테스트 추가

**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
resolver 규칙(휴리스틱/override 우선순위)을 표 기반 테스트로 고정한다.

**Acceptance Criteria**:

- [ ] `/Volumes/* + auto` 케이스 검증
- [ ] `non-/Volumes + auto` 케이스 검증
- [ ] `native override`, `polling override` 강제 케이스 검증
- [ ] path normalize 경계(`\\` 포함) 케이스 검증

**Target Files**:

- [C] `electron/workspace-watch-mode.test.ts` -- resolver 단위 테스트

**Technical Notes**:

- 입력/출력 테이블 기반 케이스로 규칙 변경 감지를 명확히 한다.

**Dependencies**: T2

---

### Task T9: App/Workspace 통합 테스트 보강

**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
watchStart 모드 응답, fallback 플래그, preference 복원, watchEvent 반영을 통합 시나리오로 검증한다.

**Acceptance Criteria**:

- [ ] `polling+remote` 응답 시 UI와 session 상태가 일치한다.
- [ ] preference 변경 후 재시작/재watch에서 override 우선순위가 유지된다.
- [ ] fallbackApplied 응답에서 배너 노출이 검증된다.
- [ ] watchEvent 기반 changed marker/active file refresh 흐름이 회귀하지 않는다.

**Target Files**:

- [M] `src/App.test.tsx` -- end-to-end UI 상태 시나리오 추가
- [M] `src/workspace/workspace-context.tsx` -- 테스트 보조 분기 최소 조정(필요 시)
- [M] `src/workspace/workspace-model.test.ts` -- preference 관련 상태 전이 회귀 추가

**Technical Notes**:

- 기존 mock(`watchStartMock`, `watchStopMock`, watchEvent emitter)를 재사용한다.

**Dependencies**: T4, T6, T7

---

## 6. Parallel Execution Summary

| Phase | Total Tasks | Max Parallel | File Conflicts |
|-------|-------------|--------------|----------------|
| Phase 1 | 3 | 2 | `electron/main.ts` (T2/T3) |
| Phase 2 | 4 | 2 | `src/workspace/workspace-context.tsx` (T4/T5/T6), `src/App.tsx` (T7) |
| Phase 3 | 2 | 2 | `src/App.test.tsx` (T7/T9 영향), `src/workspace/workspace-model.test.ts` (T5/T9) |

**권장 실행 순서**:

1. Phase 1 완료 후 smoke 확인
2. Phase 2에서 상태/복원/UI를 묶어 완성
3. Phase 3에서 테스트 고정 후 회귀 점검

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| full-tree polling으로 CPU 부하 증가 | Medium | 기본 1500ms 간격 유지, ignore 규칙 재사용, 고급 최적화는 후속 분리 |
| `/Volumes` 휴리스틱 오판 | Medium | override 제공(강제 native/polling), resolver 테스트 고정 |
| 계약/상태 확장으로 회귀 위험 증가 | High | 타입 계약 선행(T1), 통합 테스트(T9)로 주요 플로우 고정 |
| fallback 경로 누락으로 종료 지연/리소스 누수 | High | T3/T4에서 watchStop cleanup 케이스를 명시 테스트 |

---

## 8. Open Questions

- 현재 없음

