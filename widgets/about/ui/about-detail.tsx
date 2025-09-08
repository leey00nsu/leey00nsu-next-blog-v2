import { About } from '@/entities/about/model/types'
import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'

interface AboutDetailProps {
  about: About
}

export function AboutDetail({ about }: AboutDetailProps) {
  return (
    <article className="prose prose-lg dark:prose-invert mx-auto">
      <MdxRenderer content={about.content} />
    </article>
  )
}
