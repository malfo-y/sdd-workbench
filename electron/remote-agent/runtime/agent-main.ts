import { createInterface } from 'node:readline'
import { REMOTE_AGENT_PROTOCOL_VERSION } from '../protocol'
import { RuntimeRequestRouter } from './request-router'
import type { RuntimeEventMessage, RuntimeResponseMessage } from './runtime-types'

type AgentCliMode =
  | { kind: 'protocol-version' }
  | { kind: 'healthcheck' }
  | {
      kind: 'stdio'
      protocolVersion: string
      workspaceRoot: string
    }

export type AgentRuntimeIo = {
  stdin: NodeJS.ReadableStream
  stdout: NodeJS.WritableStream
  stderr: NodeJS.WritableStream
}

export function parseAgentCliArgs(args: string[]): AgentCliMode {
  if (args.length === 1 && args[0] === '--protocol-version') {
    return { kind: 'protocol-version' }
  }

  if (args.length === 1 && args[0] === '--healthcheck') {
    return { kind: 'healthcheck' }
  }

  if (!args.includes('--stdio')) {
    throw new Error('Unsupported mode. Use --protocol-version, --healthcheck, or --stdio.')
  }

  const protocolVersionIndex = args.indexOf('--protocol-version')
  if (protocolVersionIndex < 0 || protocolVersionIndex === args.length - 1) {
    throw new Error('--protocol-version is required in --stdio mode.')
  }

  const workspaceRootIndex = args.indexOf('--workspace-root')
  if (workspaceRootIndex < 0 || workspaceRootIndex === args.length - 1) {
    throw new Error('--workspace-root is required in --stdio mode.')
  }

  return {
    kind: 'stdio',
    protocolVersion: args[protocolVersionIndex + 1],
    workspaceRoot: args[workspaceRootIndex + 1],
  }
}

export async function runRemoteAgent(
  args: string[],
  io: AgentRuntimeIo = process,
): Promise<number> {
  let mode: AgentCliMode
  try {
    mode = parseAgentCliArgs(args)
  } catch (error) {
    io.stderr.write(
      `${error instanceof Error ? error.message : 'Invalid arguments.'}\n`,
    )
    return 1
  }

  if (mode.kind === 'protocol-version') {
    io.stdout.write(`${REMOTE_AGENT_PROTOCOL_VERSION}\n`)
    return 0
  }

  if (mode.kind === 'healthcheck') {
    io.stdout.write('ok\n')
    return 0
  }

  if (mode.protocolVersion !== REMOTE_AGENT_PROTOCOL_VERSION) {
    io.stderr.write(
      `Unsupported protocol version: ${mode.protocolVersion}. Expected ${REMOTE_AGENT_PROTOCOL_VERSION}.\n`,
    )
    return 1
  }

  const writeResponse = (response: RuntimeResponseMessage) => {
    io.stdout.write(`${JSON.stringify(response)}\n`)
  }
  const writeEvent = (event: RuntimeEventMessage) => {
    io.stdout.write(`${JSON.stringify(event)}\n`)
  }

  const requestRouter = new RuntimeRequestRouter({
    rootPath: mode.workspaceRoot,
    emitResponse: writeResponse,
    emitEvent: writeEvent,
  })

  const lineReader = createInterface({
    input: io.stdin,
    crlfDelay: Infinity,
  })

  let processingChain = Promise.resolve()

  lineReader.on('line', (line) => {
    if (!line.trim()) {
      return
    }

    processingChain = processingChain
      .then(async () => {
        let parsed: unknown
        try {
          parsed = JSON.parse(line)
        } catch {
          io.stderr.write('Received invalid JSON line in stdio mode.\n')
          return
        }

        await requestRouter.handleMessage(parsed)
      })
      .catch((error) => {
        io.stderr.write(
          `${error instanceof Error ? error.message : 'Failed to process request.'}\n`,
        )
      })
  })

  await new Promise<void>((resolve) => {
    lineReader.on('close', () => {
      resolve()
    })
    io.stdin.on('error', () => {
      resolve()
    })
  })

  await processingChain
  await requestRouter.dispose()
  return 0
}
