# IMPLEMENTATION_REPORT

## 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F04)
- Completed:
  - Markdown renderer 도입 (`react-markdown`, `remark-gfm`, `rehype-slug`)
  - heading 추출 유틸 및 TOC anchor 생성 규칙 추가 (`markdown-utils.ts`)
  - `WorkspaceSession.activeSpec` 필드 도입 및 워크스페이스별 분리 유지
  - `.md` 선택 시 `activeSpec` 갱신 로직 반영
  - 우측 `SpecViewerPanel` 구현 (rendered + TOC + 상태별 안내)
  - App 우측 placeholder 제거 후 dual view 통합(center raw + right rendered)
  - F04 단위/통합 테스트 추가 및 전체 회귀 통과
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

## 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

## 3) Cross-Phase Findings

- F03.5 멀티 워크스페이스 구조를 유지한 채 `activeSpec`가 workspace session 필드로 확장됨.
- `.md` 선택 시 center(raw)와 right(rendered)가 동시 동작함.
- 워크스페이스 전환 시 spec path가 세션별로 분리 복원되어 섞이지 않음.
- TOC/스크롤/active heading 복원은 의도적으로 제외되어 F04 스코프를 유지함.

## 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | `activeSpec`가 선택된 상태에서 non-md 파일 선택 시 rendered 패널은 refresh 안내를 표시함(세부 UX는 후속 결정 가능) | backlog |
| Improvement | markdown sanitize 강화는 F10 범위로 남아 있음 | backlog |

## 5) Recommendations

1. 사용자 수동 스모크로 markdown 렌더와 workspace 전환 UX 최종 확인
2. F05 구현 시 TOC anchor/링크 인터셉트 규칙을 동일 slug 규칙으로 연결
3. F04 검증 완료 후 `spec-update-done`으로 상태 동기화

## 6) Final Conclusion

- `READY`
- Reason: F04 계획 태스크(T1~T6)를 모두 완료했고 자동 테스트/린트/빌드 품질 게이트를 통과함.

---

## F04.1 Addendum (2026-02-20)

### 1) Progress Summary

- Plan source: `/_sdd/drafts/feature_draft_f04_1_markdown_link_intercept_copy_popover.md` (Part 2)
- Completed:
  - markdown 링크 인터셉트(`preventDefault`) 및 anchor 예외 처리
  - 링크 해석 유틸 (`resolveSpecLink`) 추가
  - 외부/해석 실패 링크용 copy popover UI 추가
  - same-workspace 링크의 `selectFile` 연동
  - 실패/외부 링크용 banner 피드백 연동
  - resolver/unit + panel + app 통합 테스트 추가/확장
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- markdown 링크 클릭 시 renderer 이동/리로드 경로를 차단해 워크스페이스 상태가 유지된다.
- same-workspace 상대 링크는 active workspace 파일 집합 기준으로만 열리며 cross-workspace 탐색은 하지 않는다.
- external/unresolved 링크는 이동 대신 popover 복사 액션으로 처리되어 안전성이 올라갔다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 외부 링크를 시스템 브라우저로 여는 UX는 MVP 범위 밖이라 미지원 | backlog |
| Improvement | line jump (`#Lx`, `#Lx-Ly`)는 F05 범위로 이월 | backlog |

### 5) Final Conclusion (F04.1)

- `READY`
- Reason: F04.1 계획 태스크(1~7) 완료 + 자동 테스트/린트/빌드 게이트 통과.

---

## F05 Addendum (2026-02-20)

### 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F05)
- Completed:
  - `resolveSpecLink`에 `#Lx`, `#Lx-Ly` 라인 범위 파싱 추가
  - SpecViewer 링크 콜백에 `lineRange` 전달 계약 추가
  - App에서 same-workspace 링크 열기 + `selectionRange` + jump request 오케스트레이션 추가
  - CodeViewer에서 jump request 기반 `scrollIntoView` best-effort 점프 추가
  - parser/panel/codeviewer/app 테스트 확장
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- rendered markdown 링크의 `#Lx/#Lx-Ly`가 active workspace 기준으로 일관 동작한다.
- line hash가 없는 링크는 기존과 동일하게 파일 열기만 수행한다.
- external/unresolved 링크 popover 정책(F04.1)은 회귀 없이 유지된다.
- multi-workspace 전환 후에도 line jump는 현재 active workspace 세션을 기준으로 적용된다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | `path#heading` 파일 링크의 heading 위치 스크롤은 미지원(F09 범위) | backlog |
| Improvement | `scrollIntoView` 정밀 제어(애니메이션/컨테이너 옵션)는 MVP 범위 밖 | backlog |

