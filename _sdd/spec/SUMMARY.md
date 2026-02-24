# SDD Workbench - Specification Summary

**생성일** (Generated): 2026-02-24
**스펙 버전** (Spec Version): 0.30.0
**최종 업데이트** (Last Updated): 2026-02-23

---

## 🎯 Executive Summary

### What (무엇을)
SDD Workbench는 소프트웨어 스펙(Markdown)과 소스 코드를 나란히 탐색할 수 있는 3패널 Electron 데스크톱 앱이다. 스펙 문서의 링크나 선택 영역에서 코드 라인으로 즉시 점프하고, 인라인 코멘트를 남겨 LLM 협업용 번들로 내보낼 수 있다.

### Why (왜)
LLM 기반 개발 워크플로우에서 스펙-코드 간 맥락 전환 비용을 줄이고, 코드 리뷰 코멘트를 구조화된 형태로 수집·내보내어 AI 에이전트와의 협업 효율을 높인다.

### Status (현재 상태)
- **전체 진행률** (Overall Progress): **100%** (MVP 기능 전체 구현 완료)
- **완료된 기능** (Completed): 26개 (F01~F18)
- **진행중인 기능** (In Progress): 0개
- **계획된 기능** (Planned): 0개

---

## ✨ Key Feature Explanations (기능별 상세 설명)

### 1. 3패널 워크벤치 (F01~F04)
**Status**: ✅ Done

왼쪽 파일 트리, 가운데 코드 프리뷰, 오른쪽 렌더드 스펙의 3패널 레이아웃을 제공한다. 멀티 워크스페이스를 지원하여 여러 프로젝트를 동시에 열고 전환할 수 있으며, Markdown 파일은 raw 소스와 렌더된 결과를 동시에 볼 수 있다. 파일 트리는 디렉토리 토글/우클릭 경로 복사를 지원하고, 코드 뷰어는 Shiki 기반 40+ 언어 구문 강조를 제공한다.

### 2. 스펙-코드 점프 & 문맥 유지 (F05/F10.1/F11.2)
**Status**: ✅ Done

렌더된 스펙 문서에서 파일 링크를 클릭하면 해당 코드 파일의 특정 라인으로 즉시 점프한다. 텍스트를 선택한 뒤 우클릭 `Go to Source`로도 소스 라인 점프가 가능하다. 같은 스펙 내에서 점프할 때는 렌더드 스펙 패널의 스크롤 위치가 유지되어 탐색 맥락을 잃지 않는다.

### 3. 인라인 코멘트 & LLM Export (F11~F12.5)
**Status**: ✅ Done

코드 뷰어와 렌더드 스펙 모두에서 인라인 코멘트를 추가할 수 있다. 코멘트는 `.sdd-workbench/comments.json`에 저장되며, View Comments 모달에서 조회·편집·삭제·Delete Exported를 수행한다. 워크스페이스 전역 지시사항은 Global Comments로 별도 관리된다. Export 시 Global Comments가 선행 배치되고, pending-only 라인 코멘트가 Markdown 번들로 생성되어 LLM에 전달하기 적합한 형태로 출력된다. 코드/문서의 코멘트 마커에 마우스를 올리면 hover preview로 본문을 즉시 확인할 수 있다.

### 4. 파일 변경 감지 & 히스토리 (F07/F07.1/F09)
**Status**: ✅ Done

파일 시스템 watcher가 외부 변경을 감지하여 파일 트리에 `●` 마커로 표시한다. 변경 파일이 접힌 디렉토리 내에 있으면 가장 가까운 열린 상위 디렉토리로 마커가 버블링된다. Back/Forward 히스토리 내비게이션(마우스/스와이프/휠)을 지원하고, 앱 재시작 시 열린 워크스페이스·활성 파일·스펙·라인 위치가 복원된다.

### 5. 원격 워크스페이스 & 대규모 디렉토리 (F15/F16)
**Status**: ✅ Done

