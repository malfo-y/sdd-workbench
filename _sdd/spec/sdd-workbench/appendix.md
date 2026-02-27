# Appendix

## A. 기능 이력 (F01~F26)

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
| F23 | Done | 2026-02-24 | 2패널 탭 레이아웃(3패널→2패널, Code/Spec 탭 전환, 워크스페이스 관리 사이드바 이동, 리사이저 1개, Cmd+Shift+Left/Right 탭 전환) |
| F24 | Done | 2026-02-25 | CodeMirror 6 기반 코드 에디터(read-only→editable, CM6 검색, Cmd+S 저장, dirty 관리, unsaved guard, Git/Comment gutter extension, 레거시 code-viewer 정리) |
| F25 | Done | 2026-02-25 | 파일 트리 CRUD(파일/디렉토리 생성·삭제, 우클릭 컨텍스트 메뉴, 인라인 이름 입력, confirm dialog, active file 삭제 상태 초기화, watcher 자동 트리 갱신) |
| BUG-01 | Fixed | 2026-02-25 | Go to Source — 스펙 뷰에서 호출 시 Code 탭으로 전환되지 않던 버그 수정 (`openSpecRelativePath` 후 `setActiveTab('code')` 순서 수정) |
| F25b | Done | 2026-02-25 | 파일/디렉토리 Rename: 코멘트 보호 방식(코멘트 있는 대상 rename 차단), 인라인 입력 rename 모드(현재 이름 pre-fill), dirty 파일 rename 거부, active file 경로 갱신(직접 rename + 디렉토리 하위 prefix 치환) |
| F26 | Done | 2026-02-25 | 파일 트리 Git 파일 상태 마커: `git status --porcelain` 기반 U(Untracked/Added, 초록)/M(Modified, 주황) 뱃지, 디렉토리 접힘 시 하위 상태 버블링(priority: modified > added/untracked), workspace open/watcher/save 시 재조회 |
| BUG-02 | Fixed | 2026-02-25 | Copy Relative Path — 코드 에디터 우클릭 시 라인 번호가 복사되지 않던 버그 수정 (`contextMenuState.selectionRange` 전달 + `buildCopyActiveFilePathPayload` 확장) |
| F24.1 | Done | 2026-02-27 | 코드 에디터 line wrap 토글 버튼(헤더 Wrap On/Off, `wrapCompartment` 기반 동적 전환, 기본 On) |
| F07.2 | Done | 2026-02-27 | 코드 에디터 히스토리 스크롤 위치 복원: Back/Forward 시 픽셀 스크롤 복원(`codeScrollPositionsRef`, `onScrollChange`/`restoredScrollTop` prop, rAF 기반 적용) |

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
- 2패널 탭 레이아웃: 3패널(사이드바/코드/스펙)→2패널(사이드바 + 탭 콘텐츠), Code/Spec 탭 클릭 전환, 탭 전환 시 스크롤 위치 유지(`display: none` 비활성 탭 보존), `.md` 파일→Spec 탭/그 외→Code 탭 자동 전환, spec 점프/Go to Source/코멘트 점프→Code 탭 자동 전환, 워크스페이스 관리(선택기/Open/Close) 사이드바 상단 배치, 리사이저 1개(사이드바 ↔ 콘텐츠), `Cmd+Shift+Left/Right` 탭 키보드 전환, `PaneSizes = { left, content }` 단순화
- (F24) CM6 코드 에디터: CM6 기반 코드 뷰어가 기존 CodeViewerPanel의 모든 기능 대체, 다크 테마(github-dark 유사) CM6 theme extension 구현, `@codemirror/search`가 기존 F21 커스텀 검색 대체, `workspace:writeFile` IPC(atomic write + 경계 검사), Cmd+S 수동 저장, dirty 인디케이터 + unsaved changes guard, dirty 파일 외부 변경 시 auto-reload 건너뛰기 + 배너, Git line marker/Comment badge gutter CM6 extension 동작, 우클릭 컨텍스트 메뉴(Copy/Add Comment) CM6 통합
- (F25) 파일 트리 CRUD: 파일/디렉토리 우클릭 → 생성(인라인 입력 Enter/Escape) + 삭제(confirm dialog), 빈 영역 우클릭 → root level 생성, active file 삭제 시 상태 초기화, dirty file 삭제 시 unsaved confirm 우선, watcher 자동 트리 갱신, orphaned comment 허용(MVP)
- (BUG-01) Go to Source 탭 전환 수정: `goToActiveSpecSourceLine`에서 `setActiveTab('code')` 순서를 `openSpecRelativePath` 이후로 이동
- (F25b) 파일/디렉토리 Rename: 우클릭 "Rename" → 인라인 입력(현재 이름 pre-fill) + Enter/Escape, 코멘트 보호(`comments.some` 기반 대상/하위 검사 → 차단 + 에러 배너), dirty 파일 rename 거부, active file 경로 갱신(직접 rename + 디렉토리 prefix 치환), 빈 영역 메뉴에 Rename 미표시
- (F26) 파일 트리 Git 파일 상태 마커: `git status --porcelain` → U(untracked/added, 초록 `#73c991`)/M(modified, 주황 `#e2c08d`) badge 렌더, 디렉토리 접힘 시 `buildGitStatusSubtreeMap` 버블링(modified > added/untracked), 디렉토리 확장 시 badge 숨김, git 비저장소 → badge 미표시, watcher/save 시점 재조회 + request ID stale 방지
- (BUG-02) Copy Relative Path 라인 번호 포함: 코드 에디터 우클릭 컨텍스트 메뉴에서 `selectionRange` 전달 → 단일 라인 `path:LN`, 다중 선택 `path:LN-LM` 형식
- (F24.1) 코드 에디터 line wrap 토글: 헤더에 "Wrap On/Off" 버튼, 기본 On, 클릭으로 동적 전환(`wrapCompartment.reconfigure`), `aria-pressed` 반영, 가로 스크롤 방지로 트랙패드 wheel 히스토리 내비게이션 안정화
- (F07.2) 코드 에디터 히스토리 스크롤 위치 복원: Back/Forward 이동 후 해당 파일의 마지막 픽셀 스크롤 위치를 복원; 저장: `view.scrollDOM` native scroll 이벤트 → `codeScrollPositionsRef[workspaceId::relativePath]`; 복원: 콘텐츠 재로드(`view.setState`) 직후 `requestAnimationFrame`으로 `scrollDOM.scrollTop` 적용; 첫 방문 시 복원 없음(scrollTop=0 유지)

