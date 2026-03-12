# SDD Workbench - Specification Summary

**생성일** (Generated): 2026-03-12
**스펙 버전** (Spec Version): 0.45.0 (restructured)
**최종 업데이트** (Last Updated): 2026-03-12

---

## 🎯 Executive Summary

### What (무엇을)
SDD Workbench는 코드와 스펙을 하나의 워크벤치에서 탐색·편집하고, 코멘트를 수집해 LLM 협업 번들로 내보낼 수 있는 Electron 기반 도구다. 로컬/원격 워크스페이스 모두 Remote Agent Protocol 기반 동일 `workspace:*` 흐름으로 처리한다.

### Why (왜)
스펙-코드 왕복, 코멘트 정리, 원격 작업을 하나의 UX로 통합해 맥락 전환 비용을 줄이고, 실제 개발/리뷰 루프를 빠르게 유지하는 것이 목표다.

### Status (현재 상태)
- **도메인 커버리지(product-overview 기준)**: Implemented 31, Retired 1(F15)
- **기능 이력(appendix 기준)**: Done 43, Fixed 2
- **현재 원격 전략**: F15(SSHFS) 폐기, F27(remote-protocol) 단일 경로
- **스펙 구조**: 2026-03-12 컴포넌트 디렉토리 기반으로 재구성 완료

---

## ✨ Key Feature Explanations (기능별 상세 설명)

### 1. Remote Agent 원격 워크스페이스 (F27/F28)
**Status**: Implemented

사용자는 연결 모달에서 host/user/port/identity를 입력하고, SSH browse로 원격 디렉토리를 탐색해 `remoteRoot`를 선택할 수 있다. 연결 시 runtime 배포(덮어쓰기)와 healthcheck/버전 검증을 거친 뒤 stdio 세션으로 파일 I/O, watch, git, comments RPC를 수행한다.

- 원격 연결 경로를 SSHFS 의존에서 분리해 제어 가능성을 높였다.
- 연결 상태(`connecting/connected/degraded/disconnected`)와 오류 코드가 표준화되어 운영 가시성이 개선됐다.
- iTerm SSH/VSCode Remote-SSH 외부 도구 열기와 VSCode SSH config 자동 동기화를 지원한다.

### 2. 코드 편집·탐색 워크벤치 (F23/F24/F24.1/F07.2)
**Status**: Implemented

2패널(Code/Spec 탭) 구조와 CodeMirror 6 에디터를 기반으로 파일 열기, 검색, 편집, 저장, 히스토리 이동, 스크롤 복원을 한 흐름에서 제공한다.

- `.md`/비-`.md` 파일 선택 시 탭 자동 전환으로 탐색 비용을 줄였다.
- `Cmd+S`, dirty guard, wrap 토글 기본 On으로 실사용 안정성을 확보했다.
- git line marker, comment gutter, navigation highlight가 에디터 내 공존한다.

### 3. 코멘트-내보내기 협업 루프 (F11~F12.5/F17/F20)
**Status**: Implemented

코드/스펙에서 코멘트를 남기고, View Comments에서 편집/삭제/정리 후 `_COMMENTS.md` 번들로 내보내는 협업 경로가 확립되어 있다.

- line comment와 global comments를 분리 저장하면서 export 시 결합할 수 있다.
- hover preview, target jump, include-in-export 제어로 검토 효율이 높다.
- 파일 클립보드 Copy/Paste (내부 + macOS Finder 클립보드) 지원.

### 4. 대규모 워크스페이스 신뢰성 (F16 + drift sync)
**Status**: Implemented

초기 인덱싱 cap(100,000)과 디렉토리 child cap(500), on-demand 확장으로 대규모 트리의 초기 부하를 제어한다.

- local polling은 과대 디렉토리 제외, remote polling은 symlink 추적 + 순환 방지 정책을 사용한다.
- lazy subtree changed-marker 버블링 보강으로 닫힌 디렉토리에서도 변경 힌트를 유지한다.

### 5. Appearance Theme (F36/F37/F38)
**Status**: Implemented

Ayu Mirage 기반 `dark-gray` 테마와 `light` 테마를 제공하며, Electron native `View > Theme` 메뉴를 primary control로 사용한다.

- pre-paint bootstrap으로 first-paint flash를 줄이고 storage failure-safe fallback을 유지한다.
- CodeMirror, Shiki, App shell 전반에서 theme-aware rendering을 적용한다.

---

## 🏗️ Architecture at a Glance (아키텍처 개요)

```text
Renderer (React: App + WorkspaceContext + Panels)
        |
        v
Preload (typed window.workspace bridge)
        |
        v
Main (IPC handlers, local/remote backend router)
        |                          |
        |                          +--> Remote Agent (SSH transport + runtime stdio RPC)
        +--> Local FS/Watcher/Git/Export
```

