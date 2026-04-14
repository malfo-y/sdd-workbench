import {
  mergeDirectoryChildren,
  type WorkspaceSession,
} from './workspace-model'

export type ExpandedDirectoryHydrationTarget = {
  relativePath: string
  minimumChildCount: number
}

function collectFileRelativePaths(
  nodes: WorkspaceFileNode[],
  output = new Set<string>(),
): Set<string> {
  for (const node of nodes) {
    if (node.kind === 'file') {
      output.add(node.relativePath)
      continue
    }

    if (node.children) {
      collectFileRelativePaths(node.children, output)
    }
  }

  return output
}

function isFilePathPotentiallyPresent(
  tree: WorkspaceFileNode[],
  filePath: string,
): boolean {
  for (const node of tree) {
    if (node.kind === 'file' && node.relativePath === filePath) {
      return true
    }

    if (
      node.kind === 'directory' &&
      filePath.startsWith(node.relativePath + '/')
    ) {
      if (
        node.childrenStatus === 'not-loaded' ||
        node.childrenStatus === 'partial'
      ) {
        return true
      }

      if (node.children && isFilePathPotentiallyPresent(node.children, filePath)) {
        return true
      }
    }
  }

  return false
}

function findDirectoryNodeInTree(
  tree: WorkspaceFileNode[],
  directoryRelativePath: string,
): WorkspaceFileNode | null {
  if (directoryRelativePath === '') {
    return {
      kind: 'directory',
      relativePath: '',
      name: '',
      children: tree,
      childrenStatus: 'complete',
      totalChildCount: tree.length,
    }
  }

  for (const node of tree) {
    if (node.kind !== 'directory') {
      continue
    }

    if (node.relativePath === directoryRelativePath) {
      return node
    }

    if (
      directoryRelativePath.startsWith(node.relativePath + '/') &&
      node.children
    ) {
      const found = findDirectoryNodeInTree(node.children, directoryRelativePath)
      if (found) {
        return found
      }
    }
  }

  return null
}

function getParentPath(relativePath: string): string {
  const lastSlash = relativePath.lastIndexOf('/')
  return lastSlash < 0 ? '' : relativePath.slice(0, lastSlash)
}

function buildDirectoryNodeMap(
  tree: WorkspaceFileNode[],
  directoryNodeByPath = new Map<string, WorkspaceFileNode>(),
): Map<string, WorkspaceFileNode> {
  for (const node of tree) {
    if (node.kind !== 'directory') {
      continue
    }

    directoryNodeByPath.set(node.relativePath, node)
    if (node.children && node.children.length > 0) {
      buildDirectoryNodeMap(node.children, directoryNodeByPath)
    }
  }

  return directoryNodeByPath
}

export function getLoadedChildCountForDirectory(
  tree: WorkspaceFileNode[],
  directoryRelativePath: string,
): number {
  if (directoryRelativePath === '') {
    return tree.length
  }

  return findDirectoryNodeInTree(tree, directoryRelativePath)?.children?.length ?? 0
}

export function mergeDirectoryChildrenAtPath(
  tree: WorkspaceFileNode[],
  directoryRelativePath: string,
  children: WorkspaceFileNode[],
  childrenStatus: 'complete' | 'partial',
  totalChildCount: number,
  options?: { appendChildren?: boolean },
): WorkspaceFileNode[] {
  if (directoryRelativePath === '') {
    return options?.appendChildren
      ? [
          ...tree,
          ...children.filter(
            (childNode) =>
              !tree.some(
                (existingChildNode) =>
                  existingChildNode.relativePath === childNode.relativePath,
              ),
          ),
        ]
      : children
  }

  return mergeDirectoryChildren(
    tree,
    directoryRelativePath,
    children,
    childrenStatus,
    totalChildCount,
    options,
  )
}

export function reconcileWorkspaceSessionTreeState(
  workspaceSession: WorkspaceSession,
  nextFileTree: WorkspaceFileNode[],
): WorkspaceSession {
  const indexedFilePathSet = collectFileRelativePaths(nextFileTree)
  const activeFileStillExists =
    workspaceSession.activeFile !== null &&
    (indexedFilePathSet.has(workspaceSession.activeFile) ||
      isFilePathPotentiallyPresent(nextFileTree, workspaceSession.activeFile))
  const activeSpecStillExists =
    workspaceSession.activeSpec !== null &&
    (indexedFilePathSet.has(workspaceSession.activeSpec) ||
      isFilePathPotentiallyPresent(nextFileTree, workspaceSession.activeSpec))

  return {
    ...workspaceSession,
    fileTree: nextFileTree,
    changedFiles: workspaceSession.changedFiles.filter((relativePath) =>
      indexedFilePathSet.has(relativePath) ||
      isFilePathPotentiallyPresent(nextFileTree, relativePath),
    ),
    activeFile: activeFileStillExists ? workspaceSession.activeFile : null,
    activeSpec: activeSpecStillExists ? workspaceSession.activeSpec : null,
    activeFileContent: activeFileStillExists
      ? workspaceSession.activeFileContent
      : null,
    activeFileImagePreview: activeFileStillExists
      ? workspaceSession.activeFileImagePreview
      : null,
    activeFileGitLineMarkers: activeFileStillExists
      ? workspaceSession.activeFileGitLineMarkers
      : [],
    activeSpecContent: activeSpecStillExists
      ? workspaceSession.activeSpecContent
      : null,
    readFileError: activeFileStillExists ? workspaceSession.readFileError : null,
    activeSpecReadError: activeSpecStillExists
      ? workspaceSession.activeSpecReadError
      : null,
    previewUnavailableReason: activeFileStillExists
      ? workspaceSession.previewUnavailableReason
      : null,
    selectionRange: activeFileStillExists ? workspaceSession.selectionRange : null,
    isReadingFile: activeFileStillExists ? workspaceSession.isReadingFile : false,
    isReadingSpec: activeSpecStillExists ? workspaceSession.isReadingSpec : false,
  }
}

