# Review Plan: SDD Workbench 전체 코드 품질 리뷰

## Plan 요약

| 항목 | 내용 |
|------|------|
| 총 세션 수 | 8 |
| 총 리뷰 대상 LOC | ~36,500 (소스 코드만, 테스트 제외) |
| 정밀 리뷰 세션 | 3 (R1 ~ R3) |
| 하이브리드 리뷰 세션 | 5 (R4 ~ R8) |
| 순서 전략 | Risk-weighted |
| 결과 출력 | `_sdd/review/<module>.md` 모듈별 파일 |

## 메타데이터

- 생성일: 2026-04-14
- 기준 문서:
  - 토론 기록: `_sdd/discussion/2026-04-14_discussion_code_quality_review_plan.md`
  - 스펙: `_sdd/spec/main.md`
- 리뷰 목적: 코드 품질 점검 (버그, 안티패턴, 중복, 보안 취약점 등)
- 스펙 변경: 없음 (읽기 전용 리뷰)

## Overview

SDD Workbench (~36.5K LOC 소스, 167 파일)의 전체 코드를 기능 모듈별로 리뷰하여 코드 품질 이슈를 발견하고 문서화한다. 위험도가 높은 모듈(IPC 경계, 상태 관리, SSH 통신)부터 정밀 리뷰하고, 나머지는 구조 스캔 후 의심 영역만 정밀 리뷰하는 하이브리드 방식으로 진행한다.

## Scope

### In Scope

- `electron/` 및 `src/` 하위 모든 소스 파일의 코드 품질 점검
- 11개 체크리스트 항목 기준 일관된 리뷰
- 모듈별 발견 사항 문서화 (`_sdd/review/`)

### Out of Scope

- 테스트 코드 자체의 품질 리뷰 (테스트 커버리지 갭만 확인)
- 코드 수정/리팩토링 (발견 및 기록만)
- CSS/스타일 품질 리뷰 (기능 로직에 집중)
- `_sdd/` 문서 품질 리뷰
- 성능 프로파일링 / 벤치마크

## 품질 체크리스트

모든 세션에서 아래 11개 항목을 일관되게 점검한다.

| ID | 점검 항목 | 설명 | 정밀 세션 | 하이브리드 세션 |
|----|----------|------|:---------:|:--------------:|
| Q1 | 파일/함수 크기 | 100+ LOC 함수, God Object | 전수 | 구조 스캔 |
| Q2 | 에러 핸들링 | 삼킨 에러, 미처리 Promise, 빈 catch | 라인별 | 의심 영역만 |
| Q3 | 타입 안전성 | `any`, unsafe assertion, 타입 가드 누락 | 라인별 | 구조 스캔 |
| Q4 | 코드 중복 | 추출 가능한 반복 패턴 | 라인별 | 구조 스캔 |
| Q5 | 네이밍 일관성 | 컨벤션 위반, 혼용 패턴 | 확인 | 확인 |
| Q6 | 데드 코드 | 미사용 export, 도달불가 분기 | 라인별 | 구조 스캔 |
| Q7 | 보안 | 경로 탈출, 입력 미검증, XSS, 인젝션 | 라인별 | 의심 영역만 |
| Q8 | 비동기 패턴 | 레이스 컨디션, 정리 누락, await 누락 | 라인별 | 의심 영역만 |
| Q9 | 메모리 누수 | 이벤트 리스너 미해제, 구독 미정리, 타이머 미정리 | 라인별 | 의심 영역만 |
| Q10 | 엣지 케이스 | null/undefined, 빈 배열, 경계값, 빈 문자열 | 라인별 | 의심 영역만 |
| Q11 | 테스트 커버리지 | 핵심 경로에 테스트 없는 곳, 엣지 케이스 테스트 부재 | 확인 | 확인 |

## 세션별 리뷰 결과 출력 형식

각 세션 완료 시 `_sdd/review/<module>.md` 파일을 생성한다.

```markdown
# Code Quality Review: [모듈명]

**날짜**: YYYY-MM-DD
**세션**: R[N]
**리뷰 깊이**: 정밀 / 하이브리드

## 발견 사항 요약

| # | 심각도 | 카테고리 | 위치 | 설명 |
|---|--------|---------|------|------|

## 상세 발견

### [F1: 발견 제목]
- **파일**: path:line
- **심각도**: Critical / High / Medium / Low / Info
- **카테고리**: Q[N] — [항목명]
- **설명**: ...
- **제안**: ...

## 긍정적 패턴 (Good Patterns)
- ...

## 모듈 종합 평가
- 전체 인상:
- 가장 큰 위험:
- 권장 후속 조치:
```

