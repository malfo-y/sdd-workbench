import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextToolbar } from './context-toolbar'

describe('ContextToolbar', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders F06 buttons in order', () => {
    render(
      <ContextToolbar
        disableCopyActiveFilePath={false}
        disableCopySelectedLines={false}
        onCopyActiveFilePath={() => undefined}
        onCopySelectedLines={() => undefined}
      />,
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('Copy Active File Path')
    expect(buttons[1]).toHaveTextContent('Copy Selected Lines')
  })

  it('applies disabled state based on props', () => {
    render(
      <ContextToolbar
        disableCopyActiveFilePath
        disableCopySelectedLines
        onCopyActiveFilePath={() => undefined}
        onCopySelectedLines={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: 'Copy Active File Path' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Copy Selected Lines' })).toBeDisabled()
  })

  it('invokes callbacks when buttons are clicked', () => {
    const onCopyActiveFilePath = vi.fn()
    const onCopySelectedLines = vi.fn()

    render(
      <ContextToolbar
        disableCopyActiveFilePath={false}
        disableCopySelectedLines={false}
        onCopyActiveFilePath={onCopyActiveFilePath}
        onCopySelectedLines={onCopySelectedLines}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy Active File Path' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy Selected Lines' }))

    expect(onCopyActiveFilePath).toHaveBeenCalledTimes(1)
    expect(onCopySelectedLines).toHaveBeenCalledTimes(1)
  })
})
