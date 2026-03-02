import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExportCommentsModal } from './export-comments-modal'

const DEFAULT_PROPS = {
  isOpen: true,
  isExporting: false,
  commentCount: 3,
  pendingCommentCount: 2,
  hasGlobalComments: false,
  allowExportWithoutPendingComments: false,
  maxClipboardChars: 100000,
  estimateBundleLength: () => 500,
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
}

describe('ExportCommentsModal', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows "N comment(s) included" when hasGlobalComments is false', () => {
    render(
      <ExportCommentsModal
        {...DEFAULT_PROPS}
        commentCount={3}
        hasGlobalComments={false}
      />,
    )

    expect(screen.getByText('3 comment(s) included')).toBeInTheDocument()
  })

  it('shows "N comment(s) + global comments included" when hasGlobalComments is true', () => {
    render(
      <ExportCommentsModal
        {...DEFAULT_PROPS}
        commentCount={3}
        hasGlobalComments={true}
      />,
    )

    expect(screen.getByText('3 comment(s) + global comments included')).toBeInTheDocument()
  })

  it('does not show "+ global comments" suffix when hasGlobalComments is false', () => {
    render(
      <ExportCommentsModal
        {...DEFAULT_PROPS}
        commentCount={5}
        hasGlobalComments={false}
      />,
    )

    expect(screen.queryByText(/\+ global comments/)).not.toBeInTheDocument()
    expect(screen.getByText('5 comment(s) included')).toBeInTheDocument()
  })

  it('works with 0 comments and global comments present', () => {
    render(
      <ExportCommentsModal
        {...DEFAULT_PROPS}
        commentCount={0}
        hasGlobalComments={true}
        allowExportWithoutPendingComments={true}
      />,
    )

    expect(screen.getByText('0 comment(s) + global comments included')).toBeInTheDocument()
  })

  it('cancels on Escape when idle', () => {
    const onCancel = vi.fn()

    render(
      <ExportCommentsModal
        {...DEFAULT_PROPS}
        onCancel={onCancel}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape while exporting', () => {
    const onCancel = vi.fn()

    render(
      <ExportCommentsModal
        {...DEFAULT_PROPS}
        isExporting
        onCancel={onCancel}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCancel).not.toHaveBeenCalled()
  })
})
