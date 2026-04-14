# Code Quality Review: Code Editor + Code Viewer

**날짜**: 2026-04-14
**세션**: R6
**리뷰 깊이**: 하이브리드 — CM6 extension 생명주기와 Shiki 인스턴스 관리를 중심으로 정밀 집중

## 리뷰 대상 파일

| 파일 | LOC | 스캔 깊이 |
|------|-----|----------|
| `src/code-editor/code-editor-panel.tsx` | 1,082 | **정밀** |
| `src/code-viewer/syntax-highlight.ts` | 210 | **정밀** |
| `src/code-viewer/shiki-ayu-mirage-theme.ts` | 233 | 구조 |
| `src/code-viewer/shiki-quiet-light-theme.ts` | 235 | 구조 |
| `src/code-editor/cm6-dark-theme.ts` | 185 | 구조 |
| `src/code-editor/cm6-light-theme.ts` | 183 | 구조 |
| `src/code-editor/cm6-comment-gutter.ts` | 116 | 구조 |
| `src/code-editor/cm6-language-map.ts` | 98 | 구조 |
| `src/code-editor/cm6-git-gutter.ts` | 91 | 구조 |
| `src/code-viewer/language-map.ts` | 72 | 구조 |
| `src/code-editor/cm6-navigation-highlight.ts` | 50 | 구조 |
| `src/code-editor/cm6-selection-bridge.ts` | 21 | 구조 |

## 발견 사항 요약

| # | 심각도 | 카테고리 | 위치 | 설명 |
|---|--------|---------|------|------|
| F1 | High | Q9 | code-editor-panel.tsx:559-594 | EditorView 생성 useEffect가 `showEditor` 의존 — showEditor 토글마다 view 파괴·재생성, gutter extension 안의 DOM 리스너 누적 가능 |
| F2 | High | Q8 | code-editor-panel.tsx:622-731 | 파일 콘텐츠 업데이트 async effect — `cancelled` 플래그로 보호하지만 `setState()` 호출 뒤 `requestAnimationFrame` 콜백이 cancelled 체크 후에도 stale view 참조 가능 |
| F3 | High | Q9 | code-editor-panel.tsx:559-594 | EditorView 생성 시 `appearanceTheme`과 `isLineWrapEnabled`를 초기 extension에 캡처하지만 의존성 배열에 없음 — 초기 state와 실제 prop 불일치 가능 |
| F4 | Medium | Q1 | code-editor-panel.tsx (전체) | 1,082줄 단일 컴포넌트 — 15+ useRef, 10+ useEffect, 6+ useCallback, JSX 포함. 헬퍼 함수는 분리되어 있으나 컴포넌트 본체가 과대 |
| F5 | Medium | Q9 | code-editor-panel.tsx:527-534 | `onCommentHoverRef.current`를 매 렌더마다 함수 대입 — ref를 통한 콜백 패턴 자체는 유효하지만, useEffect 바깥에서 ref.current를 직접 대입하는 것은 Concurrent Mode에서 teardown 타이밍 문제 가능 |
| F6 | Medium | Q4 | code-editor-panel.tsx:286-333 + 649-663 | `buildExtensions`를 EditorView 생성(L568)과 setState 재빌드(L652) 양쪽에서 호출 — 동일 pattern이지만 첫 호출에는 `langSupport` 없이, 두 번째에는 있어서 extension 불일치 구간 발생 |
| F7 | Medium | Q8 | code-editor-panel.tsx:646-648 | `getCM6Language(activeFile)`이 reject되면 catch 없이 async effect가 중단 — cancelled 플래그도 소용없음 |
| F8 | Medium | Q4 | code-editor-panel.tsx:124-159 + language-map.ts:5-49 | `getDisplayLanguage`의 DISPLAY_MAP과 `language-map.ts`의 EXTENSION_LANGUAGE_MAP이 별도 유지 — 엔트리가 불일치 (language-map에 toml, swift, ruby 등이 있지만 display map에는 없음) |
| F9 | Medium | Q9 | syntax-highlight.ts:72 | `highlighterPromises`가 모듈 레벨 Map — 한번 생성되면 앱 종료까지 HighlighterCore 인스턴스가 GC되지 않음. 테마 2개이므로 실질적 누수는 미미하나 dispose 메커니즘 없음 |
| F10 | Medium | Q6 | cm6-dark-theme.ts:185 | `export const darkTheme = darkGrayTheme` — 별칭 export가 dead code일 가능성 |
| F11 | Low | Q4 | cm6-language-map.ts + cm6-dark-theme.ts + cm6-light-theme.ts | CM6 language map과 Shiki language map이 독립적으로 유지 — 지원 언어 범위가 다름 (CM6: 15개, Shiki: 30+개). 의도적 분리이나 문서화 없음 |
| F12 | Low | Q10 | syntax-highlight.ts:143 | `!code` 체크로 빈 문자열일 때 plaintext 반환 — 빈 파일은 하이라이팅 불필요하므로 정상이나, `code === undefined`도 통과시키므로 타입 시그니처(`string`)와 불일치 |
| F13 | Low | Q5 | code-editor-panel.tsx:30-36 | `CodeViewerJumpRequest` 타입명에 "Viewer"가 남아있음 — 컴포넌트가 `CodeEditorPanel`로 리네임된 후에도 레거시 이름 유지 |
| F14 | Low | Q5 | code-editor-panel.tsx:854-858 | className이 `code-viewer-*`로 유지 — 컴포넌트명과 CSS 클래스 불일치 |
| F15 | Info | Q11 | code-editor-panel.test.tsx (1,152줄) | 테스트 커버리지 양호 — CM6 생성/파괴, jump, search, gutter, context menu 등 핵심 경로 대부분 커버 |
| F16 | Info | Q11 | syntax-highlight.test.ts (207줄) | escapeHtml, highlightLines, highlightPreviewLines 테스트 존재. `getOrCreateHighlighter` 에러 경로도 커버 |

