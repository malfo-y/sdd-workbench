# F15 Smoke Test Checklist (Remote Workspace via SSHFS)

## Scope
- F15: Remote workspace detection (`/Volumes`), watch mode preference (`Auto/Native/Polling`), polling fallback, persistence.

## Prerequisites
- Dependencies installed: `npm install`
- App run command: `npm run dev`
- Optional remote mount path prepared (example): `/Volumes/<mounted-sshfs-workspace>`

## Checklist

### 1) App launch
- [ ] Run `npm run dev` and confirm app opens normally.
- [ ] No immediate crash or blank screen.

### 2) Local workspace behavior
- [ ] Open a local workspace (example: `/Users/<you>/...`).
- [ ] Verify `REMOTE` badge is **not** shown in Current Workspace card.
- [ ] Verify watch mode shows `Native` or `Polling` and selector is available (`Auto/Native/Polling`).
- [ ] Change watch mode preference once (ex: `Auto -> Polling`) and confirm mode text updates.

### 3) Remote(`/Volumes`) auto mode behavior
- [ ] Open a workspace under `/Volumes/...`.
- [ ] Verify `REMOTE` badge is shown.
- [ ] With preference `Auto`, verify resolved watch mode is `Polling`.
- [ ] Edit/create/delete a file externally and confirm tree update appears (polling interval ~1.5s).

### 4) Native fallback behavior (recommended)
- [ ] In `/Volumes/...` workspace, set preference to `Native`.
- [ ] Verify app falls back to `Polling` when native watch is unavailable.
- [ ] Verify fallback warning banner is shown.

### 5) Preference persistence
- [ ] Set a non-default preference for current workspace (ex: `Polling`).
- [ ] Close app completely and relaunch.
- [ ] Verify opened workspaces restore.
- [ ] Verify per-workspace watch mode preference restores and resolved mode is consistent.

### 6) Regression sanity
- [ ] Open/close workspace still works.
- [ ] File watcher still reflects file content changes for active file.
- [ ] No repeated error banner loop while idle.

### 7) Remote external open sanity (F39)
- [ ] Connect a remote workspace with `Host`, `Remote Root`, and `SSH Alias for VSCode`.
- [ ] Click `Open in iTerm` and verify a new iTerm window/session starts an SSH login for the current remote target.
- [ ] Click `Open in VSCode` and verify VS Code opens a Remote-SSH window for the configured alias and remote root.
- [ ] Click `Open in Finder` on the remote workspace and verify the app shows an explicit unsupported message instead of a generic local path error.
- [ ] Repeat `Open in iTerm`, `Open in VSCode`, and `Open in Finder` on a local workspace and verify local behavior still works.

## Quick commands
```bash
npm run dev
npm test
npm run lint
```