### 5) Final Conclusion (F05)

- `READY`
- Reason: F05 계획 태스크(T1~T8)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F06 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F06)
- Completed:
  - 상단 `ContextToolbar` 도입 (`Copy Active File Path`, `Copy Selected Lines`)
  - 복사 payload 유틸 분리 (`buildCopyActiveFilePathPayload`, `buildCopySelectedLinesPayload`)
  - App 클립보드 오케스트레이션/가드/오류 배너 연결
  - payload 유틸/툴바/App 통합 테스트 추가
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- 툴바 disabled 규칙과 런타임 가드가 일치해 오작동 경로를 줄였다.
- 멀티 워크스페이스 전환 후 복사 결과가 active workspace 컨텍스트를 정확히 따른다.
- F04/F05(렌더/링크 점프) 기존 흐름과 충돌 없이 회귀 통과했다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 클립보드 성공 피드백(토스트/상태표시)은 아직 미구현 | backlog |
| Improvement | 우클릭 컨텍스트 메뉴 복사는 F06.1 범위에서 구현 예정 | planned |

### 5) Final Conclusion (F06)

- `READY`
- Reason: F06 계획 태스크(T1~T5)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F06.1 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F06.1)
- Completed:
  - `copy-payload` 유틸에 선택 본문 전용 payload 빌더 추가
  - 공통 우클릭 액션 popover 컴포넌트 추가(ESC/외부 클릭/액션 완료 dismiss)
  - CodeViewer 우클릭 selection 정책 고정(범위 내 유지, 범위 밖 단일 선택 전환)
  - FileTree 파일 우클릭 `Copy Relative Path` 액션 추가
  - App clipboard 오케스트레이션에 우클릭 복사 경로 통합
  - unit/component/integration 테스트 확장 및 회귀 고정
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed
- Phase 4: proceed

### 3) Cross-Phase Findings

- 코드 뷰어 우클릭 복사는 기존 selection 모델과 충돌 없이 동작한다.
- 파일 트리 우클릭 복사는 active file을 바꾸지 않고 상대 경로만 복사한다.
- 복사 실패 피드백은 기존 배너 경로를 재사용해 일관성을 유지한다.
- F04.1/F05 링크 인터셉트 및 line jump 흐름과 회귀 충돌이 없다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 디렉터리 우클릭 액션 확장은 미지원(F06.1 범위 외) | backlog |
| Improvement | 절대경로 복사/복사 성공 토스트는 후속 범위 | backlog |

### 5) Final Conclusion (F06.1)

