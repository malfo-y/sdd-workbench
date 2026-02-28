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
7. 원격 마운트 워크스페이스에서도 watcher 신뢰성을 유지(`auto/native/polling`)
8. 대규모/원격 워크스페이스에서 lazy indexing + on-demand 디렉토리 확장으로 빠른 초기 로드
9. CodeMirror 6 기반 코드 에디터로 spec-code 왕복 편집 비용 절감(read-only 뷰어 대체 → 직접 편집 + 저장)
10. 파일 트리에서 파일/디렉토리 직접 생성·삭제·이름변경으로 spec-code 편집 흐름을 워크스페이스 내에서 완결(F25/F25b)
11. 파일 트리에서 git 파일 상태(Untracked/Added/Modified)를 뱃지로 즉시 식별(F26)
12. SSHFS 의존을 줄이기 위해 Remote Agent Protocol 기반 원격 워크스페이스 실행 경로를 도입(F27, 📋 Planned)

## 3. 범위

### 3.1 MVP 포함 범위

- 멀티 워크스페이스 열기/전환/닫기
- 파일 트리 탐색 및 코드 프리뷰
- Code/Spec 탭 전환 뷰(비활성 탭 display:none 보존)
- spec->code 링크 점프 및 rendered selection source jump
- same-spec source jump 시 rendered spec scroll 유지(런타임)
- 우클릭 기반 컨텍스트 복사
- watcher 기반 changed indicator + collapse 버블링 가시화
- 원격 마운트 auto polling + watch mode 수동 override(`Auto/Native/Polling`)
- 대규모 디렉토리 lazy indexing(remote 깊이제한 3레벨 + 디렉토리별 child cap 500) + on-demand 확장
- 파일 히스토리 Back/Forward + 입력 바인딩(mouse/swipe/wheel)
- 앱 재시작 시 세션 복원(workspaces/active file/active spec/line resume)
- inline comment + export bundle + incremental export
- View Comments 모달 기반 코멘트 편집/삭제/Delete Exported
- Add Global Comments + export 선행 prepend
- code/rendered marker hover preview로 코멘트 본문 요약 확인
- View Comments 상단 global comments 표시 + "Include in export" 체크박스로 global 포함 선택 + Export modal global 포함 상태 표시
- 코멘트 배너 5초 auto-dismiss(코멘트 액션 경로 한정)
- header comments 액션 그룹 + title 옆 Back/Forward + Code/Spec 탭 배치
- active file Git diff 라인 마커(added/modified) 표시
- Cmd+Shift+Up/Down 워크스페이스 키보드 순환 전환
- 2패널 탭 레이아웃(Code/Spec 탭 전환) + 워크스페이스 관리 사이드바 통합 + Cmd+Shift+Left/Right 탭 전환
- CodeMirror 6 기반 코드 에디터(read-only→editable), 다크 테마, CM6 검색, Cmd+S 저장 + dirty 상태 관리, unsaved changes guard, Git marker/Comment badge gutter extension
- 파일 트리 CRUD: 파일/디렉토리 생성(우클릭 → 인라인 입력 → Enter 확정), 삭제(confirm dialog + active file 상태 초기화), Rename(코멘트 보호 방식), watcher 기반 트리 자동 갱신, orphaned comment 허용(MVP)
- 파일 트리 Git 파일 상태 마커: `git status --porcelain` 기반 U(Untracked/Added)/M(Modified) 뱃지, 디렉토리 접힘 시 하위 상태 버블링(priority: modified > added/untracked)
- 코드 에디터 line wrap 토글 버튼(기본 On, 가로 스크롤 방지) + `wrapCompartment` 기반 동적 전환 (F24.1)
- 파일 히스토리 Back/Forward 이동 시 코드 에디터 픽셀 스크롤 위치 복원(런타임, `codeScrollPositionsRef`) (F07.2)
- 📋 Remote Agent Protocol 기반 원격 워크스페이스 연결(Host/User/Remote Root 입력, 기존 `workspace:*` 계약 유지, 파일/감시/git 메타데이터 원격 실행) (F27)

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

### 4.3 원격 워크스페이스 감시 흐름(F15, Deprecated)

1. F15(SSHFS 기반) 경로는 레거시 동작으로 유지되지만, 신규 확장 대상에서 제외한다.
2. 원격 워크스페이스 전략은 F27(remote-protocol) 단일 경로로 전환한다.
3. F27 안정화 후 F15 경로는 제거(폐기)한다.

### 4.5 대규모 워크스페이스 탐색 흐름(F16)

1. 초기 인덱싱 시 디렉토리별 child cap(500)을 적용하여 과대 디렉토리를 `partial`로 표시한다.
2. 원격 마운트에서는 추가로 깊이 제한(3레벨)을 적용해 초기 로드 속도를 확보한다.
3. `not-loaded` 디렉토리를 확장하면 on-demand로 해당 디렉토리의 자식을 로드한다.
4. polling watcher는 child cap 초과 디렉토리를 자동 제외하여 과대 디렉토리의 반복 스캔을 방지한다.

### 4.4 코멘트-LLM 흐름

1. CodeViewer 또는 rendered markdown에서 `Add Comment`로 코멘트를 저장
2. `View Comments`에서 코멘트 조회/편집/삭제/Delete Exported를 수행
3. `Add Global Comments`로 워크스페이스 전역 지시사항을 관리
4. 코드/문서 marker와 hover preview로 코멘트 분포/본문 요약을 확인
5. `View Comments`에서 "Include in export" 체크박스로 Global Comments 포함 여부를 선택
6. `Export Comments`에서 Global Comments 선행 + pending-only line comment bundle을 내보내고 `exportedAt`를 기록

### 4.6 원격 에이전트 워크스페이스 연결 흐름(F27, 📋 Planned)

1. 사용자가 `Connect Remote Workspace`에서 host/user/remote root path를 입력한다.
2. Main 프로세스는 SSH로 원격 agent 세션을 부팅하고 프로토콜 버전을 handshake한다.
3. 연결 성공 시 renderer는 remote workspace 세션을 생성하고 기존 `workspace:index/read/write/watch` 플로우를 동일하게 사용한다.
4. 연결 장애/타임아웃 시 상태를 `degraded` 또는 `disconnected`로 표기하고 재시도 경로를 제공한다.

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
| 원격 워크스페이스 watch mode 정책 | Implemented | F15 |
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
| 코드 에디터 line wrap 토글(기본 On) | Implemented | F24.1 |
| 코드 에디터 히스토리 스크롤 위치 복원 | Implemented | F07.2 |
| Remote Agent Protocol 기반 원격 워크스페이스 실행 | Planned | F27 |

## 6. Open Questions

1. 원격 연결 입력 UX를 모달로 시작할지, 사이드바/별도 패널로 시작할지 확정 필요

결정사항:
1. 원격 agent 자동화는 MVP 수준으로 제한한다(없으면 설치 + 버전 검증).
2. F15(SSHFS 기반) 원격 연결은 폐기하고 F27(remote-protocol) 단일 경로로 전환한다.