## Review Sessions

### 세션 배치 개요

```
[정밀] R1 ── R2 ── R3 ──┐
                          ├── R4 ── R5 ── R6 ── R7 ── R8 [하이브리드]
                          │
              (R1~R3에서 발견한 패턴이 R4~R8의 의심 영역 선정을 안내)
```

| 세션 | 대상 모듈 | 소스 LOC | 깊이 | 핵심 위험 영역 |
|------|----------|---------|------|--------------|
| **R1** | Electron Main + Preload | 4,121 | 정밀 | IPC 경계, 파일 I/O, 모놀리스 |
| **R2** | Workspace 상태 관리 | 6,171 | 정밀 | 100+ 프로퍼티 상태, reducer 로직 |
| **R3** | Remote Agent | 4,294 | 정밀 | SSH 통신, 연결 풀링, 신뢰성 |
| **R4** | Spec Viewer | 4,256 | 하이브리드 | HTML 살균, 파싱, 2246줄 패널 |
| **R5** | Code Comments | 2,020 | 하이브리드 | 파일 I/O, 앵커 매핑 |
| **R6** | Code Editor + Code Viewer | 2,576 | 하이브리드 | CM6 통합, Shiki 테마 |
| **R7** | File Tree + Context + Utilities | 1,876 | 하이브리드 | CRUD, 클립보드, 파일시스템 |
| **R8** | App Shell + Workspace Backend + Electron Support | 8,232 | 하이브리드 | 앱 루트, 라우팅, 유틸리티 |

---

## Session Details

### R1: Electron Main + Preload (정밀 리뷰)

**리뷰 깊이**: 정밀 — 라인 단위로 읽으며 모든 체크리스트 항목 점검
**출력 파일**: `_sdd/review/electron-main.md`
**핵심 관심사**: IPC 핸들러 보안, 파일 I/O 에러 핸들링, 3500줄 모놀리스 구조

**리뷰 전략**:
1. `main.ts`의 IPC 핸들러 전수 조사: 입력 검증, 에러 핸들링, 반환 타입
2. 파일 시스템 조작: 경로 탈출, 에러 전파, 비동기 처리
3. Git 통합: 프로세스 관리, 타임아웃, 에러
4. 모놀리스 분석: 책임 분리 가능성, 관심사 혼합 영역
5. `preload.ts`와의 타입 일관성 검증

**리뷰 대상 파일**:

| 파일 | LOC | 초점 영역 |
|------|-----|----------|
| `electron/main.ts` | 3,511 | IPC 핸들러, 파일 I/O, Git, 윈도우 관리 |
| `electron/preload.ts` | 610 | 채널 정의, 타입 안전성, context bridge |

**세션 시작 프롬프트**:
```
세션 R1: electron/main.ts + preload.ts 정밀 코드 품질 리뷰를 시작하자.
_sdd/drafts/2026-04-14_review_plan_code_quality.md 의 R1 세션 계획을 따라서,
체크리스트 Q1~Q11 전항목을 라인 단위로 점검해줘.
결과는 _sdd/review/electron-main.md 에 기록해줘.

먼저 electron/main.ts를 읽고 IPC 핸들러 전수 조사부터 시작.
파일이 3500줄이니까 500줄씩 나눠서 읽어.
```

---

### R2: Workspace 상태 관리 (정밀 리뷰)

**리뷰 깊이**: 정밀 — 상태 흐름과 reducer 로직을 라인 단위로 추적
**출력 파일**: `_sdd/review/workspace.md`
**핵심 관심사**: 상태 일관성, reducer 복잡도, 메모리 누수, 비동기 상태 갱신

**리뷰 전략**:
1. `workspace-context.tsx` (3677줄): 상태 정의, 이펙트, 이벤트 핸들러 전수 조사
2. `workspace-model.ts` (1203줄): reducer 액션별 상태 전이 검증
3. `workspace-persistence.ts`: 직렬화/역직렬화 안전성
4. 상태 업데이트 레이스 컨디션: IPC 응답과 UI 상태 갱신 타이밍
5. 이펙트 클린업: useEffect 반환 함수 검증

