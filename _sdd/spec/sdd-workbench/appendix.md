# Appendix

## A. 기능 이력 (F01~F22)

| Feature | 상태 | 완료일 | 핵심 산출 |
|---|---|---|---|
| F01 | Done | 2026-02-20 | workspace bootstrap + 배너/경로 축약 |
| F02 | Done | 2026-02-20 | 파일 인덱싱 + 트리 렌더 |
| F03 | Done | 2026-02-20 | 코드 뷰어 + 라인 선택 |
| F03.1 | Done | 2026-02-20 | 확장자 색상 코딩(`.py` 포함) |
| F03.5 | Done | 2026-02-20 | 멀티 워크스페이스 기반 |
| F04 | Done | 2026-02-20 | markdown dual view |
| F04.1 | Done | 2026-02-20 | 링크 인터셉트 + copy popover |
| F05 | Done | 2026-02-20 | spec->code line jump |
| F06 | Done | 2026-02-20 | 툴바 복사 정책 고정 |
| F06.1 | Done | 2026-02-21 | 컨텍스트 복사 popover |
| F06.2 | Done | 2026-02-21 | 드래그 선택 + copy UX 통합 |
| F07 | Done | 2026-02-21 | watcher + changed indicator |
| F07.1 | Done | 2026-02-21 | workspace file history navigation |
| F08 | Done | 2026-02-21 | Open In(iTerm/VSCode) |
| F09 | Done | 2026-02-21 | 앱 재시작 세션 복원 |
| F10.1 | Done | 2026-02-21 | rendered selection `Go to Source` |
| F10 | Done | 2026-02-21 | 보안/성능 안정화 |
| F10.2 | Done | 2026-02-21 | code viewer 이미지 프리뷰 |
| F11 | Done | 2026-02-22 | inline comment + export bundle |
| F11.1 | Done | 2026-02-22 | markdown comment entry + marker + incremental export |
| F11.2 | Done | 2026-02-22 | spec jump scroll retention + collapsed marker bubbling |
| F12.1 | Done | 2026-02-22 | code/rendered comment marker hover preview |
| F12.2 | Done | 2026-02-22 | View Comments + edit/delete/Delete Exported |
| F12.3 | Done | 2026-02-22 | Add Global Comments + export prepend order |
| F12.4 | Done | 2026-02-22 | header comments/workspace action compact layout reorder |
| F12.5 | Done | 2026-02-23 | comment feedback auto-dismiss + global 가시성 + header action group clarity |
| F15 | Done | 2026-02-23 | SSHFS 원격 워크스페이스 watch mode(auto/override) + polling fallback |
| F16 | Done | 2026-02-23 | lazy indexing(remote 깊이제한 + child cap 500) + on-demand 디렉토리 확장 + 과대 디렉토리 polling 제외 |
| F17 | Done | 2026-02-23 | View Comments global 포함 체크박스 + Delete Exported 하단 좌측 이동 |
| F18 | Done | 2026-02-23 | Shiki 기반 코드 하이라이팅(PrismJS 제거, 40+ 언어, 비동기 + plaintext fallback) |
| F19 | Done | 2026-02-24 | active file Git diff 라인 마커(added/modified, deleted 제외 MVP) |
| F20 | Done | 2026-02-24 | export pending-only 제한 완화(선택 export 시) + global comments export 카운트 반영 + View Comments target 클릭→코드 점프 |
| F21 | Done | 2026-02-24 | code viewer 텍스트 검색(Ctrl/Cmd+F, substring case-insensitive, 라인 이동 + wrap-around) |
| F22 | Done | 2026-02-24 | Cmd+Shift+Up/Down 워크스페이스 순환 전환(순서 유지 + wrap-around) |

## B. 상세 수용 기준 (요약)

