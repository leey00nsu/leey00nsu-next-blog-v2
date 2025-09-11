import { Header } from '@/widgets/layout/ui/header'
import { LeftSidebar } from '@/widgets/layout/ui/left-sidebar'
import { RightSidebar } from '@/widgets/layout/ui/right-sidebar'
import { Footer } from '@/widgets/layout/ui/footer'
import { TocProvider } from '@/features/post/model/toc-context'

interface ContainerProps {
  children?: React.ReactNode
}

export function Container({ children }: ContainerProps) {
  return (
    <TocProvider>
      <div className="grid grid-cols-1 justify-center md:grid-cols-4">
        <LeftSidebar />
        <section className="col-span-2">
          <Header />
          <main className="min-h-[calc(100dvh-8rem)] p-4">{children}</main>
          <Footer />
        </section>
        <RightSidebar />
      </div>
    </TocProvider>
  )
}
