# 토론 요약: preview 파일 크기 제한 상향

**날짜**: 2026-03-20
**라운드 수**: 1
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)

1. **현재 2MB 제한은 꽤 보수적이다**: 실사용에서 markdown/spec 문서가 2MB를 넘는 경우가 간헐적으로 생길 수 있어 preview unavailable 빈도가 체감될 수 있다.
2. **이 제한은 markdown 전용이 아니다**: 현재 구현은 `workspace:readFile` 단계에서 파일 크기를 검사하므로, code preview/markdown preview/image preview 진입 가드 전반에 영향을 준다.
3. **상향은 UX 개선이지만 렌더 비용 증가를 동반한다**: 제한을 높이면 더 큰 파일이 renderer까지 들어오므로 메모리 사용량과 렌더 시간 리스크가 함께 커진다.
4. **정책 일관성이 중요하다**: 현재 스펙, 드래프트, 테스트, 사용자 메시지가 모두 `2MB`를 전제로 맞물려 있어 값만 바꾸지 말고 관련 문구/검증을 함께 업데이트해야 한다.

## 결정 사항 (Decisions Made)

| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | preview 파일 크기 제한을 `10MB`로 상향하는 방향으로 간다 | 2MB는 다소 보수적이고, 큰 문서 preview 불편을 줄이는 것이 우선이다 | 현재 제한, UX |
| 2 | 변경 범위는 단순 문구 수정이 아니라 preview guard 정책 전체로 본다 | `workspace:readFile` 가드가 공통 진입점이기 때문이다 | 정책 범위 |
| 3 | 구현 시 관련 테스트와 사용자 노출 문구를 함께 갱신한다 | 스펙/테스트/메시지 불일치를 방지해야 한다 | 정책 일관성 |

## 미결 질문 (Open Questions)

- [ ] `10MB` 상향만으로 충분한지, 이후 라인 수 기반/렌더 시간 기반 보조 가드가 필요한지
- [ ] 이미지 preview도 동일 상한을 계속 공유할지, 텍스트/이미지를 분리된 정책으로 가져갈지
- [ ] 원격 워크스페이스에서 큰 파일 read latency가 늘어날 때 별도 UX 힌트가 필요한지

## 실행 항목 (Action Items)

| # | 항목 | 우선순위 |
|---|------|---------|
| 1 | preview size 상수 정의 위치 확인 후 `10MB`로 상향 | High |
| 2 | 사용자 메시지(`Preview unavailable: file exceeds ...`)와 spec preview 메시지 동기화 | High |
| 3 | 관련 단위/통합 테스트의 기대값 갱신 | High |
| 4 | `_sdd/spec` 및 운영 제약 문서의 수치 갱신 여부 검토 | Medium |

## 리서치 결과 요약 (Research Findings)

- `electron/main.ts`의 `workspace:readFile` 경로에서 파일 크기가 `MAX_FILE_PREVIEW_BYTES`를 넘으면 `previewUnavailableReason: 'file_too_large'`를 반환한다.
- `src/code-editor/code-editor-panel.tsx`와 `src/workspace/workspace-context.tsx`는 각각 사용자 메시지로 `2MB limit`를 직접 노출한다.
- `_sdd/spec/main.md`, `_sdd/spec/operations.md`, `_sdd/spec/decision-log.md`, 여러 feature draft가 모두 `2MB`를 current policy로 기록하고 있다.
- 기존 테스트에도 `2MB` 문구와 `file_too_large` 시나리오가 존재해, 정책 변경 시 함께 수정해야 한다.

## 토론 흐름 (Discussion Flow)

Round 1: `2MB`, `5MB`, `10MB` 중 방향 결정 -> `10MB`로 상향

## Sources

- `electron/main.ts`
- `src/code-editor/code-editor-panel.tsx`
- `src/workspace/workspace-context.tsx`
- `_sdd/spec/main.md`
- `_sdd/spec/operations.md`
- `_sdd/spec/decision-log.md`
- `src/App.test.tsx`
