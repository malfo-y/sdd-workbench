import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type WindowBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type PersistedWindowState = WindowBounds & {
  isMaximized: boolean
}

type PersistedWindowStateFile = {
  schemaVersion: number
  windowState: PersistedWindowState
}

type WindowStateValidationOptions = {
  minWidth: number
  minHeight: number
}

type WindowStateFileIo = {
  mkdirSync?: typeof mkdirSync
  readFileSync?: typeof readFileSync
  writeFileSync?: typeof writeFileSync
}

type WindowStateCarrier = {
  isMaximized(): boolean
  getBounds(): WindowBounds
  getNormalBounds(): WindowBounds
}

const WINDOW_STATE_SCHEMA_VERSION = 1
const WINDOW_STATE_FILE_NAME = 'window-state.json'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeWindowBounds(
  candidate: unknown,
  options: WindowStateValidationOptions,
): WindowBounds | null {
  if (!candidate || typeof candidate !== 'object') {
    return null
  }

  const maybeBounds = candidate as Partial<WindowBounds>
  if (
    !isFiniteNumber(maybeBounds.width) ||
    !isFiniteNumber(maybeBounds.height) ||
    maybeBounds.width < options.minWidth ||
    maybeBounds.height < options.minHeight
  ) {
    return null
  }

  if (!isFiniteNumber(maybeBounds.x) || !isFiniteNumber(maybeBounds.y)) {
    return null
  }

  return {
    x: Math.trunc(maybeBounds.x),
    y: Math.trunc(maybeBounds.y),
    width: Math.trunc(maybeBounds.width),
    height: Math.trunc(maybeBounds.height),
  }
}

export function parsePersistedWindowState(
  raw: string,
  options: WindowStateValidationOptions,
): PersistedWindowState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedWindowStateFile>
    if (parsed?.schemaVersion !== WINDOW_STATE_SCHEMA_VERSION) {
      return null
    }

    const normalizedBounds = normalizeWindowBounds(parsed.windowState, options)
    if (!normalizedBounds) {
      return null
    }

    return {
      ...normalizedBounds,
      isMaximized: parsed.windowState?.isMaximized === true,
    }
  } catch {
    return null
  }
}

export function loadWindowState(
  userDataPath: string,
  options: WindowStateValidationOptions & WindowStateFileIo,
): PersistedWindowState | null {
  try {
    const read = options.readFileSync ?? readFileSync
    const raw = read(path.join(userDataPath, WINDOW_STATE_FILE_NAME), 'utf8')
    return parsePersistedWindowState(raw, options)
  } catch {
    return null
  }
}

export function saveWindowState(
  userDataPath: string,
  windowState: PersistedWindowState,
  options: WindowStateFileIo = {},
) {
  const mkdir = options.mkdirSync ?? mkdirSync
  const write = options.writeFileSync ?? writeFileSync
  mkdir(userDataPath, { recursive: true })
  write(
    path.join(userDataPath, WINDOW_STATE_FILE_NAME),
    `${JSON.stringify(
      {
        schemaVersion: WINDOW_STATE_SCHEMA_VERSION,
        windowState,
      } satisfies PersistedWindowStateFile,
      null,
      2,
    )}\n`,
    'utf8',
  )
}

export function captureWindowState(
  window: WindowStateCarrier,
): PersistedWindowState {
  const isMaximized = window.isMaximized()
  const bounds = window.getNormalBounds()
  return {
    x: Math.trunc(bounds.x),
    y: Math.trunc(bounds.y),
    width: Math.trunc(bounds.width),
    height: Math.trunc(bounds.height),
    isMaximized,
  }
}

export function buildBrowserWindowStateOptions(
  windowState: PersistedWindowState | null | undefined,
) {
  if (!windowState) {
    return {}
  }

  return {
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
  }
}
