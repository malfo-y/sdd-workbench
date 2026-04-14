/**
 * Workspace file-tree indexing logic extracted from main.ts.
 * Builds file tree structures, resolves entry kinds, and handles
 * directory child pagination.
 */

import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import type { WorkspaceFileNode } from './ipc-types'
import {
  normalizeToWorkspaceRelativePath,
  sortWorkspaceTree,
  WORKSPACE_INDEX_DIRECTORY_CHILD_CAP,
  WORKSPACE_INDEX_IGNORE_NAMES,
} from './workspace-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BuildWorkspaceTreeResult = {
  nodes: WorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
}

export type IndexedWorkspaceEntry = {
  name: string
  absolutePath: string
  kind: 'file' | 'directory'
  isSymbolicLink: boolean
}

// ---------------------------------------------------------------------------
// Entry kind resolution
// ---------------------------------------------------------------------------

async function resolveWorkspaceEntryKind(
  absolutePath: string,
  entry: Dirent,
): Promise<Omit<IndexedWorkspaceEntry, 'name' | 'absolutePath'> | null> {
  if (entry.isFile()) {
    return {
      kind: 'file',
      isSymbolicLink: false,
    }
  }

  if (entry.isDirectory()) {
    return {
      kind: 'directory',
      isSymbolicLink: false,
    }
  }

  if (!entry.isSymbolicLink()) {
    return null
  }

  try {
    const targetStats = await stat(absolutePath)
    if (targetStats.isDirectory()) {
      return {
        kind: 'directory',
        isSymbolicLink: true,
      }
    }
    if (targetStats.isFile()) {
      return {
        kind: 'file',
        isSymbolicLink: true,
      }
    }
  } catch {
    return null
  }

  return null
}

// ---------------------------------------------------------------------------
// Directory scanning
// ---------------------------------------------------------------------------

export async function collectIndexedWorkspaceEntries(
  directoryPath: string,
): Promise<IndexedWorkspaceEntry[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const indexedEntries: IndexedWorkspaceEntry[] = []

  for (const entry of entries) {
    if (WORKSPACE_INDEX_IGNORE_NAMES.has(entry.name)) {
      continue
    }

    const absolutePath = path.join(directoryPath, entry.name)
    const entryKind = await resolveWorkspaceEntryKind(absolutePath, entry)
    if (!entryKind) {
      continue
    }

    indexedEntries.push({
      name: entry.name,
      absolutePath,
      ...entryKind,
    })
  }

  return indexedEntries
}

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

export async function buildWorkspaceTree(
  rootPath: string,
  currentDirectory: string,
  indexBudget: { remainingNodes: number; truncated: boolean },
  options?: { maxDepth?: number; currentDepth?: number },
): Promise<BuildWorkspaceTreeResult> {
  if (indexBudget.remainingNodes <= 0) {
    indexBudget.truncated = true
    return { nodes: [], childrenStatus: 'complete', totalChildCount: 0 }
  }

  const maxDepth = options?.maxDepth
  const currentDepth = options?.currentDepth ?? 0

  const eligibleEntries = await collectIndexedWorkspaceEntries(currentDirectory)

  const totalChildCount = eligibleEntries.length
  const isCapped = totalChildCount > WORKSPACE_INDEX_DIRECTORY_CHILD_CAP
  const cappedEntries = isCapped
    ? eligibleEntries.slice(0, WORKSPACE_INDEX_DIRECTORY_CHILD_CAP)
    : eligibleEntries
  const atDepthLimit = maxDepth !== undefined && currentDepth >= maxDepth
  const skipRecurse = isCapped || atDepthLimit

  const nodes: WorkspaceFileNode[] = []

  for (const entry of cappedEntries) {
    if (indexBudget.remainingNodes <= 0) {
      indexBudget.truncated = true
      break
    }

    const relativePath = normalizeToWorkspaceRelativePath(
      entry.absolutePath,
      rootPath,
    )

    if (!relativePath || relativePath.startsWith('..')) {
      continue
    }

    if (entry.kind === 'directory') {
      indexBudget.remainingNodes -= 1

      if (skipRecurse || entry.isSymbolicLink) {
        nodes.push({
          name: entry.name,
          relativePath,
          kind: 'directory',
          children: [],
          childrenStatus: 'not-loaded',
        })
        continue
      }

      const childResult = await buildWorkspaceTree(
        rootPath,
        entry.absolutePath,
        indexBudget,
        { maxDepth, currentDepth: currentDepth + 1 },
      )
      nodes.push({
        name: entry.name,
        relativePath,
        kind: 'directory',
        children: childResult.nodes,
        ...(childResult.childrenStatus === 'partial'
          ? {
              childrenStatus: childResult.childrenStatus,
              totalChildCount: childResult.totalChildCount,
            }
          : {}),
      })
      continue
    }

    if (entry.kind === 'file') {
      indexBudget.remainingNodes -= 1
      nodes.push({
        name: entry.name,
        relativePath,
        kind: 'file',
      })
    }
  }

  return {
    nodes: sortWorkspaceTree(nodes),
    childrenStatus: isCapped ? 'partial' : 'complete',
    totalChildCount,
  }
}

// ---------------------------------------------------------------------------
// Directory children (paginated)
// ---------------------------------------------------------------------------

export async function buildDirectoryChildren(
  rootPath: string,
  directoryPath: string,
  options?: { offset?: number; limit?: number },
): Promise<{
  children: WorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
}> {
  const eligibleEntries = await collectIndexedWorkspaceEntries(directoryPath)

  const nodes: WorkspaceFileNode[] = []
  for (const entry of eligibleEntries) {
    const relativePath = normalizeToWorkspaceRelativePath(
      entry.absolutePath,
      rootPath,
    )
    if (!relativePath || relativePath.startsWith('..')) {
      continue
    }

    if (entry.kind === 'directory') {
      nodes.push({
        name: entry.name,
        relativePath,
        kind: 'directory',
        children: [],
        childrenStatus: 'not-loaded',
      })
      continue
    }

    nodes.push({
      name: entry.name,
      relativePath,
      kind: 'file',
    })
  }

  const sortedNodes = sortWorkspaceTree(nodes)
  const totalChildCount = sortedNodes.length
  const rawOffset = options?.offset
  const parsedOffset =
    typeof rawOffset === 'number' && Number.isFinite(rawOffset)
      ? Math.max(0, Math.floor(rawOffset))
      : 0
  const rawLimit = options?.limit
  const parsedLimit =
    typeof rawLimit === 'number' && Number.isFinite(rawLimit)
      ? Math.max(1, Math.floor(rawLimit))
      : WORKSPACE_INDEX_DIRECTORY_CHILD_CAP
  const effectiveLimit = Math.min(parsedLimit, WORKSPACE_INDEX_DIRECTORY_CHILD_CAP)
  const pagedChildren = sortedNodes.slice(parsedOffset, parsedOffset + effectiveLimit)
  const hasMore = parsedOffset + pagedChildren.length < totalChildCount

  return {
    children: pagedChildren,
    childrenStatus: hasMore ? 'partial' : 'complete',
    totalChildCount,
  }
}
