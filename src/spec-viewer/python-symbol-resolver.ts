import { parser } from '@lezer/python'
import type { TreeCursor } from '@lezer/common'
import type { SourceOffsetRange } from '../source-selection'

type PythonSymbolResolution =
  | {
      ok: true
      lineNumber: number
      sourceOffsetRange: SourceOffsetRange
    }
  | {
      ok: false
      reason: 'ambiguous' | 'not_found' | 'unsupported_symbol'
    }

type SymbolDeclaration = {
  name: string
  startOffset: number
  endOffset: number
}

const SIMPLE_SYMBOL_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

function collectDeclarations(code: string): SymbolDeclaration[] {
  const declarations: SymbolDeclaration[] = []
  const cursor = parser.parse(code).cursor()

  function walk() {
    if (
      cursor.name === 'ClassDefinition' ||
      cursor.name === 'FunctionDefinition'
    ) {
      const declarationName = readDeclarationName(code, cursor)
      if (declarationName) {
        declarations.push(declarationName)
      }
    }

    if (cursor.firstChild()) {
      do {
        walk()
      } while (cursor.nextSibling())
      cursor.parent()
    }
  }

  walk()
  return declarations
}

function readDeclarationName(
  code: string,
  declarationCursor: TreeCursor,
): SymbolDeclaration | null {
  if (!declarationCursor.firstChild()) {
    return null
  }

  do {
    if (declarationCursor.name === 'VariableName') {
      const startOffset = declarationCursor.from
      const endOffset = declarationCursor.to
      const name = code.slice(declarationCursor.from, declarationCursor.to)
      declarationCursor.parent()
      return {
        name,
        startOffset,
        endOffset,
      }
    }
  } while (declarationCursor.nextSibling())

  declarationCursor.parent()
  return null
}

function toLineNumber(code: string, offset: number): number {
  let lineNumber = 1
  const boundedOffset = Math.max(0, Math.min(offset, code.length))

  for (let index = 0; index < boundedOffset; index += 1) {
    if (code[index] === '\n') {
      lineNumber += 1
    }
  }

  return lineNumber
}

/**
 * Resolves a simple Python symbol name to its declaration line using the
 * Lezer Python parser. Supports top-level functions, classes, and methods.
 * Returns a failure result for ambiguous, missing, or unsupported symbols.
 */
export function resolvePythonSymbol(
  code: string,
  symbolName: string,
): PythonSymbolResolution {
  if (!SIMPLE_SYMBOL_PATTERN.test(symbolName.trim())) {
    return {
      ok: false,
      reason: 'unsupported_symbol',
    }
  }

  const matches = collectDeclarations(code).filter(
    (declaration) => declaration.name === symbolName,
  )
  if (matches.length === 0) {
    return {
      ok: false,
      reason: 'not_found',
    }
  }

  if (matches.length > 1) {
    return {
      ok: false,
      reason: 'ambiguous',
    }
  }

  const [match] = matches
  return {
    ok: true,
    lineNumber: toLineNumber(code, match.startOffset),
    sourceOffsetRange: {
      startOffset: match.startOffset,
      endOffset: match.endOffset,
    },
  }
}
