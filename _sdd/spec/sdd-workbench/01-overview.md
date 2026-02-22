# 01. Overview

## 1. 문서 목적

이 문서는 SDD Workbench의 제품 목표, MVP 범위, 사용자 가치 흐름을 빠르게 파악하기 위한 개요 문서다.

## 2. 핵심 목표

1. 스펙(Markdown)과 코드를 동시에 보는 3패널 워크벤치 제공
2. 스펙 문서 링크/선택에서 코드 라인으로 즉시 점프
3. CLI 협업을 위한 컨텍스트 복사 및 외부 툴 연동(Open In) 지원
4. 외부 파일 변경(watcher)을 UI에서 안정적으로 반영
5. 코멘트 수집/내보내기 루프(F11/F11.1)로 LLM 협업 효율화
6. 스펙-코드 왕복 시 rendered 문맥(스크롤 위치) 보존으로 탐색 비용 최소화

## 3. 범위

### 3.1 MVP 포함 범위

- 멀티 워크스페이스 열기/전환/닫기
- 파일 트리 탐색 및 코드 프리뷰
- Markdown raw+rendered 동시 뷰
- spec->code 링크 점프 및 rendered selection source jump
- same-spec source jump 시 rendered spec scroll 유지(런타임)
- 우클릭 기반 컨텍스트 복사
- watcher 기반 changed indicator + collapse 버블링 가시화
- 파일 히스토리 Back/Forward + 입력 바인딩(mouse/swipe/wheel)
- 앱 재시작 시 세션 복원(workspaces/active file/active spec/line resume)
- inline comment + export bundle + incremental export

### 3.2 MVP 제외 범위

- IDE급 편집 기능(리팩터링/LSP/멀티탭)
- 내장 터미널
- Git diff/commit 전용 UI
- 코멘트 협업 동기화/원격 저장
- 코멘트 편집/삭제/스레드 UI

## 4. 주요 사용자 흐름

### 4.1 탐색 흐름

1. 워크스페이스를 추가로 열고(active workspace 선택)
2. 파일 트리에서 코드/스펙 파일을 탐색하며
3. rendered 스펙 링크/선택으로 코드 위치를 왕복 점프한다.

### 4.2 컨텍스트 전달 흐름

1. 코드/트리에서 우클릭으로 상대경로/선택 내용을 복사하고
2. 필요 시 Open In(iTerm/VSCode)로 외부 작업으로 전환한다.

### 4.3 코멘트-LLM 흐름

1. CodeViewer 또는 rendered markdown에서 `Add Comment`로 코멘트를 저장
2. 코드/문서 marker로 코멘트 분포를 확인
3. `Export Comments`에서 pending-only bundle을 내보내고 `exportedAt`를 기록

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

## 6. Open Questions

- 현재 없음 (`2026-02-22`)
