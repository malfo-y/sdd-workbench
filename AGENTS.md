# AGENTS.md

## 이 저장소에서 작업하는 에이전트를 위한 지침

### 스펙 먼저

구현 전에 관련 스펙을 읽는다:
1. `_sdd/spec/main.md` — 프로젝트 범위와 설계 판단
2. 관련 `_sdd/spec/<component>/overview.md` + `contracts.md` — 컴포넌트 규칙
3. `_sdd/spec/feature-index.md` — 기능 ID로 범위 추적

### 품질 게이트

코드 변경 후 반드시 확인:
```bash
npm test
npm run lint
```

UI 변경 시 `npm run dev`로 Electron 앱에서 직접 확인한다.

### 구현 코드 수정 규칙

- 기존 테스트가 깨지지 않도록 한다
- 새 기능에는 테스트를 추가한다
- IPC 채널 추가/변경 시 관련 contracts.md를 함께 업데이트한다

### 스펙 수정 규칙

- `main.md`는 thin global spec — feature-level 상세를 넣지 않는다
- feature-level 설명은 `<component>/overview.md`에, 계약은 `contracts.md`에 넣는다
- 새 기능 추가 시 `feature-index.md`를 업데이트한다
- 의사결정 이력은 `decision-log.md`에 기록한다

### 환경

- Node.js 20.x, npm, macOS primary
- 상세: `_sdd/env.md`
