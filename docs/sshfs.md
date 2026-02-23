# 🔷 MVP+3 Specification

## Feature: Remote Workspace via SSHFS

---

# 1\. Overview

This feature enables the SDD Workbench to operate on remote repositories mounted locally via SSHFS (or similar filesystem mounts).

The application will:

- Treat mounted remote directories as normal workspaces

- Provide polling-based file change detection

- Display minimal remote context in UI

The application will NOT:

- Implement SSH client functionality

- Implement SFTP protocol handling

- Install remote agents

- Manage authentication

Remote support is achieved through filesystem-level mounting handled externally.

---

# 2\. Remote Model

Remote workspaces are defined as:

> Any workspaceRoot located on a mounted filesystem (e.g., SSHFS).

Example:

```
코딩

/Volumes/remote-project  
/mnt/sshfs/server-repo
```

The app must treat them identically to local workspaces.

---

# 3\. Watcher Mode Strategy

## 3.1 Problem

Filesystem events may not be reliably emitted on mounted filesystems.

## 3.2 Solution

Introduce two watcher modes:

```
TypeScript

type WatchMode \= "native" | "polling"
```

### Default Behavior

- Local filesystem → native mode

- Mounted/unknown filesystem → polling mode

### Polling Mode

- Interval: 1000–2000ms (configurable constant)

- Compare:

  - file mtime

  - file size

- Update `changedFiles` if differences detected

---

# 4\. Remote Detection Strategy

No SSH detection logic required.

Instead, detect using heuristics:

Option A (recommended):

- If path starts with `/Volumes/` → assume remote

- Enable polling mode automatically

Option B:

- Always allow manual toggle in settings:

  - “Use polling watcher”

---

# 5\. UI Changes

Minimal.

## 5.1 Workspace Indicator

Top toolbar addition:

```
코딩

Workspace: remote-project  
Mode: Polling
```

Optional small badge:

```
코딩

\[REMOTE\]
```

No additional UI complexity required.

---

# 6\. iTerm Integration (Optional Enhancement)

If workspace is remote-mounted:

The existing:

```
코딩

Open Workspace in iTerm
```

still works (opens local mount path).

Optional future enhancement:

- “Open SSH Session” button

- Requires stored SSH config (out of scope for MVP+3)

---

# 7\. Performance Considerations

Polling mode must:

- Avoid full directory re-scan each interval

- Maintain lightweight file index cache

- Only diff metadata, not file contents

Large repos:

- Consider limiting polling to:

  - Open file

  - Recently changed files

  - Directories currently expanded in tree

(MVP+3 may use full-tree polling; optimization can be MVP+4.)

---

# 8\. Non-Goals

- No remote execution

- No port forwarding

- No remote terminal

- No remote extension system

- No authentication management

---

# 9\. Success Criteria

MVP+3 is successful if:

- User mounts remote repo via SSHFS

- App can open it as workspace

- File browsing works

- Markdown and code view work

- Comments persist correctly

- Export bundle works

- File changes made remotely are detected within polling interval

---

# 🔥 Design Philosophy

This feature preserves the core principle:

> The app orchestrates context.  
> Execution remains external.

Remote support is achieved through filesystem abstraction, not distributed runtime complexity.
