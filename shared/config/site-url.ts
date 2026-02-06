const SITE_URL_DEFAULT = 'https://leey00nsu.com'

function normalizeSiteUrl(rawSiteUrl: string): URL {
  try {
    return new URL(rawSiteUrl)
  } catch {
    return new URL(SITE_URL_DEFAULT)
  }
}

export function getSiteUrl(): URL {
  const siteUrlFromEnvironment =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    SITE_URL_DEFAULT

  return normalizeSiteUrl(siteUrlFromEnvironment)
}
