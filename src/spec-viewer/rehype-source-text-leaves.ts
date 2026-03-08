type HastNode = {
  type?: string
  tagName?: string
  value?: string
  position?: unknown
  properties?: Record<string, unknown>
  children?: HastNode[]
}

const TEXT_LEAF_PARENT_TAGS = new Set([
  'a',
  'blockquote',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'p',
  'strong',
  'td',
  'th',
])

function shouldWrapTextLeaf(parent: HastNode | null, child: HastNode) {
  if (!parent || parent.type !== 'element') {
    return false
  }

  if (!TEXT_LEAF_PARENT_TAGS.has(parent.tagName ?? '')) {
    return false
  }

  if (child.type !== 'text') {
    return false
  }

  if (typeof child.value !== 'string' || child.value.trim().length === 0) {
    return false
  }

  return true
}

function visit(node: HastNode) {
  const children = Array.isArray(node.children) ? node.children : null
  if (!children) {
    return
  }

  const nextChildren: HastNode[] = []
  for (const child of children) {
    if (shouldWrapTextLeaf(node, child)) {
      nextChildren.push({
        type: 'element',
        tagName: 'span',
        properties: {
          'data-source-text-leaf': 'true',
        },
        position: child.position,
        children: [child],
      })
      continue
    }

    visit(child)
    nextChildren.push(child)
  }

  node.children = nextChildren
}

export function rehypeWrapSourceTextLeaves() {
  return (tree: HastNode) => {
    visit(tree)
  }
}
