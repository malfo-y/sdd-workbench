# Glossary

## 용어집

- `active file`
  - 현재 코드/스펙 패널이 대상으로 삼는 파일
- `active spec`
  - rendered markdown으로 표시 중인 `.md` 파일
- `changed marker`
  - watcher 기반 변경 감지를 나타내는 트리 점(`●`)
- `git line marker`
  - active file diff 결과를 line 단위로 표시하는 added/modified 마커
- `git file status badge`
  - 파일 트리에서 보이는 `U`, `M` 뱃지
- `line fallback`
  - exact mapping에 실패했을 때 nearest line/block으로 안전하게 degrade 하는 경로
- `exact offset`
  - same-file raw markdown 기준 0-based half-open 문자 범위
- `navigation highlight`
  - explicit jump 뒤에 잠깐 보이는 line/block 강조
- `renderer authoritative`
  - Main process가 아니라 renderer state를 source of truth로 보는 구조
- `partial directory`
  - child cap 때문에 전체 자식이 한 번에 로드되지 않은 디렉토리
- `not-loaded directory`
  - lazy expand 전이라 자식을 아직 읽지 않은 디렉토리
- `global comments`
  - 특정 라인에 묶이지 않는 워크스페이스 단위 메모