## 상세 발견

### F1: EditorView 생성/파괴가 showEditor 토글에 과민 반응 (High, Q9)
- **파일**: code-editor-panel.tsx:559-594
- **심각도**: High
- **카테고리**: Q9 — 메모리 누수
- **설명**: `showEditor` 불리언이 useEffect의 유일한 의존성으로, `activeFile`이 바뀔 때뿐 아니라 `readFileError`, `previewUnavailableReason`, `imagePreview`, `activeFileContent` 중 하나라도 변하면 `showEditor`가 토글되어 EditorView 전체가 파괴·재생성된다. `createCommentGutterExtension` 내부에서 `CommentBadgeMarker.toDOM()`이 addEventListener를 호출하는데, view가 빈번히 재생성되면 이전 DOM이 정리되지 않을 수 있다.
- **영향**: showEditor false→true 전이 시 EditorView.destroy()가 호출되므로 CM6 레벨에서는 정리되지만, 재생성 비용이 크고 view를 새로 만들 때마다 language support를 다시 로드한다.
- **제안**: EditorView 생성 effect를 `containerRef` mount에만 의존시키고, `showEditor`가 false일 때는 view를 숨기되 파괴하지 않는 방안 검토. 또는 `showEditor` 대신 별도 stable key 사용.

### F2: 파일 콘텐츠 업데이트 async effect의 requestAnimationFrame 경합 (High, Q8)
- **파일**: code-editor-panel.tsx:697-721
- **심각도**: High
- **카테고리**: Q8 — 비동기 패턴
- **설명**: `updateState` 비동기 함수 안에서 `view.setState(newState)` 호출 후 `requestAnimationFrame`으로 스크롤 복원을 예약한다. rAF 콜백 안에서 `cancelled` 체크는 하지만, effect cleanup은 `cancelled = true`만 설정하고 rAF를 취소하지 않는다. 빠른 파일 전환 시 이전 rAF 콜백이 이미 교체된 view state에 scrollTop을 적용할 수 있다.
- **제안**: `requestAnimationFrame`의 반환값을 저장하고 cleanup에서 `cancelAnimationFrame`을 호출하거나, rAF 콜백 안에서 `viewRef.current === view` 추가 검증.

