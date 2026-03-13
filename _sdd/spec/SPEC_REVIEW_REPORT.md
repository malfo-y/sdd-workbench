# Spec Review Report (Strict)

**Date**: 2026-03-13
**Reviewer**: Codex
**Scope**: Spec+Code
**Spec Files**: `main.md`, `summary.md`, `operations.md`, `code-map.md`, `feature-index.md`, `decision-log.md`, `appendix/*.md`, `appearance-and-navigation/*`, `code-editor/*`, `comments-and-export/*`, `remote-workspace/*`, `spec-viewer/*`, `workspace-and-file-tree/*`
**Code State**: `59dc70a` (`git status --porcelain` = 15, dirty workspace)
**Decision**: SYNC_REQUIRED

## Executive Summary

이번 리뷰에서 `main.md`의 whitepaper 본문과 sampled implementation은 전반적으로 잘 맞았고, 필수 섹션/코드 citation/링크 정합성도 양호했다. 다만 supporting docs 중 [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md) 가 아직 pre-whitepaper 상태를 설명하고 있고, [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md) 및 [`operations.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/operations.md) 가 문서화한 품질 게이트 수치가 현재 review 환경에서 재현되지 않았다. 구조적 고장은 아니지만, 다음 planning/release 전에 문서 동기화가 필요하므로 판정은 `SYNC_REQUIRED`다.

## Findings by Severity

### High

없음.

### Medium

1. `summary.md`가 새 canonical whitepaper 상태를 아직 반영하지 못하고 있다.
   - Evidence: [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md):3-5 는 여전히 `0.45.0` / `2026-03-12` 기준이고, [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md):18-21 는 `product-overview` 기준 상태와 2026-03-12 재구성을 현재 구조처럼 설명한다. 반면 [`main.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md):5-19 는 이미 `0.46.0` / `2026-03-13` whitepaper `§1-§8 + Appendix` 구조를 canonical entry point로 선언한다. [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md):167-178 도 `main.md`를 여전히 “인덱스 (목표+아키텍처+컴포넌트맵)”로 설명한다.
   - Impact: 사용자가 요약 문서부터 읽으면 현재 canonical spec 구조와 버전을 잘못 이해할 수 있고, 하위 문서 탐색 순서도 어긋난다.
   - Recommendation: `/spec-update-done`로 [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md) 를 재생성하거나 최소한 메타데이터, 구조 설명, 상태 문구를 `main.md` 기준으로 맞춘다.

2. 문서에 적힌 자동 품질 게이트가 현재 상태에서 재현되지 않는다.
   - Evidence: [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md):189-192 와 [`operations.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/operations.md):54-58 는 `npm test -> 49 files, 493 passed, 1 skipped` 를 현재 품질 게이트처럼 적고 있다. 그러나 이번 리뷰에서 `_sdd/env.md` 기준을 읽은 뒤 `node -v`, `npm -v`, `npm test`를 실행했을 때 결과는 `node v25.2.1`, `npm 11.7.0`, `Test Files no tests`, `Errors 63` 였다. 별도 확인에서 저장소에는 test file이 63개 존재했다 (`rg --files src electron | rg '\\.(test|spec)\\.(ts|tsx)$' | wc -l`).
   - Impact: 스펙이 현재 검증 상태를 과대 서술하고 있어 planning/release 판단에 잘못된 안전 신호를 줄 수 있다.
   - Recommendation: 문서를 “2026-03-02 last known good”로 명시하거나, Node 20.x baseline에서 게이트를 재실행해 최신 결과로 갱신한다. 재현 전까지는 현재 pass 수치를 active quality gate로 두지 않는 편이 안전하다.

### Low

1. 환경 기준이 “권장 baseline”만 적고 있어 현재 review 환경에서의 실패 원인을 문서만으로는 판정하기 어렵다.
   - Evidence: [`_sdd/env.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/env.md):6-9 는 Node `20.x` LTS 를 권장한다고만 적고 있으며, 이번 리뷰 환경은 `node v25.2.1` 이었다. 현재 스펙/환경 문서에는 “20.x only validated” 같은 지원 범위 문구가 없다.
   - Impact: 현재 테스트 실패가 실제 회귀인지, baseline 밖 환경에서의 비지원 상태인지 문서만으로 구분하기 어렵다.
   - Recommendation: 지원하는 Node major를 명시하거나, 최소한 “자동 품질 게이트는 Node 20.x 기준으로 검증한다”는 문구를 환경 문서 또는 operations에 추가한다.

## Spec-Only Quality Notes

