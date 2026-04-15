import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HighlightLineToken } from '../code-viewer/syntax-highlight'
import { HighlightedCodeBlock } from './highlighted-code-block'

const { highlightLineTokensMock } = vi.hoisted(() => ({
  highlightLineTokensMock: vi.fn(),
}))

vi.mock('../code-viewer/syntax-highlight', async () => {
  const actual = await vi.importActual<typeof import('../code-viewer/syntax-highlight')>(
    '../code-viewer/syntax-highlight',
  )
  return {
    ...actual,
    highlightLineTokens: highlightLineTokensMock,
  }
})

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return {
    promise,
    resolve,
  }
}

describe('HighlightedCodeBlock', () => {
  it('ignores stale highlight responses after props change', async () => {
    const firstRequest = createDeferred<HighlightLineToken[][]>()
    const secondRequest = createDeferred<HighlightLineToken[][]>()

    highlightLineTokensMock
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise)

    const { rerender } = render(
      <HighlightedCodeBlock
        appearanceTheme="dark-gray"
        code="alpha"
        language="typescript"
        onCitationClick={() => undefined}
      />,
    )

    rerender(
      <HighlightedCodeBlock
        appearanceTheme="dark-gray"
        code="beta"
        language="typescript"
        onCitationClick={() => undefined}
      />,
    )

    firstRequest.resolve([[{ content: 'STALE', color: '#f00' }]])
    secondRequest.resolve([[{ content: 'FRESH', color: '#0f0' }]])

    await waitFor(() => {
      expect(screen.getByText('FRESH')).toBeInTheDocument()
    })

    expect(screen.queryByText('STALE')).not.toBeInTheDocument()
  })

  it('renders highlighted citations and escapes raw text content', async () => {
    highlightLineTokensMock.mockResolvedValueOnce([
      [
        {
          content: 'alpha <danger> [src/app.py:run] omega',
          color: '#f00',
        },
      ],
    ])

    render(
      <HighlightedCodeBlock
        appearanceTheme="dark-gray"
        code="alpha <danger> [src/app.py:run] omega"
        language="typescript"
        onCitationClick={() => undefined}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('spec-code-citation-1-1')).toBeInTheDocument()
    })

    expect(screen.getByText(/<danger>/)).toBeInTheDocument()
    expect(screen.getByTestId('spec-code-citation-1-1')).toHaveAttribute(
      'href',
      '#sdd-citation:src%2Fapp.py:run',
    )
  })
})
