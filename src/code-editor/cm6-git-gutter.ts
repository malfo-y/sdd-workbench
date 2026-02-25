import { StateField, StateEffect, Extension } from '@codemirror/state'
import { EditorView, gutter, GutterMarker } from '@codemirror/view'

/**
 * Kind of Git line marker: 'added' (green dot) or 'modified' (blue dot).
 */
export type GitMarkerKind = 'added' | 'modified'

/**
 * StateEffect: inject a new Map<lineNumber, GitMarkerKind> from outside.
 * The line number is 1-based (matching CM6's doc.lineAt().number).
 */
export const setGitMarkers = StateEffect.define<Map<number, GitMarkerKind>>()

/**
 * StateField: holds the current Map<lineNumber, GitMarkerKind>.
 * Replaces the whole Map on each setGitMarkers effect (no merging).
 */
export const gitMarkersField = StateField.define<Map<number, GitMarkerKind>>({
  create: () => new Map(),
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setGitMarkers)) {
        return effect.value
      }
    }
    return value
  },
})

/**
 * GutterMarker subclass that renders a colored dot span.
 * Exported so that it can be unit-tested directly.
 */
export class GitDotMarker extends GutterMarker {
  constructor(private kind: GitMarkerKind) {
    super()
  }

  toDOM(): Node {
    const span = document.createElement('span')
    span.className = `cm-git-dot cm-git-${this.kind}`
    return span
  }

  /**
   * CM6 uses eq() to decide whether to reuse a marker DOM node.
   * Two GitDotMarkers are equal when they have the same kind.
   */
  eq(other: GutterMarker): boolean {
    return other instanceof GitDotMarker && other.kind === this.kind
  }
}

// Spacer instance used by initialSpacer — determines gutter width.
const addedSpacer = new GitDotMarker('added')

/**
 * CM6 gutter extension that renders git line markers.
 * Reads marker data from gitMarkersField in the editor state.
 */
function gitGutter(): Extension {
  return gutter({
    class: 'cm-git-gutter',
    lineMarker(view: EditorView, line) {
      const markers = view.state.field(gitMarkersField)
      const lineNum = view.state.doc.lineAt(line.from).number
      const kind = markers.get(lineNum)
      return kind ? new GitDotMarker(kind) : null
    },
    initialSpacer: () => addedSpacer,
  })
}

/**
 * Returns the full set of CM6 extensions needed for git gutter support.
 * Include this array in the EditorView's extensions list.
 *
 * @example
 * const view = new EditorView({
 *   extensions: [...createGitMarkersExtension(), ...otherExtensions],
 * })
 *
 * // Inject markers from outside:
 * view.dispatch({ effects: setGitMarkers.of(new Map([[1, 'added'], [3, 'modified']])) })
 */
export function createGitMarkersExtension(): Extension[] {
  return [gitMarkersField, gitGutter()]
}
