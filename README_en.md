# SDD Workbench

SDD Workbench is an Electron desktop app for spec-driven development workflows.
It lets you browse code and Markdown specs, edit files, leave structured comments, and work with local or remote workspaces from one UI.

## Current Product Shape

- 2-panel layout: left sidebar + right content tabs (`Code` / `Spec`)
- Multi-workspace management (open/switch/close)
- CodeMirror 6 editor (editable, save, search, wrap toggle)
- Rendered spec navigation (link jump, `Go to Source`, in-panel anchor scroll)
- Inline comments on code/spec + global comments + bundle export
- Remote workspace via Remote Agent Protocol over SSH (F27/F28)
- Watch mode control (`Auto` / `Native` / `Polling`) with fallback handling
- Git indicators in tree (U/M) + line markers in active code file

## Requirements

### Local

- Node.js >= 18
- npm >= 9
- Desktop environment that can run Electron applications

### Remote (only for Remote Workspace)

- SSH access to target host
- Remote shell (`sh`/`bash`) available
- Node.js installed on remote host (`node` in PATH)
- Read/write permission to selected remote root

## Install

```bash
git clone https://github.com/hyunjoonlee/sdd-workbench.git
cd sdd-workbench
npm install
```

## Run

### Development

```bash
npm run dev
```

### Test / Lint / Build

```bash
npm test
npm run lint
npm run build
```

Notes:
- `npm test` and `npm run build` also regenerate the remote agent runtime payload.
- `npm run build` performs runtime build + TypeScript compile + Vite build + `electron-builder` packaging.

## Quick Start

### 1) Open a local workspace

1. Launch the app.
2. Click the workspace `Open` icon in the left sidebar.
3. Choose your project directory.
4. Select files from the tree.

### 2) Switch content tabs

- `Code` tab: editable code/file preview
- `Spec` tab: rendered Markdown spec view
- Auto tab switch:
  - `.md` file selection -> `Spec`
  - non-`.md` file selection -> `Code`

### 3) Navigate spec <-> code

- In `Spec`, click relative links like `src/foo.ts#L10` to open code and jump lines.
- Select spec text and use context action `Go to Source`.
- Same-document anchors (`#heading`) scroll within the current spec panel.

## Detailed Usage

### Workspace sidebar

The left sidebar includes:
- workspace selector
- open local workspace
- connect remote workspace
- close workspace
- current workspace summary (mode, remote status, watch mode)
- `Open In` actions (terminal / VSCode)
- file tree

Keyboard shortcuts:
- `Cmd+Ctrl+Up` / `Cmd+Ctrl+Down`: previous/next workspace
- `Cmd+Ctrl+Left` / `Cmd+Ctrl+Right`: `Code`/`Spec` tab switch

### File tree operations

Right-click file/directory nodes:
- `Copy Relative Path`
- `New File`
- `New Directory`
- `Rename`
- `Delete`

Behavior details:
- lazy directory loading and large tree caps are applied for performance
- changed markers bubble to visible parent directories when children are collapsed
- git file badges:
  - `U` = untracked/added
  - `M` = modified

### Code editor

`Code` tab features:
- direct editing
- `Cmd+S` save
- dirty state guard on navigation/close
- search (`Cmd+F`) with next/prev and wrap-around
- line wrap toggle (`Wrap On` / `Wrap Off`, default On)
- line-level git markers for active file (`added` / `modified`)
- inline comment badges in gutter with hover preview

Context menu actions:
- `Copy Line Contents`
- `Copy Contents and Path`
- `Copy Relative Path`
- `Add Comment`

### Spec viewer

`Spec` tab features:
- rendered Markdown with TOC
- relative path link interception + in-app open/jump
- same-document anchor scroll handling
- selection actions:
  - `Add Comment`
  - `Go to Source`
- comment markers + hover preview

### Comment workflow

#### Add line comment

1. Select code lines or spec text.
2. Run `Add Comment`.
3. Save comment.

#### Manage comments

Use `View Comments` to:
- review all line comments
- edit/delete individual comments
- delete exported comments
- click target and jump to file/line
- edit/clear global comments inline
- choose whether global comments are included in export

