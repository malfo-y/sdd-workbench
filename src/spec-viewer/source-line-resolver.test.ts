import { describe, expect, it } from 'vitest'
import {
  resolveBestRenderedSourceBlockForLine,
  resolveNearestSourceLineFromPoint,
  resolveSourceLine,
  resolveSourceLineRangeFromSelection,
  resolveSourceSelectionRangeFromSelection,
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

  it('estimates source line from a multiline rendered span', () => {
    const block = document.createElement('p')
    block.setAttribute('data-source-line', '3')
    block.setAttribute('data-source-line-start', '3')
    block.setAttribute('data-source-line-end', '5')
    const textNode = document.createTextNode('alpha beta gamma')
    block.append(textNode)

    const selection = {
      anchorNode: textNode,
      anchorOffset: textNode.data.indexOf('gamma'),
      focusNode: textNode,
      focusOffset: textNode.data.length,
    } as unknown as Selection

    expect(resolveSourceLineFromSelection(selection)).toBe(5)
    expect(resolveSourceLineRangeFromSelection(selection)).toEqual({
      startLine: 5,
      endLine: 5,
    })
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

  it('prefers a nested cell span over the parent table source line', () => {
    const table = document.createElement('table')
    table.setAttribute('data-source-line', '3')
    table.setAttribute('data-source-line-start', '3')
    table.setAttribute('data-source-line-end', '5')
    const row = document.createElement('tr')
    row.setAttribute('data-source-line-start', '5')
    row.setAttribute('data-source-line-end', '5')
    const cell = document.createElement('td')
    cell.setAttribute('data-source-line-start', '5')
    cell.setAttribute('data-source-line-end', '5')
    const textNode = document.createTextNode('beta')
    cell.append(textNode)
    row.append(cell)
    table.append(row)

    expect(resolveSourceLineFromTarget(textNode)).toBe(5)
  })

  it('resolves exact source offsets from annotated text leaf selection', () => {
    const paragraph = document.createElement('p')
    paragraph.setAttribute('data-source-line', '3')
    paragraph.setAttribute('data-source-line-start', '3')
    paragraph.setAttribute('data-source-line-end', '3')
    const leaf = document.createElement('span')
    leaf.setAttribute('data-source-line-start', '3')
    leaf.setAttribute('data-source-line-end', '3')
    leaf.setAttribute('data-source-offset-start', '24')
    leaf.setAttribute('data-source-offset-end', '29')
    const textNode = document.createTextNode('gamma')
    leaf.append(textNode)
    paragraph.append(leaf)

    const selection = {
      anchorNode: textNode,
      anchorOffset: 1,
      focusNode: textNode,
      focusOffset: 4,
    } as unknown as Selection

    expect(
      resolveSourceSelectionRangeFromSelection(
        selection,
        '# Title\n\nalpha **beta** gamma',
      ),
    ).toEqual({
      startLine: 3,
      endLine: 3,
      sourceOffsetRange: {
        startOffset: 25,
        endOffset: 28,
      },
    })
  })

  it('falls back to line-only range when exact offset metadata is unavailable', () => {
    const paragraph = document.createElement('p')
    paragraph.setAttribute('data-source-line', '3')
    paragraph.setAttribute('data-source-line-start', '3')
    paragraph.setAttribute('data-source-line-end', '3')
    const textNode = document.createTextNode('plain text')
    paragraph.append(textNode)

    const selection = {
      anchorNode: textNode,
      anchorOffset: 0,
      focusNode: textNode,
      focusOffset: 5,
    } as unknown as Selection

    expect(
      resolveSourceSelectionRangeFromSelection(selection, '# Title\n\nplain text'),
    ).toEqual({
      startLine: 3,
      endLine: 3,
    })
  })

  it('normalizes range across two nodes with different source spans', () => {
    const firstBlock = document.createElement('p')
    firstBlock.setAttribute('data-source-line', '4')
    firstBlock.setAttribute('data-source-line-start', '4')
    firstBlock.setAttribute('data-source-line-end', '5')
    const firstText = document.createTextNode('alpha beta')
    firstBlock.append(firstText)

    const secondBlock = document.createElement('p')
    secondBlock.setAttribute('data-source-line', '7')
    secondBlock.setAttribute('data-source-line-start', '7')
    secondBlock.setAttribute('data-source-line-end', '8')
    const secondText = document.createTextNode('gamma delta')
    secondBlock.append(secondText)

    const selection = {
      anchorNode: firstText,
      anchorOffset: firstText.data.indexOf('beta'),
      focusNode: secondText,
      focusOffset: secondText.data.length,
    } as unknown as Selection

    expect(resolveSourceLineRangeFromSelection(selection)).toEqual({
      startLine: 5,
      endLine: 8,
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

  it('resolves the rendered block whose source span contains the requested line', () => {
    const container = document.createElement('div')
    const paragraph = document.createElement('p')
    paragraph.setAttribute('data-source-line', '3')
    paragraph.setAttribute('data-source-line-start', '3')
    paragraph.setAttribute('data-source-line-end', '5')
    const heading = document.createElement('h2')
    heading.setAttribute('data-source-line', '7')
    heading.setAttribute('data-source-line-start', '7')
    heading.setAttribute('data-source-line-end', '7')

    container.append(paragraph, heading)

    expect(resolveBestRenderedSourceBlockForLine(container, 4)).toBe(paragraph)
    expect(resolveBestRenderedSourceBlockForLine(container, 7)).toBe(heading)
  })

  it('falls back to the nearest rendered block when no span contains the requested line', () => {
    const container = document.createElement('div')
    const firstBlock = document.createElement('p')
    firstBlock.setAttribute('data-source-line', '3')
    firstBlock.setAttribute('data-source-line-start', '3')
    firstBlock.setAttribute('data-source-line-end', '5')
    const secondBlock = document.createElement('p')
    secondBlock.setAttribute('data-source-line', '10')
    secondBlock.setAttribute('data-source-line-start', '10')
    secondBlock.setAttribute('data-source-line-end', '10')

    container.append(firstBlock, secondBlock)

    expect(resolveBestRenderedSourceBlockForLine(container, 8)).toBe(secondBlock)
  })
})
