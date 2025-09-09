import { Logo } from '@/shared/ui/logo'

export function LeftSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen min-w-64 md:block">
      <div className="flex h-full flex-col justify-between">
        <div className="sticky top-0 z-50 px-2">
          <Logo />
        </div>
      </div>
    </aside>
  )
}
