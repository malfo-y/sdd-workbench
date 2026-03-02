import { runRemoteAgent } from './agent-main'

void runRemoteAgent(process.argv.slice(2)).then((exitCode) => {
  process.exitCode = exitCode
})
