import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/entities/post/lib/post'
import { getAllProjects } from '@/entities/project/lib/project'
import { ROUTES } from '@/shared/config/constants'

const getBaseUrl = () => {
  const raw = process.env.AUTH_URL ?? 'http://localhost:3000'
  try {
    return new URL(raw)
  } catch {
    return new URL('http://localhost:3000')
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl()
  const toAbs = (path: string) => new URL(path, base).toString()

  const now = new Date()

  // 정적 경로
  const entries: MetadataRoute.Sitemap = [
    {
      url: toAbs('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: toAbs(ROUTES.BLOG),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: toAbs(ROUTES.ABOUT),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // 블로그 포스트 동적 경로
  const posts = await getAllPosts()
  for (const post of posts) {
    entries.push({
      url: toAbs(`${ROUTES.BLOG}/${post.slug}`),
      lastModified: new Date(post.date),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  const projects = await getAllProjects()
  for (const project of projects) {
    const periodForModified = project.period.end ?? project.period.start
    const periodIso = periodForModified
      ? `${periodForModified}${periodForModified.length === 7 ? '-01' : ''}`
      : null
    const lastModified = periodIso ? new Date(periodIso) : now

    entries.push({
      url: toAbs(`${ROUTES.PROJECTS}/${project.slug}`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  return entries
}
