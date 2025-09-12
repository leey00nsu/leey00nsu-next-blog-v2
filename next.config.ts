import type { NextConfig } from 'next'
import createMDX from '@next/mdx'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  // Optionally, add any other Next.js config below
  typedRoutes: true,
}

const withMDX = createMDX({
  // Add MDX options here, if needed
})

const withNextIntl = createNextIntlPlugin()

// Merge MDX config with Next.js config
export default withNextIntl(withMDX(nextConfig))
