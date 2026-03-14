# Electron 파일 복사/붙여넣기 클립보드 연구

> 연구일: 2026-03-10
> 대상 플랫폼: macOS (primary), Electron + React + TypeScript

---

## 1. macOS 시스템 클립보드의 파일 처리 (NSPasteboard)

### Finder가 Cmd+C로 파일을 복사할 때 클립보드에 쓰는 타입들:

| Pasteboard Type | 설명 | 데이터 형식 |
|---|---|---|
| `NSFilenamesPboardType` | 파일 경로 배열 (레거시, 여전히 사용됨) | Binary plist (문자열 배열) |
| `public.file-url` | 파일 URL (단일) | `file:///path/to/file` UTF-8 문자열 |
| `com.apple.finder.noderef` | Finder 내부 참조 | 바이너리 |
| `com.apple.pasteboard.promised-file-url` | Cut 작업용 (promised) | URL 문자열 |

### 핵심 사항:
- `pbpaste` 명령은 텍스트만 반환하므로 파일 참조를 읽을 수 없음
- 파일 클립보드 데이터는 binary plist로 인코딩되어 있어 디코딩 필요
- Finder에서 붙여넣기가 동작하려면 `NSFilenamesPboardType` 형식으로 작성해야 함

---

## 2. Electron 클립보드 API

### 사용 가능한 메서드 (main process 또는 preload에서 사용):

> **주의**: Electron 최신 버전에서 renderer process의 직접 clipboard 접근은 deprecated.
> preload.ts에서 `contextBridge`를 통해 노출해야 함.

```typescript
import { clipboard } from 'electron';

// --- 기본 API ---
clipboard.readText()           // 텍스트 읽기
clipboard.writeText(text)      // 텍스트 쓰기
clipboard.readHTML()           // HTML 읽기
clipboard.writeHTML(markup)    // HTML 쓰기
clipboard.readImage()          // NativeImage 읽기
clipboard.writeImage(image)    // NativeImage 쓰기
clipboard.readBookmark()       // macOS/Windows: { title, url }
clipboard.writeBookmark(title, url)
clipboard.availableFormats()   // 현재 클립보드 형식 배열 반환

// --- 파일 처리에 필수인 실험적 API ---
clipboard.readBuffer(format)             // 특정 format의 raw Buffer 읽기
clipboard.writeBuffer(format, buffer)    // 특정 format으로 raw Buffer 쓰기

// --- 복합 쓰기 (주의: 클립보드를 먼저 비움) ---
clipboard.write({ text, html, image, rtf, bookmark })
// ⚠ 'files' 속성은 없음! 파일은 readBuffer/writeBuffer로만 처리 가능
```

### `clipboard.write()` 제한사항:
- `{ text, html, image, rtf, bookmark }` 만 지원, **파일 경로 속성 없음**
- `write()`를 호출하면 클립보드가 **먼저 비워지므로** `writeBuffer()`와 조합 불가
- 파일 클립보드 interop은 반드시 `readBuffer`/`writeBuffer` + 플랫폼별 format 문자열 사용

---

## 3. 파일 경로 읽기/쓰기 구현 패턴

### 3-A. 시스템 클립보드에서 파일 경로 읽기 (Finder → 앱)

```typescript
import { clipboard } from 'electron';
import * as bplistParser from 'bplist-parser';

function readFilesFromSystemClipboard(): string[] | null {
  const formats = clipboard.availableFormats();

  // Finder가 파일을 복사하면 이 형식이 존재
  if (!formats.includes('NSFilenamesPboardType')) return null;

  const buf = clipboard.readBuffer('NSFilenamesPboardType');
  if (!buf || buf.length === 0) return null;

  try {
    const parsed = bplistParser.parseBuffer(buf);
    // parsed[0] = ['/Users/foo/Desktop/file.txt', '/Users/foo/file2.txt']
    return parsed[0] as string[];
  } catch {
    return null;
  }
}
```

### 3-B. 시스템 클립보드에 파일 경로 쓰기 (앱 → Finder)

```typescript
import { clipboard } from 'electron';
import bplistCreator from 'bplist-creator';

function writeFilesToSystemClipboard(paths: string[]): void {
  // binary plist로 경로 배열 인코딩
  const plistBuf = bplistCreator(paths);
  clipboard.writeBuffer('NSFilenamesPboardType', Buffer.from(plistBuf));
  // 이제 Finder에서 Cmd+V하면 파일이 복사됨
}
```

### 3-C. 대안: osascript (AppleScript) 사용

