import { describe, expect, it } from 'vitest'
import { clampModalDragDelta } from './modal-drag-position'

describe('clampModalDragDelta', () => {
  it('returns the requested delta when the modal stays within the viewport', () => {
    expect(
      clampModalDragDelta(
        {
          left: 200,
          top: 150,
          width: 400,
          height: 300,
        },
        { x: 40, y: 20 },
        { width: 1280, height: 900 },
      ),
    ).toEqual({ x: 40, y: 20 })
  })

  it('clamps the drag delta so the modal keeps a visible area onscreen', () => {
    expect(
      clampModalDragDelta(
        {
          left: 200,
          top: 150,
          width: 400,
          height: 300,
        },
        { x: 1000, y: 1000 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ x: 440, y: 290 })
  })

  it('clamps negative drag deltas near the viewport origin', () => {
    expect(
      clampModalDragDelta(
        {
          left: 80,
          top: 60,
          width: 400,
          height: 300,
        },
        { x: -600, y: -600 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ x: -320, y: -200 })
  })
})
