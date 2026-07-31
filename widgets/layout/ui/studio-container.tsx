import { BlogChatWidget } from '@/widgets/chatbot/ui/blog-chat-widget'
import { Footer } from '@/widgets/layout/ui/footer'
import { Header } from '@/widgets/layout/ui/header'
import type { SupportedLocale } from '@/shared/config/constants'

interface StudioContainerProps {
  children: React.ReactNode
  locale: SupportedLocale
}

export function StudioContainer({
  children,
  locale,
}: StudioContainerProps) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col">
      <Header locale={locale} isFullWidth />
      <div className="min-h-[calc(100dvh-8rem)] min-w-0 flex-1">
        {children}
      </div>
      <Footer />
      <BlogChatWidget />
    </div>
  )
}
