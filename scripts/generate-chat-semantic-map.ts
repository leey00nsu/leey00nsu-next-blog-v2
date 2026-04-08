import fs from 'node:fs/promises'
import path from 'node:path'
import { getAbout } from '@/entities/about/lib/about'
import { getAllPosts } from '@/entities/post/lib/post'
import { getAllProjects } from '@/entities/project/lib/project'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'
import {
  buildPostChatSemanticEntry,
  buildProfileChatSemanticEntry,
  buildProjectChatSemanticEntry,
} from '@/shared/lib/chat-semantic-map'
import type { GeneratedChatSemanticMap } from '@/shared/model/chat-semantic-map'

const OUTPUT_PATH = path.join(
  process.cwd(),
  'shared/config/chat-semantic-map.generated.ts',
)

function serializeSemanticMap(
  generatedChatSemanticMap: GeneratedChatSemanticMap,
): string {
  const json = JSON.stringify(generatedChatSemanticMap, null, 2)

  return `// 이 파일은 scripts/generate-chat-semantic-map.ts 스크립트에 의해 생성되었습니다.
// 직접 수정하지 마세요.

import { GeneratedChatSemanticMap } from '@/shared/model/chat-semantic-map'

export const GENERATED_CHAT_SEMANTIC_MAP = ${json} as const satisfies GeneratedChatSemanticMap
`
}

async function collectGeneratedChatSemanticMap(): Promise<GeneratedChatSemanticMap> {
  const generatedChatSemanticMap = {} as GeneratedChatSemanticMap

  for (const locale of LOCALES.SUPPORTED) {
    const semanticEntries = []
    const about = getAbout(locale)
    const projects = await getAllProjects(locale)
    const posts = await getAllPosts(locale)

    if (about) {
      semanticEntries.push(
        buildProfileChatSemanticEntry({
          locale,
          slug: 'about',
          title: about.title,
          description: about.description,
          content: about.content,
        }),
      )
    }

    for (const project of projects) {
      semanticEntries.push(
        buildProjectChatSemanticEntry({
          locale,
          slug: project.slug,
          title: project.title,
          summary: project.summary,
          keyFeatures: project.keyFeatures,
          techStacks: project.techStacks,
        }),
      )
    }

    for (const post of posts) {
      semanticEntries.push(
        buildPostChatSemanticEntry({
          locale,
          slug: post.slug,
          title: post.title,
          description: post.description,
          tags: post.tags,
        }),
      )
    }

    generatedChatSemanticMap[locale] = semanticEntries
  }

  return generatedChatSemanticMap
}

async function main(): Promise<void> {
  const generatedChatSemanticMap = await collectGeneratedChatSemanticMap()

  await fs.writeFile(
    OUTPUT_PATH,
    serializeSemanticMap(generatedChatSemanticMap),
  )

  const totalEntryCount = LOCALES.SUPPORTED.reduce((count, locale) => {
    return count + generatedChatSemanticMap[locale].length
  }, 0)

  console.log(`✅ Generated ${totalEntryCount} chat semantic entr${totalEntryCount === 1 ? 'y' : 'ies'}.`)
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void (async () => {
  try {
    await main()
  } catch (error) {
    console.error('Failed to generate chat semantic map:', error)
    process.exitCode = 1
  }
})()
