import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  JsonLineDecoder,
  JsonLineFramingError,
  encodeJsonLineMessage,
} from './framing'

describe('remote-agent/framing', () => {
  it('reconstructs frames across chunk boundaries', () => {
    const decoder = new JsonLineDecoder<{ id: number }>()

    const part1 = '{"id":1}\n{"id"'
    const part2 = ':2}\n'

    const result1 = decoder.push(part1)
    const result2 = decoder.push(part2)

    expect(result1).toEqual([{ id: 1 }])
    expect(result2).toEqual([{ id: 2 }])
  })

  it('decodes multiple messages from one chunk', () => {
    const decoder = new JsonLineDecoder<{ id: number }>()
    const output = decoder.push('{"id":1}\n{"id":2}\n')
    expect(output).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('throws FRAME_INVALID_JSON for invalid payload', () => {
    const decoder = new JsonLineDecoder()

    expect(() => {
      decoder.push('not-json\n')
    }).toThrowError(JsonLineFramingError)

    try {
      decoder.push('not-json\n')
    } catch (error) {
      expect(error).toBeInstanceOf(JsonLineFramingError)
      expect((error as JsonLineFramingError).code).toBe('FRAME_INVALID_JSON')
    }
  })

  it('throws FRAME_TOO_LARGE when buffered chunk exceeds limit', () => {
    const decoder = new JsonLineDecoder(8)

    expect(() => {
      decoder.push(Buffer.from('123456789', 'utf8'))
    }).toThrowError(JsonLineFramingError)

    try {
      decoder.push(Buffer.from('123456789', 'utf8'))
    } catch (error) {
      expect((error as JsonLineFramingError).code).toBe('FRAME_TOO_LARGE')
    }
  })

  it('refuses to encode oversized frames', () => {
    expect(() => {
      encodeJsonLineMessage({ payload: '123456789' }, 8)
    }).toThrowError(JsonLineFramingError)
  })

  it('accepts frames larger than 1MiB with default limit', () => {
    const decoder = new JsonLineDecoder<{ payload: string }>()
    const payload = 'x'.repeat(1024 * 1024 + 32)
    const frame = encodeJsonLineMessage({ payload })

    const result = decoder.push(frame)
    expect(result).toEqual([{ payload }])
  })
})
