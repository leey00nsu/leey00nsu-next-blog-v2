import fs from 'node:fs/promises'
import fssync from 'node:fs'
import path from 'node:path'
import lqipModern from 'lqip-modern'
import { PATHS, LOCALES } from '@/shared/config/constants'
import { readLocalizedMdxFromDir } from '@/shared/lib/mdx/reader'
import {
  ThumbnailMetadata,
  ThumbnailMetadataMap,
} from '@/entities/post/model/types'

const OUTPUT_PATH = path.join(
  process.cwd(),
  'entities/post/config/thumbnail-metadata.generated.ts',
)

async function ensureDirExists(filePath: string): Promise<void> {
  const dir = path.dirname(filePath)
  if (!fssync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
}

async function readThumbnailMetadata(
  thumbnailPath: string,
): Promise<ThumbnailMetadata | null> {
  const normalizedRelativePath = thumbnailPath.replace(/^\/+/, '')
  const absolutePath = path.join(process.cwd(), normalizedRelativePath)

  if (!fssync.existsSync(absolutePath)) {
    console.warn(`⚠️  Thumbnail not found: ${thumbnailPath}`)
    return null
  }

  const imageBuffer = await fs.readFile(absolutePath)
  const { metadata } = await lqipModern(imageBuffer)

  if (!metadata) {
    return null
  }

  return {
    width: metadata.originalWidth ?? 0,
    height: metadata.originalHeight ?? 0,
    base64: metadata.dataURIBase64 ?? '',
  }
}

async function collectThumbnailMetadata(): Promise<ThumbnailMetadataMap> {
  const postsDir = path.join(process.cwd(), PATHS.FS.PUBLIC_POSTS_DIR)
  const entries: ThumbnailMetadataMap = {}

  if (!fssync.existsSync(postsDir)) {
    return entries
  }

  const dirents = await fs.readdir(postsDir, { withFileTypes: true })

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue

    const slug = dirent.name
    const mdx = readLocalizedMdxFromDir(
      postsDir,
      slug,
      slug,
      LOCALES.DEFAULT,
      LOCALES.DEFAULT,
    )

    if (!mdx) continue

    const data = mdx.data as { thumbnail?: string | null }
    const thumbnailPath = data.thumbnail
    if (!thumbnailPath) continue

    if (entries[thumbnailPath]) continue

    const metadata = await readThumbnailMetadata(thumbnailPath)
    if (!metadata) continue

    entries[thumbnailPath] = metadata
  }

  return entries
}

function serializeMetadata(entries: ThumbnailMetadataMap): string {
  const sortedEntries = Object.entries(entries).sort(([a], [b]) =>
    a.localeCompare(b),
  )
  const json = JSON.stringify(Object.fromEntries(sortedEntries), null, 2)

  return `// 이 파일은 scripts/generate-thumbnail-metadata.ts 스크립트에 의해 생성되었습니다.
// 직접 수정하지 마세요.

import { ThumbnailMetadataMap } from '@/entities/post/model/types'

export const THUMBNAIL_METADATA_MAP = ${json} as const satisfies ThumbnailMetadataMap
`
}

async function main(): Promise<void> {
  const entries = await collectThumbnailMetadata()
  const fileContent = serializeMetadata(entries)
  await ensureDirExists(OUTPUT_PATH)
  await fs.writeFile(OUTPUT_PATH, fileContent)
  console.log(
    `✅ Generated thumbnail metadata for ${Object.keys(entries).length} image(s).`,
  )
}

// CJS 환경에서도 동작하도록 top-level await을 피합니다.
// eslint-disable-next-line unicorn/prefer-top-level-await
void (async () => {
  try {
    await main()
  } catch (error) {
    console.error(error)
  }
})()
