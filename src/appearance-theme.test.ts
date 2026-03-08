import { describe, expect, it } from 'vitest'
import {
  APPEARANCE_THEME_STORAGE_KEY,
  DEFAULT_APPEARANCE_THEME,
  loadAppearanceTheme,
  parseAppearanceTheme,
  saveAppearanceTheme,
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

  it('saves the selected appearance theme', () => {
    const storage = createMemoryStorage()

    saveAppearanceTheme('light', storage)

    expect(storage.getItem(APPEARANCE_THEME_STORAGE_KEY)).toBe('light')

    saveAppearanceTheme('dark-gray', storage)

    expect(storage.getItem(APPEARANCE_THEME_STORAGE_KEY)).toBe('dark-gray')
  })
})
