import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommentHoverPopover } from './comment-hover-popover'
import type { CodeComment } from './comment-types'

const COMMENTS: readonly CodeComment[] = [
  {
    id: 'comment-1',
    relativePath: 'docs/spec.md',
    startLine: 4,
    endLine: 4,
    body: 'First hover comment body',
    anchor: {
      snippet: 'Paragraph',
      hash: 'aaaa',
    },
    createdAt: '2026-02-22T00:00:00.000Z',
  },
  {
    id: 'comment-2',
    relativePath: 'docs/spec.md',
    startLine: 4,
    endLine: 5,
    body: 'Second hover comment body',
    anchor: {
      snippet: 'Paragraph',
      hash: 'bbbb',
    },
    createdAt: '2026-02-22T00:01:00.000Z',
  },
]

describe('CommentHoverPopover', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders comment previews and optional detail action', () => {
    const onOpenDetails = vi.fn()

    render(
      <CommentHoverPopover
        comments={COMMENTS}
        lineNumber={4}
        onClose={vi.fn()}
        onOpenDetails={onOpenDetails}
        x={120}
        y={80}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Comment previews' })).toHaveTextContent(
      'Comments on line 4',
    )
    expect(screen.getByText('First hover comment body')).toBeInTheDocument()
    expect(screen.getByText('Second hover comment body')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open details' }))
    expect(onOpenDetails).toHaveBeenCalledTimes(1)
  })

  it('closes on outside click and escape', () => {
    const onClose = vi.fn()

    render(
      <CommentHoverPopover
        comments={COMMENTS}
        lineNumber={4}
        onClose={onClose}
        x={120}
        y={80}
      />,
    )

    fireEvent.mouseDown(document.body)
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
