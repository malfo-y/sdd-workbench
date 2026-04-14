# CLAUDE.md

## Project Overview

SDD Workbench — Electron + React + TypeScript 데스크톱 앱.
코드와 Markdown 스펙을 왕복 탐색·리뷰하는 워크벤치.

## Quick Start

```bash
npm install
npm run dev          # Electron dev server
npm test             # Vitest (remote agent runtime 빌드 포함)
npm run lint
npm run build        # 전체 빌드 (tsc + vite + electron-builder)
```

remote agent runtime 수정 시 `npm run build:remote-agent-runtime` 선행.

## Key Directories

```
src/                    React renderer, panels, app shell, state
electron/               Main process, preload, backend router, remote agent
_sdd/spec/              스펙 문서 (global spec + component overview/contracts)
_sdd/implementation/    구현 계획/리뷰 기록
```

## Spec Structure

- Global spec: `_sdd/spec/main.md`
- Component specs: `_sdd/spec/<component>/overview.md` + `contracts.md`
- Feature index: `_sdd/spec/feature-index.md`
- Code map: `_sdd/spec/code-map.md`
- Operations: `_sdd/spec/operations.md`
- Decision log: `_sdd/spec/decision-log.md`

## Architecture Invariants

- 실행 경계는 `activeWorkspaceId` 기준
- 라인 번호는 1-based, exact offset은 0-based half-open range
- local/remote 차이는 `workspace:*` IPC 뒤에 숨긴다
- theme source of truth는 renderer (localStorage), main은 menu mirror만
- comments source of truth는 `.sdd-workbench/comments.json` + `global-comments.md`

## Testing

- `npm test` — Vitest + jsdom, 모든 `*.test.ts(x)` 실행
- 수동 스모크 체크리스트: `_sdd/spec/operations.md`
- UI 변경 시 반드시 `npm run dev`로 실제 확인

## Environment

- OS: macOS primary
- Node.js: 20.x LTS (최소 >=20)
- Package manager: npm
- 상세: `_sdd/env.md`
