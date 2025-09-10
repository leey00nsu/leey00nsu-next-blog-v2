import path from 'node:path'
import { About, AboutMetaSchema } from '@/entities/about/model/types'
import { readMdxFile } from '@/shared/lib/mdx/reader'
import { PATHS } from '@/shared/config/constants'

const ABOUT_PATH = path.join(process.cwd(), PATHS.FS.ABOUT_MDX_PATH)

export function getAbout(): About | null {
  const result = readMdxFile(ABOUT_PATH)
  if (!result) return null

  const meta = AboutMetaSchema.parse(result.data)

  return {
    title: meta.title,
    description: meta.description,
    content: result.content,
  }
}
