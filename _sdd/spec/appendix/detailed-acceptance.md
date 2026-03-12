# Detailed Acceptance

## 목적

이 문서는 허브 문서에서 제거한 상세 수용 기준을 영역별로 보관한다. 구현 전 범위를 자르거나 회귀 테스트 후보를 찾을 때 사용한다.

## 1. Workspace / File Tree

- workspace 선택/전환/닫기/복원 동작
- 파일 트리 탐색 + 우클릭 경로 복사
- watcher 기반 변경 반영 + marker 정책
- collapse 트리에서 changed marker 버블링 가시화
- 대규모 워크스페이스 lazy indexing(node cap `100000` + child cap `500`) + on-demand 확장
- local polling watcher child cap 초과 디렉토리 자동 제외
- 파일 트리 CRUD / rename / git status badge 동작

## 2. Code / Spec Navigation

- spec 링크 인터셉트 + line jump
- same-spec source jump에서 rendered spec scroll 문맥 유지
- history navigation 입력 바인딩 일관성
- `Go to Source`, `Go to Spec`, explicit line jump의 temporary highlight
- code editor 히스토리 스크롤 복원

## 3. Comments / Export

- comments 저장/관리(edit/delete/Delete Exported) 정책
- View Comments target 클릭 시 해당 파일/라인으로 점프 + 모달 자동 닫힘
- global comments 저장/복원 및 export prepend 정책
- export 모달 global comments 포함 카운트 표기
- code/rendered marker hover preview(`+N more`, read-only)
- 코멘트 액션 배너 auto-dismiss(5s)

## 4. Search / Mapping

- code editor 검색: CM6 search 기반 동작
- 파일 브라우저 검색: local/remote 공통 backend 탐색, cap/time guard, partial hint
- spec 검색: raw markdown -> rendered block 매핑, `Cmd/Ctrl+F`, wrap-around
- wildcard `*` ordered token match + wildcard-only empty 처리
- line-level anchor 정밀도 개선과 exact offset mapping 경로

## 5. Remote Workspace

- Remote Agent Protocol 기반 연결/파일 I/O/감시/git/comments 메타데이터
- browse 후 `remoteRoot` 선택
- bootstrap MVP 범위(배포 + healthcheck + 버전 검증)
- remote watcher 정책(상한/심링크 추적/폴백 배너)

## 6. Appearance / Theming

- `dark-gray` / `light` theme 전환
- pre-paint root bootstrap
- storage failure safe fallback
- Shiki highlighter retry-safe cache
- Electron native `View > Theme` 메뉴와 renderer authoritative sync