```typescript
import { execSync } from 'child_process';

// Finder 클립보드에서 파일 경로 읽기
function readFinderClipboardViaAppleScript(): string[] {
  try {
    const script = `
      tell application "System Events"
        try
          set clipData to the clipboard as «class furl»
          return POSIX path of clipData
        end try
      end tell
    `;
    const result = execSync(`osascript -e '${script}'`).toString().trim();
    return result ? [result] : [];
  } catch {
    return [];
  }
}

// Finder 클립보드에 파일 경로 쓰기
function writeFinderClipboardViaAppleScript(paths: string[]): void {
  const posixPaths = paths.map(p => `POSIX file "${p}"`).join(', ');
  const script = `set the clipboard to {${posixPaths}}`;
  execSync(`osascript -e '${script}'`);
}
```

### 3-D. 네이티브 모듈: `electron-clipboard-ex`

```typescript
// npm: electron-clipboard-ex (네이티브 Obj-C 바인딩)
const clipboardEx = require('electron-clipboard-ex');

const files = clipboardEx.readFilePaths();
// ['/path/to/file1.txt', '/path/to/file2.png']

clipboardEx.writeFilePaths(['/path/to/file1.txt']);
// Finder에서 Cmd+V 가능
```

내부적으로 Objective-C 사용:
```objc
// 읽기
NSPasteboard *pb = [NSPasteboard generalPasteboard];
NSArray *fileURLs = [pb readObjectsForClasses:@[[NSURL class]]
                                      options:@{NSPasteboardURLReadingFileURLsOnlyKey: @YES}];

// 쓰기
[pb clearContents];
NSMutableArray *urls = [NSMutableArray array];
for (NSString *path in filePaths) {
    [urls addObject:[NSURL fileURLWithPath:path]];
}
[pb writeObjects:urls];
```

### 필요한 npm 패키지:
- `bplist-parser` — "Binary plist parser" (binary plist 디코딩)
- `bplist-creator` — "Binary Mac OS X Plist creator" (binary plist 인코딩)
- `electron-clipboard-ex` — 네이티브 바인딩 (선택적, 더 robust)

---

## 4. VS Code의 접근 방식

VS Code의 `fileActions.ts`에서 발견한 패턴:

### 핵심 구조:
```typescript
// 두 가지 소스를 지원하는 union type
type FilesToPaste =
  | { type: 'paths'; files: URI[] }   // 파일 경로 기반
  | { type: 'data'; files: File[] };  // 파일 데이터 기반

async function getFilesToPaste(
  fileList: FileList | undefined,
  clipboardService: IClipboardService,
  hostService: IHostService
): Promise<FilesToPaste> {
  if (fileList && fileList.length > 0) {
    // 1순위: 네이티브 FileList에서 파일 경로 추출
    const resources = [...fileList]
      .map(file => getPathForFile(file))
      .filter(filePath => !!filePath && isAbsolute(filePath))
      .map(filePath => URI.file(filePath!));

    if (resources.length) {
      return { type: 'paths', files: resources };
    }

    // 디스크에서 읽을 수 없는 파일 (데이터로 처리)
    return { type: 'data', files: [...fileList].filter(file => !getPathForFile(file)) };
  } else {
    // 2순위: 내부 클립보드 서비스 (clipboardService.readResources())
    return {
      type: 'paths',
      files: resources.distinctParents(
        await clipboardService.readResources(),
        resource => resource
      )
    };
  }
}
```

### VS Code의 설계 특징:
1. **내부 클립보드 서비스** (`IClipboardService.readResources/writeResources`) — 앱 내 copy/paste
2. **네이티브 FileList** — 시스템 클립보드에서 drag/paste된 파일 처리
3. **`FileCopiedContext`** — UI 상태 관리용 context key (paste 메뉴 활성화 등)
4. **Cut 상태 관리** — `explorerService.setToCopy([], false)` 로 cut 후 paste 완료 시 상태 초기화
5. **이름 충돌 처리** — `incrementFileName()` 함수로 "file copy.txt", "file copy 2.txt" 등 생성

---

## 5. Internal vs System Clipboard 설계 패턴

### Pattern 1: Internal-only (단순, 앱 내에서만 동작)

```typescript
let clipboardFiles: {
  paths: string[];
  operation: 'copy' | 'cut';
} | null = null;

function copyFiles(paths: string[]) {
  clipboardFiles = { paths, operation: 'copy' };
}

function cutFiles(paths: string[]) {
  clipboardFiles = { paths, operation: 'cut' };
}

async function pasteFiles(destDir: string) {
  if (!clipboardFiles) return;
  for (const src of clipboardFiles.paths) {
    const dest = path.join(destDir, path.basename(src));
    if (clipboardFiles.operation === 'copy') {
      await fs.cp(src, dest, { recursive: true });
    } else {
      await fs.rename(src, dest);
    }
  }
  if (clipboardFiles.operation === 'cut') {
    clipboardFiles = null;
  }
}
```

### Pattern 2: System Clipboard Interop (Finder 호환)

위 섹션 3-A, 3-B 참조.

