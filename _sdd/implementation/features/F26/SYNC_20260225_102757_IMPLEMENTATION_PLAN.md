# Implementation Plan: F24 코드 에디터 (CodeMirror 6)

## 메타데이터

- 생성일: 2026-02-24
- 기준 문서:
  - Feature Draft: `_sdd/drafts/feature_draft_f24_code_editor_codemirror6.md`
  - Spec: `_sdd/spec/main.md` (v0.36.0)
- 브랜치: `feat/text_editor`
- 모델 권장: Phase 1 `opus`, Phase 2~4 `sonnet`

## Overview

기존 custom line-rendering + Shiki 기반 read-only CodeViewerPanel을 CodeMirror 6 기반 CodeEditorPanel로 교체한다. 4개 Phase로 점진 마이그레이션하여 각 Phase마다 독립 검증 가능.

## Scope

### In Scope

- CM6 에디터 (read-only → editable), 다크 테마, 언어 매핑
- Selection bridge (CM6 → LineSelectionRange)
- CM6 `@codemirror/search` (기존 F21 대체)
- `workspace:writeFile` IPC + Cmd+S 저장 + dirty 상태
- Unsaved changes guard + watcher dirty-aware reload
- Git marker / Comment badge gutter extension
- 레거시 code-viewer 정리

### Out of Scope

- Auto-save, auto-format, LSP, minimap, multi-cursor 커스텀
- Shiki 삭제 (spec-viewer 사용 중)

## 사전 조건 (확인 완료)

- CM6 패키지 이미 설치됨 (`package.json`에 `@codemirror/*` 의존성 존재)
- `LineSelectionRange` 타입이 `workspace-model.ts`에 정의됨
- IPC 패턴 확립됨 (`electron/main.ts` + `preload.ts` + `electron-env.d.ts`)

## Phase 구성

| Phase | 파일 | 태스크 | 핵심 목표 |
|-------|------|--------|-----------|
| 1 | [IMPLEMENTATION_PLAN_PHASE_1.md](./IMPLEMENTATION_PLAN_PHASE_1.md) | T1~T5 | CM6 Read-Only 교체 |
| 2 | [IMPLEMENTATION_PLAN_PHASE_2.md](./IMPLEMENTATION_PLAN_PHASE_2.md) | T6~T10 | 편집 + 저장 + Dirty 상태 |
| 3 | [IMPLEMENTATION_PLAN_PHASE_3.md](./IMPLEMENTATION_PLAN_PHASE_3.md) | T11~T13 | Gutter Extensions |
| 4 | [IMPLEMENTATION_PLAN_PHASE_4.md](./IMPLEMENTATION_PLAN_PHASE_4.md) | T14~T15 | 레거시 정리 + 테스트 보강 |

## 전체 의존성 그래프

```
Phase 1:  T1 ──┬── T4 ── T5
          T2 ──┤
          T3 ──┘

Phase 2:  T6 ── T7 ──┬── T8 ── T9
                      └── T10
          (T5 → T8 의존)

Phase 3:  T11 ┐
          T12 ├── (T5 의존, 서로 독립)
          T13 ┘

Phase 4:  T14 ── (T5,T11,T12,T13 의존)
          T15 ── (T4,T8,T11,T12 의존, 점진적)
```

## 병렬 실행 요약

| Phase | 총 태스크 | 최대 병렬 | 순차 필수 | 파일 충돌 |
|-------|-----------|-----------|-----------|-----------|
| 1 | 5 | 3 (T1∥T2∥T3) | T4→T5 | 없음 (T1~T3 독립 파일) |
| 2 | 5 | 2 (T6∥T5완료대기) | T7→T8→T9 | `workspace-context.tsx` (T7,T9,T10 순차) |
| 3 | 3 | 3 (T11∥T12∥T13) | 없음 | `code-editor-panel.tsx` (T11,T12,T13 순차 통합) |
| 4 | 2 | 1 | T14 last | 없음 |

## 검증 기준 (Phase별)

각 Phase 완료 후:
1. `npx tsc --noEmit` — 타입 에러 없음
2. `npm test` — 전체 테스트 통과
3. `npm run build` — 빌드 성공
4. 수동 스모크 테스트(Phase별 체크리스트는 각 Phase 문서 참조)

## 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| CM6 번들 크기 증가 | Medium | 언어 패키지 lazy import, tree shaking |
| CM6 jsdom 테스트 호환성 | Medium | extension 로직을 순수 함수로 분리 |
| dirty 상태에서 watcher race condition | Medium | dirty 체크를 watcher handler 내에서 동기적 수행 (ref) |
| 대용량 파일 CM6 성능 | Low | CM6 virtual rendering (viewport 밖 미렌더) |
