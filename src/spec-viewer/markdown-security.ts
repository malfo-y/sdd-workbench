import { defaultSchema, type Schema } from 'hast-util-sanitize'
import { resolveSpecLink } from './spec-link-utils'

const SAFE_URI_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i
const BLOCKED_URI_SCHEME_PATTERN = /^(?:javascript|vbscript|file):/i
const DATA_IMAGE_URI_PATTERN =
  /^data:image\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*;base64,[a-z0-9+/=\s]+$/i

const BASE_SANITIZE_ATTRIBUTES = defaultSchema.attributes ?? {}
type SchemaProperty =
  | string
  | [string, ...(string | number | boolean | RegExp | null | undefined)[]]

function normalizeUri(rawValue: string | null | undefined) {
  return rawValue?.trim() ?? ''
}

function toArrayValue(value: unknown): SchemaProperty[] {
  if (!value) {
    return []
  }

  const candidateProperties = (Array.isArray(value) ? value : [value]).filter(
    (property) => property !== undefined && property !== null,
  )

  return candidateProperties as SchemaProperty[]
}

function withUniquePropertyNames(
  currentProperties: SchemaProperty[],
  additionalPropertyNames: string[],
): SchemaProperty[] {
  const existingPropertyNames = new Set(
    currentProperties.map((property) =>
      Array.isArray(property) ? property[0] : property,
    ),
  )
  const merged = [...currentProperties]
  for (const propertyName of additionalPropertyNames) {
    if (!existingPropertyNames.has(propertyName)) {
      merged.push(propertyName)
    }
  }
  return merged
}

export const MARKDOWN_SANITIZE_SCHEMA: Schema = {
  ...defaultSchema,
  attributes: {
    ...BASE_SANITIZE_ATTRIBUTES,
    a: withUniquePropertyNames(
      toArrayValue(BASE_SANITIZE_ATTRIBUTES.a),
      ['href', 'title'],
    ),
    img: withUniquePropertyNames(
      toArrayValue(BASE_SANITIZE_ATTRIBUTES.img),
      ['src', 'alt', 'title'],
    ),
    h1: withUniquePropertyNames(
      toArrayValue(BASE_SANITIZE_ATTRIBUTES.h1),
      ['id'],
    ),
    h2: withUniquePropertyNames(
      toArrayValue(BASE_SANITIZE_ATTRIBUTES.h2),
      ['id'],
    ),
    h3: withUniquePropertyNames(
      toArrayValue(BASE_SANITIZE_ATTRIBUTES.h3),
      ['id'],
    ),
    h4: withUniquePropertyNames(
      toArrayValue(BASE_SANITIZE_ATTRIBUTES.h4),
      ['id'],
    ),
    h5: withUniquePropertyNames(
      toArrayValue(BASE_SANITIZE_ATTRIBUTES.h5),
      ['id'],
    ),
    h6: withUniquePropertyNames(
      toArrayValue(BASE_SANITIZE_ATTRIBUTES.h6),
      ['id'],
    ),
  },
}

export function isAllowedDataImageUri(rawValue: string | null | undefined) {
  const normalizedUri = normalizeUri(rawValue)
  return DATA_IMAGE_URI_PATTERN.test(normalizedUri)
}

export function sanitizeMarkdownUri(rawValue: string | null | undefined) {
  const normalizedUri = normalizeUri(rawValue)
  if (!normalizedUri) {
    return ''
  }

  if (normalizedUri.startsWith('#')) {
    return normalizedUri
  }

  if (isAllowedDataImageUri(normalizedUri)) {
    return normalizedUri
  }

  if (BLOCKED_URI_SCHEME_PATTERN.test(normalizedUri)) {
    return ''
  }

  if (!SAFE_URI_SCHEME_PATTERN.test(normalizedUri)) {
    return normalizedUri
  }

  const lowerCasedUri = normalizedUri.toLowerCase()
  if (
    lowerCasedUri.startsWith('http:') ||
    lowerCasedUri.startsWith('https:') ||
    lowerCasedUri.startsWith('mailto:')
  ) {
    return normalizedUri
  }

  return ''
}

function toWorkspaceFileUrl(rootPath: string, relativePath: string) {
  const normalizedRootPath = rootPath
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
  const encodedRelativePath = relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const rootWithLeadingSlash = normalizedRootPath.startsWith('/')
    ? normalizedRootPath
    : `/${normalizedRootPath}`
  return `file://${rootWithLeadingSlash}/${encodedRelativePath}`
}

export function resolveMarkdownImageSource(
  rawSource: string | null | undefined,
  activeSpecPath: string | null,
  workspaceRootPath: string | null,
) {
  const sanitizedSource = sanitizeMarkdownUri(rawSource)
  if (!sanitizedSource) {
    return null
  }

  if (isAllowedDataImageUri(sanitizedSource)) {
    return sanitizedSource
  }

  if (!activeSpecPath || !workspaceRootPath) {
    return null
  }

  const resolvedLink = resolveSpecLink(sanitizedSource, activeSpecPath)
  if (resolvedLink.kind !== 'workspace-file') {
    return null
  }

  return toWorkspaceFileUrl(workspaceRootPath, resolvedLink.targetRelativePath)
}
