import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CopyActionPopover } from './copy-action-popover'

describe('CopyActionPopover', () => {
  afterEach(() => {
    cleanup()
  })

  it('clamps popover position to viewport bounds', () => {
    const originalInnerWidth = window.innerWidth
    const originalInnerHeight = window.innerHeight

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 320,
      writable: true,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 240,
      writable: true,
    })

    try {
      render(
        <CopyActionPopover
          actions={[
            {
              label: 'Copy',
              onSelect: () => undefined,
            },
          ]}
          onClose={() => undefined}
          title="Actions"
          x={500}
          y={500}
        />,
      )

      expect(screen.getByRole('dialog', { name: 'Copy actions' })).toHaveStyle({
        left: '28px',
        top: '60px',
      })
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
        writable: true,
      })
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: originalInnerHeight,
        writable: true,
      })
    }
  })

  it('closes on outside click and escape key', () => {
    const onClose = vi.fn()

    render(
      <CopyActionPopover
        actions={[
          {
            label: 'Copy',
            onSelect: () => undefined,
          },
        ]}
        onClose={onClose}
        title="Actions"
        x={100}
        y={120}
      />,
    )

    fireEvent.mouseDown(document.body)
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('invokes action and closes popover when action is clicked', () => {
    const onClose = vi.fn()
    const onSelect = vi.fn()

    render(
      <CopyActionPopover
        actions={[
          {
            label: 'Copy Relative Path',
            onSelect,
          },
        ]}
        onClose={onClose}
        title="Actions"
        x={50}
        y={60}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
