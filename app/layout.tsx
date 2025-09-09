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
  title: 'leey00nsu Blog',
  description: 'leey00nsu Blog',
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
