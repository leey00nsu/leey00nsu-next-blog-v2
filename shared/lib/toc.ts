import GithubSlugger from 'github-slugger'
import { visit } from 'unist-util-visit'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Heading, PhrasingContent } from 'mdast'

export interface TocHeading {
  text: string
  slug: string
  depth: number
}

const TOC_HEADING_DEPTH = {
  MINIMUM: 2,
  MAXIMUM: 3,
} as const

function isTargetHeadingDepth(depth: number): boolean {
  return (
    depth >= TOC_HEADING_DEPTH.MINIMUM && depth <= TOC_HEADING_DEPTH.MAXIMUM
  )
}

function getPhrasingContentText(node: PhrasingContent): string {
  switch (node.type) {
    case 'text':
    case 'inlineCode': {
      return node.value
    }
    case 'break': {
      return ' '
    }
    case 'image':
    case 'imageReference': {
      return node.alt ?? ''
    }
    default: {
      if ('children' in node) {
        return node.children
          .map((child) => getPhrasingContentText(child as PhrasingContent))
          .join('')
      }

      return ''
    }
  }
}

function getHeadingText(heading: Heading): string {
  return heading.children
    .map((child) => getPhrasingContentText(child))
    .join('')
    .trim()
}

export function getTableOfContents(content: string): TocHeading[] {
  const headings: TocHeading[] = []
  const slugger = new GithubSlugger()
  const markdownTree = unified().use(remarkParse).parse(content)

  visit(markdownTree, 'heading', (heading: Heading) => {
    const { depth } = heading

    if (!isTargetHeadingDepth(depth)) {
      return
    }

    const text = getHeadingText(heading)
    headings.push({
      text,
      slug: slugger.slug(text),
      depth,
    })
  })

  return headings
}
