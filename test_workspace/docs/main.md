# F05 Manual Test Main

이 문서는 SDD Workbench의 markdown 링크 동작을 수동으로 확인하기 위한 샘플입니다.

## 같은 문서 anchor

- [문서 맵으로 이동](#문서-맵)

## 문서 맵

- [Guide 문서 열기](./guide.md)
- [Python 파일 열기 (line single)](../src/sample.py#L8)
- [Python 파일 열기 (line range)](../src/sample.py#L12-L18)
- [Python 파일 열기 (역순 range 정규화)](../src/sample.py#L24-L20)
- [Python 파일 열기 (hash 없음)](../src/sample.py)
- [존재하지 않는 파일 링크](../src/missing.py#L3)
- [외부 링크](https://example.com)

## 확인 포인트

1. `#L8` 클릭 시 `sample.py`가 열리고 selection이 `L8-L8`이어야 함
2. `#L12-L18` 클릭 시 selection이 `L12-L18`이어야 함
3. `#L24-L20` 클릭 시 selection이 `L20-L24`로 정규화되어야 함
4. `hash 없음` 클릭 시 파일만 열리고 selection은 `none`
5. `존재하지 않는 파일`/`외부 링크` 클릭 시 popover가 보여야 함
