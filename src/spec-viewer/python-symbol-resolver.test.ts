import { describe, expect, it } from 'vitest'
import { resolvePythonSymbol } from './python-symbol-resolver'

describe('resolvePythonSymbol', () => {
  it('resolves a top-level function declaration', () => {
    const code = ['def helper():', '    return 1', '', 'value = helper()'].join('\n')

    expect(resolvePythonSymbol(code, 'helper')).toEqual({
      ok: true,
      lineNumber: 1,
      sourceOffsetRange: {
        startOffset: 4,
        endOffset: 10,
      },
    })
  })

  it('resolves a class declaration', () => {
    const code = ['class Worker:', '    pass', '', 'Worker()'].join('\n')

    expect(resolvePythonSymbol(code, 'Worker')).toEqual({
      ok: true,
      lineNumber: 1,
      sourceOffsetRange: {
        startOffset: 6,
        endOffset: 12,
      },
    })
  })

  it('resolves a uniquely named method declaration', () => {
    const code = [
      'class Worker:',
      '    def execute(self):',
      '        return 1',
      '',
      'result = Worker().execute()',
    ].join('\n')

    expect(resolvePythonSymbol(code, 'execute')).toEqual({
      ok: true,
      lineNumber: 2,
      sourceOffsetRange: {
        startOffset: 22,
        endOffset: 29,
      },
    })
  })

  it('fails when the symbol does not exist', () => {
    const code = ['def helper():', '    return 1'].join('\n')

    expect(resolvePythonSymbol(code, 'missing')).toEqual({
      ok: false,
      reason: 'not_found',
    })
  })

  it('fails when a simple symbol name is ambiguous', () => {
    const code = [
      'class First:',
      '    def execute(self):',
      '        return 1',
      '',
      'class Second:',
      '    def execute(self):',
      '        return 2',
    ].join('\n')

    expect(resolvePythonSymbol(code, 'execute')).toEqual({
      ok: false,
      reason: 'ambiguous',
    })
  })

  it('rejects unsupported symbol syntax', () => {
    const code = ['def helper():', '    return 1'].join('\n')

    expect(resolvePythonSymbol(code, 'Worker.execute')).toEqual({
      ok: false,
      reason: 'unsupported_symbol',
    })
  })
})
