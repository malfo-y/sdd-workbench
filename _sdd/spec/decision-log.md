# Decision Log

## 구현 완료 반영 요약 (Archived)

구현 완료 후 스펙에 반영된 엔트리들의 요약이다. 상세 원문은 `prev/` 백업에 보존되어 있다.

| 날짜 | 제목 | 핵심 결정 |
|------|------|----------|
| 2026-03-14 | F43 citation: lazy indexing 환경 호환 | `openCitationTarget`에서 `workspaceFilePathSet` 사전 체크를 제거하고 `readFile` 결과로 판단. 리모트/lazy 트리에서도 점프 가능. |
| 2026-03-14 | F43 Python citation navigation 구현 완료 | `[path.py:Symbol]` bracket citation으로 Python 선언 위치 점프. code-block-citation은 language-agnostic 추출, react-markdown v10에서 node position 기반 inline/fenced 판별. |
| 2026-03-08 | F38 구현 완료 반영 + theme primary control을 native menu로 고정 | appearance theme 전환의 primary entry point는 Electron application menu `View > Theme > Dark Gray \| Light`로 고정한다. |
| 2026-03-08 | F36/F37 구현 완료 반영 + theme bootstrap/recovery 계약 확정 | appearance theme bootstrap은 React mount 전에 `document.documentElement[data-theme]`에 persisted theme를 반영하는 pre-paint 경로로 고정한다. |
| 2026-03-08 | F34/F35 구현 완료 반영 + markdown/spec 왕복 내비게이션 정책 고정 | F34(`Go to Spec`)를 `Implemented/Done`으로 반영하고, 범위는 `.md` Code 탭 context menu에서 같은 markdown 파일의 `selectionRange.startLine`을 rende... |
| 2026-03-01 | F28 구현 완료 반영 + 원격 browse/watch 운영 정책 동기화 | F28(SSH 선접속 기반 remote directory browse + `remoteRoot` 선택)을 `Implemented/Done`으로 반영한다. |
| 2026-03-01 | F27 구현 완료 반영 + 원격 연결 운영 정책 확정 | F27(Remote Agent Protocol 기반 원격 워크스페이스)을 `Implemented/Done`으로 전환한다. |
| 2026-02-25 | F25 구현 완료 + 버그 수정 2건 | F25: IPC 4개(`createFile`, `createDirectory`, `deleteFile`, `deleteDirectory`) + WorkspaceContext 액션 + FileTreePanel 컨텍스트 메뉴/인라인... |
| 2026-02-25 | F24 구현 완료 및 레거시 정리 | 레거시 `code-viewer-panel.tsx`, `line-selection.ts` 및 테스트 파일 4개 삭제. |
| 2026-02-20 | F03.5 구현 완료 반영(멀티 워크스페이스 동작 고정) | Workspace 상태 모델을 `activeWorkspaceId`, `workspaceOrder`, `workspacesById` 기반의 구현 상태로 확정한다. |
| 2026-02-20 | F04 구현 완료 반영(Markdown 듀얼 뷰 + workspace별 activeSpec 복원) | `.md` 선택 시 center(raw)+right(rendered) 동시 표시를 기본 동작으로 고정한다. |
| 2026-02-20 | F04.1 구현 완료 반영(링크 안전 인터셉트 + copy popover, 글로벌 배너 미사용) | same-workspace 상대 링크는 파일 열기로 처리하고, external/unresolved 링크는 이동 없이 copy popover를 표시한다. |
| 2026-02-20 | F05 구현 완료 반영(spec 링크 라인 점프 고정) | spec 링크 라인 점프는 active workspace 범위에서만 처리하고 cross-workspace fallback은 도입하지 않는다. |
| 2026-02-21 | F06.1/F06.2 구현 완료 반영(우클릭 복사 통합 + 툴바 제거) | 복사 UX는 상단 툴바가 아닌 코드/파일트리 우클릭 컨텍스트 메뉴 중심 구조로 고정한다. |
| 2026-02-21 | F07 구현 완료 반영(watcher changed indicator + clear 시점 고정) | watcher lifecycle은 `openWorkspace -> watchStart`, `closeWorkspace/unmount -> watchStop`으로 고정한다. |
| 2026-02-21 | F07.1 구현 완료 반영(워크스페이스별 파일 히스토리 + 입력 바인딩 확장) | 히스토리 정책은 워크스페이스별 독립 스택/포인터, 중복 push 방지, back 후 신규 open 시 forward truncate로 고정한다. |
| 2026-02-21 | F08 구현 완료 반영(Open in iTerm/VSCode) | `system:openInIterm`/`system:openInVsCode` 채널 상태를 Implemented로 전환한다. |
| 2026-02-21 | F09 구현 완료 반영(세션 복원 + activeSpec 복원 포함) | 세션 snapshot 범위를 `workspaces + active workspace + active file + activeSpec + fileLastLineByPath`로 고정한다. |
| 2026-02-21 | F10.1 구현 완료 반영(rendered markdown 선택 우클릭 `Go to Source`) | source line 매핑은 markdown 블록 시작 라인(`data-source-line`) 기반 best-effort로 고정한다. |
| 2026-02-21 | F10 구현 완료 반영(보안/성능/테스트 안정화 패스) | markdown 렌더 보안 정책은 sanitize allowlist + workspace 경계 리소스 허용으로 고정한다. |
| 2026-02-21 | F10.2 구현 완료 반영(코드 뷰어 이미지 프리뷰 + 복원/종료 안정화) | 코드 뷰어 파일 읽기 계약을 `{ ok, content, imagePreview?, previewUnavailableReason? }`로 고정하고, 차단 리소스는 `blocked_resource`로 처리한다. |
| 2026-02-22 | F11.1 구현 완료 반영(rendered markdown 코멘트 진입 + marker + 증분 export) | rendered markdown source popover 액션 순서를 `Add Comment` -> `Go to Source`로 고정한다. |
| 2026-02-22 | F11.2 구현 완료 반영(spec jump scroll 유지 + collapsed marker 버블링) | same-spec source jump는 가능한 경우 `activeSpecContent`를 재사용해 rendered spec reset/read를 피한다. |
| 2026-02-22 | F12.1 구현 완료 반영(code/rendered 코멘트 marker hover preview) | 마커 계약을 count badge + hover preview로 확장하고, preview는 read-only로 고정한다. |
| 2026-02-22 | F12.2/F12.3/F12.4 구현 완료 반영(comment 관리 + global comments + header 액션 재배치) | 코멘트 관리 계약을 `View Comments`(편집/개별삭제/Delete Exported) 기준으로 고정하고, `Delete Exported`는 `exportedAt`가 있는 line comment만 제거하도록 고정한다. |
| 2026-02-23 | F15 구현 완료 반영(SSHFS 원격 워크스페이스 watch mode auto/override + fallback) | `watchModePreference='auto'`일 때 `/Volumes/*`는 remote mount로 간주해 기본 `polling`으로 시작한다. |
| 2026-02-23 | F16 구현 완료 반영(대규모/원격 워크스페이스 lazy indexing + on-demand 디렉토리 확장) | 인덱싱은 **디렉토리별 child cap(`500`)** 과 **원격 마운트 한정 깊이 제한(`3`)** 을 병용한다. |
| 2026-02-23 | F12.5 구현 완료 반영(comment feedback auto-dismiss + global 가시성 + header action clarity) | 코멘트 액션 경로 배너는 5초 auto-dismiss를 기본으로 하되 사용자 `Dismiss` 즉시 종료를 유지한다. |
| 2026-02-23 | F17 구현 완료 반영(Global 포함 체크박스 + Delete Exported 하단 이동) | View Comments 모달에서 global comments가 존재하면 "Include in export" 체크박스(기본 체크)를 제공하고, 체크 해제 시 export에서 global comments를 제외한다. |
| 2026-02-23 | F18 구현 완료 반영(PrismJS → Shiki 코드 하이라이팅 마이그레이션) | PrismJS를 완전 제거하고 Shiki(`shiki/core` + `shiki/engine/javascript`)로 전환한다. |
| 2026-02-24 | F19 구현 완료 반영(active file Git diff 라인 마커 MVP) | Git 라인 마커는 MVP에서 `added`(green)/`modified`(blue)만 지원한다. |
| 2026-02-24 | F22 구현 완료 반영(Cmd+Shift+Up/Down 워크스페이스 키보드 전환) | `switchActiveWorkspace` 순수 함수를 추가한다. `setActiveWorkspace`와 동일하되 `workspaceOrder`를 재배열하지 않는다. |

