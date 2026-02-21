import { describe, expect, it } from 'vitest'
import {
  resolveSourceLine,
  resolveSourceLineFromSelection,
  resolveSourceLineFromTarget,
} from './source-line-resolver'

describe('source-line-resolver', () => {
  it('resolves source line from event target ancestors', () => {
    const block = document.createElement('p')
    block.setAttribute('data-source-line', '12')
    const inner = document.createElement('span')
    block.append(inner)

    expect(resolveSourceLineFromTarget(inner)).toBe(12)
  })

  it('normalizes numeric source-line values to positive integers', () => {
    const block = document.createElement('p')
    block.setAttribute('data-source-line', '4.8')
    const inner = document.createElement('span')
    block.append(inner)

    expect(resolveSourceLineFromTarget(inner)).toBe(4)

    block.setAttribute('data-source-line', '0')
    expect(resolveSourceLineFromTarget(inner)).toBeNull()
  })

  it('falls back to selection anchor/focus nodes', () => {
    const block = document.createElement('p')
    block.setAttribute('data-source-line', '7')
    const textNode = document.createTextNode('body')
    block.append(textNode)

    const selection = {
      anchorNode: textNode,
      focusNode: null,
    } as unknown as Selection

    expect(resolveSourceLineFromSelection(selection)).toBe(7)
  })

  it('prefers target resolution before selection fallback', () => {
    const targetBlock = document.createElement('p')
    targetBlock.setAttribute('data-source-line', '3')
    const targetNode = document.createElement('span')
    targetBlock.append(targetNode)

    const selectionBlock = document.createElement('p')
    selectionBlock.setAttribute('data-source-line', '11')
    const selectionTextNode = document.createTextNode('content')
    selectionBlock.append(selectionTextNode)

    const selection = {
      anchorNode: selectionTextNode,
      focusNode: selectionTextNode,
    } as unknown as Selection

    expect(
      resolveSourceLine({
        target: targetNode,
        selection,
      }),
    ).toBe(3)
  })

  it('returns null when source line cannot be resolved', () => {
    const selection = {
      anchorNode: document.createTextNode('plain'),
      focusNode: null,
    } as unknown as Selection

    expect(resolveSourceLineFromTarget(null)).toBeNull()
    expect(resolveSourceLineFromSelection(selection)).toBeNull()
    expect(
      resolveSourceLine({
        target: null,
        selection,
      }),
    ).toBeNull()
  })
})

