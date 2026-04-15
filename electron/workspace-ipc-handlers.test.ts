import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  handleWorkspaceReadComments,
  handleWorkspaceWriteComments,
} from './workspace-ipc-handlers'

const VALID_COMMENT = {
  id: 'comment-1',
  relativePath: 'src/main.ts',
  startLine: 2,
  endLine: 3,
  body: 'Check this block',
  anchor: {
    snippet: 'console.log("hi")',
    hash: 'abc123',
    startOffset: 10,
    endOffset: 27,
  },
  createdAt: '2026-04-14T10:00:00.000Z',
}

describe('electron/workspace-ipc-handlers comments', () => {
  it('filters invalid stored comments and returns a warning', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-ipc-comments-read-'))

    try {
      const metadataDirectoryPath = path.join(rootPath, '.sdd-workbench')
      await mkdir(metadataDirectoryPath, { recursive: true })
      await writeFile(
        path.join(metadataDirectoryPath, 'comments.json'),
        `${JSON.stringify([
          VALID_COMMENT,
          {
            id: 'bad-comment',
            relativePath: 'src/main.ts',
            startLine: 'bad',
          },
        ])}\n`,
        'utf8',
      )

      const result = await handleWorkspaceReadComments({} as never, { rootPath })

      expect(result).toEqual({
        ok: true,
        comments: [VALID_COMMENT],
        error: 'Some comments were skipped due to invalid schema.',
      })
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })

  it('rejects invalid comment schema on write', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-ipc-comments-write-'))

    try {
      const result = await handleWorkspaceWriteComments({} as never, {
        rootPath,
        comments: [
          {
            id: 'bad-comment',
            relativePath: 'src/main.ts',
            startLine: 1,
            endLine: 1,
            body: 'Missing anchor',
            createdAt: '2026-04-14T10:00:00.000Z',
          },
        ] as never,
      })

      expect(result).toEqual({
        ok: false,
        error: 'Some comments were skipped due to invalid schema.',
      })
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })
})
