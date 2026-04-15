import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalCommentsModal } from './global-comments-modal'
import { appendGlobalCommentsHistory } from './global-comments-history'

function createTestStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key) ?? null : null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, String(value))
    },
  }
}

describe('GlobalCommentsModal', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createTestStorage(),
    })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('cancels on Escape when idle', () => {
    const onCancel = vi.fn()

    render(
      <GlobalCommentsModal
        initialValue=""
        isOpen
        isSaving={false}
        workspaceId="workspace-1"
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
        workspaceId="workspace-1"
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
        workspaceId="workspace-1"
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

  it('inserts document and section templates for organized notes', () => {
    render(
      <GlobalCommentsModal
        initialValue=""
        isOpen
        isSaving={false}
        suggestedDocumentPath="docs/spec.md"
        workspaceId="workspace-1"
        onCancel={() => undefined}
        onSave={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Insert Document Section' }))
    fireEvent.click(screen.getByRole('button', { name: 'Insert Section Heading' }))

    const textarea = screen.getByLabelText('Global comments (Markdown)')
    expect(textarea).toHaveValue(
      '## Document: docs/spec.md\n- Constraints:\n- Notes:\n\n### Section: <name>\n- Notes:',
    )
    expect(screen.getByTestId('global-comments-sections')).toHaveTextContent(
      'Document: docs/spec.md',
    )
    expect(screen.getByTestId('global-comments-sections')).toHaveTextContent(
      'Section: <name>',
    )
  })

  it('loads saved history and restores a previous revision', () => {
    appendGlobalCommentsHistory('workspace-1', '## Project-wide\n- Old note', '2026-04-14T00:00:00.000Z')

    render(
      <GlobalCommentsModal
        initialValue="## Project-wide\n- New note"
        isOpen
        isSaving={false}
        workspaceId="workspace-1"
        onCancel={() => undefined}
        onSave={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', {
      name: 'Restore 2026-04-14T00:00:00.000Z',
    }))

    expect(screen.getByLabelText('Global comments (Markdown)')).toHaveValue(
      '## Project-wide\n- Old note',
    )
  })
})