SSHFS 등 네트워크 마운트 경로를 `mount` 명령 파싱으로 자동 감지하여 polling watcher로 전환한다. Watch mode(`Auto/Native/Polling`)를 수동으로 override할 수 있고, native 실패 시 polling fallback으로 감시 연속성을 유지한다. 대규모 디렉토리는 child cap 500 + 원격 깊이제한 3레벨의 lazy indexing으로 초기 로드를 최적화하고, 필요 시 on-demand로 하위 디렉토리를 확장한다.

### 6. 컨텍스트 복사 & 외부 연동 (F06/F08)
**Status**: ✅ Done

코드/파일 트리에서 우클릭으로 상대경로·선택 내용을 복사하고, Open In 버튼으로 iTerm/VSCode에서 즉시 열 수 있다. 외부 링크는 copy popover로 안전하게 처리된다.

---

## 🏗️ Architecture at a Glance (아키텍처 개요)

### Core Components

```
Electron Main (파일 I/O, watcher, IPC)
        │
    Preload (typed API bridge)
        │
Renderer (React)
  ├── App Shell (3패널 조립, header, 모달)
  ├── WorkspaceContext (멀티 WS 상태)
  ├── FileTreePanel (트리 탐색)
  ├── CodeViewerPanel (코드 프리뷰)
  ├── SpecViewerPanel (렌더드 Markdown)
  └── Comment Domain (저장/관리/export)
```

| Component | Purpose | Status |
|-----------|---------|--------|
| Electron Main | 파일 읽기/쓰기, watcher, IPC, system open | ✅ |
| Workspace State | 멀티 WS 상태관리, 세션 복원/영속화 | ✅ |
| File Tree | 디렉토리 트리 렌더, lazy load, 변경 마커 | ✅ |
| Code Viewer | 라인 렌더, Shiki 구문강조, 선택, 이미지 프리뷰 | ✅ |
| Spec Viewer | ReactMarkdown 렌더, TOC, 링크/소스 점프 | ✅ |
| Comment Domain | 코멘트 CRUD, export bundle, hover popover | ✅ |

### Tech Stack
- **Language**: TypeScript
- **Framework**: Electron + React
- **Key Libraries**: Shiki(구문강조), react-markdown(스펙 렌더), chokidar(file watcher)

---

## 📊 Feature Status Dashboard

### Completed Features ✅ (26/26)

| Feature | Description | 완료일 |
|---------|-------------|--------|
| F01 | Workspace bootstrap + 배너/경로 축약 | 2026-02-20 |
| F02 | 파일 인덱싱 + 트리 렌더 | 2026-02-20 |
| F03/F03.1 | 코드 뷰어 + 라인 선택 + 확장자 색상 | 2026-02-20 |
| F03.5 | 멀티 워크스페이스 기반 | 2026-02-20 |
| F04/F04.1 | Markdown dual view + 링크 인터셉트 | 2026-02-20 |
| F05 | Spec→code line jump | 2026-02-20 |
| F06/F06.1/F06.2 | 컨텍스트 복사 통합 UX | 2026-02-20~21 |
| F07/F07.1 | Watcher + changed indicator + history nav | 2026-02-21 |
| F08 | Open In (iTerm/VSCode) | 2026-02-21 |
| F09 | 앱 재시작 세션 복원 | 2026-02-21 |
| F10/F10.1/F10.2 | 보안·성능 안정화 + Go to Source + 이미지 프리뷰 | 2026-02-21 |
| F11/F11.1/F11.2 | Inline comment + export + scroll 문맥 유지 | 2026-02-22 |
| F12.1~F12.5 | Comment hover + 관리 + global + header + auto-dismiss | 2026-02-22~23 |
| F15 | 원격 워크스페이스 watch mode 정책 | 2026-02-23 |
| F16 | Lazy indexing + on-demand 확장 | 2026-02-23 |
| F17 | Global 포함 체크박스 + Delete Exported 재배치 | 2026-02-23 |
| F18 | Shiki 기반 구문 강조 (40+ 언어) | 2026-02-23 |

