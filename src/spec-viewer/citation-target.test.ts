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

  it('rejects dotted symbols for the Python MVP', () => {
    expect(parseBracketCitationText('[src/app.py:Worker.run]')).toBeNull()
  })

  it('serializes and parses citation href payloads', () => {
    const href = buildCitationHref({
      targetRelativePath: 'src/pkg/mod.py',
      symbolName: 'Worker',
    })

    expect(parseCitationHref(href)).toEqual({
      targetRelativePath: 'src/pkg/mod.py',
      symbolName: 'Worker',
    })
  })
})
