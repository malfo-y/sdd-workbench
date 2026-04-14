import type { MutableRefObject } from 'react'
import type { WorkspaceId } from './workspace-model'

export type WorkspaceRequestIdMapRef = MutableRefObject<
  Record<WorkspaceId, number>
>

export async function executeTrackedIpcCall<T>(input: {
  requestIdByWorkspaceRef: WorkspaceRequestIdMapRef
  workspaceId: WorkspaceId
  call: () => Promise<T>
}): Promise<{ requestId: number; result: T }> {
  const requestId =
    (input.requestIdByWorkspaceRef.current[input.workspaceId] ?? 0) + 1
  input.requestIdByWorkspaceRef.current[input.workspaceId] = requestId
  const result = await input.call()
  return { requestId, result }
}

export function isTrackedIpcCallCurrent(
  requestIdByWorkspaceRef: WorkspaceRequestIdMapRef,
  workspaceId: WorkspaceId,
  requestId: number,
) {
  return requestIdByWorkspaceRef.current[workspaceId] === requestId
}
