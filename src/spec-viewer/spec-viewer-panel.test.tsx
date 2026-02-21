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
    onOpenRelativePath = vi
      .fn<
        (
          relativePath: string,
          lineRange: { startLine: number; endLine: number } | null,
        ) => boolean
      >()
      .mockReturnValue(true),
  }: {
    workspaceRootPath?: string | null
    activeSpecPath?: string | null
    markdownContent?: string | null
    isLoading?: boolean
    readError?: string | null
    onGoToSourceLine?: (lineNumber: number) => void
    onOpenRelativePath?: (
      relativePath: string,
      lineRange: { startLine: number; endLine: number } | null,
    ) => boolean
  } = {}) {
    render(
      <SpecViewerPanel
        activeSpecPath={activeSpecPath}
        isLoading={isLoading}
        markdownContent={markdownContent}
        onGoToSourceLine={onGoToSourceLine}
        onOpenRelativePath={onOpenRelativePath}
        readError={readError}
        workspaceRootPath={workspaceRootPath}
      />,
    )

    return {
      onGoToSourceLine,
      onOpenRelativePath,
    }
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

  it('keeps default behavior for same-document anchor links', () => {
    const onOpenRelativePath = vi
      .fn<
        (
          relativePath: string,
          lineRange: { startLine: number; endLine: number } | null,
        ) => boolean
      >()
      .mockReturnValue(true)
    renderPanel({
      markdownContent: '[Jump](#title)\n\n# Title',
      onOpenRelativePath,
    })

    const anchorLink = screen.getByRole('link', { name: 'Jump' })
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 60,
      clientY: 80,
    })
    anchorLink.dispatchEvent(clickEvent)

    expect(clickEvent.defaultPrevented).toBe(false)
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

  it('shows Go to Source popover on selected text context menu', () => {
    const { onGoToSourceLine } = renderPanel({
      markdownContent: '# Title\n\ntarget paragraph',
    })
    const paragraph = screen.getByText('target paragraph')
    const selectedNode = paragraph.firstChild

    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: selectedNode,
      focusNode: selectedNode,
      toString: () => 'target',
    } as unknown as Selection)

    fireEvent.contextMenu(paragraph, {
      clientX: 180,
      clientY: 220,
    })

    expect(screen.getByRole('dialog', { name: 'Source actions' })).toHaveTextContent(
      'Line 3',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }))

    expect(onGoToSourceLine).toHaveBeenCalledWith(3)
    expect(
      screen.queryByRole('dialog', { name: 'Source actions' }),
    ).not.toBeInTheDocument()
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
})