**리뷰 대상 파일**:

| 파일 | LOC | 초점 영역 |
|------|-----|----------|
| `src/workspace/workspace-context.tsx` | 3,677 | 상태 정의, 이펙트, IPC 호출 |
| `src/workspace/workspace-model.ts` | 1,203 | reducer, 액션, 상태 전이 |
| `src/workspace/workspace-persistence.ts` | 403 | 직렬화, IndexedDB, 복원 로직 |
| `src/workspace/remote-connect-modal.tsx` | 707 | SSH 연결 UI, 폼 검증 |
| `src/workspace/path-format.ts` | 117 | 경로 정규화 |
| `src/workspace/workspace-switcher.tsx` | 54 | 탭 전환 UI |
| `src/workspace/use-workspace.ts` | 10 | context hook |

**세션 시작 프롬프트**:
```
세션 R2: Workspace 상태 관리 정밀 코드 품질 리뷰를 시작하자.
_sdd/drafts/2026-04-14_review_plan_code_quality.md 의 R2 세션 계획을 따라서,
체크리스트 Q1~Q11 전항목을 라인 단위로 점검해줘.
결과는 _sdd/review/workspace.md 에 기록해줘.

workspace-context.tsx (3677줄)부터 시작. 500줄씩 나눠서 읽어.
특히 상태 업데이트 레이스 컨디션과 useEffect 클린업에 집중해줘.
```

---

### R3: Remote Agent (정밀 리뷰)

**리뷰 깊이**: 정밀 — SSH 통신 경로를 end-to-end로 추적
**출력 파일**: `_sdd/review/remote-agent.md`
**핵심 관심사**: SSH 보안, 연결 관리, 에러 복구, 프로토콜 일관성

**리뷰 전략**:
1. 통신 경로 추적: transport → connection → session → request 흐름
2. 에러 핸들링: SSH 연결 실패, 타임아웃, 재시도 정책
3. 보안: 인증 정보 처리, 경로 가드, 입력 검증
4. 리소스 관리: 연결 풀 정리, 세션 해제, 파일 핸들
5. Runtime 에이전트: 원격에서 실행되는 코드의 방어적 프로그래밍

**리뷰 대상 파일**:

| 파일 | LOC | 초점 영역 |
|------|-----|----------|
| `electron/remote-agent/transport-ssh.ts` | 506 | SSH 전송 계층, 스트림 관리 |
| `electron/remote-agent/connection-service.ts` | 474 | 연결 풀링, 생명주기 |
| `electron/remote-agent/directory-browser.ts` | 404 | 원격 디렉토리 탐색 |
| `electron/remote-agent/bootstrap.ts` | 336 | 에이전트 부트스트랩 |
| `electron/remote-agent/session-registry.ts` | 139 | 세션 추적 |
| `electron/remote-agent/protocol.ts` | 128 | 프로토콜 정의 |
| `electron/remote-agent/framing.ts` | 92 | 메시지 프레이밍 |
| `electron/remote-agent/reliability-policy.ts` | 85 | 재시도/타임아웃 |
| `electron/remote-agent/security.ts` | 80 | 보안 검증 |
| `electron/remote-agent/types.ts` | 52 | 타입 정의 |
| `electron/remote-agent/runtime/workspace-ops.ts` | 1,031 | 원격 파일 조작 |
| `electron/remote-agent/runtime/watch-ops.ts` | 311 | 원격 파일 감시 |
| `electron/remote-agent/runtime/request-router.ts` | 261 | 요청 라우팅 |
| `electron/remote-agent/runtime/agent-main.ts` | 138 | 에이전트 엔트리 |
| `electron/remote-agent/runtime/copy-ops.ts` | 102 | 복사 연산 |
| `electron/remote-agent/runtime/runtime-types.ts` | 80 | 런타임 타입 |
| `electron/remote-agent/runtime/path-guard.ts` | 65 | 경로 보안 |