- Clarity: [`main.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md) 는 배경, 핵심 설계, usage, data model, API, environment를 모두 갖춘 whitepaper로 읽기 쉬워졌다.
- Completeness: 상위 문서 기준으로는 whitepaper 필수 섹션이 모두 존재한다. glossary, appendix, component overview/contracts도 유지되어 설명층과 계약층이 분리되어 있다.
- Consistency: reviewed docs 기준 broken relative link는 발견되지 않았다. 다만 [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md) 는 version/structure/status 표현이 [`main.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md) 와 불일치한다.
- Testability: [`main.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md) 의 success criteria는 이전보다 측정 가능해졌고, [`operations.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/operations.md) 의 수동 스모크도 상세하다. 다만 자동 게이트 수치는 현재 stale 하다.
- Structure: split spec 구조는 navigable 하며, `main -> overview/contracts -> operations/code-map/feature-index -> appendix/decision-log` 흐름이 자연스럽다.
- Ownership: [`main.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md) §4 는 각 컴포넌트의 Why/Responsibility/Interface/Source 를 명시해 경계가 비교적 명확하다.

## Spec-to-Code Drift Notes

- Architecture: sampled code (`src/App.tsx`, `src/workspace/workspace-context.tsx`, `electron/main.ts`, `electron/remote-agent/runtime/agent-main.ts`) 는 `main.md` 의 renderer/preload/main/remote agent 분리와 일치했다.
- Features: code/spec navigation, comments export, remote connect/browse, theme menu sync에 대한 주요 주장에서는 material drift를 찾지 못했다.
- API: [`main.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/main.md) §7 과 sampled IPC handlers(`registerIpcHandlers`, `handleWorkspaceConnectRemote`) 사이에서 큰 계약 불일치는 발견되지 않았다.
- Configuration: `main.md` 의 dependency/stack 표는 현재 `package.json` 과 대체로 맞는다. 다만 runtime validation baseline은 문서화가 더 필요하다.
- Issues/Technical debt: 현재 quality gate evidence는 stale 하며, dirty workspace(`git status --porcelain = 15`) 상태에서 수집된 결과라는 점도 함께 고려해야 한다.

## Open Questions

1. 이 저장소는 Node 25.x 를 공식 지원해야 하는가, 아니면 Node 20.x baseline 밖 환경은 비지원으로 문서화해야 하는가?
2. `summary.md` 는 `spec-upgrade`/`spec-update-done` 이후 자동 재생성 대상인가, 아니면 수동 산출물로 유지할 것인가?

## Suggested Next Actions

1. `/spec-update-done` 를 실행해 [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md) 의 버전, 구조 설명, quality gate 섹션을 `main.md` 및 현재 검증 상태와 동기화한다.
2. Node 20.x 기준으로 `npm test` 를 다시 실행해 documented quality gate를 재검증하고, 결과를 [`operations.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/operations.md) / [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md) 에 반영한다.
3. Node 25.x 지원을 원한다면 implementation task로 테스트 수집 실패 원인을 분리 조사한다.

## Decision Log Follow-ups (Proposal Only)

- Proposed entry: 품질 게이트 검증 baseline을 Node 20.x 로 명시하거나 지원 범위를 재정의
  - Context:
    - 현재 `_sdd/env.md` 는 Node 20.x 를 권장하지만, current review environment는 Node 25.2.1 이었고 `npm test` 가 문서화된 결과를 재현하지 못했다.
  - Decision:
    - 자동 품질 게이트의 검증 baseline을 명시하고, baseline 밖 버전은 지원 여부를 별도로 표기한다.
  - Rationale:
    - 테스트 실패의 성격(회귀 vs 비지원 환경)을 문서만으로 구분 가능해야 한다.
  - Alternatives considered:
    - 환경 baseline을 느슨하게 유지하고 매 리뷰마다 해석에 맡긴다.
  - Impact / follow-up:
    - `env.md`, `operations.md`, `summary.md` 의 quality gate 해석이 더 명확해진다.

## Handoff for Spec Updates (if SYNC_REQUIRED)

- Recommended command: `/spec-update-done`
- Update priorities:
  - P1: [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md) 메타데이터, 구조 설명, 상태 문구를 `main.md` 기준으로 동기화
  - P2: [`summary.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/summary.md), [`operations.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/spec/operations.md) 의 quality gate 섹션을 “최신 검증 결과” 또는 “last known good” 로 수정
  - P3: [`_sdd/env.md`](/Users/hyunjoonlee/github/sdd-workbench/_sdd/env.md) 또는 operations에 Node support/validation baseline 명시
