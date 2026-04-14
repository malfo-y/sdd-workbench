# Code Quality Review: File Tree + Context + Utilities

**날짜**: 2026-04-14
**세션**: R7
**리뷰 깊이**: 하이브리드 — CRUD 에러 핸들링과 파일명 보안에 집중

## 리뷰 대상 파일

| 파일 | LOC | 스캔 깊이 |
|------|-----|----------|
| `src/file-tree/file-tree-panel.tsx` | 1,215 | **정밀** |
| `src/modal-drag-position.ts` | 231 | 구조 |
| `src/context-menu/copy-action-popover.tsx` | 144 | 구조 |
| `src/context-copy/copy-payload.ts` | 125 | 구조 |
| `src/modal-wheel-passthrough.ts` | 110 | 구조 |
| `src/source-selection.ts` | 51 | 구조 |

## 발견 사항 요약

| # | 심각도 | 카테고리 | 위치 | 설명 |
|---|--------|---------|------|------|
| F1 | High | Q7 | file-tree-panel.tsx:432-436 | 파일명 검증이 `/`와 `.`/`..`만 차단 — `\`, NUL, 제어문자, OS 예약어 미검증 |
| F2 | High | Q2 | file-tree-panel.tsx:768-792 | `submitInlineInput`에서 CRUD 콜백(create/rename) 에러를 catch하지 않음 — Promise rejection 미처리 |
| F3 | Medium | Q1 | file-tree-panel.tsx:532-1215 | `FileTreePanel` 함수 본체가 683줄, 9 useState + 5 useRef + 7 useEffect/useLayoutEffect + 10 useCallback |
| F4 | Medium | Q1 | file-tree-panel.tsx:225-430 | `renderFileTreeNodes` 함수 파라미터 13개 — 과다한 positional 인자 |
| F5 | Medium | Q7 | file-tree-panel.tsx:1029-1038 | Delete 액션에 확인 다이얼로그 없이 즉시 콜백 호출 (App.tsx에서 confirm 처리하나 관심사 경계 불명확) |
| F6 | Medium | Q8 | file-tree-panel.tsx:706-741 | 검색 debounce `setTimeout` 내부의 async `.then()/.catch()`에서 `searchRequestTokenRef`로 stale 체크하지만, 에러 시 조용히 빈 결과로 초기화 |
| F7 | Medium | Q9 | file-tree-panel.tsx:604-617 | rootPath 변경 시 상태 리셋 effect — `searchRequestTokenRef`는 리셋하지 않아 이전 워크스페이스 검색 응답이 도착하면 새 워크스페이스에 표시될 수 있음 |
| F8 | Medium | Q4 | file-tree-panel.tsx:297-303, 404-409 | git badge 텍스트/title 결정 로직이 directory·file 렌더링에서 동일하게 반복 |
| F9 | Low | Q10 | file-tree-panel.tsx:776-778 | `fullRelativePath` 생성 시 `parentRelativePath`가 빈 문자열이면 name만 사용 — 정상이나 leading `/` 발생 가능성 체크 없음 |
| F10 | Low | Q6 | file-tree-panel.tsx:318-332 | `isExpanded && childrenStatus === 'not-loaded'` 분기에서 `isExpanded` 중복 체크 (외부 조건에서 이미 `isExpanded` 확인) |
| F11 | Low | Q10 | copy-payload.ts:44 | `rootPath.includes('\\')` Windows 판별 — macOS에서 `\` 포함 경로 시 잘못된 separator 선택 |
| F12 | Info | Q5 | file-tree-panel.tsx:952-1043 | `contextMenuActions` IIFE 패턴 — 별도 함수 추출이 가독성 측면에서 유리 |
| F13 | Info | Q11 | file-tree-panel.test.tsx (2,145줄) | 테스트 커버리지 양호 — CRUD, 검색, git badge, focus retention, clipboard 등 핵심 경로 대부분 커버 |

## 상세 발견

### F1: 파일명 검증이 불충분 — OS 예약 문자와 예약어 미차단 (High, Q7)

- **파일**: file-tree-panel.tsx:432-436
- **심각도**: High
- **카테고리**: Q7 — 보안
- **설명**: `validateInlineInputName`이 세 가지만 차단한다: (1) 빈 문자열, (2) `/` 포함, (3) `.` 또는 `..`. 그러나 다음이 통과된다:
  - `\` (backslash) — Windows에서 path separator이며 macOS에서도 파일명에 포함되면 혼란
  - NUL 바이트 (`\x00`) — POSIX 파일시스템에서 유일하게 허용되지 않는 문자
  - 제어 문자 (`\x01`-`\x1F`)
  - Windows 예약어: `CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, `LPT1`-`LPT9`
  - trailing dot/space — Windows에서 자동 strip되어 의도치 않은 충돌 가능
  - 매우 긴 파일명 (255바이트 이상)
