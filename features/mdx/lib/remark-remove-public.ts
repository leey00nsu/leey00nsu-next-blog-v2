import { visit } from 'unist-util-visit'
import type { Root, Image } from 'mdast'

export function remarkRemovePublic() {
  return (tree: Root) => {
    visit(tree, 'image', (node: Image) => {
      if (node.url.startsWith('/public/')) {
        node.url = node.url.replace('/public', '')
      }
    })
  }
}