- `READY`
- Reason: F06.1 계획 태스크(T1~T7)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F06.2 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F06.2)
- Completed:
  - CodeViewer 드래그 기반 연속 라인 선택 추가
  - CodeViewer 우클릭 메뉴에 `Copy Both` 액션 추가
  - App에서 `Copy Both -> buildCopySelectedLinesPayload` 경로 연결
  - 상단 복사 툴바(`ContextToolbar`) 및 연관 테스트 제거
  - FileTree 디렉터리 우클릭 `Copy Relative Path` 지원
  - unit/component/integration 테스트 갱신 및 회귀 고정
  - Verification: `node -v`, `npm -v`, `npm install`, `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- 복사 진입점이 툴바 의존에서 코드/파일 트리 우클릭 중심으로 단순화됐다.
- `Copy Both`는 F06의 payload 포맷을 재사용해 기존 downstream 포맷 호환성을 유지한다.
- 드래그 선택 도입 이후에도 기존 `Shift+Click` 선택 및 F05 line jump 흐름은 회귀 없이 유지된다.
- 파일 트리 디렉터리 우클릭 복사가 추가되었지만 디렉터리 토글(onClick) 동작은 유지된다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 드래그 선택의 고급 UX(auto-scroll/비연속 선택)는 MVP 범위 밖 | backlog |
| Improvement | F08/F09 진입점 재배치 구현은 후속 범위 | planned |

### 5) Final Conclusion (F06.2)

- `READY`
- Reason: F06.2 계획 태스크(T1~T6)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F07 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F07)
- Completed:
  - Main process watcher registry + debounce dispatch + cleanup 구현
  - preload/renderer IPC bridge(`watchStart`, `watchStop`, `onWatchEvent`) 확장
  - workspace session 상태(`changedFiles`) 도입 및 workspace별 분리 유지
  - provider lifecycle(open/close/unmount) watcher 시작/정리 연동
  - file tree 파일 노드 `●` 변경 표시 렌더 추가
  - watcher 이벤트/분리/정리 회귀 테스트 추가
  - Verification: `node -v`, `npm -v`, `npm install`, `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- watcher 이벤트가 `workspaceId`를 포함해 전달되어 멀티 워크스페이스 세션 오염 없이 라우팅된다.
- 파일 트리 변경 표시는 active workspace에만 노출되고, 전환 시 각 워크스페이스 상태가 분리 유지된다.
- 워크스페이스 닫기와 provider unmount 시 `watchStop`가 호출되어 watcher 누수 경로를 차단했다.
- 기존 F04/F05/F06.2(링크/복사/선택) UX와 충돌 없이 전체 회귀를 통과했다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 변경 표시 clear 정책(수동/자동/파일 열람 시 제거)은 아직 미정 | backlog |
| Improvement | 변경 파일 목록 영속화(앱 재시작 복원)는 MVP 범위 밖 | backlog |

### 5) Final Conclusion (F07)

- `READY`
- Reason: F07 계획 태스크(T1~T6)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F07 Follow-up Addendum (2026-02-21)

### 1) Progress Summary

- Completed:
  - `workspace-context`에 공통 파일 로드 경로를 도입해 수동 선택/자동 리로드를 일원화
  - watcher 이벤트에 active file이 포함되면 자동으로 `readFile` 재실행
  - 파일 읽기 성공 시 `changedFiles`에서 해당 경로 제거
  - 자동 리로드/마커 제거 동작 통합 테스트 추가
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Cross-Phase Findings

- 기존 request-id 경합 제어를 유지해 자동 리로드와 수동 선택 간 stale response를 차단한다.
- 변경 마커는 “확인 완료” 의미로 읽기 성공 시점에만 내려가고, 실패 시 유지되어 신뢰성이 높다.
- F07 watcher 표시 기능은 유지되면서, active file 사용자 경험(실시간 반영)이 개선됐다.

### 3) Final Conclusion

- `READY`
- Reason: 후속 요구사항(자동 반영 + 확인 시 마커 제거)을 구현했고 테스트/린트/빌드 게이트를 모두 통과함.

---

## F07.1 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/drafts/feature_draft_f07_1_workspace_file_history_navigation.md` (Part 2)
- Completed:
  - `WorkspaceSession`에 `fileHistory`, `fileHistoryIndex` 상태 추가
  - 히스토리 push/back/forward/branch-truncate/200개 상한 정책을 순수 함수로 구현
  - WorkspaceProvider에서 일반 파일 선택(push)과 히스토리 이동(no-push)을 동일 read 파이프라인으로 통합
  - active workspace 기준 `canGoBack`, `canGoForward`, `goBackInHistory`, `goForwardInHistory` 제공
  - App 헤더에 `Back`, `Forward` 버튼 추가 및 disabled 상태 연동
  - 모델/통합 테스트에 F07.1 시나리오(중복 방지, truncate, workspace별 독립 히스토리) 추가
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- 파일 히스토리는 각 워크스페이스 세션에 격리되어 전환 시 상호 오염이 없다.
- spec 링크를 통한 파일 열기(`selectFile`)도 동일 push 규칙을 사용해 히스토리 일관성이 유지된다.
- Back/Forward 이동은 pointer-only 동작으로 구현되어 히스토리 중복 누적을 방지한다.
- 기존 F04/F05/F06.2/F07(링크 점프/복사/watcher) 동작과 회귀 충돌 없이 통과했다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 키보드 단축키(`Cmd+[`, `Cmd+]`)는 미지원 | backlog |
| Improvement | 앱 재시작 후 히스토리 영속화는 미지원 | backlog |

