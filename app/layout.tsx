import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { SonnerToaster } from '@/shared/ui/sonner-toaster'
import { ThemeProvider } from '@/shared/ui/theme-provider'
import './globals.css'
import { SITE } from '@/shared/config/constants'
import { getSiteUrl } from '@/shared/config/site-url'

const pretendard = localFont({
  src: './PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
})

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),

  title: {
    default: SITE.NAME,
    template: '%s | ' + SITE.NAME,
  },
  description: SITE.DEFAULT_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE.NAME,
    title: SITE.NAME,
    description: SITE.DEFAULT_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.NAME,
    description: SITE.DEFAULT_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  verification: {
    google: SITE.GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <body className={`${pretendard.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
