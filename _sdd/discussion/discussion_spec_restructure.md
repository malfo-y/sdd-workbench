# 토론 요약: 스펙 Restructure 방안

**날짜**: 2026-03-12
**라운드 수**: 4
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)

1. **구조 유형**: sdd-workbench/ 플래튼 vs 완전 재구성 vs decision-log 정리만
2. **컴포넌트 디렉토리 형태**: 컴포넌트별 서브디렉토리 vs 플랫 파일 vs 하이브리드
3. **main.md 통합 범위**: 전체 통합 (~990줄) vs 선별 통합 (~400줄) vs 최소 통합
4. **IPC contracts 처리**: cross-cutting 계약의 컴포넌트별 분할 vs 루트 유지
5. **decision-log 압축**: 아카이브 분리 vs 현행 유지 vs 전체 압축
6. **외부 참조 깨짐**: 일괄 수정 vs 무시 vs 리다이렉트 맵

## 결정 사항 (Decisions Made)

| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | 완전 재구성: 컴포넌트 디렉토리 구조 채택 | domains/contracts 분리를 없애고 컴포넌트별 overview.md + contracts.md 통합 | 1, 2 |
| 2 | 선별 통합: overview+arch+component-map+contract-map → main.md (~400줄) | 핵심 진입점 하나로 파악. code-map/feature-index/ops는 루트 파일 유지 | 3 |
| 3 | IPC contracts 컴포넌트별 분할 | 167줄 cross-cutting 계약을 workspace-and-file-tree/contracts.md와 remote-workspace/contracts.md로 분배 | 4 |
| 4 | decision-log 전체 압축 | 구현완료 엔트리(31개)를 요약 테이블 한 줄씩으로 압축, 정책/구조 결정만 전문 유지 | 5 |
| 5 | 외부 참조 무시 | drafts/(42개)와 implementation/(69개)는 완료된 이력 문서라 경로 깨져도 실해 없음 | 6 |

## 실행 항목 (Action Items)

| # | 항목 | 우선순위 | 비고 |
|---|------|---------|------|
| 1 | spec-rewrite 스킬로 restructure 실행 | High | 아래 목표 구조대로 실행 |

## 목표 구조

```
_sdd/spec/
├── main.md (~400줄, 목표+아키텍처+컴포넌트맵+계약맵 통합)
├── code-map.md
├── feature-index.md
├── operations.md
├── code-editor/
│   ├── overview.md      (← domains/code-editor.md)
│   └── contracts.md     (← contracts/state-model.md)
├── spec-viewer/
│   ├── overview.md      (← domains/spec-viewer.md)
│   └── contracts.md     (← contracts/navigation-rules.md + search-rules.md 병합)
├── workspace-and-file-tree/
│   ├── overview.md      (← domains/workspace-and-file-tree.md)
│   └── contracts.md     (← ipc-contracts.md 중 workspace/file 부분)
├── comments-and-export/
│   ├── overview.md      (← domains/comments-and-export.md)
│   └── contracts.md     (← contracts/comment-contracts.md)
├── appearance-and-navigation/
│   ├── overview.md      (← domains/appearance-and-navigation.md)
│   └── contracts.md     (← contracts/theme-and-menu-contracts.md)
├── remote-workspace/
│   ├── overview.md      (← domains/remote-workspace.md)
│   └── contracts.md     (← ipc-contracts.md 중 remote 부분)
├── appendix/
│   ├── detailed-acceptance.md
│   ├── backlog-and-risks.md
│   ├── glossary.md
│   └── feature-history.md
├── decision-log.md      (압축본)
└── summary.md
```

## 파일 매핑 상세

### main.md에 통합되는 파일 (삭제 대상)
- `sdd-workbench/product-overview.md` (190줄) → main.md 목표/범위 섹션
- `sdd-workbench/system-architecture.md` (163줄) → main.md 아키텍처 섹션
- `sdd-workbench/component-map.md` (45줄) → main.md 컴포넌트 인덱스
- `sdd-workbench/contract-map.md` (44줄) → main.md 계약 인덱스 (또는 컴포넌트별로 흡수되어 불필요)

### 루트로 올라가는 파일 (이름 변경 가능)
- `sdd-workbench/code-map.md` → `code-map.md`
- `sdd-workbench/feature-index.md` → `feature-index.md`
- `sdd-workbench/operations-and-validation.md` → `operations.md`

### 컴포넌트 디렉토리로 이동하는 파일
- `sdd-workbench/domains/*.md` → `<component>/overview.md`
- `sdd-workbench/contracts/*.md` → `<component>/contracts.md`
- `sdd-workbench/contracts/ipc-contracts.md` → 분할하여 workspace-and-file-tree/ + remote-workspace/

### 그대로 유지
- `appendix/` (sdd-workbench/appendix/ → appendix/)
- `decision-log.md` (압축 후 유지)
- `summary.md`

## 리스크

- **외부 참조 깨짐**: drafts/implementation/ 파일의 스펙 경로가 깨지지만, 완료된 이력이므로 무시
- **main.md 크기**: ~400줄은 관리 가능하나, 추후 비대해질 수 있음 → 주기적 리뷰 필요
- **IPC 분할 경계**: workspace vs remote IPC 구분이 애매한 케이스 존재 가능

## 토론 흐름 (Discussion Flow)

Round 1: 핵심 동기 → "완전 재구성" 결정
Round 2: 구조 형태 → "컴포넌트 디렉토리" (overview.md + contracts.md per component)
Round 3: 통합 범위 → "선별 통합" (main.md ~400줄), IPC → "컴포넌트별 분할"
Round 4: decision-log → "전체 압축", 외부 참조 → "무시"
