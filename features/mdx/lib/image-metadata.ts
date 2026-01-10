// Custom rehype plugin to add width and height to local images
// To make Next.js <Image/> works
// Ref: https://kylepfromer.com/blog/nextjs-image-component-blog
// Similiar structure to:
// https://github.com/JS-DevTools/rehype-inline-svg/blob/master/src/inline-svg.ts
import { THUMBNAIL_METADATA } from '@/entities/post/config/thumbnail-metadata'
import { Node } from 'unist'
import { visit } from 'unist-util-visit'

/**
 * An `<img>` HAST node
 */
interface ImageNode extends Node {
  type: 'element'
  tagName: 'img'
  properties: {
    src: string
    height?: number
    width?: number
    base64?: string
  }
}

/**
 * Determines whether the given HAST node is an `<img>` element.
 */
function isImageNode(node: Node): node is ImageNode {
  const img = node as ImageNode
  return (
    img.type === 'element' &&
    img.tagName === 'img' &&
    img.properties &&
    typeof img.properties.src === 'string'
  )
}

/**
 * Filters out non absolute paths from the public folder.
 */
function filterImageNode(node: ImageNode): boolean {
  return node.properties.src.startsWith('/')
}

/**
 * Adds the image's `height` and `width` to it's properties.
 * Uses pre-generated metadata from thumbnail-metadata.generated.ts
 */
export function addMetadata(node: ImageNode): void {
  const src = node.properties.src
  // MDX에서 이미지 경로는 /posts/... 형식이므로 /public 접두사 추가
  const publicPath = `/public${src}`

  const metadata = THUMBNAIL_METADATA[publicPath]

  if (!metadata) {
    console.warn(`⚠️ Image metadata not found: ${publicPath}`)
    return
  }

  node.properties.width = metadata.width
  node.properties.height = metadata.height
  node.properties.base64 = metadata.base64
}

/**
 * This is a Rehype plugin that finds image `<img>` elements and adds the height and width to the properties.
 * Read more about Next.js image: https://nextjs.org/docs/api-reference/next/image#layout
 */
export function imageMetadata() {
  return function transformer(tree: Node): Node {
    const imgNodes: ImageNode[] = []

    visit(tree, 'element', (node) => {
      if (isImageNode(node) && filterImageNode(node)) {
        imgNodes.push(node)
      }
    })

    for (const node of imgNodes) {
      addMetadata(node)
    }

    return tree
  }
}
