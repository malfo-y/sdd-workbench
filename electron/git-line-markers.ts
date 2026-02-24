export type WorkspaceGitLineMarkerKind = 'added' | 'modified'

export type WorkspaceGitLineMarker = {
  line: number
  kind: WorkspaceGitLineMarkerKind
}

const HUNK_HEADER_PATTERN = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

function parseHunkCount(rawValue: string | undefined): number {
  if (rawValue === undefined) {
    return 1
  }

  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }
  return parsed
}

function applyMarker(
  lineMarkerByLine: Map<number, WorkspaceGitLineMarkerKind>,
  line: number,
  kind: WorkspaceGitLineMarkerKind,
) {
  if (line < 1) {
    return
  }

  const existingKind = lineMarkerByLine.get(line)
  if (existingKind === 'modified') {
    return
  }

  if (kind === 'modified') {
    lineMarkerByLine.set(line, 'modified')
    return
  }

  if (!existingKind) {
    lineMarkerByLine.set(line, 'added')
  }
}

export function parseGitDiffLineMarkers(diffText: string): WorkspaceGitLineMarker[] {
  const lineMarkerByLine = new Map<number, WorkspaceGitLineMarkerKind>()
  const lines = diffText.split('\n')

  for (const line of lines) {
    const hunkMatch = line.match(HUNK_HEADER_PATTERN)
    if (!hunkMatch) {
      continue
    }

    const oldCount = parseHunkCount(hunkMatch[2])
    const newStartLine = Number.parseInt(hunkMatch[3], 10)
    const newCount = parseHunkCount(hunkMatch[4])

    if (!Number.isFinite(newStartLine) || newStartLine < 1) {
      continue
    }

    if (newCount <= 0) {
      // deletion-only hunk is out of scope for MVP markers.
      continue
    }

    if (oldCount <= 0) {
      for (let offset = 0; offset < newCount; offset += 1) {
        applyMarker(lineMarkerByLine, newStartLine + offset, 'added')
      }
      continue
    }

    const overlapCount = Math.min(oldCount, newCount)
    for (let offset = 0; offset < overlapCount; offset += 1) {
      applyMarker(lineMarkerByLine, newStartLine + offset, 'modified')
    }

    if (newCount > oldCount) {
      for (let offset = oldCount; offset < newCount; offset += 1) {
        applyMarker(lineMarkerByLine, newStartLine + offset, 'added')
      }
    }
  }

  return Array.from(lineMarkerByLine.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([line, kind]) => ({ line, kind }))
}
