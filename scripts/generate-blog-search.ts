import fs from 'node:fs/promises'
import path from 'node:path'
import { buildPostSearchRecords } from '@/entities/post/lib/post-search-records'
import { getAllPosts } from '@/entities/post/lib/post'
import type { GeneratedBlogSearchRecordMap } from '@/entities/post/model/search-types'
import { LOCALES, PATHS, type SupportedLocale } from '@/shared/config/constants'

const SEARCH_GENERATION = {
  GENERATED_OUTPUT_PATH: path.join(
    process.cwd(),
    'entities/post/config/blog-search-records.generated.ts',
  ),
  PAGEFIND_OUTPUT_PATH: path.join(
    process.cwd(),
    PATHS.FS.PUBLIC_DIR,
    'pagefind',
  ),
  TITLE_SEPARATOR: ' / ',
} as const

async function getPagefindModule() {
  return import('pagefind')
}

function serializeSearchRecords(
  generatedBlogSearchRecordMap: GeneratedBlogSearchRecordMap,
): string {
  const json = JSON.stringify(generatedBlogSearchRecordMap, null, 2)

  return `// 이 파일은 scripts/generate-blog-search.ts 스크립트에 의해 생성되었습니다.
// 직접 수정하지 마세요.

import { GeneratedBlogSearchRecordMap } from '@/entities/post/model/search-types'

export const GENERATED_BLOG_SEARCH_RECORDS = ${json} as const satisfies GeneratedBlogSearchRecordMap
`
}

function buildPagefindTitle(record: {
  title: string
  sectionTitle: string | null
}): string {
  if (!record.sectionTitle) {
    return record.title
  }

  return `${record.title}${SEARCH_GENERATION.TITLE_SEPARATOR}${record.sectionTitle}`
}

async function collectGeneratedBlogSearchRecordMap(): Promise<GeneratedBlogSearchRecordMap> {
  const generatedBlogSearchRecordMap = {} as GeneratedBlogSearchRecordMap

  for (const locale of LOCALES.SUPPORTED) {
    const posts = await getAllPosts(locale)
    generatedBlogSearchRecordMap[locale] = posts.flatMap((post) => {
      return buildPostSearchRecords({
        post,
        locale,
      })
    })
  }

  return generatedBlogSearchRecordMap
}

async function writeGeneratedBlogSearchRecords(
  generatedBlogSearchRecordMap: GeneratedBlogSearchRecordMap,
): Promise<void> {
  await fs.writeFile(
    SEARCH_GENERATION.GENERATED_OUTPUT_PATH,
    serializeSearchRecords(generatedBlogSearchRecordMap),
  )
}

async function writePagefindIndex(
  generatedBlogSearchRecordMap: GeneratedBlogSearchRecordMap,
): Promise<void> {
  await fs.rm(SEARCH_GENERATION.PAGEFIND_OUTPUT_PATH, {
    recursive: true,
    force: true,
  })

  const pagefind = await getPagefindModule()
  const { errors: createIndexErrors, index } = await pagefind.createIndex({
    writePlayground: false,
  })

  if (!index || createIndexErrors.length > 0) {
    throw new Error(
      `Failed to create Pagefind index: ${createIndexErrors.join(', ')}`,
    )
  }

  for (const locale of LOCALES.SUPPORTED) {
    const records = generatedBlogSearchRecordMap[locale]

    for (const record of records) {
      const { errors } = await index.addCustomRecord({
        url: record.url,
        content: record.content,
        language: locale,
        meta: {
          title: buildPagefindTitle(record),
          excerpt: record.excerpt,
          slug: record.slug,
          locale: record.locale,
          section: record.sectionTitle ?? '',
        },
        filters: {
          locale: [record.locale],
          tags: record.tags,
        },
      })

      if (errors.length > 0) {
        throw new Error(
          `Failed to add Pagefind record for ${record.id}: ${errors.join(', ')}`,
        )
      }
    }
  }

  const { errors: writeErrors } = await index.writeFiles({
    outputPath: SEARCH_GENERATION.PAGEFIND_OUTPUT_PATH,
  })

  if (writeErrors.length > 0) {
    throw new Error(
      `Failed to write Pagefind files: ${writeErrors.join(', ')}`,
    )
  }

  await index.deleteIndex()
  await pagefind.close()
}

async function main(): Promise<void> {
  const generatedBlogSearchRecordMap = await collectGeneratedBlogSearchRecordMap()

  await writeGeneratedBlogSearchRecords(generatedBlogSearchRecordMap)
  await writePagefindIndex(generatedBlogSearchRecordMap)

  const totalRecordCount = LOCALES.SUPPORTED.reduce((count, locale) => {
    return count + generatedBlogSearchRecordMap[locale].length
  }, 0)

  console.log(`✅ Generated ${totalRecordCount} blog search record(s).`)
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void (async () => {
  try {
    await main()
  } catch (error) {
    const pagefind = await getPagefindModule().catch(() => null)
    await pagefind?.close().catch(() => {})
    console.error('Failed to generate blog search assets:', error)
    process.exitCode = 1
  }
})()