## 정책/구조 결정 (Active)

## 2026-03-14 - F41/F42 구현 완료 반영 + comment modal positioning contract 고정

- Context:
  - comment workflow는 Add Comment, Add Global Comments, View Comments, Export Comments를 모두 중앙 고정 modal로 열고 있었고, 리뷰 중에는 코드/스펙 문맥을 가리는 경우가 잦았음.
  - 구현에서는 `src/modal-drag-position.ts` shared hook을 도입해 comment modal family가 같은 drag/clamp/reset 규칙을 공유하게 됨.
- Decision:
  - comment modal repositioning은 comment modal family에만 적용하고, drag start는 header handle로만 제한한다.
  - modal 위치는 열린 세션 안에서는 유지하지만, 닫았다 다시 열면 centered 기본 위치로 reset 한다.
  - viewport 밖으로 완전히 사라지지 않도록 clamp 하며, textarea/checkbox/button/internal scroll은 drag 대상이 아니어야 한다.
- Rationale:
  - review/export는 뒤쪽 코드/스펙을 계속 보면서 수행되는 경우가 많아, modal 자체를 치워둘 수 있어야 문맥 전환 비용이 줄어든다.
  - persisted modal coordinates까지 도입하면 stale layout과 추가 state migration 비용이 생기므로, 이번 범위는 transient session state로 제한하는 편이 안전하다.
- Changes:
  - `_sdd/spec/main.md` version `0.47.0` / `2026-03-14`로 갱신
  - `_sdd/spec/comments-and-export/overview.md`, `_sdd/spec/comments-and-export/contracts.md`에 draggable modal contract 반영
  - `_sdd/spec/feature-index.md`, `_sdd/spec/appendix/feature-history.md`, `_sdd/spec/appendix/detailed-acceptance.md`에 F41/F42 반영
  - `_sdd/spec/summary.md`, `_sdd/spec/operations.md` validation snapshot과 comment modal 상태 동기화
  - `_sdd/spec/prev/PREV_main.md_20260314_082924.md` 외 관련 백업 생성

## 2026-03-13 - summary.md를 lightweight entry snapshot으로 재구성

- Context:
  - `main.md`는 이미 whitepaper `§1~§8 + Appendix` 구조와 code citation을 갖춘 canonical 문서인데, `summary.md`가 기능 설명, 아키텍처 표, 우선순위 목록을 길게 반복하면서 사실상 두 번째 메인 문서처럼 커지고 있었음.
  - strict review 이후 supporting docs의 역할을 다시 선명하게 하지 않으면, 이후 sync 때 `main.md`와 `summary.md`가 함께 커지며 drift가 반복될 가능성이 있었음.
- Decision:
  - `main.md`는 그대로 canonical whitepaper로 유지하고, `summary.md`는 “빠른 진입용 snapshot”으로 축소한다.
  - `summary.md`에는 현재 상태, 읽는 순서, 한 화면 아키텍처, validation baseline, active risks만 남기고 기능별 상세 설명과 장문의 상태 대시보드는 제거한다.
  - 이번 변경은 문서 역할 정리이지 제품 동작/계약 변경이 아니므로 spec version은 `0.46.1`을 유지한다.
- Rationale:
  - supporting docs가 canonical 문서를 다시 복제하기 시작하면 문서 유지 비용이 커지고, 리뷰 시 어떤 문장을 신뢰해야 하는지 판단 비용도 같이 커진다.
  - 요약 문서는 “무엇을 먼저 읽어야 하는가”를 빠르게 알려주는 쪽이 가치가 크고, 상세 설명은 whitepaper와 component docs로 위임하는 편이 더 안정적이다.
- Changes:
  - `_sdd/spec/summary.md`를 lightweight snapshot 구조로 재작성
  - `_sdd/spec/REWRITE_REPORT.md`에 conservative rewrite 결과/잔여 이슈 기록
  - `_sdd/spec/prev/PREV_summary.md_20260313_232456.md` 백업 생성
  - `_sdd/spec/prev/PREV_decision-log.md_20260313_232456.md` 백업 생성
  - `_sdd/spec/prev/PREV_REWRITE_REPORT.md_20260313_232456.md` 백업 생성

## 2026-03-13 - summary/quality gate 문구를 strict review 결과에 맞춰 동기화

- Context:
  - strict spec review에서 `main.md` whitepaper 본문은 대체로 정확했지만, `summary.md`가 아직 `0.45.0` / 2026-03-12 기준의 구조 설명을 유지하고 있었음.
  - `summary.md`, `operations.md`는 `npm test -> 49 files, 493 passed, 1 skipped`를 현재 자동 게이트처럼 제시하고 있었지만, review 환경(Node 25.2.1 / npm 11.7.0)에서는 `Test Files no tests`, `Errors 63`이 관찰되어 그대로 green baseline으로 둘 수 없었음.
- Decision:
  - 스펙 세트 버전을 `0.46.1`로 올리고, `summary.md`를 `main.md` whitepaper canonical 상태 기준으로 동기화한다.
  - 품질 게이트는 `2026-03-02 / Node 20.x baseline`을 **last known good**로 표시하고, `2026-03-13 / Node 25.2.1` review run은 원인 미확정 note로만 기록한다.
  - Node 25.x 지원 여부는 새 기능/호환성 결정으로 확정하지 않고, 현재는 “미재검증” 상태를 유지한다.
- Rationale:
  - review 결과가 문서보다 뒤처지면 문서가 잘못된 안전 신호를 주게 된다.
  - 환경 차이에서 비롯된 가능성이 있어도, 불확실한 green 상태를 active quality gate처럼 두는 것보다 baseline과 미확정 상태를 분리하는 편이 안전하다.
- Changes:
  - `_sdd/spec/main.md` 버전 `0.46.1`로 갱신
  - `_sdd/spec/summary.md` metadata/구조 설명/quality gate 동기화
  - `_sdd/spec/operations.md` quality gate baseline/리뷰 노트 반영
  - `_sdd/spec/prev/PREV_main.md_20260313_211605.md` 백업 생성
  - `_sdd/spec/prev/PREV_summary.md_20260313_211605.md` 백업 생성
  - `_sdd/spec/prev/PREV_operations.md_20260313_211605.md` 백업 생성
  - `_sdd/spec/prev/PREV_decision-log.md_20260313_211605.md` 백업 생성

## 2026-03-13 - 메인 스펙을 whitepaper §1-§8 형식으로 업그레이드

- Context:
  - 현재 `_sdd/spec/`는 컴포넌트별 split spec 구조로 정리되어 있었지만, canonical entry point인 `main.md`는 `Goal`, `Architecture`, `Component Index`, `Usage Examples` 중심의 엔트리 문서라 whitepaper §1-§8 구조와 code citation 기준을 직접 충족하지는 않았음.
  - 특히 `§1 Background & Motivation`, `§2 Core Design`, `§5 Usage Guide & Expected Results`, `Appendix: Code Reference Index`가 상위 문서에 명시적으로 존재하지 않아, 스펙을 처음 읽는 사람과 LLM 모두가 supporting docs를 여러 번 왕복해야 했음.
- Decision:
  - split spec 구조는 유지하고, `main.md`를 canonical whitepaper 문서로 재작성한다.
  - 하위 `overview.md` / `contracts.md` 문서는 §4 Component Details와 §7 API Reference의 상세 근거 문서로 계속 사용한다.
  - `main.md`에는 실제 구현 함수 기준 인라인 citation과 핵심 코드 발췌를 추가하고, `decision-log.md`에는 이번 업그레이드 자체를 별도 구조 결정으로 기록한다.
- Rationale:
  - 기존 supporting docs의 분해 이점은 유지하면서도, 상위 문서 하나만 읽어도 프로젝트의 배경, 핵심 설계, 사용법, 데이터 모델, IPC 표면을 빠르게 이해할 수 있어야 한다.
  - whitepaper 형식은 설명력과 추적 가능성을 동시에 요구하므로, narrative section과 code citation을 top-level에 올리는 편이 유지보수성과 자동화 친화성 모두에 유리하다.
