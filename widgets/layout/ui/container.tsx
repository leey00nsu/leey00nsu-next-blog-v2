import { Header } from '@/widgets/layout/ui/header'
import { LeftSidebar } from '@/widgets/layout/ui/left-sidebar'
import { RightSidebar } from '@/widgets/layout/ui/right-sidebar'
import { BlogChatWidget } from '@/widgets/chatbot/ui/blog-chat-widget'
import { Footer } from '@/widgets/layout/ui/footer'
import { TocProvider } from '@/features/post/model/toc-context'
import type { SupportedLocale } from '@/shared/config/constants'

interface ContainerProps {
  children?: React.ReactNode
  locale: SupportedLocale
}

export function Container({ children, locale }: ContainerProps) {
  return (
    <TocProvider>
      <div className="grid grid-cols-1 justify-center md:grid-cols-4">
        <LeftSidebar />
        <section className="col-span-2">
          <Header locale={locale} />
          <main className="min-h-[calc(100dvh-8rem)] p-4">{children}</main>
          <Footer />
          <BlogChatWidget />
        </section>
        <RightSidebar />
      </div>
    </TocProvider>
  )
}
