import { splitMarkdownBlocks } from './split-markdown-blocks'

export function splitBoundedMarkdownContent(
  content: string,
  maximumCharacters: number,
): string[] {
  if (!Number.isInteger(maximumCharacters) || maximumCharacters < 1) {
    throw new RangeError('maximumCharacters must be a positive integer')
  }
  const chunks: string[] = []
  let current = ''
  for (const block of splitMarkdownBlocks(content)) {
    const combined = current ? `${current}\n\n${block}` : block
    if (combined.length <= maximumCharacters) {
      current = combined
      continue
    }
    if (current) chunks.push(current)
    current = ''
    let remainder = block
    while (remainder.length > maximumCharacters) {
      const window = remainder.slice(0, maximumCharacters)
      const lineBoundary = window.lastIndexOf('\n')
      const whitespaceBoundary = window.lastIndexOf(' ')
      const boundary =
        lineBoundary > 0
          ? lineBoundary
          : whitespaceBoundary > 0
            ? whitespaceBoundary
            : maximumCharacters
      chunks.push(remainder.slice(0, boundary))
      remainder = remainder.slice(boundary).trimStart()
    }
    current = remainder
  }
  if (current) chunks.push(current)
  return chunks
}