- Changes:
  - `_sdd/spec/main.md`를 whitepaper §1-§8 + Appendix 구조로 재작성
  - `_sdd/spec/code-map.md`, `_sdd/spec/feature-index.md`의 canonical 링크를 `main.md` 기준으로 정리
  - `_sdd/spec/prev/PREV_main.md_20260313_193535.md` 백업 생성
  - `_sdd/spec/prev/PREV_decision-log.md_20260313_193535.md` 백업 생성
  - `_sdd/spec/prev/PREV_code-map.md_20260313_194330.md` 백업 생성
  - `_sdd/spec/prev/PREV_feature-index.md_20260313_194330.md` 백업 생성

## 2026-03-09 - 번호형/대문자 스펙 이름을 책임 기반 소문자 이름으로 정리

- Context:
  - 메인 엔트리 포인트를 재작성한 뒤에도 `01-overview.md`, `03-components.md`, `FEATURE_INDEX.md`, `DECISION_LOG.md` 같은 번호형/대문자 파일명이 계속 남아 있어 탐색 흐름이 한 번 더 번역을 요구했음.
  - 특히 `domains`, `contracts`, `feature-index`, `code-map`처럼 역할이 드러나는 이름이 이미 본문에 자리잡기 시작했는데, 실제 파일명은 그 방향과 어긋나 있었음.
- Decision:
  - 번호형 허브 파일은 `product-overview.md`, `system-architecture.md`, `component-map.md`, `contract-map.md`, `operations-and-validation.md`로 rename한다.
  - 대문자 파일명은 `feature-index.md`, `code-map.md`, `decision-log.md`, `rewrite-report.md`, `spec-review-report.md`, `summary.md`, `rewrite-plan.md`, `user-spec.md`로 정규화한다.
  - 번호형 디렉터리 `03-domains/`, `04-contracts/`는 각각 `domains/`, `contracts/`로 rename한다.
  - `_sdd/spec`, `_sdd/implementation`, `_sdd/drafts` 안의 경로 참조는 새 이름 체계로 함께 갱신한다.
- Rationale:
  - 파일명을 읽는 순간 역할이 보여야 탐색 비용이 낮아지고, 사람과 LLM 모두 링크를 머릿속에서 다시 해석할 필요가 줄어든다.
  - 대문자/번호형 이름은 초기 구조화에는 편하지만, 장기적으로는 검색성과 유지보수성보다 문서 생성 이력을 더 강하게 드러낸다.
- Impact / follow-up:
  - 이후 새 스펙 파일은 번호 접두사와 대문자 screaming-case를 피하고, 책임이 드러나는 lowercase kebab-case를 기본 규칙으로 사용한다.
  - 과거 구현 기록 문서에서 section 이름까지 현재 문서와 완전히 일치하지 않을 수 있으므로, path 기준 탐색을 우선하고 section anchor는 필요한 시점에만 후속 정리한다.

## 2026-03-09 - 메인 스펙을 5분 엔트리 포인트로 재작성

- Context:
  - 기존 분할 구조(`01~05`, `03-domains`, `04-contracts`)는 이미 유효했지만, `main.md`가 문서 계층과 리라이트 기록 링크 중심이라 저장소 목적/경계/변경 시작점이 바로 보이지 않았음.
  - 구현 변경 시에도 번호형 허브를 먼저 기억해야 해서, 사람과 LLM 모두 “어디를 먼저 읽고 고칠지”를 한 번 더 추론해야 했음.
- Decision:
  - `main.md`를 `Goal`, `Architecture Overview`, `Component Details`, `Environment & Dependencies`, `Usage Examples`, `Open Questions` 중심의 엔트리 포인트로 재작성한다.
  - 기존 `sdd-workbench/` 분할 문서와 번호형 파일명은 링크 호환성을 위해 유지하되, 메인 문서에서는 책임 기반 문서와 실제 코드 경로를 바로 노출한다.
  - `component-map.md`에는 도메인별 핵심 코드 경로, 검증 시작점, 흔한 변경 레시피를 추가한다.
  - `rewrite-report.md`, `rewrite-plan.md` 같은 작업 산출물은 빠른 진입 링크에서 내리고 기록성 문서로만 남긴다.
- Rationale:
  - 메인 스펙의 1차 목적은 문서 분류 설명이 아니라 프로젝트 이해와 안전한 변경 진입점을 제공하는 것이다.
  - 기존 파일명을 유지하면 과거 구현 문서와 리뷰 링크를 깨지 않으면서도 탐색성을 개선할 수 있다.
- Impact / follow-up:
  - 이후 스펙 갱신은 가능하면 `main.md`보다 해당 책임 문서(`domains/*`, `contracts/*`)를 먼저 수정한다.
  - 번호형 파일명이 탐색 비용을 다시 키우기 시작하면, 그때만 링크 마이그레이션 계획과 함께 rename을 검토한다.

## 2026-03-08 - 스펙 문서를 설명층/계약층/인덱스층/기록층으로 재분해

- Context:
  - 기존 스펙은 `main.md` 아래로 이미 분할되어 있었지만, `component-map.md`와 `contract-map.md`가 점점 “모든 것을 담는 문서”가 되어 탐색 비용이 다시 커지고 있었음.
  - 사용자는 스펙이 사람에게는 읽기 쉬워야 하고, 사람/AI에게는 구현 인덱싱이 쉬워야 한다는 두 목적을 동시에 충족하길 원했음.
- Decision:
  - 스펙 구조를 설명층(`01`, `02`, `03-domains`), 계약층(`04-contracts`), 인덱스층(`FEATURE_INDEX`, `CODE_MAP`), 기록층(`appendix/*`, `DECISION_LOG`, `REWRITE_REPORT`)으로 재분해한다.
  - `main.md`, `component-map.md`, `contract-map.md`, `appendix.md`는 삭제하지 않고 얇은 허브 문서로 유지한다.
  - 기능 ID 기준 진입점은 `feature-index.md`, 파일/테스트 영향 범위 진입점은 `code-map.md`로 고정한다.
  - 기존 상세 규칙은 하위 domain/contract/appendix 문서로 이동하고, 허브 문서에는 요약과 링크만 남긴다.
- Rationale:
  - 사용자용 제품 설명과 구현 인덱스를 같은 문서에 섞으면 둘 다 읽기 어려워진다.
  - 기존 허브 파일명을 보존해야 과거 리뷰/구현 문서의 링크를 깨지 않고 점진적으로 구조를 개선할 수 있다.
  - feature-index/code-map을 분리하면 향후 기능 추가 시 영향 범위 탐색이 빨라진다.
- Impact / follow-up:
  - 이후 `spec-update-done`이나 `spec-update-todo`는 가능하면 hub 문서보다 해당 하위 domain/contract 문서를 먼저 수정한다.
  - `feature-index.md`와 `code-map.md`의 최신성 유지가 새로운 운영 포인트가 된다.

## 2026-03-08 - F36/F37 planned 반영 + `dark-gray` baseline / `light` 우선 정책 고정

- Context:
  - 현재 앱은 다크 계열이지만 실질적으로는 순수 black보다 dark-gray에 가까운 look을 가지고 있고, App shell/CodeMirror/Shiki code block이 서로 다른 방식으로 색을 관리하고 있음.
  - 사용자 요구는 기존 look을 크게 흔들지 않으면서 Code Editor를 조금 더 gray 쪽으로 맞추고, 실사용 가능한 `light` theme를 먼저 추가하는 방향이었음.
- Decision:
  - 현재 다크 계열 look을 공식 `dark-gray` baseline으로 간주하고, 향후 테마 확장을 위한 appearance state/token 구조를 F36 planned 범위로 스펙에 반영한다.
  - 우선 도입 대상 theme는 `dark-gray`, `light` 두 가지로 제한한다.
  - `true dark`, `system` follow, OS accent color 연동은 이번 범위에서 제외하고 후속 feature로 분리한다.
  - VS Code theme system/marketplace 호환은 목표가 아니며, 현재 앱 구조에 맞는 token 기반 palette를 제공하는 방향으로 고정한다.
- Rationale:
  - 현재 UI 인상을 유지하면서 light theme를 추가하려면, 먼저 existing dark palette를 `dark-gray` baseline으로 정리하는 편이 회귀 위험이 낮다.
  - 범위를 `dark-gray + light`로 제한해야 CSS tokenization, CM6 theme routing, Shiki theme routing을 한 단계에서 현실적으로 다룰 수 있다.