### F3: EditorView 초기 extension과 prop 불일치 가능 (High, Q9)
- **파일**: code-editor-panel.tsx:559-594
- **심각도**: High
- **카테고리**: Q9 — 메모리 누수 / 상태 불일치
- **설명**: EditorView 생성 effect의 의존성 배열이 `[showEditor]`뿐이다. `appearanceTheme`과 `isLineWrapEnabled`가 buildExtensions에 전달되지만 의존성에 포함되지 않아, showEditor가 변하지 않는 상태에서 테마가 바뀌면 초기 extension이 stale한 테마로 생성된다. 별도 useEffect(L597-607, L609-619)에서 compartment.reconfigure로 보정하지만, EditorView 재생성 시점과 reconfigure 시점 사이에 틈이 생긴다.
- **영향**: 실제로는 showEditor false→true 전이 시에만 발생하고, 바로 뒤따르는 content update effect가 setState로 전체 재빌드하므로 대부분 자동 보정됨. 그러나 초기 빈 document 상태에서 잘못된 테마가 순간 flash될 수 있다.
- **제안**: eslint-disable 주석(L593)이 이 의도적 누락을 표시하고 있으나, 주석에 "theme/wrap은 별도 effect에서 reconfigure"라는 이유를 명시하면 향후 혼란 방지.

### F4: 1,082줄 단일 컴포넌트 (Medium, Q1)
- **파일**: code-editor-panel.tsx (전체)
- **심각도**: Medium
- **카테고리**: Q1 — 파일/함수 크기
- **설명**: `CodeEditorPanel` 함수 본체가 L356-1082 (약 726줄)로, 15+ useRef, 10+ useEffect, 6+ useCallback을 포함한다. 헬퍼 함수와 type/const는 파일 상단에 분리되어 있어 구조는 양호하나, 컴포넌트 로직 자체가 과대.
- **제안**: hover 로직(L453-534), jump 로직(L733-755), search 로직(L801-834), context menu 로직(L757-781)을 custom hook으로 추출 가능.

### F5: Concurrent Mode에서 ref.current 직접 대입 위험 (Medium, Q9)
- **파일**: code-editor-panel.tsx:527-534
- **심각도**: Medium
- **카테고리**: Q9 — 메모리 누수
- **설명**: `onCommentHoverRef.current`와 `onCommentLeaveRef.current`를 컴포넌트 함수 본체(렌더 phase)에서 직접 대입한다. React Concurrent Mode에서는 render가 여러 번 실행되다 commit되지 않을 수 있어, ref에 대입된 클로저가 stale한 state를 참조할 수 있다.
- **영향**: 현재 앱이 StrictMode/ConcurrentMode를 사용하지 않는다면 실질적 문제 없음.
- **제안**: `useEffect` 안에서 ref.current를 대입하면 commit phase에서만 실행되므로 안전.

### F6: buildExtensions 호출 중복과 extension 불일치 구간 (Medium, Q4)
- **파일**: code-editor-panel.tsx:568 + 652
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: EditorView 생성 시(L568) `buildExtensions`를 langSupport 없이 호출하고, content update effect(L652)에서 langSupport 포함하여 다시 호출한다. 두 호출 사이에 EditorView는 language support 없는 상태로 존재한다. 빈 doc(`''`)에 대해서는 문제없지만, showEditor true→true re-render(예: gitLineMarkers 변경 시 showEditor는 변하지 않음)에서는 이 flow를 타지 않으므로 실질적 영향은 제한적.
- **제안**: EditorView 초기 생성 시 빈 doc에 대해 langSupport 없이 생성하는 것은 의도적 설계로 보이나, 주석으로 이유 명시 권장.

### F7: getCM6Language reject 시 unhandled promise (Medium, Q8)
- **파일**: code-editor-panel.tsx:646-648
- **심각도**: Medium
- **카테고리**: Q8 — 비동기 패턴
- **설명**: `updateState` 비동기 함수 안에서 `getCM6Language(activeFile)`을 await하지만, 이 호출이 reject되면 `updateState` 전체가 중단된다. 상위 호출부(L726 `updateState()`)에는 catch가 없으므로 unhandled promise rejection이 발생한다.
- **영향**: `getCM6Language`의 각 case가 dynamic import만 수행하므로 일반적으로 reject되지 않지만, 네트워크 환경이나 번들 손상 시 발생 가능.
- **제안**: `getCM6Language` 호출을 try-catch로 감싸고, 실패 시 `langSupport = undefined`로 fallback.

