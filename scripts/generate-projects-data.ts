import fs from 'node:fs/promises'
import fssync from 'node:fs'
import path from 'node:path'
import { PATHS, LOCALES, type SupportedLocale } from '@/shared/config/constants'
import { readLocalizedMdxFromDir } from '@/shared/lib/mdx/reader'
import {
  GeneratedProjectSerialized,
  GeneratedProjectsMap,
  ProjectMetaDataSchema,
} from '@/entities/project/model/types'
import { THUMBNAIL_METADATA_MAP } from '@/entities/post/config/thumbnail-metadata.generated'
import { ThumbnailMetadata } from '@/entities/post/model/types'

const OUTPUT_PATH = path.join(
  process.cwd(),
  'entities/project/config/projects.generated.ts',
)

async function ensureDirExists(filePath: string): Promise<void> {
  const dir = path.dirname(filePath)
  if (!fssync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
}

const THUMBNAIL_METADATA_LOOKUP = THUMBNAIL_METADATA_MAP as Record<
  string,
  ThumbnailMetadata
>

function resolveThumbnailMetadata(
  thumbnailPath: string | null,
): ThumbnailMetadata | null {
  if (!thumbnailPath) {
    return null
  }

  return THUMBNAIL_METADATA_LOOKUP[thumbnailPath] ?? null
}

function mapFrontmatterToProject(
  rawData: Record<string, unknown>,
  content: string,
): GeneratedProjectSerialized {
  const frontmatter = ProjectMetaDataSchema.parse(rawData)
  const thumbnailMetadata = resolveThumbnailMetadata(frontmatter.thumbnail ?? null)

  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    summary: frontmatter.summary,
    period: {
      start: frontmatter.period.start,
      end: frontmatter.period.end ?? null,
    },
    techStacks: frontmatter.techStacks,
    thumbnail: frontmatter.thumbnail ?? null,
    draft: frontmatter.draft ?? false,
    type: frontmatter.type,
    content,
    width: thumbnailMetadata?.width ?? 0,
    height: thumbnailMetadata?.height ?? 0,
  }
}

function readProject(
  projectsDir: string,
  slug: string,
  locale: SupportedLocale,
  fallbackLocale: SupportedLocale,
): GeneratedProjectSerialized | null {
  const mdx = readLocalizedMdxFromDir(
    projectsDir,
    slug,
    slug,
    locale,
    fallbackLocale,
  )

  if (!mdx) return null

  const rawData = mdx.data as Record<string, unknown>
  return mapFrontmatterToProject(rawData, mdx.content)
}

async function collectProjects(): Promise<GeneratedProjectsMap> {
  const projectsDir = path.join(process.cwd(), PATHS.FS.PUBLIC_PROJECTS_DIR)
  const slugs: string[] = fssync.existsSync(projectsDir)
    ? (await fs.readdir(projectsDir, { withFileTypes: true }))
        // eslint-disable-next-line unicorn/no-await-expression-member
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
    : []

  const entries = {} as GeneratedProjectsMap

  for (const locale of LOCALES.SUPPORTED) {
    const localeEntries: Record<string, GeneratedProjectSerialized> = {}

    for (const slug of slugs) {
      const project = readProject(projectsDir, slug, locale, LOCALES.DEFAULT)
      if (!project) continue
      localeEntries[slug] = project
    }

    entries[locale] = localeEntries
  }

  return entries
}

function serialize(entries: GeneratedProjectsMap): string {
  const orderedLocales = [...LOCALES.SUPPORTED]

  const sortedEntries = Object.fromEntries(
    orderedLocales.map((locale) => {
      const localeEntries = entries[locale]
      const sorted = Object.fromEntries(
        Object.keys(localeEntries ?? {})
          .sort((a, b) => a.localeCompare(b))
          .map((slug) => [slug, localeEntries[slug]]),
      ) as Record<string, GeneratedProjectSerialized>
      return [locale, sorted]
    }),
  ) as GeneratedProjectsMap

  const json = JSON.stringify(sortedEntries, null, 2)

  return `// 이 파일은 scripts/generate-projects-data.ts 스크립트에 의해 생성되었습니다.\n// 직접 수정하지 마세요.\n\nimport { GeneratedProjectsMap } from '@/entities/project/model/types'\n\nexport const GENERATED_PROJECTS = ${json} as const satisfies GeneratedProjectsMap\n`
}

async function main(): Promise<void> {
  const entries = await collectProjects()
  const content = serialize(entries)
  await ensureDirExists(OUTPUT_PATH)
  await fs.writeFile(OUTPUT_PATH, content)

  let totalCount = 0
  for (const locale of LOCALES.SUPPORTED) {
    totalCount += Object.keys(entries[locale] ?? {}).length
  }

  console.log(`✅ Generated project data for ${totalCount} project(s).`)
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void (async () => {
  try {
    await main()
  } catch (error) {
    console.error('Failed to generate project data:', error)
    process.exitCode = 1
  }
})()
