import { Suspense } from 'react'
import { StudioPreviewClient } from '@/features/studio/ui/studio-preview-client'
import { Loader2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '미리보기 - 스튜디오',
  description: '게시글 미리보기',
  robots: {
    index: false,
    follow: false,
  },
}

export default function StudioPreviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="text-muted-foreground animate-spin" size={32} />
          </div>
        }
      >
        <StudioPreviewClient />
      </Suspense>
    </div>
  )
}
