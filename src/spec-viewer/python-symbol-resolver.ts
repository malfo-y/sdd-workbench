import { parser } from '@lezer/python'
import type { TreeCursor } from '@lezer/common'
import type { SourceOffsetRange } from '../source-selection'
import {
  SIMPLE_SYMBOL_PATTERN,
  QUALIFIED_METHOD_PATTERN,
} from './citation-target'

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

function collectDeclarations(code: string): SymbolDeclaration[] {
  const declarations: SymbolDeclaration[] = []
  const cursor = parser.parse(code).cursor()

  function walk(classOwners: readonly string[], functionDepth: number) {
    let childClassOwners = classOwners
    let childFunctionDepth = functionDepth

    if (cursor.name === 'ClassDefinition') {
      const declarationName = readDeclarationName(code, cursor)
      if (declarationName) {
        declarations.push(declarationName)
        childClassOwners = [...classOwners, declarationName.name]
      }
    } else if (cursor.name === 'FunctionDefinition') {
      const declarationName = readDeclarationName(code, cursor)
      if (declarationName) {
        declarations.push(declarationName)
        if (classOwners.length === 1 && functionDepth === 0) {
          declarations.push({
            ...declarationName,
            name: `${classOwners[0]}.${declarationName.name}`,
          })
        }
      }
      childFunctionDepth = functionDepth + 1
    }

    if (cursor.firstChild()) {
      do {
        walk(childClassOwners, childFunctionDepth)
      } while (cursor.nextSibling())
      cursor.parent()
    }
  }

  walk([], 0)
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
  const normalizedSymbolName = symbolName.trim()
  if (
    !SIMPLE_SYMBOL_PATTERN.test(normalizedSymbolName) &&
    !QUALIFIED_METHOD_PATTERN.test(normalizedSymbolName)
  ) {
    return {
      ok: false,
      reason: 'unsupported_symbol',
    }
  }

  const matches = collectDeclarations(code).filter(
    (declaration) => declaration.name === normalizedSymbolName,
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
