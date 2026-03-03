import { describe, expect, it } from 'vitest'
import {
  abbreviateWorkspacePath,
  formatRemoteWorkspaceSummaryPath,
  formatRemoteWorkspaceTooltip,
  formatWorkspaceSummaryPath,
} from './path-format'

describe('path-format', () => {
  it('abbreviates macOS home paths to tilde', () => {
    expect(abbreviateWorkspacePath('/Users/tester/projects/sdd-workbench')).toBe(
      '~/projects/sdd-workbench',
    )
  })

  it('abbreviates Windows home paths to tilde', () => {
    expect(abbreviateWorkspacePath('C:\\Users\\tester\\projects\\sdd-workbench')).toBe(
      '~\\projects\\sdd-workbench',
    )
  })

  it('keeps short summary paths unchanged', () => {
    expect(
      formatWorkspaceSummaryPath('/Users/tester/projects/sdd-workbench'),
    ).toBe('~/projects/sdd-workbench')
  })

  it('collapses long home paths in the middle while keeping leaf directory', () => {
    expect(
      formatWorkspaceSummaryPath('/Users/tester/github/experiments/vision/ImageCaptioning'),
    ).toBe('~/github/.../ImageCaptioning')
  })

  it('collapses long absolute paths in the middle while keeping leaf directory', () => {
    expect(
      formatWorkspaceSummaryPath('/opt/company/platform/apps/ImageCaptioning'),
    ).toBe('/opt/.../ImageCaptioning')
  })

  it('preserves Windows separators when collapsing long summary paths', () => {
    expect(
      formatWorkspaceSummaryPath('C:\\Users\\tester\\projects\\vision\\ImageCaptioning'),
    ).toBe('~\\projects\\...\\ImageCaptioning')
  })

  it('keeps the leaf directory visible for long single-segment home paths', () => {
    expect(
      formatWorkspaceSummaryPath('/Users/tester/ImageCaptioningProjectWithLongName'),
    ).toBe('~/.../ImageCaptioningProjectWithLongName')
  })

  it('builds remote summary path from remote root instead of workspace id', () => {
    expect(
      formatRemoteWorkspaceSummaryPath(
        '/data/karlo-research_715/workspace/kollage/profile/ImageCaptioning',
      ),
    ).toBe('remote:/data/.../ImageCaptioning')
  })

  it('builds remote tooltip from host and remote root', () => {
    expect(
      formatRemoteWorkspaceTooltip(
        'instance-private.cloud.kakaobrain.com',
        '/data/research/project-a',
        'tester',
      ),
    ).toBe('tester@instance-private.cloud.kakaobrain.com:/data/research/project-a')
  })
})
