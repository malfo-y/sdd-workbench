import { sortCodeComments, type CodeComment } from './comment-types'

export type RenderLlmBundleInput = {
  instruction: string
  comments: CodeComment[]
  globalComments?: string
}

export type GlobalCommentsSection = {
  title: string
  body: string
}

export type GlobalCommentsGroup = {
  kind: 'project' | 'document' | 'group' | 'general'
  title: string
  body: string
  sections: GlobalCommentsSection[]
  documentPath?: string
}

export type GlobalCommentsOrganization = {
  preamble: string
  groups: GlobalCommentsGroup[]
}

type MutableGlobalCommentsSection = {
  title: string
  bodyLines: string[]
}

type MutableGlobalCommentsGroup = {
  kind: GlobalCommentsGroup['kind']
  title: string
  bodyLines: string[]
  sections: MutableGlobalCommentsSection[]
  documentPath?: string
}

const LEVEL_TWO_HEADING_PATTERN = /^##\s+(.+?)\s*$/
const LEVEL_THREE_HEADING_PATTERN = /^###\s+(.+?)\s*$/
const DOCUMENT_GROUP_PATTERN = /^document:\s*(.+)$/i
const PROJECT_WIDE_GROUP_PATTERN = /^project-wide$/i
const SECTION_PATTERN = /^section:\s*(.+)$/i
const GENERAL_GROUP_TITLE = 'General'

function renderCommentBlock(comment: CodeComment): string {
  const header =
    comment.startLine === comment.endLine
      ? `### ${comment.relativePath}:L${comment.startLine}`
      : `### ${comment.relativePath}:L${comment.startLine} (~L${comment.endLine})`

  const snippetFirstLine = comment.anchor.snippet
    ? comment.anchor.snippet.split('\n')[0]
    : ''

  const lines: string[] = [header, '']

  if (snippetFirstLine) {
    lines.push(`> ${snippetFirstLine}`, '')
  }

  lines.push(comment.body)

  return lines.join('\n')
}

function normalizeGlobalComments(globalComments: string | undefined): string {
  return typeof globalComments === 'string' ? globalComments.trim() : ''
}

function trimMarkdownBlock(lines: string[]): string {
  return lines.join('\n').trim()
}

function normalizeGlobalCommentsGroupTitle(rawTitle: string): Pick<
  GlobalCommentsGroup,
  'kind' | 'title' | 'documentPath'
> {
  const trimmedTitle = rawTitle.trim()
  const documentMatch = trimmedTitle.match(DOCUMENT_GROUP_PATTERN)
  if (documentMatch) {
    const documentPath = documentMatch[1].trim()
    return {
      kind: 'document',
      title: `Document: ${documentPath}`,
      documentPath,
    }
  }

  if (PROJECT_WIDE_GROUP_PATTERN.test(trimmedTitle)) {
    return {
      kind: 'project',
      title: 'Project-wide',
    }
  }

  return {
    kind: 'group',
    title: trimmedTitle,
  }
}

function normalizeGlobalCommentsSectionTitle(rawTitle: string): string {
  const trimmedTitle = rawTitle.trim()
  const sectionMatch = trimmedTitle.match(SECTION_PATTERN)
  if (sectionMatch) {
    return `Section: ${sectionMatch[1].trim()}`
  }
  return trimmedTitle
}

function buildGeneralGlobalCommentsGroup(): MutableGlobalCommentsGroup {
  return {
    kind: 'general',
    title: GENERAL_GROUP_TITLE,
    bodyLines: [],
    sections: [],
  }
}

