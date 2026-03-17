import { describe, expect, it } from 'vitest'
import {
  buildBrowserWindowStateOptions,
  captureWindowState,
  parsePersistedWindowState,
} from './window-state'

describe('electron/window-state', () => {
  it('parses persisted bounds and maximized state', () => {
    const parsed = parsePersistedWindowState(
      JSON.stringify({
        schemaVersion: 1,
        windowState: {
          x: 120,
          y: 80,
          width: 1600,
          height: 1000,
          isMaximized: true,
        },
      }),
      {
        minWidth: 1100,
        minHeight: 720,
      },
    )

    expect(parsed).toEqual({
      x: 120,
      y: 80,
      width: 1600,
      height: 1000,
      isMaximized: true,
    })
  })

  it('rejects persisted bounds smaller than minimum size', () => {
    expect(
      parsePersistedWindowState(
        JSON.stringify({
          schemaVersion: 1,
          windowState: {
            x: 0,
            y: 0,
            width: 800,
            height: 600,
            isMaximized: false,
          },
        }),
        {
          minWidth: 1100,
          minHeight: 720,
        },
      ),
    ).toBeNull()
  })

  it('captures normal bounds when window is maximized', () => {
    expect(
      captureWindowState({
        isMaximized: () => true,
        getBounds: () => ({
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
        }),
        getNormalBounds: () => ({
          x: 40,
          y: 30,
          width: 1440,
          height: 900,
        }),
      }),
    ).toEqual({
      x: 40,
      y: 30,
      width: 1440,
      height: 900,
      isMaximized: true,
    })
  })

  it('captures normal bounds even when the current window bounds differ', () => {
    expect(
      captureWindowState({
        isMaximized: () => false,
        getBounds: () => ({
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
        }),
        getNormalBounds: () => ({
          x: 120,
          y: 90,
          width: 1500,
          height: 940,
        }),
      }),
    ).toEqual({
      x: 120,
      y: 90,
      width: 1500,
      height: 940,
      isMaximized: false,
    })
  })

  it('builds BrowserWindow options from persisted state', () => {
    expect(
      buildBrowserWindowStateOptions({
        x: 20,
        y: 30,
        width: 1500,
        height: 920,
        isMaximized: false,
      }),
    ).toEqual({
      x: 20,
      y: 30,
      width: 1500,
      height: 920,
    })
  })
})
