import { describe, expect, it } from 'vitest'
import {
  buildCitationHref,
  parseBracketCitationText,
  parseCitationHref,
} from './citation-target'

describe('citation-target', () => {
  it('parses bracket citation text with workspace-root relative paths', () => {
    expect(parseBracketCitationText('[src/app.py:run]')).toEqual({
      targetRelativePath: 'src/app.py',
      symbolName: 'run',
    })
  })

  it('normalizes dot-prefixed paths and rejects parent-directory escapes', () => {
    expect(parseBracketCitationText('[./src/app.py:run]')).toEqual({
      targetRelativePath: 'src/app.py',
      symbolName: 'run',
    })
    expect(parseBracketCitationText('[../src/app.py:run]')).toBeNull()
  })

  it('accepts one-level dotted method symbols and rejects deeper chains', () => {
    expect(parseBracketCitationText('[src/app.py:Worker.run]')).toEqual({
      targetRelativePath: 'src/app.py',
      symbolName: 'Worker.run',
    })
    expect(parseBracketCitationText('[src/app.py:Outer.Worker.run]')).toBeNull()
  })

  it('serializes and parses citation href payloads for simple and dotted symbols', () => {
    const href = buildCitationHref({
      targetRelativePath: 'src/pkg/mod.py',
      symbolName: 'Worker',
    })
    const dottedHref = buildCitationHref({
      targetRelativePath: 'src/pkg/mod.py',
      symbolName: 'Worker.run',
    })

    expect(parseCitationHref(href)).toEqual({
      targetRelativePath: 'src/pkg/mod.py',
      symbolName: 'Worker',
    })
    expect(parseCitationHref(dottedHref)).toEqual({
      targetRelativePath: 'src/pkg/mod.py',
      symbolName: 'Worker.run',
    })
  })
})
