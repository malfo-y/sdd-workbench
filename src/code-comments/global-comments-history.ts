export type GlobalCommentsHistoryEntry = {
  id: string
  body: string
  savedAt: string
}

const GLOBAL_COMMENTS_HISTORY_STORAGE_KEY =
  'sdd-workbench.global-comments-history.v1'
const MAX_GLOBAL_COMMENTS_HISTORY_ENTRIES = 20

type GlobalCommentsHistoryRecord = Record<string, GlobalCommentsHistoryEntry[]>

function canUseLocalStorage() {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined' &&
    typeof window.localStorage.getItem === 'function' &&
    typeof window.localStorage.setItem === 'function'
  )
}

function parseGlobalCommentsHistoryEntry(
  rawValue: unknown,
): GlobalCommentsHistoryEntry | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null
  }

  const record = rawValue as Record<string, unknown>
  if (
    typeof record.id !== 'string' ||
    typeof record.body !== 'string' ||
    typeof record.savedAt !== 'string'
  ) {
    return null
  }

  return {
    id: record.id,
    body: record.body,
    savedAt: record.savedAt,
  }
}

function loadGlobalCommentsHistoryRecord(): GlobalCommentsHistoryRecord {
  if (!canUseLocalStorage()) {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(
      GLOBAL_COMMENTS_HISTORY_STORAGE_KEY,
    )
    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([workspaceId, entries]) => [
        workspaceId,
        Array.isArray(entries)
          ? entries
              .map((entry) => parseGlobalCommentsHistoryEntry(entry))
              .filter(
                (entry): entry is GlobalCommentsHistoryEntry => entry !== null,
              )
          : [],
      ]),
    )
  } catch {
    return {}
  }
}

function saveGlobalCommentsHistoryRecord(record: GlobalCommentsHistoryRecord) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(
    GLOBAL_COMMENTS_HISTORY_STORAGE_KEY,
    JSON.stringify(record),
  )
}

export function loadGlobalCommentsHistory(
  workspaceId: string | null | undefined,
): GlobalCommentsHistoryEntry[] {
  if (!workspaceId) {
    return []
  }

  return loadGlobalCommentsHistoryRecord()[workspaceId] ?? []
}

export function appendGlobalCommentsHistory(
  workspaceId: string | null | undefined,
  body: string,
  savedAt = new Date().toISOString(),
) {
  if (!workspaceId) {
    return []
  }

  const record = loadGlobalCommentsHistoryRecord()
  const currentEntries = record[workspaceId] ?? []
  const latestEntry = currentEntries.at(-1)
  if (latestEntry?.body === body) {
    return currentEntries
  }

  const nextEntries = [
    ...currentEntries,
    {
      id: `${workspaceId}:${savedAt}:${body.length}`,
      body,
      savedAt,
    },
  ].slice(-MAX_GLOBAL_COMMENTS_HISTORY_ENTRIES)

  record[workspaceId] = nextEntries
  saveGlobalCommentsHistoryRecord(record)
  return nextEntries
}