- **영향**: Electron 앱이 macOS primary이므로 즉각적인 취약점은 아니지만, 원격 워크스페이스(SSH) 연결 시 대상이 Windows/Linux일 수 있어 방어적 검증 필요. 실제 파일 생성은 백엔드(`workspace-context.tsx`)에서 `window.workspace.createFile()`을 호출하고 에러를 banner로 표시하므로 OS 레벨에서 거부되긴 하나, 사용자에게 더 이른 피드백 제공이 바람직.
- **제안**: 최소한 `\`, NUL 바이트, 제어 문자를 추가 차단. 이상적으로는 `isValidFileName(name: string): string | null` 유틸리티를 별도 모듈로 분리하고 테스트에서 edge case 검증.

### F2: CRUD 콜백의 비동기 에러가 미처리 (High, Q2)

- **파일**: file-tree-panel.tsx:768-792
- **심각도**: High
- **카테고리**: Q2 — 에러 핸들링
- **설명**: `submitInlineInput`은 `onRequestCreateFile?.(fullRelativePath)`, `onRequestCreateDirectory?.(fullRelativePath)`, `onRequestRename?.(...)` 콜백을 호출하지만, 이 콜백들은 `App.tsx`에서 `async` 함수(`handleRequestCreateFile` 등)로 정의되어 있다. `submitInlineInput` 자체는 `async`가 아니므로 반환된 Promise가 `void`로 무시되고, 콜백 내부에서 발생한 에러(네트워크 실패 등)는 unhandled rejection이 된다.
- **영향**: `workspace-context.tsx`의 `createFile`/`createDirectory` 등은 내부적으로 try-catch로 감싸고 banner 메시지를 표시하므로 실제로는 에러가 삼켜지는 것이 아닌, banner 표시 후 false 반환. 하지만 `App.tsx`의 wrapper (`handleRequestCreateFile`)가 `await createFile(relativePath)`를 호출하면서 에러를 catch하지 않으므로, `workspace-context` 바깥에서 발생하는 예외(예: `window.workspace` 자체가 undefined)는 unhandled rejection이 된다.
- **제안**: `App.tsx`의 CRUD 핸들러들에 `.catch()` 추가, 또는 `submitInlineInput`에서 `void onRequestCreateFile?.(...)?.catch?.(console.error)` 패턴으로 방어.

### F3: 683줄 컴포넌트 (Medium, Q1)

- **파일**: file-tree-panel.tsx:532-1215
- **심각도**: Medium
- **카테고리**: Q1 — 파일/함수 크기
- **설명**: `FileTreePanel` 컴포넌트 본체가 약 683줄로 9개의 useState, 5개의 useRef, 7개의 useEffect/useLayoutEffect, 10개의 useCallback을 포함한다. 파일 전체는 1,215줄이며 헬퍼 함수가 상단에 531줄 분리되어 있어 구조는 양호하나, 컴포넌트 본체가 과대.
- **제안**: inline input 관련 로직(750-792), 검색 관련 로직(676-742), context menu 관련 로직(810-1043)을 custom hook으로 분리 가능. `useFileTreeInlineInput`, `useFileTreeSearch`, `useFileTreeContextMenu` 등.

### F4: renderFileTreeNodes에 13개 positional 파라미터 (Medium, Q1)

- **파일**: file-tree-panel.tsx:225-430
- **심각도**: Medium
- **카테고리**: Q1 — 파일/함수 크기
- **설명**: `renderFileTreeNodes`가 13개의 위치 인자를 받는다: `nodes`, `depth`, `budget`, `activeFile`, `changedFileSet`, `changedSubtreeSet`, `gitStatusSubtreeMap`, `onSelectFile`, `onNodeContextMenu`, `expandedDirectories`, `onToggleDirectory`, `onRequestLoadDirectory`, `loadingDirectoriesSet`. 재귀 호출(L335-349)에서 동일 인자를 그대로 전달하므로 읽기 어렵다.
- **제안**: options 객체 패턴으로 리팩토링: `renderFileTreeNodes(nodes, depth, budget, context)` 형태로 context에 나머지 인자를 묶기.

### F5: Delete 액션에서 확인 절차의 책임 분리 불명확 (Medium, Q7)

- **파일**: file-tree-panel.tsx:1029-1038
- **심각도**: Medium
- **카테고리**: Q7 — 보안
- **설명**: context menu의 Delete 액션이 `onRequestDeleteFile?.(contextMenuState.relativePath)` / `onRequestDeleteDirectory?.(contextMenuState.relativePath)`를 즉시 호출한다. 확인 다이얼로그는 `App.tsx`의 `handleRequestDeleteFile`/`handleRequestDeleteDirectory`에서 `window.confirm()`으로 처리한다.
- **영향**: 현재 구조에서는 안전하지만, 다른 소비자가 `FileTreePanel`을 사용할 때 확인 없이 삭제가 실행될 위험이 있다. 컴포넌트의 계약(contract)이 "확인은 소비자 책임"인지 문서화되어 있지 않다.
- **제안**: prop 이름을 `onConfirmDeleteFile`로 변경하여 확인 절차를 포함해야 함을 명시하거나, JSDoc 주석으로 계약 명시.

### F6: 검색 에러가 조용히 빈 결과로 리셋 (Medium, Q8)

- **파일**: file-tree-panel.tsx:724-736
- **심각도**: Medium
- **카테고리**: Q8 — 비동기 패턴
- **설명**: `onSearchFiles(trimmedQuery).catch(() => { ... })` 에서 에러 발생 시 아무 로그 없이 `results: []`로 리셋한다. 사용자 관점에서는 검색 결과가 없는 것과 검색이 실패한 것이 구분되지 않는다.
- **영향**: 네트워크 에러(원격 워크스페이스)나 파일시스템 에러 시 "No files found" 표시로 사용자가 정상 동작으로 오해.
- **제안**: `searchState`에 `error: string | null` 필드를 추가하여 검색 실패를 구분 표시.

### F7: rootPath 변경 시 searchRequestTokenRef 미리셋 — stale 응답 위험 (Medium, Q9)

- **파일**: file-tree-panel.tsx:604-617
- **심각도**: Medium
- **카테고리**: Q9 — 메모리 누수 / 레이스 컨디션
- **설명**: `rootPath` 변경 effect(L604-617)에서 `searchQuery`를 빈 문자열로 리셋하고 `searchState`를 초기화하지만, `searchRequestTokenRef`는 증가시키지 않는다. 만약 이전 워크스페이스의 검색 응답이 아직 pending이고, 새 워크스페이스에서 사용자가 같은 query를 빠르게 입력하면, 이전 응답이 토큰 일치로 통과하여 잘못된 결과가 표시될 수 있다.
- **영향**: 실제로는 `searchQuery`를 빈 문자열로 리셋하면 검색 effect가 `trimmedQuery.length === 0` 분기로 빠지고, 새 검색 시 토큰이 새로 증가하므로 발생 가능성은 낮음. 그러나 타이밍에 따라 rootPath 변경과 search effect 실행 순서가 보장되지 않을 수 있다.
- **제안**: rootPath 변경 effect에서 `searchRequestTokenRef.current += 1` 추가.

### F8: git badge 텍스트 로직 반복 (Medium, Q4)

- **파일**: file-tree-panel.tsx:297-303, 404-409
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: directory 노드(L297-303)와 file 노드(L404-409)에서 동일한 git badge 렌더링 로직이 반복된다: `title` 결정 (`modified ? 'Modified' : untracked ? 'Untracked' : 'Added'`), 텍스트 (`modified ? 'M' : 'U'`), className 생성.
- **제안**: `<GitStatusBadge status={status} relativePath={relativePath} />` 소형 컴포넌트로 추출.

### F9: fullRelativePath 생성 시 edge case (Low, Q10)

- **파일**: file-tree-panel.tsx:776-778
- **심각도**: Low
- **카테고리**: Q10 — 엣지 케이스
- **설명**: `const fullRelativePath = inlineInput.parentRelativePath ? \`${inlineInput.parentRelativePath}/${name}\` : name` — `parentRelativePath`가 빈 문자열이면 `name`만 사용되어 정상. 그러나 `parentRelativePath`가 `/`로 끝나면 `//`가 생길 수 있다. 현재 코드에서 `parentRelativePath`는 항상 정규화된 상태(trailing slash 없음)이므로 실질적 위험은 없으나, 방어적 정규화가 있으면 더 안전.

