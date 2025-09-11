import { Logo } from '@/shared/ui/logo'

export function LeftSidebar() {
  return (
    <aside className="sticky top-0 z-50 hidden h-[calc(100dvh-8rem)] flex-col md:flex">
      <div className="p-2">
        <Logo />
      </div>
    </aside>
  )
}
