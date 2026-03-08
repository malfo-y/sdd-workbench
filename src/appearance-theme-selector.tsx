import type { ChangeEvent } from 'react'
import {
  parseAppearanceTheme,
  type AppearanceTheme,
} from './appearance-theme'

type AppearanceThemeSelectorProps = {
  value: AppearanceTheme
  onChange: (theme: AppearanceTheme) => void
  disabled?: boolean
}

export function AppearanceThemeSelector({
  value,
  onChange,
  disabled = false,
}: AppearanceThemeSelectorProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextTheme = parseAppearanceTheme(event.target.value)
    if (!nextTheme) {
      return
    }
    onChange(nextTheme)
  }

  return (
    <select
      aria-label="Theme"
      className="workspace-switcher-select"
      data-testid="appearance-theme-select"
      disabled={disabled}
      onChange={handleChange}
      value={value}
    >
      <option value="dark-gray">Dark Gray</option>
      <option value="light">Light</option>
    </select>
  )
}
