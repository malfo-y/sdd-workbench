import { execFileSync } from 'node:child_process'
import path from 'node:path'

const NETWORK_FS_TYPES = new Set([
  'sshfs',
  'fuse.sshfs',
  'nfs',
  'nfs4',
  'smbfs',
  'cifs',
  'afpfs',
  'webdavfs',
  'macfuse',
  'osxfuse',
  'fuse',
  'fusefs',
])
const MOUNT_COMMAND_TIMEOUT_MS = 3000

type MountDescriptor = {
  device: string
  mountPoint: string
  fsType: string
}

type DetectRemoteMountPointOptions = {
  mountOutput?: string
  platform?: NodeJS.Platform
}

function decodeEscapedMountValue(value: string) {
  return value
    .replace(/\\040/g, ' ')
    .replace(/\\011/g, '\t')
    .replace(/\\012/g, '\n')
    .replace(/\\134/g, '\\')
}

function parseMountLine(line: string): MountDescriptor | null {
  const trimmedLine = line.trim()
  if (!trimmedLine) {
    return null
  }

  // Linux format: "device on /mount/point type fstype (options)"
  const linuxMatch = trimmedLine.match(/^(.+?) on (.+?) type (\S+) \((.*)\)$/)
  if (linuxMatch) {
    return {
      device: decodeEscapedMountValue(linuxMatch[1]),
      mountPoint: decodeEscapedMountValue(linuxMatch[2]),
      fsType: linuxMatch[3].trim().toLowerCase(),
    }
  }

  // macOS format: "device on /mount/point (fstype, options)"
  const macOsMatch = trimmedLine.match(/^(.+?) on (.+?) \(([^,)]+)(?:,.*)?\)$/)
  if (macOsMatch) {
    return {
      device: decodeEscapedMountValue(macOsMatch[1]),
      mountPoint: decodeEscapedMountValue(macOsMatch[2]),
      fsType: macOsMatch[3].trim().toLowerCase(),
    }
  }

  return null
}

function isRootPathOnMountPoint(resolvedRootPath: string, mountPoint: string): boolean {
  const normalizedMountPoint = path.resolve(mountPoint)
  if (resolvedRootPath === normalizedMountPoint) {
    return true
  }

  if (normalizedMountPoint === path.sep) {
    return true
  }

  return resolvedRootPath.startsWith(`${normalizedMountPoint}${path.sep}`)
}

function isRemoteMount(device: string, fsType: string): boolean {
  return (
    NETWORK_FS_TYPES.has(fsType) ||
    fsType.startsWith('fuse.') ||
    device.includes('@') ||
    device.includes('://')
  )
}

export function detectRemoteMountPoint(
  rootPath: string,
  options?: DetectRemoteMountPointOptions,
): boolean {
  const platform = options?.platform ?? process.platform
  if (platform !== 'darwin' && platform !== 'linux') {
    return false
  }

  try {
    const mountOutput =
      options?.mountOutput ??
      execFileSync('mount', {
        encoding: 'utf8',
        timeout: MOUNT_COMMAND_TIMEOUT_MS,
      })
    const resolvedRootPath = path.resolve(rootPath)
    let bestMatchingMountPointLength = -1
    let bestIsRemoteMount = false

    for (const line of mountOutput.split('\n')) {
      const parsedMountLine = parseMountLine(line)
      if (!parsedMountLine) {
        continue
      }

      const mountPoint = path.resolve(parsedMountLine.mountPoint)
      if (!isRootPathOnMountPoint(resolvedRootPath, mountPoint)) {
        continue
      }

      if (mountPoint.length <= bestMatchingMountPointLength) {
        continue
      }

      bestMatchingMountPointLength = mountPoint.length
      bestIsRemoteMount = isRemoteMount(parsedMountLine.device, parsedMountLine.fsType)
    }

    return bestIsRemoteMount
  } catch {
    return false
  }
}
