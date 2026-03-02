import { describe, expect, it, vi } from 'vitest'

// Mock all CM6 language packages to avoid DOM/editor environment issues in jsdom
vi.mock('@codemirror/lang-javascript', () => ({
  javascript: vi.fn((opts?: object) => ({ name: 'javascript', opts })),
}))
vi.mock('@codemirror/lang-python', () => ({
  python: vi.fn(() => ({ name: 'python' })),
}))
vi.mock('@codemirror/lang-html', () => ({
  html: vi.fn(() => ({ name: 'html' })),
}))
vi.mock('@codemirror/lang-css', () => ({
  css: vi.fn(() => ({ name: 'css' })),
}))
vi.mock('@codemirror/lang-markdown', () => ({
  markdown: vi.fn(() => ({ name: 'markdown' })),
}))
vi.mock('@codemirror/lang-json', () => ({
  json: vi.fn(() => ({ name: 'json' })),
}))
vi.mock('@codemirror/lang-rust', () => ({
  rust: vi.fn(() => ({ name: 'rust' })),
}))
vi.mock('@codemirror/lang-cpp', () => ({
  cpp: vi.fn(() => ({ name: 'cpp' })),
}))
vi.mock('@codemirror/lang-java', () => ({
  java: vi.fn(() => ({ name: 'java' })),
}))
vi.mock('@codemirror/lang-sql', () => ({
  sql: vi.fn(() => ({ name: 'sql' })),
}))
vi.mock('@codemirror/lang-xml', () => ({
  xml: vi.fn(() => ({ name: 'xml' })),
}))
vi.mock('@codemirror/lang-yaml', () => ({
  yaml: vi.fn(() => ({ name: 'yaml' })),
}))

import { getCM6Language } from './cm6-language-map'

describe('getCM6Language', () => {
  describe('returns null for null or unsupported input', () => {
    it('returns null when filePath is null', async () => {
      const result = await getCM6Language(null)
      expect(result).toBeNull()
    })

    it('returns null for unsupported extension', async () => {
      const result = await getCM6Language('archive.log')
      expect(result).toBeNull()
    })

    it('returns null for file with no extension', async () => {
      const result = await getCM6Language('LICENSE')
      expect(result).toBeNull()
    })

    it('returns null for extension-less path segment', async () => {
      const result = await getCM6Language('src/somefile')
      expect(result).toBeNull()
    })
  })

  describe('TypeScript and JavaScript mappings', () => {
    it('maps .ts to javascript({ typescript: true })', async () => {
      const result = await getCM6Language('src/app.ts')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('javascript')
      expect((result as unknown as { opts?: unknown }).opts).toEqual({ typescript: true })
    })

    it('maps .tsx to javascript({ typescript: true, jsx: true })', async () => {
      const result = await getCM6Language('src/app.tsx')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('javascript')
      expect((result as unknown as { opts?: unknown }).opts).toEqual({ typescript: true, jsx: true })
    })

    it('maps .js to javascript()', async () => {
      const result = await getCM6Language('src/app.js')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('javascript')
      expect((result as unknown as { opts?: unknown }).opts).toBeUndefined()
    })

    it('maps .jsx to javascript({ jsx: true })', async () => {
      const result = await getCM6Language('src/app.jsx')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('javascript')
      expect((result as unknown as { opts?: unknown }).opts).toEqual({ jsx: true })
    })
  })

  describe('Other language mappings', () => {
    it('maps .py to python', async () => {
      const result = await getCM6Language('tools/script.py')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('python')
    })

    it('maps .html to html', async () => {
      const result = await getCM6Language('index.html')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('html')
    })

    it('maps .htm to html', async () => {
      const result = await getCM6Language('index.htm')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('html')
    })

    it('maps .css to css', async () => {
      const result = await getCM6Language('src/style.css')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('css')
    })

    it('maps .md to markdown', async () => {
      const result = await getCM6Language('README.md')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('markdown')
    })

    it('maps .json to json', async () => {
      const result = await getCM6Language('package.json')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('json')
    })

    it('maps .rs to rust', async () => {
      const result = await getCM6Language('src/main.rs')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('rust')
    })

    it('maps .cpp to cpp', async () => {
      const result = await getCM6Language('src/main.cpp')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('cpp')
    })

    it('maps .hpp to cpp', async () => {
      const result = await getCM6Language('include/header.hpp')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('cpp')
    })

    it('maps .c to cpp', async () => {
      const result = await getCM6Language('src/main.c')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('cpp')
    })

    it('maps .h to cpp', async () => {
      const result = await getCM6Language('include/header.h')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('cpp')
    })

    it('maps .java to java', async () => {
      const result = await getCM6Language('src/Main.java')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('java')
    })

    it('maps .sql to sql', async () => {
      const result = await getCM6Language('schema.sql')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('sql')
    })

    it('maps .xml to xml', async () => {
      const result = await getCM6Language('config.xml')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('xml')
    })

    it('maps .svg to xml', async () => {
      const result = await getCM6Language('icon.svg')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('xml')
    })

    it('maps .yaml to yaml', async () => {
      const result = await getCM6Language('.github/ci.yaml')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('yaml')
    })

    it('maps .yml to yaml', async () => {
      const result = await getCM6Language('.github/ci.yml')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('yaml')
    })
  })

  describe('filename-based mappings', () => {
    it('maps Dockerfile (exact filename, no extension) to null (no CM6 support)', async () => {
      // Dockerfile has no CM6 language package — should return null
      const result = await getCM6Language('Dockerfile')
      expect(result).toBeNull()
    })

    it('maps Makefile (exact filename, no extension) to null (no CM6 support)', async () => {
      // Makefile has no CM6 language package — should return null
      const result = await getCM6Language('Makefile')
      expect(result).toBeNull()
    })
  })

  describe('case insensitivity', () => {
    it('handles uppercase extensions', async () => {
      const result = await getCM6Language('README.MD')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('markdown')
    })

    it('handles mixed case extensions', async () => {
      const result = await getCM6Language('App.TS')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('javascript')
      expect((result as unknown as { opts?: unknown }).opts).toEqual({ typescript: true })
    })
  })

  describe('nested path handling', () => {
    it('correctly extracts extension from nested paths', async () => {
      const result = await getCM6Language('a/b/c/deep/file.py')
      expect(result).not.toBeNull()
      expect((result as unknown as { name: string }).name).toBe('python')
    })
  })
})
