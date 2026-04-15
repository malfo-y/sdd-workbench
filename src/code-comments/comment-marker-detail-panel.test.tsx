import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommentMarkerDetailPanel } from './comment-marker-detail-panel'
import type { CodeComment } from './comment-types'

const COMMENTS: readonly CodeComment[] = [
  {
    id: 'comment-1',
    relativePath: 'docs/spec.md',
    startLine: 3,
    endLine: 3,
    body: 'First detail comment',
    anchor: {
      snippet: 'alpha',
      hash: 'aaaa',
    },
    createdAt: '2026-02-22T00:00:00.000Z',
  },
  {
    id: 'comment-2',
    relativePath: 'docs/spec.md',
    startLine: 3,
    endLine: 4,
    body: 'Second detail comment',
    anchor: {
      snippet: 'beta',
      hash: 'bbbb',
    },
    createdAt: '2026-02-22T00:01:00.000Z',
  },
]

describe('CommentMarkerDetailPanel', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders full comment bodies and line metadata', () => {
    render(
      <CommentMarkerDetailPanel
        comments={COMMENTS}
        lineNumber={3}
        onClose={vi.fn()}
        onRequestDeleteComment={vi.fn()}
        onRequestEditComment={vi.fn()}
        x={120}
        y={80}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Comment details for line 3' }),
    ).toHaveTextContent('Comments on line 3')
    expect(screen.getByText('First detail comment')).toBeInTheDocument()
    expect(screen.getByText('Second detail comment')).toBeInTheDocument()
    expect(screen.getByText('docs/spec.md:L3')).toBeInTheDocument()
    expect(screen.getByText('docs/spec.md:L3-L4')).toBeInTheDocument()
  })

  it('forwards edit and delete actions for the selected comment', () => {
    const onRequestEditComment = vi.fn()
    const onRequestDeleteComment = vi.fn()
    const onClose = vi.fn()

    render(
      <CommentMarkerDetailPanel
        comments={COMMENTS}
        lineNumber={3}
        onClose={onClose}
        onRequestDeleteComment={onRequestDeleteComment}
        onRequestEditComment={onRequestEditComment}
        x={120}
        y={80}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    expect(onRequestEditComment).toHaveBeenCalledWith(COMMENTS[0])
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1])
    expect(onRequestDeleteComment).toHaveBeenCalledWith(COMMENTS[1])
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes on outside click and escape', () => {
    const onClose = vi.fn()

    render(
      <CommentMarkerDetailPanel
        comments={COMMENTS}
        lineNumber={3}
        onClose={onClose}
        onRequestDeleteComment={vi.fn()}
        onRequestEditComment={vi.fn()}
        x={120}
        y={80}
      />,
    )

    fireEvent.mouseDown(document.body)
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