- workspace 선택/전환/닫기/복원 동작
- 파일 트리 탐색 + 우클릭 경로 복사
- 코드 선택(Shift/drag) + copy action 3종
- spec 링크 인터셉트 + line jump
- watcher 기반 변경 반영 + marker 정책
- same-spec source jump에서 rendered spec scroll 문맥 유지
- collapse 트리에서 changed marker 버블링 가시화
- history navigation 입력 바인딩 일관성
- Open In(iTerm/VSCode) 액션
- markdown sanitize/리소스 경계 정책
- 이미지 프리뷰 및 blocked_resource 처리
- comments 저장/관리(edit/delete/Delete Exported) 및 export 대상 선택 정책(기본: pending-only, View Comments 선택 시: 선택 코멘트 모두)
- View Comments target 클릭 시 해당 파일/라인으로 점프 + 모달 자동 닫힘(파일 없음 시 무시)
- global comments 저장/복원 및 export prepend 정책
- export 모달 global comments 포함 시 `N comment(s) + global comments included` 카운트 표시, `_COMMENTS.md` `Total comments (+ global comments)` 표기
- code/rendered marker hover preview(`+N more`, read-only)
- header action 그룹 재배치 + compact/icon-only 정책
- 코멘트 배너 auto-dismiss(5s) + `View Comments`/`Export Comments` global 가시성 명시
- `View Comments` global comments "Include in export" 체크박스 + Delete Exported 하단 좌측 배치
- Shiki 기반 syntax highlight(JS regex 엔진, 40+ 언어 lazy 로드, github-dark 테마, 비동기 + plaintext fallback)
- 원격 마운트(`mount` 명령 기반 네트워크 FS 감지) watcher 모드 자동 판정 + 수동 override + fallback 정책
- 대규모 워크스페이스 lazy indexing(remote 깊이제한 3레벨 + 디렉토리별 child cap 500) + on-demand 확장
- polling watcher child cap 초과 디렉토리 자동 제외
- active file 단건 Git diff 기반 라인 마커(added/modified) + 실패 safe degrade + image/preview unavailable 비표시
- code viewer 텍스트 검색: `Ctrl/Cmd+F` 토글(이미지/preview unavailable 모드 무시), substring case-insensitive 매칭, 매치 라인 `is-search-match`/`is-search-focus` 하이라이트, 이전/다음 이동(버튼 + Enter/Shift+Enter) + wrap-around, `N / M` 카운트 + `No results` 표시, Escape/닫기로 하이라이트 해제, 파일 변경 시 검색 상태 자동 초기화
- 워크스페이스 키보드 전환: `Cmd+Shift+Up`(이전)/`Cmd+Shift+Down`(다음) 순서 유지 순환, 워크스페이스 1개일 때 무동작, 드롭다운 전환은 기존 MRU 동작 유지

## C. 리스크/백로그

1. activeHeading/TOC active 추적은 미지원(스크롤 위치 복원과 별개)
2. non-line hash heading jump 정밀화는 backlog
3. watcher 튜닝(대규모 repo 이벤트 편차) 여지
4. wheel fallback 임계값 튜닝 필요 가능성
5. source line mapping은 line-level best-effort 한계 존재
6. 코멘트 relocation(AST/semantic)은 미지원
7. marker 상세 패널/코멘트 스레드 UI 미지원
8. incremental export reset/re-export-all UX 미지원
9. global comments 버전 이력/다중 문서 분류는 미지원
10. rendered spec scroll position의 앱 재시작 복원은 미지원(런타임 복원만 지원)
11. hover preview 지연값/표시 개수 사용자 설정은 미지원
12. remote mount 감지는 `mount` 명령 파싱 기반이며 Windows/Linux 고급 탐지는 미지원
13. lazy-loaded 디렉토리는 browse-only이며 watcher 범위에 포함되지 않음
14. on-demand 로드 후 구조 변경 re-index 시 lazy-loaded 디렉토리는 `not-loaded`로 리셋됨
15. Git deleted-only 라인(빨강) 마커는 MVP 범위에서 미지원

## D. 이동/정리 내역 (이번 리라이트)

- `main.md`에 있던 대형 섹션(아키텍처/컴포넌트/IPC/운영/이력)을 주제별 하위 문서로 분리
- 상세 기능 이력/리스크는 Appendix로 이동
- 인덱스는 링크 허브 + 상태 요약 중심으로 축소

## E. 참조 문서

- 결정 로그: `/_sdd/spec/DECISION_LOG.md`
- 리라이트 리포트: `/_sdd/spec/REWRITE_REPORT.md`
- 이전 원본 백업: `/_sdd/spec/prev/`