- Impact / follow-up:
  - `main.md`, split spec(`01`, `03`, `04`, `appendix`)에 F36/F37 planned 범위와 비범위를 반영한다.
  - 구현은 spec-update-todo 이후 phase별(`theme contract -> tokenization -> CM6/Shiki routing -> light polish`)로 진행하는 것을 기본 전략으로 둔다.

## 2026-02-28 - F27 자동화 수준 고정(MVP) + SSHFS 경로 폐기 결정

- Context:
  - F27 계획 반영 이후 원격 agent 배포 자동화 범위와 F15(SSHFS 기반) 존치 여부를 추가로 확정할 필요가 생김.
- Decision:
  - 원격 agent 자동화는 MVP 범위로 고정한다.
  - MVP 자동화 범위는 `존재 확인 -> 없으면 설치 -> 버전 검증`으로 제한한다.
  - 자동 업그레이드/롤백/복수 배포 채널 관리/고급 장애복구 오케스트레이션은 MVP 범위에서 제외한다.
  - F15(SSHFS 기반) 원격 연결 경로는 폐기 대상으로 확정하고, F27(remote-protocol) 단일 경로로 전환한다.
- Rationale:
  - 자동화 완성도를 과도하게 올리면 일정이 급격히 커지므로, 초기 구현은 설치/검증 자동화로 제한하는 것이 현실적이다.
  - 원격 경로를 단일화해야 운영/디버깅/테스트 기준을 단순화할 수 있다.
- Impact / follow-up:
  - `main.md`와 split spec의 Open Questions/리스크 문구에서 해당 항목을 결정사항으로 전환한다.
  - F27 구현 단계에서 F15 경로 제거 시점과 마이그레이션 체크리스트를 별도 작업으로 관리한다.

## 2026-02-28 - F27 Remote Agent Protocol 원격 워크스페이스 MVP 계획 반영

- Context:
  - 현재 원격 워크스페이스 지원은 SSHFS 마운트 품질에 의존하며, 연결/감시 안정성 편차가 큰 상태임.
  - 사용자 요청에 따라 구현 전에 F27 에픽 단위 계획(요구사항 + 범위 + 태스크)을 스펙 본문에 먼저 고정할 필요가 생김.
- Decision:
  - F27을 `Planned` 상태로 스펙에 추가하고, Remote Agent Protocol 기반 원격 워크스페이스 경로를 공식 범위로 정의한다.
  - 기존 `workspace:*` Renderer 계약은 유지하고, Electron Main에 `WorkspaceBackend(local/remote)` 추상화를 도입하는 전략을 채택한다.
  - 원격 연결 상태/오류 코드(`AUTH_FAILED`, `TIMEOUT`, `AGENT_PROTOCOL_MISMATCH`, `PATH_DENIED`)를 표준화하고 운영/테스트 기준에 반영한다.
  - 범위는 MVP로 제한하며, 내장 터미널/포트포워딩/원격 확장 실행/원격 LSP 관리는 제외한다.
- Rationale:
  - 구현을 시작하기 전에 범위와 비범위를 명확히 고정해야 기능 팽창을 막고, 태스크를 개별 단위로 분할해 순차 실행하기 쉽다.
  - IPC 계약 유지 전략은 기존 Renderer 회귀를 최소화하고, 원격 경로를 점진적으로 도입하는 데 유리하다.
- Impact / follow-up:
  - `main.md` 및 split spec(`01~05`, `appendix`)에 F27 planned 섹션/계약/Open Questions를 반영한다.
  - 다음 구현 순서는 R1(프로토콜 계약) -> R3(backend 추상화) -> 나머지 태스크 순으로 세분화 계획을 작성한다.

## 2026-02-24 - F24 CodeMirror 6 기반 코드 에디터 도입

- Context:
  - 기존 CodeViewerPanel은 custom line rendering + Shiki 기반 read-only 뷰어로, 코드를 보면서 직접 수정할 수 없어 spec-code 왕복 편집 비용이 높았음.
  - F23에서 3패널→2패널 전환이 완료되어, 코드 뷰어 영역을 에디터로 교체할 준비가 됨.
- Decision:
  - CodeViewerPanel을 CodeMirror 6 기반 CodeEditorPanel로 교체한다. 4개 Phase로 점진 마이그레이션(read-only 대체 → 편집/저장 → gutter 확장 → 레거시 정리).
  - Shiki는 spec-viewer(`HighlightedCodeBlock`)에서 계속 사용하므로 삭제하지 않는다.
  - `@codemirror/search`가 기존 F21 커스텀 검색을 대체한다.
- Rationale:
  - CM6는 virtual rendering, compartment 기반 동적 설정, 풍부한 extension 생태계를 제공하여 read-only 뷰어부터 풀 에디터까지 점진적 확장이 가능하다.
  - 커스텀 line rendering보다 CM6의 mature한 텍스트 편집 인프라를 활용하는 것이 유지보수 비용이 낮다.
- Alternatives considered:
  - Monaco Editor: 번들 크기가 크고 Electron 외 환경에서의 유연성이 낮음.
  - 기존 CodeViewerPanel에 contentEditable 추가: undo/redo, selection, IME 등 에디터 기본 기능 구현 비용이 과도.
- Impact / follow-up:
  - `feat/text_editor` 브랜치에서 작업. Phase 1~4로 분할 구현. ✅ 완료 (2026-02-25)
  - CM6 패키지 추가로 번들 크기 증가(언어 lazy import + tree shaking으로 완화). ✅ 적용 완료
  - 기존 code-viewer 테스트 37개 시나리오를 code-editor로 포팅 필요. ✅ 포팅 완료 (41 tests)

## 2026-02-20 - 기본 스펙 베이스라인 문서화 방식

- Context:
  - 프로젝트는 Electron + React 템플릿 초기 상태이며, `/_sdd/spec/user-spec.md`에는 MVP 요구사항이 상세 정의되어 있음.
  - 현재 코드에는 제품 기능이 거의 없고 앱 골격만 존재함.
- Decision:
  - 기본 스펙을 `/_sdd/spec/main.md`로 생성하고, 모든 핵심 요구사항을 `As-Is (Implemented/Partial)` vs `To-Be (Planned)`로 구분해 명시한다.
- Rationale:
  - 현재 구현 대비 목표 기능 간 간극을 한눈에 파악해야 이후 `feature-draft` 단계에서 우선순위 선정을 빠르게 진행할 수 있다.
- Alternatives considered:
  - `user-spec.md`를 직접 수정해 통합 문서로 운영
  - 컴포넌트별 다중 스펙 파일로 즉시 분할
- Impact / follow-up:
  - 다음 단계에서 기능 단위(`feature-draft`)로 스펙 패치와 구현 계획을 생성하기 쉬운 기준점이 마련됨.

## 2026-02-20 - Feature-draft 순차 실행용 우선순위 큐 도입

- Context:
  - 구현 전 단계에서 “무엇부터 어떤 크기로” 진행할지 명확한 분할 기준이 필요함.
  - 현재는 대부분 기능이 Planned 상태라 한 번에 구현 범위가 커질 위험이 있음.
- Decision:
  - `main.md`에 P0/P1/P2 우선순위 기반 Feature Queue(F01~F10)를 정의하고, 각 Feature를 `feature-draft` 1회 단위로 분할한다.
- Rationale:
  - 기능 단위를 작게 유지하면 feature-draft -> implementation 사이클을 안정적으로 반복할 수 있고, 범위 통제와 검증이 쉬워진다.
- Alternatives considered:
  - 기존 체크리스트를 유지한 채 구현 시점에 임의 분할
  - 대형 기능 묶음 단위로 소수 Feature만 정의
- Impact / follow-up:
  - 이후 작업은 Feature ID 순서대로 진행하고, 완료 시 상태를 `✅ Done`으로 갱신한다.

## 2026-02-20 - F01 완료 반영 기준 확정 (경로/배너/테스트)

- Context:
  - F01(`workspace bootstrap`) 구현에서 워크스페이스 선택, 취소/오류 처리, 테스트 전략에 대한 운영 기준이 필요했음.
  - 구현 리뷰와 수동 스모크까지 완료되어 스펙 동기화 시점에 기준을 고정해야 함.
- Decision:
  - 내부 상태(`rootPath`)는 절대 경로를 유지하고, UI에서만 축약 경로(`~`)를 표시한다.
  - 오류 피드백은 F01에서 텍스트 배너를 사용하고, 토스트 배너 전환은 후속 Feature backlog로 관리한다.
  - 자동 테스트(`Vitest + RTL + jsdom`)는 조기 도입하며, 핵심 사용자 흐름은 수동 스모크로 보완한다.
