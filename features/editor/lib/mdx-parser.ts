/**
 * MDX 파싱 모듈
 *
 * MDX 문자열을 Tiptap JSON 문서로 변환합니다.
 * remark를 사용하여 마크다운을 AST로 파싱한 후 Tiptap JSON으로 변환합니다.
 */

import type { JSONContent } from '@tiptap/react'
import type { Root, Content, PhrasingContent } from 'mdast'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

/**
 * MDX 문자열을 Tiptap JSON 문서로 파싱합니다.
 *
 * @param mdx - MDX 문자열
 * @returns Tiptap JSON 문서
 */
export function parseFromMdx(mdx: string): JSONContent {
  try {
    const processor = unified().use(remarkParse).use(remarkGfm)

    const tree = processor.parse(mdx) as Root

    return convertMdastToTiptap(tree)
  } catch (error) {
    console.warn('MDX 파싱 실패:', error)
    return createEmptyDocument()
  }
}

/**
 * 빈 Tiptap 문서를 생성합니다.
 */
function createEmptyDocument(): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
      },
    ],
  }
}

/**
 * MDAST 루트를 Tiptap JSON으로 변환합니다.
 */
function convertMdastToTiptap(root: Root): JSONContent {
  const content: JSONContent[] = []

  for (const child of root.children) {
    const converted = convertNode(child)
    if (converted) {
      content.push(converted)
    }
  }

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }
}


/**
 * MDAST 노드를 Tiptap JSON 노드로 변환합니다.
 */
function convertNode(node: Content): JSONContent | null {
  switch (node.type) {
    case 'paragraph': {
      return convertParagraph(node)
    }
    case 'heading': {
      return convertHeading(node)
    }
    case 'list': {
      return convertList(node)
    }
    case 'listItem': {
      return convertListItem(node)
    }
    case 'blockquote': {
      return convertBlockquote(node)
    }
    case 'code': {
      return convertCodeBlock(node)
    }
    case 'image': {
      return convertImage(node)
    }
    case 'thematicBreak': {
      return { type: 'horizontalRule' }
    }
    case 'table': {
      return convertTable(node)
    }
    case 'html': {
      return convertHtml(node)
    }
    default: {
      return null
    }
  }
}

/**
 * 문단을 변환합니다.
 * 문단 내에 이미지만 있는 경우 이미지 블록으로 변환합니다.
 */
function convertParagraph(node: {
  type: 'paragraph'
  children: PhrasingContent[]
}): JSONContent {
  // 문단 내에 이미지만 있는 경우 이미지 블록으로 변환
  if (
    node.children.length === 1 &&
    node.children[0].type === 'image'
  ) {
    const imageNode = node.children[0] as {
      type: 'image'
      url: string
      alt?: string | null
      title?: string | null
    }
    return convertImage(imageNode)
  }

  const content = convertInlineContent(node.children)

  return {
    type: 'paragraph',
    content: content.length > 0 ? content : undefined,
  }
}

/**
 * 제목을 변환합니다.
 */
function convertHeading(node: {
  type: 'heading'
  depth: 1 | 2 | 3 | 4 | 5 | 6
  children: PhrasingContent[]
}): JSONContent {
  const content = convertInlineContent(node.children)

  return {
    type: 'heading',
    attrs: { level: node.depth },
    content: content.length > 0 ? content : undefined,
  }
}

/**
 * 목록을 변환합니다.
 */
function convertList(node: {
  type: 'list'
  ordered?: boolean | null
  children: Array<{ type: 'listItem'; children: Content[] }>
}): JSONContent {
  const items = node.children
    .map((item) => convertListItem(item))
    .filter((item): item is JSONContent => item !== null)

  return {
    type: node.ordered ? 'orderedList' : 'bulletList',
    content: items,
  }
}

/**
 * 목록 항목을 변환합니다.
 */
function convertListItem(node: {
  type: 'listItem'
  children: Content[]
}): JSONContent {
  const content: JSONContent[] = []

  for (const child of node.children) {
    const converted = convertNode(child)
    if (converted) {
      content.push(converted)
    }
  }

  return {
    type: 'listItem',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }
}

/**
 * 인용문을 변환합니다.
 */
function convertBlockquote(node: {
  type: 'blockquote'
  children: Content[]
}): JSONContent {
  const content: JSONContent[] = []

  for (const child of node.children) {
    const converted = convertNode(child)
    if (converted) {
      content.push(converted)
    }
  }

  return {
    type: 'blockquote',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }
}

/**
 * 코드블록을 변환합니다.
 * 언어와 제목 메타데이터를 파싱합니다.
 */
function convertCodeBlock(node: {
  type: 'code'
  lang?: string | null
  meta?: string | null
  value: string
}): JSONContent {
  let language = node.lang || ''
  let meta = node.meta || ''

  // 언어 필드에 title이 포함된 경우 (언어 없이 title만 있는 경우)
  if (language.startsWith('title=')) {
    meta = language
    language = ''
  }

  const title = extractTitleFromMeta(meta)

  return {
    type: 'codeBlock',
    attrs: {
      language,
      title,
    },
    content: node.value ? [{ type: 'text', text: node.value }] : undefined,
  }
}

/**
 * 메타 문자열에서 title 속성을 추출합니다.
 */
function extractTitleFromMeta(meta: string): string {
  const match = meta.match(/title="([^"]*)"/)
  return match?.[1] || ''
}

