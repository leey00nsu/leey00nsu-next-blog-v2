import type { MetadataRoute } from 'next'

const getBaseOrigin = () => {
  const raw = process.env.AUTH_URL ?? 'http://localhost:3000'
  try {
    return new URL(raw).origin
  } catch {
    return 'http://localhost:3000'
  }
}

export default function robots(): MetadataRoute.Robots {
  const origin = getBaseOrigin()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api', '/studio', '/auth'],
      },
    ],
    host: origin,
    sitemap: `${origin}/sitemap.xml`,
  }
}