- Rationale:
  - 경로 표현과 상태 저장을 분리하면 디버깅/후속 기능(F02+) 확장 시 경로 정합성을 유지하기 쉽다.
  - 초기 복잡도를 낮추면서도 사용자 피드백 경로를 빠르게 확보할 수 있다.
  - 테스트를 초기에 도입하면 feature-draft 반복 사이클에서 회귀 리스크를 줄일 수 있다.
- Alternatives considered:
  - 상태에도 축약 경로를 저장하는 방식
  - 처음부터 토스트 컴포넌트를 도입하는 방식
  - 수동 테스트 중심으로 진행하고 자동 테스트를 후순위로 미루는 방식
- Impact / follow-up:
  - `main.md`의 F01 상태를 `✅ Done`으로 반영하고, F02부터 동일 원칙을 적용한다.
  - 토스트 전환은 후속 feature-draft에서 별도 수용 기준으로 추적한다.

## 2026-02-20 - F02 파일 트리 탐색 규칙 확정

- Context:
  - F02 구현에서 파일 트리 표시 정책(숨김 파일/정렬/초기 렌더/탐색 UX)을 확정해야 했음.
  - 실제 사용 중 파일이 한 번에 과도하게 노출되는 문제가 확인되어 디렉터리 우선 탐색 방식이 필요했음.
- Decision:
  - 숨김 파일은 기본 표시하고, ignore는 명시된 대형 디렉터리(`.git`, `node_modules`, `dist`, `build`, `out`, `.next`, `.turbo`)에 한정한다.
  - 정렬은 디렉터리 우선 + 이름 오름차순으로 고정한다.
  - 파일 트리는 디렉터리 기본 접힘 상태로 렌더링하고, 사용자가 디렉터리를 눌렀을 때만 하위 파일/폴더를 노출한다.
  - 초기 렌더는 노드 cap(500) 제한을 적용해 대형 워크스페이스에서 렌더 과부하를 방지한다.
- Rationale:
  - 숨김 파일 기본 표시는 CLI/개발 워크플로우에서 필요한 파일 접근성을 높인다.
  - 정렬 고정은 탐색 예측 가능성을 보장하고 테스트 안정성을 높인다.
  - 디렉터리 토글 UX는 “줄줄이 나열” 문제를 해결해 탐색 가독성을 개선한다.
  - 렌더 cap은 초기 렌더 성능과 UI 응답성을 안정화한다.
- Alternatives considered:
  - 숨김 파일/디렉터리를 모두 기본 숨김 처리
  - 파일/폴더 혼합 정렬 또는 최신 수정 시각 정렬
  - 트리 전체를 초기 확장 상태로 유지
  - 렌더 cap 없이 전체 노드 즉시 렌더
- Impact / follow-up:
  - `main.md`에서 F02를 `✅ Done`으로 반영하고, F03 이후 기능은 동일 탐색 규칙을 유지한다.
  - root-level 파일의 노출 정책(예: 별도 그룹)은 필요 시 후속 feature-draft에서 검토한다.

## 2026-02-20 - F03 코드 뷰어 기본 읽기 흐름/미리보기 정책 확정

- Context:
  - F03 구현에서 center 패널 코드 프리뷰, 읽기 실패 처리, 선택 범위 상태를 제품 기본 동작으로 고정해야 했음.
  - 대용량/바이너리 파일을 그대로 렌더하면 안정성과 성능 리스크가 커져 preview 정책이 필요했음.
- Decision:
  - `workspace:readFile` IPC를 도입하고, `rootPath` 경계 검증으로 workspace 밖 경로 접근을 차단한다.
  - 파일 읽기 결과는 `ok/content/error/previewUnavailableReason` 계약으로 통일한다.
  - 2MB 초과 파일과 바이너리 파일은 본문 대신 `preview unavailable` 상태(`file_too_large`, `binary_file`)를 반환한다.
  - 라인 선택은 1-based 기준으로 저장하고 `Shift+Click` 확장을 지원한다.
- Rationale:
  - 읽기 흐름을 명시적으로 분리하면 오류/예외 상황에서도 UI 상태를 예측 가능하게 유지할 수 있다.
  - preview 불가 정책은 렌더러 부담을 줄이고 사용자에게 명확한 피드백을 제공한다.
  - 1-based 선택 규칙은 스펙 링크 표기(`L10`)와 일관성이 높다.
- Alternatives considered:
  - 파일 크기/바이너리 구분 없이 모두 렌더 시도
  - `workspace:readFile` 없이 renderer 직접 파일 접근
  - 0-based 내부 선택 상태를 그대로 노출
- Impact / follow-up:
  - `main.md`의 `workspace:readFile` 상태를 `Implemented (F03)`로 반영한다.
  - F04/F05에서 markdown 렌더/링크 점프와 결합할 때 동일 선택 상태 모델을 재사용한다.

## 2026-02-20 - F03.1 확장자 기반 색상 코딩 규칙 확정

- Context:
  - F03 구현 이후 코드 뷰어가 plain text 중심이라 가독성 개선 요구가 발생했음.
  - 사용자 요청으로 `.py`는 필수 지원 확장자로 포함해야 했음.
- Decision:
  - Prism 기반 하이라이트 어댑터를 도입하고, 확장자 매핑(`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`, `.py`)을 고정한다.
  - 미지원 확장자는 `plaintext` fallback으로 처리한다.
  - 토큰 컬러 스타일은 기본 테마 수준으로 적용하고, VS Code급 상세 하이라이팅은 MVP 이후로 이월한다.
- Rationale:
  - 가벼운 하이라이팅 계층으로 빠르게 가독성을 높이면서 구현 복잡도를 통제할 수 있다.
  - fallback 규칙을 고정하면 파일 형식이 다양해도 렌더 실패 없이 동작한다.
  - `.py` 우선 지원은 현재 사용자 워크플로우 요구를 충족한다.
- Alternatives considered:
  - Monaco/CodeMirror로 즉시 전환
  - 특정 소수 확장자만 지원하고 나머지는 미지원 처리
  - 테마/언어 설정 UI까지 한 번에 도입
- Impact / follow-up:
  - `main.md`에 F03.1을 `✅ Done`으로 추가하고 수용 기준/테스트 결과를 갱신한다.
  - 고급 하이라이팅(semantic tokens, 언어별 세부 설정)은 MVP 이후 별도 feature-draft로 다룬다.

## 2026-02-20 - F03.5 멀티 워크스페이스 정책(추가/중복/전환) 확정

- Context:
  - 단일 워크스페이스 구조에서 멀티 워크스페이스 확장을 진행하기 위해 상태 모델과 UX 정책을 사전에 고정할 필요가 있었음.
  - 사용자 합의 사항으로 열기/중복/전환 정책이 명확히 제시됨.
- Decision:
  - `Open Workspace`는 항상 "추가"로 동작한다.
  - 이미 열린 경로를 다시 선택하면 중복 세션을 만들지 않고 기존 워크스페이스를 활성화한다.
  - 워크스페이스별 파일/콘텐츠 상태는 유지하고, 워크스페이스 전환 시 `selectionRange`만 리셋한다.
  - 상태 관리는 기존 기술 스택(React Context + `useState`)을 유지한 채 멀티 세션 모델(`activeWorkspaceId`, `workspaceOrder`, `workspacesById`)로 확장한다.
- Rationale:
  - 기존 컴포넌트 인터페이스를 크게 깨지 않으면서 멀티 워크스페이스를 도입할 수 있다.
  - 중복 경로 포커스 정책은 UX 예측 가능성과 상태 일관성을 높인다.
  - selection 리셋은 전환 직후 오동작(다른 워크스페이스 selection 오염)을 줄이는 안전한 기본값이다.
- Alternatives considered:
  - `Open Workspace`를 기존 워크스페이스 교체 방식으로 유지
  - 동일 경로 재오픈 시 중복 워크스페이스 생성 허용
  - selection까지 워크스페이스별 완전 유지
- Impact / follow-up:
  - `main.md`에 F03.5를 `📋 Planned`로 추가하고 수용 기준/실행 순서를 갱신한다.
  - 구현 단계에서 워크스페이스별 read 요청 경합 제어(request token 분리)를 필수 검증 항목으로 포함한다.

