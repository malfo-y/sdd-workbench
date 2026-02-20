# _sdd/env.md

이 문서는 이 저장소에서 구현/테스트를 수행할 때 따라야 할 실행 환경 기준이다.

## 1) 런타임/도구 버전

- OS: macOS (primary)
- Shell: `zsh`
- Node.js: `20.x` LTS 권장 (최소 `>=20`)
- npm: `>=10`

버전 확인:

```bash
node -v
npm -v
```

## 2) 패키지 매니저 정책

- 기본 패키지 매니저: `npm`
- 이 저장소에서는 `uv`를 사용하지 않음 (Python 프로젝트 아님)
- `pnpm`/`yarn`은 특별 지시가 없으면 사용하지 않음

## 3) 의존성 설치

프로젝트 루트에서 실행:

```bash
npm install
```

참고:

- `package.json`이 변경된 경우 lockfile 동기화를 위해 `npm install`을 다시 실행한다.

## 4) 표준 실행 명령

프로젝트 루트 기준:

```bash
# 개발 실행
npm run dev

# 테스트 실행
npm test

# 린트
npm run lint

# 빌드
npm run build
```

## 5) 테스트 환경 기준

- 테스트 러너: `vitest`
- DOM 환경: `jsdom`
- 테스트 설정 파일: `vitest.config.ts`, `src/test/setup.ts`
- 자동 테스트는 headless로 실행 가능해야 함

## 6) 구현 스킬 실행 규칙(이 저장소용)

`implementation` 스킬이 테스트/실행 명령을 수행하기 전에:

1. 현재 작업 디렉터리가 저장소 루트인지 확인
2. `node -v`, `npm -v` 확인
3. 필요 시 `npm install` 실행
4. `npm test` 실행 후 결과를 `_sdd/implementation/*` 보고서에 기록

## 7) 환경 변수

- 현재 F01 범위에서는 필수 환경 변수 없음
- 새 기능이 env var를 요구하면 이 문서에 추가한다
