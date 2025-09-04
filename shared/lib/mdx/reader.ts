import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

export interface MdxReadResult {
  data: unknown
  content: string
}

export function readMdxFile(filePath: string): MdxReadResult | null {
  if (!fs.existsSync(filePath)) return null
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)
  return { data, content }
}

export function readMdxFromDir(
  rootDir: string,
  slug: string,
  fileName?: string,
): MdxReadResult | null {
  const name = fileName ?? `${slug}.mdx`
  const fullPath = path.join(rootDir, slug, name)
  return readMdxFile(fullPath)
}
