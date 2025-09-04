// Custom rehype plugin to add width and height to local images
// To make Next.js <Image/> works
// Ref: https://kylepfromer.com/blog/nextjs-image-component-blog
// Similiar structure to:
// https://github.com/JS-DevTools/rehype-inline-svg/blob/master/src/inline-svg.ts
import lqip from 'lqip-modern'
import fs from 'node:fs/promises'
import path from 'node:path'
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
 */
export async function addMetadata(node: ImageNode): Promise<void> {
  const buffer = await fs.readFile(
    path.join(process.cwd(), '/public', node.properties.src),
  )

  // lqip 이미지 라이브러리 plaiceholder 와 lqip-modern 중 lqip-modern이 더 퀄리티가 좋음
  // const { base64, metadata } = await getPlaiceholder(buffer, { size: 10 });
  const { metadata } = await lqip(buffer)

  node.properties.width = metadata.originalWidth
  node.properties.height = metadata.originalHeight
  node.properties.base64 = metadata.dataURIBase64
}

/**
 * This is a Rehype plugin that finds image `<img>` elements and adds the height and width to the properties.
 * Read more about Next.js image: https://nextjs.org/docs/api-reference/next/image#layout
 */
export default function imageMetadata() {
  return async function transformer(tree: Node): Promise<Node> {
    const imgNodes: ImageNode[] = []

    visit(tree, 'element', (node) => {
      if (isImageNode(node) && filterImageNode(node)) {
        imgNodes.push(node)
      }
    })

    for (const node of imgNodes) {
      await addMetadata(node)
    }

    return tree
  }
}

