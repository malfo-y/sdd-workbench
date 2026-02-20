# IMPLEMENTATION_REPORT

## 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F04)
- Completed:
  - Markdown renderer 도입 (`react-markdown`, `remark-gfm`, `rehype-slug`)
  - heading 추출 유틸 및 TOC anchor 생성 규칙 추가 (`markdown-utils.ts`)
  - `WorkspaceSession.activeSpec` 필드 도입 및 워크스페이스별 분리 유지
  - `.md` 선택 시 `activeSpec` 갱신 로직 반영
  - 우측 `SpecViewerPanel` 구현 (rendered + TOC + 상태별 안내)
  - App 우측 placeholder 제거 후 dual view 통합(center raw + right rendered)
  - F04 단위/통합 테스트 추가 및 전체 회귀 통과
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

## 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

## 3) Cross-Phase Findings

- F03.5 멀티 워크스페이스 구조를 유지한 채 `activeSpec`가 workspace session 필드로 확장됨.
- `.md` 선택 시 center(raw)와 right(rendered)가 동시 동작함.
- 워크스페이스 전환 시 spec path가 세션별로 분리 복원되어 섞이지 않음.
- TOC/스크롤/active heading 복원은 의도적으로 제외되어 F04 스코프를 유지함.

## 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | `activeSpec`가 선택된 상태에서 non-md 파일 선택 시 rendered 패널은 refresh 안내를 표시함(세부 UX는 후속 결정 가능) | backlog |
| Improvement | markdown sanitize 강화는 F10 범위로 남아 있음 | backlog |

## 5) Recommendations

1. 사용자 수동 스모크로 markdown 렌더와 workspace 전환 UX 최종 확인
2. F05 구현 시 TOC anchor/링크 인터셉트 규칙을 동일 slug 규칙으로 연결
3. F04 검증 완료 후 `spec-update-done`으로 상태 동기화

## 6) Final Conclusion

- `READY`
- Reason: F04 계획 태스크(T1~T6)를 모두 완료했고 자동 테스트/린트/빌드 품질 게이트를 통과함.

---

## F04.1 Addendum (2026-02-20)

### 1) Progress Summary

- Plan source: `/_sdd/drafts/feature_draft_f04_1_markdown_link_intercept_copy_popover.md` (Part 2)
- Completed:
  - markdown 링크 인터셉트(`preventDefault`) 및 anchor 예외 처리
  - 링크 해석 유틸 (`resolveSpecLink`) 추가
  - 외부/해석 실패 링크용 copy popover UI 추가
  - same-workspace 링크의 `selectFile` 연동
  - 실패/외부 링크용 banner 피드백 연동
  - resolver/unit + panel + app 통합 테스트 추가/확장
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- markdown 링크 클릭 시 renderer 이동/리로드 경로를 차단해 워크스페이스 상태가 유지된다.
- same-workspace 상대 링크는 active workspace 파일 집합 기준으로만 열리며 cross-workspace 탐색은 하지 않는다.
- external/unresolved 링크는 이동 대신 popover 복사 액션으로 처리되어 안전성이 올라갔다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | 외부 링크를 시스템 브라우저로 여는 UX는 MVP 범위 밖이라 미지원 | backlog |
| Improvement | line jump (`#Lx`, `#Lx-Ly`)는 F05 범위로 이월 | backlog |

### 5) Final Conclusion (F04.1)

- `READY`
- Reason: F04.1 계획 태스크(1~7) 완료 + 자동 테스트/린트/빌드 게이트 통과.

---

## F05 Addendum (2026-02-20)

### 1) Progress Summary

- Plan source: `/_sdd/implementation/IMPLEMENTATION_PLAN.md` (F05)
- Completed:
  - `resolveSpecLink`에 `#Lx`, `#Lx-Ly` 라인 범위 파싱 추가
  - SpecViewer 링크 콜백에 `lineRange` 전달 계약 추가
  - App에서 same-workspace 링크 열기 + `selectionRange` + jump request 오케스트레이션 추가
  - CodeViewer에서 jump request 기반 `scrollIntoView` best-effort 점프 추가
  - parser/panel/codeviewer/app 테스트 확장
  - Verification: `npm test`, `npm run lint`, `npm run build` pass

### 2) Phase Review Summary

- Phase 1: proceed
- Phase 2: proceed
- Phase 3: proceed

### 3) Cross-Phase Findings

- rendered markdown 링크의 `#Lx/#Lx-Ly`가 active workspace 기준으로 일관 동작한다.
- line hash가 없는 링크는 기존과 동일하게 파일 열기만 수행한다.
- external/unresolved 링크 popover 정책(F04.1)은 회귀 없이 유지된다.
- multi-workspace 전환 후에도 line jump는 현재 active workspace 세션을 기준으로 적용된다.

### 4) Issue Table (Severity / Status)

| Severity | Issue | Status |
|----------|-------|--------|
| Improvement | `path#heading` 파일 링크의 heading 위치 스크롤은 미지원(F09 범위) | backlog |
| Improvement | `scrollIntoView` 정밀 제어(애니메이션/컨테이너 옵션)는 MVP 범위 밖 | backlog |

### 5) Final Conclusion (F05)

- `READY`
- Reason: F05 계획 태스크(T1~T8)를 완료했고 자동 테스트/린트/빌드 게이트를 통과함.