### In Progress 🚧
없음

### Planned 📋
없음

---

## ⚠️ Open Issues & Improvements (우선순위순)

### Medium Priority 🟡
1. **TOC active heading 추적** (Enhancement)
   - 스크롤 위치에 따라 현재 heading을 하이라이트하는 기능 미지원
2. **Rendered spec scroll position 앱 재시작 복원** (Enhancement)
   - 현재 런타임 복원만 지원, 앱 재시작 시 스크롤 위치가 리셋됨
3. **코멘트 relocation (AST/semantic)** (Enhancement)
   - 코드 변경 시 코멘트가 이전 라인에 고정되어 위치가 어긋날 수 있음

### Low Priority 🟢
4. **Non-line hash heading jump 정밀화** (Tech Debt)
5. **Watcher 튜닝** (Tech Debt) - 대규모 repo 이벤트 편차 가능성
6. **Wheel fallback 임계값 튜닝** (Tech Debt)
7. **Source line mapping best-effort 한계** (Known Limitation)
8. **Incremental export reset/re-export-all UX** (Enhancement)
9. **Global comments 버전 이력/분류** (Enhancement)
10. **Hover preview 지연값/표시 개수 설정** (Enhancement)
11. **원격 마운트 감지 Windows/Linux 확장** (Enhancement)
12. **Lazy-loaded 디렉토리는 watcher 범위 미포함** (Known Limitation)
13. **구조 변경 re-index 시 lazy-loaded 디렉토리 리셋** (Known Limitation)
14. **코멘트 스레드/답글 UI** (Enhancement) - MVP 제외 범위

---

## 🚀 Recommended Next Steps

### 1. Immediate Actions (이번 주)
- [ ] **Rendered spec markdown code block 구문강조** - Shiki를 spec viewer의 react-markdown code block에도 연동 (현재 진행중)
- [ ] **품질 게이트 유지** - 현재 21 test files / 241 passed 기준 유지

### 2. Short-term Goals (이번 달)
- [ ] **Rendered spec scroll position 영속화** - 앱 재시작 후에도 스펙 패널 스크롤 위치 복원
- [ ] **TOC active heading 추적** - 스크롤 위치 기반 현재 섹션 하이라이트
- [ ] **코멘트 relocation 기초** - 파일 변경 시 코멘트 라인 위치 자동 보정

### 3. Long-term Roadmap (분기/연간)
- [ ] **크로스 플랫폼 원격 감지** - Windows/Linux 네트워크 FS 감지 확장
- [ ] **코멘트 스레드/협업** - 다중 사용자 코멘트 지원 검토
- [ ] **IDE급 기능 확장** - LSP 연동, 멀티탭 등 고급 편집 기능 검토

---

## 📚 Quick Reference

### Key Files
- **Spec Index** (스펙 인덱스): `_sdd/spec/main.md`
- **Overview**: `_sdd/spec/sdd-workbench/01-overview.md`
- **Architecture**: `_sdd/spec/sdd-workbench/02-architecture.md`
- **Components**: `_sdd/spec/sdd-workbench/03-components.md`
- **Interfaces**: `_sdd/spec/sdd-workbench/04-interfaces.md`
- **Operational Guides**: `_sdd/spec/sdd-workbench/05-operational-guides.md`
- **Appendix (Feature History)**: `_sdd/spec/sdd-workbench/appendix.md`
- **Decision Log**: `_sdd/spec/DECISION_LOG.md`

### Quality Gate (2026-02-23)
```
npm test   → 21 files, 241 passed
npm run lint  → pass
npm run build → pass
```

### Related Commands
- `/spec-update-todo` - Add new features to spec
- `/implementation-plan` - Create implementation plan from spec
- `/spec-update-done` - Sync spec with code changes
- `/spec-summary` - Regenerate this summary

---

**Summary 생성 방법**: `/spec-summary`를 실행하면 이 파일이 자동 생성/갱신됩니다.
