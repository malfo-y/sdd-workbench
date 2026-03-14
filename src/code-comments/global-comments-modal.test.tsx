import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlobalCommentsModal } from './global-comments-modal'

describe('GlobalCommentsModal', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('cancels on Escape when idle', () => {
    const onCancel = vi.fn()

    render(
      <GlobalCommentsModal
        initialValue=""
        isOpen
        isSaving={false}
        onCancel={onCancel}
        onSave={() => undefined}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape while saving', () => {
    const onCancel = vi.fn()

    render(
      <GlobalCommentsModal
        initialValue=""
        isOpen
        isSaving
        onCancel={onCancel}
        onSave={() => undefined}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('renders a draggable header and still saves global comments', () => {
    const onSave = vi.fn()

    render(
      <GlobalCommentsModal
        initialValue="Initial note"
        isOpen
        isSaving={false}
        onCancel={() => undefined}
        onSave={onSave}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Add global comments' })).toHaveClass(
      'is-draggable',
    )
    expect(screen.getByTestId('comment-modal-drag-handle')).toHaveTextContent(
      'Drag to move',
    )

    fireEvent.change(screen.getByLabelText('Global comments (Markdown)'), {
      target: { value: 'Updated global note' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Global Comments' }))

    expect(onSave).toHaveBeenCalledWith('Updated global note')
  })
})
