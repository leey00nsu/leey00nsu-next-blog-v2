import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Container } from '@/widgets/layout/ui/container'
import { SonnerToaster } from '@/shared/ui/sonner-toaster'
import { ThemeProvider } from '@/shared/ui/theme-provider'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import { SITE } from '@/shared/config/constants'

const pretendard = localFont({
  src: './PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? 'http://localhost:3000'),
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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html
      lang={locale}
      className={pretendard.variable}
      suppressHydrationWarning
    >
      <body className={`${pretendard.className} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Container>{children}</Container>
            <SonnerToaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
