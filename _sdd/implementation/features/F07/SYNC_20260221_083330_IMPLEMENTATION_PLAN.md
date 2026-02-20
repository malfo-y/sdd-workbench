# IMPLEMENTATION_PLAN (F07)

## 1. Overview

F07의 목표는 워크스페이스별 파일 변경 watcher를 도입하고,
파일 트리에서 변경 표시(`●`)를 안정적으로 노출하는 것이다.

핵심 전제:
- 멀티 워크스페이스 정책(F03.5)과 active workspace 규칙(섹션 11.3)을 유지한다.
- watcher는 `openWorkspace` 직후 시작하고, `closeWorkspace` 시 즉시 정리한다.
- F07.1(파일 히스토리 Back/Forward)은 본 범위에 포함하지 않는다.

기준 문서:
- `/_sdd/spec/main.md` 섹션 `9.2`, `10.1`, `11.3`, `12.2 (F07)`, `13.1`

## 2. Scope (In/Out)

### In Scope
- Main 프로세스 watcher 등록/해제 + workspace 단위 debounce
- Renderer로 `workspaceId` 포함 변경 이벤트 전달
- 워크스페이스 세션 상태에 `changedFiles` 저장
- 파일 트리 파일 항목에 변경 표시(`●`) 렌더
- 워크스페이스 전환 시 변경 표시 분리 유지
- 워크스페이스 제거 시 watcher 정리
- 단위/통합 테스트와 품질 게이트 검증

### Out of Scope
- diff 뷰
- F07.1 파일 히스토리 네비게이션
- 변경 표시 영속화(앱 재시작 복원)
- 키보드 단축키/고급 필터링 UI

## 3. Components

1. **IPC Watch Bridge**
- preload + 타입 계약으로 watch 시작/종료/이벤트 구독 API 제공

2. **Main Watch Service**
- workspace별 watcher registry, debounce, 경로 정규화, 이벤트 송신

3. **Workspace State Layer**
- `WorkspaceSession.changedFiles` 저장/갱신/정리 규칙

4. **Workspace Provider Lifecycle Layer**
- `openWorkspace`/`closeWorkspace` 시 watch lifecycle 연동
- watch 이벤트를 workspace 세션으로 라우팅

5. **File Tree Indicator Layer**
- 파일 항목 `●` 변경 표시 렌더

6. **Validation Layer**
- 모델/컴포넌트/통합 테스트 + 품질 게이트

## 4. Implementation Phases

### Phase 1: Watch Infrastructure

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | watcher IPC 타입/브리지 확장 | P0 | - | IPC Watch Bridge |
| T2 | Main watcher 서비스 구현(등록/해제/debounce/이벤트 송신) | P0 | T1 | Main Watch Service |

### Phase 2: Renderer State Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | WorkspaceSession에 `changedFiles` 상태 모델 추가 | P0 | - | Workspace State Layer |
| T4 | WorkspaceProvider에 watch lifecycle + 이벤트 라우팅 연동 | P0 | T1,T2,T3 | Workspace Provider Lifecycle Layer |
| T5 | FileTree 변경 표시(`●`) 렌더 통합 | P0 | T3,T4 | File Tree Indicator Layer |

### Phase 3: Validation and Hardening

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T6 | 테스트 보강 + 회귀/게이트 검증 | P0 | T1,T2,T3,T4,T5 | Validation Layer |

## 5. Task Details

### Task T1: watcher IPC 타입/브리지 확장
**Component**: IPC Watch Bridge  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
watch 시작/종료/이벤트 구독을 Renderer에서 안전하게 사용할 수 있도록 preload API와 타입 계약을 확장한다.

**Acceptance Criteria**:
- [ ] preload에 watch 시작 API가 추가된다.
- [ ] preload에 watch 종료 API가 추가된다.
- [ ] preload에 watch 이벤트 구독/해제 API가 추가된다.
- [ ] renderer 타입(`Window.workspace`)이 확장된 API와 일치한다.

**Target Files**:
- [M] `electron/preload.ts` -- `watchStart`, `watchStop`, `onWatchEvent` 브리지 추가
- [M] `electron/electron-env.d.ts` -- watch 관련 request/response/listener 타입 추가

**Technical Notes**:
- 이벤트 payload는 `{ workspaceId, changedRelativePaths: string[] }`로 고정한다.
- listener 등록 API는 unsubscribe 함수를 반환하도록 설계한다.