### F10: isExpanded 중복 체크 (Low, Q6)

- **파일**: file-tree-panel.tsx:318-332
- **심각도**: Low
- **카테고리**: Q6 — 데드 코드
- **설명**: `{isExpanded && node.childrenStatus === 'not-loaded' ? (isExpanded && (...))` — 외부 조건에서 이미 `isExpanded`를 체크하는데, 내부에서 다시 `isExpanded &&`로 감싸고 있다. 두 번째 체크는 항상 true.
- **제안**: 내부 `isExpanded &&` 제거.

### F11: Windows path separator 감지 방식의 한계 (Low, Q10)

- **파일**: copy-payload.ts:44
- **심각도**: Low
- **카테고리**: Q10 — 엣지 케이스
- **설명**: `rootPath.includes('\\')` 로 Windows 여부를 판별한다. macOS/Linux에서 backslash를 포함하는 경로(허용되지만 비일반적)가 있으면 잘못된 separator가 선택된다.
- **영향**: 극히 드문 edge case. macOS에서 backslash 포함 디렉토리명은 사실상 사용되지 않음.

## 구조 스캔 결과

### modal-drag-position.ts (231줄)

- **구조**: 양호. `clampModalDragDelta` 순수 함수 + `useModalDragPosition` custom hook으로 잘 분리.
- **에러 핸들링**: 포인터 이벤트 기반으로 에러 없는 도메인. `dialogRef.current` null 체크 적절.
- **메모리**: `isDragging` 상태 변화 시에만 window event listener 등록/해제 — 정상. cleanup 함수에서 listener 정리 확인.
- **특이사항 없음**.

