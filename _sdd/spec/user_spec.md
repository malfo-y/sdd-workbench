## 🔷 CODEX IMPLEMENTATION PACKAGE (FINAL)

### Project: SDD Workbench (MVP)

---

## 1\. Context

This application is a **Spec-Driven Development (SDD) Workbench** for local repositories.

It is designed to:

- Keep Markdown spec documents continuously visible

- Reduce context switching while using interactive CLI tools (Codex CLI, Claude CLI, etc.)

- Provide lightweight context-copy utilities

- Reflect external file changes made by CLI tools

This application is NOT:

- A full IDE

- A terminal emulator

- A replacement for iTerm or Terminal.app

Interactive CLI usage will continue in external terminal applications.

The app acts as a **Spec-First Viewer + Context Orchestrator**.

---

## 2\. UI Layout (Structural Reference)

Use the attached UI reference image to guide layout and component boundaries.  
**The image is a layout reference only**, not a strict visual styling requirement.  
Focus on structure and behavior, not pixel-perfect design.

The app uses a 3-panel layout:

```markdown
---------------------------------------------------------
| File Browser | Code Viewer        | Spec Viewer      |
|              |                    | (Markdown Render)|
---------------------------------------------------------
| Top Toolbar: Context Actions                             |
---------------------------------------------------------
```

### Panels

Left:

- File Browser (workspace tree)

Center:

- Code Viewer (read-focused)

Right:

- Markdown Spec Viewer (rendered view)

Top:

- Global Toolbar (context actions)

---

## 3\. Technology Constraints

- Desktop app (macOS primary)

- Fully local

- No cloud services

- Must handle medium-sized repos (10k+ files)

Recommended stack (suggestion, not requirement):

- Electron or Tauri

- Monaco or CodeMirror for code

- remark/rehype for Markdown rendering

- Native filesystem watcher

---

## 4\. Core Functional Requirements (MVP)

---

### 4.1 Workspace Management

#### Open Workspace

User selects a directory as `workspaceRoot`.

App must:

- Recursively index files (paths + metadata only; do not read full content eagerly)

- Build file tree

- Start filesystem watcher

- Maintain explicit app state

State model:

```csharp
WorkspaceState {
  rootPath: string
  activeFile: string | null
  activeSpec: string | null
  changedFiles: string[]
}
```

---

### 4.2 File Browser (Left Panel)

Must:

- Display recursive tree

- Highlight active file

- Show changed files (● indicator)

- Allow clicking files to open

Click behavior:

- Non-md → open in Code Viewer

- .md → open in Code Viewer (raw) AND Spec Viewer (rendered)

---

### 4.3 Code Viewer (Center Panel)

Must:

- Syntax highlight code

- Display raw markdown when .md selected

- Support line scrolling

- Support programmatic line jump

- Track selected lines

No editing required for MVP (read-only acceptable).

---

### 4.4 Spec Viewer (Right Panel)

When a markdown file is active:

Must:

- Render GitHub-Flavored Markdown

- Render code blocks with syntax highlight

- Support heading anchors

- Auto-generate Table of Contents

- Detect and highlight current section in view (best-effort)

State:

```css
activeSpec: {
  path: string
  activeHeadingId?: string
}
```

---

### 4.5 Spec → Code Navigation

Support links in rendered Markdown of form:

- `path/to/file.ts`

- `path/to/file.ts#L10`

- `path/to/file.ts#L10-L20`

On click:

- Open file in Code Viewer

- Scroll to target line

- Highlight target lines

This is a high-priority feature.

---

### 4.6 Context Toolbar (Top Panel)

Toolbar must include:

1. Open Workspace in iTerm

2. Copy Current Spec Section

3. Copy Active File Path

4. Copy Selected Lines

---

#### 4.6.1 Open Workspace in iTerm

On click:

- Launch iTerm

- Open new tab at workspaceRoot

- If iTerm already running, open new tab

macOS only.

---

#### 4.6.2 Copy Current Spec Section

Must:

- Detect currently visible heading section

- Extract heading + content

- Preserve markdown formatting

- Copy to clipboard

Output format example:

```shell
## Rate Limiting Strategy

<content>
```

---

#### 4.6.3 Copy Active File Path

Copy relative path from workspace root.

---

#### 4.6.4 Copy Selected Lines

If selection exists in Code Viewer:

Copy:

```bash
src/auth.ts:L42-L68
<selected content>
```

---

### 4.7 File Change Detection

Must:

- Watch filesystem changes

- Track modified/created files

- Update `changedFiles`

- Mark changed files in tree

No diff view required.

---

## 5\. Non-Goals (Strict)

Do NOT implement:

