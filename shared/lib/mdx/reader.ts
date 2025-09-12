import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { SupportedLocale } from '@/shared/config/constants'

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

export function readLocalizedMdxFromDir(
  rootDir: string,
  slugOrBaseDir: string,
  baseName: string,
  locale: SupportedLocale,
  fallbackLocale?: SupportedLocale,
): MdxReadResult | null {
  // 1) 우선 locale 파일 시도: {baseName}.{locale}.mdx
  const localized = path.join(rootDir, slugOrBaseDir, `${baseName}.${locale}.mdx`)
  const res1 = readMdxFile(localized)
  if (res1) return res1

  // 2) fallback locale 지정 시 시도
  if (fallbackLocale) {
    const fallback = path.join(
      rootDir,
      slugOrBaseDir,
      `${baseName}.${fallbackLocale}.mdx`,
    )
    const res2 = readMdxFile(fallback)
    if (res2) return res2
  }

  // 3) 최종 기본 파일명(과거 형식) 시도: {baseName}.mdx
  const legacy = path.join(rootDir, slugOrBaseDir, `${baseName}.mdx`)
  return readMdxFile(legacy)
}