### copy-action-popover.tsx (144줄)

- **구조**: 양호. 단일 책임 컴포넌트.
- **에러 핸들링**: 포지셔닝 로직만 있어 에러 도메인 최소.
- **메모리**: `useEffect`에서 `mousedown`/`keydown` listener 등록/해제 적절. `useLayoutEffect`에서 `resize` listener 등록/해제 적절.
- **Q3**: `actions.map((action) => (...))` 에서 `key={action.label}` — label 중복 시 key 충돌 가능하나 현재 사용처에서 중복 label은 없음.

### copy-payload.ts (125줄)

- **구조**: 양호. 순수 함수 모음.
- **보안**: `normalizeRootPathForJoin` 에서 trailing separator 정규화 적절. `normalizeLineNumber`에서 `Math.max(1, Math.trunc(lineNumber))`로 음수/소수 방어.
- **F11 참조**: Windows separator 감지 한계(Low).

### modal-wheel-passthrough.ts (110줄)

- **구조**: 양호. `findScrollableAncestor` 순수 탐색 + `useModalBackgroundWheelPassthrough` custom hook.
- **에러 핸들링**: `document.elementsFromPoint` 존재 여부 체크(L78) — 방어적.
- **특이사항 없음**.

### source-selection.ts (51줄)

- **구조**: 양호. `SourceOffsetRange` 타입 + `normalizeSourceOffsetRange` 순수 함수.
- **에러 핸들링**: `Number.isFinite` 체크, 음수 방어, null 반환 패턴 적절.
- **특이사항 없음**.

## 긍정적 패턴 (Good Patterns)

- **테스트 커버리지 양호**: `file-tree-panel.test.tsx` 2,145줄로 CRUD, 검색, git badge, focus retention, clipboard 등 핵심 경로를 폭넓게 커버. 특히 CRUD 테스트가 inline input → validate → submit 전체 흐름을 검증.
- **검색 debounce + 토큰 패턴**: `searchRequestTokenRef`를 사용한 stale 응답 방지 패턴이 잘 구현됨.
- **render budget 패턴**: `INITIAL_RENDER_NODE_LIMIT`으로 대규모 파일 트리의 DOM 노드 수를 제한하는 방어적 렌더링.
- **focus restoration**: `lastFocusedTargetRef` + `findFocusRestoreElement`로 트리 갱신 후 포커스 복원을 세밀하게 처리.
- **scroll position preservation**: `lastScrollTopRef`로 트리 갱신 후 스크롤 위치 복원.
- **유틸리티 파일 분리 우수**: `modal-drag-position`, `modal-wheel-passthrough`, `copy-payload`, `source-selection` 모두 단일 책임 원칙을 잘 따르고, 순수 함수와 hook이 깔끔하게 분리됨.

## 모듈 종합 평가

- **전체 인상**: `file-tree-panel.tsx`는 1,215줄로 크지만 헬퍼 함수가 상단에 잘 분리되어 있고, 테스트 커버리지가 우수하여 전반적 품질은 양호. 유틸리티 파일들은 모두 작고 깨끗하며 특별한 이슈 없음.
- **가장 큰 위험**: F1(파일명 검증 불충분)과 F2(CRUD 콜백 에러 미처리). 특히 F1은 원격 워크스페이스 시나리오에서 예상치 못한 파일명이 서버로 전달될 수 있는 경로.
- **권장 후속 조치**:
  1. **(우선)** `validateInlineInputName`에 `\`, NUL, 제어 문자 차단 추가
  2. **(우선)** `App.tsx` CRUD 핸들러에 `.catch()` 추가 또는 `submitInlineInput`에서 방어
  3. **(중기)** `renderFileTreeNodes` 파라미터를 context 객체로 정리
  4. **(중기)** 검색 에러 상태를 UI에 표시
  5. **(장기)** 컴포넌트 본체를 custom hook으로 분리하여 683줄 축소
