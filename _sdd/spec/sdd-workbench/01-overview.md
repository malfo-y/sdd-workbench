# 01. Overview

## 1. 문서 목적

이 문서는 SDD Workbench의 제품 목표, MVP 범위, 사용자 가치 흐름을 빠르게 파악하기 위한 개요 문서다.

## 2. 핵심 목표

1. 스펙(Markdown)과 코드를 탭 전환으로 보는 2패널 워크벤치 제공
2. 스펙 문서 링크/선택에서 코드 라인으로 즉시 점프
3. CLI 협업을 위한 컨텍스트 복사 및 외부 툴 연동(Open In) 지원
4. 외부 파일 변경(watcher)을 UI에서 안정적으로 반영
5. 코멘트 수집/관리/내보내기/hover preview/피드백 루프(F11~F12.5)로 LLM 협업 효율화
6. 스펙-코드 왕복 시 rendered 문맥(스크롤 위치) 보존으로 탐색 비용 최소화
7. 로컬/원격 워크스페이스 모두에서 watcher 신뢰성을 유지(`auto/native/polling`)
8. 대규모/원격 워크스페이스에서 lazy indexing + on-demand 디렉토리 확장으로 빠른 초기 로드
9. CodeMirror 6 기반 코드 에디터로 spec-code 왕복 편집 비용 절감(read-only 뷰어 대체 → 직접 편집 + 저장)
10. 파일 트리에서 파일/디렉토리 직접 생성·삭제·이름변경으로 spec-code 편집 흐름을 워크스페이스 내에서 완결(F25/F25b)
11. 파일 트리에서 git 파일 상태(Untracked/Added/Modified)를 뱃지로 즉시 식별(F26)
12. Remote Agent Protocol 기반 원격 워크스페이스 실행 경로를 도입해 원격 작업을 SSH agent 세션으로 처리하고, SSH 선접속 후 디렉토리 browse로 remote root 선택 UX를 제공한다(F27/F28, Implemented)
13. markdown raw source와 rendered spec 사이를 same-file line 기준으로 왕복 이동하고, 도착 위치를 temporary highlight로 즉시 인지할 수 있게 한다(F34/F35)

## 3. 범위

### 3.1 MVP 포함 범위

