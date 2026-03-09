# IMPLEMENTATION_PLAN (F08)

## 1. Overview

F08의 목표는 활성 워크스페이스를 macOS iTerm 또는 VSCode로 바로 여는 액션을 추가하는 것이다.
UI는 헤더가 아니라 좌측 `Current Workspace` 블록 바로 아래에 배치하고,
형태는 `Open In:` 라벨 + 아이콘 버튼 2개(iTerm, VSCode)로 고정한다.

핵심 전제:
- 멀티 워크스페이스(F03.5) 정책을 유지하고 항상 활성 워크스페이스 기준으로 동작한다.
- 액션은 `system:openInIterm`, `system:openInVsCode` IPC 채널로 Renderer -> Main invoke 흐름을 사용한다.
- 실패 시 사용자에게 텍스트 배너로 오류를 노출한다.

기준 문서:
- `/_sdd/spec/main.md` 섹션 `6`, `9.2`, `12.2 (F08)`, `13.1`
- `/_sdd/spec/decision-log.md` (2026-02-21 F08 범위/위치/UI 형태 결정)

## 2. Scope (In/Out)

### In Scope
- Main 프로세스 `system:openInIterm` / `system:openInVsCode` IPC 핸들러 구현
- preload 브리지 + `Window.workspace` 타입 계약 확장
- 좌측 `Current Workspace` 아래 `Open In:` 아이콘 버튼 UI 추가
- 활성 워크스페이스 없음 상태에서 버튼 disabled 처리
- 실행 실패 시 텍스트 배너 오류 메시지 노출
- App 테스트 보강 + 품질 게이트(`npm test`, `npm run lint`, `npm run build`)

### Out of Scope
- Terminal.app/기타 에디터 fallback
- Windows/Linux 전용 실행 전략
- global shortcut/command palette 연동
- 성공 토스트/알림 고도화

## 3. Components

1. **System Open IPC Layer**
- Main 프로세스에서 외부 앱 실행 요청을 안전하게 처리하고 결과를 반환한다.

2. **Preload Contract Layer**
- Renderer에서 사용할 API를 노출하고 타입 계약을 정합성 있게 유지한다.

3. **Workspace Summary Action UI Layer**
- 좌측 패널 `Current Workspace` 블록 아래에 `Open In:` 아이콘 버튼을 렌더한다.

4. **Banner Feedback Layer**
- 실행 실패 메시지를 기존 텍스트 배너 경로로 노출한다.

5. **Validation Layer**
- 통합 테스트 및 빌드/린트 게이트로 회귀를 차단한다.

## 4. Implementation Phases

### Phase 1: IPC Foundation

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T1 | Main IPC 핸들러 구현 (`system:openInIterm`/`system:openInVsCode`) | P0 | - | System Open IPC Layer |
| T2 | preload 브리지 + 타입 계약 확장 | P0 | T1 | Preload Contract Layer |

### Phase 2: Renderer UI Integration

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T3 | 좌측 패널 `Open In:` 액션 UI + 클릭 핸들러 구현 | P0 | T2 | Workspace Summary Action UI Layer |
| T4 | 아이콘 버튼 스타일/접근성/disabled 상태 고정 | P1 | T3 | Workspace Summary Action UI Layer |

### Phase 3: Validation and Hardening

| ID | Task | Priority | Dependencies | Component |
|----|------|----------|--------------|-----------|
| T5 | 테스트 보강 + 품질 게이트 검증 | P0 | T1,T2,T3,T4 | Validation Layer |

## 5. Task Details

### Task T1: Main IPC 핸들러 구현 (`system:openInIterm`/`system:openInVsCode`)
**Component**: System Open IPC Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
활성 워크스페이스 경로를 받아 macOS에서 iTerm/VSCode를 여는 IPC invoke 핸들러를 구현한다.
실패는 `ok: false` + 오류 메시지로 반환한다.

