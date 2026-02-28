import type { RemoteConnectionProfile } from './types'

export const REMOTE_AGENT_CONNECT_TIMEOUT_MS = 'REMOTE_AGENT_CONNECT_TIMEOUT_MS'
export const REMOTE_AGENT_REQUEST_TIMEOUT_MS = 'REMOTE_AGENT_REQUEST_TIMEOUT_MS'
export const REMOTE_AGENT_RECONNECT_ATTEMPTS =
  'REMOTE_AGENT_RECONNECT_ATTEMPTS'

export const REMOTE_AGENT_CONNECT_TIMEOUT_DEFAULT_MS = 10_000
export const REMOTE_AGENT_REQUEST_TIMEOUT_DEFAULT_MS = 15_000
export const REMOTE_AGENT_RECONNECT_ATTEMPTS_DEFAULT = 3

export const REMOTE_AGENT_CONNECT_TIMEOUT_MIN_MS = 1_000
export const REMOTE_AGENT_CONNECT_TIMEOUT_MAX_MS = 60_000
export const REMOTE_AGENT_REQUEST_TIMEOUT_MIN_MS = 1_000
export const REMOTE_AGENT_REQUEST_TIMEOUT_MAX_MS = 120_000
export const REMOTE_AGENT_RECONNECT_ATTEMPTS_MIN = 0
export const REMOTE_AGENT_RECONNECT_ATTEMPTS_MAX = 5

type EnvSource = Record<string, string | undefined>

export type RemoteReliabilityPolicy = {
  connectTimeoutMs: number
  requestTimeoutMs: number
  reconnectAttempts: number
}

export function loadRemoteReliabilityPolicy(
  env: EnvSource = process.env,
): RemoteReliabilityPolicy {
  return {
    connectTimeoutMs: normalizeIntegerEnvValue(
      env[REMOTE_AGENT_CONNECT_TIMEOUT_MS],
      REMOTE_AGENT_CONNECT_TIMEOUT_DEFAULT_MS,
      REMOTE_AGENT_CONNECT_TIMEOUT_MIN_MS,
      REMOTE_AGENT_CONNECT_TIMEOUT_MAX_MS,
    ),
    requestTimeoutMs: normalizeIntegerEnvValue(
      env[REMOTE_AGENT_REQUEST_TIMEOUT_MS],
      REMOTE_AGENT_REQUEST_TIMEOUT_DEFAULT_MS,
      REMOTE_AGENT_REQUEST_TIMEOUT_MIN_MS,
      REMOTE_AGENT_REQUEST_TIMEOUT_MAX_MS,
    ),
    reconnectAttempts: normalizeIntegerEnvValue(
      env[REMOTE_AGENT_RECONNECT_ATTEMPTS],
      REMOTE_AGENT_RECONNECT_ATTEMPTS_DEFAULT,
      REMOTE_AGENT_RECONNECT_ATTEMPTS_MIN,
      REMOTE_AGENT_RECONNECT_ATTEMPTS_MAX,
    ),
  }
}

export function applyRemoteReliabilityPolicyToProfile(
  profile: RemoteConnectionProfile,
  policy: RemoteReliabilityPolicy,
): RemoteConnectionProfile {
  return {
    ...profile,
    connectTimeoutMs: profile.connectTimeoutMs ?? policy.connectTimeoutMs,
    requestTimeoutMs: profile.requestTimeoutMs ?? policy.requestTimeoutMs,
  }
}

function normalizeIntegerEnvValue(
  rawValue: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (rawValue === undefined) {
    return defaultValue
  }

  const normalized = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(normalized)) {
    return defaultValue
  }

  if (normalized < min) {
    return min
  }
  if (normalized > max) {
    return max
  }
  return normalized
}
