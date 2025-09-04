import { Header } from '@/widgets/layout/ui/header'
import { LeftSidebar } from '@/widgets/layout/ui/left-siderbar'
import { RightSidebar } from '@/widgets/layout/ui/right-siderbar'
import { Footer } from '@/widgets/layout/ui/footer'

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 justify-center md:grid-cols-4">
      <LeftSidebar />
      <section className="col-span-2">
        <Header />
        <main className="min-h-[calc(100dvh-8rem)] p-4">{children}</main>
        <Footer />
      </section>
      <RightSidebar />
    </div>
  )
}