/**
 * 이미지를 변환합니다.
 */
function convertImage(node: {
  type: 'image'
  url: string
  alt?: string | null
  title?: string | null
}): JSONContent {
  return {
    type: 'image',
    attrs: {
      src: node.url,
      alt: node.alt || '',
      title: node.title || '',
    },
  }
}


/**
 * 테이블을 변환합니다.
 */
function convertTable(node: {
  type: 'table'
  children: Array<{
    type: 'tableRow'
    children: Array<{
      type: 'tableCell'
      children: PhrasingContent[]
    }>
  }>
}): JSONContent {
  const rows: JSONContent[] = []

  for (let rowIndex = 0; rowIndex < node.children.length; rowIndex++) {
    const row = node.children[rowIndex]
    const cells: JSONContent[] = []
    const isHeaderRow = rowIndex === 0

    for (const cell of row.children) {
      const cellContent = convertInlineContent(cell.children)

      cells.push({
        type: isHeaderRow ? 'tableHeader' : 'tableCell',
        content: [
          {
            type: 'paragraph',
            content: cellContent.length > 0 ? cellContent : undefined,
          },
        ],
      })
    }

    rows.push({
      type: 'tableRow',
      content: cells,
    })
  }

  return {
    type: 'table',
    content: rows,
  }
}

/**
 * HTML을 변환합니다.
 * img 태그의 width/height 속성을 파싱합니다.
 */
function convertHtml(node: { type: 'html'; value: string }): JSONContent | null {
  const imgMatch = node.value.match(
    /<img\s+([^>]*)\/?\s*>/i,
  )

  if (imgMatch) {
    const attrs = imgMatch[1]
    const src = extractHtmlAttr(attrs, 'src')
    const alt = extractHtmlAttr(attrs, 'alt')
    const title = extractHtmlAttr(attrs, 'title')
    const width = extractHtmlAttr(attrs, 'width')
    const height = extractHtmlAttr(attrs, 'height')

    if (src) {
      return {
        type: 'image',
        attrs: {
          src,
          alt: alt || '',
          title: title || '',
          width: width ? Number.parseInt(width, 10) : null,
          height: height ? Number.parseInt(height, 10) : null,
        },
      }
    }
  }

  // 지원하지 않는 HTML은 무시
  return null
}

/**
 * HTML 속성 값을 추출합니다.
 */
function extractHtmlAttr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'))
  return match?.[1] || null
}

/**
 * 인라인 콘텐츠를 변환합니다.
 */
function convertInlineContent(children: PhrasingContent[]): JSONContent[] {
  const result: JSONContent[] = []

  for (const child of children) {
    const converted = convertInlineNode(child)
    if (converted) {
      result.push(...converted)
    }
  }

  return result
}

/**
 * 인라인 노드를 변환합니다.
 */
function convertInlineNode(node: PhrasingContent): JSONContent[] | null {
  switch (node.type) {
    case 'text': {
      return [{ type: 'text', text: node.value }]
    }
    case 'strong': {
      return convertMarkedText(node.children, { type: 'bold' })
    }
    case 'emphasis': {
      return convertMarkedText(node.children, { type: 'italic' })
    }
    case 'delete': {
      return convertMarkedText(node.children, { type: 'strike' })
    }
    case 'inlineCode': {
      return [{ type: 'text', text: node.value, marks: [{ type: 'code' }] }]
    }
    case 'link': {
      return convertLink(node)
    }
    case 'break': {
      return [{ type: 'hardBreak' }]
    }
    case 'html': {
      // 인라인 HTML (예: <u>...</u>)
      return convertInlineHtml(node.value)
    }
    default: {
      return null
    }
  }
}

/**
 * 마크가 적용된 텍스트를 변환합니다.
 */
function convertMarkedText(
  children: PhrasingContent[],
  mark: { type: string },
): JSONContent[] {
  const result: JSONContent[] = []

  for (const child of children) {
    const converted = convertInlineNode(child)
    if (converted) {
      for (const node of converted) {
        if (node.type === 'text') {
          const existingMarks = node.marks || []
          result.push({
            ...node,
            marks: [...existingMarks, mark],
          })
        } else {
          result.push(node)
        }
      }
    }
  }

  return result
}

/**
 * 링크를 변환합니다.
 */
function convertLink(node: {
  type: 'link'
  url: string
  title?: string | null
  children: PhrasingContent[]
}): JSONContent[] {
  const result: JSONContent[] = []
  const linkMark = {
    type: 'link',
    attrs: {
      href: node.url,
      title: node.title || null,
    },
  }

  for (const child of node.children) {
    const converted = convertInlineNode(child)
    if (converted) {
      for (const n of converted) {
        if (n.type === 'text') {
          const existingMarks = n.marks || []
          result.push({
            ...n,
            marks: [...existingMarks, linkMark],
          })
        } else {
          result.push(n)
        }
      }
    }
  }

  return result
}

/**
 * 인라인 HTML을 변환합니다.
 */
function convertInlineHtml(html: string): JSONContent[] | null {
  // <u>...</u> 태그 처리
  const underlineMatch = html.match(/<u>([^<]*)<\/u>/i)
  if (underlineMatch) {
    return [
      {
        type: 'text',
        text: underlineMatch[1],
        marks: [{ type: 'underline' }],
      },
    ]
  }

  return null
}
