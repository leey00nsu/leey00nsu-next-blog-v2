import fs from 'node:fs/promises'
import path from 'node:path'
import { buildPostSearchRecords } from '@/entities/post/lib/post-search-records'
import { getAllPosts } from '@/entities/post/lib/post'
import type { GeneratedBlogSearchRecordMap } from '@/entities/post/model/search-types'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'

const SEARCH_GENERATION = {
  GENERATED_OUTPUT_PATH: path.join(
    process.cwd(),
    'entities/post/config/blog-search-records.generated.ts',
  ),
} as const

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

async function main(): Promise<void> {
  const generatedBlogSearchRecordMap = await collectGeneratedBlogSearchRecordMap()

  await writeGeneratedBlogSearchRecords(generatedBlogSearchRecordMap)

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
    console.error('Failed to generate blog search assets:', error)
    process.exitCode = 1
  }
})()