- 멀티 워크스페이스 열기/전환/닫기
- 파일 트리 탐색 및 코드 프리뷰
- Code/Spec 탭 전환 뷰(비활성 탭 display:none 보존)
- spec->code 링크 점프 및 rendered selection source jump
- same-spec source jump 시 rendered spec scroll 유지(런타임)
- 우클릭 기반 컨텍스트 복사
- watcher 기반 changed indicator + collapse 버블링 가시화
- watch mode 수동 override(`Auto/Native/Polling`) + native 실패 시 polling fallback
- 대규모 디렉토리 lazy indexing(node cap 100,000 + 디렉토리별 child cap 500) + on-demand 확장
- 파일 히스토리 Back/Forward + 입력 바인딩(mouse/swipe/wheel)
- 앱 재시작 시 세션 복원(workspaces/active file/active spec/line resume)
- inline comment + export bundle + incremental export
- View Comments 모달 기반 코멘트 편집/삭제/Delete Exported
- Add Global Comments + export 선행 prepend
- code/rendered marker hover preview로 코멘트 본문 요약 확인
- View Comments 상단 global comments 표시 + "Include in export" 체크박스로 global 포함 선택 + Export modal global 포함 상태 표시
- 코멘트 액션 배너 + remote 연결/폴백 배너 5초 auto-dismiss
- header comments 액션 그룹 + title 옆 Back/Forward + Code/Spec 탭 배치
- active file Git diff 라인 마커(added/modified) 표시
- Cmd+Shift+Up/Down 워크스페이스 키보드 순환 전환
- 2패널 탭 레이아웃(Code/Spec 탭 전환) + 워크스페이스 관리 사이드바 통합 + Cmd+Shift+Left/Right 탭 전환
- CodeMirror 6 기반 코드 에디터(read-only→editable), 다크 테마, CM6 검색, Cmd+S 저장 + dirty 상태 관리, unsaved changes guard, Git marker/Comment badge gutter extension
- 파일 트리 CRUD: 파일/디렉토리 생성(우클릭 → 인라인 입력 → Enter 확정), 삭제(confirm dialog + active file 상태 초기화), Rename(코멘트 보호 방식), watcher 기반 트리 자동 갱신, orphaned comment 허용(MVP)
- 파일 트리 Git 파일 상태 마커: `git status --porcelain` 기반 U(Untracked/Added)/M(Modified) 뱃지, 디렉토리 접힘 시 하위 상태 버블링(priority: modified > added/untracked)
- 파일 브라우저 검색: local/remote 공통 `workspace:searchFiles` 계약 기반 파일명 검색 + partial 결과 힌트 + best-effort ancestor expand (F29)
- 스펙 뷰어 검색: 현재 markdown 문서 내 block search(`Cmd/Ctrl+F`, `Enter`/`Shift+Enter`, `Escape`) + rendered block highlight (F30)
- 검색 `*` wildcard 지원: 파일 브라우저/스펙 뷰어 공통 ordered token match, wildcard-only query empty 처리, 검색 입력 `(* supported)` discoverability (F31)
- 스펙 뷰어 코멘트/source action 정밀도 개선: `data-source-line-start/end` 기반 line span metadata + multiline paragraph/table cell best-effort anchor 계산 (F32)
- 스펙 뷰어 exact source offset anchor MVP: paragraph/list/blockquote/link text/inline code/fenced code block selection을 same-file raw markdown exact offset으로 해석하고, `Go to Source`/`Add Comment`에 optional exact range를 전달한다(F33)
- markdown source `Go to Spec`: `.md` Code 탭 context menu에서 현재 `selectionRange.startLine` 기준으로 같은 파일의 rendered spec block으로 이동한다(F34)
- cross-panel navigation target highlight: spec/code explicit navigation 시 도착한 rendered block 또는 code line에 temporary highlight를 적용한다(F35)
- 코드 에디터 line wrap 토글 버튼(기본 On, 가로 스크롤 방지) + `wrapCompartment` 기반 동적 전환 (F24.1)
- 파일 히스토리 Back/Forward 이동 시 코드 에디터 픽셀 스크롤 위치 복원(런타임, `codeScrollPositionsRef`) (F07.2)
- Remote Agent Protocol 기반 원격 워크스페이스 연결(Host/User/Port/Identity 입력 -> SSH 디렉토리 browse -> remoteRoot 선택(수동 입력 fallback) -> bootstrap/runtime 설치/검증, 기존 `workspace:*` 계약 유지, 파일/감시/git 메타데이터 원격 실행) (F27/F28)

### 3.2 MVP 제외 범위

- IDE급 고급 편집 기능(리팩터링/LSP/멀티탭/auto-save/auto-format/minimap)
- 내장 터미널
- Git diff/commit 전용 UI
- 원격 포트포워딩 UI/원격 확장 실행/원격 LSP 관리
- 원격 agent 고급 자동화(자동 업그레이드/롤백/복수 배포 채널 관리)
- 코멘트 협업 동기화/원격 저장
- 코멘트 스레드/답글 UI

## 4. 주요 사용자 흐름

### 4.1 탐색 흐름

1. 워크스페이스를 추가로 열고(사이드바에서 선택/전환)
2. 파일 트리에서 파일을 선택하면 파일 타입에 따라 Code/Spec 탭이 자동 전환되고
3. Code/Spec 탭을 수동 전환하거나(`Cmd+Shift+Left/Right`) rendered 스펙 링크로 코드 위치를 점프한다.

### 4.2 컨텍스트 전달 흐름