## 2026-02-20 - F03.5 범위 확정(닫기/제거 + 트리 펼침 복원 포함)

- Context:
  - F03.5 드래프트 검토 중 열린 이슈 2건(워크스페이스 닫기/제거 포함 여부, 트리 펼침 상태 복원 여부)에 대한 결정을 사용자와 확정해야 했음.
- Decision:
  - 워크스페이스 닫기/제거 UX를 F03.5 범위에 포함한다.
  - 파일 트리 폴더 펼침 상태(`expandedDirectories`)를 워크스페이스별로 복원한다.
  - 기존 정책(`Open Workspace`는 항상 추가, 중복 경로는 기존 포커스, 전환 시 `selectionRange` 리셋)은 유지한다.
- Rationale:
  - 닫기/제거가 없으면 "항상 추가" 정책에서 목록이 누적되어 실사용 UX가 저하된다.
  - 워크스페이스별 트리 펼침 복원은 전환 비용을 낮추고 탐색 맥락을 유지한다.
  - 두 항목을 지금 포함하면 후속 F04+ 진행 시 리팩터링 재작업을 줄일 수 있다.
- Alternatives considered:
  - 닫기/제거를 후속 Feature로 분리
  - 트리 펼침 상태 복원을 제외하고 전환 시 매번 초기화
- Impact / follow-up:
  - `main.md`의 F03.5 포함/제외/수용 기준/리스크 항목을 본 결정 기준으로 갱신한다.
  - `feature_draft_f03_5_multi_workspace_foundation_and_support.md`의 Open Questions를 해소 상태로 업데이트한다.

## 2026-02-20 - F04~F07 멀티 워크스페이스 영향 기준 리라이트

- Context:
  - F03.5 완료 이후 F04~F07 스펙이 단일 워크스페이스 관점으로 일부 서술되어 해석 충돌 가능성이 있었음.
  - 사용자 요청으로 스펙 리라이트를 통해 영향 구간을 정리해야 했음.
- Decision:
  - F04~F07 공통 기준을 `active workspace` 우선 정책으로 고정한다.
  - 링크/경로 해석은 활성 워크스페이스 기준으로 처리하고 cross-workspace 자동 fallback은 MVP에서 제외한다.
  - watcher 관련 planned IPC payload에 `workspaceId`를 포함해 세션 오염을 방지한다.
  - 미확정 항목은 `main.md`의 `Open Questions (F04~F07 선결)`로 분리한다.
- Rationale:
  - 구현 전 기준을 명시하지 않으면 F04~F07에서 상태 누수/경로 충돌/리소스 누수가 발생하기 쉽다.
  - 공통 규칙을 먼저 고정하면 feature-draft/implementation 범위 산정이 단순해진다.
- Alternatives considered:
  - F04~F07에서 각 기능별로 개별 정책을 뒤늦게 정하는 방식
  - 활성 워크스페이스 실패 시 다른 워크스페이스 자동 탐색을 기본 정책으로 채택하는 방식
- Impact / follow-up:
  - `main.md`가 F04~F07 구현 준비 문서로 바로 사용 가능해짐.
  - 다음 feature-draft는 `Open Questions`의 선택지를 결정사항으로 전환하는 작업을 포함한다.

## 2026-02-20 - F04~F07 Open Questions 결정 고정

- Context:
  - F04~F07 준비 과정에서 남겨둔 선택지(Open Questions)를 구현 전에 확정해야 범위 변동을 줄일 수 있었음.
- Decision:
  - F04: `activeSpec`만 워크스페이스별 복원한다(TOC/스크롤/activeHeading 복원은 후속).
  - F05: 활성 워크스페이스에서 링크 해석 실패 시 오류만 표시한다(자동 cross-workspace 탐색 없음).
  - F07: watcher는 `openWorkspace` 시점에 즉시 시작하고 `closeWorkspace` 시 즉시 정리한다.
  - F06/F08: 액션 가드는 공통 레이어를 도입하지 않고 기능별 개별 구현을 유지한다.
- Rationale:
  - 현재 우선순위는 구현 속도와 정책 명확성 확보이며, 공통화/고급 복원은 후속 확장으로 분리하는 편이 안정적이다.
- Alternatives considered:
  - F04에서 스크롤/heading까지 동시 복원
  - F05에서 실패 시 다른 워크스페이스 탐색 보조 UX 제공
  - F07 watcher 지연 시작
  - F06/F08 공통 guard layer 선도입
- Impact / follow-up:
  - `main.md`의 `Open Questions`는 해소 상태로 전환한다.
  - 다음 `feature-draft`는 본 결정들을 전제로 수용 기준/테스트 시나리오를 작성한다.

## 2026-02-20 - F06.1 우클릭 복사 컨텍스트 정책 선반영

- Context:
  - F06 구현 전 단계에서 코드 뷰어/파일 트리 우클릭 복사 UX를 별도 feature로 분리해 스펙에 먼저 고정할 필요가 있었음.
  - 사용자 요청으로 경로 포맷과 우클릭 시 selection 동작을 미리 확정해 혼선을 줄이기로 했음.
- Decision:
  - `main.md` Priority Queue에 `F06.1`(P0, S)을 신규 추가하고 실행 순서를 `F06 -> F06.1 -> F07`로 고정한다.
  - 경로 복사는 `relative path`로 고정한다.
  - CodeViewer 우클릭 시 기존 선택 범위 안이면 selection을 유지하고, 범위 밖이면 해당 라인 단일 선택으로 전환한다.
  - F06은 툴바 복사 2종 범위로 유지하고, 우클릭 복사 UX는 F06.1 범위로 분리한다.
- Rationale:
  - 툴바 복사와 탐색 중 우클릭 복사는 사용 맥락이 달라 별도 feature로 나누는 편이 구현/검증/회귀 관리에 유리하다.
  - 우클릭 selection 정책을 사전에 고정하면 구현 시 UX 일관성과 테스트 기준이 명확해진다.
- Alternatives considered:
  - F06에 우클릭 복사를 함께 포함해 한 번에 구현
  - 우클릭 시 항상 해당 단일 라인으로 selection 강제 전환
  - 경로 복사 포맷을 절대경로로 유지
- Impact / follow-up:
  - `main.md`의 컴포넌트 상태/상태 모델/Feature Queue/수용 기준/리스크를 F06.1 planned 기준으로 동기화한다.
  - 구현 완료 후 `spec-update-done`에서 F06.1 상태를 `✅ Done`으로 전환한다.

## 2026-02-20 - F04 동작 보정 반영(activeSpec 기반 우측 패널 유지)

- Context:
  - 구현 중 코드 파일 선택 시 우측 markdown 렌더 패널이 비워져 스펙+코드 동시 작업 흐름이 끊기는 문제가 확인되었음.
  - 제품 목표는 코드와 스펙을 병렬로 참조하는 3패널 워크벤치이며, 우측 패널이 active file 타입에 종속되면 목표 UX와 충돌함.
- Decision:
  - 우측 rendered spec 패널의 데이터 소스는 `activeSpec` 세션 상태로 고정한다.
  - Markdown 파일 선택 시에만 `activeSpec`/`activeSpecContent`를 갱신하고, 코드/비-Markdown 파일 선택 시에는 마지막 spec 렌더 상태를 유지한다.
  - spec 렌더 로딩/오류는 코드 프리뷰 상태와 분리해 `isReadingSpec`/`activeSpecReadError`로 관리한다.
- Rationale:
  - center(code)와 right(spec)를 독립 상태로 유지해야 “스펙 보면서 코드 읽기” 핵심 시나리오가 끊기지 않는다.
  - spec 렌더 상태를 분리하면 코드 파일 읽기 에러/preview unavailable 이벤트가 우측 패널을 오염시키지 않는다.
- Alternatives considered:
  - `activeFile`이 Markdown일 때만 우측 패널 표시
  - 코드 파일 선택 시 우측 패널을 placeholder로 초기화
- Impact / follow-up:
  - `main.md`의 F04 정의/상태 모델/수용 기준/테스트 수치를 실제 구현(총 54 tests, `App.test.tsx` 17건)에 맞춰 동기화한다.
  - F09 진행 시 active heading/section 추출도 동일하게 `activeSpec` 기반으로 확장한다.

## 2026-02-21 - F06.2 복사 UX 통합 + F08/F09 진입점 재정의(Planned)

