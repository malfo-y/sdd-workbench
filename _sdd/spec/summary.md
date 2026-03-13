# SDD Workbench - Specification Summary

**생성일** (Generated): 2026-03-13
**스펙 버전** (Spec Version): 0.46.1
**최종 업데이트** (Last Updated): 2026-03-13
**문서 역할** (Role): 빠른 진입용 요약. canonical spec은 [main.md](./main.md)다.

---

## 1. Current Snapshot

SDD Workbench는 로컬/원격 워크스페이스에서 코드, Markdown 스펙, 코멘트 export 흐름을 한 작업대에서 다루는 Electron 앱이다. 현재 canonical 경로는 `main.md` whitepaper와 6개 컴포넌트 supporting docs이며, 원격 경로는 F27 Remote Agent Protocol이 단일 기준선이다.

- **제품 초점**: code/spec/comment/remote workflow를 같은 UX로 묶는 것
- **현재 상태**: Implemented 31, Retired 1(F15), Done 43, Fixed 2
- **원격 전략**: F15(SSHFS) retired, F27(remote protocol) canonical
- **문서 상태**: `main.md` + component docs + `operations.md` + indexes 기준으로 정렬됨

## 2. Read This First

| Need | Start Here | Why |
|---|---|---|
| 제품을 처음 이해하기 | [main.md](./main.md) | whitepaper `§1~§8 + Appendix` canonical 문서 |
| 구현 진입점 찾기 | [code-map.md](./code-map.md) | 주요 코드 경로, 테스트, 수정 시작점 인덱스 |
| 기능 ID 기준으로 찾기 | [feature-index.md](./feature-index.md) | Fxx 기준으로 spec/code 진입점 추적 |
| 운영/검증 기준 확인 | [operations.md](./operations.md) | 성능, 보안, validation baseline |
| 구조 결정 배경 보기 | [decision-log.md](./decision-log.md) | why / trade-off / rename / sync 기록 |
| 최근 드리프트 점검 결과 보기 | [SPEC_REVIEW_REPORT.md](./SPEC_REVIEW_REPORT.md) | strict review findings와 follow-up |

## 3. Architecture In One Screen

렌더러는 사용자가 느끼는 문맥을 유지하고, main process는 파일 시스템/OS/원격 백엔드 접근을 통제한다. local과 remote는 가능한 한 같은 `workspace:*` 계약으로 표현된다.

```text
Renderer (App + WorkspaceProvider)
        |
        v
Preload (typed workspace bridge)
        |
        v
Main (IPC handlers + backend router)
        |                     |
        |                     +--> Remote agent runtime / stdio RPC
        +--> Local FS / watcher / git / export
```

- **Renderer**: active workspace, active file/spec, navigation, comments, appearance state
- **Preload**: typed `window.workspace` bridge
- **Main**: local/remote backend routing, watcher lifecycle, system open, export I/O
- **Remote agent**: connect, browse, request/response RPC, fallback-aware watch

Component details는 아래 문서가 canonical supporting references다.

- [workspace-and-file-tree/overview.md](./workspace-and-file-tree/overview.md)
- [code-editor/overview.md](./code-editor/overview.md)
- [spec-viewer/overview.md](./spec-viewer/overview.md)
- [comments-and-export/overview.md](./comments-and-export/overview.md)
- [remote-workspace/overview.md](./remote-workspace/overview.md)
- [appearance-and-navigation/overview.md](./appearance-and-navigation/overview.md)

## 4. Validation Baseline

### Last Known Good

- **Date**: 2026-03-02
- **Environment**: Node 20.x baseline
- **Result**: `npm test` => `49 files, 493 passed, 1 skipped`
- **Result**: `npm run lint` => pass
- **Result**: `npm run build` => pass

### Review Note

- **Date**: 2026-03-13
- **Environment**: Node 25.2.1 / npm 11.7.0
- **Observed**: `npm test` => `Test Files no tests`, `Errors 63`
- **Interpretation**: 현재 green gate로 간주하지 않음. Node 20.x 재검증 전까지는 review note로만 취급

## 5. Active Risks And Open Questions

- **Rendered spec restart restore**: 런타임 내 복원은 되지만 앱 재시작 후 rendered scroll 문맥 복원은 아직 명확히 정의되지 않았다.
- **Comment relocation policy**: rename/large edit 이후 line comment 정합성을 어떻게 유지할지 최소 정책이 필요하다.
- **Lazy watcher coverage**: browse-only / lazy-loaded 디렉토리의 감시 기대치를 문서와 UX에서 더 선명하게 맞출 필요가 있다.
- **Validation baseline drift**: Node 20.x와 Node 25.x 사이 테스트 실패 원인이 환경 차이인지 회귀인지 아직 확정되지 않았다.

## 6. Working Rules

- `main.md`만 canonical whitepaper다.
- `summary.md`는 supporting snapshot이며 feature-by-feature 본문을 다시 복제하지 않는다.
- `code-map.md`와 `feature-index.md`는 설명 문서가 아니라 탐색용 인덱스다.
- 상세 rationale은 `decision-log.md`에 남기고, supporting docs는 링크 허브 성격을 우선한다.

## 7. Likely Next Actions

- 의미 있는 구현 변경 후에는 `/spec-update-done`으로 canonical/supporting docs를 다시 맞춘다.
- 문서 드리프트가 의심되면 `/spec-review`로 supporting docs와 code 간 어긋남을 먼저 확인한다.
- release guidance를 바꾸기 전에는 Node 20.x baseline과 필요 시 Node 25.x를 다시 검증한다.

---

**Note**: 이 문서는 의도적으로 짧게 유지된다. 세부 설계, usage scenario, data model, IPC reference, code citation은 [main.md](./main.md)를 기준으로 읽는다.
