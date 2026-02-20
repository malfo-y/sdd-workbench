## 🔶 MVP+1 Feature: Inline Code Comments → Export to `_COMMENTS.md`

### Purpose (Why)

During SDD + agentic coding, users often notice implementation issues while reading code, but lose context when switching to terminal/agent prompts.  
This feature enables users to:

- Select a line range in Code Viewer

- Attach a short comment/note

- Accumulate multiple notes across files

- Export them into a structured `_COMMENTS.md` file that can be pasted into Codex/Claude CLI for batch fixes

This reduces context loss and creates a “task bundle” for agent-driven code modifications.

---

### Scope (What)

#### UX Flow

1. User selects a line range in Code Viewer

2. User triggers **Add Comment** (toolbar button or context menu)

3. A small modal/panel opens to enter comment text

4. Comment is saved into local app storage

5. User clicks **Export Comments** to generate/update `_COMMENTS.md` at workspace root

#### UI Requirements

- Add Comment action available only when a file is open and a line selection exists

- Highlight code lines with comments (different color from selected lines)

- Comments list panel (optional in MVP+1, but recommended):

  - shows existing comments

  - allows delete/edit comment text

  - clicking a comment focuses the file and jumps to its line range

---

### Data Model

Use 1-based line numbers (GitHub convention) for consistency.

```ts
type CodeComment = {
  id: string;           // stable unique id (uuid or timestamp-based)
  file: string;         // workspace-relative path
  startLine: number;    // 1-based inclusive
  endLine: number;      // 1-based inclusive
  body: string;         // user comment text
  createdAt: string;    // ISO timestamp
  snippet?: string;     // optional: first 1–2 lines of selected text for human locating
};
```

---

### Persistence Strategy

**Do not** use `_COMMENTS.md` as the primary source of truth.

- Primary storage: `workspaceRoot/.sdd-workbench/comments.json`

- Export artifact: `workspaceRoot/_COMMENTS.md`

Rationale:

- JSON is safe to update/edit/delete reliably

- Markdown is generated for human/agent consumption and can be overwritten deterministically

---

### Export Format: `_COMMENTS.md`

The format must be both human-readable and agent-friendly.

```md
# Code Comments

## src/auth.ts:L42-L68
- id: 2026-02-20T12:34:56Z-1
- createdAt: 2026-02-20T12:34:56Z
- snippet: "if await user.isMFAEnabled() {"
- note: MFA flow looks inverted; verify logic and add error handling.

## src/api/rateLimit.ts:L10-L20
- id: 2026-02-20T12:40:10Z-2
- createdAt: 2026-02-20T12:40:10Z
- snippet: "return res.status(429)"
- note: Align with spec section 2.2; exponential backoff required.
```

Rules:

- Group comments by `file:Lx-Ly`

- Preserve insertion order by default (or sort by file then line; choose one and keep stable)

- Always regenerate the whole file on export (overwrite)

---

### Non-Goals (Keep Complexity Controlled)

- No automatic line tracking across edits (line ranges are treated as a snapshot)

- No AST-based anchors or “sticky comments”

- No collaborative syncing

- No parsing of externally edited `_COMMENTS.md` (export is one-way)

If file edits shift lines, the stored `snippet` helps users re-locate context manually.

---

### Implementation Plan (Suggested)

1. Add selection-to-comment pipeline (UI → state → JSON persistence)

2. Add Export Comments action that generates `_COMMENTS.md`

3. (Optional) Add Comments list panel with jump-to-location + delete/edit

4. (Optional) Add gutter markers for commented ranges in Code Viewer

---

### Success Criteria

- Users can create comments from a selection in under 3 seconds

- Export produces a clean, structured `_COMMENTS.md`

- Users can paste `_COMMENTS.md` into Codex/Claude CLI and receive coherent batch changes

---