export function parseGlobalCommentsOrganization(
  globalComments: string | undefined,
): GlobalCommentsOrganization | null {
  const normalizedGlobalComments = normalizeGlobalComments(globalComments)
  if (normalizedGlobalComments.length === 0) {
    return null
  }

  const preambleLines: string[] = []
  const groups: MutableGlobalCommentsGroup[] = []
  let currentGroup: MutableGlobalCommentsGroup | null = null
  let currentSection: MutableGlobalCommentsSection | null = null

  const ensureGeneralGroup = () => {
    if (currentGroup) {
      return currentGroup
    }
    const nextGroup = buildGeneralGlobalCommentsGroup()
    groups.push(nextGroup)
    currentGroup = nextGroup
    currentSection = null
    return nextGroup
  }

  for (const line of normalizedGlobalComments.split('\n')) {
    const levelTwoHeading = line.match(LEVEL_TWO_HEADING_PATTERN)
    if (levelTwoHeading) {
      const nextGroup: MutableGlobalCommentsGroup = {
        ...normalizeGlobalCommentsGroupTitle(levelTwoHeading[1]),
        bodyLines: [],
        sections: [],
      }
      groups.push(nextGroup)
      currentGroup = nextGroup
      currentSection = null
      continue
    }

    const levelThreeHeading = line.match(LEVEL_THREE_HEADING_PATTERN)
    if (levelThreeHeading) {
      const parentGroup = ensureGeneralGroup()
      const nextSection: MutableGlobalCommentsSection = {
        title: normalizeGlobalCommentsSectionTitle(levelThreeHeading[1]),
        bodyLines: [],
      }
      parentGroup.sections.push(nextSection)
      currentSection = nextSection
      continue
    }

    if (currentSection) {
      currentSection.bodyLines.push(line)
      continue
    }

    if (currentGroup) {
      currentGroup.bodyLines.push(line)
      continue
    }

    preambleLines.push(line)
  }

  return {
    preamble: trimMarkdownBlock(preambleLines),
    groups: groups.map((group) => ({
      kind: group.kind,
      title: group.title,
      body: trimMarkdownBlock(group.bodyLines),
      sections: group.sections.map((section) => ({
        title: section.title,
        body: trimMarkdownBlock(section.bodyLines),
      })),
      ...(group.documentPath ? { documentPath: group.documentPath } : {}),
    })),
  }
}

function renderGlobalCommentsSection(globalComments: string | undefined): string | null {
  const parsedOrganization = parseGlobalCommentsOrganization(globalComments)
  if (!parsedOrganization) {
    return null
  }

  if (parsedOrganization.groups.length === 0) {
    return ['## Global Comments', '', parsedOrganization.preamble].join('\n')
  }

  const lines: string[] = ['## Global Comments', '']

  if (parsedOrganization.preamble.length > 0) {
    lines.push('### General', '', parsedOrganization.preamble, '')
  }

  for (const group of parsedOrganization.groups) {
    if (group.kind !== 'general' || parsedOrganization.preamble.length === 0) {
      lines.push(`### ${group.title}`, '')
    }

    if (group.body.length > 0) {
      lines.push(group.body, '')
    }

    for (const section of group.sections) {
      lines.push(`#### ${section.title}`, '')
      if (section.body.length > 0) {
        lines.push(section.body, '')
      }
    }
  }

  while (lines.at(-1) === '') {
    lines.pop()
  }

  return lines.join('\n')
}

export function renderCommentsMarkdown(
  comments: CodeComment[],
  options?: {
    globalComments?: string
  },
): string {
  const sortedComments = sortCodeComments(comments)
  const normalizedGlobalComments = normalizeGlobalComments(options?.globalComments)
  const globalCommentsSection = renderGlobalCommentsSection(options?.globalComments)

  const sections = sortedComments.map((comment) => renderCommentBlock(comment))
  const commentsBody =
    sections.length > 0 ? sections.join('\n\n---\n\n') : '_No comments._'
  const markdownSections: string[] = []

  if (globalCommentsSection) {
    markdownSections.push(globalCommentsSection, '')
  }

  markdownSections.push('## Comments', '', commentsBody)

  return [
    '# _COMMENTS',
    '',
    `Generated at: ${new Date().toISOString()}`,
    `Total comments: ${sortedComments.length}${normalizedGlobalComments.length > 0 ? ' (+ global comments)' : ''}`,
    '',
    ...markdownSections,
    '',
  ].join('\n')
}

export function renderLlmBundle(input: RenderLlmBundleInput): string {
  const sortedComments = sortCodeComments(input.comments)
  const normalizedInstruction = input.instruction.trim() || '(No instruction provided)'
  const globalCommentsSection = renderGlobalCommentsSection(input.globalComments)

  const commentBlocks =
    sortedComments.length > 0
      ? sortedComments.map((comment) => renderCommentBlock(comment)).join('\n\n')
      : '_No comments._'

  return [
    '# LLM Comment Bundle',
    '',
    '## Instruction',
    normalizedInstruction,
    '',
    '## Constraints',
    '- Do not edit files not referenced by comments unless required to satisfy dependencies.',
    '- Keep changes minimal and explain tradeoffs when assumptions are needed.',
    '- Respect existing workspace boundaries and relative paths exactly as provided.',
    '',
    ...(globalCommentsSection ? [globalCommentsSection, ''] : []),
    '## Comments',
    commentBlocks,
    '',
  ].join('\n')
}