### F8: getDisplayLanguage와 EXTENSION_LANGUAGE_MAP 중복·불일치 (Medium, Q4)
- **파일**: code-editor-panel.tsx:124-159 + language-map.ts:5-49
- **심각도**: Medium
- **카테고리**: Q4 — 코드 중복
- **설명**: `getDisplayLanguage`(code-editor-panel.tsx)의 `DISPLAY_MAP`은 20개 엔트리, `language-map.ts`의 `EXTENSION_LANGUAGE_MAP`은 35개 엔트리. `toml`, `swift`, `rb`, `scss`, `less`, `graphql`, `gql`, `dockerfile`, `makefile`, `vue`, `svelte`, `php`, `r`, `lua`, `dart`, `kt`, `scala`, `zig` 등이 language-map에만 존재. `getDisplayLanguage`는 헤더 표시용이고 `getHighlightLanguage`는 Shiki 하이라이팅용이므로 용도가 다르지만, 사용자에게 "plaintext"로 표시되면서 실제로는 하이라이팅이 적용되는 불일치가 생길 수 있다.
- **제안**: `getDisplayLanguage`가 `language-map.ts`를 import하여 동일 맵을 참조하거나, 최소한 엔트리를 동기화.

### F9: Shiki HighlighterCore 인스턴스 영구 보유 (Medium, Q9)
- **파일**: syntax-highlight.ts:72
- **심각도**: Medium
- **카테고리**: Q9 — 메모리 누수
- **설명**: `highlighterPromises`가 모듈 레벨 `Map<ResolvedAppearanceTheme, Promise<HighlighterCore>>`로, 한번 생성된 HighlighterCore는 앱 종료까지 메모리에 유지된다. Shiki의 HighlighterCore는 로드된 언어별 grammar과 regex engine을 보유하므로 언어가 많이 로드될수록 메모리 사용량 증가.
- **영향**: Electron 데스크톱 앱에서 테마 2개 × 최대 30개 언어이므로 실질적으로 수십 MB 수준. 심각한 누수는 아니지만 dispose 메커니즘이 없다.
- **제안**: Shiki v1의 `highlighter.dispose()` 지원 여부 확인. 필요시 workspace 전환 시점에서 정리 가능하도록 `disposeHighlighters()` 함수 노출.

### F10: darkTheme 별칭 export (Low, Q6)
- **파일**: cm6-dark-theme.ts:185
- **심각도**: Low
- **카테고리**: Q6 — 데드 코드
- **설명**: `export const darkTheme = darkGrayTheme`이 선언되어 있으나, 프로젝트 전체에서 `darkGrayTheme`만 import되고 `darkTheme`은 사용되지 않을 가능성이 있다.
- **제안**: grep으로 실사용 확인 후 미사용이면 제거.

### F11: CM6 language map과 Shiki language map 독립 유지 (Low, Q4)
- **파일**: cm6-language-map.ts + language-map.ts
- **심각도**: Low
- **카테고리**: Q4 — 코드 중복
- **설명**: CM6용 language map(`cm6-language-map.ts`, 15개 확장자)과 Shiki용 language map(`language-map.ts`, 35개 확장자)이 완전히 독립적으로 유지된다. CM6는 @codemirror/lang-* 패키지 기반이고 Shiki는 TextMate grammar 기반이므로 지원 범위가 다른 것은 당연하나, 새 언어 추가 시 양쪽 동기화가 누락될 수 있다.
- **제안**: 두 맵의 차이를 문서화하거나, 공통 확장자 목록을 shared constant로 추출.

### F12: syntax-highlight.ts의 빈 문자열 처리 (Low, Q10)
- **파일**: syntax-highlight.ts:143
- **심각도**: Low
- **카테고리**: Q10 — 엣지 케이스
- **설명**: `if (language === 'plaintext' || !code)` 체크에서 `!code`는 빈 문자열과 undefined 모두를 통과시키지만, 타입 시그니처는 `code: string`이므로 undefined는 타입 레벨에서 불가. 빈 문자열에 대해 plaintext fallback은 올바른 동작.
- **영향**: 없음 — 방어적 코딩으로 정상.

