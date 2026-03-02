import { cleanup, fireEvent, render } from '@testing-library/react'
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
})
