import { ThemeToggle } from '@/shared/ui/theme-toggle'

export function RightSidebar() {
  return (
    <aside className="sticky top-0 z-50 hidden h-[calc(100dvh-8rem)] flex-col md:flex">
      <div className="flex items-center justify-end p-4">
        <ThemeToggle />
      </div>
    </aside>
  )
}
