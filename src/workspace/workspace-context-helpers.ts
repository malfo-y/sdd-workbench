import {
  getWorkspaceDocumentSession,
  type DocumentSaveState,
  type WorkspaceSession,
} from './workspace-model'

function isMarkdownFile(relativePath: string) {
  return relativePath.toLowerCase().endsWith('.md')
}

export function getWorkspaceDocumentSaveState(
  session: WorkspaceSession,
  relativePath: string | null,
): DocumentSaveState | null {
  if (!relativePath) {
    return null
  }
  const saveState = session.documentSessionsByPath[relativePath]?.saveState ?? null
  if (saveState) {
    return saveState
  }
  return relativePath === session.activeFile && session.isDirty ? 'dirty' : 'clean'
}

export function getWorkspaceActiveDocumentSaveState(
  session: WorkspaceSession,
): DocumentSaveState | null {
  return getWorkspaceDocumentSaveState(session, session.activeFile)
}

export function getWorkspaceIsDirtyCompatibility(
  session: WorkspaceSession,
): boolean {
  const saveState = getWorkspaceActiveDocumentSaveState(session)
  if (saveState === null) {
    return false
  }
  return saveState !== 'clean'
}

export function getWorkspaceDocumentDraftContent(
  session: WorkspaceSession,
  relativePath: string | null,
): string | null {
  if (!relativePath) {
    return null
  }

  return getWorkspaceDocumentSession(session, relativePath)?.draftContent ?? null
}

export function syncWorkspaceDisplayedDocumentContent(
  session: WorkspaceSession,
): WorkspaceSession {
  const activeFileDraftContent = getWorkspaceDocumentDraftContent(
    session,
    session.activeFile,
  )
  const activeSpecDraftContent =
    session.activeSpec !== null && isMarkdownFile(session.activeSpec)
      ? getWorkspaceDocumentDraftContent(session, session.activeSpec)
      : null

  const nextActiveFileContent =
    activeFileDraftContent ?? session.activeFileContent
  const nextActiveSpecContent =
    activeSpecDraftContent ?? session.activeSpecContent

  if (
    nextActiveFileContent === session.activeFileContent &&
    nextActiveSpecContent === session.activeSpecContent
  ) {
    return session
  }

  return {
    ...session,
    activeFileContent: nextActiveFileContent,
    activeSpecContent: nextActiveSpecContent,
  }
}

export function getWorkspaceIndexTruncationMessage(workspaceIndexNodeCap: number) {
  return `Workspace index truncated at ${workspaceIndexNodeCap.toLocaleString()} nodes.`
}