### 5) Final Conclusion (F07.1)

- `READY`
- Reason: F07.1 계획 태스크(T1~T6)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F08 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F08)
- Completed:
  - Main IPC 채널 `system:openInIterm`, `system:openInVsCode` 구현
  - preload 브리지/`Window.workspace` 타입 계약 확장(`openInIterm`, `openInVsCode`)
  - 좌측 `Current Workspace` 아래 `Open In:` + icon button(iTerm/VSCode) UI 추가
  - active workspace 부재 시 버튼 disabled 처리
  - 실행 실패 시 텍스트 배너 피드백 연결
  - App 통합 테스트에 disabled/호출/오류 배너 시나리오 추가
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- F08 action은 기존 멀티 워크스페이스 구조를 그대로 유지하며 항상 active workspace `rootPath`만 사용한다.
- Main/preload/renderer 계약이 분리되지 않고 동일 채널명으로 일치한다.
- icon-only 버튼이지만 접근성 라벨/tooltip을 제공해 기능 인지가 가능하다.
- 기존 Back/Forward, 파일 선택, watcher/히스토리 흐름과 충돌 없이 회귀를 통과했다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | iTerm/VSCode 미설치 시 대체 실행 전략은 미구현(명시적 오류 반환) | backlog |
| Improvement | macOS 외 플랫폼 실행 정책은 미구현 | backlog |

### 5) Final Conclusion (F08)

- `READY`
- Reason: F08 계획 태스크(T1~T5)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F09 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/drafts/feature_draft_f09_workspace_session_restore_and_line_resume.md` (Part 2)
- Completed:
  - `workspace-persistence` 계층 신설 (snapshot schema/version + load/save/clear + 손상 데이터 fallback)
  - `WorkspaceSession`에 `fileLastLineByPath` 상태 추가 및 selection 기반 갱신 규칙 추가
  - `WorkspaceProvider`에 앱 시작 hydrate/상태 변경 persist 파이프라인 추가
  - restore 중 index 실패 workspace skip + 나머지 복원 continue + 배너 피드백 처리
  - 파일 재열기/복원 시 단일 라인 selection 기반 CodeViewer jump 연동
  - persistence/model/app 테스트 보강
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- 세션 복원은 멀티 워크스페이스 상태 모델(F03.5) 위에서 동작하며 기존 active-workspace 정책을 유지한다.
- line resume은 기존 jump 토큰 메커니즘(F05)과 충돌 없이 결합되어 파일 재열기 시 자동 포커스가 가능하다.
- 복원 실패가 발생해도 전체 앱이 중단되지 않고 남은 workspace 복원을 계속한다.
- 테스트 환경의 `window.localStorage` 구현 차이(Node v25)까지 흡수하도록 storage access를 방어적으로 처리했다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | `activeSpec` 세션 영속화는 현재 F09 범위에서 제외됨 | backlog |
| Improvement | `fileLastLineByPath` 엔트리 정리 전략(LRU 등) 고도화 여지 있음 | backlog |

### 5) Final Conclusion (F09)

- `READY`
- Reason: F09 계획 태스크(T1~T6)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F10.1 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/drafts/feature_draft_f10_1_markdown_selection_go_to_source.md` (Part 2)
- Completed:
  - markdown source line 해석 유틸(`source-line-resolver`) 추가
  - 선택 우클릭 액션 UI(`SpecSourcePopover`) 추가
  - `SpecViewerPanel`에 `data-source-line` 주입 + 우클릭 `Go to Source` 액션 연동
  - `App`에 `activeSpec` 단일 라인 점프 wiring 추가
  - `SpecViewerPanel`/`App` 통합 테스트와 resolver 단위 테스트 보강
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- 선택 기반 우클릭 액션은 기존 링크 popover 흐름과 충돌 없이 공존한다.
- source line 매핑은 블록 시작 라인 기준(best-effort)으로 안정 동작한다.
- source 이동은 F05 jump 토큰 경로를 재사용해 기존 line-jump UX와 일관된다.
- F04.1/F05/F09 관련 기존 시나리오와 회귀 충돌이 발생하지 않았다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 문자/토큰 단위 정밀 매핑은 미지원 (line 기준만 지원) | backlog |
| Improvement | `Go to Source` 액션 확장(예: 복수 액션/세부 탐색)은 미구현 | backlog |