- Context:
  - 사용자 요청으로 복사 UX 단순화를 위해 코드 선택 드래그, 우클릭 액션 통합, 툴바 복사 버튼 제거, 디렉터리 경로 복사를 한 묶음으로 계획해야 했음.
  - 추가로 `Copy Both` 라벨과 `ContextToolbar` 완전 제거 여부, F08/F09의 후속 연결 방식이 결정되어야 했음.
- Decision:
  - Priority Queue에 `F06.2`(P0, M)를 신규 추가한다.
  - CodeViewer 우클릭 액션 라벨은 `Copy Both`로 고정하고 payload 포맷은 기존 F06(`relative/path:Lx-Ly` + 본문)을 재사용한다.
  - F06.2에서 `Copy Active File Path`/`Copy Selected Lines` 툴바 버튼과 `context-toolbar` 컴포넌트를 제거한다.
  - FileTree 우클릭 경로 복사는 파일뿐 아니라 디렉터리까지 확장한다.
  - F08/F09는 toolbar 의존이 아니라 각각 워크스페이스 액션 영역(F08), SpecViewer 액션 영역(F09)으로 진입점을 재정의한다.
- Rationale:
  - 복사 기능을 탐색 맥락(코드/트리 우클릭)으로 통합하면 작업 전환 비용이 줄고 UI 구조가 단순해진다.
  - 툴바 제거를 먼저 명시해야 F08/F09가 향후 잘못된 UI 전제(toolbar 확장)에 묶이지 않는다.
- Alternatives considered:
  - 기존 라벨(`Copy Selected Lines`) 유지
  - `context-toolbar`를 최소 골격으로 유지한 채 F08/F09를 연결
  - 디렉터리 우클릭 복사를 제외하고 파일만 지원
- Impact / follow-up:
  - `main.md`의 우선순위 큐, 상태/상호작용 규칙, 수용 기준, 리스크를 F06.2 planned 기준으로 갱신한다.
  - 다음 구현 순서는 `F06.1 -> F06.2 -> F07 -> F08/F09`를 권장한다.

## 2026-02-21 - F08 범위 확장(Open in VSCode 추가 + 버튼 위치 고정)

- Context:
  - F08이 기존에는 iTerm 단일 액션 기준으로 정의되어 있었음.
  - 사용자 요청으로 VSCode 열기 액션이 추가되었고, 버튼 위치를 헤더가 아닌 좌측 `Current Workspace` 블록 아래로 고정해야 했음.
- Decision:
  - F08 범위를 `Open in iTerm` + `Open in VSCode` 2개 액션으로 확장한다.
  - F08 액션 버튼은 상단 헤더가 아닌 좌측 패널의 `Current Workspace` 요약 블록 바로 아래에 배치한다.
  - IPC 계획은 `system:openInIterm` + `system:openInVsCode` 2채널로 관리한다.
- Rationale:
  - 워크스페이스 실행 액션은 현재 워크스페이스 맥락 근처(좌측 요약 블록)에서 제공하는 편이 발견 가능성과 의미 정합성이 높다.
  - iTerm/VSCode를 함께 제공하면 실제 작업 루프(터미널 + 에디터 진입) 전환 비용을 줄일 수 있다.
- Alternatives considered:
  - iTerm 단일 액션 유지
  - 액션 버튼을 헤더(Workspace switcher 인접)에 유지
- Impact / follow-up:
  - `main.md`의 F08 설명/완료 기준/예상 변경 파일/수용 기준/IPC 계획을 확장된 요구사항 기준으로 업데이트한다.
  - 다음 단계에서 `implementation-plan`으로 F08을 작업 분할할 때 2개 액션 및 위치 제약을 그대로 적용한다.

## 2026-02-21 - F08 액션 UI 형태 고정(`Open In:` + 아이콘 버튼)

- Context:
  - 사용자 요청으로 F08 액션의 시각적 표현을 텍스트 버튼보다 간결한 형태로 고정할 필요가 있었음.
- Decision:
  - 좌측 `Current Workspace` 아래 F08 액션 UI를 `Open In:` 라벨 + 아이콘 버튼 2개(iTerm, VSCode)로 고정한다.
  - 아이콘 버튼은 tooltip/접근성 라벨(`Open in iTerm`, `Open in VSCode`)을 반드시 제공한다.
  - 활성 워크스페이스가 없으면 두 버튼은 disabled 처리한다.
- Rationale:
  - 액션 밀도를 줄이면서도 라벨(`Open In:`)을 남기면 의미 전달과 시각적 간결성을 동시에 확보할 수 있다.
  - 아이콘 단독 UI는 접근성 라벨/툴팁을 같이 고정해야 사용성 저하를 막을 수 있다.
- Alternatives considered:
  - 텍스트 버튼(`Open in iTerm`, `Open in VSCode`) 유지
  - 아이콘만 배치하고 라벨 없이 사용
- Impact / follow-up:
  - `main.md`의 F08 포함 범위/완료 기준/레이아웃 설명에 icon UI 정책을 반영한다.

## 2026-02-21 - F09 범위 교체(스펙 섹션 복사 -> 앱 재시작 세션 복원)

- Context:
  - 사용자 우선순위가 “스펙 섹션 복사”보다 “앱 재시작 후 작업 문맥 복원(워크스페이스/활성 파일/파일 위치)”에 더 높게 설정되었음.
  - 멀티 워크스페이스(F03.5)와 파일 히스토리(F07.1)가 이미 구현되어 있어 세션 영속화 계층을 추가하면 실사용성이 크게 개선될 수 있음.
- Decision:
  - F09를 `Copy Current Spec Section`에서 `앱 재시작 세션 복원 + 라인 기준 위치 복원`으로 교체한다.
  - 복원 범위는 열린 워크스페이스 목록, active workspace, workspace별 active file, 파일별 마지막 라인으로 고정한다.
  - 라인 복원은 픽셀 스크롤 복원 대신 라인 기준 복원으로 고정하고, 파일 길이 변경 시 EOF clamp를 허용한다.
  - 영속화 저장소는 renderer `localStorage`를 기본으로 한다.
  - 기존 F09(섹션 복사)는 현재 우선순위 큐에서 제외하고 필요 시 신규 Feature ID로 재등록한다.
- Rationale:
  - 앱 재시작 후 바로 작업 문맥을 복원하면 실제 개발 루프의 전환 비용을 크게 줄일 수 있다.
  - 라인 기준 복원은 구현 복잡도를 통제하면서도 사용자 체감 가치가 높은 최소 요건이다.
  - 기존 F09 요구는 다른 복사 UX(F06.1/F06.2)와 중복 가치가 있어 우선순위를 낮추는 것이 합리적이다.
- Alternatives considered:
  - 기존 F09(섹션 복사)를 유지하고 세션 복원을 F10 이후로 이월
  - 세션 복원에 픽셀 단위 스크롤 복원까지 포함
  - localStorage 대신 별도 IPC 기반 저장소를 즉시 도입
- Impact / follow-up:
  - `main.md`의 범위/커버리지/상태 모델/신뢰성/Feature Queue/수용 기준/리스크를 F09 교체 기준으로 동기화한다.
  - 다음 구현 순서는 `F09(세션 복원) -> F10(안정화)`로 유지한다.

## 2026-02-22 - F11 구현 완료 + review follow-up 반영

- Context:
  - F11(인라인 코드 코멘트 + LLM Export Bundle) 구현이 완료되었고, 자동 테스트/린트/빌드 게이트를 통과했음.
  - implementation-review에서 지적된 두 이슈(클립보드 export 성공 판정 불일치, 종료 시 write 중단 가능성)가 후속 수정으로 반영되었음.
  - 스펙 문서에는 F11이 Planned로 남아 있었고, IPC/수용 기준/검증 수치가 최신 코드와 드리프트 상태였음.
- Decision:
  - F11 상태를 `✅ Done`으로 전환한다.
  - comments source of truth(`.sdd-workbench/comments.json`), `_COMMENTS.md` overwrite export, bundle 길이 제한(`MAX_CLIPBOARD_CHARS=30000`) 정책을 구현 기준으로 고정한다.
  - clipboard export 성공 피드백은 실제 clipboard write 성공 시에만 집계되도록 고정한다.
  - 종료 경로는 watcher 정리 전에 in-flight workspace write settle을 최대 5초까지 대기하고, 이후 watcher 종료 타임아웃(1.5초)을 적용한다.
