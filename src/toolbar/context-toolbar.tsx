type ContextToolbarProps = {
  disableCopyActiveFilePath: boolean
  disableCopySelectedLines: boolean
  onCopyActiveFilePath: () => void
  onCopySelectedLines: () => void
}

export function ContextToolbar({
  disableCopyActiveFilePath,
  disableCopySelectedLines,
  onCopyActiveFilePath,
  onCopySelectedLines,
}: ContextToolbarProps) {
  return (
    <div className="context-toolbar" data-testid="context-toolbar">
      <button
        disabled={disableCopyActiveFilePath}
        onClick={onCopyActiveFilePath}
        type="button"
      >
        Copy Active File Path
      </button>
      <button
        disabled={disableCopySelectedLines}
        onClick={onCopySelectedLines}
        type="button"
      >
        Copy Selected Lines
      </button>
    </div>
  )
}