### 5) Final Conclusion (F10.1)

- `READY`
- Reason: F10.1 계획 태스크(T1~T5)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F10 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F10)
- Completed:
  - `rehype-sanitize` 도입 + markdown sanitize schema/URI 정책 유틸(`markdown-security`) 추가
  - `SpecViewerPanel`에 sanitize plugin wiring + 로컬 리소스 경계 적용 + 차단 placeholder 적용
  - workspace 인덱싱 cap(`10,000`) + `truncated` payload 계약(main/preload/d.ts) 도입
  - renderer(`WorkspaceProvider`)에 truncation 배너 처리 연동
  - `CodeViewerPanel` 하이라이트 계산을 `useMemo` 기반 캐시로 전환
  - 단위/통합 테스트 보강(`markdown-security`, `spec-viewer`, `App`, `code-viewer`)
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- sanitize 적용 후에도 F04.1 링크 인터셉트와 F10.1 `Go to Source` 흐름은 유지된다.
- 인덱싱 cap은 watcher 구조변경 refresh와 충돌하지 않고, `truncated` 신호로 사용자 피드백이 가능해졌다.
- 하이라이트 계산 캐시 도입으로 selection/context-menu 등 UI 상호작용 시 불필요한 재계산을 줄였다.
- 기존 멀티 워크스페이스/세션 복원/히스토리 기능(F03.5/F07/F07.1/F09) 회귀는 발견되지 않았다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | markdown 렌더에서 workspace 상대 이미지를 실제 미리보기로 적극 지원하는 기능은 F10.2 범위 | backlog |
| Improvement | 인덱싱 cap(`10,000`) 값은 실제 대형 repo 사용 데이터 기반 추가 튜닝 가능 | backlog |

### 5) Final Conclusion (F10)

- `READY`
- Reason: F10 계획 태스크(T1~T5)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F10.2 Addendum (2026-02-21)

### 1) Progress Summary

- Plan source: `/_sdd/drafts/feature_draft_f10_2_code_viewer_image_preview.md` (Part 2)
- Completed:
  - `workspace:readFile` 계약을 텍스트 + 이미지 payload(`imagePreview`)로 확장
  - main read pipeline에 허용 이미지(`png/jpg/jpeg/gif/webp`) 감지 + 시그니처 검증 + `data:image/*` payload 생성 추가
  - `svg` 및 정책 위반 케이스를 `blocked_resource`로 차단 처리
  - Workspace 세션 상태에 `activeFileImagePreview` 추가 및 파일 선택/refresh 시 상태 전이 정리
  - CodeViewer 3-way 분기(텍스트/이미지/preview unavailable) 구현 및 이미지 모드에서 텍스트 컨텍스트 액션 비노출 처리
  - 통합/단위 테스트 보강(App + CodeViewer + model) 및 회귀 게이트 통과
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- 기존 텍스트 코드 프리뷰(하이라이트/선택/복사) 흐름은 이미지 모드와 분리되어 회귀 없이 유지된다.
- watcher refresh 경로에서도 active file이 이미지인 경우 새 payload로 갱신 가능하며, preview unavailable 상태와 충돌하지 않는다.
- markdown spec 렌더 경로는 기존 정책을 유지하고, code viewer 이미지 프리뷰는 center 패널에서만 처리된다.
- 멀티 워크스페이스/히스토리/세션 복원(F03.5/F07/F07.1/F09) 관련 테스트 회귀는 발생하지 않았다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 이미지 확대/축소/패닝 도구는 미지원 (read-only preview만 제공) | backlog |
| Improvement | 추가 이미지 포맷(`bmp`, `ico`)은 정책상 미지원 | backlog |