- Rationale:
  - F11은 코드 뷰어 우클릭 코멘트 작성과 LLM 전달 번들 생성이라는 핵심 사용자 흐름을 완결했고, 실패 경로까지 포함한 신뢰성 정책을 문서에 고정해야 회귀를 줄일 수 있다.
  - clipboard 성공/실패 오판은 사용자 신뢰에 직접 영향을 주므로 성공 판정 기준을 구현 동작과 일치시켜야 한다.
  - 종료 시 write settle 대기를 명시해야 comments 저장/export 중 데이터 손실 가능성을 줄일 수 있다.
- Alternatives considered:
  - F11을 partial로 유지하고 후속 기능(렌더 패널 코멘트 진입)까지 포함해 한 번에 done 처리
  - 종료 경로에서 기존 watcher single-flight만 유지하고 write settle 대기는 도입하지 않음
- Impact / follow-up:
  - `main.md` 메타데이터/인벤토리/상태 모델/IPC 계약/Feature Queue/수용 기준/검증 수치를 F11 완료 기준으로 동기화한다.
  - 후속 코멘트 UX(예: rendered markdown에서 코멘트 진입/가시화)는 신규 feature draft로 분리한다.

## 2026-02-22 - 스펙 구조 리라이트(인덱스 + 하위 문서 분할)

- Context:
  - `/_sdd/spec/main.md`가 1300+ 라인으로 확장되면서 인벤토리/Feature Queue/수용 기준/운영 기준이 단일 파일에 과집중되어 탐색성이 낮아졌음.
  - F11/F11.1까지 구현 완료된 상태에서 같은 정책(코멘트/증분 export/마커)이 여러 섹션에 반복 기술되어 문서 유지비용이 증가했음.
  - 사용자 요청으로 `spec-rewrite`를 적용해 스펙 구조를 재정렬할 필요가 생겼음.
- Decision:
  - `main.md`는 인덱스/요약 허브로 축소하고, 상세는 `/_sdd/spec/sdd-workbench/` 하위 주제 문서로 분할한다.
  - 분할 구조는 `01-overview`, `02-architecture`, `03-components`, `04-interfaces`, `05-operational-guides`, `appendix`로 고정한다.
  - 상세 기능 이력과 리스크/백로그는 appendix로 이동하고, 구현/정책 결정의 source of truth는 계속 `decision-log.md`로 유지한다.
- Rationale:
  - 구현 반영(`spec-update-done`) 시 변경 범위를 주제 문서 단위로 줄이면 드리프트 위험과 리뷰 비용을 낮출 수 있다.
  - 인덱스-하위문서 구조는 읽기 경로를 단순화하고, 신규 기능(F12+) 추가 시 문서 충돌을 완화한다.
- Alternatives considered:
  - 단일 `main.md` 유지 + 섹션 정리만 수행
  - `main.md`를 유지하고 appendix만 추가
  - 기능별(F01~) 개별 문서로 과도 분할
- Impact / follow-up:
  - `main.md` 링크 허브를 기준으로 하위 문서를 탐색하는 문서 운영 규칙을 적용한다.
  - 추후 기능 추가 시 우선 해당 주제 문서만 갱신하고, summary 수준 변경만 인덱스에 반영한다.
  - appendix 비대화 추이를 모니터링하고 필요 시 릴리스 단위 아카이브를 분리한다.

## 2026-02-24 - F23 2패널 탭 레이아웃(3패널→2패널 전환)

- Context:
  - 기존 3패널 레이아웃(사이드바 | 코드 | 스펙)은 넓은 화면이 필요하여 작은 모니터/분할 화면에서 불편했음.
  - 코드와 스펙을 동시에 볼 필요가 적고, 탭 전환으로 충분한 경우가 대부분이었음.
  - 워크스페이스 관리 컨트롤이 헤더에 있어 헤더가 과밀했음.
- Decision:
  - 3패널 레이아웃을 2패널 탭 레이아웃(사이드바 + Code/Spec 탭 콘텐츠)으로 변경한다.
  - 헤더: 좌측(타이틀 + Back/Forward + Code/Spec 탭) + 우측(코멘트 액션).
  - 워크스페이스 관리(선택기/Open/Close)를 사이드바 상단으로 이동한다.
  - CSS Grid 3열→2열, 리사이저 2개→1개로 단순화한다.
  - `PaneSizes`를 `{ left, content }`로 단순화한다(`center`/`right` 제거).
  - 비활성 탭은 `display: none`으로 숨겨 DOM/스크롤 위치를 보존한다(언마운트 방지).
  - `.md` 파일 선택 시 Spec 탭, 그 외 파일 선택 시 Code 탭으로 자동 전환한다.
  - spec 점프/Go to Source/코멘트 target 점프 시 Code 탭으로 자동 전환한다.
  - `Cmd+Shift+Left/Right`로 Code/Spec 탭 키보드 전환을 지원한다.
  - 탭 상태(`activeTab`)는 워크스페이스별이 아닌 전역 UI 상태로 관리한다.
- Rationale:
  - 2패널로 최소 앱 폭이 크게 축소되어 다양한 화면 크기에 대응 가능.
  - 탭 전환으로 콘텐츠 영역이 넓어져 코드/스펙 가독성 향상.
  - `display: none` 방식으로 spec 스크롤 위치 복원이 자연스럽게 동작.
  - 워크스페이스 컨트롤을 사이드바에 모으면 헤더가 간결해지고 기능 그룹화가 명확.
- Alternatives considered:
  - 3패널 유지 + 반응형 접기: 구현 복잡도 대비 이점 미미
  - 탭 상태를 워크스페이스별로 관리: 전환 시 혼란 가능성 + 불필요한 복잡도
- Impact / follow-up:
  - `main.md`(v0.35.0), `product-overview.md`, `system-architecture.md`, `component-map.md`, `contract-map.md`, `operations-and-validation.md`, `appendix.md`를 F23 완료 기준으로 동기화한다.
  - 품질 게이트: `npm test`(`23 files, 285 passed`), `npm run lint`, `npm run build` 모두 통과.

## 2026-03-11 - F40 Finder 클립보드 구현 변경(electron clipboard → electron-clipboard-ex)

- Context:
  - 기존 Finder 클립보드 읽기는 `electron.clipboard.availableFormats()` + `clipboard.readBuffer('text/uri-list')` 조합으로 URI를 파싱하고, fallback으로 `NSFilenamesPboardType` binary plist를 `bplist-parser`로 해석했음.
  - `text/uri-list` 경로는 Electron/Chromium이 NSPasteboard를 MIME 변환하는 과정에서 환경별로 불안정한 동작을 보였고, `bplist-parser` fallback은 binary plist 버전 의존성이 있었음.
  - `electron-clipboard-ex` native 모듈은 `readFilePaths()`로 NSPasteboard에 직접 접근해 안정적인 파일 경로 배열을 반환함.
- Decision:
  - `electron.clipboard` + `bplist-parser` 조합을 제거하고 `electron-clipboard-ex`의 `readFilePaths()`로 대체한다.
  - `electron-clipboard-ex`를 `package.json` dependencies에 추가하고, Vite main process 빌드에서 `external`로 설정한다.
  - `readFinderClipboardFiles()` 함수의 외부 인터페이스(반환 타입 `string[] | null`)는 변경 없이 유지한다.
- Rationale:
  - native 모듈이 NSPasteboard 접근을 직접 수행하므로 Electron/Chromium MIME 변환 레이어의 불안정성을 우회할 수 있다.
  - URI 파싱/bplist 파싱 코드 약 40줄이 단일 함수 호출로 대체되어 유지보수 비용이 감소한다.
  - native addon이므로 Vite 번들에 포함하면 안 되고, `rollupOptions.external`로 제외해야 한다.
- Alternatives considered:
  - `text/uri-list` 파싱만 유지하고 `bplist-parser` fallback 제거: Electron 버전별 MIME 변환 불일치 위험 잔존
  - `bplist-parser`만 유지하고 `text/uri-list` 경로 제거: binary plist 버전 호환성 위험 잔존
  - 자체 native addon 작성: `electron-clipboard-ex`가 이미 동일 기능을 안정적으로 제공
- Impact / follow-up:
  - `workspace-and-file-tree.md`, `ipc-contracts.md`, `main.md`를 동기화했다.
  - `bplist-parser`는 `package.json`에 아직 남아 있으나 코드에서 더 이상 사용하지 않으므로 향후 정리 대상이다.