**Acceptance Criteria**:
- [ ] `ipcMain.handle('system:openInIterm', ...)`가 등록된다.
- [ ] `ipcMain.handle('system:openInVsCode', ...)`가 등록된다.
- [ ] `rootPath` 누락/유효하지 않은 디렉터리 경로일 때 `ok: false`를 반환한다.
- [ ] 앱 실행 실패 시 throw를 Renderer로 전파하지 않고 구조화된 오류 결과를 반환한다.

**Target Files**:
- [M] `electron/main.ts` -- IPC 채널 타입/핸들러/등록 및 외부 앱 실행 로직 추가

**Technical Notes**:
- shell 문자열 결합 대신 인자 기반 실행(`open -a ...`)으로 경로 공백/인젝션 리스크를 줄인다.
- `Visual Studio Code` 앱 이름을 기본값으로 사용한다.
- 반환 타입은 `{ ok: boolean; error?: string }` 형태로 통일한다.

**Dependencies**: -

---

### Task T2: preload 브리지 + 타입 계약 확장
**Component**: Preload Contract Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
Renderer가 `window.workspace`를 통해 F08 액션을 호출할 수 있도록 preload API와 타입 선언을 확장한다.

**Acceptance Criteria**:
- [ ] `window.workspace.openInIterm(rootPath)` API가 노출된다.
- [ ] `window.workspace.openInVsCode(rootPath)` API가 노출된다.
- [ ] preload 타입과 `electron-env.d.ts` 타입 선언이 일치한다.

**Target Files**:
- [M] `electron/preload.ts` -- system open invoke 브리지 API 추가
- [M] `electron/electron-env.d.ts` -- Window 타입 계약 확장

**Technical Notes**:
- IPC 채널명은 스펙 고정값 `system:openInIterm`, `system:openInVsCode`를 그대로 사용한다.
- 기존 workspace API 네이밍 패턴을 유지한다.

**Dependencies**: T1

---

### Task T3: 좌측 패널 `Open In:` 액션 UI + 클릭 핸들러 구현
**Component**: Workspace Summary Action UI Layer  
**Priority**: P0-Critical  
**Type**: Feature

**Description**:
`Current Workspace` 블록 바로 아래에 `Open In:` 액션 영역을 추가하고,
각 아이콘 버튼 클릭 시 활성 워크스페이스 경로로 IPC 호출을 수행한다.

**Acceptance Criteria**:
- [ ] 좌측 패널 상단에 `Open In:` 라벨 + iTerm/VSCode 버튼이 렌더된다.
- [ ] 활성 워크스페이스가 없으면 두 버튼 모두 disabled 상태다.
- [ ] iTerm 버튼 클릭 시 `window.workspace.openInIterm(rootPath)`가 호출된다.
- [ ] VSCode 버튼 클릭 시 `window.workspace.openInVsCode(rootPath)`가 호출된다.
- [ ] 호출 실패(`ok: false`) 시 배너 오류 메시지가 노출된다.

**Target Files**:
- [M] `src/App.tsx` -- action UI 렌더/클릭 핸들러/배너 오류 처리 추가

**Technical Notes**:
- 아이콘은 새 의존성을 추가하지 않고 inline SVG(또는 동등한 경량 방식)로 구현한다.
- 버튼은 tooltip(`title`) + 접근성 이름(`aria-label`)을 동일하게 설정한다.

**Dependencies**: T2

---

### Task T4: 아이콘 버튼 스타일/접근성/disabled 상태 고정
**Component**: Workspace Summary Action UI Layer  
**Priority**: P1-High  
**Type**: UX

**Description**:
F08 액션의 compact 아이콘 버튼 스타일을 추가하고,
hover/focus/disabled 시각 상태를 기존 테마와 충돌 없이 고정한다.

