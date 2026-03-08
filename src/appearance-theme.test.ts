import { describe, expect, it, vi } from 'vitest'
import {
  APPEARANCE_THEME_STORAGE_KEY,
  DEFAULT_APPEARANCE_THEME,
  applyAppearanceThemeToRoot,
  loadAppearanceTheme,
  notifyAppearanceThemeChanged,
  parseAppearanceTheme,
  restoreAppearanceThemeOnRoot,
  saveAppearanceTheme,
  subscribeToAppearanceThemeMenuRequests,
} from './appearance-theme'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key) ?? null : null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, String(value))
    },
  }
}

function createThrowingStorage(overrides?: {
  getItem?: (key: string) => string | null
  setItem?: (key: string, value: string) => void
}): Storage {
  return {
    get length() {
      return 0
    },
    clear() {},
    getItem(key: string) {
      if (overrides?.getItem) {
        return overrides.getItem(key)
      }
      throw new Error('getItem failed')
    },
    key() {
      return null
    },
    removeItem() {},
    setItem(key: string, value: string) {
      if (overrides?.setItem) {
        overrides.setItem(key, value)
        return
      }
      throw new Error('setItem failed')
    },
  }
}

describe('appearance-theme', () => {
  it('parses only supported appearance themes', () => {
    expect(parseAppearanceTheme('dark-gray')).toBe('dark-gray')
    expect(parseAppearanceTheme('light')).toBe('light')
    expect(parseAppearanceTheme('dark')).toBeNull()
    expect(parseAppearanceTheme('')).toBeNull()
    expect(parseAppearanceTheme(null)).toBeNull()
  })

  it('loads the stored appearance theme and falls back to dark-gray', () => {
    const storage = createMemoryStorage()
    expect(loadAppearanceTheme(storage)).toBe(DEFAULT_APPEARANCE_THEME)

    storage.setItem(APPEARANCE_THEME_STORAGE_KEY, 'light')
    expect(loadAppearanceTheme(storage)).toBe('light')

    storage.setItem(APPEARANCE_THEME_STORAGE_KEY, 'invalid-theme')
    expect(loadAppearanceTheme(storage)).toBe(DEFAULT_APPEARANCE_THEME)
  })

  it('falls back to the default theme when storage is unavailable', () => {
    expect(loadAppearanceTheme(null)).toBe(DEFAULT_APPEARANCE_THEME)
  })

  it('falls back to the default theme when storage access throws', () => {
    const storage = createThrowingStorage()
    expect(loadAppearanceTheme(storage)).toBe(DEFAULT_APPEARANCE_THEME)
  })

  it('saves the selected appearance theme', () => {
    const storage = createMemoryStorage()

    saveAppearanceTheme('light', storage)

    expect(storage.getItem(APPEARANCE_THEME_STORAGE_KEY)).toBe('light')

    saveAppearanceTheme('dark-gray', storage)

    expect(storage.getItem(APPEARANCE_THEME_STORAGE_KEY)).toBe('dark-gray')
  })

  it('ignores storage write failures when saving the theme', () => {
    const storage = createThrowingStorage()
    expect(() => saveAppearanceTheme('light', storage)).not.toThrow()
  })

  it('applies the stored theme to the root element for pre-paint bootstrap', () => {
    const storage = createMemoryStorage()
    const root = document.createElement('html')

    storage.setItem(APPEARANCE_THEME_STORAGE_KEY, 'light')

    const restoredTheme = restoreAppearanceThemeOnRoot(storage, root)

    expect(restoredTheme).toBe('light')
    expect(root.getAttribute('data-theme')).toBe('light')
  })

  it('applies the selected theme to the provided root element', () => {
    const root = document.createElement('html')

    applyAppearanceThemeToRoot('dark-gray', root)

    expect(root.getAttribute('data-theme')).toBe('dark-gray')
  })

  it('notifies the host bridge when the appearance theme changes', () => {
    const notify = vi.fn()

    notifyAppearanceThemeChanged('light', {
      notifyAppearanceThemeChanged: notify,
    })

    expect(notify).toHaveBeenCalledWith('light')
  })

  it('ignores appearance theme bridge failures', () => {
    expect(() =>
      notifyAppearanceThemeChanged('dark-gray', {
        notifyAppearanceThemeChanged() {
          throw new Error('bridge unavailable')
        },
      }),
    ).not.toThrow()
  })

  it('subscribes to native menu theme requests through the host bridge', () => {
    const listener = vi.fn()
    const unsubscribe = vi.fn()
    const onAppearanceThemeMenuRequest = vi.fn(() => unsubscribe)

    const returnedUnsubscribe = subscribeToAppearanceThemeMenuRequests(listener, {
      onAppearanceThemeMenuRequest,
    })

    expect(onAppearanceThemeMenuRequest).toHaveBeenCalledWith(listener)
    returnedUnsubscribe()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
