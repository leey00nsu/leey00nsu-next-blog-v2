import type { MetadataRoute } from 'next'
import { LOCALES } from '@/shared/config/constants'
import { getSiteUrl } from '@/shared/config/site-url'

const ROBOTS_DISALLOW_PATHS = ['/api', '/studio', '/auth', '/print']

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  const origin = siteUrl.origin
  const localizedDisallowPaths = LOCALES.SUPPORTED.flatMap((locale) =>
    ROBOTS_DISALLOW_PATHS.map((path) => `/${locale}${path}`),
  )

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...ROBOTS_DISALLOW_PATHS, ...localizedDisallowPaths],
      },
    ],
    host: origin,
    sitemap: `${origin}/sitemap.xml`,
  }
}
