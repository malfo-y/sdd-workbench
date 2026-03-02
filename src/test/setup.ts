import '@testing-library/jest-dom/vitest'

const createEmptyDomRectList = (): DOMRectList =>
  ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: () => [][Symbol.iterator](),
  }) as unknown as DOMRectList

const fallbackRect = new DOMRect(0, 0, 0, 0)

if (typeof Range !== 'undefined') {
  if (typeof Range.prototype.getClientRects !== 'function') {
    Object.defineProperty(Range.prototype, 'getClientRects', {
      configurable: true,
      value: () => createEmptyDomRectList(),
    })
  }
  if (typeof Range.prototype.getBoundingClientRect !== 'function') {
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => fallbackRect,
    })
  }
}