1. 코드/트리에서 우클릭으로 상대경로/선택 내용을 복사하고
2. 필요 시 Open In(iTerm/VSCode)로 외부 작업으로 전환한다.

### 4.3 원격 연결 경로 전환(F15 -> F27)

1. F15(SSHFS 기반) 원격 연결 경로는 폐기되었고, 신규 원격 연결은 F27(remote-protocol)만 사용한다.
2. 원격 연결은 `Connect Remote Workspace` 모달에서 입력하며, 마지막 입력값은 로컬 저장소에 유지된다.
3. 인증키 경로를 입력한 경우 `ssh -i <identityFile> -o IdentitiesOnly=yes`로 연결한다.

### 4.5 대규모 워크스페이스 탐색 흐름(F16)

1. 초기 인덱싱 시 디렉토리별 child cap(500)을 적용하여 과대 디렉토리를 `partial`로 표시한다.
2. 초기 인덱싱은 노드 cap(100,000)과 child cap(500)으로 제한해 초기 로드 속도를 확보한다.
3. `not-loaded` 디렉토리를 확장하면 on-demand로 해당 디렉토리의 자식을 로드한다.
4. local polling watcher는 child cap 초과 디렉토리를 제외해 반복 스캔 부하를 억제하고, remote polling watcher는 100,000 파일 상한 + symlink 추적(실경로 순환 방지) 정책을 사용한다.

### 4.4 코멘트-LLM 흐름

1. CodeViewer 또는 rendered markdown에서 `Add Comment`로 코멘트를 저장
2. `View Comments`에서 코멘트 조회/편집/삭제/Delete Exported를 수행
3. `Add Global Comments`로 워크스페이스 전역 지시사항을 관리
4. 코드/문서 marker와 hover preview로 코멘트 분포/본문 요약을 확인
5. `View Comments`에서 "Include in export" 체크박스로 Global Comments 포함 여부를 선택
6. `Export Comments`에서 Global Comments 선행 + pending-only line comment bundle을 내보내고 `exportedAt`를 기록

### 4.6 원격 에이전트 워크스페이스 연결 흐름(F27/F28, Implemented)

1. 사용자가 `Connect Remote Workspace`에서 host/user/port/agent path/identity file을 입력하고 `Browse Directories`로 SSH 기반 원격 디렉토리 목록을 조회한다.
2. 브라우저에서 current path/상위 이동/하위 디렉토리 이동 후 `Use Current Directory`로 `remoteRoot`를 확정한다(수동 입력 fallback 유지).
3. Main 프로세스는 SSH로 원격 agent runtime을 배포(덮어쓰기)하고 `--protocol-version` + `--healthcheck`를 검증한 뒤 stdio 세션을 시작한다.
4. 연결 성공 시 renderer는 remote workspace 세션을 생성하고 기존 `workspace:index/read/write/create/delete/rename/watch/git/comments` 플로우를 동일하게 사용한다.
5. 연결 장애/타임아웃 시 상태를 `degraded` 또는 `disconnected`로 표기하고 자동 재시도(기본 3회) 후 수동 재시도 경로를 제공한다.

### 4.7 markdown source <-> rendered spec 왕복 흐름(F34/F35)

1. 사용자가 Code 탭에서 `.md` 파일을 열고 우클릭 `Go to Spec`를 실행하면, 현재 `selectionRange.startLine`이 navigation anchor가 된다.
2. App은 Spec 탭으로 전환하고 같은 markdown 파일의 rendered block 중 해당 source line에 가장 잘 대응하는 `data-source-line` block으로 스크롤한다.
3. spec-origin `Go to Source` 또는 F34 `Go to Spec`처럼 명시적인 navigation이 일어나면 도착한 code line/rendered block에 temporary highlight를 적용해 위치 인지성을 높인다.

## 5. 현재 기능 커버리지 요약