**세션 시작 프롬프트**:
```
세션 R3: Remote Agent 정밀 코드 품질 리뷰를 시작하자.
_sdd/drafts/2026-04-14_review_plan_code_quality.md 의 R3 세션 계획을 따라서,
체크리스트 Q1~Q11 전항목을 라인 단위로 점검해줘.
결과는 _sdd/review/remote-agent.md 에 기록해줘.

transport-ssh.ts → connection-service.ts → session-registry.ts 순으로
통신 경로를 따라가며 리뷰해줘. 보안(Q7)과 에러 핸들링(Q2)에 특히 집중.
```

---

### R4: Spec Viewer (하이브리드 리뷰)

**리뷰 깊이**: 하이브리드 — 구조 스캔 후 보안/파싱/2246줄 패널에 정밀 집중
**출력 파일**: `_sdd/review/spec-viewer.md`
**핵심 관심사**: HTML 살균 (XSS), 마크다운 파싱 정확성, 2246줄 패널 복잡도

**리뷰 전략**:
1. 전체 모듈 구조 스캔: 파일별 역할, 의존 관계, 공개 API
2. 정밀 집중 영역:
   - `markdown-security.ts` (172줄): 살균 규칙 완전성 (Q7)
   - `spec-viewer-panel.tsx` (2246줄): 컴포넌트 크기, 상태 관리 (Q1, Q8, Q9)
   - `source-line-resolver.ts` (611줄): 파싱 로직 엣지 케이스 (Q10)
3. 나머지 파일은 시그니처/패턴 수준 스캔

**리뷰 대상 파일**:

| 파일 | LOC | 스캔 깊이 |
|------|-----|----------|
| `src/spec-viewer/spec-viewer-panel.tsx` | 2,246 | **정밀** |
| `src/spec-viewer/source-line-resolver.ts` | 611 | **정밀** |
| `src/spec-viewer/remark-citation-links.ts` | 211 | 구조 + 의심 영역 |
| `src/spec-viewer/citation-target.ts` | 193 | 구조 |
| `src/spec-viewer/spec-link-utils.ts` | 179 | 구조 |
| `src/spec-viewer/markdown-security.ts` | 172 | **정밀** |
| `src/spec-viewer/python-symbol-resolver.ts` | 153 | 구조 |
| `src/spec-viewer/source-line-metadata.ts` | 129 | 구조 |
| `src/spec-viewer/spec-link-popover.tsx` | 99 | 구조 |
| `src/spec-viewer/rehype-source-text-leaves.ts` | 80 | 구조 |
| `src/spec-viewer/markdown-utils.ts` | 72 | 구조 |
| `src/spec-viewer/spec-search.ts` | 64 | 구조 |
| `src/spec-viewer/code-block-citation.ts` | 47 | 구조 |

**세션 시작 프롬프트**:
```
세션 R4: Spec Viewer 하이브리드 코드 품질 리뷰를 시작하자.
_sdd/drafts/2026-04-14_review_plan_code_quality.md 의 R4 세션 계획을 따라서 진행해줘.
결과는 _sdd/review/spec-viewer.md 에 기록해줘.

먼저 모든 파일의 export/import 관계를 빠르게 스캔한 뒤,
markdown-security.ts (보안), spec-viewer-panel.tsx (크기/복잡도),
source-line-resolver.ts (파싱 로직)를 정밀 리뷰해줘.
```

---

### R5: Code Comments (하이브리드 리뷰)

**리뷰 깊이**: 하이브리드 — 구조 스캔 후 파일 I/O와 앵커 로직에 정밀 집중
**출력 파일**: `_sdd/review/code-comments.md`
**핵심 관심사**: 파일 I/O 에러 핸들링, 앵커-라인 매핑 정확성, 데이터 직렬화

**리뷰 전략**:
1. 전체 모듈 구조 스캔
2. 정밀 집중 영역:
   - `comment-persistence.ts` (170줄): 파일 I/O, 에러 핸들링 (Q2, Q7)
   - `comment-line-index.ts` (229줄): 앵커-라인 매핑 로직 (Q10)
   - `comment-anchor.ts` (154줄): 앵커 정확도 (Q10)
3. 모달 컴포넌트 (`comment-list-modal.tsx` 666줄 등)는 구조 스캔

**리뷰 대상 파일**:

