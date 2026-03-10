import os from 'node:os'
import path from 'node:path'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { syncVsCodeSshConfig } from './vscode-ssh-config'

const tempHomes: string[] = []

async function createTempHome(): Promise<string> {
  const homePath = await mkdtemp(path.join(os.tmpdir(), 'sdd-ssh-config-'))
  tempHomes.push(homePath)
  return homePath
}

afterEach(async () => {
  await Promise.all(
    tempHomes.splice(0, tempHomes.length).map((homePath) =>
      rm(homePath, { recursive: true, force: true }),
    ),
  )
})

describe('electron/vscode-ssh-config', () => {
  it('creates a managed SSH include and host entry for VSCode', async () => {
    const homePath = await createTempHome()

    const result = await syncVsCodeSshConfig(
      {
        sshAlias: 'summer-test',
        host: 'gpu.example.com',
        user: 'bc-user',
        port: 2222,
        identityFile: '~/.ssh/id_rsa',
      },
      { homeDirectory: homePath },
    )

    expect(result).toEqual({
      ok: true,
      configPath: path.join(homePath, '.ssh', 'config'),
      managedConfigPath: path.join(homePath, '.ssh', 'sdd-workbench.config'),
      includeInserted: true,
      entryUpdated: true,
    })

    const sshConfig = await readFile(path.join(homePath, '.ssh', 'config'), 'utf8')
    const managedConfig = await readFile(
      path.join(homePath, '.ssh', 'sdd-workbench.config'),
      'utf8',
    )

    expect(sshConfig).toContain('Include ~/.ssh/sdd-workbench.config')
    expect(managedConfig).toContain('Host summer-test')
    expect(managedConfig).toContain('  HostName gpu.example.com')
    expect(managedConfig).toContain('  User bc-user')
    expect(managedConfig).toContain('  Port 2222')
    expect(managedConfig).toContain('  IdentityFile ~/.ssh/id_rsa')
    expect(managedConfig).toContain('  IdentitiesOnly yes')
  })

  it('updates an existing managed alias block without duplicating the include', async () => {
    const homePath = await createTempHome()
    const sshDirectoryPath = path.join(homePath, '.ssh')
    await mkdir(sshDirectoryPath, { recursive: true })
    await writeFile(
      path.join(sshDirectoryPath, 'config'),
      [
        'Host existing-manual',
        '  HostName existing.example.com',
        'Include ~/.ssh/sdd-workbench.config',
        '',
      ].join('\n'),
      'utf8',
    )
    await writeFile(
      path.join(sshDirectoryPath, 'sdd-workbench.config'),
      [
        '# Managed by SDD Workbench for VSCode Remote-SSH.',
        '',
        '# >>> SDD Workbench: summer-test >>>',
        'Host summer-test',
        '  HostName old.example.com',
        '  User old-user',
        '# <<< SDD Workbench: summer-test <<<',
        '',
        '# >>> SDD Workbench: another-host >>>',
        'Host another-host',
        '  HostName keep.example.com',
        '# <<< SDD Workbench: another-host <<<',
        '',
      ].join('\n'),
      'utf8',
    )

    const result = await syncVsCodeSshConfig(
      {
        sshAlias: 'summer-test',
        host: 'new.example.com',
        user: 'bc-user',
      },
      { homeDirectory: homePath },
    )

    expect(result).toMatchObject({
      ok: true,
      includeInserted: false,
      entryUpdated: true,
    })

    const sshConfig = await readFile(path.join(sshDirectoryPath, 'config'), 'utf8')
    const managedConfig = await readFile(
      path.join(sshDirectoryPath, 'sdd-workbench.config'),
      'utf8',
    )

    expect(sshConfig.match(/Include ~\/\.ssh\/sdd-workbench\.config/g)).toHaveLength(1)
    expect(managedConfig).toContain('  HostName new.example.com')
    expect(managedConfig).toContain('  User bc-user')
    expect(managedConfig).not.toContain('old.example.com')
    expect(managedConfig).toContain('Host another-host')
    expect(managedConfig).toContain('keep.example.com')
  })

  it('returns a validation error when sshAlias is missing', async () => {
    const homePath = await createTempHome()

    await expect(
      syncVsCodeSshConfig(
        {
          sshAlias: '',
          host: 'gpu.example.com',
        },
        { homeDirectory: homePath },
      ),
    ).resolves.toEqual({
      ok: false,
      error: 'sshAlias is required to sync VSCode SSH config.',
    })
  })
})
