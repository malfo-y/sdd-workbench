# 토론 요약: 파일 브라우저 클립보드 기반 복사/붙여넣기

**날짜**: 2026-03-10
**라운드 수**: 4
**참여 방식**: 구조화된 토론 (discussion skill)

## 핵심 논점 (Key Discussion Points)

1. **구현 범위**: 앱 내부 클립보드 + Finder→앱 읽기 전용 interop. 앱→Finder 쓰기(양방향)는 범위 밖.
2. **원격 워크스페이스 정책**: Finder 붙여넣기는 로컬 워크스페이스에서만 허용. 원격에서는 내부 클립보드 Copy/Paste만 지원.
3. **단축키 설계**: 포커스 기반 분기 — 파일 트리 포커스 시 Cmd+C=파일 복사, 코드 에디터 포커스 시 Cmd+C=텍스트 복사. VS Code와 동일한 패턴.
4. **Cut 미지원**: Copy/Paste만 지원. Cut(잘라내기/이동) 기능은 범위 밖. 데이터 유실 리스크 제거.
5. **구현 난이도**: "엄청 어려운" 수준이 아님. Backend 연산 추가 + Finder 클립보드 읽기 두 축이며, 둘 다 선례(VS Code, Electron API) 있음.

## 결정 사항 (Decisions Made)

| # | 결정 | 근거 | 관련 논점 |
|---|------|------|----------|
| 1 | 앱 내부 클립보드 + Finder→앱 읽기 전용 interop | VS Code도 Finder interop은 안 함. 읽기만 추가하면 실용적 | 구현 범위 |
| 2 | Finder 붙여넣기는 로컬 워크스페이스 전용 | 원격은 로컬 경로가 없어 SCP 전송이 필요하고 복잡도가 너무 높음 | 원격 정책 |
| 3 | 포커스 기반 Cmd+C/V 분기 | VS Code와 동일한 UX, 사용자 학습 비용 최소화 | 단축키 |
| 4 | Cut 기능 미지원 (Copy/Paste만) | 구현 단순화, 데이터 유실 리스크 제거 | Cut 정책 |
| 5 | 2-Phase 구현: Phase 1 내부 → Phase 2 Finder | 독립 배포 가능, 점진적 복잡도 증가 | 우선순위 |

## 미결 질문 (Open Questions)

- [ ] 이름 충돌 처리 전략: `file (1).txt` 자동 넘버링 vs 사용자 확인 다이얼로그
- [ ] 디렉토리 복사 시 재귀 깊이 제한/대형 디렉토리 경고 정책
- [ ] 원격 워크스페이스 내부 Copy/Paste 시 remote agent RPC에 copy 명령 추가 방법
- [ ] `bplist-parser` 의존성 추가 vs 직접 구현 (패키지 크기 영향)

## 실행 항목 (Action Items)

| # | 항목 | 우선순위 | Phase |
|---|------|---------|-------|
| 1 | `WorkspaceBackend`에 `copyFile`/`copyDirectory` 인터페이스 추가 | High | 1 |
| 2 | local backend: `fs.cp` 기반 구현 | High | 1 |
| 3 | remote backend: agent RPC `workspace.copyFile`/`workspace.copyDirectory` 확장 | High | 1 |
| 4 | Main process clipboard state (`{ operation: 'copy', paths: string[] }`) | High | 1 |
| 5 | IPC 채널: `workspace:copyToClipboard`, `workspace:pasteFromClipboard` | High | 1 |
| 6 | 파일 트리 컨텍스트 메뉴에 Copy/Paste 추가 | High | 1 |
| 7 | 포커스 기반 Cmd+C/V 키보드 바인딩 | High | 1 |
| 8 | 이름 충돌 시 자동 넘버링 로직 (`incrementFileName`) | Medium | 1 |
| 9 | `clipboard.readBuffer('NSFilenamesPboardType')` + `bplist-parser` 통합 | High | 2 |
| 10 | Finder 파일 Paste 시 로컬 전용 검증 + 원격 unsupported 배너 | Medium | 2 |

## 리서치 결과 요약 (Research Findings)

- **현재 코드베이스**: 파일 CRUD(create/delete/rename)는 있으나 copy/move 연산 없음. 클립보드는 텍스트 쓰기(Copy Relative Path)만 존재.
- **Electron clipboard API**: `clipboard.write()`에 `files` 속성 없음. 파일 interop은 `readBuffer`/`writeBuffer` + 플랫폼별 포맷 필요.
- **macOS 파일 클립보드**: Finder는 `NSFilenamesPboardType` (binary plist) 형태로 파일 경로 배열을 클립보드에 저장. `bplist-parser` 패키지로 디코딩 가능.
- **VS Code 접근법**: Finder interop 안 함. 내부 `IClipboardService`로 앱 내 copy/paste만 처리. `incrementFileName()`으로 이름 충돌 해결.

## 토론 흐름 (Discussion Flow)

Round 1: 구현 범위 → 내부 클립보드 + Finder→앱 읽기 전용
Round 2: 원격 워크스페이스 정책 → 로컬만 허용
Round 3: 단축키 충돌 → 포커스 기반 분기
Round 4: Cut 동작 → Cut 미지원, Copy/Paste만

## 부록: 대화 로그 (Conversation Log)

### Round 1
**Q**: 구현 범위를 어디까지 생각하고 있어요?
**Options**: 1) 앱 내부 클립보드만 2) 내부 + Finder→앱 붙여넣기 3) 완전 양방향 Finder interop 4) 토론 종료
**A**: 내부 + Finder→앱 붙여넣기
**Follow-up**: Finder interop 읽기는 `NSFilenamesPboardType` + `bplist-parser`로 구현 가능. 쓰기는 범위 밖.

### Round 2
**Q**: 원격 워크스페이스에서 Finder 파일 붙여넣기를 시도하면?
**Options**: 1) 로컬만 허용 2) 로컬→원격 전송 지원 3) 전체 불허 4) 토론 종료
**A**: 로컬만 허용
**Follow-up**: 원격에서 Finder Paste 시도 시 unsupported 배너 표시.

### Round 3
**Q**: Cmd+C 단축키 충돌 문제를 어떻게 해결할까요?
**Options**: 1) 포커스 기반 분기 2) 컨텍스트 메뉴만 3) 별도 단축키 4) 토론 종료
**A**: 포커스 기반 분기
**Follow-up**: 파일 트리 포커스 시 Cmd+C=파일 복사, 에디터 포커스 시 Cmd+C=텍스트 복사. VS Code 패턴.

### Round 4
**Q**: Cut 동작 타이밍과 추가 논의 사항이 있나요?
**Options**: 1) Paste 시점 삭제 2) Cut 시점 삭제 3) 토론 종료
**A**: Cut 기능 미지원. Copy/Paste만 지원.
**Follow-up**: Cut 제거로 구현 단순화. 데이터 유실 리스크 제거.
