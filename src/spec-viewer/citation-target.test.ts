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
    expect(parseBracketCitationText('[src/app.py]')).toEqual({
      targetRelativePath: 'src/app.py',
      symbolName: null,
    })
  })

  it('normalizes dot-prefixed paths and rejects parent-directory escapes', () => {
    expect(parseBracketCitationText('[./src/app.py:run]')).toEqual({
      targetRelativePath: 'src/app.py',
      symbolName: 'run',
    })
    expect(parseBracketCitationText('[./src/app.py]')).toEqual({
      targetRelativePath: 'src/app.py',
      symbolName: null,
    })
    expect(parseBracketCitationText('[../src/app.py:run]')).toBeNull()
    expect(parseBracketCitationText('[../src/app.py]')).toBeNull()
  })

  it('ignores invisible whitespace artifacts around the citation payload', () => {
    expect(
      parseBracketCitationText('[\u200Bdrift/metrics.py:compute_all_metrics\u200B]'),
    ).toEqual({
      targetRelativePath: 'drift/metrics.py',
      symbolName: 'compute_all_metrics',
    })
    expect(
      parseBracketCitationText(
        '[drift/metrics.py:\uFEFFTeacherManager._teacher_on_gpu\u200D]',
      ),
    ).toEqual({
      targetRelativePath: 'drift/metrics.py',
      symbolName: 'TeacherManager._teacher_on_gpu',
    })
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
    const fileHref = buildCitationHref({
      targetRelativePath: 'src/pkg/mod.py',
      symbolName: null,
    })
    const dottedHref = buildCitationHref({
      targetRelativePath: 'src/pkg/mod.py',
      symbolName: 'Worker.run',
    })

    expect(parseCitationHref(fileHref)).toEqual({
      targetRelativePath: 'src/pkg/mod.py',
      symbolName: null,
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