| 파일 | LOC | 스캔 깊이 |
|------|-----|----------|
| `src/code-comments/comment-list-modal.tsx` | 666 | 구조 + Q1 확인 |
| `src/code-comments/export-comments-modal.tsx` | 240 | 구조 |
| `src/code-comments/comment-line-index.ts` | 229 | **정밀** |
| `src/code-comments/comment-persistence.ts` | 170 | **정밀** |
| `src/code-comments/comment-anchor.ts` | 154 | **정밀** |
| `src/code-comments/comment-editor-modal.tsx` | 134 | 구조 |
| `src/code-comments/comment-hover-popover.tsx` | 130 | 구조 |
| `src/code-comments/global-comments-modal.tsx` | 117 | 구조 |
| `src/code-comments/comment-export.ts` | 98 | 구조 |
| `src/code-comments/comment-types.ts` | 81 | 구조 |
| `src/code-comments/comment-config.ts` | 1 | 구조 |

**세션 시작 프롬프트**:
```
세션 R5: Code Comments 하이브리드 코드 품질 리뷰를 시작하자.
_sdd/drafts/2026-04-14_review_plan_code_quality.md 의 R5 세션 계획을 따라서 진행해줘.
결과는 _sdd/review/code-comments.md 에 기록해줘.

구조 스캔 후 comment-persistence.ts, comment-line-index.ts,
comment-anchor.ts를 정밀 리뷰. 파일 I/O 에러 핸들링과 앵커 정확성에 집중.
```

---

### R6: Code Editor + Code Viewer (하이브리드 리뷰)

**리뷰 깊이**: 하이브리드 — CM6 통합과 Shiki 테마를 중심으로 의심 영역 정밀 집중
**출력 파일**: `_sdd/review/code-editor.md`
**핵심 관심사**: CM6 extension 생명주기, Shiki 리소스 관리, 테마 일관성

**리뷰 전략**:
1. 전체 구조 스캔: CM6 extension 구성, Shiki 하이라이터 초기화
2. 정밀 집중 영역:
   - `code-editor-panel.tsx` (1082줄): CM6 EditorView 생명주기, 메모리 (Q1, Q9)
   - `syntax-highlight.ts` (210줄): Shiki 인스턴스 관리 (Q9)
3. 거터/테마 파일은 구조 스캔

**리뷰 대상 파일**:

| 파일 | LOC | 스캔 깊이 |
|------|-----|----------|
| `src/code-editor/code-editor-panel.tsx` | 1,082 | **정밀** |
| `src/code-viewer/shiki-ayu-mirage-theme.ts` | 233 | 구조 |
| `src/code-viewer/shiki-quiet-light-theme.ts` | 235 | 구조 |
| `src/code-viewer/syntax-highlight.ts` | 210 | **정밀** |
| `src/code-editor/cm6-dark-theme.ts` | 185 | 구조 |
| `src/code-editor/cm6-light-theme.ts` | 183 | 구조 |
| `src/code-editor/cm6-comment-gutter.ts` | 116 | 구조 |
| `src/code-editor/cm6-language-map.ts` | 98 | 구조 |
| `src/code-editor/cm6-git-gutter.ts` | 91 | 구조 |
| `src/code-viewer/language-map.ts` | 72 | 구조 |
| `src/code-editor/cm6-navigation-highlight.ts` | 50 | 구조 |
| `src/code-editor/cm6-selection-bridge.ts` | 21 | 구조 |

**세션 시작 프롬프트**:
```
세션 R6: Code Editor + Code Viewer 하이브리드 코드 품질 리뷰를 시작하자.
_sdd/drafts/2026-04-14_review_plan_code_quality.md 의 R6 세션 계획을 따라서 진행해줘.
결과는 _sdd/review/code-editor.md 에 기록해줘.

구조 스캔 후 code-editor-panel.tsx (CM6 생명주기)와
syntax-highlight.ts (Shiki 인스턴스 관리)를 정밀 리뷰.
```

---

### R7: File Tree + Context + Utilities (하이브리드 리뷰)

**리뷰 깊이**: 하이브리드 — 파일시스템 조작과 클립보드를 중심으로 의심 영역 정밀 집중
**출력 파일**: `_sdd/review/file-tree.md`
**핵심 관심사**: CRUD 에러 핸들링, 클립보드 보안, 파일명 처리

**리뷰 전략**:
1. 전체 구조 스캔
2. 정밀 집중 영역:
   - `file-tree-panel.tsx` (1215줄): CRUD 로직, 에러 핸들링 (Q1, Q2, Q7)
3. 나머지 유틸리티 파일은 구조 스캔

