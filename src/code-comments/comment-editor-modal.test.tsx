import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommentEditorModal } from './comment-editor-modal'

describe('CommentEditorModal', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('cancels on Escape when idle', () => {
    const onCancel = vi.fn()

    render(
      <CommentEditorModal
        isOpen
        isSaving={false}
        onCancel={onCancel}
        onSave={() => undefined}
        relativePath="src/app.ts"
        selectionRange={{ startLine: 3, endLine: 5 }}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape while saving', () => {
    const onCancel = vi.fn()

    render(
      <CommentEditorModal
        isOpen
        isSaving
        onCancel={onCancel}
        onSave={() => undefined}
        relativePath="src/app.ts"
        selectionRange={{ startLine: 3, endLine: 5 }}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCancel).not.toHaveBeenCalled()
  })
})
