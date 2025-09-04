import { Header } from '@/widgets/layout/ui/header'
import { LeftSidebar } from '@/widgets/layout/ui/left-siderbar'
import { RightSidebar } from '@/widgets/layout/ui/right-siderbar'

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 justify-center md:grid-cols-4">
      <LeftSidebar />
      <section className="col-span-2">
        <Header />
        <main className="p-4">{children}</main>
      </section>
      <RightSidebar />
    </div>
  )
}