**Dependencies**: -

---

### Task T2: Main watcher 서비스 구현(등록/해제/debounce/이벤트 송신)
**Component**: Main Watch Service  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
workspace별 watcher registry를 구현하고, 변경 이벤트를 debounce하여 Renderer로 전달한다.

**Acceptance Criteria**:
- [ ] `workspace:watchStart` 호출 시 workspace별 watcher가 생성된다.
- [ ] `workspace:watchStop` 호출 시 해당 watcher와 타이머가 정리된다.
- [ ] 이벤트는 workspace 단위 debounce(200~500ms) 후 일괄 전송된다.
- [ ] 전달 경로는 rootPath 밖 파일을 제외하고 상대경로로 정규화된다.
- [ ] ignore 디렉터리 정책(`.git`, `node_modules`, `dist`, `build`, `out`, `.next`, `.turbo`)이 watcher에도 적용된다.

**Target Files**:
- [M] `electron/main.ts` -- IPC 핸들러 등록 + watcher lifecycle/이벤트 송신 구현
- [M] `package.json` -- watcher 라이브러리(`chokidar`) 의존성 추가
- [M] `package-lock.json` -- lockfile 갱신

**Technical Notes**:
- recursive watcher 안정성을 위해 `chokidar` 사용을 기본으로 한다.
- rename/unlink 이벤트에서도 상대경로를 일관 처리한다.
- 앱 종료/창 닫힘 시 남은 watcher cleanup을 보장한다.

**Dependencies**: T1

---

### Task T3: WorkspaceSession에 `changedFiles` 상태 모델 추가
**Component**: Workspace State Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
워크스페이스 세션에 변경 파일 목록 상태를 추가하고, 모델 전이 함수에서 안전하게 갱신할 수 있도록 확장한다.

**Acceptance Criteria**:
- [ ] `WorkspaceSession`에 `changedFiles` 필드가 추가된다.
- [ ] workspace별로 `changedFiles`가 독립 유지된다.
- [ ] 세션 생성/제거/전환 시 기존 모델 규칙과 충돌하지 않는다.

**Target Files**:
- [M] `src/workspace/workspace-model.ts` -- 세션 타입/초기값에 `changedFiles` 추가
- [M] `src/workspace/workspace-model.test.ts` -- workspace별 `changedFiles` 분리/유지 테스트 추가

**Technical Notes**:
- 상태 저장 타입은 스펙대로 `string[]`를 유지한다(내부 처리 시 Set 변환 가능).
- 전환 시 `selectionRange` 리셋 기존 정책은 유지한다.

**Dependencies**: -

---

### Task T4: WorkspaceProvider에 watch lifecycle + 이벤트 라우팅 연동
**Component**: Workspace Provider Lifecycle Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`openWorkspace`/`closeWorkspace` 흐름에 watcher 시작/종료를 연결하고,
watch 이벤트를 해당 workspace 세션의 `changedFiles`로 라우팅한다.

**Acceptance Criteria**:
- [ ] 신규 workspace open 직후 watch start가 호출된다.
- [ ] 기존 workspace 재포커스 시 중복 watch start가 발생하지 않는다.
- [ ] close workspace 시 watch stop이 호출되고 관련 내부 상태가 정리된다.
- [ ] watch 이벤트는 payload의 `workspaceId` 기준으로 정확히 해당 세션에만 반영된다.
- [ ] 이벤트 수신 중 존재하지 않는 workspaceId는 안전하게 무시된다.

**Target Files**:
- [M] `src/workspace/workspace-context.tsx` -- watch start/stop 호출 + onWatchEvent 구독/정리 + `changedFiles` 갱신
- [M] `src/workspace/use-workspace.ts` -- 확장된 context 값 타입 소비 정합성 유지

**Technical Notes**:
- watch 구독 해제는 provider unmount에서 반드시 보장한다.
- 파일 읽기 request token 경합 제어 로직과 충돌하지 않도록 watch 업데이트를 분리한다.

**Dependencies**: T1,T2,T3

---

### Task T5: FileTree 변경 표시(`●`) 렌더 통합
**Component**: File Tree Indicator Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
파일 트리 파일 항목에 변경 마커(`●`)를 표시하고, active/expanded/우클릭 동작과 함께 공존하도록 UI를 확장한다.