export function preserveExpandedDirectoryChildren(
  nextTree: WorkspaceFileNode[],
  previousTree: WorkspaceFileNode[],
  expandedDirectories: string[],
): WorkspaceFileNode[] {
  if (expandedDirectories.length === 0) {
    return nextTree
  }

  const expandedDirectorySet = new Set(expandedDirectories)
  const previousDirectoryNodeByPath = buildDirectoryNodeMap(previousTree)

  const visit = (nodes: WorkspaceFileNode[]): WorkspaceFileNode[] =>
    nodes.map((node): WorkspaceFileNode => {
      if (node.kind !== 'directory') {
        return node
      }

      const previousNode = previousDirectoryNodeByPath.get(node.relativePath)
      const previousChildren = previousNode?.children ?? []
      const nextChildren = node.children ?? []
      const shouldReuseLoadedChildren =
        expandedDirectorySet.has(node.relativePath) &&
        previousChildren.length > nextChildren.length &&
        (node.childrenStatus === 'not-loaded' ||
          node.childrenStatus === 'partial')

      if (shouldReuseLoadedChildren) {
        return {
          ...node,
          children: previousChildren,
          ...(previousNode?.childrenStatus
            ? { childrenStatus: previousNode.childrenStatus }
            : {}),
          ...(previousNode?.totalChildCount !== undefined
            ? { totalChildCount: previousNode.totalChildCount }
            : {}),
        }
      }

      return {
        ...node,
        children: visit(nextChildren),
      }
    })

  return visit(nextTree)
}

function findNearestRefreshableDirectoryPath(
  tree: WorkspaceFileNode[],
  changedRelativePath: string,
): string {
  let candidatePath = getParentPath(changedRelativePath)
  while (candidatePath) {
    if (findDirectoryNodeInTree(tree, candidatePath)) {
      return candidatePath
    }
    candidatePath = getParentPath(candidatePath)
  }

  return ''
}

export function collectStructureRefreshTargets(
  tree: WorkspaceFileNode[],
  changedRelativePaths: string[],
): ExpandedDirectoryHydrationTarget[] {
  if (changedRelativePaths.length === 0) {
    return []
  }

  return Array.from(
    new Set(
      changedRelativePaths.map((changedRelativePath) =>
        findNearestRefreshableDirectoryPath(tree, changedRelativePath),
      ),
    ),
  )
    .sort((leftPath, rightPath) => {
      const leftDepth = leftPath === '' ? 0 : leftPath.split('/').length
      const rightDepth = rightPath === '' ? 0 : rightPath.split('/').length
      if (leftDepth !== rightDepth) {
        return leftDepth - rightDepth
      }
      return leftPath.localeCompare(rightPath)
    })
    .map((relativePath) => ({
      relativePath,
      minimumChildCount: Math.max(
        getLoadedChildCountForDirectory(tree, relativePath),
        1,
      ),
    }))
}

export function collectExpandedDirectoryHydrationTargets(
  previousTree: WorkspaceFileNode[],
  nextTree: WorkspaceFileNode[],
  expandedDirectories: string[],
): ExpandedDirectoryHydrationTarget[] {
  if (expandedDirectories.length === 0) {
    return []
  }

  const previousDirectoryNodeByPath = buildDirectoryNodeMap(previousTree)

  return Array.from(new Set(expandedDirectories))
    .sort((leftPath, rightPath) => {
      const leftDepth = leftPath.split('/').length
      const rightDepth = rightPath.split('/').length
      if (leftDepth !== rightDepth) {
        return leftDepth - rightDepth
      }
      return leftPath.localeCompare(rightPath)
    })
    .flatMap((relativePath) => {
      const previousNode = previousDirectoryNodeByPath.get(relativePath)
      const previousLoadedChildCount = previousNode?.children?.length ?? 0
      const minimumChildCount = Math.max(previousLoadedChildCount, 1)
      const nextNode = findDirectoryNodeInTree(nextTree, relativePath)
      const nextLoadedChildCount = nextNode?.children?.length ?? 0
      const needsHydration =
        !nextNode ||
        nextNode.childrenStatus === 'not-loaded' ||
        nextLoadedChildCount < minimumChildCount

      return needsHydration ? [{ relativePath, minimumChildCount }] : []
    })
}

export function isIgnorableDirectoryHydrationError(
  errorMessage: string | undefined,
) {
  if (!errorMessage) {
    return false
  }

  return (
    errorMessage.includes('Target path is not a directory.') ||
    errorMessage.includes('ENOENT')
  )
}
