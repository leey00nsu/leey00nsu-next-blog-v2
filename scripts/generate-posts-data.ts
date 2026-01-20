import fs from 'node:fs/promises'
import fssync from 'node:fs'
import path from 'node:path'
import { PATHS, LOCALES, type SupportedLocale } from '@/shared/config/constants'
import { readLocalizedMdxFromDir } from '@/shared/lib/mdx/reader'
import {
  GeneratedPostSerialized,
  GeneratedPostsMap,
  PostMetaDataSchema,
  ThumbnailMetadata,
} from '@/entities/post/model/types'
import { THUMBNAIL_METADATA_MAP } from '@/entities/post/config/thumbnail-metadata.generated'

const OUTPUT_PATH = path.join(
  process.cwd(),
  'entities/post/config/posts.generated.ts',
)

const THUMBNAIL_METADATA_LOOKUP = THUMBNAIL_METADATA_MAP as Record<
  string,
  ThumbnailMetadata
>

async function ensureDirExists(filePath: string): Promise<void> {
  const dir = path.dirname(filePath)
  if (!fssync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
}

function resolveThumbnailMetadata(
  thumbnailPath: string | null,
): ThumbnailMetadata | null {
  if (!thumbnailPath) {
    return null
  }

  return THUMBNAIL_METADATA_LOOKUP[thumbnailPath] ?? null
}

async function readPost(
  postsDir: string,
  slug: string,
  locale: SupportedLocale,
  fallbackLocale: SupportedLocale,
): Promise<GeneratedPostSerialized | null> {
  const mdx = readLocalizedMdxFromDir(
    postsDir,
    slug,
    slug,
    locale,
    fallbackLocale,
  )

  if (!mdx) return null

  const rawData = mdx.data as Record<string, unknown>
  const thumbnail = (rawData.thumbnail as string | null | undefined) ?? null
  const thumbnailMetadata = resolveThumbnailMetadata(thumbnail)

  const frontmatter = PostMetaDataSchema.parse({
    ...rawData,
    blurDataURL: (rawData.blurDataURL as string | undefined) ?? undefined,
  })

  const hasThumbnailMetadata = Boolean(
    frontmatter.thumbnail && thumbnailMetadata,
  )

  const resolvedBlurDataURL = hasThumbnailMetadata
    ? (thumbnailMetadata?.base64 ?? frontmatter.blurDataURL ?? undefined)
    : undefined

  return {
    slug: frontmatter.slug,
    date: frontmatter.date.toISOString(),
    title: frontmatter.title,
    description: frontmatter.description,
    tags: frontmatter.tags,
    section: frontmatter.section,
    series: frontmatter.series,
    thumbnail: hasThumbnailMetadata ? frontmatter.thumbnail : null,
    draft: frontmatter.draft,
    blurDataURL: resolvedBlurDataURL,
    writer: frontmatter.writer,
    content: mdx.content,
    width: thumbnailMetadata?.width ?? 0,
    height: thumbnailMetadata?.height ?? 0,
    isAnimated: thumbnailMetadata?.isAnimated ?? false,
  }
}

async function collectPosts(): Promise<GeneratedPostsMap> {
  const postsDir = path.join(process.cwd(), PATHS.FS.PUBLIC_POSTS_DIR)
  const slugs: string[] = fssync.existsSync(postsDir)
    ? (await fs.readdir(postsDir, { withFileTypes: true }))
        // eslint-disable-next-line unicorn/no-await-expression-member
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
    : []

  const entries = {} as GeneratedPostsMap

  for (const locale of LOCALES.SUPPORTED) {
    const localeEntries: Record<string, GeneratedPostSerialized> = {}

    for (const slug of slugs) {
      const post = await readPost(postsDir, slug, locale, LOCALES.DEFAULT)
      if (!post) continue
      localeEntries[slug] = post
    }

    entries[locale] = localeEntries
  }

  return entries
}

function serialize(entries: GeneratedPostsMap): string {
  const orderedLocales = [...LOCALES.SUPPORTED]

  const sortedEntries = Object.fromEntries(
    orderedLocales.map((locale) => {
      const localeEntries = entries[locale]
      const sorted = Object.fromEntries(
        Object.keys(localeEntries ?? {})
          .sort((a, b) => a.localeCompare(b))
          .map((slug) => [slug, localeEntries[slug]]),
      ) as Record<string, GeneratedPostSerialized>
      return [locale, sorted]
    }),
  ) as GeneratedPostsMap

  const json = JSON.stringify(sortedEntries, null, 2)

  return `// 이 파일은 scripts/generate-posts-data.ts 스크립트에 의해 생성되었습니다.
// 직접 수정하지 마세요.

import { GeneratedPostsMap } from '@/entities/post/model/types'

export const GENERATED_POSTS = ${json} as const satisfies GeneratedPostsMap
`
}

async function main(): Promise<void> {
  const entries = await collectPosts()
  const content = serialize(entries)
  await ensureDirExists(OUTPUT_PATH)
  await fs.writeFile(OUTPUT_PATH, content)

  let totalCount = 0
  for (const locale of LOCALES.SUPPORTED) {
    totalCount += Object.keys(entries[locale] ?? {}).length
  }

  console.log(`✅ Generated post data for ${totalCount} post(s).`)
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void (async () => {
  try {
    await main()
  } catch (error) {
    console.error('Failed to generate post data:', error)
    process.exitCode = 1
  }
})()
