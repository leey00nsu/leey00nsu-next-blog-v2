import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Container } from '@/widgets/layout/ui/container'
import { SonnerToaster } from '@/shared/ui/sonner-toaster'
import './globals.css'

const pretendard = localFont({
  src: './PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
})

export const metadata: Metadata = {
  title: {
    default: 'leey00nsu 블로그',
    template: '%s | leey00nsu 블로그',
  },
  description: 'leey00nsu 블로그',
  openGraph: {
    type: 'website',
    siteName: 'leey00nsu 블로그',
    title: 'leey00nsu 블로그',
    description: 'leey00nsu 블로그',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'leey00nsu 블로그',
    description: 'leey00nsu 블로그',
    images: ['/opengraph-image'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={pretendard.variable}>
      <body className={`${pretendard.className} antialiased`}>
        <Container>{children}</Container>
        <SonnerToaster />
      </body>
    </html>
  )
}
