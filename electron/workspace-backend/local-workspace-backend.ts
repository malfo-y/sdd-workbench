import type {
  WorkspaceBackend,
} from './types'

export type LocalWorkspaceBackendHandlers = Omit<
  WorkspaceBackend,
  'kind' | 'dispose'
>

export function createLocalWorkspaceBackend(
  handlers: LocalWorkspaceBackendHandlers,
): WorkspaceBackend {
  return {
    kind: 'local',
    ...handlers,
  }
}