**리뷰 대상 파일**:

| 파일 | LOC | 스캔 깊이 |
|------|-----|----------|
| `src/file-tree/file-tree-panel.tsx` | 1,215 | **정밀** |
| `src/modal-drag-position.ts` | 231 | 구조 |
| `src/context-menu/copy-action-popover.tsx` | 144 | 구조 |
| `src/context-copy/copy-payload.ts` | 125 | 구조 |
| `src/modal-wheel-passthrough.ts` | 110 | 구조 |
| `src/source-selection.ts` | 51 | 구조 |

**세션 시작 프롬프트**:
```
세션 R7: File Tree + Context + Utilities 하이브리드 코드 품질 리뷰를 시작하자.
_sdd/drafts/2026-04-14_review_plan_code_quality.md 의 R7 세션 계획을 따라서 진행해줘.
결과는 _sdd/review/file-tree.md 에 기록해줘.

file-tree-panel.tsx (1215줄)를 정밀 리뷰, 나머지는 구조 스캔.
CRUD 연산의 에러 핸들링과 파일명 보안에 집중.
```

---

### R8: App Shell + Workspace Backend + Electron Support (하이브리드 리뷰)

**리뷰 깊이**: 하이브리드 — App.tsx와 라우팅 로직을 중심으로 의심 영역 정밀 집중
**출력 파일**: `_sdd/review/app-shell-and-backend.md`
**핵심 관심사**: 앱 루트 복잡도, 백엔드 라우팅, 유틸리티 파일 품질

**참고**: 이 세션은 소스 LOC가 8,232로 가장 크지만, 많은 파일이 200줄 이하의 유틸리티이고 하이브리드 깊이이므로 한 세션으로 처리 가능하다. context가 부족하면 R8a(App Shell) / R8b(Backend + Support)로 분할한다.

**리뷰 전략**:
1. 전체 구조 스캔
2. 정밀 집중 영역:
   - `src/App.tsx` (2627줄): 루트 컴포넌트 크기, 관심사 분리 (Q1)
   - `electron/workspace-backend/remote-workspace-backend.ts` (342줄): 원격 I/O (Q2, Q8)
   - `electron/system-open.ts` (409줄): 외부 프로세스 실행 보안 (Q7)
   - `electron/file-clipboard.ts` (250줄): 클립보드 + 파일시스템 (Q7)
3. 나머지 유틸리티/설정 파일은 구조 스캔

**리뷰 대상 파일**:

| 그룹 | 파일 | LOC | 스캔 깊이 |
|------|------|-----|----------|
| **App Shell** | `src/App.tsx` | 2,627 | **정밀** (구조 + Q1 집중) |
| | `src/App.css` | 2,139 | 스킵 (CSS) |
| | `src/index.css` | 246 | 스킵 (CSS) |
| | `src/appearance-theme.ts` | 166 | 구조 |
| | `src/main.tsx` | 20 | 구조 |
| **WS Backend** | `electron/workspace-backend/remote-workspace-backend.ts` | 342 | **정밀** |
| | `electron/workspace-backend/types.ts` | 174 | 구조 |
| | `electron/workspace-backend/remote-watch-bridge.ts` | 171 | 구조 + Q8 |
| | `electron/workspace-backend/backend-router.ts` | 97 | 구조 |
| | `electron/workspace-backend/local-workspace-backend.ts` | 84 | 구조 |
| | `electron/workspace-backend/remote-git-bridge.ts` | 40 | 구조 |
| | `electron/workspace-backend/copy-entries.ts` | 32 | 구조 |
| **Electron Support** | `electron/system-open.ts` | 409 | **정밀** |
| | `electron/file-clipboard.ts` | 250 | **정밀** |
| | `electron/vscode-ssh-config.ts` | 219 | 구조 |
| | `electron/workspace-search.ts` | 187 | 구조 |
| | `electron/window-state.ts` | 160 | 구조 |
| | `electron/git-line-markers.ts` | 91 | 구조 |
| | `electron/git-file-statuses.ts` | 87 | 구조 |
| | `electron/appearance-menu.ts` | 87 | 구조 |
| | `electron/workspace-watch-mode.ts` | 51 | 구조 |
| | `electron/increment-file-name.ts` | 35 | 구조 |
| | `electron/workspace-path.ts` | 18 | 구조 |

