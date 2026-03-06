import {
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

describe('SpecViewerPanel', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  function renderPanel({
    workspaceRootPath = '/Users/tester/workspace',
    activeSpecPath = 'docs/spec.md',
    markdownContent = '# Title\n\n## Intro\ntext',
    isLoading = false,
    readError = null,
    onGoToSourceLine = vi.fn<(lineNumber: number) => void>(),
    onRequestAddComment = vi.fn<
      (input: {
        relativePath: string
        selectionRange: { startLine: number; endLine: number }
      }) => void
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
        ) => boolean
      >()
      .mockReturnValue(true),
    commentLineCounts = new Map<number, number>(),
    commentLineEntries = new Map<number, readonly CodeComment[]>(),
  }: {
    workspaceRootPath?: string | null
    activeSpecPath?: string | null
    markdownContent?: string | null
    isLoading?: boolean
    readError?: string | null
    onGoToSourceLine?: (lineNumber: number) => void
    onRequestAddComment?: (input: {
      relativePath: string
      selectionRange: { startLine: number; endLine: number }
    }) => void
    onScrollPositionChange?: (input: {
      relativePath: string
      scrollTop: number
    }) => void
    restoredScrollTop?: number | null
    isActive?: boolean
    onOpenRelativePath?: (
      relativePath: string,
      lineRange: { startLine: number; endLine: number } | null,
    ) => boolean
    commentLineCounts?: ReadonlyMap<number, number>
    commentLineEntries?: ReadonlyMap<number, readonly CodeComment[]>
  } = {}) {
    render(
      <SpecViewerPanel
        activeSpecPath={activeSpecPath}
        commentLineEntries={commentLineEntries}
        commentLineCounts={commentLineCounts}
        isLoading={isLoading}
        markdownContent={markdownContent}
        onScrollPositionChange={onScrollPositionChange}
        onRequestAddComment={onRequestAddComment}
        onGoToSourceLine={onGoToSourceLine}
        onOpenRelativePath={onOpenRelativePath}
        readError={readError}
        restoredScrollTop={restoredScrollTop}
        isActive={isActive}
        workspaceRootPath={workspaceRootPath}
      />,
    )

    return {
      onGoToSourceLine,
      onRequestAddComment,
      onOpenRelativePath,
      onScrollPositionChange,
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
    expect(onOpenRelativePath).toHaveBeenCalledWith('docs/guide.md', null)
  })

  it('passes single-line and range line hashes for workspace file links', () => {
    const onOpenRelativePath = vi
      .fn<
        (
          relativePath: string,
          lineRange: { startLine: number; endLine: number } | null,
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
    })
    expect(onOpenRelativePath).toHaveBeenNthCalledWith(2, 'docs/guide.md', {
      startLine: 10,
      endLine: 20,
    })
  })

  it('scrolls to same-document heading for markdown anchor links', () => {
    const onOpenRelativePath = vi
      .fn<
        (
          relativePath: string,
          lineRange: { startLine: number; endLine: number } | null,
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
      'blocked placeholder text',
    )
    expect(screen.queryByRole('img', { name: 'External' })).not.toBeInTheDocument()
  })

  it('shows Add Comment + Go to Source popover on selected text context menu', async () => {
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
      'Line 3',
    )
    const sourceActions = screen.getByRole('dialog', { name: 'Source actions' })
    const sourceActionButtons = within(sourceActions).getAllByRole('button')
    expect(sourceActionButtons[0]).toHaveTextContent('Add Comment')
    expect(sourceActionButtons[1]).toHaveTextContent('Go to Source')

    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: 3,
        endLine: 3,
      },
    })

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

    expect(onGoToSourceLine).toHaveBeenCalledWith(3)
    expect(
      screen.queryByRole('dialog', { name: 'Source actions' }),
    ).not.toBeInTheDocument()
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
      'Line 5',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: 5,
        endLine: 5,
      },
    })
  })

  it('resolves source line inside fenced code block based on selection offset', async () => {
    const { onRequestAddComment } = renderPanel({
      markdownContent:
        '# Title\n\n```json\n{\n  "first": 1,\n  "second": 2,\n  "third": 3\n}\n```',
    })

    const contentElement = screen.getByTestId('spec-viewer-content')
    const codeElement = contentElement.querySelector('pre code')
    const preElement = codeElement?.closest('pre')
    const baseSourceLine = Number(preElement?.getAttribute('data-source-line'))
    if (!codeElement || !preElement || !Number.isFinite(baseSourceLine)) {
      throw new Error('Expected rendered fenced code block with data-source-line')
    }

    await waitFor(() => {
      expect(findTextNodeContaining(codeElement, '"third"')).not.toBeNull()
    })
    const selectionTextNode = findTextNodeContaining(codeElement, '"third"')
    if (!selectionTextNode) {
      throw new Error('Expected code text node to contain target fragment')
    }
    const anchorOffset = selectionTextNode.data.indexOf('"third"')
    if (anchorOffset < 0) {
      throw new Error('Expected text node to include target fragment')
    }

    const prefixRange = document.createRange()
    prefixRange.setStart(codeElement, 0)
    prefixRange.setEnd(selectionTextNode, anchorOffset)
    const lineOffset = (prefixRange.toString().match(/\n/g) ?? []).length
    const expectedLine = baseSourceLine + lineOffset

    const selectionSpy = vi.spyOn(window, 'getSelection')
    selectionSpy.mockReturnValue({
      isCollapsed: false,
      anchorNode: selectionTextNode,
      anchorOffset,
      focusNode: selectionTextNode,
      focusOffset: anchorOffset + '"third"'.length,
      toString: () => '"third"',
    } as unknown as Selection)

    const contextMenuTarget =
      selectionTextNode.parentElement ?? (codeElement as HTMLElement)
    fireEvent.contextMenu(contextMenuTarget, {
      clientX: 180,
      clientY: 220,
    })

    expect(screen.getByRole('dialog', { name: 'Source actions' })).toHaveTextContent(
      `Line ${expectedLine}`,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))
    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: expectedLine,
        endLine: expectedLine,
      },
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

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: 5,
        endLine: 5,
      },
    })
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
      `Line ${cellSourceLine}`,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))

    expect(onRequestAddComment).toHaveBeenCalledWith({
      relativePath: 'docs/spec.md',
      selectionRange: {
        startLine: cellSourceLine,
        endLine: cellSourceLine,
      },
    })

    fireEvent.contextMenu(cell, {
      clientX: 180,
      clientY: 220,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    expect(onGoToSourceLine).toHaveBeenCalledWith(cellSourceLine)
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

  it('shows hover popover on rendered markdown comment marker', async () => {
    renderPanel({
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

    fireEvent.mouseDown(document.body)
    expect(
      screen.queryByRole('dialog', { name: 'Comment previews' }),
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

  it('ignores context menu when selection is collapsed', () => {
    renderPanel({
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

    expect(
      screen.queryByRole('dialog', { name: 'Source actions' }),
    ).not.toBeInTheDocument()
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
    expect(screen.getByText('Guide intro')).toHaveClass('is-spec-search-match')
    expect(screen.getByText('Guide intro')).toHaveClass('is-spec-search-focus')
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
    expect(screen.getByText('Guide intro for API errors')).toHaveClass(
      'is-spec-search-match',
    )
    expect(screen.getByText('Guide intro for API errors')).toHaveClass(
      'is-spec-search-focus',
    )
  })

  it('maps table row matches to the rendered table block', async () => {
    renderPanel({
      markdownContent:
        '# Title\n\n| Name | Value |\n| --- | --- |\n| Guide row | 1 |\n| Other | 2 |',
      isActive: true,
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    const input = await screen.findByTestId('spec-viewer-search-input')
    const table = screen.getByRole('table') as HTMLElement
    const tableScrollIntoView = vi.fn()
    Object.defineProperty(table, 'scrollIntoView', {
      configurable: true,
      value: tableScrollIntoView,
    })

    fireEvent.change(input, { target: { value: 'guide' } })

    await waitFor(() => {
      expect(screen.getByTestId('spec-viewer-search-count')).toHaveTextContent('1 / 1')
    })
    expect(table).toHaveClass('is-spec-search-match')
    expect(table).toHaveClass('is-spec-search-focus')
    expect(tableScrollIntoView).toHaveBeenCalled()
  })

  it('navigates between search results and closes search on Escape', async () => {
    renderPanel({
      markdownContent: '# Title\n\nGuide intro\n\nAnother guide',
      isActive: true,
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    const input = await screen.findByTestId('spec-viewer-search-input')
    const firstMatch = screen.getByText('Guide intro') as HTMLElement
    const secondMatch = screen.getByText('Another guide') as HTMLElement
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

  it('ignores search hotkey when spec tab is inactive', () => {
    renderPanel({
      markdownContent: '# Title\n\nGuide intro',
      isActive: false,
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    expect(screen.queryByTestId('spec-viewer-search-input')).not.toBeInTheDocument()
  })
})