| 도메인 | 상태 | 비고 |
|---|---|---|
| Workspace/File 탐색 | Implemented | F01/F02/F03/F03.5 |
| Spec dual view + 링크 점프 | Implemented | F04/F04.1/F05/F10.1 |
| 복사 UX 통합 | Implemented | F06/F06.1/F06.2 |
| Spec 점프 문맥 유지 | Implemented | F11.2 |
| Watcher + 변경 표시 | Implemented | F07 + F11.2 follow-up |
| History navigation | Implemented | F07.1 |
| Open In 액션 | Implemented | F08 |
| 세션 복원 | Implemented | F09 |
| 보안/성능 안정화 | Implemented | F10 |
| 이미지 프리뷰 | Implemented | F10.2 |
| 코멘트/Export | Implemented | F11/F11.1 |
| 코멘트 hover preview | Implemented | F12.1 |
| 코멘트 관리(View/Edit/Delete) | Implemented | F12.2 |
| Global Comments + export prepend | Implemented | F12.3 |
| 헤더 액션 그룹 compact 재배치 | Implemented | F12.4 |
| 코멘트 피드백 auto-dismiss + global 가시성 + 헤더 좌측 history 배치 | Implemented | F12.5 |
| 원격 워크스페이스 watch mode 정책(SSHFS) | Retired | F15 |
| Lazy indexing + on-demand 디렉토리 확장 | Implemented | F16 |
| Global 포함 체크박스 + Delete Exported 하단 이동 | Implemented | F17 |
| Shiki 기반 코드 하이라이팅(40+ 언어, 비동기) | Implemented | F18 |
| active file Git diff 라인 마커(added/modified) | Implemented | F19 |
| Export 선택 제한 완화 + comment-to-code jump | Implemented | F20 |
| Code viewer 텍스트 검색 | Implemented | F21 |
| 키보드 워크스페이스 전환(Cmd+Shift+Up/Down) | Implemented | F22 |
| 2패널 탭 레이아웃 + 사이드바 워크스페이스 관리 | Implemented | F23 |
| CM6 코드 에디터(편집/저장/dirty) + gutter 확장 | Implemented | F24 |
| 파일 트리 CRUD(생성/삭제/Rename) + 인라인 입력 + watcher 자동 갱신 | Implemented | F25/F25b |
| 파일 트리 Git 파일 상태 마커(U/M badge + 디렉토리 버블링) | Implemented | F26 |
| 파일 브라우저 파일명 검색(backend-assisted) | Implemented | F29 |
| 스펙 뷰어 텍스트 검색(block highlight + hotkey gate) | Implemented | F30 |
| 검색 `*` wildcard 지원(ordered token match + wildcard-only empty query) | Implemented | F31 |
| 스펙 뷰어 코멘트/source action line anchor 정밀도 개선 | Implemented | F32 |
| 스펙 뷰어 exact source offset anchor MVP | Implemented | F33 |
| markdown source `Go to Spec` | Implemented | F34 |
| cross-panel navigation target highlight | Implemented | F35 |
| 코드 에디터 line wrap 토글(기본 On) | Implemented | F24.1 |
| 코드 에디터 히스토리 스크롤 위치 복원 | Implemented | F07.2 |
| Remote Agent Protocol 기반 원격 워크스페이스 실행 | Implemented | F27 |
| SSH 선접속 기반 원격 디렉토리 browse + remoteRoot 선택 | Implemented | F28 |

## 6. Open Questions

현재 기준 Open Question 없음.

결정사항:
1. 원격 agent 자동화는 MVP 수준으로 제한한다(runtime 배포 + 실행 가능 여부 + 버전 검증).
2. F15(SSHFS 기반) 원격 연결은 폐기하고 F27(remote-protocol) 단일 경로로 전환한다.
3. 원격 연결 입력 UX는 모달로 고정하고 마지막 입력값을 저장해 재사용한다.
4. SSH 개인키 경로(`identityFile`)를 허용하고 연결 시 `IdentitiesOnly=yes`를 함께 적용한다.