### Pattern 3: Hybrid (권장 — local + remote 지원)

```typescript
interface FileClipboardState {
  internal: {
    paths: string[];
    operation: 'copy' | 'cut';
    isRemote: boolean;
    workspaceId?: string;
  } | null;
}

const state: FileClipboardState = { internal: null };

function copyFiles(paths: string[], isRemote: boolean) {
  state.internal = { paths, operation: 'copy', isRemote };

  // 로컬 파일은 시스템 클립보드에도 쓰기 (Finder interop)
  if (!isRemote && process.platform === 'darwin') {
    writeFilesToSystemClipboard(paths);
  }
}

function cutFiles(paths: string[], isRemote: boolean) {
  state.internal = { paths, operation: 'cut', isRemote };
  // Cut은 시스템 클립보드에 쓰지 않음 (Finder에서 paste하면 원본 삭제 불가)
}

async function pasteFiles(destDir: string, isRemoteDest: boolean) {
  // 로컬 → 로컬: 시스템 클립보드 우선 확인
  if (!isRemoteDest) {
    const systemFiles = readFilesFromSystemClipboard();
    if (systemFiles && systemFiles.length > 0) {
      return performCopy(systemFiles, destDir);
    }
  }

  // Internal 클립보드 fallback
  if (state.internal) {
    if (state.internal.isRemote && !isRemoteDest) {
      // remote → local: 다운로드 후 배치
      return downloadAndPlace(state.internal.paths, destDir);
    } else if (!state.internal.isRemote && isRemoteDest) {
      // local → remote: 읽어서 업로드
      return uploadFiles(state.internal.paths, destDir);
    } else {
      // same realm: 직접 복사/이동
      return performCopy(state.internal.paths, destDir);
    }
  }
}
```

---

## 6. Remote Filesystem 고려사항

| 시나리오 | 처리 방법 |
|---|---|
| Remote → Remote (같은 서버) | Internal clipboard, 서버 사이드 `cp`/`mv` |
| Remote → Local | Internal clipboard → 파일 다운로드 → 로컬에 배치 |
| Local → Remote | System clipboard 읽기 → 파일 업로드 |
| Finder → Remote (paste) | System clipboard에서 경로 읽기 → 업로드 |
| Remote → Finder (paste) | **불가능** — remote 파일에 로컬 경로 없음 |
| Cut (remote) | Copy + delete-after-paste (atomic move 불가) |

### 핵심 제약:
- Remote 파일은 시스템 클립보드에 넣을 수 없음 (로컬 경로가 없으므로)
- Remote 파일의 "Copy to Finder" 동작은 "Download" 로 대체해야 함
- Cross-server copy (remote A → remote B)는 임시 파일을 경유해야 함

---

## 7. 구현 권장사항 (SDD Workbench)

### 아키텍처:

```
Renderer (React)              Main Process (Electron)
─────────────────            ─────────────────────────
Cmd+C on file tree    →      IPC: 'clipboard:copy-files'
                              ├─ internal state에 저장
                              └─ local이면 system clipboard에도 쓰기

Cmd+V on file tree    →      IPC: 'clipboard:paste-files'
                              ├─ system clipboard 확인 (Finder에서 복사한 파일?)
                              ├─ internal state 확인
                              └─ 파일 복사/이동 수행

Cmd+X on file tree    →      IPC: 'clipboard:cut-files'
                              ├─ internal state에 저장 (operation: 'cut')
                              └─ UI에 cut 시각 표시 (dimmed)
```

### IPC 채널 설계 (preload.ts에 추가):

```typescript
// preload.ts — contextBridge에 노출
fileClipboard: {
  copy: (paths: string[], isRemote: boolean) =>
    ipcRenderer.invoke('clipboard:copy-files', paths, isRemote),
  cut: (paths: string[], isRemote: boolean) =>
    ipcRenderer.invoke('clipboard:cut-files', paths, isRemote),
  paste: (destDir: string, isRemoteDest: boolean) =>
    ipcRenderer.invoke('clipboard:paste-files', destDir, isRemoteDest),
  readSystemFiles: () =>
    ipcRenderer.invoke('clipboard:read-system-files'),
  getState: () =>
    ipcRenderer.invoke('clipboard:get-state'),
}
```

### 필요한 패키지:
```bash
npm install bplist-parser bplist-creator
# 또는 더 robust한 방법:
npm install electron-clipboard-ex
```

### 우선순위:
1. **Phase 1**: Internal clipboard only (앱 내 copy/paste) — 가장 빠르고 단순
2. **Phase 2**: System clipboard 읽기 (Finder → 앱 paste 지원)
3. **Phase 3**: System clipboard 쓰기 (앱 → Finder paste 지원)
4. **Phase 4**: Remote ↔ Local cross-realm copy/paste
