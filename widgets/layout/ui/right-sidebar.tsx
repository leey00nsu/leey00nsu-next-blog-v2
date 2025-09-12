'use client'

import { ThemeToggle } from '@/shared/ui/theme-toggle'
import { Toc } from '@/features/post/ui/toc'
import { useTocContext } from '@/features/post/model/toc-context'
import { LocaleSelect } from '@/shared/ui/locale-select'

export function RightSidebar() {
  const { headings } = useTocContext()
  return (
    <aside className="sticky top-0 z-50 hidden h-[calc(100dvh-8rem)] flex-col md:flex">
      <div className="flex items-center justify-end gap-2 p-4">
        <LocaleSelect />
        <ThemeToggle />
      </div>
      {headings.length > 0 ? (
        <div className="mt-20 flex-1 p-4 pt-0">
          <Toc headings={headings} />
        </div>
      ) : null}
    </aside>
  )
}
