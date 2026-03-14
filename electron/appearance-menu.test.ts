import type { MenuItemConstructorOptions } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import {
  APPEARANCE_THEME_MENU_REQUEST_CHANNEL,
  buildApplicationMenuTemplate,
  sendAppearanceThemeMenuRequest,
} from './appearance-menu'

function getViewMenuTemplateEntry(
  template: ReturnType<typeof buildApplicationMenuTemplate>,
) {
  const viewMenu = template.find((item) => item.label === 'View')
  expect(viewMenu).toBeDefined()
  expect(Array.isArray(viewMenu?.submenu)).toBe(true)
  return viewMenu!
}

function getThemeMenuEntries(
  template: ReturnType<typeof buildApplicationMenuTemplate>,
) {
  const viewMenu = getViewMenuTemplateEntry(template)
  const viewEntries = viewMenu.submenu as MenuItemConstructorOptions[]
  const themeMenu = viewEntries.find(
    (item: MenuItemConstructorOptions) => item.label === 'Theme',
  )
  expect(themeMenu).toBeDefined()
  expect(Array.isArray(themeMenu?.submenu)).toBe(true)
  return themeMenu!.submenu as MenuItemConstructorOptions[]
}

describe('appearance-menu', () => {
  it('builds a role-preserving menu template with a Theme submenu', () => {
    const template = buildApplicationMenuTemplate({
      currentTheme: 'light',
      onSelectTheme: vi.fn(),
      platform: 'linux',
    })

    expect(template.map((item) => item.role ?? item.label)).toEqual([
      'fileMenu',
      'editMenu',
      'View',
      'windowMenu',
      'help',
    ])

    const themeEntries = getThemeMenuEntries(template)

    expect(themeEntries).toHaveLength(3)
    expect(themeEntries?.[0]).toMatchObject({
      type: 'radio',
      label: 'Dark Gray',
      checked: false,
    })
    expect(themeEntries?.[1]).toMatchObject({
      type: 'radio',
      label: 'Light',
      checked: true,
    })
    expect(themeEntries?.[2]).toMatchObject({
      type: 'radio',
      label: 'System',
      checked: false,
    })
  })

  it('includes the standard macOS app menu when building for darwin', () => {
    const template = buildApplicationMenuTemplate({
      currentTheme: 'dark-gray',
      onSelectTheme: vi.fn(),
      platform: 'darwin',
    })

    expect(template[0]).toMatchObject({
      role: 'appMenu',
    })
  })

  it('invokes the supplied callback when a theme radio item is selected', () => {
    const onSelectTheme = vi.fn()
    const template = buildApplicationMenuTemplate({
      currentTheme: 'dark-gray',
      onSelectTheme,
      platform: 'linux',
    })
    const themeEntries = getThemeMenuEntries(template)
    const lightEntry = themeEntries.find(
      (item: MenuItemConstructorOptions) => item.label === 'Light',
    )

    expect(lightEntry).toBeDefined()
    lightEntry?.click?.({} as never, undefined, {} as never)

    expect(onSelectTheme).toHaveBeenCalledWith('light', null)
  })

  it('sends appearance theme menu requests to the target window webContents', () => {
    const send = vi.fn()

    sendAppearanceThemeMenuRequest(
      {
        webContents: {
          send,
        },
      } as never,
      'light',
    )

    expect(send).toHaveBeenCalledWith(APPEARANCE_THEME_MENU_REQUEST_CHANNEL, {
      theme: 'light',
    })
  })

  it('ignores missing target windows when dispatching a menu request', () => {
    expect(() => sendAppearanceThemeMenuRequest(null, 'dark-gray')).not.toThrow()
  })
})
