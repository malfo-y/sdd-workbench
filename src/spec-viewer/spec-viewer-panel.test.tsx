import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpecViewerPanel } from './spec-viewer-panel'
import type { CodeComment } from '../code-comments/comment-types'
import type { CitationNavigationResult } from './citation-target'

describe('SpecViewerPanel', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  function renderPanel({
    workspaceRootPath = '/Users/tester/workspace',
    activeSpecPath = 'docs/spec.md',
    markdownContent = '# Title\n\n## Intro\ntext',
    appearanceTheme = 'dark-gray' as const,
    isLoading = false,
    readError = null,
    onGoToSourceLine = vi.fn<
      (lineNumber: number, sourceOffsetRange?: { startOffset: number; endOffset: number }) => void
    >(),
    navigationRequest = null as
      | {
          targetRelativePath: string
          token: number
          lineNumber?: number
          headingId?: string
        }
      | null,
    onRequestAddComment = vi.fn<
      (input: {
        relativePath: string
        selectionRange: { startLine: number; endLine: number }
        sourceOffsetRange?: { startOffset: number; endOffset: number }
      }) => void
    >(),
    onRequestEditComment = vi.fn<(comment: CodeComment) => void>(),
    onRequestDeleteComment = vi.fn<(comment: CodeComment) => void>(),
    onRequestCopySelectedContent = vi.fn<
      (input: {
        relativePath: string
        content: string
        selectionRange: { startLine: number; endLine: number }
      }) => void
    >(),
    onRequestCopyBoth = vi.fn<
      (input: {
        relativePath: string
        content: string
        selectionRange: { startLine: number; endLine: number }
      }) => void
    >(),
    onRequestCopyRelativePath = vi.fn<
      (
        relativePath: string,
        selectionRange?: { startLine: number; endLine: number },
      ) => void
    >(),
    onScrollPositionChange = vi.fn<
      (input: { relativePath: string; scrollTop: number }) => void
    >(),
    restoredScrollTop = null,
    isActive = true,
    onOpenRelativePath = vi
      .fn<
        (
          relativePath: string,
          lineRange: { startLine: number; endLine: number } | null,
          headingId?: string | null,
        ) => boolean
      >()
      .mockReturnValue(true),
    onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true }),
    commentLineCounts = new Map<number, number>(),
    commentLineEntries = new Map<number, readonly CodeComment[]>(),
  }: {
    workspaceRootPath?: string | null
    activeSpecPath?: string | null
    markdownContent?: string | null
    appearanceTheme?: 'dark-gray' | 'light'
    isLoading?: boolean
    readError?: string | null
    onGoToSourceLine?: (
      lineNumber: number,
      sourceOffsetRange?: { startOffset: number; endOffset: number },
    ) => void
    navigationRequest?: {
      targetRelativePath: string
      token: number
      lineNumber?: number
      headingId?: string
    } | null
    onRequestAddComment?: (input: {
      relativePath: string
      selectionRange: { startLine: number; endLine: number }
      sourceOffsetRange?: { startOffset: number; endOffset: number }
    }) => void
    onRequestEditComment?: (comment: CodeComment) => void
    onRequestDeleteComment?: (comment: CodeComment) => void
    onRequestCopySelectedContent?: (input: {
      relativePath: string
      content: string
      selectionRange: { startLine: number; endLine: number }
    }) => void
    onRequestCopyBoth?: (input: {
      relativePath: string
      content: string
      selectionRange: { startLine: number; endLine: number }
    }) => void
    onRequestCopyRelativePath?: (
      relativePath: string,
      selectionRange?: { startLine: number; endLine: number },
    ) => void
    onScrollPositionChange?: (input: {
      relativePath: string
      scrollTop: number
    }) => void
    restoredScrollTop?: number | null
    isActive?: boolean
    onOpenRelativePath?: (
      relativePath: string,
      lineRange: { startLine: number; endLine: number } | null,
      headingId?: string | null,
    ) => boolean
    onOpenCitationTarget?: (target: {
      targetRelativePath: string
      symbolName: string | null
    }) => Promise<CitationNavigationResult>
    commentLineCounts?: ReadonlyMap<number, number>
    commentLineEntries?: ReadonlyMap<number, readonly CodeComment[]>
  } = {}) {
    const renderResult = render(
      <SpecViewerPanel
        activeSpecPath={activeSpecPath}
        appearanceTheme={appearanceTheme}
        commentLineEntries={commentLineEntries}
        commentLineCounts={commentLineCounts}
        isLoading={isLoading}
        markdownContent={markdownContent}
        navigationRequest={navigationRequest}
        onScrollPositionChange={onScrollPositionChange}
        onRequestAddComment={onRequestAddComment}
        onRequestEditComment={onRequestEditComment}
        onRequestDeleteComment={onRequestDeleteComment}
        onRequestCopyBoth={onRequestCopyBoth}
        onRequestCopyRelativePath={onRequestCopyRelativePath}
        onRequestCopySelectedContent={onRequestCopySelectedContent}
        onGoToSourceLine={onGoToSourceLine}
        onOpenCitationTarget={onOpenCitationTarget}
        onOpenRelativePath={onOpenRelativePath}
        readError={readError}
        restoredScrollTop={restoredScrollTop}
        isActive={isActive}
        workspaceRootPath={workspaceRootPath}
      />,
    )

    return {
      onGoToSourceLine,
      onOpenCitationTarget,
      onRequestAddComment,
      onRequestEditComment,
      onRequestDeleteComment,
      onRequestCopyBoth,
      onRequestCopyRelativePath,
      onRequestCopySelectedContent,
      onOpenRelativePath,
      onScrollPositionChange,
      rerender: renderResult.rerender,
    }
  }

  function findTextNodeContaining(root: Node, fragment: string): Text | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let currentNode = walker.nextNode()
    while (currentNode) {
      if (currentNode.textContent?.includes(fragment)) {
        return currentNode as Text
      }
      currentNode = walker.nextNode()
    }
    return null
  }

  function findParagraphByText(text: string): HTMLElement {
    const paragraph = screen.getByText(
      (_content, element) =>
        element?.tagName === 'P' && element.textContent === text,
    )
    if (!paragraph) {
      throw new Error(`Expected paragraph containing "${text}"`)
    }
    return paragraph
  }

  it('renders markdown and keeps toc collapsed by default', () => {
    renderPanel()

    expect(screen.getByTestId('spec-viewer-active-spec')).toHaveTextContent(
      'docs/spec.md',
    )
    expect(screen.getByTestId('spec-viewer-content')).toHaveTextContent('Title')
    expect(screen.getByTestId('spec-viewer-toc')).toBeInTheDocument()
    expect(screen.getByTestId('spec-viewer-toc-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByTestId('spec-viewer-toc-list')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('spec-viewer-toc-toggle'))

    expect(screen.getByTestId('spec-viewer-toc-toggle')).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const tocList = screen.getByTestId('spec-viewer-toc-list')
    expect(within(tocList).getByRole('link', { name: 'Title' })).toHaveAttribute(
      'href',
      '#title',
    )
    expect(within(tocList).getByRole('link', { name: 'Intro' })).toHaveAttribute(
      'href',
      '#intro',
    )
  })

  it('scrolls to target heading when TOC link is clicked', () => {
    renderPanel({
      markdownContent: '# Title\n\n## Intro\n\nBody',
    })

    fireEvent.click(screen.getByTestId('spec-viewer-toc-toggle'))
    const introHeading = screen.getByRole('heading', {
      name: 'Intro',
    }) as HTMLElement
    const headingScrollIntoView = vi.fn()
    Object.defineProperty(introHeading, 'scrollIntoView', {
      configurable: true,
      value: headingScrollIntoView,
    })

    fireEvent.click(screen.getByRole('link', { name: 'Intro' }))

    expect(headingScrollIntoView).toHaveBeenCalled()
  })

  it('tracks the active heading in the table of contents while scrolling', async () => {
    renderPanel({
      markdownContent: '# Title\n\n## Intro\n\nBody\n\n## Details\n\nMore',
    })

    fireEvent.click(screen.getByTestId('spec-viewer-toc-toggle'))

    const contentElement = screen.getByTestId('spec-viewer-content')
    const titleHeading = screen.getByRole('heading', { name: 'Title' })
    const introHeading = screen.getByRole('heading', { name: 'Intro' })
    const detailsHeading = screen.getByRole('heading', { name: 'Details' })

    Object.defineProperty(titleHeading, 'offsetTop', {
      configurable: true,
      value: 0,
    })
    Object.defineProperty(introHeading, 'offsetTop', {
      configurable: true,
      value: 180,
    })
    Object.defineProperty(detailsHeading, 'offsetTop', {
      configurable: true,
      value: 360,
    })
    Object.defineProperty(contentElement, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 220,
    })
    vi.spyOn(contentElement, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      right: 400,
      bottom: 400,
      width: 400,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    vi.spyOn(titleHeading, 'getBoundingClientRect').mockReturnValue({
      top: -220,
      left: 0,
      right: 400,
      bottom: -180,
      width: 400,
      height: 40,
      x: 0,
      y: -220,
      toJSON: () => ({}),
    } as DOMRect)
    vi.spyOn(introHeading, 'getBoundingClientRect').mockReturnValue({
      top: -40,
      left: 0,
      right: 400,
      bottom: 0,
      width: 400,
      height: 40,
      x: 0,
      y: -40,
      toJSON: () => ({}),
    } as DOMRect)
    vi.spyOn(detailsHeading, 'getBoundingClientRect').mockReturnValue({
      top: 140,
      left: 0,
      right: 400,
      bottom: 180,
      width: 400,
      height: 40,
      x: 0,
      y: 140,
      toJSON: () => ({}),
    } as DOMRect)

    fireEvent.scroll(contentElement)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Intro' })).toHaveAttribute(
        'aria-current',
        'location',
      )
    })
    expect(screen.getByRole('link', { name: 'Title' })).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.getByRole('link', { name: 'Details' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('reports scroll position for the active spec', () => {
    const { onScrollPositionChange } = renderPanel()
    const contentElement = screen.getByTestId('spec-viewer-content')
    Object.defineProperty(contentElement, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 48,
    })

    fireEvent.scroll(contentElement)

    expect(onScrollPositionChange).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      scrollTop: 48,
    })
  })

  it('restores previously saved scroll position when rendering a spec', async () => {
    renderPanel({
      markdownContent: '# Title\n\nLong paragraph',
      restoredScrollTop: 92,
    })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-content')).toHaveProperty(
        'scrollTop',
        92,
      )
    })
  })

  it('rerenders fenced code blocks when appearance theme changes', async () => {
    const markdownContent = '# Title\n\n```ts\nconst value: number = 42\n```'
    const { rerender } = renderPanel({
      markdownContent,
      appearanceTheme: 'dark-gray',
    })

    const findCodeHtml = async () => {
      const codeElement = await screen.findByText(
        (_content, element) =>
          element?.tagName === 'CODE' &&
          element.textContent?.includes('const value: number = 42') === true,
      )
      await waitFor(() => {
        expect(codeElement.innerHTML).toContain('<span style="color:')
      })
      return codeElement.innerHTML
    }

    const darkHtml = await findCodeHtml()

    rerender(
      <SpecViewerPanel
        activeSpecPath="docs/spec.md"
        appearanceTheme="light"
        commentLineEntries={new Map<number, readonly CodeComment[]>()}
        commentLineCounts={new Map<number, number>()}
        isActive={true}
        isLoading={false}
        markdownContent={markdownContent}
        navigationRequest={null}
        onOpenCitationTarget={vi.fn().mockResolvedValue({ ok: true })}
        onGoToSourceLine={vi.fn()}
        onOpenRelativePath={vi.fn().mockReturnValue(true)}
        onRequestAddComment={vi.fn()}
        onRequestEditComment={vi.fn()}
        onRequestDeleteComment={vi.fn()}
        onRequestCopyBoth={vi.fn()}
        onRequestCopyRelativePath={vi.fn()}
        onRequestCopySelectedContent={vi.fn()}
        readError={null}
        workspaceRootPath="/Users/tester/workspace"
      />,
    )

    await waitFor(async () => {
      const lightHtml = await findCodeHtml()
      expect(lightHtml).not.toBe(darkHtml)
    })
  })

  it('shows empty state when no active spec exists', () => {
    renderPanel({
      activeSpecPath: null,
      markdownContent: null,
    })

    expect(screen.getByTestId('spec-viewer-empty')).toHaveTextContent(
      'Select a Markdown file',
    )
  })

  it('shows unavailable message when active spec content is missing', () => {
    renderPanel({
      markdownContent: null,
    })

    expect(screen.getByTestId('spec-viewer-unavailable')).toHaveTextContent(
      'refresh rendered preview',
    )
  })

  it('opens same-workspace relative links and prevents default navigation', () => {
    const onOpenRelativePath = vi
      .fn<
        (
          relativePath: string,
          lineRange: { startLine: number; endLine: number } | null,
          headingId?: string | null,
        ) => boolean
      >()
      .mockReturnValue(true)
    renderPanel({
      markdownContent: '[Open Guide](./guide.md)',
      onOpenRelativePath,
    })

    const link = screen.getByRole('link', { name: 'Open Guide' })
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 160,
      clientY: 200,
    })
    link.dispatchEvent(clickEvent)

    expect(clickEvent.defaultPrevented).toBe(true)
    expect(onOpenRelativePath).toHaveBeenCalledWith('docs/guide.md', null, null)
  })

  it('transforms prose citation text into semantic navigation links', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent: 'See [src/app.py:run] for details.',
      onOpenCitationTarget,
    })

    const citationLink = screen.getByRole('link', { name: '[src/app.py:run]' })
    fireEvent.click(citationLink, {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'src/app.py',
        symbolName: 'run',
      })
    })
  })

  it('transforms dotted prose citations into semantic navigation links', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent: 'See [src/app.py:Worker.run] for details.',
      onOpenCitationTarget,
    })

    const citationLink = screen.getByRole('link', {
      name: '[src/app.py:Worker.run]',
    })
    fireEvent.click(citationLink, {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'src/app.py',
        symbolName: 'Worker.run',
      })
    })
  })

  it('renders generic fenced code citations as clickable links', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent:
        '```\nDJDataset [data_juicer/core/data/dj_dataset.py:DJDataset]\n```',
      onOpenCitationTarget,
    })

    const citationLink = await screen.findByRole('link', {
      name: '[data_juicer/core/data/dj_dataset.py:DJDataset]',
    })
    fireEvent.click(citationLink, {
      clientX: 210,
      clientY: 240,
    })

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'data_juicer/core/data/dj_dataset.py',
        symbolName: 'DJDataset',
      })
    })
  })

  it('renders dotted citations inside generic fenced code blocks', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent: '```\nWorker [src/app.py:Worker.run]\n```',
      onOpenCitationTarget,
    })

    const citationLink = await screen.findByRole('link', {
      name: '[src/app.py:Worker.run]',
    })
    fireEvent.click(citationLink, {
      clientX: 210,
      clientY: 240,
    })

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'src/app.py',
        symbolName: 'Worker.run',
      })
    })
  })

  it('preserves syntax highlighting inside fenced code citation links', async () => {
    renderPanel({
      markdownContent: '```python\n# [src/app.py:Worker.run]\n```',
    })

    const citationLink = await screen.findByRole('link', {
      name: '[src/app.py:Worker.run]',
    })

    await waitFor(() => {
      expect(citationLink.innerHTML).toContain('<span style="color:')
    })
  })

  it('shows the citation failure reason in the fallback popover', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({
        ok: false,
        failureReason: 'Python symbol "Worker.run" was not found in src/app.py.',
      })
    renderPanel({
      markdownContent: 'See [src/app.py:Worker.run] for details.',
      onOpenCitationTarget,
    })

    fireEvent.click(screen.getByRole('link', { name: '[src/app.py:Worker.run]' }), {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Link actions' })).toHaveTextContent(
        'Python symbol "Worker.run" was not found in src/app.py.',
      )
    })
  })

  it('shows a fallback message when citation navigation rejects', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockRejectedValue(new Error('Backend unavailable'))
    renderPanel({
      markdownContent: 'See [src/app.py:Worker.run] for details.',
      onOpenCitationTarget,
    })

    fireEvent.click(screen.getByRole('link', { name: '[src/app.py:Worker.run]' }), {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Link actions' })).toHaveTextContent(
        'Backend unavailable',
      )
    })
  })

  it('renders inline code citations as clickable semantic navigation links', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent: 'Use `[src/app.py:Worker]` as the primary entry point.',
      onOpenCitationTarget,
    })

    const citationLink = screen.getByRole('link', {
      name: /\[\s*src\/app\.py:Worker\s*\]/,
    })
    fireEvent.click(citationLink, {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'src/app.py',
        symbolName: 'Worker',
      })
    })
  })

  it('renders file-only inline code citations as clickable semantic navigation links', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent: 'Use `[src/app.py]` as the primary entry point.',
      onOpenCitationTarget,
    })

    fireEvent.click(screen.getByRole('link', { name: '[src/app.py]' }), {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'src/app.py',
        symbolName: null,
      })
    })
  })

  it('renders bracket-wrapped file-only inline code citations as clickable semantic navigation links', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent: 'Use [`src/app.py`] as the primary entry point.',
      onOpenCitationTarget,
    })

    fireEvent.click(screen.getByRole('link', { name: '[ src/app.py ]' }), {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'src/app.py',
        symbolName: null,
      })
    })
  })

  it('renders bracket-wrapped inline code citations as clickable semantic navigation links', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent: 'Use [`src/app.py:Worker`] as the primary entry point.',
      onOpenCitationTarget,
    })

    fireEvent.click(
      screen.getByRole('link', {
        name: /\[\s*src\/app\.py:Worker\s*\]/,
      }),
      {
        clientX: 180,
        clientY: 220,
      },
    )

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'src/app.py',
        symbolName: 'Worker',
      })
    })
  })

  it('renders bracket-wrapped dotted inline code citations as clickable semantic navigation links', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent:
        'Use [`src/app.py:Worker.run`] as the primary entry point.',
      onOpenCitationTarget,
    })

    fireEvent.click(
      screen.getByRole('link', {
        name: /\[\s*src\/app\.py:Worker\.run\s*\]/,
      }),
      {
        clientX: 180,
        clientY: 220,
      },
    )

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'src/app.py',
        symbolName: 'Worker.run',
      })
    })
  })

  it('renders multiple bracket-wrapped inline code citations on one line as separate links', async () => {
    const onOpenCitationTarget = vi
      .fn<
        (target: {
          targetRelativePath: string
          symbolName: string | null
        }) => Promise<CitationNavigationResult>
      >()
      .mockResolvedValue({ ok: true })
    renderPanel({
      markdownContent:
        'Components: [`src/app.py`], [`src/worker.py:Worker.run`].',
      onOpenCitationTarget,
    })

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)

    fireEvent.click(
      screen.getByRole('link', {
        name: /\[\s*src\/worker\.py:Worker\.run\s*\]/,
      }),
      {
        clientX: 180,
        clientY: 220,
      },
    )

    await waitFor(() => {
      expect(onOpenCitationTarget).toHaveBeenCalledWith({
        targetRelativePath: 'src/worker.py',
        symbolName: 'Worker.run',
      })
    })
  })

  it('passes single-line and range line hashes for workspace file links', () => {
    const onOpenRelativePath = vi
      .fn<
        (
          relativePath: string,
          lineRange: { startLine: number; endLine: number } | null,
          headingId?: string | null,
        ) => boolean
      >()
      .mockReturnValue(true)
    renderPanel({
      markdownContent:
        '[Line](./guide.md#L10)\n\n[Range](./guide.md#L10-L20)',
      onOpenRelativePath,
    })

    fireEvent.click(screen.getByRole('link', { name: 'Line' }), {
      clientX: 80,
      clientY: 120,
    })

    fireEvent.click(screen.getByRole('link', { name: 'Range' }), {
      clientX: 110,
      clientY: 160,
    })

    expect(onOpenRelativePath).toHaveBeenNthCalledWith(1, 'docs/guide.md', {
      startLine: 10,
      endLine: 10,
    }, null)
    expect(onOpenRelativePath).toHaveBeenNthCalledWith(2, 'docs/guide.md', {
      startLine: 10,
      endLine: 20,
    }, null)
  })

  it('passes heading targets for workspace markdown links with non-line hashes', () => {
    const onOpenRelativePath = vi
      .fn<
        (
          relativePath: string,
          lineRange: { startLine: number; endLine: number } | null,
          headingId?: string | null,
        ) => boolean
      >()
      .mockReturnValue(true)
    renderPanel({
      markdownContent: '[Jump](./guide.md#deep-dive)',
      onOpenRelativePath,
    })

    fireEvent.click(screen.getByRole('link', { name: 'Jump' }), {
      clientX: 96,
      clientY: 148,
    })

    expect(onOpenRelativePath).toHaveBeenCalledWith(
      'docs/guide.md',
      null,
      'deep-dive',
    )
  })

  it('scrolls to same-document heading for markdown anchor links', () => {
    const onOpenRelativePath = vi
      .fn<
        (
          relativePath: string,
          lineRange: { startLine: number; endLine: number } | null,
          headingId?: string | null,
        ) => boolean
      >()
      .mockReturnValue(true)
    renderPanel({
      markdownContent: '[Jump](#1-환경-설정)\n\n## 1. 환경 설정',
      onOpenRelativePath,
    })

    const heading = screen.getByRole('heading', {
      name: '1. 환경 설정',
    }) as HTMLElement
    const headingScrollIntoView = vi.fn()
    Object.defineProperty(heading, 'scrollIntoView', {
      configurable: true,
      value: headingScrollIntoView,
    })

    const anchorLink = screen.getByRole('link', { name: 'Jump' })
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 60,
      clientY: 80,
    })
    anchorLink.dispatchEvent(clickEvent)

    expect(clickEvent.defaultPrevented).toBe(true)
    expect(headingScrollIntoView).toHaveBeenCalled()
    expect(onOpenRelativePath).not.toHaveBeenCalled()
  })

  it('shows copy popover for external links and copies address', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    renderPanel({
      markdownContent: '[External](https://example.com/docs)',
    })

    fireEvent.click(screen.getByRole('link', { name: 'External' }), {
      clientX: 220,
      clientY: 260,
    })

    expect(screen.getByRole('dialog', { name: 'Link actions' })).toHaveTextContent(
      'https://example.com/docs',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy Link Address' }))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('https://example.com/docs')
    })
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Link actions' }),
      ).not.toBeInTheDocument()
    })
  })

  it('shows popover for unsupported relative paths', () => {
    renderPanel({
      markdownContent: '[Bad Path](../../outside.md)',
    })

    fireEvent.click(screen.getByRole('link', { name: 'Bad Path' }), {
      clientX: 190,
      clientY: 220,
    })

    expect(screen.getByRole('dialog', { name: 'Link actions' })).toHaveTextContent(
      '../../outside.md',
    )
  })

  it('renders workspace-relative images as file URLs', () => {
    renderPanel({
      markdownContent: '![Diagram](./assets/diagram.png)',
    })

    const image = screen.getByRole('img', { name: 'Diagram' })
    expect(image).toHaveAttribute(
      'src',
      'file:///Users/tester/workspace/docs/assets/diagram.png',
    )
    expect(
      screen.queryByTestId('spec-viewer-blocked-resource'),
    ).not.toBeInTheDocument()
  })

  it('shows blocked placeholder text for disallowed image URIs', () => {
    renderPanel({
      markdownContent: '![External](https://example.com/image.png)',
    })

    expect(screen.getByTestId('spec-viewer-blocked-resource')).toHaveTextContent(
      'Image blocked by viewer policy',
    )
    expect(screen.queryByRole('img', { name: 'External' })).not.toBeInTheDocument()
  })

  it('renders inline and display math without exposing raw delimiters', () => {
    renderPanel({
      markdownContent:
        '# Title\n\nInline $E=mc^2$ math.\n\n$$\n\\int_0^1 x^2 dx\n$$\n',
    })

    const content = screen.getByTestId('spec-viewer-content')
    const mathWrappers = content.querySelectorAll('.spec-viewer-math-source')
    const inlineKatex = content.querySelector('p .katex')
    const displayKatex = content.querySelector('.katex-display')

    expect(mathWrappers).toHaveLength(2)
    expect(inlineKatex).toBeTruthy()
    expect(mathWrappers[0]?.getAttribute('data-source-line')).toBeNull()
    expect(mathWrappers[0]?.getAttribute('data-source-line-start')).toBeTruthy()
    expect(displayKatex).toBeTruthy()
    expect(mathWrappers[1]?.getAttribute('data-source-line')).toBeTruthy()
    expect(mathWrappers[1]?.getAttribute('data-source-line-start')).toBeTruthy()
    expect(mathWrappers[1]?.getAttribute('data-source-line-end')).toBeTruthy()
    expect(content.innerHTML).not.toContain('$E=mc^2$')
    expect(content.innerHTML).not.toContain('$$')
  })

  it('resolves source actions from display math wrapper metadata', () => {
    const { onGoToSourceLine } = renderPanel({
      markdownContent: '# Title\n\n$$\n\\int_0^1 x^2 dx\n$$\n',
    })
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const content = screen.getByTestId('spec-viewer-content')
    const displayMathWrapper = content.querySelectorAll('.spec-viewer-math-source')[0]
    const displayKatex = content.querySelector('.katex-display')
    const visibleMathRoot = displayKatex?.querySelector('.katex-html') ?? displayKatex
    if (!displayMathWrapper || !displayKatex || !visibleMathRoot) {
      throw new Error('Expected rendered display math')
    }

    const selectionTextNode = findTextNodeContaining(visibleMathRoot, '∫')
    if (!selectionTextNode) {
      throw new Error('Expected display math text node')
    }

    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset: 0,
      focusNode: selectionTextNode,
      focusOffset: selectionTextNode.data.length,
      toString: () => selectionTextNode.data,
    } as unknown as Selection)

    fireEvent.contextMenu(displayKatex, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    const resolvedLine = (onGoToSourceLine as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]
    const sourceLineStart = Number(displayMathWrapper.getAttribute('data-source-line-start'))
    const sourceLineEnd = Number(displayMathWrapper.getAttribute('data-source-line-end'))
    expect(resolvedLine).toBeGreaterThanOrEqual(sourceLineStart)
    expect(resolvedLine).toBeLessThanOrEqual(sourceLineEnd)
  })

  it('shows source actions popover with copy actions on selected text context menu', async () => {
    const { onGoToSourceLine, onRequestAddComment } = renderPanel({
      markdownContent: '# Title\n\ntarget paragraph',
    })
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const mockVisibleSelection = (paragraphElement: HTMLElement) => {
      const selectedNode = paragraphElement.firstChild
      selectionSpy.mockReturnValue({
        isCollapsed: false,
        anchorNode: selectedNode,
        focusNode: selectedNode,
        toString: () => 'target',
      } as unknown as Selection)
    }

    const firstParagraph = screen.getByText('target paragraph')
    mockVisibleSelection(firstParagraph)
    fireEvent.contextMenu(firstParagraph, {
      clientX: 180,
      clientY: 220,
    })

    expect(screen.getByRole('dialog', { name: 'Source actions' })).toHaveTextContent(
      'docs/spec.md:L3',
    )
    const sourceActions = screen.getByRole('dialog', { name: 'Source actions' })
    const sourceActionButtons = within(sourceActions).getAllByRole('button')
    expect(sourceActionButtons[0]).toHaveTextContent('Add Comment')
    expect(sourceActionButtons[1]).toHaveTextContent('Go to Source')
    expect(sourceActionButtons[2]).toHaveTextContent('Copy Line Contents')
    expect(sourceActionButtons[3]).toHaveTextContent('Copy Contents and Path')
    expect(sourceActionButtons[4]).toHaveTextContent('Copy Relative Path')
    expect(sourceActionButtons[5]).toHaveTextContent('Close')

    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith(
      expect.objectContaining({
        relativePath: 'docs/spec.md',
        selectionRange: {
          startLine: 3,
          endLine: 3,
        },
      }),
    )

    const secondParagraph = screen.getByText('target paragraph')
    mockVisibleSelection(secondParagraph)
    fireEvent.contextMenu(secondParagraph, {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Source actions' }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    expect(
      (onGoToSourceLine as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0],
    ).toBe(3)
    expect(
      screen.queryByRole('dialog', { name: 'Source actions' }),
    ).not.toBeInTheDocument()
  })

  it('shows Edit Comment in source actions when the selected line already has a comment', async () => {
    const existingComment: CodeComment = {
      id: 'docs/spec.md:3-3:aaaa:2026-02-22T00:00:00.000Z',
      relativePath: 'docs/spec.md',
      startLine: 3,
      endLine: 3,
      body: 'Existing comment',
      anchor: {
        snippet: 'target paragraph',
        hash: 'aaaa',
      },
      createdAt: '2026-02-22T00:00:00.000Z',
    }
    const { onRequestEditComment } = renderPanel({
      markdownContent: '# Title\n\ntarget paragraph',
      commentLineEntries: new Map<number, readonly CodeComment[]>([
        [3, [existingComment]],
      ]),
    })

    const paragraph = screen.getByText('target paragraph')
    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Source actions' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit Comment' }))

    expect(onRequestEditComment).toHaveBeenCalledWith(existingComment)
  })

  it('shows Delete Comment in source actions when the selected line already has a comment', async () => {
    const existingComment: CodeComment = {
      id: 'docs/spec.md:3-3:aaaa:2026-02-22T00:00:00.000Z',
      relativePath: 'docs/spec.md',
      startLine: 3,
      endLine: 3,
      body: 'Existing comment',
      anchor: {
        snippet: 'target paragraph',
        hash: 'aaaa',
      },
      createdAt: '2026-02-22T00:00:00.000Z',
    }
    const { onRequestDeleteComment } = renderPanel({
      markdownContent: '# Title\n\ntarget paragraph',
      commentLineEntries: new Map<number, readonly CodeComment[]>([
        [3, [existingComment]],
      ]),
    })

    const paragraph = screen.getByText('target paragraph')
    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Source actions' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Comment' }))

    expect(onRequestDeleteComment).toHaveBeenCalledWith(existingComment)
  })

  it('calls copy action callbacks with raw markdown selection data', () => {
    const markdownContent = '# Title\n\nalpha\nbeta\ngamma'
    const {
      onRequestCopySelectedContent,
      onRequestCopyBoth,
      onRequestCopyRelativePath,
    } = renderPanel({
      markdownContent,
    })
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const paragraph = screen.getByText('alpha beta gamma')
    const selectionTextNode = findTextNodeContaining(paragraph, 'gamma')
    if (!selectionTextNode) {
      throw new Error('Expected paragraph text node containing gamma')
    }

    const anchorOffset = selectionTextNode.data.indexOf('gamma')
    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset,
      focusNode: selectionTextNode,
      focusOffset: selectionTextNode.data.length,
      toString: () => 'gamma',
    } as unknown as Selection)

    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Line Contents' }))
    expect(onRequestCopySelectedContent).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      content: markdownContent,
      selectionRange: {
        startLine: 5,
        endLine: 5,
      },
    })

    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Contents and Path' }))
    expect(onRequestCopyBoth).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      content: markdownContent,
      selectionRange: {
        startLine: 5,
        endLine: 5,
      },
    })

    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Relative Path' }))
    expect(onRequestCopyRelativePath).toHaveBeenCalledWith('docs/spec.md', {
      startLine: 5,
      endLine: 5,
    })
  })

  it('uses selected text source line instead of context-menu target line', () => {
    const { onRequestAddComment } = renderPanel({
      markdownContent: '# Title\n\nfirst paragraph\n\nsecond paragraph',
    })
    const firstParagraph = screen.getByText('first paragraph')
    const secondParagraph = screen.getByText('second paragraph')
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const selectedNode = secondParagraph.firstChild
    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectedNode,
      focusNode: selectedNode,
      toString: () => 'second',
    } as unknown as Selection)

    fireEvent.contextMenu(firstParagraph, {
      clientX: 160,
      clientY: 200,
    })

    expect(screen.getByRole('dialog', { name: 'Source actions' })).toHaveTextContent(
      'docs/spec.md:L5',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith(
      expect.objectContaining({
        relativePath: 'docs/spec.md',
        selectionRange: {
          startLine: 5,
          endLine: 5,
        },
      }),
    )
  })

  it('resolves exact source range inside fenced code blocks when available', async () => {
    const markdownContent =
      '# Title\n\n```json\n{\n  "first": 1,\n  "second": 2,\n  "third": 3\n}\n```'
    const targetFragment = 'third'
    const expectedStartOffset = markdownContent.indexOf(targetFragment)
    const expectedEndOffset = expectedStartOffset + targetFragment.length
    const { onGoToSourceLine, onRequestAddComment } = renderPanel({
      markdownContent,
    })

    const contentElement = screen.getByTestId('spec-viewer-content')
    const codeElement = contentElement.querySelector('pre code')
    if (!codeElement) {
      throw new Error('Expected rendered fenced code block')
    }

    await waitFor(() => {
      expect(findTextNodeContaining(codeElement, targetFragment)).not.toBeNull()
    })
    const selectionTextNode = findTextNodeContaining(codeElement, targetFragment)
    if (!selectionTextNode) {
      throw new Error('Expected code text node to contain target fragment')
    }
    const anchorOffset = selectionTextNode.data.indexOf(targetFragment)
    if (anchorOffset < 0) {
      throw new Error('Expected text node to include target fragment')
    }

    const expectedLine =
      markdownContent.slice(0, expectedStartOffset).split('\n').length

    const selectionSpy = vi.spyOn(window, 'getSelection')
    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset,
      focusNode: selectionTextNode,
      focusOffset: anchorOffset + targetFragment.length,
      toString: () => targetFragment,
    } as unknown as Selection)

    const contextMenuTarget =
      selectionTextNode.parentElement ?? (codeElement as HTMLElement)
    fireEvent.contextMenu(contextMenuTarget, {
      clientX: 180,
      clientY: 220,
    })

    expect(screen.getByRole('dialog', { name: 'Source actions' })).toHaveTextContent(
      `docs/spec.md:L${expectedLine}`,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))
    expect(onRequestAddComment).toHaveBeenCalledWith(
      expect.objectContaining({
        relativePath: 'docs/spec.md',
        selectionRange: {
          startLine: expectedLine,
          endLine: expectedLine,
        },
        sourceOffsetRange: {
          startOffset: expectedStartOffset,
          endOffset: expectedEndOffset,
        },
      }),
    )

    fireEvent.contextMenu(contextMenuTarget, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    expect(onGoToSourceLine).toHaveBeenCalledWith(expectedLine, {
      startOffset: expectedStartOffset,
      endOffset: expectedEndOffset,
    })
  })

  it('estimates a later source line for multiline paragraph selections', () => {
    const { onRequestAddComment } = renderPanel({
      markdownContent: '# Title\n\nalpha\nbeta\ngamma',
    })
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const paragraph = screen.getByTestId('spec-viewer-content').querySelector('p')
    if (!paragraph) {
      throw new Error('Expected rendered paragraph')
    }

    const selectionTextNode = findTextNodeContaining(paragraph, 'gamma')
    if (!selectionTextNode) {
      throw new Error('Expected paragraph text node containing gamma')
    }
    const anchorOffset = selectionTextNode.data.indexOf('gamma')
    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset,
      focusNode: selectionTextNode,
      focusOffset: selectionTextNode.data.length,
      toString: () => 'gamma',
    } as unknown as Selection)

    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith(
      expect.objectContaining({
        relativePath: 'docs/spec.md',
        selectionRange: {
          startLine: 5,
          endLine: 5,
        },
      }),
    )
  })

  it('uses the table cell source line instead of the table block line', () => {
    const { onGoToSourceLine, onRequestAddComment } = renderPanel({
      markdownContent:
        '# Title\n\n| left | right |\n| --- | --- |\n| alpha | beta |\n',
    })
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const table = screen.getByRole('table')
    const cell = screen.getByRole('cell', { name: 'beta' })
    const tableSourceLine = Number(table.getAttribute('data-source-line'))
    const cellSourceLine = Number(cell.getAttribute('data-source-line-start'))
    const selectionTextNode = findTextNodeContaining(cell, 'beta')
    if (
      !selectionTextNode ||
      !Number.isFinite(tableSourceLine) ||
      !Number.isFinite(cellSourceLine)
    ) {
      throw new Error('Expected table and cell source metadata')
    }
    expect(cellSourceLine).not.toBe(tableSourceLine)

    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset: 0,
      focusNode: selectionTextNode,
      focusOffset: selectionTextNode.data.length,
      toString: () => 'beta',
    } as unknown as Selection)

    fireEvent.contextMenu(cell, {
      clientX: 180,
      clientY: 220,
    })

    expect(screen.getByRole('dialog', { name: 'Source actions' })).toHaveTextContent(
      `docs/spec.md:L${cellSourceLine}`,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith(
      expect.objectContaining({
        relativePath: 'docs/spec.md',
        selectionRange: {
          startLine: cellSourceLine,
          endLine: cellSourceLine,
        },
      }),
    )

    fireEvent.contextMenu(cell, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    expect(
      (onGoToSourceLine as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0],
    ).toBe(cellSourceLine)
  })

  it('emits exact offset ranges for inline code selections inside a table cell when available', () => {
    const markdownContent =
      '# Title\n\n| left | right |\n| --- | --- |\n| alpha | `gamma` |\n'
    const expectedStartOffset = markdownContent.indexOf('gamma')
    const expectedEndOffset = expectedStartOffset + 'gamma'.length
    const { onGoToSourceLine, onRequestAddComment } = renderPanel({
      markdownContent,
    })
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const codeElement = screen.getByText(
      (_content, element) => element?.tagName === 'CODE' && element.textContent === 'gamma',
    )
    const selectionTextNode = findTextNodeContaining(codeElement, 'gamma')
    const cell = codeElement.closest('td')
    const cellSourceLine = Number(cell?.getAttribute('data-source-line-start'))
    if (!selectionTextNode || !cell || !Number.isFinite(cellSourceLine)) {
      throw new Error('Expected inline code inside table cell with source metadata')
    }

    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset: 0,
      focusNode: selectionTextNode,
      focusOffset: selectionTextNode.data.length,
      toString: () => 'gamma',
    } as unknown as Selection)

    fireEvent.contextMenu(codeElement, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: cellSourceLine,
        endLine: cellSourceLine,
      },
      sourceOffsetRange: {
        startOffset: expectedStartOffset,
        endOffset: expectedEndOffset,
      },
    })

    fireEvent.contextMenu(codeElement, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    expect(onGoToSourceLine).toHaveBeenCalledWith(cellSourceLine, {
      startOffset: expectedStartOffset,
      endOffset: expectedEndOffset,
    })
  })

  it('emits exact offset ranges for mixed paragraph selections when available', () => {
    const markdownContent = '# Title\n\nalpha **beta** gamma'
    const expectedStartOffset = markdownContent.indexOf('gamma')
    const expectedEndOffset = expectedStartOffset + 'gamma'.length
    const { onGoToSourceLine, onRequestAddComment } = renderPanel({
      markdownContent,
    })
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const paragraph = findParagraphByText('alpha beta gamma')
    const selectionTextNode = findTextNodeContaining(paragraph, 'gamma')
    if (!selectionTextNode) {
      throw new Error('Expected text node containing gamma')
    }

    const anchorOffset = selectionTextNode.data.indexOf('gamma')
    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset,
      focusNode: selectionTextNode,
      focusOffset: anchorOffset + 'gamma'.length,
      toString: () => 'gamma',
    } as unknown as Selection)

    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: 3,
        endLine: 3,
      },
      sourceOffsetRange: {
        startOffset: expectedStartOffset,
        endOffset: expectedEndOffset,
      },
    })

    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    expect(onGoToSourceLine).toHaveBeenCalledWith(3, {
      startOffset: expectedStartOffset,
      endOffset: expectedEndOffset,
    })
  })

  it('emits exact offset ranges for inline code selections when available', () => {
    const markdownContent = '# Title\n\nUse `gamma` token.'
    const expectedStartOffset = markdownContent.indexOf('gamma')
    const expectedEndOffset = expectedStartOffset + 'gamma'.length
    const { onGoToSourceLine, onRequestAddComment } = renderPanel({
      markdownContent,
    })
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const codeElement = screen.getByText(
      (_content, element) => element?.tagName === 'CODE' && element.textContent === 'gamma',
    )
    const selectionTextNode = findTextNodeContaining(codeElement, 'gamma')
    if (!selectionTextNode) {
      throw new Error('Expected inline code text node containing gamma')
    }

    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset: 0,
      focusNode: selectionTextNode,
      focusOffset: selectionTextNode.data.length,
      toString: () => 'gamma',
    } as unknown as Selection)

    fireEvent.contextMenu(codeElement, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: 3,
        endLine: 3,
      },
      sourceOffsetRange: {
        startOffset: expectedStartOffset,
        endOffset: expectedEndOffset,
      },
    })

    fireEvent.contextMenu(codeElement, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    expect(onGoToSourceLine).toHaveBeenCalledWith(3, {
      startOffset: expectedStartOffset,
      endOffset: expectedEndOffset,
    })
  })

  it('emits exact offset ranges for link text selections when available', () => {
    const markdownContent = '# Title\n\nSee [Guide Link](./guide.md) now.'
    const expectedStartOffset = markdownContent.indexOf('Guide Link')
    const expectedEndOffset = expectedStartOffset + 'Guide Link'.length
    const { onGoToSourceLine, onRequestAddComment } = renderPanel({
      markdownContent,
    })
    const selectionSpy = vi.spyOn(window, 'getSelection')
    const linkElement = screen.getByRole('link', { name: 'Guide Link' })
    const selectionTextNode = findTextNodeContaining(linkElement, 'Guide Link')
    if (!selectionTextNode) {
      throw new Error('Expected link text node containing Guide Link')
    }

    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset: 0,
      focusNode: selectionTextNode,
      focusOffset: selectionTextNode.data.length,
      toString: () => 'Guide Link',
    } as unknown as Selection)

    fireEvent.contextMenu(linkElement, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: 3,
        endLine: 3,
      },
      sourceOffsetRange: {
        startOffset: expectedStartOffset,
        endOffset: expectedEndOffset,
      },
    })

    fireEvent.contextMenu(linkElement, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    expect(onGoToSourceLine).toHaveBeenCalledWith(3, {
      startOffset: expectedStartOffset,
      endOffset: expectedEndOffset,
    })
  })

  it('renders comment count marker on nearest markdown block', async () => {
    renderPanel({
      markdownContent: '# Title\n\nParagraph',
      commentLineCounts: new Map<number, number>([[4, 2]]),
      commentLineEntries: new Map<number, readonly CodeComment[]>([
        [
          4,
          [
            {
              id: 'comment-1',
              relativePath: 'docs/spec.md',
              startLine: 4,
              endLine: 4,
              body: 'Paragraph comment',
              anchor: {
                snippet: 'Paragraph',
                hash: 'abcd',
              },
              createdAt: '2026-02-22T00:00:00.000Z',
            },
          ],
        ],
      ]),
    })

    await waitFor(() => {
      const paragraph = screen.getByText('Paragraph').closest('p')
      expect(paragraph).toHaveAttribute('data-has-comment-marker', 'true')
      expect(paragraph).toHaveAttribute('data-comment-count', '2')
    })
  })

  it('renders a table comment marker on the table cell instead of the table block', async () => {
    const markdownContent =
      '# Title\n\n| left | right |\n| --- | --- |\n| alpha | beta |\n'
    const betaStartOffset = markdownContent.indexOf('beta')
    const betaEndOffset = betaStartOffset + 'beta'.length
    if (betaStartOffset < 0) {
      throw new Error('Expected beta cell text in markdown source')
    }

    renderPanel({
      markdownContent,
      commentLineCounts: new Map<number, number>([[5, 1]]),
      commentLineEntries: new Map<number, readonly CodeComment[]>([
        [
          5,
          [
            {
              id: 'table-comment-1',
              relativePath: 'docs/spec.md',
              startLine: 5,
              endLine: 5,
              body: 'cell comment',
              anchor: {
                snippet: 'beta',
                hash: 't111',
                startOffset: betaStartOffset,
                endOffset: betaEndOffset,
              },
              createdAt: '2026-02-22T00:00:00.000Z',
            },
          ],
        ],
      ]),
    })

    await waitFor(() => {
      const betaCell = screen.getByText('beta').closest('td')
      const alphaCell = screen.getByText('alpha').closest('td')
      expect(betaCell).toHaveAttribute('data-has-comment-marker', 'true')
      expect(alphaCell).not.toHaveAttribute('data-has-comment-marker', 'true')
      expect(screen.queryByRole('table')).not.toHaveAttribute(
        'data-has-comment-marker',
        'true',
      )
    })
  })

  it('keeps per-cell marker counts stable when same-row table comments share a source line', async () => {
    const markdownContent =
      '# Title\n\n| left | right |\n| --- | --- |\n| alpha | beta |\n'
    const alphaStartOffset = markdownContent.indexOf('alpha')
    const betaStartOffset = markdownContent.indexOf('beta')
    if (alphaStartOffset < 0 || betaStartOffset < 0) {
      throw new Error('Expected table cell text in markdown source')
    }

    renderPanel({
      markdownContent,
      commentLineCounts: new Map<number, number>([[5, 2]]),
      commentLineEntries: new Map<number, readonly CodeComment[]>([
        [
          5,
          [
            {
              id: 'table-comment-alpha',
              relativePath: 'docs/spec.md',
              startLine: 5,
              endLine: 5,
              body: 'alpha comment',
              anchor: {
                snippet: 'alpha',
                hash: 'ta11',
                startOffset: alphaStartOffset,
                endOffset: alphaStartOffset + 'alpha'.length,
              },
              createdAt: '2026-02-22T00:00:00.000Z',
            },
            {
              id: 'table-comment-beta',
              relativePath: 'docs/spec.md',
              startLine: 5,
              endLine: 5,
              body: 'beta comment',
              anchor: {
                snippet: 'beta',
                hash: 'tb11',
                startOffset: betaStartOffset,
                endOffset: betaStartOffset + 'beta'.length,
              },
              createdAt: '2026-02-22T00:00:01.000Z',
            },
          ],
        ],
      ]),
    })

    await waitFor(() => {
      const alphaCell = screen.getByText('alpha').closest('td')
      const betaCell = screen.getByText('beta').closest('td')
      expect(alphaCell).toHaveAttribute('data-comment-count', '1')
      expect(betaCell).toHaveAttribute('data-comment-count', '1')
      expect(screen.queryByRole('table')).not.toHaveAttribute(
        'data-has-comment-marker',
        'true',
      )
    })
  })

  it('renders offset-less table comments on the table container instead of an arbitrary cell', async () => {
    renderPanel({
      markdownContent:
        '# Title\n\n| left | right |\n| --- | --- |\n| alpha | beta |\n',
      commentLineCounts: new Map<number, number>([[5, 1]]),
      commentLineEntries: new Map<number, readonly CodeComment[]>([
        [
          5,
          [
            {
              id: 'table-comment-legacy',
              relativePath: 'docs/spec.md',
              startLine: 5,
              endLine: 5,
              body: 'legacy table comment',
              anchor: {
                snippet: 'beta',
                hash: 'legacy1',
              },
              createdAt: '2026-02-22T00:00:00.000Z',
            },
          ],
        ],
      ]),
    })

    await waitFor(() => {
      const alphaCell = screen.getByText('alpha').closest('td')
      const betaCell = screen.getByText('beta').closest('td')
      const table = screen.getByRole('table')
      expect(table).toHaveAttribute('data-has-comment-marker', 'true')
      expect(alphaCell).not.toHaveAttribute('data-has-comment-marker', 'true')
      expect(betaCell).not.toHaveAttribute('data-has-comment-marker', 'true')
    })
  })

  it('shows hover popover on rendered markdown comment marker and opens detail panel', async () => {
    const { onRequestEditComment } = renderPanel({
      markdownContent: '# Title\n\nParagraph',
      commentLineCounts: new Map<number, number>([[4, 1]]),
      commentLineEntries: new Map<number, readonly CodeComment[]>([
        [
          4,
          [
            {
              id: 'comment-1',
              relativePath: 'docs/spec.md',
              startLine: 4,
              endLine: 4,
              body: 'Paragraph hover comment',
              anchor: {
                snippet: 'Paragraph',
                hash: 'abcd',
              },
              createdAt: '2026-02-22T00:00:00.000Z',
            },
          ],
        ],
      ]),
    })

    await waitFor(() => {
      expect(screen.getByTestId('spec-comment-marker-3')).toBeInTheDocument()
    })

    fireEvent.mouseEnter(screen.getByTestId('spec-comment-marker-3'))
    expect(screen.getByRole('dialog', { name: 'Comment previews' })).toHaveTextContent(
      'Paragraph hover comment',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open details' }))
    expect(
      screen.getByRole('dialog', { name: 'Comment details for line 3' }),
    ).toHaveTextContent('Paragraph hover comment')

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onRequestEditComment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'comment-1',
      }),
    )

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog', { name: 'Comment previews' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: 'Comment details for line 3' }),
    ).not.toBeInTheDocument()
  })

  it('renders a single marker for nested blocks sharing the same source line', async () => {
    renderPanel({
      markdownContent: '> quoted line',
      commentLineCounts: new Map<number, number>([[1, 1]]),
      commentLineEntries: new Map<number, readonly CodeComment[]>([
        [
          1,
          [
            {
              id: 'comment-q1',
              relativePath: 'docs/spec.md',
              startLine: 1,
              endLine: 1,
              body: 'quoted comment',
              anchor: {
                snippet: 'quoted line',
                hash: 'q111',
              },
              createdAt: '2026-02-22T00:00:00.000Z',
            },
          ],
        ],
      ]),
    })

    await waitFor(() => {
      expect(screen.getAllByTestId('spec-comment-marker-1')).toHaveLength(1)
    })
  })

  it('falls back to the clicked source line when selection is collapsed', () => {
    const { onRequestAddComment } = renderPanel({
      markdownContent: '# Title\n\ntarget paragraph',
    })
    const paragraph = screen.getByText('target paragraph')
    const selectedNode = paragraph.firstChild

    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: true,
      anchorNode: selectedNode,
      focusNode: selectedNode,
      toString: () => '',
    } as unknown as Selection)

    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })

    expect(screen.getByRole('dialog', { name: 'Source actions' })).toHaveTextContent(
      'docs/spec.md:L3',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: 3,
        endLine: 3,
      },
    })
  })

  it('opens search bar on Cmd+F when spec tab is active and highlights matching blocks', async () => {
    renderPanel({
      markdownContent: '# Title\n\nGuide intro\n\nOther paragraph',
      isActive: true,
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    const input = await screen.findByTestId('spec-viewer-search-input')
    expect(input).toHaveAttribute('placeholder', 'Find in spec (* supported)')
    fireEvent.change(input, { target: { value: 'guide' } })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-search-count')).toHaveTextContent('1 / 1')
    })
    const guideParagraph = findParagraphByText('Guide intro')
    expect(guideParagraph).toHaveClass('is-spec-search-match')
    expect(guideParagraph).toHaveClass('is-spec-search-focus')
  })

  it('supports wildcard queries within a single markdown line', async () => {
    renderPanel({
      markdownContent: '# Title\n\nGuide intro for API errors\n\nAnother paragraph',
      isActive: true,
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    const input = await screen.findByTestId('spec-viewer-search-input')
    fireEvent.change(input, { target: { value: 'guide*error' } })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-search-count')).toHaveTextContent('1 / 1')
    })
    const wildcardParagraph = findParagraphByText('Guide intro for API errors')
    expect(wildcardParagraph).toHaveClass(
      'is-spec-search-match',
    )
    expect(wildcardParagraph).toHaveClass(
      'is-spec-search-focus',
    )
  })

  it('maps table row matches to the matching tr element', async () => {
    renderPanel({
      markdownContent:
        '# Title\n\n| Name | Value |\n| --- | --- |\n| Guide row | 1 |\n| Other | 2 |',
      isActive: true,
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    const input = await screen.findByTestId('spec-viewer-search-input')
    const content = screen.getByTestId('spec-viewer-content')

    // Find the tr that contains "Guide row" — it now has data-source-line
    const allRows = Array.from(content.querySelectorAll('tr'))
    const guideRow = allRows.find((row) => row.textContent?.includes('Guide row'))
    expect(guideRow).toBeTruthy()

    const rowScrollIntoView = vi.fn()
    Object.defineProperty(guideRow!, 'scrollIntoView', {
      configurable: true,
      value: rowScrollIntoView,
    })

    fireEvent.change(input, { target: { value: 'guide' } })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-search-count')).toHaveTextContent('1 / 1')
    })
    expect(guideRow).toHaveClass('is-spec-search-match')
    expect(guideRow).toHaveClass('is-spec-search-focus')
    expect(rowScrollIntoView).toHaveBeenCalled()
  })

  it('navigates between search results and closes search on Escape', async () => {
    renderPanel({
      markdownContent: '# Title\n\nGuide intro\n\nAnother guide',
      isActive: true,
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    const input = await screen.findByTestId('spec-viewer-search-input')
    const firstMatch = findParagraphByText('Guide intro')
    const secondMatch = findParagraphByText('Another guide')
    const firstScrollIntoView = vi.fn()
    const secondScrollIntoView = vi.fn()
    Object.defineProperty(firstMatch, 'scrollIntoView', {
      configurable: true,
      value: firstScrollIntoView,
    })
    Object.defineProperty(secondMatch, 'scrollIntoView', {
      configurable: true,
      value: secondScrollIntoView,
    })

    fireEvent.change(input, { target: { value: 'guide' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-search-count')).toHaveTextContent('2 / 2')
    })
    expect(secondMatch).toHaveClass('is-spec-search-focus')
    expect(secondScrollIntoView).toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByTestId('spec-viewer-search-input')).not.toBeInTheDocument()
  })

  it('treats wildcard-only query as no matches', async () => {
    renderPanel({
      markdownContent: '# Title\n\nGuide intro\n\nAnother paragraph',
      isActive: true,
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    const input = await screen.findByTestId('spec-viewer-search-input')
    fireEvent.change(input, { target: { value: '**' } })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-search-count')).toHaveTextContent('0 / 0')
    })
    expect(screen.getByText('Guide intro')).not.toHaveClass('is-spec-search-match')
  })

  it('scrolls to the rendered block for an external navigation request and highlights it temporarily', async () => {
    const { rerender } = renderPanel({
      markdownContent: '# Title\n\nalpha\nbeta\ngamma',
    })

    const initialParagraph = findParagraphByText('alpha\nbeta\ngamma')
    const scrollIntoView = vi.fn()
    Object.defineProperty(initialParagraph, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    rerender(
      <SpecViewerPanel
        activeSpecPath="docs/spec.md"
        commentLineEntries={new Map()}
        commentLineCounts={new Map()}
        isLoading={false}
        isActive
        markdownContent={'# Title\n\nalpha\nbeta\ngamma'}
        navigationRequest={{
          targetRelativePath: 'docs/spec.md',
          lineNumber: 5,
          token: 1,
        }}
        onOpenCitationTarget={vi.fn().mockResolvedValue({ ok: true })}
        onGoToSourceLine={vi.fn()}
        onOpenRelativePath={vi.fn().mockReturnValue(true)}
        onRequestAddComment={vi.fn()}
        onRequestEditComment={vi.fn()}
        onRequestDeleteComment={vi.fn()}
        onRequestCopyBoth={vi.fn()}
        onRequestCopyRelativePath={vi.fn()}
        onRequestCopySelectedContent={vi.fn()}
        readError={null}
        restoredScrollTop={null}
        workspaceRootPath="/Users/tester/workspace"
      />,
    )

    await waitFor(() => {
      expect(findParagraphByText('alpha\nbeta\ngamma')).toHaveClass(
        'is-spec-navigation-target',
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1700))
    })

    await waitFor(() => {
      expect(findParagraphByText('alpha\nbeta\ngamma')).not.toHaveClass(
        'is-spec-navigation-target',
      )
    })
  })

  it('falls back to the nearest rendered block when external navigation line has no exact span', async () => {
    const { rerender } = renderPanel({
      markdownContent: '# Title\n\nIntro paragraph\n\n## Ending',
    })

    const heading = screen.getByRole('heading', { name: 'Ending' })
    const scrollIntoView = vi.fn()
    Object.defineProperty(heading, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    rerender(
      <SpecViewerPanel
        activeSpecPath="docs/spec.md"
        commentLineEntries={new Map()}
        commentLineCounts={new Map()}
        isLoading={false}
        isActive
        markdownContent={'# Title\n\nIntro paragraph\n\n## Ending'}
        navigationRequest={{
          targetRelativePath: 'docs/spec.md',
          lineNumber: 6,
          token: 2,
        }}
        onOpenCitationTarget={vi.fn().mockResolvedValue({ ok: true })}
        onGoToSourceLine={vi.fn()}
        onOpenRelativePath={vi.fn().mockReturnValue(true)}
        onRequestAddComment={vi.fn()}
        onRequestEditComment={vi.fn()}
        onRequestDeleteComment={vi.fn()}
        onRequestCopyBoth={vi.fn()}
        onRequestCopyRelativePath={vi.fn()}
        onRequestCopySelectedContent={vi.fn()}
        readError={null}
        restoredScrollTop={null}
        workspaceRootPath="/Users/tester/workspace"
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ending' })).toHaveClass(
        'is-spec-navigation-target',
      )
    })
  })

  it('ignores search hotkey when spec tab is inactive', () => {
    renderPanel({
      markdownContent: '# Title\n\nGuide intro',
      isActive: false,
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    expect(screen.queryByTestId('spec-viewer-search-input')).not.toBeInTheDocument()
  })

  describe('source line gutter', () => {
    it('attaches data-source-line to leaf block elements (p, li, h1-h6, pre)', () => {
      renderPanel({
        markdownContent: '# Heading\n\nParagraph text\n\n- item one\n- item two\n\n```js\nconsole.log("hi")\n```',
      })

      const content = screen.getByTestId('spec-viewer-content')
      const heading = content.querySelector('h1')
      const paragraph = content.querySelector('p')
      const listItems = content.querySelectorAll('li')
      const preBlock = content.querySelector('pre')

      expect(heading).toBeTruthy()
      expect(heading?.getAttribute('data-source-line')).toBeTruthy()

      expect(paragraph).toBeTruthy()
      expect(paragraph?.getAttribute('data-source-line')).toBeTruthy()

      expect(listItems.length).toBeGreaterThanOrEqual(2)
      for (const li of listItems) {
        expect(li.getAttribute('data-source-line')).toBeTruthy()
      }

      expect(preBlock).toBeTruthy()
      expect(preBlock?.getAttribute('data-source-line')).toBeTruthy()
    })

    it('attaches data-source-line to blockquote container but CSS should suppress its gutter display', () => {
      renderPanel({
        markdownContent: '> quoted paragraph\n>\n> second paragraph',
      })

      const content = screen.getByTestId('spec-viewer-content')
      const blockquote = content.querySelector('blockquote')
      const innerParagraphs = blockquote?.querySelectorAll('p') ?? []

      expect(blockquote).toBeTruthy()
      expect(blockquote?.getAttribute('data-source-line')).toBeTruthy()

      expect(innerParagraphs.length).toBeGreaterThanOrEqual(1)
      for (const p of innerParagraphs) {
        expect(p.getAttribute('data-source-line')).toBeTruthy()
      }
    })

    it('attaches data-source-line to table container but th/td use data-source-line-start only', () => {
      renderPanel({
        markdownContent: '| A | B |\n|---|---|\n| x | y |',
      })

      const content = screen.getByTestId('spec-viewer-content')
      const table = content.querySelector('table')

      expect(table).toBeTruthy()
      expect(table?.getAttribute('data-source-line')).toBeTruthy()

      const cells = content.querySelectorAll('th, td')
      for (const cell of cells) {
        expect(cell.getAttribute('data-source-line')).toBeNull()
        expect(cell.getAttribute('data-source-line-start')).toBeTruthy()
      }
    })

    it('attaches data-source-line to tr elements for table row line numbers (V1)', () => {
      renderPanel({
        markdownContent: '# Title\n\n| Col A | Col B |\n|-------|-------|\n| val1  | val2  |\n| val3  | val4  |',
      })

      const content = screen.getByTestId('spec-viewer-content')
      const rows = content.querySelectorAll('tr')

      expect(rows.length).toBeGreaterThanOrEqual(2)
      for (const row of rows) {
        expect(row.getAttribute('data-source-line')).toBeTruthy()
      }
    })

    it('does not attach data-source-line to th/td cells — only tr rows get it (V2)', () => {
      renderPanel({
        markdownContent: '| A | B |\n|---|---|\n| x | y |',
      })

      const content = screen.getByTestId('spec-viewer-content')
      const cells = content.querySelectorAll('th, td')
      for (const cell of cells) {
        expect(cell.getAttribute('data-source-line')).toBeNull()
      }
    })

    it('attaches data-source-line to spans inside fenced code blocks (V3)', async () => {
      renderPanel({
        markdownContent: '# Title\n\n```python\ndef hello():\n    print("world")\n```',
      })

      const content = screen.getByTestId('spec-viewer-content')
      const codeElement = content.querySelector('pre code')
      expect(codeElement).toBeTruthy()

      const lineSpans = codeElement?.querySelectorAll('span[data-source-line]') ?? []
      expect(lineSpans.length).toBe(2)

      // In this markdown: line 1 = "# Title", line 2 = "", line 3 = "```python",
      // line 4 = "def hello():", line 5 = '    print("world")', line 6 = "```".
      // The remark code node's position.start.line points to the opening fence
      // (line 3), so sourceLineStart = 3.  The first code line gets 3+0=3 and
      // the second gets 3+1=4.  This is consistent with the existing
      // resolveCodeBlockLineOffset logic in source-line-resolver.ts which also
      // uses pre's data-source-line-start (opening fence) as the base.
      const firstLineNum = Number(lineSpans[0]?.getAttribute('data-source-line'))
      const secondLineNum = Number(lineSpans[1]?.getAttribute('data-source-line'))
      expect(firstLineNum).toBe(3)
      expect(secondLineNum).toBe(4)
    })
  })
})
