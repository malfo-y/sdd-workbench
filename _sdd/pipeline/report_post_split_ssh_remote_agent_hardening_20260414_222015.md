# Pipeline Report: Post-split SSH / Remote-Agent Hardening

**실행 범위**: feature-draft partial pipeline  
**상태**: completed  
**오케스트레이터**: `_sdd/pipeline/orchestrators/orchestrator_post_split_ssh_remote_agent_hardening.md`  
**로그**: `_sdd/pipeline/log_post_split_ssh_remote_agent_hardening_20260414_222015.md`

## 1. 뭘 했는가

- `feature_draft` 1단계만 실행하여 temporary spec + implementation plan 문서를 생성했다.
- 생성/수정 산출물:
  - `_sdd/pipeline/orchestrators/orchestrator_post_split_ssh_remote_agent_hardening.md`
  - `_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md`
  - `_sdd/pipeline/log_post_split_ssh_remote_agent_hardening_20260414_222015.md`
  - `_sdd/pipeline/report_post_split_ssh_remote_agent_hardening_20260414_222015.md`
- review-fix loop: planning-only partial pipeline이라 미실행
- 테스트/검증: 산출물 구조 검증용 inline validation 수행

## 2. 어떻게 나왔는가

### 결과 요약

- draft 파일 생성 완료
- Part 1 `spec-update-todo` 호환 7섹션 + 마커 포함
- Part 2 implementation plan 섹션 + task별 `Target Files` 포함
- `_sdd/spec/` 직접 수정 없음

### Validation Results

| Check | Result | Notes |
|------|--------|-------|
| draft 파일 존재 | Pass | `_sdd/drafts/2026-04-14_feature_draft_post_split_ssh_remote_agent_hardening.md` 생성 확인 |
| spec-update-todo 마커 | Pass | start/end marker 모두 확인 |
| Part 1 7섹션 | Pass | `Change Summary` ~ `Risks / Open Questions` 확인 |
| Part 2 필수 섹션 | Pass | `Overview` ~ `Open Questions` 확인 |
| Task별 `Target Files` | Pass | H1/H2/H3 각 task에 존재 |
| Delta / Validation ID linkage | Pass | `C1~C4`, `I1~I2`, `V1~V5` 확인 |
| 핵심 delta 반영 | Pass | `ssh-utils.ts`, option/script injection, exit/auth/stderr normalization, write failure surface 모두 반영 |

### 환경/제약 메모

- `_sdd/env.md` 권장 버전은 Node 20.x, 실제 환경은 `v25.2.1` / `npm 11.12.1`
- 이번 단계는 문서 산출이라 실행 리스크는 낮았고, 코드 테스트는 downstream implementation 단계에서 수행하도록 남겼다

## 3. 뭘 더 해야 하는가

- 다음 단계는 이 draft를 입력으로 하는 implementation 실행이다
- 권장 순서:
  1. H1 `ssh-utils.ts` foundation
  2. H2 bootstrap / directory-browser adoption
  3. H3 transport hardening + write failure surface
- implementation 단계에서는 draft의 V1~V5를 기준으로 targeted remote-agent tests, `npm test`, `npm run lint`, review-fix gate를 실제로 닫아야 한다

## 4. Taste Decisions

- SSH destination hardening의 기본 방향은 `ssh --` 호환성에 기대기보다 leading `-` 입력 reject 쪽으로 잡았다
- shared helper ownership은 bootstrap이 아니라 신규 `ssh-utils.ts`로 이동시키는 방향을 기본값으로 택했다
- 이번 범위는 병렬화 가능성이 일부 있어도 helper API stabilization 비용이 더 커서 기본 실행 순서를 순차형으로 잡았다

## 5. 오케스트레이터 경로 및 상태

- orchestrator: `_sdd/pipeline/orchestrators/orchestrator_post_split_ssh_remote_agent_hardening.md`
- status: completed (feature-draft partial pipeline)
- 참고: `_sdd/pipeline/log_post_split_ssh_remote_agent_hardening_20260414_221420.md`는 중단된 이전 시도이며, 이번 실행 결과는 새 log/report에 기록했다

## 6. 스펙 동기화 상태

- global spec sync: not executed
- 이유: 이번 파이프라인은 planning-only partial pipeline이며, 사용자 지시대로 `_sdd/spec/`는 수정하지 않았다
- 후속 구현과 검증이 끝난 뒤에만 `spec_update_done` 또는 별도 spec sync 여부를 판단한다