**세션 시작 프롬프트**:
```
세션 R8: App Shell + Workspace Backend + Electron Support 하이브리드 코드 품질 리뷰를 시작하자.
_sdd/drafts/2026-04-14_review_plan_code_quality.md 의 R8 세션 계획을 따라서 진행해줘.
결과는 _sdd/review/app-shell-and-backend.md 에 기록해줘.

CSS 파일은 스킵. App.tsx는 Q1(크기) 관점에서 구조 점검,
system-open.ts와 file-clipboard.ts는 보안(Q7) 관점에서 정밀 리뷰,
remote-workspace-backend.ts는 에러 핸들링(Q2)과 비동기(Q8) 관점에서 정밀 리뷰.
context가 부족하면 R8a/R8b로 분할할 것.
```

---

## Risks and Mitigations

| # | 위험 | 영향 | 완화 |
|---|------|------|------|
| 1 | 정밀 세션(R1~R3)이 context window를 초과 | 리뷰 불완전 | 500줄씩 청크로 나눠 읽기, 중간 발견 사항을 파일에 즉시 기록 |
| 2 | R8 세션이 너무 커서 한 세션으로 불가 | 리뷰 품질 저하 | R8a/R8b 분할 옵션 사전 설계 완료 |
| 3 | 세션 간 맥락 단절 | 크로스 모듈 이슈 누락 | 각 세션 시작 시 이전 리뷰 파일 참조, R1~R3 발견 패턴을 R4~R8에 적용 |
| 4 | 하이브리드 세션에서 의심 영역 선정 실패 | 정밀 리뷰가 필요한 곳을 놓침 | Q1(크기)로 1차 필터, R1~R3에서 발견된 패턴으로 2차 필터 |
| 5 | 발견 사항이 너무 많아 리뷰 파일이 비대 | 가독성 저하 | 심각도 Critical/High만 상세 기술, Medium/Low는 요약 테이블 |

## Open Questions

- [ ] 전체 리뷰 완료 후 크로스 모듈 종합 리뷰 세션(R9)이 필요한가?
- [ ] 발견된 이슈의 후속 조치 (리팩토링, 버그 수정) 우선순위는 어떻게 정할 것인가?
- [ ] 리뷰 결과를 GitHub Issue로 변환할 것인가?

## Appendix: 파일 전체 목록

### 소스 파일 (테스트 제외) — 107개, ~36,500 LOC

<details>
<summary>전체 파일 목록 펼치기</summary>

**electron/main.ts** (3511) | **electron/preload.ts** (610)

