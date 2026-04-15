import type { GitFileStatusKind } from '../workspace/workspace-model'

export function GitStatusBadge({
  status,
  testId,
}: {
  status: GitFileStatusKind
  testId: string
}) {
  const badgeText = status === 'modified' ? 'M' : 'U'
  const badgeTitle =
    status === 'modified'
      ? 'Modified'
      : status === 'untracked'
        ? 'Untracked'
        : 'Added'

  return (
    <span
      aria-hidden
      className={`tree-git-status-badge tree-git-status-badge--${status}`}
      data-testid={testId}
      title={badgeTitle}
    >
      {badgeText}
    </span>
  )
}
