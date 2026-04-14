# Implementation Review: SDD Workbench

**Review Date**: 2026-04-14
**Review Mode**: Tier 1
**Reference**: `_sdd/discussion/2026-04-14_discussion_code_refactoring_review_strategy.md`, `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md`, `_sdd/spec/main.md`, `_sdd/spec/operations.md`, 관련 contracts, 현재 워크트리
**Model**: Codex (GPT-5 계열)

## 1. Findings
### Critical
- 없음

### High
- 키보드 내비게이션 계약이 스펙과 구현/테스트 사이에서 어긋나 있습니다. `_sdd/spec/operations.md:77`, `_sdd/spec/operations.md:99-100`, `_sdd/spec/feature-index.md:74`, `_sdd/spec/decision-log.md:67`, `_sdd/spec/decision-log.md:724`는 `Cmd+Shift+Left/Right`, `Cmd+Shift+Up/Down`을 계약으로 적고 있는데, 실제 구현은 `src/hooks/use-history-navigation.ts:605-635`에서 `metaKey + ctrlKey`만 허용합니다. 테스트도 `src/App.test.tsx:3514-3585`, `src/App.test.tsx:3688-3750`에서 `Cmd+Ctrl`만 정답으로 고정하고 있어, 현재 상태는 문서/행동/테스트가 함께 drift한 상태입니다.

### Medium
- 로컬 워크스페이스가 실행 중 native watcher에서 polling fallback으로 전환될 때, UI가 잘못 `REMOTE` 상태처럼 보일 수 있습니다. fallback 이벤트 payload는 `electron/ipc-types.ts:336-339`에서 `workspaceId`, `watchMode`만 담고, 로컬 fallback 송신도 `electron/workspace-watchers.ts:525-528`처럼 동일 이벤트를 사용합니다. 그런데 renderer는 `src/workspace/use-workspace-watcher.ts:284-298`에서 모든 fallback 이벤트에 대해 `isRemoteMounted: true`로 덮어쓰고, `src/App.tsx:270`은 이 값을 그대로 `REMOTE` 배지 표시 조건으로 사용합니다. 결과적으로 “로컬 native watcher degraded”와 “실제 remote workspace”가 같은 UI 상태로 섞일 수 있습니다.
- 초기 `watchStart` 단계에서 polling fallback이 적용된 경우, fallback 배너가 자동 dismiss되지 않습니다. `_sdd/spec/operations.md:92`는 remote 연결/폴백 배너의 5초 자동 dismiss를 요구하지만, `src/workspace/use-workspace-remote.ts:185-189`는 `fallbackApplied`일 때 배너만 세우고 dismiss 타이머를 걸지 않습니다. 현재 자동 dismiss는 `src/workspace/use-workspace-watcher.ts:295-298`의 런타임 fallback 이벤트 경로에만 묶여 있습니다.

### Low
- 모놀리스 축소는 전반적으로 성공했지만, 로드맵의 줄 수 목표는 완전히 닫히지 않았습니다. 계획상 목표는 `_sdd/implementation/2026-04-14_implementation_plan_code_refactoring_roadmap.md:35-40` 기준으로 `src/App.tsx ~800`, `src/spec-viewer/spec-viewer-panel.tsx ~1,200`인데, 현재 워크트리 기준 `wc -l` 결과는 `src/App.tsx 922`, `src/spec-viewer/spec-viewer-panel.tsx 1362`입니다. `electron/main.ts 424`, `electron/preload.ts 325`, `src/workspace/workspace-context.tsx 733`는 목표 범위에 들어왔지만, 두 엔트리는 아직 “목표 달성”보다는 “의미 있는 축소” 단계입니다.

## 2. Progress Overview
이번 리팩토링은 구조 분리라는 1차 목적에는 대체로 성공했습니다. `electron/main.ts`, `electron/preload.ts`, `src/workspace/workspace-context.tsx`는 큰 폭으로 축소됐고, 새 helper/hook/module 분리도 실제 파일 구조에 반영돼 있습니다.

다만 discussion 문서가 요구한 “계약 회귀형” 관점에서 보면, 자동 테스트 녹색만으로 닫히지 않는 사용자 계약 문제가 남아 있습니다. 특히 키보드 단축키 계약 drift와 watch fallback 상태 표시는 리팩토링 완료 선언 전에 정리하는 편이 맞습니다.

## 3. Verification Summary
- 환경 확인:
  - `node -v` → `v25.2.1`
  - `npm -v` → `11.12.1`
  - 참고: `_sdd/env.md` 기준 Node 20.x가 canonical baseline이므로, 이번 검증은 baseline과 다른 런타임에서 수행됐습니다.
- 자동 검증:
  - `npm test` → PASS (`71 files`, `838 passed`, `1 skipped`)
  - `npm run lint` → PASS
- 개발 실행:
  - `npm run dev` → Vite dev server 및 Electron main/preload dev build는 올라옴
  - Electron 실제 상호작용 smoke: `UNTESTED`
- 계약 정합성 판정:
  - IPC surface 유지: 대체로 `MET`
  - WorkspaceContextValue surface 유지: 대체로 `MET`
  - 수동 UI 회귀 항목: `UNTESTED`
  - 키보드 shortcut 계약: `NOT MET`
  - local/remote watch 상태 표현: `PARTIAL`

## 4. Recommendations
Must:
- 키보드 단축키 계약을 하나로 정리해야 합니다. 스펙을 `Cmd+Ctrl`로 바꾸든, 구현/테스트를 `Cmd+Shift`로 되돌리든 한쪽을 즉시 맞춰야 합니다.
- `WorkspaceWatchFallbackEvent`에 remote/local 구분 신호를 넣거나, renderer에서 기존 `isRemoteMounted`를 보존하도록 수정해야 합니다.

Should:
- `fallbackApplied` 경로에서도 auto-dismiss 타이머를 걸고, 관련 App 테스트를 추가하는 편이 좋습니다.
- 수동 smoke 체크리스트 중 watch fallback, 탭 전환 shortcut, remote badge 노출 조건은 별도 라운드로 실제 Electron 상호작용 검증을 수행해야 합니다.

Could:
- `src/App.tsx`, `src/spec-viewer/spec-viewer-panel.tsx`는 이번 라운드에서 남은 책임을 한 번 더 잘라서 로드맵 목표치에 더 가깝게 맞출 수 있습니다.

## 5. Conclusion
구조 분리 자체는 충분히 진행됐고 자동 게이트도 현재 워크트리 기준으로는 녹색입니다. 하지만 이번 작업의 핵심 성공 조건은 “예쁘게 쪼갰는가”보다 “기존 계약과 동작이 유지됐는가”였고, 그 기준에서는 키보드 shortcut drift, watch fallback 상태 표기, fallback 배너 dismiss 누락이 아직 남아 있어 최종 종료 판정으로 보기에는 이릅니다.
