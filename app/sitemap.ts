import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/entities/post/lib/post'
import { getAllProjects } from '@/entities/project/lib/project'
import {
  LOCALES,
  ROUTES,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'
import { getSiteUrl } from '@/shared/config/site-url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const toAbs = (path: string) => new URL(path, base).toString()

  const now = new Date()

  // 로케일별 정적 경로
  const entries: MetadataRoute.Sitemap = []
  for (const locale of LOCALES.SUPPORTED) {
    entries.push(
      {
        url: toAbs(buildLocalizedRoutePath(ROUTES.BLOG, locale)),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: toAbs(buildLocalizedRoutePath(ROUTES.ABOUT, locale)),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
      },
    )
  }

  // 블로그 포스트 동적 경로 (로케일별)
  for (const locale of LOCALES.SUPPORTED) {
    const posts = await getAllPosts(locale)
    for (const post of posts) {
      entries.push({
        url: toAbs(
          buildLocalizedRoutePath(`${ROUTES.BLOG}/${post.slug}`, locale),
        ),
        lastModified: new Date(post.date),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  // 프로젝트 상세 동적 경로 (로케일별)
  for (const locale of LOCALES.SUPPORTED) {
    const projects = await getAllProjects(locale)
    for (const project of projects) {
      const periodForModified = project.period.end ?? project.period.start
      const periodIso = periodForModified
        ? `${periodForModified}${periodForModified.length === 7 ? '-01' : ''}`
        : null
      const lastModified = periodIso ? new Date(periodIso) : now

      entries.push({
        url: toAbs(
          buildLocalizedRoutePath(`${ROUTES.PROJECTS}/${project.slug}`, locale),
        ),
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  }

  return entries
}
