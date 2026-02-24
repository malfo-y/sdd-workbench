import { sortCodeComments, type CodeComment } from './comment-types'

export type RenderLlmBundleInput = {
  instruction: string
  comments: CodeComment[]
  globalComments?: string
}

function renderCommentBlock(comment: CodeComment): string {
  return [
    `### ${comment.relativePath}:L${comment.startLine}-L${comment.endLine}`,
    '',
    comment.body,
    '',
    `- anchor.hash: ${comment.anchor.hash}`,
    `- anchor.snippet: ${comment.anchor.snippet || '(empty)'}`,
    ...(comment.anchor.before ? [`- anchor.before: ${comment.anchor.before}`] : []),
    ...(comment.anchor.after ? [`- anchor.after: ${comment.anchor.after}`] : []),
    `- createdAt: ${comment.createdAt}`,
  ].join('\n')
}

function normalizeGlobalComments(globalComments: string | undefined): string {
  return typeof globalComments === 'string' ? globalComments.trim() : ''
}

export function renderCommentsMarkdown(
  comments: CodeComment[],
  options?: {
    globalComments?: string
  },
): string {
  const sortedComments = sortCodeComments(comments)
  const normalizedGlobalComments = normalizeGlobalComments(options?.globalComments)

  const sections = sortedComments.map((comment) => renderCommentBlock(comment))
  const commentsBody =
    sections.length > 0 ? sections.join('\n\n---\n\n') : '_No comments._'
  const markdownSections: string[] = []

  if (normalizedGlobalComments.length > 0) {
    markdownSections.push(
      '## Global Comments',
      '',
      normalizedGlobalComments,
      '',
    )
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
  const normalizedGlobalComments = normalizeGlobalComments(input.globalComments)
  const normalizedInstruction = input.instruction.trim() || '(No instruction provided)'

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
    ...(normalizedGlobalComments.length > 0
      ? ['## Global Comments', normalizedGlobalComments, '']
      : []),
    '## Comments',
    commentBlocks,
    '',
  ].join('\n')
}