### F13: CodeViewerJumpRequest 레거시 이름 (Low, Q5)
- **파일**: code-editor-panel.tsx:30-36
- **심각도**: Low
- **카테고리**: Q5 — 네이밍 일관성
- **설명**: 컴포넌트가 `CodeEditorPanel`로 리네임되었지만 jump request 타입명에 "Viewer"가 남아 있다. 같은 파일의 CSS 클래스도 `code-viewer-*` 접두어를 사용한다(F14).
- **제안**: 일괄 리네임은 breaking change가 크므로, 새 코드 작성 시 `CodeEditor*` 네이밍 사용 권장.

### F14: CSS 클래스명 code-viewer-* 레거시 (Low, Q5)
- **파일**: code-editor-panel.tsx:854-858
- **심각도**: Low
- **카테고리**: Q5 — 네이밍 일관성
- **설명**: `code-viewer-panel`, `code-viewer-header`, `code-viewer-title-row` 등 CSS 클래스가 이전 `CodeViewerPanel` 시절 이름을 유지.
- **영향**: 기능에 영향 없음. CSS와 테스트의 `data-testid`도 동일 이름 사용 중이므로 변경 시 영향 범위 넓음.

## 긍정적 패턴 (Good Patterns)

- **CM6 Compartment 패턴**: `themeCompartment`과 `wrapCompartment`를 사용하여 테마/줄바꿈 설정을 EditorView 재생성 없이 동적 전환 — CM6 best practice를 정확히 따름
- **StateEffect/StateField 분리**: git gutter, comment gutter, navigation highlight가 각각 독립 모듈(`cm6-git-gutter.ts`, `cm6-comment-gutter.ts`, `cm6-navigation-highlight.ts`)로 분리되어 있어 테스트·재사용·유지보수 용이
- **Shiki 하이라이터 지연 로딩**: `LANG_IMPORTS`에서 dynamic import를 사용하여 필요한 언어만 로드 — 초기 번들 크기 최적화
- **Shiki 에러 복원력**: `getOrCreateHighlighter`에서 catch 시 `highlighterPromises.delete()`로 재시도 가능하게 하고, `highlightLineTokens`에서도 각 단계(highlighter 생성, language 로딩) 실패 시 plaintext fallback
- **EditorView cleanup**: useEffect return에서 scroll listener 해제 + `view.destroy()` + ref null 정리 — 정석적 cleanup 패턴
- **cancelled 플래그**: 비동기 content update에서 stale 업데이트 방지 — React 비동기 effect의 표준 패턴
- **GutterMarker.eq() 구현**: `GitDotMarker`에서 `eq()` override로 불필요한 DOM 재생성 방지
- **ref 기반 콜백 패턴**: `onSelectRangeRef`, `onScrollChangeRef` 등을 통해 extension 재생성 없이 최신 콜백 참조 — CM6 + React 통합의 핵심 패턴
- **테스트 커버리지**: code-editor-panel.test.tsx (1,152줄)이 CM6 생명주기, jump, search, gutter, context menu 등 핵심 경로를 광범위하게 커버

## 모듈 종합 평가

- **전체 인상**: CM6와 React 통합이 잘 설계되어 있다. Compartment, StateEffect/StateField, ref 기반 콜백 등 CM6 best practice를 정확히 적용했고, extension 모듈이 깔끔하게 분리되어 있다. Shiki 하이라이터도 지연 로딩과 에러 복원력이 양호하다. 주요 우려는 `code-editor-panel.tsx`의 크기와 EditorView 생명주기의 세밀한 비동기 경합 지점이다.
- **가장 큰 위험**: F2(requestAnimationFrame 미취소)와 F7(getCM6Language reject 미처리) — 빠른 파일 전환 시 stale scroll 복원 또는 unhandled rejection 발생 가능
- **권장 후속 조치**:
  1. F2: rAF cleanup 추가 (영향 범위 작음, 즉시 수정 가능)
  2. F7: getCM6Language try-catch 추가 (한 줄 수정)
  3. F4: 컴포넌트 분할은 중장기 과제로 — hover/jump/search 로직을 custom hook으로 점진 추출
  4. F8: getDisplayLanguage를 language-map.ts 기반으로 통합 검토
