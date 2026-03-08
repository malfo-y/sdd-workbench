import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import {
  APPEARANCE_THEME_OPTIONS,
  DEFAULT_APPEARANCE_THEME,
  type AppearanceTheme,
  getAppearanceThemeLabel,
} from '../src/appearance-theme'

export const APPEARANCE_THEME_MENU_REQUEST_CHANNEL =
  'appearance-theme:menu-request'
export const APPEARANCE_THEME_CHANGED_CHANNEL = 'appearance-theme:changed'

type BuildApplicationMenuTemplateOptions = {
  currentTheme?: AppearanceTheme | null
  onSelectTheme: (
    theme: AppearanceTheme,
    browserWindow?: BrowserWindow | null,
  ) => void
  platform?: NodeJS.Platform
}

function buildThemeMenuItems(
  currentTheme: AppearanceTheme,
  onSelectTheme: (
    theme: AppearanceTheme,
    browserWindow?: BrowserWindow | null,
  ) => void,
): MenuItemConstructorOptions[] {
  return APPEARANCE_THEME_OPTIONS.map((option) => ({
    type: 'radio',
    label: getAppearanceThemeLabel(option.value),
    checked: option.value === currentTheme,
    click: (_menuItem, browserWindow) => {
      onSelectTheme(option.value, browserWindow ?? null)
    },
  }))
}

export function buildApplicationMenuTemplate({
  currentTheme,
  onSelectTheme,
  platform = process.platform,
}: BuildApplicationMenuTemplateOptions): MenuItemConstructorOptions[] {
  const resolvedTheme = currentTheme ?? DEFAULT_APPEARANCE_THEME
  const template: MenuItemConstructorOptions[] = []

  if (platform === 'darwin') {
    template.push({ role: 'appMenu' })
  }

  template.push(
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: buildThemeMenuItems(resolvedTheme, onSelectTheme),
        },
      ],
    },
    { role: 'windowMenu' },
    { role: 'help' },
  )

  return template
}

export function sendAppearanceThemeMenuRequest(
  targetWindow: Pick<BrowserWindow, 'webContents'> | null | undefined,
  theme: AppearanceTheme,
): void {
  targetWindow?.webContents.send(APPEARANCE_THEME_MENU_REQUEST_CHANNEL, {
    theme,
  })
}
