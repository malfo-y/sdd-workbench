import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectSearchPanel } from './project-search-panel'

const emptyResult = (): WorkspaceSearchTextResult => ({
  ok: true,
  results: [],
  truncated: false,
  skippedLargeDirectoryCount: 0,
  skippedLargeFileCount: 0,
  skippedBinaryFileCount: 0,
  skippedUnreadablePathCount: 0,
  depthLimitHit: false,
  timedOut: false,
})

describe('ProjectSearchPanel', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('does not search whitespace-only queries and shows an empty state without extra search controls', async () => {
    vi.useFakeTimers()
    const onSearchText = vi.fn(async () => emptyResult())

    render(
      <ProjectSearchPanel
        onOpenSearchResult={() => undefined}
        onSearchText={onSearchText}
        workspaceKey="workspace-a"
      />,
    )

    fireEvent.change(screen.getByTestId('project-search-input'), {
      target: { value: '   ' },
    })
    await vi.advanceTimersByTimeAsync(300)

    expect(onSearchText).not.toHaveBeenCalled()
    expect(screen.getByTestId('project-search-empty')).toHaveTextContent(
      'Enter a search query.',
    )
    expect(screen.queryByLabelText(/regex/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/replace/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/include/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/exclude/i)).not.toBeInTheDocument()
  })

  it('debounces query changes before searching and renders empty backend results', async () => {
    vi.useFakeTimers()
    const onSearchText = vi.fn(async () => emptyResult())

    render(
      <ProjectSearchPanel
        onOpenSearchResult={() => undefined}
        onSearchText={onSearchText}
        workspaceKey="workspace-a"
      />,
    )

    fireEvent.change(screen.getByTestId('project-search-input'), {
      target: { value: 'alpha' },
    })
    await vi.advanceTimersByTimeAsync(249)
    expect(onSearchText).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(onSearchText).toHaveBeenCalledWith('alpha')
    expect(screen.getByTestId('project-search-empty')).toHaveTextContent(
      'No text matches found.',
    )
  })

  it('groups results by relativePath and opens only the clicked file line', async () => {
    vi.useFakeTimers()
    const onOpenSearchResult = vi.fn()
    const onSearchText = vi.fn(async (): Promise<WorkspaceSearchTextResult> => ({
      ...emptyResult(),
      results: [
        {
          relativePath: 'src/app.ts',
          lineNumber: 12,
          snippet: 'const alpha = true',
        },
        {
          relativePath: 'src/app.ts',
          lineNumber: 18,
          snippet: 'return alpha',
        },
        {
          relativePath: 'README.md',
          lineNumber: 3,
          snippet: 'alpha usage',
        },
      ],
    }))

    render(
      <ProjectSearchPanel
        onOpenSearchResult={onOpenSearchResult}
        onSearchText={onSearchText}
        workspaceKey="workspace-a"
      />,
    )

    fireEvent.change(screen.getByTestId('project-search-input'), {
      target: { value: 'alpha' },
    })
    await vi.advanceTimersByTimeAsync(250)

    const appGroup = screen.getByTestId('project-search-group-src/app.ts')
    expect(within(appGroup).getByText('src/app.ts')).toBeInTheDocument()
    expect(within(appGroup).getByText('Line 12')).toBeInTheDocument()
    expect(within(appGroup).getByText('const alpha = true')).toBeInTheDocument()
    expect(within(appGroup).getByText('Line 18')).toBeInTheDocument()
    expect(within(appGroup).getByText('return alpha')).toBeInTheDocument()

    expect(screen.getByTestId('project-search-group-README.md')).toHaveTextContent(
      'alpha usage',
    )

    fireEvent.click(screen.getByRole('button', { name: 'src/app.ts line 18' }))

    expect(onOpenSearchResult).toHaveBeenCalledTimes(1)
    expect(onOpenSearchResult).toHaveBeenCalledWith({
      relativePath: 'src/app.ts',
      lineNumber: 18,
    })
  })

  it('shows incomplete-result status when backend limit flags or skipped counts are present', async () => {
    vi.useFakeTimers()
    const onSearchText = vi.fn(async (): Promise<WorkspaceSearchTextResult> => ({
      ...emptyResult(),
      truncated: true,
      skippedLargeDirectoryCount: 1,
      skippedLargeFileCount: 2,
      skippedBinaryFileCount: 3,
      depthLimitHit: true,
      timedOut: true,
    }))

    render(
      <ProjectSearchPanel
        onOpenSearchResult={() => undefined}
        onSearchText={onSearchText}
        workspaceKey="workspace-a"
      />,
    )

    fireEvent.change(screen.getByTestId('project-search-input'), {
      target: { value: 'alpha' },
    })
    await vi.advanceTimersByTimeAsync(250)

    expect(screen.getByTestId('project-search-incomplete')).toHaveTextContent(
      'Search results may be incomplete.',
    )
  })

  it('renders partial results with an unreadable-path notice and no fatal error alert', async () => {
    vi.useFakeTimers()
    const onSearchText = vi.fn(async (): Promise<WorkspaceSearchTextResult> => ({
      ...emptyResult(),
      results: [
        {
          relativePath: 'src/readable.ts',
          lineNumber: 7,
          snippet: 'const needle = true',
        },
      ],
      skippedUnreadablePathCount: 2,
    }))

    render(
      <ProjectSearchPanel
        onOpenSearchResult={() => undefined}
        onSearchText={onSearchText}
        workspaceKey="workspace-a"
      />,
    )

    fireEvent.change(screen.getByTestId('project-search-input'), {
      target: { value: 'needle' },
    })
    await vi.advanceTimersByTimeAsync(250)

    expect(screen.getByText('const needle = true')).toBeInTheDocument()
    expect(screen.getByText(/2 unreadable paths/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows backend errors separately from empty results', async () => {
    vi.useFakeTimers()
    const onSearchText = vi.fn(async (): Promise<WorkspaceSearchTextResult> => ({
      ...emptyResult(),
      ok: false,
      error: 'Search backend unavailable.',
    }))

    render(
      <ProjectSearchPanel
        onOpenSearchResult={() => undefined}
        onSearchText={onSearchText}
        workspaceKey="workspace-a"
      />,
    )

    fireEvent.change(screen.getByTestId('project-search-input'), {
      target: { value: 'alpha' },
    })
    await vi.advanceTimersByTimeAsync(250)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Search backend unavailable.',
    )
    expect(screen.queryByText('No text matches found.')).not.toBeInTheDocument()
  })

  it('does not display stale responses from older queries', async () => {
    vi.useFakeTimers()
    const resolvers: Array<(value: WorkspaceSearchTextResult) => void> = []
    const onSearchText = vi.fn(
      () =>
        new Promise<WorkspaceSearchTextResult>((resolve) => {
          resolvers.push(resolve)
        }),
    )

    render(
      <ProjectSearchPanel
        onOpenSearchResult={() => undefined}
        onSearchText={onSearchText}
        workspaceKey="workspace-a"
      />,
    )

    fireEvent.change(screen.getByTestId('project-search-input'), {
      target: { value: 'older' },
    })
    await vi.advanceTimersByTimeAsync(250)
    fireEvent.change(screen.getByTestId('project-search-input'), {
      target: { value: 'newer' },
    })
    await vi.advanceTimersByTimeAsync(250)

    resolvers[1]({
      ...emptyResult(),
      results: [
        {
          relativePath: 'new.ts',
          lineNumber: 2,
          snippet: 'newer match',
        },
      ],
    })
    await Promise.resolve()
    resolvers[0]({
      ...emptyResult(),
      results: [
        {
          relativePath: 'old.ts',
          lineNumber: 1,
          snippet: 'older match',
        },
      ],
    })
    await Promise.resolve()

    expect(screen.getByText('newer match')).toBeInTheDocument()
    expect(screen.queryByText('older match')).not.toBeInTheDocument()
  })

  it('does not display stale responses after the workspace changes', async () => {
    vi.useFakeTimers()
    let resolveSearch: ((value: WorkspaceSearchTextResult) => void) | null = null
    const onSearchText = vi.fn(
      () =>
        new Promise<WorkspaceSearchTextResult>((resolve) => {
          resolveSearch = resolve
        }),
    )
    const view = render(
      <ProjectSearchPanel
        onOpenSearchResult={() => undefined}
        onSearchText={onSearchText}
        workspaceKey="workspace-a"
      />,
    )

    fireEvent.change(screen.getByTestId('project-search-input'), {
      target: { value: 'alpha' },
    })
    await vi.advanceTimersByTimeAsync(250)

    view.rerender(
      <ProjectSearchPanel
        onOpenSearchResult={() => undefined}
        onSearchText={onSearchText}
        workspaceKey="workspace-b"
      />,
    )

    expect(resolveSearch).not.toBeNull()
    resolveSearch!({
      ...emptyResult(),
      results: [
        {
          relativePath: 'src/app.ts',
          lineNumber: 12,
          snippet: 'stale workspace match',
        },
      ],
    })
    await Promise.resolve()

    expect(screen.queryByText('stale workspace match')).not.toBeInTheDocument()
    expect(screen.getByTestId('project-search-empty')).toHaveTextContent(
      'Enter a search query.',
    )
  })
})
