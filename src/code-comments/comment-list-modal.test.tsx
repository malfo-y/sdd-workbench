import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function installDialogRectMock(
  element: HTMLElement,
  input: {
    left: number
    top: number
    width: number
    height: number
  },
) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => {
      const match = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px,\s*0px\)/.exec(
        element.style.transform,
      )
      const offsetX = match ? Number(match[1]) : 0
      const offsetY = match ? Number(match[2]) : 0
      const left = input.left + offsetX
      const top = input.top + offsetY

      return {
        x: left,
        y: top,
        left,
        top,
        width: input.width,
        height: input.height,
        right: left + input.width,
        bottom: top + input.height,
        toJSON: () => ({}),
      }
    },
  })
}

describe('CommentListModal', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('does not render when closed', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen={false}
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
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
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
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
    const onUpdateComment = vi.fn(() => true)
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={onUpdateComment}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
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
    const onDeleteComment = vi.fn(() => true)
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={onDeleteComment}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }))

    expect(onDeleteComment).toHaveBeenCalledWith('a-comment')
  })

  it('supports delete exported bulk action with confirmation', () => {
    const onDeleteExportedComments = vi.fn(() => true)
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={onDeleteExportedComments}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete Exported' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete Exported' }))

    expect(onDeleteExportedComments).toHaveBeenCalledTimes(1)
  })

  it('renders global comments section above line comments', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments={'## Global\n- shared context'}
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    expect(screen.getByTestId('comment-list-global-body')).toHaveTextContent(
      '## Global',
    )
    expect(screen.getByTestId('comment-list-global-body')).toHaveTextContent(
      '- shared context',
    )
  })

  it('renders empty state when global comments are blank', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments="   "
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    expect(screen.getByTestId('comment-list-global-empty')).toHaveTextContent(
      'No global comments.',
    )
  })

  it('supports editing and saving global comments from view modal', async () => {
    const onSaveGlobalComments = vi.fn(() => true)

    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments={'## Global\n- shared context'}
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onSaveGlobalComments={onSaveGlobalComments}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit Global Comments' }))
    fireEvent.change(screen.getByTestId('comment-list-global-editor'), {
      target: { value: 'Updated global context' },
    })
    fireEvent.click(screen.getByTestId('save-global-comments-button'))

    await waitFor(() => {
      expect(onSaveGlobalComments).toHaveBeenCalledWith('Updated global context')
    })
    expect(screen.getByTestId('comment-list-global-body')).toHaveTextContent(
      'Updated global context',
    )
  })

  it('supports clearing global comments from view modal', async () => {
    const onSaveGlobalComments = vi.fn(() => true)

    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments={'## Global\n- shared context'}
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onSaveGlobalComments={onSaveGlobalComments}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit Global Comments' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    fireEvent.click(screen.getByTestId('save-global-comments-button'))

    await waitFor(() => {
      expect(onSaveGlobalComments).toHaveBeenCalledWith('')
    })
    expect(screen.getByTestId('comment-list-global-empty')).toHaveTextContent(
      'No global comments.',
    )
    expect(screen.queryByTestId('include-global-comments-checkbox')).not.toBeInTheDocument()
  })

  it('default selection: pending comments checked, exported comments unchecked', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    // b-comment (no exportedAt) should be checked by default
    expect(screen.getByLabelText('Select comment from src/b.ts:L5')).toBeChecked()
    // a-comment (has exportedAt) should be unchecked by default
    expect(screen.getByLabelText('Select comment from src/a.ts:L2-L3')).not.toBeChecked()
    expect(screen.getByTestId('comment-list-selection-count')).toHaveTextContent('1 selected')
  })

  it('Select All checks all comments', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))

    expect(screen.getByLabelText('Select comment from src/a.ts:L2-L3')).toBeChecked()
    expect(screen.getByLabelText('Select comment from src/b.ts:L5')).toBeChecked()
    expect(screen.getByTestId('comment-list-selection-count')).toHaveTextContent('2 selected')
  })

  it('Deselect All unchecks all comments', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Deselect All' }))

    expect(screen.getByLabelText('Select comment from src/a.ts:L2-L3')).not.toBeChecked()
    expect(screen.getByLabelText('Select comment from src/b.ts:L5')).not.toBeChecked()
    expect(screen.getByTestId('comment-list-selection-count')).toHaveTextContent('0 selected')
  })

  it('toggling a checkbox updates selection count', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    // Initially 1 selected (pending b-comment)
    expect(screen.getByTestId('comment-list-selection-count')).toHaveTextContent('1 selected')

    // Check the exported a-comment
    fireEvent.click(screen.getByLabelText('Select comment from src/a.ts:L2-L3'))
    expect(screen.getByTestId('comment-list-selection-count')).toHaveTextContent('2 selected')

    // Uncheck b-comment
    fireEvent.click(screen.getByLabelText('Select comment from src/b.ts:L5'))
    expect(screen.getByTestId('comment-list-selection-count')).toHaveTextContent('1 selected')
  })

  it('Export Selected button shows pending count and calls onRequestExport', () => {
    const onRequestExport = vi.fn()
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={onRequestExport}
        onJumpToComment={vi.fn()}
      />,
    )

    // Default: 1 pending (b-comment) selected
    const exportButton = screen.getByTestId('export-selected-button')
    expect(exportButton).toHaveTextContent('Export Selected (1)')
    expect(exportButton).toBeEnabled()

    fireEvent.click(exportButton)
    expect(onRequestExport).toHaveBeenCalledWith(['b-comment'], true)
  })

  it('Export Selected button is disabled when 0 selected and no global comments', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Deselect All' }))

    expect(screen.getByTestId('export-selected-button')).toBeDisabled()
  })

  it('Export Selected button is enabled with 0 selected when global comments exist', () => {
    const onRequestExport = vi.fn()
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments="Some global context"
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={onRequestExport}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Deselect All' }))

    const exportButton = screen.getByTestId('export-selected-button')
    expect(exportButton).toHaveTextContent('Export Selected (0)')
    expect(exportButton).toBeEnabled()

    fireEvent.click(exportButton)
    expect(onRequestExport).toHaveBeenCalledWith([], true)
  })

  it('renders include-in-export checkbox when global comments exist', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments="Some global context"
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    const checkbox = screen.getByTestId('include-global-comments-checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toBeChecked()
  })

  it('hides include-in-export checkbox when global comments are empty', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('include-global-comments-checkbox')).not.toBeInTheDocument()
  })

  it('unchecking global checkbox passes includeGlobalComments=false to onRequestExport', () => {
    const onRequestExport = vi.fn()
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments="Some global context"
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={onRequestExport}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('include-global-comments-checkbox'))
    fireEvent.click(screen.getByTestId('export-selected-button'))

    expect(onRequestExport).toHaveBeenCalledWith(['b-comment'], false)
  })

  it('Export Selected disabled when 0 selected and global checkbox unchecked', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments="Some global context"
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Deselect All' }))
    // With global comments checked, should still be enabled
    expect(screen.getByTestId('export-selected-button')).toBeEnabled()

    // Uncheck the global checkbox
    fireEvent.click(screen.getByTestId('include-global-comments-checkbox'))
    expect(screen.getByTestId('export-selected-button')).toBeDisabled()
  })

  it('renders comment target as a button element', () => {
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    const jumpButton = screen.getByRole('button', { name: 'src/a.ts:L2-L3' })
    expect(jumpButton).toBeInTheDocument()
    expect(jumpButton.tagName).toBe('BUTTON')
  })

  it('calls onJumpToComment with correct args when target button is clicked', () => {
    const onJumpToComment = vi.fn()
    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={onJumpToComment}
      />,
    )

    // Click the jump button for a-comment (src/a.ts L2-L3)
    fireEvent.click(screen.getByRole('button', { name: 'src/a.ts:L2-L3' }))

    expect(onJumpToComment).toHaveBeenCalledOnce()
    expect(onJumpToComment).toHaveBeenCalledWith('src/a.ts', 2, 3)
  })

  it('closes modal on Escape when idle', () => {
    const onClose = vi.fn()

    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={onClose}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders a draggable header and resets transform when reopened', () => {
    const { rerender } = render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'View comments' })
    const dragHandle = screen.getByTestId('comment-modal-drag-handle')
    installDialogRectMock(dialog, {
      left: 200,
      top: 150,
      width: 640,
      height: 420,
    })

    expect(dialog).toHaveClass('is-draggable')
    expect(dragHandle).toHaveTextContent('Drag to move')
    expect(dialog).toHaveStyle({
      transform: 'translate3d(0px, 0px, 0px)',
    })

    rerender(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen={false}
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )
    rerender(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={() => undefined}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'View comments' })).toHaveStyle({
      transform: 'translate3d(0px, 0px, 0px)',
    })
  })

  it('Escape cancels comment edit before closing modal', () => {
    const onClose = vi.fn()

    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={onClose}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    expect(screen.getByLabelText('Edit comment body')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByLabelText('Edit comment body')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape cancels delete confirmation before closing modal', () => {
    const onClose = vi.fn()

    render(
      <CommentListModal
        comments={COMMENTS}
        globalComments=""
        isOpen
        isSaving={false}
        onClose={onClose}
        onDeleteComment={() => true}
        onDeleteExportedComments={() => true}
        onUpdateComment={() => true}
        onRequestExport={vi.fn()}
        onJumpToComment={vi.fn()}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    expect(screen.getByRole('button', { name: 'Confirm Delete' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('button', { name: 'Confirm Delete' })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