**Acceptance Criteria**:
- [ ] 변경된 파일 항목에 `●` 마커가 표시된다.
- [ ] 워크스페이스 전환 시 각 워크스페이스 변경 표시가 분리 유지된다.
- [ ] 디렉터리 토글, 파일 선택, 우클릭 복사 동작이 회귀하지 않는다.

**Target Files**:
- [M] `src/file-tree/file-tree-panel.tsx` -- `changedFiles` prop 반영 + 파일 라벨에 변경 마커 렌더
- [M] `src/App.tsx` -- workspace의 `changedFiles`를 FileTreePanel로 전달
- [M] `src/App.css` -- 변경 마커 스타일 추가
- [M] `src/file-tree/file-tree-panel.test.tsx` -- 변경 마커 렌더/기존 동작 회귀 테스트

**Technical Notes**:
- 마커는 파일 노드에만 표시하고 디렉터리에는 표시하지 않는다.
- 마커 표시 문자열은 스펙대로 `●`를 사용한다.

**Dependencies**: T3,T4

---

### Task T6: 테스트 보강 + 회귀/게이트 검증
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
watch 이벤트 반영, workspace 분리, watcher 정리, UI 표시를 자동화 테스트로 고정하고 품질 게이트를 통과시킨다.

**Acceptance Criteria**:
- [ ] App 통합 테스트에서 watch 이벤트 -> 파일 트리 마커 반영이 검증된다.
- [ ] 멀티 워크스페이스 전환 시 마커 분리 유지가 검증된다.
- [ ] close workspace 시 watch stop 호출이 검증된다.
- [ ] `npm test`, `npm run lint`, `npm run build`가 통과한다.

**Target Files**:
- [M] `src/App.test.tsx` -- watch API mock + 이벤트 주입 + workspace별 마커/cleanup 테스트 추가
- [M] `src/workspace/workspace-model.test.ts` -- 상태 모델 회귀 보강(필요 시)

**Technical Notes**:
- watch 이벤트 mock은 테스트 헬퍼로 listener 등록/emit을 명시 제어한다.
- 기존 F04/F05/F06.2 회귀 시나리오와 테스트 충돌이 없도록 명확히 분리한다.

**Dependencies**: T1,T2,T3,T4,T5

## 6. Parallel Execution Summary

- Group A: `T1`, `T3` (파일 충돌 없음, 병렬 가능)
- Group B: `T2` (Main/패키지 변경 단독)
- Group C: `T4` (`workspace-context.tsx` 중심, T1/T2/T3 완료 후 진행)
- Group D: `T5` (`App.tsx` + FileTree UI, T4 이후 진행 권장)
- Group E: `T6` (최종 검증)

파일 충돌/순차 권장 지점:
- `src/workspace/workspace-context.tsx`는 watch lifecycle 중심 파일이라 단일 태스크(T4)로 고정
- `src/App.tsx`는 F07 UI wiring과 다른 후속 기능(F07.1/F08/F09) 충돌 가능성이 높아 T5에서만 변경
- `electron/main.ts`와 `package*.json`은 T2에서 묶어 일관 적용

예상 critical path:
- `T1 -> T2 -> T4 -> T5 -> T6`

## 7. Risks & Mitigations

1. **Risk**: watcher 누수(닫힌 workspace의 watcher 미정리)  
**Mitigation**: `closeWorkspace`/provider unmount/app 종료 경로에서 stop+cleanup 강제

2. **Risk**: 변경 이벤트 폭주로 renderer 과부하  
**Mitigation**: workspace 단위 debounce + 중복 경로 합집합 전송

3. **Risk**: 경로 정규화 실패로 workspace 외부 경로 반영  
**Mitigation**: Main에서 rootPath 경계 검사 후 상대경로만 전송

4. **Risk**: 멀티 워크스페이스 이벤트 오염  
**Mitigation**: payload `workspaceId` 기반 라우팅, unknown workspaceId 무시

## 8. Open Questions

1. IPC 표(섹션 9.2)에 `workspace:watchStop`이 명시되어 있지 않다.  
권장: 구현에는 `workspace:watchStop`을 포함하고, 이후 `spec-update-todo/spec-update-done`에서 IPC 표를 동기화한다.

2. 변경 마커 해제 정책(예: 파일 열람 시 자동 해제)은 스펙에 명시되어 있지 않다.  
권장 MVP: 자동 해제 없이 watcher 이벤트 기반 누적 표시를 유지하고, 추후 UX 피드백으로 정책 확정.
