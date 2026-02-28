import { Buffer } from 'node:buffer'

export const DEFAULT_MAX_FRAME_BYTES = 1024 * 1024

export type JsonLineFramingErrorCode = 'FRAME_TOO_LARGE' | 'FRAME_INVALID_JSON'

export class JsonLineFramingError extends Error {
  readonly code: JsonLineFramingErrorCode
  readonly cause: unknown | undefined

  constructor(
    code: JsonLineFramingErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message)
    this.code = code
    this.cause = cause
    this.name = 'JsonLineFramingError'
  }
}

export function encodeJsonLineMessage(
  message: unknown,
  maxFrameBytes = DEFAULT_MAX_FRAME_BYTES,
): string {
  const encoded = `${JSON.stringify(message)}\n`
  const encodedBytes = Buffer.byteLength(encoded, 'utf8')
  if (encodedBytes > maxFrameBytes) {
    throw new JsonLineFramingError(
      'FRAME_TOO_LARGE',
      `Frame size ${encodedBytes} exceeds cap ${maxFrameBytes}.`,
    )
  }

  return encoded
}

export class JsonLineDecoder<TMessage = unknown> {
  private readonly maxFrameBytes: number
  private buffer = ''

  constructor(maxFrameBytes = DEFAULT_MAX_FRAME_BYTES) {
    this.maxFrameBytes = maxFrameBytes
  }

  push(chunk: Buffer | string): TMessage[] {
    this.buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8')

    if (Buffer.byteLength(this.buffer, 'utf8') > this.maxFrameBytes) {
      throw new JsonLineFramingError(
        'FRAME_TOO_LARGE',
        `Buffered frame exceeded ${this.maxFrameBytes} bytes before newline delimiter.`,
      )
    }

    const messages: TMessage[] = []
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n')
      if (newlineIndex < 0) {
        break
      }

      let line = this.buffer.slice(0, newlineIndex)
      this.buffer = this.buffer.slice(newlineIndex + 1)
      if (line.endsWith('\r')) {
        line = line.slice(0, -1)
      }
      if (!line) {
        continue
      }

      if (Buffer.byteLength(line, 'utf8') > this.maxFrameBytes) {
        throw new JsonLineFramingError(
          'FRAME_TOO_LARGE',
          `Frame size exceeded cap ${this.maxFrameBytes}.`,
        )
      }

      try {
        messages.push(JSON.parse(line) as TMessage)
      } catch (error) {
        throw new JsonLineFramingError(
          'FRAME_INVALID_JSON',
          'Received invalid JSON line frame.',
          error,
        )
      }
    }

    return messages
  }
}