**src/workspace/**
workspace-context.tsx (3677) | workspace-model.ts (1203) | remote-connect-modal.tsx (707) | workspace-persistence.ts (403) | path-format.ts (117) | workspace-switcher.tsx (54) | use-workspace.ts (10)

**electron/remote-agent/**
workspace-ops.ts (1031) | transport-ssh.ts (506) | connection-service.ts (474) | directory-browser.ts (404) | bootstrap.ts (336) | watch-ops.ts (311) | request-router.ts (261) | agent-main.ts (138) | session-registry.ts (139) | protocol.ts (128) | copy-ops.ts (102) | framing.ts (92) | reliability-policy.ts (85) | security.ts (80) | runtime-types.ts (80) | path-guard.ts (65) | types.ts (52) | agent-main-cli.ts (5) | generated-payload.ts (5)

**src/spec-viewer/**
spec-viewer-panel.tsx (2246) | source-line-resolver.ts (611) | remark-citation-links.ts (211) | citation-target.ts (193) | spec-link-utils.ts (179) | markdown-security.ts (172) | python-symbol-resolver.ts (153) | source-line-metadata.ts (129) | spec-link-popover.tsx (99) | rehype-source-text-leaves.ts (80) | markdown-utils.ts (72) | spec-search.ts (64) | code-block-citation.ts (47)

**src/code-comments/**
comment-list-modal.tsx (666) | export-comments-modal.tsx (240) | comment-line-index.ts (229) | comment-persistence.ts (170) | comment-anchor.ts (154) | comment-editor-modal.tsx (134) | comment-hover-popover.tsx (130) | global-comments-modal.tsx (117) | comment-export.ts (98) | comment-types.ts (81) | comment-config.ts (1)

**src/code-editor/**
code-editor-panel.tsx (1082) | cm6-dark-theme.ts (185) | cm6-light-theme.ts (183) | cm6-comment-gutter.ts (116) | cm6-language-map.ts (98) | cm6-git-gutter.ts (91) | cm6-navigation-highlight.ts (50) | cm6-selection-bridge.ts (21)

**src/code-viewer/**
shiki-quiet-light-theme.ts (235) | shiki-ayu-mirage-theme.ts (233) | syntax-highlight.ts (210) | language-map.ts (72)

**src/file-tree/**
file-tree-panel.tsx (1215)

**src/ (top-level)**
App.tsx (2627) | App.css (2139) | index.css (246) | modal-drag-position.ts (231) | appearance-theme.ts (166) | copy-action-popover.tsx (144) | copy-payload.ts (125) | modal-wheel-passthrough.ts (110) | source-selection.ts (51) | main.tsx (20)

**electron/workspace-backend/**
remote-workspace-backend.ts (342) | types.ts (174) | remote-watch-bridge.ts (171) | backend-router.ts (97) | local-workspace-backend.ts (84) | remote-git-bridge.ts (40) | copy-entries.ts (32)

**electron/ (support)**
system-open.ts (409) | file-clipboard.ts (250) | vscode-ssh-config.ts (219) | workspace-search.ts (187) | window-state.ts (160) | git-line-markers.ts (91) | git-file-statuses.ts (87) | appearance-menu.ts (87) | workspace-watch-mode.ts (51) | increment-file-name.ts (35) | workspace-path.ts (18)

</details>

### 테스트 파일 — 60개

<details>
<summary>테스트 파일 목록 펼치기</summary>

App.test.tsx (11078) | spec-viewer-panel.test.tsx (2161) | file-tree-panel.test.tsx (2145) | code-editor-panel.test.tsx (1152) | workspace-model.test.ts (834) | comment-list-modal.test.tsx (759) | remark-citation-links.test.ts (587) | source-line-resolver.test.ts (447) | remote-connect-modal.test.tsx (412) | file-clipboard.test.ts (410) | system-open.test.ts (396) | workspace-persistence.test.ts (290) | transport-ssh.test.ts (286) | workspace-search.test.ts (250) | workspace-ops.test.ts (241) | cm6-language-map.test.ts (236) | comment-editor-modal.test.tsx (235) | cm6-comment-gutter.test.ts (216) | syntax-highlight.test.ts (207) | comment-export.test.ts (206) | connection-service.test.ts (201) | appearance-theme.test.ts (191) | bootstrap.test.ts (177) | copy-ops.test.ts (181) | comment-line-index.test.ts (162) | export-comments-modal.test.tsx (160) | remote-workspace-backend.test.ts (154) | copy-entries.test.ts (152) | backend-router.test.ts (146) | integration-smoke.test.ts (145) | spec-link-utils.test.ts (140) | vscode-ssh-config.test.ts (140) | copy-payload.test.ts (137) | git-file-statuses.test.ts (127) | window-state.test.ts (125) | cm6-git-gutter.test.ts (124) | python-symbol-resolver.test.ts (118) | source-line-metadata.test.ts (118) | request-router.test.ts (118) | appearance-menu.test.ts (117) | session-registry.test.ts (116) | directory-browser.test.ts (116) | cm6-selection-bridge.test.ts (115) | copy-action-popover.test.tsx (107) | rehype-source-text-leaves.test.ts (107) | comment-persistence.test.ts (97) | reliability-policy.test.ts (97) | remote-watch-bridge.test.ts (89) | markdown-security.test.ts (87) | agent-main.test.ts (111) | watch-ops.test.ts (78) | git-line-markers.test.ts (77) | global-comments-modal.test.tsx (74) | comment-anchor.test.ts (73) | framing.test.ts (72) | workspace-watch-mode.test.ts (71) | path-format.test.ts (69) | code-block-citation.test.ts (81) | modal-drag-position.test.ts (49) | increment-file-name.test.ts (40) | security.test.ts (38) | protocol.test.ts (37) | workspace-path.test.ts (37) | spec-search.test.ts (36) | markdown-utils.test.ts (29) | local-workspace-backend.test.ts (64) | remote-git-bridge.test.ts (32) | payload.test.ts (18) | language-map.test.ts (21)

</details>
