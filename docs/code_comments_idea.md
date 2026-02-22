# 🔷 MVP+1 Specification

## Feature Set: Inline Code Comments + LLM Export Bundle

---

# 1\. Overview

MVP+1 extends the SDD Workbench with:

1. Inline Code Comments (selection-based)

2. Structured comment persistence (JSON + `_COMMENTS.md`)

3. LLM Prompt Bundle export (clipboard + file)

4. Bundle length safety policy

This feature improves the “agentic coding loop” by allowing users to accumulate structured review notes and send them directly to LLM tools.

---

# 2\. Feature: Inline Code Comments

## 2.1 Purpose

Allow users to:

- Select one or more lines in Code Viewer

- Attach a comment

- Persist it outside the source code

- Re-export it later for LLM-based modification

This avoids modifying the actual code while preserving location context.

---

## 2.2 Data Model

```
TypeScript

type CodeComment \= {  
  id: string;  
  file: string;            // workspace-relative path  
  startLine: number;       // 1-based inclusive  
  endLine: number;         // 1-based inclusive  
  body: string;            // user comment text  
  createdAt: string;       // ISO timestamp  
  
  anchor: {  
    snippet: string;      // first 1–3 lines or up to N chars  
    hash: string;         // hash(normalized snippet)  
    before?: string;     // optional: line before selection  
    after?: string;      // optional: line after selection  
  };  
  
  status?: "ok" | "moved" | "missing";  
};
```

### Design Notes

- Line numbers are treated as a snapshot.

- Snippet is the primary human-readable anchor.

- Hash is reserved for potential relocation logic.

- No AST-based tracking in MVP+1.

---

## 2.3 Persistence

Primary storage:

```
코딩

workspaceRoot/.sdd-workbench/comments.json
```

Export artifact:

```
코딩

workspaceRoot/\_COMMENTS.md
```

### Rules

- JSON is the source of truth.

- `_COMMENTS.md` is fully regenerated on export.

- External edits to `_COMMENTS.md` are not parsed back.

---

# 3\. `_COMMENTS.md` Export Format

```
Markdown

\# Code Comments  
  
\## src/auth.ts:L42-L68  
Snippet:  
if (await user.isMFAEnabled()) {  
...  
Comment:  
MFA flow looks inverted; verify logic and add error handling.  
  
\## src/api/rateLimit.ts:L10-L20  
Snippet:  
return res.status(429)  
Comment:  
Align with spec section 2.2; exponential backoff required.
```

Rules:

- Group by file + line range

- Deterministic ordering (choose one: insertion order or file+line sort)

- No incremental append — always overwrite

---

# 4\. Feature: LLM Prompt Bundle Export

## 4.1 Purpose

Enable one-click generation of a structured LLM-ready instruction bundle that includes:

- User instruction

- Structured comments

- Location context (file + line + snippet)

This bundle can be pasted directly into Codex CLI or Claude CLI.

---

## 4.2 Export Flow

1. User clicks **Export Comments**

2. Modal appears:

    - Text field: "Instruction for LLM"

    - Checkbox: Copy to Clipboard (default ON)

    - Checkbox: Save `_COMMENTS.md` (default ON)

    - Checkbox: Save Bundle File (optional)

3. On confirm:

    - Generate `_COMMENTS.md`

    - Generate LLM bundle text

    - Apply length policy (see section 5)

    - Copy and/or save

---

## 4.3 Bundle Format

Example:

```
Markdown

You are an autonomous coding agent. Please apply the following review comments.  
  
User instruction:  
이 코멘트들을 반영해서 코드를 수정해 줘.  
  
Constraints:  
\- Preserve existing behavior unless explicitly modified.  
\- If uncertain, leave TODO comments and explain.  
  
Comments:  
  
1) src/auth.ts:L42-L68  
Snippet:  
if (await user.isMFAEnabled()) {  
...  
Comment:  
MFA flow looks inverted; verify logic and add error handling.  
  
2) src/api/rateLimit.ts:L10-L20  
Snippet:  
return res.status(429)  
Comment:  
Align with spec section 2.2; exponential backoff required.
```

---

# 5\. Bundle Length Safety Policy

## 5.1 Rationale

LLM context windows are limited.  
Large bundles may exceed practical token limits.

---

## 5.2 Policy

Define:

```
TypeScript

const MAX\_CLIPBOARD\_CHARS \= 30000; // configurable
```

Behavior:

- If bundle.length <= MAX\_CLIPBOARD\_CHARS:

  - Allow clipboard copy

- If bundle.length > MAX\_CLIPBOARD\_CHARS:

  - Disable "Copy to Clipboard"

  - Show warning:

        > "Bundle too large for clipboard. Saved to file only."

  - Save bundle to file only

---

## 5.3 Bundle File Location

If enabled:

```
코딩

workspaceRoot/.sdd-workbench/exports/  
  2026-02-21T14-32-10-comments-bundle.md
```

Timestamp-based naming required.

---

# 6\. Non-Goals (MVP+1)

- No automatic line relocation across edits

- No AST-based anchors

- No inline modification of source files

- No collaborative sync

- No live LLM integration (clipboard only)

---

# 7\. Success Criteria

MVP+1 is successful if:

- Users can add comments in under 3 seconds

- Comments persist reliably

- Export produces clean `_COMMENTS.md`

- LLM bundle is copy-paste ready

- Large bundles fail gracefully (clipboard disabled)

---

# 8\. Design Philosophy

This feature reinforces the Workbench principle:

> The app does not modify code.  
> It structures intent and context for agent-driven modification.
