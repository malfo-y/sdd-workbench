import { describe, expect, it } from 'vitest'
import {
  resolveNearestSourceLineFromPoint,
  resolveSourceLine,
  resolveSourceLineRangeFromSelection,
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

  it('resolves normalized line range from selection anchor/focus nodes', () => {
    const startBlock = document.createElement('p')
    startBlock.setAttribute('data-source-line', '12')
    const startText = document.createTextNode('start')
    startBlock.append(startText)

    const endBlock = document.createElement('p')
    endBlock.setAttribute('data-source-line', '8')
    const endText = document.createTextNode('end')
    endBlock.append(endText)

    const selection = {
      anchorNode: startText,
      focusNode: endText,
    } as unknown as Selection

    expect(resolveSourceLineRangeFromSelection(selection)).toEqual({
      startLine: 8,
      endLine: 12,
    })
  })

  it('resolves source line from selection offset inside a multiline code block', () => {
    const pre = document.createElement('pre')
    pre.setAttribute('data-source-line', '3')
    const code = document.createElement('code')
    const textNode = document.createTextNode('alpha\nbeta\ngamma')
    code.append(textNode)
    pre.append(code)

    const selection = {
      anchorNode: textNode,
      anchorOffset: 8,
      focusNode: textNode,
      focusOffset: 10,
    } as unknown as Selection

    expect(resolveSourceLineFromSelection(selection)).toBe(4)
  })

  it('resolves line range from selection offsets inside a multiline code block', () => {
    const pre = document.createElement('pre')
    pre.setAttribute('data-source-line', '20')
    const code = document.createElement('code')
    const textNode = document.createTextNode('first\nsecond\nthird')
    code.append(textNode)
    pre.append(code)

    const selection = {
      anchorNode: textNode,
      anchorOffset: 14,
      focusNode: textNode,
      focusOffset: 2,
    } as unknown as Selection

    expect(resolveSourceLineRangeFromSelection(selection)).toEqual({
      startLine: 20,
      endLine: 22,
    })
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

  it('resolves nearest source line from pointer Y position', () => {
    const container = document.createElement('div')
    const lineTwo = document.createElement('p')
    const lineSeven = document.createElement('p')
    lineTwo.setAttribute('data-source-line', '2')
    lineSeven.setAttribute('data-source-line', '7')

    Object.defineProperty(lineTwo, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          top: 100,
          height: 20,
        }) as DOMRect,
    })
    Object.defineProperty(lineSeven, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          top: 200,
          height: 20,
        }) as DOMRect,
    })

    container.append(lineTwo, lineSeven)

    expect(resolveNearestSourceLineFromPoint(container, 112)).toBe(2)
    expect(resolveNearestSourceLineFromPoint(container, 206)).toBe(7)
  })

  it('prefers lower source line when nearest distance is tied', () => {
    const container = document.createElement('div')
    const lineFour = document.createElement('p')
    const lineTen = document.createElement('p')
    lineFour.setAttribute('data-source-line', '4')
    lineTen.setAttribute('data-source-line', '10')

    Object.defineProperty(lineFour, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          top: 100,
          height: 20,
        }) as DOMRect,
    })
    Object.defineProperty(lineTen, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          top: 140,
          height: 20,
        }) as DOMRect,
    })

    container.append(lineFour, lineTen)

    expect(resolveNearestSourceLineFromPoint(container, 130)).toBe(4)
  })
})