### 5) Final Conclusion (F10.2)

- `READY`
- Reason: F10.2 계획 태스크(T1~T5)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F11 Addendum (2026-02-22)

### 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F11)
- Completed:
  - 코멘트 도메인 레이어(`CodeComment`, anchor/hash 생성, 정렬 규칙) 구현
  - comments JSON 파싱/직렬화 + `_COMMENTS.md`/LLM bundle 렌더 유틸 구현
  - Electron IPC 채널(`readComments`, `writeComments`, `exportCommentsBundle`) 구현
  - WorkspaceProvider에 workspace별 comments 로딩/저장 상태 및 에러 경로 통합
  - CodeViewer 우클릭 메뉴에 `Add Comment` 액션 추가 + 코멘트 입력 모달 연동
  - App 액션에 `Export Comments` 모달 추가 + clipboard/file export 오케스트레이션 구현
  - 길이 제한(`MAX_CLIPBOARD_CHARS=30000`) 기반 clipboard 비활성 정책 반영
  - 단위/통합 테스트 보강 및 전체 회귀 게이트 통과
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- comments 영속화는 workspace 경계 내부(`.sdd-workbench`)에서만 수행되어 경계 오염을 차단한다.
- `Add Comment`는 기존 copy 중심 우클릭 UX를 유지하면서 액션만 확장해 회귀 리스크를 줄였다.
- export 경로는 clipboard와 파일 저장을 분리해, 대형 payload에서도 파일 저장 중심 fallback이 가능하다.
- 멀티 워크스페이스 상태 모델(F03.5) 위에서 comments 상태가 세션 단위로 분리 유지된다.
- 기존 F04~F10 기능(링크/점프/히스토리/watcher/이미지 프리뷰)과 충돌 없이 전체 테스트를 통과했다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 코멘트 편집/삭제 UI는 미지원(현재 add + export 중심) | backlog |
| Improvement | comments 로드 트리거 최적화(활성 전환 시 캐시 기반 skip 등)는 추가 개선 여지 | backlog |

### 5) Final Conclusion (F11)

- `READY`
- Reason: F11 계획 태스크(T1~T7)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.

---

## F12.1 Addendum (2026-02-22)

### 1) Progress Summary

- Plan source: `/_sdd/drafts/feature_draft_f12_1_comment_badge_hover_popover.md` (Part 2)
- Completed:
  - 코멘트 라인 index를 count + line comment entries 조회 가능 구조로 확장
  - rendered markdown용 entries nearest-fallback 매핑 유틸 추가
  - 공용 `CommentHoverPopover` 컴포넌트 추가(미리보기, `+N more`, ESC/외부 클릭 닫힘)
  - CodeViewer 라인 badge hover popover 통합
  - SpecViewer rendered marker hover popover 통합
  - Spec marker를 실제 badge element로 전환해 hover interaction 가능화
  - App에서 active file/spec comment entries wiring 추가
  - 단위/통합 테스트 보강 및 전체 품질 게이트 통과
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- 기존 코멘트 저장/내보내기(F11/F11.1) 경로는 변경 없이 유지됐다.
- CodeViewer의 선택/우클릭 복사/Add Comment 흐름과 hover popover가 충돌하지 않도록 상태를 분리했다.
- SpecViewer는 기존 링크 popover/소스 popover와 hover popover를 상호 배타적으로 관리해 오작동을 방지했다.
- rendered markdown marker가 실제 DOM badge가 되면서 향후 marker 클릭 액션(F12.2 이후 확장)에 유리한 구조가 됐다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | hover 표시/숨김 지연값(120ms)은 고정 상수이며 사용자 설정은 미지원 | backlog |
| Improvement | popover 내 코멘트 상세 이동(파일 열기/라인 점프)은 범위 외 | backlog |

### 5) Final Conclusion (F12.1)

- `READY`
- Reason: F12.1 계획 태스크(T1~T5)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.
