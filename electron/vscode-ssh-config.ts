import os from 'node:os'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

export type WorkspaceSyncVsCodeSshConfigRequest = {
  sshAlias: string
  host: string
  user?: string
  port?: number
  identityFile?: string
}

export type WorkspaceSyncVsCodeSshConfigResult =
  | {
      ok: true
      configPath: string
      managedConfigPath: string
      includeInserted: boolean
      entryUpdated: boolean
    }
  | {
      ok: false
      error: string
    }

type SyncVsCodeSshConfigDependencies = {
  homeDirectory?: string
}

const SSH_DIRECTORY_NAME = '.ssh'
const SSH_CONFIG_FILE_NAME = 'config'
const MANAGED_SSH_CONFIG_FILE_NAME = 'sdd-workbench.config'
const MANAGED_SSH_INCLUDE_LINE = 'Include ~/.ssh/sdd-workbench.config'
const MANAGED_SSH_HEADER = [
  '# Managed by SDD Workbench for VSCode Remote-SSH.',
  '# Manual edits inside managed host blocks may be overwritten.',
  '',
].join('\n')

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildManagedHostBlock(
  request: WorkspaceSyncVsCodeSshConfigRequest,
): string {
  const lines = [
    `# >>> SDD Workbench: ${request.sshAlias} >>>`,
    `Host ${request.sshAlias}`,
    `  HostName ${request.host}`,
  ]

  if (request.user?.trim()) {
    lines.push(`  User ${request.user.trim()}`)
  }
  if (typeof request.port === 'number' && Number.isInteger(request.port)) {
    lines.push(`  Port ${request.port}`)
  }
  if (request.identityFile?.trim()) {
    lines.push(`  IdentityFile ${request.identityFile.trim()}`)
    lines.push('  IdentitiesOnly yes')
  }

  lines.push(`# <<< SDD Workbench: ${request.sshAlias} <<<`, '')
  return lines.join('\n')
}

function ensureManagedHeader(content: string): string {
  if (content.trim().length === 0) {
    return MANAGED_SSH_HEADER
  }
  if (content.startsWith('# Managed by SDD Workbench for VSCode Remote-SSH.')) {
    return content
  }
  return `${MANAGED_SSH_HEADER}${content.replace(/^\n+/, '')}`
}

function upsertManagedHostBlock(
  content: string,
  request: WorkspaceSyncVsCodeSshConfigRequest,
): string {
  const normalizedContent = ensureManagedHeader(content)
  const block = buildManagedHostBlock(request)
  const startMarker = `# >>> SDD Workbench: ${request.sshAlias} >>>`
  const endMarker = `# <<< SDD Workbench: ${request.sshAlias} <<<`
  const blockPattern = new RegExp(
    `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}\\n?`,
    'm',
  )

  if (blockPattern.test(normalizedContent)) {
    return normalizedContent.replace(blockPattern, block)
  }

  const trimmed = normalizedContent.replace(/\s+$/, '')
  return `${trimmed}\n\n${block}`
}

function ensureIncludeLine(content: string): { content: string; inserted: boolean } {
  const includePattern = new RegExp(
    `^\\s*Include\\s+(~\\/\\.ssh\\/${escapeRegExp(MANAGED_SSH_CONFIG_FILE_NAME)}|${escapeRegExp(
      MANAGED_SSH_INCLUDE_LINE.replace(/^Include\s+/, ''),
    )})\\s*$`,
    'm',
  )

  if (includePattern.test(content)) {
    return {
      content,
      inserted: false,
    }
  }

  // Insert at the top so it is parsed in global scope, before any Host block.
  const trimmed = content.replace(/^\s+/, '')
  return {
    content: trimmed.length > 0 ? `${MANAGED_SSH_INCLUDE_LINE}\n\n${trimmed}` : `${MANAGED_SSH_INCLUDE_LINE}\n`,
    inserted: true,
  }
}

async function readUtf8IfExists(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return ''
    }
    throw error
  }
}

export async function syncVsCodeSshConfig(
  request: WorkspaceSyncVsCodeSshConfigRequest,
  dependencies: SyncVsCodeSshConfigDependencies = {},
): Promise<WorkspaceSyncVsCodeSshConfigResult> {
  const sshAlias = request.sshAlias.trim()
  const host = request.host.trim()

  if (!sshAlias) {
    return {
      ok: false,
      error: 'sshAlias is required to sync VSCode SSH config.',
    }
  }
  if (/\s/.test(sshAlias)) {
    return {
      ok: false,
      error: 'sshAlias must not contain whitespace.',
    }
  }
  if (!host) {
    return {
      ok: false,
      error: 'host is required to sync VSCode SSH config.',
    }
  }
  if (
    typeof request.port === 'number' &&
    (!Number.isInteger(request.port) || request.port < 1 || request.port > 65535)
  ) {
    return {
      ok: false,
      error: 'port must be an integer between 1 and 65535.',
    }
  }

  try {
    const homeDirectory = dependencies.homeDirectory ?? os.homedir()
    const sshDirectoryPath = path.join(homeDirectory, SSH_DIRECTORY_NAME)
    const configPath = path.join(sshDirectoryPath, SSH_CONFIG_FILE_NAME)
    const managedConfigPath = path.join(
      sshDirectoryPath,
      MANAGED_SSH_CONFIG_FILE_NAME,
    )

    await mkdir(sshDirectoryPath, { recursive: true, mode: 0o700 })

    const currentConfig = await readUtf8IfExists(configPath)
    const nextConfig = ensureIncludeLine(currentConfig)
    if (nextConfig.inserted || nextConfig.content !== currentConfig) {
      await writeFile(configPath, nextConfig.content, { encoding: 'utf8', mode: 0o600 })
    }

    const currentManagedConfig = await readUtf8IfExists(managedConfigPath)
    const nextManagedConfig = upsertManagedHostBlock(currentManagedConfig, {
      ...request,
      sshAlias,
      host,
    })
    if (nextManagedConfig !== currentManagedConfig) {
      await writeFile(managedConfigPath, nextManagedConfig, {
        encoding: 'utf8',
        mode: 0o600,
      })
    }

    return {
      ok: true,
      configPath,
      managedConfigPath,
      includeInserted: nextConfig.inserted,
      entryUpdated: true,
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to sync VSCode SSH config.',
    }
  }
}
