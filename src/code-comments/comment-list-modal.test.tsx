import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommentListModal } from './comment-list-modal'
import type { CodeComment } from './comment-types'

const COMMENTS: readonly CodeComment[] = [
  {
    id: 'b-comment',
    relativePath: 'src/b.ts',
    startLine: 5,
    endLine: 5,
    body: 'Second comment body',
    anchor: { snippet: 'line', hash: 'bbbb' },
    createdAt: '2026-02-22T00:01:00.000Z',
  },
  {
    id: 'a-comment',
    relativePath: 'src/a.ts',
    startLine: 2,
    endLine: 3,
    body: 'First comment body',
    anchor: { snippet: 'line', hash: 'aaaa' },
    createdAt: '2026-02-22T00:00:00.000Z',
    exportedAt: '2026-02-22T01:00:00.000Z',
  },
]

describe('CommentListModal', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('does not render when closed', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        isOpen={false}
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => undefined}
        onDeleteExportedComments={() => undefined}
        onUpdateComment={() => undefined}
      />,
    )

    expect(screen.queryByRole('dialog', { name: 'View comments' })).not.toBeInTheDocument()
  })

  it('renders sorted comments and supports body expansion', () => {
    const longBody = `${'line '.repeat(60)}\nnext line`
    render(
      <CommentListModal
        comments={[
          ...COMMENTS,
          {
            id: 'c-comment',
            relativePath: 'src/c.ts',
            startLine: 1,
            endLine: 1,
            body: longBody,
            anchor: { snippet: 'line', hash: 'cccc' },
            createdAt: '2026-02-22T00:02:00.000Z',
          },
        ]}
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => undefined}
        onDeleteExportedComments={() => undefined}
        onUpdateComment={() => undefined}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('src/a.ts:L2-L3')
    expect(items[1]).toHaveTextContent('src/b.ts:L5')

    const expandButton = screen.getByRole('button', { name: 'Expand' })
    fireEvent.click(expandButton)
    expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument()
    expect(screen.getByText((text) => text.includes('next line'))).toBeInTheDocument()
  })

  it('edits comment body and emits sanitized value', () => {
    const onUpdateComment = vi.fn()
    render(
      <CommentListModal
        comments={COMMENTS}
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => undefined}
        onDeleteExportedComments={() => undefined}
        onUpdateComment={onUpdateComment}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    fireEvent.change(screen.getByLabelText('Edit comment body'), {
      target: { value: '  Updated body  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onUpdateComment).toHaveBeenCalledWith('a-comment', 'Updated body')
  })

  it('supports per-comment delete confirmation', () => {
    const onDeleteComment = vi.fn()
    render(
      <CommentListModal
        comments={COMMENTS}
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={onDeleteComment}
        onDeleteExportedComments={() => undefined}
        onUpdateComment={() => undefined}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }))

    expect(onDeleteComment).toHaveBeenCalledWith('a-comment')
  })

  it('supports delete exported bulk action with confirmation', () => {
    const onDeleteExportedComments = vi.fn()
    render(
      <CommentListModal
        comments={COMMENTS}
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => undefined}
        onDeleteExportedComments={onDeleteExportedComments}
        onUpdateComment={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete Exported' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete Exported' }))

    expect(onDeleteExportedComments).toHaveBeenCalledTimes(1)
  })
})