- Integrated terminal emulator

- PTY handling / interactive terminal

- Git integration beyond file change detection

- Requirement-code trace mapping

- Multi-workspace support

- Plugin system

---

## 6\. Component Architecture

Recommended structure:

```nginx
App
 ├── WorkspaceProvider
 ├── Toolbar
 ├── FileTreePanel
 ├── CodeViewerPanel
 └── SpecViewerPanel
```

Responsibilities:

WorkspaceProvider:

- Centralized state

- File watcher

- Root path handling

FileTreePanel:

- File navigation

- Changed file indicators

CodeViewerPanel:

- Code display

- Line jump API

- Selection tracking

SpecViewerPanel:

- Markdown rendering

- Section detection

- Link interception

Toolbar:

- Context actions

- Clipboard integration

- iTerm launching

---

## 7\. Performance Considerations

- File indexing must not block UI

- Large markdown rendering must remain responsive

- File watcher must debounce updates

- Avoid full re-render on small state changes

- Ignore heavy directories by default (see Pitfalls section)

---

## 8\. Deliverables (Phase 1)

Implement:

1. Workspace selection

2. File tree

3. Code viewer

4. Markdown viewer

5. Spec → code link navigation

6. Toolbar actions

7. File change detection

After that, stop and present a structured implementation summary.

---

## 9\. Success Criteria

MVP is successful if:

- Spec remains visible while browsing code

- User can quickly copy relevant context to CLI

- File changes from CLI are visible

- Spec-to-code navigation works reliably

---

# 🔶 ADDENDUM: Pitfall Prevention Guide (Read Before Implementing)

## A. Scope Creep 방지

### A1) “IDE처럼 만들기” 금지

**Pitfall**: tabs/search/editing/LSP/git diff/refactor 등 IDE 기능 추가.  
**Rule**: MVP는 **read-first viewer**. 편집은 out-of-scope.

✅ Allowed: read-only, selection, copy  
❌ Not allowed: editing, multi-tab, project-wide search, LSP

### A2) “내장 터미널” 금지

**Pitfall**: xterm.js + PTY로 CLI 통합.  
**Rule**: 터미널은 외부(iTerm). 앱은 orchestration만.

✅ Allowed: Open in iTerm  
❌ Not allowed: PTY, ANSI emulation, interactive shell

---

## B. Markdown 렌더링 관련

### B1) 보안 / 로컬 리소스 처리

- Sanitize HTML

- Local images allowed only under workspace root

- Remote images: choose a clear default (recommended: allow, but provide a toggle later)

### B2) “현재 섹션 감지” 과도한 정밀도 집착 금지

- Use IntersectionObserver best-effort

- TOC highlight best-effort is enough

### B3) 링크 파싱 규칙 고정

Only support:

- `path/to/file.ts`

- `path/to/file.ts#L10`

- `path/to/file.ts#L10-L20`  
    Everything else behaves as normal links.

---

## C. File Tree / Indexing / Watcher

### C1) 대형 repo 성능

- Index paths + metadata only

- Read file content on demand

- Consider lazy expand for tree (virtualization optional)

### C2) watcher 폭주 방지

- Debounce updates (200–500ms)

- Use Set for changedFiles

### C3) 기본 ignore 목록 (강제)

Ignore:

- `.git/`

- `node_modules/`

- `dist/`, `build/`, `out/`

- `.next/`, `.turbo/` (if present)

---

## D. “Spec → Code Jump” 함정

### D1) Line number base

- `#L10` is **1-based** (GitHub convention)

- Convert carefully for viewer API (often 0-based)

### D2) Path resolution

- Interpret relative paths from workspaceRoot

- Absolute paths (`/…`) out-of-scope for MVP

### D3) Click interception

- Intercept anchor clicks in rendered markdown

- Route supported formats internally

- External links open in system browser

---

## E. Clipboard / Copy

### E1) Copy Section extraction

- Prefer Markdown AST slicing from active heading to next heading

- Best-effort DOM-based fallback acceptable

### E2) Copy Selected Lines format

Fixed output:

- First line: `relative/path.ts:Lx-Ly`

- Then the selected content

---

## F. iTerm Integration

### F1) Missing iTerm or AppleScript failures

- Must fail gracefully (toast/error)

- Optional fallback: Terminal.app (not required for MVP)

---

## G. Acceptance Checklist (Must all pass)

- workspaceRoot selection works

- file tree opens files

- selecting .md shows raw (center) + rendered (right)

- clicking `path.ts#L10-L20` jumps and highlights

- toolbar actions work (iTerm open / copy section / copy path / copy selection)

- external file changes update changed indicators

---

# End of Package

---
