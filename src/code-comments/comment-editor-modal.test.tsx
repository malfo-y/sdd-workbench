import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommentEditorModal } from './comment-editor-modal'

function setScrollMetrics(
  element: HTMLElement,
  input: {
    clientHeight?: number
    scrollHeight?: number
    scrollTop?: number
    clientWidth?: number
    scrollWidth?: number
    scrollLeft?: number
  },
) {
  Object.defineProperties(element, {
    clientHeight: {
      configurable: true,
      value: input.clientHeight ?? 0,
    },
    scrollHeight: {
      configurable: true,
      value: input.scrollHeight ?? 0,
    },
    scrollTop: {
      configurable: true,
      writable: true,
      value: input.scrollTop ?? 0,
    },
    clientWidth: {
      configurable: true,
      value: input.clientWidth ?? 0,
    },
    scrollWidth: {
      configurable: true,
      value: input.scrollWidth ?? 0,
    },
    scrollLeft: {
      configurable: true,
      writable: true,
      value: input.scrollLeft ?? 0,
    },
  })
}

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

  it('passes wheel scrolling through to the background when the modal cannot scroll', () => {
    const backgroundScrollContainer = document.createElement('div')
    backgroundScrollContainer.style.overflowY = 'auto'
    setScrollMetrics(backgroundScrollContainer, {
      clientHeight: 120,
      scrollHeight: 480,
      scrollTop: 40,
    })
    document.body.appendChild(backgroundScrollContainer)

    render(
      <CommentEditorModal
        isOpen
        isSaving={false}
        onCancel={() => undefined}
        onSave={() => undefined}
        relativePath="src/app.ts"
        selectionRange={{ startLine: 3, endLine: 5 }}
      />,
    )

    const backdrop = document.querySelector('.comment-modal-backdrop')
    const dialog = document.querySelector('.comment-modal')
    expect(backdrop).not.toBeNull()
    expect(dialog).not.toBeNull()

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [dialog, backdrop, backgroundScrollContainer]),
    })

    fireEvent.wheel(backdrop!, {
      clientX: 120,
      clientY: 160,
      deltaY: 60,
    })

    expect(backgroundScrollContainer.scrollTop).toBe(100)
  })

  it('keeps wheel scrolling inside the modal textarea when it can scroll', () => {
    const backgroundScrollContainer = document.createElement('div')
    backgroundScrollContainer.style.overflowY = 'auto'
    setScrollMetrics(backgroundScrollContainer, {
      clientHeight: 120,
      scrollHeight: 480,
      scrollTop: 40,
    })
    document.body.appendChild(backgroundScrollContainer)

    render(
      <CommentEditorModal
        isOpen
        isSaving={false}
        onCancel={() => undefined}
        onSave={() => undefined}
        relativePath="src/app.ts"
        selectionRange={{ startLine: 3, endLine: 5 }}
      />,
    )

    const backdrop = document.querySelector('.comment-modal-backdrop')
    const dialog = document.querySelector('.comment-modal')
    const textarea = document.getElementById('comment-editor-body')
    expect(backdrop).not.toBeNull()
    expect(dialog).not.toBeNull()
    expect(textarea).not.toBeNull()

    textarea!.style.overflowY = 'auto'
    setScrollMetrics(textarea as HTMLElement, {
      clientHeight: 120,
      scrollHeight: 320,
      scrollTop: 20,
    })

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [textarea, dialog, backdrop, backgroundScrollContainer]),
    })

    fireEvent.wheel(textarea!, {
      clientX: 120,
      clientY: 160,
      deltaY: 60,
    })

    expect(backgroundScrollContainer.scrollTop).toBe(40)
  })

  it('renders a draggable header and still saves the comment body', () => {
    const onSave = vi.fn()

    render(
      <CommentEditorModal
        isOpen
        isSaving={false}
        onCancel={() => undefined}
        onSave={onSave}
        relativePath="src/app.ts"
        selectionRange={{ startLine: 3, endLine: 5 }}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Add comment' })).toHaveClass(
      'is-draggable',
    )
    expect(screen.getByTestId('comment-modal-drag-handle')).toHaveTextContent(
      'Drag to move',
    )

    fireEvent.change(document.getElementById('comment-editor-body')!, {
      target: { value: 'Move this modal but keep saving' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Comment' }))

    expect(onSave).toHaveBeenCalledWith('Move this modal but keep saving')
  })
})