| Component | Purpose | Spec |
|---|---|---|
| Workspace / File Tree | 멀티 워크스페이스, 파일 트리, CRUD, 검색, Git 상태 | [overview](./workspace-and-file-tree/overview.md) |
| Code Editor | CM6 편집/저장/검색/wrap/gutter, line jump | [overview](./code-editor/overview.md) |
| Spec Viewer | rendered markdown, source action, 왕복 점프, 검색 | [overview](./spec-viewer/overview.md) |
| Comments / Export | line/global comments, hover preview, export bundle | [overview](./comments-and-export/overview.md) |
| Remote Workspace | remote backend, browse, SSH transport, watcher | [overview](./remote-workspace/overview.md) |
| Appearance / Navigation | App shell, tabs, history, theme, native menu | [overview](./appearance-and-navigation/overview.md) |

### Tech Stack
- **Language**: TypeScript
- **Runtime**: Electron 30 + React 18
- **Key Libraries**: CodeMirror 6, react-markdown, Shiki, electron-clipboard-ex, vitest

---

## 📊 Feature Status Dashboard

### Completed / Implemented
- Workspace 탐색/세션/히스토리/복사/Open In 기본축(F01~F10)
- 코멘트·내보내기·hover·global comments 확장(F11~F12.5, F17, F20)
- 성능/대규모 트리 대응(F16, node cap 100,000 + child cap 500)
- 코드 편집 UX 전환(CodeMirror 6, 저장/dirty/검색/wrap/스크롤복원: F23/F24/F24.1/F07.2)
- 파일 트리 CRUD + rename + git 상태 배지(F25/F25b/F26)
- Remote Agent Protocol + SSH browse remoteRoot 선택(F27/F28)
- 검색 wildcard + spec viewer 검색 + source offset anchor(F29~F35)
- Appearance theme + light theme + native menu(F36/F37/F38)
- 원격 워크스페이스 SSH 외부 도구(F39) + Finder 클립보드(F40)

### In Progress
- None currently

### Planned
- None currently (개선 항목은 backlog로 관리)

### Retired
- F15 (SSHFS 기반 원격 연결 경로)

---

## ⚠️ Open Issues & Improvements (우선순위순)

### High Priority 🔴
- No critical issues identified

### Medium Priority 🟡
1. **Rendered spec scroll position 앱 재시작 복원** (Enhancement)
   - 런타임 복원은 되지만 재시작 후 문맥 복원은 미지원.
2. **코멘트 relocation(경로/라인 자동 보정)** (Enhancement)
   - 코드 변경/이름변경 이후 코멘트 정합성 유지 전략이 제한적.
3. **lazy-loaded 디렉토리 watcher 범위 한계** (Known limitation)
   - browse-only 디렉토리 특성상 감시 커버리지의 기대치 조율 필요.
4. **트랙패드 스와이프 히스토리 내비게이션 미지원** (Known limitation)
   - CodeMirror 스크롤/제스처 충돌로 신뢰성 있는 지원이 어려움.

### Low Priority 🟢
1. **TOC active heading 추적**
2. **non-line hash heading jump 정밀화**
3. **global comments 버전 이력/분류**
4. **hover preview 지연/표시 개수 사용자 설정**

---

## 🚀 Recommended Next Steps

### 1. Immediate Actions (이번 주)
- [ ] **spec scroll 재시작 복원 범위 확정 및 구현** - 스펙 탐색 연속성 개선
- [ ] **코멘트 relocation 최소 정책 정의** - rename/편집 이후 코멘트 신뢰도 보강

### 2. Short-term Goals (이번 달)
- [ ] **lazy subtree 감시/표시 정책 고도화** - 성능과 가시성 균형 개선
- [ ] **원격 대규모 디렉토리 스모크 자동화** - 회귀 조기 탐지

### 3. Long-term Roadmap (분기)
- [ ] **원격 agent 운영 자동화 고도화 검토** - 업그레이드/롤백/채널 관리 범위 재평가

---

## 📚 Quick Reference

### Spec Structure (2026-03-12 재구성)
```
_sdd/spec/
├── main.md                         # 인덱스 (목표+아키텍처+컴포넌트맵)
├── code-map.md                     # 파일/테스트 인벤토리
├── feature-index.md                # 기능 ID 기준 진입점
├── operations.md                   # 성능/보안/신뢰성/테스트 기준
├── <component>/overview.md         # 도메인 설명
├── <component>/contracts.md        # 계약/규칙
├── appendix/                       # 백로그, acceptance, 용어집, 이력
├── decision-log.md                 # 구조/정책 결정 기록
└── summary.md                      # 본 파일
```

### Key Files
- **Spec Index**: `_sdd/spec/main.md`
- **Code Map**: `_sdd/spec/code-map.md`
- **Feature Index**: `_sdd/spec/feature-index.md`
- **Operations**: `_sdd/spec/operations.md`
- **Decision Log**: `_sdd/spec/decision-log.md`
- **Implementation Index**: `_sdd/implementation/IMPLEMENTATION_INDEX.md`

### Quality Gate (2026-03-02)
- `npm test` -> `49 files, 493 passed, 1 skipped`
- `npm run lint` -> pass
- `npm run build` -> pass

### Related Commands
- `/spec-summary` - 현재 요약 재생성
- `/spec-update-todo` - 신규 요구사항을 스펙 TODO로 반영
- `/implementation-plan` - 구현 계획 수립
- `/spec-review` - 스펙-구현 정합성 점검

---

**Note**: 본 요약은 `main.md` + 6개 컴포넌트 overview/contracts + decision-log + appendix를 기준으로 갱신되었다.
