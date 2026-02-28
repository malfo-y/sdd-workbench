import { describe, expect, it } from 'vitest'
import { detectRemoteMountPoint } from './remote-mount-detection'

describe('remote-mount-detection', () => {
  it('detects macOS sshfs mounts', () => {
    const mountOutput = [
      '/dev/disk3s1s1 on / (apfs, local, read-only, journaled)',
      'tester@remote-host:/workspace on /Volumes/remote-workspace (osxfuse, nodev, nosuid, synchronous)',
    ].join('\n')

    expect(
      detectRemoteMountPoint('/Volumes/remote-workspace/project-a', {
        mountOutput,
        platform: 'darwin',
      }),
    ).toBe(true)
  })

  it('detects linux sshfs mounts', () => {
    const mountOutput = [
      '/dev/sda1 on / type ext4 (rw,relatime)',
      'tester@remote-host:/workspace on /mnt/remote-workspace type fuse.sshfs (rw,nosuid,nodev,relatime,user_id=1000,group_id=1000)',
    ].join('\n')

    expect(
      detectRemoteMountPoint('/mnt/remote-workspace/project-a', {
        mountOutput,
        platform: 'linux',
      }),
    ).toBe(true)
  })

  it('detects linux nfs mounts by fs type', () => {
    const mountOutput = [
      '/dev/sda1 on / type ext4 (rw,relatime)',
      'server:/exports/repo on /mnt/nfs-repo type nfs4 (rw,relatime,vers=4.2)',
    ].join('\n')

    expect(
      detectRemoteMountPoint('/mnt/nfs-repo/src', {
        mountOutput,
        platform: 'linux',
      }),
    ).toBe(true)
  })

  it('decodes escaped mount point paths', () => {
    const mountOutput = [
      '/dev/sda1 on / type ext4 (rw,relatime)',
      'tester@remote-host:/workspace on /mnt/my\\040remote type fuse.sshfs (rw,relatime)',
    ].join('\n')

    expect(
      detectRemoteMountPoint('/mnt/my remote/project-a', {
        mountOutput,
        platform: 'linux',
      }),
    ).toBe(true)
  })

  it('returns false for local mounts', () => {
    const mountOutput = [
      '/dev/sda1 on / type ext4 (rw,relatime)',
      '/dev/sda2 on /home type ext4 (rw,relatime)',
    ].join('\n')

    expect(
      detectRemoteMountPoint('/home/tester/project-a', {
        mountOutput,
        platform: 'linux',
      }),
    ).toBe(false)
  })

  it('prefers the most specific mount point', () => {
    const mountOutput = [
      'server:/exports on /mnt type nfs4 (rw,relatime,vers=4.2)',
      '/dev/sda2 on /mnt/remote-workspace type ext4 (rw,relatime)',
    ].join('\n')

    expect(
      detectRemoteMountPoint('/mnt/remote-workspace/project-a', {
        mountOutput,
        platform: 'linux',
      }),
    ).toBe(false)
  })
})