## C. 리스크/백로그

1. activeHeading/TOC active 추적은 미지원(스크롤 위치 복원과 별개)
2. non-line hash heading jump 정밀화는 backlog
3. watcher 튜닝(대규모 repo 이벤트 편차) 여지
4. **[Known Issue] 트랙패드 스와이프 파일 히스토리 내비게이션 미지원** — wheel 이벤트 기반 구현 시 CodeMirror `.cm-scroller`의 가로 스크롤과 제스처 공간 충돌로 신뢰 가능한 UX 달성 불가. Electron `win.on('swipe', ...)` (3-finger)는 3-finger drag를 다른 용도로 쓰는 경우 사용 불가. 현재 대안: **line wrap 기본 On**(가로 스크롤 제거), 키보드 단축키 / 헤더 버튼 / 마우스 사이드버튼(button 3/4)으로 내비게이션. 근본 해결은 macOS rubber-band overscroll API 또는 별도 제스처 영역 필요(백로그).
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
16. (F24) CM6 번들 크기 증가 리스크 — 언어 패키지 lazy import + tree shaking으로 완화 (구현 시 적용 완료)
17. (F24) CM6 jsdom 테스트 호환성 — extension 로직을 순수 함수로 분리해 단위 테스트 가능하게 (구현 시 적용 완료)
18. (F24) dirty 상태에서 watcher race condition — dirty 체크를 watcher handler 내 동기적 수행(ref) (구현 시 적용 완료)
19. (F24) auto-save, auto-format, LSP, minimap, multi-cursor 커스텀은 F24 범위 밖
20. (F25b) rename 시 코멘트 보호는 전면 차단 방식이며, 코멘트 경로 마이그레이션(자동 rename) 기능은 미지원
21. (F25b) rename 대상이 디렉토리일 때 하위 파일 중 하나라도 코멘트가 있으면 전체 차단 — 세분화된 보호(일부만 차단)는 미지원
22. (F26) Git 파일 상태는 `git status --porcelain` 기반이므로 staged/unstaged 세분화 미지원(MVP)
23. (F26) git 비저장소 워크스페이스에서는 badge 전체 미표시

## D. 이동/정리 내역 (이번 리라이트)

- `main.md`에 있던 대형 섹션(아키텍처/컴포넌트/IPC/운영/이력)을 주제별 하위 문서로 분리
- 상세 기능 이력/리스크는 Appendix로 이동
- 인덱스는 링크 허브 + 상태 요약 중심으로 축소

## E. 참조 문서

- 결정 로그: `/_sdd/spec/DECISION_LOG.md`
- 리라이트 리포트: `/_sdd/spec/REWRITE_REPORT.md`
- 이전 원본 백업: `/_sdd/spec/prev/`
