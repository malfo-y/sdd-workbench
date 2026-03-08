export const APPEARANCE_THEME_STORAGE_KEY = 'sdd-workbench.appearance-theme.v1'

export const DEFAULT_APPEARANCE_THEME = 'dark-gray'

export type AppearanceTheme = 'dark-gray' | 'light'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function parseAppearanceTheme(value: string | null | undefined): AppearanceTheme | null {
  if (value === 'dark-gray' || value === 'light') {
    return value
  }
  return null
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  return window.localStorage
}

export function loadAppearanceTheme(storage: StorageLike | null = getDefaultStorage()): AppearanceTheme {
  const storedValue = storage?.getItem(APPEARANCE_THEME_STORAGE_KEY) ?? null
  return parseAppearanceTheme(storedValue) ?? DEFAULT_APPEARANCE_THEME
}

export function saveAppearanceTheme(
  theme: AppearanceTheme,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  storage?.setItem(APPEARANCE_THEME_STORAGE_KEY, theme)
}
