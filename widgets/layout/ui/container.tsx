import { Header } from '@/widgets/layout/ui/header'
import { LeftSidebar } from '@/widgets/layout/ui/left-siderbar'
import { RightSidebar } from '@/widgets/layout/ui/right-siderbar'

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <LeftSidebar />
      <section>
        <Header />
        {children}
      </section>
      <RightSidebar />
    </div>
  )
}
