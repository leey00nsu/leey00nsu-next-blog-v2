import path from 'node:path'
import { About, AboutMetaSchema } from '@/entities/about/model/types'
import { readMdxFile } from '@/shared/lib/mdx/reader'
import {
  buildAboutMdxAbsolutePath,
  buildAboutMdxAbsolutePathLocalized,
  LOCALES,
  type SupportedLocale,
} from '@/shared/config/constants'

export function getAbout(
  locale: SupportedLocale = LOCALES.DEFAULT,
): About | null {
  const localizedPath = path.join(
    process.cwd(),
    buildAboutMdxAbsolutePathLocalized(locale),
  )
  const result = readMdxFile(localizedPath)

  // fallback: 과거 단일 파일 또는 기본 로케일 파일
  const fallback =
    result ??
    readMdxFile(path.join(process.cwd(), buildAboutMdxAbsolutePath())) ??
    readMdxFile(
      path.join(
        process.cwd(),
        buildAboutMdxAbsolutePathLocalized(LOCALES.DEFAULT),
      ),
    )

  if (!fallback) return null

  const meta = AboutMetaSchema.parse(fallback.data)

  return {
    title: meta.title,
    description: meta.description,
    content: fallback.content,
  }
}