#### Export

Use `Export Comments` to write:
- `_COMMENTS.md` in workspace root
- timestamped bundle file in `.sdd-workbench/exports/`

Source-of-truth files:
- `.sdd-workbench/comments.json`
- `.sdd-workbench/global-comments.md`

### Remote workspace (Remote Agent Protocol)

#### Connect flow

1. Click `Connect Remote Workspace`.
2. Fill profile fields:
   - `Host` (required)
   - `User`, `Port` (optional)
   - `Identity File` (optional)
   - `Agent Path` (optional, default recommended)
3. Click `Browse Directories`.
4. In Step 2 (`Directory`), navigate and click `Use Current Directory`.
5. Click `Connect`.

MVP behavior:
- profile draft is persisted locally and reused
- runtime deployment/overwrite + healthcheck/protocol validation are performed during connect
- remote workspace then uses the same `workspace:*` contract as local

SSH key option:
- if `Identity File` is set, connection uses SSH `-i <identityFile>` with `IdentitiesOnly=yes`

#### Remote status and recovery

In current workspace card:
- `REMOTE` badge + connection status (`CONNECTING` / `CONNECTED` / `DISCONNECTED` / `DEGRADED`)
- `Last error` code display
- `Retry Connect` and `Disconnect Remote` actions

### Watch mode

Per workspace watch mode:
- `Auto`: choose best mode by workspace type
- `Native`: native file watcher preferred
- `Polling`: interval-based polling watcher

Fallback behavior:
- if native watcher cannot start, app falls back to polling and shows a banner

## Persistence and Logs

### Session persistence

The app restores workspace session state across restart, including:
- open workspaces
- active files/spec
- expanded directories
- watch mode preference

### Remote logs

Remote connection/runtime logs are written to:
- macOS: `~/Library/Application Support/sdd-workbench/logs/remote-agent.log`
- Linux: `~/.config/sdd-workbench/logs/remote-agent.log`
- Windows: `%APPDATA%/sdd-workbench/logs/remote-agent.log`

## Troubleshooting

### 1) `BOOTSTRAP_FAILED` on remote connect

Check:
- remote host has `node` in PATH
- identity file path is valid on local machine
- remote root exists and is readable
- agent path is executable/accessible

Manual remote probe example:

```bash
ssh -i ~/.ssh/id_ed25519 -p <PORT> <USER>@<HOST> \
  '$HOME/.sdd-workbench/bin/sdd-remote-agent --protocol-version'
```

### 2) `CONNECTION_CLOSED` after connect attempt

Check `remote-agent.log` first. Common causes:
- SSH auth mismatch
- remote command startup failure
- protocol bootstrap mismatch

### 3) `Workspace index truncated at 100,000 nodes`

Current behavior is expected for very large trees.
Navigate deeper and/or set narrower remote root to reduce index scope.

### 4) Polling mode is active

This is expected in remote sessions and in native watcher fallback scenarios.
You can still work normally; updates are detected by polling interval.

## Project Structure

```text
src/
  App.tsx                     # App shell and orchestration
  workspace/                  # Workspace state, persistence, remote connect modal
  file-tree/                  # File tree UI, lazy loading, CRUD interactions
  code-editor/                # CodeMirror 6 editor and gutter extensions
  spec-viewer/                # Rendered Markdown view + link/source actions
  code-comments/              # Comment domain, modals, export
electron/
  main.ts                     # IPC handlers, watcher lifecycle, backend routing
  preload.ts                  # Typed window.workspace bridge
  workspace-backend/          # Local/remote backend abstraction
  remote-agent/               # SSH transport, bootstrap, protocol, runtime
scripts/
  build-remote-agent-runtime.mjs
_sdd/
  spec/                       # Living specification
  implementation/             # Plan/progress/review records
```

## Spec and Reference Docs

- Spec index: [`_sdd/spec/main.md`](_sdd/spec/main.md)
- Spec summary: [`_sdd/spec/SUMMARY.md`](_sdd/spec/SUMMARY.md)

## License

Private repository (internal use).