**Acceptance Criteria**:
- [ ] `Open In:` 라벨과 아이콘 버튼이 좌측 패널에서 compact하게 정렬된다.
- [ ] 버튼 hover/focus 스타일이 적용된다.
- [ ] disabled 상태가 시각적으로 구분되고 클릭되지 않는다.
- [ ] 모바일 브레이크포인트에서 레이아웃이 깨지지 않는다.

**Target Files**:
- [M] `src/App.css` -- `workspace-open-in`/icon button 스타일 추가

**Technical Notes**:
- 기존 `.workspace-summary` 블록과 간격 규칙을 유지한다.
- media query(<=900px)에서도 버튼 영역이 줄바꿈 가능하도록 설계한다.

**Dependencies**: T3

---

### Task T5: 테스트 보강 + 품질 게이트 검증
**Component**: Validation Layer  
**Priority**: P0-Critical  
**Type**: Test

**Description**:
F08 액션 호출/disabled/오류 배너를 App 통합 테스트로 고정하고 품질 게이트를 통과시킨다.

**Acceptance Criteria**:
- [ ] 워크스페이스 미선택 상태에서 iTerm/VSCode 버튼 disabled가 검증된다.
- [ ] 워크스페이스 선택 후 iTerm/VSCode 호출 인자가 rootPath로 전달됨이 검증된다.
- [ ] `ok: false` 응답 시 배너 오류 메시지 노출이 검증된다.
- [ ] `npm test`, `npm run lint`, `npm run build`가 통과한다.

**Target Files**:
- [M] `src/App.test.tsx` -- F08 버튼 렌더/호출/오류 처리 테스트 추가

**Technical Notes**:
- `window.workspace` mock에 `openInIterm`, `openInVsCode`를 추가한다.
- 기존 F01~F07.1 테스트와 충돌하지 않도록 시나리오를 독립 테스트 케이스로 분리한다.

**Dependencies**: T1,T2,T3,T4

## 6. Parallel Execution Summary

- Group A: `T1` (Main IPC) / `T3` 준비(초기 UI 스캐폴딩) 병렬 가능
- Group B: `T2` (preload + d.ts) 는 `T1` 채널명 확정 직후 진행 권장
- Group C: `T3` + `T4`는 `src/App.tsx`/`src/App.css` 파일 분리로 병렬 가능
- Group D: `T5`는 최종 통합 검증 단계로 순차 진행

파일 충돌/순차 권장 지점:
- `electron/main.ts`는 T1 단독 변경으로 유지
- `src/App.tsx`는 최근 F06/F07/F07.1 변경이 누적된 파일이라 T3 단일 태스크로 집중
- 테스트(`src/App.test.tsx`)는 API 계약(T2) 확정 후 수정

예상 critical path:
- `T1 -> T2 -> T3 -> T4 -> T5`

## 7. Risks & Mitigations

1. **Risk**: macOS에서 iTerm/VSCode 미설치 또는 앱 이름 불일치로 실행 실패  
**Mitigation**: Main에서 표준 오류 메시지를 반환하고 Renderer 배너로 안내

2. **Risk**: IPC 채널명 불일치로 런타임 호출 실패  
**Mitigation**: 채널명을 상수화하고 preload/d.ts/App 테스트에서 동일 경로 검증

3. **Risk**: 좌측 패널 UI 추가로 레이아웃 밀집/깨짐 발생  
**Mitigation**: compact 버튼 크기 + mobile media query 확인 + App 테스트로 존재/disabled 상태 고정

4. **Risk**: 기존 워크스페이스 액션(열기/닫기/히스토리) 회귀  
**Mitigation**: 기존 테스트를 유지하고 F08 테스트 케이스를 독립 추가

## 8. Open Questions

- 현재 없음.
- F08 구현 중 `system:openInIterm`/`system:openInVsCode`의 세부 fallback 정책(예: 대체 앱 자동 실행)이 추가로 필요해지면 `spec-update-todo`로 별도 확정한다.
