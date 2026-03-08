export const APPEARANCE_THEME_STORAGE_KEY = 'sdd-workbench.appearance-theme.v1'

export const DEFAULT_APPEARANCE_THEME = 'dark-gray'

export type AppearanceTheme = 'dark-gray' | 'light'

export const APPEARANCE_THEME_OPTIONS = [
  {
    value: 'dark-gray',
    label: 'Dark Gray',
  },
  {
    value: 'light',
    label: 'Light',
  },
] as const satisfies ReadonlyArray<{
  value: AppearanceTheme
  label: string
}>

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
type RootElementLike = Pick<HTMLElement, 'setAttribute'>
type AppearanceThemeBridgeLike = {
  notifyAppearanceThemeChanged?: (theme: AppearanceTheme) => void
  onAppearanceThemeMenuRequest?: (
    listener: (theme: AppearanceTheme) => void,
  ) => (() => void) | void
}

export function parseAppearanceTheme(value: string | null | undefined): AppearanceTheme | null {
  if (value === 'dark-gray' || value === 'light') {
    return value
  }
  return null
}

export function getAppearanceThemeLabel(theme: AppearanceTheme): string {
  return (
    APPEARANCE_THEME_OPTIONS.find((option) => option.value === theme)?.label ??
    'Dark Gray'
  )
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getDefaultRootElement(): RootElementLike | null {
  if (typeof document === 'undefined') {
    return null
  }
  return document.documentElement
}

function getDefaultAppearanceThemeBridge(): AppearanceThemeBridgeLike | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.workspace ?? null
}

export function loadAppearanceTheme(storage: StorageLike | null = getDefaultStorage()): AppearanceTheme {
  try {
    const storedValue = storage?.getItem(APPEARANCE_THEME_STORAGE_KEY) ?? null
    return parseAppearanceTheme(storedValue) ?? DEFAULT_APPEARANCE_THEME
  } catch {
    return DEFAULT_APPEARANCE_THEME
  }
}

export function saveAppearanceTheme(
  theme: AppearanceTheme,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  try {
    storage?.setItem(APPEARANCE_THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore storage failures and keep the in-memory theme selection active.
  }
}

export function applyAppearanceThemeToRoot(
  theme: AppearanceTheme,
  root: RootElementLike | null = getDefaultRootElement(),
): void {
  root?.setAttribute('data-theme', theme)
}

export function restoreAppearanceThemeOnRoot(
  storage: StorageLike | null = getDefaultStorage(),
  root: RootElementLike | null = getDefaultRootElement(),
): AppearanceTheme {
  const theme = loadAppearanceTheme(storage)
  applyAppearanceThemeToRoot(theme, root)
  return theme
}

export function notifyAppearanceThemeChanged(
  theme: AppearanceTheme,
  bridge: AppearanceThemeBridgeLike | null = getDefaultAppearanceThemeBridge(),
): void {
  try {
    bridge?.notifyAppearanceThemeChanged?.(theme)
  } catch {
    // Ignore bridge failures; theme state remains authoritative in the renderer.
  }
}

export function subscribeToAppearanceThemeMenuRequests(
  listener: (theme: AppearanceTheme) => void,
  bridge: AppearanceThemeBridgeLike | null = getDefaultAppearanceThemeBridge(),
): () => void {
  try {
    const unsubscribe = bridge?.onAppearanceThemeMenuRequest?.(listener)
    return typeof unsubscribe === 'function' ? unsubscribe : () => {}
  } catch {
    return () => {}
  }
}
