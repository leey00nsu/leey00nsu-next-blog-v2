/**
 * MDX 직렬화 모듈
 *
 * Tiptap JSON 문서를 MDX 문자열로 변환합니다.
 * 코드블록의 언어/제목 메타데이터와 이미지 속성을 보존합니다.
 */

import type { JSONContent } from '@tiptap/react'

interface SerializerOptions {
  /** 들여쓰기 문자열 (기본: 빈 문자열) */
  indent?: string
}

/**
 * Tiptap JSON 문서를 MDX 문자열로 직렬화합니다.
 *
 * @param document - Tiptap JSON 문서
 * @param options - 직렬화 옵션
 * @returns MDX 문자열
 */
export function serializeToMdx(
  document: JSONContent,
  options: SerializerOptions = {},
): string {
  const { indent = '' } = options

  if (!document.content) {
    return ''
  }

  const lines: string[] = []

  for (const node of document.content) {
    const serialized = serializeNode(node, indent)
    if (serialized !== null) {
      lines.push(serialized)
    }
  }

  return lines.join('\n\n')
}

/**
 * 단일 노드를 MDX 문자열로 직렬화합니다.
 */
function serializeNode(node: JSONContent, indent: string): string | null {
  switch (node.type) {
    case 'paragraph': {
      return serializeParagraph(node, indent)
    }
    case 'heading': {
      return serializeHeading(node, indent)
    }
    case 'bulletList': {
      return serializeBulletList(node, indent)
    }
    case 'orderedList': {
      return serializeOrderedList(node, indent)
    }
    case 'listItem': {
      return serializeListItem(node, indent)
    }
    case 'blockquote': {
      return serializeBlockquote(node, indent)
    }
    case 'codeBlock': {
      return serializeCodeBlock(node, indent)
    }
    case 'image': {
      return serializeImage(node, indent)
    }
    case 'horizontalRule': {
      return `${indent}---`
    }
    case 'table': {
      return serializeTable(node, indent)
    }
    case 'hardBreak': {
      return '\n'
    }
    default: {
      return null
    }
  }
}

/**
 * 문단 노드를 직렬화합니다.
 */
function serializeParagraph(node: JSONContent, indent: string): string {
  const content = serializeInlineContent(node.content)
  return `${indent}${content}`
}

/**
 * 제목 노드를 직렬화합니다.
 */
function serializeHeading(node: JSONContent, indent: string): string {
  const level = (node.attrs?.level as number) || 1
  const prefix = '#'.repeat(level)
  const content = serializeInlineContent(node.content)
  return `${indent}${prefix} ${content}`
}

/**
 * 순서 없는 목록을 직렬화합니다.
 */
function serializeBulletList(node: JSONContent, indent: string): string {
  if (!node.content) return ''

  const items = node.content
    .map((item) => serializeListItem(item, indent, '-'))
    .filter(Boolean)

  return items.join('\n')
}

/**
 * 순서 있는 목록을 직렬화합니다.
 */
function serializeOrderedList(node: JSONContent, indent: string): string {
  if (!node.content) return ''

  const items = node.content
    .map((item, index) => serializeListItem(item, indent, `${index + 1}.`))
    .filter(Boolean)

  return items.join('\n')
}

/**
 * 목록 항목을 직렬화합니다.
 */
function serializeListItem(
  node: JSONContent,
  indent: string,
  marker: string = '-',
): string {
  if (!node.content) return ''

  const lines: string[] = []
  const childIndent = indent + '  '

  for (let i = 0; i < node.content.length; i++) {
    const child = node.content[i]
    if (i === 0 && child.type === 'paragraph') {
      // 첫 번째 문단은 마커와 함께
      const content = serializeInlineContent(child.content)
      lines.push(`${indent}${marker} ${content}`)
    } else {
      // 나머지는 들여쓰기
      const serialized = serializeNode(child, childIndent)
      if (serialized) {
        lines.push(serialized)
      }
    }
  }

  return lines.join('\n')
}

/**
 * 인용문을 직렬화합니다.
 */
function serializeBlockquote(node: JSONContent, indent: string): string {
  if (!node.content) return `${indent}>`

  const lines: string[] = []

  for (const child of node.content) {
    if (child.type === 'paragraph') {
      const content = serializeInlineContent(child.content)
      lines.push(`${indent}> ${content}`)
    } else {
      const serialized = serializeNode(child, indent + '> ')
      if (serialized) {
        lines.push(serialized)
      }
    }
  }

  return lines.join('\n')
}


/**
 * 코드블록을 직렬화합니다.
 * 언어와 제목 메타데이터를 보존합니다.
 */
