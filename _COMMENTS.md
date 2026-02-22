# _COMMENTS

Generated at: 2026-02-22T02:25:36.231Z
Total comments: 6

### _sdd/spec/main.md:L795-L795

스펙에서 코드로 점프할 때 오른쪽 마크다운이 다시 렌더되면서 맨 처음으로 넘어가는데 스펙에서 코드로 넘어갈 땐 마크다운 렌더링을 다시 안 하거나, 해당 라인이 계속 보이게 해야 할 것 같아.

- anchor.hash: f37f6d56
- anchor.snippet: #### F05. Spec -> Code 링크 점프 (P0, 크기 M)
- createdAt: 2026-02-22T02:25:17.042Z

---

### _sdd/spec/main.md:L908-L908

트리 내 변경 마커가 해당 파일에만 붙고 만약 파일이 collapse 되어서 파일 브라우저에 보이지 않으면 확인이 안 되는데, collapse 되어 있으면 해당 상위 디렉토리에 마커가 붙게 수정 가능할까?

- anchor.hash: b5b97c58
- anchor.snippet:   - 트리 내 변경 표시(`●`)
- anchor.before:   - workspace 단위 debounce + `changedFiles` 관리
- anchor.after:   - watch 이벤트에 active file이 포함되면 코드 뷰어 본문 자동 재로딩
- createdAt: 2026-02-22T01:51:53.487Z

---

### _sdd/spec/main.md:L908-L908

이거 지금 파일이 디렉토리 안에 숨겨져 있으면 마커가 안 보이는데, 만약 숨겨져 있으면 이걸 포함한 보이는 디렉토리에 마커가 대신 뜨게도 할 수 있어? 그걸 열면 이제 해당 파일에만 마커가 뜨고, 만약 여러 디렉토리 안에 숨겨져 있으면 그 파일을 포함한 보이는 최하단 디렉토리에 마커가 뜨게 하고.

- anchor.hash: b5b97c58
- anchor.snippet:   - 트리 내 변경 표시(`●`)
- anchor.before:   - workspace 단위 debounce + `changedFiles` 관리
- anchor.after:   - watch 이벤트에 active file이 포함되면 코드 뷰어 본문 자동 재로딩
- createdAt: 2026-02-22T02:23:47.880Z

---

### _sdd/spec/main.md:L1079-L1079

마크다운 렌더러에서도 바로 코멘트를 달 수 있게 수정할 수 있을까? 마크다운 렌더러에서 우클릭 하고 코멘트 달면 해당 라인의 소스코드에 코멘트가 달리게.

- anchor.hash: 494f23b2
- anchor.snippet: #### F11. 인라인 코드 코멘트 + LLM Export Bundle (P1, 크기 M)
- createdAt: 2026-02-22T01:36:13.727Z

---

### _sdd/spec/main.md:L1079-L1079

코멘트가 달린 라인은 코드 뷰어의 라인 넘버 왼쪽이나 오른쪽에 코멘트가 달렸다는 표시를 할 수 있을까?

- anchor.hash: 494f23b2
- anchor.snippet: #### F11. 인라인 코드 코멘트 + LLM Export Bundle (P1, 크기 M)
- createdAt: 2026-02-22T01:37:08.704Z

---

### _sdd/spec/main.md:L1079-L1079

마크다운 렌더러에서도 코멘트가 달리면 해당 부분에 표시가 되면 좋을 것 같아.

- anchor.hash: 494f23b2
- anchor.snippet: #### F11. 인라인 코드 코멘트 + LLM Export Bundle (P1, 크기 M)
- createdAt: 2026-02-22T01:37:36.539Z
