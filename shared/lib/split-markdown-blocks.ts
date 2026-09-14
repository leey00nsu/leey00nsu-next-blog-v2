import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

const markdownParser = unified().use(remarkParse).use(remarkGfm)

/** Keep tables, lists and fenced code together, using source offsets without serialization. */
export function splitMarkdownBlocks(content: string): string[] {
  return markdownParser
    .parse(content)
    .children.map((node) => {
      return content.slice(
        node.position?.start.offset,
        node.position?.end.offset,
      )
    })
    .filter(Boolean)
}