function serializeCodeBlock(node: JSONContent, indent: string): string {
  const language = (node.attrs?.language as string) || ''
  const title = ((node.attrs?.title as string) || '').trim()
  const code = node.content?.[0]?.text || ''

  // 메타 문자열 구성
  // 언어가 없을 때는 'text'를 사용하여 rehype-pretty-code가 메타를 올바르게 파싱하도록 함
  const effectiveLanguage = language || 'text'
  let meta = effectiveLanguage
  if (title) {
    meta = `${meta} title="${title}"`
  }

  const lines = [
    `${indent}\`\`\`${meta}`,
    code,
    `${indent}\`\`\``,
  ]

  return lines.join('\n')
}

/**
 * 이미지를 직렬화합니다.
 * src, alt, width, height 속성을 보존합니다.
 */
function serializeImage(node: JSONContent, indent: string): string {
  const src = (node.attrs?.src as string) || ''
  const alt = (node.attrs?.alt as string) || ''
  const title = (node.attrs?.title as string) || ''
  const width = node.attrs?.width as number | null
  const height = node.attrs?.height as number | null

  // 기본 마크다운 이미지 문법
  let result = `${indent}![${alt}](${src}`

  if (title) {
    result += ` "${title}"`
  }

  result += ')'

  // width/height가 있으면 HTML img 태그로 변환
  if (width || height) {
    const attrs: string[] = [`src="${src}"`, `alt="${alt}"`]
    if (width) attrs.push(`width="${width}"`)
    if (height) attrs.push(`height="${height}"`)
    if (title) attrs.push(`title="${title}"`)

    result = `${indent}<img ${attrs.join(' ')} />`
  }

  return result
}

/**
 * 테이블을 직렬화합니다.
 */
function serializeTable(node: JSONContent, indent: string): string {
  if (!node.content) return ''

  const rows: string[][] = []
  let headerRowIndex = -1

  for (let rowIndex = 0; rowIndex < node.content.length; rowIndex++) {
    const row = node.content[rowIndex]
    if (row.type !== 'tableRow' || !row.content) continue

    const cells: string[] = []
    let isHeaderRow = false

    for (const cell of row.content) {
      if (cell.type === 'tableHeader') {
        isHeaderRow = true
      }
      const cellContent = cell.content
        ?.map((p) => serializeInlineContent(p.content))
        .join(' ')
      cells.push(cellContent || '')
    }

    if (isHeaderRow && headerRowIndex === -1) {
      headerRowIndex = rows.length
    }

    rows.push(cells)
  }

  if (rows.length === 0) return ''

  const lines: string[] = []
  const columnCount = Math.max(...rows.map((r) => r.length))

  for (const [index, row] of rows.entries()) {
    // 셀 수를 맞춤
    while (row.length < columnCount) {
      row.push('')
    }

    const line = `${indent}| ${row.join(' | ')} |`
    lines.push(line)

    // 헤더 행 다음에 구분선 추가
    if (index === headerRowIndex) {
      const separator = `${indent}| ${row.map(() => '---').join(' | ')} |`
      lines.push(separator)
    }
  }

  // 헤더가 없으면 첫 행 다음에 구분선 추가
  if (headerRowIndex === -1 && rows.length > 0) {
    const separator = `${indent}| ${rows[0].map(() => '---').join(' | ')} |`
    lines.splice(1, 0, separator)
  }

  return lines.join('\n')
}

/**
 * 인라인 콘텐츠를 직렬화합니다.
 */
function serializeInlineContent(content?: JSONContent[]): string {
  if (!content) return ''

  return content.map((node) => serializeInlineNode(node)).join('')
}

/**
 * 인라인 노드를 직렬화합니다.
 */
function serializeInlineNode(node: JSONContent): string {
  if (node.type === 'text') {
    return serializeTextNode(node)
  }

  if (node.type === 'hardBreak') {
    return '  \n'
  }

  return ''
}

/**
 * 텍스트 노드를 마크와 함께 직렬화합니다.
 */
function serializeTextNode(node: JSONContent): string {
  let text = node.text || ''
  const marks = node.marks || []

  // 마크 적용 (안쪽에서 바깥쪽 순서로)
  for (const mark of marks) {
    text = applyMark(text, mark)
  }

  return text
}

/**
 * 마크를 텍스트에 적용합니다.
 */
function applyMark(
  text: string,
  mark: { type: string; attrs?: Record<string, unknown> },
): string {
  switch (mark.type) {
    case 'bold': {
      return `**${text}**`
    }
    case 'italic': {
      return `*${text}*`
    }
    case 'underline': {
      return `<u>${text}</u>`
    }
    case 'strike': {
      return `~~${text}~~`
    }
    case 'code': {
      return `\`${text}\``
    }
    case 'link': {
      const href = (mark.attrs?.href as string) || ''
      const title = mark.attrs?.title as string | undefined
      if (title) {
        return `[${text}](${href} "${title}")`
      }
      return `[${text}](${href})`
    }
    default: {
      return text
    }
  }
}
