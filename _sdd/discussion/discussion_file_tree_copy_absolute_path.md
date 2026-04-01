# 토론 요약: 파일 브라우저 Copy Full Path 추가

**날짜**: 2026-03-20
**라운드 수**: 2
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)

1. **실사용 빈도는 낮지만 필요성은 분명함**: full path는 상시 사용 액션은 아니지만, 외부 도구 연동이나 터미널/OS 레벨 작업 시 간헐적으로 필요하다.
2. **현재 메뉴 구조와의 적합성**: 이미 `Copy Relative Path`와 파일 복사 `Copy`가 공존하므로, 경로 복사 계열 액션을 한 곳에 모으는 방향은 자연스럽다.
3. **발견성 vs 메뉴 길이**: 이 기능은 “가끔 필요할 때 바로 보여야” 가치가 크므로, 숨겨진 보조 액션보다 1차 메뉴 노출이 더 적합하다.
4. **원격 워크스페이스 의미 충돌**: 현재 `rootPath`는 원격에서 `remote://workspace-id` 같은 synthetic identifier일 수 있어, 이를 그대로 absolute path로 복사하면 사용자 기대와 어긋난다.
5. **명명은 absolute보다 full이 안전함**: 로컬/원격 모두에서 일관된 의미를 유지하려면 `Copy Absolute Path`보다 `Copy Full Path`가 더 자연스럽다.

## 결정 사항 (Decisions Made)

| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | 파일 브라우저 컨텍스트 메뉴에 `Copy Full Path`를 추가한다 | 간헐적이지만 실사용 가치가 있고, `Copy Relative Path` 바로 아래가 가장 예측 가능하다 | 필요성, 발견성 |
| 2 | 기본 노출 위치는 `Copy Relative Path` 바로 아래로 둔다 | 별도 서브메뉴/숨김 처리보다 사용자가 찾기 쉽고 학습 비용이 낮다 | 메뉴 구조 |
| 3 | 원격 워크스페이스에서는 synthetic `rootPath`를 그대로 쓰지 않는다 | `remote://...` 값은 사용자가 기대하는 “실제 경로”가 아니므로 오해를 만든다 | 원격 의미 충돌 |
| 4 | 원격에서는 `remote://...` 접두어 없이 실제 디렉토리 경로만 복사한다 | 사용자는 내부 workspace identifier가 아니라 remote filesystem 경로를 기대한다 | 명명, 원격 의미 |

## 미결 질문 (Open Questions)

- [ ] 원격 full path를 `remoteProfile.remoteRoot + relativePath`로 단순 조합할지, 홈 축약(`~`) 보존 등 표시 규칙을 둘지
- [ ] 코드 에디터/스펙 뷰어의 기존 `Copy Relative Path` 계열 액션에도 동일 옵션을 확장할지

## 실행 항목 (Action Items)

| # | 항목 | 우선순위 |
|---|------|---------|
| 1 | 파일 트리 컨텍스트 메뉴에 `Copy Full Path` 액션 추가 | High |
| 2 | 로컬 워크스페이스 기준 full path payload 생성 규칙 정의 (`rootPath + relativePath`) | High |
| 3 | 원격 워크스페이스 full path 조합 규칙 정의 (`remoteRoot + relativePath`, `remote://` 제외) | High |
| 4 | 메뉴/클립보드 관련 테스트에 full path 시나리오 추가 | Medium |

## 리서치 결과 요약 (Research Findings)

- 파일 트리 컨텍스트 메뉴는 현재 `Copy Relative Path`, `Copy`, `Paste`, 생성/이름변경/삭제 순으로 구성되어 있다.
- `Copy Relative Path`는 renderer에서 `navigator.clipboard.writeText()`로 바로 복사하며, 별도 OS 통합 없이 텍스트 payload를 생성한다.
- `FileTreePanel`은 `rootPath`를 받지만, 이 값은 원격 워크스페이스에서 실제 파일시스템 경로가 아니라 `remote://workspace-id` 형태일 수 있다.
- 앱은 별도로 `remoteProfile.remoteRoot`를 UI 표시용으로 관리하고 있어, 원격 full path가 필요하면 이 메타데이터를 활용하는 쪽이 더 정확하다.

## 토론 흐름 (Discussion Flow)

Round 1: path 계열 액션을 1차 메뉴에 둘지 결정 -> `Copy Relative Path` 바로 아래에 직접 추가
Round 2: 명명/원격 표시 규칙 결정 -> `Copy Full Path`, 원격은 `remote://...` 없이 실제 디렉토리 경로만 복사

## Sources

- `src/file-tree/file-tree-panel.tsx`
- `src/App.tsx`
- `_sdd/spec/workspace-and-file-tree/overview.md`
- `_sdd/discussion/discussion_file_clipboard_copy_paste.md`
- `electron/workspace-backend/backend-router.ts`
- `electron/system-open.test.ts`
